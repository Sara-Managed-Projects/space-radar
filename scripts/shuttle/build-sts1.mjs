// build-sts1.mjs -- the two models of the STS-1 Moment (Columbia, 12-14 April 1981; release 1.7.2): the launch stack WITHOUT the orbiter
// (`shuttle-sts-stack`: parts srb-l, srb-r, tank) and the orbiter on its own (`shuttle-orbiter`: orbiter-body, bay-door-l, bay-door-r,
// bay-door-l-open, bay-door-r-open, gear-nose, gear-main-l, gear-main-r). Both in metres, +Y = nose, +Z = dorsal (the orbiter's top; for
// the stack: the side the orbiter rides on), X along the wings (starboard = +X).
//
// RERUN (needs NASA's files and the repo's bake tool; see scripts/bake-own-colours.mjs for the kit, the same as here):
//   cd "$(mktemp -d)" && npm i --silent @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 @gltf-transform/functions@4.5.0 \
//       meshoptimizer@0.22.0 draco3dgltf@1.5.7 sharp
//   # NASA's files: github.com/nasa/NASA-3D-Resources, 3D Models/Space Shuttle (D)/ (Space Shuttle (D).glb = the orbiter, ... door-prt.glb,
//   # ... door-stb.glb, ... eng.glb) and 3D Models/Space Shuttle Parts/ (External tank.glb, Solid Rocket Booster.glb), copied to one folder as
//   # orbD.glb, door-prt.glb, door-stb.glb, eng.glb, et.glb, srb.glb
//   node /path/to/space-radar/scripts/shuttle/build-sts1.mjs --nasa /path/to/folder --out /path/to/site/models [--work dir] [--preview dir]
//
// WHAT IS NASA'S AND WHAT IS OURS.
//   NASA's (public domain, units inches, 1 in = 0.0254 m): the orbiter's hull, wings, tail, OMS pods, nose and bay (Space Shuttle (D), 19 378
//   triangles, no doors, no gear, no engine bells); the two payload bay doors (door-prt, door-stb, 284 triangles each); one SSME bell (eng, used
//   three times); the external tank with its attach struts and lines (et); the solid rocket booster (srb, used twice). All five are run through
//   scripts/bake-own-colours.mjs (flat colours, decimation, creased normals, meshopt).
//   OURS: (1) the tank's colour: STS-1 and STS-2 flew with the tank painted white, NASA's file shows the later bare orange foam, so --recolour
//   paints the tank's skin, lines and nose white (#ebe8e0), the attach hardware keeps NASA's stated colours; (2) the booster's colour: NASA's texture
//   for it is a layout sheet (the forward half comes out black), so the whole booster is white and the nozzle (inside the aft skirt) is dark grey,
//   painted by position here, after the bake; (3) the orbiter's palette: the near-white greys of its baked colours are merged to one white;
//   (4) the open bay doors: the same two doors turned 175 degrees about their hinge lines; (5) the three SSME bells' places (read off the engine
//   holes of NASA's aft bulkhead) and their null-position cant; (6) the landing gear, built here from published sizes (tyres 44.5 x 16.0-21
//   main, two a side; 32 x 8.8 nose, two), with the gear doors; (7) where the boosters and the orbiter stand against the tank.
import { createRequire } from 'node:module';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { io, readTris, writeParts, col, hexOf, boundsOf, lathe, cylinder, tube, disc, aim, V, recolour } from '../apollo/kit.mjs';

const require = createRequire(join(process.cwd(), 'package.json'));
const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); const i = process.argv.indexOf(`--${k}`); return a ? a.slice(k.length + 3) : (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d); };
const NASA = resolve(arg('nasa', '.'));
const OUT = resolve(arg('out', '.'));
const WORK = resolve(arg('work', join(OUT, '.work-sts1')));
const PREVIEW = arg('preview', '');
const BAKE = resolve(arg('bake', join(HERE, '..', 'bake-own-colours.mjs')));
mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true });
const IN = 0.0254;

// ---- the numbers of the layout (every one is looked at in the preview; see the header) -------------------------------------------------
const P = {
  etAxisRawZ: -23.5,          // inches: the tank's axis in NASA's own frame (the tank is not centred on z = 0: the lines and struts are on +z)
  srbC: 267 * IN,             // m: a booster's axis from the tank's axis (the aft attach beams of NASA's tank end at 194 in; the booster's skin starts there)
  srbZ: 26.5 * IN,            // m: the boosters' axes stand this far toward the orbiter's side of the tank's axis (the beams' ends, 26.5 in)
  srbNoseBelowTip: 9.4,       // m: a booster's nose cone below the tank's nose tip
  orbNoseBelowTip: 14.4,      // m: the orbiter's nose below the tank's nose tip
  orbBellyGap: 0.04,          // m: the orbiter's belly above the tank's skin
};
const ORB_LENGTH_M = 37.24;   // the real orbiter, the unit check

// ---- small maths --------------------------------------------------------------------------------------------------------------------
const mm = (A, B) => A.map((_, i) => [0, 1, 2].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
const mv = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
const det = (R) => R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
const rotAbout = (axis, a) => { const [x, y, z] = V.norm(axis), c = Math.cos(a), s = Math.sin(a), t = 1 - c; return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]]; };
// p' = R (k p) + t, normals by R; a mirror (det < 0) turns the winding over
function xf(tris, R, t = [0, 0, 0], k = 1) {
  const mirror = det(R) * k < 0;
  return tris.map((tr) => {
    const p = [], n = tr.n ? [] : null;
    for (let i = 0; i < 3; i++) {
      const q = mv(R, [tr.p[i * 3] * k, tr.p[i * 3 + 1] * k, tr.p[i * 3 + 2] * k]);
      p.push(q[0] + t[0], q[1] + t[1], q[2] + t[2]);
      if (n) n.push(...mv(R, [tr.n[i * 3], tr.n[i * 3 + 1], tr.n[i * 3 + 2]]));
    }
    return mirror ? { ...tr, p: [...p.slice(0, 3), ...p.slice(6, 9), ...p.slice(3, 6)], n: n ? [...n.slice(0, 3), ...n.slice(6, 9), ...n.slice(3, 6)].map((v) => -v) : null } : { ...tr, p, n };
  });
}
const shift = (tris, t) => xf(tris, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t);
const rotAt = (tris, pt, axis, a) => { const R = rotAbout(axis, a); return xf(tris, R, V.sub(pt, mv(R, pt))); };
const cen = (t) => [(t.p[0] + t.p[3] + t.p[6]) / 3, (t.p[1] + t.p[4] + t.p[7]) / 3, (t.p[2] + t.p[5] + t.p[8]) / 3];
const area = (t) => { const a = V.sub([t.p[3], t.p[4], t.p[5]], [t.p[0], t.p[1], t.p[2]]), b = V.sub([t.p[6], t.p[7], t.p[8]], [t.p[0], t.p[1], t.p[2]]); return 0.5 * V.len(V.cross(a, b)); };
function com(tris) { let A = 0; const s = [0, 0, 0]; for (const t of tris) { const a = area(t), c = cen(t); A += a; for (let k = 0; k < 3; k++) s[k] += a * c[k]; } return s.map((v) => v / (A || 1)); }
const bb = (...lists) => boundsOf(lists.flat());
// NASA's raw frames (inches) to ours: the orbiter's raw frame has the nose on +x, the wings on y and the top on +z; ours: nose +Y, top +Z, starboard +X
const ORB_R = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];   // (x, y, z) -> (-y, x, z): a proper rotation, no mirror
const toOrb = (tris) => xf(tris, ORB_R, [0, 0, 0], IN);

// ---- baking NASA's files --------------------------------------------------------------------------------------------------------------
function bake(inFile, outName, flags) {
  const out = join(WORK, outName);
  console.log(`bake ${outName}`);
  execFileSync(process.execPath, ['--max-old-space-size=4096', BAKE, inFile, out, ...flags], { stdio: ['ignore', 'inherit', 'inherit'], cwd: process.cwd() });
  return out;
}
// NASA's door files name an external texture (SHUT-DOO.JPG) that is not in the repository: strip the image references, keep the stated colours
async function cleanDoor(src, name) {
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(src); const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jl).toString('utf8'));
  const bo = 20 + jl; const bl = buf.readUInt32LE(bo);
  const bin = new Uint8Array(buf.buffer.slice(buf.byteOffset + bo + 8, buf.byteOffset + bo + 8 + bl));
  if (json.buffers && json.buffers[0]) json.buffers[0].uri = '@glb.bin';
  delete json.images; delete json.textures; delete json.samplers;
  for (const m of json.materials || []) { const p = m.pbrMetallicRoughness || {}; delete p.baseColorTexture; delete p.metallicRoughnessTexture; delete m.normalTexture; delete m.emissiveTexture; delete m.occlusionTexture; delete m.extensions; }
  for (const k of ['extensionsUsed', 'extensionsRequired']) if (json[k]) json[k] = json[k].filter((e) => !/webp|texture|specular|ngon/i.test(e));
  const doc = await io.readJSON({ json, resources: { '@glb.bin': bin } });
  const out = join(WORK, name);
  await io.write(out, doc);
  return out;
}
const nasaFile = (n) => { for (const c of [n, `Space Shuttle (D) ${n}`]) if (existsSync(join(NASA, c))) return join(NASA, c); throw new Error(`missing ${n} in ${NASA}`); };

const WHITE_TANK = '#e9e8e3', WHITE_LINE = '#e4e3dd', WHITE_ORB = '#ececec', WHITE_SRB = '#e9e8e3', RADIATOR = '#d2d4d6', NOZZLE = '#34343a', TILE = '#1e1e20';
const skipBake = process.argv.includes('--no-bake');
const baked = {
  orb: join(WORK, 'orb.glb'), et: join(WORK, 'et.glb'), srb: join(WORK, 'srb.glb'), eng: join(WORK, 'eng.glb'), dprt: join(WORK, 'door-prt.glb'), dstb: join(WORK, 'door-stb.glb'),
};
if (!skipBake) {
  bake(nasaFile('orbD.glb'), 'orb.glb', ['--tris=18000', '--colours=12', '--no-guess', '--min-part=0.0015']);
  bake(nasaFile('et.glb'), 'et.glb', ['--tris=5200', '--colours=10', '--no-guess', '--min-part=0.0004',
    `--recolour=et all$=${WHITE_TANK};et_supline_(curv|main|seps|side|top)$=${WHITE_LINE};et_top_nose2?$=${WHITE_TANK};et_shutsup_sideb$=${WHITE_LINE};et_bot_cir$=${WHITE_LINE}`]);
  bake(nasaFile('srb.glb'), 'srb.glb', ['--tris=3300', '--colours=4', '--no-guess', '--min-part=0.0004', `--recolour=srb all$=${WHITE_SRB}`]);
  bake(nasaFile('eng.glb'), 'eng.glb', ['--tris=1300', '--colours=3', '--no-guess', '--min-part=0.0004']);
  const dp = await cleanDoor(nasaFile('door-prt.glb'), 'door-prt-clean.glb');
  const ds = await cleanDoor(nasaFile('door-stb.glb'), 'door-stb-clean.glb');
  bake(dp, 'door-prt.glb', ['--tris=600', '--colours=4', '--no-guess', '--min-part=0', `--recolour=shut-doors-(top|side)$=${WHITE_ORB};doors inside$=${RADIATOR}`]);
  bake(ds, 'door-stb.glb', ['--tris=600', '--colours=4', '--no-guess', '--min-part=0', `--recolour=shut-doors-(top|side)$=${WHITE_ORB};doors inside$=${RADIATOR}`]);
}
const hexSet = (list, to, tris) => tris.map((t) => (list.includes(hexOf(t.c)) ? { ...t, c: col(to) } : t));

// =====================================================================================================================================
// THE ORBITER
// =====================================================================================================================================
async function buildOrbiter() {
  // -- hull (NASA's palette: the near-white greys are one white; the black and the darker greys stay) --
  let hull = toOrb(await readTris(baked.orb));
  hull = hexSet(['#bdbebd', '#e4e6e6', '#d0d2d5', '#ededed'], WHITE_ORB, hull);
  // the bake merged the bay's aft bulkhead into one yellow triangle (22 500 in2): the handrails' yellow stays, that one goes white
  hull = hull.map((t) => (hexOf(t.c) === '#edd400' && area(t) > 3 ? { ...t, c: col(WHITE_ORB) } : t));
  // -- the three SSME bells: the engine holes of NASA's aft bulkhead (x = -527 in) are at (y, z) = (0, +58.8) and (+-50.6, -52.9) in; the bell's throat
  //    end (x = +10.5 in in its own file) sits at the bulkhead, its exit 102 in aft; exhaust directions at the null position: the upper bell 16 degrees
  //    up, the lower two 10.5 degrees down and 3.5 degrees outward (the lines of thrust meet ahead of the centre of mass)
  const engRaw = await readTris(baked.eng);
  const eb = boundsOf(engRaw);
  const throat = [eb.hi[0], (eb.lo[1] + eb.hi[1]) / 2, (eb.lo[2] + eb.hi[2]) / 2];
  const bells = [], exits = [];
  const mount = [[0, 58.8, 16, 0], [50.6, -52.9, -10.5, 3.5], [-50.6, -52.9, -10.5, -3.5]];   // raw y, z (in); pitch (deg, + = exhaust toward +z); yaw (deg, + = exhaust toward +y)
  for (const [ry, rz, pitch, yaw] of mount) {
    // raw frame: exhaust along -x. rotate the bell about its throat: first yaw about z, then pitch about y
    const Rp = rotAbout([0, 1, 0], (pitch * Math.PI) / 180), Ry = rotAbout([0, 0, 1], (yaw * Math.PI) / 180);
    const R = mm(Ry, Rp);
    const at = [-527 + 4, ry, rz];
    const placed = xf(engRaw, R, V.sub(at, mv(R, throat)));
    bells.push(...toOrb(placed));
    const ex = mv(R, [eb.lo[0], throat[1], throat[2]]); const e2 = V.add(ex, V.sub(at, mv(R, throat)));
    exits.push(mv(ORB_R, e2).map((v) => v * IN));
  }
  const bell = bells.map((t) => ({ ...t }));
  // -- doors, closed and open --
  const doorL = toOrb(await readTris(baked.dprt)), doorR = toOrb(await readTris(baked.dstb));     // port = left = -X
  const hingeOf = (door, side) => { const b = boundsOf(door); const xo = side < 0 ? b.lo[0] : b.hi[0]; const edge = door.flatMap((t) => [0, 1, 2].map((k) => [t.p[k * 3], t.p[k * 3 + 2]])).filter(([x]) => Math.abs(x - xo) < 0.03); return [xo, edge.reduce((s, q) => s + q[1], 0) / edge.length]; };
  const hl = hingeOf(doorL, -1), hr = hingeOf(doorR, 1);
  const OPEN = (175 * Math.PI) / 180;
  const openL = rotAt(doorL, [hl[0], 0, hl[1]], [0, 1, 0], -OPEN), openR = rotAt(doorR, [hr[0], 0, hr[1]], [0, 1, 0], OPEN);
  // -- landing gear, built here (metres, our frame). The ground is where the 17.25 m of the real orbiter on its gear puts it: the tail's tip (z = 416 in)
  //    stands 17.25 m above the runway, so the tyres' underside is at z = 416 in - 17.25 m.
  const ZG = 416 * IN - 17.25;
  const gear = buildGear(ZG);
  const all = [hull, bell, doorL, doorR, openL, openR, gear.nose, gear.mainL, gear.mainR];
  const box = bb(...all);
  const shiftO = [-(box.lo[0] + box.hi[0]) / 2, -box.lo[1], -(box.lo[2] + box.hi[2]) / 2];
  const S = (t) => shift(t, shiftO);
  const parts = [
    { name: 'orbiter-body', tris: S([...hull, ...bell]) },
    { name: 'bay-door-l', tris: S(doorL) }, { name: 'bay-door-r', tris: S(doorR) },
    { name: 'bay-door-l-open', tris: S(openL) }, { name: 'bay-door-r-open', tris: S(openR) },
    { name: 'gear-nose', tris: S(gear.nose) }, { name: 'gear-main-l', tris: S(gear.mainL) }, { name: 'gear-main-r', tris: S(gear.mainR) },
  ].map((p) => ({ ...p, origin: com(p.tris) }));
  const res = await writeParts(join(OUT, 'shuttle-orbiter.glb'), parts);
  const nb = bb(...all.map(S));
  const body = boundsOf(parts[0].tris);
  const info = {
    file: 'shuttle-orbiter.glb', ...res, parts: parts.map((p) => ({ name: p.name, tris: p.tris.length, origin: p.origin.map((v) => +v.toFixed(3)) })),
    bbox: { lo: nb.lo.map((v) => +v.toFixed(3)), hi: nb.hi.map((v) => +v.toFixed(3)), size: nb.size.map((v) => +v.toFixed(3)) },
    shiftFromNasaFrame: shiftO.map((v) => +v.toFixed(4)), ssmeExit: exits.map((e) => S([{ p: [...e, ...e, ...e], n: null, c: [0, 0, 0], tag: 0 }])[0].p.slice(0, 3).map((v) => +v.toFixed(3))),
    hull: { lo: boundsOf(S(hull)).lo.map((v) => +v.toFixed(3)), hi: boundsOf(S(hull)).hi.map((v) => +v.toFixed(3)) },
    groundZ: +(ZG + shiftO[2]).toFixed(3), hinge: { l: hl.map((v) => +v.toFixed(3)), r: hr.map((v) => +v.toFixed(3)) },
    gearAxle: { main: +(gear.zAxleMain + shiftO[2]).toFixed(3), nose: +(gear.zAxleNose + shiftO[2]).toFixed(3), mainY: +(gear.yMain + shiftO[1]).toFixed(3), noseY: +(gear.yNose + shiftO[1]).toFixed(3), mainX: +gear.xMain.toFixed(3) },
  };
  return { info, shiftO, parts, hullNasa: boundsOf(hull), exitsNasa: exits, S, all };
}

function buildGear(ZG) {
  const SEG = 24;
  const SILVER = col('#b9bcc0'), CHROME = col('#d9dbde'), AXLE = col('#7c7f85'), RUBBER = col('#1b1b1d'), HUB = col('#a8abb0'), DOOR = col('#2b2830'), DOORIN = col('#c9cbce');
  const tyre = (c, axisDir, R, Rb, W, hubR, tag = 0) => {
    const h = W / 2;
    const prof = [[Rb, -h], [R * 0.9, -h], [R * 0.985, -h * 0.72], [R, -h * 0.35], [R, h * 0.35], [R * 0.985, h * 0.72], [R * 0.9, h], [Rb, h]];
    let t = lathe(prof, SEG, RUBBER, { tag });
    t.push(...cylinder(hubR, -h - 0.004, h + 0.004, SEG, HUB, { tag }), ...disc(hubR, h + 0.004, SEG, HUB, 1), ...disc(hubR, -h - 0.004, SEG, HUB, -1));
    t.push(...cylinder(hubR * 0.38, h, h + 0.05, 12, AXLE), ...disc(hubR * 0.38, h + 0.05, 12, AXLE, 1));
    return aim(t, axisDir, c);
  };
  const prism = (p, e1, e2, e3, c) => {
    const v = (a, b, d) => [p[0] + a * e1[0] + b * e2[0] + d * e3[0], p[1] + a * e1[1] + b * e2[1] + d * e3[1], p[2] + a * e1[2] + b * e2[2] + d * e3[2]];
    const quad = (a, b, cc, d) => [{ p: [...a, ...b, ...cc], n: null, c, tag: 0 }, { p: [...a, ...cc, ...d], n: null, c, tag: 0 }];
    const s = Math.sign(det([e1, e2, e3]));
    const faces = [[v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)], [v(0, 0, 1), v(0, 1, 1), v(0, 1, 0), v(0, 0, 0)], [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)], [v(0, 0, 1), v(0, 0, 0), v(1, 0, 0), v(1, 0, 1)], [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)], [v(1, 0, 0), v(0, 0, 0), v(0, 1, 0), v(1, 1, 0)]];
    return faces.flatMap((f) => (s > 0 ? quad(...f) : quad(f[3], f[2], f[1], f[0])));
  };
  // main gear: axle 1 150 in aft of the nose tip... Xo = 1 151 (x = -149 in of NASA's frame), track 6.93 m, two tyres a side, 1.12 m x 0.41 m
  const yMain = -149 * IN, xMain = 136.5 * IN;
  const rM = 0.56, zAxleMain = ZG + rM;
  const main = (s) => {
    const X0 = s * xMain, t = [];
    const zTop = -3.30;
    t.push(...tube([X0, yMain, zTop], [X0, yMain, zTop - 1.45], 0.15, SEG, SILVER));            // the oleo's cylinder
    t.push(...tube([X0, yMain, zTop - 1.45], [X0, yMain, zAxleMain + 0.05], 0.092, SEG, CHROME)); // its piston
    t.push(...tube([X0 - 0.78, yMain, zAxleMain], [X0 + 0.78, yMain, zAxleMain], 0.07, 16, AXLE)); // the axle
    for (const o of [-0.31, 0.31]) t.push(...tyre([X0 + o, yMain, zAxleMain], [1, 0, 0], rM, 0.27, 0.41, 0.285));
    t.push(...tube([X0, yMain + 0.05, zTop - 0.9], [X0 * 0.55, yMain + 1.55, zTop - 0.05], 0.05, 12, SILVER));   // drag brace
    t.push(...tube([X0, yMain - 0.05, zTop - 0.95], [X0 * 0.5, yMain - 0.7, zTop - 0.05], 0.045, 12, SILVER));    // side brace
    t.push(...tube([X0, yMain, zTop - 1.45], [X0 + s * 0.12, yMain - 0.28, zTop - 2.1], 0.03, 8, AXLE));         // torque link
    // the door, hung open on the outboard side of the well: 3.0 m long, 0.95 m deep, its hinge on the well's outer edge
    const xd = X0 + s * 0.98;
    t.push(...prism([xd - 0.02, yMain - 1.5, zTop - 0.95], [0.04, 0, 0], [0, 3.0, 0], [0, 0, 0.95], DOOR));
    return t;
  };
  // nose gear: Xo = 440 in (x = 561 in), two tyres 0.81 m x 0.224 m, the strut 3.3 m from the belly to the axle
  const yNose = 561 * IN;
  const rN = 0.405, zAxleNose = ZG + rN;
  const nose = () => {
    const t = [];
    const zTop = -2.95;
    t.push(...tube([0, yNose, zTop], [0, yNose, zTop - 1.35], 0.11, SEG, SILVER));
    t.push(...tube([0, yNose, zTop - 1.35], [0, yNose, zAxleNose + 0.35], 0.07, SEG, CHROME));
    t.push(...tube([-0.34, yNose, zAxleNose], [0.34, yNose, zAxleNose], 0.05, 12, AXLE));
    for (const o of [-0.19, 0.19]) t.push(...tyre([o, yNose, zAxleNose], [1, 0, 0], rN, 0.19, 0.224, 0.2));
    t.push(...tube([-0.3, yNose, zAxleNose], [0, yNose, zAxleNose + 0.42], 0.035, 8, SILVER), ...tube([0.3, yNose, zAxleNose], [0, yNose, zAxleNose + 0.42], 0.035, 8, SILVER));
    t.push(...tube([0, yNose + 0.05, zTop - 1.0], [0, yNose + 1.55, zTop - 0.05], 0.05, 12, SILVER));                 // drag strut
    t.push(...tube([0, yNose, zTop - 1.35], [0, yNose - 0.32, zTop - 1.9], 0.03, 8, AXLE));                           // torque link
    for (const s of [-1, 1]) t.push(...prism([s * 0.64 - 0.02, yNose - 0.95, zTop - 0.62], [0.04, 0, 0], [0, 1.9, 0], [0, 0, 0.62], DOOR));   // the two doors, hung open beside the well
    return t;
  };
  return { nose: nose(), mainL: main(-1), mainR: main(1), zAxleMain, zAxleNose, yMain, yNose, xMain };
}

// =====================================================================================================================================
// THE STACK (tank and two boosters; the orbiter has its own file and rides on the +Z side)
// =====================================================================================================================================
async function buildStack(orb) {
  // -- the tank: raw (x nose, y lateral, z orbiter side, axis at z = -23.5 in) -> ours: (-y, x, z + 23.5), axis on x = z = 0
  let tank = await readTris(baked.et);
  tank = shift(xf(tank, ORB_R, [0, 0, 0], IN), [0, 0, -P.etAxisRawZ * IN]);
  const tb = boundsOf(tank);
  const tipY = tb.hi[1], aftY = tb.lo[1];
  // -- a booster: raw x nose; the lug (the attach bracket at raw z = -98 in) must face the tank
  let srbRaw = await readTris(baked.srb);
  // the nozzle (dark grey) is painted by position, in NASA's raw frame (inches): inside the aft skirt, within 68 in of the axis, aft of x = -690
  srbRaw = srbRaw.map((t) => { const c = cen(t); const r = Math.hypot(c[1], c[2]); return c[0] < -690 && r < 68 ? { ...t, c: col(NOZZLE) } : t; });
  const sb = boundsOf(srbRaw);
  const srbTipRaw = sb.hi[0] * IN;
  const nozzleTris = srbRaw.filter((t) => hexOf(t.c) === NOZZLE);
  const nzb = boundsOf(nozzleTris);
  const nozzleExitRawX = nzb.lo[0];
  const srbTarget = (side) => {
    // basic frame (as the orbiter's), then roll about +Y by -side * 90 degrees so the lug (-Z) points inboard
    let t = xf(srbRaw, ORB_R, [0, 0, 0], IN);
    t = xf(t, rotAbout([0, 1, 0], -side * Math.PI / 2));
    const y0 = tipY - P.srbNoseBelowTip - srbTipRaw;
    return shift(t, [side * P.srbC, y0, P.srbZ]);
  };
  const srbR = srbTarget(1), srbL = srbTarget(-1);
  // the orbiter, only to place it: bbox of its hull (NASA's frame, metres) and the shift of the file
  const orbBellyZ = orb.hullNasa.lo[2];
  const orbNoseY = orb.hullNasa.hi[1];
  const D = [0, tipY - P.orbNoseBelowTip - orbNoseY, 165.5 * IN + P.orbBellyGap - orbBellyZ];
  const stackAll = [tank, srbL, srbR];
  const box = bb(...stackAll);
  const shiftS = [-(box.lo[0] + box.hi[0]) / 2, -box.lo[1], -(box.lo[2] + box.hi[2]) / 2];
  const S = (t) => shift(t, shiftS);
  const parts = [{ name: 'srb-l', tris: S(srbL) }, { name: 'srb-r', tris: S(srbR) }, { name: 'tank', tris: S(tank) }].map((p) => ({ ...p, origin: com(p.tris) }));
  const res = await writeParts(join(OUT, 'shuttle-sts-stack.glb'), parts);
  const nb = bb(...stackAll.map(S));
  // the nozzle exit centres in the file/standing frame: the bottom of the dark ring, on the booster's axis
  const exitY = (side) => { const q = S(shift(xf(xf([{ p: [nozzleExitRawX, 0, 0, nozzleExitRawX, 0, 0, nozzleExitRawX, 0, 0], n: null, c: [0, 0, 0], tag: 0 }], ORB_R, [0, 0, 0], IN), rotAbout([0, 1, 0], -side * Math.PI / 2)), [side * P.srbC, tipY - P.srbNoseBelowTip - srbTipRaw, P.srbZ]))[0]; return q.p.slice(0, 3).map((v) => +v.toFixed(3)); };
  const info = {
    file: 'shuttle-sts-stack.glb', ...res, parts: parts.map((p) => ({ name: p.name, tris: p.tris.length, origin: p.origin.map((v) => +v.toFixed(3)) })),
    bbox: { lo: nb.lo.map((v) => +v.toFixed(3)), hi: nb.hi.map((v) => +v.toFixed(3)), size: nb.size.map((v) => +v.toFixed(3)) },
    shiftFromAssemblyFrame: shiftS.map((v) => +v.toFixed(4)), tankTipY: +(tipY + shiftS[1]).toFixed(3), tankAftY: +(aftY + shiftS[1]).toFixed(3),
    nozzleExit: { l: exitY(-1), r: exitY(1) }, orbiterShiftInAssembly: D.map((v) => +v.toFixed(4)),
    srbNoseY: +(tipY - P.srbNoseBelowTip + shiftS[1]).toFixed(3),
  };
  // the orbiter vehicle's `at` in the stack's standing frame: its own file frame (origin: tail end, x = 0, z = bbox centre) -> assembly frame -> standing frame
  const nasaToFile = orb.shiftO;                       // file = nasa + shiftO
  const A = [-nasaToFile[0] + D[0] + shiftS[0], -nasaToFile[1] + D[1] + shiftS[1], -nasaToFile[2] + D[2] + shiftS[2]];   // orbiter file origin in the stack file frame
  info.orbiterAt = A.map((v) => +v.toFixed(3));
  return { info, S, D, shiftS, stackParts: parts, tank, srbL, srbR };
}

// =====================================================================================================================================
const orb = await buildOrbiter();
const stk = await buildStack(orb);
// ---- the numbers the vehicle code needs (standInMetres replica: the whole model's height = lengthM, base at y = 0, x and z centred) ----
{
  const k = ORB_LENGTH_M / orb.info.bbox.size[1];
  const hullF = orb.parts[0].tris.filter((t) => true);
  let nose = [0, -1e9, 0], wing = [0, 0, 0], fin = [0, 0, -1e9];
  for (const t of hullF) for (let i = 0; i < 3; i++) { const p = [t.p[i * 3], t.p[i * 3 + 1], t.p[i * 3 + 2]]; if (p[1] > nose[1]) nose = p; if (Math.abs(p[0]) > Math.abs(wing[0])) wing = p; if (p[2] > fin[2]) fin = p; }
  const g = orb.info.gearAxle, gz = orb.info.groundZ, th = (8 * Math.PI) / 180;
  const oy = -g.mainY, oz = -gz;
  const rep = {
    orbiterScaleK: +k.toFixed(5), nasaLengthM: orb.info.bbox.size[1], lengthM: ORB_LENGTH_M,
    stoodBbox: { lo: orb.info.bbox.lo.map((v) => +(v * k).toFixed(3)), hi: orb.info.bbox.hi.map((v) => +(v * k).toFixed(3)), size: orb.info.bbox.size.map((v) => +(v * k).toFixed(3)) },
    noseTip: nose.map((v) => +(v * k).toFixed(3)), wingTip: wing.map((v) => +(v * k).toFixed(3)), finTip: fin.map((v) => +(v * k).toFixed(3)),
    ssmeExitStood: orb.info.ssmeExit.map((e) => e.map((v) => +(v * k).toFixed(3))),
    tyreLowestBelowOrigin: +(-gz * k).toFixed(3), originAboveRunwayLevel: +(-gz * k).toFixed(3),
    originAboveRunwayNoseUp8: +((oy * Math.sin(th) + oz * Math.cos(th)) * k).toFixed(3),
    mainAxleStood: [orb.info.gearAxle.mainX * k, g.mainY * k, g.main * k].map((v) => +v.toFixed(3)), noseAxleStood: [0, g.noseY * k, g.nose * k].map((v) => +v.toFixed(3)),
    stack: { heightM: stk.info.bbox.size[1], bbox: stk.info.bbox, nozzleExit: stk.info.nozzleExit, orbiterAt: stk.info.orbiterAt, tankTipY: stk.info.tankTipY, tankAftY: stk.info.tankAftY },
  };
  console.log(JSON.stringify(rep));
  writeFileSync(join(WORK, 'report.json'), JSON.stringify({ rep, orbiter: orb.info, stack: stk.info }, null, 1));
}
if (PREVIEW) {
  // a TEMPORARY picture of tank + boosters + orbiter, never shipped: the stack in its file frame, the orbiter body and doors (closed) at `orbiterAt`
  mkdirSync(PREVIEW, { recursive: true });
  const A = stk.info.orbiterAt;
  const place = (t) => shift(t, A);
  const so = (name) => orb.parts.find((p) => p.name === name).tris;
  const parts = [...stk.stackParts, { name: 'orb', tris: place([...so('orbiter-body'), ...so('bay-door-l'), ...so('bay-door-r')]), origin: [0, 0, 0] }];
  await writeParts(join(PREVIEW, 'preview-stack-orbiter.glb'), parts.map((p) => ({ ...p, origin: p.origin })));
  const gp = [...so('gear-nose'), ...so('gear-main-l'), ...so('gear-main-r')];
  void gp;
  writeFileSync(join(PREVIEW, 'info.json'), JSON.stringify({ orbiter: orb.info, stack: stk.info }, null, 1));
}
