// moments-entry: the glow of an entry where it meets the capsule's rim (release 1.6.2, internal #1054 to #1057, the known
// look issue of 1.6.0). Apollo 11's command module and Orion in entry, three frames each a few seconds apart, paused, in the
// shot the director chose. Run at -f width=1200 -f height=800.
look.probe = 'moments-entry';
const out = { scenes: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
for (const [id, frames] of [['apollo-11', [702340, 702352, 702400]], ['artemis-ii', [782560, 782600]]]) {
  try {
    location.hash = `#moment=${id}&t=${frames[0]}`;
    const up = await until(() => sr.replay && sr.replay.state().id === id && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
    if (!up) { look.errors.push(`${id}: the moment never came up`); continue; }
    for (const t of frames) {
      sr.replay.pause(); sr.replay.seek(t); await sleep(5500);
      const st = sr.replay.state();
      out.scenes.push({ id, t, shot: st.shot, met: text('.sr-moment__met'), caption: text('.sr-moment__caption') });
      await shot(`entry-${id}-${t}`, `${id} in entry at ${text('.sr-moment__met')}, shot ${st.shot}: the glow where it meets the capsule's rim`);
    }
  } catch (err) { look.errors.push(`probe: ${id}: ${err && err.stack || err}`); }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(2500);
}
return finish(out);
