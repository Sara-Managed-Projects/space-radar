// GENERATED from registry/deepsky-heroes/vela.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "vela",
  "record": "dso-vela-pulsar-wind-nebula",
  "stage": "ds-2026-11-17",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: two fitted tori, the jets and the pulsar as about 2 000 soft points in two draws, each brightened or dimmed by the flow's speed toward the camera",
    "3": "close-up: the same; the camera may go between the tori"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 959,
    "ra_deg": 128.836063,
    "dec_deg": -45.176432,
    "axes": "x west, y north, z toward the Sun; the pulsar (the record's place) at the origin"
  },
  "layers": [
    {
      "part": "tori",
      "kind": "fit",
      "what": "the two tori of X-ray light above and below the pulsar's equator, as fitted to Chandra's picture",
      "pa_deg": 130.63,
      "incl_deg": 63.6,
      "r_arcsec": 21.25,
      "blur_arcsec": 3.0,
      "beta": 0.44,
      "sep_arcsec": 11.61,
      "photon_index": 1.5,
      "points": 900,
      "amp": 1.0,
      "check": "atan(2 r sin(zeta) / d) = 73.0 degrees; Ng & Romani 2004: 'approximately 74 degrees'",
      "source": "Ng, C.-Y. & Romani, R. W. 2004, ApJ 601, 479 (arXiv:astro-ph/0310155), Table 1 and section 3; Ng & Romani 2008, ApJ 673, 411 (arXiv:0710.4168), Table 1. The photon index 1.5 is the fixed value both papers adopt for the Doppler factor"
    },
    {
      "part": "jets",
      "kind": "model",
      "what": "the two jets along the spin axis: their speed fitted, their length and brightness modelled",
      "beta": 0.45,
      "from_r": 0.4,
      "length_r": 2.4,
      "width_r": 0.12,
      "points": 300,
      "amp": 0.5,
      "source": "Speed: Ng & Romani 2004, the discussion of the jets (Pavlov et al. 2003's jet index with the fitted tilt gives 0.45). Length, width and brightness: Space Radar's (the papers give none; the jet bends and changes with time, Ng & Romani 2008)"
    },
    {
      "part": "pulsar",
      "kind": "star",
      "what": "the pulsar, a mark of one size on the screen (its own record carries its facts)",
      "size_r": 0.1,
      "amp": 3.0,
      "source": "registry/exotics.yaml vela-pulsar"
    },
    {
      "part": "look",
      "kind": "model",
      "what": "how the points are drawn",
      "seed": 833,
      "colour": [
        0.56,
        0.58,
        1.0
      ],
      "min_px": 1.6,
      "gain": 0.6,
      "source": "Space Radar's; the colour is illustrative"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "ILLUSTRATIVE. X-rays are not light an eye sees: the tori and jets are drawn violet-blue, the pulsar white"
  },
  "drawn": [
    "reconstruction",
    "model"
  ],
  "sources": [
    "Ng, C.-Y. & Romani, R. W. 2004, Fitting pulsar wind tori, ApJ 601, 479 (https://arxiv.org/abs/astro-ph/0310155), Table 1 and its discussion of the tori and jets, read 2026-11-17",
    "Ng, C.-Y. & Romani, R. W. 2008, Fitting pulsar wind tori. II. Error analysis and applications, ApJ 673, 411 (https://arxiv.org/abs/0710.4168), Table 1 and section III.1, read 2026-11-17",
    "Pavlov, G. G. et al. 2003, as Ng & Romani 2004 quote it: the Vela pulsar's inner jet, photon index about 1.1",
    "Dodson, R. et al. 2003, as Ng & Romani 2004 quote it: the pulsar's proper motion, position angle 302 +/- 4 degrees, 8.6 degrees from the fitted axis' line"
  ],
  "review": {
    "data_vs_model": "Measured: the tori's radius, thickness, tilt, position angle, separation and flow speed (Ng & Romani 2004, 2008), the jets' speed. Modelled: which end of the axis is nearer, the jets' length, width and brightness, the scatter of points. Illustrative: the colour. Not drawn: the nebula's fainter large-scale structure, which the papers say the fit leaves out",
    "geometry": "Two identical thin tori, each a Gaussian tube of 3.0 arcseconds round a circle of 21.25 arcseconds, offset along the axis so that their separation on the sky is 11.61 arcseconds; the flow radial in each torus' plane at 0.44 c; the jets along the axis at 0.45 c",
    "colours": "Illustrative, declared on the card",
    "distance": "959 ly, the Vela pulsar's row (registry/exotics.yaml, Wikipedia's infobox, read 2026-09-08); the fitted sizes are in arcseconds and are scaled to it. The papers do not state a distance",
    "credits": "CREDITS.md, Pulsar wind nebulae and the Cat's Eye (2026-11-17); the card's rows name the fit, its papers and that no astronomer has reviewed the drawing",
    "by": "Space Radar maintainers",
    "date": "2026-11-17",
    "astronomer": "not yet; the card says so"
  },
  "credits": [
    "The Vela pulsar wind nebula's tori and axis: Ng & Romani 2004, ApJ 601, 479 and 2008, ApJ 673, 411, fits to Chandra's X-ray pictures; drawn by Space Radar"
  ]
};
