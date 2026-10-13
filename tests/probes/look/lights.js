// lights: each bright planet as a point of light beside a small Earth (scene/worldlights.js): the
// camera stands on the far side of the Earth from the planet and a little to one side.
look.probe = 'lights';
const out = { planets: {} };
out.lightsLoaded = await until(() => sr.worldLights, 30000);
const d0 = rig.state.distance;
for (const id of ['venus', 'jupiter', 'mars', 'saturn', 'mercury']) {
  const p = sr.worlds.drawnPositionOf(id);
  if (!p) { look.missing.push(id); continue; }
  const n = Math.hypot(p.x, p.y, p.z);
  const v = { x: p.x / n, y: p.y / n, z: p.z / n };
  const perp = Math.abs(v.y) < 0.9 ? { x: -v.z, y: 0, z: v.x } : { x: 1, y: 0, z: 0 };
  rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: d0 * 3, offset: { x: -v.x + 0.22 * perp.x, y: -v.y + 0.22 * perp.y, z: -v.z + 0.22 * perp.z }, ms: 0 });
  await shot('light-' + id, id + ' behind a small Earth, a little to one side', 5000);
  out.planets[id] = { share: sr.worlds.discShare(id) };
}
out.lights = sr.worldLights && sr.worldLights.state ? sr.worldLights.state() : null;
if (!out.lightsLoaded) out.fail = 'the planets-as-lights module never loaded';
return finish(out);
