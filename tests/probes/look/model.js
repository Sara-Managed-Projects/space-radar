// model: ONE CRAFT'S MODEL, IN THE APP, FROM FOUR SIDES. Select a record as a click on its row does,
// wait for the file its route names to replace the procedural shape (scene/heroes.js announces it
// with `sr:model-upgraded`), move the clock into sunlight if the craft is in the Earth's shadow, then
// photograph it as the app frames it, from four sides (a quarter turn round it each time, the camera
// kept above the craft) and from overhead.
//
//   gh workflow run look.yml -f probe=model                      # the Cygnus cargo ship in orbit today
//   gh workflow run look.yml -f probe=model -f subject=sat-25544  # any record id
//   gh workflow run look.yml -f probe=model -f subject=crew-dragon # or a name on the stations layer
//
// WHICH RECORD. `subject` (the workflow passes it as ?lookSubject=) when given. Otherwise the first
// record on the stations layer whose name has the word CYGNUS: the model this probe was written for
// (public #938, a shape generated from photographs). IF NO CYGNUS IS UP that day the model is put on
// the ISS's record FOR THE PICTURE ONLY, by pointing that record's route at the file in this page's
// copy of the table, and the summary says so in `standIn`: the pictures then show the model and say
// nothing about who wears it.
//
// THE SHAPE IT REPLACES. When the route has both a build and a file, the same record is photographed
// again wearing the procedural shape, from the same places.
//
// A CANDIDATE. A route that is still procedural, on a tree that has `models/<build>-candidate.glb`, is
// photographed as it ships and then wearing the candidate.
//
// A THIRD VARIANT, WHEN THE SERVED TREE HAS ONE. If `models/<file>-textured.glb` answers, the same
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
// A subject is a record id, or failing that the words of a name with dashes for spaces
// (`crew-dragon`: a visiting vehicle's id changes every flight, and its name does not).
const byName = (words) => stations.find((r) => String(r.name || '').toLowerCase().includes(String(words).toLowerCase().replace(/-/g, ' '))) || null;
let record = asked ? (sr.recordById(asked) || byName(asked)) : stations.find((r) => wordIn(r.name, 'cygnus') && RM.realModelFor(r)) || null;
if (asked && !record) return finish({ ...out, fail: 'no record with the id or the name ' + asked + ' on this page; the stations layer has ' + stations.map((r) => r.id + ' ' + r.name).join(', ') });
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
out.camera = { riding: !!(rig.state && rig.state.riding), following: !!(rig.state && rig.state.following) };

// IN SUNLIGHT. A craft in the Earth's shadow is drawn nearly black, which is right and photographs
// nothing (the first run of this probe, 2026-10-12, met CYGNUS NG-24 eleven minutes before sunrise).
// So the clock is stepped forward five minutes at a time until the craft is out of the shadow, and
// ten minutes more so the Sun is off the horizon. The summary says how far it was moved.
const earthR = () => { try { return sr.worlds.drawnRadiusUnits('earth') || 0; } catch { return 0; } };
const sunlit = () => {
  const obj = heroOf();
  const sun = sr.worlds.meshFor('sun');
  const earth = sr.worlds.meshFor('earth');
  if (!obj || !sun || !earth) return null;
  const p = obj.getWorldPosition(obj.position.clone()).sub(earth.position);
  const s = unit({ x: sun.position.x - earth.position.x, y: sun.position.y - earth.position.y, z: sun.position.z - earth.position.z });
  const along = p.x * s.x + p.y * s.y + p.z * s.z;
  if (along > 0) return true;
  const off = Math.hypot(p.x - along * s.x, p.y - along * s.y, p.z - along * s.z);
  return off > earthR() * 1.01;
};
out.light = { litAtFirst: sunlit(), movedMinutes: 0 };
if (out.light.litAtFirst === false) {
  const t0 = sr.clock.now();
  let found = null;
  for (let k = 1; k <= 14 && found === null; k++) {
    sr.clock.goTo(t0 + k * 5 * 60e3);
    await sleep(3500);
    if (sunlit()) found = k;
  }
  if (found !== null) { sr.clock.goTo(t0 + (found + 2) * 5 * 60e3); await sleep(4000); out.light.movedMinutes = (found + 2) * 5; }
  // The camera followed the craft round the Earth from where it stood, which by now is anywhere
  // (the second run's "as framed" was from inside the clouds). Selected again, it is framed again.
  sr.select(record, { fly: true, undo: false });
  await sleep(10000);
  out.light.lit = sunlit();
  out.light.clock = new Date(sr.clock.now()).toISOString();
  if (!out.light.lit) look.warns.push('probe: the craft was still in the Earth\'s shadow after seventy minutes of stepping; the pictures are of its night side');
}

/** Where the model is in the window and how wide its circle is, for whoever crops the picture. */
const onScreen = () => {
  try {
    const obj = heroOf();
    const v = obj.getWorldPosition(obj.position.clone()).project(sr.camera);
    return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight), px: drawnPx() };
  } catch { return null; }
};
/**
 * The app's own framing, then four sides and one from overhead. THE CAMERA STAYS ABOVE THE CRAFT:
 * a visiting vehicle flies a few hundred kilometres up, and a camera sent to its far side at the
 * angle the app frames it from ends up under the ground looking at the inside of the clouds (the
 * first run did). So the four sides are taken from sixty degrees off the local vertical at most.
 */
const walk = async (tag, what) => {
  const a0 = rig.state.azimuth;
  const p0 = rig.state.polar;
  const take = async (name, words) => {
    await sleep(4000);
    const at = onScreen();
    await shot(tag + '-' + name, what + ', ' + words + '; its circle ' + (at && at.px) + ' px across');
    out.views.push({ name: tag + '-' + name, at });
  };
  await take('1-as-framed', 'as the app frames a selected craft');
  const high = Math.min(p0, 1.05);
  for (const [name, turn] of [['2-side-a', 0], ['3-side-b', Math.PI / 2], ['4-side-c', Math.PI], ['5-side-d', 1.5 * Math.PI]]) {
    rig.setAngles(a0 + turn, high);
    await take(name, Math.round((turn * 180) / Math.PI) + ' degrees round it, from ' + Math.round((high * 180) / Math.PI) + ' degrees off the vertical');
  }
  rig.setAngles(a0 + Math.PI / 4, 0.3);
  await take('6-overhead', 'from nearly overhead');
  rig.setAngles(a0, p0);
  await sleep(1500);
};
await walk('flat', (out.standIn ? 'the model on a stand-in record' : record.name) + ' wearing ' + (entry.file || entry.build || 'its class shape'));

/** Put something else on the hero for a set of pictures; returns the way back. */
const wearInstead = (obj, thing) => {
  const hidden = obj.children.filter((c) => c.visible);
  for (const c of hidden) c.visible = false;
  obj.add(thing);
  return () => { obj.remove(thing); for (const c of hidden) c.visible = true; };
};

// WHAT IT REPLACES. A route with both a build and a file (the Cygnus, JWST, New Horizons) draws the
// procedural shape until the file arrives. The same record wearing that shape, from the same six
// places, is the comparison a person deciding whether the file is an improvement needs.
if (entry.build && entry.file) {
  try {
    const M = await import(urlOf('./js/scene/models.js'));
    const built = M.modelFor(M.builderKlass(record.klass, entry.build), entry.build, { record });
    const obj = heroOf();
    if (!built || !obj) throw new Error('the procedural shape could not be built, or the hero is gone');
    const back = wearInstead(obj, built);
    await sleep(2500);
    out.procedural = { build: entry.build, model: describe(built) };
    await walk('procedural', record.name + ' wearing the procedural shape `' + entry.build + '` that the file replaces (put back by the probe for the comparison)');
    back();
    await sleep(1500);
  } catch (e) { out.procedural = { error: String((e && e.message) || e) }; }
}

// A CANDIDATE FOR A SHAPE THAT IS STILL PROCEDURAL. A route with a build and no file, on a served
// tree that carries `models/<build>-candidate.glb` (a branch kept for looking; main never does): the
// record is photographed again wearing that file through the app's own toon material. This is how a
// generated mesh is looked at in the app BEFORE anybody writes it a registry row or a route.
if (entry.build && !entry.file) {
  const candidate = entry.build + '-candidate.glb';
  let served = false;
  try { served = (await fetch(urlOf('./models/' + candidate), { method: 'HEAD' })).ok; } catch { served = false; }
  out.candidate = { file: candidate, served };
  if (served) {
    try {
      const loaded = await RM.loadRealModel({ file: candidate, colour: entry.colour || 'station' });
      const obj = heroOf();
      if (!loaded || !obj) throw new Error('the candidate did not load, or the hero is gone');
      const wear = loaded.clone(true);
      const back = wearInstead(obj, wear);
      await sleep(2500);
      out.candidate.model = describe(wear);
      await walk('candidate', record.name + ' wearing ' + candidate + ', a candidate with no registry row (the app does not draw this)');
      back();
    } catch (e) { out.candidate.error = String((e && e.message) || e); }
  }
}

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
    const back = wearInstead(obj, wear);
    await sleep(2500);
    out.textured.model = describe(wear);
    await walk('textured', record.name + ' wearing ' + texturedFile + ' with its own texture, unlit (an experiment: the app does not draw this)');
    back();
  } catch (e) { out.textured.error = String((e && e.message) || e); }
}
return finish(out);
