// GENERATED from registry/models.yaml by scripts/gen_model_frames_js.py. Do not edit.
//
// `python3 scripts/gen_model_frames_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the row's `attitude:` in the YAML.

/** Each file's own axes and the law it is flown by, where its row states them (scene/attitude.js; a file not here keeps the seeded constant angle). */
export const MODEL_FRAMES = {
  "aqua.glb": {
    "law": "nadir",
    "face": "+z",
    "panel": "y",
    "cells": "+x"
  },
  "cassini.glb": {
    "law": "earth",
    "face": "+y",
    "panel": "z"
  },
  "chandra.glb": {
    "law": "sun",
    "face": "-y",
    "panel": "-x"
  },
  "dawn.glb": {
    "law": "sun",
    "face": "+z",
    "panel": "x"
  },
  "galileo.glb": {
    "law": "earth",
    "face": "+z",
    "panel": "y"
  },
  "goes.glb": {
    "law": "geo",
    "face": "+y",
    "panel": "x"
  },
  "hubble.glb": {
    "law": "sun",
    "face": "+z",
    "panel": "+y"
  },
  "iss.glb": {
    "law": "lvlh",
    "face": "-y",
    "panel": "-x"
  },
  "juno.glb": {
    "law": "spin",
    "face": "+y",
    "panel": "x"
  },
  "jwst.glb": {
    "law": "sun",
    "face": "-y",
    "panel": "+z"
  },
  "kepler.glb": {
    "law": "sun",
    "face": "-x",
    "panel": "+y"
  },
  "landsat8.glb": {
    "law": "nadir",
    "face": "+x",
    "panel": [
      0,
      -1,
      1
    ]
  },
  "lro.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "maven.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "mro.glb": {
    "law": "nadir",
    "face": "+z",
    "panel": "x",
    "cells": "-y"
  },
  "near.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "odyssey.glb": {
    "law": "sun",
    "face": "+z",
    "panel": "x"
  },
  "osiris-rex.glb": {
    "law": "sun",
    "face": "-y",
    "panel": "z"
  },
  "parker.glb": {
    "law": "sun",
    "face": "-z",
    "panel": "x"
  },
  "pioneer.glb": {
    "law": "spin",
    "face": "-z",
    "panel": "x",
    "spinS": 12.5
  },
  "roman.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "-x"
  },
  "rosetta.glb": {
    "law": "sun",
    "face": "+z",
    "panel": "x"
  },
  "sdo.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "soho.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "spitzer.glb": {
    "law": "sun",
    "face": "-z",
    "panel": "+y"
  },
  "stardust.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "z"
  },
  "stereo.glb": {
    "law": "sun",
    "face": "+y",
    "panel": "x"
  },
  "tdrs.glb": {
    "law": "geo",
    "face": "+y",
    "panel": "x"
  },
  "terra.glb": {
    "law": "nadir",
    "face": "-y",
    "panel": "z"
  },
  "voyager.glb": {
    "law": "earth",
    "face": "+y",
    "panel": "z"
  }
};
