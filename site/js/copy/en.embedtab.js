// The words of the share sheet's Embed tab (ui/sharesheet.js, forge internal #554): the code that puts the view on screen
// in someone else's page, a class site or a blog. ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections and
// imported by ui/sharesheet.js only, so nothing reads them until Share is first pressed (a first visit does not fetch them).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  embedTab: {
    tabsLabel: 'Share or embed',
    share: 'Share',
    embed: 'Embed',
    lede: 'Put this live view in your own page: a class site, a blog or a slide.',
    size: 'Size',
    sizes: { small: 'Small', medium: 'Medium', large: 'Large' },
    sizeTitle: '{w} by {h} pixels; it narrows to fit a phone',
    credit: 'Add a credit line under it',
    creditLine: 'Live view by {link}',
    code: 'Code to paste',
    copy: 'Copy embed code',
    copyTitle: 'Copy the code that puts this live view in a web page',
    preview: 'Preview',
    previewTitle: 'Open the embed by itself in a new tab',
    note: 'Readers get the live view and an Open in Space Radar link. Nothing is stored on their device: no cookie, no tracker.',
    docs: 'More sizes, trips and the whole map: the embed page',
  },
});

// The section this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
