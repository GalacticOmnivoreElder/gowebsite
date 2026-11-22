# GO platform → Discord bridge

## Implementation prompt

Make GO the authoritative community-management interface. Preserve verified
Discord OAuth linking and explicit server-join consent. Derive Discord role
eligibility from server-owned membership/approval records and validated GO
profile fields; users may select skills but must never select paid, mentor,
staff, or administrative privileges. Reconcile a declared allowlist of roles,
preserve unrelated roles, clean up retired mappings and disconnected accounts,
and make failures retryable. Provide administrator mapping, preview, migration,
manual non-administrative grants, and synchronization visibility. Discord remains
the communication surface; the existing bot points members back to GO and must
not independently grant or remove platform-owned roles. Ship tests, an operator
runbook, and a precise list of human/account-owner tasks. Never infer paid status
from an existing Discord role or silently join someone who left.

## Phase 1 — audit and decisions

Baseline: existing OAuth, single paid role, periodic reconciliation, skill editor,
onboarding and admin skill catalog. Preserve the newer Discord appetite import
until explicitly configured for platform ownership. Existing role inventory has
53 roles and 179 channels/categories as of November 3; a November 17 refresh found
a new channel type not supported by the bot library. Handle/report unknown types
before claiming the inventory is complete. Re-fetch roles live before applying.

Authority: GO owns configured role IDs only. Free linked access, onboarding,
skills, languages, interests, paid membership, approved mentor, Business and
explicit admin grants are separate rules. Native administrative Discord roles
are excluded from automation. Defaults are preview-only. Import existing role
names/IDs as a draft; no membership entitlement comes from Discord role possession.

## Phase 2 — policy and synchronization

Implement a pure eligibility policy, strict mapping validation, live hierarchy
checks, tracked role ownership, preview/apply modes, bounded per-run writes,
retry/backoff, and disconnect cleanup. Queue profile/onboarding changes; periodic
reconciliation heals missed jobs and expiration. Store original/retired managed
IDs until cleanup succeeds. Do not replace the entire member role array.

## Phase 3 — platform controls

Admin screen: live roles, mapping source/value, preview/apply mode, per-user
preview/retry, explicit manual grants, and recent connection states. Members use
existing profile skill editing and Discord connect controls; show role-sync state.
Defaults and migration require no changes to unrelated members or server channels.

## Phase 4 — communication bot

Retire remaining legacy reaction-removal behavior so the bot cannot undo GO
roles. Add `/go-connect` and `/go-profile` directing members to GO. Make platform
mode the default and register only those user-facing commands plus staff audit.
Preserve legacy feature code behind an explicit operator setting for rollback.

## Phase 5 — verification and rollout

Test policy escalation, role removal, partial writes, revocation, missing roles,
screening, mapping changes, account disconnection and admin authorization. Run
relevant route regressions, lint/build, Python tests and a read-only live inventory.
Use a test GO account to preview before enabling any live mapping. Verify OAuth
and scheduler in the actual deployment; do not claim mocked checks are live tests.

## Human/account-owner tasks

Final role ownership and category visibility must be confirmed in Discord. Disable
competing Polar/Patreon/reaction role writers for GO-owned IDs; give paid access
one writer. Supply OAuth client secret and redirect registration in deployment
settings. Select a test user and personally authorize their Discord OAuth flow.
Approve mapping migration, rollout and deployment configuration after inspecting
the preview. Exact remaining steps are in `DISCORD_BRIDGE_HUMAN_TASKS.md`.

## Delivery status — November 17, 2026

| Phase | Status | Evidence |
| --- | --- | --- |
| 1: brief, audit, policy boundaries | Complete | This prompt/plan, refreshed Discord audit, mapping review |
| 2: role engine and lifecycle | Implemented locally | Safe role policy, bounded reconciliation, ownership tracking, backoff and resumable disconnect |
| 3: platform controls | Implemented locally | `/admin/discord`, member role status, profile-triggered sync and pilot allowlist |
| 4: communication bot | Running locally | Discord API confirms only `go-connect`, `go-profile`, staff `go-members` registered |
| 5: automated verification | Complete for current local scope | 573 website tests; 12 Python tests; lint; production build; desktop/mobile UI and unauthorized API checks |
| 5: authenticated pilot and production rollout | Awaiting owner tasks | OAuth client secret/redirect registration, personal consent, category review, deployment and scheduler |

Live readiness confirmed correct application identity, 57 roles, and no blocked
hierarchy/administrative-role mappings in the 31-rule proposal. Four dedicated
zero-permission roles were prepared; no channel permissions or role assignments
were changed. No policy has been saved to Firestore by this implementation run.
The website integration remains disabled. Bot code is in the separate repository
`G:\GO Discord Bot\GO_Discord_Bot`; local site code has not been published.

Browser evidence: `outputs/discord-bridge-browser-verification.json`. Read-only
configuration evidence: `outputs/discord-bridge-readiness.json`. Tests do not
establish real OAuth, authenticated admin UX or production scheduler success.
The production build passed on retry. The framework reported a Next.js security
advisory; the successful build does not resolve it. Resolve it before rollout.
