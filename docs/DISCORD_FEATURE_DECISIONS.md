# GO bot feature decisions

Inventory from the supplied repository ZIP, reviewed 2026-09-25. Implemented
means present in source, not verified on the live server. No decisions have been
applied. Fill Decision with KEEP, CHANGE, REMOVE, or LATER; add the desired behavior.

## Implemented behavior

| ID | Feature / trigger | Current behavior | Decision | Requested change |
| --- | --- | --- | --- | --- |
| 1 | Planet reaction onboarding | Adding the configured planet reaction grants the onboarding role and sends a staff-channel notification. | Pending | |
| 2 | Reaction removal | Removing that reaction removes the role and attempts to delete the associated notification. Notification tracking is lost on restart. | Pending | |
| 3 | `/go-mostactive [limit]` | Text-prefix command ranking authors by message count; default 15. Scans full text-channel history, excludes four configured categories, and misses threads. | Pending | |
| 4 | `/go-inactive` | Text-prefix command reporting members with no messages found in scanned channels, grouped under `onboarding_member` and `community_members`. No configurable time window; thread coverage is incomplete. | Pending | |
| 5 | `/go-motivate` | Slash command sending a random message from ten hardcoded motivational messages. | Pending | |
| 6 | `/go-poll` | Slash command taking title, question, comma-separated choices, and duration in minutes. Uses emoji reactions, counts votes, deletes the original poll, and posts results. | Pending | |
| 7 | `/go-gpt` | Slash command for AI text conversations. Keeps recent per-user history in memory and can use the knowledge base if initialized. Source configures `gpt-3.5-turbo-0125`. | Pending | |
| 8 | `/go-imagine` | Slash command generating one image from a prompt and posting it as an attachment. Source configures DALL-E 3, HD, 1024x1024. | Pending | |
| 9 | `/go-character-tpose` | Slash command sending a prompt to a local ComfyUI workflow and returning generated character images. Depends on a workflow JSON absent from the ZIP. | Pending | |
| 10 | `/go-gamelt` | Slash command running Lost Terminal. `Start game` resets history; turns generate narrative, a scene image, and spoken narration. Loads a local game-instructions file. | Pending | |

## Present in code but inactive or not exposed as commands

| ID | Feature | Current state | Decision | Requested change |
| --- | --- | --- | --- | --- |
| 11 | Notion database loading | Loader function and environment settings exist, but startup invocation is commented out. README mentions `/go-loadnotion`; no such command is registered. | Pending | |
| 12 | PDF loading | Loader targets a specific local PDF absent from the ZIP. Startup invocation is commented out; no upload command exists. | Pending | |
| 13 | Knowledge-base answers | Functions split loaded documents, create embeddings, store them in Chroma, and initialize retrieval for GPT answers. Initialization is commented out. | Pending | |

## README plans or unused data, not implemented features

| ID | Feature | Current state | Decision | Requested change |
| --- | --- | --- | --- | --- |
| 14 | Trello task updates | README TODO only; no Trello webhook integration. | Pending | |
| 15 | Daily contribution reminder | README proposes a 16:20 reminder directing members to GO Daily / Notion. No scheduled task is defined. | Pending | |
| 16 | Website command | Website URL exists in an unused links dictionary; no site command. | Pending | |
| 17 | Wiki command | Wiki URL exists in the same dictionary; no wiki command. | Pending | |
| 18 | Social links command | Social URLs exist in the dictionary; no command displays them. | Pending | |
| 19 | Most active channel report | README TODO only. | Pending | |
| 20 | Unified command help | README TODO; no custom help listing all slash and text commands. The bot constructor does not disable the library's default text-command help. | Pending | |

## Platform additions, outside the uploaded bot

The current website work adds OAuth linking, user-authorized joining, optional
paid-member role synchronization, account disconnection, and scheduled retries.
These are not existing features of the uploaded Python bot and are not yet live.

| ID | Proposed addition | Purpose | Decision | Requested change |
| --- | --- | --- | --- | --- |
| 21 | `/go-connect` | Send a private link to GO's Discord connection page. | Pending | |
| 22 | Verified GO account role | Distinguish linked GO accounts from unlinked server members; separate from paid access. Not implemented yet. | Pending | |
| 23 | Paid membership access | Apply the website's active membership and expiry rules to member channels. Website implementation exists locally. | Pending | |
| 24 | Mentor / Business / project roles | Extend access mapping beyond the first paid-member role. Not implemented yet. | Pending | |

## Behavior to decide when keeping a feature

- Allowed users: everyone, verified GO users, paying members, mentors, or staff.
- Allowed channels and whether responses should be public or private.
- Rate limits and spending limits for AI commands.
- Data retention: chat/game history, poll state, and onboarding notifications.
- Whether reaction onboarding stays free or is replaced by verified GO access.

## Existing limitations that affect these decisions

- Paid access must not use the same role as unrestricted reaction onboarding.
- No explicit per-command membership or staff checks are present in this source.
  Actual access can also depend on Discord's live command/channel configuration.
- Polls offer eight configured emoji choices but do not validate excessive choices
  or duration. Users can select multiple options; percentages count reactions,
  not unique voters. Running polls do not survive restart.
- GPT and Lost Terminal share the same per-user history dictionary, so their
  contexts can interfere. History is not separated by channel/server and is not
  persisted across restart. Replies are public in the invoking channel.
- Startup imports the missing ComfyUI workflow even when image commands are unused.
  The supplied dependency file also needs correction before a clean deployment.
- Automatic slash-command registration on ready, reconnect logging, environment
  loading, and local image-service communication are infrastructure, not extra
  member-facing commands.

Reply format example: `1 KEEP; 2 CHANGE — preserve verified GO access; 3 STAFF ONLY;
7 REMOVE; 15 CHANGE — weekdays at 17:00 Europe/Skopje; 21 ADD`.
