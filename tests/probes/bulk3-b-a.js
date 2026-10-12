// Bulk 3, agent b, run A (internal #548, #549, #550, #565). After look-common.js, at 1440x900 with `?sw=0&tier=2`:
//   cat tests/probes/look-common.js tests/probes/bulk3-b-a.js > /tmp/p.js
//   cdp1-long.sh <wt> 'http://127.0.0.1:<port>/?sw=0&tier=2' /tmp/p.js --width=1440 --height=900 --gl=gpu \
//     --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
// 1. Stars below the Moon's horizon at Apollo 11's site: the camera low over the ground looking at the horizon, the
//    camera's height over the true radius and the drawn polygon's, at three elevations.
// 2. Shepard's golf balls at an instant when the Sun is up at the Apollo 14 site (the earlier frame was the night side).
// 3. The Sun from the Earth's side (sunspot pairs) and TRAPPIST-1's own card (the Glow row).
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const sceneOf = (rec, t) => { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
out.tier = ctx.quality && ctx.quality.tier;
const moon = () => ctx.worlds.meshFor('moon');
async function litInstant(recId, minDot = 0.5) {
  let t = ctx.clock.now(), lit = null;
  ctx.clock.setPaused(true);
  for (let i = 0; i < 60; i++) {
    ctx.clock.goTo(t); await wait(150);
    const c = moon().getWorldPosition(new THREE.Vector3()); const sun = norm(moon().material.uniforms.uSunDir.value);
    const v = sceneOf(ctx.recordById(recId), t); const n = norm(V(v.x - c.x, v.y - c.y, v.z - c.z));
    const d = n.x * sun.x + n.y * sun.y + n.z * sun.z;
    if (d > minDot) { lit = +d.toFixed(2); break; }
    t += 12 * 3600e3;
  }
  return lit;
}
await run('moon', async () => {
  try { if (!ctx.isLayerOn('hand-kept-sites')) ctx.setLayerOn('hand-kept-sites', true); } catch { /* another name */ }
  if (!(await goTo('apollo-11', 30000))) return 'no record';
  const lit = await litInstant('apollo-11');
  await goTo('apollo-11', 30000); await wait(3500);
  const o = { sunDot: lit, d0: ctx.cameraRig.state.distance, stage: ctx.stage.worldId, views: [] };
  const mesh = moon();
  const geo = mesh.geometry; o.segments = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
  const c = mesh.getWorldPosition(new THREE.Vector3()); const v = sceneOf(ctx.recordById('apollo-11'), ctx.clock.now());
  const up = norm(V(v.x - c.x, v.y - c.y, v.z - c.z)); const sun = norm(mesh.material.uniforms.uSunDir.value);
  const east = norm(cross(V(0, 1, 0), up));
  const unitKm = ctx.stage.unitKm || 1000;
  for (const [elev, k] of [[8, 1], [25, 1], [60, 1], [8, 4]]) {
    const hz = norm(mix(east, 1, sun, 0)); // along the ground to the east
    const dir = norm(mix(up, Math.sin(elev * DEG), hz, Math.cos(elev * DEG)));
    ctx.cameraRig.flyTo({ offset: dir, distance: o.d0 * k, ms: 0 });
    await wait(2500);
    const cp = ctx.camera.position.clone ? ctx.camera.position.clone() : ctx.camera.position;
    const cw = new THREE.Vector3(); ctx.camera.getWorldPosition(cw);
    const toC = V(c.x - cw.x, c.y - cw.y, c.z - cw.z); const r = Math.hypot(toC.x, toC.y, toC.z);
    const ray = new THREE.Raycaster(cw, new THREE.Vector3(toC.x / r, toC.y / r, toC.z / r), 0, r * 2);
    const hit = ray.intersectObject(mesh, false)[0];
    const trueR = 1737.4;
    o.views.push({ elev, k, camDistFromSite: ctx.cameraRig.state.distance * unitKm, altOverTrueKm: +(r * unitKm - trueR).toFixed(4), altOverPolygonKm: hit ? +((hit.distance * unitKm)).toFixed(4) : null, polygonUnderTrueKm: hit ? +((r - hit.distance) * unitKm - trueR).toFixed(4) : null, near: ctx.camera.near });
    await shot(`moon-horizon-e${elev}-k${k}`, 800);
  }
  ctx.clock.setPaused(false);
  return o;
});
await run('golf', async () => {
  try { if (!ctx.isLayerOn('oddities')) ctx.setLayerOn('oddities', true); } catch { /* none */ }
  const rec = ctx.records().find((r) => /golf/i.test(r.id + ' ' + (r.name || '')));
  if (!rec) return 'no record';
  const lit = await litInstant(rec.id, 0.45);
  await goTo(rec.id, 40000); await wait(3500);
  const d0 = ctx.cameraRig.state.distance; const o = { id: rec.id, sunDot: lit, d0, shots: [] };
  for (const k of [0.1, 0.03]) { ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 }); await shot(`golf-lit-k${k}`, 3500); o.shots.push(k); }
  ctx.clock.setPaused(false);
  return o;
});
await run('sun', async () => {
  ctx.clock.live();
  await goTo('sun');
  try {
    const e = ctx.worlds.meshFor('earth').position; const sp = ctx.worlds.meshFor('sun').position;
    const d = norm(V(e.x - sp.x, e.y - sp.y, e.z - sp.z));
    ctx.cameraRig.flyTo({ offset: d, distance: ctx.cameraRig.state.distance, ms: 0 });
  } catch { /* the side it arrived on */ }
  await wait(300);
  for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await wait(120); }
  await until(() => ctx.sunDetail && ctx.sunRegions, 20000);
  await wait(2500);
  await shot('sun-earthside-spots', 600);
  const line = document.querySelector('.sr-card__sunspots');
  return { share: ctx.worlds.discShare('sun'), cardSpots: line ? (line.textContent || '').slice(0, 400) : null, regions: ctx.sunRegions ? (ctx.sunRegions.count || ctx.sunRegions.length || true) : null };
});
await run('trappist', async () => {
  const whole = () => { const c = document.querySelector('#sr-card, .sr-card'); return c ? (c.textContent || '').replace(/\s+/g, ' ') : ''; };
  const rec = ctx.recordById('star-trappist-1');
  if (!rec) return 'no record';
  await goTo(rec.id, 25000); await wait(2500);
  const a = whole();
  const about = [...document.querySelectorAll('.sr-card button, .sr-card summary')].find((x) => /^\s*About it\s*$/.test(x.textContent || ''));
  if (about) about.click();
  await wait(800);
  await shot('trappist-card', 600);
  return { stage: ctx.stage.worldId, glow: (whole().match(/Glow\s*[^.]{0,110}/) || ['(no Glow row)'])[0], first: a.slice(0, 160) };
});
return out;
