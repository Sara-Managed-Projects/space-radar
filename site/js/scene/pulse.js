// scene/pulse.js -- how fast a pulsar is drawn blinking (public #426, 2026-10-08). Pure: no DOM, no
// three.js; data/layers.js reads it for the card's sentence and scene/pulsars.js for the light.
//
// Contract: shownPeriod(periodS) -> {shownS, slower} | null,  pulseAt(tS, shownS) -> 0..1,
//           MIN_SHOWN_S, PULSE_WIDTH, PULSE_FLOOR
//
// A pulsar's beam sweeps past once a turn: the Crab's every 33 milliseconds, the fastest known
// every 1.4. A screen draws 60 frames a second and an eye fuses anything over about ten flashes a
// second, so a blink at the true rate would be a steady light (or, sampled at 60 Hz, a false slow
// beat). So the period is multiplied by a power of ten -- 1, 10, 100 or 1 000, the least that
// brings it to half a second or more -- and the card says by which. A power of ten, so the sentence
// is one a person can undo in their head; and the slow ones (the first pulsar found, at 1.34 s; the
// magnetar, at 7.6 s) blink at exactly the rate they turn, which the card says too.

/** The shortest period drawn, seconds. */
export const MIN_SHOWN_S = 0.5;
/** The flash's width as a share of the period (a Gaussian's sigma), and the light left between flashes. */
export const PULSE_WIDTH = 0.07;
export const PULSE_FLOOR = 0.1;

/** The period a pulsar is drawn with and how many times slower than the truth that is; null without a period. */
export function shownPeriod(periodS) {
  const p = Number(periodS);
  if (!(p > 0) || !Number.isFinite(p)) return null;
  let slower = 1;
  while (p * slower < MIN_SHOWN_S && slower < 1e6) slower *= 10;
  return { shownS: p * slower, slower };
}

/** The light at time tS (seconds, any origin) of a pulsar drawn with period shownS: PULSE_FLOOR..1. */
export function pulseAt(tS, shownS) {
  if (!(shownS > 0)) return PULSE_FLOOR;
  const turn = tS / shownS;
  const phase = turn - Math.floor(turn);
  const d = Math.min(phase, 1 - phase) / PULSE_WIDTH;
  return PULSE_FLOOR + (1 - PULSE_FLOOR) * Math.exp(-d * d);
}
