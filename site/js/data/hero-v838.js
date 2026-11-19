// GENERATED from registry/deepsky-heroes/v838.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "v838",
  "record": "dso-v838-monocerotis",
  "stage": "ds-2026-11-18",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: about 16 000 soft points of modelled dust, lit where the clock's date puts them on the echo's paraboloid",
    "3": "close-up: the same; the camera may go inside the echo"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 19896,
    "ra_deg": 106.020092,
    "dec_deg": -3.847369,
    "axes": "x west, y north, z toward the Sun; the star (the record's place) at the origin"
  },
  "layers": [
    {
      "part": "echo",
      "kind": "physics",
      "what": "the surface that is lit: r - z = c t, the paraboloid about the star; lit by the outburst's 97 days",
      "t0_hjd": 2452343,
      "from_days": -36,
      "to_days": 61,
      "edge_days": 6,
      "hold_years": 6.4,
      "amp": 1.0,
      "source": "Sparks et al. 2008, AJ 135, 605 (arXiv:0711.1495), sections 1, 4.1 and 4.2; Bond et al. 2003, Nature 422, 405 (arXiv:astro-ph/0303513), the formula for a ring's apparent expansion and Table 1. The edge (6 days) is Space Radar's, to avoid a hard cut."
    },
    {
      "part": "dust",
      "kind": "model",
      "what": "the dust, modelled: seven nested spherical shells of clumps round a cavity",
      "cavity_pc": 0.15,
      "outer_pc": 2.0,
      "shells_pc": [
        0.2,
        0.35,
        0.55,
        0.8,
        1.1,
        1.5,
        1.95
      ],
      "thickness_pc": 0.02,
      "clumps": 7,
      "points": 16000,
      "size_ly": 0.12,
      "fall_pc": 0.6,
      "seed": 838,
      "source": "The cavity: Sparks et al. 2008, section 5 (the 2002 September ring at 99 pixels of 0.0015 pc, near the cavity's outer edge). The outer limit, 2 pc: Bond et al. 2003. The shells' radii, clumps and number are Space Radar's: the papers give no depth for any dust."
    },
    {
      "part": "star",
      "kind": "star",
      "what": "the star at the paraboloid's focus, a mark (its own record carries its facts)",
      "size_ly": 0.4,
      "amp": 3.0,
      "source": "the record dso-v838-monocerotis"
    },
    {
      "part": "look",
      "kind": "model",
      "what": "how the points are drawn",
      "colour_early": [
        0.62,
        0.74,
        1.0
      ],
      "colour_late": [
        1.0,
        0.62,
        0.45
      ],
      "min_px": 1.6,
      "gain": 0.7,
      "source": "Space Radar's; the colours are illustrative (the early light was bluer, Sparks et al. 2008)"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "ILLUSTRATIVE. The echo's blue and red follow the outburst's early and late light qualitatively; Hubble's pictures are not used"
  },
  "drawn": [
    "reconstruction",
    "model"
  ],
  "sources": [
    "Sparks, W. B. et al. 2008, V838 Monocerotis: a geometric distance from Hubble Space Telescope polarimetric imaging of its light echo, AJ 135, 605 (https://arxiv.org/abs/0711.1495), read 2026-11-18",
    "Bond, H. E. et al. 2003, An energetic stellar outburst accompanied by circumstellar light echoes, Nature 422, 405 (https://arxiv.org/abs/astro-ph/0303513), read 2026-11-18",
    "ESA/Hubble, heic0304a 'Hubble watches light echo from mysterious erupting star (composite)', 26 March 2003, credit NASA, ESA and H.E. Bond (STScI); heic0503a 'Light continues to echo three years after stellar outburst', 3 February 2005, credit NASA, ESA and The Hubble Heritage Team (AURA/STScI); CC BY 4.0 (esahubble.org/copyright, read 2026-11-18). Referenced on the card, not shipped"
  ],
  "review": {
    "data_vs_model": "Physics and measured: the lit surface r - z = ct, the outburst's date and length, the distance, the dust's 2 pc limit and cavity. Modelled: every dust shell and clump. Illustrative: brightness and colour. Held: the echo after mid-2008, because the modelled dust ends there",
    "geometry": "Each dust point is lit when t - (r - z)/c falls in the outburst window (HJD 2452307 to 2452404 about the mean 2452343); the model's z points toward the Sun; the clock's date minus the mean date, in years of 365.25 days, is t",
    "colours": "Illustrative, declared on the card",
    "distance": "6.1 kpc = 19 896 ly (Sparks et al. 2008); the sizes are in light-years, so only the angular size of the whole depends on it",
    "credits": "CREDITS.md, V838 Monocerotis' light echo (2026-11-18); the card's rows name the papers and the Hubble pictures, and say that no astronomer has reviewed the drawing",
    "by": "Space Radar maintainers",
    "date": "2026-11-18",
    "astronomer": "not yet; the card says so"
  },
  "credits": [
    "V838 Monocerotis' light echo: the paraboloid and the outburst's timing from Sparks et al. 2008 (AJ 135, 605) and Bond et al. 2003 (Nature 422, 405); the dust is modelled; drawn by Space Radar. Hubble's pictures (NASA, ESA and H.E. Bond (STScI); NASA, ESA and the Hubble Heritage Team (AURA/STScI), ESA/Hubble CC BY 4.0) are referenced, not shipped"
  ]
};
