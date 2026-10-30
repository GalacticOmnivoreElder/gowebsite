import { getRequestUser } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { cleanPoll, validId } from "@/lib/community-participation";

async function gate(request) {
  const user = await getRequestUser(request);
  if (!user) throw Object.assign(new Error("Authentication required."), { status: 401 });
  if (!user.admin) throw Object.assign(new Error("Admin access required."), { status: 403 });
  return user;
}
const errorResponse = (error) => Response.json({ error: error.status ? error.message : "The request could not be completed." }, { status: error.status || 500 });
export async function GET(request) {
  try {
    await gate(request);
    const [suggestions, polls] = await Promise.all([adminDb.collection("community_suggestions").limit(200).get(), adminDb.collection("community_priority_polls").limit(100).get()]);
    return Response.json({ suggestions: suggestions.docs.map((doc) => ({ id: doc.id, ...doc.data() })), polls: polls.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    const user = await gate(request); const body = await request.json();
    const reason = String(body.reason || "").trim();
    if (!reason || reason.length > 1000) throw Object.assign(new Error("A reason is required."), { status: 400 });
    const now = new Date();
    if (body.action === "suggestion") {
      const id = String(body.id || ""); const status = String(body.status || "");
      const statusNote = String(body.statusNote || "").trim();
      const roadmapId = String(body.roadmapId || "").trim(); const mergedInto = String(body.mergedInto || "").trim();
      if (!validId(id) || !["open", "accepted", "planned", "completed", "rejected", "merged"].includes(status) || !statusNote || statusNote.length > 1000 || (roadmapId && !validId(roadmapId)) || (status === "merged" && (!validId(mergedInto) || mergedInto === id))) throw Object.assign(new Error("Provide a valid status, explanation and related IDs."), { status: 400 });
      const ref = adminDb.collection("community_suggestions").doc(id);
      await adminDb.runTransaction(async (tx) => {
        const prev = await tx.get(ref);
        const target = status === "merged" ? await tx.get(adminDb.collection("community_suggestions").doc(mergedInto)) : null;
        const roadmap = roadmapId ? await tx.get(adminDb.collection("community_timeline").doc(roadmapId)) : null;
        if (!prev.exists || (target && (!target.exists || ["merged", "rejected", "pending"].includes(target.data().status))) || (roadmap && !roadmap.exists)) throw Object.assign(new Error("Suggestion or related record not found."), { status: 404 });
        const value = { status, statusNote, roadmapId, mergedInto: status === "merged" ? mergedInto : "", updatedAt: now };
        tx.update(ref, value);
        tx.create(adminDb.collection("admin_audit_events").doc(), { action: "community_suggestion.moderated", actorId: user.uid, target: { type: "community_suggestion", id }, previousValue: prev.data(), newValue: value, reason, createdAt: now });
      });
      return Response.json({ ok: true });
    }
    if (body.action === "poll") {
      const id = String(body.id || "");
      if (id && !validId(id)) throw Object.assign(new Error("Invalid poll."), { status: 400 });
      const data = cleanPoll(body);
      const ref = id ? adminDb.collection("community_priority_polls").doc(id) : adminDb.collection("community_priority_polls").doc();
      await adminDb.runTransaction(async (tx) => {
        const prev = await tx.get(ref);
        if (id && !prev.exists) throw Object.assign(new Error("Poll not found."), { status: 404 });
        const old = prev.data();
        if (old?.published && now.getTime() >= Date.parse(old.startsAt)) throw Object.assign(new Error("Voting has started; create a new poll instead of changing this one."), { status: 409 });
        const value = { ...data, published: body.published === true, resultsPublished: false, counts: data.options.map(() => 0), createdAt: old?.createdAt || now, updatedAt: now };
        tx.set(ref, value);
        tx.create(adminDb.collection("admin_audit_events").doc(), { action: "community_priority_poll.saved", actorId: user.uid, target: { type: "community_priority_poll", id: ref.id }, previousValue: old || null, newValue: value, reason, createdAt: now });
      });
      return Response.json({ id: ref.id });
    }
    if (body.action === "publishResults") {
      if (!validId(body.id)) throw Object.assign(new Error("Invalid poll."), { status: 400 });
      const ref = adminDb.collection("community_priority_polls").doc(body.id);
      await adminDb.runTransaction(async (tx) => {
        const poll = await tx.get(ref);
        if (!poll.exists || !poll.data().published) throw Object.assign(new Error("Poll not found."), { status: 404 });
        if (now.getTime() < Date.parse(poll.data().endsAt)) throw Object.assign(new Error("Voting must close before results are published."), { status: 409 });
        tx.update(ref, { resultsPublished: true, updatedAt: now });
        tx.create(adminDb.collection("admin_audit_events").doc(), { action: "community_priority_poll.results_published", actorId: user.uid, target: { type: "community_priority_poll", id: body.id }, reason, createdAt: now });
      });
      return Response.json({ ok: true });
    }
    throw Object.assign(new Error("Unknown action."), { status: 400 });
  } catch (error) { return errorResponse(error); }
}
