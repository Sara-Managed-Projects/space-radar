// Tracker 550's three looks (internal #550; #161, #425, #478). After look-common.js, at 1440x900 with
// `?sw=0&tier=2`:
//   cat tests/probes/look-common.js tests/probes/tracker4-models.js > /tmp/p.js
//   cdp1-long.sh <wt> 'http://127.0.0.1:<port>/?sw=0&tier=2' /tmp/p.js --width=1440 --height=900 --gl=gpu \
//     --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
// 1. The Apollo 11 lunar module close, the panel/foil terms ON and OFF at the same instant, and the
//    soft edge of the ground patch beneath it. 2. A spent stage at an hour a second: its orientation
//    measured every animation frame (a still cannot show steadiness). 3. Shepard's golf balls on their disc.
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const models = await import('/js/scene/models.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
// heroes.js reads the tier every frame, so the on/off pair goes through a proxy on ctx.quality (as public2-d.js did).
let want = 2;
{ const q = ctx.quality; ctx.quality = new Proxy(q, { get: (t, k) => (k === 'tier' ? want : t[k]) });
  Object.defineProperty(ctx, 'latch', { value: { latched: false, force() { return false; } }, configurable: true, writable: true }); }
await run('lander', async () => {
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  const moon = () => ctx.worlds.meshFor('moon');
  let t = ctx.clock.now(), lit = null;
  ctx.clock.setPaused(true);
  for (let i = 0; i < 60; i++) {
    ctx.clock.goTo(t); await wait(150);
    const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value);
    const v = sceneOf(ctx.recordById('apollo-11'), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z));
    const d = n.x * sun.x + n.y * sun.y + n.z * sun.z;
    if (d > 0.5) { lit = +d.toFixed(2); break; }
    t += 12 * 3600e3;
  }
  await goTo('apollo-11', 30000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance;
  out.surfaceOn = models.surfaceTermsOn();
  ctx.cameraRig.flyTo({ distance: d0 * 0.3, ms: 0 });
  await shot('lm-close-terms-on', 3500);
  want = 0;
  await shot('lm-close-terms-off', 1500);
  want = 2;
  // The patch: from the Sun's side, low over the ground, so the edge is read against the map.
  const mesh = moon();
  const c = mesh.getWorldPosition(new THREE.Vector3()); const v = sceneOf(ctx.recordById('apollo-11'), ctx.clock.now());
  const up = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); const sun = norm(mesh.material.uniforms.uSunDir.value);
  const side = norm(cross(up, sun));
  ctx.cameraRig.flyTo({ offset: norm(mix(up, 1, side, 0.35)), distance: d0 * 0.2, ms: 0 });
  await shot('lm-patch-edge-oblique', 3500);
  ctx.cameraRig.flyTo({ offset: up, distance: d0 * 0.2, ms: 0 });
  await shot('lm-patch-edge-top', 2500);
  const patch = (() => { let f = null; ctx.scene.traverse((n) => { if (n.name === 'ground-patch') f = n; }); return f; })();
  ctx.clock.setPaused(false);
  return { sunDot: lit, d0, stage: ctx.stage.worldId, patch: !!patch, patchKids: patch ? patch.children.map((k) => k.name + ':' + k.children.length) : null };
});
await run('golf', async () => {
  try { if (!ctx.isLayerOn('oddities')) ctx.setLayerOn('oddities', true); } catch { /* none */ }
  const rec = ctx.records().find((r) => /golf/i.test(r.id + ' ' + (r.name || '')));
  if (!rec) return 'no record';
  await goTo(rec.id, 30000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance;
  ctx.cameraRig.flyTo({ distance: d0 * 0.5, ms: 0 });
  await shot('golf-balls-disc', 3500);
  return { id: rec.id, d0 };
});
await run('stage', async () => {
  ctx.clock.setPaused(false); ctx.clock.setRate(1);
  const rb = ctx.records().find((r) => /R\/B/.test(r.name || '') && propagate(r, ctx.clock.now()));
  if (!rb) return 'no rocket body in the saved data';
  await goTo(rb.id, 25000); await wait(3000);
  ctx.clock.setPaused(false); ctx.clock.setRate(3600);
  await wait(800);
  let obj = null; ctx.scene.traverse((n) => { if (n.userData && n.userData.recordId === rb.id) obj = n; });
  if (!obj) return { id: rb.id, error: 'model not drawn' };
  const samples = []; let prev = null; const q = obj.quaternion.clone();
  const t1 = performance.now();
  await new Promise((res) => {
    const tick = (now) => {
      const cur = obj.getWorldQuaternion(new THREE.Quaternion());
      if (prev) { const d = Math.abs(prev.dot(cur)); samples.push([now, 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI]); }
      prev = cur;
      if (now - t1 < 4000) requestAnimationFrame(tick); else res();
    };
    requestAnimationFrame(tick);
  });
  await shot('stage-a', 200); await shot('stage-b', 150); await shot('stage-c', 150);
  ctx.clock.setRate(1); ctx.clock.setPaused(true);
  const degs = samples.map((s) => s[1]);
  const secs = (samples[samples.length - 1][0] - samples[0][0]) / 1000;
  const sorted = degs.slice().sort((a, b) => a - b);
  const tu = obj.userData.tumble;
  return {
    id: rb.id, name: rb.name, frames: degs.length, seconds: +secs.toFixed(2),
    meanDegPerFrame: +(degs.reduce((a, b) => a + b, 0) / degs.length).toFixed(2),
    p10: +sorted[Math.floor(sorted.length * 0.1)].toFixed(2), median: +sorted[sorted.length >> 1].toFixed(2), p90: +sorted[Math.floor(sorted.length * 0.9)].toFixed(2), max: +sorted[sorted.length - 1].toFixed(2),
    degPerSecond: +(degs.reduce((a, b) => a + b, 0) / secs).toFixed(1),
    expectedDegPerSecond: tu ? +(240 / (tu.periodMs / 1000) * 360).toFixed(1) : null,
    periodS: tu ? tu.periodMs / 1000 : null,
  };
});
out.ms.total = Date.now() - t0;
return out;
