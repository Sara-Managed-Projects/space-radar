// tests/test_one_star_frame.mjs -- internal #387 "Two star frames": the sky sphere and the 3D stars are drawn in ONE frame.
//
// The issue (2026-10-05) said the sphere was drawn in the equator of date and the 3D stars in J2000, a third of a degree apart,
// so the stars stepped between 500 and 5 000 au. MEASURED 2026-10-09 on this tree: they do not. scene/starfield.js rotates the
// J2000 catalogue into TEME (frames.j2000ToTeme) and the stage's `earth-inertial` frame carries TEME back to the ecliptic of J2000
// the 3D stars use, so a star lies in the same scene direction either way: Vega is 0.0000 degrees apart on the Earth's, the Sun's
// and the stellar stages. This test holds that, so a change to either side that brings the third of a degree back is refused.
// (Setting the sphere's rotation to the bare J2000 numbers would BREAK it: 0.176 degrees, measured below.)
// Run: node tests/test_one_star_frame.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const warn = console.warn, err = console.error; console.warn = () => {}; console.error = () => {}; // the starfield tries to fetch its pictures; there is no network here
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const SF = await import(join(JS, 'scene/starfield.js'));
const frames = await import(join(JS, 'propagate/frames.js'));
const { eqToEcl } = await import(join(JS, 'scene/nebulae.js'));

const tMs = Date.UTC(2026, 9, 9, 12);
// A few stars all over the sky (J2000 RA, Dec in degrees): Vega, Sirius, Polaris, Antares, Fomalhaut.
const STARS = [[279.2347, 38.7837], [101.2872, -16.7161], [37.9546, 89.2641], [247.3519, -26.4320], [344.4127, -29.6222]];
const dir = (ra, dec) => { const r = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)]; };
const BIG = 1e9;

let worst = 0;
let worstBare = 0;
for (const world of ['earth', 'sun', 'stellar']) {
  stage.setWorld(world); stage.setTime(tMs);
  const scene = new THREE.Scene();
  const sf = SF.createStarfield(scene, {});
  const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1e9);
  camera.position.set(0, 0, 3); camera.updateMatrixWorld(true);
  sf.syncFrame(); sf.update(camera);
  const o = new THREE.Vector3(), p = new THREE.Vector3();
  stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', o, stage.tMs);
  for (const [ra, dec] of STARS) {
    const eq = dir(ra, dec);
    // where the sphere puts it: the sphere's local axes (x to RA 0, y to RA 90, z north) carried by its rotation
    const onSphere = new THREE.Vector3(eq[0], eq[1], eq[2]).applyQuaternion(sf.group.quaternion).normalize();
    // where the 3D stars put it: J2000 equator -> ecliptic of J2000 -> the stage
    const ecl = eqToEcl(eq);
    stage.toSceneInto({ x: ecl[0] * BIG, y: ecl[1] * BIG, z: ecl[2] * BIG }, 'sun-inertial', p, stage.tMs);
    const in3d = p.clone().sub(o).normalize();
    worst = Math.max(worst, Math.acos(Math.min(1, onSphere.dot(in3d))) * 180 / Math.PI);
    // the road not taken: the bare J2000 numbers as earth-inertial
    const q0 = stage.toScene({ x: 0, y: 0, z: 0 }, 'earth-inertial');
    const bare = stage.toScene({ x: eq[0] * BIG, y: eq[1] * BIG, z: eq[2] * BIG }, 'earth-inertial');
    worstBare = Math.max(worstBare, Math.acos(Math.min(1, new THREE.Vector3().copy(bare).sub(q0).normalize().dot(in3d))) * 180 / Math.PI);
  }
  sf.dispose();
}
check(worst < 0.005, `the sky sphere and the 3D stars agree to ${worst.toFixed(5)} degrees on the Earth's, the Sun's and the stellar stages (under 0.005)`);
check(worstBare > 0.1, `and the bare J2000 numbers would not (${worstBare.toFixed(3)} degrees), which is why the sphere goes through j2000ToTeme`);
check(typeof frames.j2000ToTeme === 'function', 'frames.js still turns J2000 into TEME');
stage.setWorld('earth');
console.warn = warn; console.error = err;
if (problems.length) { console.error('one star frame FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`one star frame ok: sphere and 3D stars agree to ${worst.toFixed(5)} degrees at every stage (the bare-J2000 road would be ${worstBare.toFixed(2)})`);
