# 0027 — The crawlable pages are already in the sitemap — tasks

Issue: [#575](https://github.com/Sara-Managed-Projects/space-radar/issues/575). Spec only in this
PR. The sitemap already contains the set. The later turn confirms that and closes the issue.

- [ ] T1. From current `main`: `python3 scripts/build_seo.py --out <tmp> --no-share`, then
  `python3 scripts/check_seo.py --out <tmp>` (A1, A2). On Sun 25 Oct 2026, at `2ffd2ea5`,
  the build wrote 442 URLs and the check printed `SEO ok: 365 pages` and exited 0.
  Share pictures were skipped.
- [ ] T2. Fetch `https://www.spaceradar.ai/sitemap.xml` and `https://www.spaceradar.ai/build.json`.
  Diff the R1 paths against both `<loc>` sets, and diff the two full URL sets. Paths, not the
  count (R4, A3). On that same day the live file was last-modified Wed 21 Oct 2026 18:59 UTC,
  442 URLs, commit `d130190`, and the URL set matched the fresh build. `iss/index.html` was in
  neither.
- [ ] T3. If T1 and T2 are still empty and the alias is absent: do not edit `scripts/` or `tests/`.
  Close #575. The comment has both URL counts, the last-modified time, and the `build.json` commit (A4).
- [ ] T4. If a path is missing from the fresh sitemap: add it through the door in the design.
  Re-run T1. Do not add a walker. Do not edit the refusal case "a page the sitemap leaves out".
  Then close #575.
- [ ] T5. If the fresh sitemap has the path and the live file does not: do not deploy. Comment
  that on #575, with the commit, and leave the issue open (R5).

## Test list

No new test. The guard is already these:

`scripts/check_seo.py`, `tests/test_refusals.py`

1. "a page the sitemap leaves out" removes `o/europa.html` from a built sitemap and expects the
   refusal. It stays as written (R3).

`tests/test_seo_pages.py`

2. The station alias is absent. Starlink, the satellite hub, planets tonight, every system page,
   About, Sources, Accuracy, teachers, the events index and each event page are present.

`tests/test_seo_embed.py`

3. `embed/index.html` is a `<loc>`.
