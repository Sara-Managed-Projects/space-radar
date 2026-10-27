// GENERATED from registry/deepsky-heroes/m27.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m27",
  "record": "dso-m27",
  "stage": "r14-neb-b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the waist as a thick ring nearly edge on, the lobes through its axis and the outer shell, lit by the photograph (6, 3 and 4 samples at level 2; on T0 one step each, at its middle), the knots and the star",
    "3": "close-up: the same layers marched with half the coordinator's steps a layer (12 to 24 by tier); the camera may go inside"
  },
  "frame": {
    "pa_deg": 41,
    "incl_deg": 78,
    "units_ly": 1,
    "distance_ly": 1334,
    "ra_deg": 299.90158,
    "dec_deg": 22.72103,
    "axes": "x west, y north, z toward the Sun; the central star at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the light: the photograph without its stars, spread through the layers by their density along our line",
      "file": "site/images/deep/m27/m27-light.webp",
      "row": "m27",
      "size": [
        512,
        430
      ],
      "peak": 0.852,
      "from": "site/images/nebulae/m27.webp (NOIRLab noao-m27-kpno-mayall-4-m, T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN and NOIRLab/NSF/AURA), CC BY 4.0)",
      "made_by": "scripts/build_deep_ring.py",
      "source": "the photograph (its archive's terms: CC BY 4.0, credit as given), its stars removed by scripts/build_deep_ring.py",
      "note": "stars removed (they are not in the nebula; the central star is drawn by the hero); the dense field's sky level taken off and the light faded to nothing over the last fifth of 7.2 arcminutes (inside the outer shell) from the centre"
    },
    {
      "part": "star",
      "kind": "star",
      "what": "the central star, a hot white dwarf",
      "temp_k": 108600,
      "temp_note": "108 600 K, Napiwotzki (1999)'s value as Benedict et al. 2009 adopt it; its colour is a blackbody's; its halo is in the material, not a bloom",
      "source": "Benedict, G. F. et al. 2009, AJ 138, 1969 (arXiv:0909.4281): the central star's parallax (405 pc) and the temperature they adopt"
    },
    {
      "part": "disc",
      "kind": "disc",
      "what": "the waist: the bright 'apple core', read as a thick equatorial ring seen nearly edge on, its two ends the brightest light",
      "semi_major_arcsec": 200,
      "semi_minor_arcsec": 200,
      "in_plane": true,
      "window": "point",
      "edge": 0.3,
      "major_pa_deg": 41,
      "tilt_deg": 78,
      "near_pa_deg": 131,
      "inner_q": 0.55,
      "thickness_arcsec": 180,
      "weight": 1,
      "lines": [
        "OIII",
        "Ha",
        "SII"
      ],
      "light": "the photograph's, shared with the lobes and the shell by density along our line",
      "check": "Measured here on the photograph the app's slider shows (north turned 90.06 degrees as its archive says): the brightest light's second moments give a long axis at PA 41 degrees and an axis ratio of 0.40; it reaches about 3.3 arcminutes from the centre along that axis (200 arcseconds)",
      "drawn": "a ring 200 arcseconds in radius in its own plane (round: assumed), its axis 78 degrees from our line toward PA 131 (ILLUSTRATIVE: nearly edge on is what the apple core's two bright ends need), 180 arcseconds thick with crisp faces (illustrative), its cavity inside 0.55 of its radius; its rims soft over 0.3 of its radius either side (`edge`), so a view a few degrees off our line shows no seam",
      "source": "the photograph's light (measured here); the reading as an equatorial ring seen nearly edge on is the usual one and is not from a measured model: no source read gives the Dumbbell's 3D form or tilt. Meaburn, Boumis, Christopoulou et al. 2005, RMxAA 41, 109 (arXiv:astro-ph/0501569): the bright dumbbell's inert He II core and the inner and outer [O III] and [N II] shells expanding at 13, 31 and 35 km/s"
    },
    {
      "part": "lobes",
      "kind": "lobes",
      "what": "the lobes: the fainter gas that fills the apple core's two bites, through the ring's axis",
      "equator_q": 0.8,
      "polar_semi_axis_arcsec": 290,
      "weight": 0.5,
      "drawn": "one prolate spheroid along the ring's axis, 0.8 of its radius wide and 290 arcseconds long each way, a wall (densest half-way out): an ILLUSTRATION of their form; their length is where the photograph's light along PA 131 ends (about 4.8 arcminutes); weighted 0.5, so the waist keeps most of the apple core's light",
      "source": "the photograph's light (measured here); Meaburn et al. 2005 (arXiv:astro-ph/0501569): the shells round the dumbbell"
    },
    {
      "part": "halo",
      "kind": "shell",
      "what": "the outer shell: the red [N II] gas round the whole, broken into arcs",
      "inner_arcsec": 330,
      "outer_arcsec": 440,
      "weight": 0.3,
      "drawn": "a spherical shell from 5.5 to 7.3 arcminutes, carrying the photograph's light where nothing else is (its weight, 0.3, leaves most of the body's light to the ring and the lobes): its arcs are the photograph's, the shell's form an illustration",
      "source": "Meaburn et al. 2005 (arXiv:astro-ph/0501569): the outer [N II] shell expanding at 35 km/s, running into a 15 arcminute halo; its extent read on the photograph"
    },
    {
      "part": "outer",
      "kind": "shell",
      "what": "the faint halo, 15 arcminutes across",
      "diameter_arcsec": 900,
      "drawn": "none",
      "note": "outside the light the photograph gives: not drawn",
      "source": "Meaburn et al. 2005 (arXiv:astro-ph/0501569): the 15 arcminute halo"
    },
    {
      "part": "knots",
      "kind": "knots",
      "what": "dense knots in the bright ring",
      "count_drawn": [
        120,
        300,
        500
      ],
      "q_from": 0.7,
      "q_to": 1.0,
      "head_au": 400,
      "tail_au": 800,
      "min_px": 2.2,
      "seed": 6853,
      "drawn": "a seeded sample (model): neither their count nor any knot's place is measured here; each about an arcsecond (400 au) wide, its tail an illustration. Under 2.2 px a knot is drawn 2.2 px wide and its darkness EXAGGERATED",
      "source": "O'Dell, Balick, Hajian, Henney & Burkert 2002, AJ 123, 3329 (Knots in nearby planetary nebulae): knots in the Dumbbell's bright ring, as in the Ring and the Helix; their sizes there"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {
      "Ha": "#e8705a",
      "star": "#cad8ff"
    },
    "note": "NARROWBAND under every look: the photograph's own colours, its oxygen given blue, its hydrogen red and its sulphur green by NOIRLab (registry/nebulae.yaml `colours: narrowband`), shown with each exposure's stretch. Not what an eye sees. The knots' cusps take the rim's red; the star a 108 600 K blackbody's",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "Ha": "#ff3b2f",
        "star": "#cad8ff"
      },
      "note": "Deep: further ENHANCED, the photograph's own Deep stretch, and the cusps in a deeper red"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "NOIRLab noao-m27-kpno-mayall-4-m (T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN and NOIRLab/NSF/AURA), CC BY 4.0), the photograph the card's slider shows: the hero's LIGHT (its stars removed, site/images/deep/m27/m27-light.webp), and the sizes and position angles, measured from it",
    "Meaburn, J., Boumis, P., Christopoulou, P. E. et al. 2005, The global kinematics of the Dumbbell planetary nebula (https://arxiv.org/abs/astro-ph/0501569): the inert core, the inner and outer shells and their speeds, the 15 arcminute halo",
    "Benedict, G. F. et al. 2009, Astrometry with the Hubble Space Telescope: trigonometric parallaxes of planetary nebula nuclei (https://arxiv.org/abs/0909.4281): 405 (+28 / -25) pc for the central star, and its temperature",
    "O'Dell, C. R., Balick, B., Hajian, A. R., Henney, W. J. & Burkert, A. 2002, Knots in nearby planetary nebulae, AJ 123, 3329: the knots"
  ],
  "review": {
    "data_vs_model": "Measured: the place, the sizes and the position angles on the sky (from the photograph), the shells' speeds, the star's distance and temperature, and the light (the photograph). Model: which layer each sky point's light belongs to (by density along our line), the waist as a ring nearly edge on and its tilt, thickness and near end, the lobes' form, the outer shell as a sphere, each knot's place (seeded)",
    "geometry": "No source read gives the Dumbbell's 3D form. The apple core is drawn as an equatorial ring seen nearly edge on (axis 78 degrees from our line, illustrative) and the ears as the lobes along its axis: the usual reading of a bipolar nebula of this look. The card says the shape is a reconstruction",
    "colours": "The photograph's own narrowband colours under every look, with each exposure's stretch; declared enhanced",
    "distance": "1 334 ly (1 148 to 1 520), the record's (the Messier table's). Benedict et al. 2009's parallax gives 1 321 ly. The arcseconds are scaled to the record's distance, so its size on the sky is kept",
    "credits": "CREDITS.md section 3l (0078 r14-neb-b); the card's source line names the photograph and says the shape is a reconstruction",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Dumbbell's 3D shape: a reconstruction by Space Radar (the waist as a ring nearly edge on, the lobes, the outer shell), its sizes measured on the photograph; the shells after Meaburn et al. 2005 (arXiv:astro-ph/0501569)",
    "The central star: distance and temperature after Benedict et al. 2009, AJ 138, 1969; the knots after O'Dell et al. 2002, AJ 123, 3329",
    "Its light: the photograph noao-m27-kpno-mayall-4-m, T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN and NOIRLab/NSF/AURA) (CC BY 4.0), its stars removed by Space Radar"
  ]
};
