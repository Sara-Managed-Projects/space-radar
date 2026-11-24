// pages/skyphoto-core.js -- the arithmetic of "Name the stars in your photo" (forge #572): where a star of our
// catalogue falls in a person's own photo, once the photo has been tied to the sky.
//
// Contract (pure: no DOM, no fetch, no clock; tests/test_skyphoto.mjs holds every function):
//   radecDir(raDeg, decDeg), dirRadec(v), localDir(altDeg, azDeg)
//   solveFromPairs(pairs, centre, {mirrored}) -> solution | null    pairs: [{px: [x, y], dir: [x, y, z]}], 2 or more
//   roughSolution({centreDir, upDir, hfovDeg, width, height}) -> solution
//   project(sol, dir) -> [x, y] | null      unproject(sol, [x, y]) -> dir
//   residuals(sol, pairs) -> [px ...]       describe(sol, width, height) -> {fovDeg, degPerPx, rollDeg, centre: {raDeg, decDeg}}
//   overlay(sol, width, height, sky, opts) -> {lines, stars, names, bodies}
//   luminance(rgba, w, h) -> Float32Array   findPeak(lum, w, h, x, y, r) -> {x, y, snr} | null
//   snapPairs(sol, lum, lw, lh, scale, stars, opts) -> pairs
//
// HOW A PHOTO IS TIED TO THE SKY, AND WHY NOT BY ITSELF. A camera with an ordinary (rectilinear) lens draws the sky in
// the gnomonic projection about the direction it points: a star at standard coordinates (xi, eta) on the plane that
// touches the sky there lands at pixel  p = A * (xi + i eta) + B,  with A and B complex numbers (scale and roll; the
// centre). Two stars named by the person give four equations for those four numbers, exactly; a third and more are a
// least-squares fit whose leftovers are shown, so the person sees how well it fits. The plane must touch the sky at
// the photo's own centre, which is not known before the solve: we start at the stars' mean direction and move the
// plane to wherever the photo's centre lands, five times (it settles in two or three).
// Finding where a photo points with nobody's help (a "blind plate solve": astrometry.net, ESA's tetra3) needs an index
// of star patterns at every scale; for our 9 000 naked-eye stars that is several megabytes before the star finder that
// reads a noisy phone photo, which is why this tool asks for two stars instead and says so (the page's "What it does
// not do"). A lens that bends straight lines (a fisheye, a phone's ultra-wide) is not this projection: the third star's
// leftover shows it, and the page says that too.

const DEG = Math.PI / 180;

export function radecDir(raDeg, decDeg) {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

export function dirRadec(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  const decDeg = Math.asin(Math.max(-1, Math.min(1, v[2] / n))) / DEG;
  const raDeg = ((Math.atan2(v[1], v[0]) / DEG) % 360 + 360) % 360;
  return { raDeg, decDeg };
}

/** A direction in the local frame of sky/skybodies.js (+X east, +Y up, +Z south) from altitude and azimuth (from north, clockwise). */
export function localDir(altDeg, azDeg) {
  const a = altDeg * DEG, z = azDeg * DEG;
  return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// complex numbers as [re, im]
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cconj = (a) => [a[0], -a[1]];
const cabs2 = (a) => a[0] * a[0] + a[1] * a[1];
const cdiv = (a, b) => { const d = cabs2(b) || 1e-30; const m = cmul(a, cconj(b)); return [m[0] / d, m[1] / d]; };

/** The plane that touches the sky at `c`: east and north on it. */
function basis(c) {
  c = unit(c);
  let e = cross([0, 0, 1], c);
  if (Math.hypot(e[0], e[1], e[2]) < 1e-9) e = [0, 1, 0]; // at a pole: any east will do
  e = unit(e);
  const n = cross(c, e);
  return { c, e, n };
}

/** Standard coordinates of `s` on the plane at `b`, or null when it is behind or too far round (more than ~84 degrees). */
function toPlane(b, s, minCos = 0.1) {
  const z = dot(s, b.c);
  if (!(z > minCos)) return null;
  return [dot(s, b.e) / z, dot(s, b.n) / z];
}

function fromPlane(b, w) {
  return unit([b.c[0] + w[0] * b.e[0] + w[1] * b.n[0], b.c[1] + w[0] * b.e[1] + w[1] * b.n[1], b.c[2] + w[0] * b.e[2] + w[1] * b.n[2]]);
}

/** The complex A, B that carry plane points w_i to pixels p_i: exact for two, least squares for more. */
function fit(ws, ps) {
  const n = ws.length;
  if (n < 2) return null;
  let wm = [0, 0], pm = [0, 0];
  for (let i = 0; i < n; i += 1) { wm = cadd(wm, ws[i]); pm = cadd(pm, ps[i]); }
  wm = [wm[0] / n, wm[1] / n]; pm = [pm[0] / n, pm[1] / n];
  let num = [0, 0], den = 0;
  for (let i = 0; i < n; i += 1) {
    const dw = csub(ws[i], wm), dp = csub(ps[i], pm);
    num = cadd(num, cmul(dp, cconj(dw)));
    den += cabs2(dw);
  }
  if (!(den > 1e-18)) return null;
  const A = [num[0] / den, num[1] / den];
  const B = csub(pm, cmul(A, wm));
  return { A, B };
}

function make(b, A, B, mirrored) { return { centreDir: b.c, basis: b, A, B, mirrored: !!mirrored }; }

/**
 * The solution from named stars. `centre` is the photo's centre in pixels. Two stars fix it exactly; with three or more
 * the mirrored reading (a selfie camera, a flipped scan) is tried too and the better fit kept unless `mirrored` is given.
 */
export function solveFromPairs(pairs, centre, opts = {}) {
  const good = (pairs || []).filter((p) => p && p.px && p.dir);
  if (good.length < 2) return null;
  const tryOne = (mirrored) => {
    let c = unit(good.reduce((s, p) => [s[0] + p.dir[0], s[1] + p.dir[1], s[2] + p.dir[2]], [0, 0, 0]));
    let out = null;
    for (let it = 0; it < 6; it += 1) {
      const b = basis(c);
      const ws = [], ps = [];
      for (const p of good) {
        const w = toPlane(b, p.dir, 0.05);
        if (!w) return null;
        ws.push(mirrored ? cconj(w) : w);
        ps.push([p.px[0], p.px[1]]);
      }
      const f = fit(ws, ps);
      if (!f) return null;
      out = make(b, f.A, f.B, mirrored);
      let wc = cdiv(csub([centre[0], centre[1]], f.B), f.A);
      if (mirrored) wc = cconj(wc);
      const next = fromPlane(b, wc);
      if (Math.acos(Math.max(-1, Math.min(1, dot(next, c)))) < 1e-9) break;
      c = next;
    }
    return out;
  };
  if (opts.mirrored === true || opts.mirrored === false || good.length < 3) {
    return tryOne(opts.mirrored === true);
  }
  const a = tryOne(false), m = tryOne(true);
  if (!a) return m;
  if (!m) return a;
  return rms(residuals(m, good)) < rms(residuals(a, good)) * 0.8 ? m : a;
}

/**
 * A first, rough solution from where the camera pointed: `centreDir` the photo's centre and `upDir` a direction a little
 * above it (towards the zenith, so the horizon is level), both J2000; `hfovDeg` the width of the photo in degrees.
 */
export function roughSolution({ centreDir, upDir, hfovDeg, width, height }) {
  const b = basis(centreDir);
  const k = (width / 2) / Math.tan(Math.max(1, Math.min(170, hfovDeg)) * DEG / 2);
  const wu = toPlane(b, unit(upDir), 0.05) || [0, 1];
  const len = Math.hypot(wu[0], wu[1]) || 1;
  const u = [wu[0] / len, wu[1] / len];
  // A * u must point up the picture, which is -y: A = -i k / u = -i k conj(u) (u is a unit).
  const A = cmul([0, -k], cconj(u));
  return make(b, A, [width / 2, height / 2], false);
}

/** Where a direction lands in the photo, in pixels, or null when it is behind the camera. */
export function project(sol, dir) {
  if (!sol) return null;
  let w = toPlane(sol.basis, dir, 0.1);
  if (!w) return null;
  if (sol.mirrored) w = cconj(w);
  const p = cadd(cmul(sol.A, w), sol.B);
  return [p[0], p[1]];
}

/** The direction of a pixel. */
export function unproject(sol, px) {
  let w = cdiv(csub([px[0], px[1]], sol.B), sol.A);
  if (sol.mirrored) w = cconj(w);
  return fromPlane(sol.basis, w);
}

export function residuals(sol, pairs) {
  return pairs.map((p) => { const q = project(sol, p.dir); return q ? Math.hypot(q[0] - p.px[0], q[1] - p.px[1]) : Infinity; });
}

export function rms(list) {
  if (!list.length) return 0;
  return Math.sqrt(list.reduce((s, v) => s + v * v, 0) / list.length);
}

/** What the solution says about the camera: field across the width and height, degrees a pixel, roll, where it points. */
export function describe(sol, width, height) {
  const k = Math.sqrt(cabs2(sol.A));
  const fov = (px) => (2 * Math.atan(px / 2 / k)) / DEG;
  // roll: the angle of north on the picture, clockwise from up
  const up = cmul(sol.A, sol.mirrored ? [0, -1] : [0, 1]);
  const rollDeg = ((Math.atan2(up[0], -up[1]) / DEG) % 360 + 360) % 360;
  return { fovDeg: [fov(width), fov(height)], degPerPx: 1 / k / DEG, rollDeg, centre: dirRadec(unproject(sol, [width / 2, height / 2])) };
}

const inFrame = (p, w, h, m) => p && p[0] >= -m && p[1] >= -m && p[0] <= w + m && p[1] <= h + m;

/**
 * What to draw on the photo. `sky` is {lines: [{id, segs: [[dirA, dirB] ...]}], names: [{id, name, dir}],
 * stars: [{name, mag, dir}] brightest first, bodies: [{id, name, dir, mag}]}. `opts.labels` caps the star names
 * (the brightest in the frame win), `opts.magLimit` the stars drawn at all.
 */
export function overlay(sol, width, height, sky, opts = {}) {
  const labels = opts.labels ?? 24;
  const magLimit = opts.magLimit ?? 4.5;
  const margin = Math.max(width, height) * 0.02;
  const out = { lines: [], stars: [], names: [], bodies: [] };
  if (!sol) return out;
  for (const fig of sky.lines || []) {
    for (const [a, b] of fig.segs) {
      const pa = project(sol, a), pb = project(sol, b);
      if (!pa || !pb) continue;
      if (!inFrame(pa, width, height, width) || !inFrame(pb, width, height, width)) continue; // far outside: skip, not stretch
      if (!inFrame(pa, width, height, margin) && !inFrame(pb, width, height, margin)) continue;
      out.lines.push({ id: fig.id, a: pa, b: pb });
    }
  }
  for (const n of sky.names || []) {
    const p = project(sol, n.dir);
    if (inFrame(p, width, height, -margin)) out.names.push({ id: n.id, name: n.name, x: p[0], y: p[1] });
  }
  let named = 0;
  for (const s of sky.stars || []) {
    if (s.mag > magLimit) continue;
    const p = project(sol, s.dir);
    if (!inFrame(p, width, height, 0)) continue;
    out.stars.push({ name: s.name, mag: s.mag, x: p[0], y: p[1], label: named < labels });
    named += 1;
  }
  for (const b of sky.bodies || []) {
    const p = project(sol, b.dir);
    if (inFrame(p, width, height, 0)) out.bodies.push({ id: b.id, name: b.name, mag: b.mag, x: p[0], y: p[1] });
  }
  return out;
}

/** Brightness of an RGBA image, one number a pixel (Rec. 709 weights). */
export function luminance(rgba, w, h) {
  const out = new Float32Array(w * h);
  for (let i = 0, j = 0; i < out.length; i += 1, j += 4) out[i] = 0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2];
  return out;
}

/**
 * The brightest small spot within `r` pixels of (x, y), as its brightness-weighted centre, with how far it stands above
 * the ring around it (`snr`, in that ring's spread). Null when nothing stands out: a click on dark sky stays where it was.
 */
export function findPeak(lum, w, h, x, y, r) {
  const x0 = Math.max(1, Math.floor(x - r)), x1 = Math.min(w - 2, Math.ceil(x + r));
  const y0 = Math.max(1, Math.floor(y - r)), y1 = Math.min(h - 2, Math.ceil(y + r));
  if (x1 <= x0 || y1 <= y0) return null;
  let best = -1, bx = 0, by = 0;
  const vals = [];
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx <= x1; xx += 1) {
      if ((xx - x) ** 2 + (yy - y) ** 2 > r * r) continue;
      const v = lum[yy * w + xx];
      vals.push(v);
      if (v > best) { best = v; bx = xx; by = yy; }
    }
  }
  if (vals.length < 9) return null;
  vals.sort((a, b) => a - b);
  const median = vals[vals.length >> 1];
  const q1 = vals[Math.floor(vals.length * 0.25)], q3 = vals[Math.floor(vals.length * 0.75)];
  const spread = Math.max(2, (q3 - q1) / 1.349);
  const snr = (best - median) / spread;
  // centroid over the pixels above half the peak's height, 2 pixels round it
  let sw = 0, sx = 0, sy = 0;
  const half = median + (best - median) / 2;
  for (let yy = Math.max(0, by - 2); yy <= Math.min(h - 1, by + 2); yy += 1) {
    for (let xx = Math.max(0, bx - 2); xx <= Math.min(w - 1, bx + 2); xx += 1) {
      const v = lum[yy * w + xx] - half;
      if (v > 0) { sw += v; sx += v * xx; sy += v * yy; }
    }
  }
  if (!(sw > 0)) return { x: bx, y: by, snr };
  return { x: sx / sw, y: sy / sw, snr };
}

/**
 * Pairs for a better fit: each bright catalogue star the solution puts in the photo, matched to the brightest spot near
 * it that stands out (snr over `minSnr`). `lum` is the photo shrunk by `scale` (lum pixel = photo pixel * scale).
 * Only stars at least `sep` photo pixels from any other bright star are used, so two close stars are never confused.
 */
export function snapPairs(sol, lum, lw, lh, scale, stars, opts = {}) {
  const w = lw / scale, h = lh / scale;
  const radius = opts.radius ?? Math.max(w, h) * 0.02;
  const minSnr = opts.minSnr ?? 6;
  const magLimit = opts.magLimit ?? 3.5;
  const max = opts.max ?? 30;
  const placed = [];
  for (const s of stars) {
    if (s.mag > magLimit) continue;
    const p = project(sol, s.dir);
    if (!inFrame(p, w, h, -radius)) continue;
    placed.push({ s, p });
  }
  const pairs = [];
  for (const a of placed) {
    if (pairs.length >= max) break;
    if (placed.some((b) => b !== a && Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]) < radius * 1.5)) continue;
    const pk = findPeak(lum, lw, lh, a.p[0] * scale, a.p[1] * scale, radius * scale);
    if (!pk || pk.snr < minSnr) continue;
    pairs.push({ name: a.s.name, dir: a.s.dir, px: [pk.x / scale, pk.y / scale] });
  }
  return pairs;
}

/**
 * Leave out a wrong pair (a misnamed star, a spot that was noise): try the fit without each pair in turn and drop the
 * one whose leaving makes the rest fit best, while that pair then misses by more than `k` times the rest's leftover
 * (and at least `floor` pixels). A least-squares fit spreads one bad pair over all of them, so the worst leftover of
 * the whole fit is not reliably the bad one; leaving each out in turn is (and cheap for the thirty pairs used here).
 */
export function pruneOutliers(sol, pairs, centre, { k = 3, floor = 4, keep = 3 } = {}) {
  let cur = pairs.slice();
  let s = sol;
  while (cur.length > keep) {
    let best = null;
    for (let i = 0; i < cur.length; i += 1) {
      const rest = cur.filter((_, j) => j !== i);
      const t = solveFromPairs(rest, centre, { mirrored: s.mirrored });
      if (!t) continue;
      const r = rms(residuals(t, rest));
      if (!best || r < best.r) best = { i, t, r, miss: residuals(t, [cur[i]])[0] };
    }
    if (!best || !(best.miss > Math.max(floor, k * best.r))) break;
    cur.splice(best.i, 1);
    s = best.t;
  }
  return { sol: s, pairs: cur };
}

/**
 * When a photo was taken, from its own EXIF block (DateTimeOriginal, else DateTime), as the 'YYYY-MM-DDTHH:MM' a
 * datetime-local field takes; null when it has none. Reads only the bytes it is given (the file's first 256 kB, on
 * the device). The camera's clock has no time zone in that field: the page says the field is in the device's zone.
 */
export function exifTaken(bytes) {
  const b = bytes;
  if (!b || b.length < 12 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 4 < b.length) {
    if (b[o] !== 0xff) return null;
    const marker = b[o + 1];
    const len = (b[o + 2] << 8) | b[o + 3];
    if (marker === 0xe1 && b[o + 4] === 0x45 && b[o + 5] === 0x78 && b[o + 6] === 0x69 && b[o + 7] === 0x66) {
      return tiffTaken(b, o + 10, Math.min(b.length, o + 2 + len));
    }
    if (marker === 0xda) return null; // the picture itself starts: no EXIF before it
    o += 2 + len;
  }
  return null;
}

function tiffTaken(b, t, end) {
  const le = b[t] === 0x49;
  const u16 = (i) => (le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
  const u32 = (i) => (le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216 : b[i] * 16777216 + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]));
  const ifd = (at) => {
    const out = new Map();
    if (t + at + 2 > end) return out;
    const n = u16(t + at);
    for (let k = 0; k < n; k += 1) {
      const e = t + at + 2 + k * 12;
      if (e + 12 > end) break;
      out.set(u16(e), { type: u16(e + 2), count: u32(e + 4), value: u32(e + 8) });
    }
    return out;
  };
  const text = (entry) => {
    if (!entry || entry.type !== 2 || entry.count < 19) return null;
    const at = t + entry.value;
    if (at + 19 > end) return null;
    const s = String.fromCharCode(...b.subarray(at, at + 19));
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(s);
    return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null;
  };
  const ifd0 = ifd(u32(t + 4));
  const exifPtr = ifd0.get(0x8769);
  const exif = exifPtr ? ifd(exifPtr.value) : new Map();
  return text(exif.get(0x9003)) || text(ifd0.get(0x0132));
}
