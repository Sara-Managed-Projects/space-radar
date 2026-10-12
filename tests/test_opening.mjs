// tests/test_opening.mjs -- a first visit's opening shot (public #287): scene/framing.js
// openingPlan, main.js runOpening, ui/opening.js.
//
// Asserted, with no browser:
//   THE SHOT is six to ten seconds, from past the Moon and short of the hand-off to the Sun's stage.
//   NEVER for a returning visitor, a deep link, reduced motion, an embed, a hidden tab or automation.
//   ANY INPUT ends it at once: four kinds of event, listened for in the capture phase, land the
//     camera on the home view with a cut; a press on one of its two buttons lands it and keeps them.
//   THE WORDS are the home's own sentence candidates, one at a time; none typed here.
//   TWO BUTTONS, the welcome's own words, one ember; a press on either is the welcome seen.
//   AT BOOT: only the controller in main.js. ui/opening.js is a dynamic import, and the welcome
//     waits for the shot to end.
//
//   node tests/test_opening.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const F = await mod('scene/framing.js');
const H = await mod('scene/handoff.js');
const O = await mod('ui/opening.js');
const Sn = await mod('ui/sentence.js');
const { COPY } = await mod('copy/en.js');

// --- the shot ---------------------------------------------------------------------------------
const plan = F.openingPlan({});
check(plan && plan.ms >= 6000 && plan.ms <= 10000, `the shot lasts six to ten seconds (${plan && plan.ms} ms)`);
const join0 = H.JOINS.find((j) => j.from === 'earth');
check(plan.fromKm > 384400 && plan.fromKm < join0.out_km, `it starts past the Moon (384 400 km) and inside the Earth's stage (${plan.fromKm} of ${join0.out_km} km)`);
check(plan.turn > 0.5 && plan.turn < Math.PI, `the view turns ${plan.turn} rad on the way in: less than the half circle one flight can turn`);
for (const no of [{ seen: true }, { link: true }, { reducedMotion: true }, { embed: true }, { hidden: true }, { automated: true }]) {
  check(F.openingPlan(no) === null, `no opening when ${Object.keys(no)[0]}`);
}

// --- main.js: every way out ---------------------------------------------------------------------
const main = read('site/js/main.js');
check(/const INPUTS = \['pointerdown', 'keydown', 'wheel', 'touchstart'\];/.test(main), 'a press, a key, the wheel and a touch each end it');
check(/window\.addEventListener\(name, onInput, \{ capture: true, passive: true \}\)/.test(main), 'heard in the capture phase, before anything else acts on the input');
check(/const land = \(\) => \{ if \(!shot\) return; shot = false; cameraRig\.flyTo\(\{ \.\.\.home, ms: 0 \}\); \};/.test(main), 'skipped means the home view at once: a cut, not a faster flight');
check(/closest\('\.sr-opening button'\)/.test(main) && /if \(!onButton\) finish\(\);/.test(main), 'a press on one of its buttons keeps the buttons; any other input removes everything');
check(/arm\(plan\.ms \+ 1500\)/.test(main), 'a guard lands it if no frame ever runs (a hidden tab)');
check(/seen: !!store\.getItem\(OPENING_KEY\)/.test(main) && /link: !!\(link && Object\.keys\(link\)\.length\) \|\| location\.hash\.length > 1/.test(main)
  && /reducedMotion: !!\(window\.matchMedia && window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)/.test(main)
  && /automated: navigator\.webdriver === true/.test(main), 'main.js hands openingPlan the visitor\'s memory, the link, reduced motion and automation');
check(/import\('\.\/ui\/opening\.js'\)/.test(main) && !/from '\.\/ui\/opening\.js'/.test(main), 'the words are a dynamic import, made only when the shot plays');
check(/if \(ctx\.opening && ctx\.opening\.live\) window\.addEventListener\('sr:opening-end', show, \{ once: true \}\);/.test(main), 'the welcome waits for the shot to end');
check(/root\.classList\.add\('sr-opening-on'\)/.test(main) && /root\.classList\.remove\('sr-opening-on'\)/.test(main), 'the panels are away for the shot and back at its end');
const css = read('site/css/ui.css');
check(/html\.sr-opening-on body > \*:not\(\.sr-scene\):not\(\.sr-veil\):not\(\.sr-opening\):not\(#boot\)/.test(css), 'ui.css hides the panels by the clean view\'s means, sparing the scene and the words');

// --- the words ----------------------------------------------------------------------------------
const lines = [{ text: 'A' }, { text: 'B' }, { text: 'C' }];
check(O.lineAt(lines, 0).text === 'A' && O.lineAt(lines, 4).text === 'B' && O.lineAt([], 3) === null && O.lineAt(null, 0) === null, 'the lines turn in order and wrap; none is none');
check(O.lineAt([{ text: 'only' }], 7).text === 'only', 'one line does not rotate');
const made = [{ text: 'X', sources: ['s1'] }, { text: 'X', sources: ['s2'] }, { text: 'Y', sources: [] }, null, { text: 'Z' }, { text: 'W' }, { text: 'V' }];
const uniq = O.uniqueLines(made);
check(uniq.map((l) => l.text).join('') === 'XYZW' && uniq[0].source === 's1', `no line twice, four at most (${uniq.map((l) => l.text).join('')})`);
check(Math.floor(plan.ms / O.ROTATE_MS) >= 3, `three sentences fit the shot (${plan.ms} / ${O.ROTATE_MS})`);
// The sentences are the home's: with nothing loaded but the clock, the Moon's is still there.
const ctx = { recordById: () => null, recordsFor: () => [] };
const now = Sn.linesNow(ctx);
check(Array.isArray(now) && now.length >= 1 && now.every((m) => [...m.text].length <= Sn.MAX_CHARS), `with nothing loaded the Moon gives a sentence (${now.map((m) => m.text).join(' | ')})`);
const full = Sn.linesNow({ ...ctx, explore: { crew: () => ({ ISS: 7, Tiangong: 3 }), next: { items: () => [] } } });
check(full.some((m) => /Ten people/.test(m.text)) && full.length === now.length + 1, 'a headcount that has loaded joins the turn');
const src = read('site/js/ui/opening.js');
check(/sentence\.linesNow\(ctx\)/.test(src) && /import\('\.\/sentence\.js'\)/.test(src), 'ui/opening.js asks ui/sentence.js at every turn');
check(/W\.trip/.test(src) && /W\.look/.test(src) && (src.match(/sr-welcome__go/g) || []).length === 1, 'the two buttons are the welcome\'s words, and one is the ember');
check(/win\.localStorage\.setItem\(WELCOME_KEY, '1'\)/.test(src) && /const WELCOME_KEY = 'sr:welcome';/.test(src), 'a press on either is the welcome seen');
check(COPY.opening && [...COPY.opening.skip].length <= 60 && [...COPY.opening.wait].length <= 60, 'its two lines of chrome are short');
check(!/!/.test(COPY.opening.skip + COPY.opening.wait), 'and calm');
const fin = read('site/css/finishers.css');
check(/\.sr-opening \{[^}]*position: fixed;[^}]*z-index: var\(--sr-z-trip\)/.test(fin) && !/\.sr-opening[^{]*\{[^}]*backdrop-filter/.test(fin), 'the words sit on the scene: no glass, no panel');

if (problems.length) { console.error(`opening: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`opening ok: ${plan.ms / 1000} s from ${plan.fromKm} km, turning ${plan.turn} rad; never for a returning visitor, a link, reduced motion, an embed or automation; any of four inputs lands it; ${now.length} sentence(s) with nothing loaded, ${full.length} with a headcount`);
