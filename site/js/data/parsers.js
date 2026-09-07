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
