// propagate/moons.js -- where Phobos, Deimos, Enceladus, Titan, Triton and Charon are, relative to
// their planets. Astronomy Engine has JupiterMoons() for Jupiter's four and nothing for these six.
//
// THE METHOD, AND WHY NOT THE OBVIOUS ONE. Each moon is a PRECESSING ELLIPSE: a Kepler orbit whose
// node and periapsis turn at steady rates about a fixed pole, written in equinoctial elements so a
// near-circular orbit (Triton's e is 0.0001) has nothing singular in it. That is the model JPL's
// Solar System Dynamics group publishes as "mean elements" (ssd.jpl.nasa.gov/sats/elem/, read
// 2026-09-22) -- but their TABLE could not be used as printed. Its own page says the rows "are not
// intended for ephemeris computation", and it prints Phobos's period as 0.3187 days: four figures,
// so 26.7 years of laps since its 2000 epoch (30 600 of them) turn a rounding of 0.00005 day into
// 4.8 laps. Read as written and propagated to 2026, the table put Phobos 17 800 km from where JPL
// Horizons has it and Deimos 42 900 km -- the far side of their orbits. (Titan's row did not
// reproduce Horizons even at its own epoch under the same reading, 155 degrees off; that may be a
// convention I misread, and it does not matter, because nothing here uses the table's numbers.)
//
// So the elements below are the same kind of thing, FITTED BY LEAST SQUARES TO JPL HORIZONS: 4 001
// geometric state vectors per moon over 2024-2030 plus 1 202 over 2000-2024 and 2030-2050, each
// relative to its planet's BODY CENTRE in ICRF axes (Horizons' ephemerides MAR099 for Mars's
// moons, SAT441 for Saturn's, NEP098 for Triton, PLU060 for Charon), with the Horizons time tags in
// UT. scripts/fit-moon-elements.mjs is the whole fit; it re-fetches and re-fits on any machine that
// can reach ssd.jpl.nasa.gov and prints this table.
//
// THE ERROR, MEASURED at instants that were NOT in the fit -- 998 per moon over 2024-2030 and 1 002
// over 2000-2050, from their own Horizons queries (the script says which) -- in km, with the worst
// as a share of the orbit's radius:
//
//                2026    2027    2024-2030   2000-2050, worst      orbit radius
//   Phobos        3.5     3.4       4.4        5.9  (0.06 %)          9 375 km
//   Deimos       16.6    15.8      33.9      120    (0.51 %)         23 458 km
//   Enceladus   357     301       509      1 480    (0.62 %)        238 036 km
//   Titan       255     261       538        836    (0.07 %)      1 221 865 km
//   Triton        1.0     0.9       1.7        9.8  (0.003 %)       354 759 km
//   Charon        0.10    0.09      0.11       0.70 (0.004 %)       19 596 km
//
// (Each moon's own row below says how it got there.) Outside 2000-2050 nothing was measured, so
// moonOffsetKm() answers null there and the moon is not drawn: a refusal, not a guess.
//
// PHOBOS, WHICH LAPS MARS IN 7.65 HOURS. A mean-motion error grows along the track linearly in
// time: one part per million of Phobos's 1128.8 degrees a day is 0.41 degrees a year, 67 km. And
// Phobos is spiralling in, so its mean motion is not even constant: a plain precessing ellipse fitted
// to the same 2000-2050 vectors is 115 km off at the ends of that span (1.2 % of the orbit), and
// one fitted to 2024-2030 alone drifts to 146 km by 2000. The `c2` term -- a steady quickening of the
// mean longitude, fitted at 1.19e-3 degrees per year squared -- brings the whole 50 years inside
// 5.9 km.
//
// ENCELADUS is locked in a 2:1 resonance with Dione, and a plain ellipse fitted to 2024-2030 was
// 1 283 km off inside its own span and 7 800 km off by 2003, almost all of it along the track. Two
// sine terms in the mean longitude (`lib*`, periods fitted at 4.74 and 11.0 years, 0.13 and 0.27
// degrees) bring 2000-2050 inside 1 480 km. That is 0.36 degrees of its orbit: from Earth the whole
// Saturn system is drawn about 45 times wider than it looks (scene/worlds.js), where 1 480 km is a
// tenth of a pixel; from Saturn's own stage it is 6 Enceladus radii.
//
// CHARON'S PLANET. These offsets are from each planet's CENTRE, and they are added to Astronomy
// Engine's position for the planet. For Pluto that position is the Pluto-Charon BARYCENTRE, by
// construction: Astronomy Engine integrates one body carrying the whole system's mass (its
// PLUTO_GM is 982 km^3/s^2, DE405's value for the system; NASA's Pluto fact sheet gives Pluto alone
// 870, and JPL's satellite table Charon 106). Measured against Horizons
// through 2026-2027 it is 135 000 to 148 000 km from BOTH Horizons' Pluto (999) and its barycentre
// (9), which are 2 131 km apart, so no measurement here can tell which of the two it means; the
// integrator's mass says it. Pluto is left where Astronomy Engine puts it and Charon is placed from
// it by the centre-to-centre vector, which keeps the pair exactly right RELATIVE TO EACH OTHER -- the
// thing a visitor can see, from Pluto's stage or around the drawn Pluto from Earth. Moving Pluto
// the 2 131 km from barycentre to centre would correct nothing that 140 000 km of the ephemeris's
// own error does not swamp. The same holds, smaller, for Saturn (its barycentre is about 290 km from
// its centre, mostly Titan's pull) and Neptune (74 km, Triton's): whole systems shifted, not moons.

const DEG = Math.PI / 180;
const DAY_MS = 86400000;

/**
 * The fitted epoch: 2027-01-01T00:00:00 UTC. The elements' time argument is the app's own UTC
 * clock, in days from here -- the Horizons vectors were tagged in UT, so no TT or TDB conversion
 * sits in between, and in particular not Astronomy Engine's Delta-T model, which runs about 6 s
 * ahead of the real one in 2026 (75.5 s against 69.2); that alone would put Phobos 13 km along its
 * track. Leap seconds: none between 2017 and this writing; each future one is 1 s, 2 km for Phobos.
 */
export const EPOCH_MS = Date.UTC(2027, 0, 1);

/** The span the error above was measured over. Outside it: null. */
export const MOON_ELEMENTS_VALID = { fromMs: Date.UTC(2000, 0, 1), toMs: Date.UTC(2050, 0, 1) };

// One row per moon. Angles in degrees, rates in degrees per day, `a` in km. The pole is the fixed
// axis the node precesses about (JPL's "local Laplace plane" pole, refined by the fit where it
// helped); the orbit is (q0, p0) = tan(i/2) (cos, sin) node and (k0, h0) = e (cos, sin) longitude of
// periapsis at the epoch, turned by `odot` and `wdot`; the mean longitude is L0 + n t + c2 t^2, plus
// for Enceladus two sine terms. Fitted 2026-09-22.
export const MOON_ELEMENTS = {
  // e 0.0151, i 1.08 deg to its Laplace plane. Mars's oblateness turns the node backwards and the
  // periapsis forwards, each once in 2.26 years; the argument of periapsis therefore once in 1.13,
  // JPL's "1.1". c2: see PHOBOS above.
  phobos: {
    parent: 'mars',
    poleRa: 317.6423190844, poleDec: 52.87643475085, a: 9374.922746002,
    L0: 39.59947019179, n: 1128.844945254, c2: 8.924672153799e-9,
    k0: 0.01511077248612, h0: -0.0007394101947987, wdot: 0.4351789343802,
    q0: -0.009190507443303, p0: -0.001917212433741, odot: -0.4357925142029,
  },
  // Nearly circular (e 0.0003), i 1.79 deg; node round once in 54 years (JPL: 56.2).
  deimos: {
    parent: 'mars',
    poleRa: 316.6132881599, poleDec: 53.52049371304, a: 23457.5346624,
    L0: 63.67609881856, n: 285.1618525658, c2: -2.907760591495e-9,
    k0: 0.00006946363532399, h0: 0.0002757071195183, wdot: 0.01757947788281,
    q0: -0.00867906526705, p0: -0.01295675743673, odot: -0.01816027947063,
  },
  // e 0.0047 held by the Dione resonance, its periapsis round once in 2.92 years (JPL: 2.916); the
  // two `lib` terms are the resonance's swing in longitude (ENCELADUS above).
  enceladus: {
    parent: 'saturn',
    poleRa: 40.32764303879, poleDec: 83.53933974475, a: 238035.6610096,
    L0: 193.3462980452, n: 262.7318977036,
    k0: -0.0004755771702843, h0: -0.004685215702207, wdot: 0.3379280623571,
    q0: 0.00001991448818996, p0: 0.0002344579025839, odot: -0.0005668277750302,
    libA: 0.07101024212061, libB: -0.1092511965152, libNu: 0.2079714523851,
    lib2A: -0.1802629567957, lib2B: -0.1979136892119, lib2Nu: 0.0893013908399,
  },
  // e 0.029, i 0.35 deg to the Laplace plane, whose pole is JPL's to the printed 0.1 degree (a
  // fitted pole wandered off to trade against the inclination, 50 years being a fifteenth of one
  // turn of the node). Periapsis round once in 692 years.
  titan: {
    parent: 'saturn',
    poleRa: 36.4, poleDec: 84.0, a: 1221865.172887,
    L0: 174.5951648922, n: 22.57697571545,
    k0: -0.02126457724096, h0: -0.01928993178496, wdot: 0.001423945788257,
    q0: 0.002970907928222, p0: 0.0006300098234667, odot: -0.001265340072893,
  },
  // Retrograde: i 156.9 deg to its Laplace plane, which is why (q0, p0) are large -- tan(78.5 deg)
  // is 4.9. The node goes round once in 685 years; Wikipedia's Triton article gives "about 678".
  triton: {
    parent: 'neptune',
    poleRa: 299.3921774484, poleDec: 43.37806200092, a: 354759.0721077,
    L0: 273.2245898195, n: 61.26013848105, c2: -5.749942930945e-11,
    k0: 0.00005194656348551, h0: -0.0001153807117494, wdot: 0.003993294284233,
    q0: -4.788626701883, p0: -1.015696094076, odot: 0.001438776188983,
  },
  // In Pluto's equator (the pole is the IAU 2015 one, RA 132.993, Dec -6.163, NASA's Pluto fact
  // sheet rounds it to 132.99, -6.16): i 0.08 deg, e 0.0002, and nothing measurable precesses.
  charon: {
    parent: 'pluto',
    poleRa: 132.993, poleDec: -6.163, a: 19595.76444639,
    L0: 283.2609651615, n: 56.36253085353,
    k0: -0.00014621622103, h0: 0.00006704554329176, wdot: 0.000003969942187171,
    q0: 0.0007035430960011, p0: 0.0001389393090705, odot: 0.000162479020848,
  },
};

/** Does this table place the world? (Jupiter's moons are frames.js's, by JupiterMoons().) */
export function hasFittedElements(worldId) {
  return Object.prototype.hasOwnProperty.call(MOON_ELEMENTS, String(worldId || '').toLowerCase());
}

/**
 * Where a moon is relative to its planet's centre: km, EQJ (J2000 equatorial) axes, geometric (no
 * light time -- propagate/body.js back-dates for the view from Earth). Null for a world not in the
 * table, a time that is not one, or a time outside MOON_ELEMENTS_VALID.
 */
export function fittedMoonOffsetKm(worldId, tMs) {
  const el = MOON_ELEMENTS[String(worldId || '').toLowerCase()];
  if (!el || !Number.isFinite(tMs)) return null;
  if (tMs < MOON_ELEMENTS_VALID.fromMs || tMs > MOON_ELEMENTS_VALID.toMs) return null;
  return elementsOffsetKm(el, tMs);
}

/**
 * The precessing ellipse itself, for any row shaped like MOON_ELEMENTS' (no span check): km, EQJ.
 * Exported so scripts/fit-moon-elements.mjs fits exactly the function the browser runs.
 */
export function elementsOffsetKm(el, tMs) {
  const t = (tMs - EPOCH_MS) / DAY_MS;

  let lon = el.L0 + el.n * t + (el.c2 || 0) * t * t;
  if (el.libNu) lon += el.libA * Math.sin(el.libNu * t * DEG) + el.libB * Math.cos(el.libNu * t * DEG);
  if (el.lib2Nu) lon += el.lib2A * Math.sin(el.lib2Nu * t * DEG) + el.lib2B * Math.cos(el.lib2Nu * t * DEG);
  const lam = lon * DEG;

  // The ellipse and the plane, each turned by its own steady rate since the epoch.
  const w = el.wdot * t * DEG;
  const k = el.k0 * Math.cos(w) - el.h0 * Math.sin(w);
  const h = el.k0 * Math.sin(w) + el.h0 * Math.cos(w);
  const o = el.odot * t * DEG;
  const q = el.q0 * Math.cos(o) - el.p0 * Math.sin(o);
  const p = el.q0 * Math.sin(o) + el.p0 * Math.cos(o);

  // Kepler's equation in equinoctial form, lam = F + h cos F - k sin F, for the eccentric
  // longitude F. Newton from F = lam: e is at most 0.029 (Titan), so four steps reach 1e-15.
  let F = lam;
  for (let i = 0; i < 8; i++) {
    const cF = Math.cos(F);
    const sF = Math.sin(F);
    const dF = (F + h * cF - k * sF - lam) / (1 - h * sF - k * cF);
    F -= dF;
    if (Math.abs(dF) < 1e-14) break;
  }
  const cF = Math.cos(F);
  const sF = Math.sin(F);
  const beta = 1 / (1 + Math.sqrt(1 - h * h - k * k));
  const X = el.a * ((1 - h * h * beta) * cF + h * k * beta * sF - k);
  const Y = el.a * (h * k * beta * cF + (1 - k * k * beta) * sF - h);

  // The orbit's in-plane axes f and g in the pole's frame (Broucke and Cefola's equinoctial basis).
  const d = 1 + p * p + q * q;
  const x = (X * (1 - p * p + q * q) + Y * 2 * p * q) / d;
  const y = (X * 2 * p * q + Y * (1 + p * p - q * q)) / d;
  const z = (X * -2 * p + Y * 2 * q) / d;

  // From the pole's frame to ICRF/EQJ axes: Rz(ra + 90) . Rx(90 - dec), the IAU composition
  // frames.js uses for a world's pole.
  const A = (el.poleRa + 90) * DEG;
  const B = (90 - el.poleDec) * DEG;
  const cB = Math.cos(B);
  const sB = Math.sin(B);
  const y1 = y * cB - z * sB;
  return { x: x * Math.cos(A) - y1 * Math.sin(A), y: x * Math.sin(A) + y1 * Math.cos(A), z: y * sB + z * cB };
}
