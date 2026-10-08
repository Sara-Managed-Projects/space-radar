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

// The three screens (spec 0046 task 3, internal #126): the whole table of nextScreen().
{
  const { nextScreen, SCREENS, EYE_IDLE_MS } = await import(join(ROOT, 'site/js/ui/cleanview.js'));
  check(SCREENS.join() === 'full,hud,clear', `three screens (${SCREENS})`);
  const TABLE = [
    // state, key, prev, next
    ['full', 'h', 'full', 'clear'], ['full', 'H', 'full', 'hud'], ['full', 'Escape', 'full', null],
    ['hud', 'h', 'full', 'clear'], ['hud', 'H', 'full', 'clear'], ['hud', 'Escape', 'full', 'full'],
    ['clear', 'h', 'full', 'full'], ['clear', 'h', 'hud', 'hud'], ['clear', 'H', 'full', 'hud'], ['clear', 'H', 'hud', 'hud'], ['clear', 'Escape', 'hud', 'full'],
    ['full', 'x', 'full', null], ['hud', 'x', 'full', null], ['clear', 'x', 'hud', null],
  ];
  for (const [state, k, prev, want] of TABLE) check(nextScreen(state, k, prev) === want, `${state} + ${k} (from ${prev}) is ${want}: got ${nextScreen(state, k, prev)}`);
  check(EYE_IDLE_MS === 3000, 'the eye fades after three seconds of stillness');
  const src = readFileSync(join(ROOT, 'site/js/ui/cleanview.js'), 'utf8');
  check(/event\.shiftKey \? 'H' : 'h'/.test(src), 'Shift decides between the two, not the letter\'s case (Caps Lock)');
  check(/classList\.toggle\(ROOT_CLASS, state === 'clear'\)/.test(src) && /classList\.toggle\(HUD_CLASS, state === 'hud'\)/.test(src), 'one class per screen on <html>');
  check(/detail: \{ on: state === 'clear', state \}/.test(src), 'sr:clean still says `on` for the clear screen, and now which screen');
  check(/if \(hinted\) return;/.test(src) && !/sessionStorage|localStorage/.test(src), 'the hint is said once a visit and nothing is kept on the device for it');
  const css0 = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  const hud = /html\.sr-hud body > \*:not\(\.sr-scene\):not\(\.sr-veil\):not\(\.sr-over-clean\):not\(#labels\):not\(#sr-hud\) \{([^}]*)\}/.exec(css0);
  check(hud && /visibility: hidden !important/.test(hud[1]) && /pointer-events: none !important/.test(hud[1]), 'the HUD screen hides every panel and keeps the labels and the reticle');
  check(/html\.sr-hud #sr-time \{[^}]*visibility: visible !important/.test(css0), 'and brings the time pill back out of the hidden shell');
  check(/html\.sr-hud #sr-rail \.sr-rail__btn--clean\.is-idle \{ opacity: 0; \}/.test(css0) && /html\.sr-clean #sr-rail \.sr-rail__btn--clean\.is-idle,/.test(css0), 'the idle eye is invisible on both screens');
  check(/html\.sr-hud #sr-rail \.sr-rail__btn:focus-visible \{ opacity: 1; \}/.test(css0), 'and focus brings it back');
  const { COPY: C0 } = await import(join(ROOT, 'site/js/copy/en.js'));
  check(C0.clean.hint && C0.clean.hint.length <= 60 && /Shift\+H/.test(C0.clean.hint) && /Escape/.test(C0.clean.hint), `the hint names the keys in one line (${C0.clean.hint.length} characters)`);
}

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
check(/html\.sr-hud #sr-rail \.sr-rail__btn--share \{[^}]*visibility: visible !important/.test(css), 'the eye stays reachable on a clear screen');

if (problems.length) { console.error('clean view FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('clean view ok: H hides every panel and brings them back, Escape leaves, typing and browser shortcuts are left alone, and the scene gets the whole screen');
