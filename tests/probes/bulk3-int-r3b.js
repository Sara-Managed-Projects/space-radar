// run 3b (page-level, after look-common.js; ?sw=0&tier=2): M42's photograph at its place, seen from the Sun's side,
// with the star holes on and off; comets' tails by distance (Borisov 48.8 au, Halley 35 au, one inside 3 au).
const THREE = await import('/vendor/three.module.min.js');
const { stage } = await import('/js/scene/stage.js');
const { propagate } = await import('/js/propagate/index.js');
const sceneOf = (rec, t) => { try { const p = propagate(rec, t); return p ? stage.toSceneInto(p, p.frame || rec.frame, new THREE.Vector3(), t) : null; } catch { return null; } };
const run = async (name, fn) => { const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.errors.push(name + ': ' + String(e && e.stack || e).slice(0, 400)); } (out.ms = out.ms || {})[name] = Date.now() - t; };
await run('comet', async () => {
  const o = {};
  const tailsOf = () => { const a = []; ctx.scene.traverse((n) => { if (n.userData && n.userData.tails) a.push({ vis: n.visible, tail: n.userData.tails.visible, au: n.userData.sunAu != null ? +Number(n.userData.sunAu).toFixed(2) : null, sel: n.userData.selected }); }); return a; };
  for (const id of ['interstellar-2i', 'comet-1P', 'comet-168P']) {
    const rec = await goTo(id, 40000); if (!rec) continue; await wait(3500);
    o[id] = { selected: tailsOf().filter((t) => t.sel), others: tailsOf().filter((t) => !t.sel).length };
    await shot('comet-' + id.replace(/[^a-z0-9]+/gi, '-'), 600);
  }
  return o;
});
await run('m42', async () => {
  const rec = ctx.recordById('dso-m42'); if (!rec) return 'no record';
  await goTo(rec.id, 40000); await wait(3000);
  const d0 = ctx.cameraRig.state.distance; const o = { d0, stage: ctx.stage.worldId, tries: [] };
  const cam = ctx.camera.getWorldPosition(new THREE.Vector3()); const dir = ctx.camera.getWorldDirection(new THREE.Vector3());
  const centre = sceneOf(rec, ctx.clock.now()) || cam.clone().addScaledVector(dir, d0);
  const sunRec = ctx.recordById('sun'); const sun = (sunRec && sceneOf(sunRec, ctx.clock.now())) || new THREE.Vector3(0, 0, 0);
  o.centre = centre.toArray().map((v) => +v.toPrecision(4)); o.sun = sun.toArray().map((v) => +v.toPrecision(4)); o.camToCentre = +cam.distanceTo(centre).toPrecision(4);
  const n = centre.clone().sub(sun).normalize();
  const real = ctx.nebulae.holes; let shots = 0;
  for (const k of [1, 2, 4, 8, 16, 40]) {
    ctx.cameraRig.flyTo({ offset: { x: -n.x, y: -n.y, z: -n.z }, distance: d0 * k, ms: 0 }); await wait(3500);
    let drawn = ctx.nebulae.drawn('dso-m42');
    if (drawn > 0 && drawn < 0.9) { await until(() => ctx.nebulae.drawn('dso-m42') > 0.9, 8000, 300); drawn = ctx.nebulae.drawn('dso-m42'); }
    const holes = ctx.nebulae.holes();
    o.tries.push({ k, drawn: +Number(drawn).toFixed(2), holes: holes.map((h) => [h.id, +h.radius.toFixed(4), +h.k.toFixed(2)]).slice(0, 4), n3d: ctx.stars3d.holeCount(), nsky: ctx.starfield.holeCount() });
    if (drawn > 0.5 && shots < 2) {
      shots++;
      await shot(`m42-k${k}-holes`, 1200);
      ctx.nebulae.holes = () => []; await wait(1200);
      await shot(`m42-k${k}-noholes`, 300);
      ctx.nebulae.holes = real; await wait(300);
    }
  }
  o.pictureAsked = performance.getEntriesByType('resource').filter((r) => /m42/i.test(r.name)).map((r) => [r.name.split('/').pop(), r.responseStatus]).slice(0, 4);
  return o;
});
// the sky's photograph of the same nebula, from home: the sky stage's holes
await run('m42sky', async () => {
  ctx.select(null); await wait(500);
  const o = { all: ctx.nebulae.holes().length };
  return o;
});
return out;
