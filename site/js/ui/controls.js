// ui/controls.js -- the moment switcher, the layer toggles, the clock and the location.
//
// Contract export: createControls(ctx): void
//
// Four things, in this order down the panel:
//   1. Wonder / Now / Next as three equal doors (spec 0001), reflected in location.hash
//   2. layer toggles, each with its LIVE count, calm by default
//   3. the clock: play/pause, speed steps, an obvious scrub, and "now" always visible
//   4. where you are: a city from a bundled list, or the browser -- which cannot answer
//      over plain http, and says so instead of failing silently
//
// Every string comes from copy/en.js. Nothing here calls Date.now(): the "present" is
// ctx.clock.now() while the clock is live, remembered as the scrub anchor.

import { COPY, CITIES, t, fmt, timeText, inWords } from '../copy/en.js';

const HOST_ID = 'sr-controls';
const MOMENTS = [COPY.moments.wonder, COPY.moments.now, COPY.moments.next];
const MOMENT_IDS = MOMENTS.map((m) => m.id);
const SPEEDS = [1, 10, 60, 600, 3600, 36000]; // the contract's rate ladder
const HASH_KEY = 'm';
const SCRUB_BACK_MS = 7 * 86400000; // spec 0005: -7 days
const SCRUB_FORWARD_MS = 30 * 86400000; // spec 0005: +30 days
const SCRUB_STEPS = 20000; // range slider resolution
const UI_REFRESH_MS = 500;

let host = null;
let built = false;

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {} };

// ---------------------------------------------------------------------------------------
// DOM helpers -- textContent only, never innerHTML
// ---------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

function ensureHost() {
  if (host && host.isConnected) return host;
  host = document.getElementById(HOST_ID);
  if (!host) {
    host = el('nav', 'sr-controls');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }
  host.classList.add('sr-controls');
  host.setAttribute('aria-label', COPY.controls.title);
  if (reduceMotion.matches) host.classList.add('is-reduced-motion');
  return host;
}

// ---------------------------------------------------------------------------------------
// location.hash -- one key, other keys left alone so spec 0017's packed state can share it
// ---------------------------------------------------------------------------------------

function hashParts() {
  const raw = (typeof location !== 'undefined' ? location.hash : '') || '';
  return raw.replace(/^#/, '').split('&').filter(Boolean);
}

function readMomentFromHash() {
  for (const part of hashParts()) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq) === HASH_KEY) {
      const value = part.slice(eq + 1);
      if (MOMENT_IDS.includes(value)) return value;
    }
  }
  return null;
}

function writeMomentToHash(moment) {
  const parts = hashParts();
  let found = false;
  const next = parts.map((part) => {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === HASH_KEY) {
      found = true;
      return `${HASH_KEY}=${moment}`;
    }
    return part;
  });
  if (!found) next.unshift(`${HASH_KEY}=${moment}`);
  const target = `#${next.join('&')}`;
  if (location.hash === target) return;
  try {
    history.replaceState(null, '', target);
  } catch {
    location.hash = target;
  }
}

// ---------------------------------------------------------------------------------------
// Reading ctx without reaching into anyone's internals more than the contract allows
// ---------------------------------------------------------------------------------------

function layerList(ctx) {
  const l = ctx && ctx.layers;
  if (Array.isArray(l)) return l;
  if (l && Array.isArray(l.LAYERS)) return l.LAYERS;
  if (l && Array.isArray(l.list)) return l.list;
  if (l && typeof l.all === 'function') {
    try {
      const out = l.all();
      if (Array.isArray(out)) return out;
    } catch {
      return [];
    }
  }
  return [];
}

function recordsOf(ctx) {
  try {
    const r = ctx && typeof ctx.records === 'function' ? ctx.records() : null;
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

function momentOf(ctx) {
  const m = ctx && ctx.moment;
  const id = typeof m === 'string' ? m : m && m.id;
  return MOMENT_IDS.includes(id) ? id : null;
}

/** The calm default: on only where this layer's moments row says on for this moment. */
function defaultOnFor(layer, moment) {
  const moments = layer && layer.moments;
  if (moments && Object.prototype.hasOwnProperty.call(moments, moment)) {
    const v = moments[moment];
    return v === true || v === 'on';
  }
  return layer && layer.defaultOn === true;
}

function applyLayerEnabled(ctx, layer, on) {
  let handled = false;
  try {
    if (ctx && typeof ctx.setLayerEnabled === 'function') {
      ctx.setLayerEnabled(layer.id, on);
      handled = true;
    } else if (ctx && typeof ctx.setLayerOn === 'function') {
      // main.js's spelling of the same thing. Without this clause every checkbox in the panel
      // is inert: the fallback below writes `layer.enabled` and main.js reads `layer.on`.
      ctx.setLayerOn(layer.id, on);
      handled = true;
    } else if (ctx && ctx.layers && typeof ctx.layers.setEnabled === 'function') {
      ctx.layers.setEnabled(layer.id, on);
      handled = true;
    }
  } catch {
    handled = false;
  }
  if (!handled) layer.enabled = on;
  // Whatever handled it, say so once so the integrator can hang the scene off one event.
  try {
    document.dispatchEvent(
      new CustomEvent('sr:layer-toggle', { detail: { id: layer.id, on, handled } }),
    );
  } catch {
    /* older browsers: the direct call above already did the work */
  }
}

// ---------------------------------------------------------------------------------------
// 1. The moment switcher: three equal doors
// ---------------------------------------------------------------------------------------

function buildMoments(ctx, state) {
  const wrap = el('section', 'sr-panel sr-moments');
  const group = el('div', 'sr-doors');
  group.setAttribute('role', 'tablist');
  group.setAttribute('aria-label', COPY.moments.title);

  for (const moment of MOMENTS) {
    const door = button('sr-door', null, moment.hint);
    door.setAttribute('role', 'tab');
    door.dataset.moment = moment.id;
    door.appendChild(el('span', 'sr-door__label', moment.label));
    door.appendChild(el('span', 'sr-door__hint', moment.hint));
    door.addEventListener('click', () => setMoment(ctx, state, moment.id));
    group.appendChild(door);
  }
  wrap.appendChild(group);
  state.doors = group;
  return wrap;
}

function setMoment(ctx, state, moment) {
  if (!MOMENT_IDS.includes(moment)) return;
  const changed = state.moment !== moment || !state.seeded;
  state.moment = moment;
  state.seeded = true;
  writeMomentToHash(moment);
  try {
    if (ctx && typeof ctx.setMoment === 'function') ctx.setMoment(moment);
  } catch {
    /* the panel still reflects the choice */
  }
  paintMoments(state);
  // The calm default is per moment, so the layer rows are reseeded when it changes --
  // and only then, or a second tap on the same door would undo the visitor's choices.
  if (changed) {
    reseedLayers(ctx, state);
    for (const layer of layerList(ctx)) {
      applyLayerEnabled(ctx, layer, state.enabled.get(layer.id) === true);
    }
  }
  paintLayers(ctx, state);
}

function paintMoments(state) {
  if (!state.doors) return;
  for (const door of state.doors.children) {
    const on = door.dataset.moment === state.moment;
    door.classList.toggle('is-on', on);
    door.setAttribute('aria-selected', on ? 'true' : 'false');
  }
}

// ---------------------------------------------------------------------------------------
// 2. Layer toggles, each with a live count
// ---------------------------------------------------------------------------------------

function buildLayers(ctx, state) {
  const wrap = el('section', 'sr-panel sr-layers');
  wrap.appendChild(el('h2', 'sr-panel__title', COPY.controls.layersTitle));
  const list = el('ul', 'sr-layers__list');
  wrap.appendChild(list);
  state.layerList = list;
  state.layerRows = new Map();

  const layers = layerList(ctx);
  if (!layers.length) {
    list.appendChild(el('li', 'sr-layers__empty', COPY.controls.layersEmpty));
    return wrap;
  }

  for (const layer of layers) {
    if (layer.enabled === false && layer.stage === 'off') continue;
    const row = el('li', 'sr-layer');
    const label = el('label', 'sr-layer__label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'sr-layer__box';
    box.addEventListener('change', () => {
      state.enabled.set(layer.id, box.checked);
      applyLayerEnabled(ctx, layer, box.checked);
      paintLayers(ctx, state);
    });
    // layers.js gives `colour` as a hex, not a token name, so `sr-swatch--#7FD1FF` matches no
    // rule and every swatch came out the fallback grey. The class token comes from the klass;
    // a hex, when there is one, is applied directly so the layer's own colour still wins.
    const hex = typeof layer.colour === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(layer.colour);
    const token = (hex ? layer.klass : layer.colour) || layer.klass || 'satellite';
    const swatch = el('span', `sr-swatch sr-swatch--${token}`);
    if (hex) swatch.style.background = layer.colour;
    swatch.setAttribute('aria-hidden', 'true');
    label.appendChild(box);
    label.appendChild(swatch);
    label.appendChild(el('span', 'sr-layer__name', layer.display || layer.id));
    const count = el('span', 'sr-layer__count sr-num', COPY.controls.layerCountLoading);
    label.appendChild(count);
    row.appendChild(label);
    list.appendChild(row);
    state.layerRows.set(layer.id, { box, count, layer });
  }
  return wrap;
}

function reseedLayers(ctx, state) {
  for (const layer of layerList(ctx)) {
    state.enabled.set(layer.id, defaultOnFor(layer, state.moment));
  }
}

function paintLayers(ctx, state) {
  if (!state.layerRows || !state.layerRows.size) return;
  const counts = new Map();
  for (const record of recordsOf(ctx)) {
    if (!record || !record.layer) continue;
    counts.set(record.layer, (counts.get(record.layer) || 0) + 1);
  }
  for (const [id, row] of state.layerRows) {
    const on = state.enabled.get(id) === true;
    if (row.box.checked !== on) row.box.checked = on;
    const n = counts.get(id);
    row.count.textContent =
      n === undefined || n === 0
        ? COPY.controls.layerCountEmpty
        : t(COPY.controls.layerCount, { n: fmt.int(n) });
    row.count.classList.toggle('is-empty', !n);
  }
}

// ---------------------------------------------------------------------------------------
// 3. The clock
// ---------------------------------------------------------------------------------------

function buildClock(ctx, state) {
  const wrap = el('section', 'sr-panel sr-clock');
  wrap.appendChild(el('h2', 'sr-panel__title', COPY.controls.clockTitle));

  const readout = el('div', 'sr-clock__readout');
  const utc = el('div', 'sr-clock__line');
  utc.appendChild(el('span', 'sr-clock__tag', COPY.controls.utcLabel));
  const utcValue = el('span', 'sr-clock__time sr-num');
  utc.appendChild(utcValue);
  const utcDate = el('span', 'sr-clock__date sr-num');
  utc.appendChild(utcDate);
  readout.appendChild(utc);

  const local = el('div', 'sr-clock__line');
  local.appendChild(el('span', 'sr-clock__tag', COPY.controls.localLabel));
  const localValue = el('span', 'sr-clock__time sr-num');
  local.appendChild(localValue);
  const localZone = el('span', 'sr-clock__date', timeText.timeZoneName());
  local.appendChild(localZone);
  readout.appendChild(local);
  wrap.appendChild(readout);

  const transport = el('div', 'sr-clock__transport');
  const playPause = button('sr-btn sr-btn--icon', COPY.controls.pause, COPY.controls.pauseTitle);
  playPause.addEventListener('click', () => togglePlay(ctx, state));
  transport.appendChild(playPause);

  const nowBtn = button('sr-btn sr-btn--primary', COPY.controls.nowButton, COPY.controls.nowTitle);
  nowBtn.addEventListener('click', () => {
    try {
      ctx.clock.live();
    } catch {
      /* nothing else to try */
    }
    state.pausedRate = null;
    paintClock(ctx, state);
  });
  transport.appendChild(nowBtn);

  const mode = el('span', 'sr-clock__mode', COPY.controls.live);
  transport.appendChild(mode);
  wrap.appendChild(transport);

  const speeds = el('div', 'sr-speeds');
  speeds.setAttribute('aria-label', COPY.controls.speedTitle);
  const speedButtons = new Map();
  for (const rate of SPEEDS) {
    const b = button('sr-speed sr-num', t(COPY.controls.speedLabel, { n: fmt.int(rate) }));
    b.addEventListener('click', () => {
      try {
        ctx.clock.setRate(rate);
      } catch {
        /* the panel still reflects the intent on the next paint */
      }
      state.pausedRate = null;
      paintClock(ctx, state);
    });
    speeds.appendChild(b);
    speedButtons.set(rate, b);
  }
  wrap.appendChild(speeds);

  const scrubWrap = el('div', 'sr-scrub');
  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.className = 'sr-scrub__range';
  scrub.min = '0';
  scrub.max = String(SCRUB_STEPS);
  scrub.step = '1';
  scrub.title = COPY.controls.scrubTitle;
  scrub.setAttribute('aria-label', COPY.controls.scrubTitle);
  const offset = el('span', 'sr-scrub__offset sr-num', COPY.controls.live);
  scrubWrap.appendChild(scrub);
  scrubWrap.appendChild(offset);
  wrap.appendChild(scrubWrap);

  const onScrub = () => {
    state.scrubbing = true;
    host.classList.add('is-scrubbing');
    const fraction = Number(scrub.value) / SCRUB_STEPS;
    const target = state.anchorMs - SCRUB_BACK_MS + fraction * (SCRUB_BACK_MS + SCRUB_FORWARD_MS);
    try {
      ctx.clock.goTo(target);
    } catch {
      /* an unmovable clock still leaves the panel honest */
    }
    paintClock(ctx, state);
  };
  scrub.addEventListener('input', onScrub);
  const endScrub = () => {
    state.scrubbing = false;
    host.classList.remove('is-scrubbing');
  };
  scrub.addEventListener('change', endScrub);
  scrub.addEventListener('pointerup', endScrub);
  scrub.addEventListener('blur', endScrub);

  state.clockEls = {
    utcValue,
    utcDate,
    localValue,
    playPause,
    mode,
    speedButtons,
    scrub,
    offset,
  };
  return wrap;
}

function togglePlay(ctx, state) {
  const rate = Number(ctx.clock && ctx.clock.rate);
  try {
    if (rate === 0) {
      ctx.clock.setRate(state.pausedRate || 1);
      state.pausedRate = null;
    } else {
      state.pausedRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
      ctx.clock.setRate(0);
    }
  } catch {
    /* a clock that refuses 0 keeps running; the label below reports what is true */
  }
  paintClock(ctx, state);
}

function paintClock(ctx, state) {
  const c = state.clockEls;
  if (!c) return;
  let tMs = null;
  try {
    tMs = ctx.clock.now();
  } catch {
    tMs = null;
  }
  if (!Number.isFinite(tMs)) {
    c.utcValue.textContent = COPY.card.couldNotLook;
    c.localValue.textContent = COPY.card.couldNotLook;
    return;
  }

  const live = !ctx.clock.mode || ctx.clock.mode === 'live';
  if (live) state.anchorMs = tMs;

  c.utcValue.textContent = timeText.utcTime(tMs);
  c.utcDate.textContent = timeText.utcDate(tMs);
  c.localValue.textContent = timeText.localTime(tMs);

  const rate = Number(ctx.clock.rate);
  const paused = rate === 0;
  c.playPause.textContent = paused ? COPY.controls.play : COPY.controls.pause;
  c.playPause.title = paused ? COPY.controls.playTitle : COPY.controls.pauseTitle;
  for (const [value, b] of c.speedButtons) b.classList.toggle('is-on', value === rate);

  c.mode.textContent = state.scrubbing
    ? COPY.controls.scrubbing
    : live
      ? COPY.controls.live
      : inWords(tMs - state.anchorMs) || COPY.controls.live;
  c.mode.classList.toggle('is-live', live && !state.scrubbing);

  if (!state.scrubbing) {
    const span = SCRUB_BACK_MS + SCRUB_FORWARD_MS;
    const fraction = (tMs - (state.anchorMs - SCRUB_BACK_MS)) / span;
    const clamped = Math.min(1, Math.max(0, fraction));
    c.scrub.value = String(Math.round(clamped * SCRUB_STEPS));
  }
  c.offset.textContent = live ? COPY.controls.live : inWords(tMs - state.anchorMs) || '';
}

// ---------------------------------------------------------------------------------------
// 4. Where you are
// ---------------------------------------------------------------------------------------

const DEG_TO_RAD = Math.PI / 180;

function observerFor(city) {
  return {
    latRad: city.latDeg * DEG_TO_RAD,
    lonRad: city.lonDeg * DEG_TO_RAD,
    altKm: 0,
    latDeg: city.latDeg,
    lonDeg: city.lonDeg,
    name: city.name,
    source: city.source || 'city',
  };
}

function findCity(query) {
  const needle = String(query || '')
    .trim()
    .toLowerCase();
  if (!needle) return null;
  let best = null;
  for (const city of CITIES) {
    const name = city.name.toLowerCase();
    if (name === needle) return city;
    if (!best && name.startsWith(needle)) best = city;
    if (!best && `${name}, ${city.country.toLowerCase()}` === needle) best = city;
  }
  if (best) return best;
  for (const city of CITIES) {
    if (city.name.toLowerCase().includes(needle)) return city;
  }
  return null;
}

function buildLocation(ctx, state) {
  const wrap = el('section', 'sr-panel sr-place');
  wrap.appendChild(el('h2', 'sr-panel__title', COPY.controls.locationTitle));

  const row = el('div', 'sr-place__row');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sr-place__input';
  input.placeholder = COPY.controls.locationPlaceholder;
  input.setAttribute('aria-label', COPY.controls.locationSearchLabel);
  input.setAttribute('list', 'sr-cities');
  input.autocomplete = 'off';

  const datalist = document.createElement('datalist');
  datalist.id = 'sr-cities';
  for (const city of CITIES) {
    const option = document.createElement('option');
    option.value = city.name;
    option.label = city.country;
    datalist.appendChild(option);
  }

  const note = el('p', 'sr-place__note', COPY.controls.locationHint);
  const current = el('p', 'sr-place__current', COPY.controls.locationNone);

  const useMine = button(
    'sr-btn',
    COPY.controls.locationUseMine,
    COPY.controls.locationUseMineTitle,
  );

  const secure = typeof window !== 'undefined' && window.isSecureContext === true;
  const hasGeo = typeof navigator !== 'undefined' && !!navigator.geolocation;
  if (!secure) {
    // This is the state on an S3 website endpoint, which is plain http. Say why.
    useMine.disabled = true;
    useMine.title = COPY.controls.locationInsecure;
    note.textContent = COPY.controls.locationInsecure;
    note.classList.add('is-warning');
  } else if (!hasGeo) {
    useMine.disabled = true;
    useMine.title = COPY.controls.locationUnsupported;
    note.textContent = COPY.controls.locationUnsupported;
    note.classList.add('is-warning');
  }

  const setPlace = (city) => {
    const observer = observerFor(city);
    state.observer = observer;
    try {
      if (ctx && typeof ctx.setObserver === 'function') ctx.setObserver(observer);
    } catch {
      /* the panel still shows what was chosen */
    }
    current.textContent =
      t(COPY.controls.locationSet, { name: city.name }) +
      COPY.punctuation.separator +
      t(COPY.controls.locationCoords, {
        lat: fmt.num(city.latDeg, 2),
        lon: fmt.num(city.lonDeg, 2),
      });
    current.classList.add('is-set');
  };

  const commit = () => {
    const city = findCity(input.value);
    if (!city) {
      note.textContent = COPY.controls.locationNoMatch;
      note.classList.add('is-warning');
      return;
    }
    note.textContent = COPY.controls.locationHint;
    note.classList.remove('is-warning');
    setPlace(city);
  };

  input.addEventListener('change', commit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') commit();
  });

  useMine.addEventListener('click', () => {
    if (useMine.disabled) return;
    note.textContent = COPY.controls.locationAsking;
    note.classList.remove('is-warning');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        note.textContent = COPY.controls.locationHint;
        setPlace({
          name: COPY.controls.locationUseMine,
          country: '',
          latDeg: position.coords.latitude,
          lonDeg: position.coords.longitude,
          source: 'geolocation',
        });
      },
      (error) => {
        note.textContent =
          error && error.code === 1 ? COPY.controls.locationDenied : COPY.controls.locationFailed;
        note.classList.add('is-warning');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });

  const clearBtn = button('sr-btn sr-btn--quiet', COPY.controls.locationClear);
  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.observer = null;
    try {
      if (ctx && typeof ctx.setObserver === 'function') ctx.setObserver(null);
    } catch {
      /* nothing else to try */
    }
    current.textContent = COPY.controls.locationCleared;
    current.classList.remove('is-set');
  });

  row.appendChild(input);
  row.appendChild(useMine);
  row.appendChild(clearBtn);
  wrap.appendChild(row);
  wrap.appendChild(datalist);
  wrap.appendChild(current);
  wrap.appendChild(note);

  // An observer already chosen elsewhere (a shared link, say) is reflected, not overwritten.
  const existing = ctx && ctx.observer;
  if (existing && Number.isFinite(existing.latRad)) {
    current.textContent = t(COPY.controls.locationSet, {
      name: existing.name || COPY.controls.locationTitle,
    });
    current.classList.add('is-set');
  }
  return wrap;
}

// ---------------------------------------------------------------------------------------
// The refresh loop: one rAF, throttled, driving the readout and the counts.
// It reads ctx.clock.now() -- never Date.now() -- and draws nothing in the scene.
// ---------------------------------------------------------------------------------------

function startLoop(ctx, state) {
  if (typeof requestAnimationFrame !== 'function') return;
  let last = -Infinity;
  const step = () => {
    const wall = typeof performance !== 'undefined' ? performance.now() : last + UI_REFRESH_MS;
    if (wall - last >= UI_REFRESH_MS) {
      last = wall;
      try {
        paintClock(ctx, state);
        paintLayers(ctx, state);
      } catch {
        /* a bad frame must not stop the panel updating for ever */
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------------------
// Contract export
// ---------------------------------------------------------------------------------------

export function createControls(ctx) {
  if (built) return;
  built = true;
  const node = ensureHost();

  const state = {
    moment: readMomentFromHash() || momentOf(ctx) || COPY.moments.wonder.id,
    enabled: new Map(),
    anchorMs: 0,
    scrubbing: false,
    pausedRate: null,
    observer: (ctx && ctx.observer) || null,
    doors: null,
    layerList: null,
    layerRows: null,
    clockEls: null,
  };

  try {
    state.anchorMs = ctx.clock.now();
  } catch {
    state.anchorMs = 0;
  }

  node.appendChild(buildMoments(ctx, state));
  node.appendChild(buildLayers(ctx, state));
  node.appendChild(buildClock(ctx, state));
  node.appendChild(buildLocation(ctx, state));

  // setMoment seeds and applies the layer defaults on its first call; doing it here too
  // fired every toggle twice on load.
  setMoment(ctx, state, state.moment);

  // The moment can change from outside this module -- a card's "See it from here", a hash change,
  // the console. Without this the doors keep showing the last one somebody clicked, which is a
  // control lying about the state it controls.
  window.addEventListener('sr:moment', (e) => {
    const next = e && e.detail;
    if (!next || next === state.moment) return;
    state.moment = next;
    paintMoments(state);   // the module's own painter, so the aria state stays correct too
  });
  paintClock(ctx, state);
  paintLayers(ctx, state);

  window.addEventListener('hashchange', () => {
    const moment = readMomentFromHash();
    if (moment && moment !== state.moment) setMoment(ctx, state, moment);
  });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', () => {
      node.classList.toggle('is-reduced-motion', reduceMotion.matches);
    });
  }

  startLoop(ctx, state);
}
