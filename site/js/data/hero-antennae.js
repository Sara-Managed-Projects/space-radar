// GENERATED from registry/deepsky-heroes/antennae.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "antennae",
  "record": "dso-antennae-galaxies",
  "stage": "W3-f",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "two disturbed discs full of star-forming knots, where the sky puts them, and their two long tails; statistical points",
    "3": "the same, larger on screen",
    "points": [
      9000,
      30000,
      45000
    ],
    "dust_share": 0.3,
    "seed": 4038
  },
  "frame": {
    "pa_deg": 0,
    "incl_deg": 0,
    "units_ly": 100,
    "note": "a system: no galaxy at the record's own place; each component has its own frame",
    "source": "the components' outlines: RC3 (de Vaucouleurs et al. 1991; VizieR VII/155); their places: SIMBAD"
  },
  "layers": [
    {
      "kind": "component",
      "name": "NGC 4038",
      "ra_deg": 180.470842,
      "dec_deg": -18.867589,
      "toward_kpc": 0,
      "points": [
        9000,
        30000,
        45000
      ],
      "frame": {
        "pa_deg": 80,
        "incl_deg": 54,
        "near_side": null,
        "approaching": null,
        "winding": 1,
        "source": "RC3: PA 80 degrees, log R25 0.23 (an axis ratio of 0.59, read as an inclination of 54 degrees: illustrative, the disc is torn)"
      },
      "layers": [
        {
          "kind": "bulge",
          "what": "its nucleus",
          "sersic_n": 2,
          "re_kpc": 0.6,
          "q": 0.8,
          "light": 0.1,
          "colour": "#f4e4d0",
          "source": "illustrative"
        },
        {
          "kind": "disc",
          "what": "its torn disc",
          "scale_kpc": 2.2,
          "height_kpc": 0.5,
          "r_max_kpc": 9,
          "light": 0.42,
          "arm_contrast": 0,
          "colour": "#e8dccc",
          "colour_outer": "#d6d6e0",
          "source": "RC3: D25 5.25 arcmin (34 kpc here, the faint torn outskirts); scale length 2.2 kpc and height assumed, so the bright body is the 3 arcmin the photographs show"
        },
        {
          "kind": "clumps",
          "what": "the giant star-forming complexes",
          "count": 16,
          "size_kpc": 0.6,
          "light": 0.24,
          "colour": "#c8d4ff",
          "source": "illustrative: the knots Hubble's pictures show round the disc's rim and in the overlap"
        },
        {
          "kind": "knots",
          "what": "young star clusters and H II regions",
          "count": 900,
          "in_ring": 0,
          "size_kpc": 0.08,
          "height_kpc": 0.1,
          "light": 0.1,
          "colour": "#ff8fa6",
          "source": "placed statistically; not a catalogue of positions"
        },
        {
          "kind": "stream",
          "what": "the southern tail",
          "path": [
            [
              180.48374,
              -18.89855,
              0
            ],
            [
              180.49915,
              -18.92041,
              -1
            ],
            [
              180.49658,
              -18.94713,
              -3
            ],
            [
              180.47604,
              -18.97628,
              -6
            ],
            [
              180.44523,
              -18.99911,
              -10
            ],
            [
              180.41442,
              -19.00931,
              -14
            ],
            [
              180.38361,
              -19.01125,
              -18
            ],
            [
              180.35537,
              -19.00785,
              -22
            ],
            [
              180.33227,
              -19.00057,
              -25
            ]
          ],
          "width_kpc": 2.4,
          "tip_light": 0.45,
          "light": 0.05,
          "colour": "#c6cce0",
          "source": "its places on the sky traced on Robert Gendler's photograph heic0812c (ESA/Hubble, CC BY 4.0): its tip 11.2 arcmin from NGC 4038 (Hibbard et al. 2001, arXiv:astro-ph/0110581: 11.6 arcmin, about 65 kpc projected); its parent NGC 4038, as Hibbard et al. 2001 make NGC 4039 the northern tail's; its depth a MODEL: the tip bends away from us (Hibbard et al. 2001's abstract), the amount illustrative"
        },
        {
          "kind": "dust-disc",
          "what": "its dust",
          "scale_kpc": 3,
          "height_kpc": 0.15,
          "weight": 0.5,
          "source": "illustrative: the dark lanes over both discs and the overlap"
        }
      ]
    },
    {
      "kind": "component",
      "name": "NGC 4039",
      "ra_deg": 180.472958,
      "dec_deg": -18.886194,
      "toward_kpc": -2,
      "points": [
        7000,
        24000,
        36000
      ],
      "light": 0.85,
      "frame": {
        "pa_deg": 130,
        "incl_deg": 59,
        "near_side": null,
        "approaching": null,
        "winding": 1,
        "source": "RC3: PA 130 degrees, log R25 0.29 (an axis ratio of 0.51, read as 59 degrees: illustrative); 2 kpc behind NGC 4038 illustrative"
      },
      "layers": [
        {
          "kind": "bulge",
          "what": "its nucleus",
          "sersic_n": 2,
          "re_kpc": 0.5,
          "q": 0.8,
          "light": 0.12,
          "colour": "#f4e4d0",
          "source": "illustrative"
        },
        {
          "kind": "disc",
          "what": "its torn disc",
          "scale_kpc": 1.6,
          "height_kpc": 0.4,
          "r_max_kpc": 7,
          "light": 0.48,
          "arm_contrast": 0,
          "colour": "#e8dccc",
          "colour_outer": "#d6d6e0",
          "source": "RC3: D25 3.1 arcmin (20 kpc here); scale length 1.6 kpc and height assumed"
        },
        {
          "kind": "clumps",
          "what": "star-forming complexes",
          "count": 10,
          "size_kpc": 0.5,
          "light": 0.16,
          "colour": "#c8d4ff",
          "source": "illustrative"
        },
        {
          "kind": "knots",
          "what": "young star clusters and H II regions",
          "count": 500,
          "in_ring": 0,
          "size_kpc": 0.08,
          "height_kpc": 0.1,
          "light": 0.06,
          "colour": "#ff8fa6",
          "source": "placed statistically"
        },
        {
          "kind": "stream",
          "what": "the northern tail",
          "path": [
            [
              180.48888,
              -18.85871,
              0
            ],
            [
              180.51455,
              -18.84414,
              2
            ],
            [
              180.53253,
              -18.8281,
              4
            ],
            [
              180.54177,
              -18.80624,
              7
            ],
            [
              180.54639,
              -18.78681,
              10
            ],
            [
              180.54793,
              -18.77467,
              12
            ]
          ],
          "width_kpc": 2.2,
          "tip_light": 0.4,
          "light": 0.04,
          "colour": "#c6cce0",
          "source": "its places on the sky traced on heic0812c; Hibbard et al. 2001: NGC 4039 is its parent and its hydrogen reaches 7.3 arcmin (40 kpc); its depth a MODEL (toward us, illustrative: no source read gives its sign)"
        },
        {
          "kind": "dust-disc",
          "what": "its dust",
          "scale_kpc": 2,
          "height_kpc": 0.15,
          "weight": 0.4,
          "source": "illustrative"
        }
      ]
    }
  ],
  "colours": {
    "mode": true,
    "note": "Display colours from Hubble's and Gendler's photographs (heic0812c): warm nuclei, blue-white star-forming complexes, pink H II regions, faint grey-blue tails. Not enhanced."
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "SIMBAD (CDS): NGC 4038 ICRS 12 01 53.002 -18 52 03.32; NGC 4039 ICRS 12 01 53.51 -18 53 10.3; read 2026-10-20",
    "Schweizer et al. 2008, AJ 136, 1482 (arXiv:0807.3955): 22 +/- 3 Mpc (Saviane et al. 2008, arXiv:0802.1045, find 13.3 +/- 1.0)",
    "Hibbard, van der Hulst, Barnes & Rich 2001 (arXiv:astro-ph/0110581): the tails' H I, their lengths, their parents, the southern tip bending away",
    "Privon et al. 2013 (arXiv:1305.5865) and Karl et al. 2010 (arXiv:1003.0685): the simulations' encounter geometry, which the tails' depths follow only in kind",
    "RC3 (de Vaucouleurs et al. 1991): each galaxy's outline and position angle",
    "ESA/Hubble heic0812c (credit Robert Gendler, CC BY 4.0): where the tails are on the sky"
  ],
  "review": {
    "data_vs_model": "Measured: the two galaxies' places, the tails' places on the sky, the distance. Model: the discs' tilts (from torn outlines), their structure, every depth along our line (the southern tip bending away is published; how far is ours), the light shares.",
    "geometry": "Two components at SIMBAD's places, NGC 4039 2 kpc behind (illustrative); the southern tail from NGC 4038, the northern from NGC 4039 (Hibbard et al. 2001); the tails' depths a model.",
    "colours": "Display values after the photographs; nothing enhanced.",
    "distance": "The record's: 71.75 Mly (22.0 Mpc, Schweizer et al. 2008); Saviane et al. 2008's 13.3 Mpc would make every length 0.6 times as long.",
    "credits": "CREDITS.md section 3l, galaxies from their structure (0077 W3-f); the photograph in section 3g.",
    "by": "Space Radar maintainers",
    "date": "2026-10-20"
  },
  "credits": [
    "The Antennae's model: the galaxies' places from SIMBAD (CDS), their outlines from RC3, the distance after Schweizer et al. 2008, the tails' lengths and parents after Hibbard et al. 2001, traced on Robert Gendler's photograph heic0812c (ESA/Hubble, CC BY 4.0). Facts, cited; the model copies no image."
  ]
};
