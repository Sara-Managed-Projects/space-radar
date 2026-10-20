// tests/test_hero_carina.mjs -- the Carina Nebula as a hero (internal spec 0077 stage W2-e, internal #782): its parts come
// from the registry with their sources; Eta Carinae and the O stars at SIMBAD's places; the wall behind the clusters and
// the dust lane in front of them; from our side the model is the photograph within 5 %; finite from every side, dark from
// behind; crisp (the same picture at 8 and 32 steps, no bands); the steps by tier; the photograph and the point glow
// handed over by their own shares; nothing changed or moving under Measured; the clusters' summed light the same at
// every tier; the card's words; the budgets.
//
//   node tests/test_hero_carina.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const H = await import(join(JS, 'scene/deep/carina.js'));
const O = await import(join(JS, 'scene/deep/orion.js'));
const { HERO } = await import(join(JS, 'data/hero-carina.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { COPY } = await import(join(JS, 'copy/en.later.js')).catch(() => ({ COPY: null }));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const fileBuf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

// --- 1. the profile: every part with its source; shipped under the review policy -------------------------------
const parts = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));
{
  for (const k of ['light', 'front', 'cloud', 'dust', 'stars', 'clusters']) check(parts[k] && String(parts[k].source || '').length > 20, `the profile has its ${k}, with a source`);
  check(/ApJ 532, L145/.test(parts.front.source) && /0809\.5081/.test(parts.front.source), 'the bipolar cavity is Smith et al. (2000) and Smith & Brooks (2008)\'s');
  check(/perpendicular to the Galactic plane/.test(parts.front.source) && near(parts.front.axis_pa_deg, 27.8, 0.05), 'the lobes lie along the axis perpendicular to the Galactic plane (Galactic north is at position angle 27.8 degrees here)');
  check(/obscuration by dust/.test(parts.dust.source) && /foreground/.test(parts.dust.source) && parts.dust.z_ly > 0, 'the V-shaped lane and the Keyhole\'s clumps are dust in FRONT (Smith & Brooks 2008), drawn in front of the clusters');
  check(parts.clusters.clusters[0].core_arcmin === 0.17 && /A&A 476, 199/.test(parts.clusters.source), 'Trumpler 14\'s core is Ascenso et al. (2007)\'s 0.17 arcmin');
  check(HERO.frame.distance_ly === 7665, 'its distance is 2.35 kpc (the Homunculus\'s expansion parallax, Gaia\'s parallaxes of its clusters)');
  check(HERO.shipped === true && HERO.review.by === 'Space Radar maintainers' && HERO.review.date, 'shipped under the lead\'s policy: signed by the maintainers, dated (spec 0075 design 14.4)');
  check(/not yet/.test(HERO.review.astronomer || ''), 'the review says no astronomer has reviewed it yet');
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `review.${k} is written`);
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'reconstruction' && HERO.credits.length >= 3, 'it draws a reconstruction, with its credit lines');
  const line = HEROES.find((h) => h.id === 'carina');
  check(line && line.record === 'dso-carina-nebula' && line.stub && line.stub.shipped === HERO.shipped && line.stub.drawn.join() === HERO.drawn.join(), 'the hero list has its line, a stub read lazily whose `shipped` and `drawn` equal the registry\'s');
  check(HERO.colours.enhanced && HERO.colours.enhanced.mode === 'enhanced' && HERO.colours.enhanced.under === 'deep', 'Deep is declared enhanced');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const i0 = credits.indexOf('### Carina (0077 W2-e)');
  const sect = i0 >= 0 ? credits.slice(i0, credits.indexOf('###', i0 + 5)) : '';
  for (const s of ['ApJ 532, L145', '0809.5081', 'ApJ 644, 1151', 'A&A 660, A11', 'A&A 476, 199', 'eso1250a', 'CC BY 4.0', 'SIMBAD', 'reconstructed', 'ENHANCED']) check(sect.includes(s), `CREDITS.md's Carina section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  const b0 = words.indexOf('deepCarina: {');
  const block = b0 >= 0 ? words.slice(b0, words.indexOf('\n  },', b0)) : '';
  check(/reconstructed/i.test(block) && /not yet been reviewed by an astronomer/.test(block), 'the card says reconstructed and that no astronomer has reviewed it (copy/en.later.js deepCarina)');
  check(/'dso-carina-nebula': \[/.test(block), 'its record has its rows on the card');
  check(H.COPY_BLOCK === 'deepCarina' && H.DRAWN['dso-carina-nebula'][0] === 'reconstruction', 'the hero hands the coordinator its words block and classes (stage c\'s `card` hook)');
  if (COPY) check(COPY.deepCarina && COPY.deepCarina.card && COPY.deepCarina.card.carina && /photograph/.test(COPY.deepCarina.card.carina), 'its source sentence is in the words block the card reads');
}

// --- 2. the geometry: the photograph's place; the stars at SIMBAD's places -------------------------------------
const g = H.geometryOf();
{
  check(near(g.lyPerArcmin, 7665 * Math.PI / 10800, 1e-12), 'arcminutes at the record\'s distance');
  const [x, y] = g.uv.xyOf(0.5, 0.5);
  check(near(g.uv.u0 + x * g.uv.ux[0] + y * g.uv.uy[0], 0.5, 1e-9) && Math.hypot(x, y) < 0.5, `the photograph is centred within half a light-year of the record's place (${x.toFixed(2)}, ${y.toFixed(2)} ly)`);
  const eta = g.stars[0];
  const sep = (r1, d1, r2, d2) => { const s = Math.sin, c = Math.cos; const v = s(d1 * D2R) * s(d2 * D2R) + c(d1 * D2R) * c(d2 * D2R) * c((r1 - r2) * D2R); return Math.acos(Math.min(1, v)) / D2R * 60; };
  const want = sep(161.2647742, -59.6844309, 161.2854, -59.8678);
  check(/Eta Carinae/.test(eta.id) && near(Math.hypot(eta.pos[0], eta.pos[1]) / g.lyPerArcmin, want, 0.02) && eta.pos[1] > 0, `Eta Carinae ${(Math.hypot(eta.pos[0], eta.pos[1]) / g.lyPerArcmin).toFixed(2)}' north of the record's place (SIMBAD: ${want.toFixed(2)}')`);
  const tr14 = g.stars.find((s) => /HD 93129A/.test(s.id));
  check(tr14.pos[0] > eta.pos[0] + 10 && tr14.pos[1] > eta.pos[1] + 10, 'HD 93129A (Trumpler 14) is north-west of Eta Carinae (x is west): not mirrored');
  check(g.stars.length === 15 && g.stars.every((s) => s.pos[2] === 0), 'fifteen stars, all in Eta Carinae\'s plane (their depths are not measured)');
  check(g.box.max[2] >= g.veilZ && g.slabTop < g.veilZ, 'the box holds the cloud, the wall and the dust lane; the march stops under the lane');
  check(g.detailBox && g.detailBox[0] > 0 && g.detailBox[2] < 1 && g.detailBox[1] > 0 && g.detailBox[3] < 1, 'the sharp map\'s square lies inside the photograph');
}

// --- 3. the wall's map: behind the clusters, the dust lane only along the lane and the Keyhole ------------------
const front = H.readFront(fileBuf('site/data/deep/carina-front.bin'));
const at = (x, y) => H.sampleFront(front, g.uv.u0 + x * g.uv.ux[0] + y * g.uv.uy[0], g.uv.v0 + x * g.uv.ux[1] + y * g.uv.uy[1]);
{
  check(front.nx === 200 && front.ny === 214, `the wall's grid is 200 x 214 (${front.nx} x ${front.ny})`);
  for (const s of g.stars) {
    const u = g.uv.u0 + s.pos[0] * g.uv.ux[0] + s.pos[1] * g.uv.uy[0], v = g.uv.v0 + s.pos[0] * g.uv.ux[1] + s.pos[1] * g.uv.uy[1];
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    check(s.pos[2] > at(s.pos[0], s.pos[1])[0] + 1, `${s.id} stands in front of the wall (${s.pos[2].toFixed(1)} over ${at(s.pos[0], s.pos[1])[0].toFixed(1)} ly): inside the cavity`);
  }
  const eta = g.stars[0];
  check(at(eta.pos[0], eta.pos[1])[0] < -20, `behind Eta Carinae the wall is ${(-at(eta.pos[0], eta.pos[1])[0]).toFixed(0)} ly deep: the Homunculus hides glowing gas behind it (Smith & Brooks 2008)`);
  let maxZ = -Infinity, minZ = Infinity, maxSlope = 0, tauOut = 0, tauIn = 0, cBad = 0;
  const cx = 1 / (front.nx * g.uv.ux[0]), cy = 1 / (front.ny * g.uv.uy[1]);
  const lane = parts.dust.lane, kh = parts.dust.keyhole;
  const segDist = (w, n) => {
    let d = Infinity;
    for (let i = 0; i + 1 < lane.points.length; i++) {
      const [w0, n0] = lane.points[i], [w1, n1] = lane.points[i + 1];
      const ex = w1 - w0, ey = n1 - n0;
      const t = Math.min(1, Math.max(0, ((w - w0) * ex + (n - n0) * ey) / (ex * ex + ey * ey)));
      d = Math.min(d, Math.hypot(w - (w0 + t * ex), n - (n0 + t * ey)));
    }
    return d;
  };
  for (let j = 1; j < front.ny - 1; j++) for (let i = 1; i < front.nx - 1; i++) {
    const k = (j * front.nx + i) * 4, d = front.data;
    maxZ = Math.max(maxZ, d[k]); minZ = Math.min(minZ, d[k]);
    const zx = (d[k + 4] - d[k - 4]) / (2 * cx), zy = (d[k + 4 * front.nx] - d[k - 4 * front.nx]) / (2 * cy);
    maxSlope = Math.max(maxSlope, Math.hypot(zx, zy));
    if (!(d[k + 1] >= 0 && d[k + 1] <= 1.001)) cBad += 1;
    const [x, y] = g.uv.xyOf((i + 0.5) / front.nx, (j + 0.5) / front.ny);
    const w = x / g.lyPerArcmin, n = y / g.lyPerArcmin;
    const inLane = segDist(w, n) < lane.half_width_arcmin * 1.25 || Math.hypot(w - kh.west_arcmin, n - kh.north_arcmin) < kh.a_arcmin * 1.3;
    if (inLane) tauIn = Math.max(tauIn, d[k + 2]); else tauOut = Math.max(tauOut, d[k + 2]);
  }
  check(maxZ <= 0.01 && maxZ < g.slabTop && minZ > -80, `the wall between ${minZ.toFixed(1)} and ${maxZ.toFixed(1)} ly: never in front of the clusters' plane, always in the march's slab`);
  check(maxSlope < 1.7, `its slope stays under 1.7 (${maxSlope.toFixed(2)}): on our line no part of it is dimmed by the limb`);
  check(cBad === 0 && tauOut < 0.02 && tauIn > 0.5, `the cloud's column within 0 to 1; the lane's darkness only along the lane and the Keyhole (${tauIn.toFixed(2)} there, ${tauOut.toFixed(3)} elsewhere)`);
  const m = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/carina/manifest.json'), 'utf8'));
  check(m.light.size[0] === 596 && m.depth.grid[0] === 200 && /eso1250a/.test(m.credit) && /eso1250a/.test(m.detail.from), 'the manifest names its photograph and grid');
}

// --- 4. FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH (within 5 %); finite from every side; dark from behind --------
const light = (u, v) => { const r = Math.hypot(u - 0.5, v - 0.62); const fil = 0.5 + 0.5 * Math.sin(u * 90) * Math.sin(v * 70); return [0.9 * Math.exp(-r * 4) + 0.05 * fil, 0.7 * Math.exp(-r * 5) + 0.04, 0.8 * Math.exp(-r * 3) * (0.6 + 0.4 * fil)].map((c) => Math.min(0.95, c)); };
{
  let worst = 0, worst8 = 0, n = 0;
  for (let k = 0; k < 400; k++) {
    const u = 0.15 + 0.7 * ((k * 0.618034) % 1), v = 0.15 + 0.7 * ((k * 0.381966 + 0.2) % 1);
    const cov = H.coverAt(u, v);
    if (cov < 0.05) continue;
    const [x, y] = g.uv.xyOf(u, v);
    const want = light(u, v).map((c) => c * cov);
    const err = (steps, j) => { const c = H.columnJs(g, front, [x, y, 400], [0, 0, -1], { n: steps, j, light }).rgb; return Math.max(...c.map((val, i) => Math.abs(val - want[i]) / Math.max(0.05, want[i]))); };
    worst = Math.max(worst, err(12, 0.37), err(32, 0.81));
    worst8 = Math.max(worst8, err(8, 0.11), err(8, 0.93));
    n += 1;
  }
  check(n > 150 && worst < 0.05 && worst8 < 0.05, `on our line the column is the photograph's within 5 % at 12, 32 and T0's 8 steps (worst ${(worst * 100).toFixed(2)} %, ${(worst8 * 100).toFixed(2)} % at 8; ${n} places): at arrival the model IS the photograph`);
  let bad = 0;
  for (let k = 0; k < 300; k++) {
    const th = Math.acos(1 - 2 * ((k * 0.7548777) % 1)), ph = 2 * Math.PI * ((k * 0.5698403) % 1), R = [10, 60, 250][k % 3];
    const ro = [R * Math.sin(th) * Math.cos(ph), R * Math.sin(th) * Math.sin(ph), R * Math.cos(th)];
    const tgt = [(k % 7 - 3) * 10, (k % 5 - 2) * 10, -20];
    const d = tgt.map((t, i) => t - ro[i]); const l = Math.hypot(...d);
    const c = H.columnJs(g, front, ro, d.map((t) => t / l), { n: 12, j: (k * 0.31) % 1, light });
    if (!(c.T >= 0 && c.T <= 1) || c.rgb.some((v) => !Number.isFinite(v) || v < 0)) bad += 1;
  }
  check(bad === 0, `finite from 300 places round it and inside (${bad} bad)`);
  let behind = 0, Tb = 0;
  for (const [x, y] of [[0, 20], [5, 30], [-10, 10], [10, -30]]) {
    const c = H.columnJs(g, front, [x, y, -200], [0, 0, 1], { n: 12, j: 0.5, light });
    behind = Math.max(behind, ...c.rgb); Tb = Math.max(Tb, c.T);
  }
  check(behind < 0.08 && Tb < 0.15, `from behind its bright middle is the cloud's silhouette: its light ${behind.toFixed(3)}, transmission ${Tb.toFixed(3)}`);
  // turned, the dust lane stands in front of the glow: a lane point's light from 40 degrees off falls elsewhere on the wall
  const [lw, ln] = parts.dust.lane.points[1];
  const lx = lw * g.lyPerArcmin, lyy = ln * g.lyPerArcmin;
  const onLine = H.columnJs(g, front, [lx, lyy, 400], [0, 0, -1], { n: 32, j: 0.5, light });
  check(onLine.T < 0.9, `on our line the lane absorbs (transmission ${onLine.T.toFixed(2)}): it is in front of the light, not a hole in it`);
}

// --- 5. CRISP AND WITHOUT BANDS: turned, the same picture at 8 and 32 steps and at any offset -------------------
{
  const diffs = [];
  let flicker = 0, n = 0;
  for (const deg of [25, 50]) {
    const ro = [300 * Math.sin(deg * D2R), 0, 300 * Math.cos(deg * D2R)];
    for (let k = 0; k < 200; k++) {
      const tgt = [((k % 20) / 20 - 0.5) * 80, (Math.floor(k / 20) / 10 - 0.5) * 80 + 10, -20];
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
  check(n > 100 && med < 0.02 && p90 < 0.15, `turned 25 and 50 degrees the wall is the same at 8 and 32 steps (median ${(med * 100).toFixed(1)} %, 90th percentile ${(p90 * 100).toFixed(1)} %): the crossing is exact, not sampled`);
  check(flicker / Math.max(1, n) < 0.1, `and a step's offset changes few pixels by more than 10 % (${flicker} of ${n}): grain at most, never bands or rings`);
}

// --- 6. tiers, shares, Measured, the exposure: Orion's machinery, the same --------------------------------------
{
  check(H.columnJs === O.columnJs && H.samplesFor === O.samplesFor && H.sharesFor === O.sharesFor, 'one technique: the march, its steps and its shares are orion.js\'s (and so are its shaders)');
  check(H.samplesFor({ tier: 0 }) === 8 && H.samplesFor({ tier: 2, steps: 96 }) === 32, 'coarse steps: 8 on T0, at most 32');
  check(H.sharesFor({ level: 1, rPx: 300, photo: 1 }).gas === 0, 'on our line, with its photograph drawn, the gas and its stars give way to it');
  check(Object.values(H.UNDER_MEASURED).every((r) => r === 'same' || r === 'still') && X.drawnUnder('measured', H.UNDER_MEASURED.front), 'under Measured nothing changes and nothing moves');
  const deep = H.paletteFor(X.exposureLook('deep').milkyWay), cam = H.paletteFor(X.exposureLook('camera').milkyWay);
  check(deep.enhanced && !cam.enhanced && cam.gamma === 1, 'Deep is the photograph\'s Deep stretch and declared enhanced; Camera the photograph as taken');
}

// --- 7. the clusters: constant summed light; Trumpler 14 compact, Trumpler 16 loose ------------------------------
{
  const sum = (n) => H.clustersOf(g, n).flux.reduce((a, b) => a + b, 0);
  check(near(sum(600), sum(2600), 1e-6 * sum(2600)), `the clusters' summed light is the same at 600 and 2 600 points (${sum(600).toFixed(4)})`);
  const c = H.clustersOf(g, 2600);
  const half = (K, idx) => { const r = idx.map((i) => Math.hypot(c.pos[3 * i] - K.centre[0], c.pos[3 * i + 1] - K.centre[1])).sort((a, b) => a - b); return r[Math.floor(r.length / 2)]; };
  const n14 = Math.round(2600 * 2000 / 5000);
  const i14 = [...Array(n14).keys()], i16 = [...Array(2600 - n14).keys()].map((i) => i + n14);
  const h14 = half(g.clusters[0], i14), h16 = half(g.clusters[1], i16);
  check(h14 < h16 / 3 && h14 / g.lyPerArcmin < 1.5, `Trumpler 14 is compact (half its drawn stars within ${(h14 / g.lyPerArcmin).toFixed(2)}'), Trumpler 16 loose (${(h16 / g.lyPerArcmin).toFixed(2)}')`);
}

// --- 8. the hero in a scene: built, placed, its seams, disposed ----------------------------------------------------
{
  stage.setWorld('stellar');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-carina-nebula');
  check(rec && near(Math.hypot(rec.pos.x, rec.pos.y, rec.pos.z) / LY_KM, 7665, 2), 'the record stands at 7 665 ly (registry/dso-hand.yaml)');
  const hero = H.createHero(THREE, { profile: HERO, record: rec, fetchBin: async () => fileBuf('site/data/deep/carina-front.bin') });
  await new Promise((r) => setTimeout(r, 20));
  check(hero && hero.ready(), 'the hero is built and ready once its wall has landed');
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 300 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  const gas = hero.group.getObjectByName('deep-hero-carina-shells');
  const u = gas.material.uniforms;
  check(u.uCam.value.z > 299 && Math.hypot(u.uCam.value.x, u.uCam.value.y) < 0.1, `on our line the camera is on the sky frame's +z, 300 ly out (${u.uCam.value.toArray().map((v) => v.toFixed(2))})`);
  check(hero.stats().path === 'sheet' && hero.stats().points === 15 + 600, `T0 draws the wall as a mesh (the cheap path), the fifteen stars and 600 cluster points (${JSON.stringify(hero.stats())})`);
  hero.setLevel(3, 1);
  hero.frame({ camera, rPx: 400, steps: 48, look: 'measured', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().path === 'march' && hero.stats().samples === 24 && hero.stats().points === 15 + 2600, 'T2 at level 3: the march with half the coordinator\'s steps, 2 600 cluster points');
  check(hero.card && hero.card.copy === 'deepCarina' && hero.latchSafe === true, 'its card hook names its words block; under the latch it stays on its cheap path');
  let meshes = 0;
  hero.group.traverse((o) => {
    if (!o.material) return;
    meshes += 1;
    const m = o.material;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${o.name}: gasmat.js COLOUR_POLICY`);
  });
  check(meshes === 3 && meshes - 1 <= 5, `${meshes - 1} draw calls at once (the march or the sheet, and the stars): within a hero's +5`);
  hero.dispose();
  check(!hero.group.parent, 'disposed, it leaves the scene');
}

// --- 9. budgets and the boot ---------------------------------------------------------------------------------------
{
  const files = ['site/images/deep/carina/carina-light.webp', 'site/images/deep/carina/carina-detail.webp', 'site/data/deep/carina-front.bin', 'site/images/deep/carina/manifest.json'];
  const bytes = files.reduce((a, p) => a + statSync(join(ROOT, p)).size, 0);
  check(bytes <= 1500000, `its assets are ${bytes} B, within the design's 1.5 MB`);
  const gpu = 596 * 640 * 4 * 4 / 3 + 576 * 576 * 4 + front.half.byteLength + 2600 * 8 * 4;
  check(gpu < 4e6, `on T1 and T2 it holds about ${(gpu / 1e6).toFixed(2)} MB on the GPU (the design's +4 MB a hero; the T0 sheet, 0.6 MB, is built only for the cheap path)`);
  for (const [name, src] of Object.entries(O.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget/i.test(src), `${name}: no bloom, no pass, no render target`);
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/deep\/carina\.js|hero-carina/.test(main), 'nothing at boot: only scene/deep/heroes.js names its module, imported when the nebula is near');
}

if (problems.length) {
  console.error(`test_hero_carina: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_hero_carina: ok (the profile and its sources, Eta Carinae and the O stars at SIMBAD\'s places, the wall behind them and the lane in front, the photograph within 5 % on our line, crisp at 8 and 32 steps, dark from behind, tiers, shares, Measured, the clusters\' light, the budgets)');
