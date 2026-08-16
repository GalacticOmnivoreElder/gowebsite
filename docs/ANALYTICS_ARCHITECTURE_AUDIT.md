# GO Analytics Architecture Audit — Phase 1

Date: 2026-08-16  
Scope: Galactic Omnivore Next.js application  
Status: Phase 1 complete; implementation may proceed

## Current architecture

- Next.js `15.3.8` using the App Router under `src/app`.
- React `18.3.1` and JavaScript/JSX. The repository uses `jsconfig.product.json` for a focused `tsc` check; it is not a TypeScript application.
- The root server layout is `src/app/layout.js`. It renders the client-side `ReusableLayout`, which supplies the shared header/footer and uses `usePathname` for SPA route state.
- `src/reusable-ui/ReusableLayout.js` is the natural client boundary for route-aware global behavior. Admin routes are intentionally rendered without the public header/footer.
- Firebase client services are initialized in `src/firebase.js`: Firebase Auth, Firestore, and Realtime Database. Firebase Admin is separately configured in `src/lib/firebase-admin.js` for server routes.
- Authentication is Firebase Auth, coordinated through the MobX store in `src/mobx.js`. Supported flows include email/password sign-up, email/password login, Google popup sign-in, anonymous-account upgrade, sign-out, email verification, and profile loading from Firestore.
- Account/profile state is represented by Firebase Auth plus Firestore `users` data and onboarding/profile API routes. Membership state is synchronized from Polar webhooks into the user/subscription model.
- Polar is the external membership checkout provider. Checkout starts through `/api/checkout`; activation is trusted only after subscription/order webhook processing and is surfaced on `/subscription/success`.
- Environment variables use `.env.example`, with public Firebase identifiers under `NEXT_PUBLIC_FIREBASE_*`, server-only Firebase Admin credentials, and deployment-aware `VERCEL_ENV`/`NODE_ENV` handling. Production validation is implemented in `src/lib/production-env.cjs` and `next.config.js`.
- Deployment is Vercel-oriented (`.vercel`, Vercel environment handling, deployment ID in `next.config.js`). GitHub Actions currently contains an email-outbox workflow; no analytics CI workflow exists.
- Logging is ad hoc `console` logging plus `src/utils/logger.js`. There is no Sentry or other external error-monitoring integration.
- QA consists of Node test-runner unit/integration-style tests in `tests/unit`, Firestore emulator rules tests, and Playwright browser/visual tests. The primary commands are `npm run test:unit`, `npm run test:rules`, `npm run test:visual`, and `npm run test:all` (lint, unit suite, build).

## Existing analytics and telemetry

- No active Google Analytics, Firebase Analytics, Google Tag Manager, Microsoft Clarity, PostHog, Meta Pixel, or analytics wrapper was found.
- `src/firebase.js` imports `getAnalytics` but does not initialize or export it; the only reference is a commented line. This is an unused precursor, not active tracking.
- The admin dashboard has a first-party operational summary called “analytics”, but it is an authenticated Firestore aggregation and is unrelated to visitor/product analytics. It must not be mixed with GA4 event reporting.
- Existing newsletter consent/delivery tracking is a separate first-party operational system and should remain separate from behavioral analytics.

## Consent and privacy findings

- `src/components/cookies/CookieConsent.jsx` contains an intended essential/functional/analytics preference UI, but it is commented out in `src/app/layout.js`.
- The component expects `MobxStore.cookieConsent`, `MobxStore.setCookieConsent`, and `MobxStore.cookieSettingsOpen`; those fields/methods are not present in `src/mobx.js`. Re-enabling it unchanged would be unsafe.
- `/cookies` and `/privacy` already describe optional analytics, but the cookie copy needs to match the actual consent lifecycle and identify GA4/Firebase Analytics and Clarity once deployed.
- Account, onboarding, checkout, profile, mentorship, and project-creation screens accept sensitive/private content. Clarity should not run on those surfaces in the initial release. Public discovery/content surfaces can be recorded with default masking plus explicit masking for public forms.
- Technical implementation will require prior analytics consent, a clear reject path, a way to reopen preferences, and no analytics payloads containing email addresses, names, passwords, tokens, private form text, mentorship content, project content, or payment information. Legal/business ownership should review the final consent wording and regional requirements.

## User journey map

| Journey | Existing routes/components | Reliable milestones to measure |
| --- | --- | --- |
| Visitor discovery | `/`, `/community`, `/about`, `/projects`, `/education`, `/resources`, `/blog`, `/games`, shared `Header`/`Footer` | Page view, navigation/CTA click, safe external-link click |
| Visitor → account | landing CTAs → `/signup` → Firebase Auth → `/verify-email` | `signup_started`, `signup_completed`; provider category only |
| Login | `/login` → Firebase Auth → redirect | `login_started`, `login_completed`, `login_failed` with safe error category |
| Profile onboarding | `/onboarding` → `/api/onboarding` → `/profile/cv` | `profile_setup_started`, `form_started`, `form_validation_error`, `profile_setup_completed` |
| Membership | `/membership`, `/pricing`, `PricingDisplay`, `SubscribeButton` → `/checkout`/`/api/checkout` → Polar → `/subscription/success` | `membership_viewed`, `membership_tier_selected`, `checkout_started`, `checkout_completed` only after trusted active subscription/order confirmation |
| Projects | `/projects` → `/project/create` → `/api/projects` → `/project/[id]` | `project_viewed` with opaque/category ID, `project_creation_started`, `form_started`, `project_creation_completed` |
| Learning | `/education`, `/education/[slug]`, `/video-bundles`, `LearningDetail` | `learning_content_viewed`, `course_viewed`/`workshop_viewed`/`video_bundle_viewed`, enrollment CTA/action where safe |
| Mentorship | `/mentors`, `/mentors/[mentorId]`, `/matchmaking`, pilot request workspaces, `/profile?tab=mentorships` | `mentorship_viewed`, `mentorship_request_started`, `mentorship_request_completed`; never send goals, notes, accessibility text, or private discussions |
| Events | No dedicated event route or event domain model was found in the current branch. Learning items may contain scheduled activities. | Use learning-item events where applicable; dedicated event events remain future-ready but are not instrumented without a real event surface. |
| Jobs | No dedicated jobs route/domain model was found. Onboarding has a job-matching preference, but no application journey. | No job event implementation now; keep `external_link_clicked` destination categories available for future outbound jobs. |

## Proposed analytics architecture

Use one client-only analytics boundary and one event registry:

- `src/lib/analytics/events.js`: allowlisted event names, safe property construction, sensitive-key filtering, and event metadata.
- `src/lib/analytics/client.js`: lazy Firebase Analytics initialization with `send_page_view: false`, consent checks, environment checks, graceful failure, and `logEvent`/page-view helpers.
- `src/lib/analytics/consent.js`: browser-safe consent storage and normalized consent state. The existing cookie UI will use this instead of nonexistent MobX fields.
- `src/lib/analytics/clarity.js`: production/preview-safe Clarity loader and consent-aware enable/disable behavior.
- `src/components/analytics/AnalyticsProvider.jsx`: global client boundary that owns consent state, route-transition page views, and Clarity eligibility. It will be mounted from the root layout.
- UI components call only `trackEvent`/small semantic helpers; no component will call `gtag`, `logEvent`, or Clarity directly.

Firebase Analytics will use the existing Firebase app and measurement ID, initialized exactly once and only in supported browsers after analytics consent. Manual `page_view` events will be emitted on initial load and client-side path changes; automatic page views will be disabled to prevent duplicates.

Microsoft Clarity will be loaded only after analytics consent and only on selected public/product surfaces. Authenticated/private/admin/form-heavy routes will be excluded. Clarity’s masking defaults remain enabled, with explicit masking on public newsletter fields. Analytics will be disabled in test environments and when configuration is absent.

## Event taxonomy

The initial registry will contain these meaningful events:

| Event | Safe properties | Primary use |
| --- | --- | --- |
| `page_view` | `page_path`, `page_type` | route usage and all funnels |
| `navigation_clicked` | `cta_id`, `destination_path`, `navigation_area` | discovery/navigation |
| `external_link_clicked` | `destination_category`, `link_context` | outbound actions |
| `signup_started` | `method`, `flow` | visitor → account |
| `signup_completed` | `method`, `flow` | visitor → account |
| `login_started` | `method` | authentication |
| `login_completed` | `method` | authentication |
| `login_failed` | `method`, `error_category` | authentication friction |
| `profile_setup_started` | `entry_point` | onboarding |
| `profile_setup_completed` | `entry_point` | visitor → member |
| `membership_viewed` | `page_path` | membership funnel |
| `membership_tier_selected` | `membership_tier`, `billing_interval` | paid funnel |
| `checkout_started` | `membership_tier`, `billing_interval`, `provider` | paid funnel |
| `checkout_completed` | `membership_tier`, `billing_interval`, `provider`, `confirmation_source` | trusted paid conversion |
| `project_viewed` | `project_visibility`, `project_type`, `content_id` | project discovery |
| `project_creation_started` | `entry_point` | project funnel |
| `project_creation_completed` | `project_type`, `project_visibility` | project funnel |
| `learning_content_viewed` | `content_type`, `content_id` | learning engagement |
| `course_viewed` | `content_id` | learning engagement |
| `workshop_viewed` | `content_id` | learning engagement |
| `resource_viewed` | `content_type`, `content_id` | resource engagement |
| `video_bundle_viewed` | `content_id` | learning engagement |
| `mentorship_viewed` | `surface` | mentorship discovery |
| `mentorship_request_started` | `flow`, `entry_point` | mentorship funnel |
| `mentorship_request_completed` | `flow`, `request_mode` | mentorship funnel |
| `form_started` | `form_id`, `page_path` | form abandonment |
| `form_completed` | `form_id`, `page_path` | form completion |
| `form_validation_error` | `form_id`, `field_id`, `error_type` | UX friction; never values |

Opaque content/project identifiers are allowed only when they are not personally identifying and are already public/domain IDs. Sensitive or private IDs/content will be omitted. Stable CTA IDs include `hero_join`, `hero_explore`, `membership_join`, `project_create`, `mentorship_request`, `event_register`, and `job_apply` where those surfaces exist.

## Initial funnels

1. Visitor → member: `page_view` (landing) → `navigation_clicked`/`signup_started` → `signup_completed` → `profile_setup_completed`.
2. Visitor → paid membership: `membership_viewed` → `membership_tier_selected` → `checkout_started` → `checkout_completed`.
3. Project creation: `page_view` (`/projects`) → `project_creation_started` → `form_started` → `project_creation_completed`.
4. Learning engagement: learning landing/content `page_view` → typed content-view event → safe enrollment/meaningful CTA event when implemented.
5. Mentorship: `mentorship_viewed` → `mentorship_request_started` → `mentorship_request_completed`.

Checkout completion will not be emitted from a payment button or redirect alone. It will be emitted on the success page only after the existing trusted subscription/order verification reports active confirmation. Events for events/jobs are future-ready because those feature surfaces are not present in this branch.

## Testing strategy

- Unit tests will cover the event registry, property allowlisting/sanitization, sensitive-value exclusion, consent normalization, environment gating, and no-op behavior when analytics is unavailable.
- Browser tests will stub `window` analytics globals/modules and verify page views, client route changes, CTA events, signup/login states, form events, checkout start, trusted completion, and Clarity eligibility without sending real telemetry.
- Existing Playwright tests will be extended with request/script interception or a test-only analytics spy. `NEXT_PUBLIC_ANALYTICS_ENABLED=false` will remain the default for local/test runs.
- Existing Node unit, Firestore rules, Playwright, lint, typecheck, and build commands remain the regression gates. The established QA CSV and `docs/TEST_PLAN.md` will receive an Analytics & Behaviour Monitoring section rather than creating a parallel QA system.

## Files expected to change

- `src/app/layout.js` — mount analytics/consent provider and the working consent UI.
- `src/firebase.js` — reuse/export the singleton Firebase app; remove the unused Analytics import.
- `src/components/cookies/CookieConsent.jsx` — use centralized consent state, correct copy, and a persistent settings entry point.
- `src/components/newsletter/NewsletterSignup.jsx` — explicit Clarity masking and form tracking.
- Key journey components/pages: landing CTA surfaces, `Header`, `Footer`, signup, login, onboarding, membership/pricing/checkout, subscription success, projects, project creation, learning details, and mentorship surfaces.
- `docs/TEST_PLAN.md` and `docs/GO_MANUAL_TESTS_GOOGLE_SHEETS.csv` — integrate QA coverage.
- `.env.example`, `src/lib/production-env.cjs` tests/config where needed — document and validate public analytics IDs without exposing secrets.

## New files expected

- `src/lib/analytics/events.js`
- `src/lib/analytics/client.js`
- `src/lib/analytics/consent.js`
- `src/lib/analytics/clarity.js`
- `src/components/analytics/AnalyticsProvider.jsx`
- `tests/unit/analytics.test.cjs`
- `tests/analytics-spy.spec.js` or equivalent Playwright coverage, depending on the least disruptive existing test setup.
- `docs/ANALYTICS_IMPLEMENTATION.md` for developer configuration and event extension guidance.

## Risks

- Duplicate page views if Firebase automatic page view collection is not disabled before manual route tracking.
- Consent mismatch if analytics or Clarity initializes before the stored preference is loaded, or if consent revocation does not disable an already initialized client.
- Accidental sensitive data capture through event properties or session recordings on private routes.
- Third-party script/network failure affecting page load or user workflows.
- Event drift if components bypass the central registry or use visible copy as a CTA identifier.
- False conversion reporting if checkout completion is recorded before Polar/Firebase confirmation.
- Current environment files contain real local configuration patterns; analytics IDs must remain in environment configuration and never be hard-coded or treated as secrets in source.
- Loading a global provider around a large client layout can increase client work; the provider must remain small, lazy, and route-aware.

## Blockers

### BLOCKER

- None for implementation. The existing consent component is incomplete, but it can be safely replaced with a small centralized client consent layer.

### SHOULD FIX

- Business/legal owner should review the final consent wording, analytics purpose, retention, and Clarity processing before production enablement.
- Supply a GA4/Firebase Web Measurement ID and Clarity project ID separately for staging/production before expecting external dashboards to populate.
- Confirm the desired public-domain allowlist for Clarity before production; the safe default is public/product surfaces only.

### NICE TO HAVE

- Add server-side error monitoring separately from behavioral analytics.
- Add dedicated event/job domain surfaces before instrumenting those journey categories.
- Add a consent-management platform if regional/legal requirements grow beyond the existing lightweight preference UI.

## Exact Phase 2 implementation order

1. Add the centralized consent store and analytics event registry with allowlisted, sanitized properties.
2. Update the Firebase singleton export and add a lazy, consent-aware Firebase Analytics client with automatic page views disabled.
3. Add the consent-aware Clarity loader and public-route eligibility policy.
4. Mount the provider in the root App Router layout and re-enable the consent UI using the new store.
5. Instrument route/page views and shared navigation/CTA/external-link surfaces.
6. Instrument signup, login, onboarding/profile completion, membership selection, checkout start, trusted checkout completion, project creation, learning, and mentorship actions.
7. Add explicit Clarity masking to public newsletter inputs and verify private/authenticated routes are excluded.
8. Add unit and browser analytics tests with no real telemetry, then update the established QA plan/CSV and developer documentation.
9. Update environment validation/documentation for measurement and Clarity IDs; keep local/test analytics disabled.
10. Run lint, typecheck, unit tests, build, Firestore rules tests, and Playwright suites; fix regressions without weakening existing assertions.

