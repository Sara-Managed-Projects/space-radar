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

console.log('model colour: ok');
