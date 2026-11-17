// scene/deep/sn1987a.js -- SN 1987A and the three rings round it, at their measured size and tilt (internal #429, the
// deep-space review of 2026-11-16, idea 13). Fetched by scene/deep/deepsky.js when the remnant is near (scene/deep/heroes.js);
// never at boot. It stands in the Large Magellanic Cloud 20 arcminutes from the Tarantula: the LMC's hero draws the galaxy, this
// draws the supernova at its own distance. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_sn1987a.mjs: ringsOf, ringAxis, ringPoints, angularRadiusArcsec, scaleOf, lookFor, SHAPE, UNDER_MEASURED,
// COPY_BLOCK, DRAWN.
//
// WHAT IS MEASURED. The equatorial ring's size (Panagia 2003: 6.23e17 cm, 808 mas, so 51.4 kpc), its tilt (about 43 degrees
// from face-on, the northern edge nearest us), and the two outer rings' sizes, axis ratios, offsets and heights from the
// supernova as Sugerman et al. 2005 (ApJS 159, 60) fit them to the light echoes (their Table 3), with the outer rings' tilts
// from Tziamtzis et al. 2011 (A&A 527, A35: about 45 and 38 degrees). Sugerman's lengths are light-years at the 50 kpc they
// adopt; what was measured is the ANGLE, so each length is scaled by the record's distance over 50 kpc and the rings keep their
// angular size (the equatorial ring: 0.82 arcsecond, Panagia's 0.808 +/- 0.017).
//
// WHAT IS NOT. Each ring is a plane ellipse (the paper's own approximation; the southern ring is not exactly one), and the
// points that mark it, their count, size and colour, are a display value. The rings' bright knots, the debris inside, the
// larger nebulae and the ring's slow growth (about 10 km/s: 0.005 % a year) are not drawn.
//
// HOW IT IS DRAWN. One draw call, additive: every ring's points and a mark where the star was, each a soft disc of the
// ring's own width (never smaller than a point on the screen, its light kept). The sky frame (x west, y north, z toward the Sun)
// is placed at the record, in light-years.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky, axisOnSky } from './skyplace.js';
import '../../copy/en.deepdata.js'; // the card's words (deepSn1987a), fetched with the hero

export const COPY_BLOCK = 'deepSn1987a';
export const DRAWN = { 'dso-sn-1987a': ['reconstruction', 'illustration'] };
export const UNDER_MEASURED = { rings: 'same' };
export const SHAPE = {
  minPx: 1.6,   // a point is never drawn smaller than this (its light is kept: thinner, not gone)
  markPx: 5.0,  // the mark where the star was, CSS px: a point of one size on the screen
};
const D2R = Math.PI / 180;
const ARCSEC = 206264.806247; // arcseconds in a radian
const KPC_LY = 3261.5637769;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const comb = (...terms) => [0, 1, 2].map((i) => terms.reduce((s, [k, v]) => s + k * v[i], 0));

/** The profile's ring layers: the rows with `kind: ring`. Pure. */
export const ringsOf = (profile) => ((profile && profile.layers) || []).filter((l) => l && l.kind === 'ring');
/** The factor from the paper's light-years (at `frame.at_kpc`) to the record's: the distance over the distance they adopt. Pure. */
export const scaleOf = (profile) => Number(profile.frame.distance_ly) / (Number(profile.frame.at_kpc) * KPC_LY);
/** A ring's semi-major axis on the sky, arcseconds: its length in the paper over the paper's distance. The same at any distance. Pure. */
export const angularRadiusArcsec = (profile, part) => {
  const r = ringsOf(profile).find((l) => l.part === part) || {};
  return Number(r.a_ly) / (Number(profile.frame.at_kpc) * KPC_LY) * ARCSEC;
};

/**
 * A ring's axis and in-plane axes in the sky frame (west, north, toward the Sun): `axis` points to the far end, `incl` degrees
 * from our line of sight and toward position angle `paFar`; `u1` is the in-plane direction nearest west, `u2` nearest north.
 * Pure.
 */
export function ringAxis(inclDeg, paFar) {
  const axis = axisOnSky(inclDeg, paFar);
  const north = [0, 1, 0];
  const u2 = norm(comb([1, north], [-dot(north, axis), axis]));
  const u1 = cross(axis, u2);
  return { axis, u1, u2 };
}

/**
 * A ring's `n` points in light-years about the supernova, in the sky frame, as Float32Array(3n). The ring's centre is its offset
 * west and north (x0, y0) and its height along the equatorial ring's axis; the ring itself is the ellipse (semi-major a, axis
 * ratio b/a, major axis at position angle `pa` from the in-plane north toward east) in the plane square to its own axis. Pure.
 */
export function ringPoints(profile, ring, n = ring.points) {
  const k = scaleOf(profile), paFar = Number(profile.frame.axis_far_pa_deg);
  const er = ringsOf(profile)[0];
  const base = ringAxis(Number(er.incl_deg), paFar);          // the supernova's axis: where the centres are measured
  const own = ringAxis(Number(ring.incl_deg), paFar);         // the ring's own plane
  const centre = comb([Number(ring.x0_ly) * k, base.u1], [Number(ring.y0_ly) * k, base.u2], [Number(ring.height_ly) * k, base.axis]);
  const phi = Number(ring.pa_deg) * D2R;
  const major = comb([Math.cos(phi), own.u2], [-Math.sin(phi), own.u1]); // position angle from north toward east (east is -west)
  const minor = cross(own.axis, major);
  const a = Number(ring.a_ly) * k, b = a * Number(ring.ratio_ba);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI, c = a * Math.cos(t), s = b * Math.sin(t);
    for (let j = 0; j < 3; j++) out[3 * i + j] = centre[j] + c * major[j] + s * minor[j];
  }
  return out;
}

/** The look's switches: nothing here is generated, so the Measured look keeps it all. Pure. */
export function lookFor(look) {
  return { rings: drawnUnder(look || 'film', UNDER_MEASURED.rings) ? 1 : 0 };
}

const VERT = /* glsl */`
attribute vec3 aColour;
attribute vec2 aLook;      // x: the symbol's width, light-years (0: a mark of one size on the screen); y: its light
uniform float uPxPerRad;   // CSS px a radian on the screen
uniform float uPixelRatio;
uniform float uShare;
varying vec4 vColour;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float d = max( -mv.z, 1e-9 );
  float unit = length( modelViewMatrix[0].xyz ); // scene units in a light-year
  float ideal = aLook.x > 0.0 ? aLook.x * unit / d * uPxPerRad : ${SHAPE.markPx.toFixed(1)};
  float size = max( ideal, ${SHAPE.minPx.toFixed(1)} );
  // a point held at its smallest size keeps its light: thinner, not brighter
  float keep = ( ideal / size ) * ( ideal / size );
  vColour = vec4( aColour, aLook.y * keep * uShare );
  gl_PointSize = mv.z < 0.0 ? size * uPixelRatio : 0.0;
}`;
const FRAG = /* glsl */`
uniform float uGain;
varying vec4 vColour;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( q, q );
  if ( r2 > 1.0 ) discard;
  float a = exp( -3.2 * r2 ) * ( 1.0 - r2 );
  gl_FragColor = vec4( vColour.rgb * vColour.a * a * uGain, 1.0 );
}`;
/** The shader sources, for tests/test_sn1987a.mjs. */
export const SHADERS = { vertex: VERT, frag: FRAG };

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-sn1987a';
  const sky = new THREE.Group();          // the sky frame in the scene: a rotation; the points are light-years
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  const distLy = Number((profile.frame || {}).distance_ly) || 167600;
  const lyPerArcsec = distLy / ARCSEC;
  const rings = ringsOf(profile);
  const mark = ((profile.layers || []).find((l) => l && l.kind === 'mark')) || { colour: [1, 1, 1], alpha: 1 };
  const total = rings.reduce((s, r) => s + Number(r.points), 0) + 1;
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3), look = new Float32Array(total * 2);
  let at = 0;
  const counts = {};
  for (const r of rings) {
    const p = ringPoints(profile, r);
    pos.set(p, at * 3);
    for (let i = 0; i < r.points; i++) { col.set(r.colour, (at + i) * 3); look[(at + i) * 2] = Number(r.symbol_arcsec) * lyPerArcsec; look[(at + i) * 2 + 1] = Number(r.alpha); }
    counts[r.part] = r.points;
    at += r.points;
  }
  col.set(mark.colour, at * 3); look[at * 2] = 0; look[at * 2 + 1] = Number(mark.alpha); counts.supernova = 1; // the mark sits at the origin
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aLook', new THREE.BufferAttribute(look, 2));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uPxPerRad: { value: 900 }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
    // gasmat.js COLOUR_POLICY: display values, no depth write; additive light
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  });
  mat.name = 'deep-sn1987a-rings';
  const points = new THREE.Points(geo, mat);
  points.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  points.frustumCulled = false;
  points.renderOrder = -1;
  sky.add(points);

  let level = 0, levelShare = 0;
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // points: no march
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) {
        basisFor = stage.worldId;
        placeSky(THREE, sky, env.record, stage);
      }
      const lk = lookFor(info.look);
      const u = mat.uniforms;
      u.uShare.value = levelShare * lk.rings;
      u.uGain.value = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.8);
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      if (info.camera) u.uPxPerRad.value = (info.camera.projectionMatrix.elements[5] || 1) * vh / 2;
      u.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      points.visible = u.uShare.value > 0.002;
    },
    ready: () => true,
    stats: () => ({ level, share: Math.round(levelShare * 100) / 100, meshes: 1, textures: 0, points: total, parts: { ...counts }, bytes: total * 28 }),
    dispose() {
      geo.dispose(); mat.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
