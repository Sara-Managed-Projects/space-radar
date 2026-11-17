// The words of release 2.0.0 batch f4-cards: the Wikipedia block of a card and its Read aloud button (ui/wikicard.js,
// forge #151). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by ui/wikicard.js, ui/truthlegend.js and
// (for the Sun, the Moon and the planets) ui/cards.js when a card opens, never at boot: a first visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
// Where each paragraph of worldAbout below was read: the page's title and its address on science.nasa.gov (names, not words to translate).
export const WORLD_ABOUT_PAGES = {
  sun: ["Our Sun: Facts", "sun"],
  earth: ["Earth", "earth"],
  moon: ["Moon Facts", "moon/facts"],
  mercury: ["Mercury Facts", "mercury/facts"],
  venus: ["Venus Facts", "venus/facts"],
  mars: ["Mars Facts", "mars/facts"],
  jupiter: ["Jupiter Facts", "jupiter/facts"],
  saturn: ["Saturn Facts", "saturn/facts"],
  uranus: ["Uranus Facts", "uranus/facts"],
  neptune: ["Neptune Facts", "neptune/facts"],
};

const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  wikiCard: {
    // The block's microlabel and its region's name for a screen reader.
    label: 'From Wikipedia',
    // Under the words, always: whose they are, that they are quoted and not checked, and when they were read.
    quotedLive: 'Quoted from Wikipedia as it reads today, not checked by us.',
    quotedBaked: 'Quoted from Wikipedia as it read on {date}, not checked by us.',
    textCredit: 'Text: Wikipedia contributors, CC BY-SA 4.0.',
    readArticle: 'Read the whole article',
    // When the page speaks another language and Wikipedia has no article in it.
    inEnglish: 'There is no article in this language yet, so this is the English one.',
    // A satellite with no article of its own, described by its fleet's.
    family: 'About {fleet} as a whole: there is no article for this one satellite.',
    photo: 'Photo: {artist}, {licence}, via Wikimedia Commons.',
    photoNoArtist: 'Photo: {licence}, via Wikimedia Commons.',
    photoAlt: 'The picture at the top of the Wikipedia article {title}',
    loading: 'Asking Wikipedia…',
    // Read aloud: the device's own voice (speechSynthesis), nothing recorded, nothing sent.
    read: 'Read aloud',
    readTitle: "Read this card aloud in your device's own voice",
    stop: 'Stop reading',
    reading: 'Reading aloud',
  },
  // The Sun, the Moon and the planets: a paragraph of our own for each, from its NASA Science page, shown in place of the
  // Wikipedia extract (internal #302). Here and not in en.js because a card fetches this file when it opens, not at boot.
  // registry/worlds.yaml `facts.about` says what each page said and the day it was read.
  worldAbout: {
    about: {
      sun: "The Sun is a star: a ball of very hot, glowing gas, mostly hydrogen and helium, about 4.5 billion years old. It is about 100 times wider than the Earth. Its core is about 15 million degrees Celsius, hot enough for nuclear fusion, and the energy that comes out is what most life on Earth depends on. Its gravity holds the whole solar system together.",
      moon: "The Moon is the Earth’s only natural satellite, less than a third of Earth’s width. It is a cratered ball of rock, about 384 000 km away on average. It goes round the Earth once in about 27 days and turns once in the same time, so we always see the same side. The dark patches are plains of old lava. It is the only world beyond Earth that people have visited so far.",
      mercury: "Mercury is the smallest planet and the closest to the Sun, only a little bigger than the Moon. Its rocky ground is covered in craters. It has almost no air to hold the heat, so it swings from about 430 °C by day to about minus 180 °C at night. It goes round the Sun in 88 days, faster than any other planet.",
      // ONE VALUE PER QUANTITY (review 2026-11-16). The NASA page this paragraph follows says 467 C, 93 times and
      // 12 756 km (the Earth's equatorial width); the Compare table and every page's Key facts use NSSDCA's Venus and
      // Earth fact sheets: 737 K (464 C), 92 bars, and the mean width 12 742 km (2 x 6371.0). The paragraph now says
      // those, so a visitor does not meet two temperatures for one ground
      // (https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html, .../earthfact.html, read 2026-11-16).
      venus: "Venus is nearly the size of the Earth: 12 104 km across, against 12 742. Its thick air is mostly carbon dioxide, with clouds of sulphuric acid, and it traps heat. The ground is about 464 °C, hotter than Mercury and hot enough to melt lead, and the air presses on it about 92 times harder than on Earth. Venus spins slowly and backwards: one turn takes 243 Earth days, longer than its year of 225.",
      earth: "Earth is the only place we know that has living things. It is the only planet with liquid water on its surface, and most of it is covered by ocean. One turn takes 23.9 hours and one trip round the Sun 365.25 days, which is why we add a leap day every four years. Sunlight takes about eight minutes to get here.",
      mars: "Mars is a cold, dusty desert about half as wide as the Earth. Iron in its rocks and dust has rusted, which makes it look red. It has the biggest volcano in the solar system, Olympus Mons, and a canyon system, Valles Marineris, more than ten times longer and wider than the Grand Canyon. Rivers and lakes once flowed there; now the air is thin and its water is ice or very salty.",
      jupiter: "Jupiter is the biggest planet: 11 times wider than the Earth, with room for about a thousand Earths inside. It is mostly hydrogen and helium, with no solid ground to stand on. Its stripes are cold, windy clouds of ammonia and water. The Great Red Spot is a storm wider than the Earth that people have watched for more than 300 years. One turn takes only 9.9 hours, the shortest day of any planet.",
      saturn: "Saturn is a ball of mostly hydrogen and helium, 9 times wider than the Earth. Its rings are billions of pieces of ice and rock, from dust grains to chunks as big as houses. They reach out about 282 000 km, yet are usually only about 10 metres thick. Saturn is the only planet less dense than water, so a bath big enough would float it.",
      uranus: "Uranus is an ice giant four times wider than the Earth, found in 1781 by William Herschel with a telescope. Most of it is a hot, dense fluid of water, methane and ammonia. Methane in its air soaks up red light, which gives it a blue-green colour. It is tipped over by about 98 degrees, so it rolls round the Sun on its side, and each pole has about 21 years of dark winter.",
      neptune: "Neptune is an ice giant four times wider than the Earth, and the only planet you cannot see with your eyes alone. Noon there is as dim as our twilight. One year takes about 165 Earth years. It was found in 1846 by sums first: Urbain Le Verrier worked out where it must be from the odd motion of Uranus, and Johann Galle saw it the first night he looked.",
    },
    // The line under it. {page} is the page's title and {path} its address on science.nasa.gov.
    source: 'NASA Science, {page} (science.nasa.gov/{path}/), read 15 November 2026',
  },
  // The star and deep-sky words (internal #300), registry/glossary.yaml word for word. The legend (ui/truthlegend.js) reads them.
  glossaryMore: {
    "black hole": "A place where gravity is so strong that nothing, not even light, can get out. It is not a hole but a lot of matter packed into a small space.",
    "neutron star": "What a massive star can leave behind when it dies: more than the Sun's mass squeezed into a ball about as wide as a city.",
    "pulsar": "A neutron star that spins fast and sends out beams like a lighthouse. We see a blink each time a beam sweeps across us.",
    "white dwarf": "The hot core left when a star like the Sun has shed its outer layers. About as big as the Earth, it makes no new heat and slowly cools.",
    "brown dwarf": "An object too big to be a planet and too small to shine like a star: about 13 to 80 times Jupiter's mass. It gives out almost no visible light.",
    "nebula": "A cloud of gas and dust in space. Some glow, some hide the stars behind them, and in some of them new stars are forming.",
    "galaxy": "A huge family of stars, gas and dust held together by gravity. Ours, the Milky Way, is a spiral about 100 000 light-years across.",
    "globular cluster": "A ball of tens of thousands to millions of stars packed tightly together by gravity, thickest at the centre.",
    "habitable zone": "The range of distances from a star where a planet could have liquid water on its surface. It says life might be possible there, not that any lives there.",
    "exoplanet": "A planet that goes round a star other than the Sun.",
    "redshift": "Light stretched to longer, redder waves, because its source is moving away or space has stretched on the way. For far galaxies, more redshift means farther away.",
    "supernova": "The explosion of a star at the end of its life, or of a white dwarf. For a few weeks it can shine as bright as a whole galaxy.",
    "light curve": "A graph of how bright something is over time. A pulse or a dip in it can show a star that swells and shrinks, or something passing in front.",
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
