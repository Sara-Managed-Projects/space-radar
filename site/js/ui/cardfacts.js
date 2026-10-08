// ui/cardfacts.js -- what the card KNOWS about a record, apart from the card that shows it.
//
// measure() (where the thing is and how fast, against the Earth, the Sun and you), rightNowRows()
// (the card's "right now" rows from that), the honesty line, and tagLines(): the tracked object's
// three lines, which ui/hud.js draws beside the object and the light embed draws on its frame.
//
// WHY A FILE OF ITS OWN (2026-10-08, internal #429). These lived in ui/cards.js, and the light embed
// (js/embedlite.js) fetched the whole card for them: cards.js and the 22 modules only it brings were
// 261 137 B of the embed's 2.3 MB, for three lines of text. Everything here was moved as it stood,
// in the order it stood, comments and all; ui/cards.js imports it and exports it again, so every
// caller and every test of the card still finds each name where it was. ui/cardgate.js fetches this
// file alone for a caller that wants only the tag (wantFacts()).
//
// NOT IN THE BOOT GRAPH. Like the card, this arrives after the first screen: it imports
// copy/en.later.js (four of its sections are read here) and sky/passes.js. tests/test_boot_diet.mjs
// holds it out.

import { COPY, t, fmt, timeText, fistsWords, inWords, ageInWords, UNITS } from '../copy/en.js';
import { propagate, EPHEMERIS_OF } from '../propagate/index.js';
import { launchLabel } from './labels.js';
import { realModelFor } from '../scene/realmodels.js';
import { sunlitState } from '../scene/shadow.js';
import { periodMsOf } from '../scene/orbitline.js';
import { gmst, eciToEcef, ecefToGeodetic, geodeticToEcef, parseFrame, bodyFixedToSpherical, worldRadiusKm, toStage, spinPeriodHours, moonLapHours, yearDays } from '../propagate/frames.js';
import { predictPasses } from '../sky/passes.js';
import '../copy/en.later.js';

// WHAT A GENERATED STAR SYSTEM ADDS TO A CARD (internal #466), handed in by ui/cards.js and not
// imported here: this module also serves the light embed, which has no star systems, and
// ui/systemcard.js reaches scene/systems.js. `{planet(record), star(record)}`, each null for a
// record that is not a member of a generated system whose rows have landed.
let systemRows = null;
export function setSystemRows(source) { systemRows = source; }

export const MAX_NAME = 72; // keeps the first sentence inside its limit whatever a feed sends
export const PASS_WINDOW_HOURS = 24;
export const DEG = 180 / Math.PI;

export function meta(record) {
  return (record && record.meta) || {};
}

/** First defined, non-empty value among the given meta keys. Upstream names vary. */
export function pick(source, ...keys) {
  for (const key of keys) {
    const v = source[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

export function pickNumber(source, ...keys) {
  const v = pick(source, ...keys);
  // Number(null) is 0, so the null has to be caught before the cast: a missing number
  // must stay missing. Without this the card writes a comparison nobody sourced.
  if (v === null || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** A time in ms from whatever an upstream called it: ms number, seconds, or ISO string. */
export function pickTime(source, ...keys) {
  const v = pick(source, ...keys);
  if (v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e11 ? v : v * 1000;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : null;
}

export function displayName(record) {
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
  // Too long for the first sentence: cut BETWEEN words, never inside one (public #378: a mission
  // that ends "Transpor…" is a name nobody can look up), and never leave a joiner dangling.
  const head = name.slice(0, MAX_NAME - 1);
  const gap = /\s/.test(name[MAX_NAME - 1]) ? head.length : head.lastIndexOf(' ');
  const whole = gap > MAX_NAME / 2 ? head.slice(0, gap) : head;
  return whole.replace(/[\s·,;:&|(/-]+$/, '') + COPY.punctuation.ellipsis;
}

export function klassOf(record) {
  const k = record && record.klass ? String(record.klass) : '';
  return Object.prototype.hasOwnProperty.call(COPY.klass, k) ? k : 'unknown';
}

export function isEarthFrame(frame) {
  return frame === 'earth-inertial' || frame === 'earth-fixed';
}

/**
 * The world a frame belongs to, or null. `ecefToGeodetic` is Earth's ellipsoid and nothing else's,
 * so everything below this line asks WHICH world before it prints a latitude. A lunar site used to
 * arrive here claiming 'earth-fixed' and got an Earth latitude that read as the Central African
 * Republic; the propagator no longer lies about the frame, and the card no longer assumes it.
 */
export function frameWorld(frame) {
  const f = parseFrame(frame);
  return f ? f.world : null;
}

/** 'the Moon', 'Mars'... or null if the app has no name for it. Null is a printable answer. */
export function worldName(worldId) {
  if (!worldId) return null;
  return Object.prototype.hasOwnProperty.call(COPY.worlds, worldId) ? COPY.worlds[worldId] : null;
}

// ---------------------------------------------------------------------------------------
// Measurement: everything the "right now" block shows, worked out from the one clock.
// Every call into another module is wrapped: a propagator that throws produces
// "could not work this out", never a blank card and never a made-up number.
// ---------------------------------------------------------------------------------------

export function positionAt(record, tMs) {
  try {
    const p = propagate(record, tMs);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
    return p;
  } catch {
    return null;
  }
}

export function measure(record, ctx) {
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
  // Drawn from the craft's own path file (propagate/ephemeris.js), not from the record's elements.
  out.eph = p.eph === true;
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
export function heliocentricEarth(ctx, tMs) {
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

export const PASS_NO_OBSERVER = 'no-observer';
export const PASS_NOT_APPLICABLE = 'not-applicable';
export const PASS_NONE = 'none';
export const PASS_ERROR = 'error';
export const PASS_OK = 'ok';

/**
 * Standing on the ground right now: a pad, a dish, a landing site, a museum case -- or a rocket
 * that has not lifted off yet.
 *
 * The last one is new. An upcoming launch is drawn at its pad until T-0 (propagate/ascent.js), and
 * its card said "Passing over 19.6 N, 110.9 E", "in sunlight" and "Next pass over you" about a
 * rocket four days from leaving the ground. The rows and the pass predictor both ask this one
 * question, so they cannot disagree about it.
 */
export function standsStill(record, m) {
  if (!record) return false;
  if (record.propagator === 'fixed' || klassOf(record) === 'site') return true;
  const a = record.propagator === 'ascent' ? record.ascent : null;
  return !!a && Number.isFinite(a.t0Ms) && m && Number.isFinite(m.tMs) && m.tMs < a.t0Ms;
}

export function nextPass(record, ctx, m) {
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
export function roughly(n) {
  if (!(n >= 100)) return Math.round(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

/**
 * How long before the moment on screen a storm's advisory was: "3 hours ago", or "in 2 hours" when
 * the clock stands in the six hours before it (data/parsers.js STORM_BEFORE_MS). Exported for the test.
 */
export function stormAdvisoryAgo(advisoryMs, tMs) {
  if (!Number.isFinite(advisoryMs) || !Number.isFinite(tMs)) return '';
  return tMs >= advisoryMs ? ageInWords(tMs - advisoryMs) : inWords(advisoryMs - tMs);
}

/**
 * A storm's advisory as a card says it: "21:00 UTC, an hour ago", and with the advisory's own DATE
 * when the clock stands on another UTC day (public #330): a storm is drawn for twelve hours after
 * its advisory, so a clock just past midnight used to show yesterday's 21:00 as if it were today's.
 */
export function stormAdvisoryText(advisoryMs, tMs, plain = COPY.card.values.stormAdvisory, withDate = COPY.card.values.stormAdvisoryDated) {
  const day = (ms) => Math.floor(ms / 86400000);
  const dated = Number.isFinite(tMs) && day(tMs) !== day(advisoryMs);
  return t(dated && withDate ? withDate : plain, { date: timeText.utcDate(advisoryMs), time: new Date(advisoryMs).toISOString().slice(11, 16), ago: stormAdvisoryAgo(advisoryMs, tMs) });
}

/** A storm's status word: the basin's own name for hurricane strength, else the status itself. */
export function stormStatusKey(md) {
  const status = pick(md, 'status');
  if (status === 'hurricane') return pick(md, 'basinWord') || 'hurricane';
  return status || null;
}

/** A size in km² as the card writes it; under one square kilometre is said, not rounded to 0. */
export function eventSizeText(km2) {
  const E = COPY.earthEvent;
  if (!Number.isFinite(km2) || km2 <= 0) return null;
  return km2 < 1 ? E.sizeSmall : t(E.sizeValue, { n: fmt.int(roughly(km2)) });
}

/**
 * The rows of a wildfire, a volcano or an iceberg (data/eonet.js): what it is, when it was last
 * reported, how big that report said, where, and who reported it. Exported for the test.
 */
export function earthEventRows(record) {
  const E = COPY.earthEvent;
  const md = meta(record);
  const rows = [];
  const kind = pick(md, 'kind');
  if (kind && E.kinds[kind]) rows.push([E.rows.kind, E.kinds[kind]]);
  const reported = pickNumber(md, 'reportedMs');
  if (reported !== null) rows.push([kind === 'volcano' ? E.rows.since : E.rows.reported, timeText.utcLong(reported)]);
  const first = pickNumber(md, 'firstMs');
  if (first !== null && reported !== null && reported - first > 86400e3) rows.push([E.rows.first, timeText.utcLong(first)]);
  const size = eventSizeText(pickNumber(md, 'sizeKm2'));
  if (size) rows.push([E.rows.size, size]);
  const lat = pickNumber(md, 'latDeg');
  const lon = pickNumber(md, 'lonDeg');
  if (lat !== null && lon !== null) rows.push([E.rows.where, t(COPY.card.values.latLon, { lat: latText(lat), lon: lonText(lon) })]);
  const agencies = pick(md, 'agencies');
  if (Array.isArray(agencies) && agencies.length) rows.push([E.rows.by, t(E.by, { agencies: agencies.slice(0, 3).join(COPY.punctuation.listJoin) })]);
  return rows;
}

/** The three worlds a card must not measure against themselves. */
export const isWorld = (record, id) => klassOf(record) === 'world' && String(record && record.id || '').toLowerCase() === id;

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
export const WHY_KLASSES = new Set(['star', 'exotic', 'dso']);
// THE BUNDLED ROWS' `note` (2026-09-22). data/sample.js writes one visitor-facing line for each of
// its asteroids, deep-space craft and historic reentries -- "OSIRIS-REx brought 122 grams of it back
// to the Utah desert", each sourced in a comment beside it, and tests/test_deep_space.mjs holds the
// craft to 160 characters "for the card" -- and nothing printed any of the 23. Their `why` is the
// honesty line (classLine prints it), so the line that says why the thing is known is `note`. A live
// row replacing a bundled one keeps it (data/parsers.js parseHorizonsVectors); no parser writes one.
export const NOTE_KLASSES = new Set(['probe', 'telescope', 'asteroid', 'debris']);

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

export function latText(latDeg) {
  const v = Math.abs(latDeg);
  return t(latDeg >= 0 ? COPY.card.values.north : COPY.card.values.south, { n: fmt.num(v, 1) });
}

export function lonText(lonDeg) {
  const v = Math.abs(lonDeg);
  return t(lonDeg >= 0 ? COPY.card.values.east : COPY.card.values.west, { n: fmt.num(v, 1) });
}

/**
 * An ended craft at a clock after its end (Cassini today): the day it ended, in words; else null.
 * The row carries `endDate` (data/sample.js PAST_CRAFT, read on NASA's page for each). Inside its
 * years the craft is drawn from its own path and `m.ok` is true, so this answers null there.
 */
export function endedWords(record, m) {
  const end = pick(meta(record), 'endDate');
  if (!end || (m && m.ok)) return null;
  const ms = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  const tMs = m && Number.isFinite(m.tMs) ? m.tMs : Date.now();
  return tMs >= ms ? timeText.utcLong(ms) : null;
}

export function rightNowRows(record, m, passInfo) {
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
    // A craft whose mission is over (internal #424): the day it ended, not a failed sum.
    const ended = endedWords(record, m);
    if (ended) { rows.push([R.ended, ended]); return rows; }
    rows.push([R.altitude, COPY.card.couldNotLook]);
    return rows;
  }
  // An event on the ground: its report's rows. No height and no speed, as for a storm.
  if (klassOf(record) === 'earthevent') return earthEventRows(record);
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
    if (adv !== null) rows.push([R.stormAdvisory, stormAdvisoryText(adv, m.tMs)]);
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
    // A planet of a generated system whose rows have landed (internal #466): the row says which of
    // its numbers are the Archive's estimates, and adds what this map computed, labelled as computed.
    const facts = systemRows ? systemRows.planet(record) : null;
    const rade = pickNumber(md, 'radiusEarths');
    if (facts && facts.radius) rows.push([R.planetRadius, facts.radius]);
    else if (rade !== null) rows.push([R.planetRadius, t(V.earths, { n: fmt.smart(rade) })]);
    const mass = pickNumber(md, 'massEarths');
    if (facts && facts.mass) rows.push([R.planetMass, facts.mass]);
    else if (mass !== null) rows.push([R.planetMass, t(V.earths, { n: fmt.smart(mass) })]);
    const period = pickNumber(md, 'periodDays');
    if (period !== null) rows.push([R.yearLength, period >= 2 ? t(V.days, { n: fmt.smart(period) }) : t(V.hours, { n: fmt.smart(period * 24) })]);
    const year = pickNumber(md, 'discYear');
    const method = pick(md, 'method');
    if (year !== null) rows.push([R.found, method ? t(V.yearByMethod, { year: String(Math.round(year)), method: String(method) }) : String(Math.round(year))]);
    const asOf = pick(md, 'asOf');
    if (asOf) rows.push([R.catalogueCopy, t(V.asOf, { date: String(asOf) })]);
    if (facts) rows.push(...facts.rows);
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
    // Worked out from its brightness and colour (scene/stars3d.js starPhysical), and it says so:
    // the same number the disc on the scene is drawn from.
    const width = pickNumber(md, 'widthSuns');
    if (width !== null && width > 0) rows.push([R.starWidth, t(V.sunsWide, { n: fmt.smart(width) })]);
    const hip = pick(md, 'hip');
    if (hip) rows.push([R.catalogue, `HIP ${hip}`]);
    // The host of a generated system (internal #466): the table's numbers for the star, and the
    // habitable zone this map computed from them, labelled as computed.
    const ofSystem = systemRows ? systemRows.star(record) : null;
    if (ofSystem) rows.push(...ofSystem);
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
    // A moon that keeps one face to its planet (scene/worlds.js `rotation: 'locked'`, which is how
    // its globe is turned) turns once a lap: the lap, measured from where it is drawn.
    const hours = spinPeriodHours(record.id, m.tMs) || (pick(md, 'locked') === true ? moonLapHours(record.id, m.tMs) : null);
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
export let placesMod = null;
export let placesAsked = null;

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
export function rangeLabel(m) {
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

export function ageParts(ageMs) {
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
      // A craft drawn from its path file was not propagated from the row's elements, whatever the
      // row has: "from elements 22 years old" was printed under Webb in 2022 (seen 2026-10-06).
      // The mission box under the card says where the position is from and how good it is.
      if (m.eph) return COPY.cls.inferredNoElements;
      // "Elements" is a claim about HOW the position was worked out, and a fixed record has none.
      // GP records carry `satrec` (an SGP4 element set), not `elements`; both are elements in
      // the sense this sentence means. MEASURED 2026-09-08: every satellite card said
      // "worked out rather than measured" with no age, the ISS included, on 19-hour-old data.
      if (!record || !(record.elements || record.satrec)) return COPY.cls.inferredNoElements;
      if (!Number.isFinite(epoch) || !Number.isFinite(m.tMs)) return COPY.cls.inferredUnknownAge;
      return t(COPY.cls.inferred, ageParts(Math.max(0, m.tMs - epoch)));
    }
    case 'illustrative':
      // The whole tracked population of debris (data/satcat.js): the orbit is the catalogue's, the
      // place on it is not known to us. "The real track is not public" would be wrong of these.
      return pick(meta(record), 'placeIllustrative') ? COPY.cls.placeIllustrative : COPY.cls.illustrative;
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
/** Inside this of the Earth a two-body orbit round the Sun is not to be trusted: 0.05 au, the distance that makes an asteroid "potentially hazardous". */
export const NEAR_EARTH_KM = 0.05 * 149597870.7;

/** Whether this is an asteroid or comet drawn from its ellipse round the Sun while that close to the Earth. Exported for the test. */
export function nearEarthOnEllipse(record, m) {
  if (!record || !m || record.propagator !== 'kepler' || record.frame !== 'sun-inertial') return false;
  const k = klassOf(record);
  if (k !== 'asteroid' && k !== 'comet') return false;
  if (!Number.isFinite(m.distEarthKm) || m.distEarthKm > NEAR_EARTH_KM) return false;
  // Drawn from its own file right now? Then the Earth's pull is in the path.
  const own = EPHEMERIS_OF.get(record.id);
  if (own && Number.isFinite(m.tMs)) { try { if (own(m.tMs)) return false; } catch { /* the ellipse it is */ } }
  return true;
}

export function honestyClause(record, m) {
  const md = meta(record);
  const C = COPY.cls;

  // An event from EONET is one point and one date; say both, when it was read, and the publisher's caveat.
  if (klassOf(record) === 'earthevent') {
    const reported = pickNumber(md, 'reportedMs');
    const read = pickNumber(md, 'readMs');
    return reported !== null && read !== null
      ? t(COPY.earthEvent.honesty, { date: timeText.utcLong(reported), read: timeText.utcLong(read) })
      : null;
  }

  // A storm's centre is measured at one advisory; say which, and how long before the moment shown.
  if (klassOf(record) === 'storm') {
    const adv = pickNumber(md, 'advisoryMs');
    const tMs = m && Number.isFinite(m.tMs) ? m.tMs : null;
    return adv !== null && tMs !== null
      ? stormAdvisoryText(adv, tMs, C.stormAdvisory, C.stormAdvisoryDated)
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

  // A rock on a two-body orbit, close to the Earth (internal #298, TheSkyLive's own caveat): the
  // ellipse leaves out the Earth's pull, which is what bends a close pass. Not said of a record
  // drawn from its own path file at this moment (Apophis in 2029), where the pull is in the path.
  if (nearEarthOnEllipse(record, m)) return C.nearEarthApprox;

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
 * Block 7's line and block 8's line, as the card prints them. Exported because other things print
 * them too: the HUD's tag starts with the honesty line, and the object pages
 * (scripts/object_pages.mjs) carry the source line, and neither may drift from the card. One
 * function, several printers.
 */
export function honestyLine(record, m) {
  const honesty = honestyClause(record, m);
  return classLine(record, m) + (honesty ? COPY.punctuation.dash + honesty : '');
}

/** Has sky/overplace.js landed? ui/cards.js asks for it on the first card that could use it. */
export function placesReady() {
  return !!placesMod;
}
