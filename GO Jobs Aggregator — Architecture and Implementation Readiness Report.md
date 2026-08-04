# GO Jobs Aggregator — Architecture and Implementation Readiness Report

Inspection date: 2026-08-04  
Repository: `G:\GO Website\gowebsite`  
Inspected branch: `rss-experiment` at `4317f9e` (`origin/prod`)

## Scope and inspection notes

This is a Phase 1 inspection of the current repository. The working tree was
already substantially modified before this inspection: `git status` reports 68
modified tracked files and many untracked files/directories. Those changes are
treated as pre-existing user work and were not cleaned, reverted, or attributed
to this task. The report is based on the current working tree, not on a clean
checkout of `4317f9e`.

No jobs/feed source files, database rules, indexes, migrations, dependencies,
production files, or navigation changes were implemented. This report is the
only artifact added for Phase 1.

## A. Executive conclusion

### READY WITH MINOR BLOCKERS

The application has a workable foundation for the public portion of a jobs
aggregator: Next.js App Router, server route handlers, Firebase Admin SDK,
Firestore transactions and batches, Firebase Authentication, admin-only API
patterns, audit logging, an external protected scheduler, existing public
directory UI patterns, and a functioning unit/rules/Playwright test stack.

It is not ready to activate real job feeds or release the complete feature yet.
The main constraints are the pre-existing dirty worktree, the failing local
production build, the absence of an approved source/permission registry, the
lack of a confirmed Discord integration contract, no checked-in CI pipeline,
and no repository-visible staging configuration. These do not prevent building
the core public MVP after approval, but they do prevent a trustworthy production
rollout until resolved or explicitly accepted.

## B. Confirmed current architecture

### Application architecture

- Framework: Next.js `15.3.8`, React `18.3.1`, using the App Router under
  `src/app`. Route groups such as `src/app/(main)` are in use.
- Language: JavaScript and JSX only in the inspected `src` and `tests` trees;
  no `.ts` or `.tsx` source files were found.
- Rendering: the application mixes server-rendered pages and client components.
  For example, `/resources` reads Firestore in a server page and uses
  `revalidate = 3600`; `/education`, `/projects`, and profile surfaces are
  client components that call server API routes. Several dynamic data pages and
  API routes explicitly use `force-dynamic`.
- Frontend/backend boundary: Next.js Route Handlers under
  `src/app/api/**/route.js` are the backend boundary. Server modules use the
  Firebase Admin SDK. Client modules use Firebase Auth and, in some existing
  flows, the Firebase client SDK. No Server Actions or separate backend service
  were found.
- Shared layout: `src/app/layout.js` wraps the site in `ReusableLayout`, which
  provides the shared header/footer. Admin routes use a separate client-side
  admin layout and do not render the public header/footer.
- Package manager: npm, evidenced by `package.json` and `package-lock.json`.
  `package.json` requires Node `24.x`. Documented commands are `npm run dev`,
  `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:unit`,
  `npm run test:rules`, and Playwright scripts.
- Configuration: `next.config.js`, `postcss.config.js`, `tailwind.config.js`,
  `.eslintrc.json`, `jsconfig.json`, and `jsconfig.product.json` are present.
  `jsconfig.product.json` enables `allowJs`, but `checkJs` and `strict` are
  false and the type-check includes only a selected list of modules. It is not a
  full-project strict type check.
- Existing external integration: `src/app/api/wordpress/route.js` fetches
  WordPress content server-side. That is an external content integration, not a
  job-feed or generic feed-ingestion service.

### Database and persistence

- Provider: Cloud Firestore, used through `firebase/firestore` on the client and
  `firebase-admin/firestore` through the lazy `adminDb` proxy in
  `src/lib/firebase-admin.js`.
- Query layer: direct Firestore SDK calls. No Prisma, Drizzle, SQL, migration
  directory, or schema migration tool is present. `MIGRATION_ROADMAP.md` is a
  product/code migration document, not a database migration system.
- Existing collections include `users`, `packages`, `projects`,
  `sourceProjects`, `applications`, `orders`, learning/mentorship/asset-pack
  collections, email outbox/consent collections, `product_notifications`, and
  `admin_audit_events`.
- Write conventions: server routes use `new Date()` values, `adminDb.batch()`
  writes, and `adminDb.runTransaction()` for atomic state changes, claims,
  capacity, and idempotency. Existing code also uses deterministic document IDs
  for some idempotent operations.
- Unique constraints: Firestore does not provide relational unique constraints
  for this model. Uniqueness must be implemented with deterministic document IDs,
  transaction claims, or explicit duplicate checks. This is suitable for jobs,
  but it makes the deduplication design and concurrency tests essential.
- Audit and retention: administrative mutations commonly write
  `admin_audit_events`; several operational collections use TTL fields in
  `firestore.indexes.json`. The existing rules keep sensitive collections
  server-only.
- Rules: `firestore.rules` uses default deny. `users` has owner/admin rules;
  `packages` is admin-only from the browser; most product, account, email, and
  operational collections are explicitly denied to browser reads and writes.
- Indexes: `firestore.indexes.json` contains composite indexes and TTL overrides
  for existing features. There is no job-related index or collection today.

### Authentication and free accounts

- Provider: Firebase Authentication. The client store supports email/password,
  Google sign-in, anonymous auth, auth-state hydration, and Firebase ID tokens.
- Server authorization: most API routes accept `Authorization: Bearer <Firebase
  ID token>` and use `getRequestUser()` or equivalent verification. Admin status
  is derived from either the Firebase custom claim `admin` or
  `users/{uid}.admin` through the server Admin SDK.
- Account model: `users/{uid}` stores profile, membership, settings, and admin
  flags. Membership is derived from Polar-written fields such as
  `activeMember`, `membershipTier`, and subscription dates. The current role
  model is platform-admin plus account/membership state; no separate job-curator
  role or capability-based admin permissions were found.
- Anonymous access: public directory patterns exist, while private account
  operations use authenticated server routes. Anonymous auth is supported in the
  client store but is not a substitute for a verified account for private jobs
  data.
- Preferences: `users.settings` currently supports email and package/subscription
  preferences through `/api/user/update`. There is no saved-job, dismissed-job,
  saved-filter, or private job application-status model.
- Existing job-adjacent profile data: onboarding and the GameDev Passport contain
  `looking_for_jobs` and `visibility_job_matching`. These can inform future
  account UX but are not an existing job directory or matching service.

### Hosting and scheduled processing

- Deployment: `.vercel/project.json` identifies a Vercel project named
  `gowebsite`. No `vercel.json` or repository deployment workflow was found.
- Existing scheduler: `.github/workflows/email-outbox.yml` runs every five
  minutes and calls `/api/cron/email-outbox`. It uses a short-lived GitHub OIDC
  token, has a five-minute job timeout, and uses a curl request with a 240-second
  maximum time. The route also supports a `CRON_SECRET` fallback.
- Existing worker behavior: the email route transactionally claims Firestore
  jobs with leases and bounded retries, and also processes existing waitlist and
  mentorship expiry work. This demonstrates a supported pattern for protected
  short-lived scheduled work.
- Platform limit: `docs/EMAIL_SETUP.md` explicitly states that the current
  deployment assumes Vercel Hobby, where Vercel cron is limited to once per day;
  the five-minute email schedule is intentionally external through GitHub
  Actions. The actual Vercel plan and production scheduler state cannot be
  verified from this repository alone.
- Runtime constraints known from the repository: scheduled work must finish in a
  short request, must be idempotent, and must use leases/locks for concurrency.
  No long-running worker, queue service, or dedicated job processor is present.
- Outbound HTTP: server-side `fetch` is used for WordPress, Polar, and Resend
  integrations. No generic SSRF-safe external URL fetcher exists for arbitrary
  feed URLs.
- Secrets: environment variables are documented in `.env.example` and the email
  handoff. Firebase Admin credentials, scheduler credentials, payment keys, and
  email keys are server-side. Local `.env` files exist but their values were not
  inspected or exposed.

### Existing resource, navigation, and UI architecture

- Learn navigation is centralized in `src/lib/navigation.js` and rendered by
  `src/components/Header.jsx`. It currently groups Courses, Workshops, Video
  Bundles, and Resources under a Learn dropdown. Primary top-level navigation
  contains Projects, Matchmaking, Community, and Membership.
- `/education` is a client directory with loading skeletons, tabbed streams,
  error messaging, empty states, and cards. `/resources` is a server page for
  public Firestore-backed resources with attribution/access copy and a resource
  category navigation block.
- `/projects` is the strongest reusable discovery reference: it has server-side
  filtering through `/api/projects`, search, filters, sorting, pagination/load
  more, cards, skeletons, empty states, and responsive layout.
- `/mentors` and `AssetPackDirectory` provide simpler client directory patterns
  with filter controls, loading, error/retry, empty states, badges, and cards.
- Profile tabs are centralized in `src/components/profile/ProfileSectionTabs.jsx`
  and already contain Applications, Notifications, Learning, Mentorships,
  Asset Packs, Billing, and Settings. There is no Jobs tab.
- Admin UI is centralized under `src/app/admin` with a shared sidebar in
  `src/components/admin/Sidebar.jsx`. Admin API routes use server-side auth
  checks and often record audit events. There is no job-source or job-health
  admin surface.
- SEO: `src/lib/seo.js` provides `createMetadata`, `absoluteUrl`, canonical URLs,
  Open Graph metadata, and plain-text helpers. `src/app/sitemap.js` lists static
  and WordPress routes. `src/app/robots.js` disallows admin/API/private paths.
  Resource and project layouts already show how public directory metadata is
  declared.
- Localization: no localization framework or multilingual routing was found;
  the current UI is English with hard-coded customer-facing strings.

### RSS, Atom, Discord, and feed functionality

- No RSS or Atom parser, feed configuration, feed fetcher, feed health model, or
  jobs aggregator module exists in `src`.
- No Discord bot, Discord API client, Discord webhook sender, Discord message
  ID persistence, or `DISCORD_*` environment configuration exists.
- Existing Discord code is limited to invite links, profile/onboarding Discord
  usernames, assets, and product copy. `docs/GO_LAUNCH_CHECKLIST.md` mentions a
  Polar Discord benefit and a deferred Discord OAuth idea, but that is not a bot
  integration.
- The repository has transitive `fast-xml-parser` and `sax` entries in
  `package-lock.json`, but neither is a direct dependency used by application
  source. Their presence is not evidence that RSS/Atom processing is available.
- The requested Discord bot is therefore either outside this repository or not
  currently available for inspection. A separate repository, API, webhook
  contract, or operator-owned channel configuration was not identified.

### Testing and documentation

- Unit tests: Node built-in `node:test`, assembled through
  `tests/unit/index.test.cjs`.
- Rules/integration tests: `@firebase/rules-unit-testing` with the Firestore
  emulator configuration in `firebase.json`; `tests/firestore-rules.test.cjs`
  exercises default-deny and owner/admin behavior.
- Browser tests: Playwright with multiple configs for visual smoke, hero,
  marquee, newsletter, and other product checks. The configs start a local Next
  dev server and use Chrome/device projects.
- CI: only the protected email-outbox GitHub workflow is present. The current
  `HEAD` commit is titled “Remove CI workflow and PR template, back to manual QA
  for now”; no general lint/type/unit/build/e2e CI workflow is checked in.
- Documentation: `README.md` is still the generic create-next-app README.
  `docs/TEST_PLAN.md`, `docs/EMAIL_SETUP.md`, `docs/GO_LAUNCH_CHECKLIST.md`, and
  `docs/production-release-checklist.md` cover current product, email, and
  release operations. There is no jobs architecture, feed permission, jobs
  admin, or jobs QA document.

### Baseline commands actually executed during Phase 1

- Executed and passed: `node --test tests/unit/index.test.cjs` — 381 tests,
  381 passed, 0 failed.
- Executed and passed: `node node_modules/typescript/bin/tsc -p
  jsconfig.product.json` — no diagnostics.
- Executed and passed with existing warnings: `node
  node_modules/next/dist/bin/next lint` — exit code 0. Existing warnings cover
  hook dependencies and raw `<img>` usage.
- Executed and failed: `node node_modules/next/dist/bin/next build`. Compilation
  succeeded, but page-data collection failed after repeated warnings that
  `@next/swc-win32-x64-msvc` is not a valid Win32 application, followed by a
  missing generated `.next/server` chunk (`Cannot find module './8548.js'`).
- Not executed: Playwright browser tests, Firestore emulator/rules tests, and a
  live deployment check. The PowerShell `npm` shim is blocked by the local
  execution policy, so the equivalent Node invocations were used for the
  baseline checks above. No package installation or dependency mutation was
  performed.

## C. Recommended integration architecture

The repository-specific design should keep the website database authoritative;
feed sources and Discord should never independently decide public job status.

```text
Approved RSS/Atom sources
        ↓
Firestore job_sources registry (admin-only; permission-gated and disabled by default)
        ↓
External GitHub Actions schedule → protected Next Route Handler
        ↓
Short-lived per-source lock / idempotency claim
        ↓
Safe HTTP fetcher with SSRF, size, timeout, redirect, and content-type controls
        ↓
job_fetch_runs audit + optional job_raw_items retention
        ↓
RSS/Atom parser → source adapter → normalizer → URL validator/sanitizer
        ↓
Transactionally deduplicated canonical Firestore jobs
        ↓
job_source_links + duplicate candidates + status transition audit
        ↓
Public job DTO API → /jobs directory → /jobs/[slug] detail pages
        ↓                                      ↘
Validated original publisher application URL                 Discord event adapter (optional)
                                                               ↓
                                                   Discord channel/message delivery
```

Recommended boundaries:

1. `src/lib/jobs/fetcher.js` owns outbound feed requests and must never be
   called from a client component.
2. `src/lib/jobs/xml.js`, `src/lib/jobs/adapters/`, and
   `src/lib/jobs/normalize.js` convert untrusted feed content into a bounded
   internal shape. Parsing must not be embedded in UI code.
3. `src/lib/jobs/dedupe.js` and `src/lib/jobs/status.js` own canonical record
   identity and conservative state transitions.
4. `src/lib/jobs/repository.js` owns Firestore reads/writes, deterministic IDs,
   transactions, and fetch locks. Discord calls must not be placed in models or
   inside the canonical database transaction.
5. A protected `/api/cron/jobs-ingest` route should be a separate worker from
   `/api/cron/email-outbox`, while using the same GitHub OIDC/`CRON_SECRET`
   authorization pattern. A second protected verification route can be added in
   Phase 5.
6. Public `/api/jobs` and `/api/jobs/[slug]` routes should return explicit safe
   DTOs only. Raw feed payloads, source credentials, internal audit data, and
   private account records must never be returned.
7. Discord should consume a canonical `job.published` or `job.status_changed`
   event through an isolated adapter or documented internal webhook. A Discord
   failure must not roll back a successful Firestore ingestion.

## D. Reuse versus new development

| Existing component or service | Reuse as-is | Extend | Replace | New module required | Reason |
| --- | --- | --- | --- | --- | --- |
| `src/lib/firebase-admin.js` / `adminDb` | ✓ |  |  |  | Existing lazy server credential handling and Firestore access fit scheduled jobs. |
| `src/lib/auth-utils.js` |  | ✓ |  |  | Keep `getRequestUser` and admin detection; add job-specific owner/admin helpers only if needed. |
| `firestore.rules` default-deny pattern |  | ✓ |  |  | Add job collections as server-only and user-scoped records as appropriate. |
| `firestore.indexes.json` |  | ✓ |  |  | Add public filter/status/source/date indexes and user-private query indexes. |
| `admin_audit_events` | ✓ |  |  |  | Existing admin actions already record actor, target, reason, and timestamps. |
| `src/lib/webhook-deduplication.js` and Firestore transactions |  | ✓ |  |  | Reuse lease/idempotency ideas, but keep job identities and lifecycle events separate from payment webhooks. |
| `src/app/api/cron/email-outbox/route.js` and GitHub OIDC scheduler |  | ✓ |  |  | Reuse authorization and external schedule mechanism; do not couple job ingestion to email processing. |
| `src/lib/safe-redirect.js` |  |  |  | ✓ | It only permits same-origin redirects; job applications need a separate validated external URL policy. |
| `src/lib/content-visibility.js` |  | ✓ |  |  | Reuse explicit public-status/DTO discipline for public jobs. |
| `/resources`, `/education`, `/projects`, mentor/asset-pack directory UI |  | ✓ |  |  | Reuse layout, cards, loading, empty/error, filters, pagination, metadata, and attribution patterns; job semantics are new. |
| `src/lib/navigation.js` and `Header.jsx` |  | ✓ |  |  | Add one Jobs destination under the existing Learn hierarchy after approval; do not add a competing top-level nav item. |
| `users.settings` and product notifications/email outbox |  | ✓ |  |  | Future saved filters/alerts can use existing preference and notification delivery patterns. |
| Firestore `packages` resource records |  |  | ✓ |  | Jobs need independent status, source, fetch, dedupe, and attribution semantics; storing them as packages would blur permissions and lifecycle. |
| Feed source registry, fetch audit, raw items, canonical jobs, source links, dedupe/status history |  |  |  | ✓ | No equivalent module or collection exists. |
| RSS/Atom parser, normalizers, source adapters, URL/HTML sanitizer, SSRF guard |  |  |  | ✓ | No direct parser or generic safe feed fetcher exists. |
| Saved jobs, dismissed jobs, private application tracking, saved filters, alerts |  |  |  | ✓ | No job-specific account data model exists. |
| Discord job publisher and delivery/idempotency record |  |  |  | ✓ | No Discord API/bot integration is present or inspectable. |

## E. Blockers

These are evidence-based constraints, not assumptions about external systems.

| ID | Description | Severity | Evidence | Why it blocks or complicates implementation | Required action / owner | Can implementation continue? |
| --- | --- | --- | --- | --- | --- | --- |
| JOBS-BLOCK-001 | The working tree is not clean. | high | `git status --short --branch` shows 68 modified tracked files and many untracked files on `rss-experiment`. | It is not possible to safely distinguish future jobs changes from existing product work or to validate a clean migration/build baseline. | Owner/implementation lead: isolate, commit, or otherwise explicitly accept the existing changes before Phase 2 edits. | Yes, with a clearly isolated worktree/commit boundary; do not overwrite or clean the current work. |
| JOBS-BLOCK-002 | The production build currently fails locally. | high | Executed `next build`: compile succeeded, then invalid `@next/swc-win32-x64-msvc` binary warnings and missing `.next/server/8548.js` caused page-data collection to fail. | The required production build/release gate cannot currently verify jobs routes. | Engineering owner: repair the local dependency/runtime installation and rerun a clean build; CI/staging owner: verify on the deployment environment. | Feature design and isolated unit work may continue, but no phase should be accepted as release-ready until the build passes. |
| JOBS-BLOCK-003 | There is no approved feed/source permission registry or first pilot feed in the repository. | high | No jobs/feed collections, source configuration, permission records, or feed URLs were found. The requested policy requires approved sources and attribution. | Actual ingestion must not be enabled without source permission, retention/description rules, and attribution requirements. | Product owner plus legal/content owner: approve the first source(s), permission status, allowed reuse, and pilot. | Yes, build the registry with all sources disabled and use synthetic fixtures. Activation is blocked. |
| JOBS-BLOCK-004 | The scheduled-processing plan is documented only for email, not for jobs. | medium | The only workflow is `.github/workflows/email-outbox.yml`; no job cron route, lock, schedule, or source-health monitoring exists. `docs/EMAIL_SETUP.md` says Vercel Hobby cron is once daily and uses external GitHub scheduling for five-minute work. | Job ingestion needs bounded execution, concurrency control, retries, and a production schedule that fits the hosting plan. | Deployment/operations owner: approve the external scheduler route, frequency, timeout budget, branch/ref, alerting, and rollback procedure. | Yes, implement against the existing OIDC pattern; production activation is blocked until configured and observed. |
| JOBS-BLOCK-005 | Discord architecture is unavailable for inspection. | medium | No Discord API client, webhook, bot, message ID store, or `DISCORD_*` environment variables exist. Existing Discord code is invite/profile UI only. | Phase 5 cannot safely implement message routing, idempotency, credentials, or status updates without a contract and channel ownership. | Product/operations owner plus Discord-bot owner: provide repository access or approve an authenticated webhook/API contract. | Yes, public MVP and canonical database can proceed; Discord integration is blocked/deferred. |
| JOBS-BLOCK-006 | General CI is absent. | medium | `.github/workflows` contains only `email-outbox.yml`; the current commit explicitly removed the CI workflow. | The definition of done requires lint, type check, unit, integration, e2e, build, and migration validation in CI. | Release/engineering owner: restore or approve a jobs CI workflow without weakening existing checks. | Yes, local tests and fixtures can be added; full release acceptance is blocked. |
| JOBS-BLOCK-007 | No repository-visible staging Firebase/Vercel configuration is available. | medium | Deployment project metadata is present, but staging project identifiers, deployment workflow, and environment mapping are not checked in; local env files are ignored. | Feed ingestion and private account tests must not be proven only against production or a developer Firebase project. | Deployment owner: confirm separate staging Firebase/Vercel environments and safe test credentials. | Yes, use emulator and mocks; staging rollout is blocked until an environment is confirmed. |
| JOBS-BLOCK-008 | Firestore has no migration/versioning mechanism. | low | No migration directory or schema tool exists; only rules and indexes are versioned. | Phase 2 must use backward-compatible collection introduction, deterministic bootstrap/seed tooling, and explicit rules/index deployment rather than assuming relational migrations. | Engineering owner: approve this Firestore rollout/rollback convention and document it. | Yes, provided the phase acceptance criteria are adapted to Firestore rules/index deployment and fixture/bootstrap checks. |

## F. Decisions required from the product owner

| Decision | Recommended default | Alternatives | Technical consequences | Blocks MVP? |
| --- | --- | --- | --- | --- |
| Public browsing versus account-only access | Public `/jobs` directory and detail pages; account required only for saves, dismissals, alerts, and private tracking. | Account-only listings; public index with login-gated details. | Public pages need safe DTOs, SEO metadata, status filtering, and no private fields. Account-only access reduces SEO/discoverability and adds auth complexity. | No for the recommended public model; yes for the chosen access contract if undecided. |
| First approved feeds | One approved pilot feed with explicit permission and synthetic fixtures before adding more. | Multiple feeds at launch; GO-managed feeds only. | Determines adapter work, permission records, attribution copy, rate limits, and monitoring. | Yes for real activation; no for implementation with disabled sources. |
| Description/content reuse | Store and display a short sanitized excerpt by default; retain raw payload only when the source terms permit it. | Store full sanitized descriptions; store no raw payload. | Affects raw-item collection size, source terms, UI detail pages, deletion/correction procedures, and legal review. | Yes for source activation and storage policy. |
| Fetch and verification frequency | Fetch approved feeds on a configurable schedule, default 60 minutes, with manual admin fetch and a separate conservative URL verification schedule. | 5-minute fetch; daily fetch; source-specific schedules only. | Affects GitHub Actions load, Firestore reads/writes, staleness, freshness, rate limits, and Vercel execution budget. | Yes for production scheduling; no for fixture-driven implementation. |
| Retention and stale policy | Keep canonical records and audit state; mark stale before removal; use explicit source deadlines/confirmed 404/410 for expiry/unavailability. Default raw payload retention 30 days only if permitted. | Delete raw data immediately; retain all job history indefinitely. | Affects storage cost, user saved-job history, correction requests, and status reactivation. | Yes for operational rollout; the conservative state engine can be built first. |
| Account feature scope for first release | Public directory only in the first MVP; add saved jobs/private application tracking in a separately approved member phase. | Include saves and private tracking in MVP; no account features. | Determines new private collections, profile tabs, security tests, notification scope, and privacy copy. | No for public directory; yes for Phase 6. |
| Discord strategy | Defer Discord publishing until the bot/API contract is confirmed; canonical Firestore jobs remain authoritative. | Publish through an internal authenticated webhook; bring the bot into this repository. | Determines auth, idempotency records, channel routing, retries, message updates, and operational ownership. | No for public MVP; yes for Discord delivery. |
| Admin roles | Reuse the existing platform-admin check for Phase 2; add a curator capability only if operational separation is required. | Dedicated job-curator role; all admins plus content reviewers. | Affects auth claims, Firestore/API authorization, UI visibility, audit ownership, and least privilege. | No if existing admins are acceptable; yes if separate ownership is required. |
| Application-link behavior | Always link to the validated original publisher/employer URL; no GO application form or proxy. Do not record outbound clicks initially. | Record anonymized outbound click events; proxy through a GO redirect. | Direct linking is simpler and preserves publisher intent. Click tracking adds privacy, abuse, redirect-validation, and analytics work. | No if direct linking is approved. |

## G. Proposed implementation phases

The following plan adapts the requested Phase 2–7 sequence to the confirmed
Next.js/Firestore/Vercel/GitHub Actions architecture.

### Phase 2 — Foundations, data model, and admin source registry

- Objective: introduce server-only Firestore job collections, source permission
  records, deterministic IDs, rules/indexes, and an admin source registry without
  enabling any feed automatically.
- Files/modules likely to change: new `src/lib/jobs/` repository/types/validation
  modules; admin source API under `src/app/api/admin/job-sources/`; admin page
  under `src/app/admin/jobs/`; `firestore.rules`; `firestore.indexes.json`;
  `.env.example`; admin sidebar; job architecture and local setup docs.
- Database changes: add `job_sources`, `job_fetch_runs`, `job_raw_items`,
  `jobs`, `job_source_links`, `job_duplicate_candidates`, and audit/status
  collections as documented in Section H. There is no SQL migration; deploy
  Firestore rules/indexes and use a repeatable disabled-by-default bootstrap or
  fixture process.
- API changes: admin-only source list/create/update/disable/test-fetch endpoints;
  source activation must require an allowed permission status and explicit admin
  action. Test fetch must be dry-run unless an admin confirms publication.
- UI changes: admin source list/form with permission status, attribution notes,
  enabled flag, interval, last fetch/error, and manual test result. No public Jobs
  navigation yet.
- Security requirements: server-only collections; admin authorization through
  `getRequestUser`; HTTPS and URL validation; private/localhost address blocking;
  source permission gate; audit every source mutation; no secrets or raw feed
  payloads in client responses.
- Tests: source validation, permission-gated activation, deterministic source
  identity, admin/non-admin route tests, Firestore rules denial, clean emulator
  bootstrap, and index/rules deployment validation.
- Documentation: jobs architecture, source onboarding, permission review, env
  variables, Firestore rollout/rollback, and admin source operations.
- Dependencies: Phase 1 approval, clean worktree boundary, and product decisions
  on source permission and admin roles.
- Acceptance criteria: a source can be created and remains disabled by default;
  restricted/rejected sources cannot activate; unauthorized users receive 401/403;
  rules/indexes deploy successfully; no feed is fetched automatically by the
  migration/bootstrap.

### Phase 3 — Secure feed ingestion and normalization

- Objective: fetch approved RSS/Atom sources safely, parse each item without
  taking down the whole feed, normalize fields, deduplicate, and update status
  conservatively.
- Files/modules likely to change: `src/lib/jobs/fetcher.js`, `xml.js`, URL/SSRF
  guard, HTML sanitizer, adapters, normalizer, dedupe engine, status engine,
  repository, structured logger, and protected
  `src/app/api/cron/jobs-ingest/route.js`.
- Database changes: write fetch runs, optional raw items, canonical jobs, source
  relationships, lock/idempotency markers, duplicate candidates, and status
  transition audit events. Add indexes for enabled sources, fetch health, job
  status, publication/verification dates, and source links.
- API changes: internal scheduled route with GitHub OIDC/`CRON_SECRET`; optional
  admin manual run endpoint; no public raw-feed endpoint.
- UI changes: admin source-health and recent fetch counts/errors; no public
  listing until normalization fixtures and security tests pass.
- Security requirements: HTTPS by default; explicit HTTP approval; DNS and
  redirect destination validation; block loopback/link-local/private/reserved
  addresses; timeout, response-size, redirect-count, content-type, and user-agent
  controls; safe XML parser with external entities disabled; HTML sanitization;
  bounded strings; validated HTTPS application URLs; rate limiting and per-source
  locks; structured logs without credentials or full raw payloads.
- Tests: RSS 2.0/Atom parsing, malformed items, dates, URLs, dangerous XML/HTML,
  SSRF/private addresses, redirects, ETag/Last-Modified/304, retry/backoff,
  normalization, source adapters, GUID and URL dedupe, low-confidence separation,
  status transitions, concurrency, idempotent re-import, and temporary failure
  behavior.
- Documentation: fetch limits, parser support, source adapter contract, status
  policy, scheduler configuration, source health, and recovery procedures.
- Dependencies: Phase 2 data model, approved source registry, scheduler decision,
  and a direct XML parser dependency only if existing dependencies are not safe or
  suitable.
- Acceptance criteria: valid RSS/Atom imports; repeat imports are idempotent;
  malformed items do not stop valid items; temporary failures do not expire jobs;
  dangerous content is rejected/sanitized; fetch metadata and conditional request
  headers are recorded.

### Phase 4 — Website job directory and public/free-account boundary

- Objective: expose safe public job browsing and detail pages, with original
  publisher attribution and direct external application links.
- Files/modules likely to change: new `src/app/jobs/page.js`,
  `src/app/jobs/[slug]/page.js`, optional layouts, job directory/detail
  components, `/api/jobs` and `/api/jobs/[slug]`, `src/lib/navigation.js`,
  `Header.jsx`, `sitemap.js`, `robots.js`, and `src/lib/seo.js`.
- Database changes: read only canonical active/expiring/stale jobs according to
  explicit public query rules; exclude removed/expired/unavailable by default.
- API changes: bounded search/filter/sort/pagination DTOs; detail DTO with source,
  publication date, last verification, status, attribution, and validated
  `applyUrl`. No raw feed or private account fields.
- UI changes: Jobs link under Learn; accessible search, filters, sort, pagination
  or cursor loading, cards, detail page, loading/empty/error states, mobile
  layout, status badges, original source attribution, disclaimer, and clear
  “Apply on original publisher’s website” action with safe external-link behavior.
- Security requirements: public DTO allowlist; no trust in client status or URL;
  external-link protocol/host validation at ingestion and serialization; no
  private fields; escaped/sanitized description excerpts; appropriate `rel`
  attributes; no GO-employer implication.
- Tests: API filters and status exclusion, DTO redaction, metadata/canonical URL,
  Playwright navigation/search/filter/detail/attribution/apply-link tests,
  keyboard/focus/contrast/responsive checks, and anonymous privacy checks.
- Documentation: public disclaimer wording, attribution policy, SEO behavior, and
  direct-application explanation.
- Dependencies: Phase 3 must produce trusted canonical records; public/account
  decision must be approved.
- Acceptance criteria: anonymous users can browse/search/filter and open details;
  default results exclude expired/removed jobs; attribution and disclaimer are
  consistent; application action leads to the original validated URL; no GO
  application form is shown; responsive and accessibility checks pass.

### Phase 5 — Status verification, user reporting, and Discord integration

- Objective: verify application/source URLs conservatively, accept authenticated
  reports for review, and publish canonical job events to Discord only when the
  external integration contract is approved.
- Files/modules likely to change: verifier/status modules; protected verification
  scheduler route; user report API/UI; admin review UI/API; Discord adapter,
  event schema, delivery/idempotency records, and relevant Firestore rules/indexes.
- Database changes: verification attempts/results, reports and audit trail,
  status transitions, Discord delivery/message IDs, retry state, and idempotency
  keys. Existing jobs must remain intact when Discord fails.
- API changes: authenticated report endpoints with duplicate/rate-limit controls;
  admin report actions; internal Discord webhook/API with authentication and
  idempotency.
- UI changes: report action on job detail; admin review/report/source health and
  Discord delivery state; status annotations according to approved policy.
- Security requirements: do not treat 401/403/429/5xx/timeouts as closure;
  validate every redirect; limit HEAD/GET response size; protect report abuse;
  keep Discord credentials server-only; do not let Discord or user reports
  directly delete public jobs.
- Tests: repeated 404/410 policy, temporary failure policy, reactivation, report
  isolation/rate limiting, Discord auth/idempotency/retry, one publication per
  job, and Discord outage non-rollback.
- Documentation: verifier policy, report moderation, Discord contract, retry and
  outage behavior, and channel ownership.
- Dependencies: Phase 4 public details; product decision and access to Discord
  integration; approved verification/retention policy.
- Acceptance criteria: status transitions are conservative and auditable; reports
  are reviewable and rate-limited; Discord receives at most one publication per
  event; outages do not duplicate or roll back canonical jobs.

### Phase 6 — Alerts, saved filters, and member value

- Objective: add optional free-account value while keeping every user record
  private and isolated.
- Files/modules likely to change: private job repository/services; authenticated
  `/api/me/jobs`, saved-filters, and alert routes; profile tabs/components;
  `users.settings` validation or new collections; email/notification event
  definitions and worker handling.
- Database changes: deterministic user-job records for saved/dismissed/private
  application status/notes; saved filters; alert preferences and delivery
  deduplication/audit records. Prefer server-only collections and user-scoped
  document IDs.
- API changes: authenticated save/remove/dismiss/status/note/filter/alert
  endpoints; all lookups must use the verified current user, never a client user
  ID.
- UI changes: optional Jobs profile tab, save/dismiss controls, private status
  controls, saved filters, and alert settings with clear expired-job handling.
- Security requirements: owner-only reads/writes; field allowlists and length
  limits; no private notes/status in public DTOs, admin source views, emails, or
  Discord; rate-limit mutations; safe unsubscribe/disable controls.
- Tests: cross-user access denial, private status isolation, save/remove
  idempotency, matching filters, alert dedupe, timezone/frequency, expired-job
  suppression, and notification failure isolation.
- Documentation: privacy model, account feature behavior, notification
  preferences, retention, and removal/export procedure.
- Dependencies: Phase 4 public directory and a positive product decision that
  these features belong in the initial release; Phase 5 notification/reporting
  policy where used.
- Acceptance criteria: users manage only their own records; alerts match saved
  criteria once; disabled alerts stop; expired jobs are not sent as new; private
  data never reaches other users or public integrations.

### Phase 7 — Operational hardening, documentation, and release

- Objective: make the system observable, documented, reversible, and releasable
  through development, emulator, staging, and a controlled pilot feed.
- Files/modules likely to change: admin health/dashboard surfaces; structured
  logging/metrics; `.github/workflows` CI and job scheduler workflow; README and
  jobs architecture/runbooks; `.env.example`; `docs/GO_JOBS_MANUAL_TEST_PLAN.md`;
  rollback/release checklists.
- Database changes: final index/rule/TTL deployment, operational retention
  settings, audit verification, and any migration/fixture validation scripts.
- API changes: health/readiness/admin diagnostics and bounded operational
  endpoints; no secret-bearing diagnostics.
- UI changes: source health, fetch runs, items needing review, duplicate
  candidates, reports, verification failures, and Discord/alert delivery state.
- Security requirements: structured redacted logs, admin-only operations, secret
  rotation, no raw credentials/notes/PII in logs, documented incident stop and
  feed disable controls.
- Tests: full lint/type/unit/rules/integration/e2e/build pipeline, migration or
  rules/index validation, real approved pilot in staging, and the manual QA
  matrix in Section I.
- Documentation: architecture/data flow, env vars, local setup, source
  onboarding/permission review, scheduler, Discord, testing, deployment,
  rollback, admin operations, troubleshooting, correction/removal, and privacy.
- Dependencies: all earlier phases; working build; staging environment; approved
  pilot feed; CI and operations ownership.
- Acceptance criteria: staging processes a real approved feed; failures are
  observable; rollback is documented and tested where practical; no unresolved
  critical/high issues remain; lint, typecheck, tests, e2e, build, rules/index
  validation, and manual acceptance are complete.

## H. Proposed data model

Firestore is schemaless, so these are application-level contracts enforced by
validation, allowlists, deterministic IDs, transactions, and tests. Existing
timestamp convention is `Date`/Firestore Timestamp with `createdAt` and
`updatedAt` fields.

### `job_sources/{sourceId}`

```text
name, slug, feedUrl, websiteUrl, termsUrl
permissionStatus
attributionRequirement, contentReuseNotes
sourceType: rss | atom | mixed
fetchIntervalMinutes, isEnabled
etag, lastModified
lastAttemptAt, lastSuccessAt, lastErrorAt, consecutiveFailureCount
lastFetchSummary, reviewedAt, reviewedBy, enabledAt, enabledBy
createdAt, updatedAt
```

`isEnabled` must remain false unless `permissionStatus` is one of the approved
statuses selected by product/legal policy. Use a normalized feed URL and a
deterministic slug/source identity to prevent obvious source duplicates.

### `job_fetch_runs/{runId}`

```text
sourceId, startedAt, completedAt, result
httpStatus, contentType, itemsReceived, itemsCreated, itemsUpdated, itemsSkipped
itemsNeedsReview, errorCode, errorMessage, responseHash
etagSent, lastModifiedSent, responseEtag, responseLastModified
trigger: scheduled | manual | retry
createdAt
```

### `job_raw_items/{rawItemId}`

```text
sourceId, externalGuid, payload, payloadHash
firstSeenAt, lastSeenAt, processingStatus, processingError
termsRetentionUntil, expiresAt, createdAt, updatedAt
```

Prefer a bounded normalized raw snapshot or field subset over full payloads. Do
not store raw content when source terms prohibit it. The deterministic ID should
be based on source plus normalized external GUID or a safe content hash.

### `jobs/{jobId}`

```text
slug, title, company, descriptionExcerpt, locationText
remoteType, applicantRegions, employmentType, seniority, disciplines
salaryMin, salaryMax, salaryCurrency, salaryPeriod
publishedAt, expiresAt
status: active | expiring_soon | stale | expired | unavailable |
        source_error | needs_review | removed
statusReason, statusUpdatedAt
canonicalApplyUrl, canonicalSourceUrl, sourceName, sourceWebsiteUrl
firstSeenAt, lastSeenAt, lastVerifiedAt
createdAt, updatedAt
```

The surviving canonical job never receives a `duplicate` status. Duplicate
relationships are separate records. Missing feed values remain null or
`unspecified`; the normalizer must not invent facts.

### `job_source_links/{linkId}`

```text
jobId, sourceId, externalGuid, sourceJobUrl, applyUrl
sourcePublishedAt, sourceLastSeenAt, isPrimarySource
createdAt, updatedAt
```

Use a deterministic ID derived from job/source/external identity so re-imports
are idempotent. Source URLs and apply URLs must be validated before storage.

### `job_duplicate_candidates/{candidateId}`

```text
canonicalJobId, candidateJobId, sourceItemId
matchReason, matchConfidence, decision: pending | merged | rejected
mergedAt, mergedBy, reviewedAt, reviewedBy
createdAt, updatedAt
```

Low-confidence candidates remain separate until reviewed.

### `job_status_events/{eventId}` and `job_locks/{sourceId}`

Status events record old/new status, reason, evidence, actor/worker, and time.
Per-source lock documents record owner/run ID, lease expiry, and updated time so
overlapping scheduled invocations do not process one source concurrently.

### Private user collections

Use server-only top-level collections consistent with current rules, rather than
putting unbounded private data in public `jobs` documents:

- `user_job_records/{userId_jobId}`: `userId`, `jobId`, `savedAt`, `dismissedAt`,
  private `applicationStatus`, `note`, `createdAt`, `updatedAt`.
- `user_job_filters/{filterId}`: `userId`, normalized filter fields, label,
  alert settings, created/updated times.
- `job_alert_deliveries/{deliveryId}`: `userId`, filter ID, job ID, channel,
  sent/suppressed status, dedupe key, timestamps.

The user ID must be derived from the verified token. Private notes/statuses must
never be included in public job DTOs, admin source payloads, Discord events, or
email templates.

### Optional Discord delivery record

`job_discord_deliveries/{eventId}` can store the canonical event ID, job ID,
channel key, Discord message ID, delivery state, retry count, and timestamps.
The event ID is the idempotency key. This collection is not a status authority.

## I. Test strategy

### Existing baseline

| Layer | Current result |
| --- | --- |
| Node unit suite | Executed: 381 passed, 0 failed. |
| Configured JS type-check | Executed: passed with no diagnostics. |
| Lint | Executed: exit 0 with existing hook/image warnings. |
| Production build | Executed: failed during page-data collection because of invalid local SWC binary/missing generated server chunk after successful compilation. |
| Firestore rules/emulator | Not executed in Phase 1. |
| Playwright | Not executed in Phase 1. |
| Live feeds/deployment | Not executed; must not be used as routine CI dependencies. |

### Proposed automatic matrix

| Layer | Coverage |
| --- | --- |
| Unit: XML/parser | RSS 2.0, Atom, namespaces, missing optional fields, malformed item, duplicate GUID, invalid date, relative URL, oversized text, HTML description, dangerous scripts, XML entity attack, encoding. |
| Unit: normalization | Company/location extraction, remote type, applicant regions, employment, seniority, disciplines, salary/currency/period, missing values, source-specific adapters. |
| Unit: URL/security | Tracking parameter removal, meaningful parameter preservation, fragments/trailing slash normalization, rejection of `javascript:`/`data:`, localhost/private networks, redirect validation, timeout/size/redirect limits, safe HTML output. |
| Unit: dedupe/status | Same source+GUID, canonical/apply URL, tracking URLs, distinct valid roles, cross-source matches, low-confidence separation, manual merge, active/expiring/expired/stale/unavailable/source-error/needs-review/removed/reactivation/temporary failure. |
| Unit: permissions | Anonymous public reads, user-owned records only, admin-only source operations, disabled/unapproved source rejection, report rate limiting. |
| Integration: Firestore | Rules/index deployment, source lifecycle, permission-gated activation, fetch run/raw item/canonical job writes, repeat ingestion, multi-source dedupe, locks, ETag 304, status queries, private records, Discord idempotency. |
| Integration: scheduler | OIDC/secret auth, bounded execution, retry/lease recovery, concurrent source protection, no status expiry on temporary failures. |
| E2E: public | Open Jobs navigation, search, combined filters, sorting/pagination, detail metadata, attribution/disclaimer, original application link, empty/loading/error states, mobile and keyboard flows. |
| E2E: accounts/admin | Login, save/remove/status privacy if approved, report, admin source CRUD, disabled/rejected source activation, manual test fetch, health/error review, no other-user access. |
| CI/release | Install, formatting if adopted, lint, type-check, unit, rules/integration, Playwright, production build, Firestore rules/index validation, and migration/bootstrap validation. |

### Manual QA document to add after approval

Create `docs/GO_JOBS_MANUAL_TEST_PLAN.md` with the requested IDs and fields:
`MAN-JOBS-001`–`003` source administration, `010`–`013` ingestion,
`020`–`023` presentation, `030`–`032` account isolation, `040`–`044` status
updates, `050`–`053` security, `060`–`063` Discord, and `070`–`072`
responsive/accessibility. Each case should have prerequisites, steps, expected
result, actual result, pass/fail, tester, environment, and evidence link.

Routine CI must mock external feeds, URL verification, and Discord. A real
approved pilot feed belongs in staging/release acceptance, not unit tests.

## J. Estimated risk

| Area | Rating | Rationale |
| --- | --- | --- |
| Architecture | medium | The existing server/API/Firestore patterns fit, but the ingestion pipeline is new and must stay separate from UI and email workers. |
| Data integrity | high | Firestore has no relational unique constraints; canonical identity, cross-source dedupe, status history, locks, and reactivation need strong transaction tests. |
| External feeds | high | Feed formats, malformed content, terms, rate limits, redirects, source outages, and changing schemas are outside GO control. |
| Security | high | SSRF, malicious XML/HTML, unsafe application URLs, oversized responses, and admin source creation create meaningful attack surface. |
| Discord integration | high | There is no inspectable bot/API contract, so ownership, credentials, channel routing, and delivery semantics are unknown. |
| Deployment | high | Current short-lived external scheduling works for email but jobs add more fetch/verification load; the local production build is currently failing and Vercel plan limits need confirmation. |
| User privacy | medium-high | Public jobs are low sensitivity, but saved jobs, notes, application status, alerts, and reports are private account data. |
| Testing | high | Existing unit coverage is strong, but no job fixtures/tests exist, CI is absent, Playwright was not run, and the current production build fails. |

## K. Explicit stop

“Phase 1 is complete. No implementation changes have been made. Approval is required before Phase 2 begins.”
