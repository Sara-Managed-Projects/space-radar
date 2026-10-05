# Releasing

The live site, [spaceradar.ai](https://www.spaceradar.ai), follows `main` and is deployed by its
maintainers. **Releases are for everyone else**: a numbered zip a school, a museum or a fork can
download, run offline, and name in a bug report.

## Versions

**Semantic Versioning**, `MAJOR.MINOR.PATCH`. We chose it over calendar versions because three
things here are contracts other people depend on, and SemVer is the scheme that says when one
breaks: shared links (`#trip=…&stop=…`, format `v=1`), the saved-data format (`/data/v1/`,
`schema: 1`), and the registry row formats a fork writes against.

- **MAJOR**: an old shared link, an old saved data copy or an existing registry row stops working.
- **MINOR**: something new a visitor can see or do: a trip, a layer, a view.
- **PATCH**: fixes, corrections to facts, performance, documentation.

## Cadence

- A **minor release in the first week of each month**, from whatever is on `main` and green.
- A **patch release whenever a fix matters to people running a copy**: a broken offline start, a
  wrong fact in a trip, a security fix.
- No long-lived release branches. If a patch is needed and `main` has moved on in a risky way,
  branch from the last tag, cherry-pick, tag there.

## Between releases

Every pull request title is written as a changelog line. Whoever merges a change a visitor would
notice adds a line under `## [Unreleased]` in [CHANGELOG.md](../CHANGELOG.md), in the same pull
request when possible.

## Release checklist

1. `main` is green, and `scripts/test.sh` is green on a clean checkout.
2. Start it locally and fly one trip with the voice on, on a desktop and on a phone-sized window.
3. Check the offline path: `python3 scripts/save_offline_data.py`, disconnect, start, reload.
4. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, tidy it into
   Added / Changed / Fixed, add a fresh empty `## [Unreleased]` above it, and update the compare
   links at the foot. Merge that pull request.
5. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "Space Radar X.Y.Z"
   git push origin vX.Y.Z
   ```

6. The [`release` workflow](../.github/workflows/release.yml) does the rest: it checks that the
   changelog has a section for the tag, saves a fresh copy of the live data into `site/data/v1/`,
   builds `space-radar-X.Y.Z.zip` (the `site` folder, the licence, the credits and the run-it-
   locally guide), and publishes a GitHub Release whose notes are that changelog section.
7. Download the zip from the Release page, unzip it somewhere new, start it **with the network
   off**, and make sure the Earth has satellites. If it does not, delete the release and the tag,
   fix, and tag again; do not leave a broken zip for a teacher to find.

## What is in the zip, and what is not

In: `site/` exactly as served, including `site/data/v1/` as saved on release day; `LICENSE`,
`CREDITS.md`, `CHANGELOG.md`, `RUN_LOCALLY.md`. Not in: tests, registries, scripts and tools (clone
the repository for those). The saved data is other publishers' data under their own terms;
[CREDITS.md](../CREDITS.md) §4 says whose, and which of them have not been cleared in writing.
