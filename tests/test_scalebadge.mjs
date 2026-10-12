// tests/test_scalebadge.mjs -- "drawn ×N larger" and True size (public #296, ui/scalebadge.js).
//
// Asserted, with no browser:
//   THE NUMBER IS COMPUTED: a planet's true width on the screen from its radius, the camera's
//     distance and field of view; the factor is the dot's width (scene/orbitrings.js MARKER_PX) over
//     it; a disc wider than its dot is not enlarged and is not counted.
//   WHICH NUMBER: the selected planet's, else the least of them, to two significant figures.
//   TRUE SIZE: the line names the largest planet and its true width in pixels.
//   THE DOTS OBEY: orbitRings.setDotScale(0) puts every dot away and 1 brings them back.
//   LAZY, IN WORDS, IN TOKENS: main.js imports it dynamically; its words are in copy/en.later.js,
//     under 60 characters filled in; its button is 44 px on a phone.
//
//   node tests/test_scalebadge.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const sb = await mod('ui/scalebadge.js');
const { COPY } = await mod('copy/en.js');
const rings = await mod('scene/orbitrings.js');
const { WORLDS } = await mod('scene/worlds.js');

// --- the number -------------------------------------------------------------------------------
const view = { fovDeg: 45, viewportH: 900 };
const focal = 450 / Math.tan((22.5 * Math.PI) / 180);
const jupiter = WORLDS.find((w) => w.id === 'jupiter');
const mercury = WORLDS.find((w) => w.id === 'mercury');
check(jupiter && mercury && jupiter.radiusKm > 69000 && jupiter.radiusKm < 72000, 'the planets come from scene/worlds.js with their radii');
const far = 6e9; // a camera that has the whole system in frame is billions of km out
const jPx = sb.trueDiscPx({ radiusKm: jupiter.radiusKm, distKm: far, ...view });
check(Math.abs(jPx - (2 * jupiter.radiusKm / far) * focal) < 1e-9, 'true width = angular width times the focal length in pixels');
check(jPx < 0.1, `Jupiter from six billion km is under a tenth of a pixel (got ${jPx})`);
check(Number.isNaN(sb.trueDiscPx({ radiusKm: 0, distKm: 1, ...view })) && Number.isNaN(sb.trueDiscPx({})), 'no radius, no answer');
check(sb.trueDiscPx({ radiusKm: 10, distKm: 5, ...view }) === Infinity, 'inside the ball it is as wide as anything');
check(Math.abs(sb.dotFactor(7, 0.07) - 100) < 1e-9, 'a 7 px dot on a 0.07 px disc is drawn 100 times too wide');
check(sb.dotFactor(7, 7) === 1 && sb.dotFactor(7, 300) === 1, 'a disc as wide as its dot, or wider, is not enlarged');
check(Number.isNaN(sb.dotFactor(7, NaN)) && Number.isNaN(sb.dotFactor(0, 1)), 'nothing to compare, no factor');
for (const [n, want] of [[1, 1], [0.4, 1], [12.4, 12], [149, 150], [3210, 3200], [98765, 99000], [NaN, 1]]) {
  check(sb.roundFactor(n) === want, `roundFactor(${n}) is ${want} (got ${sb.roundFactor(n)})`);
}

// --- which number -------------------------------------------------------------------------------
const worlds = [
  { id: 'mercury', name: 'Mercury', radiusKm: mercury.radiusKm, distKm: far },
  { id: 'jupiter', name: 'Jupiter', radiusKm: jupiter.radiusKm, distKm: far },
];
const st = sb.scaleState({ worlds, markerPx: rings.MARKER_PX, ...view });
check(st && st.least.id === 'jupiter' && st.largest.id === 'jupiter' && st.count === 2, 'the least enlarged, and the largest in truth, is Jupiter');
check(Math.abs(st.least.factor - rings.MARKER_PX / jPx) < 1e-6, 'its factor is the dot over the true disc, from orbitrings.js MARKER_PX');
const words = sb.badgeWords(st, false);
check(words.text.includes('×') && words.text.includes(COPY.scale.least.split('{n}')[0].trim().split(' ')[0]), `the badge says a factor (got "${words.text}")`);
check(words.text.includes(String(sb.roundFactor(st.least.factor)).slice(0, 2)), 'and it is the computed one, rounded');
const sel = sb.scaleState({ worlds, markerPx: rings.MARKER_PX, ...view, selectedId: 'mercury' });
check(sel.selected && sel.selected.id === 'mercury' && sel.selected.factor > sel.least.factor, 'a selected planet answers for itself');
check(sb.badgeWords(sel, false).text.startsWith('Mercury'), 'and the badge names it');
// Close to a planet its disc outgrows the dot: it is no longer counted, and with none the badge goes.
const near = sb.scaleState({ worlds: [{ id: 'jupiter', name: 'Jupiter', radiusKm: jupiter.radiusKm, distKm: 5e5 }], markerPx: rings.MARKER_PX, ...view });
check(near === null, 'nothing enlarged, nothing to say');
check(sb.badgeWords(null, false).text === '', 'and no words for it');
check(sb.scaleState({ worlds: [], markerPx: 7, ...view }) === null, 'no planets, no badge');

// --- true size ----------------------------------------------------------------------------------
const lost = sb.badgeWords(st, true);
check(lost.text.includes('Jupiter') && /0\.0\d/.test(lost.text), `True size says what is lost: the largest planet and its width (got "${lost.text}")`);
for (const s of [words.text, lost.text, sb.badgeWords(sel, false).text]) check(s.length <= 60, `a chrome line is at most 60 characters: "${s}" is ${s.length}`);

for (const [px, want] of [[0.0097, '0.01'], [0.0256, '0.03'], [0.31, '0.3'], [0.96, '1'], [2.4, '2'], [0.00042, '0.0004']]) {
  check(sb.pxText(px) === want, `a true width of ${px} px prints as ${want} (got ${sb.pxText(px)})`);
}

// --- the dots obey ------------------------------------------------------------------------------
{
  const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
  const { stage } = await mod('scene/stage.js');
  const scene = new THREE.Scene();
  const r = rings.createOrbitRings(scene, { renderer: { getPixelRatio: () => 1 }, camera: new THREE.PerspectiveCamera() });
  check(typeof r.setDotScale === 'function', 'orbitRings has setDotScale');
  const before = stage.worldId;
  stage.setWorld('sun');
  const dots = scene.getObjectByName('orbit-dots');
  r.update(Date.UTC(2026, 9, 8), ['earth', 'jupiter']);
  check(dots.visible && dots.material.size === rings.MARKER_PX, 'on the Sun stage the dots are MARKER_PX across');
  r.setDotScale(0.5);
  r.update(Date.UTC(2026, 9, 8), ['earth', 'jupiter']);
  check(Math.abs(dots.material.size - rings.MARKER_PX * 0.5) < 1e-9, 'half way they are half as wide');
  r.setDotScale(0);
  r.update(Date.UTC(2026, 9, 8), ['earth', 'jupiter']);
  check(dots.visible === false, 'at true size no dot is drawn');
  check(scene.getObjectByName('orbit-rings').visible === true, 'and the paths stay');
  r.setDotScale(1);
  r.update(Date.UTC(2026, 9, 8), ['earth', 'jupiter']);
  check(dots.visible && dots.material.size === rings.MARKER_PX, 'and back');
  stage.setWorld(before);
}

// --- lazy, in words, in tokens ------------------------------------------------------------------
const main = read('site/js/main.js');
check(/import\('\.\/ui\/scalebadge\.js'\)/.test(main) && !/^import[^\n]*scalebadge/m.test(main), 'main.js imports the badge dynamically, never statically');
check(/MARKER_PX/.test(main.slice(main.indexOf("import('./ui/scalebadge.js')") - 600, main.indexOf("import('./ui/scalebadge.js')") + 600)), 'and hands it orbitrings.js MARKER_PX, not a number of its own');
const src = read('site/js/ui/scalebadge.js');
check(!/['"`][A-Z][a-z]+ [a-z]+ [a-z]+/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'no sentence is typed in the module');
const css = read('site/css/finishers.css');
check(/\.sr-scalebadge\s*\{[^}]*var\(--sr-z-/.test(css), 'the badge takes its z-index from the ladder');
check(!/sr-scalebadge/.test(read('site/css/ui.css')) && /loadCss\('finishers'/.test(src), 'its rules are not a first visit\'s: css/finishers.css comes with the module');
check(/prefers-reduced-motion/.test(src) || /reducedMotion/.test(src), 'True size is a cut under reduced motion');

if (problems.length) {
  console.error('scalebadge FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`scalebadge ok: Jupiter ${jPx.toFixed(3)} px true from 6e9 km, drawn ×${sb.roundFactor(st.least.factor)}; "${words.text}"; "${lost.text}"`);
