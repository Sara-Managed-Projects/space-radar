// build-saturn-v.mjs -- split the shipped Saturn V (NASA's model, baked by scripts/bake-own-colours.mjs
// in release 1.1) into the parts that really separate, in metres, +Y up, origin at the base of the stack.
//
//   git show 04c0c43:site/models/saturn-v.glb > saturn-v-1.4.glb
//   cd <folder with node_modules> && node /path/to/scripts/apollo/build-saturn-v.mjs saturn-v-1.4.glb out/saturn-v.glb
//
// WHAT COMES FROM NASA, UNTOUCHED: every triangle of the shipped file keeps its colour, its position
// (scaled) and its normal. They are cut at the planes below and handed to the part they belong to.
// WHAT IS OURS, and drawn only where a separated part would otherwise show a hole or an empty
// place: the inside of every hollow ring (the same shell turned inside out, a shade darker, 1.5 % in),
// the closing discs at the cut ends, the five J-2s of the S-II and the one of the S-IVB (which NASA's
// file does not have; they sit where the interstage hides them until it falls away), and the
// launch escape tower (NASA's file has a bare rod there).
import { box, readTris, writeParts, col, shade, clipY, clipWedge, scaleTris, flip, recolour, boundsOf, lathe, cylinder, frustum, disc, tube, sphere, aim, V } from './kit.mjs';

const [IN, OUT] = process.argv.slice(2);
if (!IN || !OUT) { console.error('usage: build-saturn-v.mjs shipped-1.4/saturn-v.glb out.glb'); process.exit(2); }

let all = await readTris(IN);

// ---- the cuts, read from the ring edges NASA drew (raw file, units of NASA's file) -----------------
const CUT = { ic: 4.845, ii: 5.455, s2: 8.427, s4: 10.219, sla: 11.006, sm: 11.503, bpc: 11.692 };
// ---- the metres: NASA's file is 12.99 units tall and 1.246 across its body ---------------------------
// the body is 0.623 in radius -> the S-IC's 5.03 m (10.06 m across); the top of the rod, 12.846 -> the
// stack's 110.6 m. The two ratios differ by 7 %, and the real vehicle is the slimmer one, so the file is
// scaled 7.97 across and 8.51 along. The stage lengths then agree with the published ones:
// S-IC 42.0 m (42.1), its interstage 5.2 m (5.5), S-II with its upper interstage 24.7 m (24.9).
const SXZ = 5.03 / 0.623, SY = 110.6 / (12.846 + 0.14), Y0 = -0.14;
// the axis of the body, from the S-IVB's cylinder (nothing hangs off it there)
const bIV = boundsOf(all.filter((t) => { const y = (t.p[1] + t.p[4] + t.p[7]) / 3; return y > 8.6 && y < 9.9; }));
const AX = [bIV.mid[0], bIV.mid[2]];
const toM = (tris) => scaleTris(tris.map((t) => ({ ...t, p: t.p.map((v, i) => (i % 3 === 0 ? v - AX[0] : i % 3 === 2 ? v - AX[1] : v - Y0)) })), [SXZ, SY, SXZ]);
const Y = (u) => (u - Y0) * SY;      // a height in NASA's units -> metres
const R = (r) => r * SXZ;

const WHITE = col('#e9e9e4'), BLACK = col('#1d1d20'), GREY = col('#8c8e92'), DARK = col('#3b3c40'), LIGHT = col('#cfd0cb'), BRONZE = col('#6a5a4c'), STEEL = col('#a4a6aa');

// ---- 1. NASA's triangles, by height -------------------------------------------------------------
const bandOf = (lo, hi) => toM(clipY(all, lo, hi));
let sic = bandOf(-1, CUT.ic);
let inter = bandOf(CUT.ic, CUT.ii);
let sii = bandOf(CUT.ii, CUT.s2);
let siv = bandOf(CUT.s2, CUT.s4);
let slaAll = bandOf(CUT.s4, CUT.sla);
// above the SLA NASA draws the SM (a cylinder with its four RCS quads) and, over the CM, the BPC's short cone
let smStowed = bandOf(CUT.sla, CUT.sm);
let bpc = bandOf(CUT.sm, CUT.bpc);

// ---- 2. the insides of the hollow ones: the shell again, inside out, a shade darker, 1.5 % in ------
const liner = (tris, c) => recolour(flip(scaleTris(tris, [0.985, 1, 0.985])), c);
// a ring wall's two end faces (so the ring has a thickness and no slit shows between shell and liner)
const annulus = (r, y, segs, c, dir) => disc(r, y, segs, c, dir, { r0: r * 0.985 });

const rAt = (tris, y) => { // the outer radius of NASA's shell at height y (metres), from its own triangles
  let r = 0; for (const t of tris) for (let k = 0; k < 3; k++) if (Math.abs(t.p[k * 3 + 1] - y) < 0.05) r = Math.max(r, Math.hypot(t.p[k * 3], t.p[k * 3 + 2]));
  return r;
};

// S-IC: closed at its top by its forward skirt
const rIC = rAt(sic, Y(CUT.ic) - 0.03) || R(0.623);
sic = sic.concat(disc(rIC * 0.985, Y(CUT.ic), 36, DARK, 1));

// interstage S-IC/S-II: a ring, open both ends
const rIn = rAt(inter, Y(CUT.ic) + 0.03) || R(0.652);
inter = inter.concat(liner(inter, DARK), annulus(rIn, Y(CUT.ic), 36, DARK, -1), annulus(rIn, Y(CUT.ii), 36, DARK, 1));

// S-II: aft dome with five J-2s hanging from it, closed at the top by the S-IVB's skirt
const J2 = (x, y, z) => { // y = the exit plane; the engine stands 3.4 m tall above it
  const bell = lathe([[0.99, 0], [0.93, 0.35], [0.82, 0.8], [0.63, 1.5], [0.43, 2.3], [0.33, 2.9], [0.46, 3.05], [0.46, 3.4], [0, 3.4]], 20, BRONZE);
  const inside = flip(lathe([[0.95, 0.02], [0.8, 0.8], [0.6, 1.5], [0.4, 2.3], [0.3, 2.9]], 20, col('#26262a')));
  const pump = cylinder(0.24, 1.9, 3.1, 12, STEEL).concat(disc(0.24, 3.1, 12, STEEL, 1)).map((t) => t);
  const pumpMoved = aim(pump, [0, 1, 0], [0.62, 0, 0]);
  const gimbal = cylinder(0.58, 3.4, 3.62, 16, GREY).concat(disc(0.58, 3.62, 16, GREY, 1));
  return aim(bell.concat(inside, pumpMoved, gimbal), [0, 1, 0], [x, y, z]);
};
const yDomeS2 = Y(CUT.ii);
const dome = lathe([[rAt(sii, yDomeS2 + 0.03) * 0.985 || R(0.62), 0], [R(0.5), -0.25], [R(0.3), -0.45], [0.9, -0.58], [0, -0.6]], 36, GREY);
sii = sii.concat(aim(dome, [0, 1, 0], [0, yDomeS2, 0]));
const S2_EXIT = yDomeS2 - 0.6 - 3.62;
const s2Pos = [[0, 0], ...[45, 135, 225, 315].map((a) => [2.9 * Math.cos((a * Math.PI) / 180), 2.9 * Math.sin((a * Math.PI) / 180)])];
for (const [x, z] of s2Pos) sii = sii.concat(J2(x, S2_EXIT, z));
// the S-II's upper end: the interstage's taper ends in a closed face the S-IVB sits on
const rTop = rAt(sii, Y(CUT.s2) - 0.03) || R(0.43);
sii = sii.concat(liner(clipY(sii, Y(CUT.ii) + 0.05, Y(CUT.s2)).filter((t) => t.p.every((v, i) => i % 3 !== 1 || v > Y(7.7))), DARK), disc(rTop * 0.985, Y(CUT.s2), 30, DARK, 1));

// S-IVB: aft skirt closed, its one J-2 inside the S-II's interstage; the forward face closed at the IU ring
const rIV = rAt(siv, Y(CUT.s2) + 0.03) || R(0.43);
siv = siv.concat(disc(rIV * 0.985, Y(CUT.s2), 30, DARK, -1), J2(0, Y(CUT.s2) - 3.62, 0), disc(rIV * 0.96, Y(CUT.s4), 30, LIGHT, 1));
const S4_EXIT = Y(CUT.s2) - 3.62;

// SLA: four panels, cut along the diagonals, each with its inside. Light inside: the SLA was painted white.
const slaParts = [];
for (let k = 0; k < 4; k++) {
  const a0 = Math.PI / 4 + (k * Math.PI) / 2, a1 = a0 + Math.PI / 2;
  const outer = clipWedge(slaAll, 0, 0, a0 - Math.PI * 2 * Math.floor(a0 / (Math.PI * 2)), a1 - Math.PI * 2 * Math.floor(a0 / (Math.PI * 2)));
  slaParts.push(outer.concat(liner(outer, LIGHT)));
}

// BPC: the boost protective cover over the CM, with the inside of its shell (it rides up with the tower)
bpc = bpc.concat(liner(bpc, LIGHT));

// ---- 3. the launch escape tower, ours (NASA's file has a rod): truss, motor, jettison motor, nose -------
const les = [];
{
  const y0 = Y(CUT.bpc) - 0.25;           // the base sits in the BPC's apex
  const add = (t) => { for (const x of t) les.push(x); };
  add(frustum(0.62, 0.5, y0, y0 + 0.45, 20, WHITE)); add(disc(0.5, y0 + 0.45, 20, WHITE, 1));
  // four truss legs from the base ring up to the motor's skirt, two cross-rings, and the four canted nozzles in the truss
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const lo = [0.55 * Math.cos(a), y0 + 0.4, 0.55 * Math.sin(a)], hi = [0.3 * Math.cos(a), y0 + 3.5, 0.3 * Math.sin(a)];
    add(tube(lo, hi, 0.05, 6, STEEL));
    const nz = [0.2 * Math.cos(a), y0 + 3.55, 0.2 * Math.sin(a)], ne = [0.5 * Math.cos(a), y0 + 3.0, 0.5 * Math.sin(a)];
    add(tube(nz, ne, 0.1, 8, BLACK, { r1: 0.17, caps: false }));
  }
  for (const [h, r] of [[1.4, 0.46], [2.5, 0.37]]) for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4, b = a + Math.PI / 2;
    add(tube([r * Math.cos(a), y0 + h, r * Math.sin(a)], [r * Math.cos(b), y0 + h, r * Math.sin(b)], 0.035, 5, STEEL));
  }
  // diagonals of the truss
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4, b = a + Math.PI / 2;
    add(tube([0.5 * Math.cos(a), y0 + 0.9, 0.5 * Math.sin(a)], [0.4 * Math.cos(b), y0 + 2.0, 0.4 * Math.sin(b)], 0.03, 5, STEEL));
  }
  // launch escape motor (white), then the dark jettison motor, the pitch-control band, the nose
  add(cylinder(0.34, y0 + 3.5, y0 + 7.0, 24, WHITE)); add(disc(0.34, y0 + 3.5, 24, DARK, -1));
  add(cylinder(0.355, y0 + 5.2, y0 + 5.35, 24, BLACK));
  add(frustum(0.34, 0.3, y0 + 7.0, y0 + 7.15, 24, GREY)); add(cylinder(0.3, y0 + 7.15, y0 + 8.1, 20, BLACK));
  add(lathe([[0.3, y0 + 8.1], [0.3, y0 + 8.3], [0.22, y0 + 9.0], [0.12, y0 + 9.5], [0.02, y0 + 9.7]], 20, WHITE));
  add(sphere(0.07, 8, 6, STEEL).map((t) => ({ ...t, p: t.p.map((v, i) => (i % 3 === 1 ? v + y0 + 9.78 : v)) })));
}
{
  // canards: four thin fins under the nose, folded flat against it
  const y0 = Y(CUT.bpc) - 0.25;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const fin = aim(box([0, 0, 0], [0.5, 0.025, 0.55], BLACK), [0, 1, 0], [0.45 * Math.cos(a), y0 + 8.35, 0.45 * Math.sin(a)], -a);
    for (const x of fin) les.push(x);
  }
}

// the SM that NASA draws on top of the SLA: its aft rim sits on the SLA's top ring. Its inside is shown too, the CM having left the cap on it.
smStowed = smStowed.concat(liner(smStowed, LIGHT));

// ---- 4. the parts, each about its own middle, and the numbers the registry row carries ---------------
const parts = [];
const mid = (tris) => { const b = boundsOf(tris); return [0, b.mid[1], 0]; };
const addPart = (name, tris, origin) => parts.push({ name, tris, origin: origin || mid(tris) });
// flight order: the stage and the ring that fall first, the tower and its cover, the second stage, the SLA panels (and the
// SM NASA draws above them, which the moments engine swaps for apollo-csm when they open), the third stage
addPart('s-ic', sic); addPart('interstage-ic-ii', inter); addPart('les-tower', les); addPart('bpc', bpc);
addPart('s-ii', sii);
slaParts.forEach((t, i) => addPart(`sla-${i + 1}`, t, boundsOf(t).mid));
addPart('csm-stowed', smStowed);
addPart('s-ivb', siv);

const r = await writeParts(OUT, parts);
const attach = Object.fromEntries(parts.map((p) => [p.name, p.origin.map((v) => +v.toFixed(2))]));
console.log(JSON.stringify({ file: OUT, ...r, attach, height: boundsOf(parts.flatMap((p) => p.tris)).hi[1], engines: { s2: S2_EXIT, s4: S4_EXIT } }, null, 1));
