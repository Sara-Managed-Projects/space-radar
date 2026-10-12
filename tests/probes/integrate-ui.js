// The interface: the Stars list with the generated systems (internal #473), a far planet's card in
// light-years (#476), a host star met from over its orbits (#476), a conjunction in Coming up
// (#359), Earlier/Later in photo mode (#397), the volume in What to show (#432), the timeline's
// slider (#472), the Sources view, the wonder on a first day (#437), the ring on a low satellite
// (#418), and on a phone the search rows (public #519).
const A = await import('/vendor/astronomy.js');
const { propagate } = await import('/js/propagate/index.js');
const R = Math.PI / 180;
const london = { latDeg: 51.5, lonDeg: -0.1, latRad: 51.5 * R, lonRad: -0.1 * R, altKm: 0, name: 'London', source: 'city' };
ctx.setObserver(london);
await run('wonderFirstDay', async () => ({ wonder: !!$('.sr-wonder:not(.sr-story)'), story: !!$('.sr-story'), returning: ctx.passport && ctx.passport.returning ? ctx.passport.returning(Math.floor(Date.now() / 864e5)) : null, cards: $$('.sr-today__card').map((n) => text(n).slice(0, 50)) }));
await run('comingUp', async () => {
  await homeView();
  // Nothing pairs within two degrees from London in the thirty days after 2026-10-09 (worked out in
  // Node with sky/conjunctions.js); Mars and Jupiter do on 2026-11-16 01:51 UTC, 1.2 degrees apart.
  ctx.clock.setPaused(true); ctx.clock.goTo(Date.UTC(2026, 10, 10, 20, 0)); ctx.setObserver(london);
  try { ctx.explore.setTab('tonight'); await wait(500); ctx.explore.setTab('earth'); } catch { /* tabs as they are */ }
  const rows = () => $$('.sr-next__row').map((n) => text(n));
  // The list shows its first few rows; the rest are behind its own Show all.
  const more = () => $('.sr-next .sr-more:not(.sr-next__past)');
  await wait(4000); if (more() && !more().hidden && more().getAttribute('aria-expanded') !== 'true') { more().click(); await wait(600); }
  const found = await until(() => rows().some((r) => /Mars/.test(r) && /Jupiter/.test(r)), 45000, 500);
  const row = $$('.sr-next__row').find((n) => /Mars/.test(text(n)) && /Jupiter/.test(text(n)));
  if (row) { row.scrollIntoView({ block: 'center' }); await wait(400); }
  await sheetUp();
  if (row) row.scrollIntoView({ block: 'center' }); else { const list = $('.sr-next'); if (list) list.scrollIntoView({ block: 'start' }); }
  await shot('u1-coming-up', 1200);
  const o = { found, row: row ? { text: text(row), box: box(row) } : null, rows: rows().slice(0, 14).map((r) => r.slice(0, 150)) };
  ctx.clock.goTo(Date.now()); ctx.clock.setPaused(false); if (ctx.timePill && ctx.timePill.toLive) ctx.timePill.toLive();
  return o;
});
await run('timeline', async () => {
  const tape = $('.sr-tape'); const slider = $('.sr-tape__slider');
  if (!tape) return 'no tape';
  const o = { tape: box(tape), slider: box(slider), nested: $$('[role="slider"] button, [role="slider"] a, [role="slider"] [tabindex]').length, rootRole: tape.getAttribute('role'), buttons: $$('button', tape).length };
  if (slider) {
    const v0 = slider.getAttribute('aria-valuenow'); slider.focus();
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await wait(600);
    o.keys = { before: v0, after: slider.getAttribute('aria-valuenow'), text: slider.getAttribute('aria-valuetext'), focus: document.activeElement === slider };
    // A drag on the tape: 120 px to the left of its middle.
    const b = tape.getBoundingClientRect(); const y = b.top + b.height / 2; const x = b.left + b.width / 2;
    const pe = (type, px) => tape.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, clientX: px, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    pe('pointerdown', x); await wait(60); pe('pointermove', x - 60); await wait(60); pe('pointermove', x - 120); await wait(60); pe('pointerup', x - 120); await wait(500);
    o.drag = { after: slider.getAttribute('aria-valuenow'), text: slider.getAttribute('aria-valuetext') };
    await shot('u2-timeline', 600);
    const now = $('.sr-tape__now, .sr-tape button'); if (ctx.timePill && ctx.timePill.toLive) ctx.timePill.toLive();
  }
  if (window.axe) {
    const r = await window.axe.run(tape, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
    o.axe = r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, node: v.nodes[0] && v.nodes[0].target.join(' ') }));
  }
  return o;
});
await run('stars', async () => {
  await homeView();
  ctx.explore.setTab('stars'); await sheetUp();
  await until(() => $$('h3.sr-micro').length >= 2 && $$('.sr-list li').length > 30, 15000);
  const heads = $$('h3.sr-micro').map((h) => ({ t: text(h), rows: h.nextElementSibling ? h.nextElementSibling.querySelectorAll('li').length : 0 }));
  const h = $$('h3.sr-micro')[0];
  await shot('u3-stars-top', 800);
  if (h) h.scrollIntoView({ block: 'start' });
  await shot('u4-stars-systems', 800);
  const last = $$('h3.sr-micro').pop(); if (last) last.scrollIntoView({ block: 'start' });
  await shot('u5-stars-systems-2', 800);
  const rowsAll = h ? $$('li', h.parentNode) : [];
  const firstRow = h && h.nextElementSibling ? h.nextElementSibling.querySelector('button') : null;
  const o = { heads, rowH: firstRow ? box(firstRow) : null, sample: rowsAll.slice(0, 4).map((n) => text(n)) };
  if (firstRow) {
    firstRow.click(); await wait(2500);
    while (ctx.cameraRig.state.flying) await wait(300);
    await wait(4000);
    o.tap = { selected: ctx.selected() && ctx.selected().id, stage: ctx.stage.worldId, view: ctx.shell.view() };
    await shot('u6-stars-tap-arrived', 1500);
  }
  return o;
});
await run('search', async () => {
  const o = {};
  for (const q of ['Kepler-16', 'LHS 1140']) {
    await homeView();
    const input = $('.sr-search__input'); if (!input) return 'no search';
    input.focus(); input.value = q; input.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => $$('.sr-search__option').some((n) => text(n).toLowerCase().startsWith(q.toLowerCase())), 8000);
    const opts = $$('.sr-search__option');
    o[q] = { options: opts.slice(0, 5).map((n) => ({ t: text(n).slice(0, 60), h: Math.round(n.getBoundingClientRect().height) })) };
    if (q === 'Kepler-16') await shot('u7-search-results', 500);
    const star = opts.find((n) => /star|system/i.test(text(n)) && !/ b\b| c\b/.test(text(n).slice(0, 14))) || opts[0];
    if (!star) continue;
    o[q].picked = text(star).slice(0, 60);
    (star.querySelector('button') || star).click(); await wait(3000);
    const f0 = Date.now(); while (ctx.cameraRig.state.flying && Date.now() - f0 < 40000) await wait(300);
    await wait(5000);
    const st = ctx.cameraRig.state; const cam = ctx.camera.position; const tgt = ctx.cameraRig.target || (ctx.controls && ctx.controls.target);
    o[q].arrive = { selected: ctx.selected() && ctx.selected().id, stage: ctx.stage.worldId, polarDeg: st.polar !== undefined ? +(st.polar / R).toFixed(1) : null, keys: Object.keys(st).slice(0, 14) };
    await shot('u8-arrive-' + q.replace(/\W+/g, '').toLowerCase(), 1500);
  }
  return o;
});
await run('exoCard', async () => {
  await homeView();
  const rec = ctx.recordById('exo-kepler-186-f'); if (!rec) return 'no record';
  ctx.select(rec, { fly: true }); await until(() => ctx.shell.view() === 'card', 8000); await wait(9000);
  await sheetUp();
  const live = () => $$('.sr-live__row').map((n) => text(n));
  const a = live(); await wait(2500); const b = live();
  const liveEl = $('.sr-live'); if (liveEl) liveEl.scrollIntoView({ block: 'center' });
  await shot('u9-exoplanet-card', 800);
  return { first: a, later: b, ticking: JSON.stringify(a) !== JSON.stringify(b), note: text($('.sr-card__aboardnote')), title: text($('#sr-card h2, #sr-card h1')) };
});
await run('photo', async () => {
  await homeView();
  const rec = ctx.recordById('saturn'); ctx.select(rec, { fly: true }); await wait(7000);
  await ctx.share.open({ record: rec }); await wait(1500);
  const door = $$('button').find((b) => /photo mode/i.test(text(b) || b.title || ''));
  if (!door) return 'no Photo mode button on the share sheet';
  door.click(); await until(() => $('#sr-photo'), 8000); await wait(1500);
  const p = { close: () => { const x = $$('#sr-photo button').pop(); if (x) x.click(); } };
  const btns = $$('.sr-photo__time button');
  const o = { allBtns: $$('#sr-photo button').map((b) => ({ t: text(b).slice(0, 14), box: box(b) })), time: box($('.sr-photo__time')), hidden: $('.sr-photo__time') ? $('.sr-photo__time').hidden : null, btns: btns.map((b) => ({ t: text(b), title: b.title, box: box(b) })), bar: box($('.sr-photo__time') && $('.sr-photo__time').parentNode), barScroll: (() => { const bar = $('.sr-photo__time') && $('.sr-photo__time').parentNode; return bar ? [bar.scrollWidth, bar.clientWidth] : null; })() };
  await shot('u10-photo-bar', 800);
  const t0c = ctx.clock.now();
  if (btns[1]) { btns[1].click(); await wait(900); }
  const t1c = ctx.clock.now();
  if (btns[0]) { btns[0].click(); await wait(400); btns[0].click(); await wait(900); }
  o.step = { laterMs: Math.round(t1c - t0c), thenEarlierTwiceMs: Math.round(ctx.clock.now() - t1c) };
  await shot('u11-photo-earlier', 600);
  try { p.close(); } catch { /* closed */ }
  if (ctx.timePill && ctx.timePill.toLive) ctx.timePill.toLive();
  await wait(500);
  return o;
});
await run('volume', async () => {
  await homeView();
  if (!ctx.rail) return 'no rail';
  await ctx.rail.openShow(); await until(() => $('.sr-show'), 8000); await wait(600);
  const v = () => $('.sr-show__vol');
  const o = { present: !!v(), hiddenWhileOff: v() ? v().hidden : null, audioOn: ctx.audio && ctx.audio.isOn() };
  if (ctx.audio && !ctx.audio.isOn()) { const b = $('.sr-show .sr-sound__btn, .sr-show [class*="sound"] button'); if (b) b.click(); else ctx.audio.toggle(); await wait(900); }
  o.afterOn = { on: ctx.audio && ctx.audio.isOn(), hidden: v() ? v().hidden : null, box: box(v()), value: v() ? v().value : null };
  if (v()) { v().value = '40'; v().dispatchEvent(new Event('input', { bubbles: true })); await wait(300); o.set40 = ctx.audio.volume(); v().scrollIntoView({ block: 'center' }); }
  await shot('u12-volume', 800);
  if (ctx.audio && ctx.audio.isOn()) ctx.audio.toggle();
  ctx.rail.closeShow();
  return o;
});
await run('sources', async () => {
  await homeView();
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status'), 10000); await wait(1200);
  await sheetUp();
  const o = { view: ctx.shell.view(), rows: $$('.sr-source').length, head: text($('#sr-side h2')), first: $$('.sr-source').slice(0, 3).map((n) => text(n).slice(0, 90)), overflowX: document.documentElement.scrollWidth > innerWidth };
  await shot('u13-sources', 600);
  return o;
});
await run('skyRing', async () => {
  await homeView();
  // A night at London, then the satellite lowest above the horizon (2 to 12 degrees up).
  let t = A.SearchAltitude('Sun', new A.Observer(51.5, -0.1, 0), -1, new Date(), 2, -14).date.getTime();
  ctx.clock.setPaused(true); ctx.clock.goTo(t); await wait(500);
  const altOf = (rec) => {
    const p = propagate(rec, t); if (!p) return null;
    const g = A.SiderealTime(new Date(t)) * 15 * R; const lon = london.lonRad + g; const lat = london.latRad;
    const u = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const d = [p.x - 6371 * u[0], p.y - 6371 * u[1], p.z - 6371 * u[2]]; const l = Math.hypot(...d);
    return Math.asin((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / l) / R;
  };
  const sats = ctx.records().filter((r) => /^sat-/.test(r.id)).slice(0, 4000);
  let best = null;
  for (const r of sats) { let a = null; try { a = altOf(r); } catch { a = null; } if (a !== null && a > 2 && a < 12 && (!best || a < best.alt)) best = { r, alt: a }; }
  if (!best) return { sats: sats.length, best: null };
  if (!ctx.skyView.active) ctx.skyView.enter(london);
  await until(() => ctx.skyView.ownsSky, 25000); await wait(2500);
  ctx.select(best.r, { fly: true }); await wait(6000);
  const tag = $('.sr-tag'); const ringEl = $('[class*="ring"]');
  const hudNow = () => { const p = ctx.positionOfRecord ? ctx.positionOfRecord(best.r) : null; const v = p ? p.clone().project(ctx.camera) : null; const lab = $$('#labels .label, .label').find((n) => text(n) === best.r.name); return { reticle: $('.sr-reticle') ? [$('.sr-reticle').className, box($('.sr-reticle'))] : null, chevron: $('.sr-chevron') ? [$('.sr-chevron').className, box($('.sr-chevron'))] : null, ndc: v ? [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(3)] : null, label: box(lab), skyCam: ctx.skyView.camera ? ctx.skyView.camera === ctx.camera : 'no skyView.camera' }; };
  const hudLog = [hudNow()];
  await shot('u14-sky-low-satellite', 1500); hudLog.push(hudNow()); await wait(5000); hudLog.push(hudNow());
  await shot('u15-sky-low-satellite-later', 500);
  const o = { hudLog, id: best.r.id, name: best.r.name, altDeg: +best.alt.toFixed(1), tag: box(tag), ring: ringEl ? { cls: ringEl.className.toString().slice(0, 60), box: box(ringEl) } : null, hud: $$('#hud > *, .sr-hud > *').slice(0, 6).map((n) => ({ c: n.className.toString().slice(0, 40), b: box(n) })) };
  try { ctx.skyView.leave ? ctx.skyView.leave() : ctx.skyView.exit && ctx.skyView.exit(); } catch { /* stays */ }
  return o;
});
await run('phoneScene', async () => {
  await homeView(); try { if (ctx.skyView.active) (ctx.skyView.leave || ctx.skyView.exit).call(ctx.skyView); } catch { /* stays */ }
  const o = { tier: ctx.quality.tier };
  ctx.clock.setPaused(true); ctx.clock.goTo(Date.UTC(2026, 9, 9, 22, 0));
  await goTo('earth'); await wait(2500); const d0 = ctx.cameraRig.state.distance;
  standAt('earth', 165, -25, 1); ctx.cameraRig.flyTo({ distance: d0 * 0.6, ms: 0 }); await shot('p1-earth-night', 4000);
  for (const [i, id] of ['dso-m42', 'dso-m1', 'dso-m16', 'dso-m42'].entries()) {
    if (ctx.deselect) ctx.deselect();
    if (!(await goTo(id, 40000))) continue;
    await wait(5000); await shot(`p2-${i}-${id}`, 2000);
    o[i + '-' + id] = { drawn: ctx.nebulae ? ctx.nebulae.drawn(id) : null, budget: ctx.nebulae && ctx.nebulae.budget ? ctx.nebulae.budget() : null, dist: ctx.cameraRig.state.distance, stage: ctx.stage.worldId, pics: (performance.getEntriesByType('resource') || []).filter((e) => /nebula|dso|pictures/i.test(e.name) && /\.(webp|jpg|png|ktx2)/.test(e.name)).map((e) => e.name.split('/').pop()).slice(-12) };
  }
  const st = await ctx.wantImagine('3');
  if (st) { await until(() => ctx.imagine && ctx.imagine.active, 15000); ctx.imagine.freeze(40); ctx.imagine.setView({ phaseDeg: 52, elevationDeg: 14, fill: 2.4 }); await shot('p3-imagine-limb', 3500); o.imagine = ctx.imagine.state().tier; ctx.imagine.stop(); }
  return o;
});
await run('objectPages', async () => {
  // The static pages' one live line (internal #294), each in a frame of its own over this page.
  const o = {};
  for (const slug of ['mars', 'moon']) {
    const f = document.createElement('iframe'); f.src = `/o/${slug}.html`;
    f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100000;border:0;background:#fff';
    document.body.appendChild(f);
    await new Promise((r) => { f.onload = r; setTimeout(r, 15000); });
    const now = () => { try { const n = f.contentDocument.getElementById('now'); return n ? n.textContent : null; } catch (e) { return 'unreadable: ' + e.message; } };
    const first = now(); const t = Date.now();
    await until(() => /right now/.test(now() || ''), 8000, 100);
    o[slug] = { first, later: now(), ms: Date.now() - t, title: f.contentDocument.title };
    try { f.contentDocument.getElementById('now').scrollIntoView({ block: 'center' }); } catch { /* stays */ }
    await wait(600); await window.cdpShot(`o-${slug}`); out.shots.push(`o-${slug}`);
    f.remove();
  }
  return o;
});
await run('finder', async () => {
  // The place-made rows, asked for directly: through the worker (sky/findclient.js) and on this thread.
  const place = { latDeg: 51.5, lonDeg: -0.1, altKm: 0 }; const from = Date.UTC(2026, 10, 10, 20, 0);
  const m = await import('/js/sky/findclient.js'); const t = performance.now();
  const rows = await Promise.race([m.findFromPlace(place, from), wait(40000).then(() => 'no answer in 40 s')]);
  const workerMs = Math.round(performance.now() - t);
  const c = await import('/js/sky/conjunctions.js'); const t1 = performance.now();
  const direct = c.findConjunctions({ fromMs: from, days: 30, observer: place });
  return { worker: rows, workerMs, direct: direct.length, directMs: Math.round(performance.now() - t1) };
});
await run('nebulaDiag', async () => {
  // The pictures' own account of themselves while a phone flies Orion, the Crab, the Eagle, Orion (internal #345).
  const o = { tier: ctx.quality.tier, budget: null, log: [] };
  const brief = (id) => { const st = ctx.nebulae && ctx.nebulae.state ? ctx.nebulae.state() : []; const me = st.find((x) => x.id === id.slice(4)); return { ready: st.filter((x) => x.state === 'ready').map((x) => x.id).join(','), loading: st.filter((x) => x.state === 'loading').length, me }; };
  for (const [i, id] of ['dso-m42', 'dso-m1', 'dso-m16', 'dso-m42'].entries()) {
    if (ctx.deselect) ctx.deselect();
    if (!(await goTo(id, 40000))) continue;
    for (const ms of [500, 2500, 5000]) { await wait(ms === 500 ? 500 : 2500); o.log.push({ i, id, t: ms, ...brief(id) }); }
    await shot(`n-${i}-${id}`, 500);
  }
  o.budget = ctx.nebulae && ctx.nebulae.budget ? ctx.nebulae.budget() : null;
  return o;
});
return out;
