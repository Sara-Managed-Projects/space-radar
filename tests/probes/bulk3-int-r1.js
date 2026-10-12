// run 1: the Milky Way after the spike cut (tier 0, London, 16 Dec 00:00 UTC) and the Sun's grain by tier, int and main.
await job('sky', async (res) => {
  const h = await open('./?sw=0&tier=0'); const ctx = h.ctx(); const w = h.w();
  const A = await w.eval("import('./vendor/astronomy.js')");
  const london = place('London', 51.5, -0.12);
  ctx.setObserver(london); ctx.clock.goTo(Date.UTC(2026, 11, 16, 0, 0)); await sleep(600);
  ctx.skyView.enter(london); await until(() => ctx.skyView.ownsSky, 20000); await sleep(2500);
  ctx.skyView.setOption('darkness', 'dark');
  const alt = (ra, dec) => +A.Horizon(new w.Date(ctx.clock.now()), new A.Observer(51.5, -0.12, 0), ra / 15, dec, 'normal').altitude.toFixed(1);
  res.tier = ctx.quality && ctx.quality.tier; res.clock = new Date(ctx.clock.now()).toISOString(); res.siriusAlt = alt(101.287, -16.716);
  const root = ctx.scene.getObjectByName('ground-sky'); const mw = root.getObjectByName('ground-milkyway'); const u = mw.material.uniforms;
  const gl = ctx.renderer.getContext();
  const lum = () => { ctx.rendererApi.render(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const R = Math.min(400, H - 4); const px = new Uint8Array(4 * R * R); gl.readPixels((W - R) >> 1, (H - R) >> 1, R, R, gl.RGBA, gl.UNSIGNED_BYTE, px); let s = 0; for (let i = 0; i < px.length; i += 4) s += 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; return Math.round(s / (R * R) * 100) / 100; };
  const tex0 = { x: u.uTexel.value.x, y: u.uTexel.value.y };
  res.map = [u.uMap.value.image.width, u.uMap.value.image.height]; res.texel = [tex0.x, tex0.y]; res.gain = +u.uGain.value.toFixed(3);
  const realSet = u.uTexel.value.set.bind(u.uTexel.value);
  const cutOff = (off) => { if (off) { realSet(0, 0); u.uTexel.value.set = () => u.uTexel.value; } else { delete u.uTexel.value.set; realSet(tex0.x, tex0.y); } };
  const three = async (name, noMwShot) => {
    await sleep(2500); const o = { gain: +u.uGain.value.toFixed(3) };
    ctx.clock.setPaused(true); await sleep(300);
    o.cut = lum(); await shot(name + '-cut', 500);
    cutOff(true); await sleep(400); o.nocut = lum(); o.texelNow = u.uTexel.value.x; await shot(name + '-nocut', 500); cutOff(false);
    mw.visible = false; await sleep(300); o.noMw = lum(); if (noMwShot) await shot(name + '-nomw', 400); mw.visible = true;
    ctx.clock.setPaused(false);
    o.mwCut = +(o.cut - o.noMw).toFixed(2); o.mwNocut = +(o.nocut - o.noMw).toFixed(2);
    return o;
  };
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false }); res.sirius14 = await three('sky-sirius14');
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 40, instant: true, mark: false }); res.sirius40 = await three('sky-sirius40', true);
  // a dark September evening: the galactic centre low in the south-west, Cygnus overhead
  ctx.clock.goTo(Date.UTC(2026, 8, 10, 20, 30)); await sleep(2000);
  res.sep = { gcAlt: alt(266.4, -29.0), scutumAlt: alt(281, -6), cygnusAlt: alt(305, 40), sun: ctx.skyView.sun };
  ctx.skyView.pointAt({ raDeg: 272, decDeg: -18 }, { fovDeg: 90, instant: true, mark: false }); res.gc90 = await three('sky-gc90', true);
  ctx.skyView.pointAt({ raDeg: 305, decDeg: 40 }, { fovDeg: 72, instant: true, mark: false }); res.cygnus72 = await three('sky-cygnus72', true);
  { const ps = ctx.renderer.info.programs || []; res.programsFailed = ps.filter((p) => p.diagnostics && p.diagnostics.runnable === false).length; }
  h.close();
});
for (const [tag, base] of [['int', './'], ['main', 'm/']]) for (const tier of [1, 2, 0]) {
  await job(`sun-${tag}-t${tier}`, async (res) => {
    const h = await open(`${base}?sw=0&tier=${tier}`); const ctx = h.ctx();
    await h.goTo('sun');
    const e = ctx.worlds.meshFor('earth').position, sp = ctx.worlds.meshFor('sun').position;
    const d = { x: e.x - sp.x, y: e.y - sp.y, z: e.z - sp.z }; const l = Math.hypot(d.x, d.y, d.z);
    ctx.cameraRig.flyTo({ offset: { x: d.x / l, y: d.y / l, z: d.z / l }, distance: ctx.cameraRig.state.distance, ms: 0 }); await sleep(300);
    for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await sleep(100); }
    await until(() => ctx.sunDetail, 20000); await sleep(3500);
    res.tier = ctx.quality && ctx.quality.tier; res.share = +ctx.worlds.discShare('sun').toFixed(2); res.state = ctx.sunDetail ? (({ on, latched, grain }) => ({ on, latched, grain }))(ctx.sunDetail.state()) : null;
    ctx.select(null); await sleep(400);
    res.frames = await h.frames(2500);
    await shot(`sun-${tag}-t${tier}`, 300);
    ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.45, ms: 0 }); await sleep(2500);
    await shot(`sun-${tag}-t${tier}-near`, 300);
    res.latched = ctx.latch && ctx.latch.latched; res.scale = ctx.scaler ? ctx.scaler.scale : null;
    h.close(); await sleep(500);
  });
}
out.longest = tasks.reduce((m, t) => Math.max(m, t.dur), 0);
return out;
