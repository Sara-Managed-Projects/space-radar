// tests/test_hero_emission.mjs -- the emission nebulae as heroes (release 1.4.0 stage r14-neb-a, internal spec 0078: no
// photographs, realistic 3D): the Lagoon, the Trifid, the Eagle, the Omega, the Rosette, the California, the North
// America with the Pelican and the Cat's Paw, one builder (scene/deep/emission.js) for eight profiles. For each: its
// parts come from the registry with their sources, at its record's place and distance; its stars at SIMBAD's places
// inside its footprint; its walls behind the stars and its near cap in front, the dust in front of both; FROM OUR SIDE
// THE MODEL IS THE PHOTOGRAPH'S LIGHT within 5 % (both walls' shares sum to it), crisp at 8 and 32 steps; finite and
// darker from behind; the hero list's line, its card's words and CREDITS; built, placed and disposed in a scene with
// its uniforms given; the budgets; nothing at boot and no pass.
//
//   node tests/test_hero_emission.mjs
import { readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const E = await import(join(JS, 'scene/deep/emission.js'));
const O = await import(join(JS, 'scene/deep/orion.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const fileBuf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const yamlNum = (text, key) => { const m = text.match(new RegExp(`id: ${key}\\b[\\s\\S]*?\\n\\n`)); return m ? m[0] : ''; };
const budgets = Object.fromEntries([...readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8').matchAll(/\{id: (\w+), value: (\d+)/g)].map((m) => [m[1], Number(m[2])]));
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
const nebulaeYaml = existsSync(join(ROOT, 'registry/nebulae.yaml')) ? readFileSync(join(ROOT, 'registry/nebulae.yaml'), 'utf8') : '';
const manifest = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/nebulae/manifest.json'), 'utf8'));
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
const c0 = credits.indexOf('### Emission nebulae (0078 r14-neb-a)');
const creditSect = c0 >= 0 ? credits.slice(c0, credits.indexOf('\n### ', c0 + 5)) : '';
await import(join(JS, 'copy/en.nebheroes.js'));
const W = COPY.deepNebulae;

const WANT = { m8: 'dso-m8', m20: 'dso-m20', m16: 'dso-m16', m17: 'dso-m17', rosette: 'dso-rosette-nebula', california: 'dso-california-nebula', 'north-america': 'dso-north-america-nebula', 'cats-paw': 'dso-cats-paw-nebula' };
const lines = HEROES.filter((h) => h.stage === 'r14-neb-a');
check(lines.length === 8 && lines.every((h) => WANT[h.id] === h.record), `the hero list has the eight lines (${lines.map((h) => h.id)})`);
check(E.COPY_BLOCK === 'deepNebulae' && W && W.card && W.rows, 'the words block is copy/en.nebheroes.js deepNebulae');
check(E.samplesFor === O.samplesFor && E.sharesFor === O.sharesFor && E.SHADERS.starVertex === O.SHADERS.starVertex, 'one technique: the steps, the shares and the stars are orion.js\'s');
check(E.samplesFor({ tier: 0 }) === 8 && E.samplesFor({ tier: 2, steps: 96 }) === 32, 'coarse steps: 8 on T0, at most 32');
check(E.sharesFor({ level: 1, rPx: 300, photo: 1 }).gas === 0 && E.sharesFor({ level: 1, rPx: 300, photo: 0 }).gas === 1, 'a photograph still drawn is given way to by its own share; with none, the hero is whole');
check(Object.values(E.UNDER_MEASURED).every((r) => r === 'same' || r === 'still') && X.drawnUnder('measured', E.UNDER_MEASURED.front), 'under Measured nothing changes and nothing moves');
for (const [name, src] of Object.entries(E.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget|lensflare|flare|spike/i.test(src), `${name}: no bloom, no pass, no render target, no flare`);
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/deep\/emission\.js|hero-(m8|m16|m17|m20|rosette|california|north-america|cats-paw)\b/.test(main), 'nothing at boot: only scene/deep/heroes.js names the module, imported when a nebula is near');
check(E.nearShare(0.4, 0) === 0 && Math.abs(E.nearShare(0.4, 5) - 0.4) < 1e-12, 'the near cap carries its share only where it stands clear of the stars\' plane');

for (const def of lines) {
  const id = def.id;
  const { HERO } = await import(join(JS, `data/hero-${id}.js`));
  const P = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));
  const tag = `${id}:`;
  // --- 1. the profile ----------------------------------------------------------------------------------------------
  for (const k of ['light', 'front', 'cloud', 'dust', 'stars', 'clusters']) check(P[k] && String(P[k].source || '').length > 20, `${tag} the profile has its ${k}, with a source`);
  check(HERO.shipped === true && HERO.review.by === 'Space Radar maintainers' && HERO.review.date && /not yet/.test(HERO.review.astronomer || ''), `${tag} shipped under the lead's policy, and says no astronomer has reviewed it`);
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `${tag} review.${k} is written`);
  check(def.stub.shipped === HERO.shipped && def.stub.drawn.join() === HERO.drawn.join() && HERO.drawn.join() === 'reconstruction', `${tag} its stub's shipped and drawn equal the registry's: a reconstruction`);
  check(HERO.colours.enhanced && HERO.colours.enhanced.mode === 'enhanced' && HERO.colours.enhanced.under === 'deep', `${tag} Deep is declared enhanced`);
  const rec = dso.find((o) => `dso-${o.id}` === HERO.record);
  check(rec && HERO.frame.distance_ly === rec.distLy && Math.abs(HERO.frame.ra_deg - rec.raDeg) < 1e-6 && Math.abs(HERO.frame.dec_deg - rec.decDeg) < 1e-6, `${tag} its frame is its record's place and distance (${HERO.frame.distance_ly} ly), so its size on the sky is the measured one`);
  const pic = P.light.picture;
  const row = nebulaeYaml ? yamlNum(nebulaeYaml, pic.id) : '';
  if (row) for (const k of ['ra_deg', 'dec_deg', 'width_arcmin', 'height_arcmin', 'north_deg']) check(new RegExp(`${k}: ${String(pic[k]).replace('.', '\\.')}\\b`).test(row), `${tag} the profile's copy of the photograph's ${k} is registry/nebulae.yaml's (${pic[k]})`);
  check(/CC BY 4\.0/.test(P.light.credit) && /CC BY 4\.0/.test(P.light.source), `${tag} its light's licence is quoted`);
  check(creditSect.includes(String(P.light.source).match(/\b(eso\d+a|noirlab\w+|noao-[\w-]+)\b/)[0]), `${tag} CREDITS.md's Emission nebulae section names its photograph`);
  // the card's words
  check(W.card[id] && /reconstructed|not measured/.test(W.card[id]) && /Not yet reviewed by an astronomer/.test(W.card[id]), `${tag} its card's source sentence says reconstructed and not yet reviewed`);
  const rows = W.rows[HERO.record] || [];
  check(rows.length >= 3 && rows.some((r) => /reviewed by an astronomer/.test(r[1])) && rows.some((r) => /shape in depth/i.test(r[0])), `${tag} its record has its rows: the shape in depth, the light, the review`);

  // --- 2. the geometry ---------------------------------------------------------------------------------------------
  const g = E.geometryOf(HERO);
  check(Math.abs(g.lyPerArcmin - HERO.frame.distance_ly * Math.PI / 10800) < 1e-9, `${tag} arcminutes at the record's distance`);
  const inBox = (p) => p[0] >= g.box.min[0] && p[0] <= g.box.max[0] && p[1] >= g.box.min[1] && p[1] <= g.box.max[1];
  check(g.stars.length >= 1 && g.stars.every((s) => inBox(s.pos) && Number.isFinite(s.v)), `${tag} its ${g.stars.length} stars stand inside the photograph's footprint`);
  check(g.clusters.every((c) => inBox(c.centre) && c.core < c.radius), `${tag} its clusters stand inside the footprint`);
  check(g.veilZ > g.slabTop && g.box.max[2] >= g.veilZ && g.box.min[2] < -g.cloudLy, `${tag} the dust's plane is in front of every wall, the box holds the cloud behind`);
  check(g.nearK >= 0 && g.nearK <= 0.6, `${tag} the near cap's share is ${g.nearK}`);
  // a star west of the record's place is at +x (not mirrored)
  const s0 = P.stars.stars[0];
  const west = -(s0.ra_deg - HERO.frame.ra_deg) * Math.cos(HERO.frame.dec_deg * D2R) * 60 * g.lyPerArcmin;
  check(Math.abs(g.stars[0].pos[0] - west) < 1e-6, `${tag} ${s0.id} is ${west.toFixed(2)} ly west (x is west): not mirrored`);

  // --- 3. the walls' map -------------------------------------------------------------------------------------------
  const front = E.readFront(fileBuf(P.light.depth));
  const m = manifest[id];
  check(m && m.depth.grid[0] === front.nx && m.depth.grid[1] === front.ny && front.nx === P.front.grid[0], `${tag} its walls' map is the bake's (${front.nx} x ${front.ny})`);
  let farMax = -Infinity, nearMin = Infinity, tauMin = Infinity, nearMax = 0;
  for (let i = 0; i < front.nx * front.ny; i++) {
    farMax = Math.max(farMax, front.data[4 * i]); tauMin = Math.min(tauMin, front.data[4 * i + 2]);
    nearMin = Math.min(nearMin, front.data[4 * i + 3]); nearMax = Math.max(nearMax, front.data[4 * i + 3]);
  }
  check(farMax <= 0.01 && nearMin >= -0.01 && tauMin >= 0, `${tag} the far wall is behind the stars' plane, the near cap in front, the dust's depth never negative`);
  check(g.nearK > 0 ? nearMax > 1.5 : nearMax < 0.01, `${tag} a near cap only where the profile has one (${nearMax.toFixed(2)} ly)`);
  check(m.depth.max_slope < 1.73 && m.depth.max_slope_near < 1.73, `${tag} the walls' slopes stay under 1.73 (${m.depth.max_slope}, ${m.depth.max_slope_near}): on our line no part is dimmed by the limb's cap`);

  // --- 4. from our side the model is the photograph's light ----------------------------------------------------------
  // A light that is 1 everywhere: on our line the column is then the photograph's own feather (coverAt) at that point,
  // the far and near walls' shares summing to it and the dust given back where it was taken.
  let worst = 0, n8 = 0, crisp = 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 160; k++) {
    const u = 0.1 + 0.8 * rnd(), v = 0.1 + 0.8 * rnd();
    const [x, y] = g.uv.xyOf(u, v);
    const ro = [x, y, 1e5], rd = [0, 0, -1];
    const want = E.coverAt(u, v);
    const a = E.columnJs(g, front, ro, rd, { n: 12, light: () => [1, 1, 1] }).rgb[0];
    worst = Math.max(worst, Math.abs(a - want) / Math.max(want, 0.1));
    const b8 = E.columnJs(g, front, ro, rd, { n: 8, j: 0.2, light: () => [1, 1, 1] }).rgb[0];
    const b32 = E.columnJs(g, front, ro, rd, { n: 32, j: 0.7, light: () => [1, 1, 1] }).rgb[0];
    crisp = Math.max(crisp, Math.abs(b8 - b32) / Math.max(b32, 0.1));
    n8 += 1;
  }
  check(worst < 0.05, `${tag} from our line the model is the photograph's light within 5 % (worst ${(worst * 100).toFixed(1)} % of ${n8} points)`);
  check(crisp < 0.05, `${tag} crisp: the same column at 8 and 32 steps (worst ${(crisp * 100).toFixed(1)} %)`);
  // turned 40 degrees, finite; from behind, finite and darker than from our side where the cloud is
  const c = [(g.box.max[0] + g.box.min[0]) / 2, (g.box.max[1] + g.box.min[1]) / 2, 0];
  const t = 40 * D2R, far = 4 * Math.max(g.box.max[0] - g.box.min[0], g.box.max[1] - g.box.min[1]);
  const side = E.columnJs(g, front, [c[0] + far * Math.sin(t), c[1], far * Math.cos(t)], [-Math.sin(t), 0, -Math.cos(t)], { n: 16, light: () => [1, 1, 1] });
  check(Number.isFinite(side.rgb[0]) && side.T > 0 && side.T <= 1, `${tag} turned 40 degrees the column is finite`);
  const fromUs = E.columnJs(g, front, [c[0], c[1], 1e5], [0, 0, -1], { n: 16, light: () => [1, 1, 1] });
  const behind = E.columnJs(g, front, [c[0], c[1], -1e5], [0, 0, 1], { n: 16, light: () => [1, 1, 1] });
  check(Number.isFinite(behind.rgb[0]) && behind.rgb[0] < fromUs.rgb[0] + 1e-9, `${tag} from behind its middle is no brighter than from our side (${behind.rgb[0].toFixed(3)} against ${fromUs.rgb[0].toFixed(3)})`);
  // the sheets for T0: the far wall whole, the near cap only where it stands
  const far0 = E.sheetOf(g, front, 2, 0), near3 = E.sheetOf(g, front, 2, 3);
  check(far0.index.length > 0 && (g.nearK > 0 ? near3.index.length > 0 && near3.index.length < far0.index.length : true), `${tag} the cheap path's meshes: the far wall and, where it stands, the near cap`);

  // --- 5. in a scene: built, placed, its seams, disposed -------------------------------------------------------------
  stage.setWorld('stellar');
  const record = records.find((r) => r.id === HERO.record);
  const hero = E.createHero(THREE, { profile: HERO, record, fetchBin: async () => fileBuf(P.light.depth) });
  await new Promise((r) => setTimeout(r, 20));
  check(hero.ready(), `${tag} the hero is ready once its walls have landed`);
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(record.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 300 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  const gas = hero.group.getObjectByName(`deep-hero-${id}-shells`);
  const u = gas.material.uniforms;
  check(u.uCam.value.z > 299 && Math.hypot(u.uCam.value.x, u.uCam.value.y) < 0.1, `${tag} on our line the camera is on the sky frame's +z (${u.uCam.value.toArray().map((q) => q.toFixed(2))})`);
  const st0 = hero.stats();
  check(st0.path === 'sheet' && st0.points === g.stars.length + (g.clusters.length ? g.count[0] : 0), `${tag} T0 draws the walls as meshes, its stars and the tier's cluster points (${JSON.stringify({ path: st0.path, points: st0.points })})`);
  hero.setLevel(3, 1);
  hero.frame({ camera, rPx: 400, steps: 48, look: 'measured', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().path === 'march' && hero.stats().samples === 24, `${tag} T2 at level 3: the march with half the coordinator's steps`);
  check(hero.card && hero.card.copy === 'deepNebulae' && hero.card.drawn[HERO.record][0] === 'reconstruction' && hero.latchSafe === true, `${tag} its card hook names its words block and classes; under the latch it stays on its cheap path`);
  let meshes = 0;
  hero.group.traverse((o) => {
    if (!o.material || !o.material.fragmentShader) return;
    meshes += 1;
    for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const mm of src.matchAll(/^uniform \w+ (\w+);/gm)) check(mm[1] in o.material.uniforms, `${tag} ${o.name}: the shader's uniform ${mm[1]} is given`);
    check(o.material.transparent === false && o.material.toneMapped === false && o.material.depthWrite === false, `${tag} ${o.name}: gasmat.js COLOUR_POLICY`);
  });
  // at once: the march and the stars, or (the cheap path) the far wall's sheet, the near cap's and the stars
  const calls = Math.max(2, (g.nearK > 0 ? 2 : 1) + 1);
  check(meshes <= 2 + (g.nearK > 0 ? 2 : 1) && calls <= budgets.deep_nebula_draw_calls, `${tag} at most ${calls} draw calls at once, within deep_nebula_draw_calls (${budgets.deep_nebula_draw_calls})`);
  hero.dispose();
  check(!hero.group.parent, `${tag} disposed, it leaves the scene`);

  // --- 6. budgets ----------------------------------------------------------------------------------------------------
  const files = [P.light.file, P.light.depth, P.light.detail && P.light.detail.file].filter(Boolean);
  const bytes = files.reduce((a, p) => a + statSync(join(ROOT, p)).size, 0);
  check(bytes <= (budgets.deep_nebula_bytes || 0), `${tag} its assets are ${bytes} B, within deep_nebula_bytes (${budgets.deep_nebula_bytes})`);
  const lightPx = m.light.size[0] * m.light.size[1];
  const gpu = lightPx * 4 * 4 / 3 + (P.light.detail ? P.light.detail.px ** 2 * 4 : 0) + front.half.byteLength + 2200 * 8 * 4;
  check(gpu < 4e6, `${tag} on T1 and T2 it holds about ${(gpu / 1e6).toFixed(2)} MB on the GPU (the design's +4 MB a hero)`);
}

if (problems.length) {
  console.error(`test_hero_emission: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_hero_emission: ok (eight emission nebulae: their profiles and sources at their records\' places, the stars inside their footprints, the walls behind and the near caps in front, the photograph\'s light within 5 % on our line, crisp at 8 and 32 steps, darker from behind, the hero list, the words, CREDITS, the scene, the budgets)');
