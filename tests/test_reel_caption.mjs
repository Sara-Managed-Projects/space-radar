// A reel's caption has room for its honesty note (found in a browser frame, 2026-10-09).
//
//   node tests/test_reel_caption.mjs
//
// In a reel nobody can scroll the caption (`pointer-events: none`), and a trip's caption panel is
// capped at half the window: the aurora stop's note lost its last line at 1440 x 900. Held here,
// from the stylesheets' own numbers: the reel's cap is larger than the trip's, it does not scroll,
// and the tallest caption a reel of the lobby shows fits a 1440 x 900 window under that cap.
// Reads stylesheets as text, so it is NOT in scripts/check_built_tree.mjs TESTS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const ui = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
const auto = readFileSync(join(ROOT, 'site/css/autopilot.css'), 'utf8');

const block = (css, sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
const tripCap = Number((/max-height:\s*(\d+)vh/.exec(block(ui, '\n.sr-tripsheet.is-present')) || [])[1]);
const reel = block(auto, 'html.sr-ambient .sr-tripsheet.is-present');
const reelCap = Number((/max-height:\s*(\d+)vh/.exec(reel) || [])[1]);
check(tripCap === 50, `a trip's caption is capped at half the window (${tripCap}vh)`);
check(reelCap > tripCap && reelCap <= 66, `a reel's caption may be taller than a trip's, and still leaves a third of the window to the scene (${reelCap}vh)`);
check(/overflow:\s*hidden/.test(reel) && /pointer-events:\s*none/.test(reel), 'it cannot be scrolled, so it does not offer a scrollbar');

// The tallest caption seen: a microlabel, a title, "Shown now", four lines of words, a three-line note.
const px = (name) => Number((new RegExp(`--${name}:\\s*(\\d+)px`).exec(ui) || [])[1]);
const sm = px('sr-fs-present-sm'); const body = px('sr-fs-present'); const name = px('sr-fs-present-name');
check(sm > 0 && body > 0 && name > 0, `the present-mode sizes are in ui.css (${sm}, ${body}, ${name})`);
const need = 20 + sm * 1.35 + name * 1.12 + sm * 1.35 + 16 + 4 * body * 1.38 + 3 * sm * 1.35 + 24;
// The frame of 2026-10-09 lost one line of the note (30 px) under the old cap, so the blocks' own
// margins come to about 37 px more than this sum; the cap must clear the sum by twice that.
check(need + 74 <= (900 * reelCap) / 100, `that caption needs ${Math.round(need)} px before its margins and a 900 px window gives ${Math.round((900 * reelCap) / 100)}`);

if (problems.length) {
  console.error(`reel caption FAILED (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`reel caption ok: a reel's caption may take ${reelCap}vh (a trip's ${tripCap}vh); a four-line stop with a three-line note needs ${Math.round(need)} px of a 900 px window`);
