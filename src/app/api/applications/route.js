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

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, projectTitle } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const projectDoc = await adminDb
      .collection("projects")
      .doc(projectId)
      .get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user is already a member of the project
    if (
      projectData.owner === user.uid ||
      projectData.admins?.includes(user.uid) ||
      projectData.teamMembers?.includes(user.uid)
    ) {
      return NextResponse.json(
        { error: "You are already a member of this project" },
        { status: 400 }
      );
    }

    // Check if user has already applied
    const existingApplication = await adminDb
      .collection("applications")
      .where("projectId", "==", projectId)
      .where("userId", "==", user.uid)
      .where("status", "in", ["pending", "approved"])
      .get();

    if (!existingApplication.empty) {
      return NextResponse.json(
        { error: "You have already applied to this project" },
        { status: 400 }
      );
    }

    // Get user details
    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Create application
    const applicationData = {
      projectId,
      projectTitle: projectTitle || projectData.title,
      userId: user.uid,
      userEmail: user.email,
      username:
        userData.username || user.email?.split("@")[0] || "Unknown User",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const applicationRef = await adminDb
      .collection("applications")
      .add(applicationData);

    return NextResponse.json({
      id: applicationRef.id,
      ...applicationData,
      createdAt: applicationData.createdAt.toISOString(),
      updatedAt: applicationData.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    let query = adminDb.collection("applications");

    if (projectId) {
      // Get applications for a specific project (for project owners/admins)
      const projectDoc = await adminDb
        .collection("projects")
        .doc(projectId)
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

      query = query.where("projectId", "==", projectId);
    } else {
      // Get user's own applications
      query = query.where("userId", "==", user.uid);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const applications = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      applications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications", details: error.message },
      { status: 500 }
    );
  }
}
