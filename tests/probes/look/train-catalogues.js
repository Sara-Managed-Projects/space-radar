// train-catalogues: the research train "catalogues" (forge #551, #553, #560, #564), one walk with a picture of each new place:
// the doors on the Earth and Tonight tabs; the launch archive's table, a filter, a fly-to and the replay; the sky calendar's
// month and a chip; the eclipse checker for Luxor and London; the near-Earth asteroids, a filter, Bennu with its orbit and the
// numbered asteroids' points; the exoplanet explorer's default plot, the habitable zone, a method hidden and a dot chosen.
// Run after the prelude: `cat _prelude.js train-catalogues.js > p.js; node tools/cdp.mjs '<url>/?look=1' p.js --shot-dir=<dir>
// --block=celestrak.org [--mobile --width=390 --height=844]`, or the look workflow with probe=train-catalogues.
look.probe = 'train-catalogues';
const out = { took: [], seen: {}, counts: {} };
const settle = (ms = 1500) => sleep(ms);
const q = (sel) => document.querySelector(sel);
const visible = (sel) => { const e = q(sel); return !!e && !e.hidden && e.getClientRects().length > 0; };
const snap = async (name, note = '') => { await shot(name, note); out.took.push(name); };
const into = (sel, block = 'start') => { const e = q(sel); if (e) e.scrollIntoView({ block }); return !!e; };
const pane = (which) => `.sr-cat__pane[data-cat="${which}"]`;
const text = (sel) => ((q(sel) || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
const chip = (scope, label) => [...document.querySelectorAll(`${scope} .ui-chip`)].find((b) => b.textContent.trim() === label || b.dataset.id === label);
const open = async (which, arg = '') => {
  const c = await sr.wantCatalogue();
  if (!c) return false;
  await c.open(which, { arg, focus: false });
  return until(() => visible(pane(which)) && !q(`${pane(which)} .sr-cat__wait`), 60000);
};

// a first visit's welcome, out of the way
const away = q('[data-entrance="explore"]') || q('.sr-welcome .ui-btn, .sr-welcome button');
if (away) away.click();
await settle(1500);

// 0. the doors: the Earth tab's Catalogues section (it comes after the first visit has settled)
out.seen.doors = await until(() => visible('.sr-catentry [data-cat="launches"]'), 60000);
into('.sr-catentry', 'center');
await settle(800);
await snap('doors-earth', 'the Earth tab: Catalogues, Every launch since 1957');

// 1. the launch archive
out.seen.launches = await open('launches');
await settle(2500);
out.counts.launches = text('.sr-cat__count');
await snap('launches-table', out.counts.launches);
const fail = chip(pane('launches'), 'Failure') || chip(pane('launches'), 'F');
if (fail) fail.click();
const when = q('#sr-launches-when');
if (when) { when.value = '1960s'; when.dispatchEvent(new Event('change', { bubbles: true })); }
await settle(1500);
out.counts.launchesFiltered = text('.sr-cat__count');
await snap('launches-filtered', out.counts.launchesFiltered);
if (fail) fail.click();
const firstRow = q(`${pane("launches")} .sr-cat__table .sr-find__go`);
if (firstRow) { firstRow.click(); await settle(9000); await snap('launches-flyto', text(`${pane('launches')} .sr-cat__lead`)); }
const all = chip(pane('launches'), 'All');
if (all) all.click();
if (when) { when.value = ''; when.dispatchEvent(new Event('change', { bubbles: true })); }
const slider = q('.sr-launches__year');
if (slider) { slider.value = '2019'; slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true })); }
await settle(1500);
into(pane('launches'));
const play = q('.sr-launches__play');
out.seen.replay = !!play;
if (play) { play.click(); await settle(6000); await snap('launches-replay', 'Replay, six seconds in'); play.click(); }

// 2. the sky calendar: August 2027 and the Eclipses chip
out.seen.calendar = await open('calendar', '2027-08');
await settle(2000);
out.counts.calendar = document.querySelectorAll('.sr-cal__row').length;
await snap('calendar-month', `${out.counts.calendar} rows in August 2027`);
const ecl = q(`${pane('calendar')} .ui-chip[data-id="eclipses"]`);
if (ecl) { ecl.click(); await settle(1200); await snap('calendar-eclipses', 'the Eclipses chip, its feed the ember button'); }

// 3. the eclipse checker: Luxor (total) and London (partial)
out.seen.eclipse = await open('eclipse', 'Luxor');
await settle(2500);
out.eclipseLuxor = text('.sr-ecl__head');
await snap('eclipse-luxor', out.eclipseLuxor);
await open('eclipse', 'London');
await settle(2500);
out.eclipseLondon = text('.sr-ecl__head');
await snap('eclipse-london', out.eclipseLondon);

// 4. the near-Earth asteroids
out.seen.asteroids = await open('asteroids');
await settle(2500);
out.counts.asteroids = text(`${pane('asteroids')} .sr-cat__count`);
await snap('asteroids-table', out.counts.asteroids);
const firstFilter = q(`${pane('asteroids')} .sr-cat__filter`);
const haz = firstFilter && [...firstFilter.querySelectorAll('.ui-chip')][1];
if (haz) { haz.click(); await settle(1200); out.counts.asteroidsFiltered = text(`${pane('asteroids')} .sr-cat__count`); await snap('asteroids-filtered', out.counts.asteroidsFiltered); haz.click(); }
await open('asteroids', '101955');
await settle(12000);
await snap('asteroids-bennu', 'Bennu chosen: its card and orbit');
await open('asteroids');
const cloud = q('.sr-neo__cloud .ui-check');
out.seen.cloud = !!cloud;
if (cloud) {
  cloud.click();
  await until(() => /\d/.test(text('.sr-neo__cloud')), 60000);
  await settle(3000);
  out.cloudLine = text('.sr-neo__cloud');
  into('.sr-neo__cloud', 'center');
  await snap('asteroids-cloud', out.cloudLine);
  cloud.click();
}

// 5. the exoplanet explorer
out.seen.exoplanets = await open('exoplanets');
await settle(3000);
into('.sr-exo__canvas', 'center');
await settle(500);
out.counts.exo = text(`${pane('exoplanets')} .sr-exo__count`) || text(`${pane('exoplanets')} .sr-cat__count`);
await snap('exoplanets-default', out.counts.exo);
const hz = [...document.querySelectorAll(`${pane('exoplanets')} .ui-chip`)].find((b) => /habitable/i.test(b.textContent));
if (hz) { hz.click(); await settle(2000); into('.sr-exo__canvas', 'center'); await settle(500); await snap('exoplanets-hz', 'starlight against star temperature, the habitable zone shaded'); }
const transit = [...document.querySelectorAll(`${pane('exoplanets')} .ui-chip`)].find((b) => /^transit$/i.test(b.textContent.trim()));
if (transit) { transit.click(); await settle(1500); into('.sr-exo__canvas', 'center'); await snap('exoplanets-hidden', 'Transit hidden'); transit.click(); }
const canvas = q('.sr-exo__canvas');
if (canvas) {
  canvas.focus();
  for (let i = 0; i < 3; i++) canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle(1000);
  await snap('exoplanets-dot', text('.sr-exo__readout'));
}

out.catalogue = sr.catalogue ? sr.catalogue.current() : null;
return finish(out);
