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

if (problems.length) { console.error('skyview FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('skyview ok: a light-pollution glow rings the horizon at night, a risen Moon lifts the dome, and both fade to nothing once the Sun or the Moon say they should');
