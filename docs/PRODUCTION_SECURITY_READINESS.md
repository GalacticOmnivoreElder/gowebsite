# Production Security & Stability Readiness

**Reviewed:** 2026-10-07, including latest `prod` commits `a306edf` and `89020c`  
**Decision:** **NO-GO for broad rollout until P0 items are fixed or independently proven remediated.**  
**Scope:** application code, API authorization, Firestore rules, payments/webhooks, secrets/history, dependencies, build/tests, and operating controls.

**Current workspace:** Code-only items **2, 3, 4, 5, 6, 9, 10, 13, 16, and 17 are implemented and regression-tested**. They are not live until this branch and the new Firestore index are deployed. Item 1 remains intentionally untouched at the owner's request.

**Latest-commit result:** The new merch feature adds no new P0 issue. It adds item **17** and expands items **8, 11, 13, and 15**. Its positive controls include strict schemas, a 16 KB body cap, signed fragment tokens, consent/suppression checks, CSV-injection protection, and server-only Firestore rules.

## P0 — Fix before scaling

### 1. Historical Firebase Admin key — CRITICAL

**Problem:** A Firebase service-account JSON private key was committed in Git history (`9cd15ea`, `ea3bca2`) and must be treated as compromised even though the file was later deleted.

**Fix prompt:** Rotate/delete that exact Google IAM key now; audit Firebase Auth, Firestore, IAM, admin claims, and privileged writes since 2025-04-04; remove the secret from every Git ref/history and require affected clones to be replaced; add secret scanning and prevent service-account files from being committed.

### 2. Internet-facing Next.js RCE — CRITICAL

**Status:** ✅ Implemented — Next 16.4.0, Sharp 0.35.x, and strict thumbnail-origin validation.

**Problem:** `next@15.3.8` is affected by the critical unauthenticated AVIF image-optimization RCE [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), while the app uses Next Image with remote user-controlled image URLs.

**Fix prompt:** Upgrade Next.js to a currently supported patched release (never below `15.5.24`) and upgrade `sharp`; temporarily disable risky remote image optimization if deployment cannot happen immediately; validate thumbnail URLs against a strict host/type allowlist; rebuild and regression-test image uploads and rendering.

### 3. Payment entitlement fails open — CRITICAL

**Status:** ✅ Implemented — unknown products are quarantined; email-only account matching is removed.

**Problem:** Polar `order.paid` and subscription events can set `activeMember: true` even when the product does not map to an approved membership tier, and user lookup can fall back to email (`src/app/api/subscription/webhook/route.js`).

**Fix prompt:** Make entitlement changes fail closed: allowlist exact production organization/product/price IDs, require a recognized tier, bind purchases to metadata UID or stored Polar customer ID, quarantine unknown events, restrict email matching to an explicit migration job, and add tests proving unknown or cheaper products cannot activate membership.

### 4. Public project API leaks internal fields — HIGH

**Status:** ✅ Implemented — public and detail responses now use explicit DTO allowlists.

**Problem:** `GET /api/projects` returns `{ id, ...data }`, exposing `adminNotes` and any present or future private Firestore fields on published projects (`src/app/api/projects/route.js:258`).

**Fix prompt:** Replace whole-document spreading in every public project response with one explicit public DTO allowlist; exclude moderation notes, internal IDs, role lists, applications, billing, and audit data; add regression tests that seed secret fields and prove anonymous responses never contain them.

### 5. Stored XSS through WordPress excerpts — HIGH

**Status:** ✅ Implemented — excerpts use DOMPurify with a minimal tag list and no attributes.

**Problem:** The blog list injects unsanitized WordPress `excerpt.rendered` with `dangerouslySetInnerHTML` (`src/app/blog/page.js:161`), allowing compromised or malicious CMS content to execute on the app origin.

**Fix prompt:** Treat CMS HTML as untrusted; sanitize excerpts with an updated DOMPurify and a minimal tag/attribute allowlist before rendering, reject scripts/event handlers/unsafe URLs, and add malicious excerpt tests for `script`, `onerror`, SVG, CSS, and `javascript:` payloads.

## P1 — Required before wider rollout

### 6. Project owners can mutate arbitrary user records — HIGH

**Status:** ✅ Implemented — only platform admins can directly repair roles; UIDs must exist and role sets are capped.

**Problem:** An owner can submit arbitrary UID arrays as admins/team members, after which the server writes project roles into those users' documents without existence, consent, or size checks (`src/app/api/projects/[id]/route.js:635`, `:910`).

**Fix prompt:** Replace direct role assignment with verified invitations and acceptance; validate that each UID exists and is eligible, cap team size, prohibit owner transfer without acceptance/step-up authentication, use a transaction, and test attempts to target unrelated or nonexistent users.

### 7. Admin authentication needs one hardened authority — HIGH

**Problem:** Privilege is accepted from either a token claim or `users/{uid}.admin`, while tokens are verified without revocation checks, so stale tokens or mismatched privilege sources can retain sensitive access (`src/lib/auth-utils.js`).

**Fix prompt:** Centralize all route authentication; choose one canonical admin authority, use revocation-aware token checks on admin/payment/destructive routes, require MFA or recent reauthentication for admins, remove duplicate auth implementations, and test disabled users, revoked sessions, and admin removal.

### 8. Abuse and payload controls are incomplete — HIGH

**Problem:** Checkout, billing, support/Jira, applications, project writes, protected-link tickets, merch administration, and many admin routes lack shared rate limits or idempotency; the public merch limiter also trusts spoofable `x-forwarded-for` input.

**Fix prompt:** Add a shared server-side per-UID and trusted-IP limiter with endpoint budgets, `429`/`Retry-After`, idempotency keys for provider calls, maximum request sizes, and strict schemas that reject unknown fields and cap every string, URL, array, and fan-out operation.

### 9. Browser security headers are absent — HIGH

**Status:** ✅ Implemented — nonce CSP plus HSTS, anti-framing, MIME, referrer, and permissions headers.

**Problem:** No global CSP, HSTS, anti-framing, MIME-sniffing, or permissions policy is configured, increasing the impact of XSS and clickjacking.

**Fix prompt:** Add tested global headers: nonce-based CSP with `frame-ancestors`, HSTS, `X-Content-Type-Options: nosniff`, strict referrer policy, and a minimal Permissions-Policy; start CSP in report-only mode, inventory required Firebase/Polar/Resend origins, then enforce it.

### 10. Vulnerable dependency backlog — HIGH

**Status:** ✅ Runtime remediated — current Next/Firebase/Polar/DiceBear/sanitizer/image lines and patched gRPC are installed. Tailwind 3 still reports build-tool-only parser advisories; migrate it separately with visual regression testing.

**Problem:** The lockfile contains advisories beyond Next.js, including security-sensitive DOMPurify, Sharp, Firebase, and transitive networking/parser packages, with no automated dependency gate.

**Fix prompt:** Upgrade direct and transitive dependencies in controlled batches, run OSV/npm-compatible scanning against the production lockfile, triage reachability, remove unused packages, generate an SBOM, and enable automated weekly dependency PRs that must pass the full release suite.

### 11. The release test gate is currently red — HIGH

**Problem:** The production build, typecheck, lint, and all 5 Firestore rules tests pass, but 6 of 472 unit tests still fail; merch withdrawal now has coverage, but the full consent flow and a required pull-request CI gate are still missing.

**Fix prompt:** Repair or intentionally update every failing assertion; add required CI for clean install, typecheck, unit tests, Firestore emulator tests, production build, secret scan, and dependency scan; protect the production branch from red builds.

### 12. Production configuration can start partially broken — MEDIUM

**Problem:** Startup validation omits conditional essentials such as `NEWSLETTER_TOKEN_SECRET` and `RESEND_WEBHOOK_SECRET`, so enabled flows can fail or lose bounce/complaint protection in production.

**Fix prompt:** Extend production validation with feature-aware required variables, secret length/uniqueness checks, Firebase client/admin project consistency, exact Polar environment/product validation, and a deploy-time health check that fails before traffic is switched.

### 13. Public listing and third-party calls will degrade under load — MEDIUM

**Status:** ✅ Code implemented — bounded cursor discovery, bounded merch scans, caching, batched source reads, and outbound timeouts. The new Firestore index still needs deployment.

**Problem:** Project discovery and merch administration perform unbounded collection scans, merch notification fan-out is driven through repeated browser requests, and some external fetches lack bounded timeouts.

**Fix prompt:** Move discovery filters and cursor pagination into indexed Firestore queries, return only the public DTO, cache safe results, eliminate N+1 reads, and add abort timeouts plus limited retries only for idempotent calls to WordPress, Polar, Jira, Discord, and email providers.

### 14. Detection, recovery, and audit controls are not evidenced — HIGH

**Problem:** The repository shows console logging and mutable audit data but no verified alerting, immutable security trail, backup/PITR policy, restore drill, or incident runbook.

**Fix prompt:** Add centralized error/security monitoring and alerts for admin changes, entitlement mutations, webhook rejection/failure, auth anomalies, and 5xx spikes; enable Firestore backup/PITR, restrict audit-log writes, redact secrets/PII, document key compromise and payment incidents, and run a restore drill.

### 17. Merch withdrawal is broken and untested — HIGH

**Status:** ✅ Implemented — withdrawal atomically deletes the request and has focused regression coverage.

**Problem:** The signed leave-waitlist path uses `FieldValue.delete()` in `transaction.set()` without merge, which Firestore rejects, so users may be unable to withdraw consent or remove their request (`src/lib/merch-server.js:96`).

**Fix prompt:** Make withdrawal an atomic supported write that removes all personal/request data, invalidates every prior token, and suppresses queued merch mail; add focused tests for confirmation, replacement, expiry, tampering, replay, withdrawal, suppression, concurrent admin sends, rate limits, and Firestore TTL/rule behavior.

## P2 — Complete soon after rollout

### 15. Data retention and account lifecycle are undefined — MEDIUM

**Problem:** Expiry fields exist but the repository does not prove deployed TTL policies, complete user deletion/export, or retention limits for applications, confirmed merch requests, events, email records, and logs.

**Fix prompt:** Define retention per collection, configure and verify Firestore TTL where applicable, implement authenticated export/deletion with legal exceptions, cascade or anonymize references safely, and test deletion on a production-like backup.

### 16. A dormant verifier explicitly accepts unsigned webhooks — MEDIUM

**Status:** ✅ Implemented — the unused fail-open helper and its obsolete test were removed.

**Problem:** `src/lib/webhook-verification.js` returns success when the signature or secret is missing; it appears unused now but is a dangerous future integration trap.

**Fix prompt:** Delete the unused helper or make it fail closed in every environment except an explicit test-only stub; remove signature values from logs, use provider-supported verification, and add tests proving missing, malformed, replayed, or wrong-secret requests are rejected.

## Positive controls already present

- Firestore rules default-deny unknown paths and protect server-owned collections.
- The active Polar webhook route uses provider signature verification.
- Cron endpoints use a secret, and the Discord workflow uses constrained GitHub OIDC claims.
- Production build, static type checking, and lint complete successfully for this change set.

## Recommended order

Fix **1–5 immediately**, then **6–11 and 17 before inviting more customers**, then **12–16 before meaningful scale**. After P0/P1 remediation, repeat this review with staging penetration tests for horizontal/vertical authorization, payment-state transitions, webhook replay, XSS, and abuse limits.
