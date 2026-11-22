# Revised visible roles — November 20, 2026

This revision supersedes the original four-role proposal in the earlier handoff.

| Visible role | Source | Behavior |
| --- | --- | --- |
| 🖖 | linked | Verified account association; still subject to the internal onboarding gate |
| GO_Community_Member | member | Existing role `1050368811578175488`, now proposed for active GO membership |
| GO Business | business | Active company-tier membership |

There is no visible onboarding role mapping. `requireOnboarding` remains enabled:
GO can require completed onboarding without publishing that state as a role.
The former GO Onboarded and GO Paid Member roles remain unused by the draft;
they have not been deleted and no member assignments have been removed.

The saved preview policy and local member-role setting were updated. Production
hosting must also use `DISCORD_MEMBER_ROLE_ID=1050368811578175488` when this
revision is deployed. Reload the administrator page before further edits to
avoid overwriting the revised policy from a stale browser form.

The migration scan found 53 holders of the existing community role, all currently
unlinked to GO. This is not evidence that they are ineligible: account linking
and membership reconciliation must happen before deciding who loses access.
No role assignments were removed. See the aggregate report in
`outputs/discord-community-migration-summary.json`.

Before a broader Apply rollout, invite existing members to link, reconcile their
membership records, review exceptions/complimentary access, and approve a specific
removal list. The current worker reconciles linked accounts only; it does not
automatically remove roles from all unlinked server members.
