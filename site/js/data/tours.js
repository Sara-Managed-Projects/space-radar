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
          "body": "About the size of a football pitch, and moving at nearly eight kilometres a second. It goes all the way round the Earth every ninety-three minutes, so the crew see fifteen or sixteen sunrises a day."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14488
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
          "body": "China's station, about a fifth the mass, and newer. Three people live here at a time, in a low orbit like the other one's, a few hundred kilometres up."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12157
      },
      {
        "id": "both",
        "target": {
          "world": "earth"
        },
        "frame_radii": 5.0,
        "drift_deg": 20,
        "card": {
          "title": "Two specks, one planet",
          "body": "Most of the time they are thousands of kilometres apart. Two specks going round one planet, and that is the whole of humanity that does not live on the ground."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12490
      }
    ],
    "estimate_ms": 62028
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
          "body": "His family signed the back and pressed their thumbprints into it. It also says: This is the family of Astronaut Duke from Planet Earth, who landed on the Moon on the twentieth of April 1972."
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
        "id": "golf-balls",
        "target": {
          "record": "shepard-golf-balls"
        },
        "distance_km": 900,
        "card": {
          "title": "Two golf balls, twenty-four and forty yards out",
          "body": "They went twenty-four and forty yards, not the miles everybody repeats. The brand is unknown: Shepard never said, so that nobody could make money from it."
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
        "id": "beresheet",
        "target": {
          "record": "beresheet-lunar-library"
        },
        "distance_km": 900,
        "card": {
          "title": "Thirty million pages, and some tardigrades",
          "body": "Nobody knows where in the wreck the discs ended up; the camera orbiting the Moon cannot pick them out. Nor can anyone say whether the tardigrades survived the crash."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12157
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
          "body": "In the glovebox, a towel and a copy of The Hitchhiker's Guide to the Galaxy; on a circuit board, the words Made on Earth by humans. Nobody has actually looked at it since 2018."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 13822
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
    "estimate_ms": 94707
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
          "body": "From here the whole Solar System is smaller than a pixel. Light from the Sun takes a year to reach this spot; Voyager 1, the fastest thing we have sent out of the Solar System, would take about eighteen thousand."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
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
          "body": "The nearest star to the Sun, a dim red one an eighth of the Sun's mass. It has at least one planet. Every star you can see with your eyes at night is farther away than this one."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15154
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
          "body": "The brightest star in our sky, eight and a half light-years out and twenty-five times as bright as the Sun. The light reaching your eye tonight left it eight and a half years ago."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 13822
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
          "body": "Over a thousand young stars, a hundred million years old, about four hundred and twenty-five light-years away. Their light left when Shakespeare was alive."
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
          "body": "Our galaxy, about ninety thousand light-years across, seen from sixty thousand light-years above its disc, a view nobody has had. The shape is an illustration of what has been measured."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12490
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
          "body": "Fifty-three million light-years: the black hole in M87, the first one ever photographed. This is as far as this map draws places. It shows 109 389 stars of the 1.8 billion Gaia has measured, 178 nebulae, clusters and galaxies (110 of them from OpenNGC's 13 372), and every confirmed planet around another star whose distance has been measured. The rest is out there; we have not drawn what we cannot place."
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
    "estimate_ms": 141556
  }
];
