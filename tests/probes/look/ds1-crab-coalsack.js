// ds1-crab-coalsack: the Crab Nebula's own model and the Coalsack as darkness (the 2026-11-16 deep-space review,
// faults 2 and 3). Each pose is photographed BEFORE (the hero's `shipped` switched off for the shot: what main drew,
// the generic remnant shell and, for the Coalsack, nothing) and AFTER (the hero):
//   the Crab at arrival, turned 80 degrees, close, close and turned, and from inside the cage looking at the pulsar;
//   the Coalsack from beside the Sun (the Southern Cross next to it), at arrival and turned 60 degrees.
// Beside each picture: the camera's distance and angle off our line, the hero's own numbers (sr.deep.stats()), the
// renderer's counts and the median and 95th percentile of 20 frame intervals (a software renderer on a runner:
// relative numbers only; the Coalsack was held for costing 7.7 times the frame on a phone). It changes nothing in the
// app but the two heroes' `shipped` flags for the BEFORE shots, which it puts back.
// Run it at 1440 x 900 and again with `-f mobile=true`.
look.probe = 'ds1-crab-coalsack';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const HEROES = { crab: 'dso-m1', coalsack: 'dso-coalsack' };

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
const pos = (id) => { const r = sr.recordById(id); if (!r) return null; const p = sr.positionOfRecord(r); return p ? { x: p.x, y: p.y, z: p.z } : null; };
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const toLy = (u) => u * sr.stage.unitKm / LY_KM;
const heroRow = (id) => { try { return (sr.deep.stats().heroes || []).find((h) => h.id === id) || null; } catch (e) { return { error: String(e) }; } };
const textOf = (sel, n = 300) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };

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
  out.laterLayers = await until(() => !!sr.recordById('dso-m1'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }

// A W3-c hero's line in scene/deep/heroes.js carries the stub the coordinator reads by reference: `shipped: false`
// for a BEFORE shot makes it drop the hero, so the glow and the holder draw the object as main does.
const PROFILES = {};
try {
  const { HEROES: LIST } = await import(new URL('js/scene/deep/heroes.js', document.baseURI).href);
  for (const id of Object.keys(HEROES)) { const d = LIST.find((x) => x.id === id); if (d && d.stub) PROFILES[id] = d.stub; else out.problems.push(`no stub for ${id}: no BEFORE shots for it`); }
} catch (e) { out.problems.push(`heroes.js did not import: no BEFORE shots (${e})`); }
const heroOn = (id, on) => {
  const P = PROFILES[id];
  const r = sr.recordById(HEROES[id]);
  if (!P) return;
  P.shipped = on;
  if (r && r.meta) {
    if (on) { r.meta.heroDrawn = (P.drawn || ['reconstruction']).slice(); r.meta.heroId = id; r.meta.heroCopy = 'r12Dust'; } else { delete r.meta.heroDrawn; delete r.meta.heroCopy; delete r.meta.heroId; }
  }
};
const lineOf = (rid) => {
  const H = pos(rid), S = pos('sun') || { x: 0, y: 0, z: 0 }, c = sr.camera.position;
  const a = unit(sub(c, H)), b = unit(sub(S, H));
  return { offLineDeg: Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 1800 / Math.PI) / 10, ly: Math.round(toLy(rig.state.distance) * 100) / 100 };
};
const snap = async (id, name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const rid = HEROES[id];
  const row = { name, note, ready, hero: id, ...lineOf(rid), stage: sr.stage.worldId, heroStats: heroRow(id), cost: frameCost(), card: textOf('#sr-card', 700), ...f };
  out.scenes.push(row);
  const h = row.heroStats || {};
  await shot(name, `${note} | ${row.offLineDeg} deg off our line, ${row.ly} ly, hero level ${h.level} share ${h.share} ${h.path || ''}${h.kept !== undefined ? ', kept stars ' + h.kept : ''}${h.filaments ? ', ' + h.filaments + ' filament pieces, scale ' + h.scale : ''}, ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pair = async (id, name, note) => {
  heroOn(id, false);
  const before = await snap(id, `${name}-before`, `BEFORE (main: no hero): ${note}`);
  heroOn(id, true);
  const row = await snap(id, `${name}-after`, `AFTER (the hero): ${note}`, 6000);
  const h = row.heroStats || {};
  if (!h.loaded || h.light === 'failed' || h.dust === 'failed') out.problems.push(`${name}: the hero did not draw (${JSON.stringify(h)})`);
  row.costOverBefore = before.medianMs && row.medianMs ? Math.round(row.medianMs / before.medianMs * 100) / 100 : null;
  return row;
};
/** A pose round a record: `deg` off the line to the Sun, toward `across`, at `ly`. */
const pose = (rid, deg, ly, across = null) => {
  const H = pos(rid), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const toSun = unit(sub(S, H));
  const side = across || unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: H, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: ly * LY_KM / sr.stage.unitKm, ms: 0 });
};

// ---- the Crab
if (await need(HEROES.crab)) {
  heroOn('crab', true);
  sr.select(sr.recordById(HEROES.crab), { fly: false, undo: false });
  await sleep(1500);
  const arrival = toLy(rig.state.distance);
  out.crabArrivalLy = arrival;
  await pair('crab', 'crab-1-arrival', 'the Crab at arrival, as the app frames it: from our side');
  pose(HEROES.crab, 80, arrival);
  await pair('crab', 'crab-2-turned80', 'the Crab turned 80 degrees round the record, the same distance');
  pose(HEROES.crab, 0, arrival * 0.4);
  await snap('crab', 'crab-3-close', 'AFTER: the Crab close, from our side: the cage, the glow, the rings and jets of the pulsar\'s wind', 5000);
  pose(HEROES.crab, 80, arrival * 0.4);
  await snap('crab', 'crab-4-close-turned80', 'AFTER: close and turned 80 degrees', 5000);
  pose(HEROES.crab, 150, arrival * 0.4);
  await snap('crab', 'crab-5-close-behind', 'AFTER: close, from 150 degrees round: the far side', 5000);
  pose(HEROES.crab, 30, 3.0);
  await snap('crab', 'crab-6-inside', 'AFTER: inside the cage, 3 light-years from the pulsar, looking at it', 5000);
  pose(HEROES.crab, 30, 1.2);
  await snap('crab', 'crab-7-wind', 'AFTER: 1.2 light-years from the pulsar: the wind\'s rings and jets (false colour), the cage all round', 5000);
  try {
    sr.drawn.set('measured'); pose(HEROES.crab, 0, arrival * 0.4); await snap('crab', 'crab-8-measured', 'AFTER, the Measured look: the same model without the generated knots', 5000); sr.drawn.set('film');
  } catch (e) { look.warns.push('probe: measured look: ' + e); }
}

// ---- the Coalsack
if (await need(HEROES.coalsack)) {
  heroOn('coalsack', true);
  sr.select(sr.recordById(HEROES.coalsack), { fly: false, undo: false });
  await sleep(1500);
  const arrival = toLy(rig.state.distance);
  out.coalsackArrivalLy = arrival;
  await pair('coalsack', 'coalsack-1-arrival', 'the Coalsack at arrival, as the app frames it');
  // from beside the Sun: 30 ly along the line toward the cloud, so the Southern Cross stands next to it as in our sky
  pose(HEROES.coalsack, 0, 557);
  await pair('coalsack', 'coalsack-2-from-the-sun', 'the Coalsack from beside the Sun (30 ly from it), the Southern Cross beside the cloud');
  pose(HEROES.coalsack, 60, arrival);
  await pair('coalsack', 'coalsack-3-turned60', 'the Coalsack turned 60 degrees round the record, the same distance');
  pose(HEROES.coalsack, 88, arrival);
  await snap('coalsack', 'coalsack-4-edge-on', 'AFTER: the Coalsack from the side (88 degrees): a thin cloud', 5000);
}

for (const id of Object.keys(HEROES)) heroOn(id, true);
const after = out.scenes.filter((s) => /after|AFTER/.test(s.name + s.note));
for (const id of Object.keys(HEROES)) if (!after.some((s) => s.hero === id && s.heroStats && s.heroStats.loaded)) out.problems.push(`the ${id} hero never drew`);
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
