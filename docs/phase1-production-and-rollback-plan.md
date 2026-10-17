# AURORA production and rollback plan — proposed Phase 2

## Current delivery path

Vercel serves the Next.js 16 application on Node 24. The checked-out branch is `prod`; production Git integration has a `READY` deployment on `92e1744468a4030e265487661f27c1d94a2ff57d` from 10 October 2026, and Vercel lists the previous production revision as a rollback candidate. The current Vercel project reports domains `galacticomnivore.com` and `www.galacticomnivore.com`. This Phase 1 assessment did not trigger a deployment, promotion, rollback, or configuration change.

The repository has scheduled GitHub Actions for Discord synchronization and Resend outbox processing but no general quality-gate workflow. Existing build/test commands are in `package.json`. Production automatic deployment is associated with `prod`; confirm branch protection and any Vercel deployment protection in the release review. Do not push incomplete work directly to the live production branch as a substitute for staging validation.

## Release steps

1. Keep the implementation to approved AURORA backlog tasks. Protect the pre-existing GO impact changes; do not include them in the AURORA change set unless the owner asks.
2. Review a clean, focused diff and run the existing suite, typecheck, lint, accessibility checks, production build and targeted browser tests from the test plan.
3. Publish a non-production Vercel preview from the reviewed commit. Confirm it does not import production-only secrets or touch production data. Exercise the applicable user journeys and inspect deployment/build logs.
4. Capture preview response headers and resource MIME behavior. Repeat accessibility and viewport checks on the precise preview commit.
5. Verify that the exact tested revision is the revision selected for production. Record it and the prior ready deployment/rollback candidate before release.
6. If branch protections and the repository's normal `prod` integration require a PR or maintainer release, follow that process. Promote or merge only using the approved deployment path and only after all gates pass.
7. Confirm production readiness, domain assignment and deployment completion in Vercel. Smoke-test route delivery, response headers, image/CSS/JS assets, and safe public pages. Inspect current deployment logs and monitoring for newly introduced errors. Use read-only checks only for production forms, billing and accounts.

## Go/no-go criteria

Stop release for a confirmed serious/critical accessibility regression, unexplained CSP failure, missing required security header, non-working primary public journey, content clipped on mobile, repeatable CLS above 0.10 after the approved fix, a failed production build, missing required configuration, unexpected writes/charges, unreviewed scope, or an untested exact revision. Record and resolve the issue before scheduling a new release attempt.

## Rollback

Record the active deployment identifier and its known-good predecessor immediately before production. On a significant outage, security-header/CSP breakage, broken authentication, payment failure, or serious layout/accessibility regression caused by the release, use Vercel's audited rollback to the recorded prior known-good deployment, confirm the production domain serves it, then run page, response-header and safe workflow smoke checks. Inspect deployment/runtime logs and preserve the failed deployment for diagnosis.

Rollback does not reverse irreversible data changes or schema migrations. This AURORA scope proposes neither. If an implementation revision creates a data migration, production writes, or incompatible schema, halt release and prepare a migration-aware recovery plan before running it. Do not delete deployment artifacts, disable policy controls, alter DNS, or roll back unrelated production systems as an improvised recovery step.

## Completion record

The eventual final report must include repo/branch, reviewed PR or merge reference if used, commit SHA, Vercel deployment identifier and status, canonical production URL, deployment time, header evidence, browser smoke result, error scan, remaining limits and exact rollback reference. A successful build is not a successful release.
