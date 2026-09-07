// sky/skyview.js — the same scene, a different camera position.
//
// Contract (tests/test_contract.mjs):
//   createSkyView(ctx) -> { enter(observer), exit(), update(tMs), active }
//
// Spec 0014 requirement 1: this is NOT a second engine. Every record is already in the right
// place; this moves the camera to the visitor's own patch of ground, widens the field of view and
// adds the four things a beginner needs to read a sky — a horizon, the cardinal points, altitude
// ticks and a sky whose colour is the real Sun's.
//
// Units: kilometres, radians. Degrees appear only in the two *InWords helpers, which are the UI
// boundary.
//
// Frame: everything is built in a local right-handed basis with +X east, +Y up (zenith), +Z south,
// and the whole group is oriented into scene space each frame from the observer's east/north/up
// measured THROUGH stage.toScene. That is what makes it frame-agnostic: it is correct whether the
// stage draws in earth-fixed or earth-inertial, and it follows Earth's rotation for free.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Eye height. Spec 0014 design: "The camera sits 1.7 m above the surface at the observer."
const EYE_HEIGHT_KM = 0.0017;

// Wider than the orbital view: standing under the sky you see much more of it at once.
const SKY_FOV_DEG = 72;

// How often the Sun is re-solved, in clock milliseconds. It moves 15 arcseconds a second.
const SUN_REFRESH_MS = 5000;

const HORIZON_SEGMENTS = 256;
const DOME_SEGMENTS = 64;

// docs/design-language.md palette. Nothing here is invented and there is no red.
const TOKENS = {
  space: 0x0b0e14,
  spaceEdge: 0x05070a,
  earthOcean: 0x1b4f8a,
  atmosphere: 0x6ec3ff,
  nightLights: 0xffc98a,
  text: 0xe8ecf2,
  textDim: 0x9aa4b2,
};

/**
 * The five stops the design asks for, keyed on the REAL Sun elevation. Twilight is the moment
 * worth designing for, so three of the five stops live in the 12 degrees around the horizon.
 * `alpha` is how much of the star field the sky hides.
 */
const SKY_STOPS = [
  { sunElDeg: -18, name: 'night', horizon: TOKENS.space, zenith: TOKENS.spaceEdge, alpha: 0.14, glow: 0.0 },
  { sunElDeg: -12, name: 'nautical', horizon: TOKENS.earthOcean, zenith: TOKENS.space, alpha: 0.45, glow: 0.25 },
  { sunElDeg: -6, name: 'civil', horizon: TOKENS.nightLights, zenith: TOKENS.earthOcean, alpha: 0.8, glow: 0.85 },
  { sunElDeg: 0, name: 'golden', horizon: TOKENS.nightLights, zenith: TOKENS.atmosphere, alpha: 0.98, glow: 1.0 },
  { sunElDeg: 6, name: 'day', horizon: TOKENS.atmosphere, zenith: TOKENS.earthOcean, alpha: 1.0, glow: 0.15 },
];

const COMPASS_16 = [
  'north',
  'north-north-east',
  'north-east',
  'east-north-east',
  'east',
  'east-south-east',
  'south-east',
  'south-south-east',
  'south',
  'south-south-west',
  'south-west',
  'west-south-west',
  'west',
  'west-north-west',
  'north-west',
  'north-north-west',
];

const COMPASS_16_SHORT = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

// ---------------------------------------------------------------------------- words

/**
 * Azimuth in degrees (0 = north, clockwise) to a 16-point compass name in words.
 * `azimuthInWords(292.5) === 'west-north-west'`.
 * @param {number} azDeg
 * @param {{short?: boolean}} [opts] short:true gives 'WNW'
 */
export function azimuthInWords(azDeg, opts = {}) {
  if (!Number.isFinite(azDeg)) return null;
  const a = ((azDeg % 360) + 360) % 360;
  const i = Math.round(a / 22.5) % 16;
  return opts.short ? COMPASS_16_SHORT[i] : COMPASS_16[i];
}

const FIST_WORDS = new Map([
  [0.5, 'half a fist'],
  [1, 'one fist'],
  [1.5, 'one and a half fists'],
  [2, 'two fists'],
  [2.5, 'two and a half fists'],
  [3, 'three fists'],
  [3.5, 'three and a half fists'],
  [4, 'four fists'],
  [5, 'five fists'],
  [6, 'six fists'],
  [7, 'seven fists'],
  [8, 'eight fists'],
]);

/**
 * Altitude in degrees to the one sentence that makes a sky chart usable by someone who has never
 * used one. A closed fist at arm's length covers about ten degrees; that is the whole trick.
 * `altitudeInWords(23)  === 'about two and a half fists above the horizon'`
 * `altitudeInWords(85)  === 'almost straight overhead'`
 * @param {number} altDeg
 * @returns {string|null}
 */
export function altitudeInWords(altDeg) {
  if (!Number.isFinite(altDeg)) return null;
  if (altDeg < -0.5) return 'below the horizon';
  if (altDeg < 2.5) return 'right down on the horizon';
  // Under half a fist there is nothing useful to count: "a third of a fist" helps nobody.
  if (altDeg < 5) return 'just above the horizon';
  if (altDeg >= 87) return 'straight overhead';
  if (altDeg >= 78) return 'almost straight overhead';
  const fists = altDeg / 10;
  // Half-fist precision while a fist is still a big share of the answer; whole fists above that.
  const rounded = fists < 4 ? Math.round(fists * 2) / 2 : Math.round(fists);
  const words = FIST_WORDS.get(rounded);
  if (!words) return `about ${Math.round(fists)} fists above the horizon`;
  return `about ${words} above the horizon`;
}

/**
 * Where the Sun is, in the words the twilight definitions actually use (spec 0014 requirement 7).
 * 'golden' is the only non-standard one and it is the design's, not astronomy's.
 */
export function sunPhaseName(sunElDeg) {
  if (!Number.isFinite(sunElDeg)) return null;
  if (sunElDeg >= 6) return 'day';
  if (sunElDeg >= 0) return 'golden';
  if (sunElDeg >= -6) return 'civil';
  if (sunElDeg >= -12) return 'nautical';
  if (sunElDeg >= -18) return 'astronomical';
  return 'night';
}

// ---------------------------------------------------------------------------- helpers

function normaliseObserver(o) {
  if (!o) return null;
  let latDeg;
  let lonDeg;
  if (Number.isFinite(o.latRad) && Number.isFinite(o.lonRad)) {
    latDeg = o.latRad * RAD2DEG;
    lonDeg = o.lonRad * RAD2DEG;
  } else if (Number.isFinite(o.latDeg) && Number.isFinite(o.lonDeg)) {
    latDeg = o.latDeg;
    lonDeg = o.lonDeg;
  } else if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
    latDeg = o.latitude;
    lonDeg = o.longitude;
  } else if (Number.isFinite(o.lat) && Number.isFinite(o.lon)) {
    latDeg = o.lat;
    lonDeg = o.lon;
  } else {
    return null;
  }
  let altKm = 0;
  if (Number.isFinite(o.altKm)) altKm = o.altKm;
  else if (Number.isFinite(o.heightKm)) altKm = o.heightKm;
  else if (Number.isFinite(o.altM)) altKm = o.altM / 1000;
  else if (Number.isFinite(o.altitude)) altKm = o.altitude / 1000;
  else if (Number.isFinite(o.alt)) altKm = o.alt / 1000;
  return { latDeg, lonDeg, altKm, latRad: latDeg * DEG2RAD, lonRad: lonDeg * DEG2RAD };
}

/** WGS-84 geodetic to earth-fixed km. Same maths as satellite.js's geodeticToEcf. */
function geodeticToEcefKm(latRad, lonRad, altKm) {
  const a = 6378.137;
  const f = (6378.137 - 6356.7523142) / 6378.137;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latRad);
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  return {
    x: (n + altKm) * Math.cos(latRad) * Math.cos(lonRad),
    y: (n + altKm) * Math.cos(latRad) * Math.sin(lonRad),
    z: (n * (1 - e2) + altKm) * sinLat,
  };
}

/** Local direction from azimuth (from north, clockwise) and altitude, in the +X east / +Y up / +Z south basis. */
function localDir(azRad, altRad, out) {
  const ca = Math.cos(altRad);
  return out.set(Math.sin(azRad) * ca, Math.sin(altRad), -Math.cos(azRad) * ca);
}

function lerpColour(a, b, t, out) {
  return out.copy(a).lerp(b, t);
}

/** The two colours, the alpha and the glow for a given Sun elevation, blended between five stops. */
function skyAt(sunElDeg, out) {
  let lo = SKY_STOPS[0];
  let hi = SKY_STOPS[SKY_STOPS.length - 1];
  let t = 0;
  if (sunElDeg <= lo.sunElDeg) {
    hi = lo;
  } else if (sunElDeg >= hi.sunElDeg) {
    lo = hi;
  } else {
    for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
      if (sunElDeg >= SKY_STOPS[i].sunElDeg && sunElDeg <= SKY_STOPS[i + 1].sunElDeg) {
        lo = SKY_STOPS[i];
        hi = SKY_STOPS[i + 1];
        t = (sunElDeg - lo.sunElDeg) / (hi.sunElDeg - lo.sunElDeg);
        break;
      }
    }
  }
  out.loHorizon.setHex(lo.horizon);
  out.hiHorizon.setHex(hi.horizon);
  out.loZenith.setHex(lo.zenith);
  out.hiZenith.setHex(hi.zenith);
  lerpColour(out.loHorizon, out.hiHorizon, t, out.horizon);
  lerpColour(out.loZenith, out.hiZenith, t, out.zenith);
  out.alpha = lo.alpha + (hi.alpha - lo.alpha) * t;
  out.glow = lo.glow + (hi.glow - lo.glow) * t;
  out.name = t < 0.5 ? lo.name : hi.name;
  return out;
}

/**
 * A deterministic skyline. Deterministic matters: a profile regenerated per frame would shimmer,
 * and this is meant to read as "the far edge of a town", not as noise.
 * @returns {number} altitude in radians of the top of the silhouette at this azimuth
 */
function skylineAlt(azRad) {
  const a = azRad;
  const rolling =
    0.45 * Math.sin(a * 3 + 0.7) + 0.28 * Math.sin(a * 7 + 2.1) + 0.16 * Math.sin(a * 13 + 4.4);
  // A few flat-topped blocks, so it does not read as pure hills.
  const block = Math.max(0, Math.sin(a * 23 + 1.3)) > 0.86 ? 0.9 : 0;
  return (0.9 + rolling + block) * DEG2RAD;
}

function makeLetterTexture(letter) {
  const size = 128;
  const canvas =
    typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.font = '600 78px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // docs/design-language.md, Labels: `text` with a 2 px `space` halo.
  g.lineWidth = 7;
  g.lineJoin = 'round';
  g.strokeStyle = '#0B0E14';
  g.strokeText(letter, size / 2, size / 2 + 3);
  g.fillStyle = '#E8ECF2';
  g.fillText(letter, size / 2, size / 2 + 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace ?? tex.colorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------- the view

/**
 * @param {object} ctx main.js's context: { clock, stage, scene, camera, cameraRig, ... }.
 *   Optional extras this module will use if they are there:
 *     ctx.domElement / ctx.renderer.domElement — to attach its own look-around drag
 * @param {object} [options] domeRadius, fovDeg, minElevationDeg
 */
export function createSkyView(ctx, options = {}) {
  const camera = ctx?.camera;
  const scene = ctx?.scene;
  if (!camera || !scene) throw new Error('createSkyView needs ctx.camera and ctx.scene');

  const fovDeg = Number(options.fovDeg) || SKY_FOV_DEG;
  const domElement =
    options.domElement || ctx.domElement || ctx.renderer?.domElement || null;

  let isActive = false;
  let observer = null;
  let observerA = null; // astronomy-engine Observer
  let saved = null;
  let group = null;

  // Where the visitor is looking. Damped, so a drag or a gyroscope reads as a head turn.
  let azRad = 0;
  let altRad = 0.12;
  let dAz = 0;
  let dAlt = 0;

  let sunElDeg = -18;
  let sunAzDeg = 0;
  let sunSolvedAtMs = -Infinity;

  const sky = {
    horizon: new THREE.Color(),
    zenith: new THREE.Color(),
    loHorizon: new THREE.Color(),
    hiHorizon: new THREE.Color(),
    loZenith: new THREE.Color(),
    hiZenith: new THREE.Color(),
    alpha: 0.14,
    glow: 0,
    name: 'night',
  };

  const _east = new THREE.Vector3();
  const _north = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _south = new THREE.Vector3();
  const _o = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _basis = new THREE.Matrix4();

  let parts = null;

  // ------------------------------------------------------------------ scene position

  /** earth-fixed km -> scene, through the stage so this works in whatever frame it draws in. */
  function sceneOf(ecefKm, out) {
    const s = ctx.stage?.toScene?.(ecefKm, 'earth-fixed');
    if (s) return out.set(s.x, s.y, s.z);
    // No stage: treat earth-fixed kilometres as scene units. Degrades, does not go dark.
    return out.set(ecefKm.x, ecefKm.y, ecefKm.z);
  }

  /**
   * Observer position and the east/north/up basis, both measured in SCENE space by pushing three
   * nearby earth-fixed points through the stage and differencing. One kilometre is far enough to
   * beat float noise and small enough that the curvature error is under a milliradian.
   */
  function measureFrame() {
    const { latRad, lonRad, altKm } = observer;
    const base = geodeticToEcefKm(latRad, lonRad, altKm + EYE_HEIGHT_KM);
    sceneOf(base, _o);

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);
    const D = 1; // km

    sceneOf({ x: base.x - sinLon * D, y: base.y + cosLon * D, z: base.z }, _p);
    _east.copy(_p).sub(_o).normalize();
    sceneOf(
      {
        x: base.x - sinLat * cosLon * D,
        y: base.y - sinLat * sinLon * D,
        z: base.z + cosLat * D,
      },
      _p,
    );
    _north.copy(_p).sub(_o).normalize();
    sceneOf(
      {
        x: base.x + cosLat * cosLon * D,
        y: base.y + cosLat * sinLon * D,
        z: base.z + sinLat * D,
      },
      _p,
    );
    _up.copy(_p).sub(_o).normalize();
    _south.copy(_north).negate();
  }

  // ------------------------------------------------------------------ geometry

  function domeRadius() {
    const r = Number(options.domeRadius) || 1;
    const near = Number.isFinite(camera.near) ? camera.near : 0.001;
    const far = Number.isFinite(camera.far) ? camera.far : 1e7;
    return Math.min(Math.max(r, near * 50), far * 0.25);
  }

  function buildSkyDome(R) {
    const geo = new THREE.SphereGeometry(R, DOME_SEGMENTS, DOME_SEGMENTS / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(TOKENS.space) },
        uZenith: { value: new THREE.Color(TOKENS.spaceEdge) },
        uGlow: { value: new THREE.Color(TOKENS.nightLights) },
        uGlowStrength: { value: 0 },
        uAlpha: { value: 0.14 },
        uSunDir: { value: new THREE.Vector3(0, -1, 0) },
      },
      vertexShader: `
        varying vec3 vLocal;
        void main() {
          vLocal = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uGlow;
        uniform float uGlowStrength; uniform float uAlpha; uniform vec3 uSunDir;
        varying vec3 vLocal;
        void main() {
          vec3 d = normalize(vLocal);
          float t = clamp(d.y, 0.0, 1.0);
          // pow < 1 keeps the horizon band wide, which is where all the colour is at twilight
          vec3 c = mix(uHorizon, uZenith, pow(t, 0.55));
          float toSun = max(dot(d, normalize(uSunDir)), 0.0);
          float glow = uGlowStrength * pow(toSun, 5.0) * (1.0 - t * 0.8);
          c = mix(c, uGlow, clamp(glow, 0.0, 0.85));
          float a = uAlpha * mix(1.0, 0.86, t);
          gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -100; // painted before everything, so records draw over it
    return mesh;
  }

  /** A soft dark skyline: an opaque cap from just under the silhouette down to the nadir. */
  function buildGround(R) {
    const seg = HORIZON_SEGMENTS;
    const rings = [
      { d: 1.4 * DEG2RAD, alpha: 0.0 }, // above the silhouette: fades out
      { d: 0.0, alpha: 0.72 },
      { d: -1.6 * DEG2RAD, alpha: 1.0 },
    ];
    const pos = [];
    const alpha = [];
    const idx = [];
    const rowLen = seg + 1;

    for (let r = 0; r < rings.length; r += 1) {
      for (let i = 0; i <= seg; i += 1) {
        const az = (i / seg) * Math.PI * 2;
        const alt = skylineAlt(az) + rings[r].d;
        localDir(az, alt, _dir).multiplyScalar(R * 0.99);
        pos.push(_dir.x, _dir.y, _dir.z);
        alpha.push(rings[r].alpha);
      }
    }
    // The nadir cap, one ring at -30 degrees and a pole.
    const nadirRingStart = rings.length * rowLen;
    for (let i = 0; i <= seg; i += 1) {
      const az = (i / seg) * Math.PI * 2;
      localDir(az, -30 * DEG2RAD, _dir).multiplyScalar(R * 0.99);
      pos.push(_dir.x, _dir.y, _dir.z);
      alpha.push(1);
    }
    const poleIdx = pos.length / 3;
    pos.push(0, -R * 0.99, 0);
    alpha.push(1);

    const bands = [
      [0, 1],
      [1, 2],
      [2, nadirRingStart / rowLen],
    ];
    for (const [a, b] of bands) {
      for (let i = 0; i < seg; i += 1) {
        const ia = a * rowLen + i;
        const ib = b * rowLen + i;
        idx.push(ia, ib, ia + 1, ia + 1, ib, ib + 1);
      }
    }
    for (let i = 0; i < seg; i += 1) {
      idx.push(nadirRingStart + i, poleIdx, nadirRingStart + i + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alpha, 1));
    geo.setIndex(idx);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(TOKENS.spaceEdge) } },
      vertexShader: `
        attribute float aAlpha; varying float vA;
        void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main() { gl_FragColor = vec4(uColor, vA); }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 100; // over everything: you cannot see what is below your horizon
    return mesh;
  }

  function lineSegments(points, colour, opacity, renderOrder) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const obj = new THREE.LineSegments(geo, mat);
    obj.frustumCulled = false;
    obj.renderOrder = renderOrder;
    return obj;
  }

  /** The horizon ring plus an azimuth tick every 30 degrees, cardinals longer. */
  function buildHorizon(R) {
    const pts = [];
    const push = (az, alt) => {
      localDir(az, alt, _dir).multiplyScalar(R * 0.97);
      pts.push(_dir.x, _dir.y, _dir.z);
    };
    for (let i = 0; i < HORIZON_SEGMENTS; i += 1) {
      push((i / HORIZON_SEGMENTS) * Math.PI * 2, 0);
      push(((i + 1) / HORIZON_SEGMENTS) * Math.PI * 2, 0);
    }
    for (let d = 0; d < 360; d += 30) {
      const az = d * DEG2RAD;
      const cardinal = d % 90 === 0;
      push(az, (cardinal ? -3.2 : -1.5) * DEG2RAD);
      push(az, (cardinal ? 3.2 : 1.5) * DEG2RAD);
    }
    return lineSegments(pts, TOKENS.textDim, 0.42, 101);
  }

  /** Altitude ticks every 30 degrees, on every 30 degrees of azimuth, plus faint arcs to join them. */
  function buildAltitudeTicks(R) {
    const ticks = [];
    const arcs = [];
    const pushTo = (arr, az, alt) => {
      localDir(az, alt, _dir).multiplyScalar(R * 0.97);
      arr.push(_dir.x, _dir.y, _dir.z);
    };
    for (const altDeg of [30, 60]) {
      for (let d = 0; d < 360; d += 30) {
        const az = d * DEG2RAD;
        const half = (d % 90 === 0 ? 2.6 : 1.4) * DEG2RAD;
        pushTo(ticks, az - half, altDeg * DEG2RAD);
        pushTo(ticks, az + half, altDeg * DEG2RAD);
      }
      // A dashed arc: draw every other segment.
      const n = 120;
      for (let i = 0; i < n; i += 2) {
        pushTo(arcs, (i / n) * Math.PI * 2, altDeg * DEG2RAD);
        pushTo(arcs, ((i + 1) / n) * Math.PI * 2, altDeg * DEG2RAD);
      }
    }
    // The zenith, a small cross.
    for (const az of [0, Math.PI / 2]) {
      pushTo(ticks, az, 87 * DEG2RAD);
      pushTo(ticks, az + Math.PI, 87 * DEG2RAD);
    }
    return {
      ticks: lineSegments(ticks, TOKENS.textDim, 0.34, 101),
      arcs: lineSegments(arcs, TOKENS.textDim, 0.13, 101),
    };
  }

  function buildCardinals(R) {
    const g = new THREE.Group();
    const letters = [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ];
    for (const [letter, azDeg] of letters) {
      const tex = makeLetterTexture(letter);
      if (!tex) continue;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      // sizeAttenuation stays on, and the sprite sits at a fixed radius, so it subtends a
      // constant angle: about 3 degrees tall whatever the dome radius is.
      const s = R * 0.055;
      sprite.scale.set(s, s, 1);
      localDir(azDeg * DEG2RAD, 4.2 * DEG2RAD, _dir).multiplyScalar(R * 0.95);
      sprite.position.copy(_dir);
      sprite.renderOrder = 102;
      sprite.frustumCulled = false;
      g.add(sprite);
    }
    return g;
  }

  function build() {
    const R = domeRadius();
    group = new THREE.Group();
    group.name = 'sky-from-here';
    group.frustumCulled = false;
    const dome = buildSkyDome(R);
    const ground = buildGround(R);
    const horizon = buildHorizon(R);
    const { ticks, arcs } = buildAltitudeTicks(R);
    const cardinals = buildCardinals(R);
    group.add(dome, ground, horizon, ticks, arcs, cardinals);
    parts = { R, dome, ground, horizon, ticks, arcs, cardinals };
  }

  function disposeGroup() {
    if (!group) return;
    group.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x?.dispose?.());
      else {
        m?.map?.dispose?.();
        m?.dispose?.();
      }
    });
    group.parent?.remove(group);
    group = null;
    parts = null;
  }

  // ------------------------------------------------------------------ the Sun

  function solveSun(tMs) {
    if (!observerA) return;
    if (Math.abs(tMs - sunSolvedAtMs) < SUN_REFRESH_MS) return;
    sunSolvedAtMs = tMs;
    const date = new Date(tMs);
    // astronomy-engine, not a low-precision series: the whole gradient hangs off this number.
    const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observerA, true, true);
    const hor = Astronomy.Horizon(date, observerA, eq.ra, eq.dec, 'normal');
    sunElDeg = hor.altitude;
    sunAzDeg = hor.azimuth;
  }

  function applySky() {
    skyAt(sunElDeg, sky);
    const u = parts?.dome?.material?.uniforms;
    if (!u) return;
    u.uHorizon.value.copy(sky.horizon);
    u.uZenith.value.copy(sky.zenith);
    u.uAlpha.value = sky.alpha;
    u.uGlowStrength.value = sky.glow;
    localDir(sunAzDeg * DEG2RAD, sunElDeg * DEG2RAD, u.uSunDir.value);
  }

  // ------------------------------------------------------------------ looking around

  function lookBy(dAzRad, dAltRad) {
    dAz += dAzRad;
    dAlt += dAltRad;
  }

  function lookAtAngles(azR, altR) {
    if (Number.isFinite(azR)) {
      dAz = 0;
      azRad = azR;
    }
    if (Number.isFinite(altR)) {
      dAlt = 0;
      altRad = THREE.MathUtils.clamp(altR, -20 * DEG2RAD, 85 * DEG2RAD);
    }
  }

  /** Point the view at a pass, or at anything with an azimuth and an altitude in degrees. */
  function lookAtDeg(azDeg, altDeg) {
    lookAtAngles(azDeg * DEG2RAD, altDeg * DEG2RAD);
  }

  let drag = null;
  function onPointerDown(e) {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    domElement?.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!isActive || !drag || drag.id !== e.pointerId) return;
    const h = domElement?.clientHeight || 800;
    const perPx = (fovDeg * DEG2RAD) / h;
    lookBy(-(e.clientX - drag.x) * perPx, (e.clientY - drag.y) * perPx);
    drag.x = e.clientX;
    drag.y = e.clientY;
  }
  function onPointerUp(e) {
    if (drag && drag.id === e.pointerId) drag = null;
    domElement?.releasePointerCapture?.(e.pointerId);
  }

  function attachInput() {
    if (!domElement?.addEventListener) return;
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);
  }
  function detachInput() {
    if (!domElement?.removeEventListener) return;
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
  }

  // ------------------------------------------------------------------ enter / update / exit

  function enter(o) {
    const next = normaliseObserver(o) || normaliseObserver(ctx.observer);
    if (!next) return false;
    observer = next;
    observerA = new Astronomy.Observer(observer.latDeg, observer.lonDeg, observer.altKm * 1000);
    sunSolvedAtMs = -Infinity;

    if (!isActive) {
      saved = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        fov: camera.fov,
        up: camera.up.clone(),
        rig: ctx.cameraRig?.saveState?.() ?? null,
      };
      ctx.cameraRig?.stopFollow?.();
      attachInput();
    }

    if (!group) build();
    if (group.parent !== scene) scene.add(group);

    camera.fov = fovDeg;
    camera.updateProjectionMatrix?.();

    // Open facing the equator. Low-orbit traffic is inclined at 50-100 degrees, so from a
    // northern latitude it all appears to the south, and the other way round below the equator.
    measureFrame();
    camera.up.copy(_up);
    azRad = observer.latDeg >= 0 ? Math.PI : 0;
    altRad = 12 * DEG2RAD;
    dAz = 0;
    dAlt = 0;

    isActive = true;
    update(ctx.clock?.now?.() ?? 0);
    return true;
  }

  function update(tMs) {
    if (!isActive || !observer) return;
    const t = Number.isFinite(tMs) ? tMs : (ctx.clock?.now?.() ?? 0);

    measureFrame();
    solveSun(t);
    applySky();

    // Damped look. No dt is passed in by the contract, so this is a fixed per-frame fraction --
    // it is a head turn, not scene state, so it does not need to be frame-rate exact.
    const k = 0.25;
    azRad += dAz * k;
    dAz *= 1 - k;
    altRad = THREE.MathUtils.clamp(altRad + dAlt * k, -20 * DEG2RAD, 85 * DEG2RAD);
    dAlt *= 1 - k;

    // Local basis into scene space: +X east, +Y up, +Z south.
    _basis.makeBasis(_east, _up, _south);
    group.position.copy(_o);
    group.quaternion.setFromRotationMatrix(_basis);
    group.updateMatrixWorld(true);

    camera.position.copy(_o);
    camera.up.copy(_up);
    localDir(azRad, altRad, _dir).applyQuaternion(group.quaternion);
    camera.lookAt(_p.copy(_o).addScaledVector(_dir, parts?.R ?? 1));
  }

  function exit() {
    if (!isActive) return;
    isActive = false;
    detachInput();
    disposeGroup();
    if (saved) {
      camera.up.copy(saved.up);
      camera.fov = saved.fov;
      camera.updateProjectionMatrix?.();
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      // The camera is exactly where the rig left it, so the rig only needs to re-read it -- a
      // flight back would be a flight to where we already are.
      if (saved.rig?.target) ctx.cameraRig?.setTarget?.(saved.rig.target);
      else ctx.cameraRig?.sync?.();
      saved = null;
    }
  }

  return {
    enter,
    exit,
    update,
    get active() {
      return isActive;
    },

    // beyond the contract, additive: what the tilt handler, the pass cards and status need.
    get observer() {
      return observer;
    },
    get sun() {
      return { elevationDeg: sunElDeg, azimuthDeg: sunAzDeg, phase: sunPhaseName(sunElDeg) };
    },
    get look() {
      return { azimuthDeg: (((azRad * RAD2DEG) % 360) + 360) % 360, altitudeDeg: altRad * RAD2DEG };
    },
    lookBy,
    lookAtDeg,
    dispose() {
      exit();
      detachInput();
      disposeGroup();
    },
  };
}

export { SKY_STOPS, EYE_HEIGHT_KM, SKY_FOV_DEG };
