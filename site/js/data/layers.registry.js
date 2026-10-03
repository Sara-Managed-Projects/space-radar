// GENERATED from registry/layers.yaml by scripts/gen_layers_js.py. Do not edit.
//
// `python3 scripts/gen_layers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// data/layers.js keeps the hand-written half of every layer (its selection rule, its parser, its
// stand-in) and takes `enabled`, `display` and `moments` from here. A layer switched off in the
// registry is never loaded, listed or searched.

/** The groups What to show folds the layers into, in screen order. */
export const LAYER_GROUPS = [
  "around-earth",
  "earth",
  "solar-system",
  "beyond"
];

/** Every layer the registry knows, with the fields the registry decides. Order is the registry's. */
export const LAYER_ROWS = [
  {
    "id": "worlds",
    "display": "Planets and moons",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": true
    },
    "source": "bundled",
    "sources": null,
    "propagator": "body",
    "frame": "sun-inertial",
    "card": "world",
    "glyph": "planet",
    "colour": "world",
    "maxItems": 40,
    "train": null
  },
  {
    "id": "stars",
    "display": "Stars",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "star",
    "glyph": "star",
    "colour": "star",
    "maxItems": 200000,
    "train": null
  },
  {
    "id": "exoplanets",
    "display": "Planets around other stars",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "nasa-exoplanet-archive",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "exoplanet",
    "glyph": "exoplanet",
    "colour": "exoplanet",
    "maxItems": 8000,
    "train": null
  },
  {
    "id": "systems",
    "display": "Star systems",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "star",
    "glyph": "star",
    "colour": "star",
    "maxItems": 50,
    "train": null
  },
  {
    "id": "deep-sky",
    "display": "Nebulae, clusters and galaxies",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "dso",
    "glyph": "dso",
    "colour": "dso",
    "maxItems": 2000,
    "train": null
  },
  {
    "id": "galaxy",
    "display": "The Milky Way",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "dso",
    "glyph": "dso",
    "colour": "dso",
    "maxItems": 4,
    "train": null
  },
  {
    "id": "exotics",
    "display": "Black holes and other extremes",
    "group": "beyond",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "static",
    "frame": "sun-inertial",
    "card": "exotic",
    "glyph": "exotic",
    "colour": "exotic",
    "maxItems": 200,
    "train": null
  },
  {
    "id": "stations",
    "display": "Crewed stations",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "celestrak-stations",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "station",
    "glyph": "station",
    "colour": "station",
    "maxItems": 20,
    "train": null
  },
  {
    "id": "notable",
    "display": "Satellites worth knowing",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "celestrak-active",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "satellite",
    "colour": "satellite",
    "maxItems": 80,
    "train": null
  },
  {
    "id": "starlink-trains",
    "display": "Fresh Starlink trains",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": true
    },
    "source": "celestrak-supplemental-starlink",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "train",
    "colour": "satellite",
    "maxItems": 400,
    "train": {
      "still_raising_below_km": 500
    }
  },
  {
    "id": "just-launched",
    "display": "Just launched",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "celestrak-active",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "just-launched",
    "colour": "launch",
    "maxItems": 200,
    "train": null
  },
  {
    "id": "active",
    "display": "Everything active",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": false,
      "now": false,
      "next": false
    },
    "source": "celestrak-active",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "satellite",
    "colour": "satellite",
    "maxItems": 15000,
    "train": null
  },
  {
    "id": "geo-ring",
    "display": "The geostationary ring",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": false,
      "now": false,
      "next": false
    },
    "source": "celestrak-active",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "satellite",
    "colour": "satellite",
    "maxItems": 900,
    "train": null
  },
  {
    "id": "debris-notable",
    "display": "Famous debris",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": false,
      "now": false,
      "next": false
    },
    "source": "celestrak-active",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "debris",
    "glyph": "debris",
    "colour": "debris",
    "maxItems": 40,
    "train": null
  },
  {
    "id": "launches",
    "display": "Rockets on their way up",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": true
    },
    "source": "ll2-upcoming",
    "sources": null,
    "propagator": "ascent",
    "frame": "earth-fixed",
    "card": "launch",
    "glyph": "rocket",
    "colour": "rocket",
    "maxItems": 30,
    "train": null
  },
  {
    "id": "asteroids",
    "display": "Asteroids passing by",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": true
    },
    "source": "jpl-sbdb-neo",
    "sources": null,
    "propagator": "kepler",
    "frame": "sun-inertial",
    "card": "asteroid",
    "glyph": "asteroid",
    "colour": "asteroid",
    "maxItems": 300,
    "train": null
  },
  {
    "id": "far-bodies",
    "display": "Dwarf planets, far travellers",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "kepler",
    "frame": "sun-inertial",
    "card": "asteroid",
    "glyph": "asteroid",
    "colour": "asteroid",
    "maxItems": 20,
    "train": null
  },
  {
    "id": "comets",
    "display": "Comets",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": true
    },
    "source": "jpl-sbdb-comets",
    "sources": null,
    "propagator": "kepler",
    "frame": "sun-inertial",
    "card": "comet",
    "glyph": "comet",
    "colour": "comet",
    "maxItems": 60,
    "train": null
  },
  {
    "id": "deep-space",
    "display": "Probes and telescopes",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "horizons-deep-space",
    "sources": null,
    "propagator": "sampled",
    "frame": "sun-inertial",
    "card": "probe",
    "glyph": "probe",
    "colour": "probe",
    "maxItems": 40,
    "train": null
  },
  {
    "id": "visual",
    "display": "Bright enough to see",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "celestrak-visual",
    "sources": null,
    "propagator": "sgp4",
    "frame": "earth-inertial",
    "card": "satellite",
    "glyph": "satellite",
    "colour": "satellite",
    "maxItems": 200,
    "train": null
  },
  {
    "id": "ground-sites",
    "display": "Pads, dishes and observatories",
    "group": "earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": true
    },
    "source": "ll2-upcoming",
    "sources": null,
    "propagator": "fixed",
    "frame": "earth-fixed",
    "card": "site",
    "glyph": "site",
    "colour": "site",
    "maxItems": 400,
    "train": null
  },
  {
    "id": "hand-kept-sites",
    "display": "Dishes, landers and rovers",
    "group": "earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "fixed",
    "frame": "earth-fixed",
    "card": "site",
    "glyph": "site",
    "colour": "site",
    "maxItems": 40,
    "train": null
  },
  {
    "id": "storms",
    "display": "Tropical storms now",
    "group": "earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "gdacs-tc",
    "sources": null,
    "propagator": "fixed",
    "frame": "earth-fixed",
    "card": "storm",
    "glyph": "storm",
    "colour": "storm",
    "maxItems": 20,
    "train": null
  },
  {
    "id": "aurora",
    "display": "Aurora",
    "group": "earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "swpc-ovation",
    "sources": null,
    "propagator": "static",
    "frame": "earth-fixed",
    "card": "world",
    "glyph": "storm",
    "colour": "aurora",
    "maxItems": 1,
    "train": null
  },
  {
    "id": "lightning",
    "display": "Lightning",
    "group": "earth",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": true,
      "next": false
    },
    "source": "weather",
    "sources": null,
    "propagator": "static",
    "frame": "earth-fixed",
    "card": "world",
    "glyph": "storm",
    "colour": "lightning",
    "maxItems": 1,
    "train": null
  },
  {
    "id": "reentries",
    "display": "Things that came down",
    "group": "around-earth",
    "enabled": true,
    "moments": {
      "wonder": false,
      "now": false,
      "next": true
    },
    "source": "space-track-tip",
    "sources": null,
    "propagator": "fixed",
    "frame": "earth-fixed",
    "card": "debris",
    "glyph": "debris",
    "colour": "debris",
    "maxItems": 10,
    "train": null
  },
  {
    "id": "oddities",
    "display": "Odd things we sent",
    "group": "solar-system",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": false
    },
    "source": "bundled",
    "sources": null,
    "propagator": "per-record",
    "frame": "per-record",
    "card": "oddity",
    "glyph": "oddity",
    "colour": "probe",
    "maxItems": 60,
    "train": null
  }
];
