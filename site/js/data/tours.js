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
          "title": "Two golf balls, twenty-four and forty yards out",
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
  },
  {
    "id": "to-the-edge",
    "title": "To the edge of what we know",
    "blurb": "From the Sun to the first black hole anyone photographed, in eight steps. Leaving brings you back to Earth.",
    "requires": [
      "stars",
      "deep-sky",
      "exotics",
      "galaxy"
    ],
    "stage": "stellar",
    "clock": "as-found",
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "sun",
        "target": {
          "world": "sun"
        },
        "distance_km": 9460730472580.8,
        "drift_deg": 15,
        "card": {
          "title": "The Sun, from one light-year",
          "body": "From here the whole Solar System is smaller than a pixel. Light from the Sun takes a year to reach this spot; the fastest spacecraft we have built would take twenty thousand."
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
        "id": "proxima",
        "target": {
          "record": "hip-70890"
        },
        "needs_layer": "stars",
        "distance_km": 4730365236290.4,
        "card": {
          "title": "Proxima Centauri",
          "body": "The nearest star to the Sun, a dim red one a fifth of the Sun's mass. It has at least one planet. Everything you can see with your eyes at night is farther than this."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14155
      },
      {
        "id": "sirius",
        "target": {
          "record": "hip-32349"
        },
        "needs_layer": "stars",
        "distance_km": 9460730472580.8,
        "card": {
          "title": "Sirius",
          "body": "The brightest star in our sky, eight and a half light-years out and twenty-five times as bright as the Sun. The light reaching your eye tonight left it eight years ago."
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
        "id": "pleiades",
        "target": {
          "record": "dso-m45"
        },
        "needs_layer": "deep-sky",
        "distance_km": 946073047258080,
        "card": {
          "title": "The Pleiades",
          "body": "A few hundred young stars, a hundred million years old, about four hundred and forty light-years away. Their light left when Shakespeare was alive."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 10492
      },
      {
        "id": "centre",
        "target": {
          "record": "exotic-sgr-a-star"
        },
        "needs_layer": "exotics",
        "distance_km": 47303652362904000,
        "card": {
          "title": "The centre of the galaxy",
          "body": "Twenty-seven thousand light-years from home, a black hole of four million Suns that the whole Milky Way turns around. The disc, bar and arms drawn around you are a model built from measurements; the stars are the measured part."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15487
      },
      {
        "id": "galaxy",
        "target": {
          "record": "dso-milky-way"
        },
        "needs_layer": "galaxy",
        "distance_km": 567643828354848000,
        "card": {
          "title": "The Milky Way",
          "body": "Our galaxy, about ninety thousand light-years across, seen from sixty thousand light-years above its disc -- a view nobody has had. The shape is an illustration of what has been measured."
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
        "id": "andromeda",
        "target": {
          "record": "dso-m31"
        },
        "needs_layer": "deep-sky",
        "distance_km": 2838219141774240000,
        "card": {
          "title": "Andromeda",
          "body": "The nearest big galaxy, two and a half million light-years away and coming our way. Its light left when the first humans were learning to use tools."
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
        "id": "edge",
        "target": {
          "record": "exotic-m87-star"
        },
        "needs_layer": "exotics",
        "distance_km": 47303652362904000000,
        "card": {
          "title": "The edge of this map",
          "body": "Fifty-three million light-years: the black hole in M87, the first one ever photographed. This is as far as this map draws places. It shows 109 389 stars of the 1.8 billion Gaia has measured, 111 of OpenNGC's 13 372 deep-sky objects, and every confirmed planet around another star. The rest is out there; we have not drawn what we cannot place."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      }
    ],
    "estimate_ms": 137227
  }
];
