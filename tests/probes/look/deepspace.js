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
  b: ['helixHero'],

  // c. the LMC and the Tarantula (#788): the hero switched on (not shipped until a person signs its
  //    review), a's LMC, Tarantula and flight scenes again with it (their files are replaced), then its
  //    own: the 45 and 75 degree orbits, inside the disc, R136 near, the Tarantula turned, the Measured
  //    look, and the LMC -> Tarantula flight measured frame by frame (no teleport).
  c: ['lmcHeroOn', 'lmc', 'tarantula', 'flight', 'lmcOrbit', 'lmcInside', 'r136', 'lmcFlightFrames', 'lmcHeroOff'],

  // d. Andromeda and galaxy structure (#789): face-on-ish, the edge-on approach, M33.
  d: ['galaxies'],

  // e. cosmic scale (#790): scenes 17-21 again with the local volume, the horizon and the 50 Gly edge.
  e: ['cosmic'],

  // f. the two journeys (#791): every stop of both trips with the trip frame, the orbit's two ends,
  //    the flight home, and one stop under reduced motion.
  f: ['helixTrip', 'lmcTrip', 'tripReduced'],
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
    // Selected again, so the card is written with the stamps (a shipped hero's are there before any card).
    sr.select(rec, { fly: false, undo: false });
    await sleep(3000);
    const toLy = (u) => u * sr.stage.unitKm / LY_KM;
    // The camera distance at which the record's radius is `px` on screen (scene/deep/lodsize.js radiusPx).
    const atPx = async (px) => {
      for (let k = 0; k < 2; k++) {
        const r = sr.deep.radiusPx(id);
        const fov = (sr.camera ? sr.camera.fov : 45) * Math.PI / 180;
        if (!(r > 0) || !Number.isFinite(r)) break;
        const R = rig.state.distance * Math.sin(r / (innerHeight / 2) * fov / 2);
        // With the camera's own side kept: a flight by distance alone puts back the rig's last azimuth,
        // which after an `offset` flight is another side (the look of 2026-10-15 stood 146° off the line).
        const H = pos(id), c = sr.camera.position;
        rig.flyTo({ targetScene: H, offset: unit(sub({ x: c.x, y: c.y, z: c.z }, H)), distance: R / Math.sin(px / (innerHeight / 2) * fov / 2), ms: 0 });
        await sleep(1500);
      }
    };
    const deg = (d) => turn(d * Math.PI / 180);
    const hero = () => { const s = sr.deep.stats(); return (s.heroes || []).find((h) => h.id === 'helix') || null; };
    // On our line of sight: from the Helix toward the Sun, where its photograph was taken from.
    const onLine = () => { const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 }; if (H) rig.flyTo({ targetScene: H, offset: unit(sub(S, H)), distance: rig.state.distance, ms: 0 }); };
    // Where the camera is against the line the photograph was taken along, and what the photograph does.
    const lineOf = () => {
      const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 }, c = sr.camera.position;
      const a = unit(sub(c, H)), b = unit(sub(S, H));
      const deg = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z))) * 180 / Math.PI;
      let loaded = null; try { loaded = sr.nebulae && sr.nebulae.loaded ? sr.nebulae.loaded().includes(id) : null; } catch { /* older */ }
      return { offLineDeg: Math.round(deg * 10) / 10, ly: Math.round(toLy(rig.state.distance) * 100) / 100, photoLoaded: loaded, photoDrawn: sr.nebulae ? Math.round(sr.nebulae.drawn(id) * 100) / 100 : null, sunFound: !!pos('sun') };
    };
    out.helix = { lines: {} };
    onLine();
    await sleep(1500);
    out.helix.lines.arrival = lineOf();
    await snap('b00-on-line', 'on our line of sight at the app\'s own distance, the hero on: the photograph is drawn and the gas gives way to it');
    await atPx(150);
    out.helix.lines.at150 = lineOf();
    await snap('b01-helix-150px', 'the Helix at 150 px in radius, on our line of sight: the photograph, the star on it');
    deg(60);
    await pair('b02-helix-150px-turned60', 'the same size, 60 degrees round: the reconstruction (and the point glow\'s last share)');
    out.helix.at150 = hero();
    onLine();
    await sleep(1000);
    await atPx(300);
    out.helix.lines.at300 = lineOf();
    await snap('b03-orbit-00', 'level 3, 300 px: on our line of sight (the photograph)');
    out.helix.lines.b03 = lineOf();
    deg(30);
    await pair('b04-orbit-30', 'turned 30 degrees round the same centre: the photograph hands over to the reconstruction');
    out.helix.lines.b04 = lineOf();
    deg(15);
    await snap('b05-orbit-45', 'turned 45 degrees: the two rings at their tilts, parallax against the stars behind');
    out.helix.lines.b05 = lineOf();
    deg(15);
    await pair('b06-orbit-60', 'turned 60 degrees: the inner disc nearly edge on, the outer ring open');
    out.helix.lines.b06 = lineOf();
    out.helix.at300 = hero();
    try { sr.drawn.set('measured'); await snap('b07-measured-60', 'the same, Measured look: no generated grain, nothing moves'); } finally { sr.drawn.set('film'); }
    const expo = sr.exposure ? sr.exposure.mode() : null;
    if (expo) { try { sr.exposure.set('deep'); await snap('b08-deep-exposure-60', 'the same, Deep exposure: the ENHANCED line colours (declared)'); } finally { sr.exposure.set(expo); } }
    // T0 (4 samples a layer, no noise volume, 600 knots) is the 390 x 844 run's: a phone is tier 0.
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
// Andromeda from her own model (scene/deep/spiral.js): below the hero's threshold (galaxy.js's far copy),
// half way through the photograph's hand-over, face-on-ish, edge on far and near, then M33. Each scene
// writes how much the photograph, the hero and the far copy draw, and Andromeda's radius on screen.
const andromedaNow = () => {
  const far = sr.galaxy && sr.galaxy.andromeda ? sr.galaxy.andromeda() : null;
  const st = sr.deep ? sr.deep.stats() : null;
  const hero = st ? st.heroes.find((h) => h.id === 'm31') : null;
  const m33 = st ? st.heroes.find((h) => h.id === 'm33') : null;
  return { far, hero, m33, rPx: sr.deep ? sr.deep.radiusPx('dso-m31') : null, rPxM33: sr.deep ? sr.deep.radiusPx('dso-m33') : null };
};
const discAxesScene = () => {
  const node = sr.galaxy && sr.galaxy.group ? sr.galaxy.group.children.find((c) => c.name === 'galaxy:andromeda') : null;
  if (!node) return null;
  node.updateMatrixWorld();
  const e = node.matrixWorld.elements;
  return { major: unit({ x: e[0], y: e[1], z: e[2] }), across: unit({ x: e[4], y: e[5], z: e[6] }), normal: unit({ x: e[8], y: e[9], z: e[10] }) };
};
const snapD = async (name, note, settle) => { const row = await snap(name, note, settle); row.andromeda = andromedaNow(); return row; };
const GROUPS_D = {
  galaxies: async () => {
    if (!(await need('dso-m31'))) return;
    const ly = (n) => n * LY_KM / sr.stage.unitKm;
    if (sr.galaxy && sr.galaxy.andromedaReady) await sr.galaxy.andromedaReady();
    const arrival = rig.state.distance;
    const M = pos('dso-m31'), sun = pos('sun') || { x: 0, y: 0, z: 0 };
    const home = unit(sub(sun, M));                       // from her toward the Sun: our line of sight
    const side = unit(cross(home, { x: 0, y: 1, z: 0 }));
    const off = (deg) => unit(mix(home, Math.cos(deg * Math.PI / 180), side, Math.sin(deg * Math.PI / 180)));
    // 1. Off her line and small: the far copy (below the hero's 180 px), her true size at 1.2 Mly.
    rig.flyTo({ offset: off(90), distance: ly(1200000), ms: 0 });
    await snapD('d1-m31-small-turned90', 'Andromeda 1.2 Mly away, 90 degrees off our line: the far copy of her own model, at her true size');
    // 2. On our line, close enough that her photograph is half way through handing over to the model.
    rig.flyTo({ offset: home, distance: ly(34000), ms: 0 });
    await snapD('d2-m31-crossover', 'on our line, 34 000 ly from her centre: the photograph half faded, the model taking the rest');
    rig.flyTo({ offset: off(35), distance: arrival, ms: 0 });
    await snapD('d3-m31-turned35', 'Andromeda 35 degrees off our line: photograph and model sharing her, the same pose');
    const ax = discAxesScene();
    if (ax) {
      // 4. Face-on-ish: 20 degrees from her axis, at the arrival distance.
      rig.flyTo({ offset: unit(mix(ax.normal, Math.cos(20 * Math.PI / 180), ax.major, Math.sin(20 * Math.PI / 180))), distance: arrival, ms: 0 });
      await snapD('d4-m31-faceonish', 'Andromeda 20 degrees from face on (nobody has seen her so): bulge, ring, arms and dust');
      // 5. Edge on, then closer along the same line: the dust line across the bulge.
      rig.flyTo({ offset: ax.across, distance: arrival, ms: 0 });
      await snapD('d5-m31-edgeon', 'Andromeda exactly edge on: the dust line through the bulge');
      rig.flyTo({ offset: unit(mix(ax.across, 1, ax.normal, 0.12)), distance: ly(90000), ms: 0 });
      await snapD('d6-m31-edgeon-near', 'the edge-on approach, 90 000 ly from her centre, a little above the plane');
    } else out.problems.push('no far copy of Andromeda (scene/galaxy.js) to read her axes from');
    // 7. M33: arrival (the photograph), turned 60 degrees (the model), close.
    if (!(await need('dso-m33'))) return;
    await snapD('d7-m33-arrival', 'the Triangulum Galaxy as the app frames it on arrival (its photograph)');
    turn(Math.PI / 3);
    await snapD('d8-m33-turned60', 'M33 turned 60 degrees: the model, looser and more face on than Andromeda');
    pull(0.35);
    await snapD('d9-m33-close', 'M33, turned, a third of the distance: flocculent arms, H II regions, NGC 604');
  },
};

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

// f. the journeys' groups go in this object. A trip is walked as a visitor's would run, through
// sr.trip (ui/trip.js): start (the intro sheet), each stop by jumpTo and play, paused on arrival for
// the picture; a stop with a drift is photographed again when its orbit is done, so the two pictures
// show the parallax; then Next on the last stop, which is the flight home, and the end card. Beside
// each picture: the camera's distance against the stop's own, the card's words, Leave on screen.
// On the desktop run the share and card frames of two stops per trip are kept (`out.tripFrames`, the
// form tools/trip-frames.probe.js returns), for scripts/build_trip_og.py and build_trip_thumbs.py.
const TRIP_FRAME_STOPS = { 'into-the-helix': ['photograph', 'shape'], 'inside-a-neighbouring-galaxy': ['model', 'tarantula', 'depart'] };
const tripRows = {};
const tripNow = () => sr.trip.state;
/** The turn between two azimuths, in degrees, the short way round. */
const turnedDeg = (a, b) => { const d = (((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return Math.round(Math.abs(d) * 1800 / Math.PI) / 10; };
const tripArrive = async (index, capMs = 60000) => {
  const t0 = Date.now();
  const seen = [];
  const ok = await until(() => {
    const st = tripNow();
    if (st.phase === 'flight' && Date.now() - t0 > 20000 && rig.finishFlight) rig.finishFlight();
    const at = `${st.phase}@${st.index}`;
    if (seen[seen.length - 1] !== at) seen.push(at);
    return (st.phase === 'settle' || st.phase === 'dwell' || st.phase === 'held') && st.index === index;
  }, capMs, 100);
  return { ok, ms: Date.now() - t0, seen };
};
const tripFrame = (w, h) => {
  const cam = sr.camera;
  const v = cam.view && cam.view.enabled ? { ...cam.view } : null;
  if (v) cam.clearViewOffset();
  try { const c = sr.rendererApi.renderTo(w, h); return c ? c.toDataURL('image/png') : null; } catch (e) { return 'error: ' + e; } finally {
    if (v) cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    cam.updateProjectionMatrix();
  }
};
const walkTrip = async (id, tag) => {
  const row = { id, stops: [], problems: [] };
  tripRows[id] = row;
  const plan = await sr.trip.start(id);
  if (!plan || plan.offerable === false) { out.problems.push(`${id}: cannot run (${plan && plan.reason})`); return row; }
  if (!(await until(() => tripNow().phase === 'intro', 30000))) { out.problems.push(`${id}: no intro`); return row; }
  await until(() => { const t = sr.trip.tours().find((x) => x.id === id); return t && Array.isArray(t.stops); }, 15000);
  const tour = sr.trip.tours().find((x) => x.id === id);
  row.count = plan.count; row.estimateMs = tripNow().estimateMs; row.pacing = tripNow().pacing; row.dropped = (plan.dropped || []).map((d) => d.id);
  await shot(`${tag}-0-intro`, `${id}: the intro sheet (title, blurb, the stops and the length, Start and Leave)`, 2500);
  const stops = tour.stops.filter((st) => !row.dropped.includes(st.id));
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i];
    sr.trip.jumpTo(i);
    if (i === 0) sr.trip.play();
    const arrived = await tripArrive(i);
    if (!arrived.ok) { out.problems.push(`${id}/${stop.id}: never arrived (${arrived.seen.join(' ')})`); continue; }
    const az0 = rig.state.azimuth;
    sr.trip.pause('probe');
    const wantLy = stop.distance_km / LY_KM;
    const name = `${tag}-${i + 1}-${stop.id}`;
    const r = await snap(name, `${id} stop ${i + 1}/${stops.length} "${stop.card.title}": the camera ${Math.round(wantLy * 10) / 10} ly from ${stop.target.record}, ${stop.key_light_deg} degrees off our line`, 4500);
    const leave = document.querySelector('.sr-trip__leave');
    const st = { id: stop.id, arriveMs: arrived.ms, wantLy, gotLy: r.distanceLy, card: r.card, chapter: textOf('.sr-trip__chapter', 60), title: textOf('.sr-trip__title', 80), leave: !!(leave && leave.offsetParent), phase: tripNow().phase };
    // No false distance: the camera is where the stop says (the rig never pushed it out), and the card's
    // own distance is the record's (the HUD and the card print it; written down for the reader).
    if (!(Math.abs(r.distanceLy - wantLy) <= Math.max(0.02, wantLy * 0.05))) out.problems.push(`${id}/${stop.id}: the camera is ${r.distanceLy} ly from the target, the stop says ${wantLy}`);
    if (!st.leave) out.problems.push(`${id}/${stop.id}: no Leave on screen`);
    if (stop.drift !== 'none' && stop.drift_deg >= 15) {
      // The orbit. It runs on the frame clock, and a software renderer draws one frame a second at the
      // hero's close stops, so the drift's whole arc does not fit a probe: it is let run for four seconds
      // (its rate and direction written down), then the camera is put where the arc ends, at the same
      // distance and height, as the trip would have it; the next stop flies from there, as it would.
      sr.trip.resume();
      await sleep(4000);
      sr.trip.pause('probe');
      const ran = turnedDeg(az0, rig.state.azimuth);
      const d = (((rig.state.azimuth - az0) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      st.orbitRanDeg = ran;
      st.orbitSign = d < 0 ? -1 : 1;
      if (!(ran > 0.05)) out.problems.push(`${id}/${stop.id}: the drift did not run (${ran} degrees in 4 s)`);
      rig.flyTo({ azimuth: az0 + st.orbitSign * stop.drift_deg * Math.PI / 180, polar: rig.state.polar, distance: rig.state.distance, ms: 0 });
      st.orbitDeg = turnedDeg(az0, rig.state.azimuth);
      await snap(`${name}-orbit`, `${id} "${stop.card.title}" at the end of its ${stop.drift_deg} degree orbit (ran ${ran} degrees in 4 s on this renderer; the end pose set)`, 2500);
    }
    // The share and card frames, at the stop's last pose (after its orbit, where it has one).
    if ((TRIP_FRAME_STOPS[id] || []).includes(stop.id) && !phone) {
      (out.tripFrames = out.tripFrames || []).push({ trip: id, stop: stop.id, number: tour.stops.indexOf(stop) + 1, zoom: 1, og: tripFrame(1200, 504), png: tripFrame(960, 720) });
    }
    row.stops.push(st);
  }
  // The last stop's dwell runs out: the flight home (`return: true`, ui/trip.js advance -> flyHome),
  // photographed on the way, then the end card. (Next on the last stop ends the trip where it is.)
  const t0 = Date.now();
  sr.trip.resume();
  row.returning = await until(() => tripNow().returning === true || tripNow().phase === 'outro', 60000, 100);
  row.returnedAfterMs = Date.now() - t0;
  await sleep(4000);
  await shot(`${tag}-${stops.length + 1}-home-flight`, `${id}: the last stop's dwell over, the flight home down the ladder (returning ${tripNow().returning}, on ${sr.stage.worldId}, ${Math.round(rig.state.distance * sr.stage.unitKm / LY_KM * 100) / 100} ly from its aim)`);
  const ended = await until(() => tripNow().phase === 'outro', 120000);
  row.homeMs = Date.now() - t0;
  await shot(`${tag}-${stops.length + 2}-end`, `${id}: the end card (${ended ? 'reached' : 'NOT reached'} ${Math.round(row.homeMs / 1000)} s after the last dwell resumed, on ${sr.stage.worldId})`, 2500);
  if (!ended) out.problems.push(`${id}: the end card never came`);
  if (sr.stage.worldId !== 'earth') out.problems.push(`${id}: the flight home ended on ${sr.stage.worldId}, not the Earth`);
  sr.trip.stop('leave');
  await sleep(3000);
  return row;
};
const GROUPS_F = {
  helixTrip: async () => { try { await fresh(); await walkTrip('into-the-helix', 'f1-helix'); } catch (e) { look.errors.push('probe: the Helix trip threw: ' + (e && e.stack || e)); } },
  lmcTrip: async () => { try { await fresh(); await walkTrip('inside-a-neighbouring-galaxy', 'f2-lmc'); } catch (e) { look.errors.push('probe: the LMC trip threw: ' + (e && e.stack || e)); } },
  // Reduced motion, as the browser would report it: the trip forces reader pacing, the flight is a cut
  // (the rig never says it is flying), and the drift is refused (the azimuth does not move in 4 s).
  tripReduced: async () => {
    const real = window.matchMedia;
    const Q = '(prefers-reduced-motion: reduce)';
    try {
      await fresh();
      window.matchMedia = (q) => (String(q).replace(/\s+/g, ' ').trim() === Q
        ? { matches: true, media: Q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }
        : real.call(window, q));
      await sr.trip.start('into-the-helix');
      await until(() => tripNow().phase === 'intro', 30000);
      const rm = { pacing: tripNow().pacing, reducedMotion: tripNow().reducedMotion, flewAtAll: false };
      sr.trip.jumpTo(1);
      sr.trip.play();
      const t0 = Date.now();
      while (Date.now() - t0 < 1500) { if (rig.state.flying) rm.flewAtAll = true; await sleep(50); }
      const arrived = await tripArrive(1, 20000);
      rm.arriveMs = arrived.ms;
      const az = rig.state.azimuth;
      await sleep(4000);
      rm.turnedDeg = turnedDeg(az, rig.state.azimuth);
      rm.phase = tripNow().phase; rm.index = tripNow().index;
      out.tripReduced = rm;
      await snap('f3-reduced-motion-shape', `reduced motion: "Into the Helix" stop 2 reached by a cut (pacing ${rm.pacing}, flew ${rm.flewAtAll}, turned ${rm.turnedDeg} deg in 4 s)`, 500);
      if (rm.pacing !== 'reader' || rm.flewAtAll || rm.turnedDeg > 0.5) out.problems.push('reduced motion not obeyed by the journey: ' + JSON.stringify(rm));
    } catch (e) { look.errors.push('probe: the reduced-motion trip threw: ' + (e && e.stack || e)); } finally {
      window.matchMedia = real;
      try { sr.trip.stop('leave'); } catch { /* nothing running */ }
      await sleep(2000);
    }
  },
};

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
  'DS-09': ['m31', 'galaxies'], 'stage-d': ['m31', 'milkyway', 'galaxies'],

  // e.
  'DS-10': ['far', 'cosmic'], 'DS-11': ['far', 'cosmic'], 'DS-17': ['far', 'cosmic'], 'DS-18': ['far', 'cosmic'],

  // f.
  'DS-E07': ['helixTrip'], 'DS-E08': ['lmcTrip'], journeys: ['helixTrip', 'lmcTrip', 'tripReduced'],
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

if (Object.keys(tripRows).length) out.trips = tripRows;
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
