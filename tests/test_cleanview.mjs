// tests/test_cleanview.mjs -- the one control that clears the screen (ui/cleanview.js).
//
// Ivan, 2026-09-28: "should have possibility to hide each panel so fully see the space only".
// Asserted: H toggles, not while typing and not with a modifier; Escape leaves only when the
// screen is clear; and the CSS hides every direct child of <body> except the scene, the veil and
// the toggle, with `visibility` so the phone's view shift gives the scene the whole screen.
//
//   node tests/test_cleanview.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { wantsToggle } = await import(join(ROOT, 'site/js/ui/cleanview.js'));
const key = (k, extra = {}) => ({ key: k, ...extra });
const body = { tagName: 'BODY' };

check(wantsToggle(key('h'), body, false) === 'toggle', 'h hides the panels');
check(wantsToggle(key('H'), body, true) === 'toggle', 'H brings them back');
check(wantsToggle(key('Escape'), body, true) === 'leave', 'Escape leaves a clear screen');
check(wantsToggle(key('Escape'), body, false) === null, 'Escape with the panels shown is left to the card and the trip');
check(wantsToggle(key('h'), { tagName: 'INPUT' }, false) === null, 'typing an h in search does nothing here');
check(wantsToggle(key('h'), { tagName: 'DIV', isContentEditable: true }, false) === null, 'nor in an editable field');
check(wantsToggle(key('h', { metaKey: true }), body, false) === null, 'Cmd+H is the browser\'s');
check(wantsToggle(key('h', { ctrlKey: true }), body, false) === null, 'Ctrl+H is the browser\'s');
check(wantsToggle(key('h', { defaultPrevented: true }), body, false) === null, 'a key something else took is not taken again');
check(wantsToggle(key('x'), body, false) === null, 'other keys are not ours');

const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
const rule = /html\.sr-clean body > \*:not\(\.sr-scene\):not\(\.sr-veil\):not\(\.sr-over-clean\) \{([^}]*)\}/.exec(css);
check(!!rule, 'clean view hides every direct child of <body> except the scene, the veil and what is marked to stay');
check(rule && /visibility: hidden !important/.test(rule[1]) && /pointer-events: none !important/.test(rule[1]) && /transition: none/.test(rule[1]), 'with visibility and no pointer events, so the view shift skips them and taps reach the scene');

const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
check(COPY.clean && /\(H\)/.test(COPY.clean.hide) && /Escape/.test(COPY.clean.show), 'the button names its keys');

// Spec 0061: the button is the tool rail's third (ui/rail.js), and main.js builds the rail.
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
const rail = readFileSync(join(ROOT, 'site/js/ui/rail.js'), 'utf8');
check(/createRail\(ctx, shell\.railHost\)/.test(main) && /createCleanView\(ctx, \{ host: root/.test(rail), 'main.js builds the rail and the rail seats the clear-screen button');
// With the screen clear the eye comes back alone in the rail's corner: the way back is where the way out was.
check(/html\.sr-clean #sr-rail \.sr-rail__btn--clean[^{]*\{[^}]*visibility: visible !important/.test(css), 'the eye stays reachable on a clear screen');

if (problems.length) { console.error('clean view FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('clean view ok: H hides every panel and brings them back, Escape leaves, typing and browser shortcuts are left alone, and the scene gets the whole screen');
