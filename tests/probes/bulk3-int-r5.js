// tests/probes/bulk3-a-phone.js -- the phone looks of internal #563 and #565 (bulk 3, a).
// For tools/cdp.mjs with --mobile --width=390 --height=844 --gl=gpu --shot-dir=<dir>; the app is the page (`/?sw=0`).
//   1. a launch chip in the line under the search (the chip itself needs a launch inside a day, which a
//      saved copy of 18 days ago has not: a button of the chip's own class and the day's html class stand
//      in, so the LAYOUT is what is read): "voyager" typed in the search; is the first row's title
//      reachable (the element at its centre belongs to the list, not to the chip)?
//   2. the sky from a place on a launch day: the field line ('72° field · eye') against the chip's box;
//   3. the telescope on Saturn: the 'Following Saturn' line at 390 px (fits, not cut) with the sheet half open.
return (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 150) => {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); }
    return null;
  };
  const out = { window: [innerWidth, innerHeight], errors: [] };
  window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
  await until(() => window.__srLayersReady && window.spaceRadar, 90000, 300);
  const ctx = window.spaceRadar;
  if (!ctx) return { ...out, error: 'the app never came up' };
  const doc = document;
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const shot = async (name, settle = 600) => { await sleep(settle); if (window.cdpShot) await window.cdpShot(name); };
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const hit = (a, b) => !!(a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
  const PLACE = { name: 'Lisbon', latDeg: 38.72, lonDeg: -9.14, latRad: 38.72 * Math.PI / 180, lonRad: -9.14 * Math.PI / 180, altKm: 0, source: 'manual' };
  try { ctx.setObserver(PLACE); } catch (e) { out.errors.push('observer: ' + e.message); }
  ctx.clock.goTo(Date.parse('2026-10-10T21:30:00Z'));

  // ---- the stand-in chip
  const css = doc.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/finishers.css'; doc.head.appendChild(css);
  const line = doc.querySelector('#sr-top .sr-top__line');
  out.lineHost = !!line;
  const chip = doc.createElement('button'); chip.type = 'button'; chip.className = 'sr-launchchip'; chip.textContent = 'T-10:49:13';
  if (line) line.appendChild(chip);
  doc.documentElement.classList.add('sr-launchday');
  await sleep(1200);
  out.chipBox = box(chip);

  // ---- 1. the search list over the chip
  const input = doc.querySelector('.sr-search__input');
  if (input) {
    input.focus(); input.value = 'voyager'; input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(1800);
    const rows = [...doc.querySelectorAll('.sr-search__option')];
    out.rows = rows.slice(0, 4).map(text);
    const pop = doc.querySelector('.sr-top .sr-search__pop');
    out.popBox = box(pop);
    const first = rows[0] ? rows[0].querySelector('.sr-search__text') || rows[0] : null;
    out.firstBox = box(first);
    const c = chip.getBoundingClientRect();
    const probe = (x, y) => { const e = doc.elementFromPoint(x, y); return e ? (e.closest('.sr-search__pop') ? 'list' : e.closest('.sr-launchchip') ? 'CHIP' : e.tagName.toLowerCase()) : null; };
    out.atChipCentre = probe((c.left + c.right) / 2, (c.top + c.bottom) / 2);
    out.atFirstTitle = first ? probe(first.getBoundingClientRect().left + 20, first.getBoundingClientRect().top + 8) : null;
    out.listOverChip = hit(out.popBox, out.chipBox);
    await shot('search-over-chip', 300);
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.blur();
    await sleep(500);
  }

  // ---- 2. the sky's field line
  ctx.skyView.enter(PLACE);
  await until(() => ctx.skyView.active, 15000);
  await sleep(3500);
  const fov = await until(() => doc.querySelector('.sr-skyfov'), 8000);
  out.fovBox = box(fov); out.fovText = text(fov);
  out.fovHitsChip = hit(out.fovBox, box(chip));
  await shot('sky-field-line', 400);

  // ---- 3. the telescope on Saturn: the 'Following' line
  out.pointed = ctx.skyView.pointAt({ body: 'saturn' }, { instant: true });
  await sleep(2500);
  const handle = doc.querySelector('.sr-sheet__handle');
  if (handle) { handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(900); }
  const btn = [...doc.querySelectorAll('.sr-skybar button')].find((b) => /^\s*telescope\s*$/i.test(b.textContent || ''));
  out.telescopeButton = !!btn;
  if (btn) { if (btn.scrollIntoView) btn.scrollIntoView({ block: 'center' }); btn.click(); }
  await sleep(3000);
  const note = [...doc.querySelectorAll('.sr-skybar .sr-density__note')].find((n) => /Following/.test(n.textContent || ''));
  out.following = ctx.skyView.following;
  out.note = note ? { text: text(note), hidden: note.hidden, box: box(note), fits: note.scrollWidth <= note.clientWidth + 1, inside: note.getBoundingClientRect().right <= innerWidth } : null;
  if (note && note.scrollIntoView) note.scrollIntoView({ block: 'center' });
  await shot('following-line', 500);
  out.pageOverflow = doc.documentElement.scrollWidth > innerWidth + 1;
  // ---- 4. (integration) the sidebar's tabs at 390 px: each view with the sheet full open
  try { ctx.skyView.exit(); } catch { /* not in it */ }
  doc.documentElement.classList.remove('sr-launchday'); chip.remove();
  await sleep(2500);
  const h2 = doc.querySelector('.sr-sheet__handle');
  if (h2) { for (let i = 0; i < 2; i++) { h2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(700); } }
  out.sheet = doc.documentElement.dataset.sheet;
  const tabs = [...doc.querySelectorAll('[role="tab"]')].filter((b) => b.getBoundingClientRect().width > 0);
  out.tabs = tabs.map((b) => ({ text: text(b), box: box(b), cut: b.scrollWidth > b.clientWidth + 1 }));
  out.tabViews = [];
  for (const b of tabs.slice(0, 5)) {
    b.click(); await sleep(1800);
    const panel = doc.querySelector('[role="tabpanel"]:not([hidden])');
    const wide = panel ? [...panel.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 4).map((e) => (e.className || e.tagName).toString().slice(0, 40)) : null;
    out.tabViews.push({ tab: text(b), selected: b.getAttribute('aria-selected'), overflowX: doc.documentElement.scrollWidth > innerWidth + 1, offscreen: wide });
    await shot('tab-' + text(b).toLowerCase().replace(/[^a-z]+/g, '-').slice(0, 14), 300);
  }
  // ---- 5. (integration) the scale ladder on a phone-sized canvas: down under load, back up after it
  try {
    const T0 = performance.now(); const log = [];
    window.addEventListener('sr:scale', (e) => log.push([Math.round(performance.now() - T0), e.detail.ratio, e.detail.step]));
    const g = { dpr: devicePixelRatio, ladder: ctx.scaler.steps, start: ctx.scaler.step, latched0: ctx.latch.latched };
    let busy = true; const spin = () => { if (!busy) return; const t = performance.now(); while (performance.now() - t < 45) { /* a slow frame */ } requestAnimationFrame(spin); };
    requestAnimationFrame(spin);
    await until(() => ctx.scaler.step >= 2, 16000, 100); busy = false;
    g.underLoad = { log: log.slice(), step: ctx.scaler.step, canvas: ctx.renderer.domElement.width, latched: ctx.latch.latched, ms: Math.round(performance.now() - T0) };
    const med = { quick: 0, mid: 0, slow: 0 };
    const t1 = Date.now();
    while (Date.now() - t1 < 70000 && ctx.scaler.step > 0) { const m = ctx.scaler.median(); if (m < 20) med.quick++; else if (m <= 33) med.mid++; else med.slow++; await sleep(250); }
    g.after = { log: log.slice(), step: ctx.scaler.step, canvas: ctx.renderer.domElement.width, latched: ctx.latch.latched, medians: med, upHoldMs: ctx.scaler.upHoldMs, ms: Math.round(performance.now() - T0) };
    out.governor = g;
  } catch (e) { out.governor = String(e && e.stack || e).slice(0, 300); }
  return out;
})();
