// look-a.js -- the worlds: the eclipse trip's four stops, the
// Earth's limb from the station, and the Moon's horizon at Tranquility Base. After look-common.js.
if (await tripStop('chasing-the-solar-eclipse', 0)) { await wait(4000); await shot('eclipse-0-arrives'); }
if (await tripStop('chasing-the-solar-eclipse', 1)) { out.eclipse = ctx.worlds.eclipse ? ctx.worlds.eclipse() : null; await shot('eclipse-1-peak', 3000); }
if (await tripStop('chasing-the-solar-eclipse', 2)) await shot('eclipse-2-from-the-moon', 3000);
if (await tripStop('chasing-the-solar-eclipse', 3)) { out.ring = ctx.worlds.eclipse ? ctx.worlds.eclipse() : null; await shot('eclipse-3-ring', 3000); }
if (await tripStop('moon-landings', 1)) await shot('moon-apollo-11', 4000);
try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
const T0 = Date.parse('2026-10-07T12:00:00Z');
ctx.clock.goTo(T0); ctx.clock.setRate(1);
const iss = ctx.recordById('sat-25544');
if (iss) { await goTo('sat-25544'); await shot('earth-limb-iss', 3000); out.iss = { d: ctx.cameraRig.state.distance }; }
else out.errors.push('no ISS record');
out.tier = ctx.quality && ctx.quality.tier;
out.ms = Date.now() - t0;
return out;
