// build-lunar-module.mjs -- NASA's Apollo Lunar Module, as two stages: the descent stage (with its legs,
// ladder, porch and engine) and the ascent stage (cabin, ascent engine, RCS quads, antennas).
//
//   node build-lunar-module.mjs descent-baked.glb ascent-baked.glb out.glb
//
// The two inputs are NASA's file cut at the node level (the descent: nodes group31*, group73, group74, the porch
// and everything that ends below 2.35 or lies between 2.0 and 3.0 and starts below 2.4; the ascent: the rest) and
// each baked with scripts/bake-own-colours.mjs (see the registry row for the numbers). This script only puts them
// in metres, +Y up, origin on the footpads' plane at the vehicle's axis, one node a stage.
import { readTris, writeParts, scaleTris, boundsOf } from './kit.mjs';

const [DESC, ASC, OUT] = process.argv.slice(2);
if (!DESC || !ASC || !OUT) { console.error('usage: build-lunar-module.mjs descent.glb ascent.glb out.glb'); process.exit(2); }
// NASA's file is 6.43 across the footpads and 5.01 tall (5.12 - 0.10); the published LM is 9.4 m across and 7.04 m tall
// (legs extended): 1.46 and 1.405 m a unit. One scale for both, 1.43, keeps the vehicle itself in proportion.
const S = 1.43, Y0 = 0.10;
const place = (tris) => scaleTris(tris.map((t) => ({ ...t, p: t.p.map((v, i) => (i % 3 === 1 ? v - Y0 : v)) })), [S, S, S]);
const desc = place(await readTris(DESC)), asc = place(await readTris(ASC));
const bd = boundsOf(desc), ba = boundsOf(asc);
const parts = [
  { name: 'descent-stage', tris: desc, origin: [0, bd.mid[1], 0] },
  { name: 'ascent-stage', tris: asc, origin: [0, ba.mid[1], 0] },
];
const r = await writeParts(OUT, parts);
const all = boundsOf(desc.concat(asc));
console.log(JSON.stringify({ ...r, size: all.size.map((v) => +v.toFixed(2)), descent: { lo: bd.lo, hi: bd.hi }, ascent: { lo: ba.lo, hi: ba.hi }, origins: parts.map((p) => p.origin) }));
