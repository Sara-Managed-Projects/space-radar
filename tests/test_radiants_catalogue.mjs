// tests/test_radiants_catalogue.mjs -- the IAU's other established showers are MARKED in the sky view where their radiant is
// (release 1.5.0, 0079 a6). The first look run of the branch showed no mark: the sprite was never moved from the camera.
//
//   node tests/test_radiants_catalogue.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const g2d = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
const cls = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => g2d, style: {}, addEventListener() {}, setAttribute() {} }), baseURI: 'http://localhost/', documentElement: { classList: cls }, body: { classList: cls }, addEventListener() {}, getElementById: () => null };
globalThis.window = globalThis;
globalThis.dispatchEvent = () => true;
globalThis.addEventListener = () => {};
globalThis.CustomEvent = globalThis.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
globalThis.fetch = async (p) => ({ ok: true, json: async () => JSON.parse(readFileSync(join(ROOT, 'site', p), 'utf8')) });
const log = console.log; console.log = () => {}; // the ground sky cannot load without a page and says so
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createSkyView } = await import(join(ROOT, 'site/js/sky/skyview.js'));
const t = Date.UTC(2026, 9, 9, 18, 30);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1.7, 0.1, 1e9);
let on = true;
const view = createSkyView({ camera, scene, isLayerOn: () => on, clock: { now: () => t }, stage: { toScene: () => new THREE.Vector3() } });
view.enter({ latDeg: 50, lonDeg: 10, altKm: 0.2 });
const marks = () => { let g = null; scene.traverse((o) => { if (o.name === 'sky-radiants') g = o; }); return g ? g.children : []; };
view.update(t);
await new Promise((r) => setTimeout(r, 400));
view.update(t);
console.log = log;
const m = marks().filter((s) => s.userData.shower.catalogue);
check(m.length >= 1 && m.some((s) => s.userData.shower.id === 'shower-october-draconids'), `on the Draconids' night the Draconids are marked (${marks().map((s) => s.userData.shower.id)})`);
for (const s of m) check(s.position.length() > 1 && s.visible, `${s.userData.shower.id}: the mark sits on the dome, not at the camera (${s.position.length().toFixed(1)})`);
const d = m.find((s) => s.userData.shower.id === 'shower-october-draconids');
// where it is: altitude 63.7 degrees, azimuth 297.7 from 50 N 10 E at 18:30 UTC (sky/radiants.js radiantAltAz); +Y is up
check(d && Math.abs(Math.asin(d.position.y / d.position.length()) * 180 / Math.PI - 63.7) < 0.5, 'at an altitude of 63.7 degrees');
on = false; view.update(t);
check(marks().filter((s) => s.userData.shower.catalogue).length === 0, 'the Meteor showers box off takes them away');
if (problems.length) { console.error('radiants catalogue FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`radiants catalogue ok: ${m.length} catalogue radiants marked on the Draconids' night, each on the dome at its altitude, none when the box is off`);
process.exit(0);
