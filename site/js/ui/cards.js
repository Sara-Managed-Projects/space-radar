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
import '../copy/en.later.js';
import { propagate, EPHEMERIS_OF } from '../propagate/index.js';
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
  eclipticToEquatorial,
  spinPeriodHours,
  moonLapHours,
  yearDays,
} from '../propagate/frames.js';
import { predictPasses } from '../sky/passes.js';
import { riseHighestSet, RISE_SET_BODIES } from '../sky/riseset.js';
import { altitudeInWords, azimuthInWords } from '../sky/skywords.js';
import { trajectorySection } from './trajectory.js';
import { hasTimeFacts, timeFacts, mmss, LIGHT_MINUTES } from '../sky/timefacts.js';
import { wantsTrack } from '../scene/groundtrack.js';
import { trainOf } from '../data/trains.js';
import { attachedOdditiesFor, attachedOddityRecord } from '../data/attached.js';
import { openShare, savePostcard } from './share.js';
import { exposurePanel, pictureNote } from './exposure.js';
import { stage } from '../scene/stage.js';
import { icon } from './icons.js';
import { overlayLine, legendNode, paintLegend } from './overlaylegend.js';
import { systemOfRecordId, phaseIsMeasured } from '../scene/systems.js';
import { liveBlock, paintLive, sparkBlock, crewBlock, linkNodes, smallBodyFromLine } from './cardextras.js';
import { upForWords } from './cardlive.js';
import { launchMsOf } from '../data/satcat.js';
// The card's FACTS (what is measured about a record, its "right now" rows, its honesty line, the
// tag's three lines) live in ui/cardfacts.js since 2026-10-08, so the light embed can have the tag
// without the card (internal #429). They are this module's as before: imported here, exported again.
import {
  DEG, meta, pick, pickNumber, pickTime, displayName, klassOf, isEarthFrame, frameWorld, worldName,
  positionAt, measure, heliocentricEarth, PASS_NO_OBSERVER, PASS_NOT_APPLICABLE, PASS_NONE,
  PASS_ERROR, PASS_OK, standsStill, nextPass, roughly, stormAdvisoryAgo, stormStatusKey, isWorld,
  whyLine, endedWords, rightNowRows, placesMod, ensurePlaces, rangeLabel, nearEarthOnEllipse,
  honestyLine, placesReady,
} from './cardfacts.js';
export {
  stormAdvisoryAgo, stormAdvisoryText, earthEventRows, whyLine, endedWords, ensurePlaces,
  belowWords, TAG_READOUTS, TAG_HONESTY_MAX, shortHonesty, splitReadout, tagLines, classLine,
  NEAR_EARTH_KM, nearEarthOnEllipse, honestyClause, honestyLine,
} from './cardfacts.js';

const MAX_FIRST_SENTENCE = 160; // spec 0013 requirement 10, enforced by check_copy.py
const MAX_COMPARISONS = 3; // spec 0013 requirement 2
const MAX_ACTIONS = 4; // spec 0013 requirement 8 said three; spec 0061 §4 adds the postcard to the row
const REFRESH_MS = 250; // a UI throttle on re-render, not a source of drawn state
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
// The distance from the Earth, rewritten once a second while its card is open (internal #295).
let liveTimer = 0;

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

/**
 * This record's distance from the Earth as a function of time, km, from the same propagation the
 * card's rows use (measure above); null where the card has no computed distance to give: the Earth
 * itself, anything in the Earth's own frame, and a craft whose range is a number on its record
 * (a Lagrange-point stand-in, see measure). The ticking row and the six-year curve both read it.
 */
export function earthDistanceAt(record, ctx) {
  if (!record || record.id === 'earth' || isEarthFrame(record.frame)) return null;
  if (pickNumber(meta(record), 'earthRangeKm') !== null) return null;
  return (tMs) => {
    const p = positionAt(record, tMs);
    if (!p) return null;
    const frame = p.frame || record.frame;
    if (frame === 'sun-inertial') {
      const earth = heliocentricEarth(ctx, tMs);
      return earth ? Math.hypot(p.x - earth.x, p.y - earth.y, p.z - earth.z) : null;
    }
    if (isEarthFrame(frame) || !frameWorld(frame)) return null;
    try {
      const geo = toStage(record, p, { worldId: 'earth', frame: 'earth-inertial', tMs }, tMs);
      return geo && Number.isFinite(geo.x) ? Math.hypot(geo.x, geo.y, geo.z) : null;
    } catch {
      return null;
    }
  };
}

function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Once a second while a card with the ticking distance is open; never under reduced motion. */
function tickLive() {
  if (!current || !current.record || !host || host.hidden) { stopLive(); return; }
  const box = host.querySelector('.sr-live');
  if (!box) { stopLive(); return; }
  let tNow;
  try { tNow = current.ctx.clock.now(); } catch { return; }
  paintLive(box, earthDistanceAt(current.record, current.ctx), tNow, false);
}

function startLive() {
  if (liveTimer || typeof setInterval !== 'function' || reducedMotion()) return;
  liveTimer = setInterval(tickLive, 1000);
}

function stopLive() {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = 0;
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
  earthevent(record, ctx, m, passInfo, T) {
    const md = meta(record);
    const kind = pick(md, 'kind');
    const reported = pickNumber(md, 'reportedMs');
    if (!T.lead[kind] || reported === null) return buildSentence(t(COPY.card.unknownKind, { name: displayName(record) }), []);
    const km2 = pickNumber(md, 'sizeKm2');
    return buildSentence(
      t(T.lead[kind], { name: displayName(record), date: timeText.utcLong(reported) }),
      [km2 !== null && km2 >= 1 ? t(T.size, { n: fmt.int(roughly(km2)) }) : null],
    );
  },

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
  const onTheGround = klassOf(record) === 'site' || klassOf(record) === 'storm' || klassOf(record) === 'earthevent';
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
  // "Up for 28 years" from the catalogue's launch date when the catalogue has been read this
  // visit (data/satcat.js launchMsOf: the debris view reads it, the card never does for one line),
  // else from the designator's year, said as "about" (internal #127).
  if (Number.isFinite(facts.launchMs) || Number.isFinite(facts.launchYear)) {
    out.launched = upForWords(facts.launchMs, facts.launchYear, tNow) || t(T.launched, { year: String(facts.launchYear) });
  }
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
  if (facts) facts.launchMs = launchMsOf(pickNumber(meta(record), 'noradId', 'norad', 'NORAD_CAT_ID'));
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

/**
 * "From London: rises 09:46 in the east, highest 14:42, about two fists above the horizon; sets
 * 19:38 in the west." Null without a place, or for a world the library does not solve.
 */
export function worldFromLine(record, ctx, m) {
  const o = ctx && ctx.observer;
  const id = String((record && record.id) || '').toLowerCase();
  if (!o || !RISE_SET_BODIES.includes(id)) return null;
  const latDeg = Number.isFinite(o.latDeg) ? o.latDeg : Number.isFinite(o.latRad) ? o.latRad * 180 / Math.PI : NaN;
  const lonDeg = Number.isFinite(o.lonDeg) ? o.lonDeg : Number.isFinite(o.lonRad) ? o.lonRad * 180 / Math.PI : NaN;
  let tMs = m && Number.isFinite(m.tMs) ? m.tMs : NaN;
  if (!Number.isFinite(tMs)) { try { tMs = ctx.clock.now(); } catch { tMs = Date.now(); } }
  const r = riseHighestSet(id, { latDeg, lonDeg, altKm: o.altKm }, tMs);
  if (!r) return null;
  const W = COPY.sky.worldFrom;
  const v = {
    place: typeof o.name === 'string' && o.name ? o.name : COPY.sky.worldHere,
    alt: altitudeInWords(r.altDeg), dir: azimuthInWords(r.azDeg),
    rise: r.riseMs !== null ? timeText.hhmm(r.riseMs) : '', riseDir: r.riseAzDeg !== null ? azimuthInWords(r.riseAzDeg) : '',
    highTime: r.highMs !== null ? timeText.hhmm(r.highMs) : '', highAlt: r.highAltDeg !== null ? altitudeInWords(r.highAltDeg) : '',
    set: r.setMs !== null ? timeText.hhmm(r.setMs) : '', setDir: r.setAzDeg !== null ? azimuthInWords(r.setAzDeg) : '',
  };
  if (r.never) return t(W.never, v);
  if (r.upNow) return t(r.always ? W.always : r.highMs !== null ? W.up : W.upPast, v);
  if (r.highMs === null) return null;
  return t(r.setMs !== null ? W.down : W.downNoSet, v);
}

/** The see-it-from-here sentence. Exported for the tests. */
export function seeItLine(record, ctx, m, passInfo) {
  const klass = klassOf(record);
  if (pick(meta(record), 'unplaceable')) return COPY.sky.nowhereToLook;
  if (klass === 'storm') return COPY.sky.storm;
  if (klass === 'earthevent') return COPY.earthEvent.sky;
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
    // Rises, highest and sets from the visitor's place (internal #299), for the ten the
    // astronomy library solves. What the eye needs to see it (worldSee) still comes first.
    const from = worldFromLine(record, ctx, m);
    if (from) {
      const wid = String(record.id || '').toLowerCase();
      const needs = Object.prototype.hasOwnProperty.call(COPY.sky.worldSee, wid) ? COPY.sky.worldSee[wid] : '';
      return [needs, from, COPY.sky.worldFrom.honest].filter(Boolean).join(' ');
    }
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
  // A comet or an asteroid: rises, highest and sets from the visitor's place, from its own orbit
  // (internal #299; sky/riseany.js). Whether it is BRIGHT enough is another matter, and the line says so.
  if ((klass === 'asteroid' || klass === 'comet') && m.frame === 'sun-inertial' && Number.isFinite(m.tMs)) {
    let from = null;
    try {
      from = smallBodyFromLine((tMs) => {
        const p = positionAt(record, tMs);
        const earth = p ? heliocentricEarth(ctx, tMs) : null;
        return earth ? eclipticToEquatorial({ x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z }) : null;
      }, ctx && ctx.observer, m.tMs);
    } catch { from = null; }
    if (from) return from;
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
    // 2026-10-05: a moon bent to its measured shape says so, with or without a map (Phobos, Deimos);
    // a map that is a tinted black-and-white mosaic, toned-down false colour or an infrared view
    // says which; and one with a side nobody has photographed says that the plain part is not a guess.
    const shaped = pick(md, 'shaped') === true;
    if (pick(md, 'flat') === true) {
      const line = shaped ? T.worldFlatShaped : pick(md, 'irregular') === true ? T.worldFlatIrregular : T.worldFlat;
      parts.push(t(line, { name: displayName(record) }));
    } else if (shaped && T.worldShaped) parts.push(T.worldShaped);
    const kind = T.worldMap && T.worldMap[pick(md, 'mapKind')];
    if (kind) parts.push(kind);
    const part = T.worldCoverage && T.worldCoverage[record.id];
    if (part && pick(md, 'flat') !== true) parts.push(part);
    // The Sun close up (scene/sun.js): what is modelled, what is illustrative. The spots have their own line.
    if (record.id === 'sun' && T.worldSun) parts.push(T.worldSun);
    if (pick(md, 'exposed') === true && T.worldLit) parts.push(T.worldLit);
    const gain = Number(pick(md, 'earthshineGain'));
    if (gain > 0 && T.worldEarthshine) parts.push(t(T.worldEarthshine, { n: fmt.int(gain) }));
    // The narrow rings of Uranus and Neptune: at measured radii, and drawn so that they show.
    const widen = Number(pick(md, 'ringsWiden'));
    const dense = Number(pick(md, 'ringsDense'));
    if (widen > 0 && T.worldRings) {
      parts.push(dense > 1 ? t(T.worldRingsDense, { w: fmt.int(widen), d: fmt.int(dense) }) : t(T.worldRings, { w: fmt.int(widen) }));
    }
    const air = Number(pick(md, 'airGain'));
    // 1.5 for Mars since internal #187: fmt.int would round it to "2 times".
    if (air > 1 && T.worldAir) parts.push(t(T.worldAir, { n: Number.isInteger(air) ? fmt.int(air) : fmt.num(air, 1) }));
    else if (air === 1 && T.worldAirTrue) parts.push(T.worldAirTrue);
    return parts.length ? parts.join(COPY.punctuation.separator) : null;
  }
  if (!klass) return null;
  if (klass === 'storm') return T.storm;
  if (klass === 'earthevent') return COPY.earthEvent.drawn;
  let entry = null;
  try { entry = realModelFor(record); } catch { entry = null; }
  if (entry && entry.name) {
    if (entry.generic) return t(T.objectFamily, { name: String(entry.name) });
    // A `file:` entry is somebody's model, loaded; a `build:` entry is scene/models.js working
    // from published metres. Both were printing "drawn from published dimensions", which is true
    // of one of them. See COPY.drawing.objectModel.
    const line = t(entry.file ? T.objectModel : T.objectVariant, { name: String(entry.name) });
    // 2026-10-07: a small body that wears a map on its shape (Ceres, Vesta) names the mosaic.
    const mapped = entry.mapped && T.objectMapped ? T.objectMapped[entry.mapped] : null;
    return mapped ? line + COPY.punctuation.separator + mapped : line;
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
 * words are read from here (spec 0033 req 2, 3, 7; ui/sharesheet.js), so a post can never state a
 * number the card does not.
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
    // "Show me in the sky" (internal #299): a world, a star or a nebula is turned to and ringed.
    if (sky && sky.active && typeof sky.pointAtRecord === 'function') sky.pointAtRecord(record);
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

// The icons are ui/icons.js's (2026-10-07, internal #415 item 5): the keys hint and the trip frame
// draw them too, and importing them from here fetched the whole card for one function. Exported
// again from here, for the card's own callers and the test that holds the drawing rules.
export { icon };

/** One of the row's four: a 20 px icon over a 13 px label, the whole 56 px button the target. */
function actionButton(action, label, title, iconName, onClick, primary) {
  const b = el('button', primary ? 'sr-act sr-act--primary' : 'sr-act');
  b.type = 'button';
  b.title = title;
  b.dataset.action = action;
  b.appendChild(icon(iconName));
  // A one-word label for a narrow phone where the action has one (copy: `<action>Short`); CSS
  // shows one of the two, and the button's name is the full one either way.
  const short = COPY.card.actions[`${action}Short`];
  if (short && short !== label) {
    b.setAttribute('aria-label', label);
    b.appendChild(el('span', 'sr-act__label sr-act__label--long', label));
    const s = el('span', 'sr-act__label sr-act__label--short', short);
    s.setAttribute('aria-hidden', 'true');
    b.appendChild(s);
  } else {
    b.appendChild(el('span', 'sr-act__label', label));
  }
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
    // Nowhere to fly: say why on the switched-off control (docs/ui-guide.md §3, the standard
    // states). An ended craft names its last day; its mission's events below are the way there.
    const ended = endedWords(record, m);
    if (ended) { fly.title = t(A.flyEnded, { date: ended }); fly.setAttribute('aria-label', fly.title); }
    else if (fly.disabled) fly.title = A.flyNowhere;
    buttons.push(fly);
    const see = actionButton('see', A.seeShort, A.seeFromHereTitle, 'telescope', () => seeFromHere(record, ctx));
    see.disabled = !canSeeFromHere(record, m);
    // A switched-off control says why (docs/ui-guide.md §3, the standard states).
    if (see.disabled) see.title = COPY.sky.notVisibleFromGround;
    buttons.push(see);
  }
  // Postcard saves the print picture of this view with this record's tag, in one press; Share opens
  // the one share sheet (ui/sharesheet.js) for this record, where the same picture, the link and
  // the card's words go anywhere (spec 0061 task 8).
  buttons.push(actionButton('postcard', A.postcard, COPY.print.title, 'camera', () => savePostcard(ctx, record)));
  const share = actionButton('share', A.share, COPY.share.linkTitle, 'share', () => openShare(ctx, { record, opener: share }));
  share.setAttribute('aria-haspopup', 'dialog');
  buttons.push(share);
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
// The flood light (internal #272): one quiet switch on the card of anything drawn as a model
// ---------------------------------------------------------------------------------------
//
// A craft on a world's night side is drawn dark because it is dark. This lights the MODEL evenly so
// that it can be looked at, and says so for as long as it is on: the note is the honesty line of
// the switch. Remembered for the session only (sessionStorage), so a new visit starts in the real
// light. scene/models.js is fetched by the click, or by a card that opens with the lamp already
// on; the card never imports it (tests/test_boot_diet.mjs).
const FLOOD_KEY = 'sr.flood';
const FLOOD_KLASSES = new Set(['station', 'satellite', 'probe', 'telescope', 'rocket', 'debris']);
let floodWanted = null;

/** Is the lamp wanted this session? Exported for the test. */
export function floodWantedNow() {
  if (floodWanted === null) {
    try { floodWanted = globalThis.sessionStorage ? globalThis.sessionStorage.getItem(FLOOD_KEY) === '1' : false; } catch { floodWanted = false; }
  }
  return floodWanted;
}

/** Does this record's card offer the lamp? Anything drawn as a model up close. Exported for the test. */
export function offersFlood(record) {
  if (!record) return false;
  if (FLOOD_KLASSES.has(record.klass)) return true;
  let entry = null;
  try { entry = realModelFor(record); } catch { entry = null; }
  return !!(entry && (entry.file || entry.build));
}

function applyFlood(on, ctx) {
  const set = ctx && typeof ctx.setFloodLight === 'function'
    ? Promise.resolve(ctx.setFloodLight(on))
    : import('../scene/models.js').then((mod) => mod.setFloodLight(on));
  return set.then(() => { if (ctx && typeof ctx.requestRender === 'function') ctx.requestRender(); }).catch(() => { /* no lamp: the real light stays */ });
}

/** The switch and its note, or nothing. Exported for the test. */
export function floodControls(record, ctx) {
  if (!offersFlood(record)) return [];
  const F = COPY.flood;
  const on = floodWantedNow();
  const toggle = el('button', 'sr-btn sr-btn--quiet sr-card__inline', on ? F.off : F.on);
  toggle.type = 'button';
  toggle.title = F.title;
  toggle.setAttribute('data-action', 'flood');
  toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  const note = el('p', 'sr-card__note', F.note);
  note.hidden = !on;
  toggle.addEventListener('click', () => {
    const next = toggle.getAttribute('aria-pressed') !== 'true';
    floodWanted = next;
    try { if (globalThis.sessionStorage) globalThis.sessionStorage.setItem(FLOOD_KEY, next ? '1' : '0'); } catch { /* private window: this page only */ }
    toggle.setAttribute('aria-pressed', next ? 'true' : 'false');
    toggle.textContent = next ? F.off : F.on;
    note.hidden = !next;
    applyFlood(next, ctx);
  });
  // A card that opens with the lamp already on (a second object in the same session) lights it.
  if (on) applyFlood(true, ctx);
  return [toggle, note];
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
  } else if (klass === 'storm' || klass === 'earthevent' || klass === 'site' || standsStill(record, m)) {
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
    // Internal #382: Ceres's card was headed 'Outer solar system', which is what 2.8 au is by the
    // planets' bounds and not what anybody calls the belt. A body whose whole orbit lies between
    // Mars's and Jupiter's (farRegion, from its own elements) is in the asteroid belt and says so.
    regime = farRegion(record) === 'belt' && G.belt ? G.belt : sunRegion(m.distSunKm);
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
  if (moving && isEarthFrame(m.frame) && klass !== 'storm' && klass !== 'earthevent' && klass !== 'site') return 'orbiter';
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
  if (!isEarthFrame(m.frame) || standsStill(record, m) || klassOf(record) === 'world' || klassOf(record) === 'storm' || klassOf(record) === 'earthevent') return null;
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
 * <html> is how ui/shell.js and ui/tripframe.js already say the same kind of thing.
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
  if (record && !placesReady() && isEarthFrame(m.frame) && m.latDeg !== null && !standsStill(record, m)) ensurePlaces();

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
    distanceCurve(record, ctx, m),
  ]));

  // Who is aboard: what rides on this, or what this rides on (data/attached.js).
  // On a station Launch Library follows, the people and the docked vehicles come first (#133).
  const aboard = aboardSection(record, ctx);
  const crew = crewBlock(record, rowsList, () => {
    if (current && current.record === record) { try { render(current.record, current.ctx, current.opts); } catch { /* keep the card */ } }
  });
  if (aboard || crew) {
    add('aboard', aboard && aboard.riding ? S.ridingOn : S.aboard, crew ? crew.hint : null, panelOf([crew ? crew.node : null, aboard ? aboard.node : null]));
  }

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
  // A deep-sky object with a photograph on the sky (spec 0067): how the picture's colours were
  // made and whose it is, and the shutter, here where the question "is that real?" is asked. The
  // registry's rows are a dynamic import -- a first visit that never opens such a card never
  // fetches them -- so the block is an empty box until they land; it sits inside a row that opens
  // in place, and nothing under it is a control a finger was reaching for.
  if (klass === 'dso' && ctx && ctx.exposure) {
    const box = el('div', 'sr-card__exposure');
    box.dataset.record = rid;
    aboutNodes.push(box);
    import('../data/nebulae.js').then((m) => {
      const row = (m.NEBULAE || []).find((r) => `dso-${r.id}` === rid);
      if (!row || box.childNodes.length) return;
      box.appendChild(pictureNote(row));
      box.appendChild(exposurePanel(ctx.exposure));
    }).catch(() => { /* no registry, no block: the card is whole without it */ });
  }
  // A world says how it is drawn (spec 0028 step 0). The compression note is scene/worlds.js's own
  // sentence (`viewScale`), never restated here; the Earth's clouds say what they are (COPY.clouds).
  if (klass === 'world') {
    const vs = ctx && ctx.worlds && typeof ctx.worlds.viewScale === 'function' ? ctx.worlds.viewScale(record.id) : null;
    if (vs && vs.exaggerated && vs.note) aboutNodes.push(el('p', 'sr-card__note', vs.note));
    // A world with a second face (Venus: its clouds, or the ground under them by radar). The row
    // is the exposure control's, class for class (ui/exposure.js), so it brings no new look; the
    // line under it says what the chosen picture is and that the ground's colour is added.
    const faces = ctx && ctx.worlds && typeof ctx.worlds.facesOf === 'function' ? ctx.worlds.facesOf(record.id) : [];
    const F = COPY.worldFace && COPY.worldFace[record.id];
    if (faces.length && F) {
      const box = el('div', 'sr-card__exposure');
      const wrap = el('section', 'sr-panel sr-density sr-exposure');
      wrap.appendChild(el('h2', 'sr-panel__title', F.title));
      const row = el('div', 'sr-density__choices');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', F.title);
      const note = el('p', 'sr-density__note');
      const buttons = [];
      const paint = () => {
        const now = ctx.worlds.faceOf(record.id) || 'own';
        for (const b of buttons) {
          b.setAttribute('aria-pressed', b.dataset.face === now ? 'true' : 'false');
          b.classList.toggle('sr-bracketed', b.dataset.face === now);
        }
        note.textContent = F.notes[now] || '';
      };
      for (const face of ['own', ...faces]) {
        const b = el('button', 'sr-density__btn', F.modes[face] || face);
        b.type = 'button';
        b.dataset.face = face;
        b.title = F.notes[face] || '';
        b.addEventListener('click', () => { ctx.worlds.setFace(record.id, face === 'own' ? null : face); paint(); });
        buttons.push(b);
        row.appendChild(b);
      }
      wrap.appendChild(row);
      wrap.appendChild(note);
      paint();
      box.appendChild(wrap);
      aboutNodes.push(box);
    }
    if (record.id === 'earth' && ctx && ctx.liveClouds && typeof ctx.liveClouds.line === 'function') {
      aboutNodes.push(el('p', 'sr-card__note sr-card__clouds', ctx.liveClouds.line(m.tMs)));
    }
    // And its aurora, in the same style: NOAA's forecast of the next hour, how old, not a photograph
    // (scene/aurora.js, 2026-09-30). The words are copy/en.js COPY.aurora.
    if (record.id === 'earth' && ctx && ctx.aurora && typeof ctx.aurora.line === 'function') {
      aboutNodes.push(el('p', 'sr-card__note sr-card__aurora', ctx.aurora.line(m.tMs)));
    }
    // And its weather (spec 0066, scene/weather/): one line saying what is drawn on this world and
    // whether it is measured, modelled or illustrative (copy/en.js COPY.weather). The line is there
    // even while it is empty, hidden, so the module arriving a few seconds after the card can fill it.
    if (ctx && ctx.weather && typeof ctx.weather.line === 'function') {
      let wx = null;
      try { wx = ctx.weather.line(record.id, m.tMs); } catch { wx = null; }
      const line = el('p', 'sr-card__note sr-card__weather', wx || '');
      line.hidden = !wx;
      aboutNodes.push(line);
    }
    // The Sun's spots, when NOAA's list for today is drawn (main.js ctx.sunRegions, scene/sun.js).
    if (record.id === 'sun' && ctx && ctx.sunDetail && typeof ctx.sunDetail.state === 'function') {
      const words = sunSpotsLine(ctx);
      const line = el('p', 'sr-card__note sr-card__sunspots', words || '');
      line.hidden = !words;
      aboutNodes.push(line);
    }
    // And the mosaic under the camera (spec 0065 requirement 4, internal #337): while a close world
    // is drawn from map tiles, which mission's mosaic that is, how fine, and what its relief is.
    // Hidden while empty, like the weather's line: the tiles come and go with the camera (`sr:tier`).
    if (ctx && ctx.quality && typeof ctx.quality.mosaics === 'function') {
      const words = mosaicLine(record, ctx);
      const line = el('p', 'sr-card__note sr-card__mosaic', words || '');
      line.hidden = !words;
      aboutNodes.push(line);
    }
  }
  const aboutRows = rows.filter(([label]) => label !== COPY.card.rows.nextPass);
  if (aboutRows.length) {
    const now = section('sr-card__block sr-card__now', COPY.card.rightNowLabel);
    now.appendChild(rowsList(aboutRows));
    aboutNodes.push(now);
  }
  // The distance that ticks (internal #295): kilometres and light time, once a second.
  if (klass !== 'site' && !standsStill(record, m)) {
    const live = liveBlock(earthDistanceAt(record, ctx), m.tMs, reducedMotion());
    if (live) { aboutNodes.push(live); startLive(); }
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
  // ITS OWN PAGE (internal #199): the static page the deploy built for this object (`/o/<slug>.html`,
  // scripts/build_seo.py), which says the same words and links back with "See it live". Asked for
  // when About it is first open, never before: ui/objectpage.js and its index are not a card's cost.
  const page = el('a', 'sr-card__page', COPY.card.ownPage);
  page.hidden = true;
  page.target = '_blank';
  page.rel = 'noopener';
  page.title = COPY.card.ownPageTitle;
  aboutNodes.push(page);
  // Links out to live pictures (spec 0050 requirement 8): the publisher's own page, never an embed.
  aboutNodes.push(...linkNodes(record));
  add('about', S.about, null, panelOf(aboutNodes));
  const aboutHead = more.querySelector('[data-section="about"] .sr-disc__head');
  const findPage = () => import('./objectpage.js').then((m) => m.pageFor(record)).then((url) => {
    if (url) { page.href = url; page.hidden = false; }
  }).catch(() => { /* no page: no link */ });
  if (aboutHead && aboutHead.getAttribute('aria-expanded') === 'true') findPage();
  else if (aboutHead) aboutHead.addEventListener('click', findPage, { once: true });

  // Sources for this record: what the drawn shape is, and where the numbers were read.
  const drawn = drawingLine(record);
  add('sources', S.sources, null, panelOf([
    drawn ? el('p', 'sr-card__drawn', drawn) : null,
    el('p', 'sr-card__source', sourceLine(record, ctx)),
  ]));

  return more;
}

/**
 * The six-year curve of distance from the Earth, for what goes round the Sun and is not a world:
 * asteroids, comets and craft beyond the Earth (internal #296). The closest approach it names
 * carries #298's caveat when the path there is the ellipse that leaves the Earth's pull out.
 */
function distanceCurve(record, ctx, m) {
  const klass = klassOf(record);
  if (klass === 'world' || klass === 'site' || m.frame !== 'sun-inertial' || !Number.isFinite(m.tMs) || endedWords(record, m)) return null;
  try {
    return sparkBlock(record, earthDistanceAt(record, ctx), m.tMs, ctx,
      (min) => nearEarthOnEllipse(record, { tMs: min.tMs, distEarthKm: min.km }));
  } catch {
    return null;
  }
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
  if (!placesReady() && isEarthFrame(m.frame) && m.latDeg !== null && !standsStill(record, m)) ensurePlaces();

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
  // An ended craft after its end has no numbers to lead with: three dashes said nothing (seen
  // 2026-10-07 on Cassini's card). One line says when it ended instead (internal #424).
  const ended = endedWords(record, m);
  const heroes = ended ? [] : heroNumbers(record, m, rows);
  if (heroes.length) body.appendChild(heroBlock(heroes));
  if (ended) body.appendChild(el('p', 'sr-card__sentence sr-card__ended', t(COPY.card.endedLine, { date: ended })));

  // 2b. a launch within a day counts down (public #289, ui/countdown.js): in the clock's own time,
  // as the scene is, with Launch Library's status and how old it is.
  if (record.layer === 'launches' && record.meta && Number.isFinite(record.meta.netMs)) {
    const count = el('div', 'sr-card__count');
    count.hidden = true;
    body.appendChild(count);
    import('./countdown.js').then((mod) => {
      if (!count.isConnected) return;
      mod.mountCountdown(count, record, { now: () => (ctx && ctx.clock ? ctx.clock.now() : Date.now()), ageMs: () => mod.launchAgeMs(ctx) });
    }).catch((e) => console.warn('the countdown did not load', e));
  }

  // 2c. a Starlink launch: when a fresh Starlink train is next visible from the visitor's place
  // (public #289, ui/launchchip.js trainPassLine): the Coming up list's own prediction, so the two
  // agree. Left out with no place or no visible pass; it does not claim the train is this launch's.
  if (record.layer === 'launches' && /starlink/i.test(String(record.name || ''))) {
    const train = el('p', 'sr-card__sentence sr-card__train');
    train.hidden = true;
    body.appendChild(train);
    import('./launchchip.js').then((mod) => {
      if (!train.isConnected || !mod.isStarlinkLaunch(record)) return;
      const next = ctx && ctx.explore && ctx.explore.next;
      const items = next && typeof next.items === 'function' ? next.items() : [];
      const line = mod.trainPassLine(items, ctx && ctx.clock ? ctx.clock.now() : Date.now());
      if (line) { train.textContent = line; train.hidden = false; }
    }).catch((e) => console.warn('the train line did not load', e));
  }

  // 3. the four actions, one of them ember.
  const actions = el('div', 'sr-card__actions');
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', COPY.card.actionsLabel);
  for (const b of actionButtons(record, ctx, m)) {
    b.dataset.focus = `act-${b.dataset.action}`;
    actions.appendChild(b);
  }
  body.appendChild(actions);

  // 3b. a mission's dated events, for the handful of records that have them (ui/missions.js,
  // registry/missions.yaml; public #452). The module is fetched the first time a card opens
  // (main.js ctx.wantMissions) and fills this box, at once on every later paint so the focus a
  // repaint puts back (keepPlace) finds its buttons.
  const missionBox = el('div', 'sr-card__mission');
  missionBox.hidden = true;
  body.appendChild(missionBox);
  if (ctx && ctx.missions) ctx.missions.mountMission(missionBox, record, ctx);
  else if (ctx && typeof ctx.wantMissions === 'function') {
    ctx.wantMissions().then((mod) => { if (mod && missionBox.isConnected) mod.mountMission(missionBox, record, ctx); });
  }

  // 4. the next 90 minutes in time: light and shadow, the lap (spec 0048)
  const time = timeFactsSection(record, ctx, m);
  if (time) { body.appendChild(time.bar); startTimeFacts(); }

  // 4b. the flood light, under the light it stands in for (internal #272).
  for (const n of floodControls(record, ctx)) body.appendChild(n);
  // The Earth's card carries the legend of whatever map is laid over it (internal #386 item 1).
  const over = overlayBlock(record, ctx);
  if (over) body.appendChild(over);

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

/** The Sun's card: how many of today's sunspot groups are drawn and whose list it is, or null. */
/**
 * The Earth data overlay on the globe, on the Earth's own card: its legend and its one sentence
 * (ui/overlaylegend.js, the words the trip's stop card and What to show print). Without it an
 * overlay chosen in What to show was colours with no key once that popover shut (internal #386).
 * Above the sections, not inside one: a key nobody has to open. Null for any other record; an
 * empty, hidden block when no overlay is up, so `sr:overlay` has something to fill.
 * Exported for the test.
 */
export function overlayBlock(record, ctx) {
  if (!record || record.id !== 'earth' || !ctx || typeof ctx.overlayState !== 'function' || typeof document === 'undefined') return null;
  const box = el('div', 'sr-card__overlay');
  box.appendChild(legendNode(null));
  box.appendChild(el('p', 'sr-card__note sr-card__overlayline'));
  paintOverlayBlock(box, ctx);
  return box;
}

function paintOverlayBlock(box, ctx) {
  let st = null;
  try { st = ctx.overlayState(); } catch { st = null; }
  const on = !!(st && st.id);
  const [legend, line] = box.children;
  paintLegend(legend, on ? st : null);
  const words = on ? overlayLine(st) : '';
  if (line.textContent !== words) line.textContent = words;
  line.hidden = !words;
  box.hidden = !on;
}

export function sunSpotsLine(ctx) {
  let st = null;
  try { st = ctx.sunDetail.state(); } catch { st = null; }
  if (!st || !(st.spots > 0) || !Number.isFinite(st.observedMs) || !COPY.sun) return null;
  const day = new Date(st.observedMs).toISOString().slice(0, 10);
  return t(st.spots === 1 ? COPY.sun.spotsOne : COPY.sun.spots, { n: fmt.int(st.spots), date: day });
}

/**
 * The line that says which mosaic a close world is drawn from right now (scene/tiles.js mosaics()),
 * or null when it is drawn from its own map. Exported for tests/test_cards_copy.mjs.
 */
export function mosaicLine(record, ctx) {
  let list = [];
  try { list = ctx.quality.mosaics() || []; } catch { list = []; }
  const m = record && list.find((x) => x && x.world === record.id);
  const T = COPY.drawing;
  if (!m || !T.worldMosaic) return null;
  const parts = [t(m.mode === 'detail' ? T.worldMosaicDetail : T.worldMosaic, {
    title: String(m.title),
    res: m.metresPerPixel > 0 ? fmt.metres(m.metresPerPixel >= 100 ? Math.round(m.metresPerPixel / 10) * 10 : m.metresPerPixel) : '',
  })];
  if (m.relief && T.worldRelief) {
    const n = Number(m.relief.gain) || 1;
    parts.push(n === 1 && T.worldReliefTrue ? t(T.worldReliefTrue, { title: String(m.relief.title) })
      : t(T.worldRelief, { title: String(m.relief.title), n: Number.isInteger(n) ? fmt.int(n) : fmt.num(n, 1) }));
  } else if (m.bakedRelief && T.worldReliefBaked) parts.push(T.worldReliefBaked);
  return parts.join(' ');
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
    // The overlay's legend on the Earth's card: a map was chosen, arrived, failed or was taken away.
    window.addEventListener('sr:overlay', () => {
      const c = current && current.ctx;
      const box = typeof document !== 'undefined' && document.querySelector('.sr-card__overlay');
      if (!box || !c || typeof c.overlayState !== 'function') return;
      try { paintOverlayBlock(box, c); } catch { /* keep the last legend */ }
    });
    // The aurora line, the same way: a forecast arrived, failed, or the clock moved away from it.
    window.addEventListener('sr:aurora', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__aurora');
      if (!line || !c || !c.aurora || current.record.id !== 'earth') return;
      try { line.textContent = c.aurora.line(c.clock.now()); } catch { /* keep the last line */ }
    });
    // The Sun's spots line: NOAA's list arrived (main.js `say`).
    window.addEventListener('sr:tier', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__sunspots');
      if (!line || !c || !c.sunDetail) return;
      try { const words = sunSpotsLine(c); line.textContent = words || ''; line.hidden = !words; } catch { /* keep the last line */ }
    });
    // The mosaic line: map tiles came on screen, changed or left (main.js `say`, from scene/tiles.js).
    window.addEventListener('sr:tier', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__mosaic');
      if (!line || !c || !c.quality || !current.record) return;
      try {
        const words = mosaicLine(current.record, c);
        line.textContent = words || '';
        line.hidden = !words;
      } catch { /* keep the last line */ }
    });
    // The weather line, the same way, on whichever world's card is open: the module arrived, NOAA's
    // lightning map did, or the clock moved away from it.
    window.addEventListener('sr:weather', () => {
      const c = current && current.ctx;
      const line = typeof document !== 'undefined' && document.querySelector('.sr-card__weather');
      if (!line || !c || !c.weather || !current.record) return;
      try {
        const wx = c.weather.line(current.record.id, c.clock.now());
        line.textContent = wx || '';
        line.hidden = !wx;
      } catch { /* keep the last line */ }
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
  stopLive();
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
