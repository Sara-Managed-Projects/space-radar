// GENERATED from registry/deepsky-heroes/cats-paw.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "cats-paw",
  "record": "dso-cats-paw-nebula",
  "stage": "r14-neb-a",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "structure: the bubbles' far halves and near caps as crisp lit sheets (12 coarse steps and an exact crossing each; 8 on T0, or two meshes), the filament's cloud behind, its dark lanes in front, the visible O stars",
    "3": "close-up: the same with half the coordinator's march steps (12 to 32); the camera may go into a bubble"
  },
  "frame": {
    "units_ly": 1,
    "distance_ly": 4370,
    "ra_deg": 260.2121,
    "dec_deg": -36.115,
    "axes": "x west, y north, z toward the Sun; the record's place at the origin"
  },
  "layers": [
    {
      "part": "light",
      "kind": "photograph",
      "what": "the walls' light: the photograph without its stars",
      "picture": {
        "id": "cats-paw-nebula",
        "file": "site/images/nebulae/cats-paw-nebula.webp",
        "ra_deg": 260.03917,
        "dec_deg": -35.94911,
        "width_arcmin": 30.71,
        "height_arcmin": 31.91,
        "north_deg": 0.1
      },
      "file": "site/images/deep/nebulae/cats-paw-light.webp",
      "depth": "site/data/deep/cats-paw-front.bin",
      "made_by": "scripts/build_deep_emission.py",
      "credit": "ESO (eso1003a), CC BY 4.0",
      "note": "stars removed (they are drawn as stars); nothing else changed",
      "source": "ESO eso1003a, credit ESO, CC BY 4.0: https://www.eso.org/public/images/eso1003a/ (MPG/ESO 2.2-metre telescope, WFI; B, V and R with H-alpha)"
    },
    {
      "part": "front",
      "kind": "front",
      "what": "the pads: H II bubbles along the filament, each a far half and a near cap of glowing gas",
      "lobes": [
        {
          "name": "south-east pad",
          "centre_west_arcmin": 0.5,
          "centre_north_arcmin": 2.0,
          "along_arcmin": 5.0,
          "across_arcmin": 4.5,
          "pa_deg": 0,
          "depth_ly": 6,
          "shape": "cos"
        },
        {
          "name": "south-west pad",
          "centre_west_arcmin": 12.0,
          "centre_north_arcmin": 0.5,
          "along_arcmin": 4.8,
          "across_arcmin": 4.6,
          "pa_deg": 0,
          "depth_ly": 6,
          "shape": "cos"
        },
        {
          "name": "northern pad",
          "centre_west_arcmin": 0.5,
          "centre_north_arcmin": 15.5,
          "along_arcmin": 4.0,
          "across_arcmin": 3.5,
          "pa_deg": 0,
          "depth_ly": 5,
          "shape": "cos"
        },
        {
          "name": "the heart",
          "centre_west_arcmin": 8.0,
          "centre_north_arcmin": 9.5,
          "along_arcmin": 2.2,
          "across_arcmin": 1.8,
          "pa_deg": 0,
          "depth_ly": 3,
          "shape": "cos"
        },
        {
          "name": "north-western lobe",
          "centre_west_arcmin": 6.5,
          "centre_north_arcmin": 19.0,
          "along_arcmin": 5.0,
          "across_arcmin": 3.0,
          "pa_deg": 20,
          "depth_ly": 5,
          "shape": "cos"
        }
      ],
      "blend_ly": 2,
      "outside_ly": -1,
      "near": {
        "share": 0.35,
        "caps": [
          {
            "name": "south-east pad",
            "centre_west_arcmin": 0.5,
            "centre_north_arcmin": 2.0,
            "along_arcmin": 5.0,
            "across_arcmin": 4.5,
            "pa_deg": 0,
            "height_ly": 5,
            "shape": "cos"
          },
          {
            "name": "south-west pad",
            "centre_west_arcmin": 12.0,
            "centre_north_arcmin": 0.5,
            "along_arcmin": 4.8,
            "across_arcmin": 4.6,
            "pa_deg": 0,
            "height_ly": 5,
            "shape": "cos"
          },
          {
            "name": "northern pad",
            "centre_west_arcmin": 0.5,
            "centre_north_arcmin": 15.5,
            "along_arcmin": 4.0,
            "across_arcmin": 3.5,
            "pa_deg": 0,
            "height_ly": 4,
            "shape": "cos"
          }
        ]
      },
      "relief": {
        "power": 0.5,
        "max_ln": 0.4,
        "max_ly": 1.5,
        "fine_arcmin": 0.3,
        "wide_arcmin": 2.0
      },
      "grid": [
        192,
        200
      ],
      "source": "Arzoumanian, D. et al. 2022, A&A 660, A56 (arXiv:2201.04267: 'the 50 pc-long NGC 6334 filamentary cloud', organised with 'ionized (HII) bubbles' whose expansion shapes it). The bubbles' sizes are read from the photograph; their depths are illustrative"
    },
    {
      "part": "cloud",
      "kind": "dust",
      "what": "the filament's molecular gas behind the bubbles: dark from behind",
      "thickness_ly": 6.0,
      "sigma_per_ly": 1.5,
      "blur_arcmin": 2.0,
      "source": "Arzoumanian et al. 2022 (the filament); its thickness and opacity here are illustrative"
    },
    {
      "part": "dust",
      "kind": "dust",
      "what": "the filament's dark lanes across the paw: dust in front of the glowing gas",
      "z_ly": 6.5,
      "blobs": [
        {
          "name": "the heart's dark wedge",
          "centre_west_arcmin": 8.5,
          "centre_north_arcmin": 9.0,
          "along_arcmin": 2.4,
          "across_arcmin": 1.6,
          "pa_deg": 30
        },
        {
          "name": "the lane along the filament",
          "centre_west_arcmin": 4.0,
          "centre_north_arcmin": 10.0,
          "along_arcmin": 14.0,
          "across_arcmin": 4.0,
          "pa_deg": 20
        }
      ],
      "tau_max": 1.0,
      "source": "the photograph's dark lanes along the filament; how far in front they are is not measured: drawn just in front of the near caps"
    },
    {
      "part": "stars",
      "kind": "stars",
      "what": "the region's visible O stars at their catalogued places on the sky; their depths are not measured, so they stand in one plane",
      "stars": [
        {
          "id": "HD 156738",
          "ra_deg": 260.21940920584,
          "dec_deg": -36.07237937569,
          "v_mag": 9.35,
          "spectral": "O6.5III(f)",
          "temp_k": 37000
        },
        {
          "id": "HD 319699",
          "ra_deg": 259.87674090844,
          "dec_deg": -35.71003391785,
          "v_mag": 9.63,
          "spectral": "O5V((fc))",
          "temp_k": 41000
        },
        {
          "id": "HD 319702",
          "ra_deg": 260.21088666986,
          "dec_deg": -35.86278717672,
          "v_mag": 10.11,
          "spectral": "O8III",
          "temp_k": 33000
        },
        {
          "id": "HD 319703",
          "ra_deg": 259.94234995517,
          "dec_deg": -36.09787151618,
          "v_mag": 10.92,
          "spectral": "O7V((f))z",
          "temp_k": 36000
        }
      ],
      "note": "V as seen from here, its heavy extinction included; colours a blackbody's at the spectral type's temperature",
      "source": "SIMBAD (CDS), basic and allfluxes tables, read 2026-10-26"
    },
    {
      "part": "clusters",
      "kind": "points",
      "what": "no cluster drawn: the filament's young stars are deeply embedded",
      "clusters": [],
      "source": "Arzoumanian et al. 2022"
    }
  ],
  "colours": {
    "mode": true,
    "lines": {
      "star": "#cfdcff"
    },
    "note": "The gas's colours are the photograph's own (B, V and R with H-alpha: hydrogen's deep red), with each exposure's stretch; the stars a blackbody's",
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
    "Arzoumanian, D., Russeil, D., Zavagno, A. et al. 2022, Velocity structure of the 50 pc-long NGC 6334 filamentary cloud, A&A 660, A56 (https://arxiv.org/abs/2201.04267)",
    "SIMBAD (CDS, https://simbad.cds.unistra.fr/), read 2026-10-26: the O stars' places, V magnitudes and spectral types",
    "ESO eso1003a (CC BY 4.0, credit ESO), the photograph the app showed: the hero's LIGHT (its stars removed)"
  ],
  "review": {
    "data_vs_model": "Measured: the filament and its H II bubbles, the stars' places and magnitudes, and the light (the photograph). Reconstructed: each bubble's far half and near cap, the lanes' absorption from the photograph's darkness. Model: the depths, the cloud behind",
    "geometry": "Bubbles along the filament after Arzoumanian et al. 2022: their sizes read from the photograph, their depths illustrative, and said so",
    "colours": "The photograph's own, with each exposure's stretch; Deep declared enhanced; stars by spectral type",
    "distance": "The record's 4 370 ly (site/data/dso.json; 1.34 kpc). Lengths on the sky are scaled to it",
    "credits": "CREDITS.md section 3l, Emission nebulae (0078 r14-neb-a); the card's rows name the reconstruction and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-26",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The Cat's Paw Nebula's shape: after Arzoumanian et al. 2022, A&A 660, A56; reconstructed by Space Radar",
    "Its stars: SIMBAD, CDS",
    "Its light: the photograph eso1003a, ESO (CC BY 4.0), its stars removed by Space Radar"
  ]
};
