// r12-moons: plumes where they were seen (release 1.2.0 stage W2-c, internal spec 0076; internal #861, #862).
// Io with Pele on its limb (from the sunward side, under Film and under Measured), Tvashtar on the limb
// from the night side as New Horizons saw it in 2007, Io's hot spots on its night side; Enceladus's south
// pole on the limb from the sunward side and from behind (Cassini's geometry of 2005: the jets lit from
// behind), under Film and Measured; Triton's two geysers (Voyager 2, 1989) close from the side and from
// above. Each moon also at the app's own arrival, selected, with the card's plume line written down.
//
// THE BEFORE. On a ref without scene/plumes.js (`-f ref=main`) the same places are photographed with
// nothing to switch: those pictures are the before. On a ref with it, each place is photographed twice
// in the same run, with the plumes switched off for one shot (sr.plumes.debug({ on: false })), for a
// before from the same frame and the frame cost of the plumes alone: every place under Film is a pair.
//
// ONE MOMENT. The clock is put at 2026-10-15 12:00 UTC and paused (as the `heroes` gallery is), so
// Measured and Film are photographed at the same instant and two runs photograph the same thing. The
// places are computed here from the gazetteer's coordinates (copied below, not read from the module, so
// the probe runs on main), on each moon's mesh as it stands at that moment.
//
// BESIDE EVERY PICTURE (out.json `scenes`): the moon, the look, the camera's distance from the target,
// the angle between the Sun and the camera seen from the target (the phase: near 180 is backlit), p50/p95
// of up to 60 drawn-frame intervals, draw calls, points, and the GPU bytes estimate (sr.perf), and what
// sr.plumes.state() says is drawn. Run it at `-f width=1600 -f height=900` and with `-f mobile=true`.
look.probe = 'r12-moons';
const out = { scenes: [], cards: {}, problems: [] };
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
const MEASURE_FRAMES = 60;
const MEASURE_CAP_MS = 12000;
const D2R = Math.PI / 180;
// East longitude and latitude in degrees (the gazetteer gives Io's in west longitude: east = -west).
const PLACES = {
  pele: { world: 'io', lat: -18.7, lon: -255.3 },
  tvashtar: { world: 'io', lat: 62.76, lon: -123.53 },
  loki: { world: 'io', lat: 13.0, lon: -308.8 },
  hili: { world: 'triton', lat: -57, lon: 28 },
  mahilani: { world: 'triton', lat: -49, lon: 2 },
};
const RADIUS_KM = { io: 1821.5, enceladus: 252.1, triton: 1352.6 };
// (Distances below are from the moon's centre when the view looks at the centre.)

try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
sr.clock.goTo(AT);
sr.clock.setPaused(true);
out.clock = new Date(sr.clock.now()).toISOString();

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const neg = (a) => scale(a, -1);
/** A place on a moon's map as a unit vector in the scene: scene/worlds.js faceVector through the mesh's matrix. */
const placeDir = (id, lat, lon) => {
  const m = sr.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements;
  const la = lat * D2R; const lo = lon * D2R;
  const v = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
  return unit({ x: e[0] * v.x + e[4] * v.y + e[8] * v.z, y: e[1] * v.x + e[5] * v.y + e[9] * v.z, z: e[2] * v.x + e[6] * v.y + e[10] * v.z });
};
const centre = (id) => { const p = sr.worlds.meshFor(id).position; return { x: p.x, y: p.y, z: p.z }; };
/** The part of `v` across `n`, as a unit vector; `fallback` when `v` is along `n`. */
const across = (v, n, fallback) => { const t = add(v, n, -dot(v, n)); return Math.hypot(t.x, t.y, t.z) > 1e-6 ? unit(t) : fallback; };
const anyAcross = (n) => across(Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }, n, { x: 1, y: 0, z: 0 });

const measure = async () => {
  if (sr.perf) {
    sr.perf.mark();
    await until(() => sr.perf.count() >= MEASURE_FRAMES, MEASURE_CAP_MS, 100);
    return sr.perf.stats();
  }
  const stamps = [];
  const began = performance.now();
  await new Promise((resolve) => {
    const step = (t) => { stamps.push(t); if (stamps.length <= MEASURE_FRAMES && performance.now() - began < MEASURE_CAP_MS) requestAnimationFrame(step); else resolve(); };
    requestAnimationFrame(step);
  });
  const gaps = stamps.slice(1).map((x, i) => x - stamps[i]).sort((a, b) => a - b);
  const q = (k) => (gaps.length ? +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * k))].toFixed(1) : null);
  return { frames: gaps.length, p50Ms: q(0.5), p95Ms: q(0.95), ...(frameCost() || {}) };
};
const plumeState = () => { try { return sr.plumes ? sr.plumes.state() : null; } catch (e) { return { error: String(e) }; } };
const setLook = (mode) => { try { sr.drawn.set(mode); } catch (e) { look.warns.push('probe: could not set the look ' + mode + ': ' + e); } };

/** Aim at `target` (scene) from the direction `dir`, `distKm` away, on world `id` (km to scene units by its drawn radius). */
// Twice, a moment apart: on main's first run a pose set right after the deselect was overtaken (Io's
// limb shots came out from much further away than asked); the scene row says how far the camera is.
const aim = async (id, target, dir, distKm) => {
  const R = sr.worlds.drawnRadiusUnits(id);
  try { if (rig.finishFlight) rig.finishFlight(); } catch { /* none in flight */ }
  for (let i = 0; i < 2; i++) {
    rig.flyTo({ targetScene: target, offset: unit(dir), distance: (distKm / RADIUS_KM[id]) * R, ms: 0 });
    await sleep(600);
  }
};
/** A point `altKm` over a place on the moon, in the scene. */
const over = (id, n, altKm) => add(centre(id), n, sr.worlds.drawnRadiusUnits(id) * (1 + altKm / RADIUS_KM[id]));

const scene = async (name, note, id, lookMode, target, extra = {}) => {
  setLook(lookMode);
  await sleep(4000);
  const m = await measure();
  const cam = sr.camera ? sr.camera.position : null;
  let phase = null;
  if (cam && target) {
    const toCam = unit({ x: cam.x - target.x, y: cam.y - target.y, z: cam.z - target.z });
    phase = +(Math.acos(Math.max(-1, Math.min(1, dot(toCam, sunward(id))))) / D2R).toFixed(1);
  }
  let camKm = null;
  if (cam && target) camKm = +((Math.hypot(cam.x - target.x, cam.y - target.y, cam.z - target.z) / sr.worlds.drawnRadiusUnits(id)) * RADIUS_KM[id]).toFixed(0);
  out.scenes.push({
    name, world: id, look: lookMode, phaseDeg: phase, cameraKm: camKm,
    distanceKm: rig.state ? +((rig.state.distance / sr.worlds.drawnRadiusUnits(id)) * RADIUS_KM[id]).toFixed(0) : null,
    p50Ms: m.p50Ms, p95Ms: m.p95Ms, workP50Ms: m.workP50Ms ?? null, calls: m.calls, points: m.points ?? null, triangles: m.triangles,
    gpuBytes: m.gpu ? m.gpu.bytes ?? m.gpu : null, tier: m.tier ?? null, latched: sr.latch ? sr.latch.latched : null,
    plumes: plumeState(), ...extra,
  });
  await shot(name, note + ' (' + lookMode + (phase !== null ? ', phase ' + phase + ' deg' : '') + ')');
};
/** The same place twice when the plumes are there: switched off (the before, in this run), then on. */
const pair = async (name, note, id, lookMode, target) => {
  if (sr.plumes && typeof sr.plumes.debug === 'function') {
    sr.plumes.debug({ on: false });
    await scene(name + '-off', 'BEFORE, plumes switched off: ' + note, id, lookMode, target);
    sr.plumes.debug({ on: true });
  }
  await scene(name, note, id, lookMode, target);
};

const arrive = async (id) => {
  await stage(id, 9000);
  if (sr.wantPlumes && !sr.plumes) { try { await sr.wantPlumes(); } catch (e) { look.warns.push('probe: sr.wantPlumes: ' + e); } }
  if (sr.plumes) await until(() => sr.plumes.state().worlds.includes(id), 20000);
  const ok = await go(id, null, 6000);
  if (!ok) { out.problems.push('no record ' + id); return false; }
  const line = document.querySelector('.sr-card__plumes');
  out.cards[id] = line ? { text: line.textContent, hidden: !!line.hidden } : null;
  await scene(id + '-1-arrival', 'the app\'s own arrival, selected', id, 'film', centre(id));
  try { sr.deselect(); rig.stopFollow(); } catch (e) { look.warns.push('probe: deselect/stopFollow: ' + e); }
  await sleep(2500);
  return true;
};

// THE VIEWS AIM AT THE MOON'S CENTRE. The first after-run (2026-10-16) aimed at a point over the vent
// from 0.2 to 0.8 radii away, and the moon's near side was not drawn: whenever its centre was off the
// screen the globe was missing round the target (main's own run shows the same: the before of io-2 is
// black). So every view looks at the centre, and a plume is put on the limb by the camera's side:
// across the vent's vertical, turned so the vent is at the TOP or BOTTOM of the picture (the camera's
// own up), which keeps it on a 390 px phone too, and as far toward or away from the Sun as 30 degrees
// of turn allow; far enough out that the plume's top is inside 16 degrees of the middle (a phone's sheet and time bar sit below).
const limbView = (id, n, heightKm, wantBack) => {
  const s = sunward(id);
  const up = sr.camera && sr.camera.up ? unit(sr.camera.up) : { x: 0, y: 1, z: 0 };
  const R = RADIUS_KM[id];
  const d = (R + heightKm) / Math.sin(16 * D2R);
  let best = null;
  for (const sign of [1, -1]) {
    const d0 = scale(across(up, n, anyAcross(n)), sign);
    const side = unit(cross(n, d0));
    for (const deg of [-30, -15, 0, 15, 30]) {
      const b = deg * D2R;
      const D = add(scale(d0, Math.cos(b)), side, Math.sin(b));
      const score = (wantBack ? -1 : 1) * dot(D, s);
      if (!best || score > best.score) best = { D, score };
    }
  }
  // Leaned toward the vent so it stands just in front of the limb seen from there.
  return { dir: add(best.D, n, (R / d) * 1.05), distKm: d };
};

// ---- Io --------------------------------------------------------------------------------------------
try {
  if (await arrive('io')) {
    const C = centre('io');
    const pele = placeDir('io', PLACES.pele.lat, PLACES.pele.lon);
    const pv = limbView('io', pele, 300, false);
    await aim('io', C, pv.dir, pv.distKm);
    await pair('io-2-pele-limb', 'Pele (Voyager 1, March 1979, about 300 km) on the limb, from the Sun\'s side', 'io', 'film', C);
    await scene('io-3-pele-limb-measured', 'the same place under Measured: the plume as observed, still', 'io', 'measured', C);
    // Tvashtar on the limb with the Sun beyond Io, as New Horizons saw it in 2007.
    const tv = placeDir('io', PLACES.tvashtar.lat, PLACES.tvashtar.lon);
    const tvv = limbView('io', tv, 330, true);
    await aim('io', C, tvv.dir, tvv.distKm);
    await pair('io-4-tvashtar-backlit', 'Tvashtar (New Horizons, 2007, about 330 km) on the limb, the Sun beyond Io', 'io', 'film', C);
    // The night side square on, between the Sun's antipode and Loki: the hot spots.
    const loki = placeDir('io', PLACES.loki.lat, PLACES.loki.lon);
    await aim('io', C, unit(add(neg(sunward('io')), loki, 0.6)), RADIUS_KM.io * 3.2);
    await pair('io-5-night-hot-spots', 'Io\'s night side: the hot spots where they face the camera, and plumes lit over the limb', 'io', 'film', C);
  }
} catch (err) { look.errors.push('probe: Io: ' + (err && err.stack || err)); }

// ---- Enceladus -------------------------------------------------------------------------------------
try {
  if (await arrive('enceladus')) {
    const C = centre('enceladus');
    const south = neg(north('enceladus'));
    const lv = limbView('enceladus', south, 505, false);
    await aim('enceladus', C, lv.dir, lv.distKm);
    await pair('enc-2-south-limb', 'the south pole on the limb from the Sun\'s side: the jets of the tiger stripes (Cassini, 2005)', 'enceladus', 'film', C);
    const bv = limbView('enceladus', south, 505, true);
    await aim('enceladus', C, bv.dir, bv.distKm);
    await pair('enc-3-backlit', 'the south pole on the limb with the Sun beyond the moon: Cassini\'s view of November 2005', 'enceladus', 'film', C);
    await scene('enc-4-backlit-measured', 'the same place under Measured: the jets as observed, still', 'enceladus', 'measured', C);
  }
} catch (err) { look.errors.push('probe: Enceladus: ' + (err && err.stack || err)); }

// ---- Triton ----------------------------------------------------------------------------------------
// An 8 km column is two pixels at a whole-disc distance, so Triton is seen from above the geysers, as
// Voyager 2 found them: the camera over Hili, leaning a quarter toward the Sun's side, looking at the
// centre (the globe is drawn whole that way); the cloud is a streak on the ground carried west.
try {
  if (await arrive('triton')) {
    const C = centre('triton');
    const s = sunward('triton');
    const hili = placeDir('triton', PLACES.hili.lat, PLACES.hili.lon);
    const over1 = unit(add(hili, across(s, hili, anyAcross(hili)), 0.25));
    await aim('triton', C, over1, RADIUS_KM.triton + 320);
    await pair('tri-2-hili-above', 'Hili (Voyager 2, August 1989) from 320 km: the 8 km column and its cloud carried west', 'triton', 'film', C);
    await scene('tri-3-hili-above-measured', 'the same place under Measured: still', 'triton', 'measured', C);
    const mah = placeDir('triton', PLACES.mahilani.lat, PLACES.mahilani.lon);
    const mid = unit(add(hili, mah));
    await aim('triton', C, unit(add(mid, across(s, mid, anyAcross(mid)), 0.35)), RADIUS_KM.triton + 900);
    await pair('tri-4-geysers-above', 'Hili and Mahilani from 900 km, leaning toward the Sun\'s side', 'triton', 'film', C);
  }
} catch (err) { look.errors.push('probe: Triton: ' + (err && err.stack || err)); }

setLook('film');
out.plumesLoaded = !!sr.plumes;
if (!sr.plumes) look.missing.push('sr.plumes: not on this ref (the before)');
return finish(out);
