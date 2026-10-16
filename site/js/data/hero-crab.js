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
    "2": "structure: the shell's light from the photograph, carried on the ellipsoid in depth (4 samples a segment; 2 on T0 and under the latch)",
    "3": "close-up: the same with up to 8 samples a segment; the camera may go inside the shell"
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
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "FALSE COLOUR. The photograph's own: narrow filters for oxygen in two states and sulphur, mapped to colours by the picture's makers; shown with each exposure's stretch as the photograph is",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {},
      "note": "Deep: the photograph's own Deep stretch on top of its false colour"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "Martin, T., Milisavljevic, D. & Drissen, L. 2021, 3D mapping of the Crab Nebula with SITELLE. I. Deconvolution and kinematic reconstruction, MNRAS 502, 1864 (https://arxiv.org/abs/2101.02709)",
    "Ng, C.-Y. & Romani, R. W. 2004, Fitting pulsar wind tori, ApJ 601, 479 (https://arxiv.org/abs/astro-ph/0310155): the Crab's outer torus at position angle 126.3 degrees, its axis 63.0 degrees from the line of sight",
    "Kaplan, D. L. et al. 2008, ApJ 677, 1201: the pulsar's proper motion and the explosion centre",
    "Trimble, V. 1973, PASP 85, 579: the distance, 2 kpc (1.7 to 2.4)",
    "ESA/Hubble heic0515a (CC BY 4.0), the photograph the app already shows: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the centre, the torus axis's direction and tilt, the envelope's reach along it and the inner void (Martin et al. 2021), and the light (the photograph). Reconstructed: the envelope as an ellipsoid with equal minor axes, which end of its axis is nearer (assumed), the shell's depth along our line, the inner surface drawn at 0.75 pc rather than 0.5, and the share of the light given to the wind nebula inside (20 %); both illustrative",
    "geometry": "Martin et al. 2021 for the envelope and the void; Ng & Romani 2004 for the axis; the heart shape they find is not drawn (an ellipsoid stands for it, as their own fit does)",
    "colours": "The photograph's own false colour, declared on the card; Deep declared enhanced",
    "distance": "6 500 ly, the record's (2.0 kpc, Trimble 1973), as Martin et al. 2021 adopt; lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-17",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Crab Nebula's 3D envelope: Martin, Milisavljevic & Drissen 2021, MNRAS 502, 1864; its axis: Ng & Romani 2004, ApJ 601, 479; reconstructed by Space Radar",
    "Its light: the photograph heic0515a, NASA, ESA and Allison Loll/Jeff Hester (Arizona State University), acknowledgement Davide De Martin (ESA/Hubble) (CC BY 4.0), its stars removed by Space Radar"
  ]
};
