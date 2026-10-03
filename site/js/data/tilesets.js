// GENERATED from registry/tilesets.yaml by scripts/gen_tilesets_js.py. Do not edit.
//
// `python3 scripts/gen_tilesets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** Map tiles a world is drawn from when the camera is close (scene/tiles.js, scene/tilemath.js). */
export const TILESETS = [
  {
    "id": "moon-lro-wac",
    "world": "moon",
    "title": "Lunar Reconnaissance Orbiter Wide Angle Camera global mosaic, 100 m per pixel",
    "url": "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
    "matrix": [
      2,
      1
    ],
    "tilePx": 256,
    "minLevel": 3,
    "startLevel": 5,
    "maxLevel": 8,
    "resolutionM": 83,
    "grade": [
      3.67,
      3.48,
      3.45
    ],
    "credit": "The Moon close up: Lunar Reconnaissance Orbiter WAC mosaic, NASA/GSFC/Arizona State University, from NASA Solar System Treks"
  },
  {
    "id": "mars-themis-day-ir",
    "world": "mars",
    "title": "Mars Odyssey THEMIS daytime infrared global mosaic, 100 m per pixel, as detail over the colour map",
    "url": "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly/1.0.0/default/default028mm/{z}/{y}/{x}.png",
    "mode": "detail",
    "matrix": [
      2,
      1
    ],
    "tilePx": 256,
    "minLevel": 3,
    "startLevel": 5,
    "maxLevel": 8,
    "resolutionM": 162,
    "grade": [
      4.79,
      4.79,
      4.79
    ],
    "credit": "Mars close up: THEMIS daytime infrared mosaic, NASA/JPL-Caltech/Arizona State University, from NASA Solar System Treks, as detail over the colour map"
  }
];
