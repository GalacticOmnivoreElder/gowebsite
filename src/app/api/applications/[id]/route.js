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

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = params;
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
        !projectData.admins?.includes(user.uid)
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
          batch.set(userRef, {
            uid: applicationData.userId,
            email: applicationData.userEmail,
            username: applicationData.username,
            teamMemberOfProjects: [applicationData.projectId],
            ownerOfProjects: [],
            adminOfProjects: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
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
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application", details: error.message },
      { status: 500 }
    );
  }
}
