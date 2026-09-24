# From Idea to Playable — release and operation

Approved launch scope: member/internal-team live course; no standalone payments yet. The price announcement waitlist is separate from a cohort's physical-seat waitlist. No price or paid checkout is configured or implied.

## Routes

- `/education/from-idea-to-playable`: public course, cohort selection, price waitlist, enrolled coursework.
- `/education/from-idea-to-playable-2026-10-05`: pilot cohort entry point.
- `/admin/learning`: flagship course editor above the existing standalone learning editor.
- `/education/<cohort-slug>/participants`: enrollment management and human assessment.
- `/profile`: course enrollment, daily progress and earned badge.

## Approved pilot

5–9 October 2026, 18:00–20:00 Europe/Skopje (GOHQ local time), English, Ivan Kikerkov. GOHQ capacity is 8; online attendance is unlimited. Five two-hour sessions. Active Community-content members and explicitly invited internal-team accounts can enroll. Repeat attendance across cohorts is allowed. Enrollment closes when the first session begins.

The approved course and pilot ship as versioned defaults. Reads do not seed the database. Saving in admin or the first authenticated pilot enrollment persists the cohort transactionally without overwriting existing configuration. Course edits are stored in `learning_courses`. Cohorts remain `learning_items`; enrollments remain `learning_enrollments`.

## Before production use

1. Deploy the application plus `firestore.rules` and `firestore.indexes.json`. Wait for the new waitlist index to become ready before accepting physical-seat waitlists.
2. In `/admin/learning`, set Ivan's actual account UID as the instructor. The name alone is not an authorization grant. The account must be a platform administrator or an approved active mentor under the existing permission model.
3. Add the actual internal-team UIDs to the cohort invitations. No team identities were invented or live user permissions modified.
4. Enter private online session URLs for each day. They were deliberately not fabricated.
5. Optionally add the itch.io jam URL. Creating/configuring an itch.io jam is an external organizer action, not automated by this release. Configure a ranked jam/rating queue if desired. Publish games normally: ten reviews is GO's completion requirement, not itch.io's publication gate.
6. Verify the existing email outbox worker, email delivery and in-app notification configuration. It also expires physical-seat offers. The existing default offer window is 48 hours, capped at the cohort enrollment cutoff.
7. Test with real member, invited-team, instructor and expired-member accounts in a staging environment before broad enrollment. Browser automation performed here uses mock mutations to avoid creating live enrollments.

## Weekly operation

Use **Duplicate next week**, review local dates/timezone, instructor, enrollment cutoff and capacity, then publish. Duplication creates a draft, clears invitations, jam/session links and cohort recordings, and never copies participants/counters. A duplicate identifier is rejected. Shared curriculum is snapshotted when a new cohort is first saved. Existing cohort snapshots remain stable after shared curriculum edits.

Use the flagship editor for linked cohorts; the generic standalone editor rejects edits to those records. Cohort seat counters are server-owned. Confirmed online enrollments count toward total participation but not the physical capacity. Changing attendance mode requires canceling and re-enrolling. Cancellation releases a physical place only for a physical attendee.

Add guides, prompts, QA templates, repositories, slides, homework, downloads, examples and recordings as resource links. New resources begin unapproved. Recordings become visible only after an admin checks **Reviewed and approved for release**. Approved recordings require current membership or an internal-team invitation; expired members see a coming-soon video purchase message. The website gates release of external links, not the external host itself: use the host's private-access controls if revocation of previously opened links is required.

Confirmed live seats and submitted coursework remain accessible after membership expiry. Separate video-bundle purchases and instant/no-questions-asked refund processing are deferred along with all standalone payments. Existing membership checkout/webhooks have not been changed. Do not route future course orders into the current membership paid-order handler.

## Assessment

Students save day completion, published status, their itch.io game URL, review evidence, playtest notes and retrospective. These self-reports do not award a badge.

The assigned instructor/admin verifies the playable game and at least **10 reviews/ratings received**, including when cohort size exceeds 100. They also assess Scope, Build, Debug, Version and Ship, then approve completion. Verification can happen after Friday. No visual-polish or rating-score threshold applies. Submission-version checks prevent approval of evidence edited during review. Approved evidence is locked; requesting changes revokes the award, records an audit event and allows resubmission. The badge appears privately in the course workspace and profile learning dashboard.

## Validation

- `npm run test:unit` includes `tests/bootcamp.test.cjs`: model, authorization, serialized transaction/concurrency simulation, waitlist lifecycle, progress, human assessment, recording expiry and interest consent/withdrawal.
- `npm run test:rules`: Firestore emulator tests include the two new server-only collections.
- `npm run lint`, `npm run typecheck`, `npm run build`.
- Start a production preview on `127.0.0.1:3100`, then `node tests/bootcamp.browser.cjs`. Requires local Chrome. Checks the real public read endpoint plus mock API enrollment, coursework persistence, interest join/withdraw, cancellation and mobile overflow. Screenshots go to `tmp/bootcamp-desktop.png` and `tmp/bootcamp-mobile.png`.

These tests do not certify production email delivery, external recording-host security, live Firebase contention/retries, or actual itch.io reviews. No deployment, real enrollment, jam creation, payment, announcement email or live assessment is performed by the browser script.
