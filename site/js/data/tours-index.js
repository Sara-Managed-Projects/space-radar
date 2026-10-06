// GENERATED from registry/tours.yaml by scripts/gen_tours_js.py. Do not edit.
//
// `python3 scripts/gen_tours_js.py --check` fails CI if this file and the YAML disagree.
//
// THE TRIPS' INDEX: what a first visit carries about them (internal #405). One small row per trip,
// enough to draw its card; the stops are in data/tours.js, which is fetched with ui/trip.js when a
// trip is opened, deep-linked or planned (ui/tripgate.js). Nothing in the boot graph may import
// data/tours.js: tests/test_first_visit_bytes.mjs counts it.

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

/** One row per trip, for its card: no stops. `count` and `estimate_ms` are the registry's, before a stop is dropped for today's sky; `event` is the type an event trip is timed by. */
export const TOURS_INDEX = [
{
"id": "people-in-space",
"title": "Where people are living in space right now",
"blurb": "The only two places above you tonight with people inside them.",
"group": "earth-orbit",
"next": "strangest-things",
"min_stops": 3,
"count": 4,
"estimate_ms": 62028
},
{
"id": "journey-to-the-station",
"title": "From your ground to the space station",
"blurb": "Straight up to the station and its next pass. The clock moves, then goes back.",
"group": "earth-orbit",
"next": "people-in-space",
"requires_observer": true,
"min_stops": 3,
"count": 4,
"estimate_ms": 67023,
"event": "station-pass"
},
{
"id": "strangest-things",
"title": "The strangest things we have ever sent",
"blurb": "A family photograph, two golf balls, a library, a record and a car.",
"group": "solar-system",
"next": "moon-landings",
"min_stops": 3,
"count": 6,
"estimate_ms": 94707
},
{
"id": "to-the-edge",
"title": "To the edge of what we know",
"blurb": "From the Sun to a photographed black hole. Leaving brings you back to Earth.",
"group": "beyond",
"next": "life-of-a-star",
"min_stops": 3,
"count": 8,
"estimate_ms": 141556
},
{
"id": "roof-to-the-edge",
"title": "From your roof to the edge",
"blurb": "One flight out past the Moon, the planets and the stars. Leaving returns you.",
"group": "beyond",
"next": "to-the-edge",
"requires_observer": true,
"min_stops": 3,
"count": 10,
"estimate_ms": 190701
},
{
"id": "travel-to-exoplanets",
"title": "Travel to exoplanets",
"blurb": "Other stars' planets, then TRAPPIST-1's seven. Leaving brings you back to Earth.",
"group": "beyond",
"next": "to-the-edge",
"min_stops": 3,
"count": 11,
"estimate_ms": 183564
},
{
"id": "moon-landings",
"title": "Where we have landed on the Moon",
"blurb": "Landings from the first to the private ones. Leaving brings you back to Earth.",
"group": "solar-system",
"next": "outer-solar-system",
"min_stops": 3,
"count": 10,
"estimate_ms": 205686
},
{
"id": "outer-solar-system",
"title": "Out past Jupiter, to the farthest thing we sent",
"blurb": "Ten stops through the cold outer worlds. Leaving brings you back to Earth.",
"group": "solar-system",
"next": "to-the-edge",
"min_stops": 3,
"count": 10,
"estimate_ms": 211715
},
{
"id": "a-year-in-a-minute",
"title": "A year in a minute",
"blurb": "A year of orbits in a minute. Leaving puts the clock back and you back to Earth.",
"group": "solar-system",
"next": "outer-solar-system",
"min_stops": 3,
"count": 4,
"estimate_ms": 73683
},
{
"id": "chasing-the-solar-eclipse",
"title": "Chasing the solar eclipse",
"blurb": "The next total eclipse's shadow crossing the Earth. This trip moves the clock.",
"group": "events",
"min_stops": 3,
"count": 5,
"estimate_ms": 96849,
"event": "solar-eclipse"
},
{
"id": "the-constellations",
"title": "The constellations",
"blurb": "Twelve figures of the night sky, drawn star by star. Leaving goes back to Earth.",
"group": "beyond",
"next": "to-the-edge",
"min_stops": 3,
"count": 12,
"estimate_ms": 274320
},
{
"id": "the-living-earth",
"title": "The living Earth",
"blurb": "One planet's cycles with today's data: storms, sea, ice. It moves the clock.",
"group": "earth-orbit",
"next": "satellites-and-junk",
"min_stops": 3,
"count": 12,
"estimate_ms": 275950
},
{
"id": "tonight-from-your-street",
"title": "Tonight from your street",
"blurb": "Your own sky tonight: a star, a figure, the Moon, a planet, the station's pass.",
"group": "earth-orbit",
"next": "planets-tonight",
"requires_observer": true,
"min_stops": 3,
"count": 7,
"estimate_ms": 143514,
"event": "station-pass"
},
{
"id": "moon-phases",
"title": "Why the Moon changes shape",
"blurb": "The Moon's month from space, then from your street. This trip moves the clock.",
"group": "earth-orbit",
"next": "tonight-from-your-street",
"requires_observer": true,
"min_stops": 3,
"count": 7,
"estimate_ms": 150358,
"event": "lunar-eclipse"
},
{
"id": "the-sun-today",
"title": "The Sun today",
"blurb": "Our star, its wind, and tonight's aurora forecast. Leaving goes back to Earth.",
"group": "solar-system",
"next": "planets-tonight",
"min_stops": 3,
"count": 7,
"estimate_ms": 150691
},
{
"id": "planets-tonight",
"title": "The planets tonight",
"blurb": "Every planet in turn, then where to look tonight. Leaving goes back to Earth.",
"group": "solar-system",
"next": "mars-where-we-have-driven",
"requires_observer": true,
"min_stops": 3,
"count": 9,
"estimate_ms": 183703
},
{
"id": "mars-where-we-have-driven",
"title": "Mars, where we have driven",
"blurb": "A volcano, a canyon, five landing sites and a moon. Leaving goes back to Earth.",
"group": "solar-system",
"next": "asteroids-that-come-close",
"min_stops": 3,
"count": 10,
"estimate_ms": 210015
},
{
"id": "life-of-a-star",
"title": "The life of a star",
"blurb": "From a cloud of gas to a pulsar: one real star at each age, then back to Earth.",
"group": "beyond",
"next": "black-holes",
"min_stops": 3,
"count": 9,
"estimate_ms": 201685
},
{
"id": "black-holes",
"title": "Black holes",
"blurb": "Three real black holes: where they are and how we know. Then back to Earth.",
"group": "beyond",
"next": "through-a-telescope",
"min_stops": 3,
"count": 6,
"estimate_ms": 136069
},
{
"id": "through-a-telescope",
"title": "The sky as telescopes see it",
"blurb": "Real photographs, each where it is in the sky. Leaving goes back to Earth.",
"group": "beyond",
"next": "a-dark-sky",
"min_stops": 3,
"count": 9,
"estimate_ms": 190030
},
{
"id": "a-dark-sky",
"title": "A dark sky",
"blurb": "Your sky from a city, a town and a dark place. It moves the clock to tonight.",
"group": "earth-orbit",
"next": "tonight-from-your-street",
"requires_observer": true,
"min_stops": 3,
"count": 7,
"estimate_ms": 145214
},
{
"id": "asteroids-that-come-close",
"title": "Asteroids, and the ones that come close",
"blurb": "The belt, the rocks that pass us, and how we moved one. Then back to Earth.",
"group": "solar-system",
"next": "comets-and-meteors",
"min_stops": 3,
"count": 8,
"estimate_ms": 180035
},
{
"id": "satellites-and-junk",
"title": "Satellites and space junk",
"blurb": "Everything working in orbit today, the ring that stands still, and the junk.",
"group": "earth-orbit",
"next": "people-in-space",
"min_stops": 3,
"count": 8,
"estimate_ms": 159354
},
{
"id": "comets-and-meteors",
"title": "Comets and meteor showers",
"blurb": "A comet, its dust and the next shower from your street. Then back to Earth.",
"group": "solar-system",
"next": "birth-of-the-solar-system",
"requires_observer": true,
"min_stops": 3,
"count": 8,
"estimate_ms": 180587
},
{
"id": "birth-of-the-solar-system",
"title": "The birth of the Solar System",
"blurb": "The story science tells, told over real places. Leaving goes back to Earth.",
"group": "solar-system",
"next": "outer-solar-system",
"min_stops": 3,
"count": 9,
"estimate_ms": 179856
},
{
"id": "back-to-the-moon",
"title": "Back to the Moon",
"blurb": "Artemis: round the Moon again, and where they mean to land. Then back to Earth.",
"group": "solar-system",
"next": "moon-landings",
"min_stops": 3,
"count": 5,
"estimate_ms": 106506
}
];
