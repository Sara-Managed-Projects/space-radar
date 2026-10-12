// tests/helpers/css_tokens.mjs -- read a stylesheet with its tokens written out.
//
// Since spec 0061 task 6 every font size and layer in site/css is a token
// (`font: 600 var(--sr-fs-body)/1.3 ...`, `z-index: var(--sr-z-hud)`), and tests/test_tokens.mjs
// holds the tokens' values. The tests that hold a COMPONENT to a number ("the tag's name is 600
// 15 px", "the HUD is layer 6") still mean the number: they read the stylesheet through this, which
// writes each `var(--sr-fs-*)` and `var(--sr-z-*)` back as the value :root gives it. (Corners and
// durations were tokens before, and the tests that hold them name the token.) A token that is not defined is left as it is, so the test fails on it.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KINDS = /^--sr-(fs-|z-)/;

let table = null;
function tokens() {
  if (table) return table;
  table = new Map();
  const ui = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const root = /(?:^|\n):root\s*\{([\s\S]*?)\n\}/.exec(ui);
  for (const m of (root ? root[1] : '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) if (KINDS.test(m[1])) table.set(m[1], m[2].trim());
  return table;
}

/** The stylesheet text with its size and layer tokens written out as values. */
export function resolveTokens(css) {
  const t = tokens();
  return String(css).replace(/var\((--[\w-]+)\)/g, (all, name) => (t.has(name) ? t.get(name) : all));
}

/** Read a stylesheet under site/css with its tokens resolved. */
export function readCss(name) {
  return resolveTokens(readFileSync(join(ROOT, 'site/css', name), 'utf8'));
}
