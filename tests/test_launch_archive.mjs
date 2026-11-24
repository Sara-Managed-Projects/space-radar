// tests/test_launch_archive.mjs -- the launch archive on the map (forge #551): every orbital launch attempt since 1957 from GCAT,
// its table, its filters, its fly-to and its replay on the globe.
//
//   node tests/test_launch_archive.mjs
//
// What it holds: the bundled copy parses into rows whose every site has a place; GCAT's outcome codes fold into the six
// words; 1957 is three attempts; the filters (outcome, a decade or a year, a country, words) keep what they say and the
// counts add up; a `cat=launches:` link names a year or a decade and nothing else; the replay draws the last year's
// launches, grown and faded, a failure short; a row's fly-to is a fixed point on the Earth at the site; the arcs head as the
// inclination allows; the words exist in eleven languages; and nothing of it is in the boot graph.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const D = await import(join(JS, 'data/launcharchive.js'));
const U = await import(join(JS, 'ui/launcharchive.js'));
const A = await import(join(JS, 'scene/launcharcs.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { ecefToGeodetic } = await import(join(JS, 'propagate/frames.js'));

// --- the file -----------------------------------------------------------------------------------------------------------
const file = JSON.parse(readFileSync(join(ROOT, 'site/data/launches.json'), 'utf8'));
check(D.unwrap(file) === file, 'the bundled copy is the archive itself');
check(D.unwrap({ source: 'gcat-launches', body: file }) === file && D.unwrap({ body: JSON.stringify(file) }).count === file.count, 'our snapshot wraps it in `body`, as an object or as text');
check(D.unwrap({ body: { nope: 1 } }) === null && D.unwrap(null) === null, 'anything else is not an archive');
const a = D.parseArchive(file);
check(a && a.count === file.rows.length && a.count >= 7000, `every row parses: ${a && a.count}`);
check(a.rows.every((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon)), 'every launch has a site with a place (the join)');
check(a.rows.every((r) => /^\d{4}-\d{2}/.test(r.t) && r.year >= 1957), 'every launch has a date from 1957 on');
check(/CC BY 4\.0/.test(a.licence) && /planet4589\.org\/space\/gcat/.test(a.citation) && a.updated, 'it carries its licence, citation and day');
const y1957 = a.rows.filter((r) => r.year === 1957);
check(y1957.length === 3 && y1957.map((r) => r.tag).join() === '1957 ALP,1957 BET,1957-F01', `1957 is three attempts: ${y1957.map((r) => r.tag)}`);
check(y1957[0].veh === 'Sputnik 8K71PS' && y1957[0].siteName === 'Baykonur' && y1957[0].kind === 'S' && y1957[2].veh === 'Vanguard' && y1957[2].kind === 'F', 'Sputnik 1 from Baykonur a success, Vanguard TV3 a failure');

// --- outcomes ------------------------------------------------------------------------------------------------------------
for (const [code, kind] of [['S', 'S'], ['F', 'F'], ['S75', 'P'], ['F40', 'P'], ['E', 'E'], ['A', 'A'], ['U', 'U'], ['', 'U'], ['Z', 'U']]) {
  check(D.outcomeKind(code) === kind, `outcome ${code} is ${kind}, not ${D.outcomeKind(code)}`);
}
check(D.partialPercent('S75') === 75 && D.partialPercent('F40') === 40 && D.partialPercent('S') === null, 'a partial carries the percent GCAT credits');
const kinds = Object.fromEntries(D.countBy(a.rows, 'kind'));
check(kinds.S > 6000 && kinds.F > 300 && kinds.P > 50 && kinds.E > 0 && kinds.A > 0, `the outcomes are all there: ${JSON.stringify(kinds)}`);

// --- time ----------------------------------------------------------------------------------------------------------------
check(near(D.yearFraction('1957-10-04 19:28:34'), 1957 + 276.81 / 365, 0.002), `Sputnik 1 is 0.76 of the way through 1957: ${D.yearFraction('1957-10-04 19:28:34')}`);
check(near(D.yearFraction('1963-02'), 1963.12, 0.01) && D.yearFraction('') === null, 'a month alone is its middle; nothing is nothing');
check(D.whenFromArg('1969') === '1969' && D.whenFromArg('1960s') === '1960s' && D.whenFromArg('1955') === '' && D.whenFromArg('1965s') === '' && D.whenFromArg('x') === '' && D.whenFromArg('') === '',
  'a link names a year from 1957 or a decade, and nothing else');

// --- filters -------------------------------------------------------------------------------------------------------------
const all = a.rows;
const f = (o) => U.filterRows(all, o).length;
check(f({}) === all.length, 'no filter keeps everything');
check(f({ outcome: 'S' }) + f({ outcome: 'F' }) + f({ outcome: 'P' }) + f({ outcome: 'other' }) === all.length, 'the outcome chips split the whole');
check(f({ when: '1957' }) === 3 && f({ when: '1950s' }) === all.filter((r) => r.year < 1960).length, 'a year and a decade');
const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].reduce((s, d) => s + f({ when: `${d}s` }), 0);
check(decades === all.length, 'the decades split the whole');
const states = new Set(D.countBy(all, 'state').filter(([, n]) => n >= 40).map(([s]) => s));
const byState = [...states].reduce((s, st) => s + f({ state: st }), 0) + f({ state: '*', states });
check(byState === all.length && states.has('SU') && states.has('US') && states.has('CN'), 'the country chips and Elsewhere split the whole');
check(f({ text: 'sputnik' }) >= 3 && U.filterRows(all, { text: 'vanguard tv3' }).length === 0 && f({ text: 'baikonur' }) === 0 && f({ text: 'Baykonur' }) > 1000, 'words match the rocket, payload or site as GCAT spells them');
check(f({ when: '1969', outcome: 'F' }) === all.filter((r) => r.year === 1969 && r.kind === 'F').length, 'filters combine');

// --- replay and fly-to --------------------------------------------------------------------------------------------------
const rows = all.map((r) => ({ ...r, yf: D.yearFraction(r.t) }));
const items = U.replayItems(rows, 1969.5);
check(items.length === rows.filter((r) => r.yf <= 1969.5 && r.yf > 1968.5).length && items.length > 50, `a replay at mid 1969 draws the year before it: ${items.length}`);
check(items.every((i) => i.k > 0 && i.k <= 1 && i.alpha >= 0.15 && i.alpha <= 1), 'each arc grown and faded within bounds');
check(U.replayItems(rows, 1957.0).length === 0 && U.replayItems(rows, 1957.8).length === 1, 'nothing before Sputnik; Sputnik 1 alone in late 1957');
const y69 = U.yearItems(rows, 1969);
check(y69.length === rows.filter((r) => r.year === 1969).length && y69.every((i) => i.k === 1), 'a chosen year draws all of its launches, whole');
check(y69.some((i) => i.fail) && y69.some((i) => !i.fail), 'failures and successes drawn apart');
const rec = U.siteRecord(y1957[0]);
check(rec && rec.propagator === 'fixed' && rec.frame === 'earth-fixed' && rec.klass === 'site', 'a row flies to a fixed point on the Earth');
const p = propagate(rec, Date.UTC(2026, 0, 1));
const g = p ? ecefToGeodetic(p) : null;
check(g && near(g.latRad * 180 / Math.PI, 46, 0.05) && near(g.lonRad * 180 / Math.PI, 63, 0.05) && near(g.altKm, 0, 0.5), `Baykonur's point is at 46 N 63 E: ${g && [g.latRad * 180 / Math.PI, g.lonRad * 180 / Math.PI]}`);
check(U.siteRecord({ lat: null, lon: 3 }) === null, 'a site with no place is not flown to');

// --- the arcs ------------------------------------------------------------------------------------------------------------
check(A.launchAzimuth(28.5, null) === 90, 'no inclination: due east');
check(near(A.launchAzimuth(28.5, 28.5), 90, 1e-6), 'an inclination equal to the latitude: due east');
check(near(A.launchAzimuth(28.5, 51.6), 180 - 44.9, 0.5), `Canaveral to 51.6 degrees heads south of east: ${A.launchAzimuth(28.5, 51.6)}`);
check(A.launchAzimuth(34.6, 98) > 180 && A.launchAzimuth(34.6, 98) < 200, 'a retrograde orbit from Vandenberg heads south of west');
check(A.launchAzimuth(-2.3, 5) < 90 && A.launchAzimuth(-2.3, 5) > 0, 'a southern site heads north of east, toward the equator');
const dst = A.destination(0, 0, 90, 6371.0088 * Math.PI / 2);
check(near(dst.lat, 0, 1e-6) && near(dst.lon, 90, 1e-6), 'a quarter of the equator east of 0,0 is 0,90');
const pts = A.arcPoints(46, 63, null, 1, false);
const short = A.arcPoints(46, 63, null, 1, true);
check(pts.length === A.ARC_POINTS && near(pts[0].lat, 46, 1e-9) && pts.at(-1).altKm > pts[1].altKm, 'an arc starts at the site and climbs');
check(short.at(-1).lon < pts.at(-1).lon && short.at(-1).altKm < pts.at(-1).altKm, 'a failure stops short');

// --- the words and the boot ---------------------------------------------------------------------------------------------
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.launches.js'));
const leaves = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v, `${pre}${k}.`) : [`${pre}${k}`]));
const keys = leaves(COPY.launchArchive);
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const text = readFileSync(join(JS, `copy/${lang}.js`), 'utf8');
  const start = text.indexOf('// research train (catalogues): launch archive: begin');
  const block = text.slice(start, text.indexOf('// research train (catalogues): launch archive: end'));
  check(start > 0 && /COPY\.launchArchive = \{/.test(block), `copy/${lang}.js has the archive's words between its markers`);
  for (const k of keys) check(new RegExp(`"${k.split('.').pop()}": "[^"]+"`).test(block), `copy/${lang}.js has launchArchive.${k}`);
  for (const slot of ['{n}', '{pct}', '{site}', '{pad}', '{year}', '{d}']) check(block.includes(slot), `copy/${lang}.js keeps ${slot}`);
}
for (const [k, v] of Object.entries(COPY.launchArchive.columns)) check(v.length <= 24, `column ${k} fits a header`);
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/launcharchive|launcharcs|launches\.json/.test(main), 'main.js names none of it: the archive is fetched when it is opened');
const ui = readFileSync(join(JS, 'ui/launcharchive.js'), 'utf8');
check(/import\('\.\.\/scene\/launcharcs\.js'\)/.test(ui) && !/^import .*launcharcs/m.test(ui), 'the arcs are fetched on the first year drawn');
check(/readJsonCopy\(\[\{ url: SNAPSHOT_URL, via: 'snapshot' \}, \{ url: BUNDLED_URL, via: 'bundled' \}\]\)/.test(ui), 'our saved copy first, the bundled copy after it');
check(/prefers-reduced-motion/.test(ui) && /play\.hidden = still/.test(ui), 'reduced motion: no replay offered, the slider steps');
check(/ui-btn ui-btn--primary/.test(ui) && (ui.match(/ui-btn--primary/g) || []).length === 1, 'one ember action: Replay');
const sources = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
check(/- id: gcat-launches\n\s+url: https:\/\/planet4589\.org\/space\/gcat\/tsv\/launch\/launch\.tsv\n\s+auth: none\n\s+browser: false/.test(sources), 'the harvester saves its own copy (registry/sources.yaml gcat-launches, no browser route)');

if (problems.length) { console.error(`launch archive FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`launch archive ok: ${a.count} orbital attempts of GCAT ${a.updated} parse with every site placed, 1957 is three, the six outcomes fold right, the filters split the whole, a link names a year or a decade, the replay grows and fades a year of arcs (a failure short), a row flies to its site, the words are in eleven languages and none of it boots`);
