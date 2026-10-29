// r15-a6: release 1.5.0, stages A6 and A13 (internal #1064, #1073). One probe, every state:
//
//   A13  the exoplanets layer ON as the page boots (and the packed file that fills it), the stellar rung with
//        their marks, the directly imaged planets in 3D round their stars (HR 8799, Beta Pictoris, 51 Eridani,
//        PDS 70, AF Leporis) on their own stages;
//   A6   the observatories on the Earth (3 850 marks) and a card with its MPC code, the launch sites, the Moon with its
//        landing and impact sites switched on, Ranger 7's crater, Venus with Venera 9, a small-body event with no
//        place (DART), the Draconids' radiant in the sky view on the night of 9 October, 3I/ATLAS beside 1I and 2I,
//        Kamoo'alewa, and the cards of a shower and of MMX.
//
// Beside each picture (out.json `scenes`) the card's first words, the layer states, the stage, and the renderer's counts.
// Run at 1600 x 900 and again with `-f mobile=true`.
look.probe = 'r15-a6';
const out = { scenes: [], problems: [] };
const cardText = () => { const el = document.querySelector('#sr-card'); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, 260) : null; };
const layerState = () => {
  const o = {};
  for (const id of ['exoplanets', 'systems', 'observatories', 'launch-sites', 'landing-sites', 'meteor-showers', 'hand-kept-sites', 'far-bodies']) {
    try { o[id] = sr.isLayerOn(id); } catch { o[id] = null; }
  }
  return o;
};
const snap = async (name, note, settleMs = 3500) => {
  await sleep(settleMs);
  const row = { name, note, stage: sr.stage.worldId, selected: sr.selected ? (sr.selected() || {}).id || null : null, card: cardText(), layers: layerState(), cost: frameCost() };
  out.scenes.push(row);
  await shot(name, `${note} | stage ${row.stage}, ${row.cost ? row.cost.calls : '?'} calls`);
  return row;
};
const need = (cond, msg) => { if (!cond) out.problems.push(msg); return cond; };
const on = (id) => { try { if (!sr.isLayerOn(id)) sr.setLayerOn(id, true); } catch { out.problems.push(`no layer ${id}`); } };
const hasRecord = (id) => !!sr.recordById(id);

// --- A13: the page as it boots --------------------------------------------------------------
out.bootLayers = layerState();
need(out.bootLayers.exoplanets === true, 'the exoplanets layer is not ON as the page boots');
// the layers that load after the first screen
need(await until(() => hasRecord('exo-proxima-cen-b') && hasRecord('exo-hr-8799-b'), 60000), 'the packed exoplanets never arrived (exo-proxima-cen-b)');
const packed = (() => { try { return performance.getEntriesByType('resource').filter((e) => /exoplanets\.(bin|csv)|exoplanets\.json/.test(e.name)).map((e) => ({ url: e.name.split('/').slice(-2).join('/'), transfer: e.transferSize, decoded: e.decodedBodySize })); } catch { return []; } })();
out.exoplanetFiles = packed;
need(packed.some((p) => /exoplanets\.bin/.test(p.url)), 'exoplanets.bin was not fetched');
await snap('01-home', 'the first screen: the Earth, as before; the planets layer is on but drawn only from the ladder');

sr.setStage('stellar');
await snap('02-stellar-planets', 'the stellar rung with the planets round other stars ON by default (6 423 marks)', 7000);
await go('exo-proxima-cen-b', '03-proxima-b', 7000, 'Proxima b: found in the packed file, its card');

// --- A13: the directly imaged planets in 3D round their stars ---------------------------------
for (const [sid, nm] of [['hr-8799', 'HR 8799 b, c, d, e'], ['beta-pictoris', 'Beta Pictoris b, c, d'], ['51-eri', '51 Eridani b'], ['pds-70', 'PDS 70 b and c'], ['af-lep', 'AF Leporis b']]) {
  // selecting the star is the way in (main.js sets the system's stage and scene/systems.js builds it); the first look run set the stage by hand and the three new systems were not built
  if (!(await go(`star-${sid}`, null, 12000))) { out.problems.push(`no star system ${sid}`); continue; }
  await snap(`04-system-${sid}`, `${nm} drawn at their own scale round the star`, 3000);
}

// --- A6: the Earth, observatories and launch sites --------------------------------------------
sr.setStage('earth');
on('observatories'); on('launch-sites');
need(await until(() => hasRecord('obs-q191684'), 45000), 'the observatories never loaded (Palomar)');
await sleep(2000);
await go('obs-q191684', '10-palomar', 8000, 'Palomar Observatory, MPC 675, with the 3 850 observatories on');
await go('launch-site-baikonur-cosmodrome', '11-baikonur', 7000, 'Baikonur, a launch site');

// --- A6: the Moon, Venus and a small body ------------------------------------------------------
on('landing-sites');
need(await until(() => hasRecord('moon-ranger-7') && hasRecord('venera-9'), 30000), 'the landing sites never loaded');
await go('moon-ranger-7', '20-ranger-7', 8000, 'Ranger 7 impact site on the Moon');
await go('moon-luna-25', '21-luna-25', 7000, 'Luna 25 impact site');
sr.setStage('moon');
await snap('22-moon-all-sites', 'the Moon with every landing and impact site switched on', 6000);
sr.setStage('venus');
await sleep(6000);
try {
  const R = 6051.8 / sr.stage.unitKm;
  rig.flyTo({ offset: mix(sunward('venus'), 1, north('venus'), 0.25), distance: R * 3.2, ms: 0 });
} catch (e) { out.problems.push('venus framing: ' + e); }
await snap('23-venus-sites', 'Venus from its sunlit side with the seventeen landing and descent sites switched on', 5000);
await go('venera-9', '23b-venera-9', 8000, 'Venera 9 on Venus');
sr.setStage('earth');
await sleep(3000);
await go('dart-dimorphos', '24-dart', 3000, 'DART: a site with no place to mark; the card says so');
await go('mmx-phobos', '25-mmx', 3000, 'MMX: a landing to come');

// --- A6: the visitors and Tianwen-2's target ----------------------------------------------------
for (const [id, nm] of [['interstellar-3i', '30-3i-atlas'], ['interstellar-2i', '31-2i-borisov'], ['asteroid-469219', '32-kamooalewa']]) await go(id, nm, 8000, id);

// --- A6: a meteor shower, its card and its radiant -----------------------------------------------
await go('shower-october-draconids', '40-draconids-card', 3000, 'a shower: a card and no mark');
try {
  sr.clock.setPaused(true);
  sr.clock.goTo(Date.UTC(2026, 9, 9, 18, 30));
  await sleep(1500);
  sr.skyView.enter({ latDeg: 50, lonDeg: 10, altKm: 0.2 });
  sr.skyView.setFov(70, { instant: true });
  sr.skyView.lookAtDeg(298, 58); // the Draconids' radiant is at azimuth 298, altitude 64 from there and then
  await snap('41-draconids-radiant', 'the sky view from 50 N 10 E at 20:30 CEST on 9 October 2026: the October Draconids\' radiant marked', 9000);
  out.sky = { radiantsOn: sr.isLayerOn('meteor-showers') };
  sr.skyView.exit();
} catch (e) { out.problems.push('sky view: ' + e); }
try { sr.clock.setPaused(false); sr.clock.live(); } catch { /* left as it was */ }

const fail = out.problems.length ? out.problems.join(' | ') : undefined;
return finish({ ...out, fail });
