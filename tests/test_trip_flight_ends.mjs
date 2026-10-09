// tests/test_trip_flight_ends.mjs -- every flight of a trip ends inside its own time plus a margin
// (internal #322: "a trip started right after leaving another can sit in 'flight' for minutes").
//
// The real ui/trip.js on the real scene/camera.js, under node (tests/helpers/trip_world.mjs), with
// frames as long as the test says. What is held:
//
//   1. THE RIG. A flight's `ms` is wall time: at three frames a second a 6 s flight takes 6 s, where
//      the clamped step main.js used to feed it took it 20 s. The damping still gets the clamp.
//   2. THE MACHINE, AT 3 FPS AND THROUGH 5 s STALLS: each stop's time in `flight` is within the
//      longest flight a trip composes plus the grace.
//   3. ANOTHER CALLER'S FLIGHT in place of the trip's (the rig has one): the stop is flown again and
//      arrives at its own shot; a caller that keeps taking the camera gets a cut, not a hang.
//   4. FRAMES THE RIG NEVER SEES (its callback never comes): the stop's own timer lands it.
//   5. A CARD THAT THROWS on arrival: the stop still dwells and the trip goes on.
//   6. LEAVE AND START, at once and in every phase, forty times with frames of 16 to 900 ms: no
//      stop of the second trip is in `flight` longer than the bound, and the trip reaches its end.
//   7. A PAUSE mid-flight stays a pause: the flight the pause ends is not flown again under it.
//   8. THE WAY HOME (`return: true`, internal #304): one flight after the last stop, then the end
//      card; Next skips it; a pause holds it; a flight home that never lands still ends.
import { TOURS, tripWorld, fixture, stopRow, time, tripModule, createCameraRig, THREE, FLIGHT_STEP_CAP_MS } from './helpers/trip_world.mjs';

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const GRACE = tripModule.FLIGHT_GRACE_MS;
const FLIGHT_MAX = 6000; // ui/trip.js FLIGHT_MAX_MS: the longest flight a stop composes
const quietWarn = console.warn;

TOURS.push(fixture('fe-cut', {
  stops: [stopRow('one', { world: 'moon' }), stopRow('two', { world: 'earth' }, { transition: 'cut' }), stopRow('three', { world: 'moon' }, { transition: 'black' })],
}), fixture('fe-a'), fixture('fe-b'), fixture('fe-c', {
  stops: [stopRow('one', { world: 'moon' }), stopRow('two', { world: 'earth' }), stopRow('three', { world: 'moon' }), stopRow('four', { world: 'earth' })],
}));

async function begin(w, id) {
  const plan = await w.machine.start(id);
  await w.step(16);
  w.machine.play();
  return plan;
}
const worst = (w, id) => Math.max(0, ...Object.values(w.flights(id)));
const reached = (w, key) => w.phases.some((p) => p.key === key);

// --- 1. the rig -----------------------------------------------------------------------------------
{
  const fly = async (feed) => {
    const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
    camera.position.set(0, 0, 22);
    const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
    let landed = null;
    let spent = 0;
    rig.flyTo({ targetScene: { x: 300, y: 0, z: 0 }, distance: 9, ms: 6000, onArrive: () => { landed = spent; } });
    while (landed === null && spent < 60000) {
      spent += 333;
      if (feed === 'wall') rig.update(100, 333); else rig.update(100);
    }
    return landed;
  };
  const old = await fly('clamped');
  const now = await fly('wall');
  check(old >= 19000, `the cause, measured: fed the clamped step alone, a 6 s flight at 3 fps lands after ${old} ms`);
  check(now !== null && now <= 6000 + 333, `fed the frame's real length it lands in its own time (${now} ms)`);
  check(FLIGHT_STEP_CAP_MS === 1000, 'one frame is at most a second of a flight');
  // A stalled frame moves a flight on by the cap, not to its end.
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  rig.flyTo({ targetScene: { x: 300, y: 0, z: 0 }, distance: 9, ms: 6000 });
  rig.update(100, 60000);
  check(rig.state.flying && Math.abs(rig.flightProgress() - 1 / 6) < 0.01, `a minute in the background is one second of the flight (${rig.flightProgress()})`);
}

// --- 2. slow frames ---------------------------------------------------------------------------------
for (const [frameMs, label] of [[333, '3 fps'], [5000, '5 s stalls']]) {
  const w = tripWorld();
  await begin(w, 'fe-a');
  await w.pass(3 * (8000 + FLIGHT_MAX + GRACE + 4 * frameMs) + 20000, frameMs, () => w.machine.state.phase !== 'outro');
  const f = w.flights('fe-a');
  check(Object.keys(f).length === 3 && w.machine.state.phase === 'outro', `${label}: the trip reached its end (${w.machine.state.phase}, flights ${JSON.stringify(f)})`);
  check(worst(w, 'fe-a') <= FLIGHT_MAX + GRACE + 2 * frameMs, `${label}: no stop flew longer than its time and the grace (${JSON.stringify(f)})`);
  if (frameMs === 333) check(worst(w, 'fe-a') <= FLIGHT_MAX + 2 * frameMs, `${label}: and none needed the grace (${JSON.stringify(f)})`);
  w.done();
}
{
  // What it was: the same trip with the rig fed as before, and the stop's own timer switched off
  // by nothing at all -- it is the timer that now ends the flight.
  const w = tripWorld({ feed: 'clamped' });
  await begin(w, 'fe-a');
  await w.pass(40000, 333, () => w.machine.state.index < 1 || w.machine.state.phase === 'flight');
  check(worst(w, 'fe-a') <= FLIGHT_MAX + GRACE + 700, `a rig fed the old way is still landed by the stop's timer (${JSON.stringify(w.flights('fe-a'))})`);
  w.done();
}

// --- 3. another caller's flight ------------------------------------------------------------------------
{
  const w = tripWorld();
  await begin(w, 'fe-a');
  await w.pass(30000, 100, () => !(w.machine.state.index === 1 && w.machine.state.phase === 'flight'));
  await w.pass(600);
  check(w.machine.state.phase === 'flight' && w.machine.state.index === 1, 'mid-flight to the second stop');
  // Somebody else flies the camera home: a card's "show me", a selection's second move.
  w.rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 40, ms: 900 });
  await w.pass(FLIGHT_MAX + 3000, 100, () => w.machine.state.phase === 'flight');
  check(w.machine.state.index === 1 && ['settle', 'dwell'].includes(w.machine.state.phase), `the stop is flown again and arrives (${w.machine.state.phase} @ ${w.machine.state.index})`);
  const moon = w.rig.state.target.length();
  check(moon > 300, `...at its own subject, not where the other flight went (target ${moon.toFixed(0)} units out)`);
  check(worst(w, 'fe-a') <= FLIGHT_MAX + GRACE, `...inside the bound (${JSON.stringify(w.flights('fe-a'))})`);
  w.done();
}
{
  const w = tripWorld();
  await begin(w, 'fe-a');
  await w.pass(30000, 100, () => !(w.machine.state.index === 1 && w.machine.state.phase === 'flight'));
  // A caller that takes the camera every other frame, for as long as the stop is in the air.
  let taken = 0;
  await w.pass(20000, 100, () => {
    if (w.machine.state.phase !== 'flight') return false;
    taken += 1;
    if (taken % 2 === 0) w.rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 40, ms: 5000 });
    return true;
  });
  check(['settle', 'dwell'].includes(w.machine.state.phase) && w.machine.state.index === 1, `a camera taken again and again: the stop cuts to its shot (${w.machine.state.phase}, ${taken} frames)`);
  check(taken <= 12, `...after two re-flights, not after the grace (${taken} frames)`);
  w.done();
}

// --- 4. frames the rig never sees ------------------------------------------------------------------------
{
  const w = tripWorld({ rigFrames: false });
  await begin(w, 'fe-a');
  await w.pass(3 * (8000 + FLIGHT_MAX + GRACE) + 6000, 100, () => w.machine.state.phase !== 'outro');
  check(w.machine.state.phase === 'outro', `a rig whose arrival never comes: the trip still reaches its end (${w.machine.state.phase} @ ${w.machine.state.index})`);
  check(worst(w, 'fe-a') <= FLIGHT_MAX + GRACE + 300, `each stop was landed by its own timer (${JSON.stringify(w.flights('fe-a'))})`);
  w.done();
}

// --- 5. a card that throws -----------------------------------------------------------------------------------
{
  let threw = 0;
  console.warn = () => {};
  const w = tripWorld({ select() { threw += 1; throw new Error('the record went from under the card'); } });
  // A stop whose subject is a record: its card is the object card, through ctx.select.
  w.ctx.recordById = (id) => (id === 'fe-rock' ? { id: 'fe-rock', klass: 'world', name: 'Rock' } : null);
  await begin(w, 'fe-a');
  const fine = [];
  for (let i = 0; i < 400 && w.machine.state.phase !== 'outro'; i += 1) {
    try { await w.step(100); } catch (e) { fine.push(String(e.message)); }
  }
  console.warn = quietWarn;
  check(w.machine.state.phase === 'outro' && reached(w, 'fe-a:dwell:1'), `the trip plays to its end whatever its cards do (${w.machine.state.phase}; select threw ${threw} times; frames threw ${fine.length})`);
  w.done();
}

// --- 6. leave and start, at once --------------------------------------------------------------------------------
{
  let seed = 20261008;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const bad = [];
  for (let round = 0; round < 40; round += 1) {
    const w = tripWorld();
    const frameMs = [16, 33, 100, 333, 900][round % 5];
    await begin(w, 'fe-a');
    // Leave the first trip in whatever phase a random moment finds it.
    await w.pass(Math.floor(rnd() * 24000), frameMs);
    const left = `${w.machine.state.phase}@${w.machine.state.index}`;
    w.machine.stop('leave');
    // The second starts in the same task, a frame later, or three.
    const gap = round % 3;
    for (let i = 0; i < gap; i += 1) await w.step(frameMs);
    const at = time.wall;
    await begin(w, 'fe-c');
    await w.pass(4 * (8000 + FLIGHT_MAX + GRACE) + 8000, frameMs, () => w.machine.state.phase !== 'outro');
    const f = w.flights('fe-c');
    const longest = Math.max(0, ...Object.values(f));
    if (w.machine.state.phase !== 'outro' || Object.keys(f).length !== 4 || longest > FLIGHT_MAX + GRACE + 2 * frameMs) {
      bad.push(`round ${round} (left at ${left}, gap ${gap} frames, ${frameMs} ms frames): ${w.machine.state.phase}@${w.machine.state.index} after ${time.wall - at} ms, flights ${JSON.stringify(f)}`);
    }
    w.done();
  }
  check(bad.length === 0, `forty trips started on the heels of another all fly and end:\n      ${bad.join('\n      ')}`);
}

// --- 7. a pause is still a pause ---------------------------------------------------------------------------------
{
  const w = tripWorld();
  await begin(w, 'fe-a');
  await w.pass(30000, 100, () => !(w.machine.state.index === 1 && w.machine.state.phase === 'flight'));
  await w.pass(500);
  w.machine.pause('input');
  const where = w.rig.state.distance;
  await w.pass(FLIGHT_MAX + GRACE + 3000);
  check(w.machine.state.phase === 'paused' && !w.rig.state.flying, `a pause mid-flight holds for as long as it is held (${w.machine.state.phase})`);
  check(Math.abs(w.rig.state.distance - where) < 1e-6, 'and the camera stays where the pause left it');
  w.machine.resume();
  await w.pass(FLIGHT_MAX + 2000, 100, () => w.machine.state.phase === 'flight' || w.machine.state.phase === 'paused');
  check(['settle', 'dwell'].includes(w.machine.state.phase) && w.machine.state.index === 1, `resuming flies on to the stop (${w.machine.state.phase})`);
  w.done();
}

// --- 8. the way home (internal #304) ---------------------------------------------------------------------------------
{
  TOURS.push(fixture('fe-home', { return: true }));
  // A climb that takes `takes` ms and then says it arrived (the real one is held by tests/test_climb.mjs).
  const withClimb = (w, takes) => {
    const calls = [];
    let pending = null;
    w.ctx.wantClimb = () => Promise.resolve({
      state: { get active() { return !!pending; } },
      cancel() { pending = null; },
      toHome(opts) { calls.push(opts); pending = { at: time.wall + takes, opts }; return true; },
    });
    w.land = () => { if (pending && time.wall >= pending.at) { const p = pending; pending = null; p.opts.onArrive('done'); } };
    return calls;
  };
  const lastDwell = (w) => w.machine.state.index === 2 && w.machine.state.phase === 'dwell';
  {
    const w = tripWorld();
    const calls = withClimb(w, 6000);
    await begin(w, 'fe-home');
    await w.pass(60000, 100, () => { w.land(); return !(w.machine.state.phase === 'flight' && w.machine.state.returning); });
    check(w.machine.state.returning === true && w.machine.state.index === 2 && calls.length === 1, `after the last stop's own time the trip flies home, as a flight of the last stop (${w.machine.state.phase}, returning ${w.machine.state.returning}, ${calls.length} flight)`);
    check(calls[0] && calls[0].msPerDecade >= 900, 'by the continuous flight, no faster than a climb between stops');
    await w.pass(5000, 100, () => { w.land(); return true; });
    check(w.machine.state.phase === 'flight', 'the end card waits for the flight');
    await w.pass(3000, 100, () => { w.land(); return w.machine.state.phase !== 'outro'; });
    check(w.machine.state.phase === 'outro' && w.machine.state.returning === false, `home: the end card (${w.machine.state.phase})`);
    w.done();
  }
  {
    const w = tripWorld();
    const calls = withClimb(w, 6000);
    await begin(w, 'fe-home');
    await w.pass(60000, 100, () => !lastDwell(w));
    w.machine.next();
    check(w.machine.state.phase === 'outro' && calls.length === 0, `Next on the last stop is the end, at once, with no flight (${w.machine.state.phase})`);
    w.done();
  }
  {
    const w = tripWorld();
    const calls = withClimb(w, 6000);
    await begin(w, 'fe-home');
    await w.pass(60000, 100, () => { w.land(); return !w.machine.state.returning; });
    await w.pass(1000);
    w.machine.pause('input');
    await w.pass(40000);
    check(w.machine.state.phase === 'paused', 'a pause on the way home holds');
    w.machine.resume();
    await w.step(16);
    check(w.machine.state.phase === 'flight' && w.machine.state.returning && w.machine.state.index === 2 && calls.length === 2, `resuming flies home again, not back to the last stop (${w.machine.state.phase}, ${calls.length} flights)`);
    await w.pass(8000, 100, () => { w.land(); return w.machine.state.phase !== 'outro'; });
    check(w.machine.state.phase === 'outro', 'and ends at home');
    w.done();
  }
  {
    // A way home that never arrives, and one whose module never comes.
    const w = tripWorld();
    withClimb(w, 1e9);
    await begin(w, 'fe-home');
    await w.pass(60000, 100, () => !w.machine.state.returning);
    const from = time.wall;
    await w.pass(40000, 100, () => w.machine.state.phase !== 'outro');
    check(w.machine.state.phase === 'outro' && time.wall - from <= 30000 + 300, `a flight home that never lands ends on the end card anyway (${time.wall - from} ms)`);
    w.done();
    const v = tripWorld();
    v.ctx.wantClimb = () => Promise.resolve(null);
    await begin(v, 'fe-home');
    await v.pass(60000, 100, () => v.machine.state.phase !== 'outro');
    check(v.machine.state.phase === 'outro', 'without the climb\'s module the trip ends where it is, as it did');
    v.done();
  }
  {
    const w = tripWorld();
    const calls = withClimb(w, 6000);
    await begin(w, 'fe-a');
    await w.pass(60000, 100, () => w.machine.state.phase !== 'outro');
    check(w.machine.state.phase === 'outro' && calls.length === 0, 'a trip that does not ask for it ends where its last stop is');
    w.done();
  }
  const roof = TOURS.find((x) => x.id === 'roof-to-the-edge');
  check(roof && roof.return === true && /one flight home/.test(roof.blurb) && roof.blurb.length <= 80, `the roof trip asks for the way home and its blurb says so (${roof && roof.blurb})`);
  check(TOURS.filter((x) => x.return === true && !x.id.startsWith('fe-')).length === 1, 'and it is the only one that does');
}

// --- 7. the join a stop asks for (internal #288) ---------------------------------------------------------
{
  const w = tripWorld();
  await begin(w, 'fe-cut');
  await w.pass(60000, 100, () => w.machine.state.phase !== 'outro');
  const f = w.flights('fe-cut');
  check(w.machine.state.phase === 'outro', `the trip with a cut and a fade ran to its end (${w.machine.state.phase})`);
  check((f[1] || 0) <= 400, `a stop that says transition: cut has no flight (${f[1]} ms)`);
  check((f[2] || 0) <= 400, `and so has a fade through black (${f[2]} ms)`);
  check((f[0] || 0) >= 0, 'the first stop flies as it always did');
  w.done();
}

if (problems.length) {
  console.error(`trip flights FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('trip flights ok: wall-time flights at 3 fps and through stalls, a replaced flight flown again, a lost arrival landed, a throwing card survived, 40 leave-and-start rounds, a pause held, the way home flown, skipped, paused and timed out');
