// tests/test_a11y_static.mjs -- every control has a name, and every icon is from the one family
// (docs/ui-guide.md sections 3, 3.16 and 7; spec 0061 task 6).
//
// Ivan, 2026-09-30: "put important info to some md so feature agents won't make it shitty again."
// The md is docs/ui-guide.md; this is the part of it a machine can hold without a browser. It reads
// site/js/ui/*.js as text and follows every button and link a builder makes to the end of the
// block that made it:
//
//   1. A control has a NAME: text given to the builder, `textContent`, a child appended that is not
//      an icon, or an `aria-label`. A button with neither is announced as "button".
//   2. An ICON-ONLY control (it appends an icon and nothing else) has an `aria-label` AND a tooltip
//      (`title`): a sighted visitor with a mouse cannot read an eye or three stacked layers either
//      (NN/g: labels beat bare icons for all but a handful of symbols).
//   3. Names are words from copy/en.js: no quoted literal as an aria-label or a title.
//   4. Icons: the 24 box, `stroke-width` 1.75, round caps and joins, `aria-hidden`. The shipped
//      strokes were 1.6, 1.7, 1.75 and 1.8 on the day this was written. The HUD's chevron is a
//      HUD mark, not an icon (section 3.12), and a chart's lines are a chart's.
//   5. A tab list says so, and a row that opens in place says whether it is open.
//   6. No `outline: none` in the stylesheets without a `:focus-visible` rule for the same thing.
//
// WHAT TEXT CANNOT SEE the probe does, in a real page: tests/probes/ui_probe.js measures every
// control drawn (its name, its tooltip, its hit area) through scripts/check-ui.mjs in screens.yml.
//
//   node tests/test_a11y_static.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'site/js/ui');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const files = readdirSync(UI).filter((f) => f.endsWith('.js')).sort();
const read = (f) => readFileSync(join(UI, f), 'utf8');
// Comments out, lines kept, so a control described in a comment is not a control.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/^(\s*)\/\/.*$/gm, '$1');

/** The text from `from` to the end of the block that encloses it. */
function scopeFrom(src, from) {
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth < 0) return src.slice(from, i); }
  }
  return src.slice(from);
}
/** Split a call's arguments at the top level. */
function args(text) {
  const out = [];
  let depth = 0; let cur = ''; let quote = null;
  for (const c of text) {
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if ('([{'.includes(c)) depth += 1;
    if (')]}'.includes(c)) { if (depth === 0) break; depth -= 1; }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const empty = (a) => a == null || a === '' || a === '\'\'' || a === '""' || a === 'null' || a === 'undefined';

// The helpers each module wraps `el('button', ...)` in, and which of their arguments is the text,
// the name and the tooltip. Read from the helper's own body, so a new helper is understood, and a
// helper that stops setting a name stops being trusted.
function helpers(src) {
  const out = new Map();
  for (const m of src.matchAll(/function (\w+)\(([^)]*)\)\s*\{/g)) {
    const body = scopeFrom(src, m.index + m[0].length);
    const made = /(?:const|let) (\w+) = (?:el\('(button|a)'([^)]*)\)|document\.createElement\('(button|a)'\))/.exec(body);
    if (!made || !new RegExp(`return ${made[1]}\\b`).test(body)) continue;
    const params = m[2].split(',').map((p) => p.trim().split('=')[0].trim());
    const v = made[1];
    const inEl = args(made[3] || '').slice(2); // el(tag, className, TEXT): the class is not a name
    const text = params.findIndex((p) => inEl.includes(p) || new RegExp(`${v}\\.textContent = (?:String\\()?${p}\\b`).test(body) || new RegExp(`${v}\\.appendChild\\(el\\('span', [^)]*\\b${p}\\)`).test(body));
    const label = params.findIndex((p) => new RegExp(`${v}\\.setAttribute\\('aria-label', ${p}\\)`).test(body));
    const title = params.findIndex((p) => new RegExp(`${v}\\.title = ${p}\\b`).test(body));
    const icon = /\.appendChild\((?:icon|svgIcon)\(/.test(body);
    out.set(m[1], { text, label, title, icon, at: m.index, end: m.index + m[0].length + body.length });
  }
  return out;
}

let controls = 0;
let iconOnly = 0;
for (const f of files) {
  const src = code(read(f));
  const help = helpers(src);
  const names = [...help.keys()].join('|');
  const re = new RegExp(`(?:const|let) (\\w+) = (?:(el)\\('(?:button|a)'|(document\\.createElement)\\('(?:button|a)'\\)${names ? `|(${names})\\(` : ''})`, 'g');
  for (const m of src.matchAll(re)) {
    const line = src.slice(0, m.index).split('\n').length;
    // The helper's own body is the helper, not a control: its callers are checked.
    if ([...help.values()].some((h) => m.index > h.at && m.index < h.end)) continue;
    const v = m[1];
    const scope = scopeFrom(src, m.index);
    const call = args(src.slice(m.index + m[0].length));
    const viaHelper = m[4] ? help.get(m[4]) : null;
    controls += 1;
    const set = (attr) => new RegExp(`\\b${v}\\.setAttribute\\(\\s*'${attr}'`).test(scope);
    let hasText = false;
    let hasLabel = set('aria-label') || set('aria-labelledby');
    let hasTitle = new RegExp(`\\b${v}\\.title\\s*=`).test(scope) || set('title');
    let hasIcon = new RegExp(`\\b${v}\\.(?:appendChild|append|prepend|insertBefore)\\(\\s*(?:icon|svgIcon)\\(`).test(scope) || new RegExp(`\\b${v}\\.appendChild\\((?:svg|mark|arrow|glyph)\\b`).test(scope);
    // el('button', className, text): the match ends after 'button', so the rest reads `, cls, text)`.
    if (m[2]) hasText = !empty(call[2]);
    if (viaHelper) {
      const a = call;
      if (viaHelper.text >= 0 && !empty(a[viaHelper.text])) hasText = true;
      if (viaHelper.label >= 0 && !empty(a[viaHelper.label])) hasLabel = true;
      if (viaHelper.title >= 0 && !empty(a[viaHelper.title])) hasTitle = true;
      if (viaHelper.icon) hasIcon = true;
    }
    if (new RegExp(`\\b${v}\\.textContent\\s*=`).test(scope)) hasText = true;
    // Kept in a table and worded later, when its list is known (`h.more.textContent = ...`).
    if (new RegExp(`\\.${v}\\.textContent\\s*=`).test(src)) hasText = true;
    // A child that is not an icon: a span of words, a title, a row of parts.
    // `head.append(chev, name, tally)` is three children: each is asked.
    const kids = [...scope.matchAll(new RegExp(`\\b${v}\\.(?:appendChild|append|prepend)\\(\\s*([^;]*)`, 'g'))].flatMap((k) => args(k[1]));
    if (kids.some((k) => !/^(?:icon|svgIcon)\(|^(?:svg|mark|arrow|glyph|dot|chev|cap|swatch)\b/.test(k))) hasText = true;
    // A link made to hand a file to the browser's download and removed in the same breath
    // (printcompose.js saveBlob) is never on screen and never focused: not a control.
    if (new RegExp(`\\b${v}\\.hidden = true`).test(scope) && new RegExp(`\\b${v}\\.click\\(\\)`).test(scope) && new RegExp(`\\b${v}\\.remove\\(\\)`).test(scope)) { controls -= 1; continue; }
    const where = `site/js/ui/${f}:${line}: \`${v}\``;
    if (!hasText && !hasLabel) problems.push(`${where} is a control with no name: give it text or an aria-label from copy/en.js`);
    if (!hasText && hasIcon) {
      iconOnly += 1;
      if (!hasLabel) problems.push(`${where} is an icon-only button without an aria-label`);
      if (!hasTitle) problems.push(`${where} is an icon-only button without a tooltip (title): say what it does, and its key if it has one`);
    }
  }
  // 3. names are words from the copy file
  src.split('\n').forEach((text, i) => {
    const lit = /\.setAttribute\(\s*'(aria-label|title|aria-description)'\s*,\s*(['"`])((?:(?!\2).)*[A-Za-z]{2,}(?:(?!\2).)*)\2\s*\)/.exec(text) || /\.(title|ariaLabel)\s*=\s*(['"])([^'"]*[A-Za-z]{2,}[^'"]*)\2\s*;/.exec(text);
    if (lit) problems.push(`site/js/ui/${f}:${i + 1}: the ${lit[1]} "${lit[3]}" is written in the builder; words live in copy/en.js`);
  });
  // 4. icons
  for (const m of src.matchAll(/setAttribute\(\s*'stroke-width'\s*,\s*([^)]+)\)|'stroke-width'\s*[:,\]]\s*'?([\d.]+)'?/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    const value = (m[1] || m[2] || '').trim();
    if (f === 'hud.js' || f === 'trajectory.js' || f === 'skyarc.js') continue; // a HUD mark and two charts, not icons
    check(/^'?1\.75'?$/.test(value), `site/js/ui/${f}:${line}: an icon's stroke-width is ${value}; every icon is 1.75 (docs/ui-guide.md section 3.16)`);
  }
  for (const m of src.matchAll(/createElementNS\(SVG_NS, 'svg'\)/g)) {
    const scope = scopeFrom(src, m.index);
    const line = src.slice(0, m.index).split('\n').length;
    if (f === 'trajectory.js' || f === 'cardextras.js') continue; // charts with role=img and a name of their own (the second: the distance curve)
    check(/aria-hidden/.test(scope), `site/js/ui/${f}:${line}: an svg without aria-hidden: the button carries the name, the drawing is not read out`);
    if (f !== 'hud.js') check(/0 0 24 24/.test(scope), `site/js/ui/${f}:${line}: an icon outside the 24 box`);
  }
}
check(controls >= 60, `only ${controls} controls found in ui/*.js: this test has lost its way around the builders`);
check(iconOnly >= 8, `only ${iconOnly} icon-only buttons found: the rail, the trip toolbar and the close buttons should be among them`);

// 5. roles and states
{
  const explore = code(read('explore.js'));
  check(/setAttribute\('role', 'tablist'\)/.test(explore) && /setAttribute\('role', 'tab'\)/.test(explore) && /aria-selected/.test(explore), 'the tabs are a tablist of tabs with aria-selected');
  for (const f of ['cards.js', 'subscribe.js', 'whattoshow.js', 'rail.js', 'shell.js']) check(/aria-expanded/.test(code(read(f))), `site/js/ui/${f} opens something in place and never says aria-expanded`);
  check(/aria-pressed/.test(code(read('tripframe.js'))), 'the trip toolbar\'s toggles say aria-pressed');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(/Lucide/.test(credits) && /ISC/.test(credits) && /Feather/.test(credits) && /MIT/.test(credits), 'CREDITS.md names Lucide (ISC) and Feather (MIT)');
  // Internal #331: the credit listed eight icons while cards.js shipped twenty. Every name in an
  // ICONS table is in CREDITS.md's Lucide paragraph, under Lucide's own name for it.
  const para = (/\*\*Lucide\*\*[\s\S]*?refuses an `ICONS` name/.exec(credits) || [''])[0];
  const LUCIDE_NAME = { chevron: 'chevron-right', file: 'file-text' };
  for (const f of ['icons.js', 'sharesheet.js']) {
    const table = /\nconst ICONS = \{([\s\S]*?)\n\};/.exec(code(read(f)));
    check(!!table, `site/js/ui/${f} has an ICONS table`);
    for (const m of (table ? table[1] : '').matchAll(/^  '?([a-z0-9-]+)'?:/gm)) {
      const name = LUCIDE_NAME[m[1]] || m[1];
      check(para.includes('`' + name + '`'), `site/js/ui/${f} ships the icon ${name} and CREDITS.md's Lucide paragraph does not list it`);
    }
  }
}

// 6. a focus ring is never removed without its replacement
{
  const CSS = ['site/css/site.css', 'site/css/ui.css', 'site/css/share.css', 'site/css/keyhint.css', 'site/css/embed.css', 'site/css/autopilot.css'];
  const all = CSS.map((f) => readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  check(/:focus-visible/.test(all), 'the stylesheets have :focus-visible rules');
  for (const m of all.matchAll(/([^{}]+)\{([^{}]*outline:\s*(?:none|0)\b[^{}]*)\}/g)) {
    // Split at the top level only: the commas inside :where(button, a) are one selector's.
    const sels = [];
    { let depth = 0; let cur = ''; for (const c of m[1].trim()) { if (c === '(') depth += 1; if (c === ')') depth -= 1; if (c === ',' && depth === 0) { sels.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) sels.push(cur.trim()); }
    for (const sel of sels) {
      const base = sel.replace(/:focus(-visible|-within)?/g, '').replace(/::?[\w-]+$/, '').trim();
      // The replacement: brackets or a border on :focus-visible / :focus-within of the same thing or
      // of the field's row, or the global bracket rule (`:where(button, ...):focus-visible::before`).
      const last = base.split(/\s+/).pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // A HEADING that takes focus from script (tabindex -1, so a screen reader starts reading at the
      // view's name) is not a stop on the Tab ring: `:focus` on a __name or __title, and nothing else.
      if (/__(name|title):focus$/.test(sel)) continue;
      // The same rule may draw the replacement itself: a field whose border turns ember on focus.
      if (/:focus/.test(sel) && /(?:^|;)\s*(?:border(?:-color)?|box-shadow)\s*:/.test(m[2])) continue;
      // ...in ANOTHER rule: the one that removes the ring does not count as its own replacement.
      const has = new RegExp(`${last}[^,{]*:focus(-visible|-within)?\\b`).test(all.replace(m[0], '')) || /(input|textarea|select)/.test(base) || /^(button|a|\[role)/.test(base) || /:where\([^)]*\)/.test(sel);
      check(has, `"${sel}" removes the outline and nothing draws a focus state for it`);
    }
  }
}

// 7. the page (public #315): skip links, landmarks, the canvas's name, and focus across a view change
{
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const body = html.slice(html.indexOf('<body'));
  // 7a. THE SKIP LINKS ARE FIRST IN THE TAB ORDER, the search before the map, and the search is two
  // presses away: Tab lands on "Skip to search", Enter puts the caret in the field.
  const firstStop = /<(a|button|input|select|textarea|summary|iframe|[a-z]+[^>]*\stabindex="(?!-1))[^>]*>/i.exec(body);
  check(firstStop && /id="sr-skip-search"/.test(firstStop[0]), `the first thing Tab reaches in index.html is the skip link to the search (it is ${firstStop ? firstStop[0].slice(0, 80) : 'nothing'})`);
  const skips = [...body.matchAll(/<a class="sr-skip" id="(sr-skip-[a-z]+)" href="#([\w-]+)">([^<]+)<\/a>/g)].map((m) => ({ id: m[1], to: m[2], text: m[3] }));
  check(skips.map((x) => x.id).join() === 'sr-skip-search,sr-skip-map', `two skip links, the search first: ${skips.map((x) => x.id)}`);
  check(skips.every((x) => /^Skip to /.test(x.text)), `each says where it goes: ${skips.map((x) => x.text).join(' / ')}`);
  check(!/tabindex="[1-9]/.test(body), 'no positive tabindex anywhere in index.html: the order is the document\'s');
  check(/<main class="sr-scene" id="map">/.test(body) && skips.some((x) => x.id === 'sr-skip-map' && x.to === 'map'), 'the map link points at <main id="map">');
  const explore = code(read('explore.js'));
  const toSearch = /const toSearch = \(e\) => \{([\s\S]*?)\n  \};/.exec(explore);
  check(toSearch && /e\.preventDefault\(\)/.test(toSearch[1]) && /search\.focus\(\)/.test(toSearch[1]) && /shell\.collapse\(false\)/.test(toSearch[1]), 'toSearch opens the panel, comes home and focuses the field');
  check(/skip\('sr-skip-search', toSearch\)/.test(explore) && /getElementById\(id\)[\s\S]{0,60}addEventListener\('click', go\)/.test(explore), 'Enter on "Skip to search" runs toSearch: Tab, Enter, and the caret is in the field');
  check(/wantsSearch\(e, document\.activeElement\)\) toSearch\(e\)/.test(explore), 'and `/` runs the same function');
  const mapSkip = /skip\('sr-skip-map', \(e\) => \{([\s\S]*?)\n  \}\);/.exec(explore);
  check(mapSkip && /map\.tabIndex = -1/.test(mapSkip[1]) && /map\.focus\(/.test(mapSkip[1]) && /removeAttribute\('tabindex'\)/.test(mapSkip[1]), '"Skip to the map" focuses <main> and gives the tabindex back on blur (a <main> that kept it would take focus on every click)');
  check(!/<main[^>]*tabindex/.test(body) && !/<canvas[^>]*tabindex/.test(body), 'neither <main> nor the canvas carries a tabindex in the markup');
  const site = readFileSync(join(ROOT, 'site/css/site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hiddenRule = (/\.sr-skip:not\(:focus\)\s*\{([^}]*)\}/.exec(site) || [])[1] || '';
  const shownRule = (/\.sr-skip\s*\{([^}]*)\}/.exec(site) || [])[1] || '';
  check(/clip-path:\s*inset\(50%\)/.test(hiddenRule) && !/display:\s*none|visibility:\s*hidden/.test(hiddenRule), 'a skip link without the focus is clipped, not removed: display:none would take it out of the tab order');
  check(/position:\s*fixed/.test(shownRule) && /z-index:\s*var\(--sr-z-toast\)/.test(shownRule) && /background:\s*var\(--sr-glass-strong\)/.test(shownRule) && /color:\s*var\(--sr-text\)/.test(shownRule), 'with the focus it is a glass chip over the chrome, in the text colour');

  // 7b. LANDMARKS: one <main> (the map), the sidebar and the card as <aside> with a name, the rail as
  // <nav> with a name, the phone's top bar a named group. A landmark without a name is "navigation".
  check((body.match(/<main\b/g) || []).length === 1, 'index.html has exactly one <main>');
  check(/<h1 class="sr-hidden-text">/.test(body), 'and one h1, inside it');
  const shell = code(read('shell.js'));
  check(/const side = el\('aside', [^)]*\);[\s\S]{0,120}side\.setAttribute\('aria-label', COPY\.shell\.sideLabel\)/.test(shell), 'the sidebar is an <aside> named from the copy');
  const rail = code(read('rail.js'));
  check(/const root = document\.createElement\('nav'\);[\s\S]{0,200}root\.setAttribute\('aria-label', COPY\.rail\.label\)/.test(rail), 'the rail is a <nav> named from the copy');
  check(/top\.setAttribute\('role', 'group'\);\s*top\.setAttribute\('aria-label', COPY\.shell\.topLabel\)/.test(shell), 'the phone\'s top bar is a named group');
  check(/host = el\('aside', 'sr-card'\)/.test(code(read('cards.js'))), 'the card is an <aside>');
  for (const f of files) check(!/createElement\('main'\)|el\('main'/.test(code(read(f))), `ui/${f} builds a second <main>`);

  // 7c. THE CANVAS HAS A TEXT ALTERNATIVE, one sentence, and it changes on selection only.
  const canvas = /<canvas id="stage" role="img"\s+aria-label="([^"]+)">/.exec(body);
  check(canvas && canvas[1].length > 60, 'the canvas is role="img" with a sentence for a name');
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/window\.addEventListener\('sr:select', \(e\) => \{\s*const record = e && e\.detail;\s*if \(stageEl\) stageEl\.setAttribute\('aria-label', record && record\.name \? fill\(COPY\.app\.sceneSelected, \{ name: record\.name \}\) : sceneName\);/.test(main), 'main.js renames the canvas on sr:select, and gives the page\'s own sentence back when the selection is put down');
  check(!/requestAnimationFrame[\s\S]{0,400}stageEl\.setAttribute\('aria-label'/.test(main) && (main.match(/stageEl\.setAttribute\('aria-label'/g) || []).length === 1, 'and nowhere else: a name that changed per frame would be unusable');
  const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
  const sentence = COPY.app.sceneSelected || '';
  check(/\{name\}/.test(sentence) && (sentence.match(/[.!?](\s|$)/g) || []).length === 1, `the selected sentence names the thing and is one sentence: "${sentence}"`);

  // 7d. FOCUS IS NEVER LOST WHEN A VIEW CHANGES: show() and back() ask, before they repaint, whether
  // the focus was in the sidebar, and land it in the view now showing if so.
  const fn = (name) => (new RegExp(`\\n  function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}`).exec(shell) || [])[1] || '';
  for (const name of ['show', 'back']) {
    const b = fn(name);
    check(/const held = heldFocus\(\);/.test(b) && b.indexOf('heldFocus()') < b.indexOf('paint()'), `shell.${name}() asks where the focus is BEFORE it repaints`);
    const paints = (b.match(/paint\(\);/g) || []).length;
    const lands = (b.match(/if \(held\) landFocus\(\);/g) || []).length;
    check(lands >= 1 && lands >= paints - (name === 'show' ? 1 : 0), `shell.${name}() lands the focus after every repaint that changed the view (${paints} repaints, ${lands} landings)`);
  }
  check(/const heldFocus = \(\) => side\.contains\(document\.activeElement\);/.test(shell), 'held means "inside the sidebar": a focus on the map is never taken');
  const land = fn('landFocus');
  check(/a\.isConnected && !a\.closest\('\[hidden\]'\)\) return;/.test(land) && /\[role="tab"\]\[aria-selected="true"\]/.test(land) && /target\.focus\(\{ preventScroll: true \}\)/.test(land), 'landFocus leaves a focus that survived alone, and otherwise lands on the chosen tab or the view\'s first control');

  // 7e. A one-letter name is not a name (internal #375): the X link says "Post to X".
  const sheet = code(read('sharesheet.js'));
  check(/a\.setAttribute\('aria-label', t\(S\.networkLabel, \{ network: S\.networks\[n\] \}\)\)/.test(sheet) && /\{network\}/.test(COPY.share.networkLabel || ''), 'each network link has a spoken name from the copy ("Post to X"), not its one letter');
}

if (problems.length) { console.error('a11y static FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`a11y static ok: ${controls} controls built in ${files.length} ui modules each have a name, ${iconOnly} icon-only ones an aria-label and a tooltip, every icon is the 24 box at stroke 1.75 and hidden from a reader, no name is written outside copy/en.js`);
