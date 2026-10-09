# Changelog

What changed for a visitor, a teacher running a copy, or a contributor. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); [docs/RELEASING.md](docs/RELEASING.md)
says what counts as major, minor and patch here.

The project was built in the open for a month before it had releases. The `0.x` entries below are
milestones on `main`, summarised from about three hundred merged pull requests; they were never
tagged, and their dates are the day the last change in each landed.

## [Unreleased]

Five days, about fifty pull requests: the planetarium grew from nine trips to twenty-six, learned to
look up from the ground, learned to work with no network, and then, between 6 and 8 October, got
flybys that move the clock, forty star systems to fly into, a screen that plays on its own and the
Earth's air.

### Added
- **Sixteen new trips, 25 in all** (195 stops, 65 minutes of narration; a 26th and 205 stops by 8 October, see below): the constellations and
  the living Earth ([#465]); tonight from your street, why the Moon changes shape, the Sun today,
  the planets tonight and where we have driven on Mars ([#473]); the life of a star, black holes,
  through a telescope, a dark sky, asteroids that come close, satellites and junk, comets and
  meteors, the birth of the Solar System and back to the Moon ([#478]).
- **Present mode** for a classroom or a dome: a trip's words set large, no panels, a clicker's
  keys, and autoplay; after a trip ends you can keep flying from where it left you ([#473]).
- **The sky from the ground**: zoom, the air, constellation figures and grids,
  tonight's best passes and planets, and a red night mode ([#469]).
- **The nebulae from your own sky**: the 27 photographs show in the sky from the ground, at their
  true places and sizes, as faint as your sky, the Moon and the shutter make them ([#476]).
- **Other light**: the whole sky in infrared (WISE), microwaves (WMAP) or gamma rays (Fermi), in
  orbit and from the ground, false colour and labelled so ([#476]).
- **Stars are places**: fly to a star and it is a disc of its own size and colour; its card says
  the width is an estimate ([#476]).
- **Earth data overlays**: seven maps of measured data from NASA GIBS on the globe (sea
  temperature, sea ice, chlorophyll, vegetation, rain, aerosols, water vapour), each with its key,
  its date and its source ([#465]).
- **Maps for 20 moons**: every moon but Deimos now wears a public-domain map, and Phobos and
  Deimos have their measured shapes; flying to a world arrives on its lit face ([#464]).
- **The Earth, the Moon and Mars close up**: Blue Marble tiles for the Earth, shaded relief on the
  Moon and Mars, and the Sun as a star with today's numbered sunspot groups ([#474]).
- **Spacecraft in their own colours**: eight new NASA models (54 in all) and 24 rebuilt, lit by
  the world they are beside, with a contact shadow on the ground ([#466]).
- **The time scrubber**: a tape you drag, with steps of a minute, an hour or a day; **mission
  timelines** for eight missions; dated Today cards; an undo toast; and the debris in orbit, by the
  numbers ([#477]).
- **Share, embed, photo mode**: a share sheet made for a phone, one live object or one trip as an
  `<iframe>` ([docs/EMBEDDING.md](docs/EMBEDDING.md)), a photo mode with a frame and a caption, a
  page for every object, and a press page ([#475]).
- **Works with no network after one visit**: a service worker keeps the app, and the maps, models
  and sounds you have used; the status line says "Offline: showing saved copies from …" with the
  age of the oldest copy. Switch it off with `?sw=0`. No push notifications ([#467]).
- **Installable**, with a web manifest and home-screen icons; and a copy served from any folder,
  such as `http://server/space-radar/`, finds its saved data ([#467]).
- **Ready for contributors and classrooms**: a new README, [CONTRIBUTING.md](CONTRIBUTING.md), a
  code of conduct, a security policy, issue and pull-request templates, a one-page
  [design bar](docs/DESIGN_PRINCIPLES.md), [docs/RUN_LOCALLY.md](docs/RUN_LOCALLY.md) with
  `scripts/save_offline_data.py`, this changelog and a release workflow that publishes a zip that
  runs offline ([#463]).
- `scripts/test.sh` runs everything CI runs with one command ([#463]); `scripts/test.sh --quick`
  runs only the checks that touch the files you changed ([#467]).
- `tests/test_credits.py`: every data source and model in the registries must be credited ([#463]).
- The interface's rules are held by tests in CI ([#462]).

### Changed
- **A first visit is a third smaller**: 3.8 MB where it was 5.8 MB, counted uncompressed. The card,
  the trips, the spacecraft shapes and the deep-sky table are fetched when they are first wanted,
  and a deploy uploads the code without its comments (`scripts/minify_site.py`; the source in git
  and a local copy are unchanged, and there is still nothing to build to run it) ([#480]).
- **And half a megabyte lighter again**: 3.3 MB where it was 3.9 MB. The astronomy library is
  uploaded without its documentation (its licence stays), the cloud layer is the same picture at a
  lower WebP quality, and the byte gate no longer depends on how fast the machine that measures
  it is. An embedded frame of the Moon is 2.2 MB where it was 2.5 MB.
- Names and titles are set in the sans faces everywhere; the serif is gone ([#462]).
- The sky from the ground reads a small star file of its own instead of the 2.6 MB
  three-dimensional catalogue ([#476]).
- The giant planets are drawn with their flattened shape, and their rings were reworked ([#474]).
- The email subscription row is offered only where a subscription service is configured ([#462]).
- The refusals test takes minutes, not an hour ([#467]).
- [CREDITS.md](CREDITS.md) opens with a summary table and credits nine data sources the registry
  used and the file did not name ([#463]); README screenshots live under `assets/screenshots/`.

### Fixed
- Twelve trip stops on the Moon that stood on a black disc are shown in daylight, and the dark
  planets (Saturn, Jupiter, TRAPPIST-1's seven) are lit from the front ([#473]).
- A postcard's link now opens the sky at the exposure the picture was taken at ([#462]).
- Labels keep off the window's edge and rise above their own model; on a small phone the trip
  toolbar keeps the Voice button ([#462]).

### Added, 6 to 8 October ([#481] to [#519])
- **The sky from the ground, rounds two to four.** Constellation pictures and borders (the 85
  figures of Stellarium's modern sky culture, Free Art License), other peoples' skies, meteors and
  satellites in the air ([#481]); the sky's colour worked out from scattering, the land, 435 000
  more stars, time, and the deep sky tonight ([#497]); **Point your phone** at the sky, stars before
  lines, and rises and sets on the planets' cards ([#500]).
- **A flyby moves the clock.** Each craft has a small file of its own path from JPL Horizons;
  54 of 67 dated events set the clock and frame the craft with the world it passed. Cassini,
  Galileo, the Pioneers, and Apophis in 2029 ([#483]).
- **One continuous flight from the Earth to the edge**, and a light embed that boots a world or a
  crewed station in about 2.2 MB ([#486]).
- **Finding things and coming back**: ground arrivals that are pictures, search rows that say what a
  thing is, calendar files and the launch countdown ([#487]).
- **More models**: the ISS from NASA's full model and seven more NASA spacecraft ([#488]); craft
  nobody has published a mesh of, rebuilt from published dimensions, and models that go dark in a
  world's shadow ([#485]); four more NASA probes, MAVEN, Saturn V and the Shuttle on their pads,
  a shape per navigation constellation, and Surveyor ([#513]).
- **Worlds**: the giants from Hubble's 2025 maps as a second face ("As Hubble saw it"), Ceres and
  Vesta mapped on their shapes, Titan without seams ([#490]); Pluto and Charon in colour, Mercury,
  Venus's ground ([#484]); the eclipse's edges and path, Venus's haze, Saturn's bands, Mercury's
  relief, stars that glow and a pulsar's pulse ([#510]); the Earth's relief, air and storm tops, and
  dust, lightning and clouds on the other worlds ([#517]).
- **Forty star systems to fly into**, generated from the Archive's table, each with a computed
  habitable zone and cards that say what is measured ([#512]); a drawn, labelled **artist's
  impression** of a planet nobody has seen, and `#imagine=N` ([#514]).
- **A passport and one true sentence** on the home ([#491]); a share picture for every trip ([#495]).
- **The long tail** ([#496]): Earth events (fires, volcanoes, icebergs from NASA's EONET), the wind
  from NOAA's GFS, step by event on the clock, search icons and the photo mode's lens.
- **A screen that plays on its own**: reels of trips, a watchdog and kiosk manners ([#498]).
- **Trips, round five** ([#505]): flights that land on time, Just watch, one flight home.
- **Cards and live facts** ([#506]): a distance that ticks, a six-year curve, who is aboard, what
  just happened, the oldest things up there.
- **The public finishers** ([#509], [#516]): a scale badge and True size, a launch chip, Return to
  base, `?` for the keys, Andromeda's companions, a calm deep sky, the opening shot, Remind me and
  Seen it, and this week's story.
- **A new mark** for the tab, the home screen and the press kit ([#499]).
- **The narration, heard by a machine**: `scripts/listen_check.py` runs a speech-to-text round trip
  over every clip and a guard refuses a clip nothing has listened to; titles are said in one pass
  with the next sentence, and all 205 clips were rendered again ([#492], [#504]).

### Changed, 6 to 8 October
- **A first visit is 3.34 MB** where it was 3.86 MB (counted uncompressed, on a phone), then
  tightened again with WebP maps, GPU memory released for maps not on screen, and tighter budgets
  ([#494], [#511]). SGP4 for a big catalogue runs in a worker ([#507]).
- A regression walk of the whole product, `tools/walk.mjs`, found nine things where features meet;
  they are fixed ([#482]). A polish sweep ([#508]) put place-setting inside the Tonight view and
  made trips start at once.

### Fixed, 6 to 8 October
- **A privacy fix**: the browser's coordinates were handed to the app at full precision; the app now
  keeps 0.1 degrees (about 11 km) as the plan always said ([#489]).
- Search option rows are 48 px on a phone and never shrink ([#519]).

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
[#462]: https://github.com/Sara-Managed-Projects/space-radar/pull/462
[#463]: https://github.com/Sara-Managed-Projects/space-radar/pull/463
[#464]: https://github.com/Sara-Managed-Projects/space-radar/pull/464
[#465]: https://github.com/Sara-Managed-Projects/space-radar/pull/465
[#466]: https://github.com/Sara-Managed-Projects/space-radar/pull/466
[#467]: https://github.com/Sara-Managed-Projects/space-radar/pull/467
[#469]: https://github.com/Sara-Managed-Projects/space-radar/pull/469
[#473]: https://github.com/Sara-Managed-Projects/space-radar/pull/473
[#474]: https://github.com/Sara-Managed-Projects/space-radar/pull/474
[#475]: https://github.com/Sara-Managed-Projects/space-radar/pull/475
[#476]: https://github.com/Sara-Managed-Projects/space-radar/pull/476
[#477]: https://github.com/Sara-Managed-Projects/space-radar/pull/477
[#478]: https://github.com/Sara-Managed-Projects/space-radar/pull/478
[#480]: https://github.com/Sara-Managed-Projects/space-radar/pull/480
[#481]: https://github.com/Sara-Managed-Projects/space-radar/pull/481
[#482]: https://github.com/Sara-Managed-Projects/space-radar/pull/482
[#483]: https://github.com/Sara-Managed-Projects/space-radar/pull/483
[#484]: https://github.com/Sara-Managed-Projects/space-radar/pull/484
[#485]: https://github.com/Sara-Managed-Projects/space-radar/pull/485
[#486]: https://github.com/Sara-Managed-Projects/space-radar/pull/486
[#487]: https://github.com/Sara-Managed-Projects/space-radar/pull/487
[#488]: https://github.com/Sara-Managed-Projects/space-radar/pull/488
[#489]: https://github.com/Sara-Managed-Projects/space-radar/pull/489
[#490]: https://github.com/Sara-Managed-Projects/space-radar/pull/490
[#491]: https://github.com/Sara-Managed-Projects/space-radar/pull/491
[#492]: https://github.com/Sara-Managed-Projects/space-radar/pull/492
[#494]: https://github.com/Sara-Managed-Projects/space-radar/pull/494
[#495]: https://github.com/Sara-Managed-Projects/space-radar/pull/495
[#496]: https://github.com/Sara-Managed-Projects/space-radar/pull/496
[#497]: https://github.com/Sara-Managed-Projects/space-radar/pull/497
[#498]: https://github.com/Sara-Managed-Projects/space-radar/pull/498
[#499]: https://github.com/Sara-Managed-Projects/space-radar/pull/499
[#500]: https://github.com/Sara-Managed-Projects/space-radar/pull/500
[#504]: https://github.com/Sara-Managed-Projects/space-radar/pull/504
[#505]: https://github.com/Sara-Managed-Projects/space-radar/pull/505
[#506]: https://github.com/Sara-Managed-Projects/space-radar/pull/506
[#507]: https://github.com/Sara-Managed-Projects/space-radar/pull/507
[#508]: https://github.com/Sara-Managed-Projects/space-radar/pull/508
[#509]: https://github.com/Sara-Managed-Projects/space-radar/pull/509
[#510]: https://github.com/Sara-Managed-Projects/space-radar/pull/510
[#511]: https://github.com/Sara-Managed-Projects/space-radar/pull/511
[#512]: https://github.com/Sara-Managed-Projects/space-radar/pull/512
[#513]: https://github.com/Sara-Managed-Projects/space-radar/pull/513
[#514]: https://github.com/Sara-Managed-Projects/space-radar/pull/514
[#516]: https://github.com/Sara-Managed-Projects/space-radar/pull/516
[#517]: https://github.com/Sara-Managed-Projects/space-radar/pull/517
[#519]: https://github.com/Sara-Managed-Projects/space-radar/pull/519
