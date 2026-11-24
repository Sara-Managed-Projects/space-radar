// The words of the network chips (ui/networks.js, forge internal #555): a row at the top of the Earth tab that lights one
// satellite network on the globe, with how many of it the map holds now. ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's
// sections and imported by ui/networks.js only.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  networks: {
    title: 'Satellite networks',
    names: {
      starlink: 'Starlink', oneweb: 'OneWeb', gps: 'GPS', glonass: 'GLONASS', galileo: 'Galileo', beidou: 'BeiDou', iridium: 'Iridium',
      kuiper: 'Kuiper', qianfan: 'Qianfan', stations: 'Stations', debris: 'Debris', geo: 'Geostationary',
    },
    chipCount: '{name}: {n} on the map now. Light them',
    chipNoCount: '{name}: light them on the map',
    clear: 'Clear',
    clearTitle: 'Put every dot back',
    noteLoad: 'Counts appear once the satellites are loaded: tap a network (7 MB).',
    noteCounted: 'Counted from the catalogue loaded now (CelesTrak), by the names operators give them.',
  },
});

// The section this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
