// r12-journeys: the two journeys of release 1.2.0 (internal spec 0076 stage W2-d, internal #777),
// "Across the Local Group" and "Out to the edge of the universe we can see", walked as a visitor's
// would run through sr.trip (ui/trip.js), as deepspace.js's stage-f block walks the two of 1.1.0:
// the intro sheet; every stop by jumpTo and play, paused on arrival for its picture; a stop that
// turns 15 degrees or more photographed again at the end of its turn; then the last stop's dwell left
// to run out into the one flight home, photographed on the way, and the end card. Then one stop under
// reduced motion (matchMedia reporting `reduce`): reader pacing, a cut, no turn.
//
// THERE IS NO BEFORE: both trips are new. main's nearest pictures are W1-e's `heroes` gallery (the
// Milky Way, the LMC, Andromeda, the horizon) and W1-b's `r12-edge` (the local volume, the map at 40
// and 50 billion light-years).
//
// Beside every picture (out.json `scenes`): the stage, the camera's distance from the stop's target
// against the stop's own (no false distance: within 5 %), the card's and the chapter's words, Leave
// on screen, the names on screen and how many overlap, the renderer's counts and sr.perf's window
// (p50/p95 of the drawn-frame intervals, the GPU estimate, the bytes fetched since the last picture).
// On the desktop run the share and card frames of chosen stops are kept (`out.tripFrames`, the form
// tools/trip-frames.probe.js returns) for scripts/build_trip_og.py and build_trip_thumbs.py.
//
// Fails when a trip cannot run, a stop never arrives or is not where it says, Leave is missing, the
// end card never comes or the flight home ends off the Earth, or reduced motion is not obeyed.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`. `-f subject=lg` or
// `-f subject=edge` runs one trip; `-f subject=reduced` the reduced-motion stop alone.
look.probe = 'r12-journeys';
const out = { scenes: [], problems: [], trips: {} };
const LY_KM = 9.4607304725808e12;
const phone = innerWidth < innerHeight;
const textOf = (sel, n = 300) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  out.laterLayers = await until(() => !!sr.recordById('dso-m31') && !!sr.recordById('exotic-ton-618'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('wantPerf: ' + e); }
out.perf = !!sr.perf;

/** 20 drawn-frame intervals, by sr.perf where it is, else requestAnimationFrame. */
const frames = async () => {
  if (sr.perf) {
    sr.perf.mark();
    await until(() => sr.perf.count() >= 20, 45000, 100);
    const s = sr.perf.stats();
    return { p50Ms: s.p50Ms, p95Ms: s.p95Ms, frames: s.frames, gpuMiB: s.gpu ? s.gpu.totalMiB : null };
  }
  return new Promise((resolve) => {
    const stamps = []; const began = performance.now();
    const step = (t) => {
      stamps.push(t);
      if (stamps.length <= 20 && performance.now() - began < 45000) { requestAnimationFrame(step); return; }
      const g = []; for (let i = 1; i < stamps.length; i++) g.push(stamps[i] - stamps[i - 1]);
      g.sort((a, b) => a - b);
      const at = (q) => (g.length ? Math.round(g[Math.min(g.length - 1, Math.floor(q * g.length))] * 10) / 10 : null);
      resolve({ p50Ms: at(0.5), p95Ms: at(0.95), frames: g.length, gpuMiB: null });
    };
    requestAnimationFrame(step);
  });
};
/** The names on screen and the pairs that overlap. */
const labelsNow = () => {
  const host = document.getElementById('labels');
  const boxes = [];
  if (host) {
    for (const el of host.querySelectorAll('.label')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
      const t = el.querySelector('.label__text');
      boxes.push({ text: (t ? t.textContent : el.textContent).trim().slice(0, 40), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i], boxes[j])) overlaps.push([boxes[i].text, boxes[j].text]);
  return { names: boxes.map((b) => b.text), overlaps };
};
let netAt = sr.perf ? sr.perf.netTotal() : 0;
/** Settle, measure, write down, photograph. `fromKm`: the camera's distance from the target, as the trip placed it. */
const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(15000) : null;
  const f = await frames();
  const lab = labelsNow();
  const net = sr.perf ? sr.perf.netTotal() : 0;
  const row = {
    name, note, stage: sr.stage.worldId,
    distanceLy: Math.round(rig.state.distance * sr.stage.unitKm / LY_KM * 100) / 100,
    fromSunLy: Math.round(sr.camera.position.length() * sr.stage.unitKm / LY_KM),
    card: textOf('#sr-card', 400), chapter: textOf('.sr-trip__chapter', 60), title: textOf('.sr-trip__title', 80),
    names: lab.names.length, overlaps: lab.overlaps, cost: frameCost(), ...f, ready,
    netBytes: net - netAt,
    shells: sr.shells && sr.shells.state ? sr.shells.state() : null,
  };
  netAt = net;
  out.scenes.push(row);
  await shot(name, `${note} | ${row.stage}, ${row.distanceLy} ly from the target, ${row.cost ? row.cost.calls : '?'} calls, p50 ${row.p50Ms} ms, ${lab.names.length} names (${lab.overlaps.length} overlapping)`);
  return row;
};
const tripNow = () => sr.trip.state;
const turnedDeg = (a, b) => { const d = (((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return Math.round(Math.abs(d) * 1800 / Math.PI) / 10; };
const tripArrive = async (index, capMs = 90000) => {
  const t0 = Date.now();
  const seen = [];
  const ok = await until(() => {
    const st = tripNow();
    if (st.phase === 'flight' && Date.now() - t0 > 25000 && rig.finishFlight) rig.finishFlight();
    const at = `${st.phase}@${st.index}`;
    if (seen[seen.length - 1] !== at) seen.push(at);
    return (st.phase === 'settle' || st.phase === 'dwell' || st.phase === 'held') && st.index === index;
  }, capMs, 100);
  return { ok, ms: Date.now() - t0, seen };
};
const tripFrame = (w, h) => {
  const cam = sr.camera;
  const v = cam.view && cam.view.enabled ? { ...cam.view } : null;
  if (v) cam.clearViewOffset();
  try { const c = sr.rendererApi.renderTo(w, h); return c ? c.toDataURL('image/png') : null; } catch (e) { return 'error: ' + e; } finally {
    if (v) cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    cam.updateProjectionMatrix();
  }
};
// The share (og) and card frames are kept at these stops, at their last pose.
const TRIP_FRAME_STOPS = { 'across-the-local-group': ['milky-way', 'andromeda', 'neighbours'], 'out-to-the-edge': ['local-volume', 'oldest-light', 'edge'] };
const fresh = async () => { try { sr.trip.stop('leave'); } catch { /* none */ } sr.deselect(); if (sr.stage.worldId !== 'stellar') await stage('stellar', 9000); };

const walkTrip = async (id, tag) => {
  const row = { id, stops: [] };
  out.trips[id] = row;
  const plan = await sr.trip.start(id);
  if (!plan || plan.offerable === false) { out.problems.push(`${id}: cannot run (${plan && plan.reason})`); return row; }
  if (!(await until(() => tripNow().phase === 'intro', 30000))) { out.problems.push(`${id}: no intro`); return row; }
  await until(() => { const t = sr.trip.tours().find((x) => x.id === id); return t && Array.isArray(t.stops); }, 15000);
  const tour = sr.trip.tours().find((x) => x.id === id);
  row.count = plan.count; row.estimateMs = tripNow().estimateMs; row.pacing = tripNow().pacing; row.dropped = (plan.dropped || []).map((d) => d.id);
  row.introVoicePlaying = !!document.querySelector('audio') && [...document.querySelectorAll('audio')].some((a) => !a.paused);
  await shot(`${tag}-0-intro`, `${id}: the intro sheet (the stops and the length, Start, Not now, the voice offered and not played)`, 2500);
  if (row.introVoicePlaying) out.problems.push(`${id}: a voice plays before any press`);
  const stops = tour.stops.filter((st) => !row.dropped.includes(st.id));
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i];
    sr.trip.jumpTo(i);
    if (i === 0) sr.trip.play();
    const arrived = await tripArrive(i);
    if (!arrived.ok) { out.problems.push(`${id}/${stop.id}: never arrived (${arrived.seen.join(' ')})`); continue; }
    const az0 = rig.state.azimuth;
    sr.trip.pause('probe');
    const wantLy = stop.distance_km / LY_KM;
    const what = stop.target.record || stop.target.world;
    const name = `${tag}-${i + 1}-${stop.id}`;
    const r = await snap(name, `${id} stop ${i + 1}/${stops.length} "${stop.card.title}": the camera ${Math.round(wantLy).toLocaleString('en')} ly from ${what}`);
    const leave = document.querySelector('.sr-trip__leave');
    const st = { id: stop.id, stage: r.stage, arriveMs: arrived.ms, wantLy: Math.round(wantLy), gotLy: r.distanceLy, card: r.card, chapter: r.chapter, title: r.title, leave: !!(leave && leave.offsetParent), p50Ms: r.p50Ms, calls: r.cost && r.cost.calls };
    if (!(Math.abs(r.distanceLy - wantLy) <= Math.max(0.02, wantLy * 0.05))) out.problems.push(`${id}/${stop.id}: the camera is ${r.distanceLy} ly from the target, the stop says ${Math.round(wantLy)}`);
    if (!st.leave) out.problems.push(`${id}/${stop.id}: no Leave on screen`);
    if (stop.drift !== 'none' && stop.drift_deg >= 15) {
      // The turn runs on the frame clock, which a software renderer starves: let it run 4 s (its
      // direction written down), then put the camera where the arc ends, as the trip would.
      sr.trip.resume();
      await sleep(4000);
      sr.trip.pause('probe');
      const ran = turnedDeg(az0, rig.state.azimuth);
      const d = (((rig.state.azimuth - az0) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      st.orbitRanDeg = ran;
      rig.flyTo({ azimuth: az0 + (d < 0 ? -1 : 1) * stop.drift_deg * Math.PI / 180, polar: rig.state.polar, distance: rig.state.distance, ms: 0 });
      await snap(`${name}-orbit`, `${id} "${stop.card.title}" at the end of its ${stop.drift_deg} degree turn (ran ${ran} degrees in 4 s here; the end pose set)`, 2500);
    }
    if ((TRIP_FRAME_STOPS[id] || []).includes(stop.id) && !phone) {
      (out.tripFrames = out.tripFrames || []).push({ trip: id, stop: stop.id, number: tour.stops.indexOf(stop) + 1, zoom: 1, og: tripFrame(1200, 504), png: tripFrame(960, 720) });
    }
    row.stops.push(st);
  }
  // The last dwell runs out: the flight home (`return: true`), photographed on the way, then the end card.
  const t0 = Date.now();
  sr.trip.resume();
  row.returning = await until(() => tripNow().returning === true || tripNow().phase === 'outro', 90000, 100);
  await sleep(4000);
  await shot(`${tag}-${stops.length + 1}-home-flight`, `${id}: the flight home down the ladder (returning ${tripNow().returning}, on ${sr.stage.worldId})`);
  const ended = await until(() => tripNow().phase === 'outro', 150000);
  row.homeMs = Date.now() - t0;
  await shot(`${tag}-${stops.length + 2}-end`, `${id}: the end card (${ended ? 'reached' : 'NOT reached'} ${Math.round(row.homeMs / 1000)} s after the last dwell resumed, on ${sr.stage.worldId})`, 2500);
  if (!ended) out.problems.push(`${id}: the end card never came`);
  if (sr.stage.worldId !== 'earth') out.problems.push(`${id}: the flight home ended on ${sr.stage.worldId}, not the Earth`);
  sr.trip.stop('leave');
  await sleep(3000);
  return row;
};

const GROUPS = {
  lg: async () => { try { await fresh(); await walkTrip('across-the-local-group', 'lg'); } catch (e) { look.errors.push('probe: the Local Group trip threw: ' + (e && e.stack || e)); } },
  edge: async () => { try { await fresh(); await walkTrip('out-to-the-edge', 'edge'); } catch (e) { look.errors.push('probe: the edge trip threw: ' + (e && e.stack || e)); } },
  // Reduced motion: "Out to the edge" stop 6 (the microwave background) reached by a cut, no turn.
  reduced: async () => {
    const real = window.matchMedia;
    const Q = '(prefers-reduced-motion: reduce)';
    try {
      await fresh();
      window.matchMedia = (q) => (String(q).replace(/\s+/g, ' ').trim() === Q
        ? { matches: true, media: Q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }
        : real.call(window, q));
      await sr.trip.start('out-to-the-edge');
      await until(() => tripNow().phase === 'intro', 30000);
      const rm = { pacing: tripNow().pacing, reducedMotion: tripNow().reducedMotion, flewAtAll: false };
      sr.trip.jumpTo(5);
      sr.trip.play();
      const t0 = Date.now();
      while (Date.now() - t0 < 1500) { if (rig.state.flying) rm.flewAtAll = true; await sleep(50); }
      const arrived = await tripArrive(5, 30000);
      rm.arriveMs = arrived.ms;
      const az = rig.state.azimuth;
      await sleep(4000);
      rm.turnedDeg = turnedDeg(az, rig.state.azimuth);
      out.reduced = rm;
      await snap('r1-reduced-oldest-light', `reduced motion: "Out to the edge" stop 6 reached by a cut (pacing ${rm.pacing}, flew ${rm.flewAtAll}, turned ${rm.turnedDeg} deg in 4 s)`, 500);
      if (rm.pacing !== 'reader' || rm.flewAtAll || rm.turnedDeg > 0.5) out.problems.push('reduced motion not obeyed: ' + JSON.stringify(rm));
    } catch (e) { look.errors.push('probe: the reduced-motion stop threw: ' + (e && e.stack || e)); } finally {
      window.matchMedia = real;
      try { sr.trip.stop('leave'); } catch { /* nothing running */ }
      await sleep(2000);
    }
  },
};

const subject = new URLSearchParams(location.search).get('lookSubject');
const pick = subject ? subject.split('_').filter((g) => GROUPS[g]) : ['lg', 'edge', 'reduced'];
if (subject && !pick.length) out.problems.push(`no group called ${subject}: ${Object.keys(GROUPS).join(', ')}`);
out.ran = pick;
for (const g of pick) await GROUPS[g]();
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
