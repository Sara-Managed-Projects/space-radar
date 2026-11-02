// moment-stories: the three stories of the Moments (release 1.6.0, internal spec 0079 stages C5 to C7), three or four frames
// of each at named seconds, each with the player's own state beside it: the shot, the mission clock, the compression on
// screen, the chapter, the caption, the foot line. Opened as a visitor's link opens one, paused at each second. Also the
// Moments shelf on the Earth pane and the card of Launch Complex 39A with its Replay row. Run it at -f width=1600 -f height=900.
look.probe = 'moment-stories';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const STORIES = [
  ['vostok-1', [[-4, 'pad', 'the R-7 on Site 1, five minutes before the world heard of it: the flames in the trench'], [121, 'strapons', 'the four strap-on boosters falling away at T+119 s, the core stage burning on'],
    [5848, 'ejection', 'the seat leaving the capsule at 7 km, the hatch gone, the drogue out'], [6030, 'chutes', 'the capsule under its 27 m canopy and the pilot under his own, over the landing field']]],
  ['apollo-11', [[-4, 'ignition', 'the Saturn V at ignition on pad 39A'], [9930, 'tli', 'the S-IVB burning for the Moon, 185 km over the Earth, the Sun low'],
    [369915, 'descent', 'Eagle in powered descent, a little over a hundred metres up, the descent engine lit'], [370070, 'landed', 'Eagle on the Moon at Tranquility Base, the Earth in the black sky'],
    [702340, 'entry', 'Columbia in entry, heat shield forward, the shock layer glowing']]],
  ['artemis-ii', [[-3, 'pad', 'SLS on pad 39B at engine start, Orion on top'], [128, 'boosters', 'the two five-segment boosters separating at 48 km'],
    [89960, 'orion', 'Orion and its service module close up before the burn for the Moon, the four arrays out'], [433550, 'flyby', 'two minutes past closest approach to the far side of the Moon: Orion, the Moon behind, the Earth far off'],
    [782560, 'entry', 'Orion in entry off the coast of California']]],
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
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRow = !!document.querySelector('.sr-card [data-moment]'); await shot('card', 'the card of Launch Complex 39A with "Replay this moment" under the four actions', 1500); }
  else out.cardRow = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
