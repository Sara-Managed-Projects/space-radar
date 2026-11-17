// tests/test_casa.mjs -- Cassiopeia A from its published 3D reconstruction (the deep-space review of 2026-11-16): the
// point sets are the source's seven parts in the right frame (the jets north-east and south-west, the south-east iron
// toward us, the lengths the paper states); the registry names the source, the licence and the credit; the record is
// at the expansion centre; each part grows on the clock at its measured rate and nothing is drawn before the
// explosion; the legend and the credit are on the card; two draw calls, nothing in the boot graph, the budget.
//
//   node tests/test_casa.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { MeshoptDecoder } = await import(join(ROOT, 'site/vendor/meshopt_decoder.module.js'));
const C = await import(join(JS, 'scene/deep/casa.js'));
const M = await import(join(JS, 'scene/deep/meshfile.js'));
const B = await import(join(ROOT, 'scripts/build_deep_casa.mjs'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const P = (await import(join(JS, 'data/hero-casa.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
await MeshoptDecoder.ready;

// --- 1. the registry: the source, the licence and the credit ----------------------------------------------------------
const iron = P.layers.find((l) => l.part === 'iron');
check(/CasA_supernova_remnant-ascii_vtks\.zip/.test(iron.from) && /sha256 [0-9a-f]{64}/.test(iron.from), 'the source archive is named with its checksum');
check(iron.credit === 'NASA/CXC/MIT/T.Delaney et al.', 'the credit line is Chandra\'s for the model');
check(/no claim to copyright is being asserted/.test(iron.licence) && /read 2026-11-16/.test(iron.licence), 'the licence is quoted with the day it was read');
check(P.layers.every((l) => l.source && l.what), 'every part says what it is and where it is from');
check(P.shipped === true && P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || ''), 'signed under the lead\'s policy, no astronomer\'s review claimed');
check(/FALSE COLOUR/.test(P.colours.note) && /no brightness/.test(P.colours.note), 'false colour and the missing brightness are declared');
const def = HEROES.find((h) => h.id === 'casa');
check(def && def.record === 'dso-cassiopeia-a' && def.stub.shipped === P.shipped && /hero-casa/.test(String(def.build)) && !/hero-/.test(String(def.profile)), 'its line in the hero list: a stub now, the profile and the module when it is near');
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'cassiopeia-a');
check(dso && dso.typeCode === 'SNR' && dso.distLy === 11090, 'the record: a supernova remnant at 3.4 kpc');
// 23h 23m 27.77s, +58 deg 48 min 49.4 s: the expansion centre (Thorstensen et al. 2001)
check(dso && near(dso.raDeg, 15 * (23 + 23 / 60 + 27.77 / 3600), 1e-6) && near(dso.decDeg, 58 + 48 / 60 + 49.4 / 3600, 1e-6), 'the record is at the expansion centre');
check(near(P.frame.ra_deg, dso.raDeg, 1e-6) && near(P.frame.dec_deg, dso.decDeg, 1e-6) && P.frame.distance_ly === dso.distLy, 'the profile\'s frame is the record\'s place');
check(near(dso.majAxArcmin * 60, 2 * P.layers.find((l) => l.part === 'blast-wave').radius_arcsec, 1), 'the record\'s size is the blast wave\'s width');
// One object, one mark: Green's catalogue row for it has given way to this record.
const cat = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/catalogue.json'), 'utf8'));
check(cat.green_skipped.some((g) => g[0] === 'G111.7-2.1' && g[1] === 'cassiopeia-a') && !cat.names.includes('G111.7-2.1'), 'the catalogue does not draw a second Cassiopeia A (G111.7-2.1)');

// --- 2. the file: the seven parts, in arcseconds about the explosion's place ------------------------------------------
const sizeOf = statSync(join(ROOT, iron.file)).size;
const buf = readFileSync(join(ROOT, iron.file));
const parsed = M.parseMeshFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), MeshoptDecoder);
const by = new Map(parsed.meshes.map((m) => [m.name, m]));
const pointParts = P.layers.filter((l) => l.kind === 'points').map((l) => l.part);
check(parsed.meshes.length === 7 && pointParts.every((p) => by.has(p)) && parsed.meshes.every((m) => m.indices === null), 'seven point sets, one for each part of the profile');
check(B.PARTS.map((p) => p.part).join() === pointParts.join(), 'the build\'s parts are the profile\'s, in the same order');
check(parsed.extras.credit === iron.credit && parsed.extras.unit_arcsec === P.frame.units.arcsec_per_unit && near(parsed.extras.origin_shift_arcsec, 859 * 0.022, 1e-3), 'the file carries its credit, its unit and its origin shift');
const stats = (name) => {
  const p = by.get(name).positions, n = p.length / 3;
  let r = 0, rp = 0, w = 0, nn = 0, t = 0;
  for (let i = 0; i < n; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; r += Math.hypot(x, y, z + 859 * 0.022); rp += Math.hypot(x, y, z); w += x; nn += y; t += z; }
  return { n, r: r / n, rp: rp / n, west: w / n, north: nn / n, toward: t / n };
};
const total = pointParts.reduce((s, p) => s + stats(p).n, 0);
check(total === 24219, `24 219 points in all (${total})`);
for (const m of parsed.meshes) check(Array.from(m.positions).every(Number.isFinite), `${m.name}: every place is a number`);
// The three lengths the paper states, which set the unit (within 5 %).
check(near(stats('argon').r, 110, 5.5), `the [Ar II]'s mean 3D radius is the paper's 110 arcseconds (${stats('argon').r.toFixed(1)})`);
check(near(stats('silicon-cold').r, 91, 4.6), `the [Si II]'s is the paper's 91 (${stats('silicon-cold').r.toFixed(1)})`);
const ns = by.get('neutron-star').positions;
check(ns.length === 3 && near(Math.hypot(ns[0], ns[1], ns[2] + 859 * 0.022), Math.hypot(6.6, 859 * 0.022), 1.5), 'the neutron star is where the paper puts it: 6.6 arcseconds from the centre on the sky, at zero velocity');
check(ns[1] < -3 && Math.abs(ns[2]) < 2.5, `it is south of the expansion centre (${ns[1].toFixed(1)} arcseconds north) and at zero velocity (${ns[2].toFixed(1)} toward us)`);
// The frame, by what the paper says of the parts: the jets north-east and south-west near the plane of the sky.
{
  const p = by.get('jets').positions; let ne = 0, sw = 0, other = 0, depth = 0;
  for (let i = 0; i < p.length; i += 3) { if (p[i] < 0 && p[i + 1] > 0) ne++; else if (p[i] > 0 && p[i + 1] < 0) sw++; else other++; depth += Math.abs(p[i + 2]) / Math.hypot(p[i], p[i + 1], p[i + 2]); }
  check(ne > sw && sw > 0 && other === 0, `the jet points north-east (east is minus west) and its counter-jet south-west (${ne}, ${sw}, ${other} elsewhere)`);
  check(depth / (p.length / 3) < 0.35, 'the jets lie near the plane of the sky');
}
// The iron: the south-east lobe comes toward us, the northern one goes away (the paper, section 3).
{
  const p = by.get('iron').positions; let se = 0, seN = 0, no = 0, noN = 0;
  for (let i = 0; i < p.length; i += 3) { if (p[i] < -30 && p[i + 1] < -30) { se += p[i + 2]; seN++; } if (p[i + 1] > 60) { no += p[i + 2]; noN++; } }
  check(seN > 200 && se / seN > 20, `the south-east iron is in front of the centre (${(se / seN).toFixed(0)} arcseconds toward us, ${seN} points)`);
  check(noN > 200 && no / noN < -10, `the northern iron is behind it (${(no / noN).toFixed(0)} arcseconds, ${noN} points)`);
}
// The outer knots lie at and beyond the blast wave; the cold silicon inside the ring of argon.
check(stats('outer-knots').rp > 153 && stats('jets').rp > 153, 'the jets and the outer knots are out at and beyond the blast wave');
check(stats('silicon-cold').rp < stats('argon').rp && stats('argon').rp < 153, 'the cold silicon is inside the argon, the argon inside the blast wave');

// --- 3. the builder's own steps ----------------------------------------------------------------------------------------
{
  const pts = B.parsePoints('# vtk\nASCII\nDATASET POLYDATA\nPOINTS 3 float\n1 2 3 4 5 6 \n7 8 9\nTRIANGLE_STRIPS 1 4\n3 0 1 2\n');
  check(pts.length === 9 && pts[0] === 1 && pts[8] === 9, 'the reader takes the POINTS block and nothing after it');
  const th = B.thin(Float64Array.from([0.1, 0.1, 0.1, 0.3, 0.3, 0.3, 5.2, 0.1, 0.1]), 1);
  check(th.length === 6 && near(th[0], 0.2, 1e-9) && near(th[3], 5.2, 1e-9), 'thinning: one point a cell, at the mean of its vertices');
  const one = B.thin(Float64Array.from([-1, 0, 0, 1, 0, 0]), Infinity);
  check(one.length === 3 && one[0] === 0, 'a single marker becomes its middle');
  const f = B.reframe(Float64Array.from([1, 2, 3]));
  check(near(f[0], -3.5, 1e-6) && near(f[1], 10.5, 1e-6) && near(f[2], 7 - 859 * 0.022, 1e-5), 'the frame: east, toward Earth, north -> west, north, toward the Sun, in arcseconds, zero velocity at 0');
}

// --- 4. the growth: measured rates, nothing before the explosion ------------------------------------------------------
const G = P.frame.growth;
check(G.exploded === 1671.3 && G.epoch === 2005.04 && G.free.rate_pct_per_yr === 0.304 && G.slowed.rate_pct_per_yr === 0.208, 'the dates and the two rates are the papers\'');
check(near((G.free.rate_pct_per_yr / 100) * (G.epoch - G.exploded), 1, 0.03), 'the free rate and the explosion\'s date agree: 0.304 % a year is an age of 329 years');
check(C.growthOf(G, 'free', G.epoch) === 1 && C.growthOf(G, 'slowed', G.epoch) === 1, 'at the model\'s epoch every part is the size the file holds');
check(C.growthOf(G, 'free', 1671) === 0 && C.growthOf(G, 'slowed', 1600) === 0, 'before the explosion nothing is drawn');
check(near((C.growthOf(G, 'free', G.epoch + 1) - 1) * 100, 1 / (G.epoch - G.exploded) * 100, 1e-6), 'the free debris moves in straight lines: its size follows its age');
check(near((C.growthOf(G, 'slowed', G.epoch + 1) - 1) * 100, 0.208, 0.002), 'the slowed debris grows by 0.208 % in a year today');
check(C.growthOf(G, 'slowed', 1800) > C.growthOf(G, 'free', 1800), 'the slowed parts were nearer today\'s size in the past than the free ones (they moved faster then)');
const shock = C.shockOf(P, dso.distLy);
check(near(shock.radius, 153, 1e-9) && near(shock.arcsecPerYr, 0.305, 0.002) && near(shock.rate, 0.199, 0.002), `the blast wave: 153 arcseconds, 4 917 km/s is ${shock.arcsecPerYr.toFixed(3)} arcseconds a year at 3.4 kpc`);
check(near(4917 / 1.609344 * 3600 / 1e6, 11, 0.01), 'its speed is the Chandra page\'s 11 million miles an hour');
check(near(C.arcsecLy(dso.distLy) * 153 * 2, 16.45, 0.05), `at 3.4 kpc the blast wave is ${(C.arcsecLy(dso.distLy) * 306).toFixed(1)} light-years across`);
const parts = C.partsOf(P);
check(parts.length === 7 && parts.find((p) => p.part === 'iron').cls === 1 && parts.find((p) => p.part === 'silicon-hot').cls === 1 && parts.filter((p) => p.cls === 0).length === 5, 'the X-ray parts are the slowed ones, the infrared and optical ones free');
check(parts.find((p) => p.part === 'silicon-cold').size === 15 && parts.find((p) => p.part === 'silicon-hot').size === 10 && parts.find((p) => p.part === 'argon').size === 6, 'a point\'s size is the paper\'s symbol: 15, 10 and 6 arcseconds');
const hue = (c) => (c[1] > c[0] && c[1] > c[2] ? 'green' : c[2] > c[0] ? 'blue' : c[1] > 0.6 ? 'yellow' : 'red');
check(hue(parts.find((p) => p.part === 'iron').colour) === 'green' && hue(parts.find((p) => p.part === 'argon').colour) === 'yellow' && hue(parts.find((p) => p.part === 'jets').colour) === 'yellow' && hue(parts.find((p) => p.part === 'silicon-cold').colour) === 'red' && hue(shock.colour) === 'blue', 'the colours are Chandra\'s code: green iron, yellow argon, silicon and jets, red cold debris, blue blast wave');

// --- 5. the hero: built from the file, placed, two draw calls, the clock ----------------------------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('stellar');
  const { parseDso } = await import(join(JS, 'data/parsers.js'));
  const rec = parseDso({ objects: [dso] })[0];
  const hero = C.createHero(THREE, { profile: P, record: rec, mesh: parsed });
  check(hero.levels.join() === '2,3' && hero.card.copy === 'deepCasA' && hero.card.drawn['dso-cassiopeia-a'].join() === 'reconstruction,model', 'what a hero answers: its levels, its card block, a reconstruction with a modelled part');
  hero.setLevel(2, 1);
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1e9);
  const t0 = stage.tMs;
  stage.setTime(Date.UTC(2005, 0, 13));
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  const st = hero.stats();
  check(st.meshes === 2 && st.points === 24219 && near(st.free, 1, 1e-3) && near(st.shockArcsec, 153, 0.1), 'two draw calls; on the day of Spitzer\'s map every part is the file\'s size');
  const pts = hero.group.getObjectByName('deep-hero-casa-shells'), wave = hero.group.getObjectByName('deep-hero-casa-blast-wave');
  check(pts.isPoints && pts.material.depthWrite === false && pts.material.blending === THREE.AdditiveBlending && wave.material.blending === THREE.AdditiveBlending, 'hot gas adds light and hides nothing: additive, no depth written');
  // In the scene: a point one arcsecond north of the centre is arcsecLy north, in the hero's light-years.
  hero.group.updateMatrixWorld(true);
  const sky = hero.group.getObjectByName('deep-hero-casa-sky');
  const o = new THREE.Vector3(0, 0, 0).applyMatrix4(sky.matrixWorld), n1 = new THREE.Vector3(0, 100, 0).applyMatrix4(sky.matrixWorld), t1 = new THREE.Vector3(0, 0, 100).applyMatrix4(sky.matrixWorld);
  check(near(n1.distanceTo(o), 100 * C.arcsecLy(dso.distLy), 1e-6), 'the file\'s arcseconds become light-years at the record\'s distance');
  const centre = new THREE.Vector3(), sun = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', sun, stage.tMs);
  check(t1.clone().sub(o).normalize().dot(sun.clone().sub(centre).normalize()) > 0.999999, 'the file\'s third axis points from the remnant to the Sun');
  stage.setTime(Date.UTC(1650, 0, 1));
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  check(pts.visible === false && wave.visible === false, 'in 1650 nothing is drawn');
  stage.setTime(Date.UTC(2105, 0, 13));
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  const later = hero.stats();
  check(near(later.free, 1 + 100 / (2005.04 - 1671.3), 2e-3) && later.slowed > 1.19 && later.slowed < 1.23 && later.shockArcsec > 153 * 1.17 && later.shockArcsec < 153 * 1.22, `a century on: the free debris ${((later.free - 1) * 100).toFixed(0)} % larger, the slowed ${((later.slowed - 1) * 100).toFixed(0)} %, the blast wave at ${later.shockArcsec} arcseconds`);
  hero.frame({ camera: cam, look: 'measured', gain: 1 });
  check(pts.visible && wave.visible, 'under Measured it stays: measured places, and a sphere of the measured radius');
  stage.setTime(t0);
  hero.dispose();
}
check(!/texture2D|sampler2D/.test(C.SHADERS.frag + C.SHADERS.shockFrag), 'no texture and no pass');

// --- 6. the card: the legend, what is measured and what is not, the credit -------------------------------------------
await import(join(JS, 'copy/en.deepdata.js'));
const K = COPY.deepCasA;
const rows = K.rows['dso-cassiopeia-a'];
check(/DeLaney and others, 2010/.test(K.card.casa) && /NASA\/CXC\/MIT\/T\. Delaney/.test(K.card.casa) && /legend/.test(K.card.casa) && /Not yet reviewed by an astronomer/.test(K.card.casa), 'the card\'s sentence names the paper, the credit, the false colour and that no astronomer reviewed it');
for (const [label, what] of [['Green', /Iron/], ['Yellow', /Argon and silicon/], ['Red', /Cold silicon/], ['Blue shell', /blast wave/], ['White point', /neutron star/]]) check(rows.some((r) => r[0] === label && what.test(r[1])), `the legend has ${label}`);
check(rows.some((r) => /Modelled/.test(r[1]) && /sphere/.test(r[1])), 'the blast wave\'s row says it is a modelled sphere');
check(rows.some((r) => r[0] === 'Brightness' && /Not in the model/.test(r[1])), 'a row says brightness is not in the model');
check(rows.some((r) => /NASA\/CXC\/MIT\/T\. Delaney/.test(r[1]) && /24 219/.test(r[1])), 'a row carries the credit and says the points were thinned');
check(rows.some((r) => /0\.3 %/.test(r[1]) && /0\.2 %/.test(r[1]) && /1671/.test(r[1])), 'the growth row gives the rates and the date');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(credits.includes('NASA/CXC/MIT/T.Delaney et al.') && /chandra\.si\.edu\/photo\/image_use\.html/.test(credits), 'CREDITS.md carries the credit line and the policy');

// --- 7. bytes: small, and not in the boot graph ----------------------------------------------------------------------
check(BUDGETS.deep_casa_bytes > 0 && sizeOf <= BUDGETS.deep_casa_bytes, `the file is within its budget (${sizeOf} B of ${BUDGETS.deep_casa_bytes})`);
check(BUDGETS.deep_casa_draw_calls === 2, 'its draw calls have a budget: the points and the sphere');
for (const f of ['main.js', 'scene/deep/deepsky.js', 'scene/deep/heroes.js']) {
  const src = readFileSync(join(JS, f), 'utf8');
  check(!/^import[^'"]*['"][^'"]*(casa|meshfile|skyplace|en\.deepdata)[^'"]*['"]/m.test(src), `${f} does not import it statically`);
}

if (problems.length) { console.error(problems.map((p) => 'FAIL ' + p).join('\n')); console.error(`\n${problems.length} problem(s)`); process.exit(1); }
console.log('ok: tests/test_casa.mjs');
