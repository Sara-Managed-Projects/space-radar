// GENERATED from registry/lod.yaml by scripts/gen_lod_js.py. Do not edit.
//
// `python3 scripts/gen_lod_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// scene/lod.js reads these: for each rule, a smoothstep between from_km and to_km of the camera's
// distance from the Sun drives the named hook. The `why:` of each rule is in the YAML.

/** Level-of-detail rules, in file order. Each fades one scene hook between two camera distances from the Sun (km). */
export const LOD_RULES = [
  {
    "id": "sky-from-here",
    "what": "sky-panorama",
    "fade": "out",
    "from_km": 75000000000,
    "to_km": 750000000000
  }
];
