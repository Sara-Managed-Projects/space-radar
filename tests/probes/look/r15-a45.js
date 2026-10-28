// r15-a45: stars and beyond the Milky Way (release 1.5.0 stages A4 and A5, internal #1062 and #1063), one walk.
//
// 1. THE CATALOGUES ARRIVE ON DEMAND: nothing under data/a45/ is fetched at boot; after `sr.loadMoreCatalogues()` the files are, and
//    the line beside the first picture says how many bytes each was.
// 2. THE STARS WITH NO DISTANCE on a star system's sky sphere (Trappist-1's stage, where the 3D stars are the sky): the same view with
//    them held off (the BEFORE) and on; then the Garnet Star, taken as a tap takes it, with its card (no distance, and the camera stays).
// 3. THE IAU's NAMES: Sirius's card (the IAU-approved name row) and a star the IAU named that HYG had no name for.
// 4. DEAD STARS AND BLACK HOLES: Luhman 16 A (a brown dwarf at 6.5 light-years), WD J2147-4035, Gaia BH2 (a quiet black hole, in 3D).
// 5. PULSARS on the Milky Way's stage: the layer off (BEFORE) and on (4 300 marks), then PSR J0437-4715 and a magnetar's card.
// 6. BEYOND, on the Local Group's stage: the layer off and on; a dwarf of the Local Group; the Virgo Cluster; the Bullet Cluster and El Gordo;
//    MoM-z14 (33.8 billion light-years out) and its card; the quasars layer on, and the first quasar known beyond z = 7.
// Beside each picture the frame intervals, the draw calls, the layer's record count. Fails when a catalogue never arrives, a record is
// missing, or the unplaced stars never load. Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r15-a45';
const out = { scenes: [], problems: [] };
const frames = (n = 20, capMs = 40000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    resolve({ medianMs: at(0.5), p95Ms: at(0.95) });
  };
  requestAnimationFrame(step);
});
const textOf = (sel, n = 500) => { const el = document.querySelector(sel); return el ? el.innerText.replace(/\s+/g, ' ').trim().slice(0, n) : null; };
const fetched = () => performance.getEntriesByType('resource').filter((e) => /\/data\/a45\//.test(e.name)).map((e) => `${e.name.split('/').pop()} ${e.encodedBodySize || e.transferSize || 0} B`);
const count = (id) => { try { return sr.recordsFor(id).length; } catch { return null; } };
const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const f = await frames();
  const row = { name, note, stage: sr.stage.worldId, cost: frameCost(), card: textOf('#sr-card'), ...f };
  out.scenes.push(row);
  await shot(name, `${note} | ${row.cost ? row.cost.calls : '?'} calls, median ${f.medianMs} ms, p95 ${f.p95Ms} ms`);
  return row;
};
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const OB = 23.4392911 * Math.PI / 180;
const radec = (ra, dec) => { const a = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
const eclDir = (v) => ({ x: v[0], y: v[1] * Math.cos(OB) + v[2] * Math.sin(OB), z: -v[1] * Math.sin(OB) + v[2] * Math.cos(OB) });
const need = (id) => { const r = sr.recordById(id); if (!r) out.problems.push('no record ' + id); return r; };
const goCard = async (id, name, note, wait = 7000) => {
  const r = need(id);
  if (!r) return null;
  sr.select(r, { fly: true, undo: false });
  return snap(name, note, wait);
};

out.bytesAtBoot = fetched();
try { if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit(); } catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
out.bytesAfterLater = fetched();
const t0 = Date.now();
try { await sr.loadMoreCatalogues(); } catch (e) { out.problems.push('loadMoreCatalogues: ' + e); }
out.moreMs = Date.now() - t0;
out.bytesAfterMore = fetched();
out.counts = { extremes: count('extremes-more'), pulsars: count('pulsars'), beyond: count('beyond-more'), quasars: count('quasars') };
if (!(out.counts.extremes > 70 && out.counts.beyond > 120 && out.counts.pulsars > 4000 && out.counts.quasars > 1000)) out.problems.push('a catalogue did not arrive: ' + JSON.stringify(out.counts));
if ((out.bytesAtBoot || []).some((b) => /^(pulsars|quasars|beyond|extremes)/.test(b))) out.problems.push('a catalogue was fetched before anything asked: ' + out.bytesAtBoot.join(', '));

// ---- 2. the stars with no distance, on a star system's sky sphere --------------------------------
try {
  await stage('system-trappist-1', 9000);
  await sr.wantUnplaced();
  await until(() => sr.unplaced && sr.unplaced.count(), 60000);
  if (!sr.unplaced || !sr.unplaced.count()) out.problems.push('the stars with no distance never loaded');
  else {
    out.unplaced = { count: sr.unplaced.count(), mode: sr.unplaced.mode(), drawn: sr.unplaced.drawn() };
    const P = sr.camera.position;
    const GC = sr.stage.dirToScene(eclDir(radec(266.405, -28.936)), 'sun-inertial');
    const T = add({ x: P.x, y: P.y, z: P.z }, { x: GC.x, y: GC.y, z: GC.z }, 1e5);
    rig.flyTo({ targetScene: T, offset: { x: -GC.x, y: -GC.y, z: -GC.z }, distance: 1e5, ms: 0 });
    sr.stars3d.setMagLimit(7.5);
    sr.unplaced.setVisible(false);
    await snap('a45-1-sky-before', 'the sky sphere towards the galaxy\'s centre from Trappist-1\'s stage, the stars with no distance held off (the before)', 5000);
    sr.unplaced.setVisible(true);
    await snap('a45-1-sky-after', `the same with ${out.unplaced.drawn} of ${out.unplaced.count} stars with no distance on it (the rest are fainter than the shutter's 7.5)`, 3000);
    const garnet = need('hyg-u106916');
    if (garnet) {
      const before = { x: sr.camera.position.x, y: sr.camera.position.y, z: sr.camera.position.z };
      sr.select(garnet, { from: 'pick' });
      await snap('a45-2-garnet-card', 'the Garnet Star taken as a tap takes it: a card with no distance, the camera where it was', 4000);
      const after = sr.camera.position;
      out.garnetCameraMoved = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
      if (!/Not measured/.test(String(out.scenes[out.scenes.length - 1].card))) out.problems.push('the Garnet Star\'s card does not say the distance is not measured');
      sr.deselect();
    }
  }
} catch (e) { out.problems.push('unplaced: ' + e); }

// ---- 3 and 4. IAU names, dead stars, a quiet black hole ------------------------------------------
try {
  await goCard('hip-32349', 'a45-3-sirius', 'Sirius: the card has the IAU-approved name row');
  await goCard('hip-91014', 'a45-3-iau-new', 'a star the IAU named and HYG had no name for', 6000);
  await goCard('exotic-bd-luhman-16-a', 'a45-4-luhman16', 'Luhman 16 A, the nearest brown dwarf: a card, no photograph');
  await goCard('exotic-wd-j2147-4035', 'a45-4-wd', 'WD J2147-4035, a white dwarf cooled to 3 050 K');
  await goCard('exotic-gaia-bh2', 'a45-4-gaia-bh2', 'Gaia BH2: a quiet black hole, drawn in 3D with no disc', 9000);
} catch (e) { out.problems.push('stars: ' + e); }

// ---- 5. pulsars on the Milky Way's stage ---------------------------------------------------------
try {
  await stage('galaxy', 9000);
  sr.setLayerOn('pulsars', false);
  await snap('a45-5-pulsars-before', 'the Milky Way\'s stage, the pulsars layer off (the before)', 3000);
  sr.setLayerOn('pulsars', true);
  await snap('a45-5-pulsars-after', `the pulsars on: ${out.counts.pulsars} small marks at their places`, 4000);
  await goCard('exotic-psr-j0437-4715', 'a45-5-psr-j0437', 'PSR J0437-4715, the nearest millisecond pulsar: its distance is by parallax');
  const mag = sr.recordsFor('extremes-more').find((r) => r.meta.kind === 'magnetar');
  if (mag) await goCard(mag.id, 'a45-5-magnetar', mag.name + ', a magnetar'); else out.problems.push('no magnetar');
} catch (e) { out.problems.push('pulsars: ' + e); }

// ---- 6. beyond: the Local Group, clusters, the farthest galaxies, quasars -------------------------
try {
  await stage('local-group', 9000);
  sr.setLayerOn('beyond-more', false);
  await snap('a45-6-beyond-before', 'the Local Group\'s stage with the new layer off (the before)', 3000);
  sr.setLayerOn('beyond-more', true);
  await snap('a45-6-beyond-after', `the same with ${out.counts.beyond} more marks: the Local Group's dwarfs, named clusters, the farthest galaxies`, 4000);
  await goCard('dso-lg-andromeda_09', 'a45-6-lg-dwarf', 'Andromeda IX, one of the Local Group\'s 85 more dwarf galaxies');
  await goCard('exotic-cl-virgo-cluster', 'a45-6-virgo', 'the Virgo Cluster as a record (its galaxies are drawn by the layer that was already there)', 9000);
  await goCard('exotic-cl-bullet-cluster', 'a45-6-bullet', 'the Bullet Cluster: a comoving distance from its redshift, and the card says so', 9000);
  await goCard('exotic-cl-el-gordo', 'a45-6-el-gordo', 'El Gordo', 8000);
  await goCard('exotic-mom-z14', 'a45-6-mom-z14', 'MoM-z14, z = 14.44: how far it is now and when its light left', 9000);
  sr.setLayerOn('quasars', true);
  await goCard('exotic-qso-j031343-84-180636-4', 'a45-6-quasar-z7', 'the first quasar known beyond z = 7, with the quasars layer on (1 000 marks)', 9000);
} catch (e) { out.problems.push('beyond: ' + e); }

out.bytesAtEnd = fetched();
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
