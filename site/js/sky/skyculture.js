// sky/skyculture.js -- other peoples' figures, the IAU borders and the constellation pictures, for
// the sky from the ground (internal #354, #355, #383).
//
// Contract:
//   parseBounds(buffer)  -> Float32Array of line-segment ends, unit vectors in equatorial J2000
//   cultureFigures(doc)  -> { verts: number[], names: [{ name, dir }] } from data/skycultures/<id>.json
//   cultureLabel(figure) -> the name drawn: the people's own word first
//   artQuad(figure, n)   -> { positions, uvs, index, centre, radiusRad } for one picture
//   createSkyArt(env)    -> { update(view), state(), dispose() }
//     env:  { root, radius, eqToLocal, renderOrder, cap }
//     view: { on, dirEq, fovDeg, aspect, strength }
// Loaded by sky/groundsky.js with a dynamic import, and only when a visitor asks for one of the
// three: none of this, and none of the data, is fetched by a sky that shows the western lines.
//
// WHAT EACH IS. The borders are the IAU's (Delporte 1930) from CDS catalogue VI/49, Davenhall and
// Leggett 1989: measured, in the sense that a border is a definition. The other cultures' figures
// are Stellarium's sky-culture files (CC BY-SA 4.0 each, registry/skycultures.yaml names whose
// reading each one is): documented reconstructions of living traditions, and the controls say so.
// The pictures are Johan Meuris's, drawn for Stellarium (Free Art License 1.3, the notice is
// data/skyart/LICENSE.txt): drawn, pinned to the sky by three stars each, as Stellarium pins them.
//
// A picture is a square image and three stars: the pixel of each star in the image, and where that
// star is. Three points fix the plane the image lies in; every other pixel is carried onto the sky
// along the line from the eye through that plane. Stellarium does the same, so the hunter's
// shoulder lands on Betelgeuse here as it does there.

import * as THREE from '../../vendor/three.module.min.js';
import { GLSL_AIR } from './skymath.js';

const DEG = Math.PI / 180;

function radecDir(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

/** data/constellation-bounds.bin (scripts/build-skycultures.py): 'SRCB', polylines of u16 ra, i16 dec. */
export function parseBounds(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRCB' || dv.getUint16(4, true) !== 1) throw new Error('constellation-bounds: not the file this was written for');
  const count = dv.getUint16(6, true);
  const out = [];
  let o = 8;
  for (let i = 0; i < count; i += 1) {
    const n = dv.getUint16(o, true);
    o += 2;
    let prev = null;
    for (let k = 0; k < n; k += 1) {
      const p = radecDir(dv.getUint16(o, true) / 65536 * 360, dv.getInt16(o + 2, true) / 32767 * 90);
      o += 4;
      if (prev) out.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
      prev = p;
    }
  }
  return new Float32Array(out);
}

/** The name drawn for a figure: the people's own word; with its English beside it when the script is not Latin. */
export function cultureLabel(figure) {
  const native = figure && figure.native;
  const name = (figure && figure.name) || '';
  if (!native) return name;
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-ɏʻ‘’`' -]/.test(native) && name ? `${native} ${name}` : native;
}

/** A culture's file as line-segment ends and names, both in equatorial J2000 unit vectors. */
export function cultureFigures(doc) {
  const verts = [];
  const names = [];
  for (const f of (doc && Array.isArray(doc.figures) ? doc.figures : [])) {
    for (const run of f.lines || []) {
      for (let i = 0; i + 3 < run.length; i += 2) verts.push(...radecDir(run[i], run[i + 1]), ...radecDir(run[i + 2], run[i + 3]));
    }
    const label = cultureLabel(f);
    if (label && Array.isArray(f.at)) names.push({ name: label, dir: radecDir(f.at[0], f.at[1]) });
  }
  return { verts, names };
}

function inverse3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!(Math.abs(det) > 1e-12)) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/**
 * One picture as a grid on the sky. `figure.anchors` is three of [u, v, raDeg, decDeg], u and v
 * from the image's top left. Returns null when the three stars are in a line in the image.
 */
export function artQuad(figure, n = 8) {
  const a = figure && figure.anchors;
  if (!Array.isArray(a) || a.length < 3) return null;
  // Rows [u v 1] for the three anchors; M = S * inverse(A) takes [u v 1] to a point of the plane.
  const inv = inverse3([a[0][0], a[1][0], a[2][0], a[0][1], a[1][1], a[2][1], 1, 1, 1]);
  if (!inv) return null;
  const s = a.map((p) => radecDir(p[2], p[3]));
  const M = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) M.push(s[0][r] * inv[c] + s[1][r] * inv[3 + c] + s[2][r] * inv[6 + c]);
  }
  const at = (u, v) => {
    const x = M[0] * u + M[1] * v + M[2];
    const y = M[3] * u + M[4] * v + M[5];
    const z = M[6] * u + M[7] * v + M[8];
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  };
  const positions = new Float32Array((n + 1) * (n + 1) * 3);
  const uvs = new Float32Array((n + 1) * (n + 1) * 2);
  const index = [];
  for (let j = 0; j <= n; j += 1) {
    for (let i = 0; i <= n; i += 1) {
      const k = j * (n + 1) + i;
      const p = at(i / n, j / n);
      positions[k * 3] = p[0]; positions[k * 3 + 1] = p[1]; positions[k * 3 + 2] = p[2];
      uvs[k * 2] = i / n; uvs[k * 2 + 1] = 1 - j / n;
      if (i < n && j < n) index.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1);
    }
  }
  const centre = at(0.5, 0.5);
  let radiusRad = 0;
  for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const p = at(u, v);
    radiusRad = Math.max(radiusRad, Math.acos(Math.max(-1, Math.min(1, p[0] * centre[0] + p[1] * centre[1] + p[2] * centre[2]))));
  }
  return { positions, uvs, index, centre, radiusRad };
}

const ART_VERT = /* glsl */ `
uniform mat3 uEqToLocal;
uniform float uRadius;
varying vec2 vUv;
varying float vUp;
${GLSL_AIR}
void main() {
  vec3 d = airLift(uEqToLocal * position, 1.0);
  vUv = uv;
  vUp = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const ART_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uOpacity;
varying vec2 vUv;
varying float vUp;
void main() {
  // The drawings are light on black: the grey is how much light to add. Gone under the horizon.
  float g = texture2D(uMap, vUv).r * uOpacity * smoothstep(-0.02, 0.05, vUp);
  if (g <= 0.003) discard;
  gl_FragColor = vec4(uTint * g, g);
  #include <colorspace_fragment>
}
`;

const FADE_MS = 500;

export function createSkyArt(env) {
  const here = import.meta.url;
  const cap = Math.max(2, env.cap || 10);
  const tint = new THREE.Color(0x9fb6dc);
  let figures = null;   // [{ id, file, quad, mesh, state, shownAt, seenAt, texture }]
  let asked = false;
  let failed = false;
  let disposed = false;
  const stats = { figures: 0, loaded: 0, shown: 0, bytes: 0 };

  function ask() {
    if (asked) return;
    asked = true;
    fetch(String(new URL('../../data/skyart/index.json', here)))
      .then((r) => { if (!r.ok) throw new Error(`skyart: HTTP ${r.status}`); return r.json(); })
      .then((doc) => {
        if (disposed) return;
        figures = [];
        for (const f of doc.figures || []) {
          const quad = artQuad(f);
          if (quad) figures.push({ id: f.id, file: f.file, quad, mesh: null, state: 'idle', shownAt: 0, seenAt: 0, texture: null });
        }
        stats.figures = figures.length;
      })
      .catch((e) => { failed = true; console.warn('sky art: the list of pictures did not load', e); });
  }

  // Two constellations can share one image (Argo Navis): the texture is fetched once for both.
  const textures = new Map(); // file -> { texture, users, bytes, promise }
  function textureFor(file) {
    let t = textures.get(file);
    if (t) return t.promise;
    t = { texture: null, bytes: 0, promise: null };
    t.promise = fetch(String(new URL(`../../data/skyart/${file}`, here)))
      .then((r) => { if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => new Promise((resolve, reject) => {
        // The type is said here, so the picture decodes whatever the server calls a .webp.
        const src = URL.createObjectURL(new Blob([buf], { type: 'image/webp' }));
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(src);
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.NoColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.needsUpdate = true;
          t.texture = tex;
          t.bytes = buf.byteLength;
          stats.bytes += buf.byteLength;
          resolve(tex);
        };
        img.onerror = () => { URL.revokeObjectURL(src); reject(new Error(`${file}: not an image`)); };
        img.src = src;
      }));
    textures.set(file, t);
    t.promise.catch(() => textures.delete(file));
    return t.promise;
  }

  function build(f) {
    f.state = 'loading';
    textureFor(f.file).then((tex) => {
      if (disposed || f.state !== 'loading') return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(f.quad.positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(f.quad.uvs, 2));
      geo.setIndex(f.quad.index);
      const mat = new THREE.ShaderMaterial({
        vertexShader: ART_VERT, fragmentShader: ART_FRAG,
        uniforms: { uEqToLocal: { value: env.eqToLocal }, uRadius: { value: env.radius }, uMap: { value: tex }, uTint: { value: tint }, uOpacity: { value: 0 } },
        transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      });
      f.mesh = new THREE.Mesh(geo, mat);
      f.mesh.name = `sky-art-${f.id}`;
      f.mesh.frustumCulled = false;
      f.mesh.renderOrder = env.renderOrder;
      env.root.add(f.mesh);
      f.state = 'ready';
      f.shownAt = performance.now();
    }).catch(() => { f.state = 'failed'; });
  }

  function drop(f) {
    if (f.mesh) { f.mesh.geometry.dispose(); f.mesh.material.dispose(); env.root.remove(f.mesh); f.mesh = null; }
    f.state = 'idle';
  }

  function update(view) {
    if (disposed) return;
    if (!view.on) {
      if (figures) for (const f of figures) if (f.mesh) f.mesh.visible = false;
      stats.shown = 0;
      return;
    }
    ask();
    if (!figures) return;
    const now = performance.now();
    // What the screen holds: half the diagonal of the field, and a picture's own half width.
    const half = (view.fovDeg / 2) * DEG;
    const reach = Math.atan(Math.tan(half) * Math.hypot(1, view.aspect || 1));
    let shown = 0;
    let held = 0;
    for (const f of figures) {
      const c = f.quad.centre;
      const cos = c[0] * view.dirEq[0] + c[1] * view.dirEq[1] + c[2] * view.dirEq[2];
      const inView = Math.acos(Math.max(-1, Math.min(1, cos))) < reach + f.quad.radiusRad;
      if (inView) {
        f.seenAt = now;
        if (f.state === 'idle') build(f);
      }
      if (f.mesh) {
        held += 1;
        f.mesh.visible = inView && view.strength > 0.004;
        if (f.mesh.visible) {
          shown += 1;
          f.mesh.material.uniforms.uOpacity.value = view.strength * Math.min(1, (now - f.shownAt) / FADE_MS);
        }
      }
    }
    // Over the cap: the pictures looked at longest ago go, and so do their textures.
    if (held > cap) {
      const old = figures.filter((f) => f.mesh && now - f.seenAt > 1500).sort((a, b) => a.seenAt - b.seenAt);
      for (const f of old.slice(0, held - cap)) {
        const file = f.file;
        drop(f);
        if (!figures.some((g) => g.file === file && g.mesh)) {
          const t = textures.get(file);
          if (t && t.texture) { t.texture.dispose(); stats.bytes -= t.bytes; }
          textures.delete(file);
        }
      }
    }
    stats.shown = shown;
    stats.loaded = textures.size;
  }

  return {
    update,
    state: () => ({ ...stats, failed, ready: !!figures }),
    dispose() {
      disposed = true;
      if (figures) for (const f of figures) drop(f);
      for (const t of textures.values()) if (t.texture) t.texture.dispose();
      textures.clear();
    },
  };
}
