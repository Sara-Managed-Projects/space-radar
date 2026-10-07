// MANY PICTURES FROM ONE BROWSER RUN: a list of (trip, stop) pairs, each flown to as a visitor
// would and drawn once with the scene alone. The trips' share pictures (site/og/<id>.png) and the
// trip cards' pictures (site/images/trips/<id>.webp) are both made from what this returns, and so
// is a walk of stops somebody wants to look at.
//
//   python3 tools/serve.py site 8451 &
//   node tools/cdp.mjs 'http://127.0.0.1:8451/index.html?sw=0&pics=moon-phases:2,the-living-earth:5:1.2' \
//     tools/trip-frames.probe.js --width=1280 --height=800 --gl=gpu --net=4g \
//     --block=celestrak.org,ll.thespacedevs.com > frames.json
//   $PY scripts/build_trip_og.py --from=frames.json            the share pictures (PIL)
//   $PY scripts/build_trip_thumbs.py --from=frames.json        the cards' (PIL)
//
// THE LIST is the address's `pics=`: `trip:stop[:zoom]` joined by commas, the stop by its number
// (1-based, as `og_stop:` and the link's `stop=` count) or by its id, or `og` for the trip's own
// picture stop. A zoom above 1 is a tighter lens for the picture only. Stops of one trip that
// follow each other in the list are taken in one start of that trip.
//
//   &picsat=2026-10-06T12:00:00Z   the visitor's clock is put there before the first trip starts
//   &picsfor=og|card|both|look     which frames come back (default both). `look` is one small JPEG
//                                  a stop, for a walk that only wants to see them.
//   &picsbudget=170                seconds; the probe stops asking for more after this and says
//                                  which pairs it did not reach (`left`), so a run under a hard cap
//                                  hands back what it has instead of nothing.
//
// TWO FRAMES A STOP. The share picture's scene is 1200 x 504 (630 less the band) with the subject in
// the middle. The card's is 4:3 and its lower 16:9 is kept (tools/trip-pictures.probe.js says why:
// a card lays its title over the lower half, so the subject has to sit in the upper third).
//
// IN THE MIDDLE OF THE FRAME, NOT OF THE FREE PART OF THE SCREEN. The app shifts its picture out
// from under the panel (scene/viewshift.js, a view offset on the camera); a picture has no panel,
// so the offset is taken off for the draw and put back.
//
// DRAW_SCALE draws a trip's frames smaller than their size and the builders enlarge them: a line
// is a fixed number of pixels wide whatever the frame, so a figure of the sky drawn at two thirds
// keeps lines half as wide again in the picture, which is what makes them read at 160 px.
//
// THE FRAME IS THE STOP'S FIRST. The trip is paused the moment it arrives, so a stop whose clock
// runs (a Moon that grows while the card is up) is drawn as a visitor first sees it.

const DRAW_SCALE = {
  'the-constellations': 2 / 3,
};
const FLIGHT_GRACE_MS = 14000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = performance.now();
const elapsed = () => (performance.now() - T0) / 1000;
const q = new URLSearchParams(location.search);
const budget = Number(q.get('picsbudget')) || 170;
const want = q.get('picsfor') || 'both';
const list = (q.get('pics') || '').split(',').filter(Boolean).map((s) => {
  const [trip, stop, zoom] = s.split(':');
  return { trip, stop: stop || 'og', zoom: Number(zoom) || 1 };
});
const out = { frames: [], left: [], log: [], at: null };
const until = async (fn, ms) => {
  const t0 = performance.now();
  // Nothing waits past the budget by more than a few seconds: a run under a hard cap that is
  // killed hands back nothing at all (lost 2026-10-07, on a machine at a load of 90).
  while (performance.now() - t0 < ms && elapsed() < budget + 12) {
    let ok = false;
    try { ok = fn(); } catch { /* not there yet */ }
    if (ok) return true;
    await sleep(200);
  }
  return false;
};

if (!(await until(() => window.__srLayersReady === true, Math.max(10, budget - 40) * 1000))) {
  out.log.push('the layers never came');
  out.left = list.map((p) => `${p.trip}:${p.stop}`);
  return out;
}
const sr = window.spaceRadar;
if (sr.loadAfterFirstVisit) await Promise.race([sr.loadAfterFirstVisit().catch(() => {}), sleep(20000)]);
await sleep(1500);
if (q.get('picsat')) sr.clock.goTo(Date.parse(q.get('picsat')));
out.at = new Date(sr.clock.now()).toISOString();
out.log.push(`ready at ${elapsed().toFixed(0)} s`);

const draw = (w, h, zoom, type, quality) => {
  const cam = sr.camera;
  const z0 = cam.zoom;
  const v = cam.view && cam.view.enabled ? { ...cam.view } : null;
  cam.zoom = z0 * zoom;
  if (v) cam.clearViewOffset();
  try {
    const c = sr.rendererApi.renderTo(w, h);
    return c ? c.toDataURL(type || 'image/png', quality) : null;
  } finally {
    cam.zoom = z0;
    if (v) cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    cam.updateProjectionMatrix();
  }
};

let running = null;
let plan = null;
for (let n = 0; n < list.length; n += 1) {
  const pair = list[n];
  const key = `${pair.trip}:${pair.stop}`;
  if (elapsed() > budget) { out.left.push(key); continue; }
  try {
    // The list a first visit loads carries no stops (data/tours-index.js); start() brings them.
    const tourNow = () => sr.trip.tours().find((t) => t.id === pair.trip);
    if (!tourNow()) throw new Error('no such trip');
    const fresh = running !== pair.trip;
    if (fresh) {
      if (running) { try { sr.trip.stop('leave'); } catch { /* the next start replaces it */ } await sleep(1500); }
      running = null;
      plan = await sr.trip.start(pair.trip);
      if (!plan || plan.offerable === false) throw new Error(`cannot run: ${(plan && plan.reason) || 'no plan'}`);
      if (!(await until(() => sr.trip.state.phase === 'intro', 20000))) throw new Error('no intro');
      running = pair.trip;
    }
    if (!(await until(() => Array.isArray(tourNow().stops), 15000))) throw new Error('the stops never loaded');
    const tour = tourNow();
    const number = pair.stop === 'og' ? (Number.isInteger(tour.og_stop) ? tour.og_stop : 1) : Number(pair.stop);
    const stop = Number.isInteger(number) ? tour.stops[number - 1] : tour.stops.find((s) => s.id === pair.stop);
    if (!stop) throw new Error('no such stop');
    const dropped = new Set((plan.dropped || []).map((d) => d.id));
    if (dropped.has(stop.id)) throw new Error('the stop is dropped today');
    const index = tour.stops.filter((s) => !dropped.has(s.id)).findIndex((s) => s.id === stop.id);
    sr.trip.jumpTo(index);
    if (fresh) sr.trip.play();
    const seen = [];
    const t0 = performance.now();
    const arrived = await until(() => {
      const st = sr.trip.state;
      if (st.phase === 'flight' && performance.now() - t0 > FLIGHT_GRACE_MS && sr.cameraRig.finishFlight) sr.cameraRig.finishFlight();
      const at = `${st.phase}@${st.index}`;
      if (seen[seen.length - 1] !== at) seen.push(at);
      return (st.phase === 'settle' || st.phase === 'dwell' || st.phase === 'held') && st.index === index;
    }, 45000);
    if (!arrived) throw new Error(`never arrived (${seen.join(' ')})`);
    sr.trip.pause('probe');
    // The textures, the photograph or the day's map of what it arrived at.
    await sleep(3200);
    const row = { trip: pair.trip, stop: stop.id, number: tour.stops.indexOf(stop) + 1, zoom: pair.zoom, shownAt: new Date(sr.clock.now()).toISOString(), t: Math.round(elapsed()) };
    if (want === 'look') row.look = draw(800, 336, pair.zoom, 'image/jpeg', 0.8);
    const k = DRAW_SCALE[pair.trip] || 1;
    if (want === 'og' || want === 'both') row.og = draw(Math.round(1200 * k), Math.round(504 * k), pair.zoom);
    if (want === 'card' || want === 'both') row.png = draw(Math.round(960 * k), Math.round(720 * k), pair.zoom);
    out.frames.push(row);
  } catch (e) {
    out.log.push(`${key}: ${String(e && e.message)} ${String((e && e.stack) || '').split('\n').slice(1, 4).join(' | ')}`);
    running = null;
    try { sr.trip.stop('leave'); } catch { /* nothing was running */ }
    await sleep(1000);
  }
}
try { sr.trip.stop('leave'); } catch { /* nothing was running */ }
out.log.push(`done at ${elapsed().toFixed(0)} s`);
return out;
