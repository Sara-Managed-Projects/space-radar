// GENERATED from registry/deepsky-heroes/north-america.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "north-america",
  "record": "dso-north-america-nebula",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the glowing wall behind the dark cloud as a crisp lit sheet (12 coarse steps and an exact crossing; 8 on T0, or the wall as a mesh), the cloud behind it, LDN 935 in front splitting the North America from the Pelican, the Bajamar Star and HD 199579",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go behind the dark cloud, to the Bajamar Star"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 2590,
    "ra_deg": 314.8213,
    "dec_deg": 44.5289,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the wall's light: the photograph without its stars (the mosaic holds the North America and the Pelican)",
      "picture": {
        "id": "north-america-nebula",
        "file": "site/images/nebulae/north-america-nebula.webp",
        "ra_deg": 313.25494,
        "dec_deg": 44.44772,
        "width_arcmin": 250.61,
        "height_arcmin": 171.37,
        "north_deg": -2.86
      },
      "file": "site/images/deep/nebulae/north-america-light.webp",
      "depth": "site/data/deep/north-america-front.bin",
      "made_by": "scripts/build_deep_emission.py",
      "credit": "KPNO/NOIRLab/NSF/AURA/Adam Block (noao-n7000mosblock), CC BY 4.0",
      "stars_out": {
        "thresh": 16.0,
        "bright": 50.0
      },
      "note": "stars removed (they are drawn as stars); nothing else changed",
      "source": "NOIRLab noao-n7000mosblock, credit KPNO/NOIRLab/NSF/AURA/Adam Block, CC BY 4.0: https://noirlab.edu/public/images/noao-n7000mosblock/ (RCOS 16-inch telescope, Kitt Peak)"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the glowing wall: the far side of the H II region round the Bajamar Star, the North America on its east and the Pelican on its west",
      "lobes": [
        {
          "name": "H II region",
          "centre_west_arcmin": 36.7,
          "centre_north_arcmin": -39.3,
          "along_arcmin": 110.0,
          "across_arcmin": 95.0,
          "pa_deg": 0,
          "depth_ly": 28,
          "shape": "cos"
        }
      ],
      "blend_ly": 8,
      "outside_ly": 0,
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 4.0,
        "fine_arcmin": 1.5,
        "wide_arcmin": 10.0
      },
      "grid": [
        256,
        176
      ],
      "source": "Kuhn, M. A. & Hillenbrand, L. A. 2020, Research Notes of the AAS (arXiv:2012.05074: 'The Bajamar Star is an early O star that ionizes the North America/Pelican Nebulae. In projection, it is near the geometric center of the H II region'). The bowl's size is read from the photograph; its depth is illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the molecular cloud behind the wall: dark from behind",
      "thickness_ly": 10.0,
      "sigma_per_ly": 1.0,
      "blur_arcmin": 10.0,
      "source": "illustrative (a model)"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "LDN 935, the dark cloud in front of the H II region: the Gulf of Mexico and the lane that parts the North America from the Pelican",
      "z_ly": 14.0,
      "lanes": [
        {
          "name": "LDN 935",
          "points": [
            [
              52.0,
              30.0
            ],
            [
              44.0,
              5.0
            ],
            [
              36.0,
              -20.0
            ],
            [
              22.0,
              -38.0
            ],
            [
              14.0,
              -60.0
            ],
            [
              8.0,
              -85.0
            ]
          ],
          "half_width_arcmin": 14.0
        }
      ],
      "tau_max": 1.6,
      "source": "Lynds, B. T. 1962, ApJS 7, 1 (the dark nebula LDN 935); Kuhn & Hillenbrand 2020 (one H II region behind it). How far in front of the glow the dark cloud is is not measured: drawn 14 ly in front of the Bajamar Star's plane"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "the Bajamar Star and HD 199579 at their catalogued places on the sky; their depths are not measured, so they stand in one plane",
      "stars": [
        {
          "id": "the Bajamar Star (2MASS J20555125+4352246)",
          "ra_deg": 313.96356510373,
          "dec_deg": 43.87346218816,
          "v_mag": 13.09,
          "spectral": "O3.5III(f*)+O8",
          "temp_k": 44000
        },
        {
          "id": "HD 199579",
          "ra_deg": 314.14490794295,
          "dec_deg": 44.92472246998,
          "v_mag": 5.96,
          "spectral": "O6.5V((f))z",
          "temp_k": 38000
        }
      ],
      "note": "V as seen from here: the Bajamar Star is behind the dark cloud and faint from here, bright from beside it. Colours a blackbody's at the spectral type's temperature",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "no cluster drawn: the region's young stars are in several groups that Gaia separates, none drawn here",
      "clusters": [],
      "source": "Kuhn & Hillenbrand 2020 (the Bajamar Star lies outside the main subgroups)"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (the page names no filters: hydrogen's red), with each exposure's stretch; the stars a blackbody's",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "star": "#cfdcff"
      },
      "note": "Deep: ENHANCED. The photograph's own Deep stretch (gamma 0.7, saturation 1.25). Not what an eye or a broadband camera sees"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "Kuhn, M. A. & Hillenbrand, L. A. 2020, Distance and Tangential Velocity of the Main Ionizing Star in the North America/Pelican Nebulae with Gaia EDR3, Research Notes of the AAS (https://arxiv.org/abs/2012.05074)",
    "Lynds, B. T. 1962, Catalogue of Dark Nebulae, ApJS 7, 1 (LDN 935)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: the Bajamar Star's and HD 199579's places, V magnitudes and spectral types",
    "NOIRLab noao-n7000mosblock (CC BY 4.0, credit KPNO/NOIRLab/NSF/AURA/Adam Block), the photograph the app showed: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: one H II region ionised by the Bajamar Star near its middle, the stars' places and magnitudes, the dark cloud in front, and the light (the photograph). Reconstructed: the wall as a broad bowl round the star and its relief, the dark cloud's absorption from the photograph's darkness. Model: the depths, the cloud behind",
    "geometry": "A broad bowl round the Bajamar Star, its size read from the photograph, its depth illustrative, and said so; the dark cloud is drawn as dust in front, which is why the one region shows as two",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; stars by spectral type",
    "distance": "The record's 2 590 ly (site/data/dso.json; about 795 pc). Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The North America and Pelican Nebulae's shape: after Kuhn & Hillenbrand 2020 (the Bajamar Star near the centre of one H II region) and Lynds 1962 (LDN 935); reconstructed by Space Radar",
    "Its stars: SIMBAD, CDS",
    "Its light: the photograph noao-n7000mosblock, KPNO/NOIRLab/NSF/AURA/Adam Block (CC BY 4.0), its stars removed by Space Radar"
  ]
};
