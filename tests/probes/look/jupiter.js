// jupiter (internal spec 0076 W2-b; this wave's): the Great Red Spot where the JUPOS team measured it,
// and Jupiter's faint ring. Every place is photographed twice in a row: BEFORE, as main draws it
// (sr.weather.setBeforeGiants(true), a switch that works under ?look=1 only: the spot where the map has
// it, no ring), then AFTER, with sr.perf's numbers for each. The clock is held at one instant, turned
// so the spot is under the Sun, on the world's own face and on Hubble's; then the ring from the night side (the Sun behind the planet) under
// Camera and Deep, and from the day side under Camera and Deep. Last, the stage as "Go there" frames it.
look.probe = 'jupiter';
const J = 'jupiter';
const out = { scenes: [] };
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
const before = (on) => { try { return !!(sr.weather && sr.weather.setBeforeGiants && sr.weather.setBeforeGiants(on)); } catch { return false; } };
const measure = async () => {
  if (!sr.perf) return null;
  sr.perf.mark();
  await until(() => sr.perf.count() >= 40, 20000, 100);
  const s = sr.perf.stats();
  return { p50Ms: s.p50Ms, p95Ms: s.p95Ms, calls: s.calls, triangles: s.triangles, textures: s.textures, gpuMiB: s.gpu ? s.gpu.visibleMiB : null, netBytes: s.net ? s.net.bytes : null, exposure: s.exposure, tier: s.tier };
};
const spot = () => { try { const w = sr.weather.state().air.worlds.find((x) => x.id === J); return w ? w.spot : null; } catch { return null; } };
const ring = () => { try { return sr.weather.rings(); } catch { return null; } };
const exposure = (m) => { try { if (sr.exposure && sr.exposure.set) sr.exposure.set(m); } catch (e) { look.errors.push('probe: exposure ' + m + ': ' + e); } };
/** One place before and after, from the same camera at the same instant. */
const pair = async (name, note, settleMs = 8000) => {
  const took = before(true);
  await shot(name + '-a-before', note + ' -- BEFORE: as main draws it' + (took ? '' : ' (the switch did not take: this is the AFTER)'), settleMs);
  const b = await measure();
  before(false);
  await shot(name + '-b-after', note + ' -- AFTER', 5000);
  const a = await measure();
  out.scenes.push({ name, note, before: b, after: a, spot: spot(), ring: ring() });
};
/** A quaternion turning a vector (three.js's, read as plain numbers). */
const turn = (q, v) => {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y, iy = q.w * v.y + q.z * v.x - q.x * v.z, iz = q.w * v.z + q.x * v.y - q.y * v.x, iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return { x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y, y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z, z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x };
};
const inv = (q) => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
/** East longitude and latitude on the mesh (scene/worlds.js faceVector) to a direction in the scene. */
const faceDir = (mesh, lonDeg, latDeg) => {
  const lo = lonDeg * Math.PI / 180, la = latDeg * Math.PI / 180;
  return turn(mesh.quaternion, { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) });
};

sr.clock.goTo(Date.UTC(2026, 9, 16, 12, 0, 0));
sr.clock.setPaused(true);
await stage(J, 12000);
const mesh = sr.worlds.meshFor(J);
const R = mesh.scale.x;
const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
const portrait = innerHeight > innerWidth;
// THE SPOT UNDER THE SUN. Its east longitude on the mesh is 180 + 360 u (scene/weather/worldweather.js
// meshU); the Sun's is read off the mesh. The sub-solar point runs west at 870.536 degrees a day.
let sense = 1;
let last = Infinity;
for (let i = 0; i < 4; i++) {
  await sleep(1500);
  const s = spot();
  if (!s) { look.missing.push('the weather has no placed spot (an older ref, or tier 0)'); break; }
  const sl = turn(inv(mesh.quaternion), sunward(J));
  const sunLon = Math.atan2(-sl.z, sl.x) * 180 / Math.PI;
  const spotLon = 180 + 360 * s.meshU;
  const ahead = (((sunLon - spotLon) % 360) + 540) % 360 - 180;   // -180..180: degrees the Sun must still go west
  out.spotAim = { sunLon, spotLon, ahead };
  if (Math.abs(ahead) < 1) break;
  // If the last step made it worse the turn runs the other way: go back and try that.
  if (Math.abs(ahead) > last) sense = -sense;
  last = Math.abs(ahead);
  sr.clock.goTo(sr.clock.now() + sense * (ahead / 870.536) * 86400000);
}
const s0 = spot();
out.spot = s0;
if (s0) {
  const lat = (s0.v - 0.5) * 180;
  const dir = faceDir(mesh, 180 + 360 * s0.meshU, lat);
  rig.flyTo({ targetScene: centre(), offset: unit(mix(dir, 1, sunward(J), 0.25)), distance: R * (portrait ? 3.4 : 2.4), ms: 0 });
  await pair('1-spot-disc', 'the Great Red Spot under the Sun on 2026-10-16 12:00 UTC (the clock turned to put it there), the disc');
  rig.flyTo({ targetScene: centre(), offset: unit(mix(dir, 1, sunward(J), 0.1)), distance: R * (portrait ? 1.9 : 1.45), ms: 0 });
  await pair('2-spot-close', 'the same, closer: the spot and the belt round it');
  // Hubble's face (OPAL, 11 December 2025): before, its spot is where it was that day, 95 degrees from
  // where the world's own face had it; after, both faces put it at today's place.
  if (sr.worlds.setFace) {
    sr.worlds.setFace(J, 'hubble');
    await until(() => sr.worlds.faceOf(J) === 'hubble', 20000);
    await sleep(6000);
    rig.flyTo({ targetScene: centre(), offset: unit(mix(dir, 1, sunward(J), 0.25)), distance: R * (portrait ? 3.4 : 2.4), ms: 0 });
    await pair('2b-spot-hubble-face', 'the same place wearing "As Hubble saw it" (OPAL, 11 December 2025)');
    sr.worlds.setFace(J, null);
    await sleep(3000);
  }
}
// THE RING FROM THE NIGHT SIDE: the Sun behind the planet, the camera 7 degrees above the ring plane.
const n = north(J);
const night = unit(mix(sunward(J), -1, n, 0.12));
rig.flyTo({ targetScene: centre(), offset: night, distance: R * (portrait ? 9 : 5.5), ms: 0 });
exposure('camera');
await pair('3-ring-night-camera', 'the ring from Jupiter\'s night side, 7 degrees above its plane, Camera exposure');
exposure('deep');
await shot('4-ring-night-deep', 'the same, Deep exposure (AFTER only)', 6000);
out.scenes.push({ name: '4-ring-night-deep', after: await measure(), ring: ring() });
// THE RING FROM THE DAY SIDE: the Sun behind the camera.
const day = unit(mix(sunward(J), 1, n, 0.15));
rig.flyTo({ targetScene: centre(), offset: day, distance: R * (portrait ? 9 : 5.5), ms: 0 });
exposure('camera');
await pair('5-ring-day-camera', 'the ring from the day side, 9 degrees above its plane, Camera exposure: it should hardly show');
exposure('deep');
await shot('6-ring-day-deep', 'the same, Deep exposure: it shows (AFTER only)', 6000);
out.scenes.push({ name: '6-ring-day-deep', after: await measure(), ring: ring() });
exposure('eye');
await shot('7-ring-day-eye', 'the same, Eye exposure: not drawn (AFTER only)', 6000);
out.scenes.push({ name: '7-ring-day-eye', after: await measure(), ring: ring() });
exposure('camera');
// The stage as "Go there" frames it, and the card's words.
await stage(J, 8000);
await pair('8-stage', 'Jupiter on its stage, as "Go there" frames it');
try {
  out.weatherLine = sr.weather.line(J, sr.clock.now());
} catch (e) { look.warns.push('probe: the weather line: ' + e); }
sr.clock.setPaused(false);
sr.clock.live();
if (!out.weatherLoaded) out.fail = 'the weather module never loaded (tier ' + (sr.quality && sr.quality.bootTier) + ')';
return finish(out);
