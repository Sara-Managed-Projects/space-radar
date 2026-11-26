// tests/test_mapapi.mjs -- window.srMap, the map's scripting API (ui/mapapi.js, docs/PLUGINS.md, research train 6b):
// the pure helpers, the camera, the clock, a landing site's ground, the provided skyline, the tool slots and the panel,
// the overlay's day, the recording sizes, and that main.js loads it late and never in an embed.
//
//   node tests/test_mapapi.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/minidom.mjs';

const { Node } = installDom();
// What ui/mapapi.js asks of the page beyond the shared small DOM: attribute selectors, a head, events on document.
const baseMatches = Node.prototype.matches;
Node.prototype.matches = function matches(sel) {
  const m = /^\[([a-z-]+)(?:="([^"]*)")?\]$/.exec(sel);
  if (m) return m[1] in this.attrs && (m[2] === undefined || this.attrs[m[1]] === m[2]);
  return baseMatches.call(this, sel);
};
const docEvents = new EventTarget();
document.head = new Node('head');
document.querySelectorAll = (sel) => [...document.head.querySelectorAll(sel), ...document.body.querySelectorAll(sel)];
document.addEventListener = (t, f) => docEvents.addEventListener(t, f);
document.removeEventListener = (t, f) => docEvents.removeEventListener(t, f);
document.dispatchEvent = (e) => docEvents.dispatchEvent(e);
globalThis.CustomEvent = class extends Event { constructor(type, init) { super(type); this.detail = init ? init.detail : null; } };
const winEvents = new EventTarget();
globalThis.addEventListener = (t, f) => winEvents.addEventListener(t, f);
globalThis.removeEventListener = (t, f) => winEvents.removeEventListener(t, f);
globalThis.dispatchEvent = (e) => winEvents.dispatchEvent(e);
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);

const M = await import('../site/js/ui/mapapi.js');
const { toolSlot, TOOL_PLACES } = await import('../site/js/ui/toolslot.js');
const { realProfile } = await import('../site/js/sky/landscape.js');
const R = await import('../site/js/ui/mapapirecord.js');

let passed = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { passed += 1; }, (e) => { console.error(`FAIL ${name}`); throw e; });
const tick = () => new Promise((r) => setTimeout(r, 5));

// ---------------------------------------------------------------------------------------------------------- pure
await ok('cleanPose', () => {
  assert.deepEqual(M.cleanPose({ target: 'moon', azimuthDeg: -30, polarDeg: 200, distanceKm: 5000 }), { target: 'moon', azimuthDeg: 330, polarDeg: 179.9, distanceKm: 5000 });
  assert.equal(M.cleanPose({ target: 'a b' }), null);
  assert.equal(M.cleanPose({ distanceKm: -1 }), null);
  assert.equal(M.cleanPose({ azimuthDeg: NaN }), null);
  assert.equal(M.cleanPose(null), null);
  assert.deepEqual(M.cleanPose({}), {});
});
await ok('poseToRig', () => {
  const r = M.poseToRig({ azimuthDeg: 90, polarDeg: 45, distanceKm: 2000 }, 1000);
  assert.ok(Math.abs(r.azimuth - Math.PI / 2) < 1e-12 && Math.abs(r.polar - Math.PI / 4) < 1e-12 && r.distance === 2);
  assert.deepEqual(M.poseToRig({}, 1000), {});
});
await ok('sampleBins, binsFrom', () => {
  const b = M.sampleBins((az) => az * 180 / Math.PI / 10);
  assert.equal(b.length, 360);
  assert.ok(Math.abs(b[90] - 9) < 1e-4);
  assert.equal(M.binsFrom([1, 2, 3]), null);
  assert.equal(M.binsFrom(new Array(360).fill(95)), null);
  assert.equal(M.binsFrom(Array.from({ length: 360 }, (_, i) => (i === 7 ? 'x' : 1))), null);
  assert.equal(M.binsFrom(new Array(360).fill(2.5))[359], 2.5);
});
await ok('crossKm, boxAround', () => {
  assert.ok(Math.abs(M.crossKm({ latDeg: 0, lonDeg: 0 }, { latDeg: 0, lonDeg: 1 }) - 111.19) < 0.05);
  const box = M.boxAround(60, 10, 222.4);
  assert.ok(Math.abs(box.north - box.south - 2) < 0.01);
  assert.ok(Math.abs(box.east - box.west - 4) < 0.02);
  const pole = M.boxAround(89.5, 0, 500);
  assert.ok(pole.north === 90 && pole.west >= -180 && pole.east <= 180);
});
await ok('realProfile: one line, interpolated, no sea', () => {
  const deg = Array.from({ length: 360 }, (_, i) => (i === 10 ? 5 : i === 11 ? 7 : 0));
  const p = realProfile(deg);
  assert.equal(p.kind, 'real');
  const az = 10.5 * Math.PI / 180;
  assert.ok(Math.abs(p.far(az) * 180 / Math.PI - 6) < 1e-9);
  assert.equal(p.far(az), p.near(az));
  assert.equal(p.seaAt(az), 0);
  assert.equal(p.columns().length, 1441);
});
await ok('recording sizes and credit lines', () => {
  assert.deepEqual(R.sizeFor('wide', 1080), { w: 1920, h: 1080 });
  assert.deepEqual(R.sizeFor('wide', 720), { w: 1280, h: 720 });
  assert.deepEqual(R.sizeFor('tall', 2160), { w: 2160, h: 3840 });
  assert.deepEqual(R.sizeFor('square', 'odd'), { w: 1080, h: 1080 });
  assert.deepEqual(R.cleanCredit(['a\u0007b', '', 3, 'c', 'd', 'e']), ['a b', 'c', 'd']);
  assert.equal(R.cleanCredit('x'.repeat(200))[0].length, 120);
});

// ------------------------------------------------------------------------------------------------- a fake map
function fakeCtx() {
  const flights = [];
  const clockListeners = [];
  const clock = {
    mode: 'live', rate: 1, paused: false, _t: 1_800_000_000_000,
    now() { return this._t; },
    goTo(ms) { this._t = ms; this.mode = 'scrub'; clockListeners.forEach((f) => f(this)); },
    setRate(r) { this.rate = r; this.mode = 'scrub'; clockListeners.forEach((f) => f(this)); },
    setPaused(p) { this.paused = p; clockListeners.forEach((f) => f(this)); },
    live() { this.mode = 'live'; this.rate = 1; this.paused = false; clockListeners.forEach((f) => f(this)); },
    onChange(f) { clockListeners.push(f); },
  };
  let selected = null;
  const near = { size: 3, step: 2, h: Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]) };
  const ctx = {
    clock,
    stage: { worldId: 'earth', unitKm: 1000 },
    camera: { fov: 45 },
    cameraRig: { state: { flying: false }, flyTo(o) { flights.push(o); if (o.onArrive) o.onArrive('done'); } },
    camPose: () => ({ azimuthDeg: 10, polarDeg: 80, distanceKm: 20000 }),
    selected: () => selected,
    select: (rec) => { selected = rec; },
    recordById: (id) => (id === 'moon' ? { id: 'moon' } : null),
    observer: { latDeg: 46.02, lonDeg: 7.75, source: 'set' },
    setObserver(o) { ctx.observer = o; globalThis.dispatchEvent(new CustomEvent('sr:observer', { detail: o })); },
    skyView: { active: false, skyline: () => new Float32Array(360).fill(1.5) },
    ground: null,
    groundFake: {
      active: true,
      state: () => ({ world: 'moon', ground: 'apollo-15', walker: { x: 1, z: 2, yawDeg: 30, pitchDeg: -4 } }),
      terrain: () => ({ manifest: { id: 'apollo-15', world: 'moon', latDeg: 26.1, lonDeg: 3.6, radiusKm: 1737.4, groundM: -1923, sources: [{ what: 'LROC NAC', credit: 'NASA/GSFC/ASU', licence: 'Public domain' }] }, near, far: { size: 2, step: 100, h: new Float32Array(4) }, profile: new Float32Array(360).fill(0.7), heightAt: (x, z) => x + z, xz: (lat, lon) => [lat, lon] }),
      sunAt: (ms) => ({ altDeg: 12, azDeg: 100, ms }),
      setLift(m) { this.lifted = Math.max(0, Math.min(1000, m)); return this.lifted; },
    },
    overlayState: () => ({ id: null, status: 'off' }),
  };
  return { ctx, flights, near };
}

await ok('view and camera.get in orbit', () => {
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.deepEqual(api.view(), { mode: 'orbit', stage: 'earth', world: 'earth', ground: null, selected: null, selectedName: null, place: { latDeg: 46.02, lonDeg: 7.75, source: 'set' } });
  assert.deepEqual(api.camera.get(), { mode: 'orbit', target: null, stage: 'earth', azimuthDeg: 10, polarDeg: 80, distanceKm: 20000, fovDeg: 45 });
});
await ok('camera.fly: selects the target, then the pose in the rig units', async () => {
  const { ctx, flights } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(await api.camera.fly({ target: 'moon', azimuthDeg: 45, distanceKm: 5000 }, { ms: 800 }), true);
  assert.equal(ctx.selected().id, 'moon');
  assert.equal(flights.length, 1);
  assert.equal(flights[0].ms, 800);
  assert.equal(flights[0].distance, 5);
  assert.ok(Math.abs(flights[0].azimuth - Math.PI / 4) < 1e-12);
  assert.equal(await api.camera.fly({ target: 'nowhere' }), false);
  assert.equal(await api.camera.fly({ distanceKm: -3 }), false);
  assert.equal(await api.camera.set({ polarDeg: 30 }), true);
  assert.equal(flights[1].ms, 0);
  ctx.ground = ctx.groundFake;
  assert.equal(await api.camera.fly({ azimuthDeg: 1 }), false);
  assert.deepEqual(api.camera.get(), { mode: 'ground' });
});
await ok('clock: get, set, onChange fans out and stops', () => {
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(api.clock.get().live, true);
  const seen = [];
  const off = api.clock.onChange((c) => seen.push(c.ms));
  assert.deepEqual(api.clock.set({ ms: 1_700_000_000_000, rate: 3600, paused: true }), { ms: 1_700_000_000_000, live: false, rate: 3600, paused: true });
  assert.ok(seen.length >= 1 && seen[0] === 1_700_000_000_000);
  off();
  const n = seen.length;
  api.clock.set({ live: true });
  assert.equal(seen.length, n);
  assert.equal(api.clock.get().live, true);
});
await ok('terrain: site, heights, a copy of the grid, lift, light, gravity, skyline', () => {
  const { ctx, near } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(api.terrain.site(), null);
  assert.ok(Number.isNaN(api.terrain.heightAt(1, 1)));
  ctx.ground = ctx.groundFake;
  const site = api.terrain.site();
  assert.equal(site.id, 'apollo-15');
  assert.deepEqual(site.near, { size: 3, stepM: 2 });
  assert.equal(site.sources[0].licence, 'Public domain');
  assert.equal(api.terrain.heightAt(2, 3), 5);
  assert.deepEqual(api.terrain.sample(4, 5), { heightM: 9, xM: 4, zM: 5 });
  const g = api.terrain.grid('near');
  g.h[0] = 99;
  assert.equal(near.h[0], 1, 'the grid handed out is a copy');
  assert.equal(api.terrain.walker().heightM, 3);
  assert.equal(api.terrain.lift(2000), 1000);
  assert.equal(api.terrain.lift(-1), 0);
  assert.equal(api.terrain.sunAt(5).altDeg, 12);
  assert.equal(api.terrain.sunAt(NaN), null);
  assert.equal(api.terrain.gravity(), 1.625);
  assert.equal(api.terrain.skyline()[5], Math.fround(0.7));
});
await ok('horizon: a provided skyline is asked for in the sky view, worn, re-asked for a new place, taken back', async () => {
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  const asks = [];
  const told = [];
  globalThis.addEventListener('sr:horizon', (e) => told.push(e.detail.source));
  const off = api.horizon.provide(async (p) => { asks.push(p); return { deg: new Array(360).fill(3), credit: 'Copernicus DEM', label: 'elevation data' }; });
  await tick();
  assert.equal(asks.length, 0, 'not asked outside the sky view');
  ctx.skyView.active = true;
  globalThis.dispatchEvent(new CustomEvent('sr:sky', { detail: { active: true } }));
  await tick();
  assert.deepEqual(asks, [{ latDeg: 46.02, lonDeg: 7.75 }]);
  assert.equal(ctx.horizonOverride.deg[100], 3);
  assert.equal(api.horizon.get().source, 'provided');
  globalThis.dispatchEvent(new CustomEvent('sr:sky', { detail: { active: true } }));
  await tick();
  assert.equal(asks.length, 1, 'the same place is not asked twice');
  ctx.setObserver({ latDeg: 52.37, lonDeg: 4.9, source: 'city' });
  await tick();
  assert.equal(asks.length, 2);
  off();
  assert.equal(ctx.horizonOverride, null);
  assert.equal(api.horizon.get().source, 'drawn');
  assert.ok(told.includes('provided') && told.at(-1) === 'drawn');
  const off2 = api.horizon.provide(async () => ({ deg: [1, 2] }));
  ctx.setObserver({ latDeg: 10, lonDeg: 10, source: 'city' });
  await tick();
  assert.equal(ctx.horizonOverride, null, 'a malformed skyline is not worn');
  off2();
});
await ok('place: get and set (rounded nowhere, named source set)', () => {
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(api.place.set({ latDeg: 95, lonDeg: 0 }), false);
  assert.equal(api.place.set({ latDeg: -33.9, lonDeg: 370.5, name: 'Cape Town' }), true);
  assert.equal(ctx.observer.source, 'set');
  assert.ok(Math.abs(ctx.observer.lonDeg - 10.5) < 1e-9);
  assert.equal(api.place.get().latDeg, -33.9);
});
await ok('tool slots: a slot per place, a button with its label and lock, updated and removed', async () => {
  assert.equal(toolSlot('nowhere'), null);
  assert.deepEqual(TOOL_PLACES, ['earth', 'ground', 'sky', 'make', 'drift', 'device']);
  const slot = toolSlot('earth');
  assert.equal(slot.getAttribute('data-sr-tools'), 'earth');
  assert.equal(slot.hidden, true);
  document.body.appendChild(slot);
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(api.ui.tool({ id: 'Bad Id', where: 'earth', label: 'x' }), null);
  assert.equal(api.ui.tool({ id: 'tl', where: 'mars', label: 'x' }), null);
  let pressed = null;
  const t = api.ui.tool({ id: 'timelapse', where: ['earth', 'make'], label: 'Timelapse', title: 'Timelapse: needs Pro', icon: 'film', locked: true, onPress: (o) => { pressed = o.where; } });
  const btn = slot.querySelector('[data-sr-tool]');
  assert.ok(btn, 'the button is in the slot');
  assert.equal(slot.hidden, false);
  assert.ok(btn.className.includes('ui-btn'));
  assert.equal(btn.attrs['aria-label'], 'Timelapse: needs Pro');
  assert.ok(btn.textContent.includes('Timelapse'));
  assert.equal(btn.querySelectorAll('.sr-tool__lock').length, 1);
  btn.click();
  assert.equal(pressed, 'earth');
  let shareClosed = 0;
  ctx.share = { isOpen: () => true, close: () => { shareClosed += 1; } };
  t.update({ locked: false, title: '' });
  assert.equal(slot.querySelector('[data-sr-tool]').querySelectorAll('.sr-tool__lock').length, 0);
  // A slot built later is filled when it says so.
  const late = toolSlot('make');
  document.body.appendChild(late);
  await tick();
  assert.ok(late.querySelector('[data-sr-tool]'), 'a later slot gets the button through sr:slot');
  late.querySelector('[data-sr-tool]').click();
  assert.equal(pressed, 'make');
  assert.equal(shareClosed, 1, 'a tool in the share sheet closes the sheet first, as Record does');
  t.remove();
  assert.equal(slot.querySelector('[data-sr-tool]'), null);
  assert.equal(slot.hidden, true);
});
await ok('panel: the map chrome, opened, titled, closed with its listeners', () => {
  const { ctx } = fakeCtx();
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(api.ui.panel({ id: 'Not ok' }), null);
  const p = api.ui.panel({ id: 'site-tools', title: 'Site tools' });
  assert.equal(api.ui.panel({ id: 'site-tools' }), p, 'one panel per id');
  assert.ok(p.root.className.includes('ui-pop') && p.root.className.includes('sr-make'));
  assert.equal(p.root.hidden, true);
  let closed = 0;
  p.onClose(() => { closed += 1; });
  p.open();
  assert.equal(p.isOpen(), true);
  p.close();
  p.close();
  assert.equal(closed, 1);
  assert.equal(p.root.querySelector('.ui-close').attrs['aria-label'].length > 0, true);
});
await ok('installMapApi: window.srMap once, frozen, and sr:map', () => {
  const { ctx } = fakeCtx();
  let heard = null;
  document.addEventListener('sr:map', (e) => { heard = e.detail; });
  const a = M.installMapApi(ctx, globalThis);
  assert.equal(globalThis.srMap, a);
  assert.ok(Object.isFrozen(a));
  assert.deepEqual(heard, { version: 1 });
  assert.equal(M.installMapApi(ctx, globalThis), a);
  for (const k of ['view', 'on', 'camera', 'clock', 'record', 'terrain', 'horizon', 'place', 'gibs', 'ui']) assert.ok(k in a, k);
});

// ------------------------------------------------------------------------------------------- the wiring, by text
await ok('main.js loads it after the layers and the first visit, never in an embed', () => {
  const main = readFileSync(new URL('../site/js/main.js', import.meta.url), 'utf8');
  const at = main.indexOf("import('./ui/mapapi.js')");
  assert.ok(at > 0, 'imported by main.js');
  const before = main.slice(main.lastIndexOf('const todayLater = () => afterFirstVisit(TODAY_MS', at), at);
  assert.ok(before.length > 0 && before.length < 600, 'inside the dated cards\' late moment (afterFirstVisit after sr:layers-ready)');
  assert.ok(/if \(!embed\) import\('\.\/ui\/mapapi\.js'\)/.test(main), 'never in an embed');
  assert.ok(!/^import .*mapapi/m.test(main), 'not a static import');
});
await ok('the four slots are built where the panels are', () => {
  const read = (f) => readFileSync(new URL(`../site/js/${f}`, import.meta.url), 'utf8');
  assert.ok(read('ui/overlaypanel.js').includes("toolSlot('earth')"));
  assert.ok(read('scene/groundstage.js').includes("toolSlot('ground'"));
  assert.ok(read('ui/tonight.js').includes("toolSlot('sky')"));
  assert.ok(read('ui/sharesheet.js').includes("toolSlot('make'"));
});
await ok('the overlay can be asked for one day', () => {
  const src = readFileSync(new URL('../site/js/scene/earthoverlay.js', import.meta.url), 'utf8');
  assert.ok(src.includes('const dates = day ? [day] : overlayDates(row.date, nowMs());'));
});

// ---------------------------------------------------------------------------- 2026-11-26: the extras' generic hooks
await ok('cleanDrift and driftWords: the drift choices a script gives, and #drift= words back', async () => {
  assert.deepEqual(M.cleanDrift({ through: ['deep', 'stars', 'nope'], pace: 'calm', seed: 42, tags: false }), { through: ['stars', 'deep'], tags: false, pace: 'calm', seed: 42 });
  assert.equal(M.cleanDrift({ through: [] }), null);
  assert.equal(M.cleanDrift({ pace: 'fast' }), null);
  assert.equal(M.cleanDrift({ seed: 1.5 }), null);
  assert.equal(M.cleanDrift({ bare: 'yes' }), null);
  const words = M.driftWords(M.cleanDrift({ through: ['worlds'], realOnly: false, bare: true, pace: 'brisk', seed: 7 }));
  assert.equal(words, 'worlds,any,bare,brisk,seed7');
  const { readOptions, writeOptions, seededRandom } = await import('../site/js/ui/driftplan.js');
  const back = readOptions(words, null);
  assert.deepEqual([back.through, back.realOnly, back.bare, back.pace, back.seed], [['worlds'], false, true, 'brisk', 7]);
  assert.ok(writeOptions(back).endsWith('seed7'));
  assert.equal(readOptions('1', null).seed, null);
  assert.ok(readOptions('seed0', null).notes.includes('unknown:seed0'));
  const a = seededRandom(42), b = seededRandom(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()], 'one seed, one walk');
});
await ok('offlineRoute: only the map\'s own files, in the worker\'s own caches', () => {
  const base = 'https://www.spaceradar.ai/';
  assert.deepEqual(M.offlineRoute('textures/earth.jpg?v=3#x', base), { cache: 'sr-sw-assets-v1', key: 'https://www.spaceradar.ai/textures/earth.jpg' });
  assert.deepEqual(M.offlineRoute('https://www.spaceradar.ai/data/v1/ll2-upcoming.json', base), { cache: 'sr-sw-data-v1', key: 'https://www.spaceradar.ai/data/v1/ll2-upcoming.json' });
  for (const u of ['js/main.js', 'index.html', 'https://celestrak.org/x.json', 't/abc', 'textures/']) assert.equal(M.offlineRoute(u, base), null, u);
  const sw = readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("const ASSET_CACHE = PREFIX + 'assets-v1';") && sw.includes("const PREFIX = 'sr-sw-';") && sw.includes("const DATA_CACHE = PREFIX + 'data-v1';"), 'site/sw.js still names the two caches SW_CACHES names');
  assert.ok(sw.includes("const ASSET_DIRS = ['textures/', 'models/', 'audio/', 'images/', 'og/', 'data/'];"), 'and the same folders');
});
await ok('cleanVoice: https clips of one trip, with a length', () => {
  const v = M.cleanVoice({ credit: 'Voice: x', clips: { iss: { opus: 'https://a.example/iss.opus', m4a: 'https://a.example/iss.m4a', vtt: 'https://a.example/iss.vtt', seconds: 12.5 }, bad: { opus: 'http://a/x', seconds: 3 }, short: { opus: 'https://a/x', seconds: 0.1 } } }, 'people-in-space');
  assert.deepEqual(Object.keys(v.rows), ['people-in-space/iss']);
  assert.equal(v.rows['people-in-space/iss'].twin, 'https://a.example/iss.m4a');
  assert.equal(M.cleanVoice(null, 'x'), null);
  assert.equal(M.cleanVoice({ clips: {} }, 'x'), null);
});
await ok('the recorder: no corner, a sharp buffer, tiles for a large still', () => {
  assert.equal(R.sharpRatio(1440, 900, 'wide', 3840, 2160, 16384, 2), 2.667);
  assert.equal(R.sharpRatio(1440, 900, 'wide', 1920, 1080, 16384, 2), null, 'already sharp enough');
  assert.equal(R.sharpRatio(1440, 900, 'wide', 3840, 2160, 2048, 1), 1.422, 'the GPU\'s limit');
  const t = R.tilesFor(7016, 4961, 4096);
  assert.equal(t.length, 4);
  assert.deepEqual(t[3], { x: 4096, y: 4096, w: 2920, h: 865 });
  const rec = readFileSync(new URL('../site/js/ui/recorder.js', import.meta.url), 'utf8');
  assert.ok(rec.includes('if (corner === false) return;'));
});
await ok('drift, layers, trips and offline on the api', async () => {
  const { ctx } = fakeCtx();
  let started = null;
  ctx.layers = [{ id: 'stars' }, { id: 'worlds' }];
  const on = new Set(['worlds']);
  ctx.isLayerOn = (id) => on.has(id);
  ctx.setLayerOn = (id, v) => { if (v) on.add(id); else on.delete(id); };
  ctx.wantDrift = async (keys) => { started = keys; ctx.drift = { active: true, state: () => ({ active: true, options: { through: ['stars'], realOnly: true, tags: true, bare: false, pace: 'calm', seed: 3 }, place: 'sirius', visits: 1 }), start: () => true, stop: () => { ctx.drift.active = false; } }; return ctx.drift; };
  ctx.trip = { tours: () => [{ id: 'a', title: 'A', group: 'g', early_until: '2099-01-01' }, { id: 'b', title: 'B' }], onChange: () => () => {}, state: { phase: 'idle' } };
  const api = M.createMapApi(ctx, globalThis);
  assert.equal(await api.drift.start({ through: ['stars'], pace: 'calm', seed: 3 }), true);
  assert.deepEqual(started, { drift: 'stars,calm,seed3' });
  assert.equal(api.drift.get().options.seed, 3);
  assert.equal(await api.drift.start({ pace: 'warp' }), false);
  api.drift.stop();
  assert.equal(ctx.drift.active, false);
  assert.deepEqual(api.layers.list(), [{ id: 'stars', on: false }, { id: 'worlds', on: true }]);
  assert.equal(api.layers.set('stars', true), true);
  assert.equal(api.layers.set('nope', true), false);
  assert.deepEqual(api.trips.list()[0], { id: 'a', title: 'A', group: 'g', earlyUntil: '2099-01-01' });
  const fn = () => false;
  const off = api.trips.gate(fn);
  assert.equal(ctx.tripGate, fn);
  off();
  assert.equal(ctx.tripGate, null);
  assert.deepEqual(await api.offline.has(['textures/x.jpg']), 0, 'no caches here: nothing kept');
  const stopVoice = api.voice.provide(() => null);
  assert.equal(typeof stopVoice, 'function');
});
await ok('the new places are built where their panels are', () => {
  const read = (f) => readFileSync(new URL(`../site/js/${f}`, import.meta.url), 'utf8');
  assert.ok(TOOL_PLACES.includes('drift') && TOOL_PLACES.includes('device'));
  assert.ok(read('ui/drift.js').includes("toolSlot('drift'"));
  assert.ok(read('ui/whattoshow.js').includes("toolSlot('device')"));
  assert.ok(read('ui/trip.js').includes('ctx.tripGate'), 'an early trip asks the gate');
  assert.ok(read('audio/narration.js').includes('opts.alt'), 'the narration takes a provided voice');
});

console.log(`test_mapapi: ${passed} passed`);
