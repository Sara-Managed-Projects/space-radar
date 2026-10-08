// tests/test_chrome_copy.mjs -- a line of chrome is one line long (spec 0061 req 11, task 5).
//
// docs/ui-guide.md section 4: "one line at the container's width, and at most 60 characters for
// any chrome sentence". On 2026-10-03 the sidebar's Coming up list was sentences three lines deep,
// the search's note eight, and What to show wrapped "Everything active / loads when switched on".
// The words were tightened; this keeps them tight without a browser.
//
// HOW A WIDTH IS HELD WITHOUT ONE. Chrome text sits in two columns: the sidebar's (360 px less
// 20 px a side: 320) and the popover's (320 less 20 a side: 280); a phone at 390 leaves more than
// either. Inter sets sentence-case English at 0.49 em a character (measured in the app: 6.3 px at
// 13 px, 7.3 px at 15 px), JetBrains Mono at 0.6 em exactly. So a line fits when
// characters x size x that share <= its width. Each template is filled with the LONGEST value its
// placeholders really take ("Mon 05 Oct, 04:06", "17 579"), not a short one that flatters it.
// What the estimate cannot see, the probe does: the PR's screenshots at 1440 and at 390 were read
// with a script that lists every text node drawn on more than one line.
//
//   node tests/test_chrome_copy.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { COPY, t } = await import(join(ROOT, 'site/js/copy/en.js'));
// The sections only a module outside the first visit reads (internal #405): added to the same COPY.
await import(join(ROOT, 'site/js/copy/en.later.js'));
const { LAYER_ROWS } = await import(join(ROOT, 'site/js/data/layers.registry.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const INTER = 0.49; // em per character, sentence-case English
const MONO = 0.6;
const SIDE = 320; // px of text in the sidebar
const POP = 280; // px of text in the rail's popover
const MAX_CHARS = 60; // the guide's cap for any chrome sentence

// The longest thing each placeholder is ever given.
const WORST = {
  when: 'Mon 05 Oct, 04:06', date: '21 October 2026', time: '21:14', begin: '21:14', end: '23:59',
  n: '17 579', m: '12', q: 'abcdefghijklmnopqr…', ld: '12.3', kp: '7.33', zhr: '120', ms: '120',
  name: 'Southern Delta Aquariids', layer: 'Nebulae, clusters and galaxies', place: 'Rio de Janeiro',
  from: 'north-north-west', to: 'east-north-east', deg: '89°', mins: '12', key: 'what it is', pct: '100',
};

const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), COPY);

/** [key, px size, face share, width; optional placeholder overrides] */
const LINES = [
  // the search: its empty state, its note, its foot
  ['search.noMatch', 15, INTER, SIDE],
  ['search.closest', 13, INTER, SIDE],
  ['search.searching', 13, INTER, SIDE],
  ['search.belowHorizon', 13, INTER, SIDE],
  ['search.searchingOne', 13, INTER, SIDE],
  ['search.searchingBut', 13, INTER, SIDE],
  ['search.searchingButOne', 13, INTER, SIDE],
  ['search.empty', 15, INTER, SIDE],
  ['search.fallback', 13, INTER, SIDE],
  ['search.more', 13, INTER, SIDE],
  ['search.placeholder', 15, INTER, 250], // the well, less its icon and the / keycap; read in the screenshots
  ['search.placeholderPhone', 16, INTER, 190],
  // The home's first line (ui/sentence.js), at the label size in the sidebar's column: each
  // clause alone, as a sentence, with the longest values it really takes.
  ['sentence.pass', 14, INTER, SIDE, { name: 'the ISS', when: 'tomorrow at 21:14' }],
  ['sentence.launch', 14, INTER, SIDE, { name: 'Falcon 9 Block 5', when: 'in 11 hours' }], // a longer one gives way to the next clause (ui/sentence.js)
  ['sentence.showerTomorrow', 14, INTER, SIDE],
  ['sentence.moonDays', 14, INTER, SIDE, { n: 'three', phase: 'full' }],
  ['sentence.moonLit', 14, INTER, SIDE],
  ['sentence.crew', 14, INTER, SIDE, { n: 'twelve' }],
  ['sentence.storms', 14, INTER, SIDE, { n: 'twelve' }],
  ['sentence.approach', 14, INTER, SIDE, { name: '2026 TC12', when: 'tomorrow at 21:14' }],
  ['sentence.launched', 14, INTER, SIDE, { n: '1 203' }],
  // The passport: the row at the home's foot, the view's lines, the stamp, a card's resume line
  ['passport.kept', 13, INTER, SIDE],
  ['passport.notKept', 13, INTER, SIDE],
  ['passport.noPlaces', 13, INTER, SIDE],
  ['passport.forgotten', 13, INTER, SIDE],
  ['passport.stamp', 13, INTER, SIDE, { n: '25', total: '25', date: '27 September 2026' }],
  ['passport.resume', 13, INTER, 150, { n: '12' }],
  ['happened.flown', 13, INTER, SIDE, { age: '47 hours ago' }],
  // Coming up: the row as drawn, and its empty line
  ['nextList.row.launch', 13, INTER, SIDE],
  ['nextList.row.launchRough', 13, INTER, SIDE],
  ['nextList.row.approach', 13, INTER, SIDE],
  ['nextList.row.perihelion', 13, INTER, SIDE],
  ['nextList.row.pass', 13, INTER, SIDE],
  ['nextList.row.trainTitle', 15, INTER, SIDE],
  ['nextList.row.auroraTitle', 15, INTER, SIDE],
  ['nextList.row.auroraNowTitle', 15, INTER, SIDE],
  ['nextList.row.aurora', 13, INTER, SIDE],
  ['nextList.row.auroraNow', 13, INTER, SIDE],
  ['nextList.row.showerTitle', 15, INTER, SIDE],
  ['nextList.row.shower', 13, INTER, SIDE, { date: 'Wed 21 Oct' }],
  ['nextList.row.eclipse', 13, INTER, SIDE],
  ['nextList.row.eclipseHere', 13, INTER, SIDE],
  ['nextList.row.eclipseNotHere', 13, INTER, SIDE],
  ['nextList.none', 13, INTER, SIDE],
  // What to show: the three silences beside a name, the failed line, the quality lines
  ['controls.layerCountLoading', 13, MONO, 70],
  ['controls.layerCountEmpty', 13, MONO, 70],
  ['controls.layerWaits', 13, MONO, 70],
  ['controls.layersFailed', 13, INTER, 190, { n: '26' }],
  ['controls.layersFailedOne', 13, INTER, 190],
  ['quality.dataSaver', 13, INTER, POP],
  ['quality.lowered', 13, INTER, POP],
  ['quality.tierPhone', 13, INTER, POP],
  ['quality.tierSaver', 13, INTER, POP],
  ['quality.tierSmall', 13, INTER, POP],
  ['quality.tierLatched', 13, INTER, POP],
  ['quality.tier1', 13, INTER, POP],
  ['quality.tier2', 13, INTER, POP],
  ['quality.promoted', 13, INTER, POP],
  // Tonight
  ['tonight.placeGuess', 13, INTER, SIDE],
  ['tonight.noPlace', 13, INTER, SIDE],
  ['tonight.working', 13, INTER, SIDE],
  ['tonight.guessCaveat', 13, INTER, SIDE],
  ['tonight.nothingTonight', 15, INTER, SIDE],
  ['tonight.nothingAtAll', 15, INTER, SIDE],
  ['tonight.path', 13, INTER, SIDE],
  ['tonight.upNow', 13, MONO, SIDE],
  ['tonight.rowDetail', 13, MONO, SIDE],
  ['controls.tonightCouldNotLook', 13, INTER, SIDE],
  // the scene note, the share sheet, the subscribe row
  ['sceneNote.refused', 13, INTER, 220],
  ['share.noWiki', 13, INTER, 320],
  ['share.emailNote', 13, INTER, 320],
  ['subscribe.heading', 15, INTER, 260],
  ['subscribe.couldNotReach', 13, INTER, SIDE],
  ['subscribe.pending', 13, INTER, SIDE],
  ['subscribe.pickOne', 13, INTER, SIDE],
];

for (const [key, size, share, width, over] of LINES) {
  const tpl = get(key);
  if (typeof tpl !== 'string') { problems.push(`COPY.${key} is not a string: the line this test holds has moved`); continue; }
  const text = t(tpl, { ...WORST, ...(over || {}) });
  const px = Math.round([...text].length * size * share);
  check(px <= width, `COPY.${key} is about ${px} px at ${size} px in a ${width} px line: "${text}"`);
  check([...text].length <= MAX_CHARS, `COPY.${key} is ${[...text].length} characters, over the guide's ${MAX_CHARS}: "${text}"`);
  check(!/!|→/.test(text) && !/ -- /.test(text), `COPY.${key} has an exclamation mark, an arrow or a double hyphen: "${text}"`);
}

// A layer's name shares its row with a checkbox, a swatch and a count: 30 letters wrapped at 320.
// (The stars' "not yet" and a five-figure count are both about 55 px of mono beside it.)
const layers = Array.isArray(LAYER_ROWS) ? LAYER_ROWS : [];
check(layers.length > 0, 'the registry mirror lists the layers');
for (const l of layers) {
  if (l.enabled === false) continue;
  const name = String(l.display || l.id);
  check(Math.round([...name].length * 14 * INTER) <= 210, `layer "${name}" is ${name.length} letters: over one line beside its count in What to show (210 px at 14 px)`);
}

// Labels: a button is at most two words, a tab one (docs/ui-guide.md section 4).
for (const [key, max] of [['passport.forget', 2], ['passport.forgetConfirm', 2], ['passport.title', 1], ['tonight.showMe', 2], ['tonight.more', 2], ['tonight.fewer', 2], ['controls.layersFailedWhy', 2], ['subscribe.submit', 1], ['sceneNote.why', 1], ['search.fly', 3]]) {
  const v = get(key);
  check(typeof v === 'string' && v.trim().split(/\s+/).length <= max, `COPY.${key} ("${v}") is over ${max} word(s)`);
}

// --- the sweep: every remaining chrome key (docs/ui-guide.md section 7, spec 0061 task 6) --------
// The 58 lines above are held to a WIDTH, one by one. Internal #336 (1): the rest of the chrome was
// not swept at all. These sections of COPY are chrome and nothing else (labels, rows, toasts,
// status words; no card prose, no trip text, no glossary), so every string in them, with its
// placeholders at their longest, is held to the guide's cap: 60 characters for what is drawn, 90
// for a tooltip or a reader's name (a `title` or an `aria-label` is not laid out in a column, and
// names its key). No exclamation mark, no arrow, no double hyphen, no emoji, and no Title Case.
const CHROME_SECTIONS = ['app', 'subscribe', 'shell', 'tabs', 'rightNow', 'statusLine', 'tripCard', 'explore', 'rail', 'timePill', 'undo',
  'moments', 'ladder', 'sceneNote', 'link', 'share', 'audio', 'density', 'nextList', 'colourKey', 'chooser', 'controls', 'search',
  'quality', 'time', 'sheet', 'print', 'hud', 'tonight', 'clean', 'keyHint', 'mark', 'sentence', 'wonder', 'happened', 'passport'];
const TOOLTIP = /(Title|Label|Alt|Aria|Tip|Hint|Why|Help|Describe|Long)$|^(label|title|aria|hint|why)/;
// Said in full on purpose, each with its reason. A key here that goes away fails below.
const LONG_OK = new Map([
  ['app.tagline', 'the page\'s description and a shared post\'s line, not a line of chrome'],
  ['app.sceneSelected', 'the canvas\'s spoken name while something is selected (an aria-label, never drawn): one whole sentence'],
  ['sceneNote.refusedTitle', 'a tooltip that explains a refused source in two sentences'],
  ['audio.panelNote', 'the one note under Sound in What to show: two lines, read once'],
  ['audio.narrationCredit', 'a credit: the model, the voice and the licence are all owed'],
  ['controls.locationInsecure', 'a disabled button\'s tooltip: why, and what to do instead'],
  ['search.loadsWhenOn', 'a tooltip listing layers'],
  ['search.notLoadedCount', 'a tooltip\'s second sentence'],
  ['tonight.passLine', 'a pass read out in full for a screen reader; the row draws its parts'],
  ['tonight.arcLabel', 'the sky arc\'s description for a screen reader'],
  ['tonight.skybar.cultureCredits.chinese', 'a credit: whose reconstruction it is and its licence are owed'],
  ['tonight.skybar.cultureCredits.maori', 'a credit: whose record it is and its licence are owed'],
  ['tonight.skybar.cultureCredits.hawaiian', 'a credit: whose teaching, whose work and its licence are owed'],
]);
// An event's full sentence (ui/next.js): the row draws COPY.nextList.row.*, held above to a width;
// these are the row's tooltip and the event's card, where a sentence is the point.
const EVENT_SENTENCE = /^nextList\.(launchRough|approach|perihelion|train|shower|showerMoon|showerNoMoon|radiantLow|radiantNeverUp|solarEclipse|solarEclipseGrazing|lunarEclipse|lunarEclipsePenumbral|seasons\.\w+|eclipseLocal|eclipseBelowHorizon|classOf\.\w+)$/;
// Where the longest value of a placeholder is not the table's: a storm count is two digits and a
// storm's name one word.
const WORST_FOR = { 'rightNow.storms': { n: '12', name: 'Humberto' } };
const PICTO = /\p{Extended_Pictographic}/u;
let swept = 0;
const sweep = (node, path) => {
  if (typeof node === 'string') {
    const key = path[path.length - 1];
    const dotted = path.join('.');
    if (path[0] === 'keyHint' && path[1] === 'caps') return; // a keycap is a picture of a key: ← and → are keys
    const text = t(node, { ...WORST, ...(WORST_FOR[dotted] || {}) });
    const n = [...text].length;
    const cap = LONG_OK.has(dotted) || EVENT_SENTENCE.test(dotted) ? Infinity : TOOLTIP.test(key) || path.some((k) => /^(titles|labels|notes|whys|help)$/i.test(k)) ? 90 : MAX_CHARS;
    swept += 1;
    check(n <= cap, `COPY.${dotted} is ${n} characters, over ${cap}: "${text}"`);
    check(!/!/.test(text) && !/→/.test(text) && !/ -- /.test(text) && !PICTO.test(text.replace(/[©®™↑↓←↔]/g, '')), `COPY.${dotted} has an exclamation mark, an arrow, a double hyphen or an emoji: "${text}"`);
    // Title Case is asked of the template's own words: a name or a weekday filled in is not its doing.
    const words = node.replace(/\{\w+\}/g, ' ').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    if (words.length >= 3 && n <= MAX_CHARS) check(words.filter((w) => /^[A-Z][a-z]/.test(w)).length < words.length, `COPY.${dotted} is in Title Case: "${text}"`);
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => sweep(v, [...path, String(i)])); return; }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) sweep(v, [...path, k]);
};
for (const sec of CHROME_SECTIONS) {
  check(COPY[sec] && typeof COPY[sec] === 'object', `COPY.${sec} is gone: the chrome sweep has lost a section`);
  sweep(COPY[sec], [sec]);
}
for (const k of LONG_OK.keys()) check(typeof get(k) === 'string', `LONG_OK names COPY.${k}, which is not a string any more`);
check(swept >= 300, `only ${swept} chrome strings swept`);

if (problems.length) { console.error('chrome copy FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`chrome copy ok: ${LINES.length} lines of chrome each fit one line with their longest values, none over ${MAX_CHARS} characters; ${swept} more strings in ${CHROME_SECTIONS.length} chrome sections swept (60 drawn, 90 as a tooltip); ${layers.length} layer names fit their row`);
