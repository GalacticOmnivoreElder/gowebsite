# GO Platform Test Suite

This plan covers the GO website refresh: projects, user CVs, admin controls,
membership gates, and Polar subscriptions. The goal is practical confidence:
automate deterministic rules and use manual testing where third-party checkout,
visual quality, or human judgement matters.

## How to Run Automated Tests

```bash
npm run test:unit
```

If the local Windows shell blocks `npm`, run the same command directly:

```bash
node --test tests/unit/polar.test.cjs tests/unit/project-utils.test.cjs tests/unit/webhook-verification.test.cjs tests/unit/validate-profile.test.cjs tests/unit/cv-generator.test.cjs
```

## Automated Coverage

Current automated tests cover:

- Polar server selection, API base URLs, portal URLs, and product id resolution.
- Checkout API behavior for auth, missing products, missing Polar config, buyer
  IP forwarding, authenticated customer metadata, and development error hints.
- Billing subscription, billing portal, and billing orders route behavior with
  mocked Firebase/Polar dependencies.
- Billing cancellation behavior, including successful Polar cancellation,
  missing subscription checks, and fallback local cancellation when Polar returns
  not found.
- Project visibility and edit permissions for visitors, members, owners, project
  admins, platform admins, invitees, and archived projects.
- Project creation, validation, company-membership gating, source-project
  ownership, admin-only status changes, and delete cleanup behavior.
- Application creation membership gating, duplicate prevention, project-state
  validation, member checks, and GO CV snapshotting.
- Application update behavior for applicant cancellation and owner/admin
  approval into project teams.
- Admin-check and unlocked-package route guards.
- Webhook HMAC verification, including valid signatures, invalid signatures, and
  the local-development missing-secret path.
- Polar webhook lifecycle behavior for `order.paid`, `subscription.updated`
  past-due, `subscription.canceled`, `subscription.revoked`, full/partial
  refunds, duplicate idempotency, and unknown event acknowledgement.
- Profile validation for usernames, bios, social links, skills, and privacy.
- `/api/me/profile` and `/api/me/cv` route behavior for auth, editable-field
  filtering, generation, editing, serialization, and publishing.
- Deterministic CV generation from onboarding profile data, including suggested
  improvements and missing-information flags.
- Utility behavior for auth token extraction, admin cache TTLs, date formatting,
  budget formatting, class-name merging, logging, local auth token storage, and
  UI transformers.

Recommended next automated layers:

- Firebase emulator tests for `firestore.rules` around private projects, orders,
  applications, user profiles, and CV visibility.
- Browser smoke tests for public navigation, onboarding, project creation, CV
  generation, admin project management, billing pages, and responsive layouts.

## Test Personas

- Visitor: not logged in.
- Free user: logged in, no active subscription.
- Member subscriber: active `member` tier.
- Company subscriber: active `company` tier, can create projects.
- Project owner: owns a project and can edit/delete it.
- Platform admin: `users/{uid}.admin` or Firebase custom claim `admin`.

## Manual Regression Checklist

### Public Website

- Home page loads with the expected new visual direction.
- Header navigation works on desktop and mobile.
- About, FAQ, education, resources, games, pricing, and contact pages load.
- Landing-page CTAs point to the right next step.
- Empty, loading, and error states feel intentional.
- Text is readable on mobile, tablet, and desktop.

### Auth and Onboarding

- Sign up creates a user and routes to the expected next screen.
- Login, logout, reset password, and protected-page redirects work.
- Onboarding can be completed without AI keys configured.
- Invalid profile values show useful errors.
- Completed onboarding creates `user_profiles` data.

### GO CV

- New user can generate a CV from onboarding data.
- CV summary uses only facts from the profile.
- User can edit title, summary, sections, and visibility settings.
- Publish marks CV active.
- Public and project-creator visibility settings behave as expected.
- Applying to a project stores the intended CV snapshot.

### Projects

- Visitor sees only public projects in `hiring`, `live`, or `completed`.
- Free/member account cannot create a project.
- Company account can create a project with a new source project.
- Company account can create a project linked to an owned source project.
- Invalid project fields are rejected with clear messages.
- Owner can edit draft/pending project details.
- Non-admin owner cannot publish, reject, complete, or force status transitions.
- Platform admin can edit projects created by anyone.
- Owner can delete their project.
- Platform admin can delete any project.
- Deleting a project removes related applications and user project references.
- Archived projects disappear from discovery but remain visible to admins/members.

### Admin

- Non-admin cannot access `/admin/*`.
- Admin dashboard, users, projects, packages, analytics, settings, and
  subscriptions pages load.
- Admin can inspect subscription events and orders.
- Admin project moderation actions update project visibility/status correctly.
- `ADMIN_BOOTSTRAP_SECRET` is removed or disabled after the first admin exists.

### Polar Payments

Use sandbox first. See `docs/POLAR_SETUP.md` for exact environment variables.

- `POLAR_SERVER=sandbox` uses sandbox token and sandbox product ids.
- Member monthly and annual buttons open the correct Polar checkout product.
- Company monthly and annual buttons open the correct Polar checkout product.
- Checkout email is prefilled/locked for logged-in users where Polar supports it.
- Buyer IP forwarding results in the expected localized price/currency.
- Sandbox payment with `4242 4242 4242 4242` succeeds.
- Success page waits for webhook activation and then shows the correct state.
- `users/{uid}` gets `activeMember`, `membershipTier`, `polarCustomerId`,
  `subscriptionId`, `subscriptionEndsAt`, `willRenew`, and status fields.
- `orders`, `subscription_events`, and `processed_webhooks` get records.
- Replaying the same webhook does not duplicate order/event records.
- Cancel from `/billing` keeps access until period end and sets `willRenew=false`.
- Failed renewal or `past_due` keeps access during the retry/grace window.
- Revoked subscription removes access.
- Full refund removes access; partial refund does not unexpectedly revoke it.
- Billing portal opens for users with a Polar customer id.
- `/admin/subscriptions` reflects orders and subscription events.
- Production webhook URL is not an old tunnel URL.
- Production token is rotated if it was ever exposed in plaintext.

### UX Retrospective Pass

Run this after functional checks:

- Each main workflow has a clear next action and no dead ends.
- Buttons and links use consistent language.
- Pricing, subscription, and permission copy is unambiguous.
- Forms preserve user input after validation errors.
- Success states clearly explain what changed.
- Destructive actions have confirmation and recovery where appropriate.
- Mobile menus, dialogs, drawers, and checkout redirects feel coherent.
- Keyboard navigation and focus states are usable.

## Release Gate

Before launch:

- Unit tests pass.
- Build passes.
- Firestore rules are deployed and checked in Rules Playground or staging.
- Full Polar sandbox checklist passes.
- One production low-value payment is tested end to end.
- Admin-only pages are inaccessible to non-admins.
- Dev-only `/test-polar` is removed or locked.

## Analytics & Behaviour Monitoring

Analytics is optional and consent-gated. Run these cases in a browser with
developer tools open; use a staging Measurement ID/Clarity project only. Local,
unit, and E2E test runs must keep `NEXT_PUBLIC_ANALYTICS_ENABLED=false`.

| ID | Area | Requirement | Preconditions | Test steps | Expected result | Automated / Manual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-AN-001 | GA4/Firebase | Initializes with production configuration | Staging/production IDs configured; analytics consent available | Open the site, accept analytics, inspect GA4 DebugView/network | Firebase Analytics initializes once and events are visible | Manual | Not Run |
| QA-AN-002 | Environment | Missing config is safe | Local environment without analytics IDs | Open public pages and inspect console | No analytics runtime error and site works | Automated + Manual | Not Run |
| QA-AN-003 | Page tracking | Initial view once | Analytics enabled and consented | Load `/` and inspect event spy/network | Exactly one `page_view` for the initial pathname | Automated | Not Run |
| QA-AN-004 | Page tracking | SPA navigation once | Analytics enabled and consented | Navigate between two client routes | Exactly one page view per pathname; no duplicate automatic/manual pair | Automated | Not Run |
| QA-AN-005 | CTA | Hero CTA measurable | Landing page loaded; consent granted | Click hero CTA | Stable CTA/external event is emitted without raw sensitive URL | Automated | Not Run |
| QA-AN-006 | Signup | Signup start | Signup page available | Submit valid signup start or click provider | `signup_started` includes only provider/flow categories | Automated | Not Run |
| QA-AN-007 | Signup | Completion only after success | Test account/provider available | Complete signup | `signup_completed` occurs only after account creation succeeds | Automated + Manual | Not Run |
| QA-AN-008 | Authentication | Failure is safe | Login page available | Submit invalid credentials | `login_failed` has category only; no email/password payload | Automated | Not Run |
| QA-AN-009 | Profile | Completion milestone | Authenticated test user | Complete onboarding | `profile_setup_completed` occurs after trusted API completion | Automated + Manual | Not Run |
| QA-AN-010 | Membership | Tier selection measurable | Membership page loaded | Select tier/interval | `membership_tier_selected` has category values only | Automated | Not Run |
| QA-AN-011 | Checkout | Start measurable | Polar sandbox configured | Start checkout | `checkout_started` occurs after a checkout URL is successfully prepared | Automated + Manual | Not Run |
| QA-AN-012 | Checkout | Completion trusted | Polar sandbox webhook flow available | Return from checkout and wait for verified activation | `checkout_completed` occurs only after subscription verification; button click alone does not count | Automated + Manual | Not Run |
| QA-AN-013 | Projects | Creation measurable | Authorized company test user | Open create flow and create a draft | Start/completion events occur; project body is never sent to analytics | Automated + Manual | Not Run |
| QA-AN-014 | Learning | Engagement measurable | Learning content available | Open content and use enrollment CTA | Typed content event and safe form milestone occur | Automated + Manual | Not Run |
| QA-AN-015 | Mentorship | Request measurable | Eligible controlled-pilot user | Open mentorship and submit a request | Start/completion events contain no goals, notes, or private text | Automated + Manual | Not Run |
| QA-AN-016 | Events | External registration readiness | Event surface exists | Click registration CTA | Event is categorized as an outbound action; no sensitive query string is sent | Manual | Not Run |
| QA-AN-017 | Jobs | External application readiness | Jobs surface exists | Click application CTA | Event is categorized as an outbound action; no sensitive URL data is sent | Manual | Not Run |
| QA-AN-018 | External links | Categories are stable | Public page with outbound links | Click Discord/social/booking link | `external_link_clicked` uses destination category/context | Automated | Not Run |
| QA-AN-019 | Clarity | Initializes safely | Clarity ID configured; analytics consent granted | Open eligible public page | Clarity loads after interaction-ready phase without blocking render | Manual | Not Run |
| QA-AN-020 | Clarity | Sensitive fields masked | Public newsletter form; Clarity enabled | Type into newsletter field and inspect recording | Field/form is masked; private route forms are not recorded | Manual | Not Run |
| QA-AN-021 | Privacy | Sensitive values excluded | Analytics spy enabled | Exercise login, signup, profile, checkout, project, mentorship forms | No passwords, emails, tokens, payment data, private text, or raw values in payloads | Automated | Not Run |
| QA-AN-022 | Test isolation | No real telemetry in tests | Unit/E2E environment | Run unit and Playwright suites | No requests to GA4/Clarity; analytics is mockable/no-op | Automated | Not Run |
| QA-AN-023 | Consent | Granting enables tracking | New browser profile | Accept analytics and navigate | Optional tracking starts after consent | Manual | Not Run |
| QA-AN-024 | Consent | Rejecting prevents optional tracking | New browser profile | Reject optional cookies and navigate | Firebase/Clarity optional tracking does not initialize | Automated + Manual | Not Run |
| QA-AN-025 | Reliability | Third-party failure is harmless | Block GA4/Clarity requests | Navigate and use forms | No meaningful console errors or broken workflow | Manual | Not Run |
| QA-AN-026 | Regression | Existing functionality unaffected | Analytics enabled/disabled | Run public, auth, project, learning, mentorship, and billing smoke flows | All existing workflows remain functional in both states | Automated + Manual | Not Run |
