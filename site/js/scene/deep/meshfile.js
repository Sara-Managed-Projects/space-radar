// scene/deep/meshfile.js -- reads the compact mesh files of the objects built from published 3D data (site/data/deep/*.glb,
// written by scripts/meshopt_encode.mjs): a .glb whose views are meshopt-packed, positions 16-bit in each mesh's box.
// Fetched with the object that needs it; never at boot. It asks for the meshopt decoder the spacecraft models use
// (vendor/meshopt_decoder.module.js, 29 kB) and not for the glTF loader: these files hold triangles or points, a
// colour at most, and nothing else.
//
//   parseMeshFile(arrayBuffer, decoder) -> { extras, meshes: [{ name, extras, positions (Float32Array, the file's own
//                                            units), indices (Uint16Array | Uint32Array | null: null is points),
//                                            colours (Uint8Array rgba | null) }] }     pure, for the tests
//   loadMeshFile(url)                   -> a promise of the same
const COMPONENT = { 5121: [Uint8Array, 1], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4] };

/** A .glb's JSON and binary chunk. Pure. */
export function glbChunks(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2) throw new Error('meshfile: not a .glb');
  const jl = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a) throw new Error('meshfile: no JSON chunk');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jl)));
  const bl = dv.getUint32(20 + jl, true);
  return { json, bin: new Uint8Array(buffer, 28 + jl, bl) };
}

export function parseMeshFile(buffer, decoder) {
  const { json, bin } = glbChunks(buffer);
  const views = new Map();
  const viewOf = (i) => {
    if (views.has(i)) return views.get(i);
    const e = json.bufferViews[i].extensions && json.bufferViews[i].extensions.EXT_meshopt_compression;
    if (!e) throw new Error('meshfile: a view that is not meshopt-packed');
    const out = new Uint8Array(e.count * e.byteStride);
    decoder.decodeGltfBuffer(out, e.count, e.byteStride, bin.subarray(e.byteOffset, e.byteOffset + e.byteLength), e.mode, e.filter || 'NONE');
    const v = { bytes: out, stride: e.byteStride };
    views.set(i, v);
    return v;
  };
  const meshes = [];
  for (const node of json.nodes || []) {
    if (!(node.mesh >= 0)) continue;
    const prim = json.meshes[node.mesh].primitives[0];
    const pa = json.accessors[prim.attributes.POSITION], pv = viewOf(pa.bufferView);
    const n = pa.count, s = node.scale || [1, 1, 1], t = node.translation || [0, 0, 0];
    const dv = new DataView(pv.bytes.buffer);
    const positions = new Float32Array(n * 3);
    const unit = pa.normalized ? 1 / 65535 : 1; // 16-bit positions are stored normalised, coarser ones as plain integers
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = dv.getUint16(i * pv.stride + (pa.byteOffset || 0) + k * 2, true) * unit * s[k] + t[k];
    let colours = null;
    if (prim.attributes.COLOR_0 >= 0) {
      const ca = json.accessors[prim.attributes.COLOR_0], cv = viewOf(ca.bufferView);
      colours = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) colours[i * 4 + k] = cv.bytes[i * cv.stride + (ca.byteOffset || 0) + k];
    }
    let indices = null;
    if (prim.indices >= 0) {
      const ia = json.accessors[prim.indices], iv = viewOf(ia.bufferView);
      const [Type] = COMPONENT[ia.componentType];
      indices = new Type(iv.bytes.buffer, 0, ia.count);
    }
    meshes.push({ name: node.name || json.meshes[node.mesh].name || '', extras: node.extras || null, positions, indices, colours });
  }
  return { extras: (json.scenes && json.scenes[0] && json.scenes[0].extras) || null, meshes };
}

export function loadMeshFile(url) {
  return Promise.all([
    fetch(url).then((r) => { if (!r.ok) throw new Error(`meshfile: ${url} answered ${r.status}`); return r.arrayBuffer(); }),
    import('../../vendor/meshopt_decoder.module.js').then((m) => m.MeshoptDecoder.ready.then(() => m.MeshoptDecoder)),
  ]).then(([buffer, decoder]) => parseMeshFile(buffer, decoder));
}
