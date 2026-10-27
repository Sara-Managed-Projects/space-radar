// GENERATED from registry/deepsky-heroes/cena.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "cena",
  "record": "dso-centaurus-a",
  "stage": "r14-neb-b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "the structure: the elliptical's smooth light (a billboard, elongated as the galaxy is from each side), its dusty disc warped ring by ring as Quillen et al. 2006 model it, young star clusters and H II regions along it, and the two jets in false colour; statistical points",
    "3": "the same, larger on screen",
    "points": [
      14000,
      42000,
      64000
    ],
    "dust_share": 0.8,
    "seed": 5128,
    "bulge_sparkle": 0.05,
    "dust_peak": 0.42,
    "layer_power": 0.72
  },
  "frame": {
    "pa_deg": 110,
    "incl_deg": 75,
    "near_side": "SW",
    "approaching": null,
    "winding": 1,
    "bulge": "always",
    "units_ly": 100,
    "source": "Quillen et al. 2006 (Spitzer, the warped disc's tilted-ring model, table 1): principal axis PA 20, tilt 75; the near side after Bland et al. 1987 and Nicholson et al. 1992 as Quillen et al. 2006 cite them"
  },
  "layers": [
    {
      "kind": "bulge",
      "what": "the giant elliptical's old stars",
      "sersic_n": 4,
      "re_kpc": 5.44,
      "q": 1.32,
      "light": 0.94,
      "colour": "#f0d4ae",
      "source": "Dufour et al. 1979 as Dumont et al. 2023 (arXiv:2306.11786) adopt it: a de Vaucouleurs (r^1/4) profile, effective radius 305 arcsec (5.44 kpc here), mean ellipticity 0.23, the major axis at PA 35 degrees (Silge et al., as cited there); its long axis is taken along the disc's principal axis (Israel 1998, arXiv:astro-ph/9811051: the disc lies along the minor axis) and q 1.32 is DERIVED so that, tilted 75 degrees, it shows the measured 0.77"
    },
    {
      "kind": "clumps",
      "keep": true,
      "what": "young star clusters along the disc",
      "count": 30,
      "size_kpc": 0.1,
      "scale_kpc": 2.2,
      "r_min_kpc": 0.89,
      "r_max_kpc": 5,
      "light": 0.002,
      "colour": "#e8e4ff",
      "warp": {
        "precession": [
          [
            0.004,
            180
          ],
          [
            0.642,
            210
          ],
          [
            1.017,
            270
          ],
          [
            1.427,
            345
          ],
          [
            1.588,
            375
          ],
          [
            1.784,
            400
          ],
          [
            2.409,
            380
          ],
          [
            2.765,
            345
          ],
          [
            4.282,
            280
          ],
          [
            7.136,
            240
          ]
        ],
        "tilt": [
          [
            0.004,
            25
          ],
          [
            1.784,
            20
          ],
          [
            4.639,
            8
          ],
          [
            7.136,
            8
          ]
        ],
        "alpha0_deg": 0
      },
      "source": "Israel 1998 (arXiv:astro-ph/9811051): the disc is rich in young stars, bright clusters at the dark band's north-western and south-eastern edges; placed statistically on the warped disc; the warp is Quillen et al. 2006's (table 1: precession and tilt splines, here linear, their arcseconds in kpc at the record's distance)"
    },
    {
      "kind": "knots",
      "keep": true,
      "what": "H II regions along the disc",
      "count": 420,
      "in_ring": 0,
      "size_kpc": 0.06,
      "height_kpc": 0.12,
      "scale_kpc": 2.2,
      "r_min_kpc": 0.6,
      "r_max_kpc": 5,
      "light": 0.03,
      "colour": "#ff8fa8",
      "warp": {
        "precession": [
          [
            0.004,
            180
          ],
          [
            0.642,
            210
          ],
          [
            1.017,
            270
          ],
          [
            1.427,
            345
          ],
          [
            1.588,
            375
          ],
          [
            1.784,
            400
          ],
          [
            2.409,
            380
          ],
          [
            2.765,
            345
          ],
          [
            4.282,
            280
          ],
          [
            7.136,
            240
          ]
        ],
        "tilt": [
          [
            0.004,
            25
          ],
          [
            1.784,
            20
          ],
          [
            4.639,
            8
          ],
          [
            7.136,
            8
          ]
        ],
        "alpha0_deg": 0
      },
      "source": "placed statistically on the warped disc; not a catalogue of positions"
    },
    {
      "kind": "stream",
      "what": "the north-eastern jet and its inner lobe (X-rays and radio, drawn in false colour)",
      "path": [
        [
          201.3651,
          -43.0191,
          0.0
        ],
        [
          201.37452,
          -43.01428,
          0.45
        ],
        [
          201.38865,
          -43.00704,
          1.13
        ],
        [
          201.40435,
          -42.99901,
          1.89
        ],
        [
          201.42005,
          -42.99097,
          2.64
        ],
        [
          201.43182,
          -42.98494,
          3.21
        ],
        [
          201.4436,
          -42.97891,
          3.78
        ]
      ],
      "width_kpc": 0.3,
      "tip_light": 0.55,
      "light": 0.00012,
      "colour": "#6f96ff",
      "source": "ILLUSTRATION in false colour (the jet is not seen in visible light): its direction PA 55 degrees and its X-ray emission continuous to 4.5 kpc from the nucleus (Kraft et al. 2002, arXiv:astro-ph/0111340; Hardcastle et al. 2007, arXiv:0710.1277), the inner radio jet and lobe (Israel 1998: inner jet 1.35 kpc, inner lobe 5 kpc); toward us at 50 degrees to our line (Tingay et al. 1998: 50 to 80 degrees), the lower bound taken"
    },
    {
      "kind": "stream",
      "what": "the south-western counter-jet (drawn in false colour)",
      "path": [
        [
          201.3651,
          -43.0191,
          0.0
        ],
        [
          201.35812,
          -43.02267,
          -0.34
        ],
        [
          201.35114,
          -43.02624,
          -0.67
        ],
        [
          201.34417,
          -43.02982,
          -1.01
        ],
        [
          201.33719,
          -43.03339,
          -1.34
        ],
        [
          201.33021,
          -43.03696,
          -1.68
        ]
      ],
      "width_kpc": 0.3,
      "tip_light": 0.7,
      "light": 5e-05,
      "colour": "#6f96ff",
      "source": "ILLUSTRATION in false colour: the faint counter-jet opposite the jet, its extended X-ray emission out to 2.0 kpc (Hardcastle et al. 2007, arXiv:0710.1277), away from us as the jet is toward us"
    },
    {
      "kind": "dust-disc",
      "what": "the warped dusty disc",
      "scale_kpc": 2.0,
      "r_min_kpc": 0.89,
      "r_max_kpc": 7.5,
      "height_kpc": 0.3,
      "weight": 1,
      "strength": 0.8,
      "warp": {
        "precession": [
          [
            0.004,
            180
          ],
          [
            0.642,
            210
          ],
          [
            1.017,
            270
          ],
          [
            1.427,
            345
          ],
          [
            1.588,
            375
          ],
          [
            1.784,
            400
          ],
          [
            2.409,
            380
          ],
          [
            2.765,
            345
          ],
          [
            4.282,
            280
          ],
          [
            7.136,
            240
          ]
        ],
        "tilt": [
          [
            0.004,
            25
          ],
          [
            1.784,
            20
          ],
          [
            4.639,
            8
          ],
          [
            7.136,
            8
          ]
        ],
        "alpha0_deg": 0
      },
      "source": "Quillen et al. 2006 (table 1): a thin disc with an inner gap of 50 arcsec (0.89 kpc here), warped by their precession and tilt; reaching 7 kpc as the H I does (Israel 1998); the dust's radial profile (scale 2 kpc) and thickness illustrative"
    }
  ],
  "colours": {
    "mode": true,
    "note": "Display colours after ESO's photograph (eso1221a): a creamy elliptical, a brown dusty band lit orange at its edges, blue-white young clusters, pink H II regions. The jets are FALSE COLOUR (blue, as Chandra's X-ray pictures are usually shown): they are not seen in visible light."
  },
  "drawn": [
    "model",
    "illustration"
  ],
  "sources": [
    "Quillen, Brookes, Keene et al. 2006, ApJ 645, 1092 (arXiv:astro-ph/0601135): the warped disc's tilted-ring model (table 1) and its near side",
    "Israel 1998, A&ARv 8, 237 (arXiv:astro-ph/9811051), the review: the disc's extent, the inner jet and lobe, the elliptical's shape",
    "Dumont et al. 2023 (arXiv:2306.11786): the effective radius (Dufour et al. 1979), the ellipticity and the major axis as adopted there",
    "Kraft et al. 2002 (arXiv:astro-ph/0111340) and Hardcastle et al. 2007 (arXiv:0710.1277), Chandra: the X-ray jet to 4.5 kpc and the counter-jet to 2.0 kpc; Tingay et al. 1998: the jet's angle to our line",
    "Harris, Rejkuba & Harris 2010 (arXiv:0911.3180): the distance, 3.8 Mpc (the record's 12 Mly is 3.68)",
    "ESO eso1221a (ESO; CC BY 4.0): the colours, by eye"
  ],
  "review": {
    "data_vs_model": "Measured: the elliptical's profile, size and shape, the distance, the jet's direction and length. Model: the warped disc (Quillen et al. 2006's own model, fitted by eye to Spitzer's images), the dust's density and thickness, the clusters' and H II regions' places, the elliptical's three-dimensional shape (prolate along the disc's axis, an approximation of a triaxial galaxy), the jets' depth. Illustration: the jets, in false colour.",
    "geometry": "Principal axis PA 20, tilted 75 degrees (Quillen et al. 2006); rings precessing 180 to 400 degrees and tilted 25 to 8 degrees with radius; the zero of the precession angle is ours (alpha0), set so the band matches the photographs.",
    "colours": "Display values after ESO's photograph; the jets in false colour, said on the card.",
    "distance": "The record's: 12 Mly (3.68 Mpc); Harris et al. 2010's 3.8 Mpc would make every length 3 per cent longer.",
    "credits": "CREDITS.md section 3l, galaxies from their structure (0078 r14-neb-b).",
    "by": "Space Radar maintainers",
    "date": "2026-10-26"
  },
  "credits": [
    "Centaurus A's model: the warped dusty disc after Quillen et al. 2006 (arXiv:astro-ph/0601135), the elliptical after Dufour et al. 1979 as Dumont et al. 2023 adopt it, the jets after Kraft et al. 2002, Hardcastle et al. 2007 and Israel 1998 (drawn in false colour), the colours matched by eye to ESO's photograph eso1221a (ESO; CC BY 4.0). Facts, cited; the model copies no image."
  ]
};
