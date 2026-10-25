# 0024 — Re-sync the generated star systems — tasks

Issue: [#562](https://github.com/Sara-Managed-Projects/space-radar/issues/562). Spec only
in this PR. Implementation is a later turn. Nobody clicked the card; it was filed by the
daily improvement round on 9 Oct 2026.

- [ ] T1. `scripts/build-exoplanets.py`: `--systems-only <YYYY-MM-DD>` pulls the listed
  hosts and writes `registry/systems-columns.csv` with the slim columns added (R1, R2, R3).
  A missing host exits before the write. The existing `--pull` path still writes both
  files and is not what the schedule calls.
- [ ] T2. `scripts/build-systems.py`: read the planet and star numbers from the side
  file. Drop the same-date requirement against the csv. Refuse a planet the csv does
  not have. Leave `HZ_FORMULA` alone (R1, R4).
- [ ] T3. Tests for A1–A5. Fixture under `tests/fixtures/`, no socket.
  `tests/test_systems_table.mjs` and `tests/test_seo_pages.py` follow the row (R9).
  `tests/test_exoplanets.mjs` keeps the csv date pin.
- [ ] T4. `.github/workflows/star-systems.yml` as the design describes (R5–R8, A6, A7).
  Do not dispatch it in this implementation PR. The schedule starts when the PR is on
  `main`.
- [ ] T5. In the implementation PR, re-fetch
  `https://www.spaceradar.ai/js/data/systems-table.js` and `data/v1/index.json` and
  write the dates you got. As of this plan: stage date `2026-10-08`, last-modified
  13 Oct 2026 10:40 UTC; snapshot fetched 21 Oct 2026 18:17 UTC, 6451 items. If either
  fetch fails, write "could not look". Do not deploy.

## Test list

`tests/test_build_systems_pull.py` (new; name it to match the directory's style)

1. `test_systems_only_writes_the_side_file_and_not_the_csv` — A1.
2. `test_systems_only_refuses_a_planet_missing_from_the_csv` — A2.
3. `test_systems_only_refuses_a_missing_host` — A3.
4. `test_build_systems_stamps_the_side_file_date` — A4, through `generatedLine`'s date
  field on the yaml (`as_of`), and `gen_systems_more_js.py --check` after the write.

`tests/test_systems_table.mjs`

5. `SYSTEMS_AS_OF` matches every generated system, and the drawing line includes it.
6. Zone copy and `knownLine` follow the row. No literal `1.17` and no required "inside"
  for Kepler-186 f.

`tests/test_seo_pages.py`

7. The Kepler-186 sentences are `first_sentence` of the rows just built (A5).
