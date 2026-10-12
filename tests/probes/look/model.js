// model: ONE CRAFT'S MODEL, IN THE APP, FROM FOUR SIDES. Select a record as a click on its row does,
// wait for the file its route names to replace the procedural shape (scene/heroes.js announces it
// with `sr:model-upgraded`), then photograph it at the app's own framing from four sides (the camera
// walks a quarter turn round it each time and keeps its distance and its ride), and once drawn larger.
//
//   gh workflow run look.yml -f probe=model                      # the Cygnus cargo ship in orbit today
//   gh workflow run look.yml -f probe=model -f subject=sat-25544  # any record id
//
// WHICH RECORD. `subject` (the workflow passes it as ?lookSubject=) when given. Otherwise the first
// record on the stations layer whose name has the word CYGNUS: the model this probe was written for
// (public #938, a shape generated from photographs). IF NO CYGNUS IS UP that day the model is put on
// the ISS's record FOR THE PICTURE ONLY, by pointing that record's route at the file in this page's
// copy of the table, and the summary says so in `standIn`: the pictures then show the model and say
// nothing about who wears it.
//
// A SECOND VARIANT, WHEN THE SERVED TREE HAS ONE. If `models/<file>-textured.glb` answers, the same
// record is photographed again wearing it with ITS OWN texture, unlit (the experiment of 2026-10-12:
// the generator's picture against the app's flat colours). main never ships such a file; a branch
// kept for looking may.
//
// What the summary carries besides the pictures: the route (`file`, `build`, `made`), whether the
// file arrived, the meshes, triangles and colours actually on screen, and the card's "drawn as" line.
look.probe = 'model';
const out = { subject: null, standIn: null, views: [] };
const urlOf = (path) => new URL(path, document.baseURI).href;
const wordIn = (name, word) => new RegExp('(^|[^a-z0-9])' + word + '([^a-z0-9]|$)', 'i').test(String(name || ''));
const RM = await import(urlOf('./js/scene/realmodels.js'));

// The stations layer and its records.
try { if (!sr.isLayerOn('stations')) sr.setLayerOn('stations', true); } catch { /* an older ref: it is on by default */ }
await until(() => (sr.recordsFor('stations') || []).length > 0, 90000, 500);
const stations = sr.recordsFor('stations') || [];
out.stations = stations.length;

const asked = new URLSearchParams(location.search).get('lookSubject');
let record = asked ? sr.recordById(asked) : stations.find((r) => wordIn(r.name, 'cygnus') && RM.realModelFor(r)) || null;
if (asked && !record) return finish({ ...out, fail: 'no record with the id ' + asked + ' on this page' });
if (!record) {
  // No Cygnus in orbit today: the ISS's record wears the file for the picture, and says so.
  record = sr.recordById('sat-25544') || stations[0];
  if (!record) return finish({ ...out, fail: 'the stations layer has no record to put the model on' });
  const norad = record.meta && (record.meta.noradId ?? record.meta.catalogueNumber);
  RM.REAL_MODELS.norad[norad] = { ...RM.REAL_MODELS.named.cygnus };
  out.standIn = 'NO CYGNUS IS IN THE SAVED DATA TODAY: the model is drawn on ' + record.name + ' (' + record.id + ') for the picture only';
}
const entry = RM.realModelFor(record) || {};
out.subject = { id: record.id, name: record.name, klass: record.klass, layer: record.layer };
out.route = { file: entry.file || null, build: entry.build || null, name: entry.name || null, generic: !!entry.generic, made: entry.made || null };

// Select it, and wait for its file.
let upgraded = !entry.file;
window.addEventListener('sr:model-upgraded', (e) => { if (e.detail && e.detail.id === record.id) upgraded = true; });
sr.select(record, { fly: true, undo: false });
await sleep(9000);
out.arrived = await until(() => upgraded && sr.heroes && sr.heroes.drawnOpacity(record.id) > 0.98, 120000, 500);
if (!out.arrived) out.fail = entry.file ? 'the file ' + entry.file + ' never replaced the procedural shape (sr:model-upgraded did not fire in two minutes)' : 'the model never reached full opacity';
await sleep(2500);

/** The object the hero layer draws for the record, and what is in it. */
const heroOf = () => { let got = null; sr.scene.traverse((o) => { if (!got && o.userData && o.userData.recordId === record.id && o.visible && o.parent) got = o; }); return got; };
const describe = (obj) => {
  const d = { meshes: 0, triangles: 0, colours: [], names: [], textured: 0, realModel: !!(obj && obj.userData.realModel) };
  if (!obj) return d;
  obj.traverse((n) => {
    if (!n.isMesh || !n.visible) return;
    d.meshes += 1;
    const g = n.geometry;
    d.triangles += g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0;
    for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
      if (!m) continue;
      if (m.map && m.map.image && (m.map.image.height || 0) > 4) d.textured += 1;
      const hex = m.color ? '#' + m.color.getHexString() : null;
      if (hex && !d.colours.includes(hex)) d.colours.push(hex);
    }
    if (n.name && !d.names.includes(n.name)) d.names.push(n.name);
  });
  return d;
};
/** How many CSS pixels the drawn model spans (its bounding circle), from the camera's own projection. */
const drawnPx = () => {
  try {
    const obj = heroOf();
    const reach = sr.heroes.drawnReach(record.id);
    const cam = sr.camera;
    const dist = cam.position.distanceTo(obj.getWorldPosition(obj.position.clone()));
    return Math.round((2 * reach / dist) * cam.projectionMatrix.elements[5] * innerHeight / 2);
  } catch { return null; }
};
out.model = describe(heroOf());
out.drawnPx = drawnPx();
try {
  const lines = [...document.querySelectorAll('[class*="sr-card"]')].map((n) => (n.children.length ? '' : String(n.textContent || '').trim())).filter((t) => /^drawn /.test(t));
  out.cardLine = lines[0] || null;
} catch { out.cardLine = null; }
out.riding = !!(rig.state && rig.state.riding);

/** Four sides at the app's framing, then one drawn as large as the hero layer allows. */
const walk = async (tag, what) => {
  const a0 = rig.state.azimuth;
  const p0 = rig.state.polar;
  const sides = [['1-as-framed', 0, p0], ['2-quarter-turn', Math.PI / 2, p0], ['3-half-turn', Math.PI, p0], ['4-three-quarters', 1.5 * Math.PI, p0]];
  for (const [name, turn, polar] of sides) {
    rig.setAngles(a0 + turn, polar);
    await shot(tag + '-' + name, what + ', ' + name.slice(2).replace(/-/g, ' ') + ' (' + Math.round((turn * 180) / Math.PI) + ' degrees round it); drawn ' + drawnPx() + ' px across', 4000);
    out.views.push(tag + '-' + name);
  }
  // From above its orbit plane as the camera has it, so the top is seen once.
  rig.setAngles(a0 + Math.PI / 4, Math.max(0.35, p0 - 0.9));
  await shot(tag + '-5-from-above', what + ', an eighth of a turn on and from higher up', 4000);
  rig.setAngles(a0, p0);
  // LARGER, for the picture: heroes.js sizes a selected model by record.meta.sizeM up to 1.45 times
  // its 260 px. The probe says the craft is very large, takes the picture and takes the word back.
  const meta = record.meta || (record.meta = {});
  const had = meta.sizeM;
  meta.sizeM = 1e4;
  await sleep(1500);
  await shot(tag + '-6-larger', what + ', drawn as large as the hero layer ever draws a selected model (' + drawnPx() + ' px): larger than a visitor sees this craft', 4000);
  if (had === undefined) delete meta.sizeM; else meta.sizeM = had;
  await sleep(800);
};
await walk('flat', (out.standIn ? 'the model on a stand-in record' : record.name) + ' wearing ' + (entry.file || entry.build || 'its class shape'));

// The textured variant, only where the served tree carries one.
const texturedFile = entry.file ? entry.file.replace(/\.glb$/, '-textured.glb') : null;
let hasTextured = false;
if (texturedFile) { try { hasTextured = (await fetch(urlOf('./models/' + texturedFile), { method: 'HEAD' })).ok; } catch { hasTextured = false; } }
out.textured = { file: texturedFile, served: hasTextured };
if (hasTextured) {
  try {
    const THREE = await import(urlOf('./vendor/three.module.min.js'));
    const loaded = await RM.loadRealModel({ file: texturedFile, colour: entry.colour || 'station' }, { keepMaterials: true });
    const obj = heroOf();
    if (!loaded || !obj) throw new Error('the textured file did not load, or the hero is gone');
    const wear = loaded.clone(true);
    wear.traverse((n) => {
      if (!n.isMesh) return;
      const m = Array.isArray(n.material) ? n.material[0] : n.material;
      // UNLIT: the generator's picture exactly as it is, with the light of the photograph in it.
      n.material = new THREE.MeshBasicMaterial({ map: m && m.map ? m.map : null, color: 0xffffff });
    });
    for (const child of obj.children) child.visible = false;
    obj.add(wear);
    await sleep(2500);
    out.textured.model = describe(wear);
    await walk('textured', record.name + ' wearing ' + texturedFile + ' with its own texture, unlit (an experiment: the app does not draw this)');
  } catch (e) { out.textured.error = String((e && e.message) || e); }
}
return finish(out);
