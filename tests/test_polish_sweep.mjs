// tests/test_polish_sweep.mjs -- the small things of the polish sweep of 2026-10-08, each held once.
//
//   node tests/test_polish_sweep.mjs
//
//   1. The place is set INSIDE the Tonight view (internal #455): ui/place.js is the city box and its
//      chips and nothing else, ui/tonight.js builds it behind "Change place", open by itself while
//      the place is a guess or not set, and ui/explore.js no longer mounts a panel of its own.
//   2. A selected model fits the band no chrome covers (internal #421): scene/heroes.js
//      selectedPixels, and main.js hands the band over each frame.
//   3. The key of an Earth data map is in the sidebar when no card or panel shows it (#386).
//   4. Photo mode hands the picture to the device's share sheet, and saves it when refused (#397).
//   5. Today's Kp is under the aurora stop (#385), and the Messier pages name their articles (#202).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- 1. the place, inside the Tonight view ------------------------------------------------------
function fakeNode(tag) {
  const node = {
    tagName: tag, children: [], listeners: {}, attrs: {}, hidden: false, textContent: '', className: '', disabled: false, value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {},
    appendChild(c) { node.children.push(c); return c; },
    append(...cs) { node.children.push(...cs); },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k] ?? null; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    removeEventListener() {},
    focus() { node.focused = true; },
  };
  return node;
}
const all = [];
const winListeners = {};
globalThis.document = {
  createElement: (tag) => { const n = fakeNode(tag); all.push(n); return n; },
  // ui/cards.js (photo mode imports it) listens on the document when there is one.
  addEventListener() {}, removeEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  documentElement: fakeNode('html'), body: fakeNode('body'),
};
globalThis.window = { isSecureContext: true, addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); }, removeEventListener() {} };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition() {} } } });
const { createPlace } = await import(join(JS, 'ui/place.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
{
  const ctx = { observer: null, setObserver(o) { ctx.observer = o; for (const fn of winListeners['sr:observer'] || []) fn({}); } };
  const place = createPlace(ctx);
  const buttons = all.filter((n) => n.tagName === 'button');
  const by = (text) => buttons.find((b) => b.textContent === text);
  const K = COPY.placeKeep;
  check(place.root.tagName === 'div' && place.root.attrs.role === 'group' && place.root.attrs['aria-label'] === K.group, 'the controls are one named group, not a section with a heading of its own');
  check(all.filter((n) => n.tagName === 'input').length === 1 && !!by(COPY.controls.locationUseMine) && !!by(COPY.controls.locationClear) && !!by(K.remember) && !!by(K.share), 'the city box, Use my location, Clear, Remember this place and Share this place are built');
  check(!all.some((n) => n.tagName === 'ul' || n.tagName === 'h2'), 'and no list of passes or heading: those are the Tonight view\'s');
  check(by(COPY.controls.locationClear).hidden && by(K.remember).hidden && by(K.share).hidden, 'with no place there is nothing to clear, keep or share');
  ctx.setObserver({ latDeg: 35.7, lonDeg: 51.4, latRad: 0.62, lonRad: 0.9, name: 'Tehran', source: 'guess', how: 'timezone' });
  check(by(COPY.controls.locationClear).hidden, 'a guessed place is not offered to clear');
  ctx.setObserver({ latDeg: 51.5, lonDeg: -0.1, latRad: 0.9, lonRad: 0, name: 'London', source: 'city' });
  check(!by(COPY.controls.locationClear).hidden && !by(K.remember).hidden && !by(K.share).hidden, 'a chosen place can be cleared, kept and shared');
  for (const fn of by(COPY.controls.locationClear).listeners.click || []) fn({});
  check(ctx.observer === null, 'Clear hands the app no place');
  check(typeof place.focus === 'function', 'the view can put the caret in the city box');

  const tonight = read('site/js/ui/tonight.js');
  const explore = read('site/js/ui/explore.js');
  const placeSrc = read('site/js/ui/place.js');
  check(/import \{ createPlace \} from '\.\/place\.js';/.test(tonight), 'ui/tonight.js builds the place controls itself');
  check(/change\.setAttribute\('aria-expanded'/.test(tonight) && /change\.setAttribute\('aria-controls', placeCtl\.root\.id\)/.test(tonight), '"Change place" is a disclosure: aria-expanded, aria-controls');
  check(/placeOpen === null \? \(!o \|\| o\.source === 'guess'\) : placeOpen/.test(tonight), 'open by itself while the place is a guess or not set; a press decides after that');
  check(/root\.appendChild\(placeRow\);\s*root\.appendChild\(placeCtl\.root\);/.test(tonight), 'the controls sit right under the place line, above the pass');
  check(!/place\.js|placeHost|loadPlace|placeOnly/.test(explore), 'ui/explore.js mounts no place panel of its own');
  check(!/predictPasses|showerItems|placeOnly/.test(placeSrc), 'ui/place.js lists no passes');
  check(K.change.split(' ').length <= 2 && K.change.length <= 60, 'the button is two words');
  const css = read('site/css/ui.css');
  check(/\.sr-place\[hidden\][^{]*\{ display: none; \}/.test(css), 'the closed controls take no room');
}

// --- 2. a selected model fits the band ----------------------------------------------------------
{
  const H = await import(join(JS, 'scene/heroes.js'));
  check(H.selectedPixels(0) === H.SELECTED_PX && H.selectedPixels(NaN) === H.SELECTED_PX && H.selectedPixels(undefined) === H.SELECTED_PX, 'no band known: the full 260');
  check(H.selectedPixels(770) === 260 && H.selectedPixels(2000) === 260, 'a desktop band (900 less the pill) keeps 260');
  const phone = H.selectedPixels(300);
  check(phone === Math.floor(300 * 0.9 / H.MODEL_SPAN) && phone * H.MODEL_SPAN <= 300, `in a 300 px band the model's circle fits: ${phone} px, ${Math.round(phone * H.MODEL_SPAN)} across`);
  check(H.selectedPixels(60) === 84, 'never smaller than an unselected model (84)');
  for (const band of [200, 260, 320, 381]) check(H.selectedPixels(band) * H.MODEL_SPAN <= Math.max(band, 84 * H.MODEL_SPAN), `band ${band}: the circle is inside it`);
  const main = read('site/js/main.js');
  // Through ctx: the frame loop is a function of its own (startLoop) and main()'s `viewShift` is not
  // in its scope. The first cut named the bare variable and every frame threw "viewShift is not
  // defined" (seen in the first browser run that reached the app, 2026-10-08): held here by name.
  check(/heroes\.update\(t, \{[^}]*bandPx: ctx\.viewShift \? ctx\.viewShift\.bandHeightPx\(\) : 0/.test(main), 'main.js hands the uncovered band to the models each frame, through ctx');
  {
    const loop = main.slice(main.indexOf('function startLoop('));
    const body = loop.slice(0, loop.indexOf('\n}\n'));
    const params = /function startLoop\(\{([^}]*)\}\)/.exec(loop);
    check(params && !/\bviewShift\b/.test(params[1]) && !/[^.\w]viewShift\./.test(body), 'and the frame loop names no variable it was not given');
  }
  check(/bandHeightPx: \(\) => bandPx/.test(read('site/js/scene/viewshift.js')), 'scene/viewshift.js keeps the band it measured');
  check(!/const MODEL_SPAN = 1\.32;/.test(main) && /MODEL_SPAN/.test(main), 'one MODEL_SPAN, the models\' own');
}

// --- 3. the overlay's key in the sidebar ---------------------------------------------------------
{
  const K = await import(join(JS, 'ui/overlaykey.js'));
  check(K.keyShown({ id: 'sea-temperature', status: 'shown' }, 'idle') && K.keyShown({ id: 'wind', status: 'loading' }, null), 'a map on the globe has its key, while it loads too');
  check(!K.keyShown({ id: null, status: 'off' }, 'idle') && !K.keyShown(null, 'idle'), 'no map, no key');
  check(!K.keyShown({ id: 'sea-ice', status: 'shown' }, 'dwell'), 'a trip\'s stop card carries its own: not twice');
  const main = read('site/js/main.js');
  check(/import\('\.\/ui\/overlaykey\.js'\)/.test(main) && !/^import [^\n]*overlaykey/m.test(main), 'fetched when a map is first asked for, never at boot');
  check(COPY.overlay.keyTitle && COPY.overlay.keyOff.split(' ').length <= 3, 'its words are in the copy');
}

// --- 4. photo mode's share ------------------------------------------------------------------------
{
  if (typeof File === 'undefined') { check(false, 'node has no File: the share test cannot run'); }
  else {
    const P = await import(join(JS, 'ui/photomode.js'));
    const made = { blob: new Blob(['x'], { type: 'image/jpeg' }), name: 'earth.jpg' };
    const saved = [];
    const save = (blob, name) => saved.push(name);
    let shared = null;
    const ok = { canShare: () => true, share: async (d) => { shared = d; } };
    check(P.canShareFiles(ok) === true && P.canShareFiles({ share() {} }) === false && P.canShareFiles(null) === false && P.canShareFiles({ share() {}, canShare: () => false }) === false, 'the button exists only where a file can be handed on');
    check(await P.sharePicture(ok, made, save) === 'shared' && shared && shared.files.length === 1 && shared.files[0].name === 'earth.jpg' && Object.keys(shared).join() === 'files' && saved.length === 0, 'the file alone is shared: no text, no link, no place');
    const gone = { canShare: () => true, share: async () => { const e = new Error('no'); e.name = 'AbortError'; throw e; } };
    check(await P.sharePicture(gone, made, save) === 'dismissed' && saved.length === 0, 'a sheet the visitor closed is an answer: nothing is saved behind their back');
    const late = { canShare: () => true, share: async () => { const e = new Error('gesture'); e.name = 'NotAllowedError'; throw e; } };
    check(await P.sharePicture(late, made, save) === 'saved' && saved.join() === 'earth.jpg', 'a device that refuses after all gets the picture saved, so the press is not lost');
  }
}

// --- 5. Kp under the aurora stop; the Messier pages ------------------------------------------------
{
  const trip = read('site/js/ui/trip.js');
  check(/aurora: \(\) => \[\s*ctx\.aurora && ctx\.aurora\.line[^\]]*ctx\.spaceWeatherLine\(\)[^\]]*\]\.filter\(Boolean\)\.join\(' '\)/.test(trip), 'the aurora stop\'s note is the forecast\'s sentence, then NOAA\'s Kp with its age');
  check(/entry\.stop\.live_note === 'space-weather' \|\| entry\.stop\.live_note === 'aurora'/.test(trip), 'and a trip with an aurora stop asks for the reading at its intro');
  const { TOURS } = await import(join(JS, 'data/tours.js'));
  const living = TOURS.find((x) => x.id === 'the-living-earth');
  check(living && living.stops.some((s) => s.live_note === 'aurora'), 'the living Earth has that stop');
  const { WIKI_TITLES } = await import(join(JS, 'data/wikititles.js'));
  const messier = Object.keys(WIKI_TITLES).filter((k) => /^dso-m\d+$/.test(k));
  check(messier.length >= 40 && WIKI_TITLES['dso-m42'] === 'Orion_Nebula' && !Object.values(WIKI_TITLES).some((v) => /^List_of_/.test(v)), `${messier.length} Messier objects name their own article, none a list`);
}

if (problems.length) { console.error('polish sweep FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('polish sweep ok: the place is set inside the Tonight view, a selected model fits its band, an overlay has its key in the sidebar, photo mode shares or saves, the aurora stop carries Kp');
