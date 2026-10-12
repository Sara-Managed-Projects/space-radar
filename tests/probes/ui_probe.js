// Probe for tools/cdp.mjs and scripts/check-ui.mjs (CI: the `ui` job of screens.yml): the UI gate's headless half (docs/ui-guide.md
// section 7, spec 0061 task 6).
//
//   python3 tools/serve.py site 8851 &
//   node tools/cdp.mjs 'http://127.0.0.1:8851/?walk=gate' tests/probes/ui_probe.js \
//     --width=390 --height=844 --mobile --net=4g --block=celestrak.org,ll.thespacedevs.com
//   (and at --width=1440 --height=900; add --shot-dir=<dir> and ?walk=audit for the pictures)
//
// WHAT IT IS. The static tests read the stylesheets and the builders as text. This walks the app
// the way a visitor does (home, a tab, a card, What to show, the share sheet, the sources, a trip)
// and at every stop MEASURES what is on screen, because four of the guide's rules are only true of
// a laid-out page:
//
//   - a touch target is 44 x 44 on a coarse pointer and 24 x 24 anywhere (principle 9). Measured
//     as the HIT area, by asking the browser what is under each point around the control's centre:
//     a 32 px close button whose ::after reaches 44 passes, a 44 px button half under its
//     neighbour does not. A bounding box would get both wrong.
//   - every control has a name, and an icon-only one has a tooltip too (section 3);
//   - nothing a person reads is under 13 px, the units at 11 excepted (section 2.2);
//   - the page never scrolls sideways (section 5), and at most one ember-filled button shows
//     (principle 3).
//
// `?walk=gate` is CI's walk: only states that need no live data (a planet's card, not the ISS).
// `?walk=audit` is the long one behind the audit table of the PR that added this file: every
// component of section 3, each photographed (window.cdpShot) in the states a real pointer and a
// real key can reach (window.cdpInput: `:hover` and `:focus-visible` do not answer to synthetic
// events). It returns { ok, problems, states: { name: {...} } }.
if (!location.href.startsWith('http')) return { href: location.href };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WALK = (/[?&]walk=(\w+)/.exec(location.search) || [0, 'gate'])[1];
const ONLY = (/[?&]only=([\w,-]+)/.exec(location.search) || [0, ''])[1].split(',').filter(Boolean);
const AUDIT = WALK === 'audit';
const t0 = Date.now();
while (!(window.spaceRadar && window.spaceRadar.explore && window.spaceRadar.rail) && Date.now() - t0 < 150000) await wait(300);
const ctx = window.spaceRadar;
if (!ctx) return { ok: false, problems: ['the app never booted'] };
await new Promise((r) => { if (window.__srLayersReady) r(); window.addEventListener('sr:layers-ready', r, { once: true }); setTimeout(r, 90000); });
await wait(AUDIT ? 6000 : 1500);

const COARSE = matchMedia('(pointer: coarse)').matches;
const MIN = COARSE ? 44 : 24;
// The units beside a number, the only text under 13 px (tests/test_tokens.mjs holds the same list).
const UNIT = '.sr-clock__tag, .sr-traj__label, .sr-tag__unit, .sr-arc__cardinal';
const EMBER = 'rgb(255, 159, 67)';

const shown = (el) => {
  if (!el.isConnected || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
  }
  return true;
};
const inView = (r) => r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
const say = (el) => {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
  return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`;
};
const nameOf = (el) => {
  const by = (el.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
  const lab = el.labels && el.labels.length ? el.labels[0].textContent.trim() : '';
  return (el.getAttribute('aria-label') || '').trim() || by || lab || (el.textContent || '').trim() || (el.getAttribute('alt') || '').trim();
};
// An icon-only control: no word a sighted visitor can read, so its name is the tooltip's job too.
// One capital letter or digit on its own is a word (the network called X; internal #374): a glyph
// such as the multiplication sign of a close button is not a letter and stays wordless.
const wordless = (el) => { const t = (el.textContent || '').trim(); return !/[\p{L}\p{N}]{2,}/u.test(t) && !/^[\p{Lu}\p{N}]$/u.test(t); };
// A control drawn for a screen reader only (the 1 px clip): nothing a finger or a pointer can aim
// at, so it has no target to measure. The explore search's "Fly to it" is one (internal #374).
const forReadersOnly = (el) => {
  const cs = getComputedStyle(el);
  // The clip is the tell, not the size: under a coarse pointer the buttons' 44 px floor makes the
  // same hidden control a 30 x 44 box, still clipped to nothing (seen in CI, 2026-10-08).
  if (/^(absolute|fixed)$/.test(cs.position) && (/rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip || '') || /inset\(50%\)/.test(cs.clipPath || ''))) return true;
  const r = el.getBoundingClientRect();
  if (r.width > 2 || r.height > 2) return false;
  return cs.overflow !== 'visible' || cs.clipPath !== 'none' || (cs.clip && cs.clip !== 'auto');
};
/**
 * Is the control cut by something it can be brought out from under (internal #374)? The sheet's
 * edge, the window's, a scroller's: a 128 px trip card with 41 px showing above the fold is a
 * 128 px target a thumb scrolls to, and measuring the 41 reported 21 problems on 2026-10-05 of
 * which almost none were real. Returns 'window' or the scroller's name when the control's box is
 * not wholly inside; null when it is all there. A box cut by an ancestor that does NOT scroll
 * (overflow hidden with nothing to scroll) is not excused: what shows is all there will ever be.
 */
function cutBy(target) {
  const r = target.getBoundingClientRect();
  const T = 1;
  if (r.left < -T || r.top < -T || r.right > innerWidth + T || r.bottom > innerHeight + T) return 'window';
  for (let n = target.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const ys = /auto|scroll/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
    const xs = /auto|scroll/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
    if (!ys && !xs) continue;
    const b = n.getBoundingClientRect();
    if ((ys && (r.top < b.top - T || r.bottom > b.bottom + T)) || (xs && (r.left < b.left - T || r.right > b.right + T))) return say(n);
    if (cs.position === 'fixed') break;
  }
  return null;
}

/** The hit area's width and height around the control's centre, as the browser resolves it. */
function hitSize(el, target) {
  const r = target.getBoundingClientRect();
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const mine = (x, y) => {
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === target || target.contains(hit) || hit === el || (el.labels && [...el.labels].some((l) => l === hit || l.contains(hit))));
  };
  if (!mine(cx, cy)) return null; // covered, or scrolled out of its column: the box is all there is
  const run = (dx, dy) => { let n = 0; while (n < 40 && mine(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1; return n; };
  return { w: run(-1, 0) + run(1, 0) + 1, h: run(0, -1) + run(0, 1) + 1 };
}

// What lies over a target whose reachable part is smaller than its box: the elements at its four edges' middles
// that are not its own (2026-10-10: a search row measured 81 x 30 in CI and the report could not say by what).
function coveredBy(target) {
  const r = target.getBoundingClientRect();
  const at = [[r.left + r.width / 2, r.top + 2, 'top'], [r.left + r.width / 2, r.bottom - 2, 'bottom'], [r.left + 2, r.top + r.height / 2, 'left'], [r.right - 2, r.top + r.height / 2, 'right']];
  const out = [];
  for (const [x, y, side] of at) {
    const hit = document.elementFromPoint(Math.min(Math.max(x, 1), innerWidth - 1), Math.min(Math.max(y, 1), innerHeight - 1));
    if (hit && hit !== target && !target.contains(hit)) out.push(`${side}: ${say(hit)}`);
  }
  return ` [box ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)} x ${Math.round(r.height)}${out.length ? '; over it at ' + out.join(', ') : ''}]`;
}

function measure() {
  const problems = [];
  const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=tab], [role=switch], [role=menuitem], [role=option], summary')].filter(shown);
  let targets = 0;
  let clipped = 0;
  let readersOnly = 0;
  let smallest = Infinity;
  for (const el of controls) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    // A checkbox or radio is pressed through its label: the label is the target.
    const boxed = el.matches('input[type=checkbox], input[type=radio]');
    const target = boxed ? (el.closest('label') || (el.labels && el.labels[0]) || el) : el;
    const name = nameOf(el) || (boxed ? nameOf(target) : '');
    if (!name && !(el.matches('input') && el.placeholder)) problems.push(`no name: ${say(el)}`);
    if (el.matches('button, a[href], [role=tab]') && wordless(el)) {
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) problems.push(`icon-only without an aria-label: ${say(el)}`);
      if (!COARSE && !el.title) problems.push(`icon-only without a tooltip: ${say(el)} "${name.slice(0, 30)}"`);
    }
    // SC 2.5.8's exception, and the guide's: a link inside a sentence is as tall as its line.
    if (el.matches('a[href]') && getComputedStyle(el).display === 'inline' && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 8) continue;
    const r = target.getBoundingClientRect();
    if (!inView(r)) continue;
    if (forReadersOnly(target)) { readersOnly += 1; continue; }
    // Cut by the fold or by its scroller: its size is its BOX (what a thumb finds once it has
    // scrolled there), not the sliver on screen now. Counted, so a walk that measured nothing
    // because everything was cut shows as that.
    const cut = cutBy(target);
    if (cut) {
      clipped += 1;
      const w = Math.round(r.width); const h = Math.round(r.height);
      if (w < MIN || h < MIN) problems.push(`target ${w} x ${h} (box, cut by ${cut}), under ${MIN}: ${say(el)} "${name.slice(0, 30)}"`);
      continue;
    }
    const hit = hitSize(el, target) || { w: Math.round(r.width), h: Math.round(r.height), box: true };
    targets += 1;
    smallest = Math.min(smallest, hit.w, hit.h);
    if (hit.w < MIN || hit.h < MIN) problems.push(`target ${hit.w} x ${hit.h}${hit.box ? ' (box)' : ''}, under ${MIN}: ${say(el)} "${name.slice(0, 30)}"${hit.box ? '' : coveredBy(target)}`);
  }
  // Text: the 13 px floor, and what is drawn on more than one line (information for the audit).
  const wraps = [];
  const colours = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue.trim();
    const el = n.parentElement;
    if (!text || !el || el.closest('script, style, noscript, #labels') || !shown(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((q) => q.width > 1);
    if (!rects.length || !inView(range.getBoundingClientRect())) continue;
    const cs = getComputedStyle(el);
    const px = parseFloat(cs.fontSize);
    if (px < 13 && !(el.matches(UNIT) && px >= 11)) problems.push(`${px} px text: ${say(el)} "${text.slice(0, 30)}"`);
    colours[cs.color] = colours[cs.color] || `${say(el)} "${text.slice(0, 24)}"`;
    const lines = new Set(rects.map((q) => Math.round(q.top / 4))).size;
    if (lines > 1) wraps.push(`${lines} lines: ${say(el)} "${text.slice(0, 60)}"`);
  }
  const doc = document.scrollingElement;
  if (doc.scrollWidth > innerWidth + 1) problems.push(`the page scrolls sideways: ${doc.scrollWidth} px in a ${innerWidth} px window`);
  // One primary: an ember FILL on a control. The pill's dot and the bracket ticks are not controls.
  const primaries = controls.filter((el) => getComputedStyle(el).backgroundColor === EMBER && inView(el.getBoundingClientRect()) && !forReadersOnly(el));
  if (primaries.length > 1) problems.push(`${primaries.length} ember-filled buttons at once: ${primaries.map(say).join(', ')}`);
  const labels = [...document.querySelectorAll('#labels .label')].filter((l) => !l.hidden && l.getBoundingClientRect().width > 4);
  return { problems, targets, clipped, readersOnly, smallest: Number.isFinite(smallest) ? smallest : null, primaries: primaries.length, labels: labels.length, wraps, colours };
}

const states = {};
const problems = [];
async function state(name, opts = {}) {
  await wait(opts.settle == null ? 500 : opts.settle);
  const m = measure();
  if (!AUDIT) { delete m.wraps; delete m.colours; }
  states[name] = m;
  for (const p of m.problems) problems.push(`${name}: ${p}`);
  if (window.cdpShot) await window.cdpShot(name);
}
const $ = (s, root) => (root || document).querySelector(s);
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await wait(120); } return null; };
const step = async (name, fn) => {
  if (ONLY.length && !ONLY.includes(name)) return;
  try { await fn(); } catch (e) { problems.push(`${name}: the walk broke here: ${e && e.message}`); }
};
const phone = () => !!(ctx.shell && ctx.shell.isPhone && ctx.shell.isPhone());
const centre = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; };
const hover = async (el) => { if (window.cdpInput && el) { el.scrollIntoView({ block: 'nearest' }); await window.cdpInput('mouseMoved', ...centre(el)); } };
const press = async (el) => { if (window.cdpInput && el) await window.cdpInput('mousePressed', ...centre(el)); };
const release = async (el) => { if (window.cdpInput && el) { await window.cdpInput('mouseReleased', ...centre(el)); await window.cdpInput('mouseMoved', 2, 2); } };
const key = async (k) => { if (window.cdpInput) await window.cdpInput('key', k); };
const sheetTo = async (d) => { if (phone() && ctx.shell.sheet && ctx.shell.sheet()) { ctx.shell.sheet().set(d); await wait(500); } };
const home = async () => {
  if (ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') { ctx.trip.stop(); await wait(800); }
  if (ctx.share && ctx.share.isOpen && ctx.share.isOpen()) ctx.share.close();
  if (ctx.rail && ctx.rail.closeShow) ctx.rail.closeShow();
  if (ctx.cleanView && ctx.cleanView.isOn()) ctx.cleanView.set(false);
  if (ctx.selected && ctx.selected()) ctx.deselect();
  while (ctx.shell.view() !== 'home') { const was = ctx.shell.view(); ctx.shell.back(); if (ctx.shell.view() === was) break; }
  await wait(300);
};
const type = async (text) => {
  const input = [...document.querySelectorAll('.sr-search__input')].find(shown);
  if (!input) throw new Error('no search field on screen');
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(900);
  return input;
};
const select = async (id, query) => {
  let rec = ctx.recordById(id);
  if (!rec && query) { // not every catalogue is in memory at boot: the search loads it
    const input = await type(query);
    await until(() => $('.sr-search__option'), 6000);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(400);
    rec = ctx.selected();
  } else if (rec) ctx.select(rec, { fly: true });
  if (!rec) return null;
  await until(() => ctx.shell.view() === 'card', 8000);
  return rec;
};

// ---- the walk -----------------------------------------------------------------------------------
await step('home', async () => { await state('home'); });

await step('tabs', async () => {
  for (const id of AUDIT ? ['planets', 'stars', 'tonight', 'earth'] : ['planets', 'earth']) {
    const tab = document.getElementById(`sr-tab-${id}`);
    if (!tab) throw new Error(`no ${id} tab`);
    await sheetTo('half');
    tab.click();
    await state(`tab-${id}`, { settle: AUDIT ? 5000 : 2500 });
  }
});

if (AUDIT) {
  await step('home-states', async () => {
    await home();
    await sheetTo('full');
    const card = $('.sr-tripcard');
    await hover(card); await state('home-hover-tripcard', { settle: 700 });
    const row = $('.sr-now__btn'); await hover(row); await state('home-hover-now', { settle: 500 });
    const tab = document.getElementById('sr-tab-planets'); await hover(tab); await state('home-hover-tab', { settle: 400 });
    await press(tab); await state('home-pressed-tab', { settle: 200 }); await window.cdpInput('mouseMoved', 2, 2); await window.cdpInput('mouseReleased', 2, 2);
    await wait(2500); document.getElementById('sr-tab-earth').click(); await wait(2500);
    // The keyboard: Tab from the top of the page, through the sidebar, in the order it is drawn.
    const order = [];
    document.activeElement && document.activeElement.blur();
    for (let i = 0; i < 12; i += 1) { await key('Tab'); await wait(120); order.push(say(document.activeElement)); if (i === 1 || i === 3 || i === 6) await state(`home-focus-${i + 1}`, { settle: 200 }); }
    states.tabOrder = order;
    document.activeElement && document.activeElement.blur();
    const more = [...document.querySelectorAll('.sr-more')].filter(shown);
    for (const b of more) b.click();
    await state('home-all-open', { settle: 600 });
    const sub = $('.sr-disc__head[id^="sr-subscribe"]');
    if (sub) {
      sub.scrollIntoView({ block: 'center' });
      sub.click();
      await state('subscribe-open', { settle: 600 });
      // Its error line without a request: an address and neither box ticked stops before the send.
      const form = sub.parentElement.querySelector('form');
      form.querySelector('input[type=email]').value = 'you@example.com';
      for (const box of form.querySelectorAll('input[type=checkbox]')) box.checked = false;
      form.querySelector('button[type=submit]').click();
      await state('subscribe-error', { settle: 600 });
      sub.click();
    }
  });
}

await step('search', async () => {
  await home();
  await type('mar');
  await state('search-results');
  await type('qqqzzx');
  await state('search-empty');
  const input = await type('');
  input.blur();
});

await step('show', async () => {
  await home();
  ctx.rail.openShow();
  await until(() => { const p = document.getElementById('sr-show'); return p && !p.hidden && p.querySelector('.sr-show__head, input, button'); });
  await state('show', { settle: 1200 });
  if (AUDIT) {
    const heads = [...document.querySelectorAll('#sr-show .sr-show__head')];
    for (const h of heads) if (h.getAttribute('aria-expanded') !== 'true') h.click();
    await state('show-all-groups', { settle: 600 });
    await hover(heads[0]); await state('show-hover-head', { settle: 400 });
    await key('Tab'); await state('show-focus', { settle: 300 });
    const pop = document.getElementById('sr-show'); pop.scrollTop = pop.scrollHeight; const inner = $('.sr-pop__body, .sr-show', pop); if (inner) inner.scrollTop = inner.scrollHeight;
    await state('show-foot', { settle: 500 });
  }
  ctx.rail.closeShow();
});

await step('card', async () => {
  const list = AUDIT
    ? [['sat-25544', 'ISS'], ['moon', 'Moon'], ['mars', 'Mars'], ['star-sirius', 'Sirius'], ['dso-m42', 'Orion Nebula'], ['deep-voyager-1', 'Voyager 1']]
    : [['mars', 'Mars']];
  for (const [id, q] of list) {
    await home();
    const rec = await select(id, q);
    if (!rec) { if (!AUDIT) throw new Error(`no record ${id}`); states[`card-${q}`] = { missing: true }; continue; }
    await state(`card-${q.replace(/\W+/g, '-')}`, { settle: AUDIT ? 9000 : 3000 });
    if (AUDIT && (id === 'sat-25544' || id === 'mars')) {
      const tag = q.replace(/\W+/g, '-');
      if (phone()) { await sheetTo('full'); await state(`card-${tag}-full`); await sheetTo('peek'); await state(`card-${tag}-peek`); await sheetTo('half'); }
      const acts = [...document.querySelectorAll('#sr-card .sr-act')].filter(shown);
      if (acts[1]) { await hover(acts[1]); await state(`card-${tag}-hover-action`, { settle: 400 }); }
      if (acts[0]) { await hover(acts[0]); await state(`card-${tag}-hover-primary`, { settle: 400 }); await window.cdpInput('mouseMoved', 2, 2); }
      await key('Tab'); await key('Tab'); await key('Tab'); await state(`card-${tag}-focus`, { settle: 300 });
      const discs = [...document.querySelectorAll('#sr-card .sr-disc__head')].filter(shown);
      for (const d of discs) d.click();
      await state(`card-${tag}-rows-open`, { settle: 1500 });
      const body = $('#sr-card .sr-side__body, #sr-card') ; const sc = [...document.querySelectorAll('#sr-side *')].find((n) => n.scrollHeight > n.clientHeight + 40 && getComputedStyle(n).overflowY !== 'visible' && shown(n));
      if (sc) { sc.scrollTop = sc.scrollHeight; await state(`card-${tag}-foot`, { settle: 600 }); sc.scrollTop = 0; }
    }
  }
});

await step('share', async () => {
  const opener = $('#sr-card [data-action="share"]') || $('.sr-rail__btn--share');
  await ctx.share.open({ record: ctx.selected() || undefined, opener });
  await until(() => { const s = document.getElementById('sr-share'); return s && !s.hidden; });
  await state('share', { settle: AUDIT ? 9000 : 2500 });
  ctx.share.close();
});

await step('sources', async () => {
  await home();
  ctx.shell.openSources();
  await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status, #sr-side .sr-sources, #sr-side [class*="status"]'));
  await sheetTo('full');
  await state('sources', { settle: 2500 });
});

await step('pill', async () => {
  await home();
  await state('pill-live');
  if (AUDIT) { const read = $('.sr-time__read'); await hover(read); await state('pill-hover', { settle: 400 }); await window.cdpInput('mouseMoved', 2, 2); }
  const back = $('.sr-time__step');
  if (back && shown(back)) { back.click(); back.click(); await state('pill-not-live', { settle: 900 }); }
  const live = [...document.querySelectorAll('.sr-time__live, .sr-time button')].find((b) => shown(b) && /live/i.test(b.textContent || ''));
  if (live) live.click();
});

await step('keys', async () => {
  await home();
  if (!ctx.keyhint) return;
  await ctx.keyhint.show();
  await until(() => { const k = $('.sr-keyhint'); return k && shown(k); }, 6000);
  await state('keys', { settle: 1800 });
  const x = $('.sr-keyhint button'); if (x) x.click();
});

await step('trip', async () => {
  await home();
  const trip = ctx.trip;
  let id = 'moon-landings';
  let plan = await trip.plan(id);
  if (!plan || !plan.offerable) for (const row of trip.tours()) { const p = await trip.plan(row.id); if (p && p.offerable) { id = row.id; plan = p; break; } }
  await trip.start(id);
  await until(() => $('.sr-tripsheet__start'), 20000);
  await state('trip-intro', { settle: AUDIT ? 5000 : 2000 });
  if (AUDIT) { await hover($('.sr-tripsheet__start')); await state('trip-intro-hover-start', { settle: 400 }); await window.cdpInput('mouseMoved', 2, 2); }
  $('.sr-tripsheet__start').click();
  await until(() => ['dwell', 'settle', 'held'].includes(trip.state.phase) || (trip.state.phase === 'flight' && ctx.cameraRig && ctx.cameraRig.finishFlight && (ctx.cameraRig.finishFlight(), false)), 40000);
  await until(() => $('.sr-trip__toolbar') && shown($('.sr-trip__toolbar')), 8000);
  await state('trip-stop', { settle: AUDIT ? 6000 : 2500 });
  trip.pause();
  await state('trip-paused', { settle: 900 });
  if (AUDIT) {
    const btns = [...document.querySelectorAll('.sr-trip__toolbar button')].filter(shown);
    await hover(btns[1]); await state('trip-hover-toolbar', { settle: 400 });
    await key('Tab'); await key('Tab'); await state('trip-focus-toolbar', { settle: 300 });
    await window.cdpInput('mouseMoved', 2, 2);
    // The end: the last stop, then one step past it.
    const n = (trip.state.stops || []).length;
    if (n) { trip.jumpTo(n - 1); await wait(1500); if (ctx.cameraRig && ctx.cameraRig.finishFlight) ctx.cameraRig.finishFlight(); await wait(1200); trip.next(); }
    await until(() => $('.sr-tripsheet__actions'), 30000);
    await state('trip-end', { settle: 4000 });
  }
  trip.stop();
  await wait(900);
});

await step('clear', async () => {
  await home();
  ctx.cleanView.set(true);
  await state('clear-screen', { settle: 900 });
  ctx.cleanView.set(false);
});

if (AUDIT && phone()) {
  await step('sheet', async () => {
    await home();
    for (const d of ['peek', 'half', 'full']) { await sheetTo(d); await state(`sheet-${d}`, { settle: 900 }); }
    await sheetTo('peek');
  });
}

return { ok: problems.length === 0, viewport: [innerWidth, innerHeight], coarse: COARSE, min: MIN, walk: WALK, ms: Date.now() - t0, problems, states };
