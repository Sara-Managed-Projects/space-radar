// tests/test_world_light.mjs -- spec 0054 task 1: the worlds are physically lit.
//
// The shader cannot run here, so this holds it the way tests/test_eclipse.mjs holds the eclipse:
// the JS twins of its two reflectance laws (scene/worlds.js orenNayar, minnaert) against answers
// worked by hand and against the physics they claim, the GLSL read back as a string for the same
// formula and constants, and the uniforms of every world built headless.
//
//   1. no cel bands left in WORLD_FRAG (the spec's acceptance string check)
//   2. Oren-Nayar: sigma 0 is Lambert; the sub-solar point is the map; the full disc is flatter
//   3. Minnaert: k 1 is Lambert; k > 1 darkens the limb; the rows keep #318's order
//   4. every world's uniforms: exposed for its own sunlight, a law and a parameter each
//   5. earthshine: NASA's albedo gives the spec's 1/10 000, and the Moon wears it (not under the latch)

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const { WORLD_FRAG, WORLDS, orenNayar, minnaert, earthshineShare, createWorlds, worldMaterial,
  EARTHSHINE_GAIN, EARTH_GEOMETRIC_ALBEDO, MU_FLOOR, DEFAULT_ROUGHNESS } = W;
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const DEG = Math.PI / 180;
const measured = [];

// ---- 1. no bands --------------------------------------------------------------------------------
// The cel shader was: shadow = base * 0.55 * vec3( 0.88, 0.94, 1.14 ), highlight = base * 1.25, two
// smoothsteps at 0.02 and 0.55 of width uBand, a uAmbient floor and a widened uTerminator.
for (const [what, re] of [
  ['the x0.55 shadow tone', /base \* 0\.55/],
  ['the blue shift', /0\.88, 0\.94, 1\.14/],
  ['the x1.25 highlight', /base \* 1\.25/],
  ['the band width', /uBand/],
  ['the band at 0.55', /smoothstep\( 0\.55/],
  ['the ambient floor', /uAmbient/],
  ['the widened terminator', /uTerminator/],
]) check(!re.test(WORLD_FRAG), `WORLD_FRAG no longer carries ${what}`);
check(/float orenNayar\( vec3 n, vec3 l, vec3 v, float sigma \)/.test(WORLD_FRAG) && /float minnaert\( float nl, float nv, float k \)/.test(WORLD_FRAG),
  'WORLD_FRAG defines orenNayar( and minnaert(');
// `dLit` since 2026-10-08: d itself, but for Venus's cloud deck (uWrap; tests/test_world_looks.mjs).
check(/uLimb > 0\.0\s*\? minnaert\( dLit, dot\( n, viewDir \), uLimb \)\s*: orenNayar\( n, uSunDir, viewDir, uRoughness \)/.test(WORLD_FRAG)
  && /float dLit = uWrap > 0\.0 \? \( d \+ uWrap \) \/ \( 1\.0 \+ uWrap \) : d;/.test(WORLD_FRAG),
  'WORLD_FRAG picks Minnaert when uLimb is set and Oren-Nayar otherwise');
check(/vec3 colour = base \* direct \* uSunIrradiance \* ringShade;/.test(WORLD_FRAG), 'the direct light is scaled by uSunIrradiance and #318\'s ring shadow, and by nothing else');
check(/colour \+= base \* uEarthshine \* max\( dot\( n, uEarthDir \), 0\.0 \);/.test(WORLD_FRAG), 'earthshine is a Lambert term under uEarthDir');
const constIn = (src, name) => { const m = src.match(new RegExp(`const float ${name} = ([0-9.e-]+);`)); return m ? Number(m[1]) : NaN; };
check(constIn(WORLD_FRAG, 'MU_FLOOR') === MU_FLOOR, `WORLD_FRAG carries MU_FLOOR = ${MU_FLOOR}`);
// The GLSL is the same formula as the twin: the A and B terms, the /A normalisation, the 1.5 rad cap.
check(/float A = 1\.0 - 0\.5 \* s2 \/ \( s2 \+ 0\.33 \);/.test(WORLD_FRAG) && /float B = 0\.45 \* s2 \/ \( s2 \+ 0\.09 \);/.test(WORLD_FRAG),
  'the GLSL Oren-Nayar has the published A and B');
check(/sin\( a \) \* tan\( b \) \) \/ A;/.test(WORLD_FRAG) && /min\( min\( ti, tr \), 1\.5 \)/.test(WORLD_FRAG), 'the GLSL divides by A and caps b at 1.5 rad, as the twin does');
check(/pow\( nl, k \) \* pow\( max\( nv, MU_FLOOR \), k - 1\.0 \)/.test(WORLD_FRAG), 'the GLSL Minnaert is mu0^k mu^(k-1) with the floor');

// ---- 2. Oren-Nayar ------------------------------------------------------------------------------
// sigma 0: A = 1, B = 0, Lambert exactly, at any geometry.
for (const [nl, nv, cp] of [[1, 1, 1], [0.5, 0.9, 0.2], [0.1, 0.3, -0.5]]) {
  check(near(orenNayar(nl, nv, cp, 0), nl, 1e-12), `Oren-Nayar at sigma 0 is Lambert (nl ${nl}, nv ${nv}): ${orenNayar(nl, nv, cp, 0)}`);
}
// The Sun overhead and the camera looking straight down: the map's own texel, for every sigma.
for (const s of [0.2, 0.35, 0.45, 0.5]) check(near(orenNayar(1, 1, 1, s), 1, 1e-12), `the sub-solar point seen from the Sun is 1 at sigma ${s}`);
// The full Moon's flat disc. 60 degrees from the centre, Sun behind the camera (nl = nv, same azimuth):
// Lambert 0.5; the design's 0.5 rad keeps 0.82 of the centre, and 80 degrees out still 0.58.
{
  const c60 = Math.cos(60 * DEG);
  const c80 = Math.cos(80 * DEG);
  const on60 = orenNayar(c60, c60, 1, 0.5);
  const on80 = orenNayar(c80, c80, 1, 0.5);
  check(near(on60, 0.816, 0.002) && near(on80, 0.583, 0.002), `a full Moon at 0.5 rad keeps 0.82 of its centre at 60 degrees out and 0.58 at 80 (${on60.toFixed(3)}, ${on80.toFixed(3)})`);
  check(on60 > c60 * 1.5, 'and that is plainly flatter than Lambert\'s 0.50');
  measured.push(`full Moon at 60 / 80 degrees from the centre: Oren-Nayar 0.5 rad ${on60.toFixed(3)} / ${on80.toFixed(3)}, Lambert ${c60.toFixed(3)} / ${c80.toFixed(3)}`);
}
// Past the terminator nothing; and grazing never runs away (the bounded nl tan(b) product).
check(orenNayar(-0.1, 0.8, 1, 0.5) === 0 && orenNayar(0, 0.8, 1, 0.5) === 0, 'Oren-Nayar is 0 on the night side');
{
  let worst = 0;
  for (let i = 1; i <= 200; i++) for (let j = 0; j <= 200; j++) {
    const v = orenNayar(i / 200, j / 200, 1, 0.5);
    if (!Number.isFinite(v)) worst = Infinity; else worst = Math.max(worst, v);
  }
  check(Number.isFinite(worst) && worst < 1.6, `Oren-Nayar stays finite and under 1.6 over the whole (nl, nv) square (max ${worst.toFixed(3)})`);
}
// Backscatter: with the camera on the Sun's side the rough surface returns more than with it opposite.
check(orenNayar(0.5, 0.5, 1, 0.5) > orenNayar(0.5, 0.5, -1, 0.5), 'a rough surface throws more light back toward the Sun than away from it');

// ---- 3. Minnaert --------------------------------------------------------------------------------
for (const [nl, nv] of [[1, 1], [0.6, 0.3], [0.2, 0.9]]) check(near(minnaert(nl, nv, 1), nl, 1e-12), `Minnaert at k 1 is Lambert (${nl}, ${nv})`);
check(minnaert(1, 1, 1.2) === 1 && minnaert(1, 1, 0.9) === 1, 'the sub-solar point seen from the Sun is 1 at any k');
check(minnaert(-0.2, 0.5, 1.05) === 0, 'Minnaert is 0 on the night side');
// At full phase (nl = nv = mu) it is mu^(2k - 1): a larger k is a darker limb.
{
  const mu = 0.3;
  check(minnaert(mu, mu, 1.2) < minnaert(mu, mu, 1.05) && minnaert(mu, mu, 1.05) < minnaert(mu, mu, 0.9), 'a larger k darkens the limb');
  check(near(minnaert(mu, mu, 1.05), Math.pow(mu, 1.1), 1e-12), 'at full phase Minnaert is mu^(2k - 1)');
  // k >= 1 goes to 0 at the silhouette; k < 1 is held by the floor and stays bounded.
  check(minnaert(0.5, 0, 1.05) < minnaert(0.5, 1, 1.05), 'k >= 1 does not brighten the silhouette');
  check(Number.isFinite(minnaert(0.5, 0, 0.9)) && minnaert(0.5, 0, 0.9) <= Math.pow(0.5, 0.9) * Math.pow(MU_FLOOR, -0.1) + 1e-9, 'k < 1 is bounded by the floor');
}
{
  const byId = new Map(WORLDS.map((w) => [w.id, w]));
  const k = (id) => byId.get(id).look.limb;
  for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan']) {
    check(k(id) >= 0.8 && k(id) <= 1.5, `${id} is Minnaert with k in [0.8, 1.5] (${k(id)})`);
  }
  // #318's order: Uranus 0.5, Neptune 0.45, Jupiter and Saturn 0.35 (the exponent on mu it put on a flat disc).
  check(k('uranus') > k('neptune') && k('neptune') > k('jupiter') && k('jupiter') === k('saturn'), '#318\'s order of limb darkening is kept: Uranus, Neptune, then Jupiter and Saturn');
  check(k('venus') < k('jupiter') && k('titan') < k('jupiter'), 'Venus and Titan, haze all the way down, sit nearest Lambert');
  measured.push(`Minnaert k: ${['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan'].map((id) => `${id} ${k(id)}`).join(', ')}`);
}

// ---- 4. every world's uniforms ------------------------------------------------------------------
stage.setWorld('earth');
const worlds = createWorlds(new THREE.Scene(), { textureBase: null });
{
  const DESIGN = { moon: 0.5, mercury: 0.45, mars: 0.35 };
  const icy = [];
  for (const w of WORLDS) {
    const mesh = worlds.meshFor(w.id);
    const u = mesh && mesh.material && mesh.material.uniforms;
    if (w.look.earth || w.look.emissive) {
      check(!u || !u.uSunIrradiance, `${w.id} is not drawn with the world material`);
      continue;
    }
    check(u && u.uSunIrradiance && u.uSunIrradiance.value === 1, `${w.id} is exposed for its own sunlight (uSunIrradiance 1): ${u && u.uSunIrradiance && u.uSunIrradiance.value}`);
    check(mesh.material.name === 'world-lit', `${w.id} wears the world-lit material`);
    if (w.look.limb) {
      check(u.uLimb.value === w.look.limb, `${w.id}'s uLimb is its row's k`);
    } else {
      check(u.uLimb.value === 0, `${w.id} is rock or ice, so uLimb is 0`);
      const s = u.uRoughness.value;
      check(s > 0 && s <= 0.6, `${w.id}'s roughness is a real one (${s})`);
      if (DESIGN[w.id] !== undefined) check(s === DESIGN[w.id], `${w.id}'s roughness is the design's ${DESIGN[w.id]} (${s})`);
      if (w.look.rough === undefined) { check(s === DEFAULT_ROUGHNESS, `${w.id} takes the default roughness`); icy.push(w.id); }
    }
    // The pale rim is gone from airless worlds; #318's air rims stay where the row has air.
    check(w.look.rim ? u.uRimGain.value === w.look.rim.gain : u.uRimGain.value === 0, `${w.id}'s rim is ${w.look.rim ? 'its air rim' : 'off: no air'}`);
    check(u.uEarthshine.value === 0, `${w.id} has no earthshine before the first frame`);
  }
  check(DEFAULT_ROUGHNESS === 0.2 && ['europa', 'enceladus', 'triton', 'tethys', 'dione', 'rhea', 'mimas'].every((id) => icy.includes(id)),
    `the icy moons take the design's 0.2 (${icy.join(', ')})`);
  // scene/systems.js draws exoplanets with the same material; its defaults are rock, lit, no rim.
  const m = worldMaterial(null, 0x888888);
  check(m.uniforms.uSunIrradiance.value === 1 && m.uniforms.uLimb.value === 0 && m.uniforms.uRimGain.value === 0 && m.uniforms.uEarthshine.value === 0,
    'a bare worldMaterial is exposed at 1, Oren-Nayar, no rim, no earthshine');
}

// ---- 5. earthshine ------------------------------------------------------------------------------
{
  // NASA's fact sheet: geometric albedo 0.434. A full Earth at the mean distance: 1.19e-4 of sunlight,
  // which is the spec's "about 1/10 000", worked from the fact sheet rather than quoted.
  check(EARTH_GEOMETRIC_ALBEDO === 0.434, 'the Earth\'s geometric albedo is the fact sheet\'s 0.434');
  const full = earthshineShare(0, 384400);
  check(near(full, 1.192e-4, 0.002e-4), `a full Earth lights the Moon at 1.19e-4 of full sunlight (${full.toExponential(3)})`);
  check(full > 1 / 15000 && full < 1 / 5000, 'which is "about 1/10 000"');
  check(earthshineShare(Math.PI, 384400) < 1e-20, 'a new Earth sends none');
  check(near(earthshineShare(Math.PI / 2, 384400) / full, 1 / Math.PI, 1e-9), 'a half Earth sends 1/pi of a full one (the Lambert phase function)');
  check(near(earthshineShare(0, 2 * 384400) / full, 0.25, 1e-12), 'and the inverse square holds');
  let last = Infinity; let monotone = true;
  for (let a = 0; a <= 180; a += 5) { const v = earthshineShare(a * DEG, 384400); if (v > last + 1e-18) monotone = false; last = v; }
  check(monotone, 'it falls monotonically from a full Earth to a new one');
  check(earthshineShare(NaN, 384400) === 0 && earthshineShare(0, 0) === 0, 'a bad input is no light, not NaN');
  measured.push(`earthshine: full Earth ${full.toExponential(3)} of sunlight, drawn x${EARTHSHINE_GAIN} = ${(full * EARTHSHINE_GAIN * 100).toFixed(1)} %`);

  // The Moon wears it. 2026-10-10 15:50 UTC is the new Moon after this was written (Astronomy Engine
  // SearchMoonPhase): the Earth is nearly full from the Moon, the Sun-Earth-Moon angle near 180 deg
  // measured the other way round -- the Sun is behind the Moon from the Earth, so alpha is small.
  const newMoon = Date.parse('2026-10-10T15:50:00Z');
  worlds.update(newMoon);
  const es = worlds.earthshine();
  const moon = worlds.meshFor('moon').material.uniforms;
  check(es.phaseDeg < 10, `at new Moon the Earth is nearly full from the Moon (phase angle ${es.phaseDeg.toFixed(1)} deg)`);
  check(es.share > 1.0e-4 && es.share < 1.4e-4, `and lights it at about 1.2e-4 of sunlight (${es.share.toExponential(3)})`);
  check(near(moon.uEarthshine.value, es.share * EARTHSHINE_GAIN, 1e-12), 'the Moon\'s uEarthshine is that share times the drawing gain');
  const ed = moon.uEarthDir.value;
  const mp = worlds.meshFor('moon').position;
  const toEarth = mp.clone().negate().normalize();
  check(near(Math.hypot(ed.x, ed.y, ed.z), 1, 1e-9) && ed.dot(toEarth) > 0.9999, `uEarthDir points from the Moon to the Earth (dot ${ed.dot(toEarth).toFixed(6)})`);
  for (const id of ['mars', 'jupiter', 'io']) check(worlds.meshFor(id).material.uniforms.uEarthshine.value === 0, `${id} has no earthshine`);
  // Full Moon, two weeks on: the Earth is new from the Moon and there is almost none.
  worlds.update(newMoon + 14.77 * 86400e3);
  check(worlds.earthshine().share < full * 0.02, `at full Moon the Earth is new from the Moon and sends almost nothing (${worlds.earthshine().share.toExponential(2)})`);
  // The frame latch turns it off, and keeps it off.
  worlds.update(newMoon);
  worlds.setLatched(true);
  worlds.update(newMoon);
  check(moon.uEarthshine.value === 0 && worlds.earthshine().drawn === 0 && worlds.earthshine().share > 0, 'under the frame latch the share is still computed and nothing is drawn');
}

worlds.dispose();
console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`world light FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('world light ok: no bands, Oren-Nayar and Minnaert hold their physics, every world exposed for its own sunlight, earthshine at NASA\'s albedo');
