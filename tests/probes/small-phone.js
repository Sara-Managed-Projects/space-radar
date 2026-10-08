// The small-issues package, the phone walk (320 x 568 or 390 x 844, --mobile --gl=gpu).
//   internal #457  the sheet's handle and "Explore" at full, with the scene's note up: 44 px under a finger
//   internal #202  the share sheet with the ISS selected at this width
//   internal #167, #250, #280, #307  the new pieces at a phone's width
const small = (root) => $$('button, a[href], input, select, [role=tab], summary', root).filter((n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.top < innerHeight && r.bottom > 0 && !n.disabled; }).map((n) => ({ el: say(n), name: (n.getAttribute('aria-label') || text(n) || '').slice(0, 24), ...(hit(n) || {}) })).filter((r) => (r.w && r.w < 44) || (r.h && r.h < 44));
const wide = (root) => $$('*', root).filter((n) => n.getBoundingClientRect().right > innerWidth + 1 || n.getBoundingClientRect().left < -1).slice(0, 6).map((n) => `${say(n)} ${JSON.stringify(box(n))}`);
const sideways = () => document.documentElement.scrollWidth - innerWidth;

// --- #457 --------------------------------------------------------------------------------------------
await run('targets', async () => {
  const o = {};
  // The note the gate's run had up (CelesTrak refused): any line shows it in the same place.
  ctx.sceneNote.say('Satellites could not be read.');
  await wait(500);
  const note = () => { const n = $('.sr-scenenote'); if (!n) return null; const cs = getComputedStyle(n); return { hidden: n.hidden, visibility: cs.visibility, box: box(n) }; };
  o.noteAtHalf = note();
  const read = (name) => { const h = $('.sr-sheet__handle'); const b = $$('.sr-side__back').find((n) => n.getBoundingClientRect().height > 0); o[name] = { view: ctx.shell.view(), detent: $('#sr-side').dataset.detent, handle: hit(h), back: b ? hit(b) : 'none', note: note() }; };
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status'), 10000);
  await sheetTo('full'); await wait(2500); read('sourcesFull');
  await shot('p1-sources-full');
  await sheetTo('half'); await wait(900); read('sourcesHalf');
  ctx.shell.back(); await wait(500); await sheetTo('full'); await wait(1200); read('homeFull');
  const mars = await pick('mars'); await sheetTo('full'); await wait(1200); read('cardFull');
  await sheetTo('half'); await wait(900); o.noteBackAtHalf = note();
  await shot('p2-note-back-at-half');
  const close = $('.sr-scenenote button[title], .sr-scenenote__close'); if (close) close.click();
  return o;
});
await home();

// --- #202 --------------------------------------------------------------------------------------------
await run('share', async () => {
  const rec = await pick('sat-25544');
  if (!rec) return { iss: false };
  await wait(2500);
  await ctx.share.open({ record: rec, opener: $('#sr-card [data-action="share"]') || document.body });
  const sheet = await until(() => { const s = $('#sr-share'); return s && !s.hidden ? s : null; }, 20000);
  await until(() => ctx.lastShare && ctx.lastShare.picture, 60000);
  await wait(4500);
  const read = () => ({ detent: sheet.dataset.detent, box: box(sheet), body: (() => { const b = $('.sr-share__body'); return b ? { box: box(b), scroll: [b.scrollHeight, b.clientHeight], overflowY: getComputedStyle(b).overflowY } : null; })(), sideways: sideways(), wide: wide(sheet), under44: small(sheet), picture: (() => { const i = $('.sr-share__img'); return i ? [i.naturalWidth, i.naturalHeight, box(i)] : null; })() });
  const o = { iss: true, title: text($('.sr-share__title')), first: read() };
  await shot('p3-share-open');
  // Up to full, as the handle's own key does, and to the foot of what is in it.
  const handle = $('#sr-share .sr-sheet__handle') || $('#sr-share [class*="handle"]');
  o.handle = handle ? { el: say(handle), ...hit(handle) } : null;
  if (handle) { handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await wait(700); handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await wait(900); }
  o.full = read();
  await shot('p4-share-full');
  const body = $('.sr-share__body'); if (body) { body.scrollTop = body.scrollHeight; await wait(600); }
  o.foot = { under44: small(sheet), wide: wide(sheet), lastRow: text($$('.sr-share__nets, .sr-share__acts', sheet).pop()) };
  await shot('p5-share-foot');
  o.fonts = [...new Set($$('#sr-share *').filter((n) => n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).map((n) => parseFloat(getComputedStyle(n).fontSize)))].sort((a, b) => a - b);
  ctx.share.close(); await wait(600);
  return o;
});
await home();

// --- the new pieces at this width ---------------------------------------------------------------------
await run('nebula', async () => {
  if (!(await pick('dso-m42'))) return { rec: false };
  await sheetTo('full'); await openSection('about');
  const fig = await until(() => $('#sr-card .sr-card__exposure .sr-card__figure'), 8000);
  if (!fig) return { figure: false };
  fig.scrollIntoView({ block: 'start' });
  const img = fig.querySelector('img'); await until(() => img.complete && img.naturalWidth > 0, 8000); await wait(500);
  const o = { drawn: box(img), caption: text(fig.querySelector('figcaption')), sideways: sideways(), wide: wide($('#sr-card')), creditLink: (() => { const a = $('#sr-card .sr-card__picture a'); return a ? { ...hit(a), inline: getComputedStyle(a).display } : null; })() };
  await shot('p6-m42-card');
  return o;
});
await home();
await run('look', async () => {
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status__look'), 10000);
  await sheetTo('full');
  const b = $('#sr-side .sr-status__look'); b.scrollIntoView({ block: 'start' }); await wait(600);
  const o = { box: box(b), sideways: sideways(), wide: wide(b) };
  await shot('p7-sources-look');
  return o;
});
await home();
await run('system', async () => {
  location.hash = 'go=lhs-1140';
  await until(() => ctx.systems && ctx.systems.active && ctx.shell.view() === 'card', 25000); await wait(3000);
  await shot('p8-system-plain');
  await sheetTo('full'); await openSection('about');
  const btns = $$('#sr-card [data-overlay]');
  if (btns[0]) btns[0].scrollIntoView({ block: 'center' });
  await wait(400);
  const o = { buttons: btns.map((b) => ({ text: text(b), box: box(b), ...hit(b) })), sideways: sideways() };
  for (const b of btns) b.click();
  await wait(600);
  o.note = text(btns[0] && btns[0].closest('section').querySelector('.sr-density__note'));
  await shot('p9-system-card');
  await sheetTo('half'); await wait(1200);
  await shot('p10-system-overlaid');
  return o;
});
await home();
if (ctx.stage.worldId !== 'earth') { ctx.setStage('earth'); await wait(1500); }
await run('intro', async () => {
  await ctx.trip.start('people-in-space');
  await until(() => ctx.trip.state.phase === 'intro' && $('.sr-tripsheet__truth'), 20000); await wait(800);
  const n = $('.sr-tripsheet__truth');
  const o = { line: text(n), box: box(n), lines: n ? Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)) : null, start: (() => { const s = $('.sr-tripsheet__start'); return s ? { box: box(s), inView: s.getBoundingClientRect().bottom <= innerHeight } : null; })(), detent: $('#sr-side').dataset.detent, sideways: sideways() };
  await shot('p11-intro');
  ctx.trip.stop(); await wait(800);
  return o;
});
return out;
