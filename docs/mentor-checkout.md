# GO Mentor programme

GO Mentor is a separate application and review programme, not a paid membership tier. Mentor approval (`mentorStatus`) remains a separate administrator-controlled process. Staff should set `mentorStatus=approved` only after interview verification and should not describe mentor activity as a subscription benefit.

The membership page does not list Mentor pricing or expose a Polar checkout URL. New subscription checkout is paused while GO migrates payment providers. Existing subscription records, webhooks, activation history, and the billing portal remain available for reconciliation and account support.

| Billing | Display price | Production product ID |
|---|---|---|
| Monthly | 1,499 MKD/month | `1d213038-ac43-4c83-87a4-56a5d79ee2df` |
| Annual | 14,999 MKD/year | `7963bdf5-be68-4d72-82ef-d86da4558b37` |

Historical production product IDs may remain in server-side reconciliation code so older webhook records continue to map to the Mentor tier. They must not be presented as new checkout options. Existing `POLAR_ACCESS_TOKEN`, `POLAR_SERVER`, and webhook configuration are retained only for account and subscription reconciliation.

`MEMBERSHIP_CHECKOUT_ENABLED` defaults to false. `MENTOR_CHECKOUT_ENABLED` also defaults to false. Keep both disabled until GO has an approved replacement payment flow and updated product terms.

## Annual billing correction

When verified on 7 September 2026, the supplied annual product was labelled annual but configured with `recurring_interval=month` and displayed 14,999 MKD/month. Polar locks the billing cycle and recurring interval when a product is created (https://polar.sh/docs/features/products). Create a replacement product at 14,999 MKD, recurring every one year, then update the annual product override to the replacement ID and the catalogue link to its new Checkout Link.

Both the membership page and the checkout API validate the actual product's recurring interval, interval count, price, currency, active status, and tier. Annual purchases are unavailable until Polar reports a yearly interval and 14,999 MKD price. The page checks again on each request, and checkout independently checks again before creating a session. Once the replacement annual product is configured, the availability checks allow annual checkout. API failures or mismatches leave the affected option unavailable.

No Polar checkout links belong in the public membership catalogue. Keep provider product identifiers only where they are needed to reconcile historical subscriptions and webhook events.
