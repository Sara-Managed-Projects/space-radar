# 0024 — Re-sync the generated star systems — design

## What is wrong

The 39 generated systems were built once, on 8 Oct 2026. The command that talks to the
Archive is `python3 scripts/build-exoplanets.py --pull <day>`, and nobody runs it on a
schedule. The weekly harvester snapshot cannot fill the gap: its query has no semi-major
axis, no stellar mass, no luminosity, and no reflink, so `build-systems.py` cannot tell
a measured radius from a calculated one.

```
TAP pscomppars (39 hosts, slim + wide columns)
    -> registry/systems-columns.csv          as of <the UTC day of the run>
    -> scripts/build-systems.py
    -> registry/systems-generated.yaml
    -> scripts/gen_systems_more_js.py
    -> site/js/data/systems-index.js
    -> site/js/data/systems-table.js         SYSTEMS_AS_OF, generatedLine's date

site/data/exoplanets.csv                     stays as of 2026-10-08 until a person pulls it
data/v1 exoplanet snapshot                   stays the harvester's 13-column weekly file
registry/systems.yaml                        TRAPPIST-1, untouched
```

The two dates are allowed to differ. Today they already do on the live site: the snapshot
was fetched 21 Oct, the stage still says 8 Oct. After this, the stage date is the systems
pull, and the catalogue card keeps the csv's own "as of". Each line names its own day.

## The pull

Add `--systems-only <YYYY-MM-DD>` to `scripts/build-exoplanets.py`. It reads the hosts
from `registry/systems-list.yaml`, requests the existing `QUERY` with
`where hostname in (...)`, and writes only `registry/systems-columns.csv`.

The side file gains the slim columns the builder currently reads from the csv, so one
file is the whole pull: `pl_rade`, `pl_bmasse`, `pl_orbper`, `ra`, `dec`, `sy_dist`,
`disc_year`, `discoverymethod`, `st_teff`, `st_rad`, `st_spectype`, plus the columns it
has now. Header stays one comment line, `as of <day>`. A host with no rows is still a
refusal, before any write.

`build-systems.py` reads those numbers from the side file. It stops requiring the side
file's date to equal the csv's. It still refuses a planet whose `exo_id(pl_name)` is not
a row of that host in the csv, and it still refuses a missing period, a Kepler failure,
and a binary row outside the current 5 % / 3 % checks. On any refusal it does not write
`registry/systems-generated.yaml`.

`as_of` on the document and on every system is the day argument. The source URL keeps
`(read <that day>)`. `HZ_FORMULA` is not rewritten.

`gen_systems_more_js.py` is unchanged. `--check` still runs `build-systems.py --check`
and still takes no network.

## Tests that would freeze the table

These pins are true on 25 Oct and become false the week the Archive revises a row.
Point them at the row:

- `tests/test_systems_table.mjs` compares `SYSTEMS_AS_OF` to the csv header. That
  equality goes. Each generated system's `asOf` equals `SYSTEMS_AS_OF`. The csv header
  is not consulted.
- The Kepler-186 f checks for "inside", "5 of them sized", and the four `knownLine`
  strings become: the card prints the zone the row already has, the line counts planets
  with `aFrom === 'kepler'`, and `knownLine` matches `radiusFrom` / `massFrom`. The line
  still has to contain `SYSTEMS_AS_OF`.
- `tests/test_seo_pages.py` builds the Kepler-186 sentences with `seo_systems.first_sentence`
  from the yaml it just read, instead of the literals `1.17`, `1.07`, and `580`.

`tests/test_exoplanets.mjs` keeps `as of 2026-10-08` for the bundled csv.

A fixture under `tests/fixtures/` is a trimmed TAP body: the 99 current planets, plus
one case with an extra name and one case with a host removed. No test opens a socket.

## The workflow

`.github/workflows/star-systems.yml`, modelled on `contributors.yml`.

- `schedule`: `41 6 * * 3`. `workflow_dispatch` with no inputs.
- `if: github.repository == 'Sara-Managed-Projects/space-radar'`.
- Checkout `main`. Timeout 20 minutes. Python 3.12, PyYAML.
- `DATE=$(date -u +%F)`.
- `python3 scripts/build-exoplanets.py --systems-only "$DATE"`
- `python3 scripts/build-systems.py`
- `python3 scripts/gen_systems_more_js.py`
- If any of those exits non-zero, do not commit. Run the issue step (below) and exit 0
  so a TAP blip is not also a red X on `main`'s schedule history that pages nobody.
  The issue is the signal. Print the script's stderr into the job summary either way.
- If `git diff --quiet` on the four files, print that the pull matched the tree and
  exit 0. With R5 this happens only when the run's date is already today's date and
  the numbers match, which is a second dispatch the same day.
- Otherwise commit those four files as `github-actions[bot]` on `auto/star-systems`,
  `git push --force`, open the pull request if there is not one, dispatch `ci.yml`
  on the branch. Title: `Star systems: read from the Archive on <DATE>`. Body: the
  date, the planet count the script printed, and a line that the bundled csv was not
  touched. Same warning as `contributors.yml` if the token cannot open a pull request:
  the branch is still pushed.

Permissions: `contents: write`, `pull-requests: write`, `actions: write`,
`issues: write`. No other secret. The job checks out `main` and does not run a fork's
code.

## The failure issue

Same control as `freshness.yml`. Title `Star systems did not re-sync`, label `ci`.
Marker `<!-- star-systems: <sha256 of the error text> -->`. Comment when the marker
changed. A run that pushed a branch comments "pulled <DATE>" and closes it.

A binary row that drifts past 5 % lands here, with `build-systems.py`'s existing
message. The fix is a person's edit of `registry/systems-binaries.yaml`, not a wider
tolerance. A new planet of a listed host lands here too, because it is not in the
csv yet. The message names the planet. Refreshing the csv is a separate, manual
`build-exoplanets.py --pull`, and it is the week the trip narration may need a
re-render. This workflow does not do that pull.

## Risks

- **Two radii.** The stage card reads the generated row. The sky-map card reads the
  snapshot, or the csv when there is no snapshot. They can disagree by up to a week,
  and each line carries its own date. That split is already how the site behaves.
- **A new planet waits.** R4 will not draw a planet the catalogue file does not have.
  The issue names it. Until the csv is pulled, the other 39 systems also keep the
  previous date, because the run commits nothing.
- **Weekly pull requests.** A quiet week still changes `as_of` in four files.
  `auto-merge.yml` merges it when `registry` and `contract` are green. The picture
  rule does not apply to these paths.
- **Full-table time.** This plan did not time an unfiltered pull. The scheduled query
  is the 39 hosts only. The Kepler-186 query and the 39-host query each returned in
  under two seconds on 25 Oct. The 20-minute timeout is the room around that.
