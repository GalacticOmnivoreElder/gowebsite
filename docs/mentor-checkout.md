# GO Mentor checkout

GO Mentor is a paid membership tier (`mentor`). It grants the existing member access; mentor approval (`mentorStatus`) remains a separate administrator-controlled process. Mentors must complete an interview with GO and be verified before producing courses, workshops, video bundles, or assets, or connecting with community members requesting mentorship. Staff should set `mentorStatus=approved` only after interview verification. Buying this plan does not grant Business project creation or approve a mentor.

The membership page lists monthly and annual billing alongside Community and Business. Sign-in/sign-up retains the chosen Mentor interval. Checkout is created on the server with verified Firebase identity and the same Polar products as the supplied Checkout Links. The existing subscription success page, webhooks, billing portal, and activation emails handle the resulting subscription. Active subscribers manage their existing membership through Billing instead of opening a second subscription.

| Billing | Display price | Production product ID |
|---|---|---|
| Monthly | 1,499 MKD/month | `1d213038-ac43-4c83-87a4-56a5d79ee2df` |
| Annual | 14,999 MKD/year | `7963bdf5-be68-4d72-82ef-d86da4558b37` |

Production defaults use the product IDs verified from the owner's supplied links. Optional `NEXT_PUBLIC_POLAR_MENTOR_MONTHLY_PRODUCT_ID` and `NEXT_PUBLIC_POLAR_MENTOR_ANNUAL_PRODUCT_ID` override them. Sandbox has no production fallback and requires sandbox product IDs. Existing `POLAR_ACCESS_TOKEN`, `POLAR_SERVER`, and webhook configuration are reused. The token needs product read access as well as the existing checkout permissions.

`MENTOR_CHECKOUT_ENABLED` defaults to true. Set it to false to pause both Mentor checkout options. No changes to mentor applications or approval flags are required.

## Annual billing correction

When verified on 7 September 2026, the supplied annual product was labelled annual but configured with `recurring_interval=month` and displayed 14,999 MKD/month. Polar locks the billing cycle and recurring interval when a product is created (https://polar.sh/docs/features/products). Create a replacement product at 14,999 MKD, recurring every one year, then update the annual product override to the replacement ID and the catalogue link to its new Checkout Link.

Both the membership page and the checkout API validate the actual product's recurring interval, interval count, price, currency, active status, and tier. Annual purchases are unavailable until Polar reports a yearly interval and 14,999 MKD price. The page checks again on each request, and checkout independently checks again before creating a session. Once the replacement annual product is configured, the availability checks allow annual checkout. API failures or mismatches leave the affected option unavailable.

The links remain in `src/constants/membership.js` as the catalogue reference; customer checkout uses server-created sessions so verified identity, product selection, and the return to `/subscription/success` are preserved.
