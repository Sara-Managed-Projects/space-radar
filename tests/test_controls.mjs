// tests/test_controls.mjs -- one control set, and no one-off control (the maintainer, 2026-11-11: the app's buttons
// looked "sloppy and vibecoded", and on a phone some selects had no style at all).
//
// The app's controls are css/controls.css, the design kit's control set (docs/UI_COMPONENTS.md): .ui-btn, .ui-seg,
// .ui-select, .ui-radio, .ui-check, .ui-range, .ui-close, .ui-pop, .ui-row, .ui-chip. This reads every builder in
// site/js/ui as text (no browser) and holds:
//   1. every <select> it makes wears .ui-select;
//   2. every <input type="radio|checkbox|range"> wears .ui-radio, .ui-check or .ui-range;
//   3. every close button wears .ui-close and draws the icon set's x, never a "×" typed as text;
//   4. none of the retired looks is written anywhere (the ember brackets, the fourteen button looks, the four selects);
//   5. css/controls.css is linked by the page, after ui.css, and defines each class of the set.
// A new control that is none of these is a new look: add it to the set (controls.css and the kit, with its row in
// docs/UI_COMPONENTS.md), never beside it.
//
//   node tests/test_controls.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'site/js/ui');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/^(\s*)\/\/.*$/gm, '$1');
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

const KIND = { radio: 'ui-radio', checkbox: 'ui-check', range: 'ui-range' };

/** The controls one builder's source makes, each with the classes it is given: [{kind, line, classes}]. */
export function controlsIn(text) {
  const src = code(text);
  const out = [];
  // The class an element gets: the second argument of its el()/node() call, or `<name>.className = '...'` near it.
  const classOf = (name, at) => {
    const around = src.slice(Math.max(0, at - 700), at + 700);
    const made = new RegExp(`\\b${name}\\s*=\\s*(?:\\w+\\()(?:doc,\\s*)?'(?:input|select|button)'\\s*,\\s*(['\`])([^'\`]*)\\1`).exec(around);
    const set = new RegExp(`\\b${name}\\.className\\s*=\\s*(['\`])([^'\`]*)\\1`).exec(around);
    return `${made ? made[2] : ''} ${set ? set[2] : ''}`.trim();
  };
  // selects: el('select', 'a b') and `const s = document.createElement('select')`
  for (const m of src.matchAll(/\b(?:el|node)\(\s*(?:doc,\s*)?'select'\s*(?:,\s*(['`])([^'`]*)\1)?/g)) out.push({ kind: 'select', line: lineOf(src, m.index), classes: m[2] || '' });
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:doc|document)\.createElement\('select'\)/g)) out.push({ kind: 'select', line: lineOf(src, m.index), classes: classOf(m[1], m.index) });
  // inputs: `x.type = 'range'`, `x.setAttribute('type', 'range')`, Object.assign(x, { type: 'range' }), input('checkbox', ...)
  const typed = [
    /\b(\w+)\.type\s*=\s*'(radio|checkbox|range)'/g,
    /\b(\w+)\.setAttribute\(\s*'type'\s*,\s*'(radio|checkbox|range)'\s*\)/g,
    /Object\.assign\(\s*(\w+)\s*,\s*\{\s*type:\s*'(radio|checkbox|range)'/g,
  ];
  for (const re of typed) for (const m of src.matchAll(re)) out.push({ kind: m[2], line: lineOf(src, m.index), classes: classOf(m[1], m.index) });
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\w+\.appendChild\(input\('(radio|checkbox|range)'/g)) out.push({ kind: m[2], line: lineOf(src, m.index), classes: classOf(m[1], m.index) });
  for (const m of src.matchAll(/\b\w+\.appendChild\(input\('(radio|checkbox|range)'/g)) {
    if (!/=\s*$/.test(src.slice(Math.max(0, m.index - 20), m.index))) out.push({ kind: m[1], line: lineOf(src, m.index), classes: '' });
  }
  // close buttons: a button whose class names a close, or a variable called close / closeBtn / x made as a button
  for (const m of src.matchAll(/\b(?:el|node|button)\(\s*(?:doc,\s*)?(?:'button'\s*,\s*)?(['`])([^'`]*\b[\w-]*(?:close|__x)\b[^'`]*)\1/g)) out.push({ kind: 'close', line: lineOf(src, m.index), classes: m[2] });
  for (const m of src.matchAll(/(?:const|let)\s+(close|closeBtn|x)\s*=\s*(?:el|node|button)\(\s*(?:doc,\s*)?(?:'button'\s*,\s*)?(['`])([^'`]*)\2/g)) out.push({ kind: 'close', line: lineOf(src, m.index), classes: m[3] });
  for (const m of src.matchAll(/(?:const|let)\s+(close|closeBtn)\s*=\s*(?:doc|document)\.createElement\('button'\)/g)) out.push({ kind: 'close', line: lineOf(src, m.index), classes: classOf(m[1], m.index) });
  for (const m of src.matchAll(/(?:textContent\s*=\s*|el\([^)]*,\s*)'×'/g)) out.push({ kind: 'glyph', line: lineOf(src, m.index), classes: '' });
  // One control found by two patterns (a variable called close whose class names a close) is one control.
  const seen = new Set();
  return out.filter((c) => { const k = `${c.kind}:${c.line}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** What is wrong with one control, or ''. */
export function fault(c) {
  const cls = String(c.classes).split(/\s+/);
  if (c.kind === 'select') return cls.includes('ui-select') ? '' : 'a <select> without .ui-select';
  if (c.kind in KIND) return cls.includes(KIND[c.kind]) ? '' : `an input type="${c.kind}" without .${KIND[c.kind]}`;
  if (c.kind === 'close') return cls.includes('ui-close') ? '' : 'a close button without .ui-close';
  if (c.kind === 'glyph') return 'a "×" typed as a button\'s text: a close is .ui-close with icon(\'x\')';
  return '';
}

// --- the checker, on a builder made for it ------------------------------------------------------------------------
{
  const probe = controlsIn(`
    const a = el('select', 'sr-old__select');
    const b = document.createElement('select');
    b.className = 'ui-select ui-select--sm';
    const r = el('input', 'ui-radio'); r.type = 'radio';
    const k = el('input'); k.type = 'checkbox';
    const g = document.createElement('input'); g.setAttribute('type', 'range'); g.className = 'sr-thing__range';
    const x = el('button', 'sr-panel__close', '×');
    const close = el('button', 'ui-close');
    // const ignored = el('select', 'in-a-comment');
  `);
  const bad = probe.map((c) => [c.kind, fault(c)]).filter(([, f]) => f).map(([k]) => k).sort().join(',');
  check(probe.length === 8, `the checker finds the probe's eight controls (${probe.length}: ${probe.map((c) => c.kind)})`);
  check(bad === 'checkbox,close,glyph,range,select', `the checker refuses the probe's one-offs and passes the shared ones (${bad})`);
}

// --- 1-3. every builder ------------------------------------------------------------------------------------------
const counts = { select: 0, radio: 0, checkbox: 0, range: 0, close: 0 };
for (const f of readdirSync(UI).filter((n) => n.endsWith('.js')).sort()) {
  for (const c of controlsIn(readFileSync(join(UI, f), 'utf8'))) {
    const why = fault(c);
    if (why) problems.push(`site/js/ui/${f}:${c.line}: ${why} (classes "${c.classes}"); use the shared control set, css/controls.css (docs/UI_COMPONENTS.md)`);
    else if (c.kind in counts) counts[c.kind] += 1;
  }
}
check(counts.select >= 8 && counts.radio >= 2 && counts.checkbox >= 6 && counts.range >= 9 && counts.close >= 14, `the builders were read (${JSON.stringify(counts)})`);

// --- 4. the retired looks are gone, from the builders and the sheets ----------------------------------------------
const RETIRED = [
  'sr-bracketed', 'sr-btn', 'sr-btn--primary', 'sr-btn--quiet', 'sr-make__btn', 'sr-make__btn--primary', 'sr-make__mini', 'sr-make__close',
  'sr-make__select', 'sr-make__choice', 'sr-make__check', 'sr-make__scrub', 'sr-share__btn', 'sr-share__close', 'sr-share__tag', 'sr-share__iconbtn',
  'sr-act', 'sr-act--primary', 'sr-chip', 'sr-chip--quiet', 'sr-density__btn', 'sr-density__choices', 'sr-show__toggle', 'sr-show__box',
  'sr-show__bulkbtn', 'sr-show__vol', 'sr-show__failedwhy', 'sr-show__keysgo', 'sr-tabs__tab', 'sr-photo__btn', 'sr-photo__seg', 'sr-photo__close',
  'sr-photo__range', 'sr-list__btn', 'sr-drift__btn', 'sr-welcome__btn', 'sr-welcome__go', 'sr-welcome__look', 'sr-pick__btn', 'sr-now__btn',
  'sr-vs__labbtn', 'sr-vs__select', 'sr-toast__action', 'sr-moment__btn', 'sr-find__ownerbtn', 'sr-find__select', 'sr-find__box',
  'sr-find__chartclose', 'sr-colourkey__select', 'sr-card__closebtn', 'sr-play__x', 'sr-skystory__close', 'sr-keyhint__close', 'sr-cutaway__close',
  'sr-scenenote__close', 'sr-scenenote__why', 'sr-subpop__x', 'sr-datejump__close', 'sr-findpill__clear', 'sr-otherlight__slider',
  'sr-orrery__range', 'sr-games',
];
const walk = (dir, ext) => readdirSync(join(ROOT, dir), { recursive: true }).filter((n) => n.endsWith(ext)).map((n) => join(dir, n));
const files = [...walk('site/js', '.js').filter((f) => !f.includes('vendor')), ...walk('site/css', '.css'), 'site/index.html'];
for (const f of files) {
  const src = code(readFileSync(join(ROOT, f), 'utf8'));
  for (const name of RETIRED) {
    const m = new RegExp(`(?<![\\w-])${name.replace(/[-]/g, '\\-')}(?![\\w-])`).exec(src);
    if (m) problems.push(`${f}:${lineOf(src, m.index)}: .${name} is a retired look; its control is in css/controls.css now`);
  }
}

// --- 5. the sheet: linked after ui.css, every class of the set defined ---------------------------------------------
{
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  const ui = html.indexOf('href="css/ui.css"');
  const ctl = html.indexOf('href="css/controls.css"');
  check(ui > 0 && ctl > ui, 'index.html links css/controls.css, after css/ui.css');
  const css = readFileSync(join(ROOT, 'site/css/controls.css'), 'utf8');
  for (const cls of ['ui-btn', 'ui-btn--primary', 'ui-btn--secondary', 'ui-btn--ghost', 'ui-btn--quiet', 'ui-btn--icon', 'ui-btn--sm', 'ui-btn--tile',
    'ui-seg', 'ui-seg__btn', 'ui-select', 'ui-radio', 'ui-check', 'ui-opt', 'ui-range', 'ui-close', 'ui-pop', 'ui-pop__head', 'ui-pop__title',
    'ui-pop__body', 'ui-pop__sect', 'ui-pop__eyebrow', 'ui-row', 'ui-chip']) check(new RegExp(`\\.${cls}(?![\\w-])[^{]*\\{`).test(css), `css/controls.css defines .${cls}`);
  check(/\.ui-select\{[^}]*appearance:none/.test(css), '.ui-select resets the browser\'s own look (appearance: none), so a phone draws it too');
  check(/:focus-visible\{outline:2px solid var\(--atm\)/.test(css), 'the set has the 2 px blue focus ring');
  check(/@media \(pointer: coarse\)\{[\s\S]*\.ui-btn,\.ui-select,\.ui-row\{min-height:44px\}/.test(css), 'on touch the controls are 44 px');
  check(!/#[0-9a-f]{3,8}\b/i.test(css.replace(/%23[0-9a-f]{6}/gi, '')), 'no colour literal in the set but the chevron\'s, inside its data URL');
}

if (problems.length) {
  console.error('controls FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`controls ok: ${counts.select} selects, ${counts.radio} radios, ${counts.checkbox} checkboxes, ${counts.range} sliders and ${counts.close} close buttons built in site/js/ui, each on the shared set; none of the ${RETIRED.length} retired looks is left; css/controls.css is linked after ui.css`);
