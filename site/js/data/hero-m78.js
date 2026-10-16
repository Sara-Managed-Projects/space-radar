// GENERATED from registry/deepsky-heroes/m78.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m78",
  "record": "dso-m78",
  "stage": "W3-c",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: each layer one sheet over its picture (64 x 64 vertices; 32 on T0 and under the latch, 96 on T2), drawn far to near: the dust multiplies what is behind it, the glow adds",
    "3": "close-up: the same sheets; the camera may go between them"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 1600,
    "ra_deg": 86.69092,
    "dec_deg": 0.07931,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the scattered starlight: the photograph without its stars, and where the lanes hide it, the glow round it carried in (reconstructed)",
      "file": "site/images/deep/sheets/m78-light.webp",
      "from": "NOIRLab noao-m78, the archive's large JPEG (not in git: scripts/build_deep_sheets.py fetches it; the 1280 px rendition places it)",
      "image": "noao-m78",
      "crop": {
        "size_arcmin": 12,
        "of": {
          "ra_deg": 86.60659,
          "dec_deg": 0.09601,
          "width_arcmin": 35.78,
          "height_arcmin": 36.54,
          "north_deg": 0.0
        }
      },
      "picture": {
        "ra_deg": 86.69092,
        "dec_deg": 0.07931,
        "width_arcmin": 12,
        "height_arcmin": 12,
        "north_deg": 0.0
      },
      "solved": {
        "moved_arcmin": 7.82,
        "correlation": 38.0,
        "mirror": 5.1,
        "as_published": 29.9
      },
      "published": {
        "ra_deg": 86.50867,
        "dec_deg": 0.01008,
        "width_arcmin": 35.78,
        "height_arcmin": 36.54,
        "north_deg": -0.2
      },
      "px": 640,
      "stars": {
        "above_median": 28,
        "grow_px": 2
      },
      "z_ly": 0,
      "half_ly": 0.4,
      "feather": [
        0.75,
        0.98
      ],
      "made_by": "scripts/build_deep_sheets.py",
      "source": "T. A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA, noao-m78, CC BY 4.0: https://noirlab.edu/public/images/noao-m78/ (B, V, R and H-alpha, Mosaic I on the Mayall 4-metre, released 2006-08-09)"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "dark lanes in front of the lit dust, and the Orion B cloud behind it: dust that absorbs and reddens, never glows",
      "file": "site/images/deep/sheets/m78-dust.webp",
      "rule": {
        "envelope_arcmin": 0.8,
        "blur_arcmin": 0.4,
        "dark_below": 0.35,
        "cloud_below": 0,
        "cloud_tau": 0,
        "back_tau": 3.0,
        "back_from": 0.05
      },
      "tau_max": 4.0,
      "feather": [
        0.75,
        0.98
      ],
      "front": {
        "z_ly": 0.6,
        "half_ly": 0.3
      },
      "back": {
        "z_ly": -1.2,
        "half_ly": 0.8
      },
      "reddening": {
        "law": "Cardelli, Clayton & Mathis 1989",
        "rv": 3.1,
        "lambda_um": [
          0.61,
          0.55,
          0.45
        ]
      },
      "source": "The photograph's darkness against the glow round it (reconstructed by Space Radar, scripts/build_deep_sheets.py); the cloud behind it illustrative; the extinction law: Cardelli, Clayton & Mathis 1989, ApJ 345, 245"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "the star that lights it, at its SIMBAD place, 1 ly in front of the lit dust (its depth is not measured)",
      "stars": [
        {
          "id": "HD 38563",
          "ra_deg": 86.686075,
          "dec_deg": 0.0896611,
          "v_mag": 10.81,
          "b_v": 0.98,
          "spectral": "B2II-III",
          "temp_k": 20000,
          "z_ly": 1.0
        }
      ],
      "note": "V and B as seen from here, the dust's reddening included (B-V 0.98 for a B2 star); its colour drawn from its spectral type's temperature",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-17"
    },
    {
      "part": "scatter",
      "kind": "phase",
      "what": "how bright the scattered light is from another side: a Henyey-Greenstein phase function of the angle between the star, the dust and the eye, against the angle from here",
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
    "note": "The photograph's own colours: broadband B, V and R with H-alpha, close to what a camera sees; the stars behind the dust are reddened by the Cardelli, Clayton and Mathis law",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "lines": {},
      "note": "Deep: the photograph's Deep stretch (gamma 0.7, saturation 1.25, as scene/nebulae.js gives every photograph). Not what an eye sees"
    }
  },
  "drawn": [
    "reconstruction"
  ],
  "sources": [
    "NOIRLab noao-m78 (CC BY 4.0), T. A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA: the light",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-17: HD 38563, B2II-III, V 10.81",
    "Motte, F. et al. 2001, A SCUBA survey of the NGC 2068/2071 protoclusters, A&A (https://arxiv.org/abs/astro-ph/0105019): the region in the Orion B molecular cloud",
    "Henyey, L. G. & Greenstein, J. L. 1941, ApJ 93, 70: the phase function",
    "Cardelli, J. A., Clayton, G. C. & Mathis, J. S. 1989, ApJ 345, 245: the extinction law (R_V = 3.1)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the star's place, magnitude and type, the light (the photograph). Reconstructed: the sheet's depth, the lanes' optical depth (the rule), the light given back behind them. Modelled: the change of the scattered light with the view (g = 0.6). Illustrative: the cloud behind, the star's depth",
    "geometry": "A lit face on the near side of Orion B with its star in front; the depths are illustrative and the card says so",
    "colours": "The photograph's own broadband colours; Deep declared enhanced; reddening by Cardelli, Clayton and Mathis's law",
    "distance": "1 600 ly, the record's; lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-17",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "M78 as a reflection sheet: reconstructed by Space Radar; the star HD 38563 from SIMBAD (CDS); the phase function of Henyey & Greenstein 1941; the extinction law of Cardelli, Clayton & Mathis 1989",
    "Its light: the photograph noao-m78, T. A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA (CC BY 4.0), its stars removed by Space Radar"
  ]
};
