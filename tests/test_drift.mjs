// tests/test_drift.mjs -- the drift: the camera wanders on its own (spec 0071; ui/drift.js,
// ui/driftplan.js).
//
//   1. THE LINK: what `#drift=…` and the remembered choices ask for, and how it is written back.
//   2. WHAT IS A PLACE: categories, neighbourhoods, real models only or everything drawn.
//   3. THE WALK: never a jump across the ladder, never the same place twice running, out to the
//      far end and home again, every place seen in the long run, the same seed the same walk.
//   4. HOW LONG: flights grow with the gap and stay inside their bounds; the turn ends with the stay.
//   5. THE CONTROLLER on a stub map and a stub clock: one select per stop with a long flight, the
//      turn on arrival, layers switched on and put back, the screen, pause, next, a hand on the map.
//   6. THE SEAMS: main.js, the address, the Just watch row, the boot diet.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const eq = (a, b, what) => check(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

const P = await import(join(JS, 'ui/driftplan.js'));
const D = await import(join(JS, 'ui/drift.js'));
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

/** A seeded generator: the same walk every run (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 1. the link ---------------------------------------------------------------------------------
{
  check(P.readOptions(undefined).on === false && P.readOptions('0').on === false && P.readOptions('off').on === false, 'no key, `0` and `off` are off');
  const one = P.readOptions('1');
  check(one.on, '`drift=1` is on');
  eq(one.through, P.DEFAULTS.through, '`drift=1` travels through the defaults');
  check(one.realOnly === true && one.tags === true && one.pace === 'steady', 'real models only, names shown, steady, unless somebody says');
  const words = P.readOptions('stars,worlds,any,notags,calm,nope');
  eq(words.through, ['worlds', 'stars'], 'categories are read in the options\' own order');
  check(words.realOnly === false && words.tags === false && words.pace === 'calm', '`any`, `notags` and a pace are read');
  eq(words.notes, ['unknown:nope'], 'a word that names nothing is dropped and noted');
  eq(P.readOptions('all').through, P.CATEGORIES, '`all` is every category');
  const kept = P.readOptions('1', { through: ['deep', 'bogus'], realOnly: false, tags: false, pace: 'brisk' });
  eq(kept.through, ['deep'], 'the remembered categories are used, a stale one dropped');
  check(kept.realOnly === false && kept.tags === false && kept.pace === 'brisk', 'the remembered switches and pace are used');
  eq(P.readOptions('craft', { through: ['deep'] }).through, ['craft'], 'the address outranks what was remembered');
  eq(P.readOptions('1', { through: [] }).through, P.DEFAULTS.through, 'nothing remembered is the defaults, never an empty drift');
  check(P.writeOptions(P.DEFAULTS) === '1', 'the defaults are written as `1`');
  for (const value of ['worlds,stars,any,notags,calm', 'all', 'deep,brisk', 'craft']) {
    const o = P.readOptions(value);
    eq(P.readOptions(P.writeOptions(o)), o, `\`${value}\` survives being written and read back`);
  }
  check(KEYS.includes(P.URL_KEY), 'ui/urlstate.js KEYS carries `drift`, or the first write of anything else would drop it');
}

// --- 2. what is a place --------------------------------------------------------------------------
const world = (id, extra = {}) => ({ id, name: id, klass: 'world', meta: { ...extra } });
const RECORDS = [
  { id: 'iss', name: 'ISS (ZARYA)', klass: 'station', frame: 'earth-inertial', meta: { noradId: 25544 } },
  { id: 'sat-plain', name: 'SOMESAT 4', klass: 'satellite', frame: 'earth-inertial', meta: { noradId: 99999001 } },
  { id: 'frag', name: 'FRAGMENT', klass: 'debris', frame: 'earth-inertial', meta: {} },
  { id: 'pad', name: 'A launch pad', klass: 'site', frame: 'earth-fixed', meta: {} },
  world('sun'), world('moon'), world('mars'), world('jupiter'), world('io'), world('saturn'), world('pluto'),
  world('flat-moon', { flat: true }),
  { id: 'rock', name: 'A rock', klass: 'asteroid', frame: 'sun-inertial', meta: {}, au: 2.7 },
  { id: 'far-probe', name: 'A far probe', klass: 'probe', frame: 'sun-inertial', meta: {}, au: 160 },
  { id: 'trailing', name: 'A telescope trailing the Earth', klass: 'telescope', frame: 'sun-inertial', meta: {}, au: 1.02, earthAu: 0.9 },
  { id: 'at-l2', name: 'A telescope at L2', klass: 'telescope', frame: 'sun-inertial', meta: {}, au: 1.01, earthAu: 0.01 },
  { id: 'sirius', name: 'Sirius', klass: 'star', meta: { why: 'the brightest star in the night sky' } },
  { id: 'hip-1', name: 'HIP 1', klass: 'star', meta: {} },
  { id: 'dso-m42', name: 'Orion Nebula', klass: 'dso', meta: { messier: 42, distLy: 1344 } },
  { id: 'dso-m31', name: 'Andromeda', klass: 'dso', meta: { messier: 31, distLy: 2537000 } },
  { id: 'dso-ngc1', name: 'NGC 1', klass: 'dso', meta: { distLy: 190000000 } },
];
const PLANET_OF = { io: 'jupiter', moon: 'earth', 'flat-moon': 'saturn' };
const deps = {
  pictures: new Map([['dso-m42', {}]]),
  systemOf: () => null,
  planetOf: (id) => PLANET_OF[id] || id,
  sunAu: (r) => (Number.isFinite(r.earthAu) ? { sunAu: r.au, earthAu: r.earthAu } : Number.isFinite(r.au) ? r.au : NaN),
};
const look = (r) => D.lookOf(r, deps);
const facts = (r) => D.factsOf(r, deps);
const places = (options) => P.buildPlaces(RECORDS, options, look, facts);
{
  check(look(RECORDS[0]) === 2, 'the station has a real model');
  check(look(RECORDS[1]) === 1, 'a satellite with no model of its own is drawn as its kind');
  check(P.categoryOf(RECORDS[2]) === null, 'a fragment is never a place');
  check(P.categoryOf(RECORDS[3], facts(RECORDS[3])) === null, 'a pad on the Earth is never a place');
  check(P.categoryOf({ klass: 'site' }, { onWorld: 'mars' }) === 'craft', 'something standing on Mars is');
  check(look(world('mars')) === 2 && look(world('x', { flat: true })) === 1, 'a mapped world is itself; a plain ball is its kind');
  check(look(RECORDS.find((r) => r.id === 'sirius')) === 2 && look(RECORDS.find((r) => r.id === 'hip-1')) === 0, 'a star with a line about it; a catalogue number is not a place');
  check(look(RECORDS.find((r) => r.id === 'dso-m42')) === 2 && look(RECORDS.find((r) => r.id === 'dso-m31')) === 1 && look(RECORDS.find((r) => r.id === 'dso-ngc1')) === 0, 'a photographed nebula, a Messier glow, a bare catalogue row');

  const hood = (id) => P.hoodOf(RECORDS.find((r) => r.id === id), facts(RECORDS.find((r) => r.id === id)));
  eq(['iss', 'moon', 'mars', 'io', 'pluto', 'rock', 'far-probe', 'sirius', 'dso-m42', 'dso-m31'].map(hood),
    ['earth', 'moon', 'mars', 'jupiter', 'kuiper', 'belt', 'kuiper', 'stellar', 'galaxy', 'beyond'], 'every record has the neighbourhood it is in');
  check(hood('at-l2') === 'earth' && hood('trailing') === 'mars', 'at L2 is the Earth\'s sky; a third of an orbit behind the Earth is not');
  eq([0.1, 0.4, 0.72, 1, 1.52, 2.7, 5.2, 9.5, 19, 30, 40].map(P.hoodByAu),
    ['sun', 'mercury', 'venus', 'earth', 'mars', 'belt', 'jupiter', 'saturn', 'uranus', 'neptune', 'kuiper'], 'a distance from the Sun names its neighbourhood');
  for (const h of P.HOODS) check(P.HOODS.indexOf(h) === P.HOODS.lastIndexOf(h), `${h} is on the ladder once`);

  const def = places(P.DEFAULTS);
  eq(def.map((p) => p.id).sort(), ['io', 'iss', 'jupiter', 'mars', 'moon', 'pluto', 'saturn', 'sun'], 'the defaults: craft and worlds that are drawn as themselves');
  const any = places({ ...P.DEFAULTS, realOnly: false });
  check(any.some((p) => p.id === 'sat-plain') && any.some((p) => p.id === 'flat-moon'), 'without "real models" the kinds are places too');
  check(any.find((p) => p.id === 'iss').weight > any.find((p) => p.id === 'sat-plain').weight, 'and the walk still prefers what has a face');
  const deep = places({ through: ['deep'], realOnly: true });
  eq(deep.map((p) => p.id), ['dso-m42'], 'deep sky, real only: the photographed ones');
  eq(P.buildPlaces([RECORDS[0], RECORDS[0]], P.DEFAULTS, look, facts).length, 1, 'a record on two layers is one place');
}

// --- 3. the walk ---------------------------------------------------------------------------------
{
  const all = places({ through: P.CATEGORIES, realOnly: false });
  const walk = P.createWalk(all, { rng: seeded(7), startHood: 'earth' });
  const seen = new Map();
  let prev = null;
  let worstJump = 0;
  let repeats = 0;
  const live = P.HOODS.filter((h) => all.some((p) => p.hood === h));
  let reachedOut = false;
  let cameHome = false;
  const first = walk.next();
  check(first.hood === 'earth', 'the walk starts where the camera is');
  prev = first;
  for (let i = 0; i < 4000; i++) {
    const p = walk.next();
    seen.set(p.id, (seen.get(p.id) || 0) + 1);
    worstJump = Math.max(worstJump, Math.abs(live.indexOf(p.hood) - live.indexOf(prev.hood)));
    if (p === prev) repeats += 1;
    if (p.hood === live[live.length - 1]) reachedOut = true;
    if (reachedOut && p.hood === live[0]) cameHome = true;
    prev = p;
  }
  check(worstJump <= 1, `the walk never skips a neighbourhood that has a place (worst jump: ${worstJump})`);
  check(repeats === 0, `the walk never returns the place it just left (${repeats} times)`);
  check(reachedOut && cameHome, 'it reaches the far end of the ladder and comes home');
  check(all.every((p) => seen.has(p.id)), `in the long run every place is seen (${all.filter((p) => !seen.has(p.id)).map((p) => p.id)})`);

  const a = P.createWalk(all, { rng: seeded(3) });
  const b = P.createWalk(all, { rng: seeded(3) });
  eq(Array.from({ length: 40 }, () => a.next().id), Array.from({ length: 40 }, () => b.next().id), 'the same seed is the same walk');
  check(P.createWalk([], { rng: seeded(1) }).next() === null, 'an empty pool has no next place');
  const lone = P.createWalk(all.filter((p) => p.id === 'iss'), { rng: seeded(1) });
  check(lone.next().id === 'iss' && lone.next().id === 'iss', 'one place is that place again, not a stall');
  check(P.createWalk(all, { rng: seeded(2), startHood: 'galaxy' }).next().hood === 'galaxy', 'it starts in the neighbourhood it is told');
  check(P.createWalk(all.filter((p) => p.hood !== 'earth'), { rng: seeded(2), startHood: 'earth' }).next().hood === 'moon', 'or in the nearest one that has a place');
}

// --- 4. how long ---------------------------------------------------------------------------------
{
  const at = (hood) => ({ hood });
  const same = P.flightMs(at('earth'), at('earth'));
  const far = P.flightMs(at('earth'), at('stellar'));
  check(same === P.FLIGHT_MS[0] && far > same && far <= P.FLIGHT_MS[1], 'a flight grows with the gap and stays inside its bounds');
  check(P.flightMs(at('earth'), at('moon'), 'calm') > P.flightMs(at('earth'), at('moon'), 'brisk'), 'calm flies slower than brisk');
  check(P.flightMs(null, at('earth')) >= P.FLIGHT_MS[0], 'the first flight has a length');
  for (const pace of Object.keys(P.PACES)) {
    const rng = seeded(11);
    for (let i = 0; i < 50; i++) {
      const d = P.dwellFor(pace, rng);
      const [lo, hi] = P.PACES[pace].dwell;
      check(d.ms >= lo * 1000 && d.ms <= hi * 1000, `${pace}: a stay is inside its range`);
      check(Math.abs(Math.abs(d.deg) / d.degPerSec - d.ms / 1000) < 0.01, `${pace}: the turn ends as the stay does`);
      check(Math.abs(d.deg) <= 60, `${pace}: never more than a sixth of a circle in one stay (${d.deg.toFixed(1)})`);
    }
  }
}

// --- 5. the controller ---------------------------------------------------------------------------
{
  let t = 1000;
  let fire = null;
  const calls = { select: [], orbit: [], layers: [], screen: [], stopOrbit: 0 };
  const on = new Set(['worlds', 'stations']);
  const listeners = new Set();
  const rig = {
    state: { flying: false },
    orbit: (o) => { calls.orbit.push(o); return true; },
    stopOrbit: () => { calls.stopOrbit += 1; },
    onUserInput: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    saveState: () => ({ target: { x: 0, y: 0, z: 0 }, distance: 10 }),
  };
  let screen = 'full';
  const ctx = {
    layers: [{ id: 'worlds' }, { id: 'stations' }, { id: 'notable' }, { id: 'deep-space' }, { id: 'stars' }],
    isLayerOn: (id) => on.has(id),
    setLayerOn: (id, v) => { calls.layers.push([id, v]); if (v) on.add(id); else on.delete(id); },
    recordsFor: (id) => (id === 'worlds' ? RECORDS.filter((r) => r.klass === 'world') : id === 'stations' ? [RECORDS[0]] : []),
    select: (record, opts) => { calls.select.push({ id: record.id, opts }); rig.state.flying = true; },
    selected: () => null,
    positionOfRecord: () => ({ x: 1, y: 2, z: 3 }),
    cameraRig: rig,
    cleanView: { state: () => screen, setState: (s) => { screen = s; calls.screen.push(s); } },
    clock: { now: () => 0 },
    stage: { worldId: 'earth' },
  };
  const drift = D.createDrift(ctx, {
    document: null, window: null, navigator: {}, storage: null, now: () => t, rng: seeded(5),
    setInterval: (fn) => { fire = fn; return 1; }, clearInterval: () => { fire = null; },
  });
  const run = (ms) => { for (let left = ms; left > 0 && fire; left -= 250) { t += 250; fire(); } };

  check(drift.apply({}, 'link') === false && !drift.active, 'a link without the key starts nothing');
  check(drift.apply({ drift: '1' }, 'link') === true && drift.active, '`drift=1` starts it');
  eq(calls.layers, [['notable', true], ['deep-space', true]], 'the layers its choices need are switched on; one that is on is left alone');
  eq(calls.screen, ['hud'], 'names wanted: the HUD screen');
  check(calls.select.length === 1, 'the first place is chosen at once');
  const first = calls.select[0];
  check(first.opts.fly === true && first.opts.undo === false && first.opts.from === 'drift', 'it is the map\'s own select, with no way-back toast');
  check(first.opts.flyMs >= P.FLIGHT_MS[0] && first.opts.flight.ease === 'cruise' && typeof first.opts.flight.apexFor === 'function', 'with a long cruise of a flight');
  check(first.opts.flight.apexFor({ x: 1000, y: 0, z: 0 }, 5).distance > 100, 'two places far apart sideways: the flight pulls back');
  check(first.opts.flight.apexFor({ x: 12, y: 0, z: 0 }, 5) === null, 'two places close together: it does not');
  check(drift.state().phase === 'flight', 'it is in flight');
  run(3000);
  check(calls.orbit.length === 0, 'no turn while the flight is still running');
  rig.state.flying = false;
  run(500);
  check(drift.state().phase === 'dwell' && calls.orbit.length === 1, 'on arrival the stay begins, with its turn');
  run(40000);
  check(calls.select.length >= 2 && calls.select[1].id !== calls.select[0].id, 'when the stay is over it goes on to somewhere else');

  // A flight that never lands is treated as arrived, so a broken callback cannot strand the screen.
  rig.state.flying = true;
  const stuckAt = calls.select.length;
  run(60000);
  check(calls.select.length > stuckAt, 'a flight that never reports its end does not hold the drift');
  rig.state.flying = false;

  // Pause and go on.
  run(1000);
  const n0 = calls.select.length;
  drift.pause();
  check(drift.state().phase === 'paused', 'paused');
  run(120000);
  check(calls.select.length === n0, 'nothing moves while it is paused');
  drift.resume();
  check(drift.state().phase !== 'paused', 'and it goes on');
  drift.skip();
  check(calls.select.length === n0 + 1, 'Next goes to the next place now');

  // The options, live.
  drift.setOptions({ tags: false });
  check(screen === 'clear', 'names off: the clear screen');
  drift.setOptions({ through: ['worlds'] });
  rig.state.flying = false;
  const n1 = calls.select.length;
  run(200000);
  check(calls.select.slice(n1).every((c) => c.id !== 'iss'), 'worlds only: the station is not visited again');
  drift.setOptions({ through: [] });
  eq(drift.state().options.through, ['worlds'], 'the last category cannot be switched off');

  // A hand on the map.
  for (const fn of listeners) fn('orbit');
  check(!drift.active && drift.state().phase === 'idle', 'a hand on the map takes the controls');
  check(screen === 'full', 'and the panels come back');
  check(calls.layers.some(([id, v]) => id === 'notable' && v === false) && calls.layers.some(([id, v]) => id === 'deep-space' && v === false), 'the layers it switched on are put back');
  check(!on.has('notable') && on.has('worlds'), 'and the ones that were on stay on');
  check(listeners.size === 0 && fire === null, 'nothing is left listening or ticking');

  // Nothing to visit: it waits for the layers, then stops.
  const empty = D.createDrift({ ...ctx, recordsFor: () => [] }, {
    document: null, window: null, navigator: {}, storage: null, now: () => t, rng: seeded(5),
    setInterval: (fn) => { fire = fn; return 1; }, clearInterval: () => { fire = null; },
  });
  empty.apply({ drift: '1' });
  check(empty.active && empty.state().phase === 'waiting', 'with nothing landed yet it waits');
  run(20000);
  check(!empty.active, 'and stops when nothing ever does');

  // Something standing on a world's night side is passed over; by day it is a place.
  {
    // `jezero` is the one site id scene/realmodels.js gives a model of its own (the rover).
    const lander = { id: 'jezero', name: 'Perseverance', klass: 'site', frame: 'mars-fixed', meta: {} };
    for (const [sunSide, wanted] of [[-1, 0], [1, 1]]) {
      const seen = [];
      const moonCtx = {
        ...ctx,
        layers: [{ id: 'sites' }],
        isLayerOn: () => true,
        recordsFor: () => [lander],
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => ({ x: 10, y: 0, z: 1 }),
        worlds: { drawnPositionOf: () => ({ x: 10, y: 0, z: 0 }), sunDirOf: () => ({ x: 0, y: 0, z: sunSide }) },
        cameraRig: { ...rig, onUserInput: () => () => {} },
      };
      const d2 = D.createDrift(moonCtx, {
        document: null, window: null, navigator: {}, storage: null, now: () => t, rng: seeded(5),
        setInterval: (fn) => { fire = fn; return 1; }, clearInterval: () => { fire = null; },
      });
      d2.start({ through: ['craft'], realOnly: true, tags: true, pace: 'steady' });
      check(d2.state().pool === 1 && d2.state().walk.hoods[0] === 'mars', 'a rover on Mars is in the pool, in Mars\'s neighbourhood');
      check(seen.length === wanted, sunSide < 0 ? 'in the dark it is passed over' : 'with the Sun up it is visited');
      d2.stop();
    }
  }

  // A craft in its world's shadow is passed over; in the Sun it is a place (seen 2026-10-12: the
  // Lunar Reconnaissance Orbiter as a dot in black).
  {
    const lro = { id: 'lro', name: 'LRO', klass: 'probe', frame: 'moon-inertial', meta: {} };
    const stubs = (extra) => ({
      ...ctx,
      layers: [{ id: 'deep-space' }],
      isLayerOn: () => true,
      recordsFor: () => [lro, RECORDS[0]],
      selected: () => null,
      cameraRig: { ...rig, state: { flying: false }, onUserInput: () => () => {} },
      ...extra,
    });
    const env = () => ({
      document: null, window: null, navigator: {}, storage: null, now: () => t, rng: seeded(5),
      setInterval: (fn) => { fire = fn; return 1; }, clearInterval: () => { fire = null; },
    });
    // The Moon is drawn at x = 10 with radius 1; the craft is 0.03 above it. The Sun is on +z or on -z.
    for (const [sunSide, wanted] of [[-1, 0], [1, 1]]) {
      const seen = [];
      const d3 = D.createDrift(stubs({
        recordsFor: () => [lro],
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => ({ x: 10, y: 0, z: 1.03 }),
        worlds: { drawnPositionOf: () => ({ x: 10, y: 0, z: 0 }), sunDirOf: () => ({ x: 0, y: 0, z: sunSide }), drawnRadiusUnits: () => 1 },
      }), env());
      d3.start({ through: ['craft'], realOnly: false, tags: true, pace: 'steady' });
      check(d3.state().pool === 1, 'an orbiter of the Moon is in the pool');
      check(seen.length === wanted, sunSide < 0 ? 'a craft in its world\'s shadow is passed over' : 'a craft in the Sun is visited');
      d3.stop();
    }
    // Beside the shadow and not in it (off the Sun line by more than the world's radius): visited.
    {
      const seen = [];
      const d4 = D.createDrift(stubs({
        recordsFor: () => [lro],
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => ({ x: 11.5, y: 0, z: -3 }),
        worlds: { drawnPositionOf: () => ({ x: 10, y: 0, z: 0 }), sunDirOf: () => ({ x: 0, y: 0, z: 1 }), drawnRadiusUnits: () => 1 },
      }), env());
      d4.start({ through: ['craft'], realOnly: false, tags: true, pace: 'steady' });
      check(seen.length === 1, 'behind its world and outside the shadow cylinder it is in the Sun, and visited');
      d4.stop();
    }
    // AT ARRIVAL: a selection the model layer draws as a dot, with no sunlit ground behind it, is
    // left after PEEK_MS; one drawn large is stayed with; so is a dot over daylight.
    const stay = (px, pos, worlds, camera) => {
      const seen = [];
      const r2 = { ...rig, state: { flying: false }, onUserInput: () => () => {} };
      const d5 = D.createDrift(stubs({
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => pos,
        worlds,
        cameraRig: r2,
        heroes: { drawnPx: () => px },
        ...(camera ? { camera: { position: camera } } : {}),
      }), env());
      d5.start({ through: ['craft'], realOnly: false, tags: true, pace: 'calm' });
      run(1500);
      const arrived = d5.state().phase === 'dwell';
      run(D.PEEK_MS + 500);
      const after = seen.length;
      d5.stop();
      return { arrived, after };
    };
    const farFromAnything = { drawnPositionOf: () => null, sunDirOf: () => null, drawnRadiusUnits: () => 0 };
    const tiny = stay(3, { x: 50, y: 0, z: 0 }, farFromAnything);
    check(tiny.arrived && tiny.after === 2, `a selection drawn ${3} px across in black is left ${D.PEEK_MS} ms into the stay (selects: ${tiny.after})`);
    const big = stay(260, { x: 50, y: 0, z: 0 }, farFromAnything);
    check(big.arrived && big.after === 1, `one drawn 260 px across is stayed with (selects: ${big.after})`);
    const overDay = stay(3, { x: 10, y: 0, z: 1.03 }, { drawnPositionOf: () => ({ x: 10, y: 0, z: 0 }), sunDirOf: () => ({ x: 0, y: 0, z: 1 }), drawnRadiusUnits: () => 1 });
    check(overDay.arrived && overDay.after === 1, `a small craft over sunlit ground is a picture, and is stayed with (selects: ${overDay.after})`);
    const moonDay = { drawnPositionOf: () => ({ x: 10, y: 0, z: 0 }), sunDirOf: () => ({ x: 0, y: 0, z: 1 }), drawnRadiusUnits: () => 1 };
    const fromDay = stay(3, { x: 10, y: 0, z: 1.03 }, moonDay, { x: 10, y: 0.2, z: 1.5 });
    check(fromDay.after === 1, `seen from the day side with the ground behind it, it is stayed with (selects: ${fromDay.after})`);
    const fromNight = stay(3, { x: 10.9, y: 0, z: 0.5 }, moonDay, { x: 12, y: 0, z: -0.6 });
    check(fromNight.after === 2, `seen from the night side, a small craft over daylight is still a dot in front of black, and is left (selects: ${fromNight.after})`);
    const lookingAway = stay(3, { x: 10, y: 0, z: 1.03 }, moonDay, { x: 10, y: 0, z: 1.02 });
    check(lookingAway.after === 2, `seen from below, looking away from the ground, it is left too (selects: ${lookingAway.after})`);
    // A model that has not faded in yet is not on the screen: its size counts by how much of it shows.
    {
      const seen = [];
      const d6 = D.createDrift(stubs({
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => ({ x: 50, y: 0, z: 0 }),
        worlds: farFromAnything,
        heroes: { drawnPx: () => 260, drawnOpacity: () => 0.05 },
      }), env());
      d6.start({ through: ['craft'], realOnly: false, tags: true, pace: 'calm' });
      run(1500 + D.PEEK_MS + 500);
      check(seen.length === 2, `a model 260 px tall of which a twentieth shows is a dot still, and is left (selects: ${seen.length})`);
      d6.stop();
    }
    // Every craft a dot (the models never came): HURRY_MOST stays are left early, and the next is kept.
    {
      const seen = [];
      const d7 = D.createDrift(stubs({
        select: (record) => { seen.push(record.id); },
        positionOfRecord: () => ({ x: 50, y: 0, z: 0 }),
        worlds: farFromAnything,
        heroes: { drawnPx: () => 0 },
      }), env());
      d7.start({ through: ['craft'], realOnly: false, tags: true, pace: 'calm' });
      for (let k = 0; k < D.HURRY_MOST + 1; k++) run(1500 + D.PEEK_MS + 500);
      const after = seen.length;
      run(3000);
      check(after === D.HURRY_MOST + 1 && seen.length === after && d7.state().phase === 'dwell' && D.HURRY_MOST >= 2 && D.HURRY_MOST <= 5, `${D.HURRY_MOST} dots running are left and the next stay is kept (selects: ${after}, then ${seen.length})`);
      d7.stop();
    }
    check(D.SMALL_PX >= 12 && D.SMALL_PX <= 60 && D.PEEK_MS >= 2000 && D.PEEK_MS <= 8000, 'the dot is a few tens of pixels and the look a few seconds in');
    const heroes = read('site/js/scene/heroes.js');
    check(/drawnPx\(id\) \{/.test(heroes) && /entry\.px = /.test(heroes), 'scene/heroes.js says how many pixels across it draws a record');
    check(/ctx\.heroes = heroes/.test(read('site/js/main.js')), 'and main.js hands the model layer to the drift');
  }

  // From the ground, and under a reel, it does not start.
  const ground = D.createDrift({ ...ctx, skyView: { active: true } }, { document: null, window: null, navigator: {}, storage: null });
  check(ground.apply({ drift: '1' }) === false && !ground.active, 'from the ground nothing flies');
  const reel = D.createDrift({ ...ctx, autopilot: { engaged: true } }, { document: null, window: null, navigator: {}, storage: null });
  check(reel.apply({ drift: '1' }) === false, 'a reel has the screen already');
}

// --- 6. the seams --------------------------------------------------------------------------------
{
  const main = read('site/js/main.js');
  check(/ctx\.wantDrift = \(keys, from\) => \(drift \|\| \(drift = import\('\.\/ui\/drift\.js'\)/.test(main), 'main.js fetches the drift on demand');
  check(/if \(wander \|\| \(ctx\.drift && ctx\.drift\.active\)\)/.test(main), 'main.js starts and stops it when the address changes');
  check(/link\.drift && link\.drift !== '0'\) ctx\.wantDrift\(link, 'link'\)/.test(main), 'main.js starts it from the link it was opened by');
  check(/flyToRecord\(record, opts\.flyMs, opts\.flight\)/.test(main), 'select() hands the flight on');
  check(/apexFor/.test(main), 'flyToRecord asks for the apex once it knows the destination');
  const explore = read('site/js/ui/explore.js');
  check(/ctx\.wantDrift\(\{ drift: '1' \}, 'row'\)/.test(explore), 'Just watch has the Drift row');
  const css = read('site/css/drift.css');
  check(/\.sr-drift__host\.is-idle\s*\{\s*opacity: 0;/.test(css), 'css/drift.css: the bar goes when the pointer is still');
  check(/html\.sr-drift--still canvas\s*\{\s*cursor: none;/.test(css), 'css/drift.css: and the pointer with it');
  check(/min-height: 44px/.test(css), 'css/drift.css: every target is 44 px');
  const boot = read('tests/test_boot_diet.mjs');
  for (const f of ['js/ui/drift.js', 'js/ui/driftplan.js']) check(boot.includes(`'${f}'`), `tests/test_boot_diet.mjs holds ${f} out of the first visit`);
  const d = COPY.drift;
  for (const c of P.CATEGORIES) check(d && d.cats && typeof d.cats[c] === 'string', `copy: a name for "${c}"`);
  for (const p of Object.keys(P.PACES)) check(d && d.paces && typeof d.paces[p] === 'string', `copy: a name for the pace "${p}"`);
  for (const c of P.CATEGORIES) check(Array.isArray(D.LAYERS_FOR[c]) && D.LAYERS_FOR[c].length > 0, `"${c}" names the layers it is made of`);
  const layers = read('registry/layers.yaml');
  for (const ids of Object.values(D.LAYERS_FOR)) for (const id of ids) check(new RegExp(`- id: ${id}\\b`).test(layers), `registry/layers.yaml has the layer "${id}"`);
}

if (problems.length) {
  console.error(`test_drift: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_drift: the link, the places, the walk, the timings, the controller and the seams hold');
