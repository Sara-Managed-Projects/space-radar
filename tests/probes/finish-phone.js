// tests/probes/finish-phone.js -- the finishers on a phone, 390 x 844 (2026-10-08). Run as
// finish-desktop.js says, with --mobile --width=390 --height=844.
out.vw = innerWidth; out.vh = innerHeight;
const now = Date.now(); const D = 864e5;
localStorage.setItem('sr:passport', JSON.stringify({ v: 1, first: now - 6 * D, last: now - 36e5, wonder: null,
  visited: { moon: now - 5 * D, mars: now - 4 * D, 'sat-25544': now - 3 * D, jupiter: now - 2 * D, saturn: now - 72e5 },
  trips: { 'people-in-space': { done: 1, doneAt: now - 5 * D } } }));
out.ready = await until(() => window.__srLayersReady, 150000); out.t.ready = el();
const c = window.spaceRadar;
out.phone = c.shell.isPhone();
await until(() => c.base && c.launchChip, 30000);
await wait(2000);
const small = () => qa('button, a, input, [role=tab]').filter(shown).map((n) => ({ n, r: n.getBoundingClientRect() })).filter(({ n, r }) => (r.height < 43.5 || r.width < 43.5) && r.y < innerHeight && r.bottom > 0 && !n.closest('.sr-card__sentence, .sr-card__inline'))
  .map(({ n, r }) => `${String(n.className).split(/\s+/)[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
const overflow = () => document.scrollingElement.scrollWidth - innerWidth;

await step('welcome', async () => {
  out.sheet0 = c.shell.sheet() && c.shell.sheet().detent();
  await c.welcome.show(); await wait(1200);
  out.welcome = { sheet: c.shell.sheet() && c.shell.sheet().detent(), lines: qa('.sr-welcome__lines li').map((n) => ({ t: n.textContent, ...box(n) })), buttons: qa('.sr-welcome__btn').map((n) => ({ t: n.textContent, ...box(n) })), embers: embers(), overflow: overflow(), small: small() };
  out.shot_welcome = await shot('p1-welcome');
  q('.sr-welcome__look').click(); await wait(400);
  out.welcome.gone = !q('.sr-welcome');
});

await step('base', async () => {
  const iss = c.recordById('sat-25544') || c.recordsFor('stations')[0];
  c.select(iss);
  await until(() => q('.sr-card__name') && !c.cameraRig.state.flying, 20000);
  await wait(2500);
  c.base.refresh(); await wait(300);
  out.base = { shown: shown(q('.sr-rail__btn--base')), box: box('.sr-rail__btn--base'), search: box('.sr-top__search'), tools: box('.sr-top__tools'), topRow: qa('.sr-top__tools button').filter(shown).map((b) => `${b.getAttribute('aria-label')} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`), overflow: overflow() };
  out.shot_base = await shot('p2-base-away');
  q('.sr-rail__btn--base').click();
  await until(() => !c.selected() && !c.cameraRig.state.flying, 12000); await wait(2000);
  out.base.after = { selected: !!c.selected(), hidden: !shown(q('.sr-rail__btn--base')), sheet: c.shell.sheet() && c.shell.sheet().detent(), toast: txt('.sr-toast') };
});

await step('chip', async () => {
  const launches = c.recordsFor('launches').filter((r) => r.meta && Number.isFinite(r.meta.netMs) && r.meta.netMs > Date.now()).sort((a, b) => a.meta.netMs - b.meta.netMs);
  out.chip = { launches: launches.length, shownNow: shown(q('.sr-launchchip')) };
  if (launches[0]) {
    // SIMULATED: the pill's "real present" is moved to two hours before the next launch in the saved list.
    const real = c.timePill.anchor; const fake = launches[0].meta.netMs - 2 * 3600e3 - 7000; const at = Date.now();
    c.timePill.anchor = () => fake + (Date.now() - at);
    c.launchChip.refresh(); await wait(1300);
    out.chip.simulated = { text: txt('.sr-launchchip__clock'), box: box('.sr-launchchip'), parent: q('.sr-launchchip').parentNode.className, line: box('.sr-top__line'), liveline: shown(q('.sr-liveline')), pill: shown(q('#sr-time')), overflow: overflow(), small: small() };
    out.shot_chip = await shot('p3-chip');
    c.timePill.anchor = real; c.launchChip.refresh(); await wait(300);
  }
});

await step('scale', async () => {
  c.explore.setTab('planets');
  await until(() => c.stage.worldId === 'sun' && q('.sr-scalebadge') && !q('.sr-scalebadge').hidden, 15000);
  await wait(3000);
  out.scale = { text: txt('.sr-scalebadge'), box: box('.sr-scalebadge'), top: box('.sr-top__row') || box('#sr-top'), overflow: overflow(), small: small(), baseShown: shown(q('.sr-rail__btn--base')) };
  out.shot_scale = await shot('p4-scale');
  q('.sr-scalebadge').click(); await wait(900);
  out.scaleTrue = { text: txt('.sr-scalebadge'), box: box('.sr-scalebadge'), dots: c.orbitRings.group.getObjectByName('orbit-dots').visible };
  out.shot_true = await shot('p5-true-size');
  c.returnToBase(); await until(() => c.stage.worldId === 'earth' && !c.cameraRig.state.flying, 15000); await wait(1500);
});

await step('trip', async () => {
  c.trip.start('strangest-things');
  await until(() => c.trip.state.phase === 'intro', 30000);
  const n = c.trip.state.count;
  c.trip.play();
  await until(() => c.trip.state.phase !== 'intro' && q('.sr-trip__top') && !q('.sr-trip__top').hidden, 20000);
  await wait(4000);
  out.tripTop = { bar: box('.sr-trip__top'), title: box('.sr-trip__title'), buttons: qa('.sr-trip__top button').map((b) => ({ label: b.getAttribute('aria-label') || b.textContent.trim(), ...box(b) })), overflow: overflow(), small: small() };
  out.shot_trip = await shot('p6-trip-top');
  c.trip.jumpTo(n - 1);
  await until(() => c.trip.state.index === n - 1, 15000); await wait(2500);
  c.trip.next();
  out.outro = await until(() => c.trip.state.phase === 'outro', 15000);
  if (!out.outro) { c.trip.next(); out.outro = await until(() => c.trip.state.phase === 'outro', 15000); }
  await until(() => q('.sr-tripsheet__seen') && !q('.sr-tripsheet__seen').hidden, 8000);
  out.end = { stamp: txt('.sr-tripsheet__stamp'), seen: txt('.sr-tripsheet__seen'), seenBox: box('.sr-tripsheet__seen'), embers: embers(), overflow: overflow() };
  out.shot_end = await shot('p7-end-card');
  c.trip.stop('left'); await wait(800);
});
out.t.end = el();
return out;
