# Public impact report maintenance

The public impact page is `/impact`; its downloadable snapshot is `public/documents/go-impact-2026-10-17.md`. Public figures are limited to aggregate counts from the GO website's public project portfolio.

## Publication rules

- Verify project titles and statuses against the public portfolio before updating its snapshot.
- Treat completed, live and recruiting as current listing statuses. Do not imply that a completed listing proves a game release or a date of completion.
- Do not publish calendar schedules as attendance or internal task records as delivered outcomes.
- Do not publish visitor or usage totals unless they come from a verified analytics source with clear definitions and coverage.
- Keep private exports, names, meeting details, task descriptions and internal notes out of public files and website bundles.
- Give the portfolio data and downloadable report the same checked date, and describe any limitation that affects interpretation.

## Current snapshot

The public portfolio was checked on 17 October 2026. It lists 13 projects: seven marked completed, five live and one recruiting. The downloadable copy was reviewed on 18 October 2026.

Update `src/data/go-impact.json`, the public report and `/impact` together when the visible portfolio changes. Check that the public page and download contain only the approved aggregate portfolio data, then run the relevant site checks before committing.
