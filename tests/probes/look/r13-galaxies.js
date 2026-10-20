// r13-galaxies: galaxy classes in deep space (release 1.3.0 stage W3-f, internal spec 0077 task 20; internal #873, #875, #784,
// #783). ONE walk, every pose of the stage, the clock paused at 2026-10-15 12:00 UTC:
//   - the spirals from their own numbers (M51 with NGC 5195, M81, M101, M104) and the Antennae: BEFORE once, 60 degrees off the
//     line the photograph was taken along (the hero's `shipped` switched off for the shot: the photograph, the glow and the holder
//     main draws), then AFTER: on our line with the photograph slid away (`sr.nebulae.setCompare(id, 0)`: the model alone, to lay
//     beside the photograph), 35 and 60 degrees off, nearly edge on (85), and close (60 degrees, 0.35 of the arrival distance);
//   - the Small Magellanic Cloud, now shipped with its light as patches: BEFORE and AFTER at arrival, 70 degrees off, 90 degrees
//     off at half the distance and 70 degrees off at a fifth (where wave 2 drew a veil), so each pair's frame times compare;
//   - the Magellanic Bridge and Stream from beside the SMC and from beyond the LMC, BEFORE (`sr.deep.debug({ before: true })`)
//     and AFTER (gas within 40 000 ly of the camera fades: no haze);
//   - the deep field on the Local Group's stage: from 12 billion light-years beside it (a needle), BEFORE (`sr.deep.debug({ far:
//     false })`) and AFTER, then from inside it at redshift 2, looking out along it and looking back toward us.
// Beside each picture: the angle off our line, the photograph's share, the hero's or the layer's `sr.deep.stats()` row, the
// renderer's counts and sr.perf's p50/p95 of up to 60 drawn frames (SwiftShader on a runner: relative numbers only).
// `-f subject=spirals`, `antennae`, `smc`, `stream` or `field` (joined by `_`) runs those alone. Fails when a hero never drew.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r13-galaxies';
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

// ---- the spirals and the Antennae ---------------------------------------------------------------------------------------
const GALAXIES = [
  ['m51', 'dso-m51', 'M51 with NGC 5195', 'spirals'],
  ['m81', 'dso-m81', 'M81', 'spirals'],
  ['m101', 'dso-m101', 'M101', 'spirals'],
  ['m104', 'dso-m104', 'M104, the Sombrero', 'spirals'],
  ['antennae', 'dso-antennae-galaxies', 'the Antennae', 'antennae'],
];
for (const [hid, rec, label, group] of GALAXIES) {
  if (!want(group) && !want(hid)) continue;
  try {
    await toLadder();
    const def = await heroDef(hid);
    if (!def) { out.problems.push(`no hero line ${hid}`); continue; }
    if (!(await need(rec))) continue;
    const d0 = rig.state.distance;
    def.stub.shipped = false;
    pose(rec, 60, 1, d0);
    await scene(`${hid}-60-before`, `${label}, 60 degrees off its photograph's line, BEFORE (as main draws it: the photograph fading, the glow, the holder); photograph ${photo(rec)}`, 5000);
    def.stub.shipped = true;
    pose(rec, 0, 1, d0);
    try { sr.nebulae.setCompare(rec, 0); } catch (e) { look.warns.push('setCompare: ' + e); }
    const r0 = await scene(`${hid}-0-model`, `${label} on our line at arrival, the photograph slid away (the model alone, to lay beside the photograph); hero ${JSON.stringify(heroRow(hid))}`, 7000);
    try { sr.nebulae.setCompare(rec, 1); } catch { /* older */ }
    await scene(`${hid}-0-photo`, `${label} on our line at arrival, the photograph alone (the slider at the photograph)`, 4000);
    try { sr.nebulae.clearCompare(); } catch { /* older */ }
    for (const [deg, k] of [[35, 1], [60, 1], [85, 1], [60, 0.35]]) {
      pose(rec, deg, k, d0);
      const r = await scene(`${hid}-${deg}${k < 1 ? '-close' : ''}-after`, `${label}, ${deg} degrees off its photograph's line, ${k} of the arrival distance, AFTER (the model); photograph ${photo(rec)}; hero ${JSON.stringify(heroRow(hid))}`, 6000);
      if (deg === 60 && k === 1) { const h = heroRow(hid); if (!h || !h.loaded || !(h.level >= 2)) out.problems.push(`${hid} did not draw at 60 degrees: ${JSON.stringify(h)}`); }
      void r; void r0;
    }
  } catch (e) { look.errors.push(`probe: ${hid} threw: ` + (e && e.stack || e)); }
}

// ---- the SMC: before and after at each place -----------------------------------------------------------------------------
if (want('smc')) {
  try {
    await toLadder();
    const def = await heroDef('smc');
    if (await need('dso-smc')) {
      const d0 = rig.state.distance;
      for (const [deg, k] of [[0, 1], [70, 1], [90, 0.5], [70, 0.2]]) {
        for (const on of [false, true]) {
          if (def && def.stub) def.stub.shipped = on;
          pose('dso-smc', deg, k, d0);
          await scene(`smc-${deg}-x${k}-${on ? 'after' : 'before'}`, `the Small Magellanic Cloud, ${deg} degrees off its photograph's line, ${k} of the arrival distance, ${on ? 'AFTER (its light as patches)' : 'BEFORE (as main draws it)'}; photograph ${photo('dso-smc')}; hero ${JSON.stringify(heroRow('smc'))}`, on ? 6000 : 4000);
        }
      }
      if (def && def.stub) def.stub.shipped = true;
    }
  } catch (e) { look.errors.push('probe: smc threw: ' + (e && e.stack || e)); }
}
if (want('stream')) {
  try {
    await toLadder();
    for (const [rec, deg, k, label] of [['dso-smc', 60, 6, 'from 6 times the SMC\'s arrival distance, 60 degrees off our line'], ['dso-lmc', 100, 10, 'from 10 times the LMC\'s arrival distance, 100 degrees off our line'], ['dso-smc', 40, 1.6, 'beside the SMC, 1.6 times its arrival distance (where wave 2 drew a blue haze)']]) {
      if (!(await need(rec))) continue;
      const d0 = rig.state.distance;
      for (const on of [false, true]) {
        try { sr.deep.debug({ before: !on }); } catch { /* older */ }
        pose(rec, deg, k, d0);
        await scene(`stream-${rec.slice(4)}-${deg}-${on ? 'after' : 'before'}`, `the Magellanic Bridge and Stream ${label}, ${on ? 'AFTER (hydrogen in false colour)' : 'BEFORE'}; layer ${JSON.stringify(layerRow('magellanic'))}`, 5000);
      }
    }
    try { sr.deep.debug({ before: false }); } catch { /* older */ }
  } catch (e) { look.errors.push('probe: stream threw: ' + (e && e.stack || e)); }
}

// ---- the deep field -------------------------------------------------------------------------------------------------------
if (want('field')) {
  try {
    sr.deselect();
    sr.setStage('local-group');
    await sleep(8000);
    let MAN = null;
    try { MAN = await (await fetch(new URL('data/deep/deepfield.json', document.baseURI))).json(); } catch (e) { out.problems.push('no deepfield.json: ' + e); }
    if (MAN) {
      const dir = MAN.slices[2].centre.dir;
      const at = (mly) => sr.stage.toScene({ x: dir[0] * mly * MLY_KM, y: dir[1] * mly * MLY_KM, z: dir[2] * mly * MLY_KM }, 'sun-inertial');
      const sun = sr.stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial');
      const toSun = (p) => unit({ x: sun.x - p.x, y: sun.y - p.y, z: sun.z - p.z });
      const units = (mly) => mly * MLY_KM / sr.stage.unitKm;
      const field = () => { const L = layerRow('galclusters'); return L ? { field: L.field, calls: L.calls } : null; };
      const mid = at(16000);
      const side = unit(cross(toSun(mid), { x: 0, y: 1, z: 0 }));
      for (const on of [false, true]) {
        try { sr.deep.debug({ far: on }); } catch { /* older */ }
        rig.flyTo({ targetScene: mid, offset: side, distance: units(12000), ms: 0 });
        await scene(`field-side-${on ? 'after' : 'before'}`, `the Hubble Ultra Deep Field from 12 billion light-years beside its line, ${on ? 'AFTER (JADES\'s galaxies at their redshifts: a needle 3 arcminutes wide)' : 'BEFORE (main: nothing there)'}; ${JSON.stringify(field())}`, 6000);
      }
      try { sr.deep.debug({ far: true }); } catch { /* older */ }
      const z2 = at(17300);
      rig.flyTo({ targetScene: z2, offset: toSun(z2), distance: units(150), ms: 0 });
      const inside = await scene('field-inside-out', `inside the deep field at redshift 2 (17.2 billion light-years out), looking further out along it; ${JSON.stringify(field())}`, 6000);
      const back = at(17000);
      rig.flyTo({ targetScene: back, offset: { x: -toSun(back).x, y: -toSun(back).y, z: -toSun(back).z }, distance: units(150), ms: 0 });
      await scene('field-inside-back', `inside the deep field at redshift 2, looking back toward the Sun; ${JSON.stringify(field())}`, 6000);
      const f = field();
      if (!f || !f.field || !f.field.some((s) => s.culled === null)) out.problems.push('the deep field was never drawn: ' + JSON.stringify(f));
      void inside;
    }
  } catch (e) { look.errors.push('probe: field threw: ' + (e && e.stack || e)); }
}

try { sr.clock.setPaused(false); sr.clock.live(); } catch { /* left */ }
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
