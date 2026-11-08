// f3-stars-sky.js -- release 2.0.0 batch f3-stars (forge #141, #142): pasted after tests/probes/sky3-common.js.
//   cat tests/probes/sky3-common.js tests/probes/f3-stars-sky.js > /tmp/f3.js
//   render.sh 'http://localhost:8465/?sw=0' /tmp/f3.js --width=1440 --height=900 --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//   (and --width=390 --height=844 --mobile for the phone)
// v1: Orion from London on 2020-02-15, Betelgeuse in its Great Dimming; v2 the same a year later.
// m1/m2: the Plough now and in AD 50 000; m3: the pole in AD 13 700 (Vega); m4: the deep-time row and its readout.
const london = place('London', 51.507, -0.128);
await stand(london);
ctx.clock.setRate(1);
const at = (y, mo, d, h) => { const t = new Date(0); t.setUTCFullYear(y, mo, d); t.setUTCHours(h, 0, 0, 0); return t.getTime(); };
const vstats = () => { const g = ctx.skyView.groundStats() || {}; return { variables: g.variables, epoch: g.epoch }; };
ctx.clock.goTo(at(2020, 1, 15, 20));
ctx.skyView.pointAt({ raDeg: 84, decDeg: 2 }, { fovDeg: 50, instant: true, mark: false });
await wait(4000);
await shot('v1-orion-2020-02-15'); out.v1 = vstats();
ctx.clock.goTo(at(2021, 1, 15, 20));
await wait(1500);
await shot('v2-orion-2021-02-15'); out.v2 = vstats();
ctx.clock.goTo(at(2026, 10, 8, 1));
ctx.skyView.pointAt({ raDeg: 178, decDeg: 56 }, { fovDeg: 60, instant: true, mark: false });
await wait(2500);
await shot('m1-plough-2026'); out.m1 = vstats();
ctx.clock.goTo(at(50000, 10, 8, 1));
const w = Date.now(); while (!((ctx.skyView.groundStats() || {}).epoch) && Date.now() - w < 20000) await wait(300);
await wait(1500);
ctx.skyView.pointAt({ raDeg: 178, decDeg: 56 }, { fovDeg: 60, instant: true, mark: false });
await shot('m2-plough-50000'); out.m2 = vstats();
ctx.clock.goTo(at(13700, 10, 8, 1));
await wait(2500);
ctx.skyView.lookAtDeg(0, 51.5);
await shot('m3-pole-13700'); out.m3 = vstats();
const tab = document.querySelector('[data-tab="tonight"][role="tab"]');
if (tab) tab.click();
const w2 = Date.now(); while (!document.querySelector('.sr-skybar') && Date.now() - w2 < 15000) await wait(300);
try { if (ctx.shell && ctx.shell.sheet && ctx.shell.sheet()) ctx.shell.sheet().set('full'); } catch { /* no sheet on a desktop */ }
await wait(2000);
const row = [...document.querySelectorAll('.sr-skybar [role="group"]')].find((g) => g.getAttribute('aria-label') === 'Deep time');
if (row) row.scrollIntoView({ block: 'center' });
await wait(1500);
out.deepRow = row ? row.parentNode.innerText.split('\n').filter((l) => /pole|sky of|Deep|years|BC|AD/.test(l)).slice(0, 12) : null;
await shot('m4-deep-time-row');
out.overflow = document.documentElement.scrollWidth > innerWidth;
return out;
