import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sourceProjectsRef = db.collection("sourceProjects");
    const snapshots = user.admin
      ? [await sourceProjectsRef.get()]
      : await Promise.all([
          sourceProjectsRef.where("sourceOwner", "==", user.uid).get(),
          sourceProjectsRef.where("admins", "array-contains", user.uid).get(),
        ]);

    const sourceProjectsById = new Map();
    snapshots.forEach((snapshot) => snapshot.forEach((doc) => {
      const data = doc.data();
      const publicData = Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== "admins")
      );
      sourceProjectsById.set(doc.id, {
        id: doc.id,
        ...publicData,
        createdAt: serializeFirestoreDate(data.createdAt),
        updatedAt: serializeFirestoreDate(data.updatedAt),
      });
    }));

    const sourceProjects = Array.from(sourceProjectsById.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );

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
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      sourceOwner: user.uid,
      admins: [],
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
