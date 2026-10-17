// films (internal spec 0076 W2-b; this wave's): Uranus's rings at their own darkness, and Neptune's
// beside them unchanged. Each place twice in a row: BEFORE, as main draws it (sr.weather.setBeforeGiants
// (true), a switch that works under ?look=1 only: the pale grey Uranus's rings had), then AFTER, with
// sr.perf's numbers. The clock is held at one instant. For Uranus: its stage; low over the lit face of
// the rings, so their near side crosses the disc (dark threads against the clouds) and their far side
// stands against black; from high above the lit face; then the low view again under Deep (lifted four
// times) and Eye. For Neptune: its stage and the lit face of its rings (no change is expected).
look.probe = 'films';
const out = { scenes: [] };
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
const before = (on) => { try { return !!(sr.weather && sr.weather.setBeforeGiants && sr.weather.setBeforeGiants(on)); } catch { return false; } };
const measure = async () => {
  if (!sr.perf) return null;
  sr.perf.mark();
  await until(() => sr.perf.count() >= 40, 20000, 100);
  const s = sr.perf.stats();
  return { p50Ms: s.p50Ms, p95Ms: s.p95Ms, calls: s.calls, triangles: s.triangles, textures: s.textures, gpuMiB: s.gpu ? s.gpu.visibleMiB : null, netBytes: s.net ? s.net.bytes : null, exposure: s.exposure, tier: s.tier };
};
const exposure = (m) => { try { if (sr.exposure && sr.exposure.set) sr.exposure.set(m); } catch (e) { look.errors.push('probe: exposure ' + m + ': ' + e); } };
const pair = async (name, note, settleMs = 9000) => {
  const took = before(true);
  await shot(name + '-a-before', note + ' -- BEFORE: as main draws it' + (took ? '' : ' (the switch did not take: this is the AFTER)'), settleMs);
  const b = await measure();
  before(false);
  await shot(name + '-b-after', note + ' -- AFTER', 5000);
  out.scenes.push({ name, note, before: b, after: await measure() });
};
const portrait = innerHeight > innerWidth;
sr.clock.goTo(Date.UTC(2026, 9, 16, 12, 0, 0));
sr.clock.setPaused(true);
exposure('camera');
for (const id of ['uranus', 'neptune']) {
  if (!sr.recordById(id)) { look.missing.push(id); continue; }
  await stage(id, 10000);
  await pair(id + '-1-stage', id + ': its stage as "Go there" frames it');
  const mesh = sr.worlds.meshFor(id);
  const R = mesh.scale.x;
  const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
  const s = sunward(id);
  const n = north(id);
  const lit = Math.sign(n.x * s.x + n.y * s.y + n.z * s.z) || 1;
  // The Sun's direction laid in the ring plane, and the camera 15 degrees above that plane on the lit face.
  const k = s.x * n.x + s.y * n.y + s.z * n.z;
  const flat = unit({ x: s.x - k * n.x, y: s.y - k * n.y, z: s.z - k * n.z });
  const low = unit(mix(flat, Math.cos(15 * Math.PI / 180), n, lit * Math.sin(15 * Math.PI / 180)));
  const far = portrait ? 8.5 : 5.5;
  if (id === 'uranus') {
    rig.flyTo({ targetScene: centre(), offset: low, distance: R * far, ms: 0 });
    await pair('uranus-2-rings-low', 'uranus: 15 degrees above the lit face of the rings, the near side across the disc, Camera');
    rig.flyTo({ targetScene: centre(), offset: unit(mix(low, 0.6, flat, 0.4)), distance: R * (portrait ? 4.2 : 3.0), ms: 0 });
    await pair('uranus-3-rings-close', 'uranus: closer, the epsilon ring against the clouds and against black, Camera');
    rig.flyTo({ targetScene: centre(), offset: unit(mix(n, 0.8 * lit, flat, 0.6)), distance: R * far, ms: 0 });
    await pair('uranus-4-rings-high', 'uranus: high over the lit face of the rings, Camera');
    rig.flyTo({ targetScene: centre(), offset: low, distance: R * far, ms: 0 });
    exposure('deep');
    await shot('uranus-5-rings-low-deep', 'uranus: the low view again, Deep exposure: the rings lifted four times (AFTER only)', 7000);
    out.scenes.push({ name: 'uranus-5-rings-low-deep', after: await measure() });
    exposure('eye');
    await shot('uranus-6-rings-low-eye', 'uranus: the same, Eye exposure: as dark as they are (AFTER only)', 6000);
    out.scenes.push({ name: 'uranus-6-rings-low-eye', after: await measure() });
    exposure('camera');
  } else {
    rig.flyTo({ targetScene: centre(), offset: unit(mix(n, 0.45 * lit, flat, 1)), distance: R * far, ms: 0 });
    await pair('neptune-2-rings', 'neptune: above the lit face of its rings (no change is expected), Camera');
  }
}
try { out.rings = sr.weather && sr.weather.rings ? sr.weather.rings() : null; } catch (e) { look.warns.push('probe: the rings: ' + e); }
sr.clock.setPaused(false);
sr.clock.live();
return finish(out);
