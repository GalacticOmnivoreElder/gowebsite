# GO Analytics Implementation

## Architecture

Behavioral tracking lives under `src/lib/analytics/` and is exposed to UI code through `trackEvent` and `trackPageView` from `src/lib/analytics/client.js`. Event names and allowed properties are registered in `src/lib/analytics/events.js`; components must not call Firebase Analytics or Clarity directly.

`AnalyticsProvider` is mounted from `src/app/layout.js`. It owns consent state, sends one manual `page_view` per pathname, and loads Clarity only on selected public surfaces. Firebase Analytics uses the existing singleton from `src/firebase.js` and disables automatic page views to avoid duplicates.

Dynamic page-view paths are normalized to route templates such as `/project/[id]` and `/education/[slug]`; content-specific events use only opaque, system-generated identifiers on public learning surfaces.

## Environment variables

Add these public variables to the intended deployment environment. They are identifiers, not secrets:

```text
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_CLARITY_PROJECT_ID=...
```

The existing `NEXT_PUBLIC_FIREBASE_*` client configuration remains required for Firebase Auth/Firestore. Do not put Firebase Admin credentials, Polar tokens, webhook secrets, or service-account keys in `NEXT_PUBLIC_*` variables.

Recommended configuration:

- Local development: `NEXT_PUBLIC_ANALYTICS_ENABLED=false` and no Clarity ID.
- Automated tests: `NEXT_PUBLIC_ANALYTICS_ENABLED=false`; tests must not send real telemetry.
- Staging: enable only when a separate GA4/Firebase measurement stream and Clarity project are configured.
- Production: enable after consent copy and privacy review; use production measurement and Clarity IDs.

## Consent lifecycle

Analytics is denied until the visitor chooses it in the cookie preferences UI. Rejecting optional cookies prevents Firebase Analytics initialization and prevents Clarity loading. Revoking analytics consent disables an initialized Firebase client and sends Clarity consent false when available. The settings control is available in the site footer.

Clarity is deliberately limited to public/product surfaces. It is excluded from admin, account, onboarding, authentication, billing, checkout, subscription, project-detail/edit/create, matchmaking, learning-detail, video-bundle-detail, and resource-detail routes. Public newsletter form markup is explicitly marked for Clarity masking.

## Adding a new event

1. Add the event name and allowed properties to `ANALYTICS_EVENTS`.
2. Keep properties categorical or opaque. Use stable identifiers such as `hero_join`, not visible copy.
3. Never add passwords, emails, names, tokens, phone numbers, addresses, payment data, private messages, private project details, mentorship text, or raw form values.
4. Call `trackEvent("registered_event", { ...safeProperties })` from the relevant client component.
5. Add a unit test for payload construction and a browser test/QA case for the user action when it is a critical journey.

## Event naming standard

Use lowercase `snake_case` names that describe a meaningful action or milestone. Common safe properties include `page_path`, `page_type`, `cta_id`, `content_type`, `content_id`, `membership_tier`, `billing_interval`, `provider`, and categorical error/flow values. Page paths are normalized to exclude query strings and fragments.

## Current event registry

The registry currently covers page views, navigation/external clicks, sign-up, login success/failure, onboarding, membership/checkout, projects, learning, mentorship, and form start/completion/validation errors. See `src/lib/analytics/events.js` for the authoritative list and property allowlist.

## GA4 setup

1. Create or select the GO Firebase project and add a Web app.
2. Enable Google Analytics for the Firebase project and copy the web Measurement ID (`G-...`).
3. Put the ID in `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and set `NEXT_PUBLIC_ANALYTICS_ENABLED=true` in staging/production.
4. Deploy and grant analytics consent in a real browser.
5. Verify `page_view` and custom events in GA4 DebugView or Firebase Analytics realtime reporting.
6. Mark the desired GA4 events as conversions, starting with `signup_completed`, `profile_setup_completed`, and `checkout_completed`.

## Clarity setup

1. Create a Microsoft Clarity project for the correct site/environment.
2. Copy the project ID into `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
3. Keep `NEXT_PUBLIC_ANALYTICS_ENABLED=true` in that environment.
4. Confirm in Clarity that only consented public sessions appear and that private/authenticated routes are excluded.

## Testing

Run `node --test tests/unit/analytics.test.cjs` or the complete `npm run test:unit`. The analytics client no-ops without explicit enablement, without a Measurement ID, without browser support, or without analytics consent. Playwright runs use the disabled default and should spy on calls rather than contacting GA4 or Clarity.
