# GO impact report: evidence register and maintenance

The public report is `public/documents/go-impact-2026-10-17.md`; the page is `/impact`. Headline data is in `src/data/go-impact.json`; the dated portfolio contains only public IDs, titles and statuses.

## Source register

- User-supplied statute: the user-supplied consolidated statute PDF. Page 1 was text-extracted and rendered. It states 20 August 2025 and identifies the text as consolidated. An exact founding date remains unresolved.
- Completed Jira archive, tab `29.01.2025`, header A1:EZ2, populated data A2:W640: 637 distinct Done issue records.
- April Jira export, tab `Jira Export CSV (all fields) 20250429124307`, populated data A2:W113: 110 open issues, no completion evidence.
- April 2025 pitch. Its mission and creator journey inform the public adaptation. Historical member/project/event counts, market assertions, funding asks, forecasts and prices are not treated as verified current facts.
- GO Core Team, GO Meetings, GO Events, GO Weekly Community Meetings: paginated calendar searches for 17 October 2023–17 October 2026, Europe/Warsaw; four terminal pages. A separate 2022–17 October 2023 search returned no entries.
- [Public project endpoint](https://www.galacticomnivore.com/api/projects?status=all&limit=100): 13 distinct IDs, `hasMore=false`, read 17 October 2026.

## Private reproducibility

Connector exports and the statute extraction are kept under ignored `tmp/kpi/`. Do not move those raw exports into `public/` or commit them.

Run `node scripts/audit-go-impact.cjs tmp/kpi` to reproduce the private audit summary and review queue. The script requires completed calendar and portfolio pagination. It deduplicates invitations, excludes all-day/undated events, uses a conservative title classifier, and reports ambiguous records separately. It selects Jira completions by resolution date and separates epics from tasks/stories/subtasks.

Final calendar reconciliation: 944 source rows, 40 duplicate copies, 904 unique entries; 263 meetings, 217 needing review, 424 other exclusions. Shared organizational schedules do not establish personal attendance. Four all-day entries were excluded during final date validation, correcting the provisional 267 count.

## Updating

1. Read and reconcile new records privately; retain source dates and pagination evidence.
2. Re-run the audit and review changes in deduplication, date handling and eligibility.
3. Update the aggregate JSON, dated public portfolio and report together. Keep source-specific coverage visible.
4. Verify homepage, About/footer links, `/impact`, report download, mobile overflow and sitemap. Run the audit tests and relevant page checks.
5. Publish only aggregate data and already-public project information. Do not expose meeting links, participants, task descriptions or internal notes.

A fresh founding document, post-January-2025 Jira completion export, project completion dates and verified website analytics will resolve the documented gaps.

Exact internal source URLs are retained only in the ignored local source register.
