// GENERATED from registry/deepsky-heroes/southern-ring.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "southern-ring",
  "record": "dso-southern-ring-nebula",
  "stage": "r14-neb-b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the main ring as a crisp disc, the bubble through its cavity along our line and the molecular halo as a shell round both, lit by the photograph (6, 3 and 4 samples at level 2; on T0 one step each, at its middle), and the A-type star",
    "3": "close-up: the same layers marched with half the coordinator's steps a layer (12 to 24 by tier); the camera may go inside"
  },
  "frame": {
    "pa_deg": 140,
    "incl_deg": 22.5,
    "units_ly": 1,
    "distance_ly": 2000,
    "ra_deg": 151.7574,
    "dec_deg": -40.4364,
    "axes": "x west, y north, z toward the Sun; the central stars at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the light: the photograph without its stars, spread through the layers by their density along our line",
      "file": "site/images/deep/southern-ring/southern-ring-light.webp",
      "row": "southern-ring-nebula",
      "size": [
        512,
        477
      ],
      "peak": 0.835,
      "from": "site/images/nebulae/southern-ring-nebula.webp (ESA/Webb weic2207b, NASA, ESA, CSA, STScI, and the Webb ERO Production Team, CC BY 4.0)",
      "made_by": "scripts/build_deep_ring.py",
      "source": "the photograph (its archive's terms: CC BY 4.0, credit as given), its stars removed by scripts/build_deep_ring.py",
      "note": "stars removed, Webb's spikes with them (the central star is drawn by the hero); the faint sky taken off and the light faded to nothing over the last fifth of 1.08 arcminutes (inside the halo's outer edge) from the centre"
    },
    {
      "part": "star",
      "kind": "star",
      "what": "the bright star at the middle: the A-type visual companion (the white dwarf that made the nebula is beside it, too faint to see)",
      "temp_k": 9500,
      "temp_note": "9 500 K, typical of an A-type star (De Marco et al. 2022 name its type, not its temperature): ILLUSTRATIVE. It is about 1.7 arcseconds from the white dwarf; drawn at the centre",
      "source": "De Marco, O. et al. 2022, The messy death of a multiple star system and the resulting planetary nebula as observed by JWST, Nature Astronomy 6, 1421 (arXiv:2301.02775): the A-type visual companion"
    },
    {
      "part": "disc",
      "kind": "disc",
      "what": "the main ring: an expanding ring of ionised and molecular gas, not a limb-brightened shell, seen 15 to 30 degrees from its axis",
      "semi_major_arcsec": 26,
      "semi_minor_arcsec": 17.5,
      "window": "point",
      "round": true,
      "edge": 0.2,
      "major_pa_deg": 140,
      "tilt_deg": 22.5,
      "near_pa_deg": 140,
      "inner_q": 0.6,
      "thickness_arcsec": 12,
      "weight": 1,
      "lines": [
        "H2",
        "ionised gas"
      ],
      "light": "the photograph's, shared with the bubble and the halo by density along our line",
      "check": "Measured here on the photograph (north turned -112.1 degrees as its archive says): the light's second moments give a long axis at PA 138 to 152 degrees, axis ratio 0.77 to 0.82; along PA 140 the bright rim peaks about 25 arcseconds from the centre, along PA 50 about 17",
      "drawn": "26 by 17.5 arcseconds on the sky at PA 140, its axis 22.5 degrees from our line (the middle of Kastner et al.'s 15 to 30) with its SE side near (ASSUMED: not published), 12 arcseconds thick at its middle radius and thinning to its rims, a torus (illustrative), its cavity inside 0.6 of its radius",
      "source": "Kastner, J. H. et al. 2024, The molecular exoskeleton of the ring-like planetary nebula NGC 3132 (arXiv:2402.11850): \"an expanding ring, as opposed to a limb-brightened shell\", \"a bipolar nebula viewed more or less pole-on (inclination ~15--30 degrees)\"; the sizes and position angle measured on the photograph"
    },
    {
      "part": "lobes",
      "kind": "lobes",
      "what": "the ionised bubble through the ring's cavity, along the axis nearly at us: the blue light inside the ring",
      "equator_q": 0.62,
      "polar_semi_axis_arcsec": 40,
      "weight": 1,
      "drawn": "one prolate spheroid along the ring's axis, as wide as the cavity and 40 arcseconds long each way: an ILLUSTRATION of its form (Monteiro et al. 2000 modelled a diabolo whose axis is 40 degrees from our line; Kastner et al. 2024 find 15 to 30)",
      "source": "Monteiro, H., Morisset, C., Gruenwald, R. & Viegas, S. M. 2000, MNRAS 311, 694 (arXiv:astro-ph/0002154): a bipolar diabolo; De Marco et al. 2022: \"an ionised central bubble\""
    },
    {
      "part": "halo",
      "kind": "shell",
      "what": "the molecular halo: hydrogen molecules round the bubble, in arcs and loops Webb imaged",
      "inner_arcsec": 44,
      "outer_arcsec": 66,
      "weight": 0.15,
      "drawn": "a spherical shell from 44 to 66 arcseconds carrying the photograph's light where nothing else is (its weight, 0.15, leaves the ring's and the bubble's light to them): its arcs are the photograph's, the shell's form an illustration",
      "source": "De Marco et al. 2022 (arXiv:2301.02775): \"a structured, extended H2 halo surrounding an ionised central bubble\", \"imprinted with spiral structures\"; its extent read on the photograph"
    },
    {
      "part": "outer",
      "kind": "shell",
      "what": "the faint outer arcs past the photograph's edge",
      "diameter_arcsec": 150,
      "drawn": "none",
      "note": "outside the light the photograph gives: not drawn",
      "source": "De Marco et al. 2022 (arXiv:2301.02775)"
    },
    {
      "part": "knots",
      "kind": "knots",
      "what": "no knots are drawn",
      "count_drawn": [
        0,
        0,
        0
      ],
      "drawn": "none",
      "source": "none drawn: the clumps Webb resolved are in the photograph's light"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {
      "Ha": "#f08a50",
      "star": "#e2e9ff"
    },
    "note": "INFRARED under every look: the photograph's own colours, Webb's NIRCam from 0.9 to 4.7 micrometres, shorter waves given blue and longer ones red by the ERO team (registry/nebulae.yaml `colours: infrared`). Not what an eye sees; the star an A-type's white",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "Ha": "#ff3b2f",
        "star": "#e2e9ff"
      },
      "note": "Deep: further ENHANCED, the photograph's own Deep stretch"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "ESA/Webb weic2207b (NASA, ESA, CSA, STScI, and the Webb ERO Production Team, CC BY 4.0), the photograph the card's slider shows: the hero's LIGHT (its stars removed, site/images/deep/southern-ring/southern-ring-light.webp), and the sizes and position angle, measured from it",
    "Kastner, J. H. et al. 2024, The molecular exoskeleton of the ring-like planetary nebula NGC 3132 (https://arxiv.org/abs/2402.11850): the ring, the view nearly pole on",
    "De Marco, O. et al. 2022, Nature Astronomy 6, 1421 (https://arxiv.org/abs/2301.02775): the ionised bubble, the molecular halo and its arcs, the A-type companion",
    "Monteiro, H., Morisset, C., Gruenwald, R. & Viegas, S. M. 2000, MNRAS 311, 694 (https://arxiv.org/abs/astro-ph/0002154): a bipolar model"
  ],
  "review": {
    "data_vs_model": "Measured: the place, the sizes and the position angle on the sky (from the photograph), that the ring is a ring seen 15 to 30 degrees from its axis, the halo and its arcs, and the light (the photograph). Model: which layer each sky point's light belongs to, the tilt's direction, the ring's thickness, the bubble's form and length, the halo as a sphere",
    "geometry": "Kastner et al. 2024 (a ring, seen nearly pole on); drawn at 22.5 degrees with its SE side near (assumed). The bubble's form and length are an illustration; the card says the shape is a reconstruction",
    "colours": "Webb's infrared colours under every look, with each exposure's stretch; declared enhanced",
    "distance": "2 000 ly, the record's. The arcseconds are scaled to it, so the size on the sky is kept",
    "credits": "CREDITS.md section 3l (0078 r14-neb-b); the card's source line names the photograph and says the shape is a reconstruction",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Southern Ring's 3D shape: a reconstruction by Space Radar after Kastner et al. 2024 (arXiv:2402.11850: a ring seen nearly pole on) and De Marco et al. 2022 (arXiv:2301.02775: the bubble and the molecular halo), its sizes measured on the photograph",
    "Its light: the photograph weic2207b, NASA, ESA, CSA, STScI, and the Webb ERO Production Team (CC BY 4.0), its stars removed by Space Radar"
  ]
};
