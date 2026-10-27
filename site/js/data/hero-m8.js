// GENERATED from registry/deepsky-heroes/m8.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m8",
  "record": "dso-m8",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the glowing face of the cloud as a crisp lit sheet at its reconstructed depth (12 coarse steps and an exact crossing; 8 on T0, or the wall as a mesh), the cloud behind, the dark lane and the globules in front, the O stars and NGC 6530",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32) and the sharp map round the Hourglass and 9 Sagittarii"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 4100,
    "ra_deg": 270.92196,
    "dec_deg": -24.38017,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the wall's light: the photograph without its stars, and round the Hourglass a sharper map of the same photograph",
      "picture": {
        "id": "m8",
        "file": "site/images/nebulae/m8.webp",
        "ra_deg": 270.95455,
        "dec_deg": -24.14153,
        "width_arcmin": 93.49,
        "height_arcmin": 62.61,
        "north_deg": 0.0
      },
      "file": "site/images/deep/nebulae/m8-light.webp",
      "depth": "site/data/deep/m8-front.bin",
      "detail": {
        "file": "site/images/deep/nebulae/m8-detail.webp",
        "centre_west_arcmin": -2.0,
        "centre_north_arcmin": 1.5,
        "size_arcmin": 16.0,
        "px": 512,
        "quality": 88,
        "level_arcmin": 1.5,
        "url": "https://cdn.eso.org/images/publicationjpg/eso0936a.jpg"
      },
      "made_by": "scripts/build_deep_emission.py",
      "credit": "ESO (eso0936a), CC BY 4.0",
      "note": "stars removed (they are drawn as stars); nothing else changed but the sharp map's levels, matched to the 640 px map",
      "source": "ESO eso0936a, credit ESO, CC BY 4.0: https://www.eso.org/public/images/eso0936a/ (MPG/ESO 2.2-metre telescope, WFI; B, V and R with H-alpha)"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the glowing face of the molecular cloud behind the stars: a blister, deepest round the Hourglass",
      "lobes": [
        {
          "name": "blister",
          "centre_west_arcmin": -4.0,
          "centre_north_arcmin": 3.0,
          "along_arcmin": 22.0,
          "across_arcmin": 15.0,
          "pa_deg": 90,
          "depth_ly": 16,
          "shape": "cos"
        },
        {
          "name": "Hourglass",
          "centre_west_arcmin": 0.7,
          "centre_north_arcmin": 0.3,
          "along_arcmin": 3.0,
          "across_arcmin": 2.2,
          "pa_deg": 0,
          "depth_ly": 21,
          "shape": "cos"
        }
      ],
      "blend_ly": 5,
      "outside_ly": 0,
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 3.0,
        "fine_arcmin": 0.5,
        "wide_arcmin": 4.0
      },
      "grid": [
        240,
        160
      ],
      "source": "Tothill, N. F. H. et al. 2008, in Handbook of Star Forming Regions II, ASP (arXiv:0809.3380: 'an HII region in the Sagittarius Arm, about 1.3 kpc away, associated with the young (1-3 Myr) open cluster NGC 6530'; the visible nebula on the near side of its molecular cloud, after Lada et al. 1976). The bowl's size is read from the photograph; its depth is illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the molecular cloud behind the glowing face: dark from behind",
      "thickness_ly": 10.0,
      "sigma_per_ly": 1.5,
      "blur_arcmin": 5.0,
      "source": "Tothill et al. 2008 (the molecular cloud behind the nebula); its thickness and opacity here are illustrative"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the dark lane (the 'lagoon') and the Bok globules: dust in front of the glowing gas",
      "z_ly": 8.0,
      "lanes": [
        {
          "name": "the lagoon",
          "points": [
            [
              -6.0,
              16.0
            ],
            [
              -8.0,
              6.0
            ],
            [
              -9.0,
              -2.0
            ],
            [
              -7.0,
              -9.0
            ]
          ],
          "half_width_arcmin": 3.0
        }
      ],
      "blobs": [
        {
          "name": "the globules over the core",
          "centre_west_arcmin": -5.0,
          "centre_north_arcmin": 3.0,
          "along_arcmin": 18.0,
          "across_arcmin": 11.0,
          "pa_deg": 90
        }
      ],
      "tau_max": 1.0,
      "source": "Tothill et al. 2008 (the dark lane and the globules seen against the H II region). How far in front they are is not measured: drawn 8 ly in front of the stars' plane"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "the nebula's O stars at their catalogued places on the sky; their depths are not measured, so they stand in one plane",
      "stars": [
        {
          "id": "9 Sagittarii (HD 164794)",
          "ra_deg": 270.96852085459,
          "dec_deg": -24.36073118167,
          "v_mag": 5.97,
          "spectral": "O4V((f))z",
          "temp_k": 43000
        },
        {
          "id": "HD 165052",
          "ra_deg": 271.29396108034,
          "dec_deg": -24.3985688328,
          "v_mag": 6.87,
          "spectral": "O6.5V((f))z",
          "temp_k": 38000
        },
        {
          "id": "HD 164816",
          "ra_deg": 270.98684411072,
          "dec_deg": -24.31253279182,
          "v_mag": 6.99,
          "spectral": "O9.5V+B0V",
          "temp_k": 32000
        },
        {
          "id": "HD 164536",
          "ra_deg": 270.66092316054,
          "dec_deg": -24.25538191865,
          "v_mag": 7.4,
          "spectral": "O7.5V(n)z",
          "temp_k": 36000
        },
        {
          "id": "HD 164906",
          "ra_deg": 271.10763788653,
          "dec_deg": -24.38565661905,
          "v_mag": 7.38,
          "spectral": "B0Ve",
          "temp_k": 30000
        },
        {
          "id": "Herschel 36 (HD 164740)",
          "ra_deg": 270.90958333333,
          "dec_deg": -24.37638888889,
          "v_mag": 10.3,
          "spectral": "O7.5V",
          "temp_k": 36000
        }
      ],
      "note": "V as seen from here, its extinction included; colours a blackbody's at the spectral type's temperature. Herschel 36's V is the star's, not SIMBAD's value for its whole bright knot",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "NGC 6530: a seeded sample of its stars",
      "clusters": [
        {
          "name": "NGC 6530",
          "ra_deg": 271.12917,
          "dec_deg": -24.35833,
          "core_arcmin": 2.0,
          "radius_arcmin": 8.0,
          "members": 1500,
          "summed_v": 6.0
        }
      ],
      "count_drawn": [
        500,
        1200,
        2200
      ],
      "drawn": "a seeded sample (model): the cluster's place is measured, each star's place and brightness are drawn; more than a thousand members are known (Tothill et al. 2008). Its summed light is the same at every tier",
      "source": "SIMBAD for the cluster's place; Tothill et al. 2008 for its membership; its size and summed light are illustrative"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (B, V and R with H-alpha: hydrogen's red and pink), with each exposure's stretch as the photograph has it; the stars a blackbody's",
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
    "Tothill, N. F. H., Gagné, M., Stecklum, B. & Kenworthy, M. A. 2008, The Lagoon Nebula and its Vicinity, Handbook of Star Forming Regions II, ASP (https://arxiv.org/abs/0809.3380)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: the O stars' places, V magnitudes and spectral types, and NGC 6530's place",
    "ESO eso0936a (CC BY 4.0, credit ESO), the photograph the app showed: the hero's LIGHT (its stars removed) and the relief of its wall"
  ],
  "review": {
    "data_vs_model": "Measured: the stars' places and magnitudes, the cluster's place, that the glowing gas is on the cloud's near face with the cluster in front, and the light (the photograph). Reconstructed: the wall's depth and relief, the lane's and the globules' absorption from the photograph's darkness. Model: the lane's distance in front, the cloud behind, each cluster star (seeded)",
    "geometry": "A blister after Tothill et al. 2008: the bowl's size read from the photograph, its depth illustrative, and said so",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; stars by spectral type",
    "distance": "The record's 4 100 ly (site/data/dso.json); Tothill et al. 2008 give about 1.3 kpc (4 200 ly). Lengths on the sky are scaled to the record's distance",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Lagoon Nebula's shape: after Tothill et al. 2008, Handbook of Star Forming Regions II; reconstructed by Space Radar",
    "Its stars and cluster: SIMBAD, CDS",
    "Its light: the photograph eso0936a, ESO (CC BY 4.0), its stars removed by Space Radar"
  ]
};
