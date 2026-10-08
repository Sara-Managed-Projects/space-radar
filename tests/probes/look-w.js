// look-w.js -- Saturn from its lit face, edge-on from both faces and backlit; Neptune; Mercury at
// the terminator. After look-common.js; look-a.js or look-b.js may follow it.
const TW = Date.parse('2026-10-07T12:00:00Z');
ctx.clock.goTo(TW); ctx.clock.setRate(1);
if (await goTo('saturn')) {
  standAt('saturn', 25, 22); await shot('saturn-lit');
  standAt('saturn', 40, 1.2); await shot('saturn-edge-on');
  standAt('saturn', 40, -1.2); await shot('saturn-edge-on-unlit');
  standAt('saturn', 140, 8); await shot('saturn-backlit');
}
if (await goTo('neptune')) await shot('neptune-arrival');
if (await goTo('venus')) {
  standAt('venus', 75); await shot('venus-phase-75');
  standAt('venus', 120); await shot('venus-phase-120');
  standAt('venus', 150); await shot('venus-phase-150');
}
if (await goTo('mercury')) {
  standAt('mercury', 80, 10, 0.42); await shot('mercury-phase-80', 2500);
  out.mercury = { hasMap: ctx.worlds.hasMap('mercury'), relief: ctx.worlds.hasRelief ? ctx.worlds.hasRelief('mercury') : null };
  standAt('mercury', 60, 25, 2.4); await shot('mercury-whole', 2000);
}
