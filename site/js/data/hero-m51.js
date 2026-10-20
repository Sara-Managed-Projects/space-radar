// GENERATED from registry/deepsky-heroes/m51.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m51",
  "record": "dso-m51",
  "stage": "W3-f",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "the structure: a smooth integrated-light layer (disc, two grand-design arms, dust lanes on their inner edges; the bulge facing the camera), statistical points as sparkle; NGC 5195 as Sersic points, and the arm that reaches it",
    "3": "the same, larger on screen",
    "points": [
      12000,
      40000,
      60000
    ],
    "dust_share": 0.3,
    "seed": 51,
    "layer_power": 0.7
  },
  "frame": {
    "pa_deg": 173,
    "incl_deg": 22,
    "near_side": "E",
    "approaching": "N",
    "units_ly": 100,
    "source": "orientation: Colombo et al. 2014 (PAWS); the approaching half from the THINGS velocity map; the near side derived from the rotation and trailing arms"
  },
  "layers": [
    {
      "kind": "bulge",
      "what": "a small, nearly exponential bulge",
      "sersic_n": 1.0,
      "re_kpc": 0.74,
      "q": 0.85,
      "light": 0.13,
      "colour": "#f4e8dc",
      "source": "S4G decomposition (Salo et al. 2015, ApJS 219, 4; VizieR J/ApJS/219/4 table7): n = 0.995, Re = 21.62 arcsec (0.74 kpc here), bulge-to-total 0.128; q assumed"
    },
    {
      "kind": "disc",
      "what": "the stellar disc",
      "scale_kpc": 2.88,
      "height_kpc": 0.35,
      "r_max_kpc": 15,
      "light": 0.45,
      "arm_contrast": 0.6,
      "colour": "#e2d6cc",
      "colour_outer": "#cfd0dc",
      "source": "S4G table7: the 3.6 micron scale length 84.2 arcsec (2.88 kpc here); Meijerink et al. 2005 (arXiv:astro-ph/0409511) find 80 to 93 arcsec in B, R, I and K; height assumed; cut at 15 kpc, past the catalogue's 13.7 arcmin"
    },
    {
      "kind": "arms",
      "what": "two grand-design arms of young stars",
      "count": 2,
      "pitch_deg": 19,
      "r_from_kpc": 1.2,
      "r_to_kpc": 12,
      "width_kpc": 0.75,
      "height_kpc": 0.15,
      "scale_kpc": 5,
      "segments": 0.9,
      "light": 0.32,
      "colour": "#a8c0f4",
      "source": "pitch: Puerari et al. 2014 (arXiv:1408.3658): about 19 degrees for the main two-armed spiral at 8 microns (Shetty et al. 2007 give 21.1 for the CO arm, Honig & Reid 2015 13.4 and 8.3 from H II regions); width, extent and the light's share illustrative"
    },
    {
      "kind": "knots",
      "what": "H II regions along the arms",
      "count": 900,
      "in_ring": 0,
      "size_kpc": 0.05,
      "height_kpc": 0.06,
      "light": 0.06,
      "colour": "#ff8fa0",
      "source": "placed statistically along the arms; not a catalogue of positions"
    },
    {
      "kind": "dust-lanes",
      "what": "dust on the arms' inner edges",
      "inset_kpc": 0.3,
      "width_kpc": 0.22,
      "height_kpc": 0.07,
      "weight": 0.55,
      "source": "illustrative: the lanes every photograph of M51 shows on the arms' inner edges"
    },
    {
      "kind": "dust-disc",
      "what": "a thin dust disc",
      "scale_kpc": 3,
      "height_kpc": 0.08,
      "weight": 0.2,
      "source": "assumed"
    },
    {
      "kind": "stream",
      "what": "the arm that reaches NGC 5195",
      "path": [
        [
          202.53439,
          47.21389,
          2.19
        ],
        [
          202.53257,
          47.22627,
          2.0
        ],
        [
          202.52733,
          47.23865,
          1.48
        ],
        [
          202.51981,
          47.25104,
          0.72
        ],
        [
          202.51137,
          47.26032,
          -0.13
        ],
        [
          202.50066,
          47.26574,
          -1.0
        ]
      ],
      "width_kpc": 0.7,
      "tip_light": 0.6,
      "light": 0.035,
      "colour": "#c4cce4",
      "source": "its places on the sky traced on NASA/ESA's photograph heic0506a (registry/nebulae.yaml m51); its depth a MODEL: it leaves M51's disc where the disc's tilt puts it (22 degrees, the east near) and ends in front of NGC 5195, whose nucleus shows absorption by M51's outer arm (Ritchey et al. 2015, arXiv:1501.03223)"
    },
    {
      "kind": "satellites",
      "what": "NGC 5195, M51's companion",
      "drawn_by": "this hero (scene/deep/spiral.js, one Points draw); it has no record of its own: it gives way to M51's photograph as M51 does",
      "members": [
        {
          "name": "NGC 5195",
          "ra_deg": 202.49829,
          "dec_deg": 47.26613,
          "toward_kpc": -4,
          "axes_arcmin": [
            5.89,
            4.68
          ],
          "pa_deg": 79,
          "sersic_n": 2,
          "re_kpc": 1.5,
          "q": 0.6,
          "light": 0.9,
          "colour": "#ffdcb4",
          "source": "SIMBAD (CDS), NGC 5195: ICRS 13 29 59.590 +47 15 58.06, 5.89 x 4.68 arcmin at PA 79 (Paturel et al. 2003), read 2026-10-20; type I0 pec (RC3); BEHIND M51 (Ritchey et al. 2015, arXiv:1501.03223: M51's outer arm absorbs in front of its nucleus; Theis & Spinneker 2003 reject models with it in front), 4 kpc behind illustrative; its profile (n 2, Re 1.5 kpc) illustrative"
        }
      ],
      "source": "SIMBAD (CDS); Ritchey et al. 2015, arXiv:1501.03223; Theis & Spinneker 2003, arXiv:astro-ph/0306502"
    }
  ],
  "colours": {
    "mode": true,
    "note": "Matched to its photograph at the hand-over (heic0506a, B, V, I with H-alpha): mean colours measured 2026-10-20 core #e8d1bb, inner disc #886f62, outer #454041; the model takes them halfway to neutral (bulge #f4e8dc, disc #e2d6cc to #cfd0dc), arms blue-white, pink H II regions, NGC 5195 warm. Not enhanced."
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Colombo et al. 2014, ApJ 784, 3 (arXiv:1401.3759): PAWS, i = 22 +/- 5, PA = 173 +/- 3 degrees (abstract, read 2026-10-20)",
    "Salo et al. 2015, ApJS 219, 4 (S4G pipeline 4 decompositions; VizieR J/ApJS/219/4): bulge n, Re, B/T and the disc's scale length",
    "Puerari et al. 2014 (arXiv:1408.3658); Shetty et al. 2007 (arXiv:0705.3240); Honig & Reid 2015 (arXiv:1412.1012): pitch angles",
    "Walter et al. 2008, AJ 136, 2563 (arXiv:0810.2125): THINGS, whose velocity map gives the approaching half",
    "Ritchey et al. 2015 (arXiv:1501.03223); Theis & Spinneker 2003 (arXiv:astro-ph/0306502): NGC 5195 behind M51's arm",
    "SIMBAD (CDS), NGC 5195, read 2026-10-20"
  ],
  "review": {
    "data_vs_model": "A parametric model: the orientation, the bulge's and disc's profiles and the pitch are published; the arms' width, the knots' places, the thicknesses, the light shares, the near side (derived) and NGC 5195's depth and profile are ours, labelled in each layer.",
    "geometry": "pa 173 / incl 22 (Colombo et al. 2014), north approaching (THINGS), east near (derived: counter-clockwise rotation, trailing arms). NGC 5195 4 kpc behind (illustrative; published only as behind the arm).",
    "colours": "Display values matched to the photograph's mean colours, halved toward neutral (colours.note); nothing enhanced.",
    "distance": "The record's: 23 Mly (19 to 27), the Messier table's.",
    "credits": "CREDITS.md section 3l, galaxies from their structure (0077 W3-f).",
    "by": "Space Radar maintainers",
    "date": "2026-10-20"
  },
  "credits": [
    "M51's model: orientation after Colombo et al. 2014 (ApJ 784, 3), structure from the S4G decompositions (Salo et al. 2015, ApJS 219, 4), pitch after Puerari et al. 2014; NGC 5195's place and size from SIMBAD (CDS), behind the arm after Ritchey et al. 2015. Facts, cited; no image or data file is copied."
  ]
};
