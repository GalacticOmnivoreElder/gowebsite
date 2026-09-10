# Soft-launch audit and remediation report

**Platform:** Galactic Omnivore (GO)  
**Audit evidence date:** 10 September 2026  
**Audited repository revision:** `6785202`  
**Report prepared:** 10 September 2026  
**Purpose:** Preserve the audit findings so they can be revalidated and converted into an implementation prompt after feature development and platform refinement are complete.  
**Historical verdict:** **Not ready for soft launch.**

## 1. How to use this report later

This is a record of the earlier audit, not a claim that the same defects will still exist when remediation begins. The repository revision was checked again while preparing this report and remained `6785202`; application, provider, dependency, and database checks were not repeated during report preparation.

Before implementing fixes:

1. Record the new commit, branch, working-tree changes, deployed release, and intended launch scope.
2. Reproduce each finding against the current code and intended environment.
3. Mark findings already resolved by feature work as resolved only when their acceptance tests pass.
4. Update paths, API contracts, feature flags, business rules, dependency advisories, and test expectations that changed.
5. Add newly introduced routes and features to the role and workflow matrices.
6. Implement the confirmed remaining issues in dependency order.
7. Retest the exact release candidate and actual deployed configuration.

Do not restore obsolete UI designs just to satisfy historical screenshots. Do not hide intended launch features simply to make the gate pass. Do not apply blanket membership revocations or assume an old subscription collection is authoritative.

Use the stable `SLR-###` issue IDs in implementation tasks, commits, tests, and the final release checklist.

## 2. Scope, evidence, and limits

The audit included repository inspection, unit/lint/type/build commands, local production startup, browser testing, in-memory failure reproductions, read-only Firebase data/configuration inspection, and read-only Polar product lookups. Production records were not changed. No payments, refunds, real account creation, email sends, security-rule deployment, index deployment, or exploit execution were performed. Normal build and browser-test artifacts were generated.

### Evidence labels

| Label | Meaning |
| --- | --- |
| Verified working | The stated behavior passed a specific executed check; this does not imply the whole feature works. |
| Verified broken | A failure was reproduced in a browser, command, read-only query, or isolated in-memory execution. |
| Verified configuration | A setting or deployed rule was read directly; downstream behavior may still require a separate test. |
| Code-supported risk | The implementation demonstrates an unsafe pattern, but the complete failure was not reproduced against a real service. |
| Partially verified | Some layers passed, while important integration or role behavior remains unknown. |
| Untested / blocked | Required credentials, accounts, permissions, services, or tooling were unavailable. |

### Environment distinctions

- The local production build used the merged Next.js production environment, including `.env.production.local`, `.env.local`, and `.env`.
- The inspected Firebase client and Admin configurations pointed to the same project. Firebase reads included deployed rules, deployed indexes, database recovery settings, and aggregate data.
- Local Polar configuration selected the production provider. No sandbox purchase journey was performed.
- The deployed website's complete Vercel environment and deployed application revision were not independently verified. Local billing/configuration failures must not automatically be attributed to that deployment.
- Dependency advisory results are time-sensitive. Refresh them when remediation starts.
- Browser rendering, mocked route tests, and source-text assertions are not substitutes for signed-in end-to-end tests.

### Executed checks

| Check | Historical result | Interpretation |
| --- | --- | --- |
| `npm run test:unit` | 420 passed | Includes mocked route behavior and source assertions. |
| `npm run lint` | Passed, nine warnings | Hook dependencies and image optimization warnings remain. |
| `npm run typecheck` | Passed | Selected-file scope; `checkJs` and `strict` disabled globally. |
| `npm run build` / local production start | Passed | Native SWC binary failed to load, but compilation completed through the available fallback. |
| `npm run test:rules` | Blocked | Java could not be found/spawned. |
| Visual smoke/events | 3 passed, 15 failed | Fourteen screenshot failures and one mobile event iframe assertion failure. |
| About page suite | 12 passed | Includes desktop, tablet, mobile, and keyboard-focus checks. |
| Landing hero/about suite | 4 passed, 4 failed | Hero assertions encountered multiple matching Discord links. |
| Marquee/pillars suite | 4 passed, 2 failed | Pillar assertions expected obsolete copy. |
| Newsletter suite | 10 passed, 6 skipped | Backend responses mocked; delivery not established. |
| Product navigation suite | 4 failed | Card count and obsolete Workshop-tab expectations. |
| Analytics suite | 2 passed | Consent controls and disabled-analytics behavior, not production event delivery. |
| Additional page/viewport sweep | 76 checks, seven network-idle timeouts | Completed samples showed no horizontal overflow, missing image alt attributes, or uncaught page errors. Empty alt text was not assessed for semantic appropriateness. |
| Dependency audit, production dependency graph | 42 affected packages | 4 critical, 18 high, 19 moderate, 1 low; these are package audit counts, not 42 demonstrated exploits. |

Other verified observations:

- All 17 admin GET endpoints rejected anonymous requests with 401 or 403.
- Representative protected pages redirected anonymous visitors to login.
- Public project, blog, calendar, and skills reads returned data.
- Empty login submission produced field-validation messages.
- Workshop navigation and browser-back behavior passed a targeted check that waited for navigation completion.
- Direct anonymous `/subscription/success` visits did not grant access or display the purchase-confirmation dialog; after polling, the page showed a pending-confirmation message.

## 3. Prioritized issue register

### SLR-001 — Anonymous access to package documents and asset destinations

**Severity:** Blocker. **Evidence:** Verified deployed rule and anonymous read. **Launch gate:** Required for any launch involving protected resources.

**Finding:** Deployed Firestore rules allowed public reads of `packages`. An unauthenticated REST read returned a package containing five Google Drive asset URLs, plus internal review-related fields. The current repository rules restrict that collection, but those rules were not deployed.

**Impact:** Users can bypass the public metadata API and obtain destinations intended to be protected. A disclosed URL may remain usable even after GO access checks are corrected; actual Drive permissions were not tested.

**References:** `firestore.rules`, especially the `packages` rule near line 68; `src/app/api/packages/route.js`; `src/app/resources/[resourceId]/open/route.js`. The inspected `cloud.firestore` release was last updated on 14 July 2026.

**Safe reproduction:** Inspect the deployed ruleset and anonymously list the package collection. Record only response status and field/destination counts; do not publish the actual URLs or download content.

**Remediation:** Revalidate and deploy the intended rules. Check direct get/list access separately. Review exposed destinations and change their external permissions or links where needed. Confirm that public APIs expose only approved metadata.

**Acceptance:** Anonymous and ordinary member direct document reads are denied as intended; authorized server opens still work; private review fields are absent from public DTOs; external access matches the promised protection model.

### SLR-002 — Mentor approval can be self-assigned under deployed rules

**Severity:** Blocker. **Evidence:** Verified deployed rule conditions and current server authorization; no live account mutation attempted. **Launch gate:** Required before Mentor functionality is exposed.

**Finding:** The deployed privileged-field exclusion list omitted `mentorStatus` and `mentorPublicProfileEnabled`. Owners could edit those fields on their own user documents. Current server helpers trust `mentorStatus === "approved"` when deciding whether an active Mentor subscriber can use Mentor tools.

**Impact:** A paid Mentor user can bypass the staff/interview approval boundary. This is not evidence of arbitrary platform-admin escalation.

**References:** `firestore.rules:34`; `src/lib/content-entitlements.js:22`; `src/app/api/me/mentor-profile/route.js`; `src/lib/mentor-directory.js`.

**Safe reproduction:** In the emulator or staging, attempt owner writes to all approval/publication fields and then test the corresponding server permissions. Do not perform the exploit on a real production account.

**Remediation:** Deploy the protected-field rules; audit all newly introduced server-owned fields; preserve server-side checks for active tier, approval, suspension, and publication.

**Acceptance:** Pending, rejected, suspended, expired, and ordinary users cannot grant approval or publication; an approved active Mentor can use only the intended tools; suspension takes effect according to a documented session policy.

### SLR-003 — Required composite indexes are missing from the connected database

**Severity:** Blocker. **Evidence:** Verified configuration and reproduced query failures. **Launch gate:** Required for affected features.

**Finding:** The repository defined 16 composite indexes; the six deployed indexes did not match those definitions. Read-only queries for support history, mentorship requests, and notifications failed with Firestore code 9, `FAILED_PRECONDITION`, requiring an index.

**References:** `firestore.indexes.json`; `src/lib/support-tickets.js:110`; `src/lib/mentorship-service.js`; `src/app/api/notifications/route.js`.

**Affected definitions:** learning-enrollment waitlist queries; notification recipient/order and unread queries; email-outbox status/scheduling/lease/user-event queries; mentorship request/suggestion/application/engagement queries; support request/message history.

**Safe reproduction:** Execute the actual filter/order queries with a nonexistent user ID, using read-only access. Compare normalized field definitions and scopes, not just index counts. Some equality queries may be satisfied by index merging; some email queries have fallbacks, so every missing definition is not automatically a demonstrated outage.

**Remediation:** Deploy the required indexes, wait for READY, and exercise each real query. Check all new feature queries against the current configuration.

**Acceptance:** All launch-critical queries work in the intended project without missing-index failures; fallbacks do not hide persistent deployment omissions.

### SLR-004 — Production dependencies have unresolved security advisories

**Severity:** Blocker pending current exposure assessment. **Evidence:** Verified dependency audit and maintainer advisory; exploitation not attempted. **Launch gate:** Resolve relevant critical/high exposure.

**Finding:** Next.js was pinned to `15.3.8`. Critical package ratings included Next.js, `fast-xml-parser`, `protobufjs`, and `websocket-driver`; Sharp and other packages also required attention. DOMPurify advisories are relevant to review because the platform renders sanitized HTML.

**Impact:** Potential code execution, denial of service, injection, or other dependency-specific risks. Reachability differs by runtime and feature usage; audit severity alone is not proof of exploitability.

**References:** `package.json`, `package-lock.json`, `next.config.js`; [Next.js AVIF optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4); [Windows-hosted Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36). The AVIF advisory identified `15.5.24` as a patched release at audit time; do not treat that historical version as a future upgrade target.

**Reproduction:** Run `npm audit --omit=dev`, inspect installed dependency paths, and match advisories to actual application usage and deployment infrastructure.

**Remediation:** Update to currently patched compatible versions, including relevant direct image-processing dependencies. Review upgrade migrations and breaking changes. Avoid blind forced upgrades or unnecessary framework replacement.

**Acceptance:** Build and critical workflows pass after upgrades; relevant critical/high findings are fixed or have a documented, evidence-backed non-applicability determination or mitigation.

### SLR-005 — Four local Community/Business Polar product IDs are invalid

**Severity:** High. **Evidence:** Verified local configuration and provider lookups. **Launch gate:** Required before purchases; verify actual deployment separately.

**Finding:** Community/Business monthly/annual IDs were each 11 characters and not valid product UUIDs. All four provider lookups returned HTTP 422. Mentor monthly/annual products resolved successfully, were unarchived and recurring, and matched month/year intervals. Mentor IDs were supplied through production fallback mapping, so absent Mentor environment overrides were not themselves a defect.

**References:** `src/lib/polar.js`; `src/app/api/checkout/route.js:46`; `src/lib/mentor-checkout.js`; membership pricing components.

**Impact:** Server checkout creation uses those resolved product IDs; the inspected configuration cannot reliably create the four Community/Business checkouts. Product existence alone does not prove payment or webhook behavior.

**Reproduction:** Load the intended environment, resolve all six tier/interval combinations, and make read-only product lookups.

**Remediation:** Correct environment-specific product mapping; verify prices, currency, recurrence, availability, and ownership. Extend validation beyond nonempty strings.

**Acceptance:** All offered plans resolve to intended products in staging and production; sandbox checkout completes; customer identity, interval, amount, tax presentation, webhook activation, and success return are verified.

### SLR-006 — Local production environment fails its own release validator

**Severity:** High. **Evidence:** Verified configuration. **Launch gate:** Required for the actual release environment.

**Finding:** Validation reported missing `NEXT_PUBLIC_SITE_URL`, missing `CRON_SECRET`, and present `ADMIN_BOOTSTRAP_SECRET`. It also reported a success-URL validation failure, but a separate check established that the success URL was valid HTTPS with `/subscription/success`; the absent canonical origin caused the comparison failure.

**Nuance:** The email worker supports GitHub OIDC in addition to a cron secret. Missing `CRON_SECRET` alone does not establish a broken worker. Ordinary local builds do not necessarily invoke the production gate unless the Vercel production conditions or `GO_VALIDATE_PRODUCTION_ENV=true` apply.

**References:** `next.config.js:7`; `src/lib/production-env.cjs`; `src/app/api/cron/email-outbox/route.js`; `src/lib/githubActionsOidc.js`.

**Remediation:** Align validation with the supported deployment/authentication policy; configure the canonical origin; remove production bootstrap configuration; validate success-origin consistency; report actionable validation errors. Verify environment settings without logging secret values.

**Acceptance:** The intended production validation passes, development-only capabilities remain unavailable, and worker authentication succeeds through the selected mechanism while unauthorized requests fail.

### SLR-007 — Learning and mentorship email events fail validation silently

**Severity:** High. **Evidence:** Reproduced in-memory validator failure. **Launch gate:** Required before the affected workflows launch.

**Finding:** Callers pass `scheduledFor: null`, whereas `validateEmailEvent` accepts an omitted value or a valid Date. Reproductions for enrollment confirmation, waitlist promotion, cancellation, mentorship update, and feedback all threw `Email scheduledFor must be a valid Date`. Callers use `Promise.allSettled` without acting on rejection or explicitly swallow the error.

**References:** `src/lib/learning-enrollment.js:90,103,234,294`; `src/lib/mentorship-service.js:96`; `src/lib/mentorship-feedback-service.js:22`; `src/lib/email/recipients.js`; `src/lib/email/events.js:121`.

**Impact:** The main action can succeed while its email is never queued. The defect is upstream of provider delivery and is not repaired by retrying the outbox worker.

**Remediation:** Define a consistent immediate/scheduled event contract. Test actual callers through recipient resolution and outbox creation. Make failures observable and recoverable without duplicating the main action.

**Acceptance:** Every affected action creates the expected job; immediate and future scheduling work; failures are visible/retriable; provider retries do not duplicate messages.

### SLR-008 — Concurrent applications bypass duplicate prevention

**Severity:** High. **Evidence:** Reproduced in the existing in-memory route harness. **Launch gate:** Required for project applications.

**Finding:** Two concurrent submissions for one user/project both returned 200 and created `application-1` and `application-2`. The duplicate query is separate from `.add(applicationData)`.

**References:** `src/app/api/applications/route.js:144,195`; `tests/unit/applications-route.test.cjs`.

**Remediation:** Implement transactional uniqueness or an idempotent request/application key. Preserve intentional reapplication behavior after cancellation/rejection; do not overwrite historical records indiscriminately.

**Acceptance:** Double click, parallel requests, retry after response loss, and cross-tab submission produce one logical active application and the intended notification count. Legitimate reapplication follows an explicit policy.

### SLR-009 — Approval and cancellation can leave inconsistent team state

**Severity:** High. **Evidence:** Reproduced concurrency and cancellation cases; additional partial-commit risk supported by code. **Launch gate:** Required for team management.

**Finding:** Two concurrent approvals left two approved applications and two user project references, but only one applicant in the project's `teamMembers`. The code replaces arrays from stale snapshots. Team changes commit before application status is updated. Separately, canceling an approved application returned 200 and changed its status to canceled while retaining both team membership and the user project reference.

**References:** `src/app/api/applications/[id]/route.js:100,136,195,199`; related project-member removal route.

**Remediation:** Define valid state transitions and the meaning of withdrawing an accepted application. Use an atomic transaction for status and related membership state, with concurrency-safe collection updates. Check authorization and source state inside the transaction. Make notification handling consistent with committed state.

**Acceptance:** Parallel approvals preserve both members; injected write failures cannot split status/access state; approval versus withdrawal races resolve consistently; retries are idempotent; accepted cancellation either removes access atomically or is rejected with clear guidance according to the chosen policy.

### SLR-010 — Unpublished CV drafts are copied into applications

**Severity:** High. **Evidence:** Reproduced in memory. **Launch gate:** Required before applications share CV information.

**Finding:** A CV with `status: "draft"` and `visibility_public: false` was included in an application snapshot. The route checks document existence, not active/publication state. The browser has a profile-sharing consent checkbox, but the application API does not validate or record a corresponding consent field.

**Nuance:** Public visibility and consent to share privately with a project are different policies. Do not require public visibility if private project sharing is intended. The problem is unintended draft sharing and an unclear/enforced sharing contract.

**References:** `src/app/api/applications/route.js:161`; `src/app/api/me/cv/route.js:193`; `src/app/project/[id]/page.js` application consent dialog.

**Remediation:** Establish whether applications require an active CV or an explicitly approved snapshot. Validate the chosen policy on the server; record relevant consent/version evidence; show users what will be shared.

**Acceptance:** Draft content is not shared implicitly; private-but-approved sharing works when authorized; snapshots remain immutable after CV edits; unrelated users cannot access snapshots; missing CV and consent produce clear, non-destructive outcomes.

### SLR-011 — Database recovery and deletion protection are not launch-proven

**Severity:** High. **Evidence:** Verified database settings; backup inspection blocked. **Launch gate:** Required recovery evidence.

**Finding:** The database reported `POINT_IN_TIME_RECOVERY_DISABLED` and `DELETE_PROTECTION_DISABLED`. Backup-schedule inspection returned 403. No restore rehearsal was performed.

**Impact:** Recovery from damaging writes or deletion has not been established. The 403 does not prove that backups are absent.

**References:** Firestore database administration settings; `docs/production-release-checklist.md`; migration guides.

**Remediation:** Obtain sufficient read access, inventory recovery arrangements, select appropriate protections and retention, and test restoration into an isolated target. Document acceptable data loss/recovery time and the responsible operator. Account for storage/service costs when selecting settings.

**Acceptance:** A backup/restore path is demonstrated; deletion protection is verified; rollback and restoration steps are documented; recovery does not overwrite production during rehearsal.

### SLR-012 — Authentication, roles, and payment lifecycles lack end-to-end evidence

**Severity:** High. **Evidence:** Untested/blocked by lack of isolated services and supplied role accounts. **Launch gate:** Mandatory for all launch-critical journeys.

**Finding:** Successful email/Google signup and login, email verification, reset delivery, session refresh/expiry, cross-account isolation, paid entitlement transitions, and signed-in CRUD were not completed end to end. Unit mocks do not prove those integrations.

**References:** `docs/TEST_PLAN.md`; `docs/production-release-checklist.md`; `tests/helpers/route-test-utils.cjs`; `tests/helpers/load-source-module.cjs`.

**Remediation:** Establish isolated staging and role fixtures. Exercise browser -> API -> database/provider -> refreshed browser behavior, including failure and retry cases. Never mark a blocked test as passed.

**Acceptance:** The role and journey matrices in section 5 have recorded results, with no launch-critical unknowns.

### SLR-013 — Advertised benefits and available content are not aligned

**Severity:** High, conditional on launch scope. **Evidence:** Verified local flags, connected data, and public empty states.

**Finding:** Course enrollment, user notifications, and video bundles were disabled. Video and notification endpoints returned 503. The sole learning record was archived; the sole mentor profile was submitted; there were no asset packs. Public learning, Mentor, package/resource, and asset catalogs were empty.

**References:** `src/lib/product-config.js`; membership page; education, mentorship, resources, video, and asset-pack pages.

**Impact:** Visitors can encounter unavailable benefits presented as reasons to join. Empty states may be correct technically while the commercial/product offering is incomplete.

**Remediation:** After feature work, explicitly choose the launch offering. Supply approved content and staffing for included benefits, or accurately describe availability. Preserve the user's intended feature scope rather than silently disabling features to pass testing.

**Acceptance:** Every advertised launch benefit has a usable and tested path; empty/disabled states are honest; intended flags are configured consistently across UI and API.

### SLR-014 — Membership exceptions and profile migration require reconciliation

**Severity:** High for entitlement ambiguity; Medium for profile schema review. **Evidence:** Read-only aggregate inventory and migration dry runs.

**Finding:** Among 72 users, 11 had `activeMember: true`; two lacked both an end date and a subscription ID, and one active flag had an expired end date. The effective resolver falls back to `activeMember` when no end date exists. The dry run counted ten users with effective entitlement data, zero active legacy subscription records, and 13 profiles requiring schema-version updates.

**Nuance:** The resolver already uses the paid-through end date when available, so a stale active flag with an expired date is not proof of continued access. Manual grants may be legitimate. Legacy subscription rows are not necessarily the current billing source of truth.

**References:** `src/lib/auth-utils.js:47`; `scripts/migrate-launch-data.mjs`; `docs/launch-readiness-migration.md`.

**Remediation:** Reconcile individual exceptions against Polar and authorized grant records. Define explicit grant provenance/expiry if necessary. Review whether profile-version changes need a data migration or only version annotation. Produce a dry-run diff before changes.

**Acceptance:** Every effective membership has an explainable source and expiry policy; expired/refunded/revoked accounts are denied correctly; migration does not remove valid entitlements or overwrite user data.

Additional historical migration results: resource lifecycle mapping had no unresolved entries; learning-location migration had no pending changes; the three legacy mentorship source collections were empty and required no copying. A package lacking a status was observed, but the migration script only detects the literal obsolete status `legacy`; review missing-status data explicitly.

The documented `node --env-file=.env.local ...` migration commands initially failed to find a project ID. Loading the same merged environment as Next.js allowed both dry runs to complete. Make future runbook environment selection explicit.

### SLR-015 — Browser regression expectations no longer match the platform

**Severity:** Medium. **Evidence:** Verified test failures, with several stale expectations established. **Launch gate:** Restore reliable tests for critical UI.

**Finding:** Screenshot baselines show older copy/layout. Product navigation expected six orbit cards instead of seven and a Workshop tab that had become category navigation. Hero tests used an unscoped Discord locator matching two legitimate links. Pillar tests expected older wording. One mobile event test detected an iframe; a separate inspection found none, so that failure remains intermittent/unexplained.

**References:** `tests/visual-smoke.spec.js`; `tests/product-navigation.spec.js:77,165`; `tests/landing-hero.spec.js`; `tests/landing-pillars.spec.js`; `tests/events.spec.js`.

**Remediation:** Review the final intended UI, then repair locator scope and semantic expectations. Approve screenshot changes visually; do not bulk-update baselines to suppress defects. Investigate iframe origin/timing and network-idle instability.

**Acceptance:** Critical suites pass against the final design, assertions test behavior meaningfully, no unexpected baseline changes remain, and unexplained intermittent failures have been resolved or explicitly contained.

### SLR-016 — Test and release commands provide incomplete assurance

**Severity:** Medium. **Evidence:** Verified scripts and test implementation. **Launch gate:** Required for critical regression coverage.

**Finding:** `test:all` only runs lint, unit tests, and build. It omits explicit type checking, rules, browser suites, and dependency review. Global `checkJs: false` and `strict: false` reduce type assurance; the include list covers selected modules, not the full application. Some files opt into checking individually. Of 93 unit-test files, 28 contained source-text assertions. The support tests largely check strings rather than executing workflows.

**References:** `package.json:24`; `jsconfig.product.json`; `src/lib/__tests__/support-launch.test.cjs`; test helpers.

**Remediation:** Create an enforceable release gate and meaningful integration tests for the defects in this report. Improve type coverage incrementally. Keep useful structural tests, but do not count them as runtime behavior tests. Provide the Java runtime needed by rule tests. Ensure CI runs relevant checks on candidate changes.

**Acceptance:** A release can no longer appear green while required layers were skipped; tests catch the demonstrated application races and notification contract failure; rule tests execute successfully.

### SLR-017 — Authentication form labels are not associated with their inputs

**Severity:** Medium. **Evidence:** Verified hydrated DOM. **Launch gate:** Fix before inviting users.

**Finding:** Login's two fields and signup's three fields had generated label `for` values that differed from manually assigned input IDs. `input.labels.length` was zero. Several authentication/confirmation pages also lacked an `h1`.

**References:** `src/app/login/page.js:119`; `src/app/signup/page.js`; shared Form components.

**Reproduction:** Wait for the actual form, inspect label/input associations, click labels, and navigate using keyboard and a screen reader. Placeholder fallback does not establish a proper visible-label association.

**Remediation:** Use consistent generated IDs or intentionally coordinated IDs, preserve error descriptions, and correct heading structure where appropriate.

**Acceptance:** Each field has an associated label and accessible error; label activation focuses its input; keyboard focus is visible; the main page purpose is expressed semantically.

### SLR-018 — Support updates and Jira synchronization are vulnerable to races

**Severity:** Medium. **Evidence:** Code-supported risk; no real Jira workflow tested. **Launch gate:** Core support consistency before launch; Jira hardening before enabling Jira.

**Finding:** Support reads a ticket and then writes incremented message count and Jira version without transactional reads. Concurrent replies can share a version or lose increments. Jira forwards only the newest message and marks a version synced; replies accumulated during an outage can be omitted externally. Failed issue/comment lookups can be interpreted as no existing record, risking duplicates.

**References:** `src/lib/support-tickets.js:129`; `src/lib/jira-support.js:51`; `src/app/api/admin/support/route.js`.

**Remediation:** Use concurrency-safe state/version updates and idempotent message identifiers. Synchronize all unsent messages. Distinguish lookup errors from empty results. Preserve the internal ticket regardless of Jira availability. Decide whether manual retry is sufficient for the pilot or a scheduled retry worker is needed.

**Acceptance:** Parallel replies retain all history and accurate versions; outage/recovery forwards every intended message exactly once; a failed lookup does not create a duplicate ticket; GO remains usable with Jira unconfigured.

### SLR-019 — Users with account or entitlement problems lack a clear recovery support route

**Severity:** Medium. **Evidence:** Verified UI copy and server policy. **Launch gate:** Resolve before purchases and onboarding.

**Finding:** Support creation and member replies require active membership, while `/contact` directs account and billing problems into that workspace. The listed business address is described as an organization/project-owner channel. Locked-out or incorrectly unentitled users do not have a clearly identified support path.

**References:** `src/app/contact/page.js`; `src/lib/support-tickets.js:70,140`; profile support UI.

**Remediation:** Provide an accessible account/billing recovery channel with an accountable owner. If adding unauthenticated intake, include appropriate validation and abuse controls without exposing ticket histories.

**Acceptance:** A visitor, free user, expired member, and locked-out paying user can identify how to request help; private records remain restricted; staff know where those requests arrive.

### SLR-020 — External resource protection and file-safety checks are incomplete

**Severity:** Medium, potentially High depending on the promised access model. **Evidence:** Verified redirect architecture; external enforcement and file safety untested.

**Finding:** GO authorizes short-lived open tickets but ultimately redirects users to external destinations. That does not revoke knowledge of a destination after it is opened. Video administration explicitly states that GO does not upload, stream, or synchronize external permissions. Asset submissions use external links and safety declarations; malware scanning and external ACL enforcement were not demonstrated.

**References:** `src/app/asset-packs/[packId]/open/route.js`; `src/app/resources/[resourceId]/open/route.js`; `src/app/video-bundles/[slug]/open/route.js`; `src/lib/asset-packs.js`; video administration UI.

**Remediation:** Confirm the intended threat model and provider permissions. Test destination access independently of GO, including after entitlement changes. Establish provenance, licensing, and file-review procedures. Add scanning or stronger delivery enforcement if required by the actual product promise; do not assume a full upload service is required.

**Acceptance:** Open-ticket expiry/replay/revocation tests pass; destination behavior is understood and accurately described; files offered at launch have reviewed provenance, licenses, and safety checks.

### SLR-021 — Performance and native tooling need a measured baseline

**Severity:** Medium for runtime performance; Low for nonblocking tool warnings. **Evidence:** Verified build sizes and timing observations.

**Finding:** Login and signup each reported approximately 892 kB first-load JavaScript. Seven of 76 additional browser navigations timed out waiting for network idle. Native SWC reported an invalid Win32 binary, but builds and tests still ran. These observations do not establish seven broken pages or a failed production build.

**References:** build output; `src/utils/avatarGenerator.js` imports; authentication pages; Next.js/toolchain configuration.

**Remediation:** Profile the actual bundle before changing imports; reduce avoidable authentication load. Measure mobile user-visible performance and request behavior. Use meaningful readiness signals in tests, while still investigating persistent failed requests. Reproduce dependency installation on a clean supported runtime.

**Acceptance:** Core routes meet agreed performance targets on realistic mobile/network conditions; no unexplained critical timeouts remain; build/start succeed reproducibly without reliance on a broken native installation.

### SLR-022 — Email delivery, worker operation, and failure handling require fresh evidence

**Severity:** Medium, High if essential delivery is failing. **Evidence:** Partially verified historical queue inventory.

**Finding:** The outbox contained 202 jobs: 161 sent, 33 suppressed, two failed, and six pending. The six pending jobs were scheduled for the future, not overdue. Failed records included `project.created` and `newsletter.confirm`. No fresh verification/reset/newsletter delivery journey was completed. Historical sent status is not proof of present inbox delivery.

**References:** `src/lib/email/outbox.js`; `src/lib/auth-verification.js`; `.github/workflows/email-outbox.yml`; `src/lib/githubActionsOidc.js`; `docs/EMAIL_SETUP.md`.

**Remediation:** Investigate failed jobs with redacted diagnostics; test fresh essential and optional delivery, suppression, bounces, provider webhooks, and retry behavior. Verify the scheduled workflow runs from the expected branch and that partial worker failures produce actionable signals. The worker can return 200 with a waitlist error in its response body; monitoring must account for partial failures, not only HTTP failure.

**Acceptance:** Verification, reset, welcome, billing, learning/mentorship, and newsletter flows are evidenced as applicable; opt-out and suppression are respected; the worker runs reliably; missed or failed jobs alert an owner without creating duplicate mail.

### SLR-023 — Authentication logging and public error details expose unnecessary information

**Severity:** Low; reassess if secrets or sensitive payloads are found. **Evidence:** Verified source behavior.

**Finding:** Google sign-in logs complete user-related objects. Some API errors include raw exception messages, and the Firebase setup error branch exposes operational diagnostics. This audit did not establish a public secret leak from those logs. A limited source scan found private-key-related utility code, not a demonstrated embedded credential.

**References:** `src/mobx.js` Google sign-in flow; `src/app/api/applications/[id]/route.js:267`; `src/app/api/auth/verify/route.js`.

**Remediation:** Remove complete identity/session-object logging; use redacted structured diagnostics and stable public error codes. Review log access/retention. Historical documentation mentions token rotation, but rotation status was not verified; do not claim that a token is currently compromised from that note alone.

**Acceptance:** Production browser/server logs and API responses contain no tokens, secrets, unnecessary profile payloads, or implementation diagnostics intended only for developers.

### SLR-024 — Deferred features must remain explicit, not be confused with regressions

**Severity:** Informational. **Evidence:** Verified planned/disabled states. **Launch gate:** Product-scope decision.

**Finding:** `/resources/media` correctly renders a planned-library notice. Under-18 mentorship and individually paid courses are disabled. Jira was unconfigured in the local environment. These are not automatically defects requiring new feature implementation.

**References:** `src/app/resources/media/page.js`; `src/lib/product-config.js`; `docs/launch-readiness-migration.md`.

**Remediation:** Revisit after feature development. Classify each feature as included, deliberately deferred, or retired. If included, add its implementation work and acceptance tests to the estimate rather than silently inheriting the old estimate.

**Acceptance:** The launch offering and UI accurately identify what exists; deferred features do not interrupt core journeys or imply available paid benefits.

## 4. Route, capability, and integration inventory

The audited tree contained 67 page routes, 85 API routes, and three additional protected-content open handlers. Re-enumerate after feature work.

### Pages

| Area | Audited routes |
| --- | --- |
| Public/information | `/`, `/about`, `/community`, `/contact`, `/faq`, `/events`, `/games`, `/blog`, `/blog/[slug]`, `/privacy`, `/terms`, `/cookies` |
| Authentication | `/login`, `/signup`, `/reset-password`, `/verify-email` |
| Account/profile | `/profile`, `/profile/cv`, `/onboarding`, `/user/[id]` |
| Projects | `/projects`, `/project/create`, `/project/[id]`, `/project/[id]/edit`, `/sourceProject/[id]` |
| Membership | `/membership`, `/checkout`, `/billing`, `/subscription/success` |
| Mentorship | `/mentorship`, `/mentorship/[mentorId]` |
| Learning/resources | `/education`, `/education/[slug]`, `/education/[slug]/participants`, `/resources`, `/resources/media`, `/packages/[slug]`, `/asset-packs`, `/video-bundles`, `/video-bundles/[slug]` |
| Newsletter | `/newsletter/confirmed`, `/newsletter/preferences` |
| Admin | `/admin`; `/admin/{dashboard,users,projects,packages,subscriptions,settings,skills,newsletter,learning,video-bundles,training-assignments,mentorships,asset-packs,resources-review,support}` |
| Compatibility | `/become-member`, `/pricing`, `/subscribe`, `/dashboard`, `/cv`, `/initiatives`, `/matchmaking`, `/mentors`, `/mentors/[mentorId]` |

Brace expressions in this report abbreviate separate routes; they are not literal URLs.

### API routes

Every path in this table is relative to `/api`. Individual operations must be re-enumerated from current exports before testing.

| Area | Routes and responsibilities |
| --- | --- |
| Admin: 17 routes | `/admin/{asset-packs,billing,check,dashboard-analytics,learning-items,mentorships,newsletter,packages,product-settings,projects,resources-review,skills,sourceProjects,support,training-assignments,users,video-bundles}`: list/review/manage platform data, grants, settings and operations. |
| Auth/profile/CV: 15 routes | `/auth/{verify,verification-resend}`, `/me/{cv,learning,mentor-availability,mentor-profile,profile}`, `/onboarding`, `/onboardingEmail`, `/welcomeEmail`, `/user/update`, `/user/packages`, `/user/[id]`, `/user/[id]/projects`, `/users/[id]/cv`. |
| Projects/applications: 7 routes | `/projects`, `/projects/[id]`, `/projects/[id]/members/[memberId]`, `/sourceProjects`, `/sourceProjects/[id]`, `/applications`, `/applications/[id]`. |
| Billing: 8 routes | `/checkout`, `/billing/{cancel,orders,portal,subscription}`, `/subscription/{portal,upgrade,webhook}`. |
| Mentorship: 11 routes | `/mentors`, `/mentors/[mentorId]`, `/mentorship/dashboard`, `/mentorship/mentor-application`, `/mentorship/requests`, `/mentorship/requests/[requestId]`, `/mentorship/suggestions`, `/mentorship/applications/[applicationId]`, `/mentorship/engagements/[engagementId]`, plus the engagement `/feedback` and `/report` routes. |
| Learning: 5 routes | `/learning-items`, `/learning-items/[slug]`, and its `/enrollment`, `/participants`, `/session-access` handlers. |
| Resources/video: 7 routes | `/asset-packs`, `/packages`, `/packages/[slug]`, `/public-packages`, `/video-bundles`, `/video-bundles/[slug]`, `/video-bundles/[slug]/progress`. |
| Support: 3 routes | `/support`, `/support/[ticketId]`, `/webhooks/jira`. |
| Newsletter/email: 8 routes | `/newsletter/{confirm,preferences,resend-confirmation,subscribe,unsubscribe}`, `/webhooks/resend`, `/cron/email-outbox`, `/notifications`. |
| Public content: 4 routes | `/blog`, `/skills`, `/go-events`, `/go-events/[eventId]/join`. |

The API family counts sum to 85. Protected opens outside `/api` are `/resources/[resourceId]/open`, `/asset-packs/[packId]/open`, and `/video-bundles/[slug]/open`.

### Integration boundaries

| System | Responsibility | Evidence still needed |
| --- | --- | --- |
| Firebase Auth | Email/password, Google, anonymous-account upgrade, verification, reset and tokens | Successful lifecycle, provider/domain configuration, disabled/revoked account behavior, cross-tab/session expiry. |
| Firestore | Profiles, projects, memberships, learning, mentorship, resources, support and queues | Current rules/indexes, concurrent writes, migrations, backup/restore, role isolation. |
| Polar | Products, checkout, billing portal, subscriptions, refunds and signed events | Full sandbox lifecycle and controlled production smoke; event ordering/replay; customer/account mapping. |
| Resend/Firebase email paths | Transactional messages, verification, reset, newsletter and delivery events | Inbox delivery, retry/deduplication, bounce/suppression, preferences, signed webhook rejection. |
| GitHub Actions | Scheduled email/waitlist worker | Successful scheduled OIDC runs and actionable partial-failure monitoring. |
| WordPress/calendar | Public blog and event data | Upstream outage, invalid content, cache freshness, time-zone and join-link behavior. |
| Google Drive/external media | Final resource/video destinations | Actual ACLs, link persistence after expiry, provenance, licensing and safety. |
| Jira, optional | Staff support synchronization | Credentials/configuration, concurrency, outages, replay, bidirectional privacy and completeness. |
| Analytics | Consent-controlled measurement | Production consent behavior and event delivery without sensitive data; audit tests covered disabled mode/control UI only. |

## 5. Required acceptance-test matrix

### Personas

Prepare fixtures for: signed-out visitor; free user; active Community; active Business; pending Mentor; approved active Mentor; rejected/suspended/expired Mentor; canceled-but-paid-through member; refunded/revoked member; project owner; project admin; project member; assigned instructor; user with an individual grant; platform administrator. Use two unrelated accounts per relevant role for cross-account checks.

### Journeys

| Journey | Required happy path | Required failure/boundary cases |
| --- | --- | --- |
| Signup/login | Email and Google signup, profile creation, login/logout | Duplicate email, invalid input, provider failure, verification send failure, incomplete profile creation, anonymous-account upgrade. |
| Verification/reset/session | Verify email, reset password, persist login after refresh | Expired/reused links, resend limits, expired/revoked tokens, disabled account, logout/back navigation, cross-tab changes, return URL safety. |
| Onboarding/profile/CV | Save steps, resume, complete, edit, publish, view and export | Invalid values, denied consent, save failure, concurrent edits, draft visibility, regenerate/publish behavior, privacy changes across mirrors. |
| Membership | Each offered tier/interval -> checkout -> verified activation -> benefit | Duplicate clicks, response loss, forged return parameters, delayed/out-of-order webhooks, replay, cancellation through period end, renewal failure, full/partial refund, revoke, upgrade scheduling, portal/account ownership. |
| Projects | Create, edit, submit/moderate, publish, discover, archive/restore | Role/ownership denial, private/draft discovery exclusion, invalid state changes, duplicate creation, retry, deletion cleanup and audit. |
| Applications/team | Consent/share intended CV, apply, review, approve, remove/withdraw | Parallel duplicate submissions, parallel approvals, competing transitions, immutable snapshot, unauthorized manager, partial write/email failure. |
| Mentorship | Apply/interview/approve, browse, request, forward, accept, check in, complete, feedback/report | Suspension/expiry, capacity races, duplicate requests, rejected transitions, privacy of notes/contact/schedules, communication failure, deadline handling. |
| Learning | Publish, enroll, approve, waitlist, accept offer, view session, cancel | Capacity races, duplicate enrollment, expired offers, unauthorized participant/session access, invitation/grant changes, inaccessible private links, email failure. |
| Resources/video | Review/publish, grant access, open/download, save progress | Anonymous/direct document reads, URL leakage, ticket replay/expiry, grant revocation, archived versions, external permission mismatch and unsafe file handling. |
| Support | Create, reply, close/reopen, staff reply, optional Jira sync | Locked-out/unentitled recovery route, other user's ticket, duplicate submit, concurrent replies, closed-ticket reply, Jira timeout/retry/lookup errors. |
| Newsletter/notifications | Consent, subscribe, confirm, preferences, unsubscribe, read notifications | Invalid input, duplicate submit, rate limit, expired/tampered link, provider outage, suppression/bounce, notification ownership. |
| Admin/operations | Review users/content, grants, billing, audit and queues | Non-admin and stale-permission access, reason/confirmation requirements, failed mutations, pagination, restore and rollback. |

Across every applicable flow, verify loading, empty, error and success states; keyboard access; mobile/tablet/desktop layouts; duplicate submits; refresh/back navigation; network failure; persistence; session expiry; and authorization at the API/database layer. Record what was actually tested, not merely the existence of a test file.

No valid payment, refund, mail send, grant, deletion, or production data mutation is implied by this historical report. Run integration cases against isolated fixtures; identify any separately authorized live release smoke tests explicitly.

## 6. Remediation sequence and effort estimate

These are planning estimates from the audit, not a promise of elapsed autonomous runtime. Feature additions, dependency drift, missing access, and defects discovered during integration testing may change them. Re-estimate after revalidation.

| Sprint | Deliverables / issue IDs | Exit condition | Effort |
| --- | --- | --- | --- |
| 1. Security and deployment foundation | SLR-001 through 006; staging setup; recovery configuration planning in SLR-011 | Rules protect data and approval; required queries work; dependencies/configuration pass checks; isolated testing is available. | 10–16 hours |
| 2. Data integrity and privacy | SLR-008, 009, 010, 014; critical validation/regression tests | Concurrency and state consistency demonstrated; CV sharing policy enforced; grants/migrations reconciled safely. | 10–16 hours |
| 3. Communications and support | SLR-007, 018, 019, 022 | Messages queue/deliver/retry; core support works; optional Jira behavior verified if included. | 8–14 hours |
| 4. Product, accessibility and release gates | SLR-013, 015, 016, 017, 020, 021, 023, 024 | Honest available offering; usable forms; reliable UI checks; measured performance; enforced gates. | 9–15 hours |
| 5. Release rehearsal | SLR-012; restore/rollback evidence for SLR-011; full regression and provider smoke | Exact release candidate passes the mandatory role/journey gates, with evidence. | 8–14 hours |
| **Total** | **45–75 active hours; 60-hour working target plus 15-hour contingency** | | **45–75 hours** |

The earlier planning allowance was approximately 8–12 working days, or 2–3 calendar weeks with coordination and retesting. This is conditional on access and prompt decisions, and is not a conversion of agent work into guaranteed calendar time.

The estimate excludes building deferred features, producing courses/assets, conducting mentor interviews, and extensive redesign. It includes fixing the audited implementations and verifying them. A deliberately narrower launch was previously estimated at 30–45 hours, but security, billing, privacy, recovery, and data integrity cannot be deferred merely to meet that number.

### Inputs to settle before implementation

- Final feature/benefit scope and the candidate branch/revision.
- Isolated Firebase, Polar, and email testing configuration; role accounts and inboxes.
- Approved application-withdrawal/team-access and CV-sharing policies.
- Authoritative mapping of intentional membership grants and billing sources.
- Recovery permissions, owner, retention/cost decisions, and restore target.
- Whether Jira is part of the soft launch.
- Owners and actual launch content for education, mentorship and resources.
- The production deployment process and authority for specific live smoke operations.

Preparation, local fixes, tests, and read-only checks can proceed without treating every routine implementation choice as a new decision. Material business-policy or production-impact choices should be made concrete and reviewable.

## 7. Final release gates

| Gate | Historical status | Evidence required to pass |
| --- | --- | --- |
| Direct data access and approval protection | Fail | Deployed rules verified; negative role tests pass; exposed resource links reviewed. |
| Database queries | Fail | All required indexes ready and actual queries executed. |
| Dependency exposure | Fail pending remediation | Current audit and deployment-specific assessment; updated regression evidence. |
| Billing configuration/lifecycle | Local fail; full lifecycle unverified | Valid products/environment; complete sandbox lifecycle; separately authorized live smoke. |
| Communications | Fail/partial | Caller-to-outbox and provider delivery/retry evidence; worker monitoring. |
| Application/team integrity | Fail | Concurrent/retry/failure tests preserve a consistent state. |
| CV privacy | Fail | Explicit sharing policy, server enforcement and immutable approved snapshot tests. |
| Authentication and role boundaries | Partial | Full critical role/journey matrix, including unrelated-account denial. |
| Launch offering/content | Scope unresolved | Every included benefit usable and accurately represented. |
| UI/accessibility/performance | Partial | Label fixes, reviewed browser regressions, meaningful performance baseline. |
| Build and test enforcement | Build pass; assurance incomplete | Reproducible build and all mandatory automated layers run. |
| Recovery and operations | Unproven | Backup/restore and rollback rehearsal, protections, alert ownership. |

Minimum invitation criteria: no unresolved launch-blocking security or integrity defect; essential account/purchase/use/support journeys pass; paid benefits exist; communications work; private data stays private; recovery is demonstrated; and any remaining lower-severity issue has an explicit owner, impact assessment, and accepted workaround.

Do not declare readiness solely because compilation, unit tests, or screenshots pass. A failing gate can be removed only by a deliberate change in launch scope, not by suppressing its evidence.

## 8. Template for tracking each issue during the future fix cycle

```text
Issue ID:
Current status: Needs revalidation / Confirmed / In progress / Fixed locally /
                Deployed / Verified / Deferred by scope / Blocked / No longer applicable
Current commit and environment:
Current reproduction and evidence:
Business rule / assumption:
Implementation summary:
Tests executed and results:
Deployment or data action required:
Remaining risk or blocker:
Final acceptance evidence:
```

## 9. Starter prompt for the later remediation task

Use this after feature development is complete, adapting the environment and authority details:

```text
Use docs/SOFT_LAUNCH_AUDIT_AND_REMEDIATION_REPORT.md as the historical issue register
for preparing this platform for soft launch. Feature work has continued since the
audit, so first revalidate the findings against the current repository, application,
deployment configuration and intended launch scope.

Preserve existing feature work and unrelated changes. Record the current revision.
Re-enumerate routes, roles and integrations, then classify every SLR issue as still
present, already resolved with evidence, superseded, intentionally deferred, or
blocked. Add new launch-critical findings introduced since the audit.

Implement the confirmed code and test fixes in the report's dependency order.
Reproduce critical defects before fixing them and add meaningful regression tests,
especially for authorization, concurrent writes, idempotency, CV privacy, email
contracts and membership lifecycle. Do not rewrite intended UI or weaken tests to
make historical expectations pass. Do not silently disable intended launch features.

Use isolated services and fixtures for account, payment, email and destructive
tests. Produce dry-run reports for data reconciliation and migrations. Do not
revoke memberships based only on legacy collection counts. Distinguish local
configuration from actual deployment configuration. Refresh security advisories.

State material missing business decisions early and continue independent work.
Make any production deployment, permission change, data migration, real payment,
refund or email operation concrete and reviewable, and perform it only within the
authority explicitly provided for this task. Never expose secrets in reports.

Maintain the SLR issue register with implementation, tests, deployment requirements,
and acceptance evidence. Complete all authorized work and report external blockers
precisely. Conclude with changes made, checks run, remaining issues, recovery
readiness, and a Ready / Ready with conditions / Not ready verdict for the exact
release candidate. Never mark untested or blocked behavior as verified working.
```

## 10. Related repository references

- `docs/TEST_PLAN.md` — existing personas and manual regression expectations.
- `docs/production-release-checklist.md` — release environment, billing and authorization checks.
- `docs/launch-readiness-migration.md` — canonical architecture and migration guidance.
- `docs/POLAR_SETUP.md`, `docs/mentor-checkout.md`, `docs/polar-webhook-replay.md` — billing setup and replay guidance.
- `docs/EMAIL_SETUP.md` — delivery, outbox, newsletter and operational checks.
- `docs/GO_MANUAL_TESTS_GOOGLE_SHEETS.csv` — historical manual test inventory; statuses may be stale.
- Browser artifacts generated during the audit — useful supporting examples, but transient and potentially overwritten by subsequent test runs.

When guidance conflicts with the current implementation or newer product decisions, record the discrepancy and resolve it explicitly. This report is the remediation baseline, not an instruction to revert later improvements.
