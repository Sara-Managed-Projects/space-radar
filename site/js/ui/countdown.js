// ui/countdown.js -- a launch within a day counts down, on its card and on the Today card
// (public #289).
//
// Contract:
//   tMinus(ms) -> 'T−02:14:07' | 'T+00:01:10'           pure
//   countdownState({ netMs, nowMs, status, precision, ageMs, durationS }) -> null | { phase, clock, words, age }   pure
//   mountCountdown(node, record, { now, ageMs }) -> stop()   paints `node` once a second while it is in the page
//   launchAgeMs(ctx) -> how old the launch list is, or null
//
// WHAT IT SAYS, AND WHOSE WORD IT IS. The time counted to is Launch Library's NET, a plan. The
// state beside it is Launch Library's own status field, in its own vocabulary, READ 2026-10-07
// from https://ll.thespacedevs.com/2.3.0/config/launch_statuses/ :
//   Go (Go for Launch), TBC (To Be Confirmed), TBD (To Be Determined), Hold (On Hold: "the
//   countdown has been paused, but the launch can still happen within the launch window"),
//   In Flight, Success, Deployed (Payload Deployed), Failure, Partial Failure.
// THERE IS NO "SCRUBBED" in that list, so this never says it: a scrub reaches us as Hold, or as
// a new NET with TBC or TBD, and those are the words shown. A clock that ran on through a hold
// would be a lie, so on Hold no number ticks. And because the status is only as new as the last
// read of the list, its age is said beside it; past T-0 with nothing newer than "Go", the line
// is "by the plan", not "lift-off".
//
// The rocket itself is not this file's: the launches layer already stands the model on the pad
// before T-0 and flies its illustrative ascent after it (propagate/ascent.js).
//
// Fetched by ui/today.js and by the card when a launch is within COUNT_WITHIN_MS; never at boot.

import { COPY, t, ageInWords } from '../copy/en.js';
import '../copy/en.later.js';

export const COUNT_WITHIN_MS = 24 * 3600e3;
/** How long after T-0 the line still speaks, by the plan, when no newer status has been read. */
export const AFTER_MS = 30 * 60e3;
const ROUGH = /^(day|week|month|quarter|half|year|tbd|tba)/i;

const pad = (n) => String(n).padStart(2, '0');

/** T−HH:MM:SS before the moment, T+HH:MM:SS after it. A true minus sign, not a hyphen. */
export function tMinus(ms) {
  const before = ms > 0;
  const s = Math.floor(Math.abs(ms) / 1000 + (before ? 0.999 : 0));
  return `T${before ? '−' : '+'}${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * What to show for a launch, or null when it is more than a day off, long gone, or its time is
 * only a date. `clock` is the ticking number ('' when none may tick); `words` the state in
 * Launch Library's terms; `age` how old that state is ('' when unknown).
 */
export function countdownState({ netMs, nowMs, status = null, precision = null, ageMs = null, durationS = 0 } = {}) {
  if (!Number.isFinite(netMs) || !Number.isFinite(nowMs)) return null;
  if (precision && ROUGH.test(precision)) return null;
  const left = netMs - nowMs;
  if (left > COUNT_WITHIN_MS || left < -AFTER_MS) return null;
  const C = COPY.countdown;
  const st = String(status || '').toLowerCase();
  const age = Number.isFinite(ageMs) && ageMs >= 0 ? t(C.age, { age: ageInWords(ageMs) }) : '';
  const ended = { success: C.success, deployed: C.deployed, failure: C.failure, 'partial failure': C.partial }[st];
  if (ended) return { phase: 'ended', clock: '', words: ended, age };
  if (st === 'hold') return { phase: 'hold', clock: '', words: C.hold, age };
  if (st === 'in flight') return { phase: 'flight', clock: tMinus(left), words: C.inFlight, age };
  if (left <= 0) {
    // Past the planned moment and nothing read since says it flew: the plan's clock, and say so.
    const climbing = durationS > 0 && -left < durationS * 1000;
    return { phase: 'planned-past', clock: tMinus(left), words: climbing ? C.byPlanClimbing : C.byPlan, age };
  }
  if (st === 'go') return { phase: 'go', clock: tMinus(left), words: C.go, age };
  return { phase: 'unconfirmed', clock: tMinus(left), words: st === 'tbd' ? C.tbd : C.tbc, age };
}

/** How old the launch list is, from the sources table; null when it cannot say. */
export function launchAgeMs(ctx) {
  try {
    const list = ctx && ctx.sources && typeof ctx.sources.status === 'function' ? ctx.sources.status() : null;
    const row = Array.isArray(list) ? list.find((r) => r && r.id === 'll2-upcoming') : null;
    return row && Number.isFinite(row.ageMs) ? row.ageMs : null;
  } catch { return null; }
}

/**
 * Paint `node` now and once a second, until it leaves the page or stop() is called. `now()` is
 * the time counted from: the real present on the Today card, the clock's on a card (scrubbed to
 * the launch, the card counts to it as the scene does). Hidden while there is nothing to say.
 */
export function mountCountdown(node, record, { now, ageMs } = {}) {
  if (!node || !record || !record.meta) return () => {};
  const m = record.meta;
  const clock = document.createElement('span');
  clock.className = 'sr-count__clock';
  const words = document.createElement('span');
  words.className = 'sr-count__words';
  node.textContent = '';
  node.append(clock, words);
  node.classList.add('sr-count');
  // A number that changes every second is not read out every second: the words are the status.
  clock.setAttribute('aria-hidden', 'true');
  let timer = 0;
  let painted = false;
  const paint = () => {
    if (painted && !node.isConnected) { stop(); return; }
    painted = true;
    const st = countdownState({
      netMs: m.netMs, nowMs: typeof now === 'function' ? now() : Date.now(), status: m.statusAbbrev, precision: m.netPrecision,
      ageMs: typeof ageMs === 'function' ? ageMs() : null, durationS: record.ascent ? record.ascent.durationS : 0,
    });
    node.hidden = !st;
    if (!st) return;
    node.dataset.phase = st.phase;
    if (clock.textContent !== st.clock) clock.textContent = st.clock;
    clock.hidden = !st.clock;
    const line = [st.words, st.age].filter(Boolean).join(COPY.punctuation.separator);
    if (words.textContent !== line) words.textContent = line;
  };
  function stop() { if (timer) clearInterval(timer); timer = 0; }
  paint();
  timer = setInterval(paint, 1000);
  return stop;
}
