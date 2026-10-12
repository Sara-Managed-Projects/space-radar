// smoke: the look a pull request gets. Home, a wide view, four worlds, the Earth with its ocean
// currents when the saved data is there, and four stops of the drift.
look.probe = 'smoke';
const out = {};
await shot('1-home', 'home, as a visit lands on it');
rig.flyTo({ distance: rig.state.distance * 6, ms: 0 });
await shot('2-wide', 'pulled back six times: the planets are lights', 4000);
await go('moon', '3-moon');
await go('jupiter', '4-jupiter');
await go('sun', '5-sun', 9000);
out.sunDetail = sr.sunDetail ? sr.sunDetail.state().on : false;
await go('saturn', '6-saturn');
await go('earth', '7-earth', 5000);
try {
  sr.setOverlay('currents');
  await until(() => { const s = sr.overlayState(); return s && s.status && s.status !== 'loading'; }, 20000);
  out.currents = sr.overlayState();
  if (out.currents && out.currents.status === 'shown') {
    await until(() => sr.overlayState().opacity > 0.5, 15000);
    await shot('8-currents', 'ocean currents on', 5000);
    rig.flyTo({ azimuth: rig.state.azimuth + 1.6, ms: 0 });
    await shot('9-currents-turned', 'ocean currents, a quarter turn on', 4000);
  } else look.missing.push('ocean currents: ' + JSON.stringify(out.currents && out.currents.status));
  sr.setOverlay(null);
} catch (e) { look.errors.push('probe: the currents step threw: ' + (e && e.stack || e)); }
try {
  const d = await sr.wantDrift({ drift: 'craft,worlds,brisk' }, 'link');
  out.drift = [];
  let last = null;
  // A stop is photographed five and a half seconds in: the drift looks at what it has arrived at
  // four seconds in (ui/drift.js PEEK_MS) and leaves a dot in black, and the picture is of what it
  // stays with. A stop it left by then is written down as left, with no picture.
  out.driftLeft = [];
  for (let i = 0; i < 150 && out.drift.length < 4; i++) {
    await sleep(1000);
    const st = d.state();
    if (st.phase === 'dwell' && st.place !== last) {
      last = st.place;
      await sleep(5500);
      const now = d.state();
      if (now.place !== st.place) { out.driftLeft.push([st.place, st.hood]); continue; }
      out.drift.push([st.place, st.hood]);
      await shot('drift-' + out.drift.length + '-' + st.place, 'the drift staying at ' + st.place + ', five and a half seconds in');
    }
  }
  d.stop();
  if (out.drift.length < 4) out.fail = 'the drift stayed at ' + out.drift.length + ' of 4 stops in 150 s (left early: ' + out.driftLeft.length + ')';
} catch (e) { look.errors.push('probe: the drift step threw: ' + (e && e.stack || e)); }
return finish(out);
