// scene/starfield.js — the real sky behind everything.
//
// Three parts, all built in the equatorial J2000 frame (the module contract's `earth-inertial` axes):
//   1. the Milky Way on an inside-out sphere,
//   2. 5 044 real stars from data/stars.bin as one Points, sized and coloured by magnitude and B-V,
//   3. the 89 constellation figures as LineSegments at 25 % opacity, plus their names as a list the
//      label layer can draw.
//
// The scene is NOT the frame: stage.toScene remaps the axes (the scene is Y-up). Rather than
// hard-code that, the group's rotation is measured from stage.toScene itself — three unit vectors
// converted, origin subtracted — so this file stays right whatever the stage does and whichever
// world is active.
//
// Everything is built on a UNIT sphere and the group is scaled to a large radius, with depthTest
// off and a negative renderOrder, so the sky is painted first and can never occlude anything —
// whatever near/far planes the renderer ends up with.

import * as THREE from '../../vendor/three.module.min.js';
import * as frames from '../propagate/frames.js';
import * as stageMod from './stage.js';
import { PALETTE } from './glyphatlas.js';

const DEG = Math.PI / 180;
const DEFAULT_RADIUS = 1e5; // scene units; update(camera) clamps this under camera.far

const RENDER_ORDER_MILKYWAY = -3;
const RENDER_ORDER_SKY = -2;

// ------------------------------------------------------------------------------- star colours

/**
 * B-V colour index -> effective temperature, Ballesteros' formula (F. J. Ballesteros 2012,
 * "New insights into black bodies", EPL 97, 34008). Good to a few per cent over the main sequence:
 * B-V 0.00 -> 10 125 K (A0 is ~9 600 K), B-V 1.24 -> 4 232 K (Arcturus is ~4 286 K).
 */
export function bvToKelvin(bv) {
  const b = Math.min(2.0, Math.max(-0.4, bv));
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
}

/**
 * Black-body temperature -> sRGB, Tanner Helland's piecewise approximation (2012), normalised so
 * the brightest channel is 1. Blue above ~7 000 K, white near 6 500 K, orange below ~4 000 K.
 */
export function kelvinToRgb(kelvin) {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const clamp = (v) => Math.min(255, Math.max(0, v)) / 255;
  const out = [clamp(r), clamp(g), clamp(b)];
  const max = Math.max(out[0], out[1], out[2]) || 1;
  return [out[0] / max, out[1] / max, out[2] / max];
}

// Magnitude -> size in device pixels and alpha. Sirius (-1.44) draws at ~6 px, a 6.0 star at ~1 px.
const MAG_MIN = -1.5;
const MAG_MAX = 6.0;
function magToSize(mag) {
  const t = Math.min(1, Math.max(0, (MAG_MAX - mag) / (MAG_MAX - MAG_MIN)));
  return 1.0 + 5.0 * Math.pow(t, 1.6);
}
function magToAlpha(mag) {
  const t = Math.min(1, Math.max(0, (MAG_MAX - mag) / (MAG_MAX - MAG_MIN)));
  return 0.35 + 0.65 * t;
}

// --------------------------------------------------------------------------------- direction

const _v = new THREE.Vector3();
function radecToVec(raDeg, decDeg, out = new THREE.Vector3()) {
  // Prefer frames.js, so the starfield uses exactly the convention the propagators use.
  if (typeof frames.radecToVec === 'function') {
    const p = frames.radecToVec(raDeg, decDeg);
    return out.set(p.x, p.y, p.z).normalize();
  }
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return out.set(c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec));
}

// ----------------------------------------------------------------- equatorial -> scene axes

const EQUATORIAL = 'earth-inertial';
const BIG_KM = 1e6; // any distance; the origin cancels, so only the rotation survives

/**
 * The rotation that takes an equatorial J2000 direction into scene axes, measured from the stage's
 * own toScene() rather than assumed. Returns the identity if there is no stage yet.
 */
function skyQuaternion(out = new THREE.Quaternion()) {
  const st = stageMod.stage;
  if (!st || typeof st.toScene !== 'function') return out.identity();
  try {
    // The catalogue's right ascensions and declinations are J2000. The stage's `earth-inertial`
    // axes are TEME -- the true equator and mean equinox OF DATE -- because that is what SGP4
    // returns and what every satellite in the scene is drawn in. In 2026 the two are 0.2 degrees
    // apart, which is about half the width of the Moon and plainly visible if you put a satellite
    // next to a star.
    //
    // So the stars are rotated INTO the frame the satellites live in, rather than the other way
    // round. It costs one quaternion instead of a rotation per star, because the sky is a rigid
    // body: precession turns all of it together.
    const tMs = st.tMs;
    const toTeme = (v) => {
      try { return frames.j2000ToTeme(v, tMs); } catch { return v; }
    };
    // stage.js returns null for a frame it cannot express. earth-inertial always converts, but
    // asserting that here rather than assuming it is the difference between a wrong sky and none.
    const oKm = st.toScene({ x: 0, y: 0, z: 0 }, EQUATORIAL);
    const axKm = st.toScene(toTeme({ x: BIG_KM, y: 0, z: 0 }), EQUATORIAL);
    const ayKm = st.toScene(toTeme({ x: 0, y: BIG_KM, z: 0 }), EQUATORIAL);
    const azKm = st.toScene(toTeme({ x: 0, y: 0, z: BIG_KM }), EQUATORIAL);
    if (!oKm || !axKm || !ayKm || !azKm) return out.identity();
    const o = new THREE.Vector3().copy(oKm);
    const ax = new THREE.Vector3().copy(axKm).sub(o);
    const ay = new THREE.Vector3().copy(ayKm).sub(o);
    const az = new THREE.Vector3().copy(azKm).sub(o);
    if (ax.lengthSq() < 1e-12 || ay.lengthSq() < 1e-12 || az.lengthSq() < 1e-12) return out.identity();
    return out.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(ax.normalize(), ay.normalize(), az.normalize())
    );
  } catch {
    return out.identity();
  }
}

// --------------------------------------------------------------------------------- shaders

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vColour = aColour;
  vAlpha = aAlpha * uGain;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
#include <common>
void main() {
  float d = length( gl_PointCoord - vec2( 0.5 ) );
  float a = 1.0 - smoothstep( 0.12, 0.5, d );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( vColour, a * vAlpha );
  #include <colorspace_fragment>
}
`;

// --------------------------------------------------------------------------------- loading

async function asArrayBuffer(src) {
  if (!src) return null;
  if (src instanceof ArrayBuffer) return src;
  if (ArrayBuffer.isView(src)) return src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength);
  if (typeof src === 'string' || src instanceof URL) {
    const r = await fetch(String(src));
    if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`);
    return await r.arrayBuffer();
  }
  return null;
}

async function asJson(src) {
  if (!src) return null;
  if (typeof src === 'object' && !(src instanceof URL)) return src;
  const r = await fetch(String(src));
  if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`);
  return await r.json();
}

function asTexture(src) {
  if (!src) return null;
  if (src.isTexture) return src;
  if (typeof src === 'string' || src instanceof URL) {
    const t = new THREE.TextureLoader().load(String(src));
    t.colorSpace = THREE.SRGBColorSpace;
    t.userData.owned = true; // ours to dispose; a texture handed in is not
    return t;
  }
  if (typeof src === 'object' && (src.tagName === 'IMG' || src.tagName === 'CANVAS')) {
    const t = new THREE.Texture(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    t.userData.owned = true;
    return t;
  }
  return null;
}

// --------------------------------------------------------------------------------- the layer

/**
 * @param {THREE.Scene} scene
 * @param {{starsBin?, linesJson?, namesJson?, milkyWayTexture?, radius?, pixelRatio?}} [opts]
 *   Each source may be a URL string, already-loaded data (ArrayBuffer / parsed JSON /
 *   THREE.Texture), or omitted to use the bundled default path. Loading is fault-tolerant: each
 *   piece appears when it lands and a failure leaves the others drawing.
 * @returns {{setVisible, update, dispose, names, group, ready, setPixelRatio, setFrame, setGain}}
 */
export function createStarfield(scene, opts = {}) {
  const here = import.meta.url;
  const src = {
    starsBin: opts.starsBin ?? new URL('../../data/stars.bin', here),
    linesJson: opts.linesJson ?? new URL('../../data/constellations.lines.json', here),
    namesJson: opts.namesJson ?? new URL('../../data/constellation-names.json', here),
    milkyWayTexture: opts.milkyWayTexture ?? new URL('../../textures/2k_stars_milky_way.jpg', here),
  };

  const group = new THREE.Group();
  group.name = 'starfield';
  group.matrixAutoUpdate = true;
  group.scale.setScalar(opts.radius || DEFAULT_RADIUS);
  group.renderOrder = RENDER_ORDER_SKY;
  scene.add(group);

  // equatorial J2000 -> scene axes, measured from the stage rather than assumed
  let lastFrame = stageMod.stage ? stageMod.stage.frame : null;
  skyQuaternion(group.quaternion);

  /**
   * Centre the sky on the camera and keep it inside the far plane. three hands onBeforeRender the
   * renderer and the camera actually being drawn with, which is the only place this file can get
   * either without the caller having to remember to pass them.
   */
  function syncToCamera(camera, renderer) {
    if (!dprLocked && renderer && typeof renderer.getPixelRatio === 'function') {
      starUniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    }
    const frame = stageMod.stage ? stageMod.stage.frame : null;
    if (frame !== lastFrame) {
      lastFrame = frame;
      skyQuaternion(group.quaternion);
    }
    if (!camera || !camera.isCamera) return;
    const far = Number.isFinite(camera.far) ? camera.far : Infinity;
    const r = Math.max(1, Math.min(opts.radius || DEFAULT_RADIUS, far * 0.4));
    if (!group.position.equals(camera.position) || group.scale.x !== r) {
      group.position.copy(camera.position);
      group.scale.setScalar(r);
      // The Milky Way draws first, so recomputing here lands on the stars and the lines in this
      // same frame; the sphere itself is a frame behind, which at these radii is invisible.
      group.updateMatrixWorld(true);
    }
  }

  function watch(obj) {
    obj.onBeforeRender = (renderer, _scene, camera) => syncToCamera(camera, renderer);
    return obj;
  }

  const names = [];
  const state = { stars: null, lines: null, milkyway: null, errors: [] };
  let gain = 1; // setGain's own value; setSkyOpacity multiplies it rather than overwriting it
  let skyOpacity = 1;
  let detailLow = false; // the frame-rate latch hides the picture and the lines, never the stars
  let pixelRatio =
    opts.pixelRatio || (typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1);
  let dprLocked = false; // true once setPixelRatio() is called by hand
  const starUniforms = {
    uPixelRatio: { value: pixelRatio },
    uGain: { value: 1 },
  };

  // ---- Milky Way ----------------------------------------------------------------------------
  function buildMilkyWay(texture) {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(1, 48, 24);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      transparent: true, // so the scale ladder can fade the picture out (scene/lod.js)
      opacity: 1,
      color: new THREE.Color(0.42, 0.42, 0.46), // a whisper, not a wallpaper
    });
    const m = new THREE.Mesh(geo, mat);
    m.name = 'milkyway';
    m.renderOrder = RENDER_ORDER_MILKYWAY;
    m.frustumCulled = false;

    // ALIGNMENT IS APPROXIMATE. The Solar System Scope map is an equirectangular sky drawn on the
    // galactic frame: the image centre is (roughly) the galactic centre and the top edge the
    // galactic north pole. three's SphereGeometry puts uv.x = 0.5 on local +X and the image top on
    // local +Y, so mapping local +X -> the galactic centre and local +Y -> the galactic pole puts
    // the band where it belongs to within a degree or two. It is not a registered astrometric
    // solution and must not be used to identify anything; the stars are the measured layer.
    const gc = radecToVec(266.405, -28.936); // galactic centre, l=0 b=0, J2000
    const pole = radecToVec(192.85948, 27.12825); // galactic north pole, J2000
    const x = gc.clone().addScaledVector(pole, -gc.dot(pole)).normalize();
    const z = new THREE.Vector3().crossVectors(x, pole).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, pole, z));

    state.milkyway = watch(m);
    group.add(m);
  }

  // ---- stars --------------------------------------------------------------------------------
  function buildStars(buffer) {
    if (!buffer) return;
    const f = new Float32Array(buffer);
    const n = Math.floor(f.length / 4);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const alpha = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const ra = f[i * 4];
      const dec = f[i * 4 + 1];
      const mag = f[i * 4 + 2];
      const bv = f[i * 4 + 3];
      radecToVec(ra, dec, _v);
      pos[i * 3] = _v.x;
      pos[i * 3 + 1] = _v.y;
      pos[i * 3 + 2] = _v.z;
      const rgb = kelvinToRgb(bvToKelvin(bv));
      c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      size[i] = magToSize(mag);
      alpha[i] = magToAlpha(mag);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.001);
    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: starUniforms,
      // NOT `transparent: true`, deliberately. three sorts into three lists and draws them
      // opaque -> transmissive -> transparent; renderOrder only sorts WITHIN a list. A material
      // flagged transparent therefore draws after every opaque object -- Earth included -- and
      // with depthTest off the stars would paint straight over the planet. Left in the opaque
      // list, renderOrder -2 puts them after the Milky Way and before Earth, which is what the
      // header comment promises. Blending is untouched: three only forces NoBlending when
      // `blending === NormalBlending && transparent === false`, and this is AdditiveBlending, so
      // the pixels are identical -- only the bucket changes.
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const points = new THREE.Points(geo, mat);
    points.name = 'stars';
    points.renderOrder = RENDER_ORDER_SKY;
    points.frustumCulled = false;
    state.stars = watch(points);
    state.starCount = n;
    group.add(points);
  }

  // ---- constellation lines -------------------------------------------------------------------
  function buildLines(json) {
    if (!json || !Array.isArray(json.features)) return;
    const verts = [];
    let segments = 0;
    for (const feature of json.features) {
      const geom = feature && feature.geometry;
      if (!geom) continue;
      const multi =
        geom.type === 'MultiLineString'
          ? geom.coordinates
          : geom.type === 'LineString'
            ? [geom.coordinates]
            : [];
      for (const line of multi) {
        for (let i = 0; i + 1 < line.length; i++) {
          // Working in 3D means the RA wrap at 0h/24h needs no special case at all.
          radecToVec(line[i][0], line[i][1], _v);
          verts.push(_v.x, _v.y, _v.z);
          radecToVec(line[i + 1][0], line[i + 1][1], _v);
          verts.push(_v.x, _v.y, _v.z);
          segments++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.001);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.textDim),
      // Same reason as the stars above: `transparent: true` would put the figures in the
      // transparent list, i.e. after Earth, and depthTest:false would then draw them across the
      // planet. CustomBlending with these four factors is exactly what three's setBlending emits
      // for NormalBlending at premultipliedAlpha:false, so the 25 % alpha is preserved to the
      // pixel while the lines stay in the opaque list at renderOrder -2.
      transparent: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      opacity: 0.25,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.name = 'constellations';
    lines.renderOrder = RENDER_ORDER_SKY;
    lines.frustumCulled = false;
    state.lines = watch(lines);
    state.segmentCount = segments;
    group.add(lines);
  }

  // ---- names -----------------------------------------------------------------------------------
  function buildNames(json) {
    if (!Array.isArray(json)) return;
    for (const row of json) {
      if (!row || typeof row.ra !== 'number' || typeof row.dec !== 'number') continue;
      names.push({
        id: row.id,
        name: row.name,
        raDeg: row.ra,
        decDeg: row.dec,
        // unit vector in the same frame as the stars; the label layer scales it by whatever
        // distance it wants and projects it
        dir: radecToVec(row.ra, row.dec),
        cls: 'illustrative', // the figures are a drawn convention, not a measurement
      });
    }
  }

  const ready = (async () => {
    const jobs = [
      asArrayBuffer(src.starsBin).then(buildStars),
      asJson(src.linesJson).then(buildLines),
      asJson(src.namesJson).then(buildNames),
      // asTexture() is synchronous and CAN throw (THREE.TextureLoader touches `document`).
      // Called while building this array the throw would escape before Promise.allSettled ever
      // ran, taking the stars, the lines and the names with it and rejecting `ready`. Deferring
      // it into a then() is what makes the "one piece failing leaves the others drawing" promise
      // above actually true.
      Promise.resolve().then(() => asTexture(src.milkyWayTexture)).then(buildMilkyWay),
    ];
    const settled = await Promise.allSettled(jobs);
    for (const s of settled) {
      if (s.status === 'rejected') {
        state.errors.push(String(s.reason && s.reason.message ? s.reason.message : s.reason));
        // Degrade, never go dark: whatever loaded still draws, and the caller can read .errors.
        console.warn('starfield:', s.reason);
      }
    }
    return state;
  })();

  return {
    setVisible(b) {
      group.visible = !!b;
    },
    /**
     * Optional per-frame call. Pass the camera and the sky recentres at once; pass anything else
     * (main.js's loop passes the clock time) and it is a no-op, because the same work happens in
     * onBeforeRender with the camera three is actually drawing with. It never throws on either.
     */
    update(camera) {
      syncToCamera(camera && camera.isCamera ? camera : null, null);
    },
    /**
     * Device pixel ratio, so a star is the same apparent size on a retina screen. Not normally
     * needed — it is read from the renderer at draw time — and calling it pins the value.
     */
    setPixelRatio(dpr) {
      pixelRatio = Math.min(2, Math.max(0.5, dpr || 1));
      starUniforms.uPixelRatio.value = pixelRatio;
      dprLocked = true;
    },
    /**
     * How much of the sky-from-here is drawn, 0..1 (spec 0028 req 8, driven by scene/lod.js). The
     * panorama, the naked-eye stars and the constellation lines are a picture of the sky as seen
     * from inside the Solar System; from a light-year out that picture is wrong, so it goes. At 0
     * the three meshes are hidden outright rather than drawn invisible.
     */
    setSkyOpacity(k) {
      const v = Math.min(1, Math.max(0, Number(k)));
      skyOpacity = v;
      const mw = state.milkyway;
      if (mw && mw.material) { mw.material.opacity = v; mw.visible = v > 0 && !detailLow; }
      const ln = state.lines;
      if (ln && ln.material) { ln.material.opacity = 0.25 * v; ln.visible = v > 0 && !detailLow; }
      starUniforms.uGain.value = Math.min(1, Math.max(0, gain * v));
      if (state.stars) state.stars.visible = v > 0;
    },
    /** 'low' hides the Milky Way picture and the constellation lines (spec 0026 req 18); the stars stay. */
    setDetail(level) {
      detailLow = level === 'low';
      this.setSkyOpacity(skyOpacity);
    },
    /** Overall star brightness, 0..1 — the sky view dims them at dawn. */
    setGain(g) {
      gain = Math.min(1, Math.max(0, g));
      starUniforms.uGain.value = Math.min(1, Math.max(0, gain * skyOpacity));
    },
    /**
     * Re-measure the equatorial -> scene rotation from stage.toScene(). update() does this by
     * itself when the stage's frame changes; call it directly if the stage is swapped without one.
     */
    syncFrame() {
      lastFrame = stageMod.stage ? stageMod.stage.frame : null;
      skyQuaternion(group.quaternion);
      return group.quaternion;
    },
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const map = o.material.map;
          if (map && map.userData && map.userData.owned) map.dispose();
          o.material.dispose();
        }
      });
      scene.remove(group);
      names.length = 0;
    },
    /** [{id, name, raDeg, decDeg, dir, cls}] for the 89 figures — the label layer draws them. */
    names,
    group,
    ready,
    state,
  };
}
