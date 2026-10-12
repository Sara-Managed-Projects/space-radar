// tests/test_skyair.mjs -- the colour of the sky from the air (sky/skyair.js) and the land under
// it (sky/landscape.js): the model's limits, as numbers.
//   node tests/test_skyair.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const A = await import(join(JS, 'sky/skyair.js'));
const L = await import(join(JS, 'sky/landscape.js'));
const M = await import(join(JS, 'sky/skymath.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const DEG = Math.PI / 180;
const dir = (azDeg, altDeg) => [Math.sin(azDeg * DEG) * Math.cos(altDeg * DEG), Math.sin(altDeg * DEG), -Math.cos(azDeg * DEG) * Math.cos(altDeg * DEG)];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// --- the limits of the model -------------------------------------------------------------------
// 1. Straight up from the ground, the optical depth is the coefficient times the scale height
//    (the integral of an exponential), plus the haze and the ozone shell crossed once.
const up = A.slantDepth(A.AIR.earthKm, 1);
for (let c = 0; c < 3; c += 1) {
  const want = A.AIR.rayleigh[c] * A.AIR.rayleighScaleKm + A.AIR.mieExtinction * A.AIR.mieScaleKm + A.AIR.ozone[c] * A.AIR.ozoneHalfKm / Math.sqrt(1 - (A.AIR.earthKm / (A.AIR.earthKm + A.AIR.ozoneMidKm)) ** 2 * 0);
  check(near(up[c], want, want * 0.01), `the vertical optical depth of colour ${c} is the coefficients times the scale heights (${up[c].toFixed(4)} against ${want.toFixed(4)})`);
}
check(near(A.AIR.rayleigh[1] * A.AIR.rayleighScaleKm, 0.108, 0.01), 'Rayleigh at 550 nm is about a tenth of an optical depth overhead, as measured');
// 2. The Chapman function: 1 overhead, sqrt(pi x / 2) on the horizon, and that is the air mass
//    skymath.js draws the stars with, give or take the refraction Kasten and Young include.
const x = A.AIR.earthKm / A.AIR.rayleighScaleKm;
check(A.chapman(x, 1) === 1, 'one air mass overhead');
check(near(A.chapman(x, 0), Math.sqrt(Math.PI * x / 2), 1e-9), 'sqrt(pi x / 2) air masses on the horizon');
check(near(A.chapman(x, 0), M.airmass(0), 4), `which is the horizon's air mass in sky/skymath.js within four (${A.chapman(x, 0).toFixed(1)} against ${M.airmass(0).toFixed(1)})`);
check(near(A.chapman(x, Math.cos(60 * DEG)), 2, 0.07), 'two air masses at 60 degrees from the zenith');
let rising = true;
for (let z = 0; z < 104; z += 2) if (A.chapman(x, Math.cos((z + 2) * DEG)) < A.chapman(x, Math.cos(z * DEG))) rising = false;
check(rising, 'the lower the ray, the more air, through the horizon and under it');
check(near(A.chapman(x, Math.cos(90.001 * DEG)), A.chapman(x, 0), 0.05), 'no step at the horizon');
// 3. Each phase function sends all of the light somewhere: its integral over the sphere is 1.
for (const [name, fn] of [['Rayleigh', A.phaseRayleigh], ['Mie', (mu) => A.phaseMie(mu)]]) {
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i += 1) { const mu = -1 + (i + 0.5) * 2 / n; sum += fn(mu) * 2 * Math.PI * (2 / n); }
  check(near(sum, 1, 0.002), `${name}'s phase function sums to one over the sphere (${sum.toFixed(4)})`);
}
check(A.phaseMie(1) > 100 * A.phaseMie(-1), 'haze scatters forwards: the aureole is on the Sun');
// 4. No Sun, no light: far under the horizon the model gives nothing at all.
const dark = A.skyRadiance(dir(0, 45), dir(180, -40));
check(dark.every((v) => v >= 0 && v < 1e-12), `with the Sun 40 degrees down the scattered light is nothing (${dark})`);
check(A.exposureFor(-18) === 0 && A.exposureFor(-30) === 0 && A.exposureFor(20) === 1 && A.exposureFor(NaN) === 0, 'the eye: closed on the Sun at night, 1 by day');

// --- what a sky looks like ---------------------------------------------------------------------
const noon = dir(180, 60);
const zen = A.skyColour(dir(0, 90), noon, 60);
const hor = A.skyColour(dir(0, 2), noon, 60);
check(zen[2] > zen[1] && zen[1] > zen[0] && zen[2] > 1.8 * zen[0], `at noon the zenith is blue (${zen.map((v) => v.toFixed(2))})`);
check(lum(hor) > lum(zen) && (hor[2] / hor[0]) < (zen[2] / zen[0]), 'and the horizon is brighter and paler: more air, all colours');
const set = dir(180, 0.5);
const sunSide = A.skyColour(dir(180, 3), set, 0.5);
const farSide = A.skyColour(dir(0, 3), set, 0.5);
check(sunSide[0] > sunSide[2] * 1.5, `at sunset the horizon under the Sun is red (${sunSide.map((v) => v.toFixed(2))})`);
check(lum(sunSide) > 1.3 * lum(farSide), 'and the glow is on the Sun\'s side, not all round');
check(sunSide[0] / sunSide[2] > 2 * (hor[0] / hor[2]), 'redder than the same horizon at noon');
// The sky darkens without a step from noon to the end of astronomical twilight.
let prev = Infinity;
let steps = true;
for (let alt = 60; alt >= -18; alt -= 1) {
  const f = A.twilightFloor(alt);
  const c = A.skyColour(dir(0, 90), dir(180, alt), alt).map((v, i) => v + f.zenith[i]);
  if (lum(c) > prev * 1.02 + 1e-4) steps = false;
  prev = lum(c);
}
check(steps, 'overhead, the sky only darkens as the Sun goes down');
// The twilight phases (sky/skymath.js) each have their sky: the floor is the blue hour's.
check(M.twilightPhase(-3) === 'civil' && M.twilightPhase(-9) === 'nautical' && M.twilightPhase(-15) === 'astronomical', 'the phases are skymath.js\'s');
const civil = A.twilightFloor(-5);
const night = A.twilightFloor(-25);
const day = A.twilightFloor(20);
check(civil.zenith[2] > 3 * civil.zenith[0] && lum(civil.horizon) > lum(civil.zenith), 'civil twilight: a deep blue, lighter at the horizon');
check(day.zenith.every((v) => v === 0) && day.horizon.every((v) => v === 0), 'by day the model needs no help');
check(lum(night.zenith) > 0 && lum(night.zenith) < 0.004 && lum(night.horizon) > lum(night.zenith), 'the night is almost black, never quite');
check(near(lum(A.twilightFloor(-18).zenith), lum(night.zenith), 1e-9), 'and astronomical twilight ends in the night');
// The shader carries the same numbers: they are written from AIR, not typed twice.
check(A.GLSL_SKY.includes(`const float SKY_HR = ${A.AIR.rayleighScaleKm}.0;`) && A.GLSL_SKY.includes('0.005802') && A.GLSL_SKY.includes(`i < ${A.SKY_STEPS}`), 'the shader\'s constants are the JS constants');
const ground = readFileSync(join(JS, 'sky/groundsky.js'), 'utf8');
check(/skyScatter\(vDir, uSun, sumR, sumM\)/.test(ground) && /exposureFor\(frame\.sunAltDeg\)/.test(ground), 'sky/groundsky.js draws its dome with this model');

// --- the land ----------------------------------------------------------------------------------
check(L.landscapeKind({ darkness: 'city', sea: new Array(16).fill(1) }) === 'city', 'a city is a city, by the sea or not');
check(L.landscapeKind({ darkness: 'dark', sea: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }) === 'coast', 'water within 25 km: a coast');
check(L.landscapeKind({ darkness: 'town', sea: new Array(16).fill(0) }) === 'hills' && L.landscapeKind({}) === 'hills', 'otherwise hills');
// A place on a west coast at the equator: water for every direction with a westward part.
const westSea = L.seaSectors((la, lo) => (lo < 10 ? 1 : 0), 0, 10.02);
check(westSea.length === 16 && westSea[12] === 1 && westSea[4] === 0, 'the sea is read to the west and not to the east');
check(L.seaWords(westSea) === 12, `and the middle of it is due west (${L.seaWords(westSea)})`);
check(L.seaWords(new Array(16).fill(0)) === -1 && L.seaWords(null) === -1, 'no sea, no direction');
const seed = L.seedOf(51.5, -0.1);
check(seed === L.seedOf(51.5, -0.1) && seed !== L.seedOf(48.85, 2.35), 'a place has its seed, another place another');
for (const kind of ['hills', 'city', 'coast']) {
  const p = L.makeProfile(kind, seed, westSea);
  const q = L.makeProfile(kind, seed, westSea);
  let same = true;
  let lo = Infinity;
  let hi = -Infinity;
  for (let a = 0; a < 360; a += 0.7) {
    const az = a * DEG;
    if (p.near(az) !== q.near(az) || p.far(az) !== q.far(az)) same = false;
    const top = Math.max(p.near(az), p.far(az)) / DEG;
    lo = Math.min(lo, top);
    hi = Math.max(hi, top);
  }
  check(same, `${kind}: the same skyline every time for the same place`);
  check(hi < 7 && lo >= 0, `${kind}: the skyline stays between the horizon and seven degrees (${lo.toFixed(2)} to ${hi.toFixed(2)})`);
  const cols = p.columns();
  check(cols.length >= 1441 && cols[0].az === 0 && near(cols[cols.length - 1].az, Math.PI * 2, 1e-9), `${kind}: columns all the way round`);
}
const coast = L.makeProfile('coast', seed, westSea);
check(coast.far(270 * DEG) === 0 && coast.near(270 * DEG) < 0 && coast.far(90 * DEG) > 0.3 * DEG, 'on a coast the sea horizon is flat and level, and the land is behind you');
const other = L.makeProfile('hills', L.seedOf(48.85, 2.35), null);
const here = L.makeProfile('hills', seed, null);
let differ = 0;
for (let a = 0; a < 360; a += 5) if (Math.abs(other.far(a * DEG) - here.far(a * DEG)) > 0.1 * DEG) differ += 1;
check(differ > 20, 'two places have two skylines');
const city = L.makeProfile('city', seed, null);
let walls = 0;
for (let i = 0; i < 1440; i += 1) if (city.near(((i + 0.5) / 1440) * 2 * Math.PI) !== city.near(((i + 1.5) / 1440) * 2 * Math.PI)) walls += 1;
check(walls > 150 && walls < 1300, `a city is roofs with walls between them (${walls})`);

if (problems.length) { console.error('skyair FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`skyair ok: ${up.map((v) => v.toFixed(3)).join(' / ')} optical depths overhead, ${A.chapman(x, 0).toFixed(1)} air masses on the horizon, a blue noon, a red sunset on the Sun's side, a blue hour, and three kinds of land`);
