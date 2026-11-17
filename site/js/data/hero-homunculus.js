// GENERATED from registry/deepsky-heroes/homunculus.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "homunculus",
  "record": "dso-homunculus-nebula",
  "stage": "ds2-2026-11-16",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the published mesh (17 101 triangles, one draw call) turned by the two measured angles and sized for the clock's date, opaque, with the star's glare",
    "3": "close-up: the same; the camera may go inside a lobe"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 7665,
    "ra_deg": 161.2649625,
    "dec_deg": -59.6845167,
    "axes": "x west, y north, z toward the Sun; the star (the record's place) at the origin"
  },
  "layers": [
    {
      "part": "shell",
      "kind": "mesh",
      "what": "the nebula's outer shell of molecular hydrogen and dust: the published 3D model, 8 552 vertices and 17 101 triangles, none moved",
      "file": "site/data/deep/homunculus.glb",
      "made_by": "scripts/build_deep_homunculus.mjs",
      "from": "ESO 3D model 3dmodel_004, Eta_Car_Homunuculus_model.obj in 3dmodel_004.zip (176 860 B, sha256 d2dc1cfef4ebccbc8649aac0548a7708288b8e3c9a62e7bff22b66de9ebe717f, downloaded 2026-11-16)",
      "credit": "NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen",
      "licence": "ESO's terms of use, CC BY 4.0: free to use with the full credit visible (the model's page: 'Crediting this 3D Model with the full credit line, in a visible way is MANDATORY, if you want to use it without paying a fee'; https://www.eso.org/public/copyright/, both read 2026-11-16)",
      "axis": {
        "incl_deg": 41.0,
        "incl_err_deg": 0.5,
        "pa_deg": 310,
        "near": "SE"
      },
      "polar_radius_au": 21690,
      "epoch": 2005.17,
      "age_yr": 158.8,
      "extent": {
        "along": [
          -0.8745,
          0.9034
        ],
        "across": [
          -0.3378,
          0.7196
        ]
      },
      "check": "Seen from the Sun with north up and east left, and from behind, the mesh is figure 5 of Steffen et al. 2014 (looked at on 2026-11-16); tests/test_homunculus.mjs holds the poles' directions, the size and the growth",
      "source": "Steffen, W. et al. 2014, MNRAS 442, 3316 (arXiv:1407.4096); Smith, N. 2006, ApJ 644, 1151 (arXiv:astro-ph/0602464)"
    },
    {
      "part": "star",
      "kind": "star",
      "what": "Eta Carinae, a mark of one size on the screen at the waist (its own record carries its facts)",
      "source": "registry/exotics.yaml eta-carinae"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "lines": {},
    "note": "ILLUSTRATIVE. The warm white of starlight scattered by dust, with generated mottling; the mesh holds no brightness. Under the Measured look the mottling is taken off"
  },
  "drawn": [
    "reconstruction",
    "illustration"
  ],
  "sources": [
    "Steffen, W., Teodoro, M., Madura, T. I., Groh, J. H., Gull, T. R., Mehner, A., Corcoran, M. F., Damineli, A. & Hamaguchi, K. 2014, The three-dimensional structure of the Eta Carinae Homunculus, MNRAS 442, 3316 (https://arxiv.org/abs/1407.4096), read 2026-11-16",
    "Smith, N. 2006, The structure of the Homunculus. I. Shape and latitude dependence from H2 and [Fe II] velocity maps of Eta Carinae, ApJ 644, 1151 (https://arxiv.org/abs/astro-ph/0602464), read 2026-11-16",
    "ESO, A 3D Model of the Homunculus Nebula around the star Eta Carinae, 3dmodel_004 (https://www.eso.org/public/products/models3d/3dmodel_004/), read 2026-11-16"
  ],
  "review": {
    "data_vs_model": "Measured: the shape (Steffen et al. 2014), the tilt, the position angle, the size, the distance and the age (Smith 2006). Reconstructed: the mesh's own axes, read off its features against the paper's figures. Illustrative: the brightness, the mottling and the star's glare",
    "geometry": "The mesh as published, no vertex moved; turned by i = 41.0 degrees and position angle 310 degrees; the mean of its two poles set to 21 690 AU at 2005.17 and grown in proportion to its age (homologous expansion: Steffen et al. find the approaching lobe departs from it by about a tenth, which is not drawn)",
    "colours": "Illustrative, declared on the card; the Measured look shows the bare reconstruction",
    "distance": "7 665 ly, the record's: Smith 2006's 2 350 +/- 50 pc from this nebula's own shape and age, with which Gaia's parallaxes of the Carina clusters agree (registry/dso-hand.yaml carina-nebula)",
    "credits": "CREDITS.md, The Homunculus (deep-space review, 2026-11-16); the card's rows name the model, its credit and that no astronomer has reviewed the drawing",
    "by": "Space Radar maintainers",
    "date": "2026-11-16",
    "astronomer": "not yet; the card says so"
  },
  "credits": [
    "The Homunculus's 3D model: NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen, from ESO (3dmodel_004, CC BY 4.0); the model is Steffen et al. 2014, MNRAS 442, 3316. Repacked by Space Radar, no vertex moved",
    "Its tilt, size, distance and age: Smith 2006, ApJ 644, 1151"
  ]
};
