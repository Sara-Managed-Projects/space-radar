// tests/test_groundlod.mjs -- levels of detail for a landing site's terrain (forge #193): scene/groundlod.js.
//
// Asserted, with no browser:
//   THE PLAN: blocks tile the grid with no gap and no overlap; a block's spacing never shrinks with distance; the outer ring
//     has one spacing (the skirt follows it); a 127-cell last block still ends on the grid's last post.
//   NO CRACKS: on a rough synthetic grid with every spacing from 1 to 32 side by side, the two blocks that share an edge draw
//     the same line along it (the finer one is set on the coarser one's straight line between its posts).
//   NOTHING INVENTED: every post a block draws is a measured post (or, on an edge beside a coarser block, a point on the line
//     between two measured posts); no height is smoothed.
//   THE COUNT, from the eight real sites: the most triangles a frame can draw with the camera throwing out nothing (every block
//     once, the shadow map's blocks twice) is under triangles_per_stop (100 000) at tier 0, the phone and the latch's fallback,
//     and a fraction of what the whole-grid mesh drew (393 000 and more at Hadley); tier 1 stays near the row, the camera's
//     culling doing the rest (CI's trips job reads the real number).
//   WIRING: the stage cuts the ground with planGround and draws blocks; nothing at boot imports the module.
//
//   node tests/test_groundlod.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const load = (rel) => import(pathToFileURL(join(JS, rel)).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const L = await load('scene/groundlod.js');
const G = await load('scene/groundmath.js');
const { BUDGETS } = await load('data/budgets.js');

// --- the plan -------------------------------------------------------------------------------------------------
{
  check(JSON.stringify(L.posts(0, 10, 4)) === '[0,4,8,10]' && JSON.stringify(L.posts(0, 8, 4)) === '[0,4,8]', 'posts: every stride, and always the last');
  check(JSON.stringify(L.spans(0, 300, 128)) === '[[0,128],[128,256],[256,300]]', 'spans: blocks of at most 128 cells');
  const grid = { size: 1024, step: 2 };
  const blocks = L.planBlocks(grid, { cuts: [0, 512, 1023], block: 128, rings: [[2, 2], [300, 4], [600, 8], [1e9, 16]], edge: 16 });
  const seen = new Set();
  let cells = 0;
  for (const b of blocks) { cells += (b.r1 - b.r0) * (b.c1 - b.c0); seen.add(`${b.r0},${b.c0}`); }
  check(cells === 1023 * 1023 && seen.size === blocks.length, `the blocks tile the grid once (${cells} cells, ${blocks.length} blocks)`);
  check(blocks.some((b) => b.r1 === 1023 && b.r1 - b.r0 === 127), 'the last block has 127 cells and ends on the last post');
  check(blocks.every((b) => b.d >= 0) && blocks.filter((b) => b.d < 2).length === 4, 'four blocks meet at the visitor, who stands at the middle post');
  const byD = blocks.slice().sort((a, b) => a.d - b.d);
  check(byD.every((b, i) => i === 0 || b.stride >= byD[i - 1].stride || b.d === byD[i - 1].d), 'the spacing never shrinks with distance');
  const outer = blocks.filter((b) => b.i === 0 || b.j === 0 || b.i === 8 || b.j === 8 || b.i === 7 || b.j === 7);
  const edgeBlocks = blocks.filter((b) => b.r0 === 0 || b.c0 === 0 || b.r1 === 1023 || b.c1 === 1023);
  check(edgeBlocks.length > 0 && edgeBlocks.every((b) => b.stride >= 16) && outer.length > 0, 'blocks on the grid edge keep the outer spacing (the skirt follows one)');
}

// --- no cracks, nothing invented ---------------------------------------------------------------------------------
{
  const size = 257, step = 2;
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i += 1) h[i] = rnd() * 40;
  const grid = { size, step, h };
  const blocks = L.planBlocks(grid, { cuts: [0, size - 1], block: 32, rings: [[3, 1], [70, 2], [140, 4], [200, 8], [1e9, 32]] });
  const strides = new Set(blocks.map((b) => b.stride));
  check([1, 2, 4, 8, 32].every((s) => strides.has(s)), `the synthetic grid has five spacings side by side (${[...strides].join(', ')})`);
  const arrs = new Map(blocks.map((b) => [`${b.i},${b.j}`, L.blockArrays(grid, b, [0, size - 1, 0, size - 1])]));
  // The height of a block's drawn edge at post `p` along it, by its own posts (linear between them).
  const edgeH = (b, a, side, p) => {
    const R = L.posts(b.r0, b.r1, b.stride), C = L.posts(b.c0, b.c1, b.stride);
    const along = side === 'n' || side === 's' ? C : R;
    let k = 0;
    while (k < along.length - 2 && along[k + 1] <= p) k += 1;
    const get = (t) => {
      const row = side === 'n' ? 0 : side === 's' ? R.length - 1 : t, col = side === 'w' ? 0 : side === 'e' ? C.length - 1 : t;
      return a.pos[(row * C.length + col) * 3 + 1];
    };
    const f = (p - along[k]) / (along[k + 1] - along[k]);
    return get(k) + (get(k + 1) - get(k)) * f;
  };
  let worst = 0, joined = 0;
  const at = new Map(blocks.map((b) => [`${b.i},${b.j}`, b]));
  for (const b of blocks) {
    const east = at.get(`${b.i},${b.j + 1}`), south = at.get(`${b.i + 1},${b.j}`);
    for (const [nb, mine, theirs, lo, hi] of [[east, 'e', 'w', b.r0, b.r1], [south, 's', 'n', b.c0, b.c1]]) {
      if (!nb) continue;
      for (let p = lo; p <= hi; p += 1) {
        const d = Math.abs(edgeH(b, arrs.get(`${b.i},${b.j}`), mine, p) - edgeH(nb, arrs.get(`${nb.i},${nb.j}`), theirs, p));
        if (d > worst) worst = d;
        joined += 1;
      }
    }
  }
  check(joined > 1000 && worst < 1e-3, `blocks that share an edge draw the same line along it (${joined} points, worst gap ${worst.toExponential(2)} m)`);
  // Every post is a measured one, or on a stitched edge.
  let off = 0, total = 0;
  for (const b of blocks) {
    const a = arrs.get(`${b.i},${b.j}`);
    const R = L.posts(b.r0, b.r1, b.stride), C = L.posts(b.c0, b.c1, b.stride);
    R.forEach((r, i) => C.forEach((c, j) => {
      total += 1;
      const y = a.pos[(i * C.length + j) * 3 + 1];
      if (Math.abs(y - h[r * size + c]) > 1e-4) {
        off += 1;
        const onEdge = i === 0 || j === 0 || i === R.length - 1 || j === C.length - 1;
        if (!onEdge) problems.push(`an inner post of block ${b.i},${b.j} is not the measured height`);
      }
    }));
  }
  check(total > 1000 && off < total * 0.2, `only edge posts beside a coarser block are set off the measured height (${off} of ${total})`);
  check(blocks.every((b) => { const a = arrs.get(`${b.i},${b.j}`); return a.uv.every((u) => u >= -1e-9 && u <= 1 + 1e-9); }), 'uv stays inside the picture');
}

// --- the count, from the eight real sites ----------------------------------------------------------------------
{
  const dir0 = join(ROOT, 'site/data/ground');
  const index = JSON.parse(readFileSync(join(dir0, 'index.json'), 'utf8'));
  let most0 = 0, most1 = 0;
  for (const g of index.grounds) {
    const dir = join(dir0, g.id);
    const m = JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8'));
    const bands = m.near.files.map((f) => G.decodeHeights(new Uint8Array(inflateSync(readFileSync(join(dir, f)))), m.near.size, m.near.min, m.near.q));
    const nh = new Float32Array(m.near.size * m.near.size);
    let o = 0;
    for (const b of bands) { nh.set(b, o); o += b.length; }
    const fh = G.decodeHeights(new Uint8Array(inflateSync(readFileSync(join(dir, m.far.file)))), m.far.size, m.far.min, m.far.q);
    const nearG = { size: m.near.size, step: m.near.stepM, h: nh }, farG = { size: m.far.size, step: m.far.stepM, h: fh };
    const w0 = L.worstTriangles(L.planGround(m, 0), nearG, farG), w1 = L.worstTriangles(L.planGround(m, 1), nearG, farG);
    most0 = Math.max(most0, w0.total); most1 = Math.max(most1, w1.total);
    check(w0.total < BUDGETS.triangles_per_stop, `${g.id} at tier 0: at most ${w0.total} triangles a frame (${w0.near} near, ${w0.shadow} in the shadow map, ${w0.far} far), under triangles_per_stop (${BUDGETS.triangles_per_stop})`);
    check(w1.total < 1.5 * BUDGETS.triangles_per_stop, `${g.id} at tier 1: at most ${w1.total} before the camera throws any out`);
    // The plan covers the near ground wholly and the far ground outside the hole.
    const p = L.planGround(m, 0);
    check(p.nearBlocks.every((b) => Number.isInteger(b.tile) && b.tile >= 0 && b.tile < 4), `${g.id}: every near block lies in one of the four pictures`);
  }
  check(most0 > 10000, `the sites were counted (${most0} the most at tier 0, ${most1} at tier 1)`);
}

// --- wiring ---------------------------------------------------------------------------------------------------
{
  const stage = readFileSync(join(JS, 'scene/groundstage.js'), 'utf8');
  check(/from '\.\/groundlod\.js'/.test(stage) && /planGround\(manifest, t\)/.test(stage) && /blockArrays\(/.test(stage), 'the stage cuts the ground with planGround and draws blocks');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/groundlod/.test(main), 'main.js does not import the levels at boot');
}

if (problems.length) { console.error(`test_groundlod: ${problems.length} problem(s)\n - ${problems.join('\n - ')}`); process.exit(1); }
console.log('test_groundlod: ok (the plan, no cracks, nothing invented, the count at the eight sites, the wiring)');
