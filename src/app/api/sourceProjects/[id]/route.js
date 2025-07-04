import { NextResponse } from "next/server";
import { adminAuth as auth, adminDb as db } from "@/lib/firebase-admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

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
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };

    // Fetch owner details
    const ownerDoc = await db
      .collection("users")
      .doc(sourceProjectData.sourceOwner)
      .get();
    if (ownerDoc.exists) {
      sourceProjectData.ownerDetails = {
        uid: ownerDoc.id,
        ...ownerDoc.data(),
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
            createdAt:
              projectData.createdAt?.toDate?.()?.toISOString() ||
              projectData.createdAt,
            updatedAt:
              projectData.updatedAt?.toDate?.()?.toISOString() ||
              projectData.updatedAt,
          };
        });

      sourceProjectData.projects = projects;
    } else {
      sourceProjectData.projects = [];
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

    // Update the sourceProject
    await db
      .collection("sourceProjects")
      .doc(id)
      .update({
        projectIds: projectIds || [],
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
