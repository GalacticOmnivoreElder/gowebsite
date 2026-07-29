# GO 2.0 — One-Pass Action Checklist (Dejan)

Everything you need to do to get this branch fully working locally, then to production.
Code is done; these are the **manual** steps. Do them top to bottom.

Legend: 🟢 = do now for local testing · 🔵 = production only · ⏱️ = ~time

---

## A. Fill the `.env` (🟢) ⏱️ 10 min

Open `.env` (already gitignored). Firebase is done. Fill the required **Polar**
and service configuration. GameDev Passport generation is deterministic and
does not require an AI provider or AI consent:

```bash
POLAR_SERVER=sandbox
POLAR_ACCESS_TOKEN=<your SANDBOX org token>        # replace the legacy prod token!
POLAR_ORGANIZATION_SLUG=<your sandbox org slug>
POLAR_WEBHOOK_SECRET=<from step C>
POLAR_SUCCESS_URL=http://localhost:3000/subscription/success
# 4 products (2 tiers × monthly/annual — Polar has no annual toggle):
NEXT_PUBLIC_POLAR_MEMBER_MONTHLY_PRODUCT_ID=<id>
NEXT_PUBLIC_POLAR_MEMBER_ANNUAL_PRODUCT_ID=<id>
NEXT_PUBLIC_POLAR_COMPANY_MONTHLY_PRODUCT_ID=<id>
NEXT_PUBLIC_POLAR_COMPANY_ANNUAL_PRODUCT_ID=<id>
ADMIN_BOOTSTRAP_SECRET=<any long random string>    # to make yourself admin (step F)
```

> ⚠️ The `.env` still contains a **legacy production** Polar token. Replace it with a
> sandbox token now, and **rotate that production token** in the Polar dashboard since
> it was sitting in plaintext.

## B. Create Polar sandbox org + 2 products (🟢) ⏱️ 15 min
1. Sign in at **https://sandbox.polar.sh**, create a sandbox organization.
2. Create **four subscription products** (Polar has no annual toggle — each product
   is one interval):
   - **Member — Monthly** and **Member — Annual** (GO Community Membership)
   - **Company — Monthly** and **Company — Annual** (B2B Partner)
3. For each product: add a **"required membership" checkbox** in its checkout fields,
   and attach the **Discord benefit** (Polar → Benefits → Discord) so roles are granted
   automatically. Put the annual wording in the annual products' names/descriptions.
4. Copy the **4 product ids** → the four `NEXT_PUBLIC_POLAR_*_PRODUCT_ID` vars.
5. Settings → Developers → **Access Token** (sandbox) → `POLAR_ACCESS_TOKEN`.
   Copy the org **slug** → `POLAR_ORGANIZATION_SLUG`.

## C. Webhook (🟢 local, 🔵 prod) ⏱️ 10 min
1. Start a tunnel: `ngrok http 3000` → copy the `https://…ngrok…` URL.
2. Polar dashboard → **Webhooks → Add endpoint**:
   - URL: `https://<tunnel>/api/subscription/webhook`  · Format: **Raw**
   - Events: `order.paid`, `order.refunded`, `order.updated`,
     `subscription.created`, `subscription.active`, `subscription.updated`,
     `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`,
     `customer.state_changed`
3. Copy the endpoint **signing secret** → `POLAR_WEBHOOK_SECRET`.
   🔵 **Do not reset the secret later without also updating the env var.**

## D. Deploy Firestore security rules (🟢 REQUIRED) ⏱️ 5 min
This is what actually hides private projects/CVs from the browser.
```bash
firebase deploy --only firestore:rules
```
Test first in **Firebase console → Firestore → Rules → Playground** (or a staging
project). File is `firestore.rules` in the repo root.

## E. Run it (🟢) ⏱️ 2 min
```bash
npm install      # if you haven't since pulling this branch
npm run dev      # http://localhost:3000
```

## F. Make yourself admin (🟢) ⏱️ 2 min
1. Sign up / log in locally.
2. In local development only, go to `/make-admin`, enter your email, and use the bootstrap secret from step A
   (or POST to `/api/admin/make-admin` with header `x-admin-bootstrap-secret`).
3. You can now edit/hide/delete any project and see `/admin/*`.
   The page and API return 404 outside development. Never configure
   `ADMIN_BOOTSTRAP_SECRET` in staging or production.

## G. Test the full member loop (🟢) ⏱️ 15 min
1. **Subscribe** (Member button) → Polar checkout opens.
   - ✅ checkout opens · ✅ price/currency correct for your location · ✅ annual
     recurring wording · ✅ required-membership checkbox · ✅ email is locked/prefilled.
2. Pay with sandbox card `4242 4242 4242 4242`, any future expiry, any CVC.
3. Success page → **Complete your GO profile** → finish the **7-step onboarding
   wizard** → your **GameDev Passport** is generated → **Approve & Publish**.
4. Verify in Firestore: `users/{uid}` has `activeMember`, `membershipTier`,
   `polarCustomerId`, `subscriptionEndsAt`; and `orders`, `subscription_events`,
   `user_profiles`, `go_cvs` collections got docs.
5. As a **Member**, apply to a hiring project → the application stores a **CV snapshot**.
6. As a **Company** account, create a project (Members can't).
7. ✅ Discord role granted (Polar benefit) · ✅ subscription shows in Polar and in
   `/admin/subscriptions`.
8. **Cancel** from `/billing` → access stays until period end, `willRenew=false`.
9. **Replay** a webhook from Polar → no duplicate order/event (idempotent).

## H. Go to production (🔵) ⏱️ 20 min
- [ ] `POLAR_SERVER=production` + **production** token + **production** product ids.
- [ ] New **production** webhook endpoint at `https://<prod-domain>/api/subscription/webhook`
      with the same 10 events; production signing secret in env. (Replace the old ngrok one.)
- [ ] `POLAR_SUCCESS_URL=https://<prod-domain>/subscription/success`.
- [ ] `firestore.rules` deployed to the production Firebase project.
- [ ] `ADMIN_BOOTSTRAP_SECRET` is absent.
- [ ] Confirm dev-only `/test-polar` and `/make-admin` return 404.
- [ ] Rotate the leaked production Polar token.
- [ ] One real low-value live payment as a final smoke test.

---

## Optional / Phase 2 (not blocking launch)
- **Embedded checkout** (keep the customer visually on the GO domain instead of
  redirecting to polar.sh) — say the word and I'll wire Polar's embed.
- **Discord OAuth auto-role** (MVP grants Discord role via Polar benefit; full OAuth
  bot assignment is Phase 2 per the GO 2.0 spec).
- **Public GameDev Passport share links / Quest Log** — Phase 2 per the spec.
- **Richer project statuses** (submitted_for_review, changes_requested,
  public_recruiting…) — current system uses draft/pending/hiring/live/completed/rejected.
```
