// r12-moons: plumes where they were seen (release 1.2.0 stage W2-c, internal spec 0076; internal #861, #862).
// Io with Pele on its limb (from the sunward side, under Film and under Measured), Tvashtar on the limb
// from the night side as New Horizons saw it in 2007, Io's hot spots on its night side; Enceladus's south
// pole on the limb from the sunward side and from behind (Cassini's geometry of 2005: the jets lit from
// behind), under Film and Measured; Triton's two geysers (Voyager 2, 1989) close from the side and from
// above. Each moon also at the app's own arrival, selected, with the card's plume line written down.
//
// THE BEFORE. On a ref without scene/plumes.js (`-f ref=main`) the same places are photographed with
// nothing to switch: those pictures are the before. On a ref with it, three places are photographed twice
// in the same run, with the plumes switched off for one shot (sr.plumes.debug({ on: false })), for a
// before from the same frame and the frame cost of the plumes alone.
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
const aim = (id, target, dir, distKm) => {
  const R = sr.worlds.drawnRadiusUnits(id);
  rig.flyTo({ targetScene: target, offset: unit(dir), distance: (distKm / RADIUS_KM[id]) * R, ms: 0 });
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
  out.scenes.push({
    name, world: id, look: lookMode, phaseDeg: phase,
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
  return true;
};

// ---- Io --------------------------------------------------------------------------------------------
try {
  if (await arrive('io')) {
    const s = sunward('io');
    const pele = placeDir('io', PLACES.pele.lat, PLACES.pele.lon);
    // Pele on the limb from the sunward side: the camera across Pele's vertical, toward the Sun's side, a
    // little above the horizon plane; the target half-way up the 300 km plume.
    const pT = over('io', pele, 150);
    const pDir = add(across(s, pele, anyAcross(pele)), pele, 0.12);
    aim('io', pT, pDir, 1500);
    await pair('io-2-pele-limb', 'Pele (Voyager 1, March 1979, about 300 km) on the limb, from the sunward side', 'io', 'film', pT);
    await scene('io-3-pele-limb-measured', 'the same place under Measured: the plume as observed, still', 'io', 'measured', pT);
    // Tvashtar from the night side, the Sun behind Io, as New Horizons saw it on 1 March 2007.
    const tv = placeDir('io', PLACES.tvashtar.lat, PLACES.tvashtar.lon);
    const tT = over('io', tv, 165);
    const tDir = add(neg(across(s, tv, anyAcross(tv))), tv, 0.12);
    aim('io', tT, tDir, 1700);
    await scene('io-4-tvashtar-backlit', 'Tvashtar (New Horizons, 2007, about 330 km) on the limb from the night side', 'io', 'film', tT);
    // The night side square on, centred between the Sun's antipode and Loki: the hot spots.
    const loki = placeDir('io', PLACES.loki.lat, PLACES.loki.lon);
    const nDir = unit(add(neg(s), loki, 0.6));
    aim('io', centre('io'), nDir, RADIUS_KM.io * 3.2);
    await scene('io-5-night-hot-spots', 'Io\'s night side: the hot spots (Loki Patera, Pele, Pillan, Tvashtar, Prometheus where on the night side)', 'io', 'film', centre('io'));
  }
} catch (err) { look.errors.push('probe: Io: ' + (err && err.stack || err)); }

// ---- Enceladus -------------------------------------------------------------------------------------
try {
  if (await arrive('enceladus')) {
    const s = sunward('enceladus');
    const south = neg(north('enceladus'));
    const T = over('enceladus', south, 200);
    const lit = across(s, south, anyAcross(south));
    aim('enceladus', T, add(lit, south, 0.05), RADIUS_KM.enceladus * 5);
    await scene('enc-2-south-limb', 'the south pole on the limb from the sunward side: the jets of the tiger stripes (Cassini, 2005)', 'enceladus', 'film', T);
    // From behind: the camera across the pole on the far side from the Sun, turned 25 degrees off the
    // Sun's line so the Sun is not straight behind the moon's centre. Phase about 155 degrees.
    const q = unit(cross(south, lit));
    const back = add(scale(neg(lit), Math.cos(25 * D2R)), q, Math.sin(25 * D2R));
    aim('enceladus', T, back, RADIUS_KM.enceladus * 5);
    await pair('enc-3-backlit', 'the south pole on the limb from behind, the Sun beyond the moon: Cassini\'s view of November 2005', 'enceladus', 'film', T);
    await scene('enc-4-backlit-measured', 'the same place under Measured: the jets as observed, still', 'enceladus', 'measured', T);
  }
} catch (err) { look.errors.push('probe: Enceladus: ' + (err && err.stack || err)); }

// ---- Triton ----------------------------------------------------------------------------------------
try {
  if (await arrive('triton')) {
    const s = sunward('triton');
    const hili = placeDir('triton', PLACES.hili.lat, PLACES.hili.lon);
    const T = over('triton', hili, 5);
    // From the side, the camera on the Sun's side of the column and a little above: the 8 km column and
    // its cloud carried west (Soderblom et al. 1990) across the picture.
    const side = add(across(s, hili, anyAcross(hili)), hili, 0.18);
    aim('triton', T, side, 260);
    await pair('tri-2-hili-side', 'Hili (Voyager 2, August 1989): the 8 km column and its cloud blown west, from the side', 'triton', 'film', T);
    await scene('tri-3-hili-side-measured', 'the same place under Measured: still', 'triton', 'measured', T);
    const mah = placeDir('triton', PLACES.mahilani.lat, PLACES.mahilani.lon);
    const mid = unit(add(hili, mah));
    const M = over('triton', mid, 0);
    aim('triton', M, add(mid, across(s, mid, anyAcross(mid)), 0.7), 700);
    await scene('tri-4-geysers-above', 'Hili and Mahilani from 700 km, obliquely from the Sun\'s side', 'triton', 'film', M);
  }
} catch (err) { look.errors.push('probe: Triton: ' + (err && err.stack || err)); }

setLook('film');
out.plumesLoaded = !!sr.plumes;
if (!sr.plumes) look.missing.push('sr.plumes: not on this ref (the before)');
return finish(out);
