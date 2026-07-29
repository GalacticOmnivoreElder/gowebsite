# Polar Payments — Setup, Env Vars & Testing Guide

This is the single source of truth for wiring Polar (sandbox → production) after the
Projects + Polar migration. Two membership tiers exist:

Polar has no "enable annual" toggle — each product is one interval — so there are
**4 products** (2 tiers × monthly/annual):

| Tier | Interval | Product env var | Unlocks |
|------|----------|-----------------|---------|
| **Member** | Monthly | `NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID` | Apply to projects |
| **Member** | Annual | `NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID` | Apply to projects |
| **Company (B2B)** | Monthly | `NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID` | Create & manage projects |
| **Company (B2B)** | Annual | `NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID` | Create & manage projects |

The `SubscribeButton` picks the product from `tier` + `interval` props
(`resolvePolarProductId` in `src/lib/polar.js`).

---

## 1. Environment variables

All live in `.env` (already gitignored). Firebase is already configured — you only need
to fill the **Polar** block. Copy this and replace the blanks:

```bash
# ── POLAR ──────────────────────────────────────────────
POLAR_SERVER=sandbox                     # "sandbox" for local, "production" for live
POLAR_ACCESS_TOKEN=                       # Org access token — MUST match POLAR_SERVER
POLAR_ORGANIZATION_SLUG=                  # your org slug (portal URL)
POLAR_WEBHOOK_SECRET=                      # signing secret from the webhook endpoint
POLAR_SUCCESS_URL=http://localhost:3000/subscription/success
NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID=
NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID=
NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID=
NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID=

# Optional: grants the FIRST admin via x-admin-bootstrap-secret header
ADMIN_BOOTSTRAP_SECRET=
```

> ⚠️ The `.env` currently holds a **legacy production** `POLAR_ACCESS_TOKEN`
> (`polar_oat_…`). For local sandbox testing, replace it with a **sandbox** token,
> and keep `POLAR_SERVER=sandbox`. A sandbox token used with `POLAR_SERVER=production`
> (or vice-versa) will fail.

### What I need from you (to finish sandbox testing)
1. `POLAR_ACCESS_TOKEN` — a **sandbox** org access token.
2. `POLAR_ORGANIZATION_SLUG` — your sandbox org slug.
3. `POLAR_WEBHOOK_SECRET` — from the webhook endpoint you create in step 3.
4. The **4 sandbox product ids** (member monthly/annual, company monthly/annual).
5. A public tunnel URL (ngrok/cloudflared) pointing at your local `:3000`.

---

## 2. Create the sandbox org & products (Polar dashboard)

1. Sign in at **https://sandbox.polar.sh** and create a sandbox organization.
2. Create **four subscription products** (Polar = one interval per product):
   - *GO Community Membership — Monthly* (e.g. €10/mo)
   - *GO Community Membership — Annual* (e.g. €100/yr)
   - *GO Company / Partner — Monthly* (e.g. €50/mo)
   - *GO Company / Partner — Annual* (e.g. €500/yr)
3. Copy each product's **id** into the matching env var above.
4. Settings → **Developers → Access Tokens** → create a sandbox org token → `POLAR_ACCESS_TOKEN`.

### Required subscription-change settings

The GO membership page owns Community-to-Business upgrades so it can show the
effective date and price before anything changes.

1. Open **Settings > Billing > Customer portal**.
2. Turn **Enable subscription plan changes** off. Keep cancellation, receipts,
   invoices, and payment-method management available in the portal.
3. Open **Settings > Subscriptions** and set the default proration behavior to
   **Next period** as defense in depth.

The application still sends `proration_behavior: "next_period"` explicitly for
every Business upgrade. The portal setting prevents customers from bypassing
the GO review dialog with a different organization-level proration default.

## 3. Webhook endpoint

1. Start a tunnel to localhost, e.g. `ngrok http 3000` → copy the `https://…ngrok…` URL.
2. Polar dashboard → **Webhooks → Add endpoint**:
   - URL: `https://<your-tunnel>/api/subscription/webhook`
   - Format: **Raw**
   - Events (full GO-1585 set, all handled by the webhook):
     `order.paid`, `order.refunded`, `order.updated`,
     `subscription.created`, `subscription.active`, `subscription.updated`
     (delivers `past_due`), `subscription.canceled`, `subscription.uncanceled`,
     `subscription.revoked`, `customer.state_changed`
3. Copy the endpoint's **signing secret** → `POLAR_WEBHOOK_SECRET`.
   Signatures are validated automatically by `@polar-sh/nextjs` `Webhooks()`.

> For production: replace the webhook URL with the live site
> (`https://<prod-domain>/api/subscription/webhook`) and use a **production** endpoint
> + token + `POLAR_SERVER=production`. The current webhook still points at an old ngrok
> URL — swap it before launch.

---

## 4. Test the full flow (sandbox)

1. `npm run dev`, log in locally, make yourself admin (see §6).
2. Click **Subscribe** (Member) or the Company CTA. You are sent to a Polar checkout.
3. Pay with the sandbox card `4242 4242 4242 4242`, any future expiry, any CVC.
4. The success page polls for activation; the webhook flips your access.
5. **Confirm in Firestore** the `users/{uid}` doc has: `activeMember: true`,
   `membershipTier`, `polarCustomerId`, `subscriptionId`, `subscriptionEndsAt`; and
   that `orders`, `subscription_events`, `processed_webhooks` collections got documents.
6. `/billing` shows subscription + history; `/admin/subscriptions` shows orders/events.
7. **Member** account can now Apply to a hiring project; **Company** account can create one.

### Cancellation
- Open the billing portal from `/billing` → cancel. Access remains until
  `subscriptionEndsAt`; `willRenew=false`, `subscriptionStatus=canceled`.

### Community to Business upgrade

1. Start with an active Community subscription and open `/membership`.
2. Select a Business billing interval and click **Review Business upgrade**.
3. Confirm that the dialog shows **No charge today**, the renewal date, and the
   expected Polar Business price.
4. Confirm the scheduled upgrade. Community remains the active entitlement and
   Firestore stores the separate `pendingMembership*` fields.
5. Confirm `/membership`, `/billing`, and the Polar portal show the scheduled
   change. Business-only project creation must remain unavailable.
6. At the next renewal, verify the Polar webhook changes `membershipTier` to
   `company`, clears `pendingMembership*`, and only then unlocks Business access.

### Webhook replay (idempotency)
- Redeliver the same event from Polar → no duplicate order/event is written
  (dedup via `processed_webhooks`).

---

## 5. Deploy Firestore security rules (REQUIRED)

The migration adds `firestore.rules` at the repo root — this is what actually hides
private projects from the browser (projects/applications/orders are server-only).

```bash
firebase deploy --only firestore:rules
```

Test first in **Firebase console → Firestore → Rules → Playground**, or deploy to a
staging project. Until these are live, private projects can still be read directly via
the client SDK / console.

---

## 6. Becoming an admin (superadmin)

- Set `ADMIN_BOOTSTRAP_SECRET` in `.env`, then POST to `/api/admin/make-admin` with
  header `x-admin-bootstrap-secret: <secret>` and body `{ "email": "you@example.com" }`
  (the `/make-admin` page does this for you). It sets both the Auth custom claim and
  `users/{uid}.admin`. After the first admin exists, clear the secret in production.
- Admins can edit/hide (set status→rejected) and delete **any** project, and access
  `/admin/*`.

---

## 7. Production checklist

- [ ] `POLAR_SERVER=production` + production token + product ids.
- [ ] Webhook endpoint points at the production domain; production signing secret.
- [ ] `POLAR_SUCCESS_URL=https://<prod-domain>/subscription/success`.
- [ ] Customer Portal plan changes are disabled; default proration is **Next period**.
- [ ] `firestore.rules` deployed and verified.
- [ ] `ADMIN_BOOTSTRAP_SECRET` cleared once an admin exists.
- [ ] Remove/lock the dev-only `/test-polar` page.
- [ ] One real low-value live payment as a final smoke test.
