// scene/groundlod.js -- levels of detail for a landing site's measured terrain (forge #193). Pure arithmetic, no three.js, so
// a node test can count the triangles a stop draws before any browser does.
//
// WHY. The ground stops of the 2.0.0 trips drew each site's terrain whole: the near ground (1 024 x 1 024 posts, 2 m apart)
// and the far ground (512 x 512, 120 m apart) at one spacing everywhere, up to 412 689 triangles a frame at Hadley. The
// visitor stands at the middle (the walker starts at 0, 0), and what is far away is small on the screen.
//
// WHAT. Each grid is cut into square blocks, each its own mesh, so the camera and the sun's shadow map throw out the blocks
// they cannot see. A block takes its spacing from its distance to the middle: every second post near the visitor, every
// 8th, 16th or 32nd far away. This is a SUBSAMPLE of the measured posts: no height is invented or smoothed. Where a block
// meets a coarser one, its edge posts that the coarser block does not have are set on the straight line between the two
// it does have, so no crack opens (`stitch`). The horizon, the walker's feet and the lander read the full grids, never
// these meshes, so the card's "measured ground" line stays true.

/** Spans of at most `block` cells between two posts, [[a, b], ...] (a post is shared by the two spans it joins). */
export function spans(lo, hi, block) {
  const out = [];
  for (let a = lo; a < hi; a += block) out.push([a, Math.min(hi, a + block)]);
  return out;
}

/** The nearest distance, in metres, from the middle (0, 0) to a block of the grid. */
export function blockDistance(grid, b) {
  const half = (grid.size - 1) / 2;
  const x0 = (b.c0 - half) * grid.step, x1 = (b.c1 - half) * grid.step;
  const z0 = (b.r0 - half) * grid.step, z1 = (b.r1 - half) * grid.step;
  const dx = x0 > 0 ? x0 : x1 < 0 ? -x1 : 0;
  const dz = z0 > 0 ? z0 : z1 < 0 ? -z1 : 0;
  return Math.hypot(dx, dz);
}

/**
 * The blocks of a grid and the spacing (in posts) each is drawn at.
 * @param {{size:number, step:number}} grid
 * @param {{cuts:number[], block:number, rings:Array<[number, number]>, edge?:number}} o
 *   cuts   the posts a block never crosses (the near ground's four orthoimage tiles); block the most cells a block spans;
 *   rings  [[maxDistanceM, stride], ...] in order, the last one's distance ignored; edge, a stride no block on the
 *          grid's outer edge goes below (so the skirt that hides the seam to the far ground has one spacing to follow).
 */
export function planBlocks(grid, o) {
  const cuts = o.cuts && o.cuts.length >= 2 ? o.cuts : [0, grid.size - 1];
  const seg = [];
  for (let i = 0; i + 1 < cuts.length; i += 1) seg.push(...spans(cuts[i], cuts[i + 1], o.block));
  const blocks = [];
  seg.forEach(([r0, r1], i) => seg.forEach(([c0, c1], j) => {
    const b = { i, j, r0, r1, c0, c1, stride: 1, d: 0 };
    b.d = blockDistance(grid, b);
    let s = o.rings[o.rings.length - 1][1];
    for (const [maxD, st] of o.rings) if (b.d < maxD) { s = st; break; }
    if (o.edge && (i === 0 || j === 0 || i === seg.length - 1 || j === seg.length - 1)) s = Math.max(s, o.edge);
    // The last block of a 1 024-post grid has 127 cells: its posts stop short of the grid's edge by less than one stride, as
    // the whole-grid mesh did before.
    b.stride = s;
    blocks.push(b);
  }));
  const at = new Map(blocks.map((b) => [`${b.i},${b.j}`, b]));
  for (const b of blocks) {
    const s = (i, j) => { const n = at.get(`${i},${j}`); return n ? n.stride : 0; };
    b.nb = { n: s(b.i - 1, b.j), s: s(b.i + 1, b.j), w: s(b.i, b.j - 1), e: s(b.i, b.j + 1) };
  }
  return blocks;
}

/** The posts of a span, every `stride` from its start, and always its last post (a block of 127 cells ends one cell short of a stride). */
export function posts(a, b, stride) {
  const out = [];
  for (let p = a; p < b; p += stride) out.push(p);
  out.push(b);
  return out;
}

/** The posts along a whole grid edge: every `stride` from 0, then the last post. What the skirt round the near ground follows. */
export function latticePosts(size, stride) { return posts(0, size - 1, stride); }

/**
 * One block as typed arrays: positions, normals (from the full grid), uvs over `uvBox` and the index. `skipCell(r, c, stride)`
 * leaves a cell out (the far ground's hole where the near ground is).
 */
export function blockArrays(grid, b, uvBox, skipCell) {
  const half = (grid.size - 1) / 2, S = grid.size, H = grid.h, stride = b.stride;
  const R = posts(b.r0, b.r1, stride), C = posts(b.c0, b.c1, stride);
  const rows = R.length, cols = C.length;
  const at = (r, c) => H[Math.min(S - 1, Math.max(0, r)) * S + Math.min(S - 1, Math.max(0, c))];
  const pos = new Float32Array(rows * cols * 3), nor = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2);
  const [ur0, ur1, uc0, uc1] = uvBox;
  let k = 0;
  for (let i = 0; i < rows; i += 1) {
    const r = R[i];
    for (let j = 0; j < cols; j += 1) {
      const c = C[j];
      let h = at(r, c);
      if (!Number.isFinite(h)) h = 0;
      pos[k * 3] = (c - half) * grid.step; pos[k * 3 + 1] = h; pos[k * 3 + 2] = (r - half) * grid.step;
      const hx = at(r, c + 1) - at(r, c - 1), hz = at(r + 1, c) - at(r - 1, c);
      const nx = Number.isFinite(hx) ? -hx / (2 * grid.step) : 0, nz = Number.isFinite(hz) ? -hz / (2 * grid.step) : 0;
      const len = Math.hypot(nx, 1, nz);
      nor[k * 3] = nx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = nz / len;
      uv[k * 2] = (c - uc0) / (uc1 - uc0); uv[k * 2 + 1] = (r - ur0) / (ur1 - ur0);
      k += 1;
    }
  }
  stitch(grid, b, R, C, pos);
  const index = [];
  for (let i = 0; i < rows - 1; i += 1) {
    for (let j = 0; j < cols - 1; j += 1) {
      const r = R[i], c = C[j];
      if (skipCell && skipCell(r, c, stride)) continue;
      if (!Number.isFinite(at(r, c)) || !Number.isFinite(at(R[i + 1], C[j + 1]))) continue;
      const a = i * cols + j, bb = a + 1, d = a + cols, e = d + 1;
      index.push(a, d, bb, bb, d, e);
    }
  }
  return { pos, nor, uv, index: rows * cols < 65536 ? Uint16Array.from(index) : Uint32Array.from(index), rows, cols };
}

/** Where this block meets a block with a larger stride, put the posts that block lacks on the line between the two it has. */
function stitch(grid, b, R, C, pos) {
  const S = grid.size, H = grid.h, rows = R.length, cols = C.length;
  const h = (r, c) => H[r * S + c];
  const fix = (n, side) => {
    if (!(n > b.stride)) return;
    const alongPosts = side === 'n' || side === 's' ? C : R;
    const start = alongPosts[0], end = alongPosts[alongPosts.length - 1];
    for (let t = 1; t < alongPosts.length - 1; t += 1) {
      const off = alongPosts[t] - start;
      if (off % n === 0) continue;
      const lo = off - (off % n), hi = Math.min(lo + n, end - start);
      let r1, c1, r2, c2, row, col;
      if (side === 'n' || side === 's') {
        const r = side === 'n' ? b.r0 : b.r1;
        r1 = r; r2 = r; c1 = start + lo; c2 = start + hi; row = side === 'n' ? 0 : rows - 1; col = t;
      } else {
        const c = side === 'w' ? b.c0 : b.c1;
        c1 = c; c2 = c; r1 = start + lo; r2 = start + hi; col = side === 'w' ? 0 : cols - 1; row = t;
      }
      const a = h(r1, c1), z = h(r2, c2);
      if (!Number.isFinite(a) || !Number.isFinite(z)) continue;
      pos[(row * cols + col) * 3 + 1] = a + (z - a) * ((off - lo) / (hi - lo));
    }
  };
  fix(b.nb.n, 'n'); fix(b.nb.s, 's'); fix(b.nb.w, 'w'); fix(b.nb.e, 'e');
}

/** The triangles a block draws (what blockArrays would index). */
export function blockTriangles(grid, b, skipCell) {
  const S = grid.size, H = grid.h;
  const R = posts(b.r0, b.r1, b.stride), C = posts(b.c0, b.c1, b.stride);
  let n = 0;
  for (let i = 0; i < R.length - 1; i += 1) {
    for (let j = 0; j < C.length - 1; j += 1) {
      if (skipCell && skipCell(R[i], C[j], b.stride)) continue;
      if (!Number.isFinite(H[R[i] * S + C[j]]) || !Number.isFinite(H[R[i + 1] * S + C[j + 1]])) continue;
      n += 2;
    }
  }
  return n;
}

// The levels. Distances are metres from the middle; strides are posts (near: 2 m apart, far: 120 m apart).
// Tier 0 is a phone and the frame latch's fallback, tier 1 and up a desktop. The centre four near blocks are the ones the
// sun's shadow map draws again (its box is 260 m round the visitor), so they count twice.
export const NEAR_LEVELS = {
  0: { block: 128, rings: [[2, 4], [400, 8], [700, 16], [1e9, 32]], edge: 32 },
  1: { block: 128, rings: [[2, 2], [300, 4], [600, 8], [1e9, 16]], edge: 16 },
};
export const FAR_LEVELS = {
  0: { block: 64, rings: [[1000, 2], [12000, 4], [1e9, 8]] },
  1: { block: 64, rings: [[1000, 2], [15000, 4], [1e9, 8]] },
};
export const levelFor = (table, tier) => table[tier <= 0 ? 0 : 1];

/** The shadow map's half-width round the visitor, metres (groundstage.js shadowCam). */
export const SHADOW_HALF_M = 260;

/** How the stage cuts a site: the near ground in its four orthoimage tiles' blocks, the far ground in its blocks, and the far hole. */
export function planGround(manifest, tier) {
  const near = manifest.near, far = manifest.far;
  const q = Math.floor(near.size / 2);
  const nearGrid = { size: near.size, step: near.stepM }, farGrid = { size: far.size, step: far.stepM };
  const nearBlocks = planBlocks(nearGrid, { ...levelFor(NEAR_LEVELS, tier), cuts: [0, q, near.size - 1] });
  const farBlocks = planBlocks(farGrid, { ...levelFor(FAR_LEVELS, tier), cuts: [0, far.size - 1] });
  // A near block belongs to the orthoimage tile it lies in: [row, column] of the four, and that tile's posts.
  for (const b of nearBlocks) {
    const qr = b.r0 >= q ? 1 : 0, qc = b.c0 >= q ? 1 : 0;
    b.tile = qr * 2 + qc;
    b.uvBox = [qr * q, Math.min(near.size - 1, qr * q + q), qc * q, Math.min(near.size - 1, qc * q + q)];
  }
  for (const b of farBlocks) b.uvBox = [0, far.size - 1, 0, far.size - 1];
  // The far ground has a hole where the near ground is: a far cell wholly inside it is not drawn.
  const nearHalfM = ((near.size - 1) / 2) * near.stepM, fHalf = (far.size - 1) / 2;
  const skip = (r, c, s) => {
    const x0 = (c - fHalf) * far.stepM, x1 = (c + s - fHalf) * far.stepM;
    const z0 = (r - fHalf) * far.stepM, z1 = (r + s - fHalf) * far.stepM;
    return x0 > -nearHalfM && x1 < nearHalfM && z0 > -nearHalfM && z1 < nearHalfM;
  };
  return { nearGrid, farGrid, nearBlocks, farBlocks, skip, nearHalfM };
}

/** Does a block lie (even in part) inside the shadow map's box round the visitor? */
export function inShadow(grid, b) {
  const half = (grid.size - 1) / 2;
  const x0 = (b.c0 - half) * grid.step, x1 = (b.c1 - half) * grid.step, z0 = (b.r0 - half) * grid.step, z1 = (b.r1 - half) * grid.step;
  return x1 > -SHADOW_HALF_M && x0 < SHADOW_HALF_M && z1 > -SHADOW_HALF_M && z0 < SHADOW_HALF_M;
}

/**
 * The most triangles a frame can draw of a site, with nothing thrown out by the camera: every block of both grids once, and
 * the near blocks inside the shadow map's box a second time (the sun's depth pass). The camera only ever lowers it.
 * @param {{h: Float32Array}} nearH @param {{h: Float32Array}} farH the full height grids ({size, step, h})
 */
export function worstTriangles(plan, nearH, farH) {
  let main = 0, shadow = 0, far = 0;
  for (const b of plan.nearBlocks) {
    const n = blockTriangles(nearH, b);
    main += n;
    if (inShadow(plan.nearGrid, b)) shadow += n;
  }
  for (const b of plan.farBlocks) far += blockTriangles(farH, b, plan.skip);
  return { near: main, shadow, far, total: main + shadow + far };
}
