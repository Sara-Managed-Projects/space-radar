// pick-grid: what a click does. Run against the same probe on two refs, main and a branch, and read the
// two answers side by side (tools/README.md, "A look from a machine that has time").
//
// On four views (home Earth, the Sun's stage, Saturn close, the stellar rung) it taps a fixed grid of
// 8 x 5 spots with a mouse, and after each tap writes down what was selected, whether the stage changed,
// whether the camera's target moved, and which world discs the spot was on. Then it resets and goes on.
// On the stellar rung it also taps ten named stars where they are drawn and says whether each answer
// was that star. A tap on a spot is a click of 40 ms: the same on both refs.
//
// What it counts, per view and in all:
//   teleports        a tap changed the stage (an empty tap used to jump to deep space)
//   backdropMoved    a tap that opened a star, galaxy or exoplanet from a world's stage moved the stage or the camera
//   discWrong        the spot was on a world's disc and what came back was not the disc nearest the camera
//   dots             ten named stars tapped on their own pixel: how many came back as themselves
// The runner has no satellite feed (the look workflow does not mirror it), so the dots are stars.
look.probe = 'pick-grid';
const el = sr.renderer.domElement;
const V3 = sr.camera.position.constructor;
const BACKDROP = new Set(['star', 'exoplanet', 'dso', 'exotic']);
const LADDER = new Set(['stellar', 'local-group', 'galaxy']);
const rigNow = () => { const t = rig.state.target; return { x: t.x, y: t.y, z: t.z, d: rig.state.distance }; };
const settle = async () => { await until(() => !rig.state.flying, 20000, 200); await sleep(300); };

const tap = async (x, y) => {
  const o = { clientX: x, clientY: y, pointerId: 31, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, bubbles: true };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  await sleep(40);
  el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));
  await sleep(450);
};
const chooserOpen = () => { const c = document.getElementById('sr-pick'); return !!(c && !c.hidden); };
const closeChooser = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

const discsAt = (x, y) => {
  const r = el.getBoundingClientRect();
  const out = [];
  try {
    const found = sr.worlds.pickAll(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1, sr.camera, { w: r.width, h: r.height }, 0);
    for (const d of found) { const m = sr.worlds.meshFor(d.record.id); out.push({ id: d.record.id, dist: m ? m.position.distanceTo(sr.camera.position) : 0 }); }
  } catch (e) { look.errors.push('probe: discsAt ' + e); }
  return out.sort((a, b) => a.dist - b.dist);
};

const reset = async (view) => {
  try { sr.deselect({ stay: true }); } catch (e) { look.errors.push('probe: deselect ' + e); }
  if (sr.stage.worldId !== view.stage) { sr.setStage(view.stage); await sleep(3000); }
  rig.restoreState(view.rig, 0);
  await sleep(200);
};

const walkView = async (name, setup) => {
  await setup();
  await settle();
  const view = { stage: sr.stage.worldId, rig: rig.saveState() };
  const r = el.getBoundingClientRect();
  const rows = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) {
    const x = r.left + r.width * (0.08 + (0.84 * i) / 7);
    const y = r.top + r.height * (0.12 + (0.76 * j) / 4);
    const discs = discsAt(x, y);
    const before = rigNow();
    await tap(x, y);
    const sel = sr.selected();
    const after = rigNow();
    const stageNow = sr.stage.worldId;
    const stageChanged = stageNow !== view.stage;
    const moved = stageChanged || Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z) > 0.002 * Math.max(before.d, 1e-9);
    const row = { x: Math.round(x), y: Math.round(y), id: sel ? sel.id : null, klass: sel ? sel.klass : null, stageChanged, moved, chooser: chooserOpen(), onDisc: discs.map((d) => d.id) };
    if (row.chooser) closeChooser();
    rows.push(row);
    await reset(view);
  }
  const onWorldStage = !LADDER.has(view.stage);
  const sum = {
    stage: view.stage,
    taps: rows.length,
    picked: rows.filter((q) => q.id).length,
    teleports: rows.filter((q) => q.stageChanged).length,
    backdropMoved: rows.filter((q) => onWorldStage && BACKDROP.has(q.klass) && q.moved).length,
    backdropPicked: rows.filter((q) => onWorldStage && BACKDROP.has(q.klass)).length,
    onDisc: rows.filter((q) => q.onDisc.length).length,
    discWrong: rows.filter((q) => q.onDisc.length && q.id !== q.onDisc[0]).length,
    choosers: rows.filter((q) => q.chooser).length,
  };
  sum.discWrongBy = rows.filter((q) => q.onDisc.length && q.id !== q.onDisc[0]).map((q) => `${q.onDisc[0]}->${q.id || 'nothing'}`);
  return { sum, rows };
};

const out = { views: {} };
await until(() => !rig.state.flying, 90000, 500);
await sleep(3000);
const run = async (name, setup) => {
  try { out.views[name] = await walkView(name, setup); } catch (e) { look.errors.push(`probe: view ${name} threw: ${e && e.stack || e}`); }
};
await run('home', async () => {});
await run('sun', async () => { sr.setStage('sun'); await sleep(7000); });
await run('saturn', async () => { sr.setStage('saturn'); await sleep(7000); });
await run('stellar', async () => { sr.setStage('stellar'); await sleep(12000); });

// Ten drawn stars, each tapped where it is drawn, on the stellar rung.
try {
  const dots = [];
  if (sr.stage.worldId === 'stellar') {
    const named = sr.stars3d.records().filter((q) => q.klass === 'star' && q.meta && Number.isInteger(q.meta.starIndex));
    const pts = sr.stars3d.group.children.find((c) => c.isPoints && c.geometry && c.geometry.getAttribute('position') && c.geometry.getAttribute('position').count > 1000);
    const pos = pts.geometry.getAttribute('position').array;
    sr.camera.updateMatrixWorld();
    pts.updateMatrixWorld();
    const r = el.getBoundingClientRect();
    const seen = [];
    for (const q of named) {
      const i = q.meta.starIndex;
      const v = new V3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(pts.matrixWorld).project(sr.camera);
      if (!(v.z > -1 && v.z < 1) || Math.abs(v.x) > 0.9 || Math.abs(v.y) > 0.9) continue;
      const x = r.left + ((v.x + 1) / 2) * r.width, y = r.top + ((1 - v.y) / 2) * r.height;
      if (seen.some((s) => Math.hypot(s.x - x, s.y - y) < 12)) continue;
      seen.push({ x, y, id: q.id, name: q.name });
      if (seen.length >= 10) break;
    }
    const view = { stage: sr.stage.worldId, rig: rig.saveState() };
    for (const s of seen) {
      await tap(s.x, s.y);
      const sel = sr.selected();
      dots.push({ want: s.name, got: sel ? sel.name : null, ok: !!sel && sel.id === s.id, chooser: chooserOpen() });
      if (chooserOpen()) closeChooser();
      await reset(view);
    }
  }
  out.dots = { asked: dots.length, returned: dots.filter((d) => d.ok).length, list: dots };
} catch (e) { look.errors.push('probe: the dots threw: ' + (e && e.stack || e)); }

const all = Object.values(out.views).map((v) => v.sum);
out.total = {
  taps: all.reduce((n, s) => n + s.taps, 0),
  teleports: all.reduce((n, s) => n + s.teleports, 0),
  backdropMoved: all.reduce((n, s) => n + s.backdropMoved, 0),
  backdropPicked: all.reduce((n, s) => n + s.backdropPicked, 0),
  onDisc: all.reduce((n, s) => n + s.onDisc, 0),
  discWrong: all.reduce((n, s) => n + s.discWrong, 0),
};
// Keep the answer short: the per-tap rows stay in the artifact only for the views that had something to say.
for (const v of Object.values(out.views)) if (!v.sum.teleports && !v.sum.discWrong && !v.sum.backdropMoved) v.rows = v.rows.length;
return finish(out);
