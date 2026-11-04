// r1720-tris: where the triangles of the to-the-edge stops go (release 1.7.20, internal #994).
//
// `triangles_per_stop` (registry/budgets.yaml) was raised for the deep sky of release 1.3.0 and again for
// release 1.5.0. This walks the stops the trips job measured highest (out-to-the-edge and roof-to-the-edge,
// the way tools/trips-cost.probe.js walks them) and at each one reads the renderer's own count of a frame
// and, beside it, a census of the scene: every drawn mesh with the triangles it asks for (index or vertex
// count over three, times its instances, within its draw range, not frustum-culled away), summed by the name
// of its top-level group and, for the deep layers, by the layer. The census adds up to the renderer's count
// (`census` against `triangles`; the difference is reported, not hidden).
//
//   gh workflow run look.yml -f probe=r1720-tris -f ref=<branch> -f width=1600 -f height=900
//   -f subject=out-to-the-edge_roof-to-the-edge     trips to walk, joined by an underscore (that is the default)
//
// No pictures: the rows are in out.json and the summary. Run it on `-f ref=main` for the before.
look.probe = 'r1720-tris';
const out = { trips: [], problems: [] };
const param = new URLSearchParams(location.search).get('lookSubject');
const trips = param ? param.split('_').filter(Boolean) : ['out-to-the-edge', 'roof-to-the-edge'];
const THREE_FRUSTUM = (() => {
  const cam = sr.camera;
  const m = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
  const e = m.elements;
  const planes = [[3, 0], [3, 1], [3, 2]].flatMap(([a, i]) => [[e[a] + e[i], e[a + 4] + e[i + 4], e[a + 8] + e[i + 8], e[a + 12] + e[i + 12]], [e[a] - e[i], e[a + 4] - e[i + 4], e[a + 8] - e[i + 8], e[a + 12] - e[i + 12]]]);
  return planes.map(([x, y, z, w]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l, w / l]; });
});
const census = () => {
  const cam = sr.camera;
  cam.updateMatrixWorld();
  const planes = THREE_FRUSTUM();
  const rows = new Map();
  let sum = 0;
  const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  sr.scene.updateMatrixWorld();
  sr.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !visible(o)) return;
    const g = o.geometry;
    if (o.material && o.material.visible === false) return;
    if (o.frustumCulled !== false) {
      if (!g.boundingSphere) g.computeBoundingSphere();
      const s = g.boundingSphere;
      if (s) {
        const c = s.center.clone().applyMatrix4(o.matrixWorld);
        const r = s.radius * o.matrixWorld.getMaxScaleOnAxis();
        if (planes.some(([x, y, z, w]) => x * c.x + y * c.y + z * c.z + w < -r)) return;
      }
    }
    const count = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
    const start = g.drawRange ? g.drawRange.start : 0;
    const dr = g.drawRange && Number.isFinite(g.drawRange.count) ? g.drawRange.count : Infinity;
    const used = Math.max(0, Math.min(count - start, dr));
    const inst = o.isInstancedMesh ? (o.count != null ? o.count : 1) : (g.instanceCount != null && Number.isFinite(g.instanceCount) ? g.instanceCount : 1);
    const tris = Math.floor(used / 3) * inst;
    if (!tris) return;
    let top = o; while (top.parent && top.parent !== sr.scene) top = top.parent;
    const key = (top.name || top.type) + (o.name && o.name !== top.name ? ' / ' + o.name : '');
    rows.set(key, (rows.get(key) || 0) + tris);
    sum += tris;
  });
  return { sum, top: [...rows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) };
};
const raf = () => new Promise((r) => requestAnimationFrame(r));
const drawn = async (frames = 3) => {
  const info = sr.renderer.info;
  const auto = info.autoReset;
  info.autoReset = false;
  try {
    await raf(); info.reset();
    for (let i = 0; i < frames; i += 1) await raf();
    return { calls: Math.round(info.render.calls / frames), triangles: Math.round(info.render.triangles / frames) };
  } finally { info.autoReset = auto; }
};
const arrive = () => until(() => ['dwell', 'settle', 'held', 'paused', 'outro', 'idle'].includes(sr.trip.state.phase), 60000, 200);
for (const id of trips) {
  try {
    if (sr.trip.state && sr.trip.state.phase !== 'idle') { sr.trip.stop(); await sleep(500); }
    const plan = await sr.trip.plan(id);
    if (!plan || !plan.offerable) { out.problems.push(`${id}: not offerable`); continue; }
    await sr.trip.start(id);
    const start = await until(() => { const b = document.querySelector('.sr-tripsheet__start'); return b && b.getBoundingClientRect().width > 0 ? b : null; }, 30000);
    if (!start) { out.problems.push(`${id}: no Start`); continue; }
    start.click();
    await arrive();
    const rows = [];
    for (let i = 0; i < sr.trip.state.count; i += 1) {
      if (sr.trip.state.index !== i) { sr.trip.jumpTo(i); await sleep(400); await arrive(); }
      await sleep(2500);
      const d = await drawn();
      const c = census();
      let deep = null;
      try { deep = sr.deep && sr.deep.stats ? sr.deep.stats() : null; } catch { /* no stats */ }
      rows.push({ n: i + 1, stop: sr.trip.state.stopTitle, calls: d.calls, triangles: d.triangles, census: c.sum, top: c.top.map(([k, v]) => `${k}: ${v}`), deep: deep && deep.layers ? deep.layers : null });
    }
    sr.trip.stop();
    out.trips.push({ id, rows });
    // The worst stop, as a line the summary shows.
    const worst = rows.slice().sort((a, b) => b.triangles - a.triangles)[0];
    look.warns.push(`${id}: most triangles at stop ${worst.n} "${worst.stop}": ${worst.triangles} (census ${worst.census}); ${worst.top.slice(0, 4).join('; ')}`);
  } catch (e) { out.problems.push(`${id}: ${e && e.stack || e}`); }
}
return finish(out);
