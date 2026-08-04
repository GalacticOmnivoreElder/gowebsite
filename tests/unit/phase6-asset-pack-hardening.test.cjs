const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");

test("contributors need an active Community benefit and can mutate only their current pending version", () => {
  const route = read("src/app/api/asset-packs/route.js");
  const workspace = read("src/components/asset-packs/AssetPackWorkspace.jsx");

  assert.match(route, /canSubmit: hasCommunityContentAccess/);
  assert.match(route, /Active Community or Business membership is required/);
  assert.match(route, /runTransaction/);
  assert.match(route, /ACTIVE_ASSET_PACK_VERSION_STATUSES\.includes/);
  assert.match(route, /packDoc\.data\(\)\.contributorId !== user\.uid/);
  assert.match(route, /packDoc\.data\(\)\.pendingVersionId !== versionDoc\.id/);
  assert.match(workspace, /!data\.canSubmit/);
  assert.match(workspace, /data\.canSubmit && \["draft", "changes_requested"\]/);
});

test("asset-pack administration supports independently audited access, review, publication, and status changes", () => {
  const route = read("src/app/api/admin/asset-packs/route.js");
  const page = read("src/app/admin/asset-packs/page.js");

  for (const field of ["actorId", "action", "target", "previousValue", "newValue", "reason", "createdAt"]) assert.match(route, new RegExp(field));
  for (const action of ["grant_access", "set_access_type", "set_pack_status", "request_changes", "approve", "publish"]) assert.match(route, new RegExp(`action === "${action}"`));
  assert.match(route, /pendingVersionId !== versionRef\.id/);
  assert.match(route, /An approval reason is required/);
  assert.match(route, /A publication reason is required/);
  assert.match(page, /Revoke/);
  assert.match(page, /Restore/);
  assert.match(page, /Reason required for approval or publication/);
});

test("Legacy publication requires a cleared complete checklist and records a reasoned before-and-after audit", () => {
  const route = read("src/app/api/admin/resources-review/route.js");
  const page = read("src/app/admin/resources-review/page.js");
  const env = read(".env.example");

  assert.match(route, /A reason is required for resource review changes/);
  assert.match(route, /resultingState !== "cleared"/);
  assert.match(route, /CHECKLIST_KEYS\.every/);
  for (const field of ["actorId", "action", "target", "previousValue", "newValue", "reason", "createdAt"]) assert.match(route, new RegExp(field));
  assert.match(page, /readyForLegacy/);
  assert.match(page, /disabled=\{busy \|\| !readyForLegacy\}/);
  assert.match(env, /^APRIL_2025_RESOURCE_ID=$/m);
  assert.doesNotMatch(route, /APRIL_2025_RESOURCE_ID|April 2025/i);
});

test("asset-pack access failures lead to sign-in or Membership without exposing protected destinations", () => {
  const directory = read("src/components/asset-packs/AssetPackDirectory.jsx");
  const openRoute = read("src/app/asset-packs/[packId]/open/route.js");
  const publicRoute = read("src/app/api/asset-packs/route.js");

  assert.match(directory, /login\?redirect=/);
  assert.match(directory, /window\.location\.assign\("\/membership"\)/);
  assert.match(openRoute, /hasAssetPackAccess/);
  assert.match(openRoute, /currentVersionId !== data\.versionId/);
  assert.match(openRoute, /Referrer-Policy.*no-referrer/s);
  assert.doesNotMatch(publicRoute.match(/const publicPacks[\s\S]*?if \(!user\)/)?.[0] || "", /downloadUrl/);
});

test("final product presentation includes approved asset packs without overstating launch readiness", () => {
  const home = read("src/app/(main)/page.js");
  const membership = read("src/app/membership/page.js");
  const assetPage = read("src/app/asset-packs/page.js");

  assert.match(home, /approved community asset packs/i);
  assert.match(membership, /approved asset packs/i);
  assert.match(membership, /Contribute asset packs when community submissions are enabled/);
  assert.match(assetPage, /Coming Soon/);
});

test("sensitive controls from every phase retain complete administrator audit fields", () => {
  const sources = [
    read("src/app/api/admin/users/route.js"),
    read("src/app/api/admin/training-assignments/route.js"),
    read("src/app/api/admin/learning-items/route.js"),
    read("src/app/api/learning-items/[slug]/participants/route.js"),
    read("src/lib/mentorship-feedback-service.js"),
  ];

  for (const source of sources) {
    for (const field of ["actorId", "action", "target", "previousValue", "newValue", "reason", "createdAt"]) assert.match(source, new RegExp(field));
  }
  assert.match(sources[0], /account\.entitlement_override_updated/);
  assert.match(sources[0], /mentor\.account_controls_updated/);
  assert.match(sources[2], /learning_item\.saved/);
  assert.match(sources[3], /learning_enrollment\.attendance_or_completion_updated/);
  assert.match(sources[4], /feedback\.moderated_/);
});
