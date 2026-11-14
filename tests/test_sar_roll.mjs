// tests/test_sar_roll.mjs -- radar satellites look to one side (internal #78): the roll about the direction of travel, its sign,
// and that every angle is one a source gives (realmodels.js `roll`, each with the page and its wording beside it).
//
//   node tests/test_sar_roll.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const M = await import(join(ROOT, 'site/js/scene/models.js'));
const R = await import(join(ROOT, 'site/js/scene/realmodels.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// Earth below (nadir -Y in the scene), heading +X: right of the track, seen from above, is -Z... v x up = X x Y = +Z, so +Z.
const nadir = new THREE.Vector3(0, -1, 0);
const heading = { x: 1, y: 0.01, z: 0 };
const obj = new THREE.Object3D();
obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nadir); // body +Z at the Earth
check(M.rollAboutHeading(obj, heading, nadir, 30) === true, 'a heading that is not zero rolls the craft');
const earthFace = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion);
const right = new THREE.Vector3(1, 0, 0).cross(new THREE.Vector3(0, 1, 0)); // heading x up
check(Math.abs(earthFace.dot(nadir) - Math.cos(Math.PI / 6)) < 1e-6, `the Earth face is 30 degrees off the nadir (${earthFace.dot(nadir).toFixed(4)})`);
check(earthFace.dot(right) > 0.49 && earthFace.dot(right) < 0.51, `and toward the right of the track (${earthFace.dot(right).toFixed(3)})`);
check(Math.abs(earthFace.dot(new THREE.Vector3(1, 0, 0))) < 1e-6, 'with no tilt along the track');
const before = obj.quaternion.clone();
check(M.rollAboutHeading(obj, { x: 0, y: 0, z: 0 }, nadir, 30) === false && obj.quaternion.equals(before), 'no heading, no roll');
check(M.rollAboutHeading(obj, { x: 0, y: 1, z: 0 }, nadir, 30) === false, 'a heading along the nadir has no track to roll about');

// The routes that carry a roll, and why.
const entries = Object.entries(R.REAL_MODELS.norad).filter(([, e]) => e.roll);
const byName = Object.fromEntries(entries.map(([n, e]) => [e.name, e.roll]));
check(byName['ALOS-2'] === 30, 'ALOS-2 is rolled 30 degrees (eoPortal: "pointing 30 degrees sideways when observing")');
const csk = ['COSMO-SkyMed 1', 'COSMO-SkyMed 2', 'COSMO-SkyMed 3', 'COSMO-SkyMed 4'].map((n) => byName[n]);
const look = Math.asin(6371 / (6371 + 619.6) * Math.sin(38 * Math.PI / 180)) * 180 / Math.PI;
check(csk.every((x) => x === 34) && Math.round(look) === 34, `COSMO-SkyMed is rolled 34 degrees: asin(6371 / (6371 + 619.6) x sin 38) = ${look.toFixed(2)}`);
check(entries.every(([, e]) => e.roll > 0 && e.roll <= 40), 'no roll is over 40 degrees or negative');
const src = readFileSync(join(ROOT, 'site/js/scene/realmodels.js'), 'utf8');
check(/ROLL \(internal #78\): eoPortal's ALOS-2 page/.test(src) && /ROLL \(internal #78\): eoPortal's COSMO-SkyMed page/.test(src), 'each roll has its page and its wording beside it');
const heroes = readFileSync(join(ROOT, 'site/js/scene/heroes.js'), 'utf8');
check(/obj\.userData\.sarRoll = early\.roll/.test(heroes) && /clone\.userData\.sarRoll = real\.roll/.test(heroes) && /obj\.userData\.heading = /.test(heroes), 'heroes.js gives the craft its roll and its direction of travel');

if (problems.length) { console.log(`sar roll: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('sar roll ok: a radar satellite rolls about its track toward the right, ALOS-2 by 30 degrees and COSMO-SkyMed by 34, each from a cited page');
