import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import {
  APPLICATION_ACCESS_OPTIONS,
  COMPENSATION_TYPES,
  DEFAULT_APPLICATION_ACCESS,
  filterAndSortProjectsForDiscovery,
  normalizeApplicationAccess,
  normalizeProjectDiscoveryStatus,
  PROJECT_TYPES,
  PUBLIC_PROJECT_STATUSES,
  REQUIRED_ROLES,
  serializeFirestoreDate,
  validateArrayValues,
  VISIBILITY_OPTIONS,
} from "@/lib/project-utils";
import { enqueueEmailEvent } from "@/lib/email";

const PROJECT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseProjectDate(value) {
  if (typeof value !== "string" || !PROJECT_DATE_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function normalizeProjectSchedule(input = {}, { allowLegacy = true } = {}) {
  if (
    Object.prototype.hasOwnProperty.call(input, "isOngoing") &&
    typeof input.isOngoing !== "boolean"
  ) {
    return { ok: false, error: "isOngoing must be true or false" };
  }

  const hasStartDate =
    input.startDate !== undefined &&
    input.startDate !== null &&
    input.startDate !== "";
  const hasEndDate =
    input.endDate !== undefined && input.endDate !== null && input.endDate !== "";
  const isOngoing = input.isOngoing === true;
  const hasSchedule = hasStartDate || hasEndDate || isOngoing;

  if (!hasSchedule) {
    if (!allowLegacy) {
      return { ok: false, error: "A start date is required" };
    }
    const duration = Number(input.duration);
    return Number.isFinite(duration) && duration >= 1 && duration <= 3650
      ? { ok: true, hasSchedule: false, duration }
      : {
          ok: false,
          error: "Duration must be between 1 and 3650 days",
        };
  }

  if (!hasStartDate || !parseProjectDate(input.startDate)) {
    return { ok: false, error: "A valid start date is required" };
  }

  const startDate = input.startDate.trim();
  if (isOngoing) {
    return {
      ok: true,
      hasSchedule: true,
      duration: null,
      startDate,
      endDate: null,
      isOngoing: true,
    };
  }

  if (!hasEndDate || !parseProjectDate(input.endDate)) {
    return { ok: false, error: "A valid end date is required" };
  }

  const endDate = input.endDate.trim();
  const start = parseProjectDate(startDate);
  const end = parseProjectDate(endDate);
  if (end < start) {
    return {
      ok: false,
      error: "The end date must be on or after the start date",
    };
  }

  const duration =
    Math.floor((end.getTime() - start.getTime()) / DAY_IN_MILLISECONDS) + 1;
  if (duration > 3650) {
    return {
      ok: false,
      error: "The project schedule cannot be longer than 3650 days",
    };
  }

  return { ok: true, hasSchedule: true, duration, startDate, endDate, isOngoing: false };
}

async function getUserFromToken(request) {
  return getRequestUser(request);
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function creationDocumentIds(userId, idempotencyKey) {
  const digest = createHash("sha256")
    .update(`${userId}:${idempotencyKey}`)
    .digest("hex");

  return {
    projectId: `project_${digest}`,
    requestId: digest,
    sourceProjectId: `source_${digest}`,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const type = searchParams.get("type") || "all";
    const visibility = searchParams.get("visibility") || "all";
    const requestedStatus = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "status_priority";

    // Get user to determine what projects they can see
    const user = await getUserFromToken(request);
    const status = normalizeProjectDiscoveryStatus(requestedStatus);

    if (status === null) {
      return NextResponse.json({
        projects: [],
        hasMore: false,
        pagination: { page, limit, total: 0 },
      });
    }

    // Keep Firestore discovery queries deliberately simple. Combining status,
    // type, visibility and dynamic orderBy fields requires many composite
    // indexes, while orderBy also drops legacy documents missing optional
    // fields such as budget. Filter and sort the approved set below instead.
    let query = adminDb.collection("projects");
    query =
      status === "all"
        ? query.where("status", "in", PUBLIC_PROJECT_STATUSES)
        : query.where("status", "==", status);

    const snapshot = await query.get();
    const approvedProjects = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: serializeFirestoreDate(data.createdAt),
        updatedAt: serializeFirestoreDate(data.updatedAt),
      };
    });

    const filteredProjects = filterAndSortProjectsForDiscovery(
      approvedProjects,
      {
        category,
        search,
        sortBy,
        status,
        type,
        visibility,
      },
      user
    );
    const offset = (page - 1) * limit;
    const projects = filteredProjects.slice(offset, offset + limit);

    // Fetch sourceProject names only for the current page.
    const sourceProjectIds = new Set();
    projects.forEach((project) => {
      if (project.sourceProject) {
        sourceProjectIds.add(project.sourceProject);
      }
    });

    // Fetch sourceProject details
    const sourceProjectsMap = new Map();
    if (sourceProjectIds.size > 0) {
      try {
        const sourceProjectPromises = Array.from(sourceProjectIds).map(
          async (id) => {
            const doc = await adminDb
              .collection("sourceProjects")
              .doc(id)
              .get();
            if (doc.exists) {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name,
              };
            }
            return null;
          }
        );

        const sourceProjectResults = await Promise.all(sourceProjectPromises);
        sourceProjectResults.forEach((sp) => {
          if (sp) {
            sourceProjectsMap.set(sp.id, sp);
          }
        });
      } catch (error) {
        console.error("Error fetching source projects:", error);
      }
    }

    projects.forEach((project) => {
      if (
        project.sourceProject &&
        sourceProjectsMap.has(project.sourceProject)
      ) {
        project.sourceProjectDetails = sourceProjectsMap.get(
          project.sourceProject
        );
      }
    });

    const hasMore = offset + projects.length < filteredProjects.length;

    return NextResponse.json({
      projects,
      hasMore,
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Projects could not be loaded. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only Business members (or platform admins) may create projects.
    if (!user.canCreateProjects) {
      return NextResponse.json(
        {
          error:
            "An active GO Business membership is required to create and manage projects.",
          code: "company_membership_required",
        },
        { status: 403 }
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey || "")) {
      return NextResponse.json(
        {
          error:
            "A valid Idempotency-Key header is required to create a project.",
          code: "invalid_idempotency_key",
        },
        { status: 400 }
      );
    }

    const projectData = await request.json();

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "goal",
      "categoryTags",
      "type",
      "visibility",
      "compensationType",
      "requiredRoles",
    ];
    for (const field of requiredFields) {
      const value = projectData[field];
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate enums
    if (!PROJECT_TYPES.includes(projectData.type)) {
      return NextResponse.json(
        { error: "Invalid project type" },
        { status: 400 }
      );
    }

    if (!VISIBILITY_OPTIONS.includes(projectData.visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility option" },
        { status: 400 }
      );
    }

    if (
      projectData.applicationAccess !== undefined &&
      !APPLICATION_ACCESS_OPTIONS.includes(projectData.applicationAccess)
    ) {
      return NextResponse.json(
        { error: "Invalid application access option" },
        { status: 400 }
      );
    }

    if (!COMPENSATION_TYPES.includes(projectData.compensationType)) {
      return NextResponse.json(
        { error: "Invalid compensation type" },
        { status: 400 }
      );
    }

    const rolesError = validateArrayValues(
      projectData.requiredRoles,
      REQUIRED_ROLES,
      "requiredRoles"
    );
    if (rolesError) {
      return NextResponse.json({ error: rolesError }, { status: 400 });
    }

    if (
      !Array.isArray(projectData.categoryTags) ||
      projectData.categoryTags.some((tag) => typeof tag !== "string" || !tag.trim())
    ) {
      return NextResponse.json(
        { error: "categoryTags must include non-empty strings" },
        { status: 400 }
      );
    }

    const hasScheduleFields = ["startDate", "endDate", "isOngoing"].some(
      (field) => Object.prototype.hasOwnProperty.call(projectData, field)
    );
    const schedule = normalizeProjectSchedule(projectData, {
      allowLegacy: !hasScheduleFields,
    });
    if (!schedule.ok) {
      return NextResponse.json(
        { error: schedule.error },
        { status: 400 }
      );
    }

    const duration = schedule.duration;
    const hasBudget =
      projectData.budget !== undefined &&
      projectData.budget !== null &&
      projectData.budget !== "";
    const budget = hasBudget ? Number(projectData.budget) : undefined;
    if (hasBudget && (!Number.isFinite(budget) || budget < 0)) {
      return NextResponse.json(
        { error: "Budget must be a non-negative number" },
        { status: 400 }
      );
    }

    const { projectId, requestId, sourceProjectId: deterministicSourceId } =
      creationDocumentIds(user.uid, idempotencyKey);
    const creationRequestRef = adminDb
      .collection("project_creation_requests")
      .doc(requestId);
    const existingCreationRequest = await creationRequestRef.get();

    if (existingCreationRequest.exists) {
      const existingRequestData = existingCreationRequest.data();
      if (existingRequestData.userId !== user.uid) {
        return NextResponse.json(
          { error: "Idempotency key is already in use." },
          { status: 409 }
        );
      }

      const existingProjectDoc = await adminDb
        .collection("projects")
        .doc(existingRequestData.projectId)
        .get();
      if (existingProjectDoc.exists) {
        const existingProject = existingProjectDoc.data();
        return NextResponse.json({
          id: existingProjectDoc.id,
          ...existingProject,
          createdAt: serializeFirestoreDate(existingProject.createdAt),
          updatedAt: serializeFirestoreDate(existingProject.updatedAt),
          replayed: true,
        });
      }
    }

    // Handle sourceProject logic
    let sourceProjectId = null;

    let sourceProjectRef = null;
    const batch = adminDb.batch();
    const projectRef = adminDb.collection("projects").doc(projectId);

    if (projectData.sourceProjectOption === "new") {
      // Create new sourceProject
      if (
        !projectData.sourceProjectName ||
        projectData.sourceProjectName.trim().length < 3 ||
        projectData.sourceProjectName.trim().length > 50
      ) {
        return NextResponse.json(
          { error: "Source project name must be between 3 and 50 characters" },
          { status: 400 }
        );
      }

      const sourceProjectData = {
        name: projectData.sourceProjectName.trim(),
        sourceOwner: user.uid,
        admins: [],
        projectIds: [projectId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sourceProjectRef = adminDb
        .collection("sourceProjects")
        .doc(deterministicSourceId);
      sourceProjectId = sourceProjectRef.id;
      batch.set(sourceProjectRef, sourceProjectData);
    } else if (
      projectData.sourceProjectOption === "existing" &&
      projectData.existingSourceProjectId
    ) {
      // Validate that the user owns or administers the existing sourceProject.
      const sourceProjectDoc = await adminDb
        .collection("sourceProjects")
        .doc(projectData.existingSourceProjectId)
        .get();

      if (!sourceProjectDoc.exists) {
        return NextResponse.json(
          { error: "Selected source project not found" },
          { status: 400 }
        );
      }

      const sourceProjectData = sourceProjectDoc.data();
      const canUseSourceProject =
        user.admin === true ||
        sourceProjectData.sourceOwner === user.uid ||
        (Array.isArray(sourceProjectData.admins) &&
          sourceProjectData.admins.includes(user.uid));

      if (!canUseSourceProject) {
        return NextResponse.json(
          { error: "You don't have permission to use this source project" },
          { status: 403 }
        );
      }

      sourceProjectId = projectData.existingSourceProjectId;
      sourceProjectRef = adminDb.collection("sourceProjects").doc(sourceProjectId);
    } else {
      return NextResponse.json(
        { error: "Invalid source project option" },
        { status: 400 }
      );
    }

    // Create the project
    const newProject = {
      title: projectData.title.trim(),
      thumbnail: projectData.thumbnail || "",
      categoryTags: projectData.categoryTags.map((tag) => tag.trim()),
      type: projectData.type,
      description: projectData.description,
      visibility: projectData.visibility,
      applicationAccess: normalizeApplicationAccess(
        projectData.applicationAccess || DEFAULT_APPLICATION_ACCESS
      ),
      goal: projectData.goal,
      duration,
      ...(schedule.hasSchedule
        ? {
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            isOngoing: schedule.isOngoing,
          }
        : {}),
      ...(hasBudget ? { budget } : {}),
      compensationType: projectData.compensationType,
      requiredRoles: projectData.requiredRoles,
      linkedProjects: Array.isArray(projectData.linkedProjects)
        ? projectData.linkedProjects.filter((id) => typeof id === "string")
        : [],
      owner: user.uid,
      admins: [user.uid],
      teamMembers: [user.uid],
      status: "draft", // Always start as draft
      sourceProject: sourceProjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    batch.set(projectRef, newProject);

    batch.set(creationRequestRef, {
      createdAt: new Date(),
      projectId,
      sourceProjectId,
      status: "completed",
      userId: user.uid,
    });

    if (projectData.sourceProjectOption === "existing") {
      batch.update(sourceProjectRef, {
        projectIds: admin.firestore.FieldValue.arrayUnion(projectId),
        updatedAt: new Date(),
      });
    }

    batch.set(
      adminDb.collection("users").doc(user.uid),
      {
        uid: user.uid,
        ownerOfProjects: admin.firestore.FieldValue.arrayUnion(projectId),
        adminOfProjects: admin.firestore.FieldValue.arrayUnion(projectId),
        teamMemberOfProjects: admin.firestore.FieldValue.arrayUnion(projectId),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    await batch.commit();

    if (user.email) {
      await enqueueEmailEvent({
        type: "project.created",
        eventId: projectId,
        userId: user.uid,
        recipient: user.email,
        data: {
          projectId,
          projectTitle: newProject.title,
          status: newProject.status,
        },
      });
    }

    console.info("project_creation_completed", {
      projectId,
      replayed: false,
      requestId: requestId.slice(0, 12),
      userId: user.uid,
    });

    return NextResponse.json({
      id: projectId,
      ...newProject,
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "The project could not be created. Please try again." },
      { status: 500 }
    );
  }
}

// Export the constants for use in other components
export { PROJECT_TYPES, COMPENSATION_TYPES, REQUIRED_ROLES };
