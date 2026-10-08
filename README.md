<div align="center">

# Space Radar

**A free, open planetarium in your browser.**<br>
Every satellite at its real position right now, the planets and their moons, 109 389 stars,
and 26 narrated trips that fly you there.

### [Open it: www.spaceradar.ai](https://www.spaceradar.ai)

[![CI](https://github.com/Sara-Managed-Projects/space-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/Sara-Managed-Projects/space-radar/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![No build step](https://img.shields.io/badge/build%20step-none-brightgreen.svg)](#run-it-locally)
[![Runs offline](https://img.shields.io/badge/runs-offline-brightgreen.svg)](docs/RUN_LOCALLY.md)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fwww.spaceradar.ai&label=spaceradar.ai)](https://www.spaceradar.ai)
[![Good first issues](https://img.shields.io/github/issues/Sara-Managed-Projects/space-radar/good%20first%20issue?label=good%20first%20issues&color=7057ff)](https://github.com/Sara-Managed-Projects/space-radar/labels/good%20first%20issue)

[![Space Radar: the Earth with today's clouds, the aurora and the satellites around it](assets/screenshots/hero.webp)](https://www.spaceradar.ai)

</div>

## What it is

Space Radar is a living 3D map of space. It draws the Earth with today's clouds, about 17 000
satellites where they are this minute, the space stations and who is aboard, rockets about to
launch, probes on their way out, every planet and 21 moons (20 of them with a real map), the stars
in three dimensions, nebulae as telescopes photographed them, and the Milky Way from outside. Step
down to the ground and it is tonight's sky from your own street. Twenty-six guided trips, read
aloud, fly the camera for you; forty nearby star systems have a stage you can fly into. It is a static website: the physics runs in your browser, on public
data, and every number on screen says where it came from.

## Why

- **Learning about space should be free and simple.** No account, no adverts, no tracking, no
  install. Open a link and you are looking at the sky as it is now.
- **It should run anywhere.** A school, a university, a kindergarten or a village library can
  [run its own copy](docs/RUN_LOCALLY.md), on an old laptop, with no internet at all.
- **It should be honest.** Everything drawn is measured, modelled or illustrative, and says which.
- **It is built in the open, in the AI era.** Much of this project was written by people working
  with AI assistants, held to account by tests and by sources. That makes it a good time to join
  in: an idea, a correction or a fix from you can be on the live site within days.
  **Issues, fixes and ideas are all welcome.**

## What you can do with it

| | |
|---|---|
| ![Saturn and its rings, backlit, at a stop of the trip out past Jupiter](assets/screenshots/saturn.webp) | ![The Apollo 11 lunar module on the Moon, a stop of the Moon landings trip](assets/screenshots/moon-landing.webp) |
| **Take a guided trip.** Tonight from your street, why the Moon changes shape, the life of a star, black holes, back to the Moon with Artemis. 26 trips and 205 stops, with about 65 minutes of narration, captions and music. | **Stand where we have been.** Twenty places on the Moon and eleven on Mars that spacecraft reached, each on its own ground, with the facts and their sources on the card. |
| ![The sky from the ground: constellations, the Milky Way and tonight's satellites over the southern horizon](assets/screenshots/sky-from-the-ground.webp) | ![The Earth coloured by the temperature of the sea, a stop of the trip The living Earth](assets/screenshots/living-earth.webp) |
| **Look up from your own street.** The sky from the ground: figures, grids, tonight's best passes and planets, a city, town or dark sky, and a red night mode. | **Read the living Earth.** Seven maps of data measured from orbit, from NASA: sea temperature, sea ice, rain, plant life and more, each with its key and its source. |

<img src="assets/screenshots/phone.webp" alt="Space Radar on a phone: the Earth, the aurora and the satellites above a bottom sheet" width="230" align="right">

- **Follow anything in orbit.** The ISS, Hubble, Starlink trains, debris: where it is, how fast,
  whether it is in sunlight, and when it passes over you.
- **See the deep sky.** Real photographs of 27 nebulae and galaxies in their true places, with an
  exposure control, and the whole sky in other light: infrared, microwaves, gamma rays.
- **Go anywhere, at any time.** Fly from a rooftop to the edge of the Milky Way; drag the time
  scrubber to the next eclipse; follow eight missions along their own timelines.
- **Teach with it.** Present mode sets a trip's words large for a room and waits for your
  clicker. After one visit it works offline, and it installs like an app.
- **Put it in your page.** One live object or one trip as an
  [embed](docs/EMBEDDING.md), with no tracker and no cookie.
- **Use it on a phone.** The same map, one sheet, one thumb.

Also: live clouds, storms, lightning and the aurora on the Earth · close-up map tiles of the Earth,
the Moon and Mars · today's sunspot groups · eclipses computed for any date · 70 spacecraft and
shape models · fires, volcanoes and icebergs from NASA's EONET and the wind from NOAA's GFS ·
"Point your phone" at the sky · a passport of places opened and one true sentence on the home ·
reels that play on their own on a screen in a lobby (spec 0036) · artist's impressions, labelled
so, of planets nobody has seen · shareable links, postcards and a photo mode · full keyboard control.

### Links

The address bar is the view: what is selected, the moment on the clock, the map and the trip stop
are all in it, so copying it is sharing what you see. A trip has two link forms. `/t/<trip>.html`
is a small page of its own with the trip's picture and words, the one to paste into a chat or a
post so it unfurls; it opens the app at the trip. `#trip=<trip>&stop=<n>` is the app itself at
that stop, the one the address bar shows while you fly. Moving through a trip does not add to the
browser's history: Back is not "previous stop", it leaves the trip for the page you came from (the
trip has its own Previous). Back and Forward between two links you opened put the whole view back
each time: the selection, the clock, the map and the stop.

## Run it locally

```bash
git clone https://github.com/Sara-Managed-Projects/space-radar.git
cd space-radar
python3 -m http.server 8177 --directory site      # then open http://localhost:8177
```

That is the whole toolchain: there is nothing to install or compile. For Windows, classrooms,
a school server, a USB stick, and **running with no internet**, see
**[docs/RUN_LOCALLY.md](docs/RUN_LOCALLY.md)**. Each [release](https://github.com/Sara-Managed-Projects/space-radar/releases)
is a zip that already contains a saved copy of the data and starts offline.

## How it is built

```
site/        the whole app, served as it is: plain ES modules, three.js, no bundler, no framework
registry/    YAML files that say what exists: worlds, layers, data sources, trips, models, budgets
scripts/     generators that turn a registry into the JavaScript the browser reads, and the checks
tests/       130 node and python test files; no browser needed
harvest/     a small scheduled job that saves each public data source for the site to read
docs/        running it, embedding it, design principles, releasing
```

Adding a moon, a landing site, a search alias or a whole trip is a **row in a registry**, not a
code change, and CI holds the project to that. Satellites move by SGP4, asteroids and comets by
Kepler's equation, the Sun, Moon and planets by an ephemeris library, all in the browser.

## Contributing

It is meant to be easy and fun. **[CONTRIBUTING.md](CONTRIBUTING.md)** has a ten-minute first
contribution, recipes for adding a trip, an object or a layer, and one command that runs every
check (`scripts/test.sh`).

- Start with a [good first issue](https://github.com/Sara-Managed-Projects/space-radar/labels/good%20first%20issue),
  or something marked [help wanted](https://github.com/Sara-Managed-Projects/space-radar/labels/help%20wanted).
- Found a wrong number or a wrong name? A [data-accuracy report](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=data-accuracy.yml)
  with a source is gold.
- Have an idea, or teach with it? [Tell us](https://github.com/Sara-Managed-Projects/space-radar/issues/new/choose).
- Please read the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go through
  [SECURITY.md](SECURITY.md); other help is in [SUPPORT.md](SUPPORT.md).

Releases come out about monthly; see the [changelog](CHANGELOG.md) and
[how we release](docs/RELEASING.md).

## Data and credits

Space Radar stands on data and work that other people publish for free. Thank you.

**Data and APIs**

[![CelesTrak](https://img.shields.io/badge/orbits-CelesTrak-1f6feb)](https://celestrak.org)
[![JPL Horizons and SBDB](https://img.shields.io/badge/ephemerides-NASA%2FJPL%20Horizons%20%C2%B7%20SBDB%20%C2%B7%20CNEOS-1f6feb)](https://ssd.jpl.nasa.gov)
[![Launch Library 2](https://img.shields.io/badge/launches-The%20Space%20Devs-1f6feb)](https://thespacedevs.com/llapi)
[![NASA GIBS](https://img.shields.io/badge/clouds%20%26%20Earth%20data-NASA%20GIBS-1f6feb)](https://nasa-gibs.github.io/gibs-api-docs/)
[![NASA Treks](https://img.shields.io/badge/Moon%20%26%20Mars%20tiles-NASA%20Treks%20%C2%B7%20USGS-1f6feb)](https://trek.nasa.gov)
[![NOAA SWPC](https://img.shields.io/badge/space%20weather-NOAA%20SWPC-1f6feb)](https://www.swpc.noaa.gov)
[![NOAA nowCOAST](https://img.shields.io/badge/lightning-NOAA%20nowCOAST-1f6feb)](https://nowcoast.noaa.gov)
[![GDACS](https://img.shields.io/badge/storms-GDACS-1f6feb)](https://www.gdacs.org)
[![NASA Exoplanet Archive](https://img.shields.io/badge/exoplanets-NASA%20Exoplanet%20Archive-1f6feb)](https://exoplanetarchive.ipac.caltech.edu)
[![NASA DSN Now](https://img.shields.io/badge/deep%20space%20network-NASA%20DSN%20Now-1f6feb)](https://eyes.nasa.gov/dsn/)
[![ESA NEOCC](https://img.shields.io/badge/close%20approaches-ESA%20NEOCC-1f6feb)](https://neo.ssa.esa.int)
[![Wikidata](https://img.shields.io/badge/observatories-Wikidata-1f6feb)](https://www.wikidata.org)
[![Open Notify](https://img.shields.io/badge/crews-Open%20Notify-1f6feb)](http://open-notify.org)

**Catalogues, maps, models and pictures**

[![HYG](https://img.shields.io/badge/stars-HYG%20v4.4%20%C2%B7%20d3--celestial-8250df)](https://codeberg.org/astronexus/hyg)
[![OpenNGC](https://img.shields.io/badge/deep%20sky-OpenNGC%20%C2%B7%20Wikipedia-8250df)](https://github.com/mattiaverga/OpenNGC)
[![NASA 3D Resources](https://img.shields.io/badge/70%203D%20models-NASA%203D%20Resources%20%C2%B7%20PDS-8250df)](https://github.com/nasa/NASA-3D-Resources)
[![Solar System Scope](https://img.shields.io/badge/planet%20maps-Solar%20System%20Scope%20%C2%B7%20NASA%20%C2%B7%20USGS-8250df)](https://www.solarsystemscope.com/textures/)
[![Natural Earth](https://img.shields.io/badge/countries-Natural%20Earth-8250df)](https://www.naturalearthdata.com)
[![Other light](https://img.shields.io/badge/other%20light-WISE%20%C2%B7%20WMAP%20%C2%B7%20Fermi%20via%20CDS-8250df)](CREDITS.md#3h-the-sky-in-other-light--nasas-wise-wmap-and-fermi-through-cds-hips)
[![Nebula photographs](https://img.shields.io/badge/photographs-ESA%2FHubble%20%C2%B7%20ESO%20%C2%B7%20NOIRLab%20%C2%B7%20EHT-8250df)](CREDITS.md)

**Code, type and sound**

[![three.js](https://img.shields.io/badge/rendering-three.js-2da44e)](https://threejs.org)
[![satellite.js](https://img.shields.io/badge/SGP4-satellite.js-2da44e)](https://github.com/shashwatak/satellite-js)
[![astronomy-engine](https://img.shields.io/badge/ephemeris-astronomy--engine-2da44e)](https://github.com/cosinekitty/astronomy)
[![Lucide](https://img.shields.io/badge/icons-Lucide-2da44e)](https://lucide.dev)
[![Fonts](https://img.shields.io/badge/type-Inter%20%C2%B7%20Barlow%20%C2%B7%20JetBrains%20Mono-2da44e)](CREDITS.md#10-fonts)
[![Music](https://img.shields.io/badge/music%20%26%20sounds-John%20Bartmann%20%C2%B7%20Freesound%20(CC0)-2da44e)](CREDITS.md#9-audio--music-and-sounds)
[![Voice](https://img.shields.io/badge/narration-Kokoro--82M%20(synthetic)-2da44e)](CREDITS.md#9b-audio--the-trips-narration-a-synthetic-voice)

**[CREDITS.md](CREDITS.md)** has every one of them with its licence, its required credit line and
what we changed. None of these organisations endorses Space Radar.

> **Forking it?** Read [CelesTrak's usage policy](CREDITS.md#41-celestrak--read-this-before-you-deploy-a-fork)
> first: one download per file per two hours. The app's cache honours it; please keep that.

## Licence

- **The code** (everything we wrote: `site/js`, `site/css`, `scripts`, `tests`, `harvest`, `tools`,
  the registries and these documents) is **[MIT](LICENSE)**.
- **Data and assets keep their owners' licences**: vendored libraries (MIT, ISC, BSD), planet maps
  (CC BY 4.0 and public domain), star catalogues (CC BY-SA 4.0, BSD), photographs (CC BY 4.0), the other-light sky tiles (ODbL 1.0),
  the constellation pictures (Free Art License 1.3, copyleft: `site/data/skyart/LICENSE.txt`), other peoples' sky figures (CC BY-SA 4.0),
  NASA models (public domain), fonts (SIL OFL 1.1), music (CC0). Data fetched live or saved under
  `site/data/v1/` belongs to its publisher under the publisher's terms. [CREDITS.md](CREDITS.md)
  is the full list, including the few terms we have not been able to confirm.
- The GitHub mark in the app is GitHub's trademark, used unmodified under GitHub's logo rules.

<div align="center">
<sub>Built with real orbital mechanics and a lot of respect for the people who publish the data for free.</sub>
</div>
