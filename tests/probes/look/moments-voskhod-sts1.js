// moments-voskhod-sts1: the Moments of release 1.7.1 (internal #1058), four frames of each new story at named seconds, and the two Sputnik 1 frames the 1.7.0 review
// said were wrong (the night pad, the satellite over the Earth), each with the player's own state beside it: the shot, the mission clock, the compression on
// screen, the chapter, the caption, the foot line. Opened as a visitor's link opens one, paused at each second. Also the shelf and the card of Launch Complex 39A.
// Run it at -f width=1600 -f height=900.
look.probe = 'moments-voskhod-sts1';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const STORIES = [
  ['sputnik-1', [[-4, 'pad', 'the 8K71PS on Site 1 at ignition, a night launch, lit now by the pad\'s lamp (the 1.7.0 frame was a silhouette)'],
    [2200, 'orbit', 'PS-1 over the Earth, a third of the way round its first lap, with the ringed marker every small vehicle gets']]],
  ['voskhod-2', [[4800, 'volga', 'the Volga airlock out on the Voskhod 3KD, 2.5 m of ribbed fabric tube, before the walk'], [5760, 'walk', 'Leonov at the end of his 5.35 m umbilical, the airlock and the spacecraft in the frame, the Earth below'], [5900, 'close', 'Leonov close up in the Berkut suit, the backpack and the tether'],
    [6360, 'back', 'Leonov coming back in head first, a minute before 08:47:00'], [92860, 'entry', 'the sphere in entry, the instrument module gone, the shock layer glowing'], [93640, 'landing', 'the sphere under its red canopy over the taiga near Perm, 100 s before touchdown']]],
  ['sts-1', [[-4, 'pad', 'Columbia on the white tank at ignition on Launch Complex 39A'], [134, 'srb', 'two seconds after the boosters were let go at 2 min 12 s'],
    [5800, 'bay', 'Columbia in orbit with the payload bay doors open, the Earth below'], [194290, 'entry', 'Columbia in entry, nose-high, the shock layer glowing, the Pacific below'], [195590, 'approach', 'the last minute: the glide to runway 23, gear still up'], [195650, 'touch', 'the main gear on the lakebed at Edwards, runway 23, three seconds before 18:20:57']]],
];
for (const [id, frames] of STORIES) {
  try {
    location.hash = `#moment=${id}&t=${frames[0][0]}`;
    const up = await until(() => sr.replay && sr.replay.state().id === id && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
    out[id] = { up, state: sr.replay ? sr.replay.state() : null };
    if (!up) { look.errors.push(`${id}: the moment never came up with its models: ${JSON.stringify(out[id].state)}`); continue; }
    for (const [t, name, note] of frames) {
      try {
        sr.replay.pause();
        sr.replay.seek(t);
        await sleep(5500);
        const st = sr.replay.state();
        out.scenes.push({ id, name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles, met: text('.sr-moment__met'), shown: text('.sr-moment__rate'),
          caption: text('.sr-moment__caption'), foot: text('.sr-moment__truth'), render: frameCost() });
        await shot(`${id}-${name}`, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot})`);
      } catch (err) { look.errors.push(`probe: ${id} ${name}: ${err && err.stack || err}`); }
    }
  } catch (err) { look.errors.push(`probe: ${id}: ${err && err.stack || err}`); }
}
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(3000);
try {
  location.hash = '';
  await sleep(2000);
  const tab = document.querySelector('[data-tab="earth"]'); if (tab) tab.click();
  await until(() => document.querySelector('.sr-momentcard'), 60000);
  out.shelf = [...document.querySelectorAll('.sr-momentcard')].map((c) => c.textContent);
  const host = document.querySelector('.sr-moments'); if (host) host.scrollIntoView({ block: 'center' });
  await shot('shelf', 'the Moments shelf on the Earth pane, seven stories', 1500);
} catch (err) { look.errors.push('probe: shelf: ' + err); }
try {
  const rec = sr.recordById && sr.recordById('saturn-v-lc-39a');
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRow = document.querySelectorAll('.sr-card [data-moment]').length; await shot('card', 'the card of Launch Complex 39A: a Replay row for Apollo 11, Apollo 13 and STS-1', 1500); }
  else out.cardRow = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
