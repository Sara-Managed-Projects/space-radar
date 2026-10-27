// r14-neb-b: NO PHOTOGRAPHS IN THE SCENE (release 1.4.0 stage r14-neb-b; Ivan, 2026-10-26: "no photos only realistic 3ds").
// ONE walk, the clock paused at 2026-10-15 12:00 UTC. For each object that was only a photograph and now has a 3D hero
// (the Pleiades' nebulosity, M27, the Southern Ring, Centaurus A, M83, NGC 1300) and for the two revised galaxies (the
// Sombrero, the Antennae):
//   - BEFORE: on our line at arrival, the photograph as main drew it there (`sr.nebulae.setCompare(id, 1)`: the card's
//     slider at "Photograph", the one place a photograph is still drawn);
//   - AFTER: the same pose with the slider cleared (what a visitor now sees: the 3D model), then turned off our line,
//     and for the Sombrero edge on and close, for the Antennae wide enough for its tails.
// Then the Lagoon Nebula (M8), one of the nine stage r14-neb-a builds: BEFORE its photograph, AFTER the soft glow that
// draws it until its hero lands. Beside each picture: the photograph's share, the hero's `sr.deep.stats()` row, the
// renderer's counts and sr.perf's p50/p95 (SwiftShader on a runner: relative numbers only).
// Last, from the ground at night: two former photographs as their soft glows (`ground`).
// `-f subject=` a hero id, `glow` or `ground` (joined by `_`) runs those alone. Fails when a hero never drew.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r14-neb-b';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const MLY_KM = LY_KM * 1e6;
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
const subject = new URLSearchParams(location.search).get('lookSubject') || '';
const want = (k) => !subject || subject.split('_').includes(k);
const D2R = Math.PI / 180;

try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
sr.clock.goTo(AT);
sr.clock.setPaused(true);

const measure = async () => {
  if (sr.perf) { sr.perf.mark(); await until(() => sr.perf.count() >= 60, 12000, 100); return sr.perf.stats(); }
  return { ...(frameCost() || {}) };
};
const onLadder = () => ['stellar', 'galaxy', 'local-group'].includes(sr.stage.worldId);
const pos = (id) => { const r = sr.recordById(id); if (!r) return null; const p = sr.positionOfRecord(r); return p ? { x: p.x, y: p.y, z: p.z } : null; };
const heroRow = (id) => { try { return (sr.deep.stats().heroes || []).find((h) => h.id === id) || null; } catch { return null; } };
const layerRow = (id) => { try { return (sr.deep.stats().layers || []).find((l) => l.id === id) || null; } catch { return null; } };
let n = 0;
const scene = async (tag, note, settleMs = 5000) => {
  await sleep(settleMs);
  if (onLadder() && sr.deep && sr.deep.whenReady) await sr.deep.whenReady(15000);
  const m = await measure();
  n += 1;
  const name = `${String(n).padStart(2, '0')}-${tag}`;
  const row = { name, note, stage: sr.stage.worldId, p50Ms: m.p50Ms ?? null, p95Ms: m.p95Ms ?? null, frames: m.frames ?? null, calls: m.calls, triangles: m.triangles, gpuMiB: m.gpu ? m.gpu.totalMiB : null };
  out.scenes.push(row);
  await shot(name, `${note} | ${row.stage}, p50 ${row.p50Ms} ms p95 ${row.p95Ms} ms (${row.frames} frames), ${row.calls} calls`);
  return row;
};
const need = async (id) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return false; }
  sr.select(r, { fly: true, undo: false });
  await sleep(9000);
  return true;
};
const heroDef = async (id) => { try { return (await import(new URL('js/scene/deep/heroes.js', document.baseURI).href)).HEROES.find((h) => h.id === id) || null; } catch (e) { out.problems.push('heroes.js: ' + e); return null; } };
/** The camera `deg` off the record's line to the Sun, at `k` times the arrival distance (heroes.js w2e.pose). */
const pose = (id, deg, k, d0) => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const b = unit({ x: S.x - H.x, y: S.y - H.y, z: S.z - H.z });
  let p = cross(b, { x: 0, y: 1, z: 0 });
  if (Math.hypot(p.x, p.y, p.z) < 1e-3) p = cross(b, { x: 1, y: 0, z: 0 });
  p = unit(p);
  rig.flyTo({ offset: unit(mix(b, Math.cos(deg * D2R), p, Math.sin(deg * D2R))), distance: d0 * k, ms: 0 });
};
const photo = (rec) => (sr.nebulae && sr.nebulae.drawn ? Math.round(sr.nebulae.drawn(rec) * 100) / 100 : '?');
const toLadder = async () => { if (!onLadder()) { sr.deselect(); await stage('stellar', 9000); } };

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  await until(() => !!sr.recordById('dso-m51'), 120000);
} catch (e) { look.warns.push('probe: loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('probe: wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('probe: wantDeep: ' + e); }


const HEROES_HERE = [
  ['m45', 'dso-m45', 'the Pleiades\' nebulosity', [[45, 1], [30, 0.3]]],
  ['m27', 'dso-m27', 'M27, the Dumbbell', [[60, 1], [90, 1]]],
  ['southern-ring', 'dso-southern-ring-nebula', 'the Southern Ring', [[60, 1]]],
  ['cena', 'dso-centaurus-a', 'Centaurus A', [[50, 1], [60, 0.4]]],
  ['m83', 'dso-m83', 'M83', [[60, 1]]],
  ['ngc1300', 'dso-ngc-1300', 'NGC 1300', [[60, 1]]],
  ['m104', 'dso-m104', 'M104, the Sombrero', [[35, 1], [85, 1], [60, 0.35]]],
  ['antennae', 'dso-antennae-galaxies', 'the Antennae', [[0, 3], [50, 1]]],
];
for (const [hid, rec, label, poses] of HEROES_HERE) {
  if (!want(hid)) continue;
  try {
    await toLadder();
    const def = await heroDef(hid);
    if (!def) { out.problems.push(`no hero line ${hid}`); continue; }
    if (!(await need(rec))) continue;
    const d0 = rig.state.distance;
    pose(rec, 0, 1, d0);
    try { sr.nebulae.setCompare(rec, 1); } catch (e) { look.warns.push('setCompare: ' + e); }
    await scene(`${hid}-0-before-photo`, `${label} on our line at arrival, BEFORE: the photograph as main drew it here (now only the card's slider draws it); photograph ${photo(rec)}`, 6000);
    try { sr.nebulae.clearCompare(); } catch { /* older */ }
    await scene(`${hid}-0-after-3d`, `${label} on our line at arrival, AFTER: the 3D model, no photograph; photograph ${photo(rec)}; hero ${JSON.stringify(heroRow(hid))}`, 7000);
    const h0 = heroRow(hid);
    if (!h0 || !h0.loaded || !(h0.level >= 2)) out.problems.push(`${hid} did not draw on our line: ${JSON.stringify(h0)}`);
    for (const [deg, k] of poses) {
      pose(rec, deg, k, d0);
      await scene(`${hid}-${deg}${k < 1 ? '-close' : k > 1 ? '-wide' : ''}-after`, `${label}, ${deg} degrees off our line, ${k} of the arrival distance, AFTER (the model); photograph ${photo(rec)}; hero ${JSON.stringify(heroRow(hid))}`, 6000);
    }
  } catch (e) { look.errors.push(`probe: ${hid} threw: ` + (e && e.stack || e)); }
}

// ---- a former photograph with no hero yet: the glow ------------------------------------------------------------------------
if (want('glow')) {
  try {
    await toLadder();
    if (await need('dso-m8')) {
      const d0 = rig.state.distance;
      pose('dso-m8', 0, 1, d0);
      try { sr.nebulae.setCompare('dso-m8', 1); } catch (e) { look.warns.push('setCompare: ' + e); }
      await scene('m8-0-before-photo', `the Lagoon Nebula (M8) on our line at arrival, BEFORE: its photograph as main drew it; photograph ${photo('dso-m8')}`, 6000);
      try { sr.nebulae.clearCompare(); } catch { /* older */ }
      await scene('m8-0-after-glow', `the Lagoon Nebula on our line at arrival, AFTER: the soft glow and holder until stage r14-neb-a's hero lands; photograph ${photo('dso-m8')}`, 6000);
    }
  } catch (e) { look.errors.push('probe: glow threw: ' + (e && e.stack || e)); }
}

// ---- from the ground: the former photographs as soft glows (sky/groundpictures.js; lead review of #1298) ----------------------
if (want('ground')) {
  try {
    sr.deselect();
    if (!(sr.skyView && sr.skyView.active)) { sr.setMoment('now'); await sleep(7000); }
    sr.clock.goTo(Date.UTC(2026, 9, 16, 3, 0, 0)); // a night in October, Orion and the Pleiades up for the northern sites
    sr.clock.setPaused(true);
    await sleep(3000);
    let shots = 0;
    for (const [id, fov] of [['dso-m42', 6], ['dso-m45', 8], ['dso-m31', 8], ['dso-lmc', 20], ['dso-m8', 6]]) {
      if (shots >= 2) break;
      const r = sr.recordById(id);
      if (!r || !sr.skyView || !sr.skyView.active) break;
      const res = sr.skyView.pointAtRecord(r, { fovDeg: fov, instant: true });
      if (res !== 'shown') { look.warns.push(`ground: ${id} ${res}`); continue; }
      await sleep(8000);
      let gp = null; try { gp = (sr.skyView.groundPictures() || []).filter((p) => p.drawn).map((p) => `${p.id} ${p.strength.toFixed(2)}`); } catch { /* older */ }
      shots += 1;
      await shot(`ground-${id.slice(4)}`, `from the ground at night, ${id.slice(4)} in a ${fov} degree field: the soft glow of its catalogue size, no photograph; glows drawn ${JSON.stringify(gp)}`);
    }
    if (!shots) out.problems.push('ground: nothing was above the horizon to look at');
  } catch (e) { look.errors.push('probe: ground threw: ' + (e && e.stack || e)); }
}

try { sr.clock.setPaused(false); sr.clock.live(); } catch { /* left */ }
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
