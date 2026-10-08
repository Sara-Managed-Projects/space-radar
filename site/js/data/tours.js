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
"next": "life-of-a-star",
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
"id": "roof-to-the-edge",
"title": "From your roof to the edge",
"blurb": "One flight out past the Moon, the planets and the stars, and one flight home.",
"requires": [
"stars",
"galaxy"
],
"stage": "earth",
"clock": "as-found",
"group": "beyond",
"next": "to-the-edge",
"requires_observer": true,
"og_stop": 8,
"orbits": [
"moon",
"mercury",
"venus",
"earth",
"mars",
"jupiter",
"saturn",
"uranus",
"neptune"
],
"return": true,
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "roof",
"target": {
"observer": true
},
"distance_km": 200,
"time": "tonight",
"chapter": "From the ground",
"look": {
"best": "star"
},
"card": {
"title": "Your roof, tonight",
"body": "This is the sky over your own place as tonight's dark arrives. Every point of light up there is somewhere. We are going to fly out past all of them, and after the first lift off the ground the camera will not cut once."
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
"id": "earth",
"target": {
"world": "earth"
},
"frame_radii": 6,
"drift_deg": 12,
"chapter": "From the ground",
"card": {
"title": "The Earth",
"body": "Everyone you know is on this ball, 12 742 kilometres across. The satellites round it are where they are right now. From here on, keep your eye on the middle of the screen."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 13489
},
{
"id": "moon-orbit",
"target": {
"world": "earth"
},
"stage": "earth",
"distance_km": 850000,
"drift": "none",
"chapter": "The Solar System",
"climb": true,
"card": {
"title": "The Moon's orbit",
"body": "The Moon goes round the Earth about 384 400 kilometres out, once in 27.3 days. Light crosses that gap in 1.3 seconds. Nobody has travelled further from home than this."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 12490
},
{
"id": "planets",
"target": {
"world": "sun"
},
"stage": "sun",
"distance_km": 11000000000,
"drift": "none",
"chapter": "The Solar System",
"climb": true,
"card": {
"title": "The planets",
"body": "The Earth has shrunk to a dot on the third ring. Neptune, on the outer ring, is thirty times as far from the Sun as we are, and sunlight takes four hours to reach it."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 14155
},
{
"id": "oort",
"target": {
"world": "sun"
},
"stage": "stellar",
"distance_km": 7479893535000,
"drift": "none",
"chapter": "The Solar System",
"climb": true,
"card": {
"title": "The Oort cloud's distance",
"body": "The planets are now inside one pixel. Comets come from a cloud of icy bodies thought to lie between 5 000 and 100 000 times the Earth's distance from the Sun. Nothing is drawn here because none of them has ever been seen in place."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17485
},
{
"id": "nearest-stars",
"target": {
"world": "sun"
},
"stage": "stellar",
"needs_layer": "stars",
"distance_km": 170293148506454,
"drift_deg": 10,
"chapter": "The stars",
"climb": true,
"card": {
"title": "The nearest stars",
"body": "The Sun is one star among its neighbours. The nearest, Proxima Centauri, is 4.2 light-years away, and its two companions are the nearest stars you can see without a telescope. Each point here is a star at its measured distance."
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
"id": "radio",
"target": {
"world": "sun"
},
"stage": "stellar",
"needs_layer": "stars",
"distance_km": 4730365236290400,
"drift": "none",
"chapter": "The stars",
"climb": true,
"card": {
"title": "How far our radio has got",
"body": "The sphere marks how far radio from the Earth can have travelled since Marconi's signal crossed the Atlantic on 12 December 1901. It grows by one light-year a year. Out here the signal is far too faint to pick up. Everything humans have ever broadcast is inside it."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "milky-way",
"target": {
"record": "dso-milky-way"
},
"stage": "galaxy",
"needs_layer": "galaxy",
"distance_km": 1419109570887120000,
"drift_deg": 10,
"chapter": "The galaxies",
"climb": true,
"card": {
"title": "The Milky Way",
"body": "Between one and four hundred billion stars, and the Sun is one of them, about 27 000 light-years from the centre. The shape is a model built from measurements. Nobody has seen our galaxy from outside."
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
"id": "local-group",
"target": {
"world": "sun"
},
"stage": "local-group",
"needs_layer": "deep-sky",
"distance_km": 56764382835484800000,
"drift": "none",
"chapter": "The galaxies",
"climb": true,
"card": {
"title": "The Local Group",
"body": "Our galaxy and Andromeda, 2.5 million light-years apart, are the two large members of a group of more than a hundred galaxies, most of them small. Gravity holds this group together while the universe around it expands."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 14821
},
{
"id": "edge",
"target": {
"world": "sun"
},
"stage": "local-group",
"distance_km": 1500000000000000000000000,
"drift": "none",
"chapter": "The edge",
"climb": true,
"card": {
"title": "The oldest light",
"body": "The sphere is the edge of what can be seen at all. The microwave background, light released about 380 000 years after the Big Bang, reaches us from this surface, now 46.5 billion light-years away. It is a horizon around us, not a wall. Every place has its own."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18817
}
],
"estimate_ms": 211701
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
"key_light_deg": 60,
"chapter": "Chapter one: Jupiter's moons",
"card": {
"title": "Io, the moon Jupiter never lets rest",
"body": "Io goes round Jupiter every 42 hours, pulled one way by the planet and the other by two moons further out, in time with it. All that kneading has to go somewhere, and it comes out of hundreds of volcanoes."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
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
"key_light_deg": 90,
"chapter": "Chapter one: Jupiter's moons",
"card": {
"title": "Europa, and the two ships on their way",
"body": "Under that ice is twice as much water as every ocean on Earth put together. Europa Clipper reaches Jupiter in April 2030 to fly past here 49 times and ask whether anything could live down there; Europe's JUICE arrives in 2031 and ends up circling Ganymede."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
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
"key_light_deg": 90,
"chapter": "Chapter two: the ringed planet",
"card": {
"title": "Enceladus, spraying its ocean into space",
"body": "Cassini found the jets in 2005, coming off the south pole at four hundred metres a second, and flew straight through them. They carry water, salt, silica and more organic material than anyone expected, and they have not stopped: the dust keeps one of Saturn's outer rings supplied."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
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
"key_light_deg": 100,
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
"og_stop": 9,
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
"next": "satellites-and-junk",
"og_stop": 5,
"hides": [
"launches",
"just-launched",
"starlink-trains"
],
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
"noon"
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
"distance_km": 6000,
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
"distance_km": 6000,
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
"orbits": [
"moon"
],
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
"title": "The Moon's month, from above",
"body": "We are far above the north pole. The ring is the path the Moon takes round the Earth, once a month, thirty Earths out. Both worlds are drawn larger than they are here, so you can see that the Sun lights the same half of each of them, all the time."
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
"id": "waxing",
"target": {
"world": "moon"
},
"frame_radii": 5.2,
"drift_deg": 0,
"time": "2027-01-13T00:00:00Z",
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
"estimate_ms": 150358
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
"body": "These are the paths of the four inner planets, and the third dot is home. Sunlight takes eight minutes and twenty seconds to get there, so we always see the Sun as it was eight minutes ago. A cloud of gas thrown out by the Sun takes from under a day to several days."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
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
"estimate_ms": 150691
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
"body": "Just too faint for most eyes, though binoculars will find it if you know where to look. It was the first planet discovered with a telescope. It lies on its side, so for a quarter of its long year the Sun shines down on one pole, while the other half of the planet has a dark winter twenty-one years long."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
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
"estimate_ms": 183703
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
"next": "asteroids-that-come-close",
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
},
{
"id": "life-of-a-star",
"title": "The life of a star",
"blurb": "From a cloud of gas to a pulsar: one real star at each age, then back to Earth.",
"requires": [
"stars",
"deep-sky"
],
"stage": "stellar",
"clock": "as-found",
"group": "beyond",
"next": "black-holes",
"og_stop": 1,
"hides": [
"exoplanets",
"systems",
"galaxy",
"exotics"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "nursery",
"target": {
"record": "dso-m42"
},
"needs_layer": "deep-sky",
"distance_km": 302743375122586,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Being born",
"exposure": "deep",
"card": {
"title": "Where stars are born",
"body": "This is the Orion Nebula, an enormous cloud of gas and dust more than a thousand light-years away. Gravity pulls its thickest knots together. Where a knot grows hot enough in the middle, a star switches on. Vast numbers of new stars are being made here right now."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "young",
"target": {
"record": "dso-m45"
},
"needs_layer": "deep-sky",
"distance_km": 122989496143550,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Being born",
"card": {
"title": "A family of young stars",
"body": "The Pleiades are about a hundred million years old, which for a star is childhood. More than a thousand of them are held loosely together by gravity. The brightest are hot and blue, and the blue haze is a cloud of dust they happen to be passing through."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "sun",
"target": {
"world": "sun"
},
"stage": "sun",
"frame_radii": 3.6,
"drift_deg": 10,
"chapter": "The long middle",
"card": {
"title": "A star in the middle of its life",
"body": "Our Sun is four and a half billion years old, and a little less than half way through its life. Deep inside, it turns hydrogen into helium, and that is what makes it shine. Nine stars in ten are in this steady middle age, which lasts for millions or billions of years."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19816
},
{
"id": "giant",
"target": {
"sky": [
213.9,
22.0
]
},
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "Growing old",
"figures": [
"Boo"
],
"figure_stars": 1,
"zoom": 0.9,
"card": {
"title": "What the Sun will become",
"body": "The orange star is Arcturus. It weighs about the same as the Sun, but it is older, and the hydrogen in its core has run out. So it has swollen to twenty-five times the Sun's width. In about five billion years, the Sun will become a red giant too."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18817
},
{
"id": "supergiant",
"target": {
"sky": [
84.5,
2.0
]
},
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "Growing old",
"figures": [
"Ori"
],
"figure_stars": 2,
"zoom": 0.9,
"card": {
"title": "A heavy star, near its end",
"body": "Betelgeuse, the red shoulder of Orion, has about fifteen times the Sun's mass. Heavy stars burn fast: it is only about ten million years old and already near its end. Put it where the Sun is and it would reach past Jupiter. One day it will explode."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18151
},
{
"id": "letting-go",
"target": {
"record": "dso-helix-nebula"
},
"needs_layer": "deep-sky",
"distance_km": 85146574253227,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "The end of a star like the Sun",
"exposure": "deep",
"card": {
"title": "A star letting go",
"body": "A star like the Sun does not explode. Late in its life it blows its outer layers away into space, and they glow like this. This is the Helix Nebula, six hundred and fifty light-years away. The small, very hot star at its centre is all that is left: a white dwarf."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19816
},
{
"id": "white-dwarf",
"target": {
"sky": [
101.3,
-18.0
]
},
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "The end of a star like the Sun",
"figures": [
"CMa"
],
"figure_stars": 1,
"zoom": 0.9,
"card": {
"title": "What is left: a white dwarf",
"body": "Sirius, the brightest star in the night sky, has a companion we do not draw: it is ten thousand times fainter. It is a white dwarf, the core of a dead star. It holds nearly the mass of the Sun in a ball about the size of the Earth, slowly cooling."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19483
},
{
"id": "explosion",
"target": {
"record": "dso-m1"
},
"needs_layer": "deep-sky",
"distance_km": 189214609451616,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "The end of a heavy star",
"card": {
"title": "A star that blew up",
"body": "A heavy star ends differently. Its core collapses and the rest is blown into space. People saw this one happen: in the year 1054 Chinese astronomers recorded a new star that could be seen in daylight for nearly a month. This is the wreck today, the Crab Nebula."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "pulsar",
"target": {
"record": "dso-m1"
},
"needs_layer": "deep-sky",
"distance_km": 113528765670970,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "The end of a heavy star",
"card": {
"title": "The heart of the wreck",
"body": "At the centre is what remains of the star's core: a ball about twenty kilometres across with the mass of a sun, spinning thirty times a second. It is called a pulsar. It is far too small to see, but the blue glow in the middle is its doing. An even heavier star leaves a black hole."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
}
],
"estimate_ms": 201685
},
{
"id": "black-holes",
"title": "Black holes",
"blurb": "Three real black holes: where they are and how we know. Then back to Earth.",
"requires": [
"stars",
"exotics",
"deep-sky"
],
"stage": "stellar",
"clock": "as-found",
"group": "beyond",
"next": "through-a-telescope",
"og_stop": 5,
"hides": [
"exoplanets",
"systems",
"galaxy"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "swan",
"target": {
"sky": [
300.0,
37.0
]
},
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "One you can point to",
"figures": [
"Cyg"
],
"figure_stars": 2,
"zoom": 0.85,
"exposure": "deep",
"card": {
"title": "A black hole you can point to",
"body": "This is the Swan, flying along the Milky Way. In its neck is Cygnus X-1, the first thing in the sky that astronomers agreed was a black hole. You cannot see it. Nobody can. It was found in 1964, because it is one of the strongest sources of X-rays in the sky."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19816
},
{
"id": "what",
"target": {
"record": "exotic-cygnus-x-1"
},
"needs_layer": "exotics",
"distance_km": 132450226616131216,
"drift_deg": 6,
"drift_rate_deg_s": 0.5,
"key_light_deg": 90,
"chapter": "One you can point to",
"card": {
"title": "What a black hole is",
"body": "Seven thousand light-years from home. A black hole is a place where gravity is so strong that nothing gets out, not even light. This one has about twenty times the mass of the Sun. The mark in the middle is ours. The scatter of dots to one side is home: the stars this map has measured."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "from-home",
"target": {
"sky": [
266.4,
-27.0
]
},
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "The one at the centre",
"figures": [
"Sgr",
"Sco"
],
"figure_stars": 1,
"zoom": 0.85,
"exposure": "deep",
"card": {
"title": "The centre of the galaxy, from home",
"body": "Look past the spout of the Teapot, where the Milky Way is brightest. Twenty-seven thousand light-years that way is the centre of our galaxy. In the middle of it sits a black hole four million times as massive as the Sun."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16153
},
{
"id": "centre",
"target": {
"record": "exotic-sgr-a-star"
},
"needs_layer": "exotics",
"distance_km": 18921460945161600,
"drift_deg": 8,
"drift_rate_deg_s": 0.6,
"chapter": "The one at the centre",
"portrait": true,
"card": {
"title": "Sagittarius A star",
"body": "Nobody can see this black hole itself. Astronomers watched a star go round it, once every sixteen years, at millions of kilometres an hour, and worked out what it must be circling. Then eight radio observatories, working as one telescope the size of the Earth, made this picture: glowing gas, and a shadow in the middle."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "m87",
"target": {
"record": "exotic-m87-star"
},
"needs_layer": "exotics",
"distance_km": 1892146094516160000,
"drift_deg": 8,
"drift_rate_deg_s": 0.6,
"chapter": "The first picture",
"portrait": true,
"card": {
"title": "The first picture of a black hole",
"body": "Far beyond our own galaxy, in a galaxy called M87, is a black hole with the mass of six and a half billion Suns. This is the first picture ever made of one, taken by eight radio telescopes working together. The dark middle is its shadow, and it is far wider than our whole Solar System."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "sun",
"target": {
"world": "sun"
},
"stage": "sun",
"frame_radii": 3.6,
"drift_deg": 10,
"chapter": "What they are not",
"card": {
"title": "Nothing to fear",
"body": "The Sun will never be a black hole: only stars many times heavier end that way. And if you swapped the Sun for a black hole of the same mass, the planets would stay in their orbits. It would only get a lot colder. The nearest black hole we know is about fifteen hundred light-years away."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
}
],
"estimate_ms": 136069
},
{
"id": "through-a-telescope",
"title": "The sky as telescopes see it",
"blurb": "Real photographs, each where it is in the sky. Leaving goes back to Earth.",
"requires": [
"stars",
"deep-sky"
],
"stage": "stellar",
"clock": "as-found",
"group": "beyond",
"next": "a-dark-sky",
"og_stop": 5,
"hides": [
"exoplanets",
"systems",
"exotics",
"galaxy"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "eye",
"target": {
"record": "dso-m42"
},
"needs_layer": "deep-sky",
"distance_km": 283821914177424,
"drift_deg": 0,
"key_light_deg": 0,
"chapter": "One nebula, three ways",
"exposure": "eye",
"card": {
"title": "With your own eyes",
"body": "This is the Orion Nebula roughly as your eye would see it at a telescope: a faint grey glow. The gas is real, but it is faint, and in the dark the eye sees no colour. It cannot save up light the way a camera can."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17818
},
{
"id": "camera",
"target": {
"record": "dso-m42"
},
"needs_layer": "deep-sky",
"distance_km": 283821914177424,
"drift_deg": 0,
"key_light_deg": 0,
"chapter": "One nebula, three ways",
"exposure": "camera",
"card": {
"title": "With a camera",
"body": "A camera can keep its shutter open and let the light pile up. Now the colour is there. It was always there. The red is hydrogen gas. This picture was taken through colour filters with an extra one for glowing hydrogen, so the red is stronger than an eye would find it."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19816
},
{
"id": "deep",
"target": {
"record": "dso-m42"
},
"needs_layer": "deep-sky",
"distance_km": 283821914177424,
"drift_deg": 3,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "One nebula, three ways",
"exposure": "deep",
"card": {
"title": "A long exposure",
"body": "Stretch a long exposure further and the faintest outer parts appear. Every picture on this trip is a real photograph, placed where it is in the sky. The line below each one says who took it."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 14488
},
{
"id": "horsehead",
"target": {
"record": "dso-horsehead-nebula"
},
"needs_layer": "deep-sky",
"distance_km": 283821914177424,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Clouds where stars form",
"exposure": "deep",
"card": {
"title": "The Horsehead",
"body": "Just beside Orion's belt, a dark cloud of dust stands in front of glowing gas, in the shape of a horse's head. Here the colours are chosen. The camera took the light of single gases through narrow filters, and each gas was given a colour so the eye can tell them apart."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19816
},
{
"id": "carina",
"target": {
"record": "dso-carina-nebula"
},
"needs_layer": "deep-sky",
"distance_km": 2365182618145200,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Clouds where stars form",
"exposure": "camera",
"card": {
"title": "The Carina Nebula",
"body": "A great cloud in the southern sky, in the constellation of the Keel. Monster stars live inside it. Their fierce winds and ultraviolet light are carving the gas into the shapes you see: walls, pillars and hollows, lit from within."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15820
},
{
"id": "webb",
"target": {
"record": "dso-tarantula-nebula"
},
"needs_layer": "deep-sky",
"distance_km": 3311255665403280,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Clouds where stars form",
"exposure": "camera",
"card": {
"title": "What Webb saw in the Tarantula",
"body": "This picture is the Webb telescope's own. It is made in infrared light, which no eye can see, so every colour in it is chosen. Infrared passes through dust, and here it shows tens of thousands of young stars that no telescope had seen before. The picture is 340 light-years across, in a small galaxy beside ours."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "trifid",
"target": {
"record": "dso-m20"
},
"needs_layer": "deep-sky",
"distance_km": 548722367409686,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Clouds where stars form",
"exposure": "camera",
"card": {
"title": "The Trifid, from the newest telescope",
"body": "The Trifid Nebula, with the dark lanes that give it its name. This picture is among the very first from the Vera Rubin Observatory in Chile, released in June 2025. For ten years that telescope will photograph the southern sky every few nights."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16819
},
{
"id": "whirlpool",
"target": {
"record": "dso-m51"
},
"needs_layer": "deep-sky",
"distance_km": 1324502266161312000,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Other galaxies",
"exposure": "deep",
"card": {
"title": "Another galaxy",
"body": "Now far beyond our own galaxy. The Whirlpool is a spiral galaxy tens of millions of light-years away, seen face on. A smaller galaxy is passing behind it and tugging on one arm. The pink knots along the arms are clouds of hydrogen where new stars are forming."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "andromeda",
"target": {
"record": "dso-m31"
},
"needs_layer": "deep-sky",
"distance_km": 1419109570887120128,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "Other galaxies",
"exposure": "deep",
"card": {
"title": "A galaxy you can see for yourself",
"body": "Andromeda, the nearest large galaxy to our own, two and a half million light-years off. You can see it without any telescope, as a faint smudge. How well you see it, like everything on this trip, depends on how dark your sky is."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16819
}
],
"estimate_ms": 190030
},
{
"id": "a-dark-sky",
"title": "A dark sky",
"blurb": "Your sky from a city, a town and a dark place. It moves the clock to tonight.",
"requires": [
"worlds"
],
"stage": "earth",
"clock": "as-found",
"group": "earth-orbit",
"next": "tonight-from-your-street",
"requires_observer": true,
"og_stop": 6,
"hides": [
"aurora",
"storms",
"lightning",
"visual",
"notable",
"just-launched",
"starlink-trains",
"launches"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "lights",
"target": {
"world": "earth"
},
"frame_radii": 2.2,
"drift_deg": 14,
"time": "2027-01-10T21:00:00Z",
"chapter": "The light we make",
"over": [
38,
20
],
"card": {
"title": "The Earth at night",
"body": "This is the night side of the Earth, and every glow on it is a town. Some of that light never reaches a street. It goes up, or sideways, and lights the air. More than eight people in ten now live under a sky polluted by light."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18151
},
{
"id": "above",
"target": {
"observer": true
},
"distance_km": 900,
"drift_deg": 16,
"time": "tonight",
"chapter": "The light we make",
"card": {
"title": "Your own sky, tonight",
"body": "Here is your part of the world as tonight's dark arrives. We are going down to the ground to look up at one patch of sky, three times. First as a city shows it, then from a town's edge, then from somewhere properly dark."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17152
},
{
"id": "city",
"target": {
"observer": true
},
"distance_km": 400,
"time": "night",
"chapter": "One sky, three ways",
"look": {
"best": "milky-way"
},
"darkness": "city",
"card": {
"title": "From a city",
"body": "From the middle of a city, only the brightest stars get through, with the planets and the Moon. The sky itself glows. Whatever lies behind that glow is still there, every night. It is only outshone."
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
"id": "town",
"target": {
"observer": true
},
"distance_km": 400,
"time": "night",
"chapter": "One sky, three ways",
"look": {
"best": "milky-way"
},
"darkness": "town",
"card": {
"title": "From the edge of a town",
"body": "Away from the centre, the same patch of sky holds many more stars, and the figures of the constellations fill in. Low down there is still a dome of light over the place you left."
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
"id": "dark",
"target": {
"observer": true
},
"distance_km": 400,
"time": "night",
"chapter": "One sky, three ways",
"look": {
"best": "milky-way"
},
"darkness": "dark",
"card": {
"title": "From a dark place",
"body": "Far from any town, on a night with no Moon, there are more stars than you can count, and they lie thickest along one band of the sky. That band is the Milky Way: our own galaxy, seen from inside. One person in three alive today cannot see it from where they live."
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
"id": "cost",
"target": {
"world": "earth"
},
"frame_radii": 1.9,
"drift_deg": 12,
"time": "2027-01-11T06:00:00Z",
"chapter": "What it costs, and what to do",
"over": [
38,
-95
],
"card": {
"title": "What the light costs",
"body": "It is not only the stars. Birds that travel at night are drawn towards lights, young turtles crawl towards streets instead of the sea, and it is bad for our own health. The night sky has been getting nearly a tenth brighter every year. But this pollution is gone the moment a lamp is shaded or switched off."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "find",
"target": {
"observer": true
},
"distance_km": 1500,
"drift_deg": 14,
"time": "tonight",
"chapter": "What it costs, and what to do",
"card": {
"title": "How to find the dark",
"body": "Look at the lights around your own place, and pick a gap between them. Go there in the week around new Moon, when the Moon is out of the evening sky. Give your eyes half an hour in the dark, without a screen, and look up."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17818
}
],
"estimate_ms": 145214
},
{
"id": "asteroids-that-come-close",
"title": "Asteroids, and the ones that come close",
"blurb": "The belt, the rocks that pass us, and how we moved one. Then back to Earth.",
"requires": [
"worlds",
"asteroids",
"far-bodies",
"deep-space"
],
"stage": "sun",
"clock": "as-found",
"group": "solar-system",
"next": "comets-and-meteors",
"og_stop": 4,
"orbits": [
"earth",
"mars",
"jupiter"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "belt",
"target": {
"world": "sun"
},
"distance_km": 1500000000,
"drift_deg": 0,
"chapter": "The belt",
"names": true,
"card": {
"title": "The asteroid belt",
"body": "Between the paths of Mars and Jupiter there are more than a million rocks, left over from the making of the planets about four and a half billion years ago. It is mostly empty space: all of them together weigh less than our Moon. The map draws the few it carries, each where it is today."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "ceres",
"target": {
"record": "dwarf-ceres"
},
"needs_layer": "far-bodies",
"distance_km": 600000,
"chapter": "The belt",
"card": {
"title": "Ceres, the largest",
"body": "Ceres is about nine hundred and fifty kilometres across and holds a quarter of the belt's whole mass. It is round, so it counts as a dwarf planet. A spacecraft called Dawn reached it in 2015, the first visit to a dwarf planet, and found large deposits of salt in its crust."
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
"id": "near",
"target": {
"world": "earth"
},
"distance_km": 30000000,
"drift_deg": 0,
"time": "now",
"chapter": "Near the Earth",
"live_note": "close-approach",
"names": true,
"card": {
"title": "The ones that come close",
"body": "Some asteroids have paths that bring them near the Earth's. More than forty thousand have been found, ten thousand of them in the last three years. Telescopes find them, and each one's path is worked out for a hundred years ahead. The line below names the next one to pass."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19150
},
{
"id": "didymos",
"target": {
"record": "asteroid-65803"
},
"needs_layer": "asteroids",
"distance_km": 400000,
"chapter": "Moving one",
"card": {
"title": "The asteroid we moved",
"body": "Didymos has a small moon. In 2022 a spacecraft called DART was flown straight into that moon at more than six kilometres a second, on purpose. Its orbit became thirty-two minutes shorter. It was the first time people changed the motion of anything in the sky."
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
"id": "hera",
"target": {
"record": "deep-hera"
},
"needs_layer": "deep-space",
"distance_km": 400000,
"chapter": "Moving one",
"card": {
"title": "Hera, going to check",
"body": "This is Hera, a European spacecraft sent to the same pair of asteroids, due there in November 2026. It will survey the little moon after the crash and measure its mass, to turn that one experiment into a method that can be repeated if a dangerous rock is ever found."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19150
},
{
"id": "bennu",
"target": {
"record": "asteroid-101955"
},
"needs_layer": "asteroids",
"distance_km": 400000,
"chapter": "Moving one",
"card": {
"title": "Bennu, and a handful brought home",
"body": "Bennu is about half a kilometre wide. A spacecraft touched it, collected a hundred and twenty grams, and dropped them in the Utah desert in 2023: the largest asteroid sample ever brought home. In that dust were sugars and other molecules that, on Earth, are key to life."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18484
},
{
"id": "apophis",
"target": {
"record": "asteroid-99942"
},
"stage": "earth",
"needs_layer": "asteroids",
"distance_km": 30000,
"behind": "earth",
"time": "2029-04-13T21:45:00Z",
"rate": 60,
"chapter": "Keeping watch",
"card": {
"title": "Apophis passes the Earth",
"body": "One pass is already in the calendar. This rock, Apophis, is about three hundred and forty metres across, and this is the evening it comes closest: about thirty-two thousand kilometres above the ground, inside the ring of satellites that carry television. It will miss. The path drawn here is the one predicted at NASA's Jet Propulsion Laboratory."
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
"id": "home",
"target": {
"world": "earth"
},
"stage": "earth",
"frame_radii": 4,
"key_light_deg": 60,
"time": "now",
"chapter": "Keeping watch",
"card": {
"title": "Are we safe?",
"body": "For the large ones, yes. The vast majority of the asteroids bigger than a kilometre have been found, and none of the forty thousand known is a threat in the next hundred years. But only about a third of the middle-sized ones have been found. The search goes on."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18817
}
],
"estimate_ms": 180035
},
{
"id": "satellites-and-junk",
"title": "Satellites and space junk",
"blurb": "Everything working in orbit today, the ring that stands still, and the junk.",
"requires": [
"stations",
"notable",
"visual",
"worlds"
],
"stage": "earth",
"clock": "as-found",
"group": "earth-orbit",
"next": "people-in-space",
"og_stop": 2,
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "one",
"target": {
"layer": "stations",
"catalog": "25544"
},
"distance_km": 2600,
"chapter": "What is up there",
"card": {
"title": "Start with one",
"body": "This is the International Space Station, about four hundred kilometres up. It moves at eight kilometres every second and circles the Earth sixteen times a day. Hold on to that height and that speed. Nearly everything else on this trip shares them."
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
"id": "all",
"target": {
"world": "earth"
},
"needs_layer": "active",
"frame_radii": 3.4,
"drift_deg": 16,
"chapter": "What is up there",
"live_note": "satellites",
"card": {
"title": "Everything that works",
"body": "Every dot is a working satellite, at the place it is right now. The line below counts them from the catalogue this page loaded today, and counts how many of them belong to a single internet network, Starlink."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15154
},
{
"id": "low",
"target": {
"world": "earth"
},
"needs_layer": "active",
"frame_radii": 1.7,
"drift_deg": 12,
"chapter": "What is up there",
"over": [
48,
10
],
"live_note": "satellites",
"card": {
"title": "The crowded shell",
"body": "Nearly all of them fly low, under two thousand kilometres. Down here a satellite circles the Earth in about ninety minutes, and junk can cross its path at almost seven times the speed of a bullet. That is why even small pieces matter."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16819
},
{
"id": "ring",
"target": {
"world": "earth"
},
"needs_layer": "geo-ring",
"frame_radii": 9.5,
"drift_deg": 10,
"chapter": "What is up there",
"over": [
78,
0
],
"card": {
"title": "The ring that stands still",
"body": "Much higher, nearly thirty-six thousand kilometres up, a satellite takes one day to go round, so from the ground it hangs over one spot. That is why a television dish never has to move. Weather satellites sit here too, each watching one side of the Earth."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17818
},
{
"id": "hubble",
"target": {
"layer": "notable",
"catalog": "20580"
},
"distance_km": 2600,
"chapter": "What is worth protecting",
"card": {
"title": "Worth protecting",
"body": "The Hubble Space Telescope has been up here since 1990, about five hundred kilometres above the ground. Like the weather satellites, and the station with its crew, it depends on the space around it staying clear."
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
"id": "dead",
"target": {
"layer": "debris-notable",
"catalog": "27386"
},
"needs_layer": "debris-notable",
"distance_km": 2600,
"chapter": "The junk",
"card": {
"title": "A dead satellite",
"body": "This is Envisat, once the world's largest civilian Earth-watching satellite. Contact was lost in 2012 and it has circled since, eight tonnes with nobody at the controls. It is expected to stay up for about a hundred and fifty years."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15820
},
{
"id": "rocket",
"target": {
"layer": "visual",
"query": {
"name_contains": "R/B"
},
"pick": "first"
},
"needs_layer": "visual",
"distance_km": 2600,
"chapter": "The junk",
"card": {
"title": "A spent rocket",
"body": "The last stage of a rocket often stays in orbit after its job is done. About two thousand of them are up here now. In all, some forty-seven thousand objects are tracked, and by Europe's estimate more than a million pieces are too small to track."
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
"id": "down",
"target": {
"world": "earth"
},
"frame_radii": 2.4,
"drift_deg": 12,
"chapter": "The junk",
"over": [
-48.9,
-123.4
],
"card": {
"title": "Coming down",
"body": "Thin air drags on everything in low orbit, and in the end it falls and burns. The largest spacecraft are steered down here, to the part of the Pacific farthest from any land. The Mir space station ended here. The International Space Station is due to follow."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 18151
}
],
"estimate_ms": 159354
},
{
"id": "comets-and-meteors",
"title": "Comets and meteor showers",
"blurb": "A comet, its dust and the next shower from your street. Then back to Earth.",
"requires": [
"worlds",
"comets",
"far-bodies",
"asteroids",
"stars"
],
"stage": "sun",
"clock": "as-found",
"group": "solar-system",
"next": "birth-of-the-solar-system",
"requires_observer": true,
"og_stop": 1,
"orbits": [
"earth",
"mars",
"jupiter"
],
"hides": [
"visual",
"notable",
"just-launched",
"starlink-trains",
"launches",
"stations"
],
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "halley",
"target": {
"record": "comet-1P"
},
"needs_layer": "comets",
"distance_km": 9000000000,
"drift_deg": 0,
"chapter": "Comets",
"names": true,
"card": {
"title": "Halley's comet, where it is today",
"body": "The most famous comet is out past Neptune now, at the far end of the long, thin loop drawn here. It last passed the Sun in 1986, and it will be back in 2061. One thing in this picture is not real: the tail. Out there Halley is a dark, frozen lump with no tail at all."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "comet",
"target": {
"record": "comet-1P"
},
"needs_layer": "comets",
"distance_km": 3000000,
"chapter": "Comets",
"card": {
"title": "What a comet is",
"body": "A comet is mostly ice, coated with dark dust, a few kilometres across. Halley reflects only three parts in a hundred of the light that falls on it. As a comet nears the Sun its ice turns to gas, and sunlight and the solar wind blow gas and dust away from the Sun into a long, bright tail."
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
"id": "stranger",
"target": {
"record": "interstellar-2i"
},
"needs_layer": "far-bodies",
"distance_km": 3000000,
"chapter": "Comets",
"card": {
"title": "A comet from another star",
"body": "This one does not belong to the Sun at all. It is called Borisov, after the amateur astronomer who found it in 2019. Its speed and its path show that it came from another star, and it is leaving for good. Three such visitors have been seen so far."
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
"id": "dust",
"target": {
"world": "earth"
},
"distance_km": 400000000,
"drift_deg": 0,
"chapter": "Meteor showers",
"card": {
"title": "Where shooting stars come from",
"body": "A comet leaves a trail of dusty debris along its path. Where the Earth passes through one, the dust hits our air at tens of thousands of kilometres an hour and burns up. Most of the pieces are between a grain of sand and a pea. That is a meteor shower, and it comes back every year."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "phaethon",
"target": {
"record": "asteroid-3200"
},
"needs_layer": "asteroids",
"distance_km": 400000,
"chapter": "Meteor showers",
"card": {
"title": "A shower from a rock",
"body": "One of the best showers of the year, the Geminids in December, does not come from a comet. It comes from this asteroid, Phaethon, whose path takes it closer to the Sun than Mercury. Nobody is sure whether it is a rock that behaves like a comet or a comet that has died."
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
"id": "radiant",
"target": {
"sky": [
44.0,
52.0
]
},
"stage": "stellar",
"drift_deg": 3,
"drift_rate_deg_s": 0.25,
"chapter": "Meteor showers",
"figures": [
"Per",
"Cas"
],
"figure_stars": 1,
"zoom": 0.9,
"card": {
"title": "Why a shower has a name",
"body": "The meteors of one shower all seem to come from one point in the sky, and a shower is named for the figure that point is in. The Perseids of August seem to come from here, in Perseus. The figure is only a signpost. The meteors themselves are dust from a comet called Swift-Tuttle."
},
"frame_radii": 5.0,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 20000
},
{
"id": "tonight",
"target": {
"observer": true
},
"distance_km": 300,
"time": "midnight",
"chapter": "From your street",
"look": {
"shower": "next"
},
"darkness": "dark",
"card": {
"title": "The next shower, from where you are",
"body": "This is your own sky in the middle of tonight, and the ring marks where the next shower's meteors will seem to come from. You do not need to stare at that point. Meteors appear all over the sky. The line below says which shower it is and when it peaks."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19483
},
{
"id": "watch",
"target": {
"observer": true
},
"distance_km": 1500,
"drift_deg": 14,
"time": "tonight",
"chapter": "From your street",
"card": {
"title": "How to watch one",
"body": "Go somewhere away from the lights and lie on your back. After about half an hour in the dark your eyes adapt, and you begin to see meteors. The hours before dawn are usually the best. Bring something warm."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15487
}
],
"estimate_ms": 180587
},
{
"id": "birth-of-the-solar-system",
"title": "The birth of the Solar System",
"blurb": "The story science tells, told over real places. Leaving goes back to Earth.",
"requires": [
"worlds",
"deep-sky",
"asteroids",
"far-bodies"
],
"stage": "sun",
"clock": "as-found",
"group": "solar-system",
"next": "outer-solar-system",
"og_stop": 4,
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
"id": "cloud",
"target": {
"record": "dso-m42"
},
"stage": "stellar",
"needs_layer": "deep-sky",
"distance_km": 302743375122586,
"drift_deg": 4,
"drift_rate_deg_s": 0.3,
"key_light_deg": 0,
"chapter": "A cloud falls in",
"exposure": "deep",
"card": {
"title": "It began in a cloud like this",
"body": "Nobody saw the Solar System form. This trip is the story the evidence tells, shown over real places. It starts about four and a half billion years ago, in a dense cloud of gas and dust like this one in Orion, when part of it collapsed."
},
"frame_radii": 5.0,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17818
},
{
"id": "flat",
"target": {
"world": "jupiter"
},
"distance_km": 1500000000,
"behind": "sun",
"drift_deg": 0,
"chapter": "A cloud falls in",
"card": {
"title": "Why it is flat",
"body": "The collapsing cloud became a spinning, swirling disc, and the planets grew inside that disc. That is why, seen from the side like this, their paths still lie almost in one sheet."
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
"id": "sun",
"target": {
"world": "sun"
},
"frame_radii": 3.6,
"drift_deg": 10,
"chapter": "A cloud falls in",
"card": {
"title": "Nearly all of it became the Sun",
"body": "At the centre, gravity pulled more and more material in, until it was hot and dense enough to shine. That is the Sun, and it took almost everything: out of every thousand parts of the Solar System, nine hundred and ninety-eight are in it."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17152
},
{
"id": "rock",
"target": {
"world": "mercury"
},
"stage": "mercury",
"frame_radii": 4,
"key_light_deg": 55,
"chapter": "Building worlds",
"card": {
"title": "Close in, only rock",
"body": "Near the young Sun, only rocky material could stand the heat. That is why the four planets closest to the Sun are small and made of rock: Mercury, Venus, the Earth and Mars. Mercury's surface is still scarred with the craters of countless impacts."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17152
},
{
"id": "giant",
"target": {
"world": "jupiter"
},
"stage": "jupiter",
"frame_radii": 4,
"key_light_deg": 55,
"chapter": "Building worlds",
"card": {
"title": "Far out, giants",
"body": "Further out, where it was cold, ice and gas could gather too, and that is where the giant planets formed. Jupiter took most of what was left over after the Sun: more than twice as much material as every other planet, moon and rock put together."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 17818
},
{
"id": "leftovers",
"target": {
"record": "asteroid-4"
},
"needs_layer": "asteroids",
"distance_km": 400000,
"chapter": "What was left over",
"card": {
"title": "The leftovers",
"body": "Between Mars and Jupiter the building never finished. The pull of newly formed Jupiter stopped the pieces from coming together and made them collide instead. This is Vesta, the second most massive of them. Meteorites knocked off it still fall on the Earth."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16819
},
{
"id": "moon",
"target": {
"world": "moon"
},
"stage": "moon",
"frame_radii": 3.4,
"key_light_deg": 60,
"chapter": "What was left over",
"card": {
"title": "How the Earth got its Moon",
"body": "The early Solar System was violent. The leading account of the Moon is that a large body, which scientists have named Theia, struck the young Earth, and the Moon formed from the material flung into space. Rocks brought back by the Apollo astronauts match the Earth's too closely for chance."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19150
},
{
"id": "far",
"target": {
"world": "pluto"
},
"stage": "pluto",
"frame_radii": 4,
"key_light_deg": 55,
"chapter": "What was left over",
"card": {
"title": "The frozen edge",
"body": "Beyond Neptune lies a wide belt of icy bodies, Pluto among them, left over from the beginning. Neptune's pull stirred this region so much that they never came together into a planet. Some of our comets come from here."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15487
},
{
"id": "home",
"target": {
"world": "earth"
},
"stage": "earth",
"frame_radii": 4,
"key_light_deg": 60,
"chapter": "What was left over",
"card": {
"title": "And here we are",
"body": "That is the story as the evidence tells it today: from meteorites, from the Moon's rocks, and from the paths of the planets themselves. Parts of it will change as we learn more. The places were all real."
},
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15154
}
],
"estimate_ms": 179856
},
{
"id": "back-to-the-moon",
"title": "Back to the Moon",
"blurb": "Artemis: round the Moon again, and where they mean to land. Then back to Earth.",
"requires": [
"hand-kept-sites",
"worlds"
],
"stage": "moon",
"clock": "as-found",
"group": "solar-system",
"next": "moon-landings",
"og_stop": 5,
"pacing": "auto",
"min_stops": 3,
"stops": [
{
"id": "last",
"target": {
"site": "apollo-17"
},
"distance_km": 900,
"time": "daylight",
"chapter": "The long gap",
"card": {
"title": "The last footprints",
"body": "This valley is where people last stood on the Moon. In December 1972 two astronauts of Apollo 17, Gene Cernan and Harrison Schmitt, drove away from here, climbed into their lander, and left. For more than fifty years after that, nobody travelled further from the Earth than a space station."
},
"frame_radii": 5.0,
"drift_deg": 34,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19150
},
{
"id": "launch",
"target": {
"world": "earth"
},
"stage": "earth",
"frame_radii": 2.4,
"drift_deg": 10,
"time": "now",
"chapter": "Artemis",
"over": [
28.6,
-80.6
],
"card": {
"title": "Four people leave again",
"body": "Then four people left from this coast of Florida, on a flight called Artemis Two: Reid Wiseman, Victor Glover, Christina Koch and, from Canada, Jeremy Hansen. They were the first crew to leave the Earth's neighbourhood since Apollo."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 15154
},
{
"id": "far-side",
"target": {
"world": "moon"
},
"frame_radii": 3.4,
"drift_deg": 12,
"chapter": "Artemis",
"over": [
0,
180
],
"card": {
"title": "Round the far side",
"body": "They did not land. Their ship swung once round the far side of the Moon, the side we never see from home, and at its farthest it was more than four hundred and six thousand kilometres from the Earth, further than Apollo 13. No people had ever been so far away."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19483
},
{
"id": "earth-from-there",
"target": {
"world": "earth"
},
"distance_km": 90000,
"drift_deg": 8,
"key_light_deg": 60,
"chapter": "Artemis",
"card": {
"title": "Home, from out there",
"body": "From out here the whole Earth is a small, bright ball in the dark. The flight lasted nine days and ended with a splashdown in the sea. It was a test of the ship and of the people, for what comes next."
},
"frame_radii": 5.0,
"drift_rate_deg_s": 6,
"drift": "toward-light",
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 16486
},
{
"id": "south-pole",
"target": {
"world": "moon"
},
"frame_radii": 2.2,
"drift_deg": 10,
"chapter": "What comes next",
"over": [
-84,
0
],
"card": {
"title": "Where they mean to land",
"body": "This is the Moon's south pole. Some crater floors here never receive light from the Sun, and they have kept water ice for billions of years. Ice is water to drink, air to breathe and fuel for the journey home. This is the region the Artemis flights are meant to explore."
},
"drift_rate_deg_s": 6,
"drift": "toward-light",
"key_light_deg": 125,
"ease": "auto",
"on_unresolved": "drop",
"dwell_ms": 19483
}
],
"estimate_ms": 106506
}
];
