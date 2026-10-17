# GOHQ/events technical, data, UX and operating design — Phase 1

## Technical architecture

Keep Next.js as the website. Firebase Auth is account identity. Firestore is the application store; payment eligibility remains the server-derived Polar entitlement already resolved for the verified Firebase user. Discord OAuth continues to bind one Discord ID to a GO UID; verify current target guild membership on the server using a trusted guild member read or an approved administrative decision. Account linking alone does not prove a member is still in the server. Discord membership, paid GO membership and a one-edition external seat are separate permissions.

Use a shared server-only `canRegisterForEvent(user, occurrence, action)` rule. Resolve a fresh Firebase identity and server entitlement for every registration, submission and admin operation; ignore client membership flags. Reuse the existing `admin` access boundary for management and never infer an admin exception for attendee eligibility unless a logged rule explicitly grants it. Enforce registration writes and upload/URL checks through server routes and Firebase rules. Add rate limits to submissions/applications and auditable admin actions. Avoid returning identities or registration data in a public feed.

The `/events` page can continue to merge the current Google Calendar public/members data with event-programme records. Keep existing Calendar events operational. Store the two GO programme series, policy, registrations and outcomes in application records because quotas, per-occurrence decisions, historical snapshots and private submissions are not capabilities of the existing read-only event feed. Define an explicit distinction between Calendar events and programme-backed events and deduplicate on a stable source/series reference. Do not silently migrate or rewrite the current meeting calendar. Before development decides which layer owns canonical programme dates, document an event-authoring workflow and confirm whether staff can operate Firestore-backed event administration from the existing `/admin` area.

For exact local recurrence, store IANA timezone `Europe/Skopje`; produce occurrence instants from local calendar dates, not a repeated `+7 days` UTC duration. Generate only a rolling schedule window. Weekly Thursday and monthly first-Sunday/last-Tuesday rules should be reusable presets of the recurrence service; validate a documented, finite custom rule representation. DST tests must prove 20:00 stays 20:00 local. Keep events' original local date, UTC instant, timezone and source rule in each immutable occurrence snapshot. A rule edit affects future unmaterialized occurrences only; an administrator must apply a logged override to an already-created occurrence.

## Proposed Firestore shape

Follow current project casing/index/rule conventions; the names below describe required entities, not migrations already approved. Prefer top-level collections with UID-based private references and narrowly queryable public projections.

| Record | Minimum fields | Access and constraints |
|---|---|---|
| `event_series/{seriesId}` | title, slug, description, category, visibility, eligibility policy, local timezone, recurrence preset/rule, start local date, active/ended, template location/format, capacity, rule version, public metadata | Public reads only for explicitly published safe fields via endpoint; only authorized admin writes. Do not expose a document with internal rules wholesale. |
| `event_occurrences/{occurrenceId}` | series ID, stable period key, local start/end and timezone, UTC start/end, venue, deadline, capacity, exception/override fields, state, theme, generated-from rule version, historic snapshot | Unique `(seriesId, periodKey)`. Preserve completed/cancelled history. Changes/cancel/reschedule are transactional and audited. |
| `event_registrations/{registrationId}` | occurrence ID, GO UID, Discord ID when relevant, member/Discord verification snapshot and time, audience, state, timestamps | Deterministic idempotent key per user/occurrence; private to the participant and authorized admin. Pending external application has no seat. One current registration per identity/occurrence. |
| `external_seat_allocations/{occurrenceId}` | approved distinct Discord IDs or bounded allocation records, current count, revision | Server-only. Transaction limits `approvedCount <= 10`; uniqueness by Discord identity per edition. Counter and status transition update atomically. |
| `game_jam_submissions/{submissionId}` | occurrence ID, submitter UID, title, text, team/credits, safe game/trailer URLs, media reference, controls/platform, asset acknowledgements, warning, deadline, showcase preference, publish consent, review status and history | Author can edit within deadline. Administrators can review. Public projection only after explicit consent plus approval/publish. Reject unsafe URLs, oversized fields and unauthenticated uploads. |
| `showcase_selections/{occurrenceId_submissionId}` | occurrence/submission IDs, outcome, presentation slot/order, schedule, administrator and timestamps | Admin write only, history retained; selected status does not waive venue requirements. |
| `community_space_settings/current` | verified public address, configured opening hours, rules, scheduler URL, visit category text, capacity text and version | Admin write, server-approved public projection only. Leave unconfirmed policy absent. |
| `event_audit_logs/{id}` | actor UID, action, entity, before/after safe identifiers, reason, timestamp | Admin/server write, audited read only. No tokens or payment detail. Define retention after privacy review. |

Avoid duplicate Discord identities: use the existing identity mapping as canonical proof of one-to-one account binding. A deterministic registration/allocation key and Firestore transaction prevents replay. For concurrent external approvals, allocate the seat and mark the application approved in one transaction. Pending and rejected users never consume an approved seat. Define revocation/cancellation release behavior as an explicit rule and log the transition. Retain deleted personal content only to the privacy/retention policy approved for this service.

Google Calendar response caching and existing protected Meet join logic remain independent. Never put a private Meet URL, member calendar title, participant roster or Wi-Fi password in public event JSON. Staff selects a public safe view; `/api/go-events` remains a read endpoint until its evolution is specified.

## Access-control matrix

“View” describes website information. It does not confer physical venue entry.

| Account category | View public schedule | Register for member LAN | Join Game Jam | Apply for external seat | Submit a game | See private submissions / manage series | Visit GOHQ |
|---|---|---|---|---|---|---|---|
| Anonymous | Published safe details | No | No | Sign in and link Discord first | No | No | By approved scheduler appointment only |
| Signed-in non-member, GO Discord not verified | Published safe details | No | No | Apply only after Discord is linked and verified | No until Jam approved | Own submission only after approved registration | By approved scheduler appointment only |
| Signed-in verified GO Discord participant | Published safe details | Only with active eligible membership | Yes, subject to current per-edition rules/capacity | Not an external seat for the same identity | Yes, for registered edition and before deadline | Own submission | As member subject to hours and rules, or approved visit |
| Approved external Discord participant | Published safe details | No unless independently member-eligible | Yes for approved occurrence only | One slot for one distinct Discord ID in that edition | Yes for that edition before deadline | Own submission | Only when an individual event/appointment authorizes entry; no general access |
| Active eligible Community member | Published details; authorized member details | Yes, within capacity and event policy | Yes only if Discord/edition eligibility is met | No external quota claim where already eligible | Yes for registered edition | Own submission | Member access during configured hours under rules |
| GO administrator | Published details plus operational console | Admin action logged; attending/registering still follows policy | Admin review; do not silently imply eligibility | Review/approve/revoke atomically | Review/selection/publish by permission | Yes only for assigned event scope | Subject to approved site policy |

Game Jam participation is Discord-community eligibility, not automatic Community subscription. LAN eligibility is an eligible subscription, checked on the server. A policy change that links or separates these categories must be a recorded administrator configuration with clear public wording.

## UX and accessibility specification

**GOHQ page:** show verified street address with map/directions link, what is available, eligible member hours after configured, membership access limits, visitor appointment process, rules, an explicit active member/visitor state, “Membership” and “Schedule a visit” actions. Until hours and rules are configured, say “Check the current schedule” and link to the official calendar; do not invent dates. Show the same verified address in contact, footer, metadata and event surfaces after the owner resolves the current mismatch between “Bulevar Partizanski Odredi 43” in the brief and “Blvd. Partizanski Odredi 6/43” in source.

**Membership and profile:** add the GOHQ benefit and qualification on `/membership`; link to the GOHQ policy. Extend the canonical profile dashboard rather than creating a second member account. State membership status and its effective date accurately, show only available member events and explain an expired entitlement with a membership link. Avoid exposing subscription or Discord server details.

**Events page:** add real filters using published event metadata. A card identifies recurrence/timezone, venue/online, who can see it versus who can join, status/capacity when published, and action. A non-member sees “Requires active GO Community Membership” plus a join path. A pending external application sees pending status and no join button. Include Game Jam “Join”, “Submit game”, “Showcase”, “Archives” and LAN “Register” actions only when the correct action/state exists. Empty, loading, error, full, closed, cancelled, no-meeting and private states all have understandable text. Mobile month controls and day/event list work without relying on color.

Use semantic headings and labelled native/Radix controls, visible keyboard focus, adequate contrast, error-linked form labels, keyboard-operable dialogs, responsive text and zoom. Give game media alt text and provide non-video game instructions. Do not announce unnamed color dots or use a visual Wi-Fi join as an authorization signal.

## Administrator operating guide

1. Configure and verify the GOHQ address, hours, capacity, house rules and scheduler link; a saved value does not open the venue or verify a booking.
2. Create an event series with visibility, local timezone, source and eligibility policy; preview two years including a leap February and DST boundary. Never set a fictitious end date or showcase time.
3. For each generated occurrence review location, capacity, registration/submission cutoff, optional theme and state. An individual cancellation/reschedule must preserve the original and notify affected registrants once.
4. Review an external Game Jam applicant's unique linked Discord identity and current server membership, then approve or decline. The transaction refuses an eleventh active external seat. Use a waitlist only if enabled. Record reason and identity; do not copy Discord tokens into notes.
5. Review submissions using criteria published before the Jam. Record decision and evidence. Schedule only selected games with consent to publish and a confirmed venue/time. Do not promise stage time based solely on participation.
6. Publish the post-showcase archive using public-safe, permissioned submission fields and preserve credits/history. Check public indexing does not reveal accounts, private submissions or attendee lists.
7. On an access complaint inspect the status, occurrence and audit trail through a minimum-privilege admin screen. Recheck the member's current server-side eligibility; do not manually edit Polar state, assign a global role or promise facility access as a workaround.
8. Review transactional failures, mail outbox retries, waitlist and orphaned media on an operating schedule. Apply approved privacy retention/deletion requests across Firestore, Discord identity references and media. Never delete event evidence required by an active policy without the retention owner.

The screens and permission checks for these steps need to be implemented; this guide does not claim that the present admin dashboard can perform them.
