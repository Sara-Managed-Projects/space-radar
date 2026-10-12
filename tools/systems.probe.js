// The star systems walk (internal #466): six systems framed, a planet's card, and what was fetched when.
//
//   python3 tools/serve.py site 8466 &
//   node tools/cdp.mjs 'http://127.0.0.1:8466/index.html?sw=0' tools/systems.probe.js --width=1440 --height=900 \
//     --gl=gpu --block=celestrak.org,ll.thespacedevs.com --shot-dir=/tmp/systems
//
// Each system is chosen as a visitor would from the search box: its star's record is selected, the
// rows are fetched if this is the first, the stage changes and the camera arrives with every orbit
// in the picture. `window.__systemsWalk = ['kepler-186', ...]` before the run names other systems;
// `window.__systemsPlanet` the planet whose card is photographed.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(200); } return false; };
// The keys hint a first visit is shown is not this probe's subject: say it has been seen.
try { localStorage.setItem('sr:keyhint', '1'); } catch { /* no storage: the hint shows */ }
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + String(e.reason)));
const fetched = (name) => performance.getEntriesByType('resource').filter((r) => r.name.includes(name)).map((r) => Math.round(r.startTime));
await until(() => window.__srLayersReady && window.spaceRadar, 90000);
const ctx = window.spaceRadar;
const out = { atLayersReady: { index: fetched('systems-index'), table: fetched('systems-table'), extras: fetched('systemextras') }, systems: {}, errors };
// `?probe=go` with `#go=<id>` in the address: the deep link's own flight, photographed where it
// lands, and then the whole system. Nothing is selected by the probe before the link has been.
if (/[?&]probe=go\b/.test(location.search)) {
  const landed = await until(() => ctx.systems.active && ctx.selected(), 120000);
  await sleep(7000);
  out.go = { landed, selected: ctx.selected() && ctx.selected().id, stage: ctx.systems.stats().system, hash: location.hash, table: fetched('systems-table').length };
  if (window.cdpShot) await window.cdpShot('go-arrival');
  const m = ctx.selected();
  const star = m && ctx.recordById(`star-${ctx.systems.stats().system}`);
  if (star) { ctx.select(star, { fly: true }); await sleep(7000); if (window.cdpShot) await window.cdpShot('go-system'); }
  return out;
}
await ctx.loadAfterFirstVisit();
out.afterLaterLayers = { index: fetched('systems-index').length, table: fetched('systems-table').length, firstVisitOver: window.__srFirstVisitOver ? Math.round(window.__srFirstVisitOver - performance.timeOrigin) : null };
const ids = window.__systemsWalk || ['kepler-186', 'lhs-1140', 'kepler-452', '55-cnc', 'kepler-16', 'hr-8799'];
for (const id of ids) {
  const star = ctx.recordById(`star-${id}`);
  if (!star) { out.systems[id] = 'no star record'; continue; }
  ctx.select(star, { fly: true });
  const ok = await until(() => ctx.systems.active && ctx.systems.stats().system === id, 20000);
  await sleep(5000);
  const st = ctx.systems.stats();
  out.systems[id] = { ok, stage: ctx.stage ? ctx.stage.worldId : null, triangles: st.triangles, rings: st.rings, selected: ctx.selected() && ctx.selected().id };
  if (window.cdpShot) await window.cdpShot(`system-${id}`);
}
out.tableFetchedAt = fetched('systems-table');
const planet = ctx.recordById(window.__systemsPlanet || 'exo-kepler-186-f');
if (planet) {
  ctx.select(planet, { fly: true });
  await until(() => ctx.systems.active && ctx.selected() === planet, 20000);
  await sleep(6000);
  // Open "About it": the rows that say what is measured are there.
  for (const b of document.querySelectorAll('.sr-card button, .sr-card summary')) if (/About it/.test(b.textContent)) { b.click(); break; }
  await sleep(1200);
  const card = document.querySelector('.sr-card');
  out.card = card ? card.innerText.slice(0, 2500) : 'no card element';
  out.hash = location.hash;
  if (window.cdpShot) await window.cdpShot('card-planet');
}
return out;
