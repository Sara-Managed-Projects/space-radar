// tests/test_skyview.mjs -- the sky from here is not a flat black slab at night: a light-pollution
// glow hugs the whole horizon once the sky is actually dark, and a risen Moon lifts the dome and
// brightens it, fading both out once the sun's own twilight glow would take over. Issue #311 /
// #252: "a black slab of ground... near-black sky... no horizon glow".
//   node tests/test_skyview.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createSkyView, horizonGlowStrength, moonBrightness } = await import(join(JS, 'sky/skyview.js'));

// 1. the pure functions, against the shape the issue asks for.
check(horizonGlowStrength(-18) === 0.3, `full night carries a constant glow (${horizonGlowStrength(-18)})`);
check(horizonGlowStrength(-10) === 0.3, `still full strength at -10 (${horizonGlowStrength(-10)})`);
check(horizonGlowStrength(0) === 0, `by sunrise/sunset it has faded out (${horizonGlowStrength(0)})`);
check(horizonGlowStrength(6) === 0, `in daylight there is none (${horizonGlowStrength(6)})`);
const mid = horizonGlowStrength(-5);
check(mid > 0 && mid < 0.3, `between -10 and 0 it fades, not a cliff (${mid})`);
check(horizonGlowStrength(NaN) === 0, 'a non-finite sun elevation is not drawn as a glow');

check(moonBrightness(45, 1) === 1, `a full Moon high up is full strength (${moonBrightness(45, 1)})`);
check(moonBrightness(-5, 1) === 0, 'below the horizon it does nothing however full it is');
check(moonBrightness(45, 0) === 0, 'a new Moon does nothing however high it is');
check(moonBrightness(10, 1) > 0 && moonBrightness(10, 1) < 1, `low and full is partial, not full strength (${moonBrightness(10, 1)})`);
check(moonBrightness(45, 0.5) < moonBrightness(45, 1), 'a half Moon brightens the sky less than a full one at the same altitude');

// 2. wired in: enter() + update() at a real instant must leave the dome and the ground with finite,
// in-range uniforms -- not NaN, not untouched defaults -- whatever the Sun and Moon are doing.
function makeCtx() {
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.001, 1e9);
  const scene = new THREE.Scene();
  return { camera, scene, stage };
}

const NIGHT_LONDON = { latDeg: 51.5, lonDeg: -0.13, altKm: 0 };
const tNight = Date.parse('2026-01-10T02:00:00Z'); // the small hours, midwinter: the Sun is well down

{
  const ctx = makeCtx();
  const sky = createSkyView(ctx);
  check(sky.enter(NIGHT_LONDON) === true, 'enter() accepts a plain lat/lon/alt observer');
  sky.update(tNight);
  const dome = ctx.scene.getObjectByName('sky-from-here')?.children?.[0];
  check(!!dome && dome.material?.uniforms?.uHorizonGlowStrength, 'the dome carries the new light-pollution uniform');
  const u = dome.material.uniforms;
  check(Number.isFinite(u.uHorizonGlowStrength.value) && u.uHorizonGlowStrength.value > 0,
    `at 2 a.m. in January the horizon glow is on, not zero (${u.uHorizonGlowStrength.value})`);
  check(Number.isFinite(u.uMoonBrightness.value) && u.uMoonBrightness.value >= 0 && u.uMoonBrightness.value <= 1,
    `moon brightness is a finite fraction (${u.uMoonBrightness.value})`);
  const ground = ctx.scene.getObjectByName('sky-from-here')?.children?.[1];
  const gc = ground?.material?.uniforms?.uColor?.value;
  check(!!gc && Number.isFinite(gc.r) && Number.isFinite(gc.g) && Number.isFinite(gc.b),
    'the ground silhouette picks up a finite tint, not NaN');
  check(gc.r > 0 || gc.g > 0 || gc.b > 0, `a lit night gives the skyline some warmth, not pure black (${gc.r},${gc.g},${gc.b})`);
  sky.exit();
}

// 3. Turning the sky to something (internal #393 finding 7): a star or a nebula by its place among
// the stars, a planet by name, worked out for the clock's own instant; under the horizon it says so
// and does not turn; a satellite has no fixed place and is left alone.
{
  const LY = 9460730472580.8;
  const ctx = makeCtx();
  ctx.clock = { now: () => Date.parse('2026-12-15T00:00:00Z') };
  const sky = createSkyView(ctx);
  sky.enter({ latDeg: 40, lonDeg: 0, altKm: 0 });
  sky.update(ctx.clock.now());
  // Orion's nebula, as its record has it: sun-inertial (ecliptic J2000) kilometres.
  const eq = (ra, dec) => { const a = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
  const ecl = (v) => { const e = 23.4392911 * Math.PI / 180; return { x: v[0], y: v[1] * Math.cos(e) + v[2] * Math.sin(e), z: -v[1] * Math.sin(e) + v[2] * Math.cos(e) }; };
  const at = (ra, dec, ly) => { const p = ecl(eq(ra, dec)); return { x: p.x * ly * LY, y: p.y * ly * LY, z: p.z * ly * LY }; };
  const m42 = { id: 'dso-m42', klass: 'dso', frame: 'sun-inertial', pos: at(83.82, -5.39, 1344) };
  check(sky.pointAtRecord(m42, { mark: false }) === 'shown', 'the Orion Nebula is up at midnight in December: the sky turns to it');
  // At 40 N it culminates at 90 - 40 - 5.4 = 44.6 degrees, due south, about then.
  check(Math.abs(sky.look.altitudeDeg - 44.6) < 1.5 && Math.abs(sky.look.azimuthDeg - 180) < 12, `it is ${sky.look.altitudeDeg.toFixed(1)} up at azimuth ${sky.look.azimuthDeg.toFixed(1)} (44.6, south)`);
  const before = { ...sky.look };
  const crux = { id: 'hip-60718', klass: 'star', frame: 'sun-inertial', pos: at(186.65, -63.1, 320) };
  check(sky.pointAtRecord(crux) === 'below', 'the Southern Cross never rises at 40 north: said, not shown');
  check(sky.look.azimuthDeg === before.azimuthDeg && sky.look.altitudeDeg === before.altitudeDeg, 'and the sky does not turn');
  check(sky.pointAtRecord({ id: 'jupiter', klass: 'world' }) === 'shown', 'Jupiter, by name, where it is now');
  check(sky.pointAtRecord({ id: 'earth', klass: 'world' }) === null && sky.pointAtRecord({ id: 'sat-25544', klass: 'station', pos: { x: 1, y: 1, z: 1 } }) === null, 'the ground and a satellite are not places among the stars');
  check(sky.pickSky(100, 100) === null, 'no ground layer, no picture under a tap');
  // The same call from RA and Dec, and it survives a clock that has just jumped.
  ctx.clock.now = () => Date.parse('2026-10-10T22:00:00Z');
  check(sky.pointAt({ raDeg: 10.68, decDeg: 41.27 }, { mark: false }) === true && Math.abs(sky.look.altitudeDeg - 73.7) < 1, `Andromeda on 10 October at 22:00 UTC is ${sky.look.altitudeDeg.toFixed(1)} up (73.7), before any frame has seen the new time`);
  sky.exit();
  check(sky.pointAtRecord(m42) === null, 'outside the sky view nothing turns');
}

// 4. Text-level: + and - zoom the sky, launches are not drawn from the ground, and the scene's own
// labels there are only the asked-for ones (internal #393 findings 2, 3 and 7).
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(join(JS, 'sky/skyview.js'), 'utf8');
  check(/e\.key === '\+' \|\| e\.key === '='/.test(src) && /addEventListener\('keydown', onKeyDown\)/.test(src) && /removeEventListener\('keydown', onKeyDown\)/.test(src), '+ and - are bound while the sky view is up, and unbound when it is left');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/layer\.id === 'launches' && ctx\.skyView && ctx\.skyView\.ownsSky\) return false/.test(main), 'the launches layer is not drawn from the ground');
  const labels = await import(join(JS, 'ui/labels.js'));
  check(labels.SKY_VIEW_CAP <= 4, 'the scene names at most four things in the sky from the ground');
  const lsrc = readFileSync(join(JS, 'ui/labels.js'), 'utf8');
  check(/ownsSky\) chosen = chosen\.filter\(\(c\) => labelTier\(c\) <= TIER\.station\)/.test(lsrc), 'and only the selection, its train and the crewed stations');
  check(/ctx\.labels\.boxes\(\)/.test(readFileSync(join(JS, 'sky/groundsky.js'), 'utf8')), 'the ground sky places its names clear of them');
}

if (problems.length) { console.error('skyview FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('skyview ok: a light-pollution glow rings the horizon at night, a risen Moon lifts the dome, and both fade to nothing once the Sun or the Moon say they should');
