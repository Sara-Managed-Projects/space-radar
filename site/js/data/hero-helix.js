// GENERATED from registry/deepsky-heroes/helix.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "helix",
  "record": "dso-helix-nebula",
  "stage": "b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the inner disc and the outer ring as crisp slabs lit by the photograph (8 samples a ring; 4 on T0), the knots and the white dwarf",
    "3": "close-up: the same rings marched with half the coordinator's steps a ring (12 to 48 steps by tier); the camera may go inside",
    "4": "fly-through: authored by spec 0075 stage f (Into the Helix); inside the nebula level 3 holds"
  },
  "frame": {
    "pa_deg": 288,
    "incl_deg": 23,
    "units_ly": 1,
    "distance_ly": 655,
    "ra_deg": 337.4106,
    "dec_deg": -20.8371,
    "axes": "x west, y north, z toward the Sun; the white dwarf at the origin"
  },
  "layers": [
    {
      "part": "star",
      "kind": "star",
      "what": "the white dwarf, WD 2226-210 (a DAO white dwarf)",
      "temp_k": 103600,
      "temp_note": "103 600 ± 5 500 K (Napiwotzki 1999; Traulsen et al. 2005), as Marshall et al. 2023 quote it; later fits give 110 000 to 120 000 K. Its colour is a blackbody's at that temperature; its size on screen is a few pixels and its halo is in the material, not a bloom",
      "source": "Marshall et al. 2023, AJ (doi:10.3847/1538-3881/ac9d90, arXiv:2211.02251), quoting Napiwotzki 1999 and Traulsen et al. 2005"
    },
    {
      "part": "disc",
      "kind": "disc",
      "what": "the inner disc: ionised, its core of doubly ionised helium, [O III] outward of it, Hα + [N II] at its rim (the ionisation front)",
      "diameter_arcsec": 499,
      "thickness_arcsec": 100,
      "tilt_deg": 23,
      "near_pa_deg": 288,
      "oiii_peak_arcsec": 110,
      "lines": [
        "HeII",
        "OIII",
        "Ha",
        "NII"
      ],
      "light": "the photograph's, inside the disc's outline as seen from here",
      "check": "Measured here on the ESO photograph the app shows (eso0907a, north up): its blue-green region's second moments give a major axis at PA 20° and an axis ratio 0.88, so the projected axis points to PA 290°, beside the paper's 288°; cos 23° = 0.92. §4.4 prefers 303° from a plume, within its stated uncertainty",
      "source": "O'Dell, McCullough & Meixner 2004, AJ 128, 2339 (arXiv:astro-ph/0407556), abstract, §3.1, §4.4: \"an inner-disk of about 499″ diameter\", \"a disk about 100″ in line of sight thickness\", tilts \"of 23° and 53° out of the plane of the sky\""
    },
    {
      "part": "ring",
      "kind": "ring",
      "what": "the outer ring: a torus, no inner material, of lower ionisation (Hα + [N II])",
      "diameter_arcsec": 742,
      "tilt_deg": 53,
      "near_pa_deg": 168,
      "thickness_arcsec": 180,
      "thickness_note": "the paper gives the ring's diameter (742″ × 446″ projected) and not its thickness: it is drawn as a slab 180″ thick with crisp faces, as an illustration. Its light reaches 1.25 to 1.5 of its radius and fades there: the faint haze beyond (the outermost ring) is the photograph's alone",
      "lines": [
        "Ha",
        "NII"
      ],
      "source": "O'Dell, McCullough & Meixner 2004, AJ 128, 2339, abstract and §3.1: \"an outer-ring (in reality a torus) of 742″ diameter\" \"almost perpendicular to the inner-disk\"; the near side \"at PA=168°\""
    },
    {
      "part": "outer",
      "kind": "shell",
      "what": "the outermost ring, flattened where it meets the interstellar medium",
      "diameter_arcsec": 1500,
      "drawn": "photograph",
      "note": "the paper gives its size only, and no 3D form: it is NOT reconstructed. On our line the photograph shows it; off the line it is not drawn",
      "source": "O'Dell, McCullough & Meixner 2004, abstract: \"an outermost-ring of 1500″ (1.76 pc) diameter\""
    },
    {
      "part": "knots",
      "kind": "knots",
      "what": "the cometary knots: dark heads with bright cusps toward the star and tails away from it",
      "count_estimated": 23000,
      "count_drawn": [
        500,
        1000,
        1600
      ],
      "from_arcmin": 2.2,
      "to_arcmin": 6.4,
      "share_in_ring": 0.1,
      "head_au": 200,
      "tail_au": 1000,
      "min_px": 2.2,
      "drawn": "a seeded sample (model): the count, the radii and the sizes are measured, each knot's place is not. Under 2.2 px a knot is drawn 2.2 px wide and its darkness EXAGGERATED (it falls as one over the square root of the enlargement, not as one over its area), so that the dark heads can be seen at mid distance",
      "source": "Meixner et al. 2005, AJ 130, 1784 (about 23 000 by NICMOS); Matsuura et al. 2009, ApJ 700, 1067 (2.2′ to 6.4′ from the star); STScI release 1996-13, O'Dell & Handron (heads at least twice the Solar System, tails about 1 000 au, pointing away from the star; the brightest on the inner edge of the ring)"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "Ha": "#f59a62",
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (broadband B, V and R: [O III] and He II blue-green inside, Hα + [N II] orange to red outside), shown with each exposure's stretch as the photograph is (scene/exposure.js). The knots' cusps take the rim's Hα colour; the star a 100 000 K blackbody's",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "Ha": "#ff3b2f",
        "star": "#cfdcff"
      },
      "note": "Deep: ENHANCED. The photograph's own Deep stretch (gamma 0.7, saturation 1.25, as scene/nebulae.js gives every photograph), and the cusps in the Hα red of Hubble's line images. Not what an eye or a broadband camera sees"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "O'Dell, C. R., McCullough, P. R. & Meixner, M. 2004, Unraveling the Helix Nebula: Its Structure and Knots, AJ 128, 2339 (https://arxiv.org/abs/astro-ph/0407556): the two rings, their sizes and tilts",
    "O'Dell, C. R. 2005, The 3-D Structure of the Helix Nebula, RevMexAA (SC) (https://arxiv.org/abs/astro-ph/0505539): the inner disc confirmed; the outer ring may instead be lobes perpendicular to it. We draw the 2004 two-ring model, as NASA's animation does",
    "NASA Science, Helix Nebula with annotated features (https://science.nasa.gov/asset/hubble/helix-nebula-with-annotated-features/): \"two gas disks nearly perpendicular to each other\"; animation NASA, ESA and A. Feild (STScI). Read for the interpretation; nothing of it is shipped",
    "NASA, Helix Nebula (https://www.nasa.gov/universe/nebulae/helix-nebula/): \"gaseous shells and disks puffed out by a dying sun-like star\"",
    "Meixner, M. et al. 2005, AJ 130, 1784; Matsuura, M. et al. 2009, ApJ 700, 1067; STScI news release 1996-13 (O'Dell & Handron): the knots",
    "Marshall, J. P. et al. 2023, AJ, doi:10.3847/1538-3881/ac9d90 (https://arxiv.org/abs/2211.02251), quoting Napiwotzki 1999 and Traulsen et al. 2005: the white dwarf's temperature",
    "ESO eso0907a (CC BY 4.0, credit ESO), the photograph the app already shows: the hero's LIGHT (its stars removed, site/images/deep/helix/helix-light.webp), and the inner disc's projected axis, measured from it"
  ],
  "review": {
    "data_vs_model": "Measured: the distance (Gaia), the sizes on the sky, the two tilts and position angles, the knots' count, radii and sizes, the star's temperature, and the light (the photograph). Model: which ring each sky point's light belongs to (the disc's outline as seen from here), the slabs' thickness and crisp faces, their self-absorption, each knot's place (seeded) and its exaggerated darkness, the radial streaks under Film (generated, hidden under Measured)",
    "geometry": "O'Dell, McCullough & Meixner 2004 (two rings, 23° and 53°, near sides PA 288° and 168°); 66° between their axes with these numbers, which the paper calls almost perpendicular. The inner disc's projected axis checked against the photograph (290° measured, 288° published). The outer ring could be lobes instead (O'Dell 2005); said on the card's source line",
    "colours": "The photograph's own, with each exposure's stretch as the photograph has it; Deep declared enhanced",
    "distance": "655 ± 13 ly, the Gaia DR2 parallax of the central star (registry/dso-hand.yaml); the paper's arcseconds are scaled to it",
    "credits": "CREDITS.md section 3l, The Helix (stage b); the card's source line names the paper",
    "by": "Space Radar maintainers",
    "date": "2026-10-15",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Helix's 3D shape: O'Dell, McCullough & Meixner 2004, AJ 128, 2339 (the inner disc and the outer ring, their sizes and tilts)",
    "The knots: Meixner et al. 2005, AJ 130, 1784; Matsuura et al. 2009, ApJ 700, 1067; O'Dell & Handron, STScI release 1996-13",
    "The white dwarf's temperature: Napiwotzki 1999 and Traulsen et al. 2005, as quoted by Marshall et al. 2023, AJ (doi:10.3847/1538-3881/ac9d90)",
    "Its light: the photograph eso0907a, ESO (CC BY 4.0), its stars removed by Space Radar"
  ]
};
