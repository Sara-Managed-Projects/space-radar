// build-csm.mjs -- the Apollo Command and Service Module, from NASA's own model, in two parts: the command
// module and the service module (they part at the end of the way home), in metres, +Y toward the CM's nose,
// origin on the SPS nozzle's exit plane on the axis.
//
//   node build-csm.mjs csm-shell.glb csm-quads.glb out.glb
//
// WHAT IS NASA'S. NASA 3D Resources ships no Apollo CSM of its own; the nearest it has is the CSM of the
// Apollo-Soyuz Test Project, in "3D Models/Apollo Soyuz/Apollo Soyuz.glb" (public domain), on the same airframe
// as Apollo 11's. Its docking module and the Soyuz were cut away (every triangle forward of the CM's tip), and
// what is left was baked twice with scripts/bake-own-colours.mjs: (1) the shells -- the CM's cone and heat-shield
// bulge, the SM's cylinder, the SPS engine skirt and the SPS nozzle -- not decimated at all, and (2) the four RCS
// quads with their sixteen thrusters, decimated from 11 504 to about 4 000 triangles. The two baked files are the
// inputs. They are scaled 0.7637 m a unit so the SM is the published 3.91 m across.
// WHAT IS OURS, and drawn from the photographs listed in the registry row (AS09-24-3649, 3654, 3657 and 3660,
// AS17-145-22254; all NASA, public domain): the five windows and the hatch, the docking ring and its probe, the
// forward-heat-shield separation ring, the SM's six radial beams, its radiator panels, the umbilical fairing, two VHF
// scimitars, the closing disc of the SM's forward end, and THE HIGH-GAIN ANTENNA, which NASA's file does not have:
// a boom from the SM's aft rim and the array of four 0.79 m dishes with the small central one.
import { readTris, writeParts, col, scaleTris, clipY, boundsOf, lathe, cylinder, frustum, disc, tube, dish, aim, box, flip, V, placeTris } from './kit.mjs';

const [SHELL, QUADS, OUT] = process.argv.slice(2);
if (!SHELL || !QUADS || !OUT) { console.error('usage: build-csm.mjs shell.glb quads.glb out.glb'); process.exit(2); }

// ---- NASA's frame (axis along X, CM nose toward +X) -> ours (axis +Y) --------------------------------------
const S = 3.91 / 5.12;            // the SM is 5.12 units across in NASA's file; the published SM is 3.91 m
const AX = { y: 0.23, z: -0.03 }, X0 = -12.26;
const rot = ([x, y, z]) => [-(y - AX.y) * S, (x - X0) * S, (z - AX.z) * S];
const rotN = ([x, y, z]) => [-y, x, z];
const toOurs = (tris) => tris.map((t) => {
  const p = [], n = t.n ? [] : null;
  for (let i = 0; i < 3; i++) { p.push(...rot([t.p[i * 3], t.p[i * 3 + 1], t.p[i * 3 + 2]])); if (n) n.push(...rotN([t.n[i * 3], t.n[i * 3 + 1], t.n[i * 3 + 2]])); }
  return { ...t, p, n };
});
const shell = toOurs(await readTris(SHELL)), quads = toOurs(await readTris(QUADS));

const Y_SM_FRONT = (X0 * -1 - 3.47) * S;      // 6.71 m: where the SM's cylinder ends
const Y_TIP = (X0 * -1 - 0.42) * S;           // the CM's tip, 9.04 m
const R_SM = 2.56 * S;                        // 1.955 m
const Y_AFT = (X0 * -1 - 9.72) * S;           // the SM's aft rim, 1.94 m

// CM = the cone and its bulge (centroid forward of the SM's front, or low and inside the SM's radius)
const rOf = (t) => Math.max(...[0, 1, 2].map((i) => Math.hypot(t.p[i * 3], t.p[i * 3 + 2])));
const isCM = (t) => { const y = (t.p[1] + t.p[4] + t.p[7]) / 3; return y > Y_SM_FRONT + 0.03 || (y > Y_SM_FRONT - 0.4 && rOf(t) < R_SM - 0.12); };
let cm = shell.filter(isCM), sm = shell.filter((t) => !isCM(t)).concat(quads);

const SILVER = col('#b9bbbf'), STEEL = col('#8e9196'), DARKM = col('#2a2b2f'), GLASS = col('#101216'), WHITE = col('#ececea'), SM_GREY = col('#c9c9c5'), PANEL = col('#6f7378'), GOLDF = col('#d6b04a'), DISH = col('#dedede'), DISHB = col('#9d9fa3');
const onSurface = (rAt, y, phi) => [rAt * Math.cos(phi), y, rAt * Math.sin(phi)];
const deg = (d) => (d * Math.PI) / 180;

// ---- the command module -----------------------------------------------------------------------------------
const coneR = (y) => R_SM * Math.max(0, (Y_TIP - y) / (Y_TIP - (X0 * -1 - 3.41) * S));
const slope = Math.atan2(R_SM, Y_TIP - (X0 * -1 - 3.41) * S);       // the cone's half angle: the normal tilts this far up
const window_ = (phi, y, r, segs, rot0 = 0) => {
  const surf = onSurface(coneR(y), y, phi);
  const nrm = [Math.cos(phi) * Math.cos(slope), Math.sin(slope), Math.sin(phi) * Math.cos(slope)];
  const lift = V.add(surf, V.mul(nrm, 0.005));
  const frame = aim(cylinder(r + 0.05, 0, 0.02, segs, STEEL).concat(disc(r + 0.05, 0.02, segs, STEEL, 1)), nrm, lift, rot0);
  const pane = aim(cylinder(r, 0, 0.03, segs, GLASS).concat(disc(r, 0.03, segs, GLASS, 1)), nrm, lift, rot0);
  return frame.concat(pane);
};
// the hatch faces +X; the two side windows and the two rendezvous windows are about it, as on the CM in AS17-145-22254
cm = cm.concat(window_(deg(0), 7.62, 0.2, 14));                    // hatch window
cm = cm.concat(window_(deg(46), 7.55, 0.2, 6), window_(deg(-46), 7.55, 0.2, 6));        // side windows
cm = cm.concat(window_(deg(20), 8.35, 0.15, 4, deg(45)), window_(deg(-20), 8.35, 0.15, 4, deg(45)));   // rendezvous windows
// the hatch's outline: a darker plate round its window
{
  const y = 7.3, phi = 0, surf = onSurface(coneR(y), y, phi);
  const nrm = [Math.cos(slope), Math.sin(slope), 0];
  cm = cm.concat(aim(box([0, 0, 0], [0.9, 0.012, 0.9], col('#a7a9ad')), nrm, V.add(surf, V.mul(nrm, 0.004)), 0));
}
// the forward heat shield's separation ring, the docking tunnel and its ring, the probe's three latches
{
  const yr = 8.5;
  cm = cm.concat(cylinder(coneR(yr) + 0.025, yr, yr + 0.07, 24, STEEL), disc(coneR(yr) + 0.025, yr + 0.07, 24, STEEL, 1));
  const yT = 8.72;
  cm = cm.concat(cylinder(0.43, yT, Y_TIP + 0.12, 20, SILVER), cylinder(0.50, Y_TIP + 0.12, Y_TIP + 0.2, 20, DARKM), disc(0.50, Y_TIP + 0.2, 20, DARKM, 1, { r0: 0.34 }));
  cm = cm.concat(disc(0.34, Y_TIP + 0.1, 20, col('#3d3f44'), 1));
  for (let k = 0; k < 3; k++) {
    const a = deg(90 + k * 120);
    cm = cm.concat(tube([0.3 * Math.cos(a), Y_TIP + 0.12, 0.3 * Math.sin(a)], [0.1 * Math.cos(a), Y_TIP + 0.42, 0.1 * Math.sin(a)], 0.025, 6, STEEL));
  }
  cm = cm.concat(cylinder(0.08, Y_TIP + 0.1, Y_TIP + 0.46, 10, STEEL), disc(0.08, Y_TIP + 0.46, 10, STEEL, 1));
}
// the twelve RCS engines of the CM, as small dark nubs round the shoulder under the cone
for (let k = 0; k < 12; k++) {
  const a = deg(15 + k * 30), y = 6.95, nrm = [Math.cos(a) * 0.95, 0.3, Math.sin(a) * 0.95];
  cm = cm.concat(aim(cylinder(0.055, 0, 0.09, 8, DARKM).concat(disc(0.055, 0.09, 8, DARKM, 1)), nrm, onSurface(coneR(y) - 0.01, y, a)));
}

// ---- the service module --------------------------------------------------------------------------------------
// the closing disc where the CM sits, so the SM is not an open can once the CM leaves it
sm = sm.concat(disc(R_SM * 0.985, Y_SM_FRONT, 36, col('#4a4b4f'), 1));
// six radial beams and six radiator panels
const radial = (a, rad, y, sx, sy, sz, c) => { // a flat box standing on the SM's skin at azimuth a: sx tangential, sy axial, sz radial
  const b = box([0, 0, 0], [sx, sy, sz], c);
  // box local X = tangent, Z = radial, Y = axial: rotate about Y so that local +Z points along the radial direction
  return placeTris(b, { ry: Math.PI / 2 - a, t: [rad * Math.cos(a), y, rad * Math.sin(a)] });
};
for (let k = 0; k < 6; k++) {
  const a = deg(30 + k * 60), beamH = Y_SM_FRONT - Y_AFT - 0.2;
  sm = sm.concat(radial(a, R_SM + 0.01, Y_AFT + 0.1 + beamH / 2, 0.09, beamH, 0.03, col('#9fa1a6')));
}
for (let k = 0; k < 6; k++) {
  const a = deg(k * 60);
  sm = sm.concat(radial(a, R_SM + 0.012, Y_SM_FRONT - 0.62, 1.38, 0.9, 0.025, k % 3 === 1 ? PANEL : WHITE));
  sm = sm.concat(radial(a, R_SM + 0.01, Y_AFT + 0.75, 1.38, 0.35, 0.02, k % 2 ? WHITE : PANEL));
}
// the umbilical fairing, on the hatch's side
sm = sm.concat(radial(deg(0), R_SM + 0.07, Y_SM_FRONT - 1.1, 0.34, 1.7, 0.12, col('#d5d5d0')));
// two VHF scimitar antennas at the SM's forward edge
for (const a of [deg(120), deg(240)]) sm = sm.concat(radial(a, R_SM + 0.12, Y_SM_FRONT - 0.5, 0.06, 0.55, 0.22, STEEL));

// ---- the high-gain antenna, ours -----------------------------------------------------------------------------------
{
  const phi = deg(200), rad = [Math.cos(phi), 0, Math.sin(phi)];
  const base = [rad[0] * (R_SM - 0.1), Y_AFT + 0.45, rad[2] * (R_SM - 0.1)];
  const dir = V.norm([rad[0] * 0.8, -0.5, rad[2] * 0.8]);
  const tip = V.add(base, V.mul(dir, 2.55));
  sm = sm.concat(box(base, [0.34, 0.3, 0.34], STEEL), tube(base, tip, 0.045, 8, STEEL));
  // the array: a plate, four 0.79 m dishes at the corners of a 1.0 m square, a small dish on a mast in the middle
  const bore = V.norm([rad[0] * 0.35, 0.9, rad[2] * 0.35]);
  const arr = [];
  arr.push(...box([0, -0.12, 0], [1.25, 0.06, 1.25], STEEL));
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
    arr.push(...placeTris(dish(0.395, 0.12, 14, 3, DISH, DISHB), { t: [dx, 0, dz] }));
    arr.push(...placeTris(tube([0, 0, 0], [0, 0.18, 0], 0.012, 5, STEEL), { t: [dx, -0.04, dz] }));
  }
  arr.push(...tube([0, -0.1, 0], [0, 0.55, 0], 0.025, 6, STEEL), ...placeTris(dish(0.155, 0.05, 10, 2, DISH, DISHB), { t: [0, 0.55, 0] }));
  sm = sm.concat(aim(arr, bore, tip));
}

// ---- the parts, each about its own middle ---------------------------------------------------------------------------------
const mid = (tris) => { const b = boundsOf(tris); return [0, b.mid[1], 0]; };
const parts = [
  { name: 'command-module', tris: cm, origin: mid(cm) },
  { name: 'service-module', tris: sm, origin: mid(sm) },
];
const r = await writeParts(OUT, parts);
const all = boundsOf(cm.concat(sm));
console.log(JSON.stringify({ ...r, size: all.size.map((v) => +v.toFixed(2)), lo: all.lo, hi: all.hi, origins: parts.map((p) => p.origin), cmBase: Y_SM_FRONT, nozzleExit: 0, smAft: Y_AFT }));
