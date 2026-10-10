// Bulk 3, agent b, run B. After look-common.js (see bulk3-b-a.js for the run line).
// 1. The Moon close to the ground at Apollo 11 (internal #565: stars below the horizon): the camera at 300 m and 100 m,
//    its height over the true radius and over the drawn polygon, the frame.  2. New Horizons' NASA mesh.
// 3. Andromeda's companions M32 and M110: the glow with no dot on it.  4. The Sun's spots: the state of the draw.
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
const moon = () => ctx.worlds.meshFor('moon');
await run('nh', async () => {
  const rec = ctx.records().find((r) => /^new horizons$/i.test(r.name || '')) || ctx.records().find((r) => /new horizons/i.test(r.name || ''));
  if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(5000);
  const o = { id: rec.id, d0: ctx.cameraRig.state.distance, stage: ctx.stage.worldId };
  await shot('nh-arrival', 3000);
  ctx.cameraRig.flyTo({ distance: o.d0 * 0.5, ms: 0 }); await shot('nh-closer', 2500);
  let names = []; ctx.scene.traverse((n) => { if (n.name && /^(foil|body|dish|rtg|solar)/i.test(n.name) && n.isMesh) names.push(n.name); }); o.meshNames = [...new Set(names)].slice(0, 12);
  return o;
});
await run('m32', async () => {
  const rec = ctx.recordById('dso-m32') || ctx.records().find((r) => /^M32$|M 32/i.test(r.name || ''));
  if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance; const o = { id: rec.id, d0, stage: ctx.stage.worldId, shots: [] };
  for (const k of [3, 1, 0.4]) { ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await shot(`m32-k${k}`, 2500); o.shots.push(k); }
  return o;
});
await run('moonclose', async () => {
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  ctx.clock.setPaused(true);
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  // a lit instant
  let t = ctx.clock.now(), lit = null;
  for (let i = 0; i < 60; i++) { ctx.clock.goTo(t); await wait(120); const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value); const v = sceneOf(ctx.recordById('apollo-11'), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); if (n.x * sun.x + n.y * sun.y + n.z * sun.z > 0.5) { lit = 1; break; } t += 12 * 3600e3; }
  await goTo('apollo-11', 30000); await wait(2500);
  const mesh = moon(); const c = mesh.getWorldPosition(new THREE.Vector3()); const v = sceneOf(ctx.recordById('apollo-11'), ctx.clock.now());
  const up = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); const east = norm(cross(V(0, 1, 0), up));
  const o = { lit, views: [], min: ctx.cameraRig.minDistance || (ctx.cameraRig.state && ctx.cameraRig.state.minDistance) || null };
  for (const [distKm, elev] of [[2, 10], [0.3, 10], [0.1, 6], [0.1, 40]]) {
    const dir = norm(mix(up, Math.sin(elev * DEG), east, Math.cos(elev * DEG)));
    ctx.cameraRig.flyTo({ offset: dir, distance: distKm / 1000, ms: 0 }); await wait(2500);
    const cw = new THREE.Vector3(); ctx.camera.getWorldPosition(cw);
    const toC = V(c.x - cw.x, c.y - cw.y, c.z - cw.z); const r = Math.hypot(toC.x, toC.y, toC.z);
    const ray = new THREE.Raycaster(cw, new THREE.Vector3(toC.x / r, toC.y / r, toC.z / r), 0, r * 2);
    const hit = ray.intersectObject(mesh, false)[0];
    // is the camera inside the polygon sphere (below the mesh surface)?
    o.views.push({ distKm, elev, camDist: ctx.cameraRig.state.distance * 1000, altOverTrueM: Math.round((r * 1000 - 1737.4) * 1000), altOverPolygonM: hit ? Math.round(hit.distance * 1e6) : null, near: ctx.camera.near });
    await shot(`moon-close-${distKm}km-e${elev}`, 800);
  }
  ctx.clock.setPaused(false);
  return o;
});
await run('sun', async () => {
  ctx.clock.live();
  await goTo('sun'); await wait(2500);
  return { state: ctx.sunDetail ? ctx.sunDetail.state() : null, regions: ctx.sunRegions ? JSON.stringify(ctx.sunRegions).slice(0, 300) : null, sources: (() => { try { return ctx.sources.status().filter((r) => /solar-regions/.test(r.id)).map((r) => `${r.id}:${r.via}:${r.state}`); } catch (e) { return String(e); } })() };
});
return out;
