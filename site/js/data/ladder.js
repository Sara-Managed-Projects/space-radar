// GENERATED from registry/ladder.yaml by scripts/gen_ladder_js.py. Do not edit.
//
// `python3 scripts/gen_ladder_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** The breadcrumb: places in order of distance, each a world or a record the app has. */
export const LADDER_RUNGS = [
  {
    "id": "moon",
    "label": "The Moon",
    "target": {
      "world": "moon"
    },
    "distance": "384 400 km",
    "why": "The only other world people have stood on. Light takes 1.3 seconds."
  },
  {
    "id": "sun",
    "label": "The Sun",
    "target": {
      "world": "sun"
    },
    "distance": "150 million km",
    "why": "Eight light-minutes. Everything on the Earth stage is lit from here."
  },
  {
    "id": "neptune",
    "label": "Neptune",
    "target": {
      "world": "neptune"
    },
    "distance": "4.5 billion km",
    "why": "Four light-hours. The last planet, and the edge of the map's true-scale Solar System."
  },
  {
    "id": "proxima",
    "label": "Proxima Centauri",
    "target": {
      "record": "hip-70890"
    },
    "layer": "stars",
    "distance": "4.2 light-years",
    "why": "The nearest star to the Sun. The fastest thing we have ever built would take seventy thousand years."
  },
  {
    "id": "pleiades",
    "label": "The Pleiades",
    "target": {
      "record": "dso-m45"
    },
    "layer": "deep-sky",
    "distance": "about 440 light-years",
    "why": "A cluster you can see with your eyes in winter. Its light left in the sixteenth century."
  },
  {
    "id": "galactic-centre",
    "label": "Sagittarius A*",
    "target": {
      "record": "exotic-sgr-a-star"
    },
    "layer": "exotics",
    "distance": "27 000 light-years",
    "why": "The black hole our whole galaxy turns around. Its light left when people were painting caves."
  },
  {
    "id": "andromeda",
    "label": "The Andromeda Galaxy",
    "target": {
      "record": "dso-m31"
    },
    "layer": "deep-sky",
    "distance": "2.5 million light-years",
    "why": "The nearest big galaxy, and the farthest thing most people have seen with their own eyes."
  },
  {
    "id": "m87",
    "label": "M87's black hole",
    "target": {
      "record": "exotic-m87-star"
    },
    "layer": "exotics",
    "distance": "53 million light-years",
    "why": "The first black hole ever photographed. This is the edge of what this map draws as a place."
  }
];

/** How much of the known sky this map draws, with sources. */
export const WE_SHOW = [
  {
    "what": "stars drawn",
    "n": 109389,
    "of": "1.8 billion in Gaia's catalogue; a few hundred billion in the Milky Way",
    "source": "HYG v4.4 with a measured distance; Gaia DR3 count; Wikipedia 'Milky Way' 100-400 billion"
  },
  {
    "what": "planets around other stars",
    "n": 6332,
    "of": "every confirmed one, as of the catalogue copy's date",
    "source": "NASA Exoplanet Archive pscomppars"
  },
  {
    "what": "nebulae, clusters and galaxies placed",
    "n": 167,
    "of": "13 372 in OpenNGC that have no measured distance written down; the rest of the Local Group waits for sourced rows",
    "source": "OpenNGC; Wikipedia Messier distances"
  },
  {
    "what": "black holes, pulsars, a magnetar and two doomed stars with a fact sheet",
    "n": 20,
    "of": "dozens known; a hand-kept list",
    "source": "registry/exotics.yaml"
  }
];
