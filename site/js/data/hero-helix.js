// GENERATED from registry/deepsky-heroes/helix.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "helix",
  "record": "dso-helix-nebula",
  "stage": "b",
  "shipped": false,
  "children": [],
  "levels": {
    "2": "structure: the inner disc, the outer ring and the outermost ring as gas (8 samples a layer; 4 and no noise on T0), the knots and the white dwarf",
    "3": "close-up: the same layers marched with half the coordinator's steps a layer (12 to 48 steps by tier); the camera may go inside",
    "4": "fly-through: authored by spec 0075 stage f (Into the Helix); inside the nebula level 3 holds"
  },
  "frame": {
    "pa_deg": 288,
    "incl_deg": 23,
    "units_ly": 1,
    "distance_ly": 655,
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
      "tube_arcsec": 90,
      "tube_note": "the paper gives the ring's diameter (742″ × 446″ projected) and not its thickness: the tube is drawn 90″ (a quarter of its radius, so that the ring and the disc's rim overlap as the photograph's orange band does, 250″ to 450″ from the star) as an illustration",
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
      "width_arcsec": 160,
      "drawn": "illustration",
      "note": "the paper gives its size only: drawn round, faint and 160″ wide, a haze rather than a line; its flattening is not drawn",
      "lines": [
        "Ha",
        "NII"
      ],
      "source": "O'Dell, McCullough & Meixner 2004, abstract: \"an outermost-ring of 1500″ (1.76 pc) diameter\""
    },
    {
      "part": "knots",
      "kind": "knots",
      "what": "the cometary knots: dark heads with bright cusps toward the star and tails away from it",
      "count_estimated": 23000,
      "count_drawn": [
        600,
        1500,
        2400
      ],
      "from_arcmin": 2.2,
      "to_arcmin": 6.4,
      "share_in_ring": 0.2,
      "head_au": 200,
      "tail_au": 1000,
      "drawn": "a seeded sample (model): the count, the radii and the sizes are measured, each knot's place is not",
      "source": "Meixner et al. 2005, AJ 130, 1784 (about 23 000 by NICMOS); Matsuura et al. 2009, ApJ 700, 1067 (2.2′ to 6.4′ from the star); STScI release 1996-13, O'Dell & Handron (heads at least twice the Solar System, tails about 1 000 au, pointing away from the star; the brightest on the inner edge of the ring)"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "OIII": "#6fd8f0",
      "HeII": "#4f8ff0",
      "Ha": "#f59a62",
      "NII": "#f07040",
      "star": "#cfdcff"
    },
    "note": "Eye and Camera: the colours the ESO photograph (broadband B, V and R) shows at each line's zone, read from it here (its radial colour profile: blue-green within 200″, orange at 250 to 350″, red beyond); the star a 100 000 K blackbody's. The exposure's own brightness and saturation apply, as on the photographs",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "OIII": "#19e0d0",
        "HeII": "#5d8cff",
        "Ha": "#ff3b2f",
        "NII": "#ff2a64",
        "star": "#cfdcff"
      },
      "note": "Deep: ENHANCED narrowband colours, the convention of Hubble's line images ([O III] teal, Hα red, [N II] crimson), pushed for contrast. Not what an eye or a broadband camera sees"
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
    "ESO eso0907a (CC BY 4.0, credit ESO), the photograph the app already shows: its colours per zone and the inner disc's projected axis, measured from it"
  ],
  "review": {
    "data_vs_model": "Measured: the distance (Gaia), the sizes on the sky, the two tilts and position angles, the knots' count, radii and sizes, the star's temperature. Model: the radial profiles inside each layer (shaped to the paper's zones and the photograph), the outer ring's tube and the outermost ring's width (illustrations), each knot's place (seeded), the gas texture under Film (generated, hidden under Measured)",
    "geometry": "O'Dell, McCullough & Meixner 2004 (two rings, 23° and 53°, near sides PA 288° and 168°); 66° between their axes with these numbers, which the paper calls almost perpendicular. The inner disc's projected axis checked against the photograph (290° measured, 288° published). The outer ring could be lobes instead (O'Dell 2005); said on the card's source line",
    "colours": "Eye and Camera: the photograph's own colours per zone; Deep: an enhanced narrowband palette, declared as enhanced",
    "distance": "655 ± 13 ly, the Gaia DR2 parallax of the central star (registry/dso-hand.yaml); the paper's arcseconds are scaled to it",
    "credits": "CREDITS.md section 3l, The Helix (stage b); the card's source line names the paper",
    "by": null,
    "date": null
  },
  "credits": [
    "The Helix's 3D shape: O'Dell, McCullough & Meixner 2004, AJ 128, 2339 (the inner disc and the outer ring, their sizes and tilts)",
    "The knots: Meixner et al. 2005, AJ 130, 1784; Matsuura et al. 2009, ApJ 700, 1067; O'Dell & Handron, STScI release 1996-13",
    "The white dwarf's temperature: Napiwotzki 1999 and Traulsen et al. 2005, as quoted by Marshall et al. 2023, AJ (doi:10.3847/1538-3881/ac9d90)",
    "Colours read from the photograph eso0907a, ESO (CC BY 4.0)"
  ]
};
