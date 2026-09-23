// GENERATED from registry/systems.yaml by scripts/gen_systems_js.py. Do not edit.
//
// `python3 scripts/gen_systems_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A system is a host star and the planets the NASA Exoplanet Archive lists for it (spec 0040). The
// planets are the exoplanet layer's own records, named by id; the generator joined each row to
// site/data/exoplanets.csv for the host's place in the sky and the planets' names. scene/systems.js
// draws them on the system's stage; data/layers.js makes the host star a record.

/** Every star system drawn at its own scale, joined to the exoplanet table it names. */
export const SYSTEMS = [
  {
    "id": "trappist-1",
    "stage": "system-trappist-1",
    "host": "TRAPPIST-1",
    "hostId": "star-trappist-1",
    "hostSky": {
      "raDeg": 346.626,
      "decDeg": -5.04346,
      "distPc": 12.43,
      "spect": "M8.0 V"
    },
    "star": {
      "radiusSuns": 0.1192,
      "teffK": 2566,
      "massSuns": 0.0898,
      "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
    },
    "colourNote": "illustrative",
    "planets": [
      {
        "id": "exo-trappist-1-b",
        "name": "TRAPPIST-1 b",
        "periodDays": 1.510826,
        "aAu": 0.01154,
        "radiusEarths": 1.116,
        "massEarths": 1.374,
        "transitMidJd": 2457322.514193,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-c",
        "name": "TRAPPIST-1 c",
        "periodDays": 2.421937,
        "aAu": 0.0158,
        "radiusEarths": 1.097,
        "massEarths": 1.308,
        "transitMidJd": 2457282.8113871,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-d",
        "name": "TRAPPIST-1 d",
        "periodDays": 4.049219,
        "aAu": 0.02227,
        "radiusEarths": 0.788,
        "massEarths": 0.388,
        "transitMidJd": 2457670.1463014,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-e",
        "name": "TRAPPIST-1 e",
        "periodDays": 6.101013,
        "aAu": 0.02925,
        "radiusEarths": 0.92,
        "massEarths": 0.692,
        "transitMidJd": 2457660.3676621,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-f",
        "name": "TRAPPIST-1 f",
        "periodDays": 9.20754,
        "aAu": 0.03849,
        "radiusEarths": 1.045,
        "massEarths": 1.039,
        "transitMidJd": 2457671.3737299,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-g",
        "name": "TRAPPIST-1 g",
        "periodDays": 12.352446,
        "aAu": 0.04683,
        "radiusEarths": 1.129,
        "massEarths": 1.321,
        "transitMidJd": 2457665.3628439,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      },
      {
        "id": "exo-trappist-1-h",
        "name": "TRAPPIST-1 h",
        "periodDays": 18.772866,
        "aAu": 0.06189,
        "radiusEarths": 0.755,
        "massEarths": 0.326,
        "transitMidJd": 2457662.5741486,
        "source": "https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1 (read 2026-09-23)"
      }
    ]
  }
];
