// tests/test_rings.mjs -- spec 0054 task 5: Saturn's rings, lit both ways.
//
// The ring shader cannot run here, so this holds its JS twin (scene/worlds.js ringLight) to the
// physics it claims and the GLSL to the same formula, and reads the ring map itself -- a PNG, decoded
// with node's zlib and nothing else -- to find where it draws the Cassini Division.
//
//   1. the slab: a thick ring face-on under an overhead Sun is the map; the lit face dims as the Sun
//      sinks; from below the thick B ring is dark and the thin C ring and the division are bright
//   2. forward scattering: with the Sun behind the rings the thin, dusty regions brighten, and the
//      thick ones do not
//   3. the Cassini Division: where the map draws it, and the warp that puts it on Cassini's radii
//   4. the GLSL carries the same constants and the same formula

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const W = await import(join(JS, 'scene/worlds.js'));
const { ringLight, ringMapU, RING_FRAG, WORLD_FRAG, WORLDS, CASSINI_DIVISION_KM, RING_MAP_DIVISION_U, RING_U_GLSL, ringWarpUniform, RING_DUST_COLOUR, RING_TINT, RING_EXPOSURE,
  RING_DUST, RING_DUST_G, RING_MU_FLOOR } = W;

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const DEG = Math.PI / 180;
const measured = [];
const sin = (deg) => Math.sin(deg * DEG);

// ---- 1. the slab ----------------------------------------------------------------------------------
{
  const thick = ringLight(0.999, 1, 1, 1, false);
  check(near(thick.I, 1, 0.01), `a thick ring, face-on, the Sun overhead, is the map's own colour (${thick.I.toFixed(3)})`);
  check(thick.cover > 0.99, 'and hides what is behind it');
  // 2026-09-29: the Sun 7.6 degrees from the ring plane, the camera 25 degrees above it, low phase.
  const B = 0.95; const C = 0.15;
  const lit = ringLight(B, sin(7.6), sin(25), Math.cos(20 * DEG), false);
  const litHigh = ringLight(B, sin(40), sin(25), Math.cos(20 * DEG), false);
  check(lit.I < litHigh.I * 0.7, `the lit face dims as the Sun sinks: ${lit.I.toFixed(3)} at 7.6 degrees against ${litHigh.I.toFixed(3)} at 40`);
  check(ringLight(B, 0, sin(25), 0.9, false).I < 0.1, 'with the Sun in the ring plane (a crossing) the rings go dark');
  // From below, the Sun on the other face.
  const bBelow = ringLight(B, sin(7.6), sin(25), Math.cos(60 * DEG), true);
  const cBelow = ringLight(C, sin(7.6), sin(25), Math.cos(60 * DEG), true);
  check(bBelow.I < 0.05, `from below the thick B ring passes almost nothing (${bBelow.I.toFixed(4)})`);
  check(cBelow.I > bBelow.I * 5, `and the thin C ring glows: ${cBelow.I.toFixed(3)} against the B ring's ${bBelow.I.toFixed(4)}`);
  // The two unlit branches meet: mu -> mu0 is the limit, not a jump.
  const a1 = ringLight(0.4, 0.3, 0.3, 0.2, true).I;
  const a2 = ringLight(0.4, 0.3, 0.3005, 0.2, true).I;
  check(near(a1, a2, 0.01 * a1), `the unlit formula is continuous where the Sun's and the camera's elevations meet (${a1.toFixed(4)}, ${a2.toFixed(4)})`);
  // Seen edge-on a ring covers what is behind it however thin it is.
  check(ringLight(C, 0.5, 0.03, 0.5, false).cover > ringLight(C, 0.5, 0.9, 0.5, false).cover * 3, 'seen edge-on even a thin ring covers the stars behind it');
  measured.push(`B ring (alpha ${B}) lit at 7.6 / 40 degrees: ${lit.I.toFixed(3)} / ${litHigh.I.toFixed(3)}; from below: B ${bBelow.I.toFixed(4)}, C ${cBelow.I.toFixed(3)}`);
}

// ---- 2. forward scattering ------------------------------------------------------------------------
{
  const C = 0.15; const B = 0.95;
  const side = ringLight(C, sin(7.6), sin(20), Math.cos(90 * DEG), true).I;
  const behind = ringLight(C, sin(7.6), sin(20), Math.cos(165 * DEG), true).I;
  check(behind > side * 2, `the thin ring with the Sun behind it from the camera is brighter than seen side-on (${behind.toFixed(3)} against ${side.toFixed(3)})`);
  const bBehind = ringLight(B, sin(7.6), sin(20), Math.cos(165 * DEG), true).I;
  check(bBehind < behind * 0.2, `the thick B ring does not light up (${bBehind.toFixed(4)})`);
  // Without dust a Lambert-sphere particle sends nothing straight forward.
  check(RING_DUST > 0 && RING_DUST < 0.5 && RING_DUST_G > 0.5 && RING_DUST_G < 0.9, `the dust share and asymmetry are modest (${RING_DUST}, g ${RING_DUST_G})`);
  measured.push(`thin ring from below, side-on / Sun behind: ${side.toFixed(3)} / ${behind.toFixed(3)}`);
}

// ---- 3. the Cassini Division ----------------------------------------------------------------------
function decodePng(buf) {
  let p = 8; let w = 0; let h = 0; let type = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const kind = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('8-bit non-interlaced only'); }
    if (kind === 'IDAT') idat.push(data);
    if (kind === 'IEND') break;
    p += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 0: 1, 4: 2 }[type];
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * bpp);
  const stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const r = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v;
      if (f === 0) v = r; else if (f === 1) v = r + a; else if (f === 2) v = r + b; else if (f === 3) v = r + ((a + b) >> 1);
      else { const pp = a + b - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c); v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}
{
  const saturn = WORLDS.find((w) => w.id === 'saturn');
  const ring = saturn.look.ring;
  const png = decodePng(readFileSync(join(ROOT, 'site/textures', ring.map)));
  check(png.bpp === 4 && png.w === 2048, `the ring map is RGBA, 2048 wide (${png.w} x ${png.h}, ${png.bpp} channels)`);
  const alphaAt = (x) => { let s = 0; for (let y = 0; y < png.h; y++) s += png.px[(y * png.w + x) * 4 + 3]; return s / png.h; };
  const col = Array.from({ length: png.w }, (_, x) => alphaAt(x));
  const kmAt = (x) => ring.innerKm + ((x + 0.5) / png.w) * (ring.outerKm - ring.innerKm);
  // The B ring's outer edge: from 115 000 km outward, the first texel under half of the B ring's
  // level (its mean over 110 000 - 117 000 km). The A ring's inner edge: past the division's floor,
  // the first texel back over half of the A ring's level (its mean over 123 000 - 128 000 km).
  const xOf = (km) => Math.round(((km - ring.innerKm) / (ring.outerKm - ring.innerKm)) * png.w);
  const mean = (a, b) => { let s = 0; for (let x = xOf(a); x < xOf(b); x++) s += col[x]; return s / (xOf(b) - xOf(a)); };
  const bLevel = mean(110000, 117000); const aLevel = mean(123000, 128000); const gap = mean(119000, 121000);
  let xb = xOf(115000); while (xb < png.w && col[xb] > (bLevel + gap) / 2) xb++;
  let xa = xOf(121300); while (xa < png.w && col[xa] < (aLevel + gap) / 2) xa++;
  const uB = xb / png.w; const uA = xa / png.w;
  measured.push(`the map's Cassini Division: ${Math.round(kmAt(xb))} to ${Math.round(kmAt(xa))} km (u ${uB.toFixed(4)} to ${uA.toFixed(4)}); Cassini's: ${CASSINI_DIVISION_KM.join(' to ')} km; B level ${bLevel.toFixed(0)}, gap ${gap.toFixed(0)}, A level ${aLevel.toFixed(0)}`);
  // The dust's colour is the map's alpha-weighted mean, in linear light.
  {
    const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const sum = [0, 0, 0]; let wsum = 0;
    for (let i = 0; i < png.w * png.h; i++) {
      const al = png.px[i * 4 + 3] / 255;
      for (let k = 0; k < 3; k++) sum[k] += lin(png.px[i * 4 + k]) * al;
      wsum += al;
    }
    const mean = sum.map((v) => v / wsum);
    check(mean.every((v, k) => near(v, RING_DUST_COLOUR[k], 0.001)), `RING_DUST_COLOUR is the map's alpha-weighted mean (${mean.map((v) => v.toFixed(4)).join(', ')})`);
  }
  // The exposure: the B ring's bright texels through the tint land on Saturn's own mean (its tint).
  {
    const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const hexLum = (h) => lum((h >> 16) & 255, (h >> 8) & 255, h & 255);
    const lums = [];
    for (let x = xOf(92000); x <= xOf(117580); x++) {
      const c = [0, 1, 2].map((k) => { let t = 0; for (let y = 0; y < png.h; y++) t += png.px[(y * png.w + x) * 4 + k]; return t / png.h; });
      lums.push(lum(...c));
    }
    lums.sort((p, q) => p - q);
    const p95 = lums[Math.floor(lums.length * 0.95)];
    const bright = p95 * hexLum(RING_TINT) * RING_EXPOSURE;
    const globe = hexLum(saturn.look.tint);
    check(near(bright, globe, 0.03 * globe), `the B ring's bright texels come out at Saturn's own mean: ${bright.toFixed(3)} against ${globe.toFixed(3)} (p95 ${p95.toFixed(3)})`);
    measured.push(`ring exposure: B ring p95 ${p95.toFixed(3)} x tint ${hexLum(RING_TINT).toFixed(3)} x ${RING_EXPOSURE} = ${bright.toFixed(3)}; Saturn's map mean ${globe.toFixed(3)}`);
  }
  check(near(uB, RING_MAP_DIVISION_U[0], 0.002) && near(uA, RING_MAP_DIVISION_U[1], 0.002),
    `RING_MAP_DIVISION_U is where the map draws the division (${uB.toFixed(4)}, ${uA.toFixed(4)} against ${RING_MAP_DIVISION_U.join(', ')})`);
  // The warp: Cassini's radii land on the map's edges, the ends stay, and it never runs backwards.
  const U = (km) => ringMapU(km, ring.innerKm, ring.outerKm);
  check(U(ring.innerKm) === 0 && near(U(ring.outerKm), 1, 1e-12), 'the warp keeps the ring\'s two ends');
  check(near(U(CASSINI_DIVISION_KM[0]), RING_MAP_DIVISION_U[0], 1e-12) && near(U(CASSINI_DIVISION_KM[1]), RING_MAP_DIVISION_U[1], 1e-12), 'the warp puts the map\'s division edges on Cassini\'s radii');
  let mono = true; let last = -1;
  for (let km = ring.innerKm; km <= ring.outerKm; km += 100) { const u = U(km); if (u < last) mono = false; last = u; }
  check(mono, 'the warp never runs backwards');
  // Nothing moves by more than the division's error: the Encke gap (133 590 km) stays within 1 000 km.
  const encke = 133590; const plain = (encke - ring.innerKm) / (ring.outerKm - ring.innerKm);
  const moved = (U(encke) - plain) * (ring.outerKm - ring.innerKm);
  check(Math.abs(moved) < 1000, `the A ring beyond the division moves by less than 1 000 km (the Encke gap by ${Math.round(moved)} km)`);
  // The ring mesh's uv and the globe's shadow both read through it.
  check(/texture2D\( uMap, vec2\( ringMapU\( length\( vPosL\.xy \) \), 0\.5 \) \)/.test(RING_FRAG), 'the ring reads its map through the warp, by radius');
  check(/float ringMapU\( float r \)/.test(WORLD_FRAG) && /texture2D\( uRingMap, vec2\( ringMapU\( r \), 0\.5 \) \)/.test(WORLD_FRAG),
    'the globe\'s ring shadow reads the map through the same warp');
}

// ---- 3b. the scene: the globe and the ring read the map through one warp -------------------------
{
  const THREE = await import(join(JS, '../vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('earth');
  const worlds = W.createWorlds(new THREE.Scene(), { textureBase: null });
  const saturn = worlds.meshFor('saturn');
  const ring = saturn.userData.ring;
  const want = ringWarpUniform(WORLDS.find((w) => w.id === 'saturn').radiusKm);
  const got = saturn.material.uniforms.uRingWarp.value.toArray();
  const gotRing = ring.material.uniforms.uRingWarp.value.toArray();
  check(got.every((v, i) => near(v, want[i], 1e-12)) && gotRing.every((v, i) => near(v, want[i], 1e-12)), `the globe's shadow and the ring carry the same warp (${got.map((v) => v.toFixed(4)).join(', ')})`);
  check(ring.material.blending === THREE.CustomBlending && ring.material.blendSrc === THREE.OneFactor && ring.material.blendDst === THREE.OneMinusSrcAlphaFactor,
    'the ring blends premultiplied: its light plus what gets through');
  check(RING_FRAG.includes('float ringMapU( float r )') && WORLD_FRAG.includes(RING_U_GLSL.trim()), 'both shaders carry the same RING_U_GLSL');
  worlds.dispose();
}

// ---- 4. the GLSL ------------------------------------------------------------------------------------
{
  const constIn = (src, name) => { const m = src.match(new RegExp(`const float ${name} = ([0-9.e-]+);`)); return m ? Number(m[1]) : NaN; };
  for (const [n, v] of [['RING_DUST', RING_DUST], ['RING_DUST_G', RING_DUST_G], ['RING_MU_FLOOR', RING_MU_FLOOR]]) {
    check(constIn(RING_FRAG, n) === v, `RING_FRAG carries ${n} = ${v}`);
  }
  check(/S = 2\.0 \* m0 \/ \( m0 \+ m \) \* \( 1\.0 - exp\( -tau \* \( 1\.0 \/ m0 \+ 1\.0 \/ m \) \) \);/.test(RING_FRAG), 'the lit face is the slab formula');
  check(/S = 2\.0 \* m0 \/ \( m - m0 \) \* \( exp\( -tau \/ m \) - exp\( -tau \/ m0 \) \);/.test(RING_FRAG), 'the unlit face is the slab formula');
  check(/float tau = -log\( 1\.0 - alpha \);/.test(RING_FRAG), 'the map\'s alpha is read as the face-on opacity');
  check(/gl_FragColor = vec4\( light, cover \);/.test(RING_FRAG), 'the ring is premultiplied: its light plus what gets through');
  check(/vec3 light = uColour \* \( tex\.rgb \* body \+ RING_DUST_COLOUR \* fine \) \* shade;/.test(RING_FRAG), 'the particles take the map\'s colour and the dust the map\'s mean');
  check(/smoothstep\( 0\.98, 1\.02, closest \)/.test(RING_FRAG), '#318\'s shadow of the globe on the ring is kept');
  check(/ringShade = 1\.0 - 0\.85 \* a;/.test(WORLD_FRAG), '#318\'s shadow of the ring on the globe is kept');
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`rings FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('rings ok: the slab lights both faces, forward scattering lights the thin rings from behind, and the map\'s Cassini Division sits on Cassini\'s radii');
