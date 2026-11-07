// tests/test_clouds.mjs -- the named debris clouds and the constellations (forge #153; site/js/data/clouds.js).
//
// The fragments are counted from a fixture of real catalogue lines: a breakup's pieces are its parent's
// designator AND its fragments' name (the rocket's debris under the same designator is not a piece), up and
// down are told apart, and the parent is found. The drawn records match the same way, and the constellations
// by their operators' names. The modelled spread starts as one point at the event and fans out over a year.
//
//   node tests/test_clouds.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = await import(join(ROOT, 'site/js/data/clouds.js'));
const { catalogueRows } = await import(join(ROOT, 'site/js/data/owners.js'));
const { parseSatcat, fieldRecords } = await import(join(ROOT, 'site/js/data/satcat.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const csv = readFileSync(join(ROOT, 'tests/fixtures/satcat-find.csv'), 'utf8');
const rows = catalogueRows(csv);
const fy = C.cloudById('fy1c');
const k = C.cloudCounts(rows, fy);
// Four FENGYUN 1C DEB lines (two up, two that came down in 2007); CZ-4B DEB shares the designator and is not one.
check(k.catalogued === 4 && k.up === 2, `Fengyun-1C: 4 catalogued, 2 up; got ${k.catalogued}, ${k.up}`);
check(k.parent && k.parent.name === 'FENGYUN 1C' && k.parent.id === 25730, 'Fengyun-1C: the parent is 1999-025A');
const ir = C.cloudCounts(rows, C.cloudById('iridium33'));
check(ir.catalogued === 2 && ir.up === 2 && ir.parent && ir.parent.name === 'IRIDIUM 33', 'Iridium 33: its own two pieces, and IRIDIUM 29 of the same launch is not the parent');
const co = C.cloudCounts(rows, C.cloudById('cosmos2251'));
check(co.catalogued === 0 && co.parent && co.parent.name === 'COSMOS 2251', 'Cosmos 2251: SL-8 DEB of its launch is the rocket, not the collision');
check(C.cloudById('FY1C') === fy && C.cloudById('nope') === null, 'cloudById');
for (const c of C.CLOUDS) {
  check(Number.isFinite(c.eventMs) && c.eventMs < Date.UTC(2026, 0, 1), `${c.id}: a date in the past`);
  check(/^https:\/\/orbitaldebris\.jsc\.nasa\.gov\//.test(c.source.url), `${c.id}: NASA's ODQN is the source`);
  check(c.pieces instanceof RegExp && /^\d{4}-\d{3}A?/.test(c.parentId), `${c.id}: pieces and parent`);
}
check(C.CLOUDS[0].eventMs === Date.UTC(2007, 0, 11, 22, 26), 'Fengyun-1C: 11 January 2007, 22:26 UTC');

// The drawn records (data/satcat.js fieldRecords of the same lines) match the same pieces.
const field = fieldRecords(parseSatcat(csv));
const drawn = field.filter((r) => C.recordInCloud(r, fy));
check(drawn.length === 2 && drawn.every((r) => r.name === 'FENGYUN 1C DEB'), `two drawn Fengyun-1C pieces, got ${drawn.length}`);
check(!field.some((r) => r.name === 'CZ-4B DEB' && C.recordInCloud(r, fy)), 'the CZ-4B piece is not lit');

// The constellations, by name.
const name = (n) => ({ name: n });
check(C.recordInConstellation(name('STARLINK-1008'), C.constellationById('starlink')), 'Starlink');
check(C.recordInConstellation(name('KUIPER-00008'), C.constellationById('kuiper')), 'Kuiper');
check(C.recordInConstellation(name('COSMOS 2433 [GLONASS-M]'), C.constellationById('glonass')), 'GLONASS');
check(C.recordInConstellation(name('GSAT0101 (GALILEO-PFM)'), C.constellationById('galileo')), 'Galileo');
check(C.recordInConstellation(name('NAVSTAR 43 (USA 132)'), C.constellationById('gps')), 'GPS');
check(!C.recordInConstellation(name('IRIDIUM 33 DEB'), C.constellationById('iridium')), 'Iridium 33 DEB is not the Iridium fleet');
check(!C.recordInConstellation(name('STARLINK-1008'), C.constellationById('oneweb')), 'not every fleet');
check(C.CONSTELLATIONS.length === 9, 'the nine fleets of forge #153');

// The modelled spread: nothing before, one point at the event, a ring along the orbit within days, planes
// turned apart within a year (J2's node drift differs with height).
const t0 = fy.eventMs;
check(C.spreadAt(drawn[0], fy, t0 - 1) === null, 'nothing before the event');
const at = (r, t) => { const p = C.spreadAt(r, fy, t, { x: 0, y: 0, z: 0 }); return p ? { ...p } : null; };
const p0 = drawn.map((r) => at(r, t0));
const dir = (p) => { const n = Math.hypot(p.x, p.y, p.z); return [p.x / n, p.y / n, p.z / n]; };
const ang = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 180 / Math.PI;
check(p0.every((p) => p && ang(dir(p), dir(p0[0])) < 1e-6), 'at the event every piece is in one direction');
check(p0.every((p) => Math.hypot(p.x, p.y, p.z) > 6378 + 700 && Math.hypot(p.x, p.y, p.z) < 6378 + 900), 'at the event, at about the height it broke up');
const week = drawn.map((r) => at(r, t0 + 7 * 86400e3));
check(Math.max(...week.map((p) => ang(dir(p), dir(week[0])))) > 5, 'a week later, strung out along the orbit');
// The node: the plane's normal turns at a rate set by height and tilt.
const normal = (r, t) => {
  const a = at(r, t), b = at(r, t + 60e3);
  const n = [a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x];
  const m = Math.hypot(...n);
  return n.map((v) => v / m);
};
const year = t0 + 365.25 * 86400e3;
check(ang(normal(drawn[0], year), normal(drawn[1], year)) > 0.5, 'a year later, the planes have turned apart');
// The rates are J2's: a sun-synchronous orbit (about 98 degrees at 800 km) turns about one degree a day eastwards.
const ss = { meta: { apogeeKm: 800, perigeeKm: 800, inclinationDeg: 98.6 } };
const n0 = (() => { const a = C.spreadAt(ss, fy, t0, {}); return a; })();
check(n0 !== null, 'a shape from apogee, perigee and tilt');
const nodeAt = (t) => { const a = { ...C.spreadAt(ss, fy, t, {}) }; const b = { ...C.spreadAt(ss, fy, t + 60e3, {}) }; const n = [a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z]; return Math.atan2(n[0], -n[1]) * 180 / Math.PI; };
const drift = ((nodeAt(t0 + 30 * 86400e3) - nodeAt(t0)) + 540) % 360 - 180;
check(Math.abs(drift - 30) < 3, `a sun-synchronous orbit's node moves about 30 degrees in 30 days, got ${drift.toFixed(2)}`);

if (problems.length) {
  console.error(`test_clouds: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`test_clouds: ok (${C.CLOUDS.length} clouds, ${C.CONSTELLATIONS.length} constellations)`);
