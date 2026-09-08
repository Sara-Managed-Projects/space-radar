// ui/cards.js -- the card that opens when anything is tapped.
//
// A bottom sheet on a phone, a right rail on a desktop (css/ui.css does the placement).
// Pure DOM, no framework. Every string comes from copy/en.js; every value is written with
// textContent, never innerHTML, so a name from an upstream feed cannot become markup.
//
// The order of the blocks is FIXED (spec 0013 design, "Anatomy"):
//   0. the LEAD, and only during a guided trip: the stop's own title and words. It renders above
//      block 1 and reorders nothing below it, so everything the card knows -- the freshness
//      stamp, the provenance class, the myth block -- stays exactly where it was.
//   1. name and class glyph
//   2. ONE plain sentence: what it is and why it matters now
//   3. up to three comparison chips, scale first
//   4. "right now"
//   4b. "often said" -- the myth block, against the facts it corrects
//   4c. "also aboard" / "riding on" -- the link between a spacecraft and what is bolted to it
//   5. "see it from here"
//   6. up to three actions
//   7. the class-and-age line
//   8. the source line
//
// Contract exports: showCard(record, ctx, opts), hideCard().
//
// `opts.lead` is the trip card, and it is the ordinary card restyled rather than a fork. A stop
// that is a PLACE and not an object -- "pull back until the Earth is a dot" -- has no record at
// all, so `showCard(null, ctx, { lead })` renders the lead alone. A null record with no lead is
// still hideCard(): the card has nothing to say and says nothing.

import {
  COPY,
  compare,
  t,
  fmt,
  timeText,
  compassWords,
  fistsWords,
  inWords,
  UNITS,
} from '../copy/en.js';
import { propagate } from '../propagate/index.js';
import { realModelFor } from '../scene/realmodels.js';
import { sunlitState } from '../scene/shadow.js';
import { periodMsOf } from '../scene/orbitline.js';
import {
  gmst,
  eciToEcef,
  ecefToGeodetic,
  parseFrame,
  bodyFixedToSpherical,
  worldRadiusKm,
  toStage,
} from '../propagate/frames.js';
import { predictPasses } from '../sky/passes.js';
import { trajectorySection } from './trajectory.js';
import { trainOf } from '../data/trains.js';
import { attachedOdditiesFor, attachedOddityRecord } from '../data/attached.js';

const MAX_FIRST_SENTENCE = 160; // spec 0013 requirement 10, enforced by check_copy.py
const MAX_COMPARISONS = 3; // spec 0013 requirement 2
const MAX_ACTIONS = 3; // spec 0013 requirement 8
const MAX_NAME = 72; // keeps the first sentence inside its limit whatever a feed sends
const PASS_WINDOW_HOURS = 24;
const REFRESH_MS = 250; // a UI throttle on re-render, not a source of drawn state
const DEG = 180 / Math.PI;

const HOST_ID = 'sr-card';

let host = null;
let bodyEl = null;
let current = null; // { record, ctx, opts }
let subscribed = false;
let lastPaint = 0;

// ---------------------------------------------------------------------------------------
// DOM helpers. Nothing here ever touches innerHTML.
// ---------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function ensureHost() {
  if (host && host.isConnected) return host;
  host = document.getElementById(HOST_ID);
  if (!host) {
    host = el('aside', 'sr-card');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }
  host.classList.add('sr-card');
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-live', 'polite');
  host.hidden = true;
  return host;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ---------------------------------------------------------------------------------------
// Reading the record without trusting it
// ---------------------------------------------------------------------------------------

function meta(record) {
  return (record && record.meta) || {};
}

/** First defined, non-empty value among the given meta keys. Upstream names vary. */
function pick(source, ...keys) {
  for (const key of keys) {
    const v = source[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function pickNumber(source, ...keys) {
  const v = pick(source, ...keys);
  // Number(null) is 0, so the null has to be caught before the cast: a missing number
  // must stay missing. Without this the card writes a comparison nobody sourced.
  if (v === null || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** A time in ms from whatever an upstream called it: ms number, seconds, or ISO string. */
function pickTime(source, ...keys) {
  const v = pick(source, ...keys);
  if (v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e11 ? v : v * 1000;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : null;
}

function displayName(record) {
  // A name a person uses before the catalogue's string: "International Space Station" before
  // "ISS (ZARYA)". The real-model table already holds one for every object it draws by id, and a
  // record may carry its own. A class-default model (generic: true) names the class, not the
  // object, so it does not rename anything.
  let name = record && record.meta && record.meta.displayName ? String(record.meta.displayName).trim() : '';
  if (!name) {
    let entry = null;
    try { entry = realModelFor(record); } catch { entry = null; }
    if (entry && !entry.generic && entry.name) name = String(entry.name).trim();
  }
  if (!name) name = record && record.name ? String(record.name).trim() : '';
  if (!name) return COPY.card.unknownName;
  if (name.length <= MAX_NAME) return name;
  return name.slice(0, MAX_NAME - 1).trimEnd() + COPY.punctuation.ellipsis;
}

function klassOf(record) {
  const k = record && record.klass ? String(record.klass) : '';
  return Object.prototype.hasOwnProperty.call(COPY.klass, k) ? k : 'unknown';
}

function isEarthFrame(frame) {
  return frame === 'earth-inertial' || frame === 'earth-fixed';
}

/**
 * The world a frame belongs to, or null. `ecefToGeodetic` is Earth's ellipsoid and nothing else's,
 * so everything below this line asks WHICH world before it prints a latitude. A lunar site used to
 * arrive here claiming 'earth-fixed' and got an Earth latitude that read as the Central African
 * Republic; the propagator no longer lies about the frame, and the card no longer assumes it.
 */
function frameWorld(frame) {
  const f = parseFrame(frame);
  return f ? f.world : null;
}

/** 'the Moon', 'Mars'... or null if the app has no name for it. Null is a printable answer. */
function worldName(worldId) {
  if (!worldId) return null;
  return Object.prototype.hasOwnProperty.call(COPY.worlds, worldId) ? COPY.worlds[worldId] : null;
}

// ---------------------------------------------------------------------------------------
// Measurement: everything the "right now" block shows, worked out from the one clock.
// Every call into another module is wrapped: a propagator that throws produces
// "could not work this out", never a blank card and never a made-up number.
// ---------------------------------------------------------------------------------------

function positionAt(record, tMs) {
  try {
    const p = propagate(record, tMs);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
    return p;
  } catch {
    return null;
  }
}

function measure(record, ctx) {
  const out = {
    ok: false,
    tMs: null,
    posKm: null,
    frame: record ? record.frame : null,
    cls: record ? record.cls : null,
    altKm: null,
    speedKmh: null,
    latDeg: null,
    lonDeg: null,
    worldId: null,
    distEarthKm: null,
    distSunKm: null,
    lightMinutes: null,
  };
  let tMs;
  try {
    tMs = ctx.clock.now();
  } catch {
    return out;
  }
  out.tMs = tMs;

  const p = positionAt(record, tMs);
  if (!p) return out;
  out.ok = true;
  out.posKm = p;
  out.frame = p.frame || record.frame;
  out.cls = p.cls || record.cls;

  // Speed by central difference over one second of clock time.
  const before = positionAt(record, tMs - 500);
  const after = positionAt(record, tMs + 500);
  if (before && after) {
    const kmPerSecond = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
    if (Number.isFinite(kmPerSecond)) out.speedKmh = kmPerSecond * 3600;
  }

  if (isEarthFrame(out.frame)) {
    try {
      const ecef =
        out.frame === 'earth-fixed' ? p : eciToEcef(p, gmst(new Date(tMs)));
      const gd = ecefToGeodetic(ecef);
      if (gd && Number.isFinite(gd.altKm)) {
        out.altKm = gd.altKm;
        out.latDeg = gd.latRad * DEG;
        out.lonDeg = gd.lonRad * DEG;
      }
    } catch {
      /* altitude stays null and the row says so */
    }
  } else if (out.frame === 'sun-inertial') {
    const r = Math.hypot(p.x, p.y, p.z);
    if (Number.isFinite(r)) out.distSunKm = r;
    const earth = heliocentricEarth(ctx, tMs);
    if (earth) {
      const d = Math.hypot(p.x - earth.x, p.y - earth.y, p.z - earth.z);
      if (Number.isFinite(d)) {
        out.distEarthKm = d;
        out.lightMinutes = d / UNITS.LIGHT_MINUTE_KM;
      }
    }
  } else {
    // Another world's frame: a landing site, a rover, anything body-fixed off Earth.
    const world = frameWorld(out.frame);
    out.worldId = world;
    if (world) {
      if (out.frame === `${world}-fixed`) {
        // Planetocentric, on that world's sphere -- the datum its published coordinates use and
        // the shape scene/worlds.js actually draws. NOT the WGS84 ellipsoid.
        const sph = bodyFixedToSpherical(p, worldRadiusKm(world));
        if (sph && Number.isFinite(sph.latRad)) {
          out.latDeg = sph.latRad * DEG;
          out.lonDeg = sph.lonRad * DEG;
          out.altKm = sph.altKm;
        }
      }
      try {
        const geo = toStage(record, p, { worldId: 'earth', frame: 'earth-inertial', tMs }, tMs);
        if (geo && Number.isFinite(geo.x)) {
          const d = Math.hypot(geo.x, geo.y, geo.z);
          if (Number.isFinite(d)) {
            out.distEarthKm = d;
            out.lightMinutes = d / UNITS.LIGHT_MINUTE_KM;
          }
        }
      } catch {
        /* the distance row says "could not work this out", which is a real answer */
      }
    }
  }
  return out;
}

/**
 * Earth's heliocentric position, if worlds.js can give one that is plausibly heliocentric.
 * The contract does not fix the frame of positionOf(), so the answer is sanity-checked
 * against the known Earth-Sun distance and dropped if it does not pass.
 */
function heliocentricEarth(ctx, tMs) {
  try {
    const v = ctx.worlds && ctx.worlds.positionOf ? ctx.worlds.positionOf('earth', tMs) : null;
    if (!v || !Number.isFinite(v.x)) return null;
    const r = Math.hypot(v.x, v.y, v.z);
    if (r < 0.9 * UNITS.AU_KM || r > 1.1 * UNITS.AU_KM) return null;
    return v;
  } catch {
    return null;
  }
}

const PASS_NO_OBSERVER = 'no-observer';
const PASS_NOT_APPLICABLE = 'not-applicable';
const PASS_NONE = 'none';
const PASS_ERROR = 'error';
const PASS_OK = 'ok';

function nextPass(record, ctx, m) {
  // `fixed` is the propagator for things that do not move: pads, dishes, landing sites, and now a
  // museum case in Houston. Asking predictPasses() when the next pass over you is right there is
  // not a bug in the maths, it is a question with no meaning -- and until this line the historic
  // reentries were asking it too.
  const doesNotMove = record && record.propagator === 'fixed';
  if (!isEarthFrame(m.frame) || doesNotMove ||
      klassOf(record) === 'site' || klassOf(record) === 'world') {
    return { state: PASS_NOT_APPLICABLE, pass: null };
  }
  // No position, no promise about the sky.
  if (!m.ok) return { state: PASS_ERROR, pass: null };
  const observer = ctx && ctx.observer;
  if (!observer || !Number.isFinite(observer.latRad) || !Number.isFinite(observer.lonRad)) {
    return { state: PASS_NO_OBSERVER, pass: null };
  }
  try {
    const passes = predictPasses([record], observer, m.tMs, PASS_WINDOW_HOURS);
    if (!Array.isArray(passes)) return { state: PASS_ERROR, pass: null };
    if (passes.length === 0) return { state: PASS_NONE, pass: null };
    const sorted = passes.slice().sort((a, b) => a.startMs - b.startMs);
    return { state: PASS_OK, pass: sorted[0] };
  } catch {
    return { state: PASS_ERROR, pass: null };
  }
}

// ---------------------------------------------------------------------------------------
// Block 2: the one plain sentence, per class template.
// Clauses are added in priority order while the sentence stays under 160 characters.
// A clause with no number behind it is never written.
// ---------------------------------------------------------------------------------------

function buildSentence(lead, clauses) {
  let out = lead;
  for (const clause of clauses) {
    if (!clause) continue;
    const next = out + COPY.punctuation.listJoin + clause;
    if (next.length + COPY.punctuation.dot.length > MAX_FIRST_SENTENCE) continue;
    out = next;
  }
  return out + COPY.punctuation.dot;
}

function passTimeClause(passInfo) {
  if (!passInfo || passInfo.state !== PASS_OK) return null;
  return timeText.hhmm(passInfo.pass.startMs);
}

function daysSince(ms, nowMs) {
  if (!Number.isFinite(ms)) return null;
  return Math.floor((nowMs - ms) / 86400000);
}

const TEMPLATES = {
  station(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const time = passTimeClause(passInfo);
    const crew = pickNumber(md, 'crew', 'crewCount', 'people');
    const periodMin = pickNumber(md, 'periodMinutes', 'periodMin', 'period');
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      time ? t(T.whyPass, { time }) : null,
      crew !== null && crew > 0 ? t(T.crew, { crew: fmt.int(crew) }) : null,
      m.altKm !== null ? t(T.altitude, { alt: fmt.int(m.altKm) }) : null,
      periodMin !== null ? t(T.speed, { period: fmt.int(periodMin) }) : null,
    ]);
  },

  satellite(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const launchMs = pickTime(md, 'launchMs', 'launchDate', 'launched', 'launch');
    const days = launchMs !== null ? daysSince(launchMs, m.tMs || launchMs) : null;
    let launchClause = null;
    if (days !== null && days >= 0 && days <= 400) {
      launchClause = t(T.whyLaunchedDays, { n: fmt.int(days) });
    } else if (launchMs !== null) {
      launchClause = t(T.whyLaunchedYear, { year: new Date(launchMs).getUTCFullYear() });
    }
    const operator = pick(md, 'operator', 'owner', 'country');
    const purpose = pick(md, 'purpose', 'does', 'role');
    const time = passTimeClause(passInfo);
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      launchClause,
      operator ? t(T.operator, { operator: String(operator) }) : null,
      purpose ? t(T.purpose, { purpose: String(purpose) }) : null,
      time ? t(T.whyPass, { time }) : null,
      m.altKm !== null ? t(T.altitude, { alt: fmt.int(m.altKm) }) : null,
    ]);
  },

  debris(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const origin = pick(md, 'origin', 'parent', 'wasPartOf');
    const breakupMs = pickTime(md, 'breakupMs', 'breakupDate', 'breakup');
    const decayMs = pickTime(md, 'decayMs', 'decayDate', 'reentryMs', 'reentryDate');
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      origin ? t(T.origin, { origin: String(origin) }) : null,
      breakupMs !== null ? t(T.brokeUp, { year: new Date(breakupMs).getUTCFullYear() }) : null,
      decayMs !== null ? t(T.decay, { date: timeText.localDate(decayMs) }) : null,
      m.altKm !== null ? t(T.altitude, { alt: fmt.int(m.altKm) }) : null,
      T.burnsUp,
    ]);
  },

  rocket(record, ctx, m, passInfo, T) {
    const md = meta(record);
    // The contract's ascent block carries t0Ms and the pad, so it is read before meta.
    const ascent = (record && record.ascent) || {};
    const pad = pick(md, 'pad', 'padName', 'site', 'launchSite');
    const t0 =
      pickTime(ascent, 't0Ms') ??
      pickTime(md, 't0Ms', 'net', 'liftoffMs', 'launchMs', 'launchDate');
    const when = t0 !== null && m.tMs !== null ? inWords(t0 - m.tMs) : null;
    const upcoming = t0 !== null && m.tMs !== null && t0 >= m.tMs;
    const destination =
      pick(md, 'destination', 'orbitName', 'goesTo') || pick(ascent, 'orbitClass');
    const payload = pick(md, 'payload', 'mission');
    const lead = pad
      ? t(T.leadWithPad, { name: displayName(record), pad: String(pad) })
      : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      when ? t(upcoming ? T.whyCountdown : T.whyFlown, { when }) : null,
      destination ? t(T.destination, { destination: String(destination) }) : null,
      payload ? t(T.payload, { payload: String(payload) }) : null,
    ]);
  },

  probe(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const destination = pick(md, 'destination', 'target', 'goingTo');
    const milestone = pick(md, 'milestone', 'nextEvent');
    const milestoneMs = pickTime(md, 'milestoneMs', 'nextEventMs', 'milestoneDate');
    const au = m.distSunKm !== null ? m.distSunKm / UNITS.AU_KM : null;
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      destination ? t(T.destination, { destination: String(destination) }) : null,
      m.lightMinutes !== null
        ? t(T.lightTime, { mins: fmt.smart(m.lightMinutes) })
        : null,
      au !== null ? t(T.distanceSun, { au: fmt.smart(au) }) : null,
      milestone && milestoneMs !== null
        ? t(T.milestone, { milestone: String(milestone), date: timeText.localDate(milestoneMs) })
        : null,
    ]);
  },

  telescope(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const target = pick(md, 'observing', 'target', 'lookingAt');
    const station = pick(md, 'station', 'parkedAt', 'lagrange');
    const band = pick(md, 'band', 'wavelength');
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      target ? t(T.observing, { target: String(target) }) : null,
      station ? t(T.station, { station: String(station) }) : null,
      band ? t(T.sees, { band: String(band) }) : null,
      m.altKm !== null ? t(T.altitude, { alt: fmt.int(m.altKm) }) : null,
    ]);
  },

  asteroid(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const caMs = pickTime(md, 'closeApproachMs', 'closeApproachDate', 'caDate');
    const missKm = pickNumber(md, 'missDistanceKm', 'missKm', 'distKm');
    const missLd = pickNumber(md, 'missDistanceLd', 'missLd');
    const ld = missLd !== null ? missLd : missKm !== null ? missKm / UNITS.LUNAR_DISTANCE_KM : null;
    const sizeM = pickNumber(md, 'sizeM', 'diameterM');
    const sizeSay = compare('sizeM', sizeM);
    // Spec 0013 requirement 6: only written when a named source classified it. The word
    // "danger" appears nowhere, because no sourced risk field exists in v1.
    const sourcedNoImpact = md.impactRisk === 'none' || md.noImpact === true;
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      caMs !== null && ld !== null
        ? t(T.whyApproach, { date: timeText.localDate(caMs), ld: fmt.smart(ld) })
        : null,
      sizeSay ? t(T.size, { size: sizeSay }) : null,
      sourcedNoImpact ? T.willNotHit : null,
    ]);
  },

  comet(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const periMs = pickTime(md, 'perihelionMs', 'perihelionDate', 'tp');
    const mag = pickNumber(md, 'magnitude', 'mag', 'h');
    const au = m.distSunKm !== null ? m.distSunKm / UNITS.AU_KM : null;
    let brightness = null;
    if (mag !== null) brightness = mag <= 6 ? T.nakedEye : T.faint;
    return buildSentence(t(T.lead, { name: displayName(record) }), [
      periMs !== null ? t(T.whyPerihelion, { date: timeText.localDate(periMs) }) : null,
      brightness,
      au !== null ? t(T.distanceSun, { au: fmt.smart(au) }) : null,
    ]);
  },

  // An oddity's sentence IS the registry row's `fact:`. There is nothing to compose: the row was
  // written as one sentence, the validator holds it to the card's own 160 characters, and a
  // clause bolted on here would be this file inventing copy about an object it knows nothing
  // about. The fallback is never reached with a valid registry and is here so that an invalid one
  // degrades to a true sentence instead of an empty one.
  oddity(record, ctx, m, passInfo, T) {
    const fact = pick(meta(record), 'fact');
    if (fact) return String(fact);
    return t(T.fallback, { name: displayName(record) }) + COPY.punctuation.dot;
  },

  site(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const kindKey = String(pick(md, 'kind', 'siteKind') || '');
    const kindWord = Object.prototype.hasOwnProperty.call(T.kinds, kindKey)
      ? T.kinds[kindKey]
      : null;
    const where = pick(md, 'where', 'locality', 'country', 'region');
    const spacecraft = pick(md, 'talkingTo', 'spacecraft', 'dsnTarget');
    const launch = pick(md, 'nextLaunch', 'launchName');
    const launchMs = pickTime(md, 'nextLaunchMs', 'nextLaunchDate');
    const when = launchMs !== null && m.tMs !== null ? inWords(launchMs - m.tMs) : null;
    // THE ROW'S OWN SENTENCE FIRST. registry/sites.yaml writes `doing:` for every hand-kept row
    // and the card never printed it, so nine site cards opened with the ground-station template
    // -- including three Apollo landing sites, which are not places that "work with spacecraft"
    // and have not for fifty years. The template is what a row with no sentence falls back to.
    const doing = pick(md, 'doing');
    const lead = doing
      ? String(doing).trim().replace(/\.\s*$/, '')
      : kindWord
        ? t(T.leadKind, { name: displayName(record), kind: kindWord })
        : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      spacecraft ? t(T.whyDsn, { spacecraft: String(spacecraft) }) : null,
      launch && when ? t(T.whyLaunch, { launch: String(launch), when }) : null,
      where ? t(T.where, { where: String(where) }) : null,
    ]);
  },

  exotic(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const kind = String(pick(md, 'kind') || 'blackhole');
    const distLy = pickNumber(md, 'distLy');
    const lo = pickNumber(md, 'distLyLow');
    const hi = pickNumber(md, 'distLyHigh');
    const mass = pickNumber(md, 'massMsun');
    const mLo = pickNumber(md, 'massMsunLow');
    const mHi = pickNumber(md, 'massMsunHigh');
    const period = pickNumber(md, 'periodS');
    const name = displayName(record);
    const leadKey = { blackhole: 'leadBlackhole', pulsar: 'leadPulsar', magnetar: 'leadMagnetar', star: 'leadStar' }[kind] || 'leadBlackhole';
    const lead = lo !== null && hi !== null
      ? t(T.leadRange, { name, kind: T.kinds[kind] || kind, lo: fmt.int(lo), hi: fmt.int(hi) })
      : t(T[leadKey], { name, dist: distLy !== null ? fmt.int(distLy) : '?' });
    let massSay = null;
    if (mLo !== null && mHi !== null) massSay = t(T.massRange, { lo: fmt.smart(mLo), hi: fmt.smart(mHi) });
    else if (mass !== null && mass >= 1e9) massSay = t(T.massBillions, { n: fmt.smart(mass / 1e9) });
    else if (mass !== null && mass >= 1e6) massSay = t(T.massMillions, { n: fmt.smart(mass / 1e6) });
    else if (mass !== null) massSay = t(T.mass, { n: fmt.smart(mass) });
    const spinSay = period === null ? null : period < 1 ? t(T.spins, { n: fmt.smart(1 / period) }) : t(T.spinsSlow, { n: fmt.smart(period) });
    return buildSentence(lead, [massSay, spinSay]);
  },

  dso(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const distLy = pickNumber(md, 'distLy');
    const lo = pickNumber(md, 'distLyLow');
    const hi = pickNumber(md, 'distLyHigh');
    const kind = String(pick(md, 'kind') || 'other');
    const type = pick(md, 'typeText') ? String(pick(md, 'typeText')).toLowerCase() : (T.kinds[kind] || T.kinds.other);
    const sizeLy = pickNumber(md, 'sizeLy');
    const con = pick(md, 'con');
    const name = displayName(record);
    let lead;
    if (pick(md, 'home') === true && distLy !== null) lead = t(T.leadHome, { name, dist: fmt.int(distLy) });
    else if (lo !== null && hi !== null) lead = t(T.leadRange, { name, type, lo: fmt.int(lo), hi: fmt.int(hi) });
    else if (distLy !== null) lead = t(T.lead, { name, type, dist: fmt.int(distLy) });
    else lead = t(T.leadUntyped, { name, dist: '?' });
    return buildSentence(lead, [
      con ? t(T.constellation, { con: String(con) }) : null,
      sizeLy !== null && sizeLy >= 1 ? t(T.size, { n: fmt.int(sizeLy) }) : null,
      distLy !== null && distLy >= 1e6 ? t(T.seenAsMillions, { n: fmt.smart(distLy / 1e6) }) : null,
      distLy !== null && distLy < 1e6 ? t(T.seenAs, { n: fmt.int(distLy) }) : null,
    ]);
  },

  exoplanet(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const distLy = pickNumber(md, 'distLy');
    const host = pick(md, 'host');
    const rade = pickNumber(md, 'radiusEarths');
    const mass = pickNumber(md, 'massEarths');
    const period = pickNumber(md, 'periodDays');
    const year = pickNumber(md, 'discYear');
    const method = pick(md, 'method');
    const dist = distLy !== null ? fmt.smart(distLy) : '?';
    const lead = host ? t(T.lead, { name: displayName(record), host: String(host), dist }) : t(T.leadNoHost, { name: displayName(record), dist });
    return buildSentence(lead, [
      rade !== null && rade >= 1.05 ? t(T.size, { n: fmt.smart(rade) }) : null,
      rade !== null && rade < 0.95 ? t(T.sizeSmaller, { n: `${fmt.int(rade * 100)}%` }) : null,
      period !== null && period >= 2 ? t(T.year, { n: fmt.smart(period) }) : null,
      period !== null && period < 2 ? t(T.yearHours, { n: fmt.smart(period * 24) }) : null,
      year !== null ? (method ? t(T.found, { year: fmt.int(year), method: String(method).toLowerCase() }) : t(T.foundYear, { year: fmt.int(year) })) : null,
    ]);
  },

  star(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const distLy = pickNumber(md, 'distLy');
    const spect = String(pick(md, 'spect') || '');
    const letter = spect.charAt(0).toUpperCase();
    const colour = T.colours && Object.prototype.hasOwnProperty.call(T.colours, letter) ? T.colours[letter] : null;
    const lum = pickNumber(md, 'lum');
    const lead = distLy !== null
      ? t(distLy < 20 ? T.leadNear : T.lead, { name: displayName(record), dist: fmt.smart(distLy) })
      : t(COPY.templates.satellite.lead, { name: displayName(record) });
    return buildSentence(lead, [
      colour ? t(T.colour, { colour }) : null,
      distLy !== null && distLy >= 1.5 ? t(T.seenAs, { n: fmt.int(distLy) }) : null,
      distLy !== null && distLy < 1.5 ? t(T.seenAsMonths, { n: fmt.int(distLy * 12) }) : null,
      lum !== null && lum >= 1.5 ? t(T.luminosity, { n: fmt.int(lum) }) : null,
      lum !== null && lum > 0 && lum < 0.5 ? t(T.dimmer, { n: `${fmt.smart(lum * 100)}%` }) : null,
    ]);
  },

  world(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const isMoon = String(record.id || '').toLowerCase() === 'moon';
    const phase = pick(md, 'phase', 'phaseName');
    const riseMs = pickTime(md, 'riseMs', 'riseTime');
    const explicitDiameter = pickNumber(md, 'diameterKm');
    const radiusKm = pickNumber(md, 'radiusKm');
    const diameterKm =
      explicitDiameter !== null ? explicitDiameter : radiusKm !== null ? radiusKm * 2 : null;
    const distanceSay = compare(
      'distanceKm',
      m.distEarthKm !== null ? m.distEarthKm : m.altKm,
    );
    const lead = isMoon
      ? t(T.leadMoon, { name: displayName(record) })
      : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      phase ? t(T.whyPhase, { phase: String(phase) }) : null,
      riseMs !== null ? t(T.whyRise, { time: timeText.hhmm(riseMs) }) : null,
      distanceSay ? t(T.distance, { distance: distanceSay }) : null,
      diameterKm !== null ? t(T.diameter, { n: fmt.int(diameterKm) }) : null,
    ]);
  },
};

function firstSentence(record, ctx, m, passInfo) {
  const klass = klassOf(record);
  const builder = TEMPLATES[klass];
  const template = COPY.templates[klass];
  if (!builder || !template) {
    // No template for this class: say what it is and stop. Never invent.
    return buildSentence(
      t(COPY.templates.satellite.lead, { name: displayName(record) }),
      [],
    );
  }
  const sentence = builder(record, ctx, m, passInfo, template);
  return sentence.length > MAX_FIRST_SENTENCE
    ? sentence.slice(0, MAX_FIRST_SENTENCE - 1).trimEnd() + COPY.punctuation.ellipsis
    : sentence;
}

// ---------------------------------------------------------------------------------------
// Block 3: comparison chips. Scale first, then distance, speed, brightness. At most three.
// ---------------------------------------------------------------------------------------

function comparisons(record, m) {
  const md = meta(record);
  const onTheGround = klassOf(record) === 'site';
  // Never the heliocentric distance: "8 light-minutes away" for an asteroid one AU from
  // the SUN is false, because the asteroid may be on the far side of it. A distance chip
  // is only written when the distance from the observer's own world is known.
  // A star's distance is light-years and has its own rows; "x the Moon's distance" for Sirius is
  // a true number that means nothing.
  const distanceKm = onTheGround || ['star', 'exoplanet', 'dso', 'exotic'].includes(klassOf(record)) ? null : m.altKm !== null ? m.altKm : m.distEarthKm;
  const candidates = [
    compare('sizeM', pickNumber(md, 'sizeM', 'diameterM', 'lengthM')),
    compare('distanceKm', distanceKm),
    compare('speedKmh', m.speedKmh),
    compare('magnitude', pickNumber(md, 'magnitude', 'mag')),
  ];
  const out = [];
  for (const c of candidates) {
    if (c && !out.includes(c)) out.push(c);
    if (out.length === MAX_COMPARISONS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Block 4: "right now"
// ---------------------------------------------------------------------------------------

function latText(latDeg) {
  const v = Math.abs(latDeg);
  return t(latDeg >= 0 ? COPY.card.values.north : COPY.card.values.south, { n: fmt.num(v, 1) });
}

function lonText(lonDeg) {
  const v = Math.abs(lonDeg);
  return t(lonDeg >= 0 ? COPY.card.values.east : COPY.card.values.west, { n: fmt.num(v, 1) });
}

/**
 * The "right now" rows the card will render, as [label, value] pairs, with no DOM anywhere.
 *
 * Exported so a test can assert what the CARD says and not only what the propagator returns.
 * Those are two different claims: a correct vector with an unfixed card still printed an Earth
 * latitude for a lunar landing site, because the geodetic conversion was applied on the strength
 * of a frame string the propagator had already got wrong.
 */
export function rightNowFor(record, ctx) {
  if (!record || !ctx) return [];
  const m = measure(record, ctx);
  return rightNowRows(record, m, nextPass(record, ctx, m));
}

function rightNowRows(record, m, passInfo) {
  const R = COPY.card.rows;
  const V = COPY.card.values;
  const rows = [];
  // An object nobody can place. NOT "could not work this out": that says the arithmetic failed,
  // and the truth is that the fact has never existed. There is no height row, because there is no
  // height to fail at.
  const md = meta(record);
  if (pick(md, 'unplaceable')) {
    rows.push([R.whereabouts, COPY.card.nobodyKnows]);
    const lastKnown = pick(md, 'lastKnown');
    if (lastKnown) rows.push([R.lastSeen, String(lastKnown)]);
    return rows;
  }
  if (!m.ok) {
    rows.push([R.altitude, COPY.card.couldNotLook]);
    return rows;
  }
  if (isEarthFrame(m.frame)) {
    // A record whose propagator is `fixed` is standing on the ground, whatever class it is: a
    // dish, a landing site, or a lightsaber in a case in Houston. It does not PASS OVER the place
    // it is at, and "height above the ground" of a museum standing on that ground is 0 km, which
    // is a row that costs a line and says nothing.
    const stands = (record && record.propagator === 'fixed') || klassOf(record) === 'site';
    if (!(stands && m.altKm !== null && Math.abs(m.altKm) < 0.05)) {
      rows.push([
        R.altitude,
        m.altKm !== null ? t(V.km, { n: fmt.int(m.altKm) }) : COPY.card.couldNotLook,
      ]);
    }
    if (m.speedKmh !== null && m.speedKmh > 0.5) {
      rows.push([R.speed, t(V.kmh, { n: fmt.int(m.speedKmh) })]);
    }
    if (!stands) {
      const lit = sunlitState(record, m.tMs);
      if (lit) rows.push([R.sunlight, lit === 'sunlit' ? V.inSunlight : V.inShadow]);
    }
    if (m.latDeg !== null && m.lonDeg !== null) {
      const label = stands ? R.location : R.groundPoint;
      rows.push([label, t(V.latLon, { lat: latText(m.latDeg), lon: lonText(m.lonDeg) })]);
    }
  } else if (m.worldId && m.worldId !== 'sun') {
    // On, or around, another world. No Earth latitude, no "height above the ground": the ground
    // in question is not Earth's, and saying so is the whole point of this block.
    const world = worldName(m.worldId);
    if (m.latDeg !== null && m.lonDeg !== null) {
      rows.push([
        R.location,
        world
          ? t(V.latLonOn, { lat: latText(m.latDeg), lon: lonText(m.lonDeg), world })
          : t(V.latLon, { lat: latText(m.latDeg), lon: lonText(m.lonDeg) }),
      ]);
    } else if (world) {
      rows.push([R.onWorld, world]);
    }
    rows.push([
      R.distanceFromEarth,
      m.distEarthKm !== null ? t(V.km, { n: fmt.int(m.distEarthKm) }) : COPY.card.couldNotLook,
    ]);
    if (m.speedKmh !== null && m.speedKmh > 0.5) {
      rows.push([R.speed, t(V.kmh, { n: fmt.int(m.speedKmh) })]);
    }
  } else if (klassOf(record) === 'exotic') {
    const distLy = pickNumber(md, 'distLy');
    const lo = pickNumber(md, 'distLyLow');
    const hi = pickNumber(md, 'distLyHigh');
    if (lo !== null && hi !== null) rows.push([R.distanceRange, t(V.lightYearsRange, { lo: fmt.int(lo), hi: fmt.int(hi) })]);
    else rows.push([R.distanceFromSun, distLy !== null ? t(V.lightYears, { n: fmt.int(distLy) }) : COPY.card.couldNotLook]);
    if (distLy !== null) {
      rows.push([R.lightLeft, distLy >= 1e9 ? t(V.billionYearsAgo, { n: fmt.smart(distLy / 1e9) }) : distLy >= 1e6 ? t(V.millionYearsAgo, { n: fmt.smart(distLy / 1e6) }) : t(V.yearsAgo, { n: fmt.int(distLy) })]);
    }
    const note = pick(md, 'distanceNote');
    if (note) rows.push([R.distanceNote, String(note)]);
    const mass = pickNumber(md, 'massMsun');
    const mLo = pickNumber(md, 'massMsunLow');
    const mHi = pickNumber(md, 'massMsunHigh');
    if (mLo !== null && mHi !== null) rows.push([R.mass, t(V.sunsRange, { lo: fmt.smart(mLo), hi: fmt.smart(mHi) })]);
    else if (mass !== null) rows.push([R.mass, mass >= 1e9 ? t(V.billionSuns, { n: fmt.smart(mass / 1e9) }) : mass >= 1e6 ? t(V.millionSuns, { n: fmt.smart(mass / 1e6) }) : t(V.suns, { n: fmt.smart(mass) })]);
    const period = pickNumber(md, 'periodS');
    if (period !== null) rows.push([R.spin, period < 1 ? t(V.milliseconds, { n: fmt.smart(period * 1000) }) : t(V.seconds, { n: fmt.smart(period) })]);
    const src = pick(md, 'source');
    if (src) rows.push([R.source, String(src)]);
  } else if (klassOf(record) === 'dso') {
    const distLy = pickNumber(md, 'distLy');
    const lo = pickNumber(md, 'distLyLow');
    const hi = pickNumber(md, 'distLyHigh');
    if (lo !== null && hi !== null) rows.push([R.distanceRange, t(V.lightYearsRange, { lo: fmt.int(lo), hi: fmt.int(hi) })]);
    else rows.push([R.distanceFromSun, distLy !== null ? t(V.lightYears, { n: fmt.int(distLy) }) : COPY.card.couldNotLook]);
    if (distLy !== null) rows.push([R.lightLeft, distLy >= 1e6 ? t(V.millionYearsAgo, { n: fmt.smart(distLy / 1e6) }) : t(V.yearsAgo, { n: fmt.int(distLy) })]);
    const type = pick(md, 'typeText');
    if (type) rows.push([R.objectType, String(type) + (pick(md, 'hubble') ? ` (${pick(md, 'hubble')})` : '')]);
    const sizeLy = pickNumber(md, 'sizeLy');
    if (sizeLy !== null && sizeLy >= 1) rows.push([R.across, t(V.lightYears, { n: fmt.int(sizeLy) })]);
    const con = pick(md, 'con');
    if (con) rows.push([R.constellation, String(con)]);
    const desig = pick(md, 'designation');
    const messier = pickNumber(md, 'messier');
    if (desig || messier !== null) rows.push([R.catalogue, [messier !== null ? `M${fmt.int(messier)}` : null, desig].filter(Boolean).join(COPY.punctuation.separator)]);
    const mag = pickNumber(md, 'mag');
    if (mag !== null) rows.push([R.brightness, t(V.magnitude, { n: fmt.smart(mag) })]);
  } else if (klassOf(record) === 'exoplanet') {
    const distLy = pickNumber(md, 'distLy');
    rows.push([R.distanceFromSun, distLy !== null ? t(V.lightYears, { n: fmt.smart(distLy) }) : COPY.card.couldNotLook]);
    const host = pick(md, 'host');
    if (host) rows.push([R.hostStar, String(host) + (pick(md, 'starSpect') ? ` (${pick(md, 'starSpect')})` : '')]);
    const rade = pickNumber(md, 'radiusEarths');
    if (rade !== null) rows.push([R.planetRadius, t(V.earths, { n: fmt.smart(rade) })]);
    const mass = pickNumber(md, 'massEarths');
    if (mass !== null) rows.push([R.planetMass, t(V.earths, { n: fmt.smart(mass) })]);
    const period = pickNumber(md, 'periodDays');
    if (period !== null) rows.push([R.yearLength, period >= 2 ? t(V.days, { n: fmt.smart(period) }) : t(V.hours, { n: fmt.smart(period * 24) })]);
    const year = pickNumber(md, 'discYear');
    const method = pick(md, 'method');
    if (year !== null) rows.push([R.found, method ? t(V.yearByMethod, { year: fmt.int(year), method: String(method) }) : fmt.int(year)]);
    const asOf = pick(md, 'asOf');
    if (asOf) rows.push([R.catalogueCopy, t(V.asOf, { date: String(asOf) })]);
  } else if (klassOf(record) === 'star') {
    // Light-years, not astronomical units: 268 000 au for Proxima is a number nobody can hold.
    const distLy = pickNumber(md, 'distLy');
    rows.push([R.distanceFromSun, distLy !== null ? t(V.lightYears, { n: fmt.smart(distLy) }) : COPY.card.couldNotLook]);
    if (distLy !== null) {
      rows.push([R.lightLeft, distLy >= 1.5 ? t(V.yearsAgo, { n: fmt.int(distLy) }) : t(V.monthsAgo, { n: fmt.int(distLy * 12) })]);
    }
    const spect = pick(md, 'spect');
    if (spect) rows.push([R.spectralType, String(spect)]);
    const mag = pickNumber(md, 'mag');
    if (mag !== null) rows.push([R.brightness, t(V.magnitude, { n: fmt.smart(mag) })]);
    const lum = pickNumber(md, 'lum');
    if (lum !== null && lum > 0) rows.push([R.luminosity, t(V.suns, { n: fmt.smart(lum) })]);
    const hip = pick(md, 'hip');
    if (hip) rows.push([R.catalogue, `HIP ${hip}`]);
  } else {
    rows.push([
      R.distanceFromSun,
      m.distSunKm !== null
        ? t(V.au, { n: fmt.smart(m.distSunKm / UNITS.AU_KM) })
        : COPY.card.couldNotLook,
    ]);
    rows.push([
      R.distanceFromEarth,
      m.distEarthKm !== null
        ? t(V.au, { n: fmt.smart(m.distEarthKm / UNITS.AU_KM) })
        : COPY.card.couldNotLook,
    ]);
    if (m.lightMinutes !== null) {
      rows.push([R.lightTime, t(V.minutes, { n: fmt.smart(m.lightMinutes) })]);
    }
    if (m.speedKmh !== null && m.speedKmh > 0.5) {
      rows.push([R.speed, t(V.kmh, { n: fmt.int(m.speedKmh) })]);
    }
  }

  if (passInfo.state === PASS_OK) {
    const p = passInfo.pass;
    const fists = fistsWords(p.peakEl * DEG);
    rows.push([
      R.nextPass,
      timeText.dayAndTime(p.startMs) + (fists ? COPY.punctuation.comma + fists : ''),
    ]);
  } else if (passInfo.state === PASS_NO_OBSERVER) {
    rows.push([R.nextPass, COPY.sky.noObserver]);
  } else if (passInfo.state === PASS_NONE) {
    rows.push([R.nextPass, COPY.sky.noPass]);
  } else if (passInfo.state === PASS_ERROR) {
    rows.push([R.nextPass, COPY.sky.couldNotLook]);
  }
  return rows;
}

// ---------------------------------------------------------------------------------------
// Block 5: "see it from here" -- the copy pattern that is the actual feature
// ---------------------------------------------------------------------------------------

/** The see-it-from-here sentence. Exported for the tests. */
export function seeItLine(record, ctx, m, passInfo) {
  const klass = klassOf(record);
  if (pick(meta(record), 'unplaceable')) return COPY.sky.nowhereToLook;
  // `fixed` means it does not move, whatever class it is: a dish, a landing site, or a lightsaber
  // in a case in Houston. Without this a museum exhibit got "too far away to pick out by eye".
  if (klass === 'site' || (record && record.propagator === 'fixed')) {
    if (isEarthFrame(m.frame) || !m.worldId || m.worldId === 'earth') return COPY.sky.onTheGround;
    const world = worldName(m.worldId);
    return world ? t(COPY.sky.onAnotherWorld, { world }) : COPY.sky.notVisibleFromGround;
  }
  if (klass === 'world') {
    const riseMs = pickTime(meta(record), 'riseMs', 'riseTime');
    return riseMs !== null
      ? t(COPY.sky.worldRise, { time: timeText.hhmm(riseMs) })
      : COPY.sky.worldNoRise;
  }
  // A star, a nebula or a galaxy is not "too far away": its distance is the point of it. What
  // decides whether a person can see it is brightness -- magnitude 6.5 from a dark site -- and the
  // record knows its magnitude. The Milky Way is the one thing here everyone has seen.
  if (['star', 'dso', 'exotic', 'exoplanet'].includes(klass)) {
    if (klass === 'exoplanet') return COPY.sky.starOnly;
    const md = meta(record);
    const mag = pickNumber(md, 'mag');
    if (pick(md, 'home') === true) return COPY.sky.nakedEye;
    if (mag !== null) return mag <= 6.5 ? COPY.sky.nakedEye : COPY.sky.needsTelescope;
    return COPY.sky.needsTelescope;
  }
  if (!isEarthFrame(m.frame)) return COPY.sky.notVisibleFromGround;
  switch (passInfo.state) {
    case PASS_NO_OBSERVER:
      return COPY.sky.noObserver;
    case PASS_NONE:
      return COPY.sky.noPass;
    case PASS_ERROR:
      return COPY.sky.couldNotLook;
    case PASS_NOT_APPLICABLE:
      return ctx && ctx.observer ? COPY.sky.notVisibleFromGround : COPY.sky.noObserver;
    default:
      break;
  }
  const p = passInfo.pass;
  const dir = compassWords(p.startAz * DEG);
  const fists = fistsWords(p.peakEl * DEG);
  const time = timeText.hhmm(p.startMs);
  const minutes = Number.isFinite(p.endMs - p.startMs)
    ? Math.max(1, Math.round((p.endMs - p.startMs) / 60000))
    : null;
  const line =
    minutes !== null
      ? t(COPY.sky.lookLine, { dir, fists, time, mins: fmt.int(minutes) })
      : t(COPY.sky.lookLineNoDuration, { dir, fists, time });
  if (p.sunlit === true) return line + ' ' + COPY.sky.sunlit;
  if (p.sunlit === false) return line + ' ' + COPY.sky.notSunlit;
  return line;
}

// ---------------------------------------------------------------------------------------
// Block 7: the class-and-age line. Spec 0001 principle 2, made visible.
// ---------------------------------------------------------------------------------------

function ageParts(ageMs) {
  const minutes = ageMs / 60000;
  if (minutes < 90) {
    const n = Math.max(0, Math.round(minutes));
    return { n: fmt.int(n), unit: fmt.plural(n, COPY.cls.minuteWord, COPY.cls.minutesWord) };
  }
  const hours = minutes / 60;
  if (hours < 48) {
    const n = Math.round(hours);
    return { n: fmt.int(n), unit: fmt.plural(n, COPY.cls.hourWord, COPY.cls.hoursWord) };
  }
  const days = Math.round(hours / 24);
  if (days < 730) {
    return { n: fmt.int(days), unit: fmt.plural(days, COPY.cls.dayWord, COPY.cls.daysWord) };
  }
  // Past two years, days stop being a quantity a reader can feel. The Roadster's evidence is
  // 3 094 days old, which is a number; it is 8 years old, which is a sentence.
  const years = Math.round(days / 365.25);
  return { n: fmt.int(years), unit: fmt.plural(years, COPY.cls.yearWord, COPY.cls.yearsWord) };
}

export function classLine(record, m) {
  // Before the class, the absence. A record with no propagator has no position to have a class
  // ABOUT, and "position propagated from elements of unknown age" would be a sentence about
  // elements that do not exist.
  if (pick(meta(record), 'unplaceable')) return COPY.cls.unplaced;
  const cls = m.cls || (record && record.cls) || '';
  switch (cls) {
    case 'measured':
      return COPY.cls.measured;
    case 'inferred': {
      const epoch = record ? record.epoch : null;
      // "Elements" is a claim about HOW the position was worked out, and a fixed record has none.
      // GP records carry `satrec` (an SGP4 element set), not `elements`; both are elements in
      // the sense this sentence means. MEASURED 2026-09-08: every satellite card said
      // "worked out rather than measured" with no age, the ISS included, on 19-hour-old data.
      if (!record || !(record.elements || record.satrec)) return COPY.cls.inferredNoElements;
      if (!Number.isFinite(epoch) || !Number.isFinite(m.tMs)) return COPY.cls.inferredUnknownAge;
      return t(COPY.cls.inferred, ageParts(Math.max(0, m.tMs - epoch)));
    }
    case 'illustrative':
      return COPY.cls.illustrative;
    case 'sample': {
      const why = pick(meta(record), 'why');
      return COPY.cls.sample + (why ? COPY.punctuation.dash + String(why) : '');
    }
    default:
      return COPY.cls.unknown;
  }
}

/**
 * Block 7a: the second half of the honesty line, when there is one.
 *
 * Three cases, and each replaces a sentence the class line alone would get wrong:
 *
 *  * A SURFACE OBJECT NEAR A SURVEYED POINT. Two numbers for two things. `classLine` can only
 *    say "inferred"; this says which part is measured to 0.4 m and which part is not, and when
 *    the object's own precision does not exist it says THAT rather than inventing a metre figure.
 *  * AN ORBIT NOBODY HAS LOOKED AT. `classLine` prints the age of `record.epoch`, which the
 *    emitter sets to the last observation and not to the osculating epoch. This adds the date
 *    and JPL's own caveat, so the card says why the number may be worse than it looks.
 *  * A RECORD WITH NO POSITION. Says why, and what it would take to find out.
 *
 * Returns null when the record has nothing extra to admit, which is most of them.
 */
function honestyClause(record) {
  const md = meta(record);
  const C = COPY.cls;

  if (pick(md, 'unplaceable')) {
    const why = pick(md, 'whyUnknown');
    const would = pick(md, 'wouldNeed');
    const parts = [];
    if (why) parts.push(t(COPY.unplaced.why, { whyUnknown: String(why) }));
    if (would) parts.push(t(COPY.card.wouldNeed, { wouldNeed: String(would) }));
    return parts.length ? parts.join(' ') : null;
  }

  // Not yet in the public catalogue (spec 0026 req 15): the elements are the operator's own, so
  // the position is inferred whatever their age, and the card says where the number will come from.
  if (pick(md, 'provisional') === true) return C.provisional;

  // Bolted to something else. The class line above printed the CARRIER's class, because the
  // carrier's propagator and elements are what produced the number; this says whose position it
  // was. It comes before the precision cases because an attached row has neither an anchor nor
  // an observation arc of its own -- it has a spacecraft.
  const carrier = pick(md, 'attachedToName');
  if (carrier) return t(C.aboard, { carrier: String(carrier) });

  const objectM = pick(md, 'objectPrecisionM');
  const how = pick(md, 'objectHow');
  const howWords = how && Object.prototype.hasOwnProperty.call(C.how, how) ? C.how[how] : null;
  const anchorName = pick(md, 'anchorName');
  const anchorM = pickNumber(md, 'anchorUncertaintyM');
  if (anchorName && anchorM !== null) {
    // `unknown` is the registry's reserved literal and the only non-numeric value it allows here.
    if (typeof objectM === 'number') {
      return t(C.precisionSplit, {
        anchorName: String(anchorName),
        anchorM: fmt.metres(anchorM),
        how: howWords || '',
        objectM: fmt.metres(objectM),
      });
    }
    // Located, but with no published precision: say who looked and stop. `unsurveyed` means
    // nobody looked at all and keeps the older sentence, which is the stronger admission.
    if (howWords && how !== 'unsurveyed') {
      return t(C.precisionSplitHowOnly, {
        anchorName: String(anchorName),
        anchorM: fmt.metres(anchorM),
        how: howWords,
      });
    }
    return t(C.precisionSplitUnknown, {
      anchorName: String(anchorName),
      anchorM: fmt.metres(anchorM),
    });
  }
  if (typeof objectM === 'number' && howWords) {
    return t(C.precisionOwn, { objectM: fmt.metres(objectM), how: howWords });
  }

  const arcEnd = pick(md, 'arcEnd');
  const caveat = pick(md, 'orbitCaveat');
  if (arcEnd && caveat) {
    return t(C.inferredArc, {
      date: timeText.longDate(Date.parse(String(arcEnd))),
      caveat: String(caveat),
    });
  }
  return null;
}

/**
 * Block 7c: "Often said". One claim, one correction, one source, per myth on the record.
 *
 * On this subject the debunk is reliably the better story -- the most-repeated fact about golf on
 * the Moon is five times too big -- so this is a section of its own rather than a footnote. It
 * renders nothing at all for a record with no myths, which is every record outside this layer.
 */
function mythSection(record) {
  const myths = meta(record).myths;
  if (!Array.isArray(myths) || !myths.length) return null;
  const wrap = section('sr-card__block sr-card__myths', COPY.myth.label);
  let wrote = 0;
  for (const myth of myths) {
    if (!myth || !myth.claim || !myth.correction) continue;
    const template = myth.contested ? COPY.myth.contested : COPY.myth.line;
    const line = el('p', 'sr-card__myth', t(template, {
      claim: String(myth.claim),
      correction: String(myth.correction),
    }));
    wrap.appendChild(line);
    if (myth.source) {
      wrap.appendChild(el('p', 'sr-card__mythsource',
        COPY.source.prefix + COPY.punctuation.colon + String(myth.source)));
    }
    wrote += 1;
  }
  return wrote ? wrap : null;
}

/**
 * Block 4c: the two ends of "this thing is bolted to that thing".
 *
 * ON A CARRIER'S CARD it is "Also aboard", one button per row riding on it. The Golden Record has
 * no dot of its own -- data/attached.js says at length why a second dot under Voyager's would be
 * a bug rather than a feature -- so this list is the only way to reach it, and the note under it
 * says so rather than leaving a visitor hunting for something they can see on the model.
 *
 * ON THE ATTACHED CARD it is "Riding on", one button back to the spacecraft. Without it the card
 * is a dead end: the object has no dot, so there is nothing on the map to tap to get back.
 *
 * NEITHER BUTTON CHANGES THE SELECTION. It calls showCard() and nothing else, so the map goes on
 * drawing one object where there is one object and the camera stays where the visitor put it.
 * Selecting an attached record would ask heroes.js to draw a second spacecraft at the first one's
 * exact position, which is the failure the whole `attached` kind exists to avoid.
 *
 * Returns null for every record that neither carries anything nor rides on anything, which is
 * all but three of them.
 */
function aboardSection(record, ctx) {
  const md = meta(record);
  const byId = ctx && typeof ctx.recordById === 'function' ? ctx.recordById : null;

  const carrierId = pick(md, 'attachedTo');
  if (carrierId) {
    const carrier = byId ? byId(carrierId) : null;
    if (!carrier) return null; // the carrier's layer is not loaded: no link rather than a dead one
    const wrap = section('sr-card__block sr-card__aboard', COPY.aboard.ridingLabel);
    wrap.appendChild(aboardButton(carrier.name, COPY.aboard.backTitle, () => showCard(carrier, ctx)));
    return wrap;
  }

  const riding = attachedOdditiesFor(record && record.id);
  if (!riding.length) return null;
  const wrap = section('sr-card__block sr-card__aboard', COPY.aboard.label);
  let wrote = 0;
  for (const entry of riding) {
    const derived = attachedOddityRecord(entry, record);
    if (!derived) continue;
    wrap.appendChild(aboardButton(entry.display, COPY.aboard.openTitle, () => showCard(derived, ctx)));
    wrote += 1;
  }
  if (!wrote) return null;
  wrap.appendChild(el('p', 'sr-card__aboardnote', COPY.aboard.note));
  return wrap;
}

function aboardButton(label, title, onClick) {
  const b = el('button', 'sr-card__aboardrow', String(label || ''));
  b.type = 'button';
  b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Block 7b: what the drawn shape actually is. Three states, and the record already knows which:
 * `meta.drawsAs` is written at parse time from the matched registry/rockets.yaml row AND the level
 * it matched at, so this function never learns what three.js is. The level matters: a row that
 * says `stands_for: variant` about itself still only gets the family sentence when the launch
 * reached it through a family or provider string, because a family match cannot honestly name an
 * exact vehicle. data/parsers.js caps it; tests/test_contract.mjs asserts the cap.
 *
 * The family sentence covers the HEIGHT as well as the shape, because the size chip beside it is
 * that same row's height_m.
 *
 * Returns null for anything with no `meta.drawsAs`, which is still every class but two: the
 * launches, and now the oddities, whose emitter writes it from registry/oddities.yaml's own
 * `shape.stands_for`. Everything else is a class stand-in the card has never claimed otherwise
 * about; scene/realmodels.js names the ones that leaves undisclosed.
 *
 * TWO SETS OF STRINGS, ONE SWITCH. The three sentences above say "rocket" out loud, which is
 * right for the only class that has ever printed them and wrong for a lapel pin, so a record
 * carrying no matched rocket takes copy/en.js's class-neutral triple instead. That is the whole
 * generalisation: the block ordering, the disputed-height clause and the callers are unchanged.
 *
 * Exported for tests/test_contract.mjs, exactly as rightNowFor() is: the sentence a card prints
 * about its own drawing is a claim, and a claim nobody measures is a comment.
 */
/**
 * The "drawn as" line for every class that never carried `meta.drawsAs` -- which was every
 * satellite, station, probe, site and comet. Derived from what the scene already knows: a
 * real model of THIS object (NASA's Hubble), a class default (one communications bus for the
 * whole geostationary ring), or the procedural shape for the class. A stand-in must say so, and
 * until this every one of those cards was silent about it.
 */
function derivedDrawingLine(record, T) {
  const klass = record && record.klass ? String(record.klass) : '';
  if (!klass || klass === 'world') return null;
  let entry = null;
  try { entry = realModelFor(record); } catch { entry = null; }
  if (entry && entry.name) {
    return entry.generic
      ? t(T.objectFamily, { name: String(entry.name) })
      : t(T.objectVariant, { name: String(entry.name) });
  }
  // An extreme object that is a star (Betelgeuse) is drawn like the others, but the reason is
  // different: it has a shape, it is just a point at this scale.
  const key = klass === 'exotic' && pick(meta(record), 'kind') === 'star' && T.classShape && T.classShape.exoticStar ? 'exoticStar' : klass;
  const shape = T.classShape && Object.prototype.hasOwnProperty.call(T.classShape, key) ? T.classShape[key] : null;
  return shape ? t(T.objectFamily, { name: shape }) : null;
}

/** What the line under the selected dot is, or null when the thing does not lap. Exported for the test. */
export function orbitLineLine(record) {
  const periodMs = periodMsOf(record);
  if (!periodMs) return null;
  return periodMs > 365.25 * 86400e3 ? COPY.drawing.orbitLineYear : COPY.drawing.orbitLine;
}

/** The words for a record's train, or null. Exported for the test. */
export function trainSentence(record, train) {
  if (!train || !record || train.count < 2) return null;
  const T = COPY.train;
  const idx = train.members.findIndex((r) => r && r.id === record.id);
  const parts = [t(T.oneOf, { n: fmt.int(train.count), designator: train.designator })];
  if (idx === 0) parts.push(T.youLead);
  else if (train.lead) parts.push(t(T.leads, { name: displayName(train.lead), position: fmt.int(idx + 1) }));
  if (train.stillRaising === true) parts.push(t(T.stillRaising, { alt: fmt.int(train.meanAltKm) }));
  else if (train.stillRaising === false) parts.push(t(T.spreadOut, { alt: fmt.int(train.meanAltKm) }));
  return parts.join(' ');
}

function trainSection(record, ctx, m) {
  const layer = ctx && Array.isArray(ctx.layers) ? ctx.layers.find((l) => l.id === record.layer) : null;
  if (!layer || typeof layer.groupBy !== 'function') return null;
  const records = ctx && typeof ctx.recordsFor === 'function' ? ctx.recordsFor(layer.id) : [];
  const train = trainOf(record, records, m.tMs, { stillRaisingBelowKm: layer.train && layer.train.still_raising_below_km });
  const words = trainSentence(record, train);
  if (!words) return null;
  const wrap = section('sr-card__block sr-card__train', COPY.train.label);
  wrap.appendChild(el('p', 'sr-card__sentence', words));
  return wrap;
}

export function drawingLine(record) {
  const md = meta(record);
  const drawsAs = pick(md, 'drawsAs');
  const T = COPY.drawing;
  if (!drawsAs) return derivedDrawingLine(record, T);
  const rocket = pick(md, 'rocket');
  const name = pick(md, 'drawnName') || rocket;
  const isLaunch = rocket != null;
  let line;
  if (drawsAs === 'generic') {
    const generic = isLaunch ? T.generic : T.objectGeneric;
    line = name ? t(generic, { name: String(name) }) : T.genericUnnamed;
  } else if (drawsAs === 'family') {
    line = t(isLaunch ? T.family : T.objectFamily, { name: String(name || '') });
  } else {
    line = t(isLaunch ? T.variant : T.objectVariant, { name: String(name || '') });
  }
  const disputed = pick(md, 'disputedHeight');
  if (disputed) line += COPY.punctuation.separator + t(T.disputed, { disputed: String(disputed) });
  // Where the drawing knowingly differs from the object, in the registry row's own words: an
  // oversized starburst, two golf balls drawn side by side, a print left blank. It is the row
  // that says it, not this file, because only the row knows what its builder exaggerated.
  const departure = pick(md, 'departure');
  if (departure) line += COPY.punctuation.separator + String(departure);
  // And for a thing bolted to another thing, where we hung it. The row carries
  // `mount_class: illustrative` and the registry refuses any other value, so this sentence is
  // printed for exactly the rows that admit the mount is an arrangement rather than a
  // measurement -- which, by that refusal, is all of them.
  if (pick(md, 'mountClass')) line += COPY.punctuation.separator + T.mount;
  return line;
}

// ---------------------------------------------------------------------------------------
// Block 8: the source line. On the card, always -- not in a footer (spec 0013 req 5).
// ---------------------------------------------------------------------------------------

function sourceRow(record, ctx) {
  // A record may carry its own one-line citation. registry/oddities.yaml keeps the full evidence
  // -- Horizons headers, element dumps, why a secondary was used -- for a reviewer and ships this
  // one line for the card, because "Source: registry/oddities.yaml" tells a visitor nothing about
  // where a coordinate came from.
  const cite = pick(meta(record), 'cite');
  if (cite) return { label: String(cite), attribution: null };
  const id = record && record.source ? String(record.source) : null;
  if (!id) return { label: null, attribution: null };
  try {
    const table = ctx && ctx.sources ? ctx.sources.SOURCES : null;
    if (table && table[id]) {
      return { label: table[id].label || id, attribution: table[id].attribution || null };
    }
    const list = ctx && ctx.sources && ctx.sources.status ? ctx.sources.status() : null;
    if (Array.isArray(list)) {
      const row = list.find((r) => r && r.id === id);
      if (row) return { label: row.label || id, attribution: row.attribution || null };
    }
  } catch {
    /* fall through to the bare id, which is still true */
  }
  return { label: id, attribution: null };
}

// ---------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------

function flyTo(record, ctx, m) {
  if (!m.ok || !ctx || !ctx.cameraRig || !ctx.stage) return;
  try {
    const targetScene = ctx.stage.toScene(m.posKm, m.frame);
    if (!targetScene) return;
    const distance = targetScene.length ? Math.max(targetScene.length() * 0.02, 0.05) : 1;
    ctx.cameraRig.flyTo({ targetScene, distance, ms: 800 });
    if (ctx.cameraRig.follow) {
      ctx.cameraRig.follow(() => {
        const p = positionAt(record, ctx.clock.now());
        return p ? ctx.stage.toScene(p, p.frame || record.frame) : null;
      });
    }
  } catch {
    /* a camera that will not fly is not worth breaking the card over */
  }
}

function seeFromHere(record, ctx) {
  try {
    if (ctx && ctx.setMoment) ctx.setMoment(COPY.moments.now.id);
    // main.js spells it `skyView`; accept both rather than silently do nothing.
    const sky = ctx && (ctx.skyview || ctx.skyView);
    if (sky && sky.enter && ctx.observer) sky.enter(ctx.observer);
  } catch {
    /* the moment switcher is the fallback and it is always on screen */
  }
}

function actionButtons(record, ctx, m) {
  const A = COPY.card.actions;
  const buttons = [];

  const fly = el('button', 'sr-btn sr-btn--primary', A.flyTo);
  fly.type = 'button';
  fly.title = A.flyToTitle;
  fly.disabled = !m.ok;
  fly.addEventListener('click', () => flyTo(record, ctx, m));
  buttons.push(fly);

  const see = el('button', 'sr-btn', A.seeFromHere);
  see.type = 'button';
  see.title = A.seeFromHereTitle;
  see.disabled = !isEarthFrame(m.frame) && klassOf(record) !== 'world';
  see.addEventListener('click', () => seeFromHere(record, ctx));
  buttons.push(see);

  // "Tell me before" returns with spec 0015. A disabled button with an apology under it was
  // honest and was also clutter on every card; the review measured it as such.

  return buttons.slice(0, MAX_ACTIONS);
}

// ---------------------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------------------

/**
 * Block 0. The stop's own title and words during a guided trip.
 *
 * It carries no provenance of its own and it never could: the words are written in
 * registry/tours.yaml by a human, and what the app KNOWS about the object is block 7, which is
 * still printed underneath and is still the record's own class. A lead that stated a class would
 * be a hand-written claim standing in front of a measured one.
 */
function leadBlock(lead) {
  const wrap = el('section', 'sr-card__lead');
  if (lead.title) wrap.appendChild(el('h2', 'sr-card__leadtitle', lead.title));
  if (lead.body) wrap.appendChild(el('p', 'sr-card__leadbody', lead.body));
  return wrap;
}

/** A stop with no object behind it: the lead is the whole card. */
function renderLeadOnly(lead) {
  const node = ensureHost();
  clear(node);
  node.dataset.klass = 'world';
  node.dataset.cls = '';
  node.appendChild(leadBlock(lead));
  bodyEl = null;
  node.hidden = false;
  node.classList.add('is-open');
}

function section(className, labelText) {
  const wrap = el('section', className);
  if (labelText) wrap.appendChild(el('h3', 'sr-card__label', labelText));
  return wrap;
}

function render(record, ctx, opts = {}) {
  const lead = opts.lead;
  if (!record) {
    renderLeadOnly(lead);
    return;
  }
  const node = ensureHost();
  const klass = klassOf(record);
  const m = measure(record, ctx);
  const passInfo = nextPass(record, ctx, m);

  clear(node);
  node.dataset.klass = klass;
  node.dataset.cls = String(m.cls || record.cls || '');

  // 0. the trip's own words, above everything and reordering nothing.
  if (lead) node.appendChild(leadBlock(lead));

  // 1. name and class glyph
  const header = el('header', 'sr-card__header');
  const glyph = el('span', `sr-glyph sr-glyph--${klass}`);
  glyph.setAttribute('aria-hidden', 'true');
  header.appendChild(glyph);
  header.appendChild(el('h2', 'sr-card__name', displayName(record)));
  header.appendChild(el('span', 'sr-card__klass', COPY.klass[klass]));
  const close = el('button', 'sr-card__close', COPY.card.close);
  close.type = 'button';
  close.title = COPY.card.closeTitle;
  close.addEventListener('click', hideCard);
  header.appendChild(close);
  node.appendChild(header);

  const body = el('div', 'sr-card__body');
  bodyEl = body;
  node.appendChild(body);

  // 2. one plain sentence
  body.appendChild(el('p', 'sr-card__sentence', firstSentence(record, ctx, m, passInfo)));

  // 2b. a world says how it is drawn, and offers to become the centre (spec 0028 step 0). The
  // compression note is scene/worlds.js's own sentence (`viewScale`), never restated here.
  if (klass === 'world') {
    const vs = ctx && ctx.worlds && typeof ctx.worlds.viewScale === 'function' ? ctx.worlds.viewScale(record.id) : null;
    if (vs && vs.exaggerated && vs.note) body.appendChild(el('p', 'sr-card__note', vs.note));
    const isCentre = ctx && ctx.stage && ctx.stage.worldId === record.id;
    const centre = el('button', 'sr-btn', isCentre
      ? COPY.card.isCentre
      : t(COPY.card.makeCentre, { name: displayName(record) }));
    centre.type = 'button';
    centre.disabled = isCentre || !(ctx && typeof ctx.setStage === 'function');
    centre.addEventListener('click', () => {
      if (ctx && typeof ctx.setStage === 'function' && ctx.setStage(record.id)) render(record, ctx, opts);
    });
    const actions = el('div', 'sr-card__actions');
    actions.appendChild(centre);
    body.appendChild(actions);
  }

  // 3. comparison chips, at most three
  const chips = comparisons(record, m);
  if (chips.length) {
    const wrap = el('ul', 'sr-chips');
    wrap.setAttribute('aria-label', COPY.card.comparisonsLabel);
    for (const chip of chips) wrap.appendChild(el('li', 'sr-chip', chip));
    body.appendChild(wrap);
  }

  // 4. right now
  const rows = rightNowRows(record, m, passInfo);
  if (rows.length) {
    const wrap = section('sr-card__block sr-card__now', COPY.card.rightNowLabel);
    const dl = el('dl', 'sr-rows');
    for (const [label, value] of rows) {
      dl.appendChild(el('dt', 'sr-rows__key', label));
      dl.appendChild(el('dd', 'sr-rows__val', value));
    }
    wrap.appendChild(dl);
    body.appendChild(wrap);
  }

  // 4a. its path: height and ground track over the next lap and a half (spec 0026 req 14)
  const traj = trajectorySection(record, m.tMs);
  if (traj) body.appendChild(traj);

  // 4b. "Often said" -- the myth block, immediately after the facts it corrects. It renders for
  // any record carrying myths and nothing at all for the rest.
  const myths = mythSection(record);
  if (myths) body.appendChild(myths);

  // 4b2. the train this rides in (spec 0026 req 17): how many launched together, who leads, and
  // whether they are still climbing as one thing or have spread out.
  const trainBlock = trainSection(record, ctx, m);
  if (trainBlock) body.appendChild(trainBlock);

  // 4c. what is riding on this, or what this is riding on. Below the facts because it is a way
  // OUT of this card rather than a fact about the object, and above "see it from here" because
  // it is still about the object and not about the visitor.
  const aboard = aboardSection(record, ctx);
  if (aboard) body.appendChild(aboard);

  // 5. see it from here
  const see = section('sr-card__block sr-card__see', COPY.card.seeItLabel);
  see.appendChild(el('p', 'sr-card__seeline', seeItLine(record, ctx, m, passInfo)));
  body.appendChild(see);

  // 6. actions
  const actions = el('div', 'sr-card__actions');
  actions.setAttribute('aria-label', COPY.card.actionsLabel);
  for (const b of actionButtons(record, ctx, m)) actions.appendChild(b);
  body.appendChild(actions);

  // 7. the class-and-age line
  const foot = el('footer', 'sr-card__foot');
  const honesty = honestyClause(record);
  foot.appendChild(el('p', 'sr-card__cls',
    classLine(record, m) + (honesty ? COPY.punctuation.dash + honesty : '')));

  // 7b. what the drawn shape is. Between this and the line above it, the card states that
  // neither the shape nor the path is a measurement of this particular flight.
  const drawn = drawingLine(record);
  if (drawn) foot.appendChild(el('p', 'sr-card__drawn', drawn));
  // 7c. the orbit line, when there is one (scene/orbitline.js draws it for the selection)
  const lap = orbitLineLine(record);
  if (lap) foot.appendChild(el('p', 'sr-card__drawn', lap));

  // 8. the source line
  const src = sourceRow(record, ctx);
  if (src.label) {
    const parts = [COPY.source.prefix + COPY.punctuation.colon + src.label];
    if (src.attribution) parts.push(src.attribution);
    foot.appendChild(el('p', 'sr-card__source', parts.join(COPY.punctuation.separator)));
  } else {
    foot.appendChild(el('p', 'sr-card__source', COPY.source.unknown));
  }
  node.appendChild(foot);

  node.hidden = false;
  node.classList.add('is-open');
}

function subscribe(ctx) {
  if (subscribed || !ctx || !ctx.clock || !ctx.clock.onChange) return;
  subscribed = true;
  try {
    ctx.clock.onChange(() => {
      if (!current) return;
      // A wall-clock throttle on repainting the DOM. It is not a source of any drawn
      // value: every number in the card comes from ctx.clock.now().
      const wall = typeof performance !== 'undefined' ? performance.now() : 0;
      if (wall - lastPaint < REFRESH_MS) return;
      lastPaint = wall;
      try {
        render(current.record, current.ctx, current.opts);
      } catch {
        /* keep the last good card rather than blanking it */
      }
    });
  } catch {
    subscribed = false;
  }
}

// ---------------------------------------------------------------------------------------
// Contract exports
// ---------------------------------------------------------------------------------------

export function showCard(record, ctx, opts = {}) {
  if (!record && !opts.lead) {
    hideCard();
    return;
  }
  current = { record, ctx, opts };
  subscribe(ctx);
  render(record, ctx, opts);
}

export function hideCard() {
  current = null;
  if (!host) return;
  host.classList.remove('is-open');
  host.hidden = true;
  if (bodyEl) clear(bodyEl);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) hideCard();
  });
}
