// GENERATED from registry/autopilot.yaml by scripts/gen_autopilot_js.py. Do not edit.
//
// `python3 scripts/gen_autopilot_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** Which reel `#ambient=1` plays, and the seconds ui/autopilotplan.js reads. */
export const AUTOPILOT = {
  "default": "lobby",
  "timing": {
    "title_s": 8,
    "gate_s": 10,
    "offer_s": 10,
    "idle_s": 120,
    "cursor_s": 3,
    "reload_h": 12
  }
};

/** The reels: trip ids in playing order. `minutes` is one lap with the voice, about. */
export const REELS = [
  {
    "id": "classroom-45",
    "title": "A lesson's worth",
    "blurb": "Twelve school favourites, from the living Earth to the edge of what we can see.",
    "minutes": 45,
    "sound": "ask",
    "trips": [
      "the-living-earth",
      "people-in-space",
      "satellites-and-junk",
      "moon-landings",
      "mars-where-we-have-driven",
      "a-year-in-a-minute",
      "outer-solar-system",
      "the-sun-today",
      "the-constellations",
      "life-of-a-star",
      "black-holes",
      "to-the-edge"
    ]
  },
  {
    "id": "lobby",
    "title": "For a lobby or a corridor",
    "blurb": "The most visual trips, good with no sound, round and round for as long as it is on.",
    "minutes": 50,
    "sound": "off",
    "trips": [
      "a-year-in-a-minute",
      "back-to-the-moon",
      "the-living-earth",
      "outer-solar-system",
      "the-constellations",
      "mars-where-we-have-driven",
      "the-sun-today",
      "to-the-edge",
      "moon-landings",
      "life-of-a-star",
      "birth-of-the-solar-system",
      "through-a-telescope",
      "asteroids-that-come-close",
      "travel-to-exoplanets"
    ]
  },
  {
    "id": "tonight",
    "title": "Tonight, from here",
    "blurb": "The trips that start from your own ground, for an evening at an observatory.",
    "minutes": 20,
    "sound": "ask",
    "place": true,
    "trips": [
      "tonight-from-your-street",
      "planets-tonight",
      "moon-phases",
      "a-dark-sky",
      "comets-and-meteors",
      "journey-to-the-station",
      "roof-to-the-edge"
    ]
  }
];
