import { getRequestUser, hasActiveSubscription } from "@/lib/auth-utils";
import { adminDb } from "@/lib/firebase-admin";
import { castPriorityVote, supportSuggestion } from "@/lib/community-participation";

function errorResponse(error) { return Response.json({ error: error.status ? error.message : "The request could not be completed." }, { status: error.status || 500, headers: { "Cache-Control": "private, no-store" } }); }
async function member(request) {
  const user = await getRequestUser(request);
  if (!user) throw Object.assign(new Error("Sign in to participate."), { status: 401 });
  if (!hasActiveSubscription(user.userData)) throw Object.assign(new Error("An active paid community subscription is required."), { status: 403 });
  return user;
}
export async function GET(request) {
  try {
    const user = await member(request);
    const [suggestions, polls] = await Promise.all([adminDb.collection("community_suggestions").limit(200).get(), adminDb.collection("community_priority_polls").limit(100).get()]);
    const now = Date.now();
    return Response.json({ suggestions: suggestions.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => !["pending", "rejected"].includes(item.status) || item.authorId === user.uid).map(({ id, title, purpose, benefit, status, statusNote, roadmapId, mergedInto, supportCount }) => ({ id, title, purpose, benefit, status, statusNote, roadmapId, mergedInto, supportCount })), polls: polls.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((poll) => poll.published).map(({ id, title, options, startsAt, endsAt, resultsPublished, counts }) => ({ id, title, options, startsAt, endsAt, open: now >= Date.parse(startsAt) && now < Date.parse(endsAt), results: resultsPublished && now >= Date.parse(endsAt) ? counts : null })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    const user = await member(request);
    const body = await request.json();
    if (body.action === "vote") return Response.json(await castPriorityVote(user.uid, body.pollId, body.optionIndex));
    if (body.action === "support") return Response.json(await supportSuggestion(user.uid, body.id));
    if (body.action !== "suggest") throw Object.assign(new Error("Unknown action."), { status: 400 });
    const title = String(body.title || "").trim(); const purpose = String(body.purpose || "").trim(); const benefit = String(body.benefit || "").trim();
    if (!title || title.length > 160 || !purpose || purpose.length > 2000 || !benefit || benefit.length > 2000) throw Object.assign(new Error("Provide a title, purpose and expected benefit."), { status: 400 });
    const ref = adminDb.collection("community_suggestions").doc();
    await adminDb.runTransaction(async (tx) => {
      const memberDoc = await tx.get(adminDb.collection("users").doc(user.uid));
      if (!memberDoc.exists || !hasActiveSubscription(memberDoc.data())) throw Object.assign(new Error("An active paid community subscription is required."), { status: 403 });
      tx.create(ref, { title, purpose, benefit, status: "pending", statusNote: "Awaiting moderation.", supportCount: 0, authorId: user.uid, createdAt: new Date() });
    });
    return Response.json({ id: ref.id }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
