// worlds: each of the nine from its own stage, at three azimuths and over both poles, so a map that
// is torn, flat-filled or mirrored somewhere is in a picture. (On 2026-10-12 this walk, on a branch,
// is what showed Pluto's far side as one flat colour.)
look.probe = 'worlds';
const out = { worlds: {} };
const HALF = Math.PI / 2;
for (const id of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
  if (!sr.recordById(id)) { look.missing.push(id); continue; }
  await stage(id, 9000);
  const d = rig.state.distance;
  await shot(id + '-1-stage', id + ': its stage as "Go there" frames it');
  const views = [['2-az120', 2.094, HALF], ['3-az240', 4.189, HALF], ['4-north', 0, 0.22], ['5-south', 0, Math.PI - 0.22]];
  for (const [name, azimuth, polar] of views) {
    rig.flyTo({ azimuth, polar, distance: d, ms: 0 });
    await shot(id + '-' + name, id + ': azimuth ' + azimuth.toFixed(2) + ', polar ' + polar.toFixed(2), 4000);
  }
  out.worlds[id] = { distance: d, share: sr.worlds.discShare(id) };
}
out.tiles = sr.quality && sr.quality.tiles ? sr.quality.tiles() : null;
return finish(out);
