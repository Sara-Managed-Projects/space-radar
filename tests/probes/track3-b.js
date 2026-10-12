// Tracker pass, run B (1440 x 900, GPU): what draws the haze beside Sirius and Betelgeuse in the ground sky.
// Hides each scene object in turn and reads the pixels of the halo's window from the canvas.
const flagstaff = place('Flagstaff', 35.2, -111.65);
await stand(flagstaff);
ctx.skyView.setOption('darkness', 'dark');
ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); await wait(1200);
ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false });
await wait(3500);
const cv = ctx.renderer.domElement;
const read = () => new Promise((res) => requestAnimationFrame(() => {
  ctx.renderer.render(ctx.scene, ctx.camera);
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
  const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
  const W = cv.width, H = cv.height;
  // The window right and below the screen centre where the haze sits (Sirius was drawn near 1243 x 267 at 1440 wide in the first run; here: whole canvas, bright-pixel count).
  const d = g.getImageData(870, 355, 70, 60).data; let lum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; lum += l; if (l > 120) n++; }
  res({ lum, n });
}));
out.base = await read();
const rows = [];
ctx.scene.traverse((o) => { let dpt = 0; for (let p = o; p && p !== ctx.scene; p = p.parent) dpt++; if (dpt <= 3 && o !== ctx.scene) rows.push(o); });
out.diff = {};
for (const o of rows) {
  if (!o.visible) continue;
  o.visible = false; const r = await read(); o.visible = true;
  const key = `${o.type}:${o.name || ''}:${o.children.length}:${rows.indexOf(o)}:${o.parent && o.parent.name}`;
  if (Math.abs(r.lum - out.base.lum) > 300) out.diff[key] = { lum: r.lum - out.base.lum, n: r.n - out.base.n };
}
await shot('b1-sirius-base');
return out;
