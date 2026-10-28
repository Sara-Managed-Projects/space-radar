// moments: the Moment player (internal spec 0079 stage C1, internal i#1050), with the engine's demonstration moment
// `demo-saturn` (site/data/moments/demo-saturn.json): Apollo 11's Saturn V from ignition to the escape tower's
// jettison, cut from the one NASA model the app has. Opened as a visitor's link opens it (`#moment=demo-saturn&t=`),
// then paused at each key second and photographed with the player's own state beside it: the shot, the mission
// clock, the time compression on screen, the chapter, the vehicle's height, the parts and the renderer's counts.
// Then the chapters opened in place, the visitor's own camera dragged round the stack, the frame interval while it
// plays, a share link opened over the running page at a second (it must land on that second, paused), and Escape
// (the map comes back, the address loses the moment). Run it at -f width=1600 -f height=900 and with -f mobile=true.
look.probe = 'moments';
const out = { scenes: [] };
const frames = async (n = 40) => {
  const ts = [];
  await new Promise((res) => { const f = (x) => { ts.push(x); if (ts.length > n) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const dt = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
  return { p50: +dt[Math.floor(dt.length * 0.5)].toFixed(1), p95: +dt[Math.floor(dt.length * 0.95)].toFixed(1) };
};
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
location.hash = '#moment=demo-saturn&t=-9.5';
const up = await until(() => sr.replay && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 120000);
out.opened = sr.replay ? sr.replay.state() : null;
if (!up) out.fail = 'the moment never came up with its model: ' + JSON.stringify(out.opened);
const at = async (t, name, note, settle = 5000) => {
  try {
    sr.replay.pause();
    sr.replay.seek(t);
    await sleep(settle);
    const st = sr.replay.state();
    out.scenes.push({ name, t, shot: st.shot, chapter: st.chapter, rate: st.rate, altM: st.altM, calls: st.calls, triangles: st.triangles,
      met: text('.sr-moment__met'), shown: text('.sr-moment__rate'), caption: text('.sr-moment__caption'), render: frameCost() });
    await shot(name, `${note} (${text('.sr-moment__met')}, ${text('.sr-moment__rate')}, shot ${st.shot}, camera ${st.altM} m up)`);
  } catch (err) { look.errors.push('probe: ' + name + ': ' + (err && err.stack || err)); }
};
if (up) {
  await at(-9.5, 'moments-01-pad', 'the pad from 240 m, before ignition: the Sun where it was at 13:32 UTC');
  await at(-4.5, 'moments-02-ignition', 'ignition: five F-1 flames, the steam thrown out of the trench both ways');
  await at(-0.4, 'moments-03-base', 'the base, a moment before lift-off');
  await at(7, 'moments-04-track', 'the long-lens tracking camera 1.6 km away, the stack clearing the pad');
  await at(60, 'moments-05-chase', 'chasing a minute up, the ground and the sea below');
  await at(137, 'moments-06-ceco', 'the centre engine out, 45 km up: the plume widening in thin air');
  await at(162.7, 'moments-07-staging', 'staging: the S-IC falling away, its retro-rockets and the ullage motors firing');
  await at(174, 'moments-08-sii', 'the S-II\'s hydrogen flames, the spent S-IC tumbling behind');
  await at(198.4, 'moments-09-tower', 'the escape tower leaving, the interstage ring gone');
  // The chapters, opened in place over the strip.
  try {
    const b = document.querySelector('.sr-moment__text');
    if (b) b.click();
    await shot('moments-10-chapters', 'the chapters, opened in place above the strip', 2500);
    out.chapters = [...document.querySelectorAll('.sr-moment__row')].map((r) => r.textContent);
    if (b) b.click();
  } catch (err) { look.errors.push('probe: chapters: ' + err); }
  // A visitor's own camera, round the stack at staging.
  try {
    sr.replay.seek(163.2);
    sr.replay.setFree(true);
    const shield = document.querySelector('.sr-moment__shield');
    const r = shield.getBoundingClientRect();
    const ev = (type, x, y) => shield.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
    ev('pointerdown', r.width / 2, r.height / 2); ev('pointermove', r.width / 2 + 180, r.height / 2 - 60); ev('pointerup', r.width / 2 + 180, r.height / 2 - 60);
    await shot('moments-11-free', 'the visitor\'s camera dragged round the stack at staging; Director hands it back', 5000);
    out.free = sr.replay.state().free;
    sr.replay.setFree(false);
  } catch (err) { look.errors.push('probe: free camera: ' + err); }
  // Playing: the frame interval, and the clock moving.
  try {
    sr.replay.seek(-9.5);
    sr.replay.play();
    out.playing = await frames(40);
    out.playedTo = sr.replay.state().t;
    sr.replay.pause();
  } catch (err) { look.errors.push('probe: playing: ' + err); }
  // A share link at a second, pasted over the running page: it must land on that second, paused.
  location.hash = '#moment=demo-saturn&t=162.5';
  await sleep(4000);
  out.linked = { t: sr.replay.state().t, playing: sr.replay.state().playing, hash: location.hash };
  if (Math.abs(out.linked.t - 162.5) > 0.05 || out.linked.playing) look.errors.push('the share link did not land on its second, paused: ' + JSON.stringify(out.linked));
  await shot('moments-12-link', 'opened from #moment=demo-saturn&t=162.5: the same second, paused', 1500);
  // Escape: the map is back and the address has no moment.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(4000);
  out.closed = { active: sr.replay.active, hash: location.hash, sceneVisible: sr.scene ? sr.scene.visible : null };
  if (out.closed.active || /moment=/.test(location.hash)) look.errors.push('Escape did not close the moment: ' + JSON.stringify(out.closed));
  await shot('moments-13-closed', 'Escape: the map again', 1000);
}
return finish(out);
