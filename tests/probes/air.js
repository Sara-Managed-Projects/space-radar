// tests/probes/air.js -- the Earth's air, relief and storm tops, and the other worlds' weather
// (internal #143, #144, #147, #241 to #245, #404; public #260). Run after tests/probes/look-common.js:
//   cat tests/probes/look-common.js tests/probes/air.js > /tmp/air.js
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0&tier=2' /tmp/air.js --width=1440 --height=900 --gl=gpu \
//     --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
// The same probe is run on the commit before and on the change, so a pair differs by the change only
// (the live clouds are NASA's of the minute: two runs an hour apart differ by an hour of weather).
// THE FRAME LATCH. On a laptop's own GPU the latch trips part of the way through (close to the Earth,
// where the map tiles load), and from then on there is no relief, no weather and six steps of air,
// before and after alike. The pictures are of the full-quality path, so the probe holds the latch
// off the way a film render does (main.js skips it while ctx.renderMode is set); `out.latched` says
// if it tripped anyway, and `out.fps*` is the cost, measured at two views of the Earth.
const T_NOW = Date.parse('2026-10-08T18:00:00Z');
const T_HIMALAYA = Date.parse('2026-10-08T11:35:00Z');   // the Sun about 8 degrees up in the west at 85 E
const T_ANDES = Date.parse('2026-10-08T11:05:00Z');      // and about 8 degrees up in the east at 70 W
const T_MARS_CLEAR = Date.parse('2027-02-07T00:00:00Z'); // Ls 60
const T_MARS_DUSTY = Date.parse('2028-02-02T00:00:00Z'); // Ls 245
if (!ctx.renderMode) ctx.renderMode = { probe: 'air' };
ctx.clock.setRate(1);
ctx.clock.goTo(T_NOW);
/** Stand over a place on the Earth, `k` Earth radii from its centre, tipped `tiltDeg` toward `towardLonDeg`. */
function overEarth(latDeg, lonDeg, k) {
  const m = ctx.worlds.meshFor('earth');
  m.updateMatrixWorld();
  const e = m.matrixWorld.elements;
  const cl = Math.cos(latDeg * DEG);
  const l = V(cl * Math.cos(lonDeg * DEG), Math.sin(latDeg * DEG), -cl * Math.sin(lonDeg * DEG));
  const s = Math.hypot(e[0], e[1], e[2]);
  const dir = norm(V(e[0] * l.x + e[4] * l.y + e[8] * l.z, e[1] * l.x + e[5] * l.y + e[9] * l.z, e[2] * l.x + e[6] * l.y + e[10] * l.z));
  ctx.cameraRig.flyTo({ offset: dir, distance: s * k, ms: 0 });
}
// The sharper maps and the weather arrive after the first frame: wait for both (the weather never, before the change, on some worlds).
out.latched = {};
const shot0 = shot;
const snap = async (name, settle) => { await shot0(name, settle); out.latched[name] = !!(ctx.latch && ctx.latch.latched); };
const fps = async (ms = 2500) => { let n = 0; let go = true; const tick = () => { n++; if (go) requestAnimationFrame(tick); }; requestAnimationFrame(tick); await wait(ms); go = false; return Math.round((n * 1000) / ms * 10) / 10; };
await until(() => { const a = ctx.quality.textures().applied.map((x) => x.id); return a.includes('earth-water') && a.includes('starfield'); }, 60000, 500);
await until(() => ctx.quality.textures().applied.some((x) => x.id === 'earth-relief'), 8000, 500);
await until(() => ctx.weather && ctx.weather.state && ctx.weather.state().air, 30000, 500);
await wait(6000);   // today's clouds: three pictures and a compose
out.textures = ctx.quality.textures().applied;
out.clouds = ctx.liveClouds && ctx.liveClouds.state ? ctx.liveClouds.state().mode || null : null;

await goTo('earth');
ctx.clock.goTo(T_NOW);
await snap('earth-1-home', 2500);
out.fpsHome = await fps();
standAt('earth', 25, 15, 1); await snap('earth-2-full-disc');
out.fpsFull = await fps();
standAt('earth', 90, 10, 1); await snap('earth-3-quarter');
standAt('earth', 125, 15, 1); await snap('earth-5-crescent');
standAt('earth', 75, 20, 0.62); await snap('earth-4-limb-close');
await goTo('earth');
ctx.clock.goTo(T_HIMALAYA); await wait(800);
overEarth(31, 84, 1.9); await snap('earth-6-himalaya-evening', 2500);
overEarth(34, 80, 1.35); await snap('earth-7-himalaya-close', 2000);
ctx.clock.goTo(T_ANDES); await wait(800);
overEarth(-22, -68, 1.6); await snap('earth-8-andes-morning', 2500);
ctx.clock.goTo(T_NOW); await wait(500);
const eu = ctx.worlds.meshFor('earth').material.uniforms;
const shell = ctx.worlds.meshFor('earth').userData.atmosphere.material.uniforms;
out.earth = { relief: eu.uHeightK ? eu.uHeightK.value.x : null, live: eu.uLive.value, steps: shell.uSteps ? shell.uSteps.value : null };

// Mars at two seasons.
await goTo('mars');
ctx.clock.goTo(T_MARS_CLEAR); await wait(1200);
standAt('mars', 30, 10, 1); await snap('mars-1-ls60');
ctx.clock.goTo(T_MARS_DUSTY); await wait(1200);
standAt('mars', 30, 10, 1); await snap('mars-2-ls245');
out.mars = ctx.weather.state().air ? ctx.weather.state().air.worlds.find((w) => w.id === 'mars') : null;
out.marsLine = ctx.weather.line ? ctx.weather.line('mars', ctx.clock.now()) : null;

// Venus at two times, a day and a half apart: the deck turns, and the Y with it.
ctx.clock.goTo(T_NOW);
await goTo('venus');
standAt('venus', 35, 5, 1); await snap('venus-1-t0');
ctx.clock.goTo(T_NOW + 1.5 * 86400000); await wait(1200);
standAt('venus', 35, 5, 1); await snap('venus-2-t0-plus-36h');
out.venusLine = ctx.weather.line ? ctx.weather.line('venus', ctx.clock.now()) : null;

/** The direction of a place in a world's own axes (+Y its north), in the scene. */
function bodyToScene(id, v) {
  const e = ctx.worlds.meshFor(id).matrixWorld.elements;
  return norm(V(e[0] * v.x + e[4] * v.y + e[8] * v.z, e[1] * v.x + e[5] * v.y + e[9] * v.z, e[2] * v.x + e[6] * v.y + e[10] * v.z));
}
// Titan's clouds are in its north: stand 55 degrees north of its equator, on the day side.
ctx.clock.goTo(T_NOW);
await goTo('titan');
{
  const m = ctx.worlds.meshFor('titan');
  const sun = norm(m.material.uniforms.uSunDir.value);
  const pole = bodyToScene('titan', V(0, 1, 0));
  const d = sun.x * pole.x + sun.y * pole.y + sun.z * pole.z;
  const flat = norm(mix(sun, 1, pole, -d));
  ctx.cameraRig.flyTo({ offset: norm(mix(flat, Math.cos(55 * DEG), pole, Math.sin(55 * DEG))), distance: ctx.cameraRig.state.distance, ms: 0 });
}
await snap('titan-1-north');

// Jupiter's night side: wait for a flash that is lit, on the night side and facing the camera, and catch it.
await goTo('jupiter');
standAt('jupiter', 150, 35, 1);
await wait(2500); closeHelp();
const jm = ctx.worlds.meshFor('jupiter');
const inView = () => {
  const f = jm.material.uniforms.uWxFlash ? jm.material.uniforms.uWxFlash.value : null;
  if (!f) return -1;
  const sun = norm(jm.material.uniforms.uSunDir.value);
  const cam = norm(V(ctx.camera.position.x - jm.matrixWorld.elements[12], ctx.camera.position.y - jm.matrixWorld.elements[13], ctx.camera.position.z - jm.matrixWorld.elements[14]));
  let best = 0;
  for (const k of [0, 4]) {
    if (!(f[k + 3] > 0.3)) continue;
    const w = bodyToScene('jupiter', V(f[k], f[k + 1], f[k + 2]));
    if (w.x * cam.x + w.y * cam.y + w.z * cam.z > 0.35 && w.x * sun.x + w.y * sun.y + w.z * sun.z < -0.15) best = Math.max(best, f[k + 3]);
  }
  return best;
};
out.flash = { tries: 0, caught: false, has: inView() >= 0 };
if (out.flash.has) {
  for (let i = 0; i < 8 && !out.flash.caught; i++) {
    if (!(await until(() => inView() > 0, 90000, 10))) break;
    out.flash.tries++;
    await window.cdpShot('jupiter-1-night-flash');
    out.flash.caught = inView() > 0;
  }
  out.shots.push('jupiter-1-night-flash');
} else await shot('jupiter-1-night-flash', 500);
out.latched['jupiter-1-night-flash'] = !!(ctx.latch && ctx.latch.latched);
out.jupiterLine = ctx.weather.line ? ctx.weather.line('jupiter', ctx.clock.now()) : null;

// The Sun: its disc among the stars, near and nearer.
await goTo('sun');
await snap('sun-1-arrived', 3000);
ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 4, ms: 0 });
await snap('sun-2-four-times-as-far', 2500);
ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 6, ms: 0 });
await snap('sun-3-far', 2500);
{
  let u = null;
  const sky = ctx.starfield && ctx.starfield.group;
  if (sky) sky.traverse((o) => { if (!u && o.isPoints && o.material && o.material.uniforms && o.material.uniforms.uSunGlare) u = o.material.uniforms; });
  out.glare = u ? { cosInner: u.uSunGlare.value.x, cosOuter: u.uSunGlare.value.y, view: [u.uSunView.value.x, u.uSunView.value.y, u.uSunView.value.z] } : null;
}
out.ms = Date.now() - t0;
return out;
