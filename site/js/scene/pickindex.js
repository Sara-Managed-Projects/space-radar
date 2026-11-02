// scene/pickindex.js -- a coarse screen grid over a big cloud of points, so a hover can ask "what is under
// the pointer" of 160 000 stars in a fraction of a millisecond.
//
// Projecting every star costs about 2 ms (measured, 160 000 points, 2026-11-02); a hover asks every 50 ms,
// and most of the time the camera has not moved since the last ask. So the projection is done once per
// camera, the stars are dropped into 32 px cells (a counting sort), and a question looks only at the
// cells round the pointer. A camera that moves builds the grid again on its next question, which is the
// cost the scan had anyway. Pure of the DOM; three's matrix elements in, indices out.

const CELL = 32;

export function createPickIndex() {
  let key = null;          // what the grid was built for
  let cols = 0, rows = 0;
  let start = new Int32Array(0);
  let items = new Int32Array(0);
  let cellOf = new Int32Array(0);

  const sameKey = (k) => key && key.pos === k.pos && key.version === k.version && key.count === k.count
    && key.halfW === k.halfW && key.halfH === k.halfH && key.e.every((v, i) => v === k.e[i]);

  function build(k) {
    const { e, pos, count, halfW, halfH } = k;
    const W = halfW * 2, H = halfH * 2;
    cols = Math.ceil(W / CELL) + 2;
    rows = Math.ceil(H / CELL) + 2;
    const cells = cols * rows;
    if (cellOf.length < count) cellOf = new Int32Array(count);
    if (start.length < cells + 1) start = new Int32Array(cells + 1); else start.fill(0, 0, cells + 1);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      cellOf[i] = -1;
      if (w <= 0) continue;
      const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) * halfW;
      if (sx < -CELL || sx > W + CELL) continue;
      const sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) * halfH;
      if (sy < -CELL || sy > H + CELL) continue;
      const c = (Math.floor((sy + CELL) / CELL)) * cols + Math.floor((sx + CELL) / CELL);
      cellOf[i] = c;
      start[c + 1] += 1;
      n += 1;
    }
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    if (items.length < n) items = new Int32Array(n);
    const fill = start.slice(0, cells);
    for (let i = 0; i < count; i++) if (cellOf[i] >= 0) items[fill[cellOf[i]]++] = i;
    key = k;
  }

  /**
   * Every point within `reachPx` of the pointer, as visit(i, px, sx, sy, depth).
   * `e` the 16 elements of projection * view * world, `version` any number that changes when `pos` is rewritten.
   */
  function query(e, pos, version, count, halfW, halfH, ndcX, ndcY, reachPx, visit) {
    const k = { e: Array.from(e), pos, version, count, halfW, halfH };
    if (!sameKey(k)) build(k);
    const tx = (ndcX + 1) * halfW, ty = (1 - ndcY) * halfH;
    const span = Math.ceil(reachPx / CELL);
    const c0 = Math.floor((tx + CELL) / CELL), r0 = Math.floor((ty + CELL) / CELL);
    for (let r = Math.max(0, r0 - span); r <= Math.min(rows - 1, r0 + span); r++) {
      for (let c = Math.max(0, c0 - span); c <= Math.min(cols - 1, c0 + span); c++) {
        const cell = r * cols + c;
        for (let j = start[cell]; j < start[cell + 1]; j++) {
          const i = items[j];
          const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
          const w = e[3] * x + e[7] * y + e[11] * z + e[15];
          const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) * halfW;
          const sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) * halfH;
          const px = Math.hypot(sx - tx, sy - ty);
          if (px <= reachPx) visit(i, px, sx, sy, w);
        }
      }
    }
  }

  return { query };
}
