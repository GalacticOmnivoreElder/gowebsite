# Polar member migration: review before contacting anyone

Inventory read from Polar on 12 November 2026. Counts reflect subscriptions, not necessarily unique customers. Re-check before action.

- 8 active GO Community monthly subscriptions.
- 1 active GO Community annual subscription.
- 1 active GO Mentor monthly subscription.
- 1 active GO Claude monthly subscription: leave on Polar under the owner's instruction.
- All 11 active subscriptions reported automatic renewal enabled at inventory time. Eight other Polar subscriptions were canceled; none reported a future paid-through date at that moment.

For the 11 active subscriptions, an exact email comparison found six with one matching GO user email and five with no exact email match. This is an operational lead only: email does not establish ownership, and no match does not prove the person lacks a GO account. Verify each subscriber and their GO account independently. Do not send customer lists, payment information, or credentials through chat.

## Rules for the 10 GO membership subscriptions

1. Obtain a fresh Polar subscription export and review each current plan, owner, amount, discount, next renewal and paid-through date. Confirm whether any customer has multiple subscriptions or already has Whop access. The 10 membership subscriptions above are not necessarily 10 people.
2. Confirm with Polar and Whop whether a provider-managed transfer is possible for these specific Polar subscriptions. Whop's Stripe migration requires authorized access to the underlying Stripe account, and confirmation schedules eligible Stripe subscriptions for cancellation. Polar processing through Stripe does not establish that GO controls those Stripe objects. Do not start a migration or grant broad Stripe access without reviewing eligibility and consequences.
3. If direct transfer is unavailable, send a reviewed personal notice explaining how the member can schedule cancellation of their Polar renewal, keep access until the paid-through date, and subscribe through GO's signed-in membership page after that date. Confirm price and tax individually. Their Whop checkout email may differ from GO login email. Do not send static Whop product links as an account-linking substitute.
4. GO currently rejects starting a Whop checkout while existing paid access is still active, including scheduled-to-end subscriptions. There may therefore be a gap between Polar expiry and Whop checkout. Do not promise a seamless automatic transition until an appropriate pre-registration/deferred-billing feature is designed, approved, and end-to-end tested. Preserve existing Polar access and billing history throughout.
5. Track each case securely: subscription ID, intended GO account, product, renewal/paid-through date, notification and consent, confirmed Polar cancellation, Whop payment confirmation, GO entitlement, and any required support reconciliation. Minimize access to this customer data; don't put it into Git.
6. Never cancel a subscription, send a customer message, or make a charge merely because it appears in this inventory. Customer communication and changes require the appropriate explicit authorization.

## Monthly to annual on Whop

The owner prefers the annual charge to begin at the end of the paid monthly period. GO's three monthly and three annual offers currently exist as separate Whop products, and the website's Whop business-upgrade route is intentionally disabled. Whop's membership-update endpoint documents changing cadence, but its renewal-price update is limited to reductions and its documented fields do not establish an atomic switch to GO's different annual variant and price at renewal. Confirm the exact supported solution, billing date, tax, changes to product/variant IDs, webhooks, and failure behavior with Whop before implementing or promising a one-click switch. A customer-managed cancellation and later annual checkout is a fallback, but the site currently blocks that checkout until the existing paid period ends and it may leave an access gap. Do not modify shared products or prices for all existing subscribers.

Whop support guidance received 12 November 2026 did not confirm Polar transfer or an in-place monthly-to-annual switch. Its suggested delayed-charge/trial handoff is not supported by GO's current integration: checkout rejects accounts with active paid access, catalog validation rejects trial variants, access requires verified paid evidence, and the Whop entitlement projection stores one current membership. Do not change a renewal date after an immediately charged checkout assuming it will defer the first charge. A new implementation must verify first-charge timing and both provider states, preserve access under the original paid entitlement until its paid-through date, authenticate account linking, prevent overlapping renewals, and reconcile failed or late payments and events. Agree the handoff and test with Whop before implementing it in production.

References: https://whop.com/blog/migrations/ ; https://docs.whop.com/api-reference/memberships/update-membership ; https://polar.sh/docs/api-reference/subscriptions/export ; https://polar.sh/features/subscriptions
