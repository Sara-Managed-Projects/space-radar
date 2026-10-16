// GENERATED from registry/deepsky-heroes/coalsack.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "coalsack",
  "record": "dso-coalsack",
  "stage": "W3-c",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the cloud absorbing and reddening the stars and the Milky Way behind it (8 samples through it; its crossing in closed form on T0 and under the latch)",
    "3": "close-up: the same with up to 16 samples; the camera may go into the cloud"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 587,
    "ra_deg": 192.5,
    "dec_deg": -62.5,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "dust",
      "kind": "dust",
      "what": "the near cloud of the Coalsack: dust that absorbs and reddens, never glows",
      "file": "site/images/deep/sheets/coalsack-dust.webp",
      "from": "site/textures/4k/milky_way.webp (NASA/Goddard Space Flight Center Scientific Visualization Studio, Gaia DR2: ESA/Gaia/DPAC), resampled north up on the sky round the record",
      "picture": {
        "ra_deg": 192.5,
        "dec_deg": -62.5,
        "width_arcmin": 840,
        "height_arcmin": 840,
        "north_deg": 0
      },
      "px": 256,
      "rule": {
        "background": "galactic-latitude",
        "window_deg": 15,
        "smooth_arcmin": 12,
        "envelope_arcmin": 150,
        "blur_arcmin": 60,
        "dark_below": 0.85,
        "cloud_below": 0,
        "cloud_tau": 0
      },
      "tau_max": 3.0,
      "feather": [
        0.5,
        0.95
      ],
      "front": {
        "z_ly": 0,
        "half_ly": 9.0
      },
      "reddening": {
        "law": "Cardelli, Clayton & Mathis 1989",
        "rv": 3.1,
        "lambda_um": [
          0.61,
          0.55,
          0.45
        ]
      },
      "source": "The Milky Way map's darkness against the Milky Way round it (reconstructed by Space Radar, scripts/build_deep_sheets.py); NASA SVS Deep Star Maps 2020 (https://svs.gsfc.nasa.gov/4851/); the extinction law: Cardelli, Clayton & Mathis 1989, ApJ 345, 245, R_V = 3.1"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {},
    "note": "Nothing of its own is drawn: the dust dims and reddens what is behind it by the Cardelli, Clayton and Mathis law"
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "Beuther, H. et al. 2011, The Coalsack near and far, A&A (https://arxiv.org/abs/1107.2298): the near cloud at 100 to 200 pc, a second cloud at about 3.1 kpc in the north-east, extinction above 6 and up to 10 magnitudes in a few places",
    "NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020 (Gaia DR2: ESA/Gaia/DPAC), the Milky Way map the app already shows: the cloud's darkness",
    "Cardelli, J. A., Clayton, G. C. & Mathis, J. S. 1989, ApJ 345, 245: the extinction law (R_V = 3.1)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, place and size, and the darkness (the Milky Way map). Reconstructed: the optical depth from the darkness (the rule; lower than the near-infrared maps'), the cloud's thickness; the far cloud drawn at the near distance, said on the card",
    "geometry": "One cloud at the near distance (Beuther et al. 2011 find several clouds, one at 3 kpc); its thickness is illustrative",
    "colours": "None of its own; the reddening of what is behind is Cardelli, Clayton and Mathis's law",
    "distance": "587 ly, the record's (180 pc), inside the 100 to 200 pc the surveys give",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-17",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Coalsack as a dark cloud: Beuther et al. 2011, A&A; reconstructed by Space Radar from the darkness of NASA's Deep Star Maps 2020 (NASA/Goddard Space Flight Center Scientific Visualization Studio, Gaia DR2: ESA/Gaia/DPAC)",
    "The extinction law: Cardelli, Clayton & Mathis 1989, ApJ 345, 245"
  ]
};
