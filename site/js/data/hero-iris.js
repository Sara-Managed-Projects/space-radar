// GENERATED from registry/deepsky-heroes/iris.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "iris",
  "record": "dso-iris-nebula",
  "stage": "W3-c",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: each layer one sheet over its picture (64 x 64 vertices; 32 on T0 and under the latch, 96 on T2), drawn far to near: the dust multiplies what is behind it, the glow adds",
    "3": "close-up: the same sheets; the camera may go between them"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 1300,
    "ra_deg": 315.3983,
    "dec_deg": 68.1694,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the scattered starlight: the photograph without its stars, and where the lanes hide it, the glow round it carried in (reconstructed)",
      "file": "site/images/deep/sheets/iris-light.webp",
      "from": "NOIRLab noao-ngc7023, the archive's 1280 px rendition (not in git: scripts/build_deep_sheets.py fetches it)",
      "image": "noao-ngc7023",
      "picture": {
        "ra_deg": 315.36888,
        "dec_deg": 68.11951,
        "width_arcmin": 24.0,
        "height_arcmin": 22.19,
        "north_deg": 30.3
      },
      "solved": {
        "moved_arcmin": 10.67,
        "correlation": 31.5,
        "mirror": 8.5,
        "as_published": 14.6
      },
      "published": {
        "ra_deg": 315.82675,
        "dec_deg": 68.06963,
        "width_arcmin": 24.0,
        "height_arcmin": 22.19,
        "north_deg": 29.8
      },
      "px": 512,
      "stars": {
        "above_median": 28,
        "grow_px": 2
      },
      "z_ly": 0,
      "half_ly": 0.3,
      "feather": [
        0.75,
        0.98
      ],
      "peak": 0.841,
      "made_by": "scripts/build_deep_sheets.py",
      "source": "T.A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA, noao-ngc7023, CC BY 4.0: https://noirlab.edu/public/images/noao-ngc7023/ (B, V, R and H-alpha, Mosaic I on the Mayall 4-metre, released 2020-06-30)"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "dark lanes in front of the lit walls, and the cloud behind them: dust that absorbs and reddens, never glows",
      "file": "site/images/deep/sheets/iris-dust.webp",
      "rule": {
        "envelope_arcmin": 1.0,
        "blur_arcmin": 0.5,
        "dark_below": 0.6,
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
        "z_ly": 0.35,
        "half_ly": 0.2
      },
      "back": {
        "z_ly": -0.8,
        "half_ly": 0.5
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
      "what": "HD 200775, the star that lights it, at its SIMBAD place, 0.5 ly in front of the lit walls (its depth is not measured). The catalogue's copy, at its own parallax distance 430 ly farther, steps aside while this one is drawn",
      "stars": [
        {
          "id": "HD 200775",
          "ra_deg": 315.40383573,
          "dec_deg": 68.16327488,
          "v_mag": 7.43,
          "b_v": 0.33,
          "spectral": "B2Ve",
          "temp_k": 20000,
          "z_ly": 0.5,
          "catalogue": true
        }
      ],
      "note": "V and B as seen from here, the dust's reddening included; its colour drawn from its spectral type's temperature",
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
    "NOIRLab noao-ngc7023 (CC BY 4.0), T.A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA: the light",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-17: HD 200775, B2Ve, V 7.43",
    "Gerin, M., Phillips, T. G., Keene, J., Betz, A. L. et al. 1998, CO, CI and CII observations of NGC 7023 (https://arxiv.org/abs/astro-ph/9802116): a cavity largely devoid of molecular gas round the star",
    "Henyey, L. G. & Greenstein, J. L. 1941, ApJ 93, 70: the phase function",
    "Cardelli, J. A., Clayton, G. C. & Mathis, J. S. 1989, ApJ 345, 245: the extinction law (R_V = 3.1)"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, the star's place, magnitude and type, the light (the photograph). Reconstructed: the sheet's depth, the lanes' optical depth (the rule), the light given back behind them. Modelled: the change of the scattered light with the view (g = 0.6). Illustrative: the cloud behind, the star's depth",
    "geometry": "The lit walls of a cavity with its star in front of them (Gerin et al. 1998); drawn as one sheet; the depths are illustrative and the card says so",
    "colours": "The photograph's own broadband colours; Deep declared enhanced; reddening by Cardelli, Clayton and Mathis's law",
    "distance": "1 300 ly, the record's; HD 200775's own Gaia parallax (2.82 mas) puts the star at about 1 160 ly. Lengths on the sky are scaled to the record's",
    "credits": "CREDITS.md section 3l, Remnants and dust (0076 W3-c); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-17",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Iris as a reflection sheet: reconstructed by Space Radar; HD 200775 from SIMBAD (CDS); the cavity: Gerin et al. 1998; the phase function of Henyey & Greenstein 1941; the extinction law of Cardelli, Clayton & Mathis 1989",
    "Its light: the photograph noao-ngc7023, T.A. Rector/University of Alaska Anchorage, H. Schweiker/WIYN and NOIRLab/NSF/AURA (CC BY 4.0), its stars removed by Space Radar"
  ]
};
