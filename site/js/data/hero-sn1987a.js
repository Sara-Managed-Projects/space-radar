// GENERATED from registry/deepsky-heroes/sn1987a.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "sn1987a",
  "record": "dso-sn-1987a",
  "stage": "ds4-2026-11-17",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: three rings and a mark where the star was, in one draw call",
    "3": "close-up: the same; the camera may go inside the rings"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 167600,
    "ra_deg": 83.8667917,
    "dec_deg": -69.2699417,
    "axes": "x west, y north, z toward the Sun; light-years about the supernova's place",
    "at_kpc": 50,
    "distance_kpc": 51.4,
    "axis_far_pa_deg": 351.1,
    "source": "Panagia 2003 (distance, ER size); Sugerman et al. 2005, ApJS 159, 60 (arXiv:astro-ph/0502378), Table 3 and section I; Tziamtzis et al. 2011, A&A 527, A35 (arXiv:1008.3387), section 4.1"
  },
  "layers": [
    {
      "part": "equatorial-ring",
      "kind": "ring",
      "what": "the equatorial ring: about 0.66 light-years in radius, the inner of the three rings, lit by the supernova's flash in 1987",
      "a_ly": 0.647,
      "ratio_ba": 0.98,
      "pa_deg": 81.1,
      "x0_ly": 0.015,
      "y0_ly": 0.0,
      "height_ly": 0.0,
      "incl_deg": 43,
      "points": 360,
      "colour": [
        1.0,
        0.72,
        0.35
      ],
      "symbol_arcsec": 0.07,
      "alpha": 0.5,
      "source": "Sugerman et al. 2005, Table 3 and section I; Panagia 2003 (its angular radius, 808 +/- 17 mas, is the check); Tziamtzis et al. 2011, section 4.1"
    },
    {
      "part": "north-outer-ring",
      "kind": "ring",
      "what": "the northern outer ring, about 1.4 light-years in semi-major axis",
      "a_ly": 1.42,
      "ratio_ba": 0.94,
      "pa_deg": 70.5,
      "x0_ly": 0.26,
      "y0_ly": 0.04,
      "height_ly": 1.36,
      "incl_deg": 45,
      "points": 300,
      "colour": [
        0.45,
        0.8,
        1.0
      ],
      "symbol_arcsec": 0.1,
      "alpha": 0.28,
      "source": "Sugerman et al. 2005, Table 3 (the ellipse); Tziamtzis et al. 2011, section 4.1 (the tilt)"
    },
    {
      "part": "south-outer-ring",
      "kind": "ring",
      "what": "the southern outer ring, about 1.6 light-years in semi-major axis; it is distorted and not exactly an ellipse",
      "a_ly": 1.59,
      "ratio_ba": 0.92,
      "pa_deg": -1.1,
      "x0_ly": 0.19,
      "y0_ly": 0.06,
      "height_ly": -1.0,
      "incl_deg": 38,
      "points": 300,
      "colour": [
        0.45,
        0.8,
        1.0
      ],
      "symbol_arcsec": 0.1,
      "alpha": 0.28,
      "source": "Sugerman et al. 2005, Table 3 (the ellipse; 'no single ellipse can fully reproduce the observed shape of the SOR unless it is non-planar'); Tziamtzis et al. 2011, section 4.1 (the tilt)"
    },
    {
      "part": "supernova",
      "kind": "mark",
      "what": "where the star was: a mark of one size on the screen",
      "colour": [
        1.0,
        1.0,
        1.0
      ],
      "alpha": 1.0,
      "source": "the record's place (Wikipedia's infobox, read 2026-11-17)"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "ILLUSTRATIVE COLOUR: warm orange for the equatorial ring and pale blue for the two outer rings, a legend and not a photograph; the points that mark each ring are a display value"
  },
  "drawn": [
    "reconstruction",
    "illustration"
  ],
  "sources": [
    "Sugerman, B. E. K., Crotts, A. P. S., Kunkel, W. E., Heathcote, S. R. & Lawrence, S. S. 2005, The three-dimensional circumstellar environment of SN 1987A, ApJS 159, 60 (https://arxiv.org/abs/astro-ph/0502378), read 2026-11-17: Table 3, sections I and VIII.3",
    "Panagia, N. 2003, A geometric determination of the distance to SN 1987A and the LMC (https://arxiv.org/abs/astro-ph/0309416), the abstract, read 2026-11-17",
    "Tziamtzis, A., Lundqvist, P., Gröningsson, P. & Nasoudi-Shoar, S. 2011, The outer rings of SN 1987A, A&A 527, A35 (https://arxiv.org/abs/1008.3387), section 4.1, read 2026-11-17"
  ],
  "review": {
    "data_vs_model": "Measured: the rings' angular sizes, their offsets and heights from the supernova (light echoes) and their tilts. Modelled: each ring as a plane ellipse, the points that mark it. Not drawn: the knots, the debris, the ring's growth, the hourglass",
    "geometry": "Table 3 of Sugerman et al. 2005 (ellipse sizes, axis ratios, position angles, offsets, heights), scaled from their 50 kpc to the record's 51.4 kpc so the angles stay; tilts from Tziamtzis et al. 2011 (45 and 38 degrees) and the ring's 43 degrees; the axis's far end at position angle 351.1 degrees. To check: the sign of the heights against the paper's own figure 42 (north ring behind the supernova), and the ellipses' major-axis angle in the primed frame (Appendix B.2)",
    "colours": "Illustrative, declared on the card",
    "distance": "167 600 ly: 51.4 +/- 1.2 kpc from the ring itself (Panagia 2003); the LMC hero's disc is drawn at the LMC's own distance (Pietrzynski et al. 2019, 49.59 kpc), 2 kpc nearer: Panagia 2003 gives the LMC's barycentre 51.7 +/- 1.3 kpc, so the two agree within their errors",
    "credits": "CREDITS.md, SN 1987A's rings (2026-11-17): the papers; no picture or file is used",
    "by": "Space Radar maintainers",
    "date": "2026-11-17",
    "astronomer": "not yet; the card says so"
  },
  "credits": [
    "SN 1987A's rings: Sugerman et al. 2005 (ApJS 159, 60), Panagia 2003 (arXiv:astro-ph/0309416) and Tziamtzis et al. 2011 (A&A 527, A35); the numbers are published measurements, cited, and no picture or file of the papers is used"
  ]
};
