// The words of release 2.0.0 batch f4-cards: the Wikipedia block of a card and its Read aloud button (ui/wikicard.js,
// forge #151). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by ui/wikicard.js only,
// which a card fetches when its About it is opened: a first visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
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
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
