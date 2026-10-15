// scene/perf.js -- `sr.perf`: what a frame costs and what the scene holds, for tools only (internal
// spec 0076, stage W1-e; internal #915, the package's SR-PLAN-154 and SR-PLAN-178).
//
// NOT FOR VISITORS. Nothing in the app imports this file: main.js fetches it, at the end of its frame
// (anchor `0076 W1-e`), only under `?look=1` (a query key for tools, scene/quality.js lookHeld) or when
// a tool calls `sr.wantPerf()`. There is no panel and no visitor URL key, as with `?deepdebug=1`; an
// on-screen overlay for visitors was declined (internal docs/ui-guide.md). Until it is asked for, the
// loop pays one property read a frame.
//
// Contract: createPerf(ctx, opts?) -> {
//   frame(nowReal, frameMs)   once a DRAWN frame, after render(), from main.js: the interval since the
//                             last drawn frame and the work this frame took (performance.now() - nowReal,
//                             nowReal being the animation frame's own stamp). Writes into typed rings:
//                             no allocation per frame (tests/test_perf.mjs counts).
//   mark()                    starts a window: frames and network bytes are counted from here
//   count()                   drawn frames since the mark (cheap: a probe polls it)
//   stats()                   the window, as one object (below); allocates, walks the scene: not per frame
//   seed                      the fixed seed that ?look=1 gives the modules that would roll dice
//   dispose()
// }
//
// stats() -> {
//   frames, p50Ms, p95Ms, maxMs        drawn-frame intervals in the window (the last RING if longer)
//   workP50Ms, workP95Ms               the loop's own work per drawn frame (CPU side; on SwiftShader the
//                                      GPU's work is on the CPU too, so it is in here)
//   calls, triangles, points, lines    renderer.info of the last frame drawn
//   textures, geometries, programs     what three.js holds on the GPU now
//   gpu: { textureMiB, geometryMiB, totalMiB, visibleMiB, textures, geometries }
//                                      AN ESTIMATE, from the scene graph: every texture's pixels at their
//                                      format's bytes (a third more with mipmaps), every geometry's
//                                      buffers. Uploaded only once drawn, so `visibleMiB` (what the
//                                      visible graph holds) is the nearer figure for "now on the GPU"
//   net: { bytes, requests, sinceStartBytes }   Resource Timing since the mark, and since this was made
//   tier, look, exposure, held, latched, seed, at (ISO time of the clock), deep (sr.deep.stats() or null)
// }
//
// FRAME TIMES ARE RELATIVE on a runner: its GL is SwiftShader (tools/README.md). The same probe through
// `tools/cdp.mjs --gl=gpu` on a machine with a GPU gives absolute ones (internal #832).

export const RING = 240;
/** The seed every module that would call Math.random takes under ?look=1 (the release's number, 0076). */
export const LOOK_SEED = 76;
const MIB = 1024 * 1024;

/** The q-quantile of the first n values of a typed array, nearest rank; null when empty. Pure. */
export function quantile(arr, n, q) {
  if (!n) return null;
  const v = Array.from(arr.subarray(0, n)).sort((a, b) => a - b);
  return Math.round(v[Math.min(n - 1, Math.floor(q * n))] * 10) / 10;
}

/** Bytes a texture holds once uploaded, estimated from its image. Pure on the texture object. */
export function textureBytes(tex) {
  if (!tex || tex.isRenderTargetTexture) return 0;
  const img = tex.image;
  const one = (im) => {
    if (!im) return 0;
    const w = im.naturalWidth || im.videoWidth || im.width || 0;
    const h = im.naturalHeight || im.videoHeight || im.height || 0;
    const d = im.depth || 1;
    return w * h * d;
  };
  let px = 0;
  if (tex.isCompressedTexture && Array.isArray(tex.mipmaps) && tex.mipmaps.length) {
    for (const m of tex.mipmaps) px += m && m.data ? m.data.byteLength : 0;
    return px; // already bytes
  }
  if (Array.isArray(img)) for (const im of img) px += one(im); // a cube map's six faces
  else px = one(img);
  const fmt = tex.format;
  // three.js r185: RedFormat 1028, RGFormat 1030, AlphaFormat 1021.
  const channels = fmt === 1028 || fmt === 1021 ? 1 : fmt === 1030 ? 2 : 4;
  // FloatType 1015, HalfFloatType 1016.
  const per = tex.type === 1015 ? 4 : tex.type === 1016 ? 2 : 1;
  // LinearMipmapLinearFilter 1008, NearestMipmapNearestFilter 1004, ...1005, ...1007.
  const mips = tex.generateMipmaps !== false && [1004, 1005, 1007, 1008].includes(tex.minFilter) ? 4 / 3 : 1;
  return Math.round(px * channels * per * mips);
}

/** Bytes a geometry's buffers hold. Pure on the geometry object. */
export function geometryBytes(geo) {
  if (!geo) return 0;
  let b = 0;
  const add = (a) => { if (a && a.array && a.array.byteLength) b += a.array.byteLength; };
  if (geo.attributes) for (const k of Object.keys(geo.attributes)) add(geo.attributes[k]);
  if (geo.morphAttributes) for (const k of Object.keys(geo.morphAttributes)) for (const a of geo.morphAttributes[k] || []) add(a);
  add(geo.index);
  return b;
}

/** Every texture a material wears: its own map slots and its shader's uniforms. */
function texturesOf(mat, put) {
  if (!mat) return;
  for (const k of Object.keys(mat)) { const v = mat[k]; if (v && v.isTexture) put(v); }
  if (mat.uniforms) {
    for (const k of Object.keys(mat.uniforms)) {
      const v = mat.uniforms[k] && mat.uniforms[k].value;
      if (v && v.isTexture) put(v);
      else if (Array.isArray(v)) for (const x of v) if (x && x.isTexture) put(x);
    }
  }
}

/**
 * What a scene graph holds, estimated (see the head). `scene` is a THREE.Scene or anything with
 * traverse/traverseVisible. Pure on the graph.
 */
export function sceneBytes(scene) {
  const tex = new Map();
  const geo = new Map();
  const visTex = new Set();
  const visGeo = new Set();
  const walk = (o, visible) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) texturesOf(m, (t) => { if (!tex.has(t.uuid)) tex.set(t.uuid, textureBytes(t)); if (visible) visTex.add(t.uuid); });
    if (o.geometry && o.geometry.attributes) { if (!geo.has(o.geometry.uuid)) geo.set(o.geometry.uuid, geometryBytes(o.geometry)); if (visible) visGeo.add(o.geometry.uuid); }
    if (o.instanceMatrix && o.instanceMatrix.array) { const id = o.uuid + ':instances'; if (!geo.has(id)) geo.set(id, o.instanceMatrix.array.byteLength); if (visible) visGeo.add(id); }
  };
  if (scene && scene.background && scene.background.isTexture) { tex.set(scene.background.uuid, textureBytes(scene.background)); visTex.add(scene.background.uuid); }
  if (scene && typeof scene.traverse === 'function') scene.traverse((o) => walk(o, false));
  if (scene && typeof scene.traverseVisible === 'function') scene.traverseVisible((o) => walk(o, true));
  let t = 0; let g = 0; let v = 0;
  for (const [id, b] of tex) { t += b; if (visTex.has(id)) v += b; }
  for (const [id, b] of geo) { g += b; if (visGeo.has(id)) v += b; }
  const r = (x) => Math.round((x / MIB) * 100) / 100;
  return { textureMiB: r(t), geometryMiB: r(g), totalMiB: r(t + g), visibleMiB: r(v), textures: tex.size, geometries: geo.size };
}

export function createPerf(ctx = {}, opts = {}) {
  const now = opts.now || (() => performance.now());
  const gaps = new Float64Array(RING);
  const work = new Float64Array(RING);
  let n = 0;        // frames written since the mark
  let head = 0;     // next slot
  let total = 0;    // frames since made
  // Network: Resource Timing as it arrives (an observer sees every entry, whatever the buffer's size).
  let netBytes = 0; let netReqs = 0; let netAll = 0;
  let observer = null;
  try {
    if (typeof PerformanceObserver === 'function') {
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) { const b = e.transferSize || e.encodedBodySize || 0; netBytes += b; netAll += b; netReqs += 1; }
      });
      observer.observe({ type: 'resource', buffered: false });
    }
  } catch { observer = null; }

  const api = {
    seed: LOOK_SEED,
    frame(nowReal, frameMs) {
      gaps[head] = frameMs;
      work[head] = now() - nowReal;
      head = (head + 1) % RING;
      if (n < RING) n += 1;
      total += 1;
    },
    mark() { n = 0; head = 0; netBytes = 0; netReqs = 0; },
    count: () => n,
    get total() { return total; },
    stats() {
      const k = n;
      const r = renderInfo(ctx.renderer);
      let deep = null;
      try { deep = ctx.deep && ctx.deep.stats ? ctx.deep.stats() : null; } catch (e) { deep = { error: String(e) }; }
      let q = null;
      try { q = ctx.quality && ctx.quality.describe ? ctx.quality.describe() : null; } catch { q = null; }
      let at = null;
      try { at = ctx.clock ? new Date(ctx.clock.now()).toISOString() : null; } catch { at = null; }
      return {
        frames: k,
        p50Ms: quantile(gaps, k, 0.5), p95Ms: quantile(gaps, k, 0.95), maxMs: quantile(gaps, k, 1),
        workP50Ms: quantile(work, k, 0.5), workP95Ms: quantile(work, k, 0.95),
        ...r,
        gpu: sceneBytes(ctx.scene),
        net: { bytes: netBytes, requests: netReqs, sinceStartBytes: netAll },
        tier: q ? q.tier : null,
        look: ctx.drawn && ctx.drawn.mode ? ctx.drawn.mode() : null,
        exposure: ctx.exposure && ctx.exposure.mode ? ctx.exposure.mode() : null,
        held: ctx.latch ? !!ctx.latch.held : null,
        latched: ctx.latch ? !!ctx.latch.latched : null,
        seed: LOOK_SEED,
        at,
        deep,
      };
    },
    dispose() { if (observer) { try { observer.disconnect(); } catch { /* gone */ } observer = null; } },
  };
  return api;
}

function renderInfo(renderer) {
  try {
    const i = renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points, lines: i.render.lines, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : null };
  } catch { return { calls: null, triangles: null, points: null, lines: null, textures: null, geometries: null, programs: null }; }
}
