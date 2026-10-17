# Monday Builds, contribution voting and official Passport stamps

## Product behavior

- The GameDev Passport remains free. Paying does not control whether someone can create a profile, record their experience or use their Passport.
- A current GO Community member with at least one administrator-published GO asset pack receives one feature vote in each weekly voting cycle. Multiple packs do not multiply votes. The extra benefit does not change their billing tier.
- The public feature board shows a small set of administrator-curated tasks suitable for a one-hour session. The vote guides the Monday build; it does not guarantee that an unsuitable or unsafe request will ship.
- Voting closes Monday at 07:00 Europe/Warsaw. The build session runs 07:00–08:00. The next cycle opens at 08:00. Unused votes expire and do not accumulate. Voting is handled on the server; no weekly scheduled job is needed to grant the allowance.
- One ballot per authenticated user and cycle is enforced atomically. Membership and official publication are checked against current server records. A visitor can view results but cannot cast a vote.
- Administrators publish candidates, record the selected task and report completed/deferred work. Ties are resolved by the build host, with the decision recorded publicly.
- A published asset pack appears as a contribution on the creator's Passport. An official GO contribution stamp is issued only when the creator is an active member. Existing published packs can be reconciled by their owner after joining.
- GO staff issue event/LAN attendance stamps after checking participation, with an internal evidence note. Members cannot award themselves official stamps. Earned stamps stay as history when membership ends; revoked awards are excluded from public display.
- A public profile can display its stamps. An explicitly public profile or published public CV is required for visitor display. Existing profile/CV privacy choices remain authoritative. A private profile does not disclose stamps or event participation to visitors.
- Clicking a stamp is a local animation only. It does not add likes, votes, XP, currency, attendance or additional official awards. Keyboard activation and reduced-motion preferences are supported.

## Animation handoff

The first release uses lightweight CSS feedback and works without supplied artwork. Custom stamp art is optional. The intended raster handoff is an eight-frame transparent PNG sprite strip: eight square 256px frames, arranged left to right, producing a 2048×256px image. Frame 1 is the still image; the remaining frames show a brief activation effect. Keep important content inside a 224px safe area. No text is required inside the artwork. The same animation must remain understandable as the first still frame under reduced motion.

Save final reviewed art under `public/stamps/` and associate a stamp with its local `/stamps/...png` path. Never load arbitrary scripts, remote HTML or executable animation formats in a stamp.

## Evidence and release requirements

Before enabling voting, verify server transactions, eligibility after publication, single-vote concurrency, expired memberships, Monday cutoffs across daylight-saving changes, private-profile access, staff-only issuance and revocation. A feature board with no published candidates shows an honest empty state. The production release needs no test votes or fabricated attendance records.

## Operational notes

The platform computes the weekly allowance from the current cycle and an atomic ballot record; votes do not require a points balance or a background grant job. Eligibility requires a current, administrator-published pack with a published version and review evidence. Archiving/removing every qualifying pack removes current voting eligibility. Earned stamps stay in the private ledger until explicitly revoked by GO staff.

See `docs/MONDAY_BUILDS_VERIFICATION.md` for the checks, known baseline test failures and deployment limits.
