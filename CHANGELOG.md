# Changelog

What changed for a visitor, a teacher running a copy, or a contributor. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); [docs/RELEASING.md](docs/RELEASING.md)
says what counts as major, minor and patch here.

The project was built in the open for a month before it had releases. The `0.x` entries below are
milestones on `main`, summarised from about three hundred merged pull requests; they were never
tagged, and their dates are the day the last change in each landed.

## [Unreleased]

## [1.3.0] - 2026-10-21

Craft that look like themselves, and more ways in. Thirty-four new models of spacecraft, landers, rovers
and small bodies, each the agency's own or built here from cited metres and photographs, and every model
whose file carries them now keeps its own materials: gold and silver foil, white cloth, bare metal and
cells under glass. Webb and Hubble are in true materials, the Carina Nebula, M51, M81, M101, the
Sombrero and the Antennae are drawn from their own numbers, the Hubble Ultra Deep Field is drawn in depth, and the Small Magellanic Cloud ships with the
Bridge and the Stream. The Moon has its named places and China's landers, Mars has Spirit's and
Opportunity's tracks, Titan has its radar map, its seas and Huygens. A first visit offers three ways in,
a card can compare two worlds, What to show can keep only what is measured, and the page can be read in
four more languages, drafted and marked so. It is a minor release: everything new is added, and the
1.0.0 promises hold. A shared link (`v=1`, with `build=1.3.0` beside it), the saved-data format
(`/data/v1/`) and the registry row formats all still work; the new fields (`look:` on a model row,
`class: feature` on a site row) are optional, and no row a fork wrote against needs a change.

Counted on release day with `python3 scripts/count_facts.py`: 30 trips and 227 stops, 109 389
stars, 40 star systems, 30 nebula and galaxy photographs, 21 moons (20 with a map), 21 landing
sites on the Moon (20 in 1.2.0) and 12 on Mars, 165 models of spacecraft and small bodies (131 in
1.2.0, 34 more), 29 layers, 14 sources and 31 feeds, and 306 test files (290 in 1.2.0, 16 more).
19 deep-sky heroes (12 in 1.2.0), 936 records with a class, a source and a credit (890 in 1.2.0, 46
more) in 40 classes (38). The trips, stars, star systems, photographs, moons, layers, sources and feeds
are as they were in 1.2.0.

### Added
- **Spacecraft in their own materials** ([#1251]). On tier 1 and up, a model whose file carries real
  materials is drawn physically based: gold and silver blanket as crinkled foil, white beta cloth matt,
  cells under glass with their grid, nozzles and struts bare metal, lit by the same Sun. A phone keeps
  the flat look. `look: pbr | toon` on a model's row says which a file wears.
- **Webb and Hubble in true materials** ([#1262]): Webb re-baked from NASA's larger file with its
  mirror segments in gold metal, and Hubble rebuilt here at flagship detail in aluminised foil.
- **Crewed craft and NASA flagships** ([#1248]): Tiangong (the core and a lab module), the Shenzhou
  orbital module flying alone, THEMIS (NASA's own model), and New Horizons rebuilt from NASA's parts.
- **Deep-space craft** ([#1249]): Mars Express, Gaia, Hayabusa2 and Hope, built from published
  dimensions, where they were the generic probe.
- **Earth explorers** ([#1261]): EarthCARE, Biomass, Swarm (A, B and C) and MetOp-SG A1.
- **NASA science craft** ([#1262]): IRIS, TIMED, the two TRACERS, SERT 2 still joined to its Agena
  stage, and ISIS 1. Booms too long for the frame are drawn short, and the card says so.
- **The Moon's landers as they came to rest** ([#1246], [#1251], [#1260]): Vikram with its ramp down,
  Odysseus on its side, Blue Ghost, Surveyor 1 and 3, SLIM on its nose, the Chang'e 3 to 6 landers,
  Yutu beside its lander (a site of its own), and Lunokhod 1 and 2. **Zhurong** on Mars, wings spread.
  Every one is built here from cited metres and photographs and its card says "shape built from
  published dimensions and pictures". Yutu-2 has no site, because nobody publishes where it is now.
- **Small bodies in their real shapes** ([#1259]): Ryugu, Itokawa, and Didymos with Dimorphos, from
  their missions' shape models, each turning about its measured pole at its measured rate; Dimorphos
  orbits at its post-impact period. Ryugu and Itokawa are now always on the asteroids layer.
- **The Moon's named places** ([#1259]): Copernicus, Tycho, Shackleton and the south pole are places
  you can fly to, framed by their size. **Spirit's and Opportunity's tracks** (7.07 and 45.10 km) are
  drawn on Mars from the PDS Analyst's Notebook, and **Huygens** sits on Titan in its locked frame.
- **Titan by radar** ([#1245]): a Radar face from Cassini's swaths, the northern seas with a sun glint
  (the glint's shape is illustrative), and the detached haze at 500 km. Close to Saturn's ring plane its
  particles are drawn as lit balls of ice from the measured size distribution. Eris, Haumea (with its
  ring), Makemake, Sedna, Gonggong, Quaoar and Orcus each have their measured colour and shape.
- **Carina in 3D** ([#1252]): the photograph on our line of sight, and turned, a bipolar cavity with
  the dark lane in front, Eta Carinae and fourteen O and Wolf-Rayet stars at SIMBAD's places.
- **Galaxies from their own numbers** ([#1258]): M51 with NGC 5195 behind it, M81, M101, the Sombrero
  and the Antennae with their tidal tails, from published tilt, bulge, disc and pitch. **The Hubble
  Ultra Deep Field in depth**: 7 607 JADES galaxies, each at the distance of its redshift. **The Small
  Magellanic Cloud ships**, with the Magellanic Bridge and Stream at a modelled distance, labelled so.
- **WD J1330+6435, the first star confirmed to look green** ([#1240]): a white dwarf 281.6 light-years
  away whose sodium- and calcium-rich atmosphere takes out the yellow and red, on the exotics layer.
- **Three ways in** ([#1257]): a first visit offers Tonight, Explore and Guided trip side by side.
- **Compare two worlds** ([#1253]): a world's card opens a second world beside it at one scale, and a
  comparison lab; the passport notes what you have opened by kind (never a score); a deep-sky card with
  a reconstruction has a slider to the photograph.
- **How we know, as a filter** ([#1257]): What to show can keep only what is measured, by the four
  classes every card already uses, each with its count.
- **Arrival views and photo presets** ([#1257]) in the share sheet: two authored views of each planet,
  and Science, Cinematic and Telescope frames.
- **Four more languages, drafted** ([#1247], [#1254]): a language loader (`?lang=`) and Spanish,
  French, German and Brazilian Portuguese. All four are machine-drafted, say so, and show only with
  `?lang=` until a native reader has read them.
- **Radio ping-pong with Mars** ([#1216]), a Lab page: move the Earth–Mars distance and see the
  one-way and round-trip delay of a radio signal.

### Changed
- **Every deep-space hero says what it is** ([#1252]): each card names what is drawn in the honesty
  classes and where it comes from; the Tarantula and M43 had no sentence and now have one.
- **The Carina Nebula is 7 665 light-years away** ([#1252]), from the Homunculus's expansion
  parallax and Gaia, not 8 500 from an infobox.
- Cassini's card says which days JPL's path for it covers, and what is drawn outside them ([#1244]).
- Tonight's place controls share one look and are 44 px tall on a phone ([#1244]).

### Fixed
- The home's one true sentence is never blank ([#1244]).
- The trip camera keeps the station in sight, and the tape's new-Moon mark no longer hides under Now
  ([#1244]).
- Search finds a satellite by a legacy five-digit number, an Alpha-5 code or a nine-digit number, and
  no passing prompt takes a keystroke from it ([#1253]).
- A link with both `go=` and `at=`, or `imagine=` and `at=`, opens one place, not two ([#1257]).

### For contributors
- Thanks to @msuneelkrishna2006-blip for the radio ping-pong simulator ([#1216]).
- `scripts/check.sh` runs every check on macOS and never says PASS after a FAIL ([#1255]);
  `scripts/verify-deploy.sh` passes on a clean deploy ([#1257]).
- `docs/TRANSLATING.md` says how a language is drafted, reviewed and shown ([#1247]).
- The `model` look probe photographs a four-angle close-up sheet ([#1248]).
- How the release was assembled: waves 1 to 3 reached `main` as [#1250], [#1256] and [#1263].

## [1.2.0] - 2026-10-20

Deep space, finished, and the reason for every card. Orion and the Ring Nebula are drawn in 3D, the
Veil is a shell and three dust clouds are sheets, globular clusters are stars you can fly
into, and at the horizon the map shows WMAP's picture of the oldest light. Every card now says how we
know what it shows. The Moon has shadows from its own heights,
the giants have the rings they really have, three moons have plumes, and two new trips fly across the
Local Group and out to the edge. A card says where it is and Back walks your own path; typing "galaxies"
lists them; the map reads without WebGL, has a Motion switch, and a shared link carries its release.
It is a minor release: everything new is added, and the 1.0.0 promises hold. A shared link (`v=1`; the new
`build=` beside it is read and nothing acts on it), the saved-data format (`/data/v1/`) and the
registry row formats all still work, and no registry row that a fork wrote against needs a change.

Counted on release day with `python3 scripts/count_facts.py`: 30 trips and 227 stops, 109 389
stars, 40 star systems, 30 nebula and galaxy photographs, 21 moons (20 with a map), 20 landing
sites on the Moon and 12 on Mars, 131 spacecraft models (126 in 1.1.0), 29 layers, 14 sources and
31 feeds, and 290 test files. 12 deep-sky heroes, 890 records with a class, a source and a credit.

### Added
- **Orion and the Trapezium in 3D** (internal spec 0076, [#1195]). The photograph on our line of
  sight, and turned away from it a blister of lit gas on a reconstructed ionisation front, the dark
  cloud behind it, the Veil's Dark Bay in front, and the Trapezium's stars at SIMBAD's places as
  sharp points.
- **The cosmic microwave background at the horizon** ([#1192]). Past 30 billion light-years, and
  from just outside the horizon, WMAP's nine-year map of the oldest light is painted inside the
  horizon sphere with a colour scale in microkelvin. It says in words that where the map is put is an
  illustration, and a screen reader is given the same words. The ladder ends on an Edge rung.
- **How we know, on every card** ([#1193]). A last row that says what is drawn and how it is known:
  the photograph's telescope, camera, date and filters, the four position classes, the drawn
  classes and the two looks, and the glossary terms the card uses (five new). The HUD tag follows
  what is actually drawing, so a Helix seen on our line says "photograph". The Milky Way's card
  says what is measured and what is inferred.
- **The Sun's face of the day** ([#1194]). Close up, the half of the Sun facing the Earth wears
  SDO's newest 171 Å picture, dated and credited, turned with the Sun since it was taken; the far
  side is drawn in the picture's own false colour. It is a browse picture and the card says so.
  Coronal loops are in the code and off for this release.
- **The Moon at a low Sun** ([#1208]). Shadows are cast by the Moon's own LOLA heights where the Sun
  is low and the ground is near enough to resolve them (a crater under about two kilometres casts
  none, and the card says so), and the Apollo 15 and 17 rover traverses are drawn on the ground as
  Phil Stooke traced them. Only documented paths are drawn.
- **The ISS at sunrise** ([#1208]): the reddened light on the station at orbital sunrise.
- **Uranus's dark rings** ([#1202]): the rings keep the radii and widths of the fact sheet and are
  now as dark as their particles, a thirtieth of the clouds, not pale grey.
- **Jupiter's faint ring** ([#1202]): the halo and the main ring, from NASA's fact sheet, show from
  the night side and under the Deep exposure. The gossamer rings are left out.
- **The Great Red Spot at its dated place** ([#1202]): placed where JUPOS measured it, with the
  date on Jupiter's card.
- **Plumes where they were seen** ([#1205]): Pele, Tvashtar, Prometheus and Pillan on Io with five
  night-side hot spots, the tiger-stripe jets of Enceladus, and Triton's two dark geysers with their
  clouds carried west. Each is a row that names the craft and the date that saw it; the card says
  they may not be erupting now.
- **Two trips** ([#1200]): *Across the Local Group* and *Out to the edge of the universe we can see*, with voice,
  captions, a share page and an offline copy.
- **Globular clusters you can fly into** ([#1211]): all 33 are drawn as stars from Harris's core
  and tidal radii, and 36 open clusters, the Pleiades and the Beehive among them, show 23 685 of their Gaia
  members.
- **The Ring Nebula in 3D** ([#1213]): the ring, the gas along its axis and its halo, lit by
  Hubble's photograph, which is what you see from our side.
- **Remnants and dust** ([#1215]): the Veil as a shell, and the Horsehead, M78 and the Iris as
  sheets that dim and redden what is behind them and never glow. The Crab and the Coalsack were
  built too but held back: the Crab read as a pale egg from inside, and the Coalsack was too faint
  and too slow on a phone. They return when that is fixed.
- **Where you are, and the way back** ([#1212]): every card has a line of its parents (*Sun ›
  Jupiter › Europa*) whose parts fly there, a Back that walks your own last 20 steps in this
  session only, and a scale rail that marks the rung you are on.
- **Search by kind** ([#1210]): typing "galaxies", "nebulae" or "moons of Saturn" lists the records
  of that kind, grouped by class, with a toggle for those drawn in 3D.
- **Deep space made consistent** ([#1237]): Andromeda's companions M32 and M110 are points drawn by
  M31's hero, a member of a tilted disc sits in its plane (the Tarantula in the LMC's), the 800
  local-volume galaxies can be tapped and have cards, and a trip's intro warms the heroes it is
  about to visit.
- **Galaxy clusters and quasars** ([#1238]): Virgo, Coma, Fornax and Perseus as swarms of their own
  3 596 galaxies, and the quasars 3C 273 and 3C 279 as bright points at their distances in the
  map's one cosmology.
- **Readable without WebGL** ([#1239]): with no JavaScript, or no WebGL 2, the page says what Space
  Radar is, why the map cannot run, and lists all 30 trips; it is not a blank screen.
- **A Motion switch** ([#1239]) in What to show: Off is what `prefers-reduced-motion` is, with flights
  that arrive at once, trips paced by the reader and the deep sky's gas held still. A polite line
  tells a screen reader the stage, the selection and the trip.
- **Full share links** ([#1239]): a link that names a view carries `v=1` and `build=<release>`.
- **Five more spacecraft models** ([#1236]): Psyche, Lucy, JUICE, Hera and BepiColombo (as its
  cruise stack), built here from published dimensions and labelled so. 131 in all.
- **Lab simulators** have canonical addresses, Open Graph and LearningResource markup, written at build
  time ([#1214]).

### Changed
- **The four hero models are now ten**, and every one says on its card that it has not yet been
  reviewed by an astronomer: the Helix, the LMC, Andromeda and Triangulum of 1.1.0, plus Orion, the
  Ring, the Veil, the Horsehead, M78 and the Iris.
- **Every record on the map has a class, a source and a credit, and CI checks all four**
  ([#1201]). 890 records are sorted into 38 visual classes (and four of the house's); the generated
  [docs/COVERAGE.md](docs/COVERAGE.md) lists each, and a record drawn as an illustration may not
  describe itself with the words of a measurement. Asset rows in `registry/asset_sources.yaml` say
  what a visitor has of each offline.
- Star-system cards write "AU" the same way everywhere ([#1217]).
- The Earth's card links to an aurora forecast ([#1218]).

### Fixed
- **Gaia's licence is stated as ESA states it**, CC BY-NC 3.0 IGO, not CC BY-SA ([#1207]).
- **Nine places that cited no source now cite one**, and two were in the wrong place: Madrid's
  DSS-63 dish moves 21 km north (its latitude was 40.2414 and is 40.4312) and Chang'e 4 about 400 m
  ([#1201]).

### For contributors
- `BUILD` in `site/js/ui/urlstate.js` is the release a shared link was made by; a release bumps it
  with the changelog, and `docs/RELEASING.md` now says so.
- Thanks to @SwatiManjari for a doc comment on `isCompact` ([#1197]), and to @cc0006-coder for
  removing unused code in eight files ([#1219], [#1220], [#1221], [#1222], [#1223], [#1224],
  [#1225], [#1226]), a usage message for `tools/serve.py` ([#1227]), a `--help` for
  `gen_trip_pages.py` ([#1228]), and the AU and aurora-forecast changes above ([#1217], [#1218]).
- A first outside pull request is thanked by name when it merges, with three good first issues
  ([#1209]).
- Catalogue coverage runs in CI: `tests/test_coverage.py` and `scripts/check_registry.py` hold the
  class, source, credit and honesty words of every record ([#1201]); `tests/test_readme_facts.py`
  holds CONTRIBUTING and TRANSLATING to `count_facts.py`.
- Tools: a baseline gallery and per-scene numbers for the heroes (`sr.perf` under `?look=1`)
  ([#1196]); a look probe for `r12-access` and axe-core in the look job ([#1239]).
- How the release was assembled: waves 1 to 4 reached `main` as [#1198], [#1235] and [#1241].

## [1.1.0] - 2026-10-15

Deep space, rebuilt. The Helix, the Large Magellanic Cloud with the Tarantula inside it, Andromeda
and Triangulum are now drawn from what astronomers have measured of their shape, the map has one
cosmology from the Local Group out to the edge, and two new trips fly into it. Around that: a tour
of the map, a Drift that is paced for the eye and can show only space, a calmer card, Venus, Uranus
and Neptune redrawn, 54 more spacecraft models, and catalogue numbers of 100 000 and up. It is a
minor release: everything new is added, and the 1.0.0 promises hold. A shared link (`v=1`), the
saved-data format (`/data/v1/`) and the registry row formats from 1.0.0 all still work; the new
registry fields are optional, and a row written with `dist_kly` is read as before.

Counted on release day with `python3 scripts/count_facts.py`: 28 trips and 215 stops, 109 389
stars, 40 star systems, 30 nebula and galaxy photographs, 21 moons (20 with a map), 20 landing
sites on the Moon and 12 on Mars, 126 spacecraft models (72 in 1.0.0), 29 layers, and 13
publishers' data through 30 feeds.

### Added
- **Deep space rebuilt** (internal spec 0075, [#1178], [#1183], [#1185]). Every deep-sky object
  now has a parent, a distance with the method that found it, a way it is turned and a kind, and the
  map uses them:
  - **The Helix Nebula** is the photograph on our line of sight and, turned away from it, the disc
    and ring at their published tilts, 655 light-years away by Gaia's parallax.
  - **The Large Magellanic Cloud, with the Tarantula inside it.** The Cloud is a disc seen at its
    measured angles, 161 740 light-years away by eclipsing binaries, with the Small Cloud beside it.
    The Tarantula sits at its parent's distance, with its ionisation front, backlit clouds and R136
    as a tight cluster of resolved stars.
  - **Andromeda and Triangulum** are drawn from their own structure; close up, Andromeda is no
    longer a copy of the Milky Way.
  - **One cosmology**, Planck 2018, for every distance beyond the Local Group. Redshifts become
    distances in it, never a redshift times a constant. The observable universe's horizon is drawn
    at 46.2 billion light-years, and the map ends at 50 Gly, where it used to run to 169.
  - **The local volume**: 800 nearby galaxies from the Updated Nearby Galaxy Catalog, at their
    measured distances.
  - **Parents on cards and labels**: a card says what a thing is inside ("Inside the Large
    Magellanic Cloud"), a child is reached through its parent, and there is a way back. A child is
    named only when its parent is big enough on screen, so names no longer overlap.
  - **A mark per kind** on the sky: a galaxy's ellipse turned to its position angle, a ring, a
    cloud, a cluster's three dots.
  - **Nothing vanishes up close**: a nebula or galaxy keeps a body of its own as the photograph
    fades out, instead of disappearing as you fly in.
  - **The four hero models (the Helix, the LMC, Andromeda and Triangulum) are labelled** on their cards as not yet reviewed by an astronomer, and
    each says whether what you see is a photograph, a reconstruction, a model or an illustration.
- **Two trips into deep space**: *Into the Helix* (4 stops) and *Inside a neighbouring galaxy*
  (6 stops, from the Milky Way to the LMC, the Tarantula and R136 and back out), with the trips'
  voice, captions, a share page and an offline copy ([#1184]).
- **A tour of the map**: a question mark in the tool rail rings the real controls one at a time
  (nine steps in all, the last of them Drift), with a hand-drawn arrow and one sentence each, read
  aloud if you press Voice. A first visit gets an arrow at it for a few seconds. It never starts by
  itself, and a phone gets its own placement ([#1071], [#1176]).
- **Only space** in Drift: hides every label, dot, orbit line and tag so only the sky and its
  objects remain; `#drift=worlds,bare` in the address. It also hides the maps, aurora, lightning
  and eclipse shadows laid on the Earth ([#1070], [#1176]).
- **Venus, Uranus and Neptune redrawn** ([#1177]): Venus has the radar ground in relief, with
  slopes and shadows from USGS's Magellan heights, and its ultraviolet bands; Uranus wears Hubble's
  measured polar cap; Neptune has cirrus streaks, the Adams ring's arcs and a Great Dark Spot of
  1989 that is labelled as illustrative and taken out under Measured.
- **54 more spacecraft models, in eleven batches** ([#1054], [#1057], [#1061], [#1062], [#1063],
  [#1068], [#1069], [#1072], [#1074], [#1175], [#1186]): 54 new `.glb` files, 126 in all, where
  1.0.0 had 72, and four existing rows adjusted for the craft they stand for. They include XRISM, NuSTAR, Seasat, NOAA-21, the
  Soyuz, Progress, both Dragons, Shenzhou and Tianzhou, SWOT, NISAR, PACE, the first Starlinks, GPS
  by block, Galileo, MetOp, Envisat, the Sentinels, GLONASS, Europa Clipper and Curiosity. Some are the
  agency's own published model, the rest are built from published dimensions; [CREDITS.md](CREDITS.md)
  says which.
- Every page's footer links the Lab's 75 simulators, so they can be found without a sitemap
  ([#1052]).
- The README shows the latest release next to the licence badge ([#1066]).

### Changed
- **Drift's long flights are paced by what the eye sees.** A hop to Mars, Saturn or another star
  takes as long as its distance needs: the picture's scale changes at no more than one e-fold a
  second inside the Solar System, a third of what it was, and a flight between stars no longer ends in a jump. Short
  hops, round the Earth, are unchanged. A long flight now bends round the Earth rather than
  through it ([#1070], [#1176]).
- **The card's quiet row**: Light it and Seen it are one row of equal tiles under the actions, not
  two stray buttons ([#1073]).
- **Tonight's place box and Use my location share one line** ([#1073]).
- **TON 618 stands where it is now**: 18.3 billion light-years, from its redshift in the map's one
  cosmology. Its light left 10.8 billion years ago, which is what the card and the M87 trip's last
  card used to call its distance ([#1183]).
- **Neptune's card says what its spot is.** It said no spot was drawn while the map carried
  Voyager's 1989 one ([#1177]).
- On a phone the tour's captions are centred and stay clear of What to show and of the open sheet
  ([#1176]).

### Fixed
- **Fly to it, Follow and Ride along work from the ground.** They moved the camera and the sky view
  put it back every frame, so nothing happened. They now leave the ground first, and a toast says
  so ([#1073]).
- **A selected object no longer shakes**: four separate causes, from a dot placed ten times a
  second to the ground being entered on the Sun's stage, are fixed and held to a quarter of a pixel
  by a test ([#1073]).
- **Catalogue numbers of 100 000 and up are real.** The five-digit catalogue ran out in July, and
  every object catalogued since then was treated as not yet catalogued. One helper now reads five
  digits, Alpha-5 and nine digits ([#1173]).
- Kepler-16, a pair of stars, is followed, bracketed and labelled at the star, not at the point
  between the two ([#1176]).
- Venus's ground face no longer turns with the cloud deck ([#1177]).

### For contributors
- Thanks to @AnushreeKasturi for a test of which exoplanet rows belong to a star ([#905]), and to
  @Fire162 for removing five copy strings nothing used ([#1055], [#1056], [#1058], [#1059],
  [#1060]).
- A look probe for deep space photographs the baseline scenes of spec 0075 ([#1174]).
- The first-task picker leaves out issues reserved for a maintainers' batch ([#1065]).
- A pull request that changes what the tour points at must keep `registry/onboarding.yaml` current,
  and two tests say what was forgotten ([#1071]).

## [1.0.0] - 2026-10-13

The first release, and the first zip: the whole site with a saved copy of the data, so a classroom
copy starts with the network off ([docs/RUN_LOCALLY.md](docs/RUN_LOCALLY.md)). It is 1.0.0 because
three things are now promises: a shared link (`v=1`), the saved-data format (`/data/v1/`) and the
registry row formats keep working until a 2.0.0 ([docs/RELEASING.md](docs/RELEASING.md)).

Counted on release day with `python3 scripts/count_facts.py`: 26 trips and 205 stops, 109 389
stars, 40 star systems, 30 nebula and galaxy photographs, 21 moons (20 with a map), 20 landing
sites on the Moon and 12 on Mars, 72 spacecraft models, 29 layers, and 13 publishers' data
through 30 feeds.

The section below was written as the work landed, so some of its numbers are the day's own.

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

### Added, 12 and 13 October ([#1009] to [#1042])
- **Drift**: the camera wanders from one thing to the next with no route and no end, a few places
  in one neighbourhood and then the next one out, so it never jumps from the Earth to a galaxy.
  The first row of Just watch, or `#drift=1`; choose what to travel through, real models only,
  names on or off, three paces ([#1009], [#1031]).
- **Planets and moons shine by their real brightness** when they are small on screen: Venus
  outshines Sirius, and the Earth is a blue star from Mars ([#1010]).
- **The Sun, alive**: granules that are born and fade, loops on the limb at NOAA's active regions,
  flares NOAA reports and coronal mass ejections from NASA's list ([#1012], [#1034]).
- **Jupiter's weather**: eddies at the belt edges, turning ovals, the polar cyclones Juno found,
  and cloud detail close up, on Saturn, Uranus and Neptune too ([#1018], [#1032]).
- **Saturn's rings in fine**: Cassini's measured profile, with the Encke, Keeler, Huygens, Maxwell
  and Colombo gaps where they are, and the vortex inside the hexagon ([#1030]).
- **Mars has relief**: slopes and cast shadows from the laser altimeter's heights; Olympus Mons
  and Valles Marineris at a low Sun ([#1037]).
- **Ocean currents** under Earth data: streaks that follow the surface current, coloured by the
  water's temperature, from NOAA ([#1011], [#1031]).
- **The Earth's clouds stand up** from low orbit: tops lean toward you, throw longer shadows and
  keep the last light ([#1040]).
- **Two settings** in What to show: Quality (Auto, Low, Medium, High, Ultra) and the look,
  Measured or Film; Measured hides everything generated ([#1029]).
- **Cygnus from photographs**: the first craft whose shape was generated from NASA's pictures and
  cleaned by hand; its card says so ([#1036]).
- **The site says what it is**: `build.json` names the commit it was built from, the Sources sheet
  shows it, and a check opens an issue when the site or a dataset is a day behind ([#1028]).

### Changed, 12 and 13 October
- **The trips have a new voice** (Kokoro `af_heart`): sentences carried in one breath, pauses
  that vary, a natural pace; 59 minutes where there were 66 ([#1042]).
- **Pluto wears NASA's own colour map**, and Pluto and Charon no longer end on a hard line where
  nobody imaged them ([#1021], [#1033]).
- **The open sea reads as water**: the close-up Earth no longer shows the sea floor's survey
  tracks ([#1041]).
- "Sources" now counts publishers and "feeds" counts what is read from them, everywhere ([#1028]).

### For contributors, 12 and 13 October
- **A look from a machine that has time**: the `look` workflow photographs any branch in a real
  browser on a GitHub runner and fails on a page error ([#1024]).
- **A pull request that changes what is drawn shows a picture**, and a check holds it ([#1038]).

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

[Unreleased]: https://github.com/Sara-Managed-Projects/space-radar/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.3.0
[1.2.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.2.0
[1.1.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.1.0
[1.0.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.0.0
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
[#905]: https://github.com/Sara-Managed-Projects/space-radar/pull/905
[#1009]: https://github.com/Sara-Managed-Projects/space-radar/pull/1009
[#1010]: https://github.com/Sara-Managed-Projects/space-radar/pull/1010
[#1011]: https://github.com/Sara-Managed-Projects/space-radar/pull/1011
[#1012]: https://github.com/Sara-Managed-Projects/space-radar/pull/1012
[#1018]: https://github.com/Sara-Managed-Projects/space-radar/pull/1018
[#1021]: https://github.com/Sara-Managed-Projects/space-radar/pull/1021
[#1024]: https://github.com/Sara-Managed-Projects/space-radar/pull/1024
[#1028]: https://github.com/Sara-Managed-Projects/space-radar/pull/1028
[#1029]: https://github.com/Sara-Managed-Projects/space-radar/pull/1029
[#1030]: https://github.com/Sara-Managed-Projects/space-radar/pull/1030
[#1031]: https://github.com/Sara-Managed-Projects/space-radar/pull/1031
[#1032]: https://github.com/Sara-Managed-Projects/space-radar/pull/1032
[#1033]: https://github.com/Sara-Managed-Projects/space-radar/pull/1033
[#1034]: https://github.com/Sara-Managed-Projects/space-radar/pull/1034
[#1036]: https://github.com/Sara-Managed-Projects/space-radar/pull/1036
[#1037]: https://github.com/Sara-Managed-Projects/space-radar/pull/1037
[#1038]: https://github.com/Sara-Managed-Projects/space-radar/pull/1038
[#1040]: https://github.com/Sara-Managed-Projects/space-radar/pull/1040
[#1041]: https://github.com/Sara-Managed-Projects/space-radar/pull/1041
[#1042]: https://github.com/Sara-Managed-Projects/space-radar/pull/1042
[#1052]: https://github.com/Sara-Managed-Projects/space-radar/pull/1052
[#1054]: https://github.com/Sara-Managed-Projects/space-radar/pull/1054
[#1055]: https://github.com/Sara-Managed-Projects/space-radar/pull/1055
[#1056]: https://github.com/Sara-Managed-Projects/space-radar/pull/1056
[#1057]: https://github.com/Sara-Managed-Projects/space-radar/pull/1057
[#1058]: https://github.com/Sara-Managed-Projects/space-radar/pull/1058
[#1059]: https://github.com/Sara-Managed-Projects/space-radar/pull/1059
[#1060]: https://github.com/Sara-Managed-Projects/space-radar/pull/1060
[#1061]: https://github.com/Sara-Managed-Projects/space-radar/pull/1061
[#1062]: https://github.com/Sara-Managed-Projects/space-radar/pull/1062
[#1063]: https://github.com/Sara-Managed-Projects/space-radar/pull/1063
[#1065]: https://github.com/Sara-Managed-Projects/space-radar/pull/1065
[#1066]: https://github.com/Sara-Managed-Projects/space-radar/pull/1066
[#1068]: https://github.com/Sara-Managed-Projects/space-radar/pull/1068
[#1069]: https://github.com/Sara-Managed-Projects/space-radar/pull/1069
[#1070]: https://github.com/Sara-Managed-Projects/space-radar/pull/1070
[#1071]: https://github.com/Sara-Managed-Projects/space-radar/pull/1071
[#1072]: https://github.com/Sara-Managed-Projects/space-radar/pull/1072
[#1073]: https://github.com/Sara-Managed-Projects/space-radar/pull/1073
[#1074]: https://github.com/Sara-Managed-Projects/space-radar/pull/1074
[#1173]: https://github.com/Sara-Managed-Projects/space-radar/pull/1173
[#1174]: https://github.com/Sara-Managed-Projects/space-radar/pull/1174
[#1175]: https://github.com/Sara-Managed-Projects/space-radar/pull/1175
[#1176]: https://github.com/Sara-Managed-Projects/space-radar/pull/1176
[#1177]: https://github.com/Sara-Managed-Projects/space-radar/pull/1177
[#1178]: https://github.com/Sara-Managed-Projects/space-radar/pull/1178
[#1183]: https://github.com/Sara-Managed-Projects/space-radar/pull/1183
[#1184]: https://github.com/Sara-Managed-Projects/space-radar/pull/1184
[#1185]: https://github.com/Sara-Managed-Projects/space-radar/pull/1185
[#1186]: https://github.com/Sara-Managed-Projects/space-radar/pull/1186
[#1192]: https://github.com/Sara-Managed-Projects/space-radar/pull/1192
[#1193]: https://github.com/Sara-Managed-Projects/space-radar/pull/1193
[#1194]: https://github.com/Sara-Managed-Projects/space-radar/pull/1194
[#1195]: https://github.com/Sara-Managed-Projects/space-radar/pull/1195
[#1196]: https://github.com/Sara-Managed-Projects/space-radar/pull/1196
[#1197]: https://github.com/Sara-Managed-Projects/space-radar/pull/1197
[#1198]: https://github.com/Sara-Managed-Projects/space-radar/pull/1198
[#1200]: https://github.com/Sara-Managed-Projects/space-radar/pull/1200
[#1201]: https://github.com/Sara-Managed-Projects/space-radar/pull/1201
[#1202]: https://github.com/Sara-Managed-Projects/space-radar/pull/1202
[#1205]: https://github.com/Sara-Managed-Projects/space-radar/pull/1205
[#1207]: https://github.com/Sara-Managed-Projects/space-radar/pull/1207
[#1208]: https://github.com/Sara-Managed-Projects/space-radar/pull/1208
[#1209]: https://github.com/Sara-Managed-Projects/space-radar/pull/1209
[#1210]: https://github.com/Sara-Managed-Projects/space-radar/pull/1210
[#1211]: https://github.com/Sara-Managed-Projects/space-radar/pull/1211
[#1212]: https://github.com/Sara-Managed-Projects/space-radar/pull/1212
[#1213]: https://github.com/Sara-Managed-Projects/space-radar/pull/1213
[#1214]: https://github.com/Sara-Managed-Projects/space-radar/pull/1214
[#1215]: https://github.com/Sara-Managed-Projects/space-radar/pull/1215
[#1216]: https://github.com/Sara-Managed-Projects/space-radar/pull/1216
[#1217]: https://github.com/Sara-Managed-Projects/space-radar/pull/1217
[#1218]: https://github.com/Sara-Managed-Projects/space-radar/pull/1218
[#1219]: https://github.com/Sara-Managed-Projects/space-radar/pull/1219
[#1220]: https://github.com/Sara-Managed-Projects/space-radar/pull/1220
[#1221]: https://github.com/Sara-Managed-Projects/space-radar/pull/1221
[#1222]: https://github.com/Sara-Managed-Projects/space-radar/pull/1222
[#1223]: https://github.com/Sara-Managed-Projects/space-radar/pull/1223
[#1224]: https://github.com/Sara-Managed-Projects/space-radar/pull/1224
[#1225]: https://github.com/Sara-Managed-Projects/space-radar/pull/1225
[#1226]: https://github.com/Sara-Managed-Projects/space-radar/pull/1226
[#1227]: https://github.com/Sara-Managed-Projects/space-radar/pull/1227
[#1228]: https://github.com/Sara-Managed-Projects/space-radar/pull/1228
[#1235]: https://github.com/Sara-Managed-Projects/space-radar/pull/1235
[#1236]: https://github.com/Sara-Managed-Projects/space-radar/pull/1236
[#1237]: https://github.com/Sara-Managed-Projects/space-radar/pull/1237
[#1238]: https://github.com/Sara-Managed-Projects/space-radar/pull/1238
[#1239]: https://github.com/Sara-Managed-Projects/space-radar/pull/1239
[#1240]: https://github.com/Sara-Managed-Projects/space-radar/pull/1240
[#1241]: https://github.com/Sara-Managed-Projects/space-radar/pull/1241
[#1244]: https://github.com/Sara-Managed-Projects/space-radar/pull/1244
[#1245]: https://github.com/Sara-Managed-Projects/space-radar/pull/1245
[#1246]: https://github.com/Sara-Managed-Projects/space-radar/pull/1246
[#1247]: https://github.com/Sara-Managed-Projects/space-radar/pull/1247
[#1248]: https://github.com/Sara-Managed-Projects/space-radar/pull/1248
[#1249]: https://github.com/Sara-Managed-Projects/space-radar/pull/1249
[#1250]: https://github.com/Sara-Managed-Projects/space-radar/pull/1250
[#1251]: https://github.com/Sara-Managed-Projects/space-radar/pull/1251
[#1252]: https://github.com/Sara-Managed-Projects/space-radar/pull/1252
[#1253]: https://github.com/Sara-Managed-Projects/space-radar/pull/1253
[#1254]: https://github.com/Sara-Managed-Projects/space-radar/pull/1254
[#1255]: https://github.com/Sara-Managed-Projects/space-radar/pull/1255
[#1256]: https://github.com/Sara-Managed-Projects/space-radar/pull/1256
[#1257]: https://github.com/Sara-Managed-Projects/space-radar/pull/1257
[#1258]: https://github.com/Sara-Managed-Projects/space-radar/pull/1258
[#1259]: https://github.com/Sara-Managed-Projects/space-radar/pull/1259
[#1260]: https://github.com/Sara-Managed-Projects/space-radar/pull/1260
[#1261]: https://github.com/Sara-Managed-Projects/space-radar/pull/1261
[#1262]: https://github.com/Sara-Managed-Projects/space-radar/pull/1262
[#1263]: https://github.com/Sara-Managed-Projects/space-radar/pull/1263
