// tests/test_autopilot_holds.mjs -- what a reel does when the picture is not there (internal #448),
// on the real ui/trip.js and the real camera rig (tests/helpers/trip_world.mjs):
//
//   1. A lost WebGL context PAUSES the trip where it is; handed back in time, the trip goes on from
//      the same stop.
//   2. Not handed back, the page reloads, and the address it reloads with names the stop that was
//      on screen when the picture went, not the one after (at pace 8, as it was seen).
//   3. Lost under the card between two trips: the first flight waits for the picture.
//   4. A stop whose map did not arrive (`overlay:` with a failed fetch) is passed over, once, with
//      a line in the log; a map still loading, or shown, is not.
//   5. "Just watch": the reels as the Trips section lists them, the default first.
import { join } from 'node:path';
import { TOURS, tripWorld, fixture, stopRow, time, ROOT } from './helpers/trip_world.mjs';

const JS = join(ROOT, 'site/js');
const { createAutopilot } = await import(join(JS, 'ui/autopilot.js'));
const P = await import(join(JS, 'ui/autopilotplan.js'));
const { REELS, AUTOPILOT } = await import(join(JS, 'data/autopilot.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { read } = await import(join(JS, 'ui/urlstate.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

TOURS.push(fixture('ah-a'), fixture('ah-b'), fixture('ah-map', {
  stops: [stopRow('one', { world: 'earth' }), stopRow('two', { world: 'earth' }, { overlay: 'sea-ice', frame_radii: 4 }), stopRow('three', { world: 'moon' }), stopRow('four', { world: 'earth' })],
}));

function fakeTimers() {
  let seq = 0;
  const q = new Map();
  return {
    set(fn, ms) { seq += 1; q.set(seq, { at: time.wall + Math.max(0, ms || 0), fn }); return seq; },
    clear(id) { q.delete(id); },
    every(fn, ms) { seq += 1; q.set(seq, { at: time.wall + ms, fn, every: ms }); return seq; },
    stop(id) { q.delete(id); },
    now: () => time.wall,
    run() {
      for (let guard = 0; guard < 50; guard += 1) {
        let best = null;
        for (const [id, x] of q) if (x.at <= time.wall && (!best || x.at < best.x.at || (x.at === best.x.at && id < best.id))) best = { id, x };
        if (!best) return;
        if (best.x.every) best.x.at += best.x.every; else q.delete(best.id);
        best.x.fn();
      }
    },
  };
}

function reel(link, { overlay = null } = {}) {
  location.hash = '';
  const w = tripWorld();
  if (overlay) w.ctx.overlayState = overlay;
  const timers = fakeTimers();
  const view = { cards: [], mount() {}, unmount() {}, onInput() {}, setMode() {}, captions() {}, card(c) { view.cards.push(c ? c.title : null); }, offer() {} };
  const reloads = [];
  const store = new Map();
  const quiet = console.info;
  console.info = () => {};
  const pilot = createAutopilot(w.ctx, {
    view, timers, clips: {}, seed: 1, reload: () => reloads.push({ at: time.wall, hash: location.hash }), hour: () => 14, wall: () => time.real,
    storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    document: globalThis.document, navigator: {},
  });
  w.ctx.autopilot = pilot;
  pilot.start(link);
  const st = () => w.machine.state;
  return {
    w, pilot, view, reloads, st,
    async pass(ms, until) {
      for (let spent = 0; spent < ms; spent += 100) {
        await w.step(100);
        timers.run();
        await w.step(0);
        if (until && until()) return true;
      }
      return false;
    },
    webgl(state) { globalThis.dispatchEvent({ type: 'sr:webgl', detail: { state } }); },
    what: (name) => pilot.log().filter((l) => l.what === name),
    done() { pilot.stop(); w.done(); console.info = quiet; },
  };
}

// --- 1. lost and handed back --------------------------------------------------------------------------
{
  const r = reel({ ambient: 'ah-a,ah-b' });
  check(await r.pass(40000, () => r.st().tourId === 'ah-a' && r.st().phase === 'dwell' && r.st().index === 1), 'the reel reaches the second stop');
  await r.pass(2000);
  r.webgl('lost');
  check(r.st().phase === 'paused' && r.st().pausedBy === 'context', `a lost context pauses the trip (${r.st().phase}, by ${r.st().pausedBy})`);
  await r.pass(4000);
  check(r.st().phase === 'paused' && r.st().index === 1 && r.reloads.length === 0, `four seconds without a picture: the same stop, held (${r.st().phase} @ ${r.st().index})`);
  r.webgl('restored');
  check(r.st().phase === 'dwell' && r.st().index === 1, `handed back: the stop goes on (${r.st().phase} @ ${r.st().index})`);
  check(await r.pass(12000, () => r.st().index === 2), 'and the trip goes on to the third stop from there');
  check(r.what('watchdog').length === 0, `the watchdog had nothing to do (${JSON.stringify(r.what('watchdog'))})`);
  r.done();
}

// --- 2. lost for good, at pace 8 ---------------------------------------------------------------------------
{
  const r = reel({ ambient: 'ah-a,ah-b', pace: '8' });
  check(await r.pass(40000, () => r.st().tourId === 'ah-a' && r.st().phase === 'dwell' && r.st().index === 1), 'at pace 8 the reel reaches the second stop');
  r.webgl('lost');
  await r.pass(7000, () => r.reloads.length > 0);
  check(r.reloads.length === 1, `a context not handed back reloads the page once (${r.reloads.length})`);
  const link = read(r.reloads[0] ? r.reloads[0].hash : '');
  const resume = P.resumeFrom(link, ['ah-a', 'ah-b']);
  check(resume && resume.trip === 'ah-a' && resume.stop === 1, `the address it reloads with names the stop that was on screen, the second (${r.reloads[0] && r.reloads[0].hash})`);
  check(r.st().index === 1, `the machine did not move on behind the dead canvas (stop ${r.st().index + 1})`);
  r.done();
}

// --- 3. lost under the card between two trips ------------------------------------------------------------------
{
  const r = reel({ ambient: 'ah-a,ah-b' });
  check(await r.pass(5000, () => r.st().phase === 'intro'), 'the first trip waits on its card');
  r.webgl('lost');
  await r.pass(4000);
  // (the card is 8 s; at 4 s more it would have played)
  await r.pass(800);
  check(r.st().phase === 'intro', `the card's time is up and the picture is gone: the trip does not start (${r.st().phase})`);
  r.webgl('restored');
  check(await r.pass(8500, () => r.st().phase === 'flight' || r.st().phase === 'settle' || r.st().phase === 'dwell'), `handed back: it starts (${r.st().phase})`);
  r.done();
}

// --- 4. a map that did not arrive ----------------------------------------------------------------------------------
for (const [status, passed] of [['failed', true], ['no-earth', true], ['loading', false], ['shown', false]]) {
  const r = reel({ ambient: 'ah-map,ah-a' }, { overlay: () => ({ id: 'sea-ice', status }) });
  await r.pass(70000, () => r.what('trip-end').length > 0 || r.what('skip').length > 0);
  const stops = r.what('stop').filter((l) => l.trip === 'ah-map').map((l) => l.n).join(',');
  const pass = r.what('stop-passed');
  if (passed) {
    check(pass.length === 1 && pass[0].n === 2 && pass[0].why === `overlay-${status}`, `${status}: the stop is passed over once, and the log says why (${JSON.stringify(pass)})`);
    check(!stops.split(',').includes('2') && stops.endsWith('3,4'), `${status}: its card never came up; the stops after it did (${stops})`);
  } else {
    check(pass.length === 0 && stops === '1,2,3,4', `${status}: every stop is shown (${stops}; ${JSON.stringify(pass)})`);
  }
  check(r.what('trip-end').some((l) => l.trip === 'ah-map'), `${status}: the trip ends on its own end card`);
  r.done();
}
check(P.stopPictureFailed('sea-ice', { id: 'chlorophyll', status: 'failed' }) === false, 'another map\'s failure is not this stop\'s');
check(P.stopPictureFailed(null, { status: 'failed' }) === false, 'a stop with no map has nothing to fail');

// --- 5. just watch ---------------------------------------------------------------------------------------------------
{
  const rows = P.reelRows(REELS, AUTOPILOT.default);
  check(rows.length === REELS.length && rows.length >= 3, `every reel is offered (${rows.map((r) => r.id).join(' ')})`);
  check(rows[0].id === AUTOPILOT.default, `the default reel leads (${rows[0].id})`);
  check(rows.slice(1).map((r) => r.id).join() === REELS.filter((r) => r.id !== AUTOPILOT.default).map((r) => r.id).join(), 'the rest keep the registry\'s order');
  for (const row of rows) {
    check(row.title.length <= 28, `"${row.title}" fits a row beside its length`);
    check(row.minutes > 0 && row.trips >= 3, `${row.id}: ${row.minutes} min, ${row.trips} trips`);
  }
  check(COPY.tripCard.justWatch === 'Just watch' && /\{m\}/.test(COPY.tripCard.reelLength), 'the words are in the copy file');
  const src = (await import('node:fs')).readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/import\('\.\.\/data\/autopilot\.js'\)/.test(src) && !/^import .*data\/autopilot\.js/m.test(src), 'the Trips section fetches the reels when the list is opened, not at boot');
  check(/ambient: row\.id \}, 'row'\)/.test(src), 'a row starts its own reel, as the button did the default');
}

if (problems.length) {
  console.error(`autopilot holds FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('autopilot holds ok: a lost context pauses the trip and resumes it, a reload names the stop that was on screen, the first flight waits for the picture, a failed map is passed over, the reels are listed');
