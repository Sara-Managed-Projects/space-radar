// tests/test_plumes.mjs -- plumes where they were seen (release 1.2.0 stage W2-c, internal spec 0076;
// internal #861, #862). Holds the stage's rules:
//   no plume without a dated source: every row says who saw it, when, and the page that says so;
//   heights from the registry: no grain of an arc goes higher than the height seen, and the steepest
//     reaches it; Triton's columns stop at theirs;
//   places as published: west longitudes turned east, Enceladus's stripes about 35 km apart;
//   still under Measured and under reduced motion, deterministic from the clock under Film;
//   the card says each plume's craft and date, what is measured and what is not, and the review.
// Run: node tests/test_plumes.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PLUMES, HOTSPOTS, PLUME_WORLDS, PLUME_REVIEW, FILM_SPEED } = await import('../site/js/data/plumes.js');
const P = await import('../site/js/scene/plumes.js');

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- no plume without a dated source --------------------------------------------------------------
const WHEN = /^\d{4}(-\d{2})?(\.\.\d{4}(-\d{2})?)?$/;
check(PLUMES.length >= 7, `expected the seven plumes of the stage, found ${PLUMES.length}`);
for (const p of PLUMES) {
  check(p.seen && p.seen.by && p.seen.by.trim().length > 2, `${p.id}: no craft that saw it`);
  check(p.seen && WHEN.test(p.seen.when), `${p.id}: "${p.seen && p.seen.when}" is not a date (YYYY, YYYY-MM or a span)`);
  check(p.heightKm > 0, `${p.id}: no height`);
  check(PLUME_WORLDS[p.world], `${p.id}: on ${p.world}, which has no gravity row`);
}
for (const h of HOTSPOTS) {
  check(h.world === 'io', `hot spot ${h.id} is not on Io`);
  check(h.seen && h.seen.by && WHEN.test(h.seen.when), `hot spot ${h.id}: not dated`);
}
// The registry itself: every plume row quotes its source and its place (`says:`), with the day it was read.
{
  const yaml = readFileSync(join(ROOT, 'registry/plumes.yaml'), 'utf8');
  const rows = yaml.split(/\n  - id: /).slice(1).filter((r) => /\n    kind: /.test(r));
  check(rows.length === PLUMES.length, `registry rows ${rows.length} vs mirror ${PLUMES.length}`);
  for (const r of rows) {
    const id = r.split('\n')[0].trim();
    check(/\n    source: \{url: "https:[^"]+", read: \d{4}-\d{2}-\d{2}, says: "[^"]{20,}"\}/.test(r), `${id}: its source is not quoted with the day it was read`);
    check(/\n    place: \{url: "https:[^"]+", read: \d{4}-\d{2}-\d{2}, says: "[^"]{10,}"\}/.test(r), `${id}: its place is not quoted`);
  }
  check(/review:\n  by: "Space Radar maintainers"/.test(yaml), 'the review is not the maintainers\'');
  check(PLUME_REVIEW.by === 'Space Radar maintainers', 'PLUME_REVIEW.by');
}
// The stage's plumes, and no other (no plume invented): a new one is a decision, made here.
check(JSON.stringify(PLUMES.map((p) => p.id).sort()) === JSON.stringify(['enceladus-south', 'hili', 'mahilani', 'pele', 'pillan', 'prometheus', 'tvashtar']),
  `the plumes are ${PLUMES.map((p) => p.id).join(', ')}`);

// ---- places as published ----------------------------------------------------------------------------
const byId = Object.fromEntries(PLUMES.map((p) => [p.id, p]));
check(near(byId.pele.lon, 104.7, 1e-6) && byId.pele.lat === -18.7, `Pele at ${byId.pele.lat}, ${byId.pele.lon} E (255.3 W is 104.7 E)`);
check(near(byId.tvashtar.lon, -123.53, 1e-6), `Tvashtar at ${byId.tvashtar.lon} E`);
check(byId.hili.lon === 28 && byId.hili.lat === -57, 'Hili at 57 S 28 E');
{
  const v = P.placeVector(0, 0);
  check(near(v[0], 1, 1e-12) && near(v[1], 0, 1e-12), 'longitude 0 faces the planet (+X), as scene/worlds.js faceVector');
  const e = P.placeVector(90, 0);
  check(near(e[2], -1, 1e-12), 'east is toward -Z');
  const w = P.westOf(30);
  const east = [P.placeVector(30.001, 0), P.placeVector(29.999, 0)];
  const d = [east[0][0] - east[1][0], east[0][1] - east[1][1], east[0][2] - east[1][2]];
  check(w[0] * d[0] + w[1] * d[1] + w[2] * d[2] < 0, 'westOf points west');
}
// Enceladus's stripes, rebuilt from the gazetteer's centres and lengths: about 35 km apart (Hemingway et al.).
{
  const enc = byId['enceladus-south'];
  const R = PLUME_WORLDS.enceladus.radiusKm;
  const xy = ([lat, lon]) => { const r = R * (90 + lat) * Math.PI / 180; return [r * Math.cos(lon * Math.PI / 180), r * Math.sin(lon * Math.PI / 180)]; };
  const mids = enc.stripes.map((s) => { const a = xy(s.a); const b = xy(s.b); return { a, b, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len: Math.hypot(b[0] - a[0], b[1] - a[1]) }; });
  const base = mids[2];
  const u = [(base.b[0] - base.a[0]) / base.len, (base.b[1] - base.a[1]) / base.len];
  const off = mids.map((s) => (s.m[0] - base.a[0]) * -u[1] + (s.m[1] - base.a[1]) * u[0]);
  for (let i = 1; i < off.length; i++) check(near(Math.abs(off[i] - off[i - 1]), 35, 9), `stripes ${i - 1} and ${i} are ${Math.abs(off[i] - off[i - 1]).toFixed(1)} km apart (about 35)`);
  check(enc.stripes.reduce((s, x) => s + x.jets, 0) === 101, 'the 101 jets of Porco et al. 2014');
}

// ---- heights from the registry ------------------------------------------------------------------
for (const world of Object.keys(PLUME_WORLDS)) {
  const G = P.particlesFor(world);
  check(G && G.count > 0, `${world}: no grains`);
  if (!G) continue;
  const tops = {};
  for (let i = G.hot; i < G.count; i++) {
    const kind = G.shape[i * 4];
    const n = [G.vent[i * 3], G.vent[i * 3 + 1], G.vent[i * 3 + 2]];
    if (kind === 3) { tops.column = Math.max(tops.column || 0, G.motion[i * 4]); continue; }
    const d = [G.dir[i * 3], G.dir[i * 3 + 1], G.dir[i * 3 + 2]];
    const up = G.motion[i * 4] * (n[0] * d[0] + n[1] * d[1] + n[2] * d[2]);
    const apex = (up * up) / (2 * G.g);
    tops[kind] = Math.max(tops[kind] || 0, apex);
  }
  const mine = PLUMES.filter((p) => p.world === world);
  const highest = Math.max(...mine.map((p) => p.heightKm));
  for (const [k, top] of Object.entries(tops)) check(top <= highest * 1.0001, `${world}: a grain of kind ${k} tops out at ${top.toFixed(1)} km, above the ${highest} km seen`);
  check(Object.values(tops).some((top) => top >= highest * 0.97), `${world}: no grain reaches the ${highest} km seen (${JSON.stringify(tops)})`);
  check(JSON.stringify(G.plumes.slice().sort()) === JSON.stringify(mine.map((p) => p.id).sort()), `${world}: drawn ${G.plumes} vs registry`);
}
{
  // Pele's canopy: fall-out about 600 km out, as its 1 200 km ring.
  const b = P.ballisticOf(300, 38, 12, PLUME_WORLDS.io.gKmS2);
  check(near(b.rangeKm, 609, 15), `Pele's widest arc lands ${b.rangeKm.toFixed(0)} km out`);
  const top = P.ballisticOf(300, 12, 12, PLUME_WORLDS.io.gKmS2);
  check(near(top.apexKm, 300, 1e-6), 'the steepest grain tops out at the height seen');
  check(near(Math.sqrt(2 * PLUME_WORLDS.io.gKmS2 * 300), 1.04, 0.03), 'Pele-type launch near 1 km/s (McEwen & Soderblom 1983)');
}

// ---- still under Measured and reduced motion; Film from the clock ---------------------------------
{
  const t0 = Date.UTC(2026, 9, 15, 12);
  for (const dt of [0, 1000, 60000, 3.6e6]) {
    check(P.motionTime(t0 + dt, 'measured', false) === 0, 'Measured is still');
    check(P.motionTime(t0 + dt, 'film', true) === 0, 'reduced motion is still');
  }
  check(P.motionTime(t0, 'film', false) === P.motionTime(t0, 'film', false), 'the same clock gives the same frame');
  check(P.motionTime(t0 + 1000, 'film', false) !== P.motionTime(t0, 'film', false), 'Film moves with the clock');
  check(near(P.motionTime(t0 + 1000, 'film', false) - P.motionTime(t0, 'film', false), FILM_SPEED, 1e-6) || P.motionTime(t0 + 1000, 'film', false) < P.motionTime(t0, 'film', false), `one clock second is ${FILM_SPEED} motion seconds`);
  check(P.motionTime(t0, 'film', false, 1e4) === null, 'a clock fast enough to shimmer holds the grains');
  check(P.motionTime(t0, 'film', false) < 20000, 'the motion clock is wrapped for float32');
  check(P.UNDER_MEASURED.plumes === 'still', 'UNDER_MEASURED.plumes is still');
}

// ---- the card --------------------------------------------------------------------------------------
{
  const io = P.lineFor('io', 'film', false);
  for (const w of ['Pele, about 300 km high (Voyager 1, March 1979)', 'Tvashtar, about 330 km high (New Horizons, March 2007)', 'Galileo', '1979 to 1997', 'measured', 'model', 'stretched', 'Loki Patera', 'times faster', 'Not yet reviewed by an astronomer']) {
    check(io && io.includes(w), `Io's line lacks "${w}": ${io}`);
  }
  const ioM = P.lineFor('io', 'measured', false);
  check(ioM && ioM.includes('held still') && !ioM.includes('times faster'), `Io's line under Measured: ${ioM}`);
  const enc = P.lineFor('enceladus', 'film', false);
  check(enc && enc.includes('Cassini, November 2005') && enc.includes('101 jets'), `Enceladus's line: ${enc}`);
  const tri = P.lineFor('triton', 'film', false);
  check(tri && tri.includes('Voyager 2, August 1989') && tri.includes('west'), `Triton's line: ${tri}`);
  check(P.lineFor('europa', 'film', false) === null, 'Europa has no plume line');
}

// ---- the shader keeps to the house's contract ---------------------------------------------------------
{
  const { VERT, FRAG } = P.SHADERS;
  check(VERT.includes('#include <logdepthbuf_vertex>') && FRAG.includes('#include <logdepthbuf_fragment>'), 'logarithmic depth');
  check(FRAG.includes('#include <tonemapping_fragment>'), 'the renderer\'s exposure (tone mapping)');
  check(!/BloomPass|WebGLRenderTarget|EffectComposer/.test(VERT + FRAG + readFileSync(join(ROOT, 'site/js/scene/plumes.js'), 'utf8')), 'no bloom, pass or render target');
}

// ---- budgets (registry/budgets.yaml, design section 4) -----------------------------------------------
{
  const { BUDGETS } = await import('../site/js/data/budgets.js');
  const src = readFileSync(join(ROOT, 'site/js/scene/plumes.js'), 'utf8');
  check((src.match(/new THREE\.(Points|Mesh|Line|Sprite)\(/g) || []).length === BUDGETS.plumes_draw_calls, `one Points draw per moon (budget plumes_draw_calls ${BUDGETS.plumes_draw_calls})`);
  for (const world of Object.keys(PLUME_WORLDS)) {
    const bytes = P.particlesFor(world).count * (3 + 3 + 4 + 4) * 4;
    check(bytes <= BUDGETS.plumes_gpu_bytes, `${world}: ${bytes} B of grains on the GPU, over plumes_gpu_bytes ${BUDGETS.plumes_gpu_bytes}`);
  }
  const data = readFileSync(join(ROOT, 'site/js/data/plumes.js')).length;
  check(data <= BUDGETS.plumes_data_bytes, `data/plumes.js is ${data} B, over plumes_data_bytes ${BUDGETS.plumes_data_bytes}`);
}

if (problems.length) {
  console.error(`test_plumes: ${problems.length} problem(s)\n  - ` + problems.join('\n  - '));
  process.exit(1);
}
console.log(`test_plumes: ok (${PLUMES.length} plumes, ${HOTSPOTS.length} hot spots; Io ${P.particlesFor('io').count} grains, Enceladus ${P.particlesFor('enceladus').count}, Triton ${P.particlesFor('triton').count})`);
