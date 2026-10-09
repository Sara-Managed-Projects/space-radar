// The regression walk's page half: one flow of the product, walked the way a visitor would, with a
// picture and a set of measurements at every step. tools/walk.mjs is the half that runs it (one
// load per flow, both viewports, the contact sheets); run THAT, not this:
//
//   node tools/walk.mjs --dir=<the tree a deploy serves>            (see tools/README.md)
//
// WHY IT EXISTS. On 2026-10-06 fourteen large pull requests merged in a day, each tested alone.
// The unit tests read the code and tests/probes/ui_probe.js measures the design rules; neither
// walks the COMBINED product: a trip started from a deep link while the time scrubber is up, a
// card opened in the Tonight sky, the keys hint over a toolbar. This does, and returns what it
// saw; a person (or an agent) reads the contact sheet, because "is this view black" and "does
// this look right" are not things a selector can answer.
//
// The flow is the `walk=` parameter (the app ignores it): home, search, tabs, cards, show, share,
// trips, present, link (a deep link: just arrive and report), first (the lazy stand-ins: a first
// click made the moment the control exists). `walktrip=` names the trips for `trips`.
//
// AT EVERY STEP it records: the console errors and unhandled rejections since the last step, the
// requests that answered 4xx/5xx, the elements wider than the viewport, the overlapping pairs of
// the chrome's big blocks (scrubber, trip toolbar, keys hint, toast, card, search), and on a touch
// screen the controls whose hit area is under 44 px. A step that cannot find its control says so
// under `dead` instead of throwing: a missing control IS the finding.
if (!location.href.startsWith('http')) return { href: location.href };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const param = (k, d) => (new RegExp('[?&#]' + k + '=([^&#]*)').exec(location.href) || [0, d])[1];
const FLOW = param('walk', 'home');
const t0 = Date.now();

// --- what went wrong while nobody was looking ----------------------------------------------------
const errors = [];
const say1 = (a) => { try { return a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); } };
const origError = console.error.bind(console);
console.error = (...a) => { errors.push('console.error: ' + a.map(say1).join(' ').slice(0, 220)); origError(...a); };
addEventListener('error', (e) => errors.push('error: ' + String(e.message || (e.target && (e.target.src || e.target.href)) || e).slice(0, 220)), true);
addEventListener('unhandledrejection', (e) => errors.push('unhandled rejection: ' + say1(e.reason && (e.reason.message || e.reason)).slice(0, 220)));
let seenResources = 0;
const badRequests = () => {
  const all = performance.getEntriesByType('resource');
  const fresh = all.slice(seenResources).filter((r) => r.responseStatus >= 400).map((r) => `${r.responseStatus} ${r.name.replace(location.origin, '')}`.slice(0, 160));
  seenResources = all.length;
  return fresh;
};

// --- the app, booted -----------------------------------------------------------------------------
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { let v; try { v = fn(); } catch { v = null; } if (v) return v; await wait(120); } return null; };
const $ = (s, root) => (root || document).querySelector(s);
const $$ = (s, root) => [...(root || document).querySelectorAll(s)];
const shown = (el) => {
  if (!el || !el.isConnected || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
  }
  return true;
};
const vis = (s, root) => $$(s, root).filter(shown);
const byText = (s, re, root) => vis(s, root).find((el) => re.test((el.getAttribute('aria-label') || '').trim()) || re.test((el.textContent || '').trim()));
const say = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;

const states = [];
const dead = [];
let shotN = 0;

// The lazy stand-ins (ui/tripgate.js, ui/cardgate.js): a click made the instant the control exists,
// before anything it needs has been imported. Runs BEFORE the boot wait below; that is the point.
if (FLOW === 'first') {
  const what = param('first', 'trip');
  const facts = { what };
  if (what === 'trip') {
    const card = await until(() => vis('.sr-tripcard')[0], 120000);
    facts.cardAfterMs = Date.now() - t0;
    facts.tripsLoadedAtClick = !!(window.spaceRadar && window.spaceRadar.trip && window.spaceRadar.trip.loaded);
    if (card) { facts.clicked = (card.textContent || '').slice(0, 40); card.click(); }
    const t1 = Date.now();
    const start = await until(() => vis('.sr-tripsheet__start')[0], 60000);
    facts.introAfterClickMs = start ? Date.now() - t1 : null;
    if (!start) dead.push('first: a trip card clicked the moment it appeared never opened its intro');
  } else {
    const input = await until(() => vis('.sr-search__input')[0], 120000);
    facts.searchAfterMs = Date.now() - t0;
    const ctx0 = await until(() => window.spaceRadar && window.spaceRadar.recordById && window.spaceRadar.recordById('mars') && window.spaceRadar, 120000);
    facts.recordAfterMs = Date.now() - t0;
    const t1 = Date.now();
    if (ctx0) ctx0.select(ctx0.recordById('mars'), { fly: true });
    const card = await until(() => { const c = document.getElementById('sr-card'); return c && shown(c) && /Mars/.test(c.textContent || '') && c; }, 60000);
    facts.cardAfterSelectMs = card ? Date.now() - t1 : null;
    facts.hadInput = !!input;
    if (!card) dead.push('first: Mars selected the moment its record existed never showed a card');
  }
  await wait(2500);
  if (window.cdpShot) await window.cdpShot(`01-first-${what}`);
  return { flow: FLOW, viewport: [innerWidth, innerHeight], ms: Date.now() - t0, dead, states: [{ name: `01-first-${what}`, facts, errors: errors.splice(0), bad: badRequests() }] };
}

// Render mode (tools/render-trip.mjs) is a camera on a clock that only moves when asked: no explore
// panel, no rail, and NO SCREENSHOT here -- the page makes no frame of its own, so a capture waits
// for ever (seen 2026-10-06: this step hung for five minutes). It loads, and says it is ready.
if (FLOW === 'link' && /[?&]render=1/.test(location.search)) {
  let api = null;
  for (let i = 0; i < 6000 && !(api = window.__srRender); i += 1) await new Promise((r) => requestAnimationFrame(r));
  const facts = { render: typeof api, keys: api ? Object.keys(api).join(' ') : null };
  if (!api) dead.push('link: ?render=1 never exposed window.__srRender');
  if (api && api.ready && typeof api.ready.then === 'function') {
    // Real seconds, from a worker: this page's own timers are film time, and stand still.
    const real = (ms) => new Promise((res) => { const w = new Worker(URL.createObjectURL(new Blob([`setTimeout(() => postMessage(1), ${ms})`]))); w.onmessage = () => { w.terminate(); res(`not within ${ms / 1000} real seconds`); }; });
    // HOW LONG IS FAIR (internal #423). `ready` is the catalogues landed, the trip at its intro, twelve
    // film seconds of warm-up (360 frames at 30) and the faces: MEASURED 44.5 real seconds on the
    // tree a deploy serves with the saved catalogues mirrored, 27 of them the catalogues coming down
    // a 4G line (film time stands still while anything loads). This step used to give up at 45 and
    // call it "never". Now it waits 150 and, if that is not enough, says which stage it stopped in.
    const READY_S = 150;
    facts.ready = await Promise.race([api.ready.then(() => 'resolved', (e) => 'rejected: ' + (e && e.message)), real(READY_S * 1000)]);
    let d0 = null; try { d0 = api.describe(); } catch { d0 = null; }
    facts.stage = d0 ? d0.stage : null;
    facts.warmed = d0 ? `${d0.warmed}/${d0.warmFrames}` : null;
    if (facts.ready !== 'resolved') dead.push(`link: __srRender.ready ${facts.ready} (stage ${facts.stage}, warm-up ${facts.warmed}, ${d0 ? d0.pending : '?'} loading)`);
    else { try { const d = api.describe(); facts.stops = d && d.stops ? d.stops.length : null; } catch (e) { facts.describe = String(e && e.message); } }
  }
  return { flow: FLOW, viewport: [innerWidth, innerHeight], ms: Date.now() - t0, dead, states: [{ name: '01-link-render', facts, errors: errors.splice(0), bad: badRequests() }] };
}

while (!(window.spaceRadar && window.spaceRadar.explore && window.spaceRadar.rail) && Date.now() - t0 < 150000) await wait(300);
const ctx = window.spaceRadar;
if (!ctx) return { flow: FLOW, ok: false, dead: ['the app never booted'], states: [], errors };
await new Promise((r) => { if (window.__srLayersReady) r(); window.addEventListener('sr:layers-ready', r, { once: true }); setTimeout(r, 90000); });
await wait(2500);
const bootMs = Date.now() - t0;

const COARSE = matchMedia('(pointer: coarse)').matches;
const phone = () => !!(ctx.shell && ctx.shell.isPhone && ctx.shell.isPhone());

// --- the measurements ------------------------------------------------------------------------------
/** The hit area around a control's centre, as the browser resolves it (tests/probes/ui_probe.js). */
function hitSize(el) {
  const r = el.getBoundingClientRect();
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const mine = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
  if (!mine(cx, cy)) return null;
  const run = (dx, dy) => { let n = 0; while (n < 30 && mine(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1; return n; };
  return { w: run(-1, 0) + run(1, 0) + 1, h: run(0, -1) + run(0, 1) + 1 };
}
// The chrome's big blocks: any two of these on top of each other is worth a look.
const BLOCKS = {
  time: '.sr-time', keys: '.sr-keyhint', toast: '.sr-toast', side: '#sr-side', search: '.sr-search',
  hudTag: '.sr-chevron', liveline: '.sr-liveline', rail: '.sr-rail', tripsheet: '.sr-tripsheet__panel',
  leave: '.sr-trip__leave', tripTop: '.sr-trip__titles', share: '.sr-share__panel', photo: '.sr-photo__band',
  embed: '.sr-embed-bar', skybar: '.sr-skybar', note: '.sr-scenenote', legend: '.sr-legend',
};
function blocks() {
  const out = {};
  // Present, whatever its opacity: a block that is fading in is in the way all the same.
  const there = (el) => el.isConnected && !el.closest('[hidden]') && el.getBoundingClientRect().width > 1 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  for (const [k, s] of Object.entries(BLOCKS)) { const el = $$(s).find(there); if (el) out[k] = el; }
  const tb = vis('.sr-trip__tb')[0];
  if (tb && tb.parentElement) out.toolbar = tb.closest('.sr-trip__bar, .sr-trip__toolbar') || tb.parentElement;
  return out;
}
function measure() {
  const b = blocks();
  const rects = {};
  for (const [k, el] of Object.entries(b)) { const r = el.getBoundingClientRect(); rects[k] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }
  const overlaps = [];
  const names = Object.keys(b);
  for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) {
    const A = b[names[i]]; const B = b[names[j]];
    if (A.contains(B) || B.contains(A)) continue;
    const p = A.getBoundingClientRect(); const q = B.getBoundingClientRect();
    const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
    const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (w > 4 && h > 4) overlaps.push(`${names[i]} x ${names[j]}: ${Math.round(w)} x ${Math.round(h)} px`);
  }
  // Wider than the window, or hanging off its side: only what a person can see, and not what
  // scrolls sideways on purpose.
  const wide = [];
  for (const el of $$('body *')) {
    if (wide.length >= 6) break;
    if (el.closest('#labels, canvas, svg, script, style') || el.tagName === 'CANVAS') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight) continue;
    if (r.right <= innerWidth + 1 && r.left >= -1) continue;
    if (r.left >= innerWidth || r.right <= 0) continue; // parked off-screen on purpose
    if (!shown(el)) continue;
    let scrolled = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { scrolled = true; break; } }
    if (scrolled) continue;
    if (wide.some((w) => w.el.contains(el))) continue;
    wide.push({ el, text: `${say(el)} ${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}` });
  }
  const small = [];
  if (COARSE) {
    for (const el of vis('button, a[href], input, select, [role=tab], [role=switch], summary')) {
      if (el.disabled) continue;
      const target = el.matches('input[type=checkbox], input[type=radio]') ? (el.closest('label') || el) : el;
      const r = target.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      if (el.matches('a[href]') && getComputedStyle(el).display === 'inline') continue; // a link in a sentence
      const hit = hitSize(target);
      if (hit && (hit.w < 44 || hit.h < 44)) small.push(`${hit.w} x ${hit.h} ${say(el)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`);
    }
  }
  const doc = document.scrollingElement;
  return { rects, overlaps, wide: wide.map((w) => w.text), small: [...new Set(small)].slice(0, 10), sideways: doc.scrollWidth > innerWidth + 1 ? doc.scrollWidth : 0 };
}
const where = () => {
  const sel = ctx.selected && ctx.selected();
  const trip = ctx.trip && ctx.trip.state;
  return {
    view: ctx.shell.view(), selected: sel ? sel.id : null,
    trip: trip && trip.phase !== 'idle' ? `${trip.tourId} ${trip.phase} ${trip.index + 1}/${trip.count}` : null,
    clock: `${ctx.clock.mode} ${new Date(ctx.clock.now()).toISOString().slice(0, 16)}`,
    hash: location.hash.slice(0, 80),
  };
};
async function state(name, opts = {}) {
  await wait(opts.settle == null ? 1500 : opts.settle);
  shotN += 1;
  const full = `${String(shotN).padStart(2, '0')}-${FLOW}-${name}`;
  const m = measure();
  const s = { name: full, ...where(), ...m, errors: errors.splice(0), bad: badRequests() };
  if (opts.facts) s.facts = opts.facts;
  states.push(s);
  if (window.cdpShot) await window.cdpShot(full);
  return s;
}
/**
 * What one frame costs to draw, from the renderer's own counters (spec 0044 task 3): draw calls and
 * triangles, averaged over a few frames. The app may render more than one pass a frame and three.js
 * resets its counters at each, so the reset is taken over here for those frames and handed back.
 */
async function drawn(frames = 3) {
  const info = ctx.renderer && ctx.renderer.info;
  if (!info || !info.render) return null;
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const auto = info.autoReset;
  info.autoReset = false;
  try {
    await raf();
    info.reset();
    for (let i = 0; i < frames; i += 1) await raf();
    return { calls: Math.round(info.render.calls / frames), triangles: Math.round(info.render.triangles / frames) };
  } finally { info.autoReset = auto; }
}
// registry/budgets.yaml, as the page has it: a stop over `draw_calls_per_stop` or
// `triangles_per_stop` is a finding, with the number.
let BUDGETS = null;
try { BUDGETS = (await import(new URL('js/data/budgets.js', document.baseURI).href)).BUDGETS; } catch { BUDGETS = null; }
async function stopCost(id) {
  let d = null;
  try { d = await drawn(); } catch { d = null; }
  if (!d || !BUDGETS) return {};
  if (d.calls > BUDGETS.draw_calls_per_stop) dead.push(`trips: ${id} "${ctx.trip.state.stopTitle}" takes ${d.calls} draw calls a frame, over draw_calls_per_stop (${BUDGETS.draw_calls_per_stop})`);
  if (d.triangles > BUDGETS.triangles_per_stop) dead.push(`trips: ${id} "${ctx.trip.state.stopTitle}" draws ${d.triangles} triangles a frame, over triangles_per_stop (${BUDGETS.triangles_per_stop})`);
  return d;
}
const step = async (name, fn) => { try { await fn(); } catch (e) { dead.push(`${name}: the walk broke here: ${e && e.message}`); } };
const need = (el, what) => { if (!el) { dead.push(what); return null; } return el; };

// --- hands -----------------------------------------------------------------------------------------
const centre = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; };
/** A real pointer press and release (pointer capture and `:hover` do not answer to el.click()). */
const tap = async (el) => {
  if (!el) return;
  if (!window.cdpInput) { el.click(); return; }
  const [x, y] = centre(el);
  await window.cdpInput('mouseMoved', x, y); await window.cdpInput('mousePressed', x, y); await window.cdpInput('mouseReleased', x, y);
};
const drag = async (el, dx) => {
  if (!window.cdpInput || !el) return false;
  const r = el.getBoundingClientRect();
  const x = Math.round(r.left + r.width * (dx < 0 ? 0.85 : 0.15)); const y = Math.round(r.top + r.height / 2);
  await window.cdpInput('mouseMoved', x, y); await window.cdpInput('mousePressed', x, y);
  for (let i = 1; i <= 6; i += 1) { await window.cdpInput('mouseMoved', Math.round(x + (dx * i) / 6), y); await wait(40); }
  await window.cdpInput('mouseReleased', Math.round(x + dx), y);
  return true;
};
const sheetTo = async (d) => { if (phone() && ctx.shell.sheet && ctx.shell.sheet()) { ctx.shell.sheet().set(d); await wait(500); } };
const home = async () => {
  if (ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') { ctx.trip.stop(); await wait(800); }
  if (ctx.share && ctx.share.isOpen && ctx.share.isOpen()) ctx.share.close();
  if (ctx.rail && ctx.rail.closeShow) ctx.rail.closeShow();
  if (ctx.cleanView && ctx.cleanView.isOn()) ctx.cleanView.set(false);
  if (ctx.selected && ctx.selected()) ctx.deselect();
  while (ctx.shell.view() !== 'home') { const was = ctx.shell.view(); ctx.shell.back(); if (ctx.shell.view() === was) break; }
  if (ctx.clock.mode !== 'live' && ctx.clock.live) ctx.clock.live();
  await wait(300);
};
const tab = async (id, ms = 2500) => { const t = need(document.getElementById(`sr-tab-${id}`), `no ${id} tab`); if (t) { await sheetTo('half'); t.click(); await wait(ms); } };
const type = async (text) => {
  await sheetTo('half');
  const input = vis('.sr-search__input')[0];
  if (!input) throw new Error('no search field on screen');
  input.focus(); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(1200);
  return input;
};
/** Find a thing as a visitor does: type it, take the first suggestion. */
const search = async (text) => {
  const input = await type(text);
  const opt = await until(() => vis('.sr-search__option')[0], 8000);
  if (!opt) { dead.push(`search: "${text}" offered nothing`); return null; }
  const first = (opt.textContent || '').trim().slice(0, 50);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await until(() => ctx.shell.view() === 'card', 8000);
  return first;
};
const select = async (id, query) => {
  const rec = ctx.recordById(id);
  if (rec) { ctx.select(rec, { fly: true }); await until(() => ctx.shell.view() === 'card', 8000); return rec; }
  if (query) { await search(query); return ctx.selected(); }
  return null;
};
const cardAct = (re) => byText('#sr-card .sr-act, #sr-card button', re);
const arrive = async (ms = 20000) => {
  // A flight under software rendering takes its time; a stop is a stop once the rig says so.
  await wait(400);
  await until(() => !(ctx.cameraRig && ctx.cameraRig.state && ctx.cameraRig.state.flying), ms);
};
const tripArrive = async () => {
  const trip = ctx.trip;
  await until(() => ['dwell', 'settle', 'held', 'paused', 'outro', 'idle'].includes(trip.state.phase) || (trip.state.phase === 'flight' && ctx.cameraRig && ctx.cameraRig.finishFlight && (ctx.cameraRig.finishFlight(), false)), 40000);
};
const cardFacts = () => {
  const card = document.getElementById('sr-card');
  if (!card) return { card: false };
  const page = $('a.sr-card__page', card);
  return {
    title: ((card.querySelector('h1, h2, .sr-card__name') || {}).textContent || '').trim().slice(0, 60),
    ownPage: page ? page.getAttribute('href') : null,
    acts: vis('.sr-act', card).map((a) => (a.textContent || '').trim()).join(' | '),
    mission: vis('.sr-mission__event-title, .sr-mission__title', card).map((a) => (a.textContent || '').trim().slice(0, 40)).join(' | ') || null,
  };
};

// --- the flows ---------------------------------------------------------------------------------------
const flows = {
  async home() {
    await state('home', { facts: { bootMs, today: vis('.sr-now__btn').length, tripcards: vis('.sr-tripcard').length, marks: vis('.sr-tape__mark').length } });
    await step('today', async () => {
      const cards = vis('.sr-now__btn');
      if (!need(cards[0], 'home: no Today card')) return;
      const said = (cards[0].textContent || '').trim().slice(0, 60);
      cards[0].click();
      await arrive(12000);
      await state('today-card', { settle: 4000, facts: { clicked: said } });
      await home();
    });
    await step('scrub', async () => {
      // The timeline is a dynamic import after the first visit has settled (ui-guide §3.9).
      const tape = need(await until(() => { const t = vis('.sr-tape')[0]; return t && t.querySelector('.sr-tape__cursor, .sr-tape__ticks') && t; }, 20000), 'home: no time scrubber on screen within 20 s');
      if (!tape) return;
      await sheetTo('peek');
      const before = ctx.clock.now();
      let dragged = await drag(tape, -Math.min(260, tape.getBoundingClientRect().width * 0.6));
      await wait(600);
      let hours = (ctx.clock.now() - before) / 3600e3;
      const byDrag = hours;
      // A day ahead: the day unit, then the same drag.
      const unit = vis('.sr-time__unit')[0];
      if (unit && Math.abs(hours) < 20) { unit.click(); await wait(300); dragged = await drag(tape, -Math.min(260, tape.getBoundingClientRect().width * 0.6)); await wait(600); hours = (ctx.clock.now() - before) / 3600e3; }
      if (!dragged || Math.abs(byDrag) < 0.2) dead.push(`home: dragging the scrubber moved the clock ${byDrag.toFixed(2)} h`);
      await state('scrub-ahead', { settle: 2500, facts: { hoursByFirstDrag: +byDrag.toFixed(2), hoursAhead: +hours.toFixed(2), unit: unit ? unit.textContent.trim() : null } });
      const live = byText('.sr-time__read, .sr-tape__now, .sr-time button', /live|now/i);
      if (need(live, 'home: no way back to live on the scrubber')) { if (live.matches('.sr-tape__now')) await tap(live); else live.click(); }
      await wait(800);
      if (ctx.clock.mode !== 'live') dead.push(`home: the Live control left the clock in mode ${ctx.clock.mode}`);
      for (let i = 0; i < 4 && vis('.sr-time__unit')[0] && !/h/i.test(vis('.sr-time__unit')[0].textContent) ; i += 1) { vis('.sr-time__unit')[0].click(); await wait(200); }
      await state('scrub-live', { settle: 1500, facts: { mode: ctx.clock.mode } });
    });
    await step('mark', async () => {
      // A mark whose centre is well inside the tape: one at the tape's very edge shares its
      // pixels with the step button beside it, and a tap there is the button's (on a 390 px phone
      // the tape is 244 px, and a launch eight hours off sits exactly on its right edge).
      let tape = vis('.sr-tape')[0];
      const inside = () => vis('.sr-tape__mark').filter((m) => { const r = m.getBoundingClientRect(); const t = tape.getBoundingClientRect(); const c = r.left + r.width / 2; return c > t.left + 24 && c < t.right - 24; });
      let marks = tape ? inside() : [];
      if (tape && !marks.length) {
        // None in the day the tape shows: a week of tape has more.
        const unit = vis('.sr-time__unit')[0];
        if (unit) { unit.click(); await wait(800); marks = inside(); }
      }
      const mark = marks[marks.length - 1];
      if (!mark) { states.push({ name: `${FLOW}-mark-skipped`, facts: { why: 'no timeline mark well inside the tape at this hour' } }); return; }
      const said = (mark.getAttribute('aria-label') || '').slice(0, 70);
      const before = ctx.clock.now();
      await tap(mark);
      // The toast is up for six seconds and holds while the focus is on it: focus it, so the
      // picture has it whatever a screenshot costs on this machine.
      const undo = await until(() => vis('.sr-toast__action')[0], 15000);
      if (undo) undo.focus();
      const toast = vis('.sr-toast')[0];
      const s = await state('mark-tapped', { settle: 2500, facts: { mark: said, clockMovedH: +((ctx.clock.now() - before) / 3600e3).toFixed(2), toast: toast ? toast.textContent.trim().slice(0, 80) : null } });
      if (Math.abs(ctx.clock.now() - before) < 60e3 && !s.selected) dead.push(`home: tapping the mark "${said}" neither moved the clock nor selected anything`);
      if (!undo) dead.push('home: no Undo toast within 15 s of a mark tap');
      else if (!shown(undo)) dead.push('home: the Undo toast went away while the focus was on it');
      else {
        undo.click(); await wait(1500);
        const back = Math.abs(ctx.clock.now() - before) < 5 * 60e3 || ctx.clock.mode === 'live';
        if (!back || ctx.selected()) dead.push(`home: Undo left the clock ${ctx.clock.mode} and ${ctx.selected() ? ctx.selected().id : 'nothing'} selected`);
        await state('undo-used', { settle: 2000, facts: { toast: (vis('.sr-toast')[0] || {}).textContent || null } });
      }
      await home();
    });
    await step('keys', async () => {
      if (!ctx.keyhint) return;
      await ctx.keyhint.show();
      const k = await until(() => { const h = $('.sr-keyhint'); return h && !h.hidden && h; }, 6000);
      if (!need(k, 'home: the keys hint never showed')) return;
      await state('keys-hint', { settle: 1800 });
      const x = $('.sr-keyhint button'); if (x) x.click();
    });
  },

  async search() {
    await step('jupiter', async () => {
      await type('Jupiter');
      await state('jupiter-results', { settle: 600, facts: { options: vis('.sr-search__option').slice(0, 5).map((o) => o.textContent.trim().slice(0, 40)) } });
      const first = await search('Jupiter');
      await state('jupiter-card', { settle: 3000, facts: { first, ...cardFacts() } });
      const fly = cardAct(/fly to it/i);
      if (need(fly, 'search: Jupiter\'s card has no "Fly to it"')) { fly.click(); await arrive(); await state('jupiter-flown', { settle: 5000 }); }
    });
    await step('m42', async () => {
      await home();
      await type('M42');
      await state('m42-results', { settle: 600, facts: { options: vis('.sr-search__option').slice(0, 5).map((o) => o.textContent.trim().slice(0, 40)) } });
      const first = await search('M42');
      await state('m42-card', { settle: 4000, facts: { first, ...cardFacts() } });
    });
  },

  async tabs() {
    for (const id of ['earth', 'planets', 'stars']) await step(id, async () => { await tab(id, 3500); await state(`tab-${id}`, { settle: 2500 }); });
    await step('tonight', async () => {
      await tab('tonight', 9000);
      await until(() => vis('.sr-tonight-view__rowbtn')[0], 20000);
      const place = (vis('.sr-tonight-view__place')[0] || vis('.sr-tonight__note')[0] || {}).textContent || null;
      await sheetTo('half');
      await state('tonight', { settle: 3000, facts: { place, rows: vis('.sr-tonight-view__rowbtn').map((r) => (r.getAttribute('aria-label') || r.textContent).trim().slice(0, 50)) } });
      const planet = byText('.sr-tonight-view__rowbtn', /jupiter|saturn|mars|venus/i);
      if (need(planet, 'tonight: no planet row in Tonight\'s best')) {
        planet.click();
        await wait(3000);
        const scope = byText('.sr-density__btn', /^telescope$/i);
        if (need(scope, 'tonight: no Telescope button')) scope.click();
        await state('tonight-planet-zoomed', { settle: 6000, facts: { row: planet.textContent.trim().slice(0, 40), field: (vis('.sr-skybar')[0] || {}).textContent || null } });
        if (ctx.selected()) { ctx.deselect(); await wait(400); }
        while (ctx.shell.view() === 'card') ctx.shell.back();
      }
      const eye = byText('.sr-density__btn', /^eye$/i); if (eye) eye.click();
      for (const re of [/^grid$/i, /^star grid$/i, /^equator$/i, /sun.s path/i]) { const b = byText('.sr-density__btn', re); if (need(b, `tonight: no ${re} toggle`)) b.click(); }
      await state('tonight-grids', { settle: 4000 });
      for (const re of [/^grid$/i, /^star grid$/i, /^equator$/i, /sun.s path/i]) { const b = byText('.sr-density__btn', re); if (b) b.click(); }
      const red = byText('.sr-density__btn', /red light/i);
      if (need(red, 'tonight: no Red light toggle')) { red.click(); await state('tonight-red', { settle: 2500 }); red.click(); }
      let pass = byText('.sr-tonight-view__rowbtn', /appears|pass/i);
      if (!pass) { const more = byText('button', /more passes/i); if (more) { more.click(); await wait(4000); pass = byText('.sr-tonight-view__rowbtn, .sr-list__btn', /appears|pass/i); } }
      if (need(pass, 'tonight: no satellite pass row to tap (with CelesTrak blocked and no saved copy this is expected)')) {
        const said = (pass.getAttribute('aria-label') || pass.textContent).trim().slice(0, 60);
        pass.click();
        await state('tonight-pass', { settle: 6000, facts: { row: said } });
        await home(); await tab('tonight', 3000);
      }
      // Another wavelength lives in What to show.
      ctx.rail.openShow();
      const ir = await until(() => byText('#sr-show .sr-density__btn', /infrared/i), 8000);
      if (need(ir, 'tonight: no Infrared choice in What to show')) {
        ir.scrollIntoView({ block: 'center' }); ir.click();
        await state('tonight-infrared-panel', { settle: 5000 });
        ctx.rail.closeShow();
        await state('tonight-infrared-sky', { settle: 2500 });
        ctx.rail.openShow(); await wait(600);
        const v = byText('#sr-show .sr-density__btn', /^visible$/i); if (v) v.click();
      }
      ctx.rail.closeShow();
      // A nebula: its label in the sky if one is up, else the record itself (and the step says which).
      const label = $$('#labels .label, #labels button').filter(shown).find((l) => /nebula|M ?\d+|pleiades|andromeda/i.test(l.textContent || ''));
      let how = 'a tap on its label';
      if (label) await tap(label);
      else { how = 'no nebula label on screen: selected by id'; const rec = ctx.recordById('dso-m42') || ctx.recordById('dso-m31'); if (rec) ctx.select(rec, { fly: true }); }
      await until(() => ctx.shell.view() === 'card', 6000);
      await state('tonight-nebula', { settle: 5000, facts: { how, label: label ? label.textContent.trim().slice(0, 40) : null, ...cardFacts() } });
      if (!ctx.selected()) dead.push(`tonight: ${how} selected nothing`);
      await home(); await tab('earth', 1500);
    });
  },

  async cards() {
    const one = async (tag, id, q, more) => step(tag, async () => {
      await home();
      const rec = await select(id, q);
      if (!rec) { dead.push(`cards: no record for ${tag} (${id}, "${q}")`); return; }
      await sheetTo('half');
      const s = await state(`${tag}-card`, { settle: 5000, facts: cardFacts() });
      if (s.view !== 'card') dead.push(`cards: ${tag} selected but the view is ${s.view}`);
      // "Its own page" is asked for when About it first opens (ui/cards.js), and exists only where
      // the deploy's object-pages.json does: no file, no link, and that is not a finding.
      const about = document.getElementById('sr-disc-about');
      if (about && shown(about)) {
        about.click();
        const page = await until(() => { const a = $('#sr-card a.sr-card__page'); return a && !a.hidden && a.getAttribute('href') && a; }, 4000);
        s.facts.ownPage = page ? page.getAttribute('href') : null;
        if (about.getAttribute('aria-expanded') === 'true') about.click();
      }
      if (more) await more(rec);
    });
    const fly = async (tag, ms = 7000) => {
      const b = cardAct(/fly to it|follow/i);
      if (!need(b, `cards: ${tag} has no Fly to it / Follow`)) return;
      b.click(); await arrive(25000);
      await state(`${tag}-flown`, { settle: ms });
    };
    await one('iss', 'sat-25544', 'ISS', async () => {
      const later = byText('#sr-card .sr-mission__step', /later/i); const earlier = byText('#sr-card .sr-mission__step', /earlier/i);
      if (!need(later, 'cards: the ISS has no mission timeline Next') || !need(earlier, 'cards: the ISS has no mission timeline Prev')) return;
      const t = () => ((vis('#sr-card .sr-mission__count')[0] || {}).textContent || '') + ' ' + ((vis('#sr-card .sr-mission__event-title, #sr-card .sr-mission__title')[0] || {}).textContent || '');
      const a = t(); (later.disabled ? earlier : later).click(); await wait(700); const b = t(); (later.disabled ? earlier : later).click(); await wait(500); earlier.click(); await wait(700);
      if (a === b) dead.push(`cards: the ISS mission Prev/Next did not change the event ("${a}")`);
      later.scrollIntoView({ block: 'center' });
      await state('iss-mission-stepped', { settle: 1200, facts: { from: a, to: b, now: t() } });
      await fly('iss', 8000);
    });
    await one('moon', 'moon', 'Moon', async () => { await fly('moon', 12000); });
    await one('mars', 'mars', 'Mars', async () => { await fly('mars', 8000); });
    await one('io', 'io', 'Io', async () => { await fly('io', 9000); });
    await one('sirius', 'star-sirius', 'Sirius', async () => { await fly('sirius', 9000); });
    await one('m42', 'dso-m42', 'M42', async () => {
      await fly('m42', 8000);
      let deep = byText('#sr-card .sr-density__btn', /^deep$/i);
      let whereItIs = 'the card';
      if (!deep) { ctx.rail.openShow(); deep = await until(() => byText('#sr-show .sr-density__btn', /^deep$/i), 6000); whereItIs = 'What to show'; }
      if (!need(deep, 'cards: no exposure control (Eye / Camera / Deep) for M42')) return;
      deep.scrollIntoView({ block: 'center' }); deep.click();
      await state('m42-deep-control', { settle: 3000, facts: { whereItIs } });
      ctx.rail.closeShow();
      await state('m42-deep', { settle: 5000 });
      ctx.rail.openShow(); await wait(500); const cam = byText('#sr-show .sr-density__btn, #sr-card .sr-density__btn', /^camera$/i); if (cam) cam.click(); ctx.rail.closeShow();
    });
    await one('voyager', 'deep-voyager-1', 'Voyager 1', async () => {
      const later = byText('#sr-card .sr-mission__step', /later/i); const earlier = byText('#sr-card .sr-mission__step', /earlier/i);
      // The event the card opens on, if it can be gone to; else the nearest one that can.
      let go = byText('#sr-card button', /go to this moment/i);
      for (let i = 0; i < 6 && !go; i += 1) { if (earlier && !earlier.disabled) earlier.click(); else if (later) later.click(); await wait(500); go = byText('#sr-card button', /go to this moment/i); }
      if (!need(go, 'cards: Voyager 1 has no "Go to this moment"')) return;
      const before = ctx.clock.now();
      go.click(); await wait(2500); await arrive(20000);
      await state('voyager-event', { settle: 6000, facts: { ...cardFacts(), clockMovedYears: +((ctx.clock.now() - before) / 31557600e3).toFixed(2), toast: (vis('.sr-toast')[0] || {}).textContent || null } });
      if (Math.abs(ctx.clock.now() - before) < 86400e3) dead.push('cards: "Go to this moment" on Voyager 1 did not move the clock');
    });
    await one('apophis', 'asteroid-99942', 'Apophis', async () => { await fly('apophis', 8000); });
  },

  async show() {
    await step('panel', async () => {
      ctx.rail.openShow();
      const panel = await until(() => { const p = document.getElementById('sr-show'); return p && !p.hidden && p.querySelector('.sr-show__head') && p; });
      if (!need(panel, 'show: What to show never opened')) return;
      await state('open', { settle: 1500 });
      const filter = vis('.sr-show__filter', panel)[0];
      if (need(filter, 'show: no filter field')) {
        filter.value = 'star'; filter.dispatchEvent(new Event('input', { bubbles: true }));
        await state('filtered', { settle: 800, facts: { rows: vis('.sr-show__row', panel).length } });
        filter.value = ''; filter.dispatchEvent(new Event('input', { bubbles: true })); await wait(300);
      }
      const heads = vis('.sr-show__head', panel);
      const closed = heads.find((h) => h.getAttribute('aria-expanded') !== 'true') || heads[heads.length - 1];
      if (need(closed, 'show: no group to open')) { const was = closed.getAttribute('aria-expanded'); closed.click(); await wait(500); if (closed.getAttribute('aria-expanded') === was) dead.push(`show: the group "${closed.textContent.trim().slice(0, 30)}" did not toggle`); }
      const box = vis('.sr-show__box', panel).find((b) => !b.checked);
      if (need(box, 'show: no layer left to switch on')) { const was = box.checked; (box.closest('label') || box).click(); await wait(1500); if (box.checked === was) dead.push('show: a layer checkbox did not toggle'); }
      await state('group-and-layer', { settle: 2500, facts: { group: closed ? closed.textContent.trim().slice(0, 40) : null } });
      const sels = vis('select', panel);
      const facts = { selects: sels.map((s) => `${s.getAttribute('aria-label') || (s.labels && s.labels[0] && s.labels[0].textContent) || s.className}: ${[...s.options].map((o) => o.textContent.trim()).join(' / ').slice(0, 160)}`) };
      const overlay = sels.find((s) => /overlay|earth|data/i.test((s.getAttribute('aria-label') || '') + (s.labels && s.labels[0] ? s.labels[0].textContent : '') + s.className + s.id)) || sels[sels.length - 1];
      if (need(overlay && overlay.options.length > 1 ? overlay : null, 'show: no Earth data overlay chooser')) {
        overlay.scrollIntoView({ block: 'center' });
        overlay.selectedIndex = Math.min(2, overlay.options.length - 1); overlay.dispatchEvent(new Event('change', { bubbles: true }));
        facts.chose = overlay.options[overlay.selectedIndex].textContent.trim();
        await state('overlay-chosen', { settle: 7000, facts: { ...facts, overlayState: JSON.stringify(ctx.overlayState ? ctx.overlayState() : null).slice(0, 160) } });
        ctx.rail.closeShow();
        if (ctx.frameEarth) ctx.frameEarth(600);
        await state('overlay-on-earth', { settle: 6000 });
        ctx.rail.openShow(); await wait(600); overlay.selectedIndex = 0; overlay.dispatchEvent(new Event('change', { bubbles: true }));
      }
      ctx.rail.closeShow();
    });
    await step('debris', async () => {
      await home(); await tab('earth', 1500); await sheetTo('full');
      const btn = need($('.sr-today__debris'), 'show: no way into the debris view on the home tab');
      if (!btn) return;
      btn.scrollIntoView({ block: 'center' }); btn.click();
      const host = await until(() => vis('.sr-debris')[0], 15000);
      if (!need(host, 'show: the debris view never opened')) return;
      await state('debris', { settle: 6000, facts: { nums: vis('.sr-debris__num').map((n) => n.textContent.trim().slice(0, 30)).slice(0, 6) } });
      await sheetTo('peek');
      await state('debris-scene', { settle: 2500 });
      await sheetTo('full'); btn.click(); await wait(800);
    });
  },

  async share() {
    await step('sheet', async () => {
      await select('moon', 'Moon');
      await wait(3000);
      const opener = cardAct(/^share$/i);
      if (need(opener, 'share: the Moon\'s card has no Share')) opener.click(); else await ctx.share.open({ record: ctx.selected() });
      const sheet = await until(() => { const s = document.getElementById('sr-share'); return s && !s.hidden && shown(s) && s; }, 15000);
      if (!need(sheet, 'share: the share sheet never opened')) return;
      await state('sheet', { settle: 8000, facts: { link: (vis('.sr-share__link', sheet)[0] || {}).value || (vis('.sr-share__link', sheet)[0] || {}).textContent || null, acts: vis('.sr-share__btn', sheet).map((b) => b.textContent.trim()).join(' | ') } });
      const photo = byText('.sr-share__btn', /photo/i, sheet);
      if (need(photo, 'share: no Photo mode button')) {
        photo.click();
        const on = await until(() => vis('.sr-photo')[0], 15000);
        if (need(on, 'share: photo mode never opened')) {
          await state('photo-mode', { settle: 3000 });
          const close = vis('.sr-photo__close')[0];
          if (need(close, 'share: photo mode has no close')) close.click();
          await wait(1200);
          if (vis('.sr-photo')[0]) dead.push('share: photo mode stayed up after Close');
          await state('photo-closed', { settle: 800 });
        }
      }
      const embed = byText('.sr-share__btn', /embed/i, sheet);
      if (embed && shown(embed)) { embed.click(); await state('embed-code', { settle: 1200, facts: { code: ((vis('#sr-share textarea, #sr-share code, #sr-share input')[0] || {}).value || '').slice(0, 200) } }); }
      if (ctx.share.isOpen && ctx.share.isOpen()) ctx.share.close();
    });
  },

  async trips() {
    const ids = param('walktrip', 'moon-landings,the-living-earth,life-of-a-star').split(',');
    for (const id of ids) await step(id, async () => {
      await home();
      const trip = ctx.trip;
      const plan = await trip.plan(id);
      if (!plan || !plan.offerable) { dead.push(`trips: ${id} is not offerable (${plan ? plan.reason || 'no reason' : 'no plan'})`); return; }
      await trip.start(id);
      const start = await until(() => vis('.sr-tripsheet__start')[0], 20000);
      if (!need(start, `trips: ${id} has no intro with a Start`)) return;
      await state(`${id}-intro`, { settle: 3000 });
      start.click();
      await tripArrive();
      await until(() => vis('.sr-trip__tb')[0], 8000);
      await state(`${id}-stop-1`, { settle: 5000, facts: { stop: trip.state.stopTitle, ...(await stopCost(id)) } });
      for (let n = 2; n <= 4; n += 1) {
        const next = byText('.sr-trip__tb', /next stop/i);
        if (!need(next, `trips: ${id} has no Next on its toolbar at stop ${n - 1}`)) break;
        const was = trip.state.index;
        next.click(); await wait(600); await tripArrive();
        if (trip.state.index === was) dead.push(`trips: ${id} Next at stop ${was + 1} did not advance`);
        await state(`${id}-stop-${n}`, { settle: 5500, facts: { stop: trip.state.stopTitle, dropped: (trip.state.dropped || []).length || undefined, ...(await stopCost(id)) } });
      }
      const count = trip.state.count;
      trip.jumpTo(count - 1); await wait(1200); await tripArrive();
      await state(`${id}-last-stop`, { settle: 5000, facts: { stop: trip.state.stopTitle, ...(await stopCost(id)) } });
      trip.next();
      const end = await until(() => vis('.sr-tripsheet__actions')[0], 30000);
      if (!need(end, `trips: ${id} never showed its end card`)) { trip.stop(); return; }
      await state(`${id}-end`, { settle: 3000, facts: { acts: vis('.sr-tripsheet__actions button, .sr-tripsheet__actions a').map((b) => b.textContent.trim().slice(0, 30)).join(' | ') } });
      const keep = byText('.sr-tripsheet button', /keep flying/i);
      if (!need(keep, `trips: ${id}'s end card has no "Keep flying"`)) { trip.stop(); return; }
      keep.click(); await wait(1500);
      if (trip.state.phase !== 'idle') dead.push(`trips: after "Keep flying" ${id} is still ${trip.state.phase}`);
      await state(`${id}-kept-flying`, { settle: 3500 });
    });
  },

  // Arrived by `#trip=<id>&present=1`: a room is watching.
  async present() {
    await step('present', async () => {
      const trip = ctx.trip;
      await until(() => trip.state.phase !== 'idle' || vis('.sr-tripsheet__start')[0], 30000);
      const start = vis('.sr-tripsheet__start')[0];
      await state('arrived', { settle: 3000, facts: { present: document.documentElement.className + ' ' + document.body.className, intro: !!start } });
      if (start) { start.click(); }
      await tripArrive();
      await state('stop-1', { settle: 6000, facts: { stop: trip.state.stopTitle, cardText: ((vis('.sr-card__leadbody')[0] || {}).textContent || '').length } });
      for (let n = 2; n <= 3; n += 1) {
        const was = trip.state.index;
        if (window.cdpInput) await window.cdpInput('key', 'ArrowRight'); else trip.next();
        await wait(700); await tripArrive();
        if (trip.state.index === was) { dead.push(`present: the right arrow at stop ${was + 1} did not advance`); trip.next(); await wait(500); await tripArrive(); }
        const lead = vis('.sr-card__leadbody')[0] || vis('#sr-card')[0];
        const tb = blocks().toolbar;
        const facts = { stop: trip.state.stopTitle };
        if (lead && tb) { const a = lead.getBoundingClientRect(); const b = tb.getBoundingClientRect(); facts.cardBottom = Math.round(a.bottom); facts.toolbarTop = Math.round(b.top); facts.cardUnderToolbar = a.bottom > b.top + 2 && a.right > b.left && a.left < b.right; }
        await state(`stop-${n}`, { settle: 6000, facts });
      }
    });
  },

  // The skip links and where focus lands (public #315, internal #460 item 1). The first Tab of a fresh load
  // reaches "Skip to search", the second "Skip to the map"; Enter on the first puts the focus in the
  // search box, on the second on <main id="map">, which holds the focus for that moment only. Also: when a
  // sidebar tab changes, focus must not be left on a control that has gone (document.body).
  async skip() {
    await step('skip', async () => {
      if (!window.cdpInput) { dead.push('skip: this run has no real keys (window.cdpInput): run it through tools/cdp.mjs'); return; }
      const name = () => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}#${a.id || ''}.${(a.className || '').toString().slice(0, 30)}` : 'none'; };
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      await window.cdpInput('key', 'Tab'); await wait(200);
      const first = document.activeElement && document.activeElement.id;
      await state('first-tab', { settle: 600, facts: { focus: name() } });
      if (first !== 'sr-skip-search') dead.push(`skip: the first Tab reached ${name()}, not "Skip to search"`);
      await window.cdpInput('key', 'Tab'); await wait(200);
      const second = document.activeElement && document.activeElement.id;
      if (second !== 'sr-skip-map') dead.push(`skip: the second Tab reached ${name()}, not "Skip to the map"`);
      await window.cdpInput('key', 'Enter'); await wait(500);
      const onMap = document.activeElement && document.activeElement.id === 'map';
      await state('skip-to-map', { settle: 600, facts: { focus: name() } });
      if (!onMap) dead.push(`skip: Enter on "Skip to the map" left the focus on ${name()}`);
      document.activeElement.blur && document.activeElement.blur();
      await window.cdpInput('key', 'Tab'); await wait(200);
      await window.cdpInput('key', 'Enter'); await wait(500);
      const input = document.activeElement;
      await state('skip-to-search', { settle: 600, facts: { focus: name() } });
      if (!input || !(input.matches('input, [role=combobox]') || input.closest('.sr-search'))) dead.push(`skip: Enter on "Skip to search" left the focus on ${name()}`);
      // A sidebar tab changed with the keyboard: focus must stay on something real.
      const tabs = [...document.querySelectorAll('[role=tab]')].filter((t) => t.getBoundingClientRect().width > 0);
      if (tabs.length > 1) {
        tabs[1].focus(); await window.cdpInput('key', 'Enter'); await wait(800);
        const kept = document.activeElement && document.activeElement !== document.body;
        await state('tab-changed', { settle: 600, facts: { focus: name(), tabs: tabs.length } });
        if (!kept) dead.push('skip: after a sidebar tab was chosen with the keyboard the focus fell to the page (document.body)');
      }
    });
  },

  // Back and Forward in a real tab (public #331, internal #460 item 2). Arrive on the ISS, follow a link to a
  // dated Moon view by writing the hash (somebody else's link: the app's own writes use replaceState and
  // fire nothing), go Back, go Forward, and read the selection, the stage and the clock each time.
  // The page's history is real, so this is the one flow that needs a real tab; node tests hold the
  // decision (ui/urlstate.js linkChange), this holds that main.js carries it out.
  async history() {
    await step('history', async () => {
      const A = '#at=sat-25544';
      const B = '#at=moon&t=2027-08-02T10%3A00%3A00Z&rate=60&stage=moon';
      const read = () => ({ selected: ctx.selected() ? ctx.selected().id : null, stage: ctx.stage ? (ctx.stage.worldId || null) : null, clockIso: new Date(ctx.clock.now()).toISOString().slice(0, 16), mode: ctx.clock.mode, hash: location.hash.slice(0, 70) });
      await until(() => ctx.selected(), 25000);
      await arrive(20000);
      const a0 = read();
      await state('on-iss', { settle: 1500, facts: a0 });
      if (a0.selected !== 'sat-25544') dead.push(`history: #at=sat-25544 selected ${a0.selected}`);
      location.hash = B;                                   // a link followed, so one more entry
      await wait(6000);
      const b0 = read();
      await state('followed-moon', { settle: 1500, facts: b0 });
      if (b0.selected !== 'moon') dead.push(`history: the dated Moon link selected ${b0.selected}`);
      if (!/^2027-08-02T10:0/.test(b0.clockIso) && !/^2027-08-02T10:/.test(b0.clockIso)) dead.push(`history: the dated Moon link left the clock at ${b0.clockIso}`);
      history.back();
      await wait(6000);
      const a1 = read();
      await state('back', { settle: 1500, facts: a1 });
      if (a1.selected !== 'sat-25544') dead.push(`history: Back selected ${a1.selected}, not the ISS`);
      if (a1.hash && !a1.hash.startsWith(A)) dead.push(`history: Back left the address at ${a1.hash}`);
      history.forward();
      await wait(6000);
      const b1 = read();
      await state('forward', { settle: 1500, facts: b1 });
      if (b1.selected !== 'moon') dead.push(`history: Forward selected ${b1.selected}, not the Moon`);
      if (b1.stage !== b0.stage) dead.push(`history: Forward put the stage on ${b1.stage}, the link had it on ${b0.stage}`);
      if (b1.clockIso !== b0.clockIso && Math.abs(Date.parse(b1.clockIso + 'Z') - Date.parse(b0.clockIso + 'Z')) > 10 * 60e3) dead.push(`history: Forward put the clock at ${b1.clockIso}, the link had ${b0.clockIso}`);
    });
  },

  // A deep link: arrive, wait for the app to act on it, and say where we are.
  async link() {
    await step('link', async () => {
      const name = param('walkname', 'link');
      await until(() => ctx.selected() || ctx.trip.state.phase !== 'idle' || vis('.sr-tripsheet__start')[0], 25000);
      await arrive(20000);
      const facts = { ...cardFacts(), tripIntro: !!vis('.sr-tripsheet__start')[0], embed: !!vis('.sr-embed-bar')[0] || document.documentElement.classList.contains('sr-embed'), exposure: ctx.exposure && ctx.exposure.mode ? (typeof ctx.exposure.mode === 'function' ? ctx.exposure.mode() : ctx.exposure.mode) : null, note: (vis('.sr-scenenote, .sr-linknote, .sr-toast')[0] || {}).textContent || null };
      await state(name, { settle: 7000, facts });
    });
  },
};

if (!flows[FLOW]) return { flow: FLOW, ok: false, dead: [`no such flow: ${FLOW}`], states: [] };
await flows[FLOW]();
return { flow: FLOW, viewport: [innerWidth, innerHeight], coarse: COARSE, phone: phone(), ms: Date.now() - t0, bootMs, dead, states };
