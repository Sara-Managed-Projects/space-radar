// tests/test_keyhint.mjs -- the controls hint, shown once (spec 0068 task 2, ui/keyhint.js).
//
// Ivan, 2026-10-02: "add info how to control with buttons ... it should appear once in the right
// bottom corner (arrows buttons and w s buttons)". Asserted, with no browser:
//
//   ONCE: the first decision shows it and remembers; the second does not. A storage that throws,
//     on read or on write, means no hint (it could not be "once" there).
//   NOT NOW: a deep link, a running trip and a clear screen each keep it away, and are not
//     remembered, so the next ordinary visit still gets it.
//   HONEST KEYS: every keycap names keys that the module behind it answers -- the camera for the
//     arrows, W/S, +/- and PgUp/PgDn (held in a real camera rig: the turn row turns and does not
//     zoom, the zoom row zooms the way its cap says), the clear screen for H, the rail for L and P
//     -- and every key the camera answers has a cap.
//   LAZY AND ONCE-STYLED: main.js imports it after sr:layers-ready and never statically; the page
//     neither preloads it nor links its stylesheet; its words are all in copy/en.js; reduced motion
//     stills every cap; nothing loops; a 44 px close target on a coarse pointer.
//
//   node tests/test_keyhint.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const hint = await import(pathToFileURL(join(JS, 'ui/keyhint.js')).href);
const { COPY } = await import(pathToFileURL(join(JS, 'copy/en.js')).href);
const { CAMERA_KEYS, createCameraRig } = await import(pathToFileURL(join(JS, 'scene/camera.js')).href);
const { wantsToggle } = await import(pathToFileURL(join(JS, 'ui/cleanview.js')).href);
const { railKey } = await import(pathToFileURL(join(JS, 'ui/rail.js')).href);
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);

// --- once ------------------------------------------------------------------------------------
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
const fresh = memory();
check(hint.decide(fresh, {}) === null, 'a first visit shows the hint');
check(fresh.m.get(hint.STORE_KEY) === '1', `the showing is remembered under ${hint.STORE_KEY}`);
check(hint.decide(fresh, {}) === 'seen', 'a second visit does not show it again');

const throwsOnRead = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
check(hint.readSeen(throwsOnRead) === null, 'a storage that throws reads as "cannot remember", not as "not seen"');
check(hint.decide(throwsOnRead, {}) === 'no-memory', 'no storage, no hint: it could not be shown only once');
const throwsOnWrite = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
check(hint.decide(throwsOnWrite, {}) === 'no-memory', 'a storage that reads but will not write is no memory either');
check(hint.readSeen(null) === null && hint.markSeen(null) === false, 'no storage object at all is handled');
check(hint.markSeen(throwsOnRead) === false, 'markSeen never throws');

// --- not now ----------------------------------------------------------------------------------
for (const [state, why] of [[{ deepLink: true }, 'deep-link'], [{ tripRunning: true }, 'trip'], [{ clean: true }, 'clean']]) {
  const s = memory();
  check(hint.decide(s, state) === why, `${why}: no hint (got ${hint.decide(memory(), state)})`);
  check(!s.m.has(hint.STORE_KEY), `${why}: a suppressed hint is not remembered, so the next ordinary visit gets it`);
  check(hint.decide(s, {}) === null, `${why}: and the next ordinary visit does`);
}
check(hint.whyNot({ seen: true, deepLink: true }) === 'seen', 'seen outranks the rest');

// --- touch or keys ------------------------------------------------------------------------------
const mm = (matches) => ({ matchMedia: (q) => ({ matches: matches && /hover: none/.test(q) && /pointer: coarse/.test(q) }) });
check(hint.hintMode(mm(true)) === 'touch', 'no hover and a coarse pointer: the gestures');
check(hint.hintMode(mm(false)) === 'keys', 'a pointer that hovers: the keys');
check(hint.hintMode({}) === 'keys' && hint.hintMode(null) === 'keys', 'no matchMedia: the keys');

// --- honest keys --------------------------------------------------------------------------------
const caps = hint.allCaps();
const body = { tagName: 'BODY' };
const turn = hint.KEY_ROWS.find((r) => r.id === 'turn');
const zoom = hint.KEY_ROWS.find((r) => r.id === 'zoom');
check(!!turn && !!zoom, 'there is a turn row and a zoom row');
for (const c of caps) {
  check(typeof COPY.keyHint.caps[c.id] === 'string' && COPY.keyHint.caps[c.id].length > 0, `cap ${c.id} has its label in COPY.keyHint.caps`);
  check(Array.isArray(c.keys) && c.keys.length > 0, `cap ${c.id} names its keys`);
  for (const k of c.keys) check(hint.capForKey(k) === c.id, `the key ${k} lights cap ${c.id}`);
}
for (const row of hint.KEY_ROWS) {
  for (const c of row.caps) for (const k of c.keys) check(CAMERA_KEYS.has(k), `the ${row.id} row's cap ${c.id} names ${k}, which the camera does not answer (scene/camera.js CAMERA_KEYS)`);
}
const shown = new Set(hint.KEY_ROWS.flatMap((r) => r.caps.flatMap((c) => c.keys)));
for (const k of CAMERA_KEYS) check(shown.has(k), `the camera answers ${k} and no cap shows it`);
const chrome = Object.fromEntries(hint.CHROME_KEYS.map((c) => [c.id, c]));
for (const k of chrome.h.keys) check(wantsToggle({ key: k }, body, false) === 'toggle', `the H cap's ${k} is the clear screen's key (ui/cleanview.js)`);
for (const k of chrome.l.keys) check(railKey({ key: k }, body) === 'show', `the L cap's ${k} opens What to show (ui/rail.js)`);
for (const k of chrome.p.keys) check(railKey({ key: k }, body) === 'share', `the P cap's ${k} opens Share (ui/rail.js)`);
check(chrome.esc.keys.join() === 'Escape', 'the Esc cap is Escape');
// `?` opens every key (public #315): the rail answers it, not while typing, and the trip's keys
// shown there are the ones ui/tripframe.js keyAction answers.
check(!!chrome.help && chrome.help.keys.join() === '?', 'the hint has a cap for ?');
check(railKey({ key: '?' }, body) === 'keys', 'the ? cap opens every key (ui/rail.js railKey)');
check(railKey({ key: '?' }, { tagName: 'INPUT' }) === null && railKey({ key: '?', ctrlKey: true }, body) === null, 'not while typing, and not with a modifier');
{
  const { keyAction } = await import(pathToFileURL(join(JS, 'ui/tripframe.js')).href);
  const running = { phase: 'dwell' };
  check(Array.isArray(hint.TRIP_KEYS) && hint.TRIP_KEYS.length >= 5, 'the trip\'s keys are listed');
  for (const row of hint.TRIP_KEYS) {
    const actions = Array.isArray(row.action) ? row.action : [row.action];
    row.keys.forEach((k, i) => check(keyAction({ key: k }, running, body) === actions[i], `in a trip ${JSON.stringify(k)} is "${actions[i]}" (ui/tripframe.js keyAction said ${keyAction({ key: k }, running, body)})`));
    for (const id of row.caps) check(typeof COPY.keyHint.caps[id] === 'string', `the trip cap ${id} has its label`);
    check(typeof COPY.keyHint.does[row.does] === 'string' && COPY.keyHint.does[row.does].split(/\s+/).length <= 2, `what ${row.id} does is two words at most`);
  }
  const src = read('site/js/ui/keyhint.js');
  check(/toggleAll/.test(src) && /is-all/.test(src) && /!all\) armAuto\(\)/.test(src), 'asked for, it stays: no auto-hide while every key is shown');
  check(/\.sr-keyhint\.is-all \.sr-keyhint__trip/.test(read('site/css/keyhint.css')), 'the trip\'s keys show only when every key is asked for');
  check(/keyhint\.toggleAll/.test(read('site/js/ui/rail.js')), 'the rail calls it');
}
// Internal #336: `/` focuses the search and the hint did not say so.
{
  const { wantsSearch } = await import(pathToFileURL(join(JS, 'ui/explore.js')).href);
  check(!!chrome.slash && chrome.slash.keys.join() === '/', 'the hint has a cap for /');
  for (const k of (chrome.slash || { keys: [] }).keys) check(wantsSearch({ key: k }, body) === true, `the / cap's ${k} focuses the search (ui/explore.js wantsSearch)`);
  check(COPY.keyHint.caps.slash === COPY.search.key && /\(\/\)/.test(COPY.search.inputTitle), 'the cap, the field\'s keycap and its tooltip name the same key');
}
check(/\(H\)/.test(COPY.clean.hide) && /\(L\)/.test(COPY.rail.show) && /\(P\)/.test(COPY.rail.share), 'the tooltips name the same letters as the caps');
for (const row of [...hint.KEY_ROWS, ...hint.CHROME_KEYS, ...hint.TOUCH_ROWS]) {
  check(typeof COPY.keyHint.does[row.does] === 'string', `what ${row.id} does is in COPY.keyHint.does (${row.does})`);
}
for (const row of hint.KEY_ROWS) check(typeof COPY.keyHint.how[row.how] === 'string', `the ${row.id} row's other way is in COPY.keyHint.how`);
for (const row of hint.TOUCH_ROWS) check(typeof COPY.keyHint.how[row.id] === 'string', `the ${row.id} gesture's name is in COPY.keyHint.how`);

// The caps do what their row says, held in a real rig (the arrow-key case of test_contract.mjs).
{
  const keys = { handlers: {},
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
    removeEventListener() {},
    send(type, e) { for (const fn of this.handlers[type] || []) fn(e); } };
  const ev = (k) => ({ key: k, preventDefault() {}, defaultPrevented: false, target: {} });
  const cam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
  cam.position.set(0, 0, 10);
  const rig = createCameraRig(cam, null, { worldRadius: 0, keyTarget: keys });
  rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 10, ms: 0 });
  rig.update(0.1);
  const run = (s) => { for (let t = 0; t < s; t += 1 / 30) rig.update(1 / 30); };
  const hold = (k) => {
    rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 10, azimuth: 0.3, polar: 1.2, ms: 0 });
    run(0.5);
    const before = { az: rig.state.azimuth, polar: rig.state.polar, d: rig.state.distance };
    keys.send('keydown', ev(k));
    run(0.5);
    keys.send('keyup', ev(k));
    run(1.5);
    return { turned: Math.abs(rig.state.azimuth - before.az) + Math.abs(rig.state.polar - before.polar), dd: rig.state.distance / before.d };
  };
  for (const c of turn.caps) {
    const r = hold(c.keys[0]);
    check(r.turned > 0.1 && Math.abs(r.dd - 1) < 0.01, `${c.id} (${c.keys[0]}) turns and does not zoom (turned ${r.turned.toFixed(3)}, distance x${r.dd.toFixed(3)})`);
  }
  const closer = new Set(['w', 'plus', 'pgUp']);
  for (const c of zoom.caps) {
    for (const k of c.keys) {
      const r = hold(k);
      const ok = closer.has(c.id) ? r.dd < 0.95 : r.dd > 1.05;
      check(ok && r.turned < 1e-6, `${c.id} (${k}) goes ${closer.has(c.id) ? 'closer' : 'farther'} without turning (distance x${r.dd.toFixed(3)})`);
    }
  }
}
// The gestures: one finger turns, two pinch and move (scene/camera.js onPointerMove).
{
  const cam = read('site/js/scene/camera.js');
  check(/pointers\.size === 1\)[\s\S]{0,400}orbitBy\(dx, dy\)/.test(cam), 'one finger dragging turns (orbitBy)');
  check(/pointers\.size >= 2\)[\s\S]{0,600}dollyBy\(Math\.log\(pinchDistance \/ d\)\)[\s\S]{0,80}panBy\(/.test(cam), 'two fingers pinch to zoom and move together to pan');
}

// --- lazy, styled once, words in copy ----------------------------------------------------------
const main = read('site/js/main.js');
check(/import\('\.\/ui\/keyhint\.js'\)/.test(main), 'main.js imports ui/keyhint.js dynamically');
check(!/^\s*import[^(]*['"]\.\/ui\/keyhint\.js['"]/m.test(main), 'and never statically (it is not first-visit code)');
const delay = /const KEYHINT_MS = (\d+);/.exec(main);
check(delay && Number(delay[1]) >= 3000, `KEYHINT_MS (${delay && delay[1]}) is past the two seconds the first-visit byte test lets a visit settle, and past the later layers`);
check(/const hintLater = \(\) => afterFirstVisit\(KEYHINT_MS, \(\) => keyHint\(\)\.then\(\(api\) => api\.maybeShow\(\)\)[\s\S]{0,120}\);\s*window\.addEventListener\('sr:layers-ready', hintLater, \{ once: true \}\);/.test(main), 'it decides after sr:layers-ready, by maybeShow()');
check(/ctx\.keyhint = \{ show:/.test(main), 'ctx.keyhint.show() exists before the module has loaded');
check(/arrivedByLink = !!\(link && \(link\.trip \|\| link\.at \|\| link\.event \|\| link\.stage\)\)/.test(main), 'a link with a trip, an object, a mission\'s event or a stage counts as a deep link');
const html = read('site/index.html');
check(!/keyhint/.test(html), 'index.html neither preloads keyhint.js nor links keyhint.css');
const src = read('site/js/ui/keyhint.js');
check(/css\/keyhint\.css/.test(src), 'keyhint.js links its own stylesheet on first show');
check(/setAttribute\('role', 'status'\)/.test(src) && /setAttribute\('aria-live', 'polite'\)/.test(src), 'it is a polite live region');
check(/setAttribute\('aria-label', W\.close\)/.test(src) && typeof COPY.keyHint.close === 'string', 'the close button is named from copy/en.js');
check(hint.AUTO_HIDE_MS >= 8000 && hint.AUTO_HIDE_MS <= 15000, `it goes by itself after about 12 s (${hint.AUTO_HIDE_MS})`);
const css = read('site/css/keyhint.css');
check(!/infinite/.test(css), 'nothing in keyhint.css loops');
check(/@media \(pointer: coarse\)\s*\{\s*\.sr-keyhint__close\s*\{[^}]*width: 44px;[^}]*height: 44px;/.test(css), 'the close button is a 44 px target on a coarse pointer');
check(/prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.sr-keyhint\.is-playing \.sr-keyhint__cap,[\s\S]*?animation: none;/.test(css), 'reduced motion stills every keycap');
check(/prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition: opacity 120ms linear;/.test(css), 'reduced motion is a 120 ms fade');
check(/\.sr-keyhint \{[^}]*right: var\(--sr-inset\);[^}]*bottom: var\(--sr-inset\);/.test(css), 'bottom-right, 20 px in');
check(read('tests/test_tokens.mjs').includes("'site/css/keyhint.css'"), 'test_tokens.mjs holds keyhint.css to the same rules as ui.css');

// REOPENED FROM WHAT TO SHOW (issue #321): its last row calls ctx.keyhint.show(), named from the
// hint's own words; tests/test_whattoshow.mjs clicks it in a small DOM.
const wts = read('site/js/ui/whattoshow.js');
check(/ctx\.keyhint\.show\(\)/.test(wts) && /sr-show__keys/.test(wts), 'What to show has a Keys row that reopens the hint');
check(COPY.controls.keysRow && COPY.controls.keysRowTouch, 'and its words are in copy/en.js');

if (problems.length) {
  console.error('keyhint FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`keyhint ok: once (and none without storage), not on a link, a trip or a clear screen; ${caps.length} keycaps, each a key the app answers and every camera key shown; lazy, polite, still under reduced motion`);
