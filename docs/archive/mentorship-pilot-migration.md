# GO-curated mentorship pilot

## Legacy record inventory

The repository already contains an earlier self-service experiment:

- `mentorship_requests` uses `studentId`, `targetMentorId`, `assistanceRequested`, and statuses such as `awaiting_mentor_response`.
- `mentorship_engagements` uses `studentId`, `mentorId`, scheduling slots, and a single participant-confirmed lifecycle.
- `mentor_profiles` and `mentor_availability` are server-only and are also used by the legacy directory.
- `mentorship_feedback`, `mentorship_concerns`, and their audit collections belong to the earlier workflow.

The pilot does not rewrite or delete those records. New records use separate collections so the old journey can be rolled back without losing ownership or timestamps.

## Pilot collections

`mentor_applications`, `mentorship_pilot_requests`, `mentorship_suggestions`, `mentorship_applications`, `mentorship_pilot_engagements`, `mentorship_checkins`, `mentorship_closing_feedback`, `mentorship_reports`, `mentorship_staff_alerts`, `mentorship_audit_events`, and `mentorship_pilot_active_requests` are server-only. The API serializes participant and public views separately from staff notes.

## Rollback

1. Set `MENTORSHIP_SYSTEM_ENABLED=false`, `MENTORSHIP_REQUESTS_ENABLED=false`, and `MENTORSHIP_MENTOR_APPLICATIONS_ENABLED=false`.
2. Keep the new collections and audit events intact for review; do not delete production data.
3. Leave the legacy routes available only if their existing feature flags are intentionally re-enabled.
4. If the pilot resumes, review open requests, applications, reports, and capacity before restoring the allowlist.

No production migration or fixture seeding is performed by this change. A real-data migration should only be approved after the pilot has demonstrated the status mapping and retention policy.
