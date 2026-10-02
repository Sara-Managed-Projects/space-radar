// The trip cards' pictures (spec 0068 task 1), rendered by the app itself in a real headless Chrome:
//
//   python3 tools/serve.py site 8450 &
//   node tools/cdp.mjs http://127.0.0.1:8450/index.html tools/trip-pictures.probe.js \
//     --width=1280 --height=800 --block=celestrak.org,ll.thespacedevs.com > /tmp/trip-pictures.json
//   $PY scripts/build_trip_thumbs.py --from=/tmp/trip-pictures.json        (PIL; writes the WebPs)
//
// For each trip: start it, jump to its picture stop, fly there exactly as a visitor would (the deep
// link's path, ui/trip.js jumpTo), wait for the dwell and a beat for the textures, and draw the
// scene once with renderer.renderTo() -- the scene and nothing else, so no label, card or HUD has to
// be hidden (ui/postcard.js ogPicture says why). The PNG comes back as a data URL per trip.
//
// THE FRAME IS 4:3 AND THE PICTURE IS ITS LOWER 16:9. A trip card shows its picture's whole height
// and lays its title over the lower half (ui.css .sr-tripcard), so the subject has to sit in the
// upper third, not the middle. Rendering taller and keeping the bottom 540 of 720 rows puts the
// stop's framed centre at a third of the way down, a third larger than a 16:9 render would.
//
// THE STOP is the trip's `og_stop:` (its share picture, registry/tours.yaml), else its first, unless
// PICTURE_STOP names another: a share picture is 1200 x 504 with a caption under it, and a card is
// 160 x 128 with the title over it, so what reads at one size may be a smear at the other.
//
// A local site/data/v1/ copy of the saved catalogues (gitignored) lets the stations' trips find the
// ISS with CelesTrak blocked; without it those trips are reported as not runnable and skipped.

const PICTURE_STOP = {
  // The far view of the Earth is a dot at card size; the station against the limb is the trip.
  'people-in-space': 2,
  // "now" is the station itself, over the night side: the trip's destination, not its launch pad.
  'journey-to-the-station': 3,
  // TRAPPIST-1's seven rings are hairlines at 160 px; one of its worlds, lit from the side, reads.
  'travel-to-exoplanets': 4,
  // The shadow on the Earth at the peak, not the Moon arriving.
  'chasing-the-solar-eclipse': 2,
};

// How much closer than the stop's own framing, by the camera's zoom: a card is 160 px wide, and a
// world that fills a third of a 1280 px screen is a dot at that size.
const PICTURE_ZOOM = {
  'a-year-in-a-minute': 1.6,
  'chasing-the-solar-eclipse': 1.6,
};

// A run may name its own stops and zooms (window.__pictureStops / __pictureZooms), to try one.
Object.assign(PICTURE_STOP, window.__pictureStops || {});
Object.assign(PICTURE_ZOOM, window.__pictureZooms || {});

const FLIGHT_GRACE_MS = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => {
  const t0 = performance.now();
  while (!fn()) {
    if (performance.now() - t0 > ms) throw new Error(`timed out: ${typeof what === 'function' ? what() : what}`);
    await sleep(250);
  }
};

await until(() => window.__srLayersReady === true, 180000, 'the layers');
const sr = window.spaceRadar;
if (sr.loadAfterFirstVisit) await sr.loadAfterFirstVisit().catch(() => {});
await sleep(3000);
const out = {};
const only = (window.__tripPictureOnly || '').split(',').filter(Boolean);
for (const tour of sr.trip.tours()) {
  if (only.length && !only.includes(tour.id)) continue;
  try {
    const plan = await sr.trip.start(tour.id);
    if (!plan || plan.offerable === false) { out[tour.id] = { error: `cannot run: ${(plan && plan.reason) || 'no plan'}` }; continue; }
    await until(() => sr.trip.state.phase === 'intro', 30000, `${tour.id} intro`);
    const wanted = PICTURE_STOP[tour.id] || (Number.isInteger(tour.og_stop) ? tour.og_stop : 1);
    const stopId = (tour.stops[wanted - 1] || {}).id;
    const dropped = new Set((plan.dropped || []).map((d) => d.id));
    const kept = tour.stops.filter((s) => !dropped.has(s.id));
    const index = Math.max(0, kept.findIndex((s) => s.id === stopId));
    if (index > 0) sr.trip.jumpTo(index);
    sr.trip.play();
    const seen = [];
    // A flight in software rendering can sit at a few frames a second for minutes, and once in a
    // while never reports done (seen 2026-10-02 on the first trip of a boot). After FLIGHT_GRACE_MS
    // in the air it is finished where it was going -- the rig's own cut, the same end shot.
    const t0 = performance.now();
    await until(() => {
      const st = sr.trip.state;
      if (st.phase === 'flight' && performance.now() - t0 > FLIGHT_GRACE_MS && sr.cameraRig.finishFlight) sr.cameraRig.finishFlight();
      const at = `${st.phase}@${st.index}`;
      if (seen[seen.length - 1] !== at) seen.push(at);
      // Arrived: the settle (the card is painted) or the dwell. Software rendering can starve the
      // settle's timer for a long while, and the camera is already at rest in it.
      return (st.phase === 'settle' || st.phase === 'dwell') && st.index === index;
    }, 120000, () => `${tour.id} stop ${index + 1} (${seen.join(' ')})`);
    sr.trip.pause();
    await sleep(3500);
    const zoom = PICTURE_ZOOM[tour.id] || 1;
    const cam = sr.camera;
    const zoom0 = cam.zoom;
    cam.zoom = zoom0 * zoom;
    let frame;
    try { frame = sr.rendererApi.renderTo(960, 720); } finally { cam.zoom = zoom0; cam.updateProjectionMatrix(); }
    out[tour.id] = { stop: sr.trip.state.stopId, wanted: stopId, zoom, png: frame.toDataURL('image/png') };
  } catch (e) {
    out[tour.id] = { error: String(e && e.message) };
  }
  try { sr.trip.stop('leave'); } catch { /* the next start() replaces it anyway */ }
  await sleep(2500);
}
return out;
