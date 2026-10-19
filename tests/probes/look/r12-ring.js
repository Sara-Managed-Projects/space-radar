// r12-ring: the Ring Nebula (M57) as a hero, and the Helix's exact front (release 1.2.0 stage W3-b, internal spec 0076,
// internal #872; spec 0075 task 45). Every pose is photographed twice in one run, BEFORE and AFTER, from the same place:
//   M57     BEFORE is main's M57 (the hero switched off for the shot: the photograph, the point glow and the holder);
//           AFTER the ring, the lobes and the halo lit by the photograph. Poses: at arrival (the app's framing: the
//           photograph), turned 45 and 90 degrees round the star, from inside, then Measured and T0 (Low) at 45.
//   Helix   BEFORE is the Helix as main draws it (each step its rings' profile at one point: helix.js FRONT.exact
//           off for the shot); AFTER the exact front. Poses: from our line, turned 45 degrees, and T0 at 45.
// Beside each picture: the camera's distance and angle off our line, how much of the photograph is drawn, the hero's
// own numbers (sr.deep.stats(): level, samples, shares, what loaded, bytes), the renderer's counts, sr.perf.stats()
// where there is one, and the median and 95th percentile of 20 frame intervals (SwiftShader on a runner: relative).
// It changes nothing in the app but M57's `shipped` flag and the Helix's FRONT switch for the BEFORE shots, which it
// puts back. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-ring';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;

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
const heroOf = (id) => { try { return (sr.deep.stats().heroes || []).find((h) => h.id === id) || null; } catch (e) { return { error: String(e) }; } };
const drawn = (id) => { try { return sr.nebulae ? Math.round(sr.nebulae.drawn(id) * 100) / 100 : null; } catch { return null; } };
const perf = () => { try { return sr.perf && sr.perf.stats ? sr.perf.stats() : null; } catch { return null; } };
const textOf = (sel, n = 600) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };

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
  out.laterLayers = await until(() => !!sr.recordById('dso-m57'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
try { if (sr.wantPerf) await sr.wantPerf(); } catch (e) { look.warns.push('wantPerf: ' + e); }

// M57's profile is a module the coordinator reads by reference: `shipped: false` for a BEFORE shot makes it drop the
// hero (deepsky.js), so the photograph, the point glow and the holder draw M57 as main does.
let PROFILE = null, HELIX = null;
try { PROFILE = (await import(new URL('js/data/hero-m57.js', document.baseURI).href)).HERO; } catch (e) { out.problems.push('the M57 profile did not import: no BEFORE shots (' + e + ')'); }
try { HELIX = await import(new URL('js/scene/deep/helix.js', document.baseURI).href); } catch (e) { out.problems.push('helix.js did not import: no Helix BEFORE shots (' + e + ')'); }
const m57 = sr.recordById('dso-m57');
const heroOn = (on) => {
  if (!PROFILE) return;
  PROFILE.shipped = on;
  if (m57 && m57.meta) {
    if (on) { m57.meta.heroDrawn = ['reconstruction']; m57.meta.heroId = 'm57'; m57.meta.heroCopy = 'deepRing'; } else { delete m57.meta.heroDrawn; delete m57.meta.heroCopy; delete m57.meta.heroId; }
  }
};
const frontOn = (on) => { if (HELIX && HELIX.FRONT) HELIX.FRONT.exact = on; };

/** Where the camera is against the line the photograph was taken along. */
const lineOf = (id) => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 }, c = sr.camera.position;
  const a = unit(sub(c, H)), b = unit(sub(S, H));
  return { offLineDeg: Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 1800 / Math.PI) / 10, ly: Math.round(toLy(rig.state.distance) * 1000) / 1000 };
};
const snap = async (name, note, id, heroId, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const row = {
    name, note, ready, ...lineOf(id), stage: sr.stage.worldId,
    photo: drawn(id), hero: heroOf(heroId), cost: frameCost(), perf: perf(),
    card: textOf('#sr-card'), hud: textOf('#sr-hud', 160), ...f,
  };
  out.scenes.push(row);
  const h = row.hero || {};
  await shot(name, `${note} | ${row.offLineDeg} deg off our line, ${row.ly} ly, photograph ${row.photo}, hero level ${h.level} share ${h.share} samples ${h.samples} front ${h.front || '-'}, ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pairRing = async (name, note) => {
  heroOn(false);
  await snap(`${name}-before`, `BEFORE (main: no hero): ${note}`, 'dso-m57', 'm57');
  heroOn(true);
  const row = await snap(`${name}-after`, `AFTER (the Ring hero): ${note}`, 'dso-m57', 'm57', 6000);
  const h = row.hero || {};
  if (!h.loaded || h.light === 'failed') out.problems.push(`${name}: the hero did not draw (${JSON.stringify(h)})`);
  return row;
};
const pairHelix = async (name, note) => {
  frontOn(false);
  await snap(`${name}-before`, `BEFORE (main: each step the profile at one point): ${note}`, 'dso-helix-nebula', 'helix');
  frontOn(true);
  return snap(`${name}-after`, `AFTER (the exact front): ${note}`, 'dso-helix-nebula', 'helix');
};

/** A pose round a record: `deg` off the line to the Sun, toward `side` (a unit vector across it), at `ly`. */
const pose = (id, deg, ly, across = null) => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const toSun = unit(sub(S, H));
  const side = across || unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: H, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: ly * LY_KM / sr.stage.unitKm, ms: 0 });
};
const lowAt = async (name, note, id, heroId) => {
  let choice = null;
  try {
    choice = sr.quality ? sr.quality.choice : null;
    if (sr.quality && sr.quality.setChoice) { sr.quality.setChoice('low'); return await snap(name, note, id, heroId, 6000); }
  } catch (e) { look.warns.push('probe: Low: ' + e); } finally { try { if (sr.quality && sr.quality.setChoice) sr.quality.setChoice(choice || 'auto'); } catch { /* left */ } }
  return null;
};

if (await need('dso-m57')) {
  heroOn(true);
  sr.select(m57, { fly: false, undo: false });
  await sleep(2000);
  const arrivalLy = toLy(rig.state.distance);
  out.arrivalLy = Math.round(arrivalLy * 1000) / 1000;
  await pairRing('r01-arrival', 'M57 at arrival, as the app frames it: the photograph (the model is the photograph here)');
  pose('dso-m57', 45, arrivalLy);
  await pairRing('r02-turned45', 'turned 45 degrees round the white dwarf: the photograph has handed over; the ring a tilted band, the blue middle reaching along our line');
  pose('dso-m57', 90, arrivalLy);
  await pairRing('r03-turned90', 'turned 90 degrees: the ring nearly edge on, the lobes across it, the halo round both');
  pose('dso-m57', 60, 0.3);
  await pairRing('r04-inside', 'inside, 0.3 ly from the star, 60 degrees off our line: the ring round the camera, the lobes through it');
  pose('dso-m57', 45, arrivalLy);
  heroOn(true);
  try { sr.drawn.set('measured'); await snap('r05-measured-45', 'the Measured look at 45 degrees: the same picture (nothing generated, nothing moves)', 'dso-m57', 'm57', 5000); } finally { sr.drawn.set('film'); }
  await lowAt('r06-low-45', 'Low quality (T0) at 45 degrees: 4 samples a layer, each step integrated exactly (no bands)', 'dso-m57', 'm57');
}

if (await need('dso-helix-nebula')) {
  const hx = sr.recordById('dso-helix-nebula');
  sr.select(hx, { fly: false, undo: false });
  await sleep(2000);
  const arrivalLy = toLy(rig.state.distance);
  out.helixArrivalLy = Math.round(arrivalLy * 100) / 100;
  await pairHelix('h01-ourline', 'the Helix from our line: the photograph (unchanged)');
  pose('dso-helix-nebula', 45, arrivalLy);
  await pairHelix('h02-turned45', 'the Helix turned 45 degrees: the rings, unchanged but for their faces integrated per step');
  frontOn(false);
  await lowAt('h03-low-45-before', 'BEFORE: the Helix at 45 degrees on Low (T0), 4 samples a ring at one point each', 'dso-helix-nebula', 'helix');
  frontOn(true);
  await lowAt('h03-low-45-after', 'AFTER: the Helix at 45 degrees on Low (T0), 4 samples a ring, each step its ring\'s exact integral', 'dso-helix-nebula', 'helix');
}
frontOn(true);
heroOn(true);

const after = out.scenes.filter((s) => /^r.*(after|measured|low)/.test(s.name));
if (!after.some((s) => s.hero && s.hero.loaded && s.hero.light === 'ready')) out.problems.push('the Ring hero never drew with its light');
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
