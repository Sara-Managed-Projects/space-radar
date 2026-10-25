# 0027 — The crawlable pages are already in the sitemap — requirements

Card: [#575](https://github.com/Sara-Managed-Projects/space-radar/issues/575). Filed by the daily
improvement round of 10 Oct 2026. Nobody clicked it. The exit criterion on the card is: every page
in the new crawlable set appears as a URL in sitemap.xml, checked by diffing the page list against
the sitemap.

The note on the card says the sitemap generator predates [#565](https://github.com/Sara-Managed-Projects/space-radar/pull/565).
The hook that lists those pages was added in that same pull request (`c9b3b158`).

## What is true today

Measured in this checkout (`2ffd2ea5`) and on the public site, Sun 25 Oct 2026.

- `sitemap()` in `scripts/build_seo.py` writes the home page, the press page, `embed/index.html`,
  every Lab page, every file in `site/t/`, and every object slug. It then appends the growth list
  from `scripts/seo_pages.py`: a page whose `in_sitemap` is set and whose path does not start with
  `o/`. The station's page and the forty system pages are `o/….html`, so they ride in with the
  object slugs. `iss/index.html` is built with `in_sitemap` false, and its canonical is the station page.
- A fresh build, `python3 scripts/build_seo.py --out /tmp/sr-0027/built --no-share --today 2026-10-25`,
  wrote 442 `<loc>` entries. `python3 scripts/check_seo.py --out /tmp/sr-0027/built` exited 0 and
  printed `SEO ok: 365 pages`. That 365 leaves out the Lab (77), the embed page and the press page.
  The sitemap includes them. Share pictures were not drawn.
- The card's set is 52 paths. All 52 are in that file:
  - `o/international-space-station.html`
  - `starlink/index.html`, `planets-tonight/index.html`, `teachers/index.html`, `embed/index.html`
  - `events/index.html` and the six ids in `registry/sky-events.yaml` (`leonids-2026`,
    `bepicolombo-mercury-2026`, `geminids-2026`, `quadrantids-2027`, `annular-eclipse-2027`,
    `total-eclipse-2027`)
  - `o/{slug}.html` for every system `seo_systems.systems()` returns (40)
- `iss/index.html` exists in the build and is not a `<loc>`. Fetched the same hour:
  `https://www.spaceradar.ai/o/international-space-station.html` and
  `https://www.spaceradar.ai/iss/index.html` each returned 200, `text/html`.
- Live `https://www.spaceradar.ai/sitemap.xml`: 442 URLs, `content-type: application/xml`,
  last-modified Wed 21 Oct 2026 18:59 UTC. The URL set matches the fresh build in both directions.
  `https://www.spaceradar.ai/build.json` is commit `d130190`, built Wed 21 Oct 2026 18:58 UTC.
- The same hour, these directory addresses returned 200 with no extra hop: `/starlink/`,
  `/teachers/`, `/iss/`, `/embed/`, `/events/`, `/planets-tonight/`. `/starlink` (no slash)
  redirected once to `/starlink/`. The sitemap names the `index.html` address, which is the
  canonical the pages declare. Those file URLs returned 200 as well (station, Starlink, planets
  tonight, teachers, embed, Leonids, TRAPPIST-1, Kepler-186).
- Same batch, not named on the card, and present in both sitemaps: `satellites/index.html`,
  `about/index.html`, `sources/index.html`, `accuracy/index.html`, `press/index.html`.
- `scripts/check_seo.py` already refuses an indexable built page whose `<loc>` was removed. The
  sentence is "is an indexable page and the sitemap does not list it". `tests/test_refusals.py`
  trips it with the case "a page the sitemap leaves out". `tests/test_seo_pages.py` and
  `tests/test_seo_embed.py` name the paths above.

[#1272](https://github.com/Sara-Managed-Projects/space-radar/pull/1272) (Fri 24 Oct 2026) changed
the Starlink page's title after the live deploy. The URL did not change. It is in the sitemap
that is up. This card does not deploy.

Could not look: Search Console. Nothing here measures which of these URLs a search engine has indexed.

## Requirements

1. **R1 — the card's set stays in the sitemap the builder already writes.** The set is the station
   page, `starlink/index.html`, `planets-tonight/index.html`, `teachers/index.html`,
   `embed/index.html`, `events/index.html`, every id in `registry/sky-events.yaml`, and
   `o/{slug}.html` for every system `seo_systems.systems()` returns. On 25 Oct 2026 that was 52
   paths. There is no new list of URLs in the repository. The doors stay `sitemap()` and
   `in_sitemap`.
2. **R2 — the station's alias stays out.** `iss/index.html` is built, its canonical is
   `o/international-space-station.html`, and the sitemap does not name it.
3. **R3 — the guard that already fires is the check.** No second sitemap walk.
   `check_seo.py` keeps the sentence "is an indexable page and the sitemap does not list it".
   The refusal case "a page the sitemap leaves out" stays.
4. **R4 — an empty diff closes the card.** The implementation turn rebuilds with `--no-share` and
   fetches the live sitemap. It diffs the set in R1, and it diffs the two full URL sets. If every
   path in the set is in both and `iss/index.html` is in neither, the pull request changes no
   script and closes [#575](https://github.com/Sara-Managed-Projects/space-radar/issues/575).
   The comment states both URL counts and the live file's last-modified time.
5. **R5 — a missing path is fixed in the existing door, or named as a deploy.** A path missing
   from the fresh build is added by `in_sitemap` or by the object-slug list, whichever door
   already owns that page. A path present in the fresh build and absent live is a deploy, and
   this card does not deploy. The issue comment says which. The issue stays open only in that case.

## Acceptance criteria

- A1. A fresh `--no-share` sitemap contains every path in R1 and does not contain
  `https://www.spaceradar.ai/iss/index.html`.
- A2. `python3 scripts/check_seo.py --out` that build exits 0.
- A3. The implementation PR records the live sitemap's last-modified time, the URL count, and
  `build.json`'s commit. On Sun 25 Oct 2026 those were Wed 21 Oct 2026 18:59 UTC, 442 URLs,
  commit `d130190`, and the URL set matched the fresh build.
- A4. If A1 holds, no file under `scripts/` or `tests/` changes, and #575 is closed.

## Out of scope

- Deploying the site. The Starlink title from #1272 waits for the next deploy. The URL is already listed.
- Rewriting `<loc>` from `index.html` to a trailing slash. Both forms answered 200 on 25 Oct.
  The canonical on the page is the `index.html` URL.
- The Lab, the trip pages, and the object pages that are not the station or a star system.
  They sit in the same 442. They are not this card.
- `satellites/index.html`, About, Sources, Accuracy, and the press page. Measured above, left
  on the doors they already use.
- Search Console, IndexNow, and `lastmod`.
- A hand-kept copy of the 40 slugs. They follow `seo_systems.systems()`.
