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
// Three builders here are NOT stand-ins and say so in their own cls: handKeptSites() (measured),
// sampleOddities() (each row's own class) and farBodies() (inferred: JPL's orbits with their real
// phase, the far-bodies layer). They live in this file because it is where hand-kept rows that
// ship with the app already are.
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
//  4. Where a phase IS knowable it is used. The craft anchored to Earth below use Earth's
//     published J2000 mean anomaly, so their positions are real; the craft orbiting other worlds
//     start from JPL's own position for them (deep space, construction D).
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

// Shown on the card of every deep-space craft and sample asteroid, JWST and Voyager among them. It used
// to say "answer 200 with no Access-Control-Allow-Origin header" and "until the harvester runs": true,
// and written for whoever built the app. The term stays, in brackets, for anyone who wants to look
// it up.
const NO_CORS =
  "NASA's JPL servers do not let a page on another website read them (they send no CORS header), " +
  'so this browser cannot fetch them. Until our own server copies them, this is data shipped with the app.';

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
  // CERES MOVED OUT on 2026-09-22, to FAR_BODIES below. Here it sat at its own perihelion (rule 3)
  // and only on the day the NEO snapshot was missing -- the live close-approach table never lists
  // it, so on a normal day the largest thing in the asteroid belt was on nobody's map. There it has
  // JPL's real phase and a layer that is always loaded.
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
// Dwarf planets and far travellers
// =================================================================================================
//
// Eight dwarf planets and the two objects known to have come from another star, each on JPL's own
// orbit WITH ITS PHASE, so each is drawn where it is today. That is the difference from the
// asteroids above, and why these are not rows there: those sit at a placeholder perihelion (rule
// 3), carry cls 'sample', and appear only when the NEO snapshot is missing. These stand in for
// nothing -- like the oddities, they are the thing -- so they get their own always-loaded layer
// (`far-bodies` in data/layers.js and registry/layers.yaml) and cls 'inferred', exactly as a live
// SBDB record is: JPL measured the orbit, this page computes the position from it.
//
// THE EVIDENCE IS THIS BLOCK, as it is for Eros above: this repository is code only.
//   Elements   JPL Small-Body Database API, one query per row:
//                https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=<number or designation>&phys-par=1&full-prec=1
//              (read 2026-09-22). Heliocentric ecliptic J2000 osculating elements, kept to nine
//              significant figures -- JPL's fit, not a rounding of mine, so rule 1's worry about
//              undefendable digits does not apply; nine is where the position stops changing at
//              the scale anything here is drawn. Each row names its epoch, the date JPL solved the
//              orbit, and the last observation in the fit.
//   Checked    against JPL Horizons, heliocentric vectors for 2026-09-22 00:00 TDB
//              (https://ssd.jpl.nasa.gov/api/horizons.api?COMMAND='136199;'&EPHEM_TYPE=VECTORS&CENTER='500@10'&REF_PLANE=ECLIPTIC
//              and the same for each row). Two-body motion from these elements lands within
//              0.0001 au of Horizons for all eight dwarf planets. The two interstellar objects miss
//              by 0.028 au ('Oumuamua) and 0.018 au (Borisov): nine and seven years of pull from the
//              planets and of the small non-gravitational push both showed, which two-body motion
//              leaves out -- a few million km, at 50 au. tests/test_far_bodies.mjs holds all ten.
//   Facts      diameters, moons and each `why` line: the Wikipedia article named in `whySource`,
//              its infobox and lead (read 2026-09-22), except Ceres's diameter, which is the SBDB's
//              own (Park et al. 2016, Nature 537). "Dwarf planet" for all eight is Wikipedia's
//              "Dwarf planet" lead: astronomers are in general agreement that the nine largest
//              candidates are dwarf planets, and these are eight of the nine -- Pluto, the ninth, is
//              a world in registry/worlds.yaml, not a row here.
//   Hyperbolic 'Oumuamua (e 1.20) and Borisov (e 3.36) are not bound to the Sun. propagate/kepler.js
//              has solved the hyperbolic branch since the MPC comets needed it (safeguarded Newton,
//              solveKeplerHyperbolic); both rows use the mean-anomaly form JPL publishes, which the
//              normaliser there turns into time since perihelion on either branch.

/** JPL's epoch for every dwarf-planet row: JD 2461200.5 = 2026-06-09 00:00 TDB. */
const SBDB_EPOCH_JD = 2461200.5;

/**
 * @type {Array<{id, name, designation, aliases, klass, farKind, aAu, e, iDeg, nodeDeg, argpDeg,
 *   maDeg, epochJd, tpJd, solution, lastObs, hMag, diameterKm, diameterLowKm?, diameterHighKm?,
 *   moons, why, whySource, departure?, orbitCaveat?}>}
 */
const FAR_BODIES = [
  {
    id: 'dwarf-ceres',
    name: 'Ceres',
    designation: '1 Ceres',
    aliases: ['1 Ceres', '(1) Ceres', 'A801 AA', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=1. Solved 2021-04-13, observations 1995-01-05 to 2021-01-28, re-osculated by JPL to
    // the current epoch.
    aAu: 2.7655526, e: 0.0796922951, iDeg: 10.5880278, nodeDeg: 80.2486268, argpDeg: 73.2942145,
    maDeg: 274.419346, epochJd: SBDB_EPOCH_JD, tpJd: 2461599.8415,
    solution: '2021-04-13', lastObs: '2021-01-28',
    hMag: 3.34,
    diameterKm: 939.4, // SBDB phys-par: Park et al. 2016, Nature 537, 515
    moons: [], // "the largest without a moon" (Wikipedia, Ceres)
    why: 'The largest thing in the asteroid belt, a quarter the width of the Moon. NASA’s Dawn went ' +
      'into orbit around it in 2015 and is still there, switched off.',
    whySource: 'Wikipedia, Ceres (dwarf planet), read 22 September 2026',
  },
  {
    id: 'dwarf-eris',
    name: 'Eris',
    designation: '136199 Eris',
    // "Xena" is the discoverers' nickname before the name, in the article's infobox.
    aliases: ['136199', '136199 Eris', '2003 UB313', 'Xena', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=136199. Solved 2026-06-06, observations 1954-09-03 to 2026-02-06.
    aAu: 67.9339469, e: 0.438238535, iDeg: 43.9258279, nodeDeg: 36.0047704, argpDeg: 150.794924,
    maDeg: 211.774434, epochJd: SBDB_EPOCH_JD, tpJd: 2545407.7168,
    solution: '2026-06-06', lastObs: '2026-02-06',
    hMag: -1.26,
    diameterKm: 2326,
    moons: ['Dysnomia'],
    why: 'It is 27% more massive than Pluto, though slightly smaller. Finding it in 2005 is what ' +
      'pushed astronomers to define the word planet, in 2006.',
    whySource: 'Wikipedia, Eris (dwarf planet), read 22 September 2026',
  },
  {
    id: 'dwarf-haumea',
    name: 'Haumea',
    designation: '136108 Haumea',
    aliases: ['136108', '136108 Haumea', '2003 EL61', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=136108. Solved 2026-06-06, observations 1955-03-22 to 2026-04-14.
    aAu: 43.0602902, e: 0.194443015, iDeg: 28.2084739, nodeDeg: 121.786056, argpDeg: 240.690547,
    maDeg: 223.210412, epochJd: SBDB_EPOCH_JD, tpJd: 2500416.5996,
    solution: '2026-06-06', lastObs: '2026-04-14',
    hMag: 0.14,
    // The mean of 2 122 x 1 688 x 1 036 km (infobox). Drawn round -- the departure says so.
    diameterKm: 1544,
    moons: ['Hiʻiaka', 'Namaka'],
    // 3.9154 h is the SBDB's own rotation period (LCDB).
    why: 'It spins once every 3.9 hours and is twice as long as it is thick. In 2017 it became the ' +
      'first dwarf planet found to have a ring.',
    whySource: 'Wikipedia, Haumea, read 22 September 2026; rotation from the JPL Small-Body Database',
    departure: 'the real Haumea is an elongated egg, about twice as long as it is thick',
  },
  {
    id: 'dwarf-makemake',
    name: 'Makemake',
    designation: '136472 Makemake',
    aliases: ['136472', '136472 Makemake', '2005 FY9', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=136472. Solved 2026-06-06, observations 1955-01-29 to 2026-04-05.
    aAu: 45.5709332, e: 0.158888995, iDeg: 29.027856, nodeDeg: 79.2948338, argpDeg: 297.092273,
    maDeg: 169.937996, epochJd: SBDB_EPOCH_JD, tpJd: 2408158.6941,
    solution: '2026-06-06', lastObs: '2026-04-05',
    hMag: -0.25,
    diameterKm: 1430, // twice the infobox's mean radius, 715 km
    moons: ['S/2015 (136472) 1'], // found in 2015, still unnamed
    why: 'Covered in frozen methane stained reddish-brown. Found in 2005, it is one of the ' +
      'discoveries that made Pluto a dwarf planet in 2006.',
    whySource: 'Wikipedia, Makemake, read 22 September 2026',
  },
  {
    id: 'dwarf-sedna',
    name: 'Sedna',
    designation: '90377 Sedna',
    aliases: ['90377', '90377 Sedna', '2003 VB12', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=90377. Solved 2026-06-06, observations 1990-09-25 to 2026-02-27. The osculating
    // heliocentric a (544 au) is not the orbit's size in the long run: the barycentric one is 506
    // au and the lap about 11 400 years, which is the figure the `why` line gives. Near where
    // Sedna is now, the two ellipses are the same curve to far better than a pixel.
    aAu: 543.719529, e: 0.859882459, iDeg: 11.9252758, nodeDeg: 144.506166, argpDeg: 311.098773,
    maDeg: 358.595694, epochJd: SBDB_EPOCH_JD, tpJd: 2479264.7507,
    solution: '2026-06-06', lastObs: '2026-02-27',
    hMag: 1.5,
    // 906 km, +314 / -258 (Lellouch et al. 2013, in the infobox): nobody has weighed or resolved
    // it, so the card prints the range, not the middle.
    diameterKm: 906,
    diameterLowKm: 648,
    diameterHighKm: 1220,
    moons: [],
    why: 'One lap of the Sun takes it about 11 400 years, and even at its closest it is more than ' +
      'twice as far out as Neptune.',
    whySource: 'Wikipedia, Sedna (dwarf planet), read 22 September 2026',
  },
  {
    id: 'dwarf-gonggong',
    name: 'Gonggong',
    designation: '225088 Gonggong',
    aliases: ['225088', '225088 Gonggong', '2007 OR10', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=225088. Solved 2026-08-27, observations 1985-08-19 to 2025-10-15.
    aAu: 66.8666657, e: 0.504251, iDeg: 30.8990672, nodeDeg: 336.838316, argpDeg: 206.623284,
    maDeg: 111.664542, epochJd: SBDB_EPOCH_JD, tpJd: 2399252.7247,
    solution: '2026-08-27', lastObs: '2025-10-15',
    hMag: 1.82,
    diameterKm: 1230,
    moons: ['Xiangliu'],
    // 31 degrees is the SBDB inclination above; 33 to 101 au are its perihelion and aphelion.
    why: 'Its orbit swings it between 33 and 101 au from the Sun, tilted 31 degrees out of the ' +
      'plane the planets move in. It has one moon, Xiangliu.',
    whySource: 'Wikipedia, Gonggong (dwarf planet), read 22 September 2026',
  },
  {
    id: 'dwarf-quaoar',
    name: 'Quaoar',
    designation: '50000 Quaoar',
    aliases: ['50000', '50000 Quaoar', '2002 LM60', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=50000. Solved 2026-06-06, observations 1954-05-25 to 2025-08-31.
    aAu: 43.1561765, e: 0.0352002368, iDeg: 7.9915758, nodeDeg: 188.919125, argpDeg: 163.209051,
    maDeg: 292.848757, epochJd: SBDB_EPOCH_JD, tpJd: 2480516.3765,
    solution: '2026-06-06', lastObs: '2025-08-31',
    hMag: 2.41,
    diameterKm: 1098, // volume-equivalent, 1 097.6 km (Proudfoot et al. 2025, in the infobox)
    moons: ['Weywot'], // one confirmed; a second is unconfirmed and not listed
    why: 'It has two thin rings, farther out than theory said rings could last, and one moon, Weywot.',
    whySource: 'Wikipedia, Quaoar, read 22 September 2026',
  },
  {
    id: 'dwarf-orcus',
    name: 'Orcus',
    designation: '90482 Orcus',
    aliases: ['90482', '90482 Orcus', '2004 DW', 'dwarf planet'],
    klass: 'asteroid',
    farKind: 'dwarf',
    // sstr=90482. Solved 2026-06-06, observations 1951-11-08 to 2026-04-13.
    aAu: 39.3768654, e: 0.220524063, iDeg: 20.5568102, nodeDeg: 268.405352, argpDeg: 73.5684861,
    maDeg: 189.097291, epochJd: SBDB_EPOCH_JD, tpJd: 2504046.135,
    solution: '2026-06-06', lastObs: '2026-04-13',
    hMag: 2.13,
    diameterKm: 910, // +50 / -40 km (Brown 2018, in the infobox)
    moons: ['Vanth'],
    why: 'It keeps Pluto’s rhythm, two laps of the Sun for every three of Neptune’s, but in the ' +
      'opposite phase: when Pluto is closest in, Orcus is farthest out.',
    whySource: 'Wikipedia, Orcus (dwarf planet), read 22 September 2026',
  },
  {
    id: 'interstellar-1i',
    name: 'ʻOumuamua',
    designation: '1I/2017 U1',
    aliases: ['Oumuamua', "'Oumuamua", '1I', '1I/2017 U1', 'A/2017 U1', 'interstellar object'],
    // JPL files it as an asteroid (kind `au`, prefix A): it showed no coma.
    klass: 'asteroid',
    farKind: 'interstellar',
    // sstr=1I. Solved 2018-06-26, observations 2017-10-14 to 2018-01-02. JPL's fit includes the
    // non-gravitational acceleration; two-body motion from its osculating elements does not.
    aAu: -1.27234501, e: 1.2011338, iDeg: 122.741706, nodeDeg: 24.5969096, argpDeg: 241.810536,
    maDeg: 51.1576198, epochJd: 2458080.5, tpJd: 2458006.0073,
    solution: '2018-06-26', lastObs: '2018-01-02',
    hMag: 22.08,
    // No diameter: "between 100 and 1000 m long" is a range of shapes, not a size. The asteroid
    // builder draws its default rock, and the departure says what is not known.
    diameterKm: null,
    moons: null,
    why: 'The first object ever seen passing through the Solar System from another star, found on ' +
      '19 October 2017. It sped up slightly on the way out, and nobody is sure why.',
    whySource: 'Wikipedia, 1I/ʻOumuamua, read 22 September 2026',
    departure: 'nobody has seen its shape; the way its brightness changed says it is much longer or flatter than this',
    orbitCaveat: 'where it is now is worked out from JPL’s orbit, not seen',
  },
  {
    id: 'interstellar-2i',
    name: '2I/Borisov',
    designation: 'C/2019 Q4 (Borisov)',
    aliases: ['Borisov', 'C/2019 Q4', 'C/2019 Q4 (Borisov)', '2I', 'interstellar object', 'interstellar comet'],
    klass: 'comet',
    farKind: 'interstellar',
    // sstr=2I. Solved 2024-06-24, observations 2019-02-24 to 2020-09-30.
    aAu: -0.851492255, e: 3.35647578, iDeg: 44.0526425, nodeDeg: 308.147729, argpDeg: 209.123686,
    maDeg: 34.4294703, epochJd: 2458853.5, tpJd: 2458826.0528,
    solution: '2024-06-24', lastObs: '2020-09-30',
    hMag: null, // a comet's M1 (13.8) is not an asteroid's H, and nothing here reads it
    diameterKm: null, // "at most 0.4 to 0.5 km" is an upper limit, not a size
    moons: null,
    why: 'The first comet seen coming from another star, found on 29 August 2019 by Gennadiy Borisov, ' +
      'an amateur astronomer and telescope maker in Crimea.',
    whySource: 'Wikipedia, 2I/Borisov, read 22 September 2026',
    // scene/models.js shows a selected comet's tails at any distance, so it reads as a comet. Seen
    // in the browser on 2026-09-22: two tails on a comet 48 au out that nobody has seen since 2020.
    departure: 'the tails are part of the drawing, not an observation: nobody has seen Borisov since September 2020',
    orbitCaveat: 'where it is now is worked out from JPL’s orbit, not seen',
  },
];

/**
 * The far-bodies layer's records. Not samples: cls 'inferred', a real phase, and no dashed halo.
 * @returns {Array<Object>} 10 records
 */
export function farBodies() {
  return FAR_BODIES.map((b) => {
    const aKm = b.aAu * AU_KM; // negative on a hyperbola, which kepler.js expects
    const qKm = aKm * (1 - b.e);
    const epochMs = jdToMs(b.epochJd);
    const lastObsMs = Date.parse(b.lastObs);
    const bound = b.e < 1;
    return {
      id: b.id,
      name: b.name,
      layer: 'far-bodies',
      klass: b.klass,
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'inferred',
      // The age the card prints is the age of the EVIDENCE, as for the Roadster: the last
      // observation in JPL's fit, not the epoch the elements were re-osculated to.
      epoch: lastObsMs,
      source: 'jpl-sbdb',
      elements: {
        qKm,
        e: b.e,
        aKm,
        iRad: b.iDeg * DEG,
        omRad: b.nodeDeg * DEG,
        wRad: b.argpDeg * DEG,
        maRad: b.maDeg * DEG,
        epochMs,
        muKm3S2: MU_SUN,
      },
      meta: {
        designation: b.designation,
        aliases: b.aliases.slice(),
        farKind: b.farKind,
        aAu: b.aAu,
        qAu: qKm / AU_KM,
        aphelionAu: bound ? b.aAu * (1 + b.e) : null,
        eccentricity: b.e,
        inclinationDeg: b.iDeg,
        nodeDeg: b.nodeDeg,
        argpDeg: b.argpDeg,
        meanAnomalyDeg: b.maDeg,
        perihelionMs: jdToMs(b.tpJd),
        // JPL's heliocentric osculating period. See Sedna's row for why no card prints it.
        periodDays: bound ? periodDays(aKm) : null,
        absoluteMagnitude: b.hMag,
        diameterKm: b.diameterKm,
        diameterLowKm: b.diameterLowKm ?? null,
        diameterHighKm: b.diameterHighKm ?? null,
        moons: Array.isArray(b.moons) ? b.moons.slice() : null,
        // Never near Earth: the asteroid card's near-Earth sentence reads this, as for Vesta.
        neo: false,
        why: b.why,
        whySource: b.whySource,
        // Noon UTC, so "6 June 2026" is 6 June in every time zone a visitor reads it from.
        cite: `JPL Small-Body Database, ${b.designation}: orbit solved ${timeText.longDate(Date.parse(`${b.solution}T12:00:00Z`))}, read 22 September 2026`,
        solution: b.solution,
        // The honesty clause's arc sentence is for a body nobody can see any more; the dwarf
        // planets are observed every season and their age line is enough.
        arcEnd: b.orbitCaveat ? `${b.lastObs}T12:00:00Z` : null,
        orbitCaveat: b.orbitCaveat || null,
        departure: b.departure || null,
        // scene/orbitline.js draws the whole orbit (or, on a hyperbola, the whole passage) for
        // these rather than the coming year, which is a sliver of a 560-year lap.
        wholePath: true,
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
// (A) ANCHORED. A craft holding station at a Sun–Earth Lagrange point is drawn on Earth's own
//     heliocentric orbit. The elements are the published J2000 Keplerian set for Earth — mean
//     anomaly included — so the position is genuinely right to about an arcminute. The offset
//     from Earth (1.5 million km to L1 or L2, 0.01 au) is smaller than the dot at the scale where
//     the Sun is the centre. Craft ORBITING a planet used to be drawn this way too; since
//     2026-09-22 they are (D) below, because at their own planet's scale the anchor is a lie.
//
// (B) STRAIGHT LINE. A craft far outside the planets is drawn from a distance, a speed and an
//     escape direction, all rounded, moving in a straight line. At 60 au the Sun bends the path
//     by well under a degree a decade, so the line is the honest shape. The three numbers are
//     stated in meta and each is soft.
//
// (C) OSCULATING. A craft on its own path round the Sun, between flybys, is drawn on the orbit
//     JPL Horizons gives for it on a stated day -- all six elements, mean anomaly included -- and
//     moved on by two-body motion. At that day it sits on Horizons' own position; after it, it
//     drifts by whatever the engines and the planets do, and each row says by how much, measured
//     against Horizons' own forecast (added 2026-09-22, OSCULATING_CRAFT below).
//
// (D) ROUND A WORLD. A craft in orbit round Mars, Jupiter or the Moon is kept in THAT world's
//     frame (`mars-inertial` and so on: centred on it, ecliptic J2000 axes) and drawn from it,
//     so it is exactly as far from the drawn world as the real craft is from the real one. The
//     stand-in is one JPL Horizons state relative to the world, moved on by the world's pull
//     alone (propagate/orbiter.js says why, with the measurements). PLANET_ORBITERS below.
//
// Parker Solar Probe and Solar Orbiter use a fifth, older shape: elements without a phase
// (ELLIPTIC_CRAFT). Every construction is only the stand-in: once the harvester's Horizons
// snapshot holds a craft's id, data/parsers.js parseHorizonsVectors() swaps the position for the
// real vectors and keeps everything else on the row -- for (D), only vectors relative to the
// craft's own world will do, and the harvester asks for those (harvest/lists/horizons-ids.yaml).

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
};

// `earthRangeKm`: how far the craft really is from Earth, for the two held at a Sun–Earth
// Lagrange point. The drawing puts them on Earth's orbit (construction A above), so any distance
// FROM EARTH computed off that drawing measures the construction, not the spacecraft. Checked
// 2026-09-22 against Horizons (VECTORS, CENTER='500@399', 00:00 TDB): JWST 1 234 799 km, SOHO
// 1 637 602 km, so "1.5 million" is the right round figure for both.
//
// Gaia was the third, until that same check: Horizons -139479 (header revised 2025-05-16) says it
// "left its orbit around Earth-Sun L2 and was placed in a heliocentric disposal orbit" on
// 2025-03-28, and on 2026-09-22 it was 83 714 436 km from Earth. The card said "Also at Sun–Earth
// L2" and printed 1.5 million km. It is an osculating row now (OSCULATING_CRAFT).
const ANCHORED_CRAFT = [
  {
    id: 'deep-jwst',
    name: 'James Webb Space Telescope',
    klass: 'telescope',
    horizonsId: -170,
    anchor: 'earth',
    earthRangeKm: 1.5e6,
    note: 'A 6.5-metre gold mirror behind a sunshield the size of a tennis court, kept in the ' +
      'dark 1.5 million km behind Earth.',
    offset: 'It orbits the Sun–Earth L2 point, 1.5 million km beyond Earth — one hundredth of ' +
      "the way to the Sun. It is drawn here on Earth's orbit; the offset is smaller than the dot.",
  },
  {
    id: 'deep-soho',
    name: 'SOHO',
    klass: 'telescope',
    horizonsId: -21,
    anchor: 'earth',
    earthRangeKm: 1.5e6,
    // "Without a break" was not true: contact was lost from June to September 1998.
    note: 'It has watched the Sun since 1995, and has found more than 5 000 comets falling ' +
      'into it along the way.',
    offset: 'It orbits the Sun–Earth L1 point, 1.5 million km SUNWARD of Earth. Drawn on ' +
      "Earth's orbit; the offset is smaller than the dot.",
  },
];

/**
 * Construction D: craft in orbit round a world, drawn from that world (the block at the top of
 * this section, and propagate/orbiter.js for the measurements that forced it).
 *
 * `rKm`/`vKmS` are MEASURED: JPL Horizons, EPHEM_TYPE=VECTORS, CENTER='500@<world>' (499 Mars,
 * 599 Jupiter, 301 the Moon), default reference plane (ecliptic J2000, the frame `<world>-inertial`
 * uses), 2026-09-22 00:00 TDB, fetched 2026-09-22, to the metre and the millimetre per second.
 * The epoch is that instant in UTC, 69.184 s earlier (ORBITER_EPOCH_MS below): read as UTC, as the
 * heliocentric rows are, it would put MRO 235 km along its track from where JPL has it.
 *
 * Three sentences a card prints are on each row, each measured against Horizons' own positions
 * relative to the same world at 10-minute steps (queries as above, STEP_SIZE='10 m'):
 *   `orbit`  what IS known: how high, how often. The heights are the least and greatest distance
 *            from the world's centre over 2026-09-22..10-22 (MRO to 10-12, where its file ends),
 *            less the radius this app draws the world with (propagate/frames.js WORLD_RADIUS_KM).
 *   `drift`  how far the stand-in strays: this one state, moved on by the world's pull alone.
 *   `arc`    how close the harvested snapshot stays: JPL's states every six hours, and two-body
 *            arcs between them (data/parsers.js), worst case over the same month.
 * `periodMin` is the osculating period at the epoch (Horizons ELEMENTS, same centre and instant);
 * scene/orbitline.js draws one lap of it for the selection.
 */
const ORBITER_EPOCH_MS = Date.UTC(2026, 8, 22) - 69184;
const ORBITER_EPOCH_WORDS = '22 September 2026';

/**
 * GM of each world, km^3/s^2: the "Keplerian GM" Horizons prints in the ELEMENTS header for that
 * centre (read 2026-09-22). The same GM the elements the orbits were checked against were made with.
 */
const WORLD_GM = { mars: 42828.374857356255, jupiter: 126686531.9003704, moon: 4902.8001184575487 };
const WORLD_WORDS = { mars: 'Mars', jupiter: 'Jupiter', moon: 'the Moon' };

const PLANET_ORBITERS = [
  {
    id: 'deep-mro',
    name: 'Mars Reconnaissance Orbiter',
    klass: 'probe',
    horizonsId: -74,
    world: 'mars',
    note: 'Its HiRISE camera can see something the size of a dinner table on Mars, and it ' +
      'relays much of what the rovers say.',
    rKm: [919.321, 803.949, 3481.344],
    vKmS: [-1.761825, 2.887384, -0.209889],
    periodMin: 111.6,
    // 3 626..3 695 km from Mars's centre, 92.7 degrees to Mars's equator (the orbit's pole against
    // Astronomy Engine's Mars axis). Horizons -74 header: "a 112 minute, near circular polar orbit".
    orbit: 'circles Mars over the poles every 112 minutes, about 240 to 310 km up',
    // 63 km at an hour, 1 577 at a day, 4 477 at three; more than a quarter-lap (90 degrees round
    // Mars) out from 3.6 days, and from a week on the error is the whole width of the orbit. Mars's
    // flattening turns an orbit this low faster than two-body motion can follow.
    drift: 'Checked against JPL’s own forecast, the dot is 1 600 km from MRO after a day, and ' +
      'after four days where MRO is on that ring is not known.',
    // 160 km (2026-09-23 21:00); 58 with 3-hourly states, 17 with hourly.
    arc: 'within about 160 km of JPL’s own track',
  },
  {
    id: 'deep-mars-express',
    name: 'Mars Express',
    klass: 'probe',
    horizonsId: -41,
    world: 'mars',
    // Horizons -41 header (revised 2026-09-01): launched 2003-06-02 on a Soyuz-Fregat, Mars arrival
    // December 2003, ESA's. The stereo camera is HRSC, the High Resolution Stereo Camera (ESA's
    // Mars Express instrument pages).
    note: 'Europe’s first spacecraft to another planet, it has circled Mars since December 2003, ' +
      'mapping it in colour and in 3D with its stereo camera.',
    rKm: [1422.347, -1469.76, 3262.347],
    vKmS: [-0.524419, -3.980093, -1.115009],
    periodMin: 415.2,
    // 3 807..13 831 km from Mars's centre. The header's "Period: 6h 43m ... apocentre 11 560 km"
    // is an older orbit; these are the ones the file holds now.
    orbit: 'swings round Mars every 6 hours 55 minutes, from 420 km up out to 10 400 km',
    // Up to 2 859 km within the first day, a quarter-lap out from 2.0 days.
    drift: 'Checked against JPL’s own forecast, the dot drifts up to 3 000 km from it within a ' +
      'day, and after two days where it is on that orbit is not known.',
    // 88 km (2026-10-08 02:50).
    arc: 'within about 90 km of JPL’s own track',
  },
  {
    id: 'deep-hope',
    name: 'Hope (Emirates Mars Mission)',
    klass: 'probe',
    horizonsId: -62,
    world: 'mars',
    // Horizons -62 header (revised 2026-06-03): built by the UAE, Mars arrival 2021-02-09, a
    // 55-hour orbit "roughly 22000 x 44000 km", and the aim of "a global picture of how the martian
    // atmosphere varies throughout the day and year".
    note: 'Built by the United Arab Emirates, it has circled Mars every 55 hours since 2021, ' +
      'watching how the whole planet’s weather changes through the day.',
    rKm: [-13429.248, 32991.669, -4245.386],
    vKmS: [-0.896321, 0.107588, 0.594912],
    periodMin: 3332.6,
    // 23 271..47 001 km from Mars's centre.
    orbit: 'loops round Mars every 55 hours, 20 000 to 44 000 km up',
    // 3 km at a day, 166 at 30 days, 323 at 60 (Horizons' file ends 2026-11-26).
    drift: 'Checked against JPL’s own forecast, it stays within 200 km for a month and 350 km ' +
      'for two.',
    // 0.3 km.
    arc: 'within a kilometre of JPL’s own track',
  },
  {
    id: 'deep-juno',
    name: 'Juno',
    klass: 'probe',
    horizonsId: -61,
    world: 'jupiter',
    // "Every 38 days" was one stage of an orbit the moon flybys kept shortening (53 days in the
    // prime mission, about 33 by 2024); "than anything has been" overlooked Galileo's probe,
    // which went in.
    note: 'It dives between Jupiter and its radiation belts every month or so, closer to the ' +
      'cloud tops than any orbiter before it.',
    rKm: [1350578.538, -661190.227, -5432547.724],
    vKmS: [0.553754, -0.858287, -0.963073],
    periodMin: 47084.5,
    // 80 325 km from Jupiter's centre at the 2026-10-11 perijove (10 414 above the 69 911 km this
    // app draws Jupiter with), 5 816 227 at apojove; perijoves 2026-09-09, 10-11 and 11-13
    // (Horizons, CENTER='500@599', hourly), 32.7 days apart.
    orbit: 'swings round Jupiter every 33 days, from 10 000 km above it out to 5.7 million km',
    // 84 km at a day, 1 194 at a week, and no more than 5 687 through the perijove of 2026-10-11
    // 22:59 TDB (10-minute steps). After it, Jupiter's pull at 80 000 km and the trim burn the header
    // puts four hours after every perijove change the orbit: 9 786 km six hours on, 22 354 on
    // 10-13, 71 832 by 10-22.
    drift: 'Checked against JPL’s own forecast, it stays within 6 000 km until its close pass ' +
      'of 11 October 2026, and is wrong after it.',
    // 902 km at 2026-10-11 21:08, two hours before that perijove, where the arcs are shortest in
    // time and longest in angle; 43 km from six to 24 hours out, and under 3 km more than a day
    // away.
    arc: 'within about 900 km of JPL’s own track in the hours round its closest pass, and within ' +
      '3 km more than a day from it',
  },
  {
    id: 'deep-lro',
    name: 'Lunar Reconnaissance Orbiter',
    klass: 'probe',
    horizonsId: -85,
    world: 'moon',
    aliases: ['LRO'],
    // Horizons -85 header (revised 2026-08-05): launched 2009-06-18, extended mission in "a
    // low-maintenance orbit". Its camera (LROC) imaged the Apollo landing sites, and LROC post 1101
    // is the source registry/oddities.yaml gives for the Beresheet crash site this map draws.
    note: 'Circling the Moon since 2009, its camera has photographed the Apollo landers, and this ' +
      'map places the Beresheet crash from its pictures.',
    rKm: [-1673.335, -729.446, 131.352],
    vKmS: [-0.033981, -0.26336, -1.613845],
    periodMin: 116.8,
    // 1 801..1 853 km from the Moon's centre; 83 degrees to the lunar equator (the orbit's pole
    // against Astronomy Engine's lunar axis), so near-polar, not polar.
    orbit: 'circles the Moon every 117 minutes, about 65 to 115 km up',
    // 17 km at a day, 90 at two weeks, 606 at 30 days, 1 865 at 60, 2 878 at 90 (the orbit is
    // 3 650 km across, so by then where it is on the ring is lost).
    drift: 'Checked against JPL’s own forecast, the dot stays within 100 km of it for two weeks, ' +
      'and is about 600 km off after a month.',
    // 6 km.
    arc: 'within about 6 km of JPL’s own track',
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
      'its radio signal takes about a day to get here.',
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
    // "Still sending back" Arrokoth: that downlink finished in 2020. "A nine-year fall" was "nine
    // years of falling" until 2026-09-22, three characters over the 160 that
    // tests/test_deep_space.mjs now holds every note in this layer to.
    note: 'It crossed Pluto in nine hours in 2015 after a nine-year fall towards it, and ' +
      'in 2019 flew past Arrokoth, a Kuiper belt rock, the farthest thing ever visited.',
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

/**
 * Construction C. Every element set is MEASURED: JPL Horizons, EPHEM_TYPE=ELEMENTS,
 * CENTER='500@10' (heliocentric, ecliptic J2000 -- the frame of the snapshot vectors), at 00:00 TDB
 * on the row's date, fetched 2026-09-22, rounded to the digits shown. TDB is taken as UTC, as
 * data/parsers.js does for the vectors: that is 69 s late, about 2 000 km along the track at these
 * speeds, and it is the SAME 69 s the snapshot carries, so the stand-in and the real vectors agree
 * with each other. Rounded, each row sits within 400 km of Horizons' position at its date
 * (measured), and tests/test_deep_space.mjs checks that and every `drift` sentence against
 * Horizons' own positions.
 *
 * `drift` is visitor-facing: it ends the card's honesty line, after the sentence that says the
 * orbit is two-body from the stated day. `destination` is printed by the probe card ("on its way
 * to ..."), so it is set only where it stays true for years: BepiColombo and Hera arrive within
 * months of this list being written, and a bundled row does not know when it has.
 */
const OSC_EPOCH_MS = Date.UTC(2026, 8, 22);
const OSC_EPOCH_WORDS = '22 September 2026';

const OSCULATING_CRAFT = [
  {
    id: 'deep-psyche',
    name: 'Psyche',
    klass: 'probe',
    horizonsId: -255,
    // Horizons -255 header (revised 2026-09-01): Mars flyby 2026-05-15, solar-electric Hall
    // thrusters, captured by 16 Psyche in late July 2029.
    note: 'Past its Mars flyby of May 2026, it is pushing out on electric thrusters to 16 Psyche, ' +
      'a metal-rich asteroid it reaches in 2029.',
    destination: 'the metal-rich asteroid 16 Psyche',
    aAu: 2.078466, e: 0.33187, iDeg: 2.6236, nodeDeg: 160.077, argpDeg: 221.9003, maDeg: 35.8142,
    // Thrusting all the time, so the drift grows with the square of the time: 182 000 km at 30
    // days, 2.17 million at 90.
    drift: 'Checked against JPL’s own forecast, it is 200 000 km out after a month and 2 million ' +
      'km after three.',
  },
  {
    id: 'deep-lucy',
    name: 'Lucy',
    klass: 'probe',
    horizonsId: -49,
    // Horizons -49 header (revised 2025-10-25): 3548 Eurybates on 2027-08-11 is the first of the
    // five Jupiter Trojans in its flyby list. 5.05 au from the Sun on 2026-09-22 (Horizons).
    note: 'Now 5 au from the Sun, it flies past 3548 Eurybates in August 2027, the first of the ' +
      'five Trojan asteroids sharing Jupiter’s orbit that it will visit.',
    destination: 'Jupiter’s Trojan asteroids',
    aAu: 3.354199, e: 0.71343, iDeg: 4.4203, nodeDeg: 261.2311, argpDeg: 160.4172, maDeg: 106.295,
    // Coasting: 4 000 km at 90 days, 16 000 at 180. Its next burn, DSM-3, is 312.7 m/s on
    // 2027-04-03 (the header's maneuver plan); a year out the drawing is 4.6 million km off.
    drift: 'Checked against JPL’s own forecast, it stays within 16 000 km for six months, until ' +
      'the engine burn planned for April 2027.',
  },
  {
    id: 'deep-europa-clipper',
    name: 'Europa Clipper',
    klass: 'probe',
    horizonsId: -159,
    // Horizons -159 header (revised 2026-08-18): Earth gravity assist 2026-12-03, Jupiter arrival
    // 2030-04-11, 49 Europa flybys.
    note: 'Heading for Jupiter, it swings past Earth on 3 December 2026 for the speed to arrive in ' +
      'April 2030 and fly past Europa 49 times.',
    destination: 'Jupiter’s moon Europa',
    aAu: 1.599125, e: 0.475425, iDeg: 2.0465, nodeDeg: 71.4327, argpDeg: 302.3992, maDeg: 344.6094,
    // Coasting to the flyby: 12 000 km off on 2026-12-03. The flyby itself is 10 290 km from
    // Earth's centre at 20:20 TDB (Horizons, CENTER='500@399'), and after it this orbit is the one
    // the craft left: 8 million km off by 2026-12-21, 42 million by March. A post-flyby element
    // set was measured too and is worse NOW, which is when this stand-in is used.
    drift: 'Checked against JPL’s own forecast, it stays within 12 000 km until its Earth flyby ' +
      'on 3 December 2026, and is wrong after it.',
  },
  {
    id: 'deep-juice',
    name: 'JUICE',
    klass: 'probe',
    horizonsId: -28,
    aliases: ['Jupiter Icy Moons Explorer'],
    // Closest approach 2026-09-28 11:50 TDB, 15 248 km from Earth's centre (Horizons, CENTER=
    // '500@399', 10-minute steps). Horizons -28 header (revised 2026-09-21): Earth flyby #2 of the
    // gravity assists that bring it to Jupiter in July 2031.
    note: 'Its Earth flyby of 28 September 2026, 15 000 km from Earth’s centre, is one of the ' +
      'gravity assists that take it to Jupiter in July 2031.',
    destination: 'Jupiter’s moon Ganymede',
    // The elements for 1 OCTOBER, after the flyby, not 22 September: the flyby adds about 4 km/s,
    // so the pre-flyby set was 8 million km off a month later. This one is 2.2 million km off on
    // 22 September, 0.17 million on the 28th, and 111 000 km four months after the flyby.
    epochMs: Date.UTC(2026, 9, 1),
    epochWords: '1 October 2026',
    aAu: 1.632993, e: 0.479749, iDeg: 0.0041, nodeDeg: 176.1322, argpDeg: 246.7938, maDeg: 341.1351,
    drift: 'That is just after its Earth flyby, so checked against JPL’s own forecast it is up to ' +
      '2 million km out before 28 September, and about 110 000 km four months after.',
  },
  {
    id: 'deep-bepicolombo',
    name: 'BepiColombo',
    klass: 'probe',
    horizonsId: -121,
    // Horizons -121 header (revised 2026-09-21): six Mercury flybys 2021-2025; the 2024-09-02 note
    // on reduced electric propulsion and the one-year delay; Mercury orbit insertion 2026-Nov.
    note: 'Six Mercury flybys behind it, it enters orbit around Mercury in November 2026, a year ' +
      'late after a power fault weakened its thrusters.',
    aAu: 0.393399, e: 0.196236, iDeg: 6.9817, nodeDeg: 48.3583, argpDeg: 26.7043, maDeg: 162.3605,
    // 542 000 km at 30 days, 4.98 million at 60.
    drift: 'Checked against JPL’s own forecast, it is half a million km out after a month and ' +
      '5 million after two.',
  },
  {
    id: 'deep-hera',
    name: 'Hera',
    klass: 'probe',
    horizonsId: -91,
    // Horizons -91 header (revised 2026-09-01): its objective is the crater DART left on Dimorphos
    // on 2022-09-26; rendezvous manoeuvre 2026-Oct, arrival "Late 2026".
    note: 'ESA’s follow-up to NASA’s DART impact, it reaches the asteroid pair Didymos and ' +
      'Dimorphos in late 2026 to measure the crater DART left.',
    aAu: 1.693677, e: 0.396112, iDeg: 3.3826, nodeDeg: 72.0392, argpDeg: 317.9109, maDeg: 313.4267,
    // 137 000 km at 30 days, 429 000 at 42 as it manoeuvres in; Horizons' file ends 2026-11-04.
    drift: 'Checked against JPL’s own forecast, it is 140 000 km out after a month; that forecast ' +
      'stops on 4 November 2026.',
  },
  {
    id: 'deep-osiris-apex',
    name: 'OSIRIS-APEX',
    klass: 'probe',
    horizonsId: -64,
    // The same spacecraft under its first mission's name, which is the one people remember.
    aliases: ['OSIRIS-REx'],
    // Horizons -64 header (revised 2025-09-18): sample capsule recovered 2023-09-24, retargeted to
    // Apophis, 2029 rendezvous. Earth flyby 2027-03-16 03:30 TDB, 10 564 km from Earth's centre
    // (Horizons, CENTER='500@399').
    note: 'Having delivered Bennu’s sample in 2023, it is bound for Apophis, which it reaches in ' +
      '2029, with an Earth flyby on 16 March 2027 on the way.',
    destination: 'the asteroid Apophis',
    aAu: 1.06431, e: 0.22684, iDeg: 0.0043, nodeDeg: 353.4003, argpDeg: 95.4774, maDeg: 263.441,
    // Coasting: about 1 000 km at 120 days; 21 000 km on 2027-03-11 as Earth pulls; wrong after.
    drift: 'Checked against JPL’s own forecast, it stays within about 1 000 km for four months, ' +
      'and is wrong after its Earth flyby on 16 March 2027.',
  },
  {
    id: 'deep-hayabusa2',
    name: 'Hayabusa2',
    klass: 'probe',
    horizonsId: -37,
    // Horizons -37 header (revised 2026-09-01): Ryugu sample returned 2020-12-05, 2001 CC21 flyby
    // 2026-07-05, 1998 KY26 rendezvous July 2031.
    note: 'Its Ryugu sample delivered in 2020, it flew past the asteroid 2001 CC21 in July 2026 ' +
      'and is bound for 1998 KY26, which it reaches in 2031.',
    destination: 'the asteroid 1998 KY26',
    aAu: 0.917504, e: 0.158424, iDeg: 4.3119, nodeDeg: 76.5053, argpDeg: 119.4213, maDeg: 124.0497,
    // 34 000 km at 30 days, 133 000 at 60; Horizons' file ends 2026-11-27.
    drift: 'Checked against JPL’s own forecast, it is 30 000 km out after a month and 130 000 km ' +
      'after two.',
  },
  {
    id: 'deep-stereo-a',
    name: 'STEREO-A',
    klass: 'probe',
    horizonsId: -234,
    // Horizons -234 header (revised 2026-09-01): launched 2006 to watch the Sun and its coronal
    // mass ejections from ahead of Earth. a = 0.961 au, a 344-day year, so it gains on Earth; it
    // last passed us on 2023-08-17 at 8.3 million km (Horizons, CENTER='500@399'), and on
    // 2026-09-22 it was 70 degrees ahead.
    note: 'Its year is three weeks shorter than ours, so it slowly laps Earth, watching the Sun’s ' +
      'eruptions from the side; it last passed us in August 2023.',
    aAu: 0.96074, e: 0.006769, iDeg: 0.128, nodeDeg: 212.2938, argpDeg: 77.7722, maDeg: 137.8142,
    // 2 000 km at 60 days, 4 000 at 85; Horizons' file ends 2026-12-18.
    drift: 'Checked against JPL’s own forecast, it stays within a few thousand km for two months.',
  },
  {
    id: 'deep-gaia',
    name: 'Gaia',
    klass: 'telescope',
    horizonsId: -139479,
    // Horizons -139479 header (revised 2025-05-16): science observations ended 2025-01-25, and on
    // 2025-03-28 it "left its orbit around Earth-Sun L2 and was placed in a heliocentric disposal
    // orbit", coming back past Earth every 14 years at about 10 million km. 83.7 million km from
    // Earth on 2026-09-22. It was drawn at L2 (construction A) until that day.
    note: 'It measured the positions and motions of about two billion stars, then in March 2025 ' +
      'was pushed away from L2 onto an orbit of its own round the Sun.',
    aAu: 1.049606, e: 0.025513, iDeg: 0.0786, nodeDeg: 100.5376, argpDeg: 87.9103, maDeg: 137.1475,
    // Nothing steers it now: 277 km at 30 days, 1 663 at 60, 20 184 at 180, 75 806 at a year.
    drift: 'Checked against JPL’s own forecast, it stays within 2 000 km for two months and ' +
      '20 000 km for six.',
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
        // Only for craft held near EARTH. Drawn on Earth's own orbit, their distance from Earth is
        // the construction's error -- up to ~1.1 million km, the same order as the real 1.5 million
        // -- so the card printed JWST at "0.4x the Moon's distance". ui/cards.js reads this instead.
        ...(Number.isFinite(c.earthRangeKm) ? { earthRangeKm: c.earthRangeKm } : {}),
        approxFields: ['position offset from ' + anchor.label],
        why: NO_CORS + ' ' + c.offset + ' The orbit itself is the published J2000 element set ' +
          'for ' + anchor.label + ', mean anomaly included, so the place along it is real to ' +
          'within ' + anchor.driftNote + '.',
      },
    });
  }

  for (const c of PLANET_ORBITERS) {
    const world = WORLD_WORDS[c.world];
    const worlds = world === 'the Moon' ? 'the Moon’s' : world + '’s';
    out.push({
      id: c.id,
      name: c.name,
      layer: 'deep-space',
      klass: c.klass,
      propagator: 'orbiter',
      frame: c.world + '-inertial',
      cls: 'sample',
      epoch: ORBITER_EPOCH_MS,
      source: 'horizons-deep-space',
      muKm3S2: WORLD_GM[c.world],
      samples: [{ tMs: ORBITER_EPOCH_MS, rKm: c.rKm, vKmS: c.vKmS }],
      // A bound orbit repeats, so one state answers for any date and the craft never leaves the
      // map; `drift` is the sentence that says how soon the place along the orbit stops being known.
      extrapolateMs: Infinity,
      meta: {
        horizonsId: c.horizonsId,
        construction: 'round-a-world',
        orbits: c.world,
        periodMin: c.periodMin,
        note: c.note,
        ...(c.aliases ? { aliases: c.aliases } : {}),
        // What the card says once the harvested snapshot draws it instead (data/parsers.js copies
        // it to `orbitKnown`, which ui/cards.js prints after the class line). Written here, beside
        // the measurement of `arc`, because that measurement is what makes it true: it holds for
        // six-hourly states, and the parser refuses a coarser snapshot rather than overclaim.
        snapshotKnown: 'it ' + c.orbit + '; JPL Horizons gives its place relative to ' + world +
          ' every six hours, and between those it is carried round ' + world + ' by ' + worlds +
          ' pull alone, which keeps it ' + c.arc,
        approx: true,
        approxFields: ['position along the orbit after ' + ORBITER_EPOCH_WORDS],
        // Not NO_CORS alone: for these the server's copy existing is not enough. Every snapshot
        // before 2026-09-22 holds them relative to the Sun, which data/parsers.js refuses.
        why: 'This browser cannot read JPL’s servers itself (they send no CORS header), and a ' +
          'craft this close to ' + world + ' can only be drawn where it is from JPL’s positions ' +
          'relative to ' + world + ', which our own server’s copy does not have at the moment. ' +
          'Until it does, this is data shipped with the app. It ' + c.orbit + '. The dot starts ' +
          'from JPL Horizons’ position for it relative to ' + world + ' on ' + ORBITER_EPOCH_WORDS +
          ' and is carried round ' + world + ' by ' + worlds + ' pull alone. ' + c.drift,
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

  for (const c of OSCULATING_CRAFT) {
    const aKm = c.aAu * AU_KM;
    const epoch = Number.isFinite(c.epochMs) ? c.epochMs : OSC_EPOCH_MS;
    const epochWords = c.epochWords || OSC_EPOCH_WORDS;
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
        // The mean anomaly, not a time of perihelion: the phase is KNOWN here, which is the whole
        // difference from ELLIPTIC_CRAFT above.
        maRad: c.maDeg * DEG,
        epochMs: epoch,
        muKm3S2: MU_SUN,
      },
      meta: {
        horizonsId: c.horizonsId,
        construction: 'osculating',
        elementsEpochMs: epoch,
        aAu: c.aAu,
        eccentricity: c.e,
        inclinationDeg: c.iDeg,
        periodDays: periodDays(aKm),
        note: c.note,
        ...(c.destination ? { destination: c.destination } : {}),
        // ui/search.js matches meta.aliases at a word start, after the name.
        ...(c.aliases ? { aliases: c.aliases } : {}),
        approx: true,
        approxFields: ['position after ' + epochWords],
        why:
          NO_CORS +
          ' It is drawn on the orbit JPL Horizons gave for it on ' +
          epochWords +
          ' and moved on from there by the Sun’s pull alone, so no engine burn or flyby after ' +
          'that date is in it. ' +
          c.drift,
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

import { SITES } from './sites.js';

/**
 * The ground and surface sites nothing serves as an API: the Deep Space Network's big dishes, the
 * places on the Moon and Mars where something landed. `registry/sites.yaml` is the reviewable copy
 * and data/sites.js its generated mirror; this turns the mirror's rows into records.
 *
 * THIS USED TO BE THE ROWS THEMSELVES, hand-ported, one 22-line literal per site, with nothing
 * checking that a latitude here matched the one in the registry. That was thirteen records until
 * 2026-09-22, when twenty-one landing sites arrived at once: the rows are now generated and
 * `gen_sites_js.py --check` is the check the port never had.
 *
 * These are `measured`, NOT `sample`. A dish does not move and its coordinates are published --
 * hand-kept is a statement about where the data comes from, not about how sure we are of it. The
 * distinction matters because `sample` is drawn with a dashed halo meaning "not a live position",
 * and that would be wrong here.
 *
 * A row that says `record: false` is a coordinate and not a record: Beresheet's impact smudge,
 * which registry/oddities.yaml anchors the lunar library on and which has nothing standing on it
 * to draw.
 *
 * @returns {Array<Object>} one record per sites.yaml row, less the `record: false` ones
 */
export function handKeptSites() {
  return SITES.filter((row) => row.record !== false).map(siteRecord);
}

function siteRecord(row) {
  const meta = { siteKind: row.class, world: row.world, doing: row.doing };
  if (row.diameter_m != null) meta.diameterM = row.diameter_m;
  // What the scene draws on a surface row: scene/realmodels.js routes `lander` and `rover` to a
  // procedural stand-in and the card says so. `siteKind` stays the row's class, because that is
  // what it has always meant to the card and to the pad and dish routes.
  if (row.shape) meta.siteShape = row.shape;
  // Other names search matches (ui/search.js reads meta.aliases): Sojourner, Tranquility Base.
  if (Array.isArray(row.aliases) && row.aliases.length) meta.aliases = row.aliases.slice();
  meta.latDeg = row.lat;
  meta.lonDeg = row.lon;
  return {
    id: row.id,
    name: row.display,
    klass: 'site',
    layer: 'hand-kept-sites',
    propagator: 'fixed',
    // The row's own world. A lunar site that said 'earth-fixed' was drawn on Earth for months;
    // see scene/stage.js.
    frame: `${row.world}-fixed`,
    cls: 'measured',
    epoch: null,
    source: 'registry/sites.yaml',
    fixed: { latDeg: row.lat, lonDeg: row.lon, altKm: (row.alt_m || 0) / 1000 },
    meta,
  };
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
import { timeText } from '../copy/en.js';

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
