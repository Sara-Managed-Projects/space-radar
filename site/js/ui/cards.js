// ui/cards.js -- the card that opens when anything is tapped.
//
// Seated in the sidebar's card view on a desktop (ui/shell.js), a bottom sheet on a phone, and in a
// guided trip the sidebar's trip view or the trip's sheet on a phone (ui/tripframe.js). Pure DOM, no
// framework. Every string comes from copy/en.js; every value is written with textContent, never innerHTML, so a name from an
// upstream feed cannot become markup.
//
// THE LAYOUT IS SPEC 0061 §4 AND docs/ui-guide.md §3.10, and its order is fixed:
//   1. the microlabel -- what it is and where, four words at most (microLabel) -- and the name.
//   2. THREE NUMBERS, the three that matter for its kind (heroNumbers): height, speed and a lap
//      for an Earth orbiter; distance, a turn and a year for a planet; distance, magnitude and
//      class for a star; distance, size and magnitude for a deep-sky object; distance, speed and
//      days since launch for a craft beyond Earth. Each is a row this card prints, never a second
//      sum, and a row that is not there is "—".
//   3. FOUR ACTIONS in one row, one of them ember: Follow and Ride along where spec 0048 lets the
//      camera ride (an SGP4 orbit round the Earth), else Fly to it and See it; Postcard and Share.
//   4. the next 90 minutes (spec 0048): the light now, the next change, the bar, the lap's end.
//   5. SECTIONS THAT OPEN IN PLACE (disclosure, aria-expanded): When you can see it · Its path ·
//      Who is aboard · About it · Sources for this record. Their contents are the sections this
//      card has always had -- the first sentence, the why line, the comparisons, the rows, the
//      myths, the train, the trajectory, the drawing and source lines -- moved, not rewritten.
//   6. the honesty line, small, at the foot (spec 0001 principle 2).
//
// WHY. Ivan, 2026-09-29: the old card was "ugly and not structured" -- a sentence, sentence-long
// pills, eleven rows and a button bar, all at once, 1 500 px tall. A card now leads with the three
// numbers, says the rest when asked, and every number it ever printed is still one tap away.
//
// Contract exports: showCard(record, ctx, opts), hideCard(), tagLines(), shortHonesty().
//
// `opts.lead` is a guided trip's stop ({micro, title, body, note}): the same anatomy with the stop's
// words in it (renderStop, spec 0061 task 7), built from the same pieces rather than forked. A stop
// that is a PLACE and not an object -- "pull back until the Earth is a dot" -- has no record at
// all, so `showCard(null, ctx, { lead })` renders the stop alone. A null record with no lead is
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
  ageInWords,
  UNITS,
 article, typeWords, NAKED_EYE_LIMIT } from '../copy/en.js';
import { propagate } from '../propagate/index.js';
import { launchLabel } from './labels.js';
import { realModelFor } from '../scene/realmodels.js';
import { sunlitState } from '../scene/shadow.js';
import { periodMsOf, wholePathKind } from '../scene/orbitline.js';
import {
  gmst,
  eciToEcef,
  ecefToGeodetic,
  geodeticToEcef,
  parseFrame,
  bodyFixedToSpherical,
  worldRadiusKm,
  toStage,
  spinPeriodHours,
  yearDays,
} from '../propagate/frames.js';
import { predictPasses } from '../sky/passes.js';
import { trajectorySection } from './trajectory.js';
import { hasTimeFacts, timeFacts, mmss, LIGHT_MINUTES } from '../sky/timefacts.js';
import { wantsTrack } from '../scene/groundtrack.js';
import { trainOf } from '../data/trains.js';
import { attachedOdditiesFor, attachedOddityRecord } from '../data/attached.js';
import { shareLink, savePicture } from './share.js';
import { stage } from '../scene/stage.js';
import { systemOfRecordId, phaseIsMeasured } from '../scene/systems.js';

const MAX_FIRST_SENTENCE = 160; // spec 0013 requirement 10, enforced by check_copy.py
const MAX_COMPARISONS = 3; // spec 0013 requirement 2
const MAX_ACTIONS = 4; // spec 0013 requirement 8 said three; spec 0061 §4 adds the postcard to the row
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
// The time facts' own once-a-second repaint (spec 0048): the card repaints when the clock is SET,
// never as it runs, and a countdown that stands still is not a countdown.
let timeTimer = 0;
let timeState = null; // {record, ctx, facts}

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
  // `sr-float` is the instrument's panel chrome (spec 0045): glass, hairline, lit top edge.
  host.classList.add('sr-card', 'sr-float');
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
  // LL2 names a launch "Rocket Variant | Mission (Detail)" (ui/labels.js launchLabel): "Falcon 9
  // Block 5 | Transporter 18" raw-truncated at MAX_NAME cut mid-word and lost the mission
  // entirely. The scene label already shortens to "Falcon 9 · Transporter 18" first; the card
  // gets the same shortened name so it keeps the mission instead of a garbled rocket name.
  name = launchLabel(name);
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
    // Spec 0047: the straight line from the observer to the object, and whose place that is.
    rangeKm: null,
    observerName: null,
    observerGuess: false,
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
      // From the place set, or guessed and said so (sky/guessplace.js `source: 'guess'`), in the
      // same Earth-fixed frame: one subtraction. No observer, no row -- never a distance from nowhere.
      const obs = ctx.observer;
      if (obs && Number.isFinite(obs.latRad) && Number.isFinite(obs.lonRad)) {
        const o = geodeticToEcef(obs.latRad, obs.lonRad, Number.isFinite(obs.altKm) ? obs.altKm : 0);
        const r = Math.hypot(ecef.x - o.x, ecef.y - o.y, ecef.z - o.z);
        if (Number.isFinite(r)) {
          out.rangeKm = r;
          out.observerName = obs.name ? String(obs.name) : null;
          out.observerGuess = obs.source === 'guess';
        }
      }
      // What is under it (spec 0048 req 2), once sky/overplace.js has its raster: never at boot.
      if (placesMod && out.latDeg !== null) {
        const places = placesMod.placesNow();
        if (places) out.place = placesMod.placeAt(places, out.latDeg, out.lonDeg);
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

/**
 * How long before the moment on screen a storm's advisory was: "3 hours ago", or "in 2 hours" when
 * the clock stands in the six hours before it (data/parsers.js STORM_BEFORE_MS). Exported for the test.
 */
export function stormAdvisoryAgo(advisoryMs, tMs) {
  if (!Number.isFinite(advisoryMs) || !Number.isFinite(tMs)) return '';
  return tMs >= advisoryMs ? ageInWords(tMs - advisoryMs) : inWords(advisoryMs - tMs);
}

/** A storm's status word: the basin's own name for hurricane strength, else the status itself. */
function stormStatusKey(md) {
  const status = pick(md, 'status');
  if (status === 'hurricane') return pick(md, 'basinWord') || 'hurricane';
  return status || null;
}

const TEMPLATES = {
  storm(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const key = stormStatusKey(md);
    const status = key && T.statuses[key];
    const adv = pickNumber(md, 'advisoryMs');
    const ago = stormAdvisoryAgo(adv, m.tMs);
    const before = adv !== null && Number.isFinite(m.tMs) && m.tMs < adv;
    const wind = pickNumber(md, 'trackMaxWindKmh');
    return buildSentence(
      status
        ? t(before ? T.leadBefore : T.lead, { name: displayName(record), a: article(status), status, ago })
        : t(before ? T.leadBeforeUnknown : T.leadUnknown, { name: displayName(record), ago }),
      [wind !== null ? t(T.wind, { n: fmt.int(roughly(wind)) }) : null],
    );
  },

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
    // LL2's own mission.type (parsers.js parseLaunches): "Resupply", "Communications", "Human
    // Exploration". The mission NAME is already in `lead` via launchLabel, so this clause adds
    // the one LL2 field the lead does not carry rather than repeating it.
    const missionType = pick(md, 'missionType');
    const lead = pad
      ? t(T.leadWithPad, { name: displayName(record), pad: String(pad) })
      : t(T.lead, { name: displayName(record) });
    return buildSentence(lead, [
      when ? t(upcoming ? T.whyCountdown : T.whyFlown, { when }) : null,
      destination ? t(T.destination, { destination: String(destination) }) : null,
      missionType ? t(T.missionType, { missionType: String(missionType) }) : null,
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
    // No template for this class: say what it is and stop. Never invent -- not even the shape of
    // the sentence. Borrowing the satellite template's lead told a visitor an object was "going
    // round the Earth" whatever it actually was, because that is the one klass every record used
    // to fall back to.
    return buildSentence(t(COPY.card.unknownKind, { name: displayName(record) }), []);
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
  // A storm is weather, standing on the Earth like a site: "0 km up" is a chip that says nothing.
  const onTheGround = klassOf(record) === 'site' || klassOf(record) === 'storm';
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
  if (isEarthFrame(m.frame) && klassOf(record) === 'storm') {
    // A storm's rows are the advisory's (data/parsers.js parseGdacsCyclones says what each field is):
    // what it was at the latest one, the one wind number GDACS gives and what that number covers,
    // when, where, and who advised it. No height, no speed: the point does not move between advisories.
    const key = stormStatusKey(md);
    if (key && V.stormStatus[key]) rows.push([R.stormNow, V.stormStatus[key]]);
    const wind = pickNumber(md, 'trackMaxWindKmh');
    const cat = pickNumber(md, 'trackMaxCategory');
    if (wind !== null) {
      rows.push([R.stormWind, cat ? t(V.stormWindCategory, { n: fmt.int(roughly(wind)), cat: fmt.int(cat) }) : t(V.stormWind, { n: fmt.int(roughly(wind)) })]);
    }
    const adv = pickNumber(md, 'advisoryMs');
    if (adv !== null) rows.push([R.stormAdvisory, t(V.stormAdvisory, { time: new Date(adv).toISOString().slice(11, 16), ago: stormAdvisoryAgo(adv, m.tMs) })]);
    if (m.latDeg !== null && m.lonDeg !== null) rows.push([R.stormCentre, t(V.latLon, { lat: latText(m.latDeg), lon: lonText(m.lonDeg) })]);
    const agency = pick(md, 'agency');
    if (agency) rows.push([R.stormAgency, String(agency)]);
    const alert = pick(md, 'alertLevel');
    if (alert && V.stormAlert[alert]) rows.push([R.stormAlert, V.stormAlert[alert]]);
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
    // How long a lap takes, from the same elements as the dot (scene/orbitline.js periodMsOf, the
    // reader the orbit line uses). The card's first sentence said it for a station and nothing said
    // it for anything else; it is the third of an Earth orbiter's three numbers (spec 0061 §4).
    const lapMs = !stands && klassOf(record) !== 'world' ? periodMsOf(record) : null;
    if (lapMs) rows.push([R.period, t(V.minutes, { n: fmt.int(lapMs / 60e3) })]);
    if (!stands) {
      const lit = sunlitState(record, m.tMs);
      if (lit) rows.push([R.sunlight, lit === 'sunlit' ? V.inSunlight : V.inShadow]);
    }
    if (m.latDeg !== null && m.lonDeg !== null) {
      const label = stands ? R.location : R.groundPoint;
      rows.push([label, t(V.latLon, { lat: latText(m.latDeg), lon: lonText(m.lonDeg) })]);
    }
    if (!stands && m.place) rows.push([R.below, belowWords(m.place)]);
    if (!stands && m.rangeKm !== null && m.rangeKm !== undefined) rows.push([rangeLabel(m), t(V.km, { n: fmt.int(m.rangeKm) })]);
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

  // A world's turn and year (spec 0061 §4: a planet leads with its distance, a turn and a year),
  // from astronomy-engine, the library that places and turns it (propagate/frames.js). A TURN,
  // against the stars, and the label says so: Mercury turns in 59 days and its day is 176.
  if (klassOf(record) === 'world') {
    const hours = spinPeriodHours(record.id, m.tMs);
    if (hours) rows.push([R.spin, hours >= 72 ? t(V.days, { n: fmt.smart(hours / 24) }) : t(V.hours, { n: fmt.smart(hours) })]);
    const days = pick(md, 'parent') === 'sun' ? yearDays(record.id) : null;
    if (days) rows.push([R.yearLength, t(V.days, { n: days >= 100 ? fmt.int(days) : fmt.smart(days) })]);
  }
  // A craft beyond Earth: how long it has been out there (data/sample.js `launched`, a UTC day),
  // and what is bolted to it (data/attached.js carries the day over). An Earth orbiter's launch
  // year is the time facts' own line, from its designator.
  if (!isEarthFrame(m.frame)) {
    const launchMs = pickTime(md, 'launchDate', 'launchMs');
    const days = launchMs !== null && Number.isFinite(m.tMs) ? Math.floor((m.tMs - launchMs) / 86400e3) : null;
    if (days !== null && days >= 0) rows.push([R.launched, t(V.launchedAgo, { n: fmt.int(days), date: timeText.utcDate(launchMs) })]);
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

// --- what is under it (spec 0048 req 2) --------------------------------------------------------------
//
// sky/overplace.js and its 63 KB raster are loaded on the first card for something the propagator
// flies round the Earth, never at boot (a dynamic import: the module is not in the boot graph either).
// Until then the "Passing over" row's latitude and longitude, which are true without it, stand alone.
let placesMod = null;
let placesAsked = null;

/**
 * Load the places once. Exported for the test, which hands in a file reader and node's inflate;
 * the page calls it with nothing.
 */
export function ensurePlaces(opts) {
  if (!placesAsked) {
    placesAsked = import('../sky/overplace.js')
      .then((mod) => { placesMod = mod; return mod.loadPlaces(opts); })
      .catch(() => { placesAsked = null; return null; });
  }
  return placesAsked;
}

/** "Kazakhstan", "the South Pacific Ocean", "the border of France and Spain", "land". */
export function belowWords(place) {
  const V = COPY.card.values;
  if (!place) return null;
  const named = (i) => (place.the && place.the[i] ? COPY.card.articles[1] + ' ' : '') + place.names[i];
  if (place.kind === 'border' && place.names.length === 2) return t(V.belowBorder, { a: named(0), b: named(1) });
  if ((place.kind === 'country' || place.kind === 'sea' || place.kind === 'ocean') && place.names[0]) return named(0);
  if (place.kind === 'land') return V.belowLand;
  return V.belowWater;
}

/** The "from you" row's label: yours, or the guessed place's by name (spec 0047 req 3). */
function rangeLabel(m) {
  return m.observerGuess && m.observerName ? t(COPY.card.rows.fromGuess, { place: m.observerName }) : COPY.card.rows.fromYou;
}

// ---------------------------------------------------------------------------------------
// The tracked object's tag (spec 0047 req 3, 4): the card's words, shorter, on the object itself.
// ---------------------------------------------------------------------------------------

/** At most this many readouts on the tag's second line. */
export const TAG_READOUTS = 3;
/** The tag's honesty line is cut to this many characters, at a word. */
export const TAG_HONESTY_MAX = 64;

/**
 * The honesty line's first clause, the card's own words cut short: up to the first dash, semicolon
 * or sentence end, then at a word inside TAG_HONESTY_MAX with an ellipsis. Always a prefix of
 * honestyLine() once the ellipsis is taken off, which tests/test_cards_copy.mjs holds for every
 * class; "position propagated from elements 3 hours old" is the ISS's, whole.
 */
export function shortHonesty(record, m) {
  const full = honestyLine(record, m || {});
  let cut = full.length;
  for (const mark of [COPY.punctuation.dash, '; ', COPY.punctuation.sentenceJoin]) {
    const i = full.indexOf(mark);
    if (i > 0 && i < cut) cut = i;
  }
  let out = full.slice(0, cut).trimEnd();
  if (out.length > TAG_HONESTY_MAX) {
    const space = out.lastIndexOf(' ', TAG_HONESTY_MAX - 1);
    out = out.slice(0, space > 0 ? space : TAG_HONESTY_MAX - 1).trimEnd() + COPY.punctuation.ellipsis;
  }
  return out;
}

/**
 * "27 580 km/h" -> {num: '27 580', unit: 'km/h'}: the card's value, split where the number ends so
 * the tag can set the digits in fixed columns and the unit dim. The groups inside a number are
 * narrow no-break spaces (copy/en.js), so the first ordinary space is where the unit starts. A value
 * that does not start with a number ("could not work this out") is not a readout.
 */
export function splitReadout(value) {
  const m = /^([−-]?[\d\u202F.]+) (.+)$/.exec(String(value || ''));
  return m ? { num: m[1], unit: m[2] } : null;
}

/**
 * What the tracked object's tag says, as strings and no DOM: the name, the class, up to three
 * readouts and the short honesty line. Every number is a "right now" row the card prints, value for
 * value (rightNowRows, with the pass left out: predicting a day of passes four times a second is the
 * card's job on open, not the tag's), so the tag and the card cannot disagree. `m` is measure()'s,
 * passed in by a caller that already has one.
 *
 * @returns {{name, klass, readouts: {key, num, unit, suffix}[], honesty, tMs}}
 */
export function tagLines(record, ctx, m) {
  const mm = m || measure(record, ctx);
  const R = COPY.card.rows;
  const keys = new Map([
    [R.altitude, 'altitude'], [R.speed, 'speed'], [rangeLabel(mm), 'range'],
    [R.distanceFromEarth, 'earth'], [R.distanceFromSun, 'sun'], [R.distanceRange, 'sun'],
  ]);
  const readouts = [];
  for (const [label, value] of rightNowRows(record, mm, { state: PASS_NOT_APPLICABLE, pass: null })) {
    const key = keys.get(label);
    if (!key || readouts.length >= TAG_READOUTS) continue;
    const split = splitReadout(value);
    if (!split) continue;
    const suffix = key === 'range'
      ? (mm.observerGuess && mm.observerName ? t(COPY.hud.fromPlace, { place: mm.observerName }) : COPY.hud.fromYou)
      : '';
    readouts.push({ key, num: split.num, unit: split.unit, suffix });
  }
  return { name: displayName(record), klass: klassOf(record), readouts, honesty: shortHonesty(record, mm), tMs: mm.tMs };
}

// ---------------------------------------------------------------------------------------
// Block 4a0: the next 90 minutes in time (spec 0048 task 1)
// ---------------------------------------------------------------------------------------

/** Faster than a minute a second, countdowns give way to the clock time of the event (req 10). */
export const TIME_FAST_RATE = 60;
/** The facts are worked out again when the clock has moved this far from when they were. */
const TIME_FACTS_STALE_MS = 60e3;

/**
 * What the card says about the next 90 minutes, from sky/timefacts.js's numbers and the clock:
 * the light bar's runs as shares of the window, the next change of light, the lap countdown, the
 * orbit number and the launch year. Pure; exported for tests/test_timefacts.mjs, which holds the
 * scrubbed and the faster-than-60x wordings.
 *
 * @param {Object} facts  timeFacts(record, t0)
 * @param {number} tNow   the clock's time, which is the visitor's at 1x and the shown time when scrubbed
 * @param {number} [rate] the clock's rate
 */
export function timeFactWords(facts, tNow, rate = 1) {
  if (!facts || !Number.isFinite(tNow)) return null;
  const T = COPY.timeFacts;
  const fast = Math.abs(Number(rate) || 1) > TIME_FAST_RATE;
  // `now`, `next` and `lapShort` are the bar's own short lines on the card view (spec 0061 §4); the
  // sentences beside them are the same facts at full length, for "Its path".
  const out = { bar: [], barLabel: '', light: null, lap: null, orbit: null, orbitNote: null, launched: null, now: null, next: null, lapShort: null };
  const windows = Array.isArray(facts.windows) ? facts.windows : [];
  if (windows.length) {
    const from = Math.max(tNow, windows[0].from);
    const to = windows[windows.length - 1].to;
    const span = to - from;
    const parts = [];
    for (const w of windows) {
      const a = Math.max(w.from, from);
      const b = Math.min(w.to, to);
      if (!(b > a) || !(span > 0)) continue;
      out.bar.push({ share: (b - a) / span, sunlit: w.sunlit });
      const mins = fmt.int(Math.round((b - a) / 60e3));
      parts.push(t(w.sunlit ? T.barSunlit : T.barShadow, { mins }));
    }
    out.barLabel = t(T.barLabel, { parts: parts.join(COPY.punctuation.listJoin) });
    const here = windows.find((w) => w.from <= tNow && tNow < w.to) || windows[0];
    const next = windows.find((w) => w.from > tNow);
    out.now = here.sunlit ? T.nowSunlit : T.nowShadow;
    if (!next) {
      out.light = here.sunlit ? T.allSunlit : T.allShadow;
    } else if (fast) {
      const time = timeText.hhmm(next.from);
      out.light = t(next.sunlit ? T.entersSunlightAt : T.entersShadowAt, { time });
      out.next = t(next.sunlit ? T.sunlightAt : T.shadowAt, { time });
    } else {
      const ms = next.from - tNow;
      const mins = ms < 60e3 ? T.underAMinute : t(T.minutes, { n: fmt.int(Math.floor(ms / 60e3)) });
      out.light = t(next.sunlit ? T.entersSunlightIn : T.entersShadowIn, { mins });
      out.next = t(next.sunlit ? T.sunlightIn : T.shadowIn, { mins });
    }
  }
  if (Number.isFinite(facts.lapEndMs) && facts.lapEndMs > tNow) {
    out.lap = fast ? t(T.lapAt, { time: timeText.hhmm(facts.lapEndMs) }) : t(T.lapIn, { mmss: mmss(facts.lapEndMs - tNow) });
    out.lapShort = fast ? t(T.lapEndsAt, { time: timeText.hhmm(facts.lapEndMs) }) : t(T.lapEndsIn, { mmss: mmss(facts.lapEndMs - tNow) });
  }
  if (facts.orbit && Number.isFinite(facts.orbit.n)) {
    out.orbit = t(T.orbit, { n: fmt.int(facts.orbit.n) });
    out.orbitNote = T.orbitNote;
  }
  if (Number.isFinite(facts.launchYear)) out.launched = t(T.launched, { year: String(facts.launchYear) });
  return out;
}

/** The facts for this record now, recomputed only when the clock has moved on from them. */
function freshFacts(record, tNow) {
  const st = timeState;
  const ok = st && st.record === record && st.facts
    && tNow >= st.facts.t0 && tNow - st.facts.t0 < TIME_FACTS_STALE_MS
    && !(Number.isFinite(st.facts.lapEndMs) && tNow >= st.facts.lapEndMs);
  if (ok) return st.facts;
  let facts = null;
  try { facts = timeFacts(record, tNow); } catch { facts = null; }
  timeState = { record, facts };
  return facts;
}

/** The time facts' full sentences, for "Its path"; the short ones are the bar's (FACT_SHORT). */
const FACT_LINES = ['light', 'lap', 'orbit', 'orbitNote', 'launched'];
const FACT_SHORT = ['now', 'next', 'lapShort'];

/**
 * The next 90 minutes, in two places (spec 0061 §4, row D): `bar` sits under the actions -- the
 * light now and the next change, the bar, and where the lap ends -- and `lines` are the same facts
 * as the sentences the card has always printed, which move into "Its path". Both are painted by
 * paintTimeFacts from one timeFactWords(), so the two can never say different things.
 */
function timeFactsSection(record, ctx, m) {
  if (!hasTimeFacts(record) || standsStill(record, m) || !Number.isFinite(m.tMs)) return null;
  const facts = freshFacts(record, m.tMs);
  const words = timeFactWords(facts, m.tMs, ctx && ctx.clock ? ctx.clock.rate : 1);
  if (!words || (!words.bar.length && !words.lap)) return null;
  const wrap = el('section', 'sr-card__time');
  wrap.setAttribute('aria-label', t(COPY.timeFacts.label, { n: LIGHT_MINUTES }));
  const head = el('div', 'sr-light__head');
  head.appendChild(factNode('span', 'sr-light__now', 'now'));
  head.appendChild(factNode('span', 'sr-light__next', 'next'));
  wrap.appendChild(head);
  const bar = el('div', 'sr-light');
  bar.setAttribute('role', 'img');
  wrap.appendChild(bar);
  const axis = el('div', 'sr-light__axis');
  axis.appendChild(el('span', '', COPY.timeFacts.now));
  axis.appendChild(factNode('span', 'sr-light__lap', 'lapShort'));
  axis.appendChild(el('span', '', COPY.timeFacts.end));
  wrap.appendChild(axis);
  // The orbit number's note is words on the card, not a tooltip: it is the half of the line that
  // says the number is inferred.
  const lines = el('div', 'sr-card__facts');
  for (const key of FACT_LINES) lines.appendChild(factNode('p', key === 'orbitNote' ? 'sr-card__fact-note' : `sr-card__fact sr-card__fact--${key}`, key));
  paintTimeFacts(wrap, words);
  paintTimeFacts(lines, words);
  return { bar: wrap, lines };
}

function factNode(tag, className, key) {
  const node = el(tag, className);
  node.dataset.fact = key;
  return node;
}

/** Write the words into a time-facts block: text only, the bar's runs only when they change. */
function paintTimeFacts(root, words) {
  if (!root || !words) return;
  const bar = root.querySelector('.sr-light');
  if (bar) {
    const key = words.bar.map((b) => `${b.sunlit ? 's' : 'd'}${b.share.toFixed(3)}`).join();
    if (bar.dataset.key !== key) {
      bar.dataset.key = key;
      clear(bar);
      for (const b of words.bar) {
        const seg = el('span', b.sunlit ? 'sr-light__seg is-sunlit' : 'sr-light__seg is-shadow');
        seg.style.width = `${(b.share * 100).toFixed(2)}%`;
        bar.appendChild(seg);
      }
    }
    if (bar.getAttribute('aria-label') !== words.barLabel) bar.setAttribute('aria-label', words.barLabel);
    bar.hidden = !words.bar.length;
  }
  for (const key of [...FACT_LINES, ...FACT_SHORT]) {
    const line = root.querySelector(`[data-fact="${key}"]`);
    if (!line) continue;
    const text = words[key] || '';
    if (line.textContent !== text) line.textContent = text;
    if (line.hidden !== !text) line.hidden = !text;
  }
}

/** Once a second while a card with time facts is open: the countdowns move with the clock. */
function tickTimeFacts() {
  if (!current || !host || host.hidden || typeof document === 'undefined') { stopTimeFacts(); return; }
  if (!host.querySelector('.sr-card__time')) { stopTimeFacts(); return; }
  const c = current.ctx;
  let tNow;
  try { tNow = c.clock.now(); } catch { return; }
  const facts = freshFacts(current.record, tNow);
  // The whole card: the bar's short lines and the sentences in "Its path" tick together.
  paintTimeFacts(host, timeFactWords(facts, tNow, c.clock.rate));
}

function startTimeFacts() {
  if (timeTimer || typeof setInterval !== 'function') return;
  timeTimer = setInterval(tickTimeFacts, 1000);
}

function stopTimeFacts() {
  if (timeTimer) clearInterval(timeTimer);
  timeTimer = 0;
}

// ---------------------------------------------------------------------------------------
// Block 5: "see it from here" -- the copy pattern that is the actual feature
// ---------------------------------------------------------------------------------------

/** The see-it-from-here sentence. Exported for the tests. */
export function seeItLine(record, ctx, m, passInfo) {
  const klass = klassOf(record);
  if (pick(meta(record), 'unplaceable')) return COPY.sky.nowhereToLook;
  if (klass === 'storm') return COPY.sky.storm;
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
export function honestyClause(record, m) {
  const md = meta(record);
  const C = COPY.cls;

  // A storm's centre is measured at one advisory; say which, and how long before the moment shown.
  if (klassOf(record) === 'storm') {
    const adv = pickNumber(md, 'advisoryMs');
    const tMs = m && Number.isFinite(m.tMs) ? m.tMs : null;
    return adv !== null && tMs !== null
      ? t(C.stormAdvisory, { time: new Date(adv).toISOString().slice(11, 16), ago: stormAdvisoryAgo(adv, tMs) })
      : null;
  }

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
 * Returns {riding, node} -- the section's contents, and which end of the bolt this card is, which
 * names its row ("Who is aboard" or "What it rides on") -- or null for every record that neither
 * carries anything nor rides on anything, which is all but three of them.
 */
function aboardSection(record, ctx) {
  const md = meta(record);
  const byId = ctx && typeof ctx.recordById === 'function' ? ctx.recordById : null;

  const carrierId = pick(md, 'attachedTo');
  if (carrierId) {
    const carrier = byId ? byId(carrierId) : null;
    if (!carrier) return null; // the carrier's layer is not loaded: no link rather than a dead one
    const wrap = section('sr-card__block sr-card__aboard', null);
    wrap.appendChild(aboardButton(carrier.name, COPY.aboard.backTitle, () => showCard(carrier, ctx)));
    return { riding: true, node: wrap };
  }

  const riding = attachedOdditiesFor(record && record.id);
  if (!riding.length) return null;
  const wrap = section('sr-card__block sr-card__aboard', null);
  let wrote = 0;
  for (const entry of riding) {
    const derived = attachedOddityRecord(entry, record);
    if (!derived) continue;
    wrap.appendChild(aboardButton(entry.display, COPY.aboard.openTitle, () => showCard(derived, ctx)));
    wrote += 1;
  }
  if (!wrote) return null;
  wrap.appendChild(el('p', 'sr-card__aboardnote', COPY.aboard.note));
  return { riding: false, node: wrap };
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
  // Spec 0054: and every world drawn with the world material is exposed for its own sunlight, and
  // the Moon says how much its earthshine is brightened. The Earth and the Sun say neither.
  if (klass === 'world') {
    const md = meta(record);
    const parts = [];
    if (pick(md, 'flat') === true) parts.push(t(pick(md, 'irregular') === true ? T.worldFlatIrregular : T.worldFlat, { name: displayName(record) }));
    if (pick(md, 'exposed') === true && T.worldLit) parts.push(T.worldLit);
    const gain = Number(pick(md, 'earthshineGain'));
    if (gain > 0 && T.worldEarthshine) parts.push(t(T.worldEarthshine, { n: fmt.int(gain) }));
    const air = Number(pick(md, 'airGain'));
    // 1.5 for Mars since internal #187: fmt.int would round it to "2 times".
    if (air > 1 && T.worldAir) parts.push(t(T.worldAir, { n: Number.isInteger(air) ? fmt.int(air) : fmt.num(air, 1) }));
    else if (air === 1 && T.worldAirTrue) parts.push(T.worldAirTrue);
    return parts.length ? parts.join(COPY.punctuation.separator) : null;
  }
  if (!klass) return null;
  if (klass === 'storm') return T.storm;
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
  const honesty = honestyClause(record, m);
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

/**
 * Only for what the sky from your place shows: anything over the Earth, a world, and the stars and
 * what is among them. Not a craft beyond Earth: nothing in the sky view draws it.
 */
const SKY_KLASSES = new Set(['world', 'star', 'dso', 'exotic', 'exoplanet']);
function canSeeFromHere(record, m) {
  return isEarthFrame(m.frame) || SKY_KLASSES.has(klassOf(record));
}

/**
 * Where spec 0048 lets the camera ride: an SGP4 orbit round the Earth, moving, with a position.
 * Follow and Ride along lead the action row there; everything else gets Fly to it and See it.
 * Exported for the test, which holds the row's two shapes.
 */
export function followAllowed(record, ctx, m) {
  return !!(ctx && typeof ctx.rideAlong === 'function' && record && record.propagator === 'sgp4'
    && m && m.ok && isEarthFrame(m.frame) && !standsStill(record, m));
}

// ---------------------------------------------------------------------------------------
// Icons. Lucide (https://lucide.dev, ISC; the Feather-derived ones MIT, Cole Bemis: CREDITS.md),
// drawn the guide's way (docs/ui-guide.md §3.16): the 24 box, stroke 1.75, round caps and joins,
// hidden from a screen reader because the button carries the name. Copied from the icons' own
// files, element for element.
// ---------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
  crosshair: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 22, x2: 18, y1: 12, y2: 12 }],
    ['line', { x1: 6, x2: 2, y1: 12, y2: 12 }],
    ['line', { x1: 12, x2: 12, y1: 6, y2: 2 }],
    ['line', { x1: 12, x2: 12, y1: 22, y2: 18 }],
  ],
  orbit: [
    ['path', { d: 'M20.341 6.484A10 10 0 0 1 10.266 21.85' }],
    ['path', { d: 'M3.659 17.516A10 10 0 0 1 13.74 2.152' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
    ['circle', { cx: 19, cy: 5, r: 2 }],
    ['circle', { cx: 5, cy: 19, r: 2 }],
  ],
  camera: [
    ['path', { d: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z' }],
    ['circle', { cx: 12, cy: 13, r: 3 }],
  ],
  share: [
    ['circle', { cx: 18, cy: 5, r: 3 }],
    ['circle', { cx: 6, cy: 12, r: 3 }],
    ['circle', { cx: 18, cy: 19, r: 3 }],
    ['line', { x1: 8.59, x2: 15.42, y1: 13.51, y2: 17.49 }],
    ['line', { x1: 15.41, x2: 8.59, y1: 6.51, y2: 10.49 }],
  ],
  chevron: [['path', { d: 'm9 18 6-6-6-6' }]],
  navigation: [['polygon', { points: '3 11 22 2 13 21 11 13 3 11' }]],
  telescope: [
    ['path', { d: 'm10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44' }],
    ['path', { d: 'm13.56 11.747 4.332-.924' }],
    ['path', { d: 'm16 21-3.105-6.21' }],
    ['path', { d: 'M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z' }],
    ['path', { d: 'm6.158 8.633 1.114 4.456' }],
    ['path', { d: 'm8 21 3.105-6.21' }],
    ['circle', { cx: 12, cy: 13, r: 2 }],
  ],
  // The trip's toolbar, intro and end card (spec 0061 task 7, ui/tripframe.js): the same family,
  // so a trip's controls and the card's actions read as one set.
  play: [['polygon', { points: '6 3 20 12 6 21 6 3' }]],
  pause: [
    ['rect', { x: 14, y: 4, width: 4, height: 16, rx: 1 }],
    ['rect', { x: 6, y: 4, width: 4, height: 16, rx: 1 }],
  ],
  'chevron-left': [['path', { d: 'm15 18-6-6 6-6' }]],
  'rotate-ccw': [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  'volume-2': [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }],
    ['path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' }],
  ],
  'volume-x': [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['line', { x1: 22, x2: 16, y1: 9, y2: 15 }],
    ['line', { x1: 16, x2: 22, y1: 9, y2: 15 }],
  ],
  'panel-left-close': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M9 3v18' }],
    ['path', { d: 'm16 15-3-3 3-3' }],
  ],
  'panel-left-open': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M9 3v18' }],
    ['path', { d: 'm14 9 3 3-3 3' }],
  ],
  'panel-bottom-close': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 15h18' }],
    ['path', { d: 'm15 8-3 3-3-3' }],
  ],
  'panel-bottom-open': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 15h18' }],
    ['path', { d: 'm9 10 3-3 3 3' }],
  ],
  compass: [
    ['path', { d: 'm16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z' }],
    ['circle', { cx: 12, cy: 12, r: 10 }],
  ],
};

/** An icon from ICONS at `size` px. Exported for the test, which holds the guide's drawing rules. */
export function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `sr-icon sr-icon--${name}`);
  for (const [tag, attrs] of ICONS[name] || []) {
    const part = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, String(v));
    svg.appendChild(part);
  }
  return svg;
}

/** One of the row's four: a 20 px icon over a 13 px label, the whole 56 px button the target. */
function actionButton(action, label, title, iconName, onClick, primary) {
  const b = el('button', primary ? 'sr-act sr-act--primary' : 'sr-act');
  b.type = 'button';
  b.title = title;
  b.dataset.action = action;
  b.appendChild(icon(iconName));
  b.appendChild(el('span', 'sr-act__label', label));
  b.addEventListener('click', onClick);
  return b;
}

/**
 * The action row (spec 0061 §4, docs/ui-guide.md §3.10): four buttons, the first the one ember
 * primary on the screen. Follow is main.js's flight, which follows on arrival (flyTo above), so
 * it is what "Fly to it" always was, named for what it does to an orbiter; Ride along is spec
 * 0048's camera behind it. Postcard and Share are spec 0033's, read at the tap, so the words on a
 * share sheet are the card's at that moment. Exported for the test.
 */
export function actionButtons(record, ctx, m) {
  const A = COPY.card.actions;
  const G = COPY.groundTrack;
  const buttons = [];
  if (followAllowed(record, ctx, m)) {
    buttons.push(actionButton('follow', A.follow, A.followTitle, 'crosshair', () => flyTo(record, ctx, m), true));
    // Under reduced motion the ride is a cut, not a flight, and the tooltip says so: the label
    // stays two words (docs/ui-guide.md §4).
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    buttons.push(actionButton('ride', A.ride, reduced ? G.lookBeside : G.rideAlongTitle, 'orbit', () => {
      try { ctx.rideAlong(record); } catch { /* the camera stays where it is */ }
    }));
  } else {
    const fly = actionButton('fly', A.flyTo, A.flyToTitle, 'navigation', () => flyTo(record, ctx, m), true);
    fly.disabled = !m.ok;
    buttons.push(fly);
    const see = actionButton('see', A.seeShort, A.seeFromHereTitle, 'telescope', () => seeFromHere(record, ctx));
    see.disabled = !canSeeFromHere(record, m);
    // A switched-off control says why (docs/ui-guide.md §3, the standard states).
    if (see.disabled) see.title = COPY.sky.notVisibleFromGround;
    buttons.push(see);
  }
  buttons.push(actionButton('postcard', A.postcard, COPY.share.pictureTitle, 'camera', () => savePicture(ctx, record)));
  buttons.push(actionButton('share', A.share, COPY.share.linkTitle, 'share', () => {
    const w = cardWords(record, ctx);
    return shareLink(ctx, { title: w.name, text: w.sentence }, record && record.id);
  }));
  return buttons.slice(0, MAX_ACTIONS);
}

/**
 * Spec 0048 req 3: for an orbit above 2 000 km, where the ground track is off by default, a switch
 * for it, and the line that says what the track is. Only where the camera may follow. Moved into
 * "Its path" from the old "Follow it" block, whose Ride along is now in the action row.
 */
function trackControls(record, ctx, m) {
  if (!followAllowed(record, ctx, m)) return [];
  const G = COPY.groundTrack;
  const out = [];
  const low = wantsTrack(record, m.tMs);
  if (!low && ctx.groundTrack) {
    const st = ctx.groundTrack.state();
    const shown = st.forced && st.id === record.id;
    const toggle = el('button', 'sr-btn sr-btn--quiet sr-card__inline', shown ? G.hideTrack : G.showTrack);
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', shown ? 'true' : 'false');
    toggle.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-pressed') !== 'true';
      ctx.groundTrack.set(record, { forced: on });
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.textContent = on ? G.hideTrack : G.showTrack;
    });
    out.push(toggle);
  }
  out.push(el('p', 'sr-card__note', low ? G.trackNote : G.highNote));
  return out;
}

// ---------------------------------------------------------------------------------------
// The card view's top: the microlabel and the three numbers (spec 0061 §4)
// ---------------------------------------------------------------------------------------

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s);

/** The region of a body going round the Sun, by its distance from it (the bounds farRegion uses). */
function sunRegion(distSunKm) {
  if (!Number.isFinite(distSunKm)) return null;
  const au = distSunKm / UNITS.AU_KM;
  const G = COPY.card.regime;
  return au < MARS_APHELION_AU ? G.inner : au < NEPTUNE_APHELION_AU ? G.outer : G.beyondNeptune;
}

/** Earth orbits by height: low under 2 000 km, the geostationary ring within 500 km of 35 786. */
function earthOrbitRegime(altKm) {
  const G = COPY.card.regime;
  if (!Number.isFinite(altKm)) return null;
  if (altKm < 2000) return G.leo;
  if (Math.abs(altKm - 35786) <= 500) return G.geo;
  return altKm < 35786 ? G.meo : G.heo;
}

/**
 * The line above the name: what it is and where, "STATION · LOW EARTH ORBIT", four words at most.
 * The class word is the card's own badge (klassLabel) except where a finer one is plainer -- a
 * planet is a planet, not "World" -- and the region is worked out from where it is now, never typed.
 * Exported for the test.
 */
export function microLabel(record, m) {
  const C = COPY.card;
  const G = C.regime;
  const md = meta(record);
  const klass = klassOf(record);
  let kind = klassLabel(record, klass);
  let regime = null;
  if (klass === 'world') {
    const id = String(record.id || '').toLowerCase();
    const parent = pick(md, 'parent');
    if (id === 'sun') { kind = C.microKlass.ourStar; regime = G.centre; }
    else if (parent === 'sun') {
      kind = id === 'pluto' ? C.microKlass.dwarf : C.microKlass.planet;
      regime = sunRegion(m.distSunKm);
    } else {
      kind = C.microKlass.moon;
      const world = worldName(parent);
      regime = world ? t(G.round, { world }) : null;
    }
  } else if (klass === 'storm' || klass === 'site' || standsStill(record, m)) {
    const world = m.worldId && m.worldId !== 'earth' ? worldName(m.worldId) : null;
    regime = world ? t(G.onWorld, { world }) : null;
  } else if (isEarthFrame(m.frame)) {
    regime = earthOrbitRegime(m.altKm);
  } else if (m.worldId && m.worldId !== 'sun') {
    const world = worldName(m.worldId);
    regime = world ? t(m.frame === `${m.worldId}-inertial` ? G.round : G.onWorld, { world }) : null;
  } else if (klass === 'star') {
    const con = pick(md, 'con');
    const ly = pickNumber(md, 'distLy');
    regime = ly !== null && ly < 20 ? G.nearby : con ? t(G.inCon, { con: String(con) }) : null;
  } else if (klass === 'dso') {
    const T = COPY.templates.dso;
    kind = cap(T.kinds[String(pick(md, 'kind') || 'other')] || T.kinds.other);
    const con = pick(md, 'con');
    regime = con ? t(G.inCon, { con: String(con) }) : null;
  } else if (klass === 'exoplanet') {
    kind = C.microKlass.exoplanet;
    const host = pick(md, 'host');
    regime = host ? t(G.round, { world: String(host) }) : null;
  } else if (klass === 'exotic') {
    const T = COPY.templates.exotic;
    const word = T && T.kinds ? T.kinds[String(pick(md, 'kind') || '')] : null;
    regime = word ? cap(word) : null;
  } else {
    regime = sunRegion(m.distSunKm);
  }
  return regime ? t(C.micro, { klass: kind, regime }) : kind;
}

/** The kind of card, for its three numbers. Exported for the test. */
export function heroKind(record, m) {
  const klass = klassOf(record);
  if (klass === 'world') {
    const id = String(record && record.id || '').toLowerCase();
    if (id === 'sun') return 'sun';
    return pick(meta(record), 'parent') === 'sun' ? 'planet' : 'moon';
  }
  if (klass === 'star' || klass === 'dso') return klass;
  const moving = m && !standsStill(record, m);
  if (moving && isEarthFrame(m.frame) && klass !== 'storm' && klass !== 'site') return 'orbiter';
  if ((klass === 'probe' || klass === 'telescope') && m && !isEarthFrame(m.frame)) return 'craft';
  return 'other';
}

// Each of the three is a ROW the card prints, named by its COPY.card.rows key, first one found
// wins; `cap` names the caption when it is not the row's own, `unit` the unit a missing one says.
const HERO_SLOTS = {
  orbiter: [{ rows: ['altitude'], unit: 'km' }, { rows: ['speed'], unit: 'km/h' }, { rows: ['period'], unit: 'minutes' }],
  planet: [{ rows: ['distanceFromSun'], unit: 'astronomical units' }, { rows: ['spin'], unit: 'hours' }, { rows: ['yearLength'], unit: 'days' }],
  moon: [{ rows: ['altitude', 'distanceFromEarth'], cap: 'away', unit: 'km' }, { rows: ['speed'], unit: 'km/h' }, { rows: ['spin'], unit: 'days' }],
  sun: [{ rows: ['distanceFromEarth'], unit: 'astronomical units' }, { rows: ['lightTime'], unit: 'minutes' }, { rows: ['spin'], unit: 'days' }],
  star: [{ rows: ['distanceFromSun'], cap: 'away', unit: 'light-years' }, { rows: ['brightness'] }, { rows: ['spectralType'] }],
  dso: [{ rows: ['distanceFromSun', 'lightLeft'], cap: 'away', unit: 'light-years' }, { rows: ['across'], unit: 'light-years' }, { rows: ['brightness'] }],
  craft: [{ rows: ['distanceFromEarth'], unit: 'astronomical units' }, { rows: ['speed'], unit: 'km/h' }, { rows: ['launched'] }],
};
// For every other kind, the first three of these the card prints: quantities, never a latitude, a
// catalogue number or a year, which are numbers but not measures of the thing.
const HERO_ANY = ['altitude', 'heightAbove', 'speed', 'period', 'fromYou', 'distanceFromEarth', 'distanceFromSun',
  'lightTime', 'lightLeft', 'across', 'spin', 'yearLength', 'planetRadius', 'planetMass', 'mass', 'luminosity',
  'brightness', 'launched'];

let rowPatterns = null;
/** A row's COPY.card.rows key from its label, templated labels ("Height above {world}") included. */
function rowKeyOf(label, m) {
  if (m && (label === rangeLabel(m) || label === COPY.card.rows.fromYou)) return 'fromYou';
  if (!rowPatterns) {
    rowPatterns = Object.entries(COPY.card.rows).map(([k, v]) => [k, v.includes('{')
      ? new RegExp(`^${v.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+')}$`)
      : null, v]);
  }
  for (const [k, re, v] of rowPatterns) if (re ? re.test(label) : v === label) return k;
  return null;
}

const NUMBER = /[−-]?\d[\d ]*(?:\.\d+)?/;
/**
 * A row's value as one number and its unit: "27 556 km/h" -> {num: '27 556', unit: 'km/h'},
 * "magnitude −1.44" -> {num: '−1.44', unit: 'magnitude'}. A range ("1 324 to 1 364 light-years")
 * and a value with no number are not one number: null. Exported for the test.
 */
export function heroSplit(value) {
  const s = String(value == null ? '' : value);
  const hit = NUMBER.exec(s);
  if (!hit) return null;
  const before = s.slice(0, hit.index).trim();
  const after = s.slice(hit.index + hit[0].length).trim();
  if (/^(?:to|–)\s*[−-]?\d/.test(after)) return null;
  return { num: hit[0].trim(), unit: (after || before).replace(/,.*$/, '').trim() };
}

/**
 * The card's three numbers: [{key, num, caption, missing}], each read off the card's own rows
 * (rightNowRows, the rows tagLines() reads too), so the numbers, the rows and the HUD tag cannot
 * disagree. A row the card does not print is "—" with its caption, never a guess and never left
 * out (docs/ui-guide.md principle 4). Exported for tests/test_cards_copy.mjs.
 */
export function heroNumbers(record, m, rows) {
  const H = COPY.card.hero;
  const byKey = new Map();
  for (const [label, value] of rows || []) {
    const k = rowKeyOf(label, m);
    if (k && !byKey.has(k)) byKey.set(k, value);
  }
  const caption = (key, unit) => t(H.captions[key] || H.captions.other, { u: H.units[unit] || unit || '' }).trim();
  const cell = (key, value, capKey) => {
    if (key === 'spectralType') {
      const v = String(value || '').replace(/[.\s]+$/, '');
      return v ? { key, num: v.slice(0, 7), caption: caption(key, ''), missing: false } : null;
    }
    const split = heroSplit(value);
    return split ? { key, num: split.num, caption: caption(capKey || key, split.unit), missing: false } : null;
  };
  const kind = heroKind(record, m || {});
  const slots = HERO_SLOTS[kind];
  if (!slots) {
    const out = [];
    for (const key of HERO_ANY) {
      if (out.length === 3 || !byKey.has(key)) continue;
      const c = cell(key, byKey.get(key));
      if (c) out.push(c);
    }
    return out;
  }
  return slots.map((slot) => {
    for (const key of slot.rows) {
      const c = byKey.has(key) ? cell(key, byKey.get(key), slot.cap) : null;
      if (c) return c;
    }
    return { key: slot.rows[0], num: H.missing, caption: caption(slot.cap || slot.rows[0], slot.unit || ''), missing: true };
  });
}

function heroBlock(heroes) {
  const list = el('ul', 'sr-hero');
  list.setAttribute('aria-label', COPY.card.hero.label);
  for (const h of heroes) {
    const item = el('li', h.missing ? 'sr-hero__cell is-missing' : 'sr-hero__cell');
    item.dataset.row = h.key;
    const num = el('span', 'sr-hero__num', h.num);
    // A long value (a spectral class, 2 540 000 light-years) steps down a size, not out of its column.
    if (String(h.num).length > 6) num.dataset.long = String(h.num).length > 9 ? '2' : '1';
    item.appendChild(num);
    item.appendChild(el('span', 'sr-hero__unit', h.caption));
    list.appendChild(item);
  }
  return list;
}

// ---------------------------------------------------------------------------------------
// Sections that open in place (spec 0061 §4, docs/ui-guide.md §3.10 item 7)
// ---------------------------------------------------------------------------------------

/** Which sections the visitor opened, per record, so a repaint (the clock set, the places
 *  landing) does not close what they opened. */
const openSections = new Map();

function isOpen(recordId, id) {
  const set = openSections.get(recordId);
  return !!(set && set.has(id));
}

function setOpen(recordId, id, on) {
  let set = openSections.get(recordId);
  if (!set) { set = new Set(); openSections.set(recordId, set); }
  if (on) set.add(id); else set.delete(id);
}

/**
 * One row that opens in place: a full-width button with the section's name, an optional one- or
 * two-word hint and a chevron, `aria-expanded` and `aria-controls` on it, and the panel under it
 * `hidden` until it opens (the WAI-ARIA disclosure pattern). No navigation, and any number may be
 * open at once. Exported for the test, which presses it.
 */
export function disclosure(id, label, hint, panel, open, onToggle) {
  const wrap = el('section', 'sr-disc');
  wrap.dataset.section = id;
  const head = el('button', 'sr-disc__head');
  head.type = 'button';
  head.id = `sr-disc-${id}`;
  head.dataset.focus = `disc-${id}`;
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
  head.setAttribute('aria-controls', `sr-disc-${id}-panel`);
  head.appendChild(el('span', 'sr-disc__label', label));
  if (hint) head.appendChild(el('span', 'sr-disc__hint', hint));
  head.appendChild(icon('chevron', 16));
  panel.id = `sr-disc-${id}-panel`;
  panel.classList.add('sr-disc__panel');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', head.id);
  panel.hidden = !open;
  head.addEventListener('click', () => {
    const on = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', on ? 'true' : 'false');
    panel.hidden = !on;
    if (typeof onToggle === 'function') onToggle(on);
  });
  wrap.appendChild(head);
  wrap.appendChild(panel);
  return wrap;
}

/** The card's rows as a definition list. */
function rowsList(rows) {
  const dl = el('dl', 'sr-rows');
  for (const [label, value] of rows) {
    dl.appendChild(el('dt', 'sr-rows__key', label));
    // A value that starts with a number sets the number in the mono face and its unit in Inter, as
    // the three numbers do: "1.56 astronomical units" in mono did not fit its column.
    const split = /^[−-]?\d/.test(String(value)) ? /^([−-]?[\d\u202F.,]*\d)(.*)$/.exec(String(value)) : null;
    const dd = el('dd', 'sr-rows__val', split ? null : value);
    if (split) {
      dd.appendChild(el('span', 'sr-rows__num', split[1]));
      if (split[2]) dd.appendChild(el('span', 'sr-rows__unit', split[2]));
    }
    dl.appendChild(dd);
  }
  return dl;
}

/** The hint at the right of "When you can see it": the next pass in UTC, or why there is none. */
function seeHint(record, ctx, m, passInfo) {
  const S = COPY.card.sections;
  if (!isEarthFrame(m.frame) || standsStill(record, m) || klassOf(record) === 'world' || klassOf(record) === 'storm') return null;
  if (passInfo.state === PASS_OK) return t(S.passAt, { time: new Date(passInfo.pass.startMs).toISOString().slice(11, 16) });
  if (passInfo.state === PASS_NO_OBSERVER) return S.needsPlace;
  return ctx && ctx.observer && ctx.observer.source === 'guess' ? S.placeGuessed : null;
}

// ---------------------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------------------

/**
 * The line the trip GENERATES under the stop's words (spec 0038): the visitor's place, the
 * station's distance from them, its next pass. A function when it changes with the clock, read at
 * every repaint; the words above it are the registry's and never change.
 */
function leadNote(lead) {
  try {
    return (typeof lead.note === 'function' ? lead.note() : lead.note) || '';
  } catch {
    return '';
  }
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

function nameKey(text) {
  return String(text || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '');
}

/** Does a stop title already name this object? "The International Space Station" names the ISS. */
export function sameName(title, name) {
  const a = nameKey(title);
  const b = nameKey(name);
  return !!a && !!b && (a === b || a.includes(b));
}

/** "International Space Station is a crewed..." under a title that said so becomes "It is a crewed...". */
export function withoutLeadingName(sentence, name) {
  const text = String(sentence || '');
  const n = String(name || '').trim();
  if (!n) return text;
  const heads = [n, ...COPY.card.articles.map((a) => `${a} ${n}`)];
  for (const head of heads) {
    for (const verb of COPY.card.leadVerbs) {
      const start = `${head} ${verb} `;
      if (text.startsWith(start)) return `${COPY.card.it} ${verb} ${text.slice(start.length)}`;
    }
  }
  return text;
}

/**
 * The lines the TRIP FRAME writes into the stop card (ui/tripframe.js): when the picture is
 * (`.sr-card__when`, from the clock, every frame it changes) and what an eclipse or a drawn orbit
 * is made of (`.sr-card__tripline`, at the foot with the honesty line). The card repaints when the
 * clock is set, and a repaint must not blank a line for the frame between it and the frame's next
 * write, so the text is carried across. Returns the function that puts it back.
 */
function keepFrameLines(node) {
  const kept = [];
  for (const cls of ['sr-card__when', 'sr-card__tripline']) {
    const old = typeof node.querySelector === 'function' ? node.querySelector(`.${cls}`) : null;
    if (old && old.textContent) kept.push([cls, old.textContent]);
  }
  return () => {
    for (const [cls, text] of kept) {
      const now = node.querySelector(`.${cls}`);
      if (now) { now.textContent = text; now.hidden = false; }
    }
  };
}

/**
 * THE STOP CARD (spec 0061 task 7): during a guided trip the card IS the stop, in the object
 * card's anatomy (docs/ui-guide.md §3.10). Top to bottom: the microlabel "STOP 2 OF 4"; the
 * stop's title as the name; what the stop is looking at, when the title does not already say;
 * when the picture is (the frame's line); the subject's three numbers, from the builders its own
 * card uses, so the two can never disagree; the stop's words as ONE paragraph and the line the
 * trip generates under them; the rows that open in place; the honesty line at the foot.
 *
 * WHY. Ivan, 2026-10-01, with a screenshot of the live trip: the stop was a paragraph floating
 * mid-scene, then a second header row (dot, class chip, Close) under the text, then the object's
 * whole card again below it. One card, one anatomy, in the place the card lives.
 *
 * No action row and no close. The trip's toolbar is the controls: a Follow beside it would be a
 * second ember on screen and a second owner of the camera, and Hide card folds the card away.
 *
 * Mid-flight `lead.body` is null: the microlabel and the title, nothing else (ui/trip.js
 * paintCard says why a body must not be readable while the camera is still moving). A stop that
 * is a PLACE has no record: no numbers and no rows, the stop's words are the whole card.
 */
function renderStop(record, ctx, opts) {
  const lead = opts.lead || {};
  const node = ensureHost();
  const restore = keepPlace(node);
  const putBack = keepFrameLines(node);
  clear(node);
  const m = record ? measure(record, ctx) : null;
  const klass = record ? klassOf(record) : 'world';
  node.dataset.klass = klass;
  node.dataset.cls = record ? String(m.cls || record.cls || '') : '';
  node.dataset.stop = lead.body ? 'full' : 'title';
  if (record && !placesMod && isEarthFrame(m.frame) && m.latDeg !== null && !standsStill(record, m)) ensurePlaces();

  const header = el('header', 'sr-card__header sr-card__header--stop');
  if (lead.micro) header.appendChild(el('p', 'sr-card__micro', lead.micro));
  const title = el('h2', 'sr-card__name', lead.title);
  title.id = CARD_LEAD_TITLE_ID;
  title.tabIndex = -1;
  title.dataset.focus = 'title';
  title.title = String(lead.title || '');
  header.appendChild(title);
  // What the numbers below are OF, when the title is a line of story ("Two places, and only two")
  // rather than a name: the class swatch and the object's own name, never a chip.
  const name = record ? displayName(record) : '';
  const namedAbove = !!(record && sameName(lead.title, name));
  if (record && !namedAbove) {
    const subject = el('p', 'sr-card__subject');
    const dot = el('span', `sr-swatch sr-swatch--${klass}`);
    dot.setAttribute('aria-hidden', 'true');
    subject.appendChild(dot);
    subject.appendChild(el('span', 'sr-card__subjectname', name));
    header.appendChild(subject);
  }
  const when = el('p', 'sr-card__when');
  when.hidden = true;
  header.appendChild(when);
  node.appendChild(header);

  bodyEl = null;
  if (lead.body) {
    const body = el('div', 'sr-card__body');
    bodyEl = body;
    let passInfo = null;
    let rows = [];
    if (record) {
      passInfo = nextPass(record, ctx, m);
      rows = rightNowRows(record, m, passInfo);
      const heroes = heroNumbers(record, m, rows);
      if (heroes.length) body.appendChild(heroBlock(heroes));
    }
    body.appendChild(el('p', 'sr-card__leadbody', lead.body));
    const note = leadNote(lead);
    if (note) body.appendChild(el('p', 'sr-card__leadnote', note));
    if (record) body.appendChild(moreSections(record, ctx, m, passInfo, rows, null, namedAbove, opts));
    node.appendChild(body);

    const foot = el('footer', 'sr-card__foot');
    if (record) foot.appendChild(el('p', 'sr-card__cls', honestyLine(record, m)));
    const tripLine = el('p', 'sr-card__tripline');
    tripLine.hidden = true;
    foot.appendChild(tripLine);
    node.appendChild(foot);
    node.appendChild(moreCue());
  }

  putBack();
  node.hidden = false;
  node.classList.add('is-open');
  markCardOpen(true);
  restore();
  paintMore(node);
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

/** A panel for a disclosure, from the nodes that go in it; null when there are none. */
function panelOf(nodes) {
  const list = nodes.filter(Boolean);
  if (!list.length) return null;
  const panel = el('div', 'sr-disc__body');
  for (const n of list) panel.appendChild(n);
  return panel;
}

/**
 * Before a repaint clears the card: where its scroll was and which control had focus, so the
 * visitor's place survives the clock being set under them. The card scrolls itself as a sheet and
 * the sidebar's slot scrolls it when it is docked (ui/shell.js).
 */
function keepPlace(node) {
  const scroller = (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('sr-side__cardslot')) ? node.parentNode : node;
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  const focusKey = active && node.contains(active) && active.dataset ? active.dataset.focus || null : null;
  const top = scroller.scrollTop || 0;
  return () => {
    if (top && scroller.scrollTop !== top) scroller.scrollTop = top;
    if (!focusKey || typeof node.querySelector !== 'function') return;
    const again = node.querySelector(`[data-focus="${focusKey}"]`);
    if (again && typeof again.focus === 'function') again.focus({ preventScroll: true });
  };
}

/**
 * Block 5, the rows that open in place: When you can see it, Its path, Who is aboard, About it,
 * Sources for this record. A function of its own since spec 0061 task 7, because the stop card in
 * a guided trip carries the same rows under the stop's words (renderStop) and two copies of this
 * block would drift. `time` is the 90-minute facts, or null where the card does not show them.
 */
function moreSections(record, ctx, m, passInfo, rows, time, namedAbove, opts) {
  const S = COPY.card.sections;
  const klass = klassOf(record);
  const name = displayName(record);
  const rid = String(record.id || name);
  const more = el('nav', 'sr-card__more-list');
  more.setAttribute('aria-label', S.label);
  const add = (id, label, hint, panel) => {
    if (!panel) return;
    more.appendChild(disclosure(id, label, hint, panel, isOpen(rid, id), (on) => setOpen(rid, id, on)));
  };

  // When you can see it: the see-it line, the next pass, and See it from here where the action
  // row gave its place to Ride along.
  // The pass row only when there is a pass: otherwise its words are the see-it line's, twice.
  const seeRows = passInfo.state === PASS_OK ? rows.filter(([label]) => label === COPY.card.rows.nextPass) : [];
  const seeNodes = [el('p', 'sr-card__seeline', seeItLine(record, ctx, m, passInfo))];
  if (seeRows.length) seeNodes.push(rowsList(seeRows));
  if (followAllowed(record, ctx, m)) {
    const see = el('button', 'sr-btn sr-btn--quiet sr-card__inline', COPY.card.actions.seeFromHere);
    see.type = 'button';
    see.title = COPY.card.actions.seeFromHereTitle;
    see.dataset.focus = 'see-from-here';
    see.addEventListener('click', () => seeFromHere(record, ctx));
    seeNodes.push(see);
  }
  add('see', S.see, seeHint(record, ctx, m, passInfo), panelOf(seeNodes));

  // Its path: the time facts' sentences, the trajectory (spec 0026 req 14), the ground track's
  // switch above 2 000 km (spec 0048), and what the line drawn on the scene is.
  const lap = orbitLineLine(record);
  add('path', S.path, null, panelOf([
    time ? time.lines : null,
    trajectorySection(record, m.tMs),
    ...trackControls(record, ctx, m),
    lap ? el('p', 'sr-card__note', lap) : null,
  ]));

  // Who is aboard: what rides on this, or what this rides on (data/attached.js).
  const aboard = aboardSection(record, ctx);
  if (aboard) add('aboard', aboard.riding ? S.ridingOn : S.aboard, null, panelOf([aboard.node]));

  // About it: the first sentence and the line on why it is known, the photograph, a world's own
  // notes, every row the card prints, the comparisons, the myths and the train -- the sections
  // the card has always had, in their old order.
  const sentence = firstSentence(record, ctx, m, passInfo);
  const why = whyLine(record);
  const aboutNodes = [el('p', 'sr-card__sentence', namedAbove ? withoutLeadingName(sentence, name) : sentence)];
  if (why) aboutNodes.push(el('p', 'sr-card__why', why));
  // THE PHOTOGRAPH, where the registry has one. Two of the twenty exotics have been
  // photographed -- M87* in 2019 and Sgr A* in 2022 -- and spec 0028 asked for their pictures on
  // the card. The credit rides WITH the picture, visible, because that is what CC BY 4.0 asks for:
  // "the full image credit must be presented in a clear and readable manner to all users, with the
  // wording unaltered". Lazy and async so a card that is never opened costs nothing, and the alt
  // text comes from the registry row, where somebody wrote it by looking.
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
    aboutNodes.push(figure);
  }
  // A world says how it is drawn (spec 0028 step 0). The compression note is scene/worlds.js's own
  // sentence (`viewScale`), never restated here; the Earth's clouds say what they are (COPY.clouds).
  if (klass === 'world') {
    const vs = ctx && ctx.worlds && typeof ctx.worlds.viewScale === 'function' ? ctx.worlds.viewScale(record.id) : null;
    if (vs && vs.exaggerated && vs.note) aboutNodes.push(el('p', 'sr-card__note', vs.note));
    if (record.id === 'earth' && ctx && ctx.liveClouds && typeof ctx.liveClouds.line === 'function') {
      aboutNodes.push(el('p', 'sr-card__note sr-card__clouds', ctx.liveClouds.line(m.tMs)));
    }
    // And its aurora, in the same style: NOAA's forecast of the next hour, how old, not a photograph
    // (scene/aurora.js, 2026-09-30). The words are copy/en.js COPY.aurora.
    if (record.id === 'earth' && ctx && ctx.aurora && typeof ctx.aurora.line === 'function') {
      aboutNodes.push(el('p', 'sr-card__note sr-card__aurora', ctx.aurora.line(m.tMs)));
    }
  }
  const aboutRows = rows.filter(([label]) => label !== COPY.card.rows.nextPass);
  if (aboutRows.length) {
    const now = section('sr-card__block sr-card__now', COPY.card.rightNowLabel);
    now.appendChild(rowsList(aboutRows));
    aboutNodes.push(now);
  }
  // The comparisons, once sentence-long pills at the top of the card: now a list, here.
  const chips = comparisons(record, m);
  if (chips.length) {
    const feel = section('sr-card__block sr-card__compare', COPY.card.comparisonsLabel);
    const list = el('ul', 'sr-compare');
    for (const chip of chips) list.appendChild(el('li', 'sr-compare__item', chip));
    feel.appendChild(list);
    aboutNodes.push(feel);
  }
  // "Often said" -- the myth block, after the facts it corrects -- and the train this rides in
  // (spec 0026 req 17): how many launched together, who leads, and whether they still climb as one.
  aboutNodes.push(mythSection(record), trainSection(record, ctx, m));
  // A world can become the centre of the map (spec 0028 step 0): a quiet button at the end of
  // "About it", not a sentence-long row under the card. Its tooltip is the long form.
  if (klass === 'world') {
    const isCentre = ctx && ctx.stage && ctx.stage.worldId === record.id;
    const centre = el('button', 'sr-btn sr-btn--quiet sr-card__inline', isCentre ? COPY.card.isCentreShort : COPY.card.centreShort);
    centre.type = 'button';
    centre.title = isCentre ? COPY.card.isCentre : t(COPY.card.makeCentre, { name });
    centre.dataset.focus = 'centre';
    centre.disabled = isCentre || !(ctx && typeof ctx.setStage === 'function');
    centre.addEventListener('click', () => {
      if (ctx && typeof ctx.setStage === 'function' && ctx.setStage(record.id)) render(record, ctx, opts);
    });
    aboutNodes.push(centre);
  }
  add('about', S.about, null, panelOf(aboutNodes));

  // Sources for this record: what the drawn shape is, and where the numbers were read.
  const drawn = drawingLine(record);
  add('sources', S.sources, null, panelOf([
    drawn ? el('p', 'sr-card__drawn', drawn) : null,
    el('p', 'sr-card__source', sourceLine(record, ctx)),
  ]));

  return more;
}

function render(record, ctx, opts = {}) {
  if (opts.lead) {
    renderStop(record, ctx, opts);
    return;
  }
  if (!record) return;
  const node = ensureHost();
  const klass = klassOf(record);
  const m = measure(record, ctx);
  const passInfo = nextPass(record, ctx, m);
  // The first card for something over the Earth fetches the places; the row appears when they land.
  if (!placesMod && isEarthFrame(m.frame) && m.latDeg !== null && !standsStill(record, m)) ensurePlaces();

  const restore = keepPlace(node);
  clear(node);
  node.dataset.klass = klass;
  node.dataset.cls = String(m.cls || record.cls || '');

  // 1. the microlabel and the name. (A guided trip's stop is renderStop above.)
  const name = displayName(record);
  const header = el('header', 'sr-card__header');
  header.appendChild(el('p', 'sr-card__micro', microLabel(record, m)));
  const title = el('h2', 'sr-card__name', name);
  // The card is a dialog, and a dialog needs a name: it had role="dialog" and nothing to call it by.
  title.id = CARD_TITLE_ID;
  title.tabIndex = -1; // focusable by script only (takeFocus), never a stop in the tab order
  // A repaint (the clock set, the places landing) replaces the heading; keepPlace() puts focus back
  // on the new one by this key. Without it, focus that had been moved to the card fell to <body>
  // a quarter of a second later (measured leaving a trip, 2026-10-01).
  title.dataset.focus = 'title';
  title.title = name; // two lines, then an ellipsis: the whole name is here
  header.appendChild(title);
  const close = el('button', 'sr-card__close');
  close.type = 'button';
  close.title = COPY.card.closeTitle;
  close.setAttribute('aria-label', COPY.card.close);
  close.dataset.focus = 'close';
  close.appendChild(icon('x'));
  close.addEventListener('click', hideCard);
  header.appendChild(close);
  node.appendChild(header);

  const body = el('div', 'sr-card__body');
  bodyEl = body;
  node.appendChild(body);

  // 2. the three numbers, read off the card's own rows.
  const rows = rightNowRows(record, m, passInfo);
  const heroes = heroNumbers(record, m, rows);
  if (heroes.length) body.appendChild(heroBlock(heroes));

  // 3. the four actions, one of them ember.
  const actions = el('div', 'sr-card__actions');
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', COPY.card.actionsLabel);
  for (const b of actionButtons(record, ctx, m)) {
    b.dataset.focus = `act-${b.dataset.action}`;
    actions.appendChild(b);
  }
  body.appendChild(actions);

  // 4. the next 90 minutes in time: light and shadow, the lap (spec 0048)
  const time = timeFactsSection(record, ctx, m);
  if (time) { body.appendChild(time.bar); startTimeFacts(); }

  // 5. the sections, each opening in place.
  body.appendChild(moreSections(record, ctx, m, passInfo, rows, time, false, opts));

  // 6. the honesty line, small, at the foot: how the position was worked out and how old it is.
  const foot = el('footer', 'sr-card__foot');
  foot.appendChild(el('p', 'sr-card__cls', honestyLine(record, m)));
  node.appendChild(foot);
  node.appendChild(moreCue());

  node.hidden = false;
  node.classList.add('is-open');
  markCardOpen(true);
  restore();
  paintMore(node);
}

/**
 * The card scrolls, and at 1440 x 900 its fact chips sat below the fold with nothing to say so
 * (#279). A fade pinned to the bottom edge while there is more below; gone at the end.
 */
function moreCue() {
  const cue = el('div', 'sr-card__more');
  cue.setAttribute('aria-hidden', 'true');
  return cue;
}

function paintMore(node) {
  if (!node || typeof node.scrollHeight !== 'number') return;
  if (!node.dataset.moreWatched) {
    node.dataset.moreWatched = '1';
    node.addEventListener('scroll', () => paintMore(node), { passive: true });
    if (typeof window !== 'undefined') window.addEventListener('resize', () => paintMore(node));
  }
  const more = node.scrollHeight - node.clientHeight - node.scrollTop > 8;
  if (node.classList.contains('has-more') !== more) node.classList.toggle('has-more', more);
}

function subscribe(ctx) {
  if (subscribed || !ctx || !ctx.clock || !ctx.clock.onChange) return;
  subscribed = true;
  // The Earth's clouds line changes when a picture arrives or the live layer gives way, not on the
  // clock (scene/liveclouds.js onChange, sent as `sr:clouds` by main.js): only that line is rewritten.
  if (typeof window !== 'undefined') {
    // The places arrived: the open card gains its "Below it now" row on the next paint, now.
    window.addEventListener('sr:places', () => {
      if (current && current.record) { try { render(current.record, current.ctx, current.opts); } catch { /* keep the card */ } }
    });
    window.addEventListener('sr:clouds', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__clouds');
      if (!line || !c || !c.liveClouds || current.record.id !== 'earth') return;
      try { line.textContent = c.liveClouds.line(c.clock.now()); } catch { /* keep the last line */ }
    });
    // The aurora line, the same way: a forecast arrived, failed, or the clock moved away from it.
    window.addEventListener('sr:aurora', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__aurora');
      if (!line || !c || !c.aurora || current.record.id !== 'earth') return;
      try { line.textContent = c.aurora.line(c.clock.now()); } catch { /* keep the last line */ }
    });
  }
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
  stopTimeFacts();
  timeState = null;
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
