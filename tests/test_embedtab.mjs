// tests/test_embedtab.mjs -- the share sheet's Embed tab, and the events the research features tell the platform
// (ui/sharesheet.js, ui/platform-bridge.js; forge internal #554).
//
//   node tests/test_embedtab.mjs
//
// What it holds:
//   1. THE CODE: the Embed tab writes the app's own frame (ui/embed.js embedSnippet) at three sizes, with the /embed/
//      page's credit line under it unless unticked, and every address is one the embed's reader accepts.
//   2. THE TABS: a tablist of the set's segmented pills, the Embed tab's one ember action, the action row's Embed opening
//      the tab, and its words in eleven languages.
//   3. THE EVENTS: every `sr('track', name, ...)` in the map uses a name of CONTRACT.md's list, with flat params and
//      no id, date or typed text; they go through the platform bridge's queue (ui/platform-bridge.js `sr`).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
globalThis.fetch = async () => ({ ok: false, json: async () => null });

const S = await import(join(JS, 'ui/sharesheet.js'));
const E = await import(join(JS, 'ui/embed.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const B = 'https://www.spaceradar.ai/';

// ---------------------------------------------------------------- 1. the code
check(Object.keys(S.EMBED_SIZES).join() === 'small,medium,large' && S.EMBED_SIZES.medium.width === E.EMBED_SIZE.width && S.EMBED_SIZES.medium.height === E.EMBED_SIZE.height, 'three sizes, the middle one the embed\'s own default');
const st = { at: 'sat-25544' };
const c = S.embedCode(st, { size: 'large', title: 'The ISS, live on Space Radar', creditWords: COPY.embedTab.creditLine, base: B });
check(c.kind === 'object' && c.src === `${B}?embed=1&at=sat-25544`, `an object's frame (${c.src})`);
check(c.html.startsWith(E.embedSnippet(st, { base: B, title: 'The ISS, live on Space Radar', width: 800, height: 500 })), 'the frame is ui/embed.js\'s own, at the size chosen');
check(c.html.endsWith('\n<p>Live view by <a href="https://www.spaceradar.ai/?from=embed">Space Radar</a></p>'), `the credit line is the /embed/ page's (${c.html.split('\n')[1]})`);
const gen = readFileSync(join(ROOT, 'templates/embed/generate.js'), 'utf8');
check(gen.includes('<p>Live view by <a href="${CREDIT_HREF}">Space Radar</a></p>'), 'the /embed/ page writes the same credit line');
check(!S.embedCode(st, { credit: false, base: B }).html.includes('<p>'), 'unticked, the frame alone');
check(S.embedCode({ trip: 'moon-landings' }, { base: B }).kind === 'trip' && S.embedCode({}, { base: B }).kind === 'map', 'a trip and the whole map name their kind');
check(S.embedCredit('Vista en vivo de {link}', B) === '<p>Vista en vivo de <a href="https://www.spaceradar.ai/?from=embed">Space Radar</a></p>', 'the credit\'s words are the language\'s, the link is the same');
check(S.embedCredit('<b>x</b> {link}', B).startsWith('<p>&lt;b&gt;x&lt;/b&gt; <a'), 'the words are escaped');
for (const s of [{ at: 'mars' }, { trip: 'moon-landings', stop: '3' }, { at: 'sat-25544', t: '2027-08-02T10:00:00Z' }, {}]) {
  const src = S.embedCode(s, { base: B }).src;
  const back = E.embedLink(new URL(src).search);
  for (const k of Object.keys(s)) check(back[k] === s[k], `the embed reads back ${k} from ${src}`);
  check(E.isEmbed(new URL(src).search), `${src} is an embed address`);
}
check(S.contentTypeOf({ trip: 'x' }) === 'trip' && S.contentTypeOf({ record: { id: 'mars' } }) === 'object' && S.contentTypeOf({}) === 'view', 'what a share is of, never its id');

// ---------------------------------------------------------------- 2. the tabs and the words
const src = readFileSync(join(JS, 'ui/sharesheet.js'), 'utf8');
check(/tabs\.setAttribute\('role', 'tablist'\)/.test(src) && /setAttribute\('role', 'tab'\)/.test(src) && /setAttribute\('role', 'tabpanel'\)/.test(src) && /'aria-selected'/.test(src), 'a tablist of tabs and panels, selected by aria-selected');
check(/el\('div', 'ui-seg ui-seg--block sr-share__tabs'\)/.test(src) && /el\('button', 'ui-seg__btn', label\)/.test(src), 'the tabs are the set\'s segmented pills');
check((src.match(/ui-btn--primary/g) || []).length === 2 && /copyEmbedBtn = button\('ui-btn ui-btn--primary'/.test(src), 'the Embed tab has one ember action (Copy), the Share tab keeps its own; one panel shows at a time');
check(/embedBtn\.addEventListener\('click', \(\) => setTab\('embed', true\)\)/.test(src), 'the action row\'s Embed opens the tab');
check(/setTab\(opts\.tab === 'embed' \? 'embed' : 'share'\)/.test(src), 'each opening starts on Share unless asked for Embed');
const css = readFileSync(join(ROOT, 'site/css/share.css'), 'utf8');
check(/\.sr-share__body\[hidden\] \{ display: none; \}/.test(css), 'a hidden panel is hidden whatever its display');
await import(join(JS, 'copy/en.embedtab.js'));
const T = COPY.embedTab;
for (const k of ['share', 'embed', 'copy', 'preview', 'size', 'credit']) check(T[k].length <= 60 && !/!/.test(T[k]), `embedTab.${k} is a short line of chrome`);
check(/\{link\}/.test(T.creditLine) && /cookie/.test(T.note), 'the credit carries its link and the note says nothing is stored');
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : flat(v, `${p}${k}.`)));
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const m = await import(join(JS, `copy/${lang}.js`));
  const sec = m.COPY.embedTab;
  const ok = sec && flat(T).every(([k]) => { const v = k.split('.').reduce((o, x) => (o ? o[x] : undefined), sec); return typeof v === 'string' && v; });
  check(ok && /\{link\}/.test(sec.creditLine) && sec.lede !== T.lede, `copy/${lang}.js has the Embed tab in its own words`);
}

// ---------------------------------------------------------------- 3. the events
const CONTRACT = 'page_view search select_object tab_open layer_toggle language_change trip_start trip_complete drift_start drift_stop ambient_start record_start record_export share time_travel sign_up login logout favourite_add favourite_remove passport_stamp badge_earned subscribe video_start video_progress video_complete post_read game_start lab_open model_view paywall_view begin_checkout purchase wallpaper_download consent_update embed_copy calendar_add'.split(' ');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : []));
let n = 0;
for (const f of walk(JS)) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/sr\('track',\s*'([^']+)'(?:,\s*\{([^}]*)\})?/g)) {
    n += 1;
    check(CONTRACT.includes(m[1]), `${f.slice(ROOT.length + 1)}: '${m[1]}' is an event of CONTRACT.md's list`);
    check(!/\b(id|name|born|date|query|text|email|lat|lon)\s*:/.test(m[2] || ''), `${f.slice(ROOT.length + 1)}: '${m[1]}' carries no id, name, date or typed text (${m[2]})`);
  }
}
check(n >= 4, `the research features tell the platform what happened (${n} calls)`);
for (const f of ['ui/sharesheet.js', 'ui/yourstar.js', 'ui/cardmedia.js']) {
  const t = readFileSync(join(JS, f), 'utf8');
  check(/import \{ sr \} from '\.\/platform-bridge\.js'/.test(t) && !/srq\.js/.test(t), `${f} tells the platform through ui/platform-bridge.js`);
}
const SQ = await import(join(JS, 'ui/platform-bridge.js'));
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis; // the bridge queues on window.srq
SQ.sr('track', 'embed_copy', { view: 'object' });
check(Array.isArray(globalThis.srq) && JSON.stringify(globalThis.srq.at(-1)) === '["track","embed_copy",{"view":"object"}]', 'a call is a row of the contract\'s queue');

if (problems.length) {
  console.error(`test_embedtab: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`test_embedtab: the Embed tab writes the app's own frame at three sizes with the embed page's credit, in eleven languages; ${n} events, all of the contract's list, none with an id or a date`);
