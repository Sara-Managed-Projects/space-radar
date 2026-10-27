// r14-mwbh: the Milky Way from inside and the black holes in 3D (release 1.4.0, stage r14-mw-bh). No photograph in any of it.
//
// 1. EARTH'S NIGHT SKY WITH THE BAND: from orbit, the Earth with the galaxy's centre behind it; then the ground sky view at
//    Paranal on a moonless July night with the core overhead, wide and at 20 degrees.
// 2. LEAVING THE SOLAR SYSTEM, looking at the galaxy's centre: from the Sun, 1 500, 4 000 and 9 000 light-years out along
//    the plane (the near clouds slide, the band hands over to the outside model between 500 and 5 000), and 3 000 light-
//    years above the plane (the band below).
// 3. SAGITTARIUS A* as its card frames it, turned 75 degrees (the far side lensed over the top), and from 30 M on the
//    stellar stage (its true size).
// 4. M87*, framed (the galaxy, its jet at its true length, the hole drawn larger), and turned 80 degrees.
// 5. CYGNUS X-1 with its supergiant, framed and turned 60 degrees.
// Beside each: the band's stats (sr.milkyWay.stats()), the hole's (sr.portraits.state()), draw calls and 20 frame intervals.
// Fails when the band or a hole never drew. Run at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r14-mwbh';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const frames = (n = 20, capMs = 40000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    resolve({ medianMs: at(0.5), p95Ms: at(0.95) });
  };
  requestAnimationFrame(step);
});
const band = () => { try { return sr.milkyWay ? sr.milkyWay.stats() : null; } catch (e) { return { error: String(e) }; } };
const hole = () => { try { return sr.portraits ? sr.portraits.state() : null; } catch (e) { return { error: String(e) }; } };
const snap = async (name, note, settleMs = 5000) => {
  await sleep(settleMs);
  const f = await frames();
  const row = { name, note, stage: sr.stage.worldId, band: band(), hole: hole(), cost: frameCost(), ...f };
  out.scenes.push(row);
  const b = row.band, h = row.hole && row.hole.drawn;
  await shot(name, `${note} | band ${b ? `${b.steps} steps, march ${b.march}, gain ${b.gain}` : 'none'}${h ? ` | ${h.id} x${h.magnification}` : ''} | ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms`);
  return row;
};
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const norm = (v) => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
// galactic directions in the stage's scene axes (sun-inertial, ecliptic J2000 -> scene through dirToScene)
const OB = 23.4392911 * Math.PI / 180;
const eqToEcl = (v) => ({ x: v[0], y: v[1] * Math.cos(OB) + v[2] * Math.sin(OB), z: -v[1] * Math.sin(OB) + v[2] * Math.cos(OB) });
const radec = (ra, dec) => { const a = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
const sceneDir = (ecl) => { const v = sr.stage.dirToScene(ecl, 'sun-inertial'); return { x: v.x, y: v.y, z: v.z }; };

try { if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit(); } catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
await until(() => sr.milkyWay && sr.milkyWay.mesh, 60000);
if (!sr.milkyWay) out.problems.push('the Milky Way module never built (sr.milkyWay)');

// ---- 1. Earth's night sky -----------------------------------------------------------------------
try {
  sr.clock.goTo(Date.UTC(2026, 6, 15, 3, 0, 0)); // a moonless July night: the core overhead in Chile at 23:00
  await sleep(3000);
  const gcEq = radec(266.405, -28.936);
  const toGc = sr.stage.dirToScene({ x: gcEq[0], y: gcEq[1], z: gcEq[2] }, 'earth-inertial');
  const earth = sr.worlds.meshFor('earth');
  // stand so the centre is beside the Earth, not behind it: 40 degrees off the line through it
  const side = norm({ x: -toGc.z, y: 0, z: toGc.x });
  const k = 40 * Math.PI / 180;
  rig.flyTo({ targetScene: { x: earth.position.x, y: earth.position.y, z: earth.position.z }, offset: norm({ x: -toGc.x * Math.cos(k) + side.x * Math.sin(k), y: -toGc.y * Math.cos(k), z: -toGc.z * Math.cos(k) + side.z * Math.sin(k) }), distance: 34, ms: 0 });
  await snap('1-earth-band', 'from orbit, the Earth with the galaxy\'s centre beside it: the band, the Great Rift, Sagittarius', 7000);
  const A = await import(new URL('vendor/astronomy.js', document.baseURI).href);
  const obs = new A.Observer(-24.627, -70.404, 2635);
  const when = A.MakeTime(new Date(Date.UTC(2026, 6, 15, 3, 0, 0)));
  const hor = A.Horizon(when, obs, 266.405 / 15, -28.936, 'normal');
  if (sr.skyView) {
    sr.skyView.enter({ latDeg: -24.627, lonDeg: -70.404, altKm: 2.635 });
    await sleep(8000);
    sr.skyView.setFov(100, { instant: true });
    sr.skyView.lookAtDeg(hor.azimuth, Math.min(70, Math.max(25, hor.altitude - 10)));
    await snap('1-ground-wide', `the ground at Paranal, 15 July 2026 23:00, the Moon down: the core at alt ${hor.altitude.toFixed(0)}, a 100 degree field`, 9000);
    sr.skyView.setFov(20, { instant: true });
    sr.skyView.lookAtDeg(hor.azimuth, hor.altitude);
    await snap('1-ground-core', 'the same, a 20 degree field on the galaxy\'s centre: the model\'s detail holds where a 2k picture went soft', 7000);
    sr.skyView.exit();
    await sleep(4000);
  } else out.problems.push('no sky view');
} catch (e) { out.problems.push('earth sky: ' + e); }

// ---- 2. leaving the Solar System -----------------------------------------------------------------
try {
  sr.setStage('stellar');
  await sleep(8000);
  const SUN = sr.stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial');
  const gcEq = radec(266.405, -28.936), l90Eq = radec(318.004, 48.330), ngpEq = radec(192.85948, 27.12825);
  const GC = sceneDir(eqToEcl(gcEq)), L90 = sceneDir(eqToEcl(l90Eq)), NGP = sceneDir(eqToEcl(ngpEq));
  const unitLy = LY_KM / sr.stage.unitKm;
  const lookFrom = (P) => { const T = add(SUN, GC, 26000 * unitLy); const off = sub(P, T); const d = Math.hypot(off.x, off.y, off.z); rig.flyTo({ targetScene: T, offset: norm(off), distance: d, ms: 0 }); };
  for (const [ly, why] of [[0.02, 'from beside the Sun'], [1500, '1 500 ly towards l = 90: the near clouds have slid, the band is the same'], [4000, '4 000 ly out: half handed over to the outside model'], [9000, '9 000 ly out: the outside model']]) {
    lookFrom(add(SUN, L90, ly * unitLy));
    await snap(`2-leave-${ly}`, `looking at the galaxy's centre ${why}`, 7000);
  }
  lookFrom(add(SUN, NGP, 3000 * unitLy));
  await snap('2-above-3000', '3 000 ly above the plane, looking at the centre: the band has become the disc below', 7000);
} catch (e) { out.problems.push('leaving: ' + e); }

// ---- 3 to 5. the black holes ---------------------------------------------------------------------
const turnAround = (id, deg) => {
  const r = sr.recordById(id);
  const at = sr.stage.toScene(r.pos, 'sun-inertial');
  const cam = sr.camera.position;
  const off = sub(cam, at);
  const d = Math.hypot(off.x, off.y, off.z);
  const toCam = norm(off);
  const side = norm({ x: toCam.z, y: 0.3, z: -toCam.x });
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: at, offset: norm(add({ x: toCam.x * Math.cos(a), y: toCam.y * Math.cos(a), z: toCam.z * Math.cos(a) }, side, Math.sin(a))), distance: d, ms: 0 });
};
for (const [id, label, turn] of [['exotic-sgr-a-star', 'Sagittarius A*', 75], ['exotic-m87-star', 'M87*', 80], ['exotic-cygnus-x-1', 'Cygnus X-1', 60]]) {
  try {
    const ok = await go(id, null, 11000);
    if (!ok) { out.problems.push(`no record ${id}`); continue; }
    await until(() => sr.portraits && sr.portraits.state().opacity >= 1, 20000);
    const a = await snap(`3-${id.replace('exotic-', '')}-framed`, `${label} as its card frames it`, 3000);
    if (!(a.hole && a.hole.drawn && a.hole.drawn.id)) out.problems.push(`${label} was not drawn`);
    turnAround(id, turn);
    await snap(`3-${id.replace('exotic-', '')}-turned`, `${label} turned ${turn} degrees round it`, 6000);
  } catch (e) { out.problems.push(`${label}: ` + e); }
}
// Sagittarius A* at its true size, from 30 M on the stellar stage
try {
  sr.setStage('stellar');
  await sleep(6000);
  const r = sr.recordById('exotic-sgr-a-star');
  sr.select(r, { fly: false, undo: false });
  await sleep(3000);
  const at = sr.stage.toScene(r.pos, 'sun-inertial');
  const M = 4297000 * 1.4766 / sr.stage.unitKm;
  rig.flyTo({ targetScene: at, offset: norm({ x: 0.2, y: 0.25, z: 1 }), distance: 30 * M, ms: 0 });
  await snap('3-sgr-a-star-30M', 'Sagittarius A* from 30 M (190 million km): drawn at its true size', 6000);
} catch (e) { out.problems.push('Sgr A* close: ' + e); }

out.band = band();
if (!out.band || !out.band.visible && out.scenes.every((s) => !s.band || !s.band.visible)) out.problems.push('the band was never drawn');
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
