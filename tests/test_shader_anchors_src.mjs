// tests/test_shader_anchors_src.mjs -- the rule for a line of shader text that code looks for (reads source text).
//
// A deploy strips the comments and the indentation of every shader (scripts/strip_shaders.py, on since 1.7.4). A module
// that makes one shader from another by finding a piece of its text (`src.replace(ANCHOR, ...)`) must therefore look
// for ONE TRIMMED LINE OF CODE: no comment (it is gone on the live site), no leading or trailing space and no line end
// (the indentation is gone). The review of 2026-11-16 found the weather's anchor was a comment and the faint rings'
// were indented lines: both matched this tree and neither matched the live one. tests/test_shader_patches.mjs runs
// every patch on the built tree; this one refuses the next such anchor where it is written, and says how to write it.
//   node tests/test_shader_anchors_src.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(JS).filter((p) => p.endsWith('.js'));

const LIT = "'((?:[^'\\\\\\n]|\\\\.)*)'";
// What GLSL looks like in a string: enough to tell a shader's line from a file name or a sentence.
const GLSL = /gl_|\bvec[234]\b|\buniform |#include|\bfloat |void main|\bvarying |texture2D|\bsampler2D\b|#[A-Z_]{4,}#/;
const CALL = new RegExp(`\\.(?:replace|replaceAll|includes|indexOf|lastIndexOf|split)\\(\\s*${LIT}|\\bswap\\(\\s*(?:[\\w.]+,\\s*)?${LIT}`, 'g');
// Constants that are looked for: every *_LINE and *_ANCHOR, and scene/tiles.js's (a new one is named so, or added here).
const NAMED = new RegExp(`^(?:export )?const ((?:[A-Z0-9_]*_(?:LINE|ANCHOR))|FRAG_OUT|FRAG_LIT|FRAG_RELIEF_UV|FRAG_BASE|VERT_DEPTH|VERT_UV|EARTH_GROUND) = ${LIT};`, 'gm');

const problems = [];
const anchors = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f);
  const lineOf = (i) => text.slice(0, i).split('\n').length;
  for (const m of text.matchAll(CALL)) {
    const lit = m[1] ?? m[2];
    if (lit !== undefined && GLSL.test(lit)) anchors.push({ rel, line: lineOf(m.index), lit });
  }
  for (const m of text.matchAll(NAMED)) if (GLSL.test(m[2]) || /_(LINE|ANCHOR)$/.test(m[1])) anchors.push({ rel, line: lineOf(m.index), lit: m[2], name: m[1] });
}
for (const a of anchors) {
  const where = `${a.rel}:${a.line}${a.name ? ` ${a.name}` : ''} '${a.lit.slice(0, 70)}'`;
  if (/^\s|\s$/.test(a.lit)) problems.push(`${where}: starts or ends with a space: a deploy strips a shader's indentation, so look for the line trimmed`);
  if (/\\[nrt]/.test(a.lit)) problems.push(`${where}: holds a line end or a tab: look for one line, and put the line end in what replaces it`);
  if (a.lit.includes('//') || a.lit.includes('/*')) problems.push(`${where}: is a comment: a deploy strips a shader's comments, so look for a line of code`);
}
// The check is not vacuous: it sees the anchors this was written for.
const seen = (file, part) => anchors.some((a) => a.rel.endsWith(file) && a.lit.includes(part));
if (!seen('scene/weather/worldweather.js', 'float orenNayar(')) problems.push('the scan no longer finds worldweather.js PARS_ANCHOR: its pattern has gone stale');
if (!seen('scene/weather/worldweather.js', 'float tau = -log( 1.0 - alpha );')) problems.push('the scan no longer finds faintFragment\'s swap(): its pattern has gone stale');
if (!seen('scene/tiles.js', 'uniform sampler2D uMap;')) problems.push('the scan no longer finds tiles.js\'s replace(): its pattern has gone stale');
if (!seen('scene/stars3dtree.js', 'float sizePx')) problems.push('the scan no longer finds stars3dtree.js SIZE_LINE: its pattern has gone stale');
if (anchors.length < 20) problems.push(`only ${anchors.length} anchors found: the scan has gone stale`);

if (problems.length) { console.error('shader anchors FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`shader anchors ok: ${anchors.length} pieces of shader text that code looks for, each one trimmed line of code (no comment, no indentation, no line end)`);
