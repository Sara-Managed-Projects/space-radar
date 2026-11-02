// tests/test_pickindex.mjs -- the hover's coarse grid (scene/pickindex.js) answers exactly what a scan of every point answers, and is quick.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { createPickIndex } = await import(join(JS, 'scene/pickindex.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 160 000 made-up points in front of a plain perspective camera (column-major, as three's elements).
const N = 160000;
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) { pos[i * 3] = (rnd() - 0.5) * 400; pos[i * 3 + 1] = (rnd() - 0.5) * 400; pos[i * 3 + 2] = -rnd() * 400 - 1; }
const f = 1 / Math.tan(0.4), aspect = 1.6, near = 0.1, far = 1000;
const EL = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
const e = EL;
const halfW = 640, halfH = 400;

const brute = (nx, ny, reach, e = EL) => {
  const out = [];
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (w <= 0) continue;
    const dx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w - nx) * halfW, dy = ((e[1] * x + e[5] * y + e[9] * z + e[13]) / w - ny) * halfH;
    if (Math.hypot(dx, dy) <= reach) out.push(i);
  }
  return out.sort((a, b) => a - b);
};
const index = createPickIndex();
const ask = (nx, ny, reach) => { const out = []; index.query(e, pos, 1, N, halfW, halfH, nx, ny, reach, (i) => out.push(i)); return out.sort((a, b) => a - b); };
for (const [nx, ny, reach] of [[0, 0, 10], [0.5, -0.3, 5], [-0.95, 0.9, 24], [0.99, 0.99, 12], [0.1, 0.1, 24]]) {
  check(JSON.stringify(ask(nx, ny, reach)) === JSON.stringify(brute(nx, ny, reach)), `the grid and a full scan agree at (${nx}, ${ny}) reach ${reach}`);
}
// a moved camera builds again, and is answered for where it is now
const e2 = EL.slice(); e2[0] *= 1.3; e2[5] *= 1.3; e2[12] = 0.1;
const out2 = []; index.query(e2, pos, 1, N, halfW, halfH, 0, 0, 10, (i) => out2.push(i));
check(JSON.stringify(out2.sort((a, b) => a - b)) === JSON.stringify(brute(0, 0, 10, e2)), 'a moved camera is answered for the camera it has');
// speed: once built, a question is well under a millisecond
ask(0.2, 0.2, 10);
const t = performance.now();
for (let k = 0; k < 200; k++) ask(((k % 17) / 17 - 0.5) * 1.6, ((k % 11) / 11 - 0.5) * 1.6, 10);
const per = (performance.now() - t) / 200;
check(per < 0.5, `a question of 160 000 points takes ${per.toFixed(3)} ms, over 0.5`);

if (problems.length) { console.error('pickindex FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`pickindex ok: the grid agrees with a full scan of 160 000 points, ${per.toFixed(3)} ms a question once built`);
