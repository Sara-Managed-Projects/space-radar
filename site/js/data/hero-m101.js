// GENERATED from registry/deepsky-heroes/m101.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "m101",
  "record": "dso-m101",
  "stage": "W3-f",
  "shipped": true,
  "children": [],
  "levels": {
    "2": "the structure: a smooth integrated-light layer (a large disc, several arms in segments, dust lanes; a small bulge facing the camera), statistical points as sparkle, its five giant H II regions where the sky puts them",
    "3": "the same, larger on screen",
    "points": [
      14000,
      50000,
      80000
    ],
    "dust_share": 0.25,
    "seed": 101
  },
  "frame": {
    "pa_deg": 39,
    "incl_deg": 18,
    "near_side": "NW",
    "approaching": "SW",
    "units_ly": 100,
    "source": "orientation: Bosma et al. 1981 via Walter et al. 2008; the approaching half from the THINGS velocity map; the near side derived"
  },
  "layers": [
    {
      "kind": "bulge",
      "what": "a small central bulge",
      "sersic_n": 1.5,
      "re_kpc": 0.4,
      "q": 0.9,
      "light": 0.04,
      "colour": "#f4e8de",
      "source": "illustrative: M101 is an Scd galaxy with little bulge; n and Re not read from a decomposition"
    },
    {
      "kind": "disc",
      "what": "the stellar disc",
      "scale_kpc": 3.92,
      "height_kpc": 0.4,
      "r_max_kpc": 26,
      "light": 0.58,
      "arm_contrast": 0.35,
      "colour": "#e0d8d2",
      "colour_outer": "#d2d4e0",
      "source": "S4G (Salo et al. 2015; VizieR J/ApJS/219/4): the 3.6 micron scale length 127.3 arcsec (3.92 kpc here); Mihos et al. 2013 (arXiv:1211.3095): 2.42 arcmin in B, 1.9 to 3.4 by direction (lopsided, not drawn); height assumed; cut at 26 kpc"
    },
    {
      "kind": "arms",
      "what": "several arms of young stars, in segments",
      "count": 4,
      "pitch_deg": 20,
      "r_from_kpc": 2,
      "r_to_kpc": 22,
      "width_kpc": 0.7,
      "height_kpc": 0.15,
      "scale_kpc": 8,
      "segments": 0.65,
      "light": 0.25,
      "colour": "#b8c8f4",
      "source": "a multiple-armed spiral (class M): the S4G arm catalogue's six segments have pitches 7 to 29 degrees (mean 19); four arms and 20 degrees illustrative; the light's share illustrative"
    },
    {
      "kind": "knots",
      "what": "H II regions along the arms",
      "count": 1100,
      "in_ring": 0,
      "size_kpc": 0.06,
      "height_kpc": 0.06,
      "light": 0.08,
      "colour": "#ff8fa4",
      "source": "placed statistically along the arms; not a catalogue of positions"
    },
    {
      "kind": "landmark",
      "name": "NGC 5461",
      "what": "NGC 5461, a giant H II region",
      "ra_deg": 210.92067,
      "dec_deg": 54.31733,
      "radius_kpc": 0.3,
      "size_kpc": 0.04,
      "count": 60,
      "light": 0.003,
      "colour": "#ff9aac",
      "source": "SIMBAD, NGC 5461: ICRS 14 03 40.96 +54 19 02.4 (read 2026-10-20); placed where that line of sight meets the disc; its size illustrative"
    },
    {
      "kind": "landmark",
      "name": "NGC 5462",
      "what": "NGC 5462, a giant H II region",
      "ra_deg": 210.97125,
      "dec_deg": 54.36847,
      "radius_kpc": 0.3,
      "size_kpc": 0.04,
      "count": 50,
      "light": 0.0025,
      "colour": "#ff9aac",
      "source": "SIMBAD, NGC 5462: ICRS 14 03 53.10 +54 22 06.5 (read 2026-10-20); size illustrative"
    },
    {
      "kind": "landmark",
      "name": "NGC 5447",
      "what": "NGC 5447, a giant H II region",
      "ra_deg": 210.61667,
      "dec_deg": 54.27611,
      "radius_kpc": 0.3,
      "size_kpc": 0.04,
      "count": 50,
      "light": 0.0025,
      "colour": "#ff9aac",
      "source": "SIMBAD, NGC 5447: ICRS 14 02 28.0 +54 16 34 (read 2026-10-20); size illustrative"
    },
    {
      "kind": "landmark",
      "name": "NGC 5471",
      "what": "NGC 5471, a giant H II region far out",
      "ra_deg": 211.11928,
      "dec_deg": 54.39801,
      "radius_kpc": 0.35,
      "size_kpc": 0.04,
      "count": 60,
      "light": 0.003,
      "colour": "#ff9aac",
      "source": "SIMBAD, NGC 5471: ICRS 14 04 28.63 +54 23 52.8, 1.1 x 0.85 arcmin (read 2026-10-20); size illustrative"
    },
    {
      "kind": "landmark",
      "name": "NGC 5455",
      "what": "NGC 5455, a giant H II region",
      "ra_deg": 210.75488,
      "dec_deg": 54.2415,
      "radius_kpc": 0.25,
      "size_kpc": 0.04,
      "count": 40,
      "light": 0.002,
      "colour": "#ff9aac",
      "source": "SIMBAD, NGC 5455: ICRS 14 03 01.17 +54 14 29.4 (read 2026-10-20); size illustrative"
    },
    {
      "kind": "dust-lanes",
      "what": "dust along the arms",
      "inset_kpc": 0.3,
      "width_kpc": 0.3,
      "height_kpc": 0.07,
      "weight": 0.6,
      "source": "illustrative"
    },
    {
      "kind": "dust-disc",
      "what": "a thin dust disc",
      "scale_kpc": 5,
      "height_kpc": 0.08,
      "weight": 0.3,
      "source": "assumed"
    }
  ],
  "colours": {
    "mode": true,
    "note": "Matched to its photograph at the hand-over (heic0602a, B, V, I): mean colours measured 2026-10-20 core #eddaca, inner disc #8d807a, outer #383639; the model takes them halfway to neutral (bulge #f4e8de, disc #e0d8d2 to #d2d4e0), arms blue-white, pink H II regions. Not enhanced."
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Walter et al. 2008, AJ 136, 2563 (arXiv:0810.2125): THINGS, NGC 5457 i = 18, PA = 39 degrees (after Bosma, Goss & Allen 1981), and the velocity map",
    "Salo et al. 2015, ApJS 219, 4 (S4G; VizieR J/ApJS/219/4): the disc's scale length; Herrera-Endoqui et al. 2015, A&A 582, A86 (S4G arm catalogue, VizieR J/A+A/582/A86): the arms' pitches",
    "Mihos et al. 2013 (arXiv:1211.3095): the B-band disc and its lopsidedness",
    "SIMBAD (CDS): NGC 5447, 5455, 5461, 5462 and 5471, read 2026-10-20"
  ],
  "review": {
    "data_vs_model": "A parametric model: the orientation, the disc's scale length, the arms' pitch range and five giant H II regions' places are published; the bulge, the arm count, the knots' places, the thicknesses and the light shares are ours, labelled. Its lopsidedness (Mihos et al. 2013) is not drawn.",
    "geometry": "pa 39 / incl 18 (nearly face on), SW approaching (THINGS); the near side derived from the arms' sense, low confidence.",
    "colours": "Display values matched to the photograph's mean colours, halved toward neutral (colours.note); nothing enhanced.",
    "distance": "The record's: 20.75 Mly (19.1 to 22.4), the Messier table's.",
    "credits": "CREDITS.md section 3l, galaxies from their structure (0077 W3-f).",
    "by": "Space Radar maintainers",
    "date": "2026-10-20"
  },
  "credits": [
    "M101's model: orientation after Bosma et al. 1981 as THINGS (Walter et al. 2008) gives it, the disc after S4G (Salo et al. 2015) and Mihos et al. 2013, the arms' pitches after the S4G arm catalogue; five giant H II regions' places from SIMBAD (CDS). Facts, cited; no image or data file is copied."
  ]
};
