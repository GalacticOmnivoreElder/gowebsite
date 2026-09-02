import { adminDb } from "@/lib/firebase-admin";
import { getRequestUser } from "@/lib/auth-utils";
import { serializeFirestoreDate } from "@/lib/project-utils";

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
