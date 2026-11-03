// moments-curiosity: Curiosity's entry, descent and landing (release 1.7.9, internal #1058), a frame at each of its named seconds, each with the player's own
// state beside it: the shot, the mission clock, the compression on screen, the chapter, the caption, the foot line. Opened as a visitor's link opens one, paused
// at each second. Also the shelf and the card of Gale crater. Run it at -f width=1600 -f height=900.
look.probe = 'moments-curiosity';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const FRAMES = JSON.parse((new URLSearchParams(location.search).get('lookFrames')) || 'null') || [
  [-26, 'far', 'the aeroshell 130 km over Mars, a ringed dot over the limb, 30 seconds before the air'],
  [-6, 'shield', 'the aeroshell close, heat shield forward, six seconds before the entry'],
  [60, 'glow', 'the shock layer at 60 s, the shield glowing, the air thick'],
  [90, 'peak', 'peak heating at 90 s, the camera low and close, from the front'],
  [150, 'slow', 'the glow gone, the vehicle falling in the thickening air'],
  [262, 'chute', 'the parachute opening 3 s after 05:15:04.9 UTC, the canopy and its lines in the frame'],
  [276, 'chute-wide', 'the whole vehicle under the canopy, the shield about to go'],
  [279.9, 'shield-off', 'the heat shield 1 s after it was let go at 05:15:24.6 UTC, falling away below the back shell'],
  [322, 'descent', 'under the canopy at 322 s, Mars below'],
  [362, 'backshell', 'the back shell letting go at 358.9 s: the stage and rover dropped out below it, the engines lit'],
  [386, 'powered', 'the descent stage under power, the rover under it'],
  [404, 'low', 'the stage 300 m up, the ground close, the plumes of the engines'],
  [417, 'crane', 'the sky crane at 417 s: the rover let go of the stage, cords out'],
  [424, 'cords', 'the rover on its cords'],
  [431, 'touch', 'the wheels about to touch, 05:17:57 UTC'],
  [438, 'flyaway', 'the stage flying away from the landing, the rover on the ground, the cords cut'],
  [455, 'after', 'the rover on Bradbury Landing, the stage gone'],
];
try {
  location.hash = `#moment=curiosity-edl&t=${FRAMES[0][0]}`;
  const up = await until(() => sr.replay && sr.replay.state().id === 'curiosity-edl' && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
  out.up = up; out.state = sr.replay ? sr.replay.state() : null;
  if (!up) look.errors.push(`curiosity-edl: the moment never came up with its models: ${JSON.stringify(out.state)}`);
  else for (const [t, name, note] of FRAMES) {
    try {
      sr.replay.pause();
      sr.replay.seek(t);
      await sleep(5500);
      const st = sr.replay.state();
      out.scenes.push({ name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles, met: text('.sr-moment__met'), shown: text('.sr-moment__rate'),
        caption: text('.sr-moment__caption'), foot: text('.sr-moment__truth'), render: frameCost() });
      await shot(`curiosity-${name}`, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot})`);
    } catch (err) { look.errors.push(`probe: ${name}: ${err && err.stack || err}`); }
  }
} catch (err) { look.errors.push(`probe: curiosity-edl: ${err && err.stack || err}`); }
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(3000);
try {
  location.hash = '';
  await sleep(2000);
  const tab = document.querySelector('[data-tab="earth"]'); if (tab) tab.click();
  await until(() => document.querySelector('.sr-momentcard'), 60000);
  out.shelf = [...document.querySelectorAll('.sr-momentcard')].map((c) => c.textContent);
  const host = document.querySelector('.sr-moments'); if (host) host.scrollIntoView({ block: 'center' });
  await shot('shelf', 'the Moments shelf on the Earth pane, with Curiosity\'s card', 1500);
} catch (err) { look.errors.push('probe: shelf: ' + err); }
try {
  const rec = sr.recordById && sr.recordById('gale');
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRow = document.querySelectorAll('.sr-card [data-moment]').length; await shot('card', 'the card of Gale crater with a Replay row for the landing', 1500); }
  else out.cardRow = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
