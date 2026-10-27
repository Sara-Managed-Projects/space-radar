// model: ONE CRAFT'S MODEL, IN THE APP, FROM FOUR SIDES. Select a record as a click on its row does,
// wait for the file its route names to replace the procedural shape (scene/heroes.js announces it
// with `sr:model-upgraded`), move the clock into sunlight if the craft is in the Earth's shadow, then
// photograph it as the app frames it and from five places on its SUNWARD side, at the same distance,
// the camera never below the craft, and then once from BELOW it, from the Earth's side looking up at
// its Earth face (see `walk`): seven views.
// 0077 W1-a: begin
// THEN THE CLOSE-UP SHEET (release 1.3.0, stage W1-a): four more, the model filling nine tenths of the
// picture's short side through a lens for looking only (`lensOn`, `CLOSE`): right and left from the
// sunward side, square onto the lit face, and from the Earth's side. A route with a file is photographed
// wearing the shape it replaces as framed and from the same four close places. A list of craft is one run
// (`-f subject=sat-48274_sat-30580_deep-new-horizons`). Each picture of the sheet is named `...-close-N-...`.
// 0077 W1-a: end
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
// THE SHAPE IT REPLACES. When the route has a file, the same record is photographed again wearing
// the procedural shape the file replaces (the route's build, or its class shape when the route
// names none), from the same places.
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
const urlOf = (path) => new URL(path, document.baseURI).href;
const wordIn = (name, word) => new RegExp('(^|[^a-z0-9])' + word + '([^a-z0-9]|$)', 'i').test(String(name || ''));
const RM = await import(urlOf('./js/scene/realmodels.js'));

// The stations layer and its records.
try { if (!sr.isLayerOn('stations')) sr.setLayerOn('stations', true); } catch { /* an older ref: it is on by default */ }
await until(() => (sr.recordsFor('stations') || []).length > 0, 90000, 500);
const stations = sr.recordsFor('stations') || [];

// SEVERAL SUBJECTS IN ONE RUN (2026-10-13): ids joined by an underscore, `sat-57800_sat-38358`. A
// batch of four models is then one run and not four, and the four are photographed at the same
// clock by the same browser. Each subject's pictures carry its id (`sat-57800--flat-1-as-framed`)
// and the summary carries one entry a subject under `subjects`; any one's `fail` fails the run.
// No record id and no name on the stations layer has an underscore in it.
const param = new URLSearchParams(location.search).get('lookSubject');
const one = async (askedAs, prefix) => {
const out = { subject: null, standIn: null, views: [], stations: stations.length };
// A ROUTE WITH NO CRAFT UP TODAY (2026-10-13, batch three: no Cargo Dragon is in orbit): the subject
// `sat-100882.as.dragon-crs` photographs the named route `dragon crs` on that record, FOR THE PICTURE
// ONLY, as the Cygnus's stand-in below does; the summary says so in `standIn`.
const [asked, wearAs] = String(askedAs || '').includes('.as.') ? String(askedAs).split('.as.') : [askedAs, null];
// A subject is a record id, or failing that the words of a name with dashes for spaces
// (`crew-dragon`: a visiting vehicle's id changes every flight, and its name does not).
const byName = (words) => stations.find((r) => String(r.name || '').toLowerCase().includes(String(words).toLowerCase().replace(/-/g, ' '))) || null;
// A subject on another layer (a satellite worth knowing, a bright one) arrives when its layer's
// file does, which is after the stations: wait for it before saying it is not there.
if (asked) {
  const there = () => sr.recordById(asked) || byName(asked);
  await until(there, 60000, 500);
  // NOT ON A LAYER THAT IS ON BY DEFAULT (2026-10-13: LAGEOS 1 is only in the whole active catalogue).
  // A visitor reaches it by turning "All active satellites" on, one tap; so does the probe, and the
  // summary says it did. The run saves that catalogue's column twin for this probe (look.yml).
  if (!there()) {
    try { if (!sr.isLayerOn('active')) { sr.setLayerOn('active', true); out.layerTurnedOn = 'active'; } } catch { /* an older ref has no such layer */ }
    await until(there, 180000, 500);
  }
}
let record = asked ? (sr.recordById(asked) || byName(asked)) : stations.find((r) => wordIn(r.name, 'cygnus') && RM.realModelFor(r)) || null;
if (asked && !record) return ({ ...out, fail: 'no record with the id or the name ' + asked + ' on this page; the stations layer has ' + stations.map((r) => r.id + ' ' + r.name).join(', ') });
if (!record) {
  // No Cygnus in orbit today: the ISS's record wears the file for the picture, and says so.
  record = sr.recordById('sat-25544') || stations[0];
  if (!record) return finish({ ...out, fail: 'the stations layer has no record to put the model on' });
  const norad = record.meta && (record.meta.noradId ?? record.meta.catalogueNumber);
  RM.REAL_MODELS.norad[norad] = { ...RM.REAL_MODELS.named.cygnus };
  out.standIn = 'NO CYGNUS IS IN THE SAVED DATA TODAY: the model is drawn on ' + record.name + ' (' + record.id + ') for the picture only';
}
if (wearAs) {
  const key = wearAs.replace(/-/g, ' ');
  // 0078 r14-m1: begin -- a route key with a slash or a hyphen of its own (`atlas 5 centaur r/b`, `breeze-m r/b`) cannot be spelled in a subject (letters, digits, dot, dash, underscore, 80 in all): the first key that STARTS with the subject's letters and digits wears (`sat-26474.as.atlas5`, `sat-22830.as.falcon9`)
  const alnum = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const worn = RM.REAL_MODELS.named[key] || RM.REAL_MODELS.named[Object.keys(RM.REAL_MODELS.named).find((k) => alnum(k).startsWith(alnum(wearAs)))];
  // 0078 r14-m1: end
  if (!worn) return ({ ...out, fail: 'no named route `' + key + '` to put on ' + record.name });
  const norad = record.meta && (record.meta.noradId ?? record.meta.catalogueNumber);
  RM.REAL_MODELS.norad[norad] = { ...worn };
  out.standIn = 'THE ROUTE `' + key + '` IS DRAWN ON ' + record.name + ' (' + record.id + ') FOR THE PICTURE ONLY: no craft of that name is in the saved data today';
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
// 0077 W1-a: begin
/**
 * A LENS FOR LOOKING, NOT A VIEW A VISITOR GETS (2026-10-20, release 1.3.0 stage W1-a). The hero layer draws a
 * selected craft at a constant size on screen (scene/heroes.js SELECTED_PX, 260 px), whatever the camera's
 * distance, so a camera moved nearer sees the same 260 px. A reviewer judging foil seams, struts and cell
 * grids beside a photograph needs the model to fill the picture. So, for the close-up sheet only, every
 * mesh of the hero scales it by `k` just before it is drawn (onBeforeRender: after heroes.js has written
 * this frame's scale, before three.js reads the matrix), and the walk stands at 1/k of the framing distance:
 * the model is exactly as big IN THE WORLD as the app draws it (no new clash with the Earth or a neighbour)
 * and k times bigger on screen. Nothing in site/ changes. Returns the way back.
 */
const lensOn = (k) => {
  const obj = heroOf();
  if (!obj) return () => {};
  let applied = NaN;
  const grow = () => {
    if (obj.scale.x === applied) return;            // this frame's scale is already grown
    obj.scale.multiplyScalar(k);
    applied = obj.scale.x;
    obj.updateMatrixWorld(true);
  };
  const meshes = [];
  obj.traverse((n) => { if (n.isMesh) { meshes.push([n, n.onBeforeRender]); n.onBeforeRender = grow; } });
  lensState.k = k;
  lensState.grown = () => obj.scale.x === applied;  // drawnReach reads the scale as it stands now
  return () => { for (const [n, f] of meshes) n.onBeforeRender = f; lensState.k = 1; lensState.grown = () => false; };
};
const lensState = { k: 1, grown: () => false };
// 0077 W1-a: end
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
// A SITE ON ANOTHER WORLD (2026-10-15, batch eleven: Curiosity at Gale crater). Everything below was the
// Earth's: the shadow test, the frame the camera walks in, the room under a craft. A landing site stands on
// its own world (registry/sites.yaml `world`, carried as meta.world), is lit when the Sun is up over it,
// and has no underside to look at; the first run photographed Gale at night, from places inside Mars.
const onGround = record.klass === 'site' && !!(record.meta && record.meta.world);
const home = onGround ? record.meta.world : 'earth';
const earthR = () => { try { return sr.worlds.drawnRadiusUnits(home) || 0; } catch { return 0; } };
const sunlit = () => {
  const obj = heroOf();
  const sun = sr.worlds.meshFor('sun');
  const earth = sr.worlds.meshFor(home);
  if (!obj || !sun || !earth) return null;
  const p = obj.getWorldPosition(obj.position.clone()).sub(earth.position);
  const s = unit({ x: sun.position.x - earth.position.x, y: sun.position.y - earth.position.y, z: sun.position.z - earth.position.z });
  const along = p.x * s.x + p.y * s.y + p.z * s.z;
  // On the ground: the Sun at least 25 degrees above the site's horizon.
  if (onGround) return along / Math.max(1e-9, Math.hypot(p.x, p.y, p.z)) > Math.sin((25 * Math.PI) / 180);
  if (along > 0) return true;
  const off = Math.hypot(p.x - along * s.x, p.y - along * s.y, p.z - along * s.z);
  return off > earthR() * 1.01;
};
out.light = { litAtFirst: sunlit(), movedMinutes: 0 };
// ON THE GROUND THE CARD'S OWN LAMP (the second Gale run, 2026-10-15): a step of the clock that the test
// above called daylight still drew the rover black on black ground, and the card offered "Light it". That
// lamp (scene/models.js setFloodLight, our light and not the Sun's, said on the card while it is on) is what
// a visitor presses there, so the probe presses it too, and every picture's line says so.
const MM = onGround ? await import(urlOf('./js/scene/models.js')) : null;
if (MM && typeof MM.setFloodLight === 'function') { MM.setFloodLight(true); out.light.flood = true; look.warns.push('probe: ' + record.id + ' is photographed under the card\'s lamp ("Light it"), not in the Sun\'s light'); }
if (out.light.litAtFirst === false && !onGround) {
  const t0 = sr.clock.now();
  let found = null;
  // A site waits for its morning: an hour a step, a little more than a day of Mars.
  const step = onGround ? 60 : 5, steps = onGround ? 26 : 14, more = onGround ? 1 : 2;
  for (let k = 1; k <= steps && found === null; k++) {
    sr.clock.goTo(t0 + k * step * 60e3);
    await sleep(3500);
    if (sunlit()) found = k;
  }
  if (found !== null) { sr.clock.goTo(t0 + (found + more) * step * 60e3); await sleep(4000); out.light.movedMinutes = (found + more) * step; }
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
 * The app's own framing, then FIVE LIT, FRAMED VIEWS FROM THE SUNWARD SIDE (2026-10-13, the second
 * batch of models). The first walk turned the camera round the craft by the rig's own azimuth, a
 * quarter turn at a time: its 180-degree view was black in EVERY run (the camera stood on the
 * craft's unlit side with the Sun in its eyes, or behind the Earth), and a wing was photographed
 * from its back more often than from its cells. A craft is lit by the Sun and nothing else, so the
 * camera now stands where the light comes from, in the frame the app itself orients a craft by
 * (scene/models.js updateModelAttitude, `sun-panels`):
 *
 *   Z  toward the Earth's centre (the craft's +Z, its Earth face);
 *   X  the Sun crossed with Z (the craft's panel axis);
 *   Y  Z crossed with X: the Sun's direction laid flat on the local horizon (the cells' side).
 *
 * In that frame the Sun is at (0, +, -) whenever the craft is in daylight. Every place below but the
 * last has y > 0 and z <= 0, which makes three promises at once: THE SUN IS BEHIND THE CAMERA (the faces it
 * sees are lit, and there is no glare); THE CAMERA IS NEVER BELOW THE CRAFT (z <= 0 is at or above
 * its altitude, so the line of sight cannot pass through the Earth, and the ground is a backdrop at
 * most); and the cell side of a wing faces it. The distance is the one the app framed the craft at,
 * so the craft fills the same share of every picture. For a craft with another attitude (a tumbling
 * sphere) the frame is still the Sun's and the Earth's, which is all a lit view needs.
 */
const sunFrame = () => {
  const obj = heroOf();
  const sun = sr.worlds.meshFor('sun');
  const earth = sr.worlds.meshFor(home);
  if (!obj || !sun || !earth) return null;
  const p = obj.getWorldPosition(obj.position.clone());
  const z = unit({ x: earth.position.x - p.x, y: earth.position.y - p.y, z: earth.position.z - p.z });
  const s = unit({ x: sun.position.x - p.x, y: sun.position.y - p.y, z: sun.position.z - p.z });
  let x = cross(s, z);
  if (Math.hypot(x.x, x.y, x.z) < 1e-4) x = cross({ x: 0, y: 1, z: 0 }, z);   // the Sun exactly overhead
  x = unit(x);
  return { x, y: unit(cross(z, x)), z, s };
};
// [name, the place in that frame (x along the panels, y sunward along the horizon, z down), words]
const PLACES = [
  ['2-sunward-right', [0.62, 0.66, -0.42], 'from the sunward side, to the right of the panel axis and above'],
  ['3-sunward-left', [-0.62, 0.66, -0.42], 'from the sunward side, to the left and above'],
  ['4-sun-face', [0.14, 0.93, -0.34], 'square onto the face the Sun lights (a wing\'s cells)'],
  ['5-along-the-panels', [0.9, 0.32, -0.3], 'along the panel axis, the Sun over the camera\'s shoulder'],
  ['6-from-above', [0.3, 0.42, -0.86], 'from above, away from the Earth, leaning sunward'],
  // THE SEVENTH, FROM THE EARTH'S SIDE (2026-10-13, internal #751). The six above never show a craft's
  // Earth face, and on a navigation or a radar satellite that is the face with the antennas on it:
  // batch six's GPS helices showed only at the body's edge. This one stands BELOW the craft (z > 0)
  // and looks up at it, still on the Sun's side of it, so the sunward flank is lit; the camera is the
  // framing distance from the craft, tens of metres, so the Earth is behind it and not in the way.
  // The Earth face itself is in sunlight only when the Sun is below the craft's own horizon (low Sun,
  // or a high orbit); otherwise it wears the toon ramp's shade tone, and the view's line says which.
  ['7-from-below', [0.34, 0.5, 0.8], 'from the Earth\'s side, looking up at the Earth face', 'below'],
];
// 0077 W1-a: begin
// `opts` (2026-10-20, release 1.3.0 stage W1-a, internal spec 0077): `places` (default PLACES), `share` (the
// camera's distance as a share of the framing distance, default 1), `lens` (the model drawn this many times
// its selected size for the walk, default 1; see `lensOn`), and `framed` (take the app's own framing first,
// default true). The close-up sheet below is this walk with places CLOSE, share 1/k and lens k.
const walk = async (tag, what, opts = {}) => {
  const places = opts.places || PLACES;
  const k = opts.lens > 1 ? opts.lens : 1;
  const a0 = rig.state.azimuth;
  const p0 = rig.state.polar;
  const dFramed = rig.state.distance;
  const d0 = dFramed * (opts.share > 0 ? opts.share : 1);
  const lensOff = k > 1 ? lensOn(k) : () => {};
// 0077 W1-a: end
  const take = async (name, words, extra) => {
    await sleep(4000);
    const at = onScreen();
    if (at && at.px && k > 1 && !lensState.grown()) at.px = Math.round(at.px * k); // 0077 W1-a: the circle as drawn
    await shot(prefix + tag + '-' + name, what + ', ' + words + '; its circle ' + (at && at.px) + ' px across' + (k > 1 ? ' (drawn ' + k.toFixed(2) + ' times its selected size from ' + Math.round((d0 / dFramed) * 100) + ' % of the framing distance: the same size in the world, nearer; for looking only)' : ''));
    out.views.push({ name: prefix + tag + '-' + name, at, ...(extra || {}) });
  };
  if (opts.framed !== false) await take('1-as-framed', 'as the app frames a selected craft');
  for (const [name, [lx, ly, lz], words, side] of places) { // 0077 W1-a
    const f = sunFrame();
    if (!f) { look.warns.push('probe: no Sun or no Earth in the scene; ' + name + ' was not taken'); continue; }
    let d = unit(mix(mix(f.x, lx, f.y, ly), 1, f.z, lz));
    // The Sun below the craft's horizon (a craft lit over the night side): lean toward the light.
    let lit = d.x * f.s.x + d.y * f.s.y + d.z * f.s.z;
    if (lit < 0.2) { d = unit(mix(d, 1, f.s, 0.6)); lit = d.x * f.s.x + d.y * f.s.y + d.z * f.s.z; }
    const above = -(d.x * f.z.x + d.y * f.z.y + d.z * f.z.z);
    if (side === 'below' && onGround) { look.warns.push('probe: ' + name + ' not taken for ' + record.id + ': a site on the ground has no underside'); continue; }
    if (side === 'below') {
      // The lean toward the light may have lifted it: it stays at least 30 degrees under the craft's horizon.
      const under = d.x * f.z.x + d.y * f.z.y + d.z * f.z.z;
      if (under < 0.5) d = unit(mix(d, 1, f.z, 0.5 - under + 0.3));
      lit = d.x * f.s.x + d.y * f.s.y + d.z * f.s.z;
      // The Earth face's normal is +Z: it is in sunlight when the Sun is on its side of the craft's horizon.
      const sunOnFace = f.s.x * f.z.x + f.s.y * f.z.y + f.s.z * f.z.z;
      const deg = (c) => Math.round((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
      // A LOW CRAFT HAS NO ROOM UNDER IT (the first run, 2026-10-13: MetOp-B at 833 km). The map draws a
      // craft far larger than it is, so the framing distance of a low one is hundreds of kilometres, and
      // a camera that far under it is inside the sphere the rig keeps every camera out of (the world's
      // radius times 1.02, scene/camera.js clearWorld): the rig then puts the camera on the FAR side of
      // the Earth and the picture is of the ocean. So the place is tried less steeply, and then nearer,
      // until the camera is outside that sphere; the view's line says what it took.
      const obj = heroOf();
      const p = obj.getWorldPosition(obj.position.clone());
      const e = sr.worlds.meshFor(home).position;
      const keepOut = earthR() * 1.02 * 1.02;
      const clear = (dir, dist) => Math.hypot(p.x + dir.x * dist - e.x, p.y + dir.y * dist - e.y, p.z + dir.z * dist - e.z) > keepOut;
      const flat = unit(mix(d, 1, f.z, -(d.x * f.z.x + d.y * f.z.y + d.z * f.z.z)));       // the same heading, on the craft's horizon
      let dist = d0;
      let found = clear(d, dist) ? d : null;
      let underDeg = found ? 90 - deg(found.x * f.z.x + found.y * f.z.y + found.z * f.z.z) : null;
      for (const scale of [1, 0.75, 0.55, 0.4]) {
        for (const tan of [0.9, 0.7, 0.5, 0.36, 0.25]) {                                    // 42 to 14 degrees under the horizon
          if (found) break;
          const tryDir = unit(mix(flat, 1, f.z, tan));
          if (clear(tryDir, d0 * scale)) { found = tryDir; dist = d0 * scale; underDeg = Math.round((Math.atan(tan) * 180) / Math.PI); }
        }
      }
      if (!found) { look.warns.push('probe: ' + name + ' was not taken: the craft is drawn too low over the Earth for a camera under it at any distance tried'); continue; }
      d = found;
      lit = d.x * f.s.x + d.y * f.s.y + d.z * f.s.z;
      rig.flyTo({ offset: d, distance: dist, ms: 0 });
      await take(name, words + ', ' + underDeg + ' degrees under its horizon' + (dist < d0 ? ' and at ' + Math.round((dist / d0) * 100) + ' % of the framing distance (a low craft: no room under it)' : '')
        + '; the Sun ' + deg(lit) + ' degrees from the line of sight; the Earth face is ' + (sunOnFace > 0.03 ? 'in sunlight (the Sun ' + (90 - deg(sunOnFace)) + ' degrees below the craft\'s horizon)' : 'in its own shade, the sunward flank lit'),
        { sunAngleDeg: deg(lit), aboveHorizon: false, fromBelow: true, earthFaceSunlit: sunOnFace > 0.03, underHorizonDeg: underDeg, distanceShare: dist / d0 });
      continue;
    }
    if (above < 0) { d = unit(mix(d, 1, f.z, above)); }                    // never below the craft: flatten onto its horizon
    rig.flyTo({ offset: d, distance: d0, ms: 0 });
    await take(name, words + '; the Sun ' + Math.round((Math.acos(Math.max(-1, Math.min(1, lit))) * 180) / Math.PI) + ' degrees from the line of sight',
      { sunAngleDeg: Math.round((Math.acos(Math.max(-1, Math.min(1, lit))) * 180) / Math.PI), aboveHorizon: above >= 0 });
  }
  lensOff(); // 0077 W1-a
  rig.flyTo({ azimuth: a0, polar: p0, distance: dFramed, ms: 0 }); // 0077 W1-a
  await sleep(1500);
};
await walk('flat', (out.standIn ? 'the model on a stand-in record' : record.name) + ' wearing ' + (entry.file || entry.build || 'its class shape') + (out.light.flood ? ' under the card\'s lamp' : ''));
// 0077 W1-a: begin
// THE CLOSE-UP SHEET (2026-10-20, release 1.3.0 stage W1-a; internal spec 0077 task 1, internal #751). Four
// angles, each with the model filling about nine tenths of the picture's short side (the lens above), for a
// contact sheet beside a photograph of the craft: right and left of the panel axis from the sunward side,
// square onto the lit face, and from the Earth's side looking up at the Earth face. Every later model stage
// proves its craft with these four (`views` whose name has `-close-`; each carries `at`, the model's centre
// and circle, for whoever crops them).
const CLOSE = [
  ['close-1-sunward-right', [0.62, 0.66, -0.42], 'close up, from the sunward side, right of the panel axis and above'],
  ['close-2-sunward-left', [-0.62, 0.66, -0.42], 'close up, from the sunward side, left and above'],
  ['close-3-sun-face', [0.14, 0.93, -0.34], 'close up, square onto the lit face'],
  ['close-4-earth-side', [0.34, 0.5, 0.8], 'close up, from the Earth\'s side, looking up at the Earth face', 'below'],
];
const fill = 0.9 * Math.min(innerWidth, innerHeight);
const lensK = out.drawnPx > 0 ? Math.max(1, Math.min(4, fill / out.drawnPx)) : 2.5;
out.close = { lens: Math.round(lensK * 100) / 100, framedPx: out.drawnPx, fillPx: Math.round(fill) };
await walk('flat', (out.standIn ? 'the model on a stand-in record' : record.name) + ' wearing ' + (entry.file || entry.build || 'its class shape'), { places: CLOSE, share: 1 / lensK, lens: lensK, framed: false });
// 0077 W1-a: end

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
//
// A ROUTE WITH A FILE AND NO BUILD (2026-10-13, the first batch of the "3D model:" issues): NuSTAR
// and NOAA-21 had no route at all before their files, so what the map drew was the record's class
// shape. That is what main draws on a visitor's screen until the file arrives and what it drew
// before the file existed, so it is photographed the same way: `modelFor(record.klass, the record's
// own variant)`, exactly the call scene/heroes.js acquire() makes for a record with no build.
if (entry.file) {
  try {
    const M = await import(urlOf('./js/scene/models.js'));
    const variant = entry.build || (record.meta && record.meta.modelVariant) || undefined;
    const built = M.modelFor(entry.build ? M.builderKlass(record.klass, entry.build) : record.klass, variant, { record });
    const obj = heroOf();
    if (!built || !obj) throw new Error('the procedural shape could not be built, or the hero is gone');
    const back = wearInstead(obj, built);
    await sleep(2500);
    out.procedural = { build: entry.build || null, klassShape: entry.build ? null : record.klass, model: describe(built) };
    // 0077 W1-a: begin
    // The shape a file replaces, from the app's framing and the four close places only (the before of the
    // close-up sheet); its six framed places were a third of a run's pictures and nobody compared them.
    const was = record.name + ' wearing the procedural shape ' + (entry.build ? '`' + entry.build + '`' : 'of its class, `' + record.klass + '`,') + ' that the file replaces (put back by the probe for the comparison)';
    await walk('procedural', was, { places: [] });
    await walk('procedural', was, { places: CLOSE, share: 1 / lensK, lens: lensK, framed: false });
    // 0077 W1-a: end
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
return out;
};
const subjects = param ? param.split('_').filter(Boolean) : [null];
const done = [];
for (const subject of subjects) {
  try { done.push(await one(subject, subjects.length > 1 ? subject + '--' : '')); }
  catch (e) { done.push({ subject: { id: subject }, views: [], fail: 'the probe threw on ' + subject + ': ' + String((e && e.message) || e) }); }
  // A layer this subject needed is put back as it was: sixteen thousand dots do not belong in the
  // next craft's pictures (the third run of batch two photographed Ajisai through them).
  const last = done[done.length - 1];
  // The card's lamp is put out again: the next subject is photographed in the Sun's light.
  if (last && last.light && last.light.flood) { try { (await import(urlOf('./js/scene/models.js'))).setFloodLight(false); } catch { /* an older ref */ } }
  if (last && last.layerTurnedOn) { try { sr.setLayerOn(last.layerTurnedOn, false); await sleep(1500); } catch { /* it stays on, and the pictures show it */ } }
}
const failed = done.filter((d) => d.fail).map((d) => d.fail);
// One subject: its own summary, as this probe has always returned it. Several: one entry each.
const summary = done.length === 1 ? done[0] : { subjects: done, views: done.flatMap((d) => d.views || []), ...(failed.length ? { fail: failed.join(' | ') } : {}) };
return finish(summary);
