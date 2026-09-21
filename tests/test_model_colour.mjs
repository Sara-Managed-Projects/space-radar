// WHAT COLOUR A LOADED MODEL IS DRAWN IN, and why it is decided once per model.
//
// Every .glb the app loads used to be repainted in ONE class colour. That is what made a decimated
// NASA mesh read as a blob: the silhouette survives decimation and the colour is thrown away, so
// nine different spacecraft came out as nine identical tan shapes. Half the shipped files still
// carry their flat colours -- in a four-texel-tall palette strip the pipeline baked, or as stated
// base colours in the glTF -- and the app was downloading those bytes and discarding them.
//
// The decision is per MODEL and not per mesh. Sentinel-6 carries both a palette strip and 2048 px
// photographs; deciding per mesh drew it half in NASA's colours and half in the class orange,
// which reads as a bug rather than as a spacecraft.
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { colourRoute, isPalette } = await import(join(ROOT, 'site/js/scene/realmodels.js'));

const tex = (w, h) => ({ image: { width: w, height: h } });
const mat = (hex, map = null) => ({ color: { getHexString: () => hex.replace('#', '') }, map });
const root = (mats) => ({ traverse(fn) { fn({ isMesh: true, material: mats }); } });

// isPalette: four texels tall is a palette; a photograph is not.
assert.equal(isPalette(tex(32, 4)), true, '32x4 is the palette strip gltf-transform writes');
assert.equal(isPalette(tex(128, 4)), true, '128x4 too -- one column per original material');
assert.equal(isPalette(tex(256, 256)), false, 'a 256px square is a picture of a surface');
assert.equal(isPalette(tex(2048, 2048)), false, 'and so, emphatically, is 2048 square');
assert.equal(isPalette(null), false, 'no texture is not a palette');
assert.equal(isPalette({ image: null }), false, 'an unloaded texture is not a palette');

// palette: EVERY material reads one.
assert.equal(colourRoute(root([mat('#ffffff', tex(64, 4)), mat('#ffffff', tex(64, 4))])), 'palette');
// ... and one photograph among them is enough to fall back, or the model comes out half and half.
assert.equal(colourRoute(root([mat('#ffffff', tex(64, 4)), mat('#ffffff', tex(2048, 2048))])), 'class',
  'a file with both a palette and photographs must not be drawn half in each');

// own: two different stated colours is variation worth keeping.
assert.equal(colourRoute(root([mat('#5e17ff'), mat('#6a5e38')])), 'own');
// one stated colour is a tint, not variation: Hubble is #959595 throughout.
assert.equal(colourRoute(root([mat('#959595'), mat('#959595')])), 'class');
// white is not a stated colour -- it means "the texture carries it", and the texture is dropped.
assert.equal(colourRoute(root([mat('#ffffff'), mat('#ffffff', tex(1024, 1024))])), 'class',
  'all-white materials must not wash the model out; the class colour says more');
assert.equal(colourRoute(root([mat('#ffffff'), mat('#5e17ff')])), 'class',
  'one non-white colour beside white is still only one stated colour');
assert.equal(colourRoute(root([])), 'class', 'a model with no materials keeps the class colour');

// EVERY IMAGE IN A SHIPPED MODEL IS ONE THE APP CAN USE.
//
// realmodels.js samples a palette strip and discards everything else. Before 2026-09-21 thirteen
// shipped files carried photographs -- 1024 and 2048 px pictures of foil and solar cells -- that
// every visitor downloaded and no pixel ever sampled: 1.3 MB of the model folder. They were baked
// into flat colours by scripts/flatten-textures.mjs. This keeps the next file from bringing its
// photographs back: an image more than four texels tall in site/models/ is bytes for nothing.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const DIR = join(ROOT, 'site/models');
  const parts = (buf) => {
    let off = 12, json = null, bin = null;
    while (off < buf.length) {
      const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
      const body = buf.subarray(off + 8, off + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'));
      if (type === 0x004e4942) bin = body;
      off += 8 + len + ((4 - (len % 4)) % 4);
    }
    return { json, bin };
  };
  // PNG IHDR, and the three WebP headers (lossy VP8, lossless VP8L, extended VP8X).
  const dims = (b) => {
    if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if (b.subarray(0, 4).toString() !== 'RIFF') return null;
    const fmt = b.subarray(12, 16).toString();
    if (fmt === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (fmt === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
    if (fmt === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    return null;
  };
  const wasted = [];
  let images = 0, files = 0;
  for (const f of readdirSync(DIR).filter((n) => n.endsWith('.glb'))) {
    files++;
    const { json, bin } = parts(readFileSync(join(DIR, f)));
    for (const im of json.images || []) {
      images++;
      const bv = json.bufferViews[im.bufferView];
      const bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      const d = dims(Buffer.from(bytes));
      if (!d) { wasted.push(`${f}: an image whose size cannot be read (${im.mimeType})`); continue; }
      if (!isPalette({ image: { width: d[0], height: d[1] } })) {
        wasted.push(`${f}: a ${d[0]}x${d[1]} image, ${(bv.byteLength / 1024).toFixed(1)} kB that no pixel samples`);
      }
    }
  }
  assert.deepEqual(wasted, [], 'shipped models carry images the app downloads and discards:\n  ' + wasted.join('\n  ') +
    '\n  bake them with scripts/flatten-textures.mjs');
  console.log(`  ${files} shipped models, ${images} images, every one a palette strip the app samples`);
}

console.log('model colour: ok');
