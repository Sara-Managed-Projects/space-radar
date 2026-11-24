// The words of a card's "Pictures and news" (ui/cardmedia.js, forge internal #556): photographs our registries already
// credit, the Journal's posts about the object, our long reads, the agency's own pages and the archives to search.
// ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by ui/cardmedia.js only, which the card
// fetches when the row is first opened. The row's own name is copy/en.later.js's (COPY.mediaRow), because the card shows it.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  media: {
    pictures: 'Photographs',
    journal: 'From the Journal',
    reads: 'Long reads',
    pages: 'Official pages',
    archives: 'Search the archives',
    // Every item carries who made it and under what terms (CC BY 4.0 asks for the credit "in a clear and readable manner").
    credit: '{credit}, {licence}',
    photoAlt: '{name}, photographed by {by}',
    photoAltPlain: 'A photograph of {name}',
    photoOpen: 'The picture on {site}',
    own: 'Our own picture',
    posted: 'Posted {date}',
    readOnTitle: 'The long read, with its pictures, on this site',
    onJournal: 'On the Journal',
    pageTitle: '{name}: the agency’s own page, in a new tab',
    nasa: 'NASA Image and Video Library',
    nasaTitle: 'NASA’s pictures, films and sounds of {name}, in a new tab',
    esahubble: 'ESA/Hubble pictures',
    esahubbleTitle: 'ESA/Hubble’s pictures of {name}, in a new tab',
    esawebb: 'ESA/Webb pictures',
    esawebbTitle: 'ESA/Webb’s pictures of {name}, in a new tab',
    archivesNote: 'These open the archives’ own search for the name; their terms are on their pages, and we show nothing of theirs here.',
    empty: 'We have no photograph, post or long read about {name} yet. The archives below may have some.',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
