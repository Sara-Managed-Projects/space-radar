// r12-orion: the Orion Nebula as a hero (release 1.2.0 stage W1-a, internal spec 0076, internal #782). Every pose is
// photographed twice in one run, BEFORE (the hero switched off for the shot: the photograph, the point glow and
// the holder, as main draws M42 today) and AFTER (the blister, the cloud, the Veil, the Trapezium and the cluster),
// so one run is the stage's before and after. The poses: M42 at arrival (the app's framing: the photograph),
// turned 30 and 60 degrees round theta1 Ori C, from the side, from behind (the dark cloud), near the Trapezium,
// M43 beside it; then the Measured look and T0 (Low) at 60 degrees.
//
// Beside each picture: the camera's distance and angle off our line, how much of the photograph is drawn, the
// hero's own numbers (sr.deep.stats(): level, coarse steps, shares, what loaded, bytes), the renderer's counts and
// the median and 95th percentile of 20 frame intervals (SwiftShader on a runner: relative numbers only).
// It changes nothing in the app but the hero's `shipped` flag for the BEFORE shots, which it puts back.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-orion';
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
const hero = () => { try { return (sr.deep.stats().heroes || []).find((h) => h.id === 'orion') || null; } catch (e) { return { error: String(e) }; } };
const holders = () => { try { return sr.deep.stats().holders || []; } catch { return null; } };
const drawn = (id) => { try { return sr.nebulae ? Math.round(sr.nebulae.drawn(id) * 100) / 100 : null; } catch { return null; } };
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
  out.laterLayers = await until(() => !!sr.recordById('dso-m42'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }

// The hero's profile is a module the coordinator reads by reference: `shipped: false` for a BEFORE shot makes it
// drop the hero (deepsky.js), so the photograph, the point glow and the holder draw M42 as main does.
let PROFILE = null;
try { PROFILE = (await import(new URL('js/data/hero-orion.js', document.baseURI).href)).HERO; } catch (e) { out.problems.push('the profile module did not import: no BEFORE shots (' + e + ')'); }
const m42 = sr.recordById('dso-m42'), m43 = sr.recordById('dso-m43');
const heroOn = (on) => {
  if (!PROFILE) return;
  PROFILE.shipped = on;
  for (const r of [m42, m43]) {
    if (!r || !r.meta) continue;
    if (on) { r.meta.heroDrawn = ['reconstruction']; r.meta.heroId = r === m42 ? 'orion' : r.meta.heroId; r.meta.heroCopy = 'deepOrion'; } else { delete r.meta.heroDrawn; delete r.meta.heroCopy; if (r === m42) delete r.meta.heroId; }
  }
};

/** Where the camera is against the line the photograph was taken along. */
const lineOf = (id = 'dso-m42') => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 }, c = sr.camera.position;
  const a = unit(sub(c, H)), b = unit(sub(S, H));
  return { offLineDeg: Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 1800 / Math.PI) / 10, ly: Math.round(toLy(rig.state.distance) * 100) / 100 };
};
const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const row = {
    name, note, ready, ...lineOf(), stage: sr.stage.worldId,
    photo: { m42: drawn('dso-m42'), m43: drawn('dso-m43') },
    hero: hero(), holders: holders(), cost: frameCost(),
    card: textOf('#sr-card', 500), hud: textOf('#sr-hud', 160), ...f,
  };
  out.scenes.push(row);
  const h = row.hero || {};
  await shot(name, `${note} | ${row.offLineDeg} deg off our line, ${row.ly} ly, photograph ${row.photo.m42}, hero level ${h.level} share ${h.share} steps ${h.samples}, ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pair = async (name, note) => {
  heroOn(false);
  await snap(`${name}-before`, `BEFORE (main: no hero): ${note}`);
  heroOn(true);
  const row = await snap(`${name}-after`, `AFTER (the hero): ${note}`, 6000);
  const h = row.hero || {};
  if (!h.loaded || h.light === 'failed' || h.front === 'failed') out.problems.push(`${name}: the hero did not draw (${JSON.stringify(h)})`);
  return row;
};

/** A pose round a record: `deg` off the line to the Sun, toward `side` (a unit vector across it), at `ly`. */
const pose = (id, deg, ly, across = null) => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const toSun = unit(sub(S, H));
  const side = across || unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: H, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: ly * LY_KM / sr.stage.unitKm, ms: 0 });
};

if (await need('dso-m42')) {
  heroOn(true);
  sr.select(m42, { fly: false, undo: false });
  await sleep(2000);
  const arrivalLy = toLy(rig.state.distance);
  out.arrivalLy = Math.round(arrivalLy * 10) / 10;
  await pair('o01-arrival', 'M42 at arrival, as the app frames it: the photograph (the model is the photograph here)');
  pose('dso-m42', 30, arrivalLy);
  await pair('o02-turned30', 'turned 30 degrees round theta1 Ori C: the photograph hands over');
  pose('dso-m42', 60, arrivalLy);
  await pair('o03-turned60', 'turned 60 degrees: the blister, the bowl opening toward us, the Trapezium in front');
  pose('dso-m42', 88, arrivalLy);
  await pair('o04-side', 'from the side: the front nearly edge on, the cloud behind it');
  pose('dso-m42', 175, arrivalLy);
  await pair('o05-behind', 'from behind: the dark molecular cloud hides the nebula');
  pose('dso-m42', 40, 3.0);
  await pair('o06-near-trapezium', 'near the Trapezium, 3 ly from theta1 Ori C, 40 degrees off our line: the front behind the four stars');
  if (m43) {
    await need('dso-m43', 8000);
    heroOn(true);
    await pair('o07-m43', 'M43 selected: its own framing, beside M42 (drawn by the same hero)');
    pose('dso-m43', 50, toLy(rig.state.distance));
    await pair('o08-m43-turned50', 'M43 turned 50 degrees: its dimple on the same cloud, NU Ori in front of it');
  }
  sr.select(m42, { fly: false, undo: false });
  pose('dso-m42', 60, arrivalLy);
  heroOn(true);
  try { sr.drawn.set('measured'); await snap('o09-measured-60', 'the Measured look at 60 degrees: the same picture (nothing generated, nothing moves)', 5000); } finally { sr.drawn.set('film'); }
  let choice = null;
  try {
    choice = sr.quality ? sr.quality.choice : null;
    if (sr.quality && sr.quality.setChoice) { sr.quality.setChoice('low'); await snap('o10-low-60', 'Low quality (T0) at 60 degrees: 8 coarse steps, the exact crossing (no bands, no rings)', 6000); }
  } catch (e) { look.warns.push('probe: Low: ' + e); } finally { try { if (sr.quality && sr.quality.setChoice) sr.quality.setChoice(choice || 'auto'); } catch { /* left */ } }
}

const after = out.scenes.filter((s) => /after|measured|low/.test(s.name));
if (!after.some((s) => s.hero && s.hero.loaded && s.hero.light === 'ready' && s.hero.front === 'ready')) out.problems.push('the hero never drew with its light and its front');
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
