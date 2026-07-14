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
- Project visibility and edit permissions for visitors, members, owners, project
  admins, platform admins, invitees, and archived projects.
- Webhook HMAC verification, including valid signatures, invalid signatures, and
  the local-development missing-secret path.
- Profile validation for usernames, bios, social links, skills, and privacy.
- Deterministic CV generation from onboarding profile data, including suggested
  improvements and missing-information flags.

Recommended next automated layers:

- Route-handler integration tests with mocked Firebase Admin for `/api/projects`,
  `/api/projects/[id]`, `/api/checkout`, `/api/me/cv`, and billing endpoints.
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
