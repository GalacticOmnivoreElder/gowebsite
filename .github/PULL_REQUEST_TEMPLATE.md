## What changed and why

<!-- Short description. Link the relevant QA/test-suite row(s) or issue if applicable. -->

## Automated checks (CI)

CI runs automatically on this PR: lint, unit tests, Firestore rules emulator tests, and the
Playwright visual/smoke suites. All three must pass before merging — see the `ci` status check.

## Manual regression checklist

Only check the areas this PR actually touches. Full checklist: `docs/TEST_PLAN.md`.

- [ ] **Public website** — affected pages load, nav/CTAs route correctly, responsive at mobile/tablet/desktop
- [ ] **Auth & onboarding** — signup/login/logout/reset-password and protected-route redirects still behave
- [ ] **GO CV** — generate/edit/publish/visibility still behave if profile or CV code was touched
- [ ] **Projects & applications** — visibility, ownership, status-transition permissions, and admin actions still behave if touched
- [ ] **Admin** — `/admin/*` pages load and permission checks still hold if touched
- [ ] **UX pass** — destructive actions still confirm, form input survives validation errors, no dead ends introduced

## Payments (Polar) — manual only, not covered by CI

If this PR touches checkout, billing, webhooks, or subscription state, run the relevant sandbox
checklist in `docs/TEST_PLAN.md` ("Polar Payments" section) and `docs/polar-webhook-replay.md`
before merging. Do not rely on CI for payment-flow confidence.

- [ ] N/A — this PR does not touch billing/checkout/webhooks
- [ ] Sandbox checklist run and passed (note which scenarios below)

## Notes / evidence

<!-- Screenshots, sandbox test results, links to CSV rows, etc. -->
