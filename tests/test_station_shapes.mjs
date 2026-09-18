// The procedural visiting-vehicle shapes (spec 0027): they build, they fit their budget, and the
// name route picks them for the right records only.
//   node tests/test_station_shapes.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { modelFor, modelVariants, disposeModels } = await import(join(ROOT, 'site/js/scene/models.js'));
const { realModelFor } = await import(join(ROOT, 'site/js/scene/realmodels.js'));
const { GEO_RING } = await import(join(ROOT, 'site/js/data/parsers.js'));
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

// ----------------------------------------------- THE GEOSTATIONARY RING IS AN ORBIT, NOT A LAYER
//
// `geo-ring` and `active` read the SAME CelesTrak file, so the same satellite arrives on both --
// and the bus used to be keyed off `record.layer === 'geo-ring'`, so which shape a person saw
// depended on which checkbox they had ticked. Against the live catalogue on 2026-09-12 that was
// 410 objects in the ring -- mostly commercial communications satellites, and weather, Earth-
// observation and classified ones too -- drawn as a generic comms drum on the layer that is on by
// default.
{
  const ring = (over = {}) => ({
    id: 'geo-x', name: 'ABS-2', klass: 'satellite', layer: 'active',
    meta: { noradId: 990001, meanMotion: 1.003, eccentricity: 0.0002, inclinationDeg: 0.03, ...over },
  });
  const bus = realModelFor(ring());
  check(bus?.file === 'bus-ssl1300.glb' && bus.generic === true,
    `a geostationary satellite on the active layer draws the bus: ${JSON.stringify(bus)}`);
  // The identity matters: two rows saying the same thing are two rows that can come to disagree.
  check(realModelFor({ ...ring(), layer: 'geo-ring' }) === bus,
    'the ring layer and the orbit rule return the SAME entry, not two copies of it');

  // Klass-gated. A spent stage or a fragment in the ring keeps the shape of what it is.
  for (const klass of ['rocket', 'debris']) {
    check(realModelFor({ ...ring(), klass }) === null, `a ${klass} in the ring does not draw a comms bus`);
  }
  // And the band is the band: each threshold refused on its own.
  for (const [what, over] of [
    ['a LEO satellite', { meanMotion: 15.5 }],
    ['a GTO transfer orbit', { eccentricity: 0.7 }],
    ['a 30-degree inclined orbit', { inclinationDeg: 30 }],
    ['a 12-hour orbit', { meanMotion: 2.006 }],
    ['a record with no elements', { meanMotion: null, eccentricity: null, inclinationDeg: null }],
  ]) {
    check(realModelFor(ring(over)) === null, `${what} does not draw the geostationary bus`);
  }
  // Every route above the orbit still wins.
  check(realModelFor({ ...ring(), name: 'GOES 18' })?.file === 'goes.glb',
    'a named satellite in the ring keeps its own model');

  // AND IT CLAIMS ONLY WHAT THE ORBIT SHOWS. The card prints this name as "drawn as ___ -- the
  // kind of thing". It said "a communications satellite", which is false for the weather,
  // Earth-observation and surveillance satellites the same rule reaches: an orbit does not tell
  // you what a satellite is for.
  for (const name of ['HIMAWARI-9', 'FENGYUN 4B', 'ELEKTRO-L 3', 'GAOFEN-4', 'USA 270']) {
    const e = realModelFor({ ...ring(), name });
    check(e === bus && !/communicat|weather|television|relay/i.test(e.name),
      `${name} in the ring is drawn as ${JSON.stringify(e && e.name)}, which must not claim a mission`);
  }

  // AND THE THRESHOLDS ARE THE REGISTRY'S. registry/layers.yaml is the authority and the numbers
  // were hand-copied into layers.js once already; a copy that nothing compares is a copy that
  // drifts.
  const row = (readFileSync(join(ROOT, 'registry/layers.yaml'), 'utf8')
    .match(/id: geo-ring[\s\S]*?select: \{([^}]*)\}/) || [])[1] || '';
  const nums = (row.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const want = [GEO_RING.meanMotionMin, GEO_RING.meanMotionMax, GEO_RING.eccBelow, GEO_RING.inclBelowDeg];
  check(nums.length === 4 && nums.every((n, i) => n === want[i]),
    `layers.yaml says ${JSON.stringify(nums)} and parsers.js says ${JSON.stringify(want)}`);
}

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
// The measure is the gap between axis-aligned world boxes as a fraction of the model's longest
// dimension, and two parts count as joined at 3 % -- not to the hull specifically, because a panel
// legitimately hangs off a mast that hangs off a boom.
//
// IT IS ONE CONNECTED COMPONENT, NOT "EVERY PART HAS A NEIGHBOUR". The first version of this
// check asked each mesh for its nearest neighbour, and Soyuz walked straight through it: its two
// wings were detached from the hull by 1.15 m, but each wing's panel and mast touch EACH OTHER,
// so every part had a neighbour and the vehicle was three separate clusters flying in formation.
// A union-find over the same 3 % is the same measurement asked correctly.
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
        const parent = parts.map((_, i) => i);
        const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        let closestSplit = Infinity;
        for (let i = 0; i < parts.length; i += 1) {
          for (let j = i + 1; j < parts.length; j += 1) {
            const gap = boxGap(parts[i].box, parts[j].box) / span;
            if (gap <= 0.03) { parent[find(i)] = find(j); }
          }
        }
        const groups = new Map();
        for (let i = 0; i < parts.length; i += 1) {
          const root = find(i);
          if (!groups.has(root)) groups.set(root, []);
          groups.get(root).push(parts[i].name);
        }
        // The narrowest gap BETWEEN components is what a person would have to close to make the
        // vehicle one object, so report that rather than "they are not touching".
        if (groups.size > 1) {
          for (let i = 0; i < parts.length; i += 1) {
            for (let j = i + 1; j < parts.length; j += 1) {
              if (find(i) === find(j)) continue;
              closestSplit = Math.min(closestSplit, boxGap(parts[i].box, parts[j].box) / span);
            }
          }
        }
        check(groups.size === 1,
          `${id}: not one object but ${groups.size} -- ` +
            `${[...groups.values()].map((names) => `{${[...new Set(names)].join(', ')}}`).join(' + ')}` +
            `, nearest pair ${(closestSplit * 100).toFixed(1)} % of the model apart`);
        for (const part of parts) {
          let nearest = Infinity;
          for (const other of parts) if (other !== part) nearest = Math.min(nearest, boxGap(part.box, other.box));
          if (nearest / span > worst.gap) worst = { id, gap: nearest / span, part: part.name };
        }
      }
      disposeModels(obj);
    }
  }
  check(checked > 20, `the no-floating-part check ran on ${checked} shapes, which is too few to mean anything`);

  // ------------------------------------------------------------------ AND IT IS ABOUT ONE UNIT
  //
  // models.js's scale convention: "each model is built so its longest dimension is about 1 unit",
  // with `realSizeM` the metres that unit stands for. Every vehicle builder divides real metres by
  // its own span to get there, so the unit is not decoration -- it is the arithmetic that keeps a
  // wing's length honest against its own hull. When it slips, something inside the model is out of
  // proportion with the rest of it:
  //
  //   JWST built 0.62 of a unit, because the mirror was 77 % of the sunshield's width where the
  //   real one is 34 %. A 16 m primary on a 21 m shield.
  //   Soyuz built 0.88, because its wings spanned 7.8 m of a hull that declares 10.7.
  //   Cygnus built 1.15, because its booms were twice the length that its own cited 11.5 m
  //   tip-to-tip allows.
  //
  // Vehicles only. A rocket is 1.40 by construction (the plume), a site marker and an oddity prop
  // are not normalised by anything real, and an asteroid is a seeded blob.
  const UNIT_EXEMPT = new Map([
    // A square sail's longest dimension is its DIAGONAL, which is what realSizeM records and what
    // the builder divides by -- so an axis-aligned bounding box is 1/sqrt(2) of it by construction.
    ['satellite:solarsail', 0.707],
    // Normalised by Capella's published 3.5 m reflector, and a wrapped-rib antenna really does
    // carry its rib tips proud of the mesh, so the box runs a little past the dish.
    ['satellite:radar-mesh', 1.086],
  ]);
  // ROCKETS ARE MEASURED WITH THE PLUME HIDDEN, which is the state they are built in. buildRocket
  // adds a `plume-cone` 0.4 units long below the nozzle and leaves it invisible until heroes.js
  // sees a burn, so the full box of every rocket in the file is 1.40 and the drawn one is 1.01.
  // Measuring the full box would have declared all fifty of them 40 % wrong and taught nothing;
  // measuring the visible one holds them to the same convention as everything else.
  const visibleSize = (root) => {
    const box = new THREE.Box3();
    root.updateMatrixWorld(true);
    root.traverse((n) => {
      if (!n.isMesh) return;
      for (let p = n; p; p = p.parent) if (!p.visible) return;
      box.expandByObject(n);
    });
    return box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3());
  };
  // A rocket gets a little more room than a spacecraft: it is normalised by the vehicle's quoted
  // height and the engine bell hangs below the bottom of the stage, which is true of the hardware.
  // Themis is the worst of the fifty at 1.063, because a 28 m vehicle's Prometheus bell is a
  // bigger fraction of it than a Falcon 9's Merlins are of 70 m.
  const TOLERANCE = { station: 0.06, satellite: 0.06, rocket: 0.08, probe: 0.06, telescope: 0.06 };
  let units = 0;
  // PROBES AND TELESCOPES JOINED THIS LIST on 2026-09-17. They were the last two classes in spec
  // 0027 amendment 3 section 5's open list -- `probe:default` built 0.855 of a unit and
  // `telescope:default` 0.920, both because one part stopped short: a magnetometer boom and a pair
  // of solar wings. Both are now normalised like everything else, and the three named spacecraft
  // added alongside them -- Gaia, Solar Orbiter, New Horizons -- are built from published metres
  // divided by their own published overall size, so they are 1.000 by construction rather than by
  // tuning. The classes still absent are the ones nothing real normalises: a site marker, an
  // oddity prop, a seeded asteroid, a comet and a debris shard.
  for (const klass of ['station', 'satellite', 'rocket', 'probe', 'telescope']) {
    for (const variant of modelVariants()[klass]) {
      const id = `${klass}:${variant}`;
      const obj = modelFor(klass, variant);
      const size = visibleSize(obj);
      const built = Math.max(size.x, size.y, size.z);
      const want = UNIT_EXEMPT.get(id) ?? 1;
      const tol = TOLERANCE[klass];
      units += 1;
      check(Math.abs(built - want) <= tol,
        `${id} builds ${built.toFixed(3)} units where the convention is ${want} ` +
          `-- ${(Math.abs(built - want) * 100).toFixed(0)} % of the model is out of proportion with the rest of it`);
      disposeModels(obj);
    }
  }
  if (!problems.length) console.log(`  ${units} vehicle shapes hold the one unit they declare, rockets measured with the plume hidden`);
  if (!problems.length) console.log(`  each of ${checked} shapes is ONE connected object; the loosest joint is ${worst.id} "${worst.part}" at ${(worst.gap * 100).toFixed(1)} %`);
}

// THE DEEP-SPACE LAYER'S OWN SPACECRAFT.
//
// `deep-space` holds ten records. Seven have a NASA model; Gaia, Solar Orbiter and New Horizons had
// nothing and fell through to the generic shape for their class -- so an app whose whole premise is
// that a named object looks like itself drew Gaia, a ten-metre disc, as a tube with two wings.
//
// Every one of the ten is checked here, against the real bundled records rather than hand-made
// ones, because "which shape does this record get" is the question that was being answered wrongly
// and a route is only worth anything if it fires on the data the app actually loads.
{
  const { sampleDeepSpace } = await import(join(ROOT, 'site/js/data/sample.js'));
  const rows = sampleDeepSpace();
  check(rows.length === 10, `the deep-space layer still holds ten records (found ${rows.length})`);
  const want = {
    'deep-jwst': 'jwst.glb', 'deep-soho': 'soho.glb', 'deep-mro': 'mro.glb', 'deep-juno': 'juno.glb',
    'deep-voyager-1': 'voyager.glb', 'deep-voyager-2': 'voyager.glb', 'deep-parker': 'parker.glb',
    'deep-gaia': 'build:gaia', 'deep-new-horizons': 'build:new-horizons',
    'deep-solar-orbiter': 'build:solar-orbiter',
  };
  for (const r of rows) {
    const e = realModelFor(r);
    const got = e && e.file ? e.file : e && e.build ? `build:${e.build}` : null;
    if (want[r.id]) check(got === want[r.id], `${r.name} is drawn as ${want[r.id]}, not ${got}`);
    else check(got !== null, `${r.name} (${r.id}) has no shape at all -- it would fall back to the generic one`);
  }
  // 1279 Gaia is a main-belt asteroid. Without the klass gate on the name route it would be drawn
  // with a ten-metre sunshield, which is the TESS mistake -- a comet wearing a telescope -- exactly.
  const rock = realModelFor({ id: 'a-1279', name: '1279 Gaia', klass: 'asteroid', layer: 'asteroids', meta: {} });
  check(!rock || rock.build !== 'gaia', `the asteroid 1279 Gaia must not be drawn as the spacecraft: ${JSON.stringify(rock)}`);
  // Same shape of trap on the other side: a comet discovered by Solar Orbiter keeps its own shape.
  const comet = realModelFor({ id: 'c-so', name: 'C/2021 A1 (Solar Orbiter)', klass: 'comet', layer: 'comets', meta: {} });
  check(!comet || comet.build !== 'solar-orbiter', `a comet named Solar Orbiter must not get the spacecraft: ${JSON.stringify(comet)}`);
  // The three new shapes are real variants, inside budget, at the size their sources publish.
  for (const [klass, variant, sizeM] of [['telescope', 'gaia', 10.2], ['probe', 'solar-orbiter', 18], ['probe', 'new-horizons', 3.2]]) {
    const o = modelFor(klass, variant);
    const b = budgetOf(`${klass}-${variant}`);
    check(!o.userData.generic, `${klass}:${variant} is a real variant, not a fallback`);
    check(b > 0 && tris(o) <= b, `${klass}:${variant} builds ${tris(o)} triangles within its budget of ${b}`);
    check(Math.abs(o.userData.realSizeM - sizeM) < 0.01, `${klass}:${variant} is drawn at its published ${sizeM} m, not ${o.userData.realSizeM}`);
    disposeModels(o);
  }
  if (!problems.length) console.log('  all ten deep-space spacecraft have their own shape; 1279 Gaia the asteroid does not get one');
}

// THE RIGHT KIND OF THING. Measured against the live stations and visual catalogues on 2026-09-18:
// two ISS modules catalogued on their own were drawn as a second, different space station; a 1963
// Centaur stage catalogued as a payload was drawn -- and described on its card -- as "a generic
// satellite"; five space telescopes were drawn as a communications satellite with a dish. Records
// here are built by id alone, because the id is what the route keys on and the test must not need
// the network. scripts/check-model-ids.sh checks the ids against CelesTrak.
{
  const rec = (noradId, name, klass, layer) => ({ id: `sat-${noradId}`, name, klass, layer, meta: { noradId } });
  for (const [id, name] of [[49044, 'ISS (NAUKA)'], [36086, 'POISK']]) {
    const e = realModelFor(rec(id, name, 'station', 'stations'));
    check(e?.file === 'iss.glb' && !e.generic, `${name} is part of the ISS and is drawn as it: ${JSON.stringify(e)}`);
  }
  const stage = realModelFor(rec(694, 'ATLAS CENTAUR 2', 'satellite', 'visual'));
  check(stage?.file === 'rocket-body.glb' && stage.generic === true, `ATLAS CENTAUR 2 is a spent Centaur stage: ${JSON.stringify(stage)}`);
  for (const [id, name] of [[3597, 'OAO 2'], [6153, 'OAO 3 (COPERNICUS)'], [41337, 'ASTRO-H (HITOMI)'], [42758, 'HXMT (HUIYAN)'], [57800, 'XRISM']]) {
    const e = realModelFor(rec(id, name, 'satellite', 'visual'));
    check(e?.build === 'space-telescope' && e.generic === true, `${name} is drawn as a space telescope: ${JSON.stringify(e)}`);
  }
  // The variant those five name must exist for a klass-satellite record -- otherwise modelFor falls
  // back to the comms dish with `generic` set, and the route would change nothing on screen.
  const scope = modelFor('satellite', 'space-telescope');
  check(!scope.userData.generic, 'satellite:space-telescope is a real variant, not the comms fallback');
  check(scope.getObjectByName('boresight') !== undefined, 'satellite:space-telescope is the telescope tube');
  check(tris(scope) <= budgetOf('satellite-space-telescope'), `satellite:space-telescope builds ${tris(scope)} tris inside its budget`);
  disposeModels(scope);
  if (!problems.length) console.log('  Nauka and Poisk draw the ISS, a 1963 Centaur stage draws as a stage, five observatories as telescopes');
}

// A CROWD OF FRAGMENTS, NOT ONE FRAGMENT REPEATED.
//
// buildComet and buildDebris had the asteroids' miss exactly: a seed nothing passed, so sixty
// comets shared one nucleus and every debris shard in a field was the same shard. Debris is the
// one drawn in crowds, and a crowd of identical shapes reads as a rendering bug -- which is the
// complaint the docked-vehicle rule already exists to answer.
//
// No size rule for either: MPCORB publishes elements and not nucleus dimensions, and a catalogue
// fragment has no published size at all. Only the seed varies, and the test says only that.
{
  const shapeSig = (klass, record) => {
    const obj = modelFor(klass, undefined, { record });
    let sig = 0;
    obj.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      const p = n.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 7) sig = (sig * 31 + Math.round(p.getX(i) * 1e5) + Math.round(p.getZ(i) * 1e5)) | 0;
    });
    disposeModels(obj);
    return sig;
  };
  for (const klass of ['comet', 'debris']) {
    const seen = new Set();
    const N = 12;
    for (let i = 0; i < N; i += 1) seen.add(shapeSig(klass, { id: `${klass}-${i}`, klass, meta: {} }));
    check(seen.size === N, `${N} ${klass} records should build ${N} shapes, not ${seen.size}`);
    // The same record twice is the SAME shape: seeded, not random. Nothing in this project uses
    // Math.random, and a shape that changed between two frames would be the loudest bug in the app.
    const a = shapeSig(klass, { id: `${klass}-stable`, klass, meta: {} });
    const b = shapeSig(klass, { id: `${klass}-stable`, klass, meta: {} });
    check(a === b, `the same ${klass} record must build the same shape twice (${a} vs ${b})`);
    // And a record with no id at all still builds something rather than throwing.
    check(Number.isFinite(shapeSig(klass, { klass, meta: {} })), `a ${klass} with no id still builds`);
  }
  if (!problems.length) console.log('  comets and debris are seeded per record, and the same record twice is the same shape');
}

// TEN NAMED ROCKS, TEN SHAPES, AND THE BIG ONES ROUND.
//
// buildAsteroid always took a seed and nothing ever passed one -- `meta.modelVariant` is null for
// every asteroid -- so `seedOf('asteroid:0')` ran once per rock and the layer drew ten named
// objects as ONE lump. Measured before the fix: Ceres, a 939 km dwarf planet, had the same 540
// vertices in the same places as Itokawa, a 330 m rubble pile.
//
// The rule that replaced it is physical rather than decorative: a body holds whatever shape an
// impact left it in until it is heavy enough to pull itself round. So roundness is asserted as an
// ORDER over the real bundled records, not as a set of magic numbers -- it has to survive somebody
// retuning the constants, and it fails the moment the shape stops depending on the size.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { sampleAsteroids } = await import(join(ROOT, 'site/js/data/sample.js'));
  const rocks = sampleAsteroids();
  check(rocks.length >= 8, `the bundled asteroid list is still worth testing (${rocks.length} rows)`);

  const shapeOf = (record) => {
    const obj = modelFor('asteroid', undefined, { record });
    obj.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    let sig = 0;
    obj.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      const p = n.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 13) sig = (sig * 31 + Math.round(p.getX(i) * 1e5) + Math.round(p.getY(i) * 1e5)) | 0;
    });
    disposeModels(obj);
    const mx = Math.max(size.x, size.y, size.z);
    const mn = Math.min(size.x, size.y, size.z);
    return { sig, roundness: mn / mx, realSizeM: obj.userData.realSizeM };
  };

  const seen = new Map();
  for (const r of rocks) {
    const { sig } = shapeOf(r);
    seen.set(sig, [...(seen.get(sig) || []), r.name]);
  }
  const shared = [...seen.values()].filter((names) => names.length > 1);
  check(seen.size === rocks.length,
    `each of the ${rocks.length} asteroids has its own shape; these share one: ${shared.map((n) => n.join(' = ')).join('; ')}`);

  // Bigger is rounder, across four objects three orders of magnitude apart. Ceres and Itokawa are
  // the ends of the real range and the pair that was drawn identically.
  const by = (name) => rocks.find((r) => r.name === name);
  const order = ['Ceres', 'Vesta', 'Eros', 'Itokawa'];
  const got = order.map((n) => (by(n) ? { n, ...shapeOf(by(n)), km: by(n).meta.diameterKm } : null));
  if (got.every(Boolean)) {
    for (let i = 1; i < got.length; i += 1) {
      check(got[i - 1].roundness > got[i].roundness,
        `${got[i - 1].n} (${got[i - 1].km} km) should be rounder than ${got[i].n} (${got[i].km} km): ` +
          `${got[i - 1].roundness.toFixed(3)} vs ${got[i].roundness.toFixed(3)}`);
    }
    check(got[0].roundness > 0.99, `Ceres is a dwarf planet and should be drawn round, not ${got[0].roundness.toFixed(3)}`);
    check(got[3].roundness < 0.8, `Itokawa is a rubble pile and should be drawn lumpy, not ${got[3].roundness.toFixed(3)}`);
    // And the size the model declares is the size the record measured, not a constant 500 m.
    check(Math.abs(got[0].realSizeM - 939000) < 1, `Ceres should declare its measured 939 km, not ${got[0].realSizeM} m`);
  } else {
    problems.push('ROCKS the bundled asteroid list no longer contains Ceres, Vesta, Eros and Itokawa');
  }
  // Vesta has a real shape model now -- Dawn's, from NASA's 3D Printing collection -- and routes by
  // name like Bennu. The same collection's Eros and Itokawa are NOT used: both are cut in half for
  // printing and laid out as two pieces, and reassembling them would be a guess.
  const vesta = rocks.find((r) => r.name === 'Vesta');
  check(vesta && realModelFor(vesta)?.file === 'asteroid-vesta.glb', `Vesta is drawn from its shape model: ${JSON.stringify(vesta && realModelFor(vesta))}`);
  // Eros wears Gaskell's PDS shape model, which is one piece. Itokawa has no model yet: its only
  // single-piece model is built from JAXA imagery with JAXA co-authors, which is exactly the "other
  // restrictions" case NASA's CC0 policy carves out, so it waits for a licensing decision.
  const eros = rocks.find((r) => r.name === 'Eros');
  check(eros && realModelFor(eros)?.file === 'asteroid-eros.glb', `Eros is drawn from Gaskell's shape model: ${JSON.stringify(eros && realModelFor(eros))}`);
  const itokawa = rocks.find((r) => r.name === 'Itokawa');
  check(!itokawa || !realModelFor(itokawa)?.file, `Itokawa has no cleared model and must keep the procedural shape: ${JSON.stringify(itokawa && realModelFor(itokawa))}`);
  // The klass gate: anything that is not an asteroid and happens to share the name keeps its shape.
  // EROS A and EROS B are real Israeli imaging satellites in the live catalogue.
  check(realModelFor({ id: 's-vesta', name: 'VESTA', klass: 'satellite', layer: 'active', meta: {} }) === null,
    'a satellite named VESTA must not be drawn as the asteroid');
  check(realModelFor({ id: 's-erosb', name: 'EROS B', klass: 'satellite', layer: 'active', meta: { noradId: 29079 } })?.file !== 'asteroid-eros.glb',
    'the satellite EROS B must not be drawn as a 33 km asteroid');
  // A record with no measured diameter must still build something rather than throw or vanish.
  const unknown = shapeOf({ id: 'a-unknown', name: 'unmeasured', klass: 'asteroid', layer: 'asteroids', meta: {} });
  check(unknown.roundness > 0 && unknown.realSizeM > 0, 'an asteroid with no measured diameter still builds a rock');
  if (!problems.some((p) => p.startsWith('ROCKS'))) {
    console.log(`  ${rocks.length} asteroids, ${seen.size} distinct shapes; Ceres ${got[0] ? got[0].roundness.toFixed(3) : '?'} round, Itokawa ${got[3] ? got[3].roundness.toFixed(3) : '?'}`);
  }
}

if (problems.length) { console.log(`station shapes: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('station shapes ok: Soyuz and Progress build inside budget at 10.7 m, and the name route picks them for stations-layer vehicles only');
