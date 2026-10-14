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
// It changes nothing in the app. It fails only when a subject it needs is missing.
// Run it at 1600 x 900 (`-f width=1600 -f height=900`) and again with `-f mobile=true`.
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
const snap = async (name, note, settleMs = 5000) => {
  await sleep(settleMs);
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
    ...f,
  };
  out.scenes.push(row);
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

// 1. The Helix: the app's own framing, closer, and turned 45 degrees (does it stay a shape, or is
//    it a card seen from the side?).
if (await need('dso-helix-nebula')) {
  await snap('01-helix-arrival', 'the Helix as the app frames it on arrival');
  pull(0.35);
  await snap('02-helix-close', 'the Helix, a third of the arrival distance');
  turn(Math.PI / 4);
  await snap('03-helix-turned45', 'the Helix, close, turned 45 degrees round it');

  // 2. Ivan's frame: the Helix in front, the LMC and the Tarantula behind it, about 20 degrees apart
  //    on screen (sideways on a laptop, up and down on a phone), the camera 120 ly from the Helix.
  const H = pos('dso-helix-nebula'), L = pos('dso-lmc');
  if (H && L) {
    const toL = unit(sub(L, H));
    const side = unit(cross(toL, { x: 0, y: 1, z: 0 }));
    const across = phone ? unit(cross(toL, side)) : side;
    rig.flyTo({ offset: unit(mix(neg(toL), 1, across, 0.36)), distance: 120 / (sr.stage.unitKm / LY_KM), ms: 0 });
    await snap('04-ivan-frame-helix-selected', "Ivan's frame: the Helix 120 ly away and selected, the LMC and the Tarantula behind it");
    sr.deselect();
    await snap('05-ivan-frame', "Ivan's frame with nothing selected, as in his screenshot", 3000);
  } else out.problems.push('no position for the Helix or the LMC');
}

// 3. The LMC: arrival, wide, close, turned.
if (await need('dso-lmc')) {
  await snap('06-lmc-arrival', 'the LMC as the app frames it on arrival');
  const arrival = rig.state.distance;
  pull(4);
  await snap('07-lmc-wide', 'the LMC, four times the arrival distance: the SMC and the Milky Way round it');
  rig.flyTo({ distance: arrival * 0.35, ms: 0 });
  await snap('08-lmc-close', 'the LMC, a third of the arrival distance');
  turn(Math.PI * 50 / 180);
  await snap('09-lmc-turned50', 'the LMC, close, turned 50 degrees round it');
}

// 4. The Tarantula selected, then pulled back so the LMC is round it.
if (await need('dso-tarantula-nebula')) {
  await snap('10-tarantula-selected', 'the Tarantula selected: its card, its framing, the LMC behind');
  pull(6);
  await snap('11-tarantula-in-lmc', 'the Tarantula still selected, six times further: where it sits in the LMC');
}

// 5. Andromeda: arrival, turned 60 degrees (the photograph gives way to the model), close.
if (await need('dso-m31')) {
  await snap('12-m31-arrival', 'Andromeda as the app frames it on arrival');
  turn(Math.PI / 3);
  await snap('13-m31-turned60', 'Andromeda turned 60 degrees round it');
  pull(0.3);
  await snap('14-m31-close', 'Andromeda, turned, a third of the distance');
}

// 6. The Milky Way from outside: above the galactic plane, then edge on, 46 kpc out.
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

// 7. The farthest the app goes: the Local Group, the Virgo region, a billion light-years, the
//    46.5 Gly shell (scene/shells.js) and the climb's "edge" (scene/handoff.js EDGE_KM).
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

if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
