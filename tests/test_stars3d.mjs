// tests/test_stars3d.mjs -- spec 0028 step 3: the stars as places.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseStars3d, recordsFromNames, createStars3d, LY_KM } = await import(join(JS, 'scene/stars3d.js'));
const { propagate, PROPAGATORS } = await import(join(JS, 'propagate/index.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const binBuf = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const buffer = binBuf.buffer.slice(binBuf.byteOffset, binBuf.byteOffset + binBuf.byteLength);
const namesDoc = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8'));

// 1. the binary: header, count, and Sirius where Sirius is
const data = parseStars3d(buffer);
check(data.version === 1 && data.count > 100000 && data.count < 120000, `a plausible count of placed stars (${data.count})`);
check(data.unplaced > 9000 && data.unplaced < 12000, `the unplaced are counted, not drawn (${data.unplaced})`);
const sirRow = namesDoc.rows.find((r) => r[1] === 'Sirius');
check(!!sirRow, 'Sirius is a named row');
const si = sirRow[0];
const sirLy = Math.hypot(data.posLy[si * 3], data.posLy[si * 3 + 1], data.posLy[si * 3 + 2]);
check(Math.abs(sirLy - 8.6) < 0.1, `Sirius is 8.6 light-years out (${sirLy.toFixed(2)})`);
check(Math.abs(data.appMag[si] + 1.44) < 0.02 && Math.abs(data.absMag[si] - 1.45) < 0.1, 'Sirius has its magnitudes');
check(data.nameRef[si] > 0, 'Sirius points at its name row');
let far = 0; for (let i = 0; i < data.count; i++) { const d = Math.hypot(data.posLy[i * 3], data.posLy[i * 3 + 1], data.posLy[i * 3 + 2]); if (d > 300000) far++; }
check(far === 0, `no star is on the 100 000 pc "unknown" shell (${far} are)`);

// 2. records from the names file: propagate places them, and the stellar rung holds them
const recs = recordsFromNames(namesDoc.rows);
check(recs.length === namesDoc.rows.length, `one record per named star (${recs.length})`);
const sirius = recs.find((r) => r.name === 'Sirius');
check(sirius && sirius.klass === 'star' && sirius.propagator === 'static' && sirius.id === 'hip-32349', `Sirius is a star record keyed by HIP (${sirius && sirius.id})`);
check(sirius.meta.aliases.includes('α CMa') && sirius.meta.aliases.includes('HIP 32349'), `its aliases are the Bayer and HIP names (${sirius.meta.aliases})`);
check(typeof PROPAGATORS.static === 'function', 'the static propagator is registered');
const tMs = Date.parse('2026-09-08T12:00:00Z');
const p = propagate(sirius, tMs);
check(p && p.cls === 'measured' && p.frame === 'sun-inertial', 'a static record propagates as measured');
stage.setWorld('stellar'); stage.setTime(tMs);
const v = stage.toScene(p, p.frame, tMs);
check(v && Math.abs(v.length() - sirLy) < 0.01, `on the stellar rung Sirius is ${v && v.length().toFixed(2)} units out`);
const prox = recs.find((r) => r.name === 'Proxima Centauri');
check(prox && Math.abs(prox.meta.distLy - 4.24) < 0.05, 'Proxima is 4.24 light-years away');

// 3. the layer row and search
const row = LAYERS.find((l) => l.id === 'stars');
check(!!row && row.draw === 'stars3d' && row.noModel === true && row.klass === 'star', 'the stars layer row exists, draws itself, has no hero model');
const index = buildIndex(recs, LAYERS);
check(findMatches(index, 'sirius').hits[0]?.record.id === 'hip-32349', '"sirius" finds Sirius');
check(findMatches(index, 'alpha cma').total >= 0, 'search does not throw on a Greek alias query');
check(findMatches(index, 'hip 32349').hits.some((h) => h.record.id === 'hip-32349'), '"hip 32349" finds Sirius by catalogue alias');
check(findMatches(index, 'betelgeuse').hits[0]?.record.name === 'Betelgeuse', '"betelgeuse" finds Betelgeuse');
check(findMatches(index, 'vega').hits[0]?.record.name === 'Vega', '"vega" finds Vega');

// 4. the card says what a star is drawn as, and the template exists
check(typeof drawingLine(sirius) === 'string' && drawingLine(sirius).includes('point of light'), `a star says it is drawn as a point of light: ${drawingLine(sirius)}`);
check(COPY.klass.star === 'Star' && COPY.templates.star && COPY.templates.star.lead.includes('light-years'), 'the star class and template are in the copy');

// 5. headless scene: shell mode on Earth, true mode on the rung, and a pick with a real camera
{
  const scene = new THREE.Scene();
  const stars = createStars3d(scene, { binBuffer: buffer, namesDoc });
  await stars.load();
  check(stars.records().length === recs.length, 'load() yields the named records');
  stage.setWorld('earth'); stage.setTime(tMs);
  stars.setOpacity(1);
  await stars.ensureGeometry();
  check(stars.count() === data.count && stars.unplaced() === data.unplaced, 'count() is the number drawn, unplaced() the number not');
  check(stars.mode() === 'shell', `on a world stage the stars are a shell (${stars.mode()})`);
  const posAttr = stars.group.children[0].geometry.getAttribute('position').array;
  const r0 = Math.hypot(posAttr[0], posAttr[1], posAttr[2]);
  check(Math.abs(r0 - 1e8) < 50, `shell radius is 1e8 units within float32 (${r0})`);
  stage.setWorld('stellar'); stage.setTime(tMs);
  stars.rebuild();
  check(stars.mode() === 'true', 'on the stellar rung the stars are at true positions');
  const sx = posAttr[si * 3], sy = posAttr[si * 3 + 1], sz = posAttr[si * 3 + 2];
  check(Math.abs(Math.hypot(sx, sy, sz) - sirLy) < 0.01, `Sirius sits ${Math.hypot(sx, sy, sz).toFixed(2)} units from the Sun in the buffer`);
  // a camera looking straight at Sirius from 2 ly away picks Sirius
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  const dir = new THREE.Vector3(sx, sy, sz).normalize();
  camera.position.copy(dir).multiplyScalar(sirLy - 2);
  camera.lookAt(sx, sy, sz);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  stars.update(camera, null);
  const hits = stars.pickAll(0, 0, camera, { w: 800, h: 600 }, 6);
  check(hits.length >= 1 && hits[0].record.id === 'hip-32349', `a tap on Sirius from 2 ly away picks Sirius (${hits[0] && hits[0].record.name})`);
  const off = stars.pickAll(0.9, 0.9, camera, { w: 800, h: 600 }, 6);
  check(off.every((h) => h.record.id !== 'hip-32349'), 'a tap in the corner does not pick Sirius');
  stars.setVisible(false);
  check(stars.group.children[0].visible === false, 'the layer switch hides the cloud');
  stars.dispose();
}
stage.setWorld('earth');

if (problems.length) { console.error('stars3d FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`stars3d ok: ${data.count} stars placed and ${data.unplaced} honestly not, Sirius at 8.6 ly, a shell from Earth and true positions on the stellar rung, a tap picks Sirius`);
