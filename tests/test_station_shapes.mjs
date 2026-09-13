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
// OneWeb: 651 objects that had a parabolic dish they do not carry.
{ const o = modelFor('satellite', 'oneweb'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-oneweb') && Math.abs(o.userData.realSizeM - 6) < 0.01, `oneweb builds inside budget at its approximate 6 m span (${tris(o)} tris)`); disposeModels(o); }
for (const n of ['ONEWEB-0012', 'ONEWEB-0644']) {
  const e = realModelFor({ id: `ow-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 92000 } });
  check(e?.build === 'oneweb' && e.generic === true, `${n} is drawn as a OneWeb: ${JSON.stringify(e && e.build)}`);
}
check(realModelFor({ id: 'ow-deb', name: 'ONEWEB-0012 DEB', klass: 'debris', layer: 'active', meta: { noradId: 92001 } }) === null, 'OneWeb debris keeps the debris shape');
// Starlink: 11 131 objects, and the one row in the table that picks its shape from the record.
// The generations differ by an array, the catalogue name does not say which, and the launch year
// does -- for the 84 % of the constellation launched outside 2023.
for (const v of ['starlink-v1', 'starlink-v2']) {
  const o = modelFor('satellite', v);
  check(!o.userData.generic && tris(o) <= budgetOf(`satellite-${v}`), `${v} builds inside budget (${tris(o)} tris)`);
  disposeModels(o);
}
check(Math.abs(modelFor('satellite', 'starlink-v1').userData.realSizeM - 9) < 0.01, 'a v1 Starlink is drawn at 9 m');
check(Math.abs(modelFor('satellite', 'starlink-v2').userData.realSizeM - 30) < 0.01, "a v2 Mini is drawn at SpaceX's published 30 m span");
for (const [year, build] of [[2019, 'starlink-v1'], [2022, 'starlink-v1'], [2023, 'starlink-v2'], [2026, 'starlink-v2']]) {
  const e = realModelFor({ id: `sl-${year}`, name: 'STARLINK-1007', klass: 'satellite', layer: 'active', meta: { noradId: 99000, launchYear: year } });
  check(e?.build === build && e.generic === true, `a Starlink launched in ${year} is drawn as ${build}: ${JSON.stringify(e && e.build)}`);
}
// A record with no launch year at all falls to the current generation rather than throwing.
check(realModelFor({ id: 'sl-none', name: 'STARLINK-9999', klass: 'satellite', layer: 'active', meta: { noradId: 99001 } })?.build === 'starlink-v2',
  'a Starlink with no launch year gets the current generation');
check(realModelFor({ id: 'sl-deb', name: 'STARLINK-1007 DEB', klass: 'debris', layer: 'active', meta: { noradId: 99002, launchYear: 2020 } }) === null,
  'Starlink debris keeps the debris shape');
// `resolve` must not leak to the other rows: an entry without one comes back untouched.
check(realModelFor({ id: 'sl-ir', name: 'IRIDIUM 167', klass: 'satellite', layer: 'active', meta: { noradId: 99003, launchYear: 2019 } })?.build === 'iridium',
  'a row with no resolve() is returned unchanged');
// MMS by id, and the satellite that used to steal its model. ELARASAT MMS-1 is a real object in
// the live catalogue (NORAD 64539) and it is not NASA's Magnetospheric Multiscale; the
// word-boundary rule accepts `mms` followed by a hyphen, so the name route could not tell them
// apart and the class gate could not either, since both are klass `satellite`.
for (const [id, name] of [[40482, 'MMS 1'], [40483, 'MMS 2'], [40484, 'MMS 3'], [40485, 'MMS 4']]) {
  check(realModelFor({ id: `m-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } })?.file === 'mms.glb', `${name} gets the MMS model by id`);
}
check(realModelFor({ id: 'm-elara', name: 'ELARASAT MMS-1', klass: 'satellite', layer: 'active', meta: { noradId: 64539 } }) === null,
  'ELARASAT MMS-1 is not NASA\'s MMS and gets no model');
// The navigation satellites: 130 by name, 29 GLONASS by id, and the thirteen that must NOT match.
{ const o = modelFor('satellite', 'navigation'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-navigation') && Math.abs(o.userData.realSizeM - 13) < 0.01, `navigation builds inside budget at Galileo's 13 m span (${tris(o)} tris)`); disposeModels(o); }
for (const n of ['BEIDOU-3 M1', 'GSAT0210 (GALILEO 15)', 'GPS BIIR-5  (PRN 22)', 'NAVSTAR 81 (USA 319)', 'IRNSS-1A', 'QZS-2 (QZSS/PRN 194)']) {
  const e = realModelFor({ id: `g-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 90100 } });
  check(e?.build === 'navigation', `${n} is drawn as a navigation satellite: ${JSON.stringify(e)}`);
}
// GLONASS by id, because a `cosmos` name key would also catch Tselina-2, Tselina-D and Etalon.
check(realModelFor({ id: 'g-32275', name: 'COSMOS 2433 (720)', klass: 'satellite', layer: 'active', meta: { noradId: 32275 } })?.build === 'navigation', 'a GLONASS catalogued as COSMOS gets the navigation shape by id');
check(realModelFor({ id: 'g-22219', name: 'COSMOS 2219', klass: 'satellite', layer: 'visual', meta: { noradId: 22219 } })?.file === 'tselina2.glb', 'and a Tselina-2 catalogued as COSMOS still gets its own model, not the navigation shape');
// The augmentation payloads: communications satellites with dishes that carry a navigation
// payload. GSAT-8 is the trap a `gsat` key would have fallen into.
for (const n of ['GSAT-8 (GAGAN/PRN 127)', 'INMARSAT 4-F2 (SOUTHPAN/PRN 122)', 'SES-5 (EGNOS/PRN 136)', 'LUCH 5A (SDCM/PRN 140)', 'EUTELSAT 117 WEST B (WAAS/PRN 131)']) {
  const e = realModelFor({ id: `x-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 90101 } });
  check(!e || e.build !== 'navigation', `${n} carries a navigation payload and is NOT a navigation satellite: ${JSON.stringify(e)}`);
}
// The 3U CubeSats, by name because the id list of a constellation launched in batches would be
// stale within the month. The real catalogue names, and the debris that must not take the shape.
{ const o = modelFor('satellite', 'cubesat'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-cubesat') && Math.abs(o.userData.realSizeM - 0.5) < 0.001, `cubesat builds inside budget at a 0.50 m deployed span (${tris(o)} tris)`); disposeModels(o); }
for (const n of ['FLOCK 4Q-16', 'FLOCK 4V-1', 'LEMUR-2-GREENBERG', 'LEMUR-1']) {
  const e = realModelFor({ id: `c-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 90001 } });
  check(e?.build === 'cubesat' && e.generic === true, `${n} is drawn as the 3U CubeSat it is`);
}
check(realModelFor({ id: 'c-deb', name: 'FLOCK 2E-1 DEB', klass: 'debris', layer: 'active', meta: { noradId: 90002 } }) === null, 'Flock debris keeps the debris shape');
check(realModelFor({ id: 'c-rb', name: 'FALCON 9 R/B', klass: 'rocket', layer: 'active', meta: { noradId: 90003 } })?.file === 'rocket-body.glb', 'the stage that launched them is still a rocket body');
// ACS3 and the nine laser-ranging spheres, both procedural, both `norad:` rows.
{ const o = modelFor('satellite', 'solarsail'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-solarsail') && Math.abs(o.userData.realSizeM - 9 * Math.SQRT2) < 0.01, `solarsail builds inside budget at the 9 m sail's diagonal (${tris(o)} tris)`); disposeModels(o); }
{ const o = modelFor('satellite', 'sphere'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-sphere') && Math.abs(o.userData.realSizeM - 2.15) < 0.01, `sphere builds inside budget at AJISAI's 2.15 m (${tris(o)} tris)`); disposeModels(o); }
{ const e = realModelFor({ id: 'acs3', name: 'ACS3', klass: 'satellite', layer: 'visual', meta: { noradId: 59588 } });
  check(e?.build === 'solarsail' && !e.generic && !e.file, `ACS3 is drawn from its own published numbers, not as a family: ${JSON.stringify(e)}`); }
for (const [id, name] of [[16908, 'AJISAI (EGS)'], [8820, 'LAGEOS 1'], [19751, 'COSMOS 1989 (ETALON 1)'], [25398, 'WESTPAC']]) {
  const e = realModelFor({ id: `s-${id}`, name, klass: 'satellite', layer: 'visual', meta: { noradId: id } });
  check(e?.build === 'sphere' && e.generic === true, `${name} is a sphere, and says it is the kind of thing`);
}
// The radar imagers: one shape, twenty-two spacecraft, thirty years and four continents apart.
{ const o = modelFor('satellite', 'radar'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-radar') && Math.abs(o.userData.realSizeM - 12.3) < 0.01, `radar builds inside budget at Sentinel-1's 12.3 m antenna (${tris(o)} tris)`); disposeModels(o); }
for (const [id, name] of [[39634, 'SENTINEL-1A'], [23710, 'RADARSAT-1'], [31698, 'TERRASAR-X'], [28931, 'ALOS (DAICHI)'], [43641, 'SAOCOM 1A'], [21574, 'ERS-1'], [27386, 'ENVISAT'], [67304, 'CSG-3']]) {
  const e = realModelFor({ id: `r-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } });
  check(e?.build === 'radar' && e.generic === true, `${name} is a radar imager, and says it is the kind of thing`);
}
// ALOS DEB is debris from the same spacecraft and must not take the shape: the id route has no
// class gate, so this is asserted on the id the catalogue actually gives the debris.
check(realModelFor({ id: 'r-35418', name: 'ALOS DEB', klass: 'debris', layer: 'active', meta: { noradId: 35418 } }) === null, 'ALOS debris keeps the debris shape');
// Seasat and the RADARSAT Constellation take the blade; the RISAT-2B family takes the umbrella.
// Both by id: `risat` as a key is safe today -- the word boundary rejects TIGRISAT and BRISAT --
// and would be wrong if RISAT-1, which flew a planar array, ever came back to the catalogue.
for (const [id, name] of [[10967, 'SEASAT 1'], [44322, 'RCM-1'], [44323, 'RCM-3'], [44324, 'RCM-2']]) {
  check(realModelFor({ id: `b-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } })?.build === 'radar', `${name} takes the flat blade`);
}
for (const [id, name] of [[44233, 'RISAT-2B'], [44857, 'RISAT-2BR1'], [46905, 'RISAT-2BR2']]) {
  check(realModelFor({ id: `u-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } })?.build === 'radar-mesh', `${name} takes the umbrella, not the blade`);
}
// The two that merely contain the letters, and are neither.
for (const [id, name] of [[40043, 'TIGRISAT'], [41591, 'BRISAT']]) {
  const e = realModelFor({ id: `n-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } });
  check(!e || (e.build !== 'radar' && e.build !== 'radar-mesh'), `${name} is not a RISAT and gets neither radar shape`);
}
// The commercial small SAR fleets, by name. Same flat side-looking blade, much smaller: ICEYE's
// antenna is 3.25 m on an 85 kg microsatellite against RADARSAT-2's 15 m.
for (const n of ['ICEYE-X2', 'ICEYE-X31', 'STRIX-1', 'PAZ', 'NOVASAR 1', 'GAOFEN-3 02']) {
  const e = realModelFor({ id: `sar-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 91000 } });
  check(e?.build === 'radar' && e.generic === true, `${n} is a radar imager: ${JSON.stringify(e && e.build)}`);
}
// ...and the three that carry a MESH REFLECTOR rather than a blade. They must not get the blade --
// that would be the same error as giving a navigation satellite a dish, run backwards -- and since
// the umbrella exists they get that instead of staying generic.
{ const o = modelFor('satellite', 'radar-mesh'); check(!o.userData.generic && tris(o) <= budgetOf('satellite-radar-mesh') && Math.abs(o.userData.realSizeM - 3.5) < 0.01, `radar-mesh builds inside budget at Capella's 3.5 m reflector (${tris(o)} tris)`); disposeModels(o); }
for (const n of ['CAPELLA-11 (ACADIA-1)', 'UMBRA-07', 'QPS-SAR-5 (TSUKUYOMI-I)', 'QPS-SAR-12 (KUSHINADA-I)']) {
  const e = realModelFor({ id: `mesh-${n}`, name: n, klass: 'satellite', layer: 'active', meta: { noradId: 91001 } });
  check(e?.build === 'radar-mesh', `${n} unfurls a mesh reflector and gets the umbrella: ${JSON.stringify(e && e.build)}`);
  check(e?.build !== 'radar', `${n} does not get the flat blade`);
}
// 52307 is STARLINK-3755, not LARES-2. An id that is often quoted for a sphere and is not one.
{
  // 52307 is STARLINK-3755, an id often quoted for LARES-2. It must not get the sphere; since the
  // Starlink row landed it now correctly gets a Starlink instead, so the assertion is on the thing
  // that matters -- not a ball -- rather than on "no shape at all", which it briefly was.
  const e = realModelFor({ id: 's-52307', name: 'STARLINK-3755', klass: 'satellite', layer: 'active', meta: { noradId: 52307, launchYear: 2022 } });
  check(e && e.build !== 'sphere', `STARLINK-3755 is not LARES-2 and gets no sphere: ${JSON.stringify(e && e.build)}`);
  check(e?.build === 'starlink-v1', 'and it gets the Starlink its name says it is');
}
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
// The NASA science set task 9f left open. Every id here was wrong, missing or called uncertain in
// that task; every one was answerable in one catalogue query. 44387 -- the id 9f floated for ICON
// -- is METEOR-M2 2, so the negative case is asserted too.
for (const [id, name, file] of [
  [33053, 'FGRST (GLAST)', 'fermi.glb'],
  [29479, 'HINODE (SOLAR-B)', 'hinode.glb'],
  [44628, 'ICON', 'icon.glb'],
  [39574, 'GPM-CORE', 'gpm.glb'],
  [24883, 'ORBVIEW 2 (SEASTAR)', 'seastar.glb'],
  [41884, 'CYGFM05', 'cygnss.glb'],
  [41891, 'CYGFM03', 'cygnss.glb'],
]) {
  const e = realModelFor({ id: `n-${id}`, name, klass: 'satellite', layer: 'active', meta: { noradId: id } });
  check(e?.file === file && !e.generic, `${name} (${id}) draws ${file} as itself`);
}
check(realModelFor({ id: 'n-44387', name: 'METEOR-M2 2', klass: 'satellite', layer: 'active', meta: { noradId: 44387 } }) === null,
  'METEOR-M2 2 is not ICON: the id task 9f floated maps to nothing');
check(realModelFor({ id: 'n-41889', name: 'CYGFM06', klass: 'satellite', layer: 'active', meta: { noradId: 41889 } }) === null,
  'CYGFM06 is not in the catalogue and is not mapped');
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

// ------------------------------------------------------------------ NOTHING FLOATS OFF THE HULL
//
// A procedural vehicle is a handful of boxes and cylinders placed by hand, and a placement can be
// wrong in a way nothing here would have noticed: the shape still builds, still fits its triangle
// budget, and still declares a plausible size. Tiangong's wings were placed with a quarter-turn
// that left panelWing()'s root pointing the wrong way, so both arrays sat TEN METRES clear of the
// module with empty space between -- at hero size Wentian read as three unrelated objects drifting
// in formation. The declared size was 4 m off, which is well inside any tolerance worth setting,
// so a size check would not have caught it either. The gap is what gives it away.
//
// So: every mesh must touch something. The measure is the gap between axis-aligned world boxes,
// as a fraction of the model's own longest dimension, and a part is attached if it comes within
// 3 % of ANY other part -- not of the hull specifically, because a panel legitimately hangs off a
// mast that hangs off a boom.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const boxGap = (a, b) => Math.max(
    0,
    a.min.x - b.max.x, b.min.x - a.max.x,
    a.min.y - b.max.y, b.min.y - a.max.y,
    a.min.z - b.max.z, b.min.z - a.max.z,
  );
  // Juno's three LEGO figures: Galileo holds his globe out at arm's length, and at 4 cm the whole
  // group is a prop, not a vehicle. It is the one deliberate gap in the app and it is named here
  // rather than raising the threshold for everything else.
  const ALLOWED = new Set(['oddity:minifigures']);
  let checked = 0;
  let worst = { id: '-', gap: 0 };
  for (const [klass, variants] of Object.entries(modelVariants())) {
    if (klass === 'world') continue; // worlds.js owns the worlds; modelFor returns an empty group
    for (const variant of variants) {
      const id = `${klass}:${variant}`;
      const obj = modelFor(klass, variant);
      obj.updateMatrixWorld(true);
      const parts = [];
      obj.traverse((o) => { if (o.isMesh) parts.push({ name: o.name || '(unnamed)', box: new THREE.Box3().setFromObject(o) }); });
      const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z) || 1;
      if (parts.length > 1 && !ALLOWED.has(id)) {
        checked += 1;
        for (const part of parts) {
          let nearest = Infinity;
          for (const other of parts) if (other !== part) nearest = Math.min(nearest, boxGap(part.box, other.box));
          const gap = nearest / span;
          if (gap > worst.gap) worst = { id, gap, part: part.name };
          check(gap <= 0.03,
            `${id}: "${part.name}" floats ${(gap * 100).toFixed(1)} % of the model clear of every other part`);
        }
      }
      disposeModels(obj);
    }
  }
  check(checked > 20, `the no-floating-part check ran on ${checked} shapes, which is too few to mean anything`);
  if (!problems.length) console.log(`  every part of ${checked} shapes touches another; the loosest is ${worst.id} "${worst.part}" at ${(worst.gap * 100).toFixed(1)} %`);
}

if (problems.length) { console.log(`station shapes: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('station shapes ok: Soyuz and Progress build inside budget at 10.7 m, and the name route picks them for stations-layer vehicles only');
