// build-sputnik.mjs -- PS-1, the first Sputnik, and the head of the 8K71PS rocket it rode in, in three parts, in metres (release 1.7.0,
// the Sputnik 1 Moment, internal #1058). Run beside a folder with node_modules for @gltf-transform (see scripts/apollo/kit.mjs):
//   node build-sputnik.mjs out.glb
//
// WHAT IS PUBLISHED (Wikipedia, "Sputnik 1", read 3 November 2026, from NASA, NSSDC and the Russian sources it cites): a polished sphere
// of 585 mm in two hemispheres of AMG6T sealed with O-rings and held by 36 bolts, 83.6 kg; two pairs of whip antennas, 2.4 m and 2.9 m
// long; a cone-shaped payload fairing 80 cm high; the rocket 29.167 m long with PS-1. WHAT IS OURS (illustrative in the metre; there is
// no agency or museum 3D model of it under a free licence): the whips' hinges and their sweep (35 degrees off the axis, 90 degrees apart,
// long and short alternating), the seam's ring and its bolt heads, and the head's profile, an ogive from the core's 2.95 m to the tip,
// which covers the open truss of the Vostok launcher's model it is drawn on (the 8K71PS had no third stage and no truss).
//
//   sputnik-nose      the head: base ring at y = Y_NOSE on the core's top, an ogive to the tip, 1.95 m high
//   sputnik-sphere    the sphere, its seam, its 36 bolt heads and the four hinges, inside the nose
//   sputnik-antennas  the four whips, swept aft; hidden until the satellite is let go
import { writeParts, col, lathe, cylinder, sphere, tube, box, placeTris, V, boundsOf } from '../apollo/kit.mjs';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: build-sputnik.mjs out.glb'); process.exit(2); }
const R = 0.2925;                      // 585 mm
const L_SHORT = 2.4, L_LONG = 2.9, SWEEP = 35 * Math.PI / 180;
const POLAR = 70 * Math.PI / 180;      // the hinge ring, 70 degrees from the front pole
const Y_SPH = L_LONG * Math.cos(SWEEP) - R * Math.cos(POLAR);   // the sphere's centre, so that the long whips' tips are the lowest points, at y = 0
const Y_NOSE = Y_SPH - 0.62;                          // the nose's base, 0.62 m under the sphere's centre
const POLISH = col('#cfd2d6'), SEAM = col('#9fa3a8'), BOLT = col('#7c8086'), WHIP = col('#b8bbc0'), HINGE = col('#6e7278'), SKIN = col('#8d9096'), RING = col('#3a3c40');
const polar = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)];

// the head: a base ring and an ogive (profile [r, y] bottom to top), 1.95 m high
const prof = [[1.475, 0], [1.45, 0.14], [1.30, 0.52], [1.08, 0.92], [0.82, 1.28], [0.58, 1.56], [0.38, 1.76], [0.18, 1.90], [0.0, 1.95]];
const nose = lathe(prof.map(([r, y]) => [r, y + Y_NOSE]), 40, SKIN);
nose.push(...cylinder(1.49, Y_NOSE - 0.03, Y_NOSE + 0.05, 40, RING));
for (const y of [0.55, 1.15]) nose.push(...cylinder(((prof.find((p) => p[1] >= y) || [1])[0]) + 0.012, Y_NOSE + y - 0.012, Y_NOSE + y + 0.012, 40, RING));

// the sphere: two hemispheres, the seam at the equator, 36 bolt heads, four hinges on the front hemisphere
const ball = placeTris(sphere(R, 40, 20, POLISH, { tag: 2 }), { t: [0, Y_SPH, 0] });
ball.push(...cylinder(R * 1.004, Y_SPH - 0.012, Y_SPH + 0.012, 48, SEAM, { tag: 2 }));
for (let k = 0; k < 36; k++) { const a = (2 * Math.PI * k) / 36; ball.push(...placeTris(cylinder(0.0045, -0.003, 0.003, 6, BOLT, { tag: 2 }), { t: polar(R * 1.004 + 0.002, a, Y_SPH + 0.026), rz: 0 })); }
const hinges = [];
for (let k = 0; k < 4; k++) {
  const a = Math.PI / 4 + (Math.PI / 2) * k;
  const p = [R * Math.sin(POLAR) * Math.cos(a), Y_SPH + R * Math.cos(POLAR), R * Math.sin(POLAR) * Math.sin(a)];
  hinges.push({ a, p });
  ball.push(...placeTris(box([0, 0, 0], [0.04, 0.03, 0.04], HINGE), { ry: -a, t: p }));
}
// the four whips: two of 2.4 m and two of 2.9 m, swept aft
const whips = [];
hinges.forEach(({ a, p }, k) => {
  const len = k % 2 ? L_SHORT : L_LONG;
  const dir = [Math.sin(SWEEP) * Math.cos(a), -Math.cos(SWEEP), Math.sin(SWEEP) * Math.sin(a)];
  const tip = V.add(p, V.mul(dir, len));
  whips.push(...tube(p, tip, 0.006, 6, WHIP, { r1: 0.003 }));
});
const all = nose.concat(ball, whips);
const b = boundsOf(all);
console.log(JSON.stringify({ origins: { nose: boundsOf(nose).mid[1], sphere: Y_SPH, antennas: boundsOf(whips).mid[1] }, lo: b.lo.map((v) => +v.toFixed(3)), hi: b.hi.map((v) => +v.toFixed(3)), heightM: +(b.hi[1] - b.lo[1]).toFixed(3), yNose: +Y_NOSE.toFixed(4), ySphere: +Y_SPH.toFixed(4) }));
const mid = (t) => { const q = boundsOf(t); return [0, q.mid[1], 0]; };
const r = await writeParts(OUT, [
  { name: 'sputnik-nose', tris: nose, origin: mid(nose) },
  { name: 'sputnik-sphere', tris: ball, origin: [0, Y_SPH, 0] },
  { name: 'sputnik-antennas', tris: whips, origin: mid(whips) },
]);
console.log(JSON.stringify(r));
