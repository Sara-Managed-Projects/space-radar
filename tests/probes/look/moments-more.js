// moments-more: the Moments of release 1.7.0 (internal #1058), three to five frames of each at named seconds, each with the player's own
// state beside it: the shot, the mission clock, the compression on screen, the chapter, the caption, the foot line. Opened as a visitor's link
// opens one, paused at each second. Also the shelf and the card of Launch Complex 39A, which now has a Replay row for each of its stories.
// Run it at -f width=1600 -f height=900.
look.probe = 'moments-more';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const STORIES = [
  ['sputnik-1', [[-4, 'pad', 'the 8K71PS on Site 1 at ignition, the third stage and shroud of the Vostok launcher put away'], [118, 'strapons', 'two seconds after the strap-on blocks fell away, the core burning on'],
    [845, 'sphere', 'PS-1 in sunlight, 13 minutes out (it flew in the Earth\'s shadow until then): the polished sphere with its seam and its four whips, 6.5 m away'], [2200, 'orbit', 'the satellite over the Earth, a third of the way round its first lap']]],
  ['apollo-13', [[-4, 'ignition', 'the Saturn V of Apollo 13 at ignition on pad 39A'], [338, 'pogo', 'eight seconds after the S-II centre engine cut off early: four engines burning, the centre one dark'],
    [201298, 'bang', 'four and a half seconds after the tank burst: the panel of bay 4 flying clear, the foil standing out of the bay, the vent'], [278990, 'farside', 'two minutes past the far side of the Moon at 254 km: the stack, the Moon behind it, the Earth far off'],
    [496985, 'photo', 'the service module a minute after it was let go: the open bay 4, as the crew photographed it'], [513850, 'entry', 'the command module in entry alone, the shock layer glowing']]],
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
// The shelf, once the first visit has settled, and the pad's card.
try {
  location.hash = '';
  await sleep(2000);
  const tab = document.querySelector('[data-tab="earth"]'); if (tab) tab.click();
  await until(() => document.querySelector('.sr-momentcard'), 60000);
  out.shelf = [...document.querySelectorAll('.sr-momentcard')].map((c) => c.textContent);
  const host = document.querySelector('.sr-moments'); if (host) host.scrollIntoView({ block: 'center' });
  await shot('shelf', 'the Moments shelf under the trips on the Earth pane', 1500);
} catch (err) { look.errors.push('probe: shelf: ' + err); }
try {
  const rec = sr.recordById && sr.recordById('saturn-v-lc-39a');
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRow = document.querySelectorAll('.sr-card [data-moment]').length; await shot('card', 'the card of Launch Complex 39A with "Replay this moment" under the four actions', 1500); }
  else out.cardRow = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
