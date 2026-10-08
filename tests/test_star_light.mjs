// A star's light across its sprite (public #271): scene/stretch.js starLight() and its GLSL twin,
// and that all three star draws use it. Run: node tests/test_star_light.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { starLight, STAR_LIGHT_GLSL } = await import(join(JS, 'scene/stretch.js'));
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

// 1. The core is a peak: 1 at the centre, falling at once, gone at the core's edge. Never a plateau.
check(Math.abs(starLight(0, 1, 0)[0] - 1) < 1e-12, 'the core is 1 at the centre');
check(starLight(0.12, 1, 0)[0] < 0.95 && starLight(0.25, 1, 0)[0] < 0.7, `it is already falling where the old disc was still full: ${starLight(0.12, 1, 0)[0].toFixed(3)} at 0.12 of the sprite, ${starLight(0.25, 1, 0)[0].toFixed(3)} half way out (the disc it replaces was 1 out to 0.12)`);
check(starLight(0.5, 1, 0)[0] === 0, 'and is 0 at the sprite\'s edge');
let last = 2;
let falls = true;
for (let d = 0; d <= 0.5; d += 0.01) { const v = starLight(d, 1, 0)[0]; if (v > last + 1e-12) falls = false; last = v; }
check(falls, 'monotonically');
// 2. With a glow the core keeps its size in pixels: a sprite four times as big has a core a quarter of it.
check(Math.abs(starLight(0.05, 0.25, 1)[0] - starLight(0.2, 1, 1)[0]) < 1e-12, 'the core is the same shape in a sprite four times the size');
check(starLight(0.2, 0.25, 0)[0] === 0, 'and ends where the core ends');
// 3. The glow: none without it, strongest at the centre, zero at the edge, well under the core's peak beyond the core.
check(starLight(0.1, 1, 0)[1] === 0, 'no glow asked, none drawn');
check(starLight(0.5, 0.25, 1)[1] === 0, 'the glow is 0 at the sprite\'s edge, so no square shows');
const g = [0.13, 0.2, 0.3, 0.4].map((d) => starLight(d, 0.25, 1)[1]);
check(g.every((v, i) => i === 0 || v < g[i - 1]) && g[0] < 0.4 && g[0] > 0.1 && g[3] > 0, `past the core it is a soft fall-off: ${g.map((v) => v.toFixed(3)).join(' ')}`);
check(Math.abs(starLight(0.2, 0.25, 0.5)[1] - 0.5 * starLight(0.2, 0.25, 1)[1]) < 1e-12, 'and scales with how bright the star is');
// 4. The GLSL is the same arithmetic, and the three draws call it.
check(/exp\( -6\.0 \* dc \* dc \) \* \( 1\.0 - smoothstep\( 0\.4, 0\.5, dc \) \)/.test(STAR_LIGHT_GLSL) && /glow \* \( 0\.55 \* e2 \* e2 \+ 0\.10 \* e2 \)/.test(STAR_LIGHT_GLSL), 'the GLSL carries the same numbers');
for (const f of ['scene/starfield.js', 'scene/stars3d.js', 'sky/groundsky.js']) {
  const src = readFileSync(join(JS, f), 'utf8');
  check(src.includes('${STAR_LIGHT_GLSL}') && /starLight\(/.test(src), `${f} draws its stars with it`);
  check(!/1\.0 - smoothstep\( 0\.12, 0\.5, d/.test(src), `${f} no longer draws the flat disc`);
}
// No spikes, no flare: docs/design-language.md forbids lens flare (tests/test_contract.mjs holds the passes).
check(!/spike/i.test(STAR_LIGHT_GLSL), 'no diffraction spikes are drawn');

if (problems.length) { console.error(`star light: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log('star light ok: a peak that is never flat, a glow that ends at the sprite\'s edge, the same in all three star draws');
