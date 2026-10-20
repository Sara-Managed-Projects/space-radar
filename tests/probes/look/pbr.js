// pbr: REAL MODELS, TOON AND PHYSICALLY BASED, SIDE BY SIDE (release 1.3.0 stage W2-pbr, internal #967).
// The `model` probe's walk, cut to what this comparison needs: each craft selected as a click on its row
// does, its file arrived, in sunlight (or under the card's lamp on the ground, as `model` does), then
// photographed as the app frames it and from four close places on its sunward side (`model`'s lens: the
// model nine tenths of the picture's short side, the same size in the world), ONCE IN EACH LOOK
// (scene/pbr.js setModelLook: 'pbr', then 'toon', which is what main drew before). Each picture is named
// `<id>--<look>-<n>-<place>`.
//
//   gh workflow run look.yml -f probe=pbr -f width=1600 -f height=900
//   gh workflow run look.yml -f probe=pbr -f mobile=true
//   gh workflow run look.yml -f probe=pbr -f subject=slim_chandrayaan-3     # a list of record ids instead
//
// The default list is the issue's eight: the ISS, Hubble, Webb, Tiangong, Gaia, SLIM, Vikram and a gold
// foil lander (Apollo 11's). The summary carries, per craft and look, the materials on screen (how many
// of each kind), the draw calls and the frame interval over 40 frames.
look.probe = 'pbr';
const urlOf = (path) => new URL(path, document.baseURI).href;
const RM = await import(urlOf('./js/scene/realmodels.js'));
const MM = await import(urlOf('./js/scene/models.js'));
let PB = null;
const DEFAULT = ['sat-25544', 'sat-20580', 'deep-jwst', 'sat-48274', 'deep-gaia', 'slim', 'chandrayaan-3', 'apollo-11'];
const param = new URLSearchParams(location.search).get('lookSubject');
const subjects = param ? param.split('_').filter(Boolean) : DEFAULT;
// Three.js says so when a program does not compile: keep its words, they are the first thing to read.
const shaderErrors = [];
try { sr.renderer.debug.onShaderError = (gl, program, vs, fs) => { shaderErrors.push(String(gl.getProgramInfoLog(program) || '') + ' | ' + String(gl.getShaderInfoLog(fs) || '').slice(0, 1500) + ' | ' + String(gl.getShaderInfoLog(vs) || '').slice(0, 500)); }; } catch { /* an older three */ }
try { if (!sr.isLayerOn('stations')) sr.setLayerOn('stations', true); } catch { /* on by default */ }
await until(() => (sr.recordsFor('stations') || []).length > 0, 90000, 500);

const intervals = (n) => new Promise((resolve) => {
  const t = [];
  const step = (now) => { t.push(now); if (t.length <= n) requestAnimationFrame(step); else { const g = []; for (let i = 1; i < t.length; i++) g.push(t[i] - t[i - 1]); g.sort((a, b) => a - b); resolve({ medianMs: Math.round(g[g.length >> 1] * 10) / 10, p95Ms: Math.round(g[Math.floor(g.length * 0.95)] * 10) / 10 }); } };
  requestAnimationFrame(step);
});

const one = async (id) => {
  const out = { subject: id, views: [], looks: {} };
  const there = () => sr.recordById(id);
  await until(there, 60000, 500);
  if (!there()) { try { if (!sr.isLayerOn('active')) { sr.setLayerOn('active', true); out.layerTurnedOn = 'active'; } } catch { /* none */ } await until(there, 180000, 500); }
  const record = there();
  if (!record) return { ...out, fail: 'no record ' + id + ' on this page' };
  const entry = RM.realModelFor(record) || {};
  out.name = record.name;
  out.route = { file: entry.file || null, build: entry.build || null };
  const heroOf = () => { let got = null; sr.scene.traverse((o) => { if (!got && o.userData && o.userData.recordId === record.id && o.visible && o.parent) got = o; }); return got; };
  sr.select(record, { fly: true, undo: false });
  await sleep(9000);
  out.arrived = await until(() => { const h = heroOf(); return h && h.userData.realModel && sr.heroes.drawnOpacity(record.id) > 0.98; }, 150000, 500);
  if (!out.arrived) return { ...out, fail: 'the file ' + entry.file + ' was not on screen in two and a half minutes' };
  if (!PB) { try { PB = await import(urlOf('./js/scene/pbr.js')); } catch (e) { return { ...out, fail: 'scene/pbr.js did not load: ' + e }; } }
  await sleep(2000);
  const onGround = record.klass === 'site' && !!(record.meta && record.meta.world);
  const deep = /^deep-/.test(record.id);
  const home = onGround ? record.meta.world : 'earth';
  const earthR = () => { try { return sr.worlds.drawnRadiusUnits(home) || 0; } catch { return 0; } };
  const sunlit = () => {
    const obj = heroOf(), sun = sr.worlds.meshFor('sun'), w = sr.worlds.meshFor(home);
    if (!obj || !sun || !w) return null;
    const p = obj.getWorldPosition(obj.position.clone()).sub(w.position);
    const s = unit({ x: sun.position.x - w.position.x, y: sun.position.y - w.position.y, z: sun.position.z - w.position.z });
    const along = p.x * s.x + p.y * s.y + p.z * s.z;
    if (onGround) return along / Math.max(1e-9, Math.hypot(p.x, p.y, p.z)) > Math.sin((12 * Math.PI) / 180);
    if (along > 0) return true;
    return Math.hypot(p.x - along * s.x, p.y - along * s.y, p.z - along * s.z) > earthR() * 1.01;
  };
  out.light = { litAtFirst: sunlit(), movedMinutes: 0 };
  // ON THE GROUND, THE SUN WHEN IT CAN BE HAD. `model` photographs a site under the card's lamp, which is an
  // even light from the camera: right for seeing a shape, and exactly what hides metal and foil. So a site
  // waits for its morning here (the Sun 12 degrees up: Vikram, at 69 degrees south, never sees it above 22),
  // eight hours a step over a lunar day, and only a site still dark after that gets the lamp.
  if (onGround && out.light.litAtFirst === false) {
    const t0 = sr.clock.now();
    let found = null;
    for (let k = 1; k <= 95 && found === null; k++) { sr.clock.goTo(t0 + k * 8 * 3600e3); await sleep(1800); if (sunlit()) found = k; }
    if (found !== null) { sr.clock.goTo(t0 + (found + 1) * 8 * 3600e3); await sleep(4000); out.light.movedHours = (found + 1) * 8; }
    sr.select(record, { fly: true, undo: false });
    await sleep(10000);
    out.light.lit = sunlit();
  }
  if (onGround && !sunlit()) { MM.setFloodLight(true); out.light.flood = true; }
  if (out.light.litAtFirst === false && !onGround) {
    const t0 = sr.clock.now();
    let found = null;
    for (let k = 1; k <= 14 && found === null; k++) { sr.clock.goTo(t0 + k * 5 * 60e3); await sleep(3500); if (sunlit()) found = k; }
    if (found !== null) { sr.clock.goTo(t0 + (found + 2) * 5 * 60e3); await sleep(4000); out.light.movedMinutes = (found + 2) * 5; }
    sr.select(record, { fly: true, undo: false });
    await sleep(10000);
    out.light.lit = sunlit();
  }
  // What is on screen: the materials by kind and look.
  const describe = () => {
    const d = { meshes: 0, triangles: 0, pbr: 0, toon: 0, finishes: {} };
    const obj = heroOf();
    if (obj) obj.traverse((n) => {
      if (!n.isMesh || !n.visible) return;
      d.meshes += 1;
      d.triangles += n.geometry ? (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3 : 0;
      const m = n.material;
      if (m && m.isMeshStandardMaterial) { d.pbr += 1; d.finishes[m.userData.kind] = (d.finishes[m.userData.kind] || 0) + 1; } else d.toon += 1;
    });
    return d;
  };
  const drawnPx = () => {
    try {
      const obj = heroOf();
      const reach = sr.heroes.drawnReach(record.id);
      const dist = sr.camera.position.distanceTo(obj.getWorldPosition(obj.position.clone()));
      return Math.round((2 * reach / dist) * sr.camera.projectionMatrix.elements[5] * innerHeight / 2);
    } catch { return null; }
  };
  // Where the model is in the window and how wide its circle is, for whoever crops the picture.
  const onScreen = (k = 1) => {
    try {
      const obj = heroOf();
      const v = obj.getWorldPosition(obj.position.clone()).project(sr.camera);
      return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight), px: Math.round((drawnPx() || 0) * k) };
    } catch { return null; }
  };
  const sunFrame = () => {
    const obj = heroOf(), sun = sr.worlds.meshFor('sun'), w = sr.worlds.meshFor(home);
    if (!obj || !sun || !w) return null;
    const p = obj.getWorldPosition(obj.position.clone());
    const s = unit({ x: sun.position.x - p.x, y: sun.position.y - p.y, z: sun.position.z - p.z });
    // A craft far from any world (Webb and Gaia, near L2, where the Earth and the Sun are one direction): the
    // frame's "down" is away from the Sun, so the places that look down on a craft look at its Sun side.
    // The first run used the Earth's direction there too and photographed both craft from their cold side.
    const z = deep ? unit({ x: -s.x, y: -s.y, z: -s.z }) : unit({ x: w.position.x - p.x, y: w.position.y - p.y, z: w.position.z - p.z });
    let x = cross(s, z);
    if (Math.hypot(x.x, x.y, x.z) < 1e-4) x = cross({ x: 0, y: 1, z: 0 }, z);
    x = unit(x);
    return { x, y: unit(cross(z, x)), z, s };
  };
  // `model`'s lens (W1-a): every mesh of the hero grows by k just before it is drawn, and the camera stands
  // at 1/k of the framing distance, so the model is the same size in the world and k times bigger on screen.
  const lensOn = (k) => {
    const obj = heroOf();
    if (!obj) return () => {};
    let applied = NaN;
    const grow = () => { if (obj.scale.x === applied) return; obj.scale.multiplyScalar(k); applied = obj.scale.x; obj.updateMatrixWorld(true); };
    const meshes = [];
    obj.traverse((n) => { if (n.isMesh) { meshes.push([n, n.onBeforeRender]); n.onBeforeRender = grow; } });
    return () => { for (const [n, f] of meshes) n.onBeforeRender = f; };
  };
  const CLOSE = [
    ['2-close-sunward-right', [0.62, 0.66, -0.42], 'close up, from the sunward side, right of the panel axis and above'],
    ['3-close-sunward-left', [-0.62, 0.66, -0.42], 'close up, from the sunward side, left and above'],
    ['4-close-sun-face', [0.14, 0.93, -0.34], 'close up, square onto the lit face'],
    ['5-close-along', [0.9, 0.32, -0.3], 'close up, along the panel axis, the Sun over the camera\'s shoulder'],
  ];
  // A craft on the ground has no panel axis and no Earth face: its other side instead, against the Sun.
  if (onGround) CLOSE.push(['6-close-shade-side', [0.2, -0.75, -0.55], 'close up, from the side away from the Sun']);
  const a0 = rig.state.azimuth, p0 = rig.state.polar, dFramed = rig.state.distance;
  out.drawnPx = drawnPx();
  const fill = 0.9 * Math.min(innerWidth, innerHeight);
  const k = out.drawnPx > 0 ? Math.max(1, Math.min(4, fill / out.drawnPx)) : 2.5;
  out.lens = Math.round(k * 100) / 100;
  for (const lookName of ['pbr', 'toon']) {
    PB.setModelLook(lookName);
    rig.flyTo({ azimuth: a0, polar: p0, distance: dFramed, ms: 0 });
    await sleep(3500);
    const said = record.name + ', ' + (lookName === 'pbr' ? 'physically based (scene/pbr.js)' : 'on the toon ramp (as main draws it)') + (out.light.flood ? ', under the card\'s lamp' : '');
    await shot(id + '--' + lookName + '-1-as-framed', said + ', as the app frames a selected craft');
    out.views.push({ name: id + '--' + lookName + '-1-as-framed', look: lookName, at: onScreen() });
    out.looks[lookName] = { model: describe(), cost: frameCost(), frames: await intervals(40) };
    const off = lensOn(k);
    for (const [name, [lx, ly, lz], words] of CLOSE) {
      const f = sunFrame();
      if (!f) continue;
      let d = unit(mix(mix(f.x, lx, f.y, ly), 1, f.z, lz));
      const lit = d.x * f.s.x + d.y * f.s.y + d.z * f.s.z;
      if (lit < 0.2 && ly > 0) d = unit(mix(d, 1, f.s, 0.6));
      const above = -(d.x * f.z.x + d.y * f.z.y + d.z * f.z.z);
      if (above < 0) d = unit(mix(d, 1, f.z, above));
      rig.flyTo({ offset: d, distance: dFramed / k, ms: 0 });
      await sleep(4000);
      await shot(id + '--' + lookName + '-' + name, said + ', ' + words + ' (drawn ' + k.toFixed(2) + ' times its selected size, for looking only)');
      out.views.push({ name: id + '--' + lookName + '-' + name, look: lookName, at: onScreen(k) });
    }
    off();
  }
  PB.setModelLook('auto');
  rig.flyTo({ azimuth: a0, polar: p0, distance: dFramed, ms: 0 });
  if (out.light.flood) MM.setFloodLight(false);
  // A file whose row says `look: toon` (Webb) keeps the ramp whatever is asked: the two sets are then the same.
  out.fileLook = (heroOf() && heroOf().userData.look) || null;
  if (out.fileLook === 'pbr' && !(out.looks.pbr && out.looks.pbr.model.pbr > 0)) out.fail = 'no part of ' + record.name + ' wore the physically based look when it was asked for';
  return out;
};

const done = [];
for (const id of subjects) {
  try { done.push(await one(id)); } catch (e) { done.push({ subject: id, views: [], fail: 'the probe threw on ' + id + ': ' + String((e && e.message) || e) }); }
  const last = done[done.length - 1];
  if (last && last.layerTurnedOn) { try { sr.setLayerOn(last.layerTurnedOn, false); await sleep(1500); } catch { /* stays on */ } }
  try { MM.setFloodLight(false); } catch { /* none */ }
}
const failed = done.filter((d) => d.fail).map((d) => d.subject + ': ' + d.fail);
if (shaderErrors.length) failed.unshift('a shader did not compile: ' + shaderErrors[0].slice(0, 2000));
const summary = { subjects: done, shaderErrors, views: done.flatMap((d) => d.views || []), ...(failed.length ? { fail: failed.join(' | ') } : {}) };
return finish(summary);
