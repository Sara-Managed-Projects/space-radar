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
    "blurb": "Straight up from where you are, out to the station, and on to the minute it next crosses your sky. This trip moves the clock and puts it back when you leave.",
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
    "blurb": "Every planet we know of around another star, then the seven of TRAPPIST-1 one by one, at their own sizes. Leaving brings you back to Earth.",
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 e",
          "body": "A year here lasts six days. It is nine tenths as wide as the Earth and seven tenths as heavy, and at its closest its neighbour d would look as wide in its sky as the Moon is in ours."
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
        "id": "b",
        "target": {
          "record": "exo-trappist-1-b"
        },
        "stage": "system-trappist-1",
        "frame_radii": 8,
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 b",
          "body": "The innermost, 1.7 million kilometres from its star, over thirty times closer than Mercury is to the Sun. Its year is a day and a half, and it is a tenth wider than the Earth."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 c",
          "body": "The second out, round its star in just under two and a half days. Like b it is a little wider than the Earth and about a third heavier."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 d",
          "body": "Four days a year, and the smallest but one: four fifths of the Earth's width and less than two fifths of its mass."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 f",
          "body": "Nine days a year, and the nearest of the seven to the Earth's own size and mass, a few per cent over on both."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 g",
          "body": "The widest of the seven, thirteen per cent wider than the Earth. Its year lasts twelve and a third days."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter two: the seven of TRAPPIST-1",
        "card": {
          "title": "TRAPPIST-1 h",
          "body": "The outermost and the smallest, three quarters of the Earth's width. A year here is nineteen days, and b goes round twelve times in one of them."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
    "blurb": "The first soft landing, the first people, a rover driven from Earth, the far side, the south pole and the first private landers. Leaving brings you back to Earth.",
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
    "blurb": "Ten stops through the cold half of the Solar System, each world at its true size. Leaving brings you back to Earth.",
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
        "chapter": "Chapter two: the ringed planet",
        "card": {
          "title": "Saturn, and a ring ten metres thick",
          "body": "The rings reach eighty thousand kilometres out from the equator and in places are ten metres from top to bottom. They are almost all water ice. Cassini circled here for thirteen years and finished by flying into the planet in September 2017."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
        "chapter": "Chapter three: the last planet",
        "card": {
          "title": "Triton, going the wrong way round",
          "body": "One spacecraft has ever visited Neptune: Voyager 2, on 25 August 1989. Five hours after passing the planet it flew by Triton, forty thousand kilometres up, and found a surface at minus 235 degrees with geysers going off on it."
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
        "id": "pluto",
        "target": {
          "record": "pluto"
        },
        "stage": "pluto",
        "frame_radii": 9,
        "behind": "charon",
        "chapter": "Chapter four: past Neptune",
        "card": {
          "title": "Pluto and Charon, going round each other",
          "body": "New Horizons crossed this pair on 14 July 2015, nine and a half years out from Earth. It found mountains of water ice, and beside them a plain of nitrogen ice that is still slowly turning over. Sending the pictures home took until October 2016."
        },
        "drift_deg": 34,
        "drift_rate_deg_s": 6,
        "drift": "toward-light",
        "key_light_deg": 125,
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
    "blurb": "The planets going round the Sun, a day every sixth of a second. Leaving puts the clock back and brings you back to Earth.",
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
    "blurb": "The Moon's shadow crossing the Earth at the next total eclipse, to the minute. This trip moves the clock.",
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
  }
];
