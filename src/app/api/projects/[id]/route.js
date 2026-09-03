import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import {
  APPLICATION_ACCESS_OPTIONS,
  canEditProject,
  canViewProject,
  COMPENSATION_TYPES,
  normalizeApplicationAccess,
  PROJECT_STATUSES,
  serializeFirestoreDate,
  VISIBILITY_OPTIONS,
} from "@/lib/project-utils";
import {
  enqueueAdminEmailEvent,
  enqueueEmailEventForUsers,
  getEmailRecipientForUser,
  projectManagers,
  projectParticipants,
} from "@/lib/email";

const PROJECT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MAX_PROJECT_REQUIRED_ROLES = 30;
const MAX_PROJECT_ROLE_LENGTH = 80;
const MAX_PROJECT_CATEGORIES = 30;
const MAX_PROJECT_CATEGORY_LENGTH = 80;
const MAX_PROJECT_TYPE_LENGTH = 80;

function validateProjectRequiredRoles(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "requiredRoles must include at least one role";
  }
  if (values.length > MAX_PROJECT_REQUIRED_ROLES) {
    return `requiredRoles cannot contain more than ${MAX_PROJECT_REQUIRED_ROLES} roles`;
  }

  const normalizedRoles = values.map((role) =>
    typeof role === "string" ? role.trim().replace(/\s+/g, " ") : role
  );
  if (
    normalizedRoles.some(
      (role) => typeof role !== "string" || role.length === 0
    )
  ) {
    return "requiredRoles must include non-empty strings";
  }
  if (normalizedRoles.some((role) => role.length > MAX_PROJECT_ROLE_LENGTH)) {
    return `Each required role must be ${MAX_PROJECT_ROLE_LENGTH} characters or fewer`;
  }

  const uniqueRoles = new Set(normalizedRoles.map((role) => role.toLowerCase()));
  if (uniqueRoles.size !== normalizedRoles.length) {
    return "requiredRoles cannot contain duplicates";
  }

  return null;
}

function validateProjectCategories(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "categoryTags must include at least one category";
  }
  if (values.length > MAX_PROJECT_CATEGORIES) {
    return `categoryTags cannot contain more than ${MAX_PROJECT_CATEGORIES} categories`;
  }

  const normalizedCategories = values.map((category) =>
    typeof category === "string"
      ? category.trim().replace(/\s+/g, " ")
      : category
  );
  if (
    normalizedCategories.some(
      (category) => typeof category !== "string" || category.length === 0
    )
  ) {
    return "categoryTags must include non-empty strings";
  }
  if (
    normalizedCategories.some(
      (category) => category.length > MAX_PROJECT_CATEGORY_LENGTH
    )
  ) {
    return `Each category must be ${MAX_PROJECT_CATEGORY_LENGTH} characters or fewer`;
  }

  const uniqueCategories = new Set(
    normalizedCategories.map((category) => category.toLowerCase())
  );
  if (uniqueCategories.size !== normalizedCategories.length) {
    return "categoryTags cannot contain duplicates";
  }

  return null;
}

function normalizeProjectType(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function validateProjectType(value) {
  const normalizedType = normalizeProjectType(value);
  if (typeof normalizedType !== "string" || normalizedType.length === 0) {
    return "Project type must be a non-empty string";
  }
  if (normalizedType.length > MAX_PROJECT_TYPE_LENGTH) {
    return `Project type must be ${MAX_PROJECT_TYPE_LENGTH} characters or fewer`;
  }

  return null;
}

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

async function getUserDetails(userIds) {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  try {
    const userPromises = userIds.map(async (uid) => {
      try {
        const userDoc = await adminDb.collection("users").doc(uid).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            uid,
            username: userData.username || "Unknown User",
            avatar: userData.avatar || null,
          };
        } else {
          // Fall back to Firebase Auth without creating a user document during
          // a read. Public project responses never need a member email address.
          try {
            const authUser = await adminAuth.getUser(uid);

            return {
              uid,
              username:
                authUser.displayName ||
                authUser.email?.split("@")[0] ||
                "Unknown User",
              avatar: authUser.photoURL || null,
            };
          } catch (authError) {
            console.error(`Error fetching auth user ${uid}:`, authError);
            return {
              uid,
              username: "Unknown User",
              avatar: null,
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching user ${uid}:`, error);
        return {
          uid,
          username: "Unknown User",
          avatar: null,
        };
      }
    });

    const results = await Promise.all(userPromises);
    return results;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return [];
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);

    const projectDoc = await adminDb.collection("projects").doc(id).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user can access this project
    if (!canViewProject(projectData, user)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get detailed user information for team members, admins, and owner
    const allUserIds = [
      projectData.owner,
      ...(projectData.admins || []),
      ...(projectData.teamMembers || []),
    ];
    const uniqueUserIds = [...new Set(allUserIds)];

    const userDetails = await getUserDetails(uniqueUserIds);

    // Get linked projects if any
    let linkedProjects = [];
    if (projectData.linkedProjects && projectData.linkedProjects.length > 0) {
      try {
        const linkedProjectPromises = projectData.linkedProjects.map(
          async (linkedId) => {
            const linkedDoc = await adminDb
              .collection("projects")
              .doc(linkedId)
              .get();
            if (linkedDoc.exists) {
            const linkedData = linkedDoc.data();
            if (!canViewProject(linkedData, user)) {
              return null;
            }
            return {
                id: linkedId,
                title: linkedData.title,
                thumbnail: linkedData.thumbnail,
                status: linkedData.status,
                visibility: linkedData.visibility,
              };
            }
            return null;
          }
        );
        const results = await Promise.all(linkedProjectPromises);
        linkedProjects = results.filter((p) => p !== null);
      } catch (error) {
        console.error("Error fetching linked projects:", error);
      }
    }

    const ownerDetails = userDetails.find((u) => u.uid === projectData.owner);
    const adminDetails = userDetails.filter((u) =>
      projectData.admins?.includes(u.uid)
    );
    const teamMemberDetails = userDetails.filter((u) =>
      projectData.teamMembers?.includes(u.uid)
    );

    // Get sourceProject details if exists
    let sourceProjectDetails = null;
    if (projectData.sourceProject) {
      try {
        const sourceProjectDoc = await adminDb
          .collection("sourceProjects")
          .doc(projectData.sourceProject)
          .get();

        if (sourceProjectDoc.exists) {
          const sourceProjectData = sourceProjectDoc.data();
          sourceProjectDetails = {
            id: sourceProjectDoc.id,
            name: sourceProjectData.name,
            sourceOwner: sourceProjectData.sourceOwner,
          };
        }
      } catch (error) {
        console.error("Error fetching source project:", error);
      }
    }

    const safeProjectData =
      user?.admin === true
        ? projectData
        : Object.fromEntries(
            Object.entries(projectData).filter(([key]) => key !== "adminNotes")
          );
    const project = {
      id: projectDoc.id,
      ...safeProjectData,
      applicationAccess: normalizeApplicationAccess(
        projectData.applicationAccess
      ),
      createdAt: serializeFirestoreDate(projectData.createdAt),
      updatedAt: serializeFirestoreDate(projectData.updatedAt),
      ownerDetails,
      adminDetails,
      teamMemberDetails,
      linkedProjects,
      sourceProjectDetails,
    };

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "The project could not be loaded. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectDoc = await adminDb.collection("projects").doc(id).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const existingProject = projectDoc.data();

    if (!canEditProject(existingProject, user)) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only project owner, project admins, or platform admins can edit.",
        },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    const isOwner = existingProject.owner === user.uid;
    const isPlatformAdmin = user.admin || false;
    const hasOwnerUpdate = updateData.owner !== undefined;

    const allowedFields = [
      "title",
      "thumbnail",
      "categoryTags",
      "type",
      "description",
      "visibility",
      "applicationAccess",
      "status",
      "goal",
      "duration",
      "startDate",
      "endDate",
      "isOngoing",
      "budget",
      "compensationType",
      "requiredRoles",
      "linkedProjects",
    ];

    const filteredUpdateData = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });

    if (hasOwnerUpdate && !isPlatformAdmin) {
      return NextResponse.json(
        { error: "Only platform administrators can change the project owner" },
        { status: 403 }
      );
    }

    let nextOwner = existingProject.owner;
    if (hasOwnerUpdate) {
      if (
        typeof updateData.owner !== "string" ||
        !updateData.owner.trim() ||
        updateData.owner.trim() !== updateData.owner
      ) {
        return NextResponse.json(
          { error: "owner must be a valid user ID" },
          { status: 400 }
        );
      }

      let ownerExists = false;
      try {
        await adminAuth.getUser(updateData.owner);
        ownerExists = true;
      } catch {
        const ownerDoc = await adminDb
          .collection("users")
          .doc(updateData.owner)
          .get();
        ownerExists = ownerDoc.exists;
      }

      if (!ownerExists) {
        return NextResponse.json(
          { error: "The selected project owner does not exist" },
          { status: 400 }
        );
      }

      nextOwner = updateData.owner;
      filteredUpdateData.owner = nextOwner;
    }

    if (filteredUpdateData.type !== undefined) {
      const projectTypeError = validateProjectType(filteredUpdateData.type);
      if (projectTypeError) {
        return NextResponse.json(
          { error: projectTypeError },
          { status: 400 }
        );
      }
      filteredUpdateData.type = normalizeProjectType(filteredUpdateData.type);
    }

    if (
      filteredUpdateData.visibility !== undefined &&
      !VISIBILITY_OPTIONS.includes(filteredUpdateData.visibility)
    ) {
      return NextResponse.json({ error: "Invalid visibility option" }, { status: 400 });
    }

    if (
      filteredUpdateData.compensationType !== undefined &&
      !COMPENSATION_TYPES.includes(filteredUpdateData.compensationType)
    ) {
      return NextResponse.json({ error: "Invalid compensation type" }, { status: 400 });
    }

    if (filteredUpdateData.requiredRoles !== undefined) {
      const rolesError = validateProjectRequiredRoles(
        filteredUpdateData.requiredRoles
      );
      if (rolesError) {
        return NextResponse.json({ error: rolesError }, { status: 400 });
      }
      filteredUpdateData.requiredRoles = filteredUpdateData.requiredRoles.map(
        (role) => role.trim().replace(/\s+/g, " ")
      );
    }

    if (filteredUpdateData.categoryTags !== undefined) {
      const categoriesError = validateProjectCategories(
        filteredUpdateData.categoryTags
      );
      if (categoriesError) {
        return NextResponse.json({ error: categoriesError }, { status: 400 });
      }
      filteredUpdateData.categoryTags = filteredUpdateData.categoryTags.map(
        (category) => category.trim().replace(/\s+/g, " ")
      );
    }

    if (
      filteredUpdateData.applicationAccess !== undefined &&
      !APPLICATION_ACCESS_OPTIONS.includes(filteredUpdateData.applicationAccess)
    ) {
      return NextResponse.json(
        { error: "Invalid application access option" },
        { status: 400 }
      );
    }

    if (
      filteredUpdateData.applicationAccess !== undefined &&
      existingProject.owner !== user.uid &&
      !isPlatformAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Only the project creator or a platform administrator can change who may apply.",
        },
        { status: 403 }
      );
    }

    const hasScheduleUpdate = ["startDate", "endDate", "isOngoing"].some(
      (field) => updateData[field] !== undefined
    );
    const hasExistingSchedule =
      existingProject.startDate ||
      existingProject.endDate ||
      existingProject.isOngoing === true;

    if (hasScheduleUpdate || hasExistingSchedule) {
      const schedule = normalizeProjectSchedule(
        { ...existingProject, ...filteredUpdateData },
        { allowLegacy: true }
      );
      if (!schedule.ok) {
        return NextResponse.json({ error: schedule.error }, { status: 400 });
      }

      if (schedule.hasSchedule) {
        filteredUpdateData.duration = schedule.duration;
        filteredUpdateData.startDate = schedule.startDate;
        filteredUpdateData.endDate = schedule.endDate;
        filteredUpdateData.isOngoing = schedule.isOngoing;
      } else {
        delete filteredUpdateData.startDate;
        delete filteredUpdateData.endDate;
        delete filteredUpdateData.isOngoing;
        if (filteredUpdateData.duration !== undefined) {
          filteredUpdateData.duration = schedule.duration;
        }
      }
    } else if (filteredUpdateData.duration !== undefined) {
      const schedule = normalizeProjectSchedule(filteredUpdateData, {
        allowLegacy: true,
      });
      if (!schedule.ok) {
        return NextResponse.json({ error: schedule.error }, { status: 400 });
      }
      filteredUpdateData.duration = schedule.duration;
    }

    if (filteredUpdateData.budget !== undefined) {
      if (filteredUpdateData.budget === null || filteredUpdateData.budget === "") {
        filteredUpdateData.budget = admin.firestore.FieldValue.delete();
      } else {
        const budget = Number(filteredUpdateData.budget);
        if (!Number.isFinite(budget) || budget < 0) {
          return NextResponse.json(
            { error: "Budget must be a non-negative number" },
            { status: 400 }
          );
        }
        filteredUpdateData.budget = budget;
      }
    }

    if (filteredUpdateData.status !== undefined) {
      if (!PROJECT_STATUSES.includes(filteredUpdateData.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const statusChanged = filteredUpdateData.status !== existingProject.status;
      if (statusChanged && !isPlatformAdmin) {
        return NextResponse.json(
          {
            error:
              "Only platform administrators can change project status. Contact support to request a status update.",
          },
          { status: 403 }
        );
      }
    }

    // Only admins can change certain sensitive fields
    if (
      hasOwnerUpdate ||
      updateData.admins !== undefined ||
      updateData.teamMembers !== undefined
    ) {
      if (isOwner || isPlatformAdmin) {
        if (updateData.admins !== undefined) {
          if (!Array.isArray(updateData.admins)) {
            return NextResponse.json({ error: "admins must be an array" }, { status: 400 });
          }
          filteredUpdateData.admins = [
            ...new Set([nextOwner, ...updateData.admins]),
          ];
        }
        if (updateData.teamMembers !== undefined) {
          if (!Array.isArray(updateData.teamMembers)) {
            return NextResponse.json(
              { error: "teamMembers must be an array" },
              { status: 400 }
            );
          }
          filteredUpdateData.teamMembers = [
            ...new Set([nextOwner, ...updateData.teamMembers]),
          ];
        }

        // Transfer the automatic owner entries unless the platform admin sent
        // explicit role lists in the same request.
        if (hasOwnerUpdate && updateData.admins === undefined) {
          filteredUpdateData.admins = [
            ...new Set([
              nextOwner,
              ...(existingProject.admins || []).filter(
                (uid) => uid !== existingProject.owner
              ),
            ]),
          ];
        }
        if (hasOwnerUpdate && updateData.teamMembers === undefined) {
          filteredUpdateData.teamMembers = [
            ...new Set([
              nextOwner,
              ...(existingProject.teamMembers || []).filter(
                (uid) => uid !== existingProject.owner
              ),
            ]),
          ];
        }
      } else {
        return NextResponse.json(
          { error: "Only project owners or platform admins can change team members" },
          { status: 403 }
        );
      }
    }

    // Archive / restore (soft delete). canEditProject already gates this to the
    // owner, project admins, or platform admins. Archiving hides the project
    // from the whole app (see canViewProject) but keeps it fully restorable.
    if (typeof updateData.archived === "boolean") {
      filteredUpdateData.archived = updateData.archived;
      filteredUpdateData.archivedAt = updateData.archived ? new Date() : null;
      filteredUpdateData.archivedBy = updateData.archived ? user.uid : null;
    }

    filteredUpdateData.updatedAt = new Date();

    await adminDb.collection("projects").doc(id).update(filteredUpdateData);

    await syncUserProjectArrays(id, existingProject, {
      owner: filteredUpdateData.owner || existingProject.owner,
      admins: filteredUpdateData.admins || existingProject.admins || [],
      teamMembers:
        filteredUpdateData.teamMembers || existingProject.teamMembers || [],
    });

    // Fetch the updated project
    const updatedDoc = await adminDb.collection("projects").doc(id).get();
    const updatedData = updatedDoc.data();

    const statusChanged =
      updatedData.status !== undefined &&
      updatedData.status !== existingProject.status;
    if (statusChanged) {
      const significantForTeam = ["live", "completed"].includes(
        updatedData.status
      );
      await enqueueEmailEventForUsers({
        type: "project.status_changed",
        eventId: `${id}-${existingProject.status}-${updatedData.status}-${filteredUpdateData.updatedAt.toISOString()}`,
        userIds: significantForTeam
          ? projectParticipants(updatedData)
          : projectManagers(updatedData),
        data: {
          projectId: id,
          projectTitle: updatedData.title,
          status: updatedData.status,
          adminNotes: updatedData.adminNotes || null,
        },
      });
      if (updatedData.status === "pending") {
        const owner = await getEmailRecipientForUser(updatedData.owner);
        await enqueueAdminEmailEvent({
          type: "admin.project_review_required",
          eventId: `${id}-${filteredUpdateData.updatedAt.toISOString()}`,
          data: {
            projectId: id,
            projectTitle: updatedData.title,
            ownerName: owner?.displayName || "a creator",
          },
        });
      }
    }

    if (
      typeof filteredUpdateData.archived === "boolean" &&
      filteredUpdateData.archived !== (existingProject.archived === true)
    ) {
      await enqueueEmailEventForUsers({
        type: filteredUpdateData.archived
          ? "project.archived"
          : "project.restored",
        eventId: `${id}-${filteredUpdateData.archived ? "archived" : "restored"}-${filteredUpdateData.updatedAt.toISOString()}`,
        userIds: projectParticipants(updatedData),
        data: { projectId: id, projectTitle: updatedData.title },
      });
    }

    if (filteredUpdateData.admins) {
      const previousAdmins = new Set(existingProject.admins || []);
      const nextAdmins = new Set(updatedData.admins || []);
      const roleChanges = [
        ...[...nextAdmins]
          .filter((uid) => !previousAdmins.has(uid))
          .map((uid) => ({ uid, granted: true })),
        ...[...previousAdmins]
          .filter((uid) => !nextAdmins.has(uid))
          .map((uid) => ({ uid, granted: false })),
      ];
      for (const change of roleChanges) {
        await enqueueEmailEventForUsers({
          type: "project.admin_role_changed",
          eventId: `${id}-${change.uid}-${change.granted ? "granted" : "removed"}-${filteredUpdateData.updatedAt.toISOString()}`,
          userIds: [change.uid],
          data: {
            projectId: id,
            projectTitle: updatedData.title,
            granted: change.granted,
          },
        });
      }
    }

    return NextResponse.json({
      id,
      ...updatedData,
      createdAt: serializeFirestoreDate(updatedData.createdAt),
      updatedAt: serializeFirestoreDate(updatedData.updatedAt),
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "The project could not be updated. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectDoc = await adminDb.collection("projects").doc(id).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const existingProject = projectDoc.data();

    // Permanent deletion is intentionally admin-only. Owners can archive a
    // project through the normal edit flow.
    if (!user.admin) {
      return NextResponse.json(
        {
          error:
            "Only platform administrators can permanently delete a project. Project owners can archive projects instead.",
        },
        { status: 403 }
      );
    }

    const batch = adminDb.batch();
    batch.delete(adminDb.collection("projects").doc(id));

    if (existingProject.sourceProject) {
      const sourceProjectRef = adminDb
        .collection("sourceProjects")
        .doc(existingProject.sourceProject);
      const sourceProjectDoc = await sourceProjectRef.get();

      if (sourceProjectDoc.exists) {
        batch.update(sourceProjectRef, {
          projectIds: admin.firestore.FieldValue.arrayRemove(id),
          updatedAt: new Date(),
        });
      }
    }

    const relatedUserIds = [
      existingProject.owner,
      ...(existingProject.admins || []),
      ...(existingProject.teamMembers || []),
    ].filter(Boolean);
    [...new Set(relatedUserIds)].forEach((uid) => {
      batch.set(
        adminDb.collection("users").doc(uid),
        {
          ownerOfProjects: admin.firestore.FieldValue.arrayRemove(id),
          adminOfProjects: admin.firestore.FieldValue.arrayRemove(id),
          teamMemberOfProjects: admin.firestore.FieldValue.arrayRemove(id),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    });

    const applicationsSnapshot = await adminDb
      .collection("applications")
      .where("projectId", "==", id)
      .limit(450)
      .get();
    applicationsSnapshot.docs.forEach((applicationDoc) => {
      batch.delete(applicationDoc.ref);
    });

    const auditRef = adminDb.collection("admin_audit_events").doc();
    batch.set(auditRef, {
      action: "project.permanently_deleted",
      actorUid: user.uid,
      createdAt: new Date(),
      projectId: id,
    });

    await batch.commit();

    await enqueueEmailEventForUsers({
      type: "project.deleted",
      eventId: id,
      userIds: [...new Set(relatedUserIds)].filter((uid) => uid !== user.uid),
      data: {
        projectId: id,
        projectTitle: existingProject.title || "Project",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "The project could not be deleted. Please try again." },
      { status: 500 }
    );
  }
}

async function syncUserProjectArrays(projectId, previousProject, nextProject) {
  const previousOwner = previousProject.owner;
  const nextOwner = nextProject.owner;
  const previousAdmins = new Set(previousProject.admins || []);
  const nextAdmins = new Set(nextProject.admins || []);
  const previousTeamMembers = new Set(previousProject.teamMembers || []);
  const nextTeamMembers = new Set(nextProject.teamMembers || []);
  const touchedUserIds = new Set([
    previousOwner,
    nextOwner,
    ...previousAdmins,
    ...nextAdmins,
    ...previousTeamMembers,
    ...nextTeamMembers,
  ]);

  if (touchedUserIds.size === 0) return;

  const batch = adminDb.batch();
  touchedUserIds.forEach((uid) => {
    if (!uid) return;
    const updates = { updatedAt: new Date() };

    if (previousOwner !== nextOwner && uid === previousOwner) {
      updates.ownerOfProjects = admin.firestore.FieldValue.arrayRemove(projectId);
    }
    if (previousOwner !== nextOwner && uid === nextOwner) {
      updates.ownerOfProjects = admin.firestore.FieldValue.arrayUnion(projectId);
    }

    if (!previousAdmins.has(uid) && nextAdmins.has(uid)) {
      updates.adminOfProjects = admin.firestore.FieldValue.arrayUnion(projectId);
    }
    if (previousAdmins.has(uid) && !nextAdmins.has(uid)) {
      updates.adminOfProjects = admin.firestore.FieldValue.arrayRemove(projectId);
    }
    if (!previousTeamMembers.has(uid) && nextTeamMembers.has(uid)) {
      updates.teamMemberOfProjects = admin.firestore.FieldValue.arrayUnion(projectId);
    }
    if (previousTeamMembers.has(uid) && !nextTeamMembers.has(uid)) {
      updates.teamMemberOfProjects = admin.firestore.FieldValue.arrayRemove(projectId);
    }

    if (Object.keys(updates).length > 1) {
      batch.set(adminDb.collection("users").doc(uid), updates, { merge: true });
    }
  });

  await batch.commit();
}
