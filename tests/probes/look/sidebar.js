// sidebar: the left panel's three journeys, before and after the sidebar fix (2026-11-23): open an object from the search,
// get back to the search, hide the panel and show it again; on a phone, the card in the sheet, the way back and a swipe down.
// Written for both sides of the change: each step looks for the new control first and the old one second, so the same probe
// photographs main as it was (the BEFORE) and the branch (the AFTER). Run after the prelude:
//   cat _prelude.js sidebar.js > /tmp/p.js; node tools/cdp.mjs <url> /tmp/p.js --shot-dir=<dir> [--mobile --width=390 --height=844]
// or on a runner: gh workflow run look.yml -f probe=sidebar -f ref=<sha> [-f mobile=true]
look.probe = 'sidebar';
const out = { took: [], steps: {} };
const phone = document.documentElement.classList.contains('sr-phone');
const settle = (ms = 1500) => sleep(ms);
const shown = (e) => !!e && !e.closest('[hidden]') && e.getClientRects().length > 0;
const find = (sel) => [...document.querySelectorAll(sel)].find(shown) || null;
const snap = async (name) => { await shot(name); out.took.push(name); };
const said = () => {
  const side = document.getElementById('sr-side');
  const back = find('.sr-side__back');
  return { view: side && side.dataset.view, collapsed: !!(side && side.classList.contains('is-collapsed')), back: back ? back.textContent.trim() : null, sheet: document.documentElement.dataset.sheet || null };
};

// the first visit's welcome, out of the way
const away = document.querySelector('[data-entrance="explore"]') || document.querySelector('.sr-welcome .ui-btn, .sr-welcome button');
if (away) away.click();
await settle(2000);
await snap('1-home');

// 1. open an object from the search: "mars", its row
const input = find('.sr-search__input');
if (!input) return finish({ fail: 'no search field on screen', ...out });
input.focus();
input.value = 'mars';
input.dispatchEvent(new Event('input', { bubbles: true }));
await until(() => find('.sr-search__list [role="option"]'), 20000);
await settle(1500);
await snap('2-results');
// The planet's row, which leads the list ("MarsPlanet" as text): never the trip "Mars, where we have driven" under it.
const row = [...document.querySelectorAll('.sr-search__list [role="option"]')].find((o) => shown(o) && /^\s*Mars(?![a-z,])/.test(o.textContent)) || find('.sr-search__list [role="option"]');
if (row) row.click();
await until(() => shown(document.getElementById('sr-card')), 30000);
await settle(5000);
out.steps.card = said();
await snap('3-card');

// 2. back to the search: the back row when there is one (the breadcrumb), the card's close otherwise
const back = find('.sr-side__back') || find('.sr-card__close');
out.steps.backWas = back ? (back.textContent.trim() || back.getAttribute('aria-label')) : null;
if (back) back.click();
await settle(2500);
out.steps.afterBack = { ...said(), card: shown(document.getElementById('sr-card')), selected: !!(sr.selected && sr.selected()) };
await snap('4-back');

if (!phone) {
  // 3. hide the panel and show it again, with a card open (the strip names it)
  const mars = sr.recordById('mars');
  if (mars) sr.select(mars, { fly: false });
  await settle(3000);
  const hide = find('.sr-side__hide') || find('.sr-explore__collapse');
  out.steps.hideWas = hide ? (hide.getAttribute('aria-label') || hide.textContent.trim()) : null;
  if (hide) hide.click();
  await settle(2000);
  out.steps.hidden = said();
  await snap('5-hidden');
  const open = find('.sr-strip__open') || find('.sr-side__handle');
  if (open) open.click();
  await settle(2000);
  out.steps.reopened = said();
  await snap('6-shown');
} else {
  // 3. on a phone: the card again, then a swipe down on the sheet's handle
  const mars = sr.recordById('mars');
  if (mars) sr.select(mars, { fly: false });
  await settle(3500);
  out.steps.phoneCard = said();
  await snap('5-phone-card');
  const side = document.getElementById('sr-side');
  const handle = side && side.querySelector('.sr-sheet__handle');
  if (handle) {
    const r = handle.getBoundingClientRect();
    const x = r.left + r.width * 0.75;
    let y = r.top + r.height / 2;
    const t0 = performance.now();
    const ev = (type) => handle.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0 }));
    ev('pointerdown');
    for (let i = 0; i < 8; i++) { y += 40; ev('pointermove'); await sleep(12); }
    ev('pointerup');
    out.steps.swipeMs = Math.round(performance.now() - t0);
  }
  await settle(2500);
  out.steps.afterSwipe = { ...said(), card: shown(document.getElementById('sr-card')), selected: !!(sr.selected && sr.selected()) };
  await snap('6-swipe-down');
}
return finish(out);
