// tests/test_overlays.mjs -- Earth data overlays: which day's picture is asked for, the address,
// the sentence under it, and the trip shutter that is never stored.
//
//   node tests/test_overlays.mjs
//
// What it holds (registry/overlays.yaml -> data/overlays.js, data/overlaytime.js,
// ui/overlaylegend.js, scene/exposure.js):
//   1. THE DATE RULES: a daily layer asks for the day `lag_days` back in UTC and steps back a day
//      at a time; a monthly one asks for the first of the month `lag_months` back, across a year's
//      end; an unknown rule asks for nothing.
//   2. THE ADDRESS is one WMS GetMap of the whole globe from the registry's host, transparent,
//      with the layer and the date as written, and half the size when asked.
//   3. THE REGISTRY as the browser gets it: every row has a legend, a class and a credit, and
//      every `overlay:` a trip stop names is a row.
//   4. THE SENTENCE says what the colours are, the day, how it was made and whose data, and says
//      "loading" or "did not arrive" instead when that is the truth.
//   5. NOTHING AT BOOT: no module main.js imports statically reaches the overlay or figure code.
//   6. THE SHUTTER: a trip's hold changes the mode and is never written to storage; release puts
//      the visitor's own back; a choice made while it is held is kept for after.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { OVERLAYS, OVERLAY_SERVICE } = await import(join(JS, 'data/overlays.js'));
const { overlayDates, overlayUrl, dateInWords, overlayById } = await import(join(JS, 'data/overlaytime.js'));
const { overlayLine } = await import(join(JS, 'ui/overlaylegend.js'));
const { createExposure, EXPOSURE_KEY } = await import(join(JS, 'scene/exposure.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const eq = (a, b, msg) => check(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)}`);

// ---------------------------------------------------------------- 1. the date rules
const NOON = Date.parse('2026-10-05T12:00:00Z');
eq(overlayDates({ rule: 'daily', lag_days: 2, tries: 3 }, NOON), ['2026-10-03', '2026-10-02', '2026-10-01', '2026-09-30'], 'daily, two days back, three more tries');
eq(overlayDates({ rule: 'daily', lag_days: 2, tries: 0 }, Date.parse('2026-10-05T00:00:01Z')), ['2026-10-03'], 'a second after midnight UTC is still the 5th');
eq(overlayDates({ rule: 'daily', lag_days: 2, tries: 0 }, Date.parse('2026-10-04T23:59:59Z')), ['2026-10-02'], 'a second before it is the 4th');
eq(overlayDates({ rule: 'daily', lag_days: 1, tries: 1 }, Date.parse('2027-01-01T06:00:00Z')), ['2026-12-31', '2026-12-30'], 'daily across a year\'s end');
eq(overlayDates({ rule: 'monthly', lag_months: 4, tries: 3 }, NOON), ['2026-06-01', '2026-05-01', '2026-04-01', '2026-03-01'], 'monthly, four months back');
eq(overlayDates({ rule: 'monthly', lag_months: 4, tries: 2 }, Date.parse('2027-02-10T00:00:00Z')), ['2026-10-01', '2026-09-01', '2026-08-01'], 'monthly across a year\'s end');
eq(overlayDates({ rule: 'monthly', lag_months: 1, tries: 0 }, Date.parse('2027-01-31T23:00:00Z')), ['2026-12-01'], 'January\'s last month is December');
eq(overlayDates({ rule: 'weekly' }, NOON), [], 'an unknown rule asks for nothing');
eq(overlayDates(null, NOON), [], 'no rule asks for nothing');
eq(overlayDates({ rule: 'daily', lag_days: 2 }, NaN), [], 'no clock asks for nothing');
check(overlayDates({ rule: 'daily', lag_days: 2, tries: 99 }, NOON).length === 7, 'tries is capped at six steps back');
check(dateInWords('2026-10-03', { rule: 'daily' }) === '3 October 2026', `a day in words: ${dateInWords('2026-10-03', { rule: 'daily' })}`);
check(dateInWords('2026-06-01', { rule: 'monthly' }) === 'June 2026', `a month in words: ${dateInWords('2026-06-01', { rule: 'monthly' })}`);
check(dateInWords('soon', { rule: 'daily' }) === '' && dateInWords('2026-13-01', { rule: 'daily' }) === '', 'a date that is not one prints nothing');

// ---------------------------------------------------------------- 2. the address
const sst = overlayById(OVERLAYS, 'sea-temperature');
check(!!sst, 'the registry has no sea-temperature row');
const url = overlayUrl(OVERLAY_SERVICE, sst, '2026-10-03');
check(url.startsWith('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'), `the address is not GIBS's WMS: ${url}`);
for (const part of ['REQUEST=GetMap', `LAYERS=${sst.layer}`, 'CRS=EPSG:4326', 'BBOX=-90,-180,90,180', 'WIDTH=2048', 'HEIGHT=1024', 'FORMAT=image/png', 'TRANSPARENT=TRUE', 'TIME=2026-10-03']) {
  check(url.includes(part), `the address lacks ${part}`);
}
const half = overlayUrl(OVERLAY_SERVICE, sst, '2026-10-03', 0.5);
check(half.includes('WIDTH=1024') && half.includes('HEIGHT=512'), 'a connection that saves data asks for half the picture');
check(!/[?&](email|user|lat|lon|id)=/i.test(url), 'the address carries nothing about the visitor');
check(overlayById(OVERLAYS, 'no-such') === null && overlayById(null, 'x') === null, 'an id the registry lacks is null');

// ---------------------------------------------------------------- 3. the registry, as shipped
check(OVERLAYS.length >= 6, `${OVERLAYS.length} overlays; the brief asked for temperature, plankton, ice and pollution at least`);
check(OVERLAY_SERVICE.blank_bytes > 8221 && OVERLAY_SERVICE.blank_bytes < 93752, 'blank_bytes must sit between the measured empty picture (8 221) and the smallest real one (93 752)');
const ids = new Set();
for (const o of OVERLAYS) {
  check(!ids.has(o.id), `${o.id} twice`);
  ids.add(o.id);
  check(o.world === 'earth', `${o.id}: world ${o.world}`);
  check(['measured', 'analysed', 'modelled'].includes(o.class) && COPY.overlay.made[o.class], `${o.id}: class ${o.class} has no sentence`);
  check(o.legend && o.legend.stops.length >= 2 && o.legend.stops.every((c) => /^#[0-9a-f]{6}$/i.test(c)), `${o.id}: legend stops`);
  check(String(o.legend.low) !== '' && String(o.legend.high) !== '' && o.legend.unit, `${o.id}: the legend has no numbers`);
  check(overlayDates(o.date, NOON).length >= 1, `${o.id}: its date rule asks for no picture`);
  check(o.bytes === undefined && o.colormap === undefined, `${o.id}: the reviewer's fields reached the browser`);
  check(o.credit && /NASA/.test(o.credit), `${o.id}: the credit does not name who made the data`);
}
let used = 0;
for (const tour of TOURS) for (const stop of tour.stops) {
  if (!stop.overlay) continue;
  used++;
  check(ids.has(stop.overlay), `${tour.id}/${stop.id} asks for overlay ${stop.overlay}, which is not a row`);
  check(stop.target && stop.target.world === 'earth', `${tour.id}/${stop.id}: an overlay on a stop that is not about the Earth`);
}
check(used >= 4, `${used} stops use an overlay; the living Earth has four`);

// ---------------------------------------------------------------- 4. the sentence
const shown = { id: sst.id, status: 'shown', title: sst.title, what: sst.what, cls: sst.class, legend: sst.legend, credit: sst.credit, rule: 'daily', date: '2026-10-03', dateWords: '3 October 2026' };
const line = overlayLine(shown);
for (const part of [sst.what, '3 October 2026', 'gaps filled in', sst.credit, 'NASA GIBS', 'not a photograph']) check(line.includes(part), `the sentence lacks "${part}": ${line}`);
check(!/\s{2,}/.test(line) && !/ -- /.test(line), 'the sentence has doubled spaces or a typed dash');
check(overlayLine({ ...shown, rule: 'monthly', dateWords: 'June 2026' }).includes('the mean of June 2026'), 'a monthly picture says it is a mean');
check(overlayLine({ id: 'x', status: 'loading' }) === COPY.overlay.loading, 'while the picture is on its way the line says so');
check(overlayLine({ id: 'x', status: 'failed' }) === COPY.overlay.failed, 'a picture that did not arrive is said, not hidden');
check(overlayLine(null) === '' && overlayLine({ id: null, status: 'off' }) === '', 'no overlay, no sentence');

// ---------------------------------------------------------------- 5. nothing at boot
const seen = new Set();
const walk = (file) => {
  if (seen.has(file)) return;
  seen.add(file);
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { return; }
  // Static imports only: `import x from '...'` and `export ... from '...'`, never `import('...')`.
  for (const m of src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s*['"](\.[^'"]+)['"]/gm)) walk(join(dirname(file), m[1]));
  for (const m of src.matchAll(/^\s*import\s*['"](\.[^'"]+)['"]/gm)) walk(join(dirname(file), m[1]));
};
walk(join(JS, 'main.js'));
for (const lazy of ['scene/earthoverlay.js', 'scene/figures3d.js', 'sky/figures.js', 'data/overlays.js', 'data/overlaytime.js', 'ui/overlaypanel.js', 'ui/overlaylegend.js']) {
  check(!seen.has(join(JS, lazy)), `${lazy} is in the boot graph; it must arrive by a dynamic import`);
}
check(seen.size > 40, `the boot graph walk found only ${seen.size} modules`);
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/scene\/earthoverlay\.js'\)/.test(main) && /import\('\.\/scene\/figures3d\.js'\)/.test(main), 'main.js does not import the two modules dynamically');

// ---------------------------------------------------------------- 6. the shutter
const store = new Map();
const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
const ex = createExposure({ storage });
const heard = [];
ex.onChange((mode, look, byVisitor) => heard.push(`${mode}:${byVisitor}`));
check(ex.mode() === 'camera', 'the shutter starts at Camera');
check(ex.hold('deep') === true && ex.mode() === 'deep' && ex.look().milkyWay > 1, 'a trip\'s hold opens the shutter');
check(!store.has(EXPOSURE_KEY), 'a trip\'s hold was written to storage');
check(ex.hold('deep') === false && ex.hold('wide') === false, 'holding the same mode, or one that does not exist, changes nothing');
check(ex.set('eye') === true && ex.mode() === 'deep' && store.get(EXPOSURE_KEY) === 'eye', 'a choice made during a hold is stored and waits');
check(ex.release() === true && ex.mode() === 'eye', 'letting go gives the visitor\'s own choice back');
check(ex.release() === false, 'letting go twice is nothing');
eq(heard, ['deep:false', 'eye:false'], 'listeners hear the hold and the release, never as the visitor\'s doing');

if (problems.length) {
  console.error(`overlays FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`overlays ok: ${OVERLAYS.length} maps with legends and credits, ${used} trip stops use one; daily and monthly date rules across year ends; one transparent GetMap; the sentence says the day and the maker; ${seen.size} boot modules, none of them the overlay or figure code; a trip's shutter is never stored`);
