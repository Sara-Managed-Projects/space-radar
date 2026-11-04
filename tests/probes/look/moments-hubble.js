// moments-hubble: the Moment of release 1.7.7 (internal #1058), Hubble's deployment from Discovery (STS-31, 25 April 1990), at named seconds, each with the player's own state
// beside it: the shot, the mission clock, the compression on screen, the chapter, the caption, the foot line. Opened as a visitor's link opens one, paused at each second.
// The release is at mission second 111 849 (19:38:00 UTC). Also the shelf, and the card of Launch Complex 39B with its Replay row.
// Run it at -f width=1600 -f height=900.
look.probe = 'moments-hubble';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const R = 111849;
const FRAMES = [
  [R - 7870, 'bay', 'Hubble in Discovery\'s open bay on its berth, the arm hovering over the grapple fixture'],
  [R - 7620, 'grapple', 'the end effector snared on the fixture'],
  [R - 7330, 'lift', 'the telescope halfway out of the bay on the arm'],
  [R - 6930, 'masts', 'the array masts swung out, the blankets still rolled'],
  [R - 6790, 'unroll', 'the first array unrolling'],
  [R - 6200, 'stop', 'the first array out, the second stopped part-way'],
  [R - 1880, 'free', 'the second array coming out the rest of the way'],
  [R - 1585, 'booms', 'the antenna booms springing out'],
  [R - 650, 'swing', 'the arm swinging the telescope to the release position'],
  [R - 8, 'release', 'the end effector about to open, the telescope upright over the bay'],
  [R + 60, 'away', 'the telescope free, the arm drawing back'],
  [R + 900, 'trail', 'Discovery drifting behind, the telescope a small ringed mark'],
];
try {
  location.hash = `#moment=hubble-deployment&t=${FRAMES[0][0]}`;
  const up = await until(() => sr.replay && sr.replay.state().id === 'hubble-deployment' && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
  out.up = up; out.state = sr.replay ? sr.replay.state() : null;
  if (!up) look.errors.push(`hubble-deployment: the moment never came up with its models: ${JSON.stringify(out.state)}`);
  else for (const [t, name, note] of FRAMES) {
    try {
      sr.replay.pause();
      sr.replay.seek(t);
      await sleep(5500);
      const st = sr.replay.state();
      out.scenes.push({ name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles, met: text('.sr-moment__met'), shown: text('.sr-moment__rate'),
        caption: text('.sr-moment__caption'), foot: text('.sr-moment__truth'), render: frameCost() });
      await shot(`hubble-${name}`, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot})`);
    } catch (err) { look.errors.push(`probe: ${name}: ${err && err.stack || err}`); }
  }
} catch (err) { look.errors.push(`probe: hubble-deployment: ${err && err.stack || err}`); }
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
  const rec = sr.recordById && sr.recordById('shuttle-lc-39b');
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRows = [...document.querySelectorAll('.sr-card [data-moment]')].map((n) => n.textContent); await shot('card', 'the card of Launch Complex 39B: a Replay row for Artemis II and for the Hubble deployment', 1500); }
  else out.cardRows = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
