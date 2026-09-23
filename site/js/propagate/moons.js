// propagate/moons.js -- where sixteen moons are, relative to their planets: Phobos and Deimos;
// Saturn's Mimas, Enceladus, Tethys, Dione, Rhea, Titan and Iapetus; Uranus's Miranda, Ariel,
// Umbriel, Titania and Oberon; Triton; and Charon. Astronomy Engine has JupiterMoons() for
// Jupiter's four and nothing for any of these.
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
// moons, SAT441 for Saturn's, URA111 for Uranus's, NEP098 for Triton, PLU060 for Charon), with the
// Horizons time tags in UT. scripts/fit-moon-elements.mjs is the whole fit; it re-fetches and
// re-fits on any machine that can reach ssd.jpl.nasa.gov and prints this table.
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
//   -- ten more, 2026-09-22 --
//   Mimas       123     111       130        703    (0.38 %)       185 535 km
//   Tethys       66      69        83        119    (0.04 %)       294 673 km
//   Dione       143     127       211        235    (0.06 %)       377 415 km
//   Rhea        137     144       161        199    (0.04 %)       527 068 km
//   Iapetus   2 135   2 064     3 709      6 800    (0.19 %)     3 560 842 km
//   Miranda      52      54        57        117    (0.09 %)       129 848 km
//   Ariel        77      74        80        114    (0.06 %)       190 929 km
//   Umbriel     349     357       362        410    (0.15 %)       265 981 km
//   Titania     982     946     1 008        996    (0.23 %)       436 281 km
//   Oberon    1 187   1 189     1 208      1 230    (0.21 %)       583 449 km
//
// (Each moon's own row below says how it got there.) Outside 2000-2050 nothing was measured, so
// moonOffsetKm() answers null there and the moon is not drawn: a refusal, not a guess.
//
// NONE OF THE TEN WAS LEFT OUT. Every one is inside a quarter of a percent of its own orbit except
// Mimas, at 0.38 %, and the worst already shipped here is Enceladus at 0.62 %, so all ten are
// drawn. Mimas was the one that came close to being refused; its paragraph says why.
//
// THE POLES of the ten are not fitted. Each is its PLANET'S OWN pole, IAU 2015: Saturn's
// (RA 40.589, Dec 83.537) for the five Saturnian, and for the five Uranian the ANTIPODE of
// Uranus's (RA 257.311, Dec -15.175), which is RA 77.311, Dec 15.175 -- Uranus's W decreases with
// time, so the planet turns backwards about its IAU north pole, and its moons, which go round the
// way it turns, have their orbital north at the other end of the axis. Freeing the poles was tried
// and buys between nothing (Oberon, Umbriel) and 700 km (Iapetus): the fit trades the pole against
// the inclination and the row stops meaning anything -- left free, Iapetus's pole went to
// declination -47 with a 127-degree inclination, and Titania's 10 degrees off Uranus's with 14.
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
// MIMAS AND TETHYS, WHICH PULL EACH OTHER AROUND. "Tethys is locked in an inclination resonance
// with Mimas" (Wikipedia, Tethys, read 2026-09-22), and it is not a small effect: a plain
// precessing ellipse fitted to all 5 203 vectors puts Mimas 191 876 km out -- 108 % of its orbit,
// the wrong side of Saturn -- and Tethys 15 439 km. Both swing along their tracks on the same
// roughly seventy-year beat, and by the amounts two bodies trading the same angular momentum
// should: the fit gives Mimas 42.60 degrees at 69.5 years and Tethys 2.13 degrees at 71.7, a ratio
// of 20 against their mass ratio of 16 (GM 2.503 and 41.214, JPL's satellite table). Three `lib`
// terms each -- that beat, a 25-year one, and a 0.62-year one -- bring Mimas to 703 km and Tethys
// to 119. What is left on Mimas is mostly the wobble Saturn's bulge puts into a close orbit twice
// a lap, which is a short-period term and NOT something mean elements carry at all; 0.38 % of the
// orbit is where a model of this shape stops, and at 3.5 Mimas radii it is still a third of the
// error this file already ships on Enceladus (6 Enceladus radii), so Mimas is drawn.
//
// TWO VECTORS, NOT ONE (`k2, h2, w2dot` and `q2, p2, o2dot`). A moon's eccentricity is not one
// ellipse slowly turning: it is the moon's own ellipse PLUS the one its neighbours and the Sun
// force on it, each turning at its own rate, so the eccentricity beats. Titania's runs from 0.0001
// to 0.0025 and back inside these fifty years and Oberon's from 0.0005 to 0.0024 (measured from
// Horizons states), which one turning vector cannot do: it left them 1 436 and 1 916 km out.
// A second vector, added the same way the first works, takes them to 996 and 1 230. Rhea, Ariel,
// Umbriel and Mimas carry one too; Iapetus carries the INCLINATION version instead.
//
// IAPETUS is 3.56 million km out, sixty Saturn radii, "just outside" the Laplace radius where the
// Sun rather than Saturn's bulge sets which way an orbit precesses (Wikipedia, Iapetus, read
// 2026-09-22). Its orbit plane is a sum of two: 23.0 degrees from Saturn's equator turning once in
// about 3 500 years, and a second 7.9 degrees turning once in about 965. With only the first it is
// 9 059 km off; with both, and two `lib` terms (30 and 15 years), 6 800 -- 0.19 % of its orbit,
// which is the best of any moon here in Saturn radii and the worst in kilometres, because its
// orbit is thirty times Rhea's.
//
// THE URANIAN FIVE all sit close to Uranus's equator, which is steeply inclined to the ecliptic --
// 98 degrees -- so their poles are not a detail: swap Uranus's IAU pole for its antipode and every
// one of them goes round the wrong way. Miranda is the odd one, 4.43 degrees off the equator where
// the other four are under 0.2, and its node goes round in 17.8 years, so fifty years of data see
// it turn nearly three times. All five carry a longitude term the fit puts at 12.5 years -- 1.44
// degrees on Miranda, 0.098 on Ariel, 0.036 on Umbriel -- plus, for the inner three, its second
// and third harmonics. WHAT FORCES IT IS NOT IDENTIFIED HERE: it is not a mean-motion
// commensurability between any pair of them, and it is the same period for moons whose own
// apsidal rates differ by a factor of three, so it is something the whole system shares. It is
// kept because it is measured and because it earns its place -- without it Miranda is 4 546 km out
// and with it 117.
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
// helped; for the ten of 2026-09-22 it is the planet's own IAU 2015 pole, held); the orbit is
// (q0, p0) = tan(i/2) (cos, sin) node and (k0, h0) = e (cos, sin) longitude of periapsis at the
// epoch, turned by `odot` and `wdot`; the mean longitude is L0 + n t + c2 t^2, plus up to three
// sine terms (`lib*`). A row may carry a SECOND (k2, h2) turning at `w2dot` and a second (q2, p2)
// turning at `o2dot`, which add to the first: see TWO VECTORS above. Fitted 2026-09-22.
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

  // === TEN MORE (2026-09-22): Saturn's other five big round moons, then Uranus's five. Every
  // pole below is its planet's own (THE POLES above), so the inclinations are to the PLANET'S
  // EQUATOR, and each row's e and i are the fit's, not a table's.
  // e 0.0197, i 1.57 deg, a 22h36m lap. Saturn's bulge turns both the periapsis and the node once
  // a year. The three `lib` terms are the Tethys resonance and what rides on it: 42.60 deg at 69.5
  // years, 0.84 at 24.9, 0.15 at 0.62 (MIMAS AND TETHYS above). Without them: 191 876 km.
  mimas: {
    parent: 'saturn',
    poleRa: 40.589, poleDec: 83.537, a: 185535.1265927,
    L0: 158.3902682739, n: 381.9945092969,
    k0: 0.00862850926135, h0: -0.01766553480363, wdot: 1.00091755592,
    q0: 0.01102407367799, p0: 0.008199480544083, odot: -0.9994977425105,
    k2: -0.00007447379921578, h2: 0.000164981275105, w2dot: -0.5953852682746,
    libA: 6.123081797928, libB: -42.15710507459, libNu: 0.01418797961319,
    lib2A: -0.3466227767618, lib2B: 0.7644857018975, lib2Nu: 0.03965789279891,
    lib3A: -0.1510440528992, lib3B: -0.01165706532581, lib3Nu: 1.599140497007,
  },
  // Almost a circle (the fit gives e 0.00014; NASA's Saturnian satellite fact sheet prints 0.0000),
  // i 1.09 deg, periapsis and node each round once in 5.0 years. Its three `lib` terms are the
  // Mimas resonance seen from the heavier side: 2.13 deg at 71.7 years against Mimas's 42.60.
  tethys: {
    parent: 'saturn',
    poleRa: 40.589, poleDec: 83.537, a: 294673.3183277,
    L0: 115.9562608417, n: 190.6979115325,
    k0: -0.00001214438447955, h0: 0.0001387592560128, wdot: 0.1983311118945,
    q0: -0.003061654778552, p0: 0.009020800789971, odot: -0.1978523008284,
    libA: -0.3044531692623, libB: 2.111419129196, libNu: 0.01375319968025,
    lib2A: 0.01300830921036, lib2B: -0.02654517250679, lib2Nu: 0.0449678250059,
    lib3A: 0.007296536194859, lib3B: 0.0005636211792911, lib3Nu: 1.599295464955,
  },
  // e 0.0022, i 0.028 deg -- the flattest orbit of the five Saturnian, and the periapsis and node
  // each go round in 11.7 years. Two `lib` terms (11.0 and 3.9 years, 0.021 and 0.014 deg, 136 and
  // 93 km) halve the error; Dione is the one holding Enceladus in its own resonance.
  dione: {
    parent: 'saturn',
    poleRa: 40.589, poleDec: 83.537, a: 377415.1607184,
    L0: 228.7371223517, n: 131.5349309069,
    k0: 0.001769041313447, h0: -0.001270705033294, wdot: 0.08430339147812,
    q0: -0.0002476771509441, p0: -0.00001937016611702, odot: -0.08418367259591,
    libA: 0.01058972177638, libB: 0.01780236210771, libNu: 0.08931842711738,
    lib2A: -0.00716893309168, lib2B: 0.0122254518301, lib2Nu: 0.2535550658198,
  },
  // e 0.00096, i 0.33 deg, node round in 35.8 years -- slow enough that fifty years of data see
  // only 1.4 turns of it. Carries both second vectors: a 0.00015 eccentricity turning in 35.6
  // years and a 0.033-degree tilt turning in 1 742, which take it from 438 km to 199.
  rhea: {
    parent: 'saturn',
    poleRa: 40.589, poleDec: 83.537, a: 527067.6708596,
    L0: 35.62831665554, n: 79.69004593224,
    k0: -0.0007607855665641, h0: -0.0005926604603909, wdot: 0.001424759319989,
    q0: 0.0005331950756662, p0: 0.002869003585348, odot: -0.02753245858088,
    k2: -0.0001270942548902, h2: 0.00007451191198441, w2dot: 0.02768837712896,
    q2: -0.0001146797114194, p2: -0.000263036662369, o2dot: 0.0005658775949166,
    libA: -0.002451602135129, libB: -0.001013679113378, libNu: 0.06555027335176,
  },
  // e 0.029, and an orbit plane that is two (IAPETUS above): 23.0 deg from Saturn's equator turning
  // once in ~3 500 years plus 7.9 deg once in ~965. 79.33-day laps, so the 4.54 deg/day here is the
  // slowest mean motion in this file by a factor of five.
  iapetus: {
    parent: 'saturn',
    poleRa: 40.589, poleDec: 83.537, a: 3560842.060924,
    L0: 200.8883166045, n: 4.537947205736,
    k0: -0.01263644059578, h0: -0.02571912080469, wdot: 0.0003039169490942,
    q0: -0.03127388721807, p0: -0.2010202937197, odot: 0.000278817201211,
    q2: -0.009075779620289, p2: 0.06801356001921, o2dot: 0.001021003820583,
    libA: -0.01732757388956, libB: 0.0610642443875, libNu: 0.03258329301854,
    lib2A: 0.01347438321917, lib2B: -0.01776912615648, lib2Nu: 0.06765020715882,
  },
  // e 0.0014 and i 4.43 deg -- ten times the tilt of the other four, which Wikipedia (Miranda, read
  // 2026-09-22) says nobody has explained. Node round in 17.8 years, periapsis in 18.0. The three
  // `lib` terms are the 12.5-year one of THE URANIAN FIVE and its second and third harmonics.
  miranda: {
    parent: 'uranus',
    poleRa: 77.311, poleDec: 15.175, a: 129847.7162648,
    L0: 240.8396765893, n: 254.690659771,
    k0: 0.0003128996224089, h0: 0.001316118315502, wdot: 0.05473178402885,
    q0: 0.002980667369587, p0: -0.03852811157618, odot: -0.05541299216549,
    libA: 1.400269704539, libB: 0.3212402412839, libNu: 0.078575067495,
    lib2A: 0.1595537146974, lib2B: 0.0752179997863, lib2Nu: 0.1572662708688,
    lib3A: -0.01335328894304, lib3B: -0.01130159803376, lib3Nu: 0.2344200951058,
  },
  // e 0.0013, i 0.011 deg: the flattest orbit of any moon in this file. Carries both second vectors
  // (a 0.00088 eccentricity turning in 113 years, a 0.010-deg tilt in 761) and three `lib` terms,
  // and ends up the most accurate of the Uranian five, 114 km over fifty years.
  ariel: {
    parent: 'uranus',
    poleRa: 77.311, poleDec: 15.175, a: 190929.4077792,
    L0: 96.9538276764, n: 142.8356440371,
    k0: -0.0004334220747213, h0: -0.001263521079384, wdot: 0.01688711740979,
    q0: -0.00002205833647979, p0: 0.0000915418724646, odot: -0.05580303629622,
    k2: 0.0003122302271848, h2: 0.0008185041775599, w2dot: 0.008695054647615,
    q2: -0.00001247104186587, p2: 0.00008492778313893, o2dot: -0.00129491390306,
    libA: -0.09564741248594, libB: -0.02185956799833, libNu: 0.07849113103875,
    lib2A: -0.01057365024881, lib2B: -0.004665625209885, lib2Nu: 0.156863939254,
    lib3A: 0.04460635901731, lib3B: 0.04010992446153, lib3Nu: 0.006216894881882,
  },
  // e 0.0037, the largest of Uranus's five, i 0.077 deg, periapsis round in 118 years. One second
  // eccentricity vector (0.0001 at 54 years) and one `lib` term (12.6 years, 0.036 deg, 168 km).
  umbriel: {
    parent: 'uranus',
    poleRa: 77.311, poleDec: 15.175, a: 265981.3592321,
    L0: 108.7165689273, n: 86.86887432907,
    k0: 0.001332929429233, h0: 0.003494830716022, wdot: 0.008387897327916,
    q0: -0.000125323720975, p0: 0.0006639301786714, odot: -0.007787180682258,
    k2: 0.00000852200785292, h2: 0.0001021931706466, w2dot: 0.01829771076109,
    libA: 0.03547719507751, libB: 0.007467088902807, libNu: 0.07828757684137,
  },
  // e 0.0010 and a second eccentricity of 0.00094 turning so slowly that fifty years cannot tell
  // the two rates apart -- which is exactly why the pair is needed: together they take the real
  // eccentricity from 0.0001 to 0.0025 and back inside the span (TWO VECTORS above). i 0.045 deg.
  titania: {
    parent: 'uranus',
    poleRa: 77.311, poleDec: 15.175, a: 436281.1273122,
    L0: 188.5746113062, n: 41.35141500795,
    k0: 0.0004661318181546, h0: -0.0009375166185702, wdot: 0.006715466392266,
    q0: 0.0003902270317994, p0: 0.00003861252633779, odot: 0.003787144694644,
    k2: -0.0006699829235894, h2: -0.0006578340621705, w2dot: 0.0004359836059125,
    libA: 0.01154113741488, libB: -0.004092104697843, libNu: 0.02411690268279,
    lib2A: 0.003382766458627, lib2B: -0.003349828304687, lib2Nu: 0.3430175390796,
  },
  // e 0.0014 with a second of 0.00072 at 149 years, i 0.195 deg, 13.46-day laps. The outermost of
  // the ten and, with Titania, the least well fitted: 1 230 km, 0.21 % of its orbit, most of it in
  // the eccentricity the two vectors still do not quite follow.
  oberon: {
    parent: 'uranus',
    poleRa: 77.311, poleDec: 15.175, a: 583448.7835175,
    L0: 163.9835866728, n: 26.73948239675,
    k0: -0.001100743359164, h0: -0.0009273566449157, wdot: 0.001421374506954,
    q0: 0.001566707160718, p0: 0.0006676363095443, odot: -0.001709927138477,
    k2: -0.00045030982836, h2: 0.0005594831854751, w2dot: 0.006624743560731,
    libA: 0.01785108577489, libB: -0.006738591887288, libNu: 0.02474090292946,
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
  if (el.lib3Nu) lon += el.lib3A * Math.sin(el.lib3Nu * t * DEG) + el.lib3B * Math.cos(el.lib3Nu * t * DEG);
  const lam = lon * DEG;

  // The ellipse and the plane, each turned by its own steady rate since the epoch.
  const w = el.wdot * t * DEG;
  let k = el.k0 * Math.cos(w) - el.h0 * Math.sin(w);
  let h = el.k0 * Math.sin(w) + el.h0 * Math.cos(w);
  const o = el.odot * t * DEG;
  let q = el.q0 * Math.cos(o) - el.p0 * Math.sin(o);
  let p = el.q0 * Math.sin(o) + el.p0 * Math.cos(o);
  // A SECOND vector turning at its own rate, where one is not enough (SECOND VECTORS above).
  if (el.w2dot !== undefined) {
    const w2 = el.w2dot * t * DEG;
    k += el.k2 * Math.cos(w2) - el.h2 * Math.sin(w2);
    h += el.k2 * Math.sin(w2) + el.h2 * Math.cos(w2);
  }
  if (el.o2dot !== undefined) {
    const o2 = el.o2dot * t * DEG;
    q += el.q2 * Math.cos(o2) - el.p2 * Math.sin(o2);
    p += el.q2 * Math.sin(o2) + el.p2 * Math.cos(o2);
  }

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
