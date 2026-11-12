// tests/test_coffee.mjs -- the Buy Me a Coffee link (the maintainer, 2026-11-12): one drawn cup on every Space Radar site,
// a plain link, gentle, and gone wherever it would be in the way.
//
//   1. The piece: templates/partials/coffee.html is a plain <a> to https://buymeacoffee.com/spaceradar, a new tab with
//      rel="noopener", an accessible name that contains its visible words, the drawing hidden from a screen reader, no
//      script, no frame, no picture from another host.
//   2. The look: css/coffee.css draws it in tokens; its loop runs every 6 to 10 s with under 1 s of motion, transform
//      only, and is still under prefers-reduced-motion. 44 px to a finger.
//   3. The map: index.html carries the partial byte for byte (scripts/gen_home_seo.py) as a child of <body>, so the clear
//      screen, HUD only, filming, the opening and the embed hide it with the panels; css/ui.css floats it bottom-right on a
//      desktop and hides it on a phone, in a trip, the screensaver, an imagined world, while the controls hint holds the
//      corner, in Play, the flight editor and the share sheet; moments.css and ground.css hide it with their lists; on a
//      phone ui/rail.js makes it a row of More, the same drawing, in the visitor's language.
//   4. The static pages: every page the footer partial fills carries it in its footer and links css/coffee.css; the Lab's
//      simulators do not (their slim footer).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

// --- 1. the piece --------------------------------------------------------------------------------------------------
const cup = read('templates/partials/coffee.html').trim();
const a = /^<a ([^>]*)>([\s\S]*)<\/a>$/.exec(cup);
check(!!a, 'the partial is one <a> element');
const attrs = a ? a[1] : '';
const attr = (n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(attrs); return m ? m[1] : null; };
check(attr('class') === 'coffee', 'the link is .coffee');
check(attr('href') === 'https://buymeacoffee.com/spaceradar', `it goes to https://buymeacoffee.com/spaceradar (${attr('href')})`);
check(attr('target') === '_blank' && attr('rel') === 'noopener', 'it opens a new tab with rel="noopener"');
const name = attr('aria-label') || '';
check(name === 'Support Space Radar on Buy Me a Coffee' && attr('title') === name, `its name is "Support Space Radar on Buy Me a Coffee", as a tooltip too (${name})`);
const words = /<span class="coffee__t">([^<]*)<\/span>/.exec(cup);
check(!!words && name.includes(words[1]), 'the visible words are inside the accessible name (WCAG 2.5.3)');
check(/<svg class="coffee__art" viewBox="0 0 48 48"[^>]* aria-hidden="true" focusable="false">/.test(cup), 'the drawing is one inline SVG, hidden from a screen reader');
check(!/<script|<iframe|<img|<image|xlink:href|url\(|https?:\/\/(?!buymeacoffee\.com\/spaceradar")/i.test(cup), 'no script, no frame, no picture and no other host: nothing loads before a click');
check(/class="coffee__steam"/.test(cup) && (cup.match(/class="coffee__coin"/g) || []).length === 2 && /class="coffee__mug"/.test(cup), 'a cup with steam and two coins');
check(!/(fill|stroke)="#/.test(cup), 'the colours are the stylesheet\'s tokens, not attributes');

// --- 2. the look ---------------------------------------------------------------------------------------------------
const css = read('site/css/coffee.css');
const root = /:root\{([^}]*)\}/.exec(css);
check(!!root && /--coffee-cup:#/.test(root[1]) && /--coffee-coin:#/.test(root[1]), 'the cup\'s warm colours are named in :root');
const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root\{[^}]*\}/, '');
check(!/#[0-9a-f]{3,8}\b/i.test(body), 'no raw colour outside :root');
for (const sel of ['.coffee__saucer', '.coffee__band']) check(new RegExp(`\\${sel}\\{fill:var\\(--(atm|ember)\\)\\}`).test(css), `${sel} is the kit's palette`);
check(/\.coffee\{[^}]*min-height:44px/.test(css), 'the link is 44 px tall to a finger');
check(/\.coffee:focus-visible\{outline:2px solid var\(--atm\)/.test(css), 'the blue 2 px focus ring');
const loops = [...css.matchAll(/(\.coffee \.coffee__(?:cup|coins))\{animation:([\w-]+) ([\d.]+)s linear infinite\}/g)];
check(loops.length === 2, `two named loops, the cup and the coins (${loops.length})`);
for (const [, sel, kf, secs] of loops) {
  const period = Number(secs);
  check(period >= 6 && period <= 10, `${sel} comes back every ${period} s, between 6 and 10`);
  const block = new RegExp(`@keyframes ${kf}\\{([\\s\\S]*?\\})\\}`).exec(css);
  check(!!block, `@keyframes ${kf} exists`);
  if (!block) continue;
  const stops = [...block[1].matchAll(/([\d.%,]+)\{([^}]*)\}/g)];
  check(stops.every(([, , d]) => /^transform:(rotate|translateY)\([^)]*\)$/.test(d)), `${kf} moves by transform only`);
  // The still part: the stops that hold the rest pose (rotate(0) or translateY(0)); motion is the rest of the cycle.
  const pcts = stops.flatMap(([, p, d]) => p.split(',').map((x) => ({ p: parseFloat(x), rest: /\((0|0deg|0px)\)/.test(d) })));
  const lastRestBeforeMove = Math.max(...pcts.filter((x) => x.rest && x.p < 100).filter((x) => !pcts.some((y) => !y.rest && y.p < x.p)).map((x) => x.p));
  const motion = (100 - lastRestBeforeMove) / 100 * period;
  check(motion > 0 && motion < 1, `${kf} moves for ${motion.toFixed(2)} s of each ${period} s, under 1 s`);
}
check(/@media \(prefers-reduced-motion: reduce\)\{\.coffee \.coffee__cup,\.coffee \.coffee__coins\{animation:none\}\}/.test(css), 'still under prefers-reduced-motion');
check(!/@keyframes [\w-]*(shake|bounce|pulse|glow)/i.test(css), 'no shake, bounce, pulse or glow');
const tokensTest = read('tests/test_tokens.mjs');
check(/MAINTAINER_LOOP = new Set\(\[[^\]]*'\.coffee \.coffee__cup', '\.coffee \.coffee__coins'\]\)/.test(tokensTest), 'the loop is named in tests/test_tokens.mjs MAINTAINER_LOOP');
check(/coffee/i.test(read('docs/DESIGN_PRINCIPLES.md').split('10. **Calm motion')[1] || ''), 'and in docs/DESIGN_PRINCIPLES.md rule 10');
check(/@media \(min-width: 1416px\)\{\n\.foot \.coffee\{position:fixed;right:16px;bottom:16px;/.test(css), 'in a footer it leaves for the corner only from 1416 px, where the 1240 px page leaves an 80 px gutter');

// --- 3. the map ----------------------------------------------------------------------------------------------------
const html = read('site/index.html');
check(html.includes(`<!-- COFFEE:BEGIN scripts/gen_home_seo.py from templates/partials/coffee.html -->\n${cup}\n<!-- COFFEE:END -->`), 'index.html carries the partial byte for byte (python3 scripts/gen_home_seo.py)');
{
  // A child of <body>, not inside another element: the body > * rules of the clear screen and the rest reach it.
  const at = html.indexOf('<a class="coffee"');
  const before = html.slice(html.indexOf('<body>'), at).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|noscript|template|style)\b[\s\S]*?<\/\1>/g, '');
  const opened = (before.match(/<(div|main|section|footer|nav|header|aside|span|ul|li|p|button|form)\b/g) || []).length;
  const closed = (before.match(/<\/(div|main|section|footer|nav|header|aside|span|ul|li|p|button|form)>/g) || []).length;
  check(at > 0 && opened === closed, `the link is a direct child of <body> (${opened} opened, ${closed} closed before it)`);
}
check(html.indexOf('href="css/coffee.css"') > html.indexOf('href="css/controls.css"'), 'index.html links css/coffee.css after css/controls.css');
const ui = read('site/css/ui.css');
check(/\nbody > \.coffee \{\n  position: fixed;\n  right: calc\(var\(--sr-inset\)[^;]*;\n  bottom: calc\(var\(--sr-inset\)[^;]*;\n  z-index: var\(--sr-z-controls\);/.test(ui), 'a desktop: fixed bottom-right, on the controls\' layer (under the pill, the card, the rail and the toast)');
check(/html\.sr-phone body > \.coffee,\nhtml:has\(\.sr-keyhint:not\(\[hidden\]\)\) body > \.coffee,\nhtml:is\(\.sr-play-on, \.sr-flight-on, \.sr-sharing\) body > \.coffee \{ display: none; \}/.test(ui), 'never floating on a phone, under the controls hint, in Play, the flight editor or the share sheet');
check(/@media \(min-width: 900px\) and \(max-width: 1099px\) \{\n  html:not\(\.sr-side-collapsed\) body > \.coffee \{ display: none; \}/.test(ui), 'clear of the time pill: from 900 to 1099 px it waits for the panel to fold');
check(/html\.sr-trip-mode #sr-rail,\nhtml\.sr-trip-mode #sr-time,\nhtml\.sr-trip-mode body > \.coffee,/.test(ui), 'gone in a trip, with the rail and the pill');
check(/html\.sr-ambient :is\([^)]*body > \.coffee\) \{\n  display: none;/.test(ui), 'gone in the screensaver');
check(/html\.sr-imagine-on :is\([^)]*body > \.coffee\) \{\n  display: none;/.test(ui), 'gone on an imagined world\'s stage');
check(/html\.sr-moment-on :is\([^)]*body > \.coffee\) \{\n  display: none;/.test(read('site/css/moments.css')), 'gone in a Moment');
check(/html\.sr-ground-on :is\([^)]*body > \.coffee\) \{\n  display: none;/.test(read('site/css/ground.css')), 'gone on the ground');
check(/html\.sr-clean body > \*:not\(\.sr-scene\):not\(\.sr-veil\):not\(\.sr-over-clean\) \{\n  visibility: hidden !important;/.test(ui) && !/class="coffee[^"]*sr-over-clean/.test(html), 'gone on the clear screen ("hide everything"), as every child of <body> is');
check(/html:is\(\.sr-clean, \.sr-hud, \.sr-filming, \.sr-trip-mode\) \.coffee :is\(\.coffee__cup, \.coffee__coins\) \{ animation-play-state: paused; \}/.test(ui), 'its loop pauses while it is out of sight');
const rail = read('site/js/ui/rail.js');
check(/const cup = document\.querySelector\('body > \.coffee'\);/.test(rail) && /menuRow\('a', cup\.querySelector\('svg'\)\.cloneNode\(true\), COPY\.rail\.coffee/.test(rail) && /row\.href = cup\.href;\n    row\.target = '_blank';\n    row\.rel = 'noopener';/.test(rail), 'a phone: a row of More with the same drawing and the same link');
check(/cup\.setAttribute\('aria-label', COPY\.rail\.coffeeLabel\)/.test(rail), 'the floating link is named in the visitor\'s language');
const en = read('site/js/copy/en.js');
check(/coffee: '[^']+',\n    coffeeLabel: 'Support Space Radar on Buy Me a Coffee',/.test(en), 'copy/en.js has the row\'s words and the link\'s name');
for (const lang of ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh']) {
  const src = read(`site/js/copy/${lang}.js`);
  check(/\nCOPY\.rail\.coffee = "[^"]+";\nCOPY\.rail\.coffeeLabel = "[^"]*Buy Me a Coffee[^"]*";/.test(src), `copy/${lang}.js has both, with the service's name as it is`);
}

// --- 4. the static pages -------------------------------------------------------------------------------------------
const py = (code) => execFileSync('python3', ['-c', `import sys; sys.path.insert(0, 'scripts')\n${code}`], { cwd: ROOT, encoding: 'utf8' });
const foot = py('import seo_chrome; print(seo_chrome.footer("../", "https://www.spaceradar.ai/about/index.html"))');
check(foot.includes(cup) && foot.indexOf(cup) < foot.indexOf('<nav'), 'a static page\'s footer carries the link, under the brand, before the columns');
check(py('import seo_chrome; print(seo_chrome.styles("../"))').includes('<link rel="stylesheet" href="../css/coffee.css">'), 'a static page links css/coffee.css');
check(!py('import seo_chrome; print(seo_chrome.lab_footer("../../"))').includes('class="coffee"'), 'a simulator\'s slim footer has no coffee link');
for (const p of ['site/t/black-holes.html', 'site/lab/index.html']) {
  const page = read(p);
  check(page.includes(cup) && page.includes('css/coffee.css"'), `${p} carries the link and its stylesheet (regenerate it)`);
}

if (problems.length) {
  console.error(`coffee FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('coffee ok: one plain link to buymeacoffee.com/spaceradar with its name, a drawn cup in tokens whose loop moves under 1 s of every 8 and is still under reduced motion; on the map a floating cup on a desktop, gone with the panels, in trips, Moments, on the ground and the rest, and a row of More on a phone; in every static page\'s footer');
