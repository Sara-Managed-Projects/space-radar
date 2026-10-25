# 0024 — Re-sync the generated star systems — requirements

Card: [#562](https://github.com/Sara-Managed-Projects/space-radar/issues/562). Filed by the daily
improvement round of 9 Oct 2026. Nobody clicked it. The exit criterion on the card is: the
star-systems data is regenerated on a schedule against the live Archive table, and a rebuild date
is visible somewhere a user or a maintainer can check.

## What is true today

Measured in this checkout (`2a9e9aff`) and on the public site, 25 Oct 2026:

- Thirty-nine hosts are named in `registry/systems-list.yaml`. `scripts/build-systems.py` writes
  every number in `registry/systems-generated.yaml` from `site/data/exoplanets.csv` and
  `registry/systems-columns.csv`. Both say `as of 2026-10-08`. CI runs
  `gen_systems_more_js.py --check`, which checks that chain and does not call the Archive.
- Nothing in `.github/workflows/` runs `build-exoplanets.py --pull`. The only scheduled rewrite
  that opens a pull request is `contributors.yml` (Mondays, 05:17 UTC).
- TRAPPIST-1 is the fortieth system and is not in that chain. It is `registry/systems.yaml`,
  read by hand on 23 Sep 2026 (spec 0040). Its card uses `COPY.trip.systemLine`, which has no date.
- The generated stage line does have a date. `generatedLine` fills
  `COPY.starSystem.line` with `system.asOf`: "Sizes and years from the NASA Exoplanet Archive,
  read {date}." `SYSTEMS_AS_OF` in `site/js/data/systems-table.js` is that date.
- The sky-map catalogue is a different file. `registry/sources.yaml` `nasa-exoplanet-archive`
  is a 13-column TAP query, cadence 168 h. It does not select `pl_orbsmax`, `st_mass`, `st_lum`,
  or the reflink columns `build-systems.py` needs to say what was measured.
- Live site, fetched 25 Oct 2026: `build.json` is commit `d130190`, built 21 Oct 2026 18:58 UTC.
  `https://www.spaceradar.ai/js/data/systems-table.js` was last modified 13 Oct 2026 10:40 UTC
  and its date constant is `2026-10-08`. `data/v1/index.json` shows
  `nasa-exoplanet-archive` fetched 21 Oct 2026 18:17 UTC, 6451 items, valid until 28 Oct.
  The bundled csv in this checkout has 6347 data rows. Those two counts are different queries
  (the snapshot is the 13-column harvest; the csv drops rows with no position).
- TAP query the same day for the 39 listed hosts: 99 planets, the same 99 names as the bundled
  csv, no host missing. `pl_orbsmax` matches `registry/systems-columns.csv`. Kepler-186 f is
  still 1.17 Earth radii. Period strings differ only where the slim csv already rounds. The
  geometry has not moved since 8 Oct. The schedule is so the next correction does not wait for
  someone to remember the one-time command.

Could not look: a full `build-exoplanets.py --pull` was not timed. `narrate.py --check` was not
run. Deploys are still by hand (`freshness.yml`); this spec does not deploy.

## Requirements

1. **R1 — one weekly pull of the listed hosts.** A scheduled workflow on `main` asks the
   Archive's TAP service for `pscomppars`, restricted to the hosts in
   `registry/systems-list.yaml`, with the columns `build-exoplanets.py` already selects
   (the slim set and the wide set, including both reflinks). The day written into the files
   is the UTC date of that run. The Kopparapu citation stays "read 2026-10-08": that is when
   the paper was read, not when the table was.
2. **R2 — the generated chain is what gets rewritten.** A successful run writes
   `registry/systems-columns.csv`, `registry/systems-generated.yaml`,
   `site/js/data/systems-index.js` and `site/js/data/systems-table.js`, by the existing
   scripts. It does not edit `registry/systems-list.yaml`, `registry/systems-binaries.yaml`,
   or `registry/systems.yaml`.
3. **R3 — the bundled catalogue stays put.** The run does not write
   `site/data/exoplanets.csv` and does not run `gen_tours_js.py`. The trip card's
   `{exoplanet_count}` is that file. Changing it makes `narrate.py --check` fail until
   someone re-renders the clip, and a weekly hold on the voice would keep the stage date
   from moving. The live sky map already refreshes from the harvester snapshot.
4. **R4 — same planets, or no commit.** Every planet row in the pull must already be a row
   of `site/data/exoplanets.csv` for that host (`exo_id` of `pl_name`). A listed host with
   no rows, a system with no planet that has a period, a binary row outside the tolerances
   `build-systems.py` already enforces, or a TAP error: the workflow commits nothing.
   The previous `as_of` stays. That is "could not look", not a new date.
5. **R5 — a date-only week still ships.** If the pull succeeds and the only change is
   `as_of`, the run still opens a pull request. The date means the day of the last
   successful read. A week that looked and found the same numbers says so.
6. **R6 — the pull request is the door.** The job pushes `auto/star-systems` and opens
   or updates one pull request into `main`. It uses `GITHUB_TOKEN` only, the same way
   `contributors.yml` does, and then dispatches `ci.yml` on that branch. It does not push
   `main`. No other secret.
7. **R7 — a failed week is one issue, not a stream.** The title is
   `Star systems did not re-sync`. A second issue is never opened. A comment is added
   only when the failure text changed. When a later run opens a pull request, it comments
   once and closes the issue. Same shape as `freshness.yml`.
8. **R8 — the date a person sees is the one already on the stage.** `generatedLine`
   keeps printing `system.asOf`. No new widget. A maintainer can also read `as_of` at
   the top of `registry/systems-generated.yaml` and in the pull request. The public site
   shows the new date after the next deploy. This spec does not deploy.
9. **R9 — a later week can go green.** Tests that pin `2026-10-08` as the systems' date,
   or pin a radius, a zone verdict, or "5 of them sized" as a permanent fact, are changed
   so they follow the generated row. `test_exoplanets.mjs` still pins the bundled csv's
   own date, because R3 leaves that file alone. `gen_systems_more_js.py --check` still
   takes no network.

## Acceptance criteria

- A1. A fixture pull for the 39 hosts, with one number changed and the same 99 names,
  rewrites the four files in R2, stamps today's date, and leaves `site/data/exoplanets.csv`
  byte-identical.
- A2. The same fixture with one extra planet whose name is not in the csv exits non-zero
  and writes nothing.
- A3. A listed host missing from the fixture exits non-zero and writes nothing.
- A4. After A1, `generatedLine` for that system contains the new date, and
  `SYSTEMS_AS_OF` equals `as_of` in the yaml.
- A5. `python3 scripts/gen_systems_more_js.py --check` passes with no network, and
  `node tests/test_systems_table.mjs` passes against the fixture's outputs without a
  hardcoded radius or a hardcoded zone for Kepler-186 f.
- A6. The workflow is `schedule` plus `workflow_dispatch`,
  `if: github.repository == 'Sara-Managed-Projects/space-radar'`, and it does not run
  on a fork's code. Cron is Wednesday 06:41 UTC, away from `contributors.yml`
  (Monday 05:17 UTC) and from `freshness.yml` (minute 23).
- A7. On a run whose files differ, the branch `auto/star-systems` is pushed and one
  open pull request exists. On a TAP failure, that branch is not moved and the issue
  in R7 records the error.

## Out of scope

- TRAPPIST-1, `registry/systems.yaml`, and its card line. A later card can fold it in.
- Adding or removing hosts. The list stays a choice a person edits.
- Refreshing `site/data/exoplanets.csv`, the harvester's 13-column snapshot, or the
  trip narration. The snapshot already has its own weekly cadence.
- Deploying the site, rendering narration, or taking a screenshot. `pr_pictures.py`
  does not treat these four paths as drawn.
- Loosening the binary tolerances or the Kepler check.
