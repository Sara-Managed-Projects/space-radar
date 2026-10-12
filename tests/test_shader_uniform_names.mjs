// A tile's shader is the world's shader with lines added (scene/tiles.js). A uniform the tile adds
// must not carry a name the world's shader already declares: GLSL refuses a second declaration,
// the program does not compile, and the tile is silently not drawn (2026-10-08 to 2026-10-10:
// uRelief, the Moon's and Mars's close-up tiles). This reads the two sources as text.
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL(`../site/js/scene/${f}`, import.meta.url), 'utf8');
const names = (src) => [...src.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);
const worlds = read('worlds.js');
const tiles = read('tiles.js');
const problems = [];
const added = [...tiles.matchAll(/\\nuniform\s+\w+\s+(\w+);|uniform\s+\w+\s+(\w+);/g)].map((m) => m[1] || m[2]).filter((n) => n !== 'uMap');
const world = new Set(names(worlds));
for (const n of new Set(added)) if (world.has(n)) problems.push(`scene/tiles.js adds uniform ${n}, which scene/worlds.js already declares`);
if (!added.includes('uRelief')) problems.push('the test no longer finds the uniforms tiles.js adds (uRelief is not among them): its pattern is stale');
if (problems.length) { console.error('shader uniform names FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`shader uniform names ok: the ${new Set(added).size} uniforms a tile adds are not among the ${world.size} the world's shader declares`);
