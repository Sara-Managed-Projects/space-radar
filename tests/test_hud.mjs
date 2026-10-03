// tests/test_hud.mjs -- the tracked object's HUD (spec 0047): the reticle's size rule, the tag's
// flip at the four corners, the tick's 2 px/s floor, the off-screen chevron for points left, right,
// above, below and behind, the live region's first-digit rule, and the wiring that makes it one
// projection a frame and never a second author of words.
//
//   node tests/test_hud.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const hud = await import(join(JS, 'ui/hud.js'));
const { reticleBox, tagPlacement, showTick, chevronAt, chevronAnchor, firstDigitChanged, projectedDiameterPx, distanceWords, createHud } = hud;
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { tagLines, rightNowFor, honestyLine } = await import(join(JS, 'ui/cards.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// --- 1. the box: max(40 px, drawn diameter + 12 px); 40 is docs/ui-guide.md 3.12 (issue #318) ------
check(reticleBox(0) === 40, `a point is boxed at 40 px (${reticleBox(0)})`);
check(reticleBox(8 * 1.35) === 40, 'a selected 8 px dot (10.8 px) is boxed at 40 px');
check(reticleBox(28) === 40 && reticleBox(29) === 41, 'the diameter rule takes over above 28 px');
check(reticleBox(260) === 272, `a model drawn 260 px wide is boxed at 272 px (${reticleBox(260)})`);
check(reticleBox(NaN) === 40 && reticleBox(-5) === 40, 'no size, the minimum');
check(hud.RETICLE_MIN_PX === 40 && hud.RETICLE_PAD_PX === 12, 'the constants are the guide\'s minimum and the spec\'s pad');

// --- 2. the tag flips to stay on screen ------------------------------------------------------------
const VW = 1000;
const VH = 800;
const TAG = { w: 180, h: 56 };
const inside = (p) => p.x >= 8 && p.y >= 8 && p.x + TAG.w <= VW - 8 && p.y + TAG.h <= VH - 8;
const mid = tagPlacement({ x: 500, y: 400 }, 28, TAG, VW, VH);
check(mid.side === 'right' && mid.vert === 'up', `in the middle the tag goes up and right (${mid.side}/${mid.vert})`);
check(near(mid.x, 500 + 14 + 24) && near(mid.y, 400 - 14 - 24 - 56), `24 px out and up from the box corner (${mid.x}, ${mid.y})`);
const corners = [
  ['top left', { x: 30, y: 30 }, 'right', 'down'],
  ['top right', { x: 970, y: 30 }, 'left', 'down'],
  ['bottom right', { x: 970, y: 770 }, 'left', 'up'],
  ['bottom left', { x: 30, y: 770 }, 'right', 'up'],
];
for (const [name, px, side, vert] of corners) {
  const p = tagPlacement(px, 28, TAG, VW, VH);
  check(p.side === side && p.vert === vert, `at the ${name} corner the tag goes ${vert}/${side} (${p.vert}/${p.side})`);
  check(inside(p), `at the ${name} corner the tag stays on screen (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
}
const huge = tagPlacement({ x: 500, y: 400 }, 900, TAG, VW, VH);
check(inside(huge), `a box bigger than the view still leaves the tag on screen (${huge.x}, ${huge.y})`);
check(inside(tagPlacement({ x: 500, y: 400 }, 28, { w: 2000, h: 30 }, VW, VH)) || true, 'a tag wider than the view does not throw');

// The panels: a left rail to 368 px and the card's rail from 1012 px on a 1440 x 900 view, as the
// desktop draws them. A 350 px box on the ISS at the centre has room on neither side: the tag goes
// above it, centred, and out from under both rails (measured 2026-09-29, it went under the card).
const rails = hud.openArea([{ left: 16, top: 16, right: 368, bottom: 573 }, { left: 16, top: 578, right: 368, bottom: 884 }, { left: 1012, top: 16, right: 1424, bottom: 884 }], 1440, 900);
check(rails.left === 368 && rails.right === 1012 && rails.top === 0 && rails.bottom === 900, `the open area is between the rails (${JSON.stringify(rails)})`);
const between = tagPlacement({ x: 720, y: 450 }, 350, { w: 240, h: 60 }, 1440, 900, 24, 8, rails);
check(between.side === 'centre' && between.vert === 'up', `no room either side: above the box (${between.side}/${between.vert})`);
check(between.x >= 376 && between.x + 240 <= 1004 && between.y + 60 <= 450 - 175, `and inside the open area, clear of the box (${between.x}, ${between.y})`);
const railSmall = tagPlacement({ x: 900, y: 450 }, 28, { w: 240, h: 60 }, 1440, 900, 24, 8, rails);
check(railSmall.side === 'left' && railSmall.x + 240 <= 1004, `a dot near the card's rail flips its tag left, off the card (${railSmall.side} ${railSmall.x})`);
// Spec 0061's shell at 1440 x 900 with the Moon selected (issue #319): the sidebar, the tool rail
// and the time pill, which is centred on the scene area and so sits wholly in the right half. It is
// a bar at the bottom, not a rail: the area stays open between the sidebar and the tool rail, and
// the Moon's 633 px box sends its tag to the left, clear of the rail it used to run under.
const shell = hud.openArea([{ left: 20, top: 20, right: 380, bottom: 880 }, { left: 1370, top: 20, right: 1420, bottom: 214 }, { left: 726, top: 828, right: 1094, bottom: 876 }], 1440, 900);
check(shell.left === 380 && shell.right === 1370 && shell.bottom === 828 && shell.top === 0, `the pill is a bottom bar, the tool rail a right rail (${JSON.stringify(shell)})`);
const moon = tagPlacement({ x: 910, y: 450 }, 633, { w: 179, h: 64 }, 1440, 900, 24, 8, shell);
check(moon.x >= 388 && moon.x + 179 <= 1362, `the Moon's tag is clear of the sidebar and the tool rail (${moon.side} ${moon.x})`);
const phone = hud.openArea([{ left: 0, top: 500, right: 390, bottom: 844 }], 390, 844);
check(phone.bottom === 500 && phone.left === 0 && phone.right === 390, `a phone's sheet is a bottom edge (${JSON.stringify(phone)})`);
check(hud.openArea([{ left: 0, top: 0, right: 300, bottom: 844 }], 390, 844).right === 390, 'panels leaving less than a third of the view are ignored');
const rightOfRails = chevronAt({ x: 4, y: 0, z: 0.5 }, 1440, 900, 16, false, rails);
check(rightOfRails.edge === 'right' && near(rightOfRails.x, 1012 - 16), `the chevron sits 16 px inside the card's rail, not under it (${rightOfRails.x})`);

// --- 3. the tick's floor ---------------------------------------------------------------------------
check(!showTick(1.99) && showTick(2) && showTick(300), 'the tick shows from 2 px of motion per clock second');
check(!showTick(NaN) && !showTick(0), 'no motion, no tick');

// --- 4. the chevron: 16 px inside the nearest edge, towards the object ------------------------------
const onEdge = (c) => near(c.x, 16) || near(c.x, VW - 16) || near(c.y, 16) || near(c.y, VH - 16);
const left = chevronAt({ x: -3, y: 0, z: 0.5 }, VW, VH);
check(left.edge === 'left' && near(left.x, 16) && near(left.y, 400), `a point to the left: the left edge, level (${JSON.stringify(left)})`);
const right = chevronAt({ x: 4, y: 0, z: 0.5 }, VW, VH);
check(right.edge === 'right' && near(right.x, VW - 16) && near(right.angle, 0), `a point to the right: the right edge, pointing right (${JSON.stringify(right)})`);
const above = chevronAt({ x: 0, y: 2, z: 0.5 }, VW, VH);
check(above.edge === 'top' && near(above.y, 16) && near(above.x, 500) && near(above.angle, -Math.PI / 2), `a point above: the top edge, pointing up (${JSON.stringify(above)})`);
const below = chevronAt({ x: 0, y: -2, z: 0.5 }, VW, VH);
check(below.edge === 'bottom' && near(below.y, VH - 16), `a point below: the bottom edge (${JSON.stringify(below)})`);
// Behind the eye, project() divides by a negative w and mirrors the point: an object behind and to
// the LEFT comes out at positive x. The chevron points the way to turn, which is left.
const behindLeft = chevronAt({ x: 0.6, y: 0.1, z: 1.4 }, VW, VH);
check(behindLeft.edge === 'left', `a point behind and to the left: the left edge (${JSON.stringify(behindLeft)})`);
const behindAbove = chevronAt({ x: 0, y: -0.5, z: 1.2 }, VW, VH, 16, true);
check(behindAbove.edge === 'top', `a point behind and above: the top edge (${JSON.stringify(behindAbove)})`);
const straightBehind = chevronAt({ x: 0, y: 0, z: 1.5 }, VW, VH);
check(straightBehind.edge === 'bottom' && onEdge(straightBehind), 'straight behind: pointing down, on the edge');
// In pixels, not NDC: on a 2:1 screen NDC (1.5, 1.5) is up and right at 26.6 degrees, not 45.
const wide = chevronAt({ x: 1.5, y: 1.5, z: 0.5 }, 1600, 800);
check(near(wide.angle, Math.atan2(-600, 1200), 1e-9) && (near(wide.x, 1584) || near(wide.y, 16)), `the direction is taken in pixels (${JSON.stringify(wide)})`);
for (const c of [left, right, above, below, behindLeft, behindAbove, straightBehind]) check(onEdge(c), `every chevron is on the inset edge (${JSON.stringify(c)})`);
const chip = chevronAnchor(right, { w: 120, h: 28 }, VW, VH);
check(chip.x + 120 <= VW - 8 && chip.x >= 8, `the chip at the right edge hangs inward, not off the screen (${chip.x})`);
const chipTop = chevronAnchor(above, { w: 120, h: 28 }, VW, VH);
check(chipTop.y >= 8 && near(chipTop.x, 500 - 60), `the chip at the top is centred on its point and inside (${JSON.stringify(chipTop)})`);

// --- 5. the live region speaks on the first digit, not every update --------------------------------
const NN = ' ';
check(firstDigitChanged(null, '408'), 'the first reading is spoken');
check(!firstDigitChanged('408', '409') && !firstDigitChanged('408', '499'), '408 -> 409 or 499 km is not news');
check(firstDigitChanged('408', '512'), '408 -> 512 km is');
check(firstDigitChanged(`1${NN}240`, '980'), '1 240 -> 980 km changes the order of magnitude');
check(!firstDigitChanged(`27${NN}580`, `27${NN}999`), '27 580 -> 27 999 km/h is not news');
check(firstDigitChanged('9.8', '10.1'), '9.8 -> 10.1 is');

// --- 6. sizes and distances --------------------------------------------------------------------------
check(near(projectedDiameterPx(1, 10, 2, 800), 160), 'a unit sphere 10 units away at f = 2 in 800 px is 160 px across');
check(projectedDiameterPx(0, 10, 2, 800) === 0 && projectedDiameterPx(1, 0, 2, 800) === 0, 'no size or no distance, zero');
check(/km$/.test(distanceWords(1240)) && distanceWords(1240).startsWith('1'), `1 240 km in km (${distanceWords(1240)})`);
check(/astronomical units$/.test(distanceWords(2.2e8)), `220 million km in au (${distanceWords(2.2e8)})`);
check(/light-years$/.test(distanceWords(4.0e13)), `4e13 km in light-years (${distanceWords(4.0e13)})`);

// --- 7. the tag's words are the card's, for a real ISS element set ---------------------------------
const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const t0 = Number.isFinite(iss.epoch) ? iss.epoch + 3 * 3600e3 : Date.parse('2026-09-07T03:00:00Z');
const london = { name: 'London', latDeg: 51.5, lonDeg: -0.13, latRad: 51.5 * Math.PI / 180, lonRad: -0.13 * Math.PI / 180, altKm: 0 };
const ctx = { clock: { now: () => t0 }, observer: london };
const lines = tagLines(iss, ctx);
const rows = rightNowFor(iss, ctx);
const rowValue = (label) => (rows.find((r) => r[0] === label) || [])[1];
check(lines.readouts.length === 3, `the ISS tag has three readouts with a place set (${lines.readouts.length})`);
check(lines.readouts.map((r) => r.key).join() === 'altitude,speed,range', `height, speed, distance, in the card's order (${lines.readouts.map((r) => r.key)})`);
for (const r of lines.readouts) {
  const onCard = rows.some(([, v]) => v === `${r.num} ${r.unit}`);
  check(onCard, `the tag's "${r.num} ${r.unit}" is a value the card prints (${rows.map((x) => x[1]).join(' | ')})`);
}
check(rowValue('Distance from you') !== undefined, 'the card has the distance from you, so the tag is not the only thing that says it');
check(lines.readouts[2].suffix === 'from you', `a place set by the visitor reads "from you" (${lines.readouts[2].suffix})`);
const guessCtx = { clock: { now: () => t0 }, observer: { ...london, source: 'guess' } };
const guessed = tagLines(iss, guessCtx);
check(guessed.readouts[2] && guessed.readouts[2].suffix === 'from London', `a guessed place is named (${guessed.readouts[2] && guessed.readouts[2].suffix})`);
check(rightNowFor(iss, guessCtx).some(([label]) => /London/.test(label) && /guess/.test(label)), 'and the card says the place is a guess');
const noPlace = tagLines(iss, { clock: { now: () => t0 }, observer: null });
check(noPlace.readouts.length === 2 && !noPlace.readouts.some((r) => r.key === 'range'), 'no place, no distance: never a distance from nowhere');
check(honestyLine(iss, { cls: iss.cls, tMs: t0 }).startsWith(lines.honesty), `the tag's honesty line is the start of the card's (${lines.honesty})`);
check(/3 hours old/.test(lines.honesty), `and it carries the element age (${lines.honesty})`);
const km = Number(lines.readouts[0].num.replace(/\D/g, ''));
check(km > 380 && km < 460, `the ISS is 380-460 km up on the tag (${km})`);

// --- 8. the wiring: one owner, one projection, no second author ---------------------------------------
const src = readFileSync(join(JS, 'ui/hud.js'), 'utf8');
const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
check(!/innerHTML/.test(code), 'hud.js never writes markup');
check(/tagLines\(/.test(code) && !/COPY\.card\.rows/.test(code), 'the tag reads cards.js tagLines(), not the card\'s rows on its own');
check((code.match(/\.project\(/g) || []).length === 0 && (code.match(/applyMatrix4\(cam\.projectionMatrix\)/g) || []).length <= 3, 'the projection is by hand, in two halves, so the sign of w is known');
check(/aria-live', 'polite'/.test(code) && /'role', 'status'/.test(code), 'a polite status twin');
check(/setAttribute\('aria-hidden', 'true'\)/.test(code), 'the visible tag is hidden from a screen reader, which hears the twin');
for (const cls of ['sr-reticle', 'sr-tick', 'sr-tag', 'sr-chevron']) check(new RegExp(`'${cls} sr-hud-keep`).test(code), `${cls} carries sr-hud-keep (spec 0046 req 7)`);
check(!/getContext|WebGL|new THREE\.(Mesh|Line|Sprite|Points)/.test(code), 'no canvas and no WebGL object: no draw call');
check(/style\.transform = /.test(code) && !/style\.(left|top) =/.test(code), 'placed by transform, never by left/top');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
const renderAt = main.indexOf('    render();\n');
const frameAt = main.indexOf('ctx.hud.frame(t)');
check(frameAt > renderAt && renderAt > 0, 'hud.frame() runs after render(), on this frame\'s camera matrices');
check(/setSelected\(record \? record\.id : null\);\n\s+if \(ctx\.hud\) ctx\.hud\.select\(record\);/.test(main), 'hud.select() beside setSelected()');
check(/ctx\.positionOfRecord = /.test(main), 'positionOfRecord is on ctx, the function follow() uses');
const labels = readFileSync(join(JS, 'ui/labels.js'), 'utf8');
check(/namesSelection\(\)/.test(labels), 'the labels leave the selection\'s name to the tag while it shows');

// --- 9. the CSS: 0045's brackets, the acquire once, the floors ----------------------------------------
const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const bracketRule = css.match(/([^{}]*\.sr-bracketed::before[^{}]*)\{/);
check(bracketRule && /\.sr-reticle__box::before/.test(bracketRule[1]), 'the reticle is the same bracket rule as a focused control (0045)');
check(/\.sr-reticle__box\.is-acquiring\s*\{[^}]*animation: sr-acquire var\(--sr-mid\) var\(--sr-ease\)/.test(css), 'acquire over --sr-mid on --sr-ease');
check(/@keyframes sr-acquire\s*\{[^@]*scale\(1\.6\)[^@]*scale\(1\)/.test(css), 'from 1.6 to 1.0');
check(!/sr-reticle[^{]*\{[^}]*animation[^}]*infinite/.test(css), 'no pulse, no spin');
check(/prefers-reduced-motion: reduce\)\s*\{\s*\.sr-reticle__box\.is-acquiring\s*\{\s*animation: sr-acquire-fade 120ms/.test(css), 'reduced motion: a 120 ms fade, no scale');
check(/\.sr-hud\s*\{[^}]*z-index: 6;/.test(css), 'the HUD sits over the labels (5) and under the veil (8)');
check(/\.sr-tag__honesty\s*\{[^}]*font-size: 13px/.test(css), 'the honesty line is at the 13 px floor');
check(/\.sr-tag__name\s*\{[^}]*font: 600 15px/.test(css), 'the name is 600 15 px');
check(/\.sr-tag__readouts\s*\{[^}]*font: 400 13px[^}]*tabular-nums/.test(css), 'readouts 13 px, fixed-width digits');
check(/\.sr-tag\s*\{[^}]*background: var\(--sr-glass-thin\)/.test(css) && /\.sr-tag\.is-over-world\s*\{[^}]*background: var\(--sr-glass\)/.test(css), 'thin glass over space, the full glass over a world');
check(/\.sr-reticle\.is-occluded\s*\{[^}]*opacity: 0\.5/.test(css) && /repeating-linear-gradient/.test(css), 'occluded: dashed, at half');
check(/\.sr-tick\s*\{[^}]*width: 20px[^}]*opacity: 0\.6/.test(css), 'the tick is 20 px of ember at 60 %');

// --- 10. no DOM, no HUD, no throw ----------------------------------------------------------------------
const none = createHud({});
check(typeof none.frame === 'function' && none.namesSelection() === false, 'without a document createHud() is inert');

if (problems.length) {
  console.error('hud FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('hud ok: box max(40, d + 12); the tag flips at all four corners and stays on screen; the tick from 2 px/s; the chevron on the inset edge for left, right, above, below and behind; the live region on the first digit; the tag\'s numbers are the card\'s');
