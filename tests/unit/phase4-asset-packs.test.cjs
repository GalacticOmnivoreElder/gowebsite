const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const assetPacks = loadSourceModule(
  "src/lib/asset-packs.js",
  [
    "ASSET_PACK_LICENSES",
    "ACTIVE_ASSET_PACK_VERSION_STATUSES",
    "cleanAssetPackVersion",
    "hasAssetPackAccess",
    "serializeAssetPackVersion",
    "toPublicAssetPackDto",
  ],
  {
    stripImports: true,
    sandbox: {
      hasCommunityContentAccess: (data, options = {}) => options.admin === true || (data.activeMember === true && ["member", "company"].includes(data.membershipTier)),
    },
  }
);

function submission(overrides = {}) {
  return {
    title: "Low-poly workshop kit",
    description: "Modular props for game prototypes.",
    contributorProfile: "Independent environment artist.",
    previewImage: "https://images.example/preview.png",
    downloadUrl: "https://drive.google.com/file/d/example/view",
    fileManifest: ["models/bench.glb", "textures/bench.png"],
    compatibility: ["Godot 4", "Unity 2022"],
    version: "1.0.0",
    license: "CC BY",
    attributionRequirements: "Credit Example Artist",
    commercialUseAllowed: true,
    dependencies: [],
    rightsDeclared: true,
    manifestDeclaredComplete: true,
    safeFilesDeclared: true,
    ...overrides,
  };
}

test("asset-pack submissions require an approved license, preview, Drive URL, manifest, and declarations", () => {
  assert.deepEqual(Array.from(assetPacks.ASSET_PACK_LICENSES), ["CC0", "CC BY", "CC BY-SA", "MIT", "Other"]);
  const clean = assetPacks.cleanAssetPackVersion(submission(), { requireSubmission: true });
  assert.equal(clean.downloadUrl, "https://drive.google.com/file/d/example/view");
  assert.equal(clean.fileManifest.length, 2);
  assert.throws(() => assetPacks.cleanAssetPackVersion(submission({ downloadUrl: "https://example.com/pack.zip" }), { requireSubmission: true }), /Google Drive HTTPS URL/);
  assert.throws(() => assetPacks.cleanAssetPackVersion(submission({ rightsDeclared: false }), { requireSubmission: true }), /contributor declarations/);
  assert.throws(() => assetPacks.cleanAssetPackVersion(submission({ license: "Proprietary-ish" }), { requireSubmission: true }), /license/);
});

test("asset-pack version creation treats every pre-publication state as an active pending version", () => {
  assert.deepEqual(Array.from(assetPacks.ACTIVE_ASSET_PACK_VERSION_STATUSES), ["draft", "submitted", "changes_requested", "approved"]);
});

test("public asset-pack records and version serialization never expose protected downloads", () => {
  const data = { ...submission(), status: "published", currentVersionId: "version-1", accessType: "public", publishedAt: new Date("2026-08-03T12:00:00Z") };
  const publicDto = assetPacks.toPublicAssetPackDto("pack-1", data);
  const versionDto = assetPacks.serializeAssetPackVersion("version-1", data);
  assert.doesNotMatch(JSON.stringify(publicDto), /drive\.google|downloadUrl/);
  assert.doesNotMatch(JSON.stringify(versionDto), /drive\.google|downloadUrl/);
  assert.equal(versionDto.hasDownloadUrl, true);
  assert.equal(versionDto.publishedAt, "2026-08-03T12:00:00.000Z");
});

test("asset-pack entitlements support public, Community, Business, individual, and admin access", () => {
  const base = { status: "published", currentVersionId: "version-1" };
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "public" }, null), true);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "community" }, { uid: "free", userData: {} }), false);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "community" }, { uid: "member", userData: { activeMember: true, membershipTier: "member" } }), true);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "community" }, { uid: "business", userData: { activeMember: true, membershipTier: "company" } }), true);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "individual" }, { uid: "user", userData: {} }, { individuallyGranted: true }), true);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, accessType: "individual" }, { uid: "admin", admin: true, userData: {} }), true);
  assert.equal(assetPacks.hasAssetPackAccess({ ...base, status: "removed", accessType: "public" }, null), false);
});

test("asset-pack publication protects destinations and retains the current version until explicit publication", () => {
  const openRoute = fs.readFileSync("src/app/asset-packs/[packId]/open/route.js", "utf8");
  const adminRoute = fs.readFileSync("src/app/api/admin/asset-packs/route.js", "utf8");
  const contributorRoute = fs.readFileSync("src/app/api/asset-packs/route.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");

  assert.match(openRoute, /protected_link_tickets/);
  assert.match(openRoute, /consumedAt/);
  assert.match(openRoute, /currentVersionId !== data\.versionId/);
  assert.match(openRoute, /Referrer-Policy.*no-referrer/s);
  assert.doesNotMatch(openRoute, /Response\.json\(\{[^}]*downloadUrl/s);
  assert.match(adminRoute, /const hasPublishedVersion = !!packDoc\.data\(\)\.currentVersionId/);
  assert.match(adminRoute, /if \(action === "publish"\)[\s\S]*currentVersionId: versionRef\.id/);
  assert.match(contributorRoute, /pendingVersionId/);
  for (const collection of ["asset_packs", "asset_pack_versions", "asset_pack_grants"]) assert.match(rules, new RegExp(`match /${collection}/\\{doc\\}\\s+\\{ allow read, write: if false; \\}`));
});

test("legacy-resource review is explicit, filterable, audited, and does not touch the April 2025 record", () => {
  const route = fs.readFileSync("src/app/api/admin/resources-review/route.js", "utf8");
  const page = fs.readFileSync("src/app/admin/resources-review/page.js", "utf8");
  const docs = fs.readFileSync("docs/go-product-placeholders.md", "utf8");
  const env = fs.readFileSync(".env.example", "utf8");
  for (const filter of ["title", "date", "status", "contributor", "id"]) assert.match(route, new RegExp(filter, "i"));
  for (const checklist of ["files", "contributorRights", "license", "compatibility", "previewImage", "downloadUrl", "entitlement", "supportStatus"]) assert.match(route, new RegExp(checklist));
  assert.match(route, /resource\.marked_legacy/);
  assert.match(page, /Mark Legacy/);
  assert.match(env, /^APRIL_2025_RESOURCE_ID=$/m);
  assert.match(docs, /April 2025 resource remains unchanged/);
  assert.doesNotMatch(route, /APRIL_2025_RESOURCE_ID|April 2025/i);
});
