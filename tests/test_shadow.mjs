// tests/test_shadow.mjs -- spec 0026 req 12: sunlit or in Earth's shadow, on every glyph and card.
import { fileURLToPath } from 'node:url';
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

if (problems.length) { console.error('shadow FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('shadow ok: the cylinder test lights the Sun side and shadows the far side; the real stage agrees at 400 km');
