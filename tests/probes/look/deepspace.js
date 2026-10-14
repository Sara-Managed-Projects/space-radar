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
        ['21-edge', 1.6e24 / 9.4607304725808e18, "the climb's edge (EDGE_KM, about 169 Gly)"],
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
  b: ['helixHero'],

  // c. the LMC and the Tarantula (#788): the hero switched on (not shipped until a person signs its
  //    review), a's LMC, Tarantula and flight scenes again with it (their files are replaced), then its
  //    own: the 45 and 75 degree orbits, inside the disc, R136 near, the Tarantula turned, the Measured
  //    look, and the LMC -> Tarantula flight measured frame by frame (no teleport).
  c: ['lmcHeroOn', 'lmc', 'tarantula', 'flight', 'lmcOrbit', 'lmcInside', 'r136', 'lmcFlightFrames', 'lmcHeroOff'],

  // d. Andromeda and galaxy structure (#789): face-on-ish, the edge-on approach, M33.
  d: [],

  // e. cosmic scale (#790): scenes 17-21 again with the local volume, the horizon and the 50 Gly edge.
  e: [],

  // f. the two journeys (#791): one stop per trip, and the trip frame.
  f: [],
};
// Each stage's own groups (async functions, as GROUPS above): one object per stage.
// b. the Helix's groups go in this object.
const GROUPS_B = {
  // The Helix as a hero (stage b, #787), drawn as it will be once its review is signed: the registry
  // says `shipped: false` until a person signs it, so the block forces it (`sr.deep.debug`) and gives
  // the record the two stamps a shipped hero gets (scene/deep/deepsky.js), then takes all three back.
  // Every scene is the same target, so the 30, 45 and 60 degree pictures show the parallax.
  helixHero: async () => {
    if (!(await need('dso-helix-nebula'))) return;
    const id = 'dso-helix-nebula';
    const rec = sr.recordById(id);
    if (!sr.deep || !sr.deep.debug) { out.problems.push('helixHero: no sr.deep.debug'); return; }
    const heroOn = (on) => {
      sr.deep.debug({ force: on });
      if (rec && rec.meta) { if (on) { rec.meta.heroDrawn = ['reconstruction']; rec.meta.heroId = 'helix'; } else { delete rec.meta.heroDrawn; delete rec.meta.heroId; } }
    };
    // The same pose twice: first as the foundation draws it (no hero: the photograph, the glow, the
    // holder), then with the hero. One run is then the stage's before and after.
    const pair = async (name, note) => {
      heroOn(false);
      await shot(`${name}-before`, `BEFORE (the foundation, no hero): ${note}`, 4000);
      heroOn(true);
      return snap(name, note);
    };
    heroOn(true);
    await sleep(3000);
    const toLy = (u) => u * sr.stage.unitKm / LY_KM;
    // The camera distance at which the record's radius is `px` on screen (scene/deep/lodsize.js radiusPx).
    const atPx = async (px) => {
      for (let k = 0; k < 2; k++) {
        const r = sr.deep.radiusPx(id);
        const fov = (sr.camera ? sr.camera.fov : 45) * Math.PI / 180;
        if (!(r > 0) || !Number.isFinite(r)) break;
        const R = rig.state.distance * Math.sin(r / (innerHeight / 2) * fov / 2);
        rig.flyTo({ distance: R / Math.sin(px / (innerHeight / 2) * fov / 2), ms: 0 });
        await sleep(1500);
      }
    };
    const deg = (d) => turn(d * Math.PI / 180);
    const hero = () => { const s = sr.deep.stats(); return (s.heroes || []).find((h) => h.id === 'helix') || null; };
    out.helix = {};
    await atPx(150);
    await snap('b01-helix-150px', 'the Helix at 150 px in radius, on our line of sight: the photograph, the star on it');
    deg(60);
    await pair('b02-helix-150px-turned60', 'the same size, 60 degrees round: the reconstruction (and the point glow\'s last share)');
    out.helix.at150 = hero();
    deg(-60);
    await atPx(300);
    await snap('b03-orbit-00', 'level 3, 300 px: on our line of sight (the photograph)');
    deg(30);
    await pair('b04-orbit-30', 'turned 30 degrees round the same centre: the photograph hands over to the reconstruction');
    deg(15);
    await snap('b05-orbit-45', 'turned 45 degrees: the two rings at their tilts, parallax against the stars behind');
    deg(15);
    await pair('b06-orbit-60', 'turned 60 degrees: the inner disc nearly edge on, the outer ring open');
    out.helix.at300 = hero();
    try { sr.drawn.set('measured'); await snap('b07-measured-60', 'the same, Measured look: no generated grain, nothing moves'); } finally { sr.drawn.set('film'); }
    const expo = sr.exposure ? sr.exposure.mode() : null;
    if (expo) { try { sr.exposure.set('deep'); await snap('b08-deep-exposure-60', 'the same, Deep exposure: the ENHANCED line colours (declared)'); } finally { sr.exposure.set(expo); } }
    if (!phone && sr.quality && sr.quality.setChoice) {
      const before = (sr.quality.describe() || {}).choice || 'auto';
      try { sr.quality.setChoice('low'); await sleep(2000); await snap('b09-low-tier-60', 'the same at Low (tier 0): 4 samples a layer, no noise volume, fewer knots'); out.helix.low = hero(); } finally { sr.quality.setChoice(before); }
    }
    deg(20);
    rig.flyTo({ distance: 2.4 * LY_KM / sr.stage.unitKm, ms: 0 });
    await pair('b10-near', 'near: 2.4 ly from the white dwarf, 80 degrees off our line; the knots on the inner disc\'s rim');
    rig.flyTo({ distance: 0.5 * LY_KM / sr.stage.unitKm, ms: 0 });
    await pair('b11-inside', 'inside the inner disc, 0.5 ly from the white dwarf: the gas round the camera, the knots against it');
    out.helix.inside = hero();
    out.helix.distanceLy = Math.round(toLy(rig.state.distance) * 100) / 100;
    heroOn(false);
    sr.deselect();
  },
};

// c. the LMC's and the Tarantula's groups go in this object.
const lmcHero = () => { try { const st = sr.deep && sr.deep.stats ? sr.deep.stats() : null; return st ? (st.heroes || []).find((h) => h.id === 'lmc') || null : null; } catch (e) { return { error: String(e) }; } };
const camPos = () => { const p = sr.camera.position; return { x: p.x, y: p.y, z: p.z }; };
const GROUPS_C = {
  // The LMC's hero is not shipped (requirement 20: a person signs its review first): draw it anyway.
  lmcHeroOn: async () => {
    if (!sr.deep || !sr.deep.debug) { out.problems.push('no sr.deep.debug: the LMC hero cannot be switched on'); return; }
    sr.deep.debug({ force: true });
    out.lmcHeroForced = true;
  },
  lmcHeroOff: async () => { if (sr.deep && sr.deep.debug) sr.deep.debug({ force: false }); },
  // From the arrival framing round the LMC: 45 degrees (the photograph has faded; the model is whole and
  // its tilt shows), 75 degrees (nearly edge on: the disc's thickness), and close at 45.
  lmcOrbit: async () => {
    if (!(await need('dso-lmc'))) return;
    const arrival = rig.state.distance;
    // The LMC is 5 degrees from the ecliptic's south pole, the rig's axis: turning its azimuth hardly moves
    // the view (scene 09's "turned 50" is nearly scene 08). So the orbit is set by an offset from the Sun line.
    const C = pos('dso-lmc'), S = pos('sun') || { x: 0, y: 0, z: 0 };
    const toSun = unit(sub(S, C));
    const side = unit(cross(toSun, { x: 1, y: 0, z: 0 }));
    const orbit = (deg, d) => { const a = deg * Math.PI / 180; rig.flyTo({ targetScene: C, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: d, ms: 0 }); };
    orbit(45, arrival);
    await snap('c1-lmc-orbit45', 'stage c: the LMC 45 degrees off the line we see it along (the photograph has faded: the model, tilted as measured)');
    out.lmcHero45 = lmcHero();
    orbit(80, arrival);
    await snap('c2-lmc-orbit80', 'stage c: the LMC 80 degrees off our line: nearly edge on, the disc and its thickness');
    orbit(45, arrival * 0.45);
    await snap('c3-lmc-close45', 'stage c: 45 degrees off our line at 0.45 of the arrival distance: stars resolving');
    if (sr.drawn && sr.drawn.set) {
      sr.drawn.set('measured');
      await snap('c4-lmc-measured', 'stage c: the same under the Measured look (no generated dust or clumps)');
      sr.drawn.set('film');
    }
  },
  // Inside the disc: 3 000 ly above its middle near the bar, looking along it.
  lmcInside: async () => {
    if (!(await need('dso-lmc'))) return;
    const L = pos('dso-lmc'), T = pos('dso-tarantula-nebula');
    if (!L || !T) return;
    const k = 1 / (sr.stage.unitKm / LY_KM);
    const toT = unit(sub(T, L));
    const S = pos('sun') || { x: 0, y: 0, z: 0 };
    rig.flyTo({ targetScene: T, offset: unit(mix(neg(toT), 1, unit(sub(L, S)), -0.25)), distance: 9000 * k, ms: 0 });
    await snap('c5-lmc-inside', 'stage c: inside the LMC, 9 000 ly from the Tarantula, looking across the bar to it');
  },
  // R136 near: the Tarantula selected, 600 ly from it, then turned 60 degrees (the cavity in depth).
  r136: async () => {
    if (!(await need('dso-tarantula-nebula'))) return;
    const k = 1 / (sr.stage.unitKm / LY_KM);
    rig.flyTo({ distance: 1500 * k, ms: 0 });
    await snap('c6-tarantula-1500ly', 'stage c: the Tarantula selected, 1 500 ly away: its gas, R136, the LMC round it');
    rig.flyTo({ distance: 600 * k, ms: 0 });
    await snap('c7-r136-near', 'stage c: 600 ly from R136, the heart of the Tarantula');
    const C = pos('dso-tarantula-nebula'), S = pos('sun') || { x: 0, y: 0, z: 0 };
    const toSun = unit(sub(S, C));
    const side = unit(cross(toSun, { x: 1, y: 0, z: 0 }));
    rig.flyTo({ targetScene: C, offset: unit(mix(toSun, 0.5, side, 0.866)), distance: 2500 * k, ms: 0 });
    await snap('c8-tarantula-turned60', 'stage c: the Tarantula 60 degrees off our line, 2 500 ly away: its photograph has faded, the model holds');
    out.lmcHeroR136 = lmcHero();
  },
  // LMC -> Tarantula with no teleport: the camera read on every frame of the flight (no pictures taken
  // during it, which would stall the frames). The flight is camera.js's time-based ease, so how many frames
  // see it depends on the renderer: on a runner's SwiftShader a frame inside the LMC takes about 0.8 s and
  // only 2-4 frames fall in the flight (the first look, 2026-10-15). So what is held here does not depend on
  // the frame rate: the flight is animated (flying on a frame after it starts, and it takes time), the
  // camera only ever comes nearer (no jump out and back), and the LMC is drawn round it on every frame.
  lmcFlightFrames: async () => {
    if (!(await need('dso-lmc'))) return;
    const r = sr.recordById('dso-tarantula-nebula');
    if (!r) return;
    const samples = [];
    sr.select(r, { fly: true, undo: false });
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = () => {
        const st = lmcHero();
        samples.push({ ms: Math.round(performance.now() - t0), cam: camPos(), distance: rig.state.distance, flying: !!rig.state.flying, level: st ? st.level : null });
        if ((!rig.state.flying && performance.now() - t0 > 800) || performance.now() - t0 > 20000) resolve(); else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    let worst = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      const jump = Math.hypot(b.cam.x - a.cam.x, b.cam.y - a.cam.y, b.cam.z - a.cam.z) / Math.max(1e-9, Math.max(a.distance, b.distance));
      if (jump > worst) worst = jump;
    }
    const flying = samples.filter((x) => x.flying).length;
    const heroAll = samples.every((x) => x.level === null || x.level >= 2);
    let nearer = true;
    for (let i = 1; i < samples.length; i++) if (samples[i].distance > samples[i - 1].distance * 1.001) nearer = false;
    const ms = samples.length ? samples[samples.length - 1].ms : 0;
    out.lmcFlight = { frames: samples.length, flyingFrames: flying, ms, worstJumpOverDistance: Math.round(worst * 1000) / 1000, onlyNearer: nearer, lmcDrawnThroughout: heroAll, ly: samples.map((x) => Math.round(x.distance * sr.stage.unitKm / LY_KM)) };
    if (flying < 1 || ms < 500 || !nearer) out.problems.push(`LMC -> Tarantula: not an animated flight that only comes nearer (${flying} frames flying, ${ms} ms, nearer ${nearer}): a teleport`);
    if (!heroAll) out.problems.push('LMC -> Tarantula: the LMC was not drawn on every frame of the flight');
    await snap('c9-flight-arrived', 'stage c: LMC -> Tarantula, arrived: the LMC drawn round it on every frame of the way', 3000);
  },
};

// d. the galaxies' groups go in this object.
const GROUPS_D = {};

// e. cosmic scale's groups go in this object.
const GROUPS_E = {};

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
  'DS-02': ['helix', 'helixHero'],

  // c.
  'DS-06': ['lmcHeroOn', 'lmc', 'lmcOrbit', 'lmcInside'], 'DS-07': ['lmcHeroOn', 'tarantula', 'r136', 'lmcFlightFrames'],

  // d.

  // e.

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
