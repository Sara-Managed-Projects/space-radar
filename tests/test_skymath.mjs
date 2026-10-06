// tests/test_skymath.mjs -- the air and the eye as numbers (sky/skymath.js), and the planets from
// one place (sky/skybodies.js) against Astronomy Engine's own answers.
//   node tests/test_skymath.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const M = await import(join(JS, 'sky/skymath.js'));
const B = await import(join(JS, 'sky/skybodies.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { sunPhaseName, readSkyOptions, writeSkyOptions, SKY_OPTION_DEFAULTS, SKY_OPTIONS_KEY, horizonGlowStrength } = await import(join(JS, 'sky/skyview.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- refraction: Saemundsson, and the same numbers Astronomy Engine gives for 'normal' -------------
check(near(M.refractionDeg(0) * 60, 28.98, 0.1), `29 arcminutes on the horizon (${(M.refractionDeg(0) * 60).toFixed(2)})`);
check(near(M.refractionDeg(5) * 60, 9.7, 0.3), `under 10 arcminutes at 5 degrees (${(M.refractionDeg(5) * 60).toFixed(2)})`);
check(near(M.refractionDeg(45) * 60, 1.0, 0.05), `one arcminute at 45 degrees (${(M.refractionDeg(45) * 60).toFixed(2)})`);
check(M.refractionDeg(90) === 0, 'nothing at the zenith, and never negative');
for (const h of [-5, -1, -0.5, 0, 0.5, 2, 10, 30, 60, 89]) {
  check(near(M.refractionDeg(h), A.Refraction('normal', h), 1e-9), `refraction at ${h} degrees is Astronomy Engine's (${M.refractionDeg(h)} vs ${A.Refraction('normal', h)})`);
}
check(M.refractionDeg(NaN) === 0, 'a non-finite altitude lifts nothing');
let mono = true;
for (let h = -1; h < 89; h += 1) if (M.refractionDeg(h + 1) > M.refractionDeg(h)) mono = false;
check(mono, 'refraction only falls as the altitude climbs');

// --- air mass and extinction -----------------------------------------------------------------------
check(near(M.airmass(90), 1, 1e-3), `one air mass overhead (${M.airmass(90)})`);
check(near(M.airmass(30), 2.0, 0.01), `two at 30 degrees (${M.airmass(30)})`);
check(near(M.airmass(0), 38, 0.5), `about 38 on the horizon (${M.airmass(0)})`);
check(M.airmass(-5) === M.airmass(0), 'under the horizon is the horizon: no infinity');
check(near(M.extinctionMag(90), 0, 1e-3) && near(M.extinctionMag(30), 0.2, 0.01), 'extinction is counted from the zenith: 0.2 magnitudes more at 30 degrees');
check(M.extinctionMag(2) > 2.5 && M.extinctionMag(2) < 4.5, `a star 2 degrees up has lost about three magnitudes (${M.extinctionMag(2).toFixed(2)})`);
const tintLow = M.extinctionTint(2);
const tintHigh = M.extinctionTint(80);
check(tintLow[0] === 1 && tintLow[1] < 0.6 && tintLow[2] < tintLow[1], `low down the air takes blue first, then green (${tintLow.map((v) => v.toFixed(2))})`);
check(tintHigh.every((v) => v > 0.99), 'high up the colour is the star\'s own');
check(near(M.flattening(0), 0.83, 0.04) && M.flattening(45) === 1, `a disc on the horizon is squashed by a sixth (${M.flattening(0).toFixed(3)})`);

// --- twilight ------------------------------------------------------------------------------------------
const phases = [[10, 'day'], [6, 'day'], [3, 'golden'], [0, 'golden'], [-0.1, 'civil'], [-6, 'civil'], [-6.1, 'nautical'], [-12, 'nautical'], [-12.1, 'astronomical'], [-18, 'astronomical'], [-18.1, 'night'], [-40, 'night']];
for (const [alt, name] of phases) check(M.twilightPhase(alt) === name, `the Sun at ${alt} degrees is ${name} (${M.twilightPhase(alt)})`);
check(M.twilightPhase(NaN) === null && sunPhaseName(-7) === 'nautical', 'sky/skyview.js sunPhaseName is the same function');
check(M.twilightDrop(-30) === 0 && M.twilightDrop(-18) === 0 && M.twilightDrop(10) === 12, 'night costs nothing, day costs every star');
let rising = true;
for (let a = -18; a < 6; a += 0.5) if (M.twilightDrop(a + 0.5) < M.twilightDrop(a)) rising = false;
check(rising, 'the brighter the twilight, the fewer stars: no step backwards');

// --- the magnitude limit by field of view ------------------------------------------------------------
const lim = (o) => M.limitingMagnitude(o);
check(lim({ fovDeg: 72 }) === 6.5 && lim({ fovDeg: 120 }) === 6.5, `the eye in a dark place sees to 6.5, however wide the field (${lim({ fovDeg: 72 })})`);
check(near(lim({ fovDeg: 7 }), 9.3, 0.05), `binoculars' 7 degree field goes to about 9.3 (${lim({ fovDeg: 7 }).toFixed(2)})`);
check(near(lim({ fovDeg: 1 }), 11.83, 0.05), `a telescope's 1 degree field to about 11.8 (${lim({ fovDeg: 1 }).toFixed(2)})`);
check(near(lim({ fovDeg: 6 }) - lim({ fovDeg: 60 }), 3, 1e-9), 'three magnitudes for every ten times narrower');
check(lim({ fovDeg: 72, darkness: 'city' }) === 4 && lim({ fovDeg: 72, darkness: 'town' }) === 5.3, 'a city sky stops at 4, a town\'s edge at 5.3');
check(near(lim({ fovDeg: 72, moon: 1 }), 4.5, 1e-9), 'a full Moon high up takes two magnitudes');
check(lim({ fovDeg: 72, sunAltDeg: -6 }) < 3.2 && lim({ fovDeg: 72, sunAltDeg: -6 }) > 2.5, `at the end of civil twilight only the bright stars are left (${lim({ fovDeg: 72, sunAltDeg: -6 }).toFixed(2)})`);
check(lim({ fovDeg: 72, sunAltDeg: 20 }) < -4.7, 'by day not even Venus is drawn as a point');
check(lim({ fovDeg: 72, darkness: 'nonsense' }) === 6.5, 'an unknown kind of sky is the default, not NaN');
check(M.fovName(72) === 'eye' && M.fovName(30) === 'eye' && M.fovName(7) === 'binoculars' && M.fovName(3) === 'binoculars' && M.fovName(1) === 'telescope', 'the three named fields');
check(M.clampFov(500) === M.FOV.max && M.clampFov(0.001) === M.FOV.min && M.clampFov(NaN) === M.FOV.eye, 'the field stays inside what the view offers');
check(near(M.zoomFov(72, 0.5), 36, 1e-9) && M.zoomFov(M.FOV.min, 0.5) === M.FOV.min && M.zoomFov(72, NaN) === 72, 'zoom multiplies and stops at the ends');
check(near(M.pixelsPerDegree(90, 900), 450 * Math.PI / 180, 1e-6), 'pixels to a degree at the centre of the view');
const dim = M.starLook(6.5, 6.5);
const bright = M.starLook(-1.4, 6.5);
check(dim.size < 2 && dim.alpha < 0.4 && dim.glare === 0 && bright.size > 6 && bright.alpha === 1 && bright.glare > 0.5, 'a star at the limit is a faint speck, Sirius a glare');
check(M.starLook(8, 6.5).alpha === 0, 'a star well under the limit is not drawn');

// The shaders run the same formulas: the constants are in the GLSL as they are in the JS.
for (const bit of ['1.02 / tan(radians(h + 10.3 / (h + 5.11)))', '0.50572 * pow(hDeg + 6.07995, -1.6364)']) check(M.GLSL_AIR.includes(bit), `GLSL_AIR carries ${bit}`);
const ground = readFileSync(join(JS, 'sky/groundsky.js'), 'utf8');
check(ground.includes('clamp((f + 0.6) / 2.2, 0.0, 1.0)') && ground.includes('min(12.0, 1.5 * pow(1.32, max(f, 0.0)))') && ground.includes('clamp((f - 4.5) / 4.0, 0.0, 1.0)'), 'the star shader draws starLook()\'s curve');
check(ground.includes('exp(-0.045 * x), exp(-0.11 * x)'), 'the star shader reddens by extinctionTint()\'s factors');
check((ground.match(/new THREE\.Points\(/g) || []).length === 2, 'two point clouds: every star in one draw call, the planets and Jupiter\'s moons in another');
check(!/^import[^\n]*groundsky/m.test(readFileSync(join(JS, 'main.js'), 'utf8')) && /import\('\.\/groundsky\.js'\)/.test(readFileSync(join(JS, 'sky/skyview.js'), 'utf8')), 'the ground sky is a dynamic import from the sky view, never at boot');
check(/prefers-reduced-motion: reduce/.test(ground) && /uTwinkle: \{ value: reducedMotion \? 0 : 1 \}/.test(ground), 'twinkling is off under reduced motion');

// --- the choices, stored ---------------------------------------------------------------------------------
const mem = new Map();
const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
check(JSON.stringify(readSkyOptions(storage)) === JSON.stringify(SKY_OPTION_DEFAULTS), 'nothing stored: the defaults');
writeSkyOptions(storage, { ...SKY_OPTION_DEFAULTS, red: true, darkness: 'city', grid: true });
const got = readSkyOptions(storage);
check(got.red === true && got.darkness === 'city' && got.grid === true && got.figures === true, 'red light, the kind of sky and the grid are remembered');
mem.set(SKY_OPTIONS_KEY, '{"darkness":"moon","red":"yes","evil":1}');
const bad = readSkyOptions(storage);
check(bad.darkness === 'dark' && bad.red === false && !('evil' in bad), 'a stored value of the wrong kind is the default; an unknown key is dropped');
mem.set(SKY_OPTIONS_KEY, 'not json');
check(readSkyOptions(storage).figures === true && readSkyOptions({ getItem() { throw new Error('private'); } }).names === true, 'a storage that throws or holds rubbish is the defaults');
check(horizonGlowStrength(-18, 'city') > horizonGlowStrength(-18, 'town') && horizonGlowStrength(-18, 'town') > horizonGlowStrength(-18, 'dark') && horizonGlowStrength(-18, 'dark') > 0, 'the glow on the horizon is the chosen sky\'s: city over town over a dark place');

// --- the bodies, against Astronomy Engine ---------------------------------------------------------------
const obs = new A.Observer(40, 0, 0);
const date = new Date('2026-10-10T19:00:00Z');
const KM_PER_AU = 1.4959787069098932e8;
for (const row of B.BODIES) {
  const v = B.bodyView(row.id, date, obs);
  check(!!v, `${row.id} has a view`);
  if (!v) continue;
  const eq = A.Equator(row.body, date, obs, true, true);
  const hor = A.Horizon(date, obs, eq.ra, eq.dec, null);
  check(near(v.altDeg, hor.altitude, 0.01) && near(Math.cos((v.azDeg - hor.azimuth) * Math.PI / 180), 1, 1e-7), `${row.id}: altitude and azimuth are Astronomy Engine's (${v.altDeg.toFixed(3)} vs ${hor.altitude.toFixed(3)})`);
  const size = 2 * Math.asin(row.radiusKm / (eq.dist * KM_PER_AU)) * 180 / Math.PI;
  check(near(v.diameterDeg, size, size * 1e-6), `${row.id}: apparent size is its radius over its distance`);
  if (row.id !== 'sun') {
    const il = A.Illumination(row.body, date);
    check(v.mag === il.mag && v.phaseFraction === il.phase_fraction, `${row.id}: magnitude and phase are Illumination()'s`);
    // The lit share of the disc, from the geometry the shader lights it with: (1 + cos phase) / 2.
    const cosPhase = -(v.toSun[0] * v.dir[0] + v.toSun[1] * v.dir[1] + v.toSun[2] * v.dir[2]);
    check(near((1 - cosPhase) / 2, 1 - il.phase_fraction, 0.01), `${row.id}: the Sun's direction lights the share of the disc Illumination() says (${((1 + -cosPhase) / 2).toFixed(3)} dark vs ${(1 - il.phase_fraction).toFixed(3)})`);
  }
  const f = v.frame;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  check(near(dot(f.x, f.x), 1, 1e-9) && near(dot(f.x, f.z), 0, 1e-9) && near(dot(f.y, f.z), 0, 1e-9), `${row.id}: its axes are square`);
}
const moon = B.bodyView('moon', date, obs);
check(moon.diameterDeg > 0.48 && moon.diameterDeg < 0.57, `the Moon is half a degree wide (${moon.diameterDeg.toFixed(3)})`);
const sat = B.bodyView('saturn', date, obs);
check(near(sat.diameterDeg * 3600, 19.7, 0.6) && near(sat.ringTiltDeg, A.Illumination('Saturn', date).ring_tilt, 1e-12), `Saturn in October 2026: 20 arcseconds, rings tilted ${sat.ringTiltDeg.toFixed(1)} degrees`);
// The pole the shader tilts the rings by gives the same tilt Illumination() reports.
const poleTilt = Math.asin(-(sat.frame.z[0] * sat.dir[0] + sat.frame.z[1] * sat.dir[1] + sat.frame.z[2] * sat.dir[2])) * 180 / Math.PI;
check(near(Math.abs(poleTilt), Math.abs(sat.ringTiltDeg), 0.2), `Saturn's pole leans to us by the ring tilt (${poleTilt.toFixed(2)} vs ${sat.ringTiltDeg.toFixed(2)})`);
// The Moon's face: the sub-Earth point from its axes is the libration Astronomy Engine reports.
{
  const lib = A.Libration(date);
  const gm = A.GeoMoon(date);
  const n = Math.hypot(gm.x, gm.y, gm.z);
  const toEarth = [-gm.x / n, -gm.y / n, -gm.z / n];
  const mf = B.bodyFrame(A.RotationAxis('Moon', date));
  const d = (a) => a[0] * toEarth[0] + a[1] * toEarth[1] + a[2] * toEarth[2];
  const lat = Math.asin(d(mf.z)) * 180 / Math.PI;
  const lon = Math.atan2(d(mf.y), d(mf.x)) * 180 / Math.PI;
  check(near(lat, lib.elat, 0.3) && near(lon, lib.elon, 0.3), `the Moon's face is turned as its libration says (sub-Earth ${lon.toFixed(2)}, ${lat.toFixed(2)} vs ${lib.elon.toFixed(2)}, ${lib.elat.toFixed(2)})`);
}
// eqjToLocal agrees with Horizon for a star, and is a rotation.
{
  const m = B.eqjToLocal(date, obs);
  const pol = B.altAzOf(B.localOf(m, [0, 0, 1]));
  check(near(pol.altDeg, 40, 0.3) && (pol.azDeg < 1 || pol.azDeg > 359), `the pole of the sky stands 40 degrees up in the north from 40 degrees north (${pol.altDeg.toFixed(2)}, ${pol.azDeg.toFixed(2)})`);
  const l = B.localOf(m, [0.6, 0, 0.8]);
  check(near(Math.hypot(...l), 1, 1e-9), 'a unit vector stays one');
}
const jm = B.jupiterMoons(date, obs);
check(jm.length === 4 && jm.every((x) => Number.isFinite(x.mag) && x.offsetRadii >= 0 && x.offsetRadii < 30), 'four moons of Jupiter, each within 30 radii of it');
check(B.bodyView('pluto', date, obs) === null && B.bodyView('moon', date, null) === null, 'an unknown body or no observer is null, not a throw');

if (problems.length) { console.error('skymath FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`skymath ok: refraction ${(M.refractionDeg(0) * 60).toFixed(1)}' on the horizon as Astronomy Engine has it, ${M.airmass(0).toFixed(0)} air masses there, limits 6.5 / ${lim({ fovDeg: 7 }).toFixed(1)} / ${lim({ fovDeg: 1 }).toFixed(1)} for the eye, binoculars and a telescope, six twilight phases, nine bodies with Astronomy Engine's positions, sizes and phases, the Moon's face by its libration, Saturn's rings at ${sat.ringTiltDeg.toFixed(1)} degrees`);
