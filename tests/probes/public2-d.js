// public2-d.js -- two close looks the first probes could not give (public #266, #403). After
// look-common.js, at 1440x900:
//   the station with the Sun behind it, with the rim and the glint (tier 2) and without (tier 0),
//   from the same place at the same instant; and a lander's mark on Mars by night and by day.
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const shadow = await import('/js/scene/shadow.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
// --- the station --------------------------------------------------------------------------------
try {
  out.qualityAtBoot = ctx.quality.describe();
  const q = ctx.quality;
  let want = 2;
  ctx.quality = new Proxy(q, { get: (t, k) => (k === 'tier' ? want : t[k]) });
  Object.defineProperty(ctx, 'latch', { value: { latched: false, force() { return false; } }, configurable: true, writable: true });
  const iss = ctx.recordById('sat-25544');
  const sunNow = () => norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value);
  let t = ctx.clock.now(), found = null;
  for (let i = 0; i < 40 && !found; i++) {
    ctx.clock.goTo(t); await wait(250);
    const v = sceneOf(iss, t);
    const up = v ? norm(v) : null;
    const s = sunNow();
    const high = up ? up.x * s.x + up.y * s.y + up.z * s.z : -1;
    if (shadow.sunlitState(iss, t) === 'sunlit' && high > 0.35) found = { t, high }; else t += 3 * 60e3;
  }
  out.issAt = found ? { iso: new Date(found.t).toISOString(), sunHeight: +found.high.toFixed(2) } : null;
  ctx.clock.setPaused(true);
  if (await goTo('sat-25544', 30000)) {
    await wait(6000);
    const s = sunNow();
    const side = norm(cross(s, V(0, 1, 0)));
    const back = norm(mix(s, -1, side, 0.3));
    ctx.cameraRig.flyTo({ offset: back, distance: ctx.cameraRig.state.distance * 0.7, ms: 0 });
    await wait(1500);
    const cam = ctx.camera.position.clone(), tgt = sceneOf(iss, ctx.clock.now());
    const look = tgt ? norm(V(tgt.x - cam.x, tgt.y - cam.y, tgt.z - cam.z)) : null;
    out.issPose = { intoSun: look ? +(look.x * s.x + look.y * s.y + look.z * s.z).toFixed(2) : null, distance: ctx.cameraRig.state.distance };
    await shot('iss-backlit-tier2', 3000);
    want = 0;
    await shot('iss-backlit-tier0', 2500);
    want = 2;
    ctx.cameraRig.flyTo({ offset: norm(mix(s, 1, side, 0.5)), ms: 0 });
    await shot('iss-frontlit-tier2', 3000);
  }
  ctx.clock.setPaused(false);
} catch (err) { out.errors.push('iss: ' + String(err && err.stack || err).slice(0, 300)); }
// --- Mars's landers, close --------------------------------------------------------------------------
try {
  if (ctx.deselect) ctx.deselect();
  if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true);
  const mesh0 = () => ctx.worlds.meshFor('mars');
  for (const id of ['viking-1', 'gale']) {
    if (!(await goTo(id, 30000))) continue;
    const now = ctx.clock.now();
    const c = mesh0().getWorldPosition(new THREE.Vector3());
    const sun = norm(mesh0().material.uniforms.uSunDir.value);
    const v = sceneOf(ctx.recordById(id), now);
    const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z));
    out['mars_' + id] = { sunDot: +(n.x * sun.x + n.y * sun.y + n.z * sun.z).toFixed(2), lit: shadow.groundLit(v, c, { x: c.x + sun.x * 1e9, y: c.y + sun.y * 1e9, z: c.z + sun.z * 1e9 }), dist: ctx.cameraRig.state.distance, stage: ctx.stage.worldId };
    await shot('mars-' + id + '-arrival', 4000);
    ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 6, ms: 0 });
    await shot('mars-' + id + '-back', 3500);
  }
} catch (err) { out.errors.push('mars: ' + String(err && err.stack || err).slice(0, 300)); }
out.ms = Date.now() - t0;
return out;
