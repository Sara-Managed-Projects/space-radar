// GENERATED from registry/deepsky-heroes/m20.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m20",
  "record": "dso-m20",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the bubble's far half and near cap as crisp lit sheets (12 coarse steps and an exact crossing each; 8 on T0, or two meshes), the blue light on the cloud behind, the three dark lanes in front, HD 164492 and its cluster",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32) and the sharp map round the star; the camera may go inside the bubble"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 5200,
    "ra_deg": 270.67546,
    "dec_deg": -22.97189,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the walls' light: the photograph without its stars, and round HD 164492 a sharper map of the same photograph",
      "picture": {
        "id": "m20",
        "file": "site/images/nebulae/m20.webp",
        "ra_deg": 270.60111,
        "dec_deg": -23.02513,
        "width_arcmin": 24.9,
        "height_arcmin": 24.9,
        "north_deg": -12.4
      },
      "file": "site/images/deep/nebulae/m20-light.webp",
      "depth": "site/data/deep/m20-front.bin",
      "detail": {
        "file": "site/images/deep/nebulae/m20-detail.webp",
        "centre_west_arcmin": 4.0,
        "centre_north_arcmin": -3.0,
        "size_arcmin": 12.0,
        "px": 640,
        "quality": 88,
        "level_arcmin": 1.0,
        "url": "https://noirlab.edu/public/media/archives/images/large/noirlab2521ah.jpg"
      },
      "made_by": "scripts/build_deep_emission.py",
      "credit": "NSF–DOE Vera C. Rubin Observatory/NOIRLab/SLAC/AURA (noirlab2521ah), CC BY 4.0",
      "stars_out": {
        "thresh": 16.0,
        "bright": 50.0
      },
      "note": "stars removed (they are drawn as stars); nothing else changed but the sharp map's levels, matched to the 512 px map",
      "source": "NOIRLab noirlab2521ah, credit NSF–DOE Vera C. Rubin Observatory/NOIRLab/SLAC/AURA, CC BY 4.0: https://noirlab.edu/public/images/noirlab2521ah/"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the H II region's walls: the far half of a bubble round HD 164492 and its near cap; round it, the face of the dusty cloud that scatters the stars' light blue",
      "lobes": [
        {
          "name": "bubble",
          "centre_west_arcmin": 4.3,
          "centre_north_arcmin": -3.6,
          "along_arcmin": 6.4,
          "across_arcmin": 6.0,
          "pa_deg": 0,
          "depth_ly": 8,
          "shape": "cos"
        }
      ],
      "blend_ly": 4,
      "outside_ly": -5,
      "near": {
        "share": 0.35,
        "caps": [
          {
            "name": "near cap",
            "centre_west_arcmin": 4.3,
            "centre_north_arcmin": -3.6,
            "along_arcmin": 6.4,
            "across_arcmin": 6.0,
            "pa_deg": 0,
            "height_ly": 6,
            "shape": "cos"
          }
        ]
      },
      "relief": {
        "power": 0.5,
        "max_ln": 0.3,
        "max_ly": 2.0,
        "fine_arcmin": 0.3,
        "wide_arcmin": 2.0
      },
      "grid": [
        224,
        224
      ],
      "source": "Lefloch, B. & Cernicharo, J. 2000, ApJ (arXiv:astro-ph/0007346: 'a young HII region', protostellar cores 'just behind the ionization front'); Lefloch, B. et al. 2008, Star Formation in the Trifid Nebula, Handbook of Star Forming Regions II (arXiv:0809.2023). The bubble's size is read from the photograph; its depth and the near cap's share are illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the molecular cloud behind the walls: dark from behind",
      "thickness_ly": 6.0,
      "sigma_per_ly": 1.5,
      "blur_arcmin": 2.0,
      "source": "Lefloch et al. 2008 (the cloud's filaments round the nebula); its thickness and opacity here are illustrative"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the three dark lanes that cut the nebula and the dark column to its west: dust in front of the glowing gas",
      "z_ly": 9.0,
      "blobs": [
        {
          "name": "the lanes over the bubble",
          "centre_west_arcmin": 4.3,
          "centre_north_arcmin": -3.6,
          "along_arcmin": 6.8,
          "across_arcmin": 6.6,
          "pa_deg": 0
        },
        {
          "name": "the western column",
          "centre_west_arcmin": 11.0,
          "centre_north_arcmin": -0.5,
          "along_arcmin": 4.0,
          "across_arcmin": 2.2,
          "pa_deg": 100
        },
        {
          "name": "the northern lane",
          "centre_west_arcmin": -1.5,
          "centre_north_arcmin": 1.5,
          "along_arcmin": 6.0,
          "across_arcmin": 1.8,
          "pa_deg": 80
        }
      ],
      "tau_max": 1.2,
      "source": "Lefloch et al. 2008 (the dust lanes are dense filaments of the parent cloud, seen in silhouette against the H II region). How far in front they are is not measured: drawn just in front of the near cap"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "HD 164492, the Trifid's ionising star, at its catalogued place on the sky",
      "stars": [
        {
          "id": "HD 164492 (A, C and companions)",
          "ra_deg": 270.59813646708,
          "dec_deg": -23.03083321005,
          "v_mag": 6.8,
          "spectral": "O7.5Vz",
          "temp_k": 36000
        }
      ],
      "note": "V as seen from here, the whole multiple; its colour a blackbody's at the primary's temperature",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "the young cluster round HD 164492: a seeded sample",
      "clusters": [
        {
          "name": "the Trifid's cluster",
          "ra_deg": 270.59813646708,
          "dec_deg": -23.03083321005,
          "core_arcmin": 0.6,
          "radius_arcmin": 4.0,
          "members": 300,
          "summed_v": 8.5
        }
      ],
      "count_drawn": [
        300,
        700,
        1200
      ],
      "drawn": "a seeded sample (model) round the star's measured place; its size, membership and summed light are illustrative",
      "source": "its place: HD 164492's (SIMBAD); everything else illustrative"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (Rubin's broad filters: hydrogen's red, the blue of scattered starlight), with each exposure's stretch; the star a blackbody's",
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
    "Lefloch, B. & Cernicharo, J. 2000, Pre-Orion Cores in the Trifid Nebula, ApJ (2000) (https://arxiv.org/abs/astro-ph/0007346)",
    "Lefloch, B., Cernicharo, J. & Pardo, J. R. 2008, Star Formation in the Trifid Nebula, Handbook of Star Forming Regions II, ASP (https://arxiv.org/abs/0809.2023)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: HD 164492's place, V magnitude and spectral type",
    "NOIRLab noirlab2521ah (CC BY 4.0, credit NSF–DOE Vera C. Rubin Observatory/NOIRLab/SLAC/AURA), the photograph the app showed: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the star's place and brightness, that the nebula is a young H II region round it with dust lanes in front, and the light (the photograph). Reconstructed: the bubble's far half and near cap, the blue light's place on the cloud behind, the lanes' absorption from the photograph's darkness. Model: the lanes' distance in front, the cloud behind, each cluster star (seeded)",
    "geometry": "A bubble round the star: its size read from the photograph, its depth along our line and the share of light on its near side illustrative, and said so",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; the star by spectral type",
    "distance": "The record's 5 200 ly (site/data/dso.json, the Messier list); Gaia-era distances to its cluster are nearer, and the record is not this stage's to change (for spec 0078). Lengths on the sky are scaled to the record's distance",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Trifid Nebula's shape: after Lefloch & Cernicharo 2000 (ApJ) and Lefloch et al. 2008; reconstructed by Space Radar",
    "Its star: SIMBAD, CDS",
    "Its light: the photograph noirlab2521ah, NSF–DOE Vera C. Rubin Observatory/NOIRLab/SLAC/AURA (CC BY 4.0), its stars removed by Space Radar"
  ]
};
