// GENERATED from registry/deepsky-heroes/rosette.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "rosette",
  "record": "dso-rosette-nebula",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the ring's far and near faces as crisp lit sheets round the central cavity (12 coarse steps and an exact crossing each; 8 on T0, or two meshes), the cloud behind, the dark globules, NGC 2244's O stars and its cluster",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go into the cavity, among the cluster's stars"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 5200,
    "ra_deg": 98.4375,
    "dec_deg": 4.9983,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the walls' light: the photograph without its stars",
      "picture": {
        "id": "rosette-nebula",
        "file": "site/images/nebulae/rosette-nebula.webp",
        "ra_deg": 98.06061,
        "dec_deg": 4.97331,
        "width_arcmin": 67.35,
        "height_arcmin": 67.28,
        "north_deg": 2.0
      },
      "file": "site/images/deep/nebulae/rosette-light.webp",
      "depth": "site/data/deep/rosette-front.bin",
      "made_by": "scripts/build_deep_emission.py",
      "credit": "KPNO/NOIRLab/NSF/AURA/N. A. Sharp (noao-rosette), CC BY 4.0",
      "note": "stars removed (they are drawn as stars); nothing else changed",
      "source": "NOIRLab noao-rosette, credit KPNO/NOIRLab/NSF/AURA/N. A. Sharp, CC BY 4.0: https://noirlab.edu/public/images/noao-rosette/ (Burrell Schmidt telescope, Kitt Peak)"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the ring's faces: the far and near sides of the shell of ionised gas round the cavity, flattened along our line as a bubble in a sheet-like cloud is",
      "lobes": [
        {
          "name": "far face",
          "centre_west_arcmin": 24.0,
          "centre_north_arcmin": -2.0,
          "along_arcmin": 34.0,
          "across_arcmin": 32.0,
          "pa_deg": 0,
          "depth_ly": 20,
          "shape": "cos"
        }
      ],
      "blend_ly": 6,
      "outside_ly": 0,
      "near": {
        "share": 0.45,
        "caps": [
          {
            "name": "near face",
            "centre_west_arcmin": 24.0,
            "centre_north_arcmin": -2.0,
            "along_arcmin": 34.0,
            "across_arcmin": 32.0,
            "pa_deg": 0,
            "height_ly": 15,
            "shape": "cos"
          }
        ]
      },
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 3.0,
        "fine_arcmin": 0.6,
        "wide_arcmin": 5.0
      },
      "grid": [
        192,
        192
      ],
      "source": "Wareing, C. J. et al. 2018, MNRAS 475, 3598 (arXiv:1802.04828: 'an evacuated central cavity formed from the stellar winds' of NGC 2244; the structure reproduced by 'mechanical stellar feedback from a 40 solar-mass star in a thin sheet-like molecular cloud', its inclination to the line of sight matching the observations). The ring's size is read from the photograph; its depths and the near face's share are illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the sheet-like molecular cloud behind the far face: dark from behind",
      "thickness_ly": 8.0,
      "sigma_per_ly": 1.0,
      "blur_arcmin": 5.0,
      "source": "Wareing et al. 2018 (a thin sheet-like cloud); its thickness and opacity here are illustrative"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the dark globules and elephant trunks in the ring's north-west: dust in front of the glowing gas",
      "z_ly": 20.0,
      "blobs": [
        {
          "name": "north-western globules",
          "centre_west_arcmin": 34.0,
          "centre_north_arcmin": 10.0,
          "along_arcmin": 16.0,
          "across_arcmin": 9.0,
          "pa_deg": 120
        }
      ],
      "tau_max": 1.0,
      "source": "the globules are seen in silhouette against the ring (the photograph). How far in front they are is not measured: drawn just in front of the near face"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "NGC 2244's O stars at their catalogued places on the sky; their depths are not measured, so they stand in one plane",
      "stars": [
        {
          "id": "HD 46150",
          "ra_deg": 97.98133544656,
          "dec_deg": 4.94286014336,
          "v_mag": 6.73,
          "spectral": "O5V((f))z",
          "temp_k": 41000
        },
        {
          "id": "HD 46223",
          "ra_deg": 98.0387783765,
          "dec_deg": 4.82352935988,
          "v_mag": 7.28,
          "spectral": "O4V((f))",
          "temp_k": 43000
        },
        {
          "id": "HD 46149",
          "ra_deg": 97.96888303804,
          "dec_deg": 5.03310518834,
          "v_mag": 7.61,
          "spectral": "O8.5V",
          "temp_k": 34000
        },
        {
          "id": "HD 46106",
          "ra_deg": 97.90998682629,
          "dec_deg": 5.02677678411,
          "v_mag": 7.93,
          "spectral": "O9.7III(n)",
          "temp_k": 31000
        },
        {
          "id": "HD 46056",
          "ra_deg": 97.83692014324,
          "dec_deg": 4.83440070965,
          "v_mag": 8.16,
          "spectral": "O8Vn",
          "temp_k": 35000
        },
        {
          "id": "HD 46202",
          "ra_deg": 98.04362790887669,
          "dec_deg": 4.966601364539723,
          "v_mag": 8.27,
          "spectral": "O9.2V",
          "temp_k": 33000
        },
        {
          "id": "V578 Mon",
          "ra_deg": 98.00253193804,
          "dec_deg": 4.8780239817,
          "v_mag": 8.55,
          "spectral": "B0V+B1V",
          "temp_k": 30000
        }
      ],
      "note": "V as seen from here, its extinction included; colours a blackbody's at the spectral type's temperature. HD 46223 was thrown out of the cluster about 1.7 million years ago (Wareing et al. 2018): it stands where it is now",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "NGC 2244: a seeded sample of its stars",
      "clusters": [
        {
          "name": "NGC 2244",
          "ra_deg": 98.045,
          "dec_deg": 4.91389,
          "core_arcmin": 3.0,
          "radius_arcmin": 12.0,
          "members": 1500,
          "summed_v": 6.5
        }
      ],
      "count_drawn": [
        500,
        1200,
        2200
      ],
      "drawn": "a seeded sample (model) round the cluster's catalogued place; its size, membership and summed light are illustrative",
      "source": "SIMBAD for the cluster's place; everything else illustrative"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (the page names no filters: hydrogen's red as the plate shows it), with each exposure's stretch; the stars a blackbody's",
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
    "Wareing, C. J., Pittard, J. M. et al. 2018, A new mechanical stellar wind feedback model for the Rosette Nebula, MNRAS 475, 3598 (https://arxiv.org/abs/1802.04828)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: the O stars' places, V magnitudes and spectral types, and NGC 2244's place",
    "NOIRLab noao-rosette (CC BY 4.0, credit KPNO/NOIRLab/NSF/AURA/N. A. Sharp), the photograph the app showed: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the stars' places and magnitudes, the cluster's place, the central cavity blown by its winds, and the light (the photograph). Reconstructed: the ring's far and near faces, flattened along our line after Wareing et al. 2018's sheet-like cloud, the globules' absorption. Model: the faces' depths, the light's share between them, the globules' distance in front, each cluster star (seeded)",
    "geometry": "A shell round the cavity flattened along our line: its size read from the photograph, its depths illustrative, and said so",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; stars by spectral type",
    "distance": "The record's 5 200 ly (site/data/dso.json). Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Rosette Nebula's shape: after Wareing et al. 2018, MNRAS 475, 3598; reconstructed by Space Radar",
    "Its stars and cluster: SIMBAD, CDS",
    "Its light: the photograph noao-rosette, KPNO/NOIRLab/NSF/AURA/N. A. Sharp (CC BY 4.0), its stars removed by Space Radar"
  ]
};
