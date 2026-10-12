// The key of an Earth data map on a phone with the sheet at its peek (internal #386).
//
//   node tests/test_overlay_key_phone.mjs
//
// What is held:
//   1. ui/overlaykey.js puts the same legend the sidebar has into the phone's top bar
//      (`#sr-top .sr-top__line`, the host the shell already made), and marks <html> while it is up.
//   2. The stylesheet shows that line on a phone while the mark is on and the sheet is not full,
//      and the rule lives in css/finishers.css, which is fetched later, not in the first visit's ui.css.
//   3. It is not a second panel: no new fixed or absolute box, no new words (the legend's own).
// Reads source files as text, so it is NOT in scripts/check_built_tree.mjs TESTS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const K = await import(join(ROOT, 'site/js/ui/overlaykey.js'));
check(K.TOP_KEY_CLASS === 'sr-overlay-keyed', `the mark on <html> is ${K.TOP_KEY_CLASS}`);
check(K.keyShown({ id: 'sea-temperature' }, 'idle') && !K.keyShown({ id: 'sea-temperature' }, 'dwell') && !K.keyShown(null, 'idle'), 'the key is up with a map and no trip, and away otherwise');

const src = readFileSync(join(ROOT, 'site/js/ui/overlaykey.js'), 'utf8');
check(/querySelector\('#sr-top \.sr-top__line'\)/.test(src), 'the line is seated in the shell\'s own host under the search');
check(/legendNode\(null\)/.test(src) && /paintLegend\(top, on \? st : null\)/.test(src), 'it is the legend the sidebar paints, from the same state');
check(/classList\.toggle\(TOP_KEY_CLASS, shown\)/.test(src), 'the mark follows whether the line is shown');
check(/loadCss\('finishers'\)/.test(src), 'its stylesheet is asked for with it');

const css = readFileSync(join(ROOT, 'site/css/finishers.css'), 'utf8');
const ui = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
check(/html\.sr-phone\.sr-overlay-keyed:not\(\[data-sheet='full'\]\) \.sr-top__line\s*\{[^}]*display:\s*flex/.test(css), 'a phone shows the line while a map is keyed and the sheet is not full');
check(!/sr-overlay-keyed|sr-overlaykey__top/.test(ui), 'none of it is in the first visit\'s stylesheet');
const rule = (/html\.sr-phone \.sr-overlaykey__top:not\(\[hidden\]\)\s*\{([^}]*)\}/.exec(css) || [])[1] || '';
check(rule && !/position:\s*(fixed|absolute)/.test(rule), 'the line is in the bar\'s flow, not a floating box of its own');
check(/font:\s*400 var\(--sr-fs-sm\)\/16px var\(--sr-font\)/.test(rule), 'the sans face, on the 4 px grid');
check(/\.sr-overlaykey__top\s*\{\s*display:\s*none;?\s*\}/.test(css), 'and it is not drawn on a desktop, where the sidebar has the key');

if (problems.length) {
  console.error(`overlay key on a phone FAILED (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('overlay key on a phone ok: the legend is one line in the top bar while a map is up and the sheet is not full, styled by a stylesheet fetched later');
