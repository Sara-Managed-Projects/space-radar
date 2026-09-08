# Credits

Space Radar's own code is MIT ([LICENSE](LICENSE)). Everything else in this repository, and every
API the app calls from your browser, belongs to someone else. This file says who, under what terms,
and what you have to keep if you redistribute it.

**How this was checked.** Every version below was measured from the file in the tree — hashed and
byte-compared against the published upstream artifact — and every licence was read from the
upstream `LICENSE` file or the publisher's own terms page, not recalled. Where a claim could *not*
be verified that way, it says so in plain words. Checked 2026-09-07.

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

## 2. Textures

`site/textures/` holds **14** files (not 13). Every one of them carries a filename from the Solar
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
> licensed CC BY 4.0 (<https://creativecommons.org/licenses/by/4.0/>). Used unmodified.

| File | Used for | Licence | Source |
|---|---|---|---|
| `2k_sun.jpg` | the Sun | CC BY 4.0 | Solar System Scope |
| `2k_mercury.jpg` | Mercury | CC BY 4.0 | Solar System Scope |
| `2k_venus_atmosphere.jpg` | Venus | CC BY 4.0 | Solar System Scope |
| `2k_earth_daymap.jpg` | Earth, day side | CC BY 4.0 | Solar System Scope |
| `2k_earth_nightmap.jpg` | Earth, night side | CC BY 4.0 | Solar System Scope |
| `2k_earth_clouds.jpg` | Earth cloud layer | CC BY 4.0 | Solar System Scope |
| `2k_moon.jpg` | the Moon | CC BY 4.0 | Solar System Scope |
| `2k_mars.jpg` | Mars | CC BY 4.0 | Solar System Scope |
| `2k_jupiter.jpg` | Jupiter | CC BY 4.0 | Solar System Scope |
| `2k_saturn.jpg` | Saturn | CC BY 4.0 | Solar System Scope |
| `2k_saturn_ring_alpha.png` | Saturn's rings | CC BY 4.0 | Solar System Scope |
| `2k_uranus.jpg` | Uranus | CC BY 4.0 | Solar System Scope |
| `2k_neptune.jpg` | Neptune | CC BY 4.0 | Solar System Scope |
| `2k_stars_milky_way.jpg` | the Milky Way sky sphere | CC BY 4.0 | Solar System Scope |

**What could not be verified, stated plainly.** solarsystemscope.com answers HTTP 403 to scripted
downloads, so these files could not be byte-compared against the origin. Provenance rests on the
exact filename match to the published pack (all 14 appear on their download list), the matching
2048 × 1024 dimensions, and the shared XMP fingerprint. `2k_uranus.jpg` and `2k_neptune.jpg` carry
no XMP block at all — the other twelve do — so those two are the weakest links in the chain. If you
want certainty, re-download the pack by hand and diff.

**No texture in the tree comes from anywhere else.** In particular, `registry/models.yaml` claims
the night-side texture comes from NASA Earth Observatory's Night Lights and the starfield from NASA
SVS 4851. Neither is what shipped: `2k_earth_nightmap.jpg` and `2k_stars_milky_way.jpg` are Solar
System Scope files, by name, size and fingerprint. The registry is wrong and the table above is
right. See [§5](#5-corrections-to-registrymodelsyaml).

## 3. Star and constellation data

`site/data/` carries three files, all derived from **d3-celestial** by Olaf Frohn.

| Item | File | Licence | Credit line | Link |
|---|---|---|---|---|
| Star catalogue (repacked) | `stars.bin` | BSD-3-Clause | Star data from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |
| Constellation lines | `constellations.lines.json` | BSD-3-Clause | Constellation lines from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |
| Constellation names | `constellation-names.json` | BSD-3-Clause | Constellation names and label positions from d3-celestial, © 2015 Olaf Frohn | <https://github.com/ofrohn/d3-celestial> |

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

## 3b. 3D models — NASA, public domain

Thirty-six spacecraft, spacecraft-bus, antenna, rocket-stage and surface models ship in `site/models/`, all
from **NASA 3D Resources** (<https://github.com/nasa/NASA-3D-Resources>, mirrored from
<https://science.nasa.gov/3d-resources/>), 10.3 MB in total.

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
| `poes.glb` | Polar Operational Environmental Satellite (POES) | NOAA 15, NOAA 18, NOAA 19 — the bus they share | 1 323 KB |

**Rocket bodies**

| file | NASA model | used for | size |
|---|---|---|---|
| `rocket-body.glb` | Space Shuttle Parts / Solid Rocket Booster | every spent stage (catalogue names with R/B, ROCKET BODY, UPPER STAGE), as a class default the card names | 81 KB |

**Telescopes and observatories**

| file | NASA model | used for | size |
|---|---|---|---|
| `chandra.glb` | Chandra X-ray Observatory | NORAD 25867 (CXO) | 195 KB |
| `hubble.glb` | Hubble Space Telescope (A) | NORAD 20580 | 163 KB |
| `jwst.glb` | James Webb Space Telescope (B) | Horizons -170 | 891 KB |
| `sdo.glb` | Solar Dynamics Observatory | NORAD 36395 (SDO) | 142 KB |
| `soho.glb` | Solar and Heliospheric Observatory | Horizons -21 | 29 KB |
| `swift.glb` | Swift | NORAD 28485 (SWIFT) | 238 KB |
| `tess.glb` | Transiting Exoplanet Survey Satellite (TESS) (A) | NORAD 43435 (TESS) | 162 KB |

**Satellites**

| file | NASA model | used for | size |
|---|---|---|---|
| `aqua.glb` | Aqua (B) | NORAD 27424 (AQUA) | 158 KB |
| `aura.glb` | Aura (A) | NORAD 28376 (AURA) | 74 KB |
| `bus-ssl1300.glb` | Space Systems Loral (SSL-1300) | DEFAULT for the geostationary ring -- several hundred unnamed commercial satellites | 81 KB |
| `cloudsat.glb` | CloudSat (A) | catalogue name CLOUDSAT | 206 KB |
| `dscovr.glb` | Deep Space Climate Observatory (DSCOVR) (Triana) | catalogue names containing DSCOVR | 95 KB |
| `goes.glb` | Geostationary Operational Environmental Satellites | catalogue names containing GOES | 313 KB |
| `grace.glb` | Gravity Recovery and Climate Experiment (GRACE) (B) | NORAD 43476 (GRACE-FO 1), drawn as its sister ship | 135 KB |
| `icesat2.glb` | Ice, Clouds, and Land Elevation Satellite-2 (ICESat-2) (A) | NORAD 43613 (ICESAT-2) | 290 KB |
| `jason.glb` | Ocean Surface Topography Mission (OSTM Jason-2) | NORAD 41240 (JASON-3), drawn as its sister ship | 178 KB |
| `landsat.glb` | Landsat 7 | NORAD 25682, 39084, 49260 (Landsat 7, 8, 9) | 68 KB |
| `mms.glb` | Magnetospheric Multiscale (MMS) (A) | catalogue names containing MMS | 121 KB |
| `sentinel6.glb` | Jason Continuity of Service (Sentinel-6) | NORAD 46984 (SENTINEL-6A) | 401 KB |
| `oco2.glb` | Orbiting Carbon Observatory (OCO) 2 | catalogue name OCO 2 | 189 KB |
| `suomi.glb` | Suomi National Polar-orbiting Partnership (Suomi NPP) | NORAD 37849 (SUOMI NPP) | 152 KB |
| `tdrs.glb` | Tracking and Data Relay Satellites (TDRS) (A) | catalogue names containing TDRS | 10 KB |
| `terra.glb` | Terra | NORAD 25994 (TERRA) | 20 KB |

**Probes**

| file | NASA model | used for | size |
|---|---|---|---|
| `juno.glb` | Juno (B) | Horizons -61 | 254 KB |
| `mro.glb` | Mars Reconnaissance Orbiter (MRO) (B) | Horizons -74 | 11 KB |
| `parker.glb` | Parker Solar Probe | Horizons -96 | 247 KB |
| `voyager.glb` | Voyager Probe (A) | Horizons -31, -32 | 288 KB |

**Small bodies**

| file | NASA model | used for | size |
|---|---|---|---|
| `asteroid-bennu.glb` | 1999 RQ36 asteroid | Bennu, and the asteroid class | 23 KB |

**Places on a surface**

| file | NASA model | used for | size |
|---|---|---|---|
| `dsn34.glb` | Deep Space Network 34-meter | the dss-25 antenna, which is 34 m and was wrongly drawn with the 70 m model | 757 KB |
| `dsn70.glb` | Deep Space Network 70-meter | DEFAULT for ground sites of class `dish` | 502 KB |
| `lunar-module.glb` | Apollo Lunar Module | the Apollo 11, 14, 16 and 17 landing sites -- one vehicle design, four descent stages | 554 KB |
| `pad.glb` | Mobile Launcher | DEFAULT for every launch pad -- 17 today, more with each Launch Library refresh | 117 KB |
| `perseverance.glb` | Mars 2020 Perseverance Rover | Jezero crater on Mars | 1494 KB |

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
3. **Retextured at runtime.** The original PBR materials are replaced with this project's toon
   material. The *geometry* is NASA's; the *look* is ours. That is the brief — cartoon objects on a
   realistic setting — and it is why a real Hubble still reads as part of the same drawn world.

They are loaded **on demand**, one file per object, only when the camera is near it. Nobody
downloads all twenty-nine; the largest single download is `perseverance.glb` at 1 494 KB.

## 4. Runtime data sources

The app calls these from the visitor's browser. Nothing here is redistributed in this repository —
but **if you fork this and put it online, every one of your visitors becomes a client of these
services from their own IP.** Read §4.1 before you deploy.

| Service | What it provides | Terms | Credit line | Link |
|---|---|---|---|---|
| CelesTrak | GP/OMM orbital elements: stations, visual, active, last-30-days, Starlink supplemental | Free; a published usage policy with enforced rate limits (§4.1) | Orbital data: CelesTrak (T. S. Kelso) | <https://celestrak.org> |
| The Space Devs — Launch Library 2 | upcoming launches, pads, providers | Free to 15 requests/hour/IP; **no published licence** (§4.2) | Launch data by The Space Devs | <https://thespacedevs.com/llapi> |
| NASA — DSN Now | live Deep Space Network dish↔spacecraft links | NASA content is generally not copyrighted; this endpoint is undocumented (§4.3) | NASA Deep Space Network | <https://eyes.nasa.gov/dsn/> |
| NOAA SWPC | planetary K-index forecast | US Government work, public domain (§4.4) | Space weather: NOAA SWPC | <https://www.swpc.noaa.gov> |
| IAU Minor Planet Center | comet orbital elements (`CometEls.txt`) | **Copyrighted**; redistributable only with the source clearly specified (§4.5) | Comet elements: IAU Minor Planet Center | <https://minorplanetcenter.net> |

Also named in `site/js/data/sources.js` so the status panel can say "could not look" about them by
name, but **not reachable from a browser** (no `Access-Control-Allow-Origin`) and therefore never
actually fetched by the app: NASA/JPL Small-Body Database, JPL Horizons, and Space-Track (which also
needs a login). Their credit lines are carried in the same file.

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
2. **`earth-night` is credited to NASA Earth Observatory.** The shipped `2k_earth_nightmap.jpg` is a
   Solar System Scope file. CC BY 4.0, not public domain — and CC BY has an attribution obligation
   that "Public domain (NASA)" does not discharge.
3. **`starfield` is credited to NASA SVS 4851**, with a long required credit line naming Gaia DR2
   and the IAU/Sky & Telescope constellation figures. The shipped `2k_stars_milky_way.jpg` is a
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

Applies to every file in `site/textures/`.

```
Planet and star textures © Solar System Scope — https://www.solarsystemscope.com/textures/
Licensed under the Creative Commons Attribution 4.0 International License
https://creativecommons.org/licenses/by/4.0/
Used unmodified.

The publisher's stated terms: "Distributed under Attribution 4.0 International license:
You may use, adapt, and share these textures for any purpose, even commercially."
```

The full CC BY 4.0 legal code is at <https://creativecommons.org/licenses/by/4.0/legalcode>. It is
not reproduced here; the licence itself requires a link or a copy, and the link above is that link.

## 7. Build and CI only

Not shipped to the browser, listed for completeness. These are pulled at CI time and none of them
is vendored in the tree.

| Item | Where | Licence |
|---|---|---|
| PyYAML | `scripts/check_registry.py`, `tests/` — installed by `ci.yml` | MIT |
| Playwright | `scripts/shots.mjs`, `screens.yml`, `readme-shots.yml` — from the `mcr.microsoft.com/playwright` image | Apache-2.0 |
| `actions/checkout`, `actions/setup-python`, `actions/upload-artifact` | `.github/workflows/` | MIT |

## 8. Acknowledgements

Published methods used in `site/js/`, implemented from the papers rather than copied from anyone's
code. No licence attaches; the credit is owed anyway.

- **B−V colour index → effective temperature**: F. J. Ballesteros (2012), *New insights into black
  bodies*, EPL **97**, 34008. Used in `site/js/scene/starfield.js`.
- **Black-body temperature → sRGB**: Tanner Helland's piecewise approximation (2012). Used in
  `site/js/scene/starfield.js`.
- **SGP4/SDP4**: Hoots & Roehrich, *Spacetrack Report #3*; David Vallado et al., *Revisiting
  Spacetrack Report #3* (AIAA 2006-6753). Reaches this project through satellite.js.

No third-party fonts are used: `site/css/` specifies system font stacks only. No file in the tree
embeds a base64 asset.
