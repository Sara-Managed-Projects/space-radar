// tests/test_find.mjs -- Find by property: the questions and the filters (forge #150; site/js/ui/findcore.js).
//
// The `#find=` value reads and writes back the same; the habitable zone is scripts/build-systems.py's, so a
// planet of the generated systems gets the same zone worked out here as the table carries; the filters keep
// what they say on the real exoplanet table the map loads (site/data/exoplanets.csv), and the look run's
// question, rocky planets in the habitable zone within 50 light-years, finds the planets the literature names.
//
//   node tests/test_find.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(join(ROOT, 'site/js/ui/findcore.js'));
const { parseExoplanets } = await import(join(ROOT, 'site/js/data/parsers.js'));
const { SYSTEMS_TABLE } = await import(join(ROOT, 'site/js/data/systems-table.js'));
const { catalogueRows, operatorOf } = await import(join(ROOT, 'site/js/data/owners.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- the link value ---------------------------------------------------------------------------------
const q = F.parseFind('exo_ly50_hz_rocky');
check(q && q.kind === 'exoplanets' && q.withinLy === 50 && q.zone && q.rocky, 'exo_ly50_hz_rocky');
check(F.findText(q) === 'exo_ly50_hz_rocky', `round trip: ${F.findText(q)}`);
const r = F.parseFind('exo_r-1.6_t200-320_s0.5-_byteq_desc');
check(r.radius[0] === null && r.radius[1] === 1.6 && r.teq[0] === 200 && r.teq[1] === 320 && r.insol[0] === 0.5 && r.insol[1] === null, 'open ranges');
check(r.sort === 'teq' && r.desc === true, 'sort and order');
check(F.parseFind(F.findText(r)) && F.findText(F.parseFind(F.findText(r))) === F.findText(r), 'a written value reads back to itself');
const s = F.parseFind('sats_ownIND_opspacex_h500-600_y2020-_working');
check(s.kind === 'satellites' && s.owner === 'IND' && s.operator === 'spacex' && s.height[0] === 500 && s.year[1] === null && s.working, 'satellites');
check(F.parseFind('nothing_ly5') === null && F.parseFind('') === null, 'no kind, no question');
check(F.parseFind('stars_ly20_zz9_<x>').withinLy === 20, 'an unknown token is dropped, the rest kept');
for (const p of F.PRESETS) { const pq = F.parseFind(p.find); check(pq && F.findText(pq) === p.find, `preset ${p.id} is written as findText writes it (${pq && F.findText(pq)})`); }

// --- the habitable zone, against the generated systems --------------------------------------------
const sun = F.habitableZone(5772, 1);
check(sun && Math.abs(sun.inner - 0.95) < 0.03 && Math.abs(sun.outer - 1.68) < 0.03, `the Sun's zone is about 0.95 to 1.68 au, got ${sun && sun.inner.toFixed(3)}-${sun && sun.outer.toFixed(3)}`);
check(F.habitableZone(2000, 0.001) === null && F.habitableZone(8000, 5) === null, 'outside 2 600-7 200 K there is no zone');
check(F.zoneOf(1, sun) === 'inside' && F.zoneOf(0.5, sun) === 'hotter' && F.zoneOf(3, sun) === 'colder', 'zoneOf');
let compared = 0;
for (const sys of SYSTEMS_TABLE) {
  const st = sys.star || {};
  if (!(st.teffK > 0 && st.lumSuns > 0) || (sys.starsInSystem || 1) > 1) continue;
  const hz = F.habitableZone(st.teffK, st.lumSuns);
  for (const p of sys.planets || []) {
    if (!p.zone || !(p.aAu > 0) || p.circumbinary) continue;
    compared += 1;
    check(F.zoneOf(p.aAu, hz) === p.zone, `${p.name}: zone ${F.zoneOf(p.aAu, hz)} here, ${p.zone} in the table`);
  }
}
check(compared > 50, `compared ${compared} planets with the table`);

// --- the planets, from the table the map loads ---------------------------------------------------
const exo = parseExoplanets(readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8'));
const byId = new Map();
for (const sys of SYSTEMS_TABLE) for (const p of sys.planets || []) byId.set(p.id, { planet: p, star: sys.star });
const rows = exo.map((rec) => { const o = byId.get(rec.id); return F.exoRow(rec, o ? o.planet : null, o ? o.star : null); });
check(rows.length > 6000, `${rows.length} planets`);
const k452 = rows.find((x) => x.name === 'Kepler-452 b');
check(k452 && k452.how === 'computed' && k452.aAu === 1.046 && k452.zone === 'edge', 'Kepler-452 b: the generated table\'s own numbers');
const t1e = rows.find((x) => x.name === 'TRAPPIST-1 e');
check(t1e && t1e.how === 'modelled' && t1e.aAu > 0.025 && t1e.aAu < 0.045 && t1e.zone === 'inside', `TRAPPIST-1 e: its orbit through an estimated star mass (${t1e && t1e.aAu}), its 2 566 K star taken at the fit's edge`);
check(F.habitableZone(2566, 0.00055) === null && F.habitableZone(2566, 0.00055, true) !== null && F.habitableZone(2300, 0.0005, true) === null, 'the stretch is 200 K and only when asked');
const prox = rows.find((x) => x.name === 'Proxima Cen b');
check(prox && prox.how === 'computed' && prox.zone === 'inside' && prox.rocky === true, 'Proxima Cen b: the table\'s numbers, in the zone, rocky by its minimum mass');
const look = F.runQuery(F.parseFind('exo_ly50_hz_rocky'), rows);
const names = look.rows.map((x) => x.name);
for (const want of ['Proxima Cen b', 'TRAPPIST-1 e']) check(names.includes(want), `rocky, habitable zone, within 50 ly: ${want} is there (${names.join(', ')})`);
check(look.rows.every((x) => x.rocky && x.zone === 'inside' && x.dist <= 50), 'every answer answers the question');
check(look.rows.every((x, i, a) => i === 0 || a[i - 1].dist <= x.dist), 'nearest first');
const hot = F.runQuery(F.parseFind('exo_r8-_t1000-_byteq_desc'), rows, null, 5);
check(hot.total > 100 && hot.rows.length === 5 && hot.rows.every((x, i, a) => x.radius >= 8 && (i === 0 || a[i - 1].teq >= x.teq)), 'hot giants, hottest first, five shown');
// Measured from somewhere else: within 5 ly of Proxima Centauri's own place, Proxima's planets are at 0 ly.
const near = F.runQuery({ kind: 'exoplanets', withinLy: 0.1, fromCamera: true }, rows, prox.ly);
check(near.rows.length >= 1 && near.rows.every((x) => x.host === 'Proxima Cen'), 'within 0.1 ly of Proxima: only its planets');

// --- satellites and comets ---------------------------------------------------------------------------
const cat = catalogueRows(readFileSync(join(ROOT, 'tests/fixtures/satcat-find.csv'), 'utf8')).map((x) => F.satRow(x, operatorOf(x)));
const ind = F.runQuery(F.parseFind('sats_ownIND'), cat);
check(ind.total === 3, `India's payloads up: 3, got ${ind.total}`);
const spacex = F.runQuery(F.parseFind('sats_opspacex_working'), cat);
check(spacex.total === 2 && spacex.rows.every((x) => x.name.startsWith('STARLINK')), 'SpaceX by name, working');
const low = F.runQuery(F.parseFind('sats_h-450_working'), cat);
check(low.rows.map((x) => x.name).join() === 'STARLINK-1012,STARLINK-1008,ISS (ZARYA)', `working below 450 km, lowest first: ${low.rows.map((x) => x.name)}`);
const comet = F.cometRow({ id: 'comet-1P', name: '1P/Halley', meta: { qAu: 0.575, perihelionMs: Date.UTC(2061, 6, 28), periodDays: 27691 } });
check(F.matches(F.parseFind('comets_q2061-2062'), comet) && !F.matches(F.parseFind('comets_q2026-2030'), comet), 'Halley is at perihelion in 2061');
check(Math.abs(F.decimalYear(Date.UTC(2026, 6, 2)) - 2026.5) < 0.01, 'decimalYear');

// --- the system chart's scale ----------------------------------------------------------------------
const placed = F.chartScale([{ id: 'a', radiusEarths: 1 }, { id: 'b', radiusEarths: 11.2 }, { id: 'c' }], { maxR: 40, gap: 10 });
check(Math.abs(placed[1].rPx - 40) < 1e-9 && Math.abs(placed[0].rPx - 40 / 11.2) < 1e-9, 'one scale: the largest at maxR');
check(placed[2].guessed && placed[0].xPx < placed[1].xPx && placed[1].xPx < placed[2].xPx, 'left to right, the unknown one flagged');
check(F.SOLAR_SYSTEM.length === 9 && F.SOLAR_SYSTEM[2].id === 'earth', 'our planets');

if (problems.length) {
  console.error(`test_find: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`test_find: ok (${rows.length} planets; the look run's question finds ${look.total}: ${names.slice(0, 6).join(', ')}...)`);
