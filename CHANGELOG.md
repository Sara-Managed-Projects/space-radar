# Changelog

What changed for a visitor, a teacher running a copy, or a contributor. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); [docs/RELEASING.md](docs/RELEASING.md)
says what counts as major, minor and patch here.

The project was built in the open for a month before it had releases. The `0.x` entries below are
milestones on `main`, summarised from about three hundred merged pull requests; they were never
tagged, and their dates are the day the last change in each landed.

## [Unreleased]

### Added
- **Ready for contributors**: a new README, [CONTRIBUTING.md](CONTRIBUTING.md), a code of conduct,
  a security policy, issue and pull-request templates, and a one-page
  [design bar](docs/DESIGN_PRINCIPLES.md).
- **Run it anywhere, including offline**: [docs/RUN_LOCALLY.md](docs/RUN_LOCALLY.md) for teachers
  and non-developers, and `scripts/save_offline_data.py`, which saves a copy of the live data next
  to the app so it starts with no internet.
- **Releases**: this changelog, a release workflow that publishes a zip that runs offline, and a
  monthly cadence.
- **Works with no network after one visit**: a service worker keeps the app, and the maps, models
  and sounds you have used; the status line says "Offline: showing saved copies from …" with the
  age of the oldest copy. Switch it off with `?sw=0`. Push notifications are not part of this.
- **Installable**: a web manifest and home-screen icons.
- **Runs from any folder**: a copy served at `http://server/space-radar/` now finds its saved data
  (every path is relative to the page).
- **The nebulae from your own sky**: the 27 photographs of nebulae and galaxies now show in the
  sky from the ground, at their true places and sizes, as faint as your sky, the Moon and the
  shutter make them. Zoom in on Orion and the nebula is there; tap it for its card.
- **Other light**: What to show has a new row. See the whole sky in infrared (WISE), microwaves
  (WMAP) or gamma rays (Fermi), in orbit and from the ground, with a slider between it and the
  visible sky. Each is false colour and says so; the infrared sky sharpens from the survey's own
  tiles as you zoom.
- **Stars are places**: fly to a star and it is a disc of its own size and colour, not a point.
  Its card says how wide it is, and that the width is an estimate.
- In the sky from the ground: `+` and `-` zoom, and the search box turns the sky to what it finds.
- `scripts/test.sh` runs everything CI runs with one command.
- `scripts/test.sh --quick` runs only the checks that touch the files you changed.
- `tests/test_credits.py`: every data source and model in the registries must be credited.

### Changed
- [CREDITS.md](CREDITS.md) opens with a summary table and now credits nine data sources the
  registry used and this file did not name (JPL's Small-Body Database, CNEOS and Horizons, ESA
  NEOCC, Wikidata, Open Notify and others).
- Fresh README screenshots under `assets/screenshots/`; the old `assets/readme/` set is gone.

## [0.5.0] - 2026-10-04

The planetarium release: a new interface, a voice, and real pictures of the sky.

### Added
- **Narrated trips**: every stop of every guided trip can be read aloud, with captions. The voice
  is synthetic and says so.
- **Photographs of 27 nebulae and galaxies** on the sky, from ESA/Hubble, ESO and NOIRLab, with an
  exposure control: Eye, Camera, Deep.
- **The Moon and Mars get sharper as you come close**: map tiles from NASA Solar System Treks.
- **Weather on other worlds**: lightning on Earth, moving cloud bands on the giants, Mars's seasons.
- **The aurora** on the night side, from NOAA's forecast; who is aboard the ISS and Tiangong.
- **Tonight**: what crosses your sky in the next hours, worked out in the background.
- A share sheet with a postcard, a link and text; an email-only subscription for launches and
  meteor showers; trip cards with pictures; a controls hint shown once.
- Pages for search engines built from the cards' own words; a tool that renders a trip as a video.

### Changed
- **One sidebar, one tool rail, one time pill**: the whole desktop interface was rebuilt, and the
  phone got a single sheet with three heights.
- The object card leads with three numbers and four actions.
- "What to show" is grouped under four headings with counts and a filter.
- Comets come from JPL's Small-Body Database instead of the Minor Planet Center.
- A first visit is back under 5.6 MB.

### Fixed
- An object of no known kind is no longer called a satellite.
- Orbiters are no longer drawn a third the size of Mars on the solar-system view.
- Models no longer balloon as a trip leaves a stop.

## [0.4.0] - 2026-09-30

Light, air and the live Earth.

### Added
- **Today's clouds** on the Earth from NASA GIBS, and the tropical storms turning now from GDACS.
- **Atmospheres** on Earth, Mars, Venus and Titan; physically lit planets; Saturn's rings lit from
  both sides, with the planet's shadow on them.
- **Track an object**: brackets and a tag on the selection, its ground track on the globe, ride
  along, the next ninety minutes of sunlight and shadow on the card.
- "Below it now": the country or sea under any Earth orbiter, with no network call.
- One control (or the H key) hides every panel; the screen as a printable postcard.
- Sharper maps on capable devices (a 4k tier); self-hosted typefaces.

### Changed
- Byte budgets are written down in `registry/budgets.yaml` and held by tests.
- The saved copy of a source is drawn at once and refreshed behind itself; a failed refresh keeps
  the last good copy instead of publishing an empty one.

### Fixed
- The visitor's city is guessed from their own UTC offset; deep links resolve names and catalogue
  numbers; labels never sit under a panel; counts agree across the whole panel.

## [0.3.0] - 2026-09-26

Beyond the Earth.

### Added
- **Twenty-one more worlds** you can search, fly to and read: Pluto, Jupiter's and Saturn's big
  moons, Phobos and Deimos, Titan, Triton, Charon, Uranus's five; eight dwarf planets and the two
  interstellar visitors, each where JPL's orbit puts it today.
- **Six new trips**: where we have landed on the Moon, out past Jupiter, from your ground to the
  space station, a year in a minute, chasing the solar eclipse, and travel to exoplanets
  (TRAPPIST-1 at its own scale).
- Eclipses computed in the browser, with the Moon's shadow drawn on the Earth.
- **Deep links**: a trip at a stop, an object, a time and a place in the address, and a share page
  with a picture for every trip.
- **Sound**, off until you turn it on: four public-domain music beds and three stings.
- Twenty-one more landing sites and ten more deep-space craft, each with a cited source.

### Fixed
- Dozens of cards corrected to say only what is true: JWST's distance, Ceres's class, Tiangong's
  name, spent rocket stages that were listed as launches.
- A first visit on a phone became 730 kB lighter.

## [0.2.0] - 2026-09-12

Honest shapes and an honest sky.

### Added
- **The scale ladder**: 119 614 stars in three dimensions, the Milky Way, deep-sky objects, Local
  Group galaxies, black holes and pulsars with sourced fact sheets, every confirmed exoplanet.
- **Shapes for the long tail**: procedural models for Starlink, OneWeb, navigation satellites,
  radar imagers and about fifty launch vehicles, each checked against a triangle budget.
- Labels over the scene, colour keys, sunlit-or-shadow on every dot, one lap of orbit for the
  selection, a trajectory chart, one line of space weather, a "Coming up" list.
- A data-saver mode and a frame-rate guard that lowers detail on slow devices.

### Changed
- A 3D model that ships must have a registry row, a licence and a credit; CI refuses one without.

### Fixed
- Rockets point where they are going (they had been drawn 87.5 degrees out); Tiangong's solar
  arrays are attached; Terra is no longer a flat cut-out; the Milky Way no longer paints over the
  Earth.

## [0.1.0] - 2026-09-07

The first public map.

### Added
- Every tracked satellite at its real position, worked out in the browser with SGP4 from
  CelesTrak's elements; upcoming launches; the Deep Space Network's live links; asteroids and
  comets on their orbits; pads, dishes and observatories on the ground.
- The Sun, Moon and planets computed with no network call.
- Guided trips; "the odd things we sent"; search with fly-to; NASA 3D models loaded as you approach.
- A registry of YAML files as the architecture, with generated mirrors and a validator in CI.
- No server, no database, no build step.

[Unreleased]: https://github.com/Sara-Managed-Projects/space-radar/commits/main
