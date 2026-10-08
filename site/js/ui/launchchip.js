// ui/launchchip.js -- launch day in the top bar: a countdown chip, and the Starlink train's pass
// (public #289).
//
// Contract: createLaunchChip(ctx, opts) -> { root, refresh(), destroy() }
// Also exported, pure, for tests/test_launchchip.mjs:
//   nextCountable(records, nowMs, ageMs) -> { record, state } | null
//   chipWords(record, state) -> { text, title }
//   isStarlinkLaunch(record) -> boolean
//   trainPassLine(items, nowMs) -> '' | "New Starlink train of 24, over you in 3 hours"
//
// THE CHIP. While a launch is inside a day (ui/countdown.js COUNT_WITHIN_MS), one small button
// carries its clock where the eye already is: beside the wordmark on a desktop, beside the live
// line under the search on a phone. It is the SAME state the launch's card and the Today card
// show (countdownState): Launch Library's planned time, Launch Library's own status word, and how
// old that reading is, said in the tooltip and to a screen reader. On Hold no number ticks, so
// the chip says "On hold". Pressing it opens the launch's card. With no launch inside a day the
// chip is not there.
//
// WHICH LAUNCH. The one whose moment is nearest ahead; failing that, the one that most recently
// passed its planned time (the half hour countdownState still speaks for).
//
// THE TRAIN LINE. The issue asks for "the train will pass over you at 20:14" on a Starlink
// launch. What can be said truthfully: the "Coming up" list already predicts, with the pass
// predictor (data/events.js trainItems, sky/passes.js), when the lead of a fresh Starlink train
// (launched in the last ten days, still climbing) is next visible from the visitor's place. That
// row, in the same words of time, is shown on a Starlink launch's card. It does NOT claim the
// train is this launch's: Launch Library's rows carry no international designator to tie them
// to CelesTrak's, and a launch that has not flown has no train at all. With no place, or no
// visible pass in the next day, there is no line.
//
// NO ASCENT TO FOLLOW. The issue's "Follow the ascent" is not built: the climb drawn after T-0 is
// propagate/ascent.js's illustration from a pad and an orbit, not a published trajectory, and a
// chase camera along it would dress a guess as a tracking shot.
//
// Fetched after the first visit has settled (main.js), never at boot.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { countdownState } from './countdown.js';
import { whenText } from './next.js';
import { iconFrom } from './icons.js';

// Lucide `rocket` (ISC; CREDITS.md), the shapes ui/searchrows.js draws a launch's row with.
const ROCKET = [
  ['path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }],
  ['path', { d: 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }],
  ['path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }],
  ['path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' }],
];

/** The launch the chip counts to, with its state; null when none is inside the day. Pure. */
export function nextCountable(records, nowMs, ageMs = null) {
  let ahead = null;
  let behind = null;
  for (const r of Array.isArray(records) ? records : []) {
    const m = r && r.meta;
    if (!m || !Number.isFinite(m.netMs)) continue;
    const state = countdownState({
      netMs: m.netMs, nowMs, status: m.statusAbbrev, precision: m.netPrecision, ageMs,
      durationS: r.ascent ? r.ascent.durationS : 0,
    });
    if (!state) continue;
    const left = m.netMs - nowMs;
    if (left > 0) { if (!ahead || left < ahead.left) ahead = { record: r, state, left }; }
    else if (!behind || left > behind.left) behind = { record: r, state, left };
  }
  const hit = ahead || behind;
  return hit ? { record: hit.record, state: hit.state } : null;
}

/** What the chip shows and what its tooltip says. Pure. */
export function chipWords(record, state, C = COPY.launchChip) {
  if (!record || !state) return { text: '', title: '' };
  const sep = COPY.punctuation.separator;
  return {
    text: state.clock || state.words,
    title: [record.name, state.words, state.age, C.opens].filter(Boolean).join(sep),
  };
}

/** Is this launch a Starlink one? By Launch Library's own name for it. Pure. */
export function isStarlinkLaunch(record) {
  return !!record && record.layer === 'launches' && /starlink/i.test(String(record.name || ''));
}

/** The next visible pass of a fresh Starlink train, in the Coming up list's words, or ''. Pure. */
export function trainPassLine(items, nowMs, C = COPY.launchChip) {
  const trains = (Array.isArray(items) ? items : []).filter((i) => i && i.kind === 'train' && Number.isFinite(i.tMs) && i.tMs > nowMs);
  if (!trains.length) return '';
  const first = trains.reduce((a, b) => (b.tMs < a.tMs ? b : a));
  return t(C.train, { n: fmt.int(first.count), when: whenText(first.tMs, nowMs) });
}

/**
 * @param {Object} ctx  the app: recordsFor, select, sources, shell, timePill
 * @param {{ win?: Window }} [opts]
 */
export function createLaunchChip(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.launchChip;
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'sr-launchchip';
  root.hidden = true;
  root.appendChild(iconFrom('rocket', ROCKET, 16));
  const clock = doc.createElement('span');
  clock.className = 'sr-launchchip__clock';
  // A number that changes every second is not read out every second: the name carries the state.
  clock.setAttribute('aria-hidden', 'true');
  root.appendChild(clock);

  let current = null;
  // Its rules come with it (css/finishers.css): shown only once they are here.
  let styled = false;
  loadCss('finishers', doc).then(() => { styled = true; refresh(); });
  const realNow = () => (ctx.timePill && typeof ctx.timePill.anchor === 'function' ? ctx.timePill.anchor() : Date.now());
  const ageMs = () => {
    try {
      const list = ctx.sources && typeof ctx.sources.status === 'function' ? ctx.sources.status() : null;
      const row = Array.isArray(list) ? list.find((r) => r && r.id === 'll2-upcoming') : null;
      return row && Number.isFinite(row.ageMs) ? row.ageMs : null;
    } catch { return null; }
  };

  /** Beside the wordmark on a desktop, beside the live line on a phone. */
  function seat() {
    const phone = doc.documentElement.classList.contains('sr-phone');
    const host = phone ? (ctx.shell && ctx.shell.lineHost) : doc.querySelector('.sr-explore__brand');
    if (!host || root.parentNode === host) return;
    const before = phone ? null : host.querySelector('.sr-explore__collapse');
    host.insertBefore(root, before);
  }

  function refresh() {
    const records = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('launches') : [];
    const hit = nextCountable(records, realNow(), ageMs());
    current = hit ? hit.record : null;
    const show = !!hit && styled;
    root.hidden = !show;
    // The phone's line under the search is up while the chip is (finishers.css `html.sr-launchday`).
    doc.documentElement.classList.toggle('sr-launchday', show);
    if (!show) return;
    seat();
    const words = chipWords(hit.record, hit.state, C);
    if (clock.textContent !== words.text) clock.textContent = words.text;
    if (root.title !== words.title) {
      root.title = words.title;
      root.setAttribute('aria-label', words.title);
    }
    root.dataset.phase = hit.state.phase;
  }

  root.addEventListener('click', () => { if (current && typeof ctx.select === 'function') ctx.select(current); });
  const onAny = () => refresh();
  win.addEventListener('sr:layer', onAny);
  win.addEventListener('sr:shell', onAny);
  const timer = win.setInterval(refresh, 1000);
  refresh();
  return {
    root,
    refresh,
    destroy() {
      win.clearInterval(timer);
      win.removeEventListener('sr:layer', onAny);
      win.removeEventListener('sr:shell', onAny);
      doc.documentElement.classList.remove('sr-launchday');
      root.remove();
    },
  };
}
