import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

const MAX_BATCH_OPERATIONS = 450;

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { error: "No token provided", status: 401 };
  if (!user.admin) return { error: "Not an admin", status: 403 };
  return { user };
}

export async function GET(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) {
      return Response.json({ error: gate.error }, { status: gate.status });
    }

    const snapshot = await adminDb.collection("sourceProjects").get();
    const sourceProjects = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          admins: Array.isArray(data.admins) ? data.admins : [],
          projectIds: Array.isArray(data.projectIds) ? data.projectIds : [],
          createdAt: serializeFirestoreDate(data.createdAt),
          updatedAt: serializeFirestoreDate(data.updatedAt),
        };
      })
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );

    return Response.json({ sourceProjects });
  } catch (error) {
    console.error("Error fetching admin source projects:", error);
    return Response.json(
      { error: "Failed to fetch source projects" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) {
      return Response.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await request.json().catch(() => ({}))) || {};
    const sourceProjectId =
      typeof body.sourceProjectId === "string"
        ? body.sourceProjectId.trim()
        : "";

    if (!sourceProjectId) {
      return Response.json(
        { error: "Source project ID is required" },
        { status: 400 }
      );
    }

    const sourceProjectRef = adminDb
      .collection("sourceProjects")
      .doc(sourceProjectId);
    const sourceProjectSnapshot = await sourceProjectRef.get();

    if (!sourceProjectSnapshot.exists) {
      return Response.json(
        { error: "Source project not found" },
        { status: 404 }
      );
    }

    const sourceProjectData = sourceProjectSnapshot.data();
    // Use the project reference as the source of truth so a stale projectIds
    // array cannot cause an unrelated project to be changed.
    const referencingProjectsSnapshot = await adminDb
      .collection("projects")
      .where("sourceProject", "==", sourceProjectId)
      .get();
    const existingLinkedProjects = referencingProjectsSnapshot.docs;

    // Unlink related projects in bounded batches so deleting a source project
    // cannot leave broken source-project references behind.
    for (
      let start = 0;
      start < existingLinkedProjects.length;
      start += MAX_BATCH_OPERATIONS
    ) {
      const batch = adminDb.batch();
      existingLinkedProjects
        .slice(start, start + MAX_BATCH_OPERATIONS)
        .forEach((projectDoc) => {
          batch.update(projectDoc.ref, {
            sourceProject: admin.firestore.FieldValue.delete(),
            updatedAt: new Date(),
          });
        });
      await batch.commit();
    }

    const auditRef = adminDb.collection("admin_audit_events").doc();
    const deleteBatch = adminDb.batch();
    deleteBatch.delete(sourceProjectRef);
    deleteBatch.set(auditRef, {
      action: "source_project.permanently_deleted",
      actorUid: gate.user.uid,
      createdAt: new Date(),
      sourceProjectId,
      sourceProjectName: sourceProjectData.name || "",
      unlinkedProjectCount: existingLinkedProjects.length,
    });
    await deleteBatch.commit();

    return Response.json({
      success: true,
      sourceProjectId,
      unlinkedProjectCount: existingLinkedProjects.length,
    });
  } catch (error) {
    console.error("Error deleting admin source project:", error);
    return Response.json(
      { error: "The source project could not be deleted" },
      { status: 500 }
    );
  }
}
