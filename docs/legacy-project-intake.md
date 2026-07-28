# Legacy GO project intake and import plan

This specification captures projects created before the current GO project
workflow. It is designed for a Google Form feeding a Google Sheet and for a
future idempotent admin-only Firestore importer. Completing this document does
not authorize a production import.

## Backward-compatible record

Import each approved row into `projects/{projectId}` using the current project
shape plus a namespaced provenance block:

```json
{
  "title": "Required public title",
  "description": "Required long description",
  "goal": "What the project set out to accomplish",
  "type": "One current PROJECT_TYPES value",
  "status": "One current PROJECT_STATUSES value",
  "visibility": "Public, Private, or Invite Only",
  "owner": "Resolved Firebase uid",
  "admins": [],
  "teamMembers": ["Resolved contributor uids"],
  "requiredRoles": [],
  "categoryTags": [],
  "compensationType": "Unpaid",
  "budget": null,
  "duration": null,
  "thumbnail": null,
  "linkedProjects": [],
  "archived": false,
  "legacyImport": {
    "schemaVersion": 1,
    "source": "google_forms",
    "submissionId": "Stable response id",
    "sourceRowHash": "SHA-256 of normalized row",
    "ownerEmail": "Kept only in restricted import staging",
    "unresolvedContributors": [],
    "startedOn": "YYYY-MM-DD or null",
    "completedOn": "YYYY-MM-DD or null",
    "projectLinks": [],
    "media": [],
    "mediaPermission": "granted|restricted|not_granted",
    "consentRecordedAt": "ISO timestamp",
    "importedAt": "Server timestamp",
    "importedBy": "Admin uid"
  }
}
```

The public `projects` document must not retain contact email addresses.
Resolution emails belong only in a restricted staging collection or an
encrypted admin export. Existing project readers remain compatible because all
new provenance fields are optional.

## Google Form questionnaire

Create the form with email collection disabled unless the privacy notice
explicitly describes its use. Fields marked **required** are mandatory.

1. Submission ID — **required**, short text, generated or copied from the
   source archive; must be stable and unique.
2. Project title — **required**, short text, 3–120 characters.
3. One-sentence summary — **required**, paragraph, up to 300 characters.
4. Full project description — **required**, paragraph.
5. Project goal — **required**, paragraph.
6. Project type — **required**, single choice using the current project-type
   catalogue.
7. Current status — **required**, single choice mapped to the current status
   catalogue.
8. Visibility — **required**, Public, Private, or Invite Only.
9. Start date — optional date.
10. Completion or last-active date — optional date.
11. Duration in days — optional integer greater than zero.
12. Compensation — **required**, current compensation choice.
13. Budget amount — optional non-negative number.
14. Budget currency — required only when a budget is supplied; ISO currency
    code.
15. Owner display name — **required**, short text.
16. Owner account email — **required for account matching**, email; never
    published.
17. Contributors — optional, one contributor per line as
    `display name | account email | role`.
18. Technologies, tools, and engines — optional, comma-separated tags.
19. Roles represented on the project — optional, comma-separated tags.
20. Roles still needed — optional, comma-separated tags.
21. Project links — optional, one per line as `label | https://…`.
22. Repository link — optional URL.
23. Playable/download link — optional URL.
24. Media links — optional, one per line as `caption | https://…`.
25. Media ownership — **required when media is supplied**, confirm the
    submitter owns it or has permission to share it.
26. Media display permission — **required**, Granted, Restricted, or Not
    granted.
27. Contributor-name display consent — **required**, yes/no.
28. Accuracy confirmation — **required**, checkbox.
29. Import/privacy consent — **required**, checkbox linking to the current
    privacy notice.
30. Additional notes for the admin importer — optional paragraph, restricted
    and never published.

## Validation and normalization

- Trim outer whitespace; preserve meaningful spaces, punctuation, and commas.
- Normalize tag duplicates case-insensitively using the existing skill helpers.
- Validate URLs as HTTP(S); reject executable or data URLs.
- Resolve owner/contributor emails to Firebase UIDs server-side.
- Leave unresolved contributors in `legacyImport.unresolvedContributors`; do
  not create accounts or expose the email in the project response.
- Map legacy statuses through an explicit versioned lookup table. Unknown
  values stay in staging for admin review.
- Store absent budget and dates as `null`/absent, never zero.
- Require media permission before copying any media URL into public fields.

## Idempotent admin ingestion

1. Upload the CSV to a restricted staging location.
2. Validate every row and produce a dry-run report; make no Firestore writes.
3. Derive the project ID as
   `legacy-${sha256("go-legacy-project:v1:" + submissionId).slice(0, 24)}`.
4. In a Firestore transaction, skip the row when the stored
   `legacyImport.sourceRowHash` matches.
5. If the ID exists with a different hash, require an explicit admin update
   approval and record an audit entry.
6. Batch-write the project and the resolved users' project arrays using current
   server helpers.
7. Record counts for created, unchanged, updated, blocked, and invalid rows.
8. Re-running the same CSV must create no new projects and no duplicate array
   entries.

The importer should support `--dry-run` by default and require an explicit
`--apply` flag plus authenticated platform-admin identity. Production execution
and data backfill require separate approval.
