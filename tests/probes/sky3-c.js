// Run C (390 x 844, a phone): the night sky, the Tonight sheet with the sky's controls, and dusk.
const flagstaff = place('Flagstaff', 35.2, -111.65);
await stand(flagstaff);
ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30));
ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 72, instant: true, mark: false });
await wait(2500);
await shot('c1-phone-night');
ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 7, instant: true, mark: false });
const w = Date.now(); while (Date.now() - w < 9000) { await wait(400); const t = ctx.skyView.groundStats().tiles; if (t && t.flying === 0 && t.tiles > 0 && Date.now() - w > 2500) break; }
await shot('c2-phone-binoculars');
const noon = Date.UTC(2026, 9, 8, 19, 24);
const civil = sunDown(flagstaff, noon, -4.5);
ctx.clock.goTo(civil); ctx.skyView.setFov(72, { instant: true }); ctx.skyView.lookAtDeg(sunAt(flagstaff, civil).az, 14);
await shot('c3-phone-dusk');
const tab = document.querySelector('[data-tab="tonight"][role="tab"]');
if (tab) tab.click();
const w2 = Date.now(); while (!document.querySelector('.sr-skybar') && Date.now() - w2 < 15000) await wait(300);
await wait(1200);
const bar = document.querySelector('.sr-skybar');
if (bar) bar.scrollIntoView({ block: 'start' });
await wait(600);
out.strip = (() => { const s = document.querySelector('.sr-skytime'); if (!s) return null; const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), text: s.innerText.replace(/\s+/g, ' ') }; })();
out.small = [...document.querySelectorAll('.sr-skybar button, .sr-skybar [role="slider"]')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map((b) => `${b.innerText}:${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
out.overflow = document.documentElement.scrollWidth > innerWidth;
await shot('c4-phone-controls');
return out;
