// otherlight-blink: the sky in other light with two lights on one slider (forge #565). From Santiago at local midnight
// in July the Galactic centre is near the zenith: near infrared (2MASS) is drawn over mid infrared (WISE) at half, then
// What to show is opened at its Other light rows (the From row and Blink). Run after the prelude:
// `cat _prelude.js otherlight-blink.js > /tmp/p.js; node tools/cdp.mjs <url> /tmp/p.js --shot-dir=<dir>` (and --mobile
// --width=390 --height=844). It fails only if the panel does not show the From row and Blink once a band is chosen.
look.probe = 'otherlight-blink';
const out = { problems: [] };
const DEG = Math.PI / 180;
const visible = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && e.getClientRects().length > 0; };
try {
  const away = document.querySelector('[data-entrance="explore"]') || document.querySelector('.sr-welcome .ui-btn, .sr-welcome button');
  if (away) away.click();
  await sleep(1500);
  sr.setObserver({ name: 'Santiago', country: 'Chile', latDeg: -33.45, lonDeg: -70.67, latRad: -33.45 * DEG, lonRad: -70.67 * DEG, altKm: 0.57, source: 'city' });
  sr.clock.goTo(Date.UTC(2026, 6, 15, 4, 0, 0));
  sr.clock.setPaused(true);
  sr.skyView.enter(sr.skyView.observer || { latRad: -33.45 * DEG, lonRad: -70.67 * DEG, altKm: 0.57 });
  await sleep(9000);
  sr.skyView.lookAtDeg(220, 55);
  sr.otherLight.set('nearinfrared', 0.5, 'infrared');
  await until(() => { const s = sr.skyView.groundOtherLight && sr.skyView.groundOtherLight(); return s && s.drawn && s.underDrawn; }, 60000, 500);
  out.ground = sr.skyView.groundOtherLight ? sr.skyView.groundOtherLight() : null;
  await shot('ir-sky', 'Santiago, 15 Jul 2026 04:00 UTC, looking SW 55 degrees up: near infrared (2MASS) half over mid infrared (WISE)', 4000);
  if (sr.rail && sr.rail.openShow) sr.rail.openShow();
  await until(() => visible('.sr-otherlight'), 20000);
  const panel = document.querySelector('.sr-otherlight');
  if (panel) panel.scrollIntoView({ block: 'center' });
  await sleep(1500);
  out.fromRow = !!panel && [...panel.querySelectorAll('[data-under]')].some((b) => b.getAttribute('aria-pressed') === 'true' && b.dataset.under === 'infrared');
  out.blink = !!panel && [...panel.querySelectorAll('.ui-btn')].some((b) => b.getClientRects().length > 0);
  out.note = panel ? (panel.querySelector('.sr-density__note') || {}).textContent : null;
  if (!out.fromRow) out.problems.push('the From row does not show Mid infrared pressed');
  if (!out.blink) out.problems.push('no Blink button in view');
  await shot('ir-panel', 'What to show at Other light: Near infrared on top, From Mid infrared, the slider at half and Blink', 1500);
} catch (e) {
  look.errors.push('probe threw: ' + (e && e.stack || e));
}
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
