# AURORA technical implementation design — Phase 1

## Architecture assessment

The application is a Next.js App Router project (`next@16.4.0`, React 18) with JavaScript/JSX and Tailwind CSS. `src/globals.css` defines shared HSL tokens with `.dark` theme variables. Reusable controls live under `src/components/ui`; route components mix shared controls and local styling. The Projects filters use Radix Select; the member profile renders through the MissionHub component. The blog detail route sanitizes WordPress markup and applies shared WordPress-content CSS. Project detail data is fetched client-side. The precise live environment and browser-computed DOM still need preview testing.

Firebase Auth validates bearer tokens. Server-side Firestore records provide user and product data. `src/lib/auth-utils.js` resolves the active membership and role from the verified user and subscription state. Polar owns checkout and subscription webhooks. Discord OAuth/account linking and role synchronization have separate server-only code. Resend outbox infrastructure handles existing mail. Google Calendar is the public event source of truth; a separate, optionally credentialed calendar holds members-only meeting URLs. Google Calendar appointments are the existing public visit scheduler. No evidence in this review established an active third-party scheduling backend beyond that official link.

Vercel serves the Next.js project with Node 24. `next.config.js` defines `nosniff`, clickjacking defense, HSTS, Referrer-Policy, and Permissions-Policy. `src/proxy.js` sets a page CSP with a per-request nonce and `frame-ancestors 'none'`. Existing GitHub Actions workflows run Discord synchronization and the mail outbox; there is no workflow for lint, tests, accessibility or release checks in `.github/workflows`.

## Approved-change candidates

**Shared visual styles.** Sample each contrast failure in its actual foreground/background pairing, theme, typography and interaction state before changing tokens. In the dark theme the primary foreground can miss 4.5:1 on near-black; light theme text, dark theme text, borders, decorative fills and primary-button foreground serve different jobs. If the shared primary fill remains appropriate, create a semantic high-contrast text treatment for small text rather than recoloring decorative fills globally. Check the 17 listed routes before and after.

**Controls and semantics.** Retain the existing Radix controls and keyboard behavior. Give the four affected triggers persistent labels that describe their actions even after selection. For the profile marker, choose semantics from the actual information available in the profile; do not announce an inferred “online” state unless the application verifies it. Use built-in, existing accessibility tooling where possible.

**Responsive post content.** Preserve sanitization and article styles. Constrain the element proved to overflow, including imported WordPress content that is wider than its column. Allow local horizontal scrolling for data that needs its intrinsic width. Do not rely on page-wide overflow clipping to conceal content.

**Project-detail stability.** Capture Performance API or browser layout-shift entries under reproducible cold-load and warm-load conditions. Separate network, font, image and data changes from viewport, cache and third-party effects. Reserve dimensions for the element that causes layout movement. Avoid speculative media refactors before identification.

## Security configuration review

Preserve the present `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, HSTS, Referrer-Policy and Permissions-Policy unless a reproducible product journey demonstrates a requirement. Confirm response behavior after deployment instead of assuming source configuration proves it.

The current CSP allows self-origin assets, Google API/Firebase connections, Clarity, a Bing connection, YouTube frames, Polar form destinations, nonce-authorized scripts and inline styles. It is enforced on matching pages. Exercise representative application journeys, especially Firebase OAuth/account operations, Polar checkout hand-off and the YouTube embeds, before relying on this policy. Record console CSP violations in preview. If a narrow exception is needed, scope it to the observed directive, endpoint and purpose. API/static bypass is a separate response-surface question; do not claim an HTML-page policy provides equivalent protection for every file type.

No CSP, payment, authentication, cookie, database, deployment or DNS change is necessary to implement the identified accessibility fixes. Any expansion requires fresh assessment and explicit inclusion in the approval scope.

## Proposed code areas

| Area | Candidate files | Planned behavior |
|---|---|---|
| Project filter names | `src/app/projects/page.js` and, if needed, the existing Radix wrapper in `src/components/ui/select.jsx` | Give filters and sort stable, correct accessible names. Keep selected value and keyboard behavior. |
| Accent contrast | `src/globals.css`; only affected page/component classes after sampling | Meet WCAG 2.2 AA text contrast in both themes while retaining brand color for appropriate use. |
| Profile marker | `src/components/profile/MissionHub.jsx` | Use truthful status semantics or make the indicator decorative. |
| Project-page shift | `src/app/project/[id]/page.js`, dependent project media component only after profiling | Reserve space or avoid the verified source of movement. |
| Article overflow | `src/globals.css`; the specific safe content renderer if profiling proves it necessary | Fit media to the article and keep wide data usable on mobile. |
| Regression workflow | Existing package scripts and `.github/workflows` only if separately accepted | Gate changes on maintainable deterministic quality checks without credentials in untrusted jobs. |

## Proposed dependencies and infrastructure

No production dependency, service, database, environment variable, subscription, or hosting plan change is proposed. `package.json` already includes Playwright. During implementation, check whether `axe-core` or an approved wrapper is already locally available. If no maintainable axe route exists, propose a pinned development-only accessibility test dependency in the reviewable diff and approval matrix before adding it. Keep tests deterministic and scoped to representative routes. Do not introduce a new monitoring provider or AURORA subscription for this work.

## Core use case and safeguards

Public browsing, forms, sign-in, memberships, and project listing remain unchanged. Accessible labels preserve existing select choices. Token adjustments preserve brand styling while making affected small text legible. Profile status is announced only if backed by real product state. Media sizing must retain aspect ratio. The existing nonce and header configuration must continue to permit legitimate auth, billing, video and analytics. Verify all changes with the [test plan](phase1-aurora-test-plan.md) before production release.
