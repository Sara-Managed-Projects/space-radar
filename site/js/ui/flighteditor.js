// ui/flighteditor.js -- the flight editor: keys of views, flown between with an ease, scrubbed, previewed, shared
// as a `#path=` link and saved as a draft trip (forge #155). The path itself is ui/flightpath.js, pure.
//
// Contract: createFlightEditor(ctx) -> { open({ opener }), close(), isOpen(), openLink(value), play(), stop(),
//                                        scrubTo(ms), addView(), path(), playing(), state(), root }
//
// HOW A KEY IS MADE. The visitor flies the map as they always do (a tap, the search, a saved arrival view of
// ui/bookmarks.js) and presses "Add this view": what is selected (or the point the camera looks at), the map, the
// camera's pose round it (main.js ctx.camPose, the same three numbers a `cam=` link carries), the clock's instant
// when it is not live, and its rate. A key can be put back ("Go"), replaced by the view now, moved and removed.
//
// HOW IT IS FLOWN. One frame at a time, from path time: ui/flightpath.js poseAt() and clockAt() say where the
// camera stands and what the clock reads, and this file stands it there (scene/camera.js flyTo with ms 0: the
// rig's own clearance and clamps, no second camera). The look-at point is mixed between the two keys' targets
// AT THIS FRAME'S INSTANT, so a moving station is followed through the flight and is in frame when it is
// reached. The clock is set only while it is being eased to a key's instant; otherwise it runs at the key's rate
// on its own (clock.js tick), so the time pill and the URL writer are not woken sixty times a second for nothing.
// A scrub is the same function at the slider's time, so what the slider shows is what Play plays.
//
// REDUCED MOTION (prefers-reduced-motion, or the Motion row's Off): Play is a cut to each key, held for its
// flight's length. Nothing flies. A drag or a wheel on the map during Play stops it where it is.
//
// THE LINK AND THE DRAFT. "Copy link" writes `#path=` (ui/urlstate.js) and copies the address with it. "Save trip
// draft" downloads a registry/tours.yaml entry (ui/flightpath.js tripDraft) for a person to finish: the cards
// are theirs to write. Nothing is kept on the device or sent anywhere.
//
// ON A PHONE the panel is the phone's bottom sheet (ui/sheet.js), at half when it opens, with Play, the slider and
// the time in its head so the sheet can go down to its band and leave the scene to the flight. Every control is
// 44 px. On a desktop it is a panel beside the rail. Keyboard: a region with a heading; Escape closes it when focus
// is inside; the slider is a native range with the time in words.
//
// NEVER AT BOOT: main.js imports this on the share sheet's Flight path or a `#path=` link.

import { COPY, t, fmt, formatRate } from '../copy/en.js';
import '../copy/en.make.js';
import { loadCss } from './latercss.js';
import { createSheet } from './sheet.js';
import { toast, appBase } from './share.js';
import { write as writeUrl } from './urlstate.js';
import { saveBlob } from './printcompose.js';
import {
  EASINGS, RATES, MAX_KEYS, MIN_MS, MAX_MS, DEFAULT_MS,
  makeKey, startsOf, totalMs, poseAt, clockAt, clockTimes, encodePath, decodePath, tripDraft,
} from './flightpath.js';

const RAD = Math.PI / 180;
/** The durations offered for a flight, in seconds. */
export const DURATIONS_S = [1, 2, 3, 4, 6, 8, 12, 20, 30, 60];

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}
function button(className, label, title) {
  const b = el('button', className, label);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}
function select(label, options, value) {
  const wrap = el('label', 'sr-make__field');
  wrap.appendChild(el('span', 'sr-make__fieldname', label));
  const s = el('select', 'sr-make__select');
  for (const [v, text] of options) {
    const o = el('option', null, text);
    o.value = String(v);
    s.appendChild(o);
  }
  s.value = String(value);
  wrap.appendChild(s);
  return { wrap, s };
}

/** "0:04" for 4 s, "1:02" for 62 s. Pure. */
export function clockText(ms) {
  const s = Math.max(0, Math.round(Number(ms) / 1000) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function reducedMotion() {
  try {
    if (document.documentElement.dataset.srMotion === 'off') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch { return false; }
}

export function createFlightEditor(ctx) {
  const M = COPY.flight;
  const doc = document;
  // The phone's sheet measures the panel, so it is seated once the panel's rules have landed (css/make.css).
  const cssReady = loadCss('make', doc);
  let keys = [];
  let anchor = null; // the clock's instant a path of live keys starts from (set on the first Play or scrub)
  let at = 0; // path time shown, ms
  let run = null; // { raf, began, from, cut } while playing
  let opener = null;

  const root = el('section', 'sr-make sr-float sr-over-clean');
  root.id = 'sr-flight';
  root.setAttribute('aria-labelledby', 'sr-flight-title');
  root.hidden = true;
  const head = el('div', 'sr-make__head');
  const title = el('h2', 'sr-make__title', M.title);
  title.id = 'sr-flight-title';
  title.tabIndex = -1;
  const closeBtn = button('sr-make__close', '×', M.close);
  closeBtn.setAttribute('aria-label', M.close);
  const transport = el('div', 'sr-make__transport');
  const playBtn = button('sr-make__play', M.play, M.playTitle);
  const scrub = el('input', 'sr-make__scrub');
  scrub.type = 'range';
  scrub.min = '0';
  scrub.step = '50';
  scrub.setAttribute('aria-label', M.scrub);
  const timeOut = el('output', 'sr-make__time', '0:00 / 0:00');
  transport.append(playBtn, scrub, timeOut);
  head.append(title, closeBtn, transport);

  const body = el('div', 'sr-make__body');
  const hint = el('p', 'sr-make__hint', M.hint);
  const addBtn = button('sr-make__btn sr-make__btn--primary', M.add, M.addTitle);
  const list = el('ol', 'sr-make__keys');
  list.setAttribute('aria-label', M.keysLabel);
  const acts = el('div', 'sr-make__acts');
  const linkBtn = button('sr-make__btn', M.copyLink, M.copyLinkTitle);
  const draftBtn = button('sr-make__btn', M.draft, M.draftTitle);
  const recordBtn = button('sr-make__btn', M.record, M.recordTitle);
  const clearBtn = button('sr-make__btn', M.clear, M.clearTitle);
  acts.append(linkBtn, draftBtn, recordBtn, clearBtn);
  const honest = el('p', 'sr-make__note', M.honesty);
  body.append(hint, addBtn, list, acts, honest);
  root.append(head, body);
  doc.body.appendChild(root);

  // ---------------------------------------------------------------------------------------- the path
  const path = () => ({ keys: keys.slice() });
  const stageNow = () => ctx.stage.worldId;
  const unit = () => ctx.stage.unitKm;

  function recordOf(key) {
    if (!key || !key.at) return null;
    return ctx.recordById(key.at) || null;
  }
  /** Where a key's target is drawn on the map shown now, in scene units, or null. */
  function targetOf(key) {
    if (!key) return null;
    if (key.xyz) return key.stage === stageNow() ? { x: key.xyz[0] / unit(), y: key.xyz[1] / unit(), z: key.xyz[2] / unit() } : null;
    const r = recordOf(key);
    if (!r) return null;
    try { return ctx.positionOfRecord(r) || null; } catch { return null; }
  }
  /** The key's layer goes on first, as a link's `at` does (main.js openAt): a record whose layer is off is not drawn. */
  function wake(key) {
    const r = recordOf(key);
    if (r && r.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(r.layer)) {
      ctx.setLayerOn(r.layer, true);
      doc.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: r.layer, on: true, handled: true, from: 'flight' } }));
    }
    if (r && r.klass === 'world' && ctx.worlds && typeof ctx.worlds.preload === 'function') ctx.worlds.preload(r.id);
  }
  function toStage(id) {
    if (id && id !== stageNow() && typeof ctx.setStage === 'function') ctx.setStage(id);
  }

  function nameOf(key) {
    if (key.xyz) return M.point;
    const r = recordOf(key);
    return (r && (r.name || r.id)) || key.at;
  }

  /** Stand the camera at path time `ms` (and the clock, when `withClock`). Returns the pose. */
  function standAt(ms, withClock) {
    const first = poseAt(path(), ms);
    if (!first) return null;
    toStage(first.stage);
    const rig = ctx.cameraRig;
    const to = targetOf(first.to);
    // From a key on another map there is nothing to fly away from: the flight is a dolly on the new map.
    const from = first.from !== first.to && first.from.stage === first.to.stage ? targetOf(first.from) : null;
    // Two things far apart are flown between over an apex (ui/flightpath.js logDistanceAt), from where they are drawn now.
    const sepKm = to && from ? Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) * unit() : 0;
    const p = sepKm > 0 ? poseAt(path(), ms, sepKm) : first;
    const tgt = to && from ? { x: from.x + (to.x - from.x) * p.e, y: from.y + (to.y - from.y) * p.e, z: from.z + (to.z - from.z) * p.e } : to || from;
    if (withClock) {
      const c = clockAt(path(), ms, anchor);
      const rates = ctx.clock.rates();
      if (c.driven || !run) ctx.clock.goTo(c.t);
      if (rates.includes(c.rate) && ctx.clock.rate !== c.rate) ctx.clock.setRate(c.rate);
      // Scrubbing holds the clock at the path's instant, so what the slider shows stays put; Play lets it run.
      if (ctx.clock.paused === !!run) ctx.clock.setPaused(!run);
    }
    rig.stopFollow();
    rig.flyTo({ ...(tgt ? { targetScene: tgt } : {}), azimuth: p.azimuthDeg * RAD, polar: p.polarDeg * RAD, distance: p.distanceKm / unit(), ms: 0 });
    return p;
  }

  // -------------------------------------------------------------------------------------- playing
  function playing() { return !!run; }

  function play() {
    if (keys.length < 2) { toast(M.needTwo, 3000); return false; }
    stop('replaced');
    for (const k of keys) wake(k);
    if (anchor === null || keys[0].t !== null) anchor = ctx.clock.now();
    const total = totalMs(path());
    const from = at >= total ? 0 : at;
    const cut = reducedMotion();
    run = { raf: 0, began: performance.now(), from, cut, lastKey: -1 };
    // A key's clock starts it: at a key with an instant the clock is there; a path of live keys starts now.
    if (from === 0) {
      const T = clockTimes(path(), anchor);
      if (keys[0].t !== null) ctx.clock.goTo(T[0]);
      if (ctx.clock.rates().includes(keys[0].rate)) ctx.clock.setRate(keys[0].rate);
    }
    paint();
    const step = () => {
      if (!run) return;
      const now = from + (performance.now() - run.began);
      if (cut) {
        // A cut to each key, held for its flight: the key reached is the last one whose time has come.
        const starts = startsOf(path());
        let i = 0;
        while (i + 1 < starts.length && starts[i + 1] <= now) i += 1;
        if (i !== run.lastKey) { run.lastKey = i; at = starts[i]; standAt(starts[i], true); }
      } else {
        at = Math.min(now, total);
        standAt(at, true);
      }
      paintTime();
      if (now >= total) { finish(); return; }
      run.raf = requestAnimationFrame(step);
    };
    run.raf = requestAnimationFrame(step);
    if (ctx) ctx.lastFlight = { playing: true, keys: keys.length, totalMs: total, cut };
    return true;
  }

  /** Landed on the last key: it becomes the selection, followed as a tap would follow it. */
  function finish() {
    const last = keys[keys.length - 1];
    stop('done');
    const r = recordOf(last);
    if (r && typeof ctx.select === 'function') ctx.select(r, { fly: false, undo: false, from: 'flight' });
    if (ctx) ctx.lastFlight = { ...(ctx.lastFlight || {}), playing: false, done: true, at };
  }

  function stop(reason = 'stopped') {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    run = null;
    paint();
    if (ctx && ctx.lastFlight) ctx.lastFlight.stopped = reason;
  }

  function scrubTo(ms) {
    stop('scrub');
    if (!keys.length) return;
    if (anchor === null) anchor = ctx.clock.now();
    for (const k of keys) wake(k);
    at = Math.max(0, Math.min(Number(ms) || 0, totalMs(path())));
    standAt(at, true);
    paintTime();
  }

  // A hand on the map takes the camera back: Play stops where it is.
  if (ctx.cameraRig && typeof ctx.cameraRig.onUserInput === 'function') ctx.cameraRig.onUserInput(() => stop('cancelled'));

  // ---------------------------------------------------------------------------------------- editing
  function viewNow(ms) {
    const rec = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const pose = ctx.camPose();
    const live = ctx.clock.mode === 'live';
    const raw = { stage: stageNow(), cam: pose, t: live ? null : ctx.clock.now(), rate: ctx.clock.rate, ease: 'smooth', ms };
    if (rec && rec.id) raw.at = rec.id;
    else {
      const s = ctx.cameraRig.saveState();
      raw.xyz = [s.target.x * unit(), s.target.y * unit(), s.target.z * unit()];
    }
    return makeKey(raw);
  }

  function addView() {
    if (keys.length >= MAX_KEYS) { toast(t(M.full, { n: MAX_KEYS }), 3000); return null; }
    const prev = keys[keys.length - 1];
    const key = viewNow(prev ? prev.ms : DEFAULT_MS);
    if (!key) { toast(M.noView, 3000); return null; }
    if (prev) { key.ease = prev.ease; }
    keys.push(key);
    at = totalMs(path());
    changed();
    const items = list.querySelectorAll('.sr-make__key');
    const last = items[items.length - 1];
    if (last) last.querySelector('.sr-make__keyname').focus({ preventScroll: false });
    return key;
  }

  function changed() {
    stop('edited');
    writeUrl({ path: null }); // the address is the link only once it is copied: an edit makes the old one stale
    render();
  }

  function rateOptions() {
    return RATES.map((r) => [r, r === 1 ? M.rateLive : formatRate(r)]);
  }

  function renderKey(key, i) {
    const li = el('li', 'sr-make__key');
    const top = el('div', 'sr-make__keytop');
    const name = button('sr-make__keyname', t(M.keyName, { n: i + 1, name: nameOf(key) }), M.goTitle);
    name.addEventListener('click', () => scrubTo(startsOf(path())[i]));
    const when = el('span', 'sr-make__keywhen', key.t === null ? M.keyLive : new Date(key.t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
    top.append(name, when);
    li.appendChild(top);
    const row = el('div', 'sr-make__keyrow');
    if (i > 0) {
      const d = select(M.duration, DURATIONS_S.map((s) => [s * 1000, t(M.seconds, { n: fmt.int(s) })]), DURATIONS_S.includes(key.ms / 1000) ? key.ms : DEFAULT_MS);
      if (!DURATIONS_S.includes(key.ms / 1000)) {
        const o = el('option', null, t(M.seconds, { n: fmt.num(key.ms / 1000, 1) }));
        o.value = String(key.ms);
        d.s.appendChild(o);
        d.s.value = String(key.ms);
      }
      d.s.addEventListener('change', () => { keys[i] = makeKey({ ...key, ms: Number(d.s.value) }); changed(); });
      const e = select(M.ease, EASINGS.map((x) => [x, M.eases[x]]), key.ease);
      e.s.addEventListener('change', () => { keys[i] = makeKey({ ...key, ease: e.s.value }); changed(); });
      row.append(d.wrap, e.wrap);
    }
    const r = select(M.rate, rateOptions(), key.rate);
    r.s.addEventListener('change', () => { keys[i] = makeKey({ ...key, rate: Number(r.s.value) }); changed(); });
    row.appendChild(r.wrap);
    li.appendChild(row);
    const tools = el('div', 'sr-make__keytools');
    const mk = (label, aria, fn, off) => {
      const b = button('sr-make__mini', label, t(aria, { n: i + 1 }));
      b.setAttribute('aria-label', t(aria, { n: i + 1 }));
      b.disabled = !!off;
      b.addEventListener('click', fn);
      tools.appendChild(b);
      return b;
    };
    mk(M.up, M.upLabel, () => { [keys[i - 1], keys[i]] = [keys[i], keys[i - 1]]; changed(); }, i === 0);
    mk(M.down, M.downLabel, () => { [keys[i + 1], keys[i]] = [keys[i], keys[i + 1]]; changed(); }, i === keys.length - 1);
    mk(M.replace, M.replaceLabel, () => { const k = viewNow(key.ms); if (k) { k.ease = key.ease; keys[i] = k; changed(); } });
    mk(M.remove, M.removeLabel, () => { keys.splice(i, 1); changed(); });
    li.appendChild(tools);
    return li;
  }

  function render() {
    while (list.firstChild) list.removeChild(list.firstChild);
    keys.forEach((k, i) => list.appendChild(renderKey(k, i)));
    hint.textContent = keys.length ? (keys.length < 2 ? M.hintOne : t(M.hintMany, { n: keys.length })) : M.hint;
    addBtn.disabled = keys.length >= MAX_KEYS;
    for (const b of [linkBtn, draftBtn, recordBtn]) b.disabled = keys.length < 2;
    clearBtn.disabled = !keys.length;
    paint();
  }

  function paintTime() {
    const total = totalMs(path());
    scrub.max = String(total);
    scrub.value = String(Math.min(at, total));
    scrub.disabled = keys.length < 2;
    timeOut.textContent = `${clockText(at)} / ${clockText(total)}`;
    scrub.setAttribute('aria-valuetext', t(M.scrubAt, { at: clockText(at), total: clockText(total) }));
  }

  function paint() {
    playBtn.textContent = run ? M.stop : M.play;
    playBtn.title = run ? M.stopTitle : M.playTitle;
    playBtn.setAttribute('aria-pressed', run ? 'true' : 'false');
    playBtn.disabled = keys.length < 2;
    paintTime();
  }

  // ----------------------------------------------------------------------------------- the actions
  playBtn.addEventListener('click', () => (run ? stop('stopped') : play()));
  scrub.addEventListener('input', () => scrubTo(Number(scrub.value)));
  addBtn.addEventListener('click', addView);
  clearBtn.addEventListener('click', () => { keys = []; anchor = null; at = 0; changed(); });

  /** The link to this path: the address with `#path=` and nothing that would fly elsewhere first. */
  async function linkFor() {
    const value = await encodePath(path());
    return { value, url: `${appBase()}#path=${value}` };
  }
  linkBtn.addEventListener('click', async () => {
    const { value, url } = await linkFor();
    writeUrl({ path: value });
    if (ctx) ctx.lastFlightLink = url; // for a browser check: the clipboard cannot be read back there
    try {
      await navigator.clipboard.writeText(url);
      toast(t(M.linkCopied, { n: fmt.int(url.length) }), 3000);
    } catch {
      toast(M.linkInBar, 4000);
    }
  });
  draftBtn.addEventListener('click', () => {
    const worlds = ctx.worlds && typeof ctx.worlds.ids === 'function' ? ctx.worlds.ids() : keys.filter((k) => { const r = recordOf(k); return r && r.klass === 'world'; }).map((k) => k.at);
    const names = {};
    const layers = {};
    for (const k of keys) {
      const r = recordOf(k);
      if (r && r.name) names[k.at] = r.name;
      if (r && r.layer && r.klass !== 'world') layers[k.at] = r.layer;
    }
    const day = new Date().toISOString().slice(0, 10);
    const yaml = tripDraft(path(), { worlds, names, layers, id: `draft-flight-${day.replace(/-/g, '')}`, today: day });
    if (ctx) ctx.lastFlightDraft = yaml;
    saveBlob(new Blob([yaml], { type: 'text/yaml' }), `trip-draft-${day}.yaml`);
    toast(M.draftSaved, 3000);
  });
  recordBtn.addEventListener('click', async () => {
    if (typeof ctx.wantRecorder !== 'function') return;
    const rec = await ctx.wantRecorder();
    if (rec) rec.open({ opener: recordBtn, source: 'path' });
  });

  // ------------------------------------------------------------------------------ open, close, keys
  let sheet = null;
  const isPhone = () => doc.documentElement.classList.contains('sr-phone');
  function seat() {
    if (isPhone() && !sheet) {
      sheet = createSheet(root, { detents: ['peek', 'half', 'full'], initial: 'half', grab: '.sr-make__title', scrollers: '.sr-make__body', label: M.sheet });
    } else if (!isPhone() && sheet) { sheet.destroy(); sheet = null; }
    if (sheet) sheet.set('half');
  }

  function open(opts = {}) {
    opener = opts.opener || doc.activeElement;
    root.hidden = false;
    doc.documentElement.classList.add('sr-flight-on');
    cssReady.then(() => { if (!root.hidden) seat(); });
    render();
    title.focus({ preventScroll: true });
  }
  function close() {
    if (root.hidden) return;
    stop('closed');
    root.hidden = true;
    doc.documentElement.classList.remove('sr-flight-on');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });

  /** A `#path=` link: the editor opens with its keys and plays it once the keys' things are on the map. */
  async function openLink(value) {
    const p = await decodePath(value);
    if (!p) { toast(M.badLink, 4000); return false; }
    keys = p.keys;
    anchor = null;
    at = 0;
    open({});
    for (const k of keys) wake(k);
    // A key whose thing is in a layer that has not landed yet (a star, before the later layers) waits for it, once.
    if (keys.some((k) => k.at && !recordOf(k)) && typeof ctx.loadAfterFirstVisit === 'function' && !ctx.laterLayersLoaded()) {
      try { await ctx.loadAfterFirstVisit(); } catch { /* a key with no thing keeps its pose and looks at the stage */ }
    }
    if (ctx) ctx.lastFlightLink = `${appBase()}#path=${value}`;
    scrubTo(0);
    return play();
  }

  return {
    open, close, isOpen: () => !root.hidden, openLink, play, stop, scrubTo, addView,
    path, playing, root,
    // For the recorder and a browser check: what is up, in numbers.
    state: () => ({ keys: keys.length, at, totalMs: totalMs(path()), playing: !!run }),
    // For the recorder: the link this path is.
    linkFor,
    // Whether the editor can play what is in it (two keys at least) and the ms MIN/MAX it holds to.
    limits: { MIN_MS, MAX_MS, MAX_KEYS },
  };
}
