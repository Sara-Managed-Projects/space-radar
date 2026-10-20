// tests/test_hero_smc.mjs -- the Small Magellanic Cloud as a hero and the Magellanic Bridge and Stream as a deep layer
// (internal spec 0077 stage W2-e, internal #783): the profile and its sources; the Gaia maps are the bake's; the depth
// trends are the papers' (the young stars stretched toward and away from us, the north-east nearest; the old near a
// tilted plane, the east nearer); along our line the unresolved light is exactly the maps (so the photograph); the
// stars' summed light is the same at every tier and they never grow close up; the Stream is the HI4PI map at the place
// its frame says, at a distance that is the Clouds' at its root and a model beyond; false colour, none under Eye; the
// card's words; the budgets.
//
//   node tests/test_hero_smc.mjs
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const H = await import(join(JS, 'scene/deep/smc.js'));
const M = await import(join(JS, 'scene/deep/magellanic.js'));
const { readMaps } = await import(join(JS, 'scene/deep/lmc.js'));
const { HERO } = await import(join(JS, 'data/hero-smc.js'));
const { HEROES, DEEP_LAYERS } = await import(join(JS, 'scene/deep/heroes.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const fileBuf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const parts = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));

// --- 1. the profile ---------------------------------------------------------------------------------------------
{
  for (const k of ['maps', 'photograph', 'old', 'young', 'stream']) check(parts[k] && String(parts[k].source || '').length > 20, `the profile has its ${k}, with a source`);
  check(/1707\.04500/.test(parts.young.source) && /1502\.06995/.test(parts.young.source) && /25-30 kpc/.test(parts.young.source + JSON.stringify(HERO)), 'the young stars\' stretch is Ripepi et al. (2017) and Scowcroft et al. (2016)\'s');
  check(/2012\.12288/.test(parts.old.source) && parts.old.incl_deg >= 35 && parts.old.incl_deg <= 48 && parts.old.nodes_pa_deg >= 170 && parts.old.nodes_pa_deg <= 186, 'the old stars\' plane is within Tatton et al. (2021)\'s i = 35-48 and PA = 170-186 degrees');
  check(/1712\.00909/.test(parts.stream.source) && /A&A 594, A116/.test(parts.stream.source) && /FALSE colour/i.test(HERO.colours.note), 'the Stream is HI4PI\'s (Westmeier 2018), declared false colour');
  check(HERO.frame.distance_ly === 203650 && HERO.shipped === true && HERO.review.by === 'Space Radar maintainers' && /not yet/.test(HERO.review.astronomer), 'its distance is the record\'s; shipped under the lead\'s policy, no astronomer yet');
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'model', 'it draws a model');
  const line = HEROES.find((h) => h.id === 'smc');
  check(line && line.record === 'dso-smc' && line.stub && line.stub.shipped === HERO.shipped && line.stub.drawn.join() === HERO.drawn.join(), 'the hero list has its line, a stub whose `shipped` and `drawn` equal the registry\'s');
  const layer = DEEP_LAYERS.find((l) => l.id === 'magellanic');
  check(layer && ['stellar', 'galaxy', 'local-group'].every((s) => layer.stages.includes(s)), 'the Bridge and Stream are a deep layer on the ladder\'s stages (a flight to the Clouds stays on the stellar one)');
  const bin = readFileSync(join(ROOT, 'site/data/deep/smc-density.bin'));
  check(bin.length === parts.maps.bytes && createHash('sha256').update(bin).digest('hex') === parts.maps.sha256, 'the maps are the bake\'s (size and hash as the profile says; scripts/build_deep_smc.py --check)');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const i0 = credits.indexOf('### The SMC and the Magellanic Stream (0077 W2-e)');
  const sect = i0 >= 0 ? credits.slice(i0, credits.indexOf('\n## ', i0)) : '';
  for (const s of ['Gaia DR3', 'CC BY-NC 3.0 IGO', '1707.04500', '1502.06995', '1602.09141', '2012.12288', 'HI4PI', 'MNRAS 474, 289', 'LAMBDA', 'false colour', 'model']) check(sect.includes(s), `CREDITS.md's SMC section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.deepheroes.js'), 'utf8');
  const b0 = words.indexOf('deepSmc: {');
  const block = b0 >= 0 ? words.slice(b0, words.indexOf('\n  },', b0)) : '';
  check(/false colour/.test(block) && /not yet been reviewed by an astronomer/.test(block) && /'dso-smc': \[/.test(block), 'the card says what is measured, that the Stream is false colour and that no astronomer has reviewed it (copy/en.deepheroes.js deepSmc)');
  check(H.COPY_BLOCK === 'deepSmc' && H.DRAWN['dso-smc'][0] === 'model', 'the hero hands the coordinator its words block and classes');
}

// --- 2. the depth trends ---------------------------------------------------------------------------------------
const g = H.geometryOf();
const maps = readMaps(fileBuf('site/data/deep/smc-density.bin'));
{
  const [old, young] = g.pops;
  check(near(g.D * g.unit, 203650, 1e-6), 'the frame is at the record\'s distance');
  // young: the north-east nearer, by about 10 kpc 1.4 degrees out
  const ne = H.meanDepth(young, 1.4 * Math.sin(55 * D2R), 1.4 * Math.cos(55 * D2R)) * g.unit, sw = H.meanDepth(young, -1.4 * Math.sin(55 * D2R), -1.4 * Math.cos(55 * D2R)) * g.unit;
  check(ne > 25000 && ne < 40000 && near(ne, -sw, 1), `the young stars' north-eastern end ${(ne / 3261.56).toFixed(1)} kpc nearer, the south-western as much farther: more than 25 kpc end to end (Ripepi et al. 2017)`);
  const east = H.meanDepth(old, 1, 0) * g.unit, west = H.meanDepth(old, -1, 0) * g.unit;
  check(east > 0 && west < 0 && near(east / (g.D * g.unit * D2R), Math.tan(41 * D2R), 0.02), `the old stars' plane: the east nearer, tilted ${(Math.atan(east / (g.D * g.unit * D2R)) / D2R).toFixed(1)} degrees`);
  const lenKpc = (2 * young.max + 2 * young.z0) * g.unit / 3261.56, wideKpc = 2 * 1.4 * g.D * g.unit * D2R / 3261.56;
  check(young.max * g.unit <= 45000 && lenKpc / wideKpc > 4, `the young stars a cigar about ${lenKpc.toFixed(0)} kpc along our line and ${wideKpc.toFixed(1)} kpc across (more than four times), not a sheet`);
  check(maps.length === 2 && Math.max(...maps[0]) > 0.99 && Math.max(...maps[1]) > 0.99, 'two maps, each at 1 at its fullest bin');
  // the young map's centroid lies north-east of the old one's? (the Wing is south-east; at least they differ)
  check(H.taperAt(g, 0, 0) === 1 && H.taperAt(g, 5, 0) === 0, 'the drawn extent fades from 3.2 to 4.6 degrees');
}

// --- 3. ALONG OUR LINE THE LIGHT IS THE MAPS (so the photograph); finite from every side --------------------------
{
  let worst = 0, n = 0;
  for (let k = 0; k < 200; k++) {
    const e = ((k * 0.618034) % 1 - 0.5) * 7, nn = ((k * 0.381966 + 0.2) % 1 - 0.5) * 7;
    const want = g.pops.reduce((s, p) => s + p.weight * H.mapAt(g, maps[p.map], e, nn) * H.taperAt(g, e, nn), 0);
    if (want < 0.01) continue;
    const kk = g.D * D2R, tgt = [-e * kk, nn * kk, 0], ro = [0, 0, g.D];
    const d = tgt.map((t, i) => t - ro[i]); const l = Math.hypot(...d);
    for (const steps of [4, 8, 16]) {
      const c = H.columnJs(g, maps, ro, d.map((t) => t / l), { n: steps, j: (k * 0.37) % 1 });
      worst = Math.max(worst, Math.abs(c.weight - want) / want);
    }
    n += 1;
  }
  check(n > 50 && worst < 0.05, `from the Sun every line's column is the weighted maps within 5 % at 4, 8 and 16 steps (worst ${(worst * 100).toFixed(2)} %, ${n} lines): at arrival the model is the photograph where it covers it`);
  let bad = 0;
  for (let k = 0; k < 200; k++) {
    const th = Math.acos(1 - 2 * ((k * 0.7548777) % 1)), ph = 2 * Math.PI * ((k * 0.5698403) % 1), R = [20, 150, 900][k % 3];
    const ro = [R * Math.sin(th) * Math.cos(ph), R * Math.sin(th) * Math.sin(ph), R * Math.cos(th)];
    const tgt = [(k % 7 - 3) * 10, (k % 5 - 2) * 10, 0];
    const d = tgt.map((t, i) => t - ro[i]); const l = Math.hypot(...d);
    const c = H.columnJs(g, maps, ro, d.map((t) => t / l), { n: 12, j: 0.5 });
    if (!Number.isFinite(c.weight) || c.weight < 0) bad += 1;
  }
  check(bad === 0, `finite from 200 places round it and inside (${bad} bad)`);
  // turned 90 degrees (seen from the side, east of it) the young light is a long streak along our old line of sight
  let along = 0, across = 0;
  for (let k = -20; k <= 20; k++) {
    const zc = k * 20, yc = k * 20;
    const a = H.columnJs(g, maps, [800, 0, zc], [-1, 0, 0], { n: 24, j: 0.5 }).weight;
    const b = H.columnJs(g, maps, [800, yc, 0], [-1, 0, 0], { n: 24, j: 0.5 }).weight;
    if (a > 0.01) along += 1;
    if (b > 0.01) across += 1;
  }
  // a slanted ray holds the same light whatever its steps (the layer's share over |rd.z|, exact): no dark side views
  let worstSide = 0;
  for (const rd0 of [[-1, 0, 0], [-1, 0, -0.002], [-1, 0.05, -0.3], [-0.7, 0.02, -0.7]]) {
    const l = Math.hypot(...rd0), rd = rd0.map((v) => v / l), ro = [600, 10, 20 + 400 * (rd0[2] === -0.7 ? 1 : 0)];
    const fine = H.columnJs(g, maps, ro, rd, { n: 400, j: 0.5, adaptive: false }).weight;
    if (fine > 0.02) for (const n of [8, 16]) worstSide = Math.max(worstSide, Math.abs(H.columnJs(g, maps, ro, rd, { n, j: 0.5 }).weight - fine) / fine);
  }
  check(worstSide < 0.25, `a slanted ray's light at 8 and 16 steps is within 25 % of 400 steps' (worst ${(worstSide * 100).toFixed(1)} %): grain, never a dark side`);
  // the cone: a ray that misses the drawn extent costs nothing; one across it takes a few steps, not the tier's all
  const miss = H.columnJs(g, maps, [600, 0, 0], [0, 1, 0]);
  const thru = H.columnJs(g, maps, [600, 0, 0], [-1, 0, 0], { n: 16 });
  check(miss.weight === 0 && !miss.steps && thru.steps < 16 && thru.steps >= 2, `the march is only inside the cone of the drawn extent (a miss takes ${miss.steps || 0} steps, a ray across it ${thru.steps} of 16)`);
  check(/uConeK/.test(H.SHADERS.body) && /if \( disc < 0\.0 \) discard;/.test(H.SHADERS.body), 'and the shader does the same (coneSpan)');
  check(along > across, `seen from the side it is longer along our line (${along * 20 * 100 / 1000} kly lit) than across the sky (${across * 20 * 100 / 1000} kly): deep, not a disc`);
}

// --- 4. the stars: the same summed light at every tier; never grown close up --------------------------------------
{
  const sum = (t) => { const s = H.starsOf(g, maps, t); let f = 0; for (let i = 0; i < s.n; i++) f += s.col[4 * i + 3]; return { f, n: s.n }; };
  const a = sum(0), c = sum(2);
  check(a.n === 7000 && c.n === 66000, `points by tier: ${a.n} on T0, ${c.n} on T2`);
  check(near(a.f, c.f, 0.08 * c.f), `their summed light is the same at every tier (${a.f.toFixed(4)} and ${c.f.toFixed(4)})`);
  check(/clamp\( d \/ 30\.0, 0\.6, 1\.0 \)/.test(H.SHADERS.starVertex) && /min\( 0\.550/.test(H.SHADERS.starVertex), 'a point gets smaller close up and its brightness is capped');
  const s = H.starsOf(g, maps, 1);
  let behind = 0, front = 0;
  for (let i = 0; i < s.n; i++) { if (s.pos[3 * i + 2] > 50) front += 1; if (s.pos[3 * i + 2] < -50) behind += 1; }
  check(front > 0.05 * s.n && behind > 0.05 * s.n, `its stars stand in front of and behind its middle by more than 5 000 ly (${front} and ${behind} of ${s.n})`);
}

// --- 5. shares, tiers, Measured -----------------------------------------------------------------------------------
{
  check(H.stepsFor({ tier: 0 }) === 4 && H.stepsFor({ tier: 1 }) === 8 && H.stepsFor({ tier: 2, steps: 96 }) === 16, 'steps: 4 on T0, 8 at level 2, at most 16');
  const out = H.sharesFor({ level: 1, rPx: 300 }), inside = H.sharesFor({ level: 1, rPx: Infinity, inside: 1 });
  check(out.body === 1 && near(inside.body, H.SHAPE.inside, 1e-9) && near(inside.light, H.SHAPE.adapt, 1e-9), 'inside it the unresolved light steps back to a quarter (stars, not a fog), and the light adapts as it fills the view');
  check(/1\.0 - uPhoto \* cov/.test(H.SHADERS.body) && /1\.0 - uPhoto \* cov/.test(H.SHADERS.starVertex), 'every part gives way to the photograph by its share where the photograph covers it');
  check(Object.values(H.UNDER_MEASURED).every((r) => r === 'same' || r === 'still') && !/uTime|Date\.now/.test(H.SHADERS.body + H.SHADERS.starVertex), 'under Measured nothing changes and nothing moves');
  const deep = H.paletteFor(X.exposureLook('deep').milkyWay);
  check(deep.enhanced, 'Deep is declared enhanced');
}

// --- 6. the Bridge and the Stream ----------------------------------------------------------------------------------
{
  const toRaDec = (v) => [((Math.atan2(v[1], v[0]) / D2R) + 360) % 360, Math.asin(v[2]) / D2R];
  const [ra, dec] = toRaDec(M.galToEq(M.magToGal(-15.5, -11.6)));
  check(near(ra, 13.19, 0.3) && near(dec, -72.83, 0.2), `Magellanic (-15.5, -11.6) is the SMC's place (${ra.toFixed(2)}, ${dec.toFixed(2)}): the frame is Nidever et al.'s`);
  const [ra2, dec2] = toRaDec(M.galToEq(M.magToGal(0, 2.4)));
  check(near(ra2, 80.9, 0.8) && near(dec2, -69.76, 0.3), `and (0, 2.4) the LMC's (${ra2.toFixed(2)}, ${dec2.toFixed(2)})`);
  check(M.distanceAt(0) === 161740 && M.distanceAt(-15.5) === 203650 && M.distanceAt(-7.75) > 161740 && M.distanceAt(-7.75) < 203650, 'the Bridge runs from the LMC\'s measured distance to the SMC\'s');
  check(M.distanceAt(-150) === parts.stream.distance.tip_ly && M.distanceAt(-150) >= 80 * 3261.56 && M.distanceAt(-150) <= 150 * 3261.56, 'the Stream\'s far end at a model\'s distance, within the 80 to 150 kpc models give');
  check(M.keepAt(0, 2.4) === 0 && M.keepAt(-15.5, -11.6) === 0 && M.keepAt(-8, -6) > 0.5 && M.keepAt(-60, 0) === 1 && M.keepAt(15, 0) === 0, 'the Clouds\' own gas and the Leading Arm are not drawn; the Bridge and the Stream are');
  const m = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/magellanic/manifest.json'), 'utf8'));
  check(m.size[0] === 680 && m.size[1] === 280 && /hi4pi-hvc-nhi-mag-car/.test(m.from) && JSON.stringify(m.params) === JSON.stringify(parts.stream.map), 'the map is the bake of HI4PI\'s Magellanic map with the profile\'s numbers');
  check(/smoothstep\( 40\.0, 120\.0, length\( position - uCamKly \) \)/.test(M.SHADERS.vertex), 'gas within 40 000 ly of the camera fades out: beside the Clouds a far ribbon, never a haze');
  check(!M.lookFor(X.exposureLook('eye').milkyWay).on && M.lookFor(X.exposureLook('camera').milkyWay).on, 'no eye sees 21 cm: none under Eye');
  check(/min\( 1\.0 \/ max\( vMu, 1e-3 \), 2\.5 \)/.test(M.SHADERS.fragment) && !/uTime/.test(M.SHADERS.fragment), 'a sheet: its column grows at a slant up to two and a half times, never a haze; nothing moves');
  const sh = M.sheetOf();
  check(sh.index.length / 3 < 30000, `${sh.index.length / 3} triangles`);
  // the layer in a scene: placed on the Local Group's stage, hidden under the probe's before shot
  stage.setWorld('local-group');
  const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  const L = M.createLayer(THREE, { texture: tex });
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e12);
  const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', stage.tMs);
  camera.position.set(sun.x, sun.y, sun.z);
  L.frame({ camera, stage, gain: 1, visible: true });
  check(!L.group.visible, 'off with the camera at home: near the Sun it would be a radio map over the whole southern sky');
  camera.position.x += 100000 * LY_KM / stage.unitKm;
  L.frame({ camera, stage, gain: 1, visible: true });
  check(L.group.visible && L.stats().calls === 1, 'one draw call on the Local Group\'s stage');
  L.group.traverse((o) => { if (o.material && o.material.fragmentShader) for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const m of src.matchAll(/^uniform \w+ (\w+);/gm)) check(m[1] in o.material.uniforms, `${o.name}: the shader's uniform ${m[1]} is given`); });
  L.frame({ camera, stage, gain: 1, visible: true, before: true });
  check(!L.group.visible, 'off for a probe\'s before shot');
  L.frame({ camera, stage, gain: X.exposureLook('eye').milkyWay, visible: true });
  check(!L.group.visible, 'off under Eye');
  L.dispose();
}

// --- 7. the hero in a scene ------------------------------------------------------------------------------------------
{
  stage.setWorld('local-group');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-smc');
  const hero = H.createHero(THREE, { profile: HERO, record: rec, fetchBin: async () => fileBuf('site/data/deep/smc-density.bin') });
  await new Promise((r) => setTimeout(r, 20));
  check(hero.ready(), 'the hero is built and ready once its maps have landed');
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = 100 * LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e12);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 600 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 1, gain: 1 });
  const body = hero.group.getObjectByName('deep-hero-smc-shells');
  const cam = body.material.uniforms.uCam.value;
  check(cam.z > 599 && Math.hypot(cam.x, cam.y) < 0.5, `on our line the camera is on the sky frame's +z (${cam.toArray().map((v) => v.toFixed(1))})`);
  check(hero.stats().points === 40000 && hero.stats().maps === 'ready' && body.material.uniforms.uShare.value === 1, `T1: 40 000 points and the body drawn (${JSON.stringify(hero.stats())})`);
  // every uniform a shader declares is in its material (a missing one reads as 0 and draws nothing: the box, 2026-10-20)
  hero.group.traverse((o) => {
    if (!o.material || !o.material.fragmentShader) return;
    for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const m of src.matchAll(/^uniform \w+ (\w+);/gm)) check(m[1] in o.material.uniforms, `${o.name}: the shader's uniform ${m[1]} is given`);
  });
  let meshes = 0;
  hero.group.traverse((o) => { if (o.material) { meshes += 1; check(o.material.transparent === false && o.material.toneMapped === false && o.material.depthWrite === false, `${o.name}: gasmat.js COLOUR_POLICY`); } });
  check(meshes === 2, `${meshes} draw calls: the body and the stars (a hero's +5 at most)`);
  hero.dispose();
  check(!hero.group.parent, 'disposed, it leaves the scene');
}

// --- 8. budgets -----------------------------------------------------------------------------------------------------
{
  const lm = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/smc/manifest.json'), 'utf8'));
  check(lm.from === 'site/images/nebulae/smc.webp' && lm.foreground.some((f) => f[0] === '47 Tucanae') && lm.stars_removed_px > 1000, 'its light is the photograph without its stars and without 47 Tucanae in front (scripts/build_deep_smc.py --light)');
  const bytes = ['site/data/deep/smc-density.bin', 'site/images/deep/smc/smc-light.webp', 'site/images/deep/smc/manifest.json', 'site/images/deep/magellanic/hi-column.webp', 'site/images/deep/magellanic/manifest.json'].reduce((a, p) => a + statSync(join(ROOT, p)).size, 0);
  check(bytes <= 1500000, `its assets are ${bytes} B, within the design's 1.5 MB`);
  const pts = 66000 * 7 * 4, tex = 128 * 128 * 4 + 512 * 427 * 4 * 4 / 3, layer = 680 * 280 * 4 + M.sheetOf().pos.byteLength * 3;
  check(pts + tex < 4e6, `on T2 the hero holds about ${((pts + tex) / 1e6).toFixed(2)} MB on the GPU (the design's +4 MB a hero)`);
  check(layer < 1.5e6, `the Bridge and Stream about ${(layer / 1e6).toFixed(2)} MB`);
  for (const [name, src] of Object.entries({ ...H.SHADERS, ...M.SHADERS })) check(!/bloom|EffectComposer|WebGLRenderTarget/i.test(src), `${name}: no bloom, no pass, no render target`);
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/deep\/smc\.js|deep\/magellanic\.js|hero-smc/.test(main), 'nothing at boot: only scene/deep/heroes.js names its modules');
}

if (problems.length) {
  console.error(`test_hero_smc: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_hero_smc: ok (the profile and its sources, the maps, the measured depth trends, the photograph exact along our line, deep from the side, the stars\' light by tier, the Bridge and Stream at their place and modelled distance in false colour, the budgets)');
