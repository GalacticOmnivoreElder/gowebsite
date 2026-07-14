import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";

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
    const status = searchParams.get("status") || "draft"; // Default to draft projects
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    let query = adminDb.collection("projects");

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

    // Execute query
    const snapshot = await query.get();
    const projects = [];

    for (const doc of snapshot.docs) {
      const projectData = doc.data();

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

    // Get total count for pagination
    const totalQuery = adminDb.collection("projects");
    const totalSnapshot =
      status !== "all"
        ? await totalQuery.where("status", "==", status).get()
        : await totalQuery.get();

    const totalProjects = totalSnapshot.size;
    const hasMore = projects.length === limit;

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

    const { projectId, status, adminNotes } = await request.json();

    if (!projectId || !status) {
      return Response.json(
        { error: "Project ID and status are required" },
        { status: 400 }
      );
    }

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

    // Update project
    const projectRef = adminDb.collection("projects").doc(projectId);
    const updateData = {
      status,
      updatedAt: new Date(),
      lastModifiedBy: adminUser.uid,
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await projectRef.update(updateData);

    // Get updated project
    const updatedDoc = await projectRef.get();
    const updatedProject = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return Response.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return Response.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}
