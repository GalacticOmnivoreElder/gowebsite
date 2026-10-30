import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { hasActiveSubscription } from "@/lib/auth-utils";

const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const validId = (id) => idPattern.test(String(id || ""));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (value, max) => String(value || "").trim().slice(0, max);
const voteId = (uid) => createHash("sha256").update(`community-priority-v1:${uid}`).digest("hex");
const dateMs = (value) => Date.parse(value);

export function cleanPoll(body) {
  const title = text(body.title, 160);
  const options = Array.isArray(body.options) ? body.options.map((option) => text(option, 160)).filter(Boolean) : [];
  const startsAt = text(body.startsAt, 40);
  const endsAt = text(body.endsAt, 40);
  if (!title || options.length < 2 || options.length > 10 || new Set(options.map((x) => x.toLowerCase())).size !== options.length || !Number.isFinite(dateMs(startsAt)) || !Number.isFinite(dateMs(endsAt)) || dateMs(startsAt) >= dateMs(endsAt)) throw fail("Provide a title, two to ten distinct options and a valid voting period.");
  return { title, options, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() };
}

export async function castPriorityVote(uid, pollId, optionIndex, now = new Date()) {
  if (!validId(pollId) || !Number.isInteger(optionIndex)) throw fail("Choose a valid poll and option.");
  const pollRef = adminDb.collection("community_priority_polls").doc(pollId);
  const ballotRef = pollRef.collection("ballots").doc(voteId(uid));
  return adminDb.runTransaction(async (tx) => {
    const [poll, ballot, member] = await Promise.all([tx.get(pollRef), tx.get(ballotRef), tx.get(adminDb.collection("users").doc(uid))]);
    if (!member.exists || !hasActiveSubscription(member.data(), now)) throw fail("An active paid community subscription is required.", 403);
    if (!poll.exists) throw fail("Poll not found.", 404);
    const data = poll.data();
    if (!data.published || now.getTime() < dateMs(data.startsAt) || now.getTime() >= dateMs(data.endsAt)) throw fail("Voting is not open.", 409);
    if (ballot.exists) throw fail("You have already voted in this poll.", 409);
    if (optionIndex < 0 || optionIndex >= data.options.length) throw fail("Choose a valid option.");
    const counts = data.options.map((_, i) => Math.max(0, Number(data.counts?.[i]) || 0) + (i === optionIndex ? 1 : 0));
    tx.create(ballotRef, { optionIndex, castAt: now });
    tx.update(pollRef, { counts, updatedAt: now });
    return { ok: true };
  });
}

export async function supportSuggestion(uid, id) {
  if (!validId(id)) throw fail("Invalid suggestion.");
  const ref = adminDb.collection("community_suggestions").doc(id);
  const supportRef = ref.collection("supporters").doc(voteId(uid));
  return adminDb.runTransaction(async (tx) => {
    const [suggestion, support, member] = await Promise.all([tx.get(ref), tx.get(supportRef), tx.get(adminDb.collection("users").doc(uid))]);
    if (!member.exists || !hasActiveSubscription(member.data())) throw fail("An active paid community subscription is required.", 403);
    if (!suggestion.exists || !["open", "accepted", "planned", "completed"].includes(suggestion.data().status)) throw fail("Suggestion is unavailable.", 404);
    if (support.exists) throw fail("You already support this suggestion.", 409);
    tx.create(supportRef, { createdAt: new Date() });
    tx.update(ref, { supportCount: Math.max(0, Number(suggestion.data().supportCount) || 0) + 1 });
    return { ok: true };
  });
}

export { validId };
