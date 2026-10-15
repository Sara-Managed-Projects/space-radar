// tests/test_shadow.mjs -- spec 0026 req 12: sunlit or in Earth's shadow, on every glyph and card.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { inEarthShadow, sunlitState, sunAndEarthScene } = await import(join(JS, 'scene/shadow.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// the pure test: Earth at the origin, the Sun far along +x, radius 1
const E = { x: 0, y: 0, z: 0 }, S = { x: 1e6, y: 0, z: 0 };
check(inEarthShadow({ x: -2, y: 0, z: 0 }, E, S, 1) === true, 'directly behind Earth: shadow');
check(inEarthShadow({ x: 2, y: 0, z: 0 }, E, S, 1) === false, 'between Earth and the Sun: lit');
check(inEarthShadow({ x: -2, y: 1.5, z: 0 }, E, S, 1) === false, 'behind but outside the cylinder: lit');
check(inEarthShadow({ x: -2, y: 0.9, z: 0 }, E, S, 1) === true, 'behind and just inside: shadow');
check(inEarthShadow({ x: 0, y: 1.2, z: 0 }, E, S, 1) === false, 'beside Earth: lit');
check(inEarthShadow({ x: -2, y: 0, z: 0 }, E, E, 1) === false, 'a degenerate Sun direction never claims shadow');

// with the real stage: the sub-solar and anti-solar points at 400 km on the Earth stage
const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('earth'); stage.setTime(tMs);
const ref = sunAndEarthScene(tMs);
check(!!ref && Math.abs(ref.radius - 6.371) < 1e-9, 'Earth radius is 6.371 units on the Earth stage');
const sunDir = { x: ref.sun.x - ref.earth.x, y: ref.sun.y - ref.earth.y, z: ref.sun.z - ref.earth.z };
const n = Math.hypot(sunDir.x, sunDir.y, sunDir.z);
const r = (6371 + 400) / 1000;
const sub = { x: ref.earth.x + sunDir.x / n * r, y: ref.earth.y + sunDir.y / n * r, z: ref.earth.z + sunDir.z / n * r };
const anti = { x: ref.earth.x - sunDir.x / n * r, y: ref.earth.y - sunDir.y / n * r, z: ref.earth.z - sunDir.z / n * r };
check(inEarthShadow(sub, ref.earth, ref.sun, ref.radius) === false, 'the sub-solar point at 400 km is lit');
check(inEarthShadow(anti, ref.earth, ref.sun, ref.radius) === true, 'the anti-solar point at 400 km is in shadow');
// a record that does not orbit Earth has no answer
check(sunlitState({ frame: 'sun-inertial', propagator: 'static', pos: { x: 1, y: 0, z: 0 } }, tMs) === null, 'a heliocentric record has no shadow state');
check(sunlitState(null, tMs) === null, 'null record, null answer');

// A lander on another world (public #403): by day its mark is lit, at night it dims, as a ground
// site on the Earth does.
{
  const { standsOn, groundLit, worldCentreScene } = await import(join(JS, 'scene/shadow.js'));
  check(standsOn({ frame: 'mars-fixed' }) === 'mars' && standsOn({ frame: 'moon-fixed' }) === 'moon', 'a record in a world\'s fixed frame stands on that world');
  check(standsOn({ frame: 'earth-fixed' }) === null && standsOn({ frame: 'mars-inertial' }) === null && standsOn({ frame: 'sun-inertial' }) === null && standsOn(null) === null, 'the Earth\'s own sites and anything in orbit are not asked here');
  const C = { x: 10, y: 0, z: 0 }, SUN = { x: 1e6, y: 0, z: 0 };
  check(groundLit({ x: 11, y: 0, z: 0 }, C, SUN) === 1, 'noon: lit');
  check(groundLit({ x: 9, y: 0, z: 0 }, C, SUN) === 0, 'midnight: dimmed');
  check(groundLit({ x: 10 - 0.5, y: Math.sqrt(0.75), z: 0 }, C, SUN) === 0, '30 degrees past the terminator: dimmed');
  check(groundLit({ x: 10 + 0.1, y: Math.sqrt(0.99), z: 0 }, C, SUN) === 1, 'just on the day side: lit');
  check(groundLit(C, C, SUN) === 1, 'a thing at the centre has no ground: left lit');
  // On the real stage: Mars's centre is found, and the two ends of the Sun line through it differ.
  stage.setWorld('earth'); stage.setTime(tMs);
  const ref2 = sunAndEarthScene(tMs);
  const mars = worldCentreScene('mars', tMs);
  check(!!mars && Number.isFinite(mars.x) && mars.length() > 1000, 'Mars\'s centre is placed on the Earth\'s stage');
  if (mars) {
    const d = { x: ref2.sun.x - mars.x, y: ref2.sun.y - mars.y, z: ref2.sun.z - mars.z };
    const len = Math.hypot(d.x, d.y, d.z), R = 3.39;
    const noon = { x: mars.x + d.x / len * R, y: mars.y + d.y / len * R, z: mars.z + d.z / len * R };
    const night = { x: mars.x - d.x / len * R, y: mars.y - d.y / len * R, z: mars.z - d.z / len * R };
    check(groundLit(noon, mars, ref2.sun) === 1 && groundLit(night, mars, ref2.sun) === 0, 'the sub-solar point of Mars is lit and its far point is dimmed');
  }
  check(worldCentreScene('no-such-world', tMs) === null, 'a world the stage does not know is not asked');
  const glyphs = readFileSync(join(JS, 'scene/glyphs.js'), 'utf8');
  check(/const world = standsOn\(rec\);\s*const centre = world \? worldCentreScene\(world, tMs\) : null;\s*if \(centre\) lit = groundLit\(v, centre, shadowRef\.sun\);/.test(glyphs), 'the glyph layer asks it of every mark that stands on another world');
}

// --- 0076 W2-a: THE RED OF THE PENUMBRA (scene/shadow.js AIR_REDDENING, sunlightOn) ----------------------
{
  const S = await import(join(JS, 'scene/shadow.js'));
  const close = (a, b, eps) => Math.abs(a - b) <= eps;
  // Hansen and Travis (1974): 0.008569 l^-4 (1 + 0.0113 l^-2 + 0.00013 l^-4).
  const tau = (l) => 0.008569 * l ** -4 * (1 + 0.0113 * l ** -2 + 0.00013 * l ** -4);
  check([0.65, 0.55, 0.45].every((l, i) => close(S.AIR_REDDENING.tauRgb[i], tau(l), 6e-5)), 'the column\'s Rayleigh depths are Hansen and Travis\'s at 650, 550 and 450 nm');
  check(close(S.AIR_REDDENING.airmass, Math.sqrt(2 * Math.PI * 6371 / S.AIR_REDDENING.scaleKm), 0.05), 'a grazing line crosses sqrt(2 pi R / H) columns at the ground');
  const t10 = S.airTransmission(10);
  const t25 = S.airTransmission(25);
  check(t10[0] > t10[1] && t10[1] > t10[2] && t10[2] < 0.05 && t10[0] > 0.3, `10 km up the light that grazes is red: ${t10.map((x) => x.toFixed(3))}`);
  check(t25.every((x, i) => x > t10[i]) && t25[2] > 0.4, `higher, it whitens: ${t25.map((x) => x.toFixed(3))}`);
  check(S.airTransmission(60).every((x) => x === 1) && S.airTransmission(-1).every((x) => x === 0), 'above the top it is white; below the ground there is none');
  // On a craft: a line that does not pass the Earth is plain sunlight; one that grazes it is reddened.
  const earth = { x: 0, y: 0, z: 0 };
  const sun = { x: 1e9, y: 0, z: 0 };
  const day = S.sunlightOn({ x: 6771, y: 0, z: 0 }, earth, sun, 6371);
  check(day.every((x) => x === 1), 'on the day side the light is the Sun\'s');
  const graze = S.sunlightOn({ x: -2000, y: 6371 + 15, z: 0 }, earth, sun, 6371);
  check(graze[0] > graze[2] * 3 && graze[0] < 1, `just out of the shadow, behind the Earth, the light grazed the air at 15 km and is red: ${graze.map((x) => x.toFixed(3))}`);
  const deep = S.sunlightOn({ x: -2000, y: 0, z: 0 }, earth, sun, 6371);
  check(deep.every((x) => x === 0), 'in the umbra there is none');
  // The GLSL twin, and the one place scene/models.js uses it.
  check(S.AIR_TINT_GLSL.includes(S.AIR_REDDENING.tauRgb.map((x) => x.toFixed(4)).join(', ')) && S.AIR_TINT_GLSL.includes(S.AIR_REDDENING.airmass.toFixed(1)), 'the shader\'s numbers are the JS twin\'s');
  const models = readFileSync(join(JS, 'scene/models.js'), 'utf8');
  check(/if \( uAirH > 0\.0 \) outgoingLight \*= srAirTint\( \( perp - uShadeRadius \) \/ uAirH \);/.test(models) && /AIR_TINT_GLSL,/.test(models), 'scene/models.js reddens the sunlight in the Earth\'s shadow test, with the twin\'s function');
  check(/SHARED\.uAirH\.value = there && worldId === 'earth' && airReddeningOn\(\)/.test(models), 'only when the shadow is the Earth\'s (the Moon has no air)');
}

if (problems.length) { console.error('shadow FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('shadow ok: the cylinder test lights the Sun side and shadows the far side; the real stage agrees at 400 km; the light that grazes the air on its way out of the shadow is red (0076 W2-a)');
