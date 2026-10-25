# 0030 — One page for the cited figures — requirements

Card: [#914](https://github.com/Sara-Managed-Projects/space-radar/issues/914).
The exit criterion is a page that lists every cited figure with its source and the day it was
read, linked from the site, so a reader can check the set in one place.
Filed by the daily improvement round of 11 Oct 2026. Nobody clicked it.

The round pointed at [#890](https://github.com/Sara-Managed-Projects/space-radar/issues/890)
through [#904](https://github.com/Sara-Managed-Projects/space-radar/issues/904), and at the
merged ladder edits [#908](https://github.com/Sara-Managed-Projects/space-radar/pull/908),
[#910](https://github.com/Sara-Managed-Projects/space-radar/pull/910),
[#911](https://github.com/Sara-Managed-Projects/space-radar/pull/911) and
[#913](https://github.com/Sara-Managed-Projects/space-radar/pull/913). Those issues put a page
and a day on one number each. This card is the index of that set.

## What is true today

Measured in this checkout (`3f2219e6`) and on the public site, Sun 25 Oct 2026. Times are UTC.
`registry/worlds.yaml` and `registry/ladder.yaml` are unchanged from `f2065e01`; the commit in
between is the 0029 spec.

- `https://www.spaceradar.ai/sources/` returned 200, `text/html`. The H1 is "Where every number
  comes from". The body has no `citations/` link. `https://www.spaceradar.ai/citations/` and
  `https://www.spaceradar.ai/citations/index.html` returned 404. The live sitemap contains
  `sources/index.html` and does not contain `citations`.
- `/sources/` is built by `sources_page()` in `scripts/seo_pages.py` from
  `registry/sources.yaml`. A row is a feed: licence, terms, the day the terms were recorded,
  and the day the saved copy was last read. It does not list a world's radius or a ladder
  distance.
- A world's `facts:` entry is `{source, read, says}`. `check_registry.py` refuses a fact with
  no https page, no `YYYY-MM-DD` day, or no `says`. That check runs only when `facts:` is
  present. A textured world with no `facts:` at all passes. `tests/test_refusals.py` already
  trips "a flat-coloured world with no page for its radius" and "a world fact with no day it
  was read".
- Walking `registry/worlds.yaml` for mappings that have `source` (an https URL), `read` and
  `says`: 121 facts, on 22 worlds. Pluto and the moons carry `radius` among them. Neptune's
  only fact is `seen`. The Sun, Earth, the Moon, Mercury, Venus, Mars, Jupiter, Saturn and
  Uranus have no `facts:` at all.
- Those nine worlds carry the citation in a comment above the row. Each comment names
  `radius_km is the volumetric mean radius`, a NASA NSSDCA fact-sheet URL, and a read day.
  Mercury, Venus, Mars, Jupiter, Saturn and Uranus also name `period_h` as the sidereal
  rotation period. The Sun's comment adds "IAU 2015 nominal solar radius". Days: Venus and
  the Sun `2026-10-12`; the other seven `2026-10-11`. Neptune's `radius_km` is 24622.0 and
  has neither a comment of that form nor `facts.radius`.
- The card in the browser does not read those comments or `facts:`. `scene/worlds.js` takes
  the source line from `COPY.worldFacts.cite`, which lists the flat worlds, and from
  `WORLD_CITE` for the rest.
- `registry/ladder.yaml` has 9 rungs. Each has `distance` and `distance_source`. Five include
  an https URL and `(read YYYY-MM-DD)`: moon, sun, neptune, pleiades, andromeda, all read
  `2026-10-11`. Four do not: proxima (`HYG v4.4 (Gaia parallax)`), galactic-centre and m87
  (`registry/exotics.yaml, Wikipedia infobox`), and edge (the Planck 2018 sentence in
  `distance_source`, no URL and no read day). The ladder panel prints `label` and `distance`.
  It does not print `distance_source`.
- The footer is `templates/sitelinks.html`, filled by `scripts/seo_footer.py`. It already
  links `/sources/`. `scripts/deploy.sh` ships whatever directories `pages-dirs.txt` names.
  `tests/test_seo_pages.py` expects that file to be about, accuracy, events, iss,
  planets-tonight, satellites, sources, starlink, teachers.

## Requirements

1. **R1 — the page is generated, and the corpus is these two lists.** `citations/index.html`
   is built by `scripts/seo_pages.py` from one function, `citation_rows()`. A row is either
   one `facts` entry on a world, or one ladder rung. The function is the only list. Hand-written
   rows in the HTML fail the test in A2.
2. **R2 — the nine comment citations become facts, and the comments go.** On the Sun, Earth
   and the Moon, add `facts.radius`. On Mercury, Venus, Mars, Jupiter, Saturn and Uranus, add
   `facts.radius` and `facts.rotation`. `source` and `read` are the URL and the day already
   in that world's comment. `says` for radius is `radius_km is the volumetric mean radius`,
   and the Sun's `says` also keeps `IAU 2015 nominal solar radius`. `says` for rotation is
   `period_h is the sidereal rotation period`. Delete those nine citation comments. Leave the
   Jupiter and Uranus ring comments, and leave Neptune's radius without a new fact.
3. **R3 — a rung without a page and a day stays on the page as a gap.** All 9 rungs are rows.
   A `distance_source` with an https URL and `(read YYYY-MM-DD)` links the URL and shows the
   day. Proxima, galactic-centre, m87 and edge are rows too, with the source string they have
   now, and the words "No page and no read date." The implementation does not look up a page
   for them and does not invent a day.
4. **R4 — the page is reachable from the three trust pages, and the footer stays.** About's
   "How to trust it" list, the Sources page's "Everything else" section, and the Accuracy
   page each link `citations/index.html`. `templates/sitelinks.html` is unchanged.
   `citations/index.html` is in the sitemap. `pages-dirs.txt` includes `citations`.
5. **R5 — the nine radii cannot fall back into a comment.** `check_registry.py` fails if any
   of the nine worlds has no `facts.radius`, and if any of the six with a cited period has no
   `facts.rotation`. The failure names the world id and the fact key. A fact that is present
   still has to pass the existing https / date / `says` checks.
6. **R6 — the implementation PR closes the card.** The spec PR does not. The implementation
   PR says `Closes #914`. Its comment notes that `/citations/` was 404 on Sun 25 Oct 2026,
   so the live site shows the page only after the next deploy. This card does not deploy.

## Acceptance criteria

- A1. After R2, `citation_rows()` returns 136 world rows and 9 ladder rows. The 136 are the
  121 facts already on the 22 worlds, plus 15 new ones (3 radius, 12 radius and rotation).
  A later fact changes the count; the test compares the page to the function, not to 145.
- A2. The built page has one `<tr id>` per row from `citation_rows()`. Earth's radius row
  links `https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html` and shows
  `11 October 2026`. Pluto's existing radius URL is on the page. Andromeda's row links
  `https://en.wikipedia.org/wiki/List_of_Messier_objects` and shows `11 October 2026`.
  Proxima's row contains `HYG` and the words "No page and no read date."
- A3. About, Sources and Accuracy link the new page. The sitemap lists
  `citations/index.html`. `pages-dirs.txt` includes `citations`. The sitelinks partial does
  not gain an item.
- A4. Deleting Earth's `facts.radius` fails `check_registry.py` with a line that names
  `earth` and `facts.radius` (R5). The case sits in `tests/test_refusals.py` beside "a world
  fact with no day it was read".
- A5. The page's title and description pass `scripts/check_seo.py` (title at most 60
  characters once the site suffix is applied, description 70 to 160). The visible page has
  no bare `#` plus an issue number. `/sources/` still lists feeds, not these rows.

## Out of scope

- Filling a page and a day for Proxima, Sagittarius A*, M87, the edge rung, or Neptune's
  radius. The page shows the gap. It does not open the fact sheet.
- `we_show` in `registry/ladder.yaml`, the feed table on `/sources/`, `CREDITS.md`,
  `docs/COVERAGE.md`, lab pages, model credits, and catalogue rows (stars, satellites,
  deep-sky objects, exoplanets). Those numbers are not this list.
- Rewriting `COPY.worldFacts.cite` or `WORLD_CITE`. The card keeps the source line it has.
- A new item in `templates/sitelinks.html`, the home page's no-script list, or
  `scripts/seo_footer.py`.
- Deploying the site. Issue #291 is the deploy lag.
