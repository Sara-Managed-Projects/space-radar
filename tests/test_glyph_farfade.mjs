// internal #285: the planet hosts of the Kepler field thin out with the camera's distance on a rung, so from the nearby
// stars they are not a green cloud over the stars; they are full near the camera; the selection is never thinned.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { createGlyphLayer, FAR_FADE_LY } = await import(join(ROOT, 'site/js/scene/glyphs.js'));
const { stage, STAGES } = await import(join(ROOT, 'site/js/scene/stage.js'));
let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };

check(Array.isArray(FAR_FADE_LY.exoplanets) && FAR_FADE_LY.exoplanets[0] < FAR_FADE_LY.exoplanets[1], 'the exoplanet layer has a fade rule');
const was = stage.worldId;
stage.setWorld('stellar'); // a unit is a light-year
const LY = 1; // scene units on the stellar rung
const LY_KM = 9460730472580.8;
const mk = (id, x) => ({ id, name: id, klass: 'exoplanet', cls: 'a', frame: 'sun-inertial', x: x * LY_KM });
const records = [mk('near', 100 * LY), mk('mid', 1500 * LY), mk('far', 3000 * LY)];
const scene = { add() {}, remove() {} };
const run = (layerId, selected) => {
  const layer = createGlyphLayer(scene, { id: layerId, klass: 'exoplanet', frame: 'sun-inertial' });
  layer.setPositionSource((rec) => ({ x: rec.x, y: 0, z: 0, frame: 'sun-inertial' }));
  layer.setRecords(records);
  layer.mesh.visible = true;
  if (selected) layer.setSelected(selected);
  const camera = { position: { x: 0, y: 0, z: 0 }, projectionMatrix: { elements: new Array(16).fill(1) } };
  layer.update(Date.now(), camera);
  const a = layer.mesh.geometry.getAttribute('iOpacity').array;
  return Object.fromEntries(records.map((r, i) => [r.id, a[i]]));
};
const o = run('exoplanets');
check(o.near > 0.95 && o.mid < o.near && o.mid > o.far && Math.abs(o.far - 0.12) < 0.02, `near full, mid thinner, far at the floor: ${JSON.stringify(o)}`);
const other = run('stars');
check(other.near === other.far, `another layer is not thinned: ${JSON.stringify(other)}`);
const sel = run('exoplanets', 'far');
check(sel.far > 0.95, `the selection is never thinned: ${JSON.stringify(sel)}`);
stage.setWorld(was);
if (failed) process.exit(1);
console.log('glyph far fade ok: the Kepler hosts thin from 500 to 2 500 ly out, to a floor of 12 %; the selection and other layers are untouched');
