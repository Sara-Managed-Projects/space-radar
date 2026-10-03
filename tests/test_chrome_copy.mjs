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
  ['search.searchingOne', 13, INTER, SIDE],
  ['search.searchingBut', 13, INTER, SIDE],
  ['search.searchingButOne', 13, INTER, SIDE],
  ['search.empty', 15, INTER, SIDE],
  ['search.fallback', 13, INTER, SIDE],
  ['search.more', 13, INTER, SIDE],
  ['search.placeholder', 15, INTER, 250], // the well, less its icon and the / keycap; read in the screenshots
  ['search.placeholderPhone', 16, INTER, 190],
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
for (const [key, max] of [['tonight.showMe', 2], ['tonight.more', 2], ['tonight.fewer', 2], ['controls.layersFailedWhy', 2], ['subscribe.submit', 1], ['sceneNote.why', 1], ['search.fly', 3]]) {
  const v = get(key);
  check(typeof v === 'string' && v.trim().split(/\s+/).length <= max, `COPY.${key} ("${v}") is over ${max} word(s)`);
}

if (problems.length) { console.error('chrome copy FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`chrome copy ok: ${LINES.length} lines of chrome each fit one line with their longest values, none over ${MAX_CHARS} characters; ${layers.length} layer names fit their row`);
