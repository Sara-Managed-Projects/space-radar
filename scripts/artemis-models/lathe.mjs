// lathe.mjs spec.json out.glb -- surfaces of revolution about +Y from a list of bands; flat colour per band, smooth round, hard along the profile.
import { createRequire } from 'node:module'; import { join } from 'node:path'; import { readFileSync } from 'node:fs';
const require = createRequire(join(process.cwd(), 'package.json'));
const { NodeIO, Document } = await import(require.resolve('@gltf-transform/core'));
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8')); const SEG = spec.segments || 64;
const lin = (h) => [1, 3, 5].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene('s'); const mesh = doc.createMesh(spec.mesh || 'body'); scene.addChild(doc.createNode(spec.mesh || 'body').setMesh(mesh));
const mats = new Map(); const cx = spec.cx || 0, cz = spec.cz || 0;
for (const b of spec.bands) { // {y0,r0,y1,r1,colour, disc?:true (r1 ignored)}
  const pos = [], nrm = [], idx = []; const dy = b.y1 - b.y0, dr = b.r1 - b.r0, len = Math.hypot(dy, dr) || 1;
  const nr = dy / len * (b.flip ? -1 : 1), ny = -dr / len * (b.flip ? -1 : 1);
  for (let k = 0; k <= SEG; k++) { const a = (k / SEG) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pos.push(cx + b.r0 * c, b.y0, cz + b.r0 * s, cx + b.r1 * c, b.y1, cz + b.r1 * s); nrm.push(nr * c, ny, nr * s, nr * c, ny, nr * s); }
  for (let k = 0; k < SEG; k++) { const i = k * 2; if (b.flip) idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); else idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  const name = `own ${b.colour}`; if (!mats.has(name)) mats.set(name, doc.createMaterial(name).setBaseColorFactor([...lin(b.colour), 1]).setMetallicFactor(0).setRoughnessFactor(1));
  mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf)).setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nrm)).setBuffer(buf)).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf)).setMaterial(mats.get(name)));
}
await new NodeIO().write(process.argv[3], doc); console.log('lathe', process.argv[3], spec.bands.length, 'bands', spec.bands.length * SEG * 2, 'tris');
