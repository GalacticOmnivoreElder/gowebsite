# Starter Pathway implementation — review notes

Current placement: the course is listed under Education → Courses and opens at
`/education/starter-pathway`. Ask the Omnivore links to its first mission; it no
longer embeds the course. The profile's Learning tab contains the progression
card previously shown in the Passport editor. Saved records and awards retain
their existing identifiers and storage. Earlier verification notes below refer
to the original `/learn` placement.

Implemented in the existing Next.js/Firebase GO platform. No deployment, new identity system, checkout, upload service, or academy.

## Routes and content

- `/learn`: six-world pathway inside the existing Omnivore guide, free Notice mission, mode choices, private evidence/reflection, completion feedback, next actions and membership gates.
- `/education`: pathway entry point.
- `GET /api/learning-catalog`: versioned six-lesson curriculum and course/workshop/video/asset-pack metadata. Future packages are planned with no purchase links.
- Existing `/api/learning-signal`: authenticated lesson completion and summary, canonical awards, Community gate, bounded input and existing transaction rate limits. Legacy ask/open awards remain unchanged. The catalog explicitly maps lesson route keys to reviewed `/learn#world-…` destinations.
- Existing `/profile/cv` and profile UI show earned achievements using the current Passport visibility checks.

Runtime copy is canonical in `src/content/starter-lessons.mjs`, with a JSDoc-typed adapter in `evergreen-curriculum.mjs`. `starter-pathway.md` is the editorial reference; update the runtime data when reviewing copy.

## Data and privacy

Additive fields on existing `omnivore_progress/{uid}` documents: completedLessons, completions (private evidence/reflection/mode/date), pathwayBonusAwarded and optional publicSummary. The existing Firestore transaction prevents duplicate awards, including retries with different event IDs. All six missions award 500 XP; the pathway adds 100 exactly once.

An allowlisted projection is merged into `go_cvs/{uid}.starterPathway` in the same transaction. Existing Passport status and visibility are preserved. If no Passport exists, the initial record is a private draft. Generation preserves the earned record without writing a stale copy over concurrent completions. Evidence/reflections never enter Passport responses. A separate summary is shared only if explicitly selected during Share and all six worlds are complete; existing Passport visibility still applies.

Firestore is schemaless: no SQL migration, indexes, migration generator, runtime DDL, or production backfill is needed. Existing default-deny rules protect omnivore_progress; go_cvs is already server-only. Existing users without new fields read as zero lesson completions.

Draft evidence and reflection survive switching worlds in component memory and clear on account changes. Anonymous completion lives in component memory for this visit. Reload discards it; it is not silently imported into an account. Server/connection failure is labeled explicitly. Membership cannot be assumed when access cannot be verified.

## Validation and release limits

- Full unit suite: 439 passed, including catalog, 600 XP lifetime total, duplicate submissions, private projection, validation, legacy awards and membership gates.
- Project typecheck passed. Lint passed with existing unrelated warnings.
- Production build passed; final build and browser results recorded below.
- Firestore emulator checks attempted but blocked: Java is not installed/on PATH. No authenticated test account was supplied or used, and no production database writes were made. Real-account reload, concurrent database requests, and visibility verification still need a safe test account/emulator before release.
- No live URL/version: not published. Review copy, access and privacy before requesting deployment.

## Deliberately excluded

Uploads, autonomous tutoring, public learner questions/FAQs, child profiling, new payment flows, editor/CMS, and publishing planned companion products.

Browser verification passed at 390×844 and 1440×1000 with reduced motion: keyboard start, free completion, zero XP on retry, visit-only reload reset, Community lock, six-lesson catalog, and no horizontal overflow or browser errors. Screenshots are in `tmp/starter-mobile.png` and `tmp/starter-desktop.png`. Reproduce with a local server on port 3100 and `node tests/starter-pathway.browser.cjs` (or set GO_LAB_URL). The existing cookie banner is rejected in the test browser.

## File inventory

Added: `src/content/starter-lessons.mjs`, `src/content/evergreen-curriculum.mjs`, `src/content/product-catalog.mjs`, `src/content/starter-pathway.md`, `src/lib/starter-passport.mjs`, `src/app/api/learning-catalog/route.js`, `src/components/omnivore/StarterPathway.jsx`, `src/components/profile/StarterAchievements.jsx`, `tests/starter-pathway.test.mjs`, `tests/starter-pathway.browser.cjs`, and this release note.

Updated: `src/lib/omnivore-progress.mjs`, `src/app/api/learning-signal/route.js`, `src/app/api/me/cv/route.js`, `src/components/omnivore/Omnivore.jsx`, `src/components/omnivore/single-lab.css`, `src/components/profile/CvWorkspace.jsx`, `src/components/profile/MissionHub.jsx`, `src/app/education/page.js`, `package.json`, `jsconfig.product.json`, and `tests/unit/me-cv-route.test.cjs`.


## Review pass — 14 September 2026

Reviewed the existing uncommitted implementation against the supplied handoff. README and MIGRATION_ROADMAP.md were read; this checkout has no MIGRATION.md. Route conventions are documented in docs/omnivore.md and src/lib/go-routes.mjs. The existing learning-item editor manages course/event packaging; the six mission bodies are versioned source content, with no second CMS.

Fixed draft loss on world navigation, added explicit local lesson destinations, bounded optional start-event text and rejected non-string lesson IDs, limited public-summary opt-in to Share, and removed a Passport regeneration race that could overwrite newer achievements.

Fresh checks: 439 unit tests passed; typecheck passed; production build passed; lint passed with existing host warnings (the curriculum's anonymous-default-export warning was subsequently removed). Starter browser acceptance passed on mobile and desktop, including blank evidence validation, draft retention, duplicate XP and visit-only behavior. All 8 existing Omnivore desktop/mobile browser tests passed. Both screenshots were visually reviewed. There is no new schema migration or deployment. Firestore emulator checks failed to start because Java is unavailable. Authenticated database persistence, real concurrent transactions, and public/private Passport visibility still require a safe test account or emulator before release. No deployed behavior is claimed.

Local preview: http://localhost:3100/learn. Content version: starter-pathway-v1. The live website has not been changed. Publication remains subject to the product owner's explicit request after copy, access and privacy review.

Additional documentation updated during this review: `docs/omnivore.md`. Existing unrelated workspace changes, including `.claude/`, were preserved.

## Evergreen course revision — starter-pathway-v2

The product owner's latest request supersedes the original mandatory-evidence contract. All six lessons now teach player actions, decisions, rules, consequences, feedback, iteration and communication without prescribing tools or engines. Each step has two concrete optional approaches, three practical actions, an enduring principle and optional private journey notes/reflection. Completion is self-reported and accepts omitted or empty notes. Existing IDs, membership gates, XP totals and duplicate protection remain intact. Legacy evidence/reflection storage keys and mode inputs remain compatible; the new UI uses journey language and a validated optional approach instead of tool choices.

The curriculum, editorial reference, course listing, metadata and reading/form UI were updated together. Notes entered here are saved with first completion; this revision does not introduce a full journal editor. Public sharing remains an explicit separate opt-in. Checks: 440 tests passed, typecheck and lint passed (existing host warnings), and mobile/desktop browser checks passed including empty-note completion, draft retention, duplicate safety and membership lock. No deployment performed.

## Verification completed — 16 September 2026

Verified the current committed implementation (`1b429b7`, curriculum `starter-pathway-v2`) without reverting the later course-location or optional-notes revisions. The canonical course entry is `/education/starter-pathway`, linked from `/education`; `/learn` remains the instructor guide.

Fresh results: all 440 unit tests passed; typecheck passed; production build passed, including lint with existing unrelated warnings. The browser acceptance suite passed against that production build on local port 3107 at mobile and desktop sizes: Education entry, keyboard start, optional-note completion, private draft retention across steps, duplicate XP, visit-only reload reset, membership lock, catalog and no horizontal overflow or browser errors. Mobile output was visually reviewed.

No application changes were needed during this verification. Java remains unavailable, so Firestore emulator tests and real-account/concurrent persistence and visibility checks remain outstanding before release. No deployment or production writes were performed.
