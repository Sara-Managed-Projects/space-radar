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
    "credit": "The Moon close up: Lunar Reconnaissance Orbiter WAC mosaic, NASA/GSFC/Arizona State University, from NASA Solar System Treks",
    "relief": {
      "title": "Lunar Orbiter Laser Altimeter shaded relief, 118 m per pixel",
      "url": "https://trek.nasa.gov/tiles/Moon/EQ/LRO_LOLA_Shade_Global_256ppd_v06/1.0.0/default/default028mm/{z}/{y}/{x}.png",
      "maxLevel": 6,
      "lightAzimuthDeg": 270,
      "flat": 0.65,
      "gain": 1,
      "credit": "The Moon's relief: Lunar Orbiter Laser Altimeter shaded relief, LOLA Science Team, NASA/GSFC, from NASA Solar System Treks"
    }
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
    "credit": "Mars close up: THEMIS daytime infrared mosaic, NASA/JPL-Caltech/Arizona State University, from NASA Solar System Treks, as detail over the colour map",
    "relief": {
      "title": "Mars Orbiter Laser Altimeter and HRSC blended shaded relief, 200 m per pixel",
      "url": "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
      "maxLevel": 7,
      "lightAzimuthDeg": 315,
      "flat": 0.68,
      "gain": 1,
      "credit": "Mars's relief: MOLA and HRSC blended shaded relief, NASA/GSFC (MOLA, CC0) and ESA/DLR/FU Berlin (HRSC, CC BY-SA 3.0 IGO), USGS Astrogeology, from NASA Solar System Treks"
    }
  },
  {
    "id": "earth-blue-marble",
    "world": "earth",
    "title": "Blue Marble with shaded relief and the sea floor (MODIS), 500 m per pixel",
    "url": "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/{z}/{y}/{x}.jpeg",
    "matrix": [
      2,
      1
    ],
    "tilePx": 512,
    "minLevel": 3,
    "startLevel": 5,
    "maxLevel": 7,
    "resolutionM": 489,
    "grade": [
      2.0,
      2.3,
      2.5
    ],
    "credit": "The Earth close up: Blue Marble with shaded relief and bathymetry, NASA Earth Observatory. We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",
    "span0": 288,
    "gradeSea": [
      8.3,
      5.7,
      4.7
    ],
    "bakedRelief": true
  }
];
