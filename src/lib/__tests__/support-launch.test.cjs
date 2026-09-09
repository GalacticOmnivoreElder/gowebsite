const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");

test("support requests are GO-owned and require server-side membership", () => {
  const service = fs.readFileSync("src/lib/support-tickets.js", "utf8");
  const route = fs.readFileSync("src/app/api/support/route.js", "utf8");
  assert.match(service, /if \(!user\?\.activeMember\)/);
  assert.match(service, /support_requests/);
  assert.match(service, /support_request_messages/);
  assert.match(service, /support_audit_events/);
  assert.ok(route.indexOf("createSupportRequest") < route.indexOf("syncSupportRequestToJira"));
});

test("Jira is an optional retry-safe adapter", () => {
  const jira = fs.readFileSync("src/lib/jira-support.js", "utf8");
  assert.match(jira, /isJiraSupportConfigured/);
  assert.match(jira, /jiraLastSyncedVersion/);
  assert.match(jira, /GO_SYNC_VERSION/);
  assert.match(jira, /timingSafeEqual/);
});

test("support is available in profile and administration", () => {
  const tabs = fs.readFileSync("src/components/profile/ProfileSectionTabs.jsx", "utf8");
  const profile = fs.readFileSync("src/app/(main)/profile/page.js", "utf8");
  const admin = fs.readFileSync("src/components/admin/Sidebar.jsx", "utf8");
  assert.match(tabs, /value: "support"/);
  assert.match(profile, /<SupportWorkspace/);
  assert.match(admin, /href: "\/admin\/support"/);
});
