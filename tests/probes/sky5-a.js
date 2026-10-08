// Run A (1440 x 900, --gl=gpu): round three's night frames again after internal #447's two fixes
// (the stars against the lines at a 72 degree field; the horizon glow at a dark-sky town against a
// city), the time strip's dusk and dawn ticks, and a planet's card saying when it rises.
// Pasted after tests/probes/sky3-common.js (see sky5-README.txt).
const flagstaff = place('Flagstaff', 35.2, -111.65);
const day0 = Date.UTC(2026, 9, 8, 12);
await stand(flagstaff);
ctx.skyView.setOption('darknessBy', 'place');
const noon = day0 + 7.4 * 3600e3;
const w0 = Date.now(); while (ctx.skyView.darkness.by === 'reading' && Date.now() - w0 < 12000) await wait(300);
out.flagstaffDarkness = ctx.skyView.darkness;
const civil = sunDown(flagstaff, noon, -4.5);
const night = sunDown(flagstaff, noon, -25);
const glow = () => (ctx.skyView.groundStats() || {}).glow;
// The same instant and direction as round three's a4-night.
ctx.clock.goTo(night); ctx.skyView.lookAtDeg(sunAt(flagstaff, civil).az, 14); await shot('a4-night-after'); out['a4-night-after'].glow = glow();
// The glow, the same way at both places: due south, ten degrees up, the Sun 22 degrees down.
ctx.clock.goTo(sunDown(flagstaff, noon, -22)); ctx.skyView.lookAtDeg(180, 10); await shot('g1-flagstaff-south'); out['g1-flagstaff-south'].glow = glow();
const london = place('London', 51.507, -0.128);
await stand(london);
const w1 = Date.now(); while (ctx.skyView.darkness.by === 'reading' && Date.now() - w1 < 12000) await wait(300);
out.londonDarkness = ctx.skyView.darkness;
ctx.clock.goTo(sunDown(london, day0, -22)); ctx.skyView.lookAtDeg(180, 10);
// The sky's controls into view: the strip with its ticks.
const strip = document.querySelector('.sr-skytime');
if (strip) strip.scrollIntoView({ block: 'center' });
await wait(1500);
out.ticks = [...document.querySelectorAll('.sr-skytime__tick')].map((n) => ({ text: n.textContent, hidden: n.hidden, left: n.style.left }));
out.strip = strip ? { w: strip.clientWidth, h: strip.clientHeight, text: strip.innerText.replace(/\s+/g, ' ') } : null;
out.pointRowHidden = (() => { const b = [...document.querySelectorAll('.sr-skybar button')].find((n) => /Point your phone/.test(n.textContent)); return b ? b.parentNode.hidden : 'absent'; })();
await shot('g2-london-south'); out['g2-london-south'].glow = glow();
// The see-through ground: the Sun under the horizon, found.
ctx.skyView.setOption('seeThrough', true);
ctx.skyView.lookAtDeg(ctx.skyView.sun.azimuthDeg, -8);
await shot('g3-see-through');
ctx.skyView.setOption('seeThrough', false);
// A planet's card: rises, highest, sets from this place.
const jup = ctx.recordById('jupiter');
if (jup && ctx.select) ctx.select(jup, { from: 'probe' });
const w2 = Date.now(); while (!document.querySelector('.sr-card__seeline') && Date.now() - w2 < 15000) await wait(300);
await wait(800);
out.cardSee = (document.querySelector('.sr-card__seeline') || {}).textContent || null;
return out;
