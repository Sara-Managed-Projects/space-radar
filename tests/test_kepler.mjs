// tests/test_kepler.mjs -- the Kepler equation solvers behind every orbit drawn from elements (public #621).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { solveKeplerElliptic, solveBarker } = await import(join(JS, 'propagate/kepler.js'));

for (const [M, e] of [[1, 0.5], [3, 0.99], [0.2, 0.9]]) {
  const E = solveKeplerElliptic(M, e);
  check(near(E - e * Math.sin(E), M), `E solves Kepler's equation for M ${M}, e ${e} (E ${E})`);
}
check(near(solveKeplerElliptic(0.2, 0), 0.2), 'a circle: E equals M');
check(near(solveKeplerElliptic(1 + 2 * Math.PI, 0.5), solveKeplerElliptic(1, 0.5)), 'the mean anomaly is wrapped');
check(solveBarker(0) === 0, 'Barker at M 0 is 0');
const D = solveBarker(1);
check(near(D + D ** 3 / 3, 1), `D solves Barker's equation for M 1 (D ${D})`);

if (problems.length) { console.error('Kepler solvers FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('Kepler solvers ok: elliptic solutions satisfy the equation, a circle, a wrapped angle, the Barker equation');
