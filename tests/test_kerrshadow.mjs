// tests/test_kerrshadow.mjs -- the shadow of a turning black hole (forge #149): scene/kerrshadow.js, ui/holespin.js.
//
//   node tests/test_kerrshadow.mjs
//
// What it holds:
//   1. A HOLE THAT DOES NOT TURN casts a circle sqrt(27) M across in radius, from any angle, and its photon orbits
//      are both at 3 M.
//   2. THE PHOTON ORBITS of a hole near the highest spin are at 1 M (going with it) and 4 M (against it).
//   3. THE D: edge-on at a = 0.998 the shadow runs from about -7 M to +2 M across and 5.2 M up (Bardeen 1973; the
//      figure in Chandrasekhar 1983, section 63), flattened on the side that comes towards us (+x).
//   4. SEEN ALONG THE AXIS it is round again, whatever the spin.
//   5. THE FOURIER FIT that the shader takes is within 0.05 M of the outline everywhere, and its first term is negative:
//      the shadow is pushed away from the approaching side.
//   6. THE CARD LINE names the spin and says it is chosen, for the two holes given one, and nothing for the others.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = await import(join(ROOT, 'site/js/scene/kerrshadow.js'));
const H = await import(join(ROOT, 'site/js/ui/holespin.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.stars.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R27 = Math.sqrt(27);

const o0 = K.photonOrbits(0);
check(Math.abs(o0.pro - 3) < 1e-9 && Math.abs(o0.retro - 3) < 1e-9, 'a still hole: both photon orbits at 3 M');
for (const i of [10, 45, 90]) {
  const pts = K.kerrOutline(0, i, 64);
  check(pts.every(([x, y]) => Math.abs(Math.hypot(x, y) - R27) < 1e-6), `a still hole from ${i} degrees is a circle of sqrt(27)`);
}
const o1 = K.photonOrbits(0.9999);
check(Math.abs(o1.pro - 1) < 0.05 && Math.abs(o1.retro - 4) < 0.01, `near the highest spin the orbits are ${o1.pro.toFixed(3)} and ${o1.retro.toFixed(3)} M`);

const d = K.kerrOutline(0.998, 90, 512);
const xs = d.map((p) => p[0]);
const ys = d.map((p) => p[1]);
check(Math.min(...xs) < -6.9 && Math.min(...xs) > -7.1, `edge-on, the far edge at ${Math.min(...xs).toFixed(2)} M`);
check(Math.max(...xs) > 1.9 && Math.max(...xs) < 2.3, `edge-on, the flattened edge at ${Math.max(...xs).toFixed(2)} M`);
check(Math.abs(Math.max(...ys) - R27) < 0.05, `edge-on, ${Math.max(...ys).toFixed(2)} M up`);

const face = K.kerrOutline(0.94, 0.5, 128);
const rs = face.map(([x, y]) => Math.hypot(x, y));
check(Math.max(...rs) - Math.min(...rs) < 0.05, 'along the axis the shadow is round');

for (const [a, i] of [[0.94, 17], [0.5, 48], [0.94, 60]]) {
  const c = K.shadowFourier(a, i);
  const pts = K.kerrOutline(a, i, 256);
  let worst = 0;
  for (const [x, y] of pts) {
    const psi = Math.atan2(y, x);
    const R = c[0] + c[1] * Math.cos(psi) + c[2] * Math.cos(2 * psi) + c[3] * Math.cos(3 * psi);
    worst = Math.max(worst, Math.abs(R - Math.hypot(x, y)));
  }
  check(worst < 0.05, `a = ${a}, i = ${i}: the fit is ${worst.toFixed(3)} M from the outline at worst`);
  check(c[1] < 0, `a = ${a}, i = ${i}: the shadow is pushed away from the approaching side`);
}

const words = H.spinWords('exotic-m87-star', COPY.blackHoleSpin);
check(/0\.94/.test(words) && /chosen/.test(words) && /modelled/.test(words), `M87*'s line: ${words}`);
check(H.spinWords('cygnus-x-1', COPY.blackHoleSpin) === '', 'Cygnus X-1 is drawn without spin and says nothing');

if (problems.length) {
  console.error(`kerrshadow FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(`kerrshadow ok: a still hole is sqrt(27) round; at a = 0.998 edge-on the D runs ${Math.min(...xs).toFixed(2)} to ${Math.max(...xs).toFixed(2)} M; M87* at a = ${K.SPINS['m87-star']}`);
