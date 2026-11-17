// tests/test_rtl_panels.mjs -- every panel anchored beside the tools rail has a right-to-left rule (internal #449).
//   node tests/test_rtl_panels.mjs
// A stylesheet that fixes a panel with `right: calc(... + 48px + 12px)` (clear of the rail) puts it over the sidebar in Hebrew
// and Arabic, where css/rtl.css swaps the sidebar and the rail. This reads the stylesheets and fails on such a selector with no
// mirror in css/rtl.css.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const CSS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/css');
const rtl = readFileSync(join(CSS, 'rtl.css'), 'utf8');
const problems = [];
const SKIP = new Set(['rtl.css']);
let seen = 0;
for (const f of readdirSync(CSS).filter((x) => x.endsWith('.css') && !SKIP.has(x))) {
  const src = readFileSync(join(CSS, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(/(^|\})\s*([^{}@]+)\{([^{}]*)\}/g)) {
    const sel = m[2].trim(); const body = m[3];
    if (/^html\.sr-phone|^html\[dir/.test(sel)) continue;
    if (!/(^|;|\s)right:\s*calc\([^;]*48px \+ 12px\)/.test(body) || /margin-right/.test(sel)) continue;
    for (const one of sel.split(',').map((x) => x.trim())) {
      const cls = /\.(sr-[\w-]+)/.exec(one);
      if (!cls) continue;
      seen += 1;
      const mirrored = new RegExp(`html\\[dir='rtl'\\][^{]*\\.${cls[1]}\\b[^{]*\\{[^}]*left:`).test(rtl);
      if (!mirrored) problems.push(`${f}: ${one} sits clear of the rail on the right and css/rtl.css has no left rule for .${cls[1]}`);
    }
  }
}
if (seen < 3) problems.push(`found only ${seen} panels beside the rail; the reader is wrong`);
for (const sel of ['.sr-findpill', '.sr-datejump', '.sr-helio-chip', '.sr-helio-legend']) if (!rtl.includes(sel)) problems.push(`${sel} has no rule in css/rtl.css`);
if (problems.length) { console.error('rtl panels FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`rtl panels ok: ${seen} panels clear of the rail each mirror to the left in css/rtl.css, and the find pill, date field and Sun legend too`);
