# Production release checklist

Run this checklist for every production release.

## Environment gate

- Set `VERCEL_ENV=production` (Vercel does this automatically) or run a local
  validation build with `GO_VALIDATE_PRODUCTION_ENV=true`.
- Confirm `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin.
- Confirm Polar uses the production server, production access token, webhook
  secret, organization slug, and all four monthly/annual product IDs.
- Confirm Firebase client configuration and Firebase Admin credentials point
  to the production project.
- Confirm Resend transactional delivery and the email outbox cron secret are
  configured.
- Remove `ADMIN_BOOTSTRAP_SECRET`; bootstrap grants are development-only.
- Confirm `/make-admin` and `/test-polar` return the production 404 page.

## Billing and webhook smoke test

- Create a fresh Community monthly purchase in Polar.
- Replay the same signed webhook twice and confirm one processed marker, one
  order, one entitlement transition, and one activation email.
- Confirm Community cancellation retains access until period end.
- Confirm revoked and fully refunded subscriptions remove access.
- Confirm partial refunds do not revoke access.
- Confirm a scheduled Community-to-Business change retains Community access
  until Polar applies the change.

## Authorization smoke test

- Signed-out users cannot read or mutate profiles, CVs, applications, orders,
  subscriptions, projects, webhook markers, or email collections through the
  Firestore client.
- Owners see their own draft/rejected projects only through authenticated API
  management views.
- Public discovery contains only approved public lifecycle states.
- Project owners cannot change status; platform admins can.
- Admin permanent deletion requires typed confirmation and records a minimal
  audit event.

## User experience

- Refresh `/billing` while signed in; it must not bounce to `/login`.
- Visit `/subscription/success` directly; it must not grant access or show a
  purchase confirmation.
- Test dialogs and project/application actions at mobile and desktop widths.
- Run keyboard-only navigation through authentication, project creation,
  application review, billing, and GameDev Passport.
