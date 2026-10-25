# 0024 — Re-sync the generated star systems — tasks

Issue: [#562](https://github.com/Sara-Managed-Projects/space-radar/issues/562). Shipped on
main in [#1280](https://github.com/Sara-Managed-Projects/space-radar/pull/1280). These boxes
were still open, so the issue stayed in progress.

- [x] T1. `scripts/build-exoplanets.py`: `--systems-only <YYYY-MM-DD>` pulls the listed
  hosts and writes `registry/systems-columns.csv` with the slim columns added (R1, R2, R3).
  A missing host exits before the write. The existing `--pull` path still writes both
  files and is not what the schedule calls.
- [x] T2. `scripts/build-systems.py`: read the planet and star numbers from the side
  file. Drop the same-date requirement against the csv. Refuse a planet the csv does
  not have. Leave `HZ_FORMULA` alone (R1, R4).
- [x] T3. Tests for A1–A5. Fixture under `tests/fixtures/systems-tap.csv`, no socket.
  `tests/test_systems_table.mjs` and `tests/test_seo_pages.py` follow the row (R9).
  `tests/test_exoplanets.mjs` keeps the csv date pin (`2026-10-08`).
- [x] T4. `.github/workflows/star-systems.yml` as the design describes (R5–R8, A6, A7).
  It was not dispatched. No runs are recorded. The Wednesday 06:41 UTC schedule starts
  from main, where #1280 landed.
- [x] T5. Re-fetched on 25 Oct 2026, after #1280 merged.
  `https://www.spaceradar.ai/js/data/systems-table.js` still says `2026-10-08`,
  last-modified 13 Oct 2026 10:40 UTC. `data/v1/index.json` shows
  `nasa-exoplanet-archive` fetched 21 Oct 2026 18:17 UTC, 6451 items, valid until
  28 Oct 2026 18:17 UTC. The public date moves after the scheduled pull and a later
  deploy. This did not deploy.

## Test list

`tests/test_build_systems_pull.py`

1. `test_refresh_and_offline_generation` — A1 and A4. A changed Kepler-186 f radius
   rewrites the generated files, stamps the side-file date, leaves the bundled csv
   byte-identical, and the browser test passes against those outputs.
2. `test_new_planet_writes_nothing` — A2.
3. `test_missing_host_writes_nothing` — A3.
4. `test_no_period_writes_nothing` and `test_binary_drift_writes_nothing` — R4.
5. `test_schedule_and_scope` — A6 and A7's branch door.
6. `test_issue_deduplicates_and_recovers` — R7.

`tests/test_systems_table.mjs`

7. `SYSTEMS_AS_OF` matches every generated system, and the drawing line includes it.
8. Zone copy and `knownLine` follow the row. No required "inside" for Kepler-186 f.

`tests/test_seo_pages.py`

9. The Kepler-186 sentence is `first_sentence` of the generated row (A5).
