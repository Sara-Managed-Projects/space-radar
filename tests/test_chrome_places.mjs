// tests/test_chrome_places.mjs -- where the passing chrome stands: the toast, the scene note, the
// controls hint and a trip card that was just pressed.
//
// WHY. The regression walk of 2026-10-06 (tools/walk.mjs) found each of these on top of the thing
// the visitor had just asked for, and none of them had a test, because each was right when it was
// written and went wrong when another feature moved in beside it:
//   - the toast was top centre, fine for a rare "Link copied"; then the undo toast came with every
//     search result and lay across the HUD tag on a desktop and across the planet on a phone;
//   - the scene note is a fixed box at `left: 50%`, so on a phone it was fitted to half the screen
//     and "Satellites could not be read." came out one word to a line;
//   - the controls hint stood 128 px from the bottom of a phone, which is inside the sheet as soon
//     as a card opens: over the card's numbers and its Fly to it button;
//   - a trip card pressed in the first seconds of a visit did nothing visible for ten seconds
//     while ui/trip.js was fetched (ui/tripgate.js is a stand-in with no face).
// These are the rules as text; the walk is what sees them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const css = readFileSync(join(SITE, 'css/ui.css'), 'utf8');
const hint = readFileSync(join(SITE, 'css/keyhint.css'), 'utf8');
const explore = readFileSync(join(SITE, 'js/ui/explore.js'), 'utf8');
const keyhint = readFileSync(join(SITE, 'js/ui/keyhint.js'), 'utf8');
const { COPY } = await import(join(SITE, 'js/copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
/** The declarations of the first rule whose selector list is exactly `selector`. */
const rule = (sheet, selector) => {
  const at = sheet.indexOf(`\n${selector} {`);
  return at < 0 ? '' : sheet.slice(at, sheet.indexOf('}', at));
};

// --- the toast (docs/ui-guide.md §3.14): bottom centre of the scene area, above the pill ---------
const toast = rule(css, '.sr-toast');
check(toast && !/\btop:/.test(toast), 'the toast is not anchored to the top (the HUD tag of an arrival is there)');
check(/bottom: calc\(var\(--sp-5\) \+ var\(--sr-time-h\) \+ var\(--sp-3\)/.test(toast), 'the toast stands 12 px above the time pill');
check(/left: calc\(50% \+ var\(--sr-scene-left, 0px\) \/ 2\)/.test(toast), 'the toast is centred on the scene area, not the window');
check(/white-space: nowrap/.test(rule(css, '.sr-toast__action')), 'the toast\'s action is one phrase and never breaks inside');
const cardToast = rule(css, "html.sr-phone[data-sheet='full'] .sr-toast,\nhtml.sr-phone.sr-card-open .sr-toast");
check(cardToast && /var\(--sr-sheet-h\) \+ var\(--sp-3\)/.test(cardToast) && !/--sr-time-h/.test(cardToast),
  'on a phone with a card up there is no pill, and the toast stands on the sheet, not a pill\'s height above it');
check(/min\(/.test(cardToast), 'with the sheet at full the toast stops under the top bar instead of leaving the screen');

// --- the scene note: its words' own width ----------------------------------------------------------
check(/width: max-content/.test(rule(css, '.sr-scenenote')), 'the scene note takes its words\' width, not half a phone');

// --- the controls hint on a phone: on the sheet's edge, and aside while a card is up ---------------
const phoneHint = rule(hint, 'html.sr-phone .sr-keyhint');
check(/bottom: calc\(var\(--sr-sheet-h, 96px\) \+ var\(--sp-3\)\)/.test(phoneHint), 'the phone\'s hint stands on the sheet wherever the sheet is');
const aside = rule(hint, "html.sr-phone[data-sheet='full'] .sr-keyhint,\nhtml.sr-phone.sr-card-open .sr-keyhint");
check(/visibility: hidden/.test(aside) && /pointer-events: none/.test(aside), 'the hint steps aside while a card is up or the sheet is full, as the pill does');
check(/addEventListener\('sr:shell'/.test(keyhint), 'the hint is placed again when the sheet moves');

// --- a pressed trip card says so --------------------------------------------------------------------
check(typeof COPY.tripCard.starting === 'string' && COPY.tripCard.starting.length <= 12, 'the card has a word for "on its way"');
check(/COPY\.tripCard\.starting/.test(explore) && /aria-busy/.test(explore), 'a pressed trip card says it is starting, and is busy to a screen reader');
check(/if \(startingId === row\.id\) return;/.test(explore), 'a second press while it is on its way does not start it twice');
check(/begun\.then\(done, done\)/.test(explore), 'the word goes when the trip has started or said why not, either way');
check(/\.sr-tripcard\.is-starting/.test(css), 'and the card has a look for it');

if (problems.length) { console.error('chrome places FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('chrome places ok: the toast above the pill and on the sheet when there is none, the note at its own width, the phone\'s hint on the sheet and aside for a card, a pressed trip card that says so');
