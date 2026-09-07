// GENERATED from registry/rockets.yaml by scripts/gen_rockets_js.py. Do not edit.
//
// `python3 scripts/gen_rockets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A row is a SILHOUETTE and never a photograph, and it carries its own provenance: `stands_for`
// says whether the drawing is that vehicle or its family, and the card prints that verbatim.
// The matching chain that turns a launch into one of these rows is hand-written next door in
// data/rocketmatch.js.

/** When registry/rockets.yaml was last measured against the live LL2 feed. */
export const ROCKETS_OBSERVED_ON = "2026-09-07";

/** Every drawable launch vehicle, most specific match first. */
export const ROCKETS = [
  {
    "id": "falcon-9",
    "display": "Falcon 9 Block 5",
    "match": {
      "full_name": [
        "Falcon 9 Block 5"
      ],
      "family": [
        "Falcon 9"
      ]
    },
    "stands_for": "variant",
    "height_m": 70.0,
    "core_dia_m": 3.66,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.2,
      "len_m": 13.2
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 9,
      "pattern": "octaweb"
    },
    "livery": {
      "body": "#EEF2F7",
      "interstage": "#1B1D21",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "falcon-heavy",
    "display": "Falcon Heavy",
    "match": {
      "full_name": [
        "Falcon Heavy"
      ]
    },
    "stands_for": "variant",
    "height_m": 70.0,
    "core_dia_m": 3.66,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.2,
      "len_m": 13.2
    },
    "boosters": {
      "shape": "liquid_core_clone",
      "count": 2,
      "dia_m": 3.66
    },
    "engines": {
      "count": 27,
      "pattern": "octaweb"
    },
    "livery": {
      "body": "#EEF2F7",
      "interstage": "#1B1D21",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "ariane-62",
    "display": "Ariane 62",
    "match": {
      "full_name": [
        "Ariane 62",
        "Ariane 62 Block 2"
      ]
    },
    "stands_for": "variant",
    "height_m": 63.0,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_fat",
      "count": 2,
      "dia_m": 3.4,
      "len_m": 22.0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": {
      "body": "#F4F6F8",
      "boosters": "unknown",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "ariane-64",
    "display": "Ariane 64",
    "match": {
      "full_name": [
        "Ariane 64",
        "Ariane 64 Block 2"
      ]
    },
    "stands_for": "variant",
    "height_m": 63.0,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_fat",
      "count": 4,
      "dia_m": 3.4,
      "len_m": 22.0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": {
      "body": "#F4F6F8",
      "boosters": "unknown",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "ariane-6",
    "display": "an Ariane 6",
    "match": {
      "family": [
        "Ariane 6",
        "Ariane"
      ]
    },
    "stands_for": "family",
    "height_m": 63.0,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_fat",
      "count": 2,
      "dia_m": 3.4,
      "len_m": 22.0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": {
      "body": "#F4F6F8",
      "boosters": "unknown",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "electron",
    "display": "Electron",
    "match": {
      "full_name": [
        "Electron"
      ]
    },
    "stands_for": "variant",
    "height_m": 18.0,
    "core_dia_m": 1.2,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 1.2,
      "len_m": 2.5
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 9,
      "pattern": "octaweb"
    },
    "livery": {
      "body": "#22262B",
      "class": "inferred"
    },
    "class": "measured"
  },
  {
    "id": "neutron",
    "display": "Neutron",
    "match": {
      "full_name": [
        "Neutron"
      ]
    },
    "stands_for": "variant",
    "height_m": 42.8,
    "core_dia_m": 7.0,
    "taper": "tapered",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 9,
      "pattern": "unknown"
    },
    "livery": {
      "body": "#22262B",
      "class": "inferred"
    },
    "disputed": "Wikipedia 42.8 m; Rocket Lab quotes a 7 m diameter and 40 m length for the tapered composite structure",
    "class": "measured"
  },
  {
    "id": "spectrum",
    "display": "Spectrum",
    "match": {
      "full_name": [
        "Spectrum"
      ]
    },
    "stands_for": "variant",
    "height_m": 28.0,
    "core_dia_m": 2.0,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 9,
      "pattern": "unknown"
    },
    "livery": {
      "body": "#22262B",
      "class": "inferred"
    },
    "class": "measured"
  },
  {
    "id": "starship",
    "display": "a Starship",
    "match": {
      "full_name": [
        "Starship",
        "Starship V3"
      ],
      "family": [
        "Starship"
      ]
    },
    "stands_for": "family",
    "height_m": 121.3,
    "core_dia_m": 9.0,
    "taper": "tube",
    "top": {
      "kind": "integrated_ship"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 33,
      "pattern": "dense_ring"
    },
    "livery": {
      "body": "#C6CBD1",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "soyuz-2",
    "display": "a Soyuz-2",
    "match": {
      "family": [
        "Soyuz 2",
        "Soyuz"
      ]
    },
    "stands_for": "family",
    "height_m": 46.3,
    "core_dia_m": 2.95,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 4.11,
      "len_m": 11.4
    },
    "boosters": {
      "shape": "liquid_conical",
      "count": 4,
      "dia_m": 2.68,
      "len_m": 19.6
    },
    "engines": {
      "count": 20,
      "pattern": "quad"
    },
    "livery": {
      "body": "#9AA3AD",
      "nose": "#EEF2F7",
      "tail": "#D2743A",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "vulcan",
    "display": "a Vulcan Centaur",
    "match": {
      "family": [
        "Vulcan"
      ]
    },
    "stands_for": "family",
    "height_m": 61.6,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 2,
      "dia_m": 1.6,
      "len_m": 21.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vulcan-vc2s",
    "display": "Vulcan VC2S",
    "match": {
      "full_name": [
        "Vulcan VC2S"
      ]
    },
    "stands_for": "variant",
    "height_m": 61.6,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 2,
      "dia_m": 1.6,
      "len_m": 21.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vulcan-vc4s",
    "display": "Vulcan VC4S",
    "match": {
      "full_name": [
        "Vulcan VC4S"
      ]
    },
    "stands_for": "variant",
    "height_m": 61.6,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 4,
      "dia_m": 1.6,
      "len_m": 21.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vulcan-vc4l",
    "display": "Vulcan VC4L",
    "match": {
      "full_name": [
        "Vulcan VC4L"
      ]
    },
    "stands_for": "variant",
    "height_m": 67.3,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4,
      "len_m": 21.3
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 4,
      "dia_m": 1.6,
      "len_m": 21.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vulcan-vc6l",
    "display": "Vulcan VC6L",
    "match": {
      "full_name": [
        "Vulcan VC6L"
      ]
    },
    "stands_for": "variant",
    "height_m": 67.3,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.4,
      "len_m": 21.3
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 6,
      "dia_m": 1.6,
      "len_m": 21.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vega-c",
    "display": "Vega-C",
    "match": {
      "full_name": [
        "Vega-C",
        "Vega-C Block 2"
      ]
    },
    "stands_for": "variant",
    "height_m": 34.8,
    "core_dia_m": 3.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 3.3
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "vega",
    "display": "a Vega",
    "match": {
      "family": [
        "Vega"
      ]
    },
    "stands_for": "family",
    "height_m": 34.8,
    "core_dia_m": 3.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 3.3
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "atlas-v",
    "display": "an Atlas V",
    "match": {
      "full_name": [
        "Atlas V N22"
      ],
      "family": [
        "Atlas V",
        "Atlas"
      ]
    },
    "stands_for": "family",
    "height_m": 58.3,
    "core_dia_m": 3.8,
    "taper": "tube",
    "top": {
      "kind": "capsule",
      "dia_m": 4.56
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 2,
      "dia_m": 1.6,
      "len_m": 17.0
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "inferred"
  },
  {
    "id": "h3",
    "display": "an H3",
    "match": {
      "family": [
        "H3"
      ]
    },
    "stands_for": "family",
    "height_m": 63.0,
    "core_dia_m": 5.27,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 2,
      "dia_m": 2.5,
      "len_m": 14.6
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": {
      "body": "#D2743A",
      "boosters": "#EEF2F7",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "h3-24",
    "display": "H3-24",
    "match": {
      "full_name": [
        "H3-24"
      ]
    },
    "stands_for": "variant",
    "height_m": 63.0,
    "core_dia_m": 5.27,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 4,
      "dia_m": 2.5,
      "len_m": 14.6
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": {
      "body": "#D2743A",
      "boosters": "#EEF2F7",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "sls",
    "display": "the Space Launch System",
    "match": {
      "family": [
        "Space Launch System"
      ]
    },
    "stands_for": "family",
    "height_m": 98.0,
    "core_dia_m": 8.4,
    "taper": "tube",
    "top": {
      "kind": "capsule_tower",
      "dia_m": 5.0
    },
    "boosters": {
      "shape": "solid_fat",
      "count": 2,
      "dia_m": 3.7,
      "len_m": 54.0
    },
    "engines": {
      "count": 4,
      "pattern": "quad"
    },
    "livery": {
      "body": "#D2743A",
      "boosters": "#EEF2F7",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "new-glenn",
    "display": "New Glenn",
    "match": {
      "full_name": [
        "New Glenn"
      ],
      "family": [
        "New Glenn"
      ]
    },
    "stands_for": "variant",
    "height_m": 98.0,
    "core_dia_m": 7.0,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 7,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "firefly-alpha",
    "display": "Firefly Alpha Block 2",
    "match": {
      "full_name": [
        "Firefly Alpha Block 2"
      ]
    },
    "stands_for": "variant",
    "height_m": 29.48,
    "core_dia_m": 2.2,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 2.2,
      "len_m": 5.0
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 4,
      "pattern": "quad"
    },
    "livery": {
      "body": "#EEF2F7",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "terran-r",
    "display": "Terran R",
    "match": {
      "full_name": [
        "Terran R"
      ],
      "family": [
        "Terran"
      ]
    },
    "stands_for": "variant",
    "height_m": 87.0,
    "core_dia_m": 5.4,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 13,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "pslv",
    "display": "a PSLV",
    "match": {
      "family": [
        "PSLV"
      ]
    },
    "stands_for": "family",
    "height_m": 44.0,
    "core_dia_m": 2.8,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 3.2
    },
    "boosters": {
      "shape": "solid_slim",
      "count": 6,
      "dia_m": 1.0,
      "len_m": 12.0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "pslv-ca",
    "display": "PSLV-CA",
    "match": {
      "full_name": [
        "PSLV-CA"
      ]
    },
    "stands_for": "variant",
    "height_m": 44.0,
    "core_dia_m": 2.8,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 3.2
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "gslv-mk2",
    "display": "GSLV Mk II",
    "match": {
      "full_name": [
        "GSLV Mk. II"
      ]
    },
    "stands_for": "variant",
    "height_m": 49.13,
    "core_dia_m": 2.8,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 3.4
    },
    "boosters": {
      "shape": "liquid_cylindrical",
      "count": 4,
      "dia_m": 2.1
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "lvm3",
    "display": "LVM3",
    "match": {
      "full_name": [
        "Launch Vehicle Mark-3 (GSLV Mk III)"
      ]
    },
    "stands_for": "variant",
    "height_m": 43.43,
    "core_dia_m": 4.0,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.0,
      "len_m": 10.75
    },
    "boosters": {
      "shape": "solid_fat",
      "count": 2,
      "dia_m": 3.2,
      "len_m": 25.0
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-2d",
    "display": "Long March 2D",
    "match": {
      "full_name": [
        "Long March 2D/YZ-3"
      ]
    },
    "stands_for": "variant",
    "height_m": 41.056,
    "core_dia_m": 3.35,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 4,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-2f",
    "display": "Long March 2F",
    "match": {
      "full_name": [
        "Long March 2F/G"
      ]
    },
    "stands_for": "variant",
    "height_m": 58.34,
    "core_dia_m": 3.35,
    "taper": "tube",
    "top": {
      "kind": "capsule_tower"
    },
    "boosters": {
      "shape": "liquid_cylindrical",
      "count": 4,
      "dia_m": 2.25,
      "len_m": 15.33
    },
    "engines": {
      "count": 8,
      "pattern": "quad"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-5",
    "display": "Long March 5",
    "match": {
      "full_name": [
        "Long March 5"
      ]
    },
    "stands_for": "variant",
    "height_m": 56.97,
    "core_dia_m": 5.0,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "liquid_cylindrical",
      "count": 4,
      "dia_m": 3.35,
      "len_m": 27.6
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-5b",
    "display": "Long March 5B",
    "match": {
      "full_name": [
        "Long March 5B"
      ]
    },
    "stands_for": "variant",
    "height_m": 53.66,
    "core_dia_m": 5.0,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "liquid_cylindrical",
      "count": 4,
      "dia_m": 3.35,
      "len_m": 27.6
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-8a",
    "display": "Long March 8A",
    "match": {
      "full_name": [
        "Long March 8A"
      ],
      "family": [
        "Long March 8"
      ]
    },
    "stands_for": "variant",
    "height_m": 50.5,
    "core_dia_m": 3.35,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.2
    },
    "boosters": {
      "shape": "liquid_cylindrical",
      "count": 2,
      "dia_m": 2.25,
      "len_m": 26.9
    },
    "engines": {
      "count": 2,
      "pattern": "twin"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-10",
    "display": "Long March 10",
    "match": {
      "full_name": [
        "Long March 10"
      ]
    },
    "stands_for": "variant",
    "height_m": 92.5,
    "core_dia_m": 5.0,
    "taper": "tube",
    "top": {
      "kind": "capsule_tower",
      "dia_m": 5.0
    },
    "boosters": {
      "shape": "liquid_core_clone",
      "count": 2,
      "dia_m": 5.0
    },
    "engines": {
      "count": 21,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "long-march-12a",
    "display": "Long March 12A",
    "match": {
      "full_name": [
        "Long March 12A"
      ],
      "family": [
        "Long March 12"
      ]
    },
    "stands_for": "variant",
    "height_m": 69.0,
    "core_dia_m": 3.8,
    "taper": "hammerhead",
    "top": {
      "kind": "fairing",
      "dia_m": 4.2
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 7,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "disputed": "Wikipedia about 69 m with the 4.2 m fairing; SpaceNews 70.4 m",
    "class": "measured"
  },
  {
    "id": "nuri",
    "display": "Nuri",
    "match": {
      "full_name": [
        "KSLV-2 Nuri"
      ],
      "family": [
        "KSLV"
      ]
    },
    "stands_for": "variant",
    "height_m": 47.2,
    "core_dia_m": 3.5,
    "taper": "stepped",
    "sections": [
      {
        "dia_m": 3.5
      },
      {
        "dia_m": 2.6
      }
    ],
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 4,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "disputed": "Wikipedia 3.5 m first stage; Gunter's Space Page 3.3 m",
    "class": "measured"
  },
  {
    "id": "themis",
    "display": "the Themis demonstrator",
    "match": {
      "full_name": [
        "Themis Demonstrator"
      ]
    },
    "stands_for": "variant",
    "height_m": 28.0,
    "core_dia_m": 3.5,
    "taper": "tube",
    "top": {
      "kind": "none"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "disputed": "ESA 28 m; ArianeGroup 30 m standing on its legs",
    "class": "measured"
  },
  {
    "id": "hanbit-nano",
    "display": "HANBIT-Nano",
    "match": {
      "full_name": [
        "HANBIT-Nano"
      ],
      "family": [
        "HANBIT"
      ]
    },
    "stands_for": "variant",
    "height_m": 21.8,
    "core_dia_m": 1.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 1.4
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "angara-12",
    "display": "Angara 1.2",
    "match": {
      "full_name": [
        "Angara 1.2"
      ],
      "family": [
        "Angara 1.2",
        "Angara"
      ]
    },
    "stands_for": "variant",
    "height_m": 41.5,
    "core_dia_m": 2.9,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "minotaur-iv",
    "display": "Minotaur IV",
    "match": {
      "full_name": [
        "Minotaur IV"
      ],
      "family": [
        "Minotaur"
      ]
    },
    "stands_for": "variant",
    "height_m": 23.88,
    "core_dia_m": 2.34,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 2.34
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "delta-iv-heavy",
    "display": "Delta IV Heavy",
    "match": {
      "full_name": [
        "Delta IV Heavy"
      ]
    },
    "stands_for": "variant",
    "height_m": 70.7,
    "core_dia_m": 5.1,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 5.0,
      "len_m": 12.0
    },
    "boosters": {
      "shape": "liquid_core_clone",
      "count": 2,
      "dia_m": 5.1,
      "len_m": 40.8
    },
    "engines": {
      "count": 3,
      "pattern": "single"
    },
    "livery": {
      "body": "#C96A2E",
      "class": "measured"
    },
    "class": "measured"
  },
  {
    "id": "proton-m",
    "display": "Proton-M",
    "match": {
      "full_name": [
        "Proton-M"
      ]
    },
    "stands_for": "variant",
    "height_m": 58.2,
    "core_dia_m": 4.1,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 4.35
    },
    "boosters": {
      "shape": "flared_base",
      "count": 6,
      "dia_m": 1.65
    },
    "engines": {
      "count": 6,
      "pattern": "ring"
    },
    "livery": "unknown",
    "class": "inferred"
  },
  {
    "id": "angara-a5",
    "display": "Angara A5",
    "match": {
      "full_name": [
        "Angara A5"
      ]
    },
    "stands_for": "variant",
    "height_m": 55.4,
    "core_dia_m": 2.9,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "liquid_core_clone",
      "count": 4,
      "dia_m": 2.9
    },
    "engines": {
      "count": 5,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "zhuque-2e",
    "display": "Zhuque-2E",
    "match": {
      "full_name": [
        "Zhuque-2E"
      ]
    },
    "stands_for": "variant",
    "height_m": 55.9,
    "core_dia_m": 3.35,
    "taper": "hammerhead",
    "top": {
      "kind": "fairing",
      "dia_m": 4.2
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 4,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "gravity-1",
    "display": "Gravity-1",
    "match": {
      "full_name": [
        "Gravity-1"
      ]
    },
    "stands_for": "variant",
    "height_m": 29.4,
    "core_dia_m": 2.65,
    "taper": "hammerhead",
    "top": {
      "kind": "fairing",
      "dia_m": 4.2
    },
    "boosters": {
      "shape": "solid_clustered",
      "count": 4,
      "dia_m": 1.4
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "inferred"
  },
  {
    "id": "kinetica-1",
    "display": "Kinetica-1",
    "match": {
      "full_name": [
        "Kinetica-1"
      ]
    },
    "stands_for": "variant",
    "height_m": 29.7,
    "core_dia_m": 2.65,
    "taper": "tube",
    "top": {
      "kind": "fairing"
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "kuaizhou-1a",
    "display": "Kuaizhou-1A",
    "match": {
      "full_name": [
        "Kuaizhou-1A"
      ]
    },
    "stands_for": "variant",
    "height_m": 19.4,
    "core_dia_m": 1.4,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 1.4
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "minotaur-i",
    "display": "Minotaur I",
    "match": {
      "full_name": [
        "Minotaur I"
      ]
    },
    "stands_for": "variant",
    "height_m": 19.21,
    "core_dia_m": 1.67,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 1.67
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "single"
    },
    "livery": "unknown",
    "class": "measured"
  },
  {
    "id": "small-commercial-orbital",
    "display": "a small commercial launcher",
    "match": {
      "provider": [
        "Orbex",
        "Skyrora",
        "HyImpulse",
        "Latitude",
        "Gilmour Space Technologies",
        "Rocket Factory Augsburg",
        "Interstellar Technologies",
        "Agency for Defense Development"
      ]
    },
    "stands_for": "family",
    "height_m": 20.0,
    "core_dia_m": 1.5,
    "taper": "tube",
    "top": {
      "kind": "fairing",
      "dia_m": 1.5
    },
    "boosters": {
      "shape": "none",
      "count": 0
    },
    "engines": {
      "count": 1,
      "pattern": "unknown"
    },
    "livery": "unknown",
    "class": "inferred"
  }
];
