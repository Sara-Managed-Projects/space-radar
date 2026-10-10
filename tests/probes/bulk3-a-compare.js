// tests/probes/bulk3-a-compare.js -- two builds of the app side by side in one Chrome (bulk 3, a).
// The page is `/robots.txt?probe=compare` on a server whose site/ holds the build under test and,
// in site/base/, the build it is compared with (same origin, so both are scriptable). For
// tools/cdp.mjs with --gl=gpu --width=2880 --height=900. Left frame: base. Right frame: new.
//   1. the sidebar's four tabs in both (the spacing moves of internal #554, each read in a picture);
//   2. in the new frame: "orion" in the search, pressed (the dome turns to the figure);
//   3. in the new frame: the volume sliders of What to show and of a trip's toolbar moving together;
//   4. in the new frame: the two trips that wait for live data (people-in-space, journey-to-the-station).
return (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 150) => {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); }
    return null;
  };
  const T0 = Date.now();
  const out = { errors: [], shots: [] };
  document.body.textContent = '';
  document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
  const frames = [];
  for (const [i, path] of ['base/', ''].entries()) {
    const f = document.createElement('iframe');
    f.style.cssText = `position:fixed;top:0;left:${i * 50}vw;width:50vw;height:100vh;border:0;background:#000`;
    f.src = new URL(`./${path}?sw=0`, location.href).href;
    document.body.appendChild(f);
    frames.push(f);
  }
  const W = (i) => frames[i].contentWindow;
  for (const i of [0, 1]) await until(() => W(i).__srLayersReady && W(i).spaceRadar, 90000, 300);
  out.booted = [0, 1].map((i) => !!(W(i).spaceRadar));
  const shot = async (name, settle = 700) => { await sleep(settle); if (window.cdpShot) await window.cdpShot(name); out.shots.push(name); };
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const PLACE = { name: 'Lisbon', latDeg: 38.72, lonDeg: -9.14, latRad: 38.72 * Math.PI / 180, lonRad: -9.14 * Math.PI / 180, altKm: 0, source: 'manual' };

  // ---- 1. the four tabs, both builds, and the heights of the sections in each
  out.sections = {};
  for (const tab of ['earth', 'planets', 'stars', 'tonight']) {
    for (const i of [0, 1]) { try { W(i).spaceRadar.explore.setTab(tab); } catch (e) { out.errors.push(`${i} ${tab}: ${e.message}`); } }
    await sleep(1500);
    out.sections[tab] = [0, 1].map((i) => [...W(i).document.querySelectorAll('.sr-sect')].filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().height)));
    await shot(`tab-${tab}`, 400);
  }
  out.headHeights = [0, 1].map((i) => { const h = W(i).document.querySelector('.sr-explore__head'); return h ? Math.round(h.getBoundingClientRect().height) : null; });

  // ---- 2. orion
  const w = W(1); const ctx = w.spaceRadar; const doc = w.document;
  try { ctx.setObserver(PLACE); } catch (e) { out.errors.push('observer: ' + e.message); }
  try { ctx.explore.setTab('earth'); } catch { /* the tab is named in setTab above */ }
  await sleep(1000);
  const input = doc.querySelector('.sr-search__input');
  out.search = {};
  if (input) {
    input.focus(); input.value = 'orion'; input.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(1500);
    out.search.rows = [...doc.querySelectorAll('.sr-search__option')].map(text).slice(0, 6);
    await shot('orion-list', 200);
    const row = [...doc.querySelectorAll('.sr-search__option')].find((e) => e.dataset.extra === 'constellation');
    out.search.row = !!row;
    if (row) {
      row.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, button: 0 }));
      await sleep(3000);
      out.search.after = { skyActive: !!ctx.skyView.active, look: ctx.skyView.look, note: text(doc.querySelector('.sr-scenenote')) };
      await shot('orion-aimed', 800);
    }
  }

  // ---- 3. the volume sliders
  try { ctx.audio.enable(); } catch (e) { out.errors.push('audio: ' + e.message); }
  const range = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const sliders = () => ({ panel: doc.querySelector('.sr-show__vol'), bar: doc.querySelector('.sr-trip__vol') });
  const read = () => { const s = sliders(); return { engine: Math.round(ctx.audio.volume() * 100), panel: s.panel ? Number(s.panel.value) : null, bar: s.bar ? Number(s.bar.value) : null }; };
  out.volume = [];
  // What to show is opened by its rail button (H and the eye); the panel builds the slider with its section.
  const showBtn = doc.querySelector('.sr-rail__btn--show') || [...doc.querySelectorAll('button')].find((b) => /what to show/i.test(b.getAttribute('aria-label') || b.title || ''));
  if (showBtn) { showBtn.click(); await sleep(1200); }
  const plan = await ctx.trip.start('moon-landings');
  if (plan && plan.offerable !== false) {
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    ctx.trip.play(); await sleep(2500);
    const s = sliders();
    out.volume.push({ step: 'start', ...read() });
    if (s.bar) { range(s.bar, 25); await sleep(300); out.volume.push({ step: 'bar 25', ...read() }); }
    if (sliders().panel) { range(sliders().panel, 80); await sleep(300); out.volume.push({ step: 'panel 80', ...read() }); }
    await shot('volume-bar', 300);
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
  }
  await sleep(800);

  // ---- 4. the trips that wait for live data, from the saved copies
  out.trips = {};
  for (const [id, n] of [['people-in-space', 4], ['journey-to-the-station', 4]]) {
    if (Date.now() - T0 > 420000) { out.trips[id] = 'not started'; continue; }
    const p = await ctx.trip.start(id);
    if (!p || p.offerable === false) { out.trips[id] = { error: (p && p.reason) || 'no plan' }; continue; }
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    const rows = [];
    ctx.trip.play();
    for (let k = 0; k < p.count; k++) {
      if (k > 0) ctx.trip.jumpTo(k);
      await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === k, 40000, 100);
      await sleep(2200);
      rows.push({ n: k + 1, id: ctx.trip.state.stopId, phase: ctx.trip.state.phase, caption: text(doc.querySelector('.sr-tripsheet')).slice(0, 160), names: [...doc.querySelectorAll('#labels .label')].filter((e) => e.offsetParent !== null).map(text).filter(Boolean).slice(0, 6) });
      await shot(`${id}-${k + 1}`, 100);
    }
    out.trips[id] = { count: p.count, rows };
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
    await sleep(500);
  }
  out.s = Math.round((Date.now() - T0) / 1000);
  return out;
})();
