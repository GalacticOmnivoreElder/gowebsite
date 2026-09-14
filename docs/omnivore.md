# Galactic Omnivore learning guide

The full-screen guide lives at `/learn`, linked from the learning menu. The host header/footer are omitted only on that exact route; the existing theme, consent, authentication and deployment configuration remain in use. Its CSS and animation names are scoped to the guide.

The mouth accepts a question; a local keyword mapping selects learning routes, then the eye displays the verified destination. This is a learning navigator, not an AI tutor. It does not learn from visitors or create FAQs.

## Destination verification

`src/lib/go-routes.mjs` fixes the origin to `https://www.galacticomnivore.com`. Only curated keys are accepted. Destinations must appear in the production sitemap and return a matching title/H1 without redirects or soft-404 headings. Verification expires after 60 seconds; upstream requests bypass Next.js's fetch cache. A missing course falls back to verified Education. An outage produces a readable 503 response with an explicitly unverified direct link and a return link to `/learn`.

Maintain `DESTINATIONS` with published canonical CMS paths and title/H1 matchers. Mentorship is `/mentorship`. Newly published routes outside this mapping require review and a mapping update; there is no automatic semantic CMS classification.

## Member progress and privacy

The client uses the existing Firebase Auth session and bearer ID token. `/api/learning-signal` uses the host's `getRequestUser` verifier and Firebase Admin database. No prototype headers or visitor identity cookies are trusted.

Progress is stored at `omnivore_progress/{verified uid}` in the existing Firestore database, protected by the existing default-deny client rules. Aggregate XP, guide badges, last route, bounded event IDs and rate counters are retained. Starter Pathway completions additionally retain private, sanitized evidence/reflection and stable lesson IDs; an allowlisted earned-achievement projection enters the existing Passport. See `docs/STARTER_PATHWAY_RELEASE.md`. Questions and user-supplied tags/names are neither sent nor stored. Unknown payload fields are rejected. Session replay excludes `/learn`, and the guide also has Clarity masking for navigation from an already instrumented page.

An ask earns 20 XP; opening the primary route earns 5 XP. Firestore transactions prevent lost updates and enforce 12 events per minute and 100 per UTC day per account. Repeated event IDs within the day earn no additional XP. These are lightweight engagement awards, not evidence of course completion. Guide badges are separate from membership entitlements and profile badges.

Guests make no progress-service requests and get in-memory XP labelled “this visit.” A service outage or rate limit also falls back to visit XP without mixing it into the saved account total. Account changes clear the active answer and ignore stale responses. No anonymous question history is uploaded on sign-in.

## Animation

`public/animation-manifest.json` has `chew: null`: the supplied CSS jaw rig is the active animation. The avatar and logo fallback come from the export. No ComfyUI generation or external GPU connection was performed. An artist-reviewed local `/animations/name.webm` or `.mp4` can be added later. Video is shown only after playback starts and falls back on waiting/error; paused and reduced-motion modes skip it.

## Checks

- `npm test`: host suite, supplied resolver tests and member-progress regression tests.
- `npm run lint`, `npm run typecheck`, `npm run build`: existing host checks.
- Start the host, set `GO_LAB_URL` to its origin if necessary, then `npm run test:smoke`: supplied live checks adapted to `/learn`. Live verification deliberately fails if production cannot be verified.
- With the host running, `npm run test:omnivore`: desktop/mobile keyboard, focus, repeat questions, motion and service fallback checks. Uses the project's existing Playwright/Chrome installation.

The deterministic progress tests inject authentication and storage. They do not sign in to a real member account or write production data. Deployment remains a separate action.

### Integration verification — 13 September 2026

- Host and Omnivore unit suite: 432 passed.
- Desktop/mobile browser suite against the production build: 8 passed.
- Supplied live smoke suite: 5 passed, including production sitemap verification and click-time fallback.
- Lint, product type checking and production build: passed. Existing host lint and dependency warnings remain.
- Desktop and mobile answer screenshots were visually reviewed. Real-account Firestore persistence was not exercised; authentication/storage behavior is covered by injected regression tests.
