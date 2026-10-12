// run 3 (page-level, after tests/probes/look-common.js; ?sw=0&tier=2): New Horizons, M32/M110, M42's star holes,
// the Moon at Apollo 11, a far comet's tail, #event= cold (in an iframe at the end).
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
const failed = () => new Promise((ok) => ok(performance.getEntriesByType('resource').filter((r) => r.responseStatus >= 400).map((r) => r.name.split('/').slice(-2).join('/')).slice(0, 8)));
await run('nh', async () => {
  const rec = ctx.records().find((r) => /^new horizons$/i.test(r.name || ''));
  if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(6000);
  const o = { id: rec.id, d0: ctx.cameraRig.state.distance };
  let meshes = 0, tris = 0, glb = false; ctx.scene.traverse((n) => { if (n.userData && /new-horizons/.test(JSON.stringify(n.userData.file || n.userData.model || n.name || ''))) glb = true; });
  o.glbAsked = performance.getEntriesByType('resource').filter((r) => /new-horizons\.glb/.test(r.name)).map((r) => [r.responseStatus, r.transferSize]);
  await shot('nh-arrival', 1500);
  ctx.cameraRig.flyTo({ distance: o.d0 * 0.45, ms: 0 }); await shot('nh-closer', 2500);
  return o;
});
for (const id of ['dso-m32', 'dso-m110']) await run(id, async () => {
  const rec = ctx.recordById(id); if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(4000);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, stage: ctx.stage.worldId, k: [] };
  let k = 1, shotAt = null;
  for (let i = 0; i < 16; i++) {
    ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await wait(1200);
    const px = ctx.dsoGlow.widthPx(id), y = ctx.dsoGlow.dotYield(id);
    o.k.push([+k.toPrecision(2), px && Math.round(px), y != null ? +Number(y).toFixed(2) : y]);
    if (px >= 30 && px <= 90 && !shotAt) { shotAt = k; await shot(`${id}-glow`, 1200); }
    if (px && px < 30) break;
    k *= px > 300 ? 3 : 1.6;
  }
  o.shotAt = shotAt; if (!shotAt) await shot(`${id}-glow-none`, 600);
  return o;
});
await run('m42', async () => {
  const rec = ctx.recordById('dso-m42'); if (!rec) return 'no record';
  await goTo(rec.id, 40000);
  const drawn = await until(() => ctx.nebulae.drawn('dso-m42'), 45000, 400); await wait(5000);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, stage: ctx.stage.worldId, drawnInTime: drawn, k: [] };
  const real = ctx.nebulae.holes;
  for (const k of [1, 0.4]) {
    ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await wait(4500);
    o.k.push({ k, holes: ctx.nebulae.holes().map((h) => [h.id, +h.radius.toFixed(4), +h.k.toFixed(2)]), n3d: ctx.stars3d.holeCount(), nsky: ctx.starfield.holeCount(), drawn: ctx.nebulae.drawn('dso-m42') });
    ctx.select(null); await wait(500);
    await shot(`m42-holes-k${k}`, 500);
    ctx.nebulae.holes = () => []; await wait(900);
    await shot(`m42-noholes-k${k}`, 300);
    ctx.nebulae.holes = real; ctx.select(rec, { fly: false }); await wait(300);
  }
  o.pictureAsked = performance.getEntriesByType('resource').filter((r) => /m42|orion/i.test(r.name)).map((r) => [r.name.split('/').pop(), r.responseStatus]).slice(0, 6);
  return o;
});
await run('comet', async () => {
  const AU = 149597870.7;
  const comets = ctx.records().filter((r) => r.klass === 'comet' || /comet/.test(r.layer || ''));
  const sunRec = ctx.recordById('sun');
  const far = [];
  for (const r of comets) { try { const p = propagate(r, ctx.clock.now()); if (!p) continue; const au = Math.hypot(p.x, p.y, p.z) / AU; far.push([r.id, r.name, +au.toFixed(2), p.frame]); } catch { /* skip */ } }
  far.sort((a, b) => b[2] - a[2]);
  const o = { comets: comets.length, farthest: far.slice(0, 4), nearest: far.slice(-2) };
  const pick = far.find((f) => f[2] > 3 && f[2] < 60); if (!pick) return o;
  const rec = await goTo(pick[0], 40000); await wait(4000);
  const tails = []; ctx.scene.traverse((n) => { if (n.userData && n.userData.tails) tails.push([n.name || n.userData.id || '?', n.visible, n.userData.tails.visible]); });
  o.picked = pick; o.selected = ctx.selected() && ctx.selected().id; o.tails = tails.slice(0, 12); o.tailsVisible = tails.filter((t) => t[1] && t[2]).length;
  const card = document.querySelector('#sr-card, .sr-card'); o.card = card ? (card.textContent || '').replace(/\s+/g, ' ').slice(0, 160) : null;
  await shot('comet-far', 800);
  return o;
});
await run('moon', async () => {
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  const moon = () => ctx.worlds.meshFor('moon');
  ctx.clock.setPaused(true);
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  let t = ctx.clock.now(), lit = null;
  for (let i = 0; i < 60; i++) { ctx.clock.goTo(t); await wait(120); const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value); const v = sceneOf(ctx.recordById('apollo-11'), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); if (n.x * sun.x + n.y * sun.y + n.z * sun.z > 0.5) { lit = 1; break; } t += 12 * 3600e3; }
  await goTo('apollo-11', 30000); await wait(3000);
  const mesh = moon(); const c = mesh.getWorldPosition(new THREE.Vector3()); const v = sceneOf(ctx.recordById('apollo-11'), ctx.clock.now());
  const up = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); const east = norm(cross(V(0, 1, 0), up));
  const o = { lit, tris: mesh.geometry.index ? mesh.geometry.index.count / 3 : null, arrival: ctx.cameraRig.state.distance * 1000, views: [] };
  await shot('moon-arrival', 800);
  for (const [distKm, elev] of [[0.05, 4], [0.1, 8], [0.3, 15], [3, 12], [40, 10]]) {
    const dir = norm(mix(up, Math.sin(elev * DEG), east, Math.cos(elev * DEG)));
    ctx.cameraRig.flyTo({ offset: dir, distance: distKm / 1000, ms: 0 }); await wait(2500);
    const cw = new THREE.Vector3(); ctx.camera.getWorldPosition(cw);
    const toC = V(c.x - cw.x, c.y - cw.y, c.z - cw.z); const r = Math.hypot(toC.x, toC.y, toC.z);
    const hit = new THREE.Raycaster(cw, new THREE.Vector3(toC.x / r, toC.y / r, toC.z / r), 0, r * 2).intersectObject(mesh, false)[0];
    // the lander's place against the drawn ground under it: metres above the polygon
    const lp = new THREE.Vector3(v.x, v.y, v.z); const down = new THREE.Vector3(c.x - v.x, c.y - v.y, c.z - v.z).normalize();
    const start = lp.clone().addScaledVector(down, -0.05); const gh = new THREE.Raycaster(start, down, 0, 1).intersectObject(mesh, false)[0];
    o.views.push({ askedKm: distKm, elev, gotKm: +(ctx.cameraRig.state.distance * 1000).toFixed(3), camOverTrueM: Math.round((r * 1000 - 1737.4) * 1000), camOverPolygonM: hit ? Math.round(hit.distance * 1e6) : null, landerOverPolygonM: gh ? Math.round((gh.distance - 0.05) * 1e6) : null });
    await shot(`moon-${distKm}km-e${elev}`, 900);
  }
  ctx.clock.setPaused(false);
  return o;
});
out.failedRequests = await failed();
await run('event', async () => {
  try { ctx.trip.stop('leave'); } catch { /* none */ }
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:99999;background:#000';
  f.src = location.origin + '/?sw=0&tier=1#event=apollo-11.landing'; document.body.appendChild(f);
  const w = () => f.contentWindow; const t0 = Date.now(); const seen = [];
  const note = () => { try { const n = w().document.querySelector('.sr-scenenote'); return n && !n.hidden ? (n.textContent || '').trim().slice(0, 80) : ''; } catch { return ''; } };
  while (Date.now() - t0 < 40000) { const n = note(); if (n && !seen.some((s) => s[1] === n)) seen.push([Date.now() - t0, n]); let c = null; try { c = w().spaceRadar; } catch { /* not yet */ } if (c && w().__srLayersReady && Date.now() - t0 > 12000 && new Date(c.clock.now()).getUTCFullYear() === 1969) break; await wait(250); }
  await wait(5000);
  const c = w().spaceRadar;
  const o = { notes: seen, clock: new Date(c.clock.now()).toISOString(), stage: c.stage && c.stage.worldId, selected: c.selected() && c.selected().name, unknown: seen.some((s) => /unknown|not known|no such/i.test(s[1])), tookMs: Date.now() - t0 };
  await shot('event-cold', 500);
  return o;
});
return out;
