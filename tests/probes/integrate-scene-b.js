// Scene, part B: the back-lit station's rim (internal #484), a lunar lander's ground patch (public
// #267, internal #478), Iapetus's ridge and the lit arrival at Vesta and Ceres (internal #436), a
// spent stage at an hour a second (internal #425), a temperate exoplanet pushed in on its system's
// stage (internal #479), and the nebula pictures (internal #342, #343, #345).
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const shadow = await import('/js/scene/shadow.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const sunNow = () => norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value);
await run('earthIce', async () => {
  // Greenland at its noon and Antarctica by day, each with the sheen and without it (public #260).
  ctx.clock.setPaused(true);
  await goTo('earth'); await wait(2500);
  const u = ctx.worlds.meshFor('earth').material.uniforms; const d0 = ctx.cameraRig.state.distance;
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 14, 40)); await wait(1500);
  for (const [name, up, k] of [['greenland', -62, 0.55], ['antarctica', 68, 0.6], ['whole-day', -20, 1]]) {
    standAt('earth', 5, up, 1); ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 });
    await shot(`c0-${name}-day`, 5000);
    if (u.uIceSheen) { const was = u.uIceSheen.value; u.uIceSheen.value = 0; await shot(`c0-${name}-day-sheen-off`, 1500); u.uIceSheen.value = was; }
  }
  ctx.cameraRig.flyTo({ distance: d0, ms: 0 });
  ctx.clock.goTo(Date.now()); ctx.clock.setPaused(false);
  return { d0, sheen: u.uIceSheen ? u.uIceSheen.value : null };
});
await run('iss', async () => {
  const q = ctx.quality; let want = 2;
  ctx.quality = new Proxy(q, { get: (t, k) => (k === 'tier' ? want : t[k]) });
  Object.defineProperty(ctx, 'latch', { value: { latched: false, force() { return false; } }, configurable: true, writable: true });
  const iss = ctx.recordById('sat-25544');
  if (!iss) return 'no ISS record';
  let t = ctx.clock.now(), found = null;
  for (let i = 0; i < 40 && !found; i++) {
    ctx.clock.goTo(t); await wait(200);
    const v = sceneOf(iss, t); const up = v ? norm(v) : null; const s = sunNow();
    const high = up ? up.x * s.x + up.y * s.y + up.z * s.z : -1;
    if (shadow.sunlitState(iss, t) === 'sunlit' && high > 0.35) found = { t, high }; else t += 3 * 60e3;
  }
  ctx.clock.setPaused(true);
  if (!(await goTo('sat-25544', 30000))) return 'no flight';
  await wait(6000);
  const s = sunNow(); const side = norm(cross(s, V(0, 1, 0))); const back = norm(mix(s, -1, side, 0.3));
  ctx.cameraRig.flyTo({ offset: back, distance: ctx.cameraRig.state.distance * 0.7, ms: 0 });
  await shot('c1-iss-backlit-tier2', 4000);
  want = 0; await shot('c2-iss-backlit-tier0', 2500);
  want = 2;
  ctx.cameraRig.flyTo({ offset: norm(mix(s, 1, side, 0.5)), ms: 0 }); await shot('c3-iss-frontlit-tier2', 3000);
  ctx.quality = q;
  return { found: !!found };
});
await run('rocket', async () => {
  const rb = ctx.records().find((r) => /R\/B/.test(r.name || '') && propagate(r, ctx.clock.now()));
  if (!rb) return 'no rocket body in the saved data';
  await goTo(rb.id, 25000); await wait(3000);
  ctx.clock.setPaused(false); ctx.clock.setRate(3600);
  await shot('c4-rocket-1h-per-s-a', 1500); await shot('c5-rocket-1h-per-s-b', 400); await shot('c6-rocket-1h-per-s-c', 400);
  ctx.clock.setRate(1); ctx.clock.setPaused(true);
  return { id: rb.id, name: rb.name };
});
await run('lander', async () => {
  if (ctx.deselect) ctx.deselect();
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  // The site at its morning: 1969-07-20 is in the past of every clock; pick a day the Sun is up there.
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  const moon = () => ctx.worlds.meshFor('moon');
  let t = ctx.clock.now(), lit = null;
  for (let i = 0; i < 60; i++) {
    ctx.clock.goTo(t); await wait(150);
    const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value);
    const v = sceneOf(ctx.recordById('apollo-11'), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z));
    const d = n.x * sun.x + n.y * sun.y + n.z * sun.z;
    if (d > 0.45) { lit = +d.toFixed(2); break; }
    t += 12 * 3600e3;
  }
  await goTo('apollo-11', 30000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance;
  await shot('c7-apollo11-arrival', 4000);
  ctx.cameraRig.flyTo({ distance: d0 * 0.45, ms: 0 }); await shot('c8-apollo11-close', 3500);
  ctx.cameraRig.flyTo({ distance: d0 * 3, ms: 0 }); await shot('c9-apollo11-back', 3500);
  return { sunDot: lit, d0, stage: ctx.stage.worldId };
});
await run('moons', async () => {
  const o = {};
  const byName = (re) => { const r = ctx.records().find((x) => re.test(x.name || '')); return r ? r.id : null; };
  for (const id of ['iapetus', byName(/^(4 )?Vesta$/i) || 'vesta', 'dwarf-ceres']) {
    if (ctx.deselect) ctx.deselect();
    if (!(await goTo(id, 30000))) { o[id] = 'no record'; continue; }
    const m = ctx.worlds.meshFor(id);
    if (m && m.material.uniforms && m.material.uniforms.uSunDir) {
      const c = m.getWorldPosition(new THREE.Vector3()); const sun = norm(m.material.uniforms.uSunDir.value);
      const cam = ctx.camera.position; const n = norm(V(cam.x - c.x, cam.y - c.y, cam.z - c.z));
      o[id] = { camSunDot: +(n.x * sun.x + n.y * sun.y + n.z * sun.z).toFixed(2) };
    } else o[id] = { mesh: !!m };
    await shot(`d-${id}-arrival`, 5000);
  }
  return o;
});
await run('exoplanet', async () => {
  const o = {};
  for (const id of ['exo-kepler-186-f', 'exo-lhs-1140-b']) {
    if (ctx.deselect) ctx.deselect();
    if (!(await goTo(id, 40000))) { o[id] = 'no record'; continue; }
    await wait(5000);
    const d0 = ctx.cameraRig.state.distance;
    await shot(`e-${id}-arrival`, 3000);
    ctx.cameraRig.flyTo({ distance: d0 * 0.3, ms: 0 }); await shot(`e-${id}-limb`, 4000);
    o[id] = { d0, stage: ctx.stage.worldId, card: text($('#sr-card')) ? text($('#sr-card')).slice(0, 500) : null };
  }
  return o;
});
await run('exoDiag', async () => {
  // A planet of another star pushed in on its system's stage, step by step, with what its face says.
  const o = {};
  const id = new URLSearchParams(location.search).get('exo') || 'exo-kepler-186-f';
  if (!(await goTo(id, 40000))) return 'no record';
  await wait(5000);
  const faces = () => { const a = []; ctx.systems.group.traverse((m) => { if (m.isMesh && m.material && m.material.uniforms && m.material.uniforms.uSeed) a.push(m); }); return a; };
  const nearest = () => { let best = null; const p = new THREE.Vector3(); for (const m of faces()) { const d = m.getWorldPosition(p).distanceTo(ctx.camera.position); if (!best || d < best.d) best = { m, d }; } return best; };
  const say = () => { const n = nearest(); if (!n) return null; const u = n.m.material.uniforms; return { dist: n.d, scale: n.m.scale.x, visible: n.m.visible, verts: n.m.geometry.attributes.position.count, detail: u.uDetail ? u.uDetail.value : null, high: u.uHigh ? u.uHigh.value : null, frost: u.uFrost ? u.uFrost.value : null, near: ctx.camera.near, far: ctx.camera.far, rig: ctx.cameraRig.state.distance }; };
  await until(() => nearest(), 25000); await wait(1500);
  if (!nearest()) return { faces: faces().length, stage: ctx.stage.worldId, active: ctx.systems.active };
  const d0 = ctx.cameraRig.state.distance;
  // From its star's side, forty degrees round: the rig keeps no direction of its own between flights.
  const n0 = nearest(); const c = n0.m.getWorldPosition(new THREE.Vector3());
  let sun = null;
  try { const host = ctx.systems.hostRecordFor(ctx.recordById(id)); const sp = host && ctx.systems.drawnPositionOf(host.id, new THREE.Vector3()); if (sp) sun = norm(V(sp.x - c.x, sp.y - c.y, sp.z - c.z)); } catch { sun = null; }
  o.sunFrom = sun ? 'host' : 'uniform';
  if (!sun || !Number.isFinite(sun.x)) sun = norm(n0.m.material.uniforms.uSunDir.value);
  const sideV = norm(cross(sun, V(0, 1, 0))); const off = norm(mix(sun, Math.cos(40 * DEG), sideV, Math.sin(40 * DEG)));
  o.min = ctx.cameraRig.state.minDistance;
  for (const k of [1, 0.4, 0.15]) {
    ctx.cameraRig.flyTo({ offset: off, distance: d0 * k, ms: 0 }); await shot(`g-push-${k}`, 3000); o['k' + k] = say();
  }
  const n = nearest();
  if (n && n.m.material.uniforms.uDetail) {
    const u = n.m.material.uniforms; const real = u.uDetail;
    u.uDetail = { get value() { return 0; }, set value(v) { /* held at none */ } }; n.m.material.uniformsNeedUpdate = true;
    await shot('g-push-0.3-detail-off', 2500); o.detailOff = say();
    u.uDetail = real;
  }
  return o;
});
await run('nebulae', async () => {
  const o = {};
  ctx.clock.setPaused(true);
  for (const [i, id] of ['dso-m42', 'dso-m1', 'dso-m16', 'dso-m42'].entries()) {
    if (ctx.deselect) ctx.deselect();
    if (!(await goTo(id, 40000))) { o[i + id] = 'no record'; continue; }
    await wait(6000);
    o[i + '-' + id] = { drawn: ctx.nebulae ? ctx.nebulae.drawn(id) : null };
    await shot(`f${i}-${id}`, 2500);
  }
  // M42 from 45 degrees off the line from the Sun: the picture fades and the mark returns in step.
  const st = ctx.cameraRig.state; const cam = ctx.camera.position.clone();
  for (const deg of [30, 45, 60]) {
    const a = deg * DEG; const dir = norm(V(cam.x, cam.y, cam.z)); const sideV = norm(cross(dir, V(0, 1, 0)));
    ctx.cameraRig.flyTo({ offset: norm(mix(dir, Math.cos(a), sideV, Math.sin(a))), ms: 0 });
    await wait(2500); o['m42off' + deg] = ctx.nebulae ? ctx.nebulae.drawn('dso-m42') : null; await shot(`f5-m42-off-${deg}`, 1500);
  }
  if (ctx.exposure) {
    for (const mode of ['eye', 'camera']) { ctx.exposure.set(mode); await shot(`f6-stellar-${mode}`, 3500); }
  }
  return o;
});
return out;
