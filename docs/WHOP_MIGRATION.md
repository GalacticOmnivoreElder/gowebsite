# GO: Polar to Whop migration

Prepared 11 November 2026. Status: catalogue and migration preparation only; no Whop products created, payment integration implemented, subscriptions cancelled, customer messages sent, or deployment performed.

## Confirmed decisions

- GO is based in North Macedonia.
- The owner created the Whop business **Galacticomnivore**, ID `biz_fXnLxutjLKO8jT`. [Products dashboard](https://whop.com/dashboard/biz_fXnLxutjLKO8jT/products/).
- The authenticated products dashboard was inspected on 11 November 2026 and showed "No products yet" (0 results with Visible and Hidden selected). The product creation form was opened, but browser control/capture failures prevented inspection of paid pricing. No products were submitted. Charge-currency availability and payout verification remain unknown.
- All three paid tiers migrate: Community, Mentor, and Business, each with monthly and annual billing.
- Paying Polar customers exist. The owner will inform them and accepts a migration requiring a new checkout rather than automatic payment-method transfer.
- Mentor purchase and mentor approval remain separate.
- Whop is the interim provider. Keep GO product and entitlement identifiers independent of the payment provider so a later Stripe integration does not redefine membership access.

## Catalogue to create

Source: `src/constants/membership.js`. These are current website prices, not a verified export of the live Polar account and not proof that Whop supports MKD presentment. The attempted live Polar inventory read did not succeed. Reconcile the live account before declaring the full catalogue migrated.

Create three products with two recurring billing options each. Whop supports multiple billing options per product; see [product creation](https://docs.whop.com/manage-your-business/products/create-product) and [pricing setup](https://docs.whop.com/manage-your-business/payment-processing/set-up-pricing).

| Product | GO tier | Monthly price | Annual price |
| --- | --- | ---: | ---: |
| GO Community | `member` | 500 MKD | 4,800 MKD |
| GO Mentor | `mentor` | 1,499 MKD | 14,999 MKD |
| GO Business | `company` | 2,999 MKD | 29,000 MKD |

The machine-readable preparation file is `docs/whop-catalog-draft.json`. It carries current descriptions, benefits, and six stable GO plan keys; Whop identifiers and approved charge amounts remain empty. It is not a Whop API request or import format.

Keep existing amounts as the source of truth until charge currency is verified. If MKD is unavailable, agree explicit replacement prices in a supported currency and update the website and checkout together. Do not silently treat an MKD number as EUR/USD or convert using an assumed exchange rate. Check whether prices include taxes and whether buyer-facing service fees apply before publishing.

## Other offers to reconcile

- T-shirts currently use reservations and customer-proposed MKD totals, with single-shirt and two-shirt offers, sizes, fits, and pickup/delivery choices. They are not fixed-price membership subscriptions. A Whop merchandise flow needs an agreed price, inventory, shipping/collection, and reservation-to-payment linkage before implementation.
- Course code currently records pricing as `coming_soon`; individually paid courses default to disabled. Preserve member access and staff-assigned access rather than inventing standalone paid products.
- Video bundles have their own content/access model. Reconcile live content and any existing one-time Polar products before deciding which need separate Whop listings.
- Audit live Polar products, archived products with active subscribers, discounts, outstanding invoices, refunds, and any attached benefits. The repository alone cannot establish completeness.

## Payout verification

North Macedonia appears in [Whop's official supported payout countries](https://docs.whop.com/manage-your-business/manage-payouts/set-up-payouts), checked 11 November 2026. This establishes country support, not approval of GO's specific account.

The business now exists. The owner needs to open Dashboard > Balances > Set up Whop Payments, complete identity/business verification, and link an accepted payout method. Confirm the bank country and incoming currency, account status, available payout method, fees/FX, settlement timing, and any reserve shown for this account. Whop says settlement can use a currency other than the bank country's local currency; actual available options still need verification in GO's account.

Record successful receipt of a permitted, genuine sales payout in the bank before calling withdrawals verified. The owner performs the actual withdrawal. Do not promise instant access to all revenue: [Whop describes compliance reviews and possible reserves](https://whop.com/blog/getting-paid-on-whop/).

## Website integration still required

1. Create a separate Whop sandbox business and credentials. Production and sandbox do not share keys, products, or webhooks. Use the [current Whop API and quickstart](https://docs.whop.com/developer/quickstart.md), pin its version, and avoid mixing legacy plan examples with the current variants API.
2. Map each of the six GO plan keys to a validated Whop product/variant and approved price. Validate price, renewal settings, billing cadence, currency, and account ownership on the server.
3. Add authenticated server-created checkout linked to the verified GO user. Browser input must not select an arbitrary price, tier, or account identity. Store a trusted checkout-to-user association; do not grant access by email matching alone.
4. Add signed Whop webhooks with duplicate/replay handling and safe out-of-order processing. Reconcile confirmed provider state before granting or removing access. Redirects and client-reported success are not payment evidence.
5. Track provider and subscription IDs separately. Keep Polar billing management, orders, and webhooks for old subscriptions. A late Polar cancellation/refund must not revoke a separately valid Whop entitlement.
6. Route subscription status, cancellation, renewal, upgrades, portal links, receipts, and billing history to the correct provider. Preserve the existing next-renewal Business-upgrade policy unless explicitly changed; do not promise "no charge today" without confirmed provider behavior.
7. Update membership confirmation, analytics provider labels, admin billing views, privacy/payment copy, server-only field protection, and any required browser security policy. Continue deriving Discord access from GO's verified entitlement model; avoid competing role writers.
8. Test all six plans, renewals, failed payments, cancellation with paid-through access, refunds, disputes, duplicate/invalid/out-of-order webhooks, cross-provider events, and Mentor approval separation. Verify the full checkout-to-GO-to-Discord journey in the sandbox before production setup.

Keep `MEMBERSHIP_CHECKOUT_ENABLED=false` and `MENTOR_CHECKOUT_ENABLED=false` while this work is incomplete. Merely enabling the existing flags would still invoke the Polar checkout implementation.

## Existing-customer migration

1. Reconcile each customer's GO account, current Polar tier, renewal status/date, paid-through date, discounts, and pending changes. Store the roster privately, never in this repository.
2. Agree the individual transition date and new price/currency. The owner sends notices; no customer communication is authorized by this preparation document.
3. Coordinate ending Polar renewal at the paid-through date and starting Whop billing so customers do not pay twice for overlapping coverage. Preserve paid access and make any grace period explicit.
4. Require a verified Whop purchase before marking the replacement subscription active. Do not claim existing card mandates transfer automatically.
5. Reconcile completed transitions, failed checkouts, refunds, and remaining Polar renewals. Retain historical receipts and webhook processing for reconciliation.

## Inputs needed next

- Access for product configuration and integration testing (business ID is now recorded above).
- Bank payout currency and completed account verification status; no bank account numbers or identity documents in chat.
- Confirmed Whop charge-currency availability and approved prices if MKD cannot be used.
- Sandbox access and server-side credentials stored securely, never pasted into chat or committed.
- Live Polar inventory and private subscriber reconciliation before launch.
