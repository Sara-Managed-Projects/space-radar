// tests/test_orrery.mjs -- the Planets tab's Size and Distance sliders (forge #145).
//
// Asserted, with no browser:
//   THE ARITHMETIC (scene/orrery.js): size from ×1 to ×2 000 in two significant figures, monotonic;
//     the distance map true at 0, logarithmic at 1 (Mercury 9.8 AU, the Earth 16.2, Neptune 45.4),
//     never moving anything past 50 AU, monotonic in distance at every slider position; the Sun held
//     short of Mercury; the URL keys round trip.
//   MOONS STAY OUTSIDE THEIR PLANETS: every moon of scene/worlds.js WORLDS, at sizes 1 to 2 000, clears
//     its planet's enlarged disc (or rings) with its own enlarged disc, and keeps its order.
//   THE SCENE OBEYS: scene/worlds.js setOrrery on the Sun's stage puts each planet at the drawn distance
//     in its true direction and k times its radius, each moon outside its planet, and a card note that
//     says so; setOrrery(null) gives back the true picture to the last digit.
//   THE BADGE TELLS THE TRUTH at three slider positions (ui/scalebadge.js): its text is pinned.
//   LAZY: nothing of it is in the boot graph; main.js and ui/explore.js fetch ui/orrery.js on first use.
//
//   node tests/test_orrery.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);
const AU = 1.495978707e8;

const O = await mod('scene/orrery.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
const { WORLDS, createWorlds } = await mod('scene/worlds.js');
const { stage } = await mod('scene/stage.js');
const { COPY, fmt } = await mod('copy/en.js');
await mod('copy/en.later.js');
const sb = await mod('ui/scalebadge.js');
const UI = await mod('ui/orrery.js');

// --- size ---------------------------------------------------------------------------------------
check(O.sizeFromU(0) === 1 && O.sizeFromU(1) === O.SIZE_MAX && O.SIZE_MAX === 2000, 'the size slider runs from ×1 to ×2 000');
{
  let prev = 0; let ok = true; let figures = true;
  for (let i = 0; i <= O.SIZE_STEPS; i++) {
    const k = O.sizeFromU(i / O.SIZE_STEPS);
    if (k < prev) ok = false;
    if (Number(k.toPrecision(2)) !== k) figures = false;
    prev = k;
  }
  check(ok, 'size never falls as the slider rises');
  check(figures, 'every size is a whole number to two significant figures, so the badge prints what was drawn');
}
for (const k of [1, 2, 10, 120, 2000]) check(O.sizeFromU(O.uFromSize(k)) === k, `a link's size=${k} puts the slider where it draws ×${k} (got ${O.sizeFromU(O.uFromSize(k))})`);

// --- distance -----------------------------------------------------------------------------------
for (const r of [0.39, 1, 5.2, 30.07, 49, 120]) check(O.radialKm(r * AU, 0) === r * AU, `at d = 0 a body ${r} AU out stays there`);
const near = (a, b, tol) => Math.abs(a - b) <= tol;
check(near(O.logKm(0.387 * AU) / AU, 9.8, 0.1), `logarithmic Mercury is 9.8 AU out (${(O.logKm(0.387 * AU) / AU).toFixed(2)})`);
check(near(O.logKm(1 * AU) / AU, 16.2, 0.1), `logarithmic Earth is 16.2 AU out (${(O.logKm(AU) / AU).toFixed(2)})`);
check(near(O.logKm(30.07 * AU) / AU, 45.4, 0.1), `logarithmic Neptune is 45.4 AU out (${(O.logKm(30.07 * AU) / AU).toFixed(2)})`);
check(O.radialKm(O.DIST_LOG.fixKm, 1) === O.DIST_LOG.fixKm && O.radialKm(121.6 * AU, 1) === 121.6 * AU, 'nothing at or past 50 AU moves: the Voyagers and the heliosphere keep their places');
check(near(O.radialKm(O.DIST_LOG.fixKm * 0.999999, 1), O.DIST_LOG.fixKm, O.DIST_LOG.fixKm * 1e-5), 'the map is continuous at 50 AU');
for (const d of [0.25, 0.5, 0.75, 1]) {
  let prev = 0; let ok = true;
  for (let r = 0.01; r < 60; r *= 1.05) { const v = O.radialKm(r * AU, d); if (!(v > prev)) ok = false; prev = v; }
  check(ok, `at d = ${d} the map keeps every body in its order from the Sun`);
}

// --- the Sun ------------------------------------------------------------------------------------
for (const [k, d] of [[1, 0], [10, 0], [2000, 0], [2000, 0.5], [2000, 1], [30, 1]]) {
  const s = O.sunSize(k, d);
  check(s >= 1 && s <= Math.max(1, k), `the Sun is never drawn larger than the planets' factor (k ${k}, d ${d}: ${s})`);
  check(695700 * s <= O.SUN_ROOM * O.radialKm(46.0e6, d) + 1, `the drawn Sun stays inside half Mercury's drawn perihelion (k ${k}, d ${d})`);
}

// --- moons --------------------------------------------------------------------------------------
const byId = new Map(WORLDS.map((w) => [w.id, w]));
const moons = WORLDS.filter((w) => w.parent && w.parent !== 'sun');
check(moons.length >= 20, `the moons come from scene/worlds.js (${moons.length})`);
// The true distance each moon is from its planet: its mean orbit, read from the scene below at one instant.
{
  stage.setWorld('sun');
  const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-6, 1e12);
  camera.position.set(0, 3000, 3000);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: () => new THREE.Texture(), camera });
  const t = Date.parse('2026-11-07T12:00:00Z');
  stage.setTime(t);
  worlds.update(t);
  const trueAt = new Map(WORLDS.map((w) => [w.id, worlds.meshFor(w.id) ? worlds.meshFor(w.id).position.clone() : null]));
  const trueScale = new Map(WORLDS.map((w) => [w.id, worlds.drawnRadiusUnits(w.id)]));
  for (const k of [2, 50, 2000]) {
    for (const m of moons) {
      const p = byId.get(m.parent);
      const env = p.look && p.look.ring && p.look.ring.outerKm ? p.look.ring.outerKm : p.radiusKm;
      const dKm = trueAt.get(m.id).distanceTo(trueAt.get(m.parent)) * stage.unitKm;
      const off = O.moonOffsetKm(dKm, env, m.radiusKm, k);
      check(off - env * k - m.radiusKm * k > 0, `${m.id} at ×${k} is outside ${m.parent}${env > p.radiusKm ? "'s rings" : ''} (${(off - env * k - m.radiusKm * k).toFixed(0)} km clear)`);
    }
  }
  check(O.moonOffsetKm(384400, 6371, 1737, 1) === 384400, 'at ×1 a moon is where it is');
  check(O.moonOffsetKm(421700, 69911, 1822, 2000) < O.moonOffsetKm(671000, 69911, 1561, 2000), 'Io stays inside Europa');

  // --- the scene obeys ---------------------------------------------------------------------------
  const { createPlacer } = await mod('scene/orreryplace.js');
  const view = O.viewOf({ size: 2000, dist: 1 });
  worlds.setOrrery(createPlacer(view, { THREE, stage, note: (w, info) => UI.noteFor(w, info) }));
  worlds.update(t);
  for (const id of ['mercury', 'earth', 'jupiter', 'neptune']) {
    const tp = trueAt.get(id); const dp = worlds.meshFor(id).position;
    const want = O.radialKm(tp.length() * stage.unitKm, 1);
    check(near(dp.length() * stage.unitKm, want, want * 1e-6), `${id} is drawn at the logarithmic distance`);
    check(tp.clone().normalize().angleTo(dp.clone().normalize()) < 1e-6, `${id} keeps its true direction from the Sun`);
    check(near(worlds.drawnRadiusUnits(id), trueScale.get(id) * 2000, trueScale.get(id) * 1e-6), `${id} is drawn ×2 000`);
    const vs = worlds.viewScale(id);
    check(vs && vs.exaggerated && /×2.000 larger/.test(vs.note) && /AU from the Sun/.test(vs.note), `${id}'s card says how it is drawn ("${vs && vs.note}")`);
  }
  for (const m of moons) {
    const pm = worlds.meshFor(m.parent); const mm = worlds.meshFor(m.id);
    const p = byId.get(m.parent);
    const envUnits = (p.look && p.look.ring && p.look.ring.outerKm ? p.look.ring.outerKm / p.radiusKm : 1) * pm.scale.x;
    check(mm.position.distanceTo(pm.position) > envUnits + mm.scale.x, `${m.id} is drawn outside ${m.parent} in the scene`);
  }
  check(worlds.drawnRadiusUnits('sun') > trueScale.get('sun') && worlds.viewScale('sun').exaggerated, 'the Sun is drawn larger, and says so');
  // Everything else on the stage is squeezed the same way, about the Sun: a point at 5.2 AU goes where Jupiter's distance goes.
  {
    const v = stage.toSceneInto({ x: 5.2 * AU, y: 0, z: 0 }, 'sun-inertial', new THREE.Vector3(), t);
    check(near(v.length() * stage.unitKm, O.radialKm(5.2 * AU, 1), 1), 'a craft at 5.2 AU is drawn at the squeezed distance too');
    const far = stage.toSceneInto({ x: 160 * AU, y: 0, z: 0 }, 'sun-inertial', new THREE.Vector3(), t);
    check(near(far.length() * stage.unitKm, 160 * AU, 1), 'and Voyager-far things are not moved');
  }
  worlds.setOrrery(null);
  worlds.update(t);
  let same = true;
  for (const w of WORLDS) { const m = worlds.meshFor(w.id); if (m && trueAt.get(w.id) && m.position.distanceTo(trueAt.get(w.id)) > 1e-9) same = false; }
  check(same, 'setOrrery(null) puts every world back where it is');
  stage.setWorld('earth');
}

// --- urls ---------------------------------------------------------------------------------------
check(O.parseSize('2000') === 2000 && O.parseSize('123') === 120 && O.parseSize('true') === 1 && O.parseSize('x') === null && O.parseSize('0') === null, 'size= reads a number, rounded as the slider rounds');
check(O.parseDist('log') === 1 && O.parseDist('true') === 0 && O.parseDist('0.5') === 0.5 && O.parseDist('2') === null, 'dist= reads log, true or a share');
check(O.sizeValue(1) === '' && O.sizeValue(2000) === '2000' && O.distValue(0) === '' && O.distValue(1) === 'log' && O.distValue(0.25) === '0.25', 'the defaults leave the address bar alone');
check(O.viewOf({ size: 1, dist: 0 }) === null && O.viewOf({}) === null, 'both at the truth: the scene is handed nothing');
const { KEYS } = await mod('ui/urlstate.js');
check(KEYS.includes('size') && KEYS.includes('dist') && KEYS.includes('cut') && KEYS[KEYS.length - 1] === 'cam', 'size, dist and cut are URL keys, and cam is still the last');

// --- the badge, pinned at three positions ----------------------------------------------------------
{
  const jupiter = byId.get('jupiter'); const mercury = byId.get('mercury');
  const at = (grow, dist) => {
    const worlds = [
      { id: 'mercury', name: 'Mercury', radiusKm: mercury.radiusKm, distKm: 4e9, grow },
      { id: 'jupiter', name: 'Jupiter', radiusKm: jupiter.radiusKm, distKm: 4e9, grow },
    ];
    const state = sb.scaleState({ worlds, markerPx: 7, fovDeg: 45, viewportH: 900 });
    const v = O.viewOf({ size: grow, dist });
    return sb.badgeWords(state, false, COPY.scale, v);
  };
  const a = at(1, 0); const b = at(1000, 0.5); const c = at(2000, 1);
  check(a.text === 'Planets drawn at least ×180 larger' && a.sub === '', `true sizes and distances: "${a.text}" / "${a.sub}"`);
  check(b.text === `Planets drawn at least ×${fmt.int(1000)} larger` && b.sub === 'Sun ×173 · distances 50% to log', `×1 000, halfway: "${b.text}" / "${b.sub}"`);
  check(c.text === `Planets drawn at least ×${fmt.int(2000)} larger` && c.sub === 'Sun ×905 · log distances', `the classroom view: "${c.text}" / "${c.sub}"`);
  for (const w of [a, b, c]) check(w.text.length <= 60 && w.sub.length <= 60, `each line fits the badge (${w.text.length}, ${w.sub.length})`);
}

// --- words and laziness --------------------------------------------------------------------------
check(UI.sizeWords(1) === 'true' && UI.sizeWords(2000) === `×${fmt.int(2000)}` && UI.distWords(1) === 'logarithmic' && UI.distWords(0.3) === '30% of the way to logarithmic', 'the sliders say their values in words');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const main = read('site/js/main.js');
check(/import\('\.\/ui\/orrery\.js'\)/.test(main) && !/^import[^\n]*orrery/m.test(main), 'main.js fetches the sliders dynamically, never statically');
check(/wantOrrery/.test(read('site/js/ui/explore.js')), 'the Planets tab asks for them');
{
  const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
  const seen = new Set(); const todo = [join(JS, 'main.js')];
  while (todo.length) {
    const p = todo.pop(); if (seen.has(p)) continue; seen.add(p);
    let text; try { text = readFileSync(p, 'utf8'); } catch { continue; }
    for (const m of text.matchAll(STATIC)) todo.push(join(dirname(p), m[1]));
  }
  for (const late of ['ui/orrery.js', 'scene/orrery.js', 'scene/orreryplace.js', 'ui/cutaway.js', 'scene/cutaway.js', 'scene/heliosphere.js', 'data/interiors.js']) {
    check(![...seen].some((p) => p.endsWith(late)), `${late} is not in the boot graph`);
  }
}

if (problems.length) {
  console.error('orrery FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('orrery ok: ×1 to ×2 000, true to logarithmic (Mercury 9.8, Earth 16.2, Neptune 45.4 AU), every moon outside its planet, the badge pinned at three positions');
