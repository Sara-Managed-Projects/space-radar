// tests/test_streams.mjs -- stellar streams round the Milky Way from the galstreams library (internal #420, the deep-space
// review of 2026-11-16): the registry names the library, its licence, the commit and each file with its checksum; the baked
// points are the track files' own (first and last rows, turned to the scene's axes by an independent formula); the
// Sagittarius track passes within a few kiloparsecs of the Sagittarius dwarf's centre, GD-1's ends sit at the distances its
// adopted gradient gives; the layer is two draw calls, off at home and under the Eye exposure, in the deep-layer list, never
// at boot; the card says what is measured and what is not; the budget.
//
//   node tests/test_streams.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/deep/streams.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { DEEP_LAYERS } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
await import(join(JS, 'copy/en.facts.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { eqToEcl } = await import(join(JS, 'scene/nebulae.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const KPC_LY = 3261.5637769;
const data = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/streams.json'), 'utf8'));
const reg = readFileSync(join(ROOT, 'registry/streams.yaml'), 'utf8');
const by = Object.fromEntries(S.tracks(data).map((t) => [t.id, t]));
const meta = Object.fromEntries(data.streams.map((s) => [s.id, s]));
// an independent formula: heliocentric (ra, dec, d kpc) -> kly in ecliptic J2000 axes, through the app's own rotation
const kly = (ra, dec, d) => { const v = eqToEcl([Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)]); return v.map((c) => c * d * KPC_LY / 1000); };

// --- 1. the registry: the library, its licence and every file -------------------------------------------------------------
check(/BSD 3-Clause/.test(reg) && /read 2026-11-17/.test(reg) && /Copyright \(c\) 2017, Cecilia Mateu/.test(reg), 'the licence is named, with the notice and the day it was read');
check(/6a304c05bea7f774390a11082ea127719e99b70a/.test(reg) && /arXiv:2204\.10326/.test(reg) && /MNRAS 520, 5225/.test(reg), 'the commit and the library\'s paper are named');
check(data.streams.map((s) => s.id).join() === 'sagittarius,orphan-chenab,gd-1,palomar-5', 'four streams, Sagittarius first');
for (const s of data.streams) {
  check(reg.includes(s.sha256) && reg.includes(s.file) && reg.includes(`rows: ${s.rows}`) && reg.includes(`kept: ${s.n}`), `${s.id}: the registry names its file, checksum, row count and points kept`);
  check(s.pts.length === 3 * s.n && s.n >= 100 && s.n <= 400, `${s.id}: ${s.n} points`);
  check(/^[0-9a-f]{64}$/.test(s.sha256), `${s.id}: a checksum`);
}
check(/Ramos et al\. 2020/.test(reg) && /Antoja et al\. 2020/.test(reg) && /Koposov et al\. 2019/.test(reg) && /Price-Whelan & Bonaca 2018/.test(reg) && /Price-Whelan et al\. 2019/.test(reg), 'every track\'s paper is named');
check(/NOT measured star by star/.test(reg) && /d = 0\.05 phi1 \+ 10 kpc/.test(reg), 'GD-1\'s adopted distance is declared');
check(/Illustrative|illustrative/.test(reg) && /not drawn/i.test(reg), 'what is illustrative and what is not drawn are declared');

// --- 2. the points are the files' own -------------------------------------------------------------------------------------
for (const s of data.streams) {
  const f = kly(s.first[0], s.first[1], s.first[2]), l = kly(s.last[0], s.last[1], s.last[2]);
  const p = by[s.id].pts;
  check(f.every((v, i) => near(v, p[0][i], 0.002)), `${s.id}: the first point is the file's first row (${f.map((v) => v.toFixed(3))} vs ${p[0]})`);
  check(l.every((v, i) => near(v, p[p.length - 1][i], 0.002)), `${s.id}: the last point is the file's last row`);
  const d = Math.hypot(...p[0]) / KPC_LY * 1000;
  check(near(d, s.first[2], 0.002), `${s.id}: the first point is ${s.first[2]} kpc from the Sun (${d.toFixed(3)})`);
  check(p.every((q) => { const r = Math.hypot(...q) / KPC_LY * 1000; return r >= s.dist_kpc[0] - 0.003 && r <= s.dist_kpc[1] + 0.003; }), `${s.id}: every point lies within the file's distance range ${s.dist_kpc}`);
}

// --- 3. published numbers -------------------------------------------------------------------------------------------------
// the Sagittarius dwarf: Galactic l 5.6, b -14.2 deg, 26.0 kpc (McConnachie 2012, as the library lists it)
{
  const G2E = [[-0.0548755604162154, 0.4941094278755837, -0.8676661490190047], [-0.8734370902348850, -0.4448296299600112, -0.1980763734312015], [-0.4838350155487132, 0.7469822444972189, 0.4559837761750669]];
  const l = 5.6 * D2R, b = -14.2 * D2R;
  const g = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
  const eq = G2E.map((r) => r[0] * g[0] + r[1] * g[1] + r[2] * g[2]);
  const dwarf = eqToEcl(eq).map((c) => c * 26.0 * KPC_LY / 1000);
  const n = S.nearestTo(by.sagittarius.pts, dwarf);
  check(n.dist / KPC_LY * 1000 < 4, `the Sagittarius track passes within ${(n.dist / KPC_LY * 1000).toFixed(2)} kpc of the dwarf's centre (a few kpc)`);
  check(/26\.0 kpc/.test(reg) && /McConnachie 2012/.test(reg), 'the dwarf\'s place is cited');
  const len = S.lengthKly(by.sagittarius.pts) / KPC_LY * 1000;
  check(len > 60 && len < 200, `the Sagittarius track is ${len.toFixed(0)} kpc long on the sky (it wraps round the Galaxy)`);
}
// GD-1's distance is adopted: d = 0.05 phi1 + 10 kpc, and its track runs from phi1 -90 to +10 (5.5 and 10.5 kpc)
check(near(meta['gd-1'].first[2], 5.5, 0.02) && near(meta['gd-1'].last[2], 10.5, 0.02), `GD-1's ends are at ${meta['gd-1'].first[2]} and ${meta['gd-1'].last[2]} kpc, the gradient's 5.5 and 10.5`);
check(meta['palomar-5'].dist_kpc[0] > 18 && meta['palomar-5'].dist_kpc[1] < 23, 'Palomar 5 is 19 to 22 kpc away');
check(meta.sagittarius.dist_kpc[0] > 18 && meta.sagittarius.dist_kpc[1] < 53, 'Sagittarius is 19 to 52 kpc away');

// --- 4. the pure helpers ---------------------------------------------------------------------------------------------------
{
  const a = S.ribbonOf(by['gd-1'].pts, 200, 0.2, 7), b = S.ribbonOf(by['gd-1'].pts, 200, 0.2, 7);
  check(a.length === 600 && a.every((v, i) => v === b[i]), 'the ribbon is the same every run');
  const t = by['gd-1'].pts;
  let worst = 0;
  for (let i = 0; i < 200; i++) worst = Math.max(worst, S.nearestTo(t, [a[3 * i], a[3 * i + 1], a[3 * i + 2]]).dist);
  check(worst < 1, `every ribbon point is within ${worst.toFixed(2)} kly of the track (a hint of a band, not a cloud)`);
  check(S.fadeAt(5000) === 0 && S.fadeAt(40000) === 1 && S.fadeAt(27500) > 0.4 && S.fadeAt(27500) < 0.6, 'it fades in between 15 000 and 40 000 ly');
  check(S.lookFor(X.exposureLook('eye').milkyWay).on === false && S.lookFor(X.exposureLook('camera').milkyWay).on === true, 'off under Eye, on under Camera');
}

// --- 5. the layer in a scene -----------------------------------------------------------------------------------------------
{
  const listed = DEEP_LAYERS.find((l) => l.id === 'streams');
  check(listed && ['stellar', 'galaxy', 'local-group'].every((s) => listed.stages.includes(s)) && /streams\.js/.test(String(listed.build)), 'heroes.js DEEP_LAYERS builds it on the three outer stages');
  stage.setWorld('local-group');
  const L = S.createLayer(THREE, { data });
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e12);
  const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', stage.tMs);
  camera.position.set(sun.x, sun.y, sun.z);
  L.frame({ camera, stage, gain: 1, visible: true });
  check(!L.group.visible, 'off with the camera at home');
  camera.position.x += 100000 * LY_KM / stage.unitKm;
  L.frame({ camera, stage, gain: 1, visible: true });
  check(L.group.visible && L.stats().calls === 2, 'two draw calls for all four streams');
  check(L.stats().segments === data.streams.reduce((a, s) => a + s.n - 1, 0) && L.stats().ribbonPoints > 1000, `${L.stats().segments} track segments and ${L.stats().ribbonPoints} ribbon points`);
  // the track's Sun-to-end distance in the scene is the file's: the Sagittarius first point
  const first = by.sagittarius.pts[0];
  const world = L.group.matrix.clone().multiply(new THREE.Matrix4().makeTranslation(...first));
  const at = new THREE.Vector3().setFromMatrixPosition(world);
  check(near(at.distanceTo(new THREE.Vector3(sun.x, sun.y, sun.z)) * stage.unitKm / LY_KM, Math.hypot(...first) * 1000, 20), 'placed: a track point is its distance from the Sun in the scene');
  L.group.traverse((o) => { if (o.material && o.material.fragmentShader) for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const m of src.matchAll(/^uniform \w+ (\w+);/gm)) check(m[1] in o.material.uniforms, `${o.name}: the shader's uniform ${m[1]} is given`); });
  L.frame({ camera, stage, gain: 1, visible: true, before: true });
  check(!L.group.visible, 'off for a probe\'s before shot');
  L.frame({ camera, stage, gain: X.exposureLook('eye').milkyWay, visible: true });
  check(!L.group.visible, 'off under Eye');
  L.dispose();
  for (const [name, src] of Object.entries(S.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget/i.test(src), `${name}: no bloom, no pass, no render target`);
}

// --- 6. the card, the budget, the boot graph ---------------------------------------------------------------------------------
{
  const mw = COPY.deepFacts.records['dso-milky-way'];
  check(/Sagittarius/.test(mw.split) && /GD-1/.test(mw.split) && /galstreams/.test(mw.split) && /illustrative/i.test(mw.split), 'the Milky Way card names the streams, the library and what is illustrative');
  const bytes = statSync(join(ROOT, 'site/data/deep/streams.json')).size + statSync(join(JS, 'scene/deep/streams.js')).size;
  check(bytes <= BUDGETS.deep_streams_bytes, `the layer and its file are ${bytes} B, within ${BUDGETS.deep_streams_bytes}`);
  check(BUDGETS.deep_streams_draw_calls === 2, 'two draw calls in the budget');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/deep\/streams\.js|streams\.json/.test(main), 'nothing at boot: only scene/deep/heroes.js names the module');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(/galstreams/.test(credits) && /BSD 3-Clause/.test(credits) && /Mateu/.test(credits), 'CREDITS.md names the library, its author and its licence');
}

if (problems.length) {
  console.error(`test_streams: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_streams: ok (the registry and licence, the points are the files\' own, Sagittarius by its dwarf, GD-1\'s adopted ends, two draw calls, off at home and under Eye, the card, the budget)');
