// sky/passes.js — when is it over my head, and will I actually see it.
//
// Contract (tests/test_contract.mjs):
//   predictPasses(records, observer, fromMs, hours) -> Pass[]
//   Pass: {record, startMs, peakMs, endMs, peakEl, startAz, endAz, sunlit, magnitude|null}
//
// Spec 0014 requirement 4: a satellite counts as VISIBLE when it is above 10 degrees, sunlit, and
// the Sun is below -6 degrees at the observer. Those three thresholds are registry values here
// (PASS_RULES / the options argument), not constants, and the two answers are returned separately:
// `aboveHorizon` is always true for a returned pass, `visible` is the honest one.
//
// Units: kilometres, seconds, radians. The *Deg twins exist only because the card and the copy
// layer are the UI boundary; the radian fields are the real ones.
//
// No dependency on any other site/js module: this runs in a worker with only the vendored
// satellite.js beside it.

import * as satellite from '../../vendor/satellite.esm.js';

/** Defaults. Every one of these is meant to be overridden from a registry, never edited here. */
export const PASS_RULES = {
  minElevationDeg: 10, // above the horizon
  sunElevationDeg: -6, // civil twilight: darker than this and the observer can see it
  stepSeconds: 30, // coarse scan
  refineSeconds: 1, // how tightly the start/peak/end are pinned
  sunlitSampleSeconds: 10, // resolution of the sunlit / visible segments inside a pass
  maxPassesPerRecord: 64,
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const TWO_PI = Math.PI * 2;
const MS_PER_DAY = 86400000;
const JD_UNIX_EPOCH = 2440587.5;
const KM_PER_AU = 1.4959787069098932e8;

// Standard magnitude is defined at 1000 km and 50 % illumination; 2.5*log10(1000^2 / 0.5) =
// 15.752575, not 15.75 -- rounding it put a 0.0026 mag bias on every answer.
const STD_MAG_OFFSET = 2.5 * Math.log10(1e6 / 0.5);

/** Julian date (UT) from unix milliseconds. Matches satellite.js's jday() to ~1e-9 d. */
function jdFromMs(ms) {
  return ms / MS_PER_DAY + JD_UNIX_EPOCH;
}

/**
 * Observer normalisation. Canonical is {latRad, lonRad, altKm}; geolocation hands degrees and
 * metres, so those spellings are accepted too. `lat`/`lon` without a suffix are read as DEGREES,
 * because the only thing that ever produces them is the browser or a place list.
 */
function normaliseObserver(o) {
  if (!o) return null;
  let latRad;
  let lonRad;
  if (Number.isFinite(o.latRad) && Number.isFinite(o.lonRad)) {
    latRad = o.latRad;
    lonRad = o.lonRad;
  } else if (Number.isFinite(o.latDeg) && Number.isFinite(o.lonDeg)) {
    latRad = o.latDeg * DEG2RAD;
    lonRad = o.lonDeg * DEG2RAD;
  } else if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
    // A GeolocationCoordinates object: degrees.
    latRad = o.latitude * DEG2RAD;
    lonRad = o.longitude * DEG2RAD;
  } else if (Number.isFinite(o.lat) && Number.isFinite(o.lon)) {
    latRad = o.lat * DEG2RAD;
    lonRad = o.lon * DEG2RAD;
  } else {
    return null;
  }
  let altKm = 0;
  if (Number.isFinite(o.altKm)) altKm = o.altKm;
  else if (Number.isFinite(o.heightKm)) altKm = o.heightKm;
  else if (Number.isFinite(o.altM)) altKm = o.altM / 1000;
  else if (Number.isFinite(o.altitude)) altKm = o.altitude / 1000; // GeolocationCoordinates: metres
  else if (Number.isFinite(o.alt)) altKm = o.alt / 1000;
  return { latRad, lonRad, altKm };
}

function satrecOf(record) {
  if (!record) return null;
  if (record.satrec && Number.isFinite(record.satrec.jdsatepoch)) return record.satrec;
  return null;
}

/**
 * The STANDARD magnitude: brightness at 1000 km, 50 % illuminated. Deliberately NOT `meta.magnitude`
 * -- that key means an APPARENT magnitude everywhere else in the app (ui/cards.js feeds it to
 * copy's compare('magnitude', v), which turns -4.6 into "as bright as Venus"). Reading an apparent
 * magnitude as a standard one is silently wrong by ~1.7 mag for the ISS, so this asks for the key
 * that can only mean one thing. No record supplies one yet, so today this returns null and
 * `magnitude` on every pass is an honest null.
 */
function standardMagnitudeOf(record) {
  const m = record?.meta;
  if (!m) return null;
  for (const key of ['stdMag', 'standardMagnitude', 'intrinsicMagnitude']) {
    const v = Number(m[key]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

/** The step table: everything that depends on time but not on the satellite, computed once. */
function buildSteps(obs, fromMs, hours, stepSeconds) {
  const stepMs = stepSeconds * 1000;
  const count = Math.max(1, Math.ceil((hours * 3600000) / stepMs)) + 1;
  const ms = new Float64Array(count);
  const jd = new Float64Array(count);
  const cosG = new Float64Array(count);
  const sinG = new Float64Array(count);

  const obsEcf = satellite.geodeticToEcf({
    longitude: obs.lonRad,
    latitude: obs.latRad,
    height: obs.altKm,
  });

  for (let i = 0; i < count; i += 1) {
    const t = fromMs + i * stepMs;
    ms[i] = t;
    jd[i] = jdFromMs(t);
    const g = satellite.gstime(new Date(t));
    cosG[i] = Math.cos(g);
    sinG[i] = Math.sin(g);
  }
  return { ms, jd, cosG, sinG, count, stepMs, obsEcf };
}

/** The observer's east-north-up basis, computed once and passed into the hot loop. */
function observerBasis(obs) {
  return {
    cosLat: Math.cos(obs.latRad),
    sinLat: Math.sin(obs.latRad),
    cosLon: Math.cos(obs.lonRad),
    sinLon: Math.sin(obs.lonRad),
  };
}

/**
 * Elevation only, allocation-free apart from what sgp4 returns. Identical maths to satellite.js's
 * eciToEcf + ecfToLookAngles, inlined because this runs ~1e6 times per prediction.
 */
function elevationAt(satrec, minutes, cosG, sinG, basis, obsEcf) {
  const pv = satellite.sgp4(satrec, minutes);
  if (!pv || !pv.position) return null;
  const p = pv.position;
  const ex = p.x * cosG + p.y * sinG;
  const ey = -p.x * sinG + p.y * cosG;
  const rx = ex - obsEcf.x;
  const ry = ey - obsEcf.y;
  const rz = p.z - obsEcf.z;
  const range = Math.sqrt(rx * rx + ry * ry + rz * rz);
  if (range <= 0) return null;
  const up =
    basis.cosLat * basis.cosLon * rx + basis.cosLat * basis.sinLon * ry + basis.sinLat * rz;
  return Math.asin(up / range);
}

/** Full look angles at an arbitrary instant, via satellite.js so the reported numbers are its own. */
function lookAt(satrec, ms, obs) {
  const d = new Date(ms);
  const minutes = (jdFromMs(ms) - satrec.jdsatepoch) * 1440;
  const pv = satellite.sgp4(satrec, minutes);
  if (!pv || !pv.position) return null;
  const g = satellite.gstime(d);
  const ecf = satellite.eciToEcf(pv.position, g);
  const la = satellite.ecfToLookAngles(
    { longitude: obs.lonRad, latitude: obs.latRad, height: obs.altKm },
    ecf,
  );
  return {
    az: ((la.azimuth % TWO_PI) + TWO_PI) % TWO_PI,
    el: la.elevation,
    rangeKm: la.rangeSat,
    eci: pv.position,
    gmst: g,
  };
}

function elevationAtMs(satrec, ms, basis, obsEcf) {
  const g = satellite.gstime(new Date(ms));
  const minutes = (jdFromMs(ms) - satrec.jdsatepoch) * 1440;
  const el = elevationAt(satrec, minutes, Math.cos(g), Math.sin(g), basis, obsEcf);
  return el === null ? -Math.PI / 2 : el;
}

/** Bisection on el(t) - threshold, to `toleranceMs`. `loMs` and `hiMs` must bracket the crossing. */
function refineCrossing(satrec, basis, obsEcf, loMs, hiMs, threshold, toleranceMs) {
  let lo = loMs;
  let hi = hiMs;
  const loAbove = elevationAtMs(satrec, lo, basis, obsEcf) >= threshold;
  for (let i = 0; i < 40 && hi - lo > toleranceMs; i += 1) {
    const mid = (lo + hi) / 2;
    if (elevationAtMs(satrec, mid, basis, obsEcf) >= threshold === loAbove) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Ternary search for the maximum of el(t) on [loMs, hiMs], to `toleranceMs`. */
function refinePeak(satrec, basis, obsEcf, loMs, hiMs, toleranceMs) {
  let lo = loMs;
  let hi = hiMs;
  for (let i = 0; i < 60 && hi - lo > toleranceMs; i += 1) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (elevationAtMs(satrec, a, basis, obsEcf) < elevationAtMs(satrec, b, basis, obsEcf)) lo = a;
    else hi = b;
  }
  return (lo + hi) / 2;
}

/** Sun elevation (radians) at the observer, plus the Sun's earth-inertial position in km. */
function sunElevationAt(ms, basis, obsEcf) {
  const { rsun } = satellite.sunPos(jdFromMs(ms));
  const g = satellite.gstime(new Date(ms));
  const cg = Math.cos(g);
  const sg = Math.sin(g);
  const sx = rsun.x * KM_PER_AU;
  const sy = rsun.y * KM_PER_AU;
  const sz = rsun.z * KM_PER_AU;
  const ex = sx * cg + sy * sg;
  const ey = -sx * sg + sy * cg;
  const rx = ex - obsEcf.x;
  const ry = ey - obsEcf.y;
  const rz = sz - obsEcf.z;
  const up =
    basis.cosLat * basis.cosLon * rx + basis.cosLat * basis.sinLon * ry + basis.sinLat * rz;
  return {
    elRad: Math.asin(up / Math.sqrt(rx * rx + ry * ry + rz * rz)),
    sunEci: { x: sx, y: sy, z: sz },
  };
}

/**
 * shadowFraction, measured from the vendored build rather than assumed:
 *   shadowFraction(sunPositionAU: {x,y,z}, satellitePositionKmEci: {x,y,z}) -> 0..1
 * 0 means fully lit (it returns 0 immediately when the satellite is on the sunward side),
 * 1 means the Sun's disc is fully occulted by Earth. Values in between are the penumbra.
 * So "sunlit" is shadow < 1, and 1 - shadow is the fraction of the disc still showing.
 */
function shadowFractionAt(satEciKm, sunEciKm) {
  const au = { x: sunEciKm.x / KM_PER_AU, y: sunEciKm.y / KM_PER_AU, z: sunEciKm.z / KM_PER_AU };
  const f = satellite.shadowFraction(au, satEciKm);
  return Number.isFinite(f) ? f : 0;
}

/**
 * Apparent magnitude from a standard magnitude (the magnitude at 1000 km, 50 % illuminated).
 *   mag = stdMag - 15.75 + 2.5 * log10(range^2 / fracIllum)
 * Returns null when the record carries no standard magnitude. Nothing is invented.
 */
function apparentMagnitude(stdMag, rangeKm, satEci, sunEci, obsEci) {
  if (stdMag === null || !Number.isFinite(rangeKm) || rangeKm <= 0) return null;
  const sx = sunEci.x - satEci.x;
  const sy = sunEci.y - satEci.y;
  const sz = sunEci.z - satEci.z;
  const ox = obsEci.x - satEci.x;
  const oy = obsEci.y - satEci.y;
  const oz = obsEci.z - satEci.z;
  const sm = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const om = Math.sqrt(ox * ox + oy * oy + oz * oz);
  if (sm <= 0 || om <= 0) return null;
  const cosPhase = (sx * ox + sy * oy + sz * oz) / (sm * om);
  const fracIllum = (1 + Math.max(-1, Math.min(1, cosPhase))) / 2;
  if (fracIllum <= 1e-4) return null; // a hair from new phase: the formula blows up, so say nothing
  return stdMag - STD_MAG_OFFSET + 2.5 * Math.log10((rangeKm * rangeKm) / fracIllum);
}

/**
 * @param {Array} records   Record[]; anything without a `satrec` is skipped (no propagator here).
 * @param {object} observer {latRad, lonRad, altKm} (degree spellings accepted; see above)
 * @param {number} fromMs   clock.now(), never the wall clock
 * @param {number} hours    window length
 * @param {object} [options] overrides for PASS_RULES
 * @returns {Array} Pass[] sorted by startMs
 */
export function predictPasses(records, observer, fromMs, hours, options = {}) {
  const obs = normaliseObserver(observer);
  if (!obs || !Array.isArray(records) || records.length === 0) return [];
  const hrs = Number(hours) > 0 ? Number(hours) : 24;
  const from = Number(fromMs);
  if (!Number.isFinite(from)) return [];

  const rules = { ...PASS_RULES, ...options };
  const minEl = rules.minElevationDeg * DEG2RAD;
  const darkEl = rules.sunElevationDeg * DEG2RAD;
  const tolMs = Math.max(50, rules.refineSeconds * 1000);
  const toMs = from + hrs * 3600000;

  const steps = buildSteps(obs, from, hrs, rules.stepSeconds);
  const { ms, jd, cosG, sinG, count, obsEcf } = steps;
  const basis = observerBasis(obs);

  const passes = [];

  for (const record of records) {
    const satrec = satrecOf(record);
    if (!satrec) continue;
    const stdMag = standardMagnitudeOf(record);
    const common = { record, satrec, obs, basis, obsEcf, stdMag, darkEl, minEl, rules };

    let riseIdx = -1; // -1 none open, -2 open before the window, >=0 index of the step below minEl
    let found = 0;
    let prevAbove = false;

    for (let i = 0; i < count && found < rules.maxPassesPerRecord; i += 1) {
      const minutes = (jd[i] - satrec.jdsatepoch) * 1440;
      const el = elevationAt(satrec, minutes, cosG[i], sinG[i], basis, obsEcf);
      const above = el !== null && el >= minEl;

      if (i === 0) {
        // Already up when the window opens: a pass in progress, clipped at the start.
        if (above) riseIdx = -2;
      } else if (above && !prevAbove && riseIdx === -1) {
        riseIdx = i - 1;
      } else if (!above && prevAbove && riseIdx !== -1) {
        const startMs =
          riseIdx === -2
            ? from
            : refineCrossing(satrec, basis, obsEcf, ms[riseIdx], ms[riseIdx + 1], minEl, tolMs);
        const endMs = refineCrossing(satrec, basis, obsEcf, ms[i - 1], ms[i], minEl, tolMs);
        const pass = buildPass({
          ...common,
          startMs,
          endMs,
          clippedStart: riseIdx === -2,
          clippedEnd: false,
        });
        if (pass) {
          passes.push(pass);
          found += 1;
        }
        riseIdx = -1;
      }
      prevAbove = above;
    }

    // Still up when the window closes.
    if (riseIdx !== -1 && found < rules.maxPassesPerRecord) {
      const startMs =
        riseIdx === -2
          ? from
          : refineCrossing(satrec, basis, obsEcf, ms[riseIdx], ms[riseIdx + 1], minEl, tolMs);
      const pass = buildPass({
        ...common,
        startMs,
        endMs: toMs,
        clippedStart: riseIdx === -2,
        clippedEnd: true,
      });
      if (pass) passes.push(pass);
    }
  }

  passes.sort((a, b) => a.startMs - b.startMs);
  return passes;
}

function buildPass(args) {
  const {
    record,
    satrec,
    obs,
    basis,
    obsEcf,
    startMs,
    endMs,
    clippedStart,
    clippedEnd,
    stdMag,
    darkEl,
    minEl,
    rules,
  } = args;
  if (!(endMs > startMs)) return null;

  const peakMs = refinePeak(
    satrec,
    basis,
    obsEcf,
    startMs,
    endMs,
    Math.max(50, rules.refineSeconds * 1000),
  );

  const atStart = lookAt(satrec, startMs, obs);
  const atPeak = lookAt(satrec, peakMs, obs);
  const atEnd = lookAt(satrec, endMs, obs);
  if (!atStart || !atPeak || !atEnd) return null;

  // Walk the pass: where it is sunlit, where it is also dark enough to be seen, and how bright it
  // gets. The peak of the arc is often NOT the sunlit part -- a pass that enters Earth's shadow
  // halfway is the normal case at high latitude -- so brightness is taken over the segment the
  // observer can actually see, not at the peak.
  const sampleMs = Math.max(1000, rules.sunlitSampleSeconds * 1000);
  const n = Math.max(2, Math.ceil((endMs - startMs) / sampleMs) + 1);
  let sunlitStartMs = null;
  let sunlitEndMs = null;
  let visibleStartMs = null;
  let visibleEndMs = null;
  let sunlitSamples = 0;
  let bestVisibleMag = null;
  let bestSunlitMag = null;
  let brightestMs = null;

  for (let i = 0; i < n; i += 1) {
    const t = startMs + ((endMs - startMs) * i) / (n - 1);
    const look = lookAt(satrec, t, obs);
    if (!look) continue;
    const { elRad: sunEl, sunEci } = sunElevationAt(t, basis, obsEcf);
    if (shadowFractionAt(look.eci, sunEci) >= 1) continue; // in Earth's shadow: not a pass
    sunlitSamples += 1;
    if (sunlitStartMs === null) sunlitStartMs = t;
    sunlitEndMs = t;

    const mag = apparentMagnitude(
      stdMag,
      look.rangeKm,
      look.eci,
      sunEci,
      satellite.ecfToEci(obsEcf, look.gmst),
    );
    if (mag !== null && (bestSunlitMag === null || mag < bestSunlitMag)) bestSunlitMag = mag;

    if (sunEl < darkEl && look.el >= minEl) {
      if (visibleStartMs === null) visibleStartMs = t;
      visibleEndMs = t;
      if (mag !== null && (bestVisibleMag === null || mag < bestVisibleMag)) {
        bestVisibleMag = mag;
        brightestMs = t;
      }
    }
  }

  const { elRad: sunElAtPeakRad, sunEci: peakSunEci } = sunElevationAt(peakMs, basis, obsEcf);
  const shadowAtPeak = shadowFractionAt(atPeak.eci, peakSunEci);
  const sunlitAtPeak = shadowAtPeak < 1;

  // The brightest magnitude over the segment that is actually visible; failing that, over the
  // sunlit segment. null when the record carries no standard magnitude -- never a guess.
  const magnitude = bestVisibleMag !== null ? bestVisibleMag : bestSunlitMag;

  return {
    // --- the contract's fields ---
    record,
    startMs,
    peakMs,
    endMs,
    peakEl: atPeak.el, // radians
    startAz: atStart.az, // radians
    endAz: atEnd.az, // radians
    // Lit at ANY point while above the horizon. Requirement 3: a pass in Earth's shadow is not a
    // pass -- but a pass that fades into shadow halfway is still a pass, and the common one.
    sunlit: sunlitStartMs !== null,
    magnitude,

    // --- the honest second answer, and what the card and the arc need ---
    aboveHorizon: true,
    visible: visibleStartMs !== null,
    visibleStartMs,
    visibleEndMs,
    sunlitStartMs,
    sunlitEndMs,
    sunlitAtPeak,
    brightestMs,
    sunlitFraction: sunlitSamples / Math.max(1, n),
    shadowFractionAtPeak: shadowAtPeak,
    observerDarkAtPeak: sunElAtPeakRad < darkEl,
    sunElAtPeak: sunElAtPeakRad, // radians
    peakAz: atPeak.az, // radians
    peakRangeKm: atPeak.rangeKm,
    durationS: (endMs - startMs) / 1000,
    clippedStart,
    clippedEnd,

    // --- UI boundary, degrees, because the card is written in them ---
    peakElDeg: atPeak.el * RAD2DEG,
    startAzDeg: atStart.az * RAD2DEG,
    endAzDeg: atEnd.az * RAD2DEG,
    peakAzDeg: atPeak.az * RAD2DEG,
    sunElAtPeakDeg: sunElAtPeakRad * RAD2DEG,
  };
}
