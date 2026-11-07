// tests/test_holecompare.mjs -- the black holes held against the Event Horizon Telescope's pictures (forge #149; release
// 2.0.0 batch c2-deep): scene/holepose.js, ui/holespin.js's table, scene/portraits.js's fallback, the profiles.
//
//   node tests/test_holecompare.mjs
//
// What it holds:
//   1. THE POSE: from Earth means on the line from the hole to the Sun, looking at it, with up the celestial pole
//      square to that line; with a stage that is the identity, M87*'s pose looks along its own direction and puts east
//      on the left (forward x up points west).
//   2. THE PICTURES: every EHT picture the card shows is in the repository with a row in registry/exotics.yaml or
//      registry/asset_sources.yaml and CREDITS.md, CC BY 4.0; where the drawn ring is brightest is within 40 degrees of
//      where the EHT's is (M87*: between 2017's and 2018's; Sagittarius A*: in the same quarter).
//   3. THE ORIENTATION: M87* at 17 degrees and its jet's 288; Sagittarius A* at EHT 2022 paper V's 30 degrees, turning
//      clockwise, its axis on the sky marked as chosen.
//   4. THE FALLBACK: under 30 frames a second (median of 45 over 34 ms) a hole steps down a tier, never below 0 and
//      never on fewer frames or on fast ones.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const HP = await import(join(ROOT, 'site/js/scene/holepose.js'));
const HS = await import(join(ROOT, 'site/js/ui/holespin.js'));
const B = await import(join(ROOT, 'site/js/scene/blackhole.js'));
const P = await import(join(ROOT, 'site/js/scene/portraits.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;

// 1. the pose, on a stage that is the identity
const stage = {
  toSceneInto: (k, f, out) => out.set(k.x, k.y, k.z),
  dirToScene: (v, f, out) => out.set(v.x, v.y, v.z),
};
const ra = 187.70593 * DEG, dec = 12.39112 * DEG, OBL = 23.4392911 * DEG;
const eq = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
const ecl = [eq[0], eq[1] * Math.cos(OBL) + eq[2] * Math.sin(OBL), -eq[1] * Math.sin(OBL) + eq[2] * Math.cos(OBL)];
const D = 5.06e20;
const pose = HP.earthPose({ pos: { x: ecl[0] * D, y: ecl[1] * D, z: ecl[2] * D } }, stage);
check(pose && Math.abs(pose.toEarth.dot(new THREE.Vector3(...ecl)) + 1) < 1e-9, 'from Earth is along the line from the hole to the Sun');
check(pose && Math.abs(pose.north.dot(pose.toEarth)) < 1e-9 && Math.abs(pose.north.length() - 1) < 1e-9, 'north is a unit vector square to the line of sight');
const poleEcl = new THREE.Vector3(...HP.SKY_NORTH_ECL);
check(pose && pose.north.dot(poleEcl) > 0.9, 'and it is the celestial pole\'s side');
const right = new THREE.Vector3().crossVectors(pose.toEarth.clone().negate(), pose.north);
const eastEq = [-Math.sin(ra), Math.cos(ra), 0];
const eastEcl = new THREE.Vector3(eastEq[0], eastEq[1] * Math.cos(OBL) + eastEq[2] * Math.sin(OBL), -eastEq[1] * Math.sin(OBL) + eastEq[2] * Math.cos(OBL));
check(right.dot(eastEcl) < -0.99, 'the camera\'s right is west, so east is on the left as in the EHT pictures');
check(HP.earthPose({ pos: { x: 0, y: 0, z: 0 } }, stage) === null && HP.earthPose(null, stage) === null, 'no place, no pose');

// 2. the pictures
const exotics = readFileSync(join(ROOT, 'registry/exotics.yaml'), 'utf8');
const sources = readFileSync(join(ROOT, 'registry/asset_sources.yaml'), 'utf8');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
for (const [key, pics] of Object.entries(HS.EHT_PICTURES)) {
  for (const pic of pics) {
    check(existsSync(join(ROOT, 'site/images', pic.file)), `${pic.file} is in the repository`);
    check(exotics.includes(`site/images/${pic.file}`) || sources.includes(`site/images/${pic.file}`), `${pic.file} has a licence row`);
    check(credits.includes(pic.file), `${pic.file} is in CREDITS.md`);
    check(/^https:\/\//.test(pic.source) && Number.isFinite(pic.pa), `${pic.file} has a source and a measured brightest angle`);
  }
  const ours = HS.DRAWN_BRIGHTEST_PA[key];
  const near = pics.map((p) => Math.abs(((ours - p.pa + 540) % 360) - 180));
  check(Math.min(...near) <= 40, `${key}: the drawn ring is brightest within 40 degrees of an EHT picture's (${ours} against ${pics.map((p) => p.pa).join(', ')})`);
}
check(/CC BY 4\.0/.test(sources.slice(sources.indexOf('eht-m87-2018.jpg') - 2000, sources.indexOf('eht-m87-2018.jpg') + 2000)), 'the 2018 picture is CC BY 4.0');
const m87 = HS.EHT_PICTURES['m87-star'];
check(m87.length === 2 && m87[0].date.startsWith('2017') && m87[1].date.startsWith('2018'), 'M87* is compared with the 2017 and 2018 pictures');
check(HS.DRAWN_BRIGHTEST_PA['m87-star'] > m87[0].pa - 10 && HS.DRAWN_BRIGHTEST_PA['m87-star'] < m87[1].pa + 10, 'M87*\'s drawn bright side is in the south, between the two years\'');

// 3. the orientation
const pm = B.PROFILES['m87-star'], ps = B.PROFILES['sgr-a-star'];
check(pm.incl === 17 && pm.pa === 288 && pm.turn === -1, 'M87*: 17 degrees, the jet at 288, clockwise');
check(ps.incl === 30 && ps.turn === -1 && ps.cls.orientation === 'modelled' && /[Pp]aper V/.test(ps.why) && /chosen/.test(ps.why), 'Sagittarius A*: 30 degrees (paper V), clockwise, the axis on the sky said to be chosen');

// 4. the fallback
const slow = Array(P.FALLBACK_FRAMES).fill(50);
const fast = Array(P.FALLBACK_FRAMES).fill(16);
check(P.stepDown(slow, 2) === 1 && P.stepDown(slow, 1) === 0 && P.stepDown(slow, 0) === 0, 'slow frames step a tier down, never below 0');
check(P.stepDown(fast, 2) === 2 && P.stepDown(slow.slice(1), 2) === 2, 'fast frames, or too few, do not');
check(P.stepDown([...Array(30).fill(16), ...Array(15).fill(200)], 1) === 1, 'a few slow frames (a shader compiling) do not');

if (problems.length) { console.error(`holecompare: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log('holecompare ok: from Earth, north up, east left; the EHT pictures licensed and credited; bright sides within 40 degrees; the tier steps down under 30 fps');
