// Decode the KTX2 textures of NASA/JPL's Eyes Artemis II model to PNG and write a plain GLB the bake can read.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(join(process.cwd(), 'package.json'));
const load = (n) => import(require.resolve(n));
const { NodeIO } = await load('@gltf-transform/core');
const { ALL_EXTENSIONS } = await load('@gltf-transform/extensions');
const draco3d = (await load('draco3dgltf')).default;
const sharp = (await load('sharp')).default;
const [IN, OUT, BASIS_DIR] = process.argv.slice(2);
const BASIS = require(join(process.cwd(), 'basis_transcoder.cjs'));
const mod = await BASIS({ wasmBinary: readFileSync(join(BASIS_DIR, 'basis_transcoder.wasm')) });
mod.initializeBasis();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read(IN);
let n = 0;
for (const tex of doc.getRoot().listTextures()) {
  if (tex.getMimeType() !== 'image/ktx2') continue;
  const f = new mod.KTX2File(new Uint8Array(tex.getImage()));
  if (!f.isValid()) throw new Error('bad ktx2 ' + tex.getName());
  const w = f.getWidth(), h = f.getHeight();
  if (!f.startTranscoding()) throw new Error('transcode ' + tex.getName());
  const dst = new Uint8Array(f.getImageTranscodedSizeInBytes(0, 0, 0, 13));
  if (!f.transcodeImage(dst, 0, 0, 0, 13, 0, -1, -1)) throw new Error('transcodeImage ' + tex.getName());
  f.close(); f.delete();
  const png = await sharp(Buffer.from(dst), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  writeFileSync(join(process.argv[5] || '.', `${tex.getURI() || tex.getName() || 'tex' + n}.png`), png);
  tex.setImage(new Uint8Array(png)).setMimeType('image/png');
  n++;
}
for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_texture_basisu' || ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
await io.write(OUT, doc);
console.log('transcoded', n, 'textures ->', OUT);
