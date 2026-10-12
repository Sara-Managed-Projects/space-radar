// The four sections of copy/en.later.js that ui/cardfacts.js reads (internal #429).
//
// WHY A THIRD FILE. The light embed prints a tag line from the card's facts, and cardfacts.js used to
// import all of copy/en.later.js (45 kB) for these four sections. They live here and are ADDED TO THE
// SAME `COPY` OBJECT; copy/en.later.js imports this file, so a module that imports that one still
// finds them, and ui/cardfacts.js imports only this. Same rule as en.later.js: no module in the boot
// graph may import it (tests/test_boot_diet.mjs).
import { COPY } from './en.js';

Object.assign(COPY, {
  klass: {
    station: 'Station',
    satellite: 'Satellite',
    debris: 'Debris',
    rocket: 'Rocket',
    probe: 'Probe',
    telescope: 'Telescope',
    asteroid: 'Asteroid',
    comet: 'Comet',
    site: 'Ground site',
    world: 'World',
    star: 'Star',
    exoplanet: 'Planet of another star',
    dso: 'Deep-sky object',
    exotic: 'Extreme object',
    storm: 'Tropical cyclone',
    // A wildfire, an erupting volcano or an iceberg from NASA's EONET (data/eonet.js).
    earthevent: 'Event on Earth',
    // Not a physical class -- a curatorial one. A golf ball, a car and a photograph have nothing
    // in common except that somebody sent them and nobody had to.
    oddity: 'Oddity',
    unknown: 'Object',
  },

  // Spec 0013 requirement 4, and spec 0001 principle 2 made visible.
  cls: {
    // An asteroid or comet on its two-body ellipse while within 0.05 au of the Earth (ui/cards.js nearEarthOnEllipse).
    nearEarthApprox: 'This close to the Earth its place is approximate: the orbit drawn is round the Sun alone and leaves out the Earth’s pull.',
    label: 'How we know where it is',
    measured: 'measured position',
    inferred: 'position propagated from elements {n} {unit} old',
    inferredUnknownAge: 'position propagated from elements of unknown age',
    // For a record with NO elements at all: a surface object drawn at a surveyed point near it.
    // "Position propagated from elements of unknown age" was printed under Alan Shepard's golf
    // balls, which have no elements and were never propagated from anything.
    inferredNoElements: 'position worked out rather than measured',
    // A storm's centre is measured, at one moment; this is the half of the line that says which.
    stormAdvisory: 'its centre at the {time} UTC advisory, {ago}; a storm moves, so it has moved since',
    // With the advisory's date, when the clock stands on another UTC day (public #330).
    stormAdvisoryDated: 'its centre at the {time} UTC advisory of {date}, {ago}; a storm moves, so it has moved since',
    illustrative: 'drawn to show where it goes; the real track is not public',
    // A dot of the "All tracked debris" layer: its orbit's height and tilt are the catalogue's.
    placeIllustrative: 'its real orbit, from CelesTrak’s catalogue, at a made-up place along it; we hold no current elements for it',
    sample: 'bundled sample data, not a live position',
    // spec 0026 req 15: a fresh launch the public catalogue has not numbered yet.
    provisional: 'not yet in the public catalogue — these are the operator’s own elements, published through CelesTrak; a permanent number comes when Space-Track lists it',
    unknown: 'we cannot say how this position was worked out',
    // A record with no position at all -- not a failed calculation, an absent fact. It reads
    // where the class line reads for everything else, so the card never has an empty honesty slot.
    unplaced: 'nobody knows where this is, so nothing is drawn for it',
    // The ADDITION to the inferred line, for a set of elements whose last observation is much
    // older than the epoch they are integrated from. The Roadster's elements are stated at a 2026
    // epoch and rest on 374 photographs that stopped in March 2018.
    inferredArc: 'the last time anybody saw it was {date}, and {caveat}',
    // Two numbers for two things. "The golf balls are at the Apollo 14 site (+/- 0.4 m)" is
    // false; this is the sentence that is true.
    precisionSplit:
      "{anchorName} is measured to {anchorM} m; this was {how} and is placed to within {objectM} m",
    precisionSplitUnknown:
      '{anchorName} is measured to {anchorM} m; this object itself has never been surveyed',
    // The THIRD case, and the golf balls are the reason. Somebody did find them -- Saunders, in
    // enhanced film -- and nobody published how closely. "never been surveyed" throws away the
    // finding; a metre figure invents the error bar. This says both halves and neither more.
    precisionSplitHowOnly:
      '{anchorName} is measured to {anchorM} m; this object was {how}, and nobody has published '
      + 'how closely',
    precisionOwn: 'located to within {objectM} m, {how}',
    // For a thing that is bolted to another thing. It has no position of its own and never will:
    // the class line above already printed the CARRIER's class, because the carrier's fields are
    // what was propagated. This says whose position that was, so the card is never surer of
    // itself than the spacecraft it is riding on.
    aboard: 'this is {carrier}’s own position, because the object is bolted to the outside of it and goes where it goes',
    how: {
      surveyed: 'surveyed from orbit',
      photogrammetric: 'found in photographs',
      orbital_imaging: 'found in orbital images',
      unsurveyed: 'never surveyed',
      map_reference: 'taken from a map',
    },
    hourWord: 'hour',
    hoursWord: 'hours',
    dayWord: 'day',
    daysWord: 'days',
    minuteWord: 'minute',
    minutesWord: 'minutes',
    yearWord: 'year',
    yearsWord: 'years',
  },

  unplaced: {
    why: '{whyUnknown}',
  },

  // ------------------------------------------------------------------------------------
  // The ten class templates. Each is a lead plus optional clauses; cards.js adds clauses
  // in order while the sentence stays under 160 characters, and never invents a number.
  // The "why now" clause is first in every list, per spec 0013's template table.
  // ------------------------------------------------------------------------------------
  // The card of a wildfire, a volcano or an iceberg (ui/cards.js; data/eonet.js says what each
  // field is). Nothing here is a number: the dates, the size and the names are EONET's.
  earthEvent: {
    kinds: { wildfire: 'Fire', volcano: 'Erupting volcano', iceberg: 'Iceberg' },
    rows: { kind: 'What it is', reported: 'Last report', since: 'Erupting since', first: 'First reported', size: 'Size', where: 'Where', by: 'Reported by' },
    sizeValue: '{n} km²',
    sizeSmall: 'under 1 km²',
    // {agencies} are the ids EONET gives its sources (IRWIN, GDACS, SIVolcano, NATICE).
    by: '{agencies}, through NASA EONET',
    sky: 'It is on the ground. From orbit a fire is a plume of smoke, a volcano a column of ash, an iceberg a white slab on dark water.',
    drawn: 'drawn as a mark at its last reported place; its extent on the ground is not drawn',
    // The honesty line: what the point is, whose it is, and the publisher's own caveat in plain words.
    honesty: 'One point from NASA’s EONET, last reported {date} and read {read}. For looking, not an official record of where or when.',
  },
});
