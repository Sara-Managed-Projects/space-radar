// sky/variables.js -- how bright a famous variable star is at an instant, and its light curve (forge #142).
//
// Contract (pure: no DOM, no three, no fetch; tests/test_variables.mjs runs it in Node):
//   VAR_YEARS                                  past this from now the curves are not extrapolated
//   jdOf(ms), msOfJd(jd)
//   phaseAt(row, ms) -> 0..1 | null            from the row's epoch: 0 is a maximum (pulsating) or a primary minimum (eclipsing)
//   magAt(row, ms) -> magnitude | null         null: not predictable (an irregular star), draw the catalogue's
//   curve(row, ms, n) -> { points: [[ms, mag]...], fromMs, toMs, now: mag | null, faint, bright }
//   nextMinimum(row, fromMs) -> ms | null      an eclipsing star's next primary minimum (row.linear's elements when it has them)
//   honesty(row) -> 'measured' | 'modelled'    what the drawn value is
// Rows are data/variables.json's (scripts/build-variables.py: GCVS 5.1 elements, two stars with more).
//
// THE SHAPES (modelled from the GCVS's measured elements; the catalogue gives numbers, not curves):
//   eclipse   flat at maximum, a dip of the catalogue's depth lasting D (M-m/D) of the period, rounded as
//             a partial eclipse is; a secondary dip at half phase where the catalogue gives one.
//   binary    beta Lyrae and W Ursae Majoris stars: never flat, two unequal minima a period.
//   pulse     Cepheids, RR Lyrae and Miras: the rise takes M-m (a share of the period) and the fall the
//             rest, which is the sawtooth these stars draw; from the catalogue's maximum epoch.
//   sine      delta Scuti and beta Cephei stars: small and nearly sinusoidal.
//   sr        semi-regular giants: a sine of the catalogue period over half the catalogue range, whose
//             phase is not predictable (no epoch is given). Drawn as a sketch, and the card says so.
//   irregular no clock value: the sky keeps the catalogue's magnitude and the card shows the range.
// A Mira's maxima wander by weeks from cycle to cycle and the GCVS epochs are decades old, so a Mira's
// value is modelled even though its numbers are measured. An eclipse is a clock: Algol's minima keep to
// minutes. Past VAR_YEARS from now nothing is extrapolated and the stars keep their catalogue brightness.

const DAY_MS = 86400e3;
const JD_UNIX = 2440587.5;
/** Past this many years from now a curve is not carried (phases drift, periods change). */
export const VAR_YEARS = 300;

export const jdOf = (ms) => ms / DAY_MS + JD_UNIX;
export const msOfJd = (jd) => (jd - JD_UNIX) * DAY_MS;

const frac = (x) => x - Math.floor(x);
const PULSE_RISE = { M: 0.45, RVA: 0.5, RRAB: 0.15, DCEP: 0.3, DCEPS: 0.45, CEP: 0.35 };

/** The phase from the row's epoch, 0..1, or null for a star with no period. */
export function phaseAt(row, ms) {
  if (!row || !Number.isFinite(ms)) return null;
  const jd = jdOf(ms);
  const q = row.quadratic;
  if (q && q.q > 0) {
    // T = t0 + p0 E + q E^2, solved for E (Harmanec & Scholz 1993 for beta Lyrae).
    const c = q.t0 - jd;
    const e = (-q.p0 + Math.sqrt(q.p0 * q.p0 - 4 * q.q * c)) / (2 * q.q);
    return frac(e);
  }
  // b200-c2-deep: Kreiner's up-to-date elements for the bright eclipsing stars (scripts/build-variables.py LINEAR)
  const L = row.linear && row.linear.periodD > 0 ? row.linear : row;
  if (!(L.periodD > 0)) return null;
  // A semi-regular star has no epoch in the catalogue: J2000 stands in, and the card says the phase is not known.
  const epoch = Number.isFinite(L.epochJd) ? L.epochJd : 2451545.0;
  return frac((jd - epoch) / L.periodD);
}

function eclipseDip(phase, depth, width) {
  // phase 0 the middle of the eclipse; a rounded V, as a partial eclipse is.
  const p = Math.min(phase, 1 - phase);
  const half = Math.max(0.005, width / 2);
  if (p >= half) return 0;
  const f = p / half;
  return depth * Math.pow(1 - f * f, 0.75);
}

function measuredMag(meas, ms) {
  const pts = meas.points.map((p) => [Date.parse(`${p[0]}T00:00:00Z`), p[1]]);
  if (ms < pts[0][0] || ms > pts[pts.length - 1][0]) return null;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    if (ms <= pts[i + 1][0]) {
      const k = (ms - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      return pts[i][1] + k * (pts[i + 1][1] - pts[i][1]);
    }
  }
  return pts[pts.length - 1][1];
}

/** The star's magnitude at `ms` in the catalogue's band, or null where the clock cannot say. */
export function magAt(row, ms) {
  if (!row || !Number.isFinite(row.max) || !Number.isFinite(ms)) return null;
  if (row.measured) {
    const m = measuredMag(row.measured, ms);
    if (m !== null) return m;
    // Outside the measured months: the main pulsation, a sketch (the phase is the dimming's start).
    const t0 = Date.parse(`${row.measured.points[0][0]}T00:00:00Z`);
    return row.measured.mean + row.measured.amp * Math.sin(2 * Math.PI * (ms - t0) / (row.measured.periodD * DAY_MS));
  }
  if (!Number.isFinite(row.min)) return null;
  const phase = phaseAt(row, ms);
  if (phase === null || row.shape === 'irregular') return null;
  const amp = row.min - row.max;
  switch (row.shape) {
    case 'eclipse': {
      const w = row.frac > 0 ? row.frac : 0.1;
      let m = row.max + eclipseDip(phase, amp, w);
      if (Number.isFinite(row.min2)) m += eclipseDip(frac(phase + 0.5), row.min2 - row.max, w);
      return m;
    }
    case 'binary': {
      const d2 = Number.isFinite(row.min2) ? row.min2 - row.max : amp;
      const depth = d2 + (amp - d2) * (1 + Math.cos(2 * Math.PI * phase)) / 2;
      return row.max + depth * (1 + Math.cos(4 * Math.PI * phase)) / 2;
    }
    case 'pulse': {
      const type = String(row.type || '').split(/[+:/]/)[0];
      const rise = row.frac > 0 && row.frac < 1 ? row.frac : (PULSE_RISE[type] || 0.4);
      const fall = 1 - rise;
      if (phase < fall) return row.max + amp * (1 - Math.cos(Math.PI * phase / fall)) / 2;
      return row.min - amp * (1 - Math.cos(Math.PI * (phase - fall) / rise)) / 2;
    }
    case 'sine':
      return row.max + amp * (1 - Math.cos(2 * Math.PI * phase)) / 2;
    case 'sr':
      return (row.max + row.min) / 2 + amp / 4 * Math.sin(2 * Math.PI * phase);
    default:
      return null;
  }
}

/** Measured where the clock value is read off measurements or a strict clock (an eclipse); modelled otherwise. */
export function honesty(row, ms) {
  if (row && row.measured && Number.isFinite(ms) && measuredMag(row.measured, ms) !== null) return 'measured';
  return 'modelled';
}

/**
 * The light curve around `ms`: two periods (one for a period over a year, a decade for a star with none),
 * `n` points, with the value now. For the card's small chart (ui/varcurve.js).
 */
export function curve(row, ms, n = 120) {
  const p = row && row.quadratic ? row.quadratic.p0 : row && row.periodD;
  let spanD = p > 0 ? (p > 365 ? p : 2 * p) : 3650;
  if (row && row.measured) spanD = 400;
  // A curve for an eclipse that lasts a few hours is drawn over 2 periods so the dip is a few pixels wide.
  const fromMs = ms - spanD * DAY_MS / 2;
  const toMs = ms + spanD * DAY_MS / 2;
  const points = [];
  let faint = -Infinity;
  let bright = Infinity;
  for (let i = 0; i <= n; i += 1) {
    const t = fromMs + (toMs - fromMs) * i / n;
    const m = magAt(row, t);
    if (m === null) continue;
    points.push([t, m]);
    faint = Math.max(faint, m);
    bright = Math.min(bright, m);
  }
  return { points, fromMs, toMs, now: magAt(row, ms), faint, bright };
}

/** An eclipsing star's next primary minimum at or after `fromMs`, or null. */
export function nextMinimum(row, fromMs) {
  if (!row || (row.shape !== 'eclipse' && row.shape !== 'binary')) return null;
  const phase = phaseAt(row, fromMs);
  if (phase === null) return null;
  const p = row.quadratic ? row.quadratic.p0 + 2 * row.quadratic.q * ((jdOf(fromMs) - row.quadratic.t0) / row.quadratic.p0) : (row.linear || row).periodD; // b200-c2-deep
  return fromMs + (phase === 0 ? 0 : (1 - phase) * p * DAY_MS);
}
