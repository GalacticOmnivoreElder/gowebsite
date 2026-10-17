# Monday Builds and Passport stamps: verification record

Verified 17 October 2026.

## Implemented flow

- Public board: `/community-builds`.
- Member stamp workspace: `/profile?tab=passport`; the free Passport editor remains `/profile/cv`.
- Staff controls: `/admin/community-builds`.
- APIs: `/api/community-builds`, `/api/passport`, `/api/admin/community-builds`, `/api/admin/passport-stamps`.
- Private collections: `community_build_polls`, `community_build_ballots`, `passport_stamps`. Browser access is denied, including for browser admin claims; writes pass through authenticated server routes.
- Successful administrator asset publication reconciles a contribution stamp. The member workspace can reconcile earlier published packs idempotently.
- Public profiles use a default-deny Passport projection. A published public CV or explicit public legacy profile is required for visitors; the owner can see their own record. A private/unpublished profile causes no stamp or contribution read.

## Checks completed

- Production build: passed with the repository's pinned Next.js 16.4.0 dependencies.
- Product typecheck: passed.
- Lint of all new community components, services, routes and tests: passed.
- Focused audit/profile/voting/stamp suite: 39 passed.
- Full unit suite: 487 passed, four failed. The same four failures were reproduced with the original committed source from before this work: two obsolete landing-route/pillar assertions, an obsolete homepage asset-pack phrase assertion, and a subscription cancellation test whose fixed paid-through date is already in the past.
- Counting snapshot: public KPI values match the private audit.
- Browser: verified the public report and report download, all 13 public project links and mobile width.
- Browser with isolated fixtures: verified empty voting state, candidate selection, one submitted ballot locking the UI, member benefit display, stamp activation and reduced-motion support. No live ballots or awards were created.
- Live local auth boundary: unsigned requests to Passport and staff APIs return 401. Unsigned POSTs to all four new write endpoints return 401, including bodies with spoofed user IDs/admin flags.

## Transaction checks

The service transaction tests run the actual service functions against a serialized in-memory transaction adapter. They cover concurrent submissions producing one ballot, membership expiration and unpublished packs removing eligibility, stale cycles, invalid options, one contribution stamp per pack across versions, inactive-member rejection, duplicate event awards, retention after membership expiration and staff revocation.

Time policy tests cover Monday 07:00 close, Monday 08:00 reset and Warsaw daylight-saving changes. Passport tests prove private records cause zero projection reads and that public stamp data omits recipient IDs, issuer IDs, internal event IDs and verification notes.

## Verification limits

The local public board API returned 503 because this checkout's Firestore credentials were unavailable. Authenticated tests against a real Firestore instance and browser rules tests were not run; Java/Firestore emulator was unavailable. No production test members, subscriptions, votes or attendance were fabricated.

The explicit collection-deny rules are additive; the existing deployed default-deny rule already denies these collections. The server implementation requires no new Firestore indexes because per-member queries use a single equality filter.

## Release and first use

The code and documentation are ready for review. Publishing is currently blocked by local Git authentication and the connected GitHub app returning 403 for write operations; GitHub Desktop access timed out. Do not describe the changes as deployed until a production deployment is verified.

After publication, GO staff should open the admin page and publish two to eight real one-hour candidates for the current or next cycle. The board remains empty until that happens. Staff can then issue verified attendance stamps and record Monday outcomes. No cron, reminder or autonomous code-writing automation has been created.

Artwork is optional. See `docs/GO_STAMP_ART_BRIEF.md` for the eight-frame transparent PNG format and the built-in fallback behavior.
