// tests/test_hero_r14neb.mjs -- the nebula heroes of release 1.4.0 stage r14-neb-b, which replace the last photographs
// laid on the sky for them (Ivan, 2026-10-26: "no photos only realistic 3ds"): the Dumbbell (M27) and the Southern Ring
// (NGC 3132) on scene/deep/ring.js, and the Pleiades' reflection nebula (M45) on scene/deep/reflection.js. Held: each
// profile's sources, review and credits; the light maps are their bakes and small; the published geometry; FROM OUR
// SIDE EACH MODEL IS ITS PHOTOGRAPH (the column on our line carries the picture's light whatever the steps); turned it
// is finite and never brighter than the picture; the Pleiades' stars are where the app draws them; one to three draw
// calls, additive, in the opaque list; the card's words block.
//
//   node tests/test_hero_r14neb.mjs
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const R = await import(join(JS, 'scene/deep/ring.js'));
const F = await import(join(JS, 'scene/deep/reflection.js'));
const C = await import(join(JS, 'scene/clusters.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const pa = (v) => ((Math.atan2(-v[0], v[1]) / D2R) + 360) % 360;
const hero = async (id) => (await import(join(JS, `data/hero-${id}.js`))).HERO;
const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// --- 1. the profiles: sources, the review, credits; the light maps are their bakes, small, their peaks the manifests' --
const RING_IDS = ['m27', 'southern-ring'];
for (const id of [...RING_IDS, 'm45']) {
  const H = await hero(id);
  check(H.stage === 'r14-neb-b' && H.shipped === true && H.drawn.length === 1 && H.drawn[0] === 'reconstruction', `${id}: shipped by r14-neb-b as a reconstruction`);
  check(H.review.by === 'Space Radar maintainers' && /^2026-10-2/.test(String(H.review.date)) && /not yet/.test(H.review.astronomer || ''), `${id}: signed by the maintainers, no astronomer yet (spec 0075 §14.4)`);
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(H.review[k] || '').length > 30, `${id}: review.${k} is written`);
  check(H.credits.length >= 2 && H.credits.some((c) => /CC BY 4\.0/.test(c)) && H.sources.length >= 3, `${id}: credit lines (the photograph's licence among them) and sources`);
  const light = H.layers.find((l) => l.part === 'light');
  check(light && light.file && statSync(join(ROOT, light.file)).size < 40000, `${id}: its light map is small`);
  const rec = records.find((r) => r.id === H.record);
  check(!!rec, `${id}: the record ${H.record} is on the map`);
}
for (const id of RING_IDS) {
  const H = await hero(id);
  const light = H.layers.find((l) => l.part === 'light');
  const m = JSON.parse(readFileSync(join(ROOT, dirnameOf(light.file), 'manifest.json'), 'utf8'));
  check(m.sha256 === sha(join(ROOT, light.file)) && m.from_sha256 === sha(join(ROOT, m.from)), `${id}: the light map is the bake of the photograph (scripts/build_deep_ring.py --check)`);
  check(Math.abs(R.peakOf(H) - m.peak_lum_p99) < 1e-9, `${id}: the cap is the light map's own brightest (${R.peakOf(H)} against ${m.peak_lum_p99})`);
  check(R.lightUrlOf(H) === `../../../${light.file.replace(/^site\//, '')}` && R.lightRowOf(H) && R.lightRowOf(H).id === light.row, `${id}: the module reads the profile's own light map and photograph row`);
}
{
  const sheets = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/sheets/manifest.json'), 'utf8'));
  const row = sheets.files['m45-light.webp'];
  check(row && row.sha256 === sha(join(ROOT, 'site/images/deep/sheets/m45-light.webp')), 'm45: the light map is its bake (scripts/build_deep_sheets.py --check)');
  const H = await hero('m45');
  check(Math.abs(H.layers.find((l) => l.part === 'light').peak - row.peak_p99) < 1e-9, 'm45: the cap is the light map\'s own brightest');
  check(statSync(join(ROOT, 'site/images/deep/ring/ring-light.webp')).size === JSON.parse(readFileSync(join(ROOT, 'site/images/deep/ring/manifest.json'), 'utf8')).bytes, 'M57\'s light map is W3-b\'s, untouched');
}
function dirnameOf(p) { return p.split('/').slice(0, -1).join('/'); }

// --- 2. the ring heroes' geometry: the published (or measured) axes --------------------------------------------------
{
  const g = R.geometryOf(await hero('m27'));
  check(g.point && g.edgeP === 0.3 && Math.abs(g.A - g.B) < 1e-12, 'M27: a round ring in its own plane, its window read at each point, its rims soft');
  check(Math.abs(Math.acos(Math.abs(g.axis[2])) / D2R - 78) < 1e-6, `M27: the ring's axis 78° from our line (nearly edge on): ${(Math.acos(Math.abs(g.axis[2])) / D2R).toFixed(2)}°`);
  check(Math.abs((pa(g.e1) % 180) - 41) < 1e-6, `M27: the waist's long axis at PA 41° (measured on the photograph): ${pa(g.e1).toFixed(2)}`);
  check(Math.abs(Math.hypot(g.e1[0], g.e1[1]) - 1) < 1e-9, 'M27: the line of nodes lies in the plane of the sky (its in-plane radius is its apparent one)');
  const s = R.geometryOf(await hero('southern-ring'));
  check(!s.point && Math.abs(Math.acos(Math.abs(s.axis[2])) / D2R - 22.5) < 1e-6 && Math.abs((pa(s.axis) % 360) - 140) < 1e-6, 'the Southern Ring: its axis 22.5° from our line (Kastner et al. 2024: 15 to 30), toward PA 140');
  check(s.w[2] > 0 && s.Ro > s.Ri && s.bound >= s.Ro, 'the Southern Ring: its molecular halo carries light, inside the bounding ellipsoid');
}

// --- 3. FROM OUR SIDE EACH MODEL IS ITS PHOTOGRAPH ---------------------------------------------------------------------
for (const id of RING_IDS) {
  const g = R.geometryOf(await hero(id));
  const map = R.columnMap(g, 128);
  let worst = 0, mean4 = 0, n4 = 0, bad = 0;
  for (let i = 0; i < 160; i++) {
    const r = Math.sqrt(rand()) * g.bound * 0.95, a = rand() * 2 * Math.PI, x = r * Math.cos(a), y = r * Math.sin(a);
    const c = R.columnsAt(g, x, y);
    if (!(g.w[0] * c[0] + g.w[1] * c[1] + g.w[2] * c[2] > 1e-5)) continue;
    const ro = [x, y, 3 * g.bound], rd = [0, 0, -1], L = () => [0.02, 0.02, 0.02];
    worst = Math.max(worst, Math.abs(R.columnJs(g, ro, rd, 24, 0.5, L, null, 1).rgb[0] / 0.02 - 1));
    for (let k = 0; k < 4; k++) { mean4 += R.columnJs(g, ro, rd, 4, rand(), L, map, 1).rgb[0] / 0.02 - 1; n4++; }
  }
  check(worst < 0.05, `${id}: on our line the column IS the photograph's light: ${(worst * 100).toFixed(2)} % at worst (24 samples)`);
  check(Math.abs(mean4 / n4) < 0.03, `${id}: and with 4 samples through the tabulated columns, on average: ${(100 * mean4 / n4).toFixed(2)} %`);
  // turned: finite, non-negative, under the photograph's brightest
  const peak = R.peakOf(await hero(id));
  for (let i = 0; i < 300; i++) {
    const th = rand() * Math.PI, ph = rand() * 2 * Math.PI, d = 3 * g.bound;
    const ro = [d * Math.sin(th) * Math.cos(ph), d * Math.sin(th) * Math.sin(ph), d * Math.cos(th)];
    const rd = ro.map((v) => -v / d);
    const { rgb } = R.columnJs(g, ro, rd, 8, rand(), () => [0.9, 0.7, 0.8], map, peak);
    if (!rgb.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) bad++;
  }
  check(bad === 0, `${id}: 300 rays from every side: every colour finite and under white (${bad} bad)`);
}

// --- 4. the Pleiades: the stars where the app draws them; the photograph on our line; never brighter --------------------
{
  const H = await hero('m45');
  const raw = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
  const count = raw.readUInt32LE(8), head = raw.length - count * 24;
  const pos = new Float32Array(3 * count);
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) pos[3 * i + k] = raw.readFloatLE(head + 24 * i + 4 * k);
  const { drawLy } = C.drawnPositions(pos, count);
  const rec = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'm45');
  const P = rec.posLy, dist = Math.hypot(...P), u = P.map((v) => v / dist);
  const OB = 23.4392911 * D2R;
  const ecl = (ra, dec) => { const a = ra * D2R, d = dec * D2R, x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d); return [x, y * Math.cos(OB) + z * Math.sin(OB), -y * Math.sin(OB) + z * Math.cos(OB)]; };
  const stars = H.layers.find((l) => l.part === 'light').illuminate.stars;
  let worst = 0;
  for (const s of stars) {
    const e = ecl(s.ra_deg, s.dec_deg);
    let best = -1, bc = -2;
    for (let i = 0; i < count; i++) { const r = Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); const c = (pos[3 * i] * e[0] + pos[3 * i + 1] * e[1] + pos[3 * i + 2] * e[2]) / r; if (c > bc) { bc = c; best = i; } }
    const rel = [0, 1, 2].map((k) => drawLy[3 * best + k] - P[k]);
    const z = -(rel[0] * u[0] + rel[1] * u[1] + rel[2] * u[2]);
    worst = Math.max(worst, Math.abs(z - s.z_ly));
  }
  check(stars.length === 9 && worst < 0.01, `M45: the nine stars' depths are where scene/clusters.js draws them (worst ${worst.toFixed(4)} ly)`);
  const g = F.geometryOf(H);
  const map = F.columnMap(g, 96);
  let err = 0, n = 0, worstB = 0;
  for (let i = 0; i < 80; i++) {
    const [x, y] = g.uv.xyOf(0.1 + 0.8 * rand(), 0.1 + 0.8 * rand());
    let s = 0;
    for (let k = 0; k < 8; k++) s += F.marchJs(g, [x, y, g.box.max[2] + 50], [0, 0, -1], 16, (k + rand()) / 8, () => [0.1, 0.1, 0.1], null)[0];
    err += Math.abs(s / 8 / 0.1 - 1); n++;
  }
  check(err / n < 0.08, `M45: on our line the march carries the photograph's light (mean error ${(100 * err / n).toFixed(1)} % over 8 offsets of 16 samples)`);
  for (let i = 0; i < 200; i++) {
    const th = rand() * Math.PI, ph = rand() * 2 * Math.PI, d = 30;
    const ro = [d * Math.sin(th) * Math.cos(ph), d * Math.sin(th) * Math.sin(ph), d * Math.cos(th)];
    const c = F.capLight(F.marchJs(g, ro, ro.map((v) => -v / d), 16, rand(), () => [0.3, 0.4, 0.9], map), g.peak);
    const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    if (!c.every((v) => Number.isFinite(v) && v >= 0)) worstB = Infinity; else worstB = Math.max(worstB, y);
  }
  check(worstB <= g.peak + 1e-9, `M45: from every side finite and never brighter than the photograph (largest ${worstB.toFixed(3)} against ${g.peak})`);
  check(F.phaseFactor(g.phase, [1, 0, 1], [0, 0, 0], [0, 0, -1]) === 1 || Math.abs(F.phaseFactor(g.phase, [1, 0, 1], [0, 0, 0], [0, 0, -1]) - 1) < 1e-12, 'M45: the phase factor is 1 on our line');
  const f = F.SHADERS.fragment;
  check(/uniform vec4 uStars\[ MAX_STARS \]/.test(f) && /slabAt\( p\.xy \)/.test(f) && /if \( y > uPeak \) col \*= uPeak \/ y;/.test(f) && /pixelHash\( gl_FragCoord\.xy \)/.test(f) && !/uTime/.test(f), 'M45: the fragment marches the slab, lit by the stars, capped at the photograph, offset per pixel, no clock');
  check(F.samplesFor({ tier: 0 }) === 6 && F.samplesFor({ tier: 1, steps: 0 }) === 16 && F.samplesFor({ tier: 2, steps: 48 }) === 32, 'M45: 6 samples on T0, 16 at level 2, up to 32');
}

// --- 5. the heroes as the coordinator builds them: meshes, blends, card, dispose ----------------------------------------
stage.setWorld('stellar');
for (const [id, mod, block, meshesWanted] of [['m27', R, 'deepRing', 3], ['southern-ring', R, 'deepRing', 3], ['m45', F, 'r12Dust', 1]]) {
  const H = JSON.parse(JSON.stringify(await hero(id)));
  const rec = records.find((r) => r.id === H.record);
  const h = mod.createHero(THREE, { profile: H, record: rec, gas: G, quality: () => ({ tier: 0 }) });
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  h.group.matrixAutoUpdate = false;
  h.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 20 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  h.setLevel(2, 1);
  h.frame({ camera, rPx: 250, steps: 16, look: 'film', dtMs: 16, photo: 0, tier: 0, gain: 1 });
  check(H.shipped === true && h.stats().share === 1, `${id}: drawn on T0 too (no photograph to fall back on): ${JSON.stringify(h.stats()).slice(0, 120)}`);
  h.frame({ camera, rPx: 250, steps: 16, look: 'film', dtMs: 16, photo: 1, tier: 1, gain: 1 });
  check(h.stats().share === 0, `${id}: with the compare slider at the photograph, the model gives way`);
  const meshes = [];
  h.group.traverse((o) => {
    if (o.isMesh || o.isPoints) meshes.push(o.name);
    if (!o.material) return;
    const m = o.material;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${id} ${o.name}: opaque list, not tone mapped, no depth write`);
    const over = m.blending === THREE.CustomBlending;
    check(m.blending === THREE.AdditiveBlending || over, `${id} ${o.name}: additive or premultiplied over`);
  });
  check(meshes.length === meshesWanted, `${id}: ${meshesWanted} draw call(s) at most (${meshes.join(', ')})`);
  check(h.card && h.card.copy === block, `${id}: its card reads the words block ${block}`);
  check(h.stats().bytes < 2000000, `${id}: under 2 MB on the GPU (${h.stats().bytes} B)`);
  h.dispose();
  check(!h.group.parent, `${id}: disposed`);
}

if (problems.length) { console.log('r14-neb-b nebula heroes FAILED:'); for (const p of problems) console.log('  ' + p); process.exit(1); }
console.log('r14-neb-b nebula heroes ok: M27 and the Southern Ring on ring.js, the Pleiades on reflection.js; each is its photograph from our side');
