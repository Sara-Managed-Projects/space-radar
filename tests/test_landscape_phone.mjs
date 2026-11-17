// tests/test_landscape_phone.mjs -- a phone held sideways gets a side sheet (internal #455).
//   node tests/test_landscape_phone.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LANDSCAPE_QUERY, DESKTOP_QUERY } from '../site/js/ui/shell.js';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
check(/orientation: landscape/.test(LANDSCAPE_QUERY) && /max-height: 500px/.test(LANDSCAPE_QUERY), 'the query asks for landscape and a height under 500 px');
check(DESKTOP_QUERY === '(min-width: 900px)', 'the desktop switch is unchanged');
const shell = read('site/js/ui/shell.js');
check(/classList\.toggle\(LAND_CLASS, phone && /.test(shell), 'the shell sets sr-phone-land only on a phone');
check(/LAND_CLASS\) \? 'half'/.test(shell), 'sideways a view has one height');
check(/mmLand\.addEventListener\('change'/.test(shell), 'turning the phone re-seats the boxes');
const css = read('site/css/ui.css');
const at = css.indexOf('A PHONE HELD SIDEWAYS');
check(at > 0, 'ui.css has the landscape block');
const block = css.slice(at);
check(/html\.sr-phone-land #sr-side \{[^}]*width: var\(--sr-land-w\)[^}]*transform: none/.test(block), 'the sheet is a column with no vertical transform');
check(/--sr-land-w: min\(360px, 46vw\)/.test(block), 'about 360 px wide, never more than 46 % of the screen');
check(/inset-inline: [^;]* auto/.test(block), 'it docks to the start side, so it follows the writing direction');
check(/html\.sr-phone-land \.sr-sheet__handle \{ display: none/.test(block), 'no handle');
check(/--sr-sheet-h: 0px !important/.test(block), 'the pill and toasts count no bottom sheet');
check(/'html\.sr-phone-land #sr-side'/.test(read('site/js/scene/viewshift.js')), 'viewshift moves the subject into the band the column leaves');
// at 844 x 390 the column leaves the scene at least half the width and all the height under the bar
const w = 844, col = Math.min(360, 0.46 * w);
check(w - col >= 450, `at 844 px the scene keeps ${w - col} px of width`);
if (problems.length) { console.error('landscape phone FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('landscape phone ok: a column under the top bar on the start side, one height, no handle, the pill and the subject in the band it leaves; 844 px leaves 484 px of scene');
