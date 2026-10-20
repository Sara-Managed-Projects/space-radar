// ui/scenesummary.js -- what is on screen, in words, for a screen reader (0076 W4-c, internal #912,
// package SR-PLAN-145).
//
// Contract: createSceneSummary(ctx, opts?) -> { root, text(), update(), destroy() }
// Also exported, pure: summaryText(facts, words) -> string
//
// WHY. The map is one canvas. A reader that lands on it hears "stage" and nothing else: not which
// world the camera is round, not what is selected, not that a trip is on stop 3 of 7. The cards and
// the trip frame say those things in their own places; this says the one line that ties them to the
// scene, in a polite live region that nothing sighted can see (the same clipping as .sr-hidden-text).
//
// WHEN. On `sr:stage`, `sr:select`, `sr:look` and every phase change of a trip, a fifth of a second
// after the last, and only when the line is different. While a trip runs the region is not live: the
// trip frame announces its own stops (ui/tripframe.js), and two voices for one stop is the flood that
// file avoids; the line is still kept current for a reader who goes looking for it.
//
// WHAT IT SAYS. Only what the app already knows and shows: the stage's name, the selection's name and
// kind, the trip's stop, the look. No distance, no count of things it has not measured, no colour.
//
// Loaded by main.js after the first visit has settled, never at boot (tests/test_boot_diet.mjs).
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';

const SETTLE_MS = 200;

/** The one line, from plain facts. Pure.
 *  facts: { stage, selected: {name, kind}|null, trip: {title, stopTitle, index, count}|null, look } */
export function summaryText(facts, words = COPY.r12Access.summary) {
  const f = facts || {};
  const out = [];
  if (f.stage) out.push(t(words.stage, { stage: f.stage }));
  if (f.trip && f.trip.title) {
    out.push(f.trip.count > 0 && f.trip.index >= 0 && f.trip.stopTitle
      ? t(words.trip, { n: f.trip.index + 1, count: f.trip.count, title: f.trip.stopTitle })
      : t(words.tripIntro, { title: f.trip.title }));
  }
  if (f.selected && f.selected.name) out.push(t(words.selected, { name: f.selected.name, kind: f.selected.kind || '' }).replace(/,\s*\./, '.'));
  else if (!f.trip) out.push(words.nothing);
  if (f.look === 'measured') out.push(words.measured);
  return out.join(' ');
}

function stageName(id) {
  const rungs = COPY.r12Navigate && COPY.r12Navigate.rungs;
  if (rungs && Object.prototype.hasOwnProperty.call(rungs, id)) return rungs[id];
  return Object.prototype.hasOwnProperty.call(COPY.worlds, id) ? COPY.worlds[id] : '';
}

/** The facts as the app has them now. Every read is guarded: a missing part is a missing sentence. */
export function factsOf(ctx) {
  const f = { stage: '', selected: null, trip: null, look: null };
  try { f.stage = stageName(ctx.stage && ctx.stage.worldId); } catch { /* no stage yet */ }
  try {
    const r = typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (r) {
      const name = String((r.meta && r.meta.displayName) || r.name || '').trim();
      const kind = Object.prototype.hasOwnProperty.call(COPY.klass, r.klass) ? COPY.klass[r.klass].toLowerCase() : '';
      if (name) f.selected = { name, kind };
    }
  } catch { /* nothing selected */ }
  try {
    const s = ctx.trip && ctx.trip.state;
    if (s && s.phase !== 'idle' && s.tourTitle) {
      f.trip = { title: s.tourTitle, stopTitle: s.stopTitle || '', index: Number.isInteger(s.index) ? s.index : -1, count: Number(s.count) || 0 };
    }
  } catch { /* no trip */ }
  try { f.look = typeof ctx.look === 'function' ? ctx.look() : null; } catch { /* no look */ }
  return f;
}

export function createSceneSummary(ctx, opts = {}) {
  const doc = opts.doc || (typeof document !== 'undefined' ? document : null);
  if (!doc) return { root: null, text: () => '', update() {}, destroy() {} };
  const root = doc.createElement('p');
  root.id = 'sr-scenesummary';
  root.className = 'sr-hidden-text';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-label', COPY.r12Access.summary.label);
  doc.body.appendChild(root);

  let last = '';
  let timer = 0;
  let unsub = null;
  const update = () => {
    timer = 0;
    const f = factsOf(ctx);
    const text = summaryText(f);
    root.setAttribute('aria-live', f.trip ? 'off' : 'polite');
    if (text === last) return;
    last = text;
    root.textContent = text;
  };
  const later = () => { if (!timer) timer = setTimeout(update, SETTLE_MS); };
  const follow = () => {
    if (unsub) unsub();
    unsub = ctx.trip && typeof ctx.trip.onChange === 'function' ? ctx.trip.onChange(later) : null;
  };
  const EVENTS = ['sr:stage', 'sr:select', 'sr:look'];
  for (const name of EVENTS) window.addEventListener(name, later);
  window.addEventListener('sr:trips-loaded', follow);
  follow();
  update();

  const api = {
    root,
    text: () => last,
    update,
    destroy() {
      clearTimeout(timer);
      for (const name of EVENTS) window.removeEventListener(name, later);
      window.removeEventListener('sr:trips-loaded', follow);
      if (unsub) unsub();
      root.remove();
    },
  };
  if (ctx) ctx.sceneSummary = api;
  return api;
}
