// tests/test_hero_orion.mjs -- the Orion Nebula as a hero (internal spec 0076 stage W1-a, internal #782): its parts
// come from the registry with their sources; the Trapezium's four stars at SIMBAD's places; the front 0.2 pc behind
// theta1 Ori C and in front of the cloud, the Trapezium in front of the front; from our side the model is the
// photograph within 5 %; finite from every side, dark from behind; crisp (the same picture at 8 and 32 steps, no
// bands); the steps by tier; the photograph and the point glow handed over by their own shares; nothing changed or
// moving under Measured; the cluster's summed light the same at every tier; the budgets.
//
//   node tests/test_hero_orion.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const H = await import(join(JS, 'scene/deep/orion.js'));
const { HERO } = await import(join(JS, 'data/hero-orion.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const fileBuf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

// --- 1. the profile: every part with its source; shipped under the review policy -------------------------------
const parts = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));
{
  for (const k of ['front', 'm43', 'cloud', 'veil', 'trapezium', 'onc']) check(parts[k] && String(parts[k].source || '').length > 20, `the profile has its ${k}, with a source`);
  check(/Wen & O'Dell 1995, ApJ 438, 784/.test(parts.front.source) && /O'Dell 2001, ARA&A 39, 99/.test(parts.front.source), 'the front is Wen & O\'Dell (1995) and O\'Dell (2001)\'s (the stage\'s acceptance)');
  check(parts.front.star_in_front_pc === 0.2 && /0\.2 pc/.test(parts.front.source), 'theta1 Ori C 0.2 pc in front of the front, sourced');
  check(/1-3 pc/.test(parts.veil.source) && parts.veil.z_ly > 3.26 && parts.veil.z_ly < 9.8, `the Veil 1 to 3 pc in front of the star (Abel et al. 2004): drawn at ${parts.veil.z_ly} ly`);
  check(parts.onc.core_pc >= 0.16 && parts.onc.core_pc <= 0.21 && /0\.16-0\.21 pc/.test(parts.onc.source), 'the cluster\'s core within Hillenbrand & Hartmann\'s 0.16-0.21 pc');
  check(HERO.shipped === true && HERO.review.by === 'Space Radar maintainers' && HERO.review.date, 'shipped under the lead\'s policy: signed by the maintainers, dated (spec 0075 design 14.4)');
  check(/not yet/.test(HERO.review.astronomer || ''), 'the review says no astronomer has reviewed it yet');
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `review.${k} is written`);
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'reconstruction' && HERO.credits.length >= 3, 'it draws a reconstruction, with its credit lines');
  check(HERO.children.length === 1 && HERO.children[0] === 'dso-m43', 'M43 is drawn by it (no holder of its own)');
  check(HEROES.some((h) => h.id === 'orion' && h.record === 'dso-m42'), 'the hero list has its line (the lead\'s slot)');
  check(HERO.colours.enhanced && HERO.colours.enhanced.mode === 'enhanced' && HERO.colours.enhanced.under === 'deep', 'Deep is declared enhanced');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const sect = credits.slice(credits.indexOf('### Orion (0076 W1-a)'), credits.indexOf('### The CMB map (0076 W1-b)'));
  for (const s of ['ApJ 438, 784', 'ARA&A 39, 99', 'AJ 137, 367', 'ApJ 609, 247', 'ApJ 492, 540', 'eso1723a', 'CC BY 4.0', 'SIMBAD', 'reconstructed', 'ENHANCED']) check(sect.includes(s), `CREDITS.md's Orion section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  const block = words.slice(words.indexOf('deepOrion: {'), words.indexOf('// 0076 W1-c'));
  check(/reconstructed/i.test(block) && /not yet been reviewed by an astronomer/.test(block), 'the card says reconstructed and that no astronomer has reviewed it (copy/en.later.js deepOrion)');
  check(/'dso-m42': \[/.test(block) && /'dso-m43': \[/.test(block), 'both records have their rows on the card');
  check(H.COPY_BLOCK === 'deepOrion' && H.DRAWN['dso-m42'][0] === 'reconstruction', 'the hero hands the coordinator its words block and classes (stage c\'s `card` hook)');
}

// --- 2. the geometry: the photograph's place; the Trapezium at SIMBAD's places ----------------------------------
const g = H.geometryOf();
{
  const row = { ra_deg: 83.78771, dec_deg: -5.48198, width_arcmin: 59.95, height_arcmin: 46.56, north_deg: 0.28 };
  // the star on the picture: 1.85' east and 5.54' north of its measured centre
  check(near(g.uv.u0, 0.5 - 1.846 / 59.95, 0.0015) && near(g.uv.v0, 0.5 + 5.537 / 46.56, 0.0015), `theta1 Ori C on the light map at (${g.uv.u0.toFixed(4)}, ${g.uv.v0.toFixed(4)}): the picture's measured centre is south-west of it`);
  const a = H.uvOf(row, [83.8186096, -5.3897005], 1344);
  const [x, y] = a.xyOf(0.5, 0.5);
  check(near(a.u0 + x * a.ux[0] + y * a.uy[0], 0.5, 1e-9) && near(a.v0 + x * a.ux[1] + y * a.uy[1], 0.5, 1e-9), 'uvOf and its inverse agree');
  check(near(g.lyPerArcmin, 1344 * Math.PI / 10800, 1e-12), 'arcminutes at the record\'s distance');
  // each Trapezium star: its offset from theta1 Ori C equals the angular separation SIMBAD's places give
  const sep = (r1, d1, r2, d2) => { const s = Math.sin, c = Math.cos; const v = s(d1 * D2R) * s(d2 * D2R) + c(d1 * D2R) * c(d2 * D2R) * c((r1 - r2) * D2R); return Math.acos(Math.min(1, v)) / D2R * 3600; };
  const simbad = { A: [83.8159392, -5.3873152], B: [83.8172249, -5.3852179], C: [83.8186096, -5.3897005], D: [83.8219060, -5.3879363] };
  const byId = Object.fromEntries(g.stars.map((s) => [s.id.split(' ')[1] === 'Ori' ? s.id.split(' ')[2] : s.id, s]));
  for (const k of ['A', 'B', 'C', 'D']) {
    const s = byId[k];
    const want = sep(simbad[k][0], simbad[k][1], ...simbad.C);
    const got = Math.hypot(s.pos[0], s.pos[1]) / g.lyPerArcmin * 60;
    check(s && near(got, want, 0.05) && s.pos[2] === 0, `theta1 Ori ${k} ${got.toFixed(2)}" from C (SIMBAD: ${want.toFixed(2)}"), in C's plane`);
  }
  check(byId.D.pos[0] < 0 && byId.A.pos[0] > 0, 'D is east of C (x is west), A west of it: the Trapezium is not mirrored');
  check(g.stars.length === 5 && /NU Ori/.test(g.stars[4].id), 'and NU Ori, M43\'s star');
  check(g.box.max[2] >= g.veilZ && g.slabTop < g.veilZ && g.box.min[2] < -g.d0 - g.cloudLy, 'the box holds the cloud, the front and the Veil; the march stops under the Veil');
}

// --- 3. the front's map: 0.2 pc behind the star, the Trapezium in front, smooth enough for our line -------------
const front = H.readFront(fileBuf('site/data/deep/orion-front.bin'));
const at = (x, y) => H.sampleFront(front, g.uv.u0 + x * g.uv.ux[0] + y * g.uv.uy[0], g.uv.v0 + x * g.uv.ux[1] + y * g.uv.uy[1]);
{
  check(front.nx === 240 && front.ny === 186, `the front's grid is 240 x 186 (${front.nx} x ${front.ny})`);
  check(near(at(0, 0)[0], -g.d0, 0.03), `the front ${(-at(0, 0)[0]).toFixed(3)} ly behind theta1 Ori C (0.2 pc = ${g.d0.toFixed(3)} ly, O'Dell et al. 2009)`);
  for (const s of g.stars) check(s.pos[2] > at(s.pos[0], s.pos[1])[0] + 0.15, `${s.id} stands in front of the front (${s.pos[2].toFixed(2)} over ${at(s.pos[0], s.pos[1])[0].toFixed(2)} ly)`);
  let maxZ = -Infinity, minZ = Infinity, maxSlope = 0, tauOut = 0, cBad = 0;
  const cx = 1 / (front.nx * g.uv.ux[0]), cy = 1 / (front.ny * g.uv.uy[1]); // a cell, ly
  for (let j = 1; j < front.ny - 1; j++) for (let i = 1; i < front.nx - 1; i++) {
    const k = (j * front.nx + i) * 4, d = front.data;
    maxZ = Math.max(maxZ, d[k]); minZ = Math.min(minZ, d[k]);
    const zx = (d[k + 4] - d[k - 4]) / (2 * cx), zy = (d[k + 4 * front.nx] - d[k - 4 * front.nx]) / (2 * cy);
    maxSlope = Math.max(maxSlope, Math.hypot(zx, zy));
    if (!(d[k + 1] >= 0 && d[k + 1] <= 1.001)) cBad += 1;
    // the Dark Bay is north-east of the star; nowhere else does the Veil darken
    const u = (i + 0.5) / front.nx, v = (j + 0.5) / front.ny;
    const [x, y] = g.uv.xyOf(u, v);
    const east = -x / g.lyPerArcmin, north = y / g.lyPerArcmin;
    if (Math.hypot((east - 5) / 4.5, (north - 1.5) / 2.5) > 1.2) tauOut = Math.max(tauOut, d[k + 2]);
  }
  check(minZ >= -g.d0 - 0.05 && maxZ < g.slabTop && maxZ < g.veilZ, `the front between ${minZ.toFixed(2)} and ${maxZ.toFixed(2)} ly: never deeper than at the star, always under the Veil and in the march's slab`);
  check(maxSlope < 3, `its slope stays under 3 (${maxSlope.toFixed(2)}): on our line no part of it is dimmed by the limb`);
  check(cBad === 0 && tauOut < 0.01, `the cloud's column within 0 to 1, the Veil's Dark Bay only where it is (${tauOut.toFixed(3)} outside it)`);
  const m = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/orion/manifest.json'), 'utf8'));
  check(m.light.size[0] === 640 && m.depth.grid[0] === 240 && /eso1723a/.test(m.credit), 'the manifest names its photograph and grid');
}

// --- 4. FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH (within 5 %); finite from every side; dark from behind --------
// A light like the picture's: smooth, coloured, up to 0.95, with a few sharp filaments.
const light = (u, v) => { const r = Math.hypot(u - 0.47, v - 0.62); const fil = 0.5 + 0.5 * Math.sin(u * 90) * Math.sin(v * 70); return [0.9 * Math.exp(-r * 4) + 0.05 * fil, 0.7 * Math.exp(-r * 5) + 0.04, 0.8 * Math.exp(-r * 3) * (0.6 + 0.4 * fil)].map((c) => Math.min(0.95, c)); };
{
  let worst = 0, worst8 = 0, n = 0;
  for (let k = 0; k < 400; k++) {
    const u = 0.15 + 0.7 * ((k * 0.618034) % 1), v = 0.15 + 0.7 * ((k * 0.381966 + 0.2) % 1);
    const cov = H.coverAt(u, v);
    if (cov < 0.05) continue;
    const [x, y] = g.uv.xyOf(u, v);
    const want = light(u, v).map((c) => c * cov);
    const err = (steps, j) => { const c = H.columnJs(g, front, [x, y, 60], [0, 0, -1], { n: steps, j, light }).rgb; return Math.max(...c.map((val, i) => Math.abs(val - want[i]) / Math.max(0.05, want[i]))); };
    worst = Math.max(worst, err(12, 0.37), err(32, 0.81));
    worst8 = Math.max(worst8, err(8, 0.11), err(8, 0.93));
    n += 1;
  }
  check(n > 150 && worst < 0.05 && worst8 < 0.05, `on our line the column is the photograph's within 5 % at 12, 32 and T0's 8 steps (worst ${(worst * 100).toFixed(2)} %, ${(worst8 * 100).toFixed(2)} % at 8; ${n} places): at arrival the model IS the photograph`);
  // from everywhere: finite, transmission in 0..1, the limb capped
  let bad = 0, brightest = 0;
  for (let k = 0; k < 300; k++) {
    const th = Math.acos(1 - 2 * ((k * 0.7548777) % 1)), ph = 2 * Math.PI * ((k * 0.5698403) % 1), R = [2, 8, 30][k % 3];
    const ro = [R * Math.sin(th) * Math.cos(ph), R * Math.sin(th) * Math.sin(ph), R * Math.cos(th)];
    const tgt = [(k % 7 - 3) * 1.5, (k % 5 - 2) * 1.5, 0];
    const d = tgt.map((t, i) => t - ro[i]); const l = Math.hypot(...d);
    const c = H.columnJs(g, front, ro, d.map((t) => t / l), { n: 12, j: (k * 0.31) % 1, light });
    if (!(c.T >= 0 && c.T <= 1) || c.rgb.some((v) => !Number.isFinite(v) || v < 0)) bad += 1;
    brightest = Math.max(brightest, ...c.rgb);
  }
  check(bad === 0, `finite from 300 places round it and inside (${bad} bad)`);
  check(brightest < 0.95 * Math.exp(1.5) * 2.5 * 2, `the limb is capped: the brightest column ${brightest.toFixed(2)} (the light, at most 2.5 times, the Dark Bay's given-back light, two crossings)`);
  // from behind the cloud hides the front: dark where the nebula is bright
  let behind = 0, Tb = 0;
  for (const [x, y] of [[0, 0], [0.5, -0.4], [-0.6, 0.3], [1, 1]]) {
    const c = H.columnJs(g, front, [x, y, -40], [0, 0, 1], { n: 12, j: 0.5, light });
    behind = Math.max(behind, ...c.rgb); Tb = Math.max(Tb, c.T);
  }
  check(behind < 0.05 && Tb < 0.1, `from behind the nebula is the cloud's silhouette: its light ${behind.toFixed(3)}, transmission ${Tb.toFixed(3)} (O'Dell 2001: a blister on the near face of OMC-1)`);
}

// --- 5. CRISP AND WITHOUT BANDS: turned, the same picture at 8 and 32 steps and at any offset -------------------
{
  const diffs = [];
  let flicker = 0, n = 0;
  for (const deg of [35, 60]) {
    const ro = [40 * Math.sin(deg * D2R), 0, 40 * Math.cos(deg * D2R)];
    for (let k = 0; k < 200; k++) {
      const tgt = [((k % 20) / 20 - 0.5) * 10, (Math.floor(k / 20) / 10 - 0.5) * 8, 0];
      const d = tgt.map((t, i) => t - ro[i]); const l = Math.hypot(...d); const rd = d.map((t) => t / l);
      const a = H.columnJs(g, front, ro, rd, { n: 8, j: 0.3, light }), b = H.columnJs(g, front, ro, rd, { n: 32, j: 0.7, light });
      const sa = a.rgb[0] + a.rgb[1] + a.rgb[2], sb = b.rgb[0] + b.rgb[1] + b.rgb[2];
      if (sb > 0.05) { diffs.push(Math.abs(sa - sb) / sb); n += 1; }
      const c = H.columnJs(g, front, ro, rd, { n: 12, j: 0.05, light }), e = H.columnJs(g, front, ro, rd, { n: 12, j: 0.95, light });
      const sc = c.rgb[0] + c.rgb[1] + c.rgb[2], se = e.rgb[0] + e.rgb[1] + e.rgb[2];
      if (Math.abs(sc - se) > 0.1 * Math.max(sc, se, 0.05)) flicker += 1;
    }
  }
  diffs.sort((p, q) => p - q);
  const med = diffs[Math.floor(diffs.length / 2)] || 0, p90 = diffs[Math.floor(diffs.length * 0.9)] || 0;
  check(n > 100 && med < 0.02 && p90 < 0.15, `turned 35 and 60 degrees the front is the same at 8 and 32 steps (median ${(med * 100).toFixed(1)} %, 90th percentile ${(p90 * 100).toFixed(1)} %): the crossing is exact, not sampled`);
  check(flicker / Math.max(1, n) < 0.1, `and a step's offset changes few pixels by more than 10 % (${flicker} of ${n}): grain at most, never bands or rings`);
}

// --- 6. tiers, shares, Measured, the exposure --------------------------------------------------------------------
{
  check(H.samplesFor({ tier: 0 }) === 8 && H.samplesFor({ tier: 1, steps: 0 }) === 12 && H.samplesFor({ tier: 2, steps: 48 }) === 24 && H.samplesFor({ tier: 2, steps: 96 }) === 32, 'coarse steps: 8 on T0, 12 at level 2, half the march\'s at level 3 (at most 32)');
  check(H.samplesFor({ tier: 1, steps: 32, slow: true }) === 8, 'slow frames halve them before the governor would lower the pixel ratio (spec 0075 task 44)');
  const sh = H.sharesFor({ level: 1, rPx: 300, photo: 1 });
  check(sh.gas === 0 && sh.stars === 0, 'on our line, with its photograph drawn, the gas and its stars give way to it (the photograph has them)');
  check(H.sharesFor({ level: 1, rPx: 300, photo: 0 }).gas === 1 && H.sharesFor({ level: 0, rPx: 300, photo: 0 }).gas === 0, 'off it the hero is whole from level 2; below level 2 nothing of it draws');
  const lt = (r) => H.sharesFor({ level: 1, rPx: r, photo: 0, viewH: 900 }).light;
  check(lt(300) === 1 && near(lt(Infinity), H.SHAPE.adapt, 1e-12), `its light adapts as it fills the view (to ${H.SHAPE.adapt} inside), never a white screen`);
  check(Object.values(H.UNDER_MEASURED).every((r) => r === 'same' || r === 'still') && X.drawnUnder('measured', H.UNDER_MEASURED.front), 'under Measured nothing changes and nothing moves: every part is measured, reconstructed or seeded, and the card says which');
  const deep = H.paletteFor(X.exposureLook('deep').milkyWay), cam = H.paletteFor(X.exposureLook('camera').milkyWay);
  check(deep.enhanced && deep.gamma === X.exposureLook('deep').nebulaGamma && !cam.enhanced && cam.gamma === 1, 'Deep is the photograph\'s Deep stretch and declared enhanced; Camera the photograph as taken');
  check(!/uTime|Date\.now|performance\.now/.test(H.SHADERS.gas + H.SHADERS.starVertex), 'no clock in its shaders: nothing in it moves');
}

// --- 7. the cluster: constant summed light; pinpoints that never grow; the Trapezium by the stars' own curve -----
{
  const sum = (n) => H.clusterOf(g, n).flux.reduce((a, b) => a + b, 0);
  check(near(sum(400), sum(1600), 1e-6 * sum(1600)), `the cluster's summed light is the same at 400 and 1 600 points (${sum(400).toFixed(4)})`);
  const c = H.clusterOf(g, 1600);
  const r = [];
  let maj = 0, mnr = 0;
  const pa = 10 * D2R, along = [-Math.sin(pa), Math.cos(pa)];
  for (let i = 0; i < 1600; i++) {
    const x = c.pos[3 * i], y = c.pos[3 * i + 1];
    r.push(Math.hypot(x, y));
    const a = x * along[0] + y * along[1], b = x * along[1] - y * along[0];
    maj += a * a; mnr += b * b;
  }
  r.sort((a, b) => a - b);
  const halfPc = r[800] / 3.26156;
  check(halfPc > 0.12 && halfPc < 0.3, `half its stars within ${halfPc.toFixed(2)} pc of the centre on the sky (a Plummer sphere of core 0.18 pc, Hillenbrand & Hartmann 1998)`);
  const q = Math.sqrt(mnr / maj);
  check(q > 0.6 && q < 0.8, `elongated along PA 10 degrees, axis ratio ${q.toFixed(2)} (ellipticity 0.30)`);
  const far = H.sparkleLook(0.01, 40), close = H.sparkleLook(0.01 * (40 / 0.5) ** 2, 0.5);
  check(close.size < far.size && close.bright <= H.SHAPE.sparkleCap, `a pinpoint gets smaller close up (${far.size} -> ${close.size} px) and its brightness is capped (${close.bright})`);
  const L = H.starLook(5.13 + 5 * Math.log10(40 / 1344));
  check(L.glare > 0 && L.size > 6, `theta1 Ori C from 40 ly is a glaring star by the catalogue stars' own curve (size ${L.size.toFixed(1)} px)`);
  check(/m = aStar\.w \+ 5\.0 \* log\( d \/ uDistLy \)/.test(H.SHADERS.starVertex) && /cloudTau\( position, uCam \)/.test(H.SHADERS.starVertex), 'the stars\' magnitude is at the camera, dimmed by the cloud between them and it');
}

// --- 8. the hero in a scene: built, placed, its seams, its policy, disposed -------------------------------------
{
  stage.setWorld('stellar');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-m42');
  const hero = H.createHero(THREE, { profile: HERO, record: rec, gas: G, fetchBin: async () => fileBuf('site/data/deep/orion-front.bin') });
  await new Promise((r) => setTimeout(r, 20));
  check(hero && hero.ready(), 'the hero is built and ready once its front has landed');
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 40 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  const gas = hero.group.getObjectByName('deep-hero-orion-shells');
  const u = gas.material.uniforms;
  check(u.uCam.value.z > 39.9 && Math.hypot(u.uCam.value.x, u.uCam.value.y) < 0.01, `on our line the camera is on the sky frame's +z, 40 ly out (${u.uCam.value.toArray().map((v) => v.toFixed(3))})`);
  check(hero.stats().samples === 8 && hero.stats().points === 5 + 400, `T0: 8 coarse steps, the five stars and 400 cluster points (${JSON.stringify(hero.stats())})`);
  check(u.uShare.value === 0, 'no gas is drawn until its light (the photograph) has landed (in node it never does)');
  hero.setLevel(3, 1);
  hero.frame({ camera, rPx: 400, steps: 48, look: 'measured', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().samples === 24 && hero.stats().points === 5 + 1600, 'T2 at level 3: half the march\'s steps, 1 600 cluster points');
  check(hero.card && hero.card.copy === 'deepOrion' && hero.card.drawn['dso-m43'], 'its card hook names its words block and M43');
  let meshes = 0;
  hero.group.traverse((o) => {
    if (!o.material) return;
    meshes += 1;
    const m = o.material;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${o.name}: gasmat.js COLOUR_POLICY`);
  });
  check(meshes <= BUDGETS.deep_orion_draw_calls, `${meshes} draw calls, within the budget (${BUDGETS.deep_orion_draw_calls}, registry/budgets.yaml deep_orion_draw_calls)`);
  check(gas.material.blending === THREE.CustomBlending && gas.material.side === THREE.BackSide, 'the gas is premultiplied over (the cloud darkens what is behind it), by the box\'s back faces');
  hero.dispose();
  check(!hero.group.parent, 'disposed, it leaves the scene');
}

// --- 9. budgets and the boot ---------------------------------------------------------------------------------------
{
  const bytes = ['site/images/deep/orion/orion-light.webp', 'site/data/deep/orion-front.bin', 'site/images/deep/orion/manifest.json'].reduce((a, p) => a + statSync(join(ROOT, p)).size, 0);
  check(bytes <= BUDGETS.deep_orion_bytes && bytes <= 1500000, `its assets are ${bytes} B, within the budget (${BUDGETS.deep_orion_bytes}; the design's 1.5 MB)`);
  const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
  check(/'js\/scene\/deep\/orion\.js'/.test(diet) && /'js\/data\/hero-orion\.js'/.test(diet), 'the boot diet holds its module and its profile out of the first visit');
  for (const [name, src] of Object.entries(H.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget/i.test(src), `${name}: no bloom, no pass, no render target`);
}

if (problems.length) {
  console.error(`test_hero_orion: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_hero_orion: ok (the profile and its sources, the Trapezium at SIMBAD\'s places, the front 0.2 pc behind the star, the photograph within 5 % on our line, crisp at 8 and 32 steps, dark from behind, tiers, shares, Measured, the cluster\'s light, the budgets)');
