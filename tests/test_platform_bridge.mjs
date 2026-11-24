// tests/test_platform_bridge.mjs -- the one door to the Space Radar platform (ui/platform-bridge.js), the hearts
// (ui/favs.js), what the map tells the platform (ui/platformtrack.js), and that with no platform nothing changes.
//
// The platform's code is not in this repository (the platform contract: one script from account.spaceradar.ai). So the
// rules held here are the open side's: the host check (ours and nothing else, ?sr-noplatform off), the queue (a plain
// array, flat values only, a search's words cut to 60, capped), one script tag only where allowed, the `sr:platform`
// listener; the hearts work from this browser alone; main.js fetches nothing more on localhost; the Lab and the static
// pages carry the bridge through their generators; and no module of the bridge builds a request.
//
//   node tests/test_platform_bridge.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// A small stand-in document: elements, attributes, events, querySelector by tag[attr] and #id.
class Ev { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
globalThis.CustomEvent = globalThis.CustomEvent || class extends Ev {};
function makeDoc() {
  const listeners = {};
  const all = [];
  const mk = (tag) => {
    const kids = [];
    const attrs = {};
    const evs = {};
    const node = {
      tagName: tag.toUpperCase(), children: kids, attrs, hidden: false, className: '', title: '', type: '', id: '',
      ownerDocument: null, parentNode: null, style: {}, dataset: {},
      setAttribute(k, v) { attrs[k] = String(v); if (k === 'id') node.id = String(v); },
      getAttribute(k) { return k in attrs ? attrs[k] : null; },
      hasAttribute(k) { return k in attrs; },
      appendChild(c) { kids.push(c); c.parentNode = node; return c; },
      insertBefore(c) { kids.unshift(c); c.parentNode = node; return c; },
      remove() { if (node.parentNode) { const i = node.parentNode.children.indexOf(node); if (i >= 0) node.parentNode.children.splice(i, 1); } },
      get firstChild() { return kids[0] || null; },
      addEventListener(t, f) { (evs[t] = evs[t] || []).push(f); },
      click() { for (const f of evs.click || []) f({}); },
      querySelector(sel) { return find(node, sel)[0] || null; },
      querySelectorAll(sel) { return find(node, sel); },
      focus() {},
    };
    let text = '';
    Object.defineProperty(node, 'textContent', { get: () => text, set: (v) => { text = String(v); if (text === '') kids.length = 0; } });
    all.push(node);
    return node;
  };
  const find = (root, sel) => {
    const out = [];
    const walk = (n) => { for (const c of n.children || []) { if (match(c, sel)) out.push(c); walk(c); } };
    walk(root);
    return out;
  };
  const match = (n, sel) => {
    let m = /^([a-z]*)\[([a-z-]+)(?:="([^"]*)")?\]$/.exec(sel);
    if (m) return (!m[1] || n.tagName === m[1].toUpperCase()) && (m[3] === undefined ? n.hasAttribute(m[2]) || (m[2] === 'src' && n.src) : (n.getAttribute(m[2]) === m[3] || (m[2] === 'src' && n.src === m[3])));
    m = /^\.([a-z0-9_-]+)$/i.exec(sel);
    if (m) return String(n.className).split(/\s+/).includes(m[1]);
    return false;
  };
  const doc = {
    head: null, documentElement: null, body: null,
    createElement: (t) => { const n = mk(t); n.ownerDocument = doc; return n; },
    createElementNS: (_ns, t) => { const n = mk(t); n.ownerDocument = doc; return n; },
    querySelector: (sel) => find(doc.documentElement, sel)[0] || null,
    querySelectorAll: (sel) => find(doc.documentElement, sel),
    getElementById: (id) => all.find((n) => n.id === id) || null,
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    removeEventListener(t, f) { listeners[t] = (listeners[t] || []).filter((x) => x !== f); },
    dispatchEvent(e) { for (const f of listeners[e.type] || []) f(e); },
  };
  doc.documentElement = doc.createElement('html');
  doc.head = doc.documentElement.appendChild(doc.createElement('head'));
  doc.body = doc.documentElement.appendChild(doc.createElement('body'));
  return doc;
}
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, map: m };
};

const B = await import(join(JS, 'ui/platform-bridge.js'));
const F = await import(join(JS, 'ui/favs.js'));

// --- 1. the host matrix ------------------------------------------------------------------------------
{
  const yes = ['spaceradar.ai', 'www.spaceradar.ai', 'blog.spaceradar.ai', 'games.spaceradar.ai', 'models.spaceradar.ai', 'video.spaceradar.ai', 'account.spaceradar.ai', 'WWW.SPACERADAR.AI', 'www.spaceradar.ai.'];
  const no = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'space-radar.local', 'sara-managed-projects.github.io', 'spaceradar.ai.evil.com', 'evilspaceradar.ai', 'spaceradar.ai-evil.com',
    'spaceradar.com', 'xn--spaceradar.ai', '', 'myspaceradar.ai', 'spaceradar.ai.localhost'];
  for (const h of yes) check(B.platformAllowed({ hostname: h, search: '' }), `the platform may run on ${h}`);
  for (const h of no) check(!B.platformAllowed({ hostname: h, search: '' }), `and never on ${JSON.stringify(h)}`);
  check(!B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?sr-noplatform' }) && !B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?lang=de&sr-noplatform=1' }), '?sr-noplatform turns it off');
  check(!B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?embed=1' }) && !B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?lang=de&embed=1' }) && B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?embed=10' }), 'an embed (?embed=1) never loads the platform');
  check(B.platformAllowed({ hostname: 'www.spaceradar.ai', search: '?sr-noplatformer=1' }), 'and only that key does');
  check(!B.platformAllowed(null) && !B.platformAllowed({}), 'no location, no platform');
}

// --- 2. the queue --------------------------------------------------------------------------------------
{
  globalThis.window = {};
  B.sr('visit', 'moon', 'world');
  check(Array.isArray(window.srq) && JSON.stringify(window.srq[0]) === '["visit","moon","world"]', 'sr() makes window.srq and pushes [cmd, ...args]');
  B.sr('track', 'search', { search_term: 'x'.repeat(200), n: 3, on: true, nested: { a: 1 }, list: [1], fn: () => 1, nan: NaN });
  const [, name, params] = window.srq[1];
  check(name === 'search' && params.search_term.length === 60 && params.n === 3 && params.on === true && !('nested' in params) && !('list' in params) && !('fn' in params) && !('nan' in params), `track keeps flat values only and cuts the search to 60 (${JSON.stringify(params).slice(0, 80)})`);
  B.sr(''); B.sr(null); B.sr('track', '');
  check(window.srq.length === 2, 'a command with no name is not queued');
  for (let i = 0; i < B.QUEUE_CAP + 50; i += 1) B.sr('track', 'layer_toggle', { layer: `l${i}`, on: true });
  check(window.srq.length === B.QUEUE_CAP && window.srq[window.srq.length - 1][2].layer === `l${B.QUEUE_CAP + 49}`, `on a page no platform reads, the queue holds the newest ${B.QUEUE_CAP}`);
  // Once platform.js has taken over push, sr() is a direct call and nothing is trimmed.
  const got = [];
  window.srq = { push: (c) => got.push(c) };
  B.sr('ui', 'signin');
  check(got.length === 1 && got[0][1] === 'signin', 'once the platform replaces srq.push, a command goes straight to it');
  window.srq = [['visit', 'mars', 'world']];
  check(B.queue(window) === window.srq && window.srq.length === 1, 'a queue already there (an earlier script) is kept');
  delete globalThis.window;
  B.sr('visit', 'moon', 'world'); // no window at all: nothing thrown
}

// --- 3. the script tag, only where allowed -------------------------------------------------------------
{
  for (const [host, want] of [['localhost', false], ['127.0.0.1', false], ['www.spaceradar.ai', true], ['blog.spaceradar.ai', true], ['fork.github.io', false]]) {
    const doc = makeDoc();
    const win = { document: doc, location: { hostname: host, search: '' } };
    const did = B.loadPlatform(win);
    const tags = doc.head.children.filter((n) => n.tagName === 'SCRIPT');
    check(did === want && tags.length === (want ? 1 : 0), `${host}: ${want ? 'one' : 'no'} platform script (got ${tags.length})`);
    if (want) {
      check(tags[0].src === B.PLATFORM_SRC && tags[0].async === true && B.PLATFORM_SRC === 'https://account.spaceradar.ai/v1/platform.js', 'the contract\'s script, async');
      B.loadPlatform(win);
      check(doc.head.children.filter((n) => n.tagName === 'SCRIPT').length === 1, 'and only once, however often it is asked');
    } else {
      check(win.srq === undefined, `${host}: not even a queue is made by the loader`);
    }
  }
  check(B.loadPlatform(null) === false && B.loadPlatform({}) === false, 'no window, no platform');
}

// --- 4. the sr:platform listener ------------------------------------------------------------------------
{
  const doc = makeDoc();
  const seen = [];
  const off = B.onPlatform((d) => seen.push(d), doc);
  doc.dispatchEvent(new CustomEvent('sr:platform', { detail: { signedIn: true, nickname: 'Orbit', plan: 'free', ent: [] } }));
  doc.dispatchEvent(new CustomEvent('sr:platform', {}));
  off();
  doc.dispatchEvent(new CustomEvent('sr:platform', { detail: { signedIn: false } }));
  check(seen.length === 2 && seen[0].nickname === 'Orbit' && JSON.stringify(seen[1]) === '{}', 'onPlatform hands on each detail ({} when there is none) and stops when told');
  B.onPlatform(() => { throw new Error('a broken listener'); }, doc);
  doc.dispatchEvent(new CustomEvent('sr:platform', { detail: {} }));
  check(true, 'a listener that throws does not break the page');
}

// --- 4b. bridgeSeen: the one way back for the platform's Tonight checklist (internal #549) -------------------
{
  const mkWin = () => {
    const ls = {};
    return { ls, addEventListener(t, f) { (ls[t] = ls[t] || []).push(f); }, removeEventListener(t, f) { ls[t] = (ls[t] || []).filter((x) => x !== f); },
      fire(detail) { const e = { type: 'sr:seen', detail }; for (const f of [...(ls['sr:seen'] || [])]) f(e); return e; } };
  };
  const mkPassport = () => { const calls = []; return { calls, markSeen(id, on) { calls.push([id, on]); return true; } }; };
  const win = mkWin();
  const pp = mkPassport();
  const off = B.bridgeSeen(pp, win);
  check(typeof off === 'function', 'bridgeSeen answers the function that stops it');
  const d1 = { id: 'jupiter', on: true };
  win.fire(d1);
  check(pp.calls.length === 1 && pp.calls[0][0] === 'jupiter' && pp.calls[0][1] === true && d1.kept === true, 'sr:seen {jupiter, on} calls markSeen(jupiter, true) and sets kept');
  const d2 = { id: 'jupiter', on: false };
  win.fire(d2);
  check(pp.calls[1] && pp.calls[1][1] === false && d2.kept === true, 'a tick taken back is passed on as on = false');
  for (const bad of [{ id: 5 }, { id: '' }, { id: 'x'.repeat(81) }, { id: null }, {}]) {
    const n = pp.calls.length;
    const d = { ...bad, on: true };
    win.fire(d);
    check(pp.calls.length === n && d.kept === undefined, `a bad id is ignored (${JSON.stringify(bad).slice(0, 30)})`);
  }
  const d80 = { id: 'x'.repeat(80), on: true };
  win.fire(d80);
  check(d80.kept === true, 'an id of 80 characters is allowed');
  const refuse = B.bridgeSeen({ markSeen: () => false }, mkWin());
  check(typeof refuse === 'function', 'a passport that keeps nothing still binds');
  const w3 = mkWin();
  B.bridgeSeen({ markSeen: () => false }, w3);
  const d3 = { id: 'moon', on: true };
  w3.fire(d3);
  check(d3.kept === false, 'kept is false when the passport does not keep the record');
  try { win.fire(undefined); win.fire({ get id() { throw new Error('x'); } }); } catch { check(false, 'a bad event never throws into the page'); }
  const n2 = pp.calls.length;
  off();
  win.fire({ id: 'saturn', on: true });
  check(pp.calls.length === n2 && (win.ls['sr:seen'] || []).length === 0, 'the returned function removes the listener');
  const w4 = mkWin();
  B.bridgeSeen({}, w4); B.bridgeSeen(null, w4); B.bridgeSeen({ markSeen: 1 }, w4);
  check((w4.ls['sr:seen'] || []).length === 0, 'a passport without markSeen binds nothing');
  check(typeof B.bridgeSeen(pp, null) === 'function', 'no window: nothing bound, no throw');
}

// --- 5. the hearts, with no platform -----------------------------------------------------------------
{
  check(F.FAVS_KEY === 'sr:favs' && F.FAVS_CAP === 500, 'the hearts live in sr:favs, 500 at most (the contract\'s row)');
  for (const k of ['map:moon', 'map:sat-25544', 'trip:moon-landings', 'lab:rocket-equation', 'blog:titan', 'video:x', 'games:y', 'models:z']) check(F.okKey(k), `${k} is a key`);
  for (const k of ['moon', 'shop:x', 'map:', ':moon', 'MAP:moon', 7, null, `map:${'x'.repeat(200)}`]) check(!F.okKey(k), `${JSON.stringify(k)} is not`);
  const s = memory();
  check(F.toggleFav(s, 'map:moon', true) === true && F.readFavs(s).join() === 'map:moon', 'a heart pressed is kept');
  F.toggleFav(s, 'trip:moon-landings', true);
  F.toggleFav(s, 'map:moon', true);
  check(F.readFavs(s).join() === 'trip:moon-landings,map:moon', 'once each, the latest last');
  check(F.toggleFav(s, 'map:moon', false) === false && F.readFavs(s).join() === 'trip:moon-landings', 'pressed again, it goes');
  check(F.toggleFav(s, 'nope', true) === false && F.readFavs(s).length === 1, 'a key that is not a key is refused');
  s.setItem('sr:favs', '{not json'); check(F.readFavs(s).length === 0, 'a list that will not parse reads as none');
  s.setItem('sr:favs', JSON.stringify(['map:a', 42, 'map:a', 'x', 'map:b'])); check(F.readFavs(s).join() === 'map:a,map:b', 'what is not a key, and a second copy, are dropped');
  const big = memory();
  F.writeFavs(big, Array.from({ length: 600 }, (_, i) => `map:o${i}`));
  const list = F.readFavs(big);
  check(list.length === 500 && list[0] === 'map:o100' && list[499] === 'map:o599', 'capped at 500, the oldest dropped');
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
  check(F.readFavs(throwing).length === 0 && F.writeFavs(throwing, ['map:moon']) === false && F.toggleFav(throwing, 'map:moon', true) === true, 'a storage that throws keeps nothing and breaks nothing');
  check(F.readFavs(null).length === 0 && F.writeFavs(null, []) === false, 'and no storage at all is no hearts');

  // The button: works on a page with no platform, and tells the queue only.
  const doc = makeDoc();
  globalThis.window = {};
  const st = memory();
  const b = F.heartButton('map:moon', { add: 'Add', remove: 'Remove' }, { document: doc, storage: st });
  doc.body.appendChild(b);
  check(b.tagName === 'BUTTON' && b.type === 'button' && /ui-btn--icon/.test(b.className) && b.getAttribute('data-sr-fav') === 'map:moon' && b.getAttribute('aria-pressed') === 'false' && b.getAttribute('aria-label') === 'Add' && b.title === 'Add', 'a heart is the kit\'s icon button with data-sr-fav, aria-pressed and a name');
  const twin = F.heartButton('map:moon', { add: 'Add', remove: 'Remove' }, { document: doc, storage: st });
  doc.body.appendChild(twin);
  b.click();
  check(b.getAttribute('aria-pressed') === 'true' && b.getAttribute('aria-label') === 'Remove' && twin.getAttribute('aria-pressed') === 'true' && F.readFavs(st).join() === 'map:moon', 'pressed: kept, named for what a second press does, and its twin on the page follows');
  check(JSON.stringify(window.srq.slice(-2)) === '[["fav","map:moon",true],["track","favourite_add",{"key":"map:moon"}]]', `and the platform is told by the queue alone (${JSON.stringify(window.srq)})`);
  b.click();
  check(b.getAttribute('aria-pressed') === 'false' && F.readFavs(st).length === 0 && window.srq[window.srq.length - 2][2] === false, 'pressed again: gone');
  // One owner for a press: the heart says the page handles it, so platform.js only keeps the account in step (2026-11-24).
  check(b.hasAttribute('data-sr-fav-host') && twin.hasAttribute('data-sr-fav-host'), 'a heart carries data-sr-fav-host: platform.js leaves its press to the page');
  // Signed in (the platform's word), the account's list is the truth: a press tells the platform and keeps nothing here.
  doc.dispatchEvent(new CustomEvent('sr:platform', { detail: { signedIn: true, nickname: 'orbit cat' } }));
  b.click();
  check(b.getAttribute('aria-pressed') === 'true' && b.getAttribute('aria-label') === 'Remove' && F.readFavs(st).length === 0 && JSON.stringify(window.srq.slice(-2)) === '[["fav","map:moon",true],["track","favourite_add",{"key":"map:moon"}]]', 'signed in: pressed at once, said to the platform, and not written to sr:favs');
  b.click();
  check(b.getAttribute('aria-pressed') === 'false' && window.srq[window.srq.length - 2][2] === false, 'and unpressed the same way, once per press');
  doc.dispatchEvent(new CustomEvent('sr:platform', { detail: { signedIn: false } }));
  b.click();
  check(F.readFavs(st).join() === 'map:moon', 'signed out again: this browser\'s list');
  b.click();
  const tile = F.heartButton('map:mars', { add: 'Add', remove: 'Remove' }, { document: doc, storage: st, tile: true });
  check(!/ui-btn--icon/.test(tile.className) && tile.getAttribute('aria-label') === 'Add' && tile.title === 'Add', 'on a card\'s row of tiles it fills its cell, named by aria-label and title');
  delete globalThis.window;
}

// --- 6. the account slot: shown only by the platform's word -------------------------------------------
{
  const T = await import(join(JS, 'ui/platformtrack.js'));
  const { COPY } = await import(join(JS, 'copy/en.js'));
  const doc = makeDoc();
  const slot = doc.createElement('div');
  slot.setAttribute('data-sr-account', '');
  slot.hidden = true;
  doc.body.appendChild(slot);
  check(T.paintAccount(makeDoc(), { signedIn: false }) === null, 'no slot, nothing drawn');
  globalThis.window = {};
  const out = T.paintAccount(doc, { signedIn: false });
  check(!slot.hidden && out.getAttribute('aria-label') === COPY.account.signIn && out.title === COPY.account.signIn, 'signed out: Sign in, as its name and tooltip');
  check(/\bsr-rail__btn\b/.test(out.className) && out.children.length === 1 && out.children[0].tagName === 'SVG' && out.textContent === '', 'an icon-only rail button: no words beside the icon to widen the rail');
  check(out.getAttribute('aria-expanded') === 'false' && out.getAttribute('aria-haspopup') === 'dialog', 'it says when the platform\'s sheet or menu is open (aria-expanded, set by platform.js)');
  out.click();
  check(JSON.stringify(window.srq[window.srq.length - 1]) === '["ui","signin"]', 'which asks the platform for its sign-in sheet');
  const inn = T.paintAccount(doc, { signedIn: true, nickname: 'orbit cat', plan: 'free', ent: [] });
  check(slot.children.length === 1 && inn.getAttribute('aria-label') === 'Your account, orbit cat' && inn.children[0].textContent === 'O', 'signed in: the initial, and the account by name');
  inn.click();
  check(window.srq[window.srq.length - 1][1] === 'account', 'which opens the account menu');
  check(T.initialOf('  émile') === 'É' && T.initialOf('') === '' && T.initialOf(null) === '', 'the initial is the first letter');
  // What the map tells it: the contract's names only.
  const events = readFileSync(join(JS, 'ui/platformtrack.js'), 'utf8');
  // the contract's whole list (~/space-radar-handoff/platform/CONTRACT.md, internal growth/analytics/events.md)
  const SCHEMA = ['page_view', 'search', 'select_object', 'tab_open', 'layer_toggle', 'language_change', 'trip_start', 'trip_complete', 'drift_start', 'drift_stop', 'ambient_start', 'record_start', 'record_export', 'share', 'time_travel', 'sign_up', 'login', 'logout', 'favourite_add', 'favourite_remove', 'passport_stamp', 'badge_earned', 'subscribe', 'video_start', 'video_progress', 'video_complete', 'post_read', 'game_start', 'lab_open', 'model_view', 'paywall_view', 'begin_checkout', 'purchase', 'wallpaper_download', 'consent_update', 'embed_copy', 'calendar_add'];
  const pushed = new Set();
  for (const f of readdirSync(join(JS, 'ui'))) {
    if (!f.endsWith('.js')) continue;
    const text = readFileSync(join(JS, 'ui', f), 'utf8');
    for (const m of text.matchAll(/sr\('track', (?:on \? )?'([a-z_]+)'(?: : '([a-z_]+)')?/g)) { pushed.add(m[1]); if (m[2]) pushed.add(m[2]); }
  }
  for (const e of T.EVENTS) check(SCHEMA.includes(e), `${e} is a name of the contract's schema`);
  for (const e of pushed) check(SCHEMA.includes(e), `pushed event ${e} is in the contract's schema`);
  check(['search', 'share', 'record_start', 'record_export', 'language_change', 'favourite_add', 'select_object', 'passport_stamp', 'trip_start', 'trip_complete', 'drift_start', 'drift_stop', 'time_travel', 'tab_open', 'layer_toggle', 'ambient_start'].every((e) => pushed.has(e) || events.includes(`'${e}'`)), `every event the map has is pushed (${[...pushed].sort()})`);
  delete globalThis.window;
}

// --- 7. trackMap: the page's events become commands -------------------------------------------------------
{
  const T = await import(join(JS, 'ui/platformtrack.js'));
  const doc = makeDoc();
  const listeners = {};
  const win = { addEventListener: (t, f) => (listeners[t] = listeners[t] || []).push(f), removeEventListener: (t, f) => { listeners[t] = (listeners[t] || []).filter((x) => x !== f); } };
  const fire = (t, detail) => { for (const f of listeners[t] || []) f({ detail }); };
  let tripFn = null;
  const clockFns = [];
  const ctx = { trip: { onChange: (fn) => { tripFn = fn; return () => { tripFn = null; }; } }, clock: { mode: 'live', onChange: (fn) => clockFns.push(fn) } };
  globalThis.window = {};
  const stop = T.trackMap(ctx, { window: win, document: doc });
  fire('sr:select', { id: 'moon', klass: 'world', name: 'The Moon' });
  fire('sr:select', null);
  fire('sr:stamp', { id: 'moon', cls: 'world' });
  doc.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: 'comets', on: true, from: 'whattoshow' } }));
  fire('sr:shell', { view: 'passport' }); fire('sr:shell', { view: 'passport' });
  fire('sr:drift', { on: true }); fire('sr:drift', { on: false, reason: 'input', visits: 3 });
  fire('sr:autopilot', { what: 'start', reel: 'x' }); fire('sr:autopilot', { what: 'trip-start' });
  tripFn({ tourId: 'moon-landings', phase: 'resolving' }); tripFn({ tourId: 'moon-landings', phase: 'intro' }); tripFn({ tourId: 'moon-landings', phase: 'dwell', index: 2 });
  tripFn({ tourId: 'moon-landings', phase: 'outro' }); tripFn({ tourId: 'moon-landings', phase: 'outro' }); tripFn({ tourId: '', phase: 'idle' });
  ctx.clock.mode = 'scrub'; clockFns.forEach((f) => f(ctx.clock)); clockFns.forEach((f) => f(ctx.clock));
  ctx.clock.mode = 'live'; clockFns.forEach((f) => f(ctx.clock));
  const got = window.srq.map((c) => (c[0] === 'track' ? `${c[1]}${Object.keys(c[2]).length ? JSON.stringify(c[2]) : ''}` : c.join(':')));
  const want = ['visit:moon:world:The Moon', 'select_object{"object_class":"world","object_id":"moon"}', 'passport_stamp{"object_class":"world"}', 'layer_toggle{"layer":"comets","on":true}', 'tab_open{"tab":"passport"}',
    'drift_start', 'drift_stop', 'ambient_start', 'trip_start{"trip_id":"moon-landings"}', 'trip_complete{"trip_id":"moon-landings"}', 'time_travel'];
  check(JSON.stringify(got) === JSON.stringify(want), `the page's events, once each, as the contract names them:\n      ${got.join('\n      ')}`);
  // The record's own name goes with `visit` only, as the stamp passport's hint (platform contract note, 2026-11-24); never
  // in an analytics event, and never a bare catalogue number.
  check(window.srq.filter((c) => JSON.stringify(c).includes('The Moon')).every((c) => c[0] === 'visit'), 'a record\'s name rides on visit alone, never on a track');
  check(T.nameHint({ id: 'cat-39676', name: '#39676' }) === '' && T.nameHint({ id: 'x', name: 'x' }) === '' && T.nameHint({ id: 'cat-1', name: '  COSMOS  2251 DEB ' }) === 'COSMOS 2251 DEB' && T.nameHint({ id: 'a', name: 'n'.repeat(99) }).length === 80 && T.nameHint(null) === '', 'nameHint: the record\'s own name, tidied and cut to 80, none for a number');
  stop();
  const n = window.srq.length;
  fire('sr:select', { id: 'mars', klass: 'world' });
  check(window.srq.length === n, 'stopped, it says nothing more');
  delete globalThis.window;
}

// --- 8. with no platform the map is the map ---------------------------------------------------------------
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of ['ui/platform-bridge.js', 'ui/favs.js', 'ui/platformtrack.js', 'platform-boot.js']) {
    const src = strip(readFileSync(join(JS, f), 'utf8'));
    check(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|new Image|document\.cookie|gtag\(|dataLayer/.test(src), `${f} builds no request, sets no cookie and talks to no analytics itself`);
  }
  const bridge = strip(readFileSync(join(JS, 'ui/platform-bridge.js'), 'utf8'));
  check((bridge.match(/https?:\/\//g) || []).length === 1, 'the bridge names one address, the platform\'s script');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/if \(!embed && loadPlatform\(window\)\) import\('\.\/ui\/platformtrack\.js'\)/.test(main), 'main.js fetches the tracking module only where the platform\'s script was added (never on localhost, in an embed or a fork)');
  check(!/^import .*platformtrack/m.test(main), 'and never in the boot graph');
  const rail = readFileSync(join(JS, 'ui/rail.js'), 'utf8');
  check(/setAttribute\('data-sr-account', 'host'\)/.test(rail) && /account\.hidden = true/.test(rail), 'the rail\'s account slot starts empty and hidden (no Sign in on localhost), and says the map draws it (host)');
  const passport = readFileSync(join(JS, 'ui/passport.js'), 'utf8');
  check(/setAttribute\('data-sr-passport', ''\)/.test(passport) && !/loadPlatform|srq|queue\(/.test(passport), 'the passport view has its empty slot and does not talk to the platform itself (it only binds bridgeSeen)');
  check(/import \{ bridgeSeen \} from '\.\/platform-bridge\.js'/.test(passport) && /const unbridge = bridgeSeen\(api\)/.test(passport) && /unbridge\(\);/.test(passport), 'createPassport binds bridgeSeen and destroy() unbinds it');
  check(/'sr:stamp'/.test(passport), 'it says on the page when it keeps a new place');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  check(/\.sr-passport__slot:empty \{ display: none; \}/.test(css), 'an empty slot takes no room');
  // The Lab and the static pages carry the bridge through their generators.
  const lab = readFileSync(join(ROOT, 'site/lab/rocket-equation/index.html'), 'utf8');
  check(/<!-- chrome:head [^\n]*-->\n<link rel="stylesheet" href="\.\.\/\.\.\/css\/controls\.css">\n<script type="module" src="\.\.\/\.\.\/js\/platform-boot\.js"><\/script>\n<!-- \/chrome:head -->\n<\/head>/.test(lab), 'a Lab simulator\'s head has the chrome:head block');
  check(/data-sr-fav="lab:rocket-equation"/.test(lab) && /aria-pressed="false"/.test(lab), 'and its heart, lab:<slug>');
  const sims = readdirSync(join(ROOT, 'site/lab'), { withFileTypes: true }).filter((d) => d.isDirectory());
  const without = sims.filter((d) => !readFileSync(join(ROOT, 'site/lab', d.name, 'index.html'), 'utf8').includes('js/platform-boot.js'));
  check(without.length === 0, `every simulator has the bridge (${without.map((d) => d.name)})`);
  const chrome = execFileSync('python3', ['-c', 'import sys; sys.path.insert(0, "scripts"); from seo_chrome import styles; print(styles("../"))'], { cwd: ROOT, encoding: 'utf8' });
  check(chrome.includes('<script type="module" src="../js/platform-boot.js"></script>'), 'the static pages\' head (seo_chrome.styles) has it too');
  const boot = readFileSync(join(JS, 'platform-boot.js'), 'utf8');
  check(/loadPlatform\(win\)/.test(boot) && /wireHeart/.test(boot), 'platform-boot.js adds the platform where allowed and wires the hearts in the page');
}

if (problems.length) { console.error('platform bridge FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('platform bridge ok: the platform only on spaceradar.ai hosts (and not with ?sr-noplatform), a flat capped queue, one async script, the sr:platform listener, hearts kept in sr:favs with no platform, the account slot only by the platform\'s word, the page\'s events in the contract\'s names, the Lab and the static pages bridged, and nothing fetched on localhost');
