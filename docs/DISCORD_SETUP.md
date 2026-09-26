# Discord account linking and server access

GO users can connect Discord in onboarding, profile settings, or `/discord`.
OAuth requests `identify guilds.join`. GO verifies the Discord user ID, reserves
it for one GO account, and adds the user to the configured server using the bot.
Existing server members can connect too. The first release manages one optional
paid-member role; mentor, business, and project-specific roles are not included.

The existing Python bot was reviewed from the supplied repository archive. See
[existing bot review](./DISCORD_EXISTING_BOT_REVIEW.md) for the responsibility split
and startup issues. Its current planet-reaction role is `1199637743693742090`;
do not use that as the paid-member role while reaction-based granting is enabled.

## Configuration needed from the Discord owner

1. Open the existing bot's application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy its application/client ID. Retrieve the client secret and bot token into
   the deployment's server-side environment variables, never chat or source control.
   All three must come from the same Discord application. Existing bot code can
   keep running; this integration uses Discord's REST API directly.
3. Register the exact OAuth redirect URL:
   `https://www.galacticomnivore.com/api/discord/callback`.
   For local development register `http://localhost:3000/api/discord/callback`
   separately and set `DISCORD_REDIRECT_URI` to match. Start linking on that same
   origin; do not mix apex/www hosts or production/preview environments.
4. Enable Discord Developer Mode and copy the server ID into `DISCORD_GUILD_ID`.
5. Ensure this application's bot is installed in that server with **Create Invite**.
   For paid-role management it also needs **Manage Roles**, with its highest role
   above the managed role. Administrator permission is unnecessary.
6. Optionally create a dedicated GO Member role, restrict the member categories
   to it, and set `DISCORD_MEMBER_ROLE_ID`. Audit other roles and channel overrides
   for alternate access paths. Do not use a staff, moderator, integration-managed,
   or self-assignable role. GO owns assignment/removal of the configured role.
7. Set `DISCORD_JOIN_MEMBERS_ONLY=true` only if joining via GO requires an active
   membership. This setting gates joining through this integration, not existing
   members, public invite links, or server membership after a subscription expires.
8. Configure and test the synchronization scheduler below before enabling paid roles.
9. Set `DISCORD_ENABLED=true` after staging verification. Deploy the application.

The feature reports unavailable until required configuration is valid. No secrets
are sent to the browser, and no Discord access or refresh tokens are persisted.
Temporary authorization codes are server-only, single-use, browser-bound, tied to
the original Firebase UID, and expire after ten minutes. The final completion
requires a Firebase token for that same UID, even after the OAuth callback.

## Synchronization scheduler

Set a strong `CRON_SECRET` in the deployment. Invoke `POST /api/cron/discord-sync`
with `Authorization: Bearer <CRON_SECRET>` every minute using your scheduler.
The repository workflow `discord-sync.yml` is an optional five-minute alternative:
set repository variable `DISCORD_SYNC_ENABLED=true` and repository secret
`DISCORD_CRON_SECRET` to the same value as the deployment's `CRON_SECRET`.
Use one scheduler. GitHub scheduled runs can be delayed and run from the default
branch; this does not provide a strict access-revocation SLA.

The worker reads up to 50 due connections, stopping its batch after 30 seconds
(an in-flight member sync can finish afterward). It rechecks each connection
every five minutes. Larger communities need more frequent runs or a dedicated
queue worker; monitor backlog before promising an access-revocation deadline.
Polar webhooks mark linked users due for synchronization. Every sync reads the
latest server-side membership and paid-through date. The periodic pass also
catches expiry without a webhook and heals missed jobs. Temporary failures stay
queued; HTTP 429 honors `retry_after` and stops the current batch.

The worker and user actions serialize operations per GO user. Only the dedicated
role is managed; other Discord roles are preserved. Previous role IDs are retained
until cleanup so changing configuration does not strand access. Complete a sync
pass after changing a role ID before changing it again. Changing server IDs
requires disconnecting old connections first. Missing bot permissions need an
operator fix; the API returns an actionable message and retains retryable state.

Membership screening is respected: pending users must accept server rules before
GO grants the member role. Users who leave the server are never automatically
re-added by the worker; they must reconnect and authorize joining again.
Disconnect removes the managed role before releasing the identity mapping. Failed
cleanup retains the mapping for retry. It does not kick the person from the server.

## Data and Firestore

Deploy `firestore.rules` (the existing default-deny rule also protects these
collections). `discord_connections`, `discord_identities`, `discord_oauth_states`,
`discord_oauth_limits`, and `discord_locks` are server-only. Configure Firestore TTL
on `discord_oauth_states.expiresAt` to clean up abandoned authorization attempts.
Expiry is enforced in code regardless of TTL deletion delay. The due query uses
the standard single-field index on `discord_connections.nextSyncAt`.

Connection records contain Discord user ID, username, server ID, managed role ID,
timestamps, and synchronization state. Account-data deletion procedures must also
disconnect Discord and remove its connection and identity records. No email,
messages, contacts, or Discord passwords are requested. The privacy notice includes
the stored identity/access data and disconnect behavior.

## Staging acceptance checks

- Signed-out requests cannot start, finish, or change a connection.
- Connect a new server member; verify identity, joining, and member-role assignment.
- Connect an existing server member without changing unrelated roles.
- Cancel consent; retry expired/replayed state; reject a different GO UID.
- Attempt to link a Discord identity already linked to another GO user.
- Accept server rules, refresh access, and verify the role is granted only afterward.
- Test active membership, scheduled cancellation through the paid period, expiry,
  revocation, refund, and renewal through the real Polar webhook and worker.
- Leave the server: worker reports join required and does not auto-rejoin.
- Disconnect: member role is removed; other roles and public-server membership remain.
- Simulate missing bot permissions and rate limiting; restore permissions and retry.
- Confirm the scheduler actually runs and drains due connections in production.

References: [OAuth2](https://docs.discord.com/developers/topics/oauth2),
[joining and roles](https://docs.discord.com/developers/resources/guild),
[permissions](https://docs.discord.com/developers/topics/permissions),
[rate limits](https://docs.discord.com/developers/topics/rate-limits).
