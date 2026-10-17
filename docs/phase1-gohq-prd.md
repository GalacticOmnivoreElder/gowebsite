# Galactic Omnivore GOHQ and recurring events — Phase 1 PRD

**Status:** Product requirements and engineering design proposal; not implemented.
**Timezone:** `Europe/Skopje` for every defined local event time.

## Purpose and outcomes

Extend the existing GO website so GOHQ membership benefits, visitor appointments, public event information, member eligibility, monthly Game Jam participation and archives form one clear experience. Keep public information easy to find, but check participation rights on the server. Reuse GO's Firebase accounts, Polar membership records, Discord link, Google Calendar event feed, Google visit appointment link and Resend mail where their capabilities fit.

Success means: a member understands GOHQ rules and included activities; a non-member can request an appointment through the existing official scheduler; event information distinguishes public visibility from participation access; eligible accounts register for events; external Game Jam applications receive a fair, atomic quota; game submissions and selection decisions are attached to one historical monthly edition; organizers can operate occurrences without editing website code; and event privacy is respected.

## People and journeys

**Community member:** opens GOHQ and sees where it is, configured community hours, allowed facilities/rules, current membership status, eligible events and a link to event-specific RSVP. An active, eligible subscription is checked by the server when registering; a user without an eligible subscription sees the membership route and cannot create a registration.

**Visitor, partner or prospective member:** opens GOHQ, understands that a membership or individually approved appointment is required, selects “Schedule a visit,” and books in the official Google Calendar appointment scheduler. Calendar confirmation remains its confirmation workflow; merely opening or submitting the scheduler is not building-access approval.

**Discord Game Jam participant:** signs in to the GO website, links a Discord account through existing OAuth, and registers for a specific monthly edition. The server confirms the Discord ID is in the configured GO server or a still-valid approved external application. Paid GO membership is not a Game Jam gate by default. An applicant is not a participant until approved where required.

**Game creator:** registers for the correct edition and uploads or links a game submission. The creator controls archive/public portfolio permission. The submission can be edited until that edition's configured deadline. Being a participant does not guarantee showcase selection.

**Organizer / administrator:** creates or adjusts a series and its generated occurrences, sets time/location/capacity/eligibility/deadline and optional theme, reviews external applications and submissions, selects showcase entries, records an individual cancellation/reschedule, sends only justified notifications and publishes an archive with authorized public entries.

## Product requirements

1. Give GOHQ a public, indexable information page describing verified address, community purpose, configured access hours, access categories, rules, visitor scheduling and membership link. Show membership and appointment eligibility plainly.
2. Link `/membership` to the GOHQ benefit and qualified rules. Show the logged-in user's server-derived current status, eligible upcoming events, and space policy in their member dashboard. Keep private membership and attendance records private.
3. Make `/events` distinguish audience, online/offline/hybrid format, schedule/timezone, recurrence, location, registration open/closed and next action. Filter public, members-only, Game Jam, showcase, LAN, community meeting and workshop types. Do not display private Wi-Fi details or issue a physical-access entitlement from a listing or network connection.
4. Support a recurring weekly and monthly event series, configurable recurrence, an indefinite end date, separately addressable historical occurrences, edits/overrides, cancellation, rescheduling, participant limits, eligibility, archive and notification policies. Generate only bounded views of current/upcoming instances.
5. Offer **GO LAN Thursdays — Worms Armageddon** weekly on Thursdays at 20:00 at GOHQ, following the regular community meeting. Limit web registration to accounts whose canonical Community subscription is currently eligible. The activity is included in that membership fee. Show game installation/licence and equipment guidance without disclosing network credentials.
6. Offer **GO Monthly Game Jam** monthly. For each month, development starts on the first Sunday and the optional in-person showcase is on the last Tuesday at Base42. The series continues until an administrator ends it. Each monthly edition is independent and links its development window, submission deadline, showcase and archive.
7. Confirm Discord server membership from a server-verified identity. Each monthly edition permits no more than 10 distinct, simultaneously approved external Discord identities. A pending application grants nothing. Duplicate linked identities cannot take a second slot. Approval and revocation occur transactionally. Administrator can enable a waitlist.
8. Game submissions may include title, description, credited developers/team, playable/build HTTPS URL, screenshots or controlled upload, trailer URL, platform, controls, third-party credit, content warnings, timestamp, showcase attendance preference and an explicit public-portfolio consent. Keep them editable until the configured deadline; store review and publication history.
9. Organizers review drafts/submissions and set submitted, under-review, selected for showcase, not selected or withdrawn. Show selection criteria before participation and do not promise stage time. Keep who changed the decision and when.
10. Expose published, approved archive pages after each occurrence. Never expose personal application or unconsented submissions. Preserve developers' credit and link to future editions.
11. Use the official appointment scheduler already linked by the site. Build no appointment backend unless investigation proves a blocking limitation. Appointment categories remain scheduler-configurable.
12. Send idempotent event updates through verified existing Resend/outbox and respect user notification preferences. A send failure must not repeat an access grant, double-register a user or create duplicate notifications.
13. Keep policies and content administratively configurable where identified below. Do not fabricate house hours, venue start times, due dates, attendance or selection results.

## Proposed seed schedule

| Programme | Local start | Related date | Location | Participation |
|---|---|---|---|---|
| GO LAN Thursdays | Thursday at 20:00; first stated date 22 October 2026 | Immediately after the existing Thursday Community Meeting | GOHQ, Skopje | Eligible active GO Community Membership |
| GO Monthly Game Jam | First Sunday of each month; proposed first date 1 November 2026 | Optional showcase last Tuesday; proposed first showcase 24 November 2026 | Jam online/community collaboration; showcase Base42, Skopje | GO Discord server member or approved external Discord applicant, at most 10 external per edition |

No showcase start time is stated. No first-Thursday meeting time, Game Jam duration, exact cutoff time, selection policy, capacity, theme, or new access entitlement is seeded by this design. The proposed deadline of the Sunday before the final Tuesday is not approved policy and remains empty until an administrator sets it. Do not modify the existing community meeting recurrence as part of introducing the LAN series.

## Acceptance criteria and exclusions

The [GOHQ test plan](phase1-gohq-implementation-qa-plan.md) has the test cases and access outcomes. This PRD proposes one cohesive product release but needs its own post-design approval. It is not part of AURORA remediation approval. Do not modify existing Polar prices, Firebase login, memberships or Discord role policies just to satisfy a mockup. The LAN compatibility of GO_WIFI and Worms Armageddon must be tested by people at the venue before describing it as operational.
