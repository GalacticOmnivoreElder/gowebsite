# GO Mentor membership and programme

Owner decision, 11 November 2026: GO Mentor remains a paid membership tier and will migrate to Whop alongside GO Community and GO Business. This supersedes the earlier instruction to remove paid Mentor membership. See [the Whop migration brief](WHOP_MIGRATION.md).

Mentor approval (`mentorStatus`) remains a separate administrator-controlled process. Paying for membership must never approve a mentor, guarantee a placement, or bypass the interview and verification process. The membership catalogue includes Mentor pricing and a separate verification notice.

New subscription checkout remains paused while GO migrates payment providers. Existing subscription records, webhooks, activation history, and the Polar billing portal remain available for reconciliation and account support. Whop checkout and webhook integration have not yet been implemented.

| Billing | Current display price | Historical Polar product ID |
|---|---|---|
| Monthly | 1,499 MKD/month | `1d213038-ac43-4c83-87a4-56a5d79ee2df` |
| Annual | 14,999 MKD/year | `7963bdf5-be68-4d72-82ef-d86da4558b37` |

Historical production product IDs may remain in server-side reconciliation code so older webhook records continue to map to the Mentor tier. They must not be presented as new checkout options. Existing `POLAR_ACCESS_TOKEN`, `POLAR_SERVER`, and webhook configuration are retained only for account and subscription reconciliation.

`MEMBERSHIP_CHECKOUT_ENABLED` defaults to false. `MENTOR_CHECKOUT_ENABLED` also defaults to false. Keep both disabled until GO has an approved replacement payment flow and updated product terms.

## Historical annual billing issue

The earlier audit recorded that, on 7 September 2026, the supplied annual product was labelled annual but configured with `recurring_interval=month` and displayed 14,999 MKD/month. The current reconciliation mapping also includes annual product ID `b6838dca-edaf-4fc7-bfdf-d2ceed0ba1f9`. These IDs and historical findings are not a fresh verification of Polar's live catalogue.

For the Whop migration, verify the actual initial and renewal amounts, currency, recurring billing interval, and product-to-tier mapping before accepting purchases. A product title containing "Annual" is not proof of annual billing. Do not copy the historical billing-cycle mistake or assume the existing Polar readiness helper validates Whop products.

No Polar checkout links belong in the public membership catalogue. Keep provider product identifiers only where they are needed to reconcile historical subscriptions and webhook events.
