# Website release handoff — 23 October 2026

## Repository and release scope

- Repository: https://github.com/GalacticOmnivoreElder/gowebsite
- Release branch: `codex/aurora-qa-remediation-local`; target: `prod`.
- First release commit: `b7bf5ecc28449f8ba111b40440e59c591dda2cc6`; use the latest branch tip, which also contains the retention correction and this handoff.
- Compare/create PR: https://github.com/GalacticOmnivoreElder/gowebsite/compare/prod...codex/aurora-qa-remediation-local
- The branch includes seven earlier unpublished commits: impact reports, community-build voting and Passport stamps, Omnivore campaign copy, AURORA fixes, matchmaking and development journey. Preserve current feature-flag defaults; this release does not enable the three gated journey/matchmaking/jam features.
- New merch flow: four T-shirt images, independently configurable two-shirt packages, sizes XS–XXL, quantity, a required customer-suggested total in whole MKD, telephone/email, office pickup, Kiimo delivery in Skopje, or cargo by arrangement elsewhere. No payment is collected. Suggested totals exclude delivery and are not agreed purchase prices.
- Immediate confirmation-email processing uses the existing outbox with retries, email ownership confirmation and consent checks. Admin reporting, CSV exports, availability emails and privacy copy match the new data format.
- Next.js/eslint-config-next are patched to 16.4.3; DOMPurify is patched to 3.4.17.

## Access blockers

1. Firebase CLI has no authenticated login. The existing local service-account credentials are rejected with `Invalid JWT Signature`. This only establishes a local credential failure, not a production failure. Do not copy that rejected key into production. Firebase configuration deployment can be deferred for the limited release described below.
2. GitHub's connected app can read repository metadata but creating a PR returns HTTP 403, `Resource not accessible by integration`. The branch was published through `b7bf5ec`; later local commits still need pushing because Git's credential manager subsequently required login. A maintainer can push the latest local branch and create and merge the PR from the compare link using their own account. Do not bypass required branch protections.
3. Vercel can report deployment status, but environment-variable metadata access returns HTTP 403. Authenticated preview fetch also fails at Vercel SSO. An authorized project member must validate the preview and production configuration. Do not disable protection to test it.

## Developer steps

### Limited website release without a new Firestore deployment

The only new composite indexes relative to `prod` are for `go_journey_events`, `go_matchmaking_profiles` and `go_skill_evidence`. Keep `GO_MATCHMAKING_ENABLED`, `GO_GAME_JAMS_ENABLED` and `GO_DEVELOPMENT_JOURNEY_ENABLED` disabled; verify production has no overrides enabling them. Defer enabling those features until the database configuration is deployed and their flows are validated.

Merch reuses the existing `merch_requests.pendingExpiresAt` policy and existing server-only collections. Its final configuration adds no new TTL policy. Community-build APIs use the Admin SDK; the new explicit deny rules duplicate the existing default-deny behavior for browser access. Therefore deploying the new rules/indexes is not a prerequisite for the limited release. Existing production Firebase credentials, existing retention configuration and email delivery still need a safe operational check. Keep the retention correction and security patches in the website release.

From the local repository containing the latest commits, authenticate Git and push them first:

```powershell
git fetch origin
git switch codex/aurora-qa-remediation-local
git pull --ff-only
git push origin codex/aurora-qa-remediation-local
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

### Deferred Firestore deployment

Before enabling the gated features, use approved credentials for the project:

```powershell
npx firebase login
npx firebase deploy --only firestore --project go-platform-7960b
```

Review any request to delete remote indexes; do not remove unrelated production indexes. Wait for required indexes and TTL configuration to become active. The `merch_requests` collection reuses its existing `pendingExpiresAt` TTL field for the entire request lifecycle: 30 days for a new pending request, one year after confirmation; pending changes retain an existing longer expiry. Despite the historical field name, this is now the request-expiration field for both statuses. Do not add a second TTL field to that collection: [Firestore supports only one per collection group](https://firebase.google.com/docs/firestore/ttl). No backfill or destructive data migration was run.

Verify production Firebase credentials with a safe read; only replace them if invalid. Check the existing environment has `RESEND_API_KEY`, `NEWSLETTER_TOKEN_SECRET`, `EMAIL_FROM_TRANSACTIONAL`, and `EMAIL_PRODUCTION_DELIVERY=true`, with sending enabled. Do not put secrets in PRs or logs. Test confirmation emails only with a controlled team mailbox. Confirm that suggested totals and both shirts survive confirmation, appear in admin/CSV, and that cancellation removes the request.

With Java available, also run `npm run test:rules` against the demo emulator project. Java is absent in the current environment, so emulator tests could not run here.

Create the PR targeting `prod`, review the full branch diff, validate the exact preview commit, and merge after the applicable configuration checks. For the limited release, leave the gated features disabled and defer the new Firestore deployment. Vercel's Git integration should create the production deployment. Confirm `READY`, the matching commit and domain assignment to https://www.galacticomnivore.com. Smoke-test `/`, `/merch`, `/community-builds`, `/impact`, `/projects`, assets and response headers, and inspect runtime errors. Avoid real customer submissions or billing mutations.

## Validation and deployment references

- 514/514 unit tests passed after the retention correction; typecheck and targeted lint passed. Full ESLint had zero errors and 17 existing warnings. The final production rebuild also passed after the retention correction.
- The production build served `/`, `/merch`, `/community-builds`, `/impact` and `/projects` locally with HTTP 200 and no browser exceptions. Merch desktop/mobile checks verified independent shirt choices, required/positive suggested totals, payload serialization and no horizontal overflow. Submissions were intercepted; no actual reservation or email was created.
- Page rendering does not establish database health: local Firebase-backed requests logged authentication failures, and `/api/community-builds` returned 503 with the rejected local key. Validate the actual database-backed journeys using working credentials before merging.
- Production dependency audit after patching: no high or critical findings; three moderate findings remain in the Tailwind/PostCSS dependency chain. No forced Tailwind major upgrade was attempted.
- First preview deployment: `dpl_H8wbW1cqaNugAGUiE4PhnJyBGggs`, tied to `b7bf5ec`, reached `READY`. Inspect the newest preview for subsequent commits. Protected preview content could not be validated with the connected app's access.
- Production was not modified by this release attempt. Prior production commit: `92e1744468a4030e265487661f27c1d94a2ff57d`. Prior ready production deployment/rollback reference: `dpl_DcmjWkz3iemEwM9HngMuvJmTABev`.
- Local `.claude/` and board-review exports under `outputs/` were deliberately left untracked.

Checkout links can be configured later using a provider that supports physical merchandise; Polar's acceptable-use policy prohibits physical products. This feature collects reservations and suggested prices, not payments.
