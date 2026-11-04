// moments-falcon9: the Moment of release 1.7.7 (internal #1058, #867), the first Falcon 9 landing (flight 20, ORBCOMM OG2 Mission 2, 22 December 2015 UTC), at named seconds, each with the player's own state
// beside it: the shot, the mission clock, the compression on screen, the chapter, the caption, the foot line. Opened as a visitor's link opens one, paused at each second.
// The release is at mission second 111 849 (19:38:00 UTC). Also the shelf, and the card of Launch Complex 39B with its Replay row.
// Run it at -f width=1600 -f height=900.
look.probe = 'moments-falcon9';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const FRAMES = [
  [-4, 'ignition', 'the stack on Space Launch Complex 40 at ignition, a night launch lit by a lamp'],
  [40, 'climb', 'the climb, the tracking camera'],
  [141, 'meco', 'two seconds before main engine cut-off'],
  [150, 'separation', 'the first stage turning tail-first as the second stage pulls away'],
  [170, 'fairing', 'the fairing halves let go from the second stage'],
  [236, 'boostback', 'three engines lit for the boostback burn'],
  [266, 'fins', 'the grid fins swung out'],
  [300, 'apogee', 'the stage near the top of its arc, the Earth below'],
  [480, 'entry', 'the entry burn about to start'],
  [492, 'entry-burn', 'in the entry burn'],
  [549, 'landing-burn', 'the stage over the landing place, a second before the landing burn'],
  [566, 'descent', 'the landing burn, the legs still folded'],
  [577, 'legs', 'the legs swinging down'],
  [583, 'touch', 'the first stage about to touch Landing Zone 1'],
  [592, 'landed', 'the stage standing on the pad'],
];
try {
  location.hash = `#moment=falcon9-og2-2&t=${FRAMES[0][0]}`;
  const up = await until(() => sr.replay && sr.replay.state().id === 'falcon9-og2-2' && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
  out.up = up; out.state = sr.replay ? sr.replay.state() : null;
  if (!up) look.errors.push(`falcon9-og2-2: the moment never came up with its models: ${JSON.stringify(out.state)}`);
  else for (const [t, name, note] of FRAMES) {
    try {
      sr.replay.pause();
      sr.replay.seek(t);
      await sleep(5500);
      const st = sr.replay.state();
      out.scenes.push({ name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles, met: text('.sr-moment__met'), shown: text('.sr-moment__rate'),
        caption: text('.sr-moment__caption'), foot: text('.sr-moment__truth'), render: frameCost() });
      await shot(`f9-${name}`, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot})`);
    } catch (err) { look.errors.push(`probe: ${name}: ${err && err.stack || err}`); }
  }
} catch (err) { look.errors.push(`probe: falcon9-og2-2: ${err && err.stack || err}`); }
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(3000);
try {
  location.hash = '';
  await sleep(2000);
  const tab = document.querySelector('[data-tab="earth"]'); if (tab) tab.click();
  await until(() => document.querySelector('.sr-momentcard'), 60000);
  out.shelf = [...document.querySelectorAll('.sr-momentcard')].map((c) => c.textContent);
  const host = document.querySelector('.sr-moments'); if (host) host.scrollIntoView({ block: 'center' });
  await shot('shelf', 'the Moments shelf on the Earth pane', 1500);
} catch (err) { look.errors.push('probe: shelf: ' + err); }
try {
  for (const id of ['spacex-slc-40', 'falcon-lz-1']) {
    const rec = sr.recordById && sr.recordById(id);
    if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('.sr-card [data-moment]'), 30000); (out.cardRows = out.cardRows || {})[id] = [...document.querySelectorAll('.sr-card [data-moment]')].map((n) => n.textContent); await shot(`card-${id}`, `the card of ${id} with its Replay row`, 1500); }
    else (out.cardRows = out.cardRows || {})[id] = 'no record or select hook';
  }
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
