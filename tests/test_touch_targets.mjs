// tests/test_touch_targets.mjs -- a finger's target is 44 px (docs/ui-guide.md principle 9 and
// section 7; spec 0061 task 6; internal #346).
//
// WHAT THIS IS. The unit-level half of the touch-target rule, with no browser: every class a
// builder in site/js/ui/*.js gives to a button, a link or a tab must resolve, ON THE PHONE PROFILE,
// to a box at least 44 px tall (and 44 wide when it is an icon with no words). "On the phone
// profile" is the cascade a phone gets: rules under `html.sr-phone`, rules inside
// `@media (pointer: coarse)` or a max-width query a 390 px screen satisfies, and plain rules;
// never `html:not(.sr-phone)` or a min-width of 600 px and more. A phone's own rule beats a plain
// one, as it does in the browser (it comes later or is more specific in these stylesheets).
//
// A target may be bigger than its box: `.x::after { inset: -6px }` adds 12 px each way, and that
// counts (the card's close is a 32 px disc in a 44 px target).
//
// THE POINT IS THE NEW BUTTON. A class this test has never seen is not waved through: it resolves
// to 44 or it is named in NOT_A_TARGET with the reason a person can check. That is what failed
// before: "Fly to it" at 30 x 44, the scene note's two buttons at 37, What to show's rows at 36.
//
// WHAT TEXT CANNOT SEE: a 44 px button half under its neighbour, or clipped by a sheet at its
// half height. tests/probes/ui_probe.js measures the hit area in a real page (tools/cdp.mjs,
// `?walk=gate`, --mobile); it is run for an audit, not in CI.
//
//   node tests/test_touch_targets.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIN = 44;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ---- the stylesheets, as rules ------------------------------------------------------------------
const FILES = ['site/css/site.css', 'site/css/ui.css', 'site/css/share.css', 'site/css/keyhint.css', 'site/css/embed.css', 'site/css/autopilot.css'];
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
function rules(file) {
  const css = strip(readFileSync(join(ROOT, file), 'utf8'));
  const out = []; const stack = []; let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') { const head = css.slice(start, i).trim(); stack.push({ head, at: head.startsWith('@'), bodyStart: i + 1 }); start = i + 1; }
    else if (css[i] === '}') { const open = stack.pop(); if (open && !open.at) out.push({ at: stack.filter((s) => s.at).map((s) => s.head).join(' '), selector: open.head, body: css.slice(open.bodyStart, i) }); start = i + 1; }
    else if (css[i] === ';' && !stack.some((s) => !s.at)) start = i + 1;
  }
  return out;
}
const all = FILES.flatMap(rules);
const tokens = new Map();
for (const r of all) if (r.selector === ':root' && r.at === '') for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) if (!tokens.has(m[1])) tokens.set(m[1], m[2].trim());
const px = (value) => {
  if (value == null) return null;
  let v = String(value).trim().replace(/\s*!important$/, '');
  const viaToken = /^var\((--[\w-]+)\)$/.exec(v);
  if (viaToken) v = tokens.get(viaToken[1]) || '';
  const m = /^(-?[\d.]+)px$/.exec(v);
  return m ? parseFloat(m[1]) : null;
};

/** Does this rule reach a 390 px phone with a coarse pointer, and is it the phone's OWN rule? */
function reach(r) {
  if (/html:not\(\.sr-phone\)|:root:not\(\.sr-phone\)/.test(r.selector)) return null;
  if (/@supports not|prefers-reduced|print|hover: hover|pointer: fine/.test(r.at)) return null;
  for (const m of r.at.matchAll(/min-width:\s*(\d+)px/g)) if (Number(m[1]) > 390) return null;
  for (const m of r.at.matchAll(/max-width:\s*(\d+)px/g)) if (Number(m[1]) < 390) return null;
  for (const m of r.at.matchAll(/max-height:\s*(\d+)px/g)) if (Number(m[1]) < 844) return null;
  const own = /\.sr-phone\b/.test(r.selector) || /pointer:\s*coarse|max-width/.test(r.at);
  return own ? 'phone' : 'plain';
}
/** The last compound of each selector in a list that ends on `.cls` (pseudo-classes allowed). */
function subjects(selector) {
  const out = [];
  let depth = 0; let cur = '';
  for (const c of selector) { if (c === '(') depth += 1; if (c === ')') depth -= 1; if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c; }
  if (cur.trim()) out.push(cur.trim());
  return out.map((s) => {
    const last = s.split(/[\s>+~]+/).pop() || '';
    const pseudoEl = (/::(before|after)$/.exec(last) || [])[1] || null;
    const state = /:(hover|active|focus|focus-visible|disabled|checked|empty|first-child|last-child)\b/.test(last.replace(/:(not|where|is)\([^)]*\)/g, ''));
    return { classes: [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]), pseudoEl, state, full: s };
  });
}
const DIMS = { height: 'h', 'min-height': 'h', 'block-size': 'h', width: 'w', 'min-width': 'w', 'inline-size': 'w' };
// class -> { plain: {h, w, grow}, phone: {...} }
const sized = new Map();
const note = (cls, where, key, value) => {
  if (!sized.has(cls)) sized.set(cls, { plain: {}, phone: {} });
  const slot = sized.get(cls)[where];
  // Within one tier the LAST rule wins for a box, the biggest for a hit-area extension.
  if (key === 'grow') slot.grow = Math.max(slot.grow || 0, value); else slot[key] = value;
};
for (const r of all) {
  const where = reach(r);
  if (!where) continue;
  const decl = [...r.body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]);
  for (const s of subjects(r.selector)) {
    if (!s.classes.length || s.state) continue;
    // A compound of two classes (`.sr-btn.is-on`) is about the first only when the second is a state.
    const own = s.classes.filter((c) => !/^(is|has)-/.test(c));
    if (own.length !== 1) continue;
    const cls = own[0];
    if (s.classes.some((c) => /^(is|has)-/.test(c))) continue;
    if (s.pseudoEl) {
      const inset = decl.find(([p]) => p === 'inset');
      const n = inset ? px(inset[1].split(/\s+/)[0]) : null;
      if (n != null && n < 0) note(cls, where, 'grow', -2 * n);
      continue;
    }
    for (const [p, v] of decl) {
      if (!(p in DIMS)) continue;
      const n = px(v);
      if (n != null) note(cls, where, DIMS[p], n);
      else if (p === 'width' && /^(100%|auto|stretch)$/.test(v)) note(cls, where, 'w', Infinity);
    }
    // Not drawn on a phone at all (the sidebar's collapse and its handle): nothing to press.
    const display = decl.find(([p]) => p === 'display');
    if (display) note(cls, where, 'gone', display[1] === 'none');
  }
}
/** What a class comes to on a phone: its own rule first, else the plain one; plus the extension. */
function target(cls) {
  const s = sized.get(cls);
  if (!s) return null;
  const grow = Math.max(s.phone.grow || 0, s.plain.grow || 0);
  const pick = (k) => (s.phone[k] != null ? s.phone[k] : s.plain[k]);
  const h = pick('h'); const w = pick('w');
  return { h: h == null ? null : h + grow, w: w == null ? null : w + grow, grow, gone: !!pick('gone') };
}

// ---- the builders: every class a control is given ----------------------------------------------
const UI = join(ROOT, 'site/js/ui');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^(\s*)\/\/.*$/gm, '$1');
const controls = []; // { file, line, classes, iconOnly }
for (const f of readdirSync(UI).filter((n) => n.endsWith('.js')).sort()) {
  const src = code(readFileSync(join(UI, f), 'utf8'));
  const helpers = [...src.matchAll(/function (\w+)\(([^)]*)\)\s*\{[^}]*?(?:el\('(?:button|a)'|createElement\('(?:button|a)'\))/g)].map((m) => m[1]).filter((n) => n !== 'el');
  const callee = ['el\\(\'(?:button|a)\',', ...helpers.map((h) => `\\b${h}\\(`)].join('|');
  const add = (index, text, iconOnly) => {
    const classes = [...String(text).matchAll(/[\w-]+/g)].map((m) => m[0]).filter((c) => /^sr-|^label$/.test(c));
    if (classes.length) controls.push({ file: f, line: src.slice(0, index).split('\n').length, classes, iconOnly });
  };
  // el('button', 'a b', text) and helper('a b', ...): every quoted string in the class argument,
  // so `primary ? 'sr-act sr-act--primary' : 'sr-act'` gives both.
  for (const m of src.matchAll(new RegExp(`(?:${callee})\\s*((?:[^,()]|\\([^()]*\\))*)`, 'g'))) {
    const arg = m[1];
    for (const q of arg.matchAll(/['`]([^'`]+)['`]/g)) add(m.index, q[1].replace(/\$\{[^}]*\}/g, ' '), false);
  }
  // const b = document.createElement('button'); ... b.className = '...'
  for (const m of src.matchAll(/(?:const|let) (\w+) = document\.createElement\('(?:button|a)'\)/g)) {
    const after = src.slice(m.index, m.index + 600);
    const cn = new RegExp(`\\b${m[1]}\\.className = ['\`]([^'\`]+)['\`]`).exec(after);
    if (cn) add(m.index, cn[1].replace(/\$\{[^}]*\}/g, ' '), false);
  }
}
// A labelled checkbox row, a select and a field are targets too, named here because no button
// builder makes them (the probe measured the first three under 44 on 2026-10-05).
for (const cls of ['sr-show__label', 'sr-share__tag', 'sr-colourkey__select', 'sr-show__filter', 'sr-field']) controls.push({ file: '(named)', line: 0, classes: [cls] });

// Not a 44 px target, each with the reason a person can check in the page.
const NOT_A_TARGET = new Map([
  ['sr-card__inline', 'a text button inside a sentence of the card (SC 2.5.8 inline exception): as tall as its line'],
  ['sr-search__fly', 'clipped to 1 px in the explore search: Enter and the row itself are the control (internal #346)'],
  ['sr-side__handle', 'the collapsed sidebar\'s handle: a desktop state (a phone has the sheet), filling its 64 x 48 box'],
  ['sr-btn--quiet', 'a modifier: the base class carries the box'],
  ['sr-btn--primary', 'a modifier: the base class carries the box'],
  ['sr-act--primary', 'a modifier: the base class carries the box'],
]);

let held = 0;
const seen = new Set();
for (const c of controls) {
  const key = c.classes.join(' ');
  if (seen.has(key)) continue;
  seen.add(key);
  if (c.classes.some((k) => NOT_A_TARGET.has(k) && !/--/.test(k))) continue;
  const boxes = c.classes.map(target).filter(Boolean);
  if (boxes.some((b) => b.gone)) continue;
  const h = Math.max(-1, ...boxes.map((b) => (b.h == null ? -1 : b.h)));
  const where = c.file === '(named)' ? `.${key}` : `site/js/ui/${c.file}:${c.line} .${c.classes.join('.')}`;
  if (h < 0) { problems.push(`${where}: no rule gives this control a height on a phone; a finger's target is ${MIN} px (min-height under html.sr-phone or @media (pointer: coarse)), or name it in NOT_A_TARGET with its reason`); continue; }
  check(h >= MIN, `${where}: ${h} px tall on a phone, under ${MIN}`);
  const w = Math.max(-1, ...boxes.map((b) => (b.w == null ? -1 : b.w)));
  // A width is asked only where one is set: a button with words is as wide as its words and padding.
  if (w >= 0 && Number.isFinite(w)) check(w >= MIN, `${where}: ${w} px wide on a phone, under ${MIN}`);
  held += 1;
}
check(held >= 30, `only ${held} control classes held: this test has lost its way around the builders`);
for (const k of NOT_A_TARGET.keys()) check(controls.some((c) => c.classes.includes(k)), `NOT_A_TARGET names .${k}, which no builder makes any more`);

if (problems.length) { console.error('touch targets FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`touch targets ok: ${held} control classes built in ui/*.js each resolve to ${MIN} px or more on the phone profile (their own box, or a hit area that reaches it); ${NOT_A_TARGET.size} named exceptions`);
