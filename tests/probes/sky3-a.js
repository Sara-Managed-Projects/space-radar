// Run A (1440 x 900): one place at noon, sunset, civil dusk and night; then a coast, and a city by dusk and by night.
const flagstaff = place('Flagstaff', 35.2, -111.65);
const day0 = Date.UTC(2026, 9, 8, 12); // 05:00 local
await stand(flagstaff);
ctx.skyView.setOption('darknessBy', 'place');
const noon = day0 + 7.4 * 3600e3;
ctx.clock.goTo(noon); ctx.skyView.lookAtDeg(sunAt(flagstaff, noon).az, 22); await shot('a1-noon');
const set = sunDown(flagstaff, noon, 1.0);
ctx.clock.goTo(set); ctx.skyView.lookAtDeg(sunAt(flagstaff, set).az, 12); await shot('a2-sunset');
const civil = sunDown(flagstaff, noon, -4.5);
ctx.clock.goTo(civil); ctx.skyView.lookAtDeg(sunAt(flagstaff, civil).az, 12); await shot('a3-civil-dusk');
const night = sunDown(flagstaff, noon, -25);
ctx.clock.goTo(night); ctx.skyView.lookAtDeg(sunAt(flagstaff, civil).az, 14); await shot('a4-night');
// A coast: Brighton, the sea to the south.
const brighton = place('Brighton', 50.82, -0.14);
await stand(brighton);
const bNoon = Date.UTC(2026, 9, 8, 12);
const bDusk = sunDown(brighton, bNoon, -3);
ctx.clock.goTo(bDusk); ctx.skyView.lookAtDeg(205, 9);
const w0 = Date.now(); while (ctx.skyView.groundStats().landscape !== 'coast' && Date.now() - w0 < 12000) await wait(300);
await shot('a5-coast-dusk');
// A city: London, by dusk and by night.
const london = place('London', 51.507, -0.128);
await stand(london);
const w1 = Date.now(); while (ctx.skyView.darkness.by === 'reading' && Date.now() - w1 < 12000) await wait(300);
out.londonDarkness = ctx.skyView.darkness;
const lDusk = sunDown(london, bNoon, -3);
ctx.clock.goTo(lDusk); ctx.skyView.lookAtDeg(sunAt(london, lDusk).az - 25, 9); await shot('a6-city-dusk');
ctx.clock.goTo(sunDown(london, bNoon, -22)); ctx.skyView.lookAtDeg(180, 10); await shot('a7-city-night');
return out;
