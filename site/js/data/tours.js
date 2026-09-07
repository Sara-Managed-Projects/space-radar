// GENERATED from registry/tours.yaml by scripts/gen_tours_js.py. Do not edit.
//
// `python3 scripts/gen_tours_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A TRIP IS A CHAIN OF SHOTS, and a stop is one shot plus the words that go under it. Every
// default from the YAML's `defaults:` block is already resolved into every stop here, and every
// `dwell_ms` is already computed from its own card's word count -- so this file is exactly what
// runs, and the number on the intro card is the number the browser spends.
//
// The state machine that flies these is hand-written next door in ui/trip.js. Generated data and
// hand-written code never share a file, which is what makes `--check` a plain byte comparison.

/** The shared settings a trip row may leave out. Already applied to every row below; here so the browser can say what a stop inherited. */
export const TOUR_DEFAULTS = {
  "pacing": "auto",
  "stage": "earth",
  "clock": "as-found",
  "min_stops": 3,
  "frame_radii": 5.0,
  "drift_deg": 34,
  "drift_rate_deg_s": 6,
  "drift": "toward-light",
  "key_light_deg": 125,
  "ease": "auto",
  "on_unresolved": "drop"
};

/** Every trip, with every default resolved and every dwell computed. */
export const TOURS = [
  {
    "id": "people-in-space",
    "title": "Where people are living in space right now",
    "blurb": "The only two places above you tonight with people inside them.",
    "requires": [
      "stations"
    ],
    "clock": "as-found",
    "pacing": "auto",
    "stage": "earth",
    "min_stops": 3,
    "stops": [
      {
        "id": "far",
        "target": {
          "layer": "stations",
          "catalog": "25544"
        },
        "distance_km": 32000,
        "drift_deg": 20,
        "card": {
          "title": "Two places, and only two",
          "body": "Right now there are exactly two homes above your head with people inside them. Everything else up here is a machine."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 9493
      },
      {
        "id": "iss",
        "target": {
          "layer": "stations",
          "catalog": "25544"
        },
        "distance_km": 3000,
        "card": {
          "title": "The International Space Station",
          "body": "About the size of a football pitch, and moving at eight kilometres a second. It goes all the way round the Earth every ninety minutes, so the crew see sixteen sunrises a day."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 13489
      },
      {
        "id": "tiangong",
        "target": {
          "layer": "stations",
          "query": {
            "name_contains": "TIANHE"
          },
          "pick": "first"
        },
        "distance_km": 3000,
        "card": {
          "title": "Tiangong",
          "body": "China's station, about a fifth the size, and newer. Three people live here at a time, in the same low Earth orbit a few hundred kilometres up."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 11491
      },
      {
        "id": "both",
        "target": {
          "world": "earth"
        },
        "frame_radii": 5.0,
        "drift_deg": 20,
        "card": {
          "title": "Two specks, on opposite sides of a planet",
          "body": "They are never near each other. Two specks on opposite sides of one planet, and that is the whole of humanity that does not live on the ground."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 11824
      }
    ],
    "estimate_ms": 59697
  },
  {
    "id": "strangest-things",
    "title": "The strangest things we have ever sent",
    "blurb": "A family photograph, two golf balls, a library, a record and a car.",
    "requires": [
      "oddities"
    ],
    "min_stops": 3,
    "clock": "as-found",
    "pacing": "auto",
    "stage": "earth",
    "stops": [
      {
        "id": "duke-photo",
        "target": {
          "record": "duke-family-photo"
        },
        "distance_km": 900,
        "card": {
          "title": "A photograph lying in the dust",
          "body": "Charlie Duke left a picture of his wife and two sons face-up on the Moon, took a photograph of it, and walked away. The plastic and the paper are still there."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12823
      },
      {
        "id": "golf-balls",
        "target": {
          "record": "shepard-golf-balls"
        },
        "distance_km": 900,
        "card": {
          "title": "Two golf balls, forty yards apart",
          "body": "Alan Shepard smuggled a six-iron head to the Moon in a sock and hit two balls one-handed. They went twenty-four and forty yards, not the miles everybody repeats."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 11824
      },
      {
        "id": "beresheet",
        "target": {
          "record": "beresheet-lunar-library"
        },
        "distance_km": 900,
        "card": {
          "title": "Thirty million pages, and some tardigrades",
          "body": "An Israeli lander crashed here carrying a stack of nickel discs with thirty million pages on them, and dried tardigrades set in resin between the layers."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 11158
      },
      {
        "id": "golden-record",
        "target": {
          "record": "deep-voyager-1"
        },
        "needs_layer": "deep-space",
        "drift_deg": 20,
        "card": {
          "title": "A gold record, further away than anything",
          "body": "Bolted to the side of this spacecraft is a gold-plated record. It carries whale song, greetings in fifty-five languages, and one woman's heartbeat, recorded two days after she decided to get married."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 13156
      },
      {
        "id": "roadster",
        "target": {
          "record": "tesla-roadster"
        },
        "card": {
          "title": "A car, going round the Sun",
          "body": "A cherry-red sports car with a dummy at the wheel, launched on a test flight and now looping between the Earth and Mars. Nobody has actually looked at it since 2018."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12823
      },
      {
        "id": "pull-back",
        "target": {
          "world": "earth"
        },
        "distance_km": 2000000,
        "drift_deg": 0,
        "card": {
          "title": "And this is where all of it came from",
          "body": "Every one of those things was made by people standing on that. From out here you cannot pick it out of the dark."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 10159
      }
    ],
    "estimate_ms": 92043
  }
];
