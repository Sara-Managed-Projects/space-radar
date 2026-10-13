// worlds: the eight planets and Pluto, each on its own stage, so a map that is torn, flat-filled or
// mirrored somewhere is in a picture. (On 2026-10-12 this walk, on a branch, is what showed Pluto's
// far side as one flat colour.)
//
// A WORLD IS LIT BY THE SUN AND NOTHING ELSE, so walking the camera round it photographs its night
// (the first version of this probe did, and three of its five pictures were mostly black). Instead
// the camera stays on the sunward side and THE CLOCK turns the world under it: the stage as "Go
// there" frames it, then a third and two thirds of a turn later, then over each pole. Five pictures
// that between them hold every longitude in daylight.
look.probe = 'worlds';
const out = { worlds: {} };
// Sidereal rotation, hours (the sign does not matter here: a third of a turn either way).
const TURN_H = { mercury: 1407.6, venus: 5832.5, earth: 23.934, mars: 24.623, jupiter: 9.925, saturn: 10.656, uranus: 17.24, neptune: 16.11, pluto: 153.29 };
for (const id of Object.keys(TURN_H)) {
  if (!sr.recordById(id)) { look.missing.push(id); continue; }
  sr.clock.live();
  await stage(id, 9000);
  const d = rig.state.distance;
  await shot(id + '-1-stage', id + ': its stage as "Go there" frames it');
  const t0 = sr.clock.now();
  const row = { distance: d, share: sr.worlds.discShare(id), views: [] };
  try {
    for (const [name, turn] of [['2-third-of-a-turn', 1 / 3], ['3-two-thirds-of-a-turn', 2 / 3]]) {
      sr.clock.goTo(t0 + turn * TURN_H[id] * 3600e3);
      await sleep(1500); // the world and the Sun are where the new time puts them
      const s = sunward(id);
      // A little to one side of the Sun's line, so the terminator and its relief are in the picture.
      rig.flyTo({ offset: mix(s, 1, unit(cross(s, north(id))), 0.35), distance: d, ms: 0 });
      await shot(id + '-' + name, id + ': from the sunward side, ' + (turn * TURN_H[id]).toFixed(1) + ' h on (' + name.slice(2).replace(/-/g, ' ') + ')', 4500);
      row.views.push({ name, clock: new Date(sr.clock.now()).toISOString() });
    }
    sr.clock.goTo(t0);
    await sleep(1500);
    for (const [name, sign] of [['4-north', 1], ['5-south', -1]]) {
      // Over the pole and leaning to the Sun: at an equinox a pole is on the terminator.
      rig.flyTo({ offset: mix(north(id), sign, sunward(id), 0.6), distance: d, ms: 0 });
      await shot(id + '-' + name, id + ': over its ' + name.slice(2) + ' pole, leaning to the Sun', 4500);
    }
  } catch (e) { look.errors.push('probe: ' + id + ' could not be turned: ' + (e && e.stack || e)); }
  out.worlds[id] = row;
}
sr.clock.live();
out.tiles = sr.quality && sr.quality.tiles ? sr.quality.tiles() : null;
return finish(out);
