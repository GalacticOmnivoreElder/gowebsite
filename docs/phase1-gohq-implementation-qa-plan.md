# GOHQ/events implementation milestones and QA — Phase 1

Companion to [GOHQ PRD](phase1-gohq-prd.md) and [technical, data, UX and operations design](phase1-gohq-technical-ux-access-operations.md). This is a proposal for separate approval. The existing app has no event administration or registration feature capable of operating the specified programmes. Do not treat the AURORA approval as authorization for this build.

## Dependency-aware milestones

| Milestone | Deliverable | Verification and dependency |
|---|---|---|
| 0. Owner decisions | Verify venue street address and booking link; name eligible Community products/tier; designate guild verification method and GO Discord member definition; confirm house rules/hours; pick nomination/registration/window defaults; agree who can administer events; confirm LAN equipment/network and meeting relationship. | No production content or authorization policy until owner-confirmed. The scheduler itself already exists. |
| 1. Shared event and policy foundations | Versioned series/occurrence model, bounded Europe/Skopje recurrence service, shared server-side audience/eligibility check, admin audit and server-only Firestore rules; public event view with public-safe projection. | Recurrence, per-occurrence history, role and data-policy tests. Requires Firebase rules deployment plan and reviewed index/config needs. |
| 2. GOHQ content and event calendar | Public GOHQ route and membership links, space policy presentation, event filters/cards, profile eligibility state, visitor link to existing scheduler. | Public/non-member/member visual and accessibility check. No duplicate booking service. Content requires milestone 0 sign-off. |
| 3. LAN Thursdays | Series and occurrences, 20:00 Skopje TZ, GOHQ, server-checked membership registration, configurable RSVP capacity and meeting link/reference. | Active, expired, canceled through paid period, unknown membership, admin and anonymous access cases; DST and venue/network play test. Existing Thursday meeting untouched. |
| 4. Monthly Game Jam | First-Sunday monthly editions and last-Tuesday/Base42 showcase link; Discord server verification; external application, ten-seat atomic quota and optional waitlist. | Concurrent 10+/unique Discord identity/cancel/revoke tests, DST/month-end/leap-year recurrence, replay and server permission checks. No paid-member prerequisite unless separately configured. |
| 5. Submissions, review and archive | Deadline/optional media references, editing, consent, status/history, admin criteria and selection, showcase schedule and public archives. | Deadline race, permission denial, consent revoke, private-field response audit, safe-link and deletion/retention tests. |
| 6. Notifications and rollout | Idempotent Resend outbox events, templates/preferences, logs, support runbook and staff training. Stage and deploy through reviewed CI and production readiness gate. | Controlled inbox, retries/cancel/reschedule duplicate tests. Test community event end-to-end in staging; production smoke is read-only until a deliberately authorized live event is scheduled. |

Use existing Firebase, Polar, Discord OAuth/bot, Calendar, Resend and Vercel systems. Do not add a paid scheduler, queue, recurring-infrastructure service or frontend dependency without a demonstrated gap and updated estimate. Existing mail and Discord tooling must be verified in the isolated environment before enabling real member communications or role changes.

## Acceptance and adversarial test catalogue

**Dates and occurrences:** Generate the first Sunday and last Tuesday correctly for short and long months and leap years. Weekly events remain Thursday at 20:00 `Europe/Skopje` across both DST transitions. Month/year boundary keys do not collide. A one-occurrence cancellation does not end the series. Rescheduling preserves the original occurrence and stores the override. Rule edits never silently rewrite archived dates or submissions. Unlimited future recurrence does not create infinite documents.

**Membership:** Each protected API validates the current Firebase bearer token and latest server-side subscription entitlement. Test active access, expiration, cancellation with remaining paid-through time, payment failure/revocation, admin access and deleted/suspended identities. A stale client flag, guessed UID or forged status does not enable registration. Do not treat all GO plans as the eligible tier without owner configuration.

**Discord and external cap:** Test new OAuth, existing account link, CSRF/state expiry and replay, duplicate Discord identity on a second GO account, user who leaves the server, bot unable to read the guild, rate limiting, and unavailable OAuth. Verify server membership from the configured guild. Issue more than ten simultaneous approvals against a staging occurrence: at most ten unique external Discord IDs have active approvals; retries do not double allocate; revocation releases a seat only under the selected policy; pending and waitlisted applicants have no join access. Paid membership and Discord server membership remain distinct.

**Game Jam:** Every registration/submission references its own month. Enforce cutoff using server UTC derived from the stored timezone. Permit edits before and deny edits after the cutoff; handle simultaneous last-second edit safely. Review/selection requires admin. Archive preserves credit, historical decisions and consent; one person cannot publish another's work or expose private moderation notes. Unconsented work never appears in public APIs, page metadata, search index or Open Graph.

**LAN and scheduler:** Series advertises Thursday at 20:00 at GOHQ, after but without editing the existing meeting. Capacity is atomic if enabled. Signed-out/nonmember/expired member receive a membership path, not RSVP. Active eligible member can RSVP idempotently. No response exposes GO_WIFI password. Visitor can open the same official scheduler; booking confirmation follows Google's existing workflow and does not update membership or general venue permission.

**Notifications/admin:** Admin-only edit, cancel, approve, review, selection and publish routes enforce server permissions, audit reason and actor, protect CSRF and body size, and limit abuse. Resend events are idempotent through retry/resend/reschedule races and respect notification preference. Outbox failure does not cause duplicate registration or false confirmation. Redact tokens and personal data from application logs.

**Privacy/security/accessibility:** Test Firestore user and server paths with Firebase rules emulator. The unauthenticated event API returns only published public content. Hidden occurrence, membership state, attendees, Discord ID, submission draft, moderation, token, Meet link and audit are private. Validate signed upload or link policy, maximum payloads, safe `https:` media links, spam/rate limits and retention deletion. Run axe and manually test keyboard, focus, screen reader, zoom, colour, errors and responsive list/calendar states. Automated pass does not claim WCAG conformance.

## Release readiness and operations

Use separate Firebase/Vercel preview configuration, disposable test accounts and a Discord staging server before enabling a feature flag, event listing or live bot operation. Test a real Google Calendar appointment without completing a production booking. Run authenticated game workflows only in staging. Verify security rules/indexes, Vercel configuration and required secret presence without printing or copying secret values. Use a rollback plan that accounts for newly written records: disable new event participation before rolling application code back; preserve registration/submission data and export/audit state; do not delete a Firestore collection in the app rollback.

Before staff create the recurring Calendar/public occurrence, run the GO_WIFI/Worms LAN compatibility test, confirm the GOHQ address, resolve address inconsistency, approve house hours/rules, test audience boundaries and double-check whether the existing community meeting is part of the event schedule. The Base42 showcase needs a confirmed start time, capacity and host approval before publication. Test with one private staging occurrence end-to-end. Have the event owner sign off on the publication content and selection criteria.

Initial estimate: **approximately 12–20 engineering days** for the proposed foundation, space content, LAN, Game Jam registration/quotas/submissions/admin, and baseline automated tests, plus **3–5 days** for integration staging, recurrence/security edge cases, operational readiness and publication setup. This excludes unresolved product policy, external Discord/calendar permission setup, substantial upload or collaboration requirements, and production incidents. Refine the estimate after milestone 0 and an implementation spike on recurrence and concurrent Firestore seat allocation.

## Required product decisions before feature implementation

| Decision | Current evidence | Required owner decision |
|---|---|---|
| GOHQ street address | Prompt says “Bulevar Partizanski Odredi 43”; existing contact page and SEO use “Blvd. Partizanski Odredi 6/43”. | Confirm canonical postal/map address for every published route. |
| Active eligible Community plans | Existing Polar tier and `activeMember` state; paid status differs from Discord access. | Identify exact eligible products/tiers and whether an active admin is automatically eligible to attend. |
| Official GO member in Discord | OAuth bot can join members/manage a configured paid-member role; deployment configuration and eligibility must be verified. | Choose current-guild verification authority and define what happens when a Discord member leaves or the bot is offline. |
| External seats | Ten approved people per monthly edition specified. | Choose release-on-revocation/cancellation rule, decision/appeal process and whether a waitlist launches enabled. |
| Hours, rules and visitor categories | Site already has a Google Calendar booking URL; no supported house-hours schedule established. | Approve member hours, house rules and Google Calendar booking categories. |
| Game Jam timeline | First Sunday/last Tuesday specified; November 2026 proposed first edition. Start/end times and exact submission cutoff absent. | Confirm launch date, deadline, cutoff timezone, criteria, length, capacity and theme. Keep Sunday-before-Tuesday as proposal until approved. |
| Showcase | Base42 and last Tuesday specified; start time and presentation duration absent. | Confirm start time, capacity, presenter/attendance expectation and Base42 booking. |
| LAN capacity and dependencies | 22 October 2026 at 20:00 specified; immediately after current meeting. | Confirm RSVP capacity, existing meeting event and local network/game compatibility before advertising operational status. |
| Appointments and membership content | Existing scheduler link can serve as existing flow. | Confirm link ownership, categories, times and copy; do not import appointment records. |
| Historical data retention | No new event/submission collection exists in the inspected application. | Approve consent, removal, audit and archive retention policy before migration/public submission. |

Proceed with reversible engineering defaults only after product scope approval. Leave the above business fields unset or clearly marked pending until their owners decide.
