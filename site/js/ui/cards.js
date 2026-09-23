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
//   2. ONE plain sentence: what it is and why it matters now -- and under it, for a star, an
//      extreme object or a deep-sky object, the hand-kept line on why this one is known (whyLine)
//   3. up to three comparison chips, scale first
//   4. "right now"
//   4b. "often said" -- the myth block, against the facts it corrects
//   4c. "also aboard" / "riding on" -- the link between a spacecraft and what is bolted to it
//   5. "see it from here"
//   6. up to three actions (the third is Share, spec 0033)
//   6a. "Save a picture": the postcard, under the actions
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
 article, typeWords, NAKED_EYE_LIMIT } from '../copy/en.js';
import { propagate } from '../propagate/index.js';
import { realModelFor } from '../scene/realmodels.js';
import { sunlitState } from '../scene/shadow.js';
import { periodMsOf, wholePathKind } from '../scene/orbitline.js';
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
import { shareButton, pictureButton } from './share.js';
import { stage } from '../scene/stage.js';
import { systemOfRecordId, phaseIsMeasured } from '../scene/systems.js';

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
    // A route's own `displayName` names this exact object even when its shape is generic
    // (Tiangong); otherwise a generic route's `name` is a class ("a Starlink") and renames nothing.
    if (entry && entry.displayName) name = String(entry.displayName).trim();
    else if (entry && !entry.generic && entry.name) name = String(entry.name).trim();
  }
  // Then the hand-kept list's own name (data/layers.js NOTABLE), before the catalogue's string.
  if (!name && record && record.meta && record.meta.listName) name = String(record.meta.listName).trim();
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
    // A craft held at a Sun–Earth Lagrange point is DRAWN on Earth's own orbit (data/sample.js,
    // construction A), and that stand-in sits anything up to ~1.1 million km from the real Earth.
    // Its distance from Earth is then the construction's error, not the craft's: the card printed
    // JWST at "0.4x the Moon's distance" and 0.009 radio-minutes, beside a note saying 1.5 million
    // km. The record carries the real range, and it wins.
    const known = pickNumber(meta(record), 'earthRangeKm');
    const earth = known !== null ? null : heliocentricEarth(ctx, tMs);
    if (known !== null && known > 0) {
      out.distEarthKm = known;
      out.lightMinutes = known / UNITS.LIGHT_MINUTE_KM;
    } else if (earth) {
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
      } else if (out.frame === `${world}-inertial`) {
        // In orbit round it (data/sample.js construction D): the height above the sphere the
        // world is drawn as, which is the height the card's orbit sentence gives.
        const r = worldRadiusKm(world);
        if (r) out.altKm = Math.hypot(p.x, p.y, p.z) - r;
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

/**
 * Standing on the ground right now: a pad, a dish, a landing site, a museum case -- or a rocket
 * that has not lifted off yet.
 *
 * The last one is new. An upcoming launch is drawn at its pad until T-0 (propagate/ascent.js), and
 * its card said "Passing over 19.6 N, 110.9 E", "in sunlight" and "Next pass over you" about a
 * rocket four days from leaving the ground. The rows and the pass predictor both ask this one
 * question, so they cannot disagree about it.
 */
function standsStill(record, m) {
  if (!record) return false;
  if (record.propagator === 'fixed' || klassOf(record) === 'site') return true;
  const a = record.propagator === 'ascent' ? record.ascent : null;
  return !!a && Number.isFinite(a.t0Ms) && m && Number.isFinite(m.tMs) && m.tMs < a.t0Ms;
}

function nextPass(record, ctx, m) {
  // Things that do not move -- see standsStill. Asking predictPasses() when the next pass over you
  // is right there is not a bug in the maths, it is a question with no meaning -- and until this
  // line the historic reentries were asking it too.
  const doesNotMove = standsStill(record, m);
  if (!isEarthFrame(m.frame) || doesNotMove || klassOf(record) === 'world') {
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

/**
 * A size worth two figures, not six: "about 131 391 light-years across" came from multiplying an
 * angle by a distance, and neither is known to one part in a hundred thousand.
 */
function roughly(n) {
  if (!(n >= 100)) return Math.round(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

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

// WHERE A FAR BODY IS, from its own orbit rather than from a word somebody typed next to it. Each
// bound is a planet's own, from NASA's planetary fact sheets: Mars's aphelion (1.666 au), Jupiter's
// perihelion (4.950 au) and Neptune's aphelion (30.33 au). "Beyond Neptune" is written only of an
// orbit that never comes inside Neptune's, and "far beyond" only of one whose CLOSEST point is more
// than twice Neptune's distance -- Sedna's is 76 au. Anything else keeps the plain lead, which is
// true of every dwarf planet there is.
const MARS_APHELION_AU = 1.666;
const JUPITER_PERIHELION_AU = 4.95;
const NEPTUNE_APHELION_AU = 30.33;

/** 'belt' | 'beyond' | 'farBeyond' | null, for a record carrying qAu and (if bound) aphelionAu. */
export function farRegion(record) {
  const md = meta(record);
  const q = pickNumber(md, 'qAu');
  const Q = pickNumber(md, 'aphelionAu');
  if (q === null) return null;
  if (Q !== null && q > MARS_APHELION_AU && Q < JUPITER_PERIHELION_AU) return 'belt';
  if (q > 2 * NEPTUNE_APHELION_AU) return 'farBeyond';
  if (q > NEPTUNE_APHELION_AU) return 'beyond';
  return null;
}

/**
 * The lead for a record of the far-bodies layer, or null for everything else. Both the asteroid
 * and the comet template ask, because 'Oumuamua is filed as the one and Borisov as the other.
 */
function farLead(record, m, T) {
  const md = meta(record);
  const kind = pick(md, 'farKind');
  const name = displayName(record);
  if (kind === 'interstellar' && T.leadInterstellarOut) {
    const periMs = pickTime(md, 'perihelionMs');
    const now = m && Number.isFinite(m.tMs) ? m.tMs : Date.now();
    return t(periMs !== null && now < periMs ? T.leadInterstellarIn : T.leadInterstellarOut, { name });
  }
  if (kind === 'dwarf' && T.leadDwarf) {
    const region = farRegion(record);
    const lead = region === 'belt' ? T.leadDwarfBelt : region === 'farBeyond' ? T.leadDwarfFarBeyond : region === 'beyond' ? T.leadDwarfBeyond : T.leadDwarf;
    return t(lead, { name });
  }
  return null;
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
    // "CREW DRAGON 12 is a satellite going round the Earth" -- beside a ground point and a height
    // identical to the station it is docked to. Say what kind of spacecraft it is when the model
    // route knows, and where it is when it is riding on a station.
    const kind = spacecraftKind(record);
    const station = dockedAt(record, ctx, m);
    const name = displayName(record);
    const lead = station
      ? t(T.leadDocked, { name, kind: kind || T.aSpacecraft, station })
      : kind ? t(T.leadKind, { name, kind }) : t(T.lead, { name });
    return buildSentence(lead, [
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
      decayMs !== null ? t(T.decay, { date: timeText.dateNear(decayMs, m && m.tMs) }) : null,
      m.altKm !== null ? t(T.altitude, { alt: fmt.int(m.altKm) }) : null,
      T.burnsUp,
    ]);
  },

  rocket(record, ctx, m, passInfo, T) {
    const md = meta(record);
    // A launch has an ascent block (data/parsers.js parseLaunches). Anything else classed rocket is
    // a stage already in orbit, propagated from its own elements: it is not a launch at all.
    if (!(record && (record.ascent || record.propagator === 'ascent'))) {
      const year = pickNumber(md, 'launchYear');
      return buildSentence(t(T.leadStage, { name: displayName(record) }), [
        m.altKm !== null && m.altKm > 50 ? t(COPY.templates.satellite.altitude, { alt: fmt.int(m.altKm) }) : null,
        year !== null ? t(T.stageLaunched, { year: String(year) }) : null,
      ]);
    }
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
    // Round another world, that world is the answer to "where is it": LRO is not "out in the solar
    // system", and neither is MRO (#215 put them on their own orbits; this says so). The name comes
    // from the same COPY.worlds the rows below use.
    const orbits = worldName(pick(md, 'orbits'));
    return buildSentence(orbits ? t(T.leadOrbits, { name: displayName(record), world: orbits }) : t(T.lead, { name: displayName(record) }), [
      destination ? t(T.destination, { destination: String(destination) }) : null,
      m.lightMinutes !== null && m.lightMinutes >= 120
        ? t(T.lightTimeHours, { hours: fmt.smart(m.lightMinutes / 60) })
        : m.lightMinutes !== null && m.lightMinutes < 1
          ? t(T.lightTimeSeconds, { secs: fmt.smart(m.lightMinutes * 60) })
          : m.lightMinutes !== null ? t(T.lightTime, { mins: fmt.smart(m.lightMinutes) }) : null,
      au !== null ? t(T.distanceSun, { au: fmt.smart(au) }) : null,
      milestone && milestoneMs !== null
        ? t(T.milestone, { milestone: String(milestone), date: timeText.dateNear(milestoneMs, m && m.tMs) })
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
    const now = m && Number.isFinite(m.tMs) ? m.tMs : Date.now();
    // A dwarf planet or an interstellar visitor: what it is and how far out, and nothing about
    // passing Earth, which none of them does.
    const far = farLead(record, m, T);
    if (far) {
      const au = m && m.distSunKm !== null && m.distSunKm !== undefined ? m.distSunKm / UNITS.AU_KM : null;
      return buildSentence(far, [au !== null ? t(T.distanceSun, { au: fmt.smart(au) }) : null]);
    }
    // `neo` is the data's own classification; only an explicit false changes the sentence, so a
    // live NEO-feed record that does not carry the field still reads as the near-Earth object it is.
    const lead = md.neo === false ? T.leadMainBelt : T.lead;
    return buildSentence(t(lead, { name: displayName(record) }), [
      caMs !== null && ld !== null
        ? t(T.whyApproach, { date: timeText.dateNear(caMs, now), ld: fmt.smart(ld) })
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
    // 2I/Borisov. Its perihelion was 8 December 2019 and "closest to the Sun on" a date six years
    // gone reads as news; the why line under the sentence says when it was found instead.
    const far = farLead(record, m, T);
    if (far) return buildSentence(far, [au !== null ? t(T.distanceSun, { au: fmt.smart(au) }) : null]);
    let brightness = null;
    if (mag !== null) brightness = mag <= NAKED_EYE_LIMIT ? T.nakedEye : T.faint;
    // Periodic (the MPC's orbit type P, or a period under two centuries) comes back; the rest do not.
    const periodDays = pickNumber(md, 'periodDays');
    const years = periodDays !== null && periodDays > 0 ? periodDays / 365.25 : null;
    const periodic = years !== null && years < 200 && (pick(md, 'orbitType') === 'P' || /^\d*P\//.test(String(record.name || '')));
    const lead = periodic
      ? t(T.leadPeriodic, { name: displayName(record), n: fmt.smart(years) })
      : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      periMs !== null ? t(T.whyPerihelion, { date: timeText.dateNear(periMs, m && Number.isFinite(m.tMs) ? m.tMs : Date.now()) }) : null,
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
        ? t(T.leadKind, { name: displayName(record), a: article(kindWord), kind: kindWord })
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
      ? t(T.leadRange, { name, a: article(T.kinds[kind] || kind), kind: T.kinds[kind] || kind, lo: fmt.int(lo), hi: fmt.int(hi) })
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
    const type = pick(md, 'typeText') ? typeWords(pick(md, 'typeText')) : (T.kinds[kind] || T.kinds.other);
    const sizeLy = pickNumber(md, 'sizeLy');
    const con = pick(md, 'con');
    const name = displayName(record);
    let lead;
    if (pick(md, 'home') === true && distLy !== null) lead = t(T.leadHome, { name, dist: fmt.int(distLy) });
    else if (lo !== null && hi !== null) lead = t(T.leadRange, { name, a: article(type), type, lo: fmt.int(lo), hi: fmt.int(hi) });
    else if (distLy !== null) lead = t(T.lead, { name, a: article(type), type, dist: fmt.int(distLy) });
    else lead = t(T.leadUntyped, { name, dist: '?' });
    return buildSentence(lead, [
      con ? t(T.constellation, { con: String(con) }) : null,
      sizeLy !== null && sizeLy >= 1 ? t(T.size, { n: fmt.int(roughly(sizeLy)) }) : null,
      // Not for the galaxy we are inside: "the Milky Way ... seen as it was 26 582 years ago".
      distLy !== null && distLy >= 1e6 ? t(T.seenAsMillions, { n: fmt.smart(distLy / 1e6) }) : null,
      distLy !== null && distLy < 1e6 && pick(md, 'home') !== true ? t(T.seenAs, { n: fmt.int(distLy) }) : null,
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
      // A year is not a quantity: fmt.int wrote TRAPPIST-1 b as "found in 2 016".
      year !== null ? (method ? t(T.found, { year: String(Math.round(year)), method: String(method).toLowerCase() }) : t(T.foundYear, { year: String(Math.round(year)) })) : null,
    ]);
  },

  star(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const distLy = pickNumber(md, 'distLy');
    const spect = String(pick(md, 'spect') || '');
    const letter = spect.charAt(0).toUpperCase();
    const colour = T.colours && Object.prototype.hasOwnProperty.call(T.colours, letter) ? T.colours[letter] : null;
    const lum = pickNumber(md, 'lum');
    const name = displayName(record);
    const dist = distLy !== null ? fmt.smart(distLy) : null;
    const lead = distLy === null ? t(COPY.templates.satellite.lead, { name })
      : colour ? t(T.leadColour, { name, a: article(colour), colour, dist })
        : t(T.lead, { name, dist });
    return buildSentence(lead, [
      distLy !== null && distLy < 20 ? T.near : null,
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
    const km = m.distEarthKm !== null ? m.distEarthKm : m.altKm;
    const distanceSay = isMoon && km !== null ? t(T.distanceKm, { n: fmt.int(km) }) : compare('distanceKm', km);
    // What it is, for the worlds copy/en.js has a sourced line for (Pluto and the ten moons of
    // other planets): "a world in the solar system" is true of Europa and tells a visitor nothing.
    const id = String(record.id || '').toLowerCase();
    const what = T.what && Object.prototype.hasOwnProperty.call(T.what, id) ? T.what[id] : null;
    const lead = isMoon
      ? t(T.leadMoon, { name: displayName(record) })
      : isWorld(record, 'sun')
        ? t(T.leadSun, { name: displayName(record) })
        : what
          ? t(T.leadWhat, { name: displayName(record), what })
          : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      phase ? t(T.whyPhase, { phase: String(phase) }) : null,
      riseMs !== null ? t(T.whyRise, { time: timeText.hhmm(riseMs) }) : null,
      distanceSay ? t(T.distance, { distance: distanceSay }) : null,
      diameterKm !== null ? t(T.diameter, { n: fmt.int(diameterKm) }) : null,
    ]);
  },
};

/**
 * The model route's name for what TYPE of spacecraft this is, when the route draws a type rather
 * than this exact object: "a Dragon spacecraft", "a Starlink V2 Mini". Null otherwise -- a route
 * for one specific object carries that object's proper name, which is not a type.
 */
function spacecraftKind(record) {
  let entry = null;
  try { entry = realModelFor(record); } catch { entry = null; }
  if (entry && entry.generic && typeof entry.name === 'string' && /^an? /.test(entry.name)) return entry.name;
  // A route for one specific object carries its proper name -- "Hubble Space Telescope" -- which is
  // no use as a type, but its class is: Hubble was "a satellite going round the Earth".
  if (entry && !entry.generic && entry.colour === 'telescope') return COPY.templates.satellite.aTelescope;
  return null;
}

const DOCKED_KM = 2;
/**
 * The crewed station this record is riding on right now, by name, or null.
 *
 * Distance, not the hero layer's "inside another model's drawn radius", which is a question about
 * drawing scale. Measured on the live stations layer 2026-09-22: Crew Dragon, Cygnus and Progress at
 * the ISS and Tianzhou and Shenzhou at Tiangong were 0.00 to 0.43 km from their station, and every
 * other object over 1 600 km away. A station's own modules are at 0 km too, so the station a
 * hand-kept list names (meta.why: the ISS, Tianhe) is preferred over Nauka or Wentian.
 */
function dockedAt(record, ctx, m) {
  if (!record || klassOf(record) === 'station' || !m || !m.ok || !Number.isFinite(m.tMs)) return null;
  const p = m.posKm;
  if (!p || !ctx || typeof ctx.records !== 'function') return null;
  let best = null;
  for (const s of ctx.records()) {
    if (s === record || klassOf(s) !== 'station' || s.frame !== record.frame) continue;
    const q = positionAt(s, m.tMs);
    if (!q) continue;
    const km = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    if (!(km < DOCKED_KM)) continue;
    const rank = (s.meta && s.meta.why ? 0 : 1) * 1e6 + km;
    if (!best || rank < best.rank) best = { rank, s };
  }
  return best ? displayName(best.s) : null;
}

/** The three worlds a card must not measure against themselves. */
const isWorld = (record, id) => klassOf(record) === 'world' && String(record && record.id || '').toLowerCase() === id;

// WHICH `meta.why` A CARD PRINTS (2026-09-22). None did. registry/exotics.yaml's mirror says "the
// card prints both" `why` and `source`, and check_registry.py guards dso-hand.yaml's `why` as "what
// the card prints"; the card printed neither line. So the card for Sagittarius A* said "a black hole
// 26 996 light-years away" and never that every star on the map goes round it. The line now goes
// under the first sentence for the classes whose `why` is a hand-kept line with its sources beside
// it: registry/stars-notable.yaml, registry/exotics.yaml and registry/dso-hand.yaml (plus the Milky
// Way's own row in data/layers.js). It is a paragraph of its own, so the first sentence's
// 160-character cap does not cut it.
// NOT the satellites: their `why` is data/layers.js NOTABLE, with no source, and "Seven people live
// here" is a count that changes with every crew. There it ranks labels and search ties, as before.
const WHY_KLASSES = new Set(['star', 'exotic', 'dso']);
// THE BUNDLED ROWS' `note` (2026-09-22). data/sample.js writes one visitor-facing line for each of
// its asteroids, deep-space craft and historic reentries -- "OSIRIS-REx brought 122 grams of it back
// to the Utah desert", each sourced in a comment beside it, and tests/test_deep_space.mjs holds the
// craft to 160 characters "for the card" -- and nothing printed any of the 23. Their `why` is the
// honesty line (classLine prints it), so the line that says why the thing is known is `note`. A live
// row replacing a bundled one keeps it (data/parsers.js parseHorizonsVectors); no parser writes one.
const NOTE_KLASSES = new Set(['probe', 'telescope', 'asteroid', 'debris']);

/** The hand-kept line saying why this object is known, or null. Exported for the test. */
export function whyLine(record) {
  if (!record) return null;
  const klass = klassOf(record);
  // A line that NAMES WHERE IT WAS READ (`whySource`) is printed whatever the class: the far-bodies
  // rows (data/sample.js farBodies), filed as asteroids and one comet, whose `why` is one sourced
  // sentence each. It is `why` there and not `note` because `why` is also what makes a record worth
  // a label (ui/labels.js isNotable), and those ten are the famous ones.
  const key = WHY_KLASSES.has(klass) || pick(meta(record), 'whySource') ? 'why' : NOTE_KLASSES.has(klass) ? 'note' : null;
  const why = key && pick(meta(record), key);
  return why == null || why === false ? null : String(why).trim() || null;
}

/** The card's first sentence. Exported for the tests. */
export function firstSentence(record, ctx, m, passInfo) {
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
  const moonKm = isWorld(record, 'moon') && distanceKm !== null ? t(COPY.templates.world.distanceKm, { n: fmt.int(distanceKm) }) : null;
  const candidates = [
    compare('sizeM', pickNumber(md, 'sizeM', 'diameterM', 'lengthM')),
    moonKm || compare('distanceKm', distanceKm),
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
    const stands = standsStill(record, m);
    // Not for anything standing: its "altitude" is the ground's own height above the ellipsoid.
    // Goldstone's 70 m dish read "Height above the ground: 1 km" -- the desert is a kilometre up,
    // and the dish is on it. The old test only hid values within 50 m of zero.
    if (!stands) {
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
    } else if (world && m.frame === `${m.worldId}-inertial`) {
      // In orbit round it, not on it: MRO's card read "Standing on: Mars" (2026-09-22).
      rows.push([R.orbiting, world]);
      if (m.altKm !== null) rows.push([t(R.heightAbove, { world }), t(V.km, { n: fmt.int(m.altKm) })]);
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
    if (sizeLy !== null && sizeLy >= 1) rows.push([R.across, t(V.lightYears, { n: fmt.int(roughly(sizeLy)) })]);
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
    if (year !== null) rows.push([R.found, method ? t(V.yearByMethod, { year: String(Math.round(year)), method: String(method) }) : String(Math.round(year))]);
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
    // The line under the first sentence is registry/stars-notable.yaml's, not HYG's, so it says
    // where it was read -- with its own label, because "Read from" beside the distance would claim
    // the distance came from there too. The footer's source line stays HYG's.
    const whySource = pick(md, 'whySource');
    if (whySource && whyLine(record)) rows.push([R.whySource, String(whySource)]);
  } else {
    // The Sun's card printed "Distance from the Sun: 0.000 astronomical units" and Earth's printed
    // "Distance from Earth: 0.000" and a radio time to itself. Rows that measure a thing against
    // itself say nothing; they are left out for those two.
    const isSun = isWorld(record, 'sun');
    const isEarth = isWorld(record, 'earth');
    if (!isSun) rows.push([
      R.distanceFromSun,
      m.distSunKm !== null
        ? t(V.au, { n: fmt.smart(m.distSunKm / UNITS.AU_KM) })
        : COPY.card.couldNotLook,
    ]);
    if (!isEarth) rows.push([
      R.distanceFromEarth,
      m.distEarthKm !== null
        ? t(V.au, { n: fmt.smart(m.distEarthKm / UNITS.AU_KM) })
        : COPY.card.couldNotLook,
    ]);
    if (m.lightMinutes !== null && !isEarth) {
      rows.push([R.lightTime, m.lightMinutes >= 120
        ? t(V.hours, { n: fmt.smart(m.lightMinutes / 60) })
        : t(V.minutes, { n: fmt.smart(m.lightMinutes) })]);
    }
    if (m.speedKmh !== null && m.speedKmh > 0.5) {
      rows.push([R.speed, t(V.kmh, { n: fmt.int(m.speedKmh) })]);
    }
    // A dwarf planet's size and moons, and where its line was read. Not the size CHIP: the chip's
    // bands stop at "about the size of a city", which is 2 300 km too small for Eris.
    if (pick(md, 'farKind')) {
      const lo = pickNumber(md, 'diameterLowKm');
      const hi = pickNumber(md, 'diameterHighKm');
      const d = pickNumber(md, 'diameterKm');
      if (lo !== null && hi !== null) rows.push([R.across, t(V.kmRange, { lo: fmt.int(lo), hi: fmt.int(hi) })]);
      else if (d !== null) rows.push([R.across, t(V.km, { n: fmt.int(d) })]);
      const moons = md.moons;
      if (Array.isArray(moons)) rows.push([R.moons, moons.length ? moons.join(COPY.punctuation.listJoin) : V.noMoonsKnown]);
      const whySource = pick(md, 'whySource');
      if (whySource && whyLine(record)) rows.push([R.whySource, String(whySource)]);
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
  // Standing still, whatever class it is: a dish, a landing site, a lightsaber in a case in Houston,
  // or a rocket before T-0 (standsStill). Without this a museum exhibit got "too far away to pick
  // out by eye", and a rocket on its pad got "Set where you are and this line will tell you where
  // to look" -- a pass that cannot happen until it has left the ground.
  if (klass === 'site' || standsStill(record, m)) {
    if (isEarthFrame(m.frame) || !m.worldId || m.worldId === 'earth') return COPY.sky.onTheGround;
    const world = worldName(m.worldId);
    return world ? t(COPY.sky.onAnotherWorld, { world }) : COPY.sky.notVisibleFromGround;
  }
  if (klass === 'world') {
    const riseMs = pickTime(meta(record), 'riseMs', 'riseTime');
    if (riseMs !== null) return t(COPY.sky.worldRise, { time: timeText.hhmm(riseMs) });
    // "You can see this one with your own eyes" is not true of Pluto, of any moon but ours, or of
    // Neptune; copy/en.js worldSee says what is.
    const id = String(record.id || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(COPY.sky.worldSee, id) ? COPY.sky.worldSee[id] : COPY.sky.worldNoRise;
  }
  // A star, a nebula or a galaxy is not "too far away": its distance is the point of it. What
  // decides whether a person can see it is brightness -- magnitude 6.5 from a dark site -- and the
  // record knows its magnitude. The Milky Way is the one thing here everyone has seen.
  if (['star', 'dso', 'exotic', 'exoplanet'].includes(klass)) {
    if (klass === 'exoplanet') return COPY.sky.starOnly;
    const md = meta(record);
    const mag = pickNumber(md, 'mag');
    if (pick(md, 'home') === true) return COPY.sky.nakedEye;
    if (mag !== null) return mag <= NAKED_EYE_LIMIT ? COPY.sky.nakedEye : COPY.sky.needsTelescope;
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
 * Returns null when the record has nothing extra to admit, which is most of them. Exported for the
 * test (tests/test_deep_space.mjs reads the craft round other worlds through it).
 */
export function honestyClause(record) {
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
  // A craft round another world, drawn from JPL's states relative to it (data/parsers.js). The
  // class line alone says "worked out rather than measured"; this says what IS known -- how high,
  // how often -- and how closely the dot follows JPL between states. The row wrote it beside the
  // measurement (data/sample.js PLANET_ORBITERS).
  const orbitKnown = pick(md, 'orbitKnown');
  if (orbitKnown) return String(orbitKnown);
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
  // A world with a surface map needs no line: it is drawn as itself. One without says so
  // (scene/worlds.js puts `flat` on the record for the rows that ship no map), and one that is not
  // even round -- Phobos, Deimos: `irregular` -- says the ball is not its shape.
  if (klass === 'world') {
    if (pick(meta(record), 'flat') !== true) return null;
    return t(pick(meta(record), 'irregular') === true ? T.worldFlatIrregular : T.worldFlat, { name: displayName(record) });
  }
  if (!klass) return null;
  let entry = null;
  try { entry = realModelFor(record); } catch { entry = null; }
  if (entry && entry.name) {
    if (entry.generic) return t(T.objectFamily, { name: String(entry.name) });
    // A `file:` entry is somebody's model, loaded; a `build:` entry is scene/models.js working
    // from published metres. Both were printing "drawn from published dimensions", which is true
    // of one of them. See COPY.drawing.objectModel.
    return t(entry.file ? T.objectModel : T.objectVariant, { name: String(entry.name) });
  }
  // An extreme object that is a star (Betelgeuse) is drawn like the others, but the reason is
  // different: it has a shape, it is just a point at this scale.
  const key = klass === 'exotic' && pick(meta(record), 'kind') === 'star' && T.classShape && T.classShape.exoticStar ? 'exoticStar'
    // A dwarf planet is drawn by the asteroid builder, which makes anything its size a ball; "a
    // generic asteroid" would name the wrong kind of thing.
    : klass === 'asteroid' && pick(meta(record), 'farKind') === 'dwarf' && T.classShape && T.classShape.dwarf ? 'dwarf'
    : klass;
  const shape = T.classShape && Object.prototype.hasOwnProperty.call(T.classShape, key) ? T.classShape[key] : null;
  return shape ? t(T.objectFamily, { name: shape }) : null;
}

/** What the line under the selected dot is, or null when the thing does not lap. Exported for the test. */
export function orbitLineLine(record) {
  const whole = wholePathKind(record);
  if (whole === 'orbit') return COPY.drawing.orbitLineWhole;
  if (whole === 'passage') return COPY.drawing.orbitLinePassage;
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

/**
 * THE LINE A STAR SYSTEM'S STAGE PRINTS (spec 0040 req 8), or null off it. On its system's stage a
 * planet is no longer "a mark at its star": it is a ball of its own size on an orbit worked out
 * from the Archive, and the card says which parts of that are the Archive's and which are drawn.
 * Generated from the system's rows, never typed: {phase} names the planets' places only when one
 * of them has no transit time to put it there. Exported for tests/test_systems.mjs.
 */
export function systemLine(record, stageId = stage.worldId) {
  const m = record && record.id ? systemOfRecordId(record.id) : null;
  if (!m || stageId !== m.system.stage) return null;
  const guessed = m.system.planets.some((p) => !phaseIsMeasured(p));
  return t(COPY.trip.systemLine, { phase: guessed ? COPY.trip.systemPhaseUnknown : '' });
}

export function drawingLine(record) {
  const md = meta(record);
  const drawsAs = pick(md, 'drawsAs');
  const T = COPY.drawing;
  const inSystem = systemLine(record);
  if (inSystem) return inSystem;
  if (!drawsAs) {
    // The derived line, plus a row's own `departure` where the drawing knowingly differs: Haumea
    // is drawn round and is an egg; nobody has seen 'Oumuamua's shape at all.
    const derived = derivedDrawingLine(record, T);
    const departure = pick(md, 'departure');
    return derived && departure ? derived + COPY.punctuation.separator + String(departure) : derived;
  }
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

/**
 * Block 7's line and block 8's line, as the card prints them. Exported because since 2026-09-23 a
 * second thing prints them: the postcard (spec 0033, ui/postcard.js), whose caption must carry the
 * card's own honesty line and sources and could otherwise drift from them. One function, two
 * printers.
 */
export function honestyLine(record, m) {
  const honesty = honestyClause(record);
  return classLine(record, m) + (honesty ? COPY.punctuation.dash + honesty : '');
}

export function sourceLine(record, ctx) {
  const src = sourceRow(record, ctx);
  if (!src.label) return COPY.source.unknown;
  const parts = [COPY.source.prefix + COPY.punctuation.colon + src.label];
  if (src.attribution) parts.push(src.attribution);
  return parts.join(COPY.punctuation.separator);
}

/**
 * What the card says about `record` right now, as strings and no DOM: the name, the badge, the
 * first sentence, the "right now" rows, the honesty line and the source line. The share sheet's
 * words and the postcard's caption are read from here (spec 0033 req 2, 3, 7), so neither can
 * state a number the card does not.
 */
export function cardWords(record, ctx) {
  const m = measure(record, ctx);
  const passInfo = nextPass(record, ctx, m);
  return {
    name: displayName(record),
    klass: klassLabel(record),
    sentence: firstSentence(record, ctx, m, passInfo),
    rows: rightNowRows(record, m, passInfo),
    honesty: honestyLine(record, m),
    sources: sourceLine(record, ctx),
    tMs: m.tMs,
  };
}

// ---------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------

/**
 * The card's "Fly to it". Exported for the test.
 *
 * It hands the record to ctx.flyToRecord -- main.js's flight, the same one a tap or a search makes
 * -- because a flight of its own got planets wrong: it flew to a world's TRUE position, and every
 * planet but the stage world is drawn nearer than it is, so Mars's own button arrived 1.8 au past
 * Mars. What is left below is for a ctx without main.js (a test, an embed), and is right for
 * everything worlds.js does not move.
 */
export function flyTo(record, ctx, m) {
  if (ctx && typeof ctx.flyToRecord === 'function') {
    try { ctx.flyToRecord(record, 800); } catch { /* a camera that will not fly is not worth breaking the card over */ }
    return;
  }
  if (!m || !m.ok || !ctx || !ctx.cameraRig || !ctx.stage) return;
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

  // Share (spec 0033, 2026-09-23): the third action. The words are read at the tap, not now, so
  // the sentence on the share sheet is the one the card shows at that moment.
  buttons.push(shareButton(ctx, 'sr-btn sr-btn--share', () => {
    const w = cardWords(record, ctx);
    return { title: w.name, text: w.sentence };
  }, record && record.id));

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
  if (lead.title) {
    const title = el('h2', 'sr-card__leadtitle', lead.title);
    title.id = CARD_LEAD_TITLE_ID;
    title.tabIndex = -1;
    wrap.appendChild(title);
  }
  if (lead.body) wrap.appendChild(el('p', 'sr-card__leadbody', lead.body));
  // A line the trip GENERATES under the stop's words (spec 0038): the visitor's place, the
  // station's distance from them, its next pass. A function when it changes with the clock, read
  // at every repaint; the words above it are the registry's and never change.
  let note = '';
  try {
    note = typeof lead.note === 'function' ? lead.note() : lead.note;
  } catch {
    note = '';
  }
  if (note) wrap.appendChild(el('p', 'sr-card__leadnote', note));
  return wrap;
}

/**
 * The card is open, or it is not, and the ROOT element says which.
 *
 * ui/github.js's mark used to step left by the card rail's width at every desktop width, open or
 * not, so the corner it was asked to sit in was empty whenever no card was showing. It cannot read
 * the card with a CSS sibling selector either: the mark is appended at boot and the card host is
 * built lazily on the first showCard(), so the card is always AFTER it in the document. A class on
 * <html> is how ui/mobile.js and ui/tripframe.js already say the same kind of thing.
 */
function markCardOpen(open) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.classList.toggle('sr-card-open', open !== false);
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
  markCardOpen(true);
}

/**
 * The badge beside the name. The far bodies are filed as asteroids (and Borisov as a comet) so the
 * glyph, the model and the colour are the right family -- but a badge reading "Asteroid" beside
 * "Eris is a dwarf planet" contradicts the sentence under it (read in the browser, 2026-09-22).
 */
export function klassLabel(record, klass = klassOf(record)) {
  const far = pick(meta(record), 'farKind');
  if (far && COPY.klassFar && Object.prototype.hasOwnProperty.call(COPY.klassFar, far)) return COPY.klassFar[far];
  return COPY.klass[klass];
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
  const title = el('h2', 'sr-card__name', displayName(record));
  // The card is a dialog, and a dialog needs a name: it had role="dialog" and nothing to call it by.
  title.id = CARD_TITLE_ID;
  title.tabIndex = -1; // focusable by script only (takeFocus), never a stop in the tab order
  header.appendChild(title);
  header.appendChild(el('span', 'sr-card__klass', klassLabel(record, klass)));
  const close = el('button', 'sr-card__close', COPY.card.close);
  close.type = 'button';
  close.title = COPY.card.closeTitle;
  close.addEventListener('click', hideCard);
  header.appendChild(close);
  node.appendChild(header);

  const body = el('div', 'sr-card__body');
  bodyEl = body;
  node.appendChild(body);

  // 2. one plain sentence, and the registry's line on why this one is known (see WHY_KLASSES)
  body.appendChild(el('p', 'sr-card__sentence', firstSentence(record, ctx, m, passInfo)));
  const why = whyLine(record);
  if (why) body.appendChild(el('p', 'sr-card__why', why));

  // 2a. THE PHOTOGRAPH, where the registry has one. Two of the twenty exotics have been
  // photographed -- M87* in 2019 and Sgr A* in 2022 -- and spec 0028 asked for their pictures on
  // the card. Until now the card said "the first black hole anyone photographed" and showed a dot.
  //
  // The credit rides WITH the picture, visible, because that is what CC BY 4.0 asks for: "the full
  // image credit must be presented in a clear and readable manner to all users, with the wording
  // unaltered". Lazy and async so a card that is never scrolled to costs nothing, and the alt text
  // comes from the registry row, where somebody wrote it by looking.
  const photo = pick(meta(record), 'image');
  if (photo && photo.file && photo.credit && photo.licence) {
    const figure = el('figure', 'sr-card__figure');
    const img = document.createElement('img');
    img.className = 'sr-card__photo';
    img.src = String(photo.file).replace(/^site\//, '');
    img.alt = String(photo.alt || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    figure.appendChild(img);
    figure.appendChild(el('figcaption', 'sr-card__photo-credit',
      t(COPY.card.photoCredit, { credit: String(photo.credit), licence: String(photo.licence) })));
    body.appendChild(figure);
  }

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
  // 6a. the postcard, one tap more than Share and directly under it (spec 0033 req 3). Its own
  // row and not a fourth action: spec 0013 caps the actions at three.
  const picture = el('div', 'sr-card__picture');
  picture.appendChild(pictureButton(ctx, 'sr-btn sr-btn--quiet sr-btn--picture', record));
  body.appendChild(picture);

  // 7. the class-and-age line
  const foot = el('footer', 'sr-card__foot');
  foot.appendChild(el('p', 'sr-card__cls', honestyLine(record, m)));

  // 7b. what the drawn shape is. Between this and the line above it, the card states that
  // neither the shape nor the path is a measurement of this particular flight.
  const drawn = drawingLine(record);
  if (drawn) foot.appendChild(el('p', 'sr-card__drawn', drawn));
  // 7c. the orbit line, when there is one (scene/orbitline.js draws it for the selection)
  const lap = orbitLineLine(record);
  if (lap) foot.appendChild(el('p', 'sr-card__drawn', lap));

  // 8. the source line
  foot.appendChild(el('p', 'sr-card__source', sourceLine(record, ctx)));
  node.appendChild(foot);

  node.hidden = false;
  node.classList.add('is-open');
  markCardOpen(true);
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

const CARD_TITLE_ID = 'sr-card-title';
const CARD_LEAD_TITLE_ID = 'sr-card-lead-title';
/** Where focus was when the card took it, so closing the card can give it back. */
let returnFocus = null;

/**
 * Move focus into a card that has just opened -- but only for a visitor who was on a control.
 *
 * Measured 2026-09-22: open a card from search with Enter and focus stayed on <body>. A screen
 * reader announced nothing, and a keyboard had to Tab from the top of the page to reach it. But a
 * tap on the scene leaves focus on the body or the canvas, and a trip opens a card at every stop
 * while its own controls hold focus; taking focus in either case would be theft. So: only when the
 * active element is a real control outside the card, and never in trip mode.
 */
function takeFocus() {
  if (typeof document === 'undefined' || !host) return;
  const heading = host.querySelector(`#${CARD_TITLE_ID}`) || host.querySelector(`#${CARD_LEAD_TITLE_ID}`);
  if (heading) host.setAttribute('aria-labelledby', heading.id);
  if (document.documentElement.classList.contains('sr-trip-mode')) return;
  const active = document.activeElement;
  if (!active || active === document.body || active.tagName === 'CANVAS' || host.contains(active)) return;
  returnFocus = active;
  if (heading && typeof heading.focus === 'function') heading.focus({ preventScroll: true });
}

export function showCard(record, ctx, opts = {}) {
  if (!record && !opts.lead) {
    hideCard();
    return;
  }
  const wasOpen = !!(host && !host.hidden);
  current = { record, ctx, opts };
  subscribe(ctx);
  render(record, ctx, opts);
  if (!wasOpen) takeFocus();
  else if (host) {
    const heading = host.querySelector(`#${CARD_TITLE_ID}`) || host.querySelector(`#${CARD_LEAD_TITLE_ID}`);
    if (heading) host.setAttribute('aria-labelledby', heading.id);
  }
}

/**
 * Re-read the trip's generated line (`opts.lead.note`) and write it into the card that is up, with
 * nothing else repainted. The clock only tells the card when it is SET, never as it runs, so a
 * line that changes with the running clock -- the station's distance from the visitor (spec 0038)
 * -- is refreshed by the trip, once a second, through this.
 */
export function refreshLeadNote() {
  if (!current || !host || !current.opts || !current.opts.lead) return;
  const note = current.opts.lead.note;
  if (typeof note !== 'function') return;
  const node = host.querySelector('.sr-card__leadnote');
  if (!node) return;
  let text = '';
  try {
    text = note();
  } catch {
    return;
  }
  if (text && node.textContent !== text) node.textContent = text;
}

export function hideCard() {
  current = null;
  if (!host) return;
  // Give focus back to where the visitor was -- the search box, a list row -- if it is still there
  // and nothing else has taken focus since.
  const hadFocus = typeof document !== 'undefined' && (host.contains(document.activeElement) || document.activeElement === document.body);
  host.classList.remove('is-open');
  host.hidden = true;
  markCardOpen(false);
  if (bodyEl) clear(bodyEl);
  const back = returnFocus;
  returnFocus = null;
  if (back && hadFocus && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) hideCard();
  });
}
