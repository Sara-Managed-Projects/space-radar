# 0030 — One page for the cited figures — tasks

Issue: [#914](https://github.com/Sara-Managed-Projects/space-radar/issues/914). Spec only in this
PR. The later turn moves nine comments into `facts`, builds `/citations/`, and closes the issue.

- [ ] T1. In `registry/worlds.yaml`, add `facts.radius` on the Sun, Earth and the Moon, and
  `facts.radius` plus `facts.rotation` on Mercury, Venus, Mars, Jupiter, Saturn and Uranus.
  URL, day and `says` are R2. Delete the nine citation comments. Leave Neptune's radius, and
  leave the Jupiter and Uranus ring comments (R2).
- [ ] T2. Add `citation_rows()` and `citations_page()` in `scripts/seo_pages.py`. Call the page
  from `build_pages()`. Row ids, cells, the gap sentence, the H1, the lead, the JSON-LD and
  the share `Spec` are the design steps 2 and 3 (R1, R3, A1, A2).
- [ ] T3. Link `citations/index.html` from About ("How to trust it"), Sources ("Everything
  else") and Accuracy. Words: "The cited figures". Do not edit `templates/sitelinks.html`
  (R4, A3).
- [ ] T4. `check_registry.py` fails when one of the nine worlds has no `facts.radius`, or one
  of the six has no `facts.rotation`. The line names the id and the key. The missing-`facts`
  return must not skip that check (R5).
- [ ] T5. `tests/test_seo_pages.py`: the built page's `<tr id>` count equals
  `len(citation_rows())`; Earth, Pluto, Andromeda and Proxima match A2; the three trust pages
  link the new page; the sitemap contains `citations/index.html`; `pages-dirs.txt` includes
  `citations`. Description length stays inside `check_seo.py` (70 to 160). No bare issue
  number on the page (A2, A3, A5).
- [ ] T6. `tests/test_refusals.py`: a case that deletes Earth's `facts.radius` and expects the
  new failure line (A4).
- [ ] T7. Implementation PR body includes `Closes #914`, and says `/citations/` returned 404
  on Sun 25 Oct 2026 so the live site changes at the next deploy (R6). This spec PR does not
  close the issue.

## Test list

1. `citation_rows()` against `registry/worlds.yaml` and `registry/ladder.yaml`. On Sun 25 Oct
   2026, after T1, that is 136 world rows and 9 ladder rows. A new fact moves the count; the
   page has to move with it.
2. Built `citations/index.html`: Earth's fact-sheet URL and `11 October 2026`; Andromeda's
   Messier URL and the same day; Proxima shows `HYG` and "No page and no read date."; no link
   whose href was invented for Proxima.
3. About, Sources and Accuracy each contain `citations/index.html`. The sitemap does too.
   `pages-dirs.txt` contains `citations`. `templates/sitelinks.html` has no new href.
4. Refusal: Earth's `facts.radius` removed. `check_registry.py` names `earth` and
   `facts.radius`. The existing case "a world fact with no day it was read" still fails on a
   fact that has a page and no day.
5. `/sources/` still has one row per feed from `registry/sources.yaml`. The citations page
   does not replace that table.
