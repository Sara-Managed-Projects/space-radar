// The worlds: Earth, the Moon, the Sun and the seven planets, each built from a ROW.
//
// Contract: createWorlds(scene) -> { update(tMs), meshFor(id), positionOf(id, tMs) }
//
// The table below mirrors registry/worlds.yaml. Adding Europa is a row here and a row there --
// there is no Mars.js, and this file contains no `if (id === ...)` anywhere in its drawing path.
// Ephemerides are astronomy-engine, which is a pure function of time and needs no network.
//
// ---------------------------------------------------------------------------------------------
// THE SCALING, WHICH IS AN EXAGGERATION AND MUST NEVER BE SILENT (spec 0006 requirement 7)
// ---------------------------------------------------------------------------------------------
// Earth, the Moon and the Sun are drawn at TRUE distance and TRUE radius. Nothing about them is
// exaggerated; the Sun really does sit 149 600 units away in an Earth stage, and the logarithmic
// depth buffer is what makes that affordable.
//
// The planets cannot be. Jupiter at opposition is 6.3e8 km, which is 630 000 units, and its true
// angular radius from Earth is 1.1e-4 rad -- a fifth of a pixel on a 1080-tall screen at a 45
// degree field of view. Drawn honestly it is not there. So a planet is drawn at its TRUE
// DIRECTION, at a compressed distance and with a floor on its angular size:
//
//     drawnDistance = DISTANCE_AT_REF_KM * (trueDistance / REF_KM) ^ DISTANCE_EXPONENT
//     drawnRadius   = max( trueRadius * drawnDistance / trueDistance,
//                          drawnDistance * MIN_ANGULAR_RADIUS_RAD )
//
// The exponent keeps the ordering and the relative motion (Venus really does come closer) while
// squeezing 4.1e7 .. 4.5e9 km into 1 450 .. 4 700 units. The angular floor of 0.0035 rad is an
// apparent diameter of 0.40 degrees -- a little smaller than the real Moon, so a planet is a
// findable disc and not a fake moon.
//
// `viewScale(id)` returns the exact numbers, and the card is expected to print them. The one
// thing never altered is DIRECTION: where a planet is in the sky is measured, always.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { stage, SUN_INERTIAL, EARTH_INERTIAL } from './stage.js';
import { j2000ToTeme, rotateDir, stageFrame } from '../propagate/frames.js';
import { createEarth, updateEarth } from './earth.js';

const KM_PER_AU = Astronomy.KM_PER_AU;
const DEG = Math.PI / 180;

// --- the exaggeration, named and exported so the UI can say it ---------------------------------

export const PLANET_VIEW = {
  /** 1 au, the distance the shell is anchored at. */
  REF_KM: 1.495978707e8,
  /** Where a body 1 au away is drawn, in km of the stage's frame. 2 000 units at unit_km 1000. */
  DISTANCE_AT_REF_KM: 2.0e6,
  /** 0.25: Neptune ends up 3.2x farther out than Venus, not 110x. */
  DISTANCE_EXPONENT: 0.25,
  /** 0.0035 rad = 0.40 degrees across. The Moon is 0.52. */
  MIN_ANGULAR_RADIUS_RAD: 0.0035,
};

/** Sun and Moon: true distance, true radius, nothing exaggerated. */
const VIEW_TRUE = 'true';
/** Planets: true direction, compressed distance, floored angular size. */
const VIEW_COMPRESSED = 'compressed';


/** Other names people type. Mirrors `aliases:` in registry/worlds.yaml; search reads them. */
export const WORLD_ALIASES = {
  sun: ['Sol', 'our star'],
  earth: ['Terra', 'home'],
  moon: ['Luna'],
  mars: ['the Red Planet'],
  venus: ['the Morning Star', 'the Evening Star'],
};


// --- the worlds as RECORDS (spec 0028 step 0) ---------------------------------------------------
//
// One record per world so the rest of the app -- the layer list, search, a tap, the card -- can
// treat a planet like any other object. The record's id IS the world id (`mars`), which is what
// ui/cards.js already keys its Moon sentence on. `propagator: body` is the contract's own ephemeris
// propagator, so `propagate(record, t)` answers with the TRUE position; the drawn disc may be
// nearer (PLANET_VIEW), and main.js asks `drawnPositionOf` when it wants the disc.

/** @returns {Array<Object>} one record per world, klass `world`, layer `worlds`. */
export function worldRecords() {
  return WORLDS.map((w) => ({
    id: w.id,
    name: w.display,
    klass: 'world',
    layer: 'worlds',
    propagator: 'body',
    body: w.body,
    world: w.id,
    frame: w.frame,
    cls: 'measured',
    meta: {
      worldId: w.id,
      radiusKm: w.radiusKm,
      parent: w.parent,
      aliases: (WORLD_ALIASES[w.id] || []).slice(),
      view: w.view,
    },
  }));
}

/**
 * The fair-to-the-small-thing rule for discs, pure so a test can hold it (spec 0028 req 4).
 * Each candidate is {id, cx, cy, r} in PIXELS from the top-left. A tap counts for a disc when it
 * lands within `forgivePx` of the disc's EDGE; among those, the SMALLER disc wins, then the nearer.
 * A finger that lands on a tiny moon drawn over a big planet means the moon.
 */
export function pickWorldDisc(candidates, tapX, tapY, forgivePx = 24) {
  let best = null;
  for (const c of candidates) {
    if (!c || !(c.r >= 0)) continue;
    const edge = Math.max(0, Math.hypot(c.cx - tapX, c.cy - tapY) - c.r);
    if (edge > forgivePx) continue;
    if (!best || c.r < best.r || (c.r === best.r && edge < best.edge)) best = { ...c, edge };
  }
  return best;
}

// --- the rows ----------------------------------------------------------------------------------
// Mirrors registry/worlds.yaml. `textures` are the exact filenames in site/textures/.

export const WORLDS = [
  {
    id: 'sun', display: 'The Sun', parent: '', radiusKm: 696340.0,
    body: 'Sun', frame: SUN_INERTIAL, view: VIEW_TRUE,
    look: { map: '2k_sun.jpg', emissive: true, corona: true },
  },
  {
    id: 'earth', display: 'Earth', parent: 'sun', radiusKm: 6371.0,
    body: 'Earth', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'earth-gmst',
    look: { earth: true, day: '2k_earth_daymap.jpg', night: '2k_earth_nightmap.jpg', clouds: '2k_earth_clouds.jpg' },
  },
  {
    id: 'moon', display: 'The Moon', parent: 'earth', radiusKm: 1737.4,
    body: 'Moon', frame: EARTH_INERTIAL, view: VIEW_TRUE, rotation: 'iau',
    look: { map: '2k_moon.jpg' },
  },
  {
    id: 'mercury', display: 'Mercury', parent: 'sun', radiusKm: 2439.7,
    body: 'Mercury', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_mercury.jpg' },
  },
  {
    id: 'venus', display: 'Venus', parent: 'sun', radiusKm: 6051.8,
    body: 'Venus', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_venus_atmosphere.jpg' },
  },
  {
    id: 'mars', display: 'Mars', parent: 'sun', radiusKm: 3389.5,
    body: 'Mars', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_mars.jpg' },
  },
  {
    id: 'jupiter', display: 'Jupiter', parent: 'sun', radiusKm: 69911.0,
    body: 'Jupiter', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_jupiter.jpg' },
  },
  {
    id: 'saturn', display: 'Saturn', parent: 'sun', radiusKm: 58232.0,
    body: 'Saturn', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_saturn.jpg', ring: { innerKm: 74500, outerKm: 140220, map: '2k_saturn_ring_alpha.png' } },
  },
  {
    id: 'uranus', display: 'Uranus', parent: 'sun', radiusKm: 25362.0,
    body: 'Uranus', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_uranus.jpg' },
  },
  {
    id: 'neptune', display: 'Neptune', parent: 'sun', radiusKm: 24622.0,
    body: 'Neptune', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_neptune.jpg' },
  },
];

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));

// --- the cel material for everything that is not Earth -------------------------------------------
// docs/design-language.md: real texture, cel LIGHTING -- base, shadow (base x 0.55 shifted toward
// blue), highlight (base x 1.25), band width 0.15, plus a Fresnel rim at 0.35. Two steps put the
// planets beside the drawn objects instead of in a different picture.

const WORLD_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

const WORLD_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uTint;
uniform vec3 uSunDir;
uniform vec3 uRimColour;
uniform float uRimGain;
uniform float uBand;
uniform float uAmbient;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vNormalW );
  vec3 viewDir = normalize( cameraPosition - vPosW );
  vec3 base = mix( uTint, texture2D( uMap, vUv ).rgb * uTint, uHasMap );

  float d = dot( n, uSunDir );
  vec3 shadow = base * 0.55 * vec3( 0.88, 0.94, 1.14 );   // x0.55, hue shifted toward blue
  vec3 highlight = base * 1.25;

  float b1 = smoothstep( 0.02 - uBand, 0.02 + uBand, d );
  float b2 = smoothstep( 0.55 - uBand, 0.55 + uBand, d );
  vec3 colour = mix( shadow, base, b1 );
  colour = mix( colour, highlight, b2 );

  float lit = smoothstep( -0.10, 0.10, d );
  colour *= mix( uAmbient, 1.0, lit );

  float rim = pow( 1.0 - clamp( dot( n, viewDir ), 0.0, 1.0 ), 3.0 );
  colour += uRimColour * rim * uRimGain * lit;

  gl_FragColor = vec4( colour, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function celMaterial(map, tint) {
  return new THREE.ShaderMaterial({
    name: 'world-cel',
    vertexShader: WORLD_VERT,
    fragmentShader: WORLD_FRAG,
    uniforms: {
      uMap: { value: map || null },
      uHasMap: { value: map ? 1 : 0 },
      uTint: { value: new THREE.Color(tint || 0xffffff) },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uRimColour: { value: new THREE.Color(0xdfe9ff) },
      uRimGain: { value: 0.35 },
      uBand: { value: 0.15 },
      uAmbient: { value: 0.05 },
    },
  });
}

// --- construction --------------------------------------------------------------------------------

const _pos = new THREE.Vector3();
const _sunScene = new THREE.Vector3(1, 0, 0);
const _sunHere = new THREE.Vector3(1, 0, 0);
const _m4 = new THREE.Matrix4();

/**
 * Unit vector from `fromKm` to `toKm`, both in the stage's frame, expressed in SCENE axes.
 * One place, so the remap (x, z, -y) appears here and in stage.js and nowhere else.
 */
function sunDirFrom(toKm, fromKm, out) {
  if (!toKm || !fromKm) return out; // an unconvertible frame: keep the last direction, not NaN
  const dx = toKm.x - fromKm.x;
  const dy = toKm.y - fromKm.y;
  const dz = toKm.z - fromKm.z;
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return out; // the stage IS the Sun: keep the last direction rather than NaN
  return out.set(dx / len, dz / len, -dy / len);
}

export function createWorlds(scene, opts = {}) {
  const base = opts.textureBase === undefined ? 'textures/' : opts.textureBase;
  // No document means no image decoding: a headless test builds every mesh and every
  // material, just without pixels. That is what makes this file testable outside a browser.
  const canLoad = typeof document !== 'undefined' && typeof THREE.TextureLoader === 'function';
  const loader = canLoad ? new THREE.TextureLoader() : null;
  const maxAniso = opts.renderer && opts.renderer.capabilities
    ? opts.renderer.capabilities.getMaxAnisotropy()
    : 8;

  function texture(name) {
    if (!name || !loader) return null;
    const tex = loader.load(base + name);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  }

  const root = new THREE.Group();
  root.name = 'worlds';
  if (scene) scene.add(root);

  const meshes = new Map();
  const viewState = new Map();
  // The `worlds` layer's switch. The stage world and the Sun stay: one is the ground, the other the light.
  let layerOn = true;

  for (const w of WORLDS) {
    // The map is fetched ONCE. Building a cel material and then replacing it for the Sun would
    // decode 2k_sun.jpg twice and leave the first material and its texture with no owner.
    const map = w.look.earth ? null : texture(w.look.map);
    const mesh = w.look.earth
      ? createEarth({
        day: texture(w.look.day),
        night: texture(w.look.night),
        clouds: texture(w.look.clouds),
      })
      : new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 48),
        // The Sun is not lit by anything, so it does not get the cel material: a flat disc of
        // its own texture, out of the tone mapper's way so it stays white rather than grey.
        w.look.emissive
          ? new THREE.MeshBasicMaterial({ map, color: 0xffffff, toneMapped: false, fog: false })
          : celMaterial(map, 0xffffff),
      );

    mesh.name = w.id;
    mesh.userData.kind = 'world';
    mesh.userData.worldId = w.id;
    mesh.userData.display = w.display;
    mesh.userData.cls = 'measured';
    mesh.matrixAutoUpdate = true;

    if (w.look.emissive) {
      const halo = coronaSprite();
      if (halo) { mesh.add(halo); mesh.userData.corona = halo; }
    }

    if (w.look.ring) {
      const ring = ringMesh(w, texture(w.look.ring.map));
      mesh.add(ring);
      mesh.userData.ring = ring;
    }

    root.add(mesh);
    meshes.set(w.id, mesh);
    viewState.set(w.id, { exaggerated: false });
  }

  // A directional light at the Sun for anyone drawing with a built-in material (models.js).
  // The world materials here take uSunDir directly and ignore it.
  const sunLight = new THREE.DirectionalLight(0xfff4e6, 3.0);
  sunLight.castShadow = false;
  const sunTarget = new THREE.Object3D();
  root.add(sunLight, sunTarget);
  sunLight.target = sunTarget;

  const fill = new THREE.AmbientLight(0x2a3550, 0.35);
  root.add(fill);

  // --- per-frame ---------------------------------------------------------------------------------

  function update(tMs) {
    stage.setTime(tMs);

    // 1. The floating origin: where the stage's own world is, in the stage's frame. When the
    //    frame is already centred on that world (the Earth stage in earth-inertial, the Sun
    //    stage in sun-inertial) the origin is zero BY DEFINITION -- taking it from the ephemeris
    //    instead would round-trip 1.5e8 km through two rotations and leave the whole scene
    //    offset by the residual, which measured 9 metres. Exact beats measured when exact is
    //    available.
    const frameWorld = String(stage.frame).split('-')[0];
    if (frameWorld === stage.worldId) {
      stage.setOrigin(null);
    } else {
      const centre = positionOf(stage.worldId, tMs);
      stage.setOrigin(centre ? stage.toStageFrame(centre, centre.frame, tMs) : null);
    }

    // 2. The Sun, in the stage's frame, in km. Everything's lighting is measured from here --
    //    from TRUE positions, never from the drawn ones, or a compressed planet would show the
    //    wrong phase.
    const sunKm = stage.toStageFrame({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, tMs);
    sunDirFrom(sunKm, stage.originKm, _sunScene);
    sunLight.position.copy(_sunScene).multiplyScalar(1e5);
    if (sunLight.position.lengthSq() === 0) sunLight.position.set(0, 1e5, 0);
    sunTarget.position.set(0, 0, 0);

    // 3. Every world.
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh) continue;
      const p = positionOf(w.id, tMs);
      if (!p) { mesh.visible = false; continue; }
      mesh.visible = layerOn || w.id === stage.worldId || w.id === 'sun';

      // The world's own true position in the stage's frame, and from it the direction to the
      // Sun that lights it. Both in km, both before any of the drawing exaggeration below.
      const pKm = stage.toStageFrame(p, p.frame, tMs);
      const sunDirHere = sunDirFrom(sunKm, pKm, _sunHere);

      const isStage = w.id === stage.worldId;
      // Earth's mesh is in equatorial radii, not mean radii, so it says what to scale it by.
      const meshRadiusKm = mesh.userData.scaleRadiusKm || w.radiusKm;
      const trueRadiusUnits = meshRadiusKm / stage.unitKm;

      if (isStage) {
        mesh.position.set(0, 0, 0);
        mesh.scale.setScalar(trueRadiusUnits);
        viewState.set(w.id, describe(w, 0, 0));
      } else {
        // A null here is stage.js refusing a frame it cannot convert. Drawing the world at the
        // last position it happened to have is exactly the silent lie this refusal exists for.
        if (!stage.toSceneInto(p, p.frame, _pos, tMs)) { mesh.visible = false; continue; }
        const trueDistKm = _pos.length() * stage.unitKm;
        if (w.view === VIEW_COMPRESSED && !sameSystem(w.id, stage.worldId) && trueDistKm > 0) {
          const drawnKm = drawnDistanceKm(trueDistKm);
          const shrink = drawnKm / trueDistKm;
          const drawnRadiusKm = Math.max(
            w.radiusKm * shrink,
            drawnKm * PLANET_VIEW.MIN_ANGULAR_RADIUS_RAD,
          );
          _pos.setLength(drawnKm / stage.unitKm);
          mesh.position.copy(_pos);
          mesh.scale.setScalar((drawnRadiusKm * (meshRadiusKm / w.radiusKm)) / stage.unitKm);
          viewState.set(w.id, describe(w, trueDistKm, drawnKm, drawnRadiusKm));
        } else {
          mesh.position.copy(_pos);
          mesh.scale.setScalar(trueRadiusUnits);
          viewState.set(w.id, describe(w, trueDistKm, trueDistKm, w.radiusKm));
        }
      }

      // 4. Orientation and lighting.
      if (w.look.earth) {
        updateEarth(mesh, sunDirHere, tMs);
      } else {
        if (w.rotation === 'iau') applyIauOrientation(mesh, w.body, tMs, w.id);
        if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.uSunDir) {
          mesh.material.uniforms.uSunDir.value.copy(sunDirHere);
        }
      }

      if (mesh.userData.corona) {
        // Keep the bloom at a constant angular size: it scales with the disc, which is drawn
        // at true angular size, so nothing to do but keep it facing the camera (Sprite does).
        mesh.userData.corona.material.rotation = 0;
      }
    }
  }

  function meshFor(id) { return meshes.get(id) || null; }

  // --- the worlds as objects under a finger (spec 0028 step 0) ---------------------------------

  /** The `worlds` layer's checkbox. The stage world and the Sun are never hidden by it. */
  function setVisible(on) { layerOn = on !== false; }

  /** Where the DISC is, in scene units -- the compressed position, not the true one. */
  function drawnPositionOf(id, out) {
    const mesh = meshes.get(id);
    if (!mesh || !mesh.visible) return null;
    return (out || new THREE.Vector3()).copy(mesh.position);
  }

  /** The disc's radius in scene units, as drawn (equatorial for Earth, mean for the rest). */
  function drawnRadiusUnits(id) {
    const mesh = meshes.get(id);
    return mesh ? mesh.scale.x : 0;
  }

  const _proj = new THREE.Vector3();
  const _camPos = new THREE.Vector3();

  /**
   * Which world, if any, a tap meant. NDC in, a record out (or null). Every visible disc is
   * projected; `pickWorldDisc` decides. Called by main.js AFTER the glyph layers have had their
   * turn, so a satellite drawn over a planet still wins -- a glyph has no radius to subtract and
   * is always the smaller thing.
   */
  /**
   * Every disc within the forgiveness rule as {record, edge, r} for scene/pickrank.js; pick() is
   * the one-winner form.
   */
  function pickAll(ndcX, ndcY, camera, viewport, forgivePx = 24) {
    if (!camera || !viewport || !(viewport.w > 0) || !(viewport.h > 0)) return [];
    camera.updateMatrixWorld();
    camera.getWorldPosition(_camPos);
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    const tapX = (ndcX + 1) * halfW;
    const tapY = (1 - ndcY) * halfH;
    const records = worldRecords();
    const out = [];
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh || !mesh.visible) continue;
      const dist = mesh.position.distanceTo(_camPos);
      if (!(dist > 0)) continue;
      _proj.copy(mesh.position).project(camera);
      if (_proj.z > 1) continue;
      const r = (mesh.scale.x / dist / tanHalfFov) * halfH;
      const edge = Math.max(0, Math.hypot((_proj.x + 1) * halfW - tapX, (1 - _proj.y) * halfH - tapY) - r);
      if (edge > forgivePx) continue;
      const record = records.find((x) => x.id === w.id);
      if (record) out.push({ record, edge, r });
    }
    return out.sort((p, q) => (p.r - q.r) || (p.edge - q.edge));
  }

  function pick(ndcX, ndcY, camera, viewport) {
    if (!camera || !viewport || !(viewport.w > 0) || !(viewport.h > 0)) return null;
    camera.updateMatrixWorld();
    camera.getWorldPosition(_camPos);
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    const candidates = [];
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh || !mesh.visible) continue;
      const dist = mesh.position.distanceTo(_camPos);
      if (!(dist > 0)) continue;
      _proj.copy(mesh.position).project(camera);
      if (_proj.z > 1) continue; // behind the camera
      // Angular radius -> pixels: r_px = (R / d) / tan(fov/2) * halfH. Good to a few % for discs
      // smaller than the view, which is every disc a finger can miss.
      const rPx = (mesh.scale.x / dist / tanHalfFov) * halfH;
      candidates.push({ id: w.id, cx: (_proj.x + 1) * halfW, cy: (1 - _proj.y) * halfH, r: rPx });
    }
    const hit = pickWorldDisc(candidates, (ndcX + 1) * halfW, (1 - ndcY) * halfH);
    if (!hit) return null;
    return worldRecords().find((r) => r.id === hit.id) || null;
  }

  const _adjCentre = new THREE.Vector3();

  /**
   * Put a body-fixed record on the globe it is standing on, even when that globe is drawn
   * somewhere else.
   *
   * A compressed world is drawn at `drawnDistanceKm` along its true direction and at
   * `drawnRadiusKm` instead of its real radius. A rover's position converts truthfully into the
   * scene and therefore lands nowhere near the drawn planet -- 268.8 million km away for Jezero,
   * measured. The same two numbers that moved the planet move what stands on it:
   *
   *     drawn = meshCentre + (true - trueCentre) * drawnRadius / trueRadius
   *
   * and the true centre is recoverable exactly, because the compression preserved the direction:
   * trueCentre = meshCentre / distanceFactor.
   *
   * ONLY `<world>-fixed`. An inertial frame is an orbit, not a surface, and `sun-inertial` is
   * every asteroid and every deep-space probe on the map -- correcting those to a "drawn Sun"
   * would move the whole solar system. The card still has to say the world is drawn closer than
   * it is; `viewScale(id).note` is the sentence, and it is unchanged.
   */
  function viewAdjust(out, frame) {
    const name = String(frame || '');
    const cut = name.lastIndexOf('-');
    if (cut < 0 || name.slice(cut + 1) !== 'fixed') return out;
    const id = name.slice(0, cut);
    if (id === stage.worldId) return out;
    const st = viewState.get(id);
    if (!st || !st.exaggerated) return out;
    const mesh = meshes.get(id);
    if (!mesh || !(st.distanceFactor > 0) || !(st.trueRadiusKm > 0)) return out;
    _adjCentre.copy(mesh.position).multiplyScalar(1 / st.distanceFactor);
    return out.sub(_adjCentre).multiplyScalar(st.drawnRadiusKm / st.trueRadiusKm)
      .add(mesh.position);
  }
  stage.setViewAdjust(viewAdjust);

  /**
   * What the card must say when the view is exaggerated. Never silent: a world drawn at a
   * compressed distance reports exactly how much.
   */
  function viewScale(id) { return viewState.get(id) || null; }

  function dispose() {
    if (stage.viewAdjust === viewAdjust) stage.setViewAdjust(null);
    for (const mesh of meshes.values()) {
      mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) { if (m.map && m.map.dispose) m.map.dispose(); m.dispose(); }
        }
      });
    }
    meshes.clear();
    if (scene) scene.remove(root);
  }

  return {
    update,
    meshFor,
    positionOf,
    viewScale,
    setVisible,
    drawnPositionOf,
    drawnRadiusUnits,
    pick,
    pickAll,
    dispose,
    root,
    light: sunLight,
    worlds: WORLDS,
    /** Unit vector from the stage origin to the Sun, in scene axes. models.js wants this. */
    sunDirScene: () => _sunScene,
    ids: () => WORLDS.map((w) => w.id),
  };

  function describe(w, trueDistKm, drawnDistKm, drawnRadiusKm) {
    const trueAng = trueDistKm > 0 ? w.radiusKm / trueDistKm : 0;
    const drawnAng = drawnDistKm > 0 ? (drawnRadiusKm || w.radiusKm) / drawnDistKm : 0;
    const exaggerated = trueDistKm > 0 && Math.abs(drawnDistKm - trueDistKm) / trueDistKm > 1e-6;
    return {
      id: w.id,
      display: w.display,
      trueDistanceKm: trueDistKm,
      drawnDistanceKm: drawnDistKm,
      distanceFactor: trueDistKm > 0 ? drawnDistKm / trueDistKm : 1,
      trueRadiusKm: w.radiusKm,
      drawnRadiusKm: drawnRadiusKm || w.radiusKm,
      trueAngularRadiusRad: trueAng,
      drawnAngularRadiusRad: drawnAng,
      angularFactor: trueAng > 0 ? drawnAng / trueAng : 1,
      exaggerated,
      cls: exaggerated ? 'illustrative' : 'measured',
      note: exaggerated
        ? `${w.display} is drawn in its true direction, but nearer and larger than it really is, so you can find it.`
        : `${w.display} is drawn where it is, at the size it is.`,
    };
  }

  function ringMesh(w, map) {
    const r = w.look.ring;
    const inner = r.innerKm / w.radiusKm;   // the ring is a child, so radii are in planet radii
    const outer = r.outerKm / w.radiusKm;
    const geo = new THREE.RingGeometry(inner, outer, 192, 1);
    // RingGeometry's own uv is a unit square over the bounding box, which smears a 1-D ring
    // strip. Rewrite it so u runs from the inner edge to the outer edge.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (d - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: map || null,
      color: 0xd9cdb4,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    mesh.rotation.x = -Math.PI / 2;  // RingGeometry lies in XY; the ring is the planet's equator
    mesh.renderOrder = 1;
    mesh.name = `${w.id}-ring`;
    return mesh;
  }
}

// --- ephemeris ------------------------------------------------------------------------------------

/**
 * Where a world is, in km, in the frame named on the returned object.
 *   sun and the planets -> sun-inertial (heliocentric ecliptic J2000)
 *   moon                -> earth-inertial (geocentric equatorial J2000)
 * astronomy-engine returns equatorial J2000 vectors in au, so the heliocentric ones are rotated
 * into the ecliptic here -- once, at the source, so nothing downstream has to remember.
 */
export function positionOf(id, tMs) {
  const w = BY_ID.get(id);
  if (!w) return null;
  const date = new Date(tMs);

  if (id === 'sun') return { x: 0, y: 0, z: 0, frame: SUN_INERTIAL, cls: 'measured' };

  if (id === 'moon') {
    // GeoMoon is EQJ (J2000 equator). frames.js defines 'earth-inertial' as TEME -- the frame
    // SGP4 works in -- and the two differ by precession, 0.36 degrees in 2026. Rotating here
    // means the Moon lands in the same frame as the satellites rather than a fifth of a degree
    // off them.
    const v = Astronomy.GeoMoon(date);
    const teme = j2000ToTeme(
      { x: v.x * KM_PER_AU, y: v.y * KM_PER_AU, z: v.z * KM_PER_AU },
      tMs,
    );
    return { x: teme.x, y: teme.y, z: teme.z, frame: EARTH_INERTIAL, cls: 'measured' };
  }

  const v = Astronomy.HelioVector(Astronomy.Body[w.body], date); // EQJ, au
  const e = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), v);
  return {
    x: e.x * KM_PER_AU, y: e.y * KM_PER_AU, z: e.z * KM_PER_AU,
    frame: SUN_INERTIAL, cls: 'measured',
  };
}

/** The compression, on its own so a test can check it without a scene. */
export function drawnDistanceKm(trueDistanceKm) {
  const { DISTANCE_AT_REF_KM, REF_KM, DISTANCE_EXPONENT } = PLANET_VIEW;
  return DISTANCE_AT_REF_KM * Math.pow(trueDistanceKm / REF_KM, DISTANCE_EXPONENT);
}

function sameSystem(a, b) {
  // Earth and the Moon see each other truly; everything else across a stage boundary is squeezed.
  return (a === 'earth' && b === 'moon') || (a === 'moon' && b === 'earth');
}

const _bx = new THREE.Vector3();
const _by = new THREE.Vector3();
const _bz = new THREE.Vector3();

/**
 * Orient a world's mesh by asking propagate/frames.js where that world's own axes point.
 *
 * THE MESH AND THE MARKER MUST USE THE SAME ROTATION, and for six months they did not. This
 * function used to build its own matrix from the IAU angles -- Rz(ra+90).Rx(90-dec).Rz(W), an
 * EQJ orientation -- and apply it in scene axes. But a body-fixed MARKER reaches the scene
 * through frames.js, which on the Earth stage ends in j2000ToTeme, so the marker was precessed
 * and the mesh was not. Measured in Chrome: recovering Apollo 11's coordinates back through the
 * Moon mesh's own quaternion gave 0.6835 N / 23.846 E against registry/sites.yaml's 0.6741 N /
 * 23.4730 E -- a constant +0.373 degrees of longitude, 11.3 km of lunar surface, on all six
 * lunar rows. Earth was the control and showed zero error, because scene/earth.js builds its
 * mesh from frames.geodeticToEcef and cannot disagree with itself.
 *
 * So: three basis vectors, one formula, nothing written twice. The mesh's local axes are the
 * body-fixed axes after the scene remap (the same alignment argument as Earth's in earth.js:
 * +Y is the pole, +X is longitude 0 on the equator), which makes the three columns
 * remap(Rx), remap(Rz) and -remap(Ry).
 *
 * This is also what puts the Moon's near side towards us, libration included.
 *
 * @returns {boolean} false when the world has no rotation model -- leave the mesh unrotated
 *   rather than turn it by a guess.
 */
function applyIauOrientation(mesh, bodyName, tMs, worldId) {
  const body = Astronomy.Body[bodyName];
  if (body === undefined) return false;
  const from = `${worldId}-fixed`;
  const to = stageFrame(stage);
  const bx = rotateDir({ x: 1, y: 0, z: 0 }, from, to, tMs);
  const by = rotateDir({ x: 0, y: 1, z: 0 }, from, to, tMs);
  const bz = rotateDir({ x: 0, y: 0, z: 1 }, from, to, tMs);
  if (!bx || !by || !bz) return false;
  // The remap, (x, y, z) -> (x, z, -y), written out rather than multiplied in: this is the one
  // place three vectors go through it and a matrix product would hide which column is which.
  _bx.set(bx.x, bx.z, -bx.y).normalize();
  _by.set(-by.x, -by.z, by.y).normalize();
  _bz.set(bz.x, bz.z, -bz.y).normalize();
  _m4.makeBasis(_bx, _bz, _by);
  mesh.quaternion.setFromRotationMatrix(_m4);
  return true;
}

/** A warm bloom for the Sun. No lens flare (docs/design-language.md is explicit). */
function coronaSprite() {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.16, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,246,230,0.85)');
  g.addColorStop(0.35, 'rgba(255,201,138,0.28)');
  g.addColorStop(1.0, 'rgba(255,201,138,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  sprite.scale.setScalar(4.5); // in Sun radii, because it is a child of the Sun's unit sphere
  sprite.name = 'sun-corona';
  return sprite;
}
