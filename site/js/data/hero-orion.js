// GENERATED from registry/deepsky-heroes/orion.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "orion",
  "record": "dso-m42",
  "stage": "W1-a",
  "shipped": true,
  "children": [
    "dso-m43"
  ],
  "levels": {
    "2": "structure: the front as a crisp lit sheet at its reconstructed depth (12 coarse steps and an exact crossing; 8 on T0), the cloud behind it, the Veil, the Trapezium, NU Ori and the cluster",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go into the bowl, to the Trapezium"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 1344,
    "ra_deg": 83.8186096,
    "dec_deg": -5.3897005,
    "axes": "x west, y north, z toward the Sun; theta1 Ori C at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the front's light: the photograph without its stars, and near the Trapezium a sharp map of the same photograph",
      "file": "site/images/deep/orion/orion-light.webp",
      "depth": "site/data/deep/orion-front.bin",
      "from": "site/images/nebulae/m42.webp (ESO eso1723a, CC BY 4.0, credit ESO/G. Beccari)",
      "made_by": "scripts/build_deep_orion.py",
      "detail": {
        "centre_east_arcmin": 0.8,
        "centre_north_arcmin": 2.5,
        "size_arcmin": 13.0,
        "px": 704,
        "quality": 90,
        "level_arcmin": 1.5,
        "url": "https://cdn.eso.org/images/large/eso1723a.jpg"
      },
      "note": "stars removed (they are drawn as stars); nothing else changed but the sharp map's levels, matched to the 640 px map",
      "source": "ESO eso1723a, ESO/G. Beccari, CC BY 4.0: https://www.eso.org/public/images/eso1723a/"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the main ionisation front: a thin layer of ionised gas on the near face of the molecular cloud OMC-1, lit by theta1 Ori C, concave toward us",
      "star_in_front_pc": 0.2,
      "bowl": {
        "rho_s_ly": 2.0,
        "slope": 0.55,
        "rim_ly": 4.0
      },
      "bar": {
        "offset_arcmin": 1.5,
        "normal_pa_deg": 155,
        "length_arcmin": 4.5,
        "width_arcmin": 2.0,
        "rise_ly": 0.35
      },
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 0.3,
        "fine_arcmin": 0.3,
        "wide_arcmin": 3.0,
        "from_ly": 0.3,
        "full_ly": 1.0
      },
      "grid": [
        240,
        186
      ],
      "check": "From our line each sky point's light is the photograph's (tests/test_hero_orion.mjs holds the column to 5 %); the sheet's slope stays under 3 so no part of it is dimmed on our line",
      "source": "Wen & O'Dell 1995, ApJ 438, 784 (the 3D model: a thin ionised layer near the front on the near side of OMC-1, its depth from the H-alpha surface brightness with theta1 Ori C as the only ionising star); O'Dell et al. 2009, AJ 137, 367 (arXiv:0810.4375: theta1 Ori C about 0.2 pc in front of the main ionisation front; a concave blister); O'Dell 2001, ARA&A 39, 99"
    },
    {
      "part": "m43",
      "kind": "front",
      "what": "M43: a smaller blister on the same cloud, ionised by NU Ori, north of M42 across the Dark Bay",
      "star": {
        "id": "NU Ori (HD 37061)",
        "ra_deg": 83.8806871,
        "dec_deg": -5.2673839,
        "v_mag": 6.83,
        "spectral": "O9.5V",
        "temp_k": 31500
      },
      "dimple": {
        "depth_ly": 0.35,
        "radius_ly": 1.4,
        "star_in_front_ly": 0.3
      },
      "source": "SIMBAD (CDS) for NU Ori; the dimple's depth and size are illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the molecular cloud OMC-1 behind the front: dark from behind, hiding the cluster's embedded stars",
      "thickness_ly": 3.0,
      "sigma_per_ly": 3.0,
      "blur_arcmin": 3.0,
      "source": "O'Dell 2001 (the nebula is a blister on the near face of OMC-1); the cloud's thickness and opacity are illustrative (it is many magnitudes of extinction thick)"
    },
    {
      "part": "veil",
      "kind": "dust",
      "what": "the Veil: neutral gas and dust in front of the nebula; its Dark Bay, north-east of the Trapezium, is a shadow of the Veil, not a gap in the front",
      "z_ly": 6.5,
      "dark_bay": {
        "east_arcmin": 5.0,
        "north_arcmin": 1.5,
        "a_arcmin": 4.5,
        "b_arcmin": 2.5,
        "tau_max": 1.5
      },
      "source": "Abel et al. 2004, ApJ 609, 247 (arXiv:astro-ph/0404399): photoionisation models 'place the veil 1-3 pc in front of the star'; drawn at 2 pc. The Dark Bay's optical depth is the photograph's darkness against its surroundings there (reconstructed)"
    },
    {
      "part": "trapezium",
      "kind": "stars",
      "what": "the Trapezium: the four brightest stars of the cluster, and theta2 Ori A beside it, at their catalogued places on the sky; their depths are not measured, so they stand in theta1 Ori C's plane",
      "stars": [
        {
          "id": "theta1 Ori A (HD 37020)",
          "ra_deg": 83.8159392,
          "dec_deg": -5.3873152,
          "v_mag": 6.73,
          "spectral": "B0V",
          "temp_k": 30000
        },
        {
          "id": "theta1 Ori B (HD 37021)",
          "ra_deg": 83.8172249,
          "dec_deg": -5.3852179,
          "v_mag": 7.96,
          "spectral": "B1V",
          "temp_k": 25000
        },
        {
          "id": "theta1 Ori C (HD 37022)",
          "ra_deg": 83.8186096,
          "dec_deg": -5.3897005,
          "v_mag": 5.13,
          "spectral": "O7Vp",
          "temp_k": 39000
        },
        {
          "id": "theta1 Ori D (HD 37023)",
          "ra_deg": 83.821906,
          "dec_deg": -5.3879363,
          "v_mag": 6.7,
          "spectral": "B1.5Vp",
          "temp_k": 24000
        },
        {
          "id": "theta2 Ori A (HD 37041)",
          "ra_deg": 83.8454218,
          "dec_deg": -5.4160646,
          "v_mag": 4.98,
          "spectral": "O9.5IVp",
          "temp_k": 31000,
          "z_ly": 0.6,
          "catalogue_ly": [
            164.9836,
            1345.7071,
            -742.4584
          ]
        }
      ],
      "note": "V as seen from here, its extinction included; colours a blackbody's at the spectral type's temperature. Their Gaia and Hipparcos parallaxes (2.3 to 2.7 mas) cannot place them within a light-year",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-15"
    },
    {
      "part": "onc",
      "kind": "points",
      "what": "the Orion Nebula Cluster round the Trapezium: a seeded sample of its stars, a King-like cloud elongated north-south",
      "core_pc": 0.18,
      "ellipticity": 0.3,
      "pa_deg": 10,
      "radius_pc": 2.5,
      "count_drawn": [
        400,
        900,
        1600
      ],
      "members": 2000,
      "drawn": "a seeded sample (model): the core radius, the elongation and its direction are measured, each star's place and brightness are drawn. Their summed light is the same at every tier; close up they stay pinpoints. Stars behind the front are dimmed by the cloud",
      "source": "Hillenbrand & Hartmann 1998, ApJ 492, 540: 'the core radius of the cluster is 0.16-0.21 pc', elongated north-south; ellipticity 0.30 at about 10 degrees from north-south, as Da Rio et al. 2014 (arXiv:1409.2503) summarise it"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (g, r and i with H-alpha), shown with each exposure's stretch as the photograph is (scene/exposure.js); the stars a blackbody's at their spectral type's temperature",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {
        "star": "#cfdcff"
      },
      "note": "Deep: ENHANCED. The photograph's own Deep stretch (gamma 0.7, saturation 1.25, as scene/nebulae.js gives every photograph). Not what an eye or a broadband camera sees"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "Wen, Z. & O'Dell, C. R. 1995, A three-dimensional model of the Orion Nebula, ApJ 438, 784: the front as a thin ionised layer on the near side of OMC-1, its depth from the H-alpha surface brightness with theta1 Ori C the only ionising star; the Bright Bar",
    "O'Dell, C. R. 2001, The Orion Nebula and its associated population, ARA&A 39, 99: the blister, OMC-1 behind it, the Veil in front",
    "O'Dell, C. R., Henney, W. J., Abel, N. P., Ferland, G. J. & Arthur, S. J. 2009, AJ 137, 367 (https://arxiv.org/abs/0810.4375): theta1 Ori C about 0.2 pc in front of the main ionisation front; the classic concave blister, revised to the south-west (Orion-S, not drawn)",
    "Abel, N. P. et al. 2004, Physical Conditions in Orion's Veil, ApJ 609, 247 (https://arxiv.org/abs/astro-ph/0404399): the Veil 1 to 3 pc in front of the star",
    "Abel, N. P., Ferland, G. J. & O'Dell, C. R. 2019, ApJ (https://arxiv.org/abs/1906.07779): the closest, highest-ionisation layer of the Veil 1.3 pc from theta1 Ori C",
    "Hillenbrand, L. A. & Hartmann, L. W. 1998, ApJ 492, 540: the cluster's core radius and north-south elongation; Da Rio, N. et al. 2014 (https://arxiv.org/abs/1409.2503) for the ellipticity 0.30",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-15: the places, V magnitudes and spectral types of theta1 Ori A to D and NU Ori",
    "ESO eso1723a (CC BY 4.0, credit ESO/G. Beccari), the photograph the app already shows: the hero's LIGHT (its stars removed, site/images/deep/orion/orion-light.webp) and the relief of its front"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the stars' places and magnitudes (SIMBAD), the cluster's core and elongation, theta1 Ori C 0.2 pc in front of the front, the Veil's 1 to 3 pc, and the light (the photograph). Reconstructed: the front's depth away from the Trapezium (a bowl opening toward us, the Bright Bar, Wen & O'Dell's rule for its relief), M43's dimple, the cloud's thickness, the Dark Bay as the Veil's shadow. Model: each cluster star's place and brightness (seeded), the Trapezium's depths (in one plane)",
    "geometry": "Wen & O'Dell 1995 and O'Dell 2001 for the blister; O'Dell et al. 2009 for 0.2 pc; the bowl's steepness and the Bar's rise are illustrative and said so; Orion-S (a separate cloud in the ionised gas, O'Dell et al. 2009) is not drawn",
    "colours": "The photograph's own, with each exposure's stretch as the photograph has it; Deep declared enhanced; stars by spectral type",
    "distance": "1 344 ly, the record's (registry dso.json); Menten et al. 2007's VLBA parallax, 414 pc (1 350 ly), agrees. Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Orion (0076 W1-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-15",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Orion Nebula's 3D form: Wen & O'Dell 1995, ApJ 438, 784; O'Dell 2001, ARA&A 39, 99; O'Dell et al. 2009, AJ 137, 367 (theta1 Ori C 0.2 pc in front of the front); reconstructed by Space Radar",
    "The Veil: Abel et al. 2004, ApJ 609, 247; Abel, Ferland & O'Dell 2019, ApJ",
    "The cluster: Hillenbrand & Hartmann 1998, ApJ 492, 540; the Trapezium's and NU Ori's places and magnitudes: SIMBAD, CDS",
    "Its light: the photograph eso1723a, ESO/G. Beccari (CC BY 4.0), its stars removed by Space Radar"
  ]
};
