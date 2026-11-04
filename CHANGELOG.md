# Changelog

What changed for a visitor, a teacher running a copy, or a contributor. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); [docs/RELEASING.md](docs/RELEASING.md)
says what counts as major, minor and patch here.

The project was built in the open for a month before it had releases. The `0.x` entries below are
milestones on `main`, summarised from about three hundred merged pull requests; they were never
tagged, and their dates are the day the last change in each landed.

## [Unreleased]

## [1.7.10] - 2026-11-04

### Added

- **Seventeen new tests for small functions that had none**, each in its own file and its own CI step (public #619 to #628, #704, #712, #720, #728, #735, #742, #749, #757):
  `hermite` and `sampled` (`tests/test_propagate_sampled.mjs`), `staticPos` (`test_propagate_static.mjs`), the Kepler solvers (`test_kepler.mjs`), `editDistance`
  (`test_edit_distance.mjs`), `launchAzimuth` (`test_launch_azimuth.mjs`), `decimalYear` (`test_decimal_year.mjs`), `latText` and `lonText` (`test_card_latlon.mjs`),
  the exoplanet face's `starRgb`, `habitableFlux` and `radiusFromMass` (`test_exoface_helpers.mjs`), `bisect` (`test_bisect.mjs`), `typeWords`
  (`test_type_words.mjs`), `degWords` (`test_live_degwords.mjs`), `orbitsEarth` (`test_shadow_orbits_earth.mjs`), `placeLabel` (`test_live_placelabel.mjs`),
  `groundRelativeAzimuth` (`test_ascent_ground_azimuth.mjs`), `normaliseFixed` (`test_fixed_normalise.mjs`), `sphericalToBodyFixed`
  (`test_frames_spherical_to_bodyfixed.mjs`) and `bodyFixedToSpherical` (`test_frames_bodyfixed_to_spherical.mjs`). Each pins the values the code returns today, edge
  cases included.
- **Edge cases added to nine existing tests**: the azimuth wrap and the refused spellings of `parseCam`, the poles and the date line in `parsePlaceValue`, both ends
  of the ellipse band in `ellipseRatio`, one case per spelling of `splitCometName`, five more year ends in `isoWeek`, the ends of the `countBrighter` search, an
  empty `closestWords`, two close marks, a tie and a short reach in `nearestMark`, and an empty address in `subscribePayload` (public #707, #715, #723, #731, #738,
  #745, #752, #764, #623).

### Changed

- **Three tests stop holding numbers that move.** `tests/test_starsnotable.mjs` asks for at least ten measured stellar radii instead of exactly eleven (public #617);
  `tests/test_seo_pages.py` asks for the events index to link every event and at least six, instead of exactly six (public #618); and `tests/test_readme_facts.py`
  also holds the star count `docs/RUN_LOCALLY.md` quotes to the registry, as it already did for the trips in `CONTRIBUTING.md` and `docs/TRANSLATING.md` (public #629).
  No behaviour of the app changes.

## [1.7.20] - 2026-11-04

### Fixed

- **"Keep for offline" keeps the sharper maps a trip may ask for later.** The list was built for the texture tier the device was at when the
  button was pressed, so a trip kept on a device that was promoted a few seconds afterwards still asked for 4 k maps the cache did not hold,
  and the Earth's and the Milky Way's own maps were in no trip's list at all. It now takes the highest tier the visit may reach (the device's
  ceiling while Auto still promotes, the chosen quality's own tier otherwise) and the maps the page fetches whatever the stop (the Earth's day
  for the clock's month, night, water and relief, and the Milky Way). `keptTier()` in `ui/keeptrip.js`, held by `tests/test_keeptrip.mjs` for
  `moon-landings`. (internal #564)
- **Spirit's line on Mars can be seen from where its site is arrived at.** The fade of a traverse (whole inside 120 km, none past 320 km) left
  Spirit's 7.07 km line at 0.3 % from the 309 km the arrival pose stands from it, and a thin gold line on Mars's rust ground was lost even
  where it was drawn. A line shorter than 15 km now has the fade's distances stretched by 15 km over its length (at most 2.5 times) and its
  ribbon widened up to 2.2 times, with a dark rim, as it shrinks on the screen; the Moon's two lines and Opportunity's are as they were, a
  phone (no tiles) still draws none, and a world still has one mesh a line. (internal #992)
- **The undo toast no longer lies across the sheet's tabs on a phone.** With the sheet full at 390 by 844 "Moved to Planets, Back to where you
  were" stood under the top bar, over the Earth, Planets, Stars and Tonight row; it now stands at the foot of the screen. (internal #569)

### Changed

- **Worlds too small to show a facet are drawn with a 16 by 12 sphere.** Thirty-one worlds of 6 016 triangles each were 190 000 of the
  triangles of every deep stop, where each is a dot under two pixels wide; below 0.4 % of half the view's height (a disc 1.8 px in radius at 900
  px) a world now wears a sphere whose facets sag 0.04 px, and the 64 by 48 one again from there up. The most a stop of the two trips to the edge
  draws fell from 254 694 to 84 774 triangles at 1600 by 900 (from 254 310 to 84 390 at 390 by 844), with the stops looking the same. The row
  `triangles_per_stop` goes from 270 100 to 100 000. (internal #994)

### Added

- **Three look probes.** `r1720-mars` (Spirit's and Opportunity's traverses from the app's arrival pose and three heights, each with the line
  and the rover hidden), `r1720-tris` (a census of the triangles of a trip's stops by group, beside the renderer's own count) and `r1720-owed`
  (the sunspot close-up, the 'Following Saturn' line, Earth events from the copy, the dark-sky stop, names in the Earth frame and the undo toast
  over the sheet's tabs), in `tests/probes/look/`, documented in `tools/README.md`. (internal #565, #566, #569, #992, #994)
## [1.7.9] - 2026-11-03

### Added

- **Curiosity's entry, descent and landing, 6 August 2012, as a Moment: the seven minutes.** From 30 seconds before the Martian air to the descent
  stage's crash, on JPL's own clock (entry at 05:10:45.7 UTC, the parachute at 05:15:04.9, the heat shield at 05:15:24.6, the rover let go of
  the stage at 05:17:38.6, touchdown at 05:17:57.3, 431.6 s after the entry; the signal reached the Earth 13 min 48 s later). The heights
  and speeds are NASA's press kit's typical case: the entry at 131 km over the landing site's ground at 5.9 km/s, the parachute at 11 km and 405
  m/s, the heat shield off at 8 km and 125 m/s, the back shell off at 1.6 km and 80 m/s with the eight landing engines lit, the rover let go at about 20
  m, 7.6 m of bridle, touchdown at about 0.75 m/s, the stage coming down some 650 m away. Between them the path is ours and says so: a point mass
  on a round Mars that the generator searches (an entry angle and a lift) until it is at the published height and speed at the published second
  (it finds 15.2 degrees, the figure the mission reports, and a peak deceleration of 9.7 g at 85 s, where the press kit has about +90 s); the
  heading is ours; the back shell's drift, the heat shield's fall and the stage's flyaway are illustrative. The closing caption quotes "Touchdown
  confirmed. We're safe on Mars!" (Allen Chen, JPL). No sound plays (no recording of the room has a clear free licence).
- **New Horizons at Pluto, 14 July 2015, as a Moment: from six hours out to forty minutes after.** The path is JPL Horizons' (the repository's
  own file of it, which follows JPL's track to a few kilometres), turned into Pluto's frame: 12 488 km over the surface at 13.78 km/s, the
  approach over the lit side, the craft over the night side from the pass, Pluto a crescent as it looks back, Charon about 14 minutes after Pluto
  and 29 000 km away. T-0 is the second Horizons has the craft nearest Pluto, 11:48:29 UT (read again through Horizons' API on 3 November: its range
  rate changes sign between 11:48 and 11:49); NASA's timetable has the closest approach at 11:49:57 UTC, 88 seconds later, and the captions give both and
  say the two are not reconciled. Charon is drawn above longitude 0 on Pluto's equator at 19 591 km (the two keep one face to each other): ours. The
  "phone home" signal at 00:53 UTC on 15 July closes it. Pluto's thin haze is not drawn: only the planet's rim glows.
- **Another world for the Moments engine.** A moment may say `world: "mars"` or `"pluto"`: `moments/trajectory.js` `setWorld` turns the radius, the
  pull, the rotation and the scale height the paths and the falling parts read into that world's, and `moments/world.js` gives the frame (the
  pole and the prime meridian from astronomy-engine's `RotationAxis`, the IAU report's elements) and the Sun seen from it. The stage draws that
  world's map, a butterscotch sky and rust-and-pebble ground on Mars (the Sun is 36 degrees up at touchdown, mid-afternoon at Gale as the press kit
  says), no sky and a blue rim on Pluto, and Charon in the Moon's place. A vectors path may be in `world` frame; a vehicle may say `marker: false`;
  the new effect `tether` draws a cord from each of several points on one vehicle to the matching points on another (Curiosity's bridle). docs/MOMENTS.md.
- **The aeroshell and the descent stage of the Mars Science Laboratory, built from NASA's numbers and photographs** (`msl-entry`: the 4.5 m heat
  shield of charcoal tiles and the white back shell with its plugs, hatch and parachute canister, 6 236 triangles; `msl-descent-stage`: the beam frame
  with six gold tanks, four pods of two landing engines, the mast and the rover's struts, 7 798 triangles), in `tools/msl-builder/` on the Vostok builder's
  part library. NASA publishes no model of either (NASA 3D Resources and science.nasa.gov, read 3 November: the rover and InSight's cruise stage and lander
  only); the rover is NASA's own Curiosity model, as before. Each row says what was cited and what was read off a photograph (no drawing with dimensions
  of the back shell or the stage was found: illustrative to about ten per cent).
- **Both are on the shelf**, with "Replay this moment" on Gale crater's card (Curiosity), on Pluto's and Charon's and on New Horizons'; the card words are in
  es, fr, de and pt (machine-drafted) and in English in the six newer languages. The shelf's note no longer counts the stories.
- Two look probes, `moments-curiosity` and `moments-newhorizons`.
- **Their shelf pictures**: the sky crane lowering the rover (second 420) and the probe passing a lit Pluto (second -12), rendered by the app with `tools/moment-pictures.probe.js`.

### Changed

- The foot line of a Moment names what it draws on a Mars moment (`groundNoteMars`), and the "drawn" sentence names parachutes and the glow of an entry.

### Not done

- **The cruise stage** (let go ten minutes before the entry, so it is before the first frame), **the two tungsten ballast drops and the back shell's thruster
  firings** are in the captions and not drawn. The rover is drawn with its wheels down all the way (NASA's model is one pose: the real wheels folded until
  just before touchdown). The parachute is a drawn canopy of 16 m on lines of 50 m, not NASA's colours or its gores' pattern.
- **The 88 seconds** between Horizons' and NASA's times for New Horizons' closest approach are not explained here.
- **Words**: the two stories' words are English until a translator has them; only the shelf's cards are translated.
## [1.7.15] - 2026-11-04

### Added

- **Nine launchers that were drawn as "a small commercial launcher" or as the generic rocket now have a row of their own, each from one page
  read on 2026-11-04.** Orbex Prime (19 m, 1.45 m), Skyrora XL (22.7 m, 2.2 m), RFA One (30 m, 2 m), Latitude's Zephyr (30 m, 2 m), Nebula-1
  (30.2 m, a 3.35 m first stage under a 2.25 m second), Maia (50 m, 3.5 m), Miura 5 (35.7 m, 2.0 m), Epsilon S (27.2 m, 2.5 m) and SSLV (34 m,
  2 m). A fairing diameter, a livery or a leg count that the page does not give is left out. Epsilon S and SSLV count one first-stage solid
  motor, which their infoboxes name without a count, and say `inferred`; Miura 5 uses five engines (its page contradicts itself, and
  a second page says five) and says where the heights differ. The last-resort row no longer lists the four small launchers among those with no
  source. `tests/test_contract.mjs` asks for a made-up Orbex vehicle to show a launch drawn by provider, since Orbex Prime has its own row now.
- **Nine events on the NEAR Shoemaker, Stardust and Deep Impact timelines**, each with the date (and time, where the page gives one) read on the
  NSSDCA page the mission cites: NEAR past Mathilde (27 June 1997, 12:56 UT), its Earth swingby (23 January 1998, 07:23 UT) and its first pass of
  Eros (23 December 1998, 18:41 UT); Stardust past Earth on 15 January 2001 and 14 January 2009; Deep Impact past Earth and the Moon on 31 December
  2007, 29 December 2008 and 27 June 2010. The Eros orbit insertion now carries its time, 14 February 2000, 15:33 UT. The Stardust and Deep
  Impact Earth flybys name no world: their path files hold no Earth-centred window on those days.
- **Six more sky-event pages for 2027: the Lyrids (23 April), Eta Aquariids (6 May), Perseids (13 August), Orionids (22 October), Leonids (18
  November) and Geminids (14 December).** Each has the day and hour of the maximum from the International Meteor Organization's 2027 calendar,
  the Moon's lit fraction computed for that hour, and a link into the sky then. `tests/test_seo_pages.py` now asks for at least six events
  instead of exactly six.
## [1.7.16] - 2026-11-04

### Changed

- **Thirteen spacing values moved onto the 4 px grid.** The loading screen's orbit sits 24 px above the title (was 22), the dot before a
  label's name is 4 px from it (5), the copied-link toast is padded 8 px above and below (10), the on-map tag is padded 4 px at the foot (5)
  with 8 px between its glyph and its name (6) and 4 px either side of the dot between its readouts (6), the off-screen chevron's gap is 4 px
  (6) and its padding 4 12 4 8 (3 10 3 6; it is still 28 px tall), and the Explore panel's collapse button is nudged up 4 px (6). The count of
  off-grid values the guide-rails test holds went from 17 to 5.
- **The loading screen's three lines and the far-places rows' spoken names are in `copy/en.js`**, where a translator finds them: `app.bootSky`,
  `bootEarth` and `bootCatalogues`, and `ladder.rowName` and `rowNameLoading` as templates (the two drafts that had the old
  `ladder.notLoaded` carry the same words in the new keys). The words and what is read aloud are unchanged.
- **The postcard reads its colours from the page's tokens.** `ui/printcompose.js` no longer writes the palette again as canvas literals: it
  takes them from `pageColours()` in `ui/postcard.js` (now exported, with `ember` and `glass` added; the palette's own values are the fallback
  when there is no page). The printed postcard is the same.
- **The press page's two borders say `var(--sr-line)`**, not a fallback hex that never applied, and the accuracy page's "measured" and
  "modelled" badges take two named tokens (`--sr-badge-measured`, `--sr-badge-modelled`) in `css/static.css` instead of two hex colours in a rule.

### Fixed

- **A trip card no longer says nobody has travelled further than the Moon.** In "From your roof to the edge" the Moon's card now says only a few
  people have gone further, swinging round the far side of the Moon, as the Artemis II card does; the source (NASA's page on Artemis II passing
  Apollo 13's record) is in the trip's facts comment.
- **The long-press chooser is a list of buttons.** Its `listbox` and `option` roles are gone, so a screen reader meets the buttons inside it.
- **The timeline and the Tonight sky-time strip show a keyboard focus ring** (ember, drawn inside their box, which clips what is outside it).
- **With reduced motion the phone's first-visit key hint no longer slides** behind the sheet: it jumps with it, as the sheet does.
- **The press page's link preview says its size and what the picture shows** (`og:image:width`, `og:image:height`, `og:image:alt`), as the embed
  page's does.
- **The glossary has the four eclipse words** (umbra, penumbra, totality, annular) the registry had and the app lacked.
## [1.7.17] - 2026-11-04

### Added

- **Eleven more famous stars have a line of their own: Alnilam, Alnitak and Mintaka (Orion's Belt), Bellatrix and Saiph (Orion), Dubhe, Sadr, Alphard, Hamal, Shaula and Mirfak.**
  Each is a row in `registry/stars-notable.yaml` with one sentence of at most 160 characters, every claim read on the Wikipedia page the row cites
  on 2026-11-04, and no distance or magnitude (the card prints those from the catalogue). Regulus, Canopus, Kochab, Rasalhague and Alioth are not here.
- **Seven famous stars carry a measured radius, so their cards say "measured" instead of "estimated": Vega, Altair, Aldebaran, Pollux, Fomalhaut, Polaris and Tau Ceti.**
  Each row cites the arXiv page of the paper and quotes the sentence the number was taken from: Vega's and Altair's are equatorial radii (both spin fast), Polaris's is
  a mean (it pulses), and Pollux's is the radius Hatzes et al. derive from an interferometric diameter of Nordgren et al. Fomalhaut also carries the paper's temperature. Antares has no
  radius with an error bar in any paper read, so it keeps the colour-index estimate.
- **Two more fact sheets among the extremes: VY Canis Majoris and R136a1.** Positions, distances, masses and magnitudes are the Wikipedia infobox values read on 2026-11-04;
  VY Canis Majoris pulses between magnitude 6.5 and 9.6 and the row keeps the infobox's V magnitude of 7.95, and R136a1's distance is the Large Magellanic Cloud's, as its article says.
  The fact-sheet count in `tests/test_exotics.mjs` and `tests/test_a45.mjs` is now 25, and the measured-radius count in `tests/test_starsnotable.mjs` is 18.
## [1.7.18] - 2026-11-04

### Added

- **The boot timeline is also run as a phone.** The CI screenshots job (`screens.yml`) already wrote `boot-timeline.json` for a desktop window; it
  now boots the same tree a second time at 390 by 844 with touch (`scripts/boot-timeline.mjs --mobile`) and uploads `boot-timeline-phone.json` beside
  it: first paint, the main module, layers ready, every long task and the total blocking time. It still only reports; the two budget rows are not
  gated until someone has read the first runner numbers. (internal #528)
- **Tests that hold the stars' order.** `tests/test_star_magnitude.mjs` holds, on the real `stars3d.bin` and the real functions, that a brighter
  nearby star is never drawn smaller or fainter (the sky's curve and the 3D draw's, whose arithmetic it pins), that the catalogue's apparent
  magnitude agrees with its absolute magnitude and distance for the 921 drawn stars within 100 ly, that on the stellar rung doubling the
  distance costs 5 log10 2 magnitudes, that the Eye, Camera and Deep exposures only ever let more stars through, and that a cooler star
  (higher B-V) is never bluer in the colour its sprite is given. `magToSize` and `magToAlpha` in `scene/starfield.js` are exported for it; nothing
  else about them changed. (internal #818)
- **A reduced-motion regression for the deep sky.** `tests/test_deep_reduced_motion.mjs` runs the real deep-sky coordinator with the real Helix
  hero and an LMC holder for ten simulated minutes: with the preference off the gas's time uniform moves (the control), with it on it stays at 0.
  It also fails if a file in `scene/deep/` gains a time uniform without reading `reduced`, and holds that the camera rig's constant drift refuses
  with 'reduced-motion' and leaves the camera where it was. (internal #836)
- **A gate on drawing the cosmic web.** `tests/test_cosmic_web_gate.mjs` holds that, while nothing draws it, the class says so and credits no
  survey; and that the day a renderer is listed under COSMIC_WEB the class note must say what DESI DR1 is and is not (its licence, the part of the
  sky it covers as a footprint, that the rest was not observed), name the observed and the simulated styles apart with a legend, and that
  `CREDITS.md` carries the survey. (internal #826, #828)

### Not yet

- **No DESI wedge and no simulated filaments are drawn.** The gate above is the check; the data, the renderer and the looks at 1600 and 390 are
  still to build, so internal #826 and #828 stay open.
## [1.7.19] - 2026-11-04

### Changed

- **The astronomical unit is written AU everywhere a visitor reads a distance** (public #1234). After #1217 made the star-system cards say AU,
  the sentence under an object ("is 2.31 AU (346 million km) from the Earth right now"), the object and star-system pages a search engine
  reads, the sample cards (Gonggong, 3I/ATLAS, Lucy), the oddities, the Helix, Dumbbell and Ring Nebula cards and four Lab pages still said
  "au". A test now reads the files a visitor sees and refuses "au", "a.u." and "AUs". Other languages keep their own abbreviation.
- **A way to report a wrong phrase in a translation** (public #1269). The French, German, Portuguese and the other drafts have no native
  reader yet; `.github/ISSUE_TEMPLATE/mistranslation.yml` is a form for one wrong phrase (language, what it says, what a person would
  say, where), linked from the README, CONTRIBUTING and docs/TRANSLATING.md. The aurora-forecast link on the Earth card was opened again
  (NOAA SWPC's page for the OVATION model, which is the model the in-app aurora layer draws too) and its record in `registry/links.yaml`
  says so (public #1232).

### Fixed

- **A reply of the wrong shape no longer replaces the data the browser holds, and a read of our own saved files can no longer hang** (public #1304).
  A publisher's error page that is valid JSON (`{"error": "rate limited"}`), a number, a string, or rows without the fields the parser reads
  used to be kept as the new copy of a feed; now each json feed is checked against the least its consumer needs (`shape` in
  `site/js/data/sources.js`: the CelesTrak feeds, Launch Library, the people in space, GDACS, EONET, JPL's tables, the Kp forecast; the
  others must at least be an object or a list) before it can replace the copy, from the publisher and from our own saved file. The manifest,
  a saved file and its column twin are read within 20 seconds, as a publisher's reply already was; before, a hung one held the page until
  the browser gave up and the publisher behind it was not asked.

### Added

- **Five new checks, no change to what a visitor sees** (public #1271, #1304, #1322, #555). Every trip of `registry/tours.yaml` is its own URL
  in `sitemap.xml`, once, with a page of its own H1 and description. A read of the hourly copy that never answers, comes back empty, is cut off
  or is not data, or is data of the wrong shape, leaves the copy the browser holds as it was, with its own time, marked old, with the reason, from the publisher and from our
  own file (`tests/test_cache_keeps_last_good.mjs`). `scripts/check-phone-menu.mjs` opens a moon, a landing site and a long name at 320 and
  390 px with a trail behind them and checks that no breadcrumb overlaps the More button, none is cut at the side, and the menu opens and
  closes; it runs in the `ui` job of `screens.yml`. docs/RELEASING.md says how to run the Rich Results Test and the Schema Markup Validator
  against the live pages after a deploy (a person runs them; no account or key is made for it).

## [1.7.8] - 2026-11-03

### Added

- **Four Earth-observation and navigation satellites have a model of their own: Pleiades 1A and 1B, SPOT 6 and 7, the SkySat C series and
  BeiDou-3 MEO.** Each was the generic satellite shape; each is now built in code from published dimensions and from pictures read for the
  layout, by NORAD number, and its card says "shape built from published dimensions and pictures; details simplified". No agency publishes a
  mesh of any of them (NASA's 3D Resources has none, and Airbus, CNES and Planet publish none), so no mesh and no picture is in a file.
  **Pleiades** (`pleiades.glb`, 146 kB): the gold-blanketed hexagonal bus with the white baffle and bore of the 65 cm telescope on its Earth
  face, three star trackers, the X-band horn and the three 2.3 by 1.0 m arrays at 120 degrees (Pleiades Neo is another bus and keeps the
  generic shape). **SPOT 6 and 7** (`spot67.glb`, 104 kB): the gold box with the two NAOMI telescope baffles side by side on the Earth face,
  the propulsion dome, the Isoflux dish and three flat panels standing off the body. **SkySat C series** (`skysat.glb`, 105 kB): the 60 by 60 by
  95 cm cuboid with cells on its four side faces, the aperture ring and secondary mirror, the cover that opens out as a flap carrying the dish,
  the thruster band; the prototypes SkySat-A and B are shorter and keep the generic shape. **BeiDou-3 MEO** (`beidou-3-meo.glb`, 91 kB): CAST's
  type, a box with the round L-band array, the retroreflector and the inter-satellite-link array on its Earth block and two wings 15.5 m across;
  the 12 craft confirmed as CAST's wear it as themselves and the other 16 wear it as "the kind of thing" (SECM built a smaller type). Each is 9 700
  to 17 300 triangles, loaded only when its craft is selected. The sources, what was cited and what was estimated are in `registry/models.yaml`
  and `CREDITS.md` §3u to §3x.

### Not yet

- **Sizes and panel layouts are partly estimates, and the rows say which**: Pleiades' bus (eoPortal gives the arrays and the telescope, not the
  bus), how SPOT's three panels stand, the SkySat flap and dish, and the BeiDou wing panels. Cell grids are coarse. No model has been seen by a
  person who knows the craft; the pictures in the pull request are the first look.
- **Pleiades Neo and the radar pair (COSMO-SkyMed, RADARSAT-2) are not built in this release.**
## [1.7.11] - 2026-11-04

### Added

- **Tests II: twenty-three small functions have a test of their own, and five more get the edge cases they lacked** (public #770, #777, #783, #789, #794, #800, #804, #809, #811, #813, #815,
  #818, #820, #822, #824, #826, #829, #831, #833, #835, #837, #839, #846, #848, #850, #852, #854, #858). One new file per function in the style of `tests/test_colorkeys.mjs`, each with its step in
  `.github/workflows/ci.yml`: `equatorialToEcliptic`, `radecToVec`, `parseFrame` and `isPlanetMoon` (propagate/frames.js); `qMul`, `qRotate` and `qSlerp` (sky/pointing.js);
  `glowOfLights`, `samePassKey` and `nextLightChange` (sky/); `leadingDigit`, `kickerDate`, `shortUtcDate`, `stopBudgetMs`, `worldOfTarget`, `eventSizeText`, `splitReadout` and `ageParts`
  (ui/); `span0Of`, `bytesFor`, `fitDistanceUnits`, `starRadiusKm` and `planetRadiusKm` (scene/). The window of `activeShowers` and the span of `trackTimes` and `tickTimes` are
  now passed in tests/test_radiants.mjs and tests/test_groundtrack.mjs; `with_params` and `expand_url` (harvest) are in tests/test_harvest.py, `ledger_key_shower` (notify) in
  tests/test_notify.py. No behaviour changes. One finding: `equatorialToEcliptic` takes its obliquity from astronomy-engine's matrix, about 2e-7 in a sine away from the 23.4392911 degrees
  the issue quotes, so its test compares the tilted axes to 1e-6.
## [1.7.12] - 2026-11-04

### Changed

- **Comments and guides now point at things that exist.** No behaviour changes, except the one search word below. Comments that named a test that was never there now name the one that
  holds the code (`ui/camundo.js`, `ui/photomode.js`, `sky/skybodies.js`, `scripts/minify_site.py`, `scripts/seo_dates.py`; public #708, #716, #732, #739, #746); `registry/sky-events.yaml`
  names `scripts/seo_facts.mjs`, the script that does the work (public #607); `registry/showers.yaml` points at `notify/` (public #753); five comments no longer point at
  `docs/data-sources.md` and `scene/wind.js` at `docs/inspirations.md`, which are not in the repository (public #652, #766); the landing-sites check and `registry/sites.yaml` no longer count the
  uncited rows (public #606); `docs/ARCHITECTURE.md` says what the module contract covers (public #653).
- **Search calls a storm what its card calls it.** The kind on a storm's row in search is "Tropical cyclone", not "Tropical storm" (public #682).
- **JSDoc on nine small functions**: `clipKey`, `plural`, `saffirSimpson`, `shouldSaveData`, `dirOf`, `angleBetween`, `tileUrl`, `seedOf` and `phaseRayleigh`, each with an example that was run
  (public #706, #714, #722, #730, #737, #744, #751, #762, #774).

### Added

- **`docs/FAQ.md`**: three answers, each checked against the app. Live or a snapshot (the time the elements were issued against the time the position is computed for, with the
  station as the worked case, read from CelesTrak on the day); how to leave a trip (Escape or Leave); why distances and sizes are not to scale (public #1013, #1015, #1017).
- **`docs/RUN_LOCALLY.md`** shows what "Address already in use" prints, from a real run, and what to do (public #1014).
- **`tools/README.md`** has the "How long it takes" section of the trip-video guide, and one command each for `cdp.mjs` and `sheet-png.mjs`; **`CONTRIBUTING.md`** shows how to run one Python
  test (public #609, #711, #719, #727).
## [1.7.13] - 2026-11-04

### Changed

- **Every generator answers `--help`.** `python3 scripts/gen_aliases_js.py --help` (41 generators in all: the 34 that share `scripts/_genmirror.py`, and `gen_rockets_js.py`, `gen_sources_json.py`,
  `gen_modulepreload.py`, `gen_home_seo.py`, `gen_contributors.py`, `build-skystars.py`, `build-galaxy.py`) prints a usage and exits 0 instead of rewriting a tracked file, and a mistyped flag
  (`--chek`) prints `unknown option` and the usage on stderr and exits 2. `--check` and the no-argument run are as before. 37 lines leave `tests/cli_usage_gaps.txt`;
  `tests/test_generator_help.mjs` holds it.
- `scripts/build-galaxy.py` has a `--check` (CI runs it), so `site/data/galaxy.bin` can no longer drift from the script.
- Error messages say what was found and what to do: `build-skystars.py` (the path, the four bytes it found, how to make the right file), `build-skycultures.py`'s boundary reader (the bytes found; the
  leftover count), `build-exoplanets.py` (which file lacks columns, `pull with --pull`), `build-moon-shapes.py` (how many grid points are empty and where the first is), `bake-own-colours.mjs` (the
  file and the likely causes) and `scripts/_png_text.mjs` (the first eight bytes; the length).

### Removed

- Names nothing used: `TICK_PX` (`ui/hud.js`), `sunDirection` (`propagate/body.js`), `subSolarPoint` (`scene/earth.js`), `loadedCount` (`scene/realmodels.js`), `systemById` (`scene/systems.js`),
  `ascentPath` (`propagate/ascent.js`), `disposeGlyphAtlas` (`scene/glyphatlas.js`) and `setNavigator` in `tests/test_share.mjs`.
- Three strings nothing read, in English and in every translation: `card.oftenSaidLabel`, `card.notApplicable` and `tonight.skybar.timeNoNight`.

### Fixed

- The comment that describes `ctx.setStage` sits above it again (it had been left above the colour key).
- `resetPlaces()` in `sky/overplace.js` has a test (`tests/test_overplace.mjs`): forget, a failed load that leaves nothing behind, a load that builds the places anew.
## [1.7.14] - 2026-11-04

### Added

- **Three more places a machine hit the Moon.** Hakuto-R Mission 1 (25 April 2023), Luna 25 (19 August 2023) and Hakuto-R Mission 2 (5 June 2025) join Beresheet as coordinates on the
  Moon list, not records: position and UTC date from NASA's NSSDCA table, a sentence from the LROC or NASA page about each. The README now says twenty-four places on the Moon.
- **Five links to the publisher's own pages.** The cards of Perseverance (Jezero), Curiosity (Gale), SOHO, Voyager 1 and Voyager 2 link to NASA's raw-image pages, SOHO's real-time
  images and "Where are Voyager 1 and 2 now?". Each row says the day it was opened and what was on the page.
- **More names that find things.** "North star" finds Polaris, "dog star" Sirius and "starlink train" the Starlink satellites; "Statio Cognitum" finds the Apollo 12 site, "Statio
  Tianchuan" Chang'e 5, "Mons Latreille" Blue Ghost 1 and "Tidbinbilla" the Canberra dish DSS-43; "FI Vir", "Gliese 447", "Gliese 1253", "Gliese 3053" and "TIC 271971130" find
  Ross 128, Wolf 1069, LHS 1140 and TOI-715. Each name was read on a public page that day.

### Changed

- **The /sources/ page says when eight sources' terms were last read** (Launch Library 2, the NASA Exoplanet Archive, DSN Now, GDACS, Wikidata and the two SWPC sources, 4 November 2026).
  The Exoplanet Archive line now says what its acknowledgement page asks (a standard acknowledgement and a citation of Christiansen et al. 2025) and that 10.26133/NEA13 is the table's DOI.
- **Open Notify's terms address works.** `https://open-notify.org/` still answers with a certificate for another host, so the row points at the project's GitHub repository, whose LICENSE
  file is the GPL-3.0 for the code; the line still says no licence is stated for the data.

## [1.7.7] - 2026-11-03

### Added

- **Moments: Hubble's release from Discovery and the first Falcon 9 landing.** Two new stories on the Moments shelf, each on its own mission clock with the published times and every
  other number marked as ours.
  - *Hubble's release* (STS-31, 25 April 1990): Discovery in a 613 km orbit with its bay open; the Canadarm snares the telescope's grapple fixture, lifts it out of its berth, and the
    arrays unroll (the first comes out whole; the second stops part-way, is freed hours later, and finishes), the antenna booms spring out, the arm swings the telescope upright over
    the bay, and at 19:38 UTC the end effector lets go. Discovery's thruster pulses take it backwards. The release, and the launch it counts from, are the published clock (Jonathan's
    Space Report no. 36, America Space, NASA's press kit and archive page); the clocks of the grapple, the lift, the unrolling, the stop and the freeing, where over the Earth the shuttle
    is (chosen to be in sunlight) and the arm's joints are ours, and the Moment says so. The arm holds the telescope at every second (a test checks the end effector against the grapple
    fixture to 0.2 m). New models built in code from published dimensions: the telescope as it was in 1990 (aperture door shut, the golden-yellow first arrays and the antenna booms as
    parts), the Canadarm with the telescope's berth. Replay on the card of Launch Complex 39B and of the Hubble Space Telescope.
  - *The first Falcon 9 landing* (flight 20, ORBCOMM OG2 Mission 2, lift-off 01:29:00 UTC on 22 December 2015): from Space Launch Complex 40 to Landing Zone 1, with the event times of
    SpaceX's press kit and of the reconstruction of the webcast (main engine cut-off at T+2:23 at 75 km and 1.67 km/s, separation, the second stage and the fairing, the boostback from
    T+3:47, the entry burn from T+8:01 to T+8:21, the landing burn from T+9:11, touchdown at T+9:44, 01:38:44 UTC). The first stage is flown between those by a point-mass simulation
    (a boostback found by search, a landing burn that is a guidance to rest on the pad at the published second); its heights and speeds, the length of the boostback and the clocks of
    the grid fins and landing legs are ours and said so. A night launch, so the rocket is drawn in a lamp of ours. New models: the first stage (nine engines, four legs and four grid
    fins as parts) and the second stage with its two fairing halves. New places: SpaceX's pad (Space Launch Complex 40) and Landing Zone 1, each with the Replay row, and the zone drawn
    as the 86 m round pad with its X.
  - **The Falcon 9 replay is reusable** (internal #867): `tools/moments-build/falcon9-flight.mjs` makes a whole Falcon 9 launch and landing from a flight record (the pad, the landing
    place, the published event times, MECO's height and speed); another flight is a record, its words and a test block (docs/MOMENTS.md, "A Falcon 9 flight").
- **The Moments engine moves parts and riders.** A part event `pose` (keyframes that scale, turn and move a part about a point: arrays unrolling, an arm bending, grid fins and legs
  swinging out), `rideOn.keys` (a rider moving about its host: the telescope on the arm), a shot's `lookAt` (a point in the vehicle's own axes) and a moment's `floodlit` (a lamp on the
  vehicle at every height, a little lift on the ground, for a flight in the dark); site/js/moments/pose.js, tested without a browser. The ground can be a round landing pad
  (`ground.pad: "landing"`).

### Changed

- **The Moments shelf looks and behaves like the trips.** A picture under every Moment card, the story's own frame at its most telling second (`site/images/moments/<id>.webp`, 640 x 360, within the
  trip pictures' budget), fetched lazily and only after the first visit has settled, as the trips' are (`ui/trippics.js` now serves both; the card's hue is the fallback tint). The shelf shows four
  Moments, then "All {n} moments" / "Fewer moments" on the same button as the trips (Spanish, French, German and Portuguese translated; the other languages show it in English). Each shelf
  row names its picture second (`picture` in `site/js/moments/shelf.js`); a story added later is rendered by `tools/moment-pictures.probe.js` and `scripts/build_trip_thumbs.py --moments`,
  and `build_trip_thumbs.py --check` refuses a shelf story without its picture.
- The STS-1 Moment's open bay no longer shows the DFI pallet in every flight: it is a part of its own in `shuttle-orbiter.glb`, shown with STS-1's open doors and left out of STS-31's.
- The shelf's note no longer counts the missions.
## [1.7.6] - 2026-11-03

### Added

- **Debris and spent rocket bodies placed by their own element sets** (A9, internal #1069). The debris view drew every piece at a made-up
  place along its orbit's real height and tilt, because SATCAT gives an orbit's shape and not where on it a piece is. CelesTrak does publish
  element sets for most of them (`gp.php?NAME=DEB` and `NAME=R/B`: 10 245 and 2 192 answers on 2026-11-03), so 12 403 of the layer's
  14 603 dots now sit where SGP4 puts them, as the active satellites do, `measured` within seven days of the element set's epoch and `inferred`
  after it. The other 2 200 have no published element set and stay illustrative, and the view's lines say how many are which. The tiles are
  built once a day by the harvester, 905 kB for the set (608 kB of tiles; gzip 580 kB with the pick index and the names) against the 6.8 MB
  catalogue the view already reads, and are fetched only when the debris layer loads (`harvest/tracked.py`, `site/js/data/tracked.js`,
  `tests/test_tracked.mjs`). The elements keep SGP4's own precision: 142 real element sets, propagated from CelesTrak's numbers and from the
  tile's, agree to under 0.3 m for a week. Not here: the working payloads are drawn from the active catalogue as before, and the dead ones
  have no public query that selects them by type, so "all 34 800" is not reached; decayed objects are not in any GP answer.
- **A1 tiles: streamed point-cloud tile sets** (internal #1059), the base the asteroids, the events and the structure catalogues sit on. A set
  is a catalogue cut by rank (brightness or size) into levels and by band or HEALPix cell into tiles of quantised columns, with a pick index
  from catalogue id to tile and row and a names file (`harvest/tilepack.py`, `site/js/data/tilecloud.js`; the format is in the first lines of
  the first). The page fetches `set.json` and then the tiles a view asks for, level 0 first; **under the frame latch only level 0 is drawn,
  and on a connection that saves data none**. A tile carries its set's build stamp, so a CDN that still holds yesterday's tile costs one
  refetch and never a wrong picture. `tests/test_tilecloud.py` and `tests/test_tilecloud.mjs` hold the two halves to the same bytes,
  and the HEALPix cells to `sky/startiles.js`.
- **The harvester's daily slow-job queue** (`harvest/slowjobs.py`). After the hourly sources, jobs that cut a catalogue into tiles run when
  their set is a day old, oldest first, while the run has time (a job is not started without 100 s left); the last good set stays when a build
  fails or has under 80 % of the last one's objects; `set.json` is written last. `python3 -m harvest --dest DIR --slow-only [ID]` runs it by
  hand, `--with-slow-jobs` adds it to a run (the Lambda always does, and `scripts/refresh-snapshots.sh` asks for it; without the flag a run in
  which nothing is due still touches no network). CelesTrak is asked once a day for each of the two queries, never retried
  and not asked the second after a non-200 answer, as its usage policy asks (CREDITS.md 4.1).
- A look probe, `r177-tracked`, and the `look` workflow's step that serves it the tracked set.

### Changed

- The debris view says how many of the dots are where their element sets put them, and its closing line says the places are illustrative
  only for those that have none (the two lines are in all ten languages).

### Not done

- **A12 surface names** (internal #1072) is not started. The source is settled (the USGS Gazetteer's point files, public domain, with each
  feature's centre, diameter and type: Mars 2 052 names, read 2026-11-03), and what is missing is a name overlay: `ui/labels.js` is capped at
  eight names by the design rule, so a name-by-zoom layer needs a design of its own against the UI guide.
- **A2 planetary nebulae** (internal #1060) stays at OpenNGC's 130. HASH, the source the issue names, is behind a registration and states no
  licence for reuse (`scripts/build_deep_catalogue.py` records this), so it cannot be redistributed. Wikidata (CC0) has 10 793 items of the class
  but most are bulk imports with no name, and no source was chosen for them.
- Not touched: A7 asteroids, A10 events, A11 structure (all three can now be built on the tiles), pass brightness (#391), star radii (#412),
  star-system orbits (#474), more star systems (P#556).
## [1.7.5] - 2026-11-03

### Added

- **Four astronomy satellites have a model of their own: CHEOPS, Insight-HXMT, SVOM and the Einstein Probe.** Each was the generic
  space telescope or the plain satellite shape; each is now built in code from published dimensions and from pictures read for the layout,
  by NORAD number, and its card says "shape built from published dimensions and pictures; details simplified". No agency publishes a mesh
  of any of them (NASA's 3D Resources and science.nasa.gov/3d-resources have none; ESA's terms forbid derivatives), so no mesh and no picture
  is in a file. **CHEOPS** (`cheops.glb`, 114 kB): the hexagonal platform on its launcher ring, the 30 cm telescope behind its black baffle
  with the copper cover, two star-tracker heads, the instrument radiators, and the three-panel Sun shield with its blue cells wrapped round the
  back, at ESA's 1.55 by 1.49 by 1.4 m. **Insight-HXMT** (`hxmt.glb`, 158 kB): the gold platform, the 18 HE detector modules with their slat
  collimators, the three LE and three ME boxes, the star trackers, the sun-shielding board and two three-panel wings. **SVOM** (`svom.glb`,
  151 kB): the gold-blanketed body with ECLAIRs' coded mask, the MXT, the visible telescope, the three GRM heads tilted 30 degrees, the
  adapter ring and two wings. **Einstein Probe** (`einstein-probe.glb`, 113 kB): the twelve lobster-eye WXT modules fanned round the two FXT
  cylinders on the gold payload cabin, the bus and two three-panel wings. Each is 12 000 to 19 000 triangles, loaded only when its craft is selected.
  The sources, what was cited and what was estimated are in `registry/models.yaml` and `CREDITS.md` §3q to §3t.

### Not yet

- **The solar arrays of Insight-HXMT, SVOM and the Einstein Probe are estimates** (no page opened gives their span), and every array's cell
  grid is coarse (the bake keeps the colour of nothing smaller than about 10 cm on a craft this size); the rows say so. CHEOPS' telescope looks along
  the Sun shield's normal, so in the app it looks sideways, not away from the Earth.
- **The optical Earth-observation group** (Pleiades, SPOT, SkySat, BeiDou-3 MEO) is the next craft batch; the radar pair after it.

## [1.7.4] - 2026-11-03

### Added

- **Six small checks in CI** (`.github/workflows/ci.yml`, the `rails` job, each in under a minute and with nothing to install): `tests/test_lint.mjs`
  (a name that an import, const, let, function or class declares and its file never mentions again; 14 such names in the shipped code are gone,
  36 in build scripts and tests are listed as known and may only shrink), `tests/test_cli_usage.mjs` (36 command-line tools answer `--help`
  with a usage line and exit 0; 75 tools that read their arguments by position and say nothing are listed in `tests/cli_usage_gaps.txt`, and a
  new one fails), `tests/test_nobuild_launch.mjs` (starts the README's own `python3 -m http.server --directory site` and follows every module on the
  way to the first frame: 125 files, all 200, all JavaScript, nothing built), `tests/test_nowebgl.mjs` (calls the real `createRenderer()` with a
  canvas that refuses WebGL 2 and holds the readable page with all 31 trips), `tests/test_reduced_motion_trips.mjs` (runs the outer-solar-system
  and a-year-in-a-minute trips end to end under `prefers-reduced-motion`: no flight, no veil, the clock held still on every timed stop, and
  leaving puts it back) and `tests/test_baselines.mjs` (the deep-space baseline probe's blocks and poses all name a real scene group).
  The baselines test does not compare pictures: none is kept in the repository to compare with.
- The release zip check refuses a manifest icon that is missing, empty or outside `site/`, and compares the zip's four brand icons to the tree
  (public #1277). Every card sentence is held to 160 characters, and nine that were over are shortened (public #1286).

### Changed

- **Shader text is stripped of its comments and indentation in every served build** (internal #531). `scripts/minify_site.py` did it only when
  asked; it is now the default, with `--no-shaders` or `SR_STRIP_SHADERS=0` as the way back. 185 shader templates in 58 files go from 283 187 B to
  196 885 B of text before compression, and the boot graph of the built tree from 1 950 547 B to 1 920 102 B (30 445 B); no line holding a `${` is touched, and each template is checked to say the same GLSL.
- The README says "more than 240 spacecraft and shape models" where it said 70 (the registry holds 246), and a test now keeps the claim current.

### Not yet

- **Content-hashed file names (internal #517) and a trimmed upcoming-launches file (internal #524)** are not done: the first rewrites every path in
  the generated mirrors and wants its own browser walk, the second needs the harvester deployed and an answer on Launch Library's terms (internal #370).
- **The AVIF decision (internal #530)** is written on the issue; the maps are still WebP.

## [1.7.3] - 2026-11-03

### Added

- **Dated events for forty craft that came down on Venus, the Moon and Mars.** The cards of Venera 7 to 14 and VEGA 1 and 2 on Venus; Ranger
  7, 8 and 9 and Surveyor 1 to 7 (the signal that stopped on Surveyor 4, the hop of Surveyor 6); Luna 9, 13, 16, 20, 23 and 24, Lunokhod 1 and
  2 and Chang'e 3, 4, 5 and 6 on the Moon; Viking 1 and 2, Mars Pathfinder, Spirit, Opportunity, Phoenix, InSight and Zhurong on Mars. Each
  has three to five events (the launch, the orbit, the landing or impact, the first picture, the last signal), each with its date and, where
  the page gives one, its UTC minute, and Prev and Next move the clock to the ones that happened at the site. A launch or a flight is told
  without moving the clock. `#event=venera-13.landing` is a link. The craft are read on NASA NSSDCA's pages where they answer and on
  Wikipedia (CC BY-SA 4.0) where they do not (the Soviet and Chinese craft), and each mission says which. 135 events in a file of 50 kB that
  loads only when the card of a lander, an impact site or a landing site asks (`registry/missions-landers.yaml`,
  `site/js/data/missions-landers.js`, `scripts/gen_missions_landers_js.py`, `tests/test_missions_landers.mjs`).
- A look probe, `landers`, for Venus, the Moon, Mars and the ground patch near and far.

### Changed

- **The ground patch under a lander fades out as the camera pulls away** (public #267). A model is drawn at a steady size on the screen, so the
  patch was as wide on the screen far out as near, and from far out it showed as a grey plate on a shrinking Moon. It is now whole at the arrival
  distance and gone by the layer's nearKm, on a smoothstep. Its soft edge was also being turned opaque by the model's fade-in (the
  material was set not transparent once the fade finished, so the vertex alpha was ignored); it stays transparent now.

### Not done

- **Magellan** is not on Venus: NASA's model exists, but no page read (NSSDCA, the PDS mission catalogue, the Explorer's Guide) gives the
  orientation of its orbit (the ascending node), so a polar orbit drawn from published elements would have an invented plane, and its
  orbit changed when it braked in the air in 1993 (to 197 by 540 km, 94 minutes).
- **No lander model is new.** NASA 3D Resources and NASA Science publish the Viking lander, the Mars Exploration Rover and InSight (already
  on the map); they publish no Surveyor, Pathfinder, Sojourner or Phoenix (read 2026-11-03), which keep the models built from NASA's
  dimensions and photographs in 1.5.0. No free photograph or drawing of a Venera lander was found to build one from, so the Venus sites
  stay marks, and say so.
## [1.7.2] - 2026-11-03

### Added

- **Voskhod 2, 18 to 19 March 1965, as a Moment: the first spacewalk.** Lift-off from Site 1 at 07:00:00 UTC, the Volga inflatable
  airlock, Leonov's twelve minutes outside from 08:34:51 to 08:47:00 at the end of his 5.35 m umbilical in the Berkut suit that ballooned
  on him, his coming back in head first, the airlock let go; then, on 19 March, the automatic landing that did not take its orders, the call
  for the manual descent at 07:16 UT, retrofire by hand 46 seconds late, and the landing at 09:02:17 UT near 59.57 N 55.47 E in the taiga
  north-east of Perm, 386 km from the field. Every published time is the sources' (Wikipedia, "Voskhod 2" and "Voskhod (rocket)"; Sven
  Grahn's account, which cites General Kamanin's diary) and each caption says what is ours: when the airlock was inflated, where and when the
  manual burn was, the entry's heights, Leonov's pose (read off a frame of the film). The rocket drawn is the Vostok-K's, said in the first
  caption; the real third stage differed. No recording plays: the Soviet-era audio has no clear free licence on any page found, and the
  file says so. New models: the Voskhod 3KD spacecraft with the airlock folded and out, its umbilical and the spare retro rocket, and Leonov in
  his suit, built from the published numbers and photographs (none exists under a free licence).
- **STS-1, 12 to 14 April 1981, as a Moment: Columbia's first flight.** Lift-off from Launch Complex 39A at 12:00:04 UTC on a white external
  tank (STS-1 and STS-2 flew it painted), Max Q at 56 s, the boosters let go at 2 min 12 s at 53 km, main engine cut-off at 8 min 34 s,
  the tank 18 s later, the burns to 246 and then 274 km, the bay doors opening, the 160-second deorbit burn over the southern Indian Ocean,
  entry with its 21 minutes of blackout, the coast at Big Sur at Mach 7, the heading-alignment turn, and the touchdown at Edwards on the
  lakebed runway 23 at 18:20:57 UTC (54 h 20 m 53 s), every time the published one (Wikipedia, "STS-1", from NASA's mission documents).
  The stack is NASA's own public-domain models in parts (two boosters, the tank, and Columbia with her doors and gear), rebuilt by
  `scripts/shuttle/build-sts1.mjs`. The reconstruction's own errors are said: the entry interface comes out over the western Pacific
  where the report says the eastern, and the orbit's node and clock are nudged a few degrees and minutes over the 54 hours to meet the field.
  No recording plays: NASA's air-to-ground audio of the mission is on Wikimedia Commons as hundreds of unlabelled clips, only the first day, and
  nothing says which holds which line.
- **Columbia's bay is open from T+1:30**, with the radiator tubes on the inner faces of the doors, the sill longerons and the DFI pallet (the only thing STS-1 carried), added to the orbiter model as a part (`scripts/shuttle/add-bay-detail.mjs`); the entry's glow is a layer under the orbiter's belly, not the capsule's dome.
- **Both are on the shelf**, with "Replay this moment" on Baikonur Site 1 (now three stories, Vostok 1 first) and Launch Complex 39A (Apollo
  11, Apollo 13 and STS-1), on two new places on the map, the Voskhod 2 landing site in the taiga and Edwards' lakebed runway 23, and on the
  cards of a Voskhod rocket or spacecraft and of the Space Shuttle or Columbia.
- **The engine learned a little**: a vehicle can be tilted (`pitchDeg`, `rollDeg` in its phases, keyframed: an orbiter's 40 degrees nose-high
  entry), turned on its host (`rideOn.spin`), keep its file's own axis (`keepXZ`: a craft with an airlock to one side), and a ground can be a dry
  lakebed with a runway painted on it. docs/MOMENTS.md has the fields.

### Changed

- **Sputnik 1's pad is lit.** It was a night launch and the rocket was a silhouette under its own exhaust. A night pad (the Sun down, the camera
  in the air) now gets a lamp on the models and a little light on the ground, the same lamp the model cards offer, weaker; the first caption says
  it is ours.
- **Every small vehicle has the same floor on the screen.** The ringed marker, which marks a vehicle too small to see, now comes on below 40 px
  instead of 7, is 44 px across and has a dark ring round the gold one, so Sputnik 1 over the Earth is no longer a speck.
- **The words of Apollo 13 and Sputnik 1 in Spanish, French, German and Portuguese**, machine-drafted like the rest of those files and not yet
  read by a native speaker; the radio lines stay as they were said. Voskhod 2 and STS-1 are English only for now.

## [1.7.1] - 2026-11-03

### Added

- **Mariner 2 and the Galileo probe are on the map, each where JPL Horizons puts it, with a model built from NASA's own numbers.** Mariner 2
  is drawn from its launch on 27 August 1962 to the end of JPL's path on 31 December 1962, past Venus on 14 December at 34 773 km; the Galileo
  probe from its release on 13 July 1995 to its entry into Jupiter's atmosphere on 7 December. Each has a mission card with dated events that
  move the clock, and a path file of about 2 to 4 kB that loads when its card opens, never at boot. The models (hexagonal base, pyramid mast,
  two unequal wings, the high-gain antenna and the louvers of Mariner 2; the heat shield, bolted ring and covers of the probe's aeroshell) are
  built in code from NSSDCA's and Horizons' dimensions and NASA's drawings and photographs, and the card says "shape built from published
  dimensions and pictures; details simplified". Mariner 2's high-gain antenna size and the closed aeroshell's aft-cover colour are estimates, said so in `registry/models.yaml`.

### Not yet

- **Venera, Vega, Mariner 4 and 10, Ranger, Giotto, Magellan, Tianwen-2 and MMX** are still without a model on the map. Horizons holds no
  path for any of them but MMX, and none of the Soviet craft has a free photograph or drawing to build from; NASA's Magellan model exists and is
  waiting for a place to draw it.
## [1.7.0] - 2026-11-03

### Added

- **Apollo 13, 11 to 17 April 1970, as a Moment.** Lift-off, the second stage's centre engine cutting off early, translunar injection, the
  tank that burst at 55:54:53 and blew the panel off bay 4 of the service module, the lunar module as the lifeboat, the descent engine's
  two burns, the far side of the Moon 254 km below, the service module let go and photographed, the lunar module let go, entry and
  splashdown in sight of USS Iwo Jima, every time the Mission Report's (NASA MSC-02680). Odyssey's service module is drawn with its panel
  coming off as a part event, the bay behind it (shelf, tanks, torn Mylar) built from NASA's photograph AS13-59-8500, and the service
  module kept in view as a vehicle of its own when it is let go. The path to the Moon is integrated from the Report's own state at
  injection, with a trim of 27.7 m/s on its speed that puts the pericentre where the Report puts it; the story says so.
- **The real radio.** "Okay, Houston, we've had a problem here" and "Houston, we've had a problem", NASA's recording from Wikimedia
  Commons (public domain), cut into two clips of 13 kB and 8 kB and played at 55:55:20 and 55:55:42, fetched only when the story gets
  there.
- **Sputnik 1, 4 October 1957, as a Moment.** The 8K71PS from Site 1, the strap-ons at 116 s, the core stage's cut-off at 295.4 s,
  PS-1 let go 19.9 s later with its cone falling away and its four whips out, and one lap of the 223 by 950 km orbit, with NASA's recording
  of the beep (public domain, from Wikimedia Commons). PS-1 and the head of its rocket are a new model built from the published
  dimensions (`sputnik-1.glb`, 26 kB); the rocket is the Vostok launcher's model with its third stage and shroud put away.
- **"Replay this moment" has a row for each story.** Launch Complex 39A and the Saturn V, the Apollo command and service module and lunar
  module cards offer Apollo 11 and Apollo 13; Baikonur Site 1 and the R-7 card offer Vostok 1 and Sputnik 1.

### Changed

- **`apollo-csm.glb`** is two parts richer (the bay-4 panel and the torn foil; 98 to 136 kB, loaded only inside a Moment); with the panel on
  and the foil hidden the module is the 1.5.0 one, and Apollo 11 hides the foil.
- The Moments shelf says five missions.

### Not in this release

- Voskhod 2 and STS-1, and the Apollo 13 and Sputnik 1 words in Spanish, French, German and Portuguese (the shelf cards are translated, the
  stories are in English).
## [1.6.3] - 2026-11-03

### Added

- **Six more languages, drafted: Russian, Ukrainian, Chinese (Simplified), Hindi, Hebrew and Arabic** (`?lang=ru`, `uk`, `zh`, `hi`, `he`, `ar`;
  public #529 to #534). Every string of the interface, the cards, the glossary and the Moments is there, drafted by a program from the English and
  **not yet read by a native speaker**: each file says so, the page offers none of them from a browser's language, and there is no language picker. They
  load only when asked for; a first visit in English fetches none of it.
- **Hebrew and Arabic read right to left.** `<html dir="rtl">`, and a stylesheet (`css/rtl.css`) that only those two languages fetch: the sidebar on
  the right, the tool rail on the left, margins, rules and aligned text turned round, and the globe moved into the middle of what the sidebar leaves.
  Numbers, the clock and the time tape stay left to right.
- **Chinese is ready for Traditional characters later**: Simplified is `zh` (`<html lang="zh-Hans">`); adding `zh-Hant.js` and one row makes the page read
  `zh-TW`, `zh-HK` and `zh-Hant` as that file. The mainland-only terms to change are listed in `docs/zh-hant-terms.txt`.
- **A progress badge per language in the README**, written from the same counts as the table in `docs/TRANSLATING.md` (`node scripts/check-translation.mjs
  --write-doc`; `--check-doc` fails in CI when either is stale). `scripts/translation-flat.mjs` works a translation in small pieces.
- **A check on a real page that a failing language leaves English** (public #1265): the language file refused, the file broken, and one key missing, each
  booted in a browser by `scripts/check-language-fallback.mjs` in the `screens` job, on a desktop and on a phone.

### Changed

- **Spanish, French, German and Portuguese are complete.** The sections 1.3.0 and 1.5.0 left in English (`r13Deep`, `compare`, `passportKinds`,
  `photoCompare`, `entrances`, and the card, drawing, class and template strings) are drafted, and the allowed-gaps lists in
  `tests/test_language_loader.mjs` are empty: a stage that adds an English string must now add its four drafts.
- A language file that fails to load puts `<html lang>` back to `en` and takes `dir` off, so a refused Hebrew file is not English read right to left.

## [1.6.2] - 2026-11-03

### Added

- **Gagarin's Start and the field Vostok 1 came down in are places on the map.** Baikonur Site 1 is a pad with a card, and the
  Vostok 1 landing site near Smelovka a named place on the ground, each with the position and the page it was read from
  (Wikipedia's article on Vostok 1, read 3 November 2026), and each carries "Replay this moment" for the Gagarin story.
- **"Replay this moment" on the cards of the craft the stories fly**: the Space Launch System, the Saturn V, the Apollo
  command and service module and lunar module, Orion, and the R-7 of Vostok, found by the words a record carries and never by a
  guess (a Soyuz-2 or a nebula named Orion does not get one).
- **The Moments in Spanish, French, German and Portuguese**: the player, the shelf and the words of the three stories, drafted by a
  program from the English like the rest of those files and not yet read by a native speaker. Armstrong's words stay as he said them.
- **A trip, "Two pads at Kennedy, two ages of rockets"**: five launch mornings on pads 39A and 39B (Apollo 8, 11 and 17, STS-31 and
  STS-116), the vehicle drawn on its pad on each, with its voice and its pictures (public #548).

### Changed

- The onboarding row for Moments names the doors a newcomer finds after the first two minutes: the shelf and the Replay row on pads,
  landing sites and craft.
- A place's card, where nothing is drawn but a mark, no longer says the position is from the IAU gazetteer: it says it is placed from
  the cited reference, which is true of the Moon's craters and of the field near Smelovka.

### Fixed

- On a phone the player no longer hides the scale rail's Back button under its title card; the rail is out of the way while a
  moment plays, like the rest of the map's own controls. The player was checked at 390 px: no control clipped, covered or
  overlapping, the chapters list scrolls above the strip, nothing wider than the window.
- The glow of an entry no longer ends in a faint band round the capsule's rim: its wake now starts from nothing there.

## [1.6.1] - 2026-11-03

### Changed
- The static pages (object pages, long reads, events, Teachers, Starlink, satellites, planets tonight, Accuracy, Sources, Press, Embed, the Lab index, trip pages and the 404) are in the blog's design: a sticky header with the mark, a Blog link and the "Open the 3D map" button, the deep-space ground, a reading column, rounded cards and figures, a darker footer. They share one stylesheet, `css/static.css`, and use the map's own faces: Inter for text, Barlow Semi Condensed for headings and labels, JetBrains Mono for numbers.
- Trip pages (`/t/`), which had no styling, now use the same design.

### Added
- A "From the blog" list on the long reads, Teachers, Starlink, satellites, planets tonight, events, Accuracy and About pages, built from a committed snapshot of the blog's feed (`registry/blog-feed.json`, refreshed by `scripts/refresh_blog_feed.py`, which a deploy runs when it is online).

## [1.6.0] - 2026-11-02

### Added

- **Moments: three missions replayed in 3D on their own clock.** Apollo 11 (16 to 24 July 1969), Artemis II (1 to 10 April 2026)
  and Vostok 1 (12 April 1961) each play from the pad to the sea with the real event times on a mission clock, a director's
  camera that cuts and chases, and the time compression printed on screen at every second. Take the camera at any second by
  dragging; Director gives it back. Open one from the new Moments shelf under the trips on the Earth pane, from "Replay this
  moment" on the card of Launch Complex 39A, 39B or the Apollo 11 landing site, or by a link: `#moment=<id>` or, at a second,
  `#moment=<id>&t=<seconds>` (the Share button in the player copies it).
- **Apollo 11**: the Saturn V from Launch Complex 39A through staging, the parking orbit, the burn for the Moon, the three days
  out, lunar orbit, Eagle's descent to Tranquility Base on the Moon's own ground, Armstrong's first words (the NASA recording,
  fetched only when it plays, sound on), the ascent, the rendezvous, the burn home, the entry and splashdown near the USS Hornet.
- **Artemis II**: the Space Launch System and Orion from pad 39B, boosters away, the high Earth orbit, the burn for the Moon, the
  far side at 6 545 km, and the splashdown off San Diego. Where the flight reports give a time it says "Flown"; where only
  the flight plan does it says "Planned", in the caption on screen.
- **Vostok 1**: Gagarin from Baikonur's Site 1 once round the Earth: the strap-ons and shroud at their seconds, retrofire over the
  west coast of Africa, the wires that held the instrument module, the entry, the ejection at 7 km and the two parachutes, to
  a field near Smelovka. The radio words are captions: no Soviet-era recording with a clear licence was found.
- Every path says what it is: reconstructed from the published events (two-body arcs and a hyperbola, never tracking data) or
  illustrative, in the line at the foot, with the sources. A craft too small to see at the scale of the Earth and the Moon is
  a marked dot. Moments are fetched only when opened: a first visit loads none of it.


### Fixed

- Pluto and Charon are round again, with smooth relief, when you fly close to them from the Solar
  System view: on real graphics cards the worlds' vertices were placed with too little precision
  that far from the Sun, and each ball drew as stair-stepped slabs. The same drawing code now
  places every world, ring, moon and haze shell relative to the camera.
- With the sidebar folded, the "where you are" bar at the top left no longer covers the round
  menu button: it starts beside it, and the scale badge with it.
- `tools/cdp.mjs`: a failed `cdpShot` / `cdpCast` / `cdpInput` step now rejects in the page with
  its reason, and a Chrome that dies mid-run ends the run with the reason, instead of both waiting
  forever.

## [1.5.6] - 2026-11-02

### Added
- A Blog button in the tool rail, after the tour: the Space Radar Journal at https://blog.spaceradar.ai, with long reads about what is in the sky and how the map is made. On a phone it is a row of the More menu.

### Changed
- The three long reads of 1.5 now live on the blog. Their pages here stay and name the blog's copy as the one to index.

## [1.5.5] - 2026-11-02

### Fixed
- In the star view a click on one of the thousands of unnamed stars opens its card and leaves the camera where it is; "Fly to it" on the card goes there. Before, a click on what looked like dark sky could fly you to a faint star you had not seen.

## [1.5.4] - 2026-11-02

### Fixed
- A click on the Earth at the home view opens the Earth. Thousands of satellite dots lie over it there, and a click still found one; where several dots crowd a click on a world, the world is what was meant. A satellite on its own over a world is still taken.

## [1.5.3] - 2026-11-02

### Fixed
- A click on the Earth, or any world, opens that world. A satellite dot over it is taken only when the click is on the dot itself.
- A click that only comes near a star or a dot opens its card and leaves the camera where it is. The camera flies only for a click right on the dot, or for a choice from the list. Before, a click on dark sky between dense stars could fly you thousands of light-years to a faint star.

## [1.5.2] - 2026-11-02

### Fixed
- A click now does what you meant. A click near a far star or galaxy opens its card and leaves you where you are; "Fly to it" on the card makes the journey. A click on empty space only clears the selection.
- A click on a planet opens that planet, not a star behind it. Marks behind a world can no longer be clicked, and a satellite in front of one still can.
- Things that are not drawn can no longer be clicked: faint stars, hidden comets and faded galaxies.
- A mouse click counts however long it is held, and the reach of a click fits a mouse or a finger. Lifting a finger after a pinch is never a tap.
- Where two marks sit too close to tell apart, a small list asks which one.

### Added
- With a mouse, the name of what a click would open shows at the pointer.

## [1.5.1] - 2026-10-29

Fixes for what 1.5.0 showed on real screens. Pluto and Charon are round again: far from the map's centre the
graphics card's 32-bit arithmetic snapped their surfaces into slabs, and every world now places its surface
relative to the camera (Titan's haze edge and the deep clouds are smooth too). The comets no longer pile into
a band through the Sun: the chosen comet and a few famous ones show their orbits, the rest are quiet points.
The Hubble Ultra Deep Field's galaxies are drawn only near their own line of sight instead of as a ray from the
Sun, the Milky Way's cluster symbols appear only where the view reaches them, exoplanets are plain green
discs, and the breadcrumbs no longer sit on the menu handle.

## [1.5.0] - 2026-10-29

The map now holds the deep sky, the comets, the stars, the moons and the sites it lacked, and it can replay a
mission. Every known NGC and IC object, Harris's globular clusters, Green's supernova remnants and the open
clusters are there, with every comet on its orbit and its tail. Stars the catalogue has no distance for are
drawn as directions. Pulsars, magnetars, quasars, the whole Local Group and 6 423 exoplanets (on by
default) join them. Every moon of the planets and of the asteroids and far worlds is a layer of its own.
Eleven small bodies have the shape a spacecraft or a radar saw. And a new kind of tour, a Moment, plays a
mission on one clock in 3D; it ships with its engine, a Saturn V demonstration and the vehicles of Vostok 1,
Apollo and Artemis II taken apart into their parts. It is a minor release: everything new is added, and
the 1.0.0 promises hold. A shared link (`v=1`, with `build=1.5.0` beside it), the saved-data format
(`/data/v1/`) and the registry row formats all still work.

Counted on release day with `python3 scripts/count_facts.py`: 30 trips and 227 stops, 109 389 stars (and
10 224 more with a direction and no distance), 43 star systems (40 in 1.4.0, three directly imaged ones
more), 21 moons with their own world (20 with a map) and 934 more in two layers, 21 landing sites on the
Moon and 12 on Mars, 243 models of spacecraft and small bodies (225 in 1.4.0, 18 more), 39 layers (29), 16
sources and 33 feeds (as they were), and 326 test files (315). 1 048 records with a class, a source and a
credit (1 011) in 40 classes (40).

### Added
- **Moments** ([#1305]): `#moment=<id>&t=<s>` replays a mission from launch to landing on one clock, with
  the pace and the compression printed on screen (`×1`, `×27.5`), the mission clock (`T−00:00:08`), chapters,
  seven kinds of shot, flames, steam, separations, parachutes and entry plasma. A visitor can take the
  camera at any time. Nothing of it loads until the link is opened. The one Moment that ships is a Saturn V
  demonstration whose heights are approximate; Vostok 1, Apollo 11 and Artemis II are not written yet.
- **Vostok** ([#1313]): the R-7 launcher with its four strap-ons, the Vostok 3KA, the ejection seat with
  its pilot and the parachutes, built here from published dimensions and museum photographs.
- **Apollo** ([#1307]): the Saturn V in eleven parts in flight order (NASA's own model, cut at its ring
  edges), the Lunar Module in two stages, and the Command and Service Module from NASA's model.
- **Artemis** ([#1314]): SLS Block 1 and Orion with its European Service Module, each in named parts;
  the core barrel, boosters and adapter skins on NASA's hardware are drawn here, and the model's credit says so.
- **The deep sky and the comets** ([#1308]): about 19 500 more NGC, IC, globular-cluster, remnant and
  open-cluster objects, fetched when the deep sky is entered, and every comet on its orbit with a tail.
- **Every moon** ([#1310]): 439 moons of Jupiter, Saturn, Uranus, Neptune and Pluto on their orbits for 1
  January 2026, 495 companions of asteroids and far worlds, the nine moons of dwarf planets JPL's tables
  lack, and five dwarf-planet candidates. Both layers are off until asked for.
- **Stars and what lies beyond** ([#1312]): the IAU's approved star names, 10 224 stars with a direction and
  no distance (a card says "Not measured"), 4 383 pulsars, 78 magnetars, black holes and dead stars, the
  Local Group's 85 dwarfs, named clusters, the farthest galaxies and 1 006 quasars.
- **The small complete lists** ([#1311]): the IAU's 172 established meteor showers, 3 850 observatories,
  111 launch sites, 105 landing and impact sites, and Tianwen-2 and MMX as landings to come.
- **6 423 exoplanets, on by default** ([#1311]): one 133 kB file in place of a table, drawn from the ladder's
  rungs as before. 51 Eridani, PDS 70 and AF Leporis are star systems you can fly into.
- **Eleven real shapes** ([#1309]): 67P/Churyumov-Gerasimenko, Lutetia, Steins, Donaldjohanson and
  Arrokoth from the missions that imaged them, and Toutatis, Geographos, Kleopatra, Mithra, Golevka and 1996
  HW1 from radar. Each card says what was imaged, what is fitted and what is not turned.

### Changed
- **The exoplanet layer starts on** ([#1311]); it is still loaded after the first screen.
- **A star with no distance shows no distance** ([#1312]): its card has no "— light-years away" among
  the big numbers.
- **Budgets were raised** where the data above arrives after the first visit (`after_first_visit_bytes`,
  `deployed_boot_js_bytes`), each with its reason in `registry/budgets.yaml`.

### Not yet
- The Moments of Vostok 1, Apollo 11 and Artemis II themselves, and the places to open them from.
- The Rosetta shapes of 67P, Lutetia and Steins state no licence in their datasets; the owner has still to decide
  whether to keep them. About 54 more radar shapes, Halley, Gaspra, Ida and Mathilde wait on a server that
  refused our build machine.
- The moons' orbits are for 1 January 2026 carried on by a mean period, and the places of 392 are inferred;
  the card says which. The 677 companions in Johnston's Archive are not used: it asks for permission first.
- Artemis's markings, the Apollo parachutes and the Lunar Module's folded legs are not drawn.
- The member galaxies of Virgo and the other clusters are drawn but cannot be selected.
- The Milky Way from inside is still the NASA SVS photo map.

### For contributors
- How the release was assembled: stages `r15-c1`, `r15-c2`, `r15-c3`, `r15-c4`, `r15-b1`, `r15-a3`,
  `r15-a45`, `r15-a2` and `r15-a6` reached `main` as one integration pull request, with their own pull
  requests [#1305], [#1313], [#1307], [#1314], [#1309], [#1310], [#1312], [#1308] and [#1311].
- A registry row may now list `stations:` (where a payload model of another file stands in a stack) and
  name its `subparts:` in `attach:`; `scripts/check_registry.py` holds both.

## [1.4.0] - 2026-10-27

The page keeps its own copy of the data, the nebulae are drawn in 3D and sixty more craft have shapes of
their own. An hourly job now saves a copy of what the page reads on our own storage, and the page reads that copy
first, then the original source, then the browser's own cache. Eight emission nebulae (the Lagoon, Trifid,
Eagle, Omega, Rosette, California, North America and Cat's Paw) are walls of glowing gas with dust in front
and stars among them, where there was a photograph. And sixty models of spacecraft and rocket stages are
added, each the agency's own or built here from cited metres and photographs. It is a minor release:
everything new is added, and the 1.0.0 promises hold. A shared link (`v=1`, with `build=1.4.0` beside it),
the saved-data format (`/data/v1/`) and the registry row formats all still work.

Counted on release day with `python3 scripts/count_facts.py`: 30 trips and 227 stops, 109 389 stars, 40
star systems, 30 nebula and galaxy pictures (kept for the card's comparison slider and for the bakes of
the heroes; none is drawn in the scene any more), 21 moons (20 with a map), 21 landing sites on the Moon
and 12 on Mars, 225 models of spacecraft and small bodies (165 in 1.3.0, 60 more), 29 layers, 16 sources
(14 in 1.3.0) and 33 feeds (31), and 315 test files (306 in 1.3.0, 9 more). 33 deep-sky heroes (19 in
1.3.0, 14 more), 1 011 records with a class, a source and a credit (936 in 1.3.0, 75 more) in 40
classes (40). The trips, stars, star systems, moons, layers and landing sites are as they were in 1.3.0.

### Added
- **An hourly copy of the data, on our own storage** ([#1289]): a scheduled job saves what the page reads
  every hour, and the page reads our copy first, the original source second and the browser's cache when
  both fail. Nothing new is counted or sent.
- **Eight emission nebulae in 3D** ([#1288]): the Lagoon (M8), the Trifid (M20), the Eagle (M16) and its
  Pillars, the Omega (M17), the Rosette, the California, the North America with the Pelican, and
  Cat's Paw, each as walls of glowing gas with dust lanes in front and stars among them, in the way the
  LMC, SMC and Orion heroes are drawn.
- **Four landers** ([#1291]): Luna 16, Mars Pathfinder with Sojourner, Phoenix and Mars 3, built here from
  cited metres and photographs and standing on their landing sites.
- **Six communications craft** ([#1290]): Thuraya-2 and -3, Inmarsat-4, ViaSat-3, O3b, Globalstar second
  generation and O3b mPOWER. ViaSat-3 is drawn as designed: no free picture shows how the first one's
  reflector lies, and the card says so.
- **Six military and small craft** ([#1294]): WGS, AEHF, MUOS, SBIRS GEO and AMSAT-OSCAR 7, built from the
  pictures and numbers the services and makers released, and SWAS from NASA's own model.
- **Ten weather craft** ([#1295]): Meteosat-11, Fengyun-2H, Meteosat-12 (MTG-I1), MTG-S1, INSAT-3D,
  GEO-KOMPSAT-2A and 2B, Meteor-M No.2-4, Midori II and Resurs-DK 1.
- **Seven commercial Earth imagers** ([#1296]): WorldView-3, BlackSky Global Gen-2, Satellogic NewSat,
  Planet Pelican, the HawkEye 360 Pathfinder block, GHGSat-C and Gaofen-1.
- **Ten national Earth-observation craft** ([#1300]): CBERS-4 and 4A, Amazonia-1, KOMPSAT-3 and 3A,
  KOMPSAT-5, Cartosat-2, Resourcesat-2 and 2A, EOS-06, Kanopus-V and Resurs-P.
- **Eleven science craft** ([#1297]): GCOM-W, GCOM-C, DAMPE, CSES, SCISAT-1, the two PROBA-3 craft,
  PROBA-V, FORMOSAT-7, OAO-2 and OAO-3.
- **Six spent rocket stages** ([#1292]): the second stages of the Kosmos-3M, Delta II, Atlas V (Centaur),
  Falcon 9 and H-IIA, and the Centaur D, each in its own shape.
- **Pluto looks like Pluto again** ([#1301]): the map is in natural colour from New Horizons' measured red and
  blue (strengthened, and the card says so), the south that New Horizons never imaged is modelled and
  labelled so, the relief comes from New Horizons' heights at twice the vertical, a thin blue haze ring
  shows against the Sun, and arrival is framed on the heart when it is lit. Charon has Mordor's red cap
  and its seams are fixed.
- **No photographs of nebulae or galaxies in the scene** ([#1298]): each object is a 3D reconstruction, or a
  soft glow of its catalogue size until it has one. A card that had a photograph still offers "Compare
  with the photograph".
- **Six more 3D heroes** ([#1298]): the Dumbbell (M27), the Southern Ring, the Pleiades' nebulosity, the
  Southern Pinwheel (M83), NGC 1300 and Centaurus A, each drawn from its own published numbers and
  labelled as a reconstruction (Centaurus A's jets are an illustration in false colour).
- **Black holes in 3D** ([#1293]): Sagittarius A*, M87* and Cygnus X-1 are drawn as black holes, with the
  shadow sized to the Event Horizon Telescope measurements, a sharp photon ring, a Doppler-brightened disc,
  the lensed far side of the disc, M87*'s faint jet and counter-jet, and Cygnus X-1's companion star. The
  EHT photographs stay on the cards, and the black-holes trip is narrated again with the new words.

### Changed
- **The Sombrero, the Antennae and M81 are revised** ([#1298]) to sit with the new heroes.
- **The ground sky draws glows instead of photographs** ([#1298]): a deep-sky object seen from the ground
  is a soft glow of its catalogue size.
- **"Through a telescope" is narrated again** ([#1298]) with words that no longer speak of photographs.

### Not yet
- The Milky Way from inside is still the NASA SVS photo map; the 3D band moves to 1.5.0.

### For contributors
- How the release was assembled: stages `r14-data`, `r14-neb-a`, `r14-m1` to `r14-m8`, `r14-pluto`, `r14-mw-bh` and `r14-neb-b` reached `main` as
  one integration pull request, with their own pull requests [#1288], [#1289], [#1290], [#1291], [#1292],
  [#1293], [#1294], [#1295], [#1296], [#1297], [#1298], [#1300] and [#1301].

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

[Unreleased]: https://github.com/Sara-Managed-Projects/space-radar/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.5.0
[1.4.0]: https://github.com/Sara-Managed-Projects/space-radar/releases/tag/v1.4.0
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
[#1288]: https://github.com/Sara-Managed-Projects/space-radar/pull/1288
[#1289]: https://github.com/Sara-Managed-Projects/space-radar/pull/1289
[#1290]: https://github.com/Sara-Managed-Projects/space-radar/pull/1290
[#1291]: https://github.com/Sara-Managed-Projects/space-radar/pull/1291
[#1292]: https://github.com/Sara-Managed-Projects/space-radar/pull/1292
[#1293]: https://github.com/Sara-Managed-Projects/space-radar/pull/1293
[#1294]: https://github.com/Sara-Managed-Projects/space-radar/pull/1294
[#1295]: https://github.com/Sara-Managed-Projects/space-radar/pull/1295
[#1296]: https://github.com/Sara-Managed-Projects/space-radar/pull/1296
[#1297]: https://github.com/Sara-Managed-Projects/space-radar/pull/1297
[#1298]: https://github.com/Sara-Managed-Projects/space-radar/pull/1298
[#1300]: https://github.com/Sara-Managed-Projects/space-radar/pull/1300
[#1301]: https://github.com/Sara-Managed-Projects/space-radar/pull/1301
[#1305]: https://github.com/Sara-Managed-Projects/space-radar/pull/1305
[#1307]: https://github.com/Sara-Managed-Projects/space-radar/pull/1307
[#1308]: https://github.com/Sara-Managed-Projects/space-radar/pull/1308
[#1309]: https://github.com/Sara-Managed-Projects/space-radar/pull/1309
[#1310]: https://github.com/Sara-Managed-Projects/space-radar/pull/1310
[#1311]: https://github.com/Sara-Managed-Projects/space-radar/pull/1311
[#1312]: https://github.com/Sara-Managed-Projects/space-radar/pull/1312
[#1313]: https://github.com/Sara-Managed-Projects/space-radar/pull/1313
[#1314]: https://github.com/Sara-Managed-Projects/space-radar/pull/1314
