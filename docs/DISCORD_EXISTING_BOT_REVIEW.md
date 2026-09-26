# Existing GO Discord bot: integration review

Reviewed 2026-09-25 from the user-supplied `GO_Discord_Bot-main.zip`.
This is an archive snapshot, not a verified checkout of the deployed revision.
The archive was inspected as source data; its game prompts and README tasks
were not treated as instructions to execute. No bot process was started and no
Discord server settings or roles were changed.

## What exists

- `GoBot.py`: Python bot using `discord.py`, with reaction onboarding, polls,
  activity reports, motivation, AI/image/game commands, and Notion/PDF retrieval.
- `DISCORD_BOT_TOKEN` is already read from the environment. The archive does not
  provide the Discord OAuth client ID, client secret, or deployment configuration.
- Reacting with the planet emoji to message `1156701425687081020` in channel
  `1154842138442485790` grants role `1199637743693742090`. Removing the reaction
  removes that same role. A separate channel receives an onboarding notification.
- The README contains a server link with guild ID `893138092263882825`.
  Confirm that this is the intended live server before configuring GO.
- There is no website identity mapping, OAuth callback, membership lookup,
  subscription-driven role reconciliation, or inbound web service in this snapshot.
- `websockets_api.py` is a client for a local ComfyUI image service; it is not an
  API for connecting the GO website to the Discord bot.

## Recommended division of responsibilities

Reuse the existing bot's Discord application. GO's existing implementation can
perform OAuth linking, joining, and paid-role synchronization through Discord's
REST API with that application's credentials. The Python bot can keep its gateway
connection and community commands. This does not require a second bot account,
an additional bot login in GO, or a public HTTP endpoint on the bot host.

| Responsibility | Owner |
| --- | --- |
| GO sign-in and verified Discord identity mapping | Website |
| Membership and paid-through dates | Website / Polar |
| User-authorized server joining | Website using existing bot application |
| Paid channel role assignments and revocations | Website synchronizer |
| Existing reaction onboarding and community commands | Python bot |
| Optional `/go-connect` command linking to the platform | Python bot |

The reaction role must not be the paid-member role. Otherwise any user can grant
paid access by reacting, and removing a reaction can revoke a paying user's role.
Do not set `DISCORD_MEMBER_ROLE_ID=1199637743693742090` while the current reaction
handlers remain enabled. Audit channel permissions as well: separating role IDs
does not help if the reaction role also allows viewing the paid channels.

An optional `/go-connect` command should send the invoking member an ephemeral
link to `https://www.galacticomnivore.com/discord`. The website must still perform
OAuth verification; a Discord ID embedded in a link must never establish identity.

## Bot refinements needed before redeploying the archive

1. **Make image/game services optional at startup.** `GoBot.py` imports
   `websockets_api.py`, which immediately opens `ComfyUIAPI/workflow_api.json`.
   That file is absent from the archive, so this snapshot cannot start unchanged
   even if those commands are never used. Core community functionality should
   start independently of optional AI services.
2. **Create a reproducible dependency setup.** `Requirements.txt` contains shell
   commands (`pip install ...`), rather than a pip requirements list. Directly
   imported packages such as `websocket-client` and Pillow are also omitted.
   Capture the live bot's Python/package versions before changing dependency
   versions; do not assume this older LangChain code works with latest packages.
3. **Harden reaction handlers.** Handle unavailable guilds, channels, roles, and
   uncached members; ignore bot reactions; preserve role updates when a welcome
   message cannot be sent or deleted. Currently notification errors can prevent
   the subsequent role operation. Notification IDs live only in memory and are
   lost on restart.
4. **Make startup import-safe.** Move `bot.run(TOKEN)` inside the main guard so
   importing the module for tests does not log in to Discord.
5. **Separate access configuration.** Give the reaction role an explicit name
   such as `DISCORD_ONBOARDING_ROLE_ID`, distinct from the website's paid role.
   Move channel/message settings into documented environment configuration.
6. **Add the platform link command.** This is the smallest useful bot-side
   feature for existing members; no membership-granting command is needed.

Activity commands also scan unlimited message history. Keep their performance
and command authorization separate from the access integration work. The archive's
AI and game features do not need to be redesigned to deliver account linking.

## Rollout and outstanding information

- Confirm where the bot is hosted, whether it is online, and whether this archive
  matches the running version. Obtain the deployed dependency versions if possible.
- Confirm whether the existing reaction role remains free onboarding access or
  will be retired in favor of verified GO access. No live role migration has been
  performed while that decision is pending.
- Provide the application/client ID and confirm the server ID. Configure the
  existing bot token and matching client secret in server-side deployment settings.
- Select a dedicated paid role if paid channels are desired; validate the bot's
  role hierarchy and Create Invite / Manage Roles permissions.
- Register GO's OAuth redirect, test one existing member and one new member in
  staging, then verify cancellation, expiry, disconnect, and reaction behavior.
- Enable the scheduler and deploy only after those checks.

See [DISCORD_SETUP.md](./DISCORD_SETUP.md) for the website configuration.
Discord requires the joining bot token to belong to the same application used
for the user's OAuth consent:
[Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member).
