// data/moons.js -- the moons the map had no record of, and the companions of asteroids and far worlds.
// Release 1.5.0, internal spec 0079 stage A3 (internal i#1061).
//
// LOADED ON DEMAND, NEVER AT BOOT. data/layers.js gives the two layers a `fetchLazy` that imports this module and
// calls fetchMoons() / fetchCompanions(); main.js loads them after the first visit (LATER_LAYERS). The files are
// site/data/moons.json and site/data/companions.json, written by scripts/gen_moons.py, which says where every
// number in them was read.
//
// WHAT A RECORD IS.
//   moons        klass `moon`, propagator `kepler`, frame `<planet>-inertial` (propagate/frames.js): JPL Horizons'
//                osculating orbit for 2026-01-01 round the planet's centre, in ecliptic J2000 axes, carried along by
//                JPL's MEAN sidereal period (propagate/kepler.js takes the element set's own mu for a frame that is
//                neither the Sun's nor the Earth's, and `mu` here is the one that makes the period come out). The
//                period's printed precision says how far the place on the orbit can be trusted from the epoch
//                (`phaseDeg`, a year out); past 30 degrees the place is `illustrative` and the card says so.
//   companions   klass `moon`, in `sun-inertial`: drawn AT the parent's place on the parent's orbit (kepler) when JPL
//                holds no orbit round it; propagator `companion` (propagate/companion.js) where a complete orbit
//                round the parent is known (13 moons) or, for the dwarf planets' moons, where the size, shape and lap are
//                known and the tilt and the place on the orbit are not (class `illustrative`).
//                The candidate dwarf planets are klass `asteroid`, `farKind: 'candidate'`, rows like the far-bodies.
//
// Pure builders (buildMoons, buildCompanions) are exported for tests/test_moons.mjs; the fetchers only read the file.

import '../copy/en.moons.js';
import { COPY, t, fmt, timeText } from '../copy/en.js';

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const DAY_MS = 86400000;
const MU_SUN = 1.32712440018e11;
/** 2026-01-01 00:00 TDB, read as UTC (69 s apart: a hundredth of a degree of the fastest moon's lap). */
export const EPOCH_MS = Date.UTC(2026, 0, 1);
const jdToMs = (jd) => (jd - 2440587.5) * DAY_MS;
/** The kind of moon whose place was held to Horizons and stayed within this (scripts/gen_moons.py PLACE_MIN_LAP_DAYS, PLACE_MAX_E): inferred; the rest illustrative. */
export const PLACE_LIMIT_DEG = 30;

const PLANETS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const PLANET_NAMES = { jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };

/** The date the card prints, once: "1 January 2026". */
const EPOCH_WORDS = timeText.longDate(Date.UTC(2026, 0, 1, 12));
/** A day the sources give at 00:00 UTC, as words that read the same in every time zone. */
const dayWords = (ms) => timeText.longDate(ms + 12 * 3600e3);

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Mean motion that makes a two-body orbit of semi-major axis aKm take periodDays: mu = a^3 n^2, km^3/s^2. */
export function muFor(aKm, periodDays) {
  const n = (2 * Math.PI) / (periodDays * 86400);
  return aKm * aKm * aKm * n * n;
}

/** Degrees of uncertainty in the place on the orbit after `days`, from a period printed to `decimals` places (the asteroid companions' own orbits). */
export function phaseUncertaintyDeg(periodDays, decimals, days) {
  const dP = 0.5 * Math.pow(10, -decimals);
  return Math.min(180, (360 * days * dP) / (periodDays * periodDays));
}

function row(json) {
  const idx = Object.fromEntries(json.cols.map((c, i) => [c, i]));
  return (r) => Object.fromEntries(Object.keys(idx).map((c) => [c, r[idx[c]]]));
}

function aliasesOf(name, desig, extra = []) {
  const out = new Set([name, desig, ...extra].filter(Boolean));
  for (const d of [desig, name]) {
    if (!d) continue;
    const m = /^S\/(\d{4}) ([A-Z]) ?(\d+)$/.exec(d);
    if (m) {
      // JPL writes S/2011 J4; the IAU, and people, write S/2011 J 4. Both, with and without the slash.
      out.add(`S/${m[1]} ${m[2]} ${m[3]}`);
      out.add(`S${m[1]} ${m[2]} ${m[3]}`);
      out.add(`S/${m[1]} ${m[2]}${m[3]}`);
      out.add(`S${m[1]} ${m[2]}${m[3]}`);
    } else if (/^S\//.test(d)) {
      out.add(d.replace('S/', 'S')); // S/2005 (136199) 1 -> S2005 (136199) 1
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------------------------------------------
// the planets' moons

/**
 * The records of site/data/moons.json. Pure.
 * @param {Object} json the parsed file
 * @returns {Array<Object>}
 */
export function buildMoons(json) {
  const read = row(json);
  const C = COPY.moonCard;
  // How the model did against JPL Horizons on days it was not fitted to (scripts/gen_moons.py sample_check), for the moons called
  // inferred and for the rest. A file built without a check says so by saying nothing about it.
  const check = json.check || { days: [], good: [0, 0], lost: [0, 0] };
  const checkDays = check.days.map((d) => dayWords(Date.parse(`${d}T00:00:00Z`))).join(' and ');
  return json.rows.map((raw) => {
    const m = read(raw);
    const planet = PLANETS[m.p];
    const planetName = PLANET_NAMES[planet];
    const aKm = m.a;
    const e = m.e;
    // One moon (Daphnis) has no ephemeris that late: its orbit is the last month JPL has, and says so.
    const epochMs = Number.isFinite(m.ep) ? jdToMs(m.ep) : EPOCH_MS;
    const epochWords = Number.isFinite(m.ep) ? dayWords(epochMs) : EPOCH_WORDS;
    const mu = muFor(aKm, m.P);
    const placeKnown = m.ok === 1;
    const diameterKm = Number.isFinite(m.r) ? Math.round(m.r * 2 * 10) / 10 : null;
    const by = Number.isFinite(m.by) ? json.discoverers[m.by] : null;
    const read2 = timeText.longDate(Date.parse(`${json.read}T12:00:00Z`));
    return {
      id: m.id,
      name: m.name,
      layer: 'moons',
      klass: 'moon',
      propagator: 'kepler',
      frame: `${planet}-inertial`,
      cls: placeKnown ? 'inferred' : 'illustrative',
      // The age the card prints is the age of the ELEMENTS: the day the orbit was read from Horizons.
      epoch: epochMs,
      source: 'jpl-ssd-satellites',
      elements: {
        aKm,
        qKm: aKm * (1 - e),
        e,
        iRad: m.i * DEG,
        omRad: m.om * DEG,
        wRad: m.w * DEG,
        maRad: m.ma * DEG,
        epochMs,
        muKm3S2: mu,
      },
      meta: {
        moonOf: planet,
        planetName,
        designation: m.desig || '',
        aliases: aliasesOf(m.name, m.desig, [`${m.name} ${planetName}`]),
        jplCode: m.code,
        periodDays: m.P,
        meanAKm: m.am,
        meanE: m.em,
        eccentricity: e,
        diameterKm,
        discYear: Number.isFinite(m.yr) ? m.yr : null,
        discoverer: by,
        discRef: m.ref || null,
        backwards: m.retro === 1,
        placeState: placeKnown ? 'good' : Number.isFinite(m.ep) ? 'unchecked' : 'lost',
        checkedN: placeKnown ? check.good[0] : check.lost[0],
        checkedDeg: placeKnown ? check.good[1] : check.lost[1],
        placeIllustrative: !placeKnown,
        // scene/orbitline.js draws the whole ellipse, round today's origin: a lap round Jupiter that takes 700 days
        // is not a lap of the planet's own motion as well.
        wholePath: true,
        orbitKnown: Number.isFinite(m.ep) ? t(C.orbitKnownUnchecked, { epoch: epochWords })
          : placeKnown ? t(C.orbitKnown, { epoch: epochWords, n: String(check.good[0]), deg: String(check.good[1]), days: checkDays })
            : t(C.orbitKnownLost, { epoch: epochWords, deg: String(check.lost[1]) }),
        drawn: diameterKm !== null ? C.drawnBig : C.drawn,
        cite: t(C.sourceMoons, { read: read2, epoch: epochWords }),
        elementsEpochMs: epochMs,
      },
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// the companions

function bodyOf(b) {
  const [spk, number, name, pdes, a, e, i, om, w, ma, epochJd, H, diameter, candidate, companions, id] = b;
  return { id, spk, number, name, pdes, a, e, i, om, w, ma, epochJd, H, diameter, candidate, companions };
}

/** A body's heliocentric element set in the shape propagate/kepler.js reads. */
export function heliocentric(b) {
  const aKm = b.a * AU_KM;
  return {
    aKm,
    qKm: aKm * (1 - b.e),
    e: b.e,
    iRad: b.i * DEG,
    omRad: b.om * DEG,
    wRad: b.w * DEG,
    maRad: b.ma * DEG,
    epochMs: jdToMs(b.epochJd),
    muKm3S2: MU_SUN,
  };
}

function parentLabel(b) {
  return b.number ? `(${b.number}) ${b.name}` : b.name;
}

function periodWords(days) {
  const C = COPY.moonCard.values;
  if (days < 2) return t(C.hours, { n: fmt.smart(days * 24) });
  if (days > 700) return t(C.years, { n: fmt.smart(days / 365.25) });
  return t(C.days, { n: fmt.smart(days) });
}

/**
 * The records of site/data/companions.json. Pure.
 * @param {Object} json the parsed file
 * @returns {Array<Object>}
 */
export function buildCompanions(json) {
  const C = COPY.moonCard;
  const read = timeText.longDate(Date.parse(`${json.read}T12:00:00Z`));
  const bodies = json.bodies.map(bodyOf);
  const bySpk = new Map(bodies.map((b) => [b.spk, b]));
  const records = [];

  // 1. the candidate dwarf planets themselves
  for (const b of bodies) {
    if (!b.candidate) continue;
    const c = json.candidates[String(b.spk)] || [];
    const [d, lo, hi, dsrc, yr, by] = c;
    const el = heliocentric(b);
    const moons = [
      ...b.companions.map((x) => x[0]),
      ...json.far.filter((f) => f[3] === b.spk).map((f) => f[1]),
    ];
    const label = parentLabel(b);
    records.push({
      id: b.id,
      name: b.name,
      layer: 'companions',
      klass: 'asteroid',
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'inferred',
      epoch: jdToMs(b.epochJd),
      source: 'jpl-sbdb',
      elements: el,
      meta: {
        designation: label,
        aliases: aliasesOf(b.name, b.pdes, [label, b.number ? String(b.number) : '']),
        farKind: 'candidate',
        aAu: b.a,
        qAu: el.qKm / AU_KM,
        aphelionAu: b.a * (1 + b.e),
        eccentricity: b.e,
        inclinationDeg: b.i,
        nodeDeg: b.om,
        argpDeg: b.w,
        meanAnomalyDeg: b.ma,
        absoluteMagnitude: b.H,
        diameterKm: Number.isFinite(d) ? d : null,
        diameterLowKm: Number.isFinite(lo) && Number.isFinite(hi) ? lo : null,
        diameterHighKm: Number.isFinite(lo) && Number.isFinite(hi) ? hi : null,
        moons: moons.length ? moons : [],
        neo: false,
        discYear: yr || null,
        discoverer: by || null,
        wholePath: true,
        cite: `${t(C.sourceBody, { name: label, solution: dayWords(jdToMs(b.epochJd)), read })}${dsrc ? `; ${t(C.candidateWhy, { src: dsrc })}` : ''}`,
        departure: C.candidate.replace('{name}', b.name),
      },
    });
  }

  // 2. the confirmed companions JPL lists, at their parent's place unless a complete orbit is known
  for (const b of bodies) {
    const parentEl = heliocentric(b);
    const label = parentLabel(b);
    for (const c of b.companions) {
      const [cid, cname, cdesig, year, ref, period, orbit] = c;
      const base = {
        name: cname,
        layer: 'companions',
        klass: 'moon',
        frame: 'sun-inertial',
        epoch: jdToMs(b.epochJd),
        source: 'jpl-sbdb',
      };
      const meta = {
        moonOf: 'sun',
        parentName: b.name,
        parentLabel: label,
        parentKind: b.spk >= 20000000 && b.spk < 30000000 ? 'asteroid' : 'asteroid',
        parentDiameterKm: Number.isFinite(b.diameter) ? b.diameter : null,
        designation: cdesig || '',
        aliases: aliasesOf(cname, cdesig, [`${b.name} ${cname}`, label]),
        discYear: Number.isFinite(year) ? year : null,
        discRef: ref || null,
        lapDays: Number.isFinite(period) ? period : null,
        diameterKm: null,
        drawn: C.drawn,
        cite: t(C.sourceCompanion, { parent: label, read }),
      };
      if (orbit) {
        const [aKm, e, iEcl, omEcl, wEcl, maDeg, epochJd, perDays, perDec, oref] = orbit;
        const mu = muFor(aKm, perDays);
        const uncertain = phaseUncertaintyDeg(perDays, perDec, Math.abs(Date.now() - jdToMs(epochJd)) / DAY_MS);
        records.push({
          ...base,
          id: cid,
          propagator: 'companion',
          cls: uncertain <= PLACE_LIMIT_DEG ? 'inferred' : 'illustrative',
          epoch: jdToMs(epochJd),
          parentElements: parentEl,
          elements: { aKm, qKm: aKm * (1 - e), e, iRad: iEcl * DEG, omRad: omEcl * DEG, wRad: wEcl * DEG, maRad: maDeg * DEG, epochMs: jdToMs(epochJd), muKm3S2: mu },
          meta: {
            ...meta,
            meanAKm: aKm,
            eccentricity: e,
            lapDays: perDays,
            orbitKnown: t(C.orbitFull, { epoch: dayWords(jdToMs(epochJd)) }),
            orbitRef: oref || null,
            placeIllustrative: uncertain > PLACE_LIMIT_DEG,
          },
        });
      } else {
        records.push({
          ...base,
          id: cid,
          propagator: 'kepler',
          cls: 'inferred',
          elements: parentEl,
          meta: {
            ...meta,
            wholePath: true,
            orbitKnown: t(C.atParent, { parent: label }),
            atParent: true,
          },
        });
      }
    }
  }

  // 3. the dwarf planets' moons: size, shape and lap known; tilt and place on the orbit not
  for (const f of json.far) {
    const [id, name, desig, parentSpk, aKm, e, periodDays, iDeg, d, lo, hi, year, ref, by] = f;
    const b = bySpk.get(parentSpk);
    if (!b) continue;
    const label = parentLabel(b);
    const tilted = Number.isFinite(iDeg);
    records.push({
      id,
      name,
      layer: 'companions',
      klass: 'moon',
      propagator: 'companion',
      frame: 'sun-inertial',
      cls: 'illustrative',
      epoch: jdToMs(b.epochJd),
      source: 'jpl-sbdb',
      parentElements: heliocentric(b),
      elements: { aKm, qKm: aKm * (1 - e), e, iRad: (tilted ? iDeg : 0) * DEG, omRad: 0, wRad: 0, maRad: 0, epochMs: jdToMs(b.epochJd), muKm3S2: muFor(aKm, periodDays) },
      meta: {
        moonOf: 'sun',
        parentName: b.name,
        parentLabel: label,
        parentKind: 'far',
        designation: desig,
        aliases: aliasesOf(name, desig, [`${label} I`, `${b.name} ${name}`, id]),
        meanAKm: aKm,
        eccentricity: e,
        lapDays: periodDays,
        periodDays,
        diameterKm: Number.isFinite(d) ? d : null,
        diameterLowKm: Number.isFinite(lo) && Number.isFinite(hi) && Number.isFinite(d) ? lo : null,
        diameterHighKm: Number.isFinite(lo) && Number.isFinite(hi) && Number.isFinite(d) ? hi : null,
        diameterAtMostKm: !Number.isFinite(d) && Number.isFinite(hi) ? hi : null,
        discYear: year,
        discoverer: by,
        discRef: ref,
        placeIllustrative: true,
        orbitKnown: tilted ? C.orbitFarTilted : C.orbitFar,
        drawn: C.drawn,
        cite: t(C.sourceFar, { ref, name, read }),
      },
    });
  }
  return records;
}

// ---------------------------------------------------------------------------------------------------------------
// the fetchers: the layers' `fetchLazy`

const url = (file) => new URL(`../../data/${file}`, import.meta.url).href;

async function readJson(file) {
  const r = await fetch(url(file), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  return r.json();
}

/** The planets' moons the map had no record of. */
export async function fetchMoons() {
  return buildMoons(await readJson('moons.json'));
}

/** Asteroid and far-world companions, and the candidate dwarf planets. */
export async function fetchCompanions() {
  return buildCompanions(await readJson('companions.json'));
}
