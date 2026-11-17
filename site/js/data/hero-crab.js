// GENERATED from registry/deepsky-heroes/crab.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "crab",
  "record": "dso-m1",
  "stage": "W3-c",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the cage of filaments as ribbons (about 8 000 pieces; half on T0 and under the latch), the synchrotron glow in closed form, the wind's rings, jets and the pulsar as soft points: three additive draws, no march",
    "3": "close-up: the same; the camera may go inside the cage, where the filaments stay sharp round it and the glow is a faint haze toward the middle"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 6500,
    "ra_deg": 83.63321,
    "dec_deg": 22.01447,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the shell's light: the photograph without its stars",
      "file": "site/images/deep/sheets/crab-light.webp",
      "from": "site/images/nebulae/m1.webp (ESA/Hubble heic0515a, CC BY 4.0)",
      "picture": {
        "ra_deg": 83.63554,
        "dec_deg": 22.01489,
        "width_arcmin": 6.41,
        "height_arcmin": 6.41,
        "north_deg": -0.1
      },
      "stars": {
        "above_median": 18,
        "grow_px": 5
      },
      "made_by": "scripts/build_deep_sheets.py",
      "note": "stars removed (a star is not in the nebula: carried onto the shell it would be a smear); nothing else changed",
      "source": "NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble), heic0515a, CC BY 4.0: https://esahubble.org/images/heic0515a/"
    },
    {
      "part": "shell",
      "kind": "shell",
      "what": "the filaments: a thick ellipsoidal shell round an empty middle, its long axis along the pulsar's torus axis",
      "centre": {
        "ra_deg": 83.63322,
        "dec_deg": 22.01446
      },
      "axes_ly": [
        6.2,
        4.1,
        4.1
      ],
      "axis": {
        "pa_deg": 126.3,
        "incl_deg": 63.0,
        "near": "south-east"
      },
      "inner": 0.6,
      "fill": 0.2,
      "limb_min": 0.35,
      "check": "From our line each sky point's light is the photograph's (tests/test_remnant.mjs holds the column to 1 %)",
      "source": "Martin, T., Milisavljevic, D. & Drissen, L. 2021, MNRAS 502, 1864 (arXiv:2101.02709): the 3D envelope from SITELLE spectra, an ellipsoid fitted along the torus axis, nothing beyond 2 pc on that axis, nothing within 0.5 pc of the centre; Ng, C.-Y. & Romani, R. W. 2004, ApJ 601, 479: the torus's position angle and inclination"
    },
    {
      "part": "envelope",
      "kind": "model",
      "what": "the outline: the ellipsoid above with a pinched waist round the torus's plane and the south-east lobe swollen (the paper's heart shape)",
      "void_pc": 0.5,
      "pinch": {
        "depth": 0.18,
        "width_deg": 20
      },
      "lobe": {
        "from_axis_deg": 60,
        "gain": 0.3,
        "width_deg": 35
      },
      "source": "Martin, Milisavljevic & Drissen 2021, MNRAS 502, 1864 (arXiv:2101.02709): its section 4.1 (the outer and inner envelopes and their comparison) and its summary"
    },
    {
      "part": "filaments",
      "kind": "model",
      "what": "the filaments: two honeycombs of the measured scale, a coarse thick one deep in and a fine thin one on the outline, with spikes inward and struts between",
      "seed": 1054,
      "nets": [
        {
          "name": "deep",
          "level": 1,
          "at": [
            0.56,
            0.7
          ],
          "width_ly": 0.17,
          "jitter": 0.45,
          "wobble": 0.16,
          "pieces": 8,
          "bright": 1.0
        },
        {
          "name": "outline",
          "level": 2,
          "at": [
            0.86,
            1.0
          ],
          "width_ly": 0.075,
          "jitter": 0.4,
          "wobble": 0.12,
          "pieces": 6,
          "bright": 0.8
        }
      ],
      "spikes": {
        "share": 0.55,
        "length": [
          0.07,
          0.22
        ],
        "width_ly": 0.05,
        "bright": 0.6
      },
      "struts": 0.45,
      "min_px": 1.3,
      "floor": 0.3,
      "gain": 0.5,
      "colours": {
        "deep": [
          1.0,
          0.42,
          0.18
        ],
        "rim": [
          1.0,
          0.62,
          0.3
        ],
        "cool": [
          0.62,
          0.95,
          0.6
        ]
      },
      "source": "Scale and hierarchy: Martin et al. 2021, the filaments' section and summary point 3 (cells about pi/10 in the fast lobes, about pi/3.5 with thicker filaments deeper in, the largest 0.5 to 1 pc across at the smallest radii). Each filament's place: modelled by Space Radar"
    },
    {
      "part": "synchrotron",
      "kind": "model",
      "what": "the pulsar wind nebula's visible glow (synchrotron light): a soft ellipsoid inside the cage, its brightness on the sky shaped by the mosaic's blue",
      "sigma": 0.45,
      "amp": 0.55,
      "photo": 0.7,
      "colour": [
        0.62,
        0.78,
        1.0
      ],
      "source": "Its shape is a model (a Gaussian ellipsoid on the envelope's axes); its pattern on the sky is the photograph's"
    },
    {
      "part": "wind",
      "kind": "fit",
      "what": "the pulsar's wind in X-rays: the two rings Ng & Romani fitted, the jets along their axis, the pulsar",
      "distance_pc": 2000,
      "seed": 531,
      "inner": {
        "pa_deg": 124.0,
        "incl_deg": 61.3,
        "r_arcsec": 15.6,
        "blur_arcsec": 1.5,
        "beta": 0.49,
        "points": 700,
        "amp": 1.0
      },
      "outer": {
        "pa_deg": 126.31,
        "incl_deg": 63.03,
        "r_arcsec": 41.33,
        "blur_arcsec": 5.9,
        "beta": 0.55,
        "points": 1800,
        "amp": 0.55
      },
      "photon_index": 1.5,
      "norm": 0.3,
      "jets": {
        "length_ly": 2.1,
        "from_ly": 0.12,
        "width_ly": 0.09,
        "beta": 0.4,
        "points": 420,
        "amp": 0.5
      },
      "pulsar_ly": 0.03,
      "pulsar_amp": 3.0,
      "min_px": 1.6,
      "gain": 0.6,
      "colour": [
        0.56,
        0.58,
        1.0
      ],
      "pulsar_colour": [
        1.0,
        1.0,
        1.0
      ],
      "check": "The inner ring is 2 x 15.6 arcsec x 2 kpc = 0.99 ly across; Chandra's own page says 'The inner ring is about one light year across' (chandra.si.edu/deadstar/crab.html, read 2026-11-16)",
      "source": "Ng, C.-Y. & Romani, R. W. 2004, ApJ 601, 479 (arXiv:astro-ph/0310155), Table 1; Ng, C.-Y. & Romani, R. W. 2008, ApJ 673, 411 (arXiv:0710.4168), Table 2"
    },
    {
      "part": "expansion",
      "kind": "model",
      "what": "its growth on the app's clock, from the supernova of 1054",
      "explosion_year": 1054,
      "rate_per_year": 0.00116,
      "convergence_year": 1130,
      "epoch_year": 2016.9,
      "max": 4,
      "source": "Martin et al. 2021 (quoting Nugent 1998, PASP 110, 831, and Stephenson & Green 2002 for 1054); the power law between is Space Radar's"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "ILLUSTRATIVE. The filaments' and the glow's colours are taken from Hubble's false-colour mosaic at the same place on the sky (narrow filters for oxygen in two states and sulphur, mapped to colours by the picture's makers); the pulsar's wind is X-ray light drawn violet-blue",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {},
      "note": "Deep: brighter, on top of the same illustrative colours"
    }
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Martin, T., Milisavljevic, D. & Drissen, L. 2021, 3D mapping of the Crab Nebula with SITELLE. I. Deconvolution and kinematic reconstruction, MNRAS 502, 1864 (https://arxiv.org/abs/2101.02709)",
    "Ng, C.-Y. & Romani, R. W. 2004, Fitting pulsar wind tori, ApJ 601, 479 (https://arxiv.org/abs/astro-ph/0310155): the Crab's outer torus at position angle 126.3 degrees, its axis 63.0 degrees from the line of sight, radius 41.33 arcsec, flow 0.55 c; the inner ring 15.6 arcsec, 0.49 c",
    "Ng, C.-Y. & Romani, R. W. 2008, Fitting pulsar wind tori. II. Error analysis and applications, ApJ 673, 411 (https://arxiv.org/abs/0710.4168): the same fit with systematic errors; the jets bend and change",
    "NASA/CXC, The Crab Nebula in 3D (https://chandra.si.edu/deadstar/crab.html): 'The inner ring is about one light year across', the check on the ring's size",
    "Kaplan, D. L. et al. 2008, ApJ 677, 1201: the pulsar's proper motion and the explosion centre",
    "Trimble, V. 1973, PASP 85, 579: the distance, 2 kpc (1.7 to 2.4)",
    "ESA/Hubble heic0515a (CC BY 4.0), the photograph the app already shows: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the centre, the outline's reach along the pulsar's axis, the empty middle, the pinched waist, the two lobes 120 degrees apart and the honeycomb's scale (Martin et al. 2021); the wind's two rings, their axis, radii and flow speed (Ng & Romani 2004, 2008); the growth rate (Nugent 1998 as Martin et al. quote it). Modelled: each filament's place (a honeycomb of the measured scale, not the real filaments), the valley's depth and the lobe's width, the glow's shape, the jets' length and speed, which end of the axis is nearer, the growth as a power law from 1054. Illustrative: the colours (the mosaic's false colour for the gas, violet-blue for the X-ray wind) and the filaments' thickness. The card says each",
    "geometry": "Martin et al. 2021 for the outline, the void, the waist, the lobes and the honeycomb's scale; Ng & Romani 2004 and 2008 for the rings and the axis. The real heart shape is known only from the paper's words and figures (its data cube is not public): the model follows the words",
    "colours": "Illustrative, declared on the card: Hubble's false-colour mosaic sampled at each place on the sky; X-rays drawn violet-blue; Deep declared enhanced",
    "distance": "6 500 ly, the record's (2.0 kpc, Trimble 1973), as Martin et al. 2021 adopt; lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the model and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-11-16",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Crab Nebula's outline and the scale of its filaments: Martin, Milisavljevic & Drissen 2021, MNRAS 502, 1864; the pulsar wind's rings and axis: Ng & Romani 2004, ApJ 601, 479, and 2008, ApJ 673, 411; modelled by Space Radar",
    "Its light: the photograph heic0515a, NASA, ESA and Allison Loll/Jeff Hester (Arizona State University), acknowledgement Davide De Martin (ESA/Hubble) (CC BY 4.0), its stars removed by Space Radar"
  ]
};
