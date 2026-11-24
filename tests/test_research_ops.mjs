// tests/test_research_ops.mjs -- the research train "ops" (forge #558, #561, #562, #563): State of Space, re-entries and close
// calls, the Deep Space Network's contacts and Earth events.
//   node tests/test_research_ops.mjs
//
// Against what the sources answered on 2026-11-23 and 24 (tests/fixtures/ops/: our harvester's summaries of CelesTrak's
// catalogue, the first rows of SOCRATES, our copy of DSN Now, EONET's storms), with no network:
//   1. State of Space: every number has a source and a date, live or frozen; the frozen quarter in the repo says so;
//      a sparkline is drawn in its box; a ticking number lands on its value;
//   2. close approaches: CelesTrak's numbers read as theirs, its working flags split off, the filters; re-entries: no date
//      is predicted;
//   3. the DSN: contacts per craft and complex, the light time from the feed's own range, a line to a drawn craft only,
//      and the segment brought in on the Earth's stage;
//   4. Earth events: four kinds, the layer still draws only its three, a row's plan (layer, record, map);
//   5. nothing at boot, the view's link key, the doors on the tabs, every event name from the contract, every word in copy.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const FX = join(ROOT, 'tests/fixtures/ops');
const read = (f) => readFileSync(join(FX, f), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const D = await import(join(JS, 'data/opsdata.js'));
const { SOURCES } = await import(join(JS, 'data/sources.js'));
const { parseDsn } = await import(join(JS, 'data/parsers.js'));
const E = await import(join(JS, 'data/eonet.js'));
const { COPY, t, fmt } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.ops.js'));
await import(join(JS, 'copy/en.facts.js'));
const { segmentEnds } = await import(join(JS, 'scene/dsnlines.js'));
const { lightWords } = await import(join(JS, 'ui/opsdsn.js'));
const { chanceWords } = await import(join(JS, 'ui/opsreentry.js'));
const { kindCounts, flyPlan } = await import(join(JS, 'ui/opsevents.js'));
const { stateRows } = await import(join(JS, 'ui/opsstate.js'));
const { parseOps, opsValue, PANES } = await import(join(JS, 'ui/ops.js'));
const { ENTRY_ROWS } = await import(join(JS, 'ui/opsentry.js'));
const { DSN_CRAFT } = await import(join(JS, 'data/dsncraft.js'));

// ---- 1. State of Space ------------------------------------------------------------------------------------------
const summary = JSON.parse(read('state-of-space-2026-11-23.json'));
const READ = Date.parse('2026-11-23T10:38:04Z');
const live = D.stateNumbers(summary, READ);
check(live.length === D.STATE_IDS.length, `every number of the live summary is read (${live.length} of ${D.STATE_IDS.length})`);
check(live.every((n) => n.source && Number.isFinite(n.asOfMs) && Number.isInteger(n.value) && n.how === 'live'), 'every live number has a source, a date and a whole value');
const byId = Object.fromEntries(live.map((n) => [n.id, n.value]));
check(byId.earth_orbit === byId.payloads + byId.rocket_bodies + byId.debris + summary.earth_orbit.unknown, 'the objects in Earth orbit are the four kinds added up');
check(byId.earth_orbit === 35269 && byId.payloads === 20412 && byId.debris === 12542 && byId.launches_year === 260, `the catalogue of 2026-11-23 counts 35 269 objects up, 20 412 satellites, 12 542 pieces of debris, 260 launches (${byId.earth_orbit}, ${byId.payloads}, ${byId.debris}, ${byId.launches_year})`);
check(byId.working_payloads <= byId.payloads && byId.beyond_working <= byId.beyond_earth, 'working is a part of the whole');
check(D.stateNumbers(null, READ).length === 0 && D.stateNumbers({ ...summary, as_of: 'no' }, NaN).length === 0, 'no summary, or no date, and nothing is shown');
const rows = stateRows([...live, { id: 'people', value: 9, source: 'll2-stations', asOfMs: READ }]);
check(rows.every((r) => /CelesTrak|Launch Library/.test(r.meta) && /23 Nov|Nov 23|2026/.test(r.title)), 'each row says whose number it is and of when');

const qPath = join(ROOT, 'site/data/state-of-space/2026-q3.json');
const hPath = join(ROOT, 'site/data/state-of-space/history.json');
check(existsSync(qPath) && existsSync(hPath), 'the frozen quarter 2026 Q3 and the history are in the repo');
const q3 = JSON.parse(readFileSync(qPath, 'utf8'));
const frozen = D.frozenNumbers(q3);
check(q3.as_of === '2026-09-30' && q3.how === 'counted back' && /^https:\/\//.test(q3.source.url) && q3.source.read, 'the frozen quarter ends on 30 September, says it was counted back, and names its source and the day it was read');
check(frozen.length >= 8 && frozen.every((n) => n.source && n.asOfMs === Date.parse('2026-09-30T00:00:00Z') && n.how === 'counted back'), 'every frozen number carries its source and the quarter\'s last day');
check(!frozen.some((n) => n.id === 'working_payloads' || n.id === 'people'), 'what cannot be counted back (working flags, people) is not in a frozen quarter');
const hist = JSON.parse(readFileSync(hPath, 'utf8'));
check(hist.quarters.includes('2026-q3') && hist.series.length >= 40 && hist.series[0].q === '2016-q1', `the history runs a point a quarter from 2016 (${hist.series.length})`);
check(hist.series.at(-1).payloads === frozen.find((n) => n.id === 'payloads').value, 'the history\'s last point is the frozen quarter\'s own number');
const pts = D.sparkPoints(hist.series, 'payloads', 120, 28).split(' ').map((p) => p.split(',').map(Number));
check(pts.length === hist.series.length && pts.every(([x, y]) => x >= 0 && x <= 120 && y >= 0 && y <= 28) && pts.at(-1)[1] < pts[0][1], 'the sparkline fits its box and climbs with the satellites');
check(D.sparkPoints([{ a: 1 }], 'a', 100, 20) === '', 'one point is no line');
check(D.countUp(0, 35269, 0) === 0 && D.countUp(0, 35269, 1) === 35269 && D.countUp(0, 35269, 2) === 35269 && Number.isInteger(D.countUp(0, 35269, 0.37)), 'a ticking number starts at zero, is always whole and lands on its value');

// ---- 2. close approaches and re-entries --------------------------------------------------------------------------
const soc = D.parseSocrates(JSON.parse(read('socrates-2026-11-24.json')));
check(soc.length === 52, `the 52 whole rows of the fixture's first 6 000 bytes (${soc.length})`);
const first = soc[0];
check(first.a.name === 'LAPAN-A3' && first.a.status === '+' && first.b.name === 'STARLINK-37190' && first.rangeM === 4 && first.maxProb === 1 && first.tcaMs === Date.parse('2026-11-27T19:37:34.527Z'), 'the first row is CelesTrak\'s own: names, flags, 4 m, its probability, the time in UTC');
check(soc.some((r) => r.involves === 'debris' && /COSMOS 2251 DEB/.test(r.b.name)), 'a pass with a piece of Cosmos 2251 is filed under debris');
for (const f of D.CLOSE_FILTERS) check(D.closeFilter(soc, f).every((r) => f === 'all' || r.involves === f), `the ${f} filter keeps only its own`);
check(D.splitStatus('OBJECT P [+]').name === 'OBJECT P' && D.splitStatus('NO FLAG').status === '', 'the working flag is split off the name, and a name without one is kept whole');
check(chanceWords(1) === COPY.ops.reentry.closeChanceHigh && chanceWords(4.35e-4) === t(COPY.ops.reentry.closeChance, { n: fmt.int(2300) }) && chanceWords(0) === '', `a probability reads as 1 in N, two figures (${chanceWords(4.35e-4)})`);
check(D.parseSocrates({ columns: ['X'], rows: [[1]] }).length === 0 && D.parseSocrates(null).length === 0, 'a file of another shape gives no rows, not wrong ones');
const watch = JSON.parse(read('reentry-watch-2026-11-23.json'));
check(watch.recent.length > 0 && watch.recent.every((r) => r.down >= '2026-10-24' && r.down <= '2026-11-23'), 'what came down is in the 30 days before the catalogue was read');
check(watch.lowest.every((r) => r.apogee_km < watch.low_apogee_km) && watch.lowest.every((r, i, a) => i === 0 || r.perigee_km + r.apogee_km >= a[i - 1].perigee_km + a[i - 1].apogee_km), 'the lowest are under 350 km at both ends, lowest first');
check(watch.lowest.every((r) => !('decay' in r) && !('predicted' in r)), 'no re-entry date is predicted');

// ---- 3. the Deep Space Network -----------------------------------------------------------------------------------
const links = parseDsn(read('dsn-2026-11-24.xml'));
const voy = { id: 'deep-voyager-1', name: 'Voyager 1' };
const contacts = D.dsnContacts(links, { names: DSN_CRAFT, records: new Map([['-31', voy]]) });
check(contacts.length >= 5 && contacts.every((c) => c.code && !['DSN', 'TEST'].includes(c.code) && c.station), `contacts are craft, each at a complex (${contacts.length})`);
const v1 = contacts.find((c) => c.code === 'VGR1');
check(v1 && v1.recordId === 'deep-voyager-1' && v1.name === 'Voyager 1' && v1.oneWayS > 23 * 3600 && v1.oneWayS < 25 * 3600, `Voyager 1 is matched by its Horizons id and is about a light-day away (${v1 && v1.oneWayS})`);
check(contacts[0].oneWayS >= contacts.at(-1).oneWayS, 'the farthest is listed first');
const caps = contacts.find((c) => c.code === 'CAPS');
check(caps && caps.name === 'CAPSTONE' && caps.recordId === null && Math.abs(caps.oneWayS - 328000 / D.LIGHT_KM_S) < 1e-6, 'a craft the map does not draw keeps the DSN\'s name, no record, and its range over c');
check(D.oneWaySeconds({ rangeKm: -1, rtltS: 2.19 }) === 1.095 && D.oneWaySeconds({}) === null, 'with no range, half the round trip; with neither, nothing');
check(Object.keys(D.DSN_SITES).join() === 'gdscc,mdscc,cdscc' && Math.abs(D.DSN_SITES.cdscc.latDeg + 35.22) < 0.01, 'the three complexes are NASA\'s own places');
check(lightWords(1.28) === t(COPY.ops.dsn.lightS, { n: '1.3' }) && lightWords(618) === t(COPY.ops.dsn.lightMin, { m: 10, s: 18 }) && lightWords(86434) === t(COPY.ops.dsn.lightH, { h: 24, m: 1 }), `light time in words (${lightWords(618)}, ${lightWords(86434)})`);
const near = segmentEnds({ x: 1, y: 0, z: 0 }, { x: 1e7, y: 0, z: 0 }, 6.27);
check(near && near.clamped && Math.abs(near.b.x - 7.27) < 1e-9 && near.b.y === 0, 'on the Earth\'s stage the line stops a few Earth radii out, on the true direction');
const far = segmentEnds({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, Infinity);
check(far && !far.clamped && far.b.x === 3 && far.b.y === 4, 'on the Sun\'s stage it reaches the craft');
check(segmentEnds(null, { x: 1, y: 1, z: 1 }, 1) === null && segmentEnds({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, 1) === null, 'no line without both ends');

// ---- 4. Earth events --------------------------------------------------------------------------------------------
const sf = read('eonet-storms-floods-2026-11-24.json');
const NOW = Date.parse('2026-11-24T09:00:00Z');
check(E.parseEonet([sf], { nowMs: NOW }).length === 0, 'the layer still draws only fires, volcanoes and icebergs: no storm reaches it');
const evs = E.parseEonet([sf], { nowMs: NOW, kinds: D.EVENT_KINDS });
check(evs.length === 2 && evs.every((r) => r.meta.kind === 'storm' && r.meta.agencies.includes('JTWC')), `the list reads EONET's two storms, from JTWC (${evs.length})`);
const listed = D.eventRows([...evs, { id: 'x', name: 'old', meta: { kind: 'iceberg', reportedMs: NOW } }]);
check(listed.length === 2 && listed[0].meta.reportedMs >= listed[1].meta.reportedMs, 'icebergs are the layer\'s, not the list\'s; newest first');
check(kindCounts(listed).storm === 2 && kindCounts(listed).all === 2 && kindCounts(listed).wildfire === 0, 'the chips count each kind');
const stormPlan = flyPlan(evs[0], []);
check(stormPlan.layer === 'storms' && stormPlan.record === evs[0] && stormPlan.overlay === 'rain', 'a storm turns on the storms layer, is selected as EONET\'s point, with the rain map');
const fire = { id: 'event-eonet-1', name: 'A fire', meta: { kind: 'wildfire' } };
const own = { id: 'event-eonet-1', name: 'A fire', layer: 'earth-events', meta: { kind: 'wildfire' } };
const firePlan = flyPlan(fire, [own]);
check(firePlan.layer === 'earth-events' && firePlan.record === own && firePlan.overlay === null, 'a fire selects the layer\'s own record and lays no wrong map');
check(flyPlan({ id: 'f', meta: { kind: 'flood' } }, []).overlay === 'rain' && flyPlan({ id: 'f', meta: { kind: 'flood' } }, []).layer === null, 'a flood has the rain map and no layer');
check(D.GIBS_FOR_KIND.rain === undefined && ['rain'].every((id) => readFileSync(join(ROOT, 'registry/overlays.yaml'), 'utf8').includes(`- id: ${id}`)), 'the map named is a row of registry/overlays.yaml');

// ---- 5. the view, the sources, the words, the budget -------------------------------------------------------------
const reg = {};
D.registerOpsSources(reg);
check(D.OPS_SOURCE_IDS.every((id) => reg[id] && reg[id].registryId === id && reg[id].attribution), 'the four sources are registered with their credit line');
check(!SOURCES['state-of-space'] && !SOURCES['celestrak-socrates'], 'they are not in the boot graph\'s table until the view is opened');
const yaml = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
for (const id of ['celestrak-socrates', 'eonet-storms-floods']) {
  const at = yaml.indexOf(`- id: ${id}`);
  const row = yaml.slice(at, yaml.indexOf('\n\n', at));
  check(at > 0 && row.includes(`attribution: "${reg[id].attribution}"`) && row.includes(`browser: ${reg[id].browser}`), `registry/sources.yaml ${id} and the page agree on the credit and the browser route`);
}
check(reg['celestrak-socrates'].browser === false && reg['state-of-space'].browser === false && reg['reentry-watch'].browser === false, 'a visitor\'s browser never asks CelesTrak for these: our copy only');
check(parseOps('events:volcano').which === 'events' && parseOps('events:volcano').arg === 'volcano' && parseOps('nothing') === null && opsValue('dsn', '') === 'dsn', 'the link key reads and writes a pane');
const url = readFileSync(join(JS, 'ui/urlstate.js'), 'utf8');
check(/KEYS\.splice\(KEYS\.indexOf\('cam'\), 0, 'ops'\)/.test(url), 'ui/urlstate.js knows the `ops` key');
check(ENTRY_ROWS.earth.join() === 'state,reentry,events' && ENTRY_ROWS.planets.join() === 'dsn' && Object.values(ENTRY_ROWS).flat().every((p) => PANES.includes(p)), 'the doors on the tabs open the four panes');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/ui\/ops\.js'\)/.test(main) && /import\('\.\/ui\/opsentry\.js'\)/.test(main) && !/^import .*ops/m.test(main), 'the view and its doors are dynamic imports, not in the boot graph');

// Every event name these modules send is in the contract's list (CONTRACT.md "Analytics events").
const CONTRACT = ['tab_open', 'layer_toggle', 'select_object', 'share'];
for (const f of ['ui/ops.js', 'ui/opsstate.js', 'ui/opsreentry.js', 'ui/opsdsn.js', 'ui/opsevents.js']) {
  const src = readFileSync(join(JS, f), 'utf8');
  for (const m of src.matchAll(/track\('([a-z_]+)'/g)) check(CONTRACT.includes(m[1]), `${f} sends ${m[1]}, which is not in the contract's list`);
  check(!/fetch\(\s*['"`]https?:/.test(src), `${f} asks no third party itself`);
}

// Every word the panes read exists in English.
const O = COPY.ops;
for (const p of PANES) check(O.tabs[p] && O.titles[p] && (p === 'state' || O.entry[p]), `the ${p} pane has its tab, title and door`);
for (const k of D.EVENT_KINDS) check(O.events.kinds[k] && O.events.kindOne[k] && COPY.earthEvent.kinds[k], `the ${k} kind has its words, on the list and the card`);
for (const id of D.STATE_IDS) check(O.state.labels[id], `State of Space has a label for ${id}`);
const chrome = [O.label, ...Object.values(O.tabs), ...Object.values(O.titles), ...Object.values(O.entry), ...Object.values(O.state.labels), O.dsn.lines, O.events.noMap, O.reentry.moment];
check(chrome.every((s) => s.length <= 60 && !/!/.test(s)), 'a line of chrome is 60 characters or fewer, with no exclamation mark');

// The budgets (registry/budgets.yaml, research train "ops").
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const size = (p) => readFileSync(join(ROOT, p)).length;
const viewFiles = ['ui/ops.js', 'ui/opskit.js', 'ui/opsstate.js', 'ui/opsreentry.js', 'ui/opsdsn.js', 'ui/opsevents.js', 'ui/opsentry.js', 'data/opsdata.js', 'data/dsncraft.js', 'scene/dsnlines.js', 'copy/en.ops.js'].map((f) => `site/js/${f}`).concat(['site/css/ops.css']);
const viewBytes = viewFiles.reduce((a, f) => a + size(f), 0);
check(viewBytes <= BUDGETS.ops_view_bytes, `the view's files are ${viewBytes} B, over ops_view_bytes ${BUDGETS.ops_view_bytes}`);
const socFix = JSON.parse(read('socrates-2026-11-24.json'));
const perRow = size('tests/fixtures/ops/socrates-2026-11-24.json') / socFix.rows.length;
const copies = size('tests/fixtures/ops/state-of-space-2026-11-23.json') + size('tests/fixtures/ops/reentry-watch-2026-11-23.json') + perRow * 100 + 1500;
check(copies <= BUDGETS.ops_saved_copies_bytes, `the three saved copies come to about ${Math.round(copies)} B, over ops_saved_copies_bytes`);
check(size('site/data/state-of-space/2026-q3.json') + size('site/data/state-of-space/history.json') <= BUDGETS.state_of_space_frozen_bytes, 'the frozen quarters are over state_of_space_frozen_bytes');
check(/RANGE_BYTES = 400_000/.test(readFileSync(join(ROOT, 'harvest/parsers/celestrak_socrates.py'), 'utf8')) && BUDGETS.socrates_range_bytes === 400000, 'the harvester asks for socrates_range_bytes and no more');
const linesSrc = readFileSync(join(JS, 'scene/dsnlines.js'), 'utf8');
check((linesSrc.match(/new THREE\.(LineSegments|Mesh|Points|Line)\b/g) || []).length === BUDGETS.dsn_lines_draw_calls, 'the DSN lines are one draw (dsn_lines_draw_calls)');

if (problems.length) {
  console.error(`research train ops FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`research train ops ok: ${live.length} live numbers and ${frozen.length} frozen ones each with its source and date, a history of ${hist.series.length} quarters, ${soc.length} close approaches read as CelesTrak's, ${contacts.length} DSN contacts with their light time, ${evs.length} storms beside the layer's three kinds, the view behind a dynamic import`);
