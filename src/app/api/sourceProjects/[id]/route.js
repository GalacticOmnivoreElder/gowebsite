import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { canViewProject, serializeFirestoreDate } from "@/lib/project-utils";
import { canManageSourceProject } from "@/lib/source-project-utils";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request);

    const doc = await db.collection("sourceProjects").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "SourceProject not found" },
        { status: 404 }
      );
    }

    const data = doc.data();
    const isManager = canManageSourceProject(data, user);
    const publicData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== "admins")
    );
    const sourceProjectData = {
      id: doc.id,
      ...publicData,
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
            title: projectData.title,
            thumbnail: projectData.thumbnail || "",
            type: projectData.type,
            status: projectData.status,
            visibility: projectData.visibility,
            goal: projectData.goal,
            createdAt: serializeFirestoreDate(projectData.createdAt),
            updatedAt: serializeFirestoreDate(projectData.updatedAt),
          };
        })
        .filter((project) => isManager || canViewProject(project, user));

      sourceProjectData.projects = projects;
    } else {
      sourceProjectData.projects = [];
    }

    if (!isManager && sourceProjectData.projects.length === 0) {
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
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) || {};

    // Check if sourceProject exists before applying manager permissions.
    const doc = await db.collection("sourceProjects").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "SourceProject not found" },
        { status: 404 }
      );
    }

    const sourceProjectData = doc.data();
    if (!canManageSourceProject(sourceProjectData, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasProjectIds = Object.prototype.hasOwnProperty.call(body, "projectIds");
    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasOwner = Object.prototype.hasOwnProperty.call(body, "sourceOwner");
    const hasAdmins = Object.prototype.hasOwnProperty.call(body, "admins");

    if (!hasProjectIds && !hasName && !hasOwner && !hasAdmins) {
      return NextResponse.json(
        { error: "At least one source project field is required" },
        { status: 400 }
      );
    }

    if (hasOwner && !user.admin) {
      return NextResponse.json(
        { error: "Only platform admins can change the source project owner" },
        { status: 403 }
      );
    }

    if (hasAdmins && sourceProjectData.sourceOwner !== user.uid && !user.admin) {
      return NextResponse.json(
        { error: "Only the source project owner or a platform admin can manage admins" },
        { status: 403 }
      );
    }

    if (hasProjectIds && sourceProjectData.sourceOwner !== user.uid) {
      return NextResponse.json(
        { error: "Only the source project owner can change linked projects" },
        { status: 403 }
      );
    }

    const nextOwner = hasOwner ? body.sourceOwner : sourceProjectData.sourceOwner;
    const nextOwnerId = typeof nextOwner === "string" ? nextOwner.trim() : "";
    if (hasOwner && !nextOwnerId) {
      return NextResponse.json(
        { error: "A valid source project owner is required" },
        { status: 400 }
      );
    }

    if (hasOwner) {
      const ownerDoc = await db.collection("users").doc(nextOwnerId).get();
      if (!ownerDoc.exists) {
        return NextResponse.json(
          { error: "The selected source project owner was not found" },
          { status: 400 }
        );
      }
    }

    if (
      hasName &&
      (typeof body.name !== "string" ||
        body.name.trim().length < 3 ||
        body.name.trim().length > 50)
    ) {
      return NextResponse.json(
        { error: "Name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    const safeProjectIds = hasProjectIds
      ? Array.isArray(body.projectIds)
        ? [
            ...new Set(
              body.projectIds.filter(
                (projectId) => typeof projectId === "string"
              )
            ),
          ]
        : []
      : sourceProjectData.projectIds || [];

    if (safeProjectIds.length > 0) {
      const projectDocs = await Promise.all(
        safeProjectIds.map((projectId) => db.collection("projects").doc(projectId).get())
      );

      const invalidProject = projectDocs.some((projectDoc) => {
        if (!projectDoc.exists) return true;
        const projectData = projectDoc.data();
        return projectData.owner !== sourceProjectData.sourceOwner;
      });

      if (invalidProject) {
        return NextResponse.json(
          { error: "All linked projects must be owned by you" },
          { status: 400 }
        );
      }
    }

    const update = {
      updatedAt: new Date().toISOString(),
    };

    if (hasProjectIds) update.projectIds = safeProjectIds;
    if (hasName) update.name = body.name.trim();
    if (hasOwner) update.sourceOwner = nextOwnerId;
    if (hasAdmins) {
      if (!Array.isArray(body.admins)) {
        return NextResponse.json(
          { error: "admins must be an array" },
          { status: 400 }
        );
      }
      const safeAdminIds = [
        ...new Set(
          body.admins.filter(
            (adminId) => typeof adminId === "string" && adminId.trim()
          ).map((adminId) => adminId.trim())
        ),
      ].filter((adminId) => adminId !== nextOwnerId);

      const adminDocs = await Promise.all(
        safeAdminIds.map((adminId) => db.collection("users").doc(adminId).get())
      );
      if (adminDocs.some((adminDoc) => !adminDoc.exists)) {
        return NextResponse.json(
          { error: "Every source project admin must be an existing user" },
          { status: 400 }
        );
      }

      update.admins = safeAdminIds;
    }

    await db
      .collection("sourceProjects")
      .doc(id)
      .update(update);

    return NextResponse.json({
      success: true,
      sourceProject: { id, ...sourceProjectData, ...update },
    });
  } catch (error) {
    console.error("Error updating sourceProject:", error);
    return NextResponse.json(
      { error: "Failed to update sourceProject" },
      { status: 500 }
    );
  }
}
