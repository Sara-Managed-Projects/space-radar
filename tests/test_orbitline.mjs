// tests/test_orbitline.mjs -- spec 0026 req 13: one lap of the selection's orbit, from the same elements.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { sampleOrbit, periodMsOf, createOrbitLine, SAMPLES } = await import(join(JS, 'scene/orbitline.js'));
const { orbitLineLine } = await import(join(JS, 'ui/cards.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// a circle: the lap closes, every sample is on the circle
const T = 90 * 60e3;
const circle = (t) => ({ x: Math.cos(2 * Math.PI * t / T), y: Math.sin(2 * Math.PI * t / T), z: 0 });
const pts = sampleOrbit(circle, 0, T, 120);
check(pts.length === (120 + 1) * 3, `120 samples plus the closing point (${pts.length / 3})`);
check(Math.abs(pts[0] - pts[pts.length - 3]) < 1e-9 && Math.abs(pts[1] - pts[pts.length - 2]) < 1e-9, 'the loop closes on its first point');
let onCircle = true; for (let i = 0; i < pts.length; i += 3) if (Math.abs(Math.hypot(pts[i], pts[i + 1]) - 1) > 1e-9) onCircle = false;
check(onCircle, 'every sample is on the path');
// a propagator that fails for part of the lap: fewer points, no throw
const flaky = (t) => (t < T / 2 ? circle(t) : null);
check(sampleOrbit(flaky, 0, T, 120).length === (60 + 1) * 3, 'null samples are skipped, the rest still close');
check(sampleOrbit(() => null, 0, T, 120).length === 0, 'nothing sampled, nothing drawn');

// which things lap
check(periodMsOf({ propagator: 'sgp4', meta: { periodMin: 92.9 } }) === 92.9 * 60e3, 'an SGP4 record uses its period in minutes');
check(Math.abs(periodMsOf({ propagator: 'sgp4', satrec: { no: 0.0676 }, meta: {} }) - (2 * Math.PI / 0.0676) * 60e3) < 1, 'or the satrec mean motion');
check(periodMsOf({ propagator: 'kepler', meta: { periodYears: 3.3 } }) === 3.3 * 365.25 * 86400e3, 'a Kepler record uses its period in years');
check(periodMsOf({ propagator: 'ascent', meta: {} }) === null && periodMsOf({ propagator: 'fixed', meta: {} }) === null && periodMsOf({ propagator: 'static', meta: {} }) === null, 'a launch, a site and a star do not lap');
check(orbitLineLine({ propagator: 'sgp4', meta: { periodMin: 93 } }).includes('one lap') && orbitLineLine({ propagator: 'kepler', meta: { periodYears: 76 } }).includes('coming year') && orbitLineLine({ propagator: 'fixed', meta: {} }) === null, 'the card says one lap, or the coming year, or nothing');

// the real thing: the ISS's real elements make a closed loop about 6 800 km from Earth's centre
{
  const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
  const { readFileSync } = await import('node:fs');
  const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
  const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
  const epoch = Number.isFinite(iss.epoch) ? iss.epoch : Date.parse('2026-09-07T00:00:00Z');
  stage.setWorld('earth'); stage.setTime(epoch);
  const scene = new THREE.Scene();
  const ol = createOrbitLine(scene, {});
  ol.setRecord(iss);
  ol.update(epoch);
  check(ol.hasLine() === true, 'the ISS gets a line');
  const pos = ol.line.geometry.attributes.position.array;
  const n = ol.line.geometry.drawRange.count;
  check(n === SAMPLES + 1, `${SAMPLES} samples plus closure (${n})`);
  let rmin = Infinity, rmax = 0;
  for (let i = 0; i < n; i++) { const r = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
  check(rmin > 6.6 && rmax < 7.0, `the loop stays 6 600-7 000 km from the centre (${(rmin * 1000).toFixed(0)}-${(rmax * 1000).toFixed(0)} km)`);
  ol.setRecord({ propagator: 'fixed', meta: {} });
  check(ol.hasLine() === false, 'a site clears the line');
  ol.dispose();
}

if (problems.length) { console.error('orbit line FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('orbit line ok: a closed lap from the record\'s own propagator; the ISS loops at 6 700 km; things that do not lap get no line');
