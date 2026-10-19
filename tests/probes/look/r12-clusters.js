// r12-clusters: star clusters as stars (release 1.2.0 stage W3-a, internal spec 0076, internal #819 and #871).
// Every pose is photographed twice in one run, BEFORE (the cluster layer switched off for the shot with
// `sr.deep.debug({ stars: false })`: the glow, its grain and the holder, as main draws a cluster today) and AFTER
// (the stars). The poses: Omega Centauri, M13 and 47 Tucanae far (three times the app's arrival distance), at
// arrival, and inside the outskirts (half the tidal radius from the centre, looking in); then the Pleiades, the
// Hyades and the Beehive at arrival and turned 60 degrees round their centre (the members' depth); then the
// Measured look and Low (T0) inside M13.
//
// Beside each picture: the camera's distance in light-years and in tidal radii, the layer's own numbers
// (sr.deep.stats() layers: what is drawn, its points, its share of the light, the holders' shares), the
// renderer's counts, sr.perf where it exists, and the median and 95th percentile of 20 frame intervals
// (SwiftShader on a runner: relative numbers only). It changes nothing in the app but that switch, which it
// puts back. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-clusters';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const ARCMIN = Math.PI / 10800;

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
const toLy = (u) => u * sr.stage.unitKm / LY_KM;
const textOf = (sel, n = 300) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const layerStats = () => { try { return (sr.deep.stats().layers || []).find((l) => l.id === 'clusters') || null; } catch (e) { return { error: String(e) }; } };
const holders = () => { try { return sr.deep.stats().holders || []; } catch { return null; } };
const perf = () => { try { return sr.perf && sr.perf.stats ? sr.perf.stats() : null; } catch { return null; } };

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
  out.laterLayers = await until(() => !!sr.recordById('dso-m13'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
try { if (sr.wantPerf) await sr.wantPerf(); } catch (e) { look.warns.push('wantPerf: ' + e); }
let MAN = null;
try { MAN = await (await fetch(new URL('data/deep/clusters.json', document.baseURI))).json(); } catch (e) { out.problems.push('no clusters.json: ' + e); }
const rtLy = (id) => {
  const g = MAN && MAN.globulars.find((x) => `dso-${x.id}` === id);
  const r = sr.recordById(id);
  return g && r ? g.rcArcmin * ARCMIN * r.meta.distLy * 10 ** g.c : null;
};
let OPEN = true;
try { OPEN = (await import(new URL('js/scene/deep/globular.js', document.baseURI).href)).OPEN_MEMBERS !== false; } catch { /* a ref from before the stage */ }
out.openMembers = OPEN;
const starsOn = (on) => { try { sr.deep.debug({ stars: on }); } catch (e) { look.warns.push('debug: ' + e); } };

let subjectId = null;
const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const H = subjectId ? pos(subjectId) : null;
  const dLy = H ? Math.round(toLy(Math.hypot(...Object.values(sub(sr.camera.position, H)))) * 10) / 10 : null;
  const rt = subjectId ? rtLy(subjectId) : null;
  const L = layerStats();
  const row = {
    name, note, ready, subject: subjectId, stage: sr.stage.worldId, distanceLy: dLy, inTidalRadii: rt && dLy ? Math.round(dLy / rt * 100) / 100 : null,
    radiusPx: subjectId && sr.deep.radiusPx ? Math.round(sr.deep.radiusPx(subjectId) || 0) : null,
    layer: L, holders: holders(), cost: frameCost(), perf: perf(),
    card: textOf('#sr-card', 600), hud: textOf('#sr-hud', 160), ...f,
  };
  out.scenes.push(row);
  const d = L && L.drawn ? L.drawn.find((x) => x.id === subjectId) : null;
  await shot(name, `${note} | ${dLy} ly${row.inTidalRadii ? ` (${row.inTidalRadii} rt)` : ''}, ${row.radiusPx} px radius, ${d ? `${d.points} stars, share ${d.share}, light taken ${d.taken}` : 'no stars drawn'}, ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pair = async (name, note) => {
  starsOn(false);
  await snap(`${name}-before`, `BEFORE (main: the glow and the holder): ${note}`);
  starsOn(true);
  const row = await snap(`${name}-after`, `AFTER (the stars): ${note}`, 5000);
  return row;
};
/** A pose round a record: `deg` off the line to the Sun, at `ly` from its centre, looking at it. */
const pose = (id, deg, ly) => {
  const H = pos(id), S = pos('sun') || { x: 0, y: 0, z: 0 };
  const toSun = unit(sub(S, H));
  const side = unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: H, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: ly * LY_KM / sr.stage.unitKm, ms: 0 });
};

for (const [id, label] of [['dso-omega-centauri', 'Omega Centauri'], ['dso-m13', 'M13'], ['dso-47-tucanae', '47 Tucanae']]) {
  if (!(await need(id))) continue;
  subjectId = id;
  const arrival = toLy(rig.state.distance);
  const rt = rtLy(id) || arrival;
  const key = id.replace('dso-', '');
  pose(id, 20, arrival * 3);
  await pair(`${key}-far`, `${label} far: three times the arrival distance, 20 degrees off our line`);
  pose(id, 20, arrival);
  const mid = await pair(`${key}-mid`, `${label} at the arrival distance, 20 degrees off our line: core and halo`);
  if (!(mid.layer && mid.layer.drawn && mid.layer.drawn.some((x) => x.id === id))) out.problems.push(`${id}: no stars at arrival`);
  pose(id, 60, 0.5 * rt);
  await pair(`${key}-inside`, `${label} inside the outskirts: half its tidal radius (${Math.round(0.5 * rt)} ly) from the centre, looking in`);
}

for (const [id, label] of [['dso-m45', 'the Pleiades'], ['dso-hyades', 'the Hyades'], ['dso-m44', 'the Beehive (M44)']]) {
  if (!(await need(id))) continue;
  subjectId = id;
  const arrival = toLy(rig.state.distance);
  const key = id.replace('dso-', '');
  await pair(`${key}-arrival`, `${label} at the app's framing: its members`);
  pose(id, 60, arrival);
  const turned = await pair(`${key}-turned60`, `${label} turned 60 degrees round its centre: the members' depth`);
  if (!(turned.layer && turned.layer.drawn && turned.layer.drawn.some((x) => x.id === id))) (OPEN ? out.problems : look.warns).push(`${id}: no members drawn${OPEN ? '' : ' (globular.js OPEN_MEMBERS is off)'}`);
}

if (await need('dso-m13')) {
  subjectId = 'dso-m13';
  pose('dso-m13', 60, 0.5 * (rtLy('dso-m13') || 100));
  starsOn(true);
  try { sr.drawn.set('measured'); await snap('m13-inside-measured', 'the Measured look inside M13: the same stars, nothing moves', 5000); } finally { sr.drawn.set('film'); }
  let choice = null;
  try {
    choice = sr.quality ? sr.quality.choice : null;
    if (sr.quality && sr.quality.setChoice) { sr.quality.setChoice('low'); await snap('m13-inside-low', 'Low quality (T0) inside M13: the brightest 3 000', 6000); }
  } catch (e) { look.warns.push('probe: Low: ' + e); } finally { try { if (sr.quality && sr.quality.setChoice) sr.quality.setChoice(choice || 'auto'); } catch { /* left */ } }
}
starsOn(true);

const L = layerStats();
out.layer = L;
if (!L || !L.loaded) out.problems.push(`the clusters' layer never loaded (${JSON.stringify(L)})`);
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
