// Real geometry for the objects people actually look for.
//
// NASA publishes glTF binaries of its own spacecraft, in the public domain. Ten of them are small
// enough to be worth shipping (site/models/, 9 KB to 1.6 MB). This module loads one on demand and
// hands it to the hero layer.
//
// TWO DECISIONS WORTH STATING, BECAUSE BOTH COULD REASONABLY HAVE GONE THE OTHER WAY
//
// 1. THE GEOMETRY IS REAL; THE SHADING IS NOT. Every loaded mesh gets this project's toon material
//    -- the same three-step ramp and rim light the procedural models use -- rather than the
//    photoreal materials NASA shipped. That is the brief: cartoon objects on a realistic setting.
//    What changes is the SILHOUETTE, which is the half that carries recognition: a real Hubble is
//    a tube with a door and a real Voyager is a dish with a boom, and no amount of shading makes a
//    procedural box read as either. Pass `keepMaterials: true` to opt out.
//
//    THE COLOURS ARE REAL TOO, SINCE 2026-10-05, AND THEY ARE FLAT. Shading and colour are two
//    things, and only the first was ever the brief. Painting a whole spacecraft in its class
//    colour is what made the Apollo lunar module salmon and Voyager lavender (issues #265, #386,
//    #418): the gold foil, the white dish and the black blankets ARE the recognition up close, as
//    much as the outline is. So a file now ships a flat colour per part, baked from NASA's own
//    materials and textures by scripts/bake-own-colours.mjs, and each goes through the same toon
//    ramp, the same rim and the same planet-shine as everything else on screen. ONE LOOK: flat
//    tones, three steps of light, no photographs, no normal maps, no metalness -- a real model
//    and a procedural one beside it are drawn by the same hand. The class colour is now only what
//    a file with no colours of its own falls back to (colourRoute, below).
//
// 2. NOTHING BLOCKS. A hero appears as procedural geometry immediately and upgrades in place when
//    its file arrives. A visitor on a slow connection sees a satellite now and a better satellite
//    a second later, rather than an empty orbit and a spinner. A file that fails to load is simply
//    never upgraded, and the card is unaffected -- the model is a drawing, never the data.

import * as THREE from '../../vendor/three.module.min.js';
// THE LOADER IS NOT IN THE BOOT GRAPH (2026-10-06, internal #405). This file is imported at boot for
// its TABLE: the card, the labels and the hero layer all ask realModelFor() which drawing a record
// gets. The glTF loader, its geometry helpers and the meshopt decoder (190 kB together) and
// scene/models.js (155 kB, for toonMaterial) are needed only when a FILE is actually fetched, so
// loadRealModel() imports them then (loadKit, below). MEASURED that day: a first visit fetched all
// of it and loaded no model.
let kit = null;
let kitAsked = null;
function loadKit() {
  if (!kitAsked) {
    kitAsked = Promise.all([
      import('../../vendor/GLTFLoader.js'),
      import('../../vendor/meshopt_decoder.module.js'),
      import('./models.js'),
    ]).then(([g, m, models]) => {
      kit = { GLTFLoader: g.GLTFLoader, MeshoptDecoder: m.MeshoptDecoder, toonMaterial: models.toonMaterial };
      return kit;
    }).catch((err) => { kitAsked = null; throw err; });
  }
  return kitAsked;
}
import { CLASS_COLOURS } from './glyphatlas.js';
import { isGeostationary } from '../data/parsers.js';

const BASE = new URL('../../models/', import.meta.url);
const TEXTURES = new URL('../../textures/', import.meta.url);

/**
 * Which record gets which file. Keyed by the identifier that is stable for that object:
 * a NORAD number for anything in Earth orbit, a JPL Horizons id for anything beyond it.
 * A key that is not here simply keeps its procedural model, which is the normal case.
 */
/**
 * FIVE OF THESE SHAPES REACH NOTHING, measured 2026-09-12 by scripts/check-model-reach.py.
 *
 * scripts/check-model-ids.sh answers "does this id point at the object the row NAMES?" -- the check
 * against drawing the wrong spacecraft. It cannot answer the other half: "does anything the app
 * draws match this row at all?" Nobody had asked, and for five shipped models the answer is no:
 *
 *     poes.glb      221 kB   NOAA 15, 18 and 19 left CelesTrak's `active` group
 *     icon.glb      244 kB   ICON was decommissioned in 2022
 *     calipso.glb   267 kB   CALIPSO ended in 2023
 *     cloudsat.glb  206 kB   CloudSat ended in 2023
 *     dscovr.glb     96 kB   DSCOVR sits at L1 and is in none of the three groups
 *
 * registry/sources.yaml fetches exactly three files -- GROUP=active, GROUP=visual, GROUP=stations
 * -- so an object CelesTrak knows about and does not put in one of them is an object this app never
 * sees. All five mappings are CORRECT: the ids and names are right and check-model-ids.sh passes on
 * every one. They are dormant, not wrong, and deleting them would mean re-deriving them the day an
 * object comes back. What the zero means is that these files are not doing what their rows claim
 * TODAY, and the tree should be able to say that out loud rather than assume otherwise.
 *
 * Run `scripts/check-model-reach.py --names` before adding a mapping. Its other half is that it
 * prints every object a name key catches, which is how ELARASAT MMS-1 was found wearing NASA's
 * Magnetospheric Multiscale: a wrong object is invisible for exactly as long as nobody prints the
 * list.
 */
/**
 * The geostationary bus, reached two ways and defined once. See `byLayer` below for why this model
 * is the highest-value entry in the file, and `isGeostationary` in data/parsers.js for why the
 * layer is no longer what decides it.
 *
 * THE NAME SAYS WHAT THE ORBIT KNOWS, AND NO MORE. It used to say "a communications satellite",
 * and the card prints it as "drawn as a communications satellite -- the kind of thing". But an
 * orbit tells you a satellite is geostationary; it does not tell you what the satellite is FOR.
 * Of the 400 objects this entry reaches on 2026-09-12, sixteen are weather satellites (Himawari,
 * Fengyun, Elektro-L, INSAT-3D, GEO-KOMPSAT-2), four are Earth-observation (Gaofen-4, Gaofen-13,
 * Yaogan-41), and about thirty are classified -- USA 270 and 271 are GSSAP, which watch other
 * satellites. The layer's own sentence already said "a ring of television and weather
 * satellites"; the model's name contradicted it. The kind is now the kind the evidence supports.
 *
 * The shape still carries a comms payload's dishes, which is the "not this exact one" half. It is
 * wrong in SILHOUETTE for exactly two of the 400: Fengyun 2G and 2H are spin-stabilised drums.
 */
// A FILE A BLOCK since batch six (2026-10-13; public #985). The gate is the same launch-year gate,
// with one more step: the Block IIR and IIR-M craft (Lockheed Martin, one bus) had no shape of their
// own and wore the family box; they wear gps-iir.glb now. THE YEARS, read on 2026-10-13 in the
// Cabinet Office of Japan's list of positioning satellites (qzss.go.jp/en/technical/satellites/,
// which gives every GPS craft's block and launch day: `GPS 2R-2 1997/7/23` ... `GPS 2R-21M
// 2009/8/17`, `GPS 2F-1 2010/5/28` ... `GPS 2F-12 2016/2/5`, `GPS 3-1 2018/12/23` onward):
//     1997 to 2009   IIR and IIR-M   gps-iir.glb   18 records in the live saved data that day
//     2010 to 2016   IIF             gps-iif.glb   12
//     2018 onward    III             gps-iii.glb   10
// 1997 IS THE ONE YEAR TWO BLOCKS FLEW: the last Block IIA (a Rockwell bus, a different shape) went
// up that November and the first IIR that July. The IIR of 1997 is `NAVSTAR 43`, so in that year
// the name decides too, and a IIA that came back into the catalogue would keep the family box.
// No GPS craft was launched in 2017. A record with no year keeps the family box.
// GPS IIIF (not yet flying) is a changed craft on the same bus; when the first is catalogued its
// year will pass this gate, and the row's `generic` is what keeps the card honest until it is drawn.
// Each answer carries its own `made` and `axes`: the family box has neither.
const GPS_FILE = { made: 'dimensions', axes: 'app' };
function gpsBlock(record) {
  const year = record && record.meta ? record.meta.launchYear : null;
  if (!Number.isFinite(year)) return {};
  if (year >= 2018) return { build: 'navigation-gps-iii', file: 'gps-iii.glb', name: 'a GPS III navigation satellite', ...GPS_FILE };
  if (year >= 2010 && year <= 2016) return { build: 'navigation-gps-iif', file: 'gps-iif.glb', name: 'a GPS Block IIF navigation satellite', ...GPS_FILE };
  const first = year === 1997 && /\bnavstar 43\b/i.test(String(record.name));
  if ((year >= 1998 && year <= 2009) || first) return { file: 'gps-iir.glb', name: 'a GPS Block IIR navigation satellite', ...GPS_FILE };
  return {};
}

const GEO_BUS = { file: 'bus-ssl1300.glb', colour: 'satellite', name: 'a geostationary satellite', generic: true };

export const REAL_MODELS = {
  /**
   * By catalogue number. `catalogue` is the name CelesTrak returns for that number and is not
   * decoration: `scripts/check-model-ids.sh` fetches each one and fails if the live name does not
   * match, which is the check that should have existed before this map shipped.
   *
   * TWO OF THESE WERE WRONG IN PRODUCTION, and the way they were wrong is the point. 27424 was
   * mapped to Chandra; 27424 is AQUA, and Chandra is 25867. 39174 was mapped to Landsat 8; 39174
   * is a BREEZE-M DEBRIS TANK, and Landsat 8 is 39084. So the app drew a space telescope on an
   * Earth-observing satellite and a Landsat on a piece of debris -- confidently, with nothing on
   * screen saying so. The `named:` route has a class gate for exactly this reason; an id was
   * assumed not to need one because an id is exact. The id was exact. It was also wrong.
   */
  norad: {
    25544: { file: 'iss.glb', colour: 'station', name: 'International Space Station', catalogue: 'ISS (ZARYA)' },
    // NAUKA AND POISK ARE PARTS OF THE ISS, catalogued separately because they were launched
    // separately, and their elements track the station they are bolted to. Each used to be drawn as
    // a generic station of its own -- selecting Nauka showed a second, different space station. They
    // are drawn as the station they are part of; heroes.js's docked-vehicle rule means only one of
    // the two models is ever on screen at that point, whichever is selected.
    49044: { file: 'iss.glb', colour: 'station', name: 'the International Space Station, which Nauka is part of', catalogue: 'ISS (NAUKA)' },
    36086: { file: 'iss.glb', colour: 'station', name: 'the International Space Station, which Poisk is part of', catalogue: 'POISK' },
    // A ROCKET STAGE CATALOGUED AS A PAYLOAD. AC-2 (1963) put the instrumented Centaur stage itself
    // into orbit -- the first hydrogen engine fired in space -- so the catalogue calls the stage the
    // payload and its name carries no R/B. It was drawn, and its card described it, as "a generic
    // satellite". It is a spent upper stage and is drawn as one.
    694: { build: 'stage', colour: 'rocket', name: 'a spent rocket stage', catalogue: 'ATLAS CENTAUR 2', generic: true },
    // SPACE TELESCOPES WITH NO MODEL OF THEIR OWN, drawn as the generic telescope rather than as a
    // communications satellite with a dish, which is what the satellite default is. The card says
    // "a space telescope -- the kind of thing, not this exact one", which is now true of the shape.
    3597: { build: 'space-telescope', colour: 'telescope', name: 'a space telescope', catalogue: 'OAO 2', generic: true },
    6153: { build: 'space-telescope', colour: 'telescope', name: 'a space telescope', catalogue: 'OAO 3 (COPERNICUS)', generic: true },
    // HITOMI HAS ITS OWN SHAPE since 2026-10-13 (public #969): hitomi.glb is XRISM's generated body
    // (the same bus: XRISM is Hitomi's recovery mission) with what XRISM does not have built in
    // code from cited metres: the 6.4 m extensible optical bench as a lattice, the HXI plate at its
    // end, the two soft gamma-ray detectors (registry/models.yaml row `hitomi`).
    // THE CATALOGUE OBJECT IS WHAT IS LEFT OF IT. Hitomi spun itself apart on 26 March 2016, five
    // weeks after launch; 41337 is its main body, and JAXA's own finding is that both solar paddles
    // broke off at their bases. The file is the craft AS LAUNCHED, which is what the issue asks
    // for, so `was: 'hitomi'` makes the card say that in a sentence of its own
    // (COPY.drawing.objectWas): an intact telescope may not be drawn on a wreck without saying so.
    41337: { build: 'space-telescope', file: 'hitomi.glb', colour: 'telescope', name: 'Hitomi (ASTRO-H)', catalogue: 'ASTRO-H (HITOMI)', made: 'render', was: 'hitomi', axes: 'app' },
    42758: { build: 'space-telescope', colour: 'telescope', name: 'a space telescope', catalogue: 'HXMT (HUIYAN)', generic: true },
    // XRISM's own shape since 2026-10-13 (public #968): xrism.glb, GENERATED from two frames of NASA
    // Goddard's turntable render and its two solar paddles then REPLACED by flat ones built in code
    // (registry/models.yaml row `xrism`). The build stays as what is drawn while the file is on its
    // way. Not `generic` any more: it is this craft, and `made: 'render'` makes the card say the
    // shape came from an artist's render. Hitomi (41337) above does not wear it: the same bus with a
    // six-metre optical bench, which since batch two is a file of its own (public #969).
    // `axes: 'app'` since batch three (2026-10-13): the file was built to the app's axes (mirrors at
    // -Z, away from the Earth; paddles along X; cells toward +Y) and flew at the seeded constant
    // angle every loaded file had, its paddles' backs to the Sun. Now it flies as its build did.
    57800: { build: 'space-telescope', file: 'xrism.glb', colour: 'telescope', name: 'XRISM', catalogue: 'XRISM', made: 'render', axes: 'app' },
    // THE FIRST BATCH OF THE "3D model:" ISSUES (2026-10-13). NuSTAR had no route at all: on the layer
    // of satellites worth knowing it was the generic satellite, a box with a dish, and it is two small
    // boxes ten metres apart on a lattice mast, which is the whole of what a person recognises
    // (public #964). nustar.glb was BUILT HERE, in code, from the cited metres and NASA/JPL's render
    // (registry/models.yaml row `nustar`, kind `built-from-dimensions`; no image-to-3D model can draw
    // a lattice). `made: 'dimensions'` is what makes the card say so. Not `generic`: it is this craft.
    // `axes: 'app'` since batch three: the mast stands on the local vertical, the optics at -Z looking
    // away from the Earth and the bus at +Z. NOT AS IT FLIES: the real craft points its mast at
    // whatever it observes; the app knows no target, and "away from the Earth" is its telescope rule.
    38358: { file: 'nustar.glb', colour: 'telescope', name: 'NuSTAR', catalogue: 'NUSTAR', made: 'dimensions', axes: 'app' },
    // THE FOURTH BATCH (2026-10-13, public #952, #953, #954, #965): four NASA craft that had no route
    // and were the generic satellite, a box with a dish. Each BY NUMBER, with the name CelesTrak's
    // active group gives it (read in the live saved data, data/v1/celestrak-active.cols.json, that
    // day: `SWOT`, `NISAR`, `IXPE`, `PACE`); none is in the visual group, so each is met in the whole
    // catalogue. A name route would be wrong for all four: `PACE` is a word inside other names and
    // was also a 2U CubeSat, and `SWOT` and `IXPE` are short enough to be inside anything.
    //   SWOT   JPL'S OWN PUBLISHED MODEL (swot.jpl.nasa.gov/resources/86/swot-3d-model/, 2020), so no
    //          `made`: the card says "drawn from a published model of SWOT". Turned to the app's axes
    //          before the bake (the altimeter's dish on +Z, the wings along X), hence `axes: 'app'`.
    //   NISAR  built in code from JPL's cited metres. The 12 m reflector is a rim truss and a net,
    //          NEVER a filled disc: the real one is a see-through mesh. The boom stands on the side
    //          away from the Earth; the real craft flies rolled, which the app's one attitude cannot say.
    //   IXPE   built in code: bus, 4 m lattice boom, three mirror modules at -Z looking away from the
    //          Earth (the telescope rule, as XRISM and NuSTAR). It is not NuSTAR's mast and does not wear it.
    //   PACE   built in code: the 1.5 x 1.5 x 3.2 m observatory, the Ocean Color Instrument and its
    //          Earth shield, one wing.
    // registry/models.yaml rows `swot`, `nisar`, `ixpe`, `pace` have the sources and what is approximate.
    54754: { file: 'swot.glb', colour: 'satellite', name: 'SWOT', catalogue: 'SWOT', axes: 'app' },
    65053: { file: 'nisar.glb', colour: 'satellite', name: 'NISAR', catalogue: 'NISAR', made: 'dimensions', axes: 'app' },
    49954: { file: 'ixpe.glb', colour: 'telescope', name: 'IXPE', catalogue: 'IXPE', made: 'dimensions', axes: 'app' },
    58928: { file: 'pace.glb', colour: 'satellite', name: 'PACE', catalogue: 'PACE', made: 'dimensions', axes: 'app' },
    // NOAA 21 (JPSS-2), public #994. By NUMBER and only this number: NOAA 20 is a different bus and
    // wears NASA's Suomi model (43013, below); the name route's comment further down says why NOAA 21
    // was left on the generic shape until it had one of its own. noaa21.glb: the body generated from
    // NOAA's render with the body cut out by hand, the five-panel wing built in code.
    // REBUILT the same day (batch two): the generated body was 4 m of lumps with no instrument on it.
    // The file is now built from dimensions alone, a box bus with VIIRS, CrIS, ATMS and OMPS as boxes
    // of their cited sizes where NOAA's drawing of the nadir deck puts them, so `made: 'dimensions'`.
    // `axes: 'app'`: the instruments are on the file's +Z, and the app turns that face to the Earth.
    54234: { file: 'noaa21.glb', colour: 'satellite', name: 'NOAA-21 (JPSS-2)', catalogue: 'NOAA 21 (JPSS-2)', made: 'dimensions', axes: 'app' },
    // BATCH SEVEN (2026-10-13; public #992, #966): two craft that had no route at all and so wore the
    // shape of their class, a box with two wings and a dish. Both by NUMBER, both built in code from
    // cited metres (registry/models.yaml rows `metop`, `xmm-newton`, kind `built-from-dimensions`);
    // no ESA or EUMETSAT picture or model was used (their terms do not allow it), the layout is read
    // off NASA's public-domain pictures.
    //   metop.glb       MetOp-B and MetOp-C, Europe's polar weather satellites: a gold body 6.3 m long
    //                   and 2.5 m square, the instruments on its Earth face, ASCAT's two 3 m antenna
    //                   arms in a V, and ONE wing beyond the service module, 17.6 m from the far end
    //                   of the body to its tip. MetOp-A (29499) was retired in 2021 and is in no
    //                   group the app loads; `METOP-SGA1` (a different, newer craft) is NOT these and
    //                   has no row: it keeps the shape of its class.
    //                   `axes: 'app'`: the instrument face to the Earth and the wing's axis square to
    //                   the Sun, the wing turned 45 degrees toward the Sun's side. The real wing turns
    //                   once an orbit to follow the Sun; the app's does not turn.
    //   xmm-newton.glb  ESA's X-ray observatory: 10 m from mirrors to cameras (a 6.8 m tube between
    //                   a service module and the focal plane), three 70 cm mirror modules at one end,
    //                   two fixed wings of three panels, 16 m tip to tip.
    //                   `axes: 'app'`: the tube stands on end, mirrors to the zenith, wings square to
    //                   the Sun with their cells to it. TRUE of the real craft: the wings are fixed
    //                   with their cells to the Sun and the telescope looks square to the Sun. NOT
    //                   TRUE: it holds a star for hours wherever that star is, not the zenith.
    38771: { file: 'metop.glb', colour: 'satellite', name: 'MetOp-B', catalogue: 'METOP-B', made: 'dimensions', axes: 'app' },
    43689: { file: 'metop.glb', colour: 'satellite', name: 'MetOp-C', catalogue: 'METOP-C', made: 'dimensions', axes: 'app' },
    25989: { file: 'xmm-newton.glb', colour: 'telescope', name: 'XMM-Newton', catalogue: 'XMM-NEWTON', made: 'dimensions', axes: 'app' },
    // BATCH EIGHT (2026-10-14; public #949, #950): two more European craft that had no route at all
    // and so wore the shape of their class. Both built in code from cited metres (registry/
    // models.yaml rows `sentinel-2`, `sentinel-3`); no ESA picture or model was used (ESA's terms
    // do not allow it): the layouts are read off DLR's photograph of a model (CC BY 2.0) and a
    // Commons contributor's own drawing (CC BY 4.0).
    //   sentinel-2.glb  the Copernicus land imager: a gold body 3.4 m long, 1.8 m wide and 2.35 m
    //                   high, the multispectral instrument at one end with its opening in a raised
    //                   frame on the Earth face, ONE wing of three panels (7.1 m2) from a side.
    //   sentinel-3.glb  the Copernicus ocean and land satellite: a black body 3.9 x 2.2 x 2.21 m;
    //                   on its Earth face the altimeter's 1.2 m dish, the radiometer's two curved
    //                   openings, the colour camera's five lenses and a gold 60 cm reflector; ONE
    //                   wing of three panels (10.5 m2) on a long yoke.
    // BY NUMBER, from the live saved data of 2026-10-12: SENTINEL-2A, -2B, -2C; SENTINEL-3A, -3B.
    // SENTINEL-3C (launched 15 September 2026) is in that data under 100690, a real number since the
    // five-digit catalogue ran out (data/catnum.js; until 2026-10-14 data/parsers.js read 90 000 and
    // up as a placeholder). 3C is routed BY NAME further down (`sentinel-3c`, klass-gated).
    // SENTINEL-5P and SENTINEL-6 are other craft: 5P has its own file since batch nine (below), 6A and
    // 6B keep NASA's own file.
    // `axes: 'app'`: the instruments on the file's +Z, which the app turns to the Earth, as they
    // fly; the one wing along X, drawn fixed at 45 degrees toward the Sun's side. The real wing
    // turns once an orbit and the real body keeps one heading to its track; the app's does neither.
    40697: { file: 'sentinel-2.glb', colour: 'satellite', name: 'Sentinel-2A', catalogue: 'SENTINEL-2A', made: 'dimensions', axes: 'app' },
    42063: { file: 'sentinel-2.glb', colour: 'satellite', name: 'Sentinel-2B', catalogue: 'SENTINEL-2B', made: 'dimensions', axes: 'app' },
    60989: { file: 'sentinel-2.glb', colour: 'satellite', name: 'Sentinel-2C', catalogue: 'SENTINEL-2C', made: 'dimensions', axes: 'app' },
    41335: { file: 'sentinel-3.glb', colour: 'satellite', name: 'Sentinel-3A', catalogue: 'SENTINEL-3A', made: 'dimensions', axes: 'app' },
    43437: { file: 'sentinel-3.glb', colour: 'satellite', name: 'Sentinel-3B', catalogue: 'SENTINEL-3B', made: 'dimensions', axes: 'app' },
    // BATCH NINE (2026-10-14; public #951, #957, #958): three more European craft that had no route
    // and so wore the shape of their class (a box with two wings and a dish). Each built in code from
    // cited metres (registry/models.yaml rows `sentinel-5p`, `cryosat-2`, `smos`); no ESA picture or
    // model was used: the layouts are read off a Commons contributor's photograph of a model of
    // Sentinel-5P (CC BY 3.0) and DLR's photographs of a model of SMOS (CC BY 2.0); CryoSat-2 has NO
    // FREE PICTURE and is laid out from the pages' own words.
    //   sentinel-5p.glb  the atmosphere satellite: a gold six-sided body, TROPOMI (1.4 x 0.65 x 0.75 m)
    //                    and its radiator on the Earth floor, three wings of 1.8 m2 folded out flat at
    //                    the far end, 5.63 m tip to tip and 3.35 m high (ESA's numbers).
    //                    `axes: 'app'`: the body's axis on the Earth's line, the instrument to the
    //                    Earth, as it flies (nadir-pointing, fixed wings: cited). Three-fold, so the
    //                    app's turn about the vertical changes nothing a page gives.
    //   cryosat-2.glb    the ice altimeter: a body 4.6 x 2.34 x 2.20 m with NO wings, a roof of two
    //                    fixed panels of cells, the two SIRAL dishes side by side at the nose (1.2 m
    //                    apart, cited), the radiator at the nose tip. PITCHED 6 DEGREES NOSE DOWN in
    //                    the file, as it flies (cited). `axes: 'app'`: the length along X, the dishes
    //                    to the Earth. NOT TRUE of the real craft: its orbit is not Sun-synchronous and
    //                    its nose leads along the track; the app turns it about the vertical to keep
    //                    X square to the Sun, so its heading on the map is the app's.
    //   smos.glb         the Y of MIRAS (three arms of three segments, 8 m across, 69 receivers) over
    //                    the instrument's hub and a Proteus bus, two wings of four panels. PITCHED 32.5
    //                    DEGREES in the file, the Y's face forward of the nadir, as it flies (cited).
    //                    `axes: 'app'`: the wings along X with their cells to +Y, the Sun's side; TRUE
    //                    of the real craft in its dawn-dusk orbit (the Sun square to the track, the
    //                    wings static: cited). Which end of X leads is the app's, not the craft's.
    // BY NUMBER, from the live saved data of 2026-10-12: SENTINEL-5P 42969, CRYOSAT 2 36508, SMOS
    // 36036. No other record in the saved data has these shapes (CryoSat-1 was lost at launch).
    42969: { file: 'sentinel-5p.glb', colour: 'satellite', name: 'Sentinel-5P', catalogue: 'SENTINEL-5P', made: 'dimensions', axes: 'app' },
    36508: { file: 'cryosat-2.glb', colour: 'satellite', name: 'CryoSat-2', catalogue: 'CRYOSAT 2', made: 'dimensions', axes: 'app' },
    36036: { file: 'smos.glb', colour: 'satellite', name: 'SMOS', catalogue: 'SMOS', made: 'dimensions', axes: 'app' },
    // BATCH TEN (2026-10-14; public #995, #996), two weather craft that wore the shape of their ring or
    // class, each built in code from cited metres (registry/models.yaml rows `himawari`, `fengyun-3`):
    //   himawari.glb   Himawari-8 and -9 ('identical specifications'): ONLY THE ENVELOPE IS CITED,
    //                  5.2 x 8.0 x 5.3 m; the layout is JMA's sketch, LOOKED AT ONLY (no free picture):
    //                  a dark box with the imager AHI on its Earth face, ONE solar array of two panels,
    //                  a Ka-band dish beside it. They wore the geostationary bus (GEO_BUS: two long wings
    //                  and dishes). `axes: 'app'`: the Earth face on +Z, the array along X, north-south,
    //                  its cells to +Y; HOW A GEOSTATIONARY CRAFT FLIES (the array turns on its axis once
    //                  a day, which the app does not draw).
    //   fengyun-3.glb  FY-3A to 3D, the first batch: SAST's silver box of 4.4 x 2.0 x 2.0 m with ONE
    //                  wing of 22.464 m2 on a truss yoke, 10 m in flight, the microwave imager's
    //                  reflector on the sky face (eoPortal), laid out after a visitor's CC BY 2.0
    //                  photograph of the mockup in Shanghai. They wore the shape of their class (two
    //                  wings and a dish). `axes: 'app'`: the instruments on +Z; the wing along X, FLAT,
    //                  its cells to the sky, as the cited flight size allows. NOT how the real wing
    //                  flies (it turns to the Sun), and the heading on the map is the app's.
    // BY NUMBER from the live saved data of 2026-10-12. FENGYUN 3E to 3H (the second batch, other
    // instruments, 3G with a rain radar), FENGYUN 4A to 4C (no opened page gives their size) and
    // FENGYUN 2G and 2H (spinning drums) are other craft and keep what they had.
    40267: { file: 'himawari.glb', colour: 'satellite', name: 'Himawari-8', catalogue: 'HIMAWARI-8', made: 'dimensions', axes: 'app' },
    41836: { file: 'himawari.glb', colour: 'satellite', name: 'Himawari-9', catalogue: 'HIMAWARI-9', made: 'dimensions', axes: 'app' },
    32958: { file: 'fengyun-3.glb', colour: 'satellite', name: 'Fengyun-3A', catalogue: 'FENGYUN 3A', made: 'dimensions', axes: 'app' },
    37214: { file: 'fengyun-3.glb', colour: 'satellite', name: 'Fengyun-3B', catalogue: 'FENGYUN 3B', made: 'dimensions', axes: 'app' },
    39260: { file: 'fengyun-3.glb', colour: 'satellite', name: 'Fengyun-3C', catalogue: 'FENGYUN 3C', made: 'dimensions', axes: 'app' },
    43010: { file: 'fengyun-3.glb', colour: 'satellite', name: 'Fengyun-3D', catalogue: 'FENGYUN 3D', made: 'dimensions', axes: 'app' },
    20580: { file: 'hubble.glb', colour: 'telescope', name: 'Hubble Space Telescope', catalogue: 'HST' },
    25682: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 7', catalogue: 'LANDSAT 7' },
    // NASA's own Landsat 8, since 2026-10-05. Both were drawn with the Landsat 7 model, which is a
    // different spacecraft: a boxy 1999 bus, where 8 and 9 are the same Orbital/Northrop bus with
    // one long wing. Landsat 9 is a near-copy of 8 and stays `generic`, as it was.
    39084: { file: 'landsat8.glb', colour: 'satellite', name: 'Landsat 8', catalogue: 'LANDSAT 8' },
    49260: { file: 'landsat8.glb', colour: 'satellite', name: 'Landsat 9', catalogue: 'LANDSAT 9', generic: true },
    25867: { file: 'chandra.glb', colour: 'telescope', name: 'Chandra X-ray Observatory', catalogue: 'CXO' },
    28485: { file: 'swift.glb', colour: 'telescope', name: 'Swift', catalogue: 'SWIFT' },
    43435: { file: 'tess.glb', colour: 'telescope', name: 'TESS', catalogue: 'TESS' },
    36395: { file: 'sdo.glb', colour: 'telescope', name: 'Solar Dynamics Observatory', catalogue: 'SDO' },
    37849: { file: 'suomi.glb', colour: 'satellite', name: 'Suomi NPP', catalogue: 'SUOMI NPP' },
    // NOAA 20 is the same Ball BCP-2000 build as Suomi NPP -- same bus, same instruments -- so it
    // shares the file and is labelled as its own spacecraft. NOAA 21 is NOT here on purpose: it is
    // a Northrop Grumman LEOStar-3, a different bus wearing the same instruments, and calling it a
    // sister ship would be a claim that is not true.
    43013: { file: 'suomi.glb', colour: 'satellite', name: 'NOAA 20 (JPSS-1)', catalogue: 'NOAA 20 (JPSS-1)' },
    25994: { file: 'terra.glb', colour: 'satellite', name: 'Terra', catalogue: 'TERRA' },
    27424: { file: 'aqua.glb', colour: 'satellite', name: 'Aqua', catalogue: 'AQUA' },
    28376: { file: 'aura.glb', colour: 'satellite', name: 'Aura', catalogue: 'AURA' },
    // GRACE-FO reuses the GRACE trapezoid-wedge outline. Labelled as what it is, and `generic`
    // so the card can say the drawing is of the sister ship.
    // Sentinel-6 Michael Freilich is a NASA/ESA build and NASA published the model of it, so this
    // one is the spacecraft itself, not a sister ship. Jason-3 (41240) is NOT routed here: it is
    // a Proteus bus, a different shape, and gets its own file.
    46984: { file: 'sentinel6.glb', colour: 'satellite', name: 'Sentinel-6 Michael Freilich', catalogue: 'SENTINEL-6A' },
    43613: { file: 'icesat2.glb', colour: 'satellite', name: 'ICESat-2', catalogue: 'ICESAT-2' },
    // Jason-3 is a rebuild of OSTM/Jason-2 -- same Proteus bus, same instruments -- and NASA only
    // published the Jason-2 model, so this is the sister ship and `generic` lets the card say so.
    41240: { file: 'jason.glb', colour: 'satellite', name: 'a Jason-series ocean altimeter', catalogue: 'JASON-3', generic: true },
    43476: { file: 'grace.glb', colour: 'satellite', name: 'a GRACE-series gravity mapper', catalogue: 'GRACE-FO 1', generic: true },
    // NASA's Magnetospheric Multiscale: four spacecraft flying in a tetrahedron, MMS 1 to MMS 4.
    //
    // THIS USED TO BE THE NAME `mms`, WHICH ALSO MATCHED ELARASAT MMS-1 -- a different satellite,
    // from a different country, doing a different job -- because the word-boundary rule accepts
    // `mms` followed by a hyphen. So the app drew NASA's magnetospheric quartet on it,
    // confidently, with nothing on screen saying so. That is the exact failure this file is
    // organised against, and the third time this class of defect has been found in it.
    //
    // The class gate could not help: both are klass `satellite`. A narrower key could not either,
    // because `MMS 1` and `MMS-1` differ only in the separator the rule deliberately ignores.
    // Four ids is the honest fix, and MMS is a fixed four-spacecraft mission, so unlike a
    // constellation the list cannot go stale.
    40482: { file: 'mms.glb', colour: 'satellite', name: 'Magnetospheric Multiscale 1', catalogue: 'MMS 1' },
    40483: { file: 'mms.glb', colour: 'satellite', name: 'Magnetospheric Multiscale 2', catalogue: 'MMS 2' },
    40484: { file: 'mms.glb', colour: 'satellite', name: 'Magnetospheric Multiscale 3', catalogue: 'MMS 3' },
    40485: { file: 'mms.glb', colour: 'satellite', name: 'Magnetospheric Multiscale 4', catalogue: 'MMS 4' },
    // ---------------------------------------------------------------------------------------
    // GLONASS, WHICH THE CATALOGUE CALLS COSMOS.
    //
    // These are navigation satellites and they are mapped BY ID, not by name, for the reason this
    // file keeps running into: `COSMOS nnnn` is not a spacecraft type. A `cosmos` name key would
    // also catch the four Tselina-2 above, the seven Tselina-D on the `visual` layer and everything
    // else the Soviet Union and Russia ever numbered that way. Etalon 1 and 2 are COSMOS too, and
    // they are balls.
    //
    // The list is CelesTrak's own `gnss` group as of 2026-09-12, filtered to the COSMOS names.
    //
    // THE NAMES BELOW ARE NOT THE ONES THAT GROUP GAVE, and that is a trap worth writing down.
    // CelesTrak returns a DIFFERENT OBJECT_NAME for the same object depending on which file you
    // ask for: GROUP=gnss annotates with the orbital slot, `COSMOS 2433 (720)`, while GROUP=active
    // and a CATNR query both say `COSMOS 2433 [GLONASS-M]`. The first version of this block was
    // written from the gnss group and check-model-ids.sh reported ten WRONG before it was, which
    // is the check doing exactly its job on its author.
    //
    // The `catalogue:` field must come from the endpoint the CHECKER uses (CATNR), and that is
    // also the one the app sees, because registry/sources.yaml fetches GROUP=active.
    // 2026-10-08 (public #429): the shape by the block the catalogue's own label states. GLONASS-M is
    // the pressurised drum, GLONASS-K (and K1) the small box; K2 is a larger craft with no row in
    // scene/models.js NAV_SHAPES and keeps the family box.
    // A FILE A BLOCK since batch ten (2026-10-14; public #988), over the build each row had, which stays
    // as what is drawn while the file loads (registry/models.yaml rows `glonass-m`, `glonass-k`):
    //   glonass-m.glb  the drum, 1.63 m across, with the antenna platform at its Earth end and two
    //                  wings of four panels, 30.85 m2 (the maker's number as the MCC sent it to the IGS,
    //                  IGSMAIL-5104; the drum and the craft's 3.05 m from Duan et al. 2020, CC BY 4.0),
    //                  laid out after two CC0 photographs of models. Its 12.6 m span is DERIVED from the
    //                  area: no page opened gives one (the build above uses a catalogue site's 7.8 m).
    //   glonass-k.glb  the Express-1000 box from the maker's own dimensioned drawings (2.66 x 1.6 x
    //                  0.795 m, two wings of two 1.6 x 2.65 m panels, 9.2 m tip to tip), which the
    //                  GLONASS information centre sent to the IGS in 2011 (acc.igs.org/glonass/). NO
    //                  FREE PICTURE. The build above is a catalogue site's 1 x 1 x 2 m.
    // `generic` stays, as on every navigation file (batch six). `axes: 'app'`: the Earth face on +Z,
    // the wings along X, the cells to +Y; HOW BOTH FLY, by the maker's letters: Earth-pointing, the Sun in
    // the body's X-Y plane, 'Solar panels keep up the Sun direction'. K2 (57517, 63130) is a larger
    // craft and keeps the family box. 100460 and 100744 are numbers of 90 000 and up, which
    // data/parsers.js reads as placeholders: the `glonass` name key below routes them by the bracket.
    32275: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2433 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    32276: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2432 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    32393: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2434 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    32395: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2436 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    36111: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2456 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    36112: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2457 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    36402: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2460 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    37867: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2476 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    37868: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2477 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    37869: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2475 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    39155: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2485 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    39620: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2492 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    40001: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2500 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    40315: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2501 [GLONASS-K]', generic: true, made: 'dimensions', axes: 'app' },
    41330: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2514 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    42939: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2522 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    43508: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2527 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    43687: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2529 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    44299: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2534 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    44850: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2544 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    45358: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2545 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    46805: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2547 [GLONASS-K]', generic: true, made: 'dimensions', axes: 'app' },
    52984: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2557 [GLONASS-K]', generic: true, made: 'dimensions', axes: 'app' },
    54031: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2559 [GLONASS-K]', generic: true, made: 'dimensions', axes: 'app' },
    54377: { build: 'navigation-glonass-m', file: 'glonass-m.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2564 [GLONASS-M]', generic: true, made: 'dimensions', axes: 'app' },
    57517: { build: 'navigation', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2569 [GLONASS-K2]', generic: true },
    63130: { build: 'navigation', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2584 [GLONASS-K2]', generic: true },
    65590: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2596 [GLONASS-K1]', generic: true, made: 'dimensions', axes: 'app' },
    100460: { build: 'navigation-glonass-k', file: 'glonass-k.glb', colour: 'satellite', name: 'a GLONASS navigation satellite', catalogue: 'COSMOS 2619 [GLONASS-K1]', generic: true, made: 'dimensions', axes: 'app' },

    // ---------------------------------------------------------------------------------------
    // THE NASA SCIENCE SET spec 0027 task 9f left open, and the two reasons it was left open.
    //
    // 9f read: "Fermi and CYGNSS skipped -- catalogue names uncertain (FGST? CYGFM0x?) and a name
    // that never matches is a wasted file", and it gave ICON no id at all. Both were answerable in
    // one query each. The catalogue says FGRST (GLAST), not FGST. It says CYGFM01 upward. And ICON
    // is 44628 -- the id 9f floated, 44387, is METEOR-M2 2, which is precisely the failure the
    // `catalogue:` field and check-model-ids.sh exist to catch, caught on paper this time.
    //
    // All six checked live on 2026-09-12 and re-checked by scripts/check-model-ids.sh.
    33053: { file: 'fermi.glb', colour: 'telescope', name: 'the Fermi Gamma-ray Space Telescope', catalogue: 'FGRST (GLAST)' },
    29479: { file: 'hinode.glb', colour: 'telescope', name: 'Hinode', catalogue: 'HINODE (SOLAR-B)' },
    44628: { file: 'icon.glb', colour: 'satellite', name: 'ICON, the Ionospheric Connection Explorer', catalogue: 'ICON' },
    39574: { file: 'gpm.glb', colour: 'satellite', name: 'the GPM Core Observatory', catalogue: 'GPM-CORE' },
    // SeaStar is the spacecraft; SeaWiFS was the instrument; ORBVIEW 2 is what the catalogue calls
    // it. NASA files the model under the spacecraft's build name, which is why every earlier sweep
    // of the NASA index for a catalogue name missed it.
    24883: { file: 'seastar.glb', colour: 'satellite', name: 'SeaStar, which carried SeaWiFS', catalogue: 'ORBVIEW 2 (SEASTAR)' },
    // CYGNSS: eight identical microsatellites launched together, seven still in the catalogue.
    // CYGFM06 (41889) is NOT here -- CelesTrak answers "No GP data found" for it, and an id the
    // catalogue does not have is a mapping that can only ever be wrong.
    41884: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM05' },
    41885: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM04' },
    41886: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM02' },
    41887: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM01' },
    41888: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM08' },
    41890: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM07' },
    41891: { file: 'cygnss.glb', colour: 'satellite', name: 'a CYGNSS hurricane microsatellite', catalogue: 'CYGFM03' },
    // ---------------------------------------------------------------------------------------
    // THE TWENTY-TWO RADAR IMAGERS, which all looked like a box with a dish.
    //
    // A synthetic-aperture radar cannot image what is directly beneath it -- returns from left and
    // right of the ground track would arrive together and could not be told apart -- so every SAR
    // ever flown SQUINTS, and carries a long flat blade of an antenna aimed off to one side. That
    // single constraint is why these twenty-two spacecraft, from four continents and thirty years
    // apart, all look alike, and it is the recognition the shape is built on.
    //
    // `generic: true` and one shape for all of them: they agree about the blade and differ about
    // how wide it is, so the card says "the kind of thing, not this exact one". Proportions are
    // Sentinel-1's published C-SAR, 12.3 m x 0.821 m.
    //
    // THIS ALSO ANSWERS TASK 9g, which found nothing free for Sentinel-1A, Sentinel-1B and the
    // rest of the European set and concluded they "stay generic unless Ivan finds a licensed
    // source". A licence was never the obstacle for a shape this constrained: nobody had drawn it.
    //
    // ERS-1 and Envisat carried far more than a radar and were here because the blade was still the
    // thing you would recognise them by. Since batch eight (2026-10-14) each has a file of its own,
    // further down, and Sentinel-1 has one just below; the blade is what is drawn while it loads.
    // SENTINEL-1 HAS A FILE OF ITS OWN since batch eight (2026-10-14; public #948): sentinel-1.glb, built
    // in code from the numbers eoPortal and ESA's facts page give (registry/models.yaml row
    // `sentinel-1`): the 3.4 x 1.3 x 1.3 m bus, the 12.3 m x 0.821 m antenna of fourteen tiles on its
    // Earth face, and two wings of five panels, each 10 m long. WHAT THE FILE CORRECTS: the `radar`
    // build took this craft's antenna and gave it a bus of 3.9 x 2.2 x 2.2 m and wings of 4.6 m;
    // the real bus is a third of that across and the real wings reach 21 m tip to tip, further
    // than the antenna is long. The cross the build draws is right, and so is its sideways look.
    // The build stays as what is drawn while the file is on its way. Not `generic` any more.
    // BY NUMBER. The live saved data of 2026-10-12 (data/v1/celestrak-active.cols.json) has
    // SENTINEL-1A, SENTINEL-1C and SENTINEL-1D. SENTINEL-1B (41456) is NOT in it: its mission ended
    // in August 2022 and it is in no group the app loads, so its row is dormant; it is the same
    // design and would wear the same file. ESA's facts page (read 2026-10-14) says Sentinel-1A
    // "ended in June 2026"; CelesTrak still lists it as active, and the route does not judge that.
    // `axes: 'app'`, AND THIS IS HOW THEY FLY: a dawn-dusk orbit, so the Sun is square to the
    // track; the antenna along the track (the app's X), the wings along the craft's Y, which "is
    // aligned with the Sun direction" (eoPortal). THE ROLL IS IN THE FILE: 29.45 degrees about X,
    // the antenna's "mechanical ... off-nadir angle" (cited as 30.25 to 28.65 degrees), its face
    // down and away from the Sun, the cells up and toward it.
    39634: { build: 'radar', file: 'sentinel-1.glb', colour: 'satellite', name: 'Sentinel-1A', catalogue: 'SENTINEL-1A', made: 'dimensions', axes: 'app' },
    41456: { build: 'radar', file: 'sentinel-1.glb', colour: 'satellite', name: 'Sentinel-1B', catalogue: 'SENTINEL-1B', made: 'dimensions', axes: 'app' },
    62261: { build: 'radar', file: 'sentinel-1.glb', colour: 'satellite', name: 'Sentinel-1C', catalogue: 'SENTINEL-1C', made: 'dimensions', axes: 'app' },
    66315: { build: 'radar', file: 'sentinel-1.glb', colour: 'satellite', name: 'Sentinel-1D', catalogue: 'SENTINEL-1D', made: 'dimensions', axes: 'app' },
    // RADARSAT-1 has NASA's own model since 2026-10-08 (public #430): its real bus, wings and 15 m
    // antenna, not the family blade. The id is dormant today: 23710 died in 2013 and is in none of
    // the element groups the app loads (registry/models.yaml says so on its row).
    23710: { file: 'radarsat1.glb', colour: 'satellite', name: 'RADARSAT-1', catalogue: 'RADARSAT-1' },
    32382: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RADARSAT-2', generic: true },
    // TERRASAR-X AND TANDEM-X HAVE A FILE OF THEIR OWN since batch seven (2026-10-13; public #979):
    // terrasar-x.glb, built in code from DLR's numbers as eoPortal gives them (registry/models.yaml row
    // `terrasar-x`). WHAT THE FILE CORRECTS: these two are not a blade under a bus with two wings. The
    // craft is a six-sided body 5 m long with NO wings: the 4.8 m antenna lies on one face, 33.8
    // degrees off the nadir, the solar array is fixed on the opposite face, and a 3.3 m boom carries
    // the downlink antenna toward the Earth. The `radar` build stays as what is drawn while the file
    // is on its way. Not `generic` any more: the file is these two craft ("TanDEM-X is identical to
    // its twin", eoPortal). PAZ (by name, below) is the same Airbus design by this file's own comment
    // further down; no page opened for this batch says so in a sentence, so PAZ keeps the blade.
    // `axes: 'app'`, AND THIS IS HOW THEY FLY: a dawn-dusk orbit, so the Sun is square to the track;
    // the long axis along the track (the app's X, square to the Sun), the array up and toward the Sun,
    // the antenna down and to the side away from it.
    31698: { build: 'radar', file: 'terrasar-x.glb', colour: 'satellite', name: 'TerraSAR-X', catalogue: 'TERRASAR-X', made: 'dimensions', axes: 'app' },
    36605: { build: 'radar', file: 'terrasar-x.glb', colour: 'satellite', name: 'TanDEM-X', catalogue: 'TANDEM-X', made: 'dimensions', axes: 'app' },
    31598: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 1', generic: true },
    32376: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 2', generic: true },
    33412: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 3', generic: true },
    37216: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 4', generic: true },
    44873: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-1', generic: true },
    51444: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-2', generic: true },
    67304: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-3', generic: true },
    28931: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ALOS (DAICHI)', generic: true },
    // ALOS-2 HAS A FILE OF ITS OWN since batch nine (2026-10-14; public #977): alos-2.glb, built in
    // code from JAXA's numbers as eoPortal gives them (registry/models.yaml row `alos-2`): PALSAR-2,
    // 9.9 m by 2.9 m of five panels, UNDER a gold body, two solar paddles of three panels across the
    // track, 16.5 m tip to tip, laid out after a visitor's photograph (CC0) of JAXA's 1/50 model; no
    // JAXA picture was used. The `radar` build stays as what is drawn while the file is on its way.
    // Not `generic`: the file is this craft. ALOS (DAICHI) and ALOS-4 are other craft (ALOS-4's
    // antenna is another size) and keep the blade. `axes: 'app'`: the antenna's face to the Earth,
    // its length along Y, the paddles along X. HOW IT FLIES, in part: in its noon orbit the Sun is in
    // the orbit's plane, so the paddles' axis across the track is square to the Sun, as the app keeps
    // X; the paddles are held at 45 degrees where the real ones turn. THE FILE IS LEVEL: the craft
    // rolls up to 30 degrees left or right for a pass from a nominal Earth-pointing attitude (cited),
    // so no one angle is how it flies.
    39766: { build: 'radar', file: 'alos-2.glb', colour: 'satellite', name: 'ALOS-2', catalogue: 'ALOS-2', made: 'dimensions', axes: 'app' },
    60182: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ALOS-4 (DAICHI-4)', generic: true },
    // SAOCOM 1A AND 1B HAVE A FILE OF THEIR OWN since batch six (2026-10-13; public #978): saocom.glb,
    // built in code from CONAE's numbers as eoPortal gives them (a 10 m by 3.5 m antenna of seven
    // panels, a 15 m2 solar wing, a body 4.4 m long) and laid out as CONAE's own render has it
    // (CC BY 4.0): the bus lying ACROSS the antenna's back, the wing standing beside it (registry/
    // models.yaml row `saocom`, kind `built-from-dimensions`). The shared `radar` build stays as what
    // is drawn while the file is on its way: Sentinel-1's plan, a blade under a bus with two wings,
    // which SAOCOM is not. Not `generic` any more: the file is these two craft and no other.
    // `axes: 'app'`: the antenna's face to the Earth. NOT AS IT FLIES: the real craft is rolled so
    // the antenna looks to one side of its track; the app's one attitude cannot say a roll.
    43641: { build: 'radar', file: 'saocom.glb', colour: 'satellite', name: 'SAOCOM 1A', catalogue: 'SAOCOM 1A', made: 'dimensions', axes: 'app' },
    46265: { build: 'radar', file: 'saocom.glb', colour: 'satellite', name: 'SAOCOM 1B', catalogue: 'SAOCOM 1B', made: 'dimensions', axes: 'app' },
    // ERS-1 AND ENVISAT HAVE A FILE EACH since batch eight (2026-10-14; public #945, #944), built in
    // code from the numbers on eoPortal's pages (registry/models.yaml rows `ers-1`, `envisat`). The
    // family comment above said they were "here because the blade is still the thing you would
    // recognise them by"; neither is a bus with a blade under it and two wings.
    //   ers-1.glb    a gold payload module (2 x 2 x 3 m) and a silver SPOT platform; the 10 m x 1 m
    //                radar antenna ACROSS the far end, the wind scatterometer's two 3.6 m antennas
    //                in a V beyond it; the altimeter's 1.2 m dish on the Earth face; one solar array
    //                of two panels (11.7 m x 2.4 m) across the end of an arm. ERS-2 is in none
    //                of the saved data files of 2026-10-12 and has no row.
    //   envisat.glb  a 10.5 m gold body with its instruments on the Earth face; the 10 m x 1.3 m
    //                ASAR antenna ACROSS it; the Ka-band dish on a 2 m mast on the side away from
    //                the Earth; one 14 m x 5 m wing beyond the service module, 26 m end to tip.
    // The `radar` build stays as what is drawn while a file is on its way. Not `generic` any more.
    // BOTH ARE DEAD, and the card must not let the drawing say otherwise. ERS-1's mission ended on
    // 10 March 2000; contact with Envisat was lost on 8 April 2012 (eoPortal, both read
    // 2026-10-14). Each file is the craft as it flew while it worked, whole and steady, and nobody
    // steers either now, so `was:` adds that as a sentence of its own after "drawn as"
    // (COPY.drawing.objectWas, as Hitomi's does). Envisat's place in the lists and its "dead since
    // 2012" are data/layers.js's and are not touched.
    // `axes: 'app'`: the instruments to the Earth, the body and its one array along X, the radar
    // antenna along Y. AS THEY FLEW the body lay across the track and the array turned about its
    // arm once an orbit; the app keeps X square to the Sun and does not turn the array.
    21574: { build: 'radar', file: 'ers-1.glb', colour: 'satellite', name: 'ERS-1', catalogue: 'ERS-1', made: 'dimensions', was: 'ers1', axes: 'app' },
    27386: { build: 'radar', file: 'envisat.glb', colour: 'satellite', name: 'Envisat', catalogue: 'ENVISAT', made: 'dimensions', was: 'envisat', axes: 'app' },

    // ---------------------------------------------------------------------------------------
    // SEVEN MORE RADAR IMAGERS, BY ID, and they are split between the two shapes -- which is the
    // whole reason the split exists.
    //
    // THE BLADE:
    //   SEASAT 1, 1978, the first civilian synthetic-aperture radar ever flown and on the
    //   `visual` layer. Its antenna is "a 10.74-m (along-track) by 2.16-m (cross-track) planar
    //   array" -- the flat side-looking blade, forty-eight years before Sentinel-1's, which is
    //   what makes this family a family.
    //   RCM 1, 2 and 3, the RADARSAT Constellation: "a unidirectional electronically steerable
    //   planar phased-array SAR antenna", 6.98 m.
    //
    // THE UMBRELLA:
    //   RISAT-2B, 2BR1 and 2BR2 carry, in ISRO's own words, "the X-Band SAR with a radial rib
    //   reflector 3.6 m mesh antenna". Same job as the blade, opposite hardware.
    //
    // BY ID RATHER THAN BY NAME, for a reason the catalogue makes concrete. `risat` as a key is
    // SAFE today -- wordMatch rejects TIGRISAT and BRISAT, which contain the letters and are an
    // Iraqi CubeSat and an Indonesian communications satellite -- and it would still be wrong,
    // because RISAT-1 flew a PLANAR active array and would take the umbrella if it ever returned
    // to the catalogue. A key that is right about every object that exists today and wrong about
    // one that might is a key worth not writing.
    // SEASAT HAS ITS OWN SHAPE since 2026-10-13 (public #946): an Agena stage 21 m long with the first
    // radar antenna flown in orbit hung off its side, which is nothing like the bus-and-blade the
    // `radar` build draws for RCM. seasat.glb: the trunk generated from JPL's artist's concept, the
    // wings, the antenna, the sticks and the dishes built in code. The build is what is drawn first.
    // `axes: 'app'` since batch three: the sensor module and its antennas are on the file's +Z, which
    // the app turns to the Earth, as the craft flew (the Agena's engine to the zenith).
    10967: { build: 'radar', file: 'seasat.glb', colour: 'satellite', name: 'Seasat', catalogue: 'SEASAT 1', made: 'render', axes: 'app' },
    44322: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RCM-1', generic: true },
    44323: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RCM-3', generic: true },
    44324: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RCM-2', generic: true },
    44233: { build: 'radar-mesh', colour: 'satellite', name: 'a radar imager with a mesh reflector', catalogue: 'RISAT-2B', generic: true },
    44857: { build: 'radar-mesh', colour: 'satellite', name: 'a radar imager with a mesh reflector', catalogue: 'RISAT-2BR1', generic: true },
    46905: { build: 'radar-mesh', colour: 'satellite', name: 'a radar imager with a mesh reflector', catalogue: 'RISAT-2BR2', generic: true },

    // ---------------------------------------------------------------------------------------
    // ACS3, NASA's Advanced Composite Solar Sail System, on the `visual` layer -- a 9 m square of
    // film is a very large very bright flat thing, which is the whole point of a sail and the
    // reason it is on that layer.
    //
    // `build:` and NOT generic. NASA ships `3D Models/Solar Sail Concept`, public domain, and it
    // was fetched, looked at and REJECTED: it is an octagon, and ACS3 is a square with booms along
    // the diagonals. A procedural shape from ACS3's own published numbers -- 80 m^2, "about 9
    // meters on a side", two booms "spanning the diagonal" -- is closer to the object than
    // somebody's drawing of a different object, so the card's "drawn from published dimensions
    // for ACS3" is the true sentence here.
    59588: { build: 'solarsail', colour: 'satellite', name: 'ACS3, a solar sail', catalogue: 'ACS3' },

    // THE NINE LASER-RANGING SPHERES, which were all drawn as a box bus with a dish and two wings.
    //
    // These are solid balls studded with retroreflectors. No wings, no antenna, no instrument,
    // nothing that moves; a ground station fires a laser at them and times the flash coming back.
    // They are the only spheres in the catalogue and they had the least sphere-like shape in it.
    //
    // ONE SHAPE, NINE SIZES, and `generic: true` because of that: AJISAI is 2.15 m, Etalon 1.29 m,
    // LAGEOS 0.60 m, LARES 0.36 m, Starlette, Stella and WESTPAC 0.24 m. Size on screen encodes
    // class here and never metres, so one ball serves all nine -- and the card says "the kind of
    // thing, not this exact one" rather than implying we modelled each.
    //
    // AJISAI is the one on `visual`: it carries 318 mirrors as well as its corner cubes and
    // FLASHES as it rotates, which is why a person outside can see it.
    // Etalon 1 and 2 are catalogued as COSMOS 1989 and COSMOS 2024, which is one more reminder
    // that a COSMOS number says nothing about what the spacecraft is.
    // LARES-2 had no row here until batch three: the id it is often given, 52307, is STARLINK-3755.
    //
    // AJISAI AND THE TWO LAGEOS HAVE THEIR OWN SURFACES since 2026-10-13 (public #947): the surface
    // is the whole of what these are. Both files were built in code, with no generator (registry
    // rows `ajisai` and `lageos`, kind `built-from-dimensions`). lageos.glb: a 60 cm ball with 426
    // cube corners, each ring at its published colatitude with its published count; LAGEOS 2 is
    // "an identical S/C" (eoPortal), so the two wear one file. ajisai.glb: 2.15 m, 318 flat mirrors
    // and 120 reflector panels of 1 436 cubes; the counts are published and the placement is not,
    // and the row says so. Not `generic` any more. The other six balls keep the one shape: nobody
    // had built their surfaces then (batch three did, below). The build is what is drawn first.
    16908: { build: 'sphere', file: 'ajisai.glb', colour: 'satellite', name: 'Ajisai', catalogue: 'AJISAI (EGS)', made: 'dimensions' },
    8820: { build: 'sphere', file: 'lageos.glb', colour: 'satellite', name: 'LAGEOS', catalogue: 'LAGEOS 1', made: 'dimensions' },
    22195: { build: 'sphere', file: 'lageos.glb', colour: 'satellite', name: 'LAGEOS', catalogue: 'LAGEOS 2', made: 'dimensions' },
    // THE OTHER SIX, AND LARES-2, HAVE THEIR OWN SURFACES since batch three (2026-10-13): five files,
    // each built in code from what the International Laser Ranging Service's mission page (NASA-hosted)
    // says of its ball, with no generator (registry rows `starlette`, `lares`, `lares2`, `etalon`,
    // `westpac`, kind `built-from-dimensions`). No route keeps the one plain ball any more; it is
    // what each draws while its file is on its way.
    //   starlette.glb  24 cm, 60 cubes, three on each of twenty triangular plates. Starlette and
    //                  Stella wear it: the page gives both one description ("60 identical").
    //   lares.glb      36.4 cm, 92 cubes in the rows of the mission's own table (1, 5, 10, 14, 16 a
    //                  hemisphere, each at its latitude and first longitude).
    //   lares2.glb     42.4 cm, 303 cubes. THE COUNT IS PUBLISHED AND THE PLACEMENT IS OURS (the table
    //                  of coordinates is a scan nobody here read), and the row says so, as Ajisai's does.
    //   etalon.glb     1.294 m, 2 146 cubes in 306 arrays. Counts published, placement ours. Etalon 1
    //                  and 2 wear it.
    //   westpac.glb    a 182 mm ball under sixty baffle tubes, 245 mm over them, three on each face
    //                  of an icosahedron: the one ball that is not smooth.
    // LARES-2 IS 53105 in the catalogue saved on 2026-10-12 ("LARES-2"); the id it is often given,
    // 52307, is STARLINK-3755, which is why it had no row before. scripts/check-model-ids.sh holds it.
    // Larets (27944) and the Calspheres have no row: no page read gives Larets's arrangement, and
    // the ILRS has no page for a Calsphere.
    7646: { build: 'sphere', file: 'starlette.glb', colour: 'satellite', name: 'Starlette', catalogue: 'STARLETTE', made: 'dimensions' },
    22824: { build: 'sphere', file: 'starlette.glb', colour: 'satellite', name: 'Stella', catalogue: 'STELLA', made: 'dimensions' },
    38077: { build: 'sphere', file: 'lares.glb', colour: 'satellite', name: 'LARES', catalogue: 'LARES', made: 'dimensions' },
    53105: { build: 'sphere', file: 'lares2.glb', colour: 'satellite', name: 'LARES-2', catalogue: 'LARES-2', made: 'dimensions' },
    19751: { build: 'sphere', file: 'etalon.glb', colour: 'satellite', name: 'Etalon 1', catalogue: 'COSMOS 1989 (ETALON 1)', made: 'dimensions' },
    20026: { build: 'sphere', file: 'etalon.glb', colour: 'satellite', name: 'Etalon 2', catalogue: 'COSMOS 2024 (ETALON 2)', made: 'dimensions' },
    25398: { build: 'sphere', file: 'westpac.glb', colour: 'satellite', name: 'WESTPAC', catalogue: 'WESTPAC', made: 'dimensions' },

    // ---------------------------------------------------------------------------------------
    // TSELINA-2, the eighteen of them still in the catalogue.
    //
    // The `visual` layer -- things bright enough to go outside and see -- carries eighteen COSMOS
    // records, and they are NOT one kind of spacecraft. Four are Tselina-2 (3 200 kg, Zenit-2,
    // ~71 deg) and seven are its predecessor Tselina-D (2 000 kg, Tsyklon-3, ~82.5 deg), which is
    // a different bus. Putting this model on the 82.5 deg ones because they are also COSMOS and
    // also Soviet ELINT would be exactly the confident lie this file exists to prevent, so they
    // are not here and keep the generic shape.
    //
    // Membership is Gunter's Space Page's Tselina-2 launch table, joined to the catalogue on
    // COSPAR id on 2026-09-12; every NORAD id below came back from CelesTrak with the name in its
    // `catalogue:` field on that date, and scripts/check-model-ids.sh re-checks them live.
    // Kosmos 1714 (1985-121A) is in the family and is NOT here: its query could not be read that
    // day, and an id nobody has checked is the kind of id that shipped wrong twice before.
    //
    // No `generic:` flag: this is the spacecraft, not a family stand-in. Kosmos 1603 and 1656 are
    // the first two of the family and flew on Proton rather than Zenit-2, which changed how they
    // got up and not what they are.
    15333: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 1603, a Tselina-2 listening satellite', catalogue: 'COSMOS 1603' },
    15755: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 1656, a Tselina-2 listening satellite', catalogue: 'COSMOS 1656' },
    17973: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 1844, a Tselina-2 listening satellite', catalogue: 'COSMOS 1844' },
    19119: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 1943, a Tselina-2 listening satellite', catalogue: 'COSMOS 1943' },
    19649: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 1980, a Tselina-2 listening satellite', catalogue: 'COSMOS 1980' },
    20624: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2082, a Tselina-2 listening satellite', catalogue: 'COSMOS 2082' },
    22219: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2219, a Tselina-2 listening satellite', catalogue: 'COSMOS 2219' },
    22284: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2227, a Tselina-2 listening satellite', catalogue: 'COSMOS 2227' },
    22565: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2237, a Tselina-2 listening satellite', catalogue: 'COSMOS 2237' },
    22802: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2263, a Tselina-2 listening satellite', catalogue: 'COSMOS 2263' },
    23087: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2278, a Tselina-2 listening satellite', catalogue: 'COSMOS 2278' },
    23404: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2297, a Tselina-2 listening satellite', catalogue: 'COSMOS 2297' },
    23704: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2322, a Tselina-2 listening satellite', catalogue: 'COSMOS 2322' },
    24297: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2333, a Tselina-2 listening satellite', catalogue: 'COSMOS 2333' },
    25406: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2360, a Tselina-2 listening satellite', catalogue: 'COSMOS 2360' },
    26069: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2369, a Tselina-2 listening satellite', catalogue: 'COSMOS 2369' },
    28352: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2406, a Tselina-2 listening satellite', catalogue: 'COSMOS 2406' },
    31792: { file: 'tselina2.glb', colour: 'satellite', name: 'Kosmos 2428, a Tselina-2 listening satellite', catalogue: 'COSMOS 2428' },
  },
  horizons: {
    '-31': { file: 'voyager.glb', colour: 'probe', name: 'Voyager 1' },
    '-32': { file: 'voyager.glb', colour: 'probe', name: 'Voyager 2' },
    '-61': { file: 'juno.glb', colour: 'probe', name: 'Juno' },
    // Ended missions and the two Pioneers (2026-10-06, issue #431): each has a record now because
    // each has a file of its own path (site/data/eph, propagate/ephemeris.js). NASA publishes one
    // Pioneer model, of Pioneer 10; Pioneer 11 is its sister craft of the same design.
    '-82': { file: 'cassini.glb', colour: 'probe', name: 'Cassini' },
    '-77': { file: 'galileo.glb', colour: 'probe', name: 'Galileo' },
    '-23': { file: 'pioneer.glb', colour: 'probe', name: 'Pioneer 10' },
    '-24': { file: 'pioneer.glb', colour: 'probe', name: 'Pioneer 11' },
    '-96': { file: 'parker.glb', colour: 'probe', name: 'Parker Solar Probe' },
    // BOTH a build and a file, and this is the one row that has both. Until 2026-10-05 it was the
    // procedural shape alone (buildJwst in scene/models.js), because a loaded model was painted in
    // one colour for its class and JWST without the contrast between gold, silver and dark is a
    // brown lump -- which is what shipped until 2026-09-20. A file now keeps its own colours
    // (scripts/bake-own-colours.mjs), so NASA's mesh is the picture: eighteen gold segments, the
    // tripod, the five-layer shield. The build stays as what is drawn while the file is in flight
    // (heroes.js acquire), so a slow connection sees a Webb-shaped thing and then a better one.
    '-170': { build: 'jwst', file: 'jwst.glb', colour: 'telescope', name: 'James Webb Space Telescope' },
    '-21': { file: 'soho.glb', colour: 'telescope', name: 'SOHO' },
    '-74': { file: 'mro.glb', colour: 'probe', name: 'Mars Reconnaissance Orbiter' },
    // NASA's printable parts for New Horizons (science.nasa.gov/3d-resources/new-horizons, read 2026-10-10),
    // assembled and baked into new-horizons.glb (registry/models.yaml says how). Until 2026-10-10 there was
    // no file and this named only the PROCEDURAL shape; it stays as what is drawn while the file is on its
    // way, as JWST's does (heroes.js acquire).
    '-98': { build: 'new-horizons', file: 'new-horizons.glb', colour: 'probe', name: 'New Horizons' },
    // Three of the twelve craft added on 2026-09-22 as the generic probe, which NASA publishes a
    // model of (issue #431). OSIRIS-APEX is the OSIRIS-REx spacecraft under its second mission's
    // name -- the same vehicle, so this is its model and not a stand-in. NASA's STEREO model is
    // one drawing for two near-identical craft; STEREO-A is the one still flying.
    '-85': { file: 'lro.glb', colour: 'probe', name: 'Lunar Reconnaissance Orbiter' },
    '-64': { file: 'osiris-rex.glb', colour: 'probe', name: 'OSIRIS-APEX' },
    '-234': { file: 'stereo.glb', colour: 'probe', name: 'STEREO-A' },
    // 2026-10-07 (internal #389, public #438 and #431): five craft that each got a record the day
    // their NASA mesh did. Spitzer and Kepler are switched off and still in their orbits of the
    // Sun; Roman launched on 30 August 2026; Mars Odyssey circles Mars; Dawn is drawn inside
    // the years of its own path (site/data/eph), like Cassini.
    '-79': { file: 'spitzer.glb', colour: 'telescope', name: 'Spitzer Space Telescope' },
    '-227': { file: 'kepler.glb', colour: 'telescope', name: 'Kepler' },
    '-211': { file: 'roman.glb', colour: 'telescope', name: 'Nancy Grace Roman Space Telescope' },
    '-53': { file: 'odyssey.glb', colour: 'probe', name: 'Mars Odyssey' },
    '-203': { file: 'dawn.glb', colour: 'probe', name: 'Dawn' },
    // 2026-10-08 (public #431): four more ended missions, each drawn inside the years of its path.
    // MAVEN: on its last tracked orbit of Mars; its row says nobody knows where on it (data/sample.js LOST_ORBITERS).
    '-202': { file: 'maven.glb', colour: 'probe', name: 'MAVEN' },
    '-226': { file: 'rosetta.glb', colour: 'probe', name: 'Rosetta' },
    '-93': { file: 'near.glb', colour: 'probe', name: 'NEAR Shoemaker' },
    '-29': { file: 'stardust.glb', colour: 'probe', name: 'Stardust' },
    '-140': { file: 'deep-impact.glb', colour: 'probe', name: 'Deep Impact' },
    // Mars 2020 in cruise: NASA's file is the rover, and what flew between the planets was a
    // closed capsule under a ring of solar cells. A procedural shape from the one published
    // length (scene/models.js buildMars2020Cruise), with nothing to upgrade to.
    '-168': { build: 'mars-2020-cruise', colour: 'probe', name: 'Mars 2020 in cruise' },
  },
  /**
   * Matched on the catalogue NAME rather than a catalogue number, deliberately.
   *
   * A wrong NORAD id shows the wrong spacecraft, confidently, and nothing on screen would say so
   * -- which is the one failure this project is organised against. Catalogue names are noisy but
   * self-correcting: a name that stops matching shows the generic model, which is honest.
   * Keys are lower-cased substrings of the catalogue name.
   */
  named: {
    // Every spent stage on the visible layer -- SL-16, CZ-2C, Centaur, Delta, H10 -- was drawn as
    // a LAUNCHING rocket: fairing, nose, plume. A spent stage is a tube with a nozzle, tumbling.
    // NASA's Shuttle solid rocket booster stood in for the class until 2026-10-07 (issue #410): a
    // booster is a segmented tube with a nose cone, and a spent upper stage is a tank and a bell.
    // models.js buildUpperStage draws that now, from one real stage's published dimensions, and
    // it tumbles. `generic: true` is what makes the card say
    // "drawn as a spent rocket stage -- the kind of thing, not this exact one". parsers.js
    // classifies R/B, ROCKET BODY, AKM, PKM and UPPER STAGE as klass `rocket`, and only those.
    'r/b': { build: 'stage', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    'rocket body': { build: 'stage', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    'upper stage': { build: 'stage', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    // NOAA 15, 18 and 19 are the Advanced TIROS-N / POES bus and among the brightest things a
    // person can see pass over. Matched on the full name, whole words, klass satellite: "NOAA 15"
    // yes, "NOAA 15 DEB" no (klass debris), NOAA 20 no (a JPSS bus, already mapped by id to the
    // Suomi model), NOAA 21 no (JPSS-2, a different bus; since 2026-10-13 it has a file of its own, by id, above).
    // By name rather than by catalogue number because a number that cannot be checked live today
    // is a number that shipped wrong once before.
    // OCO-2 is on the `active` layer under the catalogue name OCO 2. By name, not id: its id was not
    // confirmed against a live catalogue this session, and a wrong id draws the wrong spacecraft.
    'oco 2': { file: 'oco2.glb', colour: 'satellite', name: 'Orbiting Carbon Observatory-2', klass: ['satellite'] },
    'oco-2': { file: 'oco2.glb', colour: 'satellite', name: 'Orbiting Carbon Observatory-2', klass: ['satellite'] },
    cloudsat: { file: 'cloudsat.glb', colour: 'satellite', name: 'CloudSat', klass: ['satellite'] },
    calipso: { file: 'calipso.glb', colour: 'satellite', name: 'CALIPSO', klass: ['satellite'] },
    'noaa 15': { file: 'poes.glb', colour: 'satellite', name: 'NOAA 15', klass: ['satellite'] },
    'noaa 18': { file: 'poes.glb', colour: 'satellite', name: 'NOAA 18', klass: ['satellite'] },
    'noaa 19': { file: 'poes.glb', colour: 'satellite', name: 'NOAA 19', klass: ['satellite'] },
    // A visiting vehicle's catalogue number changes every flight, so it is matched by name. NOTE the
    // klass: the stations layer forces none, and parsers.js classify() makes a Soyuz, Progress or
    // Cygnus klass `satellite` (only ISS/CSS names and six ids are `station`), so both are allowed
    // and debris is not. These
    // rows carry `build:` instead of `file:`: no free model with a licence exists for a modern
    // Soyuz or any Progress (spec 0027 hunt, 2026-09-08), so the shape is procedural, drawn at
    // once by scene/models.js rather than fetched. `generic: true` because it is the family hull,
    // and the card says so.
    // Tiangong: three catalogue objects at one position. The core draws the whole T; a lab draws
    // as a single module when the core's model has not already swallowed it. Klass station by
    // classify()'s own rule (`CSS (` names). A CC BY model of the core is listed in spec 0027.
    //
    // `displayName` is the name a person uses for THIS object, and it wins over the catalogue's
    // string even though the SHAPE is generic. The two were one flag: `generic: true` says the
    // drawing is representative, and ui/cards.js and ui/labels.js both read it as "the name is a
    // type, not this object" -- right for "a Starlink", wrong for the second crewed station in
    // orbit, which the stations trip is about and which was labelled "CSS (TIANHE)" while the ISS
    // beside it read "International Space Station".
    'css (tianhe': { build: 'tiangong', colour: 'station', name: 'the Tiangong station', displayName: 'Tiangong space station', klass: ['station'], generic: true },
    'css (wentian': { build: 'tiangong-module', colour: 'station', name: 'a Tiangong laboratory module', displayName: 'Wentian, a Tiangong module', klass: ['station'], generic: true },
    'css (mengtian': { build: 'tiangong-module', colour: 'station', name: 'a Tiangong laboratory module', displayName: 'Mengtian, a Tiangong module', klass: ['station'], generic: true },
    // Shenzhou and Tianzhou: the Soyuz plan at Chinese proportions, white-grey, wings on both ends
    // of a Shenzhou. CC BY models exist for both (spec 0027, Ivan's list); procedural until then.
    // FILES AS WELL since batch three (2026-10-13; public #941, #942), each hull ONE LATHE as the
    // Soyuz's, built in code from the published metres (registry rows `shenzhou`, `tianzhou`, kind
    // `built-from-dimensions`). shenzhou.glb is the generation that flies now: ONE pair of wings, on
    // the service module. tianzhou.glb: a 3.35 m cargo drum, a cone, a 2.8 m propulsion module with
    // two wings of three panels. No free picture of either exists (CMSA's are not), so the cards'
    // sentence rests on the metres; the rows say which drawings were looked at. `generic` stays.
    shenzhou: { build: 'shenzhou', file: 'shenzhou.glb', colour: 'station', name: 'a Shenzhou spacecraft', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    tianzhou: { build: 'tianzhou', file: 'tianzhou.glb', colour: 'station', name: 'a Tianzhou cargo ship', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    // Dragon 2, crew or cargo: CelesTrak names them CREW DRAGON n and DRAGON CRS-n. Both keys, so
    // a bare `dragon` never catches anything else. A CC BY model is on Ivan's list (spec 0027).
    // Iridium: 66 NEXT satellites in service and the first generation's survivors, all one plan.
    // Klass satellite only, so IRIDIUM 33 DEB and the rest of that collision keep the debris shape.
    iridium: { build: 'iridium', colour: 'satellite', name: 'an Iridium satellite', klass: ['satellite'], generic: true },
    // SIXTY-SEVEN MORE RADAR IMAGERS, by name, and three constellations deliberately left out.
    //
    // The twenty-two mapped by id are the big national ones. These are the commercial and small
    // ones, and they carry the same flat side-looking blade: ICEYE's is 3.25 m on an 85 kg
    // microsatellite, Synspective's StriX about 5 m, and PAZ is a TerraSAR-X built from the same
    // drawing. That range -- 3.25 m to RADARSAT-2's 15 m -- is wider than the family shape admits,
    // which is what `generic: true` and "the kind of thing" are for.
    //
    // NOT EVERY RADAR SATELLITE HAS A BLADE, and the three that do not are excluded on purpose:
    // Capella, Umbra and QPS-SAR each unfurl a MESH REFLECTOR, which is a dish. Giving them the
    // blade would be the same mistake as giving a navigation satellite a dish, run backwards, and
    // all three are asserted to keep the generic shape until somebody draws the umbrella.
    // THE OTHER KIND OF RADAR IMAGER: twenty-five spacecraft that do the same job by the opposite
    // means. Capella, Umbra and iQPS each unfurl a PARABOLIC MESH REFLECTOR on radial ribs, which
    // is a dish, so they must not take the blade above -- #105 left them deliberately generic and
    // said the umbrella was a shape nobody had drawn here yet. It is drawn now.
    //
    // The rule this pair of shapes makes concrete: a shared FUNCTION is not a shared SHAPE. Radar
    // imaging is the job; the flat blade and the wrapped-rib umbrella are two ways to do it, and
    // they look nothing alike.
    capella: { build: 'radar-mesh', colour: 'satellite', name: 'a radar imager with a mesh reflector', klass: ['satellite'], generic: true },
    // UMBRA AND ICEYE HAVE FILES OF THEIR OWN since batch five (2026-10-13; public #983, #998), each
    // built in code from cited metres (registry/models.yaml rows `umbra`, `iceye`, kind
    // `built-from-dimensions`). Both stay BY NAME and klass-gated, as before: the fleets grow by the
    // launch, and the names CelesTrak gives them in the live saved data (data/v1/
    // celestrak-active.cols.json, read 2026-10-13) are `UMBRA-07` to `UMBRA-12` (5 records) and
    // `ICEYE-X2` upward (56). `generic` stays on both: one shape for several generations of each.
    //   umbra.glb  the layout of Umbra's own drawing in its FCC orbital-debris report: a 58 cm bus
    //              BEHIND THE MIDDLE of a 3.8 m umbrella, the payload's column up its axis (a
    //              centre-fed dish), a small solar array flat on each side of the bus. The shared
    //              `radar-mesh` build beside it is Capella's plan (an offset feed on a boom, one wing),
    //              which Umbra is not. The mesh is a net on 24 ribs, never a filled disc (NISAR's rule).
    //   iceye.glb  a 3.2 m by 0.4 m antenna of five panels with five solar panels standing in a row on
    //              its back and the bus behind the middle one. The shared `radar` build is Sentinel-1's
    //              12 m blade on a bus with wings, which an 85 kg ICEYE is not.
    // Capella and iQPS keep the shared umbrella: no page opened gives Capella's bus or boom in metres.
    umbra: { build: 'radar-mesh', file: 'umbra.glb', colour: 'satellite', name: 'an Umbra radar satellite', klass: ['satellite'], generic: true, made: 'dimensions', axes: 'app' },
    'qps-sar': { build: 'radar-mesh', colour: 'satellite', name: 'a radar imager with a mesh reflector', klass: ['satellite'], generic: true },
    iceye: { build: 'radar', file: 'iceye.glb', colour: 'satellite', name: 'an ICEYE radar satellite', klass: ['satellite'], generic: true, made: 'dimensions', axes: 'app' },
    // SENTINEL-3C BY NAME (batch eight, 2026-10-14; public #950): the third of the series, launched
    // 15 September 2026, is in the live saved data of 2026-10-12 as `SENTINEL-3C` under catalogue
    // number 100690 (real: data/catnum.js; read as a placeholder until 2026-10-14). Its sisters are
    // routed by number above; this key takes the same file for the same design. Klass-gated, and a
    // whole word: `SENTINEL-3C DEB` (debris) and `SENTINEL-3A` do not match it. Not `generic`: the
    // file is this craft. Once its number is known to be its own, add it above and leave this key.
    'sentinel-3c': { file: 'sentinel-3.glb', colour: 'satellite', name: 'Sentinel-3C', klass: ['satellite'], made: 'dimensions', axes: 'app' },
    // STRIX HAS A FILE OF ITS OWN since batch seven (2026-10-13; public #984): strix.glb, built in code
    // from Synspective's numbers as eoPortal tabulates them (registry/models.yaml row `strix`): a 5 m
    // by 0.8 m antenna of seven panels with a 0.8 x 1.0 x 0.8 m bus behind the middle one, and solar
    // cells on the BACK of the antenna's wings. The shared `radar` build is Sentinel-1's 12 m blade on
    // a bus with two wings of its own, which a 100 kg StriX is not. BY NAME and klass-gated, as before:
    // the fleet grows by the launch; CelesTrak's names in the live saved data (data/v1/
    // celestrak-active.cols.json, read 2026-10-13) are `STRIX-1` to `STRIX-12` (11 records). `generic`
    // stays: one shape for every craft of the series.
    // `axes: 'app'`: the antenna's face to the Earth, its length along X, the cells to the sky. NOT AS
    // IT FLIES: the real craft rolls to look to one side of its track and turns its cells to the Sun
    // between passes; the app's one attitude cannot say either.
    strix: { build: 'radar', file: 'strix.glb', colour: 'satellite', name: 'a StriX radar satellite', klass: ['satellite'], generic: true, made: 'dimensions', axes: 'app' },
    paz: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', klass: ['satellite'], generic: true },
    novasar: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', klass: ['satellite'], generic: true },
    'gaofen-3': { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', klass: ['satellite'], generic: true },
    // THE OTHER 130 NAVIGATION SATELLITES, by name -- 54 BeiDou, 35 Galileo, 32 GPS, 7 IRNSS,
    // 5 QZSS -- all drawn until now as a communications satellite, whose whole silhouette is the
    // parabolic dish these spacecraft are defined by NOT having.
    //
    // EVERY KEY WAS TESTED AGAINST THE LIVE GROUP before it was written here. Two traps were found
    // and both are avoided:
    //   * `gsat` would catch GSAT-8, GSAT-10 and GSAT-15, which are ISRO COMMUNICATIONS satellites
    //     in geostationary orbit that happen to carry a GAGAN augmentation payload. The Galileos
    //     are `GSAT0101 (GALILEO-PFM)` upward, so the key is `galileo`, which is inside the
    //     parentheses on every one of them and on none of the GSAT-n.
    //   * thirteen more augmentation payloads ride on INMARSAT 4-F2, SES-5, SES-15, ASTRA 5B,
    //     EUTELSAT 117 WEST B, EUTELSAT 5 WEST B, GALAXY 30 and the three LUCH relays. Those ARE
    //     communications satellites with dishes, and they correctly match nothing here.
    // Result: 130 of the 172 in the group matched, and the 42 that did not are the 29 GLONASS
    // (mapped by id above) plus exactly those 13.
    // 2026-10-08 (public #429): a shape per constellation where one was sourced (scene/models.js
    // NAV_SHAPES). BeiDou's medium-orbit craft are named `BEIDOU-3 M<n>`; the geostationary and
    // inclined ones (G, IGSO) and BeiDou-2 are larger buses with no row, and keep the family box.
    beidou: {
      build: 'navigation', colour: 'satellite', name: 'a BeiDou navigation satellite', klass: ['satellite'], generic: true,
      resolve: (record) => (/beidou-3\s+m\d/i.test(String(record && record.name)) ? { build: 'navigation-beidou-meo' } : {}),
    },
    // FILES FOR THE NAVIGATION CONSTELLATIONS since batch six (2026-10-13; public #985, #986, #989,
    // #990). EVERY KEY AND EVERY KLASS GATE BELOW IS THE ONE THAT WAS HERE: a file is an ANSWER of the
    // row's `resolve`, chosen from the record's own name or launch year, so one constellation's or one
    // block's file can never reach another's craft, and a craft no file was built for keeps the
    // build it had. The names are CelesTrak's in the live saved data (data/v1/
    // celestrak-active.cols.json, read 2026-10-13).
    //   Galileo    galileo-foc.glb is the Full Operational Capability craft (OHB), `GSAT02nn`: 29
    //              records, `GSAT0201 (GALILEO 5)` to `GSAT0234 (GALILEO 34)`. From EUSPA's own
    //              satellite metadata: a box 2.530 x 1.200 x 1.100 m, two arrays of 5.000 x 1.082 m,
    //              14.67 m tip to tip, the 1.4 m navigation antenna on the Earth face. WHAT THE FILE
    //              CORRECTS: the body is a slab lying ACROSS the wing axis with its largest face to
    //              the Earth; the family box stood it on end. The three In-Orbit Validation craft
    //              (`GSAT0101` to `GSAT0103`, another maker's bus) keep the family box, as would a
    //              second-generation craft under a `GSAT03nn` name.
    //   QZSS       michibiki.glb is QZS-2 and QZS-4 ONLY (2 records): the Cabinet Office's drawing of
    //              QZS-2 gives 2.4 m, 6.2 m and two 8.3 m wings, and its L-band antenna as a cone
    //              1.8 m to 1.5 m across and 0.8 m tall. QZS-1R has a flat antenna deck (the same
    //              office's drawing), QZS-3 "uses a flat patch antenna" and carries a 3.2 m dish
    //              (eoPortal), QZS-6 and QZS-7 are later craft: all four keep the family box.
    //   NavIC      irnss.glb is the first generation on ISRO's I-1K bus, `IRNSS-1A` to `IRNSS-1I`
    //              (7 records). `NVS-01 (IRNSS-1J)` is the second generation on a larger bus: the
    //              key matches its name and the answer leaves it the family box.
    // All four constellations fly as the app's rule turns them (the antenna face to the Earth, the
    // wing axis square to the Sun: EUSPA's and the Cabinet Office's attitude laws say exactly that);
    // what the app does not do is turn the wings on their own axis, so a file's cells face the Sun's
    // side of the sky and not the Sun itself. `generic` stays on every one.
    // THE POOL (heroes.js POOL 8, POOL_MAX 16): navigation craft are 20 000 km and more apart, so
    // two are never near the camera together; each file is fetched once and cloned.
    galileo: {
      build: 'navigation', colour: 'satellite', name: 'a Galileo navigation satellite', klass: ['satellite'], generic: true,
      resolve: (record) => (/\bgsat02\d\d\b/i.test(String(record && record.name)) ? { file: 'galileo-foc.glb', made: 'dimensions', axes: 'app' } : {}),
    },
    // TWO KEYS FOR ONE CONSTELLATION, and this is the endpoint trap again rather than belt and
    // braces. GROUP=active -- the file sources.yaml actually fetches -- calls them
    // `NAVSTAR 43 (USA 132)`, and 40 of them match that. GROUP=gnss and a CATNR query call the
    // same objects `GPS BIIR-5  (PRN 22)`. Measured against today's `active`, `gps` matches
    // NOTHING and `navstar` matches all forty; the spec's rule is that a key which never matches
    // is a wasted file, and `gps` is kept anyway BECAUSE the other spelling is one source change
    // away and this comment is cheaper than rediscovering it.
    // GPS BY LAUNCH YEAR, because `NAVSTAR 81 (USA 319)` does not say its block. Read 2026-10-08 on
    // Wikipedia: Block IIF flew from 28 May 2010 to 5 February 2016, twelve of them, and Block III
    // from 23 December 2018; no other GPS block was launched in those years. Earlier craft (IIR,
    // IIR-M) are a different bus with no row, and keep the family box, as does a record with no year.
    // Since batch six every block has a FILE and the IIR bus a shape of its own: see gpsBlock above.
    gps: { build: 'navigation', colour: 'satellite', name: 'a GPS navigation satellite', klass: ['satellite'], generic: true, resolve: gpsBlock },
    navstar: { build: 'navigation', colour: 'satellite', name: 'a GPS navigation satellite', klass: ['satellite'], generic: true, resolve: gpsBlock },
    // GLONASS BY NAME: the records whose number is a placeholder (90 000 and up, data/parsers.js) reach
    // this key and not the rows by id above. The block is the catalogue's own bracket, `[GLONASS-M]`,
    // `[GLONASS-K]`, `[GLONASS-K1]`, `[GLONASS-K2]` (live saved data, 2026-10-12); a name with no
    // bracket keeps the drum it had, and K2 the family box (batch ten, public #988).
    glonass: {
      build: 'navigation-glonass-m', colour: 'satellite', name: 'a GLONASS navigation satellite', klass: ['satellite'], generic: true,
      resolve: (record) => {
        const block = /\[glonass-(m|k1?|k2)\]/i.exec(String(record && record.name));
        if (!block) return {};
        const b = block[1].toLowerCase();
        if (b === 'm') return { file: 'glonass-m.glb', made: 'dimensions', axes: 'app' };
        if (b === 'k2') return { build: 'navigation' };
        return { build: 'navigation-glonass-k', file: 'glonass-k.glb', made: 'dimensions', axes: 'app' };
      },
    },
    irnss: {
      build: 'navigation', colour: 'satellite', name: 'an IRNSS navigation satellite', klass: ['satellite'], generic: true,
      resolve: (record) => (/^irnss-1[a-i]$/i.test(String(record && record.name).trim()) ? { file: 'irnss.glb', made: 'dimensions', axes: 'app' } : {}),
    },
    qzs: {
      build: 'navigation', colour: 'satellite', name: 'a QZSS navigation satellite', klass: ['satellite'], generic: true,
      resolve: (record) => (/^qzs-[24]\b/i.test(String(record && record.name).trim()) ? { file: 'michibiki.glb', made: 'dimensions', axes: 'app' } : {}),
    },
    // THE 3U CUBESATS -- 164 objects, and the largest population in this app outside Starlink.
    //
    // Planet's Flock (94 Doves and SuperDoves, imaging the whole land surface daily) and Spire's
    // 70 Lemurs are both published as 3U: 10 x 10 x 30 cm. Every one of them was drawn as a
    // 30-metre communications satellite with a parabolic dish -- a drawing a hundred times the
    // length of the object.
    //
    // By NAME rather than by id, and that is the right route here for once: these constellations
    // are launched in batches of dozens and retired continuously, so the id list would be stale
    // within the month while the name will not be. Klass-gated to `satellite` so the many pieces
    // of Flock debris keep the debris shape, and matched on a whole word so `FLOCK 4Q-16` counts
    // and nothing that merely contains the letters does.
    // STARLINK -- 11 131 objects, sixty-seven per cent of the catalogue this app fetches, and
    // every one of them was drawn as a box with a parabolic dish.
    //
    // SPEC 0027 PUT THIS OUT OF SCOPE for a reason that turned out to apply to half the problem:
    // "the only model found is CC BY on Sketchfab behind a login and is the one-wing v1 ... it
    // needs Ivan's download and a launch-date gate". The download was only ever needed for REAL
    // GEOMETRY. A Starlink is a flat rectangle with a solar array hinged to it; drawing that
    // procedurally needs nobody's licence. The gate is the other half, and it is here.
    //
    // THE GATE IS THE LAUNCH YEAR, and its edges are honest rather than tidy:
    //
    //     launched 2022 or earlier   2 227 objects (20%)   v1.0/v1.5, ONE array   certain
    //     launched in 2023          1 793 objects (16%)   BOTH flew that year     not certain
    //     launched 2024 or later    7 111 objects (64%)   v2 Mini, TWO arrays     certain
    //
    // v2 Mini first flew on 2023-02-27 and the v1.5 line kept flying beside it for the rest of that
    // year, so 2023 cannot be split by any field the catalogue carries. It is drawn as a v2 Mini,
    // which is right for most of that year's launches and wrong for some, and `generic: true`
    // means the card says "the kind of thing, not this exact one" for every one of the 11 131.
    // Counted against GROUP=active on 2026-09-12.
    //
    // Klass-gated to `satellite`: Starlink debris and the stages that launched them keep their own
    // shapes, and there are a great many of both.
    // ONEWEB -- 651 objects, the largest population left after Starlink, and the same defect:
    // buildSatelliteComms gave every one of them a parabolic dish about forty per cent of its
    // silhouette. OneWeb's user link is Ku-band through fixed horn apertures on the nadir face,
    // with small steerable Ka-band gateway reflectors beside them. There is no big dish on it.
    //
    // The metres behind this shape are the weakest in the file and scene/models.js says so at
    // length: Airbus publishes the Arrow platform without dimensions, and the 2021 AMOS paper that
    // characterised the constellation photometrically declined to give any, noting only that the
    // bus has "a more complex prismatic shape" than a Starlink. What is NOT approximate is the
    // silhouette, which is the half that carries recognition and the half that was wrong.
    oneweb: { build: 'oneweb', colour: 'satellite', name: 'a OneWeb broadband satellite', klass: ['satellite'], generic: true },
    // A FILE FOR THE FIRST GENERATION since batch five (2026-10-13; public #1000), behind the SAME
    // launch-year gate, which is untouched: starlink-v1.glb, built in code from the bus and array
    // sizes of SpaceX's FCC filing of October 2022 as J. McDowell tabulates it (V1.5: 2.8 x 1.3 m
    // and ONE array 2.8 x 8.1 m), which a paper in The Astronomical Journal confirms to the square
    // centimetre (registry/models.yaml row `starlink-v1`, kind `built-from-dimensions`).
    //   WHAT THE FILE CHANGES: the wing STANDS ON THE CHASSIS, square to it, away from the Earth
    //   ("the chassis points directly nadir and the solar array is perpendicular to the chassis",
    //   AJ 166:59): the open L a Starlink flies in. The build laid it flat.
    // THE V2 MINI KEEPS ITS BUILD (public #999 stays open). A file was made from the same filing's
    // 4.1 x 2.7 m bus and two 4.1 x 12.8 m arrays, photographed in the app and NOT shipped: no page
    // opened says how its two wings sit in flight, and drawn flat it was a grey plank that told a
    // visitor less than the build's blue wings do. A file must be clearly better than the build.
    // No logo and no lettering. `generic` stays: the 2023 launches are still a guess.
    // THE POOL, COUNTED (heroes.js POOL 8, POOL_MAX 16): at most sixteen craft are drawn as models at
    // once, the nearest first, and a file is fetched once and cloned (loadRealModel's cache), so a
    // train of sixty Starlinks is at most sixteen clones of ONE 30 kB file of 5 180 triangles:
    // 83 000 at the very worst. The other forty-four stay glyphs.
    // In the live saved data on 2026-10-12: 11 129 records named STARLINK-n, of them 2 180 launched
    // to 2022 (the first generation, which wears the file), 1 792 in 2023, 7 157 from 2024.
    // `made` and `axes` are on the first generation's answer only: the build has neither.
    starlink: {
      colour: 'satellite',
      klass: ['satellite'],
      generic: true,
      build: 'starlink-v2',
      name: 'a Starlink',
      resolve: (record) => {
        const year = record && record.meta ? record.meta.launchYear : null;
        return Number.isFinite(year) && year <= 2022
          ? { build: 'starlink-v1', file: 'starlink-v1.glb', made: 'dimensions', axes: 'app', name: 'a first-generation Starlink' }
          : { build: 'starlink-v2', name: 'a Starlink V2 Mini' };
      },
    },
    flock: { build: 'cubesat', colour: 'satellite', name: 'a Dove, a 3U CubeSat', klass: ['satellite'], generic: true },
    lemur: { build: 'cubesat', colour: 'satellite', name: 'a Lemur, a 3U CubeSat', klass: ['satellite'], generic: true },
    // NASA's Starling: four 6U CubeSats flying as a swarm since 2023 (nasa.gov/smallspacecraft/starling).
    // The one 6U route, because it is the one constellation whose size its operator states plainly.
    starling: { build: 'cubesat-6u', colour: 'satellite', name: 'a Starling, a 6U CubeSat', klass: ['satellite'], generic: true },
    // AST SpaceMobile's BlueBirds: nine of them on the `visual` layer as of 2026-09-12, which is
    // more objects than any other unshaped thing on it, and they are among the brightest things
    // in the sky because the array is a sheet the size of a studio apartment. The catalogue calls
    // them SPACEMOBILE-001 upward (checked live, 2026-09-12); `bluebird` is NOT a second key,
    // because a key the catalogue never says is a file nobody ever sees. Klass satellite only, so
    // the launch's debris and spent stage keep their own shapes.
    spacemobile: { build: 'spacemobile', colour: 'satellite', name: 'a BlueBird direct-to-phone satellite', klass: ['satellite'], generic: true },
    // FILES AS WELL since batch three (2026-10-13; public #937): the capsule turned on a lathe from
    // the heat shield's rim to the docking port, the nose cone OPEN as it is on orbit, the trunk
    // with cells on the half toward the Sun and radiators on the other (registry rows `dragon-crew`,
    // `dragon-cargo`, kind `built-from-dimensions`). The generated Dragon of 2026-10-12 was a lump
    // that lost to the build; these are built from dimensions. No logo and no lettering on either.
    'crew dragon': { build: 'dragon', file: 'dragon-crew.glb', colour: 'station', name: 'a Dragon spacecraft', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    // The cargo vehicle flies without the escape engines: a smooth hull with no pods, no windows,
    // and TWO fins on the trunk where the crew vehicle has four (the build draws none).
    'dragon crs': { build: 'dragon-cargo', file: 'dragon-cargo.glb', colour: 'station', name: 'a Cargo Dragon spacecraft', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    // A FILE AS WELL since 2026-10-13 (public #939): soyuz-ms.glb, whose hull is ONE LATHE, a profile
    // turned round the long axis, built in code from the same published metres the build uses and
    // NASA's two drawings for the curve between them (registry row `soyuz-ms`, kind
    // `built-from-dimensions`): the orbital module is a ball with its docking collar and probe, the
    // descent module a bell with a curved flank, the service module a drum with a flared skirt.
    // `generic` stays, as the Cygnus has it: the name matches every Soyuz the catalogue may hold.
    // `axes: 'app'`: nose to the Earth, wings across the Sun, which is how the build flies.
    soyuz: { build: 'soyuz', file: 'soyuz-ms.glb', colour: 'station', name: 'a Soyuz spacecraft', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    // Cygnus: the round UltraFlex fans are the recognition, and nothing free exists (spec 0027,
    // issue #423). Klass-gated and a whole word, so the Cygnus Loop, Cygnus X-1 and anything else
    // named for the Swan stay untouched: checked 2026-10-12 against the saved `stations` and
    // `visual` groups, where the one match is CYGNUS NG-24 (68689).
    //
    // BOTH a build and a file since 2026-10-12 (public #938), as JWST is. The file is the first
    // model here that nobody published: a mesh an image-to-3D model generated from a NASA
    // photograph, cleaned and re-proportioned by us (registry/models.yaml row `cygnus`, kind
    // `derived-from-images`, which lists every change including the mirrored array). `made:
    // 'images'` is what makes the card add "shape built from photographs; proportions approximate"
    // (ui/cards.js, COPY.drawing.objectMade). `generic` stays: the photographs are of the 6.39 m
    // Enhanced vehicle and the ship flying today is the 8 m Cygnus XL, so it is the kind of thing.
    // The build is what is drawn while the file is on its way, and what stays if it never arrives.
    cygnus: { build: 'cygnus', file: 'cygnus.glb', colour: 'station', name: 'a Cygnus cargo ship', klass: ['station', 'satellite'], generic: true, made: 'images' },
    // A FILE AS WELL since batch three (2026-10-13; public #940): progress-ms.glb, the Soyuz's sibling
    // on the same lathe: a cargo module where the Soyuz has its ball, the refuelling module where it
    // has its bell, no periscope and no window (registry row `progress-ms`). Its own key and its own
    // file: a Progress is never drawn as a Soyuz, nor a Soyuz as a Progress (the tests hold both).
    progress: { build: 'progress', file: 'progress-ms.glb', colour: 'station', name: 'a Progress cargo ship', klass: ['station', 'satellite'], generic: true, made: 'dimensions', axes: 'app' },
    bennu: { file: 'asteroid-bennu.glb', colour: 'asteroid', name: '101955 Bennu', klass: ['asteroid'] },
    // Dawn's shape model, from NASA's 3D Printing collection. The same collection has Eros and
    // Itokawa, and neither is used: both are cut in half for printing and laid out as two pieces.
    // Klass-gated like Bennu, so nothing but the asteroid called Vesta can wear it.
    // 2026-10-07 (internal #382): remade from DLR's height model of Vesta (Dawn's stereo pictures), on
    // the grid of longitudes of DLR's mosaic, which it now wears: `map` is a file of site/textures/
    // (registry/textures.yaml), fetched with the shape and never before, and laid on by the texture
    // coordinates scripts/shape-to-glb.py --uv writes. NASA's 3D-printing model it replaces had no
    // stated axes to lay a map by.
    vesta: { file: 'asteroid-vesta.glb', colour: 'asteroid', name: '4 Vesta', klass: ['asteroid'], map: '2k_vesta_dawn.webp', mapped: 'dawn' },
    // Gaskell's shape model from the PDS archive, in ONE piece -- NASA's 3D Printing Eros is cut in
    // half. The klass gate is load-bearing here: EROS A and EROS B are Israeli imaging satellites,
    // and without it they would be drawn as a 33 km asteroid.
    eros: { file: 'asteroid-eros.glb', colour: 'asteroid', name: '433 Eros', klass: ['asteroid'] },
    // 2026-10-05: the Dawn team's shape model from the Planetary Data System, thinned from its own
    // grid by scripts/shape-to-glb.py. Ceres was a faceted icosahedron from the generic builder
    // (issue #420). Klass-gated like the three above: CERES is also a French satellite series.
    // Itokawa still waits: Gaskell's model of it has JAXA co-authors (tests/test_station_shapes.mjs).
    // 2026-10-07: and it wears Dawn's mosaic (`map`, as Vesta above).
    ceres: { file: 'dwarf-ceres.glb', colour: 'asteroid', name: '1 Ceres', klass: ['asteroid'], map: '2k_ceres_dawn.webp', mapped: 'dawn' },
    tdrs: { file: 'tdrs.glb', colour: 'satellite', name: 'Tracking and Data Relay Satellite', klass: ['satellite'] },
    swift: { file: 'swift.glb', colour: 'telescope', name: 'Swift', klass: ['satellite', 'telescope'] },
    tess: { file: 'tess.glb', colour: 'telescope', name: 'TESS', klass: ['satellite', 'telescope'] },
    sdo: { file: 'sdo.glb', colour: 'telescope', name: 'Solar Dynamics Observatory', klass: ['satellite', 'telescope'] },
    dscovr: { file: 'dscovr.glb', colour: 'satellite', name: 'DSCOVR', klass: ['satellite'] },
    'suomi npp': { file: 'suomi.glb', colour: 'satellite', name: 'Suomi NPP', klass: ['satellite'] },
    goes: { file: 'goes.glb', colour: 'satellite', name: 'GOES weather satellite', klass: ['satellite'] },
    // Gaia and Solar Orbiter are matched by NAME: Solar Orbiter carries no Horizons id in the
    // bundled deep-space data, and Gaia's (-139479, since 2026-09-22) has no glTF to key, because
    // its shape is built rather than downloaded. The klass gate is doing real work on the first
    // one: 1279 Gaia is a main-belt asteroid, and without `klass: ['telescope']` a ten-metre
    // sunshield would be drawn on a rock. That is the TESS mistake exactly, and it is why the
    // gate exists.
    gaia: { build: 'gaia', colour: 'telescope', name: 'Gaia', klass: ['telescope'] },
    'solar orbiter': { build: 'solar-orbiter', colour: 'probe', name: 'Solar Orbiter', klass: ['probe'] },
  },
  /**
   * A default for a whole LAYER. This is the highest-value entry in the file: the geostationary
   * ring is several hundred unnamed satellites, mostly commercial communications satellites, and
   * nearly all of them -- weather and military ones included -- really are a box bus with two long
   * wings. One 81 kB model makes the whole ring read as what it is instead of as identical grey
   * boxes.
   *
   * `generic: true` marks it as a stand-in, AND THE CARD NOW SAYS SO. This comment used to end
   * "that is a gap, and saying it here is better than a comment claiming a line the card never
   * prints" -- which was true when it was written and stopped being true when spec 0026 item 3
   * shipped cards.js's derivedDrawingLine(): it reads this very table and prints
   * "drawn as a geostationary satellite -- the kind of thing, not this exact one" for this bus,
   * and the equivalent for the DSN dish, the pad and grace.glb. A comment DENYING a line the card
   * does print is the same defect with the sign flipped, which is why this paragraph is longer
   * than the fix.
   */
  byLayer: {
    // The SAME object the orbit rule returns, not a copy: two rows saying the same thing is two
    // rows that can come to disagree.
    'geo-ring': GEO_BUS,
  },
  /** A default for a class of ground site. The app already draws the live dish-to-spacecraft links. */
  bySiteClass: {
    dish: { file: 'dsn70.glb', colour: 'site', name: 'a Deep Space Network antenna', generic: true },
    // Every launch pad the app draws -- 17 today and more with each Launch Library refresh -- was
    // a procedural block. NASA's mobile launcher platform is a steel deck on posts with a flame
    // opening: it reads as "launch platform" rather than as one particular pad, which is what a
    // default has to do. (The *assembled* variant was rejected: its tower is unmistakably LC-39B.)
    pad: { file: 'pad.glb', colour: 'site', name: 'a launch pad', generic: true },
    // A landing site's own `shape:` (registry/sites.yaml, carried as meta.siteShape). Before
    // these two rows every surface site outside `bySite` matched nothing here and was drawn by
    // BUILDERS.site.default, which is buildSitePad -- a slab with a tower and a swing arm -- under
    // a card saying "a generic ground site". Curiosity, InSight, Zhurong and Chang'e 4 were each
    // a launch pad on Mars or the Moon (measured 2026-09-22, when twenty-one more landing sites
    // were about to join them). No public model covers most of these craft, so they are
    // procedural and the card says so: "drawn as a lander -- the kind of thing, not this exact
    // one". check_registry.py refuses a surface row with no shape.
    lander: { build: 'lander', colour: 'site', name: 'a lander', generic: true },
    rover: { build: 'rover', colour: 'site', name: 'a rover', generic: true },
  },
  /** Named surface sites, where the thing that landed is the thing worth drawing. */
  bySite: {
    jezero: { file: 'perseverance.glb', colour: 'site', name: 'Perseverance' },
    // THE REST OF NASA'S LANDED VEHICLES THAT IT PUBLISHES AS glTF (issue #437, 2026-10-05). Each
    // was the procedural lander or rover: a few boxes under a real name.
    //
    // Curiosity is the one that is NOT its own model, and the row says so with `generic`. NASA
    // publishes Curiosity as a .blend file only, which this pipeline cannot read; Perseverance was
    // built on Curiosity's chassis -- the same rocker-bogie, deck, mast and RTG -- and differs in
    // the turret, the wheels and the sample tubes, none of which survive at this size. So the card
    // reads "drawn as ... the kind of thing, not this exact one", which is the true sentence.
    // Ingenuity, where its last flight ended (registry/sites.yaml, from NASA's waypoint file).
    ingenuity: { file: 'ingenuity.glb', colour: 'site', name: 'Ingenuity' },
    gale: { file: 'perseverance.glb', colour: 'site', name: 'a rover of the design Curiosity and Perseverance share', generic: true },
    // NASA's Mars Exploration Rover model is Opportunity (MER-B). Spirit was its twin, built to the
    // same drawings, so it wears the same file and says it is the kind of thing.
    opportunity: { file: 'mer.glb', colour: 'site', name: 'Opportunity' },
    spirit: { file: 'mer.glb', colour: 'site', name: 'a Mars Exploration Rover, the twin of Opportunity', generic: true },
    // InSight as it stood on Elysium Planitia: NASA's "arm deployed" variant, both fans open.
    elysium: { file: 'insight.glb', colour: 'site', name: 'InSight' },
    'viking-1': { file: 'viking-lander.glb', colour: 'site', name: 'Viking 1 lander' },
    'viking-2': { file: 'viking-lander.glb', colour: 'site', name: 'Viking 2 lander' },
    // DSS-25 is a 34-metre dish and was being drawn with the 70-metre model. A correctness fix:
    // the two antennas do not look alike and the card names the size.
    'dss-25': { file: 'dsn34.glb', colour: 'site', name: 'a 34-metre Deep Space Network antenna' },
    // Surveyor from NSSDCA's own description (scene/models.js buildSurveyor; public #267). A shape
    // built from a paragraph, so the card still says the kind of thing.
    'surveyor-1': { build: 'surveyor', colour: 'site', name: 'a Surveyor lander', generic: true },
    'surveyor-3': { build: 'surveyor', colour: 'site', name: 'a Surveyor lander', generic: true },
    // THE TWO LAUNCH VEHICLES NASA PUBLISHES (public #427, 2026-10-08), each standing on the pad it
    // left from (registry/sites.yaml), which is the one place on this map a rocket of 1969 can be:
    // the launches layer draws what is about to fly. registry/missions.yaml moves the clock to the
    // mornings they left. The pad is a place on any date; the vehicle on it is a picture of those days,
    // and the row's sentence says so.
    // THE RECORD IS THE PAD (internal #478): `displayName` titles its card and its label by the
    // place, on every date; `name` is the vehicle the model is of, for the line that says what is
    // drawn, and the row's own sentence names the rocket.
    'saturn-v-lc-39a': { file: 'saturn-v.glb', colour: 'rocket', name: 'Saturn V', displayName: 'Launch Complex 39A' },
    'shuttle-lc-39b': { file: 'shuttle-stack.glb', colour: 'rocket', name: 'Space Shuttle', displayName: 'Launch Complex 39B' },
    'apollo-11': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 11 lunar module' },
    // 14 and 16 arrived with the odd-things layer -- registry/oddities.yaml anchors the golf
    // balls and Duke's photograph on them -- and fell through to BUILDERS.site.default, which is
    // NASA's mobile launcher platform. A launch pad with a tower and a swing arm was standing at
    // Fra Mauro and at Descartes, under a card that said only "measured position". Every Apollo
    // descent stage is the same vehicle, so this is the model, not a stand-in.
    'apollo-14': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 14 lunar module Antares' },
    'apollo-16': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 16 lunar module Orion' },
    'apollo-17': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 17 lunar module' },
    // Added with the other landing sites on 2026-09-22. Their rows say `shape: lunar-module`,
    // and tests/test_landing_sites.mjs fails a row that says so without an entry here -- it would
    // otherwise fall through to the procedural lander, which is a stand-in for a vehicle we have.
    'apollo-12': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 12 lunar module Intrepid' },
    'apollo-15': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 15 lunar module Falcon' },
  },
};

/**
 * Does `haystack` contain `needle` as a whole word (or words)? Catalogue names are full of
 * parentheses, hyphens and designators, so the boundary is "not a letter or digit" rather than
 * \b, which would let `tess` match `tessera`.
 */
function wordMatch(haystack, needle) {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(needle, from);
    if (i < 0) return false;
    const before = i === 0 ? '' : haystack[i - 1];
    const after = haystack[i + needle.length] || '';
    const isWordChar = (c) => c !== '' && /[a-z0-9]/.test(c);
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = i + 1;
  }
}

const cache = new Map(); // file -> Promise<Object3D | null>
let loader = null;

function gltfLoader() {
  if (!loader) {
    loader = new kit.GLTFLoader();
    // The models ship meshopt-compressed. NASA publishes them with Draco, which needs a ~300 kB
    // WebAssembly decoder at runtime; re-encoding to meshopt at asset-prep time needs a 29 kB one
    // and made the files SMALLER anyway (Hubble: 1 655 kB of Draco became 163 kB of meshopt).
    // Paying 29 kB once beats 300 kB on a phone.
    loader.setMeshoptDecoder(kit.MeshoptDecoder);
  }
  return loader;
}

/**
 * Files whose nose is not +Y, and the turn that stands them up. glTF says +Y is up and every
 * other file here obeys; NASA's Space Shuttle (A) lies along Z with its nose at -Z (measured by
 * the bake, registry/models.yaml), and a rocket on a pad has to stand.
 */
const NOSE_UP = { 'shuttle-stack.glb': [Math.PI / 2, 0, 0] };

/**
 * IS THE VEHICLE ON THIS PAD AT THIS MOMENT? (2026-10-08, public #427.) A Saturn V on Launch
 * Complex 39A in 2026 would be a false picture, so a hand-kept pad lists its `liftoffs`
 * (registry/sites.yaml, the same instants as its events in registry/missions.yaml) and the vehicle
 * is drawn only around them: from 24 hours before a liftoff given to the minute until the end of
 * that minute, or for the whole UTC day of one given only as a date. Outside those windows
 * scene/heroes.js draws nothing there; the pad's mark and card stay. A record with no `liftoffs`
 * is not a gated pad and is always shown. Pure.
 */
export const PAD_LEAD_MS = 24 * 3600e3;
export function padVehicleShown(record, tMs) {
  const list = record && record.meta && record.meta.liftoffs;
  if (!Array.isArray(list) || !list.length) return true;
  if (!Number.isFinite(tMs)) return false;
  for (const when of list) {
    const text = String(when);
    const timed = text.includes('T');
    const t = Date.parse(timed ? text : `${text}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    if (timed ? tMs >= t - PAD_LEAD_MS && tMs < t + 60e3 : tMs >= t && tMs < t + 24 * 3600e3) return true;
  }
  return false;
}

/** The entry in REAL_MODELS this record matches, or null. */
export function realModelFor(record) {
  if (!record) return null;
  const meta = record.meta || {};

  const norad = meta.noradId ?? meta.catalogueNumber;
  if (norad != null && Object.prototype.hasOwnProperty.call(REAL_MODELS.norad, norad)) {
    return REAL_MODELS.norad[norad];
  }
  const horizons = meta.horizonsId;
  if (horizons != null && Object.prototype.hasOwnProperty.call(REAL_MODELS.horizons, String(horizons))) {
    return REAL_MODELS.horizons[String(horizons)];
  }
  // A specific site before its class: Jezero gets the rover, any other dish gets a dish.
  if (Object.prototype.hasOwnProperty.call(REAL_MODELS.bySite, record.id)) {
    return REAL_MODELS.bySite[record.id];
  }
  // The row's own shape first: a landing site's class is `surface`, which says where it is and
  // nothing about what stands there.
  const siteClass = meta.siteShape || meta.siteKind || meta.siteClass || record.siteClass;
  if (siteClass && Object.prototype.hasOwnProperty.call(REAL_MODELS.bySiteClass, siteClass)) {
    return REAL_MODELS.bySiteClass[siteClass];
  }
  const name = String(record.name || '').toLowerCase();
  for (const [key, entry] of Object.entries(REAL_MODELS.named)) {
    // The class gate and the word boundary are both here because of one real miss: a plain
    // substring match put the TESS SPACECRAFT's model on `C/2019 M4 (TESS)`, a comet that
    // telescope discovered. Attaching the wrong object's geometry, confidently, with nothing on
    // screen saying so, is the single failure this whole project is organised against -- so a
    // name match now has to agree about what KIND of thing it is, and match a whole word.
    if (entry.klass && !entry.klass.includes(record.klass)) continue;
    if (!wordMatch(name, key)) continue;
    // One entry, two shapes, chosen from the record. Starlink is the only row that needs this and
    // spec 0027 named it in advance -- "it needs ... a launch-date gate" -- because the
    // constellation changed shape in flight and the catalogue name did not change with it.
    // `resolve` returns the fields to override, so an entry without one is untouched and this
    // costs the other thirty-nine rows nothing.
    return typeof entry.resolve === 'function' ? { ...entry, ...entry.resolve(record) } : entry;
  }
  // Then the ORBIT. A satellite in a near-circular twenty-four-hour orbit is a geostationary
  // satellite whatever it is called, and nearly all of them are a box bus with two long wings.
  //
  // THIS USED TO BE A LAYER TEST AND THAT WAS THE BUG. `geo-ring` and `active` read the same
  // CelesTrak file, so the same satellite arrived on both -- and got the SSL-1300 on one and a
  // generic comms drum on the other. Which shape a person saw depended on which checkbox they had
  // ticked. Measured against the live catalogue on 2026-09-12: 410 objects, most of them commercial
  // communications satellites (ABS, Alphasat, Amazonas, AMC, AMOS, Anik, Apstar...) -- and not all:
  // see GEO_BUS for the weather, Earth-observation and classified ones, and why the entry's name
  // no longer says what they are for.
  //
  // Klass-gated: a spent stage or a fragment in the ring keeps the shape of what it is. Every
  // route above still wins, so GOES and TDRS keep their own models.
  if (record.klass === 'satellite' && isGeostationary(record)) return GEO_BUS;
  // Last: a default for the whole layer, so an unnamed member of a known population still gets
  // geometry that looks like what it is. The ring is above; this stays for any layer that gets a
  // default later.
  if (Object.prototype.hasOwnProperty.call(REAL_MODELS.byLayer, record.layer)) {
    return REAL_MODELS.byLayer[record.layer];
  }
  return null;
}

/**
 * Normalise a loaded scene so the hero layer can treat it exactly like a procedural one:
 * centred on its own origin, and one unit across its longest axis.
 *
 * NASA's models arrive in whatever units and orientation their author used -- metres, centimetres,
 * Z-up, offset from the origin. Rescaling to a unit box means the hero layer's angular-size maths
 * (which is the only thing deciding how big anything looks) needs to know nothing about any of it.
 */
function normalise(root) {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return root;
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;

  // TWO nested groups, and the nesting is the point. The inner one carries the centring and the
  // size normalisation; the OUTER one is left at identity so the hero layer can write its own
  // scale onto it, exactly as it does for a procedural model.
  //
  // Collapsing these into one group is the obvious simplification and it is wrong: the hero layer
  // does `obj.scale.setScalar(...)`, which would overwrite the normalisation and draw the model at
  // whatever units its author happened to use. That is how this was written the first time, and a
  // 109-metre station filled the screen.
  const inner = new THREE.Group();
  root.position.sub(centre);
  inner.add(root);
  inner.scale.setScalar(1 / longest);

  const wrapper = new THREE.Group();
  wrapper.add(inner);
  wrapper.userData.realModel = true;
  wrapper.userData.sourceSizeUnits = longest;
  return wrapper;
}

/**
 * Give every mesh flat normals if the file did not ship any.
 *
 * WHY THIS EXISTS. site/models/terra.glb ships two primitives with POSITION and TEXCOORD_0 and no
 * NORMAL at all. A MeshToonMaterial with no normals has nothing to sample its ramp against, so
 * Terra was drawn as a flat single-tone cut-out while the other forty-three models were shaded --
 * silently, with nothing anywhere saying so, for as long as the file has shipped. It was found by
 * rendering all forty-four at hero size and counting, which is the only way it could have been.
 *
 * FLAT, AND AT NO COST IN BYTES. scripts/decimate-model.mjs recomputes flat normals offline, and
 * flat normals need one vertex per corner -- regenerating terra.glb that way took it from 20 kB to
 * 71 kB for a model that is 4 159 triangles. Doing the same split at load time costs 10 000 extra
 * vertices in memory on one model and nothing on the wire, and it covers every file added later
 * rather than the one that happens to be wrong today.
 *
 * Exported for the test that breaks it on purpose.
 */
export function ensureNormals(root) {
  let fixed = 0;
  root.traverse((n) => {
    if (!n.isMesh || !n.geometry || n.geometry.attributes.normal) return;
    // toNonIndexed() first: computeVertexNormals() on an INDEXED geometry averages across the
    // faces sharing a vertex, which rounds off every hard edge on what is usually a box.
    const flat = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry;
    if (flat !== n.geometry) n.geometry.dispose();
    flat.computeVertexNormals();
    n.geometry = flat;
    fixed += 1;
  });
  return fixed;
}

/**
 * Is this texture one of the pipeline's baked colour palettes rather than a picture of a surface?
 *
 * `gltf-transform palette` -- which scripts/decimate-model.mjs runs, and which is why half the
 * shipped files have materials called `PaletteMaterial001` -- collapses a model's flat-coloured
 * materials into ONE strip four texels tall: a column per original material, a row per channel.
 * Fifteen of the shipped files carry one, they are 0.1 to 0.5 kB, and the app already downloads
 * every byte of them and then throws the colours away.
 *
 * Four texels tall is the test, and it is not a guess about size: a texture that short cannot
 * carry surface detail. It can only carry flat colours, which is exactly what the procedural
 * models use -- gold foil, blue array, dark bus. A 1024x1024 photograph of Sentinel-6 is a
 * different thing and is still discarded, because that WOULD be the photoreal shading the module
 * header rules out.
 */
export function isPalette(texture) {
  const img = texture && texture.image;
  const h = img && (img.height || img.naturalHeight);
  const w = img && (img.width || img.naturalWidth);
  return h > 0 && h <= PALETTE_ROWS && w > 0 && w <= PALETTE_MAX_W;
}

const UNPAINTED = '#C9CEDA'; // structure whose colour was in a texture: the same silver models.js uses
const PALETTE_ROWS = 4;      // what gltf-transform's palette transform writes
const PALETTE_MAX_W = 512;   // one column per original material; the widest shipped is 128

/**
 * What colour information does this FILE actually carry, and does it carry it everywhere?
 *
 * Decided once per model, never per mesh, because half a spacecraft in NASA's colours and half in
 * the class colour looks like a bug -- Sentinel-6 has both a baked palette and 2048px photographs,
 * and mixing the two routes drew an orange satellite with white panels.
 *
 * 'palette'  every material reads a palette strip: keep them, tint white, let the file speak.
 * 'own'      no palette, but at least two DIFFERENT stated colours: use each material's own.
 * 'class'    neither: one class colour, which is what every loaded model used to get.
 *
 * Pure white is not a stated colour. In these files it means "the texture carries the colour", and
 * the texture is exactly what gets discarded -- counting it made Aqua and Chandra wash out to
 * white, which says less than the class colour does.
 */
export function colourRoute(root) {
  const mats = [];
  root.traverse((n) => {
    if (!n.isMesh) return;
    for (const m of Array.isArray(n.material) ? n.material : [n.material]) if (m) mats.push(m);
  });
  if (!mats.length) return 'class';
  if (mats.every((m) => m.map && isPalette(m.map))) return 'palette';
  const stated = new Set();
  for (const m of mats) {
    if (!m.color) continue;
    const hex = `#${m.color.getHexString()}`;
    if (hex !== '#ffffff') stated.add(hex);
  }
  return stated.size >= 2 ? 'own' : 'class';
}

function applyToon(root, colourToken, surface = null) {
  const hex = CLASS_COLOURS[colourToken] || CLASS_COLOURS.satellite;
  // Measured once per model, not per mesh: the question is whether the FILE carries variation.
  const route = colourRoute(root);
  // A pool PER MODEL, not the shared one. models.js explains why: the hero layer fades a model in
  // by writing material.opacity, and one shared instance would fade every object of that class at
  // once. The compiled shader program is still shared, so this costs a few uniforms and nothing more.
  const pool = new Map();
  root.traverse((n) => {
    if (!n.isMesh) return;
    n.castShadow = false;
    n.receiveShadow = false;
    // The specular family, from the mesh's NAME: a sharp glint on solar cells, a broad soft one
    // on foil, none on painted structure (models.js SPECULAR). scripts/bake-own-colours.mjs names
    // its meshes `solar-panel`, `foil` and `body` for exactly this line to read.
    const name = n.name || '';
    const kind = /panel|solar|array/i.test(name) ? 'panel' : /foil|mli|kapton|blanket/i.test(name) ? 'foil' : 'body';
    // A model that still carries its baked palette keeps it, and is tinted white so the palette's
    // own colours come through the toon ramp unchanged. Without one, the whole model is the class
    // colour, as before -- which is what makes a decimated mesh read as a single blob.
    const first = Array.isArray(n.material) ? n.material[0] : n.material;
    const palette = route === 'palette' && first && first.map ? first.map : null;
    if (palette) {
      palette.magFilter = THREE.NearestFilter;   // a palette is looked up, not blended: one texel,
      palette.minFilter = THREE.NearestFilter;   // one colour, no bleeding into the neighbour
      palette.generateMipmaps = false;
    }
    // A white material on the 'own' route is one whose colour lived in a texture we dropped, so it
    // gets the neutral silver the procedural models use for unpainted structure -- not pure white,
    // which glares, and not the class colour, which would fight the real colours beside it.
    let tint = hex;
    if (palette) tint = '#ffffff';
    else if (route === 'own' && first && first.color) {
      const own = `#${first.color.getHexString()}`;
      tint = own === '#ffffff' ? UNPAINTED : own;
    }
    // A body with a map of its surface (Ceres, Vesta): the map is the colour, on the smooth ramp.
    const replacement = surface && n.geometry && n.geometry.attributes.uv
      ? kit.toonMaterial('#ffffff', 'world', pool, surface)
      : kit.toonMaterial(tint, kind, pool, palette);
    if (replacement) {
      // Dispose what NASA shipped: the textures on these can be several megabytes of GPU memory
      // that nothing will ever sample once the material is replaced.
      const old = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of old) {
        if (!m) continue;
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
          if (m[key] === palette) continue; // the one texture that is still in use
          if (m[key] && m[key].dispose) m[key].dispose();
        }
        if (m.dispose) m.dispose();
      }
      n.material = replacement;
    }
  });
  return root;
}

/**
 * Load one file. Cached per file, so Voyager 1 and Voyager 2 share a download and a parse; the
 * hero layer clones what it gets back.
 * Resolves to null when the file cannot be loaded -- never rejects, because a missing drawing must
 * not break a frame.
 */
export function loadRealModel(entry, { keepMaterials = false } = {}) {
  // An entry with `build:` and no `file:` is a procedural shape: nothing to load, heroes.js drew it.
  if (!entry || !entry.file) return Promise.resolve(null);
  const key = `${entry.file}:${keepMaterials ? 'orig' : entry.colour}`;
  if (cache.has(key)) return cache.get(key);

  const url = new URL(entry.file, BASE).href;
  // The loader first (loadKit, at the top): a kit that cannot be fetched is a file that cannot be,
  // and resolves to null like one. The entry is forgotten then, so the next approach asks again.
  const promise = loadKit().then(() => new Promise((resolve) => {
    gltfLoader().load(
      url,
      (gltf) => {
        try {
          const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!scene) return resolve(null);
          // Before the material, because a toon material with no normals to sample is the bug
          // this guards -- and before normalise(), which only moves the result around.
          const fixed = ensureNormals(scene);
          if (fixed) console.info(`real model ${entry.file}: computed normals for ${fixed} mesh(es)`);
          // A file whose nose is not +Y is stood up before it is measured (NOSE_UP, above).
          const turn = NOSE_UP[entry.file];
          let top = scene;
          if (turn) { top = new THREE.Group(); scene.rotation.set(turn[0], turn[1], turn[2]); top.add(scene); }
          if (keepMaterials) return resolve(normalise(top));
          if (!entry.map) { applyToon(scene, entry.colour); return resolve(normalise(top)); }
          // The map first, then the material: a body shown plain and then repainted would flash.
          // A map that does not arrive leaves the body in its class colour, as it was before.
          const done = (tex) => {
            try { applyToon(scene, entry.colour, tex); resolve(normalise(scene)); }
            catch (err) { console.warn(`real model ${entry.file}: ${err.message}`); resolve(null); }
          };
          new THREE.TextureLoader().load(new URL(entry.map, TEXTURES).href, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;                     // glTF's v runs down the picture, as the file's does
            tex.wrapS = THREE.RepeatWrapping;      // the seam's vertices are written at u and u + 1
            tex.anisotropy = 4;
            done(tex);
          }, undefined, () => done(null));
        } catch (err) {
          console.warn(`real model ${entry.file}: ${err.message}`);
          resolve(null);
        }
      },
      undefined,
      (err) => {
        console.warn(`real model ${entry.file} did not load`, err && err.message);
        resolve(null);
      }
    );
  })).catch((err) => {
    console.warn(`real model ${entry.file}: the loader did not load`, err && err.message);
    cache.delete(key);
    return null;
  });
  cache.set(key, promise);
  return promise;
}

/** How many distinct files have been asked for. The status panel can show it. */
export function loadedCount() {
  return cache.size;
}
