// Tracker pass (internal #547 and #549), run A at 1440 x 900 on the machine's GPU. Paste sky3-common.js in front.
// Looks: Jupiter and Saturn at the Tonight "Telescope" field and the eyepieces; the frame rate with figures, pictures
// and borders up; the brightest stars' discs; Betelgeuse; a low satellite selected (ring against chevron).
const flagstaff = place('Flagstaff', 35.2, -111.65);
await stand(flagstaff);
ctx.skyView.setOption('darkness', 'dark');
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const press = (re) => { const b = [...document.querySelectorAll('.sr-skybar button, .sr-tonight-view button')].find((x) => re.test(x.innerText.trim())); if (b) b.click(); return !!b; };
await step('planets', async () => {
  const tab = document.querySelector('[data-tab="tonight"][role="tab"]'); if (tab) tab.click();
  await wait(1500);
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 12, 0)); await wait(1200); // 05:00 local
  out.jupiterUp = ctx.skyView.pointAt({ body: 'jupiter' }, { fovDeg: 72, instant: true });
  await wait(1500); await shot('r1-jupiter-eye');
  out.pressTelescope = press(/^Telescope$/); await wait(2500); out.fovAfterTelescope = ctx.skyView.fovDeg; await shot('r2-jupiter-telescope-button');
  ctx.skyView.setFov(0.3, { instant: true }); await wait(1800); await shot('r3-jupiter-0.3deg');
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 3, 0)); await wait(800); // 20:00 local
  out.saturnUp = ctx.skyView.pointAt({ body: 'saturn' }, { fovDeg: 0.3, instant: true });
  await wait(1800); await shot('r4-saturn-0.3deg');
});
await step('fps', async () => {
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30));
  for (const k of ['figures', 'names', 'art', 'bounds']) ctx.skyView.setOption(k, true);
  ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 72, instant: true, mark: false });
  await wait(3000);
  const count = (ms) => new Promise((res) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < ms) requestAnimationFrame(f); else res(n / ((performance.now() - t) / 1000)); }; requestAnimationFrame(f); });
  out.fpsFigPicBounds = +(await count(4000)).toFixed(1);
  out.glInfo = { calls: ctx.renderer.info.render.calls, tris: ctx.renderer.info.render.triangles, tex: ctx.renderer.info.memory.textures };
  out.pictures = (ctx.skyView.groundPictures() || []).filter((p) => p.drawn).length;
  out.stats72 = stats();
  await shot('r5-orion-all-on');
  for (const k of ['figures', 'names', 'art', 'bounds']) ctx.skyView.setOption(k, false);
  await wait(1500);
  out.fpsBare = +(await count(4000)).toFixed(1);
});
await step('stars', async () => {
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false }); await wait(2500); await shot('r6-sirius-14deg');
  ctx.skyView.pointAt({ raDeg: 78.634, decDeg: -8.2016 }, { fovDeg: 14, instant: true, mark: false }); await wait(2500); await shot('r7-rigel-14deg');
  ctx.skyView.pointAt({ raDeg: 88.793, decDeg: 7.407 }, { fovDeg: 6, instant: true, mark: false }); await wait(2500); await shot('r8-betelgeuse-6deg');
  out.betelgeuse = stats();
});
await step('sat', async () => {
  const london = place('London', 51.507, -0.128);
  await stand(london);
  ctx.skyView.setOption('darknessBy', 'place');
  const now = Date.now();
  ctx.clock.goTo(now); ctx.setMoment('now'); await wait(1500);
  const P = await import('/js/sky/passes.js');
  const recs = [...ctx.recordsFor('visual'), ...ctx.recordsFor('stations'), ...ctx.recordsFor('notable')].filter((r) => r.satrec);
  out.satRecords = recs.length;
  const passes = P.predictPasses(recs, london, now, 30, { sunElevationDeg: 90, minElevationDeg: 5 });
  out.passes = passes.length;
  const pick = passes.find((p) => p.peakEl * 180 / Math.PI < 30) || passes[0];
  if (!pick) return;
  const track = P.passTrack(pick.record, pick, london, 60);
  const low = track.find((k) => k.altDeg > 6 && k.altDeg < 14) || track[1];
  out.satName = pick.record.name; out.satLook = low;
  ctx.clock.goTo(low.ms); await wait(1500);
  ctx.skyView.setFov(72, { instant: true }); ctx.skyView.lookAtDeg(low.azDeg, low.altDeg + 8); await wait(1200);
  ctx.select(pick.record, { from: 'pick' }); await wait(2500);
  out.hud = { reticle: !!document.querySelector('.sr-reticle:not(.is-off)'), chevron: !!document.querySelector('.sr-chevron:not(.is-off)'), tag: !!document.querySelector('.sr-tag:not(.is-off)') };
  await shot('r9-low-satellite-selected');
});
return out;
