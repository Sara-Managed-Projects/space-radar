// onlyspace: the drift's "only space" over the Earth with what is laid on it (internal #756): a data
// map (sea temperature), the aurora and the lightning switched on, then, at the solar eclipse of
// 12 August 2026, the eclipse's path on the ground. Each is photographed with only space off and on
// at the same paused moment, and off again. Beside each picture the probe writes down every object
// laid on the Earth (its name, its `visible`, which its module owns, and its layer masks, which only
// space clears), and fails when only space leaves one drawn, touches a `visible`, or does not put
// every mask back as it found it, there and when the drift ends.
// Run at 1440 x 900 and again with -f mobile=true.
look.probe = 'onlyspace';
const out = { views: [], problems: [] };
const DRAPES = /^(earth:(overlay|wind|currents)|earth-aurora|earth-lightning|eclipse-path)$/;
const earth = () => sr.worlds.meshFor('earth');
const drapes = () => {
  const m = earth();
  if (!m) return [];
  return m.children.filter((o) => DRAPES.test(o.name || '')).map((o) => { const masks = []; o.traverse((x) => masks.push(x.layers.mask)); return { name: o.name, visible: o.visible, masks: masks.join(',') }; });
};
const shadowLines = () => { const m = earth(); const u = m && m.material && m.material.uniforms && m.material.uniforms.uEclipseLines; return u ? u.value : null; };
const drawnNow = (list) => list.filter((d) => d.visible && !/^0(,0)*$/.test(d.masks)).map((d) => d.name);
const masksOf = (list) => JSON.stringify(list.map((d) => [d.name, d.masks]));

for (const id of ['aurora', 'lightning']) { try { if (!sr.isLayerOn(id)) sr.setLayerOn(id, true); } catch (e) { look.warns.push('layer ' + id + ': ' + e); } }
sr.setOverlay('sea-temperature');
await until(() => drapes().some((d) => d.name === 'earth:overlay' && d.visible), 90000, 500);
await until(() => drapes().some((d) => d.name === 'earth-aurora'), 60000, 500);
await until(() => drapes().some((d) => d.name === 'earth-lightning'), 60000, 500);
out.loaded = drapes();
for (const name of ['earth:overlay', 'earth-aurora', 'earth-lightning']) if (!out.loaded.some((d) => d.name === name)) look.missing.push(name + ' never came on this runner: its pair proves less');

// The drift, paused at its first stay; the camera then put over the Earth by hand.
const d = await sr.wantDrift({ drift: 'craft' }, 'link');
await until(() => d.state().phase === 'dwell', 120000, 500);
d.pause();
await sleep(1500);
const frameEarth = async (offset, distance) => {
  const e = earth();
  rig.flyTo({ targetScene: { x: e.position.x, y: e.position.y, z: e.position.z }, distance, offset, ms: 0 });
  await sleep(2500);
};
const trio = async (tag, note) => {
  const a = drapes();
  await shot(tag + '-1-off', note + ', only space off: drawn ' + JSON.stringify(drawnNow(a)));
  d.setOptions({ bare: true });
  await sleep(2500);
  const b = drapes();
  const lines = shadowLines();
  if (lines) out.problems.push(tag + ': the lines round the Moon\'s shadow are still drawn in only space');
  await shot(tag + '-2-only-space', note + ', only space on: drawn ' + JSON.stringify(drawnNow(b)));
  d.setOptions({ bare: false, tags: true });
  await sleep(2500);
  const c = drapes();
  if (shadowLines() !== 1) out.problems.push(tag + ': the lines round the Moon\'s shadow did not come back (' + shadowLines() + ')');
  await shot(tag + '-3-off-again', note + ', only space off again: drawn ' + JSON.stringify(drawnNow(c)));
  out.views.push({ tag, off: a, on: b, again: c, active: d.state().active });
  if (drawnNow(b).length) out.problems.push(tag + ': only space left drawn ' + drawnNow(b).join(', '));
  if (b.some((x) => !/^0(,0)*$/.test(x.masks))) out.problems.push(tag + ': a mask was not cleared ' + masksOf(b));
  if (masksOf(a) !== masksOf(c)) out.problems.push(tag + ': the masks did not come back: ' + masksOf(a) + ' then ' + masksOf(c));
  if (!d.state().active) out.problems.push(tag + ': the drift ended during the pictures');
  return { a, b, c };
};

// 1. Live, over the night side and the north: the aurora, the lightning, the sea's temperature at the limb.
await frameEarth(mix(sunward('earth'), -0.75, north('earth'), 0.75), 24);
await trio('night', 'live, the night side from over the north');
// 2. The day side, the sea's temperature on it.
await frameEarth(mix(sunward('earth'), 1, north('earth'), 0.25), 22);
await trio('day', 'live, the day side');
// 3. The total solar eclipse of 12 August 2026 at 17:45 UTC: its path on the ground.
sr.clock.goTo(Date.UTC(2026, 7, 12, 17, 45));
await sleep(4000);
await until(() => drapes().some((d) => d.name === 'eclipse-path' && d.visible), 30000, 500);
// Straight over the path: the middle of its ribbon, from the Earth's centre.
const pathDir = () => {
  const g = earth().children.find((o) => o.name === 'eclipse-path');
  const fill = g && g.children[0];
  if (!fill || !fill.geometry || !fill.geometry.attributes.position) return null;
  fill.geometry.computeBoundingSphere();
  earth().updateMatrixWorld();
  const w = earth().localToWorld(fill.geometry.boundingSphere.center.clone());
  const e = earth().position;
  return unit({ x: w.x - e.x, y: w.y - e.y, z: w.z - e.z });
};
await frameEarth(pathDir() || mix(sunward('earth'), 1, north('earth'), 0.5), 16);
out.eclipse = drapes().find((x) => x.name === 'eclipse-path') || null;
if (!out.eclipse || !out.eclipse.visible) look.missing.push('the eclipse path was not drawn at 2026-08-12 17:45 UTC');
await trio('eclipse', '12 August 2026, 17:45 UTC, the eclipse\'s path');

// The drift ends in only space: every mask as it was.
d.setOptions({ bare: true });
await sleep(1500);
const before = masksOf(out.views[out.views.length - 1].off);
d.stop('button');
await sleep(2000);
out.after = drapes();
if (masksOf(out.after) !== before) out.problems.push('ending the drift in only space did not put the masks back: ' + before + ' then ' + masksOf(out.after));
sr.clock.live();
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
