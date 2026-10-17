# AURORA QA assessment — Phase 1

**Prepared:** 2026-10-17
**Decision:** Phase 1 analysis is complete. The scoped implementation and release plan below are ready for explicit approval. No application code, dependency, deployment setting, database, or production service was changed during this assessment.

## Evidence reviewed

The three supplied HTML documents were read in full:

- `D:/DOWNLOADS/CUsersbojkosourcereposdbojkovskiAuroraTestReportsstudio-20261007-224459-557-374client-report.html` — 7 October run; 35 pages, 295 checks, 275 passed, 4 issue categories, and 0 blockers.
- `D:/DOWNLOADS/CUsersbojkosourcereposdbojkovskiAuroraTestReportsgalacticomnivore-client-quality-report.html` — preview of the same 7 October run; 304 checks shown because it includes nine state-changing checks that the executed read-only run deliberately omitted. It describes 20 failed page-level results, not 20 independent root-cause defects.
- `D:/DOWNLOADS/CUsersbojkosourcereposdbojkovskiAuroraTestReportsgalacticomnivore-client-report-with-speed-security.html` — 8 October run and controlling baseline; 35 pages, 338 checks, 314 passed, 8 consolidated issue categories, 0 reported release blockers. Nine actions that could change live data were deliberately excluded.

The 7 October figures are not contradictory: its preview adds the nine checks that were not run. The accessibility sample found 19 failing pages. The later report consolidates repeated contrast observations into a single issue, then adds security and performance coverage. A passing public, read-only automated run is not a security certification, a review of authenticated pages, or proof that real form, email, billing, and administrative workflows work. AURORA also notes that automated accessibility results need manual follow-up.

Repository review covered the current Next.js configuration, route and component source, Firebase authorization and membership logic, Polar billing integration, existing Discord OAuth link and server synchronization, Google Calendar events and visitor booking, Resend mail, event tests, deployment workflows, and the working tree. The latest local change is the committed `prod` commit `7b40018`; the workspace also contains pre-existing uncommitted changes in the GO impact feature. They are user work and are outside this assessment's changes.

The current Vercel project is Next.js on Node 24. Its latest listed production deployment is `dpl_DcmjWkz3iemEwM9HngMuvJmTABev`, state `READY`, on branch `prod` at `92e1744` (10 October), with the site domains assigned. Vercel reports a prior production deployment as a rollback candidate. This proves deployment metadata, not the response headers, runtime health, customer journeys, or rollback outcome; those checks remain in the release gate.

The public site was opened read-only. Its home page already links to the Google Calendar appointment scheduler and says visits are by appointment. This does not establish scheduler availability, configured visit categories, or verified bookings. No protected workflows were exercised.

## AURORA finding status

| ID | Reported issue and AURORA severity | Current evidence and independent status | Engineering priority |
|---|---|---|---|
| AURORA-01 | Projects controls lack accessible names; High, four controls | **Partially confirmed.** Four Radix select triggers in `src/app/projects/page.js` have no stable, action-specific accessible labels. Their current `SelectValue` placeholders are visible text, so the reported empty-name result cannot be confirmed from source alone; the accessible name must be checked in a rendered page. | P1 |
| AURORA-02 | Text contrast; Medium, 89 elements on 17 routes | **Partially confirmed.** The same primary color (`326 71% 46%`) is used in both themes; its foreground-to-near-black contrast is approximately 3.84:1, below 4.5:1 for normal text. This is a plausible shared cause for small accent labels, especially on dark events surfaces. The 89 elements and every light/dark combination have not been independently sampled. | P1 |
| AURORA-03 | Anti-clickjacking header missing; Medium | **Already resolved in repository and deployed commit; production response check outstanding.** `next.config.js` sends `X-Frame-Options: DENY`; `src/proxy.js` sends CSP `frame-ancestors 'none'` for matching pages. The October 10 production revision includes the header configuration. No live header capture was taken in this phase. | P2 verification |
| AURORA-04 | Content-Security-Policy missing; Medium | **Partially resolved.** `src/proxy.js` sets an enforced page CSP. It uses a nonce and `strict-dynamic` for scripts; the policy is not present in the proxy matcher for API/static/image routes, which must be distinguished from document routes when comparing with the report. Production behavior and first-party integrations still need verification. | P1 verification |
| AURORA-05 | `X-Content-Type-Options: nosniff` missing; Medium | **Already resolved in repository and deployed commit; production response check outstanding.** `next.config.js` sets `nosniff` for `/:path*`. Confirm normal page, asset, download, and API responses in production. | P2 verification |
| AURORA-06 | Prohibited ARIA attribute at `.bottom-1`; Medium | **Confirmed.** `src/components/profile/MissionHub.jsx` applies `aria-label` to a generic status-marker `<span>` with no permitted semantic role. Review the surrounding visible status before making the marker decorative or exposing it as a labelled status. | P1 |
| AURORA-07 | Project-detail CLS 0.36 against 0.10 budget; Medium | **Requires further investigation.** The project detail page fetches data client-side and displays a loading state; a shift is plausible. The report does not identify the shifted node and the precise CLS has not been reproduced. Identify layout shifts and measure on a cold load before choosing a fix. | P2 |
| AURORA-08 | Glagolitic blog page overflows by 11 px at 375 px; Low | **Partially confirmed.** Blog content is WordPress-rendered HTML. `src/globals.css` constrains images, but embedded content and wide blocks can still exceed the content column. The exact overflowing node has not been isolated. Check both the named post and other article examples. | P3 |

“Already resolved” here means the reviewed repository and the source revision named in Vercel's deployment record contain a plausible fix. It does not claim the corresponding live HTTP responses or all integrated journeys have passed verification.

## Executive assessment

The October 8 test passed the core public-page, link, image, browser-validation, and JavaScript-error checks it ran, with no release blockers reported. There are two confirmed remediation areas to address in source (the profile marker semantics and likely low-contrast text in the dark theme), two reports that need rendered-page confirmation (the Projects trigger names and blog overflow), and one project-detail performance issue whose cause is unknown. Three requested security headers now have corresponding code in the latest production revision; their live responses are not yet independently verified.

The AURORA remediation is bounded to those eight categories. The appropriate change is to fix the actual shared color or content rule once identified, give controls stable action names, expose profile status accurately, reserve space for the content that produces CLS, and constrain only the specific WordPress block responsible for the mobile overflow. The headers need route-specific production checks and integration regression checks. No broad visual redesign or security-policy change is proposed.

The separate GOHQ and events request is a substantially larger product build. The website already has the right platform foundations—Firebase Auth and Firestore, server-side Polar entitlement lookup, Discord OAuth linking, Google Calendar-sourced public and protected events, a Google appointment calendar, admin routes, a dashboard, a custom event view, and Resend outbox email. It has no verified implementation of the specified GOHQ access policy, event-specific registration, recurring programme records with immutable occurrences, atomic external Game Jam quotas, submissions, selections, or event archives. That work is designed in the companion Phase 1 documents; it is not included in the AURORA QA changes.

## Remaining approval gate

Please review the change matrix in [Phase 1 approval matrix](phase1-aurora-approval-matrix.md), then authorize the defined implementation scope and production release. AURORA's supplied prompt expressly says to stop after the analysis until explicit approval. The companion GOHQ documents are design deliverables; they do not silently add the broader event platform to the AURORA release. See [GOHQ PRD](phase1-gohq-prd.md) and [implementation and acceptance plan](phase1-gohq-implementation-qa-plan.md) for its separate scope and business decisions.
