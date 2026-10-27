// GENERATED from registry/deepsky-heroes/ngc1300.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "ngc1300",
  "record": "dso-ngc-1300",
  "stage": "r14-neb-b",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "the structure: a smooth integrated-light layer (the disc, the long bar with its dust lanes on its leading edges, two arms from the bar's ends; the small bulge facing the camera), statistical points as sparkle, H II regions along the arms",
    "3": "the same, larger on screen",
    "points": [
      12000,
      40000,
      60000
    ],
    "dust_share": 0.3,
    "seed": 1300,
    "layer_power": 0.62,
    "layer_disc_at_rd": 0.15
  },
  "frame": {
    "pa_deg": 106.1,
    "incl_deg": 34,
    "near_side": null,
    "approaching": null,
    "winding": -1,
    "units_ly": 100,
    "source": "orientation: the S4G outer isophote (Salo et al. 2015); the inclination derived from its ellipticity with an assumed intrinsic thickness"
  },
  "layers": [
    {
      "kind": "bulge",
      "what": "a small disc-like bulge",
      "sersic_n": 1.1,
      "re_kpc": 0.4,
      "q": 0.8,
      "light": 0.073,
      "colour": "#fbe2c0",
      "source": "S4G decomposition (Salo et al. 2015, ApJS 219, 4; VizieR J/ApJS/219/4 table7): n = 1.106, Re = 4.34 arcsec (0.40 kpc here), 7.3 per cent of the light; q assumed"
    },
    {
      "kind": "bar",
      "shape": "ferrers",
      "what": "the long bar of old stars",
      "length_kpc": 6.83,
      "width_kpc": 2.0,
      "angle_deg": 7,
      "light": 0.12,
      "colour": "#f2cfa4",
      "source": "S4G table7: a Ferrers bar of semi-major axis 75 arcsec (6.83 kpc here), axis ratio 0.283 on the sky (its width deprojected to 2.3 kpc, drawn at 2.0), position angle 100.3 degrees, 6 per cent of the light at 3.6 microns (drawn at 12: in visible light the inner disc round it is swept dark, below); its angle in the disc derived from the two position angles; the inner disc is swept dark round it (below)"
    },
    {
      "kind": "disc",
      "what": "the stellar disc",
      "scale_kpc": 5.68,
      "height_kpc": 0.4,
      "r_max_kpc": 12.5,
      "inner_kpc": 6,
      "inner_floor": 0.05,
      "light": 0.2,
      "arm_contrast": 2,
      "colour": "#ecdcc8",
      "colour_outer": "#bcc6dc",
      "source": "S4G table7: the 3.6 micron exponential disc, scale length 62.3 arcsec (5.68 kpc here), 86.6 per cent of the light with the arms (their share below illustrative); height assumed; cut at 12.5 kpc, inside the catalogue's 6.2 arcmin, where the photographs' outer arms fade; thinned inside the bar's reach (inner_kpc, illustrative: the dark gaps the photographs show between the bar and the arms)"
    },
    {
      "kind": "arms",
      "what": "two arms from the bar's ends, blue with young stars",
      "count": 2,
      "pitch_deg": 15,
      "r_from_kpc": 6.0,
      "r_to_kpc": 15,
      "phase_deg": 4,
      "width_kpc": 0.65,
      "height_kpc": 0.2,
      "scale_kpc": 5,
      "segments": 1,
      "layer_contrast": 8,
      "light": 0.4,
      "colour": "#9fb8f0",
      "source": "illustrative: matched to Hubble's photograph (opo0501a): the arms leave the bar's ends and wind about half a turn to the outer pseudo-ring (R'), pitch about 15 degrees; the classification (R')SB(s)bc is de Vaucouleurs et al. 1991 (RC3)"
    },
    {
      "kind": "knots",
      "keep": true,
      "what": "H II regions and young clusters along the arms",
      "count": 600,
      "in_ring": 0,
      "size_kpc": 0.09,
      "height_kpc": 0.08,
      "light": 0.012,
      "colour": "#ffaccb",
      "source": "placed statistically along the arms; not a catalogue of positions"
    },
    {
      "kind": "dust-lanes",
      "what": "dust on the arms' inner edges",
      "inset_kpc": 0.3,
      "width_kpc": 0.2,
      "height_kpc": 0.08,
      "weight": 0.3,
      "source": "illustrative: the lanes Hubble's photograph shows along the arms' inner edges"
    },
    {
      "kind": "dust-bar",
      "what": "the dust lanes on the bar's leading edges",
      "offset_kpc": 1.25,
      "width_kpc": 0.18,
      "height_kpc": 0.06,
      "weight": 0.05,
      "strength": 1,
      "source": "illustrative: the two straight lanes every photograph of NGC 1300 shows along the bar, offset on its leading sides (as gas shocks in a bar are, Athanassoula 1992); Webb's 2024 picture (weic2403e) shows them in dust emission"
    },
    {
      "kind": "dust-disc",
      "what": "a thin dust disc",
      "scale_kpc": 5,
      "height_kpc": 0.1,
      "weight": 0.12,
      "source": "assumed"
    }
  ],
  "colours": {
    "mode": true,
    "note": "Display colours after Hubble's photograph (opo0501a, B, V, I and H-alpha): a warm yellow bar and bulge, blue arms of young stars, pink H II regions, brown dust lanes. Not enhanced."
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Salo et al. 2015, ApJS 219, 4 (arXiv:1503.06550), the S4G multi-component decompositions: VizieR J/ApJS/219/4 (tables `galaxies` and `table7`), read 2026-10-26",
    "de Vaucouleurs et al. 1991 (RC3): the classification (R')SB(s)bc",
    "ESA/Hubble opo0501a (NASA, ESA and The Hubble Heritage Team, STScI/AURA; CC BY 4.0): the arms' shape, the lanes and the nuclear spiral, by eye",
    "ESA/Webb weic2403e (NASA, ESA, CSA, STScI, J. Lee, T. Williams, PHANGS; CC BY 4.0): the bar's dust lanes in emission"
  ],
  "review": {
    "data_vs_model": "Measured: the bulge's, bar's and disc's profiles and light shares (S4G at 3.6 microns), the outer position angle and ellipticity, the distance. Model: the inclination (from the ellipticity), the arms' pitch and extent, the split of the disc's light into disc and arms, every dust lane, the near side.",
    "geometry": "PA 106.1, inclined 34 degrees (derived); the bar 7 degrees from the line of nodes in the disc (from S4G's two position angles); the near side assumed.",
    "colours": "Display values after Hubble's photograph; nothing enhanced.",
    "distance": "The record's: 61.3 Mly (18.8 Mpc).",
    "credits": "CREDITS.md section 3l, galaxies from their structure (0078 r14-neb-b).",
    "by": "Space Radar maintainers",
    "date": "2026-10-26"
  },
  "credits": [
    "NGC 1300's model: the bulge, the bar and the disc after the S4G decomposition (Salo et al. 2015, VizieR J/ApJS/219/4), the arms and lanes matched by eye to Hubble's photograph opo0501a (NASA, ESA and The Hubble Heritage Team, STScI/AURA; CC BY 4.0). Facts, cited; the model copies no image."
  ]
};
