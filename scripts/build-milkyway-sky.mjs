#!/usr/bin/env node
// scripts/build-milkyway-sky.mjs -- the Milky Way from the Sun, BAKED FROM OUR OWN MODEL (release 1.4.0, r14-mw-bh).
//
//   node scripts/build-milkyway-sky.mjs [--size 2048] [--out site/textures/2k_milky_way_model.webp]
//
// scene/milkyway.js draws the band by integrating the galaxy's model along every line of sight. A phone (tier 0)
// and a device under the frame latch should not march, so they wear this picture instead: the same function
// (skyColour, 48 steps, every cloud and lane, the grain at this picture's own pixel size), evaluated once here for
// the Sun's place, in the module's own equirectangular convention (equirectDir: galactic longitude 0 in the middle,
// increasing to the left; north up). No photograph goes into it. It is the model at one place, so past a few
// hundred light-years from the Sun the module stops wearing it and marches (coarsely) instead.
//
// Pure arithmetic in worker threads; the PNG is written here and turned into WebP by Pillow (python3), as the other
// texture scripts do. Rebuild whenever scene/milkyway.js's model or exposure changes: tests/test_milkyway_inside.mjs
// compares a few pixels of the file with the module.

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, unlinkSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cpus, tmpdir } from 'node:os';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE = pathToFileURL(join(ROOT, 'site/js/scene/milkyway.js')).href;

if (!isMainThread) {
  const M = await import(MODULE);
  const { W, H, y0, y1 } = workerData;
  const opts = { ...M.cpuModel(64), steps: 48, samples: 4, pix: (2 * Math.PI) / W };
  const cam = [-M.MODEL.R0, 0, M.MODEL.Z_SUN];
  const out = new Float32Array((y1 - y0) * W * 3);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < W; x++) {
      const c = M.skyColour(cam, M.equirectDir((x + 0.5) / W, 1 - (y + 0.5) / H), opts);
      out.set(c, ((y - y0) * W + x) * 3);
    }
  }
  parentPort.postMessage(out, [out.buffer]);
} else {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const W = Number(arg('--size', 2048));
  const H = W / 2;
  const OUT = join(ROOT, arg('--out', 'site/textures/2k_milky_way_model.webp'));
  const n = Math.max(1, Math.min(16, cpus().length));
  const rows = Math.ceil(H / n);
  const t0 = Date.now();
  const parts = await Promise.all(Array.from({ length: n }, (_, i) => new Promise((resolve, reject) => {
    const y0 = i * rows, y1 = Math.min(H, y0 + rows);
    if (y0 >= y1) { resolve({ y0, data: new Float32Array(0) }); return; }
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { W, H, y0, y1 } });
    w.once('message', (data) => resolve({ y0, data }));
    w.once('error', reject);
  })));
  // sRGB-encode and write a PNG (8-bit RGB, filter 0)
  const enc = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (const { y0, data } of parts) {
    const h = data.length / (W * 3);
    for (let y = 0; y < h; y++) {
      const o = (y0 + y) * (W * 3 + 1);
      raw[o] = 0;
      for (let x = 0; x < W * 3; x++) raw[o + 1 + x] = enc(data[y * W * 3 + x]);
    }
  }
  const crc = (b) => { let c, r = 0xffffffff; for (let i = 0; i < b.length; i++) { c = (r ^ b[i]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = join(tmpdir(), `milky_way_model_${process.pid}.png`);
  writeFileSync(png, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
  execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=82, method=6)', png, OUT]);
  unlinkSync(png);
  console.log(`milky way model: ${W} x ${H} in ${((Date.now() - t0) / 1000).toFixed(0)} s on ${n} threads -> ${OUT} (${statSync(OUT).size} B)`);
}
