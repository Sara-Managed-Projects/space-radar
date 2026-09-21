// flatten-textures.mjs -- bake a shipped model's textures into flat per-material colours.
//
//   cd "$(mktemp -d)" && npm i --silent @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 \
//       @gltf-transform/functions@4.5.0 meshoptimizer@0.22.0
//   node /path/to/space-radar/scripts/flatten-textures.mjs in.glb out.glb colours.json
//
// `colours.json` is what tools/texture-colours.html measured for this ONE file:
// { "<glTF material index>": { "hex": "#rrggbb", "flag": null | "magenta-placeholder" | ... } }
//
// WHY. realmodels.js draws a loaded model in its own colours when the file carries flat ones -- a
// palette strip, or two or more stated base colours (colourRoute) -- and in one class colour when
// it does not. Ten shipped files carry their colours only as photographs: 1024 px pictures of foil
// and solar cells, which the app downloads and then discards, because a photograph IS the
// photoreal shading the module header rules out. Measured 2026-09-21, those ten carry 1.3 MB of
// images that no pixel on screen has ever sampled.
//
// So this samples what each material actually SHOWS (tools/texture-colours.html does that in a
// browser, which is the only thing here that decodes WebP), writes it as the material's base
// colour, and deletes the textures and the coordinates that pointed into them. The model then
// reaches colourRoute's 'own' route on its own, and the file gets smaller.
//
// A FLAGGED colour is never baked. GRACE's `underside.001` samples to #ea03ec -- NASA's file has a
// UV-checker placeholder where a texture should be -- and a magenta satellite is a worse lie than
// a class-coloured one. A flagged material gets the neutral silver the procedural models use for
// unpainted structure, and the script says so.
//
// AFTER THIS RUNS, THE TEXTURE-DISPOSAL NOTE IN decimate-model.mjs STILL HOLDS FOR ITS OWN CASE:
// this script leaves no texture behind at all.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

const require = createRequire(join(process.cwd(), 'package.json'));
const load = (name) => import(require.resolve(name));
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const { dedup, prune, meshopt } = await load('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await load('meshoptimizer');

const [, , IN, OUT, COLOURS] = process.argv;
if (!IN || !OUT || !COLOURS) {
  console.error('usage: flatten-textures.mjs in.glb out.glb colours.json');
  process.exit(2);
}
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const UNPAINTED = [0xc9 / 255, 0xce / 255, 0xda / 255]; // models.js's silver, for a refused sample
const colours = JSON.parse(readFileSync(COLOURS, 'utf8'));

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);

// glTF colours are LINEAR; the sampled hex is sRGB, which is what the texel was.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgbOf = (hex) => [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));

let baked = 0, refused = 0;
const materials = doc.getRoot().listMaterials();
materials.forEach((m, i) => {
  const row = colours[i];
  if (row) {
    const rgb = row.flag ? UNPAINTED.map(toLinear) : rgbOf(row.hex);
    if (row.flag) { refused++; console.log(`  material ${i} (${m.getName()}): ${row.hex} refused as ${row.flag}`); }
    else baked++;
    m.setBaseColorFactor([...rgb, m.getBaseColorFactor()[3]]);
  }
  m.setBaseColorTexture(null);
  m.setNormalTexture(null);
  m.setMetallicRoughnessTexture(null);
  m.setOcclusionTexture(null);
  m.setEmissiveTexture(null);
  // A texture can also hang off a material EXTENSION -- Perseverance's glass is
  // KHR_materials_transmission with its own map -- and prune() keeps anything an extension still
  // points at. realmodels.js replaces every material outright, so no extension has ever been read.
  // Disposed, not just detached: a detached extension property still holds its texture, and the
  // texture is then not an orphan yet when the sweep below looks for one.
  for (const ext of m.listExtensions()) { m.setExtension(ext.extensionName, null); ext.dispose(); }
});

// Nothing samples a texture any more, so the coordinates are dead weight too.
let uvSets = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of prim.listSemantics()) if (sem.startsWith('TEXCOORD_')) { prim.setAttribute(sem, null); uvSets++; }
  }
}
const images = doc.getRoot().listTextures().length;
// And an image nothing points at, at all: Perseverance carries a 128 px 'glass' image with no glTF
// texture entry referencing it. Its only parent is the root, prune() does not collect it, and
// tests/test_model_colour.mjs found it after everything else in this file had run.
for (const t of doc.getRoot().listTextures()) {
  if (t.listParents().every((p) => p.propertyType === 'Root')) t.dispose();
}
// meshopt() again, as decimate-model.mjs does: reading the file DECODED its geometry, and writing
// without this re-encodes it with the extension's defaults -- Perseverance came out 19 kB LARGER
// than it went in, with nothing removed but a 0.1 kB image.
await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder }));
await io.write(OUT, doc);
const kb = (p) => (statSync(p).size / 1024).toFixed(1);
console.log(`${IN.split('/').pop()}: ${baked} baked, ${refused} refused; ${images} images and ${uvSets} UV sets dropped; ${kb(IN)} -> ${kb(OUT)} kB`);
