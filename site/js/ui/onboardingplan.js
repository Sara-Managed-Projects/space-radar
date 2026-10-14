// ui/onboardingplan.js -- the tour's arithmetic: which step, where the caption goes, how the ink is
// drawn, whether to invite (internal spec 0074). Pure: no document, no timer, no storage of its own.
//
// Contract, all exported for tests/test_onboarding.mjs:
//   TOUR_KEY, VOICE_KEY, BEAT_MS, WAIT_TARGET_MS, INVITE_AFTER_MS, INVITE_MS, PAD, HEAD_MAX, GUTTER
//   reduce(state, event, steps, available) -> state        the step machine
//   IDLE                                                    its first state
//   whyNotInvite(s), decideInvite(storage, s)               the first visit's arrow, once
//   readVoice(storage), writeVoice(storage, on)             the voice, off until asked for
//   holeFor(rect, view)                                     what is ringed: the target, padded
//   radii(hole)                                             the ring's half-axes round a hole
//   freeBand(view, avoid)                                   the scene the chrome leaves free
//   placeCaption(hole, view, size, band)                    where the caption goes, and on which side
//   arrowEnds(cap, hole, side)                              from the caption's edge to the ring's
//   ringPath(hole, seed), arrowPath(from, to, seed)         SVG path data, the same for the same seed
//   seedOf(text), clipFiles(voice, id), wordsProblems(step)
//
// WHY A MACHINE AND NOT A LIST INDEX. A tour that is `i++` breaks the first time a panel is shut:
// the step's control is gone and the overlay points at nothing. Here every way on is an event
// (the awaited action, Next, a target that is missing, Escape, a mode that takes the screen) and
// reduce() is the one place that says what each does, so a node test can walk every case.
//
// WHY THE INK IS GENERATED. A hand-drawn ring has to fit a 48 px rail button and a 320 px search
// field; an image stretched over both looks like an image. A superellipse through the hole's
// corners with a seeded wobble, closed with the overlap a pen leaves, fits any box, costs no
// bytes, and is the same every time for the same step (the seed is the step's id).

export const TOUR_KEY = 'sr:tour';
export const VOICE_KEY = 'sr:tour-voice';
/** After the awaited action, before going on: long enough to see that it worked. */
export const BEAT_MS = 900;
/** How long a step waits for its target after its ground was prepared (the card is fetched on the first selection). */
export const WAIT_TARGET_MS = 3000;
/** The first visit's arrow: this long after sr:layers-ready (main.js), and this long on screen. */
export const INVITE_AFTER_MS = 8000;
export const INVITE_MS = 8000;
/** The hole is the target and this much air. */
export const PAD = 6;
/** A target taller than this is ringed at its head: the Trips section is a screen tall. */
export const HEAD_MAX = 220;
/** The caption's distance from the viewport's edges. */
export const GUTTER = 16;
/** Room for the arrow between the ring and the caption. */
const REACH = 64;
/** The ring's own air from the screen's edge: its drift and its wobble fit inside it. */
const EDGE = 9;
/** Under this width a caption is never beside its target: a phone. */
const NARROW = 600;

export const IDLE = Object.freeze({ phase: 'idle', index: -1, dir: 1, why: null });

/**
 * The step machine. `available(step)` answers "could this step be shown" (the controller says no
 * for a step it has just failed to find a target for). Events:
 *   start            idle or over -> the first available step
 *   action           the awaited thing happened: step -> done (the controller waits the beat, or Next)
 *   next             the next available step, or over ('finished') after the last
 *   back             the previous available step; stays where it is at the first
 *   missing          this step has no target: go on the way we were going, then the other way
 *   skip | escape    over, with that reason
 *   mode             a trip, a clear screen, a reel took the screen: over
 */
export function reduce(state, event, steps, available = () => true) {
  const list = Array.isArray(steps) ? steps : [];
  const s = state || IDLE;
  const seek = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < list.length; i += dir) if (available(list[i], i)) return i;
    return -1;
  };
  const over = (why) => ({ phase: 'over', index: -1, dir: 1, why });
  const at = (index, dir) => ({ phase: 'step', index, dir, why: null });
  const running = s.phase === 'step' || s.phase === 'done';
  switch (event && event.type) {
    case 'start': {
      if (running) return s;
      const i = seek(-1, 1);
      return i < 0 ? over('nothing') : at(i, 1);
    }
    case 'action':
      return s.phase === 'step' ? { ...s, phase: 'done' } : s;
    case 'next': {
      if (!running) return s;
      const i = seek(s.index, 1);
      return i < 0 ? over('finished') : at(i, 1);
    }
    case 'back': {
      if (!running) return s;
      const i = seek(s.index, -1);
      return i < 0 ? s : at(i, -1);
    }
    case 'missing': {
      if (!running) return s;
      let i = seek(s.index, s.dir || 1);
      if (i < 0 && s.dir < 0) i = seek(s.index, 1);
      return i < 0 ? over(s.dir < 0 ? 'nothing' : 'finished') : at(i, s.dir < 0 && i < s.index ? -1 : 1);
    }
    case 'skip': return running ? over('skipped') : s;
    case 'escape': return running ? over('escaped') : s;
    case 'mode': return running ? over('mode') : s;
    default: return s;
  }
}

// --- the first visit's arrow, and the voice: two small memories ---------------------------------

/** Why not to point at the tour's button, or null to point. Pure (the welcome's rule, ui/welcome.js). */
export function whyNotInvite(s = {}) {
  if (s.seen === null) return 'no-memory';
  if (s.seen) return 'seen';
  if (s.deepLink) return 'deep-link';
  if (s.embed) return 'embed';
  if (s.mode) return 'mode';
  if (s.automated) return 'automated';
  if (s.running) return 'running';
  if (!s.target) return 'no-target';
  return null;
}

function read(storage, key) {
  try { return storage ? storage.getItem(key) === '1' : null; } catch { return null; }
}
function write(storage, key, on) {
  try {
    if (!storage) return false;
    if (on) storage.setItem(key, '1'); else storage.removeItem(key);
    return true;
  } catch { return false; }
}

/** The decision and its memory: null to point (remembered now), else why not. Never throws. */
export function decideInvite(storage, s = {}) {
  const reason = whyNotInvite({ ...s, seen: read(storage, TOUR_KEY) });
  if (reason) return reason;
  return write(storage, TOUR_KEY, true) ? null : 'no-memory';
}
/** The tour was started: the arrow is never needed again. */
export const markSeen = (storage) => write(storage, TOUR_KEY, true);
/** The voice is OFF until the visitor turns it on in the caption; a storage that throws forgets. */
export const readVoice = (storage) => read(storage, VOICE_KEY) === true;
export const writeVoice = (storage, on) => write(storage, VOICE_KEY, !!on);

// --- geometry ------------------------------------------------------------------------------------
// A rect is {x, y, w, h}; a view is {w, h} with optional safe insets {top, right, bottom, left}.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const inset = (view, side) => Math.max(0, Number(view && view[side]) || 0);

/** What is ringed: the target and PAD of air, its head only when it is tall, clipped to the view. Null when nothing shows. */
export function holeFor(rect, view) {
  if (!rect || !(rect.w > 0) || !(rect.h > 0)) return null;
  const x0 = Math.max(0, rect.x - PAD);
  const y0 = Math.max(0, rect.y - PAD);
  const x1 = Math.min(view.w, rect.x + rect.w + PAD);
  const y1 = Math.min(view.h, rect.y + Math.min(rect.h, HEAD_MAX) + PAD);
  if (x1 - x0 < 8 || y1 - y0 < 8) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The ring's half-axes: a superellipse through the hole's corners, squarer for a wide hole. With
 * a `view`, never past the screen's edge: a phone's search field is 16 px from two of them, and a
 * ring cut off by the glass looks torn (seen on a runner, 2026-10-14). It then crosses the hole's
 * corners instead, which a pen would do too.
 */
export function radii(hole, view) {
  const wide = Math.max(hole.w, hole.h) / Math.max(1, Math.min(hole.w, hole.h));
  const n = wide > 2.2 ? 5 : 3;
  const k = 2 ** (1 / n);
  let a = (hole.w / 2) * k + 2;
  let b = (hole.h / 2) * k + 2;
  if (view) {
    const cx = hole.x + hole.w / 2;
    const cy = hole.y + hole.h / 2;
    a = Math.max(hole.w / 2 - 2, Math.min(a, cx - EDGE, view.w - cx - EDGE));
    b = Math.max(hole.h / 2 - 2, Math.min(b, cy - EDGE, view.h - cy - EDGE));
  }
  return { a, b, n };
}

/**
 * The scene the chrome leaves free. `avoid` holds the rects of the sidebar (a column on a desktop,
 * a sheet on a phone), the phone's top bar, the time pill and any open `panels`; any may be missing.
 */
export function freeBand(view, avoid = {}) {
  let left = inset(view, 'left');
  let top = inset(view, 'top');
  let right = view.w - inset(view, 'right');
  let bottom = view.h - inset(view, 'bottom');
  const side = avoid.side;
  if (side && side.w > 0 && side.h > 0) {
    if (side.w >= view.w * 0.9) bottom = Math.min(bottom, side.y); // a phone's sheet
    else if (side.h >= view.h * 0.5 && side.x < view.w / 2) left = Math.max(left, side.x + side.w); // the sidebar
  }
  if (avoid.top && avoid.top.h > 0) top = Math.max(top, avoid.top.y + avoid.top.h);
  // The pill is at the foot of a desktop and above a phone's sheet: either way under the free scene.
  if (avoid.pill && avoid.pill.h > 0 && avoid.pill.y > view.h * 0.3) bottom = Math.min(bottom, avoid.pill.y);
  // A panel the step's own press opened (What to show, the share sheet): a column on the right on
  // a desktop; on a phone a sheet from the bottom (the share sheet) or a sheet dropped from the top
  // bar (What to show). The caption waits beside it, not on it: on a phone on whichever side of it
  // has more room (under What to show, which onboarding.js shortens by the caption's height while it
  // waits: seen on a runner, 2026-10-14, the caption lay over its lower rows).
  for (const p of avoid.panels || []) {
    if (!p || !(p.w > 0) || !(p.h > 0)) continue;
    if (p.w >= view.w * 0.9) {
      // Dropped from the top bar, it lies over the phone's sheet and pill: under it is free to the
      // screen's foot, whatever they would have said.
      const under = p.y + p.h;
      const foot = view.h - inset(view, 'bottom');
      if (p.y < view.h / 3 && foot - under >= 120) { top = under; bottom = foot; } else bottom = Math.min(bottom, p.y);
    } else if (p.x > view.w / 2) right = Math.min(right, p.x);
  }
  if (right - left < 120) { left = inset(view, 'left'); right = view.w - inset(view, 'right'); }
  if (bottom - top < 120) { top = inset(view, 'top'); bottom = view.h - inset(view, 'bottom'); }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Where the caption goes. With a hole: beside it when there is room (right, then left), above or
 * below it when the hole is in the middle of the screen or the screen is narrow; never over the
 * hole unless nothing fits; on a phone never beside it (the first visit's line is small enough to
 * fit beside the More button, and sat on the search field); on a phone, for a target in the sheet
 * (`opts.sheet`), under it first. Without one: the foot of the free band. Returns {x, y, side}.
 */
export function placeCaption(hole, view, size, band, opts = {}) {
  const minX = GUTTER + inset(view, 'left');
  const maxX = view.w - GUTTER - inset(view, 'right') - size.w;
  const minY = GUTTER + inset(view, 'top');
  const maxY = view.h - GUTTER - inset(view, 'bottom') - size.h;
  // On a phone the caption is the screen's width less its gutters, or 320 px on a wider phone: it
  // stands in the middle, wherever its target is (three steps sat 19 px off at 390 px, #757).
  const fitX = (x) => (view.w < NARROW ? Math.max(minX, Math.round((minX + maxX) / 2)) : clamp(x, minX, Math.max(minX, maxX)));
  const fitY = (y) => clamp(y, minY, Math.max(minY, maxY));
  if (!hole) {
    const b = band || { x: 0, y: 0, w: view.w, h: view.h };
    return { x: fitX(b.x + b.w / 2 - size.w / 2), y: fitY(b.y + b.h - size.h - 24), side: 'free' };
  }
  const r = radii(hole);
  const cx = hole.x + hole.w / 2;
  const cy = hole.y + hole.h / 2;
  const reachX = r.a - hole.w / 2 + REACH;
  const reachY = r.b - hole.h / 2 + REACH;
  // A target in a desktop's sidebar: the caption beside it stands clear of the whole column
  // (`opts.clearRight`, its right edge), not just of the target (seen on a runner, 2026-10-15: the
  // drift's caption, beside a 104 px button, lay over the trips' cards).
  const rightX = Math.max(hole.x + hole.w + reachX, Number(opts.clearRight) > 0 ? opts.clearRight + GUTTER : 0);
  // Beside a target low on the screen, the caption stays over the free scene's foot: a desktop's
  // time pill is there (seen on a runner, 2026-10-15: the drift's caption hid the pill's LIVE).
  const sideY = (y) => (band ? Math.max(minY, Math.min(fitY(y), band.y + band.h - size.h - 8)) : fitY(y));
  const spot = {
    right: { x: rightX, y: sideY(cy - size.h * 0.3 + 12), ok: rightX <= maxX },
    left: { x: hole.x - reachX - size.w, y: sideY(cy - size.h * 0.3 + 12), ok: hole.x - reachX - size.w >= minX },
    above: { x: fitX(cx - size.w / 2), y: hole.y - reachY - size.h, ok: hole.y - reachY - size.h >= minY },
    below: { x: fitX(cx - size.w / 2), y: hole.y + hole.h + reachY, ok: hole.y + hole.h + reachY <= maxY },
  };
  const middle = cx > view.w / 3 && cx < (view.w * 2) / 3;
  const roomAbove = hole.y;
  const roomBelow = view.h - hole.y - hole.h;
  // A target in a phone's sheet (`opts.sheet`): the caption goes under it, over the sheet's own
  // lists, when it fits there, and leaves the scene above the sheet free (seen on a runner,
  // 2026-10-15: the four views' caption lay over the half of the scene the sheet leaves).
  const vertical = opts.sheet && view.w < NARROW ? ['below', 'above'] : roomAbove >= roomBelow ? ['above', 'below'] : ['below', 'above'];
  const order = middle || view.w < NARROW ? [...vertical, 'right', 'left'] : ['right', 'left', ...vertical];
  for (const side of order) if (spot[side].ok) return { x: spot[side].x, y: spot[side].y, side };
  // Nothing fits (a hole as large as the screen): the side with the most room, clamped.
  const side = vertical[0];
  return { x: spot[side].x, y: fitY(spot[side].y), side };
}

/** The arrow: from the caption's edge that faces the hole to just outside the ring. */
export function arrowEnds(cap, hole, side, view) {
  if (!hole || side === 'free') {
    const x = cap.x + cap.w / 2;
    return { from: { x: x - 28, y: cap.y - 6 }, to: { x: x + 6, y: cap.y - 104 } };
  }
  const r = radii(hole, view);
  const cx = hole.x + hole.w / 2;
  const cy = hole.y + hole.h / 2;
  const tail = Math.min(cap.h * 0.4, 44);
  if (side === 'right') return { from: { x: cap.x - 6, y: cap.y + tail }, to: { x: cx + r.a + 8, y: cy + 2 } };
  if (side === 'left') return { from: { x: cap.x + cap.w + 6, y: cap.y + tail }, to: { x: cx - r.a - 8, y: cy + 2 } };
  const fromX = clamp(cap.x + cap.w * 0.3, cap.x + 24, cap.x + cap.w - 24);
  if (side === 'above') return { from: { x: fromX, y: cap.y + cap.h + 6 }, to: { x: clamp(cx, fromX - 80, fromX + 80), y: cy - r.b - 8 } };
  return { from: { x: fromX, y: cap.y - 6 }, to: { x: clamp(cx, fromX - 80, fromX + 80), y: cy + r.b + 8 } };
}

/** A number from a word: the step's id seeds its ring, so the same step is always drawn the same way. */
export function seedOf(text) {
  let h = 2166136261;
  for (const ch of String(text || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();

/** A smooth path through points (Catmull-Rom as cubic Béziers), open. */
function through(points) {
  let d = `M${f1(points[0].x)} ${f1(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${f1(p1.x + (p2.x - p0.x) / 6)} ${f1(p1.y + (p2.y - p0.y) / 6)} ${f1(p2.x - (p3.x - p1.x) / 6)} ${f1(p2.y - (p3.y - p1.y) / 6)} ${f1(p2.x)} ${f1(p2.y)}`;
  }
  return d;
}

/**
 * The ring: once round the hole and a little more, as a pen closes a loop. It starts upper left,
 * runs clockwise, drifts outward by a few pixels, and wobbles by a seeded pixel or two.
 */
export function ringPath(hole, seed, view) {
  const { a, b, n } = radii(hole, view);
  const cx = hole.x + hole.w / 2;
  const cy = hole.y + hole.h / 2;
  const rand = rng(seed);
  const start = -2.5 + (rand() - 0.5) * 0.4;
  const sweep = Math.PI * 2 + 0.42 + rand() * 0.2;
  const drift = 3 + rand() * 3;
  const count = 44;
  const points = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const t = start + sweep * u;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const grow = 1 + (drift * u) / Math.max(a, b) + ((rand() - 0.5) * 2.4) / Math.max(a, b);
    points.push({
      x: cx + a * grow * Math.sign(c) * Math.abs(c) ** (2 / n),
      y: cy + b * grow * Math.sign(s) * Math.abs(s) ** (2 / n),
    });
  }
  return through(points);
}

/** The arrow: a bowed shaft and a two-stroke head, as {shaft, head} path data. */
export function arrowPath(from, to, seed) {
  const rand = rng(seed ^ 0x9e3779b9);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = (0.16 + rand() * 0.08) * len * (dx * dy >= 0 ? -1 : 1);
  const mx = from.x + dx / 2 + (-dy / len) * bow;
  const my = from.y + dy / 2 + (dx / len) * bow;
  const shaft = `M${f1(from.x)} ${f1(from.y)} Q${f1(mx)} ${f1(my)} ${f1(to.x)} ${f1(to.y)}`;
  // The head opens back along the shaft's last direction (from the control point to the tip).
  const ang = Math.atan2(to.y - my, to.x - mx);
  const size = clamp(len * 0.16, 9, 14);
  const wing = (turn) => ({ x: to.x - Math.cos(ang + turn) * size, y: to.y - Math.sin(ang + turn) * size });
  const l = wing(0.48 + rand() * 0.08);
  const r = wing(-0.5 - rand() * 0.08);
  const head = `M${f1(l.x)} ${f1(l.y)} L${f1(to.x)} ${f1(to.y)} L${f1(r.x)} ${f1(r.y)}`;
  return { shaft, head };
}

/** A step's clip, as audio/pick.js wants a row: the Opus and its AAC twin, relative to the site. Null when the voice has not read it. */
export function clipFiles(voice, id) {
  if (!voice || !voice.clips || !(id in voice.clips)) return null;
  return { file: `${voice.base}/${id}.opus`, twin: `${voice.base}/${id}.m4a`, seconds: voice.clips[id] };
}

const AWAITS = ['camera', 'select', 'press', 'type'];
const PREPARE = ['home', 'card', 'sheet', 'peek'];
/** What is wrong with a step as data, as sentences. Empty when it is sound. */
export function wordsProblems(step) {
  const out = [];
  const id = step && step.id;
  if (!/^[a-z][a-z0-9-]*$/.test(String(id || ''))) out.push(`a step's id is ${JSON.stringify(id)}; lower case letters, digits and dashes`);
  if (!Array.isArray(step.hooks) || !step.hooks.length) out.push(`${id}: no hooks`);
  if (!AWAITS.includes(step.awaits)) out.push(`${id}: awaits ${JSON.stringify(step.awaits)}; one of ${AWAITS.join(', ')}`);
  if (!['next', 'wait'].includes(step.then)) out.push(`${id}: then ${JSON.stringify(step.then)}; next or wait`);
  if (step.look !== undefined && step.look !== 'scene') out.push(`${id}: look ${JSON.stringify(step.look)}; scene or nothing`);
  for (const p of step.prepare || []) if (!PREPARE.includes(p)) out.push(`${id}: prepare ${JSON.stringify(p)}; one of ${PREPARE.join(', ')}`);
  for (const key of ['say', 'ask']) {
    const text = String(step[key] || '');
    if (!text) { out.push(`${id}: no ${key}`); continue; }
    if (text.length > 60) out.push(`${id}: ${key} is ${text.length} characters; a line of the caption is 60 at most`);
    if (/[!?]/.test(text)) out.push(`${id}: ${key} asks a question or exclaims; the chrome does neither`);
    if (!/[.]$/.test(text)) out.push(`${id}: ${key} does not end with a full stop; the voice reads it as a sentence`);
    if (/\d/.test(text)) out.push(`${id}: ${key} has a digit; write the number as a word, the voice reads it`);
    if (/\p{Extended_Pictographic}|→| -- /u.test(text)) out.push(`${id}: ${key} has an emoji, an arrow or a double dash`);
    if (/\b(stunning|amazing|seamless|unlock|journey|please|click here)\b/i.test(text)) out.push(`${id}: ${key} uses a word the copy rules ban`);
  }
  return out;
}
