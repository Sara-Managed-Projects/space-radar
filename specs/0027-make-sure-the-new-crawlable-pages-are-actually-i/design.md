# 0027 — The crawlable pages are already in the sitemap — design

## What is wrong

The sitemap already lists the pages. The daily round saw [#565](https://github.com/Sara-Managed-Projects/space-radar/pull/565)
land the crawlable set and wrote that the generator was older than the batch. The growth hook is
in that same commit, `c9b3b158`.

```
seo_pages.build_pages
    in_sitemap, path not o/     -> growth list -> sitemap()
    o/international-space-station.html
    o/{system slug}.html        -> object slugs -> sitemap()
    iss/index.html              -> in_sitemap false
                                -> canonical is the station page

check_seo.py
    indexable built file        -> must be a <loc>
    alias (canonical is another sitemap URL, this URL is not)
                                -> skipped, not an error
```

On Sun 25 Oct 2026 a fresh `--no-share` build and the live sitemap had the same 442 URLs.
`check_seo.py` on that build exited 0. The 52 paths in R1 were present. `iss/index.html` was absent.

## What the next turn does

Rebuild, fetch, diff, then close or patch one door. No new writer.

1. `python3 scripts/build_seo.py --out <tmp> --no-share` from current `main`.
2. `python3 scripts/check_seo.py --out <tmp>`. Exit 0 is A2.
3. Fetch `https://www.spaceradar.ai/sitemap.xml` and `https://www.spaceradar.ai/build.json`.
   Record last-modified, the URL count, and the commit.
4. Diff R1's paths against both `<loc>` sets. Diff the two full sets against each other.
   Compare paths, not the count: a swapped pair keeps 442 and still fails R1.
5. Empty on both, alias absent: change nothing under `scripts/` or `tests/`. Close #575 with
   those figures.
6. A path missing from the fresh sitemap: if the page is an `o/` path, it belongs on the slug
   list in `build()`. If it is any other page in the set, `in_sitemap` on that `Page` is the
   door, and `build_extra` already copies those into `growth`. Do not append a literal URL in
   `sitemap()`. Re-run steps 1 and 2. Leave the refusal case in `tests/test_refusals.py` as it is.
7. A path in the fresh sitemap and not on the live file: do not deploy. Comment on #575 that
   the builder has it and the CDN file does not, with the `build.json` commit, and leave the
   issue open.

The set is derived, not copied. Event ids come from `registry/sky-events.yaml`. System slugs
come from `seo_systems.systems()`. Adding a system or an event moves the sitemap with the
registry. A frozen list of 52 strings would fail on the next system for no sitemap bug.

## Risks

- **The close is only as fresh as the rebuild.** This plan's empty diff is `2ffd2ea5` against
  the sitemap built Wed 21 Oct 2026. R4 runs the diff again. A commit in between that drops a
  path has to be fixed, not waved through on these numbers.
- **442 is not the set.** The Lab is 77 of those URLs, trips are 30, object pages are 318.
  Matching counts without matching the R1 paths would hide a miss inside the crowd.
- **The Starlink page on the CDN is the 21 Oct build.** #1272 changed the title on Fri 24 Oct
  and is not an ancestor of `d130190`. The URL in the sitemap is the one this card asked for.
  The words on the live page move at the next deploy, which is not this card.
