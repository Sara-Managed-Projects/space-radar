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

/** The headings the picker lists trips under, in the registry's order; a trip's `group` names one. A group with no trip is here too and is not drawn. */
export const TOUR_GROUPS = [
  {
    "id": "earth-orbit",
    "display": "Around the Earth",
    "order": 1
  },
  {
    "id": "solar-system",
    "display": "Around the Solar System",
    "order": 2
  },
  {
    "id": "beyond",
    "display": "Beyond the Solar System",
    "order": 3
  },
  {
    "id": "events",
    "display": "Things about to happen",
    "order": 4
  }
];

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
    "group": "earth-orbit",
    "next": "strangest-things",
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
    "id": "journey-to-the-station",
    "title": "From your ground to the space station",
    "blurb": "Straight up to the station and its next pass. The clock moves, then goes back.",
    "requires": [
      "stations"
    ],
    "clock": "as-found",
    "group": "earth-orbit",
    "next": "people-in-space",
    "requires_observer": true,
    "pacing": "auto",
    "stage": "earth",
    "min_stops": 3,
    "stops": [
      {
        "id": "ground",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "drift_deg": 20,
        "time": "now",
        "card": {
          "title": "Where you are standing",
          "body": "This is the ground you are standing on, seen from high above it. All the weather you have ever felt happens in the bottom twelve kilometres of air, a layer too thin to see from here."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14488
      },
      {
        "id": "air",
        "target": {
          "observer": true
        },
        "distance_km": 650,
        "drift_deg": 15,
        "time": "now",
        "card": {
          "title": "The air, from the station's height",
          "body": "Space begins a hundred kilometres up, with nearly all of the air already below. From the station's height the air is the blue glow along the edge of the world."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12490
      },
      {
        "id": "now",
        "target": {
          "layer": "stations",
          "catalog": "25544"
        },
        "distance_km": 3000,
        "time": "now",
        "card": {
          "title": "The station, where it is this minute",
          "body": "The International Space Station, a laboratory and a home, about as long as a football pitch. It goes round the Earth sixteen times a day, eight kilometres every second."
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
        "id": "pass",
        "target": {
          "layer": "stations",
          "catalog": "25544"
        },
        "distance_km": 20,
        "behind": "earth",
        "drift_deg": 30,
        "time": {
          "event": "station-pass.next"
        },
        "rate": 1,
        "card": {
          "title": "The next time it crosses your sky",
          "body": "This is the station at the top of its next pass over you, with your ground below. From where you stand it looks like a bright star moving steadily across the sky, with no blinking lights."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14488
      }
    ],
    "estimate_ms": 67023
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
    "group": "solar-system",
    "next": "moon-landings",
    "pacing": "auto",
    "stage": "earth",
    "stops": [
      {
        "id": "duke-photo",
        "target": {
          "record": "duke-family-photo"
        },
        "distance_km": 900,
        "time": "daylight",
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
        "time": "daylight",
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
        "time": "daylight",
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
        "time": "now",
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
    "blurb": "From the Sun to a photographed black hole. Leaving brings you back to Earth.",
    "requires": [
      "stars",
      "deep-sky",
      "exotics",
      "galaxy"
    ],
    "stage": "stellar",
    "clock": "as-found",
    "group": "beyond",
    "og_stop": 6,
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
          "title": "As far as this trip goes",
          "body": "Fifty-three million light-years: the black hole in M87, the first one ever photographed. The map goes further, to a quasar's black hole 10.8 billion light-years out. It shows 109 389 stars of the 1.8 billion Gaia has measured, 209 nebulae, clusters and galaxies (110 of them from OpenNGC's 13 372), and every confirmed planet around another star whose distance has been measured. The rest is out there; we have not drawn what we cannot place."
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
  },
  {
    "id": "travel-to-exoplanets",
    "title": "Travel to exoplanets",
    "blurb": "Other stars' planets, then TRAPPIST-1's seven. Leaving brings you back to Earth.",
    "requires": [
      "stars",
      "exoplanets",
      "systems"
    ],
    "stage": "stellar",
    "clock": "as-found",
    "group": "beyond",
    "next": "to-the-edge",
    "og_stop": 3,
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "all",
        "target": {
          "world": "sun"
        },
        "distance_km": 567643828354848,
        "drift_deg": 30,
        "chapter": "Chapter one: the catalogue",
        "card": {
          "title": "Planets around other stars",
          "body": "6 332 planets around other stars, in the copy of NASA's catalogue this map carries, each drawn as a mark at its star. Most were found by the dip in a star's light as a planet crosses in front of it, the rest mostly by the wobble a planet gives its star."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "proxima-b",
        "target": {
          "record": "exo-proxima-cen-b"
        },
        "distance_km": 4730365236290.4,
        "chapter": "Chapter one: the catalogue",
        "card": {
          "title": "The nearest one",
          "body": "Proxima b goes round the nearest star to the Sun, four light-years away, once every eleven days. Nobody has seen it: it was found by the wobble it gives its star."
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
        "id": "trappist",
        "target": {
          "record": "star-trappist-1"
        },
        "stage": "system-trappist-1",
        "distance_km": 14959787,
        "drift_deg": 20,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "Seven worlds round a small red star",
          "body": "TRAPPIST-1 is a cool red star forty light-years away, a little bigger than Jupiter. Seven planets about the size of the Earth go round it, and all seven were found as they crossed in front of it."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14821
      },
      {
        "id": "e",
        "target": {
          "record": "exo-trappist-1-e"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 e",
          "body": "A year here lasts six days. It is nine tenths as wide as the Earth and seven tenths as heavy, and at its closest its neighbour d would look as wide in its sky as the Moon is in ours."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "b",
        "target": {
          "record": "exo-trappist-1-b"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 b",
          "body": "The innermost, 1.7 million kilometres from its star, over thirty times closer than Mercury is to the Sun. Its year is a day and a half, and it is a tenth wider than the Earth."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14155
      },
      {
        "id": "c",
        "target": {
          "record": "exo-trappist-1-c"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 c",
          "body": "The second out, round its star in just under two and a half days. Like b it is a little wider than the Earth and about a third heavier."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 12157
      },
      {
        "id": "d",
        "target": {
          "record": "exo-trappist-1-d"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 d",
          "body": "Four days a year, and the smallest but one: four fifths of the Earth's width and less than two fifths of its mass."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 10159
      },
      {
        "id": "f",
        "target": {
          "record": "exo-trappist-1-f"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 f",
          "body": "Nine days a year, and the nearest of the seven to the Earth's own size and mass, a few per cent over on both."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 10492
      },
      {
        "id": "g",
        "target": {
          "record": "exo-trappist-1-g"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 g",
          "body": "The widest of the seven, thirteen per cent wider than the Earth. Its year lasts twelve and a third days."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 9160
      },
      {
        "id": "h",
        "target": {
          "record": "exo-trappist-1-h"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "key_light_deg": 60,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 h",
          "body": "The outermost and the smallest, three quarters of the Earth's width. A year here is nineteen days, and b goes round twelve times in one of them."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 11491
      },
      {
        "id": "mercury",
        "target": {
          "record": "star-trappist-1"
        },
        "stage": "system-trappist-1",
        "distance_km": 74798935,
        "drift_deg": 0,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "mercury_ring": true,
        "card": {
          "title": "All of it inside Mercury's orbit",
          "body": "The dashed ring is the size of Mercury's orbit round our Sun, drawn here for scale. It is six times wider than the orbit of h: every one of these worlds is closer to its star than Mercury is to ours."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16153
      }
    ],
    "estimate_ms": 183564
  },
  {
    "id": "moon-landings",
    "title": "Where we have landed on the Moon",
    "blurb": "Landings from the first to the private ones. Leaving brings you back to Earth.",
    "requires": [
      "hand-kept-sites",
      "worlds"
    ],
    "stage": "moon",
    "clock": "as-found",
    "group": "solar-system",
    "next": "outer-solar-system",
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "surveyor-1",
        "target": {
          "site": "surveyor-1"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter one: the race, 1966 to 1972",
        "card": {
          "title": "The first soft landing anyone can find",
          "body": "It was not the first. The Soviet Luna 9 landed softly four months earlier, on 3 February 1966, but NASA's table says the place published for it is probably at least 10 km out, direction unknown. Surveyor 1 shut off its engines 3.4 m up and dropped the rest of the way."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19816
      },
      {
        "id": "apollo-11",
        "target": {
          "site": "apollo-11"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter one: the race, 1966 to 1972",
        "card": {
          "title": "The first people",
          "body": "Neil Armstrong and Buzz Aldrin stayed 21 hours and 36 minutes. Their whole walk covered about 250 metres, and neither went more than about 100 m from the lander. Michael Collins waited for them in orbit."
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
        "id": "apollo-12",
        "target": {
          "site": "apollo-12"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter one: the race, 1966 to 1972",
        "card": {
          "title": "A visit to an older robot",
          "body": "On their second walk they went over to Surveyor 3 and brought about 10 kg of it home to study, its TV camera included. That camera is on show at the Smithsonian's National Air and Space Museum in Washington."
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
        "id": "lunokhod-1",
        "target": {
          "site": "lunokhod-1"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter one: the race, 1966 to 1972",
        "card": {
          "title": "A rover driven from Earth",
          "body": "Nobody rode it. A team of five controllers on Earth drove it by its television pictures, at one or two kilometres an hour. It was built to last three lunar days and kept going for eleven, 322 Earth days in all."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16153
      },
      {
        "id": "apollo-17",
        "target": {
          "site": "apollo-17"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter one: the race, 1966 to 1972",
        "card": {
          "title": "Seventy-five hours, then a long quiet",
          "body": "Gene Cernan and Harrison Schmitt, the first scientist to walk on the Moon, stayed 75 hours and covered 30 km with their rover. After them robots landed three more times, and then nothing landed softly on the Moon for 37 years."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16153
      },
      {
        "id": "change-4",
        "target": {
          "site": "change-4"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter two: the long quiet ends",
        "card": {
          "title": "The side that never faces us",
          "body": "From here the Earth is always below the horizon, so the Moon itself blocks any radio link home. China first put a relay satellite, Queqiao, out beyond the Moon, and the lander spoke to Earth through it. Its rover, Yutu 2, was still driving four years later."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      },
      {
        "id": "chandrayaan-3",
        "target": {
          "site": "chandrayaan-3"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter two: the long quiet ends",
        "card": {
          "title": "Near the south pole",
          "body": "India's first try, Chandrayaan-2, carried a lander also called Vikram, and it crashed in September 2019 about 110 km from here. This one was built to work for one lunar day, about 14 Earth days, and was put to sleep on 4 September 2023."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "im-1",
        "target": {
          "site": "im-1"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter three: the first companies",
        "card": {
          "title": "The first private lander, leaning",
          "body": "It came down on a slope of about 12 degrees, broke some of its landing gear, and came to rest leaning at 30 degrees, still working. Nothing had landed nearer a pole until the same company's next lander, IM-2, reached 84.8 degrees south in March 2025."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "blue-ghost-1",
        "target": {
          "site": "blue-ghost-1"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Chapter three: the first companies",
        "card": {
          "title": "An eclipse, seen from the Moon",
          "body": "It carried ten NASA instruments. On 14 March 2025 it watched the Earth pass in front of the Sun, a total eclipse seen from the Moon. Two days later it filmed the sunset, looking for a glow over the horizon that Gene Cernan saw on Apollo 17."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      },
      {
        "id": "whole-moon",
        "target": {
          "world": "moon"
        },
        "frame_radii": 6.0,
        "drift_deg": 20,
        "key_light_deg": 45,
        "chapter": "Epilogue: the whole Moon",
        "card": {
          "title": "Twenty-eight landings, nineteen on this map",
          "body": "NASA's table of what lies on the Moon, last updated in August 2025, lists 28 landings, six of them with people aboard. This map marks 19 of them, two by where their rovers stopped. Luna 9, the first of all, is not one: nobody knows exactly where it is."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      }
    ],
    "estimate_ms": 205686
  },
  {
    "id": "outer-solar-system",
    "title": "Out past Jupiter, to the farthest thing we sent",
    "blurb": "Ten stops through the cold outer worlds. Leaving brings you back to Earth.",
    "requires": [
      "worlds",
      "deep-space",
      "far-bodies"
    ],
    "stage": "jupiter",
    "clock": "as-found",
    "group": "solar-system",
    "next": "to-the-edge",
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "io",
        "target": {
          "record": "io"
        },
        "stage": "jupiter",
        "frame_radii": 12,
        "behind": "jupiter",
        "chapter": "Chapter one: Jupiter's moons",
        "card": {
          "title": "Io, the moon Jupiter never lets rest",
          "body": "Io goes round Jupiter every 42 hours, pulled one way by the planet and the other by two moons further out, in time with it. All that kneading has to go somewhere, and it comes out of hundreds of volcanoes."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "europa",
        "target": {
          "record": "europa"
        },
        "stage": "jupiter",
        "frame_radii": 12,
        "behind": "jupiter",
        "chapter": "Chapter one: Jupiter's moons",
        "card": {
          "title": "Europa, and the two ships on their way",
          "body": "Under that ice is twice as much water as every ocean on Earth put together. Europa Clipper reaches Jupiter in April 2030 to fly past here 49 times and ask whether anything could live down there; Europe's JUICE arrives in 2031 and ends up circling Ganymede."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "saturn",
        "target": {
          "record": "saturn"
        },
        "stage": "saturn",
        "frame_radii": 4.5,
        "key_light_deg": 60,
        "chapter": "Chapter two: the ringed planet",
        "card": {
          "title": "Saturn, and a ring ten metres thick",
          "body": "The rings reach eighty thousand kilometres out from the equator and in places are ten metres from top to bottom. They are almost all water ice. Cassini circled here for thirteen years and finished by flying into the planet in September 2017."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16486
      },
      {
        "id": "titan",
        "target": {
          "record": "titan"
        },
        "stage": "saturn",
        "frame_radii": 6,
        "behind": "saturn",
        "chapter": "Chapter two: the ringed planet",
        "card": {
          "title": "Titan, and the farthest we have landed",
          "body": "The air at the ground presses half again as hard as Earth's, and the lakes under the haze are methane. Huygens came down through it on 14 January 2005 and sent for ninety minutes from the surface. Nothing has landed further from home, before or since."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "enceladus",
        "target": {
          "record": "enceladus"
        },
        "stage": "saturn",
        "frame_radii": 12,
        "behind": "saturn",
        "chapter": "Chapter two: the ringed planet",
        "card": {
          "title": "Enceladus, spraying its ocean into space",
          "body": "Cassini found the jets in 2005, coming off the south pole at four hundred metres a second, and flew straight through them. They carry water, salt, silica and more organic material than anyone expected, and they have not stopped: the dust keeps one of Saturn's outer rings supplied."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18484
      },
      {
        "id": "triton",
        "target": {
          "record": "triton"
        },
        "stage": "neptune",
        "frame_radii": 14,
        "behind": "neptune",
        "key_light_deg": 60,
        "chapter": "Chapter three: the last planet",
        "card": {
          "title": "Triton, going the wrong way round",
          "body": "One spacecraft has ever visited Neptune: Voyager 2, on 25 August 1989. Five hours after passing the planet it flew by Triton, forty thousand kilometres up, and found a surface at minus 235 degrees with geysers going off on it."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "pluto",
        "target": {
          "record": "pluto"
        },
        "stage": "pluto",
        "frame_radii": 9,
        "behind": "charon",
        "key_light_deg": 60,
        "chapter": "Chapter four: past Neptune",
        "card": {
          "title": "Pluto and Charon, going round each other",
          "body": "New Horizons crossed this pair on 14 July 2015, nine and a half years out from Earth. It found mountains of water ice, and beside them a plain of nitrogen ice that is still slowly turning over. Sending the pictures home took until October 2016."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17485
      },
      {
        "id": "sedna",
        "target": {
          "record": "dwarf-sedna"
        },
        "stage": "sun",
        "needs_layer": "far-bodies",
        "chapter": "Chapter four: past Neptune",
        "card": {
          "title": "Sedna, on its way in",
          "body": "It is falling towards its closest point, some time around 2076, and even that is seventy-six times the Earth's distance from the Sun. Then it climbs back out to nine hundred and thirty-seven times. No planet we know of could have put it on that path, and finding it in 2003 was part of what made astronomers ask what a planet is."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "eris",
        "target": {
          "record": "dwarf-eris"
        },
        "stage": "sun",
        "needs_layer": "far-bodies",
        "chapter": "Chapter four: past Neptune",
        "card": {
          "title": "Eris, which made planet a definition",
          "body": "The definition astronomers agreed on in 2006 asks three things of a planet: it goes round the Sun, gravity has pulled it round, and it has cleared its own path. Eris and Pluto fail the third. Eris is near the far end of a 560-year lap, ninety five times as far from the Sun as we are."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "voyager-1",
        "target": {
          "record": "deep-voyager-1"
        },
        "stage": "sun",
        "needs_layer": "deep-space",
        "chapter": "Epilogue: looking back",
        "card": {
          "title": "Voyager 1, and everything behind it",
          "body": "It passed Jupiter in March 1979 and Saturn in November 1980, and it has been leaving ever since, more than 170 times the Earth's distance from the Sun. In 1990 it turned round and photographed the planets it had left. Earth came out 0.12 of a pixel wide."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18484
      }
    ],
    "estimate_ms": 211715
  },
  {
    "id": "a-year-in-a-minute",
    "title": "A year in a minute",
    "blurb": "A year of orbits in a minute. Leaving puts the clock back and you back to Earth.",
    "requires": [
      "worlds"
    ],
    "stage": "sun",
    "clock": "as-found",
    "group": "solar-system",
    "next": "outer-solar-system",
    "og_stop": 1,
    "orbits": [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter"
    ],
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "inner",
        "target": {
          "world": "sun"
        },
        "distance_km": 700000000,
        "drift_deg": 0,
        "time": "now",
        "rate": 525600,
        "card": {
          "title": "Everything inside Mars, going round",
          "body": "Every second here is six days, so Mercury goes round the Sun in fifteen seconds and the Earth in a minute. Each planet is a dot drawn far larger than it is, on the path it really follows."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15154
      },
      {
        "id": "earth",
        "target": {
          "world": "earth"
        },
        "distance_km": 2500000,
        "drift_deg": 0,
        "rate": 525600,
        "card": {
          "title": "The Earth, and the Moon going round it",
          "body": "The Moon goes round the Earth every 27.3 days, which here is four and a half seconds. The camera is riding along with the Earth at thirty kilometres a second, so it is everything farther away that seems to drift."
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
        "id": "mercury",
        "target": {
          "world": "mercury"
        },
        "distance_km": 60000000,
        "behind": "sun",
        "drift_deg": 0,
        "rate": 525600,
        "card": {
          "title": "Mercury, four laps to our one",
          "body": "Mercury goes round the Sun in 88 days, four times in each of our years, at 47 kilometres a second. The camera is following it, so it is the Sun that seems to wheel round behind."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14488
      },
      {
        "id": "jupiter",
        "target": {
          "world": "sun"
        },
        "distance_km": 2200000000,
        "drift_deg": 0,
        "rate": 525600,
        "card": {
          "title": "Jupiter, which takes twelve of our years",
          "body": "Jupiter is five times as far from the Sun as we are and needs almost twelve of our years to go round once. While the Earth goes round one time, Jupiter covers a twelfth of its path."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14821
      }
    ],
    "estimate_ms": 73683
  },
  {
    "id": "chasing-the-solar-eclipse",
    "title": "Chasing the solar eclipse",
    "blurb": "The next total eclipse's shadow crossing the Earth. This trip moves the clock.",
    "requires": [
      "worlds"
    ],
    "stage": "earth",
    "clock": "as-found",
    "group": "events",
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "arrives",
        "target": {
          "world": "earth"
        },
        "frame_radii": 7,
        "drift_deg": 0,
        "key_light_deg": 0,
        "time": {
          "event": "solar-eclipse.next",
          "kind": "total",
          "offset_s": -5400
        },
        "rate": 600,
        "card": {
          "title": "The shadow arrives",
          "body": "This is the Moon's shadow crossing the Earth, drawn from where the Sun and the Moon really are. Under the pale outer part people see a bite taken out of the Sun; only under the small dark core is it covered completely."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16486
      },
      {
        "id": "peak",
        "target": {
          "world": "earth"
        },
        "frame_radii": 3,
        "drift_deg": 0,
        "key_light_deg": 0,
        "time": {
          "event": "solar-eclipse.next",
          "kind": "total"
        },
        "rate": 1,
        "card": {
          "title": "The minute it happens",
          "body": "This is greatest eclipse, the minute the dark core of the shadow passes nearest the middle of the Earth. Inside it the Sun is covered for a few minutes, and never for more than seven and a half."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15154
      },
      {
        "id": "from-the-moon",
        "target": {
          "world": "moon"
        },
        "distance_km": 12000,
        "behind": "earth",
        "key_light_deg": 0,
        "rate": 60,
        "card": {
          "title": "The Moon, casting it",
          "body": "Behind the Moon, the Earth, and on it the dark spot where the Moon's shadow is touching the ground. The side of the Moon facing you is in full sunlight, which is why the side facing the Earth is dark."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "ring",
        "target": {
          "world": "earth"
        },
        "frame_radii": 3,
        "drift_deg": 0,
        "key_light_deg": 0,
        "time": {
          "event": "solar-eclipse.next",
          "kind": "annular"
        },
        "rate": 1,
        "card": {
          "title": "A ring, not a night",
          "body": "When the Moon is near the far end of its orbit it looks a little smaller than the Sun, so it cannot cover all of it. A bright ring is left round the Moon, and the shadow on the ground never gets as dark as a total one."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18484
      },
      {
        "id": "lunar",
        "target": {
          "world": "moon"
        },
        "frame_radii": 4,
        "drift_deg": 0,
        "key_light_deg": 0,
        "time": {
          "event": "lunar-eclipse.next",
          "kind": "total",
          "offset_s": -3600
        },
        "rate": 600,
        "card": {
          "title": "The Earth's shadow on the Moon",
          "body": "Now it is the Earth that is in the way. The Moon moves into the Earth's shadow, and anyone on the night half of the planet can watch it happen, with nothing but their eyes."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14155
      }
    ],
    "estimate_ms": 96849
  },
  {
    "id": "the-constellations",
    "title": "The constellations",
    "blurb": "Twelve figures of the night sky, drawn star by star. Leaving goes back to Earth.",
    "requires": [
      "stars"
    ],
    "stage": "stellar",
    "clock": "as-found",
    "group": "beyond",
    "next": "to-the-edge",
    "og_stop": 1,
    "hides": [
      "exoplanets",
      "systems",
      "exotics",
      "deep-sky",
      "galaxy"
    ],
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "orion",
        "target": {
          "sky": [
            83.8,
            0.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The northern winter sky",
        "figures": [
          "Ori"
        ],
        "figure_stars": 4,
        "zoom": 0.88,
        "card": {
          "title": "Orion, the hunter",
          "body": "Three stars in a row and four more around them: the easiest figure in the sky to find, and one that both halves of the world can see. The Greeks drew a hunter here. In Egypt it was the god Osiris, and across Latin America the three belt stars are the Three Marys."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "orion-from-the-side",
        "target": {
          "sky": [
            83.8,
            0.0
          ],
          "depth_ly": 650
        },
        "distance_km": 8514657425322720,
        "drift_deg": 30,
        "drift_rate_deg_s": 2,
        "chapter": "The northern winter sky",
        "figures": [
          "Ori"
        ],
        "figure_stars": 4,
        "aside_deg": 20,
        "card": {
          "title": "Orion, seen from the side",
          "body": "Now leave home. Bellatrix, the hunter's shoulder, is two hundred and fifty light-years from us. Betelgeuse is five hundred, and the middle star of the belt nearly two thousand. The hunter is a line of sight, not a place: from here, hundreds of light-years to one side, nobody would draw him."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "taurus",
        "target": {
          "sky": [
            64.0,
            20.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The northern winter sky",
        "figures": [
          "Tau"
        ],
        "figure_stars": 2,
        "card": {
          "title": "The bull and the Seven Sisters",
          "body": "Follow Orion's belt up and to the right and you reach the orange eye of the bull, Aldebaran, and past it a small knot of blue stars. They are the Pleiades, a real family of stars that were born together. Japan calls them Subaru, and for Māori their return before dawn, as Matariki, begins the new year."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "gemini",
        "target": {
          "sky": [
            104.0,
            23.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The northern winter sky",
        "figures": [
          "Gem"
        ],
        "figure_stars": 2,
        "card": {
          "title": "The twins",
          "body": "Two bright stars side by side, Castor and Pollux, are the heads of twin brothers standing in the Milky Way. They only look like twins. Pollux is an orange giant thirty-four light-years away. Castor is fifty-one, and is really six stars circling one another."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "leo",
        "target": {
          "sky": [
            160.0,
            17.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The sky of spring",
        "figures": [
          "Leo"
        ],
        "figure_stars": 2,
        "card": {
          "title": "The lion",
          "body": "A backwards question mark for the mane and a triangle for the hindquarters: the lion is one of the few figures that looks like its name. The bright star at its chest is Regulus, the little king. The Sun passes right beside it every August."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17485
      },
      {
        "id": "plough",
        "target": {
          "sky": [
            186.0,
            69.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "Round the pole",
        "figures": [
          "UMa",
          "UMi"
        ],
        "figure_stars": 2,
        "zoom": 0.78,
        "card": {
          "title": "The Plough, and the way north",
          "body": "Seven stars that Britain calls the Plough, America the Big Dipper and much of Europe a wagon: they are the back and tail of the Great Bear. Take the two stars at the end of the bowl and follow them up, five times their own gap. That lone star is Polaris, and it sits almost exactly over the Earth's north pole."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "cassiopeia",
        "target": {
          "sky": [
            15.0,
            62.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "Round the pole",
        "figures": [
          "Cas"
        ],
        "figure_stars": 3,
        "card": {
          "title": "Cassiopeia, across the pole",
          "body": "Go straight on past Polaris, as far again, and you meet a letter W of five stars: Cassiopeia, a queen in the Greek story. She and the Plough sit on opposite sides of the pole and swing round it like the two ends of a seesaw, so when one is low the other is high."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "summer-triangle",
        "target": {
          "sky": [
            296.0,
            27.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The northern summer sky",
        "figures": [
          "Lyr",
          "Cyg",
          "Aql"
        ],
        "figure_stars": 1,
        "zoom": 0.85,
        "exposure": "deep",
        "card": {
          "title": "The Summer Triangle",
          "body": "Three bright stars from three different figures: Vega in the Lyre, Deneb in the Swan, Altair in the Eagle. The pale band running between them is the Milky Way, shown as a long exposure would catch it. In China it is the Silver River, which parts the Weaver Girl, Vega, from the Cowherd, Altair."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "scorpius",
        "target": {
          "sky": [
            253.0,
            -32.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The southern sky",
        "figures": [
          "Sco"
        ],
        "figure_stars": 2,
        "zoom": 0.9,
        "exposure": "deep",
        "card": {
          "title": "The scorpion",
          "body": "A red heart, and a long curved tail with a sting at the end. The heart is Antares, a star so large that it would swallow the orbit of Mars. In the Greek story this is the scorpion that killed Orion, which is why the two are never in the sky together. In Hawaii the same stars are the fish hook of Maui."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "sagittarius",
        "target": {
          "sky": [
            279.0,
            -28.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The southern sky",
        "figures": [
          "Sgr"
        ],
        "figure_stars": 2,
        "exposure": "deep",
        "card": {
          "title": "The teapot, and the centre of the galaxy",
          "body": "The archer's brightest stars make a teapot, and the Milky Way rises from its spout like steam. Look just past the spout and you are looking at the centre of our galaxy, about twenty-seven thousand light-years away, hidden behind dust. Every star named on this trip is in our own small corner of it."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "southern-cross",
        "target": {
          "sky": [
            196.0,
            -52.0
          ]
        },
        "drift_deg": 3,
        "drift_rate_deg_s": 0.25,
        "chapter": "The southern sky",
        "figures": [
          "Cru",
          "Cen"
        ],
        "figure_stars": 2,
        "zoom": 0.82,
        "exposure": "deep",
        "card": {
          "title": "The Southern Cross",
          "body": "The smallest of the eighty-eight constellations, and the best known south of the equator. Australia, New Zealand, Brazil, Papua New Guinea and Samoa all fly it on their flags. The two bright stars beside it are the Pointers, and the nearer is Alpha Centauri, the closest star system to the Sun. The dark patch at the foot of the Cross is the head of the Emu that Aboriginal Australians see in the Milky Way."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "zodiac",
        "target": {
          "sky": [
            256.0,
            -20.0
          ]
        },
        "drift_deg": 8,
        "drift_rate_deg_s": 0.5,
        "chapter": "The Sun's road",
        "figures": [
          "Sco",
          "Oph",
          "Sgr",
          "Lib"
        ],
        "figure_stars": 0,
        "ecliptic": true,
        "zoom": 0.7,
        "card": {
          "title": "The zodiac",
          "body": "The dashed line is the path the Sun takes across the stars in a year. The Moon and the planets never stray far from it, because the Solar System is nearly flat. The figures along it are the zodiac. Babylonian sky watchers counted twelve; the line really crosses thirteen, and the one left out is here: Ophiuchus, the serpent bearer."
        },
        "frame_radii": 5.0,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      }
    ],
    "estimate_ms": 274320
  },
  {
    "id": "the-living-earth",
    "title": "The living Earth",
    "blurb": "One planet's cycles with today's data: storms, sea, ice. It moves the clock.",
    "requires": [
      "worlds",
      "storms",
      "lightning",
      "aurora"
    ],
    "stage": "earth",
    "clock": "as-found",
    "group": "earth-orbit",
    "next": "chasing-the-solar-eclipse",
    "og_stop": 5,
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "tilt",
        "target": {
          "world": "earth"
        },
        "frame_radii": 3.4,
        "drift_deg": 0,
        "key_light_deg": 90,
        "time": "2027-06-21T12:00:00Z",
        "rate": 1800,
        "chapter": "The Sun and the seasons",
        "card": {
          "title": "A tilted world",
          "body": "The Earth leans over by twenty-three degrees, and keeps leaning the same way all year. Here the north is tipped towards the Sun: the Arctic has daylight round the clock, and the line between day and night crosses the map at a slant. That lean, and nothing else, makes the seasons."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "half-a-year-on",
        "target": {
          "world": "earth"
        },
        "frame_radii": 3.4,
        "drift_deg": 0,
        "key_light_deg": 90,
        "time": "2027-12-22T12:00:00Z",
        "rate": 1800,
        "chapter": "The Sun and the seasons",
        "card": {
          "title": "Half a year on",
          "body": "Six months later the Earth is on the far side of the Sun, still leaning the same way, so now it is the south that faces the light. Antarctica has the midnight Sun and the Arctic is dark all day. The Sun sends the same energy as before; the tilt decides who gets it."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "air",
        "target": {
          "world": "earth"
        },
        "frame_radii": 3.0,
        "key_light_deg": 95,
        "time": "now",
        "chapter": "Air and water",
        "card": {
          "title": "The thin blue line",
          "body": "Everything we call weather happens inside that blue line. Three quarters of the air is in the first eleven kilometres, a layer so thin that on a globe the size of a football it would be about as thick as two sheets of paper. It is the only air there is."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "weather",
        "target": {
          "world": "earth"
        },
        "frame_radii": 2.6,
        "drift_deg": 20,
        "drift_rate_deg_s": 2,
        "time": "now",
        "chapter": "Air and water",
        "over": [
          16,
          -78
        ],
        "live_note": "clouds",
        "card": {
          "title": "Today's weather",
          "body": "These are today's clouds, from weather satellites that take a picture every ten minutes. A tropical storm that has a name today is marked with it. Where thunderstorms are in view over the Americas, the flashes are lightning at the rate it was measured in the last quarter of an hour, drawn larger than life."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "ocean",
        "target": {
          "world": "earth"
        },
        "frame_radii": 2.6,
        "drift_deg": 20,
        "drift_rate_deg_s": 2,
        "chapter": "Air and water",
        "overlay": "sea-temperature",
        "over": [
          32,
          -48
        ],
        "card": {
          "title": "The sea moves the heat",
          "body": "The colours are the temperature of the sea, measured from orbit. Water warmed in the tropics does not stay there: currents such as the Gulf Stream carry it towards the poles, and it gives up heat and water to the air on the way. Most of the water in the air was lifted off a warm sea."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "plankton",
        "target": {
          "world": "earth"
        },
        "frame_radii": 2.8,
        "drift_deg": 20,
        "drift_rate_deg_s": 2,
        "chapter": "Life",
        "overlay": "chlorophyll",
        "over": [
          5,
          -28
        ],
        "card": {
          "title": "The sea in bloom",
          "body": "Green and yellow are water rich in plankton, plants too small to see that drift in the sunlit top of the sea. They bloom where currents bring food up from below. Between them they do about half of all the growing on the planet, and with the forests they breathe its carbon in and out every year."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "ice",
        "target": {
          "world": "earth"
        },
        "frame_radii": 2.4,
        "drift_deg": 20,
        "drift_rate_deg_s": 2,
        "chapter": "Life",
        "overlay": "sea-ice",
        "over": [
          80,
          -20
        ],
        "card": {
          "title": "The ice breathes",
          "body": "The bright colours are sea frozen over. Each winter the ice around the north pole grows until it covers more than the whole of Europe, and each summer about two thirds of it melts again. The summer ice has shrunk by more than a third since satellites began to watch it."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "haze",
        "target": {
          "world": "earth"
        },
        "frame_radii": 2.8,
        "drift_deg": 20,
        "drift_rate_deg_s": 2,
        "chapter": "Life",
        "overlay": "aerosol",
        "over": [
          18,
          15
        ],
        "card": {
          "title": "Dust, smoke and us",
          "body": "This is everything fine enough to hang in the air: desert dust, smoke from fires, salt from the sea, and the haze of cities and industry. Dust from the Sahara crosses the Atlantic and feeds the Amazon. The gas that warms the planet most, carbon dioxide, does not show here at all. It is invisible, and it is everywhere."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "moon",
        "target": {
          "world": "moon"
        },
        "distance_km": 12000,
        "behind": "earth",
        "time": "now",
        "rate": 60,
        "chapter": "From outside",
        "card": {
          "title": "The Moon's pull",
          "body": "The Moon pulls on the sea, and the sea rises towards it and on the far side too, so most coasts have two high tides a day. Over billions of years the same pull has slowed the Earth's spin. And the Moon is thought to hold the Earth's tilt steady, which keeps the seasons mild."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "aurora",
        "target": {
          "world": "earth"
        },
        "needs_layer": "aurora",
        "frame_radii": 2.4,
        "time": "now",
        "chapter": "From outside",
        "over": [
          70,
          "midnight"
        ],
        "live_note": "aurora",
        "card": {
          "title": "The Sun's wind",
          "body": "The Sun blows a thin wind of charged particles past us all the time. The Earth's magnetic field turns most of it aside and funnels some down around the poles, where it makes the upper air glow. The green rings are where the aurora is expected in the next hour, from today's forecast."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "jupiter",
        "target": {
          "world": "jupiter"
        },
        "stage": "jupiter",
        "frame_radii": 4,
        "key_light_deg": 60,
        "chapter": "From outside",
        "card": {
          "title": "Jupiter, bodyguard or not",
          "body": "Jupiter has three hundred times the mass of the Earth, and its pull rules the traffic of comets and asteroids. It throws many of them out of the Solar System before they can reach us, and it also sends some our way. Bodyguard or troublemaker: the sums are still being done."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "home",
        "target": {
          "world": "earth"
        },
        "frame_radii": 14,
        "behind": "moon",
        "key_light_deg": 60,
        "time": "now",
        "chapter": "From outside",
        "card": {
          "title": "One small world",
          "body": "From here the storms, the currents, the ice and the forests are one thin skin on one small world. Nothing we know of anywhere else has all of them. The Moon, four hundred thousand kilometres off, is the farthest any person has ever been from it."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      }
    ],
    "estimate_ms": 275950
  },
  {
    "id": "tonight-from-your-street",
    "title": "Tonight from your street",
    "blurb": "Your own sky tonight: a star, a figure, the Moon, a planet, the station's pass.",
    "requires": [
      "stations"
    ],
    "stage": "earth",
    "clock": "as-found",
    "group": "earth-orbit",
    "next": "planets-tonight",
    "requires_observer": true,
    "og_stop": 2,
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "above",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "drift_deg": 20,
        "time": "tonight",
        "chapter": "Before you go outside",
        "card": {
          "title": "Your street, as tonight begins",
          "body": "This is your part of the world as tonight's dark arrives. In a moment we go down to the ground and look up. Everything you are about to see is worked out for this place and this night, so you can go outside and check it."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "star",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "Looking up",
        "look": {
          "best": "star"
        },
        "card": {
          "title": "The first star you will notice",
          "body": "As the sky darkens, the brightest stars come out first. A star twinkles because its light is a single point, pushed about by moving air. Its colour is its temperature: the bluish ones are hotter than the Sun, the orange ones cooler."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16486
      },
      {
        "id": "figure",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "Looking up",
        "look": {
          "best": "figure"
        },
        "card": {
          "title": "A figure to find",
          "body": "The lines join stars into the figures people have told stories about for thousands of years. Learn one and you can find the next from it, the way you learn a town from one street. The line below names the one that is best placed for you right now."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      },
      {
        "id": "moon",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "Looking up",
        "zoom": 4,
        "look": {
          "world": "moon"
        },
        "card": {
          "title": "The Moon",
          "body": "The Moon rises about fifty minutes later each night, so it is not always in the evening sky. When it is, point any binoculars at the line between its light and its dark. That is where the mountains and craters throw their longest shadows."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "planet",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "Looking up",
        "look": {
          "best": "planet"
        },
        "card": {
          "title": "A planet, if one is up",
          "body": "A planet looks like a bright star that does not twinkle. Planets drift against the stars from month to month, which is what the word first meant: a wanderer."
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
        "id": "pass",
        "target": {
          "observer": true
        },
        "needs_layer": "stations",
        "distance_km": 200,
        "time": {
          "event": "station-pass.next",
          "offset_s": -15
        },
        "chapter": "Something that moves",
        "look": {
          "pass": true
        },
        "card": {
          "title": "The space station, crossing",
          "body": "This is the next time the space station comes over your place. When it can be seen, it is a bright, steady light gliding across the sky for a few minutes, with no flashing lights. That light is the Sun on its solar panels, and there are people inside."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      },
      {
        "id": "out",
        "target": {
          "observer": true
        },
        "distance_km": 650,
        "drift_deg": 15,
        "time": "now",
        "chapter": "Something that moves",
        "card": {
          "title": "Now go and look",
          "body": "That is tonight, from where you are. The sky you saw is already turning: come back in an hour and every star has moved a hand's width to the west. None of it needs a telescope. It needs ten minutes for your eyes to get used to the dark."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      }
    ],
    "estimate_ms": 143514
  },
  {
    "id": "moon-phases",
    "title": "Why the Moon changes shape",
    "blurb": "The Moon's month from space, then from your street. This trip moves the clock.",
    "requires": [
      "worlds"
    ],
    "stage": "earth",
    "clock": "as-found",
    "group": "earth-orbit",
    "next": "tonight-from-your-street",
    "requires_observer": true,
    "og_stop": 3,
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "from-outside",
        "target": {
          "world": "earth"
        },
        "distance_km": 1000000,
        "drift_deg": 0,
        "time": "2027-01-08T12:00:00Z",
        "rate": 36000,
        "chapter": "From outside",
        "over": [
          90,
          0
        ],
        "card": {
          "title": "The Earth and the Moon, to scale",
          "body": "We are far above the north pole, with both worlds at their true sizes and their true distance. The Moon is the small dot, thirty Earths away, and it takes a month to go once round. The Sun lights half of each of them, all the time."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      },
      {
        "id": "waxing",
        "target": {
          "world": "moon"
        },
        "frame_radii": 5.2,
        "drift_deg": 0,
        "time": "2027-01-10T12:00:00Z",
        "rate": 36000,
        "chapter": "The month, as the Earth sees it",
        "seen_from": "earth",
        "card": {
          "title": "A sliver that grows",
          "body": "Now the Moon as the Earth sees it, with ten hours passing every second. Just after new Moon it stands almost between us and the Sun, so its lit half faces away and we see only a thin edge. Each evening it has moved a little further round, and shows us more."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19816
      },
      {
        "id": "full",
        "target": {
          "world": "moon"
        },
        "frame_radii": 5.2,
        "drift_deg": 0,
        "time": "2027-01-15T12:00:00Z",
        "rate": 36000,
        "chapter": "The month, as the Earth sees it",
        "seen_from": "earth",
        "card": {
          "title": "Half, then full",
          "body": "A week after new we see half of the lit side. That is called the first quarter. A week later the Moon is on the far side of the Earth from the Sun, and the whole face we see is in daylight. That is full Moon, and it rises as the Sun sets."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 20000
      },
      {
        "id": "waning",
        "target": {
          "world": "moon"
        },
        "frame_radii": 5.2,
        "drift_deg": 0,
        "time": "2027-01-23T12:00:00Z",
        "rate": 36000,
        "chapter": "The month, as the Earth sees it",
        "seen_from": "earth",
        "card": {
          "title": "And back again",
          "body": "After full, the dark comes in from the other edge. The Moon rises later every night, until it is a thin crescent in the dawn. Twenty-nine and a half days after it began, it is new again."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 14821
      },
      {
        "id": "far-side",
        "target": {
          "world": "moon"
        },
        "distance_km": 12000,
        "behind": "earth",
        "time": "2027-02-05T12:00:00Z",
        "rate": 600,
        "chapter": "Two things people get wrong",
        "card": {
          "title": "The side we never see",
          "body": "The Moon turns once for every trip round the Earth, so the same face always looks at us. This is the other one. It gets just as much sunlight as the side we know: there is no dark side of the Moon, only a far side."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "shadow",
        "target": {
          "world": "moon"
        },
        "frame_radii": 4,
        "drift_deg": 0,
        "key_light_deg": 0,
        "time": {
          "event": "lunar-eclipse.next",
          "kind": "total",
          "offset_s": -3600
        },
        "rate": 600,
        "chapter": "Two things people get wrong",
        "seen_from": "earth",
        "card": {
          "title": "The phases are not the Earth's shadow",
          "body": "This is the Earth's shadow on the Moon, and it is rare. The Moon's path is tilted five degrees against ours, so at most full Moons it passes above or below the shadow. A few times a year they line up, and that is a lunar eclipse."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      },
      {
        "id": "tonight",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "From your street",
        "zoom": 5,
        "look": {
          "world": "moon"
        },
        "card": {
          "title": "The Moon over you tonight",
          "body": "This is the Moon from your own ground tonight. The lit side always points at the Sun, even when the Sun has set. Look again tomorrow at the same hour: it will be a little further east, and a little different in shape."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16819
      }
    ],
    "estimate_ms": 149026
  },
  {
    "id": "the-sun-today",
    "title": "The Sun today",
    "blurb": "Our star, its wind, and tonight's aurora forecast. Leaving goes back to Earth.",
    "requires": [
      "worlds",
      "aurora"
    ],
    "stage": "sun",
    "clock": "as-found",
    "group": "solar-system",
    "next": "planets-tonight",
    "og_stop": 1,
    "orbits": [
      "mercury",
      "venus",
      "earth",
      "mars"
    ],
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "star",
        "target": {
          "world": "sun"
        },
        "frame_radii": 3.2,
        "time": "now",
        "rate": 36000,
        "chapter": "The star itself",
        "card": {
          "title": "Our star",
          "body": "The Sun is a ball of glowing gas about a hundred Earths wide, and it holds nearly all the mass of the Solar System. It turns once in about twenty-five days. The face drawn here is a map of its surface, not a picture taken today."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "spots",
        "target": {
          "world": "sun"
        },
        "frame_radii": 1.7,
        "drift_deg": 20,
        "rate": 36000,
        "chapter": "The star itself",
        "card": {
          "title": "Spots, and an eleven-year beat",
          "body": "Dark spots come and go on this surface. Each is a place where the Sun's magnetism is strong enough to hold back the heat, and many are larger than the Earth. Their number rises and falls about every eleven years, and so do the Sun's outbursts."
        },
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "eight-minutes",
        "target": {
          "world": "sun"
        },
        "distance_km": 430000000,
        "drift_deg": 0,
        "time": "now",
        "rate": 36000,
        "chapter": "What reaches us",
        "card": {
          "title": "Eight minutes away",
          "body": "These are the paths of the four inner planets, and the third dot is home. Sunlight takes eight minutes and twenty seconds to get there, so we always see the Sun as it was eight minutes ago. A cloud of gas thrown out by a flare takes one to three days."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19483
      },
      {
        "id": "wind",
        "target": {
          "world": "earth"
        },
        "stage": "earth",
        "frame_radii": 5,
        "key_light_deg": 70,
        "time": "now",
        "chapter": "What reaches us",
        "live_note": "space-weather",
        "card": {
          "title": "The wind that never stops",
          "body": "The Sun blows a thin wind of charged particles in every direction, at about four hundred kilometres a second. The Earth's magnetic field turns most of it aside. When a larger cloud arrives, the field shakes. That is a magnetic storm, and it is measured every three hours."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18484
      },
      {
        "id": "aurora",
        "target": {
          "world": "earth"
        },
        "stage": "earth",
        "needs_layer": "aurora",
        "frame_radii": 2.4,
        "time": "now",
        "chapter": "What reaches us",
        "over": [
          70,
          "midnight"
        ],
        "live_note": "aurora",
        "card": {
          "title": "Where it comes down",
          "body": "Some of the wind is funnelled down around the magnetic poles, where it makes the upper air glow. The green rings are where the aurora is expected in the next hour, from today's forecast. In a strong storm they widen, and people far from the poles see the lights."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      },
      {
        "id": "scale",
        "target": {
          "world": "sun"
        },
        "frame_radii": 6,
        "time": "now",
        "chapter": "How big, how long",
        "card": {
          "title": "A million Earths",
          "body": "Jupiter, the largest planet, is a tenth as wide as the Sun. More than a million Earths would fit inside it. No screen can show them side by side: with the Sun at this size, the Earth would be a speck."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16153
      },
      {
        "id": "home",
        "target": {
          "world": "earth"
        },
        "stage": "earth",
        "frame_radii": 14,
        "key_light_deg": 60,
        "time": "now",
        "chapter": "How big, how long",
        "card": {
          "title": "Living with a star",
          "body": "Everything alive here runs on that light. The Sun is about halfway through its life: four and a half billion years old, with some five billion to go. Never look straight at it. The safe way to see the Sun is by its light on everything else."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      }
    ],
    "estimate_ms": 150174
  },
  {
    "id": "planets-tonight",
    "title": "The planets tonight",
    "blurb": "Every planet in turn, then where to look tonight. Leaving goes back to Earth.",
    "requires": [
      "worlds"
    ],
    "stage": "sun",
    "clock": "as-found",
    "group": "solar-system",
    "next": "mars-where-we-have-driven",
    "requires_observer": true,
    "og_stop": 6,
    "orbits": [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn"
    ],
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "where",
        "target": {
          "world": "sun"
        },
        "distance_km": 3800000000,
        "drift_deg": 0,
        "time": "tonight",
        "chapter": "From above",
        "card": {
          "title": "Where they all are tonight",
          "body": "This is the Solar System from above, as it is tonight. Each dot is a planet at its true place on its path. Which ones you can see depends on where the Earth is among them: a planet on the far side of the Sun from us is lost in its glare."
        },
        "frame_radii": 5.0,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19816
      },
      {
        "id": "mercury",
        "target": {
          "world": "mercury"
        },
        "stage": "mercury",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The inner planets",
        "live_note": "tonight",
        "card": {
          "title": "Mercury",
          "body": "The smallest planet and the closest to the Sun, so it never strays far from the Sun in our sky. It shows only low in the twilight, for a few weeks at a time. One day here, from sunrise to sunrise, lasts two of its years."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "venus",
        "target": {
          "world": "venus"
        },
        "stage": "venus",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The inner planets",
        "live_note": "tonight",
        "card": {
          "title": "Venus",
          "body": "The brightest thing in the night sky after the Moon, and the one people call the evening star or the morning star. It is the size of the Earth, wrapped in cloud that throws most of its sunlight back. In a small telescope it shows phases, like the Moon."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      },
      {
        "id": "mars",
        "target": {
          "world": "mars"
        },
        "stage": "mars",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The inner planets",
        "live_note": "tonight",
        "card": {
          "title": "Mars",
          "body": "A steady orange point. Mars is bright for a few months every two years, when the Earth catches it up and passes it on the inside, and much fainter the rest of the time."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 13822
      },
      {
        "id": "jupiter",
        "target": {
          "world": "jupiter"
        },
        "stage": "jupiter",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The giants",
        "live_note": "tonight",
        "card": {
          "title": "Jupiter",
          "body": "Brighter than any star, and white. Hold binoculars still and you will see up to four small points in a line beside it. They are its largest moons, the ones Galileo found, and they change places from night to night."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "saturn",
        "target": {
          "world": "saturn"
        },
        "stage": "saturn",
        "frame_radii": 5,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The giants",
        "live_note": "tonight",
        "card": {
          "title": "Saturn",
          "body": "A calm, yellowish point, about as bright as the brightest stars. The rings need a small telescope. About every fifteen years they turn edge-on to us and almost vanish, because they are thousands of times wider than they are thick."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15820
      },
      {
        "id": "uranus",
        "target": {
          "world": "uranus"
        },
        "stage": "uranus",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The giants",
        "live_note": "tonight",
        "card": {
          "title": "Uranus",
          "body": "Just too faint for most eyes, though binoculars will find it if you know where to look. It was the first planet discovered with a telescope. It lies on its side, so each pole has forty-two years of daylight and then forty-two of night."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "neptune",
        "target": {
          "world": "neptune"
        },
        "stage": "neptune",
        "frame_radii": 4,
        "key_light_deg": 55,
        "time": "tonight",
        "chapter": "The giants",
        "live_note": "tonight",
        "card": {
          "title": "Neptune",
          "body": "Never visible without a telescope. It was found with a pencil first: astronomers worked out where it must be from the way it pulled on Uranus, and there it was. Its light takes four hours to reach us."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 15154
      },
      {
        "id": "your-sky",
        "target": {
          "observer": true
        },
        "distance_km": 200,
        "time": "tonight",
        "chapter": "From your street",
        "look": {
          "best": "planet"
        },
        "card": {
          "title": "Your own sky tonight",
          "body": "This is your sky tonight, facing the brightest planet that is up. The planets all keep close to one line across the sky, the same path the Sun took during the day. Find one, and the others will be somewhere along it."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16486
      }
    ],
    "estimate_ms": 180855
  },
  {
    "id": "mars-where-we-have-driven",
    "title": "Mars, where we have driven",
    "blurb": "A volcano, a canyon, five landing sites and a moon. Leaving goes back to Earth.",
    "requires": [
      "hand-kept-sites",
      "worlds"
    ],
    "stage": "mars",
    "clock": "as-found",
    "group": "solar-system",
    "next": "moon-landings",
    "og_stop": 1,
    "pacing": "auto",
    "min_stops": 3,
    "stops": [
      {
        "id": "planet",
        "target": {
          "world": "mars"
        },
        "frame_radii": 4,
        "key_light_deg": 55,
        "chapter": "The planet",
        "card": {
          "title": "The red planet",
          "body": "Mars is half as wide as the Earth, and its day is forty minutes longer than ours. The red is rust: iron in the dust, which the wind spreads over the whole planet. Machines have been landing here for fifty years, and two rovers are still driving."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18151
      },
      {
        "id": "olympus",
        "target": {
          "world": "mars"
        },
        "frame_radii": 1.6,
        "drift_deg": 10,
        "drift_rate_deg_s": 1,
        "time": "daylight",
        "chapter": "The planet",
        "over": [
          18.65,
          -133.8
        ],
        "card": {
          "title": "Olympus Mons",
          "body": "The largest volcano we know of on any planet. It is more than twenty kilometres high, and its base would cover Arizona. Mars has no moving plates, so the lava kept piling up in one place for a very long time."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 16153
      },
      {
        "id": "valles",
        "target": {
          "world": "mars"
        },
        "frame_radii": 1.7,
        "drift_deg": 10,
        "drift_rate_deg_s": 1,
        "time": "daylight",
        "chapter": "The planet",
        "over": [
          -13.9,
          -59.2
        ],
        "card": {
          "title": "Valles Marineris",
          "body": "A canyon nearly four thousand kilometres long, which on Earth would reach from one side of the United States to the other. In places it is nine kilometres deep. It began as a crack, when the volcanoes beside it swelled and the ground split."
        },
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "viking-1",
        "target": {
          "site": "viking-1"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Where we landed",
        "card": {
          "title": "The first to stay",
          "body": "Viking 1 landed here in the summer of 1976 and worked for six years. Its twin came down on the other side of the planet six weeks later. They tested the soil for life, and the answer was unclear. That is why we kept coming back."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17818
      },
      {
        "id": "opportunity",
        "target": {
          "site": "opportunity"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Where we landed",
        "card": {
          "title": "Built for ninety days",
          "body": "Opportunity was built to last ninety Martian days. It drove forty-five kilometres in more than fourteen years, and found rocks that could only have formed in water. A dust storm that covered the whole planet ended it in 2018."
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
        "id": "gale",
        "target": {
          "site": "gale"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Where we landed",
        "card": {
          "title": "Curiosity, climbing a mountain",
          "body": "Curiosity is the size of a small car and runs on the heat of plutonium, so dust on solar panels cannot stop it. Since 2012 it has been climbing a mountain of layered rock in the middle of this crater, reading a wet Mars turning into a dry one."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 18817
      },
      {
        "id": "elysium",
        "target": {
          "site": "elysium"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Where we landed",
        "card": {
          "title": "InSight, listening",
          "body": "InSight never moved. It set a seismometer on the ground and listened, and heard more than thirteen hundred marsquakes. From the way they echoed, we know Mars has a core of liquid metal. Dust covered its solar panels, and it fell silent in 2022."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17152
      },
      {
        "id": "jezero",
        "target": {
          "site": "jezero"
        },
        "distance_km": 900,
        "time": "daylight",
        "chapter": "Where we landed",
        "card": {
          "title": "Perseverance, and a helicopter",
          "body": "Perseverance landed in this crater in 2021, where a river once ran into a lake. It is filling tubes with rock for a later mission to bring home. It carried a small helicopter, Ingenuity, which made seventy-two flights: the first powered flights on another world."
        },
        "frame_radii": 5.0,
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 17485
      },
      {
        "id": "phobos",
        "target": {
          "world": "phobos"
        },
        "frame_radii": 5,
        "key_light_deg": 50,
        "chapter": "Around it",
        "card": {
          "title": "Phobos, and Deimos",
          "body": "Mars has two small moons shaped like potatoes. This is Phobos, about twenty-two kilometres across, so close in that it goes round three times a day. Deimos is half the size and further out. Phobos is slowly falling: in some fifty million years it will break up, or hit Mars."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19150
      },
      {
        "id": "seasons",
        "target": {
          "world": "mars"
        },
        "frame_radii": 2.6,
        "time": "daylight",
        "chapter": "Around it",
        "over": [
          72,
          0
        ],
        "live_note": "season",
        "card": {
          "title": "Ice, and seasons",
          "body": "Mars is tilted about as much as the Earth, so it has seasons, each nearly twice as long as ours. Every winter part of its thin air freezes onto the pole as dry-ice frost, and every spring it blows away again. Under the frost is a cap of water ice."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
        "ease": "auto",
        "on_unresolved": "drop",
        "dwell_ms": 19150
      }
    ],
    "estimate_ms": 210015
  }
];
