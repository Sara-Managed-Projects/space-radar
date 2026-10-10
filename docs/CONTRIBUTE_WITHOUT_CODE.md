# Four ways in

Pick the rung that fits what you know. Each one names the file you edit, a real pull request that
did it, and the check that runs on yours. None of the first three needs you to write code, and
the first needs no tools at all: press the pencil on a file on GitHub and it opens the pull
request for you.

Whichever you pick, `scripts/check.sh` is the one command to run before you open the pull
request, and [docs/FIRST_PR.md](FIRST_PR.md) says what happens after.

## A. Fix a fact or add a source

For anyone who can read a source carefully. This is the most valuable kind of change here.

| | |
|---|---|
| **Files** | `registry/sites.yaml` (landing sites, pads, dishes), `registry/stars-notable.yaml`, `registry/missions.yaml`, `registry/oddities.yaml`, `registry/showers.yaml`, `registry/systems.yaml` |
| **What a change looks like** | Correct the number in the row, and put the source in the same row or in the file's `references:` list: the URL, the date you read it, and what the page says. |
| **Then run** | The file's generator, for example `python3 scripts/gen_sites_js.py`, and commit the generated file too. |
| **Example** | [#557](https://github.com/Sara-Managed-Projects/space-radar/pull/557): the InSight landing site cited to Golombek et al. (2020). Two files changed. |
| **The check** | `Registries validate` (`scripts/check_registry.py`) refuses a fact without a source. `The sites mirror matches the registry` refuses a stale generated file. |
| **Issues** | [area:space-accuracy](https://github.com/Sara-Managed-Projects/space-radar/labels/area%3Aspace-accuracy), [track:data](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Adata), [track:astronomers](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Aastronomers) |

Not sure of the fix? A [data-accuracy report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=data-accuracy.yml)
with a link to the source is enough. Someone else will make the change and credit you.

## B. Translate

For anyone who writes well in two languages.

**State today, plainly:** the site shows English only. There is no language loader yet
([#524](https://github.com/Sara-Managed-Projects/space-radar/issues/524)), so a translation file is
checked by the tools but not shown on the site until the loader lands. The loader will read
exactly this file, so the work is not wasted. No translation has been merged yet; yours could be
the first.

| | |
|---|---|
| **File** | `site/js/copy/<code>.js`, for example `site/js/copy/fr.js`. `site/js/copy/en.js` is the English it is made from. |
| **Start** | `node scripts/check-translation.mjs --skeleton fr > site/js/copy/fr.js`, then replace the values. If you cannot run that, ask in your language's issue and a maintainer sends you the file. |
| **The check** | `node scripts/check-translation.mjs site/js/copy/fr.js` lists missing keys, extra keys and lost `{slots}`. |
| **Guide** | [docs/TRANSLATING.md](TRANSLATING.md) |
| **Issues** | One per language under [translation](https://github.com/Sara-Managed-Projects/space-radar/labels/translation); the epic is [#551](https://github.com/Sara-Managed-Projects/space-radar/issues/551). Say you are working on it there, so nobody does the same work twice. |

A partial translation is welcome. Say which sections are done.

## C. Add a sky culture, a trip stop or a model credit

For anyone who knows a subject: a tradition's sky, a mission, a spacecraft.

| | A sky culture | A trip stop | A model credit |
|---|---|---|---|
| **Files** | `registry/skycultures.yaml`; the figures in `site/data/skycultures/` | `registry/tours.yaml` | `registry/models.yaml`, `CREDITS.md` |
| **What a change looks like** | A row with the culture's source, licence and credit line. Only CC BY-SA or freer: the file's header lists the ones left out for their licence. | A stop with one `target:`, a card of plain words, and every fact listed in the `# FACTS, read <date>: <url>` comment above the trip. | The row's `source:` and licence corrected, and the same line in `CREDITS.md`. |
| **Then run** | Ask a maintainer to run `scripts/build-skycultures.py`: it needs Stellarium's files and a star catalogue. | `python3 scripts/gen_tours_js.py && python3 scripts/gen_trip_pages.py` | nothing to generate |
| **Example** | none from outside yet | [#581](https://github.com/Sara-Managed-Projects/space-radar/pull/581): one word on the Eris card | none from outside yet |
| **The check** | `Registries validate` | `Registries validate`, `The tours mirror matches the registry`. The narration check goes red when a card's words change: leave it, and a maintainer renders the voice. | `Every data source and model the registries name is credited in CREDITS.md` (`tests/test_credits.py`) |
| **Issues** | [track:astronomers](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Aastronomers) | [track:trips](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Atrips) | [track:models](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Amodels) |

Two rules hold for all three. No asset under a non-commercial (NC) licence. A picture that is an
artist's impression says so on its card.

## D. Code

For anyone who writes JavaScript or Python. Plain ES modules, no framework, no build step.

| | |
|---|---|
| **Files** | `site/js/` for the app, `tests/` for its tests, `scripts/` for generators and checks. [docs/ARCHITECTURE.md](ARCHITECTURE.md) is the map. |
| **Example** | [#558](https://github.com/Sara-Managed-Projects/space-radar/pull/558): the Tonight time strip tells a screen reader its value. One module and its test. |
| **The check** | The `contract` job: `node tests/test_contract.mjs` and the test for the module you touched. `scripts/test.sh <word>` runs every test whose name contains the word. |
| **Issues** | [good first issue](https://github.com/Sara-Managed-Projects/space-radar/labels/good%20first%20issue), then [help wanted](https://github.com/Sara-Managed-Projects/space-radar/labels/help%20wanted), which is sorted into tracks: [accessibility](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Aaccessibility), [shaders](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Ashaders), [models](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Amodels), [teaching](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Ateaching) |

## Other ways that need no pull request

- Try it in a class or on a museum screen and send a
  [classroom report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=classroom.yml).
- Read one trip as an astronomer and say what is wrong or unclear, in a
  [trip or content](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=trip-or-content.yml) issue.
- Answer a question in [Discussions](https://github.com/Sara-Managed-Projects/space-radar/discussions).
