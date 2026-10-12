// scripts/_png_text.mjs -- write and read a PNG text chunk (spec 0043 design section 4, internal #121).
//
// Every picture the app makes carries `Software: space-radar <tool>` in a tEXt chunk, so a picture
// pasted in by hand is caught: tests/test_contract.mjs reads the chunk from every site/og/*.png and
// scripts/check_registry.py refuses a file with neither the chunk nor a registry/pictures.yaml row.
// Playwright and Pillow both hand over bytes, so the chunk is inserted as bytes, before IDAT's first
// byte of pixels and never changing one (a stamped file decodes to the same pixels).
//
//   node scripts/_png_text.mjs stamp "space-radar build_trip_og.py" site/og/a.png ...   add Software (idempotent)
//   node scripts/_png_text.mjs read site/og/a.png                                         print it
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let TABLE = null;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** The tEXt/iTXt text under `key` (iTXt uncompressed only), or null. Stops at the first IDAT. */
export function readText(png, key = 'Software') {
  if (!png.slice(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  for (let at = 8; at + 8 <= png.length;) {
    const len = png.readUInt32BE(at);
    const kind = png.slice(at + 4, at + 8).toString('latin1');
    const body = png.slice(at + 8, at + 8 + len);
    if (kind === 'IDAT') break;
    if ((kind === 'tEXt' || kind === 'iTXt') && body.slice(0, key.length + 1).toString('latin1') === `${key}\0`) {
      if (kind === 'tEXt') return body.slice(key.length + 1).toString('latin1');
      const rest = body.slice(key.length + 3);
      const lang = rest.indexOf(0);
      return rest.slice(rest.indexOf(0, lang + 1) + 1).toString('utf8');
    }
    at += 12 + len;
  }
  return null;
}

/** The PNG with `key\0text` added as a tEXt chunk just before the first IDAT; unchanged when it already says it. */
export function addText(png, key, text) {
  if (!/^[\x20-\x7e]{1,79}$/.test(key)) throw new Error(`a tEXt keyword is 1 to 79 printable Latin-1 characters: ${JSON.stringify(key)}`);
  if (!/^[\x20-\x7e\n]*$/.test(text)) throw new Error('the text must be printable ASCII (tEXt is Latin-1)');
  if (readText(png, key) === text) return png;
  const body = Buffer.concat([Buffer.from(key, 'latin1'), Buffer.from([0]), Buffer.from(text, 'latin1')]);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write('tEXt', 4, 'latin1');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.slice(4), body])), 0);
  let at = 8;
  while (at + 8 <= png.length && png.slice(at + 4, at + 8).toString('latin1') !== 'IDAT') at += 12 + png.readUInt32BE(at);
  if (at + 8 > png.length) throw new Error('no IDAT chunk');
  return Buffer.concat([png.slice(0, at), head, body, tail, png.slice(at)]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'stamp') {
    const [text, ...files] = rest;
    for (const f of files) {
      const before = readFileSync(f);
      const after = addText(before, 'Software', text);
      if (after !== before) writeFileSync(f, after);
      console.log(`${f}: ${readText(after)}`);
    }
  } else if (cmd === 'read') {
    for (const f of rest) console.log(`${f}: ${readText(readFileSync(f))}`);
  } else {
    console.error('usage: _png_text.mjs stamp "<Software text>" files... | read files...');
    process.exit(2);
  }
}
