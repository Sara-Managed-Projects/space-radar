// The Moments shelf's pictures (release 1.7.7), rendered by the app itself in a real headless Chrome:
//
//   python3 tools/serve.py site 8450 &
//   node tools/cdp.mjs "http://127.0.0.1:8450/index.html?momentPictures=ID,ID" tools/moment-pictures.probe.js \
//     --width=1200 --height=900 --block=celestrak.org,ll.thespacedevs.com > /tmp/moment-pictures.json
//   $PY scripts/build_trip_thumbs.py --moments --from=/tmp/moment-pictures.json        (PIL; writes the WebPs)
//
// For each story: open it as a visitor's link opens one (`#moment=<id>&t=<second>`), pause at the story's picture
// second, wait for the textures, draw the story's own frame once and take the canvas: the scene and nothing else
// (no caption, strip or card to hide). The PNG comes back as a data URL per story.
//
// WHICH SECOND. The `picture` field of the story's row in SHELF (site/js/moments/shelf.js): a mission second, as
// the player counts it. A story that is added to the shelf names its picture second there and is rendered by the
// same command. `?momentPictures=id,id` names the stories (else every story on the shelf); `?momentSeconds=id:s,id:s`
// tries other seconds without editing the shelf (the same id more than once renders each: a contact sheet).
//
// THE FRAME IS 4:3 AND THE PICTURE IS ITS LOWER 16:9, as the trips' are (tools/trip-pictures.probe.js says why: a
// card lays its title over the lower half, so the subject has to sit in the upper third of the picture).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => {
  const t0 = performance.now();
  while (!fn()) {
    if (performance.now() - t0 > ms) throw new Error(`timed out: ${typeof what === 'function' ? what() : what}`);
    await sleep(250);
  }
};

const query = new URLSearchParams(location.search);
const names = (query.get('momentPictures') || '').split(',').filter(Boolean);
const tries = (query.get('momentSeconds') || '').split(',').filter(Boolean).map((x) => x.split(':'));

await until(() => window.__srLayersReady === true, 180000, 'the layers');
const sr = window.spaceRadar;
const { SHELF } = await import('/js/moments/shelf.js');

const jobs = [];
for (const s of SHELF) {
  if (names.length && !names.includes(s.id)) continue;
  const own = tries.filter(([id]) => id === s.id);
  if (own.length) for (const [, sec] of own) jobs.push({ id: s.id, t: Number(sec) });
  else if (Number.isFinite(s.picture)) jobs.push({ id: s.id, t: s.picture });
  else jobs.push({ id: s.id, error: 'the shelf row has no `picture` second' });
}

const out = [];
for (const job of jobs) {
  if (job.error) { out.push(job); continue; }
  try {
    location.hash = `#moment=${job.id}&t=${job.t}`;
    await until(() => sr.replay && sr.replay.state().id === job.id && sr.replay.state().status === 'ready'
      && sr.replay.state().vehicles.every((v) => v.loaded), 240000, () => `${job.id} never came up: ${JSON.stringify(sr.replay && sr.replay.state())}`);
    sr.replay.pause();
    sr.replay.seek(job.t);
    await sleep(6000);
    // The player's own loop is drawing this second; draw it once more in this task and read the canvas before the task ends.
    sr.replay.render();
    const canvas = sr.rendererApi.renderer.domElement;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    out.push({ id: job.id, t: job.t, shot: sr.replay.state().shot, png: copy.toDataURL('image/png') });
  } catch (e) {
    out.push({ id: job.id, t: job.t, error: String(e && e.message) });
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  location.hash = '';
  await sleep(2500);
}
return { moments: out };
