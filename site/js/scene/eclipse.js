// scene/eclipse.js -- how much of the Sun's disc a body covers, seen from one point (spec 0037).
//
// Contract (pure, no DOM, no three.js, importable in node):
//   obscuration(pKm, sunKm, occluderKm, {sunRadiusKm, moonRadiusKm}) -> 0..1
//   discOverlap(x, r)                     -> 0..1, the overlap of two discs in the Sun's radii
//   surfaceObscuration(pKm, centreKm, sunKm, occluderKm, radii) -> 0 where the Sun is set
//   eclipseLikely(sunKm, moonKm, kind)    -> boolean, from the Earth's centre: worth the shader?
//   ECLIPSE_GLSL                          -> the same formula as GLSL, spliced into two shaders
//   SUN_RADIUS_KM, MOON_RADIUS_KM, EARTH_SHADOW_RADIUS_KM, UMBRA_DEPTH
//
// WHY A FORMULA AND NOT A CONE. Until 2026-09-23 the map drew a true terminator from the Sun's
// position and no Moon shadow at all. A cone mesh or a decal would be a picture of a shadow placed
// where somebody decided; this is the Sun's disc and the Moon's disc as seen from each fragment of
// the Earth, from the same ephemeris the library's eclipse search uses (data/events.js, spec 0031),
// so the dark spot lands where the library says greatest eclipse is -- to the library's precision,
// about a minute -- and the penumbra is simply what the overlap is everywhere else.
//
// ONE FORMULA, TWO LANGUAGES. The GLSL below and the JS here are the same arithmetic line for line.
// tests/test_eclipse.mjs translates the GLSL's scalar function to JS mechanically and compares it
// with discOverlap() at hundreds of points, and pins the constants in both.
//
// THE ANGLE IS atan2(|a x b|, a . b), NOT acos(a . b). In float32 the cosine of 0.27 degrees is
// 0.99998889 and the next float is 6e-8 away, which makes acos() jitter by 1.3e-5 rad -- 3 % of the
// umbra's width at the 2027-08-02 eclipse. The cross product keeps its precision at small angles.
//
// WORKING IN THE SUN'S RADII. Both angular radii are ~0.0047 rad; their squares are ~2e-5 and the
// lens formula subtracts them. Dividing through by the Sun's angular radius first keeps every
// number near 1 in float32, which is what the GPU has.

/** The Sun's nominal radius, IAU 2015 B3 -- the value Astronomy Engine's eclipse search uses. */
export const SUN_RADIUS_KM = 695700;

/** The Moon's mean radius (registry/worlds.yaml; Astronomy Engine's MOON_MEAN_RADIUS_KM). */
export const MOON_RADIUS_KM = 1737.4;

/**
 * The Earth as an occluder for a LUNAR eclipse: its mean radius plus 88 km of atmosphere, which is
 * Astronomy Engine's EARTH_ECLIPSE_RADIUS_KM (astronomy.js, read 2026-09-23). The air bends light
 * into the shadow and makes it about 2 % bigger than the rock alone would; using the library's own
 * number means the shadow on the drawn Moon starts and ends when the library's eclipse does.
 */
export const EARTH_SHADOW_RADIUS_KM = 6371 + 88;

/**
 * How far the day term falls under a covered Sun: 1 - UMBRA_DEPTH x obscuration. Requirement 1 of
 * spec 0037: "umbra is where it reaches 1 and the day term goes to the night term", so under the
 * umbra the ground is lit as the night side is and the night map's cities come up. The design's
 * 0.97 left 3 % of a desert's daylight, which measured (42, 33, 23) at Luxor on 2027-08-02 in
 * headless Chrome (2026-09-23), against the spec's own "under (20, 20, 24)". From orbit the umbra
 * is the darkest thing on the day side, and 1.0 draws it so.
 */
export const UMBRA_DEPTH = 1.0;

/**
 * The angle, from the Earth's centre, between the Sun and the Moon under which an eclipse CAN be
 * happening somewhere, in degrees. Arithmetic, not a guess (2026-09-23): from the surface the Moon
 * is displaced by up to its horizontal parallax, asin(6378 / 356 500 km at perigee) = 1.03 deg, and
 * the two discs touch at the sum of their radii, at most 0.272 + 0.279 = 0.55 deg -- 1.58 deg in
 * all. The spec's 1.5 would miss the first minutes of a partial eclipse on the limb; 1.7 does not.
 */
export const SOLAR_GATE_DEG = 1.7;

/**
 * The same for the Moon in the Earth's shadow, measured between the Sun and the ANTI-Moon: the
 * penumbra's radius at the Moon's distance is the Moon's parallax plus the Sun's radius, 1.03 +
 * 0.27 deg, grown 2 % by the atmosphere, plus the Moon's own 0.28 deg radius: 1.61 deg.
 */
export const LUNAR_GATE_DEG = 1.8;

const DEG = Math.PI / 180;

/**
 * The fraction of disc A (radius 1) covered by disc B (radius r) with centres x apart, all in
 * units of A's radius. Flat discs: at 0.27 degrees the sphere's curvature changes the answer by
 * under 1e-5 of itself (spec 0037 design §1).
 */
export function discOverlap(x, r) {
  if (!(x >= 0) || !(r > 0)) return 0;
  if (x >= 1 + r) return 0;
  if (x <= Math.abs(1 - r)) return Math.min(1, r * r); // one inside the other; annular when r < 1
  const c1 = Math.min(1, Math.max(-1, (x * x + 1 - r * r) / (2 * x)));
  const c2 = Math.min(1, Math.max(-1, (x * x + r * r - 1) / (2 * x * r)));
  const k = Math.max(0, (-x + 1 + r) * (x + 1 - r) * (x - 1 + r) * (x + 1 + r));
  const lens = Math.acos(c1) + r * r * Math.acos(c2) - 0.5 * Math.sqrt(k);
  return Math.min(1, Math.max(0, lens / Math.PI));
}

const sub = (a, b) => [a.x - b.x, a.y - b.y, a.z - b.z];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * The fraction of the Sun's disc the occluder covers, seen from pKm. All three positions in km in
 * one frame (any origin, any axes). Pure geometry: whether the Sun is above pKm's horizon is the
 * caller's question (the shader asks it with the day-side test).
 *
 * @param {{x,y,z}} pKm         the observer
 * @param {{x,y,z}} sunKm       the Sun's centre
 * @param {{x,y,z}} occluderKm  the Moon's centre, or the Earth's for a point on the Moon
 * @param {{sunRadiusKm?: number, moonRadiusKm?: number}} [radii]  moonRadiusKm is the OCCLUDER's
 */
export function obscuration(pKm, sunKm, occluderKm, { sunRadiusKm = SUN_RADIUS_KM, moonRadiusKm = MOON_RADIUS_KM } = {}) {
  if (!pKm || !sunKm || !occluderKm) return 0;
  const toS = sub(sunKm, pKm);
  const toM = sub(occluderKm, pKm);
  const ds = len(toS);
  const dm = len(toM);
  if (!(ds > sunRadiusKm) || !(dm > moonRadiusKm)) return 0;
  const angS = Math.asin(sunRadiusKm / ds);
  const angM = Math.asin(moonRadiusKm / dm);
  const theta = Math.atan2(len(cross(toS, toM)), dot(toS, toM));
  return discOverlap(theta / angS, angM / angS);
}

/**
 * obscuration() for a point on a body's surface, 0 where the Sun is below its horizon: the pure
 * twin of the shaders' day-side test (`sunDot > 0.0`). Without it the geometry alone answers for
 * the far side too -- at the 2027-08-02 peak the antipode of Luxor has the Sun and the Moon lined
 * up through the Earth and would read 0.37 (measured 2026-09-23), a shadow nobody there can see.
 */
export function surfaceObscuration(pKm, centreKm, sunKm, occluderKm, radii) {
  if (!pKm || !centreKm || !sunKm) return 0;
  const up = sub(pKm, centreKm);
  if (!(dot(up, sub(sunKm, pKm)) > 0)) return 0;
  return obscuration(pKm, sunKm, occluderKm, radii);
}

function angleDeg(a, b) {
  const va = [a.x, a.y, a.z];
  const vb = [b.x, b.y, b.z];
  return Math.atan2(len(cross(va, vb)), dot(va, vb)) / DEG;
}

/**
 * Could an eclipse be happening anywhere right now? Once a frame, in JS, so the shader's branch is
 * a uniform the GPU skips for the 99.9 % of the time there is none (spec 0037 req 3). Both
 * vectors are FROM THE EARTH'S CENTRE, in km, in one frame.
 *
 * @param {{x,y,z}} sunKm
 * @param {{x,y,z}} moonKm
 * @param {'solar'|'lunar'} kind
 */
export function eclipseLikely(sunKm, moonKm, kind = 'solar') {
  if (!sunKm || !moonKm) return false;
  if (!(Math.hypot(sunKm.x, sunKm.y, sunKm.z) > 0) || !(Math.hypot(moonKm.x, moonKm.y, moonKm.z) > 0)) return false;
  if (kind === 'lunar') {
    return angleDeg(sunKm, { x: -moonKm.x, y: -moonKm.y, z: -moonKm.z }) < LUNAR_GATE_DEG;
  }
  return angleDeg(sunKm, moonKm) < SOLAR_GATE_DEG;
}

// The numbers go in as GLSL literals from the JS constants, so the two cannot drift apart;
// tests/test_eclipse.mjs still reads them back out of the string, because a template that stopped
// interpolating would compile and draw nothing.
const glslFloat = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/**
 * The GLSL twin. `eclDiscOverlap` is discOverlap() above, statement for statement, in scalars
 * only so the test can translate and run it; `eclObscuration` is obscuration(). Prefixed so the
 * names cannot meet anything three.js splices into the same program.
 */
export const ECLIPSE_GLSL = /* glsl */`
const float SUN_RADIUS_KM = ${glslFloat(SUN_RADIUS_KM)};
const float MOON_RADIUS_KM = ${glslFloat(MOON_RADIUS_KM)};
const float EARTH_SHADOW_RADIUS_KM = ${glslFloat(EARTH_SHADOW_RADIUS_KM)};
const float UMBRA_DEPTH = ${glslFloat(UMBRA_DEPTH)};

float eclDiscOverlap( float x, float r ) {
  if ( x >= 1.0 + r ) return 0.0;
  if ( x <= abs( 1.0 - r ) ) return min( 1.0, r * r );
  float c1 = clamp( ( x * x + 1.0 - r * r ) / ( 2.0 * x ), -1.0, 1.0 );
  float c2 = clamp( ( x * x + r * r - 1.0 ) / ( 2.0 * x * r ), -1.0, 1.0 );
  float k = max( 0.0, ( -x + 1.0 + r ) * ( x + 1.0 - r ) * ( x - 1.0 + r ) * ( x + 1.0 + r ) );
  float lens = acos( c1 ) + r * r * acos( c2 ) - 0.5 * sqrt( k );
  return clamp( lens / 3.14159265, 0.0, 1.0 );
}

float eclObscuration( vec3 p, vec3 s, vec3 m, float rs, float rm ) {
  vec3 toS = s - p;
  vec3 toM = m - p;
  float angS = asin( clamp( rs / length( toS ), 0.0, 1.0 ) );
  float angM = asin( clamp( rm / length( toM ), 0.0, 1.0 ) );
  float theta = atan( length( cross( toS, toM ) ), dot( toS, toM ) );
  return eclDiscOverlap( theta / angS, angM / angS );
}
`;
