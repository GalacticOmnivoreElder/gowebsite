import { NextResponse } from "next/server";
import { adminAuth as auth, adminDb as db } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get all sourceProjects owned by the user
    const sourceProjectsRef = db.collection("sourceProjects");
    const snapshot = await sourceProjectsRef
      .where("sourceOwner", "==", userId)
      .orderBy("name")
      .get();

    const sourceProjects = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      sourceProjects.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return NextResponse.json({ sourceProjects });
  } catch (error) {
    console.error("Error fetching sourceProjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch sourceProjects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { name } = await request.json();

    if (!name || name.trim().length < 3 || name.trim().length > 50) {
      return NextResponse.json(
        { error: "Name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    // Create new sourceProject
    const sourceProjectData = {
      name: name.trim(),
      sourceOwner: userId,
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("sourceProjects").add(sourceProjectData);

    return NextResponse.json({
      id: docRef.id,
      ...sourceProjectData,
    });
  } catch (error) {
    console.error("Error creating sourceProject:", error);
    return NextResponse.json(
      { error: "Failed to create sourceProject" },
      { status: 500 }
    );
  }
}
