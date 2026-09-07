// data/sample.js — bundled stand-ins for the sources a browser cannot call.
//
// CONTRACT (tests/test_contract.mjs):
//   export function sampleAsteroids(): Record[]
//   export function sampleDeepSpace(): Record[]
//   export function sampleReentries(): Record[]
//
// Every record here carries cls:'sample' and a meta.why saying what it stands in for and why it
// is not live. It is drawn with a dashed halo so it is never mistaken for a live position.
//
// ---------------------------------------------------------------------------------------------
// THE HONESTY RULES THIS FILE IS WRITTEN UNDER
//
//  1. A rounded number with meta.approx = true is correct. A nine-figure number I cannot defend
//     is not, however much more finished it looks.
//  2. meta.approxFields names EXACTLY which numbers are soft, so a card can say so in words
//     instead of hedging about the whole record.
//  3. Where a phase along the orbit is unknown it is set to perihelion at the stated epoch and
//     said so out loud. Every asteroid below therefore sits at ITS OWN perihelion: the orbit's
//     size, shape and plane are right, the place along it is a placeholder. That reads as a
//     placeholder at a glance, which is the point — a plausible-looking wrong phase would not.
//  4. Where a phase IS knowable it is used. The craft anchored to Earth, Mars and Jupiter below
//     use the published J2000 mean anomalies of those planets, so their positions are real.
//
// Element shape matches data/parsers.js parseComets() exactly, so one `kepler` propagator eats
// both: {qKm, e, aKm, iRad, omRad, wRad, tpMs, epochMs, muKm3S2}. Sampled records carry
// {tMs, rKm:[x,y,z], vKmS:[vx,vy,vz]} in sun-inertial (heliocentric ecliptic J2000).

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const MU_SUN = 1.32712440018e11; // km^3/s^2
const DAY_MS = 86400000;

/** J2000.0 = 2000-01-01 12:00 TT. The epoch the planetary mean anomalies below are stated at. */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

const NO_CORS =
  "JPL's small-body and ephemeris APIs answer 200 with no Access-Control-Allow-Origin header " +
  'at all, so a browser cannot read them. Until the harvester runs, this is bundled data.';

// =================================================================================================
// Asteroids
// =================================================================================================
//
// a, e, i, node and argument of perihelion are the published osculating elements, rounded to the
// digits given — four to six significant figures, which is where my confidence ends. The mean
// anomaly is NOT known here (see honesty rule 3): each object is placed at its own perihelion at
// the epoch below and the card must say so.

const ASTEROID_EPOCH_MS = Date.UTC(2026, 0, 1);

/** @type {Array<{name,designation,aAu,e,iDeg,nodeDeg,argpDeg,hMag,diameterKm,neo,note,why?}>} */
const ASTEROIDS = [
  {
    id: 'asteroid-99942',
    name: 'Apophis',
    designation: '99942 Apophis',
    aAu: 0.9224,
    e: 0.1915,
    iDeg: 3.34,
    nodeDeg: 203.96,
    argpDeg: 126.72,
    hMag: 19.7,
    diameterKm: 0.34,
    neo: true,
    note: 'It passes inside the ring of geostationary satellites on 13 April 2029, and it will ' +
      'be visible to the naked eye from Europe and Africa.',
  },
  {
    id: 'asteroid-101955',
    name: 'Bennu',
    designation: '101955 Bennu',
    aAu: 1.1264,
    e: 0.2037,
    iDeg: 6.03,
    nodeDeg: 2.06,
    argpDeg: 66.22,
    hMag: 20.2,
    diameterKm: 0.49,
    neo: true,
    note: 'OSIRIS-REx brought 122 grams of it back to the Utah desert in September 2023.',
  },
  {
    id: 'asteroid-433',
    name: 'Eros',
    designation: '433 Eros',
    aAu: 1.4583,
    e: 0.2226,
    iDeg: 10.83,
    nodeDeg: 304.3,
    argpDeg: 178.8,
    // VERIFIED from JPL SBDB on 2026-09-06. The evidence is this comment: this repo is code
    // only, so a row that points at a docs/ file points at nothing a reader can open.
    hMag: 10.4,
    diameterKm: 16.84,
    neo: true,
    note: 'The first asteroid anything ever orbited, and then landed on: NEAR Shoemaker, 2001.',
  },
  {
    id: 'asteroid-162173',
    name: 'Ryugu',
    designation: '162173 Ryugu',
    aAu: 1.1896,
    e: 0.1902,
    iDeg: 5.88,
    nodeDeg: 251.6,
    argpDeg: 211.4,
    hMag: 19.2,
    diameterKm: 0.9,
    neo: true,
    note: 'Hayabusa2 shot it, landed on it twice and brought 5 grams home in 2020.',
  },
  {
    id: 'asteroid-1',
    name: 'Ceres',
    designation: '1 Ceres',
    aAu: 2.766,
    e: 0.0785,
    iDeg: 10.59,
    nodeDeg: 80.31,
    argpDeg: 73.6,
    hMag: 3.34,
    diameterKm: 939,
    neo: false,
    note: 'A quarter the width of the Moon, and the largest thing in the asteroid belt. It has ' +
      'more fresh water than Earth does, as ice.',
  },
  {
    id: 'asteroid-4',
    name: 'Vesta',
    designation: '4 Vesta',
    aAu: 2.3617,
    e: 0.0894,
    iDeg: 7.14,
    nodeDeg: 103.81,
    argpDeg: 151.2,
    hMag: 3.2,
    diameterKm: 525,
    neo: false,
    note: 'The only asteroid bright enough to see without a telescope, from a dark place.',
  },
  {
    id: 'asteroid-65803',
    name: 'Didymos',
    designation: '65803 Didymos',
    aAu: 1.6446,
    e: 0.3838,
    iDeg: 3.41,
    nodeDeg: 73.2,
    argpDeg: 319.3,
    hMag: 18.16,
    diameterKm: 0.78,
    neo: true,
    note: 'DART hit its small moon Dimorphos in 2022 and shortened its orbit by 32 minutes — ' +
      'the first time people moved another world.',
  },
  {
    id: 'asteroid-25143',
    name: 'Itokawa',
    designation: '25143 Itokawa',
    aAu: 1.324,
    e: 0.28,
    iDeg: 1.62,
    nodeDeg: 69.1,
    argpDeg: 162.8,
    hMag: 19.2,
    diameterKm: 0.33,
    neo: true,
    note: 'A rubble pile the shape of a peanut. Hayabusa returned about 1 500 grains of it in 2010.',
  },
  {
    id: 'asteroid-2',
    name: 'Pallas',
    designation: '2 Pallas',
    aAu: 2.772,
    e: 0.2299,
    iDeg: 34.84,
    nodeDeg: 172.9,
    argpDeg: 310.9,
    hMag: 4.13,
    diameterKm: 512,
    neo: false,
    note: 'Its orbit is tilted 35 degrees out of the plane everything else moves in, which is ' +
      'why no spacecraft has ever been sent.',
  },
  {
    id: 'asteroid-3200',
    name: 'Phaethon',
    designation: '3200 Phaethon',
    aAu: 1.2712,
    e: 0.8898,
    iDeg: 22.26,
    nodeDeg: 265.2,
    argpDeg: 322.2,
    hMag: 14.6,
    diameterKm: 5.8,
    neo: true,
    note: 'The Geminids come from this one. It swings closer to the Sun than Mercury does and ' +
      'sheds dust when it gets there.',
  },
];

/** @returns {Array<Object>} */
export function sampleAsteroids() {
  return ASTEROIDS.map((a) => {
    const aKm = a.aAu * AU_KM;
    const qKm = aKm * (1 - a.e);
    return {
      id: a.id,
      name: a.name,
      layer: 'asteroids',
      klass: 'asteroid',
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'sample',
      epoch: ASTEROID_EPOCH_MS,
      source: 'jpl-sbdb-neo',
      elements: {
        qKm,
        e: a.e,
        aKm,
        iRad: a.iDeg * DEG,
        omRad: a.nodeDeg * DEG,
        wRad: a.argpDeg * DEG,
        // Honesty rule 3: perihelion at the epoch, because the phase is not known here.
        tpMs: ASTEROID_EPOCH_MS,
        epochMs: ASTEROID_EPOCH_MS,
        muKm3S2: MU_SUN,
      },
      meta: {
        designation: a.designation,
        aAu: a.aAu,
        qAu: qKm / AU_KM,
        eccentricity: a.e,
        inclinationDeg: a.iDeg,
        nodeDeg: a.nodeDeg,
        argpDeg: a.argpDeg,
        periodDays: periodDays(aKm),
        absoluteMagnitude: a.hMag,
        diameterKm: a.diameterKm,
        neo: a.neo,
        note: a.note,
        approx: true,
        approxFields: ['tpMs', 'aAu', 'eccentricity', 'inclinationDeg', 'nodeDeg', 'argpDeg'],
        why:
          NO_CORS +
          ' The orbit here is the published one rounded to the figures shown, so its size, ' +
          'shape and tilt are right. Where it is ALONG that orbit is not known to this page: ' +
          'it is drawn at its closest point to the Sun on 1 January 2026, which is a ' +
          'placeholder, not a position.',
      },
    };
  });
}

// =================================================================================================
// Deep space
// =================================================================================================
//
// Two honest constructions, and each record says which one it used.
//
// (A) ANCHORED. A craft in orbit around a planet, or holding station at a Sun–Earth Lagrange
//     point, is drawn on that planet's own heliocentric orbit. The elements are the published
//     J2000 Keplerian set for the planet — mean anomaly included — so the position is genuinely
//     right to about an arcminute. The offset from the planet (1.5 million km to L2, 0.0004 au;
//     a Mars orbit, 0.00002 au) is smaller than the dot that draws it.
//
// (B) STRAIGHT LINE. A craft far outside the planets is drawn from a distance, a speed and an
//     escape direction, all rounded, moving in a straight line. At 60 au the Sun bends the path
//     by well under a degree a decade, so the line is the honest shape. The three numbers are
//     stated in meta and each is soft.

/** Published J2000 elements (JPL's approximate-positions table). L and varpi reduced to M and w. */
const ANCHORS = {
  earth: {
    aAu: 1.00000261,
    e: 0.01671123,
    iDeg: 0.0,
    nodeDeg: 0.0,
    argpDeg: 102.93768,
    m0Deg: 357.52689,
    label: "Earth's orbit",
    // MEASURED against astronomy-engine for 2026-09-06: this element set puts the record
    // 1.13 million km from Earth's true position — the same order as the 1.5 million km to a
    // Lagrange point, so the construction is as good as the thing it stands in for.
    driftNote: 'about a million kilometres, which is the same order as the distance to L1 and L2',
  },
  mars: {
    aAu: 1.52371034,
    e: 0.0933941,
    iDeg: 1.84969142,
    nodeDeg: 49.55953891,
    argpDeg: 286.49683,
    m0Deg: 19.3902,
    label: "Mars's orbit",
    // MEASURED against astronomy-engine for 2026-09-06: 0.013 au (1.9 million km) from Mars.
    driftNote: 'a couple of million kilometres, about half a degree around its orbit',
  },
  jupiter: {
    aAu: 5.202887,
    e: 0.04838624,
    iDeg: 1.30439695,
    nodeDeg: 100.47390909,
    argpDeg: 274.25457,
    m0Deg: 19.66796,
    label: "Jupiter's orbit",
    // MEASURED against astronomy-engine for 2026-09-06: 0.065 au from Jupiter.
    driftNote: 'about ten million kilometres, well under a degree around its orbit',
  },
};

const ANCHORED_CRAFT = [
  {
    id: 'deep-jwst',
    name: 'James Webb Space Telescope',
    klass: 'telescope',
    horizonsId: -170,
    anchor: 'earth',
    note: 'A 6.5-metre gold mirror behind a sunshield the size of a tennis court, kept in the ' +
      'dark 1.5 million km behind Earth.',
    offset: 'It orbits the Sun–Earth L2 point, 1.5 million km beyond Earth — one hundredth of ' +
      "the way to the Sun. It is drawn here on Earth's orbit; the offset is smaller than the dot.",
  },
  {
    id: 'deep-gaia',
    name: 'Gaia',
    klass: 'telescope',
    horizonsId: null,
    anchor: 'earth',
    note: 'It measured the positions and motions of about two billion stars — including the ' +
      'ones this app draws behind everything else.',
    offset: 'Also at Sun–Earth L2, and drawn the same way. Gaia stopped observing in 2025; its ' +
      'catalogue did not.',
  },
  {
    id: 'deep-soho',
    name: 'SOHO',
    klass: 'telescope',
    horizonsId: -21,
    anchor: 'earth',
    note: 'It has watched the Sun without a break since 1995, and has found more than 5 000 ' +
      'comets falling into it along the way.',
    offset: 'It orbits the Sun–Earth L1 point, 1.5 million km SUNWARD of Earth. Drawn on ' +
      "Earth's orbit; the offset is smaller than the dot.",
  },
  {
    id: 'deep-mro',
    name: 'Mars Reconnaissance Orbiter',
    klass: 'probe',
    horizonsId: -74,
    anchor: 'mars',
    note: 'Its HiRISE camera can see something the size of a dinner table on Mars, and it ' +
      'relays most of what the rovers say.',
    offset: 'It orbits Mars at about 300 km. At solar-system scale that is drawn as Mars.',
  },
  {
    id: 'deep-juno',
    name: 'Juno',
    klass: 'probe',
    horizonsId: -61,
    anchor: 'jupiter',
    note: 'It dives between Jupiter and its radiation belts every 38 days, closer to the cloud ' +
      'tops than anything has been.',
    offset: 'It orbits Jupiter on a long ellipse. At solar-system scale that is drawn as Jupiter.',
  },
];

/**
 * distanceAu, speedKmS and the escape direction (heliocentric ecliptic J2000) are the published
 * figures, rounded. Direction is the escape asymptote and is good to a few degrees.
 */
const CRUISING_CRAFT = [
  {
    id: 'deep-voyager-1',
    name: 'Voyager 1',
    klass: 'probe',
    horizonsId: -31,
    // MEASURED, and the evidence is here because this repo is code only and has no docs/ to
    // point at. JPL Horizons, COMMAND='-31', CENTER='500@10', 2026-09-07 00:00 TDB:
    // X=-32.13433, Y=-136.63593, Z=+98.85895 au -> r = 171.68 au. The row said 168 and cited a
    // check on 2026-09-06; 3.7 au is about a year of Voyager 1's travel, so the number was a
    // reading roughly a year older than the date beside it.
    distanceAu: 171.7,
    distanceMeasured: true,
    speedKmS: 17.0,
    lonDeg: 255,
    latDeg: 35,
    note: 'The most distant thing people have made. It left the Sun’s bubble in 2012 and ' +
      'its radio signal takes about 23 hours to get here.',
  },
  {
    id: 'deep-voyager-2',
    name: 'Voyager 2',
    klass: 'probe',
    horizonsId: -32,
    // Same query, COMMAND='-32': X=+39.83201, Y=-105.33488, Z=-89.54645 au -> r = 143.88 au.
    distanceAu: 143.9,
    distanceMeasured: true,
    speedKmS: 15.4,
    lonDeg: 290,
    latDeg: -34,
    note: 'The only spacecraft to have visited Uranus and Neptune, and it did both on the way ' +
      'out. It is leaving below the plane of the planets.',
  },
  {
    id: 'deep-new-horizons',
    name: 'New Horizons',
    klass: 'probe',
    horizonsId: -98,
    // Same query, COMMAND='-98': X=+20.77359, Y=-62.10272, Z=+2.28371 au -> r = 65.52 au.
    distanceAu: 65.5,
    distanceMeasured: true,
    speedKmS: 13.6,
    lonDeg: 293,
    latDeg: -2,
    note: 'It crossed Pluto in nine hours in 2015 after nine years of falling towards it, and ' +
      'is still sending back what it saw of a Kuiper belt rock called Arrokoth.',
  },
];

/** Orbits given as elements where I am confident of the shape but not of the phase. */
const ELLIPTIC_CRAFT = [
  {
    id: 'deep-parker',
    name: 'Parker Solar Probe',
    klass: 'probe',
    horizonsId: -96,
    aAu: 0.388,
    e: 0.88,
    iDeg: 3.4,
    nodeDeg: 244,
    argpDeg: 268,
    note: 'It flies through the Sun’s outer atmosphere at 690 000 km/h behind a carbon ' +
      'heat shield, closer to the Sun than anything has ever been.',
    phaseKnown: false,
  },
  {
    id: 'deep-solar-orbiter',
    name: 'Solar Orbiter',
    klass: 'probe',
    horizonsId: null,
    aAu: 0.81,
    e: 0.29,
    iDeg: 17,
    nodeDeg: 4,
    argpDeg: 300,
    note: 'It uses Venus to lever itself out of the plane of the planets, so it can photograph ' +
      'the Sun’s poles — which nothing had seen until 2025.',
    phaseKnown: false,
  },
];

/** @returns {Array<Object>} */
export function sampleDeepSpace() {
  const out = [];

  for (const c of ANCHORED_CRAFT) {
    const anchor = ANCHORS[c.anchor];
    const aKm = anchor.aAu * AU_KM;
    out.push({
      id: c.id,
      name: c.name,
      layer: 'deep-space',
      klass: c.klass,
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'sample',
      epoch: J2000_MS,
      source: 'horizons-deep-space',
      elements: {
        qKm: aKm * (1 - anchor.e),
        e: anchor.e,
        aKm,
        iRad: anchor.iDeg * DEG,
        omRad: anchor.nodeDeg * DEG,
        wRad: anchor.argpDeg * DEG,
        tpMs: tpFromMeanAnomaly(aKm, anchor.m0Deg * DEG, J2000_MS),
        epochMs: J2000_MS,
        muKm3S2: MU_SUN,
      },
      meta: {
        horizonsId: c.horizonsId,
        construction: 'anchored',
        anchor: anchor.label,
        note: c.note,
        periodDays: periodDays(aKm),
        approx: true,
        anchorDrift: anchor.driftNote,
        approxFields: ['position offset from ' + anchor.label],
        why: NO_CORS + ' ' + c.offset + ' The orbit itself is the published J2000 element set ' +
          'for ' + anchor.label + ', mean anomaly included, so the place along it is real to ' +
          'within ' + anchor.driftNote + '.',
      },
    });
  }

  for (const c of CRUISING_CRAFT) {
    const dirKm = directionUnit(c.lonDeg * DEG, c.latDeg * DEG);
    const rKm = dirKm.map((u) => round(u * c.distanceAu * AU_KM, 4));
    const vKmS = dirKm.map((u) => round(u * c.speedKmS, 4));
    // Straight line through the measured point. At these distances the Sun's pull changes the
    // direction by well under a degree a decade, so a line is the honest shape.
    //
    // The knots sit TWENTY YEARS either side of it, not 180 days. propagate/sampled.js stops
    // answering more than 7 days outside a record's sample range, so a 180-day span meant these
    // three craft would silently stop being drawn in March 2027 — measured, they returned null.
    // Cubic Hermite between two knots with equal, collinear velocities is exactly the straight
    // line, so widening the span changes no drawn position: it only stops the cliff.
    const t0 = Date.UTC(2026, 8, 6);
    const span = 20 * 365.25 * DAY_MS;
    const t1 = t0 + span;
    const tBack = t0 - span;
    const dt = (t1 - t0) / 1000;
    const dtBack = (tBack - t0) / 1000;
    out.push({
      id: c.id,
      name: c.name,
      layer: 'deep-space',
      klass: c.klass,
      propagator: 'sampled',
      frame: 'sun-inertial',
      cls: 'sample',
      epoch: t0,
      source: 'horizons-deep-space',
      samples: [
        // The outer knots are NOT rounded: they are derived from the two rounded figures above,
        // and rounding them again would bend the line by the rounding step.
        { tMs: tBack, rKm: rKm.map((v, i) => v + vKmS[i] * dtBack), vKmS },
        { tMs: t0, rKm, vKmS },
        { tMs: t1, rKm: rKm.map((v, i) => v + vKmS[i] * dt), vKmS },
      ],
      meta: {
        horizonsId: c.horizonsId,
        construction: 'straight-line',
        distanceAu: c.distanceAu,
        speedKmS: c.speedKmS,
        escapeLonDeg: c.lonDeg,
        escapeLatDeg: c.latDeg,
        note: c.note,
        approx: true,
        approxFields: c.distanceMeasured
          ? ['escapeLonDeg', 'escapeLatDeg', 'speedKmS']
          : ['distanceAu', 'escapeLonDeg', 'escapeLatDeg', 'speedKmS'],
        why:
          NO_CORS +
          ' This one is built from three numbers: ' +
          c.distanceAu +
          ' au from the Sun' +
          (c.distanceMeasured
            ? ' (checked against JPL Horizons on 7 September 2026)'
            : ' (the published figure, rounded)') +
          ', ' +
          c.speedKmS +
          ' km/s, and an escape direction good to a few degrees. It then moves in a straight ' +
          'line, which at this distance is what it really does.',
      },
    });
  }

  for (const c of ELLIPTIC_CRAFT) {
    const aKm = c.aAu * AU_KM;
    const epoch = Date.UTC(2026, 0, 1);
    out.push({
      id: c.id,
      name: c.name,
      layer: 'deep-space',
      klass: c.klass,
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'sample',
      epoch,
      source: 'horizons-deep-space',
      elements: {
        qKm: aKm * (1 - c.e),
        e: c.e,
        aKm,
        iRad: c.iDeg * DEG,
        omRad: c.nodeDeg * DEG,
        wRad: c.argpDeg * DEG,
        tpMs: epoch,
        epochMs: epoch,
        muKm3S2: MU_SUN,
      },
      meta: {
        horizonsId: c.horizonsId,
        construction: 'elements-without-phase',
        aAu: c.aAu,
        eccentricity: c.e,
        inclinationDeg: c.iDeg,
        periodDays: periodDays(aKm),
        note: c.note,
        approx: true,
        approxFields: ['tpMs', 'aAu', 'eccentricity', 'inclinationDeg', 'nodeDeg', 'argpDeg'],
        why:
          NO_CORS +
          ' The orbit is the published one rounded, so its size, shape and tilt are right. ' +
          'The place along it is not known to this page: it is drawn at its closest point to ' +
          'the Sun on 1 January 2026. Its year is only ' +
          Math.round(periodDays(aKm)) +
          ' days, so treat the dot as a placeholder and the ellipse as the fact.',
      },
    });
  }

  return out;
}

// =================================================================================================
// Reentries
// =================================================================================================
//
// Space-Track's `tip` feed is the only public source of reentry windows and it needs a login,
// which a public page cannot hold. So rather than invent a live window, these are three REAL
// reentries that already happened, with the times and places they actually came down. A card
// built on one of these is true; it is just not news.

const REENTRIES = [
  {
    id: 'reentry-tiangong-1',
    name: 'Tiangong-1',
    noradId: 37820,
    reentryIso: '2018-04-02T00:16:00Z',
    windowHours: 2,
    latDeg: -13.6,
    lonDeg: -164.3, // 195.7 E, i.e. 164.3 W — the South Pacific, north-west of Tahiti
    note: "China's first space station. Control was lost in 2016 and it came down over the " +
      'South Pacific two years later; most of it burned, and nothing was reported found.',
  },
  {
    id: 'reentry-cz-5b-y2',
    name: 'Long March 5B core stage (CZ-5B Y2)',
    noradId: 48275,
    reentryIso: '2021-05-08T02:24:00Z',
    windowHours: 2,
    latDeg: 2.65,
    lonDeg: 72.47, // just west of the Maldives
    note: 'A 23-tonne rocket stage left in orbit rather than steered down. It fell into the ' +
      'Indian Ocean near the Maldives, and the argument about uncontrolled reentries has not ' +
      'really stopped since.',
  },
  {
    id: 'reentry-skylab',
    name: 'Skylab',
    noradId: 7816,
    reentryIso: '1979-07-11T16:37:00Z',
    windowHours: 4,
    latDeg: -33.9,
    lonDeg: 121.9, // the debris field around Esperance, Western Australia
    note: "America's first space station. Pieces of it landed in Western Australia, and the " +
      'shire of Esperance fined NASA 400 dollars for littering.',
  },
];

/** @returns {Array<Object>} */
export function sampleReentries() {
  return REENTRIES.map((r) => {
    const tMs = Date.parse(r.reentryIso);
    const half = (r.windowHours / 2) * 3600 * 1000;
    return {
      id: r.id,
      name: r.name,
      layer: 'reentries',
      klass: 'debris',
      propagator: 'fixed',
      frame: 'earth-fixed',
      cls: 'sample',
      epoch: tMs,
      source: 'space-track-tip',
      // The point it is understood to have broken up, at the altitude that usually happens.
      fixed: { latRad: r.latDeg * DEG, lonRad: normLon(r.lonDeg) * DEG, altKm: 80 },
      meta: {
        noradId: r.noradId,
        reentryMs: tMs,
        windowStartMs: tMs - half,
        windowEndMs: tMs + half,
        latDeg: r.latDeg,
        lonDeg: normLon(r.lonDeg),
        altKm: 80,
        note: r.note,
        historic: true,
        approx: true,
        approxFields: ['latDeg', 'lonDeg', 'windowStartMs', 'windowEndMs'],
        why:
          'Space-Track is the only public source of reentry windows and it needs a login, ' +
          'which a page open to everybody cannot hold. So this is not a prediction: it is a ' +
          'reentry that really happened, on the date shown, near the place shown. The time is ' +
          'the published one; the point is where it is understood to have broken up, to within ' +
          'a few hundred kilometres, because a reentry track is long.',
      },
    };
  });
}

// =================================================================================================
// helpers
// =================================================================================================

function periodDays(aKm) {
  if (!Number.isFinite(aKm) || aKm <= 0) return null;
  return (2 * Math.PI * Math.sqrt((aKm * aKm * aKm) / MU_SUN)) / 86400;
}

/** Time of perihelion passage implied by a mean anomaly at an epoch. */
function tpFromMeanAnomaly(aKm, mRad, epochMs) {
  const n = Math.sqrt(MU_SUN / (aKm * aKm * aKm)); // rad/s
  let m = mRad % (2 * Math.PI);
  if (m < 0) m += 2 * Math.PI;
  return Math.round(epochMs - (m / n) * 1000);
}

/** Heliocentric ecliptic J2000 unit vector from an ecliptic longitude and latitude. */
function directionUnit(lonRad, latRad) {
  const c = Math.cos(latRad);
  return [c * Math.cos(lonRad), c * Math.sin(lonRad), Math.sin(latRad)];
}

function round(v, sig) {
  if (!Number.isFinite(v) || v === 0) return v;
  const mag = Math.ceil(Math.log10(Math.abs(v)));
  const f = Math.pow(10, sig - mag);
  return Math.round(v * f) / f;
}

function normLon(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * The ground and surface sites nothing serves as an API: the Deep Space Network's big dishes, the
 * Apollo landing sites, the rovers on Mars. Ported from `registry/sites.yaml`, which is the
 * reviewable copy; this is the one the browser reads.
 *
 * These are `measured`, NOT `sample`. A dish does not move and its coordinates are published --
 * hand-kept is a statement about where the data comes from, not about how sure we are of it. The
 * distinction matters because `sample` is drawn with a dashed halo meaning "not a live position",
 * and that would be wrong here.
 *
 * @returns {Array<Object>} 11 records
 */
export function handKeptSites() {
  return [
  {
    id: 'dss-14',
    name: 'Goldstone DSS-14',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'earth-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 35.426, lonDeg: -116.89, altKm: 1.001 },
    meta: {
      siteKind: 'dish',
      world: 'earth',
      doing: 'The 70-metre dish at Goldstone, California.',
      diameterM: 70,
      latDeg: 35.426,
      lonDeg: -116.89,
    },
  },
  {
    id: 'dss-25',
    name: 'Goldstone DSS-25',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'earth-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 35.3376, lonDeg: -116.8747, altKm: 0.960 },
    meta: {
      siteKind: 'dish',
      world: 'earth',
      doing: 'A 34-metre dish at Goldstone.',
      diameterM: 34,
      latDeg: 35.3376,
      lonDeg: -116.8747,
    },
  },
  {
    id: 'dss-43',
    name: 'Canberra DSS-43',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'earth-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: -35.4022, lonDeg: 148.9812, altKm: 0.689 },
    meta: {
      siteKind: 'dish',
      world: 'earth',
      doing: 'The only dish that can still send commands to Voyager 2.',
      diameterM: 70,
      latDeg: -35.4022,
      lonDeg: 148.9812,
    },
  },
  {
    id: 'dss-63',
    name: 'Madrid DSS-63',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'earth-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 40.2414, lonDeg: -4.248, altKm: 0.865 },
    meta: {
      siteKind: 'dish',
      world: 'earth',
      doing: 'The 70-metre dish outside Madrid.',
      diameterM: 70,
      latDeg: 40.2414,
      lonDeg: -4.248,
    },
  },
  {
    id: 'apollo-11',
    name: 'Apollo 11 landing site',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'moon-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 0.6741, lonDeg: 23.473, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'moon',
      doing: 'Where people first stood on another world, in July 1969. The descent stage is still there.',
      latDeg: 0.6741,
      lonDeg: 23.473,
    },
  },
  {
    id: 'apollo-14',
    name: 'Apollo 14 landing site',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'moon-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: -3.64589, lonDeg: 342.52806, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'moon',
      doing: 'Fra Mauro, February 1971. Alan Shepard hit two golf balls here and they are still lying where they stopped.',
      latDeg: -3.64589,
      lonDeg: 342.52806,
    },
  },
  {
    id: 'apollo-16',
    name: 'Apollo 16 landing site',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'moon-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: -8.9734, lonDeg: 15.5011, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'moon',
      doing: 'Descartes, April 1972. Charlie Duke left a photograph of his family face-up in the dust beside the lander.',
      latDeg: -8.9734,
      lonDeg: 15.5011,
    },
  },
  {
    id: 'apollo-17',
    name: 'Apollo 17 landing site',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'moon-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 20.1908, lonDeg: 30.7717, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'moon',
      doing: 'The last place people have stood on another world, in December 1972.',
      latDeg: 20.1908,
      lonDeg: 30.7717,
    },
  },
  {
    id: 'change-4',
    name: "Chang'e 4",
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'moon-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: -45.4446, lonDeg: 177.5991, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'moon',
      doing: 'The first landing on the far side of the Moon, in 2019.',
      latDeg: -45.4446,
      lonDeg: 177.5991,
    },
  },
  {
    id: 'jezero',
    name: 'Perseverance, Jezero crater',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'mars-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 18.4447, lonDeg: 77.4508, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'mars',
      doing: 'A rover the size of a car, collecting rock samples in a crater that was once a river delta.',
      latDeg: 18.4447,
      lonDeg: 77.4508,
    },
  },
  {
    id: 'gale',
    name: 'Curiosity, Gale crater',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'mars-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: -4.5895, lonDeg: 137.4417, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'mars',
      doing: 'Driving up a mountain of layered rock since 2012.',
      latDeg: -4.5895,
      lonDeg: 137.4417,
    },
  },
  {
    id: 'elysium',
    name: 'InSight, Elysium Planitia',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'mars-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 4.5024, lonDeg: 135.6234, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'mars',
      doing: 'Listened to marsquakes until its solar panels were covered in dust in 2022.',
      latDeg: 4.5024,
      lonDeg: 135.6234,
    },
  },
  {
    id: 'utopia',
    name: 'Zhurong, Utopia Planitia',
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    frame: 'mars-fixed',
    // MEASURED, not sample: a dish does not move and its coordinates are published. It is
    // hand-kept because no API serves it, which is a different thing from being uncertain.
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: 25.066, lonDeg: 109.926, altKm: 0.000 },
    meta: {
      siteKind: 'surface',
      world: 'mars',
      doing: "China's first Mars rover, landed in 2021.",
      latDeg: 25.066,
      lonDeg: 109.926,
    },
  },
  ];
}

// =================================================================================================
// Odd things we sent
// =================================================================================================
//
// registry/oddities.yaml -> records, hand-written here for the same reason data/rocketmatch.js is
// hand-written next to the generated data/rockets.js: generated data and code never share a file,
// so `gen_oddities_js.py --check` is a plain comparison with nothing to preserve.
//
// THESE ARE NOT `sample` RECORDS. `sample` means a bundled stand-in for a live feed a browser
// cannot call, and it draws with a dashed halo saying "not a live position". These rows are not
// standing in for anything -- they ARE the thing, the same distinction handKeptSites() makes about
// the Goldstone dish. Each record carries the row's own `position_class` as its cls.
//
// THREE THINGS THIS EMITTER DOES THAT THE NEXT READER WILL WANT TO "FIX":
//
//  1. THE TWO EPOCHS. `record.epoch` is the row's `evidence_epoch` -- when anybody last LOOKED --
//     and `elements.epochMs` is the osculating epoch the propagator integrates from. For the
//     Roadster they are eight and a half years apart. cards.js prints the age of record.epoch, so
//     setting it to the osculating epoch would print "elements 0 days old", which is true of the
//     arithmetic and a lie about the knowledge. check_registry.py refuses an in_orbit row with no
//     evidence_epoch for exactly this reason.
//
//  2. AN `attached` ROW IS NOT A RECORD. The Golden Record at Voyager 1's exact position would be
//     a second dot under the first: ambiguous to tap (main.js takes the first hit in layer order)
//     and, if it carried a horizons_id, a second Voyager drawn beside the first
//     (scene/realmodels.js matches on that id). It is drawn as a CHILD of its carrier's model
//     instead, and reached from the carrier's card; data/attached.js owns that, including the
//     rule that its position is the carrier's copied verbatim. The layer's count line says how
//     many rows those are rather than quietly omitting them.
//
//  3. AN `unknown` ROW GETS NO PROPAGATOR AT ALL. `propagate()` returns null for a record whose
//     propagator is not in its table, so the glyph layer skips it, heroes.js skips it and the
//     camera has nothing to fly to -- which is the point. It is still a record, so search finds
//     it and the card opens and says, in words, that nobody knows where it is. A dot would have
//     been a guess, and every other layer on this map has taught the visitor that a dot is a claim.

import { ODDITIES } from './oddities.js';

/** JD -> ms. 2440587.5 is the Julian Date of the Unix epoch. */
function jdToMs(jd) {
  return (jd - 2440587.5) * DAY_MS;
}

/** The evidence date as ms, or null. `2018-03-19` is a YAML date and arrives as a string. */
function evidenceMs(value) {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Everything the card needs that is true of every row, whatever kind of place it is in. */
function commonMeta(row) {
  const shape = row.shape || {};
  const kind = row.where ? row.where.kind : null;
  // A ROW NOBODY CAN PLACE IS NOT DRAWN, so it says nothing about a drawing. `unknown` gets no
  // propagator (note 3 above), which means no dot, no model and nothing for the card to describe
  // -- and "drawn as a generic object; we have no shape for a lapel pin" under a card with no
  // position would be the card describing a shape that is not on the screen. The registry refuses
  // any build but `generic` on such a row; this is the other half of the same rule.
  const drawn = kind !== 'unknown';
  return {
    fact: row.fact,
    myths: Array.isArray(row.myths) ? row.myths : [],
    cite: row.cite || null,
    asOf: row.as_of || null,
    whereKind: kind,
    drawnName: shape.drawn_name || null,
    // Which ODDITY_BUILDERS row scene/models.js draws, and what the card is allowed to claim
    // about it. `drawsAs` is the row's own `stands_for`, so the card repeats the registry rather
    // than guessing: `variant` published dimensions, `family` the kind of thing, `generic` we
    // have no shape. `departure` is where the drawing knowingly differs and says so.
    modelVariant: drawn ? shape.build || 'generic' : null,
    drawsAs: drawn ? shape.stands_for || 'generic' : null,
    departure: drawn ? shape.departure || null : null,
    // Which way the shape points, when the row says. Absent is the default and reproduces what
    // scene/models.js does today: a constant seeded from the record id. The surface branches
    // below overwrite this with `up`, and check_registry.py refuses the field on those rows so
    // the two can never disagree.
    attitude: drawn ? shape.attitude || null : null,
  };
}

/**
 * The layer's records. Six of the eight rows; see note 2 above for the two that are not here.
 * @returns {Array<Object>}
 */
export function sampleOddities() {
  const out = [];
  for (const row of ODDITIES) {
    const w = row.where || {};
    const base = {
      id: row.id,
      name: row.display,
      layer: 'oddities',
      klass: row.klass || 'oddity',
      source: 'registry/oddities.yaml',
      epoch: null,
      meta: commonMeta(row),
    };

    if (w.kind === 'in_orbit') {
      const el = w.elements || {};
      const aKm = el.a_au * AU_KM;
      const prov = row.orbit_provenance || {};
      out.push({
        ...base,
        propagator: 'kepler',
        frame: w.frame || 'sun-inertial',
        cls: row.position_class,
        // (1) above: the age the card prints is the age of the EVIDENCE.
        epoch: evidenceMs(w.evidence_epoch),
        elements: {
          qKm: aKm * (1 - el.e),
          e: el.e,
          aKm,
          iRad: el.i_deg * DEG,
          omRad: el.node_deg * DEG,
          wRad: el.argp_deg * DEG,
          // The phase is PUBLISHED for this one, so it is real and not the placeholder honesty
          // rule 3 describes: no `approx` flag and no "drawn at perihelion" apology.
          tpMs: jdToMs(el.tp_jd),
          epochMs: jdToMs(el.epoch_jd),
          muKm3S2: MU_SUN,
        },
        meta: {
          ...base.meta,
          horizonsId: w.horizons_id || null,
          aAu: el.a_au,
          eccentricity: el.e,
          inclinationDeg: el.i_deg,
          periodDays: periodDays(aKm),
          arcEnd: w.evidence_epoch ? String(w.evidence_epoch) : null,
          obsCount: prov.obs_count ?? null,
          arc: prov.arc || null,
          orbitCaveat: prov.caveat || null,
          solution: prov.solution || null,
        },
      });
      continue;
    }

    if (w.kind === 'on_surface') {
      const obj = w.object || {};
      const anchor = w.anchor || null;
      const latDeg = anchor ? anchor.lat : obj.lat;
      const lonDeg = anchor ? anchor.lon : obj.lon;
      out.push({
        ...base,
        propagator: 'fixed',
        frame: `${w.world}-fixed`,
        cls: row.position_class,
        fixed: { latDeg, lonDeg, altKm: 0 },
        meta: {
          ...base.meta,
          world: w.world,
          latDeg,
          lonDeg,
          // A photograph lying in lunar dust stands on a surface, so the model does too.
          // scene/models.js updateModelAttitude() reads this and puts +Y away from the centre;
          // without it an oddity would take the class default, which is the seeded constant a
          // tumbling car wants and a print lying flat does not.
          attitude: 'up',
          // The two numbers, kept apart all the way to the card. One field would have to choose
          // between 0.4 m and 40 m, and either choice is false.
          anchorName: anchor ? anchor.of : null,
          anchorUncertaintyM: anchor ? anchor.uncertainty_m : null,
          objectPrecisionM: obj.precision_m ?? null,
          objectHow: obj.how || null,
        },
      });
      continue;
    }

    if (w.kind === 'came_home') {
      out.push({
        ...base,
        propagator: 'fixed',
        frame: 'earth-fixed',
        cls: row.position_class,
        fixed: { latDeg: w.lat, lonDeg: w.lon, altKm: 0 },
        meta: {
          ...base.meta,
          world: 'earth',
          latDeg: w.lat,
          lonDeg: w.lon,
          attitude: 'up',   // a museum case stands on the ground, like every other fixed record
          whereKept: w.where_kept || null,
          leftSpace: w.left_space ? String(w.left_space) : null,
        },
      });
      continue;
    }

    if (w.kind === 'unknown') {
      out.push({
        ...base,
        // (3) above. No propagator, so propagate() answers null and nothing is drawn.
        propagator: null,
        frame: null,
        cls: row.position_class,
        meta: {
          ...base.meta,
          unplaceable: true,
          lastKnown: w.last_known || null,
          whyUnknown: w.why_unknown || null,
          wouldNeed: w.would_need || null,
        },
      });
      continue;
    }

    // `attached` falls through deliberately -- see note 2. Any other kind is refused by
    // check_registry.py before it reaches here, so there is nothing to guess about.
  }
  return out;
}

// How many rows are riding on a spacecraft the app draws rather than carrying their own dot.
// Re-exported rather than recomputed: data/attached.js owns the attached rows now that they are
// drawn, and two filters over the same registry would be two places to forget a kind.
export { attachedOddityCount } from './attached.js';
