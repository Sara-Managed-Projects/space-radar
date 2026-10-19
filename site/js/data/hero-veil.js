// GENERATED from registry/deepsky-heroes/veil.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "veil",
  "record": "dso-veil-nebula",
  "stage": "W3-c",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the shell's light from the photograph, carried on a sphere in depth (4 samples a segment; 2 on T0 and under the latch)",
    "3": "close-up: the same with up to 8 samples a segment; the camera may go inside the shell"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 2400,
    "ra_deg": 311.4083,
    "dec_deg": 30.7083,
    "axes": "x west, y north, z toward the Sun; the record's place (NGC 6960, the western arc) at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the shell's light: the photograph without its stars",
      "file": "site/images/deep/sheets/veil-light.webp",
      "from": "site/images/nebulae/veil-nebula.webp (NOIRLab noao1209a, CC BY 4.0)",
      "picture": {
        "ra_deg": 312.9181,
        "dec_deg": 31.0289,
        "width_arcmin": 172.67,
        "height_arcmin": 173.53,
        "north_deg": -0.87
      },
      "stars": {
        "above_median": 14,
        "grow_px": 3
      },
      "made_by": "scripts/build_deep_sheets.py",
      "note": "stars removed (a star is not in the nebula: carried onto the shell it would be a smear); nothing else changed",
      "source": "T.A. Rector (University of Alaska Anchorage) and WIYN/NOIRLab/NSF/AURA, noao1209a, CC BY 4.0: https://noirlab.edu/public/images/noao1209a/"
    },
    {
      "part": "shell",
      "kind": "shell",
      "what": "the blast wave's shell: a thin sphere whose rim, seen edge on, is the filaments",
      "centre": {
        "ra_deg": 312.75,
        "dec_deg": 30.6667
      },
      "axes_ly": [
        60.3,
        60.3,
        60.3
      ],
      "axis": {
        "pa_deg": 0,
        "incl_deg": 90,
        "near": "none"
      },
      "inner": 0.9,
      "fill": 0,
      "limb_min": 0.35,
      "check": "From our line each sky point's light is the photograph's (tests/test_remnant.mjs holds the column to 1 %)",
      "source": "Fesen, R. A. et al. 2018, The Cygnus Loop's distance, properties, and environment driven morphology, MNRAS 481, 1786 (arXiv:1809.01713): 735 +/- 25 pc, a 2.85 degree main shell (37 pc), fairly spherical; SIMBAD (CDS) for the centre"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "FALSE COLOUR. The photograph's own: narrow filters for oxygen (blue), sulphur (green) and hydrogen (orange), mapped to colours by the picture's maker; shown with each exposure's stretch as the photograph is",
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
    "Fesen, R. A., Weil, K. E., Cisneros, I. A., Blair, W. P. & Raymond, J. C. 2018, The Cygnus Loop's distance, properties, and environment driven morphology, MNRAS 481, 1786 (https://arxiv.org/abs/1809.01713)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-17: the Cygnus Loop's centre",
    "NOIRLab noao1209a (CC BY 4.0), the photograph the app already shows: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the shell's diameter and centre, and the light (the photograph). Reconstructed: the shell as a sphere, its thickness (illustrative), the light's depth along our line",
    "geometry": "Fesen et al. 2018 for the size, the distance and the near-spherical form; the southern blowout and the up-to-20-degree tilt they discuss are not drawn",
    "colours": "The photograph's own false colour, declared on the card; Deep declared enhanced",
    "distance": "2 400 ly, the record's, which is Fesen et al. 2018's 735 pc (the same authors' 2021 Gaia EDR3 revision, 725 +/- 15 pc, MNRAS 507, 244, agrees); lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-17",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Cygnus Loop's shell: its size and distance from Fesen et al. 2018, MNRAS 481, 1786; reconstructed by Space Radar",
    "Its light: the photograph noao1209a, T.A. Rector (University of Alaska Anchorage) and WIYN/NOIRLab/NSF/AURA (CC BY 4.0), its stars removed by Space Radar"
  ]
};
