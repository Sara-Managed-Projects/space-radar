// heroes: the baseline gallery of release 1.2.0 (internal spec 0076, stage W1-e; internal #914, #915).
// Thirteen heroes, each at FAR, MIDDLE (the app's own framing on arrival) and NEAR, then turned 25
// degrees round it at near: the Earth, the International Space Station, the Moon, the Sun, Jupiter,
// Saturn, the Helix, M42, the Large Magellanic Cloud, the Tarantula, Andromeda, the Milky Way from
// outside and the horizon. Then one WebGL context loss and its recovery, on the Earth.
//
// It is every later stage's BEFORE: a stage compares its own scene with this gallery's same scene, at
// the same width, on the same kind of runner (design section 4's budgets are relative to it).
//
// ONE MOMENT, ONE SEED. The clock is put at 2026-10-15 12:00 UTC and paused before the first picture,
// so two runs on one day's saved data photograph the same instant; `?look=1` also freezes the deep sky's
// gas (sr.deep) and seeds the modules that would roll dice (scene/wind.js lookRandom). `-f subject=live`
// leaves the clock live instead; `-f subject=<hero id>` runs that hero alone (ids: HEROES below).
//
// BESIDE EVERY PICTURE (out.json `scenes`, and the summary's table): the object, the stage, the
// distance, the tier, the look (Measured or Film), the exposure, the seed, the clock, the median and
// 95th percentile of up to 60 drawn-frame intervals and of the loop's work per frame, the renderer's
// draw calls, triangles, textures and programs, an estimate of what the scene holds on the GPU and
// what was fetched over the network while the scene was measured (sr.perf, scene/perf.js). On a ref
// without sr.perf the frame times come from requestAnimationFrame and the rest from renderer.info.
// ON A RUNNER THE FRAME TIMES ARE SWIFTSHADER'S: they compare runs, they are not a device's.
//
// It changes nothing in the app but the clock. It fails when a hero it needs is missing, or when the
// context is not given back or the frame after it is black.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'heroes';
const out = { scenes: [], problems: [], contextLoss: null };
const LY_KM = 9.4607304725808e12;
const KPC_KM = 3.0856775814913673e16;
const GLY_KM = 9.4607304725808e21;
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
const subject = new URLSearchParams(location.search).get('lookSubject') || '';
const MEASURE_FRAMES = 60;
const MEASURE_CAP_MS = 12000; // a software frame on a phone-sized canvas is up to a second: fewer frames then, and said
const deg = Math.PI / 180;

// sr.perf: fetched under ?look=1 by main.js's loop (0076 W1-e); asked for here too, in case.
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
out.perf = !!sr.perf;
if (!sr.perf) look.warns.push('probe: no sr.perf on this ref: frame times from requestAnimationFrame, no GPU or network estimate');

if (subject !== 'live') {
  sr.clock.goTo(AT);
  sr.clock.setPaused(true);
}
out.clock = { at: new Date(sr.clock.now()).toISOString(), paused: !!sr.clock.paused, live: subject === 'live' };

/** Up to 60 drawn-frame intervals: sr.perf's window, or requestAnimationFrame's on an older ref. */
const measure = async () => {
  if (sr.perf) {
    sr.perf.mark();
    await until(() => sr.perf.count() >= MEASURE_FRAMES, MEASURE_CAP_MS, 100);
    return sr.perf.stats();
  }
  const r = await new Promise((resolve) => {
    const stamps = [];
    const began = performance.now();
    const step = (t) => {
      stamps.push(t);
      if (stamps.length <= MEASURE_FRAMES && performance.now() - began < MEASURE_CAP_MS) { requestAnimationFrame(step); return; }
      const gaps = [];
      for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
      gaps.sort((a, b) => a - b);
      const q = (x) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(x * gaps.length))] * 10) / 10 : null);
      resolve({ frames: gaps.length, p50Ms: q(0.5), p95Ms: q(0.95), maxMs: q(1) });
    };
    requestAnimationFrame(step);
  });
  let t = null;
  try { t = sr.quality.describe().tier; } catch { /* older */ }
  return { ...r, ...(frameCost() || {}), gpu: null, net: null, tier: t, look: sr.drawn && sr.drawn.mode ? sr.drawn.mode() : null, exposure: sr.exposure && sr.exposure.mode ? sr.exposure.mode() : null, held: sr.latch ? sr.latch.held : null, latched: sr.latch ? sr.latch.latched : null, seed: null, at: new Date(sr.clock.now()).toISOString(), deep: sr.deep && sr.deep.stats ? sr.deep.stats() : null };
};

const onLadder = () => ['stellar', 'galaxy', 'local-group'].includes(sr.stage.worldId);
const distanceWords = () => {
  const km = rig.state.distance * sr.stage.unitKm;
  if (km > 0.05 * GLY_KM) return Math.round(km / GLY_KM * 100) / 100 + ' Gly';
  if (km > 2000 * LY_KM) return Math.round(km / KPC_KM * 10) / 10 + ' kpc';
  if (km > 0.01 * LY_KM) return Math.round(km / LY_KM * 100) / 100 + ' ly';
  return Math.round(km).toLocaleString('en-US') + ' km';
};

/** A picture with its numbers: settle, wait for the deep sky, measure, write down, photograph. */
let n = 0;
let netAt = sr.perf && sr.perf.netTotal ? sr.perf.netTotal() : null;
const scene = async (hero, at, note, settleMs = 3000) => {
  await sleep(settleMs);
  const t0 = Date.now();
  if (onLadder() && sr.deep && sr.deep.whenReady) await sr.deep.whenReady(10000);
  const readyWaitMs = Date.now() - t0;
  const m = await measure();
  n += 1;
  const name = `${String(n).padStart(2, '0')}-${hero}-${at}`;
  const sel = sr.selected ? sr.selected() : null;
  const deep = m.deep ? { calls: m.deep.calls, cpuMs: m.deep.cpuMs, heroes: (m.deep.heroes || []).filter((h) => h.loaded).map((h) => ({ id: h.id, level: h.level, steps: h.steps })), holders: (m.deep.holders || []).filter((h) => h.share > 0).length, pending: m.deep.pending } : null;
  const row = {
    name, object: hero, at, note,
    record: sel ? sel.id : null,
    stage: sr.stage.worldId, unitKm: sr.stage.unitKm, distanceUnits: rig.state.distance, distance: distanceWords(),
    tier: m.tier, look: m.look, exposure: m.exposure, seed: m.seed, held: m.held, latched: m.latched, clock: m.at,
    frames: m.frames, p50Ms: m.p50Ms, p95Ms: m.p95Ms, maxMs: m.maxMs, workP50Ms: m.workP50Ms ?? null, workP95Ms: m.workP95Ms ?? null,
    calls: m.calls, triangles: m.triangles, textures: m.textures, geometries: m.geometries, programs: m.programs,
    gpuMiB: m.gpu ? m.gpu.totalMiB : null, gpuVisibleMiB: m.gpu ? m.gpu.visibleMiB : null, gpu: m.gpu,
    // Fetched since the last picture: the move here, the settle and the measure (sr.perf.netTotal).
    netBytes: netAt !== null ? sr.perf.netTotal() - netAt : null, netInWindow: m.net ? m.net.bytes : null, netRequests: m.net ? m.net.requests : null, netSinceStart: m.net ? m.net.sinceStartBytes : null,
    readyWaitMs, deep,
  };
  out.scenes.push(row);
  if (netAt !== null) netAt = sr.perf.netTotal();
  await shot(name, `${note} | ${row.stage}, ${row.distance}, tier ${row.tier}, ${row.look || '?'}, p50 ${row.p50Ms} ms p95 ${row.p95Ms} ms (${row.frames} frames), ${row.calls} calls, GPU ~${row.gpuMiB ?? '?'} MiB, net ${row.netBytes ?? '?'} B`);
  return row;
};

// Helpers for the worlds: stand on the lit side (the prelude says why), a little above the equator.
const lit = (id, up = 0.3) => (id === 'sun' ? earthSide() : unit(mix(sunward(id), 1, north(id), up)));
const earthSide = () => { const e = sr.worlds.drawnPositionOf('earth'); const s = sr.worlds.drawnPositionOf('sun'); return unit({ x: e.x - s.x, y: e.y - s.y, z: e.z - s.z }); };
const turn25 = () => rig.flyTo({ azimuth: rig.state.azimuth + 25 * deg, polar: rig.state.polar, ms: 0 });
const pos = (id) => { const r = sr.recordById(id); if (!r) return null; const p = sr.positionOfRecord(r); return p ? { x: p.x, y: p.y, z: p.z } : null; };
const EPS = 23.4392911 * deg;
const eqToScene = (raDeg, decDeg) => {
  const ra = raDeg * deg, dec = decDeg * deg;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
  return unit({ x, y: ze, z: -ye });
};
const need = async (id, waitMs = 10000) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return false; }
  if (r.layer && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
  sr.select(r, { fly: true, undo: false });
  await sleep(waitMs);
  return true;
};

/** A world on its own stage: far (three times the arrival), middle (arrival), near (1.6 radii), turned. */
const world = (id, opts = {}) => async () => {
  await stage(id, 9000);
  if (!(await go(id, null, 6000))) { out.problems.push('missing world ' + id); return; }
  if (id === 'sun') await until(() => sr.sunDetail && sr.sunDetail.state().on, 60000);
  const d0 = rig.state.distance;
  const radius = sr.worlds.drawnRadiusUnits ? sr.worlds.drawnRadiusUnits(id) : 0;
  const up = opts.up ?? 0.3;
  rig.flyTo({ offset: lit(id, up), distance: d0 * 3, ms: 0 });
  await scene(id, 'far', `${opts.name}, three times the arrival distance, from its lit side`, 5000);
  rig.flyTo({ offset: lit(id, up), distance: d0, ms: 0 });
  await scene(id, 'middle', `${opts.name} at the app's arrival distance, from its lit side`, 5000);
  rig.flyTo({ offset: lit(id, up), distance: radius > 0 ? radius * (opts.near ?? 1.6) : d0 * 0.4, ms: 0 });
  await scene(id, 'near', `${opts.name}, near: ${opts.near ?? 1.6} radii from its centre`, 6000);
  turn25();
  await scene(id, 'near-turn25', `${opts.name}, near, turned 25 degrees round it`, 4000);
};

/** A record flown to as a click does: far (four times), middle (arrival), near (a third), turned. */
const record = (hero, id, name, k = { far: 4, near: 0.35 }) => async () => {
  if (!(await need(id))) return;
  const d0 = rig.state.distance;
  rig.flyTo({ distance: d0 * k.far, ms: 0 });
  await scene(hero, 'far', `${name}, ${k.far} times the arrival distance`, 5000);
  rig.flyTo({ distance: d0, ms: 0 });
  await scene(hero, 'middle', `${name} as the app frames it on arrival`, 4000);
  rig.flyTo({ distance: d0 * k.near, ms: 0 });
  await scene(hero, 'near', `${name}, ${k.near} of the arrival distance`, 5000);
  turn25();
  await scene(hero, 'near-turn25', `${name}, near, turned 25 degrees round it`, 4000);
};

const HEROES = {
  earth: world('earth', { name: 'the Earth', near: 1.6 }),
  iss: async () => {
    if (sr.stage.worldId !== 'earth') await stage('earth', 9000);
    const id = ['sat-25544', '25544', 'iss'].find((x) => sr.recordById(x));
    if (!id) { out.problems.push('missing record sat-25544 (the ISS)'); look.missing.push('sat-25544'); return; }
    // IN SUNLIGHT (the first run, 2026-10-15: at 12:00 UTC the station was in the Earth's shadow and
    // drawn black, rightly). From the fixed instant, five minutes a step until it is lit, and ten more:
    // the same instant every run. The scenes' clock says where it stopped; the clock goes back after.
    const rec = sr.recordById(id);
    const sunlit = () => {
      const p = sr.positionOfRecord(rec); const e = sr.worlds.meshFor('earth'); const s = sr.worlds.meshFor('sun');
      if (!p || !e || !s) return null;
      const v = { x: p.x - e.position.x, y: p.y - e.position.y, z: p.z - e.position.z };
      const d = unit({ x: s.position.x - e.position.x, y: s.position.y - e.position.y, z: s.position.z - e.position.z });
      const along = v.x * d.x + v.y * d.y + v.z * d.z;
      if (along > 0) return true;
      return Math.hypot(v.x - along * d.x, v.y - along * d.y, v.z - along * d.z) > sr.worlds.drawnRadiusUnits('earth') * 1.01;
    };
    const t0 = sr.clock.now();
    out.issLight = { litAtFirst: sunlit(), movedMinutes: 0 };
    if (out.issLight.litAtFirst === false) {
      for (let k = 1; k <= 20; k++) {
        sr.clock.goTo(t0 + k * 5 * 60e3);
        await sleep(1500);
        if (sunlit()) { out.issLight.movedMinutes = (k + 2) * 5; break; }
      }
      sr.clock.goTo(t0 + out.issLight.movedMinutes * 60e3);
      await sleep(2000);
      out.issLight.lit = sunlit();
      if (!out.issLight.lit) look.warns.push('probe: the ISS was still in the Earth\'s shadow after 100 minutes of stepping');
    }
    try { await record('iss', id, 'the International Space Station' + (out.issLight.movedMinutes ? ` (the clock ${out.issLight.movedMinutes} min on, in sunlight)` : ''), { far: 4, near: 0.4 })(); } finally { sr.clock.goTo(t0); }
  },
  moon: world('moon', { name: 'the Moon', near: 1.5 }),
  sun: world('sun', { name: 'the Sun, its detail on', near: 1.3 }),
  jupiter: world('jupiter', { name: 'Jupiter', near: 1.5 }),
  saturn: world('saturn', { name: 'Saturn and its rings', up: 0.45, near: 2.2 }),
  helix: async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } await record('helix', 'dso-helix-nebula', 'the Helix Nebula')(); },
  m42: async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } await record('m42', 'dso-m42', 'M42, the Orion Nebula')(); },
  lmc: async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } await record('lmc', 'dso-lmc', 'the Large Magellanic Cloud')(); },
  tarantula: async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } await record('tarantula', 'dso-tarantula-nebula', 'the Tarantula Nebula')(); },
  m31: async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } await record('m31', 'dso-m31', 'Andromeda')(); },
  milkyway: async () => {
    sr.deselect();
    await stage('galaxy', 9000);
    if (!(await need('dso-milky-way'))) return;
    const above = unit(mix(eqToScene(192.85948, 27.12825), 1, eqToScene(266.405, -28.93617), -0.35));
    const kpc = KPC_KM / sr.stage.unitKm;
    rig.flyTo({ offset: above, distance: 120 * kpc, ms: 0 });
    await scene('milkyway', 'far', 'the Milky Way from 120 kpc, above its plane (galactic north)', 5000);
    rig.flyTo({ offset: above, distance: 46 * kpc, ms: 0 });
    await scene('milkyway', 'middle', 'the Milky Way from 46 kpc, above its plane', 4000);
    rig.flyTo({ offset: above, distance: 20 * kpc, ms: 0 });
    await scene('milkyway', 'near', 'the Milky Way from 20 kpc, above its plane', 4000);
    turn25();
    await scene('milkyway', 'near-turn25', 'the Milky Way from 20 kpc, turned 25 degrees', 4000);
  },
  horizon: async () => {
    sr.deselect();
    await stage('local-group', 9000);
    const sun = pos('sun') || { x: 0, y: 0, z: 0 };
    const gly = GLY_KM / sr.stage.unitKm;
    rig.flyTo({ targetScene: sun, distance: 60 * gly, ms: 0 });
    await scene('horizon', 'far', 'asked for 60 Gly from the Sun: the farthest the wheel goes (the map\'s edge)', 5000);
    rig.flyTo({ targetScene: sun, distance: 46.5 * gly, ms: 0 });
    await scene('horizon', 'middle', 'at the 46.5 Gly shell, the observable universe\'s horizon', 4000);
    rig.flyTo({ targetScene: sun, distance: 20 * gly, ms: 0 });
    await scene('horizon', 'near', '20 Gly from the Sun: the horizon round us from inside', 4000);
    turn25();
    await scene('horizon', 'near-turn25', '20 Gly, turned 25 degrees', 4000);
  },
};
out.heroes = Object.keys(HEROES);

// The deep sky's records come after the first visit, as for a visitor who climbs.
try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  await until(() => !!sr.recordById('dso-lmc'), 120000);
} catch (e) { look.warns.push('probe: loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('probe: wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('probe: wantDeep: ' + e); }

const pick = subject && subject !== 'live' ? subject.split('_') : Object.keys(HEROES);
for (const h of pick.filter((x) => x !== 'context')) {
  if (!HEROES[h]) { out.problems.push(`no hero ${h}: ${Object.keys(HEROES).join(', ')}`); continue; }
  try { await HEROES[h](); } catch (e) { look.errors.push(`probe: the ${h} step threw: ` + (e && e.stack || e)); }
}

// ONE CONTEXT LOSS (the package's SR-PLAN-151): on the Earth, the context taken away by
// WEBGL_lose_context and given back a second later. The renderer stops drawing while it is gone
// (scene/renderer.js) and redraws after; the frame after must not be black and the clock must be where
// it was. Brightness from a 64 x 36 copy of the frame (scene/renderer.js renderTo).
if (!subject || subject === 'live' || pick.includes('context')) {
  const cl = { lost: false, restored: false };
  try {
    sr.deselect();
    await stage('earth', 9000);
    await go('earth', null, 6000);
    rig.flyTo({ offset: lit('earth'), ms: 0 });
    await sleep(4000);
    const bright = () => {
      try {
        const c = sr.rendererApi.renderTo(64, 36);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        return Math.round(s / (d.length / 4) * 10) / 10;
      } catch (e) { return 'unread: ' + e; }
    };
    cl.before = { brightness: bright(), clock: new Date(sr.clock.now()).toISOString(), textures: (frameCost() || {}).textures };
    await shot(`${String(++n).padStart(2, '0')}-context-before`, 'the Earth before the WebGL context is taken away');
    const gl = sr.renderer.getContext();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) { cl.skipped = 'no WEBGL_lose_context in this browser'; look.warns.push('probe: ' + cl.skipped); }
    else {
      const seen = [];
      const onWebgl = (e) => seen.push(e.detail && e.detail.state);
      addEventListener('sr:webgl', onWebgl);
      ext.loseContext();
      cl.lost = await until(() => seen.includes('lost') || (sr.rendererApi && sr.rendererApi.contextLost), 5000, 50);
      await sleep(1000);
      ext.restoreContext();
      const t0 = Date.now();
      cl.restored = await until(() => seen.includes('restored'), 15000, 50);
      cl.restoredMs = Date.now() - t0;
      removeEventListener('sr:webgl', onWebgl);
      cl.events = seen;
      await sleep(8000); // the maps go up again from their images
      cl.after = { brightness: bright(), clock: new Date(sr.clock.now()).toISOString(), textures: (frameCost() || {}).textures, contextLost: sr.rendererApi ? sr.rendererApi.contextLost : null };
      await shot(`${String(++n).padStart(2, '0')}-context-after`, `the Earth ${Math.round(cl.restoredMs)} ms after the context came back (brightness ${cl.after.brightness} against ${cl.before.brightness} before)`);
      if (!cl.lost) out.problems.push('the context was never reported lost');
      if (!cl.restored) out.problems.push('the context was not given back in 15 s');
      const b0 = Number(cl.before.brightness); const b1 = Number(cl.after.brightness);
      if (Number.isFinite(b0) && Number.isFinite(b1) && b0 > 2 && b1 < b0 * 0.5) out.problems.push(`the frame after the context came back is dark: brightness ${b1} against ${b0}`);
      if (subject !== 'live' && cl.after.clock !== cl.before.clock) out.problems.push(`the paused clock moved across the context loss: ${cl.before.clock} -> ${cl.after.clock}`);
    }
  } catch (e) { look.errors.push('probe: the context-loss step threw: ' + (e && e.stack || e)); }
  out.contextLoss = cl;
}

try { sr.clock.setPaused(false); sr.clock.live(); } catch { /* left as it was */ }
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
