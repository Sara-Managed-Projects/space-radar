// r12-dust: remnants as shells and dust as sheets (release 1.2.0 stage W3-c, internal spec 0076, internal #784, #806).
// Every pose of the SHIPPED heroes is photographed twice in one run, BEFORE (the hero's `shipped` switched off for the
// shot: the photograph, the point glow and the holder, as main draws it today) and AFTER (the hero): the Veil at arrival
// and turned 70 degrees, the Horsehead against IC 434 at arrival and turned 50, M78 and the Iris lit by their stars at
// arrival and turned 50; then the Horsehead turned 50 on Low (T0), where the hero steps aside for main's look.
//
// Beside each picture: the camera's distance and angle off our line, how much of the photograph is drawn, the hero's
// own numbers (sr.deep.stats(): level, samples, shares, what loaded, the kept stars), the renderer's counts and the
// median and 95th percentile of 20 frame intervals (SwiftShader on a runner: relative numbers only), and sr.perf's row
// where it is loaded. It changes nothing in the app but the heroes' `shipped` flags for the BEFORE shots, which it puts
// back. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-dust';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
// The SHIPPED set (the lead's answers on #1215, 2026-10-17); the Crab and the Coalsack are built and held (`shipped:
// false`), so they are not photographed.
const HEROES = { veil: 'dso-veil-nebula', horsehead: 'dso-horsehead-nebula', m78: 'dso-m78', iris: 'dso-iris-nebula' };

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
const holders = () => { try { return sr.deep.stats().holders || []; } catch { return null; } };
const drawn = (id) => { try { return sr.nebulae ? Math.round(sr.nebulae.drawn(id) * 100) / 100 : null; } catch { return null; } };
const textOf = (sel, n = 300) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const perfRow = () => { try { return sr.perf && sr.perf.stats ? sr.perf.stats() : null; } catch { return null; } };

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
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
try { if (sr.wantPerf) await sr.wantPerf(); } catch (e) { look.warns.push('wantPerf: ' + e); }

// A W3-c hero's line in scene/deep/heroes.js carries the stub profile the coordinator reads by reference: `shipped:
// false` for a BEFORE shot makes it drop the hero (deepsky.js), so the photograph, the glow and the holder draw the
// object as main does.
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

/** Where the camera is against the line the object is seen along from the Sun. */
const lineOf = (rid) => {
  const H = pos(rid), S = pos('sun') || { x: 0, y: 0, z: 0 }, c = sr.camera.position;
  const a = unit(sub(c, H)), b = unit(sub(S, H));
  return { offLineDeg: Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 1800 / Math.PI) / 10, ly: Math.round(toLy(rig.state.distance) * 10) / 10 };
};
const snap = async (id, name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const rid = HEROES[id];
  const row = {
    name, note, ready, hero: id, ...lineOf(rid), stage: sr.stage.worldId,
    photo: drawn(rid), heroStats: heroRow(id), holders: holders(), cost: frameCost(), perf: perfRow(),
    card: textOf('#sr-card', 500), hud: textOf('#sr-hud', 160), ...f,
  };
  out.scenes.push(row);
  const h = row.heroStats || {};
  await shot(name, `${note} | ${row.offLineDeg} deg off our line, ${row.ly} ly, photograph ${row.photo}, hero level ${h.level} share ${h.share} samples ${h.samples} ${h.path || ''}${h.kept !== undefined ? ', kept stars ' + h.kept : ''}, ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pair = async (id, name, note) => {
  heroOn(id, false);
  await snap(id, `${name}-before`, `BEFORE (main: no hero): ${note}`);
  heroOn(id, true);
  const row = await snap(id, `${name}-after`, `AFTER (the hero): ${note}`, 6000);
  const h = row.heroStats || {};
  if (!h.loaded || h.light === 'failed' || h.dust === 'failed') out.problems.push(`${name}: the hero did not draw (${JSON.stringify(h)})`);
  return row;
};
/** A pose round a record: `deg` off the line to the Sun, toward `side` (a unit vector across it), at `ly`. */
const pose = (rid, deg, ly, across = null) => {
  const H = pos(rid), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const toSun = unit(sub(S, H));
  const side = across || unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: H, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: ly * LY_KM / sr.stage.unitKm, ms: 0 });
};

const visit = async (id, turnDeg, label) => {
  const rid = HEROES[id];
  if (!(await need(rid))) return null;
  heroOn(id, true);
  sr.select(sr.recordById(rid), { fly: false, undo: false });
  await sleep(1500);
  const arrival = toLy(rig.state.distance);
  await pair(id, `${id}-1-arrival`, `${label} at arrival, as the app frames it`);
  pose(rid, turnDeg, arrival);
  await pair(id, `${id}-2-turned${turnDeg}`, `${label} turned ${turnDeg} degrees round the record, the same distance`);
  return arrival;
};

await visit('veil', 70, 'the Veil (the Cygnus Loop): a thin sphere 37 pc across, its light the photograph');
const hhLy = await visit('horsehead', 50, 'the Horsehead against IC 434: dust in front of the glow, absorbing and reddening');
await visit('m78', 50, 'M78 lit by HD 38563: a reflection sheet, blue only where the star lights it');
await visit('iris', 50, 'the Iris lit by HD 200775: a reflection sheet, the star in front of it');

// after only: the Horsehead on Low (T0): the hero steps aside below its min_tier, so this is main's look
if (hhLy) {
  sr.select(sr.recordById(HEROES.horsehead), { fly: false, undo: false });
  heroOn('horsehead', true);
  pose(HEROES.horsehead, 50, hhLy);
  let choice = null;
  try {
    choice = sr.quality ? sr.quality.choice : null;
    if (sr.quality && sr.quality.setChoice) { sr.quality.setChoice('low'); await snap('horsehead', 'horsehead-3-low', 'Low quality (T0) turned 50: below its min_tier the hero steps aside and main draws the Horsehead', 6000); }
  } catch (e) { look.warns.push('probe: Low: ' + e); } finally { try { if (sr.quality && sr.quality.setChoice) sr.quality.setChoice(choice || 'auto'); } catch { /* left */ } }
}

for (const id of Object.keys(HEROES)) heroOn(id, true);
const after = out.scenes.filter((s) => /after/.test(s.name));
for (const id of Object.keys(HEROES)) if (!after.some((s) => s.hero === id && s.heroStats && s.heroStats.loaded)) out.problems.push(`the ${id} hero never drew`);
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
