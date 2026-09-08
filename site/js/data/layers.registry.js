// GENERATED from registry/layers.yaml by scripts/gen_layers_js.py. Do not edit.
//
// `python3 scripts/gen_layers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// data/layers.js keeps the hand-written half of every layer (its selection rule, its parser, its
// stand-in) and takes `enabled`, `display` and `moments` from here. A layer switched off in the
// registry is never loaded, listed or searched.

/** Every layer the registry knows, with the fields the registry decides. Order is the registry's. */
export const LAYER_ROWS = [
  {
    "id": "worlds",
    "display": "Planets and moons",
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
    "maxItems": 20
  },
  {
    "id": "stars",
    "display": "Stars",
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
    "maxItems": 200000
  },
  {
    "id": "exoplanets",
    "display": "Planets around other stars",
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
    "maxItems": 8000
  },
  {
    "id": "deep-sky",
    "display": "Nebulae, clusters and galaxies",
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
    "maxItems": 2000
  },
  {
    "id": "galaxy",
    "display": "The Milky Way",
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
    "maxItems": 4
  },
  {
    "id": "exotics",
    "display": "Black holes and other extremes",
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
    "maxItems": 200
  },
  {
    "id": "stations",
    "display": "Crewed stations",
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
    "maxItems": 20
  },
  {
    "id": "notable",
    "display": "Satellites worth knowing",
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
    "maxItems": 80
  },
  {
    "id": "starlink-trains",
    "display": "Fresh Starlink trains",
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
    "maxItems": 400
  },
  {
    "id": "just-launched",
    "display": "Launched in the last two weeks",
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
    "maxItems": 200
  },
  {
    "id": "active",
    "display": "Everything active",
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
    "maxItems": 15000
  },
  {
    "id": "geo-ring",
    "display": "The geostationary ring",
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
    "maxItems": 900
  },
  {
    "id": "debris-notable",
    "display": "Famous debris",
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
    "maxItems": 40
  },
  {
    "id": "launches",
    "display": "Rockets on their way up",
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
    "maxItems": 30
  },
  {
    "id": "asteroids",
    "display": "Asteroids passing by",
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
    "maxItems": 300
  },
  {
    "id": "comets",
    "display": "Comets",
    "enabled": true,
    "moments": {
      "wonder": true,
      "now": false,
      "next": true
    },
    "source": "mpc-comets",
    "sources": null,
    "propagator": "kepler",
    "frame": "sun-inertial",
    "card": "comet",
    "glyph": "comet",
    "colour": "comet",
    "maxItems": 60
  },
  {
    "id": "deep-space",
    "display": "Probes and telescopes",
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
    "maxItems": 40
  },
  {
    "id": "visual",
    "display": "Bright enough to see",
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
    "maxItems": 200
  },
  {
    "id": "ground-sites",
    "display": "Pads, dishes and observatories",
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
    "maxItems": 400
  },
  {
    "id": "hand-kept-sites",
    "display": "Dishes, landers and rovers",
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
    "maxItems": 40
  },
  {
    "id": "reentries",
    "display": "Things that came down",
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
    "maxItems": 10
  },
  {
    "id": "oddities",
    "display": "Odd things we sent",
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
    "maxItems": 60
  }
];
