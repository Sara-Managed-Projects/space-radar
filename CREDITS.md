# Credits

Space Radar's own code is MIT ([LICENSE](LICENSE)). Everything else in this repository, and every
API the app calls from your browser, belongs to someone else. This file says who, under what terms,
and what you have to keep if you redistribute it.

**How this was checked.** Every version below was measured from the file in the tree — hashed and
byte-compared against the published upstream artifact — and every licence was read from the
upstream `LICENSE` file or the publisher's own terms page, not recalled. Where a claim could *not*
be verified that way, it says so in plain words. Checked 2026-09-07.

---

## At a glance

Every row is a section below, with the licence text read from its publisher, what was changed, and
the credit line to keep. `tests/test_credits.py` and `scripts/check_registry.py` refuse a data
source, 3D model, texture, picture, tile set, sound or font that ships without its line here.

| What | From | Licence or terms | Section |
|---|---|---|---|
| Rendering, orbits, astronomy | three.js, satellite.js, astronomy-engine | MIT | [1](#1-code-libraries) |
| Icons | Lucide (nine, inlined) | ISC, MIT | [1](#1-code-libraries) |
| Planet, moon and sky maps | Solar System Scope; NASA, USGS and mission teams | CC BY 4.0; public domain | [2](#2-textures) |
| Stars and constellations | d3-celestial; HYG v4.4 | BSD-3-Clause; CC BY-SA 4.0 | [3](#3-star-and-constellation-data), [3c](#3c-stars-in-three-dimensions--hyg-cc-by-sa-40) |
| Fainter stars, which constellation, meteor activity | AT-HYG v4.0; CDS VI/42; the IMO's 2027 calendar | CC BY-SA 4.0; a catalogue; facts, cited | [3j](#3j-the-sky-from-the-ground-round-three--at-hyg-cds-vi42-the-imos-working-list-and-a-model-of-the-air) |
| Magnetic declination, for "Point your phone" | World Magnetic Model 2025 (NOAA NCEI, BGS) | public domain (US government) | [3k](#3k-point-your-phone--the-world-magnetic-model-2025-noaa-ncei-and-the-british-geological-survey-public-domain) |
| Deep-sky objects | OpenNGC; Wikipedia for distances | CC BY-SA 4.0; facts, cited per row | [3d](#3d-deep-sky-objects--openngc-cc-by-sa-40-and-the-distances-wikipedias-editors-collected) |
| The Milky Way | our illustration, from Reid et al. 2019 | measurements, cited | [3e](#3e-the-milky-way-model--an-illustration-built-from-published-measurements) |
| 3D spacecraft models | NASA 3D Resources | public domain (NASA media guidelines) | [3b](#3b-3d-models--nasa-public-domain) |
| The Cygnus cargo ship's shape | generated from a NASA photograph with TRELLIS (Microsoft Research), cleaned by us | public domain; MIT; ours | [3b-2](#3b-2-a-model-made-from-photographs--cygnus-2026-10-12) |
| The shapes of XRISM, Seasat and NuSTAR | two generated from NASA and JPL artist's renders with TRELLIS (Microsoft Research) and repaired by us; NuSTAR built by us from published dimensions | public domain; MIT; ours | [3b-3](#3b-3-four-models-made-here--xrism-noaa-21-seasat-nustar-2026-10-13) |
| The shapes of LAGEOS, Ajisai, the Soyuz, NOAA-21 and Hitomi | four built by us in code from published dimensions; Hitomi is XRISM's generated body with its own optical bench built by us | public domain; MIT; ours | [3b-4](#3b-4-five-more-made-here--lageos-ajisai-soyuz-ms-noaa-21-rebuilt-hitomi-2026-10-13) |
| The shapes of the Progress, both Dragons, Shenzhou, Tianzhou, and five more laser-ranging balls | built by us in code from published dimensions | public domain where a picture was used; ours | [3b-5](#3b-5-ten-more-built-from-dimensions--progress-ms-crew-and-cargo-dragon-shenzhou-tianzhou-and-five-laser-ranging-balls-2026-10-13) |
| The shapes of SWOT, NISAR, IXPE and PACE | SWOT is JPL's own published model; the other three built by us in code from published dimensions | public domain; ours | [3b-6](#3b-6-four-nasa-craft--swot-from-jpls-own-model-nisar-ixpe-and-pace-built-from-dimensions-2026-10-13) |
| The shapes of the first Starlink generation, Umbra and ICEYE | built by us in code from published dimensions | ours; one render compared with is CC BY 4.0 | [3b-7](#3b-7-three-commercial-craft-built-from-dimensions--the-first-starlink-generation-umbra-iceye-2026-10-13) |
| The shapes of GPS Block IIR, IIF and III, Galileo, Michibiki, NavIC and SAOCOM | built by us in code from published dimensions | public domain, GODL-India or CC BY 4.0 where a picture was used; ours | [3b-8](#3b-8-seven-more-built-from-dimensions--gps-by-block-galileo-michibiki-navic-saocom-2026-10-13) |
| The shapes of MetOp, XMM-Newton, TerraSAR-X and TanDEM-X, and StriX | built by us in code from published dimensions | public domain, CC BY 3.0 or CC0 where a picture was used; ours | [3b-9](#3b-9-four-more-built-from-dimensions--metop-xmm-newton-terrasar-x-strix-2026-10-13) |
| The shapes of Envisat, ERS-1 and Sentinel-1, -2 and -3 | built by us in code from published dimensions | public domain, CC BY 2.0 or CC BY 4.0 where a picture was used; ours | [3b-10](#3b-10-five-european-earth-observation-craft-built-from-dimensions--envisat-ers-1-sentinel-1-sentinel-2-sentinel-3-2026-10-14) |
| The shapes of Sentinel-5P, CryoSat-2, SMOS and ALOS-2 | built by us in code from published dimensions | public domain, CC BY 2.0 or CC BY 3.0 where a picture was used; ours | [3b-11](#3b-11-four-earth-observation-craft-built-from-dimensions--sentinel-5p-cryosat-2-smos-alos-2-2026-10-14) |
| The shapes of GLONASS-M and GLONASS-K, Fengyun-3 and Himawari-8 and -9 | built by us in code from published dimensions | CC0 or CC BY 2.0 where a picture was used; ours | [3b-12](#3b-12-four-weather-and-navigation-craft-built-from-dimensions--glonass-m-glonass-k-fengyun-3-himawari-2026-10-14) |
| The shapes of Europa Clipper, SMAP, Jason-3, Curiosity and SORCE | NASA's and JPL's own published models | public domain (NASA media guidelines) | [3b-13](#3b-13-five-agencies-own-models--europa-clipper-smap-jason-3-curiosity-sorce-2026-10-15) |
| The shapes of Psyche, Lucy, JUICE, BepiColombo (cruise stack) and Hera | built by us in code from published dimensions | public domain or CC BY 4.0 where a picture was used; ours | [3b-14](#3b-14-five-deep-space-probes-built-from-dimensions--psyche-lucy-juice-bepicolombo-hera-2026-10-15) |
| The shapes of Tiangong and its two laboratories, and the Shenzhou orbital module | built by us in code from published dimensions | CC BY 4.0 or CC0 where a picture was used; ours | [3b-15](#3b-15-release-130-crewed-craft-and-nasa-flagships--tiangong-shenzhou-orbital-module-themis-new-horizons-2026-10-20) |  <!-- 0077 W1-a -->
<!-- 0077 W1-b: begin -->
| The shapes of Mars Express, Gaia, Hayabusa2 and Hope | built by us in code from published dimensions | public domain, CC BY 2.0 or CC BY 3.0 where a picture was used; ours | [3b-15](#3b-15-four-deep-space-craft-built-from-dimensions--mars-express-gaia-hayabusa2-hope-2026-10-20) |
<!-- 0077 W1-b: end -->
<!-- 0077 W1-c: begin -->
| The shapes of the Vikram, Odysseus and Blue Ghost landers, and Surveyor | built by us in code from published dimensions | GODL-India, public domain, CC0 or CC BY 4.0 where a picture was used; ours | [3b-15](#3b-15-three-modern-moon-landers-and-surveyor-built-from-dimensions--vikram-odysseus-blue-ghost-surveyor-2026-10-20) |
<!-- 0077 W1-c: end -->
<!-- 0077 W2-pbr: begin -->
| The shape of SLIM | built by us in code from published dimensions | CC BY 4.0 where a picture was used; ours | [3b-15](#3b-15-slim-built-from-dimensions-2026-10-20) |
<!-- 0077 W2-pbr: end -->
<!-- 0077 W3-b: begin -->
| The shapes of EarthCARE, Biomass, Swarm and MetOp-SG A1 | built by us in code from published dimensions | CC0, CC BY-SA 3.0 IGO or CC BY-SA 4.0 where a picture was compared; ours | [3b-15](#3b-15-four-esa-and-eumetsat-earth-explorers-built-from-dimensions--earthcare-biomass-swarm-metop-sg-a1-2026-10-20) |
<!-- 0077 W3-b: end -->
<!-- 0077 W3-c: begin -->
| The shapes of Zhurong, the Chang'e 3, 4, 5 and 6 landers, Yutu and Lunokhod 1 and 2 | built by us in code from published dimensions | CC0, CC BY 2.0 or CC BY 4.0 where a picture was used; ours | [3b-16](#3b-16-chinas-landers-and-rovers-and-the-lunokhods-built-from-dimensions--zhurong-change-3-and-4-yutu-change-5-and-6-lunokhod-1-and-2-2026-10-20) |
<!-- 0077 W3-c: end -->
<!-- 0077 W3-a: begin -->
| The shapes of IRIS, TIMED, TRACERS, SERT 2 on its Agena and ISIS 1, and Hubble rebuilt | built by us in code from published dimensions | public domain or CC0 where a picture was used, CC BY 4.0 for one paper's figures; ours | [3b-16](#3b-16-nasa-science-craft-built-from-dimensions--iris-timed-tracers-sert-2-isis-1-2026-10-20) |
<!-- 0077 W3-a: end -->
<!-- 0078 r14-m4: begin -->
| The shapes of Meteosat Second Generation, Meteosat Third Generation (imager and sounder), Fengyun-2, INSAT-3D, GEO-KOMPSAT-2A and 2B, Meteor-M No.2, Midori II and Resurs-DK 1 | built by us in code from published dimensions | CC0, public domain, CC BY-SA 2.0 de to 4.0 incl. 3.0 IGO and KOGL Type 1 where a picture was compared; ours | [3b-r14-m4](#3b-r14-m4-ten-weather-and-earth-observation-craft-built-from-dimensions-2026-10-27) |
<!-- 0078 r14-m4: end -->
| Black-hole photographs | Event Horizon Telescope | CC BY 4.0 | [3f](#3f-the-two-photographs--event-horizon-telescope-cc-by-40) |
| Nebula and galaxy photographs | ESA/Hubble, ESA/Webb, ESO, NOIRLab | CC BY 4.0 | [3g](#3g-the-photographs-of-the-nebulae-and-galaxies--esahubble-esawebb-eso-and-noirlab-cc-by-40) |
| The sky in other light | NASA's WISE, WMAP and Fermi, as HiPS from CDS | NASA data, no copyright claimed; tiles ODbL 1.0 | [3h](#3h-the-sky-in-other-light--nasas-wise-wmap-and-fermi-through-cds-hips) |
| Constellation pictures, borders, other peoples' skies | Johan Meuris and the sky-culture authors, through Stellarium; CDS catalogue VI/49 | Free Art License 1.3; CC BY-SA 4.0; a public catalogue, cited | [3i](#3i-constellation-pictures-borders-and-other-peoples-skies--stellarium-and-cds) |
| Satellites and their orbits | CelesTrak | free, with an enforced usage policy | [4.1](#41-celestrak--read-this-before-you-deploy-a-fork) |
| Launches | The Space Devs, Launch Library 2 | free to 15 requests an hour; no published licence | [4.2](#42-the-space-devs--launch-library-2) |
| Deep-space positions, asteroids, comets, close approaches | NASA/JPL Horizons, Small-Body Database, CNEOS | see the section | [4.18](#418-the-sources-the-harvester-reads) |
| Space weather and the aurora | NOAA SWPC | public domain | [4.4](#44-noaa-swpc) |
| Exoplanets | NASA Exoplanet Archive | public; cite the DOI | [4.7](#47-nasa-exoplanet-archive--confirmed-planets) |
| Today's clouds | NASA GIBS (GOES, Himawari) | open; acknowledgement asked | [4.13](#413-nasa-gibs--todays-clouds-2026-09-28) |
| Storms, lightning | GDACS; NOAA nowCOAST | CC BY 4.0; public domain | [4.14](#414-gdacs--tropical-cyclones-2026-09-28), [4.17](#417-noaa-nowcoast--lightning-2026-10-03) |
| Fires, volcanoes and icebergs | NASA EONET | NASA service; its disclaimer | [4.20](#420-nasa-eonet--fires-volcanoes-and-icebergs-2026-10-07) |
| The wind | NOAA/NCEP GFS, through PacIOOS ERDDAP | free to use and redistribute | [4.21](#421-noaa-gfs-through-pacioos--the-wind-2026-10-07) |
| Ocean currents, and the sea temperature that colours them | NOAA CoastWatch (altimetry; Copernicus Sentinel, AVISO+); NOAA NCEI OISST v2.1 | free to use and redistribute; citation asked | [4.22](#422-noaa-coastwatch-and-noaa-oisst--ocean-currents-2026-10-12) |
| Moon and Mars close-up tiles and relief; the Earth close up | NASA Solar System Treks; USGS Astrogeology; NASA GIBS | NASA content; HRSC's share of Mars's relief CC BY-SA 3.0 IGO | [4.16](#416-nasa-solar-system-treks--the-moon-and-mars-close-up-2026-10-03) |
| Countries and seas | Natural Earth | public domain | [4.15](#415-natural-earth--the-country-or-sea-under-a-satellite-2026-09-29) |
| Dishes, crews, observatories | NASA DSN Now; Open Notify; Wikidata | see the section; CC0 for Wikidata | [4.3](#43-nasa--dsn-now), [4.18](#418-the-sources-the-harvester-reads) |
| Music and sounds | John Bartmann (Free Music Archive); Freesound contributors | CC0 1.0 | [9](#9-audio--music-and-sounds) |
| The trips' voice | Kokoro-82M, a synthetic voice | Apache-2.0 | [9b](#9b-audio--the-trips-narration-a-synthetic-voice) |
| Typefaces | Inter, Barlow Semi Condensed, JetBrains Mono | SIL OFL 1.1 | [10](#10-fonts) |
| The GitHub mark | GitHub, Inc. | a trademark, used under GitHub's logo rules | [4.6](#46-third-party-trademarks-the-app-names-or-draws) |

---

## 1. Code libraries

All three are vendored in `site/vendor/`. There is no `package.json` and no build step: what is in
the tree is what the browser runs.

| Item | Version | Licence | Credit line | Link |
|---|---|---|---|---|
| three.js | 0.185.1 | MIT | © 2010–2026 three.js authors | <https://threejs.org> |
| three.js addons | r185 | MIT | GLTFLoader, BufferGeometryUtils, SkeletonUtils — vendored from the same release |
| meshopt decoder | r185 bundle | MIT | `meshopt_decoder.module.js`, © 2016-2024 Arseny Kapoulkine |
| three.js KTX2 loader | r185 | MIT | `vendor/basis/KTX2Loader.js`, `WorkerPool.js`, `ColorSpaces.js`, © 2010–2026 three.js authors | <https://github.com/mrdoob/three.js/tree/r185/examples/jsm> |
| ktx-parse | r185 bundle | MIT | `vendor/basis/ktx-parse.module.js`, © 2020 Don McCurdy | <https://github.com/donmccurdy/ktx-parse> |
| zstddec | r185 bundle | MIT, and BSD for the Zstandard it carries | `vendor/basis/zstddec.module.js`, © 2020 Don McCurdy; Zstandard © Meta Platforms, Inc. and affiliates | <https://github.com/donmccurdy/zstddec> |
| Basis Universal transcoder | r185 bundle | Apache-2.0 | `vendor/basis/basis_transcoder.js` and `.wasm`, © 2019–2026 Binomial LLC | <https://github.com/BinomialLLC/basis_universal> |
| satellite.js | 7.1.0 | MIT | © 2013 Shashwat Kandadai, UCSC Jack Baskin School of Engineering | <https://github.com/shashwatak/satellite-js> |
| astronomy-engine | 2.1.17–2.1.19 (see note) | MIT | © 2019–2023 Don Cross <cosinekitty@gmail.com> | <https://github.com/cosinekitty/astronomy> |
| Lucide icons (inlined; the list is below) | `main`, read 2026-10-01 to 2026-10-05 | ISC; the Feather-derived ones MIT | © Lucide Icons and Contributors; Feather © 2013-present Cole Bemis | <https://lucide.dev> |

MIT requires that its copyright notice **and** its permission notice travel with every copy. They
are reproduced in full in [§6](#6-full-licence-notices).

**three.js** — `site/vendor/three.core.min.js` and `site/vendor/three.module.min.js` are
byte-identical to `build/three.core.min.js` and `build/three.module.min.js` in the npm tarball
`three@0.185.1`. Unmodified. (The `@license` banner inside the files reads
`Copyright 2010-2026 Three.js Authors / SPDX-License-Identifier: MIT`; the repository's own LICENSE
spells the holder `three.js authors`, and that is the spelling used above.)

**The KTX2 loader and the Basis transcoder** (`site/vendor/basis/`, spec 0056 task 1, 2026-10-08).
Seven files from tag `r185` of <https://github.com/mrdoob/three.js>, under `examples/jsm/`, the
release the two three.js bundles are: `loaders/KTX2Loader.js` (36 535 B here), `utils/WorkerPool.js`
(3 110 B), `math/ColorSpaces.js` (4 307 B), `libs/ktx-parse.module.js` (19 932 B),
`libs/zstddec.module.js` (39 754 B), `libs/basis/basis_transcoder.js` (57 529 B) and
`libs/basis/basis_transcoder.wasm` (527 333 B). **Changed: import lines only.** There is no bundler
and no import map, so `'three'` became `'../three.module.min.js'` (in `KTX2Loader.js` and
`ColorSpaces.js`), the four relative imports of `KTX2Loader.js` became the same names beside it,
and its two `new URL('../libs/basis/basis_transcoder.*', import.meta.url)` became
`./basis_transcoder.*`. The other five files are byte-identical to the release, and
`tests/test_ktx2.mjs` holds them to their SHA-256. **Not on a first visit and not in the offline
shell:** `site/js/scene/ktx2.js` imports the loader the first time a map that has a `.ktx2` twin is
asked for, and no map ships one yet. Licences read on 2026-10-08: three.js's `LICENSE` at the tag
(MIT); `LICENSE` of ktx-parse and of zstddec (MIT, © 2020 Don McCurdy; zstddec's goes on to
reproduce Zstandard's BSD licence); `LICENSE` of Basis Universal (Apache License 2.0, "Copyright
2019-2026 Binomial LLC"), which three.js's own `libs/basis/README.md` names as the transcoder's.
The notices are in [§6](#6-full-licence-notices).

**satellite.js** — `site/vendor/satellite.esm.js` is byte-identical to
`https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/+esm`, a jsDelivr-generated ESM bundle of
`satellite.js@7.1.0/dist/index.js`. **The vendored file carries no copyright notice** — its banner
is jsDelivr's build stamp only. Reproducing the notice in §6 is what makes shipping it compliant;
do not delete that section. satellite.js is itself a derivative of Brandon Rhodes' Python
[`sgp4`](https://pypi.org/project/sgp4/) (MIT), which is a port of the SGP4 reference C++ by David
Vallado et al. and of Spacetrack Report #3 (Hoots & Roehrich).

**astronomy-engine** — `site/vendor/astronomy.js` is byte-identical to `esm/astronomy.js` as
published in astronomy-engine **2.1.17, 2.1.18 and 2.1.19**; those three releases ship the identical
ESM build, so the file alone cannot distinguish them. The project's now-removed `docs/toolkit.md`
recorded 2.1.19. The copyright line above is the one **inside the shipped file**, which is the one
MIT obliges us to carry. Upstream's current `LICENSE` on `master` reads `2019-2025`; that is a later
edit to a file we do not ship, and does not change the notice attached to this copy.
Since 2026-10-07 a deploy uploads this file without its documentation comments
(`scripts/minify_site.py`); the licence header above is kept word for word, and the file in git is
still the published one.

**Lucide** — the app's one icon family, copied element for element from `icons/<name>.svg` on
Lucide's `main` branch (<https://github.com/lucide-icons/lucide>, read 2026-10-01 to 2026-10-03).
In `site/js/ui/cards.js` (`ICONS`, where `chevron` is Lucide's `chevron-right`): `x`, `crosshair`,
`orbit`, `camera`, `share`, `chevron-right`, `chevron-left`, `navigation`, `telescope`, `play`,
`pause`, `rotate-ccw`, `volume-2`, `volume-x`, `speech`, `panel-left-close`, `panel-left-open`,
`panel-bottom-close`, `panel-bottom-open`, `compass`, and for present mode (read 2026-10-06)
`presentation`, `maximize`, `minimize`, `timer`, `house`. In `site/js/ui/sharesheet.js`: `x`, `share`,
`copy`, `download`, `file-text` (its `file`), `mail`, `crop`, `code`, `chevron-down`. In
`site/js/ui/photomode.js`: `x`, `download`. In `site/js/ui/searchrows.js` (`ROW_ICONS`, from
`lucide-static` 0.544.0, read 2026-10-07): `satellite`, `rocket`, `globe`, `moon`, `star`, `sun`,
`sparkles`, `map-pin`, `tornado`, `flag`. In `site/js/ui/embed.js`: `external-link`. In
`site/js/ui/rail.js`: `share`, `ellipsis-vertical`, `eye-off`. In `site/js/ui/keyhint.js`: `move`,
`mouse`. In `site/js/ui/launchchip.js`: `rocket`, the same shapes as the search row's. The only change is the
stroke, 1.75 instead of Lucide's default 2, which `docs/ui-guide.md` §3.16 sets for every icon in
the app (`tests/test_a11y_static.mjs` holds it); Lucide draws at any stroke width by design. These
are on Lucide's own list of icons derived from Feather (its `LICENSE`, read 2026-10-05), which are
MIT, © Cole Bemis: `x`, `crosshair`, `chevron-right`, `chevron-left`, `navigation`, `share`,
`compass`, `copy`, `download`, `move`, `crop`, `code`, `chevron-down`, `external-link`, and
`ellipsis-vertical` under its Feather name
`more-vertical`; the rest are ISC. Both notices are in [§6](#6-full-licence-notices).
`tests/test_a11y_static.mjs` refuses an `ICONS` name this paragraph does not list.

**axe-core, for a test only** — `tests/vendor/axe.min.js` is axe-core 4.10.3 (© 2015-2025 Deque
Systems, Inc., Mozilla Public License 2.0), the file `axe.min.js` of the npm package `axe-core@4.10.3`,
unmodified, copied 2026-10-08 (sha256 `880970c081707360e64f34cea25ff91892f5bc95675b0776925b9709dd8a68bb`).
It is not part of the site: nothing under `site/` loads it and a deploy does not upload `tests/`.
`tests/probes/axe-probe.js` is concatenated after it and run inside a headless browser by
`tools/cdp.mjs`, so the accessibility check loads no script from anybody's server. The file keeps
its own licence header, as the MPL asks; its source is <https://github.com/dequelabs/axe-core>.

## 2. Textures

**Two tiers since 2026-09-28.** `registry/textures.yaml` is the record of every map, with its file
per device tier, licence, credit and source; `scripts/check_registry.py` refuses a row missing any
of them and a file under `site/textures/` that no row names. The 14 files described next are tier 0,
the set every visitor boots with. The 4k tier under `site/textures/4k/` is described after them.

### Tier 0: the Solar System Scope 2k set

`site/textures/` holds **14** files at its top level (not 13). Every one of them carries a filename from the Solar
System Scope free texture pack, is 2048 × 1024 equirectangular (the pack's "2k" tier), and — for
twelve of the fourteen — an identical Adobe Photoshop CC (Windows) XMP fingerprint from the same
2015–2016 authoring session.

**Licence: CC BY 4.0.** Quoted exactly from <https://www.solarsystemscope.com/textures/>:

> Distributed under Attribution 4.0 International license:
> You may use, adapt, and share these textures for any purpose, even commercially.

and, on the same page, about provenance:

> Textures in this pack are based on NASA elevation and imagery data. Colors and shades of the
> textures are tuned accordng to true-color photos made by Messenger, Viking and Cassini
> spacecrafts, and, of course, the Hubble Space Telescope.

> Earth textures are the most precise part of the pack: They are a result of merging and adjusting
> large amount of geo-data, space photos and images from NASA's Blue Marble

The page states no specific wording for the credit. It links the licence deed at
<https://creativecommons.org/licenses/by/4.0/>, which requires the creator's name, a copyright
notice, a licence notice, a link to the material, and an indication of any changes. This project
satisfies that with:

> Planet and star textures © Solar System Scope (<https://www.solarsystemscope.com/textures/>),
> licensed CC BY 4.0 (<https://creativecommons.org/licenses/by/4.0/>). Used unmodified, except
> three files re-encoded from JPEG to WebP (quality 0.85) on 2026-09-21, same pixels in the same
> dimensions, to cut a first visit on a phone by about 730 kB: the night side, the cloud layer (as
> one grey channel, which is all the shader reads) and the Milky Way. The day side is deliberately
> still the original JPEG: the ocean mask is computed from its colour, and WebP's halved colour
> resolution moved 1.6 % of its pixels between sea and land.

| File | Used for | Licence | Source |
|---|---|---|---|
| `2k_sun.webp` | the Sun | CC BY 4.0 | Solar System Scope |
| `2k_mercury_messenger.webp` | Mercury | Public domain | [USGS Astrogeology Science Center and NASA/JHUAPL/Carnegie Institution of Washington (MESSENGER MDIS three-colour mosaic)](https://planetarymaps.usgs.gov/mosaic/Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_665m.lbl), toned down |
| `2k_mercury_relief.webp` | Mercury (relief) | Public domain | [USGS Astrogeology Science Center, MESSENGER global digital elevation model (Becker et al. 2016)](https://astrogeology.usgs.gov/search/map/mercury_messenger_global_dem_665m), local relief only, one grey channel |
| `2k_venus_radar.webp` | Venus, the ground by radar (when asked for on its card) | Public domain | [USGS Astrogeology Science Center and NASA/JPL-Caltech (Magellan C3-MIDR mosaic)](https://planetarymaps.usgs.gov/mosaic/Venus_Magellan_C3-MDIR_Global_Mosaic_2025m.lbl), one grey channel (the orange is added when it is drawn) |
| `2k_venus_relief.webp` | Venus, the relief under the radar ground | Public domain | [USGS Astrogeology Science Center and NASA/JPL-Caltech (Magellan radar altimeter, Venus Magellan Global Topography 4641 m)](https://planetarymaps.usgs.gov/mosaic/Venus_Magellan_Topography_Global_4641m_v02.lbl), local relief only, one grey channel |
| `2k_venus_atmosphere.webp` | Venus | CC BY 4.0 | Solar System Scope |
| `2k_earth_daymap.webp` | Earth, day side | CC BY 4.0 | Solar System Scope |
| `2k_earth_nightmap.webp` | Earth, night side | CC BY 4.0 | Solar System Scope |
| `2k_earth_clouds.webp` | Earth cloud layer | CC BY 4.0 | Solar System Scope |
| `2k_moon.webp` | the Moon | CC BY 4.0 | Solar System Scope |
| `2k_mars.webp` | Mars | CC BY 4.0 | Solar System Scope |
| `2k_mars_relief.webp`, `1k_mars_height.webp` | Mars (relief, and the heights its shadows are cast from) | Public domain | [Mars Orbiter Laser Altimeter gridded topography, MGS MOLA MEGDR at 16 pixels per degree (D.E. Smith et al., NASA Goddard Space Flight Center), NASA Planetary Data System Geosciences Node](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl), adapted: resampled to 1536 x 768 as local relief and to 1024 x 512 as heights from -8200 to 21300 m, one grey channel each |
| `2k_jupiter.webp` | Jupiter | CC BY 4.0 | Solar System Scope |
| `2k_jupiter_opal_2025.webp` | Jupiter, as Hubble saw it (when asked for on its card) | CC BY 4.0 | [NASA, ESA, A.A. Simon, M.H. Wong: Hubble OPAL programme, WFC3/UVIS, 11 December 2025](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-32), adapted: calibrated, gap-filled at the poles, resampled; 63 500 B |
| `2k_saturn.webp` | Saturn | CC BY 4.0 | Solar System Scope |
| `2k_saturn_opal_2025.webp` | Saturn, as Hubble saw it (when asked for on its card) | CC BY 4.0 | [NASA, ESA, A.A. Simon, M.H. Wong: Hubble OPAL programme, WFC3/UVIS, 29 August 2025](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32), adapted: calibrated, the strip the rings hid and the poles filled, resampled; 21 186 B |
| `2k_saturn_ring_alpha.png` | Saturn's rings | CC BY 4.0 | Solar System Scope |
| `8k_saturn_ring_fine.png` | Saturn's rings, their fine structure from close | Public domain | [Cassini UVIS stellar occultation of Beta Centauri, orbit 77, 2008 (Colwell et al. 2010), NASA Planetary Data System, Ring-Moon Systems Node](https://pds-rings.seti.org/holdings/volumes/COUVIS_8xxx/COUVIS_8001/data/UVIS_HSP_2008_202_BETCEN_I_TAU01KM.LBL), adapted: the measured optical depth over its own neighbourhood's, 8192 x 1, one grey channel |
| `2k_uranus.webp` | Uranus | CC BY 4.0 | Solar System Scope |
| `1k_uranus_opal_2025.webp` | Uranus, as Hubble saw it (when asked for on its card) | CC BY 4.0 | [NASA, ESA, A.A. Simon, M.H. Wong: Hubble OPAL programme, WFC3/UVIS, 23 October 2025](https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33), adapted: calibrated, the unseen southern half filled with the equator's colour; 3 552 B |
| `2k_neptune.webp` | Neptune | CC BY 4.0 | Solar System Scope |
| `1k_neptune_opal_2025.webp` | Neptune, as Hubble saw it (when asked for on its card) | CC BY 4.0 | [NASA, ESA, A.A. Simon, M.H. Wong: Hubble OPAL programme, WFC3/UVIS, 24 August 2025](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32), adapted: calibrated, the unseen far north filled; 4 766 B |
| `2k_stars_milky_way.webp` | the Milky Way sky sphere | CC BY 4.0 | Solar System Scope |

**What could not be verified, stated plainly.** solarsystemscope.com answers HTTP 403 to scripted
downloads, so these files could not be byte-compared against the origin. Provenance rests on the
exact filename match to the published pack (all 14 appear on their download list as `2k_*.jpg`),
the matching 2048 × 1024 dimensions, and the shared XMP fingerprint of the JPEGs as they were
received. `2k_uranus.jpg` and `2k_neptune.jpg` carried no XMP block at all — the other twelve did —
so those two are the weakest links in the chain. If you want certainty, re-download the pack by
hand and diff.

**Adapted on 2026-10-08: nine of them re-encoded.** The Sun, Venus, the Earth by day, the Moon,
Mars, Jupiter, Saturn, Uranus and Neptune were shipped as the publisher's JPEGs (4 337 849 B in all)
until that day. They are now WebP files of the same 2048 × 1024 pixels (1 877 120 B), each at the
lowest quality whose luma SSIM against its JPEG is at least 0.98 (`scripts/build-textures.py
--webp-2k`; each file's quality and score are in `registry/textures.yaml`). No resampling, no
grading. The licence allows it and was read again on the publisher's page that day: *"Distributed
under Attribution 4.0 International license: You may use, adapt, and share these textures for any
purpose, even commercially."* The JPEGs are in this repository's history before that date.

**The four giants have a second face, Hubble's (2026-10-07).** They are met in the Solar System Scope maps
above; on the card, "As Hubble saw it" fetches and puts on the global maps of
the Outer Planet Atmospheres Legacy programme (OPAL; PI Amy Simon; Simon et al. 2015, Wong et al. 2020),
a High-Level Science Product at MAST, <https://archive.stsci.edu/hlsp/opal>, doi:10.17909/T9G593, read
2026-10-07. Licence: MAST's data-use page says "Some data products, such as high-level science products
(HLSPs) which are created by the community and are made available through MAST, are covered under a
Creative Commons Attribution license (CC BY 4.0)" (<https://archive.stsci.edu/publishing/data-use>), and
the 2025 FITS files of Jupiter and Uranus carry `LICENSE = 'CC BY 4.0'` and `LIC_ATTR = 'NASA, ESA, A.A.
Simon, M.H. Wong'` in their headers. The programme asks for this acknowledgement, given here in full:
"This work used data acquired from the NASA/ESA HST Space Telescope, associated with OPAL program (PI:
Simon, GO13937), and archived by the Space Telescope Science Institute, which is operated by the
Association of Universities for Research in Astronomy, Inc., under NASA contract NAS 5-26555. All maps
are available at http://dx.doi.org/10.17909/T9G593." **Changes made** (CC BY 4.0 asks that they be
said; `scripts/build-textures.py` GIANTS has the arithmetic): three filters' calibrated maps combined as
red, green and blue (631, 502 and 395 nm for Jupiter and Saturn; 657, 547 and 467 nm for Uranus and
Neptune) on one albedo scale; the latitudes Hubble could not see from the Earth, and the strip Saturn's
rings hid, filled from the rows beside them; rows resampled from planetographic to planetocentric
latitude; rolled half a turn; resized; WebP. Nothing by Björn Jónsson or any other author whose terms
forbid hosting is in them.

**Twenty moon and dwarf-planet maps are public domain (issue #262, 2026-09-28; issues #387 to #415,
2026-10-05).** Every world in `registry/worlds.yaml` that was one flat colour now wears a map, except
Deimos, for which no public-domain mosaic was found. They come from the USGS Astrogeology Science
Center's global mosaics (<https://planetarymaps.usgs.gov/mosaic/>; "USGS-authored or produced data
and information are considered to be in the U.S. Public Domain", usgs.gov, *Copyrights and
Credits*) and from NASA maps mirrored on Wikimedia Commons, where each file's page says public
domain. Public-domain works need no credit, but they get one anyway. `scripts/build-textures.py`
(`--only moons`) remakes every one of them but Triton's and Pluto's from its original, and every map
was changed. (Pluto's, since 2026-10-12, is NASA's own global colour map, Photojournal PIA11707, made
by `scripts/build_pluto_map.py`: its colours are enhanced, as NASA published them, and its card says
so. The list below is about the others.)

- resized (the width is in `registry/textures.yaml`; no file is over 250 kB) and, where the original
  is centred on longitude 180, rolled half a turn so longitude 0, the side that faces the planet,
  is at the centre;
- **the black-and-white mosaics are tinted** with the world's flat colour, which is chosen from
  published descriptions: Europa, Ganymede, Callisto, Titan, the five moons of Uranus and Phobos.
  Only the pattern of light and dark is measured;
- **Cassini's colour maps** (Mimas, Enceladus, Tethys, Dione, Rhea, Iapetus; P. Schenk, LPI) are made
  from infrared, green and ultraviolet pictures and are far more colourful than the eye would see:
  35 % of their saturation is kept. Triton's is desaturated the same way. Io keeps USGS's colours;
- **Titan's** is Cassini's 938 nm map, made through the haze, at half its contrast. In visible light
  nobody has seen Titan's ground, and the card says so;
- the brightness is taken to the flat colour's luminance, so the light-to-dark order of the worlds
  still follows their measured albedos (the bright ice moons come out up to 11 % under it: the
  build prints the figure and `registry/textures.yaml` carries it under `make:`);
- **where nobody has looked, nothing is drawn.** The areas with no data in the original (the last
  column below is the share of the sphere that has data) are filled with the world's flat colour:
  the northern halves of Uranus's moons, which were in darkness when Voyager 2 passed in 1986, the
  far south of Pluto and Charon, part of Triton. The card of each says so.

| File | Used for | Licence | Source | Mapped |
|---|---|---|---|---|
| `2k_io_usgs.webp` | Io | Public domain | [USGS Astrogeology Science Center (Galileo SSI and Voyager)](https://planetarymaps.usgs.gov/mosaic/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.lbl): Galileo SSI and Voyager colour mosaic | 100 % |
| `2k_europa_usgs.webp` | Europa | Public domain | [USGS Astrogeology Science Center (Voyager and Galileo SSI)](https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.lbl): Voyager and Galileo SSI mosaic, greyscale | 100 % |
| `2k_ganymede_usgs.webp` | Ganymede | Public domain | [USGS Astrogeology Science Center (Voyager and Galileo SSI)](https://planetarymaps.usgs.gov/mosaic/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.lbl): Voyager and Galileo SSI mosaic, greyscale | 100 % |
| `2k_callisto_usgs.webp` | Callisto | Public domain | [USGS Astrogeology Science Center (Voyager and Galileo SSI)](https://planetarymaps.usgs.gov/mosaic/Callisto_Voyager_GalileoSSI_global_mosaic_1km.lbl): Voyager and Galileo SSI mosaic, greyscale | 99 % |
| `2k_enceladus_cassini.webp` | Enceladus | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute](https://commons.wikimedia.org/wiki/File:Enceladus_Color_Map.jpg): Cassini colour map (PIA18435; infrared, green, ultraviolet) | 100 % |
| `2k_mimas_cassini.webp` | Mimas | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18437)](https://commons.wikimedia.org/wiki/File:Map_of_Mimas_colorized_2014-04_PIA18437.jpg): Cassini colour map (infrared, green, ultraviolet) | 100 % |
| `2k_tethys_cassini.webp` | Tethys | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18439)](https://commons.wikimedia.org/wiki/File:Tethys_Color_Map.jpg): Cassini colour map (infrared, green, ultraviolet) | 100 % |
| `2k_dione_cassini.webp` | Dione | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18434)](https://commons.wikimedia.org/wiki/File:Dione_Color_Map.jpg): Cassini colour map (infrared, green, ultraviolet) | 100 % |
| `2k_rhea_cassini.webp` | Rhea | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18438)](https://commons.wikimedia.org/wiki/File:Rhea_Color_Map.jpg): Cassini colour map (infrared, green, ultraviolet) | 100 % |
| `2k_iapetus_cassini.webp` | Iapetus | Public domain | [NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18436)](https://commons.wikimedia.org/wiki/File:Iapetus_Color_Map.jpg): Cassini colour map (infrared, green, ultraviolet) | 100 % |
| `2k_titan_cassini_2018.webp` | Titan | Public domain | [NASA/JPL-Caltech/Univ. Arizona (Cassini ISS, 938 nm, PIA22770)](https://photojournal.jpl.nasa.gov/catalog/PIA22770): the 2018 global mosaic of 9 873 pictures, made without image seams (it replaces USGS's copy of the 2015 mosaic, PIA19658, whose seams showed); near-infrared, tinted, contrast halved; 43 396 B | 100 % |
| `2k_triton_voyager.webp` | Triton | Public domain | [USGS Astrogeology Science Center and NASA/JPL-Caltech/Lunar and Planetary Institute (Voyager 2, P. Schenk, PIA18668)](https://planetarymaps.usgs.gov/mosaic/Triton_Voyager2_ClrMosaic_GlobalFill_600m.lbl): Voyager 2 colour map (orange, green, blue), colour balanced and toned down; the north is unseen | 67 % |
| `2k_ceres_dawn.webp` | Ceres, on its shape model | NASA media guidelines (not subject to copyright in the US); made by DLR for the Dawn mission | [NASA/JPL-Caltech/UCLA/MPS/DLR/IDA, hosted by USGS Astrogeology](https://planetarymaps.usgs.gov/mosaic/Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.lbl): Dawn Framing Camera global mosaic of 2015, black and white, tinted in a grey we chose, rolled half a turn; 227 830 B | 99.6 % |
| `2k_vesta_dawn.webp` | Vesta, on its shape model | NASA media guidelines (not subject to copyright in the US); made by DLR for the Dawn mission | [NASA/JPL-Caltech/UCLA/MPS/DLR/IDA, hosted by USGS Astrogeology](https://planetarymaps.usgs.gov/mosaic/Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd.lbl): Dawn Framing Camera HAMO mosaic of 2011 to 2012, black and white, tinted in a grey we chose; the far north was in winter shadow; 230 890 B | 100 % |
| `1k_miranda_voyager.webp` | Miranda | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Miranda_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 39 % |
| `1k_ariel_voyager.webp` | Ariel | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Ariel_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 34 % |
| `1k_umbriel_voyager.webp` | Umbriel | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Umbriel_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 37 % |
| `1k_titania_voyager.webp` | Titania | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Titania_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 32 % |
| `1k_oberon_voyager.webp` | Oberon | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Oberon_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 34 % |
| `2k_pluto_nh_colour.webp` | Pluto | Public domain | [NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute (New Horizons global colour map, Photojournal PIA11707)](https://science.nasa.gov/image-detail/amf-pia11707): NASA's own map, made from three of the colour camera's filters, none of them green; enhanced colour, not what an eye would see, and the card says so. Resized, rolled, brightness taken to the flat colour's; the unimaged south filled plain and feathered (`scripts/build_pluto_map.py`) | 78 % |
| `2k_charon_nh_colour.webp` | Charon | Public domain | [NASA/JHUAPL/SwRI (New Horizons MVIC colour mosaic, NASA Planetary Data System)](https://pds-smallbodies.astro.umd.edu/holdings/nh-p_psa-leisa_mvic-5-comp-v1.0/data/mosaic/nh_charon_color_mosaic.lbl) and [USGS Astrogeology Science Center (LORRI mosaic)](https://planetarymaps.usgs.gov/mosaic/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.lbl): colour from the red and blue filters, green between them; black-and-white fill where there is no colour | 74 % |
| `2k_phobos_viking.webp` | Phobos | Public domain | [USGS Astrogeology Science Center (Viking Orbiter mosaic, control by P. Stooke)](https://commons.wikimedia.org/wiki/File:Phobos_Viking_Mosaic_DLRcontrol_7200.jpg): Viking Orbiter mosaic, greyscale | 100 % |

**Beyond these twenty, no tier-0 texture comes from anywhere else.** In particular, `registry/models.yaml` claims
the night-side texture comes from NASA Earth Observatory's Night Lights and the starfield from NASA
SVS 4851. Neither is what shipped: `2k_earth_nightmap.webp` and `2k_stars_milky_way.webp` are Solar
System Scope files, by name, size and fingerprint. The registry is wrong and the table above is
right. See [§5](#5-corrections-to-registrymodelsyaml). (Since 2026-09-28 the 4k tier below does
carry a NASA night map and the SVS 4851 Milky Way; the 2k files are still Solar System Scope's.)

### Tier 1: the 4k set (`site/textures/4k/`, 2026-09-28)

Fetched only by a laptop or desktop, after the first frame, when the browser is idle
(`site/js/scene/texturetiers.js`); a phone never asks for them. Every file is rebuilt from its
original by `scripts/build-textures.py --originals DIR`; the originals are not committed.

| File | Used for | Source | Licence, quoted | Changes |
|---|---|---|---|---|
| `4k/earth_day_01.webp` … `4k/earth_day_12.webp` | Earth by day, the clock's month | Blue Marble: Next Generation, base map, 2004, 5400 × 2700 (<https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/>) | "Anyone using or republishing Blue Marble: Next Generation please credit “NASA Earth Observatory.”" | resampled to 4096 × 2048; colour-graded to the 2k Solar System Scope map (a 32-cube table per surface fitted on June), WebP 86 |
| `4k/earth_night.webp` | Earth's night lights | Black Marble 2016, greyscale, 13500 × 6750 (<https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/>) | NASA Images and Media Usage Guidelines: texture maps "generally are not subject to copyright in the United States" | resampled to 4096 × 2048, levels matched to the 2k map, one grey channel, WebP 80 |
| `4k/earth_water.webp` | the ocean glint's land/water mask | Solar System Scope `8k_earth_specular_map.tif` | CC BY 4.0, as tier 0 | box-filtered to 4096 × 2048, lossless WebP |
| `1k_earth_relief.webp`, `2k_earth_relief.webp` | the Earth's relief under a low Sun (tier 1, tier 2) | NOAA National Centers for Environmental Information, ETOPO 2022 15 Arc-Second Global Relief Model, the 60 arc-second ice-surface grid (<https://doi.org/10.25921/fd45-gt74>, read 2026-10-08) | CC0 1.0: "NOAA waives any potential copyright and related rights in these data worldwide through the Creative Commons Zero 1.0 Universal Public Domain Dedication" | heights above the sea only, area-averaged to 1024 × 512 and 2048 × 1024, one grey channel holding sqrt(height / 9000 m), lossless WebP; drawn five times steeper than the ground is |
| `4k/milky_way.webp` | the Milky Way sky sphere | NASA SVS Deep Star Maps 2020, `milkyway_2020_4k_gal.exr`, the background without the Hipparcos and Tycho stars (<https://svs.gsfc.nasa.gov/4851/>) | "Please give credit for this item to: NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC." | flipped top to bottom, brightness matched to the 2k map, 60 % saturation, sRGB, WebP 90 |
| `4k/moon.webp`, `4k/mars.webp`, `4k/jupiter.webp` | those worlds, close up | Solar System Scope `8k_moon.jpg`, `8k_mars.jpg`, `8k_jupiter.jpg` (Jupiter's is 4096 wide) | CC BY 4.0, as tier 0 | resampled to 4096 × 2048, WebP (72 for the Moon, 84 otherwise) |
| `4k/mercury.webp` | Mercury, close up | USGS MESSENGER MDIS three-colour mosaic, 665 m (<https://planetarymaps.usgs.gov/mosaic/Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_665m.lbl>) | Public domain (USGS) | 4096 × 2048, 35 % of the saturation kept, WebP 40 |

**Credit lines printed in the app** (the Sources panel lists the ones in use on the device; each is
checked against this list by `scripts/check_registry.py`):

- Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0
- Giant planet maps: NASA, ESA, A.A. Simon, M.H. Wong (Hubble OPAL programme, doi:10.17909/T9G593), CC BY 4.0, adapted
- Mercury map: USGS Astrogeology Science Center and NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (MESSENGER MDIS), public domain
- Saturn's fine ring structure: Cassini UVIS stellar occultation of Beta Centauri, orbit 77, 2008 (Colwell et al. 2010; NASA Planetary Data System, Ring-Moon Systems Node, data set CO-SR-UVIS-HSP-2/4-OCC-V3.0), public domain, as the measured optical depth over its own neighbourhood's
- Mercury relief: USGS Astrogeology Science Center, MESSENGER global digital elevation model (Becker et al. 2016; NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington), public domain, local relief only
- Venus relief: USGS Astrogeology Science Center and NASA/JPL-Caltech (Magellan radar altimeter, global topography 4641 m), public domain, local relief only
- Venus surface map: USGS Astrogeology Science Center and NASA/JPL-Caltech (Magellan radar, C3-MIDR mosaic), public domain
- Mars relief and heights: Mars Orbiter Laser Altimeter gridded topography (MGS MOLA MEGDR, 16 pixels per degree; D.E. Smith et al., NASA Goddard Space Flight Center), NASA Planetary Data System Geosciences Node, public domain, resampled
- Earth by day (4k): Blue Marble Next Generation, NASA Earth Observatory
- Earth at night (4k): Black Marble 2016, NASA Earth Observatory
- Earth water mask (4k): Solar System Scope (solarsystemscope.com), CC BY 4.0
- Earth relief: NOAA National Centers for Environmental Information, ETOPO 2022 Global Relief Model (doi:10.25921/fd45-gt74), CC0
- Milky Way (4k): NASA/Goddard Space Flight Center Scientific Visualization Studio, Gaia DR2: ESA/Gaia/DPAC
- Io map: USGS Astrogeology Science Center (Galileo SSI and Voyager), public domain
- Europa map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain
- Ganymede map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain
- Callisto map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain
- Enceladus map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute, public domain
- Mimas map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18437), public domain
- Tethys map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18439), public domain
- Dione map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18434), public domain
- Rhea map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18438), public domain
- Iapetus map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18436), public domain
- Titan map: NASA/JPL-Caltech/Univ. Arizona (Cassini ISS, 938 nm, PIA22770), public domain
<!-- 0077 W1-f: begin -->
- Titan radar map: USGS Astrogeology Science Center and NASA/JPL-Caltech (Cassini RADAR, SAR and HiSAR mosaic through flyby T104), public domain
- Titan seas: outlined from the same Cassini RADAR mosaic (USGS Astrogeology Science Center and NASA/JPL-Caltech), public domain
<!-- 0077 W1-f: end -->
- Triton map: USGS Astrogeology Science Center and NASA/JPL-Caltech/Lunar and Planetary Institute (Voyager 2, P. Schenk, PIA18668), public domain
- Ceres map: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA (Dawn Framing Camera, global mosaic by DLR), hosted by USGS Astrogeology Science Center
- Vesta map and shape: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA (Dawn Framing Camera, HAMO mosaic and stereo height model by DLR), hosted by USGS Astrogeology Science Center
- Miranda map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Ariel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Umbriel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Titania map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Oberon map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Pluto map: NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute (New Horizons global colour map, Photojournal PIA11707), public domain
- Charon map: NASA/JHUAPL/SwRI (New Horizons MVIC colour mosaic, NASA Planetary Data System) and USGS Astrogeology Science Center (LORRI mosaic), public domain
- Phobos map: USGS Astrogeology Science Center (Viking Orbiter mosaic, control by P. Stooke), public domain

**Refused by name**, because their terms forbid hosting copies: Björn Jónsson's maps ("please do
not place a copy of the maps on your website") and Steve Albers' ("intended for personal
non-commercial use only").

## 3. Star and constellation data

`site/data/` carries three files, all derived from **d3-celestial** by Olaf Frohn.

| Item | File | Licence | Credit line | Link |
|---|---|---|---|---|
| Star catalogue (repacked) | `stars.bin` | BSD-3-Clause | Star data from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |
| Constellation lines | `constellations.lines.json` | BSD-3-Clause | Constellation lines from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |
| Constellation names | `constellation-names.json` | BSD-3-Clause | Constellation names and label positions from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |

`registry/models.yaml` (`data:`) carries the same three credits in the short form the app prints:
"Star catalogue: d3-celestial (Olaf Frohn)", "Constellation lines: d3-celestial (Olaf Frohn)" and
"Constellation names: d3-celestial (Olaf Frohn)".

Verified against upstream `master`:

- `constellations.lines.json` is **byte-identical** to `data/constellations.lines.json` — 89
  features, same MD5.
- `constellation-names.json` is a field extraction of `data/constellations.json`: the same 89 ids,
  the same names, and the `ra`/`dec` are that file's own label-position coordinates, re-keyed.
- `stars.bin` is 80 704 bytes = **5 044 records × 4 little-endian Float32** (`ra`, `dec`, `mag`,
  `bv`). `data/stars.6.json` upstream has exactly **5 044** features. Spot-checked: record 0 decodes
  to ra 101.287°, dec −16.716°, mag −1.44, B−V 0.009 — Sirius.

**`stars.bin` is a derivative work, and BSD-3-Clause is what governs it.** Re-encoding GeoJSON into
a packed Float32 binary changes the container, not the authorship: the selection and the values are
still Frohn's. BSD-3-Clause permits that redistribution ("in binary form") on three conditions, and
this repository meets them as follows:

1. **Source form** — `constellations.lines.json` and `constellation-names.json` are shipped as text
   and retain the notice by way of this file.
2. **Binary form** — `stars.bin` reproduces the copyright notice, the conditions and the disclaimer
   "in the documentation and/or other materials provided with the distribution". That is
   [§6](#6-full-licence-notices) of this file. **Deleting §6 would put the repository out of
   compliance**; nothing else in the tree carries the notice.
3. **No endorsement** — neither Olaf Frohn's name nor d3-celestial's is used to promote Space Radar.
   The mentions here are attribution, which clause 3 does not restrict.

**Upstream of upstream.** d3-celestial's own readme names the catalogues its data was built from.
Passing those along:

- Stars: *XHIP: An Extended Hipparcos Compilation*, Anderson E., Francis C. (2012), VizieR V/137D.
  Record ids are Hipparcos numbers.
- Constellation figures and label positions: the [IAU constellations
  page](https://www.iau.org/public/themes/constellations/), with line modifications and name
  positions by Olaf Frohn.
- All data converted to GeoJSON at epoch J2000.

## 3c. Stars in three dimensions — HYG, CC BY-SA 4.0

`site/data/stars3d.bin` and `site/data/stars3d.names.json` are repacked from the **HYG Stellar
Database v4.4** by David Nash (<https://codeberg.org/astronexus/hyg>; previously
<https://github.com/astronexus/HYG-Database>), licensed **CC BY-SA 4.0**. `scripts/build-stars3d.py`
is the repack and says exactly what was kept: 119 614 rows in, 109 389 stars with a measured distance
out, positions rotated from HYG's equatorial axes to the ecliptic axes this app's `sun-inertial`
frame uses and written in light-years; 10 224 rows with no measured distance are counted and not
drawn. Names (549 proper, Bayer and Flamsteed designations, Hipparcos numbers) and spectral types
are HYG's; the colour of each point is derived from its B−V index with the same two formulas the
sky sphere uses (§3).

| Item | File | Licence | Credit line | Link |
|---|---|---|---|---|
| Star positions, magnitudes, colours (repacked) | `stars3d.bin` | CC BY-SA 4.0 | Star data from the HYG Stellar Database v4.4, © David Nash | <https://codeberg.org/astronexus/hyg> |
| Star names and spectral types (extracted) | `stars3d.names.json` | CC BY-SA 4.0 | as above | as above |

**ShareAlike.** The two files are derivative works and are themselves offered under CC BY-SA 4.0
(§6). Nothing else in the repository is affected: the licence attaches to the data files, not to the
code that reads them. HYG's own upstream: Hipparcos (ESA 1997), Yale Bright Star Catalog 5th ed.,
Gliese Catalog 3rd ed., and Gaia DR3 distances via the AT-HYG work.


## 3d. The sky from the ground — the same files, and three formulas

The sky view (`site/js/sky/groundsky.js`) ships no new source. Its stars are §3's `stars.bin` and
`skystars-1.bin`, `skystars-2.bin` and `skystars.names.json`, which `scripts/build-skystars.py`
cuts from §3c's `stars3d.bin` (HYG v4.4, CC BY-SA 4.0: the same stars, as a direction, a magnitude
and a colour each; the same licence); its nebulae and galaxies are §3g's photographs; its Milky Way, Moon, Mars, Jupiter and Saturn maps are
the textures already credited above; the positions, sizes and phases of the Sun, the Moon and the
planets, the Moon's libration and the tilt of Saturn's rings are computed by Astronomy Engine (MIT).
Refraction is Sæmundsson's formula (Sky & Telescope 72, 1986); air mass is Kasten and Young (Applied
Optics 28, 1989); a star's colour is §3's two formulas. The standard magnitudes of the two crewed
stations (ISS −1.8, Tiangong 0.0, at 1 000 km and half lit) are the "intrinsic brightness" on their
Heavens-Above pages (<https://www.heavens-above.com/SatInfo.aspx?satid=25544>, `satid=48274`), read
2026-10-05: two numbers, cited in `site/js/sky/tonightbest.js`; nothing is fetched from that site.
The skyline is generated, not a photograph of anywhere.

## 3d. Deep-sky objects — OpenNGC, CC BY-SA 4.0, and the distances Wikipedia's editors collected

`site/data/dso.json` is built by `scripts/build-dso.py` from two inputs:

| Item | Source | Licence | Credit line |
|---|---|---|---|
| Positions, types, sizes, magnitudes, Messier numbers, common names of 110 Messier objects | **OpenNGC** by Mattia Verga, `NGC.csv` + `addendum.csv` (<https://github.com/mattiaverga/OpenNGC>) | CC BY-SA 4.0 | Object data from OpenNGC, © Mattia Verga |
| Distances of the 110 Messier objects (`scripts/data/messier-distances.txt`) | the distance column of Wikipedia's *List of Messier objects*, read 2026-09-08 | facts; the page text is CC BY-SA 4.0 | Distances as compiled in Wikipedia's List of Messier objects |
| The 99 objects placed by hand (`registry/dso-hand.yaml`), from the Large Magellanic Cloud to the Antennae Galaxies | the infobox of the Wikipedia page each row names, read 2026-09-08 to 2026-09-22 | facts | as the row says |

**What OpenNGC does not have.** It carries **no distance column** (parallaxes and redshifts for a
few). A nebula in our galaxy and a galaxy fifty million light-years away cannot share an invented
shell, so the app places only the 209 objects whose distance a source wrote down; the rest of
OpenNGC's 13 372 real objects are not drawn as places, and `dso.json` says how many they are.

**ShareAlike.** `dso.json` is a derivative of OpenNGC and is offered under CC BY-SA 4.0 (§6).

**The ellipses (read 2026-10-09).** `dso.json` also carries OpenNGC's minor axis (`MinAx`) and position angle (`PosAng`) for the galaxies that have them, from the same `NGC.csv` and `addendum.csv` of the repository's `master` (last commit 2026-09-27; its README says "OpenNGC is released under CC-BY-SA-4.0 license"). A galaxy clearly longer than wide is drawn as the ellipse OpenNGC measures; the rest stay round.

## 3d-2. Measured star widths — Boyajian et al. 2012 (read 2026-10-09)

Proxima Centauri, Barnard's Star, Epsilon Eridani and 61 Cygni A carry an interferometric radius and temperature in `registry/stars-notable.yaml`, read from Table 6 of Boyajian et al. 2012, "Stellar Diameters and Temperatures. II. Main-Sequence K and M Stars", ApJ 757, 112 (<https://arxiv.org/abs/1208.2431>): radii 0.1410, 0.1869, 0.7350 and 0.6611 times the Sun's. Facts, cited per row; no text or figure is reproduced.

## 3d-3. Two suns — Sebastian et al. 2025, Kostov et al. 2016, Haghighipour and Kaltenegger 2013 (read 2026-10-09)

The masses, radii, temperatures and orbits of the pairs Kepler-16 and Kepler-1647 in `registry/systems-binaries.yaml` are facts read from <https://arxiv.org/abs/2505.19718> (Kepler-16: masses, orbit), <https://arxiv.org/abs/1512.00189> (Kepler-1647) and <https://arxiv.org/abs/1306.2890> (the companion's modelled temperature); each row quotes its sentence. No text or figure is reproduced.

## 3e. The Milky Way model — an illustration built from published measurements

`site/data/galaxy.bin` is generated by `scripts/build-galaxy.py` (seeded, reproducible) and is **not
data about the sky**: it is a point cloud shaped by these published numbers, and the app calls it an
illustration wherever it appears.

- **Reid, M. J. et al. 2019**, *Trigonometric Parallaxes of High-Mass Star Forming Regions: Our
  View of the Milky Way*, ApJ 885:131 (arXiv:1910.03357): R0 = 8.15 kpc, and Table 2's log-periodic
  spiral fits (kink azimuth and radius, pitch angles, width) for the 3-kpc, Norma–Outer,
  Scutum–Centaurus, Sagittarius–Carina, Local, Perseus and Outer arms. Arms are drawn brighter where
  measured and dimmer where continued past the measured azimuth range.
- Wikipedia, *Milky Way* (read 2026-09-08): stellar disc diameter 26.8 ± 1.1 kpc, thickness up to 1.35 kpc.
- Wikipedia, *Galactic Center* (read 2026-09-08): the bar's half-length (1–5 kpc) and angle (10–50°)
  are debated; the model takes 3 kpc and 30°, the middle of each range, and says so.
- The galactic frame is the IAU J2000 definition (centre RA 266.405°, Dec −28.936°; pole RA
  192.85948°, Dec 27.12825°).

The numbers are facts and carry no licence; the arrangement is this project's (MIT).

## 3b. 3D models — NASA, public domain

Sixty-three spacecraft, spacecraft-bus, antenna, rocket-stage and surface models ship in `site/models/`, all
from **NASA 3D Resources** (<https://github.com/nasa/NASA-3D-Resources>, mirrored from
<https://science.nasa.gov/3d-resources/>), 8.1 MB in total.

NASA's media usage guidelines: material created by NASA is generally **not protected by copyright**
and may be used without permission. The exceptions are the NASA insignia, logo and seal, which may
not be used to imply endorsement — **none of these models contains one**, and this project does not
use NASA branding anywhere. NASA does not endorse Space Radar.

This table is the same set of rows as `real_models:` in `registry/models.yaml`, and
`scripts/check_registry.py` refuses the tree if the two disagree in either direction — a shipped
file this file does not name, or a file named here that does not ship. It listed ten models and a
Kepler model that had been removed while nineteen shipped uncredited, which is the same defect as
the nineteen phantom rows in section 5 with the sign flipped, so the count is now checked rather
than counted by hand.

**Stations**

| file | NASA model | used for | size |
|---|---|---|---|
| `iss.glb` | International Space Station (ISS) (D) (IGOAL) | NORAD 25544 | 280 KB |

**Weather satellites**

| file | NASA model | used for | size |
|---|---|---|---|
| `poes.glb` | Polar Operational Environmental Satellite (POES) | NOAA 15, NOAA 18, NOAA 19 — the bus they share | 162 KB |

**Rocket bodies**

| file | NASA model | used for | size |
|---|---|---|---|

**Telescopes and observatories**

| file | NASA model | used for | size |
|---|---|---|---|
| `chandra.glb` | Chandra X-ray Observatory | NORAD 25867 (CXO) | 148 KB |
| `fermi.glb` | Fermi Gamma-ray Large Area Space Telescope | NORAD 33053 (FGRST (GLAST)) | 142 KB |
| `hinode.glb` | Hinode (Solar-B) | NORAD 29479 (HINODE (SOLAR-B)) | 103 KB |
| `hubble.glb` | rebuilt by us in code in release 1.3.0 (see [3b-16](#3b-16-nasa-science-craft-built-from-dimensions--iris-timed-tracers-sert-2-isis-1-2026-10-20)); NASA's Hubble Space Telescope (A) used for proportions only | NORAD 20580 | 408 KB | <!-- 0077 W3-a -->
| `kepler.glb` | Kepler (A) | Horizons -227 (Kepler) | 96 KB |
| `roman.glb` | Nancy Grace Roman Space Telescope (B) | Horizons -211 (Nancy Grace Roman Space Telescope) | 162 KB |
| `spitzer.glb` | Spitzer Space Telescope | Horizons -79 (Spitzer) | 166 KB |
| `sdo.glb` | Solar Dynamics Observatory | NORAD 36395 (SDO) | 113 KB |
| `soho.glb` | Solar and Heliospheric Observatory | Horizons -21 | 29 KB |
| `swift.glb` | Swift | NORAD 28485 (SWIFT) | 147 KB |
| `tess.glb` | Transiting Exoplanet Survey Satellite (TESS) (A) | NORAD 43435 (TESS) | 162 KB |
| `jwst.glb` | James Webb Space Telescope (A), re-baked with its mirror and sunshield in true materials (release 1.3.0, W3-a) | Horizons -170 (James Webb Space Telescope) | 476 KB | <!-- 0077 W3-a -->

**Satellites**

| file | NASA model | used for | size |
|---|---|---|---|
| `aqua.glb` | Aqua (B) | NORAD 27424 (AQUA) | 76 KB |
| `aura.glb` | Aura (A) | NORAD 28376 (AURA) | 22 KB |
| `bus-ssl1300.glb` | Space Systems Loral (SSL-1300) | DEFAULT for the geostationary ring -- several hundred unnamed commercial satellites | 82 KB |
| `calipso.glb` | Cloud-Aerosol Lidar and Infrared Pathfinder Satellite (CALIPSO) | catalogue name CALIPSO | 267 KB |
| `cloudsat.glb` | CloudSat (A) | catalogue name CLOUDSAT | 206 KB |
| `dscovr.glb` | Deep Space Climate Observatory (DSCOVR) (Triana) | catalogue names containing DSCOVR | 96 KB |
| `goes.glb` | Geostationary Operational Environmental Satellites | catalogue names containing GOES | 124 KB |
| `grace.glb` | Gravity Recovery and Climate Experiment (GRACE) (B) | NORAD 43476 and 43477 (GRACE-FO 1 and 2), drawn as their sister ship | 17 KB |
| `icesat2.glb` | Ice, Clouds, and Land Elevation Satellite-2 (ICESat-2) (A) | NORAD 43613 (ICESAT-2) | 290 KB |
| `jason.glb` | Ocean Surface Topography Mission (OSTM Jason-2) | NORAD 33105 (JASON-2 (OSTM)), the craft itself; until 2026-10-15 also Jason-3 as its sister ship, which now wears JPL's own model ([3b-13](#3b-13-five-agencies-own-models--europa-clipper-smap-jason-3-curiosity-sorce-2026-10-15)) | 123 KB |
| `landsat.glb` | Landsat 7 | NORAD 25682 (Landsat 7) | 69 KB |
| `landsat8.glb` | Landsat 8 | NORAD 39084, 49260 (Landsat 8, 9) | 177 KB |
| `mms.glb` | Magnetospheric Multiscale (MMS) (B) | NORAD 40482-40485 (MMS 1 to MMS 4) | 177 KB |
| `themis.glb` | Time History of Events and Macroscale Interactions During Substorms (THEMIS); its booms drawn shorter ([3b-15](#3b-15-release-130-crewed-craft-and-nasa-flagships--tiangong-shenzhou-orbital-module-themis-new-horizons-2026-10-20)) | NORAD 30580, 30797, 30798 (THEMIS A, D, E) | 105 KB |  <!-- 0077 W1-a -->
| `sentinel6.glb` | Jason Continuity of Service (Sentinel-6) | NORAD 46984 (SENTINEL-6A); and 66514 (SENTINEL-6B), its twin of the same design | 102 KB |
| `oco2.glb` | Orbiting Carbon Observatory (OCO) 2 | catalogue name OCO 2 | 189 KB |
| `suomi.glb` | Suomi National Polar-orbiting Partnership (Suomi NPP) | NORAD 37849 (SUOMI NPP) | 27 KB |
| `tdrs.glb` | Tracking and Data Relay Satellites (TDRS) (A) | catalogue names containing TDRS | 11 KB |
| `cygnss.glb` | Cyclone Global Navigation Satellite System (CYGNSS) | NORAD 41884-41891, the seven CYGNSS microsatellites still in the catalogue | 34 KB |
| `gpm.glb` | Global Precipitation Measurement | NORAD 39574 (GPM-CORE) | 162 KB |
| `icon.glb` | Ionospheric Connection Explorer (ICON) | NORAD 44628 (ICON) | 207 KB |
| `seastar.glb` | SeaStar | NORAD 24883 (ORBVIEW 2 (SEASTAR)) | 12 KB |
| `radarsat1.glb` | Radar Satellite-1 (RADARSAT-1), by NASA/Christopher R. Meaney | NORAD 23710 (RADARSAT-1); in no layer the app loads today | 57 KB |
| `terra.glb` | Terra | NORAD 25994 (TERRA) | 20 KB |
| `tselina2.glb` | Tselina-2 | the eighteen Tselina-2 ELINT satellites in the catalogue, by NORAD id | 113 KB |

**Probes**

| file | NASA model | used for | size |
|---|---|---|---|
| `cassini.glb` | Cassini-Huygens (A) | Horizons -82 (Cassini, 1997 to 2017) | 171 KB |
| `dawn.glb` | Dawn | Horizons -203 (Dawn, 2007 to 2018) | 116 KB |
| `maven.glb` | Mars Atmosphere and Volatile EvolutioN (MAVEN) (B) | Horizons -202 (MAVEN, on its last tracked orbit of Mars; no contact since 6 December 2025) | 179 KB |
| `odyssey.glb` | Mars Odyssey | Horizons -53 (Mars Odyssey) | 95 KB |
| `saturn-v.glb` | Saturn V (NASA/Michael D. Carbajal) | the Saturn V on Launch Complex 39A (`saturn-v-lc-39a`) | 96 KB |
| `shuttle-stack.glb` | Space Shuttle (A) (NASA/Michael D. Carbajal): the orbiter on its tank and boosters | the Space Shuttle on Launch Complex 39B (`shuttle-lc-39b`) | 130 KB |
| `rosetta.glb` | Rosetta | Horizons -226 (Rosetta, 2004 to 2016) | 125 KB |
| `new-horizons.glb` | New Horizons: NASA's printable body and RTG parts (science.nasa.gov/3d-resources/new-horizons, read 2026-10-20; the page names no author), assembled by us; the dish, its tripod and feed rebuilt from NASA's own 1/12 drawings on the same page (readme.pdf), colours ours from NASA's photographs ([3b-15](#3b-15-release-130-crewed-craft-and-nasa-flagships--tiangong-shenzhou-orbital-module-themis-new-horizons-2026-10-20)) | Horizons -98 (New Horizons) | 151 KB |  <!-- 0077 W1-a -->
| `near.glb` | NEAR Shoemaker | Horizons -93 (NEAR Shoemaker, 1996 to 2001) | 88 KB |
| `stardust.glb` | Stardust (NASA/Brian E. Kumanchik; NASA/Christian A. Lopez) | Horizons -29 (Stardust, 1999 to 2011) | 111 KB |
| `deep-impact.glb` | Deep Impact (EPOXI) (NASA/Brian E. Kumanchik; NASA/Christian A. Lopez) | Horizons -140 (Deep Impact, 2005 to 2013) | 73 KB |
| `galileo.glb` | Galileo | Horizons -77 (Galileo, 1989 to 2003) | 76 KB |
| `juno.glb` | Juno (B) | Horizons -61 | 146 KB |
| `lro.glb` | Lunar Reconnaissance Orbiter (A) | Horizons -85 | 187 KB |
| `mro.glb` | Mars Reconnaissance Orbiter (MRO) (C) | Horizons -74 | 121 KB |
| `osiris-rex.glb` | Origins, Spectral Interpretation, Resource Identification, and Security - Regolith Explorer (OSIRIS-REx) | Horizons -64 (OSIRIS-APEX, the same spacecraft on its second mission) | 171 KB |
| `parker.glb` | Parker Solar Probe | Horizons -96 | 180 KB |
| `pioneer.glb` | Pioneer 10 | Horizons -23 and -24 (Pioneer 10, and Pioneer 11, its sister craft) | 89 KB |
| `stereo.glb` | Solar TErrestrial RElations Observatory (STEREO) | Horizons -234 (STEREO-A) | 138 KB |
| `voyager.glb` | Voyager Probe (A) | Horizons -31, -32 | 143 KB |

**Small bodies**

| file | NASA model | used for | size |
|---|---|---|---|
| `asteroid-bennu.glb` | 1999 RQ36 asteroid | Bennu, and the asteroid class | 24 KB |
| `asteroid-vesta.glb` | NOT from NASA 3D Resources since 2026-10-07: DLR's stereo height model of Vesta from Dawn's Framing Camera pictures (`Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd`, hosted by USGS Astrogeology, <https://planetarymaps.usgs.gov/mosaic/Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd.lbl>), credit NASA/JPL-Caltech/UCLA/MPS/DLR/IDA; thinned to 3 072 triangles and given texture coordinates by `scripts/shape-to-glb.py`, so that it can wear DLR's mosaic on the same grid of longitudes. Licence as the mosaic's (section 2): NASA's media guidelines; the height model was made at DLR | 4 Vesta | 50 KB |
| `asteroid-eros.glb` | Gaskell Eros Shape Model V1.1 (NASA PDS, not NASA 3D Resources): Gaskell, R. (2021), doi:10.26033/d0gq-9427. CC0 under NASA's science data policy | 433 Eros | 22 KB |
| `dwarf-ceres.glb` | Ceres SPC Shape Model Dataset V1.0 (NASA PDS, not NASA 3D Resources): Park, R.S. and Buccino, D.R. (2018), DAWN-A-FC2-5-CERESSHAPESPC-V1.0. CC0 under NASA's science data policy. Since 2026-10-07 with texture coordinates (longitude and latitude of each vertex), for the map in section 2 | 1 Ceres | 50 KB |
<!-- 0077 W3-d: begin -->
| `asteroid-ryugu.glb` | Hayabusa2's SPC shape model of Ryugu, `ryugu_shape_spc_49k_v20200323` (JAXA's PDS4 archive DARTS, Hayabusa2 SPICE bundle, doi:10.17597/isas.darts/hyb2-00600; Watanabe et al. 2019, Science 364, 268). ISAS Data Policy: open data "can be used free of charge, either for commercial or non-commercial purposes. They may be copied, forwarded or modified", credit "ISAS/JAXA" | 162173 Ryugu | 58 KB |
| `asteroid-itokawa.glb` | Gaskell Itokawa Shape Model V1.1 (NASA PDS Small Bodies Node): Gaskell, R. et al. (2021), doi:10.26033/3b2j-yy57, from Hayabusa's AMICA images. ISAS Data Policy (as for Ryugu), credit "ISAS/JAXA" | 25143 Itokawa | 58 KB |
| `asteroid-didymos.glb` | The DART team's shape models of Didymos (v003) and Dimorphos (v004): Daly, R.T. et al. (2023), DART Shapemodel Archive Bundle, NASA PDS Small Bodies Node, doi:10.26007/96fn-p578. CC0 under NASA's science data policy | 65803 Didymos and its moon Dimorphos | 61 KB |
<!-- 0077 W3-d: end -->

**The shapes of Phobos and Deimos** are not `.glb` files: `site/js/data/moonshapes.js` holds a radius
every 5 degrees for each, which `site/js/scene/moonshape.js` bends the moon's sphere to
(`scripts/build-moon-shapes.py`, 2026-10-05). Phobos: Gaskell, R.W. (2020), *Gaskell Phobos Shape
Model V1.0*, NASA Planetary Data System, the Q=64 vertex model, binned to the grid. Deimos: Thomas,
P.C. et al. (2021), *Small Body Optical Shape Models V1.0*, NASA Planetary Data System,
doi:10.26033/g5e0-kh52, which is already a 5 degree grid; its label does not say which way longitude
runs and it is taken as west, the convention of the paper it cites (Thomas 1993). Both are CC0 under
NASA's science data policy, as for Eros.

**Places on a surface**

| file | NASA model | used for | size |
|---|---|---|---|
| `dsn34.glb` | Deep Space Network 34-meter | the dss-25 antenna, which is 34 m and was wrongly drawn with the 70 m model | 151 KB |
| `dsn70.glb` | Deep Space Network 70-meter | DEFAULT for ground sites of class `dish` | 149 KB |
| `insight.glb` | InSight Cruise Lander | the InSight landing site at Elysium Planitia | 267 KB |
| `ingenuity.glb` | Ingenuity Mars Helicopter | the Ingenuity site at Valinor Hills | 86 KB |
| `lunar-module.glb` | Apollo Lunar Module | the Apollo 11, 12, 14, 15, 16 and 17 landing sites -- one vehicle design, six descent stages | 203 KB |
| `mer.glb` | Mars Exploration Rover - Opportunity (MER-B) | the Opportunity site, and the Spirit site as its twin | 38 KB |
| `pad.glb` | Mobile Launcher | DEFAULT for every launch pad -- 17 today, more with each Launch Library refresh | 74 KB |
| `perseverance.glb` | Mars 2020 Perseverance Rover | Jezero crater on Mars (until 2026-10-15 also Gale crater, as the kind of thing; Gale now wears NASA's own Curiosity, [3b-13](#3b-13-five-agencies-own-models--europa-clipper-smap-jason-3-curiosity-sorce-2026-10-15)) | 256 KB |
| `viking-lander.glb` | Viking Lander | the Viking 1 and Viking 2 landing sites | 163 KB |

**Credit line:** `3D model: NASA`

### What was changed

These are derivatives and say so, because a credit that implies an untouched file is a wrong
credit:

1. **Re-encoded from Draco to meshopt.** NASA ships them with
   `KHR_draco_mesh_compression`, which needs a ~300 KB WebAssembly decoder in the browser.
   Re-encoding to `EXT_meshopt_compression` needs a 29 KB one **and made the files smaller** —
   Hubble went from 1 655 KB to 163 KB. Done once with `@gltf-transform/cli`, never at runtime.
2. **Simplified**, at a 0.001 error tolerance, since these are CAD models with far more detail than
   an object a few hundred pixels across can show.
3. **Decimated**, for eleven of them, with `scripts/decimate-model.mjs`. Step 2 shrinks the *file*
   and often leaves the *triangles* alone: a CAD export carries a normal and up to four texture
   coordinate sets that differ on every hard edge, so `weld` cannot merge vertices and the
   simplifier has nothing to collapse. Until 2026-09-12 nothing measured the triangles, and
   `poes.glb` shipped 116 517 of them in 1 324 KB. Dropping the attributes this project never
   reads, welding on position, simplifying and recomputing normals took the set from 783 099
   triangles to 361 768. Each row says its own before and after, and
   `tests/test_contract.mjs` now measures every file against the `budget_tris` its row claims.
4. **Images removed** wherever step 3 ran. Dropping texture coordinates makes every texture in the
   file unsampleable, and the materials still pointed at them, so they still downloaded —
   `perseverance.glb` carried 700 KB of images that no pixel could read. 1 016 KB of them went.
5. **Retextured at runtime.** The original PBR materials are replaced with this project's toon
   material. The *geometry* is NASA's; the *look* is ours. That is the brief — cartoon objects on a
   realistic setting — and it is why a real Hubble still reads as part of the same drawn world.
   This is also what makes step 4 safe -- with one exception since 2026-09-20: a **palette
   strip**, four texels tall, which `gltf-transform palette` wrote and which holds nothing but the
   model's flat per-part colours, IS sampled, and those models are drawn in NASA's colours through
   the toon ramp rather than in one class colour. A strip that short cannot carry surface detail,
   so it is not the photoreal shading rule 5 rules out.
6. **Textures baked to flat colours**, for thirteen files, with `scripts/flatten-textures.mjs`.
   Ten carried their colours only as photographs -- 1024 and 2048 px pictures of foil and solar
   cells that every visitor downloaded and no pixel sampled. `tools/texture-colours.html` samples
   the texel under each triangle, weighted by area, which is what each material actually shows;
   that becomes the material's base colour and the images go. One sample was refused: GRACE's
   `underside.001` is a magenta UV-checker placeholder in NASA's file, and it is drawn in neutral
   silver instead. The other three had images no material referenced. The thirteen went from
   2 480 KB to 1 211 KB, and `tests/test_model_colour.mjs` fails if a shipped model carries an
   image that is not a palette strip.

7. **Rebuilt in their own colours**, for twenty-four files, with `scripts/bake-own-colours.mjs`
   (2026-10-05). Steps 3 to 6 threw the colour away whenever it lived in a texture, and the app
   then painted the whole spacecraft in one colour for its class: the Apollo lunar module was
   salmon and Voyager lavender. This pass starts again from NASA's file: it welds and decimates
   the geometry, then gives every surviving triangle the **flat** colour NASA's own material shows
   at that place (its stated base colour, times its texture averaged over a 48 px raster), and
   keeps at most fourteen colours per model. Two things are changed on purpose and are ours, not
   NASA's: the brightness of each colour is held between 12 % and 93 %, so a stated pure black
   does not draw as a hole in the sky and a pure white does not glare; and parts smaller than
   0.4 % of the model are dropped. The photographs, normal maps and metalness are still not
   shipped, and the toon shading of step 5 is unchanged — the colours are NASA's, the light is
   ours. Three of the twenty-four (`gpm.glb`, `icon.glb`, `tselina2.glb`) had a palette strip and
   no texture coordinates to read it with, so each was drawn in the strip's first colour; they are
   rebuilt the same way. `mms.glb` was not rebuilt then: NASA's (A) file states no colours at all.

8. **Twelve more, the same way** (2026-10-07): `iss.glb` from NASA's IGOAL model of the whole
   station, `hubble.glb`, `lunar-module.glb`, `galileo.glb` and `mms.glb` rebuilt, and `spitzer.glb`,
   `kepler.glb`, `roman.glb`, `dawn.glb`, `maven.glb`, `odyssey.glb` and `ingenuity.glb` new. Five
   of them depart from NASA's file on purpose, and each departure is ours, not NASA's:
   - `iss.glb` leaves out the nodes the file names details, handrails and payload sites (bolts,
     cables, grab bars), all but the radiators: 592 thousand of its 2.7 million triangles go into
     the bake.
   - `hubble.glb` is 1.5 times brighter than the average of NASA's textures, which are photographs
     of crinkled foil and average to dark grey.
   - `galileo.glb`: the material the file names `bus:black` is stated blue-violet in the file and
     is drawn charcoal.
   - `dawn.glb`: the cell face of the solar wings is an untextured light grey in the file and is
     drawn the dark blue of the cells in NASA's photographs.
   - `mms.glb` is NASA's (B) file, which has colours, with the outer lengths of its booms cut
     off so that the body can be seen.
   `maven.glb` was drawn nowhere until 2026-10-08. Since then it is drawn on MAVEN's last tracked
   orbit of Mars (JPL Horizons, 4 December 2025); its card says NASA has not heard from it since
   6 December 2025 and that where it is on that orbit is not known.

They are loaded **on demand**, one file per object, only when the camera is near it. Nobody downloads all 63; the largest single download is `icesat2.glb` at 290 KB.

## 3b-2. A model made from photographs — Cygnus (2026-10-12)

One model in `site/models/` is nobody's published mesh. No free model of Northrop Grumman's Cygnus
cargo ship exists, so `cygnus.glb` (141 KB, 12 000 triangles) was **generated from a NASA photograph
by an image-to-3D model and then cleaned, re-proportioned and coloured by this project**. The card
of a Cygnus says so: "shape built from photographs; proportions approximate".

| What | Whose | Licence | Where |
|---|---|---|---|
| The photograph the shape was generated from: "ISS-61 Cygnus NG-12 approaching the ISS (4)" | NASA | public domain | <https://commons.wikimedia.org/wiki/File:ISS-61_Cygnus_NG-12_approaching_the_ISS_(4).jpg> (read 2026-10-12) |
| Two photographs it was compared with, and corrected against: "ISS-47 Cygnus OA-6 approaching the ISS (1)", "ISS-55 Cygnus OA-9E approaching the ISS (6) (cropped)" | NASA | public domain | <https://commons.wikimedia.org/wiki/File:ISS-47_Cygnus_OA-6_approaching_the_ISS_(1).jpg>, <https://commons.wikimedia.org/wiki/File:ISS-55_Cygnus_OA-9E_approaching_the_ISS_(6)_(cropped).jpg> (read 2026-10-12) |
| The generator: TRELLIS, image-large weights | Microsoft Research | MIT (code and weights, each read on its own page 2026-10-12) | <https://github.com/microsoft/TRELLIS>, <https://huggingface.co/microsoft/TRELLIS-image-large> |
| The cleaning, the proportions, the colours | this project | this repository's licence | `registry/models.yaml`, row `cygnus`, `modified:` |

**Credit line:** `3D model: generated from a NASA photograph with TRELLIS (Microsoft Research, MIT), cleaned and coloured by Space Radar`

What that row's `modified:` says, in short, because a generated shape that reads as a photograph of
the truth would be a wrong credit: the generator drew the two solar arrays 74 degrees apart and one
of them cut off, so one was kept and **the other is its mirror image**; the hull was scaled to the
cited 6.39 m by 3.07 m, which changed its proportions by 31 %; the arrays were made round and 3.7 m
across; the colours are ours and the generator's texture is not used. The photographs are of an
Enhanced Cygnus; the longer Cygnus XL flying since 2025 wears the same shape as the kind of thing.
NASA's photographs carry no NASA insignia into the model, NASA and Northrop Grumman do not endorse
Space Radar, and "Cygnus" and "UltraFlex" are Northrop Grumman's names for their own products.
TRELLIS's MIT licence covers its software; it makes no claim on what the model outputs, and its
notice is not reproduced here because none of its software ships.

## 3b-3. Four models made here — XRISM, NOAA-21, Seasat, NuSTAR (2026-10-13)

Four more files in `site/models/` are nobody's published mesh. No model of these four craft was
found under terms that allow it to be redistributed (NASA's 3D Resources index and NASA Science's
3D pages were searched on 2026-10-13), so each was made here, and each card says how.

**Three were generated from an artist's render, and then repaired** (two still are: NOAA-21's
generated body was replaced the same day by a build from dimensions, section 3b-4). Nobody photographed Seasat,
XRISM or NOAA-21 in orbit; the clean picture of each is an agency's own render, and the card says
"shape built from an artist’s render; proportions approximate". The image-to-3D model drew the
bodies; it draws a solar wing as a dented slab and an antenna as a noodle, so **every wing, boom,
stick antenna and dish in these three files was cut out of the generated mesh and built again in
code**, flat and straight, at the cited size where one is cited. Each row's `modified:` in
`registry/models.yaml` lists what was cut, what was built, what is a mirror image, and what was
not fixed.

| File | What | Whose | Licence | Where |
|---|---|---|---|---|
| `xrism.glb` (141 KB, 13 731 triangles) | Generated from two frames of one turntable render, "XRISM 001" and "XRISM 004"; compared with "XRISM 002" | NASA's Goddard Space Flight Center Conceptual Image Lab | public domain | <https://commons.wikimedia.org/wiki/File:XRISM_001.png>, <https://commons.wikimedia.org/wiki/File:XRISM_004.png>, <https://commons.wikimedia.org/wiki/File:XRISM_002.png> (read 2026-10-13; from <https://svs.gsfc.nasa.gov/20374/>) |
| `seasat.glb` (66 KB, 8 468 triangles) | The trunk generated from the artist's concept "Seasat"; compared with "Seasat in orbit" | NASA/JPL | public domain | <https://commons.wikimedia.org/wiki/File:Seasat.jpg>, <https://commons.wikimedia.org/wiki/File:Seasat_in_orbit.jpg> (read 2026-10-13) |
| both | The generator: TRELLIS, image-large weights | Microsoft Research | MIT (code and weights, each read on its own page 2026-10-12) | <https://github.com/microsoft/TRELLIS>, <https://huggingface.co/microsoft/TRELLIS-image-large> |
| both | The cuts, the parts built in code, the proportions, the colours | this project | this repository's licence | `registry/models.yaml`, rows `xrism`, `seasat`, `modified:` |

**Credit lines:**
`3D model: generated from NASA Goddard renders of XRISM with TRELLIS (Microsoft Research, MIT), repaired and coloured by Space Radar`;
`3D model: generated from a NASA/JPL artist's concept of Seasat with TRELLIS (Microsoft Research, MIT), repaired and coloured by Space Radar`

**One was built from dimensions, with no generator.** NuSTAR is two small boxes ten metres apart
on a lattice mast, which no image-to-3D model can draw, and which a few cited metres describe
almost completely. `nustar.glb` (43 KB, 5 668 triangles) was written in code from them, with two
NASA/JPL-Caltech artist's concepts looked at for everything the metres do not say; its card says
"shape built from published dimensions and pictures; details simplified".

| What | Whose | Licence | Where |
|---|---|---|---|
| The two artist's concepts it was drawn from: "NuSTAR spacecraft model", "NuStar 2" (PIA15265) | NASA/JPL-Caltech | public domain | <https://commons.wikimedia.org/wiki/File:NuSTAR_spacecraft_model.png>, <https://commons.wikimedia.org/wiki/File:NuStar_2.jpg> (read 2026-10-13) |
| The shape | this project | this repository's licence | `registry/models.yaml`, row `nustar` |

**Credit line:** `3D model: built by Space Radar from published dimensions and NASA/JPL-Caltech artist's concepts of NuSTAR`

The renders carry no agency insignia into the models; NASA, NOAA, JPL, JAXA and the craft's
builders do not endorse Space Radar. TRELLIS's MIT licence covers its software and makes no claim
on what the model outputs; its notice is not reproduced here because none of its software ships.

## 3b-4. Five more made here — LAGEOS, Ajisai, Soyuz MS, NOAA-21 rebuilt, Hitomi (2026-10-13)

The second batch. No published mesh of any of these was found under terms that allow it to be
redistributed, so each was made here, and each card says how.

**Four were built from dimensions, with no generator**: written in code from cited metres, with
pictures looked at for what the metres do not say. Their cards say "shape built from published
dimensions and pictures; details simplified", and each row's `modified:` in `registry/models.yaml`
lists what is drawn differently from the craft.

| File | What | Pictures it was drawn from or compared with | Licence of the pictures |
|---|---|---|---|
| `lageos.glb` (50 KB) | LAGEOS 1 and 2: a 60 cm ball and 426 retroreflector faces, each ring at its published colatitude with its published count | "LAGEOS-NASA", "Sts052-80-030 lrg" (NASA photographs): <https://commons.wikimedia.org/wiki/File:LAGEOS-NASA.jpg>, <https://commons.wikimedia.org/wiki/File:Sts052-80-030_lrg.jpg> (read 2026-10-13) | public domain |
| `ajisai.glb` (92 KB) | Ajisai: a 2.15 m ball with 318 flat mirrors and 120 reflector panels of 1 436 cubes. **The counts are published; the placement is ours**, because nobody has published it | none ships and none was traced. JAXA's photograph on the ILRS mission page was looked at: <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/ajis_general.html> (read 2026-10-13) | **not free** ("Courtesy of JAXA"): looked at only |
| `soyuz-ms.glb` (59 KB) | The Soyuz: a hull turned on a lathe from its published lengths and diameters, wings, antennas | "Soyuz MS-19 Spacecraft departs the ISS (iss067e000259)" (a NASA photograph), "Soyuz-TM drawing" (NASA RP-1357), "Drawing-Soyuz-TMA-exp12" (NASA): <https://commons.wikimedia.org/wiki/File:Soyuz_MS-19_Spacecraft_departs_the_ISS_(iss067e000259).jpg>, <https://commons.wikimedia.org/wiki/File:Soyuz-TM_drawing.svg>, <https://commons.wikimedia.org/wiki/File:Drawing-Soyuz-TMA-exp12.png> (read 2026-10-13) | public domain |
| `noaa21.glb` (51 KB) | NOAA-21, **rebuilt**: a box bus with VIIRS, CrIS, ATMS and OMPS as boxes of their cited sizes where NOAA's drawing puts them. It replaces the body generated from NOAA's render earlier the same day | "JPSS-2 Blueprints", "NOAA-21 schematic diagram" (NOAA NESDIS), "Artist's rendering of NOAA-21" (NOAA): <https://www.nesdis.noaa.gov/s3/2022-09/JPSS-2_Blueprints.png>, <https://www.nesdis.noaa.gov/s3/2023-12/noaa-21-schematic-diagram.png>, <https://commons.wikimedia.org/wiki/File:Artist%27s_rendering_of_NOAA-21.png> (read 2026-10-13) | public domain (works of the United States government) |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `lageos`, `ajisai`, `soyuz-ms`, `noaa21` |

**Credit lines:**
`3D model: built by Space Radar from the published arrangement of LAGEOS's 426 retroreflectors and NASA photographs`;
`3D model: built by Space Radar from the published counts of Ajisai's mirrors and retroreflectors`;
`3D model: built by Space Radar from published dimensions, a NASA photograph and NASA drawings of the Soyuz`;
`3D model: built by Space Radar from published dimensions and NOAA's drawings and render of NOAA-21`

**One wears another craft's generated body.** Hitomi (ASTRO-H) flew on the bus XRISM was later
built on. `hitomi.glb` (138 KB) is the body TRELLIS generated from NASA Goddard's render **of
XRISM** (section 3b-3), with what only Hitomi had built in code from cited metres: the 6.4 m
extensible optical bench, the plate at its end with the two hard X-ray imagers, the two soft
gamma-ray detectors. Hitomi broke apart in March 2016; the file is the craft as launched, and its
card says that what is tracked today is the main body.

| What | Whose | Licence | Where |
|---|---|---|---|
| The renders of XRISM the body was generated from: "XRISM 001", "XRISM 004" | NASA's Goddard Space Flight Center Conceptual Image Lab | public domain | <https://commons.wikimedia.org/wiki/File:XRISM_001.png>, <https://commons.wikimedia.org/wiki/File:XRISM_004.png> (read 2026-10-13) |
| The drawing and the labelled schematic of Hitomi its own parts were drawn from: "Hitomi", "Astro-H schema (en)" | NASA; NASA/HEASARC | public domain | <https://commons.wikimedia.org/wiki/File:Hitomi.png>, <https://commons.wikimedia.org/wiki/File:Astro-H_schema_(en).png> (read 2026-10-13) |
| The generator: TRELLIS, image-large weights | Microsoft Research | MIT (code and weights) | <https://github.com/microsoft/TRELLIS>, <https://huggingface.co/microsoft/TRELLIS-image-large> |
| The repairs, the parts built in code, the colours | this project | this repository's licence | `registry/models.yaml`, row `hitomi`, `modified:` |

**Credit line:** `3D model: body generated from NASA Goddard renders of XRISM with TRELLIS (Microsoft Research, MIT); Hitomi's optical bench and detectors built by Space Radar from published dimensions and NASA drawings`

No agency insignia, flag or maker's mark is on any of the five; NASA, NOAA, JAXA, Roscosmos and
the craft's builders do not endorse Space Radar. "Soyuz" names the spacecraft and nothing here is
offered as its maker's.

## 3b-5. Ten more built from dimensions — Progress MS, Crew and Cargo Dragon, Shenzhou, Tianzhou, and five laser-ranging balls (2026-10-13)

The third batch. Every one was written in code from cited metres, with no generator and no
published mesh; the cards say "shape built from published dimensions and pictures; details
simplified", and each row's `dimensions:` in `registry/models.yaml` quotes the sentence each
number came from, with what is NOT cited named beside it.

**Five visiting vehicles**, each hull one profile turned on a lathe. Each card still says "the
kind of thing, not this exact one": a name in the catalogue matches every ship of its family.

| File | What | Pictures it was drawn from or compared with | Licence of the pictures |
|---|---|---|---|
| `progress-ms.glb` (64 KB) | The Progress cargo craft: the Soyuz's hull with a cargo module for its ball and the refuelling module for its bell; no periscope, no window | "The Progress 94 cargo spacecraft from Roscosmos (iss074e0395778)", "Progress MS-17 approaches the ISS (1)" (NASA photographs), "Progress drawing" (a NASA drawing): <https://commons.wikimedia.org/wiki/File:The_Progress_94_cargo_spacecraft_from_Roscosmos_(iss074e0395778).jpg>, <https://commons.wikimedia.org/wiki/File:Progress_MS-17_approaches_the_ISS_(1).jpg>, <https://commons.wikimedia.org/wiki/File:Progress_drawing.svg> (read 2026-10-13) | public domain |
| `dragon-crew.glb` (53 KB) | The Crew Dragon: a lathed capsule with its nose cone open, four engine pods, the trunk with cells on one half, four fins | "Iss058e027464 The uncrewed SpaceX Crew Dragon spacecraft on approach to the station's Harmony module", "The SpaceX Crew Dragon Endeavour departs the International Space Station 04", "The SpaceX Crew Dragon as it approached the International Space Station (iss063e021563)" (NASA photographs): <https://commons.wikimedia.org/wiki/File:Iss058e027464_The_uncrewed_SpaceX_Crew_Dragon_spacecraft_on_approach_to_the_station%27s_Harmony_module.jpg>, <https://commons.wikimedia.org/wiki/File:The_SpaceX_Crew_Dragon_Endeavour_departs_the_International_Space_Station_04.jpg>, <https://commons.wikimedia.org/wiki/File:The_SpaceX_Crew_Dragon_as_it_approached_the_International_Space_Station_(iss063e021563).jpg> (read 2026-10-13) | public domain |
| `dragon-cargo.glb` (46 KB) | The Cargo Dragon: the same capsule with a smooth hull, no windows, and two fins | "A SpaceX Dragon cargo spacecraft departs from the International Space Station (iss074e0723944)", "A SpaceX Dragon cargo spacecraft approaches the International Space Station (iss074e0590552)" (NASA photographs): <https://commons.wikimedia.org/wiki/File:A_SpaceX_Dragon_cargo_spacecraft_departs_from_the_International_Space_Station_(iss074e0723944).jpg>, <https://commons.wikimedia.org/wiki/File:A_SpaceX_Dragon_cargo_spacecraft_approaches_the_International_Space_Station_(iss074e0590552).jpg> (read 2026-10-13) | public domain |
| `shenzhou.glb` (66 KB) | Shenzhou, the generation that flies now: three modules and ONE pair of wings, on the service module | none ships and none was traced. One drawing was looked at for which part is where: "Shenzhou spacecraft vector diagram" (Ilya 'Yadra' Kharlamov, uploader): <https://commons.wikimedia.org/wiki/File:Shenzhou_spacecraft_vector_diagram.svg> (read 2026-10-13) | **CC BY-SA 4.0: looked at only.** CMSA's own pictures are not free |
| `tianzhou.glb` (47 KB) | Tianzhou: a 3.35 m cargo drum, a cone, a 2.8 m propulsion module with two wings of three panels | none ships and none was traced. One render was looked at for the layout and the colours: "Tianzhou Rendering" (Shujianyang): <https://commons.wikimedia.org/wiki/File:Tianzhou_Rendering.png> (read 2026-10-13) | **CC BY-SA 4.0: looked at only.** CMSA's own pictures are not free |

**Five laser-ranging balls**, each from what the International Laser Ranging Service's mission
page (NASA-hosted) says of it. No picture of any of them is free; each page's photograph was
looked at there and nothing of it ships.

| File | What | The page read | Its photograph |
|---|---|---|---|
| `starlette.glb` (47 KB) | Starlette and Stella: 24 cm, 60 retroreflectors, three on each of twenty triangular plates | <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/star_general.html> (read 2026-10-13) | **not free** ("Courtesy of CNES"): looked at only |
| `lares.glb` (32 KB) | LARES: 36.4 cm, 92 retroreflectors in the rows of the mission's own table | <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/lars_general.html>, <https://ilrs.gsfc.nasa.gov/docs/LARES_MSR_final_version_revCP.pdf> (read 2026-10-13) | **not free** ("Courtesy of ASI"): looked at only |
| `lares2.glb` (37 KB) | LARES-2: 42.4 cm, 303 retroreflectors. **The count is published; the placement is ours** | <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/lrs2_general.html> (read 2026-10-13) | no credit line: looked at only |
| `etalon.glb` (100 KB) | Etalon 1 and 2: 1.294 m, 2 146 retroreflectors in 306 arrays. **The counts are published; the placement is ours** | <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/eta1_general.html> (read 2026-10-13) | no credit line: looked at only |
| `westpac.glb` (40 KB) | WESTPAC: a ball under sixty baffle tubes, 245 mm over them | <https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/west_general.html>, <https://ilrs.gsfc.nasa.gov/docs/Westpac_final.pdf> (read 2026-10-13) | **not free** ("Courtesy of EOS"): looked at only |
| all ten | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `progress-ms`, `dragon-crew`, `dragon-cargo`, `shenzhou`, `tianzhou`, `starlette`, `lares`, `lares2`, `etalon`, `westpac` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions, NASA photographs and a NASA drawing of the Progress`;
`3D model: built by Space Radar from published dimensions and NASA photographs of the Crew Dragon`;
`3D model: built by Space Radar from published dimensions and NASA photographs of the Cargo Dragon`;
`3D model: built by Space Radar from the published dimensions of the Shenzhou spacecraft`;
`3D model: built by Space Radar from the published dimensions of the Tianzhou cargo ship`;
`3D model: built by Space Radar from the published description of Starlette and Stella's 60 retroreflectors`;
`3D model: built by Space Radar from the published arrangement of LARES's 92 retroreflectors`;
`3D model: built by Space Radar from the published count and size of LARES-2's 303 retroreflectors`;
`3D model: built by Space Radar from the published counts of Etalon's 2 146 retroreflectors`;
`3D model: built by Space Radar from the published description of WESTPAC's 60 baffled retroreflectors`

**No logo, lettering, flag or insignia is on any of the ten.** "Dragon", "Crew Dragon" and
"SpaceX" are marks of Space Exploration Technologies Corp.; the photographs the two Dragons were
compared with show the maker's wordmark, NASA's insignia and a flag on the hull, and none of the
three is drawn. "Progress", "Shenzhou" and "Tianzhou" name the spacecraft. Nothing here is
offered as any maker's or agency's, and none of them endorses Space Radar.

The same day `soyuz-ms.glb` and `noaa21.glb` (section 3b-4) were baked again: the tool had kept one
part of each pair that shared a name, so the Soyuz had one of its two radiator bands and NOAA-21
one of its two side radiators. Nothing else about them changed.


## 3b-6. Four NASA craft — SWOT from JPL's own model; NISAR, IXPE and PACE built from dimensions (2026-10-13)

The fourth batch. For each craft an agency's own published model was looked for first (NASA's 3D
Resources on GitHub and on science.nasa.gov, and JPL's mission sites). One exists.

**SWOT is JPL's model.** `swot.glb` (112 KB, 14 807 triangles) is the "SWOT 3D Model" JPL
published on the mission's own site on 14 January 2020
(<https://swot.jpl.nasa.gov/resources/86/swot-3d-model/>, the glTF file, read 2026-10-13). The
page names no author and no contractor and states no terms of its own; its footer's policy is
JPL's (<https://www.jpl.nasa.gov/jpl-image-use-policy/>): "Unless otherwise noted, images and
video on JPL public web sites (public sites ending with a jpl.nasa.gov address) may be used for
any purpose without prior permission, subject to the special cases noted below." That sentence
names images and video; NASA's media usage guidelines
(<https://www.nasa.gov/nasa-brand-center/images-and-media/>) name models: "NASA content – images,
audio, video, and media files used in the rendition of 3-dimensional models, such as texture maps
and polygon data in any format – generally are not subject to copyright in the United States."
What we changed: a helper cube left out, the whole model turned to the app's axes and scaled as
one piece, flat colours baked from JPL's own materials, the cells' face given a blue of ours
(`registry/models.yaml`, row `swot`, has every step). The model shows the spacecraft as designed
in 2020; its proportions are JPL's and were not corrected to the craft as flown.

**Credit line:** `3D model: NASA/JPL-Caltech`

**NISAR, IXPE and PACE have no published model** and were written in code from cited metres, as
sections 3b-3 to 3b-5 describe; their cards say "shape built from published dimensions and
pictures; details simplified", and each row's `dimensions:` quotes the sentence each number came
from, with what is NOT cited named beside it.

| File | What | Pictures it was drawn from or compared with | Licence of the pictures |
|---|---|---|---|
| `nisar.glb` (76 KB) | NISAR: a 12 m mesh reflector drawn as a rim truss and a see-through net, never a filled disc, on a 9 m boom; bus, octagonal radar structure, two wings of three panels | "NISAR Spacecraft diagram", "NISAR Side NoTilt 2022", "NISAR in Orbit (Artist's Concept)" PIA26613 (NASA/JPL-Caltech): <https://commons.wikimedia.org/wiki/File:NISAR_Spacecraft_diagram.png>, <https://commons.wikimedia.org/wiki/File:NISAR_Side_NoTilt_2022.png>, <https://commons.wikimedia.org/wiki/File:NISAR_in_Orbit_(Artist%E2%80%99s_Concept)_(PIA26613).jpg> (read 2026-10-13) | public domain |
| `ixpe.glb` (50 KB) | IXPE: a hexagonal bus, three detector units, a 4 m lattice boom, the tip/tilt/rotate mechanism, three mirror modules with their shields, the fixed array of six strips | "IXPE spacecraft model", "IXPE artist rendition" (NASA): <https://commons.wikimedia.org/wiki/File:IXPE_spacecraft_model.png>, <https://commons.wikimedia.org/wiki/File:IXPE-artist-rendition.jpg> (read 2026-10-13) | public domain |
| `pace.glb` (42 KB) | PACE: a 1.5 x 1.5 x 3.2 m observatory, the Ocean Color Instrument with its Earth shield, the Ka-band dish, two polarimeters, one wing of three panels | NASA's labelled render of the Ocean Color Instrument, "Beauty Shot of the PACE Spacecraft", "PACE Observatory Diagram (Stowed Solar Panel)" (NASA): <https://pace.oceansciences.org/mission.htm>, <https://pace.oceansciences.org/gallery_more.cgi?id=1739>, <https://pace.oceansciences.org/gallery_more.htm?id=1554> (read 2026-10-13) | public domain |
| all three | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `nisar`, `ixpe`, `pace` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and NASA/JPL-Caltech drawings and artist's concepts of NISAR`;
`3D model: built by Space Radar from published dimensions and NASA illustrations of IXPE`;
`3D model: built by Space Radar from published dimensions and NASA renders and drawings of PACE`

No logo, lettering, flag or insignia is on any of the four. NASA, JPL, ISRO and CNES do not
endorse Space Radar.

## 3b-7. Three commercial craft built from dimensions — the first Starlink generation, Umbra, ICEYE (2026-10-13)

The fifth batch. No agency or operator publishes a model of any of these under free terms, and no
image-to-3D model was used: each file was written in code from numbers in public filings, a
peer-reviewed paper and reference pages, each opened and quoted in its `registry/models.yaml`
row with what is NOT cited named beside it. Their cards say "shape built from published dimensions
and pictures; details simplified". A fourth file, of the Starlink V2 Mini, was built and
not shipped: in the app it was no better than the procedural shape.

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `starlink-v1.glb` (30 KB) | The first Starlink generation (v1.0, v1.5): a 2.8 x 1.3 m flat bus with ONE solar wing 2.8 x 8.1 m standing square to it | The sizes: SpaceX's FCC filing of October 2022 as tabulated by J. McDowell (<https://planet4589.org/astro/starsim/index.html>) and Fankhauser, Tyson and Askari, The Astronomical Journal 166:59, 2023 (arXiv:2305.11123). The layout: SpaceX's drawing in its letter to the FCC of 1 August 2022 (<https://www.planet4589.org/astro/starsim/docs/mitigation/spx2208a.pdf>), read and not reproduced. Compared with "Starlink 01", a render by Wikideas1 of a Sketchfab model (<https://commons.wikimedia.org/wiki/File:Starlink_01.webp>) (all read 2026-10-13) | numbers are facts; the render is CC BY 4.0 and is not in the file |
| `umbra.glb` (62 KB) | Umbra's radar satellite: a 58 x 58 x 19 cm bus behind a 3.8 m mesh umbrella drawn as ribs and a net, never a filled disc; the payload's column; two small solar arrays | Umbra Lab's Orbital Debris Assessment Report for Umbra SAR, a public filing with the FCC (<https://apps.fcc.gov/els/GetAtt.html?id=252268>): its numbers and its Figure 1, read and not reproduced; eoPortal (<https://www.eoportal.org/satellite-missions/umbra-sar>) (read 2026-10-13) | a public record, read; nothing of it is in the file |
| `iceye.glb` (30 KB) | ICEYE's radar satellite: a 3.2 x 0.4 m antenna of five panels, five solar panels in a row on its back, the bus behind the middle one | eoPortal (<https://www.eoportal.org/satellite-missions/iceye-constellation>, <https://www.eoportal.org/satellite-missions/iceye-x1>) and ESA (<https://earth.esa.int/eogateway/missions/iceye/description>) for the sizes. Two renders on Wikimedia Commons by Defensie Nederland, CC BY-SA 4.0 (<https://commons.wikimedia.org/wiki/File:ICEYE_SAR_satellite_Netherlands.png>, <https://commons.wikimedia.org/wiki/File:ICEYE_SAR_satellite_Netherlands_2.jpg>), were LOOKED AT for where the parts sit; nothing of them is reproduced or traced (read 2026-10-13) | numbers are facts; the share-alike pictures are not in the file |
| all three | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `starlink-v1`, `umbra`, `iceye` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions; compared with a render by Wikideas1 (Wikimedia Commons, CC BY 4.0)`;
`3D model: built by Space Radar from the dimensions and the drawing in Umbra's orbital debris report filed with the FCC`;
`3D model: built by Space Radar from published dimensions of the ICEYE satellites`

No logo and no lettering is on any of the three: the operators' names and marks are their
trademarks. Starlink is SpaceX's, Umbra is Umbra Lab's and ICEYE is ICEYE's; none of them
endorses Space Radar, and none of them made or approved these shapes.


## 3b-8. Seven more built from dimensions — GPS by block, Galileo, Michibiki, NavIC, SAOCOM (2026-10-13)

The sixth batch: the navigation satellites and one radar satellite. No agency publishes a model of
any of these under terms this project can use (the survey of 2026-10-13 looked), and no
image-to-3D model was used: each file was written in code from numbers in agencies' own pages
and reference pages, each opened and quoted in its `registry/models.yaml` row with what is NOT
cited named beside it. Their cards say "shape built from published dimensions and pictures;
details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `gps-iir.glb` (53 KB) | GPS Block IIR and IIR-M: a 2 m cube, eight helices in a circle round four on the Earth face, two lattice antennas on booms, two wings of two panels, 11.4 m tip to tip | eoPortal's table of the GPS blocks (<https://www.eoportal.org/satellite-missions/gps>); Lockheed Martin's slides on the IIR antenna panel, published by the US Coast Guard Navigation Center (<https://www.navcen.uscg.gov/sites/default/files/pdf/gps/GPS_Block_IIR_IIR_M_Antenna_Panel_Pattern_Marquis_Aug2015_revised.pdf>); the US government's painting "GPS-IIR" (<https://commons.wikimedia.org/wiki/File:GPS-IIR.jpg>) (all read 2026-10-13) | numbers are facts; the picture is in the public domain |
| `gps-iif.glb` (53 KB) | GPS Block IIF: a gold box, an eight-sided antenna plate with twelve helices in two circles, a boom with a canister, two wings of three panels, 13.11 m tip to tip | the same table; ESA's slides on the GPS antenna assembly (<https://files.igs.org/pub/resource/pubs/workshop/2012/Poland%202012%20-%20P09%20Dilssner%20PR4.pdf>); the US Air Force's painting "Navstar-2F" (<https://commons.wikimedia.org/wiki/File:Navstar-2F.jpg>) (read 2026-10-13) | numbers are facts; the picture is in the public domain |
| `gps-iii.glb` (64 KB) | GPS III: a tall dark body 3.4 m long, a pale antenna deck wider than it, a long mast, two wings of two broad panels, 15 m tip to tip | the same table; the US Air Force's render "GPS Block IIIA" (<https://commons.wikimedia.org/wiki/File:GPS_Block_IIIA.jpg>) (read 2026-10-13) | numbers are facts; the picture is in the public domain |
| `galileo-foc.glb` (42 KB) | Galileo, the Full Operational Capability craft: a black slab 2.53 x 1.2 x 1.1 m with its largest face and a 1.4 m antenna to the Earth, two arrays of 5.0 x 1.082 m, 14.67 m tip to tip | EUSPA's Galileo Satellite Metadata (<https://www.gsc-europa.eu/support-to-developers/galileo-satellite-metadata>); eoPortal (<https://www.eoportal.org/satellite-missions/galileo-foc>); ESA's page on the satellite's parts (<https://www.esa.int/Applications/Satellite_navigation/Galileo/Satellite_anatomy>), for words and numbers only. A visitor's photograph of a model, by Pouyana, CC BY-SA 3.0 (<https://commons.wikimedia.org/wiki/File:GalileoSatModel.jpg>), was LOOKED AT for where the antennas sit; nothing of it is reproduced or traced (read 2026-10-13) | numbers are facts; NO ESA PICTURE WAS USED; the share-alike picture is not in the file |
| `michibiki.glb` (57 KB) | QZSS Michibiki 2 and 4: a black body 2.4 m square, 6.2 m from nozzle to the top of the cone that covers its antenna, two wings of 8.3 m, 19 m tip to tip | the Cabinet Office of Japan's "QZS-2 Satellite Information" (<https://qzss.go.jp/en/technical/qzssinfo/khp0mf0000000wuf-att/spi-qzs2_c.pdf>): its numbers and its dimension drawing, read and not reproduced. Compared with the render "QZS-1R CG05" from the Quasi-Zenith Satellite System website (<https://commons.wikimedia.org/wiki/File:QZS-1R_CG05.png>) (read 2026-10-13) | numbers are facts; the render is CC BY 4.0 and is not in the file |
| `irnss.glb` (41 KB) | NavIC's first generation (IRNSS-1A to 1I): a 1.5 m cube, a round antenna plate and two red horns on a yellow Earth face, one panel a wing | ISRO's page of IRNSS-1A (<https://www.isro.gov.in/IRNSS_1A.html>) and eoPortal (<https://www.eoportal.org/satellite-missions/irnss>); ISRO's drawing "IRNSS Series 1" (<https://commons.wikimedia.org/wiki/File:IRNSS_Series_1.jpg>) (read 2026-10-13). The wings' size is our estimate | numbers are facts; the drawing is under the Government Open Data License - India |
| `saocom.glb` (58 KB) | SAOCOM 1A and 1B: a 10 m by 3.5 m radar antenna of seven panels, the bus lying across its back, a solar wing of three panels standing beside it | eoPortal (<https://www.eoportal.org/satellite-missions/saocom>) for CONAE's numbers; CONAE's render "SAOCOM 3D" (<https://commons.wikimedia.org/wiki/File:SAOCOM_3D.png>) (read 2026-10-13) | numbers are facts; the render is CC BY 4.0 and is not in the file |
| all seven | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `gps-iir`, `gps-iif`, `gps-iii`, `galileo-foc`, `michibiki`, `irnss`, `saocom` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and a US government painting of a GPS Block IIR satellite`;
`3D model: built by Space Radar from published dimensions and a US Air Force painting of a GPS Block IIF satellite`;
`3D model: built by Space Radar from published dimensions and a US Air Force render of a GPS III satellite`;
`3D model: built by Space Radar from the dimensions in EUSPA's Galileo satellite metadata`;
`3D model: built by Space Radar from the dimensions in the Cabinet Office of Japan's QZS-2 satellite information; compared with a render from the Quasi-Zenith Satellite System website (CC BY 4.0)`;
`3D model: built by Space Radar from ISRO's published dimensions and drawing of the IRNSS-1 series (ISRO, GODL-India)`;
`3D model: built by Space Radar from published dimensions and CONAE's render of SAOCOM (CONAE, CC BY 4.0)`

No logo, lettering, flag or insignia is on any of the seven. The US Space Force, Lockheed Martin,
Boeing, the European Union, EUSPA, ESA, OHB, the Cabinet Office of Japan, ISRO, CONAE and INVAP
do not endorse Space Radar, and none of them made or approved these shapes.


## 3b-9. Four more built from dimensions — MetOp, XMM-Newton, TerraSAR-X, StriX (2026-10-13)

The seventh batch: two European craft that had no shape of their own, and two radar satellites
that wore a blade that is not theirs. No agency publishes a model of any of these under terms
this project can use: ESA's own model of XMM-Newton exists (scifleet.esa.int) and ESA's terms
forbid derivative works, so it was not downloaded, and no ESA or EUMETSAT picture was used
either. No image-to-3D model was used: each file was written in code from numbers in reference
pages and agencies' own pages, each opened and quoted in its `registry/models.yaml` row with what
is NOT cited named beside it. Their cards say "shape built from published dimensions and
pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `metop.glb` (45 KB) | MetOp-B and MetOp-C: a gold body 6.3 m long and 2.5 m square, instruments on the Earth face, ASCAT's two 3 m antenna arms in a V, one wing beyond the service module, 17.6 m from end to tip | eoPortal (<https://www.eoportal.org/satellite-missions/metop>); ESA's page "About ASCAT" (<https://www.esa.int/Applications/Observing_the_Earth/Meteorological_missions/MetOp/About_ASCAT>) and ESA Bulletin 127 (<https://www.esa.int/esapub/bulletin/bulletin127/bul127b_edwards.pdf>), for words and numbers only; NASA's picture of a model, "MetOp-A & -B spacecraft model" (<https://commons.wikimedia.org/wiki/File:MetOp-A_%26_-B_spacecraft_model.png>) (all read 2026-10-13). The wing's own length and the instruments' sizes are ours | numbers are facts; the picture is in the public domain; NO ESA OR EUMETSAT PICTURE WAS USED |
| `xmm-newton.glb` (44 KB) | XMM-Newton: an eight-sided service module with three 70 cm mirror modules, a 6.8 m black tube, the focal plane with white radiators, two fixed wings of three panels, 16 m tip to tip | eoPortal (<https://www.eoportal.org/satellite-missions/xmm-newton>); NASA's Scientific Visualization Studio's render "XMM-Newton spacecraft animations (SVS20399 - XMM Beauty Still)" (<https://commons.wikimedia.org/wiki/File:XMM-Newton_spacecraft_animations_(SVS20399_-_XMM_Beauty_Still).jpg>) (read 2026-10-13). The tube's and the service module's widths and the focal-plane end are ours | numbers are facts; the render is in the public domain; NEITHER ESA'S MODEL NOR ANY ESA PICTURE WAS USED |
| `terrasar-x.glb` (52 KB) | TerraSAR-X and TanDEM-X: a six-sided body 5 m long with no wings, the 4.8 m radar antenna on one face 33.8 degrees off the nadir, the solar array fixed on the opposite face, a 3.3 m boom toward the Earth | eoPortal (<https://www.eoportal.org/satellite-missions/terrasar-x>, <https://www.eoportal.org/satellite-missions/tandem-x>) for DLR's numbers; DLR's render "TerraSAR-X and TanDEM-X satellites in formation flight over Europa" (<https://commons.wikimedia.org/wiki/File:TerraSAR-X_and_TanDEM-X_satellites_in_formation_flight_over_Europa.jpg>) (read 2026-10-13) | numbers are facts; the render is CC BY 3.0 and is not in the file |
| `strix.glb` (26 KB) | StriX: a 5 m by 0.8 m radar antenna of seven panels, the bus behind the middle one, solar cells in orange frames on the back of the other six | eoPortal (<https://www.eoportal.org/satellite-missions/strix>) for Synspective's numbers; a photograph of Synspective's 1/6 model by Blervis, "StriX Satellite Model" (<https://commons.wikimedia.org/wiki/File:StriX_Satellite_Model.jpg>) (read 2026-10-13). The antenna's Earth side is ours: no free picture shows it | numbers are facts; the photograph is CC0 and is not in the file |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `metop`, `xmm-newton`, `terrasar-x`, `strix` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and NASA's picture of a model of MetOp (NASA, public domain)`;
`3D model: built by Space Radar from published dimensions and a NASA render of XMM-Newton (NASA's Scientific Visualization Studio, public domain)`;
`3D model: built by Space Radar from published dimensions and DLR's render of TerraSAR-X and TanDEM-X (DLR, CC BY 3.0)`;
`3D model: built by Space Radar from published dimensions and a photograph of Synspective's model of StriX by Blervis (CC0)`

No logo, lettering, flag or insignia is on any of the four. EUMETSAT, ESA, Airbus, NASA, DLR and
Synspective do not endorse Space Radar, and none of them made or approved these shapes.

## 3b-10. Five European Earth-observation craft built from dimensions — Envisat, ERS-1, Sentinel-1, Sentinel-2, Sentinel-3 (2026-10-14)

The eighth batch. ESA publishes pictures of all five and models of some, and ESA's terms do not
allow derivative works, so **no ESA picture and no ESA model is in a file, on a sheet or derived from**:
ESA's and eoPortal's pages were read for words and numbers only. The layouts were read off
pictures that are free: two visitors' own photographs of full-size models, given to the public
domain; DLR's photographs of scale models at a show (CC BY 2.0); a Commons contributor's own
drawing (CC BY 4.0). Six more pictures were looked at only and are in no file and on no sheet
(five share-alike, one of them ESA's own photograph of Sentinel-2, looked at for the colour of
its blankets; one with no named author); each row in `registry/models.yaml` names them so. No image-to-3D model was
used: each file was written in code from numbers, each opened and quoted in its row with what is
NOT cited named beside it. Their cards say "shape built from published dimensions and pictures;
details simplified", and the two craft that no longer work say so in a sentence of their own.

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `envisat.glb` (60 KB) | Envisat: a gold body 10.5 m long with its instruments on the Earth face, the 10 m by 1.3 m ASAR antenna across it, the Ka-band dish on a 2 m mast, one wing 14 m by 5 m beyond the service module, 26 m from end to tip | eoPortal (<https://www.eoportal.org/satellite-missions/envisat>); a photograph of the full-size model by abrev, "Envisatmod" (<https://commons.wikimedia.org/wiki/File:Envisatmod.jpg>) (read 2026-10-14). The body's width and the instruments' places are ours | numbers are facts; the photograph is in the public domain and is not in the file; NO ESA PICTURE OR MODEL WAS USED |
| `ers-1.glb` (44 KB) | ERS-1: a gold payload module and a silver platform, the 10 m by 1 m radar antenna across the far end, the wind scatterometer's three antennas, the altimeter's 1.2 m dish, one solar array of two panels (11.7 m by 2.4 m) across the end of an arm | eoPortal (<https://www.eoportal.org/satellite-missions/ers-1>); a photograph of the full-size model by abrev, "Ers1mod" (<https://commons.wikimedia.org/wiki/File:Ers1mod.jpg>); looked at only, a photograph by Pline (<https://commons.wikimedia.org/wiki/File:Maquette-ERS-1.jpg>, CC BY-SA 3.0) and a small picture of the craft in orbit that names no author (<https://commons.wikimedia.org/wiki/File:Ers-1.gif>) (read 2026-10-14). The platform's size and the arm's length are ours | numbers are facts; the photograph drawn from is in the public domain and is not in the file; NO ESA PICTURE WAS USED |
| `sentinel-1.glb` (43 KB) | Sentinel-1: a gold bus 3.4 m long, the 12.3 m by 0.821 m radar antenna of fourteen tiles on its Earth face, two wings of five panels square to it, 21 m tip to tip | eoPortal (<https://www.eoportal.org/satellite-missions/copernicus-sentinel-1>) and ESA's facts page (<https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1/Facts_and_figures>), for words and numbers only; DLR's photographs of a scale model (<https://commons.wikimedia.org/wiki/File:Sentinel-1_model_(7628591172).jpg>, <https://commons.wikimedia.org/wiki/File:Sentinel-1_scale_model_(7628218618)_(2).jpg>); looked at only, a photograph by Rama (<https://commons.wikimedia.org/wiki/File:Sentinel_1-IMG_5874-white.jpg>, CC BY-SA 2.0 fr) (read 2026-10-14). The wings' width is ours | numbers are facts; DLR's photographs are CC BY 2.0 and are not in the file; NO ESA PICTURE WAS USED |
| `sentinel-2.glb` (62 KB) | Sentinel-2: a gold body 3.4 m long, 1.8 m wide and 2.35 m high, the multispectral instrument at one end with its opening on the Earth face, one wing of three panels | ESA's facts page (<https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2/Facts_and_figures>), for words and numbers only, and eoPortal (<https://www.eoportal.org/satellite-missions/copernicus-sentinel-2>); DLR's photograph of models at a show (<https://commons.wikimedia.org/wiki/File:Sentinel-2,_TanDEM-X_und_TerraSAR-X_-_Sentinel-2,_TanDEM-X_and_TerraSAR-X_(14051016907).jpg>); looked at only, a photograph by Rama (<https://commons.wikimedia.org/wiki/File:Sentinel_2-IMG_5873-white_(crop).jpg>, CC BY-SA 2.0 fr) and ESA's photograph of the craft at Kourou (<https://commons.wikimedia.org/wiki/File:Sentinel-2A_satellite_-_CSG_-_Carefully_aligning_the_satellite_to_the_adapter.jpg>, CC BY-SA 2.0), the second for the gold of the blankets and nothing else (read 2026-10-14). How the body divides and what stands where on it are ours | numbers are facts; DLR's photograph is CC BY 2.0 and is not in the file; NO ESA PICTURE IS IN THE FILE OR WAS DERIVED FROM |
| `sentinel-3.glb` (44 KB) | Sentinel-3: a black body 3.9 by 2.2 by 2.21 m; on its Earth face the altimeter's 1.2 m dish, the radiometer's two curved openings, the colour camera's five lenses, a gold 60 cm reflector; one wing of three panels | eoPortal (<https://www.eoportal.org/satellite-missions/copernicus-sentinel-3>) and ESA's facts page (<https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-3/Facts_and_figures>), for words and numbers only; a drawing by SkywalkerPL, "Sentinel-3 spacecraft model" (<https://commons.wikimedia.org/wiki/File:Sentinel-3_spacecraft_model.svg>); looked at only, a photograph by Neq00 (<https://commons.wikimedia.org/wiki/File:EUMETSAT_%E2%80%93_Model_of_Sentinel-3.jpg>, CC BY-SA 4.0) (read 2026-10-14). The instruments' housings are ours | numbers are facts; the drawing is CC BY 4.0 and is not in the file; NO ESA PICTURE WAS USED |
| all five | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `envisat`, `ers-1`, `sentinel-1`, `sentinel-2`, `sentinel-3` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and a photograph of the full-size model of Envisat by abrev (public domain)`;
`3D model: built by Space Radar from published dimensions and a photograph of the full-size model of ERS by abrev (public domain)`;
`3D model: built by Space Radar from published dimensions and DLR's photographs of a model of Sentinel-1 (DLR German Aerospace Center, CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions and DLR's photograph of a model of Sentinel-2 (DLR German Aerospace Center, CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions and a drawing of Sentinel-3 by SkywalkerPL (CC BY 4.0)`

No logo, lettering, flag or insignia is on any of the five. ESA, the European Union, EUMETSAT,
Airbus, Thales Alenia Space and DLR do not endorse Space Radar, and none of them made or approved
these shapes.

## 3b-11. Four Earth-observation craft built from dimensions — Sentinel-5P, CryoSat-2, SMOS, ALOS-2 (2026-10-14)

The ninth batch. Three are ESA's and one is JAXA's, and neither agency's pictures or models may be
derived from, so **no ESA picture, no JAXA picture and no agency model is in a file, on a sheet or
derived from**: ESA's, eoPortal's and JAXA's numbers were read as words and numbers only. The
layouts were read off pictures that are free: a Commons contributor's own photograph of a model of
Sentinel-5P (CC BY 3.0); DLR's photographs of a scale model of SMOS (CC BY 2.0); a visitor's own
photograph of JAXA's 1/50 model of ALOS-2, given to the public domain (CC0). **CryoSat-2 has no free
picture**: it is laid out from the pages' own sentences, and a visitor's share-alike photograph of the
flight craft was looked at only. Two pictures were looked at only and are in no file and on no
sheet; each row in `registry/models.yaml` names them so. No image-to-3D model was used. Their cards
say "shape built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `sentinel-5p.glb` (44 KB) | Sentinel-5P: a gold six-sided body, TROPOMI and its radiator on the Earth floor, three wings folded out flat at the far end, 5.63 m tip to tip and 3.35 m high | ESA's facts page (<https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-5P/Facts_and_figures>), for words and numbers only, and eoPortal (<https://www.eoportal.org/satellite-missions/copernicus-sentinel-5p>); a photograph of a model by SkywalkerPL, "Sentinel 5P model" (<https://commons.wikimedia.org/wiki/File:Sentinel_5P_model.jpg>) (read 2026-10-14). The body's width and height and the places on the Earth floor are ours | numbers are facts; the photograph is CC BY 3.0 and is not in the file; NO ESA PICTURE OR MODEL WAS USED |
| `cryosat-2.glb` (53 KB) | CryoSat-2: a copper body 4.6 by 2.34 by 2.20 m with no wings, a roof of two fixed panels of cells, the two SIRAL dishes side by side at the nose, pitched 6 degrees nose down | eoPortal (<https://www.eoportal.org/satellite-missions/cryosat-2>) and ESA's pages (<https://www.esa.int/Applications/Observing_the_Earth/FutureEO/CryoSat/Facts_and_figures>, <https://www.esa.int/Applications/Observing_the_Earth/FutureEO/CryoSat/Satellite>), for words and numbers only; NO FREE PICTURE; looked at only, a photograph by AndreasSchepers (<https://commons.wikimedia.org/wiki/File:Cryosat2_test_iabg_ottobrunn.jpg>, CC BY-SA 3.0) (read 2026-10-14). The roof's angle and the places on the Earth face are ours | numbers are facts; nothing of any picture is in the file; NO ESA PICTURE OR MODEL WAS USED |
| `smos.glb` (53 KB) | SMOS: the Y of MIRAS, three arms 8 m across with 69 gold receivers, over the instrument's hub and the 1 m Proteus bus, two wings of four panels, pitched 32.5 degrees as it flies | eoPortal (<https://www.eoportal.org/satellite-missions/smos>) and ESA's pages (<https://www.esa.int/Applications/Observing_the_Earth/FutureEO/SMOS/Facts_and_figures>, <https://www.esa.int/Applications/Observing_the_Earth/FutureEO/SMOS/Instrument>, <https://www.esa.int/Applications/Observing_the_Earth/FutureEO/SMOS/Satellite>), for words and numbers only; DLR's photographs of a scale model (<https://commons.wikimedia.org/wiki/File:SMOS_scale_model_(7628219434)_(2).jpg>, <https://commons.wikimedia.org/wiki/File:SMOS_scale_model_(7628218776)_(2).jpg>) (read 2026-10-14). The arms' width, the hub's size and the booms are ours | numbers are facts; the photographs are CC BY 2.0 and are not in the file; NO ESA PICTURE OR MODEL WAS USED |
| `alos-2.glb` (74 KB) | ALOS-2: the 9.9 m by 2.9 m L-band antenna of five panels under a gold body, two solar paddles of three panels across the track, 16.5 m tip to tip | eoPortal (<https://www.eoportal.org/satellite-missions/alos-2>), JAXA's numbers as it gives them; a photograph of JAXA's 1/50 model by Syced, "Inside JAXA Space Dome 8" (<https://commons.wikimedia.org/wiki/File:Inside_JAXA_Space_Dome_8.jpg>, CC0); looked at only, a photograph of the antenna's face by テレストレラッソ (<https://commons.wikimedia.org/wiki/File:ALOS-2-PALSAR-2.jpg>, CC BY-SA 4.0) (read 2026-10-14). The body's size, the paddles' panels and everything on the body's top are ours | numbers are facts; the photograph is in the public domain and is not in the file; NO JAXA PICTURE OR MODEL WAS USED |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `sentinel-5p`, `cryosat-2`, `smos`, `alos-2` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and a photograph of a model of Sentinel-5P by SkywalkerPL (CC BY 3.0)`;
`3D model: built by Space Radar from published dimensions (no free picture of the craft)`;
`3D model: built by Space Radar from published dimensions and DLR's photographs of a model of SMOS (DLR German Aerospace Center, CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions and a photograph of JAXA's model of ALOS-2 by Syced (CC0)`

No logo, lettering, flag or insignia is on any of the four. ESA, the European Union, JAXA, Airbus,
Thales Alenia Space, CNES, DLR and the National Museum of Nature and Science do not endorse Space
Radar, and none of them made or approved these shapes.

## 3b-12. Four weather and navigation craft built from dimensions — GLONASS-M, GLONASS-K, Fengyun-3, Himawari (2026-10-14)

The tenth batch. **No agency's or maker's picture or model is in a file, on a sheet or derived from**
(Roscosmos, ISS Reshetnev, CMA, SAST, JMA, JAXA, Mitsubishi Electric): their numbers were read as
numbers. The two GLONASS files rest on numbers the operator publishes for orbit modellers: the
GLONASS information centre's letters to the IGS (GLONASS-K's with the maker's dimensioned drawings,
READ and NOT reproduced). The
layouts of GLONASS-M and Fengyun-3 were read off photographs that are free: two visitors' photographs
of models of GLONASS-M given to the public domain (CC0), and a visitor's photograph of the Fengyun-3
mockup in Shanghai (CC BY 2.0). **GLONASS-K and Himawari have no free picture**: share-alike
photographs of models (GLONASS-K) and JMA's sketch (Himawari) were looked at only, and each
row in `registry/models.yaml` names them so. No image-to-3D model was used. Their cards say "shape
built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `glonass-m.glb` (38 KB) | GLONASS-M: a 1.63 m drum with a white antenna platform at its Earth end, a ring of helices on it, two wings of four panels, 30.85 m2 of cells, 3.05 m long | the maker's numbers as the MCC sent them to the IGS (IGSMAIL-5104, <https://lists.igs.org/pipermail/igsmail/2005/006475.html>), Duan et al., Journal of Geodesy 94:72 (2020), CC BY 4.0 (<https://link.springer.com/article/10.1007/s00190-020-01400-9>); photographs of models by Krassotkin (<https://commons.wikimedia.org/wiki/File:Wikitrip_to_MAI_museum_2016-02-02_073.JPG>) and the Museum of Cosmonautics (<https://commons.wikimedia.org/wiki/File:Glonass2_(14988917775).jpg>) (read 2026-10-14). The span (12.6 m) is derived; the helices and the platform's depth are ours | numbers are facts; the photographs are CC0 and are not in the file; NO ROSCOSMOS OR RESHETNEV PICTURE WAS USED |
| `glonass-k.glb` (32 KB) | GLONASS-K: a bronze box 2.66 by 1.6 by 0.795 m flaring at its Earth end, the retroreflector ring and the antennas on that end, two wings of two 1.6 by 2.65 m panels, 9.2 m tip to tip | the GLONASS information centre's letter to the IGS of 2011-08-24 (<http://acc.igs.org/glonass/GLONASS-K_mitrikas_24aug11.txt>) and its four figures, the maker's drawings, read and NOT reproduced; NO FREE PICTURE; looked at only, photographs of models by Vitaly V. Kuzmin (<https://commons.wikimedia.org/wiki/File:Glonass-K_-_MAKS2015part8-12.jpg>, CC BY-SA 4.0) and MKonair (CC BY-SA 2.0) (read 2026-10-14). The antennas' and thrusters' sizes are ours | numbers are facts; nothing of any picture or drawing is in the file |
| `fengyun-3.glb` (41 KB) | Fengyun-3 (3A to 3D): a silver box 4.4 by 2.0 by 2.0 m, one wing of 22.464 m2 on a truss yoke, the microwave imager's reflector and two calibration reflectors on the sky face, 10 m in flight | eoPortal (<https://www.eoportal.org/satellite-missions/fy-3>); a photograph of the mockup in the Shanghai Science and Technology Museum by Hibiki Watabe (<https://commons.wikimedia.org/wiki/File:Fengyun_3_satellite_mockup.jpg>) (read 2026-10-14). The wing's split and every instrument's size are ours | numbers are facts; the photograph is CC BY 2.0 and is not in the file; NO CMA, NSMC OR SAST PICTURE WAS USED |
| `himawari.glb` (33 KB) | Himawari-8 and -9: a dark box with the imager AHI on its Earth face, one solar array of two panels, a Ka-band dish beside it, inside the cited 5.2 by 8.0 by 5.3 m | eoPortal (<https://www.eoportal.org/satellite-missions/himawari-8-9>) and JMA's Meteorological Satellite Center (<https://www.data.jma.go.jp/mscweb/en/general/himawari.html>); NO FREE PICTURE; looked at only, JMA's sketch on that page (read 2026-10-14). Every size inside the envelope is ours | numbers are facts; nothing of any picture is in the file; NO JMA, JAXA OR MITSUBISHI ELECTRIC PICTURE WAS USED |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `glonass-m`, `glonass-k`, `fengyun-3`, `himawari` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and photographs of models of GLONASS-M by Krassotkin and the Museum of Cosmonautics (CC0)`;
`3D model: built by Space Radar from published dimensions (the maker's drawings, via the GLONASS information centre; no free picture of the craft)`;
`3D model: built by Space Radar from published dimensions and a photograph of the Fengyun-3 mockup by Hibiki Watabe (CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions (no free picture of the craft)`

No logo, lettering, flag or insignia is on any of the four. Roscosmos, ISS Reshetnev, the GLONASS
information centre, CMA, SAST, JMA, JAXA, Mitsubishi Electric, the IGS and the museums named here do
not endorse Space Radar, and none of them made or approved these shapes.

## 3b-13. Five agencies' own models — Europa Clipper, SMAP, Jason-3, Curiosity, SORCE (2026-10-15)

The eleventh batch, the first of the second hundred (public #1075 to #1079). Every file is an
agency's OWN published model, made ready and baked here; no shape was made by us. Each page was
read on 2026-10-15 and each file fetched that day; `registry/models.yaml` has a row per file with
the page's own words, the file's size and hash, what was left out, how it was turned, and every
colour that is ours.

| File | Model, as its page names it | Page | Credit on the page | Used for | Size |
|---|---|---|---|---|---|
| `europa-clipper.glb` | "Europa Clipper 3D Model" (2022) | <https://science.nasa.gov/resource/europa-clipper-3d-model/> | NASA Visualization Technology Applications and Development (VTAD) | JPL Horizons -159, Europa Clipper | 212 KB |
| `smap.glb` | "SMAP 3D Model" | <https://smap.jpl.nasa.gov/resources/99/smap-3d-model/> | NASA VTAD | NORAD 40376 (SMAP) | 170 KB |
| `jason-3.glb` | "Jason-3 3D Model" (2020) | <https://sealevel.jpl.nasa.gov/resources/94/jason-3-3d-model/> | none named | NORAD 41240 (JASON-3) | 109 KB |
| `curiosity.glb` | "Curiosity 3D Model" (2019) | <https://science.nasa.gov/resource/curiosity-3d-model/> | NASA VTAD | the Gale crater site on Mars | 241 KB |
| `sorce.glb` | "Solar Radiation and Climate Experiment (SORCE)" | <https://github.com/nasa/NASA-3D-Resources> | NASA 3D Resources | NORAD 27651 (SORCE) | 102 KB |

**Licence.** None of the four model pages states terms of its own. NASA's Images and Media Usage
Guidelines (<https://www.nasa.gov/nasa-brand-center/images-and-media/>, linked from NASA Science's
menu as "NASA Brand & Usage Guidelines") name models: "NASA content – images, audio, video, and
media files used in the rendition of 3-dimensional models, such as texture maps and polygon data in
any format – generally are not subject to copyright in the United States", and ask that "NASA
should be acknowledged as the source of the material". The two JPL pages carry JPL's image use
policy (<https://www.jpl.nasa.gov/jpl-image-use-policy/>), which names images and video and asks for
"Courtesy NASA/JPL-Caltech"; the models rest on NASA's sentence above, as SWOT's does (3b-6). NASA
3D Resources says "These assets are free and without copyright." No page marks a third-party
copyright on any of the five.

**What we changed.** Helper meshes left out (a clear helper cube in each JPL file; behind SMAP's
reflector, a disc whose texture is 96 % transparent); Europa Clipper, SMAP and Jason-3 turned as one
piece to the app's axes (the dish or the bus toward the Earth, the wings along X); SORCE scaled as
one piece to its cited 1.48 m; flat colours baked from the agencies' own materials and textures.
**Colours that are ours:** the solar cells of Europa Clipper, SMAP, Jason-3 and SORCE are drawn in
the app's panel blue, as NASA's own renders of the craft show them (the files make them a near-black
or, SORCE's, plain white). SMAP's see-through gold mesh reflector is drawn as a solid gold dish: the
app's material has no transparency. Curiosity and SORCE are not turned.

**Credit lines:** `3D model: NASA (Visualization Technology Applications and Development)` (Europa
Clipper, Curiosity); `3D model: NASA/JPL-Caltech (NASA Visualization Technology Applications and
Development)` (SMAP); `3D model: NASA/JPL-Caltech` (Jason-3); `3D model: NASA` (SORCE).

NASA's insignia and the missions' logos are on none of the five meshes (each file was looked at in
six views before and after the bake), and NASA does not endorse Space Radar.

## 3b-14. Five deep-space probes built from dimensions — Psyche, Lucy, JUICE, BepiColombo, Hera (2026-10-15)

The twelfth batch. **No agency publishes a model of any of the five under terms that allow a derivative**:
NASA Science's 3D models and NASA's 3D Resources have none of Psyche or Lucy; ESA's terms for the images
on its site allow "education, editorial and/or information purposes only"; the JUICE Science Operations
Centre's CAD-derived model in the SPICE kernels states no licence and was NOT fetched (only its published
table of where each component sits, which is numbers). So each file was built in code with the part
library from cited numbers. **No ESA or JAXA picture or model is in a file, on a sheet or derived from.**
Psyche's and Lucy's layouts were read off NASA's and JPL's own pictures (public domain); BepiColombo's off
two figures in papers published under CC BY 4.0 (Benkhoff et al. 2021, Magnafico et al. 2024); Hera's off
a figure in Michel et al. 2022 (CC BY 4.0). **JUICE has no free picture of the flight craft**: ESA's renders
(CC BY-SA 3.0 IGO) were looked at only, and NASA's icon of JUICE (public domain) draws an older design.
No image-to-3D model was used. Their cards say "shape built from published dimensions and pictures;
details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `psyche.glb` (44 KB) | Psyche: a black bus 2.2 by 2.4 by 2.9 m, a 2 m dish, the spectrometer's tripod and the magnetometer's boom over it, two five-panel cross-shaped wings, 24.7 by 7.3 m | NASA Science (<https://science.nasa.gov/mission/psyche/spacecraft/>) and eoPortal (<https://www.eoportal.org/satellite-missions/psyche>); NASA's concept PIA21499 (<https://commons.wikimedia.org/wiki/File:PIA21499_-_Artist%27s_Concept_of_Psyche_Spacecraft_with_Five-Panel_Array.jpg>), JPL's diagram (<https://commons.wikimedia.org/wiki/File:Psyche-spacecraft-diagram.png>) and NASA's illustration (<https://commons.wikimedia.org/wiki/File:Psyche_Spacecraft_(Artist%27s_Concept).jpg>) (read 2026-10-15). The panels' size and the yoke are derived; the instruments' sizes are ours | numbers are facts; the pictures are public domain and are not in the file |
| `lucy.glb` (26 KB) | Lucy: a silver bus with a 2 m dish and the instrument platform on top, two round ten-gore arrays 7.3 m across facing the way the dish faces, 16 m tip to tip | NASA Science (<https://science.nasa.gov/mission/lucy/spacecraft/>), eoPortal (<https://www.eoportal.org/satellite-missions/lucy>), Olkin et al., PSJ 2:172 (2021), CC BY 4.0 (<https://iopscience.iop.org/article/10.3847/PSJ/abf83f>); NASA's illustration of the deployed craft (<https://commons.wikimedia.org/wiki/File:Illustration_of_the_deployed_Lucy_spacecraft.jpg>), NASA/SwRI's concept and NASA's visualisation of the Earth flyby (read 2026-10-15). The bus's size is ours | numbers are facts; the pictures are public domain and are not in the file |
| `juice.glb` (45 KB) | JUICE: a grey bus with a 2.5 m dish, two cross-shaped wings of five 2.5 by 3.5 m panels, 27.1 m tip to tip, the 10.6 m magnetometer boom and the 16 m radar antenna | ESA's Juice specs and factsheet (<https://www.esa.int/Science_Exploration/Space_Science/Juice/Juice_spacecraft_specs>), the JUICE SOC's table of component places (<https://juicesoc.esac.esa.int/help/82_spacecraft_model.html>) and ESA's SPICE frames kernel (<https://spiftp.esac.esa.int/data/SPICE/JUICE/kernels/fk/>); NO FREE PICTURE; looked at only, ESA's renders on Commons (CC BY-SA 3.0 IGO) (read 2026-10-15). The bus is derived from the places; the instruments' sizes are ours; every rod is drawn thicker than the real tube | numbers are facts; nothing of any picture or model is in the file; NO ESA PICTURE OR MODEL WAS USED |
| `bepicolombo.glb` (38 KB) | BepiColombo in its cruise stack: the transfer module with two five-panel wings (30 m tip to tip), the Mercury Planetary Orbiter with its radiator, dish and own wing, and Mio in its conical sunshield, 6.3 m tall | ESA's factsheet (<https://www.esa.int/Science_Exploration/Space_Science/BepiColombo/BepiColombo_factsheet>), Benkhoff et al., Space Sci. Rev. 217:90 (2021), CC BY 4.0 (<https://link.springer.com/article/10.1007/s11214-021-00861-4>), eoPortal (<https://www.eoportal.org/satellite-missions/bepicolombo>); figures by Benkhoff et al. (<https://commons.wikimedia.org/wiki/File:BepiColombo_cruise_configuration.webp>) and Magnafico et al. (<https://commons.wikimedia.org/wiki/File:BepiColombo_MCS_composition.png>), CC BY 4.0, and SkywalkerPL's photograph of the MPO (<https://commons.wikimedia.org/wiki/File:BepiColombo_MPO_ESTEC.jpg>), CC BY 3.0 (read 2026-10-15). The transfer module's box, the split of the stack and the sunshield's height are ours | numbers are facts; the figures and the photograph are not in the file; NO ESA OR JAXA PICTURE WAS USED |
| `hera.glb` (28 KB) | Hera: a black box 1.6 by 1.7 by 1.6 m with a 1.13 m dish, the asteroid deck, the ring of thrusters underneath, two wings of three panels, 11.5 m tip to tip | ESA, "Hera spacecraft" (<https://www.esa.int/ESA_Multimedia/Images/2026/08/Hera_spacecraft>) and "Hera's wings of power", Michel et al., PSJ 3:160 (2022), CC BY 4.0 (<https://iopscience.iop.org/article/10.3847/PSJ/ac6f52>), its Figure 6 (<https://commons.wikimedia.org/wiki/File:Hera_spacecraft_design.jpg>); looked at only, ESA's labelled image (ESA Standard Licence) (read 2026-10-15). The instruments' sizes and the yokes are ours | numbers are facts; the figure is CC BY 4.0 and is not in the file; NO ESA PICTURE WAS USED |
| all five | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `psyche`, `lucy`, `juice`, `bepicolombo`, `hera` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and NASA/JPL pictures (public domain)`;
`3D model: built by Space Radar from published dimensions and NASA pictures (public domain)`;
`3D model: built by Space Radar from ESA's published dimensions (no free picture of the craft)`;
`3D model: built by Space Radar from published dimensions and figures by Benkhoff et al. 2021 and Magnafico et al. 2024 (CC BY 4.0)`;
`3D model: built by Space Radar from ESA's published dimensions and a figure by Michel et al. 2022 (CC BY 4.0)`

No logo, lettering, flag, insignia or plaque is on any of the five. NASA, JPL, SwRI, ESA, JAXA, the JUICE
Science Operations Centre and the papers' authors do not endorse Space Radar, and none of them made or
approved these shapes.

<!-- 0077 W1-a: begin -->
## 3b-15. Release 1.3.0: crewed craft and NASA flagships — Tiangong, Shenzhou orbital module, THEMIS, New Horizons (2026-10-20)

Stage W1-a of release 1.3.0 (internal spec 0077), to the model quality bar of 2026-10-20 ("the quality of
models should be very high"): an agency's own model first, otherwise a detailed build from published numbers
and several photographs. **THEMIS and New Horizons are NASA's own**; **Tiangong, Wentian, Mengtian and the
Shenzhou orbital module are built here in code**, because CMSA publishes no model and its own pictures on its
site carry no free licence. The free pictures used are photographs CMSA's office published in an open paper
(CC BY 4.0 on Commons), China News Service's stills (CC BY 4.0), a photographer's pictures of the full-size
mock-up (CC0) and NASA's (public domain). No picture is in a file; no image-to-3D model was used. The built
cards say "shape built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `themis.glb` (105 KB) | THEMIS, the probe NASA flies five of (A, D and E in Earth orbit): NASA's model with its own colours, the booms drawn shorter | NASA 3D Resources (<https://github.com/nasa/NASA-3D-Resources>, "Time History of Events and Macroscale Interactions During Substorms (THEMIS)"; its README, read 2026-10-20: "These assets are free and without copyright.") | public domain (NASA media usage guidelines) |
| `new-horizons.glb` (151 KB) | New Horizons: NASA's printable body and RTG, its dish, tripod, subreflector and feed rebuilt from NASA's 1/12 drawings, in gold blanket with white radiators | NASA Science (<https://science.nasa.gov/3d-resources/new-horizons/>: the STL parts, assembly.pdf and readme.pdf, read 2026-10-20; the page states no terms of its own and links NASA's Brand & Usage Guidelines); NASA's photographs "KSC-05pd2588" (<https://commons.wikimedia.org/wiki/File:KSC-05pd2588~orig.jpg>) and "New Horizons 1" (<https://commons.wikimedia.org/wiki/File:New_Horizons_1.jpg>), public domain, for the colours | NASA media usage guidelines; the photographs are public domain and are not in the file |
| `tiangong.glb` (206 KB) | Tiangong in its T: Tianhe with its node, relay dish, stowed arm and its own pair of wings flat in the plane of the T; Wentian to starboard and Mengtian to port with their outer sections, dishes, arms and platforms; the laboratories' four wings of copper-brown cells on lattice masts, 55.6 m tip to tip | Wikipedia's module pages (16.6 m, 17.9 m, 4.2 m, 55.6 m, 110 m2 a wing, read 2026-10-20); "Rear view of Tiangong Space Station", China Manned Space Engineering Office, CC BY 4.0 (<https://commons.wikimedia.org/wiki/File:Rear_view_of_Tiangong_Space_Station.jpg>); "Tiangong mockup at ZHAL 01" to "06", Shujianyang, CC0 (<https://commons.wikimedia.org/wiki/File:Tiangong_mockup_at_ZHAL_01.jpg>); "Tianhe solar array", China Manned Space Engineering Office, CC BY 4.0 (<https://commons.wikimedia.org/wiki/File:Tianhe_solar_array.jpg>); "Tiangong expansion", Wang Xiang, Zhang Qiao, Wang Wei, CC BY 4.0 (<https://commons.wikimedia.org/wiki/File:Tiangong_expansion.jpg>). A CC BY-SA 4.0 configuration drawing by Shujianyang was looked at only | numbers are facts; the photographs are CC BY 4.0 or CC0 and are not in the file |
| `wentian.glb` (82 KB), `mengtian.glb` (81 KB) | Each laboratory with its two wings, cut from the same build, for a laboratory drawn on its own | as `tiangong.glb` | as `tiangong.glb` |
| `shenzhou-orbital.glb` (36 KB) | The orbital module each Shenzhou crew leaves in orbit: a 2.25 m drum 2.8 m long with a domed front in quilted grey cloth, the docking mechanism, the rendezvous cameras and antennas, the joint where it held the re-entry module | the cited metres of the row `shenzhou` (Wikipedia); "Shenzhou 21 docking with CSS view from CSS 02" and "... view from docking hatch 01", China News Service, CC BY 4.0 (<https://commons.wikimedia.org/wiki/File:Shenzhou_21_docking_with_CSS_view_from_CSS_02.png>, <https://commons.wikimedia.org/wiki/File:Shenzhou_21_docking_with_CSS_view_from_docking_hatch_01.png>) | numbers are facts; the stills are CC BY 4.0 and are not in the file |
| the four built files | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `tiangong`, `wentian`, `mengtian`, `shenzhou-orbital` |

**Credit lines:**
`3D model: NASA`;
`3D model: NASA (the page names no author); dish, tripod and colours added by Space Radar from NASA's drawings`;
`3D model: built by Space Radar from published dimensions and photographs by the China Manned Space Engineering Office (CC BY 4.0) and Shujianyang (CC0)`;
`3D model: built by Space Radar from published dimensions and stills by China News Service (CC BY 4.0)`

No logo, lettering, flag or insignia is on any of these files: the red panels where Tiangong carries its flag
and the white plate where a Shenzhou carries its number are plain. NASA, CMSA, the China Manned Space
Engineering Office, China News Service and the photographers do not endorse Space Radar, and none of them made
or approved these shapes.
<!-- 0077 W1-a: end -->
<!-- 0077 W1-b: begin -->
## 3b-15. Four deep-space craft built from dimensions — Mars Express, Gaia, Hayabusa2, Hope (2026-10-20)

Release 1.3.0, stage W1-b (public #1085 to #1088). **No agency publishes a model of any of the four under terms that allow
a derivative**: NASA's 3D Resources and NASA Science have none of them; ESA's terms for the images on its site allow
"education, editorial and/or information purposes only", and its planetarium models may not be altered; JAXA's terms forbid
altered derivatives of its material; MBRSC publishes no model of Hope. So each file was built in code with the part library
from cited numbers. **No ESA, JAXA or MBRSC picture or model is in a file, on a sheet or derived from.** Mars Express's layout
was read off two NASA/JPL illustrations by Corby Waste (public domain); Gaia's Sun side off DLR's photograph of the full-size
model (CC BY 2.0); Hayabusa2's off DLR's renders (CC BY 2.0) and The Planetary Society's diagram (CC BY 3.0). **Hope has no free
picture of the flight craft**: the mock-up's photographs (CC BY-SA 4.0) and MBRSC's photograph of the deployed craft were looked
at only. ESA's renders on Commons (CC BY-SA 3.0 IGO) and JAXA's 1:20 model (photograph CC BY-SA 4.0) were looked at only. No
image-to-3D model was used. Their cards say "shape built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `mars-express.glb` (72 KB) | Mars Express: a black box 1.5 by 1.4 by 1.8 m, a 1.6 m dish, the two relay antennas and Beagle 2's empty ring on the top face, two four-panel wings on D-shaped yokes, 11.9 m tip to tip, the MARSIS dipole and monopole DRAWN SHORTENED (5.6 of 20 m a side, 2 of 7 m) | Wikipedia (<https://en.wikipedia.org/wiki/Mars_Express>); NASA/JPL's illustrations by Corby Waste (<https://commons.wikimedia.org/wiki/File:Mars_Express_illustration_highlighting_MARSIS_antenna.jpg>, <https://commons.wikimedia.org/wiki/File:Mars_Express_over_Tharsis_volcanoes.jpg>); looked at only, ESA's render ESA392355 (<https://commons.wikimedia.org/wiki/File:Mars_Express_ESA392355.jpg>, CC BY-SA 3.0 IGO) (read 2026-10-20). The panels' size is derived; the yokes, the instruments and the radiators are ours | numbers are facts; the illustrations are public domain and are not in the file; NO ESA PICTURE WAS USED |
| `gaia.glb` (97 KB) | Gaia: a twelve-sided sunshield 10 m across, each face a crinkled sheet of foil (blue-violet silver on the Sun side, with six cell panels, the fixed ring and the phased-array antenna; darker grey-silver on the cold side, with the frame's struts); the hexagonal service module; the black thermal tent with the two telescopes' openings 106.5 degrees apart, 3.5 m tall | Wikipedia (<https://en.wikipedia.org/wiki/Gaia_(spacecraft)>), eoPortal (<https://www.eoportal.org/satellite-missions/gaia>), ESA's factsheet; DLR's photograph of the full-size model (<https://commons.wikimedia.org/wiki/File:GAIA_(14050944939).jpg>, CC BY 2.0); looked at only, the model at Le Bourget (CC BY-SA 3.0) and ESA's render (CC BY-SA 3.0 IGO) (read 2026-10-20). The drum, the service module and the panels' sizes are ours | numbers are facts; the photograph is CC BY 2.0 and is not in the file; NO ESA PICTURE WAS USED |
| `hayabusa2.glb` (86 KB) | Hayabusa2: a gold box 1.0 by 1.6 by 1.25 m with two flat antennas, the re-entry capsule, the ion engines' four heads, the sampler horn, two wings of three panels on ladders, 6 by 4.23 m | eoPortal (<https://www.eoportal.org/satellite-missions/hayabusa-2>), Wikipedia (<https://en.wikipedia.org/wiki/Hayabusa2>); DLR's renders (<https://commons.wikimedia.org/wiki/File:Hayabusa2_front_view.jpg>, <https://commons.wikimedia.org/wiki/File:Hayabusa2_side_view.jpg>, CC BY 2.0) and The Planetary Society's diagram (<https://commons.wikimedia.org/wiki/File:20190605_hayabusa-diagram-tpr-01.png>, CC BY 3.0); looked at only, JAXA's 1:20 model (CC BY-SA 4.0) and JAXA's labelled views (read 2026-10-20). The antennas' size, the horn and the instruments are ours | numbers are facts; the renders and the diagram are CC BY and are not in the file; NO JAXA PICTURE WAS USED |
| `hope.glb` (66 KB) | Hope (Emirates Mars Mission): a gold hexagonal prism 2.37 m across and 2.9 m tall, a 1.85 m dark dish, two wings of two panels, the three instruments on one face, 8.0 m tip to tip | eoPortal (<https://www.eoportal.org/satellite-missions/emm-hope>); NO FREE PICTURE; looked at only, the mock-up at IAC 2021 (<https://commons.wikimedia.org/wiki/File:Emirates_Mars_Mission_mockup_at_IAC_2021_01_(cropped).jpg>, CC BY-SA 4.0) and MBRSC's photograph of the deployed craft (read 2026-10-20). The wings' size and place, the dish's depth and the instruments' boxes are ours | numbers are facts; nothing of any picture is in the file |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `mars-express`, `gaia`, `hayabusa2`, `hope` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and NASA/JPL pictures (public domain)`;
`3D model: built by Space Radar from published dimensions and a photograph of the full-size model (CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions, DLR renders (CC BY 2.0) and a Planetary Society diagram (CC BY 3.0)`;
`3D model: built by Space Radar from published dimensions (no free picture of the flight craft)`

No logo, lettering, flag or insignia is on any of the four. NASA, JPL, ESA, DLR, JAXA, MBRSC, the UAE Space Agency, The Planetary
Society and the pictures' authors do not endorse Space Radar, and none of them made or approved these shapes.
<!-- 0077 W1-b: end -->

<!-- 0077 W1-c: begin -->
## 3b-15. Three modern Moon landers and Surveyor built from dimensions — Vikram, Odysseus, Blue Ghost, Surveyor (2026-10-20)

Release 1.3.0, stage W1-c (public #1133, #1135, #1136, #267). **No agency or company publishes a model of any of these craft
under terms that allow a derivative**: ISRO, Intuitive Machines and Firefly publish none, and NASA's 3D Resources
(1 583 paths, read 2026-10-20) and NASA Science's 3D models have none of them (NASA's `Firefly` model is a CubeSat). So each
file was built in code, part by part, from cited numbers, with photographs looked at for what the numbers do not say, and
each is drawn **as it came to rest**: Vikram upright with its ramp down;
Odysseus on its side; Blue Ghost upright. No image-to-3D model was used and no picture is in any file. SLIM (#1134) was
built too and not shipped: at the app's framing it did not read as SLIM. No logo and no lettering is on any
mesh. Their cards say "shape built from published dimensions and pictures; details simplified".

ISRO's pictures are under the Government Open Data License – India (GODL-India), which gives "a worldwide, royalty-free,
non-exclusive license to use, adapt, publish (either in original, or in adapted and/or derivative forms) ... for all lawful
commercial and non-commercial purposes", with attribution, and excludes "names, crests, logos and other official symbols"
(Commons' licence text, read 2026-10-20).

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `vikram.glb` (136 KB) | Chandrayaan-3's Vikram lander: the cited 2 by 2 by 1.166 m body in gold blankets, two leaning solar panels, a radiator, the rover's empty bay and its two-part ramp down to the ground, four legs, the four 800 N engines round the interface ring, the dome, NASA's retroreflector, ChaSTE's probe in the ground | ISRO's brochure (<https://www.isro.gov.in/media_isro/pdf/Missions/LVM3/LVM3M4_Chandrayaan3_brochure.pdf>) and mission page (<https://www.isro.gov.in/Chandrayaan3_Details.html>); ISRO's clean-room photographs 03 and 05 (<https://commons.wikimedia.org/wiki/File:Chandrayaan-3_lander_in_clean-room_03.webp>, <https://commons.wikimedia.org/wiki/File:Chandrayaan-3_lander_in_clean-room_05.webp>), its labelled drawings (<https://commons.wikimedia.org/wiki/File:Chandrayaan-3_Lander_Module_-Views.webp>) and Pragyan's picture of Vikram on the Moon (read 2026-10-20) | numbers are facts; the pictures are ISRO's, GODL-India, credit "Indian Space Research Organisation", and are not in the file |
| `odysseus.glb` (67 KB) | Intuitive Machines' Nova-C Odysseus on its side: a hexagonal body 3.938 m tall, black below and white above, two body arrays and the top-deck array, the copper-wrapped tank it rests on, six legs (those under it as stubs) | Wikipedia's "Nova-C" and "IM-1" (read 2026-10-20) for the height, the arrays, the broken leg and the 30 degrees; NASA's photograph of the flight lander (<https://commons.wikimedia.org/wiki/File:Intuitive_Machines%E2%80%99_Nova-C_lunar_lander_(IM_00309)_(cropped).jpg>) | numbers are facts; the photograph is public domain and is not in the file |
| `blue-ghost.glb` (63 KB) | Firefly's Blue Ghost of Mission 1: 2 m tall and 3.5 m wide (cited), a black lower deck, a body whose faces lean in, three arrays, gold blankets, four legs to dish footpads, thruster pods, payloads on the top deck | Firefly (<https://fireflyspace.com/missions/blue-ghost-mission-1/>) and NASA's podcast (<https://www.nasa.gov/podcasts/houston-we-have-a-podcast/blue-ghost-mission-1/>); a photograph of Firefly's full-size mock-up by Blervis (<https://commons.wikimedia.org/wiki/File:Firefly_Blue_Ghost_lander_mockup.jpg>, CC BY 4.0), NASA's rendering (<https://commons.wikimedia.org/wiki/File:Blue_Ghost_Mission_1_rendering.jpg>, public domain) and SpaceX's photograph of the lander in its fairing (<https://commons.wikimedia.org/wiki/File:Blue_Ghost_M1_in_fairing.jpg>, CC0) | numbers are facts; the photographs are CC BY 4.0 (credit "Blervis"), public domain and CC0, and are not in the file |
| `surveyor.glb` (62 KB), `surveyor-3.glb` (64 KB) | Surveyor 1, and Surveyor 3 with its soil sampler: the triangular spaceframe, three lattice legs to crushable footpads, the mast with the 0.855 m² panel and the planar array, the compartments, the camera, the omni booms, the verniers | NSSDCA's Surveyor pages (as `scene/models.js` buildSurveyor cites them) and Wikipedia's "Surveyor 3"; Apollo 12's photographs AS12-48-7134 (<https://commons.wikimedia.org/wiki/File:Apollo12ConradSurveyor.jpg>) and AS12-48-7110, public domain; the Smithsonian's photographs of its Surveyor test vehicle (<https://commons.wikimedia.org/wiki/File:Lunar_Lander,_Surveyor_-_DPLA_-_d6accc3d89e8efa6f2e88962941bf43a_(page_1).jpg>, CC0) | numbers are facts; the photographs are public domain and CC0 and are not in the files |
| all five | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `vikram`, `odysseus`, `blue-ghost`, `surveyor`, `surveyor-3` |

**Credit lines:**
`3D model: built by Space Radar from ISRO's published dimensions and pictures (ISRO, GODL-India)`;
`3D model: built by Space Radar from published dimensions and a NASA photograph (public domain)`;
`3D model: built by Space Radar from Firefly's published dimensions and pictures (NASA, public domain; SpaceX, CC0; Blervis, CC BY 4.0)`;
`3D model: built by Space Radar from NSSDCA's dimensions and NASA's and the Smithsonian's photographs (public domain, CC0)`.

<!-- 0077 W1-c: end -->
<!-- 0077 W2-pbr: begin -->
## 3b-15. SLIM built from dimensions (2026-10-20)

Release 1.3.0, stage W2-pbr (internal #967; public #1134). Built by stage W1-c and held back because the toon ramp drew it as
a yellow box; shipped once the app could draw a file's own materials (`scene/pbr.js`). **JAXA publishes no model of SLIM under
terms that allow a derivative**, and NASA's 3D Resources and NASA Science have none. So it was built in code, part by part,
from JAXA's cited numbers, and drawn **as it came to rest**: on its nose, engines up, one nozzle lost. No image-to-3D model was
used, no picture is in the file, and **no JAXA picture or model is in the file, on a sheet or derived from** (JAXA's figures
were looked at only). No logo and no lettering is on the mesh. Its card says "shape built from published dimensions and
pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `slim.glb` (114 KB) | JAXA's SLIM standing on its nose: the cited 2.4 by 1.7 by 2.7 m, the thin-film cells, the cylindrical tank, five legs with ball absorbers, one main nozzle and the broken mount of the other, twelve 22 N thrusters | JAXA's media kit (<https://global.jaxa.jp/countdown/slim/SLIM-mediakit-EN_2310.pdf>) and press conference of 25 January 2024 (<https://www.isas.jaxa.jp/en/outreach/announcements/files/SLIM-pressconf-20240125.pdf>), their figures looked at only; a photograph of JAXA's quarter-scale model at Expo 2025 by Artem.G (<https://commons.wikimedia.org/wiki/File:SLIM_at_Expo2025_02.jpg>, CC BY 4.0) | numbers are facts; the photograph is CC BY 4.0, credit "Artem.G", and is not in the file; the shape is this project's, under this repository's licence (`registry/models.yaml`, row `slim`) |

**Credit line:** `3D model: built by Space Radar from JAXA's published dimensions; compared with a photograph of JAXA's model by Artem.G (CC BY 4.0)`.

<!-- 0077 W2-pbr: end -->
<!-- 0077 W3-b: begin -->
## 3b-15. Four ESA and EUMETSAT Earth explorers built from dimensions — EarthCARE, Biomass, Swarm, MetOp-SG A1 (2026-10-20)

Release 1.3.0, stage W3-b (public #955, #956, #1101, #993). **No agency publishes a model of any of the four under terms that
allow a derivative**: NASA's 3D Resources and NASA Science have none of them; ESA's terms for the pictures on its site (the ESA
Standard Licence) allow use for information and education, not an altered model, and EUMETSAT and JAXA publish none. So each
file was built in code with the part library from cited numbers. **No ESA, JAXA, EUMETSAT or Airbus picture or model is in a
file.** The layouts were read off pictures that are free (named below, with credit) and off ESA's own photographs and renders
under the ESA Standard Licence, which were looked at only and are on no sheet. **Swarm has no free picture**: it was built from
eoPortal's numbers, its layout read off ESA's pictures and not traced, as its issue asked. No image-to-3D model was used. Their
cards say "shape built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `earthcare.glb` (75 KB) | EarthCARE: a white body 4.1 by 2.3 by 2.0 m, the cloud radar's 2.5 m dish out in front looking at the Earth on its tower and truss, the lidar's 620 mm telescope, the radiometer's three telescopes and the imager on the Earth face, five panels of 1.68 by 2.5 m trailing on a 1.9 m yoke, 17.4 m in all | ESA's facts and figures (<https://www.esa.int/Applications/Observing_the_Earth/FutureEO/EarthCARE/Facts_and_figures>) and eoPortal (<https://www.eoportal.org/satellite-missions/earthcare>); ESA's photographs "Cleaning EarthCARE" (<https://commons.wikimedia.org/wiki/File:Cleaning_EarthCARE_ESA25462753.jpg>) and "EarthCARE solar wing deployed" (<https://commons.wikimedia.org/wiki/File:EarthCARE_solar_wing_deployed_ESA24376876.jpeg>), CC BY-SA 3.0 IGO; Syced's photograph of JAXA's 1/50 model (<https://commons.wikimedia.org/wiki/File:Inside_JAXA_Space_Dome_5.jpg>, CC0); looked at only, ESA's renders and photographs on esa.int (read 2026-10-20). The body's size, the dish's place and lean and the instruments' sizes are ours | numbers are facts; the photographs are not in the file |
| `biomass.glb` (94 KB) | Biomass: an orange-gold bus 1.3 by 1.2 by 3.4 m with its black face, the feed's two by two radiators on its wall, one wing of four panels, a three-piece boom of 7.5 m to the 12 m reflector: nine ribs from a hub, the gold mesh in scallops between them, a mast and its cords | eoPortal (<https://www.eoportal.org/satellite-missions/biomass>) and ESA's "The satellite" (<https://www.esa.int/Applications/Observing_the_Earth/FutureEO/Biomass/The_satellite>); ESA's picture "Biomass in orbit" (<https://www.esa.int/ESA_Multimedia/Images/2025/02/Biomass_in_orbit>) and photograph "Rolling Biomass to the cleanroom" (<https://commons.wikimedia.org/wiki/File:Rolling_Biomass_to_the_cleanroom_ESA507406.jpg>), CC BY-SA 3.0 IGO; looked at only, ESA's photographs and renders on esa.int and the satellite's own picture of the opened reflector (read 2026-10-20). The bus's size, the number of ribs and the reflector's tilt are ours | numbers are facts; the pictures are not in the file |
| `swarm.glb` (32 KB) | Swarm (A, B and C, one design): a body 1.5 m wide and 0.85 m high at its ram face, its roof the two arrays, narrowing to the back; the electric field instrument and the Langmuir probes in front; a 4.3 m boom with the optical bench and its star trackers and the scalar magnetometer at the tip; 9.15 m in all | eoPortal (<https://www.eoportal.org/satellite-missions/swarm>); NO FREE PICTURE; looked at only, ESA's photographs and pictures on esa.int (read 2026-10-20). The taper, the ridge and the instruments' sizes are ours | numbers are facts; nothing of any picture is in the file |
| `metop-sg-a.glb` (105 KB) | MetOp-SG A1: a gold body 6.5 by 2.6 by 2.15 m over a dark payload module, IASI-NG with its cooler's shield on top at one end, METimage, Sentinel-5, the microwave sounder and 3MI on the Earth face, one wing of four panels 2.4 by 2.5 m out to the side, 11.75 m from the wall | eoPortal (<https://www.eoportal.org/satellite-missions/metop-sg>) and ESA's MetOp-SG facts and figures; ESA's pictures of the A satellite on Commons (<https://commons.wikimedia.org/wiki/File:MetOp_Second_Generation_A-type_satellite_ESA511182.jpg>, <https://commons.wikimedia.org/wiki/File:MetOp-SG-A_instruments_ESA511184.jpg>, CC BY-SA 3.0 IGO); Don-vip's photographs of A1 at Airbus (<https://commons.wikimedia.org/wiki/File:Metop-SG_A1_avec_IASI-NG-09.jpg> and its series, CC BY-SA 4.0) (read 2026-10-20). The instruments' sizes and places are ours | numbers are facts; the pictures are not in the file |
| all four | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `earthcare`, `biomass`, `swarm`, `metop-sg-a` |

**Credit lines:**
`3D model: built by Space Radar from ESA's and eoPortal's published dimensions; compared with photographs by ESA (CC BY-SA 3.0 IGO) and Syced (CC0)`;
`3D model: built by Space Radar from ESA's and eoPortal's published dimensions; compared with ESA's pictures (CC BY-SA 3.0 IGO)`;
`3D model: built by Space Radar from eoPortal's published dimensions`;
`3D model: built by Space Radar from eoPortal's and ESA's published dimensions; compared with pictures by ESA (CC BY-SA 3.0 IGO) and Don-vip (CC BY-SA 4.0)`

No logo, lettering, flag or insignia is on any of the four. ESA, JAXA, EUMETSAT, Airbus, the pictures' authors and eoPortal do
not endorse Space Radar, and none of them made or approved these shapes.
<!-- 0077 W3-b: end -->
<!-- 0077 W3-c: begin -->
## 3b-16. China's landers and rovers and the Lunokhods built from dimensions — Zhurong, Chang'e 3 and 4, Yutu, Chang'e 5 and 6, Lunokhod 1 and 2 (2026-10-20)

Release 1.3.0, stage W3-c (public #1124, #1125, #1126, #1127). **No agency publishes a model of any of these craft under terms
that allow a derivative**: CNSA and Lavochkin publish none, and NASA's 3D Resources and NASA Science's 3D models have none of
them (read 2026-10-20). So each file was built in code, part by part, from cited numbers, with photographs looked at for what
the numbers do not say, and each is drawn **as it stands now**: the Chang'e 3 and 4 landers with their rovers gone and both
ramps down; the Chang'e 5 lander with its ascender gone (Chang'e 6's site wears the same file: the same design); Zhurong with
its wings spread; the Lunokhods with their lids open. No image-to-3D model was used and no picture is in any file. The flags are
drawn as plates; no logo and no lettering is on any mesh. Photographs under share-alike licences (the museums' mock-ups) were
looked at only: nothing was traced from them. Their cards say "shape built from published dimensions and pictures; details
simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `zhurong.glb` (81 KB) | Zhurong on Mars: the cited 2.6 by 3 by 1.85 m, the gold body under its gold-foil deck with two round windows, dust-tinted wings in gold frames, four swept wings, the mast and camera head, MarSCoDe, the climate station, the dish, the whips, six wheels on the suspension's beams | Wikipedia's "Zhurong (rover)" and zh.wikipedia's "祝融号火星车" (read 2026-10-20); the selfie with the lander (<https://commons.wikimedia.org/wiki/File:Zhurong-with-lander-selfie.png>, CNSA via China News Service, CC BY 4.0); the payload layout of Li et al. 2021 (<https://commons.wikimedia.org/wiki/File:Zhurong_payload.jpg>, CC BY 4.0); Regnart's suspension drawing (<https://commons.wikimedia.org/wiki/File:ZhurongFahrwerk.jpeg>, CC0) | numbers are facts; the pictures are not in the file |
| `change-3.glb` (122 KB), `change-4.glb` (121 KB) | The Chang'e 3 and Chang'e 4 landers: an octagonal body 0.83 m off the ground, four legs 4.76 m across the pads, two panels, the main engine, eight thruster pods, both ramps down, the deck's camera, dish and whip; Chang'e 3 with its ultraviolet telescope and EUV camera, Chang'e 4 with its three LFS antennas | eoPortal's "Chang'e-3" (<https://eoportal.org/satellite-missions/chang-e-3>) and Wikipedia's "Chang'e 4" (read 2026-10-20); Yutu-2's pictures of the lander (<https://commons.wikimedia.org/wiki/File:ChangE-4_-_PCAM.png>, <https://commons.wikimedia.org/wiki/File:ChangE-4_-_PCAM_(51216550288).png>, CSNA/Siyu Zhang/Kevin M. Gill, CC BY 2.0); the lander's own picture of Yutu-2 leaving (<https://commons.wikimedia.org/wiki/File:Yutu-2_leaving_Chang_e-4-iau1901a.jpg>, CNSA, CC BY 4.0) | numbers are facts; the pictures are not in the files |
| `yutu.glb` (95 KB) | Yutu (and Yutu-2, the same design, which has no site of its own): the cited 1.5 by 1 by 1.1 m body, two panels, the mast with its cameras 1.5 m up and the dish, the arm, six wheels on rocker and bogie | zh.wikipedia's "玉兔号月球车" and "嫦娥四号", eoPortal's "Chang'e-3" (read 2026-10-20); Yutu on the Moon (<https://commons.wikimedia.org/wiki/File:Yutu_rover.jpg>, IHEP/CAS, CC BY 4.0); Yutu-2 on the far side (<https://commons.wikimedia.org/wiki/File:ChangE-4,_Yutu-2.png>, CSNA/Siyu Zhang/Kevin M. Gill, CC BY 2.0) | numbers are facts; the pictures are not in the file |
| `change-5.glb` (118 KB) | The Chang'e 5 lander, also drawn for Chang'e 6: the Chang'e 3 structure (cited), the ascender's empty seat, two arrays, the drill's column, the arm raised with its scoop, the flag on its boom | eoPortal's "Chang'e-5" (<https://www.eoportal.org/satellite-missions/chang-e-5>) and zh.wikipedia's "嫦娥五号" (read 2026-10-20); China News Service's pictures of the flight lander in test and its rendering of the flag (<https://commons.wikimedia.org/wiki/File:Chang-e_5_assembly_factory_test_1.png>, <https://commons.wikimedia.org/wiki/File:Chang-e_5_lander_ascender_assembly_test.png>, <https://commons.wikimedia.org/wiki/File:Chang-e-5-Lander-Flag.png>, CC BY 4.0) | numbers are facts; the pictures are not in the file |
| `lunokhod-1.glb` (164 KB), `lunokhod-2.glb` (165 KB) | Lunokhod 1 and 2: the tub 1.7 by 1.6 m and 1.35 m high (cited), the round lid open with its cells, eight wire wheels, the TV cameras (Lunokhod 2's third high one), the cone and helical antennas, the retroreflector, the telephotometers | Wikipedia's "Lunokhod 1" and "Lunokhod 2" (read 2026-10-20); Lunokhod 2's model in Kaluga (<https://commons.wikimedia.org/wiki/File:Lunokhod_2_in_Kaluga_01.jpg>, <https://commons.wikimedia.org/wiki/File:Lunokhod_2_in_Kaluga_02.jpg>, Stolbovsky, CC BY 4.0); Lunokhod 1's full-size model (<https://commons.wikimedia.org/wiki/File:Lunokhod_1_moon_rover_(MMA_2011)_(1).JPG>, Armael, CC0); the Evergreen replica (<https://commons.wikimedia.org/wiki/File:USSR_Lunokhod_1_(6586684979)_(6).jpg>, Clemens Vasters, CC BY 2.0) | numbers are facts; the pictures are not in the files |
| all seven | The shapes | this project | this repository's licence: `registry/models.yaml`, rows `zhurong`, `change-3`, `change-4`, `yutu`, `change-5`, `lunokhod-1`, `lunokhod-2` |

**Credit lines:**
`3D model: built by Space Radar from published dimensions and pictures (CNSA via China News Service, CC BY 4.0; Li et al. 2021, CC BY 4.0; Regnart, CC0)`;
`3D model: built by Space Radar from published dimensions and pictures (CNSA/Siyu Zhang/Kevin M. Gill, CC BY 2.0; CNSA, CC BY 4.0)`;
`3D model: built by Space Radar from published dimensions and pictures (IHEP/CAS, CC BY 4.0; CNSA/Siyu Zhang/Kevin M. Gill, CC BY 2.0)`;
`3D model: built by Space Radar from published dimensions and pictures (China News Service, CC BY 4.0)`;
`3D model: built by Space Radar from published dimensions and photographs of museum models (Stolbovsky, CC BY 4.0; Armael, CC0; Clemens Vasters, CC BY 2.0)`.

CNSA, China News Service, the Chinese Academy of Sciences, Lavochkin, the museums and the pictures' authors do not endorse
Space Radar, and none of them made or approved these shapes.

<!-- 0077 W3-c: end -->
<!-- 0077 W3-a: begin -->
## 3b-16. NASA science craft built from dimensions — IRIS, TIMED, TRACERS, SERT 2, ISIS 1 (2026-10-20)

Release 1.3.0, stage W3-a (public #1090, #1091, #1092, #1094, #1110). **NASA 3D Resources (its 1 583 paths) and NASA Science's 3D
models have none of these five**, so each was built in code, part by part, from cited numbers, and compared side by side with
the pictures below from four angles and more. No image-to-3D model was used and no picture is in any file. No logo and no lettering
is on any mesh. Their cards say "shape built from published dimensions and pictures; details simplified". Two of them carry long thin
parts DRAWN SHORT, because the app scales a model's longest side to one unit: ISIS 1's sounder dipoles (6.0 and 3.0 m tip to tip
against 73 and 18.7 m) and TRACERS' four electric-field booms (1.25 m of their 3 m). Each row of `registry/models.yaml` cites every
number and says what is ours.

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `iris.glb` (114 KB) | IRIS as it flies: door open, both wings out, silver flight blankets | De Pontieu et al. 2014 (Solar Physics 289:2733, CC BY 4.0, figures 7 and 8); NASA's photographs (<https://commons.wikimedia.org/wiki/File:IRIS_spacecraft_model.png>, KSC-2013-2109) and Goddard's render (<https://commons.wikimedia.org/wiki/File:IRIS_satellite.jpg>) | public domain; CC BY 4.0 (the paper) |
| `timed.glb` (148 KB) | TIMED: the bus, the optical bench with the four TIDI telescopes, GUVI, two four-panel wings | TIMED QuickFacts and the CDR (spdf.gsfc.nasa.gov); NASA's render (<https://commons.wikimedia.org/wiki/File:TIMED.jpg>); APL's photographs looked at only | public domain |
| `tracers.glb` (69 KB) | TRACERS (both craft): the black octagon, its cells, brackets and booms (booms drawn short) | Miles et al. 2025 and Bonnell et al. 2025 (Space Sci. Rev.); NASA's turntable (<https://commons.wikimedia.org/wiki/File:TRACERS_spacecraft_turntable_(30fps_4k).webm>); SpaceX's encapsulation photograph (CC0) | public domain; CC0 |
| `sert-2.glb` (126 KB) | SERT 2 on its Agena D, both wings out, its two ion thrusters | NASA's reports (NTRS 19710002423, 19720019048, 19710013187); NASA's painting C-70-2041 and the Tank 5 photograph (Commons) | public domain |
| `isis-1.glb` (134 KB) | ISIS 1: the drum of cells and its crossed sounder dipoles (drawn short) | NRC Science Dimension 1969 (looked at only) and NSSDCA; NSSDCA's photograph of the flight craft (<https://nssdc.gsfc.nasa.gov/planetary/image/isis_1.jpg>) | public domain |

**Credit lines:** `3D model: built by Space Radar from ... published dimensions; compared with ...` (each row's `credit:`).

### Hubble rebuilt, and Webb re-baked, for the physically based look

`hubble.glb` was NASA's (A) file, 7 670 triangles of plain cylinders and two flat plates; it is replaced by a build in code at
flagship detail from cited dimensions and NASA's Servicing Mission 4 photographs (public domain), with (A) used for its proportions
only (its row says so). `jwst.glb` is re-baked from NASA's larger (A) file with its gold mirror segments as their own part (row `jwst`).

| `hubble.glb` (408 KB) | Hubble as it has flown since SM4: silver foil, white NOBL and radiator panels, SA3 wings, door open | NASA's SM4 photographs (Commons, e.g. <https://commons.wikimedia.org/wiki/File:HST-SM4.jpeg>); NASA 3D Resources' Hubble (A) for proportions | public domain |

<!-- 0077 W3-a: end -->
<!-- 0078 r14-m4: begin -->
## 3b-r14-m4. Ten weather and Earth-observation craft built from dimensions (2026-10-27)

Release 1.4.0, stage r14-m4 (public #1114, #1115, #1116, #1117, #1118, #1119, #1112, #1113). **No agency was found to publish a model of any of them under terms that allow a derivative** (a search on 2026-10-27 found none for any of them; NASA's 3D Resources has none; ESA's terms for the pictures on its site, the ESA Standard Licence, allow use for information and education, not an altered model; ISRO's pictures are GODL-India, reproducible with credit and not altered; KARI's photographs are KOGL Type 1). So each file was built in code with the part library from cited numbers. **No agency picture or model is in a file.** The layouts were read off pictures that are free (named below, with credit) and off the pictures the agencies publish under terms that allow looking only (ISRO's, ESA's own), which are on no sheet. The two spinning drums (Meteosat Second Generation and Fengyun-2) are made by ONE builder. No image-to-3D model was used. Their cards say "shape built from published dimensions and pictures; details simplified".

| File | What | What it was drawn from or compared with | Terms |
|---|---|---|---|
| `meteosat-msg.glb` (145 KB) | Meteosat Second Generation (Meteosat-9, -10, -11): a solar drum 3.2 m across and 2.4 m high covered in solar-cell modules, SEVIRI's 0.5 by 0.8 m opening in its side, gold-foil end plates, an antenna stack and mast on the north plate, two thruster cones and the engine's bay on the south | eoPortal, Meteosat Second Generation, https://www.eoportal.org/satellite-missions/meteosat-second-generation, OPENED 2026-10-27: 'The S/C body is a cylindrical-shaped solar drum, 3.2 m in diameter and 3.7 m in height (2.4 m body height)'; 'The solar array is composed of 8 body mounted panels' with '7854 Silicon High Eta cells'; SEVIRI's Earth radiation entry 'a 50 cm x 80 cm aperture'; spin 100 rpm about the north-south axis; the communications payload in the upper compartment.. Compared with, credited, on Wikimedia Commons: EUMETSAT – Model of MSG.jpg (<https://commons.wikimedia.org/wiki/File:EUMETSAT_%E2%80%93_Model_of_MSG.jpg>, Neq00, CC BY-SA 4.0); EUMETSAT MSG model.jpg (<https://commons.wikimedia.org/wiki/File:EUMETSAT_MSG_model.jpg>, public domain); Wetterpark-Offenbach-01.jpg (<https://commons.wikimedia.org/wiki/File:Wetterpark-Offenbach-01.jpg>, diba, CC BY-SA 2.0 de); SEVIRI Instrument.png (<https://commons.wikimedia.org/wiki/File:SEVIRI_Instrument.png>, public domain). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `meteosat-msg` |
| `fengyun-2.glb` (94 KB) | Fengyun-2G and -2H: a solar drum 2.1 m across and 1.6 m high (the same builder as Meteosat Second Generation's), a silver equipment belt, the telescope's window, a cone and a mast to the despun antennas, 4.5 m in all | eoPortal, FY-2, https://www.eoportal.org/satellite-missions/fy-2, OPENED 2026-10-27: 'a diameter of 2.1 m' and the drum 'about 1.6 m (cylinder)'; for FY-2F 'a length of 4.5 m' (FY-2G and -2H 'identical performance parameters as its predecessor'); 'dual spin-stabilized at 100 rpm with a despun antenna platform'; 'Power (280 W) is generated by surface-mounted solar cells'; a 'mechanically despun S-band antenna, and a UHF receive antenna'. Two cited lengths differ (the drum 1.6 m, the whole craft 4.5 m): both are built, the drum 1.6 m and the whole 4.5 m.. Compared with, credited, on Wikimedia Commons: 20090829 Model of Fengyun-2 4002.JPG (<https://commons.wikimedia.org/wiki/File:20090829_Model_of_Fengyun-2_4002.JPG>, Jakubhal, CC BY-SA 4.0). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `fengyun-2` |
| `mtg-i.glb` (74 KB) | Meteosat Third Generation, the imager satellites (Meteosat-12, MTG-I2): a dark-blanketed box, the FCI's white barrel and the LI's four tubes on the Earth face, the Ka-band dish on its boom, two wings of 1.9 by 2.8 m on Y-shaped yokes | ESA, MTG facts and figures, https://www.esa.int/Applications/Observing_the_Earth/Meteorological_missions/meteosat_third_generation/Facts_and_figures, OPENED 2026-10-27: the imager '2.3 x 2.8 x 5.2 m (stowed for launch)', '3800 kg', '2 kW', three-axis stabilised; eoPortal, Meteosat Third Generation, https://www.eoportal.org/satellite-missions/meteosat-third-generation, OPENED 2026-10-27: 'a solar array of 10.7 m2', 'A two-winged satellite configuration', the FCI '1.57 m x 1.72 m x 2.2 m' with a 300 mm pupil, the LI's four channels, 'two hemispherical TT&C antennas', a Ka-band antenna folded at launch on a two-axis pointing mechanism, 'one 400 N apogee engine', '16 10 N thrusters'.. Compared with, credited, on Wikimedia Commons: Meteosat Third Generation ESA418057 (MTG-I cropped).jpg (<https://commons.wikimedia.org/wiki/File:Meteosat_Third_Generation_ESA418057_(MTG-I_cropped).jpg>, ESA, CC BY-SA 3.0 IGO); MTG-I carries two types of imager ESA24625096.png (<https://commons.wikimedia.org/wiki/File:MTG-I_carries_two_types_of_imager_ESA24625096.png>, ESA/Mlabspace, CC BY-SA 3.0 IGO); MTG-I and MTG-S ESA24426397.jpeg (<https://commons.wikimedia.org/wiki/File:MTG-I_and_MTG-S_ESA24426397.jpeg>, ESA/Mlabspace, CC BY-SA 3.0 IGO); EUMETSAT – Model of MTG-I.jpg (<https://commons.wikimedia.org/wiki/File:EUMETSAT_%E2%80%93_Model_of_MTG-I.jpg>, Neq00, CC BY-SA 4.0). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `mtg-i` |
| `mtg-s.glb` (70 KB) | Meteosat Third Generation, the sounder satellite (MTG-S1): the imager's bus and wings with the Infrared Sounder's white box and baffle and the UVN (Sentinel-4) box on the Earth end | ESA, MTG facts and figures, https://www.esa.int/Applications/Observing_the_Earth/Meteorological_missions/meteosat_third_generation/Facts_and_figures, OPENED 2026-10-27: the sounder '2.4 x 3 x 5.2 m (stowed for launch)', '3800 kg', 'Up to 2 kW'; eoPortal, Meteosat Third Generation (read 2026-10-27): 'a solar array of 10.7 m2', two-winged, 'two hemispherical TT&C antennas', a Ka-band antenna on a two-axis pointing mechanism, 'one 400 N apogee engine'.. Compared with, credited, on Wikimedia Commons: Meteosat Third Generation ESA418057 (MTG-S cropped).jpg (<https://commons.wikimedia.org/wiki/File:Meteosat_Third_Generation_ESA418057_(MTG-S_cropped).jpg>, ESA, CC BY-SA 3.0 IGO); MTG-I and MTG-S ESA24426397.jpeg (<https://commons.wikimedia.org/wiki/File:MTG-I_and_MTG-S_ESA24426397.jpeg>, ESA/Mlabspace, CC BY-SA 3.0 IGO); Sentinel-4 on MTG-S ESA24700249.jpeg (<https://commons.wikimedia.org/wiki/File:Sentinel-4_on_MTG-S_ESA24700249.jpeg>, ESA/Mlabspace, CC BY-SA 3.0 IGO); EUMETSAT – Model of MTG-S.jpg (<https://commons.wikimedia.org/wiki/File:EUMETSAT_%E2%80%93_Model_of_MTG-S.jpg>, Neq00, CC BY-SA 4.0). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `mtg-s` |
| `insat-3d.glb` (75 KB) | INSAT-3D, -3DR and -3DS: a gold-blanketed cuboid 1.6 by 2.4 by 1.5 m, the imager and the sounder and two dishes on the Earth face, two white D-shaped cooler scoops on the north face, one wing of two panels of 2.4 by 1.8 m | eoPortal, INSAT-3D, https://www.eoportal.org/satellite-missions/insat-3d, OPENED 2026-10-27: '2060 kg (launch mass), 2.4 m x 1.6 m x 1.5 m'; 'The structure is a cuboid with a central cylinder which accommodates two propellant tanks'; one 'deployable solar panel' producing 1164 W; an imager and a sounder with 310 mm telescopes whose 'EO module is mounted external to the spacecraft'; a passive radiant cooler for each; '0.9 m and 1.0 m body-mounted antennas'; a 440 N apogee motor and twelve 22 N thrusters.. Compared with, credited, on Wikimedia Commons: INSAT 3DR Deployed View.jpg (<https://commons.wikimedia.org/wiki/File:INSAT_3DR_Deployed_View.jpg>, ISRO, GODL-India); INSAT 3DR Stowed View.jpg (<https://commons.wikimedia.org/wiki/File:INSAT_3DR_Stowed_View.jpg>, ISRO, GODL-India); INSAT 3DS in deployed configuration.png (<https://commons.wikimedia.org/wiki/File:INSAT_3DS_in_deployed_configuration.png>, ISRO, GODL-India); INSAT-3DS Satellite.jpg (<https://commons.wikimedia.org/wiki/File:INSAT-3DS_Satellite.jpg>, ISRO, GODL-India). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `insat-3d` |
| `gk2a.glb` (97 KB) | GEO-KOMPSAT-2A: a gold-blanketed box 2.4 by 2.9 by 4.6 m, the AMI under its hood and three gold horns on the Earth deck, one wing of two panels of 2.8 by 3.25 m | Introduction of the Advanced Meteorological Imager of Geo-Kompsat-2a, Remote Sensing 13(7), 1303, https://www.mdpi.com/2072-4292/13/7/1303, OPENED 2026-10-27: 'Launch: 2.9 x 2.4 x 4.6 (m)', 'Orbit: 3.8 x 8.9 x 4.6 (m)' (we read 8.9 m as the north-south span: the 2.4 m body and one wing of two panels of 3.25 m); eoPortal, GEO-KOMPSAT-2, https://www.eoportal.org/satellite-missions/geo-kompsat-2, OPENED 2026-10-27: AMI aperture 270 mm, 'maximum commonality between GK2A and GK2B'.. Compared with, credited, on Wikimedia Commons: 발사체에 장착된 천리안 2A호(1) (1116).jpeg (<https://commons.wikimedia.org/wiki/File:%EB%B0%9C%EC%82%AC%EC%B2%B4%EC%97%90_%EC%9E%A5%EC%B0%A9%EB%90%9C_%EC%B2%9C%EB%A6%AC%EC%95%88_2A%ED%98%B8(1)_(1116).jpeg>, Korea Aerospace Research Institute, KOGL Type 1); 천리안 2A호 최종 점검(1) (1087).jpeg (<https://commons.wikimedia.org/wiki/File:%EC%B2%9C%EB%A6%AC%EC%95%88_2A%ED%98%B8_%EC%B5%9C%EC%A2%85_%EC%A0%90%EA%B2%80(1)_(1087).jpeg>, Korea Aerospace Research Institute, KOGL Type 1); 천리안 2A호 전자파 시험(1) (1058).jpeg (<https://commons.wikimedia.org/wiki/File:%EC%B2%9C%EB%A6%AC%EC%95%88_2A%ED%98%B8_%EC%A0%84%EC%9E%90%ED%8C%8C_%EC%8B%9C%ED%97%98(1)_(1058).jpeg>, Korea Aerospace Research Institute, KOGL Type 1); 천리안 2A 조립 (976).jpeg (<https://commons.wikimedia.org/wiki/File:%EC%B2%9C%EB%A6%AC%EC%95%88_2A_%EC%A1%B0%EB%A6%BD_(976).jpeg>, Korea Aerospace Research Institute, KOGL Type 1). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `gk2a` |
| `gk2b.glb` (96 KB) | GEO-KOMPSAT-2B: the same bus with GEMS's large pale box and GOCI-II on the Earth end, two gold horns, two dark gridded panels on the wall | as `gk2a`: the MDPI paper on GK-2A (https://www.mdpi.com/2072-4292/13/7/1303, OPENED 2026-10-27) '2.9 x 2.4 x 4.6 (m)' launch, '3.8 x 8.9 x 4.6 (m)' orbit, for the bus both satellites share ('maximum commonality between GK2A and GK2B', eoPortal, GEO-KOMPSAT-2, https://www.eoportal.org/satellite-missions/geo-kompsat-2, OPENED 2026-10-27); GK-2B '~3500 kg'; GOCI-II '1.5 m x 1.0 m x 0.9 m' with a 200 mm pupil.. Compared with, credited, on Wikimedia Commons: 천리안위성 2B호 (2) (1262).jpeg (<https://commons.wikimedia.org/wiki/File:%EC%B2%9C%EB%A6%AC%EC%95%88%EC%9C%84%EC%84%B1_2B%ED%98%B8_(2)_(1262).jpeg>, Korea Aerospace Research Institute, KOGL Type 1); 천리안위성 2B호 (1) (1261).jpeg (<https://commons.wikimedia.org/wiki/File:%EC%B2%9C%EB%A6%AC%EC%95%88%EC%9C%84%EC%84%B1_2B%ED%98%B8_(1)_(1261).jpeg>, Korea Aerospace Research Institute, KOGL Type 1); 태양전지판을 전개한 천리안위성 2B호 (1269).jpeg (<https://commons.wikimedia.org/wiki/File:%ED%83%9C%EC%96%91%EC%A0%84%EC%A7%80%ED%8C%90%EC%9D%84_%EC%A0%84%EA%B0%9C%ED%95%9C_%EC%B2%9C%EB%A6%AC%EC%95%88%EC%9C%84%EC%84%B1_2B%ED%98%B8_(1269).jpeg>, Korea Aerospace Research Institute, KOGL Type 1). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `gk2b` |
| `meteor-m2.glb` (54 KB) | Meteor-M No.2, No.2-2, -2-3 and -2-4: a pressurised cylinder 1.4 m across, the instrument deck at the nadir end, two wings of 6.2 by 1.7 m, the radar's bar of seven segments, 7.4 m | eoPortal, Meteor-M No.2, https://www.eoportal.org/satellite-missions/meteor-m-2, OPENED 2026-10-27: 'approximately 5 m in length', '1.4 m in body diameter', '14 m with the two solar arrays deployed', 'a pressurised cylindrical core', 'up to 2 kW'; MTVZA-GY 'mounted on the side of the bus with a 0.65 m rotating antenna'; Severyanin-M's antenna 'comprises seven segments - six of which deploy in orbit'; three KMSS cameras side by side ('210 x 200 x 200 mm').. Compared with, credited, on Wikimedia Commons: Метеор-М №1 Компоновка.jpg (<https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B5%D1%82%D0%B5%D0%BE%D1%80-%D0%9C_%E2%84%961_%D0%9A%D0%BE%D0%BC%D0%BF%D0%BE%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0.jpg>, public domain); Метеор-М №1сложенный.JPG (<https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B5%D1%82%D0%B5%D0%BE%D1%80-%D0%9C_%E2%84%961%D1%81%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9.JPG>, public domain); Meteor-M 2.jpeg (<https://commons.wikimedia.org/wiki/File:Meteor-M_2.jpeg>, CC0); Метеор-М1в полете.JPG (<https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B5%D1%82%D0%B5%D0%BE%D1%80-%D0%9C1%D0%B2_%D0%BF%D0%BE%D0%BB%D0%B5%D1%82%D0%B5.JPG>, public domain). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `meteor-m2` |
| `midori-2.glb` (153 KB) | Midori II (ADEOS-II): two modules of 6 by 4 by 4 m in orange-gold blankets, AMSR's 2 m dish, GLI's black box, SeaWinds' dish, ILAS-II, and ONE paddle 3 by 24 m on a 2 m joint mast | eoPortal, ADEOS-II, https://www.eoportal.org/satellite-missions/adeos-ii, OPENED 2026-10-27: 'Dimension of main S/C body: approximately 6 m x 4 m x 4 m', a single solar array of '50 flexible blankets with a total of 55,680 solar-battery cells' 'extended on a joint mast'; AMSR's '2.0 m offset parabolic antenna'; GLI's 'Elliptic flat mirror ... (600 mm x 260 mm)'; SeaWinds' '1 m diameter rotating dish'; ILAS-II '950 mm x 1670 mm x 600 mm'; POLDER-2 '800 x 500 x 250 mm'. NSIDC, ADEOS-II Platform Description, https://nsidc.org/sites/default/files/adeos-ii20platform20description.pdf, OPENED 2026-10-27: 'Main body dimensions: approximately 6 x 4 x 4 m', 'Solar array paddle dimensions: approximately 3 x 24 m', 5 350 W.. Compared with, credited, on Wikimedia Commons: Adeos2.jpg (<https://commons.wikimedia.org/wiki/File:Adeos2.jpg>, NASA, public domain); Adeos2-annotated.png (<https://commons.wikimedia.org/wiki/File:Adeos2-annotated.png>, Commons contributors, CC BY-SA 3.0). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `midori-2` |
| `resurs-dk1.glb` (56 KB) | Resurs-DK 1: a stack 7.4 m high, the Geoton-L1 camera's 1.56 m tube below a 2.72 m instrument compartment, PAMELA's domed container on an arm, two wings of three panels (36 m2) | eoPortal, Resurs-DK1, https://www.eoportal.org/satellite-missions/resurs-dk1, OPENED 2026-10-27: 'its height is 7.4 m', 'launch mass of about 6570 kg', 'two photovoltaic solar arrays mounted on the compartment's outer surface', 'the solar array span is about 14 m (total solar array size = 36 m2)', Geoton's 'aperture diameter of 50 cm' and 'focal length of 400 cm', PAMELA '123 cm x 70 cm x 70 cm'; Wikipedia, Resurs-DK No.1 (read 2026-10-27): '7.93 x 2.72 m' (we built the 7.4 m and the 2.72 m).. Compared with, credited, on Wikimedia Commons: Resurs DK-1 Model at MAKS-2009.jpg (<https://commons.wikimedia.org/wiki/File:Resurs_DK-1_Model_at_MAKS-2009.jpg>, Vlsergey, CC BY-SA 3.0); Resurs-DK.gif (<https://commons.wikimedia.org/wiki/File:Resurs-DK.gif>, CC BY-SA 2.5). The layout and the sizes not cited are ours | numbers are facts; nothing of any picture is in the file; the shape is this repository's licence: `registry/models.yaml`, row `resurs-dk1` |

**Credit lines:**
`3D model: built by Space Radar from eoPortal's published dimensions; compared with pictures by Neq00 (CC BY-SA 4.0) and Diba (CC BY-SA 2.0 de)`;
`3D model: built by Space Radar from eoPortal's published dimensions; compared with a picture by Jakubhal (CC BY-SA 4.0)`;
`3D model: built by Space Radar from ESA's and eoPortal's published dimensions; compared with pictures by ESA (CC BY-SA 3.0 IGO) and Neq00 (CC BY-SA 4.0)`;
`3D model: built by Space Radar from ESA's and eoPortal's published dimensions; compared with pictures by ESA (CC BY-SA 3.0 IGO) and Neq00 (CC BY-SA 4.0)`;
`3D model: built by Space Radar from eoPortal's published dimensions; compared with pictures by ISRO (GODL-India)`;
`3D model: built by Space Radar from published dimensions; compared with photographs by the Korea Aerospace Research Institute (KOGL Type 1)`;
`3D model: built by Space Radar from published dimensions; compared with photographs by the Korea Aerospace Research Institute (KOGL Type 1)`;
`3D model: built by Space Radar from eoPortal's published dimensions; compared with pictures in the public domain and under CC0`;
`3D model: built by Space Radar from eoPortal's and NSIDC's published dimensions; compared with NASA's picture (public domain)`;
`3D model: built by Space Radar from eoPortal's published dimensions; compared with pictures by Vlsergey (CC BY-SA 3.0) and a line drawing (CC BY-SA 2.5)`

No logo, lettering, flag or insignia is on any of the ten. ESA, EUMETSAT, ISRO, KARI, CMA, JAXA, NASA, Roscosmos, VNIIEM, TsSKB-Progress, the pictures' authors and eoPortal do not endorse Space Radar, and none of them made or approved these shapes.
<!-- 0078 r14-m4: end -->
## 3f. The two photographs — Event Horizon Telescope, CC BY 4.0

`site/images/` holds two pictures, shown on the cards for the only two objects in
`registry/exotics.yaml` that anybody has photographed. They are not illustrations and nothing in
them was redrawn.

| file | object | credit | licence | source |
|---|---|---|---|---|
| `eht-m87.jpg` | M87* | **EHT Collaboration** | CC BY 4.0 | [eso1907a](https://www.eso.org/public/images/eso1907a/), Screensize JPEG 1280×746, downloaded 2026-09-17 |
| `eht-sgr-a.jpg` | Sagittarius A* | **EHT Collaboration** | CC BY 4.0 | [eso2208-eht-mwa](https://www.eso.org/public/images/eso2208-eht-mwa/), Screensize JPEG 1280×1280, downloaded 2026-09-17 |

ESO releases its images under the Creative Commons Attribution 4.0 International licence and asks
that "the full image or footage credit must be presented in a clear and readable manner to all
users, with the wording unaltered"
([ESO copyright](https://www.eso.org/public/outreach/copyright/)). That is why the credit is a
caption under the picture on the card and not a tooltip, why the wording is exactly
*EHT Collaboration*, and why `scripts/check_registry.py` refuses an `image:` row that cannot name
its credit, its licence and where it came from.

**What was changed:** nothing but the choice of size. Both are ESO's own "Screensize JPEG"
downloads, shipped byte for byte.

**In the scene (2026-10-06):** the trip "Black holes" also draws each picture at its black hole's
place while the stop about it is up (`site/js/scene/portraits.js`). The file is the same one; in
the browser its dark sky is taken to black and its edge is faded, so that adding it to the sky
adds the ring and not a rectangle, and it is drawn far larger than it would look from the camera.
The line under the stop says all three and carries the credit and the licence
(`copy/en.js` `trip.portraitLine`).

## 3g. The photographs of the nebulae and galaxies — ESA/Hubble, ESA/Webb, ESO and NOIRLab, CC BY 4.0

`site/images/nebulae/` holds one photograph per row of `registry/nebulae.yaml` (spec 0067), laid
on the sky where its object is by `site/js/scene/nebulae.js`. They come from four outreach
archives whose terms release their images under the Creative Commons Attribution 4.0 International
licence (each terms page, the sentence that grants it and the day it was read are in the registry's
`archives:`; read 2026-10-03, ESA/Webb's on 2026-10-06):

- ESA/Hubble: <https://esahubble.org/copyright/>
- ESA/Webb: <https://esawebb.org/copyright/> (the three James Webb Space Telescope pictures)
- ESO: <https://www.eso.org/public/copyright/>
- NOIRLab: <https://noirlab.edu/public/copyright/>

The terms ask for the credit "in a clear and readable manner to all users, with the wording
unaltered" and not "hidden or disassociated from the image". So each object's card prints its
picture's credit under "About it", linked to the archive's page for that picture, and every credit
is listed here word for word (`scripts/check_registry.py` refuses a row whose credit is not).
No picture is a Digitized Sky Survey composite or from Mellinger's panorama: neither is ours to
redistribute, and the same check refuses a credit that names either.

**What was changed** (CC BY 4.0 asks that changes be indicated): each picture is the archive's own
"screen" JPEG, resized so its longer side is 512 to 768 px, its sky background subtracted to
black, and re-encoded as WebP (`scripts/build_nebulae.py`). In the app its edges are faded, its
brightness follows the exposure control (Eye, Camera, Deep), and it is drawn over our own star
field. The pictures' positions on the sky are measured by us against 2MASS (the archives'
published centres are up to 43 arcminutes off); 2MASS cut-outs are fetched for that comparison by
the build script and are not shipped. This use does not imply endorsement by ESA/Hubble, ESA/Webb,
ESO or NOIRLab.

| file | credit | licence | source | size |
|---|---|---|---|---|
| `m42.webp` | **ESO/G. Beccari** | CC BY 4.0 | [eso1723a](https://www.eso.org/public/images/eso1723a/) | 30 574 B |
| `horsehead-nebula.webp` | **T.A.Rector (NOIRLab/NSF/AURA) and Hubble Heritage Team (STScI/AURA/NASA)** | CC BY 4.0 | [noao0126a](https://noirlab.edu/public/images/noao0126a/) | 19 066 B |
| `m1.webp` | **NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble)** | CC BY 4.0 | [heic0515a](https://esahubble.org/images/heic0515a/) | 59 714 B |
| `m45.webp` | **NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN** | CC BY 4.0 | [noao-m45](https://noirlab.edu/public/images/noao-m45/) | 23 120 B |
| `california-nebula.webp` | **KPNO/NOIRLab/NSF/AURA/Adam Block** | CC BY 4.0 | [noao-n1499block](https://noirlab.edu/public/images/noao-n1499block/) | 46 354 B |
| `rosette-nebula.webp` | **KPNO/NOIRLab/NSF/AURA/N. A. Sharp** | CC BY 4.0 | [noao-rosette](https://noirlab.edu/public/images/noao-rosette/) | 82 326 B |
| `m8.webp` | **ESO** | CC BY 4.0 | [eso0936a](https://www.eso.org/public/images/eso0936a/) | 75 026 B |
| `m20.webp` | **NSF–DOE Vera C. Rubin Observatory/NOIRLab/SLAC/AURA** | CC BY 4.0 | [noirlab2521ah](https://noirlab.edu/public/images/noirlab2521ah/) | 83 114 B |
| `m16.webp` | **ESO** | CC BY 4.0 | [eso0926a](https://www.eso.org/public/images/eso0926a/) | 56 138 B |
| `m17.webp` | **ESO/INAF-VST/OmegaCAM. Acknowledgement: OmegaCen/Astro-WISE/Kapteyn Institute** | CC BY 4.0 | [eso1119a](https://www.eso.org/public/images/eso1119a/) | 89 874 B |
| `cats-paw-nebula.webp` | **ESO** | CC BY 4.0 | [eso1003a](https://www.eso.org/public/images/eso1003a/) | 46 740 B |
| `carina-nebula.webp` | **ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit** | CC BY 4.0 | [eso1250a](https://www.eso.org/public/images/eso1250a/) | 81 256 B |
| `north-america-nebula.webp` | **KPNO/NOIRLab/NSF/AURA/Adam Block** | CC BY 4.0 | [noao-n7000mosblock](https://noirlab.edu/public/images/noao-n7000mosblock/) | 87 104 B |
| `veil-nebula.webp` | **T.A. Rector (University of Alaska Anchorage) and WIYN/NOIRLab/NSF/AURA** | CC BY 4.0 | [noao1209a](https://noirlab.edu/public/images/noao1209a/) | 89 752 B |
| `helix-nebula.webp` | **ESO** | CC BY 4.0 | [eso0907a](https://www.eso.org/public/images/eso0907a/) | 17 794 B |
| `m27.webp` | **T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN and NOIRLab/NSF/AURA)** | CC BY 4.0 | [noao-m27-kpno-mayall-4-m](https://noirlab.edu/public/images/noao-m27-kpno-mayall-4-m/) | 81 292 B |
| `m57.webp` | **NASA, ESA, and C. Robert O’Dell (Vanderbilt University).** | CC BY 4.0 | [heic1310a](https://esahubble.org/images/heic1310a/) | 13 848 B |
| `m31.webp` | **Bill Schoening, Vanessa Harvey/REU program/NOIRLab/NSF/AURA** | CC BY 4.0 | [noao0001a](https://noirlab.edu/public/images/noao0001a/) | 75 680 B |
| `m33.webp` | **ESO** | CC BY 4.0 | [eso1424a](https://www.eso.org/public/images/eso1424a/) | 31 986 B |
| `lmc.webp` | **CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever (Montana State University) Acknowledgment: Image processing: Travis Rector (University of Alaska Anchorage), Mahdi Zamani & Davide de Martin** | CC BY 4.0 | [noirlab2030a](https://noirlab.edu/public/images/noirlab2030a/) | 87 756 B |
| `smc.webp` | **CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever (Montana State University) Acknowledgment: Image processing: Travis Rector (University of Alaska Anchorage), Mahdi Zamani & Davide de Martin** | CC BY 4.0 | [noirlab2030b](https://noirlab.edu/public/images/noirlab2030b/) | 62 348 B |
| `centaurus-a.webp` | **ESO** | CC BY 4.0 | [eso1221a](https://www.eso.org/public/images/eso1221a/) | 45 944 B |
| `m83.webp` | **ESO** | CC BY 4.0 | [eso0825a](https://www.eso.org/public/images/eso0825a/) | 28 778 B |
| `m104.webp` | **NASA/ESA and The Hubble Heritage Team (STScI/AURA)** | CC BY 4.0 | [opo0328a](https://esahubble.org/images/opo0328a/) | 8 388 B |
| `m51.webp` | **NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)** | CC BY 4.0 | [heic0506a](https://esahubble.org/images/heic0506a/) | 20 318 B |
| `m101.webp` | **Image: European Space Agency & NASA** | CC BY 4.0 | [heic0602a](https://esahubble.org/images/heic0602a/) | 32 054 B |
| `m81.webp` | **NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: A. Zezas and J. Huchra (Harvard-Smithsonian Center for Astrophysics)** | CC BY 4.0 | [heic0710a](https://esahubble.org/images/heic0710a/) | 8 680 B |
| `southern-ring-nebula.webp` | **NASA, ESA, CSA, STScI, and the Webb ERO Production Team** | CC BY 4.0 | [weic2207b](https://esawebb.org/images/weic2207b/) | 26 942 B |
| `ngc-1300.webp` | **NASA, ESA, CSA, STScI, J. Lee (STScI), T. Williams (Oxford), PHANGS Team** | CC BY 4.0 | [weic2403e](https://esawebb.org/images/weic2403e/) | 30 646 B |
| `tarantula-nebula.webp` | **NASA, ESA, CSA, and STScI** | CC BY 4.0 | [weic2212a](https://esawebb.org/images/weic2212a/) | 74 048 B |

## 3h. The sky in other light — NASA's WISE, WMAP and Fermi, through CDS HiPS

"Other light" in What to show (`site/js/scene/otherlight.js`, `registry/otherlight.yaml`) draws the
whole sky as three space telescopes mapped it, in false colour. Each band is one picture of the
whole sky shipped from our bucket (`site/images/otherlight/`, baked by
`scripts/build_otherlight.py` from the survey's order-3 HiPS tiles), and, for a survey that goes
deeper, the survey's own tiles streamed from CDS when the field of view is narrow
(`site/js/sky/hips.js`).

| band | survey (HiPS id) | mission and credit | terms | what the colours are | baked file |
|---|---|---|---|---|---|
| Infrared | `CDS/P/allWISE/color` | **NASA/JPL-Caltech/UCLA (WISE)** | [AllWISE release](https://irsa.ipac.caltech.edu/data/WISE/docs/release/All-Sky/) | red 22 µm, green 4.6 µm, blue 3.4 µm | `infrared.webp`, 62 570 B; tiles streamed to order 8 |
| Microwave | `CDS/P/WMAP/W/9yr` | **NASA/WMAP Science Team (LAMBDA)** | [WMAP nine-year maps](https://lambda.gsfc.nasa.gov/product/wmap/dr5/maps_band_r9_i_9yr_get.html) | one band, 94 GHz, as brightness | `microwave.webp`, 186 852 B |
| Gamma rays | `CDS/P/Fermi/color` | **NASA/DOE/Fermi LAT Collaboration** | [Fermi data policy](https://fermi.gsfc.nasa.gov/ssc/data/policy/) | red 0.3 to 1 GeV, green 1 to 3 GeV, blue 3 to 300 GeV | `gamma.webp`, 222 396 B |

**The data** are NASA's: each survey's HiPS `properties` file names NASA's archive as its origin
(`obs_copyright` / `prov_progenitor`: IPAC/NASA, HEASARC/LAMBDA, NASA/HEASARC; read 2026-10-06 and
quoted per band in the registry), and NASA does not claim copyright on its missions' data. NASA
asks to be acknowledged, so the chooser prints the mission's credit under the band, linked to the
mission's page. WISE: "This publication makes use of data products from the Wide-field Infrared
Survey Explorer, which is a joint project of the University of California, Los Angeles, and the Jet
Propulsion Laboratory/California Institute of Technology, funded by the National Aeronautics and
Space Administration." WMAP: "We acknowledge the use of the Legacy Archive for Microwave Background
Data Analysis (LAMBDA), part of the High Energy Astrophysics Science Archive Center (HEASARC)."

**The tiles** are the work of the Centre de Données astronomiques de Strasbourg: every `properties`
file says `hips_copyright = CNRS/Unistra` and `hips_license = ODbL-1.0`. The Open Database License
allows using the tiles and making pictures from them ("Produced Works") with a notice of where they
came from, which is this one: the baked skies **contain information from the HiPS surveys
`CDS/P/allWISE/color`, `CDS/P/WMAP/W/9yr` and `CDS/P/Fermi/color`, made available by CDS under the
ODbL 1.0** (<https://opendatacommons.org/licenses/odbl/1-0/>). This work has made use of CDS HiPS
(Aladin, <https://aladin.cds.unistra.fr/hips/>; Fernique et al. 2015, A&A 578, A114), CDS,
Strasbourg Astronomical Observatory, France. Every tile URL answered `200` with
`Access-Control-Allow-Origin: *` to a request carrying this site's `Origin` on 2026-10-06.

**What was changed.** The order-3 tiles were re-projected from HEALPix to a 2048 × 1024
equirectangular picture in equatorial J2000 and saved as WebP; the shader applies a display stretch
(`gain`). The square patches in the infrared sky near the Galactic centre and its long faint
stripes are the survey's own: WISE's 1.56-degree atlas frames and its scan pattern.

**Not used, and why** (so nobody adds them without new evidence; the list is in the registry's
header): the Digitized Sky Survey and Mellinger's panorama (not ours to use); Planck (`obs_copyright`
"EUROPEAN SPACE AGENCY. ALL RIGHTS RESERVED" on release 3, no licence text found for release 2:
WMAP is NASA's microwave sky); Finkbeiner's H-alpha composite and ROSAT (no licence text found);
GALEX (NASA's, but its order-3 sky is 4.9 MB of survey masks along the Galactic plane).

## 3i. Constellation pictures, borders and other peoples' skies — Stellarium and CDS

Everything here is drawn only in the sky from the ground, and fetched only when a visitor asks for
it (`site/js/sky/skyculture.js`). `scripts/build-skycultures.py` writes every file from sources
read on 2026-10-06; `registry/skycultures.yaml` pins the Stellarium commit
(`a8469197a65de582f6b0ebd82b85173145241b79`) and carries each credit line; `--check` holds the
files, the budgets and these lines together.

| Files | What | Source | Licence, as the source states it | Changes |
|---|---|---|---|---|
| `site/data/skyart/*.webp` (85) | the western constellation figures as drawings | Stellarium, `skycultures/modern/illustrations/` (<https://github.com/Stellarium/stellarium/tree/a8469197a65de582f6b0ebd82b85173145241b79/skycultures/modern>), drawn by Johan Meuris (<http://www.johanmeuris.eu/>) | `description.md`: "Illustrations: Free Art License"; Stellarium's `CREDITS.md`: "Constellation art ... created by Johan Meuris ... License: released under the Free Art License" | each PNG re-encoded as a WebP at its original 128, 256 or 512 px; nothing redrawn, cropped or recoloured |
| `site/data/skyart/index.json` | which constellation each picture belongs to and the three stars that pin it | the same folder's `index.json` ("Text and data: CC BY-SA 4.0"); star places from HYG v4.4 (§3c) | CC BY-SA 4.0 | Hipparcos numbers replaced by J2000 places; pixel positions as fractions |
| `site/data/constellation-bounds.bin` | the IAU constellation borders (Delporte 1930) | CDS catalogue VI/49, *Constellation Boundary Data*, Davenhall A.C., Leggett S.K., Royal Observatory Edinburgh 1989 (<https://cdsarc.cds.unistra.fr/ftp/VI/49/>), file `constbnd.dat` (prepared in 2007 by Bill J. Gray, Project Pluto) | a catalogue CDS distributes for scientific use, with no licence text of its own; the borders themselves are the IAU's definition. Cited, as CDS asks of its catalogues | each border kept once, cut into steps of a degree or less along its B1875 meridian or parallel, precessed to J2000 (IAU 1976), packed as 16-bit pairs. Checked against the catalogue's own J2000 file `bound_20.dat`: every corner within 0.003° |
| `site/data/skycultures/chinese.json` | the traditional Chinese asterisms: lines and names | Stellarium, `skycultures/chinese/` | `description.md`: "CC BY-SA 4.0" | Hipparcos numbers replaced by J2000 places (HYG v4.4); a line through a star HYG does not have is cut there (10 such ends); one name place per figure; no pictures |
| `site/data/skycultures/maori.json` | six Māori figures: lines and names | Stellarium, `skycultures/maori/` | `description.md`: "CC BY-SA 4.0" | the same |
| `site/data/skycultures/hawaiian.json` | the Hawaiian star lines: lines and names | Stellarium, `skycultures/hawaiian_starlines/` | `description.md`: "CC BY-SA 4.0" | the same |

**Credit lines to keep** (the controls show a short form of each beside the culture's name):

- Constellation pictures: Johan Meuris, for Stellarium, Free Art License 1.3
- Chinese sky culture: Karrie Berglund (Digitalis Education Solutions) and Sun Shuwei, for Stellarium, CC BY-SA 4.0
- Māori sky culture: Dan Smale, for Stellarium, CC BY-SA 4.0
- Samoan sky culture: Jake Fitisemanu, with Samoan cultural custodians and published sources; programming by Dan Smale, for Stellarium, CC BY-SA 4.0
- Tongan sky culture: Dan Smale, for Stellarium, CC BY-SA 4.0
- Norse sky culture: Jonas Persson, for Stellarium, CC BY-SA 4.0
- Boorong sky culture: John Morieson and Alex Cherney, for Stellarium, CC BY-SA 4.0
- Hawaiian star lines: after Nainoa Thompson, put into Stellarium by Darren Kamalu, Christopher Blake and the Celestial Navigation class at Kamehameha Schools Kapālama, CC BY-SA 4.0
- Constellation borders: Davenhall and Leggett 1989, CDS catalogue VI/49

**The Free Art License and this repository.** The pictures are free works under a copyleft licence:
they may be copied, distributed and modified provided the licence travels with them, the authors
are named, the originals can be found, and what is made from them stays under the same licence
(articles 2.2 and 2.3, read at <https://artlibre.org/licence/lal/en/> on 2026-10-06). Article 4
allows a work to be part of a larger one that is not under the licence as long as it can still be
got at on its own: here each picture is its own file. So the WebP files are under the Free Art
License and nothing else in the repository is; the notice is `site/data/skyart/LICENSE.txt`, served
beside the pictures, and §6 below. Stellarium's files name the licence without a version; article 9
lets a recipient use the version a work came under or any later one, and 1.3 is the current text.

**The sky cultures are living traditions and documented reconstructions.** Each file is one
contributor's reading, named above: Sun Shuwei's of the Chinese sky after Yi Shitong's catalogue,
Dan Smale's of the better-known Māori names (which differ between iwi), and a class's record of the
star lines Nainoa Thompson taught for sailing Hōkūle‘a. The controls say so in a line under each.
Read on the same day and **not** shipped, because their licences do not allow it alongside the
rest or are missing: `navajo` and `egyptian` (GNU GPL v2.0), `arabic_indigenous` (CC BY-NC-ND 4.0),
`babylonian_mulapin` (CC BY-ND 4.0), `lokono` (no licence section).

**Two more things the sky view reads, and one it could not.** The kind of sky a place is given by
default (City, Town or Dark place) is read off one pixel and its ring in `4k/earth_night.webp`, §2's
Black Marble 2016 map: an estimate from upward light, said as one, and overruled by any choice the
visitor makes (`site/js/sky/skyglow.js`); nothing is sent anywhere. A meteor shower's streaks are
drawn at the rate the observers' formula gives, ZHR × sin(radiant altitude) × r^(limiting magnitude
− 6.5) (Wikipedia, "Zenithal hourly rate", read 2026-10-06), with each shower's entry speed from the
table in Wikipedia's "List of meteor showers" (read the same day; `registry/showers.yaml` `v_kms`).
The International Meteor Organization's own table of population indices could not be read that day
(imo.net was being rebuilt), so one value, r = 2.5, stood in for every shower until §3j.

## 3j. The sky from the ground, round three — AT-HYG, CDS VI/42, the IMO's working list, and a model of the air

Everything here is drawn only in the sky from the ground and fetched only there
(`site/js/sky/`); none of it is on a first visit. Sources read on 2026-10-07.

| Files | What | Source | Licence or terms, as the source states them | Changes |
|---|---|---|---|---|
| `site/data/startiles/n2/*.bin` (48), `n8/*.bin` (768), `index.json` | 435 144 stars to magnitude 10.5 that the HYG files (§3c) do not have, drawn when the field of view has closed far enough to show them | **AT-HYG v4.0**, "Augmented Tycho - HYG", by David Nash (<https://codeberg.org/astronexus/athyg>), subset `data/subsets/athyg_40_reduced_m11.csv.gz`. Its own sources, from its `ACKNOWLEDGMENTS.md`: the Hipparcos and Tycho-2 catalogues (ESA 1997, SP-1200), Gaia DR3 (ESA/Gaia/DPAC), the Yale Bright Star Catalogue, the Gliese-Jahreiss catalogue | README: "This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License" (v3.0 and later) | `scripts/build-startiles.py`: cut at magnitude 10.5; every star within 20 arcseconds and 1.5 magnitudes of one already in `stars.bin` or `skystars-*.bin` left out (104 709); a direction, a magnitude and a B-V each, six bytes, by HEALPix tile (RING, nside 2 and 8) |
| `site/js/sky/constellation.js` (the table inside it) | which of the 88 constellations a point of the sky is in | CDS catalogue VI/42, *Identification of a Constellation From Position*, Nancy G. Roman, PASP 99, 695 (1987) (<https://cdsarc.cds.unistra.fr/ftp/VI/42/>, file `data.dat`): the IAU's borders (Delporte 1930) as 357 rows | a catalogue CDS distributes for scientific use, with no licence text of its own; the borders are a definition, as §3i says of VI/49 | the 357 rows kept as they are, numbers shortened; precession to 1875.0 by the IAU 1976 rotation, as Roman's own program |
| `registry/showers.yaml` (`r`, `active_from`, `active_to`, `sol`, `antihelion`), mirrored to `site/js/data/showers-activity.js` | each shower's population index, activity period and the Sun's longitude at its maximum; the antihelion source | International Meteor Organization, *2027 Meteor Shower Calendar* (IMO INFO(3-26), edited by Jürgen Rendtel), Table 5, "Working List of Visual Meteor Showers" (<https://www.imo.net/ShCal27s.pdf>) | facts, cited; no text or table layout is reproduced | eight of the table's rows and its first (the antihelion source) |

**AT-HYG and Gaia, and what was refused.** The brief for this round named ESA's Gaia archive as
the source for fainter stars. Its terms were read on 2026-10-07
(<https://www.cosmos.esa.int/web/gaia-users/license>,
<https://www.cosmos.esa.int/web/esdc/terms-and-conditions>): data from ESA's science archives are
distributed under **CC BY-NC 3.0 IGO**, with commercial use only by request to ESA. This site ships
nothing under a non-commercial licence (the same rule that left out one sky culture in §3i and two
voices in §9), so nothing was downloaded from the Gaia archive and nothing here is a cut of it.
(Since 2026-10-15 one file is: the LMC's map in §3l, counted from Gaia DR3, which keeps ESA's
non-commercial term.)
AT-HYG is a compilation its author publishes under CC BY-SA 4.0, as he does the HYG database of
§3c; its positions and magnitudes for these stars are Tycho-2's and Hipparcos's, and it uses Gaia
DR3 for distances, which these files do not carry. **If you build something commercial on this
repository, read both sets of terms yourself**: a share-alike compilation does not settle what
ESA's terms mean for the catalogues inside it, and we are not lawyers. Credit to keep wherever
the stars are shown with credits: *Stars: HYG v4.4 and AT-HYG v4.0, David Nash, CC BY-SA 4.0;
from the Hipparcos and Tycho-2 catalogues (ESA).*

*Read again on 2026-10-10 (for the line "deeper stars", internal #547):* AT-HYG's page on Codeberg
(<https://codeberg.org/astronexus/athyg>) still says "This work is licensed under a Creative Commons
Attribution-ShareAlike 4.0 International License" and describes the database as one with "over 2.5
million stars", built on Tycho-2, whose coverage the same page gives as "essentially complete to V = 11,
mostly complete to V = 11.5". So the stars between magnitude 10.5 and 11 are available under the licence
this site already follows; they have not been added (the cut at 10.5 is in `scripts/build-startiles.py`,
and the reduced subset it reads, `athyg_40_reduced_m11`, already stops at 11). Tycho-2 itself: the
Copenhagen page (<https://www.astro.ku.dk/~erik/Tycho-2/>) states no licence and the CDS ReadMe for I/259
(<https://cdsarc.cds.unistra.fr/ftp/I/259/ReadMe>) could not be read through the page fetcher, so Tycho-2
directly is not adopted. Gaia stays out for the reason above.

**The colour of the sky** (`site/js/sky/skyair.js`) is computed, not a picture: sunlight scattered
once by air (Rayleigh) and haze (Mie) with ozone's absorption, using the coefficients the graphics
literature has used since Nishita et al., *Display of the Earth taking into account atmospheric
scattering* (SIGGRAPH 1993), Bruneton and Neyret, *Precomputed atmospheric scattering* (EGSR 2008)
and Hillaire, *A scalable and production ready sky and atmosphere rendering technique* (EGSR 2020),
and Schüler's closed form of the Chapman function (*GPU Pro 3*, 2012). No code of theirs is used.
What that model cannot give (the blue of late twilight, which is light scattered twice) is a drawn
stand-in and the file says where. **The land** (`site/js/sky/landscape.js`) is drawn: hills and
roofs generated from the place's coordinates. Two things in it are read from maps this file
already credits: whether the place is a city (§2's night lights, through the kind of sky) and in
which directions there is open water within 25 km (§2's Earth water mask, Solar System Scope,
CC BY 4.0, read in the visitor's browser; the place is never sent anywhere). **A shower's rate
away from its peak** (`site/js/sky/meteors.js`) is a model: the IMO lists no slopes, so the curve
is a two-sided exponential from the peak's ZHR to one an hour on the activity period's first and
last day (the form is Jenniskens, *Meteor stream activity I*, A&A 287, 990, 1994; the slopes are
ours). The antihelion source is drawn as the IMO lists it; the random background is not drawn.

## 3k. Point your phone — the World Magnetic Model 2025, NOAA NCEI and the British Geological Survey, public domain

"Point your phone" (`site/js/sky/pointing.js`, internal #450) turns a phone's compass heading,
which is from magnetic north, into one from true north with the magnetic declination at the
visitor's place.

| | |
|---|---|
| What | The World Magnetic Model WMM2025: 90 rows of Gauss coefficients and their yearly change, degree and order 1 to 12, valid 2025.0 to 2030.0 |
| Who | Produced for the US National Geospatial-Intelligence Agency and the UK Defence Geographic Centre; developed jointly by NOAA's National Centers for Environmental Information (NCEI) and the British Geological Survey (BGS) |
| Files | `registry/wmm/WMM2025.COF` (NOAA's `WMM.COF`, unchanged, header `2025.0 WMM-2025 11/13/2024`) and `registry/wmm/WMM2025_TEST_VALUES.txt` (NOAA's test values); `site/js/data/wmm2025.js` is generated from the first by `scripts/gen_wmm_js.py` |
| From | <https://www.ncei.noaa.gov/products/world-magnetic-model> (the coefficient file `WMM2025COF.zip` and `WMM2025_TEST_VALUES.txt`), fetched 2026-10-08 |
| Licence, as read on that page on 2026-10-08 | "The WMM source code is in the public domain and not licensed or under copyright. The information and software may be used freely by the public." The page asks that works made predominantly of US government material say so (17 U.S.C. 403): this section is that notice. The coefficients are US government material and are not subject to copyright protection. |
| Cite, as the page asks | Chulliat, A., W. Brown, M. Nair, N. Gomez Perez, L.-Y. Young, C. Watson, N. Boneh, C. Beggan, B. Meyer and M. Paniccia, 2025. The US/UK World Magnetic Model for 2025-2030: Technical Report, National Centers for Environmental Information, NOAA. <https://doi.org/10.25923/prbc-s316>. The model itself: NOAA NCEI and the British Geological Survey, 2024, World Magnetic Model 2025, <https://doi.org/10.25921/aqfd-sd83>. |
| What we do with it | Sum the series ourselves (`declinationDeg`, the model's own recipe) for one place and today's date. `tests/test_pointing.mjs` holds the result to 0.011 degree of all twelve published test values. Nothing is fetched at run time and the place is sent nowhere. |
| What it is not | A measurement at the visitor's spot. The model is the Earth's main field: it knows nothing of the steel in a building, a car or a phone case, which indoors can turn a compass by tens of degrees. The switch says so, and "Line it up" is the remedy. After 2030.0 the last year's value is held; the next model replaces the file. |

## 3l. Deep space heroes — the numbers each object is built from (internal spec 0075)

Deep space is rebuilt in stages (internal spec 0075): a foundation, then one hero at a time. **One
sub-heading per stage below; each stage writes only under its own.** (Spec 0075's design calls this
"§3h"; that number was already the other-light skies', so it is 3l.)

### Foundation (stage a): distances, viewing angles and shapes

Facts read from each paper's abstract on 2026-10-14 and written into `registry/dso-hand.yaml` with
the paper beside them; no text, figure or image of any paper is shipped.

| object | what | from |
|---|---|---|
| Large Magellanic Cloud | distance 49.59 ± 0.09 (statistical) ± 0.54 (systematic) kpc, from twenty eclipsing binaries | Pietrzyński et al. 2019, Nature 567, 200 (arXiv:1903.08096) |
| Large Magellanic Cloud | disc inclination 34.7 ± 6.2°, line of nodes 122.5 ± 8.3° | van der Marel & Cioni 2001, AJ 122, 1807 (arXiv:astro-ph/0105339) |
| Large Magellanic Cloud | outer isophotes: ellipticity 0.199 ± 0.008 at position angle 189.3 ± 1.4° (the photograph's fade) | van der Marel 2001, AJ 122, 1827 (arXiv:astro-ph/0105340) |
| Small Magellanic Cloud | distance 62.44 ± 0.47 (statistical) ± 0.81 (systematic) kpc, from eclipsing binaries | Graczyk et al. 2020, ApJ 904, 13 (arXiv:2010.08754) |
| Helix Nebula | distance 655 ± 13 ly, the central star's parallax | Gaia DR2 (Gaia Collaboration 2018, VizieR I/345), as quoted by the Helix Nebula's Wikipedia page |
| Tarantula Nebula, M43 | no distance of their own: placed at their parent's (the LMC, M42) | `parent:` in the registry |

The gas of a deep-sky object drawn close up (`site/js/scene/deep/gasmat.js`) is computed here, from the
same glow profiles and colours as `scene/dsoglow.js`; its noise is generated from a fixed seed. Both are
illustrations, and the card says so.

### The Helix (stage b)

The Helix's reconstruction (`site/js/scene/deep/helix.js`, its numbers in
`registry/deepsky-heroes/helix.yaml`) is computed here from facts read in each source on 2026-10-15;
no text, figure, image or model file of any of them is shipped. The sizes are the papers' arcseconds,
turned into light-years at the registry's distance (655 ly, the Gaia parallax above).

| what | the numbers | from |
|---|---|---|
| the inner disc and the outer ring | an inner disc 499″ across and about 100″ thick, tilted 23° out of the plane of the sky, near side toward position angle 288°; an outer ring (a torus) 742″ across, tilted 53°, near side toward 168°, "almost perpendicular to the inner-disk" | O'Dell, McCullough & Meixner 2004, AJ 128, 2339 (arXiv:astro-ph/0407556) |
| the alternative | the outer ring may instead be lobes perpendicular to the inner disc; the card says so | O'Dell 2005, RevMexAA (SC) (arXiv:astro-ph/0505539) |
| the interpretation | "two gas disks nearly perpendicular to each other"; the animation by NASA, ESA and A. Feild (STScI) is read, not shipped | NASA Science, Helix Nebula with annotated features; NASA, Helix Nebula (both read 2026-10-15) |
| the knots | about 23 000 (NICMOS); found 2.2′ to 6.4′ from the star; heads at least twice the Solar System, tails about 1 000 au, pointing away from the star. 500 to 1 600 are drawn on the inner rim, at those radii and sizes; their places are seeded, not catalogued, and under 2.2 px their darkness is exaggerated so they can be seen | Meixner et al. 2005, AJ 130, 1784 (arXiv:astro-ph/0509887); Matsuura et al. 2009, ApJ 700, 1067 (arXiv:0906.2870); O'Dell & Handron, STScI news release 1996-13 |
| the white dwarf | about 100 000 K (103 600 ± 5 500 K; later fits 110 000 to 120 000 K): its colour is a blackbody's | Napiwotzki 1999 and Traulsen et al. 2005, as quoted by Marshall et al. 2023, AJ (doi:10.3847/1538-3881/ac9d90, arXiv:2211.02251) |
| the light | the reconstruction's light IS the photograph the app already shows, its stars removed (`scripts/build_deep_helix.py` -> `site/images/deep/helix/helix-light.webp`, 8.6 kB, an adaptation): each ring glows with the picture's colour where it covers the sky as seen from the Sun. The inner disc's projected axis (position angle 290°, axis ratio 0.88) was measured from it too | ESO eso0907a, credit ESO, CC BY 4.0 (section 3 above): "ESO"; stars removed by Space Radar |

Under the Deep exposure the light takes the photograph's own Deep stretch (lifted and saturated:
ENHANCED, and the registry says so). Which ring each part of the picture's light belongs to, the
rings' thickness and crisp faces, and the fine radial streaks under the Film look are illustrations
shaped to the sources above. The card says its light is the photograph's and its shape the paper's,
that the knots are placed at their measured distances, and that no astronomer has reviewed it yet.

### The Large Magellanic Cloud and the Tarantula (stage c)

The LMC's 3D model (`site/js/scene/deep/lmc.js`, profile `registry/deepsky-heroes/lmc.yaml`) is built
from star counts, catalogued positions and published geometry. No image of any paper is shipped.

| what | from | licence |
|---|---|---|
| `site/data/deep/lmc-density.bin`: two maps of the LMC's stars on the sky (all members; young blue stars), counted from Gaia DR3 by `scripts/build_deep_lmc.py` (anonymous queries of the Gaia archive, 2026-10-15) | ESA/Gaia/DPAC; Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1. The member cuts follow the manner of Gaia Collaboration, Luri et al. 2021, A&A 649, A7 | CC BY-NC 3.0 IGO: "Gaia data are distributed under the CC BY-NC 3.0 IGO license." (<https://www.cosmos.esa.int/web/gaia-users/license>, read 2026-10-16; commercial use: ESA's terms, <https://www.cosmos.esa.int/web/esdc/terms-and-conditions>); the derived map keeps the same licence |
| Positions of 21 H II regions (Henize 1956 numbers) and of the cluster R136 | SIMBAD (Wenger et al. 2000, A&AS 143, 9), CDS, Strasbourg, read 2026-10-15 | facts, credited |
| The disc's tilt 34.7° and line of nodes 122.5°; the scale length 1.3–1.5 kpc; the outer ellipse | van der Marel & Cioni 2001, AJ 122, 1807; van der Marel 2001, AJ 122, 1827 | facts, cited |
| The disc's thickness (the old stars' scale height from their V/σ) | van der Marel, Alves, Hardy & Suntzeff 2002, AJ 124, 2639 | facts, cited; the young stars' thickness is illustrative |
| The Tarantula's colour along our line (within 25° of the line it was taken along): its photograph, already shipped | NASA, ESA, CSA, and STScI (ESA/Webb weic2212a, the photograph's own row above) | CC BY 4.0 |
| The Tarantula's shape: R136 in a cavity, warm gas in a shell confined by molecular gas, mapped to 75 pc | Pellegrini, Baldwin & Ferland 2011, ApJ 738, 34; Pellegrini et al. 2010, ApJS 191, 160 | facts, cited; the shell's radius and width are a model |

Space Radar is free and non-commercial; files derived from Gaia data keep ESA's non-commercial term and
are not for commercial reuse.

The stars' depths, their brightness, the dust and the Tarantula's gas in depth are a model, and the card
says so. The colours of the gas are enhanced (hydrogen-alpha pink, [O III] teal), declared in the profile.

### Andromeda and the Triangulum Galaxy (stage d)

Andromeda (M31) and the Triangulum Galaxy (M33) close up, and Andromeda off her photograph's line at any
distance, are a **model** (`site/js/scene/deep/spiral.js`): statistical points generated in the browser from
a fixed seed and the numbers in `registry/deepsky-heroes/m31.yaml` and `m33.yaml`, where each is marked
published, `assumed` or `illustrative`. No image or data file is used or copied; the facts are cited.

| what | number | source |
|---|---|---|
| M31's bulge and disc | Sersic n = 2.2 ± 0.3, Re = 1.0 ± 0.2 kpc; exponential disc, Rd = 5.3 ± 0.5 kpc | Courteau et al. 2011, ApJ 739, 20 (arXiv:1106.3564) |
| M31's ring and arms | a ring of star formation of radius about 10 kpc, offset from the nucleus and split near M32; two arms in segments | Gordon et al. 2006, ApJ 638, L87 (arXiv:astro-ph/0601314) |
| M31's inner dust ring | projected 1.5 × 1 kpc, offset about 0.5 kpc | Block et al. 2006, Nature 443, 832 (arXiv:astro-ph/0610543) |
| M31's dust rings | R = 5.6 and 15.1 kpc | Draine et al. 2014, ApJ 780, 172 (arXiv:1306.2304) |
| M31's tilt | position angle 38°, inclination 77° | de Vaucouleurs 1958, ApJ 128, 465, as later work adopts it |
| M31's rotation | the south-western half approaches (the arms trail) | Rubin & Ford 1970, ApJ 159, 379 |
| deprojected bulge | the Sersic constants b_n and p | Prugniel & Simien 1997, A&A 321, 111; Lima Neto, Gerbal & Márquez 1999, MNRAS 309, 481 |
| M31's tilt, reconciled (0076 W4-a) | the record now carries the hero's 38° and 77°, NW side near (`scripts/data/messier-overlay.yaml`); OpenNGC's 35° stays the photograph's frame | as above |
| M32's profile (0076 W4-a) | Sersic n = 1.5, Re = 27″ (about 100 pc), drawn as Sersic points; its shape on the sky is OpenNGC's ellipse, its flattening assumed | Graham 2002, ApJ 568, L13 (arXiv:astro-ph/0202307), abstract read 2026-10-20 |
| M110's profile (0076 W4-a) | illustrative: no profile of NGC 205 was read; n 1.5 as M32's, Re 0.35 of the catalogue's semi-major axis | none, said so in the profile |
| M33's tilt | inclination 56° (position angle 23° is the OpenNGC row's) | Zaritsky, Elston & Hill 1989, AJ 97, 97, as cited |
| M33's disc | K-band scale length about 1.4 kpc; a bulge contested | Regan & Vogel 1994, ApJ 434, 536, as cited |
| NGC 604's place | RA 01h 34m 32.1s, Dec +30° 47′ 01″ (ICRS) | SIMBAD (CDS), read 2026-10-14 |

The pictures of both galaxies along our line of sight stay the photographs credited in section 3 (NOIRLab
noao0001a, ESO eso1424a).

### The cosmos: the local volume and the horizon (stage e)

- **The local volume's galaxies** (`site/data/deep/localvolume.bin` and `.json`, built by
  `scripts/build_deep_localvolume.py`): the Updated Nearby Galaxy Catalog, Karachentsev I.D., Makarov
  D.I., Kaisina E.I. 2013, *Astronomical Journal* 145, 101 (American Astronomical Society), read from
  the CDS archive as VizieR catalogue J/AJ/145/101 (its ReadMe, table1 and table6) on 2026-10-14,
  pinned by SHA-256 in the build script. "This research has made use of the VizieR catalogue access
  tool, CDS, Strasbourg, France." The terms, as the VizieR licence page read that day
  (https://cds.unistra.fr/vizier-org/licences_vizier.html): the data "are free of usage in a scientific
  context", with the original authors and the publication cited, which this line does. Space Radar is
  free and non-commercial. 800 of its 869 galaxies are drawn (the Milky Way and the 68 the map already
  draws as deep-sky records are left out); the distance ranges of rows without a published error, and
  the colours by type, are this map's (the manifest says which). The credit line:
  Nearby galaxies: the Updated Nearby Galaxy Catalog (Karachentsev, Makarov & Kaisina 2013), via VizieR, CDS
- **The cosmology** (`site/js/data/cosmology.js`): Planck Collaboration, "Planck 2018 results. VI.
  Cosmological parameters", *Astronomy & Astrophysics* 641, A6 (2020), Table 2, as Astropy's
  `Planck18` takes it. The reference values its test holds it to were computed once with Astropy
  6.0.1 (Astropy Collaboration, BSD 3-Clause) and SciPy 1.13.1 (BSD 3-Clause), offline
  (`scripts/cosmology_reference.py`, `tests/fixtures/cosmology_astropy.json`); neither ships.
- **The horizon's explanation** follows NASA, "How Big is Space? We Asked a NASA Expert: Episode 61"
  (2025-05-21, https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/):
  "the observable universe is about 92 billion light-years across". Words only; nothing of NASA's is
  drawn.

### Orion (0076 W1-a)

The Orion Nebula's reconstruction (`site/js/scene/deep/orion.js`, its numbers in
`registry/deepsky-heroes/orion.yaml`) is computed here from facts read in each source on 2026-10-15; no text,
figure or model file of any of them is shipped. Lengths on the sky are turned into light-years at the record's
distance (1 344 ly). Its shape away from the Trapezium is **reconstructed** and the card says so.

| what | the numbers | from |
|---|---|---|
| the blister | a thin layer of ionised gas near the ionisation front on the near side of the molecular cloud OMC-1, its depth found from the H-alpha surface brightness with theta1 Ori C the only ionising star; the Bright Bar where the front turns toward us | Wen & O'Dell 1995, ApJ 438, 784; O'Dell 2001, ARA&A 39, 99 |
| theta1 Ori C before the front | about 0.2 pc (0.65 ly) in front of the main ionisation front; the concave blister, revised to the south-west (Orion-S, not drawn) | O'Dell, Henney, Abel, Ferland & Arthur 2009, AJ 137, 367 (arXiv:0810.4375) |
| the Veil | neutral gas 1 to 3 pc in front of the star, drawn at 2 pc; its closest layer 1.3 pc from it. The Dark Bay is drawn as the Veil's shadow: its optical depth is the photograph's darkness against its surroundings there (reconstructed) | Abel et al. 2004, ApJ 609, 247 (arXiv:astro-ph/0404399); Abel, Ferland & O'Dell 2019, ApJ (arXiv:1906.07779) |
| the cluster | a core radius of 0.16 to 0.21 pc, elongated north-south; ellipticity 0.30 about 10 degrees from north-south. 400 to 1 600 stars are drawn; their places and brightnesses are seeded, not catalogued | Hillenbrand & Hartmann 1998, ApJ 492, 540; Da Rio et al. 2014 (arXiv:1409.2503) |
| the Trapezium, theta2 Ori A and NU Ori | places, V magnitudes and spectral types of theta1 Ori A, B, C, D (HD 37020 to 37023), theta2 Ori A (HD 37041; its V from Hipparcos via HYG) and NU Ori (HD 37061); their depths are not measured, so they stand in theta1 Ori C's plane | SIMBAD, CDS (https://simbad.cds.unistra.fr/), read 2026-10-15; the CDS terms ask the data be cited as "CDS/SIMBAD" |
| the light | the reconstruction's light IS the photograph the app already shows, its stars removed (`scripts/build_deep_orion.py` -> `site/images/deep/orion/orion-light.webp`, an adaptation); near the Trapezium a sharper map of the same photograph, from ESO's large JPEG (16 877 x 13 107 px, downloaded for the bake and not shipped): a 13 arcmin square at 1.1" a pixel, its stars removed and its colours matched to the 640 px map (`site/images/deep/orion/orion-detail.webp`, an adaptation); the front's depth map (`site/data/deep/orion-front.bin`) is computed from the same picture and the numbers above. Under Deep the photograph's own stretch is ENHANCED | ESO eso1723a, credit ESO/G. Beccari, CC BY 4.0 (section 3 above): "ESO/G. Beccari"; stars removed and depth reconstructed by Space Radar |

### The CMB map (0076 W1-b)

- **The microwave background at the horizon** (`site/images/deep/cmb/wmap-ilc-9yr.webp`, 119 400 B,
  built by `scripts/build_deep_cmb.py`, drawn by `site/js/scene/deep/cmb.js`): the WMAP nine-year
  Internal Linear Combination map, `wmap_ilc_9yr_v5.fits` from LAMBDA
  (<https://lambda.gsfc.nasa.gov/product/wmap/dr5/ilc_map_get.html>), pinned by SHA-256; Bennett et al.
  2013, "Nine-year Wilkinson Microwave Anisotropy Probe (WMAP) observations: final maps and results",
  *ApJS* 208, 20, section 6. NASA data: "NASA content – images, audio, video, and media files used in
  the rendition of 3-dimensional models, such as texture maps and polygon data in any format –
  generally are not subject to copyright in the United States"
  (<https://www.nasa.gov/nasa-brand-center/images-and-media/>, read 2026-10-15). LAMBDA's
  acknowledgement is the one in section 3h. The credit line: **Microwave background: NASA / WMAP
  Science Team (LAMBDA)**. Measured: the temperature in each direction of our sky, smoothed to one
  degree, average and dipole removed, re-gridded to 1024 x 512 in Galactic coordinates and clipped at
  ±200 µK (0.45 % of the sky). This map's own: the colour scale. An illustration, and labelled so on
  the scene: the map painted on the sphere its light left from (`data/cosmology.js cmbLy()`), seen
  from anywhere but the Sun. Planck's sharper map was not used: ESA's page for it gives "Licence: ESA
  Standard Licence", not CC BY-SA 3.0 IGO (read 2026-10-15).

### LOLA, LROC traverses (0076 W2-a)

Release 1.2.0 stage W2-a (internal spec 0076, internal #864, #868, #917). Nothing here is stored at boot;
each piece is fetched or drawn only close to the Moon or beside the station.

**Shadows cast from the Moon's heights.** `site/js/scene/tiles.js` reads Lunar Orbiter Laser Altimeter
elevations from NASA's Solar System Treks (`LRO_LOLA_DEM_Global_128ppd_v04`, levels 0 to 5, grey PNG,
one byte a texel, the visitor's browser asking as for the map tiles of §4.16) and marches toward the Sun
in them: the shadows of crater rims, peaks and massifs at a low Sun are cast from the measured ground,
true scale. The byte was turned into metres by a fit to the 44 surveyed objects of LROC's 2016 table
(Wagner et al. 2017), 77.31 m a byte above -9101.7 m, 18.5 m rms (`registry/tilesets.yaml`). LOLA is
archived at the PDS Geosciences Node, whose FAQ says "Data sets archived in the PDS are in the public
domain" (https://pds-geosciences.wustl.edu/faq.html, read 2026-10-16). Credit, in the Sources panel while
the shadows are drawn:

> The Moon's shadows close up: cast from Lunar Orbiter Laser Altimeter heights, LOLA Science Team, NASA/GSFC, from NASA Solar System Treks

**The rover traverses of Apollo 15 and 17.** `site/js/scene/traverse.js` draws the lines the PDS Geosciences
Node (Washington University in St. Louis) serves with its Apollo Analyst's Notebook station finders, read
2026-10-16 by `scripts/build_traverses.py` into `registry/traverses/`: Apollo 15's "from Phil Stooke,
University of Western Ontario ... created by tracing tracks visible in the LROC data as well as using
surface photos and descriptions", Apollo 17's "created by tracing tracks visible in the LROC data" (the
finder pages' words). Terms: the Analyst's Notebook layers carry no separate terms; they are distributed
by the NASA PDS Geosciences Node as NASA PDS archive data, under NASA's open data policy (the Node's FAQ:
"Data sets archived in the PDS are in the public domain"). Credited as "NASA PDS Geosciences Node,
Analyst's Notebook". Credits, in the Sources panel while each is drawn:

> Apollo 15's rover traverse: traced by Phil Stooke (University of Western Ontario) from LROC images; NASA PDS Geosciences Node, Analyst's Notebook

> Apollo 17's rover traverse: traced from LROC images; NASA PDS Geosciences Node, Analyst's Notebook

**Huygens on Titan** (`registry/sites.yaml`, a coordinate, not yet drawn): 10.573 S, 192.335 W from the
Huygens Descent Trajectory Working Group's 2010 trajectory, as Atkinson, Kazeminejad and Lebreton give it
(EGU General Assembly 2015, abstract EGU2015-162-2, CC Attribution 3.0).

**The red of the station's sunrise** (`site/js/scene/shadow.js` AIR_REDDENING) is modelled, not observed:
Rayleigh scattering of a single exponential atmosphere along the grazing line to the Sun, with the
column's optical depths from Hansen and Travis (1974, Space Science Reviews 16, 527). No image is used.

<!-- 0077 W3-d: begin -->
### Mars traverses, Titan's Huygens, named lunar places, small-body shapes (0077 W3-d)

Release 1.3.0 stage W3-d (internal spec 0077, internal #864, #866, #868). Nothing here is fetched at boot.

**The traverses of Spirit and Opportunity.** `site/js/scene/traverse.js` draws, on Mars as on the Moon, the
rover lines the PDS Geosciences Node (Washington University in St. Louis) serves with its Mars Exploration
Rover Analyst's Notebooks (`MER/merApubmap` layer `merATraverse`, `MER/merBpubmap` layer `merbTraverse`),
read 2026-10-20 by `scripts/build_traverses.py` into `registry/traverses/`. Spirit's line is 7.07 km, from
Columbia Memorial Station to Home Plate and Troy; Opportunity's 45.10 km, from Eagle crater to Perseverance
Valley on the rim of Endeavour. The node does not say on the service how its lines were made, and the app does
not either. Terms: as for the Apollo lines above (the Node's FAQ: "Data sets archived in the PDS are in the
public domain"). Credits, in the Sources panel while each is drawn:

> Spirit's traverse in Gusev crater: the rover's path as the Spirit Analyst's Notebook maps it; NASA PDS Geosciences Node

> Opportunity's traverse across Meridiani Planum: the rover's path as the Opportunity Analyst's Notebook maps it; NASA PDS Geosciences Node

**Huygens on Titan** is drawn since this stage, at the coordinate above, on Titan's fixed frame (its tidal
lock), as the procedural lander the card calls "the kind of thing, not this exact one".

**The Moon's named places** (`registry/sites.yaml`, `class: feature`): Copernicus, Tycho and Shackleton at the
centres the IAU Gazetteer of Planetary Nomenclature gives (USGS Astrogeology, planetarynames.wr.usgs.gov,
read 2026-10-20), and the south pole. Numbers, no picture.

**Ryugu, Itokawa, Didymos and Dimorphos** (the small-bodies table above): each simplified by quadric error to
1 000 to 4 800 triangles by `scripts/small-body-glb.py`, in its body's own axes, and turned by the rotation
model its mission published: Ryugu by JAXA's SPICE constants (`ryugu_v10.tpc`), Itokawa by the pole and rate
in Gaskell's bundle, Didymos by the DART team's (`didymos_system_15.tpc`, NASA/NAIF and JHU/APL). Dimorphos goes
round Didymos at 1.152 km in 11.3674 h, the post-impact values of Richardson et al. 2024 (PSJ 5:182, Table 2);
where it is on that orbit is illustrative, and so is the phase of every turn. The ISAS Data Policy
(https://www.isas.jaxa.jp/en/researchers/data-policy/, read 2026-10-20) names shape models among its open data,
says they "can be used free of charge, either for commercial or non-commercial purposes. They may be copied,
forwarded or modified", asks that the origin be given as "ISAS/JAXA", and calls its terms "compatible with
Creative Commons BY 4.0". NASA's science data licence (https://science.data.nasa.gov/about/license): data "from
a NASA-led mission ... are licensed as Creative Commons Zero" (DART).
<!-- 0077 W3-d: end -->

### Ring and spot data (0076 W2-b)

No picture or file is added: these are numbers, each typed into the code with its source beside it.

- **Uranus's and Jupiter's rings.** Radii, widths, optical depths and albedos from NASA's NSSDCA ring
  fact sheets (D. R. Williams), <https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html> and
  <https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupringfact.html>, and the planets' geometric albedos
  from <https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html> and `jupiterfact.html`, read
  2026-10-16. A NASA page; NASA's media guidelines: NASA content "generally [is] not subject to copyright
  in the United States". Drawn by `scene/worlds.js` (`URANUS_RINGS`) and `scene/weather/worldweather.js` (`GIANT_RINGS`).
- **The Great Red Spot's place and drift.** The British Astronomical Association's Jupiter Section (John
  Rogers), "Jupiter in 2025/26, Report no.4" (2025 Dec. 31), reporting the JUPOS team's and Shinji
  Mizumoto's measurements: L2 = 79 on 2025 Dec. 1 and a drift of +0.8 deg/30d from March to November;
  and "Jupiter in 2024/25, Report no.7" (2026 Jan.): +1.78 deg/30d over that apparition.
  <https://britastro.org/wp-content/uploads/2025/12/Jup_2025dec_Report-no-4.pdf>, read 2026-10-16. Three
  measured numbers, cited; two short passages of the reports are quoted, with this attribution, in the
  row's comment in `registry/weather.yaml`, and none of their figures is reproduced. The ±1° on that
  L2 is assumed, not the reports'. System II's rotation,
  W = 43.3 + 870.270 d, is the IAU/IAG working group's (Davies et al. 1980, Celestial Mechanics 22, 205).
  Row `jupiter-bands` in `registry/weather.yaml`; drawn by `scene/weather/worldweather.js`.

### Plume observations (0076 W2-c)

The plumes on Io, Enceladus and Triton (`registry/plumes.yaml`, drawn by `site/js/scene/plumes.js`) are
numbers, not images: each plume's place, its height and who saw it when. No picture is copied.

- **Places**: the IAU/USGS Gazetteer of Planetary Nomenclature (planetarynames.wr.usgs.gov): Prometheus,
  Pillan Patera, Tvashtar, and Enceladus's Alexandria, Cairo, Baghdad and Damascus sulci. "USGS-authored
  or produced data and information are considered to be in the U.S. Public Domain" (usgs.gov, Copyrights
  and Credits). Pele's and Loki Patera's from Wikipedia's articles, which cite the gazetteer.
- **Heights and dates**: NASA/JPL captions PIA00703 (Galileo, Prometheus 75 km and Pillan 140 km, 28 June
  1997), PIA09359 (New Horizons, Tvashtar about 330 km, 2007), PIA07762 (Cassini, Enceladus's plume "at least
  as tall as the moon's diameter", November 2005) and the release of 28 July 2014 (101 geysers, Porco et
  al. 2014); Pele's 300 km (Voyager 1, March 1979; Strom et al. 1979, Nature); Triton's 8 km columns and
  clouds carried over 100 km (Voyager 2, August 1989; Soderblom et al. 1990, Science 250, USGS abstract)
  and their places (Hofgartner et al. 2022, arXiv:2112.04627). Facts and numbers; NASA's captions are
  "generally not subject to copyright in the United States" (NASA media usage guidelines).
- **Gravity**: GM and mean radii from JPL Solar System Dynamics, Planetary Satellite Physical Parameters.
- The grains' arcs, the stripes' straight lines, the jets' places along them, the light's stretch and
  the hot spots' brightness are ours (modelled, reconstructed or illustrative; the card says which).

### Clusters (0076 W3-a)

Star clusters drawn as stars (`scene/deep/globular.js`, internal #819 and #871), from two catalogues read through
VizieR by `scripts/build_deep_clusters.py` on 2026-10-16 into `site/data/deep/clusters.json` and
`site/data/deep/clusters.bin`. "This research has made use of the VizieR catalogue access tool, CDS, Strasbourg,
France." The terms, as the VizieR licence page read that day (<https://cds.unistra.fr/vizier-org/licences_vizier.html>):
"The data retrieved with VizieR are free of usage in a scientific context ; however, as it is the usage in
scientific publication, the original authors and publication references including the publisher have to be
explicitely cited", and tables from A&A "are free for a scientific usage". Space Radar is free and non-commercial.

| what | from | licence |
|---|---|---|
| The 33 globular clusters' core radii, concentrations (so their tidal radii), integrated V magnitudes, metallicities, horizontal-branch ratios and magnitudes (`clusters.json`, `globulars`) | Harris W.E. 1996, AJ 112, 1487, *A Catalog of Parameters for Globular Clusters in the Milky Way*, VizieR VII/202 | VizieR's terms above; facts, cited |
| The globulars' stars: placed by King's density in space for that core and tidal radius | King I. 1962, AJ 67, 471 (eq. 27) | a published model, cited; the placing is seeded and is ours |
| 23 685 members of 36 open clusters, each with its Gaia DR3 direction, parallax, G magnitude, BP−RP colour and membership probability (`clusters.bin`; kept: probability at least 0.5, inside the tidal radius; less the stars the map's own catalogue draws) | Hunt E.L. & Reffert S. 2023, A&A 673, A114, *Improving the open cluster census. II.*, VizieR J/A+A/673/A114; the measurements are ESA/Gaia/DPAC's, Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 | VizieR's terms above, and Gaia's: "Gaia data are distributed under the CC BY-NC 3.0 IGO license." (<https://www.cosmos.esa.int/web/gaia-users/license>, read 2026-10-16); the derived file keeps ESA's non-commercial term |
| The members' absolute magnitudes and colours less the clusters' extinction: A_G = 0.789 A_V, E(BP−RP) = 0.413 A_V | Wang S. & Chen X. 2019, ApJ 877, 116 | facts, cited |
| Gaia DR3's global parallax offset, −0.017 mas | Lindegren L. et al. 2021, A&A 649, A4 | facts, cited |

What is measured and what is not. A globular's core and tidal radius are Harris's; its stars are a model of its
kind, not its own stars: their number, brightness and colour follow a luminosity function and an illustrative
colour scale that are ours (the card says so), and their light is shared with the glow so the two together
are the cluster's MVt. An open cluster's members are Gaia's: their directions are measured; their depth is their
own parallax where it is good to a quarter of the cluster's half-member radius (the Hyades' nearly all, the
Pleiades' brightest), otherwise modelled as a Plummer sphere of the cluster's measured half-member radius; the
cluster stands at the map's distance for it. The conversion of BP−RP into the app's B−V colours is this map's
linear fit (B−V = 0.82 (BP−RP)0 − 0.06), not a published relation. A faint open-cluster member is drawn at least 2.2 px wide (a floor for legibility, not
its brightness), and the cluster's haze steps back only by the light its Gaia members carry. Both kinds are drawn to apparent magnitude 10 from
the camera, as a camera's exposure shows a cluster (6.5 under the Eye exposure), deeper than the map's other stars.
Not yet reviewed by an astronomer.

### The Ring (0076 W3-b)

The Ring Nebula's reconstruction (`site/js/scene/deep/ring.js`, its numbers in
`registry/deepsky-heroes/m57.yaml`, the shared part in `site/js/scene/deep/shellneb.js`) is computed here from
facts read in each source on 2026-10-16; no text, figure, image or model file of any of them is shipped. The
sizes are the papers' arcseconds, turned into light-years at the record's distance (2 569 ly, below).

| what | the numbers | from |
|---|---|---|
| the main ring | an irregular, ionisation-bounded disc "lying almost in the plane of the sky", bounded at about 44″ along its apparent major axis (PA 60°) and 30″ along the minor; the major axis tilted 13.5°, its NE end near (the SW tip redshifted); a central cavity. Its thickness (drawn 28″) and the cavity's edge (half its radii, read from the photograph) are illustrations | O'Dell, Ferland, Henney & Peimbert 2013, AJ 145, 92 (arXiv:1301.6636), sections II.1, III.3, IV |
| the lobes | "a pair of extended Lobes pointed almost at the observer" through the cavity; the paper has "no evidence about the form of the Lobes": drawn as one soft spheroid 59″ long each way (the semi-polar axis of the earlier model), an illustration | O'Dell et al. 2013, section IV; O'Dell, Sabbadin & Henney 2007, AJ 134, 1679 |
| the interpretation | "shaped like a distorted doughnut", with "a rugby ball slotted into the doughnut's central gap": read, not shipped | ESA/Hubble heic1310 (2013-05-23, read 2026-10-16) |
| the inner halo | loops "almost all of them within 65″" of the star: drawn as a soft spherical shell from 44″ to 62″ (where the photograph's light ends), an illustration. The outer halo (115″) and the ten arcs Webb found are not drawn | O'Dell et al. 2013, sections I and III.4; Wesson et al. 2024, MNRAS (arXiv:2308.09027) |
| the knots | dark knots of about 0.2″ (150 au) near the ionisation boundaries; "some 20 000 dense globules". 150 to 1 000 are drawn in the outer part of the ring at that size; their places are seeded, not catalogued, their 300 au tails are an illustration, and under 2.2 px their darkness is exaggerated so they can be seen | O'Dell et al. 2013, section II.2; Wesson et al. 2024, MNRAS, CC BY 4.0 |
| the white dwarf | about 135 000 K (published fits 101 000 to 162 000 K): its colour is a blackbody's | Sahai et al. 2025, ApJ 985 (arXiv:2504.01188) |
| the distance | 2 569 ly (2 483 to 2 661): the inverse of the central star's parallax, 1.2696 ± 0.0438 mas, Gaia DR3 source_id 2090486618786534784 (no zero-point correction). It replaces the Messier table's 2 700 ly for the record (`scripts/data/messier-overlay.yaml`) | Gaia DR3, ESA/Gaia/DPAC; Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1; read through VizieR I/355/gaiadr3 (CDS) on 2026-10-17. CC BY-NC 3.0 IGO: "Gaia data are distributed under the CC BY-NC 3.0 IGO license." (<https://www.cosmos.esa.int/web/gaia-users/license>) |
| the light | the reconstruction's light IS the photograph the app already shows, its stars removed (`scripts/build_deep_ring.py` -> `site/images/deep/ring/ring-light.webp`, 11.5 kB, an adaptation): each sky point's light is spread along our line through the ring, the lobes and the halo. The ring's projected axis (PA 62°, ratio 0.78) was measured from it too | ESA/Hubble heic1310a, NASA, ESA, and C. Robert O'Dell (Vanderbilt University), CC BY 4.0 (section 3 above); stars removed by Space Radar |

The photograph's colours are NARROWBAND (helium, oxygen, hydrogen, nitrogen and sulphur filters given colours by
ESA/Hubble), so under every look the light is ENHANCED, and the registry says so; Deep lifts it further. Which
layer each part of the picture's light belongs to, the layers' soft forms and their self-absorption are
illustrations shaped to the sources above. The card says its light is the photograph's and its shape the paper's,
that its thickness and the lobes' form are not measured, and that no astronomer has reviewed it yet.

### Remnants and dust (0076 W3-c)

The remnants' shells (`site/js/scene/deep/remnant.js`) and the dust sheets (`site/js/scene/deep/dustsheet.js`), their
numbers in `registry/deepsky-heroes/{crab,veil,horsehead,coalsack,m78,iris}.yaml`, are computed here from facts read in
each source on 2026-10-17; no text, figure or model file of any of them is shipped. Lengths on the sky are turned into
light-years at each record's distance. Each shape in depth is **reconstructed** and each card says so; the dust only
absorbs (a multiply blend in its own material) and reddens by the extinction law below.

| what | the numbers | from |
|---|---|---|
| the Crab's shell | the envelope fitted as an ellipsoid along the pulsar's torus axis, no line-emitting gas beyond 2 pc along it and none within 0.5 pc of the centre (310 000 SITELLE spectra, uniform expansion); its true outline is "heart-shaped", not drawn | Martin, Milisavljevic & Drissen 2021, MNRAS 502, 1864 (arXiv:2101.02709) |
| the Crab's axis | the outer torus at position angle 126.3 degrees, its axis 63.0 degrees from the line of sight; which end is nearer is assumed | Ng & Romani 2004, ApJ 601, 479 (arXiv:astro-ph/0310155) |
| the Cygnus Loop (the Veil) | 735 +/- 25 pc; a main shell 2.85 degrees (37 pc) across, fairly spherical; its centre SIMBAD's | Fesen, Weil, Cisneros, Blair & Raymond 2018, MNRAS 481, 1786 (arXiv:1809.01713); SIMBAD, CDS |
| the Horsehead | in silhouette against the glowing gas of IC 434, lit from behind by sigma Ori 3.5 pc away in projection; the edge seen nearly edge on | Abergel et al. 2024, A&A (arXiv:2404.15816); Habart et al. 2005, A&A (arXiv:astro-ph/0501536) |
| the Coalsack | the near cloud at 100 to 200 pc; a second cloud about 3.1 kpc away in the north-east (drawn here at the near distance); extinction above 6 and up to 10 magnitudes in a few places | Beuther et al. 2011, A&A (arXiv:1107.2298) |
| M78's and the Iris's stars | HD 38563 (B2II-III, V 10.81) and HD 200775 (B2Ve, V 7.43): places, magnitudes, types; their depths are not measured | SIMBAD, CDS (https://simbad.cds.unistra.fr/), read 2026-10-17, cited as "CDS/SIMBAD" |
| the Iris's cavity | HD 200775 in a cavity largely devoid of molecular gas | Gerin, Phillips, Keene, Betz et al. 1998 (arXiv:astro-ph/9802116) |
| the extinction law | A(lambda) / A(V) at 0.61, 0.55 and 0.45 um for R_V = 3.1 (the stars behind the dust reddened) | Cardelli, Clayton & Mathis 1989, ApJ 345, 245 |
| the phase function | Henyey-Greenstein with g = 0.6 (modelled): a reflection nebula seen from another side | Henyey & Greenstein 1941, ApJ 93, 70; g as Sujatha, Murthy, Shalima & Henry 2007, ApJ 665, 363 measured it near the Coalsack (0.61 +/- 0.07, far ultraviolet) |
| the light and the darkness | the remnants' light IS the photograph the app already shows, its stars removed; the Horsehead's darkness and the glow behind it are read from its photograph; the Coalsack's darkness from the Milky Way map the app draws, against the Milky Way at the same galactic latitude; M78's and the Iris's light from NOIRLab's photographs (B, V, R and H-alpha; their 1280 px renditions, downloaded for the bake and not shipped; placed by a 2MASS solve, CDS hips2fits, as section 3g's photographs). All by `scripts/build_deep_sheets.py` into `site/images/deep/sheets/` (adaptations). Under Deep the photographs' own stretch is ENHANCED; the Crab's, the Veil's and the Horsehead's colours are FALSE COLOUR (narrow filters) | heic0515a: "NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble)", CC BY 4.0; noao1209a: "T.A. Rector (University of Alaska Anchorage) and WIYN/NOIRLab/NSF/AURA", CC BY 4.0; noao0126a: "T.A.Rector (NOIRLab/NSF/AURA) and Hubble Heritage Team (STScI/AURA/NASA)", CC BY 4.0; noao-m78 and noao-ngc7023: "T. A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA", CC BY 4.0; the Milky Way map: "NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC." (section 2's 4k map); stars removed, darkness read and depth reconstructed by Space Radar |

### Galaxy clusters and quasars (0076 W4-b)

Four clusters of galaxies and two quasars (`site/js/scene/deep/galclusters.js`, internal #784), their numbers read on
2026-10-20 by `scripts/build_deep_galclusters.py` into `site/data/deep/galclusters.json` and `site/data/deep/galclusters.bin`;
the hand-kept facts and every page read are in `registry/galaxy-clusters.yaml`. "This research has made use of the VizieR
catalogue access tool, CDS, Strasbourg, France." VizieR's terms, as its licence page read that day
(<https://cds.unistra.fr/vizier-org/licences_vizier.html>): "The data retrieved with VizieR are free of usage in a scientific
context ; however, as it is the usage in scientific publication, the original authors and publication references including the
publisher have to be explicitely cited". SDSS, as <https://www.sdss.org/collaboration/> read that day: "All SDSS data released
in our public data releases are considered in the public domain." Funding for the Sloan Digital Sky Survey is acknowledged at
<https://www.sdss.org/collaboration/citing-sdss/>; a link back to <https://www.sdss.org/> is given as the courtesy it asks.
Space Radar is free and non-commercial.

| what | from | licence |
|---|---|---|
| Virgo's 1 012 members (position, SDSS g and r magnitudes, half-light radius, redshift), those its infall model calls members and the map does not already draw as a record | Kim S. and others 2014, ApJS 215, 22, *The Extended Virgo Cluster Catalog*, VizieR J/ApJS/215/22 | VizieR's terms above; facts, cited |
| The distances of 71 of them, found one by one from surface brightness fluctuations; the cluster's mean 16.5 Mpc, its rms scatter 0.6 Mpc, the W' cloud near 23 Mpc | Mei S. and others 2007, ApJ 655, 144, *The ACS Virgo Cluster Survey. XIII.*, VizieR J/ApJ/655/144 (arXiv:astro-ph/0702510) | VizieR's terms above; facts, cited |
| Coma's 1 826 members (position, redshift, r magnitude) | Kang W. and others 2025, ApJS 278, 51, *Spectroscopic redshift survey of the Coma cluster*, VizieR J/ApJS/278/51 | VizieR's terms above; facts, cited |
| Perseus's 418 members (position, redshift, r magnitude) | Kang W. and others 2024, ApJS 272, 22, *Galaxies with redshifts in the vicinity of A426*, VizieR J/ApJS/272/22 | VizieR's terms above; facts, cited |
| Coma's and Perseus's half-light radii (petroR50_r), g and r model magnitudes and extinction, by SDSS object id | SDSS DR17, <https://skyserver.sdss.org/dr17/> | public domain (the sentence above) |
| Fornax's 340 likely members (position, B_T magnitude, effective radius) and its mean SBF distance 20.0 Mpc, its rms scatter 0.49 Mpc | Ferguson H.C. 1989, AJ 98, 367, VizieR VII/180; Blakeslee J.P. and others 2009, ApJ 694, 556, *The ACS Fornax Cluster Survey. V.* (arXiv:0901.1138) | VizieR's terms above; facts, cited |
| 3C 273 and 3C 279: position, redshift and apparent magnitude (NED's, as the pages print them); 3C 273's host, an E4 of apparent size 29 arcseconds and magnitude 16 (Bahcall and others 1997, ApJ 479, 642), its mass 886 million Suns; the spectroastrometric distance in its note (Wang and others 2020, Nature Astronomy 4, 517) | Wikipedia, *3C 273* and *3C 279*, infoboxes, read 2026-10-20 (`registry/exotics.yaml`) | Wikipedia's text is CC BY-SA 4.0 and none of it is reproduced: figures only |
| The comoving distance of a redshift | `site/js/data/cosmology.js`, Planck 2018 (Planck Collaboration, A&A 641, A6, 2020) | facts, cited |

What is measured and what is not. A member's direction is the catalogue's. Its distance is its own where surface brightness
fluctuations measured one (71 Virgo galaxies) and its cluster's otherwise, by the cluster's method: SBF for Virgo and Fornax, the
members' mean redshift carried to a comoving distance for Coma and Perseus. Its depth inside the cluster, when it has no distance
of its own, is **modelled**: an offset along the line of sight drawn, seeded by its catalogue id, from the cluster's published rms
scatter (Virgo, Fornax) or from the spread of its members across the sky (Coma, Perseus: a cluster is round, an assumption), cut at
2.5 sigma, so that a cluster seen from the side is a swarm and not one thin sheet. Its size is the catalogue's half-light radius at
that distance, drawn as one round, centrally peaked shape (flattening and tilt are not drawn): an illustration. Its light is its
catalogue magnitude, an exposure and not photometry. The quasars are bright points at their comoving distance; 3C 273's host is a
faint round shape at the angular size its source gives; 3C 279 has none because the source gives no size.

<!-- 0077 W2-e: begin -->
### Carina (0077 W2-e)

The Carina Nebula's reconstruction (`site/js/scene/deep/carina.js`, its numbers in `registry/deepsky-heroes/carina.yaml`)
is computed here from facts read in each source on 2026-10-20; no text, figure or model file of any of them is shipped.
Lengths on the sky are turned into light-years at the record's distance (2.35 kpc, 7 665 ly). Its shape is
**reconstructed** and the card says so.

| what | the numbers | from |
|---|---|---|
| the bipolar cavity | on the largest scale one coherent bipolar nebula, its axis perpendicular to the Galactic plane, lobes about 40 pc across; the cavities north and south of Trumpler 14 and 16 its two halves. Drawn as the far walls of two lobes along Galactic north (position angle 27.8 degrees here); the lobes' sizes, centres and depths are read from the photograph and are illustrative | Smith, Egan, Carey, Price, Morse & Price 2000, ApJ 532, L145; Smith & Brooks 2008, Handbook of Star Forming Regions II (arXiv:0809.5081); Rebolledo et al. 2017, MNRAS 472, 1685 (arXiv:1708.02864) |
| the dust lane and the Keyhole | the V-shaped lane is dust mixed with molecular gas in front of the glowing gas, the nebula's highest column on our line; the Keyhole's dark clumps cool foreground clumps. Drawn 20 ly in front of the clusters (not measured); its optical depth is the photograph's darkness along the lane (reconstructed) | Smith & Brooks 2008 (arXiv:0809.5081), after Brooks et al. 2000 |
| the distance | 2 350 +/- 50 pc from the Homunculus's expansion parallax; Gaia EDR3's parallaxes of the clusters' OB stars and X-ray selected members agree within about 2 % (2.36 and 2.34 kpc) | Smith 2006, ApJ 644, 1151; Göppl & Preibisch 2022, A&A 660, A11 (arXiv:2201.09097) |
| Trumpler 14 | a King core radius of 0.17 arcmin and a halo out to about 5 arcmin; 2 000 members drawn as a seeded sample (model), as is Trumpler 16 (its size illustrative) | Ascenso et al. 2007, A&A 476, 199 |
| Eta Carinae and the O stars | places, V magnitudes and spectral types of Eta Carinae, HD 93129A, HD 93128, HD 93160, HD 93161, HD 93250, WR 25, HD 93205, HD 93204, HD 303308, CPD-59 2600, HD 93130, HD 93403, QZ Car and WR 24; Eta Carinae's V 4.2 is the app's own record (it is variable and brightening: Damineli et al. 2019, MNRAS 484, 1325); their depths are not measured, so they stand in one plane | SIMBAD, CDS (https://simbad.cds.unistra.fr/), read 2026-10-20; the CDS terms ask the data be cited as "CDS/SIMBAD" |
| the light | the reconstruction's light IS the photograph the app already shows, its stars removed (`scripts/build_deep_carina.py` -> `site/images/deep/carina/carina-light.webp`, an adaptation); round Eta Carinae and Trumpler 14 a sharper map of the same photograph from ESO's publication JPEG (3 727 x 4 000 px, downloaded for the bake and not shipped): a 20 arcmin square, its stars removed and its colours matched to the 640 px map (`carina-detail.webp`, an adaptation); the wall's depth map (`site/data/deep/carina-front.bin`) is computed from the same picture and the numbers above. Under Deep the photograph's own stretch is ENHANCED | ESO eso1250a, credit "ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit", CC BY 4.0 (section 3 above); stars removed and depth reconstructed by Space Radar |

### The SMC and the Magellanic Stream (0077 W2-e)

The Small Magellanic Cloud's model (`site/js/scene/deep/smc.js`) and the Magellanic Bridge and Stream
(`site/js/scene/deep/magellanic.js`), their numbers in `registry/deepsky-heroes/smc.yaml`, read on 2026-10-20. What is
measured: where the stars are on the sky, the depth trends below, the hydrogen's column on the sky, the light (the
photograph). What is a **model**: each drawn star's depth and brightness, the populations' thickness, and the Stream's
distance beyond its root. The card says so.

| what | from | licence |
|---|---|---|
| Two maps of the SMC's stars on the sky (all members; young blue stars), 128 x 128 bins of 0.075 degrees, counted from Gaia DR3 by `scripts/build_deep_smc.py` (`site/data/deep/smc-density.bin`, 65 536 B); the SMC's proper motion from Luri et al. 2021 | Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1; Gaia Collaboration, Luri et al. 2021, A&A 649, A7 | ESA/Gaia/DPAC, CC BY-NC 3.0 IGO (https://www.cosmos.esa.int/web/gaia-users/license: "Gaia data are distributed under the CC BY-NC 3.0 IGO license."); the bin is a derived work and keeps that term |
| The young stars stretched along our line: the Cepheids "heavily elongated for more than 25-30 kpc approximately in the east/north-east towards south-west direction"; the eastern side up to 20 kpc nearer than the western; an extended ellipsoid, its northern part nearer | Ripepi et al. 2017, MNRAS 472, 808 (arXiv:1707.04500); Scowcroft et al. 2016, ApJ 816, 49 (arXiv:1502.06995); Jacyszyn-Dobrzeniecka et al. 2016, AcA 66, 149 (arXiv:1602.09141) | facts, cited |
| The old stars near a plane, inclination 35-48 degrees and position angle 170-186 degrees (drawn at 41 and 178), with a second group up to 10 kpc behind on the east (not drawn) | Tatton et al. 2021, MNRAS (arXiv:2012.12288) | facts, cited |
| The Magellanic Bridge and Stream: the HI4PI survey's high-velocity H I column density in Magellanic coordinates (`hi4pi-hvc-nhi-mag-car.fits.gz`, 7.9 MB, downloaded for the bake and not shipped), cropped and resampled by `scripts/build_deep_magellanic.py` (`site/images/deep/magellanic/hi-column.webp`, an adaptation). Drawn in **false colour**: hydrogen at 21 cm, which no eye or camera sees. Its distance along our line is a **model**: the Bridge between the Clouds' measured distances, the Stream from the SMC's to 100 kpc at its far end ("the only solid distance constraint on the Stream is that one end is anchored to the Magellanic Clouds"; models put the far end 80 to 150 kpc away) | Westmeier 2018, MNRAS 474, 289 (arXiv:1712.00909); HI4PI Collaboration, Ben Bekhti et al. 2016, A&A 594, A116; served by NASA's LAMBDA (https://lambda.gsfc.nasa.gov/product/foreground/fg_hi4pi_hvhi_info.html); Magellanic coordinates: Nidever, Majewski & Butler Burton 2008, ApJ 679, 432; the distance: Fox et al. 2019 (arXiv:1903.04831) | LAMBDA's page states no licence of its own and asks for the paper to be cited; HI4PI's data are distributed by CDS, whose VizieR terms read that day (https://cds.unistra.fr/vizier-org/licences_vizier.html): "free of usage in a scientific context ; however, ... the original authors and publication references including the publisher have to be explicitely cited". Cited as both ask; Space Radar is free and non-commercial |
| The light where the SMC's photograph covers it: the photograph with its stars taken out (its pink H II regions kept) and 47 Tucanae and NGC 362, Milky Way globulars in front of it, filled from round them (`scripts/build_deep_smc.py --light` -> `site/images/deep/smc/smc-light.webp`, an adaptation) | NOIRLab noirlab2030b, credit "CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever (Montana State University)..." (section 3 above) | CC BY 4.0; stars removed by Space Radar |
<!-- 0077 W2-e: end -->
<!-- 0077 W3-f: begin -->
### Galaxies from their structure (0077 W3-f)

M51 with NGC 5195, M81, M101, M104 and the Antennae as models (`site/js/scene/deep/spiral.js`, internal #873 and #875), their
numbers in `registry/deepsky-heroes/m51.yaml`, `m81.yaml`, `m101.yaml`, `m104.yaml` and `antennae.yaml`, each with its source.
Facts read on 2026-10-20 in the papers' abstracts and texts (arXiv) and in VizieR's and SIMBAD's tables; no text, figure,
image or data file of any of them is shipped. Angular sizes are turned into kiloparsecs at each record's distance. Every
model is a **model** and the card says so, and that no astronomer has reviewed it yet (internal #785).

| what | the numbers | from |
|---|---|---|
| M51's orientation | i = 22 +/- 5, PA = 173 +/- 3 degrees from the gas's velocities; the north half approaching (THINGS's velocity map); the east near (derived from the rotation and trailing arms, not published) | Colombo et al. 2014 (arXiv:1401.3759); Walter et al. 2008, THINGS (arXiv:0810.2125); Shetty et al. 2007 (arXiv:0705.3240) |
| M51's structure | bulge n 0.995, Re 21.6 arcsec, B/T 0.128; disc scale length 84.2 arcsec; pitch about 19 degrees | Salo et al. 2015, S4G (VizieR J/ApJS/219/4); Puerari et al. 2014 (arXiv:1408.3658); Honig & Reid 2015 (arXiv:1412.1012) |
| NGC 5195 | its place and 5.89 x 4.68 arcmin outline; behind M51's arm (absorption by the arm in its nucleus's spectrum); 4 kpc behind and its profile illustrative; the arm that reaches it traced on the photograph heic0506a, its depth a model | SIMBAD (CDS, "CDS/SIMBAD"), Paturel et al. 2003; Ritchey et al. 2015 (arXiv:1501.03223); Theis & Spinneker 2003 (arXiv:astro-ph/0306502) |
| M81 | i = 59.0 degrees; PA 157 (RC3); bulge n 2.62, Re 46.2 arcsec; disc scale length 155.4 arcsec; pitch 13.4 +/- 2.3 degrees; the south-east approaching, the south-west near | de Blok et al. 2008 (arXiv:0810.2100); Kendall et al. 2008 (arXiv:0804.2380); Davis et al. 2017 (arXiv:1707.04001); Schnorr-Müller et al. 2011 (arXiv:1012.3015) |
| M101 | i = 18, PA = 39 degrees; disc scale length 127.3 arcsec at 3.6 microns; arms' pitches 7 to 29 degrees; the south-west approaching; the near side derived; five giant H II regions (NGC 5447, 5455, 5461, 5462, 5471) at their places | Walter et al. 2008 (after Bosma, Goss & Allen 1981); Salo et al. 2015; Herrera-Endoqui et al. 2015 (VizieR J/A+A/582/A86); Mihos et al. 2013 (arXiv:1211.3095); SIMBAD (CDS) |
| M104, the Sombrero | PA 89.25 degrees; i = 84 (84.3 +/- 0.2 for the CO ring); bulge n 3.9, Re 71 arcsec; disc scale length 61 and height 18 arcsec; the dust ring's radius 144.7 arcsec and width 22.9 arcsec, an inner dust disc of 48 arcsec; which side is near is not published in what was read, and is assumed | Bendo et al. 2006 (arXiv:astro-ph/0603160); Gadotti 2012 (arXiv:1101.2900), after Emsellem et al. 1996; Sutter et al. 2022 (arXiv:2210.13527); Vlahakis et al. 2008 (arXiv:0805.4791) |
| The Antennae | NGC 4038's and NGC 4039's places; their RC3 outlines (tilts read from torn outlines: illustrative); 22 +/- 3 Mpc (13.3 +/- 1.0 by another method); the tails' lengths and parents, the southern tip bending away; the tails traced on Robert Gendler's photograph, their depths a model after the simulations | SIMBAD (CDS); RC3 (de Vaucouleurs et al. 1991, VizieR VII/155); Schweizer et al. 2008 (arXiv:0807.3955); Saviane et al. 2008 (arXiv:0802.1045); Hibbard et al. 2001 (arXiv:astro-ph/0110581); Privon et al. 2013 (arXiv:1305.5865); Karl et al. 2010 (arXiv:1003.0685); heic0812c, "Robert Gendler", ESA/Hubble, CC BY 4.0 |

### A deep field (0077 W3-f)

The Hubble Ultra Deep Field as Webb's JADES survey catalogued it (`site/js/scene/deep/galclusters.js`, internal #784), read on
2026-10-20 by `scripts/build_deep_field.py` into `site/data/deep/deepfield.json` and `site/data/deep/deepfield.bin`; the box on
the sky, the cut and every page read are in `registry/galaxy-clusters.yaml` (`fields:`). "This research has made use of the
VizieR catalogue access tool, CDS, Strasbourg, France."

| what | from | licence |
|---|---|---|
| 7 607 galaxies brighter than F200W 28 in the Ultra Deep Field's box: position, half-light radius in F090W, Kron fluxes in F090W, F200W and F444W, the photometric redshift, and NIRSpec's spectroscopic redshift where its flag is A or B (441 of them) | JADES, the JWST Advanced Deep Extragalactic Survey: Rieke M.J. and others 2023, ApJS 269, 16; the GOODS-South tables of VizieR V/159 (gssample, gskron, gsprism); MAST DOIs 10.17909/8tdj-8n28, 10.17909/z2gw-mk31, 10.17909/fsc4-dt61 | the catalogue's ReadMe, read that day: "These HLSP data products are licensed for use under CC BY 4.0." |
| The stars left out: the MUSE survey's stars in the field (redshift under 0.01) | Bacon R. and others 2023, A&A 670, A4, *The MUSE Hubble Ultra Deep Field surveys: Data release II*, VizieR J/A+A/670/A4 | VizieR's terms (<https://cds.unistra.fr/vizier-org/licences_vizier.html>), read that day: "Tabular data, spectra or images coming from A&A (J/A+A) are free for a scientific usage"; the authors cited |
| The box: RA 53.117 to 53.208, Dec -27.831 to -27.752 | Rafelski M. and others 2015, AJ 150, 31, *UVUDF* (its footprint only; none of its rows is used) | facts, cited |
| The comoving distance of each redshift | `site/js/data/cosmology.js`, Planck 2018 (Planck Collaboration, A&A 641, A6, 2020) | facts, cited |

What is measured and what is not. Each galaxy's direction is JADES's. Its distance is the comoving distance of its redshift: NIRSpec's
where it measured one, else the photometric **estimate**, whose error is wide (the catalogue's 68 % range is often a tenth of the
redshift). As seen from the Sun each galaxy is as wide as Webb measured it (its half-light radius as an angle, times the comoving
distance; its true width is that over 1 + z). Its light is its F200W magnitude, an exposure and not photometry; its tint is the F090W
minus F444W colour Webb saw, **illustrative** (observed, not rest frame), and each is drawn as one round, centrally peaked shape.
<!-- 0077 W3-f: end -->

## 4. Runtime data sources

The app calls these from the visitor's browser. Nothing here is redistributed in this repository —
but **if you fork this and put it online, every one of your visitors becomes a client of these
services from their own IP.** Read §4.1 before you deploy.

| Service | What it provides | Terms | Credit line | Link |
|---|---|---|---|---|
| CelesTrak | GP/OMM orbital elements: stations, visual, active, last-30-days, Starlink supplemental; and the satellite catalogue (`satcat.csv`), read only when the debris view is opened, for its count by height and the orbit each piece of debris is drawn on | Free; a published usage policy with enforced rate limits (§4.1) | Orbital data: CelesTrak (T. S. Kelso) | <https://celestrak.org> |
| The Space Devs — Launch Library 2 | upcoming launches, pads, providers; since 2026-10-08 also the launches of the last days, the active stations with the vehicles docked to them, and the people flagged as in space (names, agency and launch date only: no portraits, no biographies) | Free to 15 requests/hour/IP; **no published licence** (§4.2) | Launch data by The Space Devs | <https://thespacedevs.com/llapi> |
| NASA — DSN Now | live Deep Space Network dish↔spacecraft links | NASA content is generally not copyrighted; this endpoint is undocumented (§4.3) | NASA Deep Space Network | <https://eyes.nasa.gov/dsn/> |
| NOAA SWPC | planetary K-index forecast | US Government work, public domain (§4.4) | Space weather: NOAA SWPC | <https://www.swpc.noaa.gov> |
| NOAA SWPC | today's sunspot groups (the solar region summary as JSON), fetched once when the camera is close to the Sun | US Government work, public domain (§4.4) | Today’s sunspot groups: NOAA Space Weather Prediction Center, solar region summary | <https://services.swpc.noaa.gov/json/solar_regions.json> |
| NOAA SWPC | solar flares (the edited events list as JSON: class, peak time and region of each X-ray flare), fetched once when the camera is close to the Sun | US Government work, public domain (§4.4) | Solar flares: NOAA Space Weather Prediction Center, edited events list | <https://services.swpc.noaa.gov/json/edited_events.json> |
| NASA DONKI | coronal mass ejections (start, direction, half-angle and speed of each analysed CME), read only from our saved copy | No licence named; "as is", "as a courtesy to the community" (§4.4, the note on the Sun's activity) | Coronal mass ejections: NASA DONKI (Moon to Mars Space Weather Analysis Office and CCMC) | <https://ccmc.gsfc.nasa.gov/tools/DONKI/> |
| IAU Minor Planet Center | comet orbital elements (`CometEls.txt`) | **Copyrighted**; redistributable only with the source clearly specified (§4.5) | Comet elements: IAU Minor Planet Center | <https://minorplanetcenter.net> |
| NASA GIBS | today's clouds: GOES-East, GOES-West and Himawari Band 13 infrared, every 10 min | NASA "full and open sharing"; an acknowledgement is asked for (§4.13) | the acknowledgement in §4.13, verbatim, plus NOAA and JMA for the satellites | <https://nasa-gibs.github.io/gibs-api-docs/> |
| NASA GIBS | the Earth close up: Blue Marble with shaded relief, 500 m, map tiles fetched when the camera is within about 4 000 km of the ground | NASA "full and open sharing"; an acknowledgement is asked for (§4.13) | the line in §4.16, which carries the acknowledgement | <https://nasa-gibs.github.io/gibs-api-docs/> |
| NASA GIBS | Earth data overlays: sea temperature, sea ice, chlorophyll, vegetation, rain, aerosol, water vapour; one picture when a visitor or a trip asks | NASA "full and open sharing"; an acknowledgement is asked for (§4.13) | the acknowledgement in §4.13, and each data set's makers in §4.19 | <https://nasa-gibs.github.io/gibs-api-docs/> |
| GDACS (EC Joint Research Centre) | tropical cyclones now: centre, status, top wind on the track | EU-owned content, CC BY 4.0 by the Commission's reuse decision; GDACS calls it "purely indicative" (§4.14) | Tropical cyclones: GDACS, European Commission Joint Research Centre (CC BY 4.0) | <https://www.gdacs.org> |
| NOAA nowCOAST | lightning now: strike density over the last fifteen minutes, from the ground networks NLDN and GLD360, 25° S to 80° N and 110° E eastward to 0° W | US Government work, public domain; a "Level 5" derived product "appropriate for public distribution" (§4.17) | Lightning: strike density from NOAA nowCOAST, made by the NWS Ocean Prediction Center | <https://nowcoast.noaa.gov> |
| NASA Solar System Treks | map tiles of the Moon and Mars, fetched when the camera is close: LRO WAC mosaic (to 83 m per pixel), THEMIS daytime infrared mosaic (to 162 m) as detail over our colour map, and the LOLA and MOLA-HRSC shaded relief re-lit by the Sun | NASA content; HRSC CC BY-SA 3.0 IGO, "generally are not subject to copyright in the United States" (§4.16) | the two lines in §4.16, in the Sources panel while those tiles are on screen | <https://trek.nasa.gov> |

Also named in `site/js/data/sources.js` so the status panel can say "could not look" about them by
name, but **not reachable from a browser** (no `Access-Control-Allow-Origin`) and therefore never
actually fetched by the app: NASA/JPL Small-Body Database, JPL Horizons, and Space-Track (which also
needs a login). Their credit lines are carried in the same file.

**Mission events (not a runtime source).** The dated events on a mission's card
(`registry/missions.yaml`: the Voyagers, New Horizons, Juno, Webb, Apollo 11, Perseverance, the
International Space Station) are facts read from NASA's own pages (NASA Science, nasa.gov and the NSSDCA catalogue) on the
date in that file, the page named on the mission's row or on the event's own and linked from the card ("Dates and figures: NASA
Science, Voyager 1"). The sentences are ours. NASA content is generally not subject to copyright
in the United States; nothing of those pages is copied here but dates and distances.

**Mission paths (bundled data, not a runtime source).** The files in `site/data/eph/`
(`registry/ephemerides.yaml`, built by `scripts/build_ephemerides.py`) are state vectors from the
**JPL Horizons On-Line Ephemeris System** (NASA/JPL-Caltech, Solar System Dynamics Group;
<https://ssd.jpl.nasa.gov/horizons/>), asked for through its public API on the day in
`site/data/eph/manifest.json`, thinned and packed by this project: the Voyagers, the Pioneers, New
Horizons, Juno, Cassini, Galileo, Webb, Mars 2020's cruise, OSIRIS-APEX and the asteroid Apophis.
The manifest names, for each craft, the Horizons id, the trajectory solution Horizons printed, the
span, and how far the packed file strays from Horizons' own positions. A work of the US
government, free to use with credit; the card of a craft drawn from its file says "Drawn from JPL
Horizons". Between samples the curve is ours (cubic Hermite), and the card says how good it is.

### 4.1 CelesTrak — read this before you deploy a fork

CelesTrak's [usage policy](https://celestrak.org/usage-policy.php) (Dr. T. S. Kelso, 2026 May 15,
updated 2026 May 22) is not advisory. The rules that bind a public app, quoted exactly:

> Only download the data you need, when you are going to use it, and only download data once per
> update. For GP data, updates are once every 2 hours.

> For SupGP data, which updates on different schedules for different constellations, please use 2
> hours, as well.

> Most importantly, we send HTTP error responses when users are exceeding limits or using incorrect
> (long-outdated) URLs (e.g., HTTP 301, 403, 404, 50x). M2M (machine-to-machine) software should
> immediately stop querying when it receives any non-HTTP 200 responses and report the results to a
> human for investigation. Repeatedly ignoring them will end up sending your IP address to the
> firewall.

> Please realize that CelesTrak supports hundreds of thousands of unique IP addresses each day and
> millions each month. We need to ensure all users respect our resource limitations in order to be
> able to continue to provide reliable service.

`site/js/data/sources.js` is written to honour this: a 3-hour floor per file, one in-flight request
per source, the *attempt* timestamp (not the success timestamp) gating the next fetch so a failing
source cannot become a retry loop, and an HTTP 403 recorded as "has not published a new file since
our last download" and **never retried inside the cadence window**. If you change the cadence
constants, you are changing whether this app complies. Don't.

CelesTrak asks for use within policy rather than for a specific credit string; the line in the table
is courtesy, and it is the one the app shows.

### 4.2 The Space Devs — Launch Library 2

Their [API page](https://thespacedevs.com/llapi) states the rate limit and nothing else:

> Please note : all the API data is available at no cost for up to 15 requests per hour. For higher
> access rates, please check our Patreon

The site footer reads `2020-2026 Copyright TheSpaceDevs`. **They publish no licence and no
attribution requirement that could be found.** "Launch data by The Space Devs" is the credit the
community uses and the one this app shows, but it is courtesy, not a term we can point at. Treat
the absence of a licence as a real risk, not as permission: if you build something commercial on
this data, ask them.

### 4.3 NASA — DSN Now

`https://eyes.nasa.gov/dsn/data/dsn.xml` is the feed behind NASA's public DSN Now page. It is
undocumented, has no SLA, and may change shape without notice; the app draws nothing older than 30
minutes. NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
apply to the content: NASA material is generally not subject to copyright in the United States and
NASA asks to be acknowledged as the source. Two restrictions matter to any fork — content must not
imply NASA's endorsement of a product or service, and the NASA insignia (meatball, worm, seal) may
not be used. This project uses neither.

### 4.4 NOAA SWPC

Per the [NWS disclaimer](https://www.weather.gov/disclaimer):

> The information on National Weather Service (NWS) Web pages are in the public domain, unless
> specifically noted otherwise, and may be used without charge for any lawful purpose so long as you
> do not: 1) claim it is your own (e.g., by claiming copyright for NWS information -- see below), 2)
> use it in a manner that implies an endorsement or affiliation with NOAA/NWS, or 3) modify its
> content and then present it as official government material.

The NWS name and visual identifier are trademarks and are not used here beyond naming the source.

**Today's sunspot groups (2026-10-06).** `site/js/scene/sun.js` draws the Sun's numbered active
regions from `https://services.swpc.noaa.gov/json/solar_regions.json`, which the visitor's browser
fetches once, the first time the camera is close to the Sun, and never on a connection that asked to
save data. Measured 2026-10-06 with `curl -s -D - -H "Origin: https://www.spaceradar.ai"`:
`access-control-allow-origin: *`, `cache-control: max-age=60`, 126 108 bytes. What is changed: each
group is drawn as ONE round spot at its reported latitude, distance from the central meridian and
area, and is carried west by the Sun's turning (13.2 degrees a day) from the list's day to the
clock's; the spots' darkness is chosen. The Sun's card says so, and the Sources panel prints
"Today’s sunspot groups: NOAA Space Weather Prediction Center, solar region summary" while they are drawn.

**The Sun's activity (2026-10-12).** `site/js/data/sunactivity.js` reads two more lists the first
time the camera is close to the Sun, never on a connection that asked to save data.
*Flares*: `https://services.swpc.noaa.gov/json/edited_events.json`, NOAA SWPC's edited events
(US Government work, as above). Measured 2026-10-12 with `curl -s -D - -H "Origin:
https://www.spaceradar.ai"`: `access-control-allow-origin: *`, `cache-control: max-age=60`,
320 660 bytes. What is changed: of its rows only the X-ray flares of class C and above that carry a
region number are used; each is drawn as a bright kernel at that region's place, rising to its
peak and halving in the time NOAA gives from peak to end; how bright a class is drawn is chosen.
*Coronal mass ejections*: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/CMEAnalysis`, NASA's DONKI
(Space Weather Database Of Notifications, Knowledge, Information; Moon to Mars Space Weather
Analysis Office and the Community Coordinated Modeling Center, NASA Goddard). Measured the same day:
`Access-Control-Allow-Origin: *`, no key, 48 132 bytes. DONKI names no licence; its page
(<https://ccmc.gsfc.nasa.gov/tools/DONKI/>, read 2026-10-12) says the data is provided "as a
courtesy to the community" and "as is", should "be considered only as prototyping quality and in
research context", and asks that event and validation studies be done with the submitters'
knowledge. This map makes no study of it: it draws each analysed CME of 500 km/s or faster as a thin
arc leaving in the reported direction at the reported speed, held constant, and says so on the Sun's
card. Only our harvester asks NASA for the list; a visitor's browser reads our saved copy. The
Sources panel prints "Solar flares: NOAA Space Weather Prediction Center, edited events list" and
"Coronal mass ejections: NASA DONKI (Moon to Mars Space Weather Analysis Office and CCMC)" while the
lists are held.

### SDO image of the day (0076 W1-d)

Close up, the half of the Sun that faced the Earth wears the Solar Dynamics Observatory's newest
picture of it (internal spec 0076 W1-d, #916; `scene/sunimage.js`): the Atmospheric Imaging
Assembly's 171 ångström channel, extreme ultraviolet light from gas near a million degrees in the
loops over the surface, at 1 024 pixels, from the browse archive
`https://sdo.gsfc.nasa.gov/assets/img/browse/YYYY/MM/DD/`. The harvester (`sdo-aia-171`,
`harvest/parsers/sdo_aia.py`) saves the newest picture of the day every three hours, with the moment
in its file name as its date; a visitor's browser reads only that saved copy (the archive sends no
CORS header; measured 2026-10-15, 188 279 bytes). Terms, read 2026-10-15 on
<https://sdo.gsfc.nasa.gov/data/rules.php>: "SDO images and movies are not copyrighted unless
explicitly noted. The use of SDO images for non-commercial purposes and public education and
information efforts is strongly encouraged and requires no expressed authorization", asked to be
credited "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams."; the same page says browse
products are not intended for science analysis, and the card says the picture is a browse picture.
What is done to it: cropped round the disc, laid on the sphere from the place it was taken (north
up, as SDO publishes it) and turned with the Sun since, drawn 1.8 times brighter than the JPEG so it
sits beside the drawn far side; its colour is SDO's own false colour for that channel. The Sun's card
says when it was taken and gives the credit line. Sources panel line:
The Sun's face of the day: courtesy of NASA/SDO and the AIA, EVE, and HMI science teams

The loops drawn over today's active regions under the Film look are not from any picture: their
places are NOAA's (`swpc-solar-regions`, above), their shapes, heights and number are illustrative,
and the card says so.

### 4.5 IAU Minor Planet Center — more restrictive than you would guess

The MPC's [World-Wide Web Policy](https://www.minorplanetcenter.net/iau/WWWPolicy.html) is explicit
that its data files are **not** public domain:

> Copyright exists in all original material (i.e., nearly everything) on the CBAT/MPC/ICQ pages.
> Material that does not originate with CBAT/MPC/ICQ will be clearly marked.

> You should never assume that material on the WWW is in the public domain, unless this fact is
> clearly stated.

> Data files, whether freely-available (such as the MPCORB orbit database) or via subscription (such
> as the databases of observations), are also copyrighted entities. Subscription datasets are for
> your own personal scientific use and must not be redistributed in any form. Freely-available
> datasets may be redistributed as long as the source for the data is clearly specified.

`CometEls.txt` is a freely-available dataset, so redistribution is allowed **on the condition that
the source is clearly specified**. This app fetches it live and never mirrors it, and the card and
status panel both name the Minor Planet Center. If you add a harvester that caches or re-serves MPC
files, that condition attaches to your copy too.

### 4.7 NASA Exoplanet Archive — confirmed planets

`registry/sources.yaml` row `nasa-exoplanet-archive`; the browser reads the harvester's snapshot, and
`site/data/exoplanets.csv` is a dated, slimmed copy of the same query (`scripts/build-exoplanets.py`)
that stands in until the first snapshot lands, every record saying *as of* its date.

- Source: the **Planetary Systems Composite Parameters** table (`pscomppars`), NASA Exoplanet Archive,
  operated by the California Institute of Technology under contract with NASA's Exoplanet Exploration
  Program. Table DOI **10.26133/NEA13**; the archive asks users to cite Christiansen et al. 2025.
- Terms: the archive's data are publicly available; its documentation asks for the DOI to be cited,
  which this file and the `attribution:` on the row do. No licence text is asserted by the archive.
- Used unmodified in the snapshot; in the bundled copy, columns reduced to thirteen and numbers
  rounded to the precision the card prints (`scripts/build-exoplanets.py` says which).
- The bundled copy was read from the archive's TAP service on **2026-10-08** (6 347 planets with a
  position and a distance; it was 6 332 on 2026-09-08).
- **The star systems drawn at their own scale** (`registry/systems-list.yaml`, thirty-nine hosts beside
  TRAPPIST-1): the same pull, the same day. `registry/systems-columns.csv` keeps, for those hosts only,
  the semi-major axis, the star's mass and luminosity, the eccentricity, the transit time, the
  circumbinary flag, and which radii and masses the archive calculated rather than measured;
  `scripts/build-systems.py` writes `registry/systems-generated.yaml` from the two files. Computed
  there, and labelled as computed wherever it is shown: the orbit's size where the table's own does not
  satisfy Kepler's third law with its period and star mass; the equilibrium temperature (Bond albedo
  0.3; the Earth's is 0.294, NASA Earth Fact Sheet,
  https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html, read 2026-10-08); and the
  habitable zone: **Kopparapu et al. 2014**, *Habitable Zones around Main-sequence Stars: Dependence
  on Planetary Mass*, ApJ Letters 787, L29 (https://arxiv.org/abs/1404.5292, equations 4 and 5 and
  their coefficient table, read 2026-10-08), runaway greenhouse to maximum greenhouse, valid for
  stars of 2 600 to 7 200 K; its 2013 predecessor (ApJ 765, 131, https://arxiv.org/abs/1301.6674)
  was read the same day for the method. The dashed "for scale" rings are Mercury's, Earth's,
  Jupiter's and Neptune's mean distances from the NASA Planetary Fact Sheet
  (https://nssdc.gsfc.nasa.gov/planetary/factsheet/, read 2026-10-08).

### 4.8 Black holes and other extremes — `registry/exotics.yaml`

Ten fact sheets, each read from the Wikipedia article's infobox on 2026-09-08 and carrying that page as
its `source:`; the card prints the source under the numbers. Positions, distances, masses and pulsar
periods are facts; the sentence on each row is this project's. Wikipedia's text is CC BY-SA 4.0 and
none of it is reproduced — only the figures.

### 4.9 Pluto and Jupiter's four big moons — `registry/worlds.yaml`

Five worlds drawn as plain one-colour balls: **no texture or image ships for them.** Each row's
`facts:` names the page every figure and sentence was read from, on 2026-09-22.

- Positions: astronomy-engine (§1). Io, Europa, Ganymede and Callisto are its `JupiterMoons()`, a
  port of the L1.2 theory of Lainey, Duriez and Vienne, added to Jupiter's own position.
- Radii and albedos: NASA Space Science Data Coordinated Archive, *Jovian Satellite Fact Sheet* and
  *Pluto Fact Sheet* (nssdc.gsfc.nasa.gov); Pluto's radius from Wikipedia's *Pluto* infobox. US
  government works; facts.
- What each one is: NASA Science's pages for each world (science.nasa.gov); the sentence on the card
  is this project's.
- Colour and how to see it: Wikipedia's *Pluto*, *Io*, *Europa*, *Ganymede*, *Callisto* and
  *Galilean moons* articles. The colour is this project's choice from those descriptions, and the
  card says so. Wikipedia's text is CC BY-SA 4.0; only a few words are quoted in the registry as
  evidence (`says:`), and no text of it ships to the page.

### 4.10 Dwarf planets and far travellers — `site/js/data/sample.js` `farBodies()`

Ten hand-kept rows: Ceres, Eris, Haumea, Makemake, Sedna, Gonggong, Quaoar, Orcus, ʻOumuamua and
2I/Borisov.

- Orbits: the NASA/JPL Small-Body Database API
  (`https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=<object>&phys-par=1&full-prec=1`), read 2026-09-22.
  Each row states its epoch, the date JPL solved the orbit and the last observation in the fit; each
  card names the database and the solution date. Checked against JPL Horizons vectors for
  2026-09-22 (`tests/test_far_bodies.mjs`). Bundled because JPL's APIs send no CORS header (§4).
- Ceres's diameter and Haumea's rotation period: the same SBDB records.
- The other diameters, the moons and the one line on each card: the Wikipedia article the row names in
  `whySource`, its infobox and lead, read 2026-09-22. Figures only; each sentence is this project's.
  Wikipedia's text is CC BY-SA 4.0 and none of it is reproduced.

### 4.11 Phobos, Deimos, Enceladus, Titan, Triton and Charon — `registry/worlds.yaml`

Six more moons drawn the same way, with **no texture or image**, and every fact read on 2026-09-22.

- Positions: each moon's orbit is a precessing ellipse **fitted by this project to state vectors
  from JPL Horizons** (NASA/JPL Solar System Dynamics; ephemerides MAR099, SAT441, NEP098 and
  PLU060), added to its planet's position from astronomy-engine (§1). The fitted numbers are in
  `site/js/propagate/moons.js` with the error measured against Horizons, and
  `scripts/fit-moon-elements.mjs` re-measures and refits them. The starting poles and precession
  periods were read from JPL's *Planetary Satellite Mean Elements* table.
- Radii: JPL Solar System Dynamics, *Planetary Satellite Physical Parameters*
  (ssd.jpl.nasa.gov/sats/phys_par/). Albedos and the magnitudes of Phobos, Deimos and Charon: NASA
  Space Science Data Coordinated Archive, *Mars*, *Saturnian Satellite*, *Neptunian Satellite* and
  *Pluto* fact sheets. US government works; facts.
- What each one is, and the colours of Enceladus, Charon, Phobos and Deimos: NASA Science's pages for
  each moon; the sentence on the card is this project's.
- Titan's landing, colour and brightness, Enceladus's and Triton's brightness, Triton's colour,
  Charon seen from Earth, the discovery of Mars's moons, and how Neptune can be seen: Wikipedia's
  *Titan*, *Enceladus*, *Triton*, *Charon*, *Phobos*, *Moons of Mars* and *Neptune* articles (CC BY-SA
  4.0; a few words quoted in the registry as evidence, none shipped to the page).

### 4.12 The trip out past Jupiter — `registry/tours.yaml`

Ten cards of words written for this project, from figures and dates read on 2026-09-22. Each stop's
row names its pages in a comment beside the words, with the sentence each number came from.

- NASA Science (science.nasa.gov), US government works, facts: *Io* (the pull of Jupiter and of two
  other moons, and the volcanoes), *Europa* (twice Earth's ocean), *Enceladus* (the jets, their
  speed, what they carry, and the ring they supply) and *Triton* (the geysers and the surface
  temperature Voyager 2 measured).
- NASA Space Science Data Coordinated Archive, *Jovian Satellite Fact Sheet* (nssdc.gsfc.nasa.gov):
  Io's orbital period, 1.769 days.
- Wikipedia (CC BY-SA 4.0; figures and dates are facts, the words on the cards are this project's,
  and the few phrases quoted in the registry are evidence and do not ship to the page):
  *Rings of Saturn*, *Cassini-Huygens*, *Titan*, *Huygens (spacecraft)*, *Voyager 2*,
  *New Horizons*, *Pluto*, *IAU definition of planet*, *90377 Sedna*, *Voyager 1*, *Pale Blue Dot*,
  *Europa Clipper* and *Jupiter Icy Moons Explorer*.
- The distances, the orbits and the dates a card shares with a record it flies to (Eris's 560-year
  lap, Sedna's perihelion, Voyager 1's 172 au, Europa Clipper's arrival and its 49 flybys) come from
  the same sources as those records: JPL's Small-Body Database (§4.10) and JPL Horizons (§4.1 of
  `site/js/data/sample.js`'s own evidence block). `tests/test_outer_trip.mjs` checks the card
  against the record at four dates.

### 4.13 NASA GIBS — today's clouds (2026-09-28)

`site/js/scene/liveclouds.js` asks NASA's Global Imagery Browse Services for three layers, straight
from the visitor's browser (CORS `*`, measured 2026-09-28), a few seconds after the first frame and
again every 15 minutes while the tab is visible — only for a satellite that has a newer picture:

| GIBS layer | Satellite | Operator |
|---|---|---|
| `GOES-East_ABI_Band13_Clean_Infrared` | GOES-19, 75.2° W | NOAA |
| `GOES-West_ABI_Band13_Clean_Infrared` | GOES-18, 137.2° W | NOAA |
| `Himawari_AHI_Band13_Clean_Infrared` | Himawari-9, 140.7° E | Japan Meteorological Agency |

Endpoints: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi` (GetMap, 2048 × 1024 JPEG,
186–246 KB) and `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/{layer}/default/2km/all/{start}--{end}.xml`
(DescribeDomains, ~380 bytes). The colour palette they are drawn in, `Clean_Longwave_Infrared_Window_Band`
(GIBS colormaps v1.3), is copied into `site/js/scene/cloudcompose.js` and saved in
`tests/fixtures/gibs/` so the copy is checked; it is GIBS's work, credited here.

The [GIBS API page](https://nasa-gibs.github.io/gibs-api-docs/) (read 2026-09-28) says NASA "promotes
full and open sharing of data" and asks:

> We ask that users who make use of GIBS in their clients or when referencing it in written or oral
> presentations to add the following acknowledgment:

**We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services
(GIBS), part of NASA's Earth Science Data and Information System (ESDIS).**

The app prints that sentence verbatim in the Sources panel (`COPY.clouds.gibsAcknowledgement`), with
the satellites' operators beside it: GOES imagery is NOAA's (US Government work, see §4.4 for the NWS
terms), and Himawari imagery is JMA's, credited as a courtesy the realism study (2026-09-28) records
NOAA and JMA asking for. Nothing from GIBS is stored in this repository or on our site; each visitor's
browser fetches and composes the pictures itself.

No European or Indian Ocean geostationary satellite is in GIBS, so 6.5° E to 60.6° E and the poles
are the static Solar System Scope cloud map (§2), and the Earth's card says so. EUMETSAT's own
imagery would fill that gap, but its terms of use allow only "personal and non-commercial use"
without authorisation; it is not used.

### 4.14 GDACS — tropical cyclones (2026-09-28)

`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&alertlevel=Green;Orange;Red&pageSize=20`,
read by the browser (CORS `*`, 27.6 KB, measured 2026-09-28) and by the harvester
(`harvest/parsers/gdacs_tc.py`) for the saved copy. GDACS is a cooperation framework of the United
Nations and the European Commission, run by the EC's Joint Research Centre. Its
[terms page](https://www.gdacs.org/About/termofuse.aspx) publishes no licence of its own, and says:

> While we try everything to ensure accuracy, this information is purely indicative and should not
> be used for any decision making without alternate sources of information.

It is EU-owned content, and the [Commission's legal notice](https://commission.europa.eu/legal-notice_en)
(read 2026-09-28) says such content "is licensed under the Creative Commons Attribution 4.0
International (CC BY 4.0) licence" unless otherwise indicated, "provided appropriate credit is given
and changes are indicated". The credit is the card's source line; the change is that each storm is
drawn at its latest advisory point and its numbers are reworded (the card says the wind figure is the
highest on the track, forecast included, which is what GDACS's `severity` is). The advisories behind
GDACS are the forecasting agencies' (NOAA NHC/CPHC, JTWC and others); each card names its agency.
This app is not a warning service, and neither is GDACS.

### 4.15 Natural Earth — the country or sea under a satellite (2026-09-29)

`site/data/places.png` and `site/data/places.json` are built by `scripts/build-places.py` from
Natural Earth 1:50m **Admin 0 – Countries** and **Marine areas** (version 5.x, GeoJSON from
<https://github.com/nvkelso/natural-earth-vector>, SHA-256 in the script). Natural Earth's terms:
"All versions of Natural Earth raster + vector map data found on this website are in the public
domain" (<https://www.naturalearthdata.com/about/terms-of-use/>, read 2026-09-29). No credit is
required; this one is given anyway. What we changed: the polygons are rasterised to 2048 × 1024
(about 20 km a pixel), rivers and reefs are left out, abbreviated names take Natural Earth's long
form, and areas Natural Earth marks *Disputed* or *Indeterminate* (Antarctica apart) are drawn as
plain land, so the card says "land" there and never names a claim. The raster is fetched on the
first card for an Earth orbiter, never at boot.

### 4.16 NASA Solar System Treks — the Moon and Mars close up (2026-10-03)

`site/js/scene/tiles.js` asks NASA's [Solar System Treks](https://trek.nasa.gov) for map tiles of the
ground under the camera, straight from the visitor's browser, when the camera is close enough to the
Moon or Mars for our own 4k map to run out of texels — and never on a first visit, on a phone, on a
connection that asked to save data, or after the frame-rate latch (spec 0065). The sets are rows in
`registry/tilesets.yaml`:

| World | Mosaic | Made by | Finest level asked for |
|---|---|---|---|
| The Moon | `LRO_WAC_Mosaic_Global_303ppd_v02`: Lunar Reconnaissance Orbiter Wide Angle Camera, 643 nm, 100 m per pixel | NASA / Goddard Space Flight Center / Arizona State University | 8 (83 m per pixel on the equator) |
| Mars | `Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly`: Mars Odyssey THEMIS daytime infrared, 100 m per pixel, grey | NASA / JPL-Caltech / Arizona State University | 8 (162 m per pixel) |

Endpoint: the WMTS RESTful template `https://trek.nasa.gov/tiles/{body}/EQ/{mosaic}/1.0.0/default/default028mm/{level}/{row}/{column}.jpg`,
256-pixel tiles of 10 to 65 KB (JPEG for the Moon, PNG for Mars) in plain longitude and latitude; the
[Trek API page](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon) (read 2026-10-03) describes
fetching tiles "without using a WMTS client library". MEASURED 2026-10-03 with
`curl -sI -H "Origin: https://www.spaceradar.ai"`: `Access-Control-Allow-Origin: *` on tiles and on
the capabilities files; level 0 is two tiles (`0/0/0`, `0/0/1`; `0/0/2` and `0/1/0` are 404), both
sets answer to level 8, and level 9 is a 404. A view from a few hundred
kilometres is 60 to 100 tiles, 2 to 3 MB; the cache holds 160 on a laptop and 384 on a desktop.

NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) (read
2026-10-03) say NASA content, "media files used in the rendition of 3-dimensional models, such as
texture maps and polygon data in any format", is "generally ... not subject to copyright in the
United States" and ask that NASA be acknowledged as the source. The Sources panel prints, while the
tiles are on screen:

- The Moon close up: Lunar Reconnaissance Orbiter WAC mosaic, NASA/GSFC/Arizona State University, from NASA Solar System Treks
- Mars close up: THEMIS daytime infrared mosaic, NASA/JPL-Caltech/Arizona State University, from NASA Solar System Treks, as detail over the colour map

**What is changed.** The Moon's tiles are multiplied by three numbers (`grade` in the registry: 3.67,
3.48, 3.45) so the mosaic sits at the tone of the Solar System Scope map it replaces and the ground
does not change colour as the tiles fade in; the WAC mosaic is a reflectance map and far darker than
a picture. Mars's tiles are not shown as a picture at all: THEMIS's mosaic is infrared and grey, so
each tile only multiplies the BRIGHTNESS of our own colour map (its luminance over the mosaic's mean,
clamped to 0.35 to 2.2), and the colour stays Solar System Scope's. What reads as shading is how warm
the ground was in the afternoon, which follows slopes much as sunlight does; it is not a photograph
in visible light, and the mosaic's shading does not turn with our Sun. Nothing from Treks is stored
in this repository or on our site.

Measured and rejected for Mars the same day: `Mars_Viking_MDIM21_ClrMosaic_global_232m` (Viking
MDIM 2.1 colour, CORS `*`, levels 0 to 7). Its frames meet in hard straight edges with a tone step
across them, visible from 400 km.

Also measured the same day and not used: `LRO_LOLA_ClrShade_Global_128ppd_v04` and
`Mars_MGS_MOLA_ClrShade_merge_global_463m` (elevation as shaded colour), CORS `*`.

#### Relief on the Moon and Mars, and the Earth close up (2026-10-06)

Three more pyramids are rows in `registry/tilesets.yaml` since 2026-10-06 (spec 0065 tasks 3 and 4),
fetched under the same rules: never on a first visit, on a phone, with Save-Data, or after the latch.

| World | Mosaic | Made by | Terms | Finest level asked for |
|---|---|---|---|---|
| The Moon, relief | `LRO_LOLA_Shade_Global_256ppd_v06`: shaded relief from the Lunar Orbiter Laser Altimeter, 118 m per pixel | LOLA Science Team, NASA / Goddard Space Flight Center | USGS Astrogeology: "Access Constraints public domain", "Use Constraints Please cite authors" ([page](https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m), read 2026-10-06) | 6 (333 m per pixel; level 7 is a 404) |
| Mars, relief | `Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw`: shaded relief from the MOLA and HRSC blended elevation model, 200 m per pixel | USGS Astrogeology; MOLA: NASA / Goddard Space Flight Center; HRSC: ESA / DLR / FU Berlin | USGS Astrogeology: "Access Constraints MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)", "Use Constraints Please cite authors" ([page](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m), read 2026-10-06) | 7 (325 m per pixel) |
| The Earth | `BlueMarble_ShadedRelief` from NASA GIBS: MODIS Blue Marble, cloud-free, with shaded relief and no sea floor (until 2026-10-13 the layer with shaded bathymetry, `BlueMarble_ShadedRelief_Bathymetry`), 500 m per pixel | NASA Earth Observatory; served by NASA GIBS / ESDIS | "NASA promotes full and open sharing of data"; the acknowledgement of §4.13 is asked for | 7 (489 m per pixel; level 8 is a 400) |

MEASURED 2026-10-06 with `curl -s -D - -H "Origin: https://www.spaceradar.ai"`: `Access-Control-Allow-Origin: *`
on all three. GIBS's grid is not Trek's: a level-0 tile is 288 degrees on a side and 512 pixels, level 0
is two tiles (`0/0/2` and `0/1/0` are 400), level 1 is three by two, and `7/79/159` is the last tile.
Relief tiles are 24 to 65 KB (PNG for the Moon, JPEG for Mars), the Earth's 12 to 54 KB (JPEG). The
Sources panel prints, while they are on screen:

- The Moon's relief: Lunar Orbiter Laser Altimeter shaded relief, LOLA Science Team, NASA/GSFC, from NASA Solar System Treks
- Mars's relief: MOLA and HRSC blended shaded relief, NASA/GSFC (MOLA, CC0) and ESA/DLR/FU Berlin (HRSC, CC BY-SA 3.0 IGO), USGS Astrogeology, from NASA Solar System Treks
- The Earth close up: Blue Marble with shaded relief, NASA Earth Observatory. We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

**What is changed.** The two relief mosaics are never shown as pictures. Each is a drawing of slopes
under one fixed light; the direction of that light was measured against the host's elevation tiles
(from the west on the Moon's, from the north-west on Mars's: the numbers are in the registry rows).
`scene/tiles.js` takes the slope along that one direction and re-lights it with the Sun where it
really is, as steep as the mosaic has it, clamped to 0.3 to 2.2 of the ground's
brightness. The slope across that direction is not in the mosaic and is not drawn, and the world's
card says both. HRSC's share of Mars's relief is CC BY-SA 3.0 IGO: it is fetched by the visitor's
browser from NASA's server, not copied, changed into another file or redistributed by us. The
Earth's tiles are multiplied by three numbers (2.0, 2.3, 2.5) and their water, chosen per pixel
from the tile's own colour, is then lifted by three more (0.0118, 0.0402, 0.1604 in linear light),
so Blue Marble's land and its one flat deep-sea colour both sit at the tone of the day map under
it (until 2026-10-13 the layer carried the shaded sea floor and its water was multiplied 8.3, 5.7,
4.7 times, which drew fracture zones and survey edges as streaks and rectangles on open ocean); they replace the day map's colour only where the ground is lit, and the night lights, the
clouds, the glint and the Moon's shadow are drawn over them as before. Blue Marble's hills are
shaded into the picture under a fixed light, not by our Sun, and it is one picture for every month.
Nothing from Treks or GIBS is stored in this repository or on our site.

### 4.17 NOAA nowCOAST — lightning (2026-10-03)

`https://nowcoast.noaa.gov/geoserver/lightning_detection/wms`, layer `ldn_lightning_strike_density`,
read by each visitor's browser (never by the harvester, and never at the lowest device tier, on a
connection that saves data, or with reduced motion asked for): the 10.6 kB capabilities document for
the newest slot's time, then one 1440 × 420 PNG of about 7 kB, every fifteen minutes while the tab is
visible. Measured 2026-10-03 with `Origin: https://www.spaceradar.ai`: both answer
`access-control-allow-origin: *` and `cache-control: max-age=600, public`.

The layer's own abstract (read the same day) says what it is: "the density of lightning strikes …
during a 15-minute time period at an 8 x 8 km … horizontal resolution observed by ground-based
lightning detection networks", the U.S. National Lightning Detection Network (NLDN) and the Global
Lightning Detection Network (GLD360), in "strikes per square km per minute multiplied by a scaling
factor of 10^3", obtained from the NWS/NCEP Ocean Prediction Center. The networks are Vaisala's and
their stroke data is not public; this is what NOAA publishes from it: "a derived product or Level 5
product (NOAA-generated products using lightning data as input but not displaying the contractor
(Vaisala) transmitted provided lightning data) and is appropriate for public distribution". As a NOAA
product it is a US Government work (§4.4 has the NWS terms). Credited in the Sources panel all the same.

It covers 25° S to 80° N from 110° E eastward across the Pacific and the Americas to 0° W. Europe,
Africa east of Greenwich and most of Asia are not in it, and no lightning is drawn there: the Earth's
card says where the map reaches. Blitzortung's network covers them, but its data may not be reused
without permission and is not used; GOES's own lightning mapper (GLM) is not served by NASA GIBS,
which has only the LIS and OTD climatologies. Nothing from nowCOAST is stored in this repository
beyond one saved picture the test decodes (`tests/fixtures/weather/`).

The winds the other worlds' bands move at, and Mars's seasonal tables, are numbers from published
papers, each named with its DOI in `registry/weather.yaml`; no data file of theirs is shipped.

### 4.18 The sources the harvester reads

Added 2026-10-05, when `tests/test_credits.py` first compared `registry/sources.yaml` with this
file and found nine credit lines missing. The harvester (`harvest/`) reads these on a schedule and
writes each answer, unchanged, to `/data/v1/<id>.json`; the browser reads that saved copy. **That
makes spaceradar.ai, and any release zip that includes `site/data/v1/`, a redistributor of them**
(of every row but the two that are switched off: a source with `enabled: false` is not fetched, not
published, not saved by `scripts/save_offline_data.py` and refused by `scripts/build_release.py`),
which the table in §4 (written when the browser fetched everything itself) does not say. The rows
already covered above (CelesTrak §4.1, Launch Library 2 §4.2, DSN Now §4.3, SWPC's Kp §4.4, the
Exoplanet Archive §4.7, GDACS §4.14) are repeated only where the credit line differs.

| `sources.yaml` id | Publisher | What it gives | Terms, and how far they were checked | Credit line | Host |
|---|---|---|---|---|---|
| `jpl-sbdb-neo`, `jpl-sbdb-comets` | NASA/JPL Solar System Dynamics | orbits of near-Earth asteroids and of comets | NASA/JPL-Caltech; the API's documentation gives no licence text. NASA content is generally not copyrighted in the United States. **Terms page not found in this pass.** | Orbits: NASA/JPL Small-Body Database | `ssd-api.jpl.nasa.gov` |
| `jpl-cad` | NASA/JPL Center for Near Earth Object Studies | close approaches to the Earth | as above | Close approaches: NASA/JPL CNEOS | `ssd-api.jpl.nasa.gov` |
| `horizons-deep-space` | NASA/JPL Solar System Dynamics, Horizons | where each deep-space craft is, as vectors | as above | Ephemerides: JPL Horizons | `ssd.jpl.nasa.gov` |
| `esa-neocc-close` | ESA Near-Earth Object Coordination Centre | ESA's own list of close approaches | **Switched off on 2026-10-09** (`enabled: false`) and no longer fetched, saved, published or shipped. ESA's terms (read that day at `www.esa.int/Services/Terms_and_conditions`, to which the NEOCC portal defers) say: "ESA does not grant the right to resell or redistribute any information, documents, images or material from its website". The harvester had saved this list and the site had served it as `/data/v1/esa-neocc-close.json` since September 2026, before those terms were read in full; no card ever showed it. The close approaches the app draws are JPL's CNEOS, the row above. The row stays here so the reason does. | Close approaches: ESA NEOCC | `neo.ssa.esa.int` |
| `swpc-ovation` | NOAA Space Weather Prediction Center | the OVATION aurora forecast | US Government work, public domain (§4.4) | Aurora forecast: NOAA SWPC | `services.swpc.noaa.gov` |
| `eonet-fires`, `eonet-volcanoes-ice` | NASA Earth Observatory Natural Event Tracker (EONET) | open fires, volcanoes and sea-ice events, saved hourly (internal #525) | §4.20: no licence beyond EONET's disclaimer; NASA content "generally are not subject to copyright in the United States" (<https://www.nasa.gov/nasa-brand-center/images-and-media/>, read 2026-10-09). The events are reported by IRWIN, GDACS, the Smithsonian's Global Volcanism Program and the US National Ice Center; the Smithsonian's terms page answered 403 to our reader on 2026-10-09 and has NOT been read. | Fires, volcanoes and sea ice: NASA EONET | `eonet.gsfc.nasa.gov` |
| `swpc-solar-regions` | NOAA Space Weather Prediction Center | today's sunspot groups (the solar region summary), saved hourly | US Government work, public domain (§4.4; "may be used without charge for any lawful purpose", <https://www.weather.gov/disclaimer>, read 2026-10-09) | Sunspot groups: NOAA SWPC | `services.swpc.noaa.gov` |
| `swpc-edited-events` | NOAA Space Weather Prediction Center | solar flares of the last thirty days (the edited events list), saved hourly | US Government work, public domain (§4.4; <https://www.weather.gov/disclaimer>, read 2026-10-12) | Solar flares: NOAA SWPC | `services.swpc.noaa.gov` |
| `donki-cme-analysis` | NASA Moon to Mars Space Weather Analysis Office and CCMC, DONKI | the analysed coronal mass ejections of the last thirty days, saved every three hours; never asked for by a visitor's browser | No licence named. DONKI's rules of the road and disclaimer (<https://ccmc.gsfc.nasa.gov/tools/DONKI/>, read 2026-10-12): provided "as a courtesy to the community", "as is", "only as prototyping quality and in research context" | Coronal mass ejections: NASA DONKI (M2M Space Weather Analysis Office, CCMC) | `ccmc.gsfc.nasa.gov` |
| `wind` | NOAA/NCEP Global Forecast System, through PacIOOS (University of Hawaii) | the wind ten metres up, one forecast hour | §4.21: "The data may be used and redistributed for free but is not intended for legal use, since it may contain inaccuracies." (the dataset's own licence attribute, read 2026-10-09) | Wind: NOAA/NCEP Global Forecast System, through PacIOOS ERDDAP (University of Hawaii) | `pae-paha.pacioos.hawaii.edu` |
| `ocean-currents` | NOAA CoastWatch (NOAA NESDIS, Laboratory for Satellite Altimetry) | the sea's surface current worked out from satellite altimetry, one day, every fourth point of a quarter-degree grid | §4.22: "Data courtesy of NOAA; Sentinel data courtesy of Copernicus Program; Generated using AVISO+ products. The data may be used and redistributed for free but is not intended for legal use, since it may contain inaccuracies." (the dataset's own licence attribute, read 2026-10-12) | Ocean currents: NOAA CoastWatch, from satellite altimetry (Sentinel data courtesy of the Copernicus Programme; generated using AVISO+ products) | `coastwatch.noaa.gov` |
| `ocean-temperature` | NOAA National Centers for Environmental Information, through the CoastWatch West Coast node (NOAA NMFS SWFSC ERD) | the sea surface temperature (OISST v2.1, near real time), one day, every fourth point | §4.22: "The data may be used and redistributed for free but is not intended for legal use, since it may contain inaccuracies." (the dataset's own licence attribute, read 2026-10-12); NCEI asks for the citation in §4.22 | Sea temperature: NOAA NCEI OISST v2.1, through NOAA CoastWatch West Coast ERDDAP | `coastwatch.pfeg.noaa.gov` |
| `nasa-exoplanet-archive` | NASA Exoplanet Archive, Caltech/IPAC | every confirmed exoplanet | §4.7 | Exoplanets: NASA Exoplanet Archive (Caltech/IPAC), DOI 10.26133/NEA13 | `exoplanetarchive.ipac.caltech.edu` |
| `open-notify-astros` | Open Notify (a personal open-source project) | who is aboard the ISS and Tiangong | The site calls itself "an open source project" and states no licence for the data (read 2026-10-05); the list is a handful of names and facts. | Who is in space: Open Notify | `api.open-notify.org` |
| `wikidata-observatories` | Wikidata | where observatories are | CC0 1.0: Wikidata's structured data is dedicated to the public domain | Observatory locations: Wikidata (CC0) | `query.wikidata.org` |
| `space-track-tip` | 18th Space Defense Squadron, through Space-Track.org | reentry predictions | **Switched off** (`enabled: false`). Space-Track needs an account and its user agreement restricts passing the data on; nothing from it is fetched, saved or shipped. The row exists so the app can say "could not look" about it by name. | Reentry predictions: 18 SDS via Space-Track.org | `www.space-track.org` |

Comets came from the Minor Planet Center (§4.5) until 2026-10-01 and come from JPL's Small-Body
Database since; the site's saved copy may still hold an `mpc-comets` file from before, and §4.5's
condition (name the source) attaches to it for as long as it is served.

### 4.19 NASA GIBS — Earth data overlays (2026-10-05)

`site/js/scene/earthoverlay.js` asks GIBS for ONE picture of the whole globe (WMS GetMap, 2048 × 1024
PNG, transparent where there is no data) when a trip stop or a visitor in What to show asks for an
overlay, and never at boot. The rows are `registry/overlays.yaml`. Measured 2026-10-05 with
`Origin: https://www.spaceradar.ai`: every layer answered `access-control-allow-origin: *` and
`cache-control: max-age=0, no-store`, 94 to 694 kB, in 1.2 to 2.5 s; a date not made yet returns an
empty 8 221-byte picture, which the code steps back from. The acknowledgement GIBS asks for is in
§4.13 and covers these too. The colours are GIBS's own colormaps (v1.3), and each legend in the
registry is seven stops or fewer read from them; no colormap is copied into the site.

| Overlay | GIBS layer | Whose data | Kind |
|---|---|---|---|
| Sea surface temperature | `GHRSST_L4_MUR25_Sea_Surface_Temperature` | GHRSST MUR sea surface temperature, NASA JPL PO.DAAC | daily analysis, gaps filled |
| Sea ice | `GHRSST_L4_MUR25_Sea_Ice_Concentration` | GHRSST MUR sea ice concentration, NASA JPL PO.DAAC | daily analysis, gaps filled |
| Plankton (chlorophyll) | `OCI_PACE_Chlorophyll_a` | Chlorophyll a from the Ocean Color Instrument on PACE, NASA Ocean Biology Processing Group | daily, measured where clear |
| Green land (vegetation) | `MODIS_Terra_NDVI_8Day` | MODIS vegetation index (Terra), NASA LANCE and LP DAAC | rolling eight days, measured |
| Rain and snow | `IMERG_Precipitation_Rate` | IMERG precipitation, NASA Global Precipitation Measurement mission | daily, merged satellite estimate |
| Dust, smoke and haze | `MERRA2_Total_Aerosol_Optical_Thickness_550nm_Extinction_Monthly` | MERRA-2 aerosol optical thickness, NASA Global Modeling and Assimilation Office | monthly mean, reanalysis |
| Water in the air | `MERRA2_Total_Precipitable_Water_Vapor_Monthly` | MERRA-2 total precipitable water vapour, NASA Global Modeling and Assimilation Office | monthly mean, reanalysis |

All are NASA data products. NASA's data use guidance
(<https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance>,
read 2026-10-05) says data from a NASA-led mission are CC0 unless marked otherwise, with "no
restrictions on the use of these data", and asks that the data sets be cited, which this table does. The stop card and the panel print the legend, the day the picture is of, how it
was made and this credit.

### 4.20 NASA EONET — fires, volcanoes and icebergs (2026-10-07)

`site/js/data/eonet.js` asks NASA's Earth Observatory Natural Event Tracker
(<https://eonet.gsfc.nasa.gov/docs/v3>, read 2026-10-07) for its open wildfires with a report in
the last thirty days, and its open volcanoes and sea-ice events, when a visitor ticks "Fires,
volcanoes and icebergs" in What to show, and never at boot. Two requests, no key, no credentials,
no referrer. Measured 2026-10-07 with `Origin: https://www.spaceradar.ai`: both answered
`Access-Control-Allow-Origin: *`, 130 kB (50 fires) and 158 kB (32 volcanoes, 33 icebergs), in 1
to 4 s. The row is `registry/weather.yaml` `earth-events`.

EONET publishes no licence beyond its disclaimer (<https://eonet.gsfc.nasa.gov/what-is-eonet>, read
the same day): "All EONET metadata and services are intended to be used for visualization and
general information purposes only and should not be construed as 'official' with regards to
spatial or temporal extent." Each card says so in its own words, with the date of the event's
last report and the day it was read. The events themselves are reported by others, whom EONET
names on each one and the card repeats: IRWIN (the US Integrated Reporting of Wildland Fire
Information), GDACS, the Smithsonian Institution's Global Volcanism Program, and the US National
Ice Center. Only an event's title, place, date and reported size are shown; nothing is copied
into this repository except nine events in `tests/fixtures/eonet/` for the tests.

### 4.21 NOAA GFS through PacIOOS — the wind (2026-10-07)

Our harvester (`registry/sources.yaml` row `wind`, `harvest/parsers/wind.py`; internal #552) asks the
PacIOOS ERDDAP server (<https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.html>, read
2026-10-07 and 2026-10-09) for one forecast hour of the wind ten metres above the ground, every fifth
degree over the whole globe (37 × 72 points, two components, 168 818 bytes of JSON on 2026-10-09), and
saves it as `/data/v1/wind.json`. `site/js/data/wind.js` reads that saved copy, when a visitor chooses
"Wind" under Earth data in What to show and never at boot, and the choice is offered only while the
manifest lists a copy. A visitor's browser never calls the university's server (it answered in 2 s,
then took 35 s and returned 404, on 2026-10-07). `site/js/scene/wind.js` draws it as moving streaks.

The data is the NOAA/NCEP Global Forecast System, a numerical weather model ("8-day, 3-hourly
forecast for the globe at approximately 50-km or 0.5-deg resolution"), served by the Pacific
Islands Ocean Observing System at the University of Hawaii, which NOAA funds through IOOS. The
dataset's licence attribute, in full: "The data may be used and redistributed for free but is not
intended for legal use, since it may contain inaccuracies. Neither the data Contributor,
University of Hawaii, PacIOOS, NOAA, State of Hawaii nor the United States Government, nor any of
their employees or contractors, makes any warranty, express or implied, including warranties of
merchantability and fitness for a particular purpose, or assumes any legal liability for the
accuracy, completeness, or usefulness, of this information." The legend's sentence names the
model, the forecast hour and the server, and says it is a model and not a measurement. Nothing is
copied into this repository except four rows in `tests/fixtures/wind/head.json`.

Tested the same day and not used: NOAA CoastWatch's ERDDAP copy of the dataset (no
`Access-Control-Allow-Origin` header), NOAA NOMADS (GRIB2 files; its filter script did not
answer), and Open-Meteo (its free API is for non-commercial use only).

### 4.22 NOAA CoastWatch and NOAA OISST — ocean currents (2026-10-12)

"Ocean currents" under Earth data draws moving streaks that follow the sea's surface current and
are coloured by the sea's temperature (`site/js/scene/currents.js`, `site/js/data/currents.js`). It is
made from two datasets, each read by our harvester (`harvest/parsers/sea_grid.py`) and saved as a
packed copy under `/data/v1/`; a visitor's browser reads those copies, when the choice is made and
never at boot, and never calls either server (each answered with no `Access-Control-Allow-Origin`
header on 2026-10-12). The choice is offered only while the manifest lists both copies.

**The currents** (`registry/sources.yaml` row `ocean-currents`): NOAA CoastWatch's "Sea Surface
Currents (Geostrophic), Altimetry (S-3A/B, CryoSat2, Jason-2/3, SARAL), Near Real-Time, Global
0.25°, 2017-present, Daily", dataset `noaacwBLENDEDNRTcurrentsDaily`
(<https://coastwatch.noaa.gov/erddap/griddap/noaacwBLENDEDNRTcurrentsDaily.html>, read 2026-10-12),
institution NOAA NESDIS CoastWatch, made by NOAA's Laboratory for Satellite Altimetry from the Radar
Altimeter Database System (RADS) with the mean dynamic topography MDT CNES/CLS 2013. Its licence
attribute, in full: "Data courtesy of NOAA; Sentinel data courtesy of Copernicus Program; Generated
using AVISO+ products. The data may be used and redistributed for free but is not intended for legal
use, since it may contain inaccuracies. Neither the data Contributor, ERD, NOAA, nor the United
States Government, nor any of their employees or contractors, makes any warranty, express or
implied, including warranties of merchantability and fitness for a particular purpose, or assumes
any legal liability for the accuracy, completeness, or usefulness, of this information." The three
credits that sentence asks for are in the line the legend prints. No page asking for a particular
citation of this product was found that day (the product pages tried on coastwatch.noaa.gov answered
404); the dataset names Eric.Leuliette@noaa.gov as its creator.

**The temperature** (row `ocean-temperature`): NOAA's 1/4° Daily Optimum Interpolation Sea Surface
Temperature (OISST), version 2.1, the near-real-time files, dataset `ncdcOisst21NrtAgg` on the
CoastWatch West Coast node's ERDDAP
(<https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21NrtAgg.html>, read 2026-10-12). Its
licence attribute is the same sentence: "The data may be used and redistributed for free but is not
intended for legal use, since it may contain inaccuracies. [...]". NCEI's record for the dataset
(<https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ncdc:C01606/html>, read
2026-10-12) asks: "Cite as: Huang, Boyin; Liu, Chunying; Banzon, Viva F.; Freeman, Eric; Graham,
Garrett; Hankins, William; Smith, Thomas M.; Zhang, Huai-Min. (2020): NOAA 0.25-degree Daily Optimum
Interpolation Sea Surface Temperature (OISST), Version 2.1. [indicate subset used]. NOAA National
Centers for Environmental Information. https://doi.org/10.25921/RE9P-PT57. Accessed [date]." The
subset used is the sea surface temperature of the newest near-real-time day, every fourth point;
accessed daily by the harvester, first on 2026-10-12.

**What is changed.** Each is one day at every fourth point of the quarter-degree grid (180 × 360),
rounded to a centimetre a second and a tenth of a degree and packed (262 kB and 184 kB, from 4.4 MB
and 3.8 MB of JSON). Nothing is smoothed, filled or interpolated before it is saved. The legend's
sentence gives the day of each, says the current is the steady (geostrophic) flow with no tides and
no wind drift, that it is least sure on the equator, and by how much the motion is sped up. Nothing
of either is in this repository except the 56 points of `tests/fixtures/harvest/sea_grid.json`.

**The colours** are ColorBrewer's seven-class RdYlBu scheme, reversed (Cynthia A. Brewer, Geography,
Pennsylvania State University, <https://colorbrewer2.org>, which marks it colour-blind safe).
ColorBrewer's colour schemes are © Cynthia Brewer, Mark Harrower and The Pennsylvania State
University, under the Apache License 2.0 (<https://github.com/axismaps/colorbrewer>, `LICENCE.txt`,
read 2026-10-12).

Checked the same day and not used: NASA OSCAR (PO.DAAC asks for an Earthdata login), Copernicus
Marine (asks for an account), and NOAA's RTOFS model on NOMADS (files of hundreds of megabytes).

### 4.23 Facts kept by hand, row by row (0076 W2-e)

Four registries are written by hand, and until 2026-10-16 nothing here credited them. Every row names
the page its numbers were read from and the day; facts are not anybody's copyright, and a sentence a
row quotes is evidence for a reviewer and is not shipped to the page. `tests/test_coverage.py` holds
every record of the map to a line of this file (`docs/COVERAGE.md` lists them by class).

- Notable stars: the line on each card is this project's, from the Wikipedia article the row of `registry/stars-notable.yaml` names (CC BY-SA 4.0 text, read from 2026-09-22; the figures only); the measured radii of four of them are §3d-2's.
- Landing sites, dishes and pads: each row of `registry/sites.yaml` names its reference: LROC (Arizona State University) and NASA NSSDCA on the Moon; the PDS Geosciences Node, HiRISE (University of Arizona), Golombek et al. 2020, Wu et al. 2024 (Scientific Reports, CC BY-NC-ND 4.0, one coordinate quoted) and the Mars 2020 mission map (NASA/JPL-Caltech) on Mars; NASA/JPL's DSN Telecommunications Link Design Handbook (810-005, module 301) for the Deep Space Network's dishes; Wikipedia for the two pads.
- Rockets: the heights, widths and shapes in `registry/rockets.yaml` come from the user's guides, agency pages and Wikipedia articles each row's `source:` names; which rocket is launching when is Launch Library 2's (§4.2).
- Oddities: each row of `registry/oddities.yaml` cites where it was read: JPL Horizons, LROC and NASA, The Planetary Society, Space.com, collectSPACE, Space Center Houston, Andy Saunders's 2021 work from the Apollo 14 film and Astronomical Returns, each as its row says, with how sure its place is.

## 4.6 Third-party trademarks the app names or draws

None of the marks below is licensed to this project and none is used as a badge of origin. They are
named because naming what a thing actually is, is the point of the card it appears on. With the one
exception recorded first, no wordmark, logo or typeface belonging to any of them is reproduced.

### The GitHub logo — the one third-party logo this app draws

The link in the top corner of the page draws **GitHub's own mark** (the "Invertocat").
**GitHub logo © GitHub, Inc.** It is a trademark of GitHub, Inc., it is **not licensed to this
project**, and it is not a badge of origin: it marks a link to this project's repository on
GitHub, which is the use GitHub's brand guidelines permit.

* **What ships.** An inline SVG `path` in `site/js/ui/github.js`, and nothing else — no image file
  is added to the tree. The `registry/models.yaml` row is `marks[github-invertocat]`.
* **Where it came from, measured.** `icons/mark-github-24.svg` in GitHub's own
  [primer/octicons](https://github.com/primer/octicons), git blob
  `81949e7b460a7bbf1cb2431462f6bd947e32f0ce`, fetched 2026-09-07. The `d` attribute in
  `github.js` was compared byte for byte against that file's and is identical. The blob sha was
  read back from GitHub's contents API for the same path, so the file the hash describes is the
  file upstream serves — not a hash of something recalled.
* **It is unmodified, and that is the condition.** The path data is untouched. The only thing
  applied to it is `fill: currentColor`, which is how the published file already asks to be
  coloured — it carries no fill of its own — so the app's dim-text token tints the glyph without
  altering the shape. Nothing is drawn beside it, nothing is lettered next to it, and the glyph is
  not restyled. `scripts/check_registry.py` refuses a `marks` row whose `modified` field is
  anything but empty, because a modified logo is a logo used outside the permission.
* **What this is not.** It is not original work of this project, it is not covered by this
  project's MIT licence, and a fork that keeps it is using GitHub's mark under GitHub's terms, not
  under ours. octicons' own code is MIT; the trademark in the drawing is not, and MIT on the
  repository does not license the mark.

* **LEGO** is a trademark of the LEGO Group, and in the EU the *minifigure shape itself* is a
  registered three-dimensional mark, independent of any copyright in a model. The `oddities` layer
  draws three aluminium minifigures riding Juno, low-detail and in the project's own toon material.
  **The decision to draw that silhouette at all is Ivan's and has not been recorded**; the note on
  the `juno-lego-figures` row in `registry/oddities.yaml` says the same thing, and blunting the
  head-stud and the ring hands is one builder and one row if the answer is no.
* **Star Wars**, **Return of the Jedi** and the lightsaber hilt design are trademarks of
  Lucasfilm Ltd. / The Walt Disney Company. The app names the prop and deliberately does **not**
  draw it: what the `rotj-lightsaber` row draws is the real-world donor part the prop was built
  from, a Graflex 3-cell press-camera flash handle, and the card says exactly that.
* **SpaceX**, **Dragon** and **Crew Dragon** are trademarks of Space Exploration Technologies
  Corp. The app names the spacecraft and, since 2026-10-13, draws two shapes built here from
  published dimensions (`dragon-crew.glb`, `dragon-cargo.glb`, section 3b-5). No wordmark, logo,
  insignia or flag is on either, and the white, the dark cells and the red seal ring are this
  project's own flat colours.
* **Tesla** and **Roadster** are trademarks of Tesla, Inc. The `tesla-roadster` row draws a
  first-generation Roadster in the project's own geometry; no Tesla badge, wordmark or published
  paint colour is reproduced, and the card says the red is ours.

## 5. Corrections to `registry/models.yaml`

`registry/models.yaml` is the project's own record of asset provenance, and CI only checks that each
row *has* a licence string — not that the row describes a file that exists. Three things in it are
not true of the shipped tree, recorded here so the public repo does not carry a wrong claim:

1. **The 19 `models:` rows described files that did not exist.** At the time of the audit there was
   no `models/` directory and nothing loaded a `.glb`; `site/js/scene/models.js` built every object
   from three.js primitives, and five rows nonetheless claimed ISS, Hubble, JWST and Voyager
   geometry "decimated from" NASA 3D Resources. Those rows now describe the procedural geometry
   that actually ships.

   **This has since changed, and section 3b is the current record.** Twenty-nine real NASA models
   were added afterwards and they *are* in the tree, under `site/models/`, correctly credited and
   with their modifications stated. The `real_models:` section of the registry describes them, and
   `scripts/check_registry.py` now refuses a row there whose file is missing — which is the check
   that would have caught this audit's finding in the first place.
2. **`earth-night` is credited to NASA Earth Observatory.** The shipped `2k_earth_nightmap.webp` is a
   Solar System Scope file. CC BY 4.0, not public domain — and CC BY has an attribution obligation
   that "Public domain (NASA)" does not discharge.
3. **`starfield` is credited to NASA SVS 4851**, with a long required credit line naming Gaia DR2
   and the IAU/Sky & Telescope constellation figures. The shipped `2k_stars_milky_way.webp` is a
   Solar System Scope file. That NASA credit line is for an asset the repository does not contain.

Items 2 and 3 are the ones that matter: they are wrong licence claims on files that are actually
CC BY 4.0. This file supersedes them.

## 6. Full licence notices

These notices must travel with any redistribution of this repository. Do not delete this section.

### three.js — MIT

Applies to `site/vendor/three.core.min.js`, `site/vendor/three.module.min.js`.

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### Lucide — ISC, and MIT for the icons derived from Feather

Applies to the `ICONS` table in `site/js/ui/cards.js`. Lucide's `LICENSE`, as published (its list
of Feather-derived icons is shortened here to the four this app ships: `x`, `crosshair`,
`chevron-right`, `navigation`):

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

[...] chevron-down, chevron-left, chevron-right, [...] code, [...] compass, copy, [...] crop, crosshair, [...] download, [...] external-link, [...] maximize, [...] minimize, [...] more-vertical, move, navigation, [...] share, [...] x, [...]

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### satellite.js — MIT

Applies to `site/vendor/satellite.esm.js`, which carries no notice of its own.

```
MIT License

Copyright (C) 2013 Shashwat Kandadai, UCSC Jack Baskin School of Engineering

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### astronomy-engine — MIT

Applies to `site/vendor/astronomy.js`. This is the notice as it appears inside the shipped file.

```
Astronomy library for JavaScript (browser and Node.js).
https://github.com/cosinekitty/astronomy

MIT License

Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ktx-parse and zstddec — MIT, with Zstandard's BSD licence

Applies to `site/vendor/basis/ktx-parse.module.js` and `site/vendor/basis/zstddec.module.js`. The
two projects carry the same MIT notice (© 2020 Don McCurdy); this is zstddec's `LICENSE` in full,
which adds the licence of the Zstandard decoder compiled into it.

```
The MIT License (MIT)

Copyright (c) 2020 Don McCurdy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

***

BSD License

For Zstandard software

Copyright (c) 2016-present, Yann Collet, Facebook, Inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.

 * Neither the name Facebook nor the names of its contributors may be used to
 endorse or promote products derived from this software without specific
 prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Basis Universal — Apache License 2.0

Applies to `site/vendor/basis/basis_transcoder.js` and `site/vendor/basis/basis_transcoder.wasm`,
unmodified from three.js r185's `examples/jsm/libs/basis/`. Copyright 2019-2026 Binomial LLC.

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019-2026 Binomial LLC

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### d3-celestial — BSD-3-Clause

Applies to `site/data/stars.bin`, `site/data/constellations.lines.json`,
`site/data/constellation-names.json`. Clause 2 is why this block exists: `stars.bin` is a binary
redistribution and this is the accompanying documentation that reproduces the notice.

```
Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Solar System Scope textures — CC BY 4.0

Applies to the 13 Solar System Scope files at the top of `site/textures/`, and to `4k/earth_water.webp`, `4k/moon.webp`,
`4k/mars.webp` and `4k/jupiter.webp`.

```
Planet and star textures © Solar System Scope — https://www.solarsystemscope.com/textures/
Licensed under the Creative Commons Attribution 4.0 International License
https://creativecommons.org/licenses/by/4.0/
The 2k files: used unmodified (three re-encoded to WebP, same pixels).
The 4k files: resampled from the 8k originals, re-encoded as WebP; the water mask box-filtered.

The publisher's stated terms: "Distributed under Attribution 4.0 International license:
You may use, adapt, and share these textures for any purpose, even commercially."
```

The full CC BY 4.0 legal code is at <https://creativecommons.org/licenses/by/4.0/legalcode>. It is
not reproduced here; the licence itself requires a link or a copy, and the link above is that link.

### HYG Stellar Database — CC BY-SA 4.0

Applies to `site/data/stars3d.bin` and `site/data/stars3d.names.json`, which are derivative works
and are offered under the same licence.

```
Star data from the HYG Stellar Database v4.4, © David Nash — https://codeberg.org/astronexus/hyg
Licensed under the Creative Commons Attribution-ShareAlike 4.0 International License
https://creativecommons.org/licenses/by-sa/4.0/
Modified: rows without a measured distance removed; coordinates rotated to ecliptic J2000 and
converted to light-years; fields reduced to position, magnitudes, colour index, names, spectral type.
```

The full CC BY-SA 4.0 legal code is at <https://creativecommons.org/licenses/by-sa/4.0/legalcode>.

### OpenNGC — CC BY-SA 4.0

Applies to `site/data/dso.json`, a derivative work offered under the same licence.

```
Deep-sky object data from OpenNGC, © Mattia Verga — https://github.com/mattiaverga/OpenNGC
Licensed under the Creative Commons Attribution-ShareAlike 4.0 International License
https://creativecommons.org/licenses/by-sa/4.0/
Modified: reduced to the 110 Messier objects; coordinates converted to degrees and to positions in
light-years using distances from the sources each row names; fields reduced to those the card prints.
```

### Constellation figures by Johan Meuris — Free Art License 1.3

Applies to `site/data/skyart/*.webp`, and to nothing else in this repository.

```
Constellation figures, drawn for Stellarium by Johan Meuris (http://www.johanmeuris.eu/).
Originals: https://github.com/Stellarium/stellarium/tree/a8469197a65de582f6b0ebd82b85173145241b79/skycultures/modern/illustrations
Modified by the Space Radar contributors, 2026-10-06: each PNG re-encoded as a WebP at its
original pixel size; nothing redrawn, cropped or recoloured.

Copyleft: these are free works, you can copy, distribute, and modify them under the terms of the
Free Art License https://artlibre.org/licence/lal/en/
```

### Stellarium sky cultures — CC BY-SA 4.0

Applies to `site/data/skyart/index.json`, `site/data/skycultures/chinese.json`,
`site/data/skycultures/maori.json`, `site/data/skycultures/hawaiian.json`.

```
Sky-culture data from Stellarium (https://github.com/Stellarium/stellarium, skycultures/), by the
contributors named in §3i, adapted by the Space Radar contributors (2026-10-06): star numbers
replaced by sky coordinates, lines only.

Licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
https://creativecommons.org/licenses/by-sa/4.0/
```

## 7. Build and CI only

Not shipped to the browser, listed for completeness. These are pulled at CI time and none of them
is vendored in the tree.

| Item | Where | Licence |
|---|---|---|
| PyYAML | `scripts/check_registry.py`, `tests/` — installed by `ci.yml` | MIT |
| Playwright | `scripts/shots.mjs`, `screens.yml`, `readme-shots.yml` — from the `mcr.microsoft.com/playwright` image | Apache-2.0 |
| `actions/checkout`, `actions/setup-python`, `actions/upload-artifact` | `.github/workflows/` | MIT |
| esbuild 0.25.9 (Evan Wallace) | `scripts/minify_site.py --esbuild`, run by a deploy and by `screens.yml` over the ES modules; one binary fetched from the npm registry by `scripts/get_esbuild.py` and refused unless it matches the SHA-512 npm published and the SHA-256 recorded there; never in the tree and never on the site (its output is our own code, minified) | MIT |
| FFmpeg (with libopus) | `scripts/build-audio.py` and `scripts/narrate.py`, run by hand to make `site/audio/`; not in the tree | LGPL-2.1+ / GPL builds |
| kokoro-onnx 0.6.1, ONNX Runtime 1.23.2 | `scripts/narrate.py`, run by hand to make `site/audio/narration/`; not in the tree | MIT |
| misaki 0.9.4 (grapheme-to-phoneme), with spaCy `en_core_web_sm` and espeak-ng as its fallback | the same; words to phonemes, at build time only | Apache-2.0; MIT; GPL-3.0-or-later (espeak-ng: a tool that is run, never linked into or shipped with the app) |

## 8. Acknowledgements

Published methods used in `site/js/`, implemented from the papers rather than copied from anyone's
code. No licence attaches; the credit is owed anyway.

- **B−V colour index → effective temperature**: F. J. Ballesteros (2012), *New insights into black
  bodies*, EPL **97**, 34008. Used in `site/js/scene/starfield.js`.
- **Black-body temperature → sRGB**: Tanner Helland's piecewise approximation (2012). Used in
  `site/js/scene/starfield.js`.
- **SGP4/SDP4**: Hoots & Roehrich, *Spacetrack Report #3*; David Vallado et al., *Revisiting
  Spacetrack Report #3* (AIAA 2006-6753). Reaches this project through satellite.js.

Fonts are in [§10](#10-fonts). (This paragraph said "no third-party fonts are used" until
2026-10-05; that stopped being true on 2026-09-28.)

## 9. Audio — music and sounds

Spec 0035 (2026-09-23). Every sound the app can play, all public domain (CC0). None of it is
downloaded until a visitor turns sound on. `registry/audio.yaml` carries the page each file was
read from, its read date, the downloaded original's URL and SHA-256, and how
`scripts/build-audio.py` cut it; `scripts/check_registry.py` refuses a row whose credit is not in
this section word for word, and a line here for a file that does not ship.

CC0 asks for no credit. It is given anyway: the Sources panel in the app prints the credit column.

| File | Used for | Licence | Credit line | Source |
|---|---|---|---|---|
| `bed-ladder.opus`, `bed-ladder.m4a` | the bed on the scale ladder's rungs | CC0 1.0 | Fake Vega by John Bartmann, CC0 | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/fake-vega-master/> |
| `bed-earth.opus`, `bed-earth.m4a` | the bed at the Earth and the Moon | CC0 1.0 | Above the Clouds by John Bartmann, CC0 | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/above-the-clouds-master/> |
| `bed-world.opus`, `bed-world.m4a` | the bed at any other world | CC0 1.0 | Calabi-Yau by John Bartmann, CC0 | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/calabi-yau-master/> |
| `bed-sun.opus`, `bed-sun.m4a` | the bed on the Sun's own stage | CC0 1.0 | Edge of the Sky by John Bartmann, CC0 | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/edge-of-the-sky-master/> |
| `sting-arrive.opus`, `sting-arrive.m4a` | a trip's camera arriving at a stop | CC0 1.0 | Crystal Twinkle by LaurenPonder (Freesound), CC0 | <https://freesound.org/people/LaurenPonder/sounds/639429/> |
| `sting-stage.opus`, `sting-stage.m4a` | a trip's stage change, in the black | CC0 1.0 | Deep Whoosh #6 by Kinoton (Freesound), CC0 | <https://freesound.org/people/Kinoton/sounds/558826/> |
| `sting-end.opus`, `sting-end.m4a` | a trip's end card | CC0 1.0 | harp flourish by nathanmanaker (Freesound), CC0 | <https://freesound.org/people/nathanmanaker/sounds/486952/> |

The four beds are from John Bartmann's *100 Ambient Atmospheric Soundtracks: Straylight Drones
Collection* on the Free Music Archive, each page reading "CC0 1.0 Universal License" (read
2026-09-23). Freesound's page for each sting reads: "You can copy, modify, distribute and perform
the sound, even for commercial purposes, all without the need of asking permission to the
author." (read 2026-09-23).

Modified: each bed is a 72 s cut of a 4:04 piece with its last 4 s cross-faded into its first so
it loops, levelled to −23 LUFS; each sting is trimmed to 2.5–3 s with a fade and levelled to
−21 LUFS; all are re-encoded to Opus 64 kbps and AAC 64 kbps. The stings are made from Freesound's
HQ previews, not the uploaded originals.

## 9b. Audio — the trips' narration (a synthetic voice)

Spec 0069 (2026-10-03). Each stop of a guided trip can be read aloud. **The voice is synthetic**:
the files under `site/audio/narration/` were made offline by `scripts/narrate.py` from the stops'
own words in `registry/tours.yaml`, and no person recorded them. The app says so on the control
that turns the voice on and in its Sources panel, which prints this line:

> Narration: a synthetic voice, Kokoro-82M (af_heart), Apache-2.0

| What | Used for | Licence | Source |
|---|---|---|---|
| Kokoro-82M, model weights v1.0 and the voice `af_heart` (American English; `bf_emma`, British, until 2026-10-12) | synthesising every clip, at build time; the model itself is not shipped | Apache-2.0 | <https://huggingface.co/hexgrad/Kokoro-82M> (read 2026-10-03; the voice's row in `VOICES.md` read 2026-10-12: grade A, the highest of the model's voices, and no separate licence or attribution column for the American English voices, so the model's Apache-2.0 covers it); the ONNX export and `voices-v1.0.bin` from <https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0> |

The model's card reads: "Kokoro is an open-weight TTS model with 82 million parameters … with
Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal
projects." `registry/narration.yaml` records the SHA-256 of both model files, the versions of the
tools the render ran with, the pronunciation lexicon, and a hash per clip; `scripts/narrate.py
--check` refuses a stop whose words have changed since its clip was made. Each clip is levelled to
−16 LUFS and encoded to Opus 32 kbps mono with an AAC twin; the captions beside it (`.vtt`) are the
card's own sentences. Nothing here is downloaded until a visitor turns sound on.

The voice is American and the cards are spelt the British way ("kilometres", "the centre"): the
captions show the card, and the voice says the same words with its own accent. Since 2026-10-12 a
stop is said two or three sentences at a time instead of one, at close to the voice's natural
speed, with pauses whose length follows what was just said; `registry/narration.yaml` says what
was measured before and after, and that a machine chose the setting.

Why this model and not another: the spec ordered the choice by licence. XTTS-v2 (Coqui Public Model
Licence) and F5-TTS (CC BY-NC) forbid commercial use and were refused; Piper (MIT code, per-voice
licences) was the fallback and was not needed.

## 10. Fonts

Spec 0045 (2026-09-28). Three families, self-hosted in `site/fonts/`, all under the SIL Open Font
License 1.1. None of the three declares a Reserved Font Name, so the subsets keep their names. The
licence text travels with the files as `site/fonts/OFL-*.txt`, byte for byte the upstream file;
`scripts/build-fonts.py --check` refuses a licence file that differs, a subset it did not make,
and a family with no row here.

| Family | Version | Licence | Credit line | Source |
|---|---|---|---|---|
| Inter | 4.1 (font version 4.001), weights 400 and 600 | SIL OFL 1.1 | © 2016 The Inter Project Authors | <https://github.com/rsms/inter> (release v4.1, `extras/ttf/`) |
| Barlow Semi Condensed | 1.408, weights 500 and 600 | SIL OFL 1.1 | © 2017 The Barlow Project Authors | <https://github.com/jpt/barlow>, files from <https://github.com/google/fonts/tree/main/ofl/barlowsemicondensed> |
| JetBrains Mono | 2.304, weights 400 and 500 | SIL OFL 1.1 | © 2020 The JetBrains Mono Project Authors | <https://github.com/JetBrains/JetBrainsMono> (release v2.304, `fonts/ttf/`) |

Modified: each file is subset with fontTools to a Latin and (Inter, JetBrains Mono) a Cyrillic
character range, hinting removed, and saved as WOFF2. Inter and Barlow keep `tnum`, the tabular
figures; JetBrains Mono drops `calt`, its programming ligatures. Barlow Semi Condensed has no
Cyrillic, so it has no Cyrillic file. The upstream files' SHA-256 are in `scripts/build-fonts.py`.
