// scene/airtint.js -- the red of the light on a craft at orbital sunrise and sunset (release 1.2.0
// stage W2-a, internal spec 0076, internal #917).
//
// Contract: AIR_REDDENING, setAirReddening(on), airReddeningOn(), airTransmission(km),
// sunlightOn(sat, earth, sun, radius, radiusKm), AIR_TINT_GLSL.
//
// WHY ITS OWN FILE. scene/shadow.js is in the boot graph (the cards' and the glyphs' light), and
// this is read only where a model is lit: scene/models.js imports it, and scene/models.js is fetched
// when a record wants geometry (tests/test_boot_diet.mjs). So the first visit carries none of it.
import * as THREE from '../../vendor/three.module.min.js';
import { earthShadowLit, EARTH_RADIUS_KM } from './shadow.js';

export { EARTH_RADIUS_KM };
const _d = new THREE.Vector3();
const _s = new THREE.Vector3();


/**
 * THE RED OF THE PENUMBRA (release 1.2.0 stage W2-a, internal #917). At orbital sunrise and sunset
 * the sunlight that reaches a craft has come through the Earth's air edge-on, as a sunset's does,
 * and is red: the station turns copper, then orange, then white, over some ten seconds, and its
 * arrays' glint comes back in the same colours. MODELLED, and only this: Rayleigh scattering by a
 * single exponential atmosphere along the straight line to the Sun's centre. No refraction (which
 * bends the light round the limb and flattens the Sun), no ozone, no aerosols, no clouds: real
 * sunrises from orbit are browner and more banded, and the card does not claim more.
 *
 *   tauRgb     the Rayleigh optical depth of the whole vertical column at sea level at 650, 550
 *              and 450 nm: 0.008569 l^-4 (1 + 0.0113 l^-2 + 0.00013 l^-4), l in micrometres
 *              (Hansen and Travis 1974, Space Science Reviews 16, 527, their formula for the
 *              standard atmosphere) -- 0.0493, 0.0973, 0.2213.
 *   scaleKm    the density's scale height.
 *   airmass    a straight line that grazes the ball at height h crosses exp(-h / H) sqrt(2 pi R / H)
 *              vertical columns (both halves of the chord; R 6371 km, H 8 km): 70.7 at the ground.
 *   topKm      above this the line is in sunlight unreddened (0.5 % or less in blue).
 */
export const AIR_REDDENING = { tauRgb: [0.0493, 0.0973, 0.2213], scaleKm: 8, airmass: 70.7, topKm: 60 };
/** On by default; a probe switches it off for the picture before (tests/probes/look/r12-nearby.js). */
let airReddening = true;
export function setAirReddening(on) { airReddening = !!on; return airReddening; }
export function airReddeningOn() { return airReddening; }

/**
 * Pure: the share of the Sun's light in red, green and blue that crosses the air along a line
 * grazing the Earth `tangentKm` above the ground (AIR_REDDENING). 0 below the ground: the Earth is
 * in the way, which the geometric shadow already says.
 */
export function airTransmission(tangentKm) {
  if (!(tangentKm >= 0)) return [0, 0, 0];
  if (tangentKm >= AIR_REDDENING.topKm) return [1, 1, 1];
  const cols = AIR_REDDENING.airmass * Math.exp(-tangentKm / AIR_REDDENING.scaleKm);
  return AIR_REDDENING.tauRgb.map((t) => Math.exp(-t * cols));
}

/**
 * Pure: the sunlight on `sat` as [r, g, b] shares of full sunlight: the Earth's geometric shadow
 * (earthShadowLit) times the air's reddening along the line to the Sun when that line passes the
 * Earth on its way. Same arguments as earthShadowLit; `radiusKm` is the Earth's radius in km, which
 * sets the scale height in the scene's units.
 */
export function sunlightOn(sat, earth, sun, radius, radiusKm = EARTH_RADIUS_KM) {
  const lit = earthShadowLit(sat, earth, sun, radius);
  if (lit <= 0) return [0, 0, 0];
  _d.set(sat.x - earth.x, sat.y - earth.y, sat.z - earth.z);
  _s.set(sun.x - earth.x, sun.y - earth.y, sun.z - earth.z);
  const len = _s.length();
  if (!(len > 0)) return [lit, lit, lit];
  _s.multiplyScalar(1 / len);
  const along = _d.dot(_s);
  if (along >= 0) return [lit, lit, lit];
  const perp = Math.sqrt(Math.max(0, _d.lengthSq() - along * along));
  const t = airTransmission(((perp - radius) / radius) * radiusKm);
  return t.map((x) => x * lit);
}

/**
 * The same reddening in GLSL, for scene/models.js's shadow (the lines it adds name this): `hR` is
 * the grazing height over the scale height. One exp a fragment, only inside the Earth's shadow side.
 */
export const AIR_TINT_GLSL = `vec3 srAirTint( float hR ) {
  if ( hR >= ${(AIR_REDDENING.topKm / AIR_REDDENING.scaleKm).toFixed(2)} ) return vec3( 1.0 );
  float cols = ${AIR_REDDENING.airmass.toFixed(1)} * exp( -max( hR, 0.0 ) );
  return exp( -vec3( ${AIR_REDDENING.tauRgb.map((x) => x.toFixed(4)).join(', ')} ) * cols );
}`;
