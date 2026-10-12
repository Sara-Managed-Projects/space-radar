// public2-c.js -- scene re-checks, run after the interface probe on the desktop only: pasted
// BETWEEN look-common.js and public2-b.js, which calls sceneChecks() at its end.
//   cat tests/probes/look-common.js tests/probes/public2-c.js tests/probes/public2-b.js > /tmp/bc.js
// (public #403: a lander's mark on Mars's night side; #266: the station with the Sun behind it;
// #271: the naked-eye sky after the marks were halved.)
async function sceneChecks() {
  const THREE = await import('/vendor/three.module.min.js');
  const { stage } = await import('/js/scene/stage.js');
  const { propagate } = await import('/js/propagate/index.js');
  const shadow = await import('/js/scene/shadow.js');
  try { if (ctx.passport && ctx.shell && ctx.shell.back) ctx.shell.back(); } catch { /* no view to leave */ }
  // --- Mars: every lander's mark, and whether its ground is in daylight -------------------------
  try {
    for (const id of ['hand-kept-sites']) if (!ctx.isLayerOn(id)) ctx.setLayerOn(id, true);
    if (await goTo('gale', 28000)) {
      const now = ctx.clock.now();
      const mesh = ctx.worlds.meshFor('mars');
      const c = mesh.getWorldPosition(new THREE.Vector3());
      const sun = norm(mesh.material.uniforms.uSunDir.value);
      const sites = ctx.records().filter((r) => r.frame === 'mars-fixed').map((r) => {
        const p = propagate(r, now);
        const v = p ? stage.toSceneInto(p, p.frame || r.frame, new THREE.Vector3(), now) : null;
        if (!v) return null;
        const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z));
        return { id: r.id, n, r: Math.hypot(v.x - c.x, v.y - c.y, v.z - c.z), sunDot: n.x * sun.x + n.y * sun.y + n.z * sun.z, lit: shadow.groundLit(v, c, { x: c.x + sun.x * 1e9, y: c.y + sun.y * 1e9, z: c.z + sun.z * 1e9 }) };
      }).filter(Boolean);
      out.mars = { stage: ctx.stage.worldId, sites: sites.map((s) => `${s.id}:${s.sunDot.toFixed(2)}:${s.lit}`), layerOn: ctx.isLayerOn('hand-kept-sites') };
      const R = sites.length ? sites[0].r : 3.39;
      const night = sites.filter((s) => s.sunDot < -0.1), day = sites.filter((s) => s.sunDot > 0.1);
      const mean = (list) => norm(list.reduce((a, s) => V(a.x + s.n.x, a.y + s.n.y, a.z + s.n.z), V(0, 0, 0)));
      if (ctx.deselect) ctx.deselect();
      await wait(600);
      if (night.length) { ctx.cameraRig.flyTo({ targetScene: c, offset: mean(night), distance: 3.6 * R, ms: 0 }); await shot('mars-sites-night', 5000); }
      if (day.length) { ctx.cameraRig.flyTo({ targetScene: c, offset: mean(day), distance: 3.6 * R, ms: 0 }); await shot('mars-sites-day', 4000); }
      out.mars.shots = { night: night.map((s) => s.id), day: day.map((s) => s.id), dist: ctx.cameraRig.state.distance, R };
    }
  } catch (err) { out.errors.push('mars: ' + String(err && err.message)); }
  // --- the station with the Sun behind it, at the tier that has the rim -------------------------
  try {
    out.qualityWas = ctx.quality && ctx.quality.describe ? ctx.quality.describe() : null;
    // The frame-rate latch trips in a probe that has loaded the whole map; the rim is tier 1 and up.
    // The probe holds the tier at 2 by hand to look at the rim; nothing else reads this.
    const q = ctx.quality;
    ctx.quality = new Proxy(q, { get: (t, k) => (k === 'tier' ? 2 : t[k]) });
    try { Object.defineProperty(ctx, 'latch', { value: { latched: false, force() { return false; } }, configurable: true, writable: true }); } catch { /* a getter that will not move */ }
    const iss = ctx.recordById('sat-25544');
    let t = ctx.clock.now();
    for (let i = 0; i < 24 && shadow.sunlitState(iss, t) !== 'sunlit'; i++) t += 5 * 60e3;
    out.issSunlit = shadow.sunlitState(iss, t);
    ctx.clock.goTo(t); ctx.clock.setPaused(true);
    if (await goTo('sat-25544', 30000)) {
      await wait(5000);
      const s = norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value);
      ctx.cameraRig.flyTo({ offset: s, ms: 0 });
      await shot('iss-sun-behind-camera', 3500);
      ctx.cameraRig.flyTo({ offset: norm(mix(s, -1, cross(s, V(0, 1, 0)), 0.35)), ms: 0 });
      await shot('iss-sun-behind-it', 3500);
      ctx.cameraRig.flyTo({ offset: norm(mix(s, -0.55, cross(s, V(0, 1, 0)), 1)), ms: 0 });
      await shot('iss-sun-three-quarters-behind', 3500);
      out.lightTier = (await import('/js/scene/models.js')).setLightTier(2);
    }
    ctx.clock.setPaused(false);
  } catch (err) { out.errors.push('iss: ' + String(err && err.message)); }
  // --- the naked-eye sky, once more ---------------------------------------------------------------
  try {
    if (ctx.deselect) ctx.deselect();
    const place = { name: 'Cairo', latDeg: 30.04, lonDeg: 31.24, latRad: 30.04 * DEG, lonRad: 31.24 * DEG, altKm: 0, source: 'manual' };
    ctx.setObserver(place);
    ctx.clock.goTo(Date.parse('2026-12-15T20:30:00Z')); ctx.clock.setRate(1);
    await wait(300);
    if (!ctx.skyView.active) ctx.skyView.enter(place);
    await until(() => ctx.skyView.ownsSky, 20000);
    if (ctx.skyView.lookAtDeg) ctx.skyView.lookAtDeg(150, 35);
    await shot('sky-bright-stars-2', 4500);
  } catch (err) { out.errors.push('sky: ' + String(err && err.message)); }
}
