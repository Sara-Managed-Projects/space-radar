// tests/test_eclipse.mjs -- spec 0037: the Moon's shadow on the Earth, and the Earth's on the Moon.
//
// The shadow is COMPUTED (scene/eclipse.js): the fraction of the Sun's disc the occluder covers,
// from each surface point, from the true positions. This file proves the JS twin lands where the
// library's eclipse search says the eclipse is, and that the GLSL is the same formula.
//
// Eclipse instants and points are the library's, through data/events.js nextEvent() (spec 0031,
// checked against NASA GSFC within 6 s): nothing here recomputes them.
//
// TWO SPEC NUMBERS WERE WRONG AND ARE CHANGED HERE, measured 2026-09-23:
//   - "a point 3 000 km from the centre line reads 0.2..0.95": on 2027-08-02 the penumbra's radius
//     on the ground under the Moon is about 3 500 km, and 3 000 km north, south, east or west of the
//     greatest-eclipse point reads 0.05..0.10. The mid-penumbra case is at 1 500 km (~0.5); 3 000 km
//     is kept as the rim, where the answer is small and not zero.
//   - "at the library's next lunar eclipse the sub-Earth point is >= 0.99": the next three lunar
//     eclipses (2027-02-20, 2027-07-18, 2027-08-17) are penumbral, where the Earth covers only part
//     of the Sun from anywhere on the Moon. The >= 0.99 case is the next TOTAL one, 2028-12-31; the
//     next one is checked as partial.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const E = await import(join(JS, 'scene/eclipse.js'));
const { obscuration, surfaceObscuration, discOverlap, eclipseLikely, ECLIPSE_GLSL,
  SUN_RADIUS_KM, MOON_RADIUS_KM, EARTH_SHADOW_RADIUS_KM, UMBRA_DEPTH } = E;
const { nextEvent } = await import(join(JS, 'data/events.js'));
const { stage, SUN_INERTIAL } = await import(join(JS, 'scene/stage.js'));
const { positionOf, WORLD_FRAG } = await import(join(JS, 'scene/worlds.js'));
const { SURFACE_FRAG } = await import(join(JS, 'scene/earth.js'));
const { gmst, geodeticToEcef, ecefToEci } = await import(join(JS, 'propagate/frames.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const measured = [];
const DEG = Math.PI / 180;
const f4 = (x) => x.toFixed(4);

// ---- 1. the disc overlap, against answers worked by hand --------------------------------------
check(discOverlap(0, 1) === 1, 'equal discs, concentric: 1');
check(discOverlap(0, 1.08) === 1, 'a bigger Moon, concentric: 1 (total)');
check(Math.abs(discOverlap(0, 0.9) - 0.81) < 1e-12, 'a smaller Moon, concentric: r^2 = 0.81 (annular)');
check(discOverlap(2, 1) === 0, 'touching from outside: 0');
check(discOverlap(3, 1) === 0, 'apart: 0');
// two unit discs one radius apart: lens = 2 acos(1/2) - sqrt(3)/2, over pi
check(Math.abs(discOverlap(1, 1) - (2 * Math.acos(0.5) - Math.sqrt(3) / 2) / Math.PI) < 1e-12, 'unit discs 1 apart: 0.3910');
// continuity at both branch edges
check(Math.abs(discOverlap(0.1 + 1e-9, 0.9) - 0.81) < 1e-6, 'continuous where the Moon comes wholly inside');
check(discOverlap(1.9 - 1e-9, 0.9) < 1e-6, 'continuous at first contact');
let mono = true;
for (let x = 0; x < 2.2; x += 0.01) if (discOverlap(x + 0.01, 1.03) > discOverlap(x, 1.03) + 1e-12) mono = false;
check(mono, 'the overlap only falls as the discs separate');

// ---- 2. the GLSL is the same arithmetic: translated mechanically and run -----------------------
const fnMatch = ECLIPSE_GLSL.match(/float eclDiscOverlap\( float x, float r \) \{([\s\S]*?)\n\}/);
check(!!fnMatch, 'ECLIPSE_GLSL has eclDiscOverlap(float x, float r)');
if (fnMatch) {
  const body = fnMatch[1]
    .replace(/\bfloat\s+/g, 'let ')
    .replace(/\b(abs|min|max|acos|sqrt)\(/g, 'Math.$1(');
  // eslint-disable-next-line no-new-func
  const glslOverlap = new Function('x', 'r', 'const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\n' + body);
  let worst = 0;
  let n = 0;
  for (const r of [0.9, 0.93, 0.97, 1, 1.03, 1.06, 1.08]) {
    for (let x = 0.001; x < 2.3; x += 0.013) {
      worst = Math.max(worst, Math.abs(glslOverlap(x, r) - discOverlap(x, r)));
      n++;
    }
  }
  check(worst < 1e-7, `the GLSL eclDiscOverlap and discOverlap() agree (worst ${worst} over ${n} points)`);
  measured.push(`GLSL vs JS discOverlap: worst difference ${worst.toExponential(1)} over ${n} points`);
}
// the vector half: the same three angles, the same way
check(/float angS = asin\( clamp\( rs \/ length\( toS \)/.test(ECLIPSE_GLSL), 'GLSL: the Sun\'s angular radius is asin(rs / |S - P|)');
check(/float angM = asin\( clamp\( rm \/ length\( toM \)/.test(ECLIPSE_GLSL), 'GLSL: the Moon\'s angular radius is asin(rm / |M - P|)');
check(/atan\( length\( cross\( toS, toM \) \), dot\( toS, toM \) \)/.test(ECLIPSE_GLSL), 'GLSL: the separation is atan(|a x b|, a . b), never acos');
check(/eclDiscOverlap\( theta \/ angS, angM \/ angS \)/.test(ECLIPSE_GLSL), 'GLSL: works in the Sun\'s radii, as the JS does');

// ---- 3. the constants, read back out of the shader strings --------------------------------------
const constIn = (src, name) => { const m = src.match(new RegExp(`const float ${name} = ([0-9.]+);`)); return m ? Number(m[1]) : NaN; };
for (const [name, value] of [['SUN_RADIUS_KM', SUN_RADIUS_KM], ['MOON_RADIUS_KM', MOON_RADIUS_KM], ['EARTH_SHADOW_RADIUS_KM', EARTH_SHADOW_RADIUS_KM], ['UMBRA_DEPTH', UMBRA_DEPTH]]) {
  check(constIn(ECLIPSE_GLSL, name) === value, `ECLIPSE_GLSL carries ${name} = ${value}`);
  check(constIn(SURFACE_FRAG, name) === value, `the Earth's shader (earth.js) carries ${name} = ${value}`);
  check(constIn(WORLD_FRAG, name) === value, `the Moon's shader (worlds.js) carries ${name} = ${value}`);
}
check(SUN_RADIUS_KM === 695700 && MOON_RADIUS_KM === 1737.4, 'the spec\'s two radii');
check(/eclObscuration\(/.test(SURFACE_FRAG) && /uniform float uEclipse;/.test(SURFACE_FRAG) && /uEclipse > 0\.5 && sunDot > 0\.0/.test(SURFACE_FRAG),
  'the Earth\'s shader calls eclObscuration( on the day side, behind the uEclipse uniform');
check(/eclObscuration\([^;]*EARTH_SHADOW_RADIUS_KM/.test(WORLD_FRAG) && /uniform float uEclipse;/.test(WORLD_FRAG),
  'the Moon\'s shader calls eclObscuration( with the Earth as the occluder, behind uEclipse');

// ---- 4. the geometry at the library's instants -------------------------------------------------
function scene(tMs) {
  stage.setWorld('earth');
  stage.setTime(tMs);
  const m = positionOf('moon', tMs);
  return {
    moon: stage.toStageFrame(m, m.frame, tMs),          // earth-inertial (TEME), km
    sun: stage.toStageFrame({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, tMs),
    earth: { x: 0, y: 0, z: 0 },
    // a geodetic point on the WGS84 surface, in the same frame: what the Earth mesh's vertices are
    at: (latDeg, lonDeg) => ecefToEci(geodeticToEcef(latDeg * DEG, lonDeg * DEG, 0), gmst(new Date(tMs))),
  };
}
const offset = (lat, lon, km, bearingDeg) => {
  const d = km / 6371;
  const b = bearingDeg * DEG;
  const la = lat * DEG;
  const lat2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lon2 = lon * DEG + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(lat2));
  return [lat2 / DEG, lon2 / DEG];
};

const FROM = Date.parse('2026-09-23T00:00:00Z');

// 4a. 2027-08-02, total: the umbra at the library's point, nothing at the antipode, a gradient between.
const total = nextEvent('solar-eclipse', Date.parse('2027-07-01T00:00:00Z'));
check(total && total.kind === 'total' && new Date(total.t).toISOString().startsWith('2027-08-02T10:06'),
  `the library's total eclipse is 2027-08-02 10:06 UT (got ${total && new Date(total.t).toISOString()})`);
if (total && total.where) {
  const S = scene(total.t);
  const { lat, lon } = total.where;
  const peak = surfaceObscuration(S.at(lat, lon), S.earth, S.sun, S.moon);
  const anti = surfaceObscuration(S.at(-lat, lon + 180), S.earth, S.sun, S.moon);
  const mids = [0, 90, 180, 270].map((b) => surfaceObscuration(S.at(...offset(lat, lon, 1500, b)), S.earth, S.sun, S.moon));
  const rims = [0, 90, 180, 270].map((b) => surfaceObscuration(S.at(...offset(lat, lon, 3000, b)), S.earth, S.sun, S.moon));
  const far = surfaceObscuration(S.at(...offset(lat, lon, 5000, 0)), S.earth, S.sun, S.moon);
  check(peak >= 0.99, `2027-08-02: at the library's point (${lat.toFixed(2)}, ${lon.toFixed(2)}) the Sun is >= 99 % covered (got ${f4(peak)})`);
  check(anti === 0, `2027-08-02: at the antipode, 0 (got ${anti})`);
  check(obscuration(S.at(-lat, lon + 180), S.sun, S.moon) > 0, 'the antipode is 0 because the Sun has set there, not because the discs miss (the day-side test matters)');
  check(mids.every((v) => v >= 0.2 && v <= 0.95), `2027-08-02: 1 500 km out, mid-penumbra 0.2..0.95 (got ${mids.map(f4).join(', ')})`);
  check(rims.every((v) => v > 0 && v < 0.2), `2027-08-02: 3 000 km out, the penumbra's rim, 0..0.2 (got ${rims.map(f4).join(', ')})`);
  check(far === 0, `2027-08-02: 5 000 km out, outside the penumbra (got ${far})`);
  measured.push(`2027-08-02 ${new Date(total.t).toISOString()}: peak point ${f4(peak)}, antipode ${anti}, 1 500 km N/E/S/W ${mids.map(f4).join(' ')}, 3 000 km ${rims.map(f4).join(' ')}, 5 000 km ${far}`);

  // the umbra's size, which is what the screenshot's dark spot should be: walk north until < 0.99
  let umbraKm = 0;
  while (umbraKm < 400 && surfaceObscuration(S.at(...offset(lat, lon, umbraKm + 5, 0)), S.earth, S.sun, S.moon) >= 0.999) umbraKm += 5;
  check(umbraKm >= 80 && umbraKm <= 200, `2027-08-02: the umbra reaches 80..200 km north of the point (got ${umbraKm})`);
  measured.push(`2027-08-02 umbra: fully covered to ${umbraKm} km north of the point`);
  // and a minute either side the umbra has moved on: this is what "to the minute" is worth
  const S2 = scene(total.t + 30 * 60e3);
  check(surfaceObscuration(S2.at(lat, lon), S2.earth, S2.sun, S2.moon) < 0.99, '2027-08-02: half an hour later the umbra has left the point');

  check(eclipseLikely(S.sun, S.moon, 'solar') === true, 'eclipseLikely(solar) at the 2027-08-02 peak');
  check(eclipseLikely(S.sun, S.moon, 'lunar') === false, 'eclipseLikely(lunar) is not a solar eclipse');
  const W = scene(total.t + 7 * 86400e3);
  check(eclipseLikely(W.sun, W.moon, 'solar') === false, 'eclipseLikely(solar) a week later is false');
}

// 4b. 2027-02-06, annular: the peak is the (aM / aS)^2 branch, below 1.
const annular = nextEvent('solar-eclipse', FROM);
check(annular && annular.kind === 'annular' && new Date(annular.t).toISOString().startsWith('2027-02-06T15:59'),
  `the next solar eclipse from 2026-09-23 is the annular of 2027-02-06 15:59 UT (got ${annular && new Date(annular.t).toISOString()})`);
if (annular && annular.where) {
  const S = scene(annular.t);
  const p = S.at(annular.where.lat, annular.where.lon);
  const v = surfaceObscuration(p, S.earth, S.sun, S.moon);
  const ds = Math.hypot(S.sun.x - p.x, S.sun.y - p.y, S.sun.z - p.z);
  const dm = Math.hypot(S.moon.x - p.x, S.moon.y - p.y, S.moon.z - p.z);
  const ratio = Math.asin(MOON_RADIUS_KM / dm) / Math.asin(SUN_RADIUS_KM / ds);
  check(ratio < 1 && v < 1 && v > 0.8, `2027-02-06: annular, the peak is below 1 (got ${f4(v)}, Moon/Sun ${f4(ratio)})`);
  check(Math.abs(v - ratio * ratio) < 1e-3, `2027-02-06: the peak is the ring branch, (aM/aS)^2 = ${f4(ratio * ratio)} (got ${f4(v)})`);
  check(eclipseLikely(S.sun, S.moon, 'solar') === true, 'eclipseLikely(solar) at the 2027-02-06 peak');
  measured.push(`2027-02-06 ${new Date(annular.t).toISOString()}: peak point ${f4(v)} (ring: Moon/Sun ${f4(ratio)}), shade ${f4(1 - UMBRA_DEPTH * v)}`);
}

// 4c. The gate never hides a shadow: every sampled moment from first to last contact in which any
//     day-side point of a 3-degree grid is covered at all, eclipseLikely() said yes.
for (const ev of [total, annular].filter(Boolean)) {
  let missed = 0;
  let covered = 0;
  for (let dtMin = -240; dtMin <= 240; dtMin += 10) {
    const S = scene(ev.t + dtMin * 60e3);
    let any = false;
    for (let la = -87; la <= 87 && !any; la += 3) {
      for (let lo = -180; lo < 180 && !any; lo += 3) {
        if (surfaceObscuration(S.at(la, lo), S.earth, S.sun, S.moon) > 0) any = true;
      }
    }
    if (any) { covered++; if (!eclipseLikely(S.sun, S.moon, 'solar')) missed++; }
  }
  check(covered > 10 && missed === 0, `${new Date(ev.t).toISOString().slice(0, 10)}: the gate is open whenever a shadow is on the ground (${covered} moments covered, ${missed} missed)`);
}

// ---- 5. the lunar case: the Earth as occluder, seen from the Moon -------------------------------
function subEarthPoint(S) {
  const d = Math.hypot(S.moon.x, S.moon.y, S.moon.z);
  return { x: S.moon.x * (1 - MOON_RADIUS_KM / d), y: S.moon.y * (1 - MOON_RADIUS_KM / d), z: S.moon.z * (1 - MOON_RADIUS_KM / d) };
}
const earthShadow = { moonRadiusKm: EARTH_SHADOW_RADIUS_KM };
let lunar = nextEvent('lunar-eclipse', FROM);
const firstLunar = lunar;
if (firstLunar) {
  const S = scene(firstLunar.t);
  const v = surfaceObscuration(subEarthPoint(S), S.moon, S.sun, S.earth, earthShadow);
  check(firstLunar.kind === 'penumbral' && v > 0.05 && v < 0.99,
    `the next lunar eclipse (${new Date(firstLunar.t).toISOString().slice(0, 10)}, ${firstLunar.kind}) shades the sub-Earth point partly (got ${f4(v)})`);
  check(eclipseLikely(S.sun, S.moon, 'lunar') === true, 'eclipseLikely(lunar) at the next lunar eclipse');
  measured.push(`lunar ${new Date(firstLunar.t).toISOString()} (${firstLunar.kind}): sub-Earth point ${f4(v)}`);
}
// the next TOTAL one lies beyond nextEvent()'s 400-day horizon from today, so walk to it
for (let i = 0; i < 8 && lunar && lunar.kind !== 'total'; i++) lunar = nextEvent('lunar-eclipse', lunar.t + 60e3);
check(lunar && lunar.kind === 'total', 'a total lunar eclipse within eight');
if (lunar && lunar.kind === 'total') {
  const S = scene(lunar.t);
  const sub = subEarthPoint(S);
  const v = surfaceObscuration(sub, S.moon, S.sun, S.earth, earthShadow);
  check(v >= 0.99, `${new Date(lunar.t).toISOString().slice(0, 10)} total lunar: the sub-Earth point is >= 99 % in the Earth's shadow (got ${f4(v)})`);
  // The point facing away from the Earth: at a lunar eclipse the Sun is on the Earth's side of the
  // Moon, so that point is in the Moon's own night and must read 0, whatever the discs do.
  const dm = Math.hypot(S.moon.x, S.moon.y, S.moon.z);
  const farSide = { x: S.moon.x * (1 + MOON_RADIUS_KM / dm), y: S.moon.y * (1 + MOON_RADIUS_KM / dm), z: S.moon.z * (1 + MOON_RADIUS_KM / dm) };
  check(surfaceObscuration(farSide, S.moon, S.sun, S.earth, earthShadow) === 0, 'at a lunar eclipse the point facing away from the Earth is in the Moon\'s night: 0');
  const dayBefore = scene(lunar.t - 86400e3);
  const vBefore = surfaceObscuration(subEarthPoint(dayBefore), dayBefore.moon, dayBefore.sun, dayBefore.earth, earthShadow);
  check(vBefore === 0, `a day before, the Moon is out of the shadow (got ${vBefore})`);
  check(eclipseLikely(S.sun, S.moon, 'lunar') === true && eclipseLikely(dayBefore.sun, dayBefore.moon, 'lunar') === false, 'eclipseLikely(lunar): at the peak yes, a day before no');
  measured.push(`lunar ${new Date(lunar.t).toISOString()} (total): sub-Earth point ${f4(v)}, a day before ${vBefore}`);
}

if (problems.length) { console.error('eclipse FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('eclipse ok: the shadow lands on the library\'s point, the GLSL is the JS formula, the gate never hides a shadow');
for (const m of measured) console.log('  ' + m);
