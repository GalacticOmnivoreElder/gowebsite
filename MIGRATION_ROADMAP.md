# GO Platform — Projects + Polar Migration Roadmap

_Last updated: 2026-07-13_

Migrating the feature upgrades from `gowebsite-dev` (Next 15, Polar payments, Projects
system, dashboard/profile upgrades) onto the production `gowebsite` repo, **on top of**
main's recent work (Education page, WordPress formatting fix, footer text, email routing).

Working branch: `feature/projects-polar-migration` (off `prod`).

---

## Source of truth

- **Dev repo (source of new features):** `../../Work/gowebsite-dev`
- **Main repo (target, this repo):** current dir
- Repos have **divergent git history** (no shared ancestor reachable) → file-level merge, not `git merge`.
- Spec: `../../Work/gowebsite-dev/docs/PROJECTS_FEATURE_SPECIFICATION.md`
- Polar test guide: `../../Work/gowebsite-dev/docs/POLAR_TEST.md`

## Diff summary

- **38 new files** in dev (Projects, Polar billing, applications, source projects, profile editor) → copy in.
- **39 files modified in both** → careful per-file merge (preserve main's recent work).
- **3 files only in main** → keep: `education/page.js`, `SubscriptionStatus.jsx`, `admin-data-cache.js`.

### Files where MAIN's version must WIN (do NOT overwrite with dev)
- `src/lib/firebase-admin.js` — main is far more robust (multi-method creds, Windows-safe, lazy proxy).
- `src/app/api/wordpress/route.js` — main has the recent WordPress formatting fix.
- `src/app/education/page.js` — main-only, keep.
- Header/Footer — must retain main's Education link + updated footer text while adding dev nav.

---

## Phase 0 — Setup & decisions  ✅
- [x] Create feature branch
- [x] Map diff (new/modified/removed files)
- [x] Decide Next.js 13 → 15 upgrade — **approved, upgraded**
- [ ] Get Polar sandbox credentials from Dejan (**BLOCKED — waiting on creds**)
- [x] Produce env var guide (sandbox + prod) → `docs/POLAR_SETUP.md`

## Phase 1 — Dependencies & framework  ✅
- [x] Add deps: polar (3) + dicebear (2)
- [x] Next 15.3.8 / React 18.3.1 applied
- [x] `npm install`, clean production build (`next build` exit 0)

## Phase 2 — Port infrastructure (non-UI)  ✅
- [x] `src/lib/` polar/auth-utils/project-utils/webhook-* ported (+ getRequestUser helper)
- [x] constants/skills, utils (avatar/formatBudget/validateProfile)
- [x] `src/mobx.js` — took dev superset (welcome email verified present)
- [x] Kept main's robust `firebase-admin.js`; new routes verified against it

## Phase 3 — Projects system (API + pages)  ✅
- [x] All project/application/sourceProject/user/admin API routes
- [x] All project pages render (200 at runtime)
- [x] Profile/user pages, ProfileEditor, UserLink, skills

## Phase 4 — Polar payments  ✅ (code) / ⏳ (live test blocked on creds)
- [x] checkout rewritten (server session, IP forward, email lock, tiers)
- [x] webhook (SDK signature-verified) writes membershipTier
- [x] billing/admin-billing/portal routes ported
- [x] SubscribeButton → secure POST + Bearer token
- [x] Two tiers wired: member (apply) + company (create). Company product id env pending.

## Phase 5 — Named bug fixes  ✅
- [x] Infinite spinner — success page hardened (try/finally always clears loading)
- [x] Private-project leak — API already guarded + profile endpoint tightened + firestore.rules deny client
- [x] Gate project creation behind company tier (server-side)
- [x] Superadmin edit any project + hide (set status/visibility) — getRequestUser now Firestore-admin-aware
- [x] Delete projects — DELETE now allows platform admin
- [x] Polar: customer_ip_address forwarded; email lock via customerId/externalCustomerId
- [ ] Embedded checkout (optional, keeps user on GO domain) — deferred, hosted checkout live

## Phase 6 — Security hardening  ✅ (deploy rules pending)
- [x] Webhook signature validated by `@polar-sh/nextjs` Webhooks()
- [x] Idempotency via processed_webhooks
- [x] Server-side authz on all project/application mutations (shared getRequestUser)
- [x] Subscription-gating enforced server-side
- [x] make-admin bootstrap secret (sets claim + Firestore field)
- [x] `firestore.rules` authored (projects/apps/orders server-only) — **DEPLOY needed**
- [x] Confirmed `.env` is gitignored (secrets not in repo)

## Phase 8 — GO-1585 Polar webhook completeness  ✅
- [x] order.paid, order.refunded (revokes access on full refund), order.updated
- [x] subscription.created, active, updated (past_due grace), canceled, uncanceled, revoked
- [x] customer.state_changed; signature verified by SDK; idempotent

## Phase 9 — GO 2.0 Onboarding + CV Builder (from PDF spec)  ✅ (MVP)
- [x] Data model: user_profiles, onboarding_sessions, go_cvs (server-only in rules)
- [x] Onboarding: 7-step wizard `/onboarding` + `/api/onboarding` (start/save-step/complete)
- [x] GO Profile: `/api/me/profile` (GET/PATCH)
- [x] GO CV: `/lib/cv-generator.js` (deterministic + optional Claude wording),
      `/api/me/cv` (get/generate/edit/publish), `/cv` preview+edit page
- [x] Visibility-gated `/api/users/[id]/cv` (own/admin/public/creator-after-apply)
- [x] CV snapshot stored on each application (+ role/motivation/availability fields)
- [x] Post-subscribe funnel → onboarding; "My CV" nav link
- [ ] Phase 2 (deferred, per spec): Discord OAuth auto-roles, CV PDF export, public
      share links, Quest Log, richer project statuses (submitted_for_review etc.)

## Phase 7 — Build, test, verify  ⏳
- [x] `npm run build` clean
- [x] Local runtime smoke: pages 200, API auth 401/403 enforced, public listing filters
- [ ] Full Polar sandbox flow: subscribe → webhook → access (needs creds + tunnel)
- [ ] Cancellation + webhook replay dedup test
- [ ] Deploy firestore.rules + verify private projects hidden from client

---

## Open questions / needs from Dejan
- Next 15 upgrade approval.
- Polar sandbox creds (org access token, product IDs for both tiers, webhook secret, org slug).
- Two product IDs: member tier + company/B2B tier.
- Public tunnel (ngrok/cloudflared) URL for local webhook testing.

## Known risks / flags
- Divergent histories → manual reconciliation risk; verify each merged file.
- Next major upgrade could affect Vercel prod build.
- `test-polar` / `make-admin` pages are dev-only surfaces — must be gated/removed before prod.
- Dev's `firebase-admin.js` is weaker — do not let it overwrite main's.
