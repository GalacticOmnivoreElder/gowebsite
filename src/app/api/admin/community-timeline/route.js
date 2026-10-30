import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { cleanTimelineEntry } from "@/lib/community-timeline";

async function authorize(request) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Authentication required." }, { status: 401 }) };
  if (!user.admin) return { response: Response.json({ error: "Admin access required." }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const gate = await authorize(request);
  if (gate.response) return gate.response;
  try {
    const snapshot = await adminDb.collection("community_timeline").get();
    return Response.json({ entries: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch { return Response.json({ error: "Could not load entries." }, { status: 500 }); }
}

export async function POST(request) {
  const gate = await authorize(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const entry = cleanTimelineEntry(body);
    const reason = String(body.reason || "").trim().slice(0, 1000);
    if (!reason) return Response.json({ error: "A correction or publication reason is required." }, { status: 400 });
    const id = String(body.id || "");
    if (id && !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return Response.json({ error: "Invalid entry ID." }, { status: 400 });
    const ref = id ? adminDb.collection("community_timeline").doc(id) : adminDb.collection("community_timeline").doc();
    await adminDb.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (id && !previous.exists) throw Object.assign(new Error("Entry not found."), { status: 404 });
      const now = new Date();
      tx.set(ref, { ...entry, createdAt: previous.data()?.createdAt || now, updatedAt: now, updatedBy: gate.user.uid });
      tx.create(adminDb.collection("admin_audit_events").doc(), { action: "community_timeline.saved", actorId: gate.user.uid, target: { type: "community_timeline", id: ref.id }, previousValue: previous.exists ? previous.data() : null, newValue: entry, reason, createdAt: now });
    });
    return Response.json({ id: ref.id });
  } catch (error) {
    const validation = error.message?.includes("Provide") || error.message?.includes("Links") || error.message?.includes("source");
    const status = error.status || (validation || error instanceof SyntaxError ? 400 : 500);
    return Response.json({ error: status === 500 ? "Could not save entry." : error instanceof SyntaxError ? "Invalid request." : error.message }, { status });
  }
}
