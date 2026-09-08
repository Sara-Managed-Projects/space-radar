// data/parsers.js — upstream payloads in, Records out.
//
// CONTRACT (tests/test_contract.mjs):
//   export function parseCelestrakGP(json, opts): Record[]
//   export function parseLaunches(json): {launches: Record[], pads: Record[], events: EventRow[]}
//   export function parseComets(text): Record[]
//   export function parseDsn(xmlText): DsnLink[]
//   export function parseSpaceWeather(json): {kp, forecast}
//
// Units: kilometres, seconds, radians. Degrees survive only inside `meta`, where the card reads
// them, and every such field is named `...Deg` so nobody feeds one to a trig function.
//
// Every parser fails soft. A shape it does not recognise yields an empty result, never a throw:
// half of these feeds are unofficial and can change without notice, and an exception here would
// take the whole page down with it.

import * as satellite from '../../vendor/satellite.esm.js';
import { rocketRowFor } from './rocketmatch.js';

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const MU_EARTH = 398600.4418; // km^3/s^2
const MU_SUN = 1.32712440018e11; // km^3/s^2
const R_EARTH = 6378.137; // km, equatorial
const DAY_MS = 86400000;

/**
 * Station modules. MEASURED against the live `stations` group on 2026-09-06, which returns them
 * as separate objects: ISS (ZARYA) 25544, ISS (NAUKA) 49044, POISK 36086, CSS (TIANHE) 48274,
 * CSS (WENTIAN) 53239, CSS (MENGTIAN) 54216. The naming convention `ISS (…)` / `CSS (…)` is what
 * CelesTrak uses for every module of the two stations, so the prefix rule catches new ones too.
 */
const STATION_IDS = new Set([25544, 49044, 36086, 48274, 53239, 54216]);
const RX_STATION_NAME = /^(ISS|CSS)\s*\(/;

// =================================================================================================
// CelesTrak GP (OMM JSON)
// =================================================================================================

/**
 * @param {Array|string} json  the OMM JSON array, or the raw text of one
 * @param {Object} [opts]
 * @param {string} [opts.layer='active']
 * @param {string} [opts.source='celestrak-active']
 * @param {string} [opts.klass]        force a visual class instead of deriving it from the name
 * @param {number} [opts.freshDays=7]  epoch younger than this is `measured`, older is `inferred`
 * @param {number} [opts.limit]        stop after this many usable records
 * @returns {Array<Object>} Records with propagator 'sgp4', frame 'earth-inertial'
 */
export function parseCelestrakGP(json, opts = {}) {
  const rows = asArray(json);
  if (!rows) return [];

  const layer = opts.layer || 'active';
  const source = opts.source || 'celestrak-active';
  const freshMs = (opts.freshDays == null ? 7 : opts.freshDays) * DAY_MS;
  const limit = opts.limit == null ? Infinity : opts.limit;

  const out = [];
  const seen = new Set();

  for (const row of rows) {
    if (out.length >= limit) break;
    if (!row || typeof row !== 'object') continue;

    const epoch = parseUtc(row.EPOCH);
    if (epoch == null) continue;

    let satrec = null;
    try {
      satrec = satellite.json2satrec(row);
    } catch {
      satrec = null;
    }
    // satellite.js reports an unusable element set on the satrec itself rather than throwing.
    if (!satrec || satrec.error) continue;

    const norad = Number(row.NORAD_CAT_ID);
    const intl = typeof row.OBJECT_ID === 'string' ? row.OBJECT_ID.trim() : '';
    const name = (row.OBJECT_NAME || intl || String(norad)).trim();

    // The supplemental files carry placeholder catalogue numbers (100001 and up) for objects
    // the public catalogue has not numbered yet. Their international designator is real, so
    // that is what identifies them.
    const numbered = Number.isFinite(norad) && norad > 0 && norad < 90000;
    const id = numbered ? `sat-${norad}` : intl ? `int-${intl}` : `${source}-${out.length}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const meanMotion = Number(row.MEAN_MOTION); // revolutions per day
    const ecc = Number(row.ECCENTRICITY);
    const inclDeg = Number(row.INCLINATION);
    const shape = orbitShape(meanMotion, ecc);
    const ageMs = epoch == null ? null : null; // filled by the caller against the app clock

    out.push({
      id,
      name,
      layer,
      klass: opts.klass || classify(name, norad),
      propagator: 'sgp4',
      frame: 'earth-inertial',
      // The class the DATA deserves. The renderer downgrades further as the app clock runs on:
      // spec 0008's ladder is fresh < 7 d, old < 30 d, stale beyond.
      cls: Number.isFinite(epoch) && epoch > 0 ? classForEpoch(epoch, freshMs) : 'inferred',
      epoch,
      source,
      satrec,
      meta: {
        noradId: numbered ? norad : null,
        catalogueNumber: Number.isFinite(norad) ? norad : null,
        intlDesignator: intl || null,
        objectName: name,
        launchYear: launchYearOf(intl),
        launchPiece: launchPieceOf(intl),
        launchNumber: launchNumberOf(intl),
        // The launch a train belongs to: 2026-160A and 2026-160B flew together.
        launchDesignator: intl ? intl.replace(/[A-Z]+$/i, '') : null,
        meanMotion: Number.isFinite(meanMotion) ? meanMotion : null,
        eccentricity: Number.isFinite(ecc) ? ecc : null,
        inclinationDeg: Number.isFinite(inclDeg) ? inclDeg : null,
        raanDeg: numOrNull(row.RA_OF_ASC_NODE),
        argpDeg: numOrNull(row.ARG_OF_PERICENTER),
        meanAnomalyDeg: numOrNull(row.MEAN_ANOMALY),
        bstar: numOrNull(row.BSTAR),
        classification: row.CLASSIFICATION_TYPE || null,
        elementSetNo: numOrNull(row.ELEMENT_SET_NO),
        revAtEpoch: numOrNull(row.REV_AT_EPOCH),
        periodMin: shape.periodMin,
        semiMajorKm: shape.aKm,
        apogeeKm: shape.apogeeKm,
        perigeeKm: shape.perigeeKm,
        // Supplemental files only.
        dataSource: row.DATA_SOURCE || null,
        rms: row.RMS == null ? null : Number(row.RMS),
        ageAtParseMs: ageMs,
      },
    });
  }
  return out;
}

function classForEpoch(epochMs, freshMs) {
  // Wall clock is the honest comparison for "how old is this element set" — the app clock can
  // be scrubbed, and a scrubbed clock must not change what class the DATA is.
  const age = Date.now() - epochMs;
  return age >= 0 && age < freshMs ? 'measured' : 'inferred';
}

function classify(name, norad) {
  if (STATION_IDS.has(norad)) return 'station';
  const n = String(name || '').toUpperCase();
  if (RX_STATION_NAME.test(n)) return 'station';
  if (/\bDEB\b|DEBRIS|\bFRAG\b|\bSHRAPNEL\b/.test(n)) return 'debris';
  if (/R\/B|ROCKET BODY|\bAKM\b|\bPKM\b|\bUPPER STAGE\b/.test(n)) return 'rocket';
  return 'satellite';
}

/** OBJECT_ID is `YYYY-NNNP` — 1998-067A, 2026-160A. */
function launchYearOf(intl) {
  if (typeof intl !== 'string') return null;
  const m = /^(\d{4})-/.exec(intl.trim());
  return m ? Number(m[1]) : null;
}
function launchNumberOf(intl) {
  if (typeof intl !== 'string') return null;
  const m = /^\d{4}-(\d{3})/.exec(intl.trim());
  return m ? Number(m[1]) : null;
}
function launchPieceOf(intl) {
  if (typeof intl !== 'string') return null;
  const m = /^\d{4}-\d{3}([A-Z]+)$/i.exec(intl.trim());
  return m ? m[1].toUpperCase() : null;
}

function orbitShape(meanMotionRevPerDay, ecc) {
  if (!Number.isFinite(meanMotionRevPerDay) || meanMotionRevPerDay <= 0) {
    return { aKm: null, apogeeKm: null, perigeeKm: null, periodMin: null };
  }
  const n = (meanMotionRevPerDay * 2 * Math.PI) / 86400; // rad/s
  const aKm = Math.cbrt(MU_EARTH / (n * n));
  const e = Number.isFinite(ecc) ? ecc : 0;
  return {
    aKm,
    apogeeKm: aKm * (1 + e) - R_EARTH,
    perigeeKm: aKm * (1 - e) - R_EARTH,
    periodMin: 1440 / meanMotionRevPerDay,
  };
}

// =================================================================================================
// Launch Library 2
// =================================================================================================

/**
 * Typical altitude and inclination per LL2 orbit class. The real trajectory is NOT published —
 * LL2's `orbit` field is a class, not elements — which is exactly why every launch Record is
 * cls 'illustrative'. Drawing it as if it were measured would be this product's central sin.
 * `inclDeg: null` means "use the pad's latitude", which is the lowest inclination a launch from
 * that pad can reach without a dogleg.
 */
const ASCENT_ORBITS = {
  LEO: { altKm: 400, inclDeg: null },
  ISS: { altKm: 420, inclDeg: 51.6 },
  SSO: { altKm: 600, inclDeg: 97.8 },
  PO: { altKm: 700, inclDeg: 98.0 },
  MEO: { altKm: 20200, inclDeg: 55 },
  GTO: { altKm: 35786, inclDeg: null },
  GEO: { altKm: 35786, inclDeg: 0 },
  HEO: { altKm: 35786, inclDeg: 63.4 },
  TLI: { altKm: 384400, inclDeg: null },
  LO: { altKm: 384400, inclDeg: null },
  HCO: { altKm: 1.0e6, inclDeg: null },
  // Measured on the live feed 2026-09-06: the 30 upcoming launches used SSO, LEO, MEO, PO, SUB,
  // LO, MARS and the literal string "N/A". The last one is not a class and falls to the default.
  MARS: { altKm: 1.0e6, inclDeg: null },
  SUB: { altKm: 100, inclDeg: null },
  SO: { altKm: 100, inclDeg: null },
};
const ASCENT_DEFAULT = { altKm: 400, inclDeg: null };
/** Seconds from lift-off to insertion. A round, honest average; the arc is illustrative anyway. */
const ASCENT_SECONDS = 540;

/**
 * The rocket's family names, ROOT FIRST. LL2 2.3.0 nests them as `configuration.families`, a
 * list whose first entry has `parent: null` and whose last is the most specific -- measured on
 * the live feed: 23 of 23 detailed configurations that carry a family put the root first, depth
 * never exceeds 2, and the list is EMPTY on 19.8% of launches (Rocket Lab, Isar and every other
 * single-vehicle operator, because LL2 only creates a family when a manufacturer has more than
 * one launcher). Returns [] rather than null so callers can just iterate.
 */
function rocketFamilies(r) {
  const list = r && r.rocket && r.rocket.configuration && r.rocket.configuration.families;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const f of list) {
    const name = f && typeof f.name === 'string' ? f.name.trim() : '';
    if (name) out.push(name);
  }
  return out;
}

/**
 * @param {Object|string} json  the LL2 /launches/upcoming/ payload
 * @returns {{launches: Array<Object>, pads: Array<Object>, events: Array<Object>}}
 */
export function parseLaunches(json) {
  const body = asObject(json);
  const rows = body && Array.isArray(body.results) ? body.results : Array.isArray(body) ? body : null;
  if (!rows) return { launches: [], pads: [], events: [] };

  const launches = [];
  const pads = [];
  const events = [];
  const padSeen = new Set();

  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;

    const netMs = parseUtc(r.net);
    const pad = r.pad || {};
    const lat = numOrNull(pad.latitude);
    const lon = numOrNull(pad.longitude);
    const hasPad = lat != null && lon != null;

    const orbit = (r.mission && r.mission.orbit) || null;
    const orbitAbbrev = orbit && orbit.abbrev ? String(orbit.abbrev).toUpperCase() : null;
    const profile = ASCENT_ORBITS[orbitAbbrev] || ASCENT_DEFAULT;
    const inclDeg =
      profile.inclDeg != null
        ? profile.inclDeg
        : hasPad
          ? Math.abs(lat)
          : null;

    const rocketName =
      (r.rocket && r.rocket.configuration &&
        (r.rocket.configuration.full_name || r.rocket.configuration.name)) || null;
    // LL2 2.3.0 has NO `configuration.family`. It has `families`, a list of 0-2 objects, root
    // first: [{name: "Falcon"}, {name: "Falcon 9"}]. Reading the 2.2.0 spelling made
    // meta.rocketFamily null on 100% of launches -- measured against the live endpoint, and the
    // reason every registry lookup below would have matched nothing. The most specific name is
    // the useful one (it is what separates Falcon 9 from Falcon Heavy); the whole path is kept
    // so the match can walk out to the root.
    const familyPath = rocketFamilies(r);
    const provider = (r.launch_service_provider && r.launch_service_provider.name) || null;
    // Which drawn shape this launch gets, and how sure we are of it. The chain lives in
    // data/rocketmatch.js over rows generated from registry/rockets.yaml; adding a rocket is a
    // row there and nothing here.
    const drawn = rocketRowFor({ rocket: rocketName, rocketFamilyPath: familyPath, provider });
    const webcast = pickWebcast(r.vid_urls);
    const padName = padDisplayName(pad);
    const padId = pad.id != null ? `pad-ll2-${pad.id}` : hasPad ? `pad-${lat.toFixed(4)}-${lon.toFixed(4)}` : null;

    const launchId = `launch-${r.id || `${netMs || 'tba'}-${launches.length}`}`;

    if (hasPad) {
      launches.push({
        id: launchId,
        name: r.name || rocketName || 'A launch',
        layer: 'launches',
        klass: 'rocket',
        propagator: 'ascent',
        frame: 'earth-fixed',
        // ALWAYS. See ASCENT_ORBITS above.
        cls: 'illustrative',
        epoch: netMs,
        source: 'll2-upcoming',
        ascent: {
          t0Ms: netMs,
          windowStartMs: parseUtc(r.window_start),
          windowEndMs: parseUtc(r.window_end),
          durationS: ASCENT_SECONDS,
          pad: { latRad: lat * DEG, lonRad: lon * DEG, altKm: 0 },
          // the module contract's own spelling of the pad, alongside the radians above.
          padLatDeg: lat,
          padLonDeg: lon,
          targetAltKm: profile.altKm,
          targetInclRad: inclDeg == null ? null : inclDeg * DEG,
          orbitAbbrev,
          // the module contract names this field `orbitClass`; propagate/ascent.js resolves the LL2
          // abbrev through its own alias table.
          orbitClass: orbitAbbrev,
          // Which of the two azimuth solutions the pad flies. sin(az) = cos(i)/cos(lat) has a
          // northerly and a southerly root; a retrograde target (i > 90) is flown on the
          // southerly one everywhere it is flown at all — Vandenberg, Plesetsk, Taiyuan, Kourou.
          // Without this an SSO launch draws north-north-west (measured: 348 deg) instead of
          // south-south-west (192 deg). Range safety belongs in a pad registry; until there is
          // one, this is the rule, and a registry row can still override it.
          azimuthSign: inclDeg != null && inclDeg > 90 ? -1 : 1,
        },
        meta: {
          netMs,
          netIso: r.net || null,
          netPrecision: (r.net_precision && r.net_precision.abbrev) || null,
          windowStartMs: parseUtc(r.window_start),
          windowEndMs: parseUtc(r.window_end),
          statusAbbrev: (r.status && r.status.abbrev) || null,
          statusName: (r.status && r.status.name) || null,
          probability: numOrNull(r.probability),
          weatherConcerns: r.weather_concerns || null,
          provider,
          rocket: rocketName,
          rocketFamily: familyPath.length ? familyPath[familyPath.length - 1] : null,
          rocketFamilyPath: familyPath,
          // What scene/models.js will build, and what the card is allowed to say about it.
          // `drawsAs` is the honesty field: 'variant' means the drawing is this vehicle,
          // 'family' means it is the family's shape, 'generic' means we have no dimensions at
          // all and the card says so rather than letting the picture imply otherwise.
          //
          // It is capped by the MATCH LEVEL and not taken from the row alone. Nine
          // `stands_for: variant` rows also claim a family string, and a launch whose full_name
          // nobody has listed yet lands on one of them: "drawn from published dimensions for
          // Angara 1.2" for an Angara A5 is a claim about a different rocket. A family- or
          // provider-level match can never honestly say "this exact vehicle", whatever the row
          // it landed on says about itself. The feed produces new spellings under existing
          // families routinely -- "Ariane 62 Block 2", "Vega-C Block 2", "Firefly Alpha Block 2"
          // and "Starship V3" are all in the checked-in observed list.
          modelVariant: drawn.row ? drawn.row.id : null,
          drawsAs: drawn.row ? (drawn.via === 'full_name' ? drawn.row.stands_for : 'family') : 'generic',
          drawnName: drawn.row ? drawn.row.display : null,
          drawnVia: drawn.via,
          // The card's size chip, and the only place the app states a rocket's real height.
          //
          // Absent for a generic match, so a missing chip is truthful rather than a wrong number
          // -- and absent for a PROVIDER match for the same reason. The provider row is a class
          // stand-in whose own source reads "NOT this vehicle: no source was read for Prime,
          // Skyrora XL, SL1, Zephyr, RFA One or ZERO"; a row that says it has no dimensions for
          // a vehicle must not hand the card a height for it. A family match keeps its number,
          // because the family's height IS a sourced height -- and COPY.drawing.family says out
          // loud that the height is the family's and not this exact version's.
          sizeM: drawn.row && drawn.via !== 'provider' ? drawn.row.height_m : null,
          disputedHeight: (drawn.row && drawn.row.disputed_height) || null,
          missionName: (r.mission && r.mission.name) || null,
          missionType: (r.mission && r.mission.type) || null,
          missionDescription: (r.mission && r.mission.description) || null,
          orbitAbbrev,
          orbitName: (orbit && orbit.name) || null,
          padId,
          padName,
          padLatDeg: lat,
          padLonDeg: lon,
          padCountry: padCountry(pad),
          webcastUrl: webcast ? webcast.url : null,
          webcastPublisher: webcast ? webcast.publisher : null,
          webcastLive: r.webcast_live === true,
          slug: r.slug || null,
          // The ascent arc is drawn from ASCENT_ORBITS, not from a published trajectory.
          why: 'The real climb is not published. This arc is drawn from the typical altitude ' +
            'and inclination for a ' + (orbitAbbrev || 'low-orbit') + ' launch.',
        },
      });
    }

    if (padId && !padSeen.has(padId) && hasPad) {
      padSeen.add(padId);
      pads.push({
        id: padId,
        name: padName,
        layer: 'ground-sites',
        klass: 'site',
        propagator: 'fixed',
        frame: 'earth-fixed',
        cls: 'measured',
        epoch: null,
        source: 'll2-upcoming',
        fixed: { latRad: lat * DEG, lonRad: lon * DEG, altKm: 0 },
        meta: {
          siteKind: 'pad',
          padName: pad.name || null,
          locationName: (pad.location && pad.location.name) || null,
          latDeg: lat,
          lonDeg: lon,
          country: padCountry(pad),
          countryCode: padCountryCode(pad),
          mapUrl: pad.map_url || null,
          totalLaunchCount: numOrNull(pad.total_launch_count),
          ll2Id: pad.id == null ? null : pad.id,
        },
      });
    }

    if (netMs != null) {
      events.push({
        id: `event-${launchId}`,
        kind: 'launch',
        tMs: netMs,
        windowStartMs: parseUtc(r.window_start),
        windowEndMs: parseUtc(r.window_end),
        title: r.name || 'A launch',
        subtitle: [provider, rocketName].filter(Boolean).join(' · ') || null,
        place: padName,
        statusAbbrev: (r.status && r.status.abbrev) || null,
        precision: (r.net_precision && r.net_precision.abbrev) || null,
        url: webcast ? webcast.url : null,
        recordId: hasPad ? launchId : null,
        cls: 'illustrative',
        source: 'll2-upcoming',
      });
    }
  }

  events.sort((a, b) => a.tMs - b.tMs);
  return { launches, pads, events };
}

function padDisplayName(pad) {
  const loc = pad && pad.location && pad.location.name ? String(pad.location.name) : null;
  const name = pad && pad.name ? String(pad.name) : null;
  if (loc && name) return `${name}, ${loc}`;
  return name || loc || 'A launch pad';
}
function padCountry(pad) {
  if (!pad) return null;
  if (pad.country && pad.country.name) return pad.country.name;
  if (typeof pad.country === 'string') return pad.country;
  if (pad.location && pad.location.country && pad.location.country.name) {
    return pad.location.country.name;
  }
  return null;
}
function padCountryCode(pad) {
  if (!pad) return null;
  if (pad.country && pad.country.alpha_2_code) return pad.country.alpha_2_code;
  if (pad.location && pad.location.country_code) return pad.location.country_code;
  return null;
}
function pickWebcast(vidUrls) {
  if (!Array.isArray(vidUrls) || vidUrls.length === 0) return null;
  const withUrl = vidUrls.filter((v) => v && typeof v.url === 'string' && v.url);
  if (withUrl.length === 0) return null;
  withUrl.sort((a, b) => (numOrNull(a.priority) ?? 99) - (numOrNull(b.priority) ?? 99));
  return withUrl[0];
}

// =================================================================================================
// Minor Planet Center — CometEls.txt, fixed width
// =================================================================================================
//
// Column offsets MEASURED against the live file on 2026-09-06 (163 309 bytes, 961 comets), not
// taken from the published format note, which is one column adrift on the perihelion date.
// Zero-based slices:
//
//   [ 0: 4]  periodic comet number          "0001"           (blank for unnumbered)
//   [ 4: 5]  orbit type                     C | P | D | X | A | I
//   [ 5:12]  packed provisional designation "J95O010"
//   [13:30]  perihelion year, month, day    "2026 09 13.9652"  -- read as three whitespace tokens
//   [30:39]  perihelion distance q, au      " 1.277791"
//   [40:49]  eccentricity e                 " 0.934903"
//   [50:59]  argument of perihelion, deg    " 335.5543"
//   [60:69]  longitude of ascending node    " 172.3215"
//   [70:79]  inclination, deg               "  37.8750"
//   [80:88]  epoch of the elements          "20260906"
//   [91:95]  absolute magnitude H           " 13.5"
//   [96:100] slope parameter G              " 4.0"
//   [102:158] designation and name          "C/1942 EA (Vaisala)"
//   [159:]   reference                      "MPEC 2026-K60"
//
// Verified line: `1P/Halley` reads q = 0.571096 au, e = 0.968021, i = 162.1881 deg.

/**
 * @param {string} text  the raw CometEls.txt
 * @returns {Array<Object>} Records with propagator 'kepler', frame 'sun-inertial'
 */
export function parseComets(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const out = [];
  const seen = new Set();

  for (const raw of text.split(/\r?\n/)) {
    if (raw.length < 100) continue;

    const q = num(raw.slice(30, 39));
    const e = num(raw.slice(40, 49));
    if (q == null || e == null || q <= 0 || e < 0) continue;

    const argp = num(raw.slice(50, 59));
    const node = num(raw.slice(60, 69));
    const incl = num(raw.slice(70, 79));
    if (argp == null || node == null || incl == null) continue;

    const tpMs = perihelionMs(raw.slice(13, 30));
    if (tpMs == null) continue;

    const numberField = raw.slice(0, 4).trim();
    const orbitType = raw.slice(4, 5).trim() || null;
    const packed = raw.slice(5, 12).trim() || null;
    const epochMs = yyyymmddMs(raw.slice(80, 89).trim());
    const H = num(raw.slice(91, 95));
    const G = num(raw.slice(96, 100));
    const full = raw.slice(102, 158).trim();
    const reference = raw.slice(159).trim() || null;

    const { designation, name } = splitCometName(full, numberField, orbitType);
    const id = `comet-${(designation || packed || full).replace(/\s+/g, '')}`;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const qKm = q * AU_KM;
    // a is negative for a hyperbolic orbit and undefined for a parabolic one. Both are real
    // answers, so neither is faked into a number.
    const aKm = Math.abs(1 - e) < 1e-9 ? null : qKm / (1 - e);
    const periodDays =
      aKm != null && aKm > 0 ? (2 * Math.PI * Math.sqrt((aKm * aKm * aKm) / MU_SUN)) / 86400 : null;

    out.push({
      id,
      // The WHOLE MPC name field — "1P/Halley", "C/1995 O1 (Hale-Bopp)". The parenthetical is
      // the discoverer or the survey, not the comet: using it alone labels three hundred
      // different sungrazers "SOHO", which is what the first version of this did.
      name: full || designation,
      layer: 'comets',
      klass: 'comet',
      propagator: 'kepler',
      frame: 'sun-inertial',
      // The elements are measured; a two-body position computed from them is not.
      cls: 'inferred',
      epoch: epochMs,
      source: 'mpc-comets',
      elements: {
        qKm,
        e,
        aKm,
        iRad: incl * DEG,
        omRad: node * DEG, // longitude of the ascending node
        wRad: argp * DEG, // argument of perihelion
        tpMs, // time of perihelion passage — the anomaly reference for an eccentric orbit
        epochMs,
        muKm3S2: MU_SUN,
      },
      meta: {
        designation,
        discoverer: name && name !== designation ? name : null,
        cometNumber: numberField ? Number(numberField) : null,
        orbitType,
        packedDesignation: packed,
        qAu: q,
        eccentricity: e,
        inclinationDeg: incl,
        nodeDeg: node,
        argpDeg: argp,
        perihelionMs: tpMs,
        periodDays,
        absoluteMagnitude: H,
        slopeParameter: G,
        reference,
        fullName: full,
      },
    });
  }
  return out;
}

function perihelionMs(field) {
  const parts = String(field).trim().split(/\s+/);
  if (parts.length < 3) return null;
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;
  if (mo < 1 || mo > 12 || day < 1 || day >= 32) return null;
  const base = Date.UTC(y, mo - 1, 1);
  if (!Number.isFinite(base)) return null;
  // The MPC's perihelion time is TT. TT - UTC is about 69 s, which is a hundred-thousandth of a
  // comet's period; it is not corrected for and it is not worth a card line.
  return base + (day - 1) * DAY_MS;
}

function yyyymmddMs(s) {
  if (!/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return Date.UTC(y, mo - 1, d);
}

function splitCometName(full, numberField, orbitType) {
  const s = String(full).trim();
  // "C/1942 EA (Vaisala)" -> designation "C/1942 EA", name "Vaisala"
  const paren = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s);
  if (paren) return { designation: paren[1].trim(), name: paren[2].trim() };
  // "1P/Halley" -> designation "1P", name "Halley"
  const slash = /^([0-9]+[A-Z](?:-[A-Z]+)?)\/(.+)$/.exec(s);
  if (slash) return { designation: slash[1].trim(), name: slash[2].trim() };
  const numbered = numberField ? `${Number(numberField)}${orbitType || ''}` : null;
  return { designation: numbered || s, name: s };
}

// =================================================================================================
// NASA DSN Now
// =================================================================================================
//
// MEASURED shape: <dsn> holds a flat list. A <station> element is a HEADER — the <dish> elements
// that follow it belong to it, they are not its children. Walking children in document order and
// carrying the current station is the whole trick.
//
//   <station name="gdscc" friendlyName="Goldstone" timeUTC="1788721556000" .../>
//   <dish name="DSS25" azimuthAngle="226" elevationAngle="65" windSpeed="12" activity="...">
//     <upSignal   active="true" signalType="data" dataRate="0"     band="X" power="18"
//                 spacecraft="JNO" spacecraftID="-61"/>
//     <downSignal active="true" signalType="data" dataRate="18090" band="X" power="-130"
//                 spacecraft="JNO" spacecraftID="-61"/>
//     <target name="JNO" id="61" uplegRange="919000000" downlegRange="919000000" rtlt="-1"/>
//   </dish>
//
// `spacecraftID` is the JPL Horizons negative id, so the dish-to-craft join needs no name matching.

/**
 * @typedef {Object} DsnLink
 * @property {string}  id
 * @property {string}  station        friendlyName, e.g. "Goldstone"
 * @property {string}  stationId      the short name, e.g. "gdscc"
 * @property {string}  dish           e.g. "DSS25"
 * @property {number|null} azimuthRad
 * @property {number|null} elevationRad
 * @property {string|null} activity
 * @property {'up'|'down'} direction
 * @property {string|null} spacecraft      the DSN's short code, e.g. "JNO"
 * @property {number|null} spacecraftId    the Horizons negative id, e.g. -61
 * @property {number|null} dataRateBps
 * @property {string|null} band
 * @property {number|null} powerDbm        transmit power (up) or received power (down)
 * @property {number|null} rangeKm         one-way range to the target, when the feed gives one
 * @property {number|null} rtltS           round-trip light time, seconds
 * @property {number|null} stationTimeMs
 * @property {string}  cls               always 'measured'
 * @property {string}  source
 */

/**
 * @param {string} xmlText
 * @returns {DsnLink[]}
 */
export function parseDsn(xmlText) {
  if (typeof xmlText !== 'string' || xmlText.length === 0) return [];
  // The browser always takes the DOMParser path. The regex path exists so this file can be
  // tested in node, and so a browser without DOMParser degrades rather than going dark.
  if (typeof DOMParser !== 'undefined') {
    try {
      return dsnViaDom(xmlText);
    } catch {
      /* fall through to the text path rather than losing the panel */
    }
  }
  return dsnViaText(xmlText);
}

function dsnViaDom(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (!doc || doc.getElementsByTagName('parsererror').length > 0) return [];
  const root = doc.documentElement;
  if (!root) return [];

  const links = [];
  let station = { id: null, name: null, timeMs: null };

  for (const el of Array.from(root.children || [])) {
    const tag = el.tagName;
    if (tag === 'station') {
      station = {
        id: el.getAttribute('name'),
        name: el.getAttribute('friendlyName') || el.getAttribute('name'),
        timeMs: numOrNull(el.getAttribute('timeUTC')),
      };
      continue;
    }
    if (tag !== 'dish') continue;

    const dish = {
      name: el.getAttribute('name'),
      azimuthDeg: numOrNull(el.getAttribute('azimuthAngle')),
      elevationDeg: numOrNull(el.getAttribute('elevationAngle')),
      activity: el.getAttribute('activity') || null,
    };

    // A dish carries at most a handful of targets; a map is enough to attach range to a signal.
    const targets = new Map();
    for (const t of Array.from(el.children || [])) {
      if (t.tagName !== 'target') continue;
      targets.set(t.getAttribute('name'), {
        uplegKm: positive(numOrNull(t.getAttribute('uplegRange'))),
        downlegKm: positive(numOrNull(t.getAttribute('downlegRange'))),
        rtltS: positive(numOrNull(t.getAttribute('rtlt'))),
      });
    }

    for (const s of Array.from(el.children || [])) {
      const dir = s.tagName === 'upSignal' ? 'up' : s.tagName === 'downSignal' ? 'down' : null;
      if (!dir) continue;
      if (s.getAttribute('active') === 'false') continue;
      const craft = s.getAttribute('spacecraft');
      const target = targets.get(craft) || {};
      links.push(
        makeLink(station, dish, dir, {
          spacecraft: craft,
          spacecraftId: numOrNull(s.getAttribute('spacecraftID')),
          dataRate: numOrNull(s.getAttribute('dataRate')),
          frequency: numOrNull(s.getAttribute('frequency')),
          band: s.getAttribute('band'),
          power: numOrNull(s.getAttribute('power')),
          signalType: s.getAttribute('signalType'),
          rangeKm: dir === 'up' ? target.uplegKm : target.downlegKm,
          rtltS: target.rtltS,
        }),
      );
    }
  }
  return dedupeLinks(links);
}

const RX_TAG = /<(station|dish|upSignal|downSignal|target)\b([^>]*)\/?>/g;

function dsnViaText(xmlText) {
  const links = [];
  let station = { id: null, name: null, timeMs: null };
  let dish = null;
  let pending = [];
  let targets = new Map();

  const flush = () => {
    if (!dish) return;
    for (const s of pending) {
      const t = targets.get(s.spacecraft) || {};
      links.push(
        makeLink(station, dish, s.direction, {
          ...s,
          rangeKm: s.direction === 'up' ? t.uplegKm : t.downlegKm,
          rtltS: t.rtltS,
        }),
      );
    }
    pending = [];
    targets = new Map();
  };

  RX_TAG.lastIndex = 0;
  let m;
  while ((m = RX_TAG.exec(xmlText)) !== null) {
    const tag = m[1];
    const at = attrs(m[2]);
    if (tag === 'station') {
      flush();
      dish = null;
      station = { id: at.name || null, name: at.friendlyName || at.name || null, timeMs: numOrNull(at.timeUTC) };
    } else if (tag === 'dish') {
      flush();
      dish = {
        name: at.name || null,
        azimuthDeg: numOrNull(at.azimuthAngle),
        elevationDeg: numOrNull(at.elevationAngle),
        activity: at.activity || null,
      };
    } else if (tag === 'target') {
      targets.set(at.name, {
        uplegKm: positive(numOrNull(at.uplegRange)),
        downlegKm: positive(numOrNull(at.downlegRange)),
        rtltS: positive(numOrNull(at.rtlt)),
      });
    } else if (dish && at.active !== 'false') {
      pending.push({
        direction: tag === 'upSignal' ? 'up' : 'down',
        spacecraft: at.spacecraft || null,
        spacecraftId: numOrNull(at.spacecraftID),
        dataRate: numOrNull(at.dataRate),
        frequency: numOrNull(at.frequency),
        band: at.band || null,
        power: numOrNull(at.power),
        signalType: at.signalType || null,
      });
    }
  }
  flush();
  return dedupeLinks(links);
}

const RX_ATTR = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g;
function attrs(s) {
  const out = Object.create(null);
  RX_ATTR.lastIndex = 0;
  let m;
  while ((m = RX_ATTR.exec(s)) !== null) out[m[1]] = m[2];
  return out;
}

function makeLink(station, dish, direction, sig) {
  return {
    id: `dsn-${dish.name || '?'}-${direction}-${sig.spacecraft || '?'}`,
    station: station.name,
    stationId: station.id,
    dish: dish.name,
    azimuthRad: dish.azimuthDeg == null ? null : dish.azimuthDeg * DEG,
    elevationRad: dish.elevationDeg == null ? null : dish.elevationDeg * DEG,
    azimuthDeg: dish.azimuthDeg,
    elevationDeg: dish.elevationDeg,
    activity: dish.activity,
    direction,
    spacecraft: sig.spacecraft || null,
    // The JPL Horizons negative id. Join key for the deep-space records; no name matching.
    spacecraftId: sig.spacecraftId == null ? null : sig.spacecraftId,
    dataRateBps: sig.dataRate == null ? null : sig.dataRate,
    frequencyHz: sig.frequency == null ? null : sig.frequency,
    band: sig.band || null,
    powerDbm: sig.power == null ? null : sig.power,
    signalType: sig.signalType || null,
    rangeKm: sig.rangeKm == null ? null : sig.rangeKm,
    rtltS: sig.rtltS == null ? null : sig.rtltS,
    stationTimeMs: station.timeMs,
    cls: 'measured',
    source: 'dsn-now',
  };
}

function dedupeLinks(links) {
  // A dish can list the same down-signal twice (measured: DSS24 did on 2026-09-06). One line
  // per dish/direction/craft is what a person means by "who is it talking to".
  const seen = new Set();
  const out = [];
  for (const l of links) {
    if (!l.spacecraft && l.spacecraftId == null) continue;
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
  }
  return out;
}

function positive(v) {
  return v == null || v < 0 ? null : v;
}

// =================================================================================================
// NOAA SWPC — planetary K index
// =================================================================================================
//
// TWO shapes exist in the wild under `products/`, and both are handled because the app must not
// go dark when NOAA changes one:
//   a) array of arrays, FIRST ROW A HEADER OF STRINGS:
//      [["time_tag","Kp","observed","noaa_scale"], ["2026-09-06 00:00:00","3.67","observed",null]]
//   b) array of objects (what the forecast product returned when measured on 2026-09-06):
//      [{"time_tag":"2026-08-30T00:00:00","kp":3.67,"observed":"observed","noaa_scale":null}]

/**
 * @param {Array|string} json
 * @returns {{kp: number|null, forecast: Array<{tMs:number, kp:number, observed:string|null,
 *          scale:string|null, cls:string}>, observedKp: number|null, maxForecastKp: number|null}}
 */
export function parseSpaceWeather(json) {
  const rows = asArray(json);
  const empty = { kp: null, forecast: [], observedKp: null, maxForecastKp: null };
  if (!rows || rows.length === 0) return empty;

  let records = [];

  if (Array.isArray(rows[0])) {
    // Shape (a). The first row names the columns and is NOT data.
    const header = rows[0].map((h) => String(h).trim().toLowerCase());
    const iTime = header.findIndex((h) => h.includes('time'));
    const iKp = header.findIndex((h) => h === 'kp' || h.includes('kp_index') || h === 'kp_value');
    const iObs = header.findIndex((h) => h.includes('observed'));
    const iScale = header.findIndex((h) => h.includes('scale'));
    if (iTime < 0 || iKp < 0) return empty;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!Array.isArray(r)) continue;
      records.push({
        tMs: parseUtc(r[iTime]),
        kp: num(r[iKp]),
        observed: iObs >= 0 && r[iObs] != null ? String(r[iObs]) : null,
        scale: iScale >= 0 && r[iScale] != null ? String(r[iScale]) : null,
      });
    }
  } else {
    // Shape (b).
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      records.push({
        tMs: parseUtc(r.time_tag ?? r.timeTag ?? r.time),
        kp: num(r.kp ?? r.kp_index ?? r.Kp ?? r.k_index),
        observed: r.observed == null ? null : String(r.observed),
        scale: r.noaa_scale == null ? null : String(r.noaa_scale),
      });
    }
  }

  const forecast = records
    .filter((r) => r.tMs != null && r.kp != null)
    .sort((a, b) => a.tMs - b.tMs)
    .map((r) => ({
      ...r,
      // NOAA labels each row itself: observed, estimated, or predicted. That label IS the class.
      cls: r.observed === 'observed' ? 'measured' : r.observed === 'estimated' ? 'inferred' : 'inferred',
    }));

  if (forecast.length === 0) return empty;

  const observedRows = forecast.filter((r) => r.observed === 'observed' || r.observed === 'estimated');
  const observedKp = observedRows.length ? observedRows[observedRows.length - 1].kp : null;
  const predicted = forecast.filter((r) => r.observed !== 'observed' && r.observed !== 'estimated');
  const maxForecastKp = predicted.length ? Math.max(...predicted.map((r) => r.kp)) : null;

  return {
    // "kp" means the most recent Kp anybody has measured. If NOAA gave us only a forecast, say
    // so by falling back to the first forecast row rather than pretending it was observed.
    kp: observedKp != null ? observedKp : forecast[0].kp,
    observedKp,
    maxForecastKp,
    forecast,
  };
}

// =================================================================================================
// shared
// =================================================================================================

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  if (v && typeof v === 'object' && Array.isArray(v.data)) return v.data;
  return null;
}

function asObject(v) {
  if (v && typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * CelesTrak's EPOCH is UTC but carries no offset — "2026-09-06T11:11:22.279776". A bare
 * date-time string is LOCAL time to Date.parse, so parsing it raw shifts every satellite by the
 * visitor's timezone. That is hours of along-track error and it is silent. Hence this.
 */
function parseUtc(s) {
  if (s == null) return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  let t = String(s).trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(t) && !/(Z|[+-]\d{2}:?\d{2})$/.test(t)) {
    t = t.replace(' ', 'T') + 'Z';
  }
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

function num(v) {
  if (v == null) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function numOrNull(v) {
  return num(v);
}

// ---------------------------------------------------------------------------------------------
// The two parsers the harvester made possible (spec 0003 amendment 1 §4 follow-up).
//
// JPL sends no CORS headers, so until the harvester existed the asteroid and deep-space layers
// were hand-made stand-ins classed `sample`, each card saying so. The harvester now writes the
// real bodies to /data/v1/, the reader hands them here verbatim, and these two functions turn them
// into records. When a snapshot is missing the loader falls back to the stand-in, per record and
// per layer, and nothing is invented.
// ---------------------------------------------------------------------------------------------

const JD_UNIX_EPOCH = 2440587.5;
const LUNAR_DISTANCE_KM = 384400;

function jdToMs(jd) {
  return (Number(jd) - JD_UNIX_EPOCH) * 86400000;
}

/**
 * JPL Horizons VECTORS text -> [{tMs, x, y, z, vx, vy, vz}], km and km/s, in the frame the
 * request asked for. The harvester asks for CENTER='500@10' (the Sun) with Horizons' default
 * reference plane, which is the ECLIPTIC of J2000 -- the same frame this app calls
 * `sun-inertial` and the same one the comets' MPC elements are in. MEASURED against the real
 * body for Voyager 1 on 2026-09-07: |r| = 171.7 au (Horizons' own r on that date is 171.68), and
 * z/r = 0.58, i.e. 35 deg above the ecliptic, which is where Voyager 1 is; in the equatorial frame
 * that ratio would read very differently.
 *
 * The rows sit between $$SOE and $$EOE as CSV: JDTDB, calendar date, X, Y, Z, VX, VY, VZ.
 * A text with no $$SOE block (Horizons refusing a window, an unknown id) yields [].
 */
export function horizonsSamples(text) {
  if (typeof text !== 'string') return [];
  const s = text.indexOf('$$SOE');
  const e = text.indexOf('$$EOE', s + 5);
  if (s < 0 || e < 0) return [];
  const out = [];
  for (const line of text.slice(s + 5, e).split(/\r?\n/)) {
    const c = line.split(',').map((f) => f.trim());
    if (c.length < 8) continue;
    const jd = Number(c[0]);
    const v = c.slice(2, 8).map(Number);
    if (!Number.isFinite(jd) || v.some((n) => !Number.isFinite(n))) continue;
    out.push({ tMs: jdToMs(jd), x: v[0], y: v[1], z: v[2], vx: v[3], vy: v[4], vz: v[5] });
  }
  return out;
}

/**
 * The deep-space layer from a harvested Horizons snapshot.
 *
 * @param {Object<string,string>} body   the snapshot body: Horizons id -> response text
 * @param {Array<Object>} base           the hand-kept records (data/sample.js sampleDeepSpace)
 *   -- names, classes, ids the trips and the models refer to, and `meta.horizonsId`. Only the
 *   POSITION changes here: a record whose id has data becomes `sampled` and `measured`; one whose
 *   id has none stays exactly the stand-in it was, card and all. The ids never change, because
 *   registry/tours.yaml and registry/oddities.yaml name them.
 */
export function parseHorizonsVectors(body, base = []) {
  const list = Array.isArray(base) ? base : [];
  if (!body || typeof body !== 'object') return list;
  const out = [];
  for (const rec of list) {
    const hid = rec && rec.meta ? rec.meta.horizonsId : null;
    const text = hid == null ? null : body[String(hid)];
    const samples = horizonsSamples(text);
    if (samples.length < 2) {
      out.push(rec);
      continue;
    }
    const first = samples[0].tMs;
    const last = samples[samples.length - 1].tMs;
    out.push({
      ...rec,
      propagator: 'sampled',
      elements: undefined,
      samples,
      // Horizons' state vectors are the mission's own navigation solution, sampled every six
      // hours; a Hermite curve between two of them is closer to the truth than anything else
      // this page draws.
      cls: 'measured',
      epoch: last,
      meta: {
        ...rec.meta,
        construction: 'horizons',
        anchor: null,
        anchorDrift: null,
        approx: false,
        approxFields: [],
        sampleCount: samples.length,
        samplesFromMs: first,
        samplesToMs: last,
        why:
          'Position from JPL Horizons: the mission’s own trajectory, sampled every six hours ' +
          'and interpolated between samples. Fetched by our scheduled job, not by this page.',
      },
    });
  }
  return out;
}

/** A JPL table `{fields:[...], data:[[...]]}` -> array of plain objects. Anything else -> []. */
function jplTable(t) {
  if (!t || !Array.isArray(t.fields) || !Array.isArray(t.data)) return [];
  return t.data.map((row) => {
    const o = {};
    t.fields.forEach((f, i) => { o[f] = row[i]; });
    return o;
  });
}

/**
 * The join key for a small body. SBDB writes "   433 Eros (A898 PA)" and "       (2026 RR1)";
 * CAD writes des "433" and "2026 RR1". Numbered bodies match on the number, unnumbered ones on
 * the provisional designation in the parentheses.
 */
function sbdbKeys(fullName) {
  const fn = String(fullName || '').trim();
  const keys = [];
  const m = /^(\d+)\s/.exec(fn);
  if (m) keys.push(m[1]);
  const p = fn.lastIndexOf('(');
  const q = fn.lastIndexOf(')');
  if (p >= 0 && q > p) keys.push(fn.slice(p + 1, q).trim());
  if (!keys.length) keys.push(fn);
  return keys;
}

/**
 * "Asteroids passing by": the bodies JPL's close-approach table lists for the coming weeks, each
 * with its orbit from the SBDB. Two snapshots, one layer. A CAD row with no SBDB match is
 * skipped -- there is nothing honest to draw it with.
 *
 * The elements are measured (JPL's fit). The POSITION is computed here from them by two-body
 * motion, so the record is `inferred`, exactly as the comets are.
 */
export function parseNeoApproaches(cad, sbdb) {
  const approaches = jplTable(cad);
  const bodies = jplTable(sbdb);
  if (!approaches.length || !bodies.length) return [];
  const byKey = new Map();
  for (const b of bodies) for (const k of sbdbKeys(b.full_name)) if (!byKey.has(k)) byKey.set(k, b);

  const out = [];
  const seen = new Set();
  for (const a of approaches) {
    const des = String(a.des || '').trim();
    const b = byKey.get(des);
    if (!b) continue;
    const aAu = Number(b.a);
    const e = Number(b.e);
    const epochJd = Number(b.epoch);
    if (!(aAu > 0) || !(e >= 0) || !Number.isFinite(epochJd)) continue;
    const id = `neo-${des.replace(/\s+/g, '-').toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const aKm = aAu * AU_KM;
    const qKm = aKm * (1 - e);
    const epochMs = jdToMs(epochJd);
    const fullName = String(b.full_name || a.fullname || des).trim();
    // "433 Eros (A898 PA)" keeps its name; "(2026 RR1)" is a designation and loses the brackets.
    const name = /^\(.*\)$/.test(fullName) ? fullName.slice(1, -1) : fullName;
    const distAu = Number(a.dist);
    const distKm = Number.isFinite(distAu) ? distAu * AU_KM : null;
    const caMs = Number.isFinite(Number(a.jd)) ? jdToMs(a.jd) : null;
    const H = Number(b.H);
    const diameter = Number(b.diameter);
    out.push({
      id,
      name,
      layer: 'asteroids',
      klass: 'asteroid',
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'inferred',
      epoch: epochMs,
      source: 'jpl-sbdb-neo',
      elements: {
        qKm,
        e,
        aKm,
        iRad: Number(b.i) * DEG,
        omRad: Number(b.om) * DEG,
        wRad: Number(b.w) * DEG,
        maRad: Number(b.ma) * DEG,
        epochMs,
        muKm3S2: MU_SUN,
      },
      meta: {
        designation: des,
        fullName,
        aAu,
        qAu: qKm / AU_KM,
        eccentricity: e,
        inclinationDeg: Number(b.i),
        nodeDeg: Number(b.om),
        argpDeg: Number(b.w),
        meanAnomalyDeg: Number(b.ma),
        periodDays: (2 * Math.PI * Math.sqrt((aKm * aKm * aKm) / MU_SUN)) / 86400,
        absoluteMagnitude: Number.isFinite(H) ? H : null,
        diameterKm: Number.isFinite(diameter) ? diameter : null,
        orbitClass: b.class || null,
        neo: true,
        closeApproachMs: caMs,
        closeApproachDistanceKm: distKm,
        closeApproachLunarDistances: distKm != null ? distKm / LUNAR_DISTANCE_KM : null,
        relativeSpeedKmS: Number.isFinite(Number(a.v_rel)) ? Number(a.v_rel) : null,
        approx: false,
        approxFields: [],
        why:
          'The orbit is JPL’s fit to real observations. Where it is along that orbit is ' +
          'computed here from those elements, so the position is inferred, not measured. ' +
          'It is in this layer because JPL’s close-approach table lists it passing within ' +
          'ten lunar distances.',
      },
    });
  }
  return out;
}


// =================================================================================================
// Exoplanets (spec 0028 step 4): the NASA Exoplanet Archive's pscomppars table, as CSV
// =================================================================================================

const LY_PER_PC = 3.2615637771674333;
const LY_KM_EXO = 9460730472580.8;
const OBLIQUITY_RAD = 23.4392911 * (Math.PI / 180);

/** Split one CSV line honouring double quotes ("Radial Velocity", "K2-18 b"). */
export function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * RA/Dec (degrees) and a distance (parsecs) -> a heliocentric position in km on the ecliptic J2000
 * axes of `sun-inertial` -- the same rotation scripts/build-stars3d.py applies, so a planet lands
 * on its star.
 */
export function skyToSunInertialKm(raDeg, decDeg, distPc) {
  const ra = raDeg * (Math.PI / 180);
  const dec = decDeg * (Math.PI / 180);
  const r = distPc * LY_PER_PC * LY_KM_EXO;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  const ce = Math.cos(OBLIQUITY_RAD), se = Math.sin(OBLIQUITY_RAD);
  return { x: x * r, y: (y * ce + z * se) * r, z: (-y * se + z * ce) * r };
}

/**
 * The archive's CSV -> one `static` record per planet, placed AT ITS STAR. A planet's orbit is
 * a few au across; at the nearest exoplanet that is 0.7 arcseconds and at every zoom this app
 * draws it is far below one pixel, so the star's position is the planet's to well under a pixel
 * and the position is `measured`. The card says the planet is drawn at its star.
 *
 * Both the harvester's snapshot (13 columns) and the bundled copy (same columns, rounded, with a
 * leading `#` line saying its date) parse here; columns are read by header name.
 *
 * @param {string} text
 * @param {{asOf?: string}} [opts]  the bundled copy's date, stamped on every record
 */
export function parseExoplanets(text, opts = {}) {
  if (typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  if (!lines.length) return [];
  let asOf = opts.asOf || null;
  const dated = text.match(/^#.*as of (\d{4}-\d{2}-\d{2})/m);
  if (!asOf && dated) asOf = dated[1];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  const iName = col('pl_name'), iHost = col('hostname'), iRa = col('ra'), iDec = col('dec'), iDist = col('sy_dist');
  if (iName < 0 || iHost < 0 || iRa < 0 || iDec < 0 || iDist < 0) return [];
  const iRade = col('pl_rade'), iMass = col('pl_bmasse'), iPer = col('pl_orbper'), iYear = col('disc_year');
  const iMethod = col('discoverymethod'), iTeff = col('st_teff'), iSrad = col('st_rad'), iSpect = col('st_spectype');
  const num = (f, i) => { if (i < 0) return null; const v = parseFloat(f[i]); return Number.isFinite(v) ? v : null; };
  const out = [];
  for (let k = 1; k < lines.length; k++) {
    const f = splitCsvLine(lines[k]);
    const name = (f[iName] || '').trim();
    const host = (f[iHost] || '').trim();
    const ra = num(f, iRa), dec = num(f, iDec), distPc = num(f, iDist);
    if (!name || ra === null || dec === null || distPc === null || distPc <= 0) continue;
    const pos = skyToSunInertialKm(ra, dec, distPc);
    const year = num(f, iYear);
    out.push({
      id: 'exo-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      klass: 'exoplanet',
      layer: 'exoplanets',
      propagator: 'static',
      frame: 'sun-inertial',
      pos,
      cls: 'measured',
      meta: {
        host,
        distLy: Math.round(distPc * LY_PER_PC * 100) / 100,
        radiusEarths: num(f, iRade),
        massEarths: num(f, iMass),
        periodDays: num(f, iPer),
        discYear: year === null ? null : Math.round(year),
        method: (iMethod >= 0 ? f[iMethod] : '').trim() || null,
        starTeffK: num(f, iTeff),
        starRadiusSuns: num(f, iSrad),
        starSpect: (iSpect >= 0 ? f[iSpect] : '').trim() || null,
        aliases: host ? [host] : [],
        asOf,
        drawnAtStar: true,
      },
    });
  }
  return out;
}


// =================================================================================================
// Deep-sky objects (spec 0028 step 5): site/data/dso.json from scripts/build-dso.py
// =================================================================================================

/**
 * One `static` record per object that has a SOURCED distance. The file already holds positions in
 * light-years on the sun-inertial axes; this only turns them into km and hangs the card's facts
 * on `meta`. A size in light-years is derived from the apparent major axis and the distance --
 * small-angle, which for a 3 degree galaxy is good to a part in a thousand.
 */
export function parseDso(doc) {
  const list = doc && Array.isArray(doc.objects) ? doc.objects : [];
  const out = [];
  for (const o of list) {
    if (!o || !Array.isArray(o.posLy) || !Number.isFinite(o.posLy[0]) || !(o.distLy > 0)) continue;
    const sizeLy = Number.isFinite(o.majAxArcmin) ? Math.round(o.distLy * (o.majAxArcmin / 60) * (Math.PI / 180) * 10) / 10 : null;
    const aliases = [];
    if (o.messier != null) aliases.push(`M${o.messier}`, `Messier ${o.messier}`);
    if (o.designation) aliases.push(o.designation, o.designation.replace(/\s+/g, ''));
    if (o.common && o.name !== o.common) aliases.push(o.common);
    out.push({
      id: `dso-${o.id}`,
      name: o.common || o.name,
      klass: 'dso',
      layer: 'deep-sky',
      propagator: 'static',
      frame: 'sun-inertial',
      pos: { x: o.posLy[0] * LY_KM_EXO, y: o.posLy[1] * LY_KM_EXO, z: o.posLy[2] * LY_KM_EXO },
      cls: 'measured',
      meta: {
        messier: o.messier ?? null,
        designation: o.designation || null,
        kind: o.kind || 'other',
        typeText: o.typeText || null,
        hubble: o.hubble || null,
        con: o.con || null,
        distLy: o.distLy,
        distLyLow: o.distLyLow ?? null,
        distLyHigh: o.distLyHigh ?? null,
        sizeLy,
        majAxArcmin: o.majAxArcmin ?? null,
        mag: o.vmag ?? null,
        why: o.why || null,
        distanceSource: o.distanceSource || null,
        aliases,
      },
    });
  }
  return out;
}
