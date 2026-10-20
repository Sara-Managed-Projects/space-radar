// narrow: the card's quiet row and Tonight's place line on the narrowest phone, and the order the
// keyboard walks them in (public #1073 left both unchecked: "320 px wide, keyboard order in a real
// browser"). Run with -f width=320 -f height=700 (and at 360 x 780 to compare).
//
// For each of the two places it measures what a picture alone cannot prove: no horizontal scroll;
// every tile and button inside the screen, at least 44 px high, its words not cut (the button's
// own scrollWidth against its width); the two rows on one line each. Then the keyboard: the order
// Tab takes through the card (and through the place box) is the document's order of focusable
// elements, and it must be the order a reader meets them on the screen: top to bottom, and on one
// line left to right. A real Tab is also pressed through the card's controls from its first one,
// as real keys from the protocol where the tool offers them (window.cdpInput, tools/cdp.mjs), and the
// focused element read after each press. Fails on any of it.
look.probe = 'narrow';
const out = { card: {}, place: {}, problems: [] };
const q = (s, root = document) => root.querySelector(s);
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const full = async () => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set('full'); await sleep(900); } };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const shown = (n) => { if (!n || n.closest('[hidden], [inert]')) return false; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
const label = (n) => (n.getAttribute('aria-label') || n.textContent || n.placeholder || n.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
/** The keyboard's order (the document's, as no tabindex here is positive) against the reading order. */
const order = (root, name) => {
  const els = [...root.querySelectorAll(FOCUSABLE)].filter(shown);
  const positive = els.filter((n) => Number(n.getAttribute('tabindex')) > 0).map(label);
  if (positive.length) out.problems.push(name + ': a positive tabindex reorders the keyboard: ' + positive.join(', '));
  const tab = els.map((n) => ({ n, r: n.getBoundingClientRect() }));
  // Reading order: rows by their middle (two controls whose middles are within 12 px are one line).
  const read = [...tab].sort((a, b) => {
    const ma = a.r.top + a.r.height / 2; const mb = b.r.top + b.r.height / 2;
    return Math.abs(ma - mb) < 12 ? a.r.left - b.r.left : ma - mb;
  });
  const tabNames = tab.map((x) => label(x.n));
  const readNames = read.map((x) => label(x.n));
  const same = tabNames.join(' | ') === readNames.join(' | ');
  if (!same) out.problems.push(name + ': the keyboard goes ' + tabNames.join(' > ') + ' but the screen reads ' + readNames.join(' > '));
  return { keyboard: tabNames, screen: readNames, same };
};
/** Real Tab presses from `first`, where the tool can press keys; else null. */
const tabWalk = async (first, count) => {
  if (typeof window.cdpInput !== 'function' || !first) return null;
  first.focus();
  const seen = [label(document.activeElement)];
  for (let i = 0; i < count; i++) { await window.cdpInput('key', 'Tab'); await sleep(120); seen.push(label(document.activeElement)); }
  return seen;
};
const fit = (els, name) => {
  const rows = els.filter(Boolean).map((n) => ({ name: label(n), ...box(n), cut: n.scrollWidth > n.clientWidth + 1, inside: n.getBoundingClientRect().left >= -0.5 && n.getBoundingClientRect().right <= innerWidth + 0.5 }));
  for (const r of rows) {
    if (!r.inside) out.problems.push(name + ': "' + r.name + '" goes past the screen\'s edge ' + JSON.stringify(r));
    if (r.h < 44) out.problems.push(name + ': "' + r.name + '" is ' + r.h + ' px high, under 44');
    if (r.cut) out.problems.push(name + ': the words of "' + r.name + '" are cut');
  }
  return rows;
};

// --- search by kind (internal spec 0076 W3-e): only with -f subject=search ---------------------------
// Four queries the stage row names ("galaxies", "moons of Saturn", "nebulae", "has a model"), each typed
// into the field the visitor has, a before of two of them with the kinds switched off for the shot
// (window.srSearchBefore, honoured only under ?look=1), the 3D toggle, Enter on the first row (it must
// still fly there), what each list costs in this page, and the same fit and keyboard checks as above.
if (new URLSearchParams(location.search).get('lookSubject') === 'search') {
  out.search = { queries: {} };
  const field = () => [...document.querySelectorAll('.sr-search__input')].find(shown);
  const wrapOf = (n) => n && n.closest('.sr-search');
  const ask = async (text) => {
    const input = field();
    if (!input) return null;
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(400);
    const wrap = wrapOf(input);
    await until(() => !wrap.querySelector('.sr-search__pop').hidden && !/counting/.test(wrap.querySelector('.sr-search__foot').textContent), 8000);
    await sleep(700);
    const opts = [...wrap.querySelectorAll('.sr-search__list [role="option"]')];
    const heads = [...wrap.querySelectorAll('.sr-search__list .sr-search__head')].map((n) => n.textContent);
    const toggle = wrap.querySelector('.sr-search__only');
    const minH = innerWidth < 900 ? 44 : 24;
    const rows = opts.map((n) => ({ name: (n.querySelector('.sr-search__name') || n).textContent, what: (n.querySelector('.sr-search__what') || {}).textContent || '', h: Math.round(n.getBoundingClientRect().height), described: !!n.getAttribute('aria-describedby') }));
    for (const r of rows) if (r.h < minH) out.problems.push(`search "${text}": the row "${r.name}" is ${r.h} px high, under ${minH}`);
    const tb = toggle && !toggle.hidden ? box(toggle) : null;
    if (tb && tb.h < minH) out.problems.push(`search "${text}": the 3D toggle is ${tb.h} px high, under ${minH}`);
    if (document.documentElement.scrollWidth > innerWidth) out.problems.push(`search "${text}": the page scrolls sideways`);
    for (const h of heads) if (wrap.querySelector('.sr-search__head') && wrap.querySelector('.sr-search__head').scrollWidth > wrap.querySelector('.sr-search__head').clientWidth + 1) out.problems.push(`search "${text}": the microlabel "${h}" is cut`);
    return { rows, heads, foot: wrap.querySelector('.sr-search__foot').textContent, toggle: tb, pressed: toggle ? toggle.getAttribute('aria-pressed') : null, active: field().getAttribute('aria-activedescendant') };
  };
  // The list's own cost in this page: the modules the field loaded, on the records the map holds now.
  const S = await import(new URL('js/ui/search.js', document.baseURI).href);
  const R = await import(new URL('js/ui/searchrows.js', document.baseURI).href);
  const cost = async (text, only = false) => {
    await Promise.all([R.loadClasses(), R.wantKinds({ row: { model: true } }, true)]);
    const layers = Array.isArray(sr.layers) ? sr.layers : (sr.layers && (sr.layers.LAYERS || sr.layers.list)) || [];
    const index = S.buildIndex(sr.records(), layers);
    const runs = [];
    for (let k = 0; k < 7; k++) {
      const t0 = performance.now();
      const kind = R.readKind(text, index);
      R.byKind(index, S.findMatches(index, text, 5000), kind, { limit: 8, only });
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    return { records: index.n, medianMs: +runs[3].toFixed(2), worstMs: +runs[6].toFixed(2) };
  };
  // A phone's results hang under the top bar over the scene, as tall as the sheet leaves them: at peek.
  if (innerWidth < 900) { const sh = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (sh && sh.set) { sh.set('peek'); await sleep(900); } }
  window.srSearchBefore = true;
  out.search.before = { galaxies: await ask('galaxies') };
  await shot('search-0-before-galaxies', innerWidth + ' px, before: "galaxies" with search by kind switched off (what main shows)');
  out.search.before.moons = await ask('moons of saturn');
  await shot('search-0-before-moons', innerWidth + ' px, before: "moons of saturn" with search by kind switched off');
  window.srSearchBefore = false;
  const queries = [['galaxies', '1'], ['moons of saturn', '2'], ['nebulae', '3'], ['has a model', '4']];
  for (const [text, n] of queries) {
    out.search.queries[text] = await ask(text);
    out.search.queries[text].cost = await cost(text);
    await shot(`search-${n}-${text.replace(/\s+/g, '-')}`, `${innerWidth} px: "${text}", grouped by class: ${(out.search.queries[text] && out.search.queries[text].heads.join(' / ')) || 'no groups'}`);
    const got = out.search.queries[text];
    if (!got || !got.rows.length) out.problems.push(`search "${text}": no rows`);
    else if (!got.heads.length) out.problems.push(`search "${text}": rows but no group microlabel`);
  }
  // The toggle: "galaxies" with 3D models only.
  await ask('galaxies');
  { const t = field() && wrapOf(field()).querySelector('.sr-search__only'); if (t && !t.hidden) t.click(); else out.problems.push('search "galaxies": no 3D toggle under the results'); }
  await sleep(1500);
  out.search.toggled = await ask('galaxies');
  out.search.toggled.cost = await cost('galaxies', true);
  if (out.search.toggled.pressed !== 'true') out.problems.push('search: the 3D toggle does not say it is pressed');
  await shot('search-5-galaxies-3d', `${innerWidth} px: "galaxies" with 3D models only: ${out.search.toggled.rows.map((r) => r.name).join(', ')}`);
  { const t = wrapOf(field()).querySelector('.sr-search__only'); if (t) t.click(); await sleep(600); }
  // The keyboard: the field, Fly to it, the toggle, in the order the screen reads them.
  // Fly to it is drawn for a screen reader only in the sidebar and the bar (css/ui.css: absolute, 1 px,
  // clip: rect(0 0 0 0)): a clipped control is not on the screen to read, whatever its box says (its padding
  // kept it wider than 1 px, so the first version of this check counted it as the first thing read).
  const srOnly = (n) => { const cs = getComputedStyle(n); const r = n.getBoundingClientRect(); return (cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none') || r.width <= 1 || r.height <= 1; };
  {
    const els = [...wrapOf(field()).querySelectorAll(FOCUSABLE)].filter((n) => shown(n) && !srOnly(n));
    const read = els.map((n) => ({ n, r: n.getBoundingClientRect() })).sort((a, b) => { const ma = a.r.top + a.r.height / 2; const mb = b.r.top + b.r.height / 2; return Math.abs(ma - mb) < 12 ? a.r.left - b.r.left : ma - mb; });
    out.search.order = { keyboard: els.map(label), screen: read.map((x) => label(x.n)) };
    if (out.search.order.keyboard.join(' | ') !== out.search.order.screen.join(' | ')) out.problems.push('search: the keyboard goes ' + out.search.order.keyboard.join(' > ') + ' but the screen reads ' + out.search.order.screen.join(' > '));
  }
  // Enter on the first row of "moons of saturn" flies there, as it always did.
  const moons = await ask('moons of saturn');
  const firstName = moons && moons.rows[0] && moons.rows[0].name;
  if (typeof window.cdpInput === 'function') await window.cdpInput('key', 'Enter');
  else field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await sleep(7000);
  const picked = sr.selected && sr.selected();
  out.search.flew = { first: firstName, selected: picked ? picked.name : null };
  if (!picked || !firstName || picked.name.toLowerCase() !== firstName.toLowerCase()) out.problems.push(`search: Enter on "${firstName}" selected ${picked ? picked.name : 'nothing'}`);
  await shot('search-6-flown', `${innerWidth} px: Enter on the first row of "moons of saturn" (${firstName}): the camera went there`);
  try { if (sr.perf && sr.perf.stats) out.search.perf = sr.perf.stats(); } catch (e) { out.search.perf = String(e); }
  out.realKeys = typeof window.cdpInput === 'function';
  if (out.problems.length) out.fail = out.problems.join(' | ');
  return finish(out);
}

// --- the card --------------------------------------------------------------------------------------
const iss = sr.recordById('sat-25544') || sr.recordsFor('stations')[0];
if (!iss) return finish({ fail: 'no station to open a card for' });
sr.select(iss, { fly: true, undo: false });
await until(() => q('#sr-card [data-action="flood"]') && q('#sr-card [data-action="seen"]'), 30000);
await sleep(4000);
await full();
{
  const acts = q('#sr-card .sr-card__actions');
  const lamp = q('#sr-card [data-action="flood"]');
  const seen = q('#sr-card [data-action="seen"]');
  if (acts) acts.scrollIntoView({ block: 'start' });
  await sleep(800);
  const tiles = [...document.querySelectorAll('#sr-card .sr-card__actions .sr-act, #sr-card .sr-card__sky .sr-card__tool')];
  out.card.tiles = fit(tiles, 'card');
  out.card.oneRow = !!(lamp && seen && Math.abs(lamp.getBoundingClientRect().top - seen.getBoundingClientRect().top) < 1);
  if (!out.card.oneRow) out.problems.push('card: Light it and Seen it are not on one line');
  out.card.wide = document.documentElement.scrollWidth > innerWidth;
  if (out.card.wide) out.problems.push('card: the page scrolls sideways (' + document.documentElement.scrollWidth + ' px)');
  await shot('1-card', innerWidth + ' px: the card\'s four actions and its quiet row, at rest');
  lamp.click(); await sleep(1500);
  seen.click(); await sleep(5000);
  out.card.pressed = fit([lamp, seen], 'card, pressed');
  out.card.pressedWords = [lamp.textContent, seen.textContent];
  await shot('2-card-pressed', innerWidth + ' px: both pressed, "' + lamp.textContent + '" and "' + seen.textContent + '"');
  out.card.order = order(q('#sr-card'), 'card');
  const first = q('#sr-card').querySelector(FOCUSABLE);
  out.card.tabbed = await tabWalk(first, Math.min(14, out.card.order.keyboard.length - 1));
  if (out.card.tabbed && out.card.tabbed.join(' | ') !== out.card.order.keyboard.slice(0, out.card.tabbed.length).join(' | ')) out.problems.push('card: real Tab presses went ' + out.card.tabbed.join(' > '));
  lamp.click(); await sleep(600);
  seen.click(); await sleep(400);
}

// --- Tonight's place line ---------------------------------------------------------------------------
sr.deselect();
await sleep(800);
{ const t = q('[role="tab"][data-tab="tonight"]'); if (t) t.click(); }
await sleep(6000);
await until(() => q('#sr-tonight-place'), 30000);
await full();
{
  const host = q('#sr-tonight-place');
  if (host && host.hidden) { const c = q('.sr-tonight-view__change'); if (c) { c.click(); await sleep(800); } }
  const input = q('.sr-place__input');
  const mine = q('.sr-place__mine') || [...document.querySelectorAll('#sr-tonight-place button')].find((b) => b.textContent === 'Use my location');
  if (input) input.scrollIntoView({ block: 'center' });
  await sleep(600);
  out.place.parts = fit([input, mine], 'place');
  const a = input && input.getBoundingClientRect();
  const b = mine && mine.getBoundingClientRect();
  out.place.oneLine = !!(a && b && Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 1.5 && b.left >= a.right);
  if (!out.place.oneLine) out.problems.push('place: the city box and Use my location are not on one line');
  out.place.inputWidth = a ? Math.round(a.width) : null;
  if (a && a.width < 120) out.problems.push('place: the city box is ' + Math.round(a.width) + ' px wide, too narrow to type a city in');
  out.place.wide = document.documentElement.scrollWidth > innerWidth;
  if (out.place.wide) out.problems.push('place: the page scrolls sideways');
  out.place.order = order(host || document.body, 'place');
  out.place.tabbed = await tabWalk(input, Math.min(4, out.place.order.keyboard.length - 1));
  await shot('3-place', innerWidth + ' px: Tonight, Change place open: the city box and Use my location on one line');
}
out.realKeys = typeof window.cdpInput === 'function';
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
