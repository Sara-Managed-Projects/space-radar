// tests/test_trip_layer_wait.mjs -- a trip does not wait eight seconds for a layer that has already
// landed (internal #454, #419 item 1).
//
//   node tests/test_trip_layer_wait.mjs
//
// ui/trip.js is imported on the first press of a trip, after the bundled layers announced themselves
// with `sr:layer`; its own `landed` set never heard them, and "The strangest things we have ever
// sent" (requires: [oddities]) sat 8.0 to 9.8 s between start() and its intro in every run of
// 2026-10-08. main.js now answers ctx.layerLanded(id). Held here on the real machine:
//   - with the layer landed before the machine exists, plan() answers at once (under 500 ms);
//   - with the layer not landed, the machine still waits for its event (it has not answered after
//     300 ms), and answers as soon as `sr:layer` names the layer;
//   - main.js defines ctx.layerLanded from the map one() fills on success AND on failure.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const listeners = new Map();
globalThis.window = {
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { if (listeners.has(type)) listeners.get(type).delete(fn); },
  dispatchEvent(e) { for (const fn of [...(listeners.get(e.type) || [])]) fn(e); return true; },
};
globalThis.requestAnimationFrame = () => 0;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));

const ID = 'strangest-things';
const row = TOURS.find((t) => t.id === ID);
check(row && (row.requires || []).includes('oddities'), 'the trip under test requires the bundled oddities layer');

function makeCtx(landedNow) {
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  return {
    camera, cameraRig: createCameraRig(camera, null, { worldRadius: 6.371 }), clock,
    layers: [{ id: 'oddities' }, { id: 'worlds', draw: 'worlds' }],
    layerLanded: (id) => landedNow.has(id),
    recordsFor: () => [], recordById: () => null, isLayerOn: () => true, setLayerOn() {}, select() {}, deselect() {}, selected: () => null, observer: null,
  };
}
const needed = new Set(row ? [...(row.requires || []), ...row.stops.flatMap((s) => [s.needs_layer, s.target && s.target.layer]).filter(Boolean)] : []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Everything landed before the machine was made: no wait.
{
  const t0 = performance.now();
  await createTrip(makeCtx(needed)).plan(ID);
  const ms = performance.now() - t0;
  check(ms < 500, `layers that landed before ui/trip.js was imported are not waited for: plan() took ${Math.round(ms)} ms`);
}
// 2. Not landed: it waits for the event, and the event ends the wait.
{
  let answered = false;
  const t0 = performance.now();
  const p = createTrip(makeCtx(new Set())).plan(ID).then(() => { answered = true; });
  await sleep(300);
  check(!answered, 'a layer that has not landed is still waited for');
  for (const id of needed) window.dispatchEvent({ type: 'sr:layer', detail: { id, count: 0 } });
  await Promise.race([p, sleep(1000)]);
  check(answered, `sr:layer ends the wait (${Math.round(performance.now() - t0)} ms)`);
}
// 3. main.js keeps the answer for both endings of a load.
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/ctx\.layerLanded = \(id\) => layerRecords\.has\(id\);/.test(main), 'main.js answers ctx.layerLanded from layerRecords');
check(/catch \(err\) \{[\s\S]{0,240}layerRecords\.set\(layer\.id, \[\]\)/.test(main), 'a layer that failed is in layerRecords too, so a failure is not waited for either');

if (problems.length) { console.error('trip layer wait FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trip layer wait ok: a trip whose layers landed before its machine was imported plans at once; one that has not landed waits for sr:layer and no longer');
process.exit(0);
