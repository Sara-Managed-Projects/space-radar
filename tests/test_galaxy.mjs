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
const { parseGalaxy, createGalaxy, KPC_KM } = await import(join(JS, 'scene/galaxy.js'));
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

if (problems.length) { console.error('galaxy FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`galaxy ok: ${data.count} points, the centre 8.15 kpc away toward Sagittarius A*, drawn only from a rung, and the card calls it a model`);
