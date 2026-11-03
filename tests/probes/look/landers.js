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

try { sr.clock.setPaused(true); sr.clock.goTo(Date.UTC(2026, 9, 15, 12, 0)); } catch { /* the clock stays live */ }

// --- Venus ---------------------------------------------------------------------------------------------------
on('landing-sites');
need(await until(() => has('venera-13') && has('moon-ranger-7'), 60000), 'the landing sites never loaded');
sr.setStage('venus');
await sleep(6000);
try {
  const R = 6051.8 / sr.stage.unitKm;
  rig.flyTo({ offset: mix(sunward('venus'), 1, north('venus'), 0.25), distance: R * 3.2, ms: 0 });
} catch (e) { out.problems.push('venus framing: ' + e); }
await snap('01-venus-sites', 'Venus from its sunlit side with the Venera and VEGA landing sites (marks: nothing is drawn there but a mark)', 5000);
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
try {
  const R = 1737.4 / sr.stage.unitKm;
  rig.flyTo({ offset: mix(sunward('moon'), 1, north('moon'), 0.3), distance: R * 3.0, ms: 0 });
} catch (e) { out.problems.push('moon framing: ' + e); }
await snap('03-moon-sites', 'the Moon with the Ranger, Surveyor, Luna, Lunokhod and Chang\'e sites', 5000);
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
    ['08-patch-1.6', 1.6, 'pulled away to 1.6 times the arrival distance (0.56 of the layer\'s nearKm): the fade has begun'],
    ['09-patch-2.3', 2.3, 'at 2.3 times (0.8 of nearKm): the patch is nearly gone'], ['10-patch-3.0', 3.0, 'at 3 times (1.05 of nearKm): no patch; the model is still drawn because it is selected']];
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
