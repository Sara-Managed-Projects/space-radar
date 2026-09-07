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
  norad: {
    25544: { file: 'iss.glb', colour: 'station', name: 'International Space Station' },
    20580: { file: 'hubble.glb', colour: 'telescope', name: 'Hubble Space Telescope' },
    25682: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 7' },
    39174: { file: 'landsat.glb', colour: 'satellite', name: 'Landsat 8' },
    27424: { file: 'chandra.glb', colour: 'telescope', name: 'Chandra X-ray Observatory' },
  },
  horizons: {
    '-31': { file: 'voyager.glb', colour: 'probe', name: 'Voyager 1' },
    '-32': { file: 'voyager.glb', colour: 'probe', name: 'Voyager 2' },
    '-61': { file: 'juno.glb', colour: 'probe', name: 'Juno' },
    '-96': { file: 'parker.glb', colour: 'probe', name: 'Parker Solar Probe' },
    '-227': { file: 'kepler.glb', colour: 'telescope', name: 'Kepler' },
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
   * The card still says "drawn as a generic satellite", because that is what it is.
   */
  byLayer: {
    'geo-ring': { file: 'bus-ssl1300.glb', colour: 'satellite', name: 'a communications satellite', generic: true },
  },
  /** A default for a class of ground site. The app already draws the live dish-to-spacecraft links. */
  bySiteClass: {
    dish: { file: 'dsn70.glb', colour: 'site', name: 'a Deep Space Network antenna', generic: true },
  },
  /** Named surface sites, where the thing that landed is the thing worth drawing. */
  bySite: {
    jezero: { file: 'perseverance.glb', colour: 'site', name: 'Perseverance' },
    'apollo-11': { file: 'lunar-module.glb', colour: 'site', name: 'Apollo 11 lunar module' },
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
