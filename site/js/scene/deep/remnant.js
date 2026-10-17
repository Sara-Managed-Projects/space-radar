// scene/deep/remnant.js -- a supernova remnant as a SHELL in depth: the Crab and the Veil, and any remnant whose profile
// says `part: shell` (internal spec 0076 stage W3-c, internal #784; spec 0075 task 28). Fetched by scene/deep/deepsky.js
// when the remnant is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_remnant.mjs and scene/deep/dustsheet.js: skyFrame, offsetLy, uvOf, coverAt, shellOf, chordAt,
//   pathsAt, columnJs, samplesFor, sharesFor, paletteFor, stretchJs, pixelHash, SHAPE, UNDER_MEASURED, COPY_BLOCK.
//
// ONE MODULE FOR EVERY REMNANT. Nothing here names an object: registry/deepsky-heroes/<id>.yaml gives the shell (its
// centre, semi-axes, the direction and tilt of its long axis, its inner void, how much of the light fills it) and the
// light (a photograph the app already shows, its stars taken out by scripts/build_deep_sheets.py).
//
// ITS SHAPE IS PUBLISHED; ITS LIGHT IS THE PHOTOGRAPH'S. The shell is the space between two ellipsoids of the same
// centre and axes (the inner one `inner` times smaller). Each point of the photograph (a direction from the Sun) is a
// line through the shell; its light is spread EVENLY along the part of that line inside the shell (and a share
// `fill` of it through the whole ellipsoid, for a remnant whose middle glows, as the Crab's pulsar wind nebula does).
// So from our side the column is the photograph, exactly and at any number of samples (the emissivity is constant
// along our line of sight), and turned, the same light sits on the shell in depth: the Veil's rim, seen edge on from
// here, becomes a ring seen through; the Crab's filaments wrap round its long axis.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY). One mesh, one draw call, in the SKY
// FRAME (x west, y north, z toward the Sun, light-years about the record's place): the shell's bounding box, drawn by
// its back faces. The fragment finds where the view ray enters and leaves both ellipsoids analytically, and samples
// the light at n points along each stretch inside the shell (2 on T0 and under the latch, 4 at level 2, up to 8 at
// level 3), each at a static per-pixel offset (grain, never bands). Additive: it adds light and darkens nothing.
// The photograph is the truth from our side: the hero gives way to it by its own share (info.photo), and the point
// glow gives way to the hero (deepsky.js heroShares). As the remnant fills the view its light is scaled down (to
// SHAPE.adapt), the eye's adaptation, in the material.
//
// LOOKS. Nothing in it moves (a remnant does expand, a fifth of an arcsecond a year for the Crab: invisible). The light
// has the exposure's own stretch, as the photograph has; these photographs are FALSE COLOUR (narrow filters mapped to
// colours) and the profile and the card say so. Under Measured nothing changes: the shell is a reconstruction of
// measured numbers and the card says which.

import { stage } from '../stage.js';
import { exposureLook, EXPOSURES, drawnUnder } from '../exposure.js';

export const UNDER_MEASURED = { shell: 'same', motion: 'still' };
// The card's words block (copy/en.later.js r12Dust): its rows for each record this module or dustsheet.js draws.
export const COPY_BLOCK = 'r12Dust';

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial (ecliptic J2000)
const MAX_N = 8;           // samples a stretch at most (level 3)
// ONE table for the light and the samples: the GLSL below is written from it.
export const SHAPE = {
  adapt: 0.45,      // what is left of its light when it fills the view (the eye's adaptation), as orion.js
  shoulder: 1.0,    // a soft shoulder over 1: only an edge-on stretch of shell reaches it, never our line
  edgeIn: 0.88,     // a picture's own edge feathered from 0.88 to 0.995 of its half-size: their skies are black
  edgeOut: 0.995,   // already (the bake), and the Veil's rim reaches the picture's edge (orion.js feathers from 0.5)
  pad: 1.04,        // the bounding box a little larger than the ellipsoid
};
const f3 = (x) => Number(x).toFixed(4);
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (a) => [-a[0], -a[1], -a[2]];
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};

/** A static per-pixel offset in [0, 1): the GLSL's pixelHash (orion.js). Pure. */
export function pixelHash(x, y) {
  const fr = (v) => v - Math.floor(v);
  let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (orion.js skyFrame). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  return { west: neg(east), north, toward: neg(u) };
}

/** (x west, y north) in light-years of (ra, dec) from (ra0, dec0) at `distLy`: the gnomonic projection. Pure. */
export function offsetLy(ra0, dec0, ra, dec, distLy) {
  const a0 = ra0 * D2R, d0 = dec0 * D2R, a = ra * D2R, d = dec * D2R;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const xi = (Math.cos(d) * Math.sin(a - a0)) / cosc;
  const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
  return [-xi * distLy, eta * distLy];
}

/**
 * A picture's (u, v) as a linear map of the sky frame's (x west, y north) in light-years about (ra0, dec0): u = u0 +
 * x ux[0] + y uy[0], v = v0 + x ux[1] + y uy[1]. `pic`: {ra_deg, dec_deg, width_arcmin, height_arcmin, north_deg}
 * (north turned that far LEFT of the picture's up, scene/nebulae.js pictureBasis). scripts/build_deep_sheets.py
 * picture_uv is the same map. Pure.
 */
export function uvOf(pic, ra0, dec0, distLy) {
  const lyPerArcmin = distLy * Math.PI / (180 * 60);
  const [cx, cy] = offsetLy(ra0, dec0, pic.ra_deg, pic.dec_deg, distLy);
  const cw = cx / lyPerArcmin, cn = cy / lyPerArcmin;
  const r = (Number(pic.north_deg) || 0) * D2R, W = pic.width_arcmin, H = pic.height_arcmin;
  const ux = [Math.cos(r) / W / lyPerArcmin, Math.sin(r) / H / lyPerArcmin];
  const uy = [-Math.sin(r) / W / lyPerArcmin, Math.cos(r) / H / lyPerArcmin];
  const u0 = 0.5 + (-cw * Math.cos(r) + cn * Math.sin(r)) / W;
  const v0 = 0.5 + (-cw * Math.sin(r) - cn * Math.cos(r)) / H;
  const at = (x, y) => [u0 + x * ux[0] + y * uy[0], v0 + x * ux[1] + y * uy[1]];
  const det = ux[0] * uy[1] - uy[0] * ux[1];
  const xyOf = (u, v) => { const du = u - u0, dv = v - v0; return [(du * uy[1] - uy[0] * dv) / det, (ux[0] * dv - du * ux[1]) / det]; };
  return { u0, v0, ux, uy, at, xyOf, lyPerArcmin };
}

/**
 * How much of a picture's light is kept at (u, v): its edge feathered from edge[0] to edge[1] of its half-size, so no
 * frame is ever drawn (orion.js). A layer's profile may say its own `feather:` (a cloud that runs on past the picture
 * wants a wide one). Pure.
 */
export function coverAt(u, v, edge = [SHAPE.edgeIn, SHAPE.edgeOut]) {
  const qx = Math.abs(u * 2 - 1), qy = Math.abs(v * 2 - 1);
  const e = Math.cbrt(qx ** 3 + qy ** 3);
  const f = 1 - smooth(e, edge[0], edge[1]);
  return f * f;
}

/** A layer's `feather: [from, to]`, or the default. Pure. */
export function featherOf(layer) {
  const f = layer && Array.isArray(layer.feather) && layer.feather.length === 2 ? layer.feather.map(Number) : null;
  return f && f[0] >= 0 && f[1] > f[0] && f[1] <= 1 ? f : [SHAPE.edgeIn, SHAPE.edgeOut];
}

// ----------------------------------------------------------------------------------------- the shell

/**
 * The profile's shell in the sky frame: its centre, its axes (unit columns: the long axis, the one across it in the
 * sky, the third), semi-axes, the inner fraction, the fill share, the limb's floor, the light's uv map and the
 * bounding box. The long axis points to position angle pa (north through east) and lies incl degrees from our line
 * of sight, its `near` end toward us. Pure.
 */
export function shellOf(profile) {
  const P = profile || {};
  const fr = P.frame || {};
  const dist = Number(fr.distance_ly) || 1000;
  const ra0 = Number(fr.ra_deg) || 0, dec0 = Number(fr.dec_deg) || 0;
  const sh = part(P, 'shell'), li = part(P, 'light');
  const c = sh.centre ? offsetLy(ra0, dec0, sh.centre.ra_deg, sh.centre.dec_deg, dist) : [0, 0];
  const ax = Array.isArray(sh.axes_ly) && sh.axes_ly.length === 3 ? sh.axes_ly.map(Number) : [1, 1, 1];
  const pa = (Number(sh.axis && sh.axis.pa_deg) || 0) * D2R;
  const incl = (sh.axis && Number.isFinite(Number(sh.axis.incl_deg)) ? Number(sh.axis.incl_deg) : 90) * D2R;
  // position angle from north through east; x is WEST, so east is -x
  const a1 = norm([-Math.sin(pa) * Math.sin(incl), Math.cos(pa) * Math.sin(incl), Math.cos(incl)]);
  const a2 = norm([Math.cos(pa), Math.sin(pa), 0]);
  const a3 = cross(a1, a2);
  const inner = clamp(Number(sh.inner) || 0, 0, 0.98);
  const fill = clamp(Number(sh.fill) || 0, 0, 1);
  const thick = 2 * (1 - inner) * Math.min(...ax);
  const R = Math.max(...ax) * SHAPE.pad;
  const uv = li.picture ? uvOf(li.picture, ra0, dec0, dist) : uvOf({ ra_deg: ra0, dec_deg: dec0, width_arcmin: 10, height_arcmin: 10 }, ra0, dec0, dist);
  return {
    distanceLy: dist, centre: [c[0], c[1], 0], axes: [a1, a2, a3], semi: ax, inner, fill,
    limbFloor: clamp(Number(sh.limb_min) || 0.35, 0.05, 1) * thick, thick, uv, edge: featherOf(li),
    box: { min: [c[0] - R, c[1] - R, -R], max: [c[0] + R, c[1] + R, R] },
  };
}

/** Where the line p + t d meets the ellipsoid scaled by s: [t0, t1] or null (d need not be unit). Pure. */
export function chordAt(g, p, d, s = 1) {
  const q = [p[0] - g.centre[0], p[1] - g.centre[1], p[2] - g.centre[2]];
  const o = g.axes.map((a, i) => dot(q, a) / g.semi[i]);
  const e = g.axes.map((a, i) => dot(d, a) / g.semi[i]);
  const A = dot(e, e), B = dot(o, e), C = dot(o, o) - s * s;
  const h = B * B - A * C;
  if (!(A > 0) || h <= 0) return null;
  const r = Math.sqrt(h);
  return [(-B - r) / A, (-B + r) / A];
}

/** Along OUR line (the z axis) at sky point (x, y): the lengths inside the outer ellipsoid and inside the shell. Pure. */
export function pathsAt(g, x, y) {
  const o = chordAt(g, [x, y, 0], [0, 0, 1], 1);
  if (!o) return { outer: 0, shell: 0 };
  const i = chordAt(g, [x, y, 0], [0, 0, 1], g.inner);
  const outer = o[1] - o[0];
  return { outer, shell: outer - (i ? i[1] - i[0] : 0) };
}

/** The emissivity weights at a sky point: light per ly in the shell and in the fill, per unit of the light there. Pure. */
export function weightsAt(g, x, y) {
  const p = pathsAt(g, x, y);
  if (!(p.outer > 0)) return { shell: 0, fill: 0 };
  return { shell: (1 - g.fill) / Math.max(p.shell, g.limbFloor), fill: g.fill / p.outer };
}

/**
 * The light along ro + t rd (unit rd, sky frame, ly) from t = 0: n samples a stretch at offset j in [0, 1).
 * `light(u, v)` -> the stretched picture [r, g, b] (0 outside it). Before the share and the gain. FRAG's main(). Pure.
 */
export function columnJs(g, ro, rd, { n = 4, j = 0.5, light = () => [0, 0, 0] } = {}) {
  const C = [0, 0, 0];
  const o = chordAt(g, ro, rd, 1);
  if (!o || o[1] <= 0) return C;
  const t0 = Math.max(0, o[0]), t1 = o[1];
  const inn = g.inner > 0 ? chordAt(g, ro, rd, g.inner) : null;
  const add = (a, b, which) => {
    if (!(b > a)) return;
    const dt = (b - a) / n;
    for (let k = 0; k < n; k++) {
      const t = a + (k + j) * dt;
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const w = weightsAt(g, p[0], p[1]);
      const ww = which === 'shell' ? w.shell : w.fill;
      if (!(ww > 0)) continue;
      const [u, v] = g.uv.at(p[0], p[1]);
      const L = light(u, v);
      const cov = coverAt(u, v, g.edge);
      for (let c = 0; c < 3; c++) C[c] += L[c] * cov * ww * dt;
    }
  };
  if (inn && inn[1] > t0 && inn[0] < t1) {
    add(t0, Math.min(t1, Math.max(t0, inn[0])), 'shell');
    add(Math.max(t0, inn[1]), t1, 'shell');
  } else add(t0, t1, 'shell');
  if (g.fill > 0) add(t0, t1, 'fill');
  return C;
}

// ------------------------------------------------------------------------------- tiers and shares

/** Samples a stretch: 2 on T0 and under the latch (`cheap`), 4 at level 2, half the march's steps at 3 (4 to 8). Pure. */
export function samplesFor({ tier = 1, steps = 0, cheap = false, slow = false } = {}) {
  if (cheap || !(tier >= 1)) return 2;
  const n = Math.max(4, Math.min(MAX_N, Math.round((Number(steps) || 0) / 4)));
  return slow ? Math.max(2, Math.round(n / 2)) : n;
}

/** How much draws (orion.js sharesFor): the hero gives way to the photograph, and dims as it fills the view. Pure. */
export function sharesFor({ level = 0, rPx = 0, photo = 0, viewH = 800 } = {}) {
  const lv = clamp(Number(level) || 0, 0, 1);
  const ph = clamp(Number(photo) || 0, 0, 1);
  const fill = Number.isFinite(rPx) ? Math.max(0, Number(rPx) || 0) / Math.max(1, viewH / 2) : Infinity;
  const light = 1 - (1 - SHAPE.adapt) * (Number.isFinite(fill) ? smooth(fill, 0.7, 2) : 1);
  return { gas: lv * (1 - ph), light };
}

/** The exposure (scene/exposure.js) from the coordinator's gain: the photograph's stretch (orion.js paletteFor). Pure. */
export function paletteFor(gain = 1, profile = null) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  const enh = !!(profile && profile.colours && profile.colours.enhanced);
  return { mode, enhanced: mode === 'deep' && enh, gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation };
}

/** The GLSL's stretchLight: the exposure's gamma and saturation on a display value, as scene/nebulae.js does. Pure. */
export function stretchJs(t, gamma = 1, sat = 1) {
  const c = t.map((x) => Math.max(0, x) ** gamma);
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const grey = [l * 0.86, l * 0.96, l];
  return c.map((x, i) => grey[i] + (x - grey[i]) * sat);
}

// ------------------------------------------------------------------------------------------- the GLSL

/** Shared with scene/deep/dustsheet.js: the logarithmic depth, the per-pixel hash, the light's stretch and edge. */
export const COMMON_GLSL = /* glsl */ `
float pixelHash( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
uniform float uGamma;      // the exposure's stretch, as scene/nebulae.js gives the photograph
uniform float uSat;
vec3 stretchLight( vec3 t ) {
  vec3 c = uGamma == 1.0 ? max( t, vec3( 0.0 ) ) : pow( max( t, vec3( 0.0 ) ), vec3( uGamma ) );   // Camera: no pow
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uSat );
}
float coverAt( vec2 uv, vec2 edge ) {
  vec2 q = abs( uv * 2.0 - 1.0 );
  float e = pow( pow( q.x, 3.0 ) + pow( q.y, 3.0 ), 1.0 / 3.0 );
  float f = 1.0 - smoothstep( edge.x, edge.y, e );
  return f * f;
}
`;

export const VERT = /* glsl */ `
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;          // the camera in the sky frame, ly (CPU, float64, each frame)
uniform vec3 uCentre;
uniform mat3 uAxes;         // columns: the shell's axes, unit
uniform vec3 uSemi;         // semi-axes, ly
uniform float uInner;
uniform float uFill;
uniform float uLimbFloor;
uniform vec2 uUv0;
uniform vec2 uUx;
uniform vec2 uUy;
uniform sampler2D uLight;   // the photograph without its stars (display values, gasmat.js COLOUR_POLICY)
uniform vec2 uEdge;         // the picture's edge feather (coverAt)
uniform int uN;
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
${COMMON_GLSL}
#include <common>
#include <logdepthbuf_pars_fragment>

// chordAt: where p + t d meets the ellipsoid scaled by s; x = t0, y = t1 (y < x: no meeting)
vec2 chordAt( vec3 p, vec3 d, float s ) {
  vec3 o = ( ( p - uCentre ) * uAxes ) / uSemi;   // the rows of uAxes^T: each axis's component
  vec3 e = ( d * uAxes ) / uSemi;
  float A = dot( e, e ), B = dot( o, e ), C = dot( o, o ) - s * s;
  float h = B * B - A * C;
  if ( A <= 0.0 || h <= 0.0 ) return vec2( 1.0, 0.0 );
  float r = sqrt( h );
  return vec2( -B - r, -B + r ) / A;
}
// weightsAt: per unit of the light, its emissivity in the shell (x) and the fill (y) at sky point xy
vec2 weightsAt( vec2 xy ) {
  vec2 o = chordAt( vec3( xy, 0.0 ), vec3( 0.0, 0.0, 1.0 ), 1.0 );
  float outer = o.y - o.x;
  if ( outer <= 0.0 ) return vec2( 0.0 );
  vec2 i = chordAt( vec3( xy, 0.0 ), vec3( 0.0, 0.0, 1.0 ), uInner );
  float shell = outer - max( 0.0, i.y - i.x );
  return vec2( ( 1.0 - uFill ) / max( shell, uLimbFloor ), uFill / outer );
}
vec3 lightAt( vec2 xy ) {
  vec2 uv = uUv0 + xy.x * uUx + xy.y * uUy;
  return stretchLight( texture2D( uLight, uv ).rgb ) * coverAt( uv, uEdge );
}
vec3 stretchSum( vec3 ro, vec3 rd, float a, float b, float j, int which ) {
  vec3 C = vec3( 0.0 );
  if ( b <= a ) return C;
  float dt = ( b - a ) / float( uN );
  for ( int k = 0; k < MAX_N; k++ ) {
    if ( k >= uN ) break;
    vec3 p = ro + rd * ( a + ( float( k ) + j ) * dt );
    vec2 w = weightsAt( p.xy );
    float ww = which == 0 ? w.x : w.y;
    if ( ww > 0.0 ) C += lightAt( p.xy ) * ww * dt;
  }
  return C;
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  vec2 o = chordAt( ro, rd, 1.0 );
  if ( o.y <= o.x || o.y <= 0.0 ) discard;
  float t0 = max( 0.0, o.x ), t1 = o.y;
  float j = pixelHash( gl_FragCoord.xy );
  vec3 C = vec3( 0.0 );
  vec2 i = uInner > 0.0 ? chordAt( ro, rd, uInner ) : vec2( 1.0, 0.0 );
  if ( i.y > i.x && i.y > t0 && i.x < t1 ) {
    C += stretchSum( ro, rd, t0, min( t1, max( t0, i.x ) ), j, 0 );
    C += stretchSum( ro, rd, max( t0, i.y ), t1, j, 0 );
  } else C += stretchSum( ro, rd, t0, t1, j, 0 );
  if ( uFill > 0.0 ) C += stretchSum( ro, rd, t0, t1, fract( j + 0.5 ), 1 );
  vec3 col = C * uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, 1.0 );   // additive (SrcAlpha, One): alpha 1
}
`;

/** The shader sources, for tests/test_remnant.mjs (columnJs mirrors FRAG). */
export const SHADERS = { vertex: VERT, frag: FRAG, common: COMMON_GLSL };

// -------------------------------------------------------------------------------------- the hero

/** The sky frame's basis in the scene, at the record (orion.js placeSky): writes `group.matrix`. */
export function placeSkyGroup(THREE, group, rec) {
  if (!rec || !rec.pos) return false;
  const f = skyFrame(rec.pos);
  const c = new THREE.Vector3(), tip = new THREE.Vector3();
  if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return false;
  const k = 1e12;
  const dir = (v) => {
    stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
    return tip.clone().sub(c).normalize();
  };
  const x = dir(f.west), y = dir(f.north);
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  y.crossVectors(z, x).normalize();
  group.matrix.makeBasis(x, y, z);
  group.matrixWorldNeedsUpdate = true;
  return true;
}

/** A display-valued texture from a file next to this module (gasmat.js COLOUR_POLICY: no decode). */
export function loadMap(THREE, url, done) {
  const t = new THREE.TextureLoader().load(new URL(url, import.meta.url).href, () => done('ready'), undefined, (e) => { done('failed'); console.warn('deep: a map did not load', url, e); });
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/** The camera in the sky frame (ly), from the hero group's and the sky group's matrices. */
export function cameraInSky(group, sky, camera, out, _inv, _id) {
  if (group.parent) group.parent.updateWorldMatrix(true, false);
  _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
  return out.copy(camera.position).applyMatrix4(_inv);
}

const fileUrl = (path) => `../../../${String(path || '').replace(/^site\//, '')}`;

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const id = profile.id || 'remnant';
  const group = new THREE.Group();
  group.name = `deep-hero-${id}`;
  const g = shellOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;

  const browser = typeof document !== 'undefined';
  let lightTex = null, lightState = 'none';
  const li = part(profile, 'light');
  if (browser && THREE.TextureLoader && li.file) {
    lightState = 'loading';
    lightTex = loadMap(THREE, fileUrl(li.file), (st) => { lightState = st; });
  }
  const pal0 = paletteFor(1, profile);
  const size = g.box.max.map((v, i) => v - g.box.min[i]);
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geo.translate(...g.box.max.map((v, i) => (v + g.box.min[i]) / 2));
  const axes = new THREE.Matrix3().set(
    g.axes[0][0], g.axes[1][0], g.axes[2][0],
    g.axes[0][1], g.axes[1][1], g.axes[2][1],
    g.axes[0][2], g.axes[1][2], g.axes[2][2],
  );
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 50) }, uCentre: { value: new THREE.Vector3(...g.centre) }, uAxes: { value: axes },
      uSemi: { value: new THREE.Vector3(...g.semi) }, uInner: { value: g.inner }, uFill: { value: g.fill }, uLimbFloor: { value: g.limbFloor },
      uUv0: { value: new THREE.Vector2(g.uv.u0, g.uv.v0) }, uUx: { value: new THREE.Vector2(...g.uv.ux) }, uUy: { value: new THREE.Vector2(...g.uv.uy) },
      uLight: { value: lightTex }, uEdge: { value: new THREE.Vector2(...g.edge) }, uN: { value: 4 }, uShare: { value: 0 }, uGain: { value: 1 }, uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
    },
    // gasmat.js COLOUR_POLICY: display values, opaque list, no depth write; additive light
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  });
  mat.name = 'deep-remnant-shell';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  sky.add(mesh);

  let level = 0, levelShare = 0, samples = 4, tierNow = 1, slowMs = 0, cheap = false, palette = { ...pal0, gainIn: 1 }, last = { gas: 0, light: 1, photo: 0 };
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3();
  return {
    group,
    levels: [2, 3],
    // The cheap path (2 samples a stretch) costs about what the holder it replaces does (internal spec 0076 W1-a's hook).
    latchSafe: true,
    card: { copy: COPY_BLOCK, drawn: { [profile.record]: (profile.drawn || ['reconstruction']).slice() } },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSkyGroup(THREE, sky, env.record); }
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      tierNow = tier;
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      cheap = !(tier >= 1) || !!q.latched;
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      const dt = Number(info.dtMs) || 0;
      if (!(info.frozen || info.reduced)) slowMs = slowMs * 0.9 + dt * 0.1;
      samples = samplesFor({ tier, steps: level >= 3 ? info.steps : 0, cheap, slow: slowMs > 24 });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) { palette = { ...paletteFor(gain, profile), gainIn: gain }; mat.uniforms.uGamma.value = palette.gamma; mat.uniforms.uSat.value = palette.saturation; }
      const keep = drawnUnder(info.look || 'film', UNDER_MEASURED.shell) ? 1 : 0;
      const u = mat.uniforms;
      u.uShare.value = lightState === 'ready' ? sh.gas * keep : 0;
      u.uN.value = samples;
      u.uGain.value = palette.gain * sh.light;
      mesh.visible = u.uShare.value > 0.002;
      if (info.camera) u.uCam.value.copy(cameraInSky(group, sky, info.camera, _cam, _inv, _id));
    },
    ready: () => lightState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, light: lightState, path: cheap ? 'cheap' : 'full',
      samples, tier: tierNow, palette: palette.mode, meshes: 1, textures: lightTex ? 1 : 0,
      bytes: geo.getAttribute('position').array.byteLength + (lightTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      geo.dispose(); mat.dispose();
      if (lightTex) lightTex.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}

