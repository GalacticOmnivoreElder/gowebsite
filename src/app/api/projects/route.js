import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import {
  canViewProject,
  COMPENSATION_TYPES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PUBLIC_PROJECT_STATUSES,
  REQUIRED_ROLES,
  serializeFirestoreDate,
  validateArrayValues,
  VISIBILITY_OPTIONS,
} from "@/lib/project-utils";

async function getUserFromToken(request) {
  return getRequestUser(request);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const type = searchParams.get("type") || "all";
    const visibility = searchParams.get("visibility") || "all";
    const requestedStatus = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "created_desc";

    // Get user to determine what projects they can see
    const user = await getUserFromToken(request);

    let query = adminDb.collection("projects");

    const isAdmin = !!user?.admin;
    const status =
      requestedStatus === "all" || PROJECT_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : "all";

    // Apply filters. Non-admin discovery is restricted to public lifecycle states,
    // then filtered again through canViewProject after fetch.
    if (status !== "all") {
      if (!isAdmin && !PUBLIC_PROJECT_STATUSES.includes(status)) {
        return NextResponse.json({
          projects: [],
          hasMore: false,
          pagination: { page, limit, total: 0 },
        });
      }
      query = query.where("status", "==", status);
    } else if (!isAdmin) {
      query = query.where("status", "in", PUBLIC_PROJECT_STATUSES);
    }

    if (type !== "all") {
      query = query.where("type", "==", type);
    }

    if (visibility !== "all" && VISIBILITY_OPTIONS.includes(visibility)) {
      query = query.where("visibility", "==", visibility);
    } else if (!user) {
      // Non-authenticated users can only see public projects
      query = query.where("visibility", "==", "Public");
    }

    // Apply sorting
    const [sortField, sortDirection] = sortBy.split("_");
    const firebaseSortField = sortField === "created" ? "createdAt" : sortField;
    query = query.orderBy(
      firebaseSortField,
      sortDirection === "desc" ? "desc" : "asc"
    );

    // Apply pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      const offsetQuery = adminDb
        .collection("projects")
        .orderBy(firebaseSortField, sortDirection === "desc" ? "desc" : "asc")
        .limit(offset);
      const offsetSnapshot = await offsetQuery.get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1); // Get one extra to check if there are more

    const snapshot = await query.get();
    const projects = [];

    // Fetch sourceProject names for projects that have them
    const projectsWithSourceProjectIds = [];
    const sourceProjectIds = new Set();

    snapshot.docs.slice(0, limit).forEach((doc) => {
      const data = doc.data();
      const project = {
        id: doc.id,
        ...data,
        createdAt: serializeFirestoreDate(data.createdAt),
        updatedAt: serializeFirestoreDate(data.updatedAt),
      };

      projectsWithSourceProjectIds.push(project);
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

    // Apply search filter and add sourceProject details
    projectsWithSourceProjectIds.forEach((project) => {
      // Archived projects never appear in discovery (restore them from the
      // owner's project page or the admin panel).
      if (project.archived) {
        return;
      }
      if (!canViewProject(project, user)) {
        return;
      }

      // Add sourceProject details if available
      if (
        project.sourceProject &&
        sourceProjectsMap.has(project.sourceProject)
      ) {
        project.sourceProjectDetails = sourceProjectsMap.get(
          project.sourceProject
        );
      }

      // Apply search filter (client-side for now, could be improved with Algolia)
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          project.title?.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.goal?.toLowerCase().includes(searchLower) ||
          project.categoryTags?.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          );

        if (matchesSearch) {
          projects.push(project);
        }
      } else {
        projects.push(project);
      }
    });

    // Apply category filter (if category tags include the specified category)
    let filteredProjects = projects;
    if (category !== "all") {
      filteredProjects = projects.filter((project) =>
        project.categoryTags?.includes(category)
      );
    }

    const hasMore = snapshot.docs.length > limit;

    return NextResponse.json({
      projects: filteredProjects,
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
      { error: "Failed to fetch projects", details: error.message },
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

    // Only Company/Partner members (or platform admins) may create projects.
    if (!user.canCreateProjects) {
      return NextResponse.json(
        {
          error:
            "A Company / Partner membership is required to create and manage projects.",
          code: "company_membership_required",
        },
        { status: 403 }
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
      "duration",
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

    const duration = Number(projectData.duration);
    const hasBudget =
      projectData.budget !== undefined &&
      projectData.budget !== null &&
      projectData.budget !== "";
    const budget = hasBudget ? Number(projectData.budget) : undefined;
    if (!Number.isFinite(duration) || duration < 1 || duration > 3650) {
      return NextResponse.json(
        { error: "Duration must be between 1 and 3650 days" },
        { status: 400 }
      );
    }
    if (hasBudget && (!Number.isFinite(budget) || budget < 0)) {
      return NextResponse.json(
        { error: "Budget must be a non-negative number" },
        { status: 400 }
      );
    }

    // Handle sourceProject logic
    let sourceProjectId = null;

    let sourceProjectRef = null;
    const batch = adminDb.batch();
    const projectRef = adminDb.collection("projects").doc();
    const projectId = projectRef.id;

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
        projectIds: [projectId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sourceProjectRef = adminDb.collection("sourceProjects").doc();
      sourceProjectId = sourceProjectRef.id;
      batch.set(sourceProjectRef, sourceProjectData);
    } else if (
      projectData.sourceProjectOption === "existing" &&
      projectData.existingSourceProjectId
    ) {
      // Validate that the user owns the existing sourceProject
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
      if (sourceProjectData.sourceOwner !== user.uid) {
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
      goal: projectData.goal,
      duration,
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

    return NextResponse.json({
      id: projectId,
      ...newProject,
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project", details: error.message },
      { status: 500 }
    );
  }
}

// Export the constants for use in other components
export { PROJECT_TYPES, COMPENSATION_TYPES, REQUIRED_ROLES };
