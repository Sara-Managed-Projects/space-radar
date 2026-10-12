// Bulk 3, agent b, run E: what run D could not show. After look-common.js (run line in bulk3-b-a.js).
// 1. Orion Nebula's picture with and without the star holes.  2. M32's glow with no dot on it.  3. A sunspot pair close up.
const THREE = await import('/vendor/three.module.min.js');
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
await run('m42', async () => {
  const rec = ctx.recordById('dso-m42'); if (!rec) return 'no record';
  ctx.setStage && ctx.stage.worldId !== 'stellar' && ctx.setStage('stellar');
  await wait(1500);
  ctx.select(rec, { fly: true }); await wait(3000);
  while (ctx.cameraRig.state.flying) await wait(300);
  await until(() => { const s = ctx.nebulae && ctx.nebulae.state().find((x) => x.id === 'm42'); return s && s.state === 'ready'; }, 40000, 500);
  await wait(3000);
  const st = () => (ctx.nebulae ? ctx.nebulae.state().filter((x) => x.id === 'm42').map((x) => JSON.stringify(x).slice(0, 260)) : 'no nebulae');
  const o = { d0: ctx.cameraRig.state.distance, stage: ctx.stage.worldId, state0: st(), k: [] };
  const real = ctx.nebulae.holes;
  for (const k of [1, 0.4]) {
    ctx.cameraRig.flyTo({ distance: o.d0 * k, ms: 0 }); await wait(3500);
    o.k.push({ k, state: st(), holes: ctx.nebulae.holes().map((h) => [h.id, +h.radius.toFixed(4), +h.k.toFixed(2)]), n3d: ctx.stars3d.holeCount(), nsky: ctx.starfield.holeCount() });
    await shot(`m42e-holes-k${k}`, 300);
    ctx.nebulae.holes = () => []; await wait(700);
    await shot(`m42e-noholes-k${k}`, 300);
    ctx.nebulae.holes = real;
  }
  return o;
});
await run('m32', async () => {
  const rec = ctx.recordById('dso-m32'); if (!rec) return 'no record';
  ctx.select(rec, { fly: true }); await wait(4000);
  while (ctx.cameraRig.state.flying) await wait(300);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, k: [] };
  for (const k of [12, 5, 2.5]) {
    ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await wait(2500);
    o.k.push({ k, px: Math.round(ctx.dsoGlow.widthPx('dso-m32')), yield: +ctx.dsoGlow.dotYield('dso-m32').toFixed(2) });
    await shot(`m32e-k${k}`, 400);
  }
  return o;
});
await run('spots', async () => {
  ctx.clock.live();
  await goTo('sun'); await wait(2000);
  const e = ctx.worlds.meshFor('earth').position; const sunMesh = ctx.worlds.meshFor('sun'); const sp = sunMesh.position;
  const d = norm(V(e.x - sp.x, e.y - sp.y, e.z - sp.z));
  ctx.cameraRig.flyTo({ offset: d, distance: ctx.cameraRig.state.distance, ms: 0 });
  await wait(300);
  for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await wait(100); }
  await until(() => ctx.sunDetail && ctx.sunRegions, 20000); await wait(2500);
  const U = sunMesh.material && sunMesh.material.uniforms;
  const o = { hasU: !!(U && U.uSpots), count: U && U.uSpotCount && U.uSpotCount.value, spots: [], R: sunMesh.scale.x };
  if (!(U && U.uSpots && o.count)) return o;
  for (let i = 0; i < o.count; i++) { const s = U.uSpots.value[i]; o.spots.push([+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3), +s.w.toFixed(4)]); }
  let best = 0; for (let i = 1; i < o.count; i++) if (U.uSpots.value[i].w > U.uSpots.value[best].w) best = i;
  const s = U.uSpots.value[best];
  // the spot is in the Sun's body-fixed frame: its world place through the mesh's matrix
  const w = new THREE.Vector3(s.x, s.y, s.z).applyMatrix4(sunMesh.matrixWorld);
  const sc = sunMesh.getWorldPosition(new THREE.Vector3());
  const outDir = norm(V(w.x - sc.x, w.y - sc.y, w.z - sc.z));
  o.best = best;
  ctx.cameraRig.flyTo({ targetScene: { x: w.x, y: w.y, z: w.z }, offset: outDir, distance: o.R * 0.18, ms: 0 });
  await wait(3500);
  o.distance = ctx.cameraRig.state.distance; o.share = ctx.worlds.discShare('sun');
  await shot('sunspot-close-e', 800);
  ctx.cameraRig.flyTo({ targetScene: { x: w.x, y: w.y, z: w.z }, offset: outDir, distance: o.R * 0.45, ms: 0 });
  await wait(2500);
  await shot('sunspot-mid-e', 600);
  return o;
});
return out;
