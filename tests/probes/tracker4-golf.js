// Shepard's golf balls on their soft ground disc, close (internal #478, #550). After look-common.js at
// 1440x900 with `?sw=0&tier=2`:  cat tests/probes/look-common.js tests/probes/tracker4-golf.js > /tmp/g.js
try { if (!ctx.isLayerOn('oddities')) ctx.setLayerOn('oddities', true); } catch { /* none */ }
const rec = ctx.records().find((r) => /golf/i.test(r.id + ' ' + (r.name || '')));
if (!rec) return { error: 'no golf record' };
await goTo(rec.id, 40000); await wait(4000);
const d0 = ctx.cameraRig.state.distance;
const o = { id: rec.id, d0, stage: ctx.stage.worldId, shots: [] };
for (const k of [0.1, 0.03]) {
  ctx.cameraRig.flyTo({ distance: d0 * k, ms: 0 });
  await shot(`golf-k${k}`, 4000);
  o.shots.push({ k, distance: ctx.cameraRig.state.distance });
}
out.golf = o;
return out;
