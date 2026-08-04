export const dynamic = "force-dynamic";

import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { cleanVideoBundle } from "@/lib/video-bundles";

async function requireAdmin(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Platform admin access required" }, { status: 403 }) };
  return { user };
}

function iso(value) {
  if (!value) return null;
  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serialize(id, data) {
  return { id, ...data, publishedAt: iso(data.publishedAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  const snapshot = await adminDb.collection("video_bundles").get();
  return Response.json(snapshot.docs.map((doc) => serialize(doc.id, doc.data())));
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const id = String(body.id || "").trim() || adminDb.collection("video_bundles").doc().id;
    const ref = adminDb.collection("video_bundles").doc(id);
    const previousDoc = await ref.get();
    const previous = previousDoc.exists ? previousDoc.data() : {};
    const clean = cleanVideoBundle({ ...previous, ...body });
    const now = new Date();
    const data = {
      ...clean,
      publishedAt: clean.status === "published" ? clean.publishedAt || previous.publishedAt || now : clean.publishedAt,
      createdAt: previous.createdAt || now,
      updatedAt: now,
      lastModifiedBy: gate.user.uid,
    };
    await ref.set(data, { merge: true });
    await adminDb.collection("admin_audit_events").add({ action: "video_bundle.saved", actorId: gate.user.uid, bundleId: id, status: data.status, createdAt: now });
    return Response.json(serialize(id, data), { status: previousDoc.exists ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: error.code === "validation_error" ? error.message : "Failed to save video bundle" }, { status: error.code === "validation_error" ? 400 : 500 });
  }
}
