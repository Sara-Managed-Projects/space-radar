// tests/test_galaxy.mjs -- spec 0028 step 6: the Milky Way as a place, and honestly a model.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseGalaxy, createGalaxy, KPC_KM, ANDROMEDA, ANDROMEDA_LINK, ANDROMEDA_FAR, andromedaDiameterLy, andromedaKm, NORTH_GALACTIC_POLE: NGP_ROW } = await import(join(JS, 'scene/galaxy.js'));
const { exposeByDensity, MW_EXPOSURE: { peak: PEAK }, SPRITE_AREA } = await import(join(JS, 'scene/deep/spiral.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { LOD_RULES } = await import(join(JS, 'data/lod.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));
const { skyToSunInertialKm } = await import(join(JS, 'data/parsers.js'));

const raw = readFileSync(join(ROOT, 'site/data/galaxy.bin'));
const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
const data = parseGalaxy(buffer);
check(data.version === 1 && data.count > 100000 && data.count < 200000, `a six-figure point cloud (${data.count})`);

// the bulge's centroid is 8.15 kpc from the Sun, in the direction of Sagittarius A*
let sx = 0, sy = 0, sz = 0, k = 0;
for (let i = 0; i < data.count; i++) if (data.kind[i] === 1) { sx += data.posKpc[i * 3]; sy += data.posKpc[i * 3 + 1]; sz += data.posKpc[i * 3 + 2]; k++; }
sx /= k; sy /= k; sz /= k;
const dKpc = Math.hypot(sx, sy, sz);
check(Math.abs(dKpc - 8.15) < 0.05, `the centre is 8.15 kpc away (${dKpc.toFixed(3)})`);
const gc = skyToSunInertialKm(266.405, -28.936, 8150);
const gcN = Math.hypot(gc.x, gc.y, gc.z);
const cosA = (sx * gc.x + sy * gc.y + sz * gc.z) / (dKpc * gcN);
check(Math.acos(Math.min(1, cosA)) * 180 / Math.PI < 0.5, `...in the direction of Sagittarius A* (${(Math.acos(Math.min(1, cosA)) * 180 / Math.PI).toFixed(2)} deg off)`);
const kinds = new Set(data.kind);
check(kinds.has(0) && kinds.has(1) && kinds.has(2) && kinds.has(3), 'disc, bulge, bar and arms are all present');
let rmax = 0; for (let i = 0; i < data.count; i++) { const r = Math.hypot(data.posKpc[i * 3] - sx, data.posKpc[i * 3 + 1] - sy, data.posKpc[i * 3 + 2] - sz); if (r > rmax) rmax = r; }
check(rmax < 16, `nothing lies beyond the measured disc plus a margin (${rmax.toFixed(1)} kpc)`);

// the record: the galaxy's centre, 26 600 ly away, honest about its drawing
const row = LAYERS.find((l) => l.id === 'galaxy');
check(!!row && row.draw === 'galaxy' && row.noModel === true && typeof row.sample === 'function', 'the galaxy layer row draws itself and has a record builder');
const [mw] = row.sample();
check(mw && mw.id === 'dso-milky-way' && mw.klass === 'dso' && mw.propagator === 'static', 'one record, the Milky Way, klass dso');
check(Math.abs(mw.meta.distLy - 26580) < 100, `its centre is ~26 600 ly away (${mw.meta.distLy})`);
const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('galaxy'); stage.setTime(tMs);
const p = propagate(mw, tMs);
const v = p && stage.toScene(p, p.frame, tMs);
check(v && Math.abs(v.length() - 8.15) < 0.01, `on the galaxy rung the centre is 8.15 units out (${v && v.length().toFixed(3)})`);
const line = drawingLine(mw);
check(typeof line === 'string' && line.includes('model') && line.includes('illustration'), `the drawing line says it is a model and an illustration: ${line}`);

// LOD: the model fades in 500 -> 5 000 ly from the Sun
const rule = LOD_RULES.find((r) => r.what === 'galaxy-model');
check(!!rule && rule.fade === 'in' && Math.abs(rule.from_km / 9460730472580.8 - 500) < 1 && Math.abs(rule.to_km / 9460730472580.8 - 5000) < 1, 'the galaxy-model rule fades in between 500 and 5 000 light-years');

// headless: hidden on a world stage even at full opacity; drawn on a rung
{
  const scene = new THREE.Scene();
  const g = createGalaxy(scene, { binBuffer: buffer });
  stage.setWorld('earth'); stage.setTime(tMs);
  g.setOpacity(1);
  await g.ensureGeometry();
  check(g.count() === data.count, 'the cloud loads');
  check(g.mode() === 'hidden', 'from Earth the model is not drawn, whatever the LOD says');
  stage.setWorld('stellar'); stage.setTime(tMs);
  g.rebuild();
  check(g.mode() === 'drawn', 'on the stellar rung it is drawn');
  const pos = g.group.children[0].geometry.getAttribute('position').array;
  let far = 0; for (let i = 0; i < data.count; i++) far = Math.max(far, Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  check(far > 50000 && far < 90000, `in light-years the far edge is tens of thousands of units out (${Math.round(far)})`);
  g.setVisible(false);
  check(g.mode() === 'hidden', 'the layer switch hides it');
  g.dispose();
}
stage.setWorld('earth');

// Andromeda is her own (spec 0075 stage d): no longer the Milky Way's cloud moved and scaled, but a far
// copy of her own model (scene/deep/spiral.js) where neither her hero nor her photograph draws her.
{
  const row = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'm31');
  check(row && row.raDeg === ANDROMEDA.raDeg && row.decDeg === ANDROMEDA.decDeg && row.distLy === ANDROMEDA.distLy && row.majAxArcmin === ANDROMEDA.majAxArcmin,
    'the drawn Andromeda stands where, as far and as big as the M31 row says');
  check(Math.abs(andromedaDiameterLy() - 131391) < 1, 'and that size is the one the card prints (131 391 ly before rounding)');
  const src = readFileSync(join(JS, 'scene/galaxy.js'), 'utf8');
  check(!/buildTwin|andromedaFromModel|templateDiameterLy/.test(src), 'the Milky Way\'s copy is retired: no twin, no moved cloud, no template size');
  const scene = new THREE.Scene();
  const g = createGalaxy(scene, { binBuffer: buffer, schedule: (fn) => setTimeout(fn, 0) });
  stage.setWorld('stellar'); stage.setTime(tMs);
  g.setOpacity(1);
  await g.ensureGeometry();
  await g.andromedaReady();
  g.rebuild();
  const far = g.andromeda();
  check(far && far.points >= 6000 && far.points <= 9000 && far.dust > 0, `her far copy is a few thousand of her own points and her dust (${far && far.points} + ${far && far.dust})`);
  const node = g.group.children.find((c) => c.name === 'galaxy:andromeda');
  check(!!node, 'the far copy is a child of the galaxy group');
  if (node) {
    const p = new THREE.Vector3().setFromMatrixPosition(node.matrix);
    check(Math.abs(p.length() - ANDROMEDA.distLy) / ANDROMEDA.distLy < 1e-3, `it stands at her distance on the stellar rung (${Math.round(p.length())} ly)`);
    const km = andromedaKm();
    const los = new THREE.Vector3(km.x, km.y, km.z).normalize();
    const v = stage.toScene(km, 'sun-inertial', tMs).normalize();
    check(v.angleTo(p.clone().normalize()) < 1e-4 && Math.abs(los.length() - 1) < 1e-9, 'in her direction');
    const e = node.matrix.elements;
    const z = new THREE.Vector3(e[8], e[9], e[10]).normalize();
    const tilt = Math.acos(Math.abs(z.dot(p.clone().normalize()))) * 180 / Math.PI;
    check(Math.abs(tilt - 77) < 0.05, `her disc is inclined 77 degrees to our line of sight (${tilt.toFixed(2)})`);
    const meshes = node.children.map((c) => c.geometry);
    const mw = g.group.children.find((c) => c.name === 'galaxy');
    check(meshes.every((geo) => geo !== mw.geometry && geo.getAttribute('position') !== mw.geometry.getAttribute('position')), 'none of her buffers is the Milky Way\'s');
  }
  // The three drawings share one number: the photograph's share, then the hero's, then this copy's.
  g.setAndromedaShare(1); ANDROMEDA_LINK.heroShare = 0; g.update(null, null);
  check(Math.abs(g.andromeda().share - 1) < 1e-9, 'off her photograph\'s line, with no hero, the far copy draws her whole');
  g.setAndromedaShare(0.25); g.update(null, null);
  check(Math.abs(ANDROMEDA_LINK.photo - 0.75) < 1e-9 && Math.abs(g.andromeda().share - 0.25) < 1e-9, 'with her photograph at 0.75 it draws the 0.25 left');
  ANDROMEDA_LINK.heroShare = 1; g.update(null, null);
  check(g.andromeda().share === 0, 'and nothing while the hero draws her');
  ANDROMEDA_LINK.heroShare = 0;
  g.setAndromedaShare(1);
  g.dispose();
  stage.setWorld('earth');
  check(ANDROMEDA_FAR.points.every((n) => n <= 9000), 'the far copy stays small on every tier');
}

// The Milky Way from outside, exposed by its projected density (spec 0075 stage d; scene 15 was white).
{
  let cx = 0, cy = 0, cz = 0, nb = 0;
  for (let i = 0; i < data.count; i++) if (data.kind[i] === 1) { cx += data.posKpc[i * 3]; cy += data.posKpc[i * 3 + 1]; cz += data.posKpc[i * 3 + 2]; nb++; }
  const { eclDirection } = await import(join(JS, 'scene/clusters.js'));
  const pole = eclDirection(NGP_ROW.raDeg, NGP_ROW.decDeg);
  const e = exposeByDensity(data.posKpc, data.weight, data.count, [cx / nb, cy / nb, cz / nb], pole);
  check(Number.isFinite(e.gain) && e.gain > 0 && e.weight.length === data.count, 'every point gets an exposed weight and the cloud a gain');
  // Face-on, cell by cell: how bright the brightest and a typical patch draw, before and after.
  const shown = (w, gain) => {
    const u = [1, 0, 0]; const ux = (() => { const c = [pole[1] * 0 - pole[2] * 1, pole[2] * 0 - pole[0] * 0, pole[0] * 1 - pole[1] * 0]; const l = Math.hypot(...c); return c.map((x) => x / l); })();
    const vx = [pole[1] * ux[2] - pole[2] * ux[1], pole[2] * ux[0] - pole[0] * ux[2], pole[0] * ux[1] - pole[1] * ux[0]];
    const G = 64, half = 16, cell = 32 / G, out = new Float64Array(G * G);
    for (let i = 0; i < data.count; i++) {
      const x = data.posKpc[i * 3] - cx / nb, y = data.posKpc[i * 3 + 1] - cy / nb, z = data.posKpc[i * 3 + 2] - cz / nb;
      const a = Math.floor((x * ux[0] + y * ux[1] + z * ux[2] + half) / cell), b = Math.floor((x * vx[0] + y * vx[1] + z * vx[2] + half) / cell);
      if (a >= 0 && b >= 0 && a < G && b < G) out[b * G + a] += SPRITE_AREA * w[i] * gain * 0.15 * 0.15 / (cell * cell);
    }
    const v = [...out].filter((t) => t > 0).sort((p, q) => p - q);
    void u;
    return { top: v[v.length - 1], p995: v[Math.floor(v.length * 0.995)], mid: v[v.length >> 1] };
  };
  const before = shown(data.weight, e.gain), after = shown(e.weight, e.gain);
  check(after.top / after.mid < 0.5 * before.top / before.mid, `the bulge-to-disc range is compressed (brightest over median ${(before.top / before.mid).toFixed(0)} before, ${(after.top / after.mid).toFixed(0)} after)`);
  check(after.p995 < 1.3 * PEAK && after.p995 > 0.4 * PEAK, `and the brightest patches draw near ${PEAK} of white, not past it (${after.p995.toFixed(2)})`);
  const src = readFileSync(join(JS, 'scene/galaxy.js'), 'utf8');
  const { MW_SHADERS } = await import(join(JS, 'scene/deep/spiral.js'));
  check(/min\( 1\.0, \( ideal \* ideal \) \/ \( s \* s \) \)/.test(MW_SHADERS.vert) && /uOutside/.test(MW_SHADERS.vert) && /S\.MW_SHADERS\.vert/.test(src), 'a point held small gives up its light; from outside, an edge-on view keeps part of its path');
  check(!/^import .*deep\/spiral/m.test(src) && /S\.exposeByDensity/.test(src), 'and the exposure and the shaders arrive with the cloud (a dynamic import), not in the boot bytes');
}

// The dust lanes (public #428): derived from the arms, inside them, thinner, in the real plane.
{
  const { dustLanes, DUST_EVERY, DUST_INSET_KPC, DUST_FLATTEN, DUST_DIM, NORTH_GALACTIC_POLE } = await import(join(JS, 'scene/galaxy.js'));
  const g = data;
  let cx = 0, cy = 0, cz = 0, nb = 0, arms = 0;
  for (let i = 0; i < g.count; i++) {
    if (g.kind[i] === 1) { cx += g.posKpc[i * 3]; cy += g.posKpc[i * 3 + 1]; cz += g.posKpc[i * 3 + 2]; nb++; }
    if (g.kind[i] === 3) arms++;
  }
  const c = [cx / nb, cy / nb, cz / nb];
  const dust = dustLanes(g.posKpc, g.kind, g.count, c);
  check(dust.count === Math.ceil(arms / DUST_EVERY), `one dust patch for every ${DUST_EVERY} arm points (${dust.count} of ${arms})`);
  const n = dust.normal;
  check(Math.abs(Math.hypot(...n) - 1) < 1e-9 && NORTH_GALACTIC_POLE.raDeg > 192.8 && NORTH_GALACTIC_POLE.raDeg < 192.9 && Math.abs(NORTH_GALACTIC_POLE.decDeg - 27.13) < 0.01, 'the plane is the IAU galactic plane');
  // The model's own disc lies in that plane: its arm points' heights are small beside their radii.
  const rms = (pos, count, pick) => { let sh = 0, sr = 0, k = 0; for (let i = 0; i < count; i++) { if (pick && !pick(i)) continue; const x = pos[i * 3] - c[0], y = pos[i * 3 + 1] - c[1], z = pos[i * 3 + 2] - c[2]; const h = x * n[0] + y * n[1] + z * n[2]; sh += h * h; sr += x * x + y * y + z * z - h * h; k++; } return { h: Math.sqrt(sh / k), r: Math.sqrt(sr / k) }; };
  const arm = rms(g.posKpc, g.count, (i) => g.kind[i] === 3);
  const lane = rms(dust.posKpc, dust.count);
  check(arm.h < 0.1 * arm.r, `the arms lie in that plane (rms height ${arm.h.toFixed(2)} kpc at rms radius ${arm.r.toFixed(1)})`);
  check(Math.abs(lane.h / arm.h - DUST_FLATTEN) < 0.05, `the dust is ${DUST_FLATTEN} as thick as the arms (${(lane.h / arm.h).toFixed(2)})`);
  check(lane.r < arm.r && arm.r - lane.r < 2 * DUST_INSET_KPC, `and sits ${DUST_INSET_KPC} kpc inside them (rms radius ${lane.r.toFixed(2)} against ${arm.r.toFixed(2)})`);
  check(DUST_DIM > 0 && DUST_DIM <= 0.25, 'one patch takes at most a quarter of the light behind it');
  const src = readFileSync(join(JS, 'scene/galaxy.js'), 'utf8');
  check(/blendSrc: THREE\.ZeroFactor, blendDst: THREE\.OneMinusSrcAlphaFactor/.test(src), 'dust adds no light: it is drawn with (0, 1 - alpha)');
  const { LAYERS } = await import(join(JS, 'data/layers.js'));
  const text = readFileSync(join(JS, 'data/layers.js'), 'utf8');
  check(/dark lanes are dust drawn along the arms\\u2019 inner edges, where other spirals show it, and are not a map of ours/.test(text) && LAYERS.length > 0, 'the galaxy\'s card says the dust lanes are an illustration');
}

if (problems.length) { console.error('galaxy FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`galaxy ok: ${data.count} points, the centre 8.15 kpc away toward Sagittarius A*, drawn only from a rung, and the card calls it a model`);
