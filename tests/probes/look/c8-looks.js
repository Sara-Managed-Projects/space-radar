// c8-looks: the Sun at its normal viewing distance, Venus, and a comet's tail near and far from the Sun (batch C8; internal #280, #281, #47, #31).
// Pictures: the Sun on its stage at arrival and closer, with the loops over today's regions off and on; Venus on its stage lit face on, then
// as a crescent-side view; a bright comet at about 0.5 au from the Sun and at about 1.4 au, selected, with its tail and the reported distance.
// The SAR satellites' sideways look is photographed with the `model` probe (subject sat-39766_sat-31598).
//   gh workflow run look.yml -f probe=c8-looks -f ref=<branch> -f width=1600 -f height=900
look.probe = 'c8-looks';
const out = { sun: {}, venus: {}, comet: {} };
// ---- the Sun ----------------------------------------------------------------------------------------------------------------------------
try {
  await stage('sun', 8000);
  await go('sun', null, 6000);
  out.sun.detail = await until(() => sr.sunDetail && sr.sunDetail.state().on, 60000);
  await until(() => sr.sunDetail && sr.sunDetail.state().regions > 0, 20000);
  try { sr.drawn.set('film'); } catch { /* fine */ }
  const d = rig.state.distance;
  const e = sr.worlds.drawnPositionOf('earth'); const s = sr.worlds.drawnPositionOf('sun');
  const toEarth = unit({ x: e.x - s.x, y: e.y - s.y, z: e.z - s.z });
  rig.flyTo({ offset: toEarth, distance: d, ms: 0 });
  if (sr.sunDetail) sr.sunDetail.debug({ image: false, loops: false });
  await shot('c8-sun-1-arrival', 'the Sun at the distance Go there frames it, loops off', 6000);
  rig.flyTo({ offset: toEarth, distance: d * 2.5, ms: 0 });
  await shot('c8-sun-2-far', 'the Sun from 2.5 times as far, loops off', 5000);
  rig.flyTo({ offset: toEarth, distance: d * 0.55, ms: 0 });
  await shot('c8-sun-3-closer', 'closer, from the Earth side, loops off', 6000);
  if (sr.sunDetail) sr.sunDetail.debug({ image: false, loops: true });
  await shot('c8-sun-4-closer-loops', 'the same with the coronal loops over today\'s regions on', 5000);
  const n = north('sun'); const w = unit(cross(n, toEarth)); const a = 80 * Math.PI / 180;
  rig.flyTo({ offset: unit({ x: Math.cos(a) * toEarth.x + Math.sin(a) * w.x, y: Math.cos(a) * toEarth.y + Math.sin(a) * w.y, z: Math.cos(a) * toEarth.z + Math.sin(a) * w.z }), distance: d * 0.7, ms: 0 });
  await shot('c8-sun-5-limb-loops', 'from 80 degrees west: the loops in profile at the limb', 6000);
  if (sr.sunDetail) sr.sunDetail.debug({ image: false, loops: false });
  await shot('c8-sun-6-limb', 'the same place, loops off', 5000);
  out.sun.state = sr.sunDetail ? sr.sunDetail.state() : null;
} catch (err) { look.errors.push('probe: the Sun: ' + (err && err.stack || err)); }
// ---- Venus ------------------------------------------------------------------------------------------------------------------------------
try {
  try { sr.drawn.set('film'); } catch { /* fine */ }
  await stage('venus', 9000);
  await go('venus', 'c8-venus-1-arrival', 7000, 'Venus at arrival, Film look');
  const sd = sunward('venus');
  const dv = rig.state.distance;
  rig.flyTo({ offset: sd, distance: dv, ms: 0 });
  await shot('c8-venus-2-full-face', 'Venus lit face on', 5000);
  const nn = north('venus'); const ww = unit(cross(nn, sd)); const a2 = 100 * Math.PI / 180;
  rig.flyTo({ offset: unit({ x: Math.cos(a2) * sd.x + Math.sin(a2) * ww.x, y: Math.cos(a2) * sd.y + Math.sin(a2) * ww.y, z: Math.cos(a2) * sd.z + Math.sin(a2) * ww.z }), distance: dv, ms: 0 });
  await shot('c8-venus-3-crescent', 'Venus as a crescent: the rim and the light past the terminator', 5000);
  try { sr.drawn.set('measured'); } catch { /* fine */ }
  rig.flyTo({ offset: sd, distance: dv, ms: 0 });
  await shot('c8-venus-4-measured', 'lit face on under the Measured look', 5000);
  try { sr.drawn.set('film'); } catch { /* fine */ }
} catch (err) { look.errors.push('probe: Venus: ' + (err && err.stack || err)); }
// ---- a comet near and far -----------------------------------------------------------------------------------------------------------------
try {
  sr.setLayerOn('comets', true);
  await stage('sun', 8000);
  await until(() => sr.cometField && sr.cometField.state().loaded && sr.cometField.state().visible, 180000, 500);
  const recs = sr.recordsFor('comets');
  const pick = recs.find((r) => /C\/2020 F3/.test(r.name)) || recs.find((r) => /Halley/.test(r.name)) || recs[0];
  out.comet.record = pick ? pick.name : null;
  if (pick) {
    const el = pick.elements || (pick.meta && pick.meta.elements) || {};
    const tp = el.tpMs;
    out.comet.tpMs = tp;
    const readR = async (t) => { sr.clock.goTo(t); await sleep(1800); const row = sr.cometField.tails().find((x) => x.id === pick.id); return row ? row : null; };
    const find = async (target) => {
      // bisect on the days after perihelion: r grows from q outward
      let lo = tp + 1 * 86400e3, hi = tp + 400 * 86400e3, best = null;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        const row = await readR(mid);
        const r = row ? row.rAu : sr.cometField.state().visible ? NaN : NaN;
        if (!Number.isFinite(r)) { hi = mid; continue; }
        best = { t: mid, r, row };
        if (r < target) lo = mid; else hi = mid;
      }
      return best;
    };
    sr.clock.setPaused(true);
    for (const target of [0.5, 1.4]) {
      const hit = Number.isFinite(tp) ? await find(target) : null;
      if (!hit) { look.missing.push('a time with ' + pick.name + ' at ' + target + ' au and a tail'); continue; }
      sr.clock.goTo(hit.t); await sleep(1500);
      sr.select(pick, { fly: true, undo: false });
      await sleep(9000);
      const row = sr.cometField.tails().find((x) => x.id === pick.id);
      out.comet['at' + target] = { clock: new Date(hit.t).toISOString(), rAu: row ? row.rAu : null, tailAu: row ? row.tailAu : null, gain: row && sr.cometField.state ? null : null };
      await shot('c8-comet-' + String(target).replace('.', 'p') + 'au', pick.name + ' selected at ' + (row ? row.rAu.toFixed(2) : '?') + ' au from the Sun');
      sr.deselect();
    }
  }
} catch (err) { look.errors.push('probe: the comet: ' + (err && err.stack || err)); }
return finish(out);
