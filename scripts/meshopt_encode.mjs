// scripts/meshopt_encode.mjs -- a small encoder for glTF's EXT_meshopt_compression, in plain JavaScript, so that a mesh
// built from published data can be written as a compact .glb with nothing installed. The decoder the app ships
// (site/vendor/meshopt_decoder.module.js) reads what this writes; tests/test_meshopt_encode.mjs round-trips both codecs
// through that decoder, bit for bit.
//
//   encodeVertexBuffer(bytes, count, stride) -> Uint8Array   the vertex codec, version 0 (mode ATTRIBUTES)
//   encodeIndexBuffer(indices)               -> Uint8Array   the triangle codec, version 0 (mode TRIANGLES)
//   orderForCodec(indices, vertexCount)      -> { indices, remap }   triangles walked edge to edge, vertices in first use
//   writeGlb({ meshes, extras })             -> Uint8Array   meshes: [{ name, positions (Float32Array), indices?
//                                                             (Uint32Array; none = POINTS), colours? (Uint8Array rgba),
//                                                             bits? (8..16: the positions' grid across the box) }]
//
// The formats are meshoptimizer's (Arseny Kapoulkine, MIT), written here from their description: nothing is copied.
// Positions are stored as normalised 16-bit integers in the mesh's own box (KHR_mesh_quantization) with the node's
// scale and translation carrying them back, so a reader needs no table: three's GLTFLoader gives the metres (or
// light-years) the caller put in, to one part in 65 535 of the box.

const zigzag8 = (v) => ((v << 24 >> 31) ^ (v << 1)) & 255;

function encodeBytesGroup(out, buf, at, bits) {
  if (bits === 1) return;
  if (bits === 8) { for (let i = 0; i < 16; i++) out.push(buf[at + i]); return; }
  const per = 8 / bits, sentinel = (1 << bits) - 1;
  for (let i = 0; i < 16; i += per) {
    let byte = 0;
    for (let k = 0; k < per; k++) { const v = buf[at + i + k]; byte = ((byte << bits) | (v >= sentinel ? sentinel : v)) & 255; }
    out.push(byte);
  }
  for (let i = 0; i < 16; i++) if (buf[at + i] >= sentinel) out.push(buf[at + i]);
}
function measureGroup(buf, at, bits) {
  if (bits === 1) { for (let i = 0; i < 16; i++) if (buf[at + i]) return Infinity; return 0; }
  if (bits === 8) return 16;
  const sentinel = (1 << bits) - 1;
  let n = 16 * bits / 8;
  for (let i = 0; i < 16; i++) if (buf[at + i] >= sentinel) n++;
  return n;
}
function encodeBytes(out, buf, size) {
  const headerAt = out.length, headerSize = ((size / 16) + 3) >> 2;
  for (let i = 0; i < headerSize; i++) out.push(0);
  for (let i = 0; i < size; i += 16) {
    let best = 8, bestSize = 16;
    for (const bits of [1, 2, 4]) { const s = measureGroup(buf, i, bits); if (s < bestSize) { best = bits; bestSize = s; } }
    const log2 = best === 1 ? 0 : best === 2 ? 1 : best === 4 ? 2 : 3;
    const g = i / 16;
    out[headerAt + (g >> 2)] |= log2 << ((g & 3) * 2);
    encodeBytesGroup(out, buf, i, best);
  }
}

/** The vertex codec, version 0: `count` vertices of `stride` bytes (a multiple of 4, at most 256). */
export function encodeVertexBuffer(bytes, count, stride) {
  if (!(stride > 0 && stride <= 256 && stride % 4 === 0)) throw new Error('meshopt: a vertex is 4 to 256 bytes, a multiple of 4');
  const out = [0xa0];
  const last = new Uint8Array(stride);
  if (count > 0) last.set(bytes.subarray(0, stride));
  const first = last.slice();
  const blockMax = Math.min(256, Math.floor(8192 / stride) & ~15);
  const buf = new Uint8Array(256);
  for (let v0 = 0; v0 < count; v0 += blockMax) {
    const n = Math.min(blockMax, count - v0);
    for (let k = 0; k < stride; k++) {
      buf.fill(0);
      let p = last[k];
      for (let i = 0; i < n; i++) { const b = bytes[(v0 + i) * stride + k]; buf[i] = zigzag8((b - p) & 255); p = b; }
      encodeBytes(out, buf, (n + 15) & ~15);
    }
    last.set(bytes.subarray((v0 + n - 1) * stride, (v0 + n) * stride));
  }
  for (let i = stride; i < 32; i++) out.push(0); // the tail: the first vertex, padded to 32 bytes
  for (let i = 0; i < stride; i++) out.push(first[i]);
  return Uint8Array.from(out);
}

const vbyte = (out, v) => { v >>>= 0; do { out.push((v & 127) | (v > 127 ? 128 : 0)); v >>>= 7; } while (v); };
const CODE_AUX = [0x00, 0x76, 0x87, 0x56, 0x67, 0x78, 0xa9, 0x86, 0x65, 0x89, 0x68, 0x98, 0x01, 0x69, 0, 0];
const ORDER = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];

/** The triangle codec, version 0: a triangle list's indices (a multiple of 3). */
export function encodeIndexBuffer(indices) {
  if (indices.length % 3) throw new Error('meshopt: a triangle list');
  const code = [0xe0], data = [];
  const edge = new Int32Array(32).fill(-1), vert = new Int32Array(16).fill(-1);
  let eo = 0, vo = 0, next = 0, last = 0;
  const pushEdge = (a, b) => { edge[eo * 2] = a; edge[eo * 2 + 1] = b; eo = (eo + 1) & 15; };
  const pushVert = (v) => { vert[vo] = v; vo = (vo + 1) & 15; };
  const findVert = (v) => { for (let i = 0; i < 16; i++) if (vert[(vo - 1 - i) & 15] === v) return i; return -1; };
  const findEdge = (a, b, c) => {
    for (let i = 0; i < 16; i++) {
      const k = (eo - 1 - i) & 15, e0 = edge[k * 2], e1 = edge[k * 2 + 1];
      if (e0 === a && e1 === b) return (i << 2) | 0;
      if (e0 === b && e1 === c) return (i << 2) | 1;
      if (e0 === c && e1 === a) return (i << 2) | 2;
    }
    return -1;
  };
  const index = (v) => { const d = (v - last) | 0; vbyte(data, (d << 1) ^ (d >> 31)); last = v; };
  for (let i = 0; i < indices.length; i += 3) {
    const t = [indices[i], indices[i + 1], indices[i + 2]];
    const fer = findEdge(t[0], t[1], t[2]);
    if (fer >= 0 && (fer >> 2) < 15) {
      const o = ORDER[fer & 3], a = t[o[0]], b = t[o[1]], c = t[o[2]];
      const fc = findVert(c);
      let fec;
      if (fc >= 1 && fc < 15) fec = fc; else if (c === next) { next++; fec = 0; } else fec = 15;
      code.push(((fer >> 2) << 4) | fec);
      if (fec === 15) index(c);
      if (fec === 0 || fec === 15) pushVert(c);
      pushEdge(c, b); pushEdge(a, c);
    } else {
      const rot = t[1] === next ? 1 : t[2] === next ? 2 : 0;
      const o = ORDER[rot], a = t[o[0]], b = t[o[1]], c = t[o[2]];
      const fb = findVert(b), fc = findVert(c);
      let fea, feb, fec;
      if (a === next) { next++; fea = 0; } else fea = 15;
      if (fb >= 0 && fb < 14) feb = fb + 1; else if (b === next) { next++; feb = 0; } else feb = 15;
      if (fc >= 0 && fc < 14) fec = fc + 1; else if (c === next) { next++; fec = 0; } else fec = 15;
      const aux = (feb << 4) | fec, auxAt = CODE_AUX.indexOf(aux);
      if (fea === 0 && auxAt >= 0 && auxAt < 14) code.push(0xf0 | auxAt);
      else { code.push(0xf0 | 14 | fea); data.push(aux); }
      if (fea === 15) index(a);
      if (feb === 15) index(b);
      if (fec === 15) index(c);
      if (fea === 0 || fea === 15) pushVert(a);
      if (feb === 0 || feb === 15) pushVert(b);
      if (fec === 0 || fec === 15) pushVert(c);
      pushEdge(b, a); pushEdge(c, b); pushEdge(a, c);
    }
  }
  return Uint8Array.from(code.concat(data, CODE_AUX));
}

/**
 * Triangles in an order the codec packs well: each next triangle shares an edge with one of the last few where it can
 * (a walk over the mesh), and vertices numbered in first use. Returns the new index list and `remap[old] = new`.
 */
export function orderForCodec(indices, vertexCount) {
  const nt = indices.length / 3;
  const byEdge = new Map();
  const key = (a, b) => (a < b ? a * vertexCount + b : b * vertexCount + a);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const e = key(indices[t * 3 + k], indices[t * 3 + (k + 1) % 3]);
    const l = byEdge.get(e); if (l) l.push(t); else byEdge.set(e, [t]);
  }
  const done = new Uint8Array(nt), order = [], recent = [];
  let seed = 0;
  const neighbour = (t) => {
    for (let k = 0; k < 3; k++) for (const u of byEdge.get(key(indices[t * 3 + k], indices[t * 3 + (k + 1) % 3]))) if (!done[u]) return u;
    return -1;
  };
  while (order.length < nt) {
    let t = -1;
    for (let i = recent.length - 1; i >= 0 && t < 0; i--) t = neighbour(recent[i]);
    if (t < 0) { while (done[seed]) seed++; t = seed; }
    done[t] = 1; order.push(t); recent.push(t); if (recent.length > 24) recent.shift();
  }
  const remap = new Int32Array(vertexCount).fill(-1), out = new Uint32Array(indices.length);
  let n = 0;
  order.forEach((t, i) => { for (let k = 0; k < 3; k++) { const v = indices[t * 3 + k]; if (remap[v] < 0) remap[v] = n++; out[i * 3 + k] = remap[v]; } });
  for (let v = 0; v < vertexCount; v++) if (remap[v] < 0) remap[v] = n++;
  return { indices: out, remap };
}

const pad4 = (n) => (n + 3) & ~3;

/** A .glb of meshes (triangles, or points when a mesh has no indices), positions 16-bit in each mesh's box, meshopt throughout. */
export function writeGlb({ meshes, extras = null, generator = 'space-radar scripts/meshopt_encode.mjs' }) {
  const chunks = [], views = [], accessors = [], gltfMeshes = [], nodes = [];
  let offset = 0;
  let fallback = 0;
  const view = (raw, count, stride, mode, target) => {
    views.push({ buffer: 1, byteOffset: fallback, byteLength: count * stride, ...(mode === 'ATTRIBUTES' ? { byteStride: stride } : {}), ...(target ? { target } : {}),
      extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: offset, byteLength: raw.length, byteStride: stride, count, mode } } });
    fallback += pad4(count * stride);
    chunks.push(raw); offset += raw.length;
    const p = pad4(offset) - offset; if (p) { chunks.push(new Uint8Array(p)); offset += p; }
    return views.length - 1;
  };
  for (const m of meshes) {
    const n = m.positions.length / 3;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = m.positions[i * 3 + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const span = hi.map((h, k) => Math.max(h - lo[k], 1e-12));
    const stride = m.colours ? 12 : 8;
    // `bits` (16 by default): positions on a grid of 2^bits steps across the box, for point sets whose places are known far
    // more coarsely than a 65 535th of it. Sixteen bits are stored normalised; fewer as plain integers (the high byte
    // is then nearly constant and packs to nothing), with the node's scale carrying them back.
    const bits = Math.min(16, Math.max(8, m.bits || 16)), top = (1 << bits) - 1, whole = bits === 16;
    const vb = new Uint8Array(n * stride), dv = new DataView(vb.buffer);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) dv.setUint16(i * stride + k * 2, Math.round(((m.positions[i * 3 + k] - lo[k]) / span[k]) * top), true);
      if (m.colours) for (let k = 0; k < 4; k++) vb[i * stride + 8 + k] = m.colours[i * 4 + k];
    }
    const bv = view(encodeVertexBuffer(vb, n, stride), n, stride, 'ATTRIBUTES', 34962);
    const attributes = { POSITION: accessors.length };
    accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5123, ...(whole ? { normalized: true } : {}), count: n, type: 'VEC3', min: [0, 0, 0], max: [top, top, top] });
    if (m.colours) { attributes.COLOR_0 = accessors.length; accessors.push({ bufferView: bv, byteOffset: 8, componentType: 5121, normalized: true, count: n, type: 'VEC4' }); }
    const prim = { attributes, mode: m.indices ? 4 : 0 };
    if (m.indices) {
      const wide = n > 65535;
      const iv = view(encodeIndexBuffer(m.indices), m.indices.length, wide ? 4 : 2, 'TRIANGLES', 34963);
      prim.indices = accessors.length;
      accessors.push({ bufferView: iv, componentType: wide ? 5125 : 5123, count: m.indices.length, type: 'SCALAR' });
    }
    gltfMeshes.push({ name: m.name, primitives: [prim] });
    nodes.push({ name: m.name, mesh: gltfMeshes.length - 1, translation: lo, scale: whole ? span : span.map((v) => v / top), ...(m.extras ? { extras: m.extras } : {}) });
  }
  const json = {
    asset: { version: '2.0', generator },
    extensionsUsed: ['KHR_mesh_quantization', 'EXT_meshopt_compression'],
    extensionsRequired: ['KHR_mesh_quantization', 'EXT_meshopt_compression'],
    scene: 0, scenes: [{ nodes: nodes.map((_, i) => i), ...(extras ? { extras } : {}) }],
    nodes, meshes: gltfMeshes, accessors, bufferViews: views,
    buffers: [{ byteLength: offset }, { byteLength: fallback, extensions: { EXT_meshopt_compression: { fallback: true } } }],
  };
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jl = pad4(text.length), bl = pad4(offset);
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true);
  out.fill(0x20, 20, 20 + jl); out.set(text, 20);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004e4942, true);
  let at = 28 + jl;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
