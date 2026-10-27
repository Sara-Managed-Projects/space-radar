// GENERATED from registry/deepsky-heroes/m45.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m45",
  "record": "dso-m45",
  "stage": "r14-neb-b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: one box over the photograph's footprint, marched (16 samples; 6 on T0 and under the latch): the photograph's light spread through a slab of dust by the starlight falling on it, added to what is behind",
    "3": "close-up: the same, the march's steps (to 32); the camera may go through it, among the stars (the dust within 1 ly of it fades)"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 425,
    "ra_deg": 56.86917,
    "dec_deg": 24.10528,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the starlight the cloud scatters: the photograph with each bright star's round halo subtracted and the faint stars taken out, spread through the cloud by the starlight falling on it",
      "file": "site/images/deep/sheets/m45-light.webp",
      "from": "site/images/nebulae/m45.webp (NOIRLab noao-m45, NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN, CC BY 4.0)",
      "image_row": "m45",
      "picture": {
        "ra_deg": 56.58318,
        "dec_deg": 24.0988,
        "width_arcmin": 68.68,
        "height_arcmin": 50.13,
        "north_deg": -90.8
      },
      "px": 512,
      "stars": {
        "above_median": 12,
        "grow_px": 2
      },
      "red_out": 6,
      "halos": {
        "r_px": 34,
        "pct": 25,
        "core_px": 6,
        "stars": [
          [
            56.87115,
            24.10514
          ],
          [
            57.29059,
            24.05342
          ],
          [
            56.2189,
            24.11334
          ],
          [
            56.45669,
            24.36775
          ],
          [
            56.58156,
            23.94836
          ],
          [
            56.30206,
            24.46728
          ],
          [
            57.29673,
            24.13671
          ],
          [
            56.20088,
            24.28947
          ],
          [
            56.47699,
            24.55451
          ]
        ]
      },
      "floor_pct": 20,
      "z_ly": 0,
      "half_ly": 0.3,
      "feather": [
        0.8,
        0.98
      ],
      "peak": 0.4,
      "made_by": "scripts/build_deep_sheets.py",
      "illuminate": {
        "front_ly": 0.3,
        "soft_ly": 0.3,
        "thickness_ly": 2.0,
        "near_ly": 1.0,
        "note": "z_ly is each star's depth as the app draws it (scene/clusters.js: the cluster's 425 ly plus 8 ly times a fixed number per star, not measured), from the record's place toward the Sun; tests/test_hero_r14neb.mjs holds them to clusters.js. front_ly and thickness_ly (illustrative): the cloud is in front of the stars (Ritchey et al. 2006); how far and how deep are not measured. Positions and V: SIMBAD",
        "stars": [
          {
            "id": "Alcyone",
            "ra_deg": 56.87115,
            "dec_deg": 24.10514,
            "v_mag": 2.87,
            "z_ly": -5.459
          },
          {
            "id": "Atlas",
            "ra_deg": 57.29059,
            "dec_deg": 24.05342,
            "v_mag": 3.62,
            "z_ly": -1.707
          },
          {
            "id": "Electra",
            "ra_deg": 56.2189,
            "dec_deg": 24.11334,
            "v_mag": 3.7,
            "z_ly": 1.857
          },
          {
            "id": "Maia",
            "ra_deg": 56.45669,
            "dec_deg": 24.36775,
            "v_mag": 3.87,
            "z_ly": -1.743
          },
          {
            "id": "Merope",
            "ra_deg": 56.58156,
            "dec_deg": 23.94836,
            "v_mag": 4.18,
            "z_ly": -5.997
          },
          {
            "id": "Taygeta",
            "ra_deg": 56.30206,
            "dec_deg": 24.46728,
            "v_mag": 4.3,
            "z_ly": 2.308
          },
          {
            "id": "Pleione",
            "ra_deg": 57.29673,
            "dec_deg": 24.13671,
            "v_mag": 5.05,
            "z_ly": 7.118
          },
          {
            "id": "Celaeno",
            "ra_deg": 56.20088,
            "dec_deg": 24.28947,
            "v_mag": 5.45,
            "z_ly": 4.275
          },
          {
            "id": "Asterope",
            "ra_deg": 56.47699,
            "dec_deg": 24.55451,
            "v_mag": 5.76,
            "z_ly": -6.095
          }
        ]
      },
      "source": "NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN, noao-m45, CC BY 4.0: https://noirlab.edu/public/images/noao-m45/ (B, V and I, WIYN 0.9-metre, Mosaic I, released 2020-06-30)"
    },
    {
      "part": "scatter",
      "kind": "phase",
      "what": "how bright the scattered light is from another side: a Henyey-Greenstein phase function of the angle between the star lighting it, the dust and the eye, against that angle from here",
      "g": 0.6,
      "range": [
        0.3,
        1.4
      ],
      "source": "Henyey & Greenstein 1941, ApJ 93, 70; g about 0.6 for interstellar dust (Sujatha et al. 2007, ApJ 665, 363, measured 0.61 +/- 0.07 in the far ultraviolet near the Coalsack: arXiv:0705.1752)"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {},
    "note": "The photograph's own colours: broadband B, V and I, close to what a camera sees: the blue is starlight scattered by dust, bluer than the stars because dust scatters blue light more",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {},
      "note": "Deep: the photograph's Deep stretch (as every photograph gets it). Not what an eye sees"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "NOIRLab noao-m45 (CC BY 4.0), NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN: the light",
    "Ritchey, A. M., Martinez, M. & Federman, S. R. 2006, The nature of interstellar gas toward the Pleiades revealed in absorption lines, ApJ (https://arxiv.org/abs/astro-ph/0606644): the gas seen in absorption toward twenty members (so in front of them), its velocity gradients from the cloud's interaction with the cluster",
    "Gibson, S. J. 2007, Multiscale structure in dust reflection and cold HI (https://arxiv.org/abs/astro-ph/0703055): the reflection nebula traces the cloud's cold hydrogen, structured on every scale from tens of parsecs to tens of au",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/): the nine stars' places and V magnitudes",
    "Henyey, L. G. & Greenstein, J. L. 1941, ApJ 93, 70: the phase function"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the stars' places and magnitudes, the light (the photograph), that the gas is in front of the stars. Reconstructed: the light's depth at each place (from the stars as the app draws them, whose depths within the cluster are a fixed model) and the halo subtraction. Modelled: the change of the scattered light with the view (g = 0.6). Illustrative: how far in front of the stars the dust is and how deep (0.3 ly, a slab 2 ly thick)",
    "geometry": "A slab of dust 2 ly thick just in front of the stars that light it at each place, its light the photograph's spread by the starlight on it; the stars' own depths are scene/clusters.js's fixed numbers within the cluster (not measured), and the card says the depth is a reconstruction",
    "colours": "The photograph's own broadband colours; Deep declared enhanced",
    "distance": "425 ly, the record's (the cluster's); Gaia puts the cluster at about 440 ly. Lengths on the sky are scaled to the record's",
    "credits": "CREDITS.md section 3l (0078 r14-neb-b); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Pleiades' reflection nebula as a lit volume of dust: reconstructed by Space Radar; the gas in front of the stars after Ritchey, Martinez & Federman 2006 (arXiv:astro-ph/0606644); the stars' places and magnitudes from SIMBAD (CDS); the phase function of Henyey & Greenstein 1941",
    "Its light: the photograph noao-m45, NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN (CC BY 4.0), the stars' halos subtracted by Space Radar"
  ]
};
