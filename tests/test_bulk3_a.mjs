// tests/test_bulk3_a.mjs -- bulk 3, agent a: the phone's top bar and the stylesheets it reads.
// Reads CSS and JS as TEXT, so it is not in scripts/check_built_tree.mjs TESTS (the built tree is minified).
//   internal #563  the search results lie above the launch chip on a phone
//   internal #565  the sky's field line goes under the launch chip on a launch day
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const ui = read('site/css/ui.css');
const rule = (css, selector) => {
  const at = css.indexOf(selector + ' {');
  if (at < 0) return '';
  return css.slice(at, css.indexOf('}', at) + 1);
};

const pop = rule(ui, "html.sr-phone .sr-top .sr-search__pop");
check(/z-index:\s*2\s*;/.test(pop), "the phone's search list has a z-index above the launch chip and the live line (#563)");
const fov = rule(ui, "html.sr-phone.sr-launchday:not([data-sheet='full']) .sr-skyfov");
check(/top:\s*calc\(var\(--sr-top-y\)\s*\+\s*var\(--sr-top-bar\)\s*\+\s*var\(--sp-2\)\s*\+\s*44px\s*\+\s*var\(--sp-2\)\)/.test(fov), "on a launch day the field line sits under the chip's 44 px (#565)");
// The same measure the scale badge uses under the chip, so the two never disagree.
const finish = read('site/css/finishers.css');
check(/\.sr-scalebadge\s*\{[^}]*top:\s*calc\(var\(--sr-top-y\)\s*\+\s*var\(--sr-top-bar\)\s*\+\s*var\(--sp-2\)\s*\+\s*44px\s*\+\s*var\(--sp-2\)\)/.test(finish), 'the scale badge keeps the same offset under the chip');

// The notable names pass through labels.js's tooFarForFrame (internal #546). Moved here from tests/test_labels.mjs,
// which also runs against the minified tree (scripts/check_built_tree.mjs TESTS), where the text is other text.
const labels = read('site/js/ui/labels.js');
check(/tooFarForFrame\(pr\.dist, frameDist, r\)/.test(labels) && /stage\.worldId !== 'sun'/.test(labels), 'the notable names pass through tooFarForFrame, on a world stage in a trip only (#546)');

// Offline (#564): the texture tiers and the planet tiles ask the same question, and neither asks the network then.
const mainJs = read('site/js/main.js');
check(/offline: deviceOffline,/.test(mainJs) && /tiers\.tier < 1\) return;[\s\S]{0,400}?if \(deviceOffline\(\)\) return;[\s\S]{0,300}?planetTilesAsked = true;/.test(mainJs), 'offline, neither the sharper maps nor the planet tiles are asked for (#564)');

if (problems.length) { console.error('bulk3 a FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('bulk3 a ok: the search list above the launch chip, the sky field line under it');
