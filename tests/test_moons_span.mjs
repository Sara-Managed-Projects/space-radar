// tests/test_moons_span.mjs -- the sixteen fitted moons have a position over 1950 to 2100, not only
// over 2000 to 2050 (review of 2026-11-16: Titan was absent on Voyager 1's Saturn flyby, Miranda at
// Uranus in 1986, Triton at Neptune in 1989, Phobos in Mariner 9's November 1971).
//
// What this holds, against JPL Horizons vectors kept in tests/fixtures/moon_span_horizons.json (the
// request and the day it was made are written there; no network here):
//   - OUTSIDE 2000-2050: every one of the sixteen at eleven instants from 1957 to 2099 -- among
//     them the app's own flyby events (Voyager 1 closest to Saturn 1980-11-12T23:46Z, Voyager 2
//     closest to Uranus 1986-01-24T17:59Z and to Neptune 1989-08-25T03:56Z), 1971-11-14 for Mars's
//     two, Sputnik's launch (the earliest instant a Moment plays), and one minute either side of
//     the old span -- within OUTER_TOL_KM of Horizons. Each tolerance is a
//     little over the worst error site/js/propagate/moons.js states for the outer years.
//   - INSIDE 2000-2050: four instants within IN_TOL_KM of Horizons (a little over the worst that
//     file states for 2000-2050, the number the cards print), AND within a millionth of a kilometre
//     of what the same rows answered before the span was widened (the fixture's `shipped`), so the
//     in-span answer is the old one and the cards' "to within N km over 2000 to 2050" stays true.
//   - BEYOND 1950-2100: null, a refusal and not a guess, and MOON_ELEMENTS_VALID says that span.
//   node tests/test_moons_span.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { MOON_ELEMENTS, MOON_ELEMENTS_VALID, MOON_ELEMENTS_FITTED, MOON_ELEMENTS_OUTER, fittedMoonOffsetKm, elementsOffsetKm } = await import(join(JS, 'propagate/moons.js'));
const { moonOffsetKm } = await import(join(JS, 'propagate/frames.js'));
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/moon_span_horizons.json'), 'utf8'));

const SIXTEEN = ['phobos', 'deimos', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton', 'charon'];
// km. OUTER: the years 1950-2000 and 2050-2100. IN: 2000-2050.
// OUTER is about a tenth over the worst moons.js measured anywhere in 1950-2000 and 2050-2100 (15, 140, 815, 1 080, 1 004, 569,
// 563, 1 592, 8 925, 330, 697, 1 093, 1 974, 1 625, 227 and 4.6 km, in this order); IN is test_worlds_layer.mjs's far tolerance,
// a little over the worst over 2000-2050 (5.9, 120, 703, 1 480, 119, 235, 199, 836, 6 800, 117, 114, 410, 996, 1 230, 9.8, 0.7).
const OUTER_TOL_KM = { phobos: 18, deimos: 160, mimas: 900, enceladus: 1200, tethys: 1100, dione: 630, rhea: 620, titan: 1750, iapetus: 9800, miranda: 370, ariel: 770, umbriel: 1200, titania: 2150, oberon: 1800, triton: 250, charon: 5.5 };
const IN_TOL_KM = { phobos: 10, deimos: 150, mimas: 800, enceladus: 1500, tethys: 160, dione: 300, rhea: 260, titan: 900, iapetus: 7500, miranda: 160, ariel: 160, umbriel: 480, titania: 1100, oberon: 1350, triton: 12, charon: 1 };
// The four the review named, each at the instant the fixture carries for it, held closer than the span's worst: measured
// 2026-11-16, Titan 520.9 km from Horizons, Miranda 96.1, Triton 16.0, Phobos 4.8.
const FLYBYS = [['titan', '1980-11-12T23:46:00Z', 600], ['miranda', '1986-01-24T17:59:00Z', 130], ['triton', '1989-08-25T03:56:00Z', 25], ['phobos', '1971-11-14T00:00:00Z', 8]];

check(Object.keys(MOON_ELEMENTS).sort().join() === [...SIXTEEN].sort().join(), 'the table is the sixteen this test knows');
check(MOON_ELEMENTS_VALID.fromMs === Date.UTC(1950, 0, 1) && MOON_ELEMENTS_VALID.toMs === Date.UTC(2100, 0, 1), 'MOON_ELEMENTS_VALID is 1950-01-01 to 2100-01-01');
check(MOON_ELEMENTS_FITTED.fromMs === Date.UTC(2000, 0, 1) && MOON_ELEMENTS_FITTED.toMs === Date.UTC(2050, 0, 1), 'MOON_ELEMENTS_FITTED is 2000-01-01 to 2050-01-01');
check(/^2026-\d\d-\d\d$/.test(fx.fetched) && /ssd\.jpl\.nasa\.gov\/api\/horizons\.api/.test(fx.request) && /TIME_TYPE='UT'/.test(fx.request) && /VEC_CORR='NONE'/.test(fx.request),
  'the fixture says when and how Horizons was asked');

const inSpan = (t) => t >= MOON_ELEMENTS_FITTED.fromMs && t <= MOON_ELEMENTS_FITTED.toMs;
const worst = {};
for (const id of SIXTEEN) {
  const rows = fx.moons[id] || [];
  const outer = rows.filter(([iso]) => !inSpan(Date.parse(iso)));
  const inner = rows.filter(([iso]) => inSpan(Date.parse(iso)));
  check(outer.some(([iso]) => iso < '2000') && outer.some(([iso]) => iso > '2050') && outer.length >= 11, `${id}: Horizons vectors before 2000 and after 2050 (${outer.length})`);
  check(inner.length >= 4, `${id}: Horizons vectors inside 2000-2050 (${inner.length})`);
  check(OUTER_TOL_KM[id] / MOON_ELEMENTS[id].a < 0.0075 && IN_TOL_KM[id] / MOON_ELEMENTS[id].a < 0.0075, `${id}: both tolerances are under 0.75 % of its orbit`);
  worst[id] = 0;
  for (const [iso, x, y, z] of rows) {
    const t = Date.parse(iso);
    const p = fittedMoonOffsetKm(id, t);
    const tol = (inSpan(t) ? IN_TOL_KM : OUTER_TOL_KM)[id];
    const miss = p ? Math.hypot(p.x - x, p.y - y, p.z - z) : NaN;
    check(miss < tol, `${id} at ${iso} is ${miss.toFixed(1)} km from where Horizons puts it (tolerance ${tol} km)`);
    if (!inSpan(t)) worst[id] = Math.max(worst[id], miss);
    // What the app asks (frames.js) is the same answer.
    const q = moonOffsetKm(id, t);
    check(p && q && q.x === p.x && q.y === p.y && q.z === p.z, `${id} at ${iso}: frames.moonOffsetKm answers what moons.js does`);
    // Inside 2000-2050 it is the 2000-2050 row and nothing else...
    if (inSpan(t)) {
      const e = elementsOffsetKm(MOON_ELEMENTS[id], t);
      check(p && p.x === e.x && p.y === e.y && p.z === e.z, `${id} at ${iso}: inside 2000-2050 the answer is the 2000-2050 row's`);
    }
  }
  // ...and that row answers what it did before the span was widened.
  const was = fx.shipped[id] || [];
  check(was.length >= 4, `${id}: the fixture carries what the 2000-2050 row answered before`);
  for (const [iso, x, y, z] of was) {
    const p = fittedMoonOffsetKm(id, Date.parse(iso));
    const moved = p ? Math.hypot(p.x - x, p.y - y, p.z - z) : NaN;
    check(moved < 2e-6, `${id} at ${iso} moved ${moved} km from the answer before the span was widened`);
  }
  // Beyond the span: no position. At its two ends: one.
  for (const t of [MOON_ELEMENTS_VALID.fromMs - 60000, MOON_ELEMENTS_VALID.toMs + 60000, Date.UTC(1900, 0, 1), Date.UTC(2150, 0, 1)]) {
    check(fittedMoonOffsetKm(id, t) === null && moonOffsetKm(id, t) === null, `${id} has no position at ${new Date(t).toISOString()}, outside 1950-2100`);
  }
  for (const t of [MOON_ELEMENTS_VALID.fromMs, MOON_ELEMENTS_VALID.toMs, MOON_ELEMENTS_FITTED.fromMs - 1, MOON_ELEMENTS_FITTED.toMs + 1]) {
    const p = fittedMoonOffsetKm(id, t);
    const d = p ? Math.hypot(p.x, p.y, p.z) : NaN;
    check(Math.abs(d / MOON_ELEMENTS[id].a - 1) < 0.04, `${id} is on its orbit at ${new Date(t).toISOString()} (${Math.round(d)} km out, a ${Math.round(MOON_ELEMENTS[id].a)})`);
  }
  check(fittedMoonOffsetKm(id, NaN) === null, `no time, no ${id}`);
}
for (const [id, iso, tol] of FLYBYS) {
  const row = (fx.moons[id] || []).find((r) => r[0] === iso);
  const p = fittedMoonOffsetKm(id, Date.parse(iso));
  const miss = row && p ? Math.hypot(p.x - row[1], p.y - row[2], p.z - row[3]) : NaN;
  check(miss < tol, `${id} at its flyby, ${iso}, is ${miss.toFixed(1)} km from where Horizons puts it (tolerance ${tol} km)`);
}

// The outer rows: only for moons of the table, and each really is a different orbit from the
// 2000-2050 one (a copy would be dead weight in the boot graph).
for (const [id, row] of Object.entries(MOON_ELEMENTS_OUTER)) {
  check(SIXTEEN.includes(id), `${id} has an outer row and is one of the sixteen`);
  check(Object.keys(row).every((k) => k in MOON_ELEMENTS[id] && k !== 'parent' && Number.isFinite(row[k])), `${id}'s outer row changes only numbers its 2000-2050 row has`);
  const t = Date.UTC(1975, 5, 1);
  const a = fittedMoonOffsetKm(id, t);
  const b = elementsOffsetKm(MOON_ELEMENTS[id], t);
  check(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 1, `${id}'s outer row is used outside 2000-2050`);
}

if (problems.length) { console.error('moons span FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
const w = SIXTEEN.map((id) => `${id} ${worst[id] < 10 ? worst[id].toFixed(1) : Math.round(worst[id])}`).join(', ');
console.log(`moons span ok: sixteen moons placed over 1950-2100; worst miss against Horizons at the fixture's outer instants, km: ${w}`);
