// tests/test_datejump_words.mjs -- the date field's chips in the visitor's language, and each date once (2.0.0 look findings 8 and 9).
//
// The final look of 2.0.0 found the "Go to a date" dialog (ui/datejump.js) in German and Arabic with every mission event chip in
// English (their titles are registry/missions.yaml's, read by data/missions.js), and "2007: Fengyun-1C" twice: the cloud's own chip
// (forge #153) beside the Fengyun-1C Moment that joined the shelf later (b200-c3-learn). Held here:
//   - copy/en.find.js dateJump.eventTitles has every event title of the registry, and each of the ten languages translates
//     nearly all of them (a name such as "Arrokoth" may stay);
//   - the dialog, built in a small DOM in German words, prints the translated titles and one Fengyun-1C chip;
//   - how a world is drawn (scene/worlds.js viewScale(id).note, on its card) and a card's breadcrumb read the copy, not English
//     typed in code.
//
//   node tests/test_datejump_words.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.find.js'));
const { MISSIONS } = await import(join(JS, 'data/missions.js'));
const titles = [...new Set(MISSIONS.flatMap((m) => m.events.map((e) => e.title)))];
const E = COPY.dateJump.eventTitles || {};
check(titles.length > 50, `the registry's event titles were read (${titles.length})`);
for (const title of titles) check(E[title] === title, `copy/en.find.js dateJump.eventTitles has "${title}"`);
for (const key of Object.keys(E)) check(titles.includes(key), `dateJump.eventTitles has "${key}", which no event of registry/missions.yaml is titled`);

const LANGS = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh'];
const langs = {};
for (const lang of LANGS) {
  const L = (langs[lang] = await import(join(JS, `copy/${lang}.js`)));
  const own = (L.COPY.dateJump && L.COPY.dateJump.eventTitles) || {};
  const same = titles.filter((x) => !own[x] || own[x] === x);
  check(same.length <= 2, `${lang}: ${same.length} event title(s) left in English: ${same.slice(0, 4).join('; ')}`);
  for (const k of ['nearer', 'asIs']) check(L.COPY.worldView[k] && L.COPY.worldView[k] !== COPY.worldView[k] && L.COPY.worldView[k].includes('{name}'), `${lang}: worldView.${k} is translated and keeps {name}`);
  check(L.COPY.sky.bodies.earth && L.COPY.sky.bodies.earth !== 'Earth', `${lang}: the sky's bare name of the Earth`);
}

// The dialog, built: German titles over the English, as copy/index.js overlay() puts them.
{
  const { install } = await import('./helpers/fakedom.mjs');
  const document = install();
  document.head = document.createElement('head');
  document.querySelectorAll = (sel) => document.head.querySelectorAll(sel);
  const keep = { ...E };
  Object.assign(E, langs.de.COPY.dateJump.eventTitles);
  const ctx = { clock: { now: () => Date.UTC(2026, 10, 8), mode: 'live', goTo() {} }, timePill: null, wantMoment() {}, wantFind: () => Promise.resolve(null), wantMissions: () => Promise.resolve(null) };
  const { openDateJump } = await import(join(JS, 'ui/datejump.js'));
  const api = openDateJump(ctx, null);
  for (let i = 0; i < 50 && !api.root.querySelector('details.sr-datejump__mission'); i += 1) await new Promise((r) => setTimeout(r, 20));
  const chips = api.root.querySelectorAll('button.sr-datejump__chip').map((b) => b.textContent);
  check(chips.length > 100, `the dialog's chips were built (${chips.length})`);
  const fy = chips.filter((c) => c === COPY.momentShelf.cards['fengyun-1c'].title || c === COPY.breakups.moment);
  check(fy.length === 1, `"2007: Fengyun-1C" is one chip, not ${fy.length} (the Moment, with the cloud's own chip only when the shelf has none)`);
  check(chips.includes('Start') && chips.includes('Eagle ist gelandet') && !chips.includes('The Eagle has landed'), 'the mission event chips say their titles in the visitor\'s language');
  Object.keys(E).forEach((k) => { E[k] = keep[k]; });
}

// The scene note and the breadcrumb read the copy.
const worlds = readFileSync(join(JS, 'scene/worlds.js'), 'utf8');
check(!/is drawn in its true direction/.test(worlds) && /t\(COPY\.worldView\.nearer, \{ name: w\.display \}\)/.test(worlds) && /t\(COPY\.worldView\.asIs, /.test(worlds), 'scene/worlds.js says how a world is drawn from COPY.worldView, not in English typed in code');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/const bare = COPY\.sky && COPY\.sky\.bodies && COPY\.sky\.bodies\[id\];/.test(cards), 'a card\'s breadcrumb names a world by the sky\'s bare name in the visitor\'s language ("Sonne", not "Sun")');

if (problems.length) { console.error('date jump words FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`date jump words ok: ${titles.length} event titles in ${LANGS.length} languages, one Fengyun-1C chip, the scene note and the breadcrumb from the copy`);
