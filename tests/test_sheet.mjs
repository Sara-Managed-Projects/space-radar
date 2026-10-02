// tests/test_sheet.mjs -- the phone's one sheet (spec 0061 task 3, docs/ui-guide.md §3.11 and §5).
//
// What this holds, without a browser:
//   - the three heights at 390 x 844 and 320 x 640, and a home indicator added to peek;
//   - where a release lands: the nearest height when slow, the next one past 0.5 px/ms, the ends;
//   - the tap cycle peek → half → full → half → peek and the arrow keys' steps;
//   - the rubber band past the ends, and the speed read from the last 100 ms of a drag;
//   - the height each view asks for when it comes up (a card at half, the sources at full, back
//     to peek when the card closes);
//   - the selection band: at peek and at half the subject lands in the middle of the strip between
//     the top bar and the sheet, at full the shift is capped;
//   - the wiring: the shell makes the sheet only on a phone, the old bar is gone, the CSS has the
//     heights' parts (glass-strong, the handle band, the safe areas, reduced motion, the pill).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const {
  DETENTS, PEEK_PX, HALF_FRACTION, FULL_GAP_PX, FLING_PX_PER_MS, SLOP_PX,
  sheetHeights, snapDetent, cycleDetent, stepDetent, dragHeight, velocityOf,
} = await import(join(JS, 'ui/sheet.js'));
const { sheetFor } = await import(join(JS, 'ui/shell.js'));
const { coveredFromBottom, coveredFromTop, uncoveredBand, MAX_SHIFT_FRACTION } = await import(join(JS, 'scene/viewshift.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- the numbers the guide gives ----------------------------------------------------------------
check(DETENTS.join() === 'peek,half,full', `three heights, low to high (${DETENTS})`);
check(PEEK_PX === 96 && HALF_FRACTION === 0.48 && FULL_GAP_PX === 60, 'peek 96 px, half 48 %, full the window less 60 px (§3.11)');
check(FLING_PX_PER_MS === 0.5, 'a release faster than 0.5 px/ms carries to the next height (§3.11)');
check(SLOP_PX >= 4 && SLOP_PX <= 12, `a press moving less than ${SLOP_PX} px is a tap`);

// --- the heights ---------------------------------------------------------------------------------
{
  const h = sheetHeights({ viewH: 844, fullH: 784, safeBottom: 0 });
  check(h.peek === 96 && h.half === 405 && h.full === 784, `390 x 844: 96 / 405 / 784 (${JSON.stringify(h)})`);
  const s = sheetHeights({ viewH: 640, fullH: 580, safeBottom: 0 });
  check(s.peek === 96 && s.half === 307 && s.full === 580, `320 x 640: 96 / 307 / 580 (${JSON.stringify(s)})`);
  const i = sheetHeights({ viewH: 844, fullH: 784, safeBottom: 34 });
  check(i.peek === 130, `a home indicator's 34 px are added to peek, so the tabs never sit on it (${i.peek})`);
  check(sheetHeights({ viewH: 844 }).full === 784, 'without a measured sheet, full is the window less 60 px');
  const tiny = sheetHeights({ viewH: 160, fullH: 100, safeBottom: 0 });
  check(tiny.peek <= tiny.half && tiny.half <= tiny.full, `a tiny window keeps peek ≤ half ≤ full (${JSON.stringify(tiny)})`);
}

// --- where a release lands -----------------------------------------------------------------------
{
  const H = { peek: 96, half: 405, full: 784 };
  check(snapDetent(96, 0, H) === 'peek', 'a still release at peek stays at peek');
  check(snapDetent(240, 0, H) === 'peek' && snapDetent(260, 0, H) === 'half', 'slow: the nearest height (the line is half way, 250 px)');
  check(snapDetent(580, 0.45, H) === 'half' && snapDetent(580, -0.45, H) === 'half', 'under 0.5 px/ms is slow, either way');
  check(snapDetent(120, 0.6, H) === 'half', 'a flick up from just above peek goes to half, though it travelled 24 px');
  check(snapDetent(420, 0.6, H) === 'full', 'a flick up from just above half goes to full');
  check(snapDetent(390, -0.6, H) === 'peek', 'a flick down from just under half goes to peek');
  check(snapDetent(760, -0.6, H) === 'half', 'a flick down from just under full goes to half');
  check(snapDetent(800, 2, H) === 'full' && snapDetent(60, -2, H) === 'peek', 'a flick past either end stays at that end');
  // The share sheet's two heights and its dismiss (ui/sharesheet.js).
  const S = { closed: 0, half: 405, full: 784 };
  check(snapDetent(380, -0.6, S, ['closed', 'half', 'full']) === 'closed', 'a flick down from half closes a sheet that can close');
  check(snapDetent(150, 0, S, ['closed', 'half', 'full']) === 'closed' && snapDetent(300, 0, S, ['closed', 'half', 'full']) === 'half', 'and a slow drag closes it past half way down');
}

// --- tap and keys ---------------------------------------------------------------------------------
{
  let s = { detent: 'peek', dir: 1 };
  const seen = [];
  for (let i = 0; i < 5; i++) { s = cycleDetent(s.detent, s.dir); seen.push(s.detent); }
  check(seen.join() === 'half,full,half,peek,half', `a tap cycles peek → half → full → half → peek (${seen})`);
  const two = cycleDetent('half', 1, ['half', 'full']);
  check(two.detent === 'full' && cycleDetent('full', two.dir, ['half', 'full']).detent === 'half', 'two heights toggle');
  check(stepDetent('peek', 1) === 'half' && stepDetent('half', 1) === 'full' && stepDetent('full', 1) === 'full', '↑ steps up and stops at full');
  check(stepDetent('full', -1) === 'half' && stepDetent('peek', -1) === 'peek', '↓ steps down and stops at peek');
}

// --- the drag itself -------------------------------------------------------------------------------
{
  const H = { peek: 96, half: 405, full: 784 };
  check(dragHeight(96, 100, H) === 196, 'between the ends the sheet is under the finger');
  check(dragHeight(784, 100, H) === 809, 'past full it gives a quarter of the travel');
  check(dragHeight(96, -100, H) === 71, 'below peek, a quarter too');
  check(velocityOf([{ y: 700, t: 0 }, { y: 650, t: 50 }, { y: 600, t: 100 }]) === 1, 'speed is px/ms, up positive');
  check(velocityOf([{ y: 300, t: 0 }, { y: 500, t: 500 }, { y: 500, t: 600 }]) === 0, 'only the last 100 ms count: a drag that stopped is slow');
  check(velocityOf([{ y: 1, t: 1 }]) === 0 && velocityOf(null) === 0, 'one sample, no speed');
}

// --- the height each view asks for -----------------------------------------------------------------
check(sheetFor('card', 'home') === 'half', 'selecting an object opens the card at half');
check(sheetFor('card', 'sources') === 'half', 'from the sources too');
check(sheetFor('home', 'card') === 'peek', 'closing the card returns to peek');
check(sheetFor('sources', 'home') === 'full', 'the sources sheet is a page: full');
check(sheetFor('home', 'sources') === 'half', 'back from the sources is half, where the lists were');
check(sheetFor('trip', 'home') === 'half' && sheetFor('home', 'trip') === 'peek', 'a trip at half, and peek when it ends');
check(sheetFor('home', null) === null && sheetFor('card', 'card') === null, 'the first paint and a repaint keep the height the visitor chose');

// --- the selection band ------------------------------------------------------------------------------
// The subject is drawn at the centre of the view, which viewshift moves up by `shift`: it must land
// in the middle of the strip between the top bar's foot and the sheet's top (docs/ui-guide.md §5).
for (const [W, Hh] of [[390, 844], [320, 640]]) {
  const hs = sheetHeights({ viewH: Hh, fullH: Hh - FULL_GAP_PX });
  // The top bar's foot as measured at 390 x 844: 56 (8 + 48) when the pill has the time, 90 with
  // the live line under it (+ 8 + 26) while a card is open. Both must leave the subject in the band.
  for (const top of [56, 90]) {
  const bar = { top: 8, bottom: top, width: W - 32 };
  check(coveredFromTop([bar], W, Hh) === top, `${W} x ${Hh}: the top bar covers to its foot`);
  for (const d of ['peek', 'half']) {
    const sheet = { top: Hh - hs[d], bottom: Hh + (hs.full - hs[d]), width: W };
    const bottom = coveredFromBottom([sheet], W, Hh);
    const band = uncoveredBand(Hh, top, bottom);
    const subject = Hh / 2 - band.shift;
    const mid = (band.top + band.bottom) / 2;
    check(Math.abs(bottom - hs[d]) < 1, `${W} x ${Hh} ${d}: the sheet covers its own height (${bottom})`);
    check(subject > band.top + 40 && subject < band.bottom - 40, `${W} x ${Hh} ${d}: the subject (${subject}) is inside the band ${band.top}-${band.bottom}`);
    check(Math.abs(subject - mid) <= 1, `${W} x ${Hh} ${d}: and in its middle (${subject} vs ${mid})`);
  }
  const full = uncoveredBand(Hh, top, hs.full);
  check(full.shift === Hh * MAX_SHIFT_FRACTION, `${W} x ${Hh} full: the shift is capped, the scene is not thrown off the top`);
  }
}
check(coveredFromTop([{ top: 400, bottom: 460, width: 390 }], 390, 844) === 0, 'a bar in the middle of the screen is not the top bar');
check(coveredFromTop([{ top: 8, bottom: 56, width: 120 }], 390, 844) === 0, 'nor is a narrow one (the trip\'s Leave alone)');
check(uncoveredBand(844, 0, 0).shift === 0, 'nothing covering, nothing moved');

// --- the wiring ---------------------------------------------------------------------------------------
{
  const shell = readFileSync(join(JS, 'ui/shell.js'), 'utf8');
  const sheet = readFileSync(join(JS, 'ui/sheet.js'), 'utf8');
  const share = readFileSync(join(JS, 'ui/sharesheet.js'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  const shareCss = readFileSync(join(ROOT, 'site/css/share.css'), 'utf8');
  const site = readFileSync(join(ROOT, 'site/css/site.css'), 'utf8');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(/createSheet\(side, \{/.test(shell) && /if \(phone\) \{/.test(shell) && /sheet\.destroy\(\)/.test(shell), 'the shell makes the sidebar a sheet on a phone and takes it back at 900 px');
  check(/createSheet\(root, \{\s*detents: \['half', 'full'\]/.test(share) && /dismiss: \(\) => close\(\)/.test(share), 'the share sheet is the same sheet on a phone: half, full and a drag down to close');
  check(!existsSync(join(JS, 'ui/mobile.js')) && !/mobile\.js/.test(html), 'the old phone bar is gone, and so is its preload');
  check(/modulepreload" href="js\/ui\/sheet\.js"/.test(html), 'the sheet is preloaded: the first screen on a phone is made of it');
  check(!/sr-mobilebar|sr-drawer/.test(css + site + shareCss), 'no rule for the old bar or its drawers is left');
  check(/handle\.type = 'button'/.test(sheet) && /aria-describedby/.test(sheet) && /'ArrowUp'/.test(sheet) && /'ArrowDown'/.test(sheet), 'the handle is a button with a description and the arrow keys');
  check(/focusin/.test(sheet), 'focus moving into hidden content raises the sheet to show it');
  const rule = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  const side = rule('html.sr-phone #sr-side');
  check(/background: var\(--sr-glass-strong\)/.test(side), 'the sheet wears glass-strong (§2.1)');
  check(/padding-bottom: env\(safe-area-inset-bottom/.test(side) && /env\(safe-area-inset-top/.test(side), 'it pads for the home indicator and keeps the notch\'s inset above full');
  check(/transform: translateY\(var\(--sr-sheet-y/.test(side) && /transform var\(--sr-slow\) var\(--sr-ease\)/.test(side), 'a height change is a transform in --sr-slow');
  check(/border-radius: var\(--sr-radius-shell\) var\(--sr-radius-shell\) 0 0/.test(side), 'top corners of the shell\'s radius');
  check(/height: var\(--sr-sheet-handle\)/.test(rule('html.sr-phone .sr-sheet__handle')) && /--sr-sheet-handle: 48px/.test(css), 'the handle band is 48 px');
  check(/width: 36px;\s*height: 4px/.test(rule('.sr-sheet__grabber')), 'the grabber is 36 × 4');
  check(/html\.sr-phone #sr-side,[\s\S]{0,120}transition: opacity 120ms linear/.test(css), 'reduced motion: the sheet jumps (no transform transition)');
  check(/calc\(-1 \* \(var\(--sr-sheet-h\) \+ var\(--sp-3\)\)\)/.test(rule('html.sr-phone .sr-time')), 'the pill rides 12 px above the sheet');
  check(/html\.sr-phone\[data-sheet='full'\] \.sr-time/.test(css) && /html\.sr-phone\.sr-card-open \.sr-time/.test(css), 'and hides at full and while a card is up');
  // One clock on screen: the live line under the search shows only while the pill is hidden by a
  // card, from the same <html> state (no second timer), and never at full, where the sheet meets the bar.
  check(/html\.sr-phone \.sr-top__line \{\s*display: none;/.test(css), 'the live line is off by default on a phone, where the pill carries the time');
  check(/html\.sr-phone\.sr-card-open:not\(\[data-sheet='full'\]\) \.sr-top__line \{\s*display: block;/.test(css), 'and on only while a card hides the pill, and not at full');
  check(!/setInterval/.test(readFileSync(join(JS, 'ui/shell.js'), 'utf8')) && !/sr-top__line|lineHost\.hidden|line\.hidden/.test(readFileSync(join(JS, 'ui/timepill.js'), 'utf8').replace(/lineHost && lineHost\.appendChild\(line\)|const lineHost = [^\n]*/g, '')), 'no script toggles it: CSS reads the state the shell and sheet already write');
  check(/html\.sr-phone \.sr-top \.sr-search__input \{[^}]*font-size: 16px/.test(css), 'the phone\'s search field is 16 px (no zoom on focus)');
  check(/html\.sr-phone \.sr-tabs__tab \{[^}]*height: 44px/.test(css) && /width: calc\(var\(--sr-top-bar\) - 2px\)/.test(css), '44 px targets: the tabs and the top bar\'s tools');
}

if (problems.length) { console.error('sheet FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('sheet ok: peek 96 / half 48 % / full less 60 px, slow releases go to the nearest height and flicks to the next, a tap cycles, a card opens at half and closing returns to peek, the subject sits in the middle of the band between the top bar and the sheet, and the old phone bar is gone');
