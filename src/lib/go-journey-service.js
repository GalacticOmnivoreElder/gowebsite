import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeAvailability } from "@/lib/availability";
import { getSkillKey, sanitizeSkills } from "@/lib/skills";
import { getSkillCatalog } from "@/lib/skill-catalog";
import { normalizeMatchmakingProfile, publicJourneyEvent, scoreMatch } from "@/lib/go-journey.mjs";
import { getDiscordConfig } from "@/lib/discord-api";
import { appetiteConfigHash } from "@/lib/discord-appetite.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const pairIdFor = (a, b) => digest(`go-match:v1:${[a, b].sort().join(":")}`);
export const journeyEventId = (uid, type, sourceId) => digest(`go-journey:v1:${uid}:${type}:${sourceId}`);
const asDate = (value) => value?.toDate?.() || (value instanceof Date ? value : new Date(value || 0));
const refForEvent = (uid, type, sourceId) => adminDb.collection("go_journey_events").doc(journeyEventId(uid, type, sourceId));
const KPI_FIELDS = Object.freeze({ game_jam_attended: "gameJamsAttended", match_accepted: "collaborationsAccepted", skill_validated: "skillsValidated" });

export function appendJourneyEvent(transaction, {
  uid, type, sourceId, title, summary, publicTitle = title, publicSummary = summary,
  occurredAt = new Date(), visibility = "public", status = "active", metadata = {}, publicDelta,
}) {
  const ref = refForEvent(uid, type, sourceId);
  transaction.set(ref, {
    userId: uid,
    type,
    sourceId: String(sourceId).slice(0, 180),
    title: String(title).slice(0, 120),
    summary: String(summary || "").slice(0, 500),
    publicTitle: String(publicTitle).slice(0, 120),
    publicSummary: String(publicSummary || "").slice(0, 240),
    occurredAt,
    visibility,
    status,
    metadata,
    stardateVersion: "go-cosmic-v1",
    updatedAt: new Date(),
  }, { merge: true });
  const kpiField = KPI_FIELDS[type];
  if (kpiField) {
    const delta = status === "corrected" || status === "revoked" ? -1 : 1;
    const publicCountDelta = publicDelta ?? (visibility === "public" ? delta : 0);
    transaction.set(adminDb.collection("go_journey_stats").doc(uid), {
      [`all_${kpiField}`]: FieldValue.increment(delta),
      [`public_${kpiField}`]: FieldValue.increment(publicCountDelta),
      updatedAt: new Date(),
    }, { merge: true });
  }
  return ref.id;
}

export async function recordJourneyEvent(input) {
  const ref = refForEvent(input.uid, input.type, input.sourceId);
  await ref.set({
    userId: input.uid,
    type: input.type,
    sourceId: String(input.sourceId).slice(0, 180),
    title: String(input.title).slice(0, 120),
    summary: String(input.summary || "").slice(0, 500),
    publicTitle: String(input.publicTitle || input.title).slice(0, 120),
    publicSummary: String(input.publicSummary || input.summary || "").slice(0, 240),
    occurredAt: input.occurredAt || new Date(),
    visibility: input.visibility || "public",
    status: input.status || "active",
    metadata: input.metadata || {},
    stardateVersion: "go-cosmic-v1",
    updatedAt: new Date(),
  }, { merge: true });
  return ref.id;
}

function safeJourneyEntry(doc, hiddenIds = [], owner = false) {
  const data = doc.data();
  if (!owner && (data.visibility !== "public" || hiddenIds.includes(doc.id))) return null;
  if (owner && ["corrected", "revoked"].includes(data.status)) {
    const date = asDate(data.occurredAt);
    if (!Number.isFinite(date.getTime())) return null;
    return {
      id: doc.id,
      type: String(data.type || "milestone").slice(0, 60),
      title: String(data.title || "GO development milestone").slice(0, 120),
      summary: String(data.summary || "").slice(0, 240),
      occurredAt: date.toISOString(),
      stardate: publicJourneyEvent({ ...data, occurredAt: date, visibility: "public", status: "active" })?.stardate || null,
      visibility: hiddenIds.includes(doc.id) ? "private" : "public",
      status: data.status,
      privateSummary: String(data.summary || "").slice(0, 240),
    };
  }
  const publicValue = publicJourneyEvent({ ...data, id: doc.id, visibility: owner ? "public" : data.visibility });
  if (!publicValue) return null;
  return owner ? {
    ...publicValue,
    visibility: hiddenIds.includes(doc.id) ? "private" : "public",
    status: data.status || "active",
    privateSummary: String(data.summary || "").slice(0, 240),
  } : publicValue;
}

export async function readJourney(uid, { owner = false, cursor = null } = {}) {
  const collection = adminDb.collection("go_journey_events");
  const [preferenceSnap, statsSnap, cursorSnap] = await Promise.all([
    adminDb.collection("go_journey_preferences").doc(uid).get(),
    adminDb.collection("go_journey_stats").doc(uid).get(),
    cursor && /^[a-f\d]{64}$/i.test(cursor) ? collection.doc(cursor).get() : Promise.resolve(null),
  ]);
  const hiddenIds = preferenceSnap.exists && Array.isArray(preferenceSnap.data().hiddenEventIds)
    ? preferenceSnap.data().hiddenEventIds.slice(0, 1000)
    : [];
  let pageQuery = collection.where("userId", "==", uid).orderBy("occurredAt", "desc").limit(51);
  if (cursorSnap?.exists && cursorSnap.data().userId === uid) pageQuery = pageQuery.startAfter(cursorSnap);
  const pageSnap = await pageQuery.get();
  const entries = pageSnap.docs.slice(0, 50)
    .map((doc) => safeJourneyEntry(doc, hiddenIds, owner))
    .filter(Boolean);
  const stats = statsSnap.data() || {};
  return {
    entries,
    nextCursor: pageSnap.docs.length > 50 ? pageSnap.docs[49].id : null,
    kpis: {
      gameJamsAttended: Math.max(0, Number(stats[owner ? "all_gameJamsAttended" : "public_gameJamsAttended"]) || 0),
      collaborationsAccepted: Math.max(0, Number(stats[owner ? "all_collaborationsAccepted" : "public_collaborationsAccepted"]) || 0),
      skillsValidated: Math.max(0, Number(stats[owner ? "all_skillsValidated" : "public_skillsValidated"]) || 0),
    },
    stardateVersion: "go-cosmic-v1",
  };
}

export async function updateJourneyVisibility(uid, body) {
  const eventId = String(body.eventId || "");
  if (!/^[a-f\d]{64}$/i.test(eventId) || typeof body.isPublic !== "boolean") {
    throw Object.assign(new Error("Choose a valid log entry and visibility."), { status: 400 });
  }
  const eventRef = adminDb.collection("go_journey_events").doc(eventId);
  const prefsRef = adminDb.collection("go_journey_preferences").doc(uid);
  await adminDb.runTransaction(async (transaction) => {
    const eventSnap = await transaction.get(eventRef);
    const prefsSnap = await transaction.get(prefsRef);
    if (!eventSnap.exists || eventSnap.data().userId !== uid) throw Object.assign(new Error("Log entry not found."), { status: 404 });
    const current = prefsSnap.exists && Array.isArray(prefsSnap.data().hiddenEventIds) ? prefsSnap.data().hiddenEventIds : [];
    const wasHidden = current.includes(eventId);
    const hiddenEventIds = body.isPublic ? current.filter((id) => id !== eventId) : [...new Set([...current, eventId])].slice(-1000);
    transaction.set(prefsRef, { hiddenEventIds, updatedAt: new Date() }, { merge: true });
    const kpiField = KPI_FIELDS[eventSnap.data().type];
    if (kpiField && (eventSnap.data().status || "active") === "active" && wasHidden !== !body.isPublic) {
      const statsRef = adminDb.collection("go_journey_stats").doc(uid);
      transaction.set(statsRef, { [`public_${kpiField}`]: FieldValue.increment(body.isPublic ? 1 : -1), updatedAt: new Date() }, { merge: true });
    }
  });
}

function profileBits(user = {}, cv = {}, userProfile = {}) {
  const sections = Array.isArray(cv.sections) ? cv.sections : [];
  const contact = sections.find((section) => section.section_type === "contact")?.content_json || {};
  const status = normalizeAvailability({ availability: userProfile, profile: user });
  return {
    skills: sanitizeSkills(user.skills || [], { max: 20 }),
    availability: status.status || "unspecified",
    timeZone: String(userProfile.timezone || contact.timezone || "").trim(),
  };
}

export async function getMatchmakingCandidates(uid) {
  const [settingsSnap, userSnap, userProfileSnap, cvSnap] = await Promise.all([
    adminDb.collection("go_matchmaking_profiles").doc(uid).get(),
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("user_profiles").doc(uid).get(),
    adminDb.collection("go_cvs").doc(uid).get(),
  ]);
  const user = userSnap.data() || {};
  const profile = profileBits(user, cvSnap.data() || {}, userProfileSnap.data() || {});
  const settings = settingsSnap.exists ? normalizeMatchmakingProfile(settingsSnap.data()) : normalizeMatchmakingProfile();
  const own = { ...profile, ...settings, skills: profile.skills };
  if (!settings.optedIn) return { profile: { ...settings, skills: profile.skills }, suggestions: [], requests: [], matches: [], configured: true };

  const [candidatesSnap, pairsSnap] = await Promise.all([
    adminDb.collection("go_matchmaking_profiles").where("optedIn", "==", true).orderBy("updatedAt", "desc").limit(100).get(),
    adminDb.collection("go_matchmaking_pairs").where("participants", "array-contains", uid).limit(100).get(),
  ]);
  const pairByPeer = new Map();
  for (const doc of pairsSnap.docs) {
    const data = doc.data();
    const peer = (data.participants || []).find((id) => id !== uid);
    if (peer) pairByPeer.set(peer, { id: doc.id, ...data });
  }
  const peers = candidatesSnap.docs
    .filter((doc) => doc.id !== uid)
    .map((doc) => {
      const candidate = normalizeMatchmakingProfile(doc.data());
      const match = scoreMatch(own, candidate);
      return { uid: doc.id, candidate, ...match, pair: pairByPeer.get(doc.id) || null };
    })
    .filter((entry) => entry.eligible && entry.pair?.state !== "blocked" && entry.pair?.state !== "declined")
    .sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid));
  const userSnaps = await Promise.all(peers.slice(0, 30).map((entry) => adminDb.collection("users").doc(entry.uid).get()));
  const labels = new Map(userSnaps.map((doc, index) => [peers[index].uid, String(doc.data()?.username || doc.data()?.displayName || "GO creator").slice(0, 80)]));
  const safePeer = (entry) => ({
    id: entry.uid,
    name: labels.get(entry.uid) || "GO creator",
    profileUrl: `/user/${encodeURIComponent(entry.uid)}`,
    skills: entry.candidate.skills,
    seekingSkills: entry.candidate.seekingSkills,
    interests: entry.candidate.interests,
    goal: entry.candidate.goal,
    timeZone: entry.candidate.timeZone,
    availability: entry.candidate.availability,
  });
  const suggestions = peers.filter((entry) => !entry.pair).slice(0, 5).map((entry) => ({
    ...safePeer(entry),
    score: entry.score,
    reasons: entry.reasons,
  }));
  const requests = peers.filter((entry) => entry.pair && entry.pair.state === "pending").slice(0, 50).map((entry) => ({
    id: entry.pair.id,
    state: entry.pair.state,
    acceptedByMe: (entry.pair.acceptedBy || []).includes(uid),
    peer: safePeer(entry),
    reasons: entry.reasons,
  }));
  const matches = peers.filter((entry) => entry.pair && entry.pair.state === "matched").slice(0, 50).map((entry) => ({
    id: entry.pair.id,
    state: entry.pair.state,
    matchedAt: asDate(entry.pair.matchedAt).toISOString(),
    peer: safePeer(entry),
    reasons: entry.reasons,
  }));
  return {
    profile: { ...settings, skills: profile.skills },
    suggestions,
    requests,
    matches,
    configured: true,
  };
}

export async function saveMatchmakingProfile(uid, body) {
  const [userSnap, userProfileSnap, cvSnap, catalog] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("user_profiles").doc(uid).get(),
    adminDb.collection("go_cvs").doc(uid).get(),
    getSkillCatalog(),
  ]);
  if (!userSnap.exists) throw Object.assign(new Error("GO account not found."), { status: 404 });
  const user = userSnap.data() || {};
  const raw = normalizeMatchmakingProfile({ ...body, skills: profileBits(user, cvSnap.data() || {}, userProfileSnap.data() || {}).skills });
  const allowedSkills = new Map(catalog.filter((skill) => skill.active).map((skill) => [getSkillKey(skill.name), skill.name]));
  const seekingSkills = sanitizeSkills(raw.seekingSkills).map((skill) => allowedSkills.get(getSkillKey(skill))).filter(Boolean);
  const interests = sanitizeSkills(raw.interests).map((skill) => allowedSkills.get(getSkillKey(skill))).filter(Boolean);
  const [discordSnap, userProfile] = await Promise.all([
    adminDb.collection("discord_connections").doc(uid).get(),
    Promise.resolve(userProfileSnap.data() || {}),
  ]);
  const discordConnection = discordSnap.data() || {};
  const discordConfig = getDiscordConfig();
  const appetite = discordConfig.appetiteEnabled && discordConnection.status === "joined" &&
    discordConnection.appetiteRoleMapHash === appetiteConfigHash(discordConfig.appetiteRoleIds)
    ? discordConnection.appetiteStatus
    : null;
  const sharedAppetite = raw.shareAppetite && ["hungry", "one_more_bite", "full"].includes(appetite) ? appetite : null;
  const profile = profileBits(user, cvSnap.data() || {}, userProfile);
  const value = {
    optedIn: raw.optedIn,
    shareAppetite: raw.shareAppetite,
    skills: profile.skills,
    seekingSkills,
    interests,
    goal: raw.goal,
    timeZone: raw.timeZone || profile.timeZone,
    availability: profile.availability,
    sharedAppetite,
    updatedAt: new Date(),
  };
  await adminDb.collection("go_matchmaking_profiles").doc(uid).set(value, { merge: true });
  return value;
}

export async function actOnMatch(uid, body) {
  const action = String(body.action || "");
  const peerUid = String(body.peerId || "");
  if (!/^[A-Za-z0-9:_-]{1,160}$/.test(peerUid) || peerUid === uid) throw Object.assign(new Error("Choose a valid creator."), { status: 400 });
  if (!["accept", "decline", "block"].includes(action)) throw Object.assign(new Error("Choose accept, decline, or block."), { status: 400 });
  const pairId = pairIdFor(uid, peerUid);
  const pairRef = adminDb.collection("go_matchmaking_pairs").doc(pairId);
  const ownProfileRef = adminDb.collection("go_matchmaking_profiles").doc(uid);
  const peerProfileRef = adminDb.collection("go_matchmaking_profiles").doc(peerUid);
  const result = await adminDb.runTransaction(async (transaction) => {
    const [pairSnap, ownProfileSnap, peerProfileSnap] = await Promise.all([
      transaction.get(pairRef),
      transaction.get(ownProfileRef),
      transaction.get(peerProfileRef),
    ]);
    if (!ownProfileSnap.data()?.optedIn || !peerProfileSnap.data()?.optedIn) throw Object.assign(new Error("Both creators must be opted in to matchmaking."), { status: 409 });
    const previous = pairSnap.data() || { participants: [uid, peerUid].sort(), acceptedBy: [], declinedBy: [], blockedBy: [], state: "pending", createdAt: new Date() };
    if ((previous.blockedBy || []).length || previous.state === "blocked") throw Object.assign(new Error("This match is unavailable."), { status: 409 });
    if (action === "block") {
      transaction.set(pairRef, { ...previous, blockedBy: [...new Set([...(previous.blockedBy || []), uid])], state: "blocked", updatedAt: new Date() });
      return { id: pairId, state: "blocked" };
    }
    if (action === "decline") {
      transaction.set(pairRef, { ...previous, declinedBy: [...new Set([...(previous.declinedBy || []), uid])], state: "declined", updatedAt: new Date() });
      return { id: pairId, state: "declined" };
    }
    if ((previous.declinedBy || []).some((id) => id !== uid)) throw Object.assign(new Error("This creator declined the match."), { status: 409 });
    const acceptedBy = [...new Set([...(previous.acceptedBy || []), uid])];
    const matched = acceptedBy.length === 2;
    const now = new Date();
    transaction.set(pairRef, { ...previous, participants: [uid, peerUid].sort(), acceptedBy, state: matched ? "matched" : "pending", ...(matched ? { matchedAt: previous.matchedAt || now } : {}), updatedAt: now }, { merge: true });
    if (matched && previous.state !== "matched") {
      appendJourneyEvent(transaction, { uid, type: "match_accepted", sourceId: pairId, title: "GO collaboration match accepted", summary: "A mutual GO collaboration match was confirmed.", publicTitle: "Matched with a GO collaborator", publicSummary: "A collaboration match was accepted by both creators.", occurredAt: now });
      appendJourneyEvent(transaction, { uid: peerUid, type: "match_accepted", sourceId: pairId, title: "GO collaboration match accepted", summary: "A mutual GO collaboration match was confirmed.", publicTitle: "Matched with a GO collaborator", publicSummary: "A collaboration match was accepted by both creators.", occurredAt: now });
    }
    return { id: pairId, state: matched ? "matched" : "pending" };
  });
  return result;
}

export async function setPassportDisplay(uid, stampId, isDisplayed) {
  if (!/^[a-f\d]{64}$/i.test(stampId || "") || typeof isDisplayed !== "boolean") {
    throw Object.assign(new Error("Choose an earned stamp and display setting."), { status: 400 });
  }
  const stampRef = adminDb.collection("passport_stamps").doc(stampId);
  const prefsRef = adminDb.collection("passport_preferences").doc(uid);
  let hiddenStampIds = [];
  await adminDb.runTransaction(async (transaction) => {
    const [stampSnap, prefsSnap] = await Promise.all([transaction.get(stampRef), transaction.get(prefsRef)]);
    if (!stampSnap.exists || stampSnap.data().userId !== uid || stampSnap.data().status !== "issued") {
      throw Object.assign(new Error("Only your earned stamps can be hidden."), { status: 403 });
    }
    const current = Array.isArray(prefsSnap.data()?.hiddenStampIds) ? prefsSnap.data().hiddenStampIds : [];
    hiddenStampIds = isDisplayed
      ? current.filter((id) => id !== stampId)
      : [...new Set([...current, stampId])].slice(-1000);
    transaction.set(prefsRef, { hiddenStampIds, updatedAt: new Date() }, { merge: true });
  });
  return { hiddenStampIds };
}
