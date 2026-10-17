import test from "node:test";
import assert from "node:assert/strict";
import { currentBuildPeriod, periodForKey, officiallyPublishedPack, votingEligibility, cleanCandidates, publicStamp, spritePath, visiblePassport } from "../src/lib/monday-builds.mjs";

test("Monday voting closes at 07:00 and the next single allowance opens at 08:00 Warsaw time", () => {
  const before = currentBuildPeriod("2026-10-19T04:59:59Z");
  assert.equal(before.votingOpen, true);
  const build = currentBuildPeriod("2026-10-19T05:00:00Z");
  assert.equal(build.votingOpen, false);
  assert.equal(build.inBuildSession, true);
  assert.equal(build.key, "2026-10-12");
  const next = currentBuildPeriod("2026-10-19T06:00:00Z");
  assert.equal(next.votingOpen, true);
  assert.equal(next.key, "2026-10-19");
  assert.equal(next.closesAt, "2026-10-26T06:00:00.000Z");
});
test("weekly cutoffs follow Warsaw daylight-saving changes", () => {
  assert.equal(periodForKey("2026-03-23").closesAt, "2026-03-30T05:00:00.000Z");
  assert.equal(periodForKey("2026-10-19").closesAt, "2026-10-26T06:00:00.000Z");
  assert.throws(() => periodForKey("2026-10-20"));
  assert.throws(() => periodForKey("2026-02-30"));
});
test("membership alone or an unreviewed asset pack never unlocks voting", () => {
  const pack = { status: "published", currentVersionId: "version", lastReviewedBy: "staff", publishedAt: new Date() };
  assert.equal(officiallyPublishedPack(pack), true);
  assert.equal(votingEligibility(false, [pack]).eligible, false);
  assert.equal(votingEligibility(true, []).eligible, false);
  assert.equal(votingEligibility(true, [{ ...pack, status: "approved" }]).eligible, false);
  assert.equal(votingEligibility(true, [{ ...pack, lastReviewedBy: null }]).eligible, false);
  assert.deepEqual(votingEligibility(true, [pack, pack]), votingEligibility(true, [pack]));
});
test("private and unpublished profiles cause no Passport read at all", async () => {
  let reads = 0;
  const read = async () => { reads++; return { stamps: ["private event"], contributions: ["private activity"] }; };
  for (const visibility of [{}, { profilePrivacy: "private" }, { hasCv: true, publicCv: false, profilePrivacy: "public" }]) {
    assert.equal(await visiblePassport(read, "member", visibility), null);
  }
  assert.equal(reads, 0);
  await visiblePassport(read, "member", { owner: true });
  await visiblePassport(read, "member", { hasCv: true, publicCv: true });
  await visiblePassport(read, "member", { profilePrivacy: "public" });
  assert.equal(reads, 3);
});
test("stamp projection omits member IDs, evidence and issuer details", () => {
  const stamp = publicStamp("id", { title: "GO LAN", kind: "lan_party", userId: "private-user", reason: "private verification", issuedBy: "staff-id", sourceId: "internal-id", issuedAt: new Date(), spritePath: "https://untrusted.test/animation.js" });
  for (const key of ["userId", "reason", "issuedBy", "sourceId"]) assert.equal(Object.hasOwn(stamp, key), false);
  assert.equal(stamp.spritePath, null);
  assert.equal(spritePath("/stamps/lan.png"), "/stamps/lan.png");
  assert.equal(spritePath("/stamps/../secret.png"), null);
});
test("build candidates have stable server IDs and cannot inject vote totals", () => {
  const result = cleanCandidates([{ title: "Feature A", id: "spoofed", votes: 999 }, { title: "Feature B" }]);
  assert.equal(result[0].id, "option-1");
  assert.equal(result[0].votes, 0);
  assert.throws(() => cleanCandidates([{ title: "Same" }, { title: "same" }]));
});
