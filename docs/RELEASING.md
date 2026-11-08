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
2. Start it locally and fly one trip with the voice on, on a desktop and on a phone-sized window,
   and one in present mode (`#trip=moon-phases&present=1`) with the arrow keys.
3. Check the offline path: `python3 scripts/save_offline_data.py`, disconnect, start, reload.
   Then the service worker's: `python3 scripts/stamp_sw.py`, open the app once, stop the server,
   reload (it must start and say "Offline"); `git checkout site/sw.js` and open `?sw=0` to undo.
   `tests/probes/offline-probe.js` does the same in headless Chrome.
4. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, tidy it into
   Added / Changed / Fixed, add a fresh empty `## [Unreleased]` above it, and update the compare
   links at the foot. Set `BUILD` in `site/js/ui/urlstate.js` to the same `X.Y.Z`: shared links
   carry it as `build=`, and `tests/test_access.mjs` checks its shape. Merge that pull request.
5. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "Space Radar X.Y.Z"
   git push origin vX.Y.Z
   ```

6. The [`release` workflow](../.github/workflows/release.yml) does the rest: it checks that the
   changelog has a section for the tag, saves a fresh copy of the live data into `site/data/v1/`,
   builds `space-radar-X.Y.Z.zip` (the `site` folder with its service worker stamped for this
   build, the licence, the credits, the changelog, the run-it-locally guide and the script that
   refreshes the data), and publishes a GitHub Release, with the zip's SHA-256, whose notes are
   that changelog section. Running the workflow by hand from a branch builds the same zip as a
   dry run and publishes nothing.
7. Download the zip from the Release page, unzip it somewhere new, start it **with the network
   off**, and make sure the Earth has satellites. If it does not, delete the release and the tag,
   fix, and tag again; do not leave a broken zip for a teacher to find.

## After a deploy that changes a page's structured data

The pages carry JSON-LD (the home page, the trips, the object pages, the Lab, and the question pages: the ISS, Starlink,
planets tonight, the star systems, the events, the teachers' page). `tests/test_structured_data.py` and
`scripts/check_seo.py` hold the fields offline, and each validator in them is shown to refuse a broken page. Two outside
validators read what Google and schema.org read, from the live address, and are run by a person: neither has an interface a
script can use without an account or a key, and none is created for this.

1. List the live addresses by kind (needs only `curl` and `python3`):

   ```bash
   curl -fsS https://www.spaceradar.ai/sitemap.xml | python3 -c '
   import re, sys
   urls = re.findall(r"<loc>([^<]+)</loc>", sys.stdin.read())
   kind = lambda u: "trip" if "/t/" in u else "object" if "/o/" in u else "lab" if "/lab/" in u else "other"
   for k in ("other", "trip", "object", "lab"):
       print("##", k); print("\n".join(u for u in urls if kind(u) == k))' | less
   ```

   Check every address under `other` (the question pages), and one or two of each other kind.
2. Open [the Rich Results Test](https://search.google.com/test/rich-results) and [the Schema Markup Validator](https://validator.schema.org/),
   choose "URL", paste an address, and run it. If either asks you to sign in, stop there and say so on the issue.
3. Write down, per address, the types found and every error or warning with its message, and put the list on
   [issue #555](https://github.com/Sara-Managed-Projects/space-radar/issues/555). Errors are fixed in
   `scripts/seo_common.py`, `scripts/seo_pages.py`, `scripts/build_seo.py` or `scripts/gen_trip_pages.py` (the pages are generated, never
   edited by hand), together with a check in `tests/test_structured_data.py` that would have caught it. A warning for a field
   Google lists as optional (a price, a review) is left alone and noted.

## What is in the zip, and what is not

In: `site/` as served, with `site/sw.js` stamped (so the copy works offline after one visit) and
`site/data/v1/` as saved on release day; `LICENSE`, `CREDITS.md`, `CHANGELOG.md`,
`START-HERE.txt`, `docs/RUN_LOCALLY.md` and `scripts/save_offline_data.py`. Not in: tests,
registries, the other scripts and tools (clone the repository for those). The 2.0.0 zip is 173 MB,
241 MB unpacked; of that, about 66 MB is narration, card voices and music (`site/audio/`) and 33 MB the
stars of the 3D star layer (`site/data/stars3d-athyg/`). The saved data is other publishers' data under their own terms;
[CREDITS.md](../CREDITS.md) §4 says whose, and which of them have not been cleared in writing.
