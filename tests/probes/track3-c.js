// Tracker pass, run C (1440 x 900, GPU): the Telescope button on a planet; what draws the square haze beside Sirius.
const flagstaff = place('Flagstaff', 35.2, -111.65);
await stand(flagstaff);
ctx.skyView.setOption('darkness', 'dark');
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const press = (re) => { const b = [...document.querySelectorAll('.sr-skybar button, .sr-tonight-view button')].find((x) => re.test(x.innerText.trim())); if (b) b.click(); return !!b; };
await step('telescope', async () => {
  const tab = document.querySelector('[data-tab="tonight"][role="tab"]'); if (tab) tab.click();
  await wait(1500);
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 12, 0)); await wait(1200);
  ctx.skyView.pointAt({ body: 'jupiter' }, { fovDeg: 72, instant: true }); await wait(1500);
  out.jupiterBody = ctx.skyView.bodyAtCentre();
  out.pressed = press(/^Telescope$/); await wait(2500); out.jupiterFov = ctx.skyView.fovDeg; await shot('c1-jupiter-telescope-button');
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 3, 0)); await wait(800);
  ctx.skyView.pointAt({ body: 'saturn' }, { fovDeg: 72, instant: true }); await wait(1500);
  out.saturnBody = ctx.skyView.bodyAtCentre();
  press(/^Telescope$/); await wait(2500); out.saturnFov = ctx.skyView.fovDeg; await shot('c2-saturn-telescope-button');
  // With nothing at the centre the button is the plain one-degree field.
  ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 72, instant: true, mark: false }); await wait(800);
  out.emptyBody = ctx.skyView.bodyAtCentre(); press(/^Telescope$/); await wait(600); out.emptyFov = ctx.skyView.fovDeg;
});
await step('haze', async () => {
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); await wait(1200);
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false });
  await wait(3500);
  const cv = ctx.renderer.domElement;
  const read = () => new Promise((res) => requestAnimationFrame(() => {
    ctx.renderer.render(ctx.scene, ctx.camera);
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
    const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
    const d = g.getImageData(870, 355, 70, 60).data; let lum = 0;
    for (let i = 0; i < d.length; i += 4) lum += d[i] + d[i + 1] + d[i + 2];
    res(lum);
  }));
  out.base = await read(); out.base2 = await read();
  const root = ctx.scene.getObjectByName('ground-sky');
  const all = []; root.traverse((o) => { if (o !== root) all.push(o); });
  out.diff = {};
  for (const o of all) {
    if (!o.visible) continue;
    o.visible = false; const r = await read(); o.visible = true;
    if (Math.abs(r - out.base) > 4000) out.diff[`${o.type}:${o.name}:${o.parent && o.parent.name}`] = r - out.base;
  }
  out.children = all.map((o) => `${o.type}:${o.name}:${o.visible}`);
});
return out;
