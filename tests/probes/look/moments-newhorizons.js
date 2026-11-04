// moments-newhorizons: New Horizons at Pluto (release 1.7.9, internal #1058), a frame at each of its named seconds, each with the player's own state beside it.
// Opened as a visitor's link opens one, paused at each second. Also the card of Pluto. Run it at -f width=1600 -f height=900.
look.probe = 'moments-newhorizons';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const FRAMES = JSON.parse((new URLSearchParams(location.search).get('lookFrames')) || 'null') || [
  [-21500, 'far', 'six hours out, 300 000 km: Pluto and Charon as points and the craft a ringed dot, from the side of the approach'],
  [-5000, 'approach', 'the craft close, Pluto behind it as a small lit disc, 70 000 km away'],
  [-600, 'lit', 'ten minutes out, Pluto a disc of some 10 degrees on its lit side behind the craft'],
  [-20, 'close', 'the pass: the craft and Pluto behind it, the day and night sides'],
  [60, 'back', 'a minute after the pass: the craft looking back at Pluto, now a crescent, with the thin rim glow'],
  [400, 'crescent', 'Pluto and Charon from far, the craft leaving, the crescent of Pluto'],
  [880, 'charon', 'Charon, about 14 minutes after Pluto, within 29 000 km of the craft'],
  [1500, 'after', 'the pair from far, the craft on its way out'],
];
try {
  location.hash = `#moment=new-horizons-pluto&t=${FRAMES[0][0]}`;
  const up = await until(() => sr.replay && sr.replay.state().id === 'new-horizons-pluto' && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
  out.up = up; out.state = sr.replay ? sr.replay.state() : null;
  if (!up) look.errors.push(`new-horizons-pluto: the moment never came up with its models: ${JSON.stringify(out.state)}`);
  else for (const [t, name, note] of FRAMES) {
    try {
      sr.replay.pause();
      sr.replay.seek(t);
      await sleep(5500);
      const st = sr.replay.state();
      out.scenes.push({ name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles, met: text('.sr-moment__met'), shown: text('.sr-moment__rate'),
        caption: text('.sr-moment__caption'), foot: text('.sr-moment__truth'), render: frameCost() });
      await shot(`nh-${name}`, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot})`);
    } catch (err) { look.errors.push(`probe: ${name}: ${err && err.stack || err}`); }
  }
} catch (err) { look.errors.push(`probe: new-horizons-pluto: ${err && err.stack || err}`); }
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(3000);
try {
  location.hash = '';
  await sleep(2000);
  const rec = sr.recordById && sr.recordById('pluto');
  if (rec && sr.select) { sr.select(rec); await until(() => document.querySelector('[data-moment]'), 30000); out.cardRow = document.querySelectorAll('.sr-card [data-moment]').length; await shot('card-pluto', 'the card of Pluto with a Replay row for the flyby', 1500); }
  else out.cardRow = 'no record or select hook';
} catch (err) { look.errors.push('probe: card: ' + err); }
return finish(out);
