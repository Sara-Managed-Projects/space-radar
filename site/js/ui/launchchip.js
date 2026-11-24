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
// A CATALOGUE'S DAY (forge #547, ui/releaseday.js). With no launch inside a day, and inside a row's chip window of
// registry/events.yaml `data-release` (Gaia DR4, 24 November to 4 December 2026), the same chip counts to that day in
// whole days ("Gaia DR4 · in 8 days"; the agency gives no hour) and opens its object's card, where the section on it
// is. A launch inside a day always comes first: its clock is the more urgent one.
//
// Fetched after the first visit has settled (main.js), never at boot.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { countdownState } from './countdown.js';
import { whenText } from './next.js';
import { launchLabel } from './labels.js';
import { iconFrom, icon } from './icons.js';
import { chipRelease, chipWords as releaseChipWords } from './releaseday.js';

// Lucide `rocket` (ISC; CREDITS.md), the shapes ui/searchrows.js draws a launch's row with.
const ROCKET = [
  ['path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }],
  ['path', { d: 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }],
  ['path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }],
  ['path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' }],
];

// The platform's queue (site/js/ui/platform-bridge.js, CONTRACT.md) is not on main yet: a no-op until it is.
// TODO(platform-bridge): call sr('track', name, params) from site/js/ui/platform-bridge.js once that module is on main.
const track = () => {};

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
    // Internal #304: "Vulcan VC6L" is jargon on its own; the label says it is a rocket and where from.
    title: [t(C.rocket, { name: launchLabel(record.name) }), record.meta && record.meta.locationName, state.words, state.age, C.opens].filter(Boolean).join(sep),
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
  const rocket = root.appendChild(iconFrom('rocket', ROCKET, 16));
  const scope = root.appendChild(icon('telescope', 16));
  scope.setAttribute('display', 'none');
  const clock = doc.createElement('span');
  clock.className = 'sr-launchchip__clock';
  // A number that changes every second is not read out every second: the name carries the state.
  clock.setAttribute('aria-hidden', 'true');
  root.appendChild(clock);

  let current = null;
  let release = null; // the catalogue's day the chip counts to, when no launch is inside a day
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
    const before = phone ? null : host.querySelector('.sr-side__hide');
    host.insertBefore(root, before);
  }

  function refresh() {
    const records = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('launches') : [];
    const hit = nextCountable(records, realNow(), ageMs());
    current = hit ? hit.record : null;
    release = hit ? null : chipRelease(realNow());
    if (release) { refreshRelease(); return; }
    rocket.removeAttribute('display');
    scope.setAttribute('display', 'none');
    const show = !!hit && styled;
    root.hidden = !show;
    // The phone's line under the search is up while the chip is (finishers.css `html.sr-launchday`).
    doc.documentElement.classList.toggle('sr-launchday', show);
    if (!show) return;
    seat();
    const words = chipWords(hit.record, hit.state, C);
    if (clock.textContent !== words.text) clock.textContent = words.text;
    // No native tooltip: it spilled over the search under the head (2026-11-11). The words are the chip's name, and
    // pressing it opens the launch's card, which says all of it.
    if (root.getAttribute('aria-label') !== words.title) { root.setAttribute('aria-label', words.title); root.title = words.title; }
    root.dataset.phase = hit.state.phase;
  }

  /** The catalogue's day on the chip: its object's card opens on press (ui/releaseday.js). */
  function refreshRelease() {
    const object = release.row.object && typeof ctx.recordById === 'function' ? ctx.recordById(release.row.object) : null;
    const show = styled && !!object;
    root.hidden = !show;
    doc.documentElement.classList.toggle('sr-launchday', show);
    if (!show) return;
    seat();
    rocket.setAttribute('display', 'none');
    scope.removeAttribute('display');
    const words = releaseChipWords(release.row, release.state, object.name);
    if (clock.textContent !== words.text) clock.textContent = words.text;
    if (root.getAttribute('aria-label') !== words.label) { root.setAttribute('aria-label', words.label); root.title = words.label; }
    root.dataset.phase = `release-${release.state.phase}`;
  }

  root.addEventListener('click', () => {
    if (typeof ctx.select !== 'function') return;
    if (current) { ctx.select(current); return; }
    const object = release && release.row.object && typeof ctx.recordById === 'function' ? ctx.recordById(release.row.object) : null;
    if (object) {
      // Its layer on first, as a dated card of Today does, so the craft is drawn where the card says it is.
      if (object.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(object.layer) && typeof ctx.setLayerOn === 'function') {
        ctx.setLayerOn(object.layer, true);
        doc.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: object.layer, on: true, handled: true, from: 'release-chip' } }));
      }
      ctx.select(object);
      // TODO(platform-bridge): sr('track', 'select_object', {...}) through site/js/ui/platform-bridge.js once it is on main.
      track('select_object', { object_class: String(object.klass || ''), object_id: String(object.id) });
    }
  });
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
