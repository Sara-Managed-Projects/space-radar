// r15-c2: THE VOSTOK MODELS IN THE APP (release 1.5.0 stage r15-c2, internal spec 0079, internal #1051). The `model` probe's
// way of standing a craft on a stand-in record (`sat-25544.as.<route>`: the named route of realmodels.js, drawn on the ISS's
// record for the picture only), with three changes, because these four files are not satellites:
//   (1) the subject list is built in (`-f subject=c2`; the workflow wants a subject to save the catalogue's column twin): r7-8k72k on the ISS's record, vostok-3ka on Tianhe's, vostok-seat on XRISM's, vostok-chutes on NuSTAR's, one run;
//   (2) THE ATTITUDE IS HELD while a craft is photographed: the hero layer tumbles a rocket, and a camera that looks from the
//       Sun's side at a tumbling stack sees it end-on half the time. For the close sheet the model's +Y is turned to stand on the
//       craft's vertical (away from the Earth), its X along the Sun-crossed-with-Earth axis, as the model probe's frame has it;
//   (3) THE LENS FITS BY METRES, not by the craft's circle: a view is named by the model-frame point it centres on and how many
//       metres it spans (`fit`), the lens (the same trick as the model probe's: the camera at 1/k of the framing distance, the
//       model k times its drawn size, so it is as big in the world as the app draws it) is grown until the model's own two
//       points, a metre apart, measure the right number of pixels. So the whole of a 38 m rocket, its nose, its truss, the shoulder
//       the strap-ons ride on and its nozzle cluster are each a picture at the same care as a satellite's four.
// Every craft is photographed: as the app frames it; whole, from four places on the Sun's side; the details its row lists; and
// pulled apart along its named part nodes (the parts of moments-contract.md), which proves in the app that each part is its own
// node and that the player can find it by name. A part that is missing from the loaded file fails the run.
//
//   gh workflow run look.yml --ref r15-c2 -f probe=r15-c2 -f subject=c2 -f width=1600 -f height=900
//   gh workflow run look.yml --ref r15-c2 -f probe=r15-c2 -f subject=c2 -f mobile=true
//
// What follows is the `model` probe's own text up to the sunlight step (the record, its route, the wait for the file, the clock
// moved into sunlight), unchanged but for the marked lines; then the new part; then the model probe's subject loop.

look.probe = 'r15-c2'; // 0079 c2
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
// FOUR DIFFERENT STAND-IN RECORDS, because a hero keeps the shape it was made with for its record: the ISS, Tianhe, XRISM and NuSTAR (each is on a layer the workflow saves for a probe with a subject)
const DEFAULT = ['sat-25544.as.r7-8k72k', 'sat-48274.as.vostok-3ka', 'sat-57800.as.vostok-seat', 'sat-38358.as.vostok-chutes']; // 0079 c2
const asked0 = new URLSearchParams(location.search).get('lookSubject'); // 0079 c2
const param = !asked0 || asked0 === 'c2' ? DEFAULT.join('_') : asked0; // 0079 c2
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
// 0079 c2: begin -- THE PART THAT IS NEW
const THREE = await import(urlOf('./vendor/three.module.min.js'));
const V3 = THREE.Vector3;
const rad = (d) => (d * Math.PI) / 180;

// What to photograph, per route. Metres in the MODEL's own frame (+Y up its axis, the origin as the registry row says). `whole`: the
// model's centre, what spans the picture, and the four azimuths from the sunward direction (0 = the camera on the Sun's side,
// looking at the lit face); `details`: [name, centre, span, azimuth, elevation, fit side]; `apart`: the offsets (metres) that pull each
// named part away from the others for one picture; `parts`: the node names the loaded file must contain (the registry row's `parts`).
const CRAFT = {
  'r7-8k72k': {
    parts: ['boosters-4', 'booster-b', 'booster-v', 'booster-g', 'booster-d', 'core-stage', 'blok-e', 'fairing'],
    whole: { at: [0, 19.1, 0], span: 38.6, side: 'h', az: [-50, -17, 17, 50], el: 8 },
    details: [
      ['nose-and-block-e', [0, 33.6, 0], 10, -35, 7, 'min'],
      ['nose-and-block-e-b', [0, 33.6, 0], 10, 30, 7, 'min'],
      ['truss', [0, 29.0, 0], 5.5, 22, 5, 'min'],
      ['shoulder', [0, 19.4, 0], 7.5, -22, 8, 'min'],
      ['tail-and-nozzles', [0, 3.6, 0], 8.5, -30, 9, 'min'],
      ['tail-and-nozzles-b', [0, 3.6, 0], 8.5, 32, 9, 'min'],
    ],
    apart: { at: [0, 20, 0], span: 56, side: 'h', az: -30, el: 8, offsets: { 'booster-b': [4.5, -5, 4.5], 'booster-v': [-4.5, -5, 4.5], 'booster-g': [-4.5, -5, -4.5], 'booster-d': [4.5, -5, -4.5], 'blok-e': [0, 4, 0], fairing: [0, 11, 0] } },
  },
  'vostok-3ka': {
    parts: ['vostok-im', 'vostok-sm-sphere', 'vostok-hatch', 'vostok-antennas'],
    whole: { at: [0, 2.5, 0], span: 5.4, side: 'h', az: [-50, -17, 17, 50], el: 14 },
    details: [
      ['sphere-and-hatch', [0.3, 3.3, 0], 2.9, 62, 8, 'min'],
      ['drum-and-bottles', [0, 1.9, 0], 3.1, -38, 12, 'min'],
      ['drum-and-bottles-b', [0, 1.9, 0], 3.1, 40, 12, 'min'],
    ],
    apart: { at: [0, 3.0, 0], span: 7.5, side: 'h', az: 30, el: 12, offsets: { 'vostok-hatch': [1.4, 0.9, 0], 'vostok-sm-sphere': [0, 1.0, 0], 'vostok-antennas': [0, 2.2, 0], 'vostok-im': [0, -0.9, 0] } },
  },
  'vostok-seat': {
    parts: ['vostok-seat', 'vostok-pilot'],
    whole: { at: [0, 0.15, 0.25], span: 2.25, side: 'h', az: [-60, -25, 25, 60], el: 10 },
    details: [
      ['back-and-rails', [0, 0.2, -0.1], 2.2, 115, 12, 'min'],
      ['foot-and-rockets', [0, -0.55, 0.1], 1.4, -35, 10, 'min'],
    ],
    apart: { at: [0, 0.3, 0.5], span: 3.0, side: 'h', az: -35, el: 10, offsets: { 'vostok-pilot': [0, 0.5, 0.8] } },
  },
  'vostok-chutes': {
    parts: ['chute-sa-drogue', 'chute-sa-brake', 'chute-sa-main', 'chute-pilot-drogue', 'chute-pilot-main', 'chute-pilot-reserve'],
    whole: { at: [30, 17, 0], span: 62, side: 'w', az: [0, 0, 0, 0], el: 4 },
    details: [
      ['capsule-main', [20.5, 17, 0], 38, 20, 4, 'h'],
      ['pilot-main-and-reserve', [44.5, 6, 0], 24, -15, 4, 'min'],
      ['pullout-and-braking', [4.5, 4, 0], 12, 10, 6, 'min'],
    ],
    apart: null,
  },
};
const key = (wearAs || '').replace(/ /g, '-');
const spec = CRAFT[key];
if (!spec) return { ...out, fail: 'r15-c2 has no list for the route `' + wearAs + '`; it knows ' + Object.keys(CRAFT).join(', ') };

const realRoot = () => {
  const obj = heroOf();
  let wrap = null;
  if (obj) obj.traverse((n) => { if (!wrap && n.userData && n.userData.realModel) wrap = n; });
  return wrap && wrap.children[0] && wrap.children[0].children[0] ? wrap.children[0].children[0] : null;   // the wrapper, its inner group, the file's scene
};
const root0 = realRoot();
const rootPos0 = root0 ? root0.position.clone() : null;
if (!root0) return { ...out, fail: 'the route `' + wearAs + '` drew no model (no real-model wrapper under the hero): ' + JSON.stringify(out.route) };
const found = [];
const missing = [];
for (const n of spec.parts) { if (root0.getObjectByName(n)) found.push(n); else missing.push(n); }
out.parts = { wanted: spec.parts, found, missing };
if (missing.length) out.fail = 'part nodes missing from ' + (entry.file || key) + ': ' + missing.join(', ');
{
  const names = [];
  root0.traverse((n) => { if (!n.isMesh && n.name && names.length < 60) names.push(n.name); });
  out.nodeNames = names;
}

// THE LENS, WITH THE ATTITUDE HELD. grow() runs once a frame, from the first mesh's onBeforeRender, after heroes.js has written the
// frame's scale and attitude and before three.js reads the matrix.
const lens = { k: 1, on: false, up: false, ppm: 0, focus: [0, 0, 0] };
let applied = NaN;
const hold = () => {
  const obj = heroOf();
  if (!obj) return;
  if (lens.up) {
    const f = sunFrame();
    if (f) {
      const X = new V3(f.x.x, f.x.y, f.x.z);
      const Y = new V3(-f.z.x, -f.z.y, -f.z.z);
      const Z = new V3().crossVectors(X, Y);
      obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    }
  }
  if (obj.scale.x !== applied) {
    obj.scale.multiplyScalar(lens.k);
    applied = obj.scale.x;
  }
  obj.updateMatrixWorld(true);
  try {
    // pixels a metre, where the camera looks: two points of the model one metre apart along its own axis
    const root = realRoot();
    const c = new V3(...lens.focus);
    const a = root.localToWorld(c.clone()).project(sr.camera);
    const b = root.localToWorld(c.clone().add(new V3(0, 1, 0))).project(sr.camera);
    lens.ppm = Math.hypot((b.x - a.x) * innerWidth / 2, (b.y - a.y) * innerHeight / 2);
  } catch { /* the next frame */ }
};
const hooked = [];
const lensOn = () => {
  const obj = heroOf();
  obj.traverse((n) => { if (n.isMesh) { hooked.push([n, n.onBeforeRender]); n.onBeforeRender = hold; } });
  lens.on = true;
};
const lensOff = () => {
  for (const [n, f] of hooked) n.onBeforeRender = f;
  hooked.length = 0; lens.on = false; lens.up = false; lens.k = 1; applied = NaN;
};
const setFocus = (at) => { lens.focus = at.slice(); realRoot().position.set(-at[0], -at[1], -at[2]); };
const camDir = (az, el) => {
  const f = sunFrame();
  const h = mix(f.y, Math.cos(rad(az)), f.x, Math.sin(rad(az)));
  return unit(mix(h, Math.cos(rad(el)), { x: -f.z.x, y: -f.z.y, z: -f.z.z }, Math.sin(rad(el))));
};
const dFramed = rig.state.distance, a0 = rig.state.azimuth, p0 = rig.state.polar;
/** Grow the lens until a metre measures `ppm` pixels, standing at `dir`; returns what was measured. */
const fitTo = async (dir, ppm) => {
  let k = lens.k > 1 ? lens.k : 6;
  for (let i = 0; i < 5; i++) {
    lens.k = k;
    rig.flyTo({ offset: dir, distance: dFramed / k, ms: 0 });
    await sleep(3200);
    const p = lens.ppm;
    if (!(p > 0)) continue;
    const r = ppm / p;
    if (Math.abs(r - 1) < 0.08) return { k, ppm: p, tries: i + 1 };
    k = Math.max(1, Math.min(80, k * r));
  }
  return { k, ppm: lens.ppm, tries: 5, loose: true };
};
const sideOf = (side) => (side === 'w' ? innerWidth : side === 'h' ? innerHeight : Math.min(innerWidth, innerHeight));
const take = async (tag, words, extra = {}) => {
  await sleep(1500);
  const at = onScreen();
  await shot(prefix + tag, (out.standIn ? 'the model on a stand-in record' : record.name) + ' wearing ' + (entry.file || key) + ', ' + words + '; ' + Math.round(lens.ppm * 10) / 10 + ' px a metre (lens ' + Math.round(lens.k * 10) / 10 + ')');
  out.views.push({ name: prefix + tag, at, ppm: lens.ppm, k: lens.k, ...extra });
};

// 1. as the app frames it (the hero tumbling as it does), no lens
await take('1-as-framed', 'as the app frames a selected craft');
lensOn();
lens.up = true;
const startPpm = async () => { setFocus(spec.whole.at); lens.k = 1; rig.flyTo({ offset: camDir(0, 8), distance: dFramed, ms: 0 }); await sleep(3000); return lens.ppm; };
out.framedPpm = await startPpm();
// 2. whole, from four places on the Sun's side
try {
  const w = spec.whole;
  setFocus(w.at);
  for (let i = 0; i < w.az.length; i++) {
    const fit = await fitTo(camDir(w.az[i], w.el), (0.92 * sideOf(w.side)) / w.span);
    await take('2-whole-' + (i + 1), 'the whole craft, held upright, from ' + (w.az[i] === 0 && key === 'vostok-chutes' ? 'the Sun\'s side (the row of canopies square on)' : w.az[i] + ' degrees round from the Sun\'s side'), { fit });
    if (key === 'vostok-chutes') break;      // four azimuths of 0 would be four copies of one picture
  }
} catch (e) { look.warns.push('probe: the whole views of ' + key + ' failed: ' + String((e && e.message) || e)); }
// 3. the details
for (const [name, at, span, az, el, side] of spec.details) {
  try {
    setFocus(at);
    const fit = await fitTo(camDir(az, el), (0.92 * sideOf(side)) / span);
    await take('3-detail-' + name, name.replace(/-/g, ' ') + ', ' + span + ' m across, from ' + az + ' degrees round from the Sun\'s side', { fit });
  } catch (e) { look.warns.push('probe: the detail ' + name + ' of ' + key + ' failed: ' + String((e && e.message) || e)); }
}
// 4. pulled apart along its named parts
if (spec.apart) {
  const saved = [];
  try {
    const A = spec.apart;
    for (const [nm, off] of Object.entries(A.offsets)) {
      const node = root0.getObjectByName(nm);
      if (!node) { look.warns.push('probe: no node ' + nm + ' to pull apart'); continue; }
      saved.push([node, node.position.clone()]);
      node.position.add(new V3(off[0], off[1], off[2]));
    }
    setFocus(A.at);
    const fit = await fitTo(camDir(A.az, A.el), (0.92 * sideOf(A.side)) / A.span);
    await take('4-parts-apart', 'every named part moved away from the others by its node\'s position (' + Object.keys(A.offsets).join(', ') + ')', { fit });
  } catch (e) { look.warns.push('probe: the parts-apart view of ' + key + ' failed: ' + String((e && e.message) || e)); }
  for (const [node, p] of saved) node.position.copy(p);
}
// back as it was
realRoot().position.copy(rootPos0);
lensOff();
rig.flyTo({ azimuth: a0, polar: p0, distance: dFramed, ms: 0 });
await sleep(1000);
return out;
};
// 0079 c2: end
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
