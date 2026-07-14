import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import {
  canEditProject,
  canViewProject,
  COMPENSATION_TYPES,
  OWNER_MANAGED_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  REQUIRED_ROLES,
  serializeFirestoreDate,
  validateArrayValues,
  VISIBILITY_OPTIONS,
} from "@/lib/project-utils";

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
            email: userData.email || "",
            avatar: userData.avatar || null,
          };
        } else {
          // Try to get user info from Firebase Auth and create a basic user document
          try {
            const authUser = await adminAuth.getUser(uid);

            const basicUserData = {
              uid,
              username:
                authUser.displayName ||
                authUser.email?.split("@")[0] ||
                "Unknown User",
              email: authUser.email || "",
              createdAt: new Date(),
              provider: authUser.providerData[0]?.providerId || "unknown",
            };

            // Create the user document
            await adminDb.collection("users").doc(uid).set(basicUserData);

            return {
              uid,
              username: basicUserData.username,
              email: basicUserData.email,
              avatar: authUser.photoURL || null,
            };
          } catch (authError) {
            console.error(`Error fetching auth user ${uid}:`, authError);
            return {
              uid,
              username: "Unknown User",
              email: "",
              avatar: null,
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching user ${uid}:`, error);
        return {
          uid,
          username: "Unknown User",
          email: "",
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

    const project = {
      id: projectDoc.id,
      ...projectData,
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
      { error: "Failed to fetch project", details: error.message },
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

    const allowedFields = [
      "title",
      "thumbnail",
      "categoryTags",
      "type",
      "description",
      "visibility",
      "status",
      "goal",
      "duration",
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

    if (
      filteredUpdateData.type !== undefined &&
      !PROJECT_TYPES.includes(filteredUpdateData.type)
    ) {
      return NextResponse.json({ error: "Invalid project type" }, { status: 400 });
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
      const rolesError = validateArrayValues(
        filteredUpdateData.requiredRoles,
        REQUIRED_ROLES,
        "requiredRoles"
      );
      if (rolesError) {
        return NextResponse.json({ error: rolesError }, { status: 400 });
      }
    }

    if (
      filteredUpdateData.categoryTags !== undefined &&
      (!Array.isArray(filteredUpdateData.categoryTags) ||
        filteredUpdateData.categoryTags.some(
          (tag) => typeof tag !== "string" || !tag.trim()
        ))
    ) {
      return NextResponse.json(
        { error: "categoryTags must include non-empty strings" },
        { status: 400 }
      );
    }

    if (filteredUpdateData.duration !== undefined) {
      const duration = Number(filteredUpdateData.duration);
      if (!Number.isFinite(duration) || duration < 1 || duration > 3650) {
        return NextResponse.json(
          { error: "Duration must be between 1 and 3650 days" },
          { status: 400 }
        );
      }
      filteredUpdateData.duration = duration;
    }

    if (filteredUpdateData.budget !== undefined) {
      const budget = Number(filteredUpdateData.budget);
      if (!Number.isFinite(budget) || budget < 0) {
        return NextResponse.json(
          { error: "Budget must be a non-negative number" },
          { status: 400 }
        );
      }
      filteredUpdateData.budget = budget;
    }

    if (filteredUpdateData.status !== undefined) {
      if (!PROJECT_STATUSES.includes(filteredUpdateData.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const statusChanged = filteredUpdateData.status !== existingProject.status;
      if (
        statusChanged &&
        !isPlatformAdmin &&
        !OWNER_MANAGED_STATUSES.includes(filteredUpdateData.status)
      ) {
        return NextResponse.json(
          { error: "Only platform admins can publish, reject, or complete projects" },
          { status: 403 }
        );
      }
    }

    // Only admins can change certain sensitive fields
    if (
      updateData.admins !== undefined ||
      updateData.teamMembers !== undefined
    ) {
      if (isOwner || isPlatformAdmin) {
        if (updateData.admins !== undefined) {
          if (!Array.isArray(updateData.admins)) {
            return NextResponse.json({ error: "admins must be an array" }, { status: 400 });
          }
          filteredUpdateData.admins = [
            ...new Set([existingProject.owner, ...updateData.admins]),
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
            ...new Set([existingProject.owner, ...updateData.teamMembers]),
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
      admins: filteredUpdateData.admins || existingProject.admins || [],
      teamMembers:
        filteredUpdateData.teamMembers || existingProject.teamMembers || [],
    });

    // Fetch the updated project
    const updatedDoc = await adminDb.collection("projects").doc(id).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id,
      ...updatedData,
      createdAt: serializeFirestoreDate(updatedData.createdAt),
      updatedAt: serializeFirestoreDate(updatedData.updatedAt),
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project", details: error.message },
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

    // Project owner or a platform admin (superadmin) can delete.
    if (existingProject.owner !== user.uid && !user.admin) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only the project owner or a platform admin can delete this project.",
        },
        { status: 403 }
      );
    }

    const batch = adminDb.batch();
    batch.delete(adminDb.collection("projects").doc(id));

    if (existingProject.sourceProject) {
      batch.update(adminDb.collection("sourceProjects").doc(existingProject.sourceProject), {
        projectIds: admin.firestore.FieldValue.arrayRemove(id),
        updatedAt: new Date(),
      });
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

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project", details: error.message },
      { status: 500 }
    );
  }
}

async function syncUserProjectArrays(projectId, previousProject, nextProject) {
  const previousAdmins = new Set(previousProject.admins || []);
  const nextAdmins = new Set(nextProject.admins || []);
  const previousTeamMembers = new Set(previousProject.teamMembers || []);
  const nextTeamMembers = new Set(nextProject.teamMembers || []);
  const touchedUserIds = new Set([
    ...previousAdmins,
    ...nextAdmins,
    ...previousTeamMembers,
    ...nextTeamMembers,
  ]);

  if (touchedUserIds.size === 0) return;

  const batch = adminDb.batch();
  touchedUserIds.forEach((uid) => {
    const updates = { updatedAt: new Date() };

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
