const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const dashboardPageSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/dashboard/page.js"),
  "utf8"
);

test("legacy /dashboard permanently redirects to /profile", () => {
  assert.match(
    dashboardPageSource,
    /import \{ permanentRedirect \} from "next\/navigation"/
  );
  assert.match(dashboardPageSource, /permanentRedirect\("\/profile"\)/);
  assert.doesNotMatch(dashboardPageSource, /MemberDashboard|router\.push/);
});
