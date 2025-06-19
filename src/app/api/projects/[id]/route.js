import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function getUserFromToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
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
    const { id } = params;
    const user = await getUserFromToken(request);

    const projectDoc = await adminDb.collection("projects").doc(id).get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user can access this project
    const canAccess =
      projectData.visibility === "Public" ||
      (user &&
        (projectData.visibility === "Private" ||
          projectData.visibility === "Invite Only" ||
          projectData.owner === user.uid ||
          projectData.admins?.includes(user.uid) ||
          projectData.teamMembers?.includes(user.uid)));

    if (!canAccess) {
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

    const project = {
      id: projectDoc.id,
      ...projectData,
      createdAt:
        projectData.createdAt?.toDate?.()?.toISOString() ||
        projectData.createdAt,
      updatedAt:
        projectData.updatedAt?.toDate?.()?.toISOString() ||
        projectData.updatedAt,
      ownerDetails,
      adminDetails,
      teamMemberDetails,
      linkedProjects,
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
    const { id } = params;
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

    // Check if user can edit this project (owner or admin)
    const canEdit =
      existingProject.owner === user.uid ||
      existingProject.admins?.includes(user.uid);

    if (!canEdit) {
      return NextResponse.json(
        { error: "Access denied. Only project owner and admins can edit." },
        { status: 403 }
      );
    }

    const updateData = await request.json();

    // Add status to the allowed fields
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

    // Only admins can change certain sensitive fields
    if (
      updateData.admins !== undefined ||
      updateData.teamMembers !== undefined
    ) {
      // Check if user is admin (you'd need to implement admin check)
      // For now, only project owner can modify team
      if (existingProject.owner === user.uid) {
        if (updateData.admins !== undefined) {
          filteredUpdateData.admins = updateData.admins;
        }
        if (updateData.teamMembers !== undefined) {
          filteredUpdateData.teamMembers = updateData.teamMembers;
        }
      }
    }

    filteredUpdateData.updatedAt = new Date();

    await adminDb.collection("projects").doc(id).update(filteredUpdateData);

    // Fetch the updated project
    const updatedDoc = await adminDb.collection("projects").doc(id).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id,
      ...updatedData,
      createdAt:
        updatedData.createdAt?.toDate?.()?.toISOString() ||
        updatedData.createdAt,
      updatedAt:
        updatedData.updatedAt?.toDate?.()?.toISOString() ||
        updatedData.updatedAt,
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
    const { id } = params;
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

    // Only project owner can delete
    if (existingProject.owner !== user.uid) {
      return NextResponse.json(
        { error: "Access denied. Only project owner can delete." },
        { status: 403 }
      );
    }

    await adminDb.collection("projects").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project", details: error.message },
      { status: 500 }
    );
  }
}
