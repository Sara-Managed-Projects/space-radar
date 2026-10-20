// r13-outer: Titan, the rings near and far, the far dwarf planets (release 1.3.0 stage W1-f, internal spec
// 0077; internal #863, #890, #865). Every place where there is a before is photographed twice in one run:
// BEFORE with the stage's work held off for the shot (`sr.worlds.setOuterBefore(true)`: Titan's seas and
// its detached haze, the ring's particles) and AFTER. A ref without the stage has no switch, and every
// place is photographed once (the before).
//
//   Titan, today: its stage as framed; its lit limb from the side, close (the detached layer 500 km up).
//   Titan, at the northern solstice of May 2017 (the seas in full light): the camera where the Sun is
//     mirrored in Kraken Mare (the glint), far and close; the same under the Measured look (no glint);
//     the radar face, whole and over the seas.
//   Saturn's A ring at the same solstice: the rings wide; 20 km, 4 km and 1.5 km over the A ring at
//     130 000 km, looking down and looking along; 3 km over the B ring.
//   The seven far dwarf planets at the app's own framing, and Haumea and Sedna turned; and before them,
//     Haumea and Sedna as main drew them (a copy of the record with another id, so the generic builder).
//
// Beside each picture (out.json `scenes`): what is on (the seas, the glint, the layer, the particles' tiles
// and reach), the camera's height over the ring, draw calls, and the median and 95th percentile of 20 frame
// intervals. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r13-outer';
const out = { scenes: [], problems: [] };
const D2R = Math.PI / 180;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const W = sr.worlds;
const hasSwitch = !!(W && typeof W.setOuterBefore === 'function');
out.hasSwitch = hasSwitch;
const before = (on) => { if (hasSwitch) W.setOuterBefore(on); };

const intervals = async (n = 20, capMs = 8000) => {
  const ts = [];
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = (t) => { ts.push(t); if (ts.length > n || performance.now() - t0 > capMs) resolve(); else requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
  return d.length ? { p50: Math.round(d[Math.floor(d.length * 0.5)]), p95: Math.round(d[Math.min(d.length - 1, Math.floor(d.length * 0.95))]) } : null;
};
const state = () => {
  const s = {};
  try { s.lakes = W.lakes ? W.lakes('titan') : null; } catch { s.lakes = null; }
  try { s.grains = W.ringGrains ? W.ringGrains() : null; } catch { s.grains = null; }
  try { s.face = W.faceOf ? W.faceOf('titan') : null; } catch { s.face = null; }
  return s;
};
/** A picture, its before first when there is a switch. */
const pair = async (name, note, settle = 6000) => {
  if (hasSwitch) {
    before(true);
    await sleep(settle);
    out.scenes.push({ name: name + '-before', note, ...state(), frames: await intervals(), render: frameCost() });
    await shot(name + '-before', 'BEFORE: ' + note);
    before(false);
  }
  await sleep(settle);
  out.scenes.push({ name: name + (hasSwitch ? '-after' : '-before'), note, ...state(), frames: await intervals(), render: frameCost() });
  await shot(name + (hasSwitch ? '-after' : '-before'), (hasSwitch ? 'AFTER: ' : 'BEFORE (no switch on this ref): ') + note);
};
const one = async (name, note, settle = 6000) => {
  await sleep(settle);
  out.scenes.push({ name, note, ...state(), frames: await intervals(), render: frameCost() });
  await shot(name, note);
};
/** A place on a world (east longitude) as a unit vector in the scene, through the mesh's matrix. */
const placeDir = (id, lat, lon) => {
  const m = W.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements;
  const la = lat * D2R; const lo = lon * D2R;
  const v = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
  return unit({ x: e[0] * v.x + e[4] * v.y + e[8] * v.z, y: e[1] * v.x + e[5] * v.y + e[9] * v.z, z: e[2] * v.x + e[6] * v.y + e[10] * v.z });
};
const centre = (id) => { const p = W.meshFor(id).position; return { x: p.x, y: p.y, z: p.z }; };

// ------------------------------------------------------------------------------------- Titan today
try {
  await stage('titan', 12000);
  const T = W.meshFor('titan');
  const R = T.scale.x;
  out.titanR = R;
  await pair('01-titan-stage', 'Titan on its stage as framed: the detached haze is a thread above the limb where it is a pixel or more');
  // The lit limb from the side: the view at right angles to the Sun, the limb toward the Sun in the middle.
  const s = sunward('titan');
  const n = north('titan');
  const w = unit(cross(n, s));
  const P = add(centre('titan'), s, R * 1.15);
  rig.flyTo({ targetScene: P, offset: { x: -w.x, y: -w.y, z: -w.z }, distance: R * 0.9, ms: 0 });
  await pair('02-titan-limb', 'the lit limb from the side, about 1 700 km across: the main haze, a dark gap, the detached layer 500 km up');
  rig.flyTo({ targetScene: P, offset: { x: -w.x, y: -w.y, z: -w.z }, distance: R * 0.35, ms: 0 });
  await pair('03-titan-limb-close', 'closer on the same limb (about 650 km across): the layer a crisp thread, no bands');
} catch (e) { out.problems.push('titan today: ' + e); }

// --------------------------------------------------------------- Titan at the 2017 northern solstice
try {
  sr.clock.goTo(Date.UTC(2017, 4, 24, 12));
  await sleep(4000);
  // Kraken Mare (68 N, 310 W = 50 E) as near local noon as Titan's 16-day turn allows: scan one day.
  const KRAKEN = { lat: 68, lon: 50 };
  let best = { t: sr.clock.now(), sun: -2 };
  const t0 = Date.UTC(2017, 4, 24, 12);
  for (let k = 0; k < 16; k++) {
    sr.clock.goTo(t0 + k * 86400e3);
    await sleep(700);
    const lit = dot(placeDir('titan', KRAKEN.lat, KRAKEN.lon), sunward('titan'));
    if (lit > best.sun) best = { t: t0 + k * 86400e3, sun: lit };
  }
  sr.clock.goTo(best.t);
  sr.clock.setPaused && sr.clock.setPaused(true);
  await sleep(3000);
  out.kraken = { at: new Date(best.t).toISOString(), sunElevationDeg: Math.asin(Math.max(-1, Math.min(1, best.sun))) / D2R };
  const T = W.meshFor('titan');
  const R = T.scale.x;
  const nK = placeDir('titan', KRAKEN.lat, KRAKEN.lon);
  const sK = sunward('titan');
  // Where a flat sea at Kraken mirrors the Sun: the reflection of the Sun's direction about the ground's normal.
  const mirror = unit(add({ x: -sK.x, y: -sK.y, z: -sK.z }, nK, 2 * dot(nK, sK)));
  const PK = add(centre('titan'), nK, R);
  // Far: the whole disc, from the mirror direction, the seas wanted (the disc large enough to fetch them).
  rig.flyTo({ targetScene: centre('titan'), offset: add(mirror, nK, 0.0), distance: R * 3.2, ms: 0 });
  await until(() => W.lakes && W.lakes('titan').worn, 30000);
  rig.flyTo({ targetScene: PK, offset: mirror, distance: R * 2.6, ms: 0 });
  await pair('04-titan-glint-far', 'the northern summer of 2017, the camera where the Sun is mirrored in Kraken Mare (sun ' + out.kraken.sunElevationDeg.toFixed(0) + ' degrees up there): the seas darker on their radar outlines, the glint on Kraken');
  rig.flyTo({ targetScene: PK, offset: mirror, distance: R * 0.8, ms: 0 });
  await pair('05-titan-glint-close', 'the same, closer: the glint inside the sea\'s outline, its edge soft, the shore crisp');
  // Off the mirror by 25 degrees: the seas dark, no glint.
  const side = unit(cross(nK, mirror));
  rig.flyTo({ targetScene: PK, offset: unit(add(mirror, side, 0.47)), distance: R * 0.8, ms: 0 });
  await pair('06-titan-seas-off-mirror', '25 degrees off the mirror: the seas dark, the glint gone');
  if (sr.drawn && sr.drawn.set) {
    rig.flyTo({ targetScene: PK, offset: mirror, distance: R * 0.8, ms: 0 });
    try {
      sr.drawn.set('measured');
      await one('07-titan-glint-measured', 'the Measured look at the mirror: the seas\' outlines stay, the glint is illustrative and is not drawn');
    } finally { sr.drawn.set('film'); }
  }
  // The radar face.
  if (W.setFace && W.facesOf && W.facesOf('titan').includes('radar')) {
    const okFace = await until(() => W.setFace('titan', 'radar') === true, 45000);
    out.radarFace = okFace;
    rig.flyTo({ targetScene: centre('titan'), offset: add(sunward('titan'), north('titan'), 0.5), distance: R * 3.4, ms: 0 });
    await one('08-titan-radar-whole', 'the radar face from the lit side: grey strips where Cassini\'s radar looked, the infrared map in dim orange between them');
    rig.flyTo({ targetScene: PK, offset: add(sunward('titan'), nK, 1.2), distance: R * 0.9, ms: 0 });
    await one('09-titan-radar-seas', 'the radar face over the northern seas: Kraken and Ligeia black, the shores crisp, no glint');
    W.setFace('titan', null);
  } else out.problems.push('Titan has no radar face on this ref');
  sr.clock.setPaused && sr.clock.setPaused(false);
} catch (e) { out.problems.push('titan 2017: ' + e); }

// ------------------------------------------------------------------------ Saturn's rings, near and far
try {
  sr.clock.goTo(Date.UTC(2017, 4, 24, 12));
  await stage('saturn', 12000);
  const S = 'saturn';
  const mesh = W.meshFor(S);
  const R = mesh.scale.x;
  const RKM = 58232;
  const n = north(S); const s = sunward(S);
  const sideSign = dot(n, s) >= 0 ? 1 : -1;
  const e = unit(mix(s, 1, n, -dot(n, s)));
  const lit = mix(n, sideSign, n, 0);
  const overRing = (km, heightKm, lean) => {
    const c = centre(S);
    const p = add(c, e, (km / RKM) * R);
    rig.flyTo({ targetScene: p, offset: mix(lit, 1, e, lean), distance: (heightKm / RKM) * R * Math.hypot(1, lean), ms: 0 });
  };
  rig.flyTo({ targetScene: centre(S), offset: mix(e, 1, lit, 0.45), distance: R * 3.4, ms: 0 });
  await one('10-rings-wide', 'the rings far: the sheet with its measured optical depth, 2017 solstice light');
  overRing(130000, 20, 0.6);
  await pair('11-a-ring-20km', '20 km over the A ring at 130 000 km, looking down at 60 degrees: a 5 m ball is under a pixel at 20 km, so little changes here', 8000);
  overRing(130000, 4, 0.6);
  await pair('12-a-ring-4km', '4 km over the A ring: the biggest balls come out of the sheet as points; the A ring\'s wake clumps', 8000);
  overRing(130000, 1.5, 0.4);
  await pair('13-a-ring-1500m', '1.5 km over the A ring, looking down: balls of ice of 2 to 5 m, lit from the Sun\'s side, crisp edges; the sheet under them', 8000);
  overRing(130000, 1.5, 2.2);
  await pair('14-a-ring-1500m-along', '1.5 km over the A ring, looking along it: the field thins into the sheet toward the horizon, no hard edge', 8000);
  overRing(105000, 3, 0.6);
  await pair('15-b-ring-3km', '3 km over the B ring at 105 000 km: denser, no wakes', 8000);
  out.grainsAt = W.ringGrains ? W.ringGrains() : null;
  sr.clock.live && sr.clock.live();
} catch (e) { out.problems.push('saturn: ' + e); }

// ------------------------------------------------------------------------------- the far dwarf planets
const DWARFS = ['dwarf-eris', 'dwarf-haumea', 'dwarf-makemake', 'dwarf-sedna', 'dwarf-gonggong', 'dwarf-quaoar', 'dwarf-orcus'];
const turn = async (name, note) => {
  const t = rig.state.target;
  const sun = W.meshFor('sun').position;
  const toSun = unit(sub({ x: sun.x, y: sun.y, z: sun.z }, { x: t.x, y: t.y, z: t.z }));
  rig.flyTo({ offset: mix(toSun, 1, { x: 0, y: 1, z: 0 }, 0.5), distance: rig.state.distance * 0.8, ms: 0 });
  await one(name, note, 5000);
};
try {
  sr.setStage && sr.setStage('earth');
  await sleep(8000);
  // The before: main's generic rock, through a copy of the record the dwarf table does not name.
  for (const id of ['dwarf-haumea', 'dwarf-sedna']) {
    const r = sr.recordById(id);
    if (!r) { look.missing.push(id); continue; }
    try {
      sr.select({ ...r, id: id + '-as-main', meta: { ...r.meta } }, { fly: true, undo: false });
      await one('20-' + id + '-before', 'BEFORE: ' + r.name + ' as main draws it, the generic asteroid of its size in the class colour', 9000);
    } catch (e) { out.problems.push('before ' + id + ': ' + e); }
  }
  for (const [i, id] of DWARFS.entries()) {
    const ok = await go(id, null, 9000);
    if (!ok) continue;
    out.scenes.push({ name: id, frames: await intervals(), render: frameCost() });
    await shot((21 + i) + '-' + id, 'AFTER: ' + id.slice(6) + ' at the app\'s own framing, in its measured colour');
    if (id === 'dwarf-haumea' || id === 'dwarf-sedna') await turn((21 + i) + '-' + id + '-turned', id.slice(6) + ' from the lit side, a little above: ' + (id === 'dwarf-haumea' ? 'the egg and its ring' : 'a smooth red ball, no surface drawn'));
  }
} catch (e) { out.problems.push('dwarfs: ' + e); }

if (hasSwitch && sr.quality && sr.quality.bootTier >= 1 && !out.scenes.some((x) => x.grains && x.grains.on)) out.fail = 'the ring particles never came on: ' + JSON.stringify(out.grainsAt);
return finish(out);
