import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";

async function getUserFromToken(request) {
  return getRequestUser(request);
}

async function enrichApplicationWithUserDetails(application) {
  try {
    // Get user details from users collection
    const userDoc = await adminDb
      .collection("users")
      .doc(application.userId)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        ...application,
        // Inject user details
        username: userData.username || userData.name || "Unknown User",
        userEmail: userData.email || "No email",
        avatar: userData.avatar || null,
      };
    } else {
      // Fallback: try to get from Firebase Auth
      try {
        const authUser = await adminAuth.getUser(application.userId);
        return {
          ...application,
          username:
            authUser.displayName ||
            authUser.email?.split("@")[0] ||
            "Unknown User",
          userEmail: authUser.email || "No email",
          avatar: authUser.photoURL || null,
        };
      } catch (authError) {
        console.error(
          `Error fetching auth user ${application.userId}:`,
          authError
        );
        return {
          ...application,
          username: "Unknown User",
          userEmail: "No email",
          avatar: null,
        };
      }
    }
  } catch (error) {
    console.error("Error enriching application with user details:", error);
    return {
      ...application,
      username: "Unknown User",
      userEmail: "No email",
      avatar: null,
    };
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["pending", "approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the application
    const applicationDoc = await adminDb
      .collection("applications")
      .doc(id)
      .get();
    if (!applicationDoc.exists) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    // Check permissions
    if (status === "cancelled") {
      // Only the applicant can cancel their own application
      if (applicationData.userId !== user.uid) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else {
      // Only project owner/admins can approve/reject
      const projectDoc = await adminDb
        .collection("projects")
        .doc(applicationData.projectId)
        .get();
      if (!projectDoc.exists) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const projectData = projectDoc.data();
      if (
        projectData.owner !== user.uid &&
        !projectData.admins?.includes(user.uid) &&
        !user.admin
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // If approving, add user to project team members and update user's projects
      if (status === "approved") {
        const batch = adminDb.batch();

        // Update project: add user to teamMembers array
        const projectRef = adminDb
          .collection("projects")
          .doc(applicationData.projectId);
        const currentTeamMembers = projectData.teamMembers || [];
        if (!currentTeamMembers.includes(applicationData.userId)) {
          batch.update(projectRef, {
            teamMembers: [...currentTeamMembers, applicationData.userId],
            updatedAt: new Date(),
          });
        }

        // Update user: add project to teamMemberOfProjects array
        const userRef = adminDb.collection("users").doc(applicationData.userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentProjects = userData.teamMemberOfProjects || [];
          if (!currentProjects.includes(applicationData.projectId)) {
            batch.update(userRef, {
              teamMemberOfProjects: [
                ...currentProjects,
                applicationData.projectId,
              ],
              updatedAt: new Date(),
            });
          }
        } else {
          // Create user document if it doesn't exist
          // Get user details from Firebase Auth as fallback
          try {
            const authUser = await adminAuth.getUser(applicationData.userId);
            batch.set(userRef, {
              uid: applicationData.userId,
              email: authUser.email || "No email",
              username:
                authUser.displayName ||
                authUser.email?.split("@")[0] ||
                "Unknown User",
              teamMemberOfProjects: [applicationData.projectId],
              ownerOfProjects: [],
              adminOfProjects: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch (authError) {
            console.error(`Error fetching auth user for approval:`, authError);
            // Create with minimal data
            batch.set(userRef, {
              uid: applicationData.userId,
              email: "No email",
              username: "Unknown User",
              teamMemberOfProjects: [applicationData.projectId],
              ownerOfProjects: [],
              adminOfProjects: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // Commit the batch
        await batch.commit();
      }
    }

    // Update the application
    await adminDb.collection("applications").doc(id).update({
      status,
      updatedAt: new Date(),
    });

    const updatedDoc = await adminDb.collection("applications").doc(id).get();
    const updatedData = updatedDoc.data();

    const baseApplication = {
      id,
      ...updatedData,
      createdAt:
        updatedData.createdAt?.toDate?.()?.toISOString() ||
        updatedData.createdAt,
      updatedAt:
        updatedData.updatedAt?.toDate?.()?.toISOString() ||
        updatedData.updatedAt,
    };

    // Enrich with user details
    const enrichedApplication =
      await enrichApplicationWithUserDetails(baseApplication);

    return NextResponse.json(enrichedApplication);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application", details: error.message },
      { status: 500 }
    );
  }
}
