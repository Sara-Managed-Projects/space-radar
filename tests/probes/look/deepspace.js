// deepspace: the deep-space baseline (internal spec 0075, stage 0). It photographs, as far as the app
// reaches today, the capture list of the deep-space package of 2026-10-14 (its section 3 and 12):
// Ivan's frame (the Helix in front, the Large Magellanic Cloud and the Tarantula behind it, as in his
// screenshot), the Helix at the app's own framing, closer and turned 45 degrees, the LMC at arrival,
// wide, close and turned, the Tarantula selected and then pulled back to show where it sits in the
// LMC, Andromeda at arrival, turned and close, the Milky Way from outside (above its plane and edge
// on), and the farthest views there are: the Local Group, the Virgo region, a billion light-years,
// the 46.5-billion-light-year shell and the "edge" the climb flies to.
//
// Beside every picture it writes down what the numbers say, because a picture alone does not tell
// a flat card from a volume or one label from two: the stage and its unit, the camera's distance in
// light-years, the selection, how much of each photograph is drawn (scene/nebulae.js drawn()), the
// names on screen with their boxes and how many of them overlap, the card's and the HUD's first
// words, the renderer's counts (draw calls, triangles, textures, geometries, programs) and the
// median and 95th percentile of 20 frame intervals. On a runner the frame times are SwiftShader's:
// they compare one run with another and mean nothing in absolute terms (tools/README.md).
//
// It changes nothing in the app. It fails only when a subject it needs is missing, or a named scene
// has overlapping names (spec 0075 task 5).
// Run it at 1600 x 900 (`-f width=1600 -f height=900`) and again with `-f mobile=true`.
//
// STAGES AND BLOCKS (internal spec 0075, design section 11 and its amendment of 2026-10-14). The
// scenes are GROUPS, each an async function that sets up its own state, and the groups are listed in
// one BLOCK PER STAGE at the end of this file (BLOCKS.a holds the baseline's 01-21 and the foundation's
// own scenes; BLOCKS.b to BLOCKS.f are empty slots). A stage writes its groups into its own GROUPS_<X>
// object, lists them in its own BLOCKS line, adds its POSES rows under its own letter, and edits
// nothing else here. The groups run in block order, a to f.
//
// POSES, the bookmark shortcuts for agents (DS-A09): `-f subject=DS-07` (or a group's name, e.g.
// `-f subject=tarantula`) runs only the groups that pose names. POSES maps the package's DS-01 to
// DS-18 onto the groups; each stage adds its own rows in its block.
//
// Since stage a every scene also waits for `sr.deep.whenReady()` (the photographs and the heroes in
// flight have landed; ?look=1 has frozen the gas's clock) and writes `sr.deep.stats()` beside it.
look.probe = 'deepspace';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const phone = innerWidth < innerHeight;

/** 20 frame intervals: the median and the 95th percentile, in ms. */
const frames = (n = 20, capMs = 60000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    resolve({ frames: gaps.length, medianMs: at(0.5), p95Ms: at(0.95) });
  };
  requestAnimationFrame(step);
});

/** The names on screen, their boxes, and the pairs that overlap (each other or the HUD's tag). */
const labelsNow = () => {
  const host = document.getElementById('labels');
  const boxes = [];
  if (host) {
    for (const el of host.querySelectorAll('.label')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
      const t = el.querySelector('.label__text');
      boxes.push({ text: (t ? t.textContent : el.textContent).trim().slice(0, 60), layer: el.dataset.layer || null, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i], boxes[j])) overlaps.push([boxes[i].text, boxes[j].text]);
  const tagEl = document.querySelector('#sr-hud .sr-tag:not(.is-off)');
  if (tagEl) {
    const r = tagEl.getBoundingClientRect();
    const tag = { x: r.left, y: r.top, w: r.width, h: r.height };
    if (r.width > 0) for (const b of boxes) if (hit(b, tag)) overlaps.push([b.text, 'HUD tag']);
  }
  return { boxes, overlaps };
};
const textOf = (sel, n = 300) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const drawnNow = () => {
  const ids = ['dso-lmc', 'dso-smc', 'dso-tarantula-nebula', 'dso-helix-nebula', 'dso-m31', 'dso-m33'];
  const d = {};
  try { if (sr.nebulae) for (const id of ids) d[id] = Math.round(sr.nebulae.drawn(id) * 100) / 100; } catch (e) { d.error = String(e); }
  return d;
};

/** A picture with its facts: settle, measure, write down, photograph. */
const NAMED = new Set(['04-ivan-frame-helix-selected', '05-ivan-frame', '10-tarantula-selected', '11-tarantula-in-lmc']);
const snap = async (name, note, settleMs = 5000) => {
  await sleep(settleMs);
  const readyAt = Date.now();
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(15000) : null;
  const f = await frames();
  const lab = labelsNow();
  const sel = sr.selected ? sr.selected() : null;
  const unitKm = sr.stage.unitKm;
  const row = {
    name, note,
    stage: sr.stage.worldId, unitKm,
    distanceUnits: rig.state.distance,
    distanceLy: Math.round((rig.state.distance * unitKm / LY_KM) * 100) / 100,
    selected: sel ? sel.id : null,
    drawn: drawnNow(),
    labels: lab.boxes, overlaps: lab.overlaps,
    card: textOf('#sr-card'),
    hud: textOf('#sr-hud', 160),
    cost: frameCost(),
    deep: sr.deep ? sr.deep.stats() : null,
    ready, readyWaitMs: Date.now() - readyAt,
    ...f,
  };
  out.scenes.push(row);
  // Zero overlapping names in Ivan's frame and the Tarantula's scenes (spec 0075 task 5).
  if (NAMED.has(name) && lab.overlaps.length) out.problems.push(`${name}: ${lab.overlaps.length} overlapping names (${JSON.stringify(lab.overlaps)})`);
  await shot(name, `${note} | ${row.stage}, ${row.distanceLy} ly from the target, ${lab.boxes.length} names (${lab.overlaps.length} overlapping), ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms`);
  return row;
};

const pos = (id) => { const r = sr.recordById(id); if (!r) return null; const p = sr.positionOfRecord(r); return p ? { x: p.x, y: p.y, z: p.z } : null; };
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const neg = (a) => ({ x: -a.x, y: -a.y, z: -a.z });
// An equatorial J2000 direction on the ladder's stages: ecliptic J2000, scene = (x, z, -y) (scene/stage.js).
const EPS = 23.4392911 * Math.PI / 180;
const eqToScene = (raDeg, decDeg) => {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
  return unit({ x, y: ze, z: -ye });
};
const turn = (rad) => rig.flyTo({ azimuth: rig.state.azimuth + rad, polar: rig.state.polar, ms: 0 });
const pull = (k) => rig.flyTo({ distance: rig.state.distance * k, ms: 0 });
// As a link does it (main.js openAt): the deep-sky catalogue lands after the first visit, and a
// record whose layer is off is flown to as empty sky, so the layer goes on first.
const need = async (id, waitMs = 9000) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return false; }
  if (r.layer && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
  sr.select(r, { fly: true, undo: false });
  await sleep(waitMs);
  return true;
};

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  out.laterLayers = await until(() => !!sr.recordById('dso-lmc'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); else look.warns.push('no sr.wantDeep: a ref from before spec 0075 stage a'); } catch (e) { look.warns.push('wantDeep: ' + e); }

/** Back to the stellar rung with nothing selected: where every group that is run alone starts. */
const fresh = async () => { sr.deselect(); if (sr.stage.worldId !== 'stellar') await stage('stellar', 9000); };
/** Ivan's frame: the Helix in front, the LMC and the Tarantula behind it, the camera 120 ly from the Helix. */
const ivanFrame = () => {
  const H = pos('dso-helix-nebula'), L = pos('dso-lmc');
  if (!H || !L) { out.problems.push('no position for the Helix or the LMC'); return false; }
  const toL = unit(sub(L, H));
  const side = unit(cross(toL, { x: 0, y: 1, z: 0 }));
  const across = phone ? unit(cross(toL, side)) : side;
  rig.flyTo({ targetScene: H, offset: unit(mix(neg(toL), 1, across, 0.36)), distance: 120 / (sr.stage.unitKm / LY_KM), ms: 0 });
  return true;
};

const GROUPS = {
  // 1. The Helix: the app's own framing, closer, and turned 45 degrees; then Ivan's frame.
  helix: async () => {
    if (!(await need('dso-helix-nebula'))) return;
    await snap('01-helix-arrival', 'the Helix as the app frames it on arrival');
    pull(0.35);
    await snap('02-helix-close', 'the Helix, a third of the arrival distance');
    turn(Math.PI / 4);
    await snap('03-helix-turned45', 'the Helix, close, turned 45 degrees round it');
    if (!ivanFrame()) return;
    await snap('04-ivan-frame-helix-selected', "Ivan's frame: the Helix 120 ly away and selected, the LMC and the Tarantula behind it");
    sr.deselect();
    await snap('05-ivan-frame', "Ivan's frame with nothing selected, as in his screenshot", 3000);
  },
  // 2. (stage a) From Ivan's frame the Tarantula is chosen: the flight goes through the LMC (spec 0075
  //    task 3), photographed on the way. Never a lone dot.
  flight: async () => {
    if (!sr.selected || sr.selected() || !pos('dso-helix-nebula')) { await need('dso-helix-nebula', 6000); sr.deselect(); }
    if (!ivanFrame()) return;
    await sleep(2500);
    const r = sr.recordById('dso-tarantula-nebula');
    if (!r) { out.problems.push('missing record dso-tarantula-nebula'); return; }
    if (r.layer && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
    const t0 = Date.now();
    sr.select(r, { fly: true, undo: false });
    await sleep(1400);
    out.flight = { at1: { ms: Date.now() - t0, ly: Math.round(rig.state.distance * sr.stage.unitKm / LY_KM), flying: !!rig.state.flying } };
    await shot('10f1-flight-through-lmc', 'choosing the Tarantula from Ivan\'s frame: early in the flight');
    await sleep(900);
    out.flight.at2 = { ms: Date.now() - t0, ly: Math.round(rig.state.distance * sr.stage.unitKm / LY_KM), flying: !!rig.state.flying };
    await shot('10f2-flight-lmc-fills', 'the LMC fills the view on the way to the Tarantula');
    await snap('10f3-flight-arrived', 'the flight\'s end: the Tarantula, with its LMC round it', 4000);
  },
  // 3. The LMC: arrival, wide, close, turned.
  lmc: async () => {
    if (!(await need('dso-lmc'))) return;
    await snap('06-lmc-arrival', 'the LMC as the app frames it on arrival');
    const arrival = rig.state.distance;
    pull(4);
    await snap('07-lmc-wide', 'the LMC, four times the arrival distance: the SMC and the Milky Way round it');
    rig.flyTo({ distance: arrival * 0.35, ms: 0 });
    await snap('08-lmc-close', 'the LMC, a third of the arrival distance');
    turn(Math.PI * 50 / 180);
    await snap('09-lmc-turned50', 'the LMC, close, turned 50 degrees round it');
  },
  // 4. The Tarantula selected, then pulled back so the LMC is round it; then (stage a) Back to the LMC.
  tarantula: async () => {
    if (!(await need('dso-tarantula-nebula'))) return;
    await snap('10-tarantula-selected', 'the Tarantula selected: its card, its framing, the LMC behind');
    pull(6);
    await snap('11-tarantula-in-lmc', 'the Tarantula still selected, six times further: where it sits in the LMC');
    const back = document.querySelector('#sr-card .sr-card__parent');
    out.backButton = back ? back.textContent.trim() : null;
    if (back) { back.click(); await snap('11b-back-to-lmc', 'the card\'s "Back to the Large Magellanic Cloud": the LMC selected and flown out to', 7000); }
    else out.problems.push('the Tarantula\'s card has no way back to its LMC');
  },
  // 5. Andromeda: arrival, turned 60 degrees (the photograph gives way to the model), close.
  m31: async () => {
    if (!(await need('dso-m31'))) return;
    await snap('12-m31-arrival', 'Andromeda as the app frames it on arrival');
    turn(Math.PI / 3);
    await snap('13-m31-turned60', 'Andromeda turned 60 degrees round it');
    pull(0.3);
    await snap('14-m31-close', 'Andromeda, turned, a third of the distance');
  },
  // 6. The Milky Way from outside: above the galactic plane, then edge on, 46 kpc out.
  milkyway: async () => {
    try {
      sr.deselect();
      await stage('galaxy', 9000);
      if (await need('dso-milky-way')) {
        const ngp = eqToScene(192.85948, 27.12825);
        const gc = eqToScene(266.40500, -28.93617);
        const kpc = 3.0856775814913673e16 / sr.stage.unitKm;
        rig.flyTo({ offset: unit(mix(ngp, 1, gc, -0.35)), distance: 46 * kpc, ms: 0 });
        await snap('15-milkyway-above', 'the Milky Way from 46 kpc, above its plane (galactic north)');
        rig.flyTo({ offset: unit(cross(ngp, gc)), distance: 46 * kpc, ms: 0 });
        await snap('16-milkyway-edge', 'the Milky Way from 46 kpc, edge on');
      }
    } catch (e) { look.errors.push('probe: the Milky Way step threw: ' + (e && e.stack || e)); }
  },
  // 7. The farthest the app goes: the Local Group, the Virgo region, a billion light-years, the
  //    46.5 Gly shell (scene/shells.js) and the climb's "edge" (scene/handoff.js EDGE_KM).
  far: async () => {
    try {
      sr.deselect();
      await stage('local-group', 9000);
      const mly = (n) => n * 9.4607304725808e18 / sr.stage.unitKm;
      const sun = pos('sun') || { x: 0, y: 0, z: 0 };
      rig.flyTo({ targetScene: sun, distance: mly(5), ms: 0 });
      await snap('17-local-group', 'the Local Group, 5 Mly from the Sun');
      if (await need('dso-m87')) {
        rig.flyTo({ distance: mly(150), ms: 0 });
        await snap('18-virgo-150mly', 'M87 selected, 150 Mly back: the Virgo region and the farthest catalogue galaxies');
      }
      sr.deselect();
      for (const [name, d, note] of [
        ['19-one-gly', 1000, 'a billion light-years from the Sun'],
        ['20-horizon-46gly', 46500, 'at the 46.5 Gly shell'],
        ['21-edge', 1.6e24 / 9.4607304725808e18, "asked for the old edge (169 Gly): the wheel stops at the map's edge, 50 Gly (EDGE_KM since stage e)"],
      ]) {
        rig.flyTo({ targetScene: sun, distance: mly(d), ms: 0 });
        await snap(name, note);
      }
    } catch (e) { look.errors.push('probe: the far step threw: ' + (e && e.stack || e)); }
  },
  // 8. (stage a) DS-01: Alpha Centauri from 4.2 ly, the nearest stars at their magnitudes (task 20 later).
  alphacen: async () => {
    await fresh();
    const sun = pos('sun') || { x: 0, y: 0, z: 0 };
    const ac = eqToScene(219.9, -60.83);
    rig.flyTo({ targetScene: sun, offset: unit(neg(ac)), distance: 0.6 * LY_KM / sr.stage.unitKm, ms: 0 });
    rig.flyTo({ targetScene: { x: sun.x + ac.x * 4.37 * LY_KM / sr.stage.unitKm, y: sun.y + ac.y * 4.37 * LY_KM / sr.stage.unitKm, z: sun.z + ac.z * 4.37 * LY_KM / sr.stage.unitKm }, offset: unit(neg(ac)), distance: 4.2 * LY_KM / sr.stage.unitKm, ms: 0 });
    await snap('22-alpha-centauri', 'DS-01: Alpha Centauri from the Sun\'s side, 4.2 ly (the stars at their magnitudes)');
  },
};

// ================================== THE BLOCKS: one per stage ====================================
// A stage of spec 0075 adds its groups (above, under its own letter in a comment) and its rows here,
// inside its own block, and edits nothing else in this file.
const BLOCKS = {
  // a. the foundation (#786): the baseline's scenes 01-21, the flight through the LMC, Back to the
  //    parent, and DS-01.
  a: ['helix', 'flight', 'lmc', 'tarantula', 'm31', 'milkyway', 'far', 'alphacen'],

  // b. the Helix (#787): its own scenes (a 150 px still, the 30 and 60 degree orbit, near, inside).
  b: [],

  // c. the LMC and the Tarantula (#788): the 45 degree orbit, inside the disc, R136 near.
  c: [],

  // d. Andromeda and galaxy structure (#789): face-on-ish, the edge-on approach, M33.
  d: [],

  // e. cosmic scale (#790): scenes 17-21 again with the local volume, the horizon and the 50 Gly edge.
  e: ['cosmic'],

  // f. the two journeys (#791): one stop per trip, and the trip frame.
  f: [],
};
// Each stage's own groups (async functions, as GROUPS above): one object per stage.
// b. the Helix's groups go in this object.
const GROUPS_B = {};

// c. the LMC's and the Tarantula's groups go in this object.
const GROUPS_C = {};

// d. the galaxies' groups go in this object.
const GROUPS_D = {};

// e. cosmic scale's groups go in this object.
// e. (stage e, #790) Scenes 17-21 of block a are the before and after of the edge itself. These add the
//    local volume seen from aside (its points and its lines of range), TON 618 selected (its card's
//    comoving distance and light-travel time, met on the Local Group's stage from a steady distance),
//    the horizon's near wall from the climb's own "edge" (the control, not a pose), and the wheel held
//    at 50 billion light-years. Each writes the layer's and the shells' state beside its picture.
const GROUPS_E = {
  cosmic: async () => {
    const lyOf = () => Math.round(rig.state.distance * sr.stage.unitKm / LY_KM);
    const cosmicState = () => ({
      lv: sr.deep && sr.deep.stats ? (sr.deep.stats().layers || []) : null,
      shells: sr.shells && sr.shells.state ? sr.shells.state() : null,
      cameraFromSunLy: Math.round(sr.camera.position.length() * sr.stage.unitKm / LY_KM), // the rung's origin is the Sun
    });
    try {
      sr.deselect();
      await stage('local-group', 9000);
      const mly = (n) => n * 9.4607304725808e18 / sr.stage.unitKm;
      const sun = pos('sun') || { x: 0, y: 0, z: 0 };
      // The local volume from 25 Mly, a little above the Sun's line to the Virgo direction, then from aside.
      const virgo = eqToScene(187.7, 12.4);
      rig.flyTo({ targetScene: sun, offset: unit(mix(neg(virgo), 1, { x: 0, y: 1, z: 0 }, 0.6)), distance: mly(25), ms: 0 });
      out.e = { lv25: (await snap('23-local-volume-25mly', 'stage e: the local volume from 25 Mly: 520 measured galaxies as points, 280 inferred ones as fainter grey-blue points')).deep };
      out.e.state25 = cosmicState();
      rig.flyTo({ targetScene: sun, offset: unit(cross(virgo, { x: 0, y: 1, z: 0 })), distance: mly(12), ms: 0 });
      await snap('24-local-volume-aside', 'stage e: the local volume from 12 Mly, across the line of sight: no streaks; a range only for one asked for');
      out.e.stateAside = cosmicState();
      // TON 618: chosen, as a search result is; met on this stage, a thousandth of its distance out.
      const ton = sr.recordById('exotic-ton-618');
      if (ton) {
        if (ton.layer && !sr.isLayerOn(ton.layer)) sr.setLayerOn(ton.layer, true);
        sr.select(ton, { fly: true, undo: false });
        await sleep(8000);
        const row = await snap('25-ton618-selected', 'stage e: TON 618 selected: its card says how far it is now (comoving, Planck 2018) and how long its light took');
        out.e.ton = { stage: row.stage, distanceLy: lyOf(), card: row.card };
        sr.deselect();
      } else out.problems.push('missing record exotic-ton-618');
      // The climb's own edge, as the Stars tab's "The edge of the map" row flies it.
      sr.setStage('local-group');
      rig.flyTo({ targetScene: sun, distance: mly(1000), ms: 0 });
      await sleep(3000);
      const climb = sr.wantClimb ? await sr.wantClimb() : null;
      if (climb) {
        await new Promise((resolve) => { climb.toEdge({ onArrive: resolve }); setTimeout(resolve, 45000); });
        await snap('26-edge-by-the-climb', 'stage e: "The edge of the map": 50 billion light-years, the horizon\'s near wall and the words for the band past it');
        out.e.edge = { distanceLy: lyOf(), state: cosmicState() };
      } else out.problems.push('no climb to fly to the edge');
      // A hand on the wheel cannot pass the edge: ask for 169 Gly, as the old edge was.
      rig.flyTo({ targetScene: sun, distance: mly(169000), ms: 0 });
      await sleep(1500);
      out.e.wheel = { askedLy: 169e9, gotLy: lyOf() };
      if (Math.abs(out.e.wheel.gotLy / 5e10 - 1) > 0.001) out.problems.push(`the wheel was not held at 50 Gly (${out.e.wheel.gotLy} ly)`);
    } catch (e) { look.errors.push('probe: the cosmic step threw: ' + (e && e.stack || e)); }
  },
};

// f. the journeys' groups go in this object.
const GROUPS_F = {};

Object.assign(GROUPS, GROUPS_B, GROUPS_C, GROUPS_D, GROUPS_E, GROUPS_F);
// The package's DS-01 to DS-18 (its section 3) onto the groups; `-f subject=DS-07` runs that pose alone.
// A later stage that owns a pose writes its row under its own letter (a later row for the same DS id wins).
const POSES = {
  // a.
  'DS-01': ['alphacen'], 'DS-02': ['helix'], 'DS-05': ['milkyway'], 'DS-06': ['lmc'], 'DS-07': ['tarantula', 'flight'],
  'DS-08': ['lmc'], 'DS-09': ['m31'], 'DS-10': ['far'], 'DS-11': ['far'], 'DS-12': ['far'], 'DS-17': ['far'], 'DS-18': ['far'],

  // b.

  // c.

  // d.

  // e.
  'DS-10': ['far', 'cosmic'], 'DS-11': ['far', 'cosmic'], 'DS-17': ['far', 'cosmic'], 'DS-18': ['far', 'cosmic'],

  // f.

};

const subject = new URLSearchParams(location.search).get('lookSubject');
const order = [...BLOCKS.a, ...BLOCKS.b, ...BLOCKS.c, ...BLOCKS.d, ...BLOCKS.e, ...BLOCKS.f];
const pick = subject ? (POSES[subject] || (GROUPS[subject] ? [subject] : [])) : order;
if (subject && !pick.length) out.problems.push(`no pose or group called ${subject}: ${Object.keys(POSES).concat(Object.keys(GROUPS)).join(', ')}`);
out.poses = POSES;
out.ran = pick;
for (const g of pick) {
  if (!GROUPS[g]) { out.problems.push('no group ' + g); continue; }
  if (subject) await fresh();
  await GROUPS[g]();
}

if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
