# GO platform launch-readiness migration

This is the current operating and migration guide for mentorship, education, memberships, resources, and member support. Historical implementation notes are stored under `docs/archive/` and do not describe the launch architecture.

## Product ownership

- GO is authoritative for mentor applications, mentor approval and suspension, mentorship requests, suggestions, engagements, learning enrollment, resource access, membership entitlement, support requests, and customer-visible status history.
- WordPress supplies blog posts only. The `/api/blog` adapter restricts requests to the WordPress `blog` category. Blog metadata and blog sitemap entries use the same filter.
- Jira is an optional staff workflow adapter for GO support. GO creates the internal request first and keeps entitlement, status, messages, and audit history in Firestore.
- Polar remains the payment provider. Server-owned product IDs and webhook-backed paid-through dates control benefits.

## Canonical routes

| Product | Canonical route | Compatibility behavior |
| --- | --- | --- |
| Mentor directory | `/mentorship` | `/matchmaking` and `/mentors` redirect |
| Mentor profile | `/mentorship/[mentorId]` | `/mentors/[mentorId]` redirects |
| Mentor application | `/profile?tab=mentor` | Native form only |
| Mentorship status | `/profile?tab=applications` | Shows mentor application review history |
| Member mentorships | `/profile?tab=mentorships` | Native request and engagement workspace |
| Education | `/education` | Native `learning_items` only |
| Support | `/profile?tab=support` | `/contact` links into GO Support |
| Support operations | `/admin/support` | Jira key and synchronization state are staff-only |

## Canonical data

| Area | Collections |
| --- | --- |
| Mentors | `mentor_applications`, `mentor_profiles`, `mentor_availability` |
| Mentorship | `mentorship_requests`, `mentorship_active_requests`, `mentorship_suggestions`, `mentorship_applications`, `mentorship_engagements`, `mentorship_checkins`, `mentorship_closing_feedback`, `mentorship_reports`, `mentorship_staff_alerts`, `mentorship_audit_events` |
| Learning | `learning_items`, `learning_enrollments` |
| Resources | `packages`, `asset_packs`, `asset_pack_versions`, `asset_pack_grants` |
| Support | `support_requests`, `support_request_messages`, `support_audit_events`, `support_jira_events` |
| Membership | Polar-backed fields on `users`; `subscriptions` is reconciliation input until parity is approved |

The active public lifecycle is `published` or `archived`. An obsolete resource status must be mapped explicitly before migration. Public DTOs never expose archived resources, protected downloads, private schedules, private learning session URLs, application accessibility answers, staff notes, Jira credentials, or Jira URLs.

## Production inventory captured before implementation

The read-only inventory recorded 72 users, 19 subscription records, one mentor application, one mentor profile, one mentor availability record, one learning item, and one package. All three old mentorship source collections were empty. The current mentorship collections were also empty except for eight audit events. No production records were written during implementation.

## Migration commands

Run commands with the intended Firebase credentials. Both scripts are dry-run by default.

```powershell
node --env-file=.env.local scripts/migrate-mentorship-canonical.mjs
node --env-file=.env.local scripts/migrate-launch-data.mjs
```

The mentorship report compares source and destination counts, reports hashed collision identifiers, and creates nothing in dry-run mode. After owner review, `--apply` copies only missing documents with their original IDs and a migration batch marker. It never deletes source documents. Rollback deletes only documents tagged with the exact applied batch:

```powershell
node --env-file=.env.local scripts/migrate-mentorship-canonical.mjs --apply --batch-id=<approved-id>
node --env-file=.env.local scripts/migrate-mentorship-canonical.mjs --rollback --apply --batch-id=<approved-id>
```

Resource lifecycle migration requires a reviewed JSON map because the application cannot infer whether discontinued content should stay published. Example:

```json
{
  "packages": { "document-id": "published" },
  "asset_packs": { "document-id": "archived" }
}
```

```powershell
node --env-file=.env.local scripts/migrate-launch-data.mjs --resource-map=reviewed-resource-map.json --apply
```

That script also reports and migrates old learning locations into public venue text or protected session URLs, assigns profile schema version 2, and reports subscription/user parity. It does not delete purchases, grants, orders, invoices, webhook records, or source records.

## Authorization rules

- Community, Mentor, and Business benefits use the shared server-side entitlement resolver.
- A scheduled cancellation remains active until `subscriptionEndsAt` passes. Refund, revocation, unpaid termination, or an ended paid-through period removes benefits.
- Mentor production and member-contact actions require an approved interview status and an active Mentor membership. Suspension removes those actions immediately.
- Support request creation, member replies, and reopening require an active paid-through membership. Viewing existing request history and closing a request remain available to its owner.
- Firestore browser rules deny direct access to protected product collections; authenticated API routes perform ownership and role checks.

## Jira setup

Configure `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY` to enable synchronization. `JIRA_ISSUE_TYPE` defaults to `Task`. Configure `JIRA_WEBHOOK_SECRET` and sign webhook payloads with HMAC SHA-256 in `x-hub-signature-256`.

Synchronization uses a GO ticket-specific Jira label, a lease, a monotonically increasing version, and a version marker in comments to prevent duplicate issues and replies during retries. A failed Jira call marks the internal ticket for retry and never removes the GO record.

## Launch acceptance

Before deployment, the owner should review all local changes, approve resource mappings, run both dry runs against the intended production project, deploy Firestore indexes and rules through the normal release process, configure Jira if desired, and complete the role matrix in `docs/TEST_PLAN.md`. Required roles include signed-out visitor, free user, each active membership tier, canceled-but-paid-through members, pending/approved/suspended/expired mentors, and administrator.

The release gate requires type checking, unit tests, production build, API authorization checks, and manual journeys for mentor checkout, mentor application/interview approval, mentorship request/acceptance, education enrollment and private session access, protected downloads, and GO support with Jira unavailable and available.
