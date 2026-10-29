// kit.mjs -- the small geometry kit the Apollo models (release 1.5.0, stage C3) are built with.
//
//   cd <a folder with node_modules for @gltf-transform/core extensions functions, meshoptimizer, draco3dgltf, sharp>
//   node /path/to/space-radar/scripts/apollo/build-saturn-v.mjs ...
//
// A TRIANGLE is {p:[9 numbers, metres], n:[9]|null, c:[r,g,b] linear, tag:0|1|2}. tag 0 = body,
// 1 = solar-panel, 2 = foil: the mesh names scene/realmodels.js applyToon reads for the specular
// family (the same three names scripts/bake-own-colours.mjs writes). `n` is kept where a triangle
// comes from NASA's own file (so the look of a NASA part is not touched by splitting it), and
// computed here, creased at 40 degrees, where the triangle is ours.
//
// A PART is {name, origin:[x,y,z], tris}: one node in the GLB, its origin where `origin` says (the
// part's centre of mass, roughly: the moments engine spins a part about it), its triangles stored
// relative to that origin so the stack looks the same as the whole.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { statSync } from 'node:fs';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO, Document } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { meshopt } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');
const draco3d = (await load('draco3dgltf')).default;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;

export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});

// ---- colour ---------------------------------------------------------------------------------
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
export const col = (h) => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
export const hexOf = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(1, toSrgb(v))) * 255).toString(16).padStart(2, '0')).join('')}`;
export const shade = (c, k) => c.map((v) => Math.max(0, Math.min(1, v * k)));

// ---- reading a GLB into triangles ---------------------------------------------------------
export async function readTris(path, { filter } = {}) {
  const doc = await io.read(path);
  const out = [];
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  scene.traverse((node) => {
    const mesh = node.getMesh();
    if (!mesh || (filter && !filter(node))) return;
    const M = node.getWorldMatrix();
    const tag = /panel|solar|array/i.test(`${node.getName()} ${mesh.getName()}`) ? 1 : /foil|mli|kapton|blanket/i.test(`${node.getName()} ${mesh.getName()}`) ? 2 : 0;
    for (const prim of mesh.listPrimitives()) {
      const pa = prim.getAttribute('POSITION'), na = prim.getAttribute('NORMAL'), ia = prim.getIndices();
      const mat = prim.getMaterial();
      const c = mat ? mat.getBaseColorFactor().slice(0, 3) : [0.6, 0.6, 0.6];
      const cnt = ia ? ia.getCount() : pa.getCount();
      const e = [0, 0, 0];
      for (let t = 0; t + 2 < cnt; t += 3) {
        const p = [], n = na ? [] : null;
        for (let k = 0; k < 3; k++) {
          const i = ia ? ia.getScalar(t + k) : t + k;
          pa.getElement(i, e);
          p.push(M[0] * e[0] + M[4] * e[1] + M[8] * e[2] + M[12], M[1] * e[0] + M[5] * e[1] + M[9] * e[2] + M[13], M[2] * e[0] + M[6] * e[1] + M[10] * e[2] + M[14]);
          if (na) {
            na.getElement(i, e);
            const nx = M[0] * e[0] + M[4] * e[1] + M[8] * e[2], ny = M[1] * e[0] + M[5] * e[1] + M[9] * e[2], nz = M[2] * e[0] + M[6] * e[1] + M[10] * e[2];
            const l = Math.hypot(nx, ny, nz) || 1;
            n.push(nx / l, ny / l, nz / l);
          }
        }
        out.push({ p, n, c, tag });
      }
    }
  });
  return out;
}

// ---- basic maths ------------------------------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const V = { sub, cross, dot, len, norm, add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k] };
const P3 = (p, i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
export const faceN = (t) => norm(cross(sub(P3(t.p, 1), P3(t.p, 0)), sub(P3(t.p, 2), P3(t.p, 0))));
export const centroid = (t) => [(t.p[0] + t.p[3] + t.p[6]) / 3, (t.p[1] + t.p[4] + t.p[7]) / 3, (t.p[2] + t.p[5] + t.p[8]) / 3];

// scale (sx, sy, sz) then translate; normals follow (inverse transpose of a diagonal matrix)
export function scaleTris(tris, [sx, sy, sz], [tx, ty, tz] = [0, 0, 0]) {
  return tris.map((t) => {
    const p = t.p.slice();
    for (let i = 0; i < 3; i++) { p[i * 3] = p[i * 3] * sx + tx; p[i * 3 + 1] = p[i * 3 + 1] * sy + ty; p[i * 3 + 2] = p[i * 3 + 2] * sz + tz; }
    let n = null;
    if (t.n) { n = t.n.slice(); for (let i = 0; i < 3; i++) { const v = norm([n[i * 3] / sx, n[i * 3 + 1] / sy, n[i * 3 + 2] / sz]); n[i * 3] = v[0]; n[i * 3 + 1] = v[1]; n[i * 3 + 2] = v[2]; } }
    return { ...t, p, n };
  });
}
// rotate about Y by a, then X by b, then Z by g (radians), then translate. Rigid, so normals rotate too.
export function placeTris(tris, { rx = 0, ry = 0, rz = 0, s = 1, t = [0, 0, 0] } = {}) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const R = (v) => {
    let [x, y, z] = v;
    [y, z] = [y * cx - z * sx, y * sx + z * cx];   // X
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];  // Y
    [x, y] = [x * cz - y * sz, x * sz + y * cz];   // Z
    return [x, y, z];
  };
  return tris.map((tr) => {
    const p = [], n = tr.n ? [] : null;
    for (let i = 0; i < 3; i++) {
      const q = R(V.mul(P3(tr.p, i), s)); p.push(q[0] + t[0], q[1] + t[1], q[2] + t[2]);
      if (n) n.push(...R(P3(tr.n, i)));
    }
    return { ...tr, p, n };
  });
}
export const flip = (tris) => tris.map((t) => ({ ...t, p: [...t.p.slice(0, 3), ...t.p.slice(6, 9), ...t.p.slice(3, 6)], n: t.n ? [...t.n.slice(0, 3), ...t.n.slice(6, 9), ...t.n.slice(3, 6)].map((v) => -v) : null }));
export const recolour = (tris, c, tag) => tris.map((t) => ({ ...t, c, tag: tag === undefined ? t.tag : tag }));

export function boundsOf(tris) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let i = 0; i < 9; i++) { lo[i % 3] = Math.min(lo[i % 3], t.p[i]); hi[i % 3] = Math.max(hi[i % 3], t.p[i]); }
  return { lo, hi, size: sub(hi, lo), mid: [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) };
}

// ---- clipping ----------------------------------------------------------------------------------
// Keep the part of every triangle on the side where dot(nrm, p) - d >= 0. A triangle the plane
// crosses becomes one or two; normals are interpolated, so a NASA part cut in two shades the same.
export function clipHalf(tris, nrm, d) {
  const out = [];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  for (const t of tris) {
    const pts = [0, 1, 2].map((i) => P3(t.p, i));
    const nrms = t.n ? [0, 1, 2].map((i) => P3(t.n, i)) : null;
    const s = pts.map((q) => dot(nrm, q) - d);
    if (s[0] >= 0 && s[1] >= 0 && s[2] >= 0) { out.push(t); continue; }
    if (s[0] < 0 && s[1] < 0 && s[2] < 0) continue;
    const poly = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (s[i] >= 0) poly.push({ p: pts[i], n: nrms && nrms[i] });
      if ((s[i] >= 0) !== (s[j] >= 0)) {
        const k = s[i] / (s[i] - s[j]);
        poly.push({ p: lerp(pts[i], pts[j], k), n: nrms && norm(lerp(nrms[i], nrms[j], k)) });
      }
    }
    for (let i = 1; i + 1 < poly.length; i++) {
      const v = [poly[0], poly[i], poly[i + 1]];
      out.push({ ...t, p: v.flatMap((x) => x.p), n: nrms ? v.flatMap((x) => x.n) : null });
    }
  }
  return out;
}
export const clipY = (tris, lo, hi) => clipHalf(clipHalf(tris, [0, 1, 0], lo), [0, -1, 0], -hi);
// the wedge of azimuths [a0, a1] (radians, a1 - a0 < pi) about the vertical line through (cx, cz); azimuth = atan2(z, x)
export function clipWedge(tris, cx, cz, a0, a1) {
  const n0 = [-Math.sin(a0), 0, Math.cos(a0)];   // points to the CCW side of the ray at a0
  const n1 = [Math.sin(a1), 0, -Math.cos(a1)];   // points to the CW side of the ray at a1
  return clipHalf(clipHalf(tris, n0, dot(n0, [cx, 0, cz])), n1, dot(n1, [cx, 0, cz]));
}

// ---- primitives (all outward-facing; axis +Y unless said) ----------------------------------------
// profile = [[r, y], ...] bottom to top; a point with r = 0 closes the shape on the axis.
export function lathe(profile, segs, c, { tag = 0, a0 = 0, a1 = Math.PI * 2 } = {}) {
  const out = [];
  const pt = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    for (let s = 0; s < segs; s++) {
      const a = a0 + ((a1 - a0) * s) / segs, b = a0 + ((a1 - a0) * (s + 1)) / segs;
      const A = pt(r0, y0, a), B = pt(r0, y0, b), C = pt(r1, y1, b), D = pt(r1, y1, a);
      // outward for a profile that rises: A->D->C is counter-clockwise seen from outside
      if (r0 > 1e-9) out.push({ p: [...A, ...D, ...B], n: null, c, tag });
      if (r1 > 1e-9) out.push({ p: [...B, ...D, ...C], n: null, c, tag });
    }
  }
  return out;
}
export const cylinder = (r, y0, y1, segs, c, o = {}) => lathe([[r, y0], [r, y1]], segs, c, o);
export const frustum = (r0, r1, y0, y1, segs, c, o = {}) => lathe([[r0, y0], [r1, y1]], segs, c, o);
// a flat disc at height y facing up (dir = 1) or down (dir = -1)
export function disc(r, y, segs, c, dir = 1, { tag = 0, r0 = 0 } = {}) {
  const out = [];
  for (let s = 0; s < segs; s++) {
    const a = (Math.PI * 2 * s) / segs, b = (Math.PI * 2 * (s + 1)) / segs;
    const A = [r * Math.cos(a), y, r * Math.sin(a)], B = [r * Math.cos(b), y, r * Math.sin(b)];
    const a0 = [r0 * Math.cos(a), y, r0 * Math.sin(a)], b0 = [r0 * Math.cos(b), y, r0 * Math.sin(b)];
    if (r0 > 0) {
      if (dir > 0) { out.push({ p: [...a0, ...B, ...A], n: null, c, tag }, { p: [...a0, ...b0, ...B], n: null, c, tag }); }
      else { out.push({ p: [...a0, ...A, ...B], n: null, c, tag }, { p: [...a0, ...B, ...b0], n: null, c, tag }); }
    } else out.push({ p: dir > 0 ? [0, y, 0, ...B, ...A] : [0, y, 0, ...A, ...B], n: null, c, tag });
  }
  return out;
}
export function box([cx, cy, cz], [sx, sy, sz], c, tag = 0) {
  const h = [sx / 2, sy / 2, sz / 2];
  const v = (i, j, k) => [cx + (i ? h[0] : -h[0]), cy + (j ? h[1] : -h[1]), cz + (k ? h[2] : -h[2])];
  const quad = (a, b, cc, d) => [{ p: [...a, ...b, ...cc], n: null, c, tag }, { p: [...a, ...cc, ...d], n: null, c, tag }];
  return [
    ...quad(v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)), ...quad(v(0, 0, 1), v(0, 1, 1), v(0, 1, 0), v(0, 0, 0)),
    ...quad(v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)), ...quad(v(0, 0, 1), v(0, 0, 0), v(1, 0, 0), v(1, 0, 1)),
    ...quad(v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)), ...quad(v(1, 0, 0), v(0, 0, 0), v(0, 1, 0), v(1, 1, 0)),
  ];
}
// rotate so that +Y points along `dir`, then translate to `t` (Rodrigues; rigid, normals follow)
export function aim(tris, dir, t = [0, 0, 0], spin = 0) {
  const d = V.norm(dir);
  let axis = V.cross([0, 1, 0], d); const s = V.len(axis); const cth = d[1];
  const rot = (v) => v;
  let R = rot;
  if (s > 1e-9) {
    axis = V.mul(axis, 1 / s);
    R = (v) => V.add(V.add(V.mul(v, cth), V.mul(V.cross(axis, v), s)), V.mul(axis, V.dot(axis, v) * (1 - cth)));
  } else if (cth < 0) R = (v) => [v[0], -v[1], -v[2]];
  const sp = (v) => [v[0] * Math.cos(spin) + v[2] * Math.sin(spin), v[1], -v[0] * Math.sin(spin) + v[2] * Math.cos(spin)];
  return tris.map((tr) => {
    const p = [], n = tr.n ? [] : null;
    for (let i = 0; i < 3; i++) {
      const q = R(sp(P3(tr.p, i))); p.push(q[0] + t[0], q[1] + t[1], q[2] + t[2]);
      if (n) n.push(...R(sp(P3(tr.n, i))));
    }
    return { ...tr, p, n };
  });
}
// a tube from a to b (radius r, optionally tapering to r1), with end caps
export function tube(a, b, r, segs, c, { r1 = r, caps = true, tag = 0 } = {}) {
  const d = V.sub(b, a), l = V.len(d);
  let tris = lathe([[r, 0], [r1, l]], segs, c, { tag });
  if (caps) tris = tris.concat(disc(r, 0, segs, c, -1, { tag }), disc(r1, l, segs, c, 1, { tag }));
  return aim(tris, d, a);
}
// a paraboloid dish: opening toward +Y, rim radius r, depth h, rim at y = 0 and the vertex at y = -h
export function dish(r, h, segs, rings, cFront, cBack, { tag = 0 } = {}) {
  const prof = [];
  for (let i = 0; i <= rings; i++) { const k = i / rings; prof.push([r * k, -h * (1 - k * k)]); }
  // front: seen from +Y: the profile as a lathe, flipped inward
  const shell = lathe(prof, segs, cFront, { tag });
  const front = flip(shell);                // faces +Y (into the dish)
  const back = lathe(prof.map(([rr, y]) => [rr * 0.985, y - 0.004]), segs, cBack, { tag });
  return front.concat(back);
}
export function sphere(r, segs, rings, c, { tag = 0 } = {}) {
  const prof = [];
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 + (Math.PI * i) / rings; prof.push([Math.max(0, r * Math.cos(a)), r * Math.sin(a)]); }
  return lathe(prof, segs, c, { tag });
}

// ---- normals, welded and creased ----------------------------------------------------------------
export function withNormals(tris, creaseDeg = 40) {
  const cosC = Math.cos((creaseDeg * Math.PI) / 180);
  const need = tris.filter((t) => !t.n);
  if (!need.length) return tris;
  const q = 1 / 2e-4;
  const key = (p) => `${Math.round(p[0] * q)},${Math.round(p[1] * q)},${Math.round(p[2] * q)}`;
  const at = new Map();
  const fn = need.map((t) => { const a = cross(sub(P3(t.p, 1), P3(t.p, 0)), sub(P3(t.p, 2), P3(t.p, 0))); return a; });
  need.forEach((t, i) => { for (let k = 0; k < 3; k++) { const s = key(P3(t.p, k)); (at.get(s) || at.set(s, []).get(s)).push(i); } });
  need.forEach((t, i) => {
    const own = fn[i], ol = len(own);
    const n = [];
    for (let k = 0; k < 3; k++) {
      let s = [0, 0, 0];
      for (const j of at.get(key(P3(t.p, k)))) {
        const g = fn[j], gl = len(g);
        if (!(gl > 0) || !(ol > 0) || dot(g, own) / (gl * ol) < cosC) continue;
        s = [s[0] + g[0], s[1] + g[1], s[2] + g[2]];
      }
      n.push(...(len(s) > 0 ? norm(s) : ol > 0 ? norm(own) : [0, 1, 0]));
    }
    t.n = n;
  });
  return tris;
}

// ---- writing -------------------------------------------------------------------------------------
// parts: [{name, origin, tris}]. One node a part (translated to `origin`), under it one node a tag
// (`body`, `solar-panel`, `foil`) whose mesh has a primitive and a material a colour.
export async function writeParts(outPath, parts, { crease = 40 } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('model');
  const NAMES = ['body', 'solar-panel', 'foil'];
  let total = 0;
  for (const part of parts) {
    const tris = withNormals(part.tris, crease);
    const node = doc.createNode(part.name).setTranslation(part.origin.map((v) => +v.toFixed(4)));
    scene.addChild(node);
    for (let tag = 0; tag < 3; tag++) {
      const mine = tris.filter((t) => t.tag === tag);
      if (!mine.length) continue;
      const mesh = doc.createMesh(NAMES[tag]);
      const byColour = new Map();
      for (const t of mine) { const h = hexOf(t.c); (byColour.get(h) || byColour.set(h, []).get(h)).push(t); }
      for (const [h, list] of byColour) {
        const remap = new Map(); const vp = [], vn = [], vi = [];
        for (const t of list) for (let k = 0; k < 3; k++) {
          const p = [t.p[k * 3] - part.origin[0], t.p[k * 3 + 1] - part.origin[1], t.p[k * 3 + 2] - part.origin[2]];
          const n = [t.n[k * 3], t.n[k * 3 + 1], t.n[k * 3 + 2]];
          const kk = `${p.map((v) => Math.round(v * 5000)).join(',')}|${n.map((v) => Math.round(v * 32)).join(',')}`;
          let m = remap.get(kk);
          if (m === undefined) { m = vp.length / 3; vp.push(...p); vn.push(...n); remap.set(kk, m); }
          vi.push(m);
        }
        const material = doc.createMaterial(`own ${h}`).setBaseColorFactor([...list[0].c, 1]).setMetallicFactor(0).setRoughnessFactor(1);
        mesh.addPrimitive(doc.createPrimitive()
          .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vp)).setBuffer(buffer))
          .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vn)).setBuffer(buffer))
          .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(vi)).setBuffer(buffer))
          .setMaterial(material));
        total += list.length;
      }
      node.addChild(doc.createNode(NAMES[tag]).setMesh(mesh));
    }
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 8 }));
  await io.write(outPath, doc);
  return { tris: total, kb: Math.round(statSync(outPath).size / 1024) };
}
