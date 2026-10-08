// tests/test_guide_rails.mjs -- the rules docs/ui-guide.md section 7 listed "to add" that no test
// held (internal #375): the spacing grid, weights that are loaded, numbers and time in the copy,
// one primary, and the dim grey kept off a wash through DESCENDANT rules. Static: the stylesheets
// and copy/en.js read as text and as data, no browser.
//   node tests/test_guide_rails.mjs
//
// TWO OF THESE ARE RATCHETS, AND SAY SO. The sheets were written before the grid was a rule: on the
// day this landed 65 of 161 spacing values were off it (6, 10 and 14 px mostly). Moving them is a
// pass over every panel with a picture read after each, which is design work, not a test. So the
// grid is held the way a debt is: the off-grid values are counted per size, the count may only go
// DOWN, and a size that is not in the table is refused outright. The same for the ember fills that
// are not the guide's four: each is named here with what it is, and a new one is refused.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const FILES = ['site/css/site.css', 'site/css/ui.css', 'site/css/share.css', 'site/css/keyhint.css', 'site/css/embed.css'];
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
/** Every rule as {file, at, selector, body} (the reader tests/test_tokens.mjs uses). */
export function rules(file, text) {
  const css = strip(text ?? readFileSync(join(ROOT, file), 'utf8'));
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      const head = css.slice(start, i).trim();
      stack.push({ head, at: head.startsWith('@'), bodyStart: i + 1 });
      start = i + 1;
    } else if (css[i] === '}') {
      const open = stack.pop();
      if (open && !open.at) out.push({ file, at: stack.filter((s) => s.at).map((s) => s.head).join(' '), selector: open.head.replace(/\s+/g, ' '), body: css.slice(open.bodyStart, i) });
      start = i + 1;
    } else if (css[i] === ';' && !stack.some((s) => !s.at)) start = i + 1;
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
const all = FILES.flatMap((f) => rules(f));
/** A selector list split at its top-level commas (`:where(a, b)` is one selector). */
function selectors(list) {
  const out = [];
  let depth = 0; let cur = '';
  for (const c of list) {
    if (c === '(' || c === '[') depth += 1;
    if (c === ')' || c === ']') depth -= 1;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// --- 1. the spacing grid (guide section 2.3): 4 px steps, or a hairline's 1 and 2 ------------------
const SPACING = /^(padding|margin|gap|row-gap|column-gap|inset)(-(top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?$/;
/** The px lengths in spacing declarations that are not on the grid: [{file, selector, prop, px}]. */
export function offGrid(ruleList) {
  const out = [];
  for (const r of ruleList) {
    for (const [prop, value] of decls(r.body)) {
      if (!SPACING.test(prop)) continue;
      for (const m of value.matchAll(/(-?\d*\.?\d+)px/g)) {
        const px = Math.abs(Number(m[1]));
        if (px % 4 !== 0 && px !== 1 && px !== 2) out.push({ file: r.file, selector: r.selector, prop, px });
      }
    }
  }
  return out;
}
// The debt, by size, counted 2026-10-07. LOWER a number when you move a value onto the grid; never
// raise one, and never add a size. (A token, `var(--sp-3)`, is on the grid by construction.)
// 2026-10-08 (internal #434): 65 -> 22. Forty-three moved onto --sp-* (the sources sheet, the search
// field and its list, the picker, the colour key, the card's bar, What to show, the place chips);
// what is left is geometry (a tape mark's half width, the tick, the HUD tag and chevron, the tab
// track's 3 px inset the guide names) and four paddings that set every section's height.
const OFF_GRID_KNOWN = { 6: 7, 10: 3, 14: 2, 3: 3, 5: 3, 22: 2, 9: 1, 0.75: 1 };
{
  const found = offGrid(all);
  const bySize = new Map();
  for (const f of found) bySize.set(f.px, [...(bySize.get(f.px) || []), f]);
  for (const [px, list] of bySize) {
    const known = OFF_GRID_KNOWN[px];
    if (known === undefined) problems.push(`spacing: ${px}px is not on the 4 px grid and is not a size the sheets already had (${list.map((f) => `${f.file} ${f.selector} ${f.prop}`).slice(0, 3).join('; ')}); use a --sp-* token`);
    else if (list.length > known) problems.push(`spacing: ${list.length} values of ${px}px, and the sheets had ${known}: a new one is off the 4 px grid (the last: ${list.slice(-2).map((f) => `${f.file} ${f.selector} ${f.prop}`).join('; ')}); use a --sp-* token`);
    else if (list.length < known) problems.push(`spacing: ${px}px is down to ${list.length} from ${known}: good, now lower OFF_GRID_KNOWN[${px}] in tests/test_guide_rails.mjs so it cannot come back`);
  }
  for (const px of Object.keys(OFF_GRID_KNOWN)) if (!bySize.has(Number(px))) problems.push(`spacing: no ${px}px left: remove it from OFF_GRID_KNOWN in tests/test_guide_rails.mjs`);
  // The checker itself, on a sheet made for it.
  const probe = offGrid(rules('probe.css', '.a { padding: 8px 12px; margin: -4px 1px 2px 0; gap: var(--sp-2); } .b { padding: 6px; inset: 0 auto 13px; width: 7px; }'));
  check(probe.map((p) => p.px).join() === '6,13', `the grid check reads a sheet: 6 and 13 are off, 8, 12, -4, 1, 2, 0, a token and a width are not (${probe.map((p) => p.px)})`);
}

// --- 2. weights loaded (guide section 2.2): no weight the browser would have to fake --------------
{
  const faces = new Map(); // family -> Set(weights)
  for (const r of rules('site/css/fonts.css')) {
    if (r.selector !== '@font-face' && !/^@font-face/.test(r.selector)) continue;
    const d = new Map(decls(r.body));
    const fam = String(d.get('font-family') || '').replace(/['"]/g, '');
    if (fam) faces.set(fam, (faces.get(fam) || new Set()).add(String(d.get('font-weight'))));
  }
  // @font-face is an at-rule with declarations: the reader above files it under `at`.
  if (!faces.size) {
    const css = strip(readFileSync(join(ROOT, 'site/css/fonts.css'), 'utf8'));
    for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      const d = new Map(decls(m[1]));
      const fam = String(d.get('font-family') || '').replace(/['"]/g, '');
      if (fam) faces.set(fam, (faces.get(fam) || new Set()).add(String(d.get('font-weight'))));
    }
  }
  check(faces.size === 3, `site/css/fonts.css loads three families (${[...faces.keys()]})`);
  const ui = strip(readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8'));
  const familyOf = {};
  for (const m of ui.matchAll(/(--sr-font(?:-hud|-mono)?)\s*:\s*'([^']+)'/g)) familyOf[m[1]] = m[2];
  check(familyOf['--sr-font'] && familyOf['--sr-font-hud'] && familyOf['--sr-font-mono'], `the three face tokens name their family (${JSON.stringify(familyOf)})`);
  const everyWeight = new Set([...faces.values()].flatMap((s) => [...s]));
  const norm = (w) => (w === 'normal' ? '400' : w === 'bold' ? '700' : w);
  for (const r of all) {
    const d = new Map(decls(r.body));
    const short = /^(\d{3}|normal|bold) [^/]+(?:\/\S+)? var\((--sr-font(?:-hud|-mono)?)\)$/.exec(d.get('font') || '');
    let weight = d.has('font-weight') ? norm(d.get('font-weight')) : short ? norm(short[1]) : null;
    const famTok = short ? short[2] : (/var\((--sr-font(?:-hud|-mono)?)\)/.exec(d.get('font-family') || '') || [])[1];
    if (d.has('font') && !short && !['inherit'].includes(d.get('font'))) problems.push(`${r.file} ${r.selector}: font: ${d.get('font')} is not "<weight> <size>/<line> var(--sr-font*)" or inherit, so its weight cannot be checked`);
    if (weight === null || weight === 'inherit') continue;
    if (!/^\d{3}$/.test(weight)) { problems.push(`${r.file} ${r.selector}: font-weight ${weight} is not a number`); continue; }
    if (famTok && familyOf[famTok]) {
      const have = faces.get(familyOf[famTok]) || new Set();
      if (!have.has(weight)) problems.push(`${r.file} ${r.selector}: ${familyOf[famTok]} at ${weight}, and only ${[...have].sort().join(' and ')} are loaded: the browser would fake it`);
    } else if (!everyWeight.has(weight)) {
      problems.push(`${r.file} ${r.selector}: font-weight ${weight} is loaded for no face (${[...everyWeight].sort().join(', ')})`);
    }
  }
}

// --- 3. numbers and time in the copy (guide section 3.1) -----------------------------------------
{
  const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
  await import(join(ROOT, 'site/js/copy/en.later.js'));
  const strings = [];
  const walk = (o, p) => { for (const [k, v] of Object.entries(o || {})) { const q = p ? `${p}.${k}` : k; if (typeof v === 'string') strings.push([q, v]); else if (v && typeof v === 'object') walk(v, q); } };
  walk(COPY, '');
  check(strings.length > 1000, `the copy was read (${strings.length} strings)`);
  for (const [key, text] of strings) {
    // Thousands are grouped by the narrow no-break space fmt.int() writes (U+202F): never a comma,
    // never a plain space a line can break at.
    const comma = /\d,\d{3}(?!\d)/.exec(text);
    if (comma) problems.push(`copy ${key}: "${comma[0]}" groups thousands with a comma; the app writes 35 786 (U+202F)`);
    const plain = /\d \d{3}(?!\d)(?! (BC|AD)\b)/.exec(text);
    if (plain) problems.push(`copy ${key}: "${plain[0]}" groups thousands with a plain space, which a line can break at; use U+202F`);
    const half = /\b\d{1,2}(:\d\d)? ?(AM|PM|am|pm|a\.m\.|p\.m\.)(?![\w])/.exec(text);
    if (half) problems.push(`copy ${key}: "${half[0]}": the clock is 24 hour`);
  }
  // The time pill is the app's own clock, not the visitor's: its time says UTC, or names the zone.
  for (const [key, text] of strings) {
    if (!/^timePill\./.test(key) || !/\{(time|hhmm|clock)\}/.test(text)) continue;
    check(/UTC|\{zone\}/.test(text), `copy ${key}: a time in the time pill says UTC or names its zone: "${text}"`);
  }
  check(strings.some(([k, v]) => k.startsWith('timePill.') && /\{time\} UTC/.test(v)), 'the time pill has a time, and it says UTC');
}

// --- 3b. no count or age that goes stale in the hand-kept "why" lines (internal #198) ---------------
// "Seven people live here" was wrong with the next crew and "Thirty-five years" with the next April:
// the object pages had to leave both lines out. A date does not go stale; a count of years or of
// people does.
{
  const { NOTABLE, DEBRIS_NOTABLE } = await import(join(ROOT, 'site/js/data/layers.js'));
  const NUM = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?';
  const stale = new RegExp(`\\b${NUM}\\s+(?:people|astronauts|cosmonauts|taikonauts|crew)\\b|\\b${NUM}\\s+years\\s+(?:of|old|in orbit|later)\\b|\\bfor\\s+${NUM}\\s+years\\b`, 'i');
  const rows = [...NOTABLE, ...(DEBRIS_NOTABLE || [])];
  check(rows.length > 30, `the hand-kept lists were read (${rows.length})`);
  for (const r of rows) {
    const m = stale.exec(String(r.why || ''));
    if (m) problems.push(`data/layers.js ${r.name}: "${m[0]}" is a count that goes stale; say the date it started from instead ("since November 2000")`);
  }
  check(stale.test('Seven people live here.') && stale.test('Thirty-five years of the pictures') && !stale.test('People have lived here without a break since November 2000.'), 'the check reads the two lines it was written for, and passes a date');
  const pages = readFileSync(join(ROOT, 'scripts/object_pages.mjs'), 'utf8');
  check(/const DATED_WHY = new Map\(\[\]\);/.test(pages), 'scripts/object_pages.mjs holds no `why` back as dated any more');
}

// --- 4. one primary (guide section 2.1): the ember is a fill in a few named places -----------------
// The guide's four first; then what the sheets also fill with ember, each with what it is. A new
// ember fill is refused: a second orange button on a surface is two primaries.
const EMBER_FILLS = [
  [/^\.sr-btn--primary$/, 'the primary button'],
  [/^\.sr-time__dot$/, "the time pill's dot"],
  [/\.sr-bracketed::(before|after)|\.sr-search__option\.is-active::|\.sr-search__row:has\(:focus-visible\)::|^:where\(.*\):focus-visible::(before|after)$|\.sr-tick$|\.sr-reticle|\.sr-skyreticle/, 'the bracket ticks: selection, focus, the reticle, and what the phone points at in the sky'],
  [/^\.sr-act--primary$/, "the card's one primary action (the same button, on the card)"],
  [/^\.sr-tripsheet__start$/, "the trip sheet's Start (its one primary)"],
  [/^\.sr-trip__tb--play\.is-paused$/, 'Play while a trip is paused (the one thing to press)'],
  [/^\.sr-photo__save$/, "the photo sheet's Save (its one primary)"],
  [/^\.sr-time__live$/, 'Back to now, shown only away from now'],
  [/^\.sr-tag__leader$/, "the tag's leader line: a mark, 1 px"],
  [/^\.sr-statusline\[data-state='failed'\] \.sr-statusline__dot$/, 'the status dot when a source failed: a mark'],
  [/^\.sr-sheet__handle:focus-visible \.sr-sheet__grabber$/, "the sheet's grabber under keyboard focus: the focus signature"],
];
{
  const seen = new Set();
  for (const r of all) {
    for (const [prop, value] of decls(r.body)) {
      if (!/^background(-color|-image)?$/.test(prop) || !/var\(--sr-ember\)/.test(value)) continue;
      for (const sel of selectors(r.selector)) {
        const i = EMBER_FILLS.findIndex(([re]) => re.test(sel));
        if (i < 0) problems.push(`${r.file} ${sel}: an ember fill that is not one of the named ones (the primary button, the pill's dot, the bracket ticks, ...). One primary per surface: use .sr-btn--primary, or name it in EMBER_FILLS with what it is`);
        else seen.add(i);
      }
    }
  }
  EMBER_FILLS.forEach(([re, what], i) => check(seen.has(i), `EMBER_FILLS names "${what}" (${re}) and no rule fills it with ember any more: remove the row`));
  // Statically, one primary per builder: no module makes two .sr-btn--primary in one function.
}

// --- 5. --sr-text-dim on a wash, through descendant rules (guide section 5b) -----------------------
// tests/test_tokens.mjs holds the same RULE; this holds the rule under it: `.card.is-off` painted
// with a wash and `.card.is-off .card__title` set to the dim grey is the same 3.76:1.
{
  const WASH = /var\(--sr-(wash(-hover|-strong)?|ember-soft)\)/;
  const washed = [];
  const dim = [];
  for (const r of all) {
    const d = new Map(decls(r.body));
    const sels = selectors(r.selector);
    if (WASH.test(d.get('background') || '') || WASH.test(d.get('background-color') || '')) washed.push(...sels.map((s) => ({ s, r })));
    if (d.get('color') === 'var(--sr-text-dim)') dim.push(...sels.map((s) => ({ s, r })));
  }
  check(washed.length > 20 && dim.length > 20, `the sheets were read (${washed.length} washed selectors, ${dim.length} dim ones)`);
  for (const w of washed) {
    for (const x of dim) {
      if (x.s !== w.s && (x.s.startsWith(`${w.s} `) || x.s.startsWith(`${w.s}>`))) {
        problems.push(`${x.r.file} ${x.s}: --sr-text-dim inside ${w.s}, which is painted with a wash; secondary text on a wash is --sr-text-soft`);
      }
    }
  }
}

if (problems.length) { console.error('guide rails FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`guide rails ok: no new spacing off the 4 px grid (${Object.values(OFF_GRID_KNOWN).reduce((a, b) => a + b, 0)} old values counted down by size), every weight is one its face loads, thousands grouped by U+202F and a 24 hour clock, ${EMBER_FILLS.length} named ember fills and no other, no dim grey inside a wash`);
