// jupiter: the stage, closer, both poles (Juno's cyclones), close on the south equatorial belt, then
// the clock sped up so what turns is seen to have turned.
look.probe = 'jupiter';
const out = {};
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
await stage('jupiter', 12000);
const d0 = rig.state.distance;
await shot('1-jupiter-stage', 'Jupiter on its stage; weather module ' + (out.weatherLoaded ? 'on' : 'OFF'));
rig.flyTo({ distance: d0 * 0.45, ms: 0 });
await shot('2-closer', 'closer', 6000);
rig.flyTo({ polar: 0.25, distance: d0 * 0.5, ms: 0 });
await shot('3-north-pole', 'over the north pole', 6000);
rig.flyTo({ polar: Math.PI - 0.25, distance: d0 * 0.5, ms: 0 });
await shot('4-south-pole', 'over the south pole', 6000);
rig.flyTo({ polar: 1.75, distance: d0 * 0.3, ms: 0 });
await shot('5-close-south-belt', 'close on the south equatorial belt, the clock at its own rate', 6000);
try {
  const rates = sr.clock.rates();
  sr.clock.setRate(rates[rates.length - 2] || rates[rates.length - 1]);
  out.rate = sr.clock.rate;
} catch (e) { look.warns.push('probe: the clock could not be sped up: ' + e); }
await shot('6-belt-clock-fast', 'the same view six seconds later with the clock at ' + out.rate + 'x', 6000);
rig.flyTo({ polar: 1.45, distance: d0 * 0.45, ms: 0 });
await shot('7-disc-clock-fast', 'the disc again, the clock still fast', 6000);
out.storms = (() => { try { return sr.weather.state().air.worlds.find((w) => w.id === 'jupiter'); } catch { return null; } })();
if (!out.weatherLoaded) out.fail = 'the weather module never loaded (tier ' + (sr.quality && sr.quality.bootTier) + ')';
return finish(out);
