// tests/probes/axe-probe.js -- axe-core over the app's main states (public #315, 2026-10-08).
//
// axe is loaded HERE, inside the probe, from the copy vendored under tests/vendor/ (axe-core 4.10.3,
// MPL-2.0, Deque Systems; CREDITS.md). It is never shipped with the site and never fetched from
// anybody's server at run time:
//
//   cat tests/vendor/axe.min.js tests/probes/finish-common.js tests/probes/axe-probe.js > /tmp/axe.run.js
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0' /tmp/axe.run.js --width=1440 --height=900 --gl=gpu \
//     --net=4g --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//   (add --mobile --width=390 --height=844 for the phone)
//
// It returns, per state, the violations by rule with their nodes, and the rules axe could not
// decide ("incomplete": for this app mostly colour contrast over the scene's canvas and blurred
// glass, which axe cannot sample; tests/test_tokens.mjs computes those pairs instead).
// WCAG 2.0, 2.1 and 2.2 at A and AA, plus axe's best practices.
out.vw = innerWidth; out.vh = innerHeight;
out.axeVersion = window.axe && window.axe.version;
out.axe = {};
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const scan = async (name) => {
  log('axe ' + name);
  try {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: TAGS }, resultTypes: ['violations', 'incomplete'] });
    out.axe[name] = {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help,
        nodes: v.nodes.slice(0, 8).map((n) => ({ target: n.target.join(' '), why: String(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220) })) })),
      incomplete: r.incomplete.map((v) => ({ id: v.id, n: v.nodes.length })),
      passes: r.passes.length,
    };
  } catch (e) { out.axe[name] = { error: String(e).slice(0, 300) }; }
  out.t['axe_' + name] = el();
};
out.ready = await until(() => window.__srLayersReady, 150000); out.t.ready = el();
const c = window.spaceRadar;
const phone = c.shell.isPhone();
out.phone = phone;
await until(() => c.base && c.launchChip, 30000);
await wait(2500);
if (phone && c.shell.sheet()) { c.shell.sheet().set('half'); await wait(900); }

await step('home', async () => { await scan('home'); });
await step('welcome', async () => { await c.welcome.show(); await wait(600); if (phone && c.shell.sheet()) { c.shell.sheet().set('half'); await wait(700); } await scan('home-welcome'); out.shot_w = await shot('x1-welcome'); q('.sr-welcome__look').click(); await wait(300); });
await step('card', async () => {
  const iss = c.recordById('sat-25544') || c.recordsFor('stations')[0];
  out.cardOf = iss && iss.id;
  c.select(iss);
  await until(() => q('.sr-card__name') && !c.cameraRig.state.flying, 20000);
  await wait(3000);
  await scan('card');
  out.shot_card = await shot('x2-card');
  c.deselect(); await wait(800);
});
await step('layers', async () => {
  c.rail.openShow();
  await until(() => q('.sr-show__list'), 8000); await wait(700);
  await scan('what-to-show');
  c.rail.closeShow(); await wait(300);
});
if (!phone) {
  await step('keys', async () => { await c.keyhint.show({ all: true }); await wait(900); await scan('all-keys'); c.keyhint.hide(); await wait(300); });
}
await step('planets', async () => {
  c.explore.setTab('planets');
  await until(() => c.stage.worldId === 'sun' && q('.sr-scalebadge') && !q('.sr-scalebadge').hidden, 15000);
  await wait(2500);
  if (phone && c.shell.sheet()) { c.shell.sheet().set('half'); await wait(700); }
  await scan('planets');
  out.shot_planets = await shot('x3-planets');
  c.returnToBase(); await until(() => c.stage.worldId === 'earth' && !c.cameraRig.state.flying, 15000); await wait(1500);
});
await step('sources', async () => { c.shell.openSources(); await wait(1500); await scan('sources'); c.shell.back(); await wait(500); });
await step('trip', async () => {
  c.trip.start('strangest-things');
  await until(() => c.trip.state.phase === 'intro', 30000); await wait(1200);
  await scan('trip-intro');
  c.trip.play();
  await until(() => c.trip.state.phase !== 'intro' && q('.sr-trip__top') && !q('.sr-trip__top').hidden, 20000);
  await wait(4500);
  await scan('trip-stop');
  out.shot_trip = await shot('x4-trip');
  c.trip.stop('left'); await wait(800);
});
// The same result, folded: every rule that failed anywhere, with the states it failed in.
const byRule = {};
for (const [state, r] of Object.entries(out.axe)) for (const v of r.violations || []) { (byRule[v.id] ||= { impact: v.impact, help: v.help, states: {} }).states[state] = v.n; }
out.byRule = byRule;
out.t.end = el();
return out;
