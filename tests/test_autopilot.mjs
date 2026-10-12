// tests/test_autopilot.mjs -- a screen that plays on its own (spec 0036; ui/autopilot.js,
// ui/autopilotplan.js, registry/autopilot.yaml).
//
//   1. THE LINK: what `#ambient=…&shuffle=…&sound=…&voice=…&captions=…&pace=…` asks for.
//   2. THE ORDER: in order, shuffled (the same seed, the same lap), never the same trip on both
//      sides of a lap's seam, a reloaded page's trip first, a lap in which nothing played.
//   3. HOW LONG: a stop read aloud and a stop read; the shipped reels against their own minutes.
//   4. THE WATCHDOG: every phase inside its budget is left alone; outside it, the one action.
//   5. HANDS ON, HANDS OFF: gate, ambient, offered, manual.
//   6. THE RELOAD: twelve hours, an update, a screen with sound, the guard against a loop.
//   7. THE CONTROLLER on a stub trip and a stub clock: trips back to back with a card between,
//      a refused trip skipped in silence, a flight that never lands, a lost context, the sound
//      question, the take-over and the return, the nightly reload, the resume, the test pace.
//   8. THE SEAMS: the frame, the worker's page side and main.js ask the autopilot what they must.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const eq = (a, b, what) => check(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

const P = await import(join(JS, 'ui/autopilotplan.js'));
const { AUTOPILOT, REELS } = await import(join(JS, 'data/autopilot.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { NARRATION } = await import(join(JS, 'data/narration.js'));
const { createAutopilot, URL_KEYS } = await import(join(JS, 'ui/autopilot.js'));
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));

const IDS = TOURS.map((x) => x.id);

// --- 1. the link ---------------------------------------------------------------------------------
{
  const read = (link) => P.readOptions(link, REELS, AUTOPILOT, IDS);
  check(read({}).on === false, 'no `ambient` key: the mode is off');
  check(read({ ambient: '0' }).on === false && read({ ambient: 'off' }).on === false, '`ambient=0` and `ambient=off` are off');
  const one = read({ ambient: '1' });
  check(one.on && one.reel.id === AUTOPILOT.default, '`ambient=1` plays the default reel');
  check(one.sound === 'off' && one.soundAsked === false, 'the lobby starts silent, and that is only its default');
  check(one.voice === true && one.captions === true && one.shuffle === false && one.pace === 1, 'voice and captions on, no shuffle, real time, unless the link says');
  const cls = read({ ambient: 'classroom-45' });
  check(cls.reel.id === 'classroom-45' && cls.sound === 'ask', 'a reel by its id; the classroom reel asks for sound');
  const quiet = read({ ambient: 'classroom-45', sound: '0', voice: '0', captions: '0', shuffle: '1', pace: '20' });
  check(quiet.sound === 'off' && quiet.soundAsked === true, '`sound=0` is an order');
  check(quiet.voice === false && quiet.captions === false && quiet.shuffle === true && quiet.pace === 20, 'voice, captions, shuffle and pace are read');
  check(read({ ambient: '1', sound: '1' }).sound === 'ask', '`sound=1` asks, on a reel that would not');
  check(read({ ambient: '1', pace: '9999' }).pace === P.MAX_PACE && read({ ambient: '1', pace: 'x' }).pace === 1, 'the pace is capped, and a word is real time');
  const hand = read({ ambient: 'moon-landings,nope,the-sun-today,moon-landings' });
  eq(hand.trips, ['moon-landings', 'the-sun-today'], 'trip ids with commas are a playlist: unknown and repeated ids dropped');
  check(hand.notes.includes('unknown:nope'), 'a dropped id is noted for the log');
  const lost = read({ ambient: 'no-such-reel' });
  check(lost.on && lost.reel.id === AUTOPILOT.default && lost.notes.length === 1, 'a word that names nothing plays the default reel and says so');
  const older = P.readOptions({ ambient: '1' }, REELS, AUTOPILOT, IDS.filter((id) => id !== 'back-to-the-moon'));
  check(!older.trips.includes('back-to-the-moon') && older.trips.length === one.trips.length - 1, 'a trip this build does not have is left out of the lap');
  for (const key of URL_KEYS) check(KEYS.includes(key), `ui/urlstate.js KEYS carries \`${key}\`, or the first write of a trip's stop would drop it from the address`);
}

// --- 2. the order --------------------------------------------------------------------------------
{
  const list = ['a', 'b', 'c', 'd', 'e'];
  const inOrder = P.createPlaylist(list);
  const seen = [inOrder.current];
  for (let i = 0; i < 6; i += 1) seen.push(inOrder.advance(true));
  eq(seen, ['a', 'b', 'c', 'd', 'e', 'a', 'b'], 'in order, and round again');
  check(inOrder.lap === 1 && inOrder.stalled === false, 'the lap is counted');

  const s1 = P.createPlaylist(list, { shuffle: true, seed: 42 });
  const s2 = P.createPlaylist(list, { shuffle: true, seed: 42 });
  eq(s1.order(), s2.order(), 'the same seed is the same lap');
  check(JSON.stringify(P.createPlaylist(list, { shuffle: true, seed: 7 }).order()) !== JSON.stringify(list) || JSON.stringify(s1.order()) !== JSON.stringify(list), 'a shuffled lap is not the written order');
  eq([...s1.order()].sort(), list, 'a shuffled lap is every trip once');
  let seam = true;
  for (let seed = 1; seed <= 40; seed += 1) {
    const p = P.createPlaylist(list, { shuffle: true, seed });
    let last = p.current;
    for (let i = 0; i < 40; i += 1) { const next = p.advance(true); if (next === last) seam = false; last = next; }
  }
  check(seam, 'no trip plays twice running across a lap\'s seam (40 seeds, 8 laps each)');

  const resumed = P.createPlaylist(list, { startAt: 'd' });
  eq([resumed.current, resumed.advance(true), resumed.advance(true)], ['d', 'e', 'a'], 'a reloaded page goes on from its trip');
  check(P.createPlaylist(list, { shuffle: true, seed: 3, startAt: 'd' }).current === 'd', '...also when shuffled');

  const dead = P.createPlaylist(['a', 'b', 'c']);
  dead.advance(false); dead.advance(false);
  check(dead.stalled === false, 'two refusals are not a stall');
  dead.advance(false);
  check(dead.stalled === true, 'a whole lap refused is a stall');
  dead.advance(true);
  check(dead.stalled === false, 'one trip played clears it');
  check(P.createPlaylist([]).advance(true) === null, 'an empty reel has no next trip');
}

// --- 3. how long -----------------------------------------------------------------------------------
{
  check(P.stopDwellMs({ dwellMs: 12000 }, { voiced: false, clipSeconds: 18 }) === 12000, 'sound off: the card\'s reading time, whatever the clip');
  check(P.stopDwellMs({ dwellMs: 12000 }, { voiced: true, clipSeconds: 18 }) === 19000, 'read aloud: the clip and a second of quiet');
  check(P.stopDwellMs({ dwellMs: 12000 }, { voiced: true, clipSeconds: 6 }) === 12000, 'a clip shorter than the reading time does not shorten the stop');
  check(P.stopDwellMs({ dwellMs: 12000 }, { voiced: true, clipSeconds: 0 }) === 12000, 'no clip: the reading time');
  check(P.paced(12000, 1) === 12000 && P.paced(12000, 20) === 600 && P.paced(1000, 60) === 400, 'the test pace divides, and never under 0.4 s');

  for (const reel of REELS) {
    for (const id of reel.trips) check(IDS.includes(id), `reel ${reel.id}: ${id} is a trip`);
    const silent = P.reelMs(reel.trips, TOURS, NARRATION.clips, { voiced: false, title_s: AUTOPILOT.timing.title_s });
    const voiced = P.reelMs(reel.trips, TOURS, NARRATION.clips, { voiced: true, title_s: AUTOPILOT.timing.title_s });
    check(voiced.ms >= silent.ms, `reel ${reel.id}: read aloud is never shorter`);
    check(Math.abs(voiced.minutes - reel.minutes) <= reel.minutes * 0.2, `reel ${reel.id}: says ${reel.minutes} min, the trips and their clips make ${voiced.minutes} (silent ${silent.minutes})`);
    const place = reel.trips.every((id) => TOURS.find((x) => x.id === id).requires_observer);
    check(place === !!reel.place, `reel ${reel.id}: \`place\` is ${!!reel.place} and its trips ${place ? 'all' : 'do not all'} start from the visitor's ground`);
  }
  check(REELS.some((r) => r.id === AUTOPILOT.default && !r.place), 'the default reel exists and needs no place');
  eq(REELS.map((r) => r.id), ['classroom-45', 'lobby', 'tonight'], 'the three reels');
}

// --- 4. the watchdog ---------------------------------------------------------------------------------
{
  const w = (s) => P.watchdog({ sinceMs: 0, skips: 0, hidden: false, lostMs: null, ...s });
  for (const phase of ['resolving', 'intro', 'flight', 'veil', 'settle', 'held', 'paused', 'outro']) {
    check(w({ phase, sinceMs: P.BUDGET[phase] }).action === 'none', `${phase}: at its budget, left alone`);
  }
  eq(w({ phase: 'flight', sinceMs: P.BUDGET.flight + 1 }), { action: 'next', why: 'flight-never-arrived' }, 'a flight past its budget is moved on');
  eq(w({ phase: 'flight', sinceMs: P.BUDGET.flight + 1, nudged: true }), { action: 'skip-trip', why: 'flight-stuck-twice' }, '...and the second time the trip is left');
  check(w({ phase: 'veil', sinceMs: P.BUDGET.veil + 1 }).action === 'next' && w({ phase: 'settle', sinceMs: P.BUDGET.settle + 1 }).action === 'next', 'a veil or a settle that never ends is moved on');
  check(w({ phase: 'dwell', sinceMs: 30000, dwellMs: 12000 }).action === 'none', 'a dwell inside its grace is left alone');
  eq(w({ phase: 'dwell', sinceMs: 12000 + P.BUDGET.dwellGrace + 1, dwellMs: 12000 }), { action: 'next', why: 'dwell-overran' }, 'a dwell past its length and the grace is moved on');
  check(w({ phase: 'dwell', sinceMs: 30000, dwellMs: 19000 }).action === 'none' && w({ phase: 'dwell', sinceMs: 30000, dwellMs: 600 }).action === 'next', 'the dwell\'s budget is the stop\'s own length');
  check(w({ phase: 'held', sinceMs: P.BUDGET.held + 1 }).action === 'next', 'a held stop does not hold a wall for ever');
  check(w({ phase: 'paused', sinceMs: P.BUDGET.paused + 1 }).action === 'resume', 'a pause nobody asked for is resumed');
  check(w({ phase: 'resolving', sinceMs: P.BUDGET.resolving + 1 }).action === 'skip-trip', 'a trip that never resolves is skipped');
  check(w({ phase: 'intro', sinceMs: P.BUDGET.intro + 1 }).action === 'play', 'a trip left on its intro is started');
  check(w({ phase: 'outro', sinceMs: P.BUDGET.outro + 1 }).action === 'skip-trip', 'an end card nobody left is left');
  check(P.BUDGET.intro > AUTOPILOT.timing.title_s * 1000, 'the intro\'s budget is longer than the card between two trips, which is up during it');
  check(w({ phase: 'flight', sinceMs: 10 ** 7, hidden: true }).action === 'none', 'a hidden tab is never late');
  check(w({ phase: 'idle', sinceMs: 10 ** 7 }).action === 'none', 'no trip, nothing to move on');
  check(w({ phase: 'dwell', sinceMs: 0, lostMs: P.BUDGET.contextLost - 1 }).action === 'none', 'a context lost for under five seconds is waited for');
  eq(w({ phase: 'dwell', sinceMs: 0, lostMs: P.BUDGET.contextLost }), { action: 'reload', why: 'context-lost' }, 'a context not handed back reloads the page');
  eq(w({ phase: 'flight', sinceMs: 0, skips: P.BUDGET.skipsBeforeReload }), { action: 'reload', why: 'trips-abandoned' }, 'three trips abandoned in a row reload the page');
  check(w({ phase: 'dwell', sinceMs: 0, dwellMs: 12000, tripMs: 100000 * 3 + 120001, tripEstimateMs: 100000 }).action === 'skip-trip', 'a trip three times its length and two minutes over is left');
  check(w({ phase: 'dwell', sinceMs: 0, dwellMs: 12000, tripMs: 100000 * 3 + 120000, tripEstimateMs: 100000 }).action === 'none', '...and not a second before');
}

// --- 5. hands on, hands off ----------------------------------------------------------------------------
{
  const T = { offer_s: 10, idle_s: 120 };
  const run = (state, ...events) => events.reduce((acc, e) => { const out = P.controls(acc.state, e, T); return { state: out.state, effects: [...acc.effects, out.effect] }; }, { state, effects: [] });
  let r = run({ mode: 'gate', until: 10000 }, { type: 'tick', at: 9999 });
  check(r.state.mode === 'gate', 'the gate waits its ten seconds');
  r = run({ mode: 'gate', until: 10000 }, { type: 'tick', at: 10000 });
  eq([r.state.mode, r.effects], ['ambient', ['silent']], 'nobody there: it starts silent');
  r = run({ mode: 'gate', until: 10000 }, { type: 'input', at: 3000 });
  eq([r.state.mode, r.effects], ['ambient', ['sound']], 'a key at the gate starts the sound, and offers nothing');
  r = run({ mode: 'ambient', until: null }, { type: 'input', at: 1000 });
  eq([r.state, r.effects], [{ mode: 'offered', until: 11000 }, ['offer']], 'a key or a touch offers the controls for ten seconds');
  r = run({ mode: 'offered', until: 11000 }, { type: 'tick', at: 10999 }, { type: 'tick', at: 11000 });
  eq([r.state.mode, r.effects], ['ambient', [null, 'withdraw']], 'left alone, the offer goes and the reel never stopped');
  r = run({ mode: 'offered', until: 11000 }, { type: 'input', at: 9000 }, { type: 'tick', at: 11000 });
  eq([r.state, r.effects], [{ mode: 'offered', until: 19000 }, [null, null]], 'another touch keeps the offer up');
  r = run({ mode: 'offered', until: 11000 }, { type: 'take', at: 5000 });
  eq([r.state, r.effects], [{ mode: 'manual', until: 125000 }, ['take']], 'taken: the visitor has the map, for two minutes of idleness');
  r = run({ mode: 'ambient', until: null }, { type: 'escape', at: 0 });
  eq([r.state.mode, r.effects], ['manual', ['take']], 'Escape takes the controls at once');
  r = run({ mode: 'manual', until: 125000 }, { type: 'tick', at: 124999 }, { type: 'input', at: 124999 }, { type: 'tick', at: 200000 });
  eq([r.state, r.effects], [{ mode: 'manual', until: 244999 }, [null, null, null]], 'every touch restarts the two minutes');
  r = run({ mode: 'manual', until: 125000 }, { type: 'tick', at: 125000 });
  eq([r.state.mode, r.effects], ['ambient', ['return']], 'two minutes with no hand: the reel takes the screen back');
  eq(P.controls({ mode: 'ambient', until: null }, { type: 'tick', at: 5 }, T).effect, null, 'time alone changes nothing while it plays');
}

// --- 6. the reload ---------------------------------------------------------------------------------------
{
  const H = 3600000;
  const base = { betweenTrips: true, uptimeMs: 12 * H, reloadMs: 12 * H, updateReady: false, soundOn: false, autoplayFree: false, localHour: 14 };
  check(P.reloadDue(base) === 'age', 'twelve hours old, between two trips, silent: reload');
  check(P.reloadDue({ ...base, uptimeMs: 12 * H - 1 }) === null, 'a second younger: not yet');
  check(P.reloadDue({ ...base, betweenTrips: false }) === null, 'never mid-trip');
  check(P.reloadDue({ ...base, uptimeMs: H, updateReady: true }) === 'update', 'a newer build takes over between two trips, whatever the age');
  check(P.reloadDue({ ...base, soundOn: true }) === null, 'a screen whose sound a person started is not silenced at two in the afternoon');
  check(P.reloadDue({ ...base, soundOn: true, localHour: 3 }) === 'age', '...it reloads in the small hours');
  check(P.reloadDue({ ...base, soundOn: true, autoplayFree: true }) === 'age', 'a kiosk whose browser starts sound by itself loses nothing by a reload');
  check(P.reloadDue({ ...base, uptimeMs: H, updateReady: true, soundOn: true }) === null, 'an update waits for the small hours too on a screen with sound');
  check(P.reloadAllowed([], 1000) && P.reloadAllowed([0, 1, 2].map((x) => x - P.RELOAD_WINDOW_MS), 1000), 'no recent reloads: allowed');
  check(P.reloadAllowed([100, 200], 1000) && !P.reloadAllowed([100, 200, 300], 1000), 'the fourth reload in ten minutes is refused');
  eq(P.resumeFrom({ trip: 'b', stop: '4' }, ['a', 'b']), { trip: 'b', stop: 3 }, 'a reloaded page goes on from its address: the trip, and the stop as an index');
  eq(P.resumeFrom({ trip: 'b' }, ['a', 'b']), { trip: 'b', stop: 0 }, 'a trip with no stop starts at its first');
  check(P.resumeFrom({ trip: 'z', stop: '4' }, ['a', 'b']) === null && P.resumeFrom({}, ['a']) === null, 'a trip that is not the reel\'s is not a resume');
  const log = [];
  for (let i = 0; i < P.LOG_CAP + 30; i += 1) P.pushLog(log, { i });
  check(log.length === P.LOG_CAP && log[0].i === 30, 'the log keeps its last 200 lines');
}

// --- 7. the controller ---------------------------------------------------------------------------------
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fakeTimers() {
  let now = 0;
  let seq = 0;
  const q = new Map();
  return {
    set(fn, ms) { seq += 1; q.set(seq, { at: now + Math.max(0, ms || 0), fn }); return seq; },
    clear(id) { q.delete(id); },
    every(fn, ms) { seq += 1; q.set(seq, { at: now + ms, fn, every: ms }); return seq; },
    stop(id) { q.delete(id); },
    now: () => now,
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await tick();
        let best = null;
        for (const [id, x] of q) if (x.at <= end && (!best || x.at < best.x.at || (x.at === best.x.at && id < best.id))) best = { id, x };
        if (!best) break;
        now = best.x.at;
        if (best.x.every) best.x.at = now + best.x.every;
        else q.delete(best.id);
        best.x.fn();
      }
      now = end;
      await tick();
    },
  };
}

/** A trip that behaves as ui/trip.js does from the outside, on the same fake clock. */
function stubTrip(timers, tours, quirks = {}) {
  const state = { phase: 'idle', tourId: null, index: -1, count: 0, stops: [], stopId: null, reason: null };
  const listeners = new Set();
  const calls = [];
  let run = null;
  let gen = 0;
  const notify = () => { for (const fn of [...listeners]) fn(state); };
  function goTo(i) {
    if (!run) return;
    if (i >= run.stops.length) { state.phase = 'outro'; notify(); return; }
    gen += 1;
    const mine = gen;
    state.index = i;
    state.stopId = run.stops[i].id;
    state.phase = 'flight';
    notify();
    if ((quirks.stuck || []).includes(`${run.id}/${i}`)) return; // the flight never lands
    timers.set(() => {
      if (mine !== gen) return;
      state.phase = 'settle'; notify();
      timers.set(() => {
        if (mine !== gen) return;
        state.phase = 'dwell'; notify();
        timers.set(() => { if (mine === gen) goTo(i + 1); }, run.stops[i].dwell_ms);
      }, 150);
    }, 3000);
  }
  return {
    calls,
    state,
    tours: () => tours,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start(id) {
      calls.push(['start', id]);
      if ((quirks.broken || []).includes(id)) return Promise.reject(new Error('the module did not load'));
      if ((quirks.refused || []).includes(id)) return Promise.resolve({ id, count: 0, offerable: false, reason: 'no place' });
      const tour = tours.find((x) => x.id === id);
      run = { id, stops: tour.stops };
      state.tourId = id;
      state.count = tour.stops.length;
      state.stops = tour.stops.map((s) => ({ id: s.id, dwellMs: s.dwell_ms }));
      state.index = -1;
      state.phase = 'intro';
      notify();
      return Promise.resolve({ id, count: tour.stops.length, dropped: [] });
    },
    play() { calls.push(['play', state.tourId]); if (run && state.phase === 'intro') goTo(run.startAt || 0); },
    jumpTo(i) { calls.push(['jumpTo', i]); if (run && state.phase === 'intro') run.startAt = i; else goTo(i); },
    next() { calls.push(['next', state.index]); goTo(state.index + 1); },
    resume() { calls.push(['resume']); },
    stop(reason, o) {
      calls.push(['stop', reason, !!(o && o.stay)]);
      gen += 1;
      run = null;
      state.phase = 'idle';
      state.tourId = null;
      state.index = -1;
      state.reason = reason || null;
      notify();
    },
  };
}

function stubView() {
  const seen = { cards: [], offers: [], modes: [], mounted: 0, unmounted: 0, captions: null };
  let input = () => {};
  return {
    seen,
    press: (kind) => input(kind),
    mount() { seen.mounted += 1; },
    unmount() { seen.unmounted += 1; },
    onInput(fn) { input = fn; },
    setMode(m) { seen.modes.push(m); },
    captions(on) { seen.captions = on; },
    card(c) { seen.cards.push(c ? `${c.kind}:${c.title}` : null); },
    offer(on) { seen.offers.push(on); },
  };
}

function stubAudio({ runs = false } = {}) {
  let on = false;
  const a = {
    calls: [],
    context: { state: runs ? 'running' : 'suspended' },
    isOn: () => on,
    enable() { on = true; a.calls.push('enable'); if (a.gesture) a.context.state = 'running'; },
    disable() { on = false; a.calls.push('disable'); },
    gesture: false,
  };
  return a;
}

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
}

const stop3 = (id) => ({ id, title: `Trip ${id}`, blurb: 'A blurb.', estimate_ms: 3 * (12000 + 3350), stops: [1, 2, 3].map((n) => ({ id: `s${n}`, dwell_ms: 12000 })) });
const WORLD = ['a-year-in-a-minute', 'back-to-the-moon', 'the-living-earth', 'outer-solar-system'].map(stop3);

function rig({ link = { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth' }, quirks, audio, from, hour = 14, storage } = {}) {
  const timers = fakeTimers();
  const trip = stubTrip(timers, WORLD, quirks);
  const view = stubView();
  const reloads = [];
  const deselected = [];
  const ctx = { trip, audio: audio || null, deselect: () => deselected.push(timers.now()), renderer: { info: { memory: { geometries: 10, textures: 5 }, programs: [1, 2] } } };
  const store = storage || memoryStore();
  let wallNow = 1000000;
  const pilot = createAutopilot(ctx, {
    view, timers, storage: store, reload: () => reloads.push(timers.now()), seed: 1, clips: {}, hour: () => hour,
    wall: () => wallNow + timers.now(), document: { hidden: false, addEventListener() {}, removeEventListener() {} }, navigator: {},
  });
  ctx.autopilot = pilot;
  const quiet = console.info;
  console.info = () => {};
  const started = pilot.start(link, from);
  return { timers, trip, view, pilot, reloads, deselected, ctx, store, started, done: () => { console.info = quiet; }, what: (name) => pilot.log().filter((l) => l.what === name) };
}

// 7a. three trips back to back, a card before each, the lap wraps.
{
  const r = rig();
  check(r.started === true && r.pilot.active === true && r.view.seen.mounted === 1, 'the reel starts: the view is up and the frame is told');
  await r.timers.advance(1000);
  check(r.view.seen.cards.includes('title:Trip a-year-in-a-minute'), 'the first trip is announced on a card');
  check(!r.trip.calls.some((c) => c[0] === 'play'), 'the trip waits on its intro while the card is up');
  await r.timers.advance(8000);
  check(r.trip.calls.some((c) => c[0] === 'play'), 'after the card, the reel presses Start');
  check(r.view.seen.cards[r.view.seen.cards.length - 1] === null, 'the card goes when the trip starts');
  // One trip: 3 stops of 3 s flight + 0.15 s + 12 s, then the end, a breath, the next card.
  await r.timers.advance(3 * 15150 + 1500 + 500);
  eq(r.what('stop').map((l) => `${l.trip}:${l.n}`), ['a-year-in-a-minute:1', 'a-year-in-a-minute:2', 'a-year-in-a-minute:3'], 'every stop of the first trip was reached, in order');
  const end = r.what('trip-end')[0];
  check(end && end.trip === 'a-year-in-a-minute' && end.stops === 3 && end.mem && end.mem.geo === 10 && end.mem.tex === 5, 'the end of a trip is logged with what the renderer holds');
  check(r.trip.calls.some((c) => c[0] === 'stop' && c[1] === 'ambient' && c[2] === true), 'the trip is left where it ended (stay), not flown home');
  check(r.deselected.length >= 1, 'what the trip left selected is let go');
  check(r.view.seen.cards.includes('title:Trip back-to-the-moon'), 'the next trip is announced');
  await r.timers.advance(2 * (8000 + 3 * 15150 + 1500 + 500) + 9000);
  eq(r.trip.calls.filter((c) => c[0] === 'start').map((c) => c[1]).slice(0, 4), ['a-year-in-a-minute', 'back-to-the-moon', 'the-living-earth', 'a-year-in-a-minute'], 'three trips, then the first again');
  check(r.pilot.state().lap === 1 && r.what('watchdog').length === 0, 'a healthy lap: the watchdog said nothing');
  check(r.reloads.length === 0, '...and nothing reloaded');
  r.done();
}

// 7b. a trip that cannot run is skipped without a card; a lap of refusals falls back, then waits.
{
  const r = rig({ quirks: { refused: ['back-to-the-moon'] } });
  await r.timers.advance(9000 + 3 * 15150 + 2500);
  await r.timers.advance(2000);
  check(!r.view.seen.cards.includes('title:Trip back-to-the-moon'), 'a refused trip is never announced');
  check(r.view.seen.cards.includes('title:Trip the-living-earth'), 'the one after it is');
  const skip = r.what('skip')[0];
  check(skip && skip.trip === 'back-to-the-moon' && skip.why === 'refused' && skip.detail === 'no place', 'the refusal is in the log with its reason');
  check(r.pilot.state().skips === 0, 'a refusal is not an abandoned trip: it never leads to a reload');
  r.done();

  const dead = rig({ quirks: { refused: ['a-year-in-a-minute', 'back-to-the-moon', 'the-living-earth', 'outer-solar-system'] } });
  await dead.timers.advance(5000);
  check(dead.what('fallback').length === 1 && dead.what('fallback')[0].to === AUTOPILOT.default, 'a lap in which nothing could play falls back to the default reel');
  check(dead.what('nothing-to-play').length === 1, '...and when that cannot play either, it says so once and waits');
  const starts = dead.trip.calls.filter((c) => c[0] === 'start').length;
  await dead.timers.advance(30000);
  check(dead.trip.calls.filter((c) => c[0] === 'start').length - starts <= REELS.find((x) => x.id === AUTOPILOT.default).trips.length, 'it does not spin through the list while it waits');
  check(dead.view.seen.cards.every((c) => c === null), 'nothing is said on screen');
  check(dead.reloads.length === 0, 'refusals never reload the page');
  dead.done();

  const broken = rig({ quirks: { broken: ['a-year-in-a-minute'] } });
  await broken.timers.advance(10000);
  check(broken.what('skip')[0] && broken.what('skip')[0].why === 'did-not-load', 'a trip whose module does not load is skipped');
  check(broken.view.seen.cards.includes('title:Trip back-to-the-moon'), '...and the next one plays');
  broken.done();
}

// 7c. a flight that never lands: Next once; a second in the same trip and the trip is left.
{
  const r = rig({ quirks: { stuck: ['a-year-in-a-minute/1'] } });
  await r.timers.advance(9000 + 15150 + 59000);
  check(r.what('watchdog').length === 0, 'a flight is given its whole budget');
  await r.timers.advance(3000);
  const w = r.what('watchdog')[0];
  check(w && w.action === 'next' && w.why === 'flight-never-arrived' && w.trip === 'a-year-in-a-minute' && w.n === 2, 'the stuck stop is moved on, and the log says which');
  check(r.trip.calls.some((c) => c[0] === 'next' && c[1] === 1), 'Next was pressed for it');
  await r.timers.advance(20000);
  check(r.what('stop').some((l) => l.n === 3), 'the trip goes on to its next stop');
  r.done();

  const twice = rig({ quirks: { stuck: ['a-year-in-a-minute/1', 'a-year-in-a-minute/2'] } });
  await twice.timers.advance(9000 + 15150 + 62000);
  await twice.timers.advance(62000);
  await twice.timers.advance(62000);
  const acts = twice.what('watchdog').map((l) => l.action);
  check(acts.filter((a) => a === 'next').length >= 2, 'each stuck stop gets its one Next');
  await twice.timers.advance(20000);
  check(twice.view.seen.cards.includes('title:Trip back-to-the-moon'), 'and the reel reaches the next trip all the same');
  twice.done();
}

// 7d. a lost context: handed back in time, nothing; not handed back, one reload, and a guard.
{
  const lose = (state) => globalThis.__srWebgl && globalThis.__srWebgl({ detail: { state } });
  // The controller listens on window; node has none, so the listener is reached through a stand-in.
  const listeners = new Map();
  globalThis.window = {
    addEventListener: (type, fn) => { listeners.set(type, fn); },
    removeEventListener: (type) => { listeners.delete(type); },
    dispatchEvent: () => true,
  };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  globalThis.__srWebgl = (e) => listeners.get('sr:webgl') && listeners.get('sr:webgl')(e);

  const r = rig();
  await r.timers.advance(12000);
  lose('lost');
  await r.timers.advance(3000);
  lose('restored');
  await r.timers.advance(10000);
  check(r.reloads.length === 0 && r.what('context-restored').length === 1, 'a context handed back inside five seconds: no reload');
  lose('lost');
  await r.timers.advance(7000);
  check(r.reloads.length === 1 && r.what('reload')[0].why === 'context-lost', 'a context not handed back: the page reloads, once');
  check(r.pilot.engaged === false, 'the reel does nothing more on a page that is going');
  r.done();

  // The guard: three reloads in ten minutes are on record; the fourth is held and the reel goes on.
  const store = memoryStore();
  store.setItem('sr:ambient:reloads', JSON.stringify([1000000 - 5000, 1000000 - 4000, 1000000 - 3000]));
  const held = rig({ storage: store });
  await held.timers.advance(12000);
  lose('lost');
  await held.timers.advance(8000);
  check(held.reloads.length === 0 && held.what('reload-held').length === 1, 'a fourth reload in ten minutes is held back, and said once');
  check(held.pilot.engaged === true, '...and the reel is still running');
  held.done();
  delete globalThis.window;
  delete globalThis.CustomEvent;
  delete globalThis.__srWebgl;
}

// 7e. the sound question.
{
  const audio = stubAudio();
  const r = rig({ link: { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth', sound: '1' }, audio });
  await r.timers.advance(1000);
  check(r.view.seen.cards.some((c) => c && c.startsWith('gate:')), 'sound wanted and no hand yet: the one card asks');
  check(!r.trip.calls.some((c) => c[0] === 'start'), 'nothing starts behind the question');
  audio.gesture = true;
  r.view.press('input');
  await r.timers.advance(500);
  check(audio.isOn() && r.pilot.state().soundOn === true, 'a key starts the sound');
  check(r.view.seen.offers.length === 0, '...and is not taken as a hand on the controls');
  check(r.store.getItem('sr:ambient:sound') === '1', 'the choice is remembered for the reload');
  await r.timers.advance(2000);
  check(r.trip.calls.some((c) => c[0] === 'start'), 'then the reel starts');
  r.done();

  const audio2 = stubAudio();
  const silent = rig({ link: { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth', sound: '1' }, audio: audio2 });
  await silent.timers.advance(9000);
  check(!silent.trip.calls.some((c) => c[0] === 'start'), 'the question waits its ten seconds');
  await silent.timers.advance(3000);
  check(silent.trip.calls.some((c) => c[0] === 'start') && !audio2.isOn() && silent.pilot.state().soundOn === false, 'nobody pressed: it starts silent');
  silent.done();

  const audio3 = stubAudio({ runs: true });
  audio3.gesture = true;
  const kiosk = rig({ link: { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth', sound: '1' }, audio: audio3 });
  await kiosk.timers.advance(1000);
  check(!kiosk.view.seen.cards.some((c) => c && c.startsWith('gate:')) && kiosk.pilot.state().soundOn && kiosk.pilot.state().autoplayFree, 'a browser that starts sound by itself is never asked');
  kiosk.done();

  const audio4 = stubAudio({ runs: true });
  audio4.enable();
  const ordered = rig({ link: { ambient: '1', sound: '0' }, audio: audio4 });
  await ordered.timers.advance(1000);
  check(!audio4.isOn(), '`sound=0` silences a browser that remembered sound on');
  ordered.done();
  const audio5 = stubAudio({ runs: true });
  audio5.enable();
  const left = rig({ link: { ambient: '1' }, audio: audio5 });
  await left.timers.advance(1000);
  check(audio5.isOn() && !audio5.calls.includes('disable'), 'a silent-by-default reel leaves a visitor\'s sound as it was');
  left.done();
}

// 7f. the take-over and the return.
{
  const r = rig();
  await r.timers.advance(9000 + 5000);
  r.view.press('input');
  eq(r.view.seen.offers, [true], 'a touch offers the controls');
  check(r.pilot.active === true && r.trip.state.phase !== 'idle', 'the reel goes on behind the offer');
  await r.timers.advance(11000);
  eq(r.view.seen.offers, [true, false], 'ten seconds untouched: the offer goes');
  r.view.press('input');
  r.view.press('take');
  check(r.pilot.active === false && r.pilot.engaged === true && r.pilot.state().mode === 'manual', 'taken: the visitor has the map, the mode is still on');
  check(r.view.seen.modes[r.view.seen.modes.length - 1] === 'manual', 'the panels come back');
  check(r.trip.state.phase === 'idle' && r.trip.calls.some((c) => c[0] === 'stop' && c[1] === 'controls' && c[2] === true), 'the trip stops where the camera is');
  const startsBefore = r.trip.calls.filter((c) => c[0] === 'start').length;
  await r.timers.advance(100000);
  r.view.press('input');
  await r.timers.advance(100000);
  check(r.pilot.state().mode === 'manual' && r.trip.calls.filter((c) => c[0] === 'start').length === startsBefore, 'a hand on the map keeps it: nothing restarts under a visitor');
  await r.timers.advance(22000);
  check(r.pilot.active === true && r.pilot.state().mode === 'ambient', 'two minutes with no hand: the reel takes the screen back');
  await r.timers.advance(2000);
  check(r.trip.calls.filter((c) => c[0] === 'start').pop()[1] === 'back-to-the-moon', '...with the next trip, not the one that was interrupted');
  r.done();

  const row = rig({ from: 'row' });
  await row.timers.advance(9000 + 5000);
  row.view.press('escape');
  check(row.pilot.engaged === false && row.view.seen.unmounted === 1, 'started from the row at somebody\'s own computer: taking the controls ends the mode');
  await row.timers.advance(300000);
  check(row.trip.calls.filter((c) => c[0] === 'start').length === 1, '...and it never takes the screen back');
  row.done();

  const again = rig();
  await again.timers.advance(9000 + 5000);
  again.view.press('escape');
  check(again.pilot.start({ ambient: '1' }) === true && again.pilot.state().mode === 'ambient' && again.pilot.active, 'asked for again while the visitor has the map: it plays');
  check(again.pilot.start({}) === false && again.pilot.engaged === false, 'a link without `ambient` stops it');
  again.done();
}

// 7g. the nightly reload, and an update, only between two trips.
{
  const r = rig();
  await r.timers.advance(12 * 3600000 - 30000);
  check(r.reloads.length === 0, 'eleven hours and fifty-nine minutes: no reload');
  const playingAt = r.pilot.state().trip;
  await r.timers.advance(4 * 60000);
  check(r.reloads.length === 1, 'past twelve hours the page reloads');
  const line = r.what('reload')[0];
  check(line && line.why === 'age' && line.up_h >= 12, 'the log says why and how old the page was');
  const before = r.pilot.log().filter((l) => l.what === 'trip-end' || l.what === 'reload').map((l) => l.what);
  check(before[before.length - 2] === 'trip-end', `the reload came straight after a trip ended, not inside one (was playing ${playingAt})`);
  r.done();

  const u = rig();
  await u.timers.advance(20000);
  const posted = [];
  u.pilot.updateWaiting({ postMessage: (m) => posted.push(m) });
  check(u.reloads.length === 0 && posted.length === 0, 'a newer build that is waiting interrupts nothing');
  await u.timers.advance(3 * 15150 + 5000);
  check(posted.length === 1 && posted[0].type === 'sr-skip-waiting' && u.reloads.length === 1 && u.what('reload')[0].why === 'update', 'it takes over between two trips');
  u.done();

  const c = rig();
  await c.timers.advance(20000);
  c.pilot.controllerChanged();
  check(c.reloads.length === 0, 'another tab let the new build in mid-trip: this page waits for the end of its trip');
  await c.timers.advance(3 * 15150 + 5000);
  check(c.reloads.length === 1, '...and reloads then');
  c.done();
}

// 7h. a reloaded page goes on from its own address.
{
  const r = rig({ link: { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth', trip: 'back-to-the-moon', stop: '3' } });
  await r.timers.advance(9000);
  eq(r.trip.calls.filter((c) => c[0] === 'start' || c[0] === 'jumpTo' || c[0] === 'play'), [['start', 'back-to-the-moon'], ['jumpTo', 2], ['play', 'back-to-the-moon']], 'the trip and the stop the address named');
  await r.timers.advance(4000);
  check(r.what('stop')[0] && r.what('stop')[0].n === 3, 'it lands on that stop');
  await r.timers.advance(40000);
  check(r.trip.calls.filter((c) => c[0] === 'start').pop()[1] === 'the-living-earth', 'and the lap goes on from there');
  r.done();
}

// 7i. the test pace: a dwell of 12 s at pace 20 is 0.6 s, and the card 0.4 s.
{
  const r = rig({ link: { ambient: 'a-year-in-a-minute,back-to-the-moon,the-living-earth', pace: '20' } });
  await r.timers.advance(3 * (400 + 3 * (3000 + 150 + 600) + 75 + 200) + 1000);
  check(r.what('trip-end').length >= 2, `at pace 20 three-stop trips take about 12 s each: ${r.what('trip-end').length} ended in 38 s`);
  check(r.what('watchdog').length === 0, 'the watchdog does not mistake the pace for a fault');
  r.done();
}

// 7j. reduced motion: the machine waits for Next at every stop, and the reel presses it on time.
{
  const r = rig();
  const real = r.trip.onChange;
  // The stub trip as ui/trip.js is under prefers-reduced-motion: `reader` pacing, no dwell timer.
  r.trip.state.pacing = 'reader';
  await r.timers.advance(9000 + 3 * 15150 + 1500 + 500);
  check(r.what('stop').length >= 3 && r.what('watchdog').length === 0, 'under reduced motion the reel paces the stops itself; the watchdog is not what moves them');
  check(r.trip.calls.filter((c) => c[0] === 'next').length >= 2 && typeof real === 'function', 'it presses Next when the stop\'s time is up');
  r.done();

  const other = rig();
  await other.timers.advance(9000 + 5000);
  check(other.pilot.start({ ambient: 'outer-solar-system,the-living-earth,back-to-the-moon' }) === true, 'another reel asked for over a running one');
  await other.timers.advance(1000);
  check(other.pilot.state().reel === 'outer-solar-system,the-living-earth,back-to-the-moon' && other.trip.calls.filter((c) => c[0] === 'start').pop()[1] === 'outer-solar-system', '...replaces it');
  other.done();
}

// --- 8. the seams ------------------------------------------------------------------------------------------
{
  const read = (p) => readFileSync(join(ROOT, p), 'utf8');
  const frame = read('site/js/ui/tripframe.js');
  check(/ctx\.autopilot && ctx\.autopilot\.active/.test(frame) && /if \(ambient\(\)\) return \{ on: true, auto: true \}/.test(frame), 'ui/tripframe.js: a reel is present mode that paces itself');
  const offline = read('site/js/ui/offline.js');
  check((offline.match(/ctx\.autopilot\.engaged/g) || []).length === 2, 'ui/offline.js: no update prompt and no reload under a reel (the offer, and controllerchange)');
  const main = read('site/js/main.js');
  check(/import\('\.\/ui\/autopilot\.js'\)/.test(main) && !/^import[^\n]*autopilot/m.test(main), 'main.js fetches the autopilot on demand, never at boot');
  check(/link\.ambient/.test(main) && /classList\.add\('sr-ambient'\)/.test(main), 'main.js hides the panels of a kiosk before they are built');
  const css = read('site/css/ui.css');
  check(/html\.sr-ambient :is\(#sr-side, #sr-rail, #sr-time, \.sr-top, \.sr-toast, \.sr-scenenote, \.sr-keyhint\)/.test(css), 'css/ui.css: no panel, no toast, no hint under a reel');
  const sheet = read('site/css/autopilot.css');
  check(/\.sr-ambient__shield\.is-still\s*\{\s*cursor: none;/.test(sheet), 'css/autopilot.css: the pointer hides when it is still');
  check(/html\.sr-ambient \.sr-trip__toolbar/.test(sheet) && /html\.sr-ambient \.sr-trip__top/.test(sheet), 'css/autopilot.css: no toolbar and no top bar');
  const docs = read('docs/RUN_LOCALLY.md');
  check(/#ambient=lobby/.test(docs) && /--kiosk/.test(docs), 'docs/RUN_LOCALLY.md names the kiosk link and the browser flag');
  for (const reel of REELS) check(docs.includes(`\`${reel.id}\``), `docs/RUN_LOCALLY.md names the reel ${reel.id}`);
}

if (problems.length) {
  console.error(`autopilot: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`autopilot ok: ${REELS.length} reels (${REELS.map((r) => `${r.id} ${r.trips.length} trips`).join(', ')}), the link, the order, the dwell with and without the voice, the watchdog's ${Object.keys(P.BUDGET).length} budgets, the take-over machine, the reload rule, and the controller on a stub trip`);
