import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "D:/DOWNLOADS/Website Test Suite (1).xlsx";
const repoRoot = "G:/GO Website/gowebsite";
const outputDir = "G:/GO Website/gowebsite/outputs/019fc4c9-f3c2-75b2-9026-b2eb036eca8c";
const outputPath = path.join(outputDir, "Website Test Suite V1.8.xlsx");
const previewDir = path.join(outputDir, "final-previews");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
workbook.comments.setSelf({ displayName: "User" });

const sourceSheets = workbook.worksheets.items.map((sheet) => sheet.name);
const requiredSourceSheets = ["V 1.7 TEST", "Known Issues", "QA Template", "Accounts", "V 1.6 TEST", "V 1.5 TEST"];
for (const name of requiredSourceSheets) {
  if (!sourceSheets.includes(name)) throw new Error(`Required source sheet missing: ${name}`);
}

const v17Source = workbook.worksheets.getItem("V 1.7 TEST").getRange("A1:N101").values;
const v17Ids = v17Source.slice(1).map((row) => String(row[1] || "")).filter(Boolean);
if (v17Ids.length !== 100 || v17Ids[0] !== "GO-MAN-001" || v17Ids.at(-1) !== "GO-MAN-100") {
  throw new Error("V 1.7 TEST does not contain the expected GO-MAN-001 through GO-MAN-100 sequence");
}

const manualHeaders = ["Status", "Test ID", "Suite", "Steps", "Expected Result", "Feature", "Priority", "Persona", "Preconditions", "Actual Result", "Notes", "Evidence Link", "Run Date"];
const preservedManualRows = v17Source.slice(1).map((row) => [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[10], row[11], row[12], row[13]]);

const existingAliases = new Map([
  ["Desktop navigation", "GO-MAN-002"],
  ["Mobile navigation", "GO-MAN-003"],
  ["Browser back and forward behavior", "GO-MAN-021"],
]);

const publicationCases = [
  ...["draft", "submitted", "changes requested", "approved but unpublished", "published", "legacy", "archived", "removed"].map((status) => `Resources - ${status}`),
  ...["draft", "submitted", "changes requested", "approved but unpublished", "published", "legacy", "archived", "removed"].map((status) => `Asset packs - ${status}`),
  ...["draft", "published", "archived", "unavailable"].map((status) => `Video bundles - ${status}`),
  ...["draft", "enrollment open", "enrollment closed", "full", "waitlist available", "in progress", "completed", "canceled", "archived"].map((status) => `Courses and workshops - ${status}`),
  ...["applicant", "approved and public", "approved but public profile disabled", "temporarily unavailable", "suspended", "inactive", "rejected"].map((status) => `Mentors - ${status}`),
];

const manualSpecs = [
  {
    suite: "Product Navigation",
    route: "/, /projects, /project/create, /matchmaking, /mentors, /education, /video-bundles, /resources, /membership",
    persona: "Visitor",
    preconditions: "Staging site is running with a known feature-flag matrix.",
    scenarios: [
      "Projects remain a primary navigation destination", "Matchmaking landing page", "Find a Project route", "Create a Project route", "Find a Mentor route", "Learn route", "Video Bundles route", "Community Resources route", "Membership route", "Desktop navigation", "Mobile navigation", "Active navigation state", "Browser back and forward behavior", "Direct URL navigation", "Empty product sections", "Hidden feature-flagged navigation items", "Homepage product-priority order", "Product-card links", "Responsive product cards", "Card hover keyboard focus and touch behavior", "No placeholder values appearing publicly",
    ],
  },
  {
    suite: "Membership",
    route: "/membership and one protected Community route",
    persona: "Visitor or configured member",
    preconditions: "Staging accounts cover free, Community, Business, mentor, canceled, past_due, and expired states.",
    scenarios: [
      "Four-category distinction", "Public or Free category", "Community benefits", "Business inherits Community benefits", "Business retains project-creation permissions", "Mentor Programme shows Coming Soon", "No invented Mentor price", "Disabled Mentor checkout", "Coming Soon button sends no checkout request", "Mentor application link separate from checkout", "Missing mentor application URL", "Mentor applications closed", "External application-link indicator", "Sign-in required before mentor application", "Active Community subscription", "Active Business subscription", "Scheduled cancellation retains access until period end", "Past_due Community grace-period behavior", "Expired Community entitlement", "Mentor suspension overrides mentor access", "Membership mobile layout and accessibility",
    ],
  },
  {
    suite: "Protected Links",
    route: "/resources, /video-bundles, /asset-packs and their protected open routes",
    persona: "Visitor or configured entitlement account",
    preconditions: "Synthetic published, unpublished, individually granted, and missing-destination records exist in staging.",
    scenarios: [
      "Signed-out protected resource view", "Free-user protected resource view", "Entitled Community user", "Entitled Business user", "Expired entitlement", "Canceled subscription before period end", "Canceled subscription after period end", "Past_due Community user", "Individually granted access", "Unpublished resource", "Missing destination link", "Direct protected-open route access", "Browser page source contains no protected URL", "Browser network response contains no protected URL", "React or page-data payload contains no protected URL", "Metadata and link previews contain no protected URL", "Locked-content UI", "Sign-in return flow", "Upgrade action", "Successful authorized redirect",
    ],
  },
  {
    suite: "Publication States",
    route: "Public listing/detail routes for resources, asset packs, video bundles, learning items, and mentors",
    persona: "Visitor",
    preconditions: "One synthetic record exists for every named status; public caches are cleared.",
    scenarios: publicationCases,
  },
  {
    suite: "Learning",
    route: "/education, /education/[slug], participant management, and enrollment APIs",
    persona: "Visitor, learner, instructor, or administrator",
    preconditions: "Synthetic courses cover free, Community, invitation, approval, capacity, waitlist, canceled, and completed states.",
    scenarios: [
      "Public course listing", "Course detail page", "Course visual layout", "Enrollment-open state", "Enrollment-closed state", "Full state", "Waitlist state", "Canceled state", "Completed state", "Course prerequisites", "Capacity display", "Remaining-place display", "Enrollment opening and closing dates", "Time-zone presentation", "Desktop enrollment form", "Mobile enrollment form", "Enrollment keyboard navigation", "Enrollment validation", "Enrollment loading state", "Enrollment success state", "Enrollment error state", "Automatic signed-in enrollment", "Approval-required enrollment", "Free course enrollment", "Community-only course access", "Business access to Community course", "Invitation-only course", "Administrator-approved course", "Duplicate enrollment prevention", "Enrollment dashboard entry", "Confirmation email", "Confirmation notification", "Signed-out Enroll action", "Sign-in redirect", "Registration redirect", "Secure return URL", "Return to exact course", "Enrollment resumes after sign-in", "Previously entered course information preserved", "Malicious external return URL rejected", "Final course place", "Two users attempt final place", "Capacity never negative", "Waitlist entry", "Enrollment cancellation", "Automatic waitlist promotion", "48-hour confirmation period", "Promotion expiry", "Next-person promotion", "Promotion notification and email", "Organizer cancellation", "Administrator participant list", "Assigned instructor participant list", "Unrelated instructor denied", "Participant filters", "Attendance update", "Did-not-attend state", "Completion update", "Participant self-cancellation", "Cancellation deadline", "Accessibility-information privacy", "No participant email exposure",
    ],
  },
  {
    suite: "Notifications",
    route: "/profile notification center and /api/notifications; learning participant announcements",
    persona: "Signed-in user, instructor, or administrator",
    preconditions: "Notifications are enabled and synthetic recipients/enrollments exist.",
    scenarios: [
      "Notification center", "Unread count", "Mark one notification as read", "Mark multiple notifications as read where supported", "Notification action links", "Course enrollment notification", "Course update notification", "Waitlist promotion notification", "Course cancellation notification", "Mentor request notification", "Mentor response notification", "Mentorship scheduling notification", "Free training assignment notification", "Notification ownership", "User cannot view another user's notifications", "Failed email retains platform notification", "Administrator course announcement", "Assigned instructor announcement", "Unrelated instructor announcement denied", "Confirmed-recipient group", "Waiting-list-recipient group", "Selected participants group", "Attendance group", "Completion group", "Canceled users excluded from unrelated announcements", "Mobile notification center", "Notification keyboard usability", "Notification screen-reader labels",
    ],
  },
  {
    suite: "Video Bundles",
    route: "/video-bundles and /video-bundles/[slug]",
    persona: "Visitor, member, Business user, or assigned mentor",
    preconditions: "Synthetic bundles cover published, archived, one-link, multi-lesson, assigned, and missing-link states.",
    scenarios: [
      "Bundle listing", "Empty bundle state", "Bundle detail page", "Published-only bundle visibility", "Community bundle access", "Business bundle access", "Free-user locked bundle", "Signed-out locked bundle", "Approved mentor with assigned bundle", "Approved mentor without bundle access", "Expired subscription bundle access", "Protected YouTube link", "Protected Google Drive link", "One-link bundle", "Multi-lesson bundle", "Lesson ordering", "Open bundle tracking", "Open lesson tracking", "Manual lesson completion", "Completion percentage", "Manual bundle completion", "External-link warning", "Missing external link", "Archived bundle", "Video-bundle mobile layout", "Video-bundle keyboard navigation", "No playback-time tracking requirement",
    ],
  },
  {
    suite: "Mentor Programme",
    route: "/membership, mentor application open route, and administrator user controls",
    persona: "Visitor, mentor applicant, approved mentor, or administrator",
    preconditions: "Mentor configuration is exercised with URL present/absent and site-setting open/closed combinations.",
    scenarios: [
      "Mentor Programme Coming Soon card", "Mentor checkout disabled", "No Mentor price shown", "Mentor application URL configured", "Mentor application URL missing", "Mentor applications open", "Mentor applications closed", "Sign-in before external mentor application", "External Jira form opens", "External link hides internal Jira information", "Mentor applicant status", "Mentor approved status", "Mentor temporarily unavailable status", "Mentor suspended status", "Mentor inactive status", "Mentor rejected status", "Administrator mentor status changes", "Unauthorized mentor status changes", "Mentor status audit history",
    ],
  },
  {
    suite: "Mentor Directory",
    route: "/mentors, /mentors/[mentorId], and mentor profile editor",
    persona: "Visitor or approved mentor",
    preconditions: "Synthetic mentor accounts cover every status and public-visibility combination.",
    scenarios: [
      "Approved public mentor", "Approved private mentor", "Temporarily unavailable mentor", "Suspended mentor hidden", "Inactive mentor hidden", "Rejected applicant hidden", "Mentor profile creation", "Mentor profile editing", "Mentor required fields", "Invalid mentor portfolio URL", "Selected portfolio visibility", "Private mentor email protected", "Mentor telephone protected", "Mentor CV protected", "Mentor internal notes protected", "Public mentor directory filtering", "Discipline filter", "Skill filter", "Supported-level filter", "Language filter", "Mentorship-format filter", "Accepting-students filter", "Empty mentor directory", "Mentor directory hidden from major navigation when empty", "Mobile mentor cards", "Responsive mentor profile", "Mentor keyboard navigation", "Mentor focus state", "Mentor contrast", "General availability labels",
    ],
  },
  {
    suite: "Mentor Availability & Training",
    route: "Mentor availability editor, public mentor profile, admin training assignments, and user dashboard",
    persona: "Approved mentor, visitor, or administrator",
    preconditions: "An approved mentor and assignable synthetic course, workshop, and video bundle exist.",
    scenarios: [
      "Recurring mentor availability", "Individual mentor dates", "Mentor time-zone conversion", "Online mentorship format", "GOHQ mentorship format", "Hybrid mentorship format", "Group mentoring", "Individual mentoring", "Mentor capacity", "Mentor temporary pause", "Exact schedule hidden from public users", "General public availability label", "Unavailable mentor excluded from matchmaking", "Administrator free-course assignment", "Administrator free-workshop assignment", "Administrator free-video assignment", "Training assignment reason", "Training assignment expiry", "Training assignment revocation", "Assigned preparation in dashboard", "Training access independent of Polar", "No access to unrelated training content",
    ],
  },
  {
    suite: "Mentor Matchmaking",
    route: "/matchmaking and mentorship request/suggestion/response APIs",
    persona: "Community learner, Business learner, mentor, or administrator",
    preconditions: "Matchmaking is enabled in staging with compatible, incompatible, unavailable, suspended, and full-capacity mentors.",
    scenarios: [
      "Community matchmaking eligibility", "Business matchmaking eligibility", "Free user blocked from matchmaking", "Under-18 user blocked from self-service matching", "Mentorship request form", "Mentorship request validation", "Learning objective", "Discipline selection", "Skill-level selection", "Preferred language", "Preferred format", "General availability", "Expected duration", "Optional portfolio link", "Optional request note", "Compatible mentor suggestions", "Suspended mentor excluded", "Unavailable mentor excluded", "Full-capacity mentor excluded", "Incorrect discipline excluded", "One pending mentorship request limit", "Mentorship request withdrawal", "Student selects mentor", "Request GO assistance", "Mentor accepts request", "Mentor declines request", "Mentor requests clarification", "Five-working-day response expiry", "Matchmaking notifications", "One active engagement limit", "Administrator mentorship override", "Student dashboard status", "Mentor dashboard status", "Mentorship direct URL authorization", "Mentorship cross-account protection",
    ],
  },
  {
    suite: "Mentorship Lifecycle",
    route: "Mentorship engagement scheduling, lifecycle, dashboard, and concern routes",
    persona: "Mentorship participant, unrelated user, or administrator",
    preconditions: "A synthetic accepted engagement exists with separate student, mentor, unrelated, and admin accounts.",
    scenarios: [
      "Mentor proposes time windows", "Student confirms a time", "Mentorship time-zone display", "Agreed session in both dashboards", "Private meeting URL", "Unauthorized meeting-link access", "Mentorship rescheduling where supported", "Scheduled mentorship state", "Attended mentorship state", "Missed mentorship state", "Active mentorship state", "Completed mentorship state", "Canceled mentorship state", "Participant mentorship cancellation", "Mentorship concern report", "Concern report private from other participant", "Administrator receives concern report", "Unrelated user cannot report against engagement",
    ],
  },
  {
    suite: "Mentorship Feedback",
    route: "Mentorship feedback APIs, participant dashboard, admin moderation, and public mentor references",
    persona: "Completed-engagement participant, administrator, or visitor",
    preconditions: "Synthetic completed engagements cover deadlines, duplicate authors, consent, reports, disputes, and moderation states.",
    scenarios: [
      "Feedback only after completed engagement", "Student-to-mentor feedback", "Mentor-to-student feedback", "One feedback submission per participant per engagement", "14-day feedback deadline", "Duplicate feedback blocked", "Private written feedback", "Participants cannot see each other's private written feedback", "Report feedback", "Feedback moderation", "Feedback dispute", "Feedback correction or appeal", "Disputed feedback excluded", "Public threshold of three distinct students", "Fewer than three reviews shows no aggregate", "Exactly three eligible reviews", "Duplicate student does not inflate threshold", "Public descriptive strengths", "No feedback stars", "No numerical feedback average", "No mentor rankings", "No public feedback comments", "No reviewer identities", "Private student reputation", "User-controlled sharing of selected strengths", "Feedback presentation not color-only",
    ],
  },
  {
    suite: "Asset Packs",
    route: "/asset-packs, contributor workspace, protected open route, admin review, and Legacy review",
    persona: "Community member, Business member, free user, or administrator",
    preconditions: "Asset submissions are enabled in staging and synthetic packs cover all workflow/access states.",
    scenarios: [
      "Community member asset submission", "Business member asset submission", "Free user asset submission blocked", "Asset draft", "Asset submitted", "Asset changes requested", "Asset approved", "Asset published", "Asset legacy", "Asset archived", "Asset removed", "Asset preview image required", "Asset file manifest required", "Asset compatibility fields", "Asset license selection", "Asset attribution", "Asset commercial-use status", "Asset Google Drive link", "Administrator asset approval", "Unrelated user asset approval denied", "New asset version submission", "Existing asset version remains active until update approval", "Public pack access", "Community pack access", "Business inherited pack access", "Individual asset grant", "Protected asset download redirect", "Missing asset download URL", "Visible Legacy label", "Legacy admin review checklist", "April 2025 resource unchanged without ID",
    ],
  },
  {
    suite: "Visual & Accessibility",
    route: "All new public, member, and administrator product surfaces",
    persona: "Visitor, keyboard user, screen-reader user, or administrator",
    preconditions: "Use staging data for populated, empty, locked, loading, error, and confirmation states; reduced motion available.",
    scenarios: [
      "390px mobile viewport", "Tablet viewport", "Normal desktop viewport", "Wide desktop viewport", "Browser zoom at 200 percent", "Long text", "Empty states", "Locked states", "Loading states for new products", "Error states for new products", "Confirmation dialogs", "Drawers", "Admin tables", "Product cards", "Notification center visual QA", "Mentor directory visual QA", "Course enrollment visual QA", "Video bundles visual QA", "Asset submissions visual QA", "Admin pages visual QA", "No horizontal overflow", "No overlapping content", "Visible focus", "Keyboard-only operation", "Screen-reader labels", "Form-error association", "Color contrast", "Non-color status indicators", "Reduced-motion behavior", "Touch-target size", "Dialog focus trapping", "Dialog Escape behavior", "Heading hierarchy", "Descriptive links", "External-link indication",
    ],
  },
];

function priorityFor(label) {
  const value = label.toLowerCase();
  if (/protected|private|unauthorized|denied|blocked|entitlement|approval|concurr|final place|capacity never|cross-account|suspend|admin|direct url|malicious|ownership|expired|duplicate/.test(value)) return "P0";
  if (/hover|long text|wide desktop|touch|copy|empty|responsive|visual|contrast/.test(value)) return "P2";
  return "P1";
}

function personaFor(label, fallback) {
  const value = label.toLowerCase();
  if (value.includes("administrator") || value.includes("admin ")) return "Platform Admin";
  if (value.includes("unrelated instructor")) return "Unrelated Instructor";
  if (value.includes("instructor")) return "Assigned Instructor";
  if (value.includes("business")) return "Business Member";
  if (value.includes("community")) return "Community Member";
  if (value.includes("free user")) return "Free Account";
  if (value.includes("signed-out") || value.includes("visitor")) return "Visitor";
  if (value.includes("suspended mentor")) return "Suspended Mentor";
  if (value.includes("mentor")) return "Approved Mentor";
  if (value.includes("student")) return "Community Student";
  return fallback;
}

function stepsFor(spec, label) {
  return `Using non-production data, open ${spec.route}. Prepare the state named “${label}”, perform the single relevant navigation or action, and record the visible result, resulting URL, HTTP status where applicable, and browser console/network errors.`;
}

function publicationExpected(label) {
  const [type, rawStatus] = label.split(" - ");
  const status = rawStatus.toLowerCase();
  let allowed = false;
  if (["Resources", "Asset packs"].includes(type)) allowed = ["published", "legacy"].includes(status);
  if (type === "Video bundles") allowed = status === "published";
  if (type === "Courses and workshops") allowed = ["enrollment open", "enrollment closed", "full", "waitlist available", "in progress", "completed", "canceled"].includes(status);
  if (type === "Mentors") allowed = status === "approved and public";
  return allowed
    ? `${type} in “${rawStatus}” appears in its public listing/detail response with sanitized metadata only.`
    : `${type} in “${rawStatus}” is absent from public listings and direct public lookup returns an unavailable or not-found state without private fields.`;
}

function expectedFor(spec, label) {
  const value = label.toLowerCase();
  if (spec.suite === "Publication States") return publicationExpected(label);
  if (spec.suite === "Protected Links") {
    if (/entitled community|entitled business|before period end|past_due|individually granted|successful authorized/.test(value)) return `The “${label}” flow authorizes exactly the eligible account and redirects server-side without placing the external destination in page HTML, JSON, metadata, or client props.`;
    return `The “${label}” flow exposes no external destination; the UI shows sign-in, locked, unavailable, or upgrade guidance and the server returns the documented 401, 403, 404, or 503 state.`;
  }
  if (/mobile|responsive|390px|tablet|desktop viewport|wide desktop|zoom|long text|overflow|overlapping|focus|keyboard|screen-reader|contrast|non-color|reduced-motion|touch-target|dialog|heading hierarchy|descriptive links|external-link indication|visual qa/.test(value)) return `At “${label}”, content remains readable with no clipping or horizontal overflow; focus, labels, status meaning, touch targets, and motion behavior remain perceivable and operable.`;
  if (/hidden|protected|private|cannot|denied|blocked|excluded|expired|unpublished|archived|removed|suspended|inactive|rejected|missing|no invented|no price|disabled|no functional|not expose|unchanged without id|malicious/.test(value)) return `The “${label}” restriction is enforced in both UI and direct request behavior; the protected action/value is absent and the user receives a clear non-success state.`;
  if (value.includes("empty")) return `The “${label}” state displays an explicit empty-state message and approved next action without blank or broken layout.`;
  if (value.includes("loading")) return `The “${label}” state displays progress, prevents duplicate submission, and resolves to success or a visible error.`;
  if (value.includes("error")) return `The “${label}” state presents an actionable, non-sensitive error associated with the initiating control.`;
  if (/notification|email/.test(value)) return `Exactly the intended recipient receives the “${label}” event; no participant email address is exposed and platform state persists if email delivery fails.`;
  if (/audit/.test(value)) return `The “${label}” action creates one audit entry containing actor, action, target, previous value, new value, timestamp, and reason where required.`;
  return `The “${label}” scenario reaches the named state once, shows the expected controls and confirmation, updates only the authorized record, and creates no duplicate or unrelated state.`;
}

let nextManual = 101;
const newManualRows = [];
const manualReferences = new Map();
for (const spec of manualSpecs) {
  const references = { existing: [], first: null, last: null };
  for (const label of spec.scenarios) {
    if (existingAliases.has(label)) {
      references.existing.push(existingAliases.get(label));
      continue;
    }
    const id = `GO-MAN-${String(nextManual++).padStart(3, "0")}`;
    if (!references.first) references.first = id;
    references.last = id;
    newManualRows.push([
      "Not Run", id, spec.suite, stepsFor(spec, label), expectedFor(spec, label), label,
      priorityFor(label), personaFor(label, spec.persona), `${spec.preconditions} Use synthetic records and do not change production data.`,
      "", "", "", "",
    ]);
  }
  manualReferences.set(spec.suite, references);
}
const allManualRows = [...preservedManualRows, ...newManualRows];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const testFiles = (await walk(path.join(repoRoot, "tests"))).filter((file) => /\.(test\.cjs|spec\.js)$/.test(file));
const testSources = new Map();
for (const file of testFiles) testSources.set(file, await fs.readFile(file, "utf8"));

function inferFeature(file, title) {
  const text = `${file} ${title}`.toLowerCase();
  if (/asset.pack/.test(text)) return "Asset Packs";
  if (/feedback|mentor.reference|strength/.test(text)) return "Mentorship Feedback";
  if (/mentorship|matchmaking|mentor.request|engagement/.test(text)) return "Mentor Matchmaking";
  if (/mentor|availability|training.assignment/.test(text)) return "Mentor Programme";
  if (/learning|course|workshop|waitlist|enrollment/.test(text)) return "Learning";
  if (/video.bundle/.test(text)) return "Video Bundles";
  if (/notification/.test(text)) return "Notifications";
  if (/polar|checkout|subscription|billing|membership/.test(text)) return "Membership & Polar";
  if (/resource|package/.test(text)) return "Protected Resources";
  if (/project|application/.test(text)) return "Projects";
  if (/profile|cv|onboarding|skill/.test(text)) return "Profiles & Passport";
  if (/email|newsletter|resend/.test(text)) return "Email & Newsletter";
  if (/firestore|rules/.test(text)) return "Firebase Security";
  if (/landing|about|visual|marquee|navigation|header/.test(text)) return "Product Navigation";
  return "Platform Core";
}

function inferType(file, title) {
  const text = `${file} ${title}`.toLowerCase();
  if (file.endsWith(".spec.js")) return "End-to-End";
  if (text.includes("firestore-rules")) return "Firebase";
  if (/concurrent|parallel|final place|idempotent/.test(text)) return "Concurrency";
  if (/authorization|requires auth|rejects|cannot|private|ownership|access denied|direct url/.test(text)) return "Authorization";
  if (/webhook|protected|secret|unsafe|redact|expose/.test(text)) return "Security";
  if (/email|newsletter|resend/.test(text)) return "Email";
  if (/polar|subscription|billing|checkout/.test(text)) return "Polar";
  if (/route|api/.test(text)) return "API";
  return "Unit";
}

function inferPersona(title) {
  const text = title.toLowerCase();
  if (text.includes("admin")) return "Platform Admin";
  if (text.includes("business") || text.includes("company")) return "Business Member";
  if (text.includes("member") || text.includes("community")) return "Community Member";
  if (text.includes("mentor")) return "Mentor";
  if (text.includes("anonymous") || text.includes("visitor")) return "Visitor";
  if (text.includes("user")) return "Signed-in User";
  return "System/Test Harness";
}

function sourceTargets(source, fallback) {
  const targets = [...source.matchAll(/["'`](src\/[A-Za-z0-9_./\[\]-]+)["'`]/g)].map((match) => match[1]);
  return [...new Set(targets)].slice(0, 3).join("; ") || fallback;
}

const automatedHeaders = ["Test ID", "Test Type", "Suite", "Feature", "Priority", "Persona or Auth State", "Preconditions", "Endpoint or Module", "HTTP Method or Operation", "Test Steps or Setup", "Expected Result", "Existing or New", "Suggested Test File", "Implementation Status", "Execution Command", "Notes"];
const automatedRows = [];
let nextAuto = 1;
for (const file of testFiles.sort()) {
  const source = testSources.get(file);
  const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
  const declarations = [...source.matchAll(/\btest\(\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
  for (const title of declarations) {
    const type = inferType(relative, title);
    const feature = inferFeature(relative, title);
    automatedRows.push([
      `GO-AUTO-${String(nextAuto++).padStart(3, "0")}`, type, path.basename(relative), feature,
      priorityFor(title), inferPersona(title), "Repository checkout with deterministic mocks/fixtures; no production data.",
      sourceTargets(source, relative), type === "End-to-End" ? "Browser interaction" : "Node test operation",
      `Run the named repository test “${title}” from ${relative} using the fixtures and mocks declared by that suite.`,
      `All assertions for “${title}” pass without relying on production records or exposing protected values.`,
      "Existing", relative, "Implemented", relative.includes("firestore-rules") ? "npm run test:rules" : relative.endsWith(".spec.js") ? "npm run test:visual" : `node --test ${relative}`,
      "Discovered in the repository. The workbook does not assign Pass status without a recorded execution result.",
    ]);
  }
}

const appRouteFiles = (await walk(path.join(repoRoot, "src", "app"))).filter((file) => file.endsWith(`${path.sep}route.js`));
const productRoutePattern = /\/(api\/(admin\/)?(asset-packs|resources-review|learning-items|video-bundles|mentors|mentorships|training-assignments|notifications|mentor-application|me\/mentor|me\/learning)|resources\/\[resourceId\]\/open|video-bundles\/\[slug\]\/open|asset-packs\/\[packId\]\/open)/;
for (const file of appRouteFiles.sort()) {
  const relativeFromApp = path.relative(path.join(repoRoot, "src", "app"), file).replaceAll("\\", "/").replace(/\/route\.js$/, "");
  const routePath = `/${relativeFromApp}`;
  if (!productRoutePattern.test(routePath)) continue;
  const source = await fs.readFile(file, "utf8");
  const methods = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((match) => match[1]);
  for (const method of methods) {
    const isAdmin = routePath.startsWith("/api/admin/");
    const feature = inferFeature(routePath, routePath);
    automatedRows.push([
      `GO-AUTO-${String(nextAuto++).padStart(3, "0")}`, "API", "Product API integration", feature,
      isAdmin || method !== "GET" ? "P0" : "P1", isAdmin ? "Unauthenticated, non-admin, and Platform Admin" : "Visitor and authorized product personas",
      "Local API server plus isolated Firebase emulator fixtures; feature flags explicitly set for enabled and disabled cases.",
      routePath, method,
      `Issue ${method} requests to ${routePath} with missing/invalid auth, the authorized persona, manipulated IDs where accepted, and the relevant disabled feature flag.`,
      `${routePath} returns the documented authorization/status contract, sanitizes response data, rejects manipulated ownership, and never reveals protected external URLs to unauthorized clients.`,
      "New", "tests/integration/product-api.test.cjs", "Gap - Not implemented", "node --test tests/integration/product-api.test.cjs",
      "Real route and HTTP method discovered from the current App Router source. Requires integration-level route harness coverage.",
    ]);
  }
}

const crossAutomationGaps = [
  ["End-to-End", "Product Navigation", "P0", "Visitor", "/ and all product routes", "Browser navigation", "Traverse desktop/mobile navigation, Back/Forward, direct URLs, and flagged-off routes.", "Routes, focus, and history remain correct; flagged-off destinations do not expose unfinished UI.", "tests/product-navigation.spec.js"],
  ["Integration", "Publication States", "P0", "Visitor", "Public resource, asset-pack, video-bundle, learning-item, and mentor listing/detail APIs", "Status allowlist matrix", "Seed one synthetic record for every approved and non-public status, then request every public listing and direct detail route.", "Only each product's explicit public-status allowlist is returned; drafts, archived/removed records, private mentors, and protected fields remain absent.", "tests/integration/publication-status-matrix.test.cjs"],
  ["End-to-End", "Membership & Polar", "P0", "Community and Business", "/membership and protected routes", "Browser + sandbox", "Exercise active, canceled-future, canceled-expired, past_due, and Business inherited access.", "Access matches paid-period/grace rules and Business retains project creation.", "tests/membership-entitlements.spec.js"],
  ["Security", "Protected Resources", "P0", "Visitor and Free Account", "Resource/video/asset page HTML and RSC payload", "Payload inspection", "Fetch HTML, metadata, RSC/page data, and browser network bodies for locked content.", "No Google Drive or YouTube destination appears in any unauthorized payload.", "tests/protected-payloads.spec.js"],
  ["Concurrency", "Learning", "P0", "Two Community Members", "/api/learning-items/[slug]/enrollment", "Parallel POST", "Submit two final-place enrollment requests against emulator-backed route state.", "At most one confirmed enrollment is created and capacity counters remain consistent.", "tests/integration/learning-concurrency.test.cjs"],
  ["Integration", "Learning", "P0", "Waitlisted learners", "Enrollment cancellation and promotion worker", "Timed workflow", "Cancel a confirmed enrollment, expire the first 48-hour offer, and run promotion again.", "The next eligible learner receives one offer/notification and counters reconcile.", "tests/integration/waitlist-lifecycle.test.cjs"],
  ["Email", "Notifications", "P0", "Signed-in learner", "Notification plus email outbox", "Failure injection", "Force email enqueue/send failure after platform notification creation.", "The platform notification remains readable and the email failure is retained for retry/diagnosis.", "tests/integration/notification-email-resilience.test.cjs"],
  ["End-to-End", "Video Bundles", "P1", "Community Member", "/video-bundles/[slug]", "Browser interaction", "Open lessons in order, mark completion, refresh, and complete the bundle.", "Progress persists, percentages are deterministic, and external playback time is not inferred.", "tests/video-bundles.spec.js"],
  ["End-to-End", "Mentor Programme", "P0", "Applicant and Approved Mentor", "/membership and mentor application flow", "Browser interaction", "Exercise configured/open, missing, closed, signed-out, approved, and suspended states.", "Only the approved/open combinations expose the intended action; suspension blocks mentor tools.", "tests/mentor-programme.spec.js"],
  ["Authorization", "Mentor Availability & Training", "P0", "Approved Mentor, unrelated mentor, and Platform Admin", "mentor availability and training-assignment APIs", "Scope and expiry matrix", "Create, update, expire, and revoke availability/training records while replaying requests as the owner, unrelated mentor, and administrator.", "Exact schedules remain private, only administrators assign training, grants are item-scoped, and expiry/revocation removes access without affecting unrelated entitlements.", "tests/integration/mentor-training-authorization.test.cjs"],
  ["Integration", "Mentor Matchmaking", "P0", "Community Student", "Mentorship request through engagement", "Lifecycle API sequence", "Create request, select mentor, clarify, accept, schedule, complete, and verify both dashboards.", "Each transition is authorized, atomic, notified, and visible only to participants/admins.", "tests/integration/mentorship-lifecycle.test.cjs"],
  ["Security", "Mentor Matchmaking", "P0", "Unrelated User", "Mentorship IDs, concerns, and meeting URLs", "ID manipulation", "Replay participant routes using an unrelated account and altered request/engagement IDs.", "Responses are 404/403 and contain no meeting link, concern detail, or participant-private data.", "tests/integration/mentorship-authorization.test.cjs"],
  ["Integration", "Mentorship Feedback", "P0", "Three distinct students", "Feedback moderation and public references", "Threshold workflow", "Create three eligible completed engagements, moderate consented references, then dispute/revoke one.", "Public references appear only while every consent/moderation/showcase gate remains eligible; no numeric aggregate is exposed.", "tests/integration/feedback-publication.test.cjs"],
  ["Concurrency", "Asset Packs", "P0", "Contributor and two Admins", "Asset pending-version and publication transactions", "Parallel mutation", "Create concurrent versions and race request-changes/approve/publish actions.", "Only one pending version is accepted and only the approved current pending version replaces publication once.", "tests/integration/asset-version-concurrency.test.cjs"],
  ["End-to-End", "Asset Packs", "P0", "Community, Business, Free, and Granted Users", "/asset-packs", "Browser interaction", "Submit, review, publish, change access type, grant/revoke individual access, and open the download.", "Every persona receives only its configured access and no raw Drive URL appears before server authorization.", "tests/asset-packs.spec.js"],
  ["Authorization", "Administration", "P0", "Non-admin", "/api/admin product routes", "Direct requests", "Call every product admin method using signed-out and non-admin tokens.", "Every request returns 401 or 403 and creates no write/audit event.", "tests/integration/admin-product-authorization.test.cjs"],
  ["Security", "Administration", "P0", "Platform Admin", "admin_audit_events", "Audit reconciliation", "Execute mentor, entitlement, learning, attendance, asset, feedback, and suspension controls.", "Each mutation has one actor/action/target/before/after/timestamp/reason audit entry.", "tests/integration/admin-audit.test.cjs"],
  ["End-to-End", "Visual & Accessibility", "P1", "Keyboard and screen-reader user", "All new product routes", "Playwright accessibility", "Run keyboard-only, focus order, label, error association, dialog trap/Escape, reduced-motion, and 200% zoom checks.", "No critical accessibility violations, hidden focus, trapped background focus, or horizontal overflow occurs.", "tests/product-accessibility.spec.js"],
  ["Polar", "Membership & Polar", "P0", "Sandbox Community Member", "Polar webhook to protected content", "Sandbox integration", "Replay active, past_due, canceled-future, canceled-expired, and revoked subscription events.", "User entitlement changes are idempotent and protected-content access matches the effective paid period.", "tests/integration/polar-entitlement.test.cjs"],
];
for (const gap of crossAutomationGaps) {
  const [type, feature, priority, persona, endpoint, operation, setup, expected, file] = gap;
  automatedRows.push([
    `GO-AUTO-${String(nextAuto++).padStart(3, "0")}`, type, "Approved product gap", feature, priority, persona,
    "Staging/local-only fixtures and the required emulator or sandbox service.", endpoint, operation, setup, expected,
    "New", file, "Gap - Not implemented", type === "End-to-End" ? `npx playwright test ${file}` : `node --test ${file}`,
    "Recommended additional coverage after comparing the approved scope with current repository tests.",
  ]);
}

const firebaseHeaders = ["Test ID", "Feature", "Rule or Collection", "Operation", "Auth State", "Preconditions", "Test Steps or Setup", "Expected Result", "Existing or New", "Suggested Test File", "Implementation Status", "Execution Command", "Environment or Blocker", "Notes"];
const firebaseRows = [];
let nextFirebase = 1;
const rulesTestFile = path.join(repoRoot, "tests", "firestore-rules.test.cjs");
const rulesTestSource = await fs.readFile(rulesTestFile, "utf8");
for (const title of [...rulesTestSource.matchAll(/\btest\(\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1])) {
  firebaseRows.push([
    `GO-FB-${String(nextFirebase++).padStart(3, "0")}`, inferFeature("firestore-rules", title), "firestore.rules", "Rule assertion", inferPersona(title),
    "Firebase Firestore emulator on demo project; Java runtime installed.", `Run the existing emulator test “${title}”.`,
    `The emulator assertions for “${title}” pass with no production project connection.`, "Existing", "tests/firestore-rules.test.cjs",
    "Implemented - blocked locally", "npm run test:rules", "Blocked: Java is not installed on the current workstation.",
    "Existing test discovered in the repository; do not mark Pass until an emulator run is recorded.",
  ]);
}

const firestoreRules = await fs.readFile(path.join(repoRoot, "firestore.rules"), "utf8");
const serverCollections = [...firestoreRules.matchAll(/match \/([A-Za-z0-9_]+)\/\{doc\}\s*\{ allow read, write: if false; \}/g)].map((match) => match[1]);
for (const collection of serverCollections) {
  const feature = inferFeature(collection, collection);
  firebaseRows.push([
    `GO-FB-${String(nextFirebase++).padStart(3, "0")}`, feature, collection, "get/list/create/update/delete", "Anonymous, member, and admin browser SDK",
    `Seed one synthetic ${collection} document with rules disabled in the emulator.`,
    `Attempt browser-SDK get, list where supported, create, update, and delete as anonymous, a regular member, and an admin claim.`,
    `Every direct browser operation on ${collection} is denied; access must pass through a server-authorized API.`,
    "New", "tests/firestore-rules.test.cjs", "Gap - parameterized collection assertion recommended", "npm run test:rules",
    "Firebase Emulator required; Java currently missing.", "Collection is explicitly server-only in firestore.rules.",
  ]);
}

const additionalFirebase = [
  ["Firebase Security", "users/{uid}", "create", "Owner", "Create safe profile fields, then repeat with admin, activeMember, membershipTier, subscription, and mentor-status fields.", "Safe create succeeds; every privileged-field create fails."],
  ["Firebase Security", "users/{uid}", "update", "Owner", "Update one safe field, then attempt each privileged field independently.", "Safe update succeeds and every privilege-escalation update fails."],
  ["Firebase Security", "users/{otherUid}", "get/update/delete", "Unrelated User", "Attempt cross-account reads and writes with a different authenticated UID.", "Every cross-account operation is denied."],
  ["Firebase Security", "users/{uid}", "get/list/update", "Platform Admin", "Use an admin claim to read/list users and update an allowed administrator-controlled field.", "The documented admin user operations succeed and unrelated server-only collections remain denied."],
  ["Firebase Security", "subscriptions/{id}", "get", "Subject User", "Read the subscription whose userId matches the authenticated UID.", "Subject read succeeds without exposing other subscriptions."],
  ["Firebase Security", "subscriptions/{id}", "get", "Unrelated User", "Read a subscription for a different userId.", "Read is denied."],
  ["Firebase Security", "subscriptions/{id}", "write", "Subject User", "Attempt update/delete on the subject subscription.", "Every member write is denied."],
  ["Firebase Security", "unknown_collection/{id}", "get/write", "Anonymous, member, admin", "Attempt operations against a collection not explicitly matched by rules.", "The default recursive deny rule rejects every operation."],
  ["Firebase Configuration", "firestore.indexes.json", "query/index smoke", "Test Harness", "Start the emulator and execute product queries that require declared indexes.", "Queries complete without missing-index errors; index definitions remain syntactically valid."],
  ["Firebase Configuration", "firebase.json", "emulator isolation", "Test Harness", "Start using the non-production emulator project ID and inspect host/port.", "No command connects to a production Firebase project; Firestore uses the configured local port."],
  ["Storage Security", "storage.rules", "all Storage operations", "All personas", "A Storage rules file and emulator configuration would be required.", "Test remains blocked; no Storage security claim is made while storage.rules is absent."],
];
for (const [feature, collection, operation, auth, setup, expected] of additionalFirebase) {
  const storage = feature === "Storage Security";
  firebaseRows.push([
    `GO-FB-${String(nextFirebase++).padStart(3, "0")}`, feature, collection, operation, auth,
    "Use a non-production emulator project and synthetic documents only.", setup, expected,
    "New", storage ? "storage.rules (not present)" : "tests/firestore-rules.test.cjs",
    storage ? "Blocked" : "Gap - Not implemented", storage ? "N/A until Storage rules exist" : "npm run test:rules",
    storage ? "Blocked: repository has no storage.rules file or Storage emulator configuration." : "Firebase Emulator required; Java currently missing.",
    storage ? "Do not invent Storage rules or claim coverage." : "Recommended explicit rule coverage.",
  ]);
}

const coverageHeaders = ["Feature Area", "Product Routes or APIs", "Manual Suite", "Automation Keyword", "Manual Test IDs", "Manual Count", "Automated Count", "Firebase Count", "Coverage Level", "Highest-Priority P0 Focus", "Required Environment", "Known Gaps or Blockers", "Notes"];
const coverageSpecs = [
  ["Product navigation and homepage", "/, /projects, /matchmaking, /education, /video-bundles, /resources, /membership", "Product Navigation", "Product Navigation", "Navigation order, routes, flags, and placeholder leakage", "Browser staging", "New cross-product Playwright coverage is not implemented."],
  ["Membership and Polar", "/membership, /api/billing/*, /api/subscription/*", "Membership", "Membership", "Entitlement expiry, grace, Business inheritance, disabled Mentor checkout", "Polar sandbox + staging accounts", "Full sandbox entitlement E2E remains a gap."],
  ["Protected external links", "/resources/[resourceId]/open, /video-bundles/[slug]/open, /asset-packs/[packId]/open", "Protected Links", "Protected Resources", "No unauthorized URL in HTML, RSC, JSON, metadata, or redirects", "Browser DevTools + staging data", "Payload-level E2E inspection remains a gap."],
  ["Strict publication states", "Public listing/detail APIs", "Publication States", "Publication States", "Only explicit status allowlists are public", "Synthetic status fixtures", "Repository unit coverage exists; full API integration matrix remains a gap."],
  ["Courses and workshops", "/education and /api/learning-items/*", "Learning", "Learning", "Capacity, concurrency, waitlist, return URL, instructor scope", "Firestore emulator + email sandbox", "Java missing; full route integration/concurrency tests are gaps."],
  ["Notifications and announcements", "/api/notifications and participant announcement route", "Notifications", "Notifications", "Ownership, recipients, action URLs, email-failure resilience", "Firestore emulator + email sandbox", "End-to-end notification center and announcement tests remain gaps."],
  ["Video bundles", "/video-bundles and protected open/progress APIs", "Video Bundles", "Video Bundles", "Published-only access and protected lesson URLs", "Staging bundle fixtures", "Browser progress and external-link E2E remains a gap."],
  ["Mentor Programme", "/membership, mentor application route, admin users", "Mentor Programme", "Mentor Programme", "Approval, suspension, external application, no checkout", "Mentor configuration matrix", "Real Jira URL intentionally unresolved."],
  ["Mentor profiles and directory", "/mentors and mentor-profile APIs", "Mentor Directory", "Mentor", "Public allowlist and private field redaction", "Synthetic mentor accounts", "Full browser filter/accessibility coverage remains a gap."],
  ["Mentor availability and free training", "mentor-availability and training-assignment APIs", "Mentor Availability & Training", "Mentor Availability & Training", "Private exact schedule and item-scoped grants", "Mentor/admin fixtures", "Expiry/revocation integration test remains a gap."],
  ["Mentor matchmaking", "/matchmaking and mentorship request APIs", "Mentor Matchmaking", "Mentor Matchmaking", "Eligibility, compatibility, capacity, expiry, cross-account access", "Firestore emulator + mentor fixtures", "End-to-end lifecycle integration remains a gap."],
  ["Mentorship scheduling and completion", "mentorship engagement and concern APIs", "Mentorship Lifecycle", "Mentor Matchmaking", "Private meeting URLs and participant-only transitions", "Engagement fixtures", "Full lifecycle/concern integration remains a gap."],
  ["Mutual feedback", "mentorship feedback APIs and public references", "Mentorship Feedback", "Mentorship Feedback", "Completion/deadline/duplicate/privacy/moderation/consent", "Completed engagement fixtures", "Three-student publication integration remains a gap."],
  ["Community asset packs", "/asset-packs, admin review, Legacy review", "Asset Packs", "Asset Packs", "Eligibility, version race, approval, access, protected redirect", "Firestore emulator + Drive placeholder", "Concurrent admin/version integration remains a gap."],
  ["Visual, responsive, accessibility", "All new product surfaces", "Visual & Accessibility", "Visual", "Keyboard, zoom, motion, dialogs, responsive states", "Playwright + Chrome", "Current visual suite covers only a subset of routes."],
  ["Firebase and authorization", "firestore.rules, firebase.json", "Protected Links", "Firebase Security", "Default deny and all server-only collections", "Firestore emulator + Java", "Blocked locally because Java is not installed; Storage rules absent."],
  ["Administration and audit", "/api/admin product routes and admin_audit_events", "Mentor Programme", "Administration", "Admin-only mutations and complete before/after audit", "Admin account + emulator", "Cross-route audit reconciliation test remains a gap."],
];

const testDataHeaders = ["Requirement ID", "Placeholder", "Purpose", "Persona or State", "Required Data or Configuration", "Safe Fallback", "Used By Sheets or Tests", "Environment", "Owner", "Status", "Validation or Acceptance", "Sensitive Data Rule", "Notes"];
const testDataDefinitions = [
  ["{{TEST_BASE_URL}}", "Non-production browser/API base URL", "All personas", "HTTPS staging URL or http://127.0.0.1:3000", "Localhost; do not target production", "Manual, Automated", "Local/Staging", "QA", "Not Run", "Health page loads and environment banner/records confirm non-production"],
  ["{{TEST_FREE_ACCOUNT}}", "Free-account authorization and locked states", "Free Account", "Synthetic UID/email alias with no active membership", "Create in emulator", "Manual, Automated, Firebase", "Emulator/Staging", "QA/Admin", "Blocked", "No activeMember, membershipTier, admin, or mentor approval"],
  ["{{TEST_COMMUNITY_ACCOUNT}}", "Active Community entitlement", "Community Member", "Synthetic activeMember user with member tier and future period end", "Create in emulator/Polar sandbox", "Manual, Automated", "Emulator/Polar sandbox", "QA/Admin", "Blocked", "Can access Community content but cannot create projects"],
  ["{{TEST_BUSINESS_ACCOUNT}}", "Business inheritance and project creation", "Business Member", "Synthetic activeMember user with company tier", "Create in emulator/Polar sandbox", "Manual, Automated", "Emulator/Polar sandbox", "QA/Admin", "Blocked", "Can access Community content and create projects"],
  ["{{TEST_CANCELED_FUTURE_ACCOUNT}}", "Cancellation before paid-period end", "Canceled Community", "Canceled subscription with future subscriptionEndsAt", "Create in emulator/Polar sandbox", "Manual, Automated", "Emulator/Polar sandbox", "QA/Admin", "Blocked", "Community content remains accessible until the exact end time"],
  ["{{TEST_EXPIRED_ACCOUNT}}", "Expired entitlement denial", "Expired Community", "activeMember record with past subscriptionEndsAt or revoked state", "Create in emulator", "Manual, Automated", "Emulator/Staging", "QA/Admin", "Blocked", "Protected content returns locked/denied state"],
  ["{{TEST_PAST_DUE_ACCOUNT}}", "Existing Community grace behavior", "past_due Community", "Synthetic past_due subscription still within approved retry behavior", "Create via Polar sandbox event", "Manual, Automated", "Polar sandbox", "QA/Admin", "Blocked", "Community access matches current retry grace implementation"],
  ["{{TEST_ADMIN_ACCOUNT}}", "Administrator controls and audits", "Platform Admin", "Synthetic Firebase Auth admin claim plus users/{uid}.admin", "Use emulator/staging admin only", "Manual, Automated, Firebase", "Emulator/Staging", "Admin", "Blocked", "Admin routes authorize; browser SDK server-only collections still deny"],
  ["{{TEST_ASSIGNED_INSTRUCTOR}}", "Course-scoped instructor authorization", "Assigned Instructor", "Instructor UID listed on one learning item", "Create in emulator", "Manual, Automated", "Emulator/Staging", "QA/Admin", "Blocked", "Can manage only assigned item participants/announcements"],
  ["{{TEST_UNRELATED_INSTRUCTOR}}", "Negative instructor authorization", "Unrelated Instructor", "Instructor-like account not assigned to target item", "Create in emulator", "Manual, Automated", "Emulator/Staging", "QA/Admin", "Blocked", "Participant/announcement requests are denied"],
  ["{{TEST_COURSE_ID}}", "Primary enrollment fixture", "Learner", "Published synthetic learning item covering configurable access/state", "Leave feature unavailable if absent", "Learning tests", "Emulator/Staging", "Content Admin", "Blocked", "Record has no real participant data or private meeting link"],
  ["{{TEST_WAITLIST_COURSE_ID}}", "Finite capacity and promotion fixture", "Learners", "Capacity-one course plus at least three synthetic users", "Create in emulator", "Learning concurrency tests", "Emulator", "QA", "Blocked", "Counters start at zero and WAITLIST_CONFIRMATION_HOURS is known"],
  ["{{TEST_VIDEO_BUNDLE_ID}}", "Protected bundle and progress fixture", "Member/Assigned Mentor", "Synthetic published bundle with placeholder external destination", "Keep videoBundles flag false if absent", "Video tests", "Staging", "Content Admin", "Blocked", "No production YouTube/Drive URL stored in workbook"],
  ["{{TEST_RESOURCE_ID}}", "Protected resource fixture", "Visitor/Member/Granted User", "Synthetic published and unpublished package records", "Use emulator-generated IDs", "Protected-link tests", "Emulator/Staging", "Content Admin", "Blocked", "Public DTO contains no download URL"],
  ["{{TEST_ASSET_PACK_ID}}", "Asset workflow/version fixture", "Contributor/Admin", "Synthetic pack plus version/grant records for every status", "Keep submissions disabled if absent", "Asset tests", "Emulator/Staging", "Content Admin", "Blocked", "External URL is a non-sensitive placeholder only"],
  ["{{TEST_MENTOR_ACCOUNT}}", "Approved public mentor fixture", "Approved Mentor", "Synthetic approved mentor with complete public profile", "Keep directory disabled if absent", "Mentor tests", "Emulator/Staging", "Admin", "Blocked", "No CV, phone, private email, Jira, or internal notes"],
  ["{{TEST_SUSPENDED_MENTOR}}", "Suspension override fixture", "Suspended Mentor", "Synthetic mentorStatus=suspended account", "Create in emulator", "Mentor authorization tests", "Emulator/Staging", "Admin", "Blocked", "Public profile and mentor tools denied"],
  ["{{TEST_MENTORSHIP_ENGAGEMENT_ID}}", "Scheduling/completion/feedback fixture", "Student and Mentor", "Synthetic participant-only engagement with non-sensitive meeting placeholder", "Create in emulator", "Mentorship/feedback tests", "Emulator/Staging", "QA/Admin", "Blocked", "Meeting URL never placed in workbook or public fixture output"],
  ["{{COMMUNITY_PRODUCT_OR_ENTITLEMENT}}", "Current Community Polar mapping", "Community Member", "Existing sandbox product/entitlement configuration", "Do not invent; keep sandbox tests blocked", "Membership/Polar tests", "Polar sandbox", "Billing Admin", "Blocked", "Product ownership, tier, interval, currency, and environment verified"],
  ["{{BUSINESS_PRODUCT_OR_ENTITLEMENT}}", "Current Business Polar mapping", "Business Member", "Existing sandbox product/entitlement configuration", "Do not invent; keep sandbox tests blocked", "Membership/Polar tests", "Polar sandbox", "Billing Admin", "Blocked", "Business inherits Community and preserves project creation"],
  ["{{FUTURE_POLAR_MENTOR_PRODUCT}}", "Reserved future Mentor checkout", "Mentor", "No approved product exists", "MENTOR_CHECKOUT_ENABLED=false", "Membership tests", "Configuration", "Product Owner", "N/A", "No functional price or checkout appears"],
  ["{{MENTOR_APPLICATION_URL}}", "External mentor application", "Signed-in Applicant", "Approved HTTPS Jira form URL supplied server-side", "Applications closed message", "Mentor Programme tests", "Staging configuration", "Product Owner", "Blocked", "External URL validated; no internal Jira keys or credentials exposed"],
  ["{{APRIL_2025_RESOURCE_ID}}", "Explicit Legacy review target", "Platform Admin", "Exact production document ID only after separate approval", "Empty and unused", "Asset/Legacy tests", "Configuration", "Product Owner", "Blocked", "No lookup, migration, or production mutation without explicit approval"],
  ["{{FIREBASE_EMULATOR_PROJECT_ID}}", "Rules-test isolation", "Test Harness", "Non-production emulator project ID", "demo-go-platform local default", "Firebase Tests", "Local emulator", "Engineering", "Not Run", "Firebase command cannot resolve or write to production"],
  ["{{TEST_EMAIL_DOMAIN}}", "Transactional email testing", "Synthetic recipients", "Controlled non-production inbox/domain", "Disable sends and validate outbox only", "Email/notification tests", "Email sandbox", "QA/Admin", "Blocked", "No real participant addresses in fixtures or workbook"],
  ["{{TEST_EXTERNAL_LINK_PLACEHOLDER}}", "Protected redirect destination", "Authorized content user", "Non-sensitive HTTPS placeholder owned for QA", "Missing-destination unavailable state", "Protected-link tests", "Staging", "QA", "Blocked", "Never store a production/private Drive, YouTube, Jira, or meeting URL here"],
];

function columnName(index) {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

const statusColors = [
  ["Pass", "#DCFCE7", "#166534"], ["Fail", "#FEE2E2", "#991B1B"], ["Retest", "#FEF3C7", "#92400E"],
  ["Blocked", "#EDE9FE", "#5B21B6"], ["Not Run", "#E2E8F0", "#334155"], ["N/A", "#F1F5F9", "#475569"],
  ["Implemented", "#DCFCE7", "#166534"], ["Gap", "#FEF3C7", "#92400E"],
];

function addConditionalFormats(range) {
  for (const [text, fill, color] of statusColors) {
    range.conditionalFormats.add("containsText", { text, format: { fill, font: { color, bold: true } } });
  }
}

function styleSheet(sheet, headers, rows, widths, tableName) {
  const rowCount = rows.length + 1;
  const colCount = headers.length;
  const lastCell = `${columnName(colCount - 1)}${rowCount}`;
  const all = sheet.getRange(`A1:${lastCell}`);
  all.values = [headers, ...rows];
  all.format = { font: { name: "Arial", size: 10, color: "#0F172A" }, verticalAlignment: "top", wrapText: true };
  sheet.getRange(`A1:${columnName(colCount - 1)}1`).format = {
    fill: "#2563EB", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center", verticalAlignment: "center", wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#1D4ED8" }, rowHeight: 34,
  };
  if (rowCount > 1) sheet.getRange(`A2:${lastCell}`).format.rowHeight = 48;
  widths.forEach((width, index) => { sheet.getRange(`${columnName(index)}1:${columnName(index)}${rowCount}`).format.columnWidth = width; });
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  const table = sheet.tables.add(`A1:${lastCell}`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  return { rowCount, lastCell };
}

function addListValidation(sheet, column, lastRow, values) {
  if (lastRow < 2) return;
  sheet.getRange(`${column}2:${column}${lastRow}`).dataValidation = { rule: { type: "list", values } };
}

const v18 = workbook.worksheets.add("V 1.8 TEST");
const v18Info = styleSheet(v18, manualHeaders, allManualRows, [13, 17, 25, 52, 52, 31, 10, 23, 42, 38, 34, 28, 15], "V18ManualTests");
addListValidation(v18, "A", v18Info.rowCount, ["Not Run", "Pass", "Fail", "Retest", "Blocked", "N/A"]);
addListValidation(v18, "G", v18Info.rowCount, ["P0", "P1", "P2"]);
addConditionalFormats(v18.getRange(`A2:A${v18Info.rowCount}`));
for (const [priority, fill, color] of [["P0", "#FEE2E2", "#991B1B"], ["P1", "#FEF3C7", "#92400E"], ["P2", "#DBEAFE", "#1E40AF"]]) {
  v18.getRange(`G2:G${v18Info.rowCount}`).conditionalFormats.add("containsText", { text: priority, format: { fill, font: { color, bold: true } } });
}
v18.getRange(`M2:M${v18Info.rowCount}`).format.numberFormat = "yyyy-mm-dd";

const autoSheet = workbook.worksheets.add("Automated Tests");
const autoInfo = styleSheet(autoSheet, automatedHeaders, automatedRows, [16, 15, 27, 30, 10, 25, 40, 45, 18, 52, 52, 16, 43, 24, 39, 42], "AutomatedTestsInventory");
addListValidation(autoSheet, "B", autoInfo.rowCount, ["Unit", "API", "Integration", "End-to-End", "Authorization", "Security", "Concurrency", "Email", "Polar", "Firebase"]);
addListValidation(autoSheet, "E", autoInfo.rowCount, ["P0", "P1", "P2"]);
addListValidation(autoSheet, "L", autoInfo.rowCount, ["Existing", "New"]);
addListValidation(autoSheet, "N", autoInfo.rowCount, ["Implemented", "Gap - Not implemented", "Blocked", "N/A"]);
addConditionalFormats(autoSheet.getRange(`N2:N${autoInfo.rowCount}`));

const firebaseSheet = workbook.worksheets.add("Firebase Tests");
const firebaseInfo = styleSheet(firebaseSheet, firebaseHeaders, firebaseRows, [15, 28, 38, 22, 26, 40, 52, 52, 16, 42, 26, 34, 38, 38], "FirebaseTestsInventory");
addListValidation(firebaseSheet, "I", firebaseInfo.rowCount, ["Existing", "New"]);
addListValidation(firebaseSheet, "K", firebaseInfo.rowCount, ["Implemented", "Implemented - blocked locally", "Gap - Not implemented", "Gap - parameterized collection assertion recommended", "Blocked", "N/A"]);
addConditionalFormats(firebaseSheet.getRange(`K2:K${firebaseInfo.rowCount}`));

const coverageRows = coverageSpecs.map(([area, routes, suite, keyword, focus, environment, blocker], index) => {
  const refs = manualReferences.get(suite) || { existing: [], first: null, last: null };
  const refParts = [...refs.existing, refs.first && refs.last ? `${refs.first}:${refs.last}` : null].filter(Boolean);
  const row = index + 2;
  const manualCount = allManualRows.filter((entry) => entry[2] === suite).length + refs.existing.length;
  const normalizedKeyword = keyword.toLowerCase();
  const automatedCount = automatedRows.filter((entry) => String(entry[3] || "").toLowerCase().includes(normalizedKeyword)).length;
  const firebaseCount = firebaseRows.filter((entry) => String(entry[1] || "").toLowerCase().includes(normalizedKeyword)).length;
  const coverageLevel = firebaseCount > 0 ? "Manual + Automated + Firebase" : automatedCount > 0 ? "Manual + Automated" : "Manual only";
  return [area, routes, suite, keyword, refParts.join(", "), manualCount, automatedCount, firebaseCount, coverageLevel, focus, environment, blocker, "Filter the detailed sheets by suite/feature to inspect individual cases.", row];
});
const coverageSheet = workbook.worksheets.add("Coverage Matrix");
const coverageDisplayRows = coverageRows.map((row) => row.slice(0, 13));
const coverageInfo = styleSheet(coverageSheet, coverageHeaders, coverageDisplayRows, [30, 48, 28, 27, 28, 13, 15, 13, 28, 48, 36, 46, 40], "CoverageMatrixTable");
coverageSheet.getRange(`F2:H${coverageInfo.rowCount}`).format.numberFormat = "0";
addConditionalFormats(coverageSheet.getRange(`I2:I${coverageInfo.rowCount}`));

const testDataRows = testDataDefinitions.map((row, index) => [
  `GO-DATA-${String(index + 1).padStart(3, "0")}`, ...row.slice(0, 10), "Never store passwords, API keys, bearer tokens, private external URLs, or production credentials.", "Use synthetic IDs and aliases only.",
]);
const testDataSheet = workbook.worksheets.add("Test Data Requirements");
const dataInfo = styleSheet(testDataSheet, testDataHeaders, testDataRows, [16, 36, 36, 24, 48, 40, 34, 25, 20, 14, 48, 48, 40], "TestDataRequirementsTable");
addListValidation(testDataSheet, "J", dataInfo.rowCount, ["Not Run", "Pass", "Fail", "Retest", "Blocked", "N/A"]);
addConditionalFormats(testDataSheet.getRange(`J2:J${dataInfo.rowCount}`));

// Compact workbook comments clarify non-execution and the normalized V1.8 layout.
workbook.comments.addThread({ cell: v18.getRange("A1") }, "V1.8 copies every V1.7 result and removes only the blank structural column J in the new version. Historical sheets are unchanged.");
workbook.comments.addThread({ cell: autoSheet.getRange("N1") }, "Implementation Status describes repository coverage, not a QA execution result. Existing tests remain ungraded until their command output is recorded as evidence.");
workbook.comments.addThread({ cell: firebaseSheet.getRange("M1") }, "The current workstation cannot start the Firestore emulator because Java is not installed. Storage rules are also absent from the repository.");

// Structural validation before export.
const allManualIds = allManualRows.map((row) => row[1]);
if (new Set(allManualIds).size !== allManualIds.length) throw new Error("Duplicate manual test IDs detected");
if (newManualRows[0][1] !== "GO-MAN-101") throw new Error("New manual tests do not start at GO-MAN-101");
for (const row of newManualRows) {
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8]) if (!String(row[index] ?? "").trim()) throw new Error(`Blank required manual field in ${row[1]}`);
}
const autoIds = automatedRows.map((row) => row[0]);
if (new Set(autoIds).size !== autoIds.length) throw new Error("Duplicate automated test IDs detected");
for (const row of automatedRows) if (row.some((value, index) => index < automatedHeaders.length && !String(value ?? "").trim())) throw new Error(`Blank automated field in ${row[0]}`);
const firebaseIds = firebaseRows.map((row) => row[0]);
if (new Set(firebaseIds).size !== firebaseIds.length) throw new Error("Duplicate Firebase test IDs detected");
for (const row of firebaseRows) if (row.some((value) => !String(value ?? "").trim())) throw new Error(`Blank Firebase field in ${row[0]}`);

const preservedOutput = v18.getRange("A1:M101").values;
for (let index = 0; index < 100; index++) {
  const expected = preservedManualRows[index];
  const actual = preservedOutput[index + 1];
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`V1.7 data mismatch while copying ${expected[1]}`);
}

const newSheetValues = [v18, autoSheet, firebaseSheet, coverageSheet, testDataSheet].flatMap((sheet) => sheet.getUsedRange().values.flat());
const sensitivePattern = /(-----BEGIN [A-Z ]+PRIVATE KEY-----|\bsk_live_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._-]{20,}|https:\/\/(?:drive\.google\.com|youtu\.be|youtube\.com)\/[A-Za-z0-9_?&=./-]{12,})/i;
for (const value of newSheetValues) {
  if (typeof value === "string" && sensitivePattern.test(value)) throw new Error("Potential credential or protected external URL detected in new workbook sheets");
}

const keyInspections = [];
keyInspections.push((await workbook.inspect({ kind: "table", sheetId: "V 1.8 TEST", range: `A1:M${Math.min(v18Info.rowCount, 112)}`, include: "values,formulas", tableMaxRows: 8, tableMaxCols: 13, maxChars: 9000 })).ndjson);
keyInspections.push((await workbook.inspect({ kind: "table", sheetId: "Automated Tests", range: `A1:P${Math.min(autoInfo.rowCount, 12)}`, include: "values,formulas", tableMaxRows: 8, tableMaxCols: 16, maxChars: 9000 })).ndjson);
keyInspections.push((await workbook.inspect({ kind: "table", sheetId: "Coverage Matrix", range: `A1:M${coverageInfo.rowCount}`, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 13, maxChars: 16000 })).ndjson);
const formulaErrors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan", maxChars: 10000 });
if (formulaErrors.ndjson && !/0 matches|no matches|"matches":0/i.test(formulaErrors.ndjson)) {
  await fs.writeFile(path.join(outputDir, "formula-scan.txt"), formulaErrors.ndjson, "utf8");
}

await fs.mkdir(previewDir, { recursive: true });
for (const sheet of workbook.worksheets.items) {
  const safeName = sheet.name.replace(/[^A-Za-z0-9._-]+/g, "_");
  const scale = ["V 1.8 TEST", "Automated Tests", "Firebase Tests"].includes(sheet.name) ? 0.22 : 0.45;
  const preview = await workbook.render({ sheetName: sheet.name, autoCrop: "all", scale, format: "png" });
  await fs.writeFile(path.join(previewDir, `${safeName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);

const verified = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const verifiedNames = verified.worksheets.items.map((sheet) => sheet.name);
for (const name of [...sourceSheets, "V 1.8 TEST", "Automated Tests", "Firebase Tests", "Coverage Matrix", "Test Data Requirements"]) {
  if (!verifiedNames.includes(name)) throw new Error(`Exported workbook missing sheet: ${name}`);
}
const verifiedV18 = verified.worksheets.getItem("V 1.8 TEST").getRange(`A1:M${v18Info.rowCount}`).values;
if (verifiedV18.length !== v18Info.rowCount) throw new Error("Exported V1.8 row count mismatch");

await fs.writeFile(path.join(outputDir, "verification-summary.json"), JSON.stringify({
  sourceSheetsPreserved: sourceSheets,
  outputSheets: verifiedNames,
  existingManualTests: preservedManualRows.length,
  newManualTests: newManualRows.length,
  totalManualTests: allManualRows.length,
  existingAutomatedTests: automatedRows.filter((row) => row[11] === "Existing").length,
  newAutomatedGaps: automatedRows.filter((row) => row[11] === "New").length,
  apiRows: automatedRows.filter((row) => row[1] === "API").length,
  firebaseTests: firebaseRows.length,
  coverageAreas: coverageSpecs.length,
  testDataRequirements: testDataRows.length,
  outputPath,
  keyInspections,
  formulaErrorScan: formulaErrors.ndjson,
}, null, 2), "utf8");

console.log(JSON.stringify({
  outputPath,
  existingManualTests: preservedManualRows.length,
  newManualTests: newManualRows.length,
  totalManualTests: allManualRows.length,
  existingAutomatedTests: automatedRows.filter((row) => row[11] === "Existing").length,
  newAutomatedGaps: automatedRows.filter((row) => row[11] === "New").length,
  apiRows: automatedRows.filter((row) => row[1] === "API").length,
  firebaseTests: firebaseRows.length,
  coverageAreas: coverageSpecs.length,
  testDataRequirements: testDataRows.length,
  previewDir,
}, null, 2));
