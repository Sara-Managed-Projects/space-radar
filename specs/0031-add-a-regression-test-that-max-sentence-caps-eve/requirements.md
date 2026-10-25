# 0031 — Every card sentence stays within 160 characters — requirements

Card: [#915](https://github.com/Sara-Managed-Projects/space-radar/issues/915).
[#906](https://github.com/Sara-Managed-Projects/space-radar/pull/906) held a glossary `say` to
`MAX_SENTENCE`. The exit criterion is a test that walks every registry string the card prints as
a sentence and shows each one is held to that cap, so the next field cannot ship without it.
Filed by the daily improvement round of 11 Oct 2026. Nobody clicked it.

## What is true today

Measured in this checkout (`3f2219e6`), Sun 25 Oct 2026. Lengths are the strings PyYAML returned
from `registry/`. No browser.

`MAX_SENTENCE` is 160 in `scripts/check_registry.py`. The source compares with `> MAX_SENTENCE`
in eight places. Seven of those have a refusal case in `tests/test_refusals.py`. The live values
are all inside the cap.

| Field | Longest | Refusal case |
| --- | --- | --- |
| `tours.yaml` card body, first sentence (split on `. `) | 159, `outer-solar-system/eris` | yes |
| `stars-notable.yaml` `why` | 151, 61 Cygni A | yes |
| `oddities.yaml` `fact` | 155, `shepard-golf-balls` | yes |
| `oddities.yaml` `cite` | 88, same row | yes |
| `oddities.yaml` `shape.departure` | 137, `voyager-golden-record` | yes |
| `sites.yaml` `doing` | 156, `copernicus` | yes |
| `glossary.yaml` `say` | 149, geostationary, 42 terms | yes, from #906 |
| `overlays.yaml` `what` | 88, `aerosol` | no |

#906's note said 36 glossary terms and a longest `say` of 142. That was 11 Oct. This checkout
has 42 terms and 149.

The card prints `why` as its own paragraph (`.sr-card__why`) for a star, an exotic, and a
deep-sky object. `WHY_KLASSES` in `site/js/ui/cardfacts.js` is that set. The comment there says
the paragraph is not sliced at 160. `cards.js` appends `whyLine()` with no slice. Stars are held
to 160 in the checker anyway. Exotics and hand-placed deep-sky objects are not, and the card
prints those lines in full.

`exotics.yaml` `why`, over 160: `wd-j1330-6435` 210, `sgr-1806-20` 207, `hulse-taylor` 207,
`grs-1915-105` 191, `psr-j1614-2230` 180, `3c-273` 176, `eta-carinae` 174, `3c-279` 166.
Eight of 23 rows.

`dso-hand.yaml` `why`: `ngc-2419` is 175. The second sentence retracts the first. It was thought
to be leaving the galaxy, and it is not. One of 99 rows. Its source line says read 2026-09-09.
`tests/test_dso.mjs` holds `why` to 160 only for the 31 objects whose distance source says read
2026-09-22, and those 31 are inside the cap. `ngc-2419` is outside that filter.
`tests/test_exotics.mjs` checks that every exotic has a `why`. It does not check the length.

`site/js/data/exotics.js` is the mirror (`scripts/gen_exotics_js.py`, and its `why` is what the
card prints). `site/data/dso.json` is the file the card reads. `check_registry.py` refuses a
hand-row `why` that differs from that JSON. `scripts/build-dso.py --refresh` rewrites the JSON
from the YAML and the JSON already in the tree. It does not fetch.

Could not look: the rendered cards. The path above is the source, not a page load.

## Requirements

1. **R1 — the seven existing sentence cases stay.** No second copy of those blocks in
   `tests/test_refusals.py`.
2. **R2 — exotic `why` and deep-sky `why` take the same cap.** `scripts/check_registry.py` holds
   `exotics.yaml` `why` and `dso-hand.yaml` `why` to `MAX_SENTENCE`, as it holds
   `stars-notable.yaml` `why`. The failure names the file, the row, the field, the length, and
   160. The deep-sky check still runs when the JSON line disagrees, so a mismatch cannot hide a
   long line.
3. **R3 — the nine long lines come down to 160.** The eight exotic rows and `ngc-2419` are each
   at most 160 characters. A second sentence that corrects the first stays. `ngc-2419` still says
   it is not leaving. Nothing is added that the old line did not say. Then
   `python3 scripts/gen_exotics_js.py` and `python3 scripts/build-dso.py --refresh`, and both
   `--check` runs exit 0. The implementation PR quotes each old line and the new one.
4. **R4 — one loop, ten fields, one past the cap.** A new list in `tests/test_refusals.py` has
   one row for each field in the table above, plus exotic `why` and deep-sky `why`. Each row
   replaces one real sentence that R3 did not rewrite with a sentence of length 161 that still
   meets that field's other rules: a full stop where the field requires one, no year in an
   overlay `what`, no phrase from `TIME_RELATIVE`, no `--`. The checker exits non-zero, and the
   output names that file and contains `160`. A refusal that names the file and does not contain
   `160` fails the row.
5. **R5 — 160 is still accepted.** One glossary `say` of length 160 is accepted. The operator
   in the checker stays `>`, the one the eight comparisons use.
6. **R6 — the loop and the comparisons are the same set.** The test counts `> MAX_SENTENCE` in
   `scripts/check_registry.py`. That count equals the number of rows in the loop. A comparison
   with no row fails. A row whose comparison was removed is accepted, and that row fails.
7. **R7 — CI runs the same file.** The step `python3 tests/test_refusals.py` keeps that command.
   Its name also says every card sentence is held to 160 characters
   ([#915](https://github.com/Sara-Managed-Projects/space-radar/issues/915)). No new job.

## Acceptance criteria

- A1. The seven existing sentence cases still refuse (R1).
- A2. A 161-character exotic `why` and a 161-character deep-sky `why` are refused, and the output
  contains `160` (R2, R4).
- A3. The nine lines in R3 are at most 160 characters, and both `--check` commands exit 0.
- A4. A glossary `say` of length 160 is accepted (R5).
- A5. The comparison count equals the loop length (R6). After this work that count is 10.
- A6. `python3 scripts/check_registry.py` and `python3 tests/test_refusals.py` exit 0, and the
  CI step name matches R7.

## Out of scope

- Titles, blurbs, and overlay titles. They have their own caps, 60, the blurb cap, and 40.
- `oddities.yaml` `note`. All 8 are over 160, the longest 747. The card's sentence is `fact`.
- `showers.yaml` `note`. The longest is 130, and it is copied into `site/js/data/showers.js`.
  No file under `site/js` prints it on a card.
- `ladder.yaml` `why`. It is the title of a button in `site/js/ui/explore.js`. The longest is
  193 (`edge`). It is not the card paragraph.
- `aliases.yaml` `why`. The longest is 274 (`jwst`). It justifies the row. The card does not
  print it.
- `rockets.yaml` `disputed_height`. Three values, the longest 86, spliced into the drawing line.
- The star `why` failure text, which says the card would cut the line. The why paragraph is not
  sliced. Leave that sentence. The 31-row filter in `tests/test_dso.mjs` stays too.
- A screenshot. `scripts/pr_pictures.py` does not list these paths.
- Changing `MAX_SENTENCE`, or slicing the why paragraph in `cards.js`.
