// ground-lod: the measured terrain of a landing site with levels of detail (forge #193, scene/groundlod.js).
//   Stands on Hadley (apollo-15), Jezero and Gale as a `#ground=` link does, looks at the horizon and then down at the
//   walker's feet (the finest blocks), a picture each, and reads the renderer's triangles and calls for each.
//   The BEFORE is main:   gh workflow run look.yml -f probe=ground-lod -f ref=main
//   The AFTER is the branch. Run at -f width=1200 -f height=800, and again with -f mobile=true (tier 0).
// A scene over triangles_per_stop (registry/budgets.yaml) is a `fail`.
look.probe = 'ground-lod';
const out = { scenes: [] };
const fails = [];
const { BUDGETS } = await import('/js/data/budgets.js');
const raf = () => new Promise((r) => requestAnimationFrame(r));
const measure = async (frames = 3) => {
  const info = sr.renderer.info;
  const auto = info.autoReset;
  info.autoReset = false;
  try {
    await raf(); info.reset();
    for (let i = 0; i < frames; i += 1) await raf();
    return { calls: Math.round(info.render.calls / frames), triangles: Math.round(info.render.triangles / frames) };
  } finally { info.autoReset = auto; }
};
for (const id of ['apollo-15', 'jezero', 'gale']) {
  location.hash = '';
  await sleep(1500);
  location.hash = '#ground=' + id;
  const ok = await until(() => sr.ground && sr.ground.active, 180000, 500);
  if (!ok) { fails.push(`${id}: the ground never opened`); continue; }
  await sleep(20000); // the heights and the pictures
  for (const [name, yaw, pitch] of [['horizon', 32.5, -5], ['feet', 32.5, -60]]) {
    try { sr.ground.look({ yawDeg: yaw, pitchDeg: pitch, fovDeg: 62 }); } catch (e) { fails.push('look: ' + e); }
    await sleep(3000);
    const m = await measure();
    out.scenes.push({ id, view: name, ...m });
    if (m.triangles > BUDGETS.triangles_per_stop) fails.push(`${id} ${name}: ${m.triangles} triangles a frame, over triangles_per_stop (${BUDGETS.triangles_per_stop})`);
    await shot(`ground-${id}-${name}`, `${id}, ${name}: ${m.triangles} triangles, ${m.calls} calls`);
  }
}
return finish({ ...out, ...(fails.length ? { fail: fails.join('; ') } : {}) });
