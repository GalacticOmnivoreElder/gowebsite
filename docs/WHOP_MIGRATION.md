# GO Whop integration and rollout

Status: implementation in progress; checkout must stay disabled until the checks below pass. Verified 11 November 2026 against Whop's public Current API. No successful end-to-end Whop transaction, deployed webhook, account payout, or live bank receipt has been verified. The owner chose production configuration without a separate sandbox; that leaves live payment lifecycle testing unverified. No real charge, refund, or withdrawal is authorized by this implementation.

## Catalogue

All six variants below belong to `biz_fXnLxutjLKO8jT`. Public responses showed MKD prices below, zero setup charge, no trial, monthly or annual renewal (Whop reports billing-period values of 30 or 365 days), tax exclusive with tax collection enabled, and adaptive pricing enabled. Tax or converted presentment can make the amount shown by Whop differ. Public unauthenticated responses do not reveal every private discount setting. Audit again with the account key before enabling checkout.

| Tier | Cycle | MKD renewal | Product | Variant |
| --- | --- | ---: | --- | --- |
| Community | Monthly (30) | 500 | prod_D1WqA38JQwuf8 | plan_JmVORg4ukobiN |
| Community | Annual (365) | 4,800 | prod_BpBYHZBubPwKg | plan_eAQ712tjBEHhb |
| Mentor | Monthly (30) | 1,500 | prod_8KFDAPQDsy7QE | plan_zcoU1vTYDT9GG |
| Mentor | Annual (365) | 14,999 | prod_DZP3i6nht01yO | plan_znpd9alFPpLXd |
| Business | Monthly (30) | 2,999 | prod_9pdCcuOxvAtis | plan_6JNsFK7cMuJn8 |
| Business | Annual (365) | 29,999 | prod_Q3sLI8rJIGEAA | plan_Zg2FUArNdKKm6 |

The production mapping is built into the server configuration. Override IDs using `WHOP_MEMBER_MONTHLY_PRODUCT_ID`, `WHOP_MEMBER_MONTHLY_VARIANT_ID`, and corresponding `MEMBER_ANNUAL`, `MENTOR_MONTHLY`, `MENTOR_ANNUAL`, `COMPANY_MONTHLY`, `COMPANY_ANNUAL` names only after verifying any replacement. Sandbox has no default IDs and must use its own isolated Firebase project, products, key and webhook.

## Vercel production environment

Put these in Vercel > GO website > Settings > Environment Variables > Production. GitHub Actions repository secrets are available to workflows but do not automatically reach Vercel's server functions. Do not commit values or put them in chat. Redeploy to pick up environment changes.

| Name | Value |
| --- | --- |
| `WHOP_API_KEY` | Production Company/Account API key, Vercel Secret |
| `WHOP_WEBHOOK_SECRET` | Signing secret for this exact production webhook, Vercel Secret |
| `WHOP_ENVIRONMENT` | `production` |
| `WHOP_ACCOUNT_ID` | `biz_fXnLxutjLKO8jT` |
| `WHOP_SITE_URL` | `https://www.galacticomnivore.com` |
| `WHOP_FIREBASE_PROJECT_ID` | `go-platform-7960b` (must match `FIREBASE_PROJECT_ID`) |
| `MEMBERSHIP_CHECKOUT_ENABLED` | `false` until release checks pass |
| `MENTOR_CHECKOUT_ENABLED` | `false` until release checks pass |
| `CRON_SECRET` | Existing server cron secret, configured as Vercel Secret |

Keep existing Polar secrets for current subscribers and late events. Set a key expiration and calendar rotation owner; create the replacement with the same minimal permissions, update Vercel, deploy, verify, then revoke the old key. Do not set an IP allow-list unless your specific Vercel project's stable outbound IP capability is confirmed and all actual egress addresses are known. A home IP or Whop form examples do not identify server egress.

## Whop API-key scopes

Use a custom Company/Account API key, not an App key or broad Admin role. API is pinned to `2026-11-10-1`; direct requests send `Api-Version-Date`, overriding the key pin. The SDK is used only for signature verification and is pinned in package.json. Whop dashboard display labels and whether webhook delivery permissions attach to your key or webhook principal must be verified in your account; the identifiers below come from Whop's current OpenAPI security declarations, not inferred label translations.

| Scope | Endpoints | Reason |
| --- | --- | --- |
| `checkout_configuration:create` | POST /checkout_configurations | Create a server-owned checkout per GO user |
| `checkout_configuration:delete` | DELETE /checkout_configurations/{id} | Close a consumed checkout |
| `plan:basic:read` | GET /variants/{id} | Verify live pricing and private variant fields |
| `member:basic:read` | GET /memberships, /memberships/{id} | Verify subscription and access state |
| `member:manage` | GET /memberships/{id}, POST /memberships/{id}/cancel | Expose Whop manage URL and support period-end cancellation |
| `payment:basic:read` | GET /payments, /payments/{id}, /refunds/{id} | Verify payments, refunds, and account association |
| `payment:dispute:read` | GET /disputes, /disputes/{id} | Apply the dispute access policy |

GET /products/{id} is public. GET /api_keys/permissions lists permission catalog for an authenticated key without an additional scope in the OpenAPI spec. Do not grant checkout write/delete scopes to the browser. No Whop client token is used.

Dashboard webhook creation does not require the website key to manage webhooks. If creating via API instead, `developer:manage_webhook` is a separate setup privilege; do not add it to the runtime key. Whop's webhook schema lists `webhook_receive:memberships`, `webhook_receive:payments`, `webhook_receive:refunds`, and `webhook_receive:disputes` for the chosen events. It also lists the following payload permissions: `member:basic:read`, `member:email:read`, `member:phone:read`, `payment:basic:read`, `payment:dispute:read`, `plan:basic:read`, `access_pass:basic:read`, `promo_code:basic:read`, `shipment:basic:read`, `payment:resolution_center_case:read`, and `company:basic:read` (the precise set differs per event). Verify in Whop whether these are required for delivery or merely optional fields and which principal needs them; don't claim event delivery is working until tested. Request only what the dashboard/provider requires for delivery and fields used, and record any additional scope actually granted.

## Webhooks and reconciliation

Create a business webhook with URL `https://www.galacticomnivore.com/api/webhooks/whop`, API version date `2026-11-10-1`, account scope (not child-only), and these events: `membership.updated`, `payment.succeeded`, `payment.failed`, `refund.created`, `refund.updated`, `dispute.created`, `dispute.updated`. Pin the endpoint to the same API version. Record its signing secret as `WHOP_WEBHOOK_SECRET`; it is separate from the API key. The route verifies the raw payload and timestamp using the official SDK, requires matching event and header IDs, business and API version, then reads the current provider state before updating access. A redirect or email match never grants access.

Enable the GitHub workflow `whop-reconciliation.yml` only after deployment: set repository variable `WHOP_RECONCILE_ENABLED=true` and repository secret `WHOP_CRON_SECRET` equal to Vercel `CRON_SECRET`. This secret is for calling the website's cron route, not a Whop credential. The workflow checks two memberships per run; monitor failures and completed-cycle age in `whop_reconciliation`. At five-minute intervals a full cycle takes approximately five minutes per two memberships and may become too slow at scale. Provider retries and user-triggered recovery provide additional protection but do not replace monitoring and an appropriately sized scheduler.

Review `whop_events` for failed/pending notifications and `whop_unlinked_purchases` for direct purchases or duplicates. To recover, check Whop's webhook delivery logs, correct configuration, replay the original event, and run reconciliation. The success page and Billing can request a rate-limited account-specific reconciliation. An admin can call POST `/api/admin/billing/whop` with a Firebase admin bearer token and JSON `{ "uid": "...", "action": "link_verified_purchase", "membershipId": "mem_...", "evidenceNote": "..." }` **only after independently verifying control of both the GO account and Whop membership**. The note should describe verification without passwords, card details, or secrets. Links and admin identity are audited, and a membership cannot be claimed by two GO users. If ownership cannot be established, leave the purchase unlinked and resolve through support. GET of this route runs a read-only authenticated catalogue audit and displays Whop's permission catalog to an administrator.

Existing Polar subscriptions and Whop memberships use separate records; active access derives from eligible records without automatically canceling either subscription. Coordinate migration with each customer to avoid double renewal. Separately purchased access, admin grants, and Mentor approval remain independent. A full refund suspends the affected Whop membership; partial refunds retain its paid period. A disputed Whop membership is suspended while a dispute is open or lost and restored after a favourable resolution if still paid and eligible. This is a GO policy choice, not a Whop requirement. Whop plan upgrades at next renewal are unavailable until provider behavior is verified; contact GO support rather than starting a second subscription or promising no charge today.

## Release, verification and rollback

1. Apply Firestore security rules and indexes with the site's established release process. Test that ordinary users cannot edit `whopMembership` or access server-only collections.
2. Configure values above, audit all six live variants with the restricted API key, private discounts and tax settings, and validate the webhook's event configuration and delivery logs. Verify Google and email/password sign-in.
3. Verify end to end using real provider-confirmed payment and webhook events for each product, renewals, cancellation, refunds, disputes, duplicates, differing checkout email, direct links, Discord, and Polar coexistence. The owner's production-only choice means such financial tests require separate explicit authorization for any real charge or refund; until then these cases are unverified. Test card data, if used, must never enter production.
4. Confirm recovery scheduling and alerts, then explicitly enable both checkout flags and redeploy. Keep the Polar webhook and customer portal operational. Never cancel a Polar customer or notify them automatically.
5. To roll back, set both checkout flags `false` and redeploy. Continue processing Whop and Polar webhooks and cron reconciliation for existing customers, investigate and repair; do not remove Whop entitlements or stop webhooks just because new checkout is disabled.

Whop lists North Macedonia as payout-supported, but that does not confirm approval of GO's specific bank account, payout currency, fees, or a successful withdrawal. Verify these separately in Whop Balances and with the bank; receipt of a real payout has not been observed.

References: https://docs.whop.com/developer/guides/auth-scoping ; https://docs.whop.com/developer/quickstart ; https://docs.whop.com/developer/api/versioning ; https://docs.whop.com/api-reference/stability ; https://docs.whop.com/manage-your-business/manage-payouts/set-up-payouts
