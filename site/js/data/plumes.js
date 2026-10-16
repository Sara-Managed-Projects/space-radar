// GENERATED from registry/plumes.yaml by scripts/gen_plumes_js.py. Do not edit.
//
// `python3 scripts/gen_plumes_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. Fetched with scene/plumes.js, when a
// moon with plumes has its own stage (internal spec 0076 W2-c); never at boot.

/** Who has looked at these: the maintainers, not yet an astronomer (spec 0075 section 14.4). */
export const PLUME_REVIEW = {
  "by": "Space Radar maintainers",
  "note": "not yet reviewed by an astronomer (spec 0075 section 14.4; internal #785)"
};

/** Under Film the particles fly their arcs this many times faster than the clock (said on the card). */
export const FILM_SPEED = 20.0;

/** Each moon with plumes: its radius (scene/worlds.js) and its surface gravity GM / R^2 in km/s^2. */
export const PLUME_WORLDS = {
  "io": {
    "radiusKm": 1821.5,
    "gKmS2": 0.0017963072457272751
  },
  "enceladus": {
    "radiusKm": 252.1,
    "gKmS2": 0.00011345239457025877
  },
  "triton": {
    "radiusKm": 1352.6,
    "gKmS2": 0.0007808030094077444
  }
};

/** Every plume as seen: place (east longitude), height, who saw it and when; the stripes' two ends for Enceladus. */
export const PLUMES = [
  {
    "id": "pele",
    "world": "io",
    "name": "Pele",
    "kind": "umbrella",
    "heightKm": 300.0,
    "seen": {
      "by": "Voyager 1",
      "when": "1979-03"
    },
    "source": "https://en.wikipedia.org/wiki/Pele_(volcano)",
    "particles": 5200,
    "lat": -18.7,
    "lon": 104.7,
    "zenithDeg": [
      12.0,
      38.0
    ],
    "rays": 40
  },
  {
    "id": "tvashtar",
    "world": "io",
    "name": "Tvashtar",
    "kind": "umbrella",
    "heightKm": 330.0,
    "seen": {
      "by": "New Horizons",
      "when": "2007-03"
    },
    "source": "https://pds-rings.seti.org/press_releases/pages/PIA09xxx/PIA09359.html",
    "particles": 5200,
    "lat": 62.76,
    "lon": -123.53,
    "zenithDeg": [
      12.0,
      38.0
    ],
    "rays": 36
  },
  {
    "id": "prometheus",
    "world": "io",
    "name": "Prometheus",
    "kind": "fountain",
    "heightKm": 75.0,
    "seen": {
      "by": "Voyager 1 and Galileo",
      "when": "1979-03..1997-06"
    },
    "source": "https://www.jpl.nasa.gov/images/pia00703-active-volcanic-plumes-on-io/",
    "particles": 2600,
    "lat": -1.52,
    "lon": -153.94,
    "zenithDeg": [
      0.0,
      40.0
    ],
    "rays": 0
  },
  {
    "id": "pillan",
    "world": "io",
    "name": "Pillan",
    "kind": "fountain",
    "heightKm": 140.0,
    "seen": {
      "by": "Galileo",
      "when": "1997-06"
    },
    "source": "https://www.jpl.nasa.gov/images/pia00703-active-volcanic-plumes-on-io/",
    "particles": 2600,
    "lat": -12.34,
    "lon": 116.75,
    "zenithDeg": [
      0.0,
      40.0
    ],
    "rays": 0
  },
  {
    "id": "enceladus-south",
    "world": "enceladus",
    "name": "the tiger stripes' jets",
    "kind": "jets",
    "heightKm": 505.0,
    "seen": {
      "by": "Cassini",
      "when": "2005-11"
    },
    "source": "https://pds-rings.seti.org/press_releases/pages/PIA07xxx/PIA07762.html",
    "particles": 120,
    "stripes": [
      {
        "name": "Alexandria Sulcus",
        "a": [
          -72.0346,
          -93.3581
        ],
        "b": [
          -69.7899,
          -175.8582
        ],
        "jets": 14
      },
      {
        "name": "Cairo Sulcus",
        "a": [
          -72.8116,
          -67.285
        ],
        "b": [
          -66.5876,
          158.3583
        ],
        "jets": 22
      },
      {
        "name": "Baghdad Sulcus",
        "a": [
          -73.037,
          -39.0014
        ],
        "b": [
          -66.9487,
          137.9245
        ],
        "jets": 35
      },
      {
        "name": "Damascus Sulcus",
        "a": [
          -76.6676,
          -0.9673
        ],
        "b": [
          -69.928,
          114.0627
        ],
        "jets": 30
      }
    ],
    "scaleKm": 110.0,
    "zenithDeg": [
      0.0,
      18.0
    ]
  },
  {
    "id": "hili",
    "world": "triton",
    "name": "Hili",
    "kind": "column",
    "heightKm": 8.0,
    "seen": {
      "by": "Voyager 2",
      "when": "1989-08"
    },
    "source": "https://www.usgs.gov/publications/tritons-geyser-plumes-discovery-and-basic-characterization",
    "particles": 2400,
    "lat": -57.0,
    "lon": 28.0,
    "tailKm": 110.0,
    "windMS": 15.0,
    "tailDir": "west"
  },
  {
    "id": "mahilani",
    "world": "triton",
    "name": "Mahilani",
    "kind": "column",
    "heightKm": 8.0,
    "seen": {
      "by": "Voyager 2",
      "when": "1989-08"
    },
    "source": "https://www.usgs.gov/publications/tritons-geyser-plumes-discovery-and-basic-characterization",
    "particles": 2400,
    "lat": -49.0,
    "lon": 2.0,
    "tailKm": 110.0,
    "windMS": 15.0,
    "tailDir": "west"
  }
];

/** Io's hot spots: drawn on the night side only, their brightness ranked, illustrative. */
export const HOTSPOTS = [
  {
    "id": "loki",
    "world": "io",
    "name": "Loki Patera",
    "lat": 13.0,
    "lon": 51.2,
    "rank": 1.0,
    "seen": {
      "by": "Voyager 1 (infrared)",
      "when": "1979-03"
    }
  },
  {
    "id": "pele",
    "world": "io",
    "name": "Pele",
    "lat": -18.7,
    "lon": 104.7,
    "rank": 0.8,
    "seen": {
      "by": "Galileo (in Jupiter's shadow)",
      "when": "1996..2000"
    }
  },
  {
    "id": "pillan",
    "world": "io",
    "name": "Pillan Patera",
    "lat": -12.34,
    "lon": 116.75,
    "rank": 0.7,
    "seen": {
      "by": "Galileo",
      "when": "1997"
    }
  },
  {
    "id": "tvashtar",
    "world": "io",
    "name": "Tvashtar",
    "lat": 62.76,
    "lon": -123.53,
    "rank": 0.6,
    "seen": {
      "by": "New Horizons",
      "when": "2007-03"
    }
  },
  {
    "id": "prometheus",
    "world": "io",
    "name": "Prometheus",
    "lat": -1.52,
    "lon": -153.94,
    "rank": 0.45,
    "seen": {
      "by": "Galileo",
      "when": "1997"
    }
  }
];

/** How each kind of plume scatters and takes light (illustrative; registry/plumes.yaml says why). */
export const PLUME_LOOK = {
  "umbrella": {
    "colour": [
      0.8,
      0.84,
      0.92
    ],
    "absorb": 0.04,
    "g": 0.55,
    "tau": 0.1
  },
  "fountain": {
    "colour": [
      0.84,
      0.88,
      0.96
    ],
    "absorb": 0.05,
    "g": 0.55,
    "tau": 0.16
  },
  "jets": {
    "colour": [
      0.92,
      0.95,
      1.0
    ],
    "absorb": 0.02,
    "g": 0.75,
    "tau": 0.06
  },
  "column": {
    "colour": [
      0.3,
      0.28,
      0.26
    ],
    "absorb": 0.55,
    "g": 0.35,
    "tau": 0.35
  },
  "hotspot": {
    "colour": [
      1.0,
      0.42,
      0.12
    ]
  }
};
