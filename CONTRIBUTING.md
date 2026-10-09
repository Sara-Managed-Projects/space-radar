# Contributing to Space Radar

**No install, no build.** Running Space Radar needs only Python's built-in web server:

```bash
git clone https://github.com/Sara-Managed-Projects/space-radar.git && cd space-radar
python3 -m http.server 8177 --directory site      # open http://localhost:8177
```

**To change a word or a fact you need no tools at all.** Open the file on GitHub, press the pencil,
edit, and GitHub opens the pull request for you. Thank you for being here: Space Radar exists so
that anyone can learn about space freely and simply, and it gets better every time somebody fixes a
sentence, corrects a number or teaches it a new object. You do not need to be a rendering engineer.
Some of the best changes in this project are one line of YAML with a source next to it.

## Contribute without code

Each of these takes minutes, needs no install, and is named in the release notes.

- **Report a wrong number or name.** A
  [data-accuracy report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=data-accuracy.yml)
  with a source is one of the most valuable things you can send.
- **Review a trip's narration.** Astronomers and teachers: read one of the 26 trips
  (`registry/tours.yaml`, or fly it on the site) and tell us what is wrong or unclear, in an
  [issue](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=trip-or-content.yml).
- **Test it in a classroom or on a museum screen.** What worked, what broke, on which machine: a
  [classroom report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=classroom.yml).
- **Suggest a trip or an object.** An
  [idea](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=idea.yml) or a
  [trip or content](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=trip-or-content.yml)
  form, or a thread in [Discussions](https://github.com/Sara-Managed-Projects/space-radar/discussions).
- **Send a translation.** Start with [docs/TRANSLATING.md](docs/TRANSLATING.md), or
  [offer a language](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=translation.yml).
- **Offer a shape model.** NASA publishes 3D models of spacecraft; if you can slim one for the web
  (or know one we lack), say so in an [idea](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=idea.yml).
  The recipe is under [Add or fix an object](#add-or-fix-an-object).
- **Draw an icon or a planet's look.** Shaders and art passes are listed under
  [help wanted](https://github.com/Sara-Managed-Projects/space-radar/labels/help%20wanted).
- **Ask or show.** Questions, and what you made with it or embedded, are welcome in
  [Discussions](https://github.com/Sara-Managed-Projects/space-radar/discussions). A GitHub account
  is needed only to talk here; using Space Radar needs none.

## What you can expect from us

- **A first reply within 48 hours**, from a person, on every issue and pull request.
- **A merge, or a reason, within a week.**
- **You are credited.** Every contributor is named in the release notes for the release that
  carries the change, and in [CREDITS.md](CREDITS.md) when what you gave is data, a picture or a
  model.
- **AI-assisted contributions are welcome.** Much of this project was written with AI assistants.
  We check the tests and the sources, not who typed. If an assistant wrote it, you still own what
  you send: run `scripts/test.sh`, and keep every fact tied to a source you have read.

Ideas, bug reports, corrections and questions are all welcome as
[issues](https://github.com/Sara-Managed-Projects/space-radar/issues/new/choose).

- [Your first contribution, in ten minutes](#your-first-contribution-in-ten-minutes)
- [How the project is put together](#how-the-project-is-put-together)
- [Recipes](#recipes): a trip, an object, a layer
- [Tests](#tests)
- [Style](#style) and [the honesty rules](#the-honesty-rules)
- [Pull requests](#pull-requests)

## Your first contribution, in ten minutes

To **run** the project you need only **Python 3**. To make a change *and run the checks* you need
**git**, **Python 3** with PyYAML (`pip install pyyaml`) and **Node 22+**. There is no `npm install`
and no build step.

```bash
git clone https://github.com/<you>/space-radar.git && cd space-radar
python3 -m http.server 8177 --directory site      # open http://localhost:8177
```

Now teach the search box a word. People type "station" and mean the ISS; the catalogue calls it
`ISS (ZARYA)`. `registry/aliases.yaml` is where that is fixed:

```yaml
  - {say: space telescope, means: hst, why: "what people call Hubble before the name comes back"}
```

```bash
python3 scripts/gen_aliases_js.py     # writes the copy the browser reads
scripts/test.sh aliases registry      # the checks that touch it
```

Reload the page, type your word, and it is found. Commit both files (the YAML and the generated
`site/js/data/aliases.js`), open a pull request, and that is a real contribution. Issues labelled
[good first issue](https://github.com/Sara-Managed-Projects/space-radar/labels/good%20first%20issue)
are about this size.

## How the project is put together

```
registry/*.yaml   what exists: worlds, layers, sources, trips, models, sites, budgets ...
scripts/gen_*.py  turn a registry into the JavaScript the browser reads
site/             the whole app, served as it is: plain ES modules, three.js, no bundler
site/js/copy/     every word a visitor reads (en.js)
tests/            node and python tests; no browser needed for almost all of them
harvest/          the scheduled job that saves each data source to /data/v1/
tools/            things run by hand: a local server, headless Chrome, the trip-video renderer
```

**The registry is the architecture.** A browser does not read YAML, so each registry has a
*mirror* under `site/js/data/` written by its generator: `registry/tours.yaml` →
`scripts/gen_tours_js.py` → `site/js/data/tours.js`. The mirror is committed. CI runs every
generator with `--check` and refuses a mirror that does not match its registry, so the rule is
simple:

> Edit the YAML, run its generator, commit both. Never edit a file that says GENERATED.

The registries also carry the *evidence*: where a number came from, the day it was read, what the
page said. Only a whitelisted subset reaches the browser. If you add a fact, add its source in the
same row; `scripts/check_registry.py` will ask for it.

## Recipes

### Add or fix an object

| You want to | Edit | Then run |
|---|---|---|
| Make search find something by another name | `registry/aliases.yaml` | `gen_aliases_js.py` |
| Add a landing site, a launch pad or a dish | `registry/sites.yaml` | `gen_sites_js.py` |
| Add a famous star's line | `registry/stars-notable.yaml` | `gen_stars_notable_js.py` |
| Add a meteor shower | `registry/showers.yaml` | `gen_showers_js.py` |
| Add a moon or a dwarf planet | `registry/worlds.yaml` (+ `site/js/scene/worlds.js`, the one hand-kept mirror) | `check_registry.py` tells you what is missing |
| Add a strange thing we sent to space | `registry/oddities.yaml` | `gen_oddities_js.py` |
| Add a dated event to a mission's timeline | `registry/missions.yaml` | `gen_missions_js.py` |
| Add a map of Earth data from NASA GIBS | `registry/overlays.yaml`, a credit in `CREDITS.md` §4.19 | `gen_overlays_js.py` |
| Add a 3D model | `registry/models.yaml` (`real_models:`), the `.glb` in `site/models/`, a row in `CREDITS.md` | `scripts/fetch-model.sh` shows how the existing ones were fetched and slimmed |
| Fix a card's wording | `site/js/copy/en.js` | `scripts/test.sh copy` |

`tests/test_growth.py` is the proof that this works: it adds a moon of Saturn using registry rows
only, and fails if doing so ever needs a code change.

### Add a trip

A trip is a row in `registry/tours.yaml`: a title, a blurb, a group, and a list of stops. The long
comment at the top of that file is the full grammar; this is the short version.

```yaml
  # FACTS, read 2026-10-06: https://www.nasa.gov/international-space-station/ (109 m long,
  # 7.66 km/s).
  - id: eyes-in-orbit
    title: "Eyes in orbit"                      # 60 characters at most
    blurb: "A station, and the two worlds it flies between."     # one sentence, 80 at most
    group: earth-orbit                          # earth-orbit | solar-system | beyond | events
    requires: [stations, worlds]                # the layers its stops need loaded
    clock: as-found                             # as-found | live | freeze
    stops:                                      # three at least
      - id: iss
        target: {layer: stations, catalog: "25544"}
        distance_km: 3000
        chapter: "Where people live"            # optional: the part of the story, not the stop
        card:
          title: "The International Space Station"
          body: >-
            About the size of a football pitch, and moving at nearly eight kilometres a second.
```

**A stop names exactly one target**, and the rest of the stop says what to do there:

| `target:` | What it is | Often with |
|---|---|---|
| `{record: <id>}`, `{layer: <id>, catalog: "<NORAD>"}` | one object in a layer | `distance_km`, `needs_layer` |
| `{world: <id>}` | a `registry/worlds.yaml` row | `frame_radii`, `over: [lat, lon]`, `behind`, `overlay` (an Earth data map), `live_note` |
| `{site: <id>}` | a `registry/sites.yaml` row | `time: daylight`, so the ground is lit (also for a world with `over:`) |
| `{observer: true}` | the visitor's own place (the trip then says `requires_observer: true`) | `look: {world: jupiter}` to stand on the ground and look up, `darkness: city \| town \| dark`, `time: tonight` |
| `{sky: [ra, dec]}` | a patch of sky, on the `stellar` stage | `figures: [Ori]`, `figure_stars`, `zoom`, `exposure: eye \| camera \| deep` |

`time:` is an instant, `now`, `tonight`, `night`, `daylight`, or the next event from
`registry/events.yaml`; `rate:` runs the clock while the stop is up. A card may not state a time
itself: the frame prints "Shown at" from the clock. A stop that cannot be found on the day is
dropped before the count is shown, so a trip never promises a stop it will not deliver.

**The rules.** `check_registry.py` holds the mechanical ones; a reviewer holds the rest:

- **Facts need a source.** Every number, date and name in a card is listed in a `# FACTS, read
  <date>: <url>` comment above the trip, as above. A fact nobody can check does not go on a card.
- **Say what the picture is.** A card may not call a model, an illustration or a false-colour map
  a photograph. There is no `class:` on a stop: the card prints the record's own.
- **Write for the ear as well as the eye.** The voice reads the card as it is, title then body:
  short sentences, plain words, British spelling, written for a curious twelve-year-old.
  `scripts/narrate.py` refuses a number or unit it does not know how to say, and
  `registry/narration.yaml` holds the pronunciation of the names the voice gets wrong.
- The first sentence of a body is at most 160 characters, and no `--`.

```bash
python3 scripts/gen_tours_js.py && python3 scripts/gen_trip_pages.py
python3 scripts/check_registry.py          # says what is wrong, and what to do about it
scripts/test.sh --quick                    # the checks that touch what you changed
```

Then open `http://localhost:8177/#trip=<your-id>` and fly it, once more with `&present=1`.

Two things a trip also needs are made with tools you may not have: its card picture
(`scripts/build_trip_thumbs.py`) and its narration (`scripts/narrate.py`, a local text-to-speech
model; `python3 scripts/narrate.py --check` is the check that goes red when a card's words change).
**Open the pull request as a draft without them.** Those two checks will be red; say so in the
description, and a maintainer will render the picture and the voice onto your branch.

### Add a data layer

1. The publisher goes in `registry/sources.yaml`: URL, how often to ask, whether a browser may
   call it (CORS), and the credit line. Read the publisher's terms first and put what they say in
   `CREDITS.md` §4; `tests/test_credits.py` fails until the credit line is there.
2. A parser in `harvest/` (for the saved copy) and in `site/js/data/parsers.js` (for the browser),
   with a captured fixture under `tests/fixtures/` so the test never touches the network.
3. A row in `registry/layers.yaml`: which source, which propagator, which glyph, which card.
   Then `python3 scripts/gen_layers_js.py && python3 scripts/gen_sources_json.py`.
4. New code loads with a dynamic `import()` when the layer is switched on, not at boot: the first
   visit has a byte budget (`registry/budgets.yaml`) and a test that holds it.

Open an issue before a big one. It is much nicer to agree on the shape first.

## Tests

```bash
scripts/test.sh                 # everything CI runs, a few minutes
scripts/test.sh --quick         # only the checks that touch the files you changed: seconds
scripts/test.sh --quick main    # ...changed since main, not since your last commit
scripts/test.sh contract        # only items whose name contains "contract"
scripts/test.sh --list          # what there is
node tests/test_contract.mjs    # or run one file directly
```

The tests are plain scripts: no framework, no install. Each prints what it checked. A check that
cannot fail is not a check, so most of them include a case that breaks the rule on purpose
(`tests/test_refusals.py` is nothing but those).

To look at your change in a real browser without opening one, `tools/cdp.mjs` drives headless
Chrome and takes a screenshot; its header comment explains how. Be gentle with the data
publishers while testing: CelesTrak allows one download per file per two hours. Run
`python3 scripts/save_offline_data.py` once and your local copy boots from disk instead.

The app has a service worker. A clone's worker is unstamped and always asks the server first, so it
does not hide your edits; if a page ever looks stale, open it once with `?sw=0` to remove it.

## Style

- **Plain JavaScript**, ES modules, no framework, no transpiler. Match the file you are in.
- **Comments explain why.** What the code does is in the code; what a reader cannot see is the
  reason, the measurement behind a constant, and the bug that made a line necessary. Many files
  start with a short story of what went wrong before. Keep that habit; it is the project's memory.
- **Every word a visitor reads lives in `site/js/copy/en.js`.** `scripts/check_copy.py` refuses a
  sentence written inside UI code. Plain words, sentence case, no exclamation marks.
- **Numbers carry units and honest precision**: `27 576 km/h`, not `27576.3219`.
- **UI changes follow [docs/DESIGN_PRINCIPLES.md](docs/DESIGN_PRINCIPLES.md)**: the scene comes
  first, one accent colour, one place for everything.
- No new runtime dependency and no CDN without a conversation first. Everything is vendored.

## The honesty rules

These are the heart of the project, and CI enforces most of them.

1. **Everything drawn is measured, modelled or illustrative, and says which.** A satellite's dot is
   worked out from elements of a stated age. The Milky Way is an illustration built from published
   measurements. The card says so, in small type, and that line is never removed to make a screen
   prettier.
2. **Every fact has a source and a date** in its registry row.
3. **Every asset has a licence and a line in [CREDITS.md](CREDITS.md)**: models, textures,
   pictures, sounds, fonts, data. No hot-linking somebody's files without their terms allowing it.
4. **A missing answer is shown as missing.** "Could not look" is a fine thing for the app to say.
   An empty sky presented as the real one is not.
5. **No personal data.** The app has no accounts and no tracking; keep it that way.

If you find something on the site that is wrong, a
[data-accuracy report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=data-accuracy.yml)
with a source is one of the most valuable things you can send.

## Pull requests

1. Fork, branch from `main`, make the change, run `scripts/test.sh` (`--quick` while you work).
2. Open the pull request. **Open it as a draft** while you are still working or want an early look.
3. CI runs on every push. Read a red check's log; they are written to say what to do.
4. **A green pull request that is not a draft is merged automatically** (squashed). So "ready for
   review" means "ready to ship". If you want a human to look first, keep it a draft and ask, or
   ask a maintainer to add the `no-auto-merge` label.
5. One topic per pull request. Small ones are merged fastest. The title becomes the changelog line:
   say what changed for a visitor ("Hubble is found when you type hubble"), not what you did.

Releases are cut about once a month; see [docs/RELEASING.md](docs/RELEASING.md).

By contributing you agree that your work is released under the project's [MIT licence](LICENSE),
and you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Have fun. Somewhere a classroom is going to fly to Saturn on your commit.
