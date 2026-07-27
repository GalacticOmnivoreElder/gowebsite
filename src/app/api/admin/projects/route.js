import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import {
  enqueueAdminEmailEvent,
  enqueueEmailEventForUsers,
  getEmailRecipientForUser,
  projectManagers,
  projectParticipants,
} from "@/lib/email";

export async function GET(request) {
  try {
    // Verify admin authentication (Auth custom claim OR Firestore users/{uid}.admin)
    const adminUser = await getRequestUser(request);
    if (!adminUser) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }
    if (!adminUser.admin) {
      return Response.json({ error: "Not an admin" }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const viewingArchived = status === "archived";

    // Build query
    let query = adminDb.collection("projects");

    if (viewingArchived) {
      // Only archived projects. No orderBy here so we don't require an
      // (archived, createdAt) composite index — sorted in code below.
      query = query.where("archived", "==", true).limit(200);
    } else {
      if (status !== "all") {
        query = query.where("status", "==", status);
      }

      // Order by creation date (newest first)
      query = query.orderBy("createdAt", "desc");

      // Apply pagination - use offset for simplicity in admin interface
      const offset = (page - 1) * limit;
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);
    }

    // Execute query
    const snapshot = await query.get();
    const projects = [];

    for (const doc of snapshot.docs) {
      const projectData = doc.data();

      // Archived projects only appear under the dedicated "archived" view.
      if (!viewingArchived && projectData.archived === true) {
        continue;
      }

      // Get owner details
      let ownerDetails = null;
      if (projectData.owner) {
        try {
          const ownerDoc = await adminDb
            .collection("users")
            .doc(projectData.owner)
            .get();
          if (ownerDoc.exists) {
            const userData = ownerDoc.data();
            ownerDetails = {
              uid: projectData.owner,
              username: userData.username || userData.name || "Unknown",
              email: userData.email,
              avatar: userData.avatar,
            };
          }
        } catch (ownerError) {
          console.error("Error fetching owner details:", ownerError);
        }
      }

      projects.push({
        id: doc.id,
        ...projectData,
        ownerDetails,
        createdAt: projectData.createdAt?.toDate?.() || projectData.createdAt,
        updatedAt: projectData.updatedAt?.toDate?.() || projectData.updatedAt,
      });
    }

    // Archived view isn't ordered by the query (to avoid a composite index) —
    // sort newest-first in code.
    if (viewingArchived) {
      projects.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
    }

    // Get total count for pagination
    let totalProjects;
    if (viewingArchived) {
      totalProjects = projects.length;
    } else {
      const totalQuery = adminDb.collection("projects");
      const totalSnapshot =
        status !== "all"
          ? await totalQuery.where("status", "==", status).get()
          : await totalQuery.get();
      totalProjects = totalSnapshot.size;
    }
    const hasMore = !viewingArchived && projects.length === limit;

    return Response.json({
      projects,
      pagination: {
        page,
        limit,
        total: totalProjects,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Verify admin authentication (Auth custom claim OR Firestore users/{uid}.admin)
    const adminUser = await getRequestUser(request);
    if (!adminUser) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }
    if (!adminUser.admin) {
      return Response.json({ error: "Not an admin" }, { status: 403 });
    }

    const { projectId, status, adminNotes, archived } = await request.json();

    if (!projectId) {
      return Response.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (status === undefined && typeof archived !== "boolean") {
      return Response.json(
        { error: "Provide a status and/or an archived flag" },
        { status: 400 }
      );
    }

    const updateData = {
      updatedAt: new Date(),
      lastModifiedBy: adminUser.uid,
    };

    if (status !== undefined) {
      // Valid status values
      const validStatuses = [
        "draft",
        "pending",
        "hiring",
        "live",
        "completed",
        "rejected",
      ];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    // Archive / restore (soft delete). Hides the project from the whole app via
    // canViewProject but keeps it restorable.
    if (typeof archived === "boolean") {
      updateData.archived = archived;
      updateData.archivedAt = archived ? new Date() : null;
      updateData.archivedBy = archived ? adminUser.uid : null;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // Update project
    const projectRef = adminDb.collection("projects").doc(projectId);
    const previousSnapshot = await projectRef.get();
    if (!previousSnapshot.exists) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const previousProject = previousSnapshot.data();
    await projectRef.update(updateData);

    // Get updated project
    const updatedDoc = await projectRef.get();
    const updatedProject = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    if (status !== undefined && status !== previousProject.status) {
      await enqueueEmailEventForUsers({
        type: "project.status_changed",
        eventId: `${projectId}-${previousProject.status}-${status}-${updateData.updatedAt.toISOString()}`,
        userIds: ["live", "completed"].includes(status)
          ? projectParticipants(updatedProject)
          : projectManagers(updatedProject),
        data: {
          projectId,
          projectTitle: updatedProject.title,
          status,
          adminNotes: adminNotes || null,
        },
      });
      if (status === "pending") {
        const owner = await getEmailRecipientForUser(updatedProject.owner);
        await enqueueAdminEmailEvent({
          type: "admin.project_review_required",
          eventId: `${projectId}-${updateData.updatedAt.toISOString()}`,
          data: {
            projectId,
            projectTitle: updatedProject.title,
            ownerName: owner?.displayName || "a creator",
          },
        });
      }
    }
    if (
      typeof archived === "boolean" &&
      archived !== (previousProject.archived === true)
    ) {
      await enqueueEmailEventForUsers({
        type: archived ? "project.archived" : "project.restored",
        eventId: `${projectId}-${archived ? "archived" : "restored"}-${updateData.updatedAt.toISOString()}`,
        userIds: projectParticipants(updatedProject),
        data: {
          projectId,
          projectTitle: updatedProject.title,
        },
      });
    }

    return Response.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return Response.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}
