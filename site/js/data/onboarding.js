// GENERATED from registry/onboarding.yaml by scripts/gen_onboarding_js.py. Do not edit.
//
// `python3 scripts/gen_onboarding_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML (its head says how the tour is kept).

/** The tour's steps, in order. `hooks` are `data-tour` names: the first one on screen is the target. */
export const STEPS = [
  {
    "id": "move",
    "teaches": "scene",
    "hooks": [
      "scene"
    ],
    "look": "scene",
    "say": "This is everything in space, where it is right now.",
    "ask": "Drag to turn it. Scroll or pinch to come closer.",
    "awaits": "camera",
    "then": "next"
  },
  {
    "id": "find",
    "teaches": "search",
    "hooks": [
      "search"
    ],
    "say": "Every dot is a real thing, and each has a name.",
    "ask": "Press a dot, or type a name here and choose it.",
    "awaits": "select",
    "then": "next",
    "prepare": [
      "home"
    ]
  },
  {
    "id": "card",
    "teaches": "card",
    "hooks": [
      "card-actions",
      "card"
    ],
    "say": "Its card says what it is and where it is now.",
    "ask": "Try an action: follow it, or ride along with it.",
    "awaits": "press",
    "then": "next",
    "prepare": [
      "card",
      "sheet"
    ]
  },
  {
    "id": "time",
    "teaches": "time",
    "hooks": [
      "time"
    ],
    "say": "The clock is live, and the timeline goes to any other day.",
    "ask": "Drag the timeline. Live comes back to now.",
    "awaits": "press",
    "then": "wait",
    "prepare": [
      "peek"
    ]
  },
  {
    "id": "places",
    "teaches": "views",
    "hooks": [
      "tabs"
    ],
    "say": "Four views: near Earth, the planets, the stars, tonight.",
    "ask": "Open one: Planets, Stars or Tonight.",
    "awaits": "press",
    "then": "next",
    "prepare": [
      "home",
      "sheet"
    ]
  },
  {
    "id": "layers",
    "teaches": "layers",
    "hooks": [
      "layers"
    ],
    "say": "What to show holds every layer: satellites, weather, stars.",
    "ask": "Open it and switch a layer on.",
    "awaits": "press",
    "then": "wait"
  },
  {
    "id": "share",
    "teaches": "share",
    "hooks": [
      "share",
      "more"
    ],
    "say": "Share sends this exact view: a link, a postcard, a picture.",
    "ask": "Open Share.",
    "awaits": "press",
    "then": "wait"
  },
  {
    "id": "drift",
    "teaches": "drift",
    "hooks": [
      "drift"
    ],
    "say": "Play on its own lets the map wander, from thing to thing.",
    "ask": "Press it to see Drift, which flies until you take over.",
    "awaits": "press",
    "then": "wait",
    "prepare": [
      "home",
      "sheet"
    ]
  },
  {
    "id": "trips",
    "teaches": "trips",
    "hooks": [
      "trips"
    ],
    "say": "A guided trip is one story, told in a few minutes.",
    "ask": "Pick one to end the tour.",
    "awaits": "press",
    "then": "next",
    "prepare": [
      "home",
      "sheet"
    ]
  }
];

/** The steps the trips' voice has read: step id -> seconds. Nothing here is fetched before the visitor turns the voice on. */
export const VOICE = {
  "base": "audio/narration/onboarding",
  "clips": {
    "move": 6.72,
    "find": 6.15,
    "card": 6.06,
    "time": 6.75,
    "places": 6.2,
    "layers": 6.01,
    "share": 5.37,
    "drift": 7.02,
    "trips": 5.18
  }
};
