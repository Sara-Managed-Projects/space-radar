// Bulk 3, agent b, run D: the looks for what was built. After look-common.js (run line in bulk3-b-a.js).
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
const moon = () => ctx.worlds.meshFor('moon');
const cardText = () => { const c = document.querySelector('#sr-card, .sr-card'); return c ? (c.textContent || '').replace(/\s+/g, ' ') : ''; };
await run('trappist', async () => {
  const rec = ctx.recordById('star-trappist-1'); if (!rec) return 'no record';
  await goTo(rec.id, 25000); await wait(3000);
  const about = [...document.querySelectorAll('.sr-card button, .sr-card summary')].find((x) => /^\s*About it\s*$/.test(x.textContent || '')); if (about) about.click();
  await wait(800); await shot('trappist-card2', 500);
  return { glow: (cardText().match(/Glow\s*[^.]{0,110}/) || ['(no Glow row)'])[0] };
});
await run('moon', async () => {
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  ctx.clock.setPaused(true);
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  let t = ctx.clock.now(), lit = null;
  for (let i = 0; i < 60; i++) { ctx.clock.goTo(t); await wait(120); const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value); const v = sceneOf(ctx.recordById('apollo-11'), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); if (n.x * sun.x + n.y * sun.y + n.z * sun.z > 0.5) { lit = 1; break; } t += 12 * 3600e3; }
  await goTo('apollo-11', 30000); await wait(2500);
  const mesh = moon(); const c = mesh.getWorldPosition(new THREE.Vector3()); const v = sceneOf(ctx.recordById('apollo-11'), ctx.clock.now());
  const up = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); const east = norm(cross(V(0, 1, 0), up));
  const o = { lit, tris: mesh.geometry.index ? mesh.geometry.index.count / 3 : null, views: [] };
  for (const [distKm, elev] of [[0.1, 6], [0.1, 40], [3, 12]]) {
    const dir = norm(mix(up, Math.sin(elev * DEG), east, Math.cos(elev * DEG)));
    ctx.cameraRig.flyTo({ offset: dir, distance: distKm / 1000, ms: 0 }); await wait(2500);
    const cw = new THREE.Vector3(); ctx.camera.getWorldPosition(cw);
    const toC = V(c.x - cw.x, c.y - cw.y, c.z - cw.z); const r = Math.hypot(toC.x, toC.y, toC.z);
    const hit = new THREE.Raycaster(cw, new THREE.Vector3(toC.x / r, toC.y / r, toC.z / r), 0, r * 2).intersectObject(mesh, false)[0];
    const lm = V(v.x - cw.x, v.y - cw.y, v.z - cw.z);
    const hitLm = new THREE.Raycaster(cw, new THREE.Vector3(lm.x, lm.y, lm.z).normalize(), 0, 10).intersectObject(mesh, false)[0];
    o.views.push({ distKm, elev, altOverTrueM: Math.round((r * 1000 - 1737.4) * 1000), polygonUnderTrueM: hit ? Math.round((r - hit.distance) * 1e6 - 1737400) : null });
    await shot(`moon2-${distKm}km-e${elev}`, 800);
  }
  ctx.clock.setPaused(false);
  return o;
});
await run('m32', async () => {
  const rec = ctx.recordById('dso-m32'); if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, stage: ctx.stage.worldId, k: [] };
  for (const k of [1, 0.3, 0.1, 0.03]) {
    ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await wait(2500);
    o.k.push({ k, px: ctx.dsoGlow.widthPx('dso-m32'), yield: ctx.dsoGlow.dotYield('dso-m32'), shaped: ctx.dsoGlow.shaped().length });
    await shot(`m32b-k${k}`, 500);
  }
  return o;
});
await run('m42', async () => {
  const rec = ctx.recordById('dso-m42'); if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(6000);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, stage: ctx.stage.worldId, k: [] };
  const real = ctx.nebulae.holes;
  for (const k of [0.5, 0.15]) {
    ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await wait(4000);
    o.k.push({ k, holes: ctx.nebulae.holes().map((h) => [h.id, +h.radius.toFixed(4), +h.k.toFixed(2)]), n3d: ctx.stars3d.holeCount(), nsky: ctx.starfield.holeCount(), drawn: ctx.nebulae.drawn('dso-m42') });
    await shot(`m42-holes-k${k}`, 300);
    ctx.nebulae.holes = () => []; await wait(600);
    await shot(`m42-noholes-k${k}`, 300);
    ctx.nebulae.holes = real;
  }
  return o;
});
await run('orion-side', async () => {
  if (!(await tripStop('the-constellations', 1))) return 'no trip';
  await wait(3500);
  let drops = 0, labels = [];
  ctx.scene.traverse((n) => { if (/^figure:.*:drops$/.test(n.name || '')) drops++; });
  for (const el of document.querySelectorAll('#labels .sr-sky-label')) if (!el.hidden) labels.push(el.textContent);
  await shot('orion-side-stop2', 500);
  return { drops, labels: labels.slice(0, 10), stage: ctx.stage.worldId };
});
await run('spots', async () => {
  try { ctx.trip.stop('leave'); } catch { /* none */ }
  ctx.clock.live();
  await goTo('sun'); await wait(2000);
  const e = ctx.worlds.meshFor('earth').position; const sp = ctx.worlds.meshFor('sun').position;
  const d = norm(V(e.x - sp.x, e.y - sp.y, e.z - sp.z));
  ctx.cameraRig.flyTo({ offset: d, distance: ctx.cameraRig.state.distance, ms: 0 });
  await wait(300);
  for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await wait(100); }
  await until(() => ctx.sunDetail && ctx.sunRegions, 20000); await wait(2000);
  let U = null; ctx.scene.traverse((o) => { if (!U && o.material && o.material.uniforms && o.material.uniforms.uSpots) U = o.material.uniforms; });
  const sunMesh = ctx.worlds.meshFor('sun');
  const o = { count: U && U.uSpotCount.value, spots: [] };
  if (U) for (let i = 0; i < U.uSpotCount.value; i++) { const s = U.uSpots.value[i]; o.spots.push([+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3), +s.w.toFixed(4)]); }
  // the largest spot: world place, then the camera on it
  if (U && o.count) {
    let best = 0; for (let i = 1; i < o.count; i++) if (U.uSpots.value[i].w > U.uSpots.value[best].w) best = i;
    const s = U.uSpots.value[best]; const R = sunMesh.scale.x;
    const w = new THREE.Vector3(s.x, s.y, s.z).multiplyScalar(R).applyMatrix4(sunMesh.matrixWorld);
    const sc = sunMesh.getWorldPosition(new THREE.Vector3());
    const out_ = norm(V(w.x - sc.x, w.y - sc.y, w.z - sc.z));
    ctx.cameraRig.flyTo({ targetScene: { x: w.x, y: w.y, z: w.z }, offset: out_, distance: R * 0.25, ms: 0 });
    await wait(3500);
    await shot('sunspot-close-1', 800);
    o.closeDistance = ctx.cameraRig.state.distance; o.R = R;
    // the pair partner: the second-nearest spot to the first
    let near = -1, nd = 9; for (let i = 0; i < o.count; i++) { if (i === best) continue; const t = U.uSpots.value[i]; const dd = Math.hypot(t.x - s.x, t.y - s.y, t.z - s.z); if (dd < nd) { nd = dd; near = i; } }
    o.pairGap = near >= 0 ? +nd.toFixed(4) : null;
  }
  return o;
});
return out;
