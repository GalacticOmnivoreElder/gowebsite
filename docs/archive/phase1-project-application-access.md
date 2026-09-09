# Phase I — Creator-controlled project application access

## Objective

Allow a project creator to decide whether a hiring project accepts applications
from active GO members only or from any signed-in GO account, including free
users.

## Phase I policy

- `applicationAccess` is stored on each project.
- Supported values:
  - `members_only`: an active Community or Business membership is required.
  - `all_signed_in_users`: authenticated free, Community, and Business users may apply.
- Missing or invalid legacy values resolve to `members_only` so existing projects
  keep their current behavior.
- Anonymous visitors must still sign in before applying.
- The project must still be visible to the applicant and have `hiring` status.
- Platform admins bypass the membership gate for operational testing.
- Existing applications are not revoked or changed when the setting changes;
  the setting applies when a new application is submitted.
- Only the project owner or a platform admin may change this setting. Project
  admins can continue editing other project fields but cannot change applicant
  eligibility.

## Planned phases

1. **Data and server policy** — Add the field/constants, persist and validate it
   on project create/update, normalize legacy records, and enforce it in the
   application API.
2. **Creator and applicant UI** — Add the creator control to create/edit forms,
   show the current policy on project details, and allow free users through the
   application dialog when the creator has enabled them.
3. **Regression coverage** — Add unit tests for defaults, both policy branches,
   unauthorized policy changes, and legacy records; add manual QA cases.
4. **Verification** — Run focused unit tests, lint/build checks, and a browser
   smoke check when authenticated staging accounts are available.

## Acceptance criteria

- A new project defaults to `members_only` and exposes the choice to its owner.
- An owner can switch between both policies and the value persists after refresh.
- A free signed-in user can submit an application only when the project is
  `all_signed_in_users`.
- A free signed-in user receives the membership-required response for a
  `members_only` project.
- Paid members can apply under either policy.
- Direct API requests cannot bypass the selected policy or mutate it as a
  non-owner project admin.
- Existing projects without the field remain members-only.

## Manual QA checklist

1. Create a project as a creator and confirm the default application policy is
   **Active GO members only**.
2. As a signed-in free user, try to apply to that default project and confirm
   the application is rejected with a membership-required message.
3. Edit the project as its creator, select **All signed-in users, including free
   users**, save, and confirm the setting remains after a refresh.
4. As a signed-in free user, apply to the updated hiring project and confirm the
   application is created once.
5. As a paid member, apply to projects under both policies and confirm both
   paths work.
6. As an anonymous visitor, try to apply and confirm sign-in is still required.
7. As a project admin who is not the creator, confirm the application policy is
   read-only and cannot be changed through the UI or API.
8. Confirm a private or non-hiring project still rejects applications regardless
   of the selected application policy.
9. Open an older project with no `applicationAccess` value and confirm it behaves
   and displays as **Active GO members only**.
