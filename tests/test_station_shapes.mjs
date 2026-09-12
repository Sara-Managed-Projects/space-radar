// The procedural visiting-vehicle shapes (spec 0027): they build, they fit their budget, and the
// name route picks them for the right records only.
//   node tests/test_station_shapes.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { modelFor, modelVariants, disposeModels } = await import(join(ROOT, 'site/js/scene/models.js'));
const { realModelFor } = await import(join(ROOT, 'site/js/scene/realmodels.js'));
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const tris = (obj) => { let n = 0; obj.traverse((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; n += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return n; };
const budgetOf = (id) => Number(((yaml.split('\n').find((l) => l.includes(`id: ${id},`)) || '').match(/budget_tris:\s*(\d+)/) || [])[1] || 0);

for (const v of ['soyuz', 'progress', 'cygnus', 'tiangong', 'tiangong-module', 'shenzhou', 'tianzhou', 'dragon']) {
  check(modelVariants().station.includes(v), `station variant ${v} is registered`);
  const obj = modelFor('station', v);
  check(!obj.userData.generic, `${v} is a real variant, not a fallback`);
  const n = tris(obj); const b = budgetOf(`station-${v}`);
  check(b > 0, `models.yaml has a budget for station-${v}`);
  check(n > 0 && n <= b, `${v} builds ${n} triangles within its budget of ${b}`);
  const expect = v.startsWith('tiangong') ? [50, 60] : v === 'shenzhou' ? [16, 18] : v === 'tianzhou' ? [14, 16] : v === 'dragon' ? [7, 9] : [10, 12];
  check(obj.userData.realSizeM > expect[0] && obj.userData.realSizeM < expect[1], `${v} size ${obj.userData.realSizeM} m is within ${expect}`);
  disposeModels(obj);
}
const soyuzRec = { id: 'sat-1', name: 'SOYUZ-MS 28', klass: 'station', layer: 'stations', meta: { noradId: 1 } };
const progRec = { id: 'sat-2', name: 'PROGRESS-MS 35', klass: 'station', layer: 'stations', meta: { noradId: 2 } };
const debRec = { id: 'sat-3', name: 'SOYUZ-MS DEB', klass: 'debris', layer: 'active', meta: { noradId: 3 } };
const cyg = { id: 'sat-4', name: 'CYGNUS NG-24', klass: 'station', layer: 'stations', meta: { noradId: 4 } };
// In production the stations layer does NOT force a class: parsers.js classify() makes visiting
// vehicles klass `satellite` (only ISS/CSS names and six ids are `station`). So the real record
// to test is a klass-satellite Cygnus, and the thing to exclude is Cygnus debris.
const cygSat = { id: 'sat-6', name: 'CYGNUS NG-24', klass: 'satellite', layer: 'stations', meta: { noradId: 6 } };
const cygDeb = { id: 'x', name: 'CYGNUS NG-24 DEB', klass: 'debris', layer: 'active', meta: { noradId: 5 } };
const tianhe = { id: 'sat-48274', name: 'CSS (TIANHE)', klass: 'station', layer: 'stations', meta: { noradId: 48274 } };
const wentian = { id: 'sat-53239', name: 'CSS (WENTIAN)', klass: 'station', layer: 'stations', meta: { noradId: 53239 } };
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: { noradId: 25544 } };
const e1 = realModelFor(soyuzRec), e2 = realModelFor(progRec), e3 = realModelFor(debRec), e4 = realModelFor(iss);
check(e1 && e1.build === 'soyuz' && e1.generic === true && !e1.file, `SOYUZ-MS -> build soyuz, generic: ${JSON.stringify(e1)}`);
check(e2 && e2.build === 'progress' && e2.generic === true, `PROGRESS-MS -> build progress: ${JSON.stringify(e2)}`);
check(e3 === null, 'Soyuz debris keeps the debris shape');
check(e4 && e4.file === 'iss.glb', 'the ISS keeps its own file (the id route wins)');
check(realModelFor(tianhe)?.build === 'tiangong', 'CSS (TIANHE) draws the whole station');
{ const o = modelFor('satellite', 'iridium'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-iridium') && Math.abs(o.userData.realSizeM - 9.4) < 0.01, `iridium builds inside budget at 9.4 m (${tris(o)} tris)`); disposeModels(o); }
check(realModelFor({ id: 'i1', name: 'IRIDIUM 167', klass: 'satellite', layer: 'visual', meta: { noradId: 14 } })?.build === 'iridium', 'an Iridium gets its shape');
{ const o = modelFor('satellite', 'spacemobile'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-spacemobile') && Math.abs(o.userData.realSizeM - 8.02) < 0.01, `spacemobile builds inside budget at 8.02 m (${tris(o)} tris)`); disposeModels(o); }
// The nine live catalogue names as of 2026-09-12, and the two things that must NOT take the shape.
for (const n of ['SPACEMOBILE-001', 'SPACEMOBILE-006', 'SPACEMOBILE-010']) {
  check(realModelFor({ id: `sm-${n}`, name: n, klass: 'satellite', layer: 'visual', meta: { noradId: 16 } })?.build === 'spacemobile', `${n} gets the BlueBird shape`);
}
check(realModelFor({ id: 'smd', name: 'SPACEMOBILE-001 DEB', klass: 'debris', layer: 'active', meta: { noradId: 17 } }) === null, 'SpaceMobile debris keeps the debris shape');
check(realModelFor({ id: 'smr', name: 'FALCON 9 R/B', klass: 'rocket', layer: 'visual', meta: { noradId: 18 } })?.file === 'rocket-body.glb', 'the BlueBird launcher stage stays a rocket body');
check(realModelFor({ id: 'i2', name: 'IRIDIUM 33 DEB', klass: 'debris', layer: 'active', meta: { noradId: 15 } }) === null, 'Iridium 33 debris keeps the debris shape');
check(realModelFor({ id: 'd1', name: 'CREW DRAGON 12', klass: 'satellite', layer: 'stations', meta: { noradId: 11 } })?.build === 'dragon', 'a Crew Dragon gets its shape');
check(realModelFor({ id: 'd2', name: 'DRAGON CRS-33', klass: 'satellite', layer: 'stations', meta: { noradId: 12 } })?.build === 'dragon', 'a cargo Dragon gets its shape');
check(realModelFor({ id: 's6', name: 'SENTINEL-6A', klass: 'satellite', layer: 'notable', meta: { noradId: 46984 } })?.file === 'sentinel6.glb', 'Sentinel-6A gets its own file by id');
check(realModelFor({ id: 'oco', name: 'OCO 2', klass: 'satellite', layer: 'active', meta: { noradId: 21 } })?.file === 'oco2.glb', 'OCO 2 gets its model by name');
check(realModelFor({ id: 'ocod', name: 'OCO 2 DEB', klass: 'debris', layer: 'active', meta: { noradId: 22 } }) === null, 'OCO 2 debris keeps the debris shape');
check(realModelFor({ id: 'cs', name: 'CLOUDSAT', klass: 'satellite', layer: 'active', meta: { noradId: 23 } })?.file === 'cloudsat.glb', 'CloudSat gets its model by name');
check(realModelFor({ id: 'cal', name: 'CALIPSO', klass: 'satellite', layer: 'active', meta: { noradId: 24 } })?.file === 'calipso.glb', 'CALIPSO gets its model by name');
check(realModelFor({ id: 'ic2', name: 'ICESAT-2', klass: 'satellite', layer: 'notable', meta: { noradId: 43613 } })?.file === 'icesat2.glb', 'ICESat-2 gets its own file by id');
// Tselina-2, and the thing the mapping must NOT do. Four of the eighteen COSMOS records on the
// `visual` layer are Tselina-2; seven others are its predecessor Tselina-D -- a different bus at a
// different inclination -- and "also COSMOS, also Soviet, also ELINT" is not a reason to draw them
// as this spacecraft. 1933 and 2221 are Tselina-D (Tsyklon-3, 82.5 deg) and must stay generic.
for (const [id, name] of [[17973, 'COSMOS 1844'], [22219, 'COSMOS 2219'], [23087, 'COSMOS 2278'], [31792, 'COSMOS 2428'], [15333, 'COSMOS 1603'], [26069, 'COSMOS 2369']]) {
  const e = realModelFor({ id: `t-${id}`, name, klass: 'satellite', layer: 'visual', meta: { noradId: id } });
  check(e?.file === 'tselina2.glb' && !e.generic, `${name} is drawn as the Tselina-2 it is, not as a stand-in`);
}
for (const [id, name] of [[18958, 'COSMOS 1933'], [22236, 'COSMOS 2221'], [14699, 'COSMOS 1536']]) {
  check(realModelFor({ id: `td-${id}`, name, klass: 'satellite', layer: 'visual', meta: { noradId: id } }) === null, `${name} is a Tselina-D and keeps the generic shape`);
}
check(realModelFor({ id: 'tdeb', name: 'COSMOS 2219 DEB', klass: 'debris', layer: 'active', meta: { noradId: 99901 } }) === null, 'Tselina-2 debris keeps the debris shape');
{ const j = realModelFor({ id: 'j3', name: 'JASON-3', klass: 'satellite', layer: 'notable', meta: { noradId: 41240 } }); check(j?.file === 'jason.glb' && j.generic === true, 'Jason-3 draws as the OSTM/Jason-2 sister ship, and says so'); }
check(realModelFor({ id: 'd3', name: 'DRAGON 12 DEB', klass: 'debris', layer: 'active', meta: { noradId: 13 } }) === null, 'Dragon debris keeps the debris shape');
check(realModelFor({ id: 'z1', name: 'SHENZHOU-21 (SZ-21)', klass: 'satellite', layer: 'stations', meta: { noradId: 8 } })?.build === 'shenzhou', 'a Shenzhou gets its shape');
check(realModelFor({ id: 'z2', name: 'TIANZHOU-9', klass: 'satellite', layer: 'stations', meta: { noradId: 9 } })?.build === 'tianzhou', 'a Tianzhou gets its shape');
check(realModelFor({ id: 'z3', name: 'CZ-2F R/B', klass: 'rocket', layer: 'active', meta: { noradId: 10 } })?.file === 'rocket-body.glb', 'the Shenzhou launcher stage is a rocket body, not a Shenzhou');
check(realModelFor(wentian)?.build === 'tiangong-module', 'CSS (WENTIAN) draws a single lab module');
const e5 = realModelFor(cyg);
check(e5 && e5.build === 'cygnus' && e5.generic === true, `CYGNUS NG-24 -> build cygnus: ${JSON.stringify(e5)}`);
check(realModelFor(cygSat) && realModelFor(cygSat).build === 'cygnus', 'a Cygnus classified satellite (the production case) gets the shape');
check(realModelFor(cygDeb) === null, 'Cygnus debris keeps the debris shape');
check(realModelFor({ id: 'y', name: 'SOYUZ-MS 28', klass: 'satellite', layer: 'stations', meta: { noradId: 7 } })?.build === 'soyuz', 'a Soyuz classified satellite (the production case) gets the shape');
if (problems.length) { console.log(`station shapes: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('station shapes ok: Soyuz and Progress build inside budget at 10.7 m, and the name route picks them for stations-layer vehicles only');
