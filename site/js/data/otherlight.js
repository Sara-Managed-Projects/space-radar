// GENERATED from registry/otherlight.yaml by scripts/gen_otherlight_js.py. Do not edit.
//
// `python3 scripts/gen_otherlight_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** One all-sky survey per band: its HiPS at CDS, the baked whole-sky picture, the frame its tiles are cut in, and its credit. */
export const OTHER_LIGHT = [
  {
    "id": "infrared",
    "hips_id": "CDS/P/allWISE/color",
    "base": "https://alasky.cds.unistra.fr/AllWISE/RGB-W4-W2-W1",
    "file": "site/images/otherlight/infrared.webp",
    "frame": "equatorial",
    "max_order": 8,
    "tile_width": 512,
    "format": "jpg",
    "stream": true,
    "gain": 2.0,
    "mission": "WISE",
    "credit": "NASA/JPL-Caltech/UCLA (WISE)",
    "terms": "https://irsa.ipac.caltech.edu/data/WISE/docs/release/All-Sky/"
  },
  {
    "id": "microwave",
    "hips_id": "CDS/P/WMAP/W/9yr",
    "base": "https://alasky.cds.unistra.fr/WMAP9yr/WMAPW9yr",
    "file": "site/images/otherlight/microwave.webp",
    "frame": "galactic",
    "max_order": 3,
    "tile_width": 64,
    "format": "jpg",
    "stream": false,
    "gain": 1.5,
    "mission": "WMAP",
    "credit": "NASA/WMAP Science Team (LAMBDA)",
    "terms": "https://lambda.gsfc.nasa.gov/product/wmap/dr5/maps_band_r9_i_9yr_get.html"
  },
  {
    "id": "gamma",
    "hips_id": "CDS/P/Fermi/color",
    "base": "https://alasky.cds.unistra.fr/Fermi/Color",
    "file": "site/images/otherlight/gamma.webp",
    "frame": "equatorial",
    "max_order": 3,
    "tile_width": 512,
    "format": "jpg",
    "stream": false,
    "gain": 1.1,
    "mission": "Fermi",
    "credit": "NASA/DOE/Fermi LAT Collaboration",
    "terms": "https://fermi.gsfc.nasa.gov/ssc/data/policy/"
  }
];

/** The tiles' own licence (the HEALPix processing is CDS's). */
export const HIPS_LICENCE = {
  "name": "ODbL-1.0",
  "holder": "CNRS/Unistra (CDS)",
  "page": "https://aladin.cds.unistra.fr/hips/"
};
