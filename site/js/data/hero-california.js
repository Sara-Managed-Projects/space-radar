// GENERATED from registry/deepsky-heroes/california.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "california",
  "record": "dso-california-nebula",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the glowing sheet at its reconstructed depth (12 coarse steps and an exact crossing; 8 on T0, or the sheet as a mesh), the dark lanes on it, and Xi Persei",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go along the sheet"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 1300,
    "ra_deg": 60.825,
    "dec_deg": 36.4217,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the sheet's light: the photograph without its stars",
      "picture": {
        "id": "california-nebula",
        "file": "site/images/nebulae/california-nebula.webp",
        "ra_deg": 60.23959,
        "dec_deg": 36.38382,
        "width_arcmin": 102.38,
        "height_arcmin": 152.24,
        "north_deg": 56.43
      },
      "file": "site/images/deep/nebulae/california-light.webp",
      "depth": "site/data/deep/california-front.bin",
      "made_by": "scripts/build_deep_emission.py",
      "credit": "KPNO/NOIRLab/NSF/AURA/Adam Block (noao-n1499block), CC BY 4.0",
      "note": "stars removed (they are drawn as stars); nothing else changed",
      "source": "NOIRLab noao-n1499block, credit KPNO/NOIRLab/NSF/AURA/Adam Block, CC BY 4.0: https://noirlab.edu/public/images/noao-n1499block/ (RCOS 16-inch telescope, Kitt Peak)"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the glowing sheet: a long, shallow trough of ionised hydrogen on the face of its cloud, lit by Xi Persei",
      "lobes": [
        {
          "name": "trough",
          "centre_west_arcmin": 0.0,
          "centre_north_arcmin": 0.0,
          "along_arcmin": 85.0,
          "across_arcmin": 26.0,
          "pa_deg": 125,
          "depth_ly": 8,
          "shape": "cos"
        }
      ],
      "blend_ly": 4,
      "outside_ly": 0,
      "relief": {
        "power": 0.5,
        "max_ln": 0.5,
        "max_ly": 3.0,
        "fine_arcmin": 1.0,
        "wide_arcmin": 8.0
      },
      "grid": [
        160,
        224
      ],
      "source": "Xi Persei is the nebula's ionising star (SIMBAD's O7.5III). Nothing measures the sheet's shape in depth: it is drawn as a shallow trough, illustrative, with its relief from the photograph's brightness"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the cloud behind the sheet: dark from behind",
      "thickness_ly": 4.0,
      "sigma_per_ly": 1.0,
      "blur_arcmin": 8.0,
      "source": "illustrative (a model)"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the dark lanes across the sheet: dust in front of the glowing gas",
      "z_ly": 5.0,
      "blobs": [
        {
          "name": "the lanes over the nebula",
          "centre_west_arcmin": 0.0,
          "centre_north_arcmin": 0.0,
          "along_arcmin": 80.0,
          "across_arcmin": 22.0,
          "pa_deg": 125
        }
      ],
      "tau_max": 0.8,
      "source": "the photograph's dark lanes inside the nebula; how far in front they are is not measured: drawn 5 ly in front of the sheet's plane"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "Xi Persei, the nebula's ionising star, at its catalogued place on the sky; its depth is not measured, so it stands in the sheet's plane",
      "stars": [
        {
          "id": "Xi Persei (Menkib, HD 24912)",
          "ra_deg": 59.74126012587458,
          "dec_deg": 35.79103042103805,
          "v_mag": 4.06,
          "spectral": "O7.5III(n)((f))",
          "temp_k": 35000
        }
      ],
      "note": "V as seen from here; its colour a blackbody's at the spectral type's temperature",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "no cluster: Xi Persei is a runaway, alone",
      "clusters": [],
      "source": "SIMBAD (no cluster round the star)"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (the page names no filters: hydrogen's red), with each exposure's stretch; the star a blackbody's",
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
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: Xi Persei's place, V magnitude and spectral type",
    "NOIRLab noao-n1499block (CC BY 4.0, credit KPNO/NOIRLab/NSF/AURA/Adam Block), the photograph the app showed: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the star's place and brightness, and the light (the photograph). Reconstructed: the sheet's trough and relief, the lanes' absorption from the photograph's darkness. Model: everything about its depth",
    "geometry": "A shallow trough, illustrative, and said so: no paper measures the California Nebula's shape in depth",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; the star by spectral type",
    "distance": "The record's 1 300 ly (site/data/dso.json). Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The California Nebula's sheet: reconstructed by Space Radar (illustrative depth)",
    "Its star Xi Persei: SIMBAD, CDS",
    "Its light: the photograph noao-n1499block, KPNO/NOIRLab/NSF/AURA/Adam Block (CC BY 4.0), its stars removed by Space Radar"
  ]
};
