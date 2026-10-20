// GENERATED from registry/deepsky-heroes/carina.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "carina",
  "record": "dso-carina-nebula",
  "stage": "W2-e",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the glowing wall as a crisp lit sheet at its reconstructed depth (12 coarse steps and an exact crossing; 8 on T0, or the sheet as a mesh), the cloud behind it, the dust lane in front, Eta Carinae, the O stars and the two clusters",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go into the cavity, to Eta Carinae and Trumpler 14"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 7665,
    "ra_deg": 161.2854,
    "dec_deg": -59.8678,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the wall's light: the photograph without its stars, and round Eta Carinae and Trumpler 14 a sharper map of the same photograph",
      "file": "site/images/deep/carina/carina-light.webp",
      "depth": "site/data/deep/carina-front.bin",
      "from": "site/images/nebulae/carina-nebula.webp (ESO eso1250a, CC BY 4.0, credit ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit)",
      "made_by": "scripts/build_deep_carina.py",
      "detail": {
        "centre_west_arcmin": 2.6,
        "centre_north_arcmin": 3.5,
        "size_arcmin": 20.0,
        "px": 576,
        "quality": 88,
        "level_arcmin": 1.5,
        "url": "https://cdn.eso.org/images/publicationjpg/eso1250a.jpg"
      },
      "note": "stars removed (they are drawn as stars); nothing else changed but the sharp map's levels, matched to the 640 px map",
      "source": "ESO eso1250a, ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit, CC BY 4.0: https://www.eso.org/public/images/eso1250a/"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the glowing wall: ionised gas on the inner face of the cavity the clusters have blown in their molecular cloud, drawn on the far side of two lobes, Eta Carinae and the clusters inside",
      "axis_pa_deg": 27.8,
      "lobes": [
        {
          "name": "north",
          "centre_west_arcmin": 2.0,
          "centre_north_arcmin": 14.0,
          "along_arcmin": 26.0,
          "across_arcmin": 28.0,
          "depth_ly": 45
        },
        {
          "name": "south",
          "centre_west_arcmin": 6.0,
          "centre_north_arcmin": -18.0,
          "along_arcmin": 26.0,
          "across_arcmin": 30.0,
          "depth_ly": 40
        }
      ],
      "waist_ly": 12,
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 4.0,
        "fine_arcmin": 0.6,
        "wide_arcmin": 5.0
      },
      "grid": [
        200,
        214
      ],
      "check": "From our line each sky point's light is the photograph's (tests/test_hero_carina.mjs holds the column to 5 %); the wall's slope stays under 1.6 so no part of it is dimmed on our line (orion.js caps the limb's 1 / |cos| at 2)",
      "source": "Smith, N. et al. 2000, ApJ 532, L145 (the MSX picture: 'one coherent structure: a (somewhat distorted) bipolar nebula with the major axis perpendicular to the Galactic plane', lobes about 40 pc across); Smith, N. & Brooks, K. J. 2008, in Handbook of Star Forming Regions II, ASP, 138 (arXiv:0809.5081: 'a large bipolar cavity ... with an axis perpendicular to the Galactic plane'; the cavities north and south of Tr 14 and Tr 16 'the two halves of what appears to be the main bipolar cavity'); Rebolledo, D. et al. 2017, MNRAS 472, 1685 (arXiv:1708.02864: an H I cavity matching the southern lobe)"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the molecular cloud behind the glowing wall: dark from behind",
      "thickness_ly": 12.0,
      "sigma_per_ly": 2.5,
      "blur_arcmin": 6.0,
      "source": "Smith & Brooks 2008 (the Northern and Southern Clouds of molecular gas, NANTEN CO, Yonekura et al. 2005); the cloud's thickness and opacity here are illustrative"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the V-shaped dust lane across the nebula's waist and the Keyhole's dark clumps: dust and molecular gas in FRONT of the glowing gas, hiding it",
      "z_ly": 20.0,
      "lane": {
        "points": [
          [
            -11.0,
            8.6
          ],
          [
            0.0,
            1.6
          ],
          [
            12.0,
            13.5
          ],
          [
            24.0,
            27.5
          ]
        ],
        "half_width_arcmin": 3.6
      },
      "keyhole": {
        "west_arcmin": 0.4,
        "north_arcmin": 10.0,
        "a_arcmin": 2.6,
        "b_arcmin": 1.6,
        "pa_deg": 120
      },
      "tau_max": 1.0,
      "source": "Smith & Brooks 2008 (arXiv:0809.5081): 'the V-shaped dark lanes are the result of obscuration by dust intermixed with molecular gas', the region with 'the highest line-of-sight column density in the nebula'; the Keyhole 'comprised of cool (Td < 15 K) foreground molecular clumps at the outskirts of the H II region' (Brooks et al. 2000). How far in front of the clusters the lane lies is not measured: drawn 20 ly in front of Eta Carinae's plane"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "Eta Carinae and the clusters' brightest O and Wolf-Rayet stars at their catalogued places on the sky; their depths are not measured, so they stand in Eta Carinae's plane",
      "stars": [
        {
          "id": "Eta Carinae (HD 93308)",
          "ra_deg": 161.2647742,
          "dec_deg": -59.6844309,
          "v_mag": 4.2,
          "spectral": "LBV",
          "temp_k": 6800
        },
        {
          "id": "HD 93129A",
          "ra_deg": 160.9894114,
          "dec_deg": -59.5476097,
          "v_mag": 7.31,
          "spectral": "O2If*",
          "temp_k": 44000
        },
        {
          "id": "HD 93128",
          "ra_deg": 160.9766491,
          "dec_deg": -59.5493048,
          "v_mag": 8.77,
          "spectral": "O3.5V((fc))z",
          "temp_k": 43000
        },
        {
          "id": "HD 93160",
          "ra_deg": 161.0302514,
          "dec_deg": -59.5751732,
          "v_mag": 7.6,
          "spectral": "O7III((f))",
          "temp_k": 36000
        },
        {
          "id": "HD 93161",
          "ra_deg": 161.037382,
          "dec_deg": -59.576355,
          "v_mag": 7.87,
          "spectral": "O8V+O9V",
          "temp_k": 34000
        },
        {
          "id": "HD 93250",
          "ra_deg": 161.1876146,
          "dec_deg": -59.5651897,
          "v_mag": 7.5,
          "spectral": "O4III(fc)",
          "temp_k": 41000
        },
        {
          "id": "WR 25 (HD 93162)",
          "ra_deg": 161.0432876,
          "dec_deg": -59.7197518,
          "v_mag": 8.8,
          "spectral": "O2.5If*/WN6+OB",
          "temp_k": 45000
        },
        {
          "id": "HD 93205",
          "ra_deg": 161.1405805,
          "dec_deg": -59.7376207,
          "v_mag": 7.75,
          "spectral": "O3.5V((f))+O8V",
          "temp_k": 43000
        },
        {
          "id": "HD 93204",
          "ra_deg": 161.1347462,
          "dec_deg": -59.7419502,
          "v_mag": 8.42,
          "spectral": "O5.5V((f))",
          "temp_k": 40000
        },
        {
          "id": "HD 303308",
          "ra_deg": 161.274645,
          "dec_deg": -59.6683126,
          "v_mag": 8.17,
          "spectral": "O4.5V((fc))",
          "temp_k": 41000
        },
        {
          "id": "CPD-59 2600",
          "ra_deg": 161.174151,
          "dec_deg": -59.7823348,
          "v_mag": 8.57,
          "spectral": "O6V((f))",
          "temp_k": 38000
        },
        {
          "id": "HD 93130",
          "ra_deg": 161.0015465,
          "dec_deg": -59.8743116,
          "v_mag": 8.04,
          "spectral": "O6.5III(f)",
          "temp_k": 37000
        },
        {
          "id": "HD 93403",
          "ra_deg": 161.4338327,
          "dec_deg": -59.4078204,
          "v_mag": 8.27,
          "spectral": "O5.5III(fc)",
          "temp_k": 39000
        },
        {
          "id": "QZ Car (HD 93206)",
          "ra_deg": 161.0954522,
          "dec_deg": -59.9933251,
          "v_mag": 6.24,
          "spectral": "O9.7Ibn",
          "temp_k": 30000
        },
        {
          "id": "WR 24 (HD 93131)",
          "ra_deg": 160.9677413,
          "dec_deg": -60.1177832,
          "v_mag": 6.48,
          "spectral": "WN6ha-w",
          "temp_k": 45000
        }
      ],
      "note": "V as seen from here, its extinction included; colours a blackbody's at the spectral type's temperature (Eta Carinae's from its colour). Gaia cannot place them within the nebula: the clusters' distances agree to about 2 % (Göppl & Preibisch 2022), about 150 ly, so their depths are drawn equal",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-20"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "Trumpler 14 and Trumpler 16: a seeded sample of each cluster's stars",
      "clusters": [
        {
          "name": "Trumpler 14",
          "ra_deg": 160.98583,
          "dec_deg": -59.55306,
          "core_arcmin": 0.17,
          "radius_arcmin": 5.0,
          "members": 2000,
          "summed_v": 6.0
        },
        {
          "name": "Trumpler 16",
          "ra_deg": 161.25292,
          "dec_deg": -59.7,
          "core_arcmin": 2.5,
          "radius_arcmin": 10.0,
          "members": 3000,
          "summed_v": 5.6
        }
      ],
      "count_drawn": [
        600,
        1400,
        2600
      ],
      "drawn": "a seeded sample (model): the clusters' places and Trumpler 14's core are measured, each star's place and brightness are drawn. Their summed light is the same at every tier; close up they stay pinpoints and get smaller, never larger. Stars behind the wall are dimmed by the cloud",
      "source": "Ascenso, J. et al. 2007, A&A 476, 199 (Trumpler 14's core and halo); SIMBAD for the clusters' places; Trumpler 16's size and each cluster's summed light are illustrative"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (B, g and r with H-alpha), shown with each exposure's stretch as the photograph is (scene/exposure.js); the stars a blackbody's at their spectral type's temperature",
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
    "Smith, N., Egan, M. P., Carey, S., Price, S. D., Morse, J. A. & Price, P. A. 2000, Large-scale structure of the Carina Nebula, ApJ 532, L145: a bipolar nebula with its axis perpendicular to the Galactic plane",
    "Smith, N. & Brooks, K. J. 2008, The Carina Nebula: A Laboratory for Feedback and Triggered Star Formation, Handbook of Star Forming Regions II, ASP (https://arxiv.org/abs/0809.5081): the bipolar cavity, the V-shaped lane as obscuring dust, the Keyhole's foreground clumps, the Northern and Southern Clouds, Eta Carinae inside the nebula, the distance",
    "Rebolledo, D. et al. 2017, MNRAS 472, 1685 (https://arxiv.org/abs/1708.02864): the atomic gas, a cavity matching the southern lobe",
    "Smith, N. 2006, ApJ 644, 1151: the Homunculus's expansion parallax, 2 350 +/- 50 pc",
    "Göppl, C. & Preibisch, T. 2022, A&A 660, A11 (https://arxiv.org/abs/2201.09097): Gaia EDR3 distances of Tr 14, Tr 15, Tr 16 and their neighbours, agreeing within about 2 %, 2.36 kpc (OB stars) and 2.34 kpc (X-ray selected)",
    "Ascenso, J. et al. 2007, A&A 476, 199: Trumpler 14's core and halo",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-20: the places, V magnitudes and spectral types of Eta Carinae and the O and Wolf-Rayet stars, and the clusters' places",
    "ESO eso1250a (CC BY 4.0, credit ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit), the photograph the app already shows: the hero's LIGHT (its stars removed, site/images/deep/carina/) and the relief of its wall"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the stars' places and magnitudes (SIMBAD), Trumpler 14's core, that the V-shaped lane and the Keyhole's clumps are dust in front of the gas, that Eta Carinae is inside the nebula, and the light (the photograph). Reconstructed: the wall's depth (the far side of two lobes of a bipolar cavity, after Smith et al. 2000), its relief from the photograph's brightness, the lane's optical depth from the photograph's darkness. Model: the lane's distance in front, the cloud behind, each cluster star's place and brightness (seeded), the stars' depths (one plane)",
    "geometry": "Smith et al. 2000 and Smith & Brooks 2008 for the bipolar cavity and its axis; the lobes' sizes, centres and depths are read from the photograph and are illustrative, and said so; the South Pillars are drawn on the wall, not as columns standing out of it",
    "colours": "The photograph's own, with each exposure's stretch as the photograph has it; Deep declared enhanced; stars by spectral type, Eta Carinae by its colour",
    "distance": "2.35 kpc (7 665 ly): Smith 2006's expansion parallax of the Homunculus (2 350 +/- 50 pc) and Göppl & Preibisch 2022's Gaia EDR3 parallaxes (2.34 and 2.36 kpc) agree; registry/dso-hand.yaml carries it. Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Carina (0077 W2-e); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-20",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Carina Nebula's bipolar cavity: Smith et al. 2000, ApJ 532, L145; Smith & Brooks 2008, Handbook of Star Forming Regions II; Rebolledo et al. 2017, MNRAS 472, 1685; reconstructed by Space Radar",
    "Its distance: Smith 2006, ApJ 644, 1151; Göppl & Preibisch 2022, A&A 660, A11",
    "Its stars: SIMBAD, CDS; Trumpler 14's core: Ascenso et al. 2007, A&A 476, 199",
    "Its light: the photograph eso1250a, ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit (CC BY 4.0), its stars removed by Space Radar"
  ]
};
