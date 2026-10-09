// tests/test_png_text.mjs -- scripts/_png_text.mjs writes a tEXt chunk a decoder and the contract test can read (internal #121).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addText, readText } from '../scripts/_png_text.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const files = readdirSync(join(ROOT, 'site/og')).filter((f) => f.endsWith('.png'));
const png = readFileSync(join(ROOT, 'site/og', files[0]));
const bare = addText(png, 'Zz', 'one');                      // a key no shipped file has
if (readText(bare, 'Zz') !== 'one') problems.push('the chunk written is not the chunk read back');
if (bare.length !== png.length + 12 + 'Zz\0one'.length) problems.push('the chunk is not 12 bytes of framing plus its text');
if (addText(bare, 'Zz', 'one') !== bare) problems.push('writing the same text twice must change nothing');
if (!readText(bare, 'Software')) problems.push(`${files[0]} has no Software chunk`);
if (bare.slice(-12).toString('latin1').indexOf('IEND') < 0) problems.push('IEND is no longer last');
// the IHDR, and every pixel chunk, are byte for byte what they were
const strip = (b) => { const out = []; for (let at = 8; at + 8 <= b.length;) { const n = b.readUInt32BE(at); const k = b.slice(at + 4, at + 8).toString('latin1'); if (k !== 'tEXt') out.push(b.slice(at, at + 12 + n)); at += 12 + n; } return Buffer.concat(out); };
if (!strip(bare).equals(strip(png))) problems.push('a chunk other than tEXt changed');
for (const bad of [['', 'x'], ['é', 'x'], ['k', 'é']]) { try { addText(png, bad[0], bad[1]); problems.push(`accepted ${JSON.stringify(bad)}`); } catch { /* refused */ } }
for (const f of files) if (!/^space-radar /.test(readText(readFileSync(join(ROOT, 'site/og', f))) || '')) problems.push(`site/og/${f} has no Software chunk`);
if (problems.length) { console.error('png text FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`png text ok: a chunk survives a round trip without touching a pixel chunk, and all ${files.length} site/og pictures say space-radar made them`);
