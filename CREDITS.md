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
| Deep-sky objects | OpenNGC; Wikipedia for distances | CC BY-SA 4.0; facts, cited per row | [3d](#3d-deep-sky-objects--openngc-cc-by-sa-40-and-the-distances-wikipedias-editors-collected) |
| The Milky Way | our illustration, from Reid et al. 2019 | measurements, cited | [3e](#3e-the-milky-way-model--an-illustration-built-from-published-measurements) |
| 3D spacecraft models | NASA 3D Resources | public domain (NASA media guidelines) | [3b](#3b-3d-models--nasa-public-domain) |
| Black-hole photographs | Event Horizon Telescope | CC BY 4.0 | [3f](#3f-the-two-photographs--event-horizon-telescope-cc-by-40) |
| Nebula and galaxy photographs | ESA/Hubble, ESO, NOIRLab | CC BY 4.0 | [3g](#3g-the-photographs-of-the-nebulae-and-galaxies--esahubble-eso-and-noirlab-cc-by-40) |
| The sky in other light | NASA's WISE, WMAP and Fermi, as HiPS from CDS | NASA data, no copyright claimed; tiles ODbL 1.0 | [3h](#3h-the-sky-in-other-light--nasas-wise-wmap-and-fermi-through-cds-hips) |
| Satellites and their orbits | CelesTrak | free, with an enforced usage policy | [4.1](#41-celestrak--read-this-before-you-deploy-a-fork) |
| Launches | The Space Devs, Launch Library 2 | free to 15 requests an hour; no published licence | [4.2](#42-the-space-devs--launch-library-2) |
| Deep-space positions, asteroids, comets, close approaches | NASA/JPL Horizons, Small-Body Database, CNEOS; ESA NEOCC | see the section | [4.18](#418-the-sources-the-harvester-reads) |
| Space weather and the aurora | NOAA SWPC | public domain | [4.4](#44-noaa-swpc) |
| Exoplanets | NASA Exoplanet Archive | public; cite the DOI | [4.7](#47-nasa-exoplanet-archive--confirmed-planets) |
| Today's clouds | NASA GIBS (GOES, Himawari) | open; acknowledgement asked | [4.13](#413-nasa-gibs--todays-clouds-2026-09-28) |
| Storms, lightning | GDACS; NOAA nowCOAST | CC BY 4.0; public domain | [4.14](#414-gdacs--tropical-cyclones-2026-09-28), [4.17](#417-noaa-nowcoast--lightning-2026-10-03) |
| Moon and Mars close-up tiles and relief; the Earth close up | NASA Solar System Treks; USGS Astrogeology; NASA GIBS | NASA content; HRSC's share of Mars's relief CC BY-SA 3.0 IGO | [4.16](#416-nasa-solar-system-treks--the-moon-and-mars-close-up-2026-10-03) |
| Countries and seas | Natural Earth | public domain | [4.15](#415-natural-earth--the-country-or-sea-under-a-satellite-2026-09-29) |
| Dishes, crews, observatories | NASA DSN Now; Open Notify; Wikidata | see the section; CC0 for Wikidata | [4.3](#43-nasa--dsn-now), [4.18](#418-the-sources-the-harvester-reads) |
| Music and sounds | John Bartmann (Free Music Archive); Freesound contributors | CC0 1.0 | [9](#9-audio--music-and-sounds) |
| The trips' voice | Kokoro-82M, a synthetic voice | Apache-2.0 | [9b](#9b-audio--the-trips-narration-a-synthetic-voice) |
| Typefaces | Inter, Barlow Semi Condensed, JetBrains Mono, Instrument Serif | SIL OFL 1.1 | [10](#10-fonts) |
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

**Lucide** — the app's one icon family, copied element for element from `icons/<name>.svg` on
Lucide's `main` branch (<https://github.com/lucide-icons/lucide>, read 2026-10-01 to 2026-10-03).
In `site/js/ui/cards.js` (`ICONS`, where `chevron` is Lucide's `chevron-right`): `x`, `crosshair`,
`orbit`, `camera`, `share`, `chevron-right`, `chevron-left`, `navigation`, `telescope`, `play`,
`pause`, `rotate-ccw`, `volume-2`, `volume-x`, `speech`, `panel-left-close`, `panel-left-open`,
`panel-bottom-close`, `panel-bottom-open`, `compass`, and for present mode (read 2026-10-06)
`presentation`, `maximize`, `minimize`, `timer`, `house`. In `site/js/ui/sharesheet.js`: `x`, `share`,
`copy`, `download`, `file-text` (its `file`), `mail`, `crop`, `code`, `chevron-down`. In
`site/js/ui/photomode.js`: `x`, `download`. In `site/js/ui/embed.js`: `external-link`. In
`site/js/ui/rail.js`: `share`, `ellipsis-vertical`, `eye-off`. In `site/js/ui/keyhint.js`: `move`,
`mouse`. The only change is the
stroke, 1.75 instead of Lucide's default 2, which `docs/ui-guide.md` §3.16 sets for every icon in
the app (`tests/test_a11y_static.mjs` holds it); Lucide draws at any stroke width by design. These
are on Lucide's own list of icons derived from Feather (its `LICENSE`, read 2026-10-05), which are
MIT, © Cole Bemis: `x`, `crosshair`, `chevron-right`, `chevron-left`, `navigation`, `share`,
`compass`, `copy`, `download`, `move`, `crop`, `code`, `chevron-down`, `external-link`, and
`ellipsis-vertical` under its Feather name
`more-vertical`; the rest are ISC. Both notices are in [§6](#6-full-licence-notices).
`tests/test_a11y_static.mjs` refuses an `ICONS` name this paragraph does not list.

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
| `2k_sun.jpg` | the Sun | CC BY 4.0 | Solar System Scope |
| `2k_mercury.jpg` | Mercury | CC BY 4.0 | Solar System Scope |
| `2k_venus_atmosphere.jpg` | Venus | CC BY 4.0 | Solar System Scope |
| `2k_earth_daymap.jpg` | Earth, day side | CC BY 4.0 | Solar System Scope |
| `2k_earth_nightmap.webp` | Earth, night side | CC BY 4.0 | Solar System Scope |
| `2k_earth_clouds.webp` | Earth cloud layer | CC BY 4.0 | Solar System Scope |
| `2k_moon.jpg` | the Moon | CC BY 4.0 | Solar System Scope |
| `2k_mars.jpg` | Mars | CC BY 4.0 | Solar System Scope |
| `2k_jupiter.jpg` | Jupiter | CC BY 4.0 | Solar System Scope |
| `2k_saturn.jpg` | Saturn | CC BY 4.0 | Solar System Scope |
| `2k_saturn_ring_alpha.png` | Saturn's rings | CC BY 4.0 | Solar System Scope |
| `2k_uranus.jpg` | Uranus | CC BY 4.0 | Solar System Scope |
| `2k_neptune.jpg` | Neptune | CC BY 4.0 | Solar System Scope |
| `2k_stars_milky_way.webp` | the Milky Way sky sphere | CC BY 4.0 | Solar System Scope |

**What could not be verified, stated plainly.** solarsystemscope.com answers HTTP 403 to scripted
downloads, so these files could not be byte-compared against the origin. Provenance rests on the
exact filename match to the published pack (all 14 appear on their download list), the matching
2048 × 1024 dimensions, and the shared XMP fingerprint. `2k_uranus.jpg` and `2k_neptune.jpg` carry
no XMP block at all — the other twelve do — so those two are the weakest links in the chain. If you
want certainty, re-download the pack by hand and diff.

**Twenty moon and dwarf-planet maps are public domain (issue #262, 2026-09-28; issues #387 to #415,
2026-10-05).** Every world in `registry/worlds.yaml` that was one flat colour now wears a map, except
Deimos, for which no public-domain mosaic was found. They come from the USGS Astrogeology Science
Center's global mosaics (<https://planetarymaps.usgs.gov/mosaic/>; "USGS-authored or produced data
and information are considered to be in the U.S. Public Domain", usgs.gov, *Copyrights and
Credits*) and from NASA maps mirrored on Wikimedia Commons, where each file's page says public
domain. Public-domain works need no credit, but they get one anyway. `scripts/build-textures.py`
(`--only moons`) remakes every one of them but Triton's from its original, and every map was
changed:

- resized (the width is in `registry/textures.yaml`; no file is over 250 kB) and, where the original
  is centred on longitude 180, rolled half a turn so longitude 0, the side that faces the planet,
  is at the centre;
- **the black-and-white mosaics are tinted** with the world's flat colour, which is chosen from
  published descriptions: Europa, Ganymede, Callisto, Titan, the five moons of Uranus, Pluto,
  Charon and Phobos. Only the pattern of light and dark is measured. Charon's red polar cap and
  Pluto's colours are therefore not shown;
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
| `2k_titan_cassini_iss.webp` | Titan | Public domain | [USGS Astrogeology Science Center and NASA/JPL-Caltech/Space Science Institute (Cassini ISS, 938 nm)](https://planetarymaps.usgs.gov/mosaic/Titan_ISS_P19658_Mosaic_Global_4km.lbl): Cassini ISS near-infrared mosaic (PIA19658), greyscale | 100 % |
| `1k_triton_voyager.jpg` | Triton | Public domain | [NASA/JPL-Caltech/LPI, Voyager 2](https://commons.wikimedia.org/wiki/File:Triton_Map.jpg) | 70 % |
| `1k_miranda_voyager.webp` | Miranda | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Miranda_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 39 % |
| `1k_ariel_voyager.webp` | Ariel | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Ariel_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 34 % |
| `1k_umbriel_voyager.webp` | Umbriel | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Umbriel_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 37 % |
| `1k_titania_voyager.webp` | Titania | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Titania_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 32 % |
| `1k_oberon_voyager.webp` | Oberon | Public domain | [NASA/JPL-Caltech/USGS (Voyager 2)](https://commons.wikimedia.org/wiki/File:Oberon_map_JPL_USGS.jpg): Voyager 2 mosaic, greyscale; the north is unseen | 34 % |
| `2k_pluto_usgs.webp` | Pluto | Public domain | [USGS Astrogeology Science Center and NASA/JHUAPL/SwRI (New Horizons)](https://planetarymaps.usgs.gov/mosaic/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.lbl): New Horizons LORRI and MVIC mosaic, greyscale | 77 % |
| `2k_charon_usgs.webp` | Charon | Public domain | [USGS Astrogeology Science Center and NASA/JHUAPL/SwRI (New Horizons)](https://planetarymaps.usgs.gov/mosaic/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.lbl): New Horizons LORRI and MVIC mosaic, greyscale | 74 % |
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
| `4k/milky_way.webp` | the Milky Way sky sphere | NASA SVS Deep Star Maps 2020, `milkyway_2020_4k_gal.exr`, the background without the Hipparcos and Tycho stars (<https://svs.gsfc.nasa.gov/4851/>) | "Please give credit for this item to: NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC." | flipped top to bottom, brightness matched to the 2k map, 60 % saturation, sRGB, WebP 90 |
| `4k/moon.webp`, `4k/mercury.webp`, `4k/mars.webp`, `4k/jupiter.webp` | those worlds, close up | Solar System Scope `8k_moon.jpg`, `8k_mercury.jpg`, `8k_mars.jpg`, `8k_jupiter.jpg` (Jupiter's is 4096 wide) | CC BY 4.0, as tier 0 | resampled to 4096 × 2048, WebP (72 for the Moon and Mercury, 84 otherwise) |

**Credit lines printed in the app** (the Sources panel lists the ones in use on the device; each is
checked against this list by `scripts/check_registry.py`):

- Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0
- Earth by day (4k): Blue Marble Next Generation, NASA Earth Observatory
- Earth at night (4k): Black Marble 2016, NASA Earth Observatory
- Earth water mask (4k): Solar System Scope (solarsystemscope.com), CC BY 4.0
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
- Titan map: USGS Astrogeology Science Center and NASA/JPL-Caltech/Space Science Institute (Cassini ISS, 938 nm), public domain
- Triton map: NASA/JPL-Caltech/Lunar and Planetary Institute (Voyager 2), public domain
- Miranda map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Ariel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Umbriel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Titania map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Oberon map: NASA/JPL-Caltech/USGS (Voyager 2), public domain
- Pluto map: USGS Astrogeology Science Center and NASA/JHUAPL/SwRI (New Horizons), public domain
- Charon map: USGS Astrogeology Science Center and NASA/JHUAPL/SwRI (New Horizons), public domain
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

Fifty-two spacecraft, spacecraft-bus, antenna, rocket-stage and surface models ship in `site/models/`, all
from **NASA 3D Resources** (<https://github.com/nasa/NASA-3D-Resources>, mirrored from
<https://science.nasa.gov/3d-resources/>), 6.5 MB in total.

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
| `iss.glb` | International Space Station (ISS) (A) | NORAD 25544 | 34 KB |

**Weather satellites**

| file | NASA model | used for | size |
|---|---|---|---|
| `poes.glb` | Polar Operational Environmental Satellite (POES) | NOAA 15, NOAA 18, NOAA 19 — the bus they share | 162 KB |

**Rocket bodies**

| file | NASA model | used for | size |
|---|---|---|---|
| `rocket-body.glb` | Space Shuttle Parts / Solid Rocket Booster | every spent stage (catalogue names with R/B, ROCKET BODY, UPPER STAGE), as a class default the card names | 41 KB |

**Telescopes and observatories**

| file | NASA model | used for | size |
|---|---|---|---|
| `chandra.glb` | Chandra X-ray Observatory | NORAD 25867 (CXO) | 148 KB |
| `fermi.glb` | Fermi Gamma-ray Large Area Space Telescope | NORAD 33053 (FGRST (GLAST)) | 142 KB |
| `hinode.glb` | Hinode (Solar-B) | NORAD 29479 (HINODE (SOLAR-B)) | 103 KB |
| `hubble.glb` | Hubble Space Telescope (A) | NORAD 20580 | 78 KB |
| `sdo.glb` | Solar Dynamics Observatory | NORAD 36395 (SDO) | 113 KB |
| `soho.glb` | Solar and Heliospheric Observatory | Horizons -21 | 29 KB |
| `swift.glb` | Swift | NORAD 28485 (SWIFT) | 147 KB |
| `tess.glb` | Transiting Exoplanet Survey Satellite (TESS) (A) | NORAD 43435 (TESS) | 162 KB |
| `jwst.glb` | James Webb Space Telescope (B) | Horizons -170 (James Webb Space Telescope) | 211 KB |

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
| `grace.glb` | Gravity Recovery and Climate Experiment (GRACE) (B) | NORAD 43476 (GRACE-FO 1), drawn as its sister ship | 17 KB |
| `icesat2.glb` | Ice, Clouds, and Land Elevation Satellite-2 (ICESat-2) (A) | NORAD 43613 (ICESAT-2) | 290 KB |
| `jason.glb` | Ocean Surface Topography Mission (OSTM Jason-2) | NORAD 41240 (JASON-3), drawn as its sister ship | 123 KB |
| `landsat.glb` | Landsat 7 | NORAD 25682 (Landsat 7) | 69 KB |
| `landsat8.glb` | Landsat 8 | NORAD 39084, 49260 (Landsat 8, 9) | 177 KB |
| `mms.glb` | Magnetospheric Multiscale (MMS) (A) | NORAD 40482-40485 (MMS 1 to MMS 4) | 121 KB |
| `sentinel6.glb` | Jason Continuity of Service (Sentinel-6) | NORAD 46984 (SENTINEL-6A) | 102 KB |
| `oco2.glb` | Orbiting Carbon Observatory (OCO) 2 | catalogue name OCO 2 | 189 KB |
| `suomi.glb` | Suomi National Polar-orbiting Partnership (Suomi NPP) | NORAD 37849 (SUOMI NPP) | 27 KB |
| `tdrs.glb` | Tracking and Data Relay Satellites (TDRS) (A) | catalogue names containing TDRS | 11 KB |
| `cygnss.glb` | Cyclone Global Navigation Satellite System (CYGNSS) | NORAD 41884-41891, the seven CYGNSS microsatellites still in the catalogue | 34 KB |
| `gpm.glb` | Global Precipitation Measurement | NORAD 39574 (GPM-CORE) | 162 KB |
| `icon.glb` | Ionospheric Connection Explorer (ICON) | NORAD 44628 (ICON) | 207 KB |
| `seastar.glb` | SeaStar | NORAD 24883 (ORBVIEW 2 (SEASTAR)) | 12 KB |
| `terra.glb` | Terra | NORAD 25994 (TERRA) | 20 KB |
| `tselina2.glb` | Tselina-2 | the eighteen Tselina-2 ELINT satellites in the catalogue, by NORAD id | 113 KB |

**Probes**

| file | NASA model | used for | size |
|---|---|---|---|
| `juno.glb` | Juno (B) | Horizons -61 | 146 KB |
| `lro.glb` | Lunar Reconnaissance Orbiter (A) | Horizons -85 | 187 KB |
| `mro.glb` | Mars Reconnaissance Orbiter (MRO) (C) | Horizons -74 | 121 KB |
| `osiris-rex.glb` | Origins, Spectral Interpretation, Resource Identification, and Security - Regolith Explorer (OSIRIS-REx) | Horizons -64 (OSIRIS-APEX, the same spacecraft on its second mission) | 171 KB |
| `parker.glb` | Parker Solar Probe | Horizons -96 | 180 KB |
| `stereo.glb` | Solar TErrestrial RElations Observatory (STEREO) | Horizons -234 (STEREO-A) | 138 KB |
| `voyager.glb` | Voyager Probe (A) | Horizons -31, -32 | 143 KB |

**Small bodies**

| file | NASA model | used for | size |
|---|---|---|---|
| `asteroid-bennu.glb` | 1999 RQ36 asteroid | Bennu, and the asteroid class | 24 KB |
| `asteroid-vesta.glb` | Asteroid 4 Vesta (A), from NASA's 3D Printing collection | 4 Vesta | 23 KB |
| `asteroid-eros.glb` | Gaskell Eros Shape Model V1.1 (NASA PDS, not NASA 3D Resources): Gaskell, R. (2021), doi:10.26033/d0gq-9427. CC0 under NASA's science data policy | 433 Eros | 22 KB |
| `dwarf-ceres.glb` | Ceres SPC Shape Model Dataset V1.0 (NASA PDS, not NASA 3D Resources): Park, R.S. and Buccino, D.R. (2018), DAWN-A-FC2-5-CERESSHAPESPC-V1.0. CC0 under NASA's science data policy | 1 Ceres | 37 KB |

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
| `lunar-module.glb` | Apollo Lunar Module | the Apollo 11, 12, 14, 15, 16 and 17 landing sites -- one vehicle design, six descent stages | 176 KB |
| `mer.glb` | Mars Exploration Rover - Opportunity (MER-B) | the Opportunity site, and the Spirit site as its twin | 38 KB |
| `pad.glb` | Mobile Launcher | DEFAULT for every launch pad -- 17 today, more with each Launch Library refresh | 74 KB |
| `perseverance.glb` | Mars 2020 Perseverance Rover | Jezero crater on Mars; and Gale crater, where Curiosity is drawn with it as the kind of thing | 256 KB |
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
   rebuilt the same way. `mms.glb` was not rebuilt: NASA's file states no colours at all.

They are loaded **on demand**, one file per object, only when the camera is near it. Nobody downloads all 53; the largest single download is `icesat2.glb` at 290 KB.

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

## 3g. The photographs of the nebulae and galaxies — ESA/Hubble, ESO and NOIRLab, CC BY 4.0

`site/images/nebulae/` holds one photograph per row of `registry/nebulae.yaml` (spec 0067), laid
on the sky where its object is by `site/js/scene/nebulae.js`. They come from three outreach
archives whose terms release their images under the Creative Commons Attribution 4.0 International
licence (each terms page, the sentence that grants it and the day it was read are in the registry's
`archives:`; read 2026-10-03):

- ESA/Hubble: <https://esahubble.org/copyright/>
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
the build script and are not shipped. This use does not imply endorsement by ESA/Hubble, ESO or
NOIRLab.

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

## 4. Runtime data sources

The app calls these from the visitor's browser. Nothing here is redistributed in this repository —
but **if you fork this and put it online, every one of your visitors becomes a client of these
services from their own IP.** Read §4.1 before you deploy.

| Service | What it provides | Terms | Credit line | Link |
|---|---|---|---|---|
| CelesTrak | GP/OMM orbital elements: stations, visual, active, last-30-days, Starlink supplemental; and the satellite catalogue (`satcat.csv`), read only when the debris view is opened, for its count by height and the orbit each piece of debris is drawn on | Free; a published usage policy with enforced rate limits (§4.1) | Orbital data: CelesTrak (T. S. Kelso) | <https://celestrak.org> |
| The Space Devs — Launch Library 2 | upcoming launches, pads, providers | Free to 15 requests/hour/IP; **no published licence** (§4.2) | Launch data by The Space Devs | <https://thespacedevs.com/llapi> |
| NASA — DSN Now | live Deep Space Network dish↔spacecraft links | NASA content is generally not copyrighted; this endpoint is undocumented (§4.3) | NASA Deep Space Network | <https://eyes.nasa.gov/dsn/> |
| NOAA SWPC | planetary K-index forecast | US Government work, public domain (§4.4) | Space weather: NOAA SWPC | <https://www.swpc.noaa.gov> |
| NOAA SWPC | today's sunspot groups (the solar region summary as JSON), fetched once when the camera is close to the Sun | US Government work, public domain (§4.4) | Today’s sunspot groups: NOAA Space Weather Prediction Center, solar region summary | <https://services.swpc.noaa.gov/json/solar_regions.json> |
| IAU Minor Planet Center | comet orbital elements (`CometEls.txt`) | **Copyrighted**; redistributable only with the source clearly specified (§4.5) | Comet elements: IAU Minor Planet Center | <https://minorplanetcenter.net> |
| NASA GIBS | today's clouds: GOES-East, GOES-West and Himawari Band 13 infrared, every 10 min | NASA "full and open sharing"; an acknowledgement is asked for (§4.13) | the acknowledgement in §4.13, verbatim, plus NOAA and JMA for the satellites | <https://nasa-gibs.github.io/gibs-api-docs/> |
| NASA GIBS | the Earth close up: Blue Marble with shaded relief and bathymetry, 500 m, map tiles fetched when the camera is within about 4 000 km of the ground | NASA "full and open sharing"; an acknowledgement is asked for (§4.13) | the line in §4.16, which carries the acknowledgement | <https://nasa-gibs.github.io/gibs-api-docs/> |
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
| The Earth | `BlueMarble_ShadedRelief_Bathymetry` from NASA GIBS: MODIS Blue Marble, cloud-free, with shaded relief and the sea floor, 500 m per pixel | NASA Earth Observatory; served by NASA GIBS / ESDIS | "NASA promotes full and open sharing of data"; the acknowledgement of §4.13 is asked for | 7 (489 m per pixel; level 8 is a 400) |

MEASURED 2026-10-06 with `curl -s -D - -H "Origin: https://www.spaceradar.ai"`: `Access-Control-Allow-Origin: *`
on all three. GIBS's grid is not Trek's: a level-0 tile is 288 degrees on a side and 512 pixels, level 0
is two tiles (`0/0/2` and `0/1/0` are 400), level 1 is three by two, and `7/79/159` is the last tile.
Relief tiles are 24 to 65 KB (PNG for the Moon, JPEG for Mars), the Earth's 12 to 54 KB (JPEG). The
Sources panel prints, while they are on screen:

- The Moon's relief: Lunar Orbiter Laser Altimeter shaded relief, LOLA Science Team, NASA/GSFC, from NASA Solar System Treks
- Mars's relief: MOLA and HRSC blended shaded relief, NASA/GSFC (MOLA, CC0) and ESA/DLR/FU Berlin (HRSC, CC BY-SA 3.0 IGO), USGS Astrogeology, from NASA Solar System Treks
- The Earth close up: Blue Marble with shaded relief and bathymetry, NASA Earth Observatory. We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

**What is changed.** The two relief mosaics are never shown as pictures. Each is a drawing of slopes
under one fixed light; the direction of that light was measured against the host's elevation tiles
(from the west on the Moon's, from the north-west on Mars's: the numbers are in the registry rows).
`scene/tiles.js` takes the slope along that one direction and re-lights it with the Sun where it
really is, as steep as the mosaic has it, clamped to 0.3 to 2.2 of the ground's
brightness. The slope across that direction is not in the mosaic and is not drawn, and the world's
card says both. HRSC's share of Mars's relief is CC BY-SA 3.0 IGO: it is fetched by the visitor's
browser from NASA's server, not copied, changed into another file or redistributed by us. The
Earth's tiles are multiplied by two sets of three numbers, land (2.0, 2.3, 2.5) and sea (8.3, 5.7,
4.7), chosen per pixel from the tile's own colour, so Blue Marble sits at the tone of the day map
under it; they replace the day map's colour only where the ground is lit, and the night lights, the
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
makes spaceradar.ai, and any release zip that includes `site/data/v1/`, a redistributor of them**,
which the table in §4 (written when the browser fetched everything itself) does not say. The rows
already covered above (CelesTrak §4.1, Launch Library 2 §4.2, DSN Now §4.3, SWPC's Kp §4.4, the
Exoplanet Archive §4.7, GDACS §4.14) are repeated only where the credit line differs.

| `sources.yaml` id | Publisher | What it gives | Terms, and how far they were checked | Credit line | Host |
|---|---|---|---|---|---|
| `jpl-sbdb-neo`, `jpl-sbdb-comets` | NASA/JPL Solar System Dynamics | orbits of near-Earth asteroids and of comets | NASA/JPL-Caltech; the API's documentation gives no licence text. NASA content is generally not copyrighted in the United States. **Terms page not found in this pass.** | Orbits: NASA/JPL Small-Body Database | `ssd-api.jpl.nasa.gov` |
| `jpl-cad` | NASA/JPL Center for Near Earth Object Studies | close approaches to the Earth | as above | Close approaches: NASA/JPL CNEOS | `ssd-api.jpl.nasa.gov` |
| `horizons-deep-space` | NASA/JPL Solar System Dynamics, Horizons | where each deep-space craft is, as vectors | as above | Ephemerides: JPL Horizons | `ssd.jpl.nasa.gov` |
| `esa-neocc-close` | ESA Near-Earth Object Coordination Centre | ESA's own list of close approaches | The portal's footer reads "Copyright 2000 - 2026 European Space Agency. All rights reserved." (read 2026-10-05). **No reuse licence was found; treat the saved copy as not cleared for redistribution** until ESA's terms are read in full. | Close approaches: ESA NEOCC | `neo.ssa.esa.int` |
| `swpc-ovation` | NOAA Space Weather Prediction Center | the OVATION aurora forecast | US Government work, public domain (§4.4) | Aurora forecast: NOAA SWPC | `services.swpc.noaa.gov` |
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

Applies to the 14 files at the top of `site/textures/`, and to `4k/earth_water.webp`, `4k/moon.webp`,
`4k/mercury.webp`, `4k/mars.webp` and `4k/jupiter.webp`.

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

## 7. Build and CI only

Not shipped to the browser, listed for completeness. These are pulled at CI time and none of them
is vendored in the tree.

| Item | Where | Licence |
|---|---|---|
| PyYAML | `scripts/check_registry.py`, `tests/` — installed by `ci.yml` | MIT |
| Playwright | `scripts/shots.mjs`, `screens.yml`, `readme-shots.yml` — from the `mcr.microsoft.com/playwright` image | Apache-2.0 |
| `actions/checkout`, `actions/setup-python`, `actions/upload-artifact` | `.github/workflows/` | MIT |
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

> Narration: a synthetic voice, Kokoro-82M (bf_emma), Apache-2.0

| What | Used for | Licence | Source |
|---|---|---|---|
| Kokoro-82M, model weights v1.0 and the voice `bf_emma` (British English) | synthesising every clip, at build time; the model itself is not shipped | Apache-2.0 | <https://huggingface.co/hexgrad/Kokoro-82M> (read 2026-10-03); the ONNX export and `voices-v1.0.bin` from <https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0> |

The model's card reads: "Kokoro is an open-weight TTS model with 82 million parameters … with
Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal
projects." `registry/narration.yaml` records the SHA-256 of both model files, the versions of the
tools the render ran with, the pronunciation lexicon, and a hash per clip; `scripts/narrate.py
--check` refuses a stop whose words have changed since its clip was made. Each clip is levelled to
−16 LUFS and encoded to Opus 32 kbps mono with an AAC twin; the captions beside it (`.vtt`) are the
card's own sentences. Nothing here is downloaded until a visitor turns sound on.

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
