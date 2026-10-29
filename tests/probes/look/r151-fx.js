// r151-fx: the layers of release 1.5.0 that looked wrong, after the fix (release 1.5.1, stage fx-layers). ONE walk, the clock paused at
// 2026-10-29 12:00 UTC (the day of Ivan's pictures):
//   A. the comets (scene/cometfield.js) on the Sun's stage: the Sun from the side from 2.5 au (1.5.0: a bright band through its disc), the
//      Solar System from 40 au and from 120 au (1.5.0: cyan lines everywhere and a white beam from the Sun to a cluster of points), then
//      Halley selected, with its own orbit and the few famous ones;
//   B. the Hubble Ultra Deep Field's needle (scene/deep/galclusters.js) on the Local Group rung, from 6 000 and 12 000 million light-years
//      off its line (1.5.0: a dotted ray out of the Sun; now nothing of it), then along its own line from 19 000 million (the keyhole's
//      galaxies are drawn);
//   C. the Nearby stars rung (scene/deep/catalogue.js, the glyph of planets of other stars): from 40 light-years (a few clusters near the
//      Sun, plain green dots for the planets), from 400 and from 3 000 light-years (the clusters appear as the view reaches them), and the
//      galaxy rung from 30 kpc (the Milky Way's clusters and nebulae are there).
// Beside each picture the layers' counts and the renderer's calls. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r151-fx';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;
const AU_KM = 149597870.7;
sr.clock.goTo(Date.UTC(2026, 9, 29, 12, 0, 0));
sr.clock.setPaused(true);
const unit3 = (v) => { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m }; };
let n = 0;
const scene = async (tag, note, settleMs = 5000) => {
  await sleep(settleMs);
  try { if (sr.deep && sr.deep.whenReady && ['stellar', 'galaxy', 'local-group'].includes(sr.stage.worldId)) await sr.deep.whenReady(15000); } catch { /* the picture is still taken */ }
  n += 1;
  const name = `${String(n).padStart(2, '0')}-${tag}`;
  const row = {
    name, note, stage: sr.stage.worldId, distanceLy: Math.round((rig.state.distance * sr.stage.unitKm / LY_KM) * 1000) / 1000,
    comets: sr.cometField ? sr.cometField.state() : null, field: (() => { try { const l = (sr.deep.stats().layers || []).find((x) => x.id === 'galclusters'); return l ? l.field : null; } catch { return null; } })(),
    cost: frameCost(),
  };
  out.scenes.push(row);
  await shot(name, `${note} | ${row.stage}, ${row.distanceLy} ly, ${row.cost ? row.cost.calls : '?'} calls`);
  return row;
};

// ---- A: the comets ---------------------------------------------------------------------------------------------------------------------
try {
  sr.setLayerOn('comets', true);
  await stage('sun', 9000);
  await until(() => sr.cometField && sr.cometField.state().loaded && sr.cometField.state().visible, 180000, 500);
  const st = sr.cometField ? sr.cometField.state() : null;
  if (!st || !st.loaded) out.problems.push('the comet field never loaded: ' + JSON.stringify(st));
  else {
    out.cometCount = st.comets;
    rig.flyTo({ offset: unit3({ x: 1, y: 0.03, z: 0.08 }), distance: 2.5 * AU_KM / sr.stage.unitKm, ms: 0 });
    await scene('sun-side-2p5au', 'the Sun from the side from 2.5 au: no band through its disc', 6000);
    rig.flyTo({ offset: unit3({ x: 0.25, y: 0.9, z: 0.35 }), distance: 40 * AU_KM / sr.stage.unitKm, ms: 0 });
    await scene('system-40au', 'the Solar System from 40 au: a few faint orbits, the rest small points, no beam', 5000);
    rig.flyTo({ offset: unit3({ x: 0.5, y: 0.35, z: 0.8 }), distance: 120 * AU_KM / sr.stage.unitKm, ms: 0 });
    await scene('system-120au', 'from 120 au, off the plane', 4000);
    const halley = sr.recordsFor('comets').find((r) => /Halley/.test(r.name)) || sr.cometField.recordAt(0);
    if (halley) {
      sr.select(halley, { fly: true, undo: false });
      await sleep(9000);
      await scene('halley-selected', `${halley.name} selected: its orbit is the line to read`, 3000);
    }
    sr.deselect();
  }
} catch (e) { out.problems.push('comets: ' + String((e && e.stack) || e).slice(0, 400)); }

// ---- C: the Nearby stars rung ----------------------------------------------------------------------------------------------------------
try {
  sr.setLayerOn('comets', false);
  await stage('stellar', 9000);
  if (!sr.deep && sr.wantDeep) await sr.wantDeep();
  try { await sr.deep.loadCatalogue(); } catch (e) { out.problems.push('catalogue: ' + e); }
  rig.flyTo({ offset: unit3({ x: 0.3, y: 0.5, z: 0.8 }), distance: 40, ms: 0 });
  await scene('stellar-40ly', 'the Nearby stars rung from 40 light-years: stars, planets as plain green dots, a few clusters', 6000);
  rig.flyTo({ distance: 400, ms: 0 });
  await scene('stellar-400ly', 'from 400 light-years: the clusters a view that wide reaches', 4000);
  rig.flyTo({ distance: 3000, ms: 0 });
  await scene('stellar-3kly', 'from 3 000 light-years', 4000);
  await stage('galaxy', 9000);
  rig.flyTo({ offset: unit3({ x: 0.2, y: 0.95, z: 0.2 }), distance: 30, ms: 0 });
  await scene('galaxy-30kpc', 'the galaxy rung from 30 kpc: the Milky Way’s own clusters and nebulae', 6000);
} catch (e) { out.problems.push('stellar: ' + String((e && e.stack) || e).slice(0, 400)); }

// ---- B: the galaxy-clusters rung -------------------------------------------------------------------------------------------------------
try {
  await stage('local-group', 9000);
  if (!sr.deep && sr.wantDeep) await sr.wantDeep();
  rig.flyTo({ offset: unit3({ x: 0.3, y: 0.4, z: 0.8 }), distance: 6000, ms: 0 });
  await scene('clusters-6gly', 'the galaxy clusters from 6 000 million light-years: no dotted ray out of the Sun', 7000);
  rig.flyTo({ distance: 2500, ms: 0 });
  await scene('clusters-2p5gly', 'from 2 500 million light-years', 4000);
  // along the Hubble Ultra Deep Field's own line: from the Sun's side of it, looking out
  const MAN = await (await fetch(new URL('data/deep/deepfield.json', document.baseURI))).json();
  const d = MAN.slices[0].centre.dir;
  const toScene = (mly) => sr.stage.toScene({ x: d[0] * mly * 1e6 * LY_KM, y: d[1] * mly * 1e6 * LY_KM, z: d[2] * mly * 1e6 * LY_KM }, 'sun-inertial');
  const at = toScene(1000);
  rig.flyTo({ targetScene: toScene(8000), offset: unit3({ x: at.x - toScene(8000).x, y: at.y - toScene(8000).y, z: at.z - toScene(8000).z }), distance: 7000, ms: 0 });
  await scene('field-along', 'looking along the Hubble Ultra Deep Field from 1 000 million light-years: its galaxies are drawn', 7000);
} catch (e) { out.problems.push('clusters: ' + String((e && e.stack) || e).slice(0, 400)); }

const fail = out.problems.length && !out.cometCount ? out.problems.join(' | ') : undefined;
return finish({ ...out, fail });
