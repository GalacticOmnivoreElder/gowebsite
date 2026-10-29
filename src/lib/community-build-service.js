import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getEffectiveMembership } from "@/lib/auth-utils";
import { getDiscordConfig } from "@/lib/discord-api";
import { appetiteConfigHash, summarizeAppetite } from "@/lib/discord-appetite.mjs";
import { currentBuildPeriod, periodForKey, shiftDate, officiallyPublishedPack, votingEligibility, cleanCandidates, publicPoll, publicStamp, spritePath, visiblePassport, displayedPassportStamps, problem } from "@/lib/monday-builds.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const active = (data, now = new Date()) => getEffectiveMembership(data || {}, { admin: false, now }).activeMember === true;
const ownedPacks = (uid) => adminDb.collection("asset_packs").where("contributorId", "==", uid);
const stampId = (uid, kind, sourceId) => hash("go-stamp:v1:" + uid + ":" + kind + ":" + sourceId);
const ballotId = (key, uid) => key + "_" + hash(uid);
const audit = (transaction, userId, action, targetId, reason, now) => transaction.create(adminDb.collection("admin_audit_events").doc(), { actorId: userId, action, target: { type: "community_build", id: targetId }, reason, createdAt: now });

export async function getBuildBoard(user) {
  const period = currentBuildPeriod();
  const previousKey = shiftDate(period.key, -7);
  const reads = [
    adminDb.collection("community_build_polls").doc(period.key).get(),
    adminDb.collection("community_build_polls").doc(previousKey).get(),
  ];
  if (user) reads.push(ownedPacks(user.uid).get(), adminDb.collection("community_build_ballots").doc(ballotId(period.key, user.uid)).get(), adminDb.collection("users").doc(user.uid).get());
  const [poll, previous, packs, ballot, member] = await Promise.all(reads);
  const eligibility = user ? votingEligibility(active(member.data()), packs.docs.map((doc) => doc.data())) : { eligible: false, reason: "Sign in to see your weekly voting benefit." };
  return { period, poll: poll.exists ? publicPoll(poll.id, poll.data()) : null, previous: previous.exists ? { ...publicPoll(previous.id, previous.data()), period: periodForKey(previousKey) } : null, authenticated: Boolean(user), eligibility, votedOptionId: ballot?.exists ? ballot.data().optionId : null, availableVotes: eligibility.eligible && period.votingOpen && !ballot?.exists ? 1 : 0 };
}

export async function getPublicAppetite() {
  const config = getDiscordConfig();
  if (!config.appetiteEnabled) return { configured: false, status: "setup_needed", counts: null, total: 0 };
  const snapshot = await adminDb.collection("discord_connections").where("status", "==", "joined").get();
  const signal = summarizeAppetite(
    snapshot.docs.map((doc) => doc.data()),
    new Date(),
    appetiteConfigHash(config.appetiteRoleIds),
  );
  return { configured: true, ...signal };
}

export async function castBuildVote(user, optionId, expectedPeriod) {
  if (typeof optionId !== "string" || !/^option-[1-8]$/.test(optionId)) throw problem("Choose a published build candidate");
  const period = currentBuildPeriod();
  if (expectedPeriod !== period.key || !period.votingOpen) throw problem("This voting cycle is closed. Refresh the board.", 409);
  const pollRef = adminDb.collection("community_build_polls").doc(period.key);
  const ballotRef = adminDb.collection("community_build_ballots").doc(ballotId(period.key, user.uid));
  return adminDb.runTransaction(async (transaction) => {
    const [member, packs, poll, ballot] = await Promise.all([transaction.get(adminDb.collection("users").doc(user.uid)), transaction.get(ownedPacks(user.uid)), transaction.get(pollRef), transaction.get(ballotRef)]);
    const now = new Date();
    const eligibility = votingEligibility(active(member.data(), now), packs.docs.map((doc) => doc.data()));
    if (!eligibility.eligible) throw problem(eligibility.reason, 403);
    if (!poll.exists || !Array.isArray(poll.data().options)) throw problem("No candidates are published for this cycle", 409);
    if (ballot.exists) throw problem("Your weekly vote has already been used", 409);
    if (now >= new Date(period.closesAt) || currentBuildPeriod(now).key !== period.key) throw problem("Voting has closed for the Monday build", 409);
    const data = poll.data();
    if (!data.options.some((option) => option.id === optionId)) throw problem("This candidate is not on the current ballot");
    const options = data.options.map((option) => ({ ...option, votes: (Number(option.votes) || 0) + (option.id === optionId ? 1 : 0) }));
    transaction.create(ballotRef, { userId: user.uid, weekId: period.key, optionId, createdAt: now });
    transaction.update(pollRef, { options, totalVotes: (Number(data.totalVotes) || 0) + 1, updatedAt: now });
    return { votedOptionId: optionId, availableVotes: 0 };
  });
}

export async function manageBuildPoll(admin, body) {
  const period = periodForKey(body.weekId);
  const now = new Date();
  const current = currentBuildPeriod(now);
  const ref = adminDb.collection("community_build_polls").doc(period.key);
  if (body.action === "publish") {
    if (![current.key, shiftDate(current.key, 7)].includes(period.key) || now >= new Date(period.closesAt)) throw problem("Publish candidates for the current or next open cycle");
    const options = cleanCandidates(body.options);
    await adminDb.runTransaction(async (transaction) => {
      const old = await transaction.get(ref);
      if ((old.data()?.totalVotes || 0) > 0) throw problem("Candidates cannot change after the first vote", 409);
      transaction.set(ref, { options, totalVotes: 0, outcome: null, createdBy: admin.uid, updatedAt: now, createdAt: old.data()?.createdAt || now });
      audit(transaction, admin.uid, "community_build.candidates_published", period.key, "Published one-hour build candidates", now);
    });
    return { weekId: period.key };
  }
  if (body.action !== "outcome") throw problem("Unsupported build action");
  if (now < new Date(period.closesAt)) throw problem("Voting must close before recording the build outcome", 409);
  const statuses = ["selected", "building", "completed", "deferred"];
  if (!statuses.includes(body.status)) throw problem("Choose a valid outcome status");
  const note = String(body.note || "").trim().slice(0, 2000);
  if (!note) throw problem("Add a public update explaining the build outcome");
  let link = null;
  if (body.link) {
    try { const url = new URL(body.link); if (url.protocol !== "https:") throw new Error(); link = url.href; }
    catch { throw problem("Outcome link must use HTTPS"); }
  }
  await adminDb.runTransaction(async (transaction) => {
    const poll = await transaction.get(ref);
    if (!poll.exists || !poll.data().options.some((option) => option.id === body.optionId)) throw problem("Select a candidate from this cycle");
    transaction.update(ref, { outcome: { optionId: body.optionId, status: body.status, note, link }, updatedAt: now });
    audit(transaction, admin.uid, "community_build.outcome_recorded", period.key, note, now);
  });
  return { weekId: period.key };
}

export async function readPassport(uid, { owner = false } = {}) {
  const [stamps, packs, preferences] = await Promise.all([
    adminDb.collection("passport_stamps").where("userId", "==", uid).get(),
    ownedPacks(uid).get(),
    adminDb.collection("passport_preferences").doc(uid).get(),
  ]);
  const hidden = new Set(preferences.data()?.hiddenStampIds || []);
  const earned = stamps.docs.filter((doc) => doc.data().status === "issued").map((doc) => publicStamp(doc.id, doc.data()));
  const visibleStamps = displayedPassportStamps(earned, [...hidden], { owner })
    .sort((a, b) => String(b.issuedAt).localeCompare(String(a.issuedAt)));
  return { stamps: visibleStamps, contributions: packs.docs.filter((doc) => officiallyPublishedPack(doc.data())).map((doc) => ({ id: doc.id, title: doc.data().title || "GO asset pack" })) };
}

export async function readVisiblePassport(uid, visibility) {
  return visiblePassport(readPassport, uid, visibility);
}

export async function awardAssetPackStamp(packId) {
  const packRef = adminDb.collection("asset_packs").doc(packId);
  return adminDb.runTransaction(async (transaction) => {
    const pack = await transaction.get(packRef);
    if (!pack.exists || !officiallyPublishedPack(pack.data())) return false;
    const data = pack.data();
    const [member, existing] = await Promise.all([transaction.get(adminDb.collection("users").doc(data.contributorId)), transaction.get(adminDb.collection("passport_stamps").doc(stampId(data.contributorId, "asset_pack", packId)))]);
    const now = new Date();
    if (!member.exists || existing.exists) return false;
    transaction.create(adminDb.collection("passport_stamps").doc(stampId(data.contributorId, "asset_pack", packId)), { userId: data.contributorId, kind: "asset_pack", sourceId: packId, sourceTitle: data.title || "GO asset pack", title: "Official GO Asset Contributor", status: "issued", issuedAt: now, issuedBy: data.lastReviewedBy, spritePath: null });
    return true;
  });
}

export async function reconcileAssetStamps(uid) {
  const member = await adminDb.collection("users").doc(uid).get();
  if (!member.exists) throw problem("Account not found", 404);
  const packs = await ownedPacks(uid).get();
  let awarded = 0;
  for (const pack of packs.docs.filter((doc) => officiallyPublishedPack(doc.data()))) if (await awardAssetPackStamp(pack.id)) awarded++;
  return { awarded };
}

export async function managePassportStamp(admin, body) {
  const reason = String(body.reason || "").trim().slice(0, 2000);
  if (!reason) throw problem("An internal verification or correction note is required");
  if (body.action === "revoke") {
    if (!/^[a-f0-9]{64}$/.test(body.stampId || "")) throw problem("Choose an issued stamp");
    const ref = adminDb.collection("passport_stamps").doc(body.stampId);
    await adminDb.runTransaction(async (transaction) => {
      const stamp = await transaction.get(ref);
      if (!stamp.exists) throw problem("Stamp not found", 404);
      transaction.update(ref, { status: "revoked", revokedAt: new Date(), revokedBy: admin.uid });
      audit(transaction, admin.uid, "passport_stamp.revoked", ref.id, reason, new Date());
    });
    return { revoked: true };
  }
  if (body.action !== "issue") throw problem("Unsupported stamp action");
  const uid = String(body.userId || "").trim();
  const sourceId = String(body.sourceId || "").trim();
  const sourceTitle = String(body.sourceTitle || "").trim().slice(0, 160);
  const kind = ["event", "lan_party"].includes(body.kind) ? body.kind : null;
  if (!uid || uid.includes("/") || !/^[a-zA-Z0-9_-]{3,180}$/.test(sourceId) || !sourceTitle || !kind) throw problem("Recipient, event ID, event title and stamp type are required");
  if (body.spritePath && !spritePath(body.spritePath)) throw problem("Artwork must be a local PNG under /stamps/");
  const id = stampId(uid, kind, sourceId);
  await adminDb.runTransaction(async (transaction) => {
    const [member, previous] = await Promise.all([transaction.get(adminDb.collection("users").doc(uid)), transaction.get(adminDb.collection("passport_stamps").doc(id))]);
    const now = new Date();
    if (!member.exists || !active(member.data(), now)) throw problem("Official stamps can only be issued to active GO members", 403);
    if (previous.exists) throw problem("This event stamp already exists; resolve its existing record", 409);
    transaction.create(adminDb.collection("passport_stamps").doc(id), { userId: uid, kind, sourceId, sourceTitle, title: kind === "lan_party" ? "GO LAN Party" : "GO Event Participant", status: "issued", issuedAt: now, issuedBy: admin.uid, spritePath: spritePath(body.spritePath) });
    audit(transaction, admin.uid, "passport_stamp.issued", id, reason, now);
  });
  return { id };
}
