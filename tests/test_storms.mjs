// tests/test_storms.mjs -- tropical cyclones from GDACS (2026-09-28).
//
// Against the answer GDACS really gave at 22:50 UTC on 2026-09-28 (tests/fixtures/harvest/
// gdacs_tc.json, verbatim; CAPTURED.json says so), with no network:
//   1. which storms are happening now: the six advised in the last 12 h, not GDACS's `iscurrent`,
//      which was still "true" for GONZALO-26 two days after its last advisory;
//   2. each at its advisory centre, named as a person would say it, with what GDACS's two
//      numbers mean -- the status at the advisory, and the top wind on the track, forecast included;
//   3. drawn only in the window of app time the advisory is true for;
//   4. the card: the sentence, the rows, the honesty line and the source line;
//   5. the layer, the source row, the registry mirror and the glyph agree.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const P = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { cardWords, drawingLine } = await import(join(JS, 'ui/cards.js'));
const { isNotable } = await import(join(JS, 'ui/labels.js'));
const { SOURCES } = await import(join(JS, 'data/sources.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { LAYER_ROWS } = await import(join(JS, 'data/layers.registry.js'));
const { CELL_OF, CLASS_COLOURS, glyphCell } = await import(join(JS, 'scene/glyphatlas.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const body = readFileSync(join(ROOT, 'tests/fixtures/harvest/gdacs_tc.json'), 'utf8');
const CAPTURED = Date.parse('2026-09-28T22:50:08Z');

// ---- 1. which storms ------------------------------------------------------------------------------
const all = P.parseGdacsCyclones(body);
check(all.length === 20, `without a clock every storm in the answer is a record (${all.length})`);
const now = P.parseGdacsCyclones(body, { nowMs: CAPTURED });
check(now.map((r) => r.name).join() === 'Nolo,Fay,Rachel,Hanna,Polo,Surigae', `the storms advised in the last 12 h: ${now.map((r) => r.name).join()}`);
check(!now.some((r) => r.name === 'Gonzalo'), 'GONZALO-26 is iscurrent "true" but 26 h past its last advisory: not now');
check(P.parseGdacsCyclones('not json').length === 0 && P.parseGdacsCyclones({}).length === 0 && P.parseGdacsCyclones(null).length === 0, 'anything else is no storms, not a throw');
check(P.parseGdacsCyclones(JSON.stringify(JSON.parse(body))).length === 20, 'the text of the answer parses the same as the object');

// ---- 2. each storm --------------------------------------------------------------------------------
const byName = new Map(now.map((r) => [r.name, r]));
const polo = byName.get('Polo');
const DEG = Math.PI / 180;
check(polo && polo.id === 'storm-gdacs-1001325' && polo.klass === 'storm' && polo.layer === 'storms' && polo.source === 'gdacs-tc'
  && polo.propagator === 'fixed' && polo.frame === 'earth-fixed' && polo.cls === 'measured', 'Polo: a fixed, earth-fixed, measured storm record');
check(Math.abs(polo.fixed.latRad - 25.0 * DEG) < 1e-12 && Math.abs(polo.fixed.lonRad - -113.0 * DEG) < 1e-12, 'at GDACS\'s point, 25.0 N 113.0 W');
check(polo.meta.advisoryMs === Date.parse('2026-09-28T21:00:00Z') && polo.epoch === polo.meta.advisoryMs, 'the advisory time read as UTC (GDACS writes no Z)');
check(polo.meta.status === 'hurricane' && polo.meta.trackMaxWindKmh > 287 && polo.meta.trackMaxWindKmh < 288 && polo.meta.trackMaxCategory === 5,
  'Polo: hurricane strength now; 287 km/h the top of its track, Category 5 by the Saffir-Simpson km/h table');
check(byName.get('Rachel').meta.status === 'storm' && byName.get('Rachel').meta.trackMaxWindKmh > 157,
  'Rachel: a tropical storm now, whose 157 km/h is its FORECAST peak (every advisory so far was 56-83 km/h)');
check(byName.get('Fay').meta.status === 'depression', 'Fay: a tropical depression now');
check(byName.get('Surigae').meta.basinWord === 'typhoon' && byName.get('Surigae').meta.agency === 'JTWC', 'Surigae, at 133.2 E: a typhoon, advised by JTWC');
check(byName.get('Nolo').meta.basinWord === 'hurricane', 'Nolo, in the central Pacific: a hurricane');
check(P.stormName('BANG-LANG-26') === 'Bang-Lang' && P.stormName('TWO-C-26') === 'Two-C' && P.stormName('NOLO-26') === 'Nolo', 'names as people write them');
check(P.saffirSimpson(118) === 0 && P.saffirSimpson(119) === 1 && P.saffirSimpson(153) === 1 && P.saffirSimpson(154) === 2
  && P.saffirSimpson(178) === 3 && P.saffirSimpson(209) === 4 && P.saffirSimpson(252) === 5, 'the Saffir-Simpson km/h thresholds, NHC\'s table');
check(P.basinWord(15, -60) === 'hurricane' && P.basinWord(15, 130) === 'typhoon' && P.basinWord(15, 88) === 'cyclone' && P.basinWord(-15, 130) === 'cyclone',
  'hurricane in the Atlantic, typhoon in the north-west Pacific, cyclone in the Bay of Bengal and south of the equator');
check(P.stormStatus('Tropical Depression (maximum wind speed of 111 km/h)') === 'depression' && P.stormStatus('Hurricane/Typhoon > 74 mph') === 'hurricane',
  'the status is read from the words GDACS opens its text with');

// ---- 3. the window ---------------------------------------------------------------------------------
const adv = polo.meta.advisoryMs;
check(propagate(polo, adv) !== null && propagate(polo, adv + 11 * 3600000) !== null && propagate(polo, adv - 5 * 3600000) !== null, 'drawn from 6 h before its advisory to 12 h after');
check(propagate(polo, adv + 13 * 3600000) === null && propagate(polo, adv - 7 * 3600000) === null && propagate(polo, adv - 7 * 86400000) === null,
  'not drawn outside that: a clock moved to last week does not show this week\'s hurricane');
const site = { id: 'x', propagator: 'fixed', frame: 'earth-fixed', fixed: { latDeg: 10, lonDeg: 10 } };
check(propagate(site, adv - 1e12) !== null, 'a fixed record with no window is drawn at any time, as before');

// ---- 4. the card (1 h 50 min after the 21:00 advisory, which copy/en.js ageInWords calls "an hour ago") --
const ctx = { clock: { now: () => CAPTURED }, worlds: null, selected: () => null, sources: { SOURCES } };
const w = cardWords(polo, ctx);
check(w.klass === 'Tropical cyclone', `the badge: ${w.klass}`);
check(w.sentence === 'Polo is a hurricane whose centre was here an hour ago, the strongest winds on its track, forecast included, reach 290 km/h.',
  `the first sentence: ${w.sentence}`);
check(w.sentence.length <= 160, 'within the 160-character cap');
const rows = new Map(w.rows);
const R = COPY.card.rows;
check(rows.get(R.stormNow) === 'hurricane strength', `now: ${rows.get(R.stormNow)}`);
check(rows.get(R.stormWind) === '290 km/h, Category 5, forecast included', `wind: ${rows.get(R.stormWind)}`);
check(rows.get(R.stormAdvisory) === '21:00 UTC, an hour ago', `advisory: ${rows.get(R.stormAdvisory)}`);
check(/25\.0.*N.*113\.0.*W/.test(rows.get(R.stormCentre) || ''), `centre: ${rows.get(R.stormCentre)}`);
check(rows.get(R.stormAgency) === 'NOAA' && rows.get(R.stormAlert) === 'orange', 'advised by NOAA, GDACS alert orange');
check(!rows.has(R.altitude) && !rows.has(R.speed), 'no height and no speed: an advisory point neither climbs nor moves');
check(w.honesty.startsWith(COPY.cls.measured) && w.honesty.includes('21:00 UTC advisory, an hour ago') && w.honesty.includes('it has moved since'),
  `the honesty line says whose moment the centre is: ${w.honesty}`);
check(w.sources.includes('GDACS') && w.sources.includes('CC BY 4.0'), `the source line names GDACS and its licence: ${w.sources}`);
const before = cardWords(polo, { ...ctx, clock: { now: () => adv - 2 * 3600000 } });
check(new Map(before.rows).get(R.stormAdvisory) === '21:00 UTC, in 2 hours', `a clock just before the advisory says "in", not "ago": ${new Map(before.rows).get(R.stormAdvisory)}`);
check(before.sentence.startsWith('Polo is a hurricane whose centre reaches here in 2 hours'), `and so does the sentence: ${before.sentence}`);
const fay = cardWords(byName.get('Fay'), ctx);
check(fay.sentence.startsWith('Fay is a tropical depression whose centre was here'), `a depression is called one: ${fay.sentence}`);
const surigae = cardWords(byName.get('Surigae'), ctx);
check(surigae.sentence.startsWith('Surigae is a typhoon'), `a typhoon is called one: ${surigae.sentence}`);
check(drawingLine(polo) === COPY.drawing.storm, 'the drawing line: a mark at the centre, the storm is the cloud');
check(isNotable(polo), 'a storm is named on the map');
for (const [k, v] of Object.entries(COPY.templates.storm)) if (typeof v === 'string') check(!v.includes(' -- '), `COPY.templates.storm.${k} has no " -- "`);

// ---- 5. layer, source, mirror, glyph --------------------------------------------------------------
const layer = LAYERS.find((l) => l.id === 'storms');
const row = LAYER_ROWS.find((r) => r.id === 'storms');
check(layer && row && layer.source === 'gdacs-tc' && row.source === 'gdacs-tc' && layer.parse === 'gdacs-tc' && layer.propagator === 'fixed' && layer.frame === 'earth-fixed',
  'the storms layer, both sides of the registry mirror');
check(layer && layer.glyph === 'storm' && row.glyph === 'storm' && row.card === 'storm' && layer.noModel === true, 'drawn as the storm glyph, carded as a storm, no model');
const src = SOURCES['gdacs-tc'];
check(src && src.browser === true && src.url.includes('eventlist=TC') && src.url.includes('pageSize=20') && src.kind === 'json',
  'the source row: browser-readable (CORS *, measured), the TC list, 20 newest');
const yaml = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
check(yaml.includes('  - id: gdacs-tc') && yaml.includes(src.url) && yaml.includes('parser: gdacs_tc'), 'sources.yaml has the same row, harvested by harvest/parsers/gdacs_tc.py');
check(CELL_OF.storm === 14 && glyphCell('storm') === 14 && CLASS_COLOURS.storm === '#9DB4FF', 'the fifteenth atlas cell, in periwinkle');
check(!/^#(F|E)[0-4]/i.test(CLASS_COLOURS.storm), 'not an alarm red (docs/design-language.md)');
const atlas = readFileSync(join(JS, 'scene/glyphatlas.js'), 'utf8');
check(/\n  storm\(ctx, cx, cy, R\) \{/.test(atlas), 'the atlas has a storm shape to paint in that cell');
const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
check(/--sr-storm:\s*#9db4ff/i.test(css) && css.includes('.sr-glyph--storm'), 'the card header\'s glyph has the colour too');

if (problems.length) {
  console.error('storms FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`storms ok: ${now.length} storms now of ${all.length} in the answer, each at its advisory, drawn inside its window, carded with what GDACS's numbers mean`);
