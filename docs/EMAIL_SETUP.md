# Galactic Omnivore email and newsletter setup

This document is the production handoff for transactional email, the durable
email outbox, newsletter consent, Resend delivery tracking, and the admin
newsletter dashboard.

## Architecture

Application routes enqueue semantic events in `email_outbox`; they do not send
arbitrary HTML. A protected worker claims due jobs, evaluates the recipient's
current preferences and suppression state, renders branded HTML plus plain
text, and sends through Resend with a deterministic idempotency key.

The important modules are:

- `src/lib/email/events.js`: allowed event types and categories.
- `src/lib/email/outbox.js`: permanent deduplication, scheduling, leases,
  retry/backoff, and terminal status.
- `src/lib/email/send-email.js`: environment safety, Resend request, tags, and
  one-click marketing headers.
- `src/lib/email/preferences.js`: current account/newsletter preferences.
- `src/lib/email/templates/`: branded, escaped HTML and plain text.
- `src/lib/email/newsletter.js`: double opt-in, audit history, contact/topic
  synchronization, preferences, unsubscribe, suppression, and anonymization.
- `src/app/api/webhooks/resend/route.js`: signed, deduplicated delivery/contact
  events.
- `src/app/api/cron/email-outbox/route.js`: protected worker.

Firestore job IDs are hashes of event type, stable event ID, and recipient
identity. The same hash is written transactionally to the permanent,
PII-free `email_deduplication` collection. A retried route or webhook therefore
cannot enqueue the same email again even after the 90-day outbox job expires.
Resend receives a readable deterministic idempotency key as an additional
short-window safeguard.

Newsletter confirmation tokens are unpredictable HMAC values. Only their hash,
expiry, and a non-secret random version are stored. The outbox reconstructs the
token in memory immediately before rendering, so confirmation URLs are not
persisted in job data or logs.

## Event and preference matrix

| Category | Events | Preference |
| --- | --- | --- |
| Essential | `account.welcome`, `onboarding.incomplete_reminder`, `newsletter.confirm`, `billing.membership_activated`, `billing.renewal_paid`, `billing.plan_changed`, `billing.payment_failed`, `billing.cancellation_scheduled`, `billing.reactivated`, `billing.access_revoked`, `billing.refund_processed` | Always allowed; not affected by marketing opt-out |
| Firebase security | email verification and password reset | Firebase Authentication templates and throttling |
| Product/project | `onboarding.completed`, all `project.*`, all `application.*` | `settings.emailNotifications !== false` |
| Subscription reminders | `billing.renewal_reminder`, `billing.access_expiring` | `settings.subscriptionReminders !== false`; worker also rechecks renewal/cancellation state |
| Package | `package.published` | Active member and `settings.newPackageAlerts !== false` |
| Marketing | `newsletter.campaign` | Confirmed newsletter consent or `settings.marketingEmails === true`, with no bounce/complaint/suppression |
| Admin | `admin.project_review_required`, membership/cancellation/refund/payment-failure events, failure digest, onboarding note | Configured server-side recipients |

Email verification and password reset deliberately remain on Firebase's
security-token implementation. The application adds a protected resend gate
for verification and generic password-reset behavior, but does not create a
competing token system.

`project.invitation` has a template and event definition but is not triggered.
The current repository does not have a secure accept/decline invitation action;
an email must not promise an action that does not exist. When that action is
implemented, enqueue the existing event in the same transaction that adds the
invited user.

## Environment variables

Copy `.env.example` into the environment manager and fill in values. Never
commit `.env` or a service-account private key.

Required for production email:

- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS origin.
- `RESEND_API_KEY`: server-only Resend key.
- `RESEND_WEBHOOK_SECRET`: signing secret from the Resend webhook.
- `EMAIL_FROM_TRANSACTIONAL`: verified transactional sender.
- `EMAIL_FROM_MARKETING`: verified marketing sender.
- `EMAIL_REPLY_TO`: monitored reply address.
- `EMAIL_MARKETING_ADDRESS`: accurate physical sender identity/address used in
  marketing footers. Obtain business/legal approval.
- `ADMIN_NOTIFICATION_EMAILS`: comma-separated operational recipients.
- `NEWSLETTER_TOKEN_SECRET`: at least 32 random bytes, kept stable.
- `CRON_SECRET`: at least 32 random bytes.

Safety and optional configuration:

- `EMAIL_DISABLE_SEND=true` suppresses every queued send.
- `EMAIL_PRODUCTION_DELIVERY=true` explicitly enables real-recipient delivery
  on non-Vercel production hosts. Vercel production is detected from
  `VERCEL_ENV=production`; `NODE_ENV` alone never enables it.
- `EMAIL_TEST_RECIPIENT` is the only address used outside production when
  delivery is explicitly enabled.
- `EMAIL_TRACK_ENGAGEMENT=false` ignores open/click webhooks by default.
- `EMAIL_FAILURE_SPIKE_THRESHOLD=5` changes the daily admin digest headline.
- `RESEND_NEWSLETTER_TOPIC_ID`, `RESEND_PACKAGE_TOPIC_ID`,
  `RESEND_PROMOTIONS_TOPIC_ID`, and `RESEND_NEWSLETTER_SEGMENT_ID` connect the
  first-party consent record to Resend Contacts.

Generate secrets with a cryptographically secure password/secret generator.
Rotating `NEWSLETTER_TOKEN_SECRET` invalidates outstanding confirmation and
preferences links. Rotate it only with an intentional migration.

## Resend and DNS setup

1. Add and verify the sending domain in Resend.
2. Publish the exact SPF and DKIM DNS records Resend provides.
3. Publish DMARC, begin with reporting, review reports, and strengthen the
   policy when legitimate sources are known.
4. The Resend free plan allows one custom domain. Use
   `mail.galacticomnivore.com` for both transactional and marketing senders
   (`account@…` and `newsletter@…`). If the account is upgraded, separate
   transactional and marketing subdomains to isolate reputation.
5. Create transactional and marketing sender identities matching
   `EMAIL_FROM_*`. Do not use unverified hardcoded senders.
6. Create the three Topics and one confirmed-subscriber Segment, then copy
   their IDs into the environment.
7. Register `https://YOUR_DOMAIN/api/webhooks/resend`.
8. Subscribe the webhook to `email.sent`, `email.delivered`,
   `email.delivery_delayed`, `email.failed`, `email.bounced`,
   `email.complained`, `email.suppressed`, `contact.created`,
   `contact.updated`, and `contact.deleted`. Add opened/clicked only after the
   privacy decision and environment flag are approved.
9. Use Resend Broadcasts for campaign authoring and segmentation. Do not build
   a custom mass-mail composer. Include Resend's unsubscribe variables and send
   only to the confirmed segment/topic selections.

Resend contact synchronization happens only after double opt-in confirmation.
An unsubscribed, bounced, complained, or suppressed contact is never added to a
broadcastable segment by signup alone.

## Firebase Authentication email setup

In Firebase Console, open Authentication > Templates:

1. Set the public sender/application name to Galactic Omnivore.
2. Configure and verify the Firebase custom sending domain.
3. Review the email-verification and password-reset copy and localization.
4. Authorize the production domain and the continue URLs used by the app:
   `/login?verified=1` and `/login?reset=1`.
5. Test both flows against a non-production Firebase project.

The UI rate-limits verification resends to one per minute and five per day per
user, in addition to Firebase's own abuse controls. Password-reset responses do
not disclose whether an account exists.

## Firestore collections and deployment

The implementation adds:

- `email_outbox`: queued/sent/failed/suppressed application emails.
- `email_deduplication`: permanent hash-only semantic-event tombstones without
  recipient addresses or template data.
- `email_delivery_events`: minimal verified provider delivery events.
- `processed_email_webhooks`: 30-day provider-event deduplication.
- `email_suppressions`: one-way hashed bounce/complaint suppression.
- `newsletter_subscribers`: consent source of truth and minimal suppression
  record.
- `newsletter_events`: minimal consent audit history.
- `newsletter_rate_limits` and `email_action_rate_limits`: abuse controls.

Browser access is denied in `firestore.rules`. Deploy rules, indexes, and TTL
policies:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.indexes.json` contains all worker/cancellation/digest composite
indexes and TTL field overrides. Verify TTL is enabled in the target Firebase
project after deployment. Outbox/delivery records expire after about 90 days,
processed webhook records after 30 days, and newsletter audit events after
about three years. Suppression records intentionally do not expire
automatically.

## Worker and scheduler

`.github/workflows/email-outbox.yml` invokes
`https://www.galacticomnivore.com/api/cron/email-outbox` every five minutes.
It can also be run manually from the GitHub Actions page.

The workflow requests a short-lived GitHub OIDC identity token instead of using
a stored scheduler secret. The worker verifies the token signature, issuer,
audience, repository and owner IDs, production branch, workflow path, subject,
and trigger type before processing email. The workflow receives only
`id-token: write`; it does not check out or read repository contents.

No GitHub or Vercel secret is required for this scheduler. `CRON_SECRET` remains
an optional fallback for a trusted non-GitHub scheduler or an operator request.
If configured, generate a strong random value, store it only in Vercel
Production, and send it in the `Authorization: Bearer <CRON_SECRET>` header.

The scheduler is intentionally external because Vercel Hobby permits cron jobs
only once per day; a five-minute entry in `vercel.json` prevents deployment.
GitHub scheduled workflows run from the default branch and can occasionally be
delayed during periods of high load. The durable outbox safely catches up on
the next run. GitHub may disable scheduled workflows on inactive public
repositories, so monitor the Actions page and re-enable the workflow if needed.

For an operator-requested production delivery test, temporarily set the
repository Actions secret `EMAIL_TEST_RECIPIENT`, manually run the workflow,
verify the returned provider email ID and mailbox delivery, and then remove the
secret. Never pass a recipient address as a workflow input because inputs can
appear in public Actions metadata.

The worker:

1. requeues expired processing leases;
2. queues at most one daily failed-email digest;
3. queries due pending jobs;
4. transactionally claims each job for five minutes;
5. rechecks current consent, user preferences, renewal state, onboarding state,
   membership access, and suppression;
6. sends or suppresses;
7. retries transient failures with exponential backoff, up to five attempts.

Monitor cron status, final `failed` counts, and the admin delivery dashboard.
Never call the route from a browser or expose `CRON_SECRET`.

## Newsletter workflow

The homepage and footer submit to `POST /api/newsletter/subscribe` with an
unchecked consent box and honeypot. The route uses a one-hour Firestore rate
limit and returns the same generic response for new, existing, pending,
subscribed, and previously unsubscribed addresses.

1. A new or explicitly resubscribing address becomes `pending`.
2. A 48-hour single-use confirmation is queued.
3. Duplicate signup requests leave a still-valid pending confirmation intact.
4. `POST /api/newsletter/resend-confirmation` creates a new rate-limited link.
5. Confirmation changes the Firestore status to `subscribed` transactionally,
   records the audit event, and then synchronizes Resend.
6. `/newsletter/preferences` uses a signed expiring action token; no login is
   required.
7. Unsubscribe updates Firestore and Resend, removes the contact from the
   segment, invalidates the action token, and sends no promotional
   confirmation.
8. A later resubscription always repeats double opt-in.

The generic flow never reveals whether an address already exists. A `userId`
is associated only when the authenticated account email matches the submitted
normalized address.

## Admin workflow

`/admin/newsletter` requires platform-admin authentication. It displays exact
status totals, recent signup growth, source/topic breakdown for the latest 500
records, the latest verified delivery events, recent consent history, search,
CSV export, pending-confirmation resend, manual suppression, and
privacy-request anonymization.

Anonymization removes the plain address and provider contact while retaining
the one-way document/suppression hash. Do this only after verifying the request
under the organization's privacy procedure.

Campaigns are authored in Resend Broadcasts. The dashboard links there; it
does not accept arbitrary HTML or send mass mail itself.

## Development, previews, and template fixtures

Local and preview environments suppress real delivery by default. A developer
must both leave `EMAIL_DISABLE_SEND` unset/false and set
`EMAIL_TEST_RECIPIENT`; all recipients are then redirected to that one test
mailbox and subjects are prefixed with the environment. Tests mock the
provider and never send network email.

Template fixtures use invented users/projects only. Never paste a CV,
confirmation URL, payment payload, production token, or real private message
into a preview.

## Testing

```bash
npm test
npm run build
```

After build, verify no server secret name/value occurs in `.next/static`.
Perform the manual cases in `docs/TEST_PLAN.md` against staging, including
double opt-in, unsubscribe/resubscribe, hard bounce, duplicate webhook,
cancel/reactivate, project/application transitions, first package publication,
and cron retry.

## Production launch checklist

- [ ] Business/legal owner approved consent wording, privacy text, retention,
      physical address, and sender identities.
- [ ] Production and staging use separate Firebase/Resend credentials.
- [ ] SPF, DKIM, DMARC, transactional sender, and marketing sender are verified.
- [ ] Firebase verification/reset templates and continue URLs are tested.
- [ ] Firestore rules, composite indexes, and TTL policies are deployed.
- [ ] Resend Topics/Segment and signed webhook are configured.
- [ ] The OIDC-protected `Process email outbox` workflow succeeds manually and
      on schedule.
- [ ] `ADMIN_NOTIFICATION_EMAILS` reaches monitored mailboxes.
- [ ] Engagement tracking is off unless specifically approved.
- [ ] A staging bounce suppresses future marketing.
- [ ] A package draft is private and its first publication queues exactly one
      alert per eligible member.
- [ ] `npm test` and `npm run build` pass.

## Rollback and emergency stop

Set `EMAIL_DISABLE_SEND=true` and redeploy. The worker will mark claimed jobs
as suppressed instead of contacting Resend. To pause without consuming jobs,
disable the scheduler as well. Do not delete outbox or suppression collections
during an incident. Re-enable only after the sender/domain/webhook issue is
understood.

## Migrating the former Google Form

Do not bulk-import the old Google Form list merely because an address is
present. For each row, verify there is evidence of affirmative, specific
newsletter consent, including wording, source, and timestamp.

For defensible records, import as `pending` with source `admin_import` and send
one confirmation request through the same double opt-in flow. Do not place
pending imports into the Resend broadcast segment. Exclude rows without
documented consent, prior opt-outs, bounces, and complaints. Keep a dated
migration report and obtain business/legal approval before the import.
