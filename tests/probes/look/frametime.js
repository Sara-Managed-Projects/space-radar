// frametime: three scripted scenes, and for each the median and the 95th percentile of the interval
// between 120 animation frames (plan of 2026-10-12, task 6). Run with the latch held (`?look=1`),
// or the second scene is measured with its effects already taken off. ON A SOFTWARE RENDERER THE
// ABSOLUTE NUMBERS MEAN NOTHING: they compare one run of this runner with another. The same probe
// on a machine with a GPU (`node tools/cdp.mjs ... --gl=gpu`) gives the absolute ones.
look.probe = 'frametime';
const out = { frames: {} };
const FRAMES = 120;
const CAP_MS = 180000;
const measure = (name) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= FRAMES && performance.now() - began < CAP_MS) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    const row = { frames: gaps.length, medianMs: at(0.5), p95Ms: at(0.95), minMs: at(0), maxMs: at(1), ...frameCost(), latched: sr.latch.latched, scale: sr.scaler ? sr.scaler.scale : null };
    out.frames[name] = row;
    resolve(row);
  };
  requestAnimationFrame(step);
});
// 1. Home.
await measure('home');
await shot('ft-1-home', 'scene 1, home');
// 2. Jupiter filling the view, its weather on.
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
await stage('jupiter', 12000);
rig.flyTo({ offset: sunward('jupiter'), distance: rig.state.distance * 0.45, ms: 0 }); // its day side, not its night
await sleep(6000);
await measure('jupiter-weather');
await shot('ft-2-jupiter', 'scene 2, Jupiter filling the view, weather ' + (out.weatherLoaded ? 'on' : 'OFF'));
// 3. The Sun with its detail on.
await stage('sun', 8000);
await go('sun', null, 6000);
out.sunDetail = await until(() => sr.sunDetail && sr.sunDetail.state().on, 60000);
rig.flyTo({ distance: rig.state.distance * 0.55, ms: 0 });
await sleep(6000);
await measure('sun-detail');
await shot('ft-3-sun', 'scene 3, the Sun, detail ' + (out.sunDetail ? 'on' : 'OFF'));
// 4 to 7 (spec 0073, 2026-10-14): Mercury, Venus, Uranus and Neptune from close, over the evening
// terminator a third of a radius up, where their relief, shadows and generated detail all draw.
let n = 4;
for (const id of ['mercury', 'venus', 'uranus', 'neptune']) {
  await stage(id, 9000);
  const mesh = sr.worlds.meshFor(id);
  const s = sunward(id);
  const side = unit(cross(s, north(id)));
  rig.flyTo({ targetScene: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }, offset: unit(mix(side, 1, s, 0.35)), distance: mesh.scale.x * 1.35, ms: 0 });
  await sleep(7000);
  await measure(id + '-close');
  await shot('ft-' + n + '-' + id, 'scene ' + n + ', ' + id + ' from close over its terminator');
  n += 1;
}
// 0077 W2-pbr: begin
// 8 and 9 (release 1.3.0, internal #967): the ISS selected as a click frames it, on the toon ramp and then
// in its physically based materials (scene/pbr.js setModelLook), the same frames, the same place.
{
  const iss = sr.recordById('sat-25544');
  if (iss) {
    await stage('earth', 6000);
    sr.select(iss, { fly: true, undo: false });
    await sleep(9000);
    const real = () => { let got = false; sr.scene.traverse((o) => { if (o.userData && o.userData.recordId === iss.id && o.userData.realModel && o.visible) got = true; }); return got; };
    out.issModel = await until(real, 120000, 500);
    try {
      const PB = await import(new URL('./js/scene/pbr.js', document.baseURI).href);
      for (const [n, lookName] of [[8, 'toon'], [9, 'pbr']]) {
        PB.setModelLook(lookName);
        await sleep(4000);
        await measure('iss-' + lookName);
        await shot('ft-' + n + '-iss-' + lookName, 'scene ' + n + ', the ISS selected, ' + (lookName === 'pbr' ? 'physically based' : 'on the toon ramp'));
      }
      PB.setModelLook('auto');
    } catch (e) { out.issLookError = String((e && e.message) || e); }
  } else out.issLookError = 'no ISS record on this page';
}
// 0077 W2-pbr: end
return finish(out);
