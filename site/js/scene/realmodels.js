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
// 2. NOTHING BLOCKS. A hero appears as procedural geometry immediately and upgrades in place when
//    its file arrives. A visitor on a slow connection sees a satellite now and a better satellite
//    a second later, rather than an empty orbit and a spinner. A file that fails to load is simply
//    never upgraded, and the card is unaffected -- the model is a drawing, never the data.

import * as THREE from '../../vendor/three.module.min.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module.js';
import { toonMaterial } from './models.js';
import { CLASS_COLOURS } from './glyphatlas.js';

const BASE = new URL('../../models/', import.meta.url);

/**
 * Which record gets which file. Keyed by the identifier that is stable for that object:
 * a NORAD number for anything in Earth orbit, a JPL Horizons id for anything beyond it.
 * A key that is not here simply keeps its procedural model, which is the normal case.
 */
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
    20580: { file: 'hubble.glb', colour: 'telescope', name: 'Hubble Space Telescope', catalogue: 'HST' },
    25682: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 7', catalogue: 'LANDSAT 7' },
    39084: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 8', catalogue: 'LANDSAT 8' },
    49260: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 9', catalogue: 'LANDSAT 9', generic: true },
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
    // ERS-1 and Envisat carried far more than a radar and are here because the blade is still the
    // thing you would recognise them by. Envisat's own CC BY model stays on Ivan's list (spec 0027
    // design.md): this is the family shape until then, which is better than a dish.
    39634: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SENTINEL-1A', generic: true },
    41456: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SENTINEL-1B', generic: true },
    62261: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SENTINEL-1C', generic: true },
    66315: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SENTINEL-1D', generic: true },
    23710: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RADARSAT-1', generic: true },
    32382: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'RADARSAT-2', generic: true },
    31698: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'TERRASAR-X', generic: true },
    36605: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'TANDEM-X', generic: true },
    31598: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 1', generic: true },
    32376: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 2', generic: true },
    33412: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 3', generic: true },
    37216: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'COSMO-SKYMED 4', generic: true },
    44873: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-1', generic: true },
    51444: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-2', generic: true },
    67304: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'CSG-3', generic: true },
    28931: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ALOS (DAICHI)', generic: true },
    39766: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ALOS-2', generic: true },
    60182: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ALOS-4 (DAICHI-4)', generic: true },
    43641: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SAOCOM 1A', generic: true },
    46265: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'SAOCOM 1B', generic: true },
    21574: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ERS-1', generic: true },
    27386: { build: 'radar', colour: 'satellite', name: 'a radar-imaging satellite', catalogue: 'ENVISAT', generic: true },

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
    // LARES-2 is NOT here: the id it is often given, 52307, is STARLINK-3755.
    16908: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'AJISAI (EGS)', generic: true },
    8820: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'LAGEOS 1', generic: true },
    22195: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'LAGEOS 2', generic: true },
    7646: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'STARLETTE', generic: true },
    22824: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'STELLA', generic: true },
    38077: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'LARES', generic: true },
    19751: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'COSMOS 1989 (ETALON 1)', generic: true },
    20026: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'COSMOS 2024 (ETALON 2)', generic: true },
    25398: { build: 'sphere', colour: 'satellite', name: 'a laser-ranging sphere', catalogue: 'WESTPAC', generic: true },

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
    '-96': { file: 'parker.glb', colour: 'probe', name: 'Parker Solar Probe' },
    '-170': { file: 'jwst.glb', colour: 'telescope', name: 'James Webb Space Telescope' },
    '-21': { file: 'soho.glb', colour: 'telescope', name: 'SOHO' },
    '-74': { file: 'mro.glb', colour: 'probe', name: 'Mars Reconnaissance Orbiter' },
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
    // NASA's Shuttle solid rocket booster is public-domain geometry with exactly that
    // silhouette, so it stands in for the class; `generic: true` is what makes the card say
    // "drawn as a spent rocket stage -- the kind of thing, not this exact one". parsers.js
    // classifies R/B, ROCKET BODY, AKM, PKM and UPPER STAGE as klass `rocket`, and only those.
    'r/b': { file: 'rocket-body.glb', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    'rocket body': { file: 'rocket-body.glb', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    'upper stage': { file: 'rocket-body.glb', colour: 'rocket', name: 'a spent rocket stage', klass: ['rocket'], generic: true },
    // NOAA 15, 18 and 19 are the Advanced TIROS-N / POES bus and among the brightest things a
    // person can see pass over. Matched on the full name, whole words, klass satellite: "NOAA 15"
    // yes, "NOAA 15 DEB" no (klass debris), NOAA 20 no (a JPSS bus, already mapped by id to the
    // Suomi model), NOAA 21 no (JPSS-2, a different bus; it keeps the generic shape and says so).
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
    'css (tianhe': { build: 'tiangong', colour: 'station', name: 'the Tiangong station', klass: ['station'], generic: true },
    'css (wentian': { build: 'tiangong-module', colour: 'station', name: 'a Tiangong laboratory module', klass: ['station'], generic: true },
    'css (mengtian': { build: 'tiangong-module', colour: 'station', name: 'a Tiangong laboratory module', klass: ['station'], generic: true },
    // Shenzhou and Tianzhou: the Soyuz plan at Chinese proportions, white-grey, wings on both ends
    // of a Shenzhou. CC BY models exist for both (spec 0027, Ivan's list); procedural until then.
    shenzhou: { build: 'shenzhou', colour: 'station', name: 'a Shenzhou spacecraft', klass: ['station', 'satellite'], generic: true },
    tianzhou: { build: 'tianzhou', colour: 'station', name: 'a Tianzhou cargo ship', klass: ['station', 'satellite'], generic: true },
    // Dragon 2, crew or cargo: CelesTrak names them CREW DRAGON n and DRAGON CRS-n. Both keys, so
    // a bare `dragon` never catches anything else. A CC BY model is on Ivan's list (spec 0027).
    // Iridium: 66 NEXT satellites in service and the first generation's survivors, all one plan.
    // Klass satellite only, so IRIDIUM 33 DEB and the rest of that collision keep the debris shape.
    iridium: { build: 'iridium', colour: 'satellite', name: 'an Iridium satellite', klass: ['satellite'], generic: true },
    // AST SpaceMobile's BlueBirds: nine of them on the `visual` layer as of 2026-09-12, which is
    // more objects than any other unshaped thing on it, and they are among the brightest things
    // in the sky because the array is a sheet the size of a studio apartment. The catalogue calls
    // them SPACEMOBILE-001 upward (checked live, 2026-09-12); `bluebird` is NOT a second key,
    // because a key the catalogue never says is a file nobody ever sees. Klass satellite only, so
    // the launch's debris and spent stage keep their own shapes.
    spacemobile: { build: 'spacemobile', colour: 'satellite', name: 'a BlueBird direct-to-phone satellite', klass: ['satellite'], generic: true },
    'crew dragon': { build: 'dragon', colour: 'station', name: 'a Dragon spacecraft', klass: ['station', 'satellite'], generic: true },
    'dragon crs': { build: 'dragon', colour: 'station', name: 'a Dragon spacecraft', klass: ['station', 'satellite'], generic: true },
    soyuz: { build: 'soyuz', colour: 'station', name: 'a Soyuz spacecraft', klass: ['station', 'satellite'], generic: true },
    // Cygnus: the round UltraFlex fans are the recognition; nothing free exists (spec 0027), so
    // procedural. Klass-gated so the Cygnus Loop and anything else named Cygnus stay untouched.
    cygnus: { build: 'cygnus', colour: 'station', name: 'a Cygnus cargo ship', klass: ['station', 'satellite'], generic: true },
    progress: { build: 'progress', colour: 'station', name: 'a Progress cargo ship', klass: ['station', 'satellite'], generic: true },
    bennu: { file: 'asteroid-bennu.glb', colour: 'asteroid', name: '101955 Bennu', klass: ['asteroid'] },
    tdrs: { file: 'tdrs.glb', colour: 'satellite', name: 'Tracking and Data Relay Satellite', klass: ['satellite'] },
    swift: { file: 'swift.glb', colour: 'telescope', name: 'Swift', klass: ['satellite', 'telescope'] },
    tess: { file: 'tess.glb', colour: 'telescope', name: 'TESS', klass: ['satellite', 'telescope'] },
    sdo: { file: 'sdo.glb', colour: 'telescope', name: 'Solar Dynamics Observatory', klass: ['satellite', 'telescope'] },
    dscovr: { file: 'dscovr.glb', colour: 'satellite', name: 'DSCOVR', klass: ['satellite'] },
    'suomi npp': { file: 'suomi.glb', colour: 'satellite', name: 'Suomi NPP', klass: ['satellite'] },
    goes: { file: 'goes.glb', colour: 'satellite', name: 'GOES weather satellite', klass: ['satellite'] },
    mms: { file: 'mms.glb', colour: 'satellite', name: 'Magnetospheric Multiscale', klass: ['satellite'] },
  },
  /**
   * A default for a whole LAYER. This is the highest-value entry in the file: the geostationary
   * ring is several hundred unnamed commercial communications satellites, and most of them really
   * are a box bus with a big dish and two long wings. One 81 kB model makes the whole ring read as
   * what it is instead of as identical grey boxes.
   *
   * `generic: true` marks it as a stand-in. The card does NOT say so today: the "what you are
   * looking at" line is written from a launch's registry row in data/parsers.js and covers
   * launches only, so this bus, the DSN dish, the pad and grace.glb (which is GRACE-FO 1 drawn
   * as its sister ship) are all undisclosed stand-ins. That is a gap, and saying it here is
   * better than a comment claiming a line the card never prints.
   */
  byLayer: {
    'geo-ring': { file: 'bus-ssl1300.glb', colour: 'satellite', name: 'a communications satellite', generic: true },
  },
  /** A default for a class of ground site. The app already draws the live dish-to-spacecraft links. */
  bySiteClass: {
    dish: { file: 'dsn70.glb', colour: 'site', name: 'a Deep Space Network antenna', generic: true },
    // Every launch pad the app draws -- 17 today and more with each Launch Library refresh -- was
    // a procedural block. NASA's mobile launcher platform is a steel deck on posts with a flame
    // opening: it reads as "launch platform" rather than as one particular pad, which is what a
    // default has to do. (The *assembled* variant was rejected: its tower is unmistakably LC-39B.)
    pad: { file: 'pad.glb', colour: 'site', name: 'a launch pad', generic: true },
  },
  /** Named surface sites, where the thing that landed is the thing worth drawing. */
  bySite: {
    jezero: { file: 'perseverance.glb', colour: 'site', name: 'Perseverance' },
    // DSS-25 is a 34-metre dish and was being drawn with the 70-metre model. A correctness fix:
    // the two antennas do not look alike and the card names the size.
    'dss-25': { file: 'dsn34.glb', colour: 'site', name: 'a 34-metre Deep Space Network antenna' },
    'apollo-11': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 11 lunar module' },
    // 14 and 16 arrived with the odd-things layer -- registry/oddities.yaml anchors the golf
    // balls and Duke's photograph on them -- and fell through to BUILDERS.site.default, which is
    // NASA's mobile launcher platform. A launch pad with a tower and a swing arm was standing at
    // Fra Mauro and at Descartes, under a card that said only "measured position". Every Apollo
    // descent stage is the same vehicle, so this is the model, not a stand-in.
    'apollo-14': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 14 lunar module Antares' },
    'apollo-16': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 16 lunar module Orion' },
    'apollo-17': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 17 lunar module' },
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
    loader = new GLTFLoader();
    // The models ship meshopt-compressed. NASA publishes them with Draco, which needs a ~300 kB
    // WebAssembly decoder at runtime; re-encoding to meshopt at asset-prep time needs a 29 kB one
    // and made the files SMALLER anyway (Hubble: 1 655 kB of Draco became 163 kB of meshopt).
    // Paying 29 kB once beats 300 kB on a phone.
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
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
  const siteClass = meta.siteKind || meta.siteClass || record.siteClass;
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
    return entry;
  }
  // Last: a default for the whole layer, so an unnamed member of a known population still gets
  // geometry that looks like what it is.
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

function applyToon(root, colourToken) {
  const hex = CLASS_COLOURS[colourToken] || CLASS_COLOURS.satellite;
  // A pool PER MODEL, not the shared one. models.js explains why: the hero layer fades a model in
  // by writing material.opacity, and one shared instance would fade every object of that class at
  // once. The compiled shader program is still shared, so this costs a few uniforms and nothing more.
  const pool = new Map();
  root.traverse((n) => {
    if (!n.isMesh) return;
    n.castShadow = false;
    n.receiveShadow = false;
    const kind = /panel|solar|array/i.test(n.name || '') ? 'panel' : 'body';
    const replacement = toonMaterial(hex, kind, pool);
    if (replacement) {
      // Dispose what NASA shipped: the textures on these can be several megabytes of GPU memory
      // that nothing will ever sample once the material is replaced.
      const old = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of old) {
        if (!m) continue;
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
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
  const promise = new Promise((resolve) => {
    gltfLoader().load(
      url,
      (gltf) => {
        try {
          const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!scene) return resolve(null);
          if (!keepMaterials) applyToon(scene, entry.colour);
          resolve(normalise(scene));
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
  });
  cache.set(key, promise);
  return promise;
}

/** How many distinct files have been asked for. The status panel can show it. */
export function loadedCount() {
  return cache.size;
}
