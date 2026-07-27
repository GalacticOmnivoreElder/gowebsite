import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { enqueueEmailEventForUsers } from "@/lib/email";

export async function DELETE(request, { params }) {
  try {
    const { id: projectId, memberId } = await params;
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectDoc.data();
    const canManageMembers = project.owner === user.uid || user.admin === true;

    if (!canManageMembers) {
      return NextResponse.json(
        { error: "Only the project owner or a platform admin can remove members" },
        { status: 403 }
      );
    }

    if (memberId === project.owner) {
      return NextResponse.json(
        { error: "The project owner cannot be removed" },
        { status: 400 }
      );
    }

    if (project.admins?.includes(memberId)) {
      return NextResponse.json(
        { error: "Remove the user's project admin role before removing them" },
        { status: 400 }
      );
    }

    if (!project.teamMembers?.includes(memberId)) {
      return NextResponse.json(
        { error: "User is not a member of this project" },
        { status: 404 }
      );
    }

    const applicationsSnapshot = await adminDb
      .collection("applications")
      .where("projectId", "==", projectId)
      .where("userId", "==", memberId)
      .get();

    const batch = adminDb.batch();
    const removedAt = new Date();
    let removedApprovedApplication = false;

    batch.update(projectRef, {
      teamMembers: admin.firestore.FieldValue.arrayRemove(memberId),
      updatedAt: removedAt,
    });
    batch.set(
      adminDb.collection("users").doc(memberId),
      {
        teamMemberOfProjects:
          admin.firestore.FieldValue.arrayRemove(projectId),
        updatedAt: removedAt,
      },
      { merge: true }
    );

    applicationsSnapshot.docs.forEach((applicationDoc) => {
      if (applicationDoc.data().status === "approved") {
        removedApprovedApplication = true;
        batch.update(applicationDoc.ref, {
          status: "removed",
          removedAt,
          removedBy: user.uid,
          updatedAt: removedAt,
        });
      }
    });

    await batch.commit();

    await enqueueEmailEventForUsers({
      type: removedApprovedApplication
        ? "application.member_removed"
        : "project.member_removed",
      eventId: `${projectId}-${memberId}`,
      userIds: [memberId],
      data: {
        projectId,
        projectTitle: project.title || "Project",
      },
    });

    return NextResponse.json({ success: true, memberId });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json(
      { error: "Failed to remove project member", details: error.message },
      { status: 500 }
    );
  }
}
