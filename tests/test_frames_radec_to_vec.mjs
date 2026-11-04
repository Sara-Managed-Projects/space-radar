// tests/test_frames_radec_to_vec.mjs -- radecToVec turns degrees of right ascension and declination into a unit vector in equatorial J2000 axes (public #783).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { radecToVec } = await import(join(JS, 'propagate/frames.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const same = (v, w) => Math.abs(v.x - w.x) < 1e-9 && Math.abs(v.y - w.y) < 1e-9 && Math.abs(v.z - w.z) < 1e-9;
const show = (v) => `{${v.x}, ${v.y}, ${v.z}}`;
const cases = [
  [0, 0, { x: 1, y: 0, z: 0 }, 'RA 0, Dec 0 is the x axis, the vernal equinox'],
  [90, 0, { x: 0, y: 1, z: 0 }, 'RA 90 degrees is the y axis (degrees, not radians)'],
  [0, 90, { x: 0, y: 0, z: 1 }, 'Dec 90 degrees is the celestial north pole'],
  [180, -45, { x: -Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 }, 'RA 180, Dec -45 points back and down'],
];
for (const [ra, dec, want, why] of cases) {
  const got = radecToVec(ra, dec);
  check(same(got, want), `${why} (radecToVec(${ra}, ${dec}) = ${show(got)})`);
}

if (problems.length) { console.error('radecToVec FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`radecToVec ok: ${cases.length} directions, from the equinox to the pole, come out as the unit vectors they should`);
