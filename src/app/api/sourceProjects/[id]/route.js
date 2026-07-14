import { NextResponse } from "next/server";
import { adminAuth as auth, adminDb as db } from "@/lib/firebase-admin";
import { canViewProject, serializeFirestoreDate } from "@/lib/project-utils";

async function getUserFromToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getUserFromToken(request);

    const doc = await db.collection("sourceProjects").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "SourceProject not found" },
        { status: 404 }
      );
    }

    const data = doc.data();
    const sourceProjectData = {
      id: doc.id,
      ...data,
      createdAt: serializeFirestoreDate(data.createdAt),
      updatedAt: serializeFirestoreDate(data.updatedAt),
    };

    const isOwner = user?.uid === sourceProjectData.sourceOwner;
    const isPlatformAdmin = !!user?.admin;

    // Fetch owner details
    const ownerDoc = await db
      .collection("users")
      .doc(sourceProjectData.sourceOwner)
      .get();
    if (ownerDoc.exists) {
      sourceProjectData.ownerDetails = {
        uid: ownerDoc.id,
        username:
          ownerDoc.data().username || ownerDoc.data().name || "Unknown User",
        avatar: ownerDoc.data().avatar || null,
        ...(isOwner || isPlatformAdmin ? { email: ownerDoc.data().email } : {}),
      };
    }

    // Fetch projects in this sourceProject
    if (
      sourceProjectData.projectIds &&
      sourceProjectData.projectIds.length > 0
    ) {
      const projectsRef = db.collection("projects");
      const projectPromises = sourceProjectData.projectIds.map((projectId) =>
        projectsRef.doc(projectId).get()
      );

      const projectDocs = await Promise.all(projectPromises);
      const projects = projectDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const projectData = doc.data();
          return {
            id: doc.id,
            ...projectData,
            createdAt: serializeFirestoreDate(projectData.createdAt),
            updatedAt: serializeFirestoreDate(projectData.updatedAt),
          };
        })
        .filter((project) => canViewProject(project, user));

      sourceProjectData.projects = projects;
    } else {
      sourceProjectData.projects = [];
    }

    if (!isOwner && !isPlatformAdmin && sourceProjectData.projects.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(sourceProjectData);
  } catch (error) {
    console.error("Error fetching sourceProject:", error);
    return NextResponse.json(
      { error: "Failed to fetch sourceProject" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id } = await params;
    const { projectIds } = await request.json();

    // Check if sourceProject exists and user owns it
    const doc = await db.collection("sourceProjects").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "SourceProject not found" },
        { status: 404 }
      );
    }

    const sourceProjectData = doc.data();
    if (sourceProjectData.sourceOwner !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeProjectIds = Array.isArray(projectIds)
      ? [...new Set(projectIds.filter((projectId) => typeof projectId === "string"))]
      : [];

    if (safeProjectIds.length > 0) {
      const projectDocs = await Promise.all(
        safeProjectIds.map((projectId) => db.collection("projects").doc(projectId).get())
      );

      const invalidProject = projectDocs.some((projectDoc) => {
        if (!projectDoc.exists) return true;
        const projectData = projectDoc.data();
        return projectData.owner !== userId;
      });

      if (invalidProject) {
        return NextResponse.json(
          { error: "All linked projects must be owned by you" },
          { status: 400 }
        );
      }
    }

    // Update the sourceProject
    await db
      .collection("sourceProjects")
      .doc(id)
      .update({
        projectIds: safeProjectIds,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sourceProject:", error);
    return NextResponse.json(
      { error: "Failed to update sourceProject" },
      { status: 500 }
    );
  }
}
