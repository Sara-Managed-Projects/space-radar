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
