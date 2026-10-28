// r15-a2: every known deep-sky object and every comet (release 1.5.0 stages A2 and A8, internal #1060 and #1068). ONE walk, the clock
// paused at 2026-01-16 12:00 UTC (a date on which the feed has comets bright enough for a tail: C/2024 E1 Wierzchos at magnitude 8):
//   - the comets (scene/cometfield.js): the Sun's stage from 120 au, so every orbit of the feed is in the picture; from 6 au; the brightest
//     comet with a tail, selected and flown to, and turned; a comet that has no glyph of its own (one of the 4 000 the layer's 60 do not
//     cover), selected by id, its card beside it;
//   - the catalogue (scene/deep/catalogue.js): the Local Group's stage from 1 500 million light-years (the NGC and IC galaxies as points,
//     the unmeasured ones fainter), the galaxy rung from 40 kpc and 12 kpc (clusters, nebulae, remnants), the stellar rung from 3 000 ly;
//     then, for each class, the largest or nearest object selected and flown to, with its card's first words: a galaxy, a globular
//     cluster, an open cluster OpenNGC lists (Gaia's distance), a Gaia-only cluster, a planetary nebula, an emission nebula, one of Green's
//     remnants, and a galaxy whose distance is only inferred (its range of distance drawn as a line);
//   - the search: a designation typed, its row offered, the row pressed.
// Beside every picture: the layer's counts (`sr.cometField.state()`, the catalogue's row of `sr.deep.stats()`), the renderer's calls and the
// frame interval. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`. Fails when a layer never loaded.
look.probe = 'r15-a2';
const out = { scenes: [], problems: [], cards: {} };
const LY_KM = 9.4607304725808e12;
const AU_KM = 149597870.7;
const AT = Date.UTC(2026, 0, 16, 12, 0, 0);
sr.clock.goTo(AT);
sr.clock.setPaused(true);

const frames = (n = 20, capMs = 40000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    resolve({ frames: gaps.length, medianMs: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] * 10) / 10 : null });
  };
  requestAnimationFrame(step);
});
const textOf = (sel, n = 420) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const catLayer = () => { try { return sr.deep && sr.deep.catalogue ? sr.deep.catalogue() : null; } catch { return null; } };
const catRow = () => { try { return (sr.deep.stats().layers || []).find((l) => l.id === 'catalogue') || null; } catch { return null; } };
let n = 0;
const scene = async (tag, note, settleMs = 5000) => {
  await sleep(settleMs);
  try { if (sr.deep && sr.deep.whenReady && ['stellar', 'galaxy', 'local-group'].includes(sr.stage.worldId)) await sr.deep.whenReady(15000); } catch { /* the picture is still taken */ }
  const f = await frames();
  n += 1;
  const name = `${String(n).padStart(2, '0')}-${tag}`;
  const sel = sr.selected ? sr.selected() : null;
  const row = {
    name, note, stage: sr.stage.worldId, unitKm: sr.stage.unitKm, distanceUnits: rig.state.distance,
    distanceLy: Math.round((rig.state.distance * sr.stage.unitKm / LY_KM) * 100) / 100,
    selected: sel ? sel.id : null, card: textOf('#sr-card'),
    comets: sr.cometField ? sr.cometField.state() : null, catalogue: catRow(), cost: frameCost(), ...f,
  };
  out.scenes.push(row);
  await shot(name, `${note} | ${row.stage}, ${row.distanceLy} ly, median ${f.medianMs} ms, ${row.cost ? row.cost.calls : '?'} calls`);
  return row;
};
const unit3 = (v) => { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m }; };
const open = async (record, waitMs = 8000) => { sr.select(record, { fly: true, undo: false }); await sleep(waitMs); };

// ---- the comets ------------------------------------------------------------------------------------------------------------------------
try {
  sr.setLayerOn('comets', true);
  await stage('sun', 9000);
  await until(() => sr.cometField && sr.cometField.state().loaded && sr.cometField.state().visible, 180000, 500);
  const st = sr.cometField ? sr.cometField.state() : null;
  if (!st || !st.loaded) out.problems.push('the comet field never loaded: ' + JSON.stringify(st));
  else {
    out.cometCount = st.comets;
    rig.flyTo({ offset: unit3({ x: 0.25, y: 0.9, z: 0.35 }), distance: 120 * AU_KM / sr.stage.unitKm, ms: 0 });
    await scene('comets-120au', 'every orbit of the feed from 120 au above the ecliptic', 6000);
    rig.flyTo({ offset: unit3({ x: 0.3, y: 0.7, z: 0.6 }), distance: 6 * AU_KM / sr.stage.unitKm, ms: 0 });
    await scene('comets-6au', 'the inner Solar System from 6 au: the orbits and the comets’ places', 5000);
    const tails = sr.cometField.tails();
    out.tails = tails;
    if (!tails.length) out.problems.push('no comet has a tail on 2026-01-16');
    else {
      const rec = sr.recordById(tails[0].id);
      if (rec) {
        await open(rec, 9000);
        await scene('comet-tail', `${rec.name} selected and flown to: its two tails (direction measured, length ours)`, 4000);
        rig.flyTo({ azimuth: rig.state.azimuth + 1.2, ms: 0 });
        await scene('comet-tail-turned', 'the same comet turned 70 degrees: the ribbons face the camera', 3000);
      } else out.problems.push('tail comet has no record: ' + tails[0].id);
    }
    // a comet that is not one of the layer's 60: by its place in the field's list
    const pool = new Set(sr.recordsFor('comets').map((r) => r.id));
    let other = null;
    for (let i = 300; i < sr.cometField.count() && !other; i += 7) { const r = sr.cometField.recordAt(i); if (r && !pool.has(r.id)) other = r; }
    if (other) {
      const byId = sr.recordById(other.id);
      out.cards.fieldComet = { id: other.id, name: other.name, foundById: !!byId };
      await open(other, 8000);
      await scene('comet-field-only', `${other.name}, one of the comets the layer has no glyph for, selected: card and orbit`, 3000);
    } else out.problems.push('no comet outside the layer’s own records');
    sr.deselect();
  }
} catch (e) { out.problems.push('comets: ' + String((e && e.stack) || e).slice(0, 400)); }

// ---- the catalogue --------------------------------------------------------------------------------------------------------------------
try {
  sr.setLayerOn('comets', false);
  await stage('local-group', 9000);
  if (!sr.deep && sr.wantDeep) await sr.wantDeep();
  const cat = await sr.deep.loadCatalogue();
  if (!cat) out.problems.push('the catalogue never loaded');
  else {
    const T = cat.table();
    out.catalogueObjects = T.n;
    rig.flyTo({ offset: unit3({ x: 0.4, y: 0.5, z: 0.75 }), distance: 1500, ms: 0 });
    await scene('cat-local-group-1500mly', 'the NGC and IC galaxies from 1 500 million light-years', 6000);
    rig.flyTo({ distance: 200, ms: 0 });
    await scene('cat-local-group-200mly', 'the same, from 200 million light-years: Virgo’s side of the sky', 5000);
    await stage('galaxy', 9000);
    rig.flyTo({ offset: unit3({ x: 0.2, y: 0.95, z: 0.2 }), distance: 40, ms: 0 });
    await scene('cat-galaxy-40kpc', 'the Milky Way’s clusters, nebulae and remnants from 40 kpc above the plane', 6000);
    rig.flyTo({ distance: 12, ms: 0 });
    await scene('cat-galaxy-12kpc', 'and from 12 kpc', 4000);
    await stage('stellar', 9000);
    rig.flyTo({ offset: unit3({ x: 0.3, y: 0.8, z: 0.5 }), distance: 3000, ms: 0 });
    await scene('cat-stellar-3kly', 'the stellar rung from 3 000 light-years', 6000);

    // one of each class
    const man = T.parts[0].manifest;
    const cls = (code) => man.classes.findIndex((c) => c.code === code);
    const best = (pred, score) => { let bi = -1, bs = -Infinity; for (let i = 0; i < T.n; i++) if (pred(i)) { const s = score(i); if (s > bs) { bs = s; bi = i; } } return bi; };
    const kinds = [
      ['galaxy', best((i) => T.cls[i] === cls('G') && !T.inferred[i] && T.majArcmin[i] > 4, (i) => T.majArcmin[i] / T.distLy[i] * 1e6), 'a galaxy placed by its redshift'],
      ['globular', best((i) => T.cls[i] === cls('GCl') && !T.inferred[i] && T.distLy[i] < 40000, (i) => -T.distLy[i]), 'a globular cluster at Harris’s distance'],
      ['open-gaia-overlay', best((i) => T.overlay.has(i), (i) => T.majArcmin[i]), 'an open cluster OpenNGC lists, at Gaia’s distance'],
      ['open-gaia-only', best((i) => i >= T.nMain && T.distLy[i] < 2500, (i) => T.majArcmin[i]), 'an open cluster only Gaia found'],
      ['planetary', best((i) => T.cls[i] === cls('PN') && !T.inferred[i], (i) => T.majArcmin[i]), 'a planetary nebula at its parallax'],
      ['emission', best((i) => T.cls[i] === cls('HII') && !T.inferred[i], (i) => T.majArcmin[i]), 'an emission nebula at its parallax'],
      ['remnant', best((i) => T.cls[i] === cls('SNR') && i < T.nMain, (i) => T.majArcmin[i]), 'one of Green’s remnants, its distance not measured'],
      ['inferred-galaxy', best((i) => T.cls[i] === cls('G') && T.inferred[i] === 1 && T.majArcmin[i] > 2, (i) => T.majArcmin[i]), 'a galaxy whose distance is only inferred: the range drawn as a line'],
    ];
    out.subjects = [];
    for (const [tag, i, note] of kinds) {
      if (i < 0) { out.problems.push('no object for ' + tag); continue; }
      const rec = cat.recordAt(i);
      if (!rec) { out.problems.push('no record for ' + tag + ' at ' + i); continue; }
      out.subjects.push({ tag, id: rec.id, name: rec.name, distLy: rec.meta.distLy, cls: man.classes[T.cls[i]].code });
      await open(rec, 9000);
      await scene('obj-' + tag, `${rec.name}: ${note}`, 3000);
      out.cards[tag] = textOf('#sr-card', 700);
    }
    sr.deselect();

    // the search: a designation typed, its row offered, the row pressed
    const g = best((i) => i < T.nMain && T.cls[i] === cls('GCl') && /^NGC \d/.test(man.names[i]) && !T.inferred[i], (i) => -T.distLy[i]);
    const query = g >= 0 ? man.names[g] : 'NGC 6397';
    const input = document.querySelector('.sr-search__input');
    if (!input) out.problems.push('no search field');
    else {
      input.focus();
      await sleep(4000); // the field imports its row module on its first focus
      input.value = query;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await until(() => !!document.querySelector('.sr-search__list li'), 30000, 300);
      await sleep(1500);
      out.cards.searchList = textOf('.sr-search__list', 600);
      await scene('search-designation', `"${query}" typed: the field's rows`, 1500);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await sleep(9000);
      const sel = sr.selected ? sr.selected() : null;
      out.cards.searchSelected = sel ? sel.id : null;
      if (!sel || !cat.ownsId(sel.id)) out.problems.push(`"${query}" typed and Enter pressed selected ${sel ? sel.id : 'nothing'}, not a catalogue object`);
      await scene('search-opened', `Enter on "${query}": the object is selected and its card open`, 2000);
    }
  }
} catch (e) { out.problems.push('catalogue: ' + String((e && e.stack) || e).slice(0, 400)); }

const fail = out.problems.length && (!out.cometCount || !out.catalogueObjects) ? out.problems.join(' | ') : undefined;
return finish({ ...out, fail });
