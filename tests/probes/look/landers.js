// landers: the landing and impact sites of release 1.7.3 (internal #1076, #1077; public #267), looked at.
//   1. Venus from its sunlit side with the Venera and VEGA sites; Venera 13's card at its landing, opened as a link
//      (#event=venera-13.landing: the file of the landers' events is fetched by the link);
//   2. the Moon with the Ranger, Surveyor and Luna sites; Ranger 7's card at its impact;
//   3. Mars: Viking 1's card at its touchdown, with NASA's own model of the lander;
//   4. THE GROUND PATCH under Surveyor 3, near and far (public #267: "a hard edge"): selected and flown to as a click
//      does, then the camera pulled away by steps of the arrival distance, a picture at each, and the patch's own
//      opacity read at each (the patch is a hero's child: `sr.heroes`). On a ref without the fade the reading says 1.
// Ids that exist on main as well (surveyor-3, viking-1) so the same probe photographs main for the BEFORE:
//   gh workflow run look.yml -f probe=landers -f ref=main
//   gh workflow run look.yml -f probe=landers -f ref=r173-landers
// Run at -f width=1200 -f height=800.
look.probe = 'landers';
const out = { scenes: [], problems: [], patch: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent.replace(/\s+/g, ' ').trim().slice(0, 700) : null; };
const need = (cond, msg) => { if (!cond) out.problems.push(msg); return cond; };
const on = (id) => { try { if (!sr.isLayerOn(id)) sr.setLayerOn(id, true); } catch { out.problems.push(`no layer ${id}`); } };
const has = (id) => !!sr.recordById(id);
const snap = async (name, note, settle = 0) => {
  out.scenes.push({ name, note, stage: sr.stage.worldId, selected: sr.selected ? (sr.selected() || {}).id || null : null, mission: text('.sr-mission') });
  await shot(name, note, settle);
};
const camState = () => (typeof rig.state === 'function' ? rig.state() : rig.state) || {};
const patchOpacity = () => {
  // The patch is a child of the selected hero's model; read the first material that carries a baseOpacity.
  try {
    let found = null;
    sr.scene.traverse((n) => { if (!found && n.name === 'ground-patch') found = n; });
    if (!found) return null;
    const mats = []; found.traverse((n) => { if (n.material) mats.push(n.material); });
    const soft = mats.find((m) => m.userData && m.userData.alwaysTransparent) || mats[0];
    return soft ? { opacity: +soft.opacity.toFixed(3), visible: found.visible, scale: +found.scale.x.toFixed(4) } : null;
  } catch { return null; }
};

const P = await import(new URL('./js/propagate/index.js', document.baseURI).href);
const dot = (a, c) => a.x * c.x + a.y * c.y + a.z * c.z;
/** From a world's centre to a site on it, in the scene, now. */
const dirOf = (id, world) => {
  const t = sr.clock.now(); const rec = sr.recordById(id); const p = P.propagate(rec, t); const pos = sr.stage.toScene(p, p.frame, t);
  const c = sr.worlds.meshFor(world).position; return unit({ x: pos.x - c.x, y: pos.y - c.y, z: pos.z - c.z });
};
/** Put the clock where the Sun is highest over a site: the best of `n` instants `stepMs` apart. */
const lightUp = async (id, world, stepMs, n) => {
  let best = null; const t0 = sr.clock.now();
  for (let k = 0; k < n; k++) {
    sr.clock.goTo(t0 + k * stepMs); await sleep(300);
    const c = dot(dirOf(id, world), sunward(world));
    if (!best || c > best.c) best = { c, t: t0 + k * stepMs };
  }
  sr.clock.goTo(best.t); await sleep(1500); out.lit = out.lit || {}; out.lit[id] = +best.c.toFixed(3);
  return best;
};
try { sr.clock.setPaused(true); sr.clock.goTo(Date.UTC(2026, 9, 15, 12, 0)); } catch { /* the clock stays live */ }

// --- Venus ---------------------------------------------------------------------------------------------------
on('landing-sites');
need(await until(() => has('venera-13') && has('moon-ranger-7'), 60000), 'the landing sites never loaded');
sr.setStage('venus');
await sleep(6000);
if (await go('venera-13', null, 6000)) {
  await lightUp('venera-13', 'venus', 2 * 86400e3, 80);
  try { rig.flyTo({ offset: dirOf('venera-13', 'venus'), distance: (6051.8 / sr.stage.unitKm) * 2.6, ms: 0 }); } catch (e) { out.problems.push('venus framing: ' + e); }
  await snap('01-venus-sites', 'Venus with the Sun over the Venera 13 site, seen from straight above it: the Venera and VEGA sites round it, each a mark (nothing is drawn there but a mark)', 6000);
}
location.hash = '#event=venera-13.landing';
const cardUp = await until(() => /Venera 13/.test(text('.sr-mission') || ''), 60000);
if (!cardUp) out.problems.push('the link #event=venera-13.landing never opened a card with the Venera 13 events (the landers\' file did not load?)');
await sleep(6000);
await snap('02-venera-13-landing', 'Venera 13 at its landing, opened by the link: the clock is at 03:57 UTC on 1 March 1982 and the card lists its events', 3000);
out.venera13Card = text('.sr-card');

// --- The Moon ------------------------------------------------------------------------------------------------
location.hash = '';
sr.setStage('moon');
await sleep(6000);
if (await go('surveyor-3', null, 6000)) {
  await lightUp('surveyor-3', 'moon', 86400e3, 30);
  try { rig.flyTo({ offset: dirOf('surveyor-3', 'moon'), distance: (1737.4 / sr.stage.unitKm) * 1.7, ms: 0 }); } catch (e) { out.problems.push('moon framing: ' + e); }
  await snap('03-moon-sites', 'the Moon with the Sun over Oceanus Procellarum, from straight above Surveyor 3: the Surveyor, Ranger, Luna, Lunokhod and Apollo sites round it', 6000);
}
location.hash = '#event=ranger-7.impact';
await until(() => /Ranger 7/.test(text('.sr-mission') || ''), 60000);
await sleep(7000);
await snap('04-ranger-7-impact', 'Ranger 7 at its impact (13:25 UTC, 31 July 1964): a mark and a card', 3000);

// --- Mars ----------------------------------------------------------------------------------------------------
location.hash = '';
sr.setStage('mars');
await sleep(5000);
if (has('viking-1')) {
  await go('viking-1', null, 9000);
  location.hash = '#event=viking-1.landing';
  await until(() => /Viking 1/.test(text('.sr-mission') || ''), 60000);
  await sleep(7000);
  await snap('05-viking-1-landing', 'Viking 1 at its touchdown with NASA\'s own model of the lander; the card lists its events', 3000);
}

// --- The ground patch, near and far ----------------------------------------------------------------------------
location.hash = '';
sr.setStage('moon');
await sleep(5000);
if (await go('surveyor-3', null, 9000)) {
  const d0 = camState().distance;
  out.arrivalDistance = d0;
  const steps = [['06-patch-arrival', 1, 'Surveyor 3 as met: the camera at the arrival distance'], ['07-patch-near', 0.12, 'Surveyor 3 from close, the camera at 12 % of the arrival distance'],
    ['08-patch-2', 2, 'pulled away to twice the arrival distance: the fade has begun (it starts at 1.7 times)'],
    ['09-patch-3.5', 3.5, 'at 3.5 times: the patch is half gone'], ['10-patch-5.5', 5.5, 'at 5.5 times (0.6 of the layer\'s nearKm): no patch; the model is still drawn because it is selected'],
    ['11-patch-9', 9, 'at 9 times: far out, the lander on the shrunk Moon with no plate under it']];
  for (const [name, k, note] of steps) {
    try { rig.flyTo({ distance: d0 * k, ms: 0 }); } catch (e) { out.problems.push('pull away: ' + e); }
    await sleep(4500);
    const p = patchOpacity();
    out.patch.push({ name, k, distanceUnits: +(d0 * k).toFixed(4), patch: p });
    await snap(name, `${note} | patch ${p ? 'opacity ' + p.opacity : 'not found'}`, 1500);
  }
} else out.problems.push('surveyor-3 is not on the map');

try { sr.clock.setPaused(false); sr.clock.live(); } catch { /* left as it was */ }
const fail = out.problems.length ? out.problems.join(' | ') : undefined;
return finish({ ...out, fail });
