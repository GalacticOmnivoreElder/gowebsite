# AURORA regression and test plan — Phase 1

## Baseline and result recording

Controlling baseline: 8 October 2026 AURORA run, 35 pages, 338 checks, 314 passed, 8 consolidated issue categories. Capture the comparable rerun date and browser, exact route, 375 px or desktop viewport, theme, console state, cache/warmth, and any test environment. Preserve failures with an element selector and screenshot. Do not treat aggregate pass counts as proof that every workflow works.

Run the existing checks named in `package.json`: lint, typecheck, `npm test`, and the production build. Follow any failure to root cause and distinguish pre-existing failures from regressions. Add only regression assertions tied to a confirmed issue.

## Local implementation validation — 17 October 2026

The user authorized the scoped AURORA work for local testing and a local commit, and explicitly asked not to push. The focused Playwright command is `node ./node_modules/@playwright/test/cli.js test --config=playwright.aurora.config.js`; all six checks pass. It covers filter names, the decorative profile marker, WordPress content at 360/375/768/1280 px, project loading geometry and CLS, Starter Pathway contrast, and the rendered-page security headers. The project fixture measured CLS 0.000 in three controlled Chromium runs.

Targeted local axe scans used seeded route data in dark and light themes. The reported `button-name`, `aria-prohibited-attr`, and contrast findings cleared on the sampled routes once content was settled. A complete comparison still depends on using the same production-equivalent page content and route data as the Aurora run; error states caused by unavailable local data were not used as release evidence. These scans do not replace keyboard and screen-reader review.

`npm run typecheck` passes. `npm run lint` exits 0 with 17 warnings in existing files. `npm run test:unit` reports 486 passing and five failing assertions in landing-page copy/presentation and subscription-cancellation coverage; these are outside the AURORA files changed here. A production build was not run because a Next.js dev server already uses this checkout's `.next` directory. No production environment, payment, account, form, or deployment checks were run.

## Regression cases

| Target | Method | Pass criteria |
|---|---|---|
| `/projects` controls | Axe `button-name`; inspect accessible names in browser accessibility tree; keyboard Tab, arrows, Enter, Escape; select each of the four values | Category, project type, status, and sort are accurately named before and after choosing a value. All options remain reachable and filters still work. No reported serious/critical name error. |
| Text contrast, 17 routes | AURORA/axe contrast plus computed-color sample in light and dark mode. Cover normal/large text, accent links and labels, badges, placeholder/status text, selected, hover, focus, disabled and error states. | WCAG AA 4.5:1 for normal text and 3:1 for qualifying large text and applicable UI states. Text remains distinguishable without color alone. No accidental contrast trade-off between themes. |
| `/user/<test-id>` profile | Axe `aria-prohibited-attr`, inspect the accessibility tree, keyboard traverse profile and test with a screen reader | No prohibited ARIA; the marker is either excluded as decoration or announces a true, useful status. Profile remains navigable. |
| `/project/<published-test-id>` | Repeat cold-cache Chromium desktop/mobile measurements; record `layout-shift` entries, LCP and screenshots; compare before/after | Root cause is attributed to a named element. Three comparable post-fix runs have CLS ≤0.10; no material LCP regression; loading and final layouts remain intact. Record lab-only result. |
| Named Glagolitic post | Test at 360, 375, 390 and 768 px and a desktop width; inspect `scrollWidth`, bounding boxes, images, frames, tables, code and floats. Use only sanitized fixture content. | No document-level sideways overflow; wide tabular/code content remains readable with local scrolling; images and embeds fit. Another representative post is checked. |
| Security response surface | Read-only GET/HEAD of the apex and www landing page, one rendered route, `/api/go-events`, a JS/CSS asset and a legitimate open/download route. Record status, MIME and headers. | Correct HTTPS and MIME behavior; active CSP, `DENY`/`frame-ancestors`, `nosniff`, HSTS and other intended headers on their applicable routes. No unexpected asset failures. |
| CSP journeys | On a protected preview, inspect console and Network policy violations while testing Firebase login and account pages, member event gate, Polar sandbox hand-off without completing a paid transaction, YouTube and analytics consent states. | No unexplained enforced-policy block. Never send a real payment or change a real membership to validate CSP. |
| Public website regression | Browser smoke on the report's 35-route map plus representative project, article, home, events, membership and profile pages. Compare route opening, headings, links, image loading and script errors. | No introduced broken route, image or script error; public navigation and page-specific behavior remain functional. |
| Keyboard and manual accessibility | Tab and Shift+Tab through changed paths, focus visibility, native/compound widget operation, zoom and contrast; NVDA or equivalent on changed controls and profile. | Logical order, visible focus, readable zoom, usable select controls and truthful status. Automated results are not represented as complete WCAG conformance. |

## Protected workflow coverage gaps

The AURORA report explicitly kept nine changing operations out of production checks; it also did not test authenticated or admin pages. If credentials and staging facilities exist, cover:

- Anonymous, authenticated non-member, active Community member, expired/cancelled-through-paid-period member, and admin authorization results.
- Sign-up and login success/failure; password-reset delivery only to a controlled test inbox; profile read/update.
- Polar sandbox checkout and signed webhook replay with an isolated test user; verify entitlement and idempotency with no customer data.
- Project create/edit/delete and registration only against disposable staging records.
- Contact/newsletter submission using a controlled inbox and documented test record.
- Event registration, administration and notifications only after the event feature exists and a separate GOHQ implementation scope is approved.
- Production-safe authenticated read journeys with a test account where one is explicitly designated; no production mutation, payment, mail or appointment.

If staging or a test account is missing, mark that journey unverified and provide the concrete setup needed. Never copy production user records into an unsafe environment or put account credentials in source, fixtures or logs.

## Comparison report

For each of the eight findings record: old report value, reproducer, current status, root cause, changed files and deployed revision, rerun evidence, and any limitation. Give the raw contrast sample and measured timings alongside totals. Compare speed metrics only for the same route, region, browser version, viewport and cache condition. A locally measured CLS is a lab result, not real-user Core Web Vitals field data.
