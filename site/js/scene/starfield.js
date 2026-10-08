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
import { STRETCH_VERT_HEAD, STRETCH_VERT, STRETCH_FRAG_HEAD, STRETCH_FRAG, STAR_LIGHT_GLSL, stretchUniforms, writeStretch } from './stretch.js';

const DEG = Math.PI / 180;
const DEFAULT_RADIUS = 1e5; // scene units; update(camera) clamps this under camera.far

// The panorama's tint at the Camera exposure: what the sky has always been drawn at. setExposure()
// scales it (scene/exposure.js): dimmer for the eye, lifted for a deep exposure.
const MILKY_WAY_TINT = [0.42, 0.42, 0.46];
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

/**
 * A STAR'S COLOUR ON THE SCREEN (public #271). The black-body colour above is right and, as a
 * 4 px light on a dark screen, reads as white: Betelgeuse and Rigel looked the same. Its chroma is
 * stretched by STAR_CHROMA about the star's own mean, the way a long exposure shows colour the
 * dark-adapted eye loses. The hue and the order are the measured ones; the strength is a display
 * choice, and the Sun (B-V 0.65) stays the cream it was. Pure.
 */
export const STAR_CHROMA = 2.0;
export function starTint(bv, chroma = STAR_CHROMA) {
  const rgb = kelvinToRgb(bvToKelvin(Number.isFinite(bv) ? bv : 0.65));
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const out = rgb.map((v) => Math.min(1, Math.max(0, mean + (v - mean) * chroma)));
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
    // A MILLION KM IS NOTHING ON A RUNG OF THE LADDER (2026-10-05). There one unit is a
    // light-year or more, the three arms below came out 1e-7 units long, the length check under
    // them took that for "no stage", and the sky sphere was drawn with no rotation at all:
    // measured on the stellar rung, Orion a quarter of the sky from where its 3D stars are. Nobody
    // saw it, because registry/lod.yaml has faded the sphere out by 5 000 au and no camera had
    // stood nearer on a rung. So the arm is as long as the stage's own unit asks for; on a world's
    // stage (a unit of a thousand km or less) it is the million km it always was.
    const big = BIG_KM * Math.max(1, (Number(st.unitKm) || 1) / 1000);
    const oKm = st.toScene({ x: 0, y: 0, z: 0 }, EQUATORIAL);
    const axKm = st.toScene(toTeme({ x: big, y: 0, z: 0 }), EQUATORIAL);
    const ayKm = st.toScene(toTeme({ x: 0, y: big, z: 0 }), EQUATORIAL);
    const azKm = st.toScene(toTeme({ x: 0, y: 0, z: big }), EQUATORIAL);
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

// ------------------------------------------------------------------------ glare round the Sun

/**
 * STARS FADE NEAR THE SUN (public #412, internal #404, 2026-10-08). No camera that can show the
 * Sun's disc shows a star beside it: the disc's light, spread by the optics, drowns them. So the
 * stars are gone within `inner` of the Sun's centre and come back to full by `outer`, both set
 * by how big the disc is in the sky (its angular radius, `alphaRad`): gone to twice its radius
 * and never closer than a degree and a half, back by six radii and never before six degrees.
 * From the Earth that is nothing inside 1.5 degrees; from where the Sun's disc fills a quarter of
 * the view, nothing in the same field as the disc. ILLUSTRATIVE: the numbers are a camera's
 * habit, chosen, and the Sun's card says the stars near it are hidden by its glare.
 * @returns {{innerRad: number, outerRad: number}}
 */
export function sunGlare(alphaRad) {
  const a = Math.max(0, Math.min(Math.PI / 2, Number(alphaRad) || 0));
  const DEG = Math.PI / 180;
  return { innerRad: Math.min(Math.PI, Math.max(2 * a, 1.5 * DEG)), outerRad: Math.min(Math.PI, Math.max(6 * a, 6 * DEG)) };
}

// --------------------------------------------------------------------------------- shaders

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uScale;
uniform float uGlow;
uniform vec3 uSunView;    // the Sun's direction from the camera, in view space; zero: no glare
uniform vec2 uSunGlare;   // cosines of sunGlare()'s inner and outer angles
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
${STRETCH_VERT_HEAD}
void main() {
  vColour = aColour;
  vAlpha = aAlpha * uGain;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  // Stars fade near the Sun (sunGlare() above): gone inside the inner angle, whole past the outer.
  vAlpha *= 1.0 - smoothstep( uSunGlare.y, uSunGlare.x, dot( normalize( mv.xyz ), uSunView ) );
  gl_Position = projectionMatrix * mv;
  // The naked-eye stars the constellations are drawn from (magnitude 2.7 and brighter: aSize over
  // 2.3; magnitude 1.5 until 2026-10-08, public #271) get a soft glow round a core that stays its
  // size (scene/stretch.js, A STAR'S LIGHT): up to five times the sprite at Sirius.
  vGlow = uGlow * smoothstep( 2.3, 6.0, aSize );
  float sizePx = aSize * ( 1.0 + 4.0 * vGlow ) * uPixelRatio * uScale;
  vCore = 1.0 / ( 1.0 + 4.0 * vGlow );
  // Spec 0034: the same stretch as scene/stars3d.js; at uStretch == 0, gl_PointSize = sizePx.
${STRETCH_VERT}
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
${STRETCH_FRAG_HEAD}
#include <common>
${STAR_LIGHT_GLSL}
void main() {
${STRETCH_FRAG}
  vec2 light = starLight( d, vCore, vGlow );
  float a = light.x + light.y;
  if ( a <= 0.003 ) discard;
  // The peak of a bright star goes to white, as any light too bright for its colour does; the glow keeps the colour.
  gl_FragColor = vec4( mix( vColour, vec3( 1.0 ), 0.4 * light.x * vGlow ), a * vAlpha * taper );
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
 * @returns {{setVisible, update, dispose, names, group, ready, setPixelRatio, setFrame, setGain, setExposure}}
 */
export function createStarfield(scene, opts = {}) {
  const here = import.meta.url;
  const src = {
    starsBin: opts.starsBin ?? new URL('../../data/stars.bin', here),
    linesJson: opts.linesJson ?? new URL('../../data/constellations.lines.json', here),
    namesJson: opts.namesJson ?? new URL('../../data/constellation-names.json', here),
    milkyWayTexture: opts.milkyWayTexture ?? new URL('../../textures/2k_stars_milky_way.webp', here),
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
  let milkyWayExposure = 1; // setExposure's factor, kept so a panorama that lands later wears it
  let detailLow = false; // the frame-rate latch hides the picture and the lines, never the stars
  // The figures are a way to read the sky from the ground. From orbit they crossed the whole Earth
  // view like scratches on the glass (#272), so they are drawn only while sky/skyview.js is up.
  let linesOn = false;
  let pixelRatio =
    opts.pixelRatio || (typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1);
  let dprLocked = false; // true once setPixelRatio() is called by hand
  const starUniforms = {
    uPixelRatio: { value: pixelRatio },
    uGain: { value: 1 },
    // How large a star's point is drawn, as a factor (setPointScale). 1 everywhere but while
    // constellation figures are up (scene/figures3d.js), where the stars are the subject.
    uScale: { value: 1 },
    // The glow round the brightest stars (scene/stretch.js, A STAR'S LIGHT); 0 under the frame latch.
    uGlow: { value: 1 },
    uSunView: { value: new THREE.Vector3(0, 0, 0) },
    uSunGlare: { value: new THREE.Vector2(2, 3) },   // cosines no direction reaches: no fade
    ...stretchUniforms(),
  };
  const sunWorld = new THREE.Vector3();
  let sunAlpha = -1;

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
      // NOT `transparent: true` -- and that one flag hid EARTH from 2026-09-08 to 2026-09-16.
      //
      // It was added so the scale ladder could fade the picture (scene/lod.js, spec 0028 step 2).
      // But three draws its render lists opaque -> transmissive -> transparent, and renderOrder only
      // sorts WITHIN a list, so a transparent material draws after every opaque object whatever
      // its renderOrder of -3 says. With depthTest off, the panorama then painted straight over the
      // Earth, the Moon, the Sun and every planet: a camera 22 units from a lit Earth read (0,0,0)
      // at the centre pixel, and the live site showed a ring of satellites around an empty sky
      // with only the atmosphere's rim left, because the atmosphere is transparent too and draws
      // after it. The stars and the constellation lines below had already been fixed for exactly
      // this, with comments saying why; the Milky Way was the piece of the sky that was not.
      //
      // So: the opaque list, and the blend factors three's setBlending emits for NormalBlending
      // spelled out as CustomBlending -- the same pixels, and because the blending is no longer
      // NormalBlending three does not define OPAQUE, so `opacity` still reaches the shader and
      // the ladder's fade still works. tests/test_contract.mjs refuses the combination anywhere in
      // the scene.
      transparent: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      opacity: 1,
      color: new THREE.Color(MILKY_WAY_TINT[0], MILKY_WAY_TINT[1], MILKY_WAY_TINT[2]).multiplyScalar(milkyWayExposure), // a whisper, not a wallpaper
    });
    const m = new THREE.Mesh(geo, mat);
    m.name = 'milkyway';
    m.renderOrder = RENDER_ORDER_MILKYWAY;
    m.frustumCulled = false;

    // ALIGNMENT. The map is an equirectangular sky on the galactic frame, the galactic centre at
    // the image centre. three's SphereGeometry puts uv.x = 0.5 on local +X, the image top on local
    // +Y, and (seen from inside) uv.x = 0.75 on local -Z.
    //
    // THE IMAGE TOP IS GALACTIC SOUTH. Until 2026-09-28 local +Y was the galactic NORTH pole, and the
    // sky was drawn turned 180 degrees about the line to the galactic centre: the band in the right
    // place, everything off it on the wrong side. Found by laying NASA SVS's Deep Star Maps 2020
    // (galactic frame, north up, longitude increasing to the left) beside the Solar System Scope
    // map: the same sky flipped top to bottom, the Large Magellanic Cloud above the plane. Through
    // the old basis the SSS map put the LMC at l = 79, b = +34; it is at l = 280.5, b = -32.9. With
    // local +Y on the south pole it lands at l = 281, b = -34, and so does the 4k map, which is built
    // in the same convention (scripts/build-textures.py). Still not an astrometric solution -- the
    // SSS map is a painting of the sky -- and the stars remain the measured layer.
    const gc = radecToVec(266.405, -28.936); // galactic centre, l=0 b=0, J2000
    const pole = radecToVec(192.85948, 27.12825); // galactic north pole, J2000
    const x = gc.clone().addScaledVector(pole, -gc.dot(pole)).normalize();
    const south = pole.clone().negate();
    const z = new THREE.Vector3().crossVectors(x, south).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, south, z));

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
      const rgb = starTint(bv);
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
    lines.visible = linesOn && skyOpacity > 0 && !detailLow;
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
      // The Sun's direction in the camera's own axes, for the glare (setSun below).
      if (sunAlpha >= 0 && camera && camera.isCamera) {
        const v = starUniforms.uSunView.value.copy(sunWorld).sub(camera.position);
        if (v.lengthSq() > 0) v.transformDirection(camera.matrixWorldInverse); else v.set(0, 0, 0);
      }
    },
    /**
     * Where the Sun is and how big, for the stars' fade near it (sunGlare). `position`: its place
     * in the scene; `radius`: its drawn radius, same units. Call before update(camera). null: no fade.
     */
    setSun(position, radius, camera) {
      if (!position || !(radius > 0) || !camera) { sunAlpha = -1; starUniforms.uSunView.value.set(0, 0, 0); starUniforms.uSunGlare.value.set(2, 3); return null; }
      sunWorld.copy(position);
      const d = sunWorld.distanceTo(camera.position);
      sunAlpha = d > radius ? Math.asin(radius / d) : Math.PI / 2;
      const g = sunGlare(sunAlpha);
      starUniforms.uSunGlare.value.set(Math.cos(g.innerRad), Math.cos(g.outerRad));
      return g;
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
      if (ln && ln.material) { ln.material.opacity = 0.25 * v; ln.visible = v > 0 && !detailLow && linesOn; }
      starUniforms.uGain.value = Math.min(1, Math.max(0, gain * v));
      if (state.stars) state.stars.visible = v > 0;
    },
    /** Whether the constellation figures are drawn at all: the sky view turns them on and off. */
    setLines(on) {
      linesOn = !!on;
      this.setSkyOpacity(skyOpacity);
    },
    /**
     * The texture tiers (scene/texturetiers.js, 2026-09-28): wear `tex` as the Milky Way, or null to
     * go back to the map it booted with. Returns the texture it was wearing; disposes nothing, since
     * the boot map is what a latched device goes back to. False while the panorama is not built yet.
     */
    setMilkyWayMap(tex) {
      const mw = state.milkyway;
      if (!mw || !mw.material) return false;
      if (!mw.userData.bootMap) mw.userData.bootMap = mw.material.map;
      const old = mw.material.map;
      mw.material.map = tex || mw.userData.bootMap;
      return old;
    },
    /**
     * Spec 0067: how long the shutter is open, as a factor on the Milky Way's tint (1 = Camera, the
     * sky as it always was). The stars are left alone: they are the measured layer, and a sixth-
     * magnitude limit is already what an eye sees.
     */
    setExposure(k) {
      milkyWayExposure = Math.min(2.2, Math.max(0, Number(k) || 0));
      const mw = state.milkyway;
      if (mw && mw.material) mw.material.color.setRGB(MILKY_WAY_TINT[0], MILKY_WAY_TINT[1], MILKY_WAY_TINT[2]).multiplyScalar(milkyWayExposure);
    },
    /** 'low' hides the Milky Way picture and the constellation lines (spec 0026 req 18); the stars stay. */
    setDetail(level) {
      detailLow = level === 'low';
      starUniforms.uGlow.value = detailLow ? 0 : 1;
      this.setSkyOpacity(skyOpacity);
    },
    /**
     * Spec 0034 req 2: the same star-stretch as scene/stars3d.js setStretch, on the naked-eye sky.
     * On a rung of the ladder registry/lod.yaml has usually faded this sky out already; it is
     * stretched anyway, so the two draws can never disagree during the crossfade between them.
     */
    setStretch(k, dir) {
      return writeStretch(starUniforms, k, dir);
    },
    stretch() {
      return starUniforms.uStretch.value;
    },
    /**
     * How large the stars' points are drawn, 1 = as ever. A point's size was always a drawing
     * choice (magToSize: a sixth-magnitude star one pixel, Sirius six); when the sky itself is
     * the subject the same stars are drawn larger, so a first-magnitude star reads as one.
     */
    setPointScale(k) {
      starUniforms.uScale.value = Math.min(3, Math.max(0.5, Number(k) || 1));
    },
    pointScale: () => starUniforms.uScale.value,
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
