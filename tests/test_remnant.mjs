// tests/test_remnant.mjs -- supernova remnants as shells (internal spec 0076 stage W3-c, internal #784): the Crab and
// the Veil from their registry profiles with their sources; the shell's geometry the published one (the Crab's axis at
// Ng & Romani's position angle and tilt, its reach along it Martin et al.'s 2 pc, the Veil Fesen et al.'s 37 pc
// sphere); from our side the column IS the photograph (within 1 %, at any number of samples); turned, the light sits on
// the shell in depth (a ring through the Veil's middle, the rim no longer brightest), finite and never negative from
// every side and from inside; one module and no fork per object; additive (it adds light, darkens nothing); the
// photograph and the point glow handed over by their own shares; nothing changed or moving under Measured; the tiers;
// false colour declared; the budgets; no pass.
//
//   node tests/test_remnant.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const R = await import(join(JS, 'scene/deep/remnant.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const CRAB = (await import(join(JS, 'data/hero-crab.js'))).HERO;
const VEIL = (await import(join(JS, 'data/hero-veil.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D2R = Math.PI / 180;

// --- 1. the profiles: their parts with sources, shipped under the review policy, false colour declared ----------------
for (const P of [CRAB, VEIL]) {
  const shell = R.part(P, 'shell'), light = R.part(P, 'light');
  check(shell.source && shell.source.length > 40 && light.source && /CC BY 4\.0/.test(light.source), `${P.id}: its shell and its light each have a source, the light's licence quoted`);
  check(P.shipped === true && P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || ''), `${P.id}: shipped under the lead's policy, no astronomer's review claimed`);
  check(/FALSE COLOUR/.test(P.colours.note || ''), `${P.id}: the photograph's false colour is declared`);
  check(Array.isArray(P.drawn) && P.drawn.includes('reconstruction'), `${P.id}: drawn as a reconstruction`);
  check(P.credits.length >= 2, `${P.id}: its credit lines`);
}
check(/Martin, T\., Milisavljevic, D\. & Drissen, L\. 2021, MNRAS 502, 1864/.test(R.part(CRAB, 'shell').source), 'the Crab\'s envelope is Martin et al. 2021\'s (the acceptance: published expansion geometry)');
check(/Fesen, R\. A\. et al\. 2018/.test(R.part(VEIL, 'shell').source) && /2\.85 degree/.test(R.part(VEIL, 'shell').source), 'the Veil\'s shell is Fesen et al. 2018\'s 2.85-degree shell');

// --- 2. one module for every remnant, and the hero list ------------------------------------------------------------
{
  const rows = HEROES.filter((h) => h.stage === 'W3-c');
  check(rows.length === 6, `six W3-c heroes in scene/deep/heroes.js (got ${rows.length})`);
  for (const id of ['crab', 'veil']) {
    const h = HEROES.find((x) => x.id === id);
    check(h && /remnant\.js/.test(String(h.build)), `${id} is drawn by scene/deep/remnant.js`);
  }
  const src = readFileSync(join(JS, 'scene/deep/remnant.js'), 'utf8');
  check(!/\b(crab|veil|cygnus)\b/i.test(src.replace(/\/\/.*$/gm, '')), 'no object is named in remnant.js\'s code: no per-object fork (the package\'s anti-pattern)');
}

// --- 3. the geometry is the published one -------------------------------------------------------------------------
const gc = R.shellOf(CRAB), gv = R.shellOf(VEIL);
{
  const a1 = gc.axes[0];
  // position angle from north through east; x is west
  const pa = Math.atan2(-a1[0], a1[1]) / D2R, incl = Math.acos(a1[2]) / D2R;
  check(near((pa + 360) % 360, 126.3, 0.05) && near(incl, 63.0, 0.05), `the Crab's long axis at PA ${pa.toFixed(2)}, ${incl.toFixed(2)} degrees from our line (Ng & Romani 2004: 126.3, 63.0)`);
  check(a1[2] > 0, 'its south-east end toward us, as the profile says');
  check(near(gc.semi[0], 6.2, 1e-9) && 6.2 / 3.26156 <= 2.0, 'the Crab reaches 1.9 pc along its axis, inside Martin et al.\'s "no material beyond 2 pc"');
  check(gc.inner * gc.semi[1] / 3.26156 >= 0.5 && gc.inner * gc.semi[1] / 3.26156 <= 0.8, `its void ${(gc.inner * gc.semi[1] / 3.26156).toFixed(2)} pc across its short axis: no light inside Martin et al.'s 0.5 pc (drawn a little wider, said in the profile)`);
  // the projected outline on the sky: about 6 by 4.3 arcmin at 6 500 ly
  const arc = (ly) => ly / gc.distanceLy / D2R * 60;
  const along = Math.sqrt((gc.semi[0] * Math.sin(63 * D2R)) ** 2 + (gc.semi[1] * Math.cos(63 * D2R)) ** 2);
  check(near(2 * arc(along), 6.2, 0.4) && near(2 * arc(gc.semi[1]), 4.3, 0.3), `the Crab's outline on the sky ${(2 * arc(along)).toFixed(1)}' x ${(2 * arc(gc.semi[1])).toFixed(1)}' (the photograph's 6' x 4.4')`);
  const r = gv.semi[0] / gv.distanceLy / D2R;
  check(near(2 * r, 2.85, 0.03) && gv.semi.every((s) => s === gv.semi[0]), `the Veil a sphere ${(2 * r).toFixed(2)} degrees across (Fesen et al. 2018: 2.85)`);
  const [cx, cy] = gv.centre;
  check(Math.hypot(cx, cy) > 30 && cx < 0, 'the Veil\'s shell centred on the Cygnus Loop, east of the record\'s place (NGC 6960 is its western arc)');
}

// --- 4. from our line the column IS the photograph -------------------------------------------------------------------
// A synthetic picture with structure, so the check means something: L(u, v) varies across the field.
const pic = (u, v) => (u < 0 || v < 0 || u > 1 || v > 1) ? [0, 0, 0] : [0.5 + 0.4 * Math.sin(17 * u) * Math.cos(11 * v), 0.4 + 0.3 * Math.cos(23 * v), 0.3 + 0.2 * Math.sin(9 * u + 4 * v)];
function ourLine(g, label) {
  let worst = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const a = (i * 2.39996) % (2 * Math.PI), rr = Math.sqrt((i + 0.5) / 400) * 0.97;
    const x = g.centre[0] + Math.cos(a) * rr * g.semi[1], y = g.centre[1] + Math.sin(a) * rr * g.semi[1];
    const p = R.pathsAt(g, x, y);
    if (!(p.shell >= g.limbFloor)) continue;     // the outline's sliver is spread over the floor (said in the profile)
    const ro = [x, y, 3 * g.semi[0]];
    for (const nS of [2, 4, 8]) {
      const C = R.columnJs(g, ro, [0, 0, -1], { n: nS, j: (i * 0.618) % 1, light: pic });
      const [u, v] = g.uv.at(x, y);
      const want = pic(u, v).map((c) => c * R.coverAt(u, v));
      for (let c = 0; c < 3; c++) if (want[c] > 0.02) worst = Math.max(worst, Math.abs(C[c] / want[c] - 1));
    }
    n += 1;
  }
  check(n > 100 && worst < 0.01, `${label}: from our line the column is the photograph within 1 % at 2, 4 and 8 samples (worst ${(worst * 100).toFixed(3)} % over ${n} points)`);
}
ourLine(gc, 'the Crab');
ourLine(gv, 'the Veil');

// --- 5. turned, the light is on the shell in depth; finite from every side and from inside ---------------------------
{
  // the Veil seen from the side (90 degrees): the light that was the rim from here is a ring through the middle
  const g = gv;
  const flat = () => [1, 1, 1];
  const side = (y) => R.columnJs(g, [g.centre[0] + 4 * g.semi[0], g.centre[1] + y, 0], [-1, 0, 0], { n: 8, j: 0.37, light: flat });
  const mid = side(0)[0], rim = side(0.95 * g.semi[0])[0];
  check(mid > 0 && rim > 0, `the Veil from the side has light through its middle (${mid.toFixed(3)}) and at its rim (${rim.toFixed(3)})`);
  // from our line a uniform picture is uniform; from the side it is not: the depth shows
  const ours = [0, 0.5, 0.9].map((k) => { const x = g.centre[0], y = g.centre[1] + k * g.semi[0]; const [u, v] = g.uv.at(x, y); return R.columnJs(g, [x, y, 3 * g.semi[0]], [0, 0, -1], { n: 4, light: flat })[0] / R.coverAt(u, v); });
  const sides = [0, 0.5, 0.9].map((k) => side(k * g.semi[0])[0]);
  check(ours.every((v) => near(v, ours[0], 0.02 * ours[0])) && Math.max(...sides) / Math.min(...sides) > 1.3, `a uniform picture is uniform from our line (${ours.map((v) => v.toFixed(2)).join(', ')}) and not from the side (${sides.map((v) => v.toFixed(2)).join(', ')}): turned, it is a shell`);
  let bad = 0;
  for (const G of [gc, gv]) {
    for (let i = 0; i < 300; i++) {
      const th = Math.acos(1 - 2 * ((i + 0.5) / 300)), ph = i * 2.39996;
      const dir = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
      const dist = i % 3 === 0 ? 0.2 * G.semi[0] : 2.5 * G.semi[0];   // a third from inside the shell's void
      const ro = dir.map((d, k) => G.centre[k] + d * dist);
      const rd = [Math.sin(ph * 1.7), Math.cos(th * 2.3), Math.sin(th + ph)];
      const l = Math.hypot(...rd); rd.forEach((_, k) => { rd[k] /= l; });
      const C = R.columnJs(G, ro, rd, { n: 4, j: 0.5, light: pic });
      if (!C.every((c) => Number.isFinite(c) && c >= 0)) bad += 1;
    }
  }
  check(bad === 0, `finite and never negative from 600 views around and inside both shells (${bad} bad)`);
}

// --- 6. the hero: one additive mesh in the opaque list, shares, Measured, tiers ------------------------------------
{
  const hero = R.createHero(THREE, { profile: CRAB, record: null });
  const meshes = [];
  hero.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  check(meshes.length === 1, `one mesh, one draw call (got ${meshes.length})`);
  const m = meshes[0].material;
  check(m.blending === THREE.AdditiveBlending && m.transparent === false && m.depthWrite === false && m.toneMapped === false, 'additive (it adds light, never darkens), in the opaque list, no depth write, display values (gasmat.js COLOUR_POLICY)');
  check(/-shells$/.test(meshes[0].name), 'the contract\'s draw-order check knows its mesh by "-shells"');
  check(hero.latchSafe === true && hero.card && hero.card.copy === 'r12Dust' && hero.card.drawn['dso-m1'][0] === 'reconstruction', 'latch-safe, and the card reads the r12Dust words with "reconstruction"');
  hero.dispose();
  const s = R.sharesFor({ level: 1, rPx: 200, photo: 1, viewH: 900 });
  check(s.gas === 0, 'on our line, where the photograph is drawn, the hero gives way to it');
  check(R.sharesFor({ level: 1, rPx: 200, photo: 0.25, viewH: 900 }).gas === 0.75, 'and takes over by the photograph\'s own share');
  check(R.sharesFor({ level: 1, rPx: 5000, photo: 0, viewH: 900 }).light < 0.5, 'filling the view, its light is the eye\'s adapted share');
  check(R.samplesFor({ tier: 0 }) === 2 && R.samplesFor({ tier: 1, cheap: true }) === 2, 'T0 and the latch: 2 samples a stretch');
  check(R.samplesFor({ tier: 2 }) === 4 && R.samplesFor({ tier: 2, steps: 48 }) === 8, 'level 2: 4; Ultra at level 3: 8 (MAX_N)');
  check(X.drawnUnder('measured', R.UNDER_MEASURED.shell) && X.stillUnder('measured', R.UNDER_MEASURED.motion), 'under Measured the shell is the same and nothing moves');
  const deep = R.paletteFor(X.exposureLook('deep').milkyWay, CRAB), cam = R.paletteFor(1, CRAB);
  check(deep.mode === 'deep' && deep.enhanced === true && cam.mode === 'camera', 'the exposure\'s stretch: Deep is enhanced and the profile says so');
}

// --- 6b. in a scene: placed on the sky frame, the camera on our line at +z ------------------------------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { parseDso } = await import(join(JS, 'data/parsers.js'));
  stage.setWorld('stellar');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-m1');
  const hero = R.createHero(THREE, { profile: CRAB, record: rec });
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = 9460730472580.8 / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  camera.position.copy(centre).addScaledVector(centre.clone().negate().normalize(), 30 * s);
  camera.lookAt(centre); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 1, gain: 1 });
  const u = hero.group.getObjectByName('deep-hero-crab-shells').material.uniforms;
  check(u.uCam.value.z > 29.9 && Math.hypot(u.uCam.value.x, u.uCam.value.y) < 0.01, `on our line the camera is on the sky frame's +z, 30 ly out (${u.uCam.value.toArray().map((v) => v.toFixed(3))})`);
  check(u.uShare.value === 0 && hero.stats().samples === 4, 'nothing is drawn until its light has landed; 4 samples at level 2');
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  check(hero.stats().samples === 2 && hero.stats().path === 'cheap', 'T0: 2 samples a stretch');
  hero.dispose();
}

// --- 7. the shader mirrors columnJs; no pass; the budgets ------------------------------------------------------------
{
  const f = R.SHADERS.frag;
  for (const k of ['chordAt', 'weightsAt', 'stretchSum', 'uFill', 'uLimbFloor', 'pixelHash', 'coverAt']) check(f.includes(k), `the fragment has ${k} (columnJs mirrors it)`);
  for (const [name, src] of Object.entries(R.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget|lensflare/i.test(src), `${name}: no bloom, no pass, no render target`);
  const files = ['crab-light.webp', 'veil-light.webp'].map((n) => statSync(join(ROOT, 'site/images/deep/sheets', n)).size);
  check(files.every((b) => b < 200000), `each remnant's light is under 200 kB (${files.join(', ')} B)`);
  check(Number.isFinite(BUDGETS.deep_sheets_bytes) && Number.isFinite(BUDGETS.deep_sheets_draw_calls), 'its budgets are in registry/budgets.yaml (the 0076 W3-c anchor)');
  const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
  check(/'js\/scene\/deep\/remnant\.js'/.test(diet) && /'js\/data\/hero-crab\.js'/.test(diet) && /'js\/data\/hero-veil\.js'/.test(diet), 'the boot diet holds its module and its profiles out of the first visit');
}

if (problems.length) {
  console.error(`test_remnant: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_remnant: ok (the profiles and their sources, the published geometry, the photograph within 1 % on our line at any samples, a shell in depth turned, finite everywhere, one additive mesh, shares, Measured, tiers, no pass, the budgets)');
