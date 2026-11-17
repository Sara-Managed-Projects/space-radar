// tests/test_dso_ellipses.mjs -- the 2026-11-16 deep-space review, faults 1 and 5: a galaxy is drawn as long, as
// wide and as turned as its catalogue says, and a cluster's mark sits in the middle of its stars.
//
// Fault 1. Seven famous edge-on galaxies (NGC 891, 4565, 4631, 3628, 55, 253, 7331) were round glows: their hand
// rows had a major axis and nothing else, and both draw paths (scene/dsoglow.js glowFor, scene/deep/deepsky.js
// holderMatrix) need a minor axis and a position angle to flatten and turn a galaxy. Every galaxy row was then
// audited: the ellipse comes from SIMBAD's galdim fields or, for the Local Group's dwarfs, McConnachie 2012.
// Fault 5. OpenNGC puts M45 on Alcyone, a quarter of a degree from the middle of the cluster's members.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { glowFor } = await import(join(JS, 'scene/dsoglow.js'));
const { discFrame } = await import(join(JS, 'data/deepsky.js'));
const text = readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8');
const doc = JSON.parse(text);
const byId = new Map(doc.objects.map((o) => [o.id, o]));
const recs = new Map(parseDso(doc).map((r) => [r.id, r]));

// ---- the seven edge-on galaxies: SIMBAD's ellipse (galdim, CfA mirror, read 2026-11-16) ----
const EDGE_ON = { // id: [SIMBAD major, minor (arcmin), position angle (deg east of north)]
  'ngc-891': [12.3, 2.45, 22], 'needle-galaxy': [13.8, 2.19, 135], 'whale-galaxy': [16.5621, 3.13851, 85],
  'hamburger-galaxy': [24.4304, 4.81034, 103], 'ngc-55': [32.36, 3.98, 101], 'ngc-253': [28.84, 5.89, 53], 'ngc-7331': [10.47, 4.17, 171],
};
for (const [id, [maj, min, pa]] of Object.entries(EDGE_ON)) {
  const o = byId.get(id);
  const want = min / maj;
  const got = o && o.minAxArcmin / o.majAxArcmin;
  check(o && Math.abs(got - want) < 0.005, `${id}: its axis ratio is SIMBAD's ${want.toFixed(3)} (${got})`);
  check(o && o.posAngDeg === pa, `${id}: its position angle is SIMBAD's ${pa} (${o && o.posAngDeg})`);
  const g = glowFor(recs.get(`dso-${id}`));
  check(g && g.shape && Math.abs(g.shape.ratio - want) < 0.005 && g.shape.paDeg === pa, `${id}: its glow is that ellipse, turned (${g && JSON.stringify(g.shape)})`);
  check(want < 0.41, `${id}: an edge-on or steeply tilted disc, under 0.41 wide for its length (${want.toFixed(2)})`);
}
// The needle is a needle: the volume's disc stands within 10 degrees of edge on (the inclination a thin disc of
// that ratio implies, deepsky.js holderMatrix), and its long axis lies along the catalogue's angle on the sky.
{
  const r = recs.get('dso-needle-galaxy');
  const md = r.meta;
  const q = md.minAxArcmin / md.majAxArcmin;
  const incl = Math.acos(Math.max(0.12, q)) * 180 / Math.PI;
  check(incl > 80 && incl < 90, `the Needle Galaxy's disc is ${incl.toFixed(1)} degrees from face on`);
  const f = discFrame(r.pos, md.posAngDeg, incl, null);
  const u = [r.pos.x, r.pos.y, r.pos.z]; const n = Math.hypot(...u);
  const along = (f.major[0] * u[0] + f.major[1] * u[1] + f.major[2] * u[2]) / n;
  const tilt = Math.abs(f.normal[0] * u[0] + f.normal[1] * u[1] + f.normal[2] * u[2]) / n;
  check(Math.abs(along) < 1e-9, 'its long axis lies on the sky, at right angles to the line of sight');
  check(tilt < 0.17, `its disc's axis is nearly at right angles to the line of sight (cos ${tilt.toFixed(3)})`);
}

// ---- the audit: every galaxy has an ellipse, but for the five whose catalogues give none ----
const NO_ELLIPSE = { // id: why (registry/dso-hand.yaml says the same)
  'leo-t': 'McConnachie 2012 flags its ellipticity uncertain (0.00:), SIMBAD has no dimensions',
  'ursa-major-i': 'no major axis in the row',
  'willman-1': 'no major axis in the row',
  'reticulum-ii': 'found in 2015, after McConnachie 2012; SIMBAD has no dimensions',
  'antennae-galaxies': 'two galaxies in one row',
};
const galaxies = doc.objects.filter((o) => o.kind === 'galaxy');
const without = galaxies.filter((o) => !(o.minAxArcmin > 0)).map((o) => o.id).sort();
check(JSON.stringify(without) === JSON.stringify(Object.keys(NO_ELLIPSE).sort()), `the galaxies with no minor axis are the five the catalogues leave out (${without})`);
const noAngle = galaxies.filter((o) => o.minAxArcmin > 0 && !Number.isFinite(o.posAngDeg)).map((o) => o.id).sort();
// Nearly round on the sky, and neither SIMBAD, HyperLEDA (NGC 6946) nor McConnachie (IC 10) gives an angle.
check(JSON.stringify(noAngle) === JSON.stringify(['fireworks-galaxy', 'ic-10']), `only two galaxies have an axis ratio and no angle, both nearly face on (${noAngle})`);
for (const id of noAngle) { const o = byId.get(id); check(o.minAxArcmin / o.majAxArcmin > 0.8, `${id} is drawn round because it is nearly round (${(o.minAxArcmin / o.majAxArcmin).toFixed(2)})`); }
check(galaxies.every((o) => !(o.minAxArcmin > 0) || (o.minAxArcmin <= o.majAxArcmin && o.minAxArcmin / o.majAxArcmin > 0.04)), 'no minor axis is longer than its major axis, and none is a line');
check(galaxies.every((o) => !Number.isFinite(o.posAngDeg) || (o.posAngDeg >= 0 && o.posAngDeg <= 180)), 'every position angle is 0 to 180 degrees east of north');
const shaped = galaxies.filter((o) => { const g = glowFor(recs.get(`dso-${o.id}`)); return g && g.shape; }).length;
check(shaped >= 60, `at least sixty galaxies glow as their catalogue ellipse now (${shaped})`);
// A dwarf spheroidal from McConnachie 2012 (AJ 144, 4): Ursa Minor, ellipticity 0.56 at 53 degrees; Fornax 0.30 at 41.
const umi = byId.get('ursa-minor-dwarf'); const fnx = byId.get('fornax-dwarf');
check(Math.abs(umi.minAxArcmin / umi.majAxArcmin - 0.44) < 0.005 && umi.posAngDeg === 53, `Ursa Minor: 1 - 0.56 wide at 53 degrees (${umi.minAxArcmin}/${umi.majAxArcmin}, ${umi.posAngDeg})`);
check(Math.abs(fnx.minAxArcmin / fnx.majAxArcmin - 0.70) < 0.005 && fnx.posAngDeg === 41, `Fornax: 1 - 0.30 wide at 41 degrees (${fnx.minAxArcmin}/${fnx.majAxArcmin}, ${fnx.posAngDeg})`);
const hand = readFileSync(join(ROOT, 'registry/dso-hand.yaml'), 'utf8');
check((hand.match(/The ellipse \(2026-11-16 audit\)/g) || []).length === 48, 'each of the 48 filled rows says in the registry where its ellipse was read');

// ---- fault 5: the Pleiades' centre, and the two other clusters the audit moved ----
const sep = (a, b) => { // arcminutes between two [ra, dec] in degrees
  const r = Math.PI / 180;
  const c = Math.sin(a[1] * r) * Math.sin(b[1] * r) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.cos((a[0] - b[0]) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r * 60;
};
const SIMBAD = { m45: [56.6008, 24.1139], m39: [322.8892, 48.2469], m29: [305.9417, 38.4867] }; // basic.ra, basic.dec (CfA mirror, 2026-11-16)
for (const [id, at] of Object.entries(SIMBAD)) {
  const o = byId.get(id);
  const d = sep([o.raDeg, o.decDeg], at);
  check(d < 5, `${id} is within 5 arcminutes of SIMBAD's centre (${d.toFixed(1)}; M45 was 14.7, M39 11.7)`);
  check(!/^OpenNGC$/.test(o.positionSource) && /Hunt & Reffert 2023|SIMBAD/.test(o.positionSource), `${id} says whose centre it is (${o.positionSource})`);
  // the place in space is that direction at the row's own distance
  const k = Math.hypot(...o.posLy);
  check(Math.abs(k - o.distLy) < 1, `${id} keeps its distance (${k.toFixed(1)} of ${o.distLy} ly)`);
}
// Alcyone (56.871, +24.105) is no longer the Pleiades' centre; the middle of the bright seven is west of it.
check(sep([byId.get('m45').raDeg, byId.get('m45').decDeg], [56.871, 24.105]) > 8, 'the Pleiades are not centred on Alcyone');
// The members drawn (site/data/deep/clusters.json) are baked about the same centre as the record's.
const man = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/clusters.json'), 'utf8'));
for (const c of man.open) {
  const o = byId.get(c.id);
  check(o && c.centreDeg[0] === o.raDeg && c.centreDeg[1] === o.decDeg, `${c.id}: its members are baked about the record's centre (${c.centreDeg} against ${o && [o.raDeg, o.decDeg]})`);
}

if (problems.length) { console.error('dso ellipses FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`dso ellipses ok: the seven edge-on galaxies are SIMBAD's ellipses, ${shaped} galaxies glow as their catalogue shape, five say why they cannot, the Pleiades sit among their stars`);
