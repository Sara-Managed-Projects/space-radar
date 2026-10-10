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

// css/share.css is linked by the share sheet on its first open (spec 0061 task 8), and held to the
// same rules as the stylesheets linked at boot.
const FILES = ['site/css/site.css', 'site/css/ui.css', 'site/css/share.css', 'site/css/keyhint.css', 'site/css/embed.css', 'site/css/autopilot.css', 'site/css/finishers.css', 'site/css/exoface.css'];
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
  '--sr-glass-strong', '--sr-text-soft', '--sr-wash', '--sr-wash-hover', '--sr-wash-strong', '--sr-ember-light',
  '--sr-fs-unit', '--sr-fs-sm', '--sr-fs-label', '--sr-fs-body', '--sr-fs-input', '--sr-fs-glyph', '--sr-fs-num-sm',
  '--sr-fs-lead', '--sr-fs-num', '--sr-fs-mark', '--sr-fs-name-sm', '--sr-fs-name',
  '--sr-z-labels', '--sr-z-hud', '--sr-z-veil', '--sr-z-controls', '--sr-z-pill', '--sr-z-card', '--sr-z-rail',
  '--sr-z-pop', '--sr-z-trip', '--sr-z-modal', '--sr-z-toast', '--sr-z-boot',
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

// --- 2b. the guide's contrast table, complete (docs/ui-guide.md section 2.1 and 7; 0061 task 5) --
// What section 2 holds for text and text-dim on glass, held for every role the guide gives a
// number: text on both grounds and on the stronger glass, the accent and the state colours as
// marks (3:1, SC 1.4.11) and as text where they are text, ink on an ember fill, the selected row's
// wash, and every class colour as a swatch on glass over a cloud and on bare space.
if (glass && text && dim && space) {
  const onW = over(glass, WHITE);
  const onK = over(glass, space);
  const strong = rgba(token('--sr-glass-strong') || '');
  const need = (name, fg, bg, floor, where) => {
    if (!fg || !bg) { problems.push(`${name} is not a colour this test can read`); return; }
    const r = ratio(fg, bg);
    check(r >= floor, `${name} ${where} is ${r.toFixed(2)}:1, under ${floor}:1`);
  };
  for (const [name, fg] of [['--sr-text', text], ['--sr-text-dim', dim]]) {
    need(name, fg, onW, 4.5, 'on glass over a white cloud');
    need(name, fg, onK, 4.5, 'on glass over space');
    if (strong) need(name, fg, over(strong, WHITE), 4.5, 'on the strong glass over a white cloud');
  }
  check(!!strong && strong.a >= glass.a && solid.a >= strong.a, 'the glasses are ordered: glass, then glass-strong, then the solid fallback, none lighter than the one before');
  const soft = rgba(token('--sr-text-soft') || '');
  if (soft) {
    need('--sr-text-soft', over(soft, onW), onW, 4.5, 'on glass over a white cloud');
    check(soft.a >= 0.62, `--sr-text-soft is white at ${soft.a}; no text alpha under 0.62`);
  }
  // The accent: 3:1 as a mark, and it is text too (the countdown, a text action, the matched letters).
  const ember = hex(token('--sr-ember'));
  need('--sr-ember', ember, onW, 4.5, 'on glass over a white cloud');
  need('--sr-ember', ember, onK, 4.5, 'on glass over space');
  need('--sr-ember-light', hex(token('--sr-ember-light')), onW, 4.5, 'on glass over a white cloud');
  need('--sr-ink on --sr-ember', hex(token('--sr-ink')), ember, 4.5, '(the primary button)');
  // The selected row: text on the ember wash over glass over a cloud.
  const emberSoft = rgba(token('--sr-ember-soft') || '');
  if (emberSoft) need('--sr-text on --sr-ember-soft', text, over(emberSoft, onW), 4.5, 'over glass over a white cloud');
  // The status dot's colours and "off": graphics, with their words beside them.
  for (const name of ['--sr-ok', '--sr-stale', '--sr-unread']) need(name, hex(token(name)), onW, 3, 'as a dot on glass over a white cloud');
  // The class colours, as the swatches in What to show and the search: a 10 px dot beside a name.
  const CLASSES = ['station', 'satellite', 'debris', 'rocket', 'probe', 'telescope', 'asteroid', 'comet', 'site', 'world', 'star', 'exoplanet', 'dso', 'exotic', 'storm', 'unknown'];
  let lowest = Infinity;
  for (const c of CLASSES) {
    const fg = hex(token(`--sr-${c}`));
    need(`--sr-${c}`, fg, onW, 3, 'as a swatch on glass over a white cloud');
    need(`--sr-${c}`, fg, space, 3, 'as a dot on bare space');
    if (fg) lowest = Math.min(lowest, ratio(fg, onW));
  }
  table.push(`ember on glass over #fff: ${ratio(ember, onW).toFixed(2)}; the faintest class swatch there: ${lowest.toFixed(2)}`);
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
      // Tokens only since spec 0061 task 6 (docs/ui-guide.md section 2.3): a literal 5px is a
      // fifth corner nobody chose. `inherit` is a pseudo-element taking its host's corner.
      const ok = /^var\(--sr-radius(-sm|-pill|-shell)?\)$/.test(part) || part === '50%' || part === '0' || part === 'inherit';
      if (!ok) problems.push(`${r.file} ${r.selector}: border-radius ${value}; a corner is --sr-radius-sm, --sr-radius, --sr-radius-shell, --sr-radius-pill, 50% or 0`);
    }
  }
}

// --- 5. no colour literal outside :root (docs/ui-guide.md section 2 and 7; spec 0061 task 6) ----
// A hex, an rgb()/rgba()/hsl(), or a named colour in a rule is a colour nobody can find again:
// issue #197 counted `rgba(232,236,242,.7)`, `.66`, `.5`, `.1`, `.08`, `.06` and `.05` in the
// shell, seven greys beside the three the contrast table holds, and the `.5` placeholder was
// 3.31:1 over a cloud. One form is allowed: `rgba(var(--token), a)`, a tint of a named triplet
// (a trip card's hue).
const NAMED = /(?:^|[\s,(])(white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|gold|navy|teal|aqua|cyan|magenta|maroon|olive|lime|brown|beige|ivory|tan|coral|salmon|crimson|indigo|violet|khaki)(?=$|[\s,)])/i;
const COLOUR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left)|border-(top-|right-|bottom-|left-)?color|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|text-decoration|text-decoration-color|column-rule|filter|-webkit-text-stroke|-webkit-tap-highlight-color|scrollbar-color)$/;
for (const r of all) {
  if (r.selector === ':root') continue;
  for (const m of r.body.matchAll(/#[0-9a-f]{3,8}\b/gi)) problems.push(`${r.file} ${r.selector}: raw colour ${m[0]}; name it in :root`);
  for (const [prop, value] of decls(r.body)) {
    if (prop.startsWith('--')) continue; // a component's own variable is held where it is used
    for (const m of value.matchAll(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*([^)]*)/gi)) {
      if (/^var\(--[\w-]+$/.test(m[2].trim())) continue; // rgba(var(--sr-trip-hue), .5)
      problems.push(`${r.file} ${r.selector}: ${prop} has the literal ${m[0]}); a colour is a token from :root`);
    }
    if (COLOUR_PROPS.test(prop)) {
      const named = NAMED.exec(value.replace(/var\([^)]*\)/g, ' '));
      if (named) problems.push(`${r.file} ${r.selector}: ${prop} names the colour "${named[1]}"; a colour is a token from :root`);
    }
  }
}
// The same promise in the builders: a colour written into `style` from ui/*.js is a literal too.
// A swatch painted with a record's own class colour (a variable) is data, and passes. The print
// composer and the postcard draw on a 2D canvas, which cannot read a custom property per call:
// they are held to the palette by tests/test_printcard.mjs and tests/test_postcard.mjs.
{
  const { readdirSync } = await import('node:fs');
  const dir = join(ROOT, 'site/js/ui');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      const m = /\.style\.(?:color|background|backgroundColor|borderColor|fill|stroke|outline|boxShadow)\s*=\s*(['"`])([^'"`]*)\1/.exec(line)
        || /\.style\.setProperty\(\s*['"](?:color|background|background-color|border-color|fill|stroke)['"]\s*,\s*(['"`])([^'"`]*)\1/.exec(line)
        || /\.style\.cssText\s*=\s*(['"`])([^'"`]*)\1/.exec(line);
      if (m && (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i.test(m[2]) || NAMED.test(m[2]))) problems.push(`site/js/ui/${f}:${i + 1}: a colour literal in a style assignment ("${m[2]}"); give the element a class and name the colour in :root`);
    });
  }
}

// --- 5b. every text colour is a text token, and every text token reads (section 2.1, task 6) ----
// `color:` takes --sr-text, --sr-text-soft, --sr-text-dim, the ember and its light, the ink on an
// ember fill, and the two status hues that pass as text. Each is recomputed on glass over a white
// cloud above (2b). --sr-unread and --sr-text-faint are graphics (3.04 and 2.44 there): a row that
// says "never read" in --sr-unread is a sentence at 3:1, and that was on the sources sheet.
{
  const TEXT_TOKENS = new Set(['--sr-text', '--sr-text-soft', '--sr-text-dim', '--sr-ember', '--sr-ember-light', '--sr-ink', '--sr-ok', '--sr-stale', '--text', '--text-dim']);
  for (const r of all) {
    for (const [prop, value] of decls(r.body)) {
      if (prop !== 'color') continue;
      const v = /^var\((--[\w-]+)\)$/.exec(value);
      const ok = (v && TEXT_TOKENS.has(v[1])) || ['inherit', 'currentColor', 'currentcolor', 'transparent'].includes(value);
      if (!ok) problems.push(`${r.file} ${r.selector}: color is ${value}; text is --sr-text, --sr-text-soft, --sr-text-dim, the ember or the ink (a status hue only as --sr-ok or --sr-stale)`);
    }
  }
  if (glass && text) {
    const onW = over(glass, WHITE);
    for (const name of ['--sr-ok', '--sr-stale']) {
      const fg = hex(token(name));
      check(!!fg && ratio(fg, onW) >= 4.5, `${name} as text on glass over a white cloud is ${fg ? ratio(fg, onW).toFixed(2) : '?'}:1, under 4.5:1`);
    }
    const soft = rgba(token('--sr-text-soft') || '');
    const strong = rgba(token('--sr-glass-strong') || '');
    if (soft && strong) {
      const bg = over(strong, WHITE);
      check(ratio(over(soft, bg), bg) >= 4.5, '--sr-text-soft on the strong glass over a white cloud is under 4.5:1');
    }
    // An alpha-white text token under .62 is the grey the guide retired (row D's .50 and .55).
    for (const [name, defs] of tokens) {
      if (!/^--sr-text/.test(name)) continue;
      const c = rgba(defs[0].value);
      if (c) check(c.a >= 0.62, `${name} is text at alpha ${c.a}; no text alpha under 0.62`);
    }
  }
  // --sr-text-dim is for glass. On a wash or the ember wash it drops to 3.76 and 3.40 over a cloud:
  // a rule that paints one of those and sets the dim grey has put the two together.
  for (const r of all) {
    const d = new Map(decls(r.body));
    const bg = d.get('background') || d.get('background-color') || '';
    if (/var\(--sr-(wash(-hover|-strong)?|ember-soft)\)/.test(bg) && d.get('color') === 'var(--sr-text-dim)') {
      problems.push(`${r.file} ${r.selector}: --sr-text-dim on ${bg}; secondary text on a wash is --sr-text-soft`);
    }
  }
}

// --- 5c. z-index from the ladder (section 2.6, task 6) ------------------------------------------
// One ladder in :root, bottom to top. A rule takes a rung, or 0, 1, 2 or auto for its own layers.
// `calc(var(--sr-z-card) + 1)` is a rung nobody named: the picker and the toast each had one.
{
  const ladder = [...tokens].filter(([n]) => n.startsWith('--sr-z-')).map(([n, d]) => [n, Number(d[0].value)]);
  check(ladder.length >= 10 && ladder.every(([, v]) => Number.isInteger(v)), `the z ladder is ${ladder.length} integer tokens in :root`);
  const seen = new Map();
  for (const [n, v] of ladder) { check(!seen.has(v), `${n} and ${seen.get(v)} are both z-index ${v}: two rungs at one height`); seen.set(v, n); }
  const z = (n) => (ladder.find(([name]) => name === n) || [0, NaN])[1];
  check(z('--sr-z-labels') < z('--sr-z-hud') && z('--sr-z-hud') < z('--sr-z-veil') && z('--sr-z-veil') < z('--sr-z-controls'), 'labels, then the HUD, then the veil, then the panels');
  check(z('--sr-z-controls') < z('--sr-z-pill') && z('--sr-z-pill') < z('--sr-z-card') && z('--sr-z-card') < z('--sr-z-rail') && z('--sr-z-rail') < z('--sr-z-pop'), 'the sidebar, the pill, the card, the rail, its popover');
  check(z('--sr-z-pop') < z('--sr-z-trip') && z('--sr-z-trip') < z('--sr-z-modal') && z('--sr-z-modal') < z('--sr-z-toast') && z('--sr-z-toast') < z('--sr-z-boot'), 'the trip, the share sheet, a toast, the boot veil');
  for (const r of all) {
    for (const [prop, value] of decls(r.body)) {
      if (prop !== 'z-index') continue;
      const v = /^var\((--sr-z-[\w-]+)\)$/.exec(value);
      const ok = (v && tokens.has(v[1])) || ['auto', '0', '1', '2'].includes(value);
      if (!ok) problems.push(`${r.file} ${r.selector}: z-index ${value}; a layer is a --sr-z-* rung, or 0, 1, 2 or auto inside a component`);
    }
  }
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
// Spec 0061 task 7: the trip's toolbar and its top bar; its sheet wears it where it floats (a phone).
check(/'sr-trip__toolbar sr-float'/.test(js('tripframe.js')) && /'sr-trip__top sr-float'/.test(js('tripframe.js')), 'the trip toolbar and top bar wear sr-float');
check(/classList\.toggle\('sr-float', want === host\)/.test(js('tripframe.js')), 'the trip sheet wears sr-float where it floats over the scene');
check(/'sr-search__pop sr-float'/.test(js('search.js')), 'the search results wear sr-float');
check(/'sr-share sr-float sr-over-clean'/.test(js('sharesheet.js')), 'the share sheet wears sr-float and still shows over a clear screen');

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

// --- 8. type from the ladder, and its floor (issue #315, spec 0045 req 6; guide section 2.2) -----
// Every font-size is a --sr-fs-* token (spec 0061 task 6): 13.5, 18, 22 and 27 px were each one
// rule's own idea. Nothing a person reads is under 13 px. A unit or caption beside its number may
// be --sr-fs-unit (11): the clock's UTC/Local tag, the trajectory chart's axis captions, the tag's
// KM (spec 0047) and the arc's N E S W (spec 0051). Anything else under 13 is a sentence somebody
// has to squint at.
const UNIT_SELECTORS = new Set(['.sr-clock__tag', '.sr-traj__label', '.sr-tag__unit', '.sr-arc__cardinal']);
{
  const sizes = [...tokens].filter(([n]) => n.startsWith('--sr-fs-'));
  check(sizes.length >= 8, `the type ladder is ${sizes.length} --sr-fs-* tokens in :root`);
  for (const [n, d] of sizes) {
    const px = /^([\d.]+)px$/.exec(d[0].value);
    check(!!px && d.length === 1, `${n} is one px value (${d.map((x) => x.value).join(', ')})`);
    if (px) check(n === '--sr-fs-unit' ? parseFloat(px[1]) >= 11 : parseFloat(px[1]) >= 13, `${n} is ${d[0].value}; reading text is 13 px or more, a unit 11`);
  }
  for (const r of all) {
    if (r.at.startsWith('@font-face')) continue;
    for (const [prop, value] of decls(r.body)) {
      if (prop !== 'font-size' && prop !== 'font') continue;
      if (['inherit', '0', '100%', '1em'].includes(value)) continue;
      const used = /var\((--sr-fs-[\w-]+)\)/.exec(value);
      if (!used || !tokens.has(used[1]) || /(?:^|\s)[\d.]+(px|rem|em|pt|%)(?=$|[\s/])/.test(value.replace(/\/\s*[\d.]+(px|em|%)?/, ''))) {
        problems.push(`${r.file} ${r.selector}: ${prop}: ${value}; a size is a --sr-fs-* token (the ladder in ui.css :root, docs/ui-guide.md section 2.2)`);
        continue;
      }
      if (used[1] !== '--sr-fs-unit') continue;
      const sels = r.selector.split(',').map((x) => x.trim().replace(/\s+/g, ' '));
      if (!sels.every((x) => UNIT_SELECTORS.has(x))) problems.push(`${r.file} ${r.selector}: ${prop}: ${value}; reading text is 13 px or more, and only a unit beside its number may be 11`);
    }
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

// --- 9b. motion from the tokens (docs/ui-guide.md section 2.5 and 7; spec 0061 req 12) ----------
// Every duration in a transition or an animation is --sr-fast, --sr-mid or --sr-slow, and every
// curve --sr-ease, --sr-ease-in or linear. A literal is allowed in exactly two places: 120 ms inside
// `prefers-reduced-motion` (the fade), and scene motion, which keeps its own constants
// (docs/design-language.md): the boot veil and its one waiting mark in site.css, and a trip
// subject's label settling over the scene (ui/labels.js EMPHASIS_MS, held by tests/test_labels.mjs).
const SCENE_MOTION = new Set(['.boot', '.boot-mark::after', '#labels .label.is-subject .label__text', '#labels .label.is-dimmed']);
const MOTION_PROPS = new Set(['transition', 'transition-duration', 'transition-delay', 'transition-timing-function', 'animation', 'animation-duration', 'animation-delay', 'animation-timing-function']);
for (const r of all) {
  if (r.selector.split(',').every((x) => SCENE_MOTION.has(x.trim()))) continue;
  // `-reduced` in a class is the same promise made from JavaScript (ui/hud.js reads the media query).
  const reduced = /prefers-reduced-motion:\s*reduce/.test(r.at) || /-reduced\b/.test(r.selector);
  for (const [prop, value] of decls(r.body)) {
    if (!MOTION_PROPS.has(prop)) continue;
    const bare = value.replace(/var\(--[\w-]+\)/g, ' ').replace(/cubic-bezier\([^)]*\)/g, ' cubic-bezier ').replace(/steps\([^)]*\)/g, ' steps ');
    for (const m of bare.matchAll(/(?:^|[\s,])(-?[\d.]+)(ms|s)\b/g)) {
      const ms = parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1);
      if (ms === 0 || (reduced && ms === 120)) continue;
      problems.push(`${r.file} ${r.selector}: ${prop} has the literal ${m[1]}${m[2]}; a duration is --sr-fast, --sr-mid or --sr-slow${reduced ? '' : ' (120ms only under prefers-reduced-motion)'}`);
    }
    for (const m of bare.matchAll(/(?:^|[\s,])(ease(?:-in|-out|-in-out)?|cubic-bezier|steps)(?=$|[\s,])/g)) {
      problems.push(`${r.file} ${r.selector}: ${prop} uses ${m[1]}; a curve is --sr-ease, --sr-ease-in or linear`);
    }
    if (/\binfinite\b/.test(bare)) problems.push(`${r.file} ${r.selector}: ${prop} loops; nothing in the chrome loops`);
  }
}
// Under reduced motion the tokens themselves are the 120 ms linear fade, so every rule above is.
{
  const reducedRoot = all.find((r) => r.selector === ':root' && /prefers-reduced-motion:\s*reduce/.test(r.at));
  const d = new Map(reducedRoot ? decls(reducedRoot.body) : []);
  check(['--sr-fast', '--sr-mid', '--sr-slow'].every((n) => d.get(n) === '120ms') && d.get('--sr-ease') === 'linear' && d.get('--sr-ease-in') === 'linear',
    'under prefers-reduced-motion :root turns --sr-fast, --sr-mid and --sr-slow into 120ms and both curves into linear');
}
// Reduced motion reaches every stylesheet that moves anything: a sheet with a transition or an
// animation and no `prefers-reduced-motion` block has forgotten the people who asked.
for (const f of FILES) {
  const mine = all.filter((r) => r.file === f);
  const moves = mine.some((r) => decls(r.body).some(([p, v]) => (p === 'transition' || p === 'animation') && v !== 'none'));
  check(!moves || mine.some((r) => /prefers-reduced-motion:\s*reduce/.test(r.at)), `${f} moves things and has no prefers-reduced-motion block`);
}
// The sidebar's view push (0061 req 12): 220 ms, a 12 px slide and a fade; back comes from the left.
{
  const push = all.find((r) => r.selector === '.sr-side__view.is-current' && r.at === '');
  check(!!push && /sr-view-in var\(--sr-mid\) var\(--sr-ease\)/.test(push.body), 'the sidebar view push is sr-view-in in --sr-mid with --sr-ease');
  const raw = FILES.map((f) => strip(readFileSync(join(ROOT, f), 'utf8'))).join('\n');
  check(/@keyframes sr-view-in\s*\{\s*from\s*\{[^}]*opacity:\s*0[^}]*translateX\(12px\)/.test(raw), 'sr-view-in starts 12 px to the right, from nothing');
  check(/@keyframes sr-view-back\s*\{\s*from\s*\{[^}]*opacity:\s*0[^}]*translateX\(-12px\)/.test(raw), 'sr-view-back starts 12 px to the left, from nothing');
}

// --- 10. faces: exactly the three, self-hosted (design-language amendment 2026-09-28) ------------
// Spec 0061 task 5 added Instrument Serif for names; Ivan rejected it on 2026-10-03 and task 6 took
// the face, its file, its preload and its token out. A fourth family is a design decision: it fails
// here first, and so does a font file nobody declares (it would ship, and a preload would fetch it).
const fontsCss = readFileSync(join(ROOT, 'site/css/fonts.css'), 'utf8');
const css = [...FILES.map((f) => readFileSync(join(ROOT, f), 'utf8')), fontsCss].join('\n');
const allFaces = [...strip(css).matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
// The fallback faces (internal #553) are a local system face scaled to a web face: no file, no range.
const fallbackFaces = allFaces.filter((b) => /font-family:\s*['"][^'"]+ Fallback['"]/.test(b));
const faces = allFaces.filter((b) => !fallbackFaces.includes(b));
for (const b of fallbackFaces) check(/src:\s*local\('[^']+'\)/.test(b) && /size-adjust:\s*[\d.]+%/.test(b) && /ascent-override:/.test(b) && /descent-override:/.test(b) && !/url\(/.test(b), `a fallback face is local() with size-adjust and overrides: ${b.trim().slice(0, 60)}`);
check(fallbackFaces.length === 5, `five fallback faces (${fallbackFaces.length})`);
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
check(/^'Inter', 'Inter Fallback',/.test(token('--sr-font') || ''), `--sr-font starts with Inter (${token('--sr-font')})`);
check(/^'JetBrains Mono', 'JetBrains Mono Fallback',/.test(token('--sr-font-mono') || ''), `--sr-font-mono starts with JetBrains Mono (${token('--sr-font-mono')})`);
check(/^'Barlow Semi Condensed', 'Barlow Semi Condensed Fallback',/.test(token('--sr-font-hud') || ''), `--sr-font-hud starts with Barlow Semi Condensed (${token('--sr-font-hud')})`);
// No serif anywhere: not a token, not a family in a rule or a builder, not a file, not a preload.
check(!tokens.has('--sr-font-serif'), '--sr-font-serif is defined; names and titles are sans (Ivan, 2026-10-03)');
{
  const { readdirSync } = await import('node:fs');
  const declared = new Set(faces.map((b) => (/url\(['"]?\.\.\/fonts\/([^'")]+)/.exec(b) || [])[1]).filter(Boolean));
  for (const f of readdirSync(join(ROOT, 'site/fonts')).filter((n) => n.endsWith('.woff2'))) check(declared.has(f), `site/fonts/${f} ships and no @font-face declares it`);
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  for (const m of html.matchAll(/<link rel="preload" href="fonts\/([^"]+)"/g)) check(declared.has(m[1]), `index.html preloads fonts/${m[1]}, which no @font-face declares`);
  for (const r of all) {
    for (const [prop, value] of decls(r.body)) {
      if (prop !== 'font' && prop !== 'font-family') continue;
      const bare = value.replace(/sans-serif/g, '');
      check(!/serif|Georgia|Palatino|Times|Iowan/i.test(bare), `${r.file} ${r.selector}: ${prop}: ${value}; a serif, and names and titles are sans`);
      check(/var\(--sr-font(-hud|-mono)?\)|var\(--font\)|^inherit$/.test(value), `${r.file} ${r.selector}: ${prop}: ${value}; a face is --sr-font, --sr-font-hud or --sr-font-mono`);
    }
  }
  const uiDir = join(ROOT, 'site/js/ui');
  for (const f of readdirSync(uiDir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(uiDir, f), 'utf8').replace(/sans-serif/g, '');
    check(!/font-family:[^;}]*serif|Instrument Serif|--sr-font-serif/i.test(src), `site/js/ui/${f} sets a serif; names and titles are sans`);
  }
  check(!('serif_bytes' in (await import(join(ROOT, 'site/js/data/budgets.js'))).BUDGETS), 'registry/budgets.yaml still has a serif_bytes row');
}

if (problems.length) {
  console.error('tokens FAILED:\n  ' + problems.join('\n  '));
  if (table.length) console.error('  contrast: ' + table.join('; '));
  process.exit(1);
}
console.log(`tokens ok: ${DESIGN_TOKENS.length} tokens defined once, the palette unchanged, 6 px corners, the lit edge and the brackets in place, every size, colour, corner and layer a token, nothing read under 13 px, Compact and the panel motion defined, three faces self-hosted and no serif; contrast ${table.join('; ')}`);
