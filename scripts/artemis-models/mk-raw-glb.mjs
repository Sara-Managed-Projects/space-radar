import { createRequire } from 'node:module'; import { join } from 'node:path'; import { readFileSync } from 'node:fs';
const require = createRequire(join(process.cwd(), 'package.json'));
const { NodeIO, Document } = await import(require.resolve('@gltf-transform/core'));
const [DIR, NAME, OUT] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, NAME + '.json'), 'utf8'));
const rd = (ext, T) => { const b = readFileSync(join(DIR, `${NAME}.${ext}`)); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };
const P = rd('P.f32', Float32Array), T = rd('T.u32', Uint32Array), M = rd('M.u16', Uint16Array);
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene('s'); const mesh = doc.createMesh(NAME); scene.addChild(doc.createNode(NAME).setMesh(mesh));
const byMat = new Map(); for (let t = 0; t < M.length; t++) { if (!byMat.has(M[t])) byMat.set(M[t], []); byMat.get(M[t]).push(t); }
const posAcc = doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buf);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); // the artist's numbers are sRGB (3ds Max), Blender read them as linear
const mats = new Map(meta.mats.map((m) => [m.idx, m]));
for (const [mi, tris] of byMat) {
  const m = mats.get(mi); const idx = new Uint32Array(tris.length * 3); tris.forEach((t, i) => { idx[i * 3] = T[t * 3]; idx[i * 3 + 1] = T[t * 3 + 1]; idx[i * 3 + 2] = T[t * 3 + 2]; });
  const mat = doc.createMaterial(m.name.replace(/panel/gi, 'plate').replace(/solar|array/gi, 'part')).setBaseColorFactor([...m.rgb.map(lin), 1]).setMetallicFactor(0).setRoughnessFactor(1);
  mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)).setMaterial(mat));
}
await new NodeIO().write(OUT, doc); console.log('wrote', OUT, byMat.size, 'materials');
