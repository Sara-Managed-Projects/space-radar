// tests/test_tokens.mjs -- the look of the instrument, as a contract (spec 0045).
//
// Ivan, 2026-09-28: "high quality everywhere", and orbitalradar.com, EVE Online and Prosperous
// Universe as the references. The design-language amendment of that day turned them into numbers:
// glass at 0.82, a 1 px lit top edge, 6 px corners, ember corner brackets for what is selected or
// focused. This reads site/css/site.css and site/css/ui.css as text (no browser) and holds them to
// those numbers, and it recomputes the contrast table from the token values, so a token change that
// breaks AA over a white cloud fails here: set --sr-glass to the study's 0.62 and it goes red.
//
//   node tests/test_tokens.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const FILES = ['site/css/site.css', 'site/css/ui.css'];
// Comments out, positions kept, so nothing quoted in a comment counts as a rule.
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

// Every rule as {file, at, selector, body}: `at` is the enclosing at-rule's prelude, '' at the top.
function rules(file) {
  const css = strip(readFileSync(join(ROOT, file), 'utf8'));
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      const head = css.slice(start, i).trim();
      const at = head.startsWith('@');
      stack.push({ head, at, bodyStart: i + 1 });
      start = i + 1;
    } else if (css[i] === '}') {
      const open = stack.pop();
      if (open && !open.at) {
        const at = stack.filter((s) => s.at).map((s) => s.head).join(' ');
        out.push({ file, at, selector: open.head, body: css.slice(open.bodyStart, i) });
      }
      start = i + 1;
    } else if (css[i] === ';' && !stack.some((s) => !s.at)) {
      start = i + 1; // an @import or @charset at the top
    }
  }
  return out;
}

const decls = (body) => {
  const out = [];
  for (const part of body.split(';')) {
    const m = /^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(part);
    if (m) out.push([m[1], m[2].replace(/\s+/g, ' ')]);
  }
  return out;
};

const all = FILES.flatMap(rules);
const rootRules = all.filter((r) => r.selector === ':root' && r.at === '');
const tokens = new Map();
for (const r of rootRules) {
  for (const [name, value] of decls(r.body)) {
    if (!name.startsWith('--')) continue;
    tokens.set(name, [...(tokens.get(name) || []), { file: r.file, value }]);
  }
}
const token = (name) => (tokens.get(name) || [])[0]?.value;

// --- 1. the token block (design section 1), each name defined once ---------------------------
const DESIGN_TOKENS = [
  '--sr-space', '--sr-space-edge', '--sr-ember', '--sr-ink', '--sr-text', '--sr-text-dim',
  '--sr-ember-soft', '--sr-text-faint',
  '--sr-glass', '--sr-glass-thin', '--sr-glass-solid', '--sr-blur',
  '--sr-line', '--sr-line-strong', '--sr-edge-lit', '--sr-edge-glow', '--sr-shadow',
  '--sr-radius', '--sr-radius-sm', '--sr-radius-pill', '--sr-bracket', '--sr-bracket-w',
  '--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sr-pad', '--sr-header-h',
  '--sr-font', '--sr-font-hud', '--sr-font-mono',
  '--sr-ease', '--sr-ease-in', '--sr-fast', '--sr-mid', '--sr-slow',
  // the old names, kept as aliases for one release
  '--sr-panel', '--font',
];
for (const name of DESIGN_TOKENS) {
  const defs = tokens.get(name) || [];
  check(defs.length === 1, `${name} is defined ${defs.length} times in the :root blocks (${defs.map((d) => d.file).join(', ') || 'nowhere'}); once, please`);
}

// The palette does not move, byte for byte (spec 0045 req 1).
const PALETTE = {
  '--sr-space': '#0b0e14', '--sr-space-edge': '#05070a', '--sr-ember': '#ff9f43', '--sr-ink': '#14100a',
  '--sr-text': '#e8ecf2', '--sr-text-dim': '#9aa4b2', '--sr-station': '#f2f4f7', '--sr-satellite': '#7fd1ff',
  '--sr-debris': '#7a8494', '--sr-rocket': '#ffd166', '--sr-probe': '#c3a6ff', '--sr-telescope': '#9ef0d8',
  '--sr-asteroid': '#b8926a', '--sr-comet': '#d9f3ff', '--sr-site': '#f58f7c',
};
for (const [name, want] of Object.entries(PALETTE)) check((token(name) || '').toLowerCase() === want, `${name} is ${token(name)}, and the palette is ${want}`);
check(token('--sr-panel') === 'var(--sr-glass-solid)', `--sr-panel is an alias of --sr-glass-solid (${token('--sr-panel')})`);
check(token('--font') === 'var(--sr-font)', `--font is an alias of --sr-font (${token('--font')})`);

// --- 2. the contrast table, recomputed from the tokens ---------------------------------------
const hex = (h) => { const m = /^#([0-9a-f]{6})$/i.exec(String(h).trim()); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const rgba = (v) => { const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(String(v).trim()); return m ? { rgb: [+m[1], +m[2], +m[3]], a: +m[4] } : null; };
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const over = (glass, under) => glass.rgb.map((c, i) => glass.a * c + (1 - glass.a) * under[i]);
const WHITE = [255, 255, 255];
const glass = rgba(token('--sr-glass'));
const thin = rgba(token('--sr-glass-thin'));
const solid = rgba(token('--sr-glass-solid'));
const text = hex(token('--sr-text'));
const dim = hex(token('--sr-text-dim'));
const space = hex(token('--sr-space'));
const table = [];
if (glass && thin && solid && text && dim && space) {
  // The worst case is a panel over a white cloud bigger than the blur radius: blur cannot help.
  const onGlass = over(glass, WHITE);
  const t = ratio(text, onGlass);
  const d = ratio(dim, onGlass);
  table.push(`--sr-glass ${glass.a} over #fff: text ${t.toFixed(2)}, text-dim ${d.toFixed(2)}`);
  check(t >= 4.5, `--sr-text on --sr-glass over a white cloud is ${t.toFixed(2)}:1, under AA`);
  check(d >= 4.5, `--sr-text-dim on --sr-glass (${glass.a}) over a white cloud is ${d.toFixed(2)}:1, under AA; 0.82 is the lowest alpha that keeps it at 4.5`);
  const onSolid = over(solid, WHITE);
  check(ratio(dim, onSolid) >= ratio(dim, onGlass), '--sr-glass-solid is at least as dark as --sr-glass: it is the fallback, not a lighter look');
  // The thin glass carries no text under 18 px, so it is held only over bare space.
  const onThin = over(thin, space);
  const td = ratio(dim, onThin);
  table.push(`--sr-glass-thin ${thin.a} over space: text-dim ${td.toFixed(2)}`);
  check(td >= 4.5, `--sr-text-dim on --sr-glass-thin over space is ${td.toFixed(2)}:1`);
  // The card view's secondary text ON a wash (docs/ui-guide.md §2.1, spec 0061 task 2): the hint
  // and chevron of a pressed or hovered row. --sr-text-dim drops under AA there; --sr-text-soft
  // must not, on every wash, over the worst cloud.
  const soft = rgba(token('--sr-text-soft') || '');
  if (soft) {
    for (const w of ['--sr-wash', '--sr-wash-hover', '--sr-wash-strong']) {
      const wash = rgba(token(w) || '');
      if (!wash) { problems.push(`${w} is not an rgba() this test can read`); continue; }
      const bg = over(wash, onGlass);
      const r = ratio(over(soft, bg), bg);
      table.push(`--sr-text-soft on ${w} over glass over #fff: ${r.toFixed(2)}`);
      check(r >= 4.5, `--sr-text-soft on ${w} over glass over a white cloud is ${r.toFixed(2)}:1, under AA`);
    }
  } else {
    problems.push('--sr-text-soft is not an rgba() this test can read');
  }
  const faint = hex(token('--sr-text-faint'));
  if (faint) table.push(`--sr-text-faint on space: ${ratio(faint, space).toFixed(2)} (rules and ticks only)`);
} else {
  problems.push('the glass, text or space tokens are not in a form this test can read (rgba() and #rrggbb)');
}

// --- 3. no third grey for text ------------------------------------------------------------------
for (const r of all) {
  for (const [prop, value] of decls(r.body)) {
    if (prop === 'color' && /var\(--sr-text-faint\)/.test(value)) problems.push(`${r.file} ${r.selector}: color is --sr-text-faint, which is 4.09:1 on bare space; it is for rules and ticks`);
  }
}

// --- 4. corners: 6 px panels, nothing rounder -----------------------------------------------------
check(/^\d+(\.\d+)?px$/.test(token('--sr-radius') || '') && parseFloat(token('--sr-radius')) <= 6, `--sr-radius is ${token('--sr-radius')}; panels are 6 px`);
// Spec 0061 design §9: the one exception, the shell's OUTER corners (the sidebar, the tool rail and
// its popover), 16 px as row D draws them. A token, so it is one number and nothing else borrows it.
check(token('--sr-radius-shell') === '16px', `--sr-radius-shell is ${token('--sr-radius-shell')}; the shell's outer corners are 16 px`);
for (const r of all) {
  for (const [prop, value] of decls(r.body)) {
    if (prop !== 'border-radius' && !/^border-(top|bottom)-(left|right)-radius$/.test(prop)) continue;
    for (const part of value.split(/\s+|\//).filter(Boolean)) {
      const ok = /^var\(--sr-radius(-sm|-pill|-shell)?\)$/.test(part) || part === '50%' || part === '0' || (/^[\d.]+px$/.test(part) && parseFloat(part) <= 6);
      if (!ok) problems.push(`${r.file} ${r.selector}: border-radius ${value}; a corner is a --sr-radius token, a circle, or at most 6 px`);
    }
  }
}

// --- 5. no raw hex colour outside :root ---------------------------------------------------------
for (const r of all) {
  if (r.selector === ':root') continue;
  for (const m of r.body.matchAll(/#[0-9a-f]{3,8}\b/gi)) problems.push(`${r.file} ${r.selector}: raw colour ${m[0]}; name it in :root`);
}

// --- 6. the panel chrome ----------------------------------------------------------------------------
const floatRule = all.find((r) => r.selector === '.sr-float' && r.at === '');
const has = (rule, prop, value) => !!rule && decls(rule.body).some(([p, v]) => p === prop && v === value);
check(has(floatRule, 'background', 'var(--sr-glass)'), '.sr-float is --sr-glass');
check(has(floatRule, 'backdrop-filter', 'var(--sr-blur)') && has(floatRule, '-webkit-backdrop-filter', 'var(--sr-blur)'), '.sr-float blurs with --sr-blur, prefixed for Safari');
check(has(floatRule, 'border', '1px solid var(--sr-line)'), '.sr-float has the 1 px hairline');
check(has(floatRule, 'border-top-color', 'var(--sr-edge-lit)'), '.sr-float has the lit top edge');
check(has(floatRule, 'border-radius', 'var(--sr-radius)'), '.sr-float has 6 px corners');
check(has(floatRule, 'box-shadow', 'var(--sr-edge-glow), var(--sr-shadow)'), '.sr-float has the glow above the edge and the shadow');
check(all.some((r) => r.selector === '.sr-float' && /prefers-reduced-transparency: reduce/.test(r.at) && has(r, 'background', 'var(--sr-glass-solid)')), 'prefers-reduced-transparency turns the glass solid');
check(all.some((r) => r.selector === '.sr-float' && /@supports not/.test(r.at) && /backdrop-filter/.test(r.at) && has(r, 'background', 'var(--sr-glass-solid)')), 'without backdrop-filter the glass is solid');
check(!all.some((r) => /scanline|grain|noise/i.test(r.selector)), 'no scanlines, grain or noise');

// The builders put the chrome on every floating panel. Since spec 0061 the sidebar, the tool rail,
// its popover and the time pill are the floating panels; the sources sheet is a view of the sidebar
// and wears its glass.
const js = (f) => readFileSync(join(ROOT, 'site/js/ui', f), 'utf8');
check(/classList\.add\('sr-card', 'sr-float'\)/.test(js('cards.js')), 'the card wears sr-float');
check(/el\('aside', 'sr-side sr-float'\)/.test(js('shell.js')), 'the sidebar wears sr-float');
check(/'sr-rail sr-float'/.test(js('rail.js')) && /'sr-pop sr-float'/.test(js('rail.js')), 'the tool rail and its popover wear sr-float');
check(/el\('div', 'sr-time sr-float'\)/.test(js('timepill.js')), 'the time pill wears sr-float');
check(/'sr-trip__bar sr-trip__bar--bottom sr-float'/.test(js('tripframe.js')) && /'sr-trip__bar sr-trip__bar--top sr-float'/.test(js('tripframe.js')), 'both trip bars wear sr-float');
check(/'sr-search__pop sr-float'/.test(js('search.js')), 'the search results wear sr-float');
check(/'sr-print-menu sr-float sr-over-clean'/.test(js('printcard.js')), 'the print menu wears sr-float and still shows over a clear screen');

// --- 7. corner brackets: the selection and focus signature --------------------------------------
const bracket = all.find((r) => /::before/.test(r.selector) && /\.sr-bracketed::before/.test(r.selector));
check(!!bracket, 'there is a .sr-bracketed::before rule');
if (bracket) {
  const sels = bracket.selector.split(',').map((s) => s.trim());
  check(sels.includes('.sr-search__option.is-active::before'), 'the selected search row wears the brackets');
  check(sels.some((s) => /:focus-visible::before$/.test(s)), 'a focused control wears the brackets');
  const grads = (bracket.body.match(/linear-gradient\(var\(--sr-ember\) 0 0\)/g) || []).length;
  check(grads === 4, `the ::before draws four ember ticks (two corners), found ${grads}`);
  check(/var\(--sr-bracket\)/.test(bracket.body) && /var\(--sr-bracket-w\)/.test(bracket.body), 'the ticks are --sr-bracket long and --sr-bracket-w thick');
  check(/pointer-events: none/.test(bracket.body), 'the brackets never take a tap');
}
check(all.some((r) => /\.sr-bracketed::after/.test(r.selector) && /scaleY\(-1\)/.test(r.body)), '::after mirrors the top ticks into the bottom corners');
check(token('--sr-bracket') === '8px' && token('--sr-bracket-w') === '1.5px', 'brackets are 8 px ticks, 1.5 px thick');
for (const r of all.filter((x) => x.selector === '.sr-door.is-on')) {
  check(!/border-color: var\(--sr-ember\)|inset 0 -2px 0 var\(--sr-ember\)/.test(r.body), 'the mode tile lost its 1 px ember box to the brackets');
}

// --- 8. the type floor: nothing a person reads under 13 px (issue #315, spec 0045 req 6) -------
// A unit or caption beside its number may be 11 px: the clock's UTC/Local tag and the trajectory
// chart's axis captions. Anything else under 13 is a sentence somebody has to squint at.
const UNIT_SELECTORS = new Set(['.sr-clock__tag', '.sr-traj__label', '.sr-tag__unit', '.sr-arc__cardinal']); // spec 0047: the tag's KM, KM/H; spec 0051: the arc's N E S W
for (const r of all) {
  if (r.at.startsWith('@font-face')) continue;
  for (const [prop, value] of decls(r.body)) {
    const px = prop === 'font-size' ? /^([\d.]+)px$/.exec(value) : prop === 'font' ? /(?:^|\s)([\d.]+)px/.exec(value) : null;
    if (!px || parseFloat(px[1]) >= 13) continue;
    const sels = r.selector.split(',').map((x) => x.trim().replace(/\s+/g, ' '));
    const unit = sels.every((x) => UNIT_SELECTORS.has(x));
    if (!unit) problems.push(`${r.file} ${r.selector}: font-size ${value}; reading text is 13 px or more, and only a unit beside its number may be 11`);
    else if (parseFloat(px[1]) < 11) problems.push(`${r.file} ${r.selector}: a unit at ${value}; 11 px is the smallest`);
  }
}

// --- 9. density and motion (spec 0045 req 10, 11) ----------------------------------------------
const compact = all.find((r) => r.selector === 'html.sr-compact' && r.at === '');
check(has(compact, '--sr-pad', '10px') && has(compact, '--sr-header-h', '28px'), 'html.sr-compact sets --sr-pad 10px and --sr-header-h 28px');
check(!!floatRule && /opacity var\(--sr-mid\) var\(--sr-ease\)/.test(floatRule.body) && /border-color var\(--sr-fast\)/.test(floatRule.body), 'a panel moves in --sr-mid and its hairline in --sr-fast');
check(all.some((r) => r.selector === '.sr-float:hover' && has(r, 'border-color', 'var(--sr-line-strong)')), 'hover strengthens the hairline');
check(all.some((r) => /:where\(button\):active/.test(r.selector) && has(r, 'transform', 'translateY(1px)')), 'pressed is a 1 px nudge');
check(all.some((r) => r.at === '@starting-style' && /\.sr-card\.sr-float/.test(r.selector) && has(r, 'opacity', '0') && has(r, 'transform', 'translateY(12px)')), 'the card opens from 12 px below, from nothing');
check(all.some((r) => /prefers-reduced-motion: reduce/.test(r.at) && /\.sr-float/.test(r.selector) && has(r, 'transition', 'opacity 120ms linear')), 'reduced motion is a 120 ms fade and nothing else');
check(token('--sr-fast') === '140ms' && token('--sr-mid') === '220ms' && token('--sr-slow') === '320ms', 'motion is 140 / 220 / 320 ms');
check(!/@keyframes\s+[\w-]*(pulse|bounce|glow)/i.test(FILES.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n')), 'no bounce and no glow pulse');

// --- 10. faces: exactly the three the amendment names, self-hosted; never Bricolage --------------
const fontsCss = readFileSync(join(ROOT, 'site/css/fonts.css'), 'utf8');
const css = [...FILES.map((f) => readFileSync(join(ROOT, f), 'utf8')), fontsCss].join('\n');
const faces = [...strip(css).matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
const families = new Set(faces.map((b) => (/font-family:\s*["']?([^;"']+)/.exec(b) || [])[1]).filter(Boolean).map((f) => f.trim()));
const FACES = ['Inter', 'Barlow Semi Condensed', 'JetBrains Mono'];
check(families.size === 3 && FACES.every((f) => families.has(f)), `@font-face declares ${[...families].join(', ') || 'nothing'}; exactly Inter, Barlow Semi Condensed and JetBrains Mono`);
check(!/Bricolage/i.test(strip(css)), 'Bricolage Grotesque is not loaded (design-language amendment 2026-09-28)');
for (const b of faces) {
  const src = /url\(['"]?\.\.\/fonts\/([^'")]+\.woff2)['"]?\)\s*format\(['"]woff2['"]\)/.exec(b);
  check(!!src, `a face without a self-hosted WOFF2 source: ${b.trim().slice(0, 80)}`);
  if (src) check(existsSync(join(ROOT, 'site/fonts', src[1])), `site/fonts/${src[1]} is named in fonts.css and is not in the tree`);
  check(/font-display:\s*swap/.test(b), 'every face swaps: the system face first, never invisible text');
  check(/unicode-range:/.test(b), 'every face names its unicode-range, so a Latin page never fetches Cyrillic');
}
check(/^'Inter',/.test(token('--sr-font') || ''), `--sr-font starts with Inter (${token('--sr-font')})`);
check(/^'JetBrains Mono',/.test(token('--sr-font-mono') || ''), `--sr-font-mono starts with JetBrains Mono (${token('--sr-font-mono')})`);
check(/^'Barlow Semi Condensed',/.test(token('--sr-font-hud') || ''), `--sr-font-hud starts with Barlow Semi Condensed (${token('--sr-font-hud')})`);

if (problems.length) {
  console.error('tokens FAILED:\n  ' + problems.join('\n  '));
  if (table.length) console.error('  contrast: ' + table.join('; '));
  process.exit(1);
}
console.log(`tokens ok: ${DESIGN_TOKENS.length} tokens defined once, the palette unchanged, 6 px corners, the lit edge and the brackets in place, nothing read under 13 px, Compact and the panel motion defined, three faces self-hosted; contrast ${table.join('; ')}`);
