// tests/test_skyphoto.mjs -- "Name the stars in your photo" (forge #572): the arithmetic and the promise.
//
//   node tests/test_skyphoto.mjs
//
// 1. A synthetic photo: our own named stars drawn by a known camera (where it points, its roll, its field), then the
//    camera found again from two of them, and every other star put back within a fraction of a pixel; the mirrored
//    reading found from three; a rough solution from altitude and azimuth that keeps the horizon level.
// 2. The overlay keeps what is in the frame and names the brightest first.
// 3. Spots: a star drawn as a blob is found again by its centre; dark sky gives nothing.
// 4. THE PROMISE: the photo is never sent anywhere. The page's modules are read as text: no XMLHttpRequest, beacon,
//    socket, form post or fetch with a body; every fetch names one of our own data files; the file is read with
//    createObjectURL and nothing else; the page has no <form> with an action.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as core from '../site/js/pages/skyphoto-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed += 1; console.error('FAIL', msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tolerance ${tol})`);

const names = JSON.parse(readFileSync(join(ROOT, 'site/data/skystars.names.json'), 'utf8')).rows;
const star = (n) => { const r = names.find((x) => x[0] === n); return { name: n, mag: r[3], dir: core.radecDir(r[1], r[2]) }; };

// ---- 1. a known camera, found again ------------------------------------------------------------------------------
{
  const W = 4000, H = 3000;
  // Orion, a 50 degree wide phone photo turned 23 degrees
  const centreDir = core.radecDir(84, 0);
  const upDir = core.radecDir(84, 1);
  const truthUp = core.roughSolution({ centreDir, upDir, hfovDeg: 50, width: W, height: H });
  const roll = 23 * Math.PI / 180;
  const truth = { ...truthUp, A: [truthUp.A[0] * Math.cos(roll) - truthUp.A[1] * Math.sin(roll), truthUp.A[0] * Math.sin(roll) + truthUp.A[1] * Math.cos(roll)] };
  const orion = ['Betelgeuse', 'Rigel', 'Bellatrix', 'Alnilam', 'Alnitak', 'Mintaka', 'Saiph', 'Meissa'].map(star);
  const pairs = orion.map((s) => ({ ...s, px: core.project(truth, s.dir) }));
  ok(pairs.every((p) => p.px && p.px[0] > 0 && p.px[0] < W && p.px[1] > 0 && p.px[1] < H), 'the synthetic Orion is in the frame');
  const sol = core.solveFromPairs(pairs.slice(0, 2), [W / 2, H / 2]);
  ok(sol, 'two stars give a solution');
  for (const p of pairs.slice(2)) {
    const q = core.project(sol, p.dir);
    near(Math.hypot(q[0] - p.px[0], q[1] - p.px[1]), 0, 0.05, `${p.name} put back from Betelgeuse and Rigel`);
  }
  const d = core.describe(sol, W, H);
  near(d.fovDeg[0], 50, 0.01, 'the field across the width');
  near(d.centre.raDeg, 84, 1e-4, 'where it points, right ascension');
  near(d.centre.decDeg, 0, 1e-4, 'where it points, declination');
  // a corner pixel goes out and comes back
  const corner = core.project(sol, core.unproject(sol, [10, 20]));
  near(Math.hypot(corner[0] - 10, corner[1] - 20), 0, 1e-6, 'unproject then project is the same pixel');
  // with a click 3 px out on one star the third star's leftover says so
  const off = [pairs[0], { ...pairs[1], px: [pairs[1].px[0] + 3, pairs[1].px[1]] }, pairs[2]];
  const s3 = core.solveFromPairs(off, [W / 2, H / 2], { mirrored: false });
  ok(core.rms(core.residuals(s3, off)) > 0.5, 'a bad click shows in the leftovers');
  // the mirrored photo: x flipped, found from three stars without being told
  const flipped = pairs.map((p) => ({ ...p, px: [W - p.px[0], p.px[1]] }));
  const sm = core.solveFromPairs(flipped.slice(0, 4), [W / 2, H / 2]);
  ok(sm && sm.mirrored, 'a mirrored photo is read as mirrored from four stars');
  near(core.rms(core.residuals(sm, flipped)), 0, 0.05, 'and fits every star');
  // pruning drops the one wrong name
  const wrong = pairs.slice(0, 6).map((p, i) => (i === 4 ? { ...p, dir: star('Sirius').dir } : p));
  const first = core.solveFromPairs(wrong, [W / 2, H / 2], { mirrored: false });
  const pr = core.pruneOutliers(first, wrong, [W / 2, H / 2]);
  ok(pr.pairs.length === 5 && !pr.pairs.some((p) => p.name === 'Alnitak'), 'the outlier (a wrong name) is left out');
}

// ---- rough: level horizon ------------------------------------------------------------------------------------------
{
  // a fake sky where local = equatorial (the matrix is the identity): up is +Y
  const centre = core.localDir(30, 180); // south, 30 up
  const up = core.localDir(31, 180);
  const sol = core.roughSolution({ centreDir: centre, upDir: up, hfovDeg: 60, width: 1200, height: 800 });
  const p = core.project(sol, core.localDir(45, 180));
  ok(p && Math.abs(p[0] - 600) < 1e-6 && p[1] < 400, 'a point higher up is straight above the centre');
  const left = core.project(sol, core.localDir(30, 170)); // a little east of south: left, facing south
  ok(left && left[0] < 600, 'facing south, east is on the left');
  const edge = core.project(sol, core.localDir(0, 180));
  ok(edge && edge[1] > 400, 'the horizon is below the centre');
}

// ---- 2. the overlay ------------------------------------------------------------------------------------------------
{
  const W = 2000, H = 1500;
  const sol = core.roughSolution({ centreDir: core.radecDir(84, 0), upDir: core.radecDir(84, 1), hfovDeg: 40, width: W, height: H });
  const stars = names.map((r) => ({ name: r[0], mag: r[3], dir: core.radecDir(r[1], r[2]) })).sort((a, b) => a.mag - b.mag);
  const lines = JSON.parse(readFileSync(join(ROOT, 'site/data/constellations.lines.json'), 'utf8')).features.map((f) => ({
    id: f.id, segs: f.geometry.coordinates.flatMap((l) => l.slice(1).map((pt, i) => [core.radecDir(l[i][0], l[i][1]), core.radecDir(pt[0], pt[1])])),
  }));
  const cn = JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8')).map((r) => ({ id: r.id, name: r.name, dir: core.radecDir(r.ra, r.dec) }));
  const o = core.overlay(sol, W, H, { lines, names: cn, stars, bodies: [{ id: 'mars', name: 'Mars', dir: core.radecDir(84.5, 1), mag: 1 }] }, { labels: 5 });
  ok(o.lines.some((l) => l.id === 'Ori'), "Orion's lines are drawn");
  ok(!o.lines.some((l) => l.id === 'UMa'), 'the Great Bear, behind the camera, is not');
  ok(o.names.some((n) => n.id === 'Ori'), "Orion's name is placed");
  ok(o.stars.filter((s) => s.label).length === 5 && o.stars[0].name === 'Rigel', 'the five brightest in the frame are named, Rigel first');
  ok(o.stars.every((s) => s.x >= 0 && s.x <= W && s.y >= 0 && s.y <= H), 'every star drawn is in the frame');
  ok(o.bodies.length === 1, 'a planet in the frame is drawn');
  ok(core.overlay(null, W, H, { stars }).stars.length === 0, 'no solution, nothing drawn');
}

// ---- 3. spots ------------------------------------------------------------------------------------------------------
{
  const w = 200, h = 150;
  const lum = new Float32Array(w * h).fill(20);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < lum.length; i += 1) lum[i] += rnd() * 6;
  const blob = (cx, cy, amp, sig) => {
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) lum[y * w + x] += amp * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sig * sig));
  };
  blob(80.3, 60.7, 200, 1.4);
  const pk = core.findPeak(lum, w, h, 84, 58, 8);
  ok(pk && Math.hypot(pk.x - 80.3, pk.y - 60.7) < 0.35 && pk.snr > 20, `a star's centre is found again (${pk && pk.x.toFixed(2)}, ${pk && pk.y.toFixed(2)})`);
  const none = core.findPeak(lum, w, h, 160, 120, 8);
  ok(!none || none.snr < 6, 'dark sky stands out from nothing');
  // snapPairs from a slightly wrong solution: the star is pulled to its spot
  const truth = core.roughSolution({ centreDir: core.radecDir(84, 0), upDir: core.radecDir(84, 1), hfovDeg: 40, width: w, height: h });
  const r = core.project(truth, star('Rigel').dir);
  const lum2 = new Float32Array(w * h).fill(10);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) lum2[y * w + x] += 220 * Math.exp(-((x - r[0]) ** 2 + (y - r[1]) ** 2) / 2);
  const shifted = { ...truth, B: [truth.B[0] + 2, truth.B[1] - 1] };
  const sp = core.snapPairs(shifted, lum2, w, h, 1, [star('Rigel')], { radius: 6 });
  ok(sp.length === 1 && Math.hypot(sp[0].px[0] - r[0], sp[0].px[1] - r[1]) < 0.3, 'snap pulls a star to its own spot');
}

// ---- EXIF: the time it was taken -----------------------------------------------------------------------------------
{
  // a JPEG start, an APP1 Exif block (little-endian TIFF): IFD0 with one pointer to an Exif IFD holding DateTimeOriginal
  const date = '2026:08:12 23:41:07\0';
  const tiff = [];
  const u16 = (v) => tiff.push(v & 255, v >> 8);
  const u32 = (v) => tiff.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24);
  tiff.push(0x49, 0x49); u16(42); u32(8); // header, IFD0 at 8
  u16(1); u16(0x8769); u16(4); u32(1); u32(26); u32(0); // IFD0: ExifIFD at 26
  u16(1); u16(0x9003); u16(2); u32(20); u32(44); u32(0); // Exif IFD: DateTimeOriginal at 44
  for (const c of date) tiff.push(c.charCodeAt(0));
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 255, ...app1, 0xff, 0xda, 0, 2]);
  ok(core.exifTaken(jpeg) === '2026-08-12T23:41', `the time it was taken is read from EXIF: ${core.exifTaken(jpeg)}`);
  ok(core.exifTaken(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])) === null, 'a PNG has no EXIF here');
}

// ---- 4. the promise ------------------------------------------------------------------------------------------------
{
  const files = ['site/js/pages/skyphoto.js', 'site/js/pages/skyphoto-core.js'];
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|RTCPeerConnection|\.submit\(|FormData|navigator\.share/.test(src), `${f}: nothing that sends`);
    for (const m of src.matchAll(/fetch\(([^)]*)\)/g)) ok(/^\s*(dataUrl\(|url\()/.test(m[1]) && !/body|method/.test(m[1]), `${f}: fetch names our own file and sends no body: fetch(${m[1]})`);
    ok(!/FileReader|readAsDataURL/.test(src), `${f}: the file is read by createObjectURL, not into a string that could travel`);
    ok(!/location\.(hash|search)\s*=|history\.(push|replace)State/.test(src), `${f}: nothing goes into the address`);
  }
  const ui = readFileSync(join(ROOT, 'site/js/pages/skyphoto.js'), 'utf8');
  for (const m of ui.matchAll(/dataUrl\('([^']+)'\)/g)) ok(/^(data\/|copy\/|vendor\/)/.test(m[1]) || m[1].startsWith('../'), `fetches only our own files: ${m[1]}`);
  ok(/createObjectURL/.test(ui) && /revokeObjectURL/.test(ui), 'the photo is a blob: URL on this device, revoked when replaced');
  const srCalls = [...ui.matchAll(/sr\(([^)]*)\)/g)].map((m) => m[1]);
  ok(srCalls.every((c) => /^'track', 'share', \{ method: 'download', content_type: 'sky_photo' \}$/.test(c.trim())), `the one event is share{download, sky_photo}, nothing of the photo: ${srCalls.join(' | ')}`);
  const page = readFileSync(join(ROOT, 'scripts/seo_skyphoto.py'), 'utf8');
  ok(!/<form[^>]*action/i.test(page), 'the page has no form that posts');
}

if (failed) { console.error(`test_skyphoto: ${failed} failed`); process.exit(1); }
console.log('test_skyphoto: ok');
