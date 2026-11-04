// hero-cycles: a deep-space hero gives its memory back after ten visits (internal #834, the package's DS-E03:
// "GPU memory returns within budget after 10 visit/depart cycles"). The real renderer's twin of
// tests/test_hero_cycles.mjs, which counts the scene graph in node.
//
// One hero (`-f subject=<hero id>`, default helix; ids: HEROES below). Ten times: go to it and stand a third of the
// arrival distance away until it is drawn at level 2 or more and the scene is idle (sr.perf.whenIdle), then go
// 2000 arrival distances out for twelve seconds, which is past the ten after which a hero at level 0 is disposed.
// After every departure it writes down what the renderer holds (renderer.info.memory: geometries and textures, and
// programs), sr.perf's estimate of the scene graph in MiB and the GPU's own time for a frame where the browser has a
// timer query (sr.perf.stats().gpuTime). It fails when the tenth departure holds more than the first by more than
// two geometries or textures, or more than 2 MiB of the estimate, or when a visit never found the hero drawn.
// ON A RUNNER the GL is SwiftShader's: the counts are exact, the times are relative.
// Run it at `-f width=1600 -f height=900`.
look.probe = 'hero-cycles';
const HEROES = { helix: 'dso-helix-nebula', lmc: 'dso-lmc', orion: 'dso-m42', m57: 'dso-m57', carina: 'dso-carina-nebula', smc: 'dso-smc' };
const subject = new URLSearchParams(location.search).get('lookSubject') || 'helix';
const out = { hero: subject, cycles: [], problems: [] };
const CYCLES = 10;
const LEAVE_MS = 12000;
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
if (!HEROES[subject]) return finish({ fail: `no hero "${subject}" in this probe: ${Object.keys(HEROES).join(', ')}` });
try { if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit(); } catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
await until(() => !!sr.recordById(HEROES[subject]), 120000);
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
const rec = sr.recordById(HEROES[subject]);
if (!rec) return finish({ fail: 'missing record ' + HEROES[subject] });
if (rec.layer && !sr.isLayerOn(rec.layer)) sr.setLayerOn(rec.layer, true);

const heroRow = () => { try { return (sr.deep.stats().heroes || []).find((h) => h.id === subject) || null; } catch { return null; } };
const memory = () => {
  const i = sr.renderer.info;
  const s = sr.perf ? sr.perf.stats() : null;
  return { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs ? i.programs.length : null, sceneMiB: s ? s.gpu.totalMiB : null, visibleMiB: s ? s.gpu.visibleMiB : null, gpuTimeP50Ms: s && s.gpuTime ? s.gpuTime.p50Ms : null, gpuTimeSupported: s && s.gpuTime ? s.gpuTime.supported : null };
};
const idle = async (cap) => (sr.perf && sr.perf.whenIdle ? sr.perf.whenIdle(cap, 5) : { idle: !!(sr.deep && sr.deep.whenReady && await sr.deep.whenReady(cap)), waiting: [] });

sr.select(rec, { fly: true, undo: false });
await sleep(10000);
const d0 = rig.state.distance;
out.arrivalUnits = d0;
for (let c = 1; c <= CYCLES; c += 1) {
  rig.flyTo({ distance: d0 * 0.35, ms: 0 });
  await sleep(1500);
  if (sr.perf) sr.perf.mark();
  const settled = await idle(15000);
  await sleep(1500);
  const there = heroRow();
  const drawn = !!(there && there.loaded && there.level >= 2);
  const visit = { cycle: c, drawn, level: there ? there.level : null, idle: settled.idle, waiting: settled.waiting, atHero: memory() };
  rig.flyTo({ distance: d0 * 2000, ms: 0 });
  await sleep(LEAVE_MS);
  const gone = heroRow();
  visit.disposed = !!(gone && !gone.loaded);
  visit.afterDeparture = memory();
  out.cycles.push(visit);
  await shot(`${String(c).padStart(2, '0')}-${subject}-gone`, `after departure ${c}: ${visit.afterDeparture.geometries} geometries, ${visit.afterDeparture.textures} textures, scene ~${visit.afterDeparture.sceneMiB} MiB`, 0);
}
const first = out.cycles[0].afterDeparture; const last = out.cycles[CYCLES - 1].afterDeparture;
out.growth = { geometries: last.geometries - first.geometries, textures: last.textures - first.textures, programs: last.programs === null ? null : last.programs - first.programs, sceneMiB: last.sceneMiB === null ? null : Math.round((last.sceneMiB - first.sceneMiB) * 100) / 100 };
for (const v of out.cycles) {
  if (!v.drawn) out.problems.push(`visit ${v.cycle}: the hero was not drawn at level 2 or more (level ${v.level}); the cycle proved nothing`);
  if (!v.disposed) out.problems.push(`departure ${v.cycle}: the hero is still loaded after ${LEAVE_MS / 1000} s`);
}
if (out.growth.geometries > 2 || out.growth.textures > 2) out.problems.push(`the tenth departure holds ${out.growth.geometries} more geometries and ${out.growth.textures} more textures than the first`);
if (out.growth.sceneMiB !== null && out.growth.sceneMiB > 2) out.problems.push(`the tenth departure holds ${out.growth.sceneMiB} MiB more of the scene than the first (budget 2)`);
const fail = out.problems.length ? out.problems.join('; ') : undefined;
return finish({ ...out, fail });
