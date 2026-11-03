// r177-tracked: release 1.7.6's debris, placed by their own element sets (A9, internal #1069), looked at.
//   The clock held at 2026-11-03 12:00 UTC (the day the tile set the workflow serves was built). The debris layer is
//   switched on the way the debris view does it (the whole Earth from a distance), and photographed from four places:
//     01 the whole Earth, the crowd at 800 km and the belt at 36 000 km
//     02 the Earth from above the north pole (the 82 and 98 degree families, which no made-up place can show wrong,
//        and the Fengyun-1C cloud, which a real place shows as a SHELL and a made-up one as a smear)
//     03 close to the Earth in low orbit, where the pieces are real distances apart
//     04 geostationary distance, from the equatorial plane
//   Each note carries how many dots are placed by their element sets and how many are illustrative (the layer's own
//   count, `sr.recordsFor('debris-field')`). On a ref without the tiles every dot is illustrative, so the same probe
//   photographs main for the BEFORE:
//     gh workflow run look.yml -f probe=r177-tracked -f ref=main
//     gh workflow run look.yml -f probe=r177-tracked -f ref=r177-sky
// Run at -f width=1200 -f height=800.
look.probe = 'r177-tracked';
const out = { problems: [], counts: null, sample: [] };
const need = (cond, msg) => { if (!cond) out.problems.push(msg); return cond; };
try { sr.clock.setPaused(true); sr.clock.goTo(Date.UTC(2026, 10, 3, 12, 0)); } catch { out.problems.push('the clock could not be held'); }
const layer = (sr.layers || []).find((l) => l.id === 'debris-field');
if (need(layer, 'no debris-field layer')) {
  if (typeof sr.loadLayerNow === 'function') sr.loadLayerNow(layer);
  sr.setLayerOn('debris-field', true);
}
need(await until(() => (sr.recordsFor('debris-field') || []).length > 1000, 240000, 1000), 'the debris layer never loaded');
const recs = sr.recordsFor('debris-field') || [];
const placed = recs.filter((r) => r.propagator === 'sgp4').length;
out.counts = { total: recs.length, placed, illustrative: recs.length - placed, classes: recs.reduce((a, r) => { a[r.cls] = (a[r.cls] || 0) + 1; return a; }, {}) };
out.sample = recs.filter((r) => r.propagator === 'sgp4').slice(0, 3).map((r) => ({ id: r.id, name: r.name, cls: r.cls, epoch: new Date(r.epoch).toISOString(), omm: !!r.omm }));
const note = `${placed} of ${recs.length} dots placed by their own element sets, ${recs.length - placed} illustrative`;
try { sr.frameEarth(0); } catch { /* the framing stays */ }
await sleep(8000);
await shot('01-whole-earth', 'The whole Earth with every tracked piece of debris and rocket body. ' + note, 4000);
const place = async (name, dir, distKm, why) => {
  try { rig.flyTo({ offset: dir, distance: distKm / sr.stage.unitKm, ms: 0 }); } catch (e) { out.problems.push(name + ': ' + e); }
  await shot(name, why + ' ' + note, 6000);
};
await place('02-over-the-pole', { x: 0, y: 1, z: 0.001 }, 26000, 'Above the north pole: the rings of the polar and sun-synchronous families.');
await place('03-low-orbit', { x: 1, y: 0.25, z: 0.2 }, 9500, 'Close to the Earth, at the crowd between 600 and 1 000 km.');
await place('04-geostationary', { x: 1, y: 0.02, z: 0.1 }, 120000, 'From the equatorial plane at geostationary distance: the belt, and what drifts across it.');
try { sr.setLayerOn('debris-field', false); } catch { /* left on */ }
return finish(out);
