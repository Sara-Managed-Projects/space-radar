// fx-pluto: release 1.5.1, two fixes Ivan reported on the live site (2026-10-29, ivan-1029/1.png and 6.png).
//
// 1. PLUTO AND CHARON AS STAIR-STEPPED SLABS. The fault is where the picture was taken: the SUN'S stage, where
//    Pluto stands 5 300 units (of 1 000 000 km) from the origin and is 0.0012 units in radius. The world
//    shader multiplied modelMatrix and then viewMatrix in float32; a float32 step at 5 300 is 4.9e-4, 40 % of
//    Pluto's radius, so the sphere's vertices landed on a coarse grid. (The earlier look probes stood on Pluto's
//    OWN stage, where Pluto is at the origin and nothing is lost.) This probe stands on the Sun's stage, close
//    to each, and shows each twice in one run: as this branch draws it (the vertex placed by modelViewMatrix,
//    composed in double on the CPU), then with the old vertex stage put back on the same material, for the
//    before. The old pair of lines is rebuilt from the new ones below, so the two are the same shader but for
//    that one change.
// 2. THE RAIL OVER THE ROUND "S". With the sidebar folded, the rail and the badge started where the 64 x 48
//    handle is. The probe folds the sidebar, takes the picture, and measures: the handle and the rail do not
//    overlap, a point on each is each element's own (elementFromPoint), the handle is 44 px or more on a side.
//    On a phone (no handle in the corner) it measures the rail against the top bar's own controls.
look.probe = 'fx-pluto';
const out = { sun: {}, corner: {}, problems: [] };
const D2R = Math.PI / 180;
const AT = Date.UTC(2026, 9, 27, 0, 0, 0);
const mesh = (id) => sr.worlds.meshFor(id);
const q = (s) => document.querySelector(s);
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const overlap = (a, b) => !!a && !!b && a.w > 0 && b.w > 0 && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const shown = (n) => { if (!n || n.closest('[hidden]')) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden'; };
/** Is the element what is under a point of its own (its middle, and a point 6 px in from each corner)? */
const hit = (n) => {
  const r = n.getBoundingClientRect();
  const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 6, r.top + 6], [r.right - 6, r.top + 6], [r.left + 6, r.bottom - 6], [r.right - 6, r.bottom - 6]];
  return pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && n.contains(e); });
};

// The old vertex stage: the world's place through modelMatrix, then viewMatrix, in the GPU's float32.
const NEW_A = 'vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );\n  vFromCamW = transpose( mat3( viewMatrix ) ) * mvPos.xyz;';
const OLD_A = 'vec4 worldPos = modelMatrix * vec4( position, 1.0 );\n  vFromCamW = worldPos.xyz - cameraPosition;';
const NEW_B = 'gl_Position = projectionMatrix * mvPos;';
const OLD_B = 'gl_Position = projectionMatrix * viewMatrix * worldPos;';
const withVertex = (id, old) => {
  const m = mesh(id).material;
  if (!m._srNewVert) m._srNewVert = m.vertexShader;
  const src = m._srNewVert;
  if (!src.includes(NEW_A) || !src.includes(NEW_B)) { out.problems.push(id + ': the vertex shader is not the one this probe expects'); return; }
  m.vertexShader = old ? src.replace(NEW_A, OLD_A).replace(NEW_B, OLD_B) : src;
  m.needsUpdate = true;
};
const sunLit = (id, side = 0.5, up = 0.25) => { const s = sunward(id); const n = north(id); return unit(mix(mix(s, 1, n, up), 1, unit(cross(s, n)), side)); };
/** The camera on the Sun's stage, `k` radii from the world's centre, on its lit side, looking at it. */
const close = async (id, k, side) => {
  const m = mesh(id);
  const r = m.scale.x;
  rig.flyTo({ targetScene: { x: m.position.x, y: m.position.y, z: m.position.z }, distance: r * k, offset: sunLit(id, side), ms: 0 });
  await sleep(1500);
  return r;
};
const note = (id) => { const m = mesh(id); const p = m.position; return { distFromOriginUnits: +Math.hypot(p.x, p.y, p.z).toFixed(1), radiusUnits: +m.scale.x.toFixed(6), stageStep: +(2 ** (Math.floor(Math.log2(Math.hypot(p.x, p.y, p.z))) - 23)).toExponential(2) }; };

try {
  sr.clock.goTo(AT);
  sr.clock.setPaused(true);
  // ---- 1. Pluto and Charon on the Sun's stage, close ----
  sr.setStage('sun');
  await sleep(9000);
  out.sun.stage = sr.stage && sr.stage.worldId;
  if (out.sun.stage !== 'sun') out.problems.push('not on the Sun\'s stage: ' + out.sun.stage);
  await until(() => { const u = mesh('pluto') && mesh('pluto').material.uniforms; return u && u.uHasMap.value === 1; }, 60000, 500);
  await until(() => { const u = mesh('charon') && mesh('charon').material.uniforms; return u && u.uHasMap.value === 1; }, 60000, 500);
  out.sun.pluto = note('pluto'); out.sun.charon = note('charon');
  const steps = [['pluto', 3.2, 0.5, 's-pluto'], ['charon', 3.2, 0.5, 's-charon']];
  for (const [id, k, side, tag] of steps) {
    await close(id, k, side);
    withVertex(id, false);
    await shot(tag + '-after', id + ' close on the Sun\'s stage, this branch', 2500);
    withVertex(id, true);
    await shot(tag + '-before', id + ' close on the Sun\'s stage, the old vertex stage put back', 2500);
    withVertex(id, false);
  }
  // Pluto with Charon in the frame, and another world that shares the shader (Titan, Saturn's moon; the Moon).
  const pp = mesh('pluto').position; const cp = mesh('charon').position;
  const toC = unit({ x: cp.x - pp.x, y: cp.y - pp.y, z: cp.z - pp.z });
  const rP = mesh('pluto').scale.x;
  rig.flyTo({ targetScene: { x: (pp.x + cp.x) / 2, y: (pp.y + cp.y) / 2, z: (pp.z + cp.z) / 2 }, distance: rP * 22, offset: unit(mix(sunward('pluto'), 1, toC, -0.9)), ms: 0 });
  await sleep(1500);
  await shot('s-pair', 'Pluto and Charon together on the Sun\'s stage', 2500);
  for (const id of ['mars', 'titan']) {
    if (!mesh(id)) continue;
    await close(id, 3.2, 0.5);
    await shot('s-' + id, id + ' close on the Sun\'s stage (shares the shader)', 2500);
  }

  // ---- 2. The top-left corner ----
  const phone = sr.shell && sr.shell.isPhone && sr.shell.isPhone();
  out.corner.phone = !!phone;
  sr.setStage('sun');
  await sleep(4000);
  if (!phone && sr.shell && sr.shell.collapse) { sr.shell.collapse(true); await sleep(2500); }
  const rail = q('.sr-scalerail');
  const handle = q('.sr-side__handle');
  const badge = q('.sr-scalebadge');
  out.corner.rail = { shown: shown(rail), box: box(rail), hit: rail && shown(rail) ? hit(rail) : null };
  out.corner.badge = { shown: shown(badge), box: box(badge), hit: badge && shown(badge) ? hit(badge) : null };
  const back = q('.sr-scalerail__back');
  out.corner.back = { shown: shown(back), box: box(back) };
  if (!phone) {
    out.corner.handle = { shown: shown(handle), box: box(handle), hit: handle && shown(handle) ? hit(handle) : null, collapsedClass: document.documentElement.classList.contains('sr-side-collapsed') };
    if (!out.corner.handle.shown) out.problems.push('the collapsed handle is not shown');
    else {
      if (out.corner.handle.box.w < 44 || out.corner.handle.box.h < 44) out.problems.push('the handle is under 44 px: ' + JSON.stringify(out.corner.handle.box));
      if (out.corner.handle.hit.some((x) => !x)) out.problems.push('something is over the handle: ' + JSON.stringify(out.corner.handle.hit));
      if (shown(rail) && overlap(out.corner.handle.box, out.corner.rail.box)) out.problems.push('the rail overlaps the handle');
      if (shown(badge) && overlap(out.corner.handle.box, out.corner.badge.box)) out.problems.push('the badge overlaps the handle');
    }
    if (!shown(rail)) out.problems.push('the rail is not shown on the Sun\'s stage');
    else if (out.corner.rail.hit.some((x) => !x)) out.problems.push('something is over the rail: ' + JSON.stringify(out.corner.rail.hit));
  } else {
    // On a phone: the rail is under the top bar's own pieces and clear of them; every one of them 44 px or more.
    const top = [...document.querySelectorAll('.sr-top__row > *, .sr-top__line > *, .sr-rail__btn--more')].filter(shown);
    out.corner.top = top.map((n) => ({ cls: n.className && String(n.className).slice(0, 40), box: box(n) }));
    for (const t of out.corner.top) {
      if (shown(rail) && overlap(t.box, out.corner.rail.box)) out.problems.push('the rail overlaps ' + t.cls);
      if (shown(badge) && overlap(t.box, out.corner.badge.box)) out.problems.push('the badge overlaps ' + t.cls);
    }
    if (shown(rail)) { if (out.corner.rail.hit.some((x) => !x)) out.problems.push('something is over the rail: ' + JSON.stringify(out.corner.rail.hit)); if (out.corner.rail.box.h < 44) out.problems.push('the rail is under 44 px high on a phone: ' + out.corner.rail.box.h); }
    if (shown(back) && out.corner.back.box.h < 44) out.problems.push('Back is under 44 px high on a phone');
  }
  if (shown(rail) && shown(badge) && overlap(out.corner.rail.box, out.corner.badge.box)) out.problems.push('the rail and the badge overlap');
  await shot('corner', phone ? 'the top of the screen on a phone' : 'the top left with the sidebar folded: the round S and the rail', 1500);
  if (!phone && sr.shell && sr.shell.collapse) sr.shell.collapse(false);
} catch (e) { look.errors.push('probe: ' + (e && e.stack || e)); }
sr.clock.setPaused(false);
sr.clock.live();
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
