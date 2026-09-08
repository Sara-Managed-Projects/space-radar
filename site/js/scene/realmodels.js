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
    43476: { file: 'grace.glb', colour: 'satellite', name: 'a GRACE-series gravity mapper', catalogue: 'GRACE-FO 1', generic: true },
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
