// tests/probes/finish-desktop-b.js -- the second half of the desktop walk (see finish-desktop.js for
// how to run it): Andromeda and her two companions (#385), a trip's top bar with the way home
// (#241), and the end card's places line (#240).
out.vw = innerWidth; out.vh = innerHeight;
// A passport from before, so the end card has places to count and one trip to continue.
const now = Date.now(); const D = 864e5;
localStorage.setItem('sr:passport', JSON.stringify({ v: 1, first: now - 6 * D, last: now - 36e5, wonder: null,
  visited: { moon: now - 5 * D, mars: now - 4 * D, 'sat-25544': now - 3 * D, jupiter: now - 2 * D, saturn: now - 72e5, earth: now - 36e5, 'dso-m31': now - 100 },
  trips: { 'people-in-space': { done: 1, doneAt: now - 5 * D }, 'moon-landings': { done: 0, stop: 3, count: 8, at: now - 3 * 3600e3 } } }));
out.ready = await until(() => window.__srLayersReady, 150000); out.t.ready = el();
const c = window.spaceRadar;
await wait(6000);

await step('home', async () => {
  await until(() => c.passport || q('.sr-passport-open'), 15000);
  await wait(1500);
  out.home = { firstCards: qa('#sr-pane-earth .sr-tripcard').slice(0, 4).map((n) => `${n.dataset.trip}: ${txt(n.querySelector('.sr-tripcard__meta'))}`), offNote: txt('#sr-pane-earth .sr-trips2__off'), offShown: shown(q('#sr-pane-earth .sr-trips2__off')), more: txt('#sr-pane-earth .sr-trips2 .sr-more') };
  out.shot_home = await shot('d9-home-return');
});

await step('andromeda', async () => {
  await c.loadAfterFirstVisit();
  await until(() => c.recordById('dso-m31') && c.recordById('dso-m32'), 30000);
  const m31 = c.recordById('dso-m31'); const m32 = c.recordById('dso-m32'); const m110 = c.recordById('dso-m110');
  out.andromeda = { names: [m32 && m32.name, m110 && m110.name], why: m32 && m32.meta.why, shaped: c.dsoGlow.shaped() };
  c.select(m31);
  await until(() => c.stage.worldId !== 'earth' && !c.cameraRig.state.flying, 25000);
  await wait(5000);
  const px = (rec) => { const v = c.stage.toScene(rec.pos, 'sun-inertial').clone().project(c.camera); return { x: Math.round((v.x + 1) / 2 * innerWidth), y: Math.round((1 - v.y) / 2 * innerHeight), front: v.z < 1 }; };
  const sizePx = (rec) => { const d = c.stage.toScene(rec.pos, 'sun-inertial').distanceTo(c.camera.position) * c.stage.unitKm; return Math.round(rec.meta.sizeLy * 9460730472580.8 / d * (innerHeight / 2) / Math.tan(c.camera.fov * Math.PI / 360)); };
  const read = () => ({ stage: c.stage.worldId, camLyFromM31: Math.round(c.stage.toScene(m31.pos, 'sun-inertial').distanceTo(c.camera.position) * c.stage.unitKm / 9460730472580.8),
    m31: { ...px(m31), px: sizePx(m31) }, m32: { ...px(m32), px: sizePx(m32) }, m110: { ...px(m110), px: sizePx(m110) },
    photo: c.nebulae ? c.nebulae.drawn('dso-m31') : null, labels: qa('#labels .label').filter(shown).map((n) => n.textContent.trim()).slice(0, 10) });
  out.andromeda.arrival = read();
  out.shot_m31 = await shot('d10-andromeda-arrival');
  // Off our line of sight, where the model stands in for the photograph: turn the camera a third of a turn.
  c.cameraRig.flyTo({ azimuth: c.cameraRig.state.azimuth + 1.2, polar: Math.max(0.5, c.cameraRig.state.polar - 0.3), distance: c.cameraRig.state.distance * 0.8, ms: 0 });
  await wait(5000);
  out.andromeda.side = read();
  out.shot_m31side = await shot('d11-andromeda-side');
  // Her companion's own card says what is drawn.
  c.select(m32, { fly: false }); await wait(2500);
  out.andromeda.m32card = { name: txt('.sr-card__name'), text: (q('#sr-card') || q('.sr-side__card')).innerText.replace(/\n+/g, ' / ').slice(0, 900) };
  c.deselect(); await wait(400);
});

await step('trip', async () => {
  c.trip.start('strangest-things');
  await until(() => c.trip.state.phase === 'intro', 30000);
  const n = c.trip.state.count; out.tripCount = n;
  c.trip.play();
  await until(() => c.trip.state.phase !== 'intro' && q('.sr-trip__top') && !q('.sr-trip__top').hidden, 20000);
  await wait(4000);
  out.tripTop = { buttons: qa('.sr-trip__top button').map((b) => ({ label: b.getAttribute('aria-label') || b.textContent.trim(), title: b.title, ...box(b) })), embers: embers() };
  out.shot_trip = await shot('d12-trip-top');
  c.trip.jumpTo(n - 1);
  await until(() => c.trip.state.index === n - 1, 15000);
  await wait(2500);
  c.trip.next();
  out.outro = await until(() => c.trip.state.phase === 'outro', 15000);
  if (!out.outro) { c.trip.next(); out.outro = await until(() => c.trip.state.phase === 'outro', 15000); }
  await until(() => q('.sr-tripsheet__seen') && !q('.sr-tripsheet__seen').hidden, 8000);
  out.end = { stamp: txt('.sr-tripsheet__stamp'), seen: txt('.sr-tripsheet__seen'), seenBox: box('.sr-tripsheet__seen'), seenShown: shown(q('.sr-tripsheet__seen')), placesInPassport: Object.keys(JSON.parse(localStorage.getItem('sr:passport')).visited).length, embers: embers() };
  out.shot_end = await shot('d13-end-card');
  // Start it again and come home from inside it, by the house.
  c.trip.start('strangest-things');
  await until(() => c.trip.state.phase === 'intro', 20000);
  c.trip.play();
  await until(() => q('.sr-trip__home') && shown(q('.sr-trip__home')), 20000);
  await wait(2500);
  q('.sr-trip__home').click();
  await until(() => c.trip.state.phase === 'idle' && c.stage.worldId === 'earth' && !c.cameraRig.state.flying, 20000);
  await wait(2500);
  out.homeFromTrip = { phase: c.trip.state.phase, stage: c.stage.worldId, selected: !!c.selected(), live: c.clock.mode, view: c.shell.view(), tripMode: document.documentElement.classList.contains('sr-trip-mode'), dist: c.cameraRig.state.distance, home: c.homeDistance() };
  out.shot_back = await shot('d14-home-from-trip');
});
out.t.end = el();
return out;
