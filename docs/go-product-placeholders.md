# GO product placeholders

This register keeps unresolved product values safe and explicit. None of these values authorizes a production data edit, checkout, or public launch.

| Placeholder | Purpose | Safe fallback | Configuration / validation | Current status |
|---|---|---|---|---|
| `MENTOR_APPLICATION_URL` | Server-only destination for the external mentor application form. | Empty; no destination is returned. | Configure an HTTPS application URL, then verify the authenticated open route. | Unresolved; coming soon. |
| `MENTOR_APPLICATIONS_OPEN` | Environment safety gate for mentor applications. | `false`. | Set to `true` only with a valid application URL; the admin override must also be enabled. | Closed; mentor launch is later. |
| `POLAR_MENTOR_PRODUCT_ID` | Reserved identifier for a future mentor product. | Empty and unused. | Define and validate against the intended Polar environment before implementing checkout. | Unresolved; coming soon. |
| `POLAR_MENTOR_CHECKOUT_URL` | Reserved checkout destination for a future mentor product. | Empty and unused. | Validate ownership, product, currency, billing interval, success flow, and cancellation flow before use. | Unresolved; coming soon. |
| `MENTOR_CHECKOUT_ENABLED` | Future checkout safety gate. | `false`. | No Phase 1 code reads a mentor checkout URL. Enable only with a separately reviewed implementation. | Disabled; coming soon. |
| `APRIL_2025_RESOURCE_ID` | Intended identifier for the April 2025 resource, if a later migration requires it. | No lookup, migration, or production edit. | Resolve using admin-only resource filters and confirm the exact document with an operator before any change. | Unresolved; intentionally untouched. |
| `MENTOR_PUBLIC_REVIEW_THRESHOLD` | Earlier proposal for an automated public mentor-strength threshold. | Inactive; no automated aggregate is published. | Superseded by direct reviews: the review author must explicitly consent to sharing, and the mentor chooses which consented reviews appear as mentor references in the GameDev Passport. | Superseded; reserved only as historical documentation. |

## Deployment sequence for future mentor applications

1. Create and approve the application form and HTTPS URL.
2. Configure `MENTOR_APPLICATION_URL` while leaving `MENTOR_APPLICATIONS_OPEN=false`.
3. Validate the authenticated application route in staging.
4. Set `MENTOR_APPLICATIONS_OPEN=true`.
5. Enable the `site_settings/product.mentorApplicationsOpen` admin override.
6. Confirm closed-state recovery by disabling either gate.

Mentor directory and availability have Phase 3 implementations. Matchmaking and community asset packs have Phase 4 implementations. Completed-engagement feedback and direct mentor references have a Phase 5 implementation. They remain deployment-gated independently; under-18 mentorship and mentor checkout remain unimplemented and disabled.

## Phase 2 operational configuration

| Setting | Purpose | Safe fallback | Deployment note |
|---|---|---|---|
| `COURSE_ENROLLMENT_ENABLED` | Enables course/workshop enrollment mutations. | `false`; published information remains readable but enrollment is unavailable. | Set to `true` when Phase 2 routes and Firestore indexes are deployed. |
| `USER_NOTIFICATIONS_ENABLED` | Records the intended notification feature state. | `false`; Phase 2 APIs remain server-authorized and can be disabled at deployment. | Set to `true` with the Phase 2 deployment. |
| `VIDEO_BUNDLES_ENABLED` | Enables protected video-bundle opening. | `false`; the public page shows a Coming Soon state and links remain unavailable. | Set to `true` only after a real bundle is created and published. |
| `DEFAULT_PLATFORM_TIMEZONE` | Default time zone for newly created learning items. | `Europe/Skopje`. | No secret; deployment configuration should match the operating region. |
| `WAITLIST_CONFIRMATION_HOURS` | Length of a promoted waiting-list offer. | `48`; invalid values also resolve to 48 hours. | The existing protected email worker processes expired offers on its schedule. |

Phase 2 creates no production learning or video fixtures. Administrators add real records through the server-authorized admin screens.

## Phase 3 operational configuration

| Setting | Purpose | Safe fallback | Deployment note |
|---|---|---|---|
| `MENTOR_DIRECTORY_ENABLED` | Enables approved mentor profile management and the sanitized public directory. | `false`; programme information shows an honest Coming Soon state. | Enable only after an administrator has approved a real mentor, that mentor has completed a profile, and public-profile visibility has been explicitly enabled. |
| `MENTOR_AVAILABILITY_ENABLED` | Enables private recurring windows and individual-date management for approved mentors. | `false`; exact schedules cannot be created or queried through the feature routes. | May be enabled for approved mentor testing before the public directory; deploy the server-only Firestore rules at the same time. |

Phase 3 creates no mentor or training fixtures and performs no production migration. Administrators control mentor status and public visibility separately. Exact availability stays in `mentor_availability`; public APIs receive only the derived general label. Item-specific course, workshop, and video preparation grants are stored in `training_assignments`, include their administrator and reason, may expire or be revoked, and do not modify Polar membership.

The first approved public mentor account is intentionally unresolved. Until a real account and complete profile exist, keep `MENTOR_DIRECTORY_ENABLED=false`; do not invent a directory entry.

## Phase 4 operational configuration

| Setting | Purpose | Safe fallback | Deployment note |
|---|---|---|---|
| `MENTOR_MATCHMAKING_ENABLED` | Enables adult Community/Business mentorship suggestions, requests, engagements, scheduling, and private concerns. | `false`; direct mutation routes return unavailable and the public page shows Coming Soon. | Enable only after directory and availability are enabled, real approved mentors have capacity, the notification worker is deployed, and an administrator is assigned to assisted requests and concerns. |
| `MENTOR_RESPONSE_DEADLINE_WORKING_DAYS` | Sets the mentor response window using weekdays. | `5`; invalid values also resolve to five working days. | Confirm the operating policy before launch; accepted values are 1–20. |
| `COMMUNITY_ASSET_SUBMISSIONS_ENABLED` | Enables member asset-pack drafts, review, publication, versioning, and protected downloads. | `false` when omitted; submission and download routes remain unavailable. | Set to `true` in environments where administrators are ready to review rights, licenses, manifests, compatibility, previews, downloads, entitlements, and support status. Enabled in the project environment examples. |
| `APRIL_2025_RESOURCE_ID` | Identifies the unresolved April 2025 record for a future explicit review. | Empty and unused. | The new review interface can locate records manually, but this placeholder does not trigger a lookup or mutation. Supply the exact ID and obtain explicit production-data approval before touching that record. |

Phase 4 creates no mentor, engagement, concern, asset-pack, or legacy-resource fixtures. Meeting links and concern details are participant/admin-only. Asset download URLs stay in server-only version records and are revealed only through short-lived, single-use redirects. The April 2025 resource remains unchanged.

## Phase 5 operational configuration

| Setting | Purpose | Safe fallback | Deployment note |
|---|---|---|---|
| `MENTOR_FEEDBACK_ENABLED` | Enables one direct review per participant after a mutually completed mentorship. | `false`; feedback routes are unavailable and dashboards do not query feedback. | Enable only with the Phase 5 server-only Firestore rules, admin moderation ownership, and feedback notifications deployed. |
| `MENTOR_FEEDBACK_DEADLINE_DAYS` | Sets the submission window from the engagement completion time. | `14`; invalid values also resolve to fourteen days. | Accepted values are 1â€“90. Changing this affects eligibility checks, not existing stored feedback. |
| `PUBLIC_MENTOR_STRENGTHS_ENABLED` | Enables publication of eligible direct mentor references on mentor profiles and GameDev Passports. | `false`; even approved and selected references stay private. | Enable only after `MENTOR_FEEDBACK_ENABLED`, moderation operations, public-profile privacy checks, and consent revocation have been verified. |

Phase 5 uses direct reviews only. It creates no star rating, numeric score, ranking, automated aggregate, or public threshold. Private written feedback from a student is visible only to its author and platform administrators; private mentor-to-student feedback is also visible to the student recipient. A public mentor reference is a separate student-authored excerpt and requires explicit author consent, GO moderation approval, and mentor showcase selection. Revoked consent, a report, or a correction/appeal request immediately removes showcase eligibility. Public output contains only the excerpt, demonstrated-quality labels, the generic attribution “Verified mentorship participant,” and a share date-never reviewer identity or private feedback.

Phase 5 creates no feedback fixtures and performs no production-data edit or deployment. `MENTOR_PUBLIC_REVIEW_THRESHOLD` remains superseded historical documentation and is not read by application code.

## Phase 6 implementation and launch controls

Phase 6 completes the community asset-pack workflow. The rollout flag is enabled in the project environment examples. An active Community membership or higher tier is required to create or edit a draft. Only one draft, submitted, changes-requested, or approved version may be pending for a published pack at a time, and the currently published version remains available until an administrator explicitly publishes its approved replacement.

Asset-pack downloads remain behind server-authorized, short-lived, single-use redirects. Administrators can configure public, Community/Business, or individually granted access independently of publication, and access grants can be revoked or restored. Review, publication, access, and pack-status changes write reasoned audit events containing the actor, action, target, previous value, new value, and timestamp.

A resource may be marked Legacy only after an administrator clears every review checklist item and records a reason. `APRIL_2025_RESOURCE_ID` remains empty and unused: Phase 6 performs no lookup, migration, fixture creation, production-data mutation, or deployment. Before production rollout, verify real review operations, content, authorization tests, and protected-link behavior in staging with `COMMUNITY_ASSET_SUBMISSIONS_ENABLED=true`.
