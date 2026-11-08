// f10-stars3d: Orion from 1 000 light-years, with and without AT-HYG's extra stars (forge #140, release 2.0.0 batch
// f10-stars3d). The stellar rung, the camera 1 000 ly from the Sun towards the Orion Nebula (RA 83.82 deg, Dec -5.39 deg,
// 1 344 ly: the Orion Nebula's Wikipedia distance, Gaia's), looking on at the nebula 344 ly ahead. Two pictures of the
// same pose: HYG alone (`sr.starTiers.hold(true)`, as the Low setting would draw it, nothing else changed), then with the
// AT-HYG nodes the device's tier holds round the camera. The same pair 50 ly from the Sun on the side away from the
// Galaxy's centre, looking back along the Milky Way's plane (where HYG's sky empties first). Then one of the stars the
// AT-HYG tier added, tapped as a visitor taps it (the 3D map's pickAll), its card beside it: the catalogue and the
// distance's error. Beside each picture: the tier's state (nodes, stars drawn, the tier and why), the renderer's calls,
// the median of 30 frame intervals and the GPU's own time where the browser reports it; `frameTime` puts each pair's side
// by side (run with `--gl=gpu` for numbers that mean anything).
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'f10-stars3d';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const frames = (n = 30, capMs = 60000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    resolve({ frames: gaps.length, medianMs: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] * 10) / 10 : null });
  };
  requestAnimationFrame(step);
});
const tiers = () => { try { return sr.starTiers ? sr.starTiers.state() : null; } catch (e) { return { error: String(e) }; } };
const textOf = (sel, n = 600) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const snap = async (name, note, settleMs = 6000) => {
  await sleep(settleMs);
  const f = await frames();
  const row = { name, note, tiers: tiers(), cost: frameCost(), ...f, card: textOf('#sr-card') };
  out.scenes.push(row);
  await shot(name, `${note} | ${row.tiers ? `${row.tiers.plan.tier} ${row.tiers.plan.why}, ${row.tiers.nodes} nodes, ${row.tiers.stars} stars` : 'no tiers'}, median ${f.medianMs} ms`);
  return row;
};

try {
  await until(() => !!sr.starTiers, 120000, 500);
  if (!sr.starTiers) out.problems.push('scene/stars3dtiles.js never attached (ctx.starTiers)');
  sr.setLayerOn('stars', true);
  await stage('stellar', 9000);
  // places in the stage's scene through the same affine map the stars use: a direction (RA, Dec in degrees) and light-years
  const e = 23.4392911 * Math.PI / 180;
  const A = sr.stage.affineFrom('sun-inertial', sr.stage.tMs);
  const at = (raDeg, decDeg, ly) => {
    const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
    const q = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
    const k = [q[0], q[1] * Math.cos(e) + q[2] * Math.sin(e), -q[1] * Math.sin(e) + q[2] * Math.cos(e)].map((v) => v * ly * LY_KM);
    const p = [0, 1, 2].map((i) => A.o[i] + A.x[i] * k[0] + A.y[i] * k[1] + A.z[i] * k[2]);
    return { x: p[0], y: p[1], z: p[2] };
  };
  const sun = at(0, 0, 0);
  const gpu = () => { try { const g = sr.perf.stats().gpuTime; return g && g.supported ? { p50Ms: g.p50Ms, p95Ms: g.p95Ms, samples: g.samples } : { supported: false }; } catch { return null; } };
  const pair = async (tag, note, pose) => {
    pose();
    sr.starTiers.hold(true);
    const off = await snap(`${tag}-hyg`, `${note}: HYG alone (109 389 stars)`, 9000);
    off.gpu = gpu();
    sr.starTiers.hold(false);
    await until(() => { const s = tiers(); return s && s.nodes > 0 && s.nodes >= Math.min(s.slots, 8); }, 240000, 1000);
    await sleep(5000);
    pose();
    const on = await snap(`${tag}-athyg`, `${note}: HYG and the AT-HYG nodes round the camera`, 6000);
    on.gpu = gpu();
    out.frameTime = out.frameTime || {};
    out.frameTime[tag] = { hygMedianMs: off.medianMs, athygMedianMs: on.medianMs, hygGpu: off.gpu, athygGpu: on.gpu };
  };
  // Orion: 1 000 ly from the Sun towards the Orion Nebula (RA 83.82, Dec -5.39, 1 344 ly), looking on at it 344 ly ahead
  const m42 = at(83.82, -5.39, 1344);
  await pair('orion-1000ly', 'Orion from 1 000 ly', () => rig.flyTo({ targetScene: m42, offset: unit({ x: sun.x - m42.x, y: sun.y - m42.y, z: sun.z - m42.z }), distance: 344 * LY_KM / sr.stage.unitKm, ms: 0 }));
  out.camera = { fromSunLy: Math.round(Math.hypot(sr.camera.position.x - sun.x, sr.camera.position.y - sun.y, sr.camera.position.z - sun.z) * sr.stage.unitKm / LY_KM) };
  out.line = sr.starTiers.line();
  // 50 ly from the Sun on the side away from the Galaxy's centre (RA 266.40, Dec -28.94), looking back past the Sun along the plane
  const anti = at(86.40, 28.94, 1);
  // the stars alone: the layers that mark things among them (planet hosts, systems, the exotic objects, the deep sky) are put away
  for (const id of ['exoplanets', 'systems', 'exotics', 'extremes-more', 'pulsars', 'beyond-more', 'quasars', 'deep-sky']) { try { sr.setLayerOn(id, false); } catch { /* not on this build */ } }
  await pair('milkyway-50ly', '50 ly out, looking along the Milky Way towards its centre', () => rig.flyTo({ targetScene: sun, offset: unit({ x: anti.x - sun.x, y: anti.y - sun.y, z: anti.z - sun.z }), distance: 50 * LY_KM / sr.stage.unitKm, ms: 0 }));
  rig.flyTo({ targetScene: m42, offset: unit({ x: sun.x - m42.x, y: sun.y - m42.y, z: sun.z - m42.z }), distance: 344 * LY_KM / sr.stage.unitKm, ms: 0 });
  await sleep(6000);

  // one star the tier added, tapped where it is drawn
  const vp = { w: innerWidth, h: innerHeight };
  let hit = null;
  for (let gy = -0.6; gy <= 0.6 && !hit; gy += 0.15) {
    for (let gx = -0.6; gx <= 0.6 && !hit; gx += 0.15) {
      const got = sr.stars3d.pickAll(gx, gy, sr.camera, vp, 6, 24).find((h) => h.record && h.record.meta && h.record.meta.catalogue === 'athyg');
      if (got) hit = got.record;
    }
  }
  if (!hit) out.problems.push('no AT-HYG star under any of 81 points of the screen');
  else {
    out.tapped = { id: hit.id, name: hit.name, distLy: hit.meta.distLy, poe: hit.meta.poe, guess: hit.meta.guess, cite: hit.meta.cite, distNote: hit.meta.distNote };
    sr.select(hit, { fly: false, undo: false });
    await snap('orion-athyg-card', `an AT-HYG star selected: ${hit.name}, its card`, 7000);
  }
} catch (err) { out.problems.push('probe: ' + String((err && err.stack) || err).slice(0, 500)); }

if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
