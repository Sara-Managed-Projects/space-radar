// tests/test_catalogues.mjs -- the catalogues' shared view (research train "catalogues"; forge #551, #553, #560, #564).
//
//   node tests/test_catalogues.mjs
//
// What it holds: the table sorts numbers by value and text by name with blanks always last, a filter is every word in any
// named field with accents ignored, the rows are cut and counted honestly, a `cat=` link names a catalogue or nothing, the
// saved copy is read before the bundled one, the view is a pushed view of the shell like Find, each catalogue has a door on
// an explore tab, and the shared words exist in all eleven languages.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const kit = await import(join(JS, 'ui/catalogkit.js'));
const { parseCat, catValue, CATALOGUES } = await import(join(JS, 'ui/catalogue.js'));
const { ENTRY_ROWS } = await import(join(JS, 'ui/catalogueentry.js'));
const { VIEWS, sheetFor, crumbFor } = await import(join(JS, 'ui/shell.js'));
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

// --- sorting ----------------------------------------------------------------------------------------------------------
const rows = [{ n: 'b', v: 3 }, { n: 'a', v: null }, { n: 'C', v: 10 }, { n: 'd', v: 2 }, { n: '', v: NaN }];
const byV = { key: 'v', get: (r) => r.v };
const byN = { key: 'n', get: (r) => r.n };
check(kit.sortRows(rows, byV).map((r) => r.n).join() === 'd,b,C,a,', 'numbers sort by value (2, 3, 10), not as text (10, 2, 3), with the blanks last');
check(kit.sortRows(rows, byV, true).map((r) => r.n).join() === 'C,b,d,a,', 'descending keeps the blanks last too');
check(kit.sortRows(rows, byN).map((r) => r.n).join() === 'a,b,C,d,', 'text sorts by name, case ignored, the empty name last');
check(kit.sortRows(rows, byV) !== rows && rows[0].n === 'b', 'sorting returns a new array and leaves the rows as they were');
const ties = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }, { k: 1, i: 3 }];
check(kit.sortRows(ties, { get: (r) => r.k }, true).map((r) => r.i).join() === '0,1,3,2', 'ties keep their first order either way');

// --- filtering and pages ----------------------------------------------------------------------------------------------
const row = { name: 'Sputnik 8K71PS', site: 'Baïkonour', payload: 'PS-1' };
check(kit.matchText(row, 'sputnik ps-1', ['name', 'payload']), 'every word of the query, each in any named field');
check(kit.matchText(row, 'baikonour', ['site']), 'accents are ignored');
check(!kit.matchText(row, 'sputnik falcon', ['name', 'payload']), 'a word found nowhere is not a match');
check(kit.matchText(row, '  ', ['name']), 'an empty query matches everything');
const page = kit.pageOf(new Array(250).fill(0), 100);
check(page.shown === 100 && page.total === 250 && page.rest === 150 && page.rows.length === 100, 'a page counts the whole answer, not the rows drawn');
check(kit.pageOf([1, 2], 100).rest === 0, 'a short answer is whole');

// --- the link ---------------------------------------------------------------------------------------------------------
check(JSON.stringify(parseCat('launches:1969')) === '{"which":"launches","arg":"1969"}', 'cat=launches:1969 is the launches at 1969');
check(JSON.stringify(parseCat('Eclipse')) === '{"which":"eclipse","arg":""}', 'a catalogue alone, case ignored');
check(parseCat('debris') === null && parseCat('') === null && parseCat(null) === null, 'anything else opens nothing');
check(catValue('exoplanets', 'pl_orbper,pl_rade') === 'exoplanets:pl_orbper,pl_rade' && catValue('calendar', '') === 'calendar', 'and back');
check(KEYS.includes('cat') && KEYS[KEYS.length - 1] === 'cam', 'the address knows `cat`, and a pose is still its last key');
for (const c of CATALOGUES) check(parseCat(catValue(c, 'x')).which === c, `${c} survives the round trip`);

// --- the saved copy first ---------------------------------------------------------------------------------------------
const asked = [];
const fakeFetch = (answers) => async (url) => { asked.push(url); const a = answers[url]; return a ? { ok: true, json: async () => a } : { ok: false }; };
let got = await kit.readJsonCopy([{ url: '/data/v1/x.json', via: 'snapshot' }, { url: 'data/x.json', via: 'bundled' }], { fetchImpl: fakeFetch({ '/data/v1/x.json': { a: 1 }, 'data/x.json': { b: 1 } }) });
check(got && got.via === 'snapshot' && got.data.a === 1 && asked.length === 1, 'our saved copy is read first, and the bundled one is not fetched when it answers');
asked.length = 0;
got = await kit.readJsonCopy([{ url: '/data/v1/x.json', via: 'snapshot' }, { url: 'data/x.json', via: 'bundled' }], { fetchImpl: fakeFetch({ 'data/x.json': { b: 1 } }) });
check(got && got.via === 'bundled' && asked.join() === '/data/v1/x.json,data/x.json', 'without it, the copy bundled with the map');
got = await kit.readJsonCopy(['a', 'b'], { fetchImpl: fakeFetch({}) });
check(got === null, 'with neither, nothing: the view says it could not load, and invents no rows');

// --- the view and its doors -------------------------------------------------------------------------------------------
check(VIEWS.includes('catalogue') && sheetFor('catalogue', 'home') === 'half', 'a pushed view of the shell, at half on a phone (the globe above it moves)');
check(crumbFor('catalogue') === COPY.shell.catalogue && COPY.shell.catalogue === 'Catalogues', 'the back row under it names it');
const doors = Object.values(ENTRY_ROWS).flat();
for (const c of CATALOGUES) check(doors.includes(c), `${c} has a door on an explore tab`);
check(Object.keys(ENTRY_ROWS).every((t) => ['earth', 'planets', 'stars', 'tonight'].includes(t)), 'the doors are on the four tabs that exist');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/ctx\.wantCatalogue = \(\) => catP \|\| \(catP = import\('\.\/ui\/catalogue\.js'\)/.test(main), 'main.js fetches the view on first use (import(), never at boot)');
check(/import\('\.\/ui\/catalogueentry\.js'\)/.test(main) && /readUrlKeys\(\)\.cat/.test(main), 'main.js draws the doors after the first visit, and opens a `cat=` link');
const view = readFileSync(join(JS, 'ui/catalogue.js'), 'utf8');
for (const [c, f] of [['launches', 'launcharchive'], ['calendar', 'skycalendar'], ['eclipse', 'eclipsecheck'], ['asteroids', 'neobrowser'], ['exoplanets', 'exoexplorer']]) {
  check(view.includes(`${c}: () => import('./${f}.js')`), `${c} is its own module, fetched when it is opened`);
}
const kitText = readFileSync(join(JS, 'ui/catalogkit.js'), 'utf8');
check(/sr-find__table/.test(kitText) && /aria-sort/.test(kitText) && /'ui-chip'/.test(kitText), 'the table is Find\'s, sorted with aria-sort, and the filters are the set\'s chips');

// --- analytics: the contract's names, through the platform's queue ------------------------------------------------------
const CONTRACT_EVENTS = ['page_view', 'search', 'select_object', 'tab_open', 'layer_toggle', 'language_change', 'trip_start', 'trip_complete', 'drift_start', 'drift_stop',
  'ambient_start', 'record_start', 'record_export', 'share', 'time_travel', 'sign_up', 'login', 'logout', 'favourite_add', 'favourite_remove', 'passport_stamp',
  'badge_earned', 'subscribe', 'video_start', 'video_progress', 'video_complete', 'post_read', 'game_start', 'lab_open', 'model_view', 'paywall_view',
  'begin_checkout', 'purchase', 'wallpaper_download', 'consent_update', 'embed_copy', 'calendar_add'];
for (const f of ['catalogue', 'launcharchive', 'skycalendar', 'eclipsecheck', 'neobrowser', 'exoexplorer']) {
  const text = readFileSync(join(JS, `ui/${f}.js`), 'utf8');
  for (const m of text.matchAll(/\btrack\('([a-z_]+)'/g)) check(CONTRACT_EVENTS.includes(m[1]), `ui/${f}.js tracks ${m[1]}, which is not an event of the platform contract`);
}
check(/import \{ sr \} from '\.\/platform-bridge\.js';/.test(kitText) && /sr\('track', name, params\)/.test(kitText), 'track() pushes through the platform bridge');
globalThis.window = globalThis.window || {};
const before = Array.isArray(window.srq) ? window.srq.length : 0;
kit.track('calendar_add', { feed: 'eclipses.ics', nested: { no: 1 } });
const pushed = (window.srq || [])[before];
check(pushed && pushed[0] === 'track' && pushed[1] === 'calendar_add' && pushed[2].feed === 'eclipses.ics' && !('nested' in pushed[2]), 'calendar_add{feed} lands on window.srq, flat');

// --- the words, in every language -------------------------------------------------------------------------------------
await import(join(JS, 'copy/en.catalogues.js'));
const leaves = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v, `${p}${k}.`) : [`${p}${k}`]));
const want = [...leaves(COPY.catalogue, 'catalogue.'), ...leaves(COPY.catalogueEntry, 'catalogueEntry.')];
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const text = readFileSync(join(JS, `copy/${lang}.js`), 'utf8');
  const block = text.slice(text.indexOf('// research train (catalogues): begin'));
  check(block.length > 100, `copy/${lang}.js has the catalogues' block`);
  for (const k of want) {
    const leaf = k.split('.').pop();
    check(new RegExp(`"${leaf}": "[^"]+"`).test(block), `copy/${lang}.js has ${k}`);
  }
  check(/"?catalogue"?: "[^"]+",\n\s+"?card"?:/.test(text), `copy/${lang}.js names the view in the back row (shell.catalogue)`);
}

// Live check 2026-11-25: Planets had no Near-Earth asteroids door (a tab's second mount replaced its first: Find's doors and
// the catalogues' both mount on Planets), and `#cat=asteroids` typed over another view did nothing (read at boot only).
{
  const ex = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/for \(const run of mounts\.get\(id\) \|\| \[\]\) run\(\);/.test(ex) && /mounts\.set\(id, \[\.\.\.\(mounts\.get\(id\) \|\| \[\]\), run\]\);/.test(ex) && !/mounts\.set\(id, run\)/.test(ex),
    'every mount of a tab is kept and run (Find\'s doors and the catalogues\' on Planets)');
  const fe = readFileSync(join(JS, 'ui/findentry.js'), 'utf8');
  check(/mountTab\('planets'/.test(fe) && ENTRY_ROWS.planets.includes('asteroids'), 'Planets carries both Find\'s door and the Near-Earth asteroids door');
  check(/const catLink = \(\) => \{ const k = readUrlKeys\(\)\.cat; if \(!embed && k\) ctx\.wantCatalogue\(\)\.then\(\(c\) => c && c\.openLink\(k\)\); \};/.test(main)
    && /catLink\(\);\s*window\.addEventListener\('hashchange', catLink\);/.test(main), 'a `cat=` link opens its catalogue at boot and whenever the address changes to one');
}

if (problems.length) { console.error(`catalogues FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`catalogues ok: the table sorts by value with blanks last and cuts honestly, filters ignore accents, \`cat=\` names one of ${CATALOGUES.length} catalogues, the saved copy comes before the bundled one, the view is the shell's like Find with a door on its tab, and its ${want.length} shared words are in eleven languages`);
