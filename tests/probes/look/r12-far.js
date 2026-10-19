// r12-far: galaxy clusters and quasars (release 1.2.0 stage W4-b, internal spec 0076, internal #784). On the Local Group's stage:
// Virgo from the Local Group (60 million light-years nearer the Sun than its centre) and from inside (3 Mly from its centre), Coma from
// the Sun at its 334 million light-years, from 60 Mly turned 45 degrees off our line and from 40 Mly turned 80 degrees (its depth: a
// swarm, not a sheet), the same under the Measured look; Fornax and Perseus from 40 Mly; then 3C 273 as a point from the Sun, from
// 0.7 Mly (its host galaxy, 29 arcseconds across from here), its card (the light-travel words), and 3C 279, a point without a host.
//
// THE BEFORE IN THE SAME RUN. Where the layer draws, the pose is photographed twice: first with the layer held off
// (`sr.deep.debug({ far: false })`: main's picture of that place, where Virgo's Messier galaxies are separate glows and a quasar is a
// marker), then with it on. The numbers beside each picture: the camera's distance from the subject in million light-years, the layer's
// own stats (sr.deep.stats() layers: each cluster's radius on screen, its crowd and fade, the draw calls), the renderer's counts, sr.perf
// where it exists, and the median and 95th percentile of 20 frame intervals (SwiftShader on a runner: relative numbers only).
// Fails when the layer never loaded, when Virgo is not drawn from the Local Group or Coma from 60 Mly, or when 3C 273 is not drawn.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-far';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const MLY_KM = LY_KM * 1e6;

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
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const textOf = (sel, n = 400) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const layerStats = () => { try { return (sr.deep.stats().layers || []).find((l) => l.id === 'galclusters') || null; } catch (e) { return { error: String(e) }; } };
const perf = () => { try { return sr.perf && sr.perf.stats ? sr.perf.stats() : null; } catch { return null; } };
const farOn = (on) => { try { sr.deep.debug({ far: on }); } catch (e) { look.warns.push('debug: ' + e); } };

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  out.laterLayers = await until(() => !!sr.recordById('exotic-3c-273'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
try { if (sr.wantPerf) await sr.wantPerf(); } catch (e) { look.warns.push('wantPerf: ' + e); }
let MAN = null;
try { MAN = await (await fetch(new URL('data/deep/galclusters.json', document.baseURI))).json(); } catch (e) { out.problems.push('no galclusters.json: ' + e); }
if (!MAN) { out.fail = out.problems.join('; '); return finish(out); }

sr.setStage('local-group');
await sleep(6000);
const unitKm = () => sr.stage.unitKm;
const toScene = (km) => sr.stage.toScene(km, 'sun-inertial');
const SUN = () => toScene({ x: 0, y: 0, z: 0 });
const clusterScene = (id) => {
  const c = MAN.clusters.find((x) => x.id === id);
  const r = c.distMly * MLY_KM;
  return toScene({ x: c.centre.dir[0] * r, y: c.centre.dir[1] * r, z: c.centre.dir[2] * r });
};
const quasarScene = (id) => { const r = sr.recordById('exotic-' + id); return r ? toScene(r.pos) : null; };
const mly = (u) => Math.round((u * unitKm() / MLY_KM) * 100) / 100;
/** A pose round a subject (scene units): `deg` off the line to the Sun, `distMly` from it, looking at it. */
let subject = { name: '', at: null };
const pose = (at, deg, distMly) => {
  const S = SUN();
  const toSun = unit(sub(S, at));
  const side = unit(cross(toSun, { x: 0, y: 1, z: 0 }));
  const a = deg * Math.PI / 180;
  rig.flyTo({ targetScene: at, offset: unit(mix(toSun, Math.cos(a), side, Math.sin(a))), distance: distMly * MLY_KM / unitKm(), ms: 0 });
};
const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const ready = sr.deep && sr.deep.whenReady ? await sr.deep.whenReady(20000) : null;
  const f = await frames();
  const d = subject.at ? mly(Math.hypot(...Object.values(sub(sr.camera.position, subject.at)))) : null;
  const L = layerStats();
  const row = { name, note, ready, subject: subject.name, stage: sr.stage.worldId, distanceMly: d, layer: L, cost: frameCost(), perf: perf(), card: textOf('#sr-card', 700), ...f };
  out.scenes.push(row);
  const cl = L && L.clusters ? L.clusters.filter((c) => c.culled === null).map((c) => `${c.id} ${c.radiusPx}px fade ${c.fade}`).join(', ') : '';
  await shot(name, `${note} | ${d} Mly from ${subject.name}; ${cl || 'no cluster drawn'}; ${L ? L.calls : '?'} layer calls, ${row.cost ? row.cost.calls : '?'} in all, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const pair = async (name, note) => {
  farOn(false);
  await snap(`${name}-before`, `BEFORE (main: the layer off): ${note}`);
  farOn(true);
  return snap(`${name}-after`, `AFTER (the layer): ${note}`, 5000);
};
const drawn = (row, id) => !!(row.layer && row.layer.clusters && row.layer.clusters.some((c) => c.id === id && c.culled === null));

// ---- the clusters ---------------------------------------------------------------------------------
subject = { name: 'Virgo', at: clusterScene('virgo') };
pose(subject.at, 0, 60);
const virgoFar = await pair('virgo-from-here', 'Virgo from the Local Group, 60 million light-years nearer us than its centre');
if (!drawn(virgoFar, 'virgo')) out.problems.push('Virgo is not drawn from the Local Group');
pose(subject.at, 50, 3);
await pair('virgo-inside', 'inside Virgo, 3 million light-years from its centre, 50 degrees off our line');

subject = { name: 'Coma', at: clusterScene('coma') };
pose(subject.at, 0, MAN.clusters.find((c) => c.id === 'coma').distMly);
await pair('coma-from-the-sun', 'Coma from the Sun, at its own distance (what a telescope on Earth sees, with every galaxy shown)');
pose(subject.at, 45, 60);
const coma60 = await pair('coma-60', 'Coma from 60 million light-years, 45 degrees off our line');
if (!drawn(coma60, 'coma')) out.problems.push('Coma is not drawn from 60 Mly');
pose(subject.at, 80, 40);
farOn(true);
await snap('coma-side', 'Coma from 40 million light-years, turned 80 degrees round its centre: a swarm in depth, not a sheet', 5000);
try { sr.drawn.set('measured'); pose(subject.at, 45, 60); await snap('coma-60-measured', 'the Measured look at the same place: the same galaxies, nothing moves', 5000); } finally { sr.drawn.set('film'); }

for (const [id, label] of [['fornax', 'Fornax'], ['perseus', 'Perseus']]) {
  subject = { name: label, at: clusterScene(id) };
  pose(subject.at, 30, 40);
  await snap(`${id}-40`, `${label} from 40 million light-years, 30 degrees off our line`, 5000);
}

// ---- the quasars ----------------------------------------------------------------------------------
const q273 = quasarScene('3c-273');
if (!q273) { out.problems.push('no record exotic-3c-273'); } else {
  subject = { name: '3C 273', at: q273 };
  const distMly = Math.hypot(...Object.values(sub(q273, SUN()))) * unitKm() / MLY_KM;
  pose(q273, 0, distMly);
  const a = await pair('3c273-from-the-sun', '3C 273 from the Sun, 2.2 billion light-years away: a bright point where the quasar is (its host is a fraction of a pixel across)');
  if (!(a.layer && a.layer.quasars && a.layer.quasars.some((q) => q.id === '3c-273' && q.culled === null))) out.problems.push('3C 273 is not drawn from the Sun');
  pose(q273, 20, 0.7);
  const b = await pair('3c273-near', '3C 273 from 0.7 million light-years: the point and its host galaxy at the size the source gives');
  if (!(b.layer && b.layer.quasars && b.layer.quasars.some((q) => q.id === '3c-273' && q.culled === null))) out.problems.push('3C 273 is not drawn from 0.7 Mly');
  farOn(true);
  await go('exotic-3c-273', '3c273-card', 9000, '3C 273 selected, as a visitor flies to it: its card with the distance, the light-travel words and what is drawn');
  out.scenes.push({ name: '3c273-card', card: textOf('#sr-card', 1200), layer: layerStats() });
}
const q279 = quasarScene('3c-279');
if (q279) {
  subject = { name: '3C 279', at: q279 };
  pose(q279, 20, 1);
  farOn(true);
  await snap('3c279-near', '3C 279 from 1 million light-years: a point, and no host because the source gives no size', 5000);
}

const L = layerStats();
out.layer = L;
if (!L || !L.loaded) out.problems.push(`the layer never loaded (${JSON.stringify(L)})`);
farOn(true);
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
