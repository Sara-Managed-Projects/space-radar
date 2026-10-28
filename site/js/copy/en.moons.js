// The words of the moons layer and the companions layer (release 1.5.0, internal spec 0079 stage A3, internal i#1061).
//
// ADDED TO THE SAME `COPY` OBJECT, like copy/en.w3e.js, and imported only by the module that builds the records (data/moons.js)
// and by the card, which is itself outside the first visit: a first visit does not fetch it (registry/budgets.yaml).
// It needs the card's other words to be there first, so it imports copy/en.later.js (the card's templates) before it adds to them.
import { COPY } from './en.js';
import './en.later.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // ui/moonfacts.js (the rows under a moon's first sentence) and data/moons.js (the lines it writes into each record).
  moonCard: {
    // The first sentence: ui/cards.js TEMPLATES.moon.
    lead: '{name} is a moon of {planet}',
    leadBackwards: '{name} is a moon of {planet}, going round the opposite way to the way {planet} spins',
    leadFar: '{name} is a moon of {parent}',
    leadFarKnown: '{name} is a moon of {parent}, found in {year}',
    leadAsteroid: '{name} is a moon of the asteroid {parent}',
    leadAsteroidKnown: '{name} is a moon of the asteroid {parent}, found in {year}',
    leadFarWorld: '{name} is a moon of the far world {parent}',
    across: 'about {n} km across',
    acrossAtMost: 'under {n} km across',
    lap: 'taking {n} to go round',
    lapDays: '{n} days',
    lapYears: '{n} years',
    lapHours: '{n} hours',
    distance: '{n} km from {planet}’s centre on average',
    found: 'found in {year}',
    size: 'its size is not measured',
    clsIllustrative: 'orbit from JPL’s ephemeris, the place on it illustrative',
    // The rows. Their order is the order they are pushed in.
    rows: {
      orbits: 'Goes round',
      lap: 'One lap',
      mean: 'Average distance from {planet}’s centre',
      shape: 'Shape of the orbit',
      across: 'Across',
      found: 'Found',
      designation: 'Provisional name',
      place: 'Its place on the orbit',
      moonOf: 'Moon of',
      separation: 'Average distance from its parent',
      reported: 'Reported by',
      lapKnown: 'One lap, from the report',
    },
    values: {
      km: '{n} km',
      days: '{n} days',
      years: '{n} years',
      hours: '{n} hours',
      shapeNear: 'almost a circle (eccentricity {e})',
      shape: 'an ellipse (eccentricity {e})',
      shapeLong: 'a long ellipse (eccentricity {e})',
      acrossMeasured: '{n} km',
      acrossRange: '{lo} to {hi} km',
      acrossAtMost: 'under {n} km',
      acrossNone: 'not measured',
      foundBy: '{year}, by {by}',
      foundYear: '{year}',
      placeGood: 'kept within {deg}° of JPL’s in the {n} moons of its kind that were checked, ten and twenty-two months after {epoch}',
      placeLost: 'not known: moons of its kind were up to {deg}° from JPL’s within a year of {epoch}',
      placeUnchecked: 'not known: JPL has no position for it now',
      sameAsParent: 'drawn at its parent: JPL holds no orbit round it',
      backwards: 'against the planet’s spin',
      forwards: 'with the planet’s spin',
    },
    // ui/cardfacts.js honestyClause prints `orbitKnown` after the class line. {epoch} is a date, {deg} degrees.
    orbitKnown: 'the orbit is JPL’s for {epoch}, from the satellite ephemeris, and the moon is carried along it by JPL’s mean period; moons of this kind (a lap of 100 days or more, an orbit the Sun does not bend far) were checked against JPL on {days}, {n} of them, and none was more than {deg}° from where JPL puts it',
    orbitKnownLost: 'the orbit is JPL’s for {epoch}, from the satellite ephemeris, and it is real; carried along by JPL’s mean period, moons of this kind (a fast lap, or an orbit the Sun bends hard) were up to {deg}° from where JPL puts them within a year, so where this moon is on its orbit is not known to us and the mark on it is illustrative',
    orbitKnownUnchecked: 'the orbit is JPL’s mean orbit for {epoch}, because JPL has no position for this moon on 1 January 2026, and the moon is carried along it by JPL’s mean period; nothing could be checked, so where it is on the orbit is illustrative',
    orbitFar: 'the size, shape and lap of the orbit are from the paper named below; its tilt and where the moon is on it are not known to us, so the ring is drawn flat in the ecliptic and the mark on it is illustrative',
    orbitFarTilted: 'the size, shape, lap and tilt of the orbit are from the paper named below; where the moon is on it is not known to us, so the mark on it is illustrative',
    orbitFull: 'the orbit and the moon’s place on it are from the paper named below, dated {epoch}; the farther the clock is from that day the less the place can be trusted',
    atParent: 'JPL holds no orbit for it round {parent}: it is drawn at {parent}’s place, and its distance from {parent} is not drawn',
    // The "drawn as" line: a moon with no shape model is a mark. A real model, when one is made, replaces it.
    drawn: 'drawn as a point on its orbit: nobody has photographed its shape, so none is drawn',
    drawnBig: 'drawn as a point on its orbit: its size is measured but its shape is not, so none is drawn',
    // The line a candidate dwarf planet's card carries for what is not settled.
    candidate: '{name} is a large object beyond Neptune that may be a dwarf planet; the IAU has not decided it',
    candidateWhy: 'Size: {src}.',
    // Honesty clause for the dwarf-planet candidates' orbit: the same one the other bodies of the far-bodies layer carry.
    sourceMoons: 'NASA/JPL Solar System Dynamics, planetary satellite mean elements and discovery circumstances (ssd.jpl.nasa.gov/sats), read {read}; the orbit on {epoch} from JPL Horizons',
    sourceCompanion: 'NASA/JPL Small-Body Database, satellites of {parent} (ssd-api.jpl.nasa.gov/sbdb.api), read {read}',
    sourceFar: '{ref}; read through the Wikipedia article on {name} (CC BY-SA 4.0) on {read}',
    sourceBody: 'NASA/JPL Small-Body Database, {name} (orbit solved {solution}), read {read}',
  },
});

// Sentences the card builds in its own places: added to the groups they belong to.
COPY.klass.moon = 'Moon';
COPY.templates.moon = COPY.moonCard; // the card reads COPY.templates[klass]
COPY.klassFar.candidate = 'Dwarf-planet candidate';
COPY.templates.asteroid.leadCandidate = '{name} is a large object beyond Neptune that may be a dwarf planet, which the IAU has not decided';

// The names the sidebar and the layer list give the two layers (ui/whattoshow.js reads layer.display; these are the sentences
// under them, data/layers.js `sentence`).
Object.assign(COPY.moonCard, {
  layerMoons: 'Every moon of Jupiter, Saturn, Uranus, Neptune and Pluto that the map had no record of, each on its orbit on 1 January 2026.',
  layerCompanions: 'The moons of asteroids and of the far worlds, the dwarf planets’ moons among them, and the large objects beyond Neptune that may be dwarf planets.',
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
