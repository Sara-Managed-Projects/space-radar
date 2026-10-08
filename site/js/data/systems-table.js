// GENERATED from registry/systems-generated.yaml by scripts/gen_systems_more_js.py. Do not edit.
//
// `python3 scripts/gen_systems_more_js.py --check` fails CI if this file and the YAML disagree. The
// YAML is generated too (scripts/build-systems.py, from the NASA Exoplanet Archive's table): to
// change a number, pull the table again; to change which stars are here, edit
// registry/systems-list.yaml.
//
// NOT ON THE FIRST VISIT, and not with the table either: scene/systems.js loads this the first
// time one of these systems is asked for. `aFrom: kepler` is an orbit computed from the year and
// the star's mass; `*From: estimated` is the Archive's own estimate; `equilibriumK`, `insolationEarths`
// and `zone` are computed (scripts/build-systems.py says how). A field left out is not measured.

/** The share of light a planet is taken to reflect when its temperature is computed (the Earth's). */
export const SYSTEMS_ALBEDO = 0.3;

/** The day the Archive's table was read. */
export const SYSTEMS_AS_OF = "2026-10-08";

/** Every generated system in full: what scene/systems.js draws and the card prints. */
export const SYSTEMS_TABLE = [
{
"id": "proxima-cen",
"stage": "system-proxima-cen",
"host": "Proxima Cen",
"display": "Proxima Centauri",
"aliases": [],
"hostId": "star-proxima-cen",
"hostSky": {
"raDeg": 217.393,
"decDeg": -62.6762,
"distPc": 1.301,
"spect": "M5.5 V"
},
"star": {
"radiusSuns": 0.141,
"teffK": 2900.0,
"massSuns": 0.1221,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Proxima%20Cen (read 2026-10-08)",
"lumSuns": 0.00151,
"lumFrom": "table"
},
"starsInSystem": 3,
"zone": {
"innerAu": 0.04051,
"outerAu": 0.08096,
"wideInnerAu": 0.03198,
"wideOuterAu": 0.08539
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-proxima-cen-d",
"name": "Proxima Cen d",
"periodDays": 5.12338,
"aAu": 0.02881,
"aFrom": "table",
"radiusEarths": 0.692,
"radiusFrom": "estimated",
"massEarths": 0.26,
"massFrom": "least",
"eccentricity": 0.0,
"method": "Radial Velocity",
"year": 2025,
"insolationEarths": 1.82,
"equilibriumK": 296,
"zone": "hotter"
},
{
"id": "exo-proxima-cen-b",
"name": "Proxima Cen b",
"periodDays": 11.1846,
"aAu": 0.04848,
"aFrom": "table",
"radiusEarths": 1.02,
"radiusFrom": "estimated",
"massEarths": 1.055,
"massFrom": "least",
"eccentricity": 0.0,
"transitMidJd": 2457897.9,
"method": "Radial Velocity",
"year": 2016,
"insolationEarths": 0.642,
"equilibriumK": 228,
"zone": "inside"
}
]
},
{
"id": "lhs-1140",
"stage": "system-lhs-1140",
"host": "LHS 1140",
"display": "LHS 1140",
"aliases": [],
"hostId": "star-lhs-1140",
"hostSky": {
"raDeg": 11.2486,
"decDeg": -15.2741,
"distPc": 14.986,
"spect": "M4.5 V"
},
"star": {
"radiusSuns": 0.216,
"teffK": 3096.0,
"massSuns": 0.1844,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/LHS%201140 (read 2026-10-08)",
"lumSuns": 0.0038,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.06414,
"outerAu": 0.127,
"wideInnerAu": 0.05064,
"wideOuterAu": 0.134
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-lhs-1140-c",
"name": "LHS 1140 c",
"periodDays": 3.77794,
"aAu": 0.027,
"aFrom": "table",
"radiusEarths": 1.272,
"radiusFrom": "measured",
"massEarths": 1.91,
"massFrom": "measured",
"eccentricity": 0.05,
"transitMidJd": 2458389.2939,
"method": "Transit",
"year": 2018,
"insolationEarths": 5.21,
"equilibriumK": 385,
"zone": "hotter"
},
{
"id": "exo-lhs-1140-b",
"name": "LHS 1140 b",
"periodDays": 24.7372,
"aAu": 0.0946,
"aFrom": "table",
"radiusEarths": 1.73,
"radiusFrom": "measured",
"massEarths": 5.6,
"massFrom": "measured",
"eccentricity": 0.043,
"transitMidJd": 2458399.93,
"method": "Transit",
"year": 2017,
"insolationEarths": 0.425,
"equilibriumK": 206,
"zone": "inside"
}
]
},
{
"id": "kepler-186",
"stage": "system-kepler-186",
"host": "Kepler-186",
"display": "Kepler-186",
"aliases": [],
"hostId": "star-kepler-186",
"hostSky": {
"raDeg": 298.653,
"decDeg": 43.955,
"distPc": 177.594,
"spect": "M1"
},
"star": {
"radiusSuns": 0.472,
"teffK": 3788.0,
"massSuns": 0.478,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-186 (read 2026-10-08)",
"lumSuns": 0.04121,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.2094,
"outerAu": 0.401,
"wideInnerAu": 0.1653,
"wideOuterAu": 0.4229
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-186-b",
"name": "Kepler-186 b",
"periodDays": 3.88679,
"aAu": 0.03783,
"aFrom": "kepler",
"aTableAu": 0.0343,
"radiusEarths": 1.07,
"radiusFrom": "measured",
"massEarths": 1.24,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454966.3304,
"method": "Transit",
"year": 2014,
"insolationEarths": 28.8,
"equilibriumK": 590,
"zone": "hotter"
},
{
"id": "exo-kepler-186-c",
"name": "Kepler-186 c",
"periodDays": 7.2673,
"aAu": 0.05741,
"aFrom": "kepler",
"aTableAu": 0.0451,
"radiusEarths": 1.25,
"radiusFrom": "measured",
"massEarths": 2.1,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455007.3142,
"method": "Transit",
"year": 2014,
"insolationEarths": 12.5,
"equilibriumK": 479,
"zone": "hotter"
},
{
"id": "exo-kepler-186-d",
"name": "Kepler-186 d",
"periodDays": 13.343,
"aAu": 0.08608,
"aFrom": "kepler",
"aTableAu": 0.0781,
"radiusEarths": 1.4,
"radiusFrom": "measured",
"massEarths": 2.54,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455009.9045,
"method": "Transit",
"year": 2014,
"insolationEarths": 5.56,
"equilibriumK": 391,
"zone": "hotter"
},
{
"id": "exo-kepler-186-e",
"name": "Kepler-186 e",
"periodDays": 22.4077,
"aAu": 0.1216,
"aFrom": "kepler",
"aTableAu": 0.11,
"radiusEarths": 1.27,
"radiusFrom": "measured",
"massEarths": 2.15,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454986.8006,
"method": "Transit",
"year": 2014,
"insolationEarths": 2.79,
"equilibriumK": 329,
"zone": "hotter"
},
{
"id": "exo-kepler-186-f",
"name": "Kepler-186 f",
"periodDays": 129.944,
"aAu": 0.3926,
"aFrom": "kepler",
"aTableAu": 0.432,
"radiusEarths": 1.17,
"radiusFrom": "measured",
"massEarths": 1.71,
"massFrom": "estimated",
"eccentricity": 0.04,
"transitMidJd": 2455789.494,
"method": "Transit",
"year": 2014,
"insolationEarths": 0.267,
"equilibriumK": 183,
"zone": "inside"
}
]
},
{
"id": "kepler-452",
"stage": "system-kepler-452",
"host": "Kepler-452",
"display": "Kepler-452",
"aliases": [],
"hostId": "star-kepler-452",
"hostSky": {
"raDeg": 296.004,
"decDeg": 44.2776,
"distPc": 551.727,
"spect": "G2"
},
"star": {
"radiusSuns": 1.11,
"teffK": 5757.0,
"massSuns": 1.037,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-452 (read 2026-10-08)",
"lumSuns": 1.215,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.049,
"outerAu": 1.851,
"wideInnerAu": 0.8283,
"wideOuterAu": 1.952
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-452-b",
"name": "Kepler-452 b",
"periodDays": 384.843,
"aAu": 1.046,
"aFrom": "table",
"radiusEarths": 1.63,
"radiusFrom": "measured",
"massEarths": 3.29,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455147.985,
"method": "Transit",
"year": 2015,
"insolationEarths": 1.11,
"equilibriumK": 261,
"zone": "edge"
}
]
},
{
"id": "kepler-62",
"stage": "system-kepler-62",
"host": "Kepler-62",
"display": "Kepler-62",
"aliases": [],
"hostId": "star-kepler-62",
"hostSky": {
"raDeg": 283.213,
"decDeg": 45.3497,
"distPc": 300.874,
"spect": "K2 V"
},
"star": {
"radiusSuns": 0.64,
"teffK": 4925.0,
"massSuns": 0.69,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-62 (read 2026-10-08)",
"lumSuns": 0.2099,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.4561,
"outerAu": 0.828,
"wideInnerAu": 0.3601,
"wideOuterAu": 0.8733
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-62-b",
"name": "Kepler-62 b",
"periodDays": 5.71493,
"aAu": 0.0553,
"aFrom": "table",
"radiusEarths": 1.31,
"radiusFrom": "measured",
"massEarths": 9.0,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2455003.9189,
"method": "Transit",
"year": 2013,
"insolationEarths": 68.6,
"equilibriumK": 733,
"zone": "hotter"
},
{
"id": "exo-kepler-62-c",
"name": "Kepler-62 c",
"periodDays": 12.4417,
"aAu": 0.0929,
"aFrom": "table",
"radiusEarths": 0.54,
"radiusFrom": "measured",
"massEarths": 4.0,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2454967.651,
"method": "Transit",
"year": 2013,
"insolationEarths": 24.3,
"equilibriumK": 565,
"zone": "hotter"
},
{
"id": "exo-kepler-62-d",
"name": "Kepler-62 d",
"periodDays": 18.1641,
"aAu": 0.12,
"aFrom": "table",
"radiusEarths": 1.95,
"radiusFrom": "measured",
"massEarths": 14.0,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2455013.8117,
"method": "Transit",
"year": 2013,
"insolationEarths": 14.6,
"equilibriumK": 497,
"zone": "hotter"
},
{
"id": "exo-kepler-62-e",
"name": "Kepler-62 e",
"periodDays": 122.387,
"aAu": 0.427,
"aFrom": "table",
"radiusEarths": 1.61,
"radiusFrom": "measured",
"massEarths": 36.0,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2454983.404,
"method": "Transit",
"year": 2013,
"insolationEarths": 1.15,
"equilibriumK": 264,
"zone": "edge"
},
{
"id": "exo-kepler-62-f",
"name": "Kepler-62 f",
"periodDays": 267.291,
"aAu": 0.718,
"aFrom": "table",
"radiusEarths": 1.41,
"radiusFrom": "measured",
"massEarths": 35.0,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2455422.71,
"method": "Transit",
"year": 2013,
"insolationEarths": 0.407,
"equilibriumK": 203,
"zone": "inside"
}
]
},
{
"id": "kepler-442",
"stage": "system-kepler-442",
"host": "Kepler-442",
"display": "Kepler-442",
"aliases": [],
"hostId": "star-kepler-442",
"hostSky": {
"raDeg": 285.367,
"decDeg": 39.2801,
"distPc": 365.965,
"spect": null
},
"star": {
"radiusSuns": 0.598,
"teffK": 4402.0,
"massSuns": 0.609,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-442 (read 2026-10-08)",
"lumSuns": 0.1169,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.3475,
"outerAu": 0.6455,
"wideInnerAu": 0.2743,
"wideOuterAu": 0.6809
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-442-b",
"name": "Kepler-442 b",
"periodDays": 112.305,
"aAu": 0.3861,
"aFrom": "kepler",
"aTableAu": 0.409,
"radiusEarths": 1.34,
"radiusFrom": "measured",
"massEarths": 2.36,
"massFrom": "estimated",
"eccentricity": 0.04,
"transitMidJd": 2455849.5578,
"method": "Transit",
"year": 2015,
"insolationEarths": 0.784,
"equilibriumK": 240,
"zone": "inside"
}
]
},
{
"id": "kepler-22",
"stage": "system-kepler-22",
"host": "Kepler-22",
"display": "Kepler-22",
"aliases": [],
"hostId": "star-kepler-22",
"hostSky": {
"raDeg": 289.217,
"decDeg": 47.8841,
"distPc": 194.642,
"spect": "G5 V"
},
"star": {
"radiusSuns": 0.869,
"teffK": 5596.0,
"massSuns": 0.857,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-22 (read 2026-10-08)",
"lumSuns": 0.6453,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.7719,
"outerAu": 1.368,
"wideInnerAu": 0.6094,
"wideOuterAu": 1.443
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-22-b",
"name": "Kepler-22 b",
"periodDays": 289.864,
"aAu": 0.812,
"aFrom": "table",
"radiusEarths": 2.1,
"radiusFrom": "measured",
"massEarths": 9.1,
"massFrom": "measured",
"eccentricity": 0.72,
"transitMidJd": 2454966.7001,
"method": "Transit",
"year": 2011,
"insolationEarths": 0.979,
"equilibriumK": 253,
"zone": "inside"
}
]
},
{
"id": "kepler-69",
"stage": "system-kepler-69",
"host": "Kepler-69",
"display": "Kepler-69",
"aliases": [],
"hostId": "star-kepler-69",
"hostSky": {
"raDeg": 293.261,
"decDeg": 44.8689,
"distPc": 730.625,
"spect": "G4 V"
},
"star": {
"radiusSuns": 0.93,
"teffK": 5638.0,
"massSuns": 0.81,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-69 (read 2026-10-08)",
"lumSuns": 0.7998,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.8572,
"outerAu": 1.518,
"wideInnerAu": 0.6768,
"wideOuterAu": 1.601
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-69-b",
"name": "Kepler-69 b",
"periodDays": 13.7223,
"aAu": 0.1046,
"aFrom": "kepler",
"aTableAu": 0.094,
"radiusEarths": 2.24,
"radiusFrom": "measured",
"massEarths": 5.65,
"massFrom": "estimated",
"eccentricity": 0.16,
"transitMidJd": 2454970.8414,
"method": "Transit",
"year": 2013,
"insolationEarths": 73.1,
"equilibriumK": 744,
"zone": "hotter"
},
{
"id": "exo-kepler-69-c",
"name": "Kepler-69 c",
"periodDays": 242.461,
"aAu": 0.7094,
"aFrom": "kepler",
"aTableAu": 0.64,
"radiusEarths": 1.71,
"radiusFrom": "measured",
"massEarths": 3.57,
"massFrom": "estimated",
"eccentricity": 0.14,
"transitMidJd": 2454983.87,
"method": "Transit",
"year": 2013,
"insolationEarths": 1.59,
"equilibriumK": 286,
"zone": "edge"
}
]
},
{
"id": "toi-700",
"stage": "system-toi-700",
"host": "TOI-700",
"display": "TOI-700",
"aliases": [],
"hostId": "star-toi-700",
"hostSky": {
"raDeg": 97.0957,
"decDeg": -65.5786,
"distPc": 31.127,
"spect": "M2.5 V"
},
"star": {
"radiusSuns": 0.41,
"teffK": 3459.0,
"massSuns": 0.417,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/TOI-700 (read 2026-10-08)",
"lumSuns": 0.0233,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.1582,
"outerAu": 0.3079,
"wideInnerAu": 0.1249,
"wideOuterAu": 0.3248
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-toi-700-b",
"name": "TOI-700 b",
"periodDays": 9.97722,
"aAu": 0.0678,
"aFrom": "table",
"radiusEarths": 0.963,
"radiusFrom": "measured",
"massEarths": 0.849,
"massFrom": "estimated",
"eccentricity": 0.032,
"transitMidJd": 2458880.0994,
"method": "Transit",
"year": 2020,
"insolationEarths": 5.07,
"equilibriumK": 382,
"zone": "hotter"
},
{
"id": "exo-toi-700-c",
"name": "TOI-700 c",
"periodDays": 16.0511,
"aAu": 0.0931,
"aFrom": "table",
"radiusEarths": 2.535,
"radiusFrom": "measured",
"massEarths": 6.96,
"massFrom": "estimated",
"eccentricity": 0.033,
"transitMidJd": 2458821.6219,
"method": "Transit",
"year": 2020,
"insolationEarths": 2.69,
"equilibriumK": 326,
"zone": "hotter"
},
{
"id": "exo-toi-700-e",
"name": "TOI-700 e",
"periodDays": 27.8101,
"aAu": 0.1336,
"aFrom": "table",
"radiusEarths": 0.919,
"radiusFrom": "measured",
"massEarths": 0.718,
"massFrom": "estimated",
"eccentricity": 0.059,
"transitMidJd": 2460772.46343,
"method": "Transit",
"year": 2023,
"insolationEarths": 1.31,
"equilibriumK": 272,
"zone": "edge"
},
{
"id": "exo-toi-700-d",
"name": "TOI-700 d",
"periodDays": 37.4235,
"aAu": 0.1642,
"aFrom": "table",
"radiusEarths": 1.145,
"radiusFrom": "measured",
"massEarths": 1.58,
"massFrom": "estimated",
"eccentricity": 0.042,
"transitMidJd": 2460763.01612,
"method": "Transit",
"year": 2020,
"insolationEarths": 0.864,
"equilibriumK": 245,
"zone": "inside"
}
]
},
{
"id": "toi-715",
"stage": "system-toi-715",
"host": "TOI-715",
"display": "TOI-715",
"aliases": [],
"hostId": "star-toi-715",
"hostSky": {
"raDeg": 113.852,
"decDeg": -73.5774,
"distPc": 42.405,
"spect": "M4"
},
"star": {
"radiusSuns": 0.24,
"teffK": 3075.0,
"massSuns": 0.225,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/TOI-715 (read 2026-10-08)",
"lumSuns": 0.004909,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.07291,
"outerAu": 0.1445,
"wideInnerAu": 0.05757,
"wideOuterAu": 0.1525
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-toi-715-b",
"name": "TOI-715 b",
"periodDays": 19.288,
"aAu": 0.08561,
"aFrom": "kepler",
"aTableAu": 0.083,
"radiusEarths": 1.55,
"radiusFrom": "measured",
"massEarths": 3.02,
"massFrom": "estimated",
"transitMidJd": 2459002.63051,
"method": "Transit",
"year": 2023,
"insolationEarths": 0.67,
"equilibriumK": 230,
"zone": "inside"
}
]
},
{
"id": "teegardens-star",
"stage": "system-teegardens-star",
"host": "Teegarden's Star",
"display": "Teegarden's Star",
"aliases": [],
"hostId": "star-teegardens-star",
"hostSky": {
"raDeg": 43.2691,
"decDeg": 16.8649,
"distPc": 3.831,
"spect": "M7.0 V"
},
"star": {
"radiusSuns": 0.12,
"teffK": 3034.0,
"massSuns": 0.097,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Teegarden%27s%20Star (read 2026-10-08)",
"lumSuns": 0.000722,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.02797,
"outerAu": 0.05556,
"wideInnerAu": 0.02209,
"wideOuterAu": 0.05861
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-teegarden-s-star-b",
"name": "Teegarden's Star b",
"periodDays": 4.90634,
"aAu": 0.0259,
"aFrom": "table",
"radiusEarths": 1.05,
"radiusFrom": "estimated",
"massEarths": 1.16,
"massFrom": "least",
"eccentricity": 0.03,
"method": "Radial Velocity",
"year": 2019,
"insolationEarths": 1.08,
"equilibriumK": 259,
"zone": "edge"
},
{
"id": "exo-teegarden-s-star-c",
"name": "Teegarden's Star c",
"periodDays": 11.416,
"aAu": 0.0455,
"aFrom": "table",
"radiusEarths": 1.02,
"radiusFrom": "estimated",
"massEarths": 1.05,
"massFrom": "least",
"eccentricity": 0.04,
"method": "Radial Velocity",
"year": 2019,
"insolationEarths": 0.349,
"equilibriumK": 196,
"zone": "inside"
},
{
"id": "exo-teegarden-s-star-d",
"name": "Teegarden's Star d",
"periodDays": 26.13,
"aAu": 0.0791,
"aFrom": "table",
"radiusEarths": 0.954,
"radiusFrom": "estimated",
"massEarths": 0.82,
"massFrom": "least",
"eccentricity": 0.07,
"method": "Radial Velocity",
"year": 2024,
"insolationEarths": 0.115,
"equilibriumK": 148,
"zone": "colder"
}
]
},
{
"id": "gliese-12",
"stage": "system-gliese-12",
"host": "Gliese 12",
"display": "Gliese 12",
"aliases": [
"GJ 12"
],
"hostId": "star-gliese-12",
"hostSky": {
"raDeg": 3.95791,
"decDeg": 13.5576,
"distPc": 12.21,
"spect": "M4 V"
},
"star": {
"radiusSuns": 0.265,
"teffK": 3328.0,
"massSuns": 0.255,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Gliese%2012 (read 2026-10-08)",
"lumSuns": 0.00728,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.08857,
"outerAu": 0.1735,
"wideInnerAu": 0.06992,
"wideOuterAu": 0.183
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-gliese-12-b",
"name": "Gliese 12 b",
"periodDays": 12.7614,
"aAu": 0.067,
"aFrom": "table",
"radiusEarths": 0.93,
"radiusFrom": "measured",
"massEarths": 0.95,
"massFrom": "measured",
"eccentricity": 0.24,
"transitMidJd": 2460033.16351,
"method": "Transit",
"year": 2024,
"insolationEarths": 1.62,
"equilibriumK": 287,
"zone": "hotter"
}
]
},
{
"id": "k2-18",
"stage": "system-k2-18",
"host": "K2-18",
"display": "K2-18",
"aliases": [],
"hostId": "star-k2-18",
"hostSky": {
"raDeg": 172.56,
"decDeg": 7.58783,
"distPc": 38.027,
"spect": "M2.5 V"
},
"star": {
"radiusSuns": 0.411,
"teffK": 3457.0,
"massSuns": 0.359,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/K2-18 (read 2026-10-08)",
"lumSuns": 0.0253,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.1649,
"outerAu": 0.3209,
"wideInnerAu": 0.1302,
"wideOuterAu": 0.3385
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-k2-18-c",
"name": "K2-18 c",
"periodDays": 8.962,
"aAu": 0.06,
"aFrom": "table",
"radiusEarths": 2.65,
"radiusFrom": "estimated",
"massEarths": 7.51,
"massFrom": "least",
"eccentricity": 0.47,
"method": "Radial Velocity",
"year": 2017,
"insolationEarths": 7.03,
"equilibriumK": 415,
"zone": "hotter"
},
{
"id": "exo-k2-18-b",
"name": "K2-18 b",
"periodDays": 32.9396,
"aAu": 0.1429,
"aFrom": "table",
"radiusEarths": 2.37,
"radiusFrom": "measured",
"massEarths": 8.92,
"massFrom": "measured",
"eccentricity": 0.2,
"transitMidJd": 2457264.39144,
"method": "Transit",
"year": 2015,
"insolationEarths": 1.24,
"equilibriumK": 269,
"zone": "edge"
}
]
},
{
"id": "l-98-59",
"stage": "system-l-98-59",
"host": "L 98-59",
"display": "L 98-59",
"aliases": [],
"hostId": "star-l-98-59",
"hostSky": {
"raDeg": 124.533,
"decDeg": -68.3145,
"distPc": 10.619,
"spect": "M3 V"
},
"star": {
"radiusSuns": 0.316,
"teffK": 3415.0,
"massSuns": 0.2923,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/L%2098-59 (read 2026-10-08)",
"lumSuns": 0.0122,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.1145,
"outerAu": 0.2234,
"wideInnerAu": 0.09043,
"wideOuterAu": 0.2357
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-l-98-59-b",
"name": "L 98-59 b",
"periodDays": 2.25311,
"aAu": 0.0223,
"aFrom": "table",
"radiusEarths": 0.837,
"radiusFrom": "measured",
"massEarths": 0.46,
"massFrom": "measured",
"eccentricity": 0.031,
"transitMidJd": 2458366.17056,
"method": "Transit",
"year": 2019,
"insolationEarths": 24.5,
"equilibriumK": 567,
"zone": "hotter"
},
{
"id": "exo-l-98-59-c",
"name": "L 98-59 c",
"periodDays": 3.69068,
"aAu": 0.0309,
"aFrom": "table",
"radiusEarths": 1.329,
"radiusFrom": "measured",
"massEarths": 2.0,
"massFrom": "measured",
"eccentricity": 0.002,
"transitMidJd": 2458367.27303,
"method": "Transit",
"year": 2019,
"insolationEarths": 12.8,
"equilibriumK": 481,
"zone": "hotter"
},
{
"id": "exo-l-98-59-d",
"name": "L 98-59 d",
"periodDays": 7.45073,
"aAu": 0.0494,
"aFrom": "table",
"radiusEarths": 1.627,
"radiusFrom": "measured",
"massEarths": 1.64,
"massFrom": "measured",
"eccentricity": 0.006,
"transitMidJd": 2458362.74002,
"method": "Transit",
"year": 2019,
"insolationEarths": 5.0,
"equilibriumK": 381,
"zone": "hotter"
},
{
"id": "exo-l-98-59-e",
"name": "L 98-59 e",
"periodDays": 12.8278,
"aAu": 0.0712,
"aFrom": "table",
"radiusEarths": 1.49,
"radiusFrom": "estimated",
"massEarths": 2.82,
"massFrom": "least",
"eccentricity": 0.012,
"transitMidJd": 2458438.48,
"method": "Radial Velocity",
"year": 2021,
"insolationEarths": 2.41,
"equilibriumK": 317,
"zone": "hotter"
},
{
"id": "exo-l-98-59-f",
"name": "L 98-59 f",
"periodDays": 23.064,
"aAu": 0.1052,
"aFrom": "table",
"radiusEarths": 1.48,
"radiusFrom": "estimated",
"massEarths": 2.8,
"massFrom": "least",
"eccentricity": 0.044,
"transitMidJd": 2458437.84,
"method": "Radial Velocity",
"year": 2025,
"insolationEarths": 1.1,
"equilibriumK": 261,
"zone": "edge"
}
]
},
{
"id": "gj-1132",
"stage": "system-gj-1132",
"host": "GJ 1132",
"display": "GJ 1132",
"aliases": [
"Gliese 1132"
],
"hostId": "star-gj-1132",
"hostSky": {
"raDeg": 153.709,
"decDeg": -47.1549,
"distPc": 12.613,
"spect": "M4.5 V"
},
"star": {
"radiusSuns": 0.221,
"teffK": 3090.0,
"massSuns": 0.1945,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/GJ%201132 (read 2026-10-08)",
"lumSuns": 0.00477,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.07186,
"outerAu": 0.1424,
"wideInnerAu": 0.05674,
"wideOuterAu": 0.1502
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-gj-1132-b",
"name": "GJ 1132 b",
"periodDays": 1.62893,
"aAu": 0.0157,
"aFrom": "table",
"radiusEarths": 1.192,
"radiusFrom": "measured",
"massEarths": 1.837,
"massFrom": "measured",
"eccentricity": 0.0118,
"transitMidJd": 2459280.98988,
"method": "Transit",
"year": 2015,
"insolationEarths": 19.4,
"equilibriumK": 534,
"zone": "hotter"
},
{
"id": "exo-gj-1132-c",
"name": "GJ 1132 c",
"periodDays": 8.929,
"aAu": 0.0488,
"aFrom": "kepler",
"aTableAu": 0.0476,
"radiusEarths": 1.52,
"radiusFrom": "estimated",
"massEarths": 2.91,
"massFrom": "least",
"eccentricity": 0.19,
"transitMidJd": 2457505.94,
"method": "Radial Velocity",
"year": 2018,
"insolationEarths": 2.0,
"equilibriumK": 303,
"zone": "hotter"
}
]
},
{
"id": "gj-1214",
"stage": "system-gj-1214",
"host": "GJ 1214",
"display": "GJ 1214",
"aliases": [
"Gliese 1214"
],
"hostId": "star-gj-1214",
"hostSky": {
"raDeg": 258.831,
"decDeg": 4.96068,
"distPc": 14.643,
"spect": "M4 V"
},
"star": {
"radiusSuns": 0.216,
"teffK": 3101.0,
"massSuns": 0.182,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/GJ%201214 (read 2026-10-08)",
"lumSuns": 0.0039,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.06497,
"outerAu": 0.1287,
"wideInnerAu": 0.0513,
"wideOuterAu": 0.1357
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-gj-1214-b",
"name": "GJ 1214 b",
"periodDays": 1.5804,
"aAu": 0.01505,
"aFrom": "table",
"radiusEarths": 2.733,
"radiusFrom": "measured",
"massEarths": 8.41,
"massFrom": "measured",
"eccentricity": 0.0062,
"transitMidJd": 2459639.7812619,
"method": "Transit",
"year": 2009,
"insolationEarths": 17.2,
"equilibriumK": 519,
"zone": "hotter"
}
]
},
{
"id": "ross-128",
"stage": "system-ross-128",
"host": "Ross 128",
"display": "Ross 128",
"aliases": [],
"hostId": "star-ross-128",
"hostSky": {
"raDeg": 176.938,
"decDeg": 0.79929,
"distPc": 3.375,
"spect": "M4"
},
"star": {
"radiusSuns": 0.197,
"teffK": 3192.0,
"massSuns": 0.168,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Ross%20128 (read 2026-10-08)",
"lumSuns": 0.00362,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.06254,
"outerAu": 0.1233,
"wideInnerAu": 0.04938,
"wideOuterAu": 0.1301
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-ross-128-b",
"name": "Ross 128 b",
"periodDays": 9.8658,
"aAu": 0.0496,
"aFrom": "table",
"radiusEarths": 1.11,
"radiusFrom": "estimated",
"massEarths": 1.4,
"massFrom": "least",
"eccentricity": 0.116,
"method": "Radial Velocity",
"year": 2017,
"insolationEarths": 1.47,
"equilibriumK": 280,
"zone": "edge"
}
]
},
{
"id": "wolf-1069",
"stage": "system-wolf-1069",
"host": "Wolf 1069",
"display": "Wolf 1069",
"aliases": [],
"hostId": "star-wolf-1069",
"hostSky": {
"raDeg": 306.524,
"decDeg": 58.5753,
"distPc": 9.583,
"spect": "M5.0 V"
},
"star": {
"radiusSuns": 0.181,
"teffK": 3158.0,
"massSuns": 0.167,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Wolf%201069 (read 2026-10-08)",
"lumSuns": 0.002944,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.05642,
"outerAu": 0.1114,
"wideInnerAu": 0.04454,
"wideOuterAu": 0.1175
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-wolf-1069-b",
"name": "Wolf 1069 b",
"periodDays": 15.564,
"aAu": 0.0672,
"aFrom": "table",
"radiusEarths": 1.08,
"radiusFrom": "estimated",
"massEarths": 1.26,
"massFrom": "least",
"method": "Radial Velocity",
"year": 2023,
"insolationEarths": 0.652,
"equilibriumK": 229,
"zone": "inside"
}
]
},
{
"id": "gj-667-c",
"stage": "system-gj-667-c",
"host": "GJ 667 C",
"display": "GJ 667 C",
"aliases": [
"Gliese 667 C"
],
"hostId": "star-gj-667-c",
"hostSky": {
"raDeg": 259.751,
"decDeg": -34.9978,
"distPc": 7.244,
"spect": "M1.5 V"
},
"star": {
"radiusSuns": null,
"teffK": 3350.0,
"massSuns": 0.33,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/GJ%20667%20C (read 2026-10-08)",
"lumSuns": 0.01371,
"lumFrom": "table"
},
"starsInSystem": 3,
"zone": {
"innerAu": 0.1215,
"outerAu": 0.2378,
"wideInnerAu": 0.09593,
"wideOuterAu": 0.2508
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-gj-667-c-b",
"name": "GJ 667 C b",
"periodDays": 7.203,
"aAu": 0.050431,
"aFrom": "table",
"radiusEarths": 2.25,
"radiusFrom": "estimated",
"massEarths": 5.68,
"massFrom": "least",
"eccentricity": 0.2,
"method": "Radial Velocity",
"year": 2012,
"insolationEarths": 5.39,
"equilibriumK": 388,
"zone": "hotter"
},
{
"id": "exo-gj-667-c-c",
"name": "GJ 667 C c",
"periodDays": 28.14,
"aAu": 0.125,
"aFrom": "table",
"radiusEarths": 1.77,
"radiusFrom": "estimated",
"massEarths": 3.8,
"massFrom": "least",
"eccentricity": 0.02,
"method": "Radial Velocity",
"year": 2013,
"insolationEarths": 0.877,
"equilibriumK": 246,
"zone": "inside"
},
{
"id": "exo-gj-667-c-f",
"name": "GJ 667 C f",
"periodDays": 39.026,
"aAu": 0.156,
"aFrom": "table",
"radiusEarths": 1.45,
"radiusFrom": "estimated",
"massEarths": 2.7,
"massFrom": "least",
"eccentricity": 0.03,
"method": "Radial Velocity",
"year": 2013,
"insolationEarths": 0.563,
"equilibriumK": 221,
"zone": "inside"
},
{
"id": "exo-gj-667-c-e",
"name": "GJ 667 C e",
"periodDays": 62.24,
"aAu": 0.213,
"aFrom": "table",
"radiusEarths": 1.45,
"radiusFrom": "estimated",
"massEarths": 2.7,
"massFrom": "least",
"eccentricity": 0.02,
"method": "Radial Velocity",
"year": 2013,
"insolationEarths": 0.302,
"equilibriumK": 189,
"zone": "inside"
},
{
"id": "exo-gj-667-c-g",
"name": "GJ 667 C g",
"periodDays": 256.2,
"aAu": 0.549,
"aFrom": "table",
"radiusEarths": 1.99,
"radiusFrom": "estimated",
"massEarths": 4.6,
"massFrom": "least",
"eccentricity": 0.08,
"method": "Radial Velocity",
"year": 2013,
"insolationEarths": 0.0455,
"equilibriumK": 118,
"zone": "colder"
}
]
},
{
"id": "55-cnc",
"stage": "system-55-cnc",
"host": "55 Cnc",
"display": "55 Cancri",
"aliases": [
"Copernicus"
],
"hostId": "star-55-cnc",
"hostSky": {
"raDeg": 133.147,
"decDeg": 28.3298,
"distPc": 12.585,
"spect": "G8 V"
},
"star": {
"radiusSuns": 0.98,
"teffK": 5198.0,
"massSuns": 1.015,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/55%20Cnc (read 2026-10-08)",
"lumSuns": 0.6354,
"lumFrom": "table"
},
"starsInSystem": 2,
"zone": {
"innerAu": 0.7831,
"outerAu": 1.406,
"wideInnerAu": 0.6182,
"wideOuterAu": 1.483
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-55-cnc-e",
"name": "55 Cnc e",
"periodDays": 0.73655,
"aAu": 0.01604,
"aFrom": "kepler",
"aTableAu": 0.01544,
"radiusEarths": 1.875,
"radiusFrom": "measured",
"massEarths": 7.99,
"massFrom": "measured",
"eccentricity": 0.05,
"transitMidJd": 2457063.2096,
"method": "Radial Velocity",
"year": 2004,
"insolationEarths": 2470.0,
"equilibriumK": 1795,
"zone": "hotter"
},
{
"id": "exo-55-cnc-b",
"name": "55 Cnc b",
"periodDays": 14.6516,
"aAu": 0.118,
"aFrom": "table",
"radiusEarths": 13.9,
"radiusFrom": "estimated",
"massEarths": 263.978,
"massFrom": "measured",
"eccentricity": 0.0029,
"transitMidJd": 2455495.595,
"method": "Radial Velocity",
"year": 1996,
"insolationEarths": 45.6,
"equilibriumK": 662,
"zone": "hotter"
},
{
"id": "exo-55-cnc-c",
"name": "55 Cnc c",
"periodDays": 44.3936,
"aAu": 0.247,
"aFrom": "table",
"radiusEarths": 8.51,
"radiusFrom": "estimated",
"massEarths": 54.474,
"massFrom": "measured",
"eccentricity": 0.088,
"transitMidJd": 2455491.23,
"method": "Radial Velocity",
"year": 2004,
"insolationEarths": 10.4,
"equilibriumK": 457,
"zone": "hotter"
},
{
"id": "exo-55-cnc-f",
"name": "55 Cnc f",
"periodDays": 260.58,
"aAu": 0.802,
"aFrom": "table",
"radiusEarths": 7.59,
"radiusFrom": "estimated",
"massEarths": 44.812,
"massFrom": "measured",
"eccentricity": 0.063,
"transitMidJd": 2455236.4,
"method": "Radial Velocity",
"year": 2007,
"insolationEarths": 0.988,
"equilibriumK": 254,
"zone": "inside"
},
{
"id": "exo-55-cnc-d",
"name": "55 Cnc d",
"periodDays": 4799.0,
"aAu": 5.6,
"aFrom": "table",
"radiusEarths": 13.0,
"radiusFrom": "estimated",
"massEarths": 1232.49,
"massFrom": "measured",
"eccentricity": 0.0913,
"transitMidJd": 2451517.8,
"method": "Radial Velocity",
"year": 2002,
"insolationEarths": 0.0203,
"equilibriumK": 96,
"zone": "colder"
}
]
},
{
"id": "wasp-12",
"stage": "system-wasp-12",
"host": "WASP-12",
"display": "WASP-12",
"aliases": [],
"hostId": "star-wasp-12",
"hostSky": {
"raDeg": 97.6367,
"decDeg": 29.6723,
"distPc": 427.246,
"spect": null
},
"star": {
"radiusSuns": 1.69,
"teffK": 6265.0,
"massSuns": 1.325,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/WASP-12 (read 2026-10-08)",
"lumSuns": 3.955,
"lumFrom": "table"
},
"starsInSystem": 3,
"zone": {
"innerAu": 1.835,
"outerAu": 3.201,
"wideInnerAu": 1.449,
"wideOuterAu": 3.377
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-wasp-12-b",
"name": "WASP-12 b",
"periodDays": 1.09142,
"aAu": 0.02279,
"aFrom": "kepler",
"aTableAu": 0.0234,
"radiusEarths": 22.026,
"radiusFrom": "measured",
"massEarths": 467.21,
"massFrom": "measured",
"eccentricity": 0.0447,
"transitMidJd": 2457607.519305,
"method": "Transit",
"year": 2008,
"insolationEarths": 7610.0,
"equilibriumK": 2378,
"zone": "hotter"
}
]
},
{
"id": "wasp-121",
"stage": "system-wasp-121",
"host": "WASP-121",
"display": "WASP-121",
"aliases": [],
"hostId": "star-wasp-121",
"hostSky": {
"raDeg": 107.6,
"decDeg": -39.0973,
"distPc": 269.898,
"spect": "F6 V"
},
"star": {
"radiusSuns": 1.461,
"teffK": 6628.0,
"massSuns": 1.33,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/WASP-121 (read 2026-10-08)",
"lumSuns": 4.403,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.896,
"outerAu": 3.288,
"wideInnerAu": 1.497,
"wideOuterAu": 3.468
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-wasp-121-b",
"name": "WASP-121 b",
"periodDays": 1.27493,
"aAu": 0.02571,
"aFrom": "table",
"radiusEarths": 19.526,
"radiusFrom": "measured",
"massEarths": 371.859,
"massFrom": "measured",
"eccentricity": 0.0085,
"transitMidJd": 2460245.02038,
"method": "Transit",
"year": 2016,
"insolationEarths": 6660.0,
"equilibriumK": 2300,
"zone": "hotter"
}
]
},
{
"id": "hd-189733",
"stage": "system-hd-189733",
"host": "HD 189733",
"display": "HD 189733",
"aliases": [],
"hostId": "star-hd-189733",
"hostSky": {
"raDeg": 300.182,
"decDeg": 22.7098,
"distPc": 19.764,
"spect": "K2 V"
},
"star": {
"radiusSuns": 0.75,
"teffK": 5052.0,
"massSuns": 0.79,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/HD%20189733 (read 2026-10-08)",
"lumSuns": 0.3458,
"lumFrom": "table"
},
"starsInSystem": 2,
"zone": {
"innerAu": 0.5819,
"outerAu": 1.051,
"wideInnerAu": 0.4594,
"wideOuterAu": 1.109
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-hd-189733-b",
"name": "HD 189733 b",
"periodDays": 2.21858,
"aAu": 0.03126,
"aFrom": "table",
"radiusEarths": 12.666,
"radiusFrom": "measured",
"massEarths": 359.148,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2453955.5255511,
"method": "Radial Velocity",
"year": 2005,
"insolationEarths": 354.0,
"equilibriumK": 1104,
"zone": "hotter"
}
]
},
{
"id": "hd-209458",
"stage": "system-hd-209458",
"host": "HD 209458",
"display": "HD 209458",
"aliases": [],
"hostId": "star-hd-209458",
"hostSky": {
"raDeg": 330.795,
"decDeg": 18.8842,
"distPc": 48.302,
"spect": "G0 V"
},
"star": {
"radiusSuns": 1.19,
"teffK": 6091.0,
"massSuns": 1.23,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/HD%20209458 (read 2026-10-08)",
"lumSuns": 1.702,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.217,
"outerAu": 2.13,
"wideInnerAu": 0.9606,
"wideOuterAu": 2.246
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-hd-209458-b",
"name": "HD 209458 b",
"periodDays": 3.52475,
"aAu": 0.04857,
"aFrom": "kepler",
"aTableAu": 0.04707,
"radiusEarths": 15.581,
"radiusFrom": "measured",
"massEarths": 232.016,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2451659.93742,
"method": "Radial Velocity",
"year": 1999,
"insolationEarths": 721.0,
"equilibriumK": 1319,
"zone": "hotter"
}
]
},
{
"id": "51-peg",
"stage": "system-51-peg",
"host": "51 Peg",
"display": "51 Pegasi",
"aliases": [
"Helvetios"
],
"hostId": "star-51-peg",
"hostSky": {
"raDeg": 344.368,
"decDeg": 20.7691,
"distPc": 15.461,
"spect": "G5V"
},
"star": {
"radiusSuns": 1.19,
"teffK": 5761.0,
"massSuns": 1.07,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/51%20Peg (read 2026-10-08)",
"lumSuns": 1.369,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.113,
"outerAu": 1.964,
"wideInnerAu": 0.879,
"wideOuterAu": 2.072
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-51-peg-b",
"name": "51 Peg b",
"periodDays": 4.2308,
"aAu": 0.052,
"aFrom": "table",
"radiusEarths": 14.1,
"radiusFrom": "estimated",
"massEarths": 193.875,
"massFrom": "measured",
"eccentricity": 0.0063,
"transitMidJd": 2456326.9323,
"method": "Radial Velocity",
"year": 1995,
"insolationEarths": 506.0,
"equilibriumK": 1208,
"zone": "hotter"
}
]
},
{
"id": "kepler-16",
"stage": "system-kepler-16",
"host": "Kepler-16",
"display": "Kepler-16",
"aliases": [],
"hostId": "star-kepler-16",
"hostSky": {
"raDeg": 289.076,
"decDeg": 51.7572,
"distPc": 75.085,
"spect": null
},
"star": {
"radiusSuns": 0.649,
"teffK": 4450.0,
"massSuns": 0.6897,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-16 (read 2026-10-08)",
"lumSuns": 0.125,
"lumFrom": "table"
},
"starsInSystem": 2,
"zone": {
"innerAu": 0.3587,
"outerAu": 0.6649,
"wideInnerAu": 0.2832,
"wideOuterAu": 0.7014
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-16-b",
"name": "Kepler-16 b",
"periodDays": 228.776,
"aAu": 0.7048,
"aFrom": "table",
"circumbinary": true,
"radiusEarths": 8.449,
"radiusFrom": "measured",
"massEarths": 105.833,
"massFrom": "measured",
"eccentricity": 0.0069,
"transitMidJd": 2455212.12316,
"method": "Transit",
"year": 2011
}
]
},
{
"id": "kelt-9",
"stage": "system-kelt-9",
"host": "KELT-9",
"display": "KELT-9",
"aliases": [],
"hostId": "star-kelt-9",
"hostSky": {
"raDeg": 307.86,
"decDeg": 39.9389,
"distPc": 204.455,
"spect": "A"
},
"star": {
"radiusSuns": 2.418,
"teffK": 9270.0,
"massSuns": 2.32,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/KELT-9 (read 2026-10-08)",
"lumSuns": 38.9,
"lumFrom": "table"
},
"starsInSystem": 2,
"zone": null,
"zoneMissing": "too-hot",
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kelt-9-b",
"name": "KELT-9 b",
"periodDays": 1.48112,
"aAu": 0.03368,
"aFrom": "table",
"radiusEarths": 21.701,
"radiusFrom": "measured",
"massEarths": 915.346,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2457095.68572,
"method": "Transit",
"year": 2017,
"insolationEarths": 34300.0,
"equilibriumK": 3464
}
]
},
{
"id": "toi-849",
"stage": "system-toi-849",
"host": "TOI-849",
"display": "TOI-849",
"aliases": [],
"hostId": "star-toi-849",
"hostSky": {
"raDeg": 28.7158,
"decDeg": -29.4217,
"distPc": 225.734,
"spect": "G"
},
"star": {
"radiusSuns": 0.97,
"teffK": 5257.0,
"massSuns": 0.97,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/TOI-849 (read 2026-10-08)",
"lumSuns": 0.6048,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.7616,
"outerAu": 1.365,
"wideInnerAu": 0.6013,
"wideOuterAu": 1.44
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-toi-849-b",
"name": "TOI-849 b",
"periodDays": 0.76555,
"aAu": 0.01621,
"aFrom": "kepler",
"aTableAu": 0.0155,
"radiusEarths": 3.64,
"radiusFrom": "measured",
"massEarths": 41.8,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2458871.6812,
"method": "Transit",
"year": 2020,
"insolationEarths": 2300.0,
"equilibriumK": 1763,
"zone": "hotter"
}
]
},
{
"id": "psr-b1257-12",
"stage": "system-psr-b1257-12",
"host": "PSR B1257+12",
"display": "PSR B1257+12",
"aliases": [
"Lich"
],
"hostId": "star-psr-b1257-12",
"hostSky": {
"raDeg": 195.015,
"decDeg": 12.6823,
"distPc": 600.0,
"spect": null
},
"star": {
"radiusSuns": null,
"teffK": null,
"massSuns": 1.4,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/PSR%20B1257%2B12 (read 2026-10-08)",
"lumSuns": null,
"lumFrom": null
},
"starsInSystem": 1,
"zone": null,
"zoneMissing": "no-temperature",
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-psr-b1257-12-b",
"name": "PSR B1257+12 b",
"periodDays": 25.262,
"aAu": 0.19,
"aFrom": "table",
"radiusEarths": 0.338,
"radiusFrom": "estimated",
"massEarths": 0.02,
"massFrom": "measured",
"eccentricity": 0.0,
"method": "Pulsar Timing",
"year": 1994
},
{
"id": "exo-psr-b1257-12-c",
"name": "PSR B1257+12 c",
"periodDays": 66.5419,
"aAu": 0.36,
"aFrom": "table",
"radiusEarths": 1.91,
"radiusFrom": "estimated",
"massEarths": 4.3,
"massFrom": "measured",
"eccentricity": 0.0186,
"method": "Pulsar Timing",
"year": 1992
},
{
"id": "exo-psr-b1257-12-d",
"name": "PSR B1257+12 d",
"periodDays": 98.2114,
"aAu": 0.46,
"aFrom": "table",
"radiusEarths": 1.8,
"radiusFrom": "estimated",
"massEarths": 3.9,
"massFrom": "measured",
"eccentricity": 0.0264,
"method": "Pulsar Timing",
"year": 1992
}
]
},
{
"id": "hr-8799",
"stage": "system-hr-8799",
"host": "HR 8799",
"display": "HR 8799",
"aliases": [],
"hostId": "star-hr-8799",
"hostSky": {
"raDeg": 346.87,
"decDeg": 21.134,
"distPc": 41.244,
"spect": "A5 V"
},
"star": {
"radiusSuns": 1.493,
"teffK": 7205.0,
"massSuns": 1.5,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/HR%208799 (read 2026-10-08)",
"lumSuns": 4.92,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": null,
"zoneMissing": "too-hot",
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-hr-8799-e",
"name": "HR 8799 e",
"periodDays": 20815.6,
"aAu": 16.95,
"aFrom": "kepler",
"aTableAu": 16.4,
"radiusEarths": 13.115,
"radiusFrom": "measured",
"massEarths": 3178.3,
"massFrom": "measured",
"eccentricity": 0.15,
"method": "Imaging",
"year": 2010,
"insolationEarths": 0.0171,
"equilibriumK": 92
},
{
"id": "exo-hr-8799-d",
"name": "HR 8799 d",
"periodDays": 37000.0,
"aAu": 24.88,
"aFrom": "kepler",
"aTableAu": 24.0,
"radiusEarths": 13.0,
"radiusFrom": "measured",
"massEarths": 3000.0,
"massFrom": "measured",
"eccentricity": 0.6,
"method": "Imaging",
"year": 2008,
"insolationEarths": 0.00795,
"equilibriumK": 76
},
{
"id": "exo-hr-8799-c",
"name": "HR 8799 c",
"periodDays": 69000.0,
"aAu": 38.0,
"aFrom": "table",
"radiusEarths": 13.0,
"radiusFrom": "measured",
"massEarths": 3000.0,
"massFrom": "measured",
"eccentricity": 0.5,
"method": "Imaging",
"year": 2008,
"insolationEarths": 0.00341,
"equilibriumK": 62
},
{
"id": "exo-hr-8799-b",
"name": "HR 8799 b",
"periodDays": 170000.0,
"aAu": 68.0,
"aFrom": "table",
"radiusEarths": 13.0,
"radiusFrom": "measured",
"massEarths": 2000.0,
"massFrom": "measured",
"method": "Imaging",
"year": 2008,
"insolationEarths": 0.00106,
"equilibriumK": 46
}
]
},
{
"id": "beta-pictoris",
"stage": "system-beta-pictoris",
"host": "bet Pic",
"display": "Beta Pictoris",
"aliases": [
"bet Pic"
],
"hostId": "star-beta-pictoris",
"hostSky": {
"raDeg": 86.8212,
"decDeg": -51.0662,
"distPc": 19.744,
"spect": "A6 V"
},
"star": {
"radiusSuns": 1.544,
"teffK": 8039.0,
"massSuns": 1.789,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/bet%20Pic (read 2026-10-08)",
"lumSuns": 8.971,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": null,
"zoneMissing": "too-hot",
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-bet-pic-c",
"name": "bet Pic c",
"periodDays": 1202.0,
"aAu": 2.7,
"aFrom": "table",
"radiusEarths": 12.5,
"radiusFrom": "estimated",
"massEarths": 2765.11,
"massFrom": "measured",
"eccentricity": 0.307,
"method": "Radial Velocity",
"year": 2019,
"insolationEarths": 1.23,
"equilibriumK": 268
},
{
"id": "exo-bet-pic-b",
"name": "bet Pic b",
"periodDays": 8682.0,
"aAu": 10.07,
"aFrom": "table",
"radiusEarths": 18.495,
"radiusFrom": "measured",
"massEarths": 2765.11,
"massFrom": "measured",
"eccentricity": 0.105,
"method": "Imaging",
"year": 2008,
"insolationEarths": 0.0885,
"equilibriumK": 139
},
{
"id": "exo-bet-pic-d",
"name": "bet Pic d",
"periodDays": 33200.0,
"aAu": 24.54,
"aFrom": "kepler",
"aTableAu": 26.0,
"radiusEarths": 14.123,
"radiusFrom": "measured",
"massEarths": 762.788,
"massFrom": "measured",
"eccentricity": 0.44,
"method": "Imaging",
"year": 2026,
"insolationEarths": 0.0149,
"equilibriumK": 89
}
]
},
{
"id": "kepler-90",
"stage": "system-kepler-90",
"host": "KOI-351",
"display": "Kepler-90",
"aliases": [
"KOI-351"
],
"hostId": "star-kepler-90",
"hostSky": {
"raDeg": 284.433,
"decDeg": 49.3051,
"distPc": 848.254,
"spect": null
},
"star": {
"radiusSuns": 1.2,
"teffK": 6080.0,
"massSuns": 1.2,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/KOI-351 (read 2026-10-08)",
"lumSuns": 1.856,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.271,
"outerAu": 2.226,
"wideInnerAu": 1.004,
"wideOuterAu": 2.348
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-koi-351-b",
"name": "KOI-351 b",
"periodDays": 7.00815,
"aAu": 0.07616,
"aFrom": "kepler",
"aTableAu": 0.074,
"radiusEarths": 1.31,
"radiusFrom": "measured",
"massEarths": 2.27,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454970.6906,
"method": "Transit",
"year": 2013,
"insolationEarths": 320.0,
"equilibriumK": 1077,
"zone": "hotter"
},
{
"id": "exo-koi-351-c",
"name": "KOI-351 c",
"periodDays": 8.71937,
"aAu": 0.089,
"aFrom": "table",
"radiusEarths": 1.19,
"radiusFrom": "measured",
"massEarths": 1.81,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454972.5687,
"method": "Transit",
"year": 2013,
"insolationEarths": 234.0,
"equilibriumK": 996,
"zone": "hotter"
},
{
"id": "exo-kepler-90-i",
"name": "Kepler-90 i",
"periodDays": 14.4491,
"aAu": 0.1234,
"aFrom": "kepler",
"aTableAu": 0.1201380843,
"radiusEarths": 1.32,
"radiusFrom": "measured",
"massEarths": 2.3,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455644.3488,
"method": "Transit",
"year": 2017,
"insolationEarths": 122.0,
"equilibriumK": 846,
"zone": "hotter"
},
{
"id": "exo-koi-351-d",
"name": "KOI-351 d",
"periodDays": 59.7367,
"aAu": 0.32,
"aFrom": "table",
"radiusEarths": 2.87,
"radiusFrom": "measured",
"massEarths": 8.6,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454991.9656,
"method": "Transit",
"year": 2013,
"insolationEarths": 18.1,
"equilibriumK": 525,
"zone": "hotter"
},
{
"id": "exo-koi-351-e",
"name": "KOI-351 e",
"periodDays": 91.9391,
"aAu": 0.42,
"aFrom": "table",
"radiusEarths": 2.66,
"radiusFrom": "measured",
"massEarths": 7.56,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2454967.3127,
"method": "Transit",
"year": 2013,
"insolationEarths": 10.5,
"equilibriumK": 459,
"zone": "hotter"
},
{
"id": "exo-koi-351-f",
"name": "KOI-351 f",
"periodDays": 124.914,
"aAu": 0.5197,
"aFrom": "kepler",
"aTableAu": 0.48,
"radiusEarths": 2.88,
"radiusFrom": "measured",
"massEarths": 8.65,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455087.704,
"method": "Transit",
"year": 2013,
"insolationEarths": 6.87,
"equilibriumK": 412,
"zone": "hotter"
},
{
"id": "exo-koi-351-g",
"name": "KOI-351 g",
"periodDays": 210.735,
"aAu": 0.7365,
"aFrom": "kepler",
"aTableAu": 0.71704,
"radiusEarths": 7.718,
"radiusFrom": "measured",
"massEarths": 15.0,
"massFrom": "measured",
"eccentricity": 0.0292,
"transitMidJd": 2454979.97608,
"method": "Transit",
"year": 2013,
"insolationEarths": 3.42,
"equilibriumK": 346,
"zone": "hotter"
},
{
"id": "exo-koi-351-h",
"name": "KOI-351 h",
"periodDays": 331.603,
"aAu": 0.9964,
"aFrom": "kepler",
"aTableAu": 0.97062,
"radiusEarths": 11.252,
"radiusFrom": "measured",
"massEarths": 203.0,
"massFrom": "measured",
"eccentricity": 0.0276,
"transitMidJd": 2454973.50056,
"method": "Transit",
"year": 2013,
"insolationEarths": 1.87,
"equilibriumK": 298,
"zone": "hotter"
}
]
},
{
"id": "k2-138",
"stage": "system-k2-138",
"host": "K2-138",
"display": "K2-138",
"aliases": [],
"hostId": "star-k2-138",
"hostSky": {
"raDeg": 348.949,
"decDeg": -10.8497,
"distPc": 202.585,
"spect": "G8 V"
},
"star": {
"radiusSuns": 0.863,
"teffK": 5356.0,
"massSuns": 0.935,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/K2-138 (read 2026-10-08)",
"lumSuns": 0.517,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.7004,
"outerAu": 1.251,
"wideInnerAu": 0.553,
"wideOuterAu": 1.319
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-k2-138-b",
"name": "K2-138 b",
"periodDays": 2.35309,
"aAu": 0.03385,
"aFrom": "table",
"radiusEarths": 1.51,
"radiusFrom": "measured",
"massEarths": 3.1,
"massFrom": "measured",
"eccentricity": 0.048,
"transitMidJd": 2457773.31683,
"method": "Transit",
"year": 2017,
"insolationEarths": 451.0,
"equilibriumK": 1173,
"zone": "hotter"
},
{
"id": "exo-k2-138-c",
"name": "K2-138 c",
"periodDays": 3.56004,
"aAu": 0.04461,
"aFrom": "table",
"radiusEarths": 2.299,
"radiusFrom": "measured",
"massEarths": 6.31,
"massFrom": "measured",
"eccentricity": 0.045,
"transitMidJd": 2457740.32182,
"method": "Transit",
"year": 2017,
"insolationEarths": 260.0,
"equilibriumK": 1022,
"zone": "hotter"
},
{
"id": "exo-k2-138-d",
"name": "K2-138 d",
"periodDays": 5.40479,
"aAu": 0.05893,
"aFrom": "table",
"radiusEarths": 2.39,
"radiusFrom": "measured",
"massEarths": 7.92,
"massFrom": "measured",
"eccentricity": 0.043,
"transitMidJd": 2457743.15989,
"method": "Transit",
"year": 2017,
"insolationEarths": 149.0,
"equilibriumK": 889,
"zone": "hotter"
},
{
"id": "exo-k2-138-e",
"name": "K2-138 e",
"periodDays": 8.26146,
"aAu": 0.0782,
"aFrom": "table",
"radiusEarths": 3.39,
"radiusFrom": "measured",
"massEarths": 12.97,
"massFrom": "measured",
"eccentricity": 0.077,
"transitMidJd": 2457740.64558,
"method": "Transit",
"year": 2017,
"insolationEarths": 84.5,
"equilibriumK": 772,
"zone": "hotter"
},
{
"id": "exo-k2-138-f",
"name": "K2-138 f",
"periodDays": 12.7576,
"aAu": 0.10447,
"aFrom": "table",
"radiusEarths": 2.904,
"radiusFrom": "measured",
"massEarths": 1.63,
"massFrom": "measured",
"eccentricity": 0.062,
"transitMidJd": 2457738.70235,
"method": "Transit",
"year": 2017,
"insolationEarths": 47.4,
"equilibriumK": 668,
"zone": "hotter"
},
{
"id": "exo-k2-138-g",
"name": "K2-138 g",
"periodDays": 41.968,
"aAu": 0.23109,
"aFrom": "table",
"radiusEarths": 3.013,
"radiusFrom": "measured",
"massEarths": 4.32,
"massFrom": "measured",
"eccentricity": 0.059,
"transitMidJd": 2457773.86156,
"method": "Transit",
"year": 2021,
"insolationEarths": 9.68,
"equilibriumK": 449,
"zone": "hotter"
}
]
},
{
"id": "kepler-11",
"stage": "system-kepler-11",
"host": "Kepler-11",
"display": "Kepler-11",
"aliases": [],
"hostId": "star-kepler-11",
"hostSky": {
"raDeg": 297.115,
"decDeg": 41.9091,
"distPc": 646.346,
"spect": null
},
"star": {
"radiusSuns": 1.065,
"teffK": 5663.0,
"massSuns": 0.961,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-11 (read 2026-10-08)",
"lumSuns": 1.319,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.099,
"outerAu": 1.945,
"wideInnerAu": 0.8678,
"wideOuterAu": 2.051
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-11-b",
"name": "Kepler-11 b",
"periodDays": 10.3039,
"aAu": 0.091,
"aFrom": "table",
"radiusEarths": 1.8,
"radiusFrom": "measured",
"massEarths": 1.9,
"massFrom": "measured",
"eccentricity": 0.045,
"transitMidJd": 2455589.7378,
"method": "Transit",
"year": 2010,
"insolationEarths": 159.0,
"equilibriumK": 904,
"zone": "hotter"
},
{
"id": "exo-kepler-11-c",
"name": "Kepler-11 c",
"periodDays": 13.0241,
"aAu": 0.107,
"aFrom": "table",
"radiusEarths": 2.87,
"radiusFrom": "measured",
"massEarths": 2.9,
"massFrom": "measured",
"eccentricity": 0.026,
"transitMidJd": 2455583.3494,
"method": "Transit",
"year": 2010,
"insolationEarths": 115.0,
"equilibriumK": 834,
"zone": "hotter"
},
{
"id": "exo-kepler-11-d",
"name": "Kepler-11 d",
"periodDays": 22.6845,
"aAu": 0.155,
"aFrom": "table",
"radiusEarths": 3.12,
"radiusFrom": "measured",
"massEarths": 7.3,
"massFrom": "measured",
"eccentricity": 0.004,
"transitMidJd": 2455594.0069,
"method": "Transit",
"year": 2010,
"insolationEarths": 54.9,
"equilibriumK": 693,
"zone": "hotter"
},
{
"id": "exo-kepler-11-e",
"name": "Kepler-11 e",
"periodDays": 31.9996,
"aAu": 0.195,
"aFrom": "table",
"radiusEarths": 4.19,
"radiusFrom": "measured",
"massEarths": 8.0,
"massFrom": "measured",
"eccentricity": 0.012,
"transitMidJd": 2455595.0755,
"method": "Transit",
"year": 2010,
"insolationEarths": 34.7,
"equilibriumK": 618,
"zone": "hotter"
},
{
"id": "exo-kepler-11-f",
"name": "Kepler-11 f",
"periodDays": 46.6888,
"aAu": 0.25,
"aFrom": "table",
"radiusEarths": 2.49,
"radiusFrom": "measured",
"massEarths": 2.0,
"massFrom": "measured",
"eccentricity": 0.013,
"transitMidJd": 2455618.271,
"method": "Transit",
"year": 2010,
"insolationEarths": 21.1,
"equilibriumK": 546,
"zone": "hotter"
},
{
"id": "exo-kepler-11-g",
"name": "Kepler-11 g",
"periodDays": 118.381,
"aAu": 0.466,
"aFrom": "table",
"radiusEarths": 3.33,
"radiusFrom": "measured",
"massEarths": 25.0,
"massFrom": "measured",
"eccentricity": 0.15,
"transitMidJd": 2455593.8021,
"method": "Transit",
"year": 2010,
"insolationEarths": 6.07,
"equilibriumK": 400,
"zone": "hotter"
}
]
},
{
"id": "hd-10180",
"stage": "system-hd-10180",
"host": "HD 10180",
"display": "HD 10180",
"aliases": [],
"hostId": "star-hd-10180",
"hostSky": {
"raDeg": 24.4731,
"decDeg": -60.5115,
"distPc": 38.961,
"spect": "G1 V"
},
"star": {
"radiusSuns": 1.109,
"teffK": 5911.0,
"massSuns": 1.06,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/HD%2010180 (read 2026-10-08)",
"lumSuns": 1.49,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.151,
"outerAu": 2.023,
"wideInnerAu": 0.9087,
"wideOuterAu": 2.134
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-hd-10180-c",
"name": "HD 10180 c",
"periodDays": 5.75969,
"aAu": 0.06412,
"aFrom": "table",
"massEarths": 2741.59,
"massFrom": "measured",
"eccentricity": 0.073,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 362.0,
"equilibriumK": 1111,
"zone": "hotter"
},
{
"id": "exo-hd-10180-d",
"name": "HD 10180 d",
"periodDays": 16.357,
"aAu": 0.12859,
"aFrom": "table",
"massEarths": 3295.88,
"massFrom": "measured",
"eccentricity": 0.131,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 90.1,
"equilibriumK": 784,
"zone": "hotter"
},
{
"id": "exo-hd-10180-e",
"name": "HD 10180 e",
"periodDays": 49.748,
"aAu": 0.2699,
"aFrom": "table",
"radiusEarths": 5.39,
"radiusFrom": "estimated",
"massEarths": 25.1,
"massFrom": "measured",
"eccentricity": 0.051,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 20.5,
"equilibriumK": 541,
"zone": "hotter"
},
{
"id": "exo-hd-10180-f",
"name": "HD 10180 f",
"periodDays": 122.744,
"aAu": 0.4929,
"aFrom": "table",
"radiusEarths": 5.24,
"radiusFrom": "estimated",
"massEarths": 23.9,
"massFrom": "measured",
"eccentricity": 0.119,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 6.13,
"equilibriumK": 401,
"zone": "hotter"
},
{
"id": "exo-hd-10180-g",
"name": "HD 10180 g",
"periodDays": 604.67,
"aAu": 1.427,
"aFrom": "table",
"massEarths": 3375.34,
"massFrom": "measured",
"eccentricity": 0.263,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 0.732,
"equilibriumK": 235,
"zone": "inside"
},
{
"id": "exo-hd-10180-h",
"name": "HD 10180 h",
"periodDays": 2205.0,
"aAu": 3.381,
"aFrom": "table",
"radiusEarths": 9.4,
"radiusFrom": "estimated",
"massEarths": 64.4,
"massFrom": "measured",
"eccentricity": 0.095,
"method": "Radial Velocity",
"year": 2010,
"insolationEarths": 0.13,
"equilibriumK": 153,
"zone": "colder"
}
]
},
{
"id": "kepler-1649",
"stage": "system-kepler-1649",
"host": "Kepler-1649",
"display": "Kepler-1649",
"aliases": [],
"hostId": "star-kepler-1649",
"hostSky": {
"raDeg": 292.503,
"decDeg": 41.83,
"distPc": 92.191,
"spect": null
},
"star": {
"radiusSuns": 0.232,
"teffK": 3240.0,
"massSuns": 0.1977,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-1649 (read 2026-10-08)",
"lumSuns": 0.00516,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.07463,
"outerAu": 0.1468,
"wideInnerAu": 0.05892,
"wideOuterAu": 0.1549
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-1649-b",
"name": "Kepler-1649 b",
"periodDays": 8.6891,
"aAu": 0.04819,
"aFrom": "kepler",
"aTableAu": 0.0514,
"radiusEarths": 1.017,
"radiusFrom": "measured",
"massEarths": 1.03,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455374.6219,
"method": "Transit",
"year": 2017,
"insolationEarths": 2.22,
"equilibriumK": 311,
"zone": "hotter"
},
{
"id": "exo-kepler-1649-c",
"name": "Kepler-1649 c",
"periodDays": 19.5353,
"aAu": 0.0827,
"aFrom": "kepler",
"aTableAu": 0.0649,
"radiusEarths": 1.06,
"radiusFrom": "measured",
"massEarths": 1.2,
"massFrom": "estimated",
"eccentricity": 0.0,
"transitMidJd": 2455410.9777,
"method": "Transit",
"year": 2020,
"insolationEarths": 0.754,
"equilibriumK": 237,
"zone": "inside"
}
]
},
{
"id": "kepler-1647",
"stage": "system-kepler-1647",
"host": "Kepler-1647",
"display": "Kepler-1647",
"aliases": [],
"hostId": "star-kepler-1647",
"hostSky": {
"raDeg": 298.15,
"decDeg": 40.6562,
"distPc": 1212.45,
"spect": null
},
"star": {
"radiusSuns": 1.79,
"teffK": 6210.0,
"massSuns": 1.2207,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-1647 (read 2026-10-08)",
"lumSuns": 4.408,
"lumFrom": "table"
},
"starsInSystem": 2,
"zone": {
"innerAu": 1.944,
"outerAu": 3.394,
"wideInnerAu": 1.535,
"wideOuterAu": 3.58
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-kepler-1647-b",
"name": "Kepler-1647 b",
"periodDays": 1107.59,
"aAu": 2.7205,
"aFrom": "table",
"circumbinary": true,
"radiusEarths": 11.874,
"radiusFrom": "measured",
"massEarths": 483.0,
"massFrom": "measured",
"eccentricity": 0.0581,
"transitMidJd": 2454998.4972,
"method": "Transit",
"year": 2016
}
]
},
{
"id": "wasp-17",
"stage": "system-wasp-17",
"host": "WASP-17",
"display": "WASP-17",
"aliases": [],
"hostId": "star-wasp-17",
"hostSky": {
"raDeg": 239.962,
"decDeg": -28.0618,
"distPc": 405.908,
"spect": "F4"
},
"star": {
"radiusSuns": 1.49,
"teffK": 6550.0,
"massSuns": 2.28,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/WASP-17 (read 2026-10-08)",
"lumSuns": 4.099,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 1.837,
"outerAu": 3.19,
"wideInnerAu": 1.45,
"wideOuterAu": 3.364
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-wasp-17-b",
"name": "WASP-17 b",
"periodDays": 3.73543,
"aAu": 0.06201,
"aFrom": "kepler",
"aTableAu": 0.0515,
"radiusEarths": 20.961,
"radiusFrom": "measured",
"massEarths": 247.907,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2454592.80154,
"method": "Transit",
"year": 2009,
"insolationEarths": 1070.0,
"equilibriumK": 1455,
"zone": "hotter"
}
]
},
{
"id": "wasp-39",
"stage": "system-wasp-39",
"host": "WASP-39",
"display": "WASP-39",
"aliases": [],
"hostId": "star-wasp-39",
"hostSky": {
"raDeg": 217.327,
"decDeg": -3.4445,
"distPc": 213.982,
"spect": null
},
"star": {
"radiusSuns": 0.939,
"teffK": 5485.0,
"massSuns": 0.913,
"source": "https://exoplanetarchive.ipac.caltech.edu/overview/WASP-39 (read 2026-10-08)",
"lumSuns": 0.7449,
"lumFrom": "table"
},
"starsInSystem": 1,
"zone": {
"innerAu": 0.8346,
"outerAu": 1.484,
"wideInnerAu": 0.6589,
"wideOuterAu": 1.566
},
"zoneMissing": null,
"colourNote": "illustrative",
"asOf": "2026-10-08",
"planets": [
{
"id": "exo-wasp-39-b",
"name": "WASP-39 b",
"periodDays": 4.05529,
"aAu": 0.04828,
"aFrom": "table",
"radiusEarths": 14.336,
"radiusFrom": "measured",
"massEarths": 89.31,
"massFrom": "measured",
"eccentricity": 0.0,
"transitMidJd": 2455342.96913,
"method": "Transit",
"year": 2011,
"insolationEarths": 320.0,
"equilibriumK": 1076,
"zone": "hotter"
}
]
}
];
