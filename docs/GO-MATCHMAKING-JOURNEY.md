# GO matchmaking and development journey

## Phase 1: repository audit

The implementation reuses the platform's existing sources of truth:

| Capability | Existing source and flow | Implementation point |
| --- | --- | --- |
| Discord hunger | `src/lib/discord-appetite.mjs` maps configured Discord roles to `hungry`, `one_more_bite`, and `full`; `src/lib/discord.js` syncs the current role-derived value into the server-only `discord_connections` document. The public Discord summary is aggregate-only. | `src/lib/go-journey-service.js` reads the synchronized value only when the member opts in to sharing it and the connection and role-map hash are current. `src/lib/discord.js` clears the shared value when sync or disconnect removes eligibility. |
| Accounts and privacy | Authenticated API routes use `getRequestUser`. `src/lib/monday-builds.mjs` defines `passportIsVisible`: an active, public GO CV controls visibility when present; otherwise legacy `profilePrivacy` applies. | Matchmaking is explicit opt-in. Public logs and skill evidence use the same profile visibility rule; owners can still see their own private records. |
| Skills and evidence | Self-reported skills live on `users.skills`; normalization and display keys are in `src/lib/skills.js`; active catalog data is in `src/lib/skill-catalog.js`. Project membership and active mentorships already have server-side authorization helpers. | Matching reads the account's existing skill tags. Evidence requests refer to a current tag and a project or active mentorship; collaborators or the active mentor validate it. |
| GO jams and attendance | `learning_items`, `learning_enrollments`, organizer participant state transitions, admin learning UI, enrollment, and participant APIs already provide event setup, RSVP, and organizer-confirmed attendance. Calendar integrations only read external calendar data. | A game jam is a workshop learning item. Its existing organizer attendance transition issues/revokes the Passport badge and journals the correction. No calendar writes or outbound Discord messages are made. |
| Passport | `passport_stamps` stores protected earned stamps; `readPassport` and `visiblePassport` return a sanitized, profile-visibility-aware projection. | An attendance-derived stamp has a deterministic ID. `passport_preferences` hides selected issued stamps from public display without deleting the earned record. |
| Client/API/database | App APIs use the Admin SDK; Firestore rules default-deny browser access. Tests use `node:test`, `loadSourceModule`, and the Firestore rules emulator. | New private collections are explicitly denied to browser clients and served through authenticated, no-store APIs. |

### Plan and decisions

1. Use opt-in profile fields for collaboration goal, seeking skills, interest tags, timezone, availability, and optional sharing of the current hunger state. Rank only opted-in candidates with explainable skill, interest, scheduling, goal, and consented hunger reasons. The account model has no normalized experience-level field, so experience is not scored. Require a mutual accept before a match is confirmed; allow decline and block. Do not send messages or disclose Discord activity.
2. Add GO game jams as a type of the existing workshop event. Confirmed enrollment is an RSVP; only organizer-confirmed `attended` status grants one idempotent Passport stamp. A later organizer correction revokes the stamp and corrects the active KPI.
3. Record structured milestones rather than page views. Store canonical UTC timestamps and versioned GO stardates. Keep private details separate from short public summaries; apply account privacy to all public log and evidence reads and allow per-entry and per-badge controls.
4. Show activity KPIs separately from skill evidence. Never infer proficiency from passive activity. Keep self-reported tags, verified project use, and peer/mentor validation distinct.
5. Keep the proposed progression gate inactive. The brief does not identify the exact career milestone or provide an exception route, so this implementation tracks participation without blocking any existing career step. The account-privacy decision is also kept within the current privacy contract: private accounts remain private.

## Implemented behavior

### Matchmaking

`/matchmaking` and `/api/matchmaking` provide opt-in, preference editing, ranked suggestions, and accept/decline/block actions. Each pair needs both creators to accept before the system records a match. A match reveals only the opted-in profile fields and a GO profile link; GO does not message either person. The current candidate scan considers the 100 most recently updated opted-in profiles, and suggestions show the match factors used. Hunger is included only after the member separately enables hunger sharing; `full` does not improve a match score.

### Game jams and Passport

Administrators create jams in the existing learning admin flow by marking a workshop as a GO game jam and choosing active GO skill tags from the existing catalogue. Jams appear in education only when `GO_GAME_JAMS_ENABLED=true`. Enrollment follows the existing enrollment and access rules. A GO learning manager records attendance in the participant workflow. One `GO Game Jam Participant` stamp is issued per user and jam. If an organizer corrects an attended record, the stamp becomes revoked and the journal records the correction; the original record remains auditable. Badge display preferences hide issued stamps without erasing ownership.

### Journal, stardates, and skills

The journal records jam registration and verified attendance, mutually accepted matches, and validated skill evidence. It does not scrape Discord or record page views. Public endpoints enforce existing profile visibility; owners can hide individual entries. KPIs count attended jams, confirmed matches, and validated skills; hiding a record removes it from public totals while retaining the owner's total. Corrected events remain visible to the owner as audit history and are omitted publicly and from active totals.

The original display format is `GO-SD <cosmic age> ± <uncertainty> Gyr · <UTC year>.<ordinal day>`. It estimates the universe's age at the event time from the Planck 2018 base-ΛCDM result of 13.797 ± 0.023 billion years, plus elapsed UTC calendar time since the stored reference `2018-01-01T00:00:00.000Z`. The displayed central value rounds to 0.01 Gyr and uncertainty rounds outward to 0.03 Gyr. The ordinal day is a readable UTC date suffix, not a precision claim. Every entry retains its ISO UTC timestamp for ordering and accessibility; `go-cosmic-v1` and the source DOI are stored with the event. This is GO's original display and is not an official Star Trek date system. Source: [Planck 2018 cosmological parameters](https://doi.org/10.1051/0004-6361/201833910).

The profile shows each existing GO skill tag, self-reported status, validated project-use count, and validation count. Pending claims are only visible to the owner and eligible reviewers. Public project names and validator identity are shown only when their own privacy permits it; private projects are labeled generically.

## Data, authorization, and operations

Private server-side collections are `go_matchmaking_profiles`, `go_matchmaking_pairs`, `go_journey_events`, `go_journey_preferences`, `go_journey_stats`, `go_skill_evidence`, and `passport_preferences`. `firestore.rules` denies direct browser reads and writes. Authenticated routes validate owner, opt-in, event manager, project member, or active mentor authorization before mutation. The existing `passport_stamps` server-only collection remains the stamp source of truth. The journal event IDs, pair IDs, evidence IDs, and jam stamp IDs are deterministic to prevent duplicate issuance for the same source. Each creator can have at most 20 pending skill validation requests, and no validation requests trigger outbound contact.

All three features default off and are controlled independently with local environment flags:

```text
GO_MATCHMAKING_ENABLED=true
GO_GAME_JAMS_ENABLED=true
GO_DEVELOPMENT_JOURNEY_ENABLED=true
```

Enable them only in a local environment with test accounts and fixtures. Do not enable them in production as part of this change. Rollback is to turn the flags off; this hides the new flows without changing existing entitlements. No production migration, backfill, deployment, external calendar mutation, or real contact is part of the implementation.

Records currently follow the account's existing data lifecycle; there is no new time-based deletion job. Attendance corrections are retained as audit history. Before production rollout, connect these collections to the platform's account deletion and retention policy, and determine whether match and journal records need a user-driven deletion/export workflow.

## File map

- `src/lib/go-journey.mjs`, `src/lib/go-journey-service.js`, `src/lib/go-skill-evidence-service.js`: stardates, matching, journal/KPI storage, badge preference, and validated skill evidence.
- `src/app/api/matchmaking/route.js`, `src/app/api/development-log/route.js`, `src/app/api/skill-evidence/route.js`, `src/app/api/passport/route.js`, `src/app/api/user/[id]/route.js`: authenticated feature APIs and profile integration.
- `src/app/matchmaking/page.js`, `src/components/matchmaking/MatchmakingWorkspace.jsx`: matchmaking page and consent controls.
- `src/components/profile/GoDevelopmentLog.jsx`, `src/components/profile/SkillEvidencePanel.jsx`, `src/components/profile/MissionHub.jsx`: owner/public journal and skill evidence views.
- `src/lib/learning-items.js`, `src/lib/learning-enrollment.js`, `src/app/api/learning-items/route.js`, `src/app/api/learning-items/[slug]/route.js`, `src/app/api/learning-items/[slug]/enrollment/route.js`, `src/app/api/learning-items/[slug]/participants/route.js`, `src/app/admin/learning/page.js`, `src/app/education/page.js`, `src/components/learning/LearningDetail.jsx`: jam setup, RSVP, attendance, and participant display using the existing learning event lifecycle.
- `src/lib/discord.js`: maintain the optional shared appetite signal as Discord eligibility changes.
- `src/lib/community-build-service.js`, `src/lib/monday-builds.mjs`, `src/components/community/PassportStamps.jsx`, `src/components/community/PassportWorkspace.jsx`: safe Passport projection and badge display preference.
- `src/lib/product-config.js`, `src/lib/navigation.js`, `firestore.rules`, `firestore.indexes.json`: feature flags, navigation, server-only collection rules, and journal query index.
- `tests/unit/go-journey.test.cjs`, `tests/unit/index.test.cjs`, `tests/firestore-rules.test.cjs`: deterministic behavior and access-control coverage.

## Acceptance checks and remaining decisions

The safety review keeps account identity and personal contact fields behind explicit opt-in, stores preferences and event detail in server-only collections, requires mutual match acceptance, and provides decline and block controls. Match actions never contact another user; skill requests are bounded and require project or active mentorship authorization. GO Discord role state is only shared by explicit choice and is removed when the connection no longer qualifies. Accessible controls use labels, status/error announcements, keyboard-operable actions, and a readable numeric skill summary beside the bar visualization.

Local validation should cover opt-in matchmaking, mutual consent and blocking, hidden Discord appetite by default, profile privacy, jam enrollment versus attendance, idempotent stamp issuance and correction, hidden badge display, skill evidence authorization and request limits, stardate version/conversion, journal KPIs, and keyboard-readable skill values alongside the visual graph. Rollback is to disable the feature flags; because the new collections are additive and no production migration is included, disabling the flags hides the routes and UI while preserving records for any later local re-enable.

The remaining product decision is the exact career progression milestone that jam attendance may gate and its accessible exception or alternative path. No existing progression is blocked until that decision is made. The candidate scan cap and the platform's account retention/deletion policy also need an operational decision before larger rollout.
