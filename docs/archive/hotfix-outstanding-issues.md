# Outstanding issues hotfix release dossier

Branch: `codex/hotfix-outstanding-issues`

Baseline: `7a0f337 feat: add verified subscription confirmation flow before onboarding`

Production deployment: **not performed; explicit approval is still required**

## Release gate

- Complete unit/integration suite: **223 passed, 0 failed**
- Static checks: **passed with 0 errors**. Pre-existing warnings remain in
  unrelated hook/image code.
- Production build: **passed** with Next.js 15.3.8; 85 app pages/routes were
  generated.
- Browser verification: local production build returned HTTP 200 for
  `/membership`, rendered meaningful desktop/mobile content, switched the
  billing interval, and showed no console errors, page errors, or framework
  error overlay. `/projects` also rendered without browser errors.
  An unauthenticated `/project/create` request correctly preserved its return
  path at `/login?redirect=/project/create`.
- Authenticated-only Community, profile, onboarding, application, and resource
  states were verified by route/component tests. No real customer account,
  Polar subscription, Firestore production record, or email delivery was used.

## Issue matrix

| # | Existing status | Reproduction and root cause | Files changed | Test/evidence | Final status |
|---|---|---|---|---|---|
| 1 | DONE | The project status filter already initializes to all appropriate statuses and retains later selection. | None | Existing project visibility/filter coverage; local `/projects` browser load | **Verified** |
| 2 | DONE | Create and edit save handlers already expose progress/errors and prevent duplicate submits. | None | Existing `projects-route`, form, and project-update tests | **Verified** |
| 3 | RETEST | Optional budget paths already accept absence, remove a previous budget, and hide missing values. | None | Existing project create/update and budget utility tests | **Verified** |
| 4 | DONE | Authorized project owners/admins can access application CV snapshots; unrelated users cannot. | None | Existing application and CV authorization tests | **Verified** |
| 5 | IN REVIEW | Email signups receive a persisted DiceBear avatar, Google users retain their provider photo, and Radix fallback initials render. There is no complete upload/replacement UI or approved storage/file-validation policy. | None | Code audit of auth normalization, avatar generation, and avatar components | **Needs decision** |
| 6 | RETEST | Owner/admin permanent delete, archive, explicit confirmation, and related application/user-reference cleanup already exist. | None | Existing project delete authorization/cleanup tests | **Verified** |
| 7 | TODO | Fixed-option primary roles did not use the community directory. Primary role now accepts directory suggestions or a normalized custom tag. | `src/app/onboarding/page.js`, `src/app/api/onboarding/route.js`, `src/components/profile/SkillSelector.jsx` | Onboarding persistence and skill-selector tests | **Fixed** |
| 8 | TODO | Secondary roles were fixed chips only. They now use suggestions plus custom tags, case-insensitive deduplication, and an eight-role limit. | Same as #7 | Onboarding normalization tests | **Fixed** |
| 9 | TODO | Persisted values were ambiguous labels. The stored IDs remain unchanged for compatibility, while UI labels/descriptions now explain Learning, Developing, Independent, Advanced, and Production-proven. | `src/constants/onboarding.js`, `src/app/onboarding/page.js` | Production build and source review | **Fixed** |
| 10 | TODO | Tools were fixed chips and could not cover normal names. They now provide common suggestions and custom tags while preserving spaces, punctuation, and commas during entry. | `src/components/profile/SkillSelector.jsx`, `src/app/onboarding/page.js`, `src/app/api/onboarding/route.js` | CV input and onboarding normalization tests | **Fixed** |
| 11 | RETEST | Membership-required application messaging, `/membership` CTA, and server-side active-member enforcement already exist. | None | Existing application-create and membership-gate tests | **Verified** |
| 12 | RETEST | Project owners/admins can remove non-owner members; server logic prevents owner/admin removal and updates approved applications. No new email is sent without an approved event. | None | Existing project-member route tests | **Verified** |
| 13 | RETEST | Canceling users retain paid access through period end and are offered a replacement membership once the subscription is no longer active. | None | Membership UI and webhook status tests | **Verified** |
| 14 | RETEST | Generic premium CTAs route to `/membership`; they do not silently select the cheapest checkout. | None | Existing pricing/subscribe redirect tests; browser membership navigation | **Verified** |
| 15 | IN REVIEW | No `Permissions-Policy`, CSP `display-capture`, DRM integration, screen-recording CSS, or related response header was found locally. The symptom is therefore likely browser/OS/extension-specific. Security was not weakened. | None | Header/config/source audit | **Needs decision** |
| 16 | RETEST | Firebase verification and GO welcome mail are separate authenticated flows. GO welcome enqueueing uses permanent semantic deduplication and returns readable API failures. | None | Existing welcome, outbox, and verification tests | **Verified** |
| 17 | DONE | Current Google auth normalization no longer reads an undefined `authStateVersion`, and login routing selects profile/onboarding appropriately. | None | Existing auth-profile and auth navigation tests | **Verified** |
| 18 | RETEST | Guest access preserves `/project/create` as a login return path; signed-in free/Community users are routed to Business membership. The create API independently requires Business/admin rights. | None | Project-creation gate/API tests; local guest browser evidence | **Verified** |
| 19 | DONE | Apply already provides loading/success/duplicate/error feedback and persists a CV snapshot. | None | Existing application-create tests | **Verified** |
| 20 | RETEST | Business/admin creation rights are enforced in both UI and API; Community/free members receive a Business explanation/CTA. | None | Project creation gate and API permission tests | **Verified** |
| 21 | RETEST | A new checkout for an active Community member caused Polar's duplicate-active-subscription response. The server now uses Polar's supported subscription product update with `prorate`, prevents surprise cross-interval changes, and never trusts a browser product ID. Upgrade confirmation waits for the server-verified Business tier instead of an initial-purchase receipt. | `src/app/api/checkout/route.js`, `src/app/subscription/success/page.js`, `src/components/pricing/PricingDisplay.js`, `src/components/ui/SubscribeButton.jsx`, `src/lib/subscription-confirmation.js` | Checkout upgrade, interval-safety, no-new-checkout, and verified target-tier confirmation tests | **Fixed** |
| 22 | RETEST | Profile already provides the onboarding-edit route and reloads the member's saved onboarding session. | None | Existing me/profile/onboarding edit tests | **Verified** |
| 23 | RETEST | The authoritative API accepted valid normalized usernames, but the UI then attempted a second direct Firestore write that could fail under production rules and make a successful save look partial. The duplicate write is removed; Bio/About/name/skills mirror through the server and the store refreshes afterward. | `src/components/profile/ProfileEditor.jsx`, `src/app/api/user/[id]/route.js`, `src/utils/validateProfile.js` | Username, skills, social validation, structured-profile mirror, and save tests | **Fixed** |
| 24 | IN REVIEW | Resources are referenced by membership benefits, package/download routes, email copy, existing content, and entitlement APIs. Removing them would break a paid promise and current content. Recommendation: retain the feature and use sustainable release wording. | None for removal; wording files listed in #36 | Route/content audit | **Needs decision** |
| 25 | RETEST | The final project wizard already shows progress, disables repeat submission, surfaces errors, creates once, and routes to the new project. | None | Existing project form/create route tests | **Verified** |
| 26 | TODO | Resend sender, branded HTML/plain text, authenticated five-minute external worker, retry/final-failure behavior, suppression, HTML escaping, and permanent deduplication are already implemented. `order.paid` and `subscription.active` share one activation dedupe key. | Email benefit wording only in `src/lib/email/templates/events.js` | Existing Resend webhook, outbox, worker, template-tier/interval, escaping, and Polar event-order tests | **Verified** |
| 27 | TODO | The return flow already verifies an opaque server-created confirmation, polls delayed webhooks, times out with retry/support guidance, acknowledges once, and does not trust URL parameters. | None | Existing confirmation-state, success-dialog, polling, and webhook tests | **Verified** |
| 28 | TODO | Onboarding now treats the selected display name as authoritative and mirrors it to legacy `users.username`; public/legacy reads remain compatible. | `src/app/api/onboarding/route.js`, `src/app/api/user/[id]/route.js` | Onboarding and user-profile persistence tests | **Fixed** |
| 29 | TODO | A single long biography was overloaded. Separate 150-character Bio and 10,000-word About Me fields now cover onboarding, profile editing, both Firestore shapes, public/self profiles, and CV summaries. Long legacy biographies safely fall back to About Me without overwrite. | `src/utils/validateProfile.js`, `src/components/profile/ProfileEditor.jsx`, `src/app/onboarding/page.js`, `src/app/api/onboarding/route.js`, `src/app/api/me/profile/route.js`, `src/app/api/user/[id]/route.js`, `src/app/(main)/profile/page.js`, `src/app/user/[id]/page.js`, `src/lib/cv-generator.js` | Boundary, oversized, legacy fallback, structured persistence, escaping, and CV tests | **Fixed** |
| 30 | TODO | Membership cards did not distinguish an active Community plan from its Business upgrade. The current plan now gets a badge and Business becomes the primary target for an eligible Community member. | `src/components/pricing/PricingDisplay.js` | Membership-state tests; responsive public membership browser evidence | **Fixed** |
| 31 | TODO | The redundant client Firestore update after a successful API save caused the observed misleading “Failed to fetch/save” behavior under stricter production rules. One authenticated server request is now authoritative; error copy remains actionable and form state is preserved on failure. | `src/components/profile/ProfileEditor.jsx`, `src/app/api/user/[id]/route.js` | Profile save/API tests | **Fixed** |
| 32 | TODO | Downloads only checked legacy `unlockedPackages`, ignoring the authoritative active-member entitlement endpoint. The UI now fetches public releases and `/api/user/packages` in parallel; the server grants all published packages to active Community/Business/admin users and keeps free/expired/revoked users locked. | `src/components/profile/Downloads.jsx` | Existing full user-package entitlement matrix and package-detail tests | **Fixed** |
| 33 | TODO | The history query combined an equality filter and descending order without a deployed composite index, causing empty/error states. It now performs the private equality query and sorts newest-first in memory, with loading, empty, error/retry, project, role, date, status, and action UI. | `src/app/api/applications/route.js`, `src/mobx.js`, `src/app/(main)/profile/page.js` | Applicant-only newest-first history test | **Fixed** |
| 34 | TODO | No authorized Google Forms creation connection or production-import approval was available. A complete 30-field questionnaire, backward-compatible schema, validation rules, CSV template, and dry-run-first idempotent admin ingestion plan are delivered. | `docs/legacy-project-intake.md`, `docs/legacy-project-import-template.csv` | Document/schema review; no production import | **Partially fixed** |
| 35 | TODO | Completing onboarding enqueued an unwanted `onboarding.completed` email. That enqueue was removed while state updates, CV generation, and reminder cancellation remain intact. | `src/app/api/onboarding/route.js` | Completion test proves no event is queued | **Fixed** |
| 36 | TODO | Membership/admin/download/email copy promised monthly packages. All such promises now describe periodic/occasional releases based on community needs and activity; existing content remains. | `src/constants/membership.js`, `src/components/profile/SubscriptionStatus.jsx`, `src/components/profile/Settings.jsx`, `src/components/profile/Downloads.jsx`, `src/components/newsletter/NewsletterPreferencesForm.jsx`, `src/app/admin/packages/page.js`, `src/components/admin/PackageForm.jsx`, `src/lib/email/templates/events.js` | Repository-wide copy search and full build | **Fixed** |
| 37 | TODO | Profiles showed account “Joined” time only. “Member since” now prefers first paid `membershipActivatedAt` and clearly falls back to account creation for legacy/free users. | `src/app/api/user/[id]/route.js`, `src/app/(main)/profile/page.js`, `src/app/user/[id]/page.js` | Paid-date and legacy-fallback serialization tests | **Fixed** |
| 38 | TODO | Public project team serialization and UI included email addresses. Public member responses now contain only UID, username, and avatar; reads no longer create user documents as a side effect. Authorized applicant-review data remains separate. | `src/app/api/projects/[id]/route.js`, `src/app/project/[id]/page.js` | Public team privacy regression test | **Fixed** |
| 39 | TODO | Onboarding had minimal unstructured portfolio fields and did not consistently capture projects/tools once. It now uses structured portfolio links and project entries with title, role, status, link, description, and tools; legacy links remain editable and CV generation consumes the same profile facts. | `src/app/onboarding/page.js`, `src/app/api/onboarding/route.js`, `src/lib/cv-generator.js`, `src/app/api/me/profile/route.js` | Empty/populated onboarding and CV tests | **Fixed** |
| 40 | TODO | Discord username was labeled required and joined state was not modeled separately. Username is optional, joined state and invitation eligibility persist separately, and non-joined members see the safe GO invite link. The data hook exists, but no invitation email is enqueued until placement/copy are approved. | `src/constants/onboarding.js`, `src/app/onboarding/page.js`, `src/app/api/onboarding/route.js` | Onboarding persistence/no-completion-email tests; accessible labels in production build | **Partially fixed** |

## Browser evidence

- `hotfix-membership-desktop.png`: complete desktop membership page, responsive
  card layout, sustainable resource wording, and both checkout choices.
- `hotfix-membership-mobile.png`: annual selection and single-column mobile
  membership layout.
- `hotfix-project-create-guest.png`: unauthenticated create-project guard with
  the `/project/create` return path preserved.
- `hotfix-projects-mobile.png`: projects route rendered at mobile width without
  framework or console errors.
- `hotfix-subscription-verification-guest.png`: direct visits remain in the
  verification state and do not fabricate a confirmation.

Authenticated screenshots were intentionally not fabricated. A disposable
local Firebase test account is needed to capture the current-Community badge,
Business upgrade highlight, profile editor, onboarding form, application
history, and entitled downloads without using a real production member.

## Data and migration implications

All Firestore changes are additive and backward-compatible:

- `users`: `username` is the legacy mirror of authoritative onboarding
  `display_name`; `bio`, `aboutMe`, and `profileTags` are additive.
- `user_profiles`: additive `bio`, `about_me`, `discord_joined`,
  `discord_invitation_eligible`, structured `portfolio_links`, and
  `past_projects`.
- No destructive migration or index is required. Legacy long `users.bio`
  values are read as About Me, and legacy portfolio URL fields are converted
  in-memory for editing.
- Application history no longer depends on a missing composite Firestore
  index.

## External-service and product limits

- **Polar:** the hotfix uses the installed SDK's subscription update API and
  `prorate` behavior for a same-interval Community-to-Business change. A
  cross-interval change is refused because Polar can generate an immediate
  prorated invoice. Tests use mocks only; no real upgrade or charge occurred.
- **Resend:** configuration, templates, outbox, sender, worker authentication,
  retry, suppression, and deduplication passed locally. No customer or test
  email was sent during this hotfix.
- **Firebase:** authenticated UI journeys require a disposable non-production
  account for browser screenshots. Route/component tests cover those states.
- **Google Forms:** a form specification and CSV are supplied, but the form and
  importer were not created/executed because no authorized Forms connection or
  production-data approval was available.
- **Decisions still required:** avatar upload/replacement policy and storage;
  screen-recording reproduction on the affected browser/OS; whether Resources
  should remain (recommendation: keep); Discord invitation email placement and
  final copy.

## Exact proposed hotfix files

Application code:

- `src/app/(main)/profile/page.js`
- `src/app/admin/packages/page.js`
- `src/app/api/applications/route.js`
- `src/app/api/checkout/route.js`
- `src/app/api/me/profile/route.js`
- `src/app/api/onboarding/route.js`
- `src/app/api/projects/[id]/route.js`
- `src/app/api/user/[id]/route.js`
- `src/app/onboarding/page.js`
- `src/app/project/[id]/page.js`
- `src/app/subscription/success/page.js`
- `src/app/user/[id]/page.js`
- `src/components/admin/PackageForm.jsx`
- `src/components/newsletter/NewsletterPreferencesForm.jsx`
- `src/components/pricing/PricingDisplay.js`
- `src/components/profile/Downloads.jsx`
- `src/components/profile/ProfileEditor.jsx`
- `src/components/profile/Settings.jsx`
- `src/components/profile/SkillSelector.jsx`
- `src/components/profile/SubscriptionStatus.jsx`
- `src/components/ui/SubscribeButton.jsx`
- `src/constants/membership.js`
- `src/constants/onboarding.js`
- `src/lib/cv-generator.js`
- `src/lib/email/templates/events.js`
- `src/lib/subscription-confirmation.js`
- `src/mobx.js`
- `src/utils/validateProfile.js`

Tests:

- `tests/unit/applications-route.test.cjs`
- `tests/unit/checkout-route.test.cjs`
- `tests/unit/onboarding-route.test.cjs`
- `tests/unit/profile-skills-ui.test.cjs`
- `tests/unit/project-id-route.test.cjs`
- `tests/unit/subscription-confirmation.test.cjs`
- `tests/unit/user-id-route.test.cjs`
- `tests/unit/validate-profile.test.cjs`

Documentation/data template:

- `docs/hotfix-outstanding-issues.md`
- `docs/legacy-project-intake.md`
- `docs/legacy-project-import-template.csv`

## Rollback plan

1. Do not merge the hotfix until the dossier is approved.
2. If a preview review fails, revert the hotfix commit on its branch; no data
   rollback is needed because no production write or migration occurred.
3. If a later production deployment fails, immediately redeploy baseline
   commit `7a0f337`, then revert the hotfix commit on `prod`.
4. New Firestore fields are additive and ignored by the baseline, so rollback
   does not require deleting member data.
5. Re-run webhook/outbox health checks after rollback. Permanent event
   deduplication remains intact because this hotfix does not reset or delete
   outbox/deduplication records.
