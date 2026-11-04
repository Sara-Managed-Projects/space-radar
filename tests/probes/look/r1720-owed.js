// r1720-owed: the looks the bulk 2 and bulk 3 passes left owed, and the findings they made (release 1.7.20,
// internal #565, #566, #569). One section each, each in its own try so one that breaks does not take the
// rest with it; every picture says what it is a picture of.
//
//   1. A SUNSPOT PAIR CLOSE UP from the Earth's side (#565): the largest spot of the day, the camera aimed at
//      it through the Sun mesh's matrix (the spot's place is in the Sun's own frame), at 0.35, 0.15 and 0.06 of
//      a radius from it.
//   2. THE 'FOLLOWING SATURN' LINE (#565): the Tonight tab opened first (the line is in the telescope's row,
//      which the tab holds), the dome up, Saturn pointed at, the telescope on; the line's box against the
//      window (it must fit, not cut) and the page's width.
//   3. EARTH EVENTS DRAWN FROM THE COPY (#565): the layer on, the Earth's whole face, then closer over the
//      busiest place; the count of records and what is drawn.
//   4. 'YOUR OWN SKY, TONIGHT' (#566): the trip a-dark-sky's second stop (900 km over Lisbon), held, the night
//      lights' map photographed 3, 15 and 45 s after arriving: is the map sharp by the time the words are read?
//   5. NAMES IN THE EARTH FRAME (#566): the plain map outside a trip, nothing selected, then "orion" typed in
//      the search and its first row chosen: the names drawn, and any of a far world's moons among them.
//   6. THE UNDO TOAST OVER THE SHEET'S TABS AT 390 PX (#569): the sheet full, the toast as the app offers it
//      ("Moved to Planets" and "Back to where you were"); the toast's box against the tab row's.
//
//   gh workflow run look.yml -f probe=r1720-owed -f ref=<branch> -f width=1600 -f height=900
//   -f subject=spots_toast      only these sections, joined by an underscore (spots, saturn, events, darksky, names, toast)
//   gh workflow run look.yml -f probe=r1720-owed -f ref=<branch> -f mobile=true
look.probe = 'r1720-owed';
const out = { problems: [] };
const doc = document;
const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
const hit = (a, b) => !!(a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
const only = (new URLSearchParams(location.search).get('lookSubject') || '').split('_').filter(Boolean);
const section = async (name, fn) => { if (only.length && !only.includes(name)) return; const t = Date.now(); try { out[name] = await fn(); } catch (e) { out.problems.push(name + ': ' + (e && e.stack || e)); } (out.seconds = out.seconds || {})[name] = Math.round((Date.now() - t) / 1000); };
const labelNames = () => [...doc.querySelectorAll('#labels .label__text')].filter((n) => n.offsetParent !== null).map(text);
const AT = Date.UTC(2026, 10, 3, 21, 30, 0);

await section('spots', async () => {
  sr.clock.live();
  await stage('sun', 8000);
  await go('sun', null, 6000);
  await until(() => sr.sunDetail && sr.sunDetail.state().on, 60000);
  await until(() => sr.sunDetail && sr.sunDetail.state().regions > 0, 20000);
  const e = sr.worlds.drawnPositionOf('earth'); const s = sr.worlds.drawnPositionOf('sun');
  const toEarth = unit({ x: e.x - s.x, y: e.y - s.y, z: e.z - s.z });
  rig.flyTo({ offset: toEarth, distance: rig.state.distance, ms: 0 });
  await sleep(1500);
  const sunMesh = sr.worlds.meshFor('sun');
  const U = sunMesh.material && sunMesh.material.uniforms;
  const o = { count: U && U.uSpotCount ? U.uSpotCount.value : null, state: sr.sunDetail ? sr.sunDetail.state() : null };
  o.state = o.state ? { groups: o.state.spots, circles: o.state.circles, pairs: o.state.pairs, regions: o.state.regions } : null;
  if (!(U && U.uSpots && o.count)) { look.missing.push('the Sun has no spot today (uSpotCount ' + o.count + ')'); return o; }
  let best = 0;
  for (let i = 1; i < o.count; i++) if (U.uSpots.value[i].w > U.uSpots.value[best].w) best = i;
  const sp = U.uSpots.value[best];
  o.largest = { x: +sp.x.toFixed(3), y: +sp.y.toFixed(3), z: +sp.z.toFixed(3), radius: +sp.w.toFixed(4) };
  sunMesh.updateMatrixWorld();
  const m = sunMesh.matrixWorld.elements;
  const w = { x: m[0] * sp.x + m[4] * sp.y + m[8] * sp.z + m[12], y: m[1] * sp.x + m[5] * sp.y + m[9] * sp.z + m[13], z: m[2] * sp.x + m[6] * sp.y + m[10] * sp.z + m[14] };
  const c = { x: m[12], y: m[13], z: m[14] };
  const outward = unit({ x: w.x - c.x, y: w.y - c.y, z: w.z - c.z });
  const R = sr.worlds.drawnRadiusUnits('sun');
  o.facingEarth = +(outward.x * toEarth.x + outward.y * toEarth.y + outward.z * toEarth.z).toFixed(2);
  for (const k of [0.35, 0.15, 0.06]) {
    rig.flyTo({ targetScene: w, offset: outward, distance: R * k, ms: 0 });
    await sleep(5000);
    await shot('spots-' + String(k).replace('.', '_'), `the largest spot of the day (radius ${o.largest.radius} rad, ${o.facingEarth} of the way toward the Earth) from ${k} of a Sun radius above it; spots drawn: ${o.state.circles} circles in ${o.state.groups} groups, ${o.state.pairs} pairs`, 1500);
  }
  return o;
});

await section('saturn', async () => {
  sr.clock.goTo(AT);
  const PLACE = { name: 'Lisbon', latDeg: 38.72, lonDeg: -9.14, latRad: 38.72 * Math.PI / 180, lonRad: -9.14 * Math.PI / 180, altKm: 0, source: 'manual' };
  sr.setObserver(PLACE);
  sr.skyView.enter(PLACE);
  await until(() => sr.skyView.active, 20000);
  await sleep(3500);
  // The line lives in the sky bar's row, which the Tonight tab holds: open it first (the first look never did).
  try { sr.explore.setTab('tonight'); } catch (e) { look.warns.push('probe: the Tonight tab: ' + e); }
  await sleep(1500);
  const pointed = sr.skyView.pointAt({ body: 'saturn' }, { instant: true });
  await sleep(2500);
  const handle = doc.querySelector('.sr-sheet__handle');
  if (handle) { handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(900); }
  const btn = [...doc.querySelectorAll('.sr-skybar button')].find((b) => /^\s*telescope\s*$/i.test(b.textContent || ''));
  if (btn) { if (btn.scrollIntoView) btn.scrollIntoView({ block: 'center' }); btn.click(); }
  await sleep(3000);
  const note = [...doc.querySelectorAll('.sr-skybar .sr-density__note')].find((n) => /Following/.test(n.textContent || ''));
  if (note && note.scrollIntoView) note.scrollIntoView({ block: 'center' });
  const o = {
    pointed: !!pointed, telescopeButton: !!btn, following: sr.skyView.following,
    note: note ? { text: text(note), hidden: note.hidden, box: box(note), fits: note.scrollWidth <= note.clientWidth + 1, inside: note.getBoundingClientRect().right <= innerWidth } : null,
    pageOverflow: doc.documentElement.scrollWidth > innerWidth + 1,
  };
  if (!btn) look.missing.push('no Telescope button in .sr-skybar with the Tonight tab open');
  await shot('saturn-following-line', "the sky with the telescope on Saturn and the 'Following' line", 800);
  try { sr.skyView.leave && sr.skyView.leave(); } catch { /* not in the sky */ }
  return o;
});

await section('events', async () => {
  sr.clock.live();
  await stage('earth', 6000);
  if (!sr.isLayerOn('earth-events')) sr.setLayerOn('earth-events', true);
  await sleep(6000);
  const records = sr.recordsFor ? sr.recordsFor('earth-events') : [];
  const o = { records: records.length, kinds: {} };
  for (const r of records) { const k = (r.meta && (r.meta.category || r.meta.kind)) || r.klass || '?'; o.kinds[k] = (o.kinds[k] || 0) + 1; }
  const fix = records.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  o.placed = fix.length;
  await shot('events-1-whole-earth', `the Earth with the events layer on: ${records.length} records, ${fix.length} with a place`, 1500);
  // The busiest tenth of a radian: the cell with the most records.
  const cells = new Map();
  for (const r of fix) { const k = Math.round(r.lat / 8) + ',' + Math.round(r.lon / 8); cells.set(k, (cells.get(k) || 0) + 1); }
  const top = [...cells.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const near = fix.find((r) => Math.round(r.lat / 8) + ',' + Math.round(r.lon / 8) === top[0]);
    o.busiest = { cell: top[0], n: top[1], example: near.id };
    try { await go(near.id, 'events-2-closer', 7000, `closer, over ${near.id}: the busiest 8-degree cell holds ${top[1]} records`); } catch (e) { look.warns.push('probe: no flight to ' + near.id + ': ' + e); }
  }
  return o;
});

await section('darksky', async () => {
  if (sr.trip.state && sr.trip.state.phase !== 'idle') { sr.trip.stop(); await sleep(500); }
  const plan = await sr.trip.plan('a-dark-sky');
  if (!plan || !plan.offerable) { look.missing.push('a-dark-sky is not offerable here'); return { plan: plan && plan.reason }; }
  await sr.trip.start('a-dark-sky');
  const shown = () => { const b = doc.querySelector('.sr-tripsheet__start'); return b && b.getBoundingClientRect().width > 0 ? b : null; };
  if (!(await until(shown, 30000))) throw new Error('no Start on the intro');
  shown().click();
  const arrive = () => until(() => ['dwell', 'settle', 'held', 'paused', 'outro', 'idle'].includes(sr.trip.state.phase), 60000, 200);
  await arrive();
  sr.trip.jumpTo(1);
  await sleep(400);
  await arrive();
  // The stop is held (paused) so the trip does not move on in the minute the maps take: its dwell is 17 s.
  try { sr.trip.pause(); } catch (e) { look.warns.push('probe: the trip would not pause: ' + e); }
  const o = { stop: sr.trip.state.stopTitle, phase: sr.trip.state.phase, at: [] };
  const t0 = Date.now();
  for (const s of [3, 15, 45]) {
    await sleep(Math.max(0, s * 1000 - (Date.now() - t0)));
    await shot('darksky-stop2-' + s + 's', `"${sr.trip.state.stopTitle}" (stop ${sr.trip.state.index + 1}, ${sr.trip.state.phase}) ${s} s after arriving, held: is the night-lights map sharp?`, 0);
    o.at.push({ seconds: s, stop: sr.trip.state.index + 1, phase: sr.trip.state.phase });
  }
  sr.trip.stop();
  return o;
});

await section('names', async () => {
  try { sr.trip.stop(); } catch { /* no trip */ }
  sr.clock.live();
  await stage('earth', 6000);
  try { sr.deselect(); } catch { /* nothing selected */ }
  await sleep(2500);
  const o = { plain: labelNames() };
  await shot('names-1-plain-earth', 'the Earth outside a trip, nothing selected: names drawn: ' + o.plain.join(', '), 800);
  const field = [...doc.querySelectorAll('.sr-search__input')].find((n) => n.offsetParent);
  if (field) {
    field.focus(); field.value = 'orion'; field.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(2500);
    o.rows = [...doc.querySelectorAll('.sr-search__list [role="option"]')].map(text).slice(0, 5);
    const first = doc.querySelector('.sr-search__list [role="option"]');
    if (first) first.click();
    await sleep(6000);
    o.afterOrion = labelNames();
    await shot('names-2-orion', 'after "orion" in the search and its first row: names drawn: ' + o.afterOrion.join(', '), 800);
  } else look.missing.push('no search field shown');
  const far = /uranus|titania|umbriel|oberon|ariel|miranda|neptune|triton|pluto|charon/i;
  o.farNames = [...(o.plain || []), ...(o.afterOrion || [])].filter((n) => far.test(n));
  return o;
});

await section('toast', async () => {
  try { sr.trip.stop(); } catch { /* no trip */ }
  try { sr.deselect(); } catch { /* nothing selected */ }
  if (!doc.documentElement.classList.contains('sr-phone')) { look.warns.push('probe: not a phone: the toast is photographed anyway'); }
  const handle = doc.querySelector('.sr-sheet__handle');
  for (let i = 0; i < 3 && handle; i++) { handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(700); }
  const m = await import('/js/ui/camundo.js');
  m.offerUndo(sr, { name: 'Planets', undo: () => {} });
  await sleep(1500);
  const toast = doc.querySelector('.sr-toast');
  const tabs = [...doc.querySelectorAll('[role="tablist"]')].filter((n) => n.offsetParent !== null).map((n) => ({ box: box(n), text: text(n).slice(0, 80) }));
  const o = { sheet: doc.documentElement.dataset.sheet || null, toast: toast ? { text: text(toast), box: box(toast) } : null, tabs };
  o.covers = toast ? tabs.filter((t) => hit(o.toast.box, t.box)).map((t) => t.text) : [];
  await shot('toast-over-tabs', `the sheet ${o.sheet}, the undo toast up: it covers ${o.covers.length ? 'the tab row (' + o.covers.join(' | ') + ')' : 'no tab row'}`, 300);
  return o;
});

return finish(out);
