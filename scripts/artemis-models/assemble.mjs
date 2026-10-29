// assemble.mjs config.json out.glb [--plain]
// Merge baked part files into ONE glb: a top-level node per part (named), each part's origin at its centre of mass
// (area-weighted), children `body` / `solar-panel` / `foil` as the bake names them. Metres, +Y up.
import { createRequire } from 'node:module'; import { join } from 'node:path'; import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(join(process.cwd(), 'package.json'));
const gt = await import(require.resolve('@gltf-transform/core'));
const { NodeIO, Document } = gt;
const { ALL_EXTENSIONS } = await import(require.resolve('@gltf-transform/extensions'));
const { meshopt } = await import(require.resolve('@gltf-transform/functions'));
const { MeshoptDecoder, MeshoptEncoder } = await import(require.resolve('meshoptimizer'));
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const [CFG, OUT, ...flags] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(CFG, 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const out = new Document(); const buffer = out.createBuffer(); const scene = out.createScene('model'); out.getRoot().setDefaultScene(scene);
const matCache = new Map();
const matFor = (src) => { const key = src.getName() + JSON.stringify(src.getBaseColorFactor()); if (!matCache.has(key)) matCache.set(key, out.createMaterial(src.getName()).setBaseColorFactor(src.getBaseColorFactor()).setMetallicFactor(0).setRoughnessFactor(1)); return matCache.get(key); };
const report = []; let allTris = 0;
const mulMat = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
for (const part of cfg.parts) {
  const docs = []; for (const f of (Array.isArray(part.file) ? part.file : [part.file])) docs.push(await io.read(f));
  // gather world-space triangles per tag mesh
  const groups = []; // {name, prims:[{pos:Float32Array, nrm, idx, mat}]}
  for (const doc of docs) for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const W = node.getWorldMatrix(); const prims = [];
    for (const p of mesh.listPrimitives()) {
      const pa = p.getAttribute('POSITION'), na = p.getAttribute('NORMAL'), ia = p.getIndices();
      const n = pa.getCount(); const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3); const v = [0, 0, 0];
      const sc = Math.cbrt(Math.abs(W[0] * (W[5] * W[10] - W[6] * W[9]) - W[1] * (W[4] * W[10] - W[6] * W[8]) + W[2] * (W[4] * W[9] - W[5] * W[8])));
      for (let i = 0; i < n; i++) {
        pa.getElement(i, v); const w = mulMat(W, v);
        pos[i * 3] = w[0] * (part.scale ?? 1) + (cfg.shift?.[0] ?? 0) + (part.shift?.[0] ?? 0); pos[i * 3 + 1] = w[1] * (part.scale ?? 1) + (cfg.shift?.[1] ?? 0) + (part.shift?.[1] ?? 0); pos[i * 3 + 2] = w[2] * (part.scale ?? 1) + (cfg.shift?.[2] ?? 0) + (part.shift?.[2] ?? 0);
        if (na) { na.getElement(i, v); const l = Math.hypot(v[0], v[1], v[2]) || 1; nrm[i * 3] = v[0] / l; nrm[i * 3 + 1] = v[1] / l; nrm[i * 3 + 2] = v[2] / l; }
      }
      prims.push({ pos, nrm, idx: Uint32Array.from(ia.getArray()), mat: p.getMaterial() });
    }
    groups.push({ name: mesh.getName() || node.getName() || 'body', prims });
  }
  // centre of mass: area-weighted triangle centroid
  let A = 0, cx = 0, cy = 0, cz = 0, tris = 0;
  for (const g of groups) for (const p of g.prims) for (let t = 0; t < p.idx.length; t += 3) {
    const a = p.idx[t] * 3, b = p.idx[t + 1] * 3, c = p.idx[t + 2] * 3; const P = p.pos;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    A += ar; cx += ar * (P[a] + P[b] + P[c]) / 3; cy += ar * (P[a + 1] + P[b + 1] + P[c + 1]) / 3; cz += ar * (P[a + 2] + P[b + 2] + P[c + 2]) / 3; tris++;
  }
  const com = part.origin ? part.origin : [cx / A, cy / A, cz / A];
  const pnode = out.createNode(part.name).setTranslation(com); scene.addChild(pnode);
  const byName = new Map(); const cols = {};
  for (const g of groups) {
    let mesh = byName.get(g.name);
    if (!mesh) { mesh = out.createMesh(g.name); byName.set(g.name, mesh); pnode.addChild(out.createNode(g.name).setMesh(mesh).setTranslation([0, 0, 0])); }
    for (const p of g.prims) {
      const pos = new Float32Array(p.pos.length); for (let i = 0; i < pos.length; i += 3) { pos[i] = p.pos[i] - com[0]; pos[i + 1] = p.pos[i + 1] - com[1]; pos[i + 2] = p.pos[i + 2] - com[2]; }
      const m = matFor(p.mat); cols[m.getName()] = (cols[m.getName()] || 0) + p.idx.length / 3;
      mesh.addPrimitive(out.createPrimitive().setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer)).setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(p.nrm).setBuffer(buffer)).setIndices(out.createAccessor().setType('SCALAR').setArray(p.idx).setBuffer(buffer)).setMaterial(m));
    }
  }
  allTris += tris; report.push({ part: part.name, tris, attach: com.map((x) => +x.toFixed(3)), colours: Object.keys(cols).length });
}
if (!flags.includes('--plain')) await out.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 8 }));
await io.write(OUT, out);
console.log(JSON.stringify(report)); console.log('TOTAL tris', allTris, 'draw calls (primitives)', out.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0));
