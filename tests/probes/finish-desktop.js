// tests/probes/finish-desktop.js -- the finishers, walked at 1440 x 900 (2026-10-08).
//
//   cat tests/probes/finish-common.js tests/probes/finish-desktop.js > /tmp/finish-desktop.run.js
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0' /tmp/finish-desktop.run.js --width=1440 --height=900 \
//     --gl=gpu --net=4g --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//
// What it walks, and what it returns for each: the first visit's lines and buttons (#241, #287);
// `?` and the layer list's one tab stop, with real keys (#315); the scale badge and True size on the
// Planets tab (#296); Return to base (#241); the launch chip with the real present moved to two
// hours before the next launch in the saved list (#289: SIMULATED, said so in the result);
// Andromeda with her two companions (#385); a trip's top bar and its end card (#241, #240).
out.vw = innerWidth; out.vh = innerHeight;
out.ready = await until(() => window.__srLayersReady, 150000); out.t.ready = el();
const c = window.spaceRadar;
await until(() => c && c.base && c.launchChip, 30000);
await wait(1500);

await step('welcome', async () => {
  out.webdriver = navigator.webdriver;
  out.welcomeAuto = !!q('.sr-welcome');
  await c.welcome.show(); await wait(700);
  out.welcome = {
    lines: qa('.sr-welcome__lines li').map((n) => ({ t: n.textContent, ...box(n) })),
    buttons: qa('.sr-welcome__btn').map((n) => ({ t: n.textContent, ...box(n) })),
    embers: embers(), firstInPane: q('#sr-pane-earth').firstElementChild.className,
  };
  out.shot_welcome = await shot('d1-welcome');
});

await step('keys', async () => {
  // From the top of the page: how many Tabs to the search field.
  document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const order = [];
  for (let i = 0; i < 4; i++) { await key('Tab'); order.push(focusName()); }
  out.tabOrder = order;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  await key('?');
  await until(() => q('.sr-keyhint') && !q('.sr-keyhint').hidden, 6000);
  await wait(900);
  out.keys = { open: !!(q('.sr-keyhint') && !q('.sr-keyhint').hidden), all: q('.sr-keyhint') && q('.sr-keyhint').classList.contains('is-all'), box: box('.sr-keyhint'),
    trip: shown(q('.sr-keyhint__trip')), rows: qa('.sr-keyhint__item').filter(shown).map((n) => n.textContent.trim()) };
  out.shot_keys = await shot('d2-keys');
  await wait(13000); // it was asked for: it must still be there after the first-visit hint's twelve seconds
  out.keys.stays = !!(q('.sr-keyhint') && !q('.sr-keyhint').hidden);
  await key('?'); await wait(400);
  out.keys.closedByKey = !!(q('.sr-keyhint') && (q('.sr-keyhint').hidden || q('.sr-keyhint').classList.contains('is-leaving')));
});

await step('layers', async () => {
  await key('l');
  await until(() => q('#sr-show') && !q('#sr-show').hidden && q('.sr-show__list'), 8000);
  await wait(500);
  const items = () => qa('.sr-show__list .sr-show__head, .sr-show__list .sr-show__bulkbtn, .sr-show__list .sr-show__box');
  out.layers = { items: items().length, tabbable: items().filter((n) => n.tabIndex === 0).length, focus0: focusName(), role: q('.sr-show__list').getAttribute('role'), label: q('.sr-show__list').getAttribute('aria-label') };
  const walk = [];
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'Home', 'ArrowRight']) { await key(k); walk.push(`${k}: ${focusName()} ${document.activeElement.getAttribute('aria-expanded') || document.activeElement.getAttribute('aria-label') || (document.activeElement.closest('label') || {}).textContent || ''}`.slice(0, 90)); }
  out.layers.walk = walk;
  out.layers.tabbableAfter = items().filter((n) => n.tabIndex === 0).length;
  await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown');
  out.layers.ring = getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth;
  out.shot_layers = await shot('d3-layers');
  await key('Tab');
  out.layers.afterTab = focusName();
  out.layers.leftList = !q('.sr-show__list').contains(document.activeElement);
  await key('Escape'); await wait(300);
});

await step('scale', async () => {
  c.explore.setTab('planets');
  await until(() => c.stage.worldId === 'sun', 10000);
  await until(() => q('.sr-scalebadge') && !q('.sr-scalebadge').hidden, 12000);
  await wait(2500);
  const dots = c.orbitRings.group.getObjectByName('orbit-dots');
  out.scale = { text: txt('.sr-scalebadge'), title: q('.sr-scalebadge') && q('.sr-scalebadge').title, box: box('.sr-scalebadge'), dots: dots.visible, dotPx: dots.material.size, camKm: c.camera.position.length() * c.stage.unitKm };
  out.shot_scale = await shot('d4-scale');
  q('.sr-scalebadge').click(); await wait(900);
  out.scaleTrue = { text: txt('.sr-scalebadge'), pressed: q('.sr-scalebadge').getAttribute('aria-pressed'), dots: dots.visible, rings: c.orbitRings.group.visible, box: box('.sr-scalebadge') };
  out.shot_true = await shot('d5-true-size');
  // A planet selected: the badge speaks for it.
  q('.sr-scalebadge').click(); await wait(600);
  c.select(c.recordById('jupiter'), { fly: false }); await wait(1200);
  out.scaleSelected = txt('.sr-scalebadge');
  c.deselect(); await wait(300);
});

await step('base', async () => {
  const b = q('.sr-rail__btn--base');
  out.base = { there: !!b, shownAway: shown(b), box: box(b), label: b && b.getAttribute('aria-label'), stage: c.stage.worldId };
  out.shot_base = await shot('d6-base-away');
  b.click();
  await until(() => c.stage.worldId === 'earth' && !c.cameraRig.state.flying, 12000);
  await wait(2500);
  out.base.after = { stage: c.stage.worldId, selected: !!c.selected(), live: c.clock.mode, hidden: !shown(q('.sr-rail__btn--base')), toast: txt('.sr-toast'), badgeGone: !shown(q('.sr-scalebadge')), dist: c.cameraRig.state.distance, home: c.homeDistance() };
  out.shot_home = await shot('d7-home-again');
});

await step('chip', async () => {
  const launches = c.recordsFor('launches').filter((r) => r.meta && Number.isFinite(r.meta.netMs) && r.meta.netMs > Date.now()).sort((a, b) => a.meta.netMs - b.meta.netMs);
  out.chip = { launches: launches.length, next: launches[0] && { name: launches[0].name, net: new Date(launches[0].meta.netMs).toISOString(), status: launches[0].meta.statusAbbrev }, shownNow: shown(q('.sr-launchchip')) };
  if (launches[0]) {
    // SIMULATED: the pill's "real present" is moved to two hours before that launch, for the picture.
    const real = c.timePill.anchor;
    const fake = launches[0].meta.netMs - 2 * 3600e3 - 7000;
    c.timePill.anchor = () => fake + (Date.now() - T0 * 1);
    c.launchChip.refresh(); await wait(1300);
    out.chip.simulated = { text: txt('.sr-launchchip__clock'), title: q('.sr-launchchip').title, box: box('.sr-launchchip'), parent: q('.sr-launchchip').parentNode.className, wordmark: box('.sr-wordmark'), collapse: box('.sr-explore__collapse') };
    out.shot_chip = await shot('d8-chip');
    q('.sr-launchchip').click(); await wait(2500);
    out.chip.opened = { selected: c.selected() && c.selected().id, isIt: c.selected() === launches[0], cardCount: txt('.sr-card__count') };
    c.timePill.anchor = real; c.launchChip.refresh();
    c.deselect(); await wait(500);
  }
});
out.t.end = el();
return out;
