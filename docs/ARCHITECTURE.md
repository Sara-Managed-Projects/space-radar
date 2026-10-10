# A map of the code

One page. Every path named here exists; `tests/test_contributor_docs.py` fails if one stops
existing.

## The folders

```
registry/            YAML that says what exists and where each fact came from. Edit here first.
scripts/             gen_*.py turn a registry into JavaScript; check_*.py refuse a broken one.
site/                the whole app, served as it is. No bundler, no build step.
site/index.html      the page, and the first module script
site/js/main.js      boot and the render loop: the order things happen in, nothing else
site/js/data/        generated mirrors of the registries, and the parsers for live data
site/js/scene/       what is drawn: worlds, stars, models, the camera (three.js)
site/js/sky/         the sky from the ground: passes, rise and set, constellations
site/js/propagate/   where things are: SGP4, Kepler, the ephemeris
site/js/ui/          panels, cards, search, trips, the address bar
site/js/copy/en.js   every word a visitor reads
site/data/           star catalogues, constellations, sky cultures
site/models/         3D models; site/textures/ maps; site/audio/ music and the trips' voice
site/vendor/         three.js, satellite.js, astronomy-engine, checked in
site/sw.js           the service worker: offline after one visit
tests/               plain node and python scripts, no framework. Each prints what it checked.
harvest/             the scheduled job that saves each public data source for the site to read
tools/               run by hand: a threaded server, headless Chrome, the trip video renderer
templates/           the HTML of the crawlable pages that scripts/build_seo.py builds
docs/                running, embedding, translating, releasing, reviewing
```

## The boot path

`site/index.html` loads `site/js/main.js` as an ES module. `main.js` creates the renderer
(`site/js/scene/renderer.js`), draws the Earth and the stars before any network call returns,
then loads the layers that `site/js/data/layers.js` lists. Each layer names a source
(`site/js/data/sources.js`), a parser (`site/js/data/parsers.js`) and a propagator
(`site/js/propagate/index.js`). Panels and cards are built by modules in `site/js/ui/`. Code for a
layer that is off by default loads with a dynamic `import()` when it is switched on, because the
first visit has a byte budget (`registry/budgets.yaml`, held by
`tests/test_first_visit_bytes.mjs`).

`tests/test_contract.mjs` is the module contract: it lists every module and the names it must
export, and fails when two modules disagree.

## Registry to screen

```
registry/tours.yaml --(scripts/gen_tours_js.py)--> site/js/data/tours.js --> site/js/ui/trip.js
      you edit this          you run this             GENERATED, committed       reads the mirror
```

`scripts/check_registry.py` validates every registry. Each generator has a `--check` that fails
when the committed mirror does not match its YAML. `scripts/check.sh` runs all of them.

## Where things live

| Thing | Source of truth | Generated or built | Drawn or used by |
|---|---|---|---|
| A trip | `registry/tours.yaml` | `site/js/data/tours.js`, `site/t/` (by `scripts/gen_trip_pages.py`) | `site/js/ui/trip.js`, `site/js/ui/tripframe.js` |
| A card | `site/js/copy/en.js` (the words) | none | `site/js/ui/cards.js` |
| A world | `registry/worlds.yaml` | none: `site/js/scene/worlds.js` is kept by hand and checked | `site/js/scene/worlds.js` |
| A 3D model | `registry/models.yaml`, the file in `site/models/`, a line in `CREDITS.md` | none | `site/js/scene/realmodels.js` |
| A data source | `registry/sources.yaml`, `registry/layers.yaml` | `site/js/data/layers.registry.js`, `harvest/sources.json` | `site/js/data/sources.js`, `site/js/data/parsers.js`, `harvest/` |
| A translation | `site/js/copy/en.js` is the English; a language is `site/js/copy/<code>.js` | `scripts/check-translation.mjs` makes the skeleton and checks it | not loaded yet: see `docs/TRANSLATING.md` |
| A sky culture | `registry/skycultures.yaml` | `site/data/skycultures/` (by `scripts/build-skycultures.py`) | `site/js/sky/skyculture.js` |

## To change X, edit Y

| To | Edit | Then run |
|---|---|---|
| Make search find a nickname | `registry/aliases.yaml` | `python3 scripts/gen_aliases_js.py` |
| Fix or cite a landing site | `registry/sites.yaml` | `python3 scripts/gen_sites_js.py` |
| Change a trip card or add a stop | `registry/tours.yaml` | `python3 scripts/gen_tours_js.py && python3 scripts/gen_trip_pages.py` |
| Change a button, a label or a card's fixed words | `site/js/copy/en.js` | `python3 scripts/check_copy.py` |
| Add a famous star's line | `registry/stars-notable.yaml` | `python3 scripts/gen_stars_notable_js.py` |
| Add a meteor shower | `registry/showers.yaml` | `python3 scripts/gen_showers_js.py` |
| Add a dated event to a mission | `registry/missions.yaml` | `python3 scripts/gen_missions_js.py` |
| Add an object we sent to space | `registry/oddities.yaml` | `python3 scripts/gen_oddities_js.py` |
| Add a moon or a dwarf planet | `registry/worlds.yaml` and `site/js/scene/worlds.js` | `python3 scripts/check_registry.py` |
| Add a 3D model or fix its credit | `registry/models.yaml`, `site/models/`, `CREDITS.md` | `python3 tests/test_credits.py` |
| Add a data source or a layer | `registry/sources.yaml`, `registry/layers.yaml`, `site/js/data/parsers.js` | `python3 scripts/gen_layers_js.py && python3 scripts/gen_sources_json.py` |
| Fix how a name is spoken | `registry/narration.yaml` | `python3 scripts/gen_narration_js.py` |

After any of them: `scripts/check.sh`. To add a test, put `tests/test_<name>.mjs` or
`tests/test_<name>.py` in place and add a step for it to `.github/workflows/ci.yml`
(`tests/test_ci_runs_every_test.mjs` fails until you do).

Longer recipes are in [CONTRIBUTING.md](../CONTRIBUTING.md). The first pull request, step by
step, is [docs/FIRST_PR.md](FIRST_PR.md).
