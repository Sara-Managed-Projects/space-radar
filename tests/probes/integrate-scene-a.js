// Scene, part A (also run on main for the before/after pair): the Earth by night and its ice by
// day (public #260), an imagined snowball and a temperate world pushed in (internal #479), Titan
// from its north (internal #245).
ctx.clock.setPaused(true);
const U = (id) => ctx.worlds.meshFor(id).material.uniforms;
await run('earthNight', async () => {
  await goTo('earth'); await wait(2500);
  const u = U('earth');
  const o = { has: { glow: !!u.uNightGlow, ice: !!u.uIceSheen }, glow: u.uNightGlow && u.uNightGlow.value, ice: u.uIceSheen && u.uIceSheen.value };
  // Europe and Africa in the evening.
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 22, 0)); await wait(1500);
  standAt('earth', 165, -25, 1); await shot('a1-earth-night', 4000);
  standAt('earth', 165, -25, 0.5); await shot('a2-earth-night-close', 4000);
  if (u.uNightGlow) { const was = u.uNightGlow.value; u.uNightGlow.value = 0; await shot('a3-earth-night-close-glow-off', 1500); u.uNightGlow.value = was; }
  standAt('earth', 100, -20, 0.7); await shot('a4-earth-terminator', 3000);
  // Greenland at its noon, Antarctica by day.
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 14, 40)); await wait(1500);
  standAt('earth', 5, -62, 0.8); await shot('a5-greenland-day', 5000);
  if (u.uIceSheen) { const was = u.uIceSheen.value; u.uIceSheen.value = 0; await shot('a6-greenland-day-sheen-off', 1500); u.uIceSheen.value = was; }
  standAt('earth', 5, 70, 0.8); await shot('a7-antarctica-day', 5000);
  if (u.uIceSheen) { const was = u.uIceSheen.value; u.uIceSheen.value = 0; await shot('a8-antarctica-day-sheen-off', 1500); u.uIceSheen.value = was; }
  return o;
});
await run('titan', async () => {
  if (!(await goTo('titan', 30000))) return null;
  await wait(2500);
  standAt('titan', 25, -50, 0.9); await shot('a9-titan-north', 5000);
  standAt('titan', 25, -50, 0.5); await shot('a10-titan-north-close', 3000);
  standAt('titan', 25, 10, 0.9); await shot('a11-titan-equator', 3000);
  return { ok: true };
});
await run('imagine', async () => {
  const o = {};
  for (const n of [1, 3, 13, 2]) {
    const st = await ctx.wantImagine(String(n));
    if (!st) { o[n] = 'no stage'; continue; }
    await until(() => ctx.imagine && ctx.imagine.active && ctx.imagine.state().n == n, 15000);
    ctx.imagine.setTier(2); ctx.imagine.freeze(40);
    ctx.imagine.setView({ phaseDeg: 52, elevationDeg: 14, fill: 0.7 }); await shot(`b${n}-imagine-whole`, 3500);
    ctx.imagine.setView({ phaseDeg: 52, elevationDeg: 14, fill: 2.4 }); await shot(`b${n}-imagine-limb`, 3500);
    ctx.imagine.setView({ phaseDeg: 95, elevationDeg: 5, fill: 2.4 }); await shot(`b${n}-imagine-limb-low-sun`, 3000);
    const s = ctx.imagine.state();
    const u = ctx.imagine.world && ctx.imagine.world.handle && ctx.imagine.world.handle.mesh.material.uniforms;
    o[n] = { climate: s.climate, cls: s.cls, eyeball: s.eyeball, tier: s.tier, ms: s.medianFrameMs, detail: u && u.uDetail ? u.uDetail.value : null, high: u && u.uHigh ? u.uHigh.value : null, frost: u && u.uFrost ? u.uFrost.value : null };
  }
  ctx.imagine.stop(); await wait(800);
  return o;
});
return out;
