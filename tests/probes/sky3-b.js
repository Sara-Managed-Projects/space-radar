// Run B (1440 x 900): Orion from a dark place, the field closing from the eye's to a telescope's
// with the stars past HYG arriving by tile; trails; which constellation; the deep sky in Tonight's best.
const flagstaff = place('Flagstaff', 35.2, -111.65);
await stand(flagstaff);
ctx.skyView.setOption('darkness', 'dark');
ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); // 03:30 local: Orion is high in the south
await wait(1200);
const orion = { raDeg: 83.8, decDeg: -3.0 };
for (const [name, fov] of [['b1-fov72', 72], ['b2-fov25', 25], ['b3-fov7', 7], ['b4-fov2.5', 2.5]]) {
  ctx.skyView.pointAt(orion, { fovDeg: fov, instant: true, mark: false });
  const w = Date.now();
  // Wait for the tiles this field asks for.
  while (Date.now() - w < 9000) { await wait(400); const t = ctx.skyView.groundStats().tiles; if (fov > 32 || (t && t.flying === 0 && t.tiles > 0 && Date.now() - w > 2500)) break; }
  await shot(name);
}
// The same 7 degree field without the tiles' stars, for the difference: counted, not shot.
out.b3count = { hyg: out['b3-fov7'].drawn, tiles: out['b3-fov7'].tileStars };
// Which constellation: a tap on the centre.
ctx.skyView.pointAt(orion, { fovDeg: 40, instant: true, mark: false });
await wait(1500);
const c = ctx.renderer.domElement.getBoundingClientRect();
ctx.skyView.tapSky(c.left + c.width / 2, c.top + c.height / 2);
await wait(600);
const tag = document.querySelector('.sr-skytag:not([hidden])');
out.tag = tag ? tag.innerText.replace(/\s+/g, ' ') : null;
out.here = [...document.querySelectorAll('.sr-skylabel--here')].filter((n) => !n.hidden).map((n) => n.textContent);
await shot('b5-orion-here');
// Trails, looking north.
ctx.skyView.setOption('trails', true);
ctx.skyView.setFov(80, { instant: true }); ctx.skyView.lookAtDeg(0, 35);
await wait(1500);
await shot('b6-trails-north');
ctx.skyView.setOption('trails', false);
// Tonight's best, with the deep sky; then a press on its first deep-sky row.
const tab = document.querySelector('[data-tab="tonight"][role="tab"]');
if (tab) tab.click();
const w2 = Date.now(); while (!document.querySelector('.sr-tonight-view__best li') && Date.now() - w2 < 15000) await wait(300);
await wait(1500);
out.best = [...document.querySelectorAll('.sr-tonight-view__best li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim());
out.skybar = (document.querySelector('.sr-skybar') || {}).innerText;
const t = ctx.explore && ctx.explore.tonight ? null : null;
const row = [...document.querySelectorAll('.sr-tonight-view__best li button')].find((b) => /by eye|binoculars/.test(b.innerText));
if (row) { row.click(); await wait(2500); out.afterRow = stats(); out.pictures = (ctx.skyView.groundPictures() || []).filter((p) => p.drawn).map((p) => `${p.id}:${p.widthPx}`); }
await shot('b7-deep-sky-framed');
return out;
