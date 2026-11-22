# GO Discord bridge: owner handoff

## Computer work completed

- Brief and phased plan: `DISCORD_PLATFORM_BRIDGE_IMPLEMENTATION.md`.
- Role policy and administrator controls: `/admin/discord`.
- OAuth linking, authorized joining, skills/onboarding/approval hooks, retries and cleanup.
- Preview mode plus a pilot GO-user allowlist before all-user apply.
- Existing bot credentials reused in ignored local configuration; application/server verified.
- **GO Linked**, **GO Onboarded**, **GO Paid Member**, **GO Business** roles created with ZERO permissions. Channel visibility has not been changed.
- Importable preview draft: `discord-role-mapping.draft.json`.
- Bot registered `/go-connect`, `/go-profile`, staff `/go-members`; reaction role writes retired.
- Updated audit reports unknown new Discord channel types instead of failing.

## 1. Owner-only OAuth setup

Open the existing application at https://discord.com/developers/applications.
Retrieve its OAuth2 **Client Secret** and add `DISCORD_CLIENT_SECRET=...` to the
website's `.env.local`. This differs from the bot token. Do not paste it in chat.
The token, application ID, server ID, paid-role ID and local scheduler secret
are already configured. `DISCORD_ENABLED` remains false.

Register exact redirects for each environment:

- Local pilot: `http://localhost:3018/api/discord/callback`
- Production: `https://www.galacticomnivore.com/api/discord/callback`

Stay on the matching origin throughout OAuth. Do not reset existing credentials
unless needed; resetting can affect other running deployments.

## 2. Approve role ownership and category visibility

Review `DISCORD_ROLE_MAPPING_REVIEW.md`. Dedicated roles currently have no
permissions: Linked means account association, Onboarded means completed GO
onboarding, Paid Member means active provider-aware membership, Business means
active company-tier membership. The default policy requires onboarding before
any mapped role is granted. Mentor also requires GO approval and eligible active
membership; Business mentors additionally need a valid mentor add-on.

Decide whether each private category requires onboarding or payment. Allow the
corresponding role and deny View Channel for `@everyone`. Inspect per-channel
overrides and all alternate role paths: old community, supporter, skill or
integration roles may preserve access after a paid role is removed. Review the
audit's unsupported channel types manually. Keep linking/welcome instructions
accessible to newcomers.

Disable competing Polar/Patreon/other bots' role assignments ONLY for IDs GO will
own. GO writes its enabled allowlist. Existing unlinked members are not mass-
revoked: choose how and when they must link before retiring their old access.
Native Discord administrative roles remain outside automation.

## 3. Personally authorize and approve a pilot

After adding the secret, set `DISCORD_ENABLED=true` locally and restart the local
site on port 3018. Sign into GO as an administrator and open `/admin/discord`.
Import `docs/discord-role-mapping.draft.json` and **save Preview before connecting
a test user**. Preview performs no role writes.

Use your own/test GO account to connect Discord, accept consent and complete
onboarding. Select skills on GO. Note the Firebase GO user ID, not the Discord
ID. In the admin screen, inspect the user's proposed role additions/removals.

Put ONLY that GO user ID in **Pilot GO user IDs**, select Apply, confirm ownership,
save and synchronize. Everyone else remains in preview. Verify in Discord:

- Adding/removing skills changes mapped roles.
- Onboarding, language and appetite match saved profile values.
- Paid-through cancellation, expiry, revocation and renewal match GO eligibility.
- Mentor approval and Business/add-on eligibility remain distinct from skills.
- Project team join/removal and expiring manual grants work as intended.
- Disconnect removes GO-owned roles before releasing the identity; large cleanups continue in the worker.
- Leaving the server never causes an unsolicited rejoin; unrelated roles remain.

Do not infer membership or staff approval from existing Discord roles.

## 4. Production rollout after the pilot

Website changes are local and have not been published. Review/commit both
repositories through the normal release process. Before production, resolve the
security advisory reported by the installed Next.js version. Compilation/build
retry success does not mean that advisory is fixed.

Configure server-only Discord variables and `CRON_SECRET` in hosting, with the
production redirect above. Local secrets are NOT automatically installed in
hosting or GitHub. Never use `NEXT_PUBLIC_*` for credentials.

Enable ONE scheduler to POST `/api/cron/discord-sync` with
`Authorization: Bearer <CRON_SECRET>`. The existing repository workflow requires
GitHub variable `DISCORD_SYNC_ENABLED=true` and secret `DISCORD_CRON_SECRET` equal
to hosting's CRON_SECRET. A one-minute scheduler is preferable for larger
communities; GitHub runs may be delayed. Monitor the due-connection list and
backlog: bounded batches do not provide an exact revocation deadline.

Deploy Firestore rules (existing default-deny also protects new collections).
Policy: `site_settings/discord_role_policy`. Grants/events are server-only.
Configure TTL for `discord_oauth_states.expiresAt` if not already set. Account
deletion procedures must clean up Discord connection, identity and grant records.

After production pilot approval, clear Pilot GO user IDs to apply to all linked
users. The bot is a local background process and stops if this computer shuts
down. Website REST synchronization does not require that gateway process online,
but does require the same application credentials and working scheduler.

## Rollback and repeatable checks

Set policy mode to Preview to stop new writes; this does not undo already-applied
changes. Restore approved mappings and reconcile, or manually restore roles.
Do not delete tracked ownership records or remove credentials before cleanup.
Legacy bot commands are recoverable with `DISCORD_LEGACY_COMMANDS=true` and a
restart; reaction role writes remain retired.

Website: `npm test`, `npm run build`, and
`node scripts/check-discord-bridge.cjs --live` (read-only, secret-safe).
Bot: `.venv/Scripts/python.exe -m unittest -v test_startup test_discord_audit`.
Authenticated admin use, live OAuth consent, pilot role mutations and production
scheduling require the owner steps above; they are not claimed as live tests.
