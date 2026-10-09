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
  for (const id of ['iapetus', 'vesta', 'ceres']) {
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
