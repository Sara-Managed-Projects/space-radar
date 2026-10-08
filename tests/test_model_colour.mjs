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

// A MODEL REBUILT IN ITS OWN COLOURS REACHES THE 'own' ROUTE AND NEEDS NOTHING AT LOAD.
//
// scripts/bake-own-colours.mjs (2026-10-05, issues #265, #386, #418) writes a flat colour per part.
// This holds what it promised, read straight out of every file whose registry row says it was
// built that way: at least two stated colours that are not white (or colourRoute falls back to
// the class colour, which is the salmon lunar module again), no image at all, a NORMAL on every
// primitive (tests/test_contract.mjs refuses a new file without one), and no colour outside the
// value clamp -- a stated black is a hole in the picture against the sky.
{
  const { readFileSync } = await import('node:fs');
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const rows = yaml.split('\n').filter((l) => /file: site\/models\//.test(l) && l.includes('scripts/bake-own-colours.mjs:'));
  assert.ok(rows.length >= 24, `twenty-four models were rebuilt in their own colours; the registry names ${rows.length}`);
  const srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
  const bad = [];
  const seen = {};
  for (const row of rows) {
    const rel = row.match(/file: (site\/models\/[A-Za-z0-9_.-]+\.glb)/)[1];
    const buf = readFileSync(join(ROOT, rel));
    const gltf = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));
    const hexes = (gltf.materials || []).map((m) => {
      const f = (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor) || [1, 1, 1, 1];
      return f.slice(0, 3).map(srgb);
    });
    const name = rel.split('/').pop();
    seen[name] = hexes;
    const stated = new Set(hexes.map((h) => h.map((c) => Math.round(c * 255)).join(',')).filter((h) => h !== '255,255,255'));
    if (stated.size < 2) bad.push(`${name}: ${stated.size} stated colour(s), so it would be painted its class colour`);
    if ((gltf.images || []).length) bad.push(`${name}: carries ${gltf.images.length} image(s)`);
    if ((gltf.meshes || []).some((m) => m.primitives.some((p) => p.attributes.NORMAL === undefined))) bad.push(`${name}: a primitive with no NORMAL`);
    for (const h of hexes) {
      const v = Math.max(...h);
      if (v < 0.12 - 0.01 || v > 0.93 + 0.01) bad.push(`${name}: a colour of brightness ${v.toFixed(2)}, outside the 0.12 to 0.93 clamp`);
    }
    for (const m of gltf.meshes || []) if (!/^(body|solar-panel|foil)$/.test(m.name || '')) bad.push(`${name}: a mesh named ${JSON.stringify(m.name)}, which applyToon cannot read a specular family from`);
  }
  assert.deepEqual(bad, [], 'rebuilt models that do not keep what the bake promised:\n  ' + bad.join('\n  '));
  // The two that were reported, by what was wrong with them. Gold foil is an amber: red over
  // green over blue, well saturated. The lunar module must carry one and Voyager must too.
  const amber = (h) => h[0] > h[1] && h[1] > h[2] && h[0] - h[2] > 0.3;
  assert.ok(seen['lunar-module.glb'].some(amber), 'the Apollo lunar module has no gold foil: ' + JSON.stringify(seen['lunar-module.glb']));
  assert.ok(seen['voyager.glb'].some(amber), 'Voyager has no gold on it');
  assert.ok(seen['voyager.glb'].some((h) => Math.min(...h) > 0.8), 'Voyager has no white dish');
  console.log(`  ${rows.length} models rebuilt in their own colours: each has two or more stated colours, no image, normals, and nothing outside the value clamp`);
}

// PLANET-SHINE (issue #266, spec 0057 task 3): the numbers the shader's three terms come to.
{
  const { planetShineStrength, setPlanetShine, PLANET_SHINE, SHINE_GAIN } = await import(join(ROOT, 'site/js/scene/models.js'));
  const earth = PLANET_SHINE.earth.albedo;
  assert.equal(earth, 0.294, "Earth's Bond albedo is the NSSDC fact sheet's 0.294");
  assert.equal(PLANET_SHINE.moon.albedo, 0.11, "and the Moon's is 0.11");
  for (const [id, row] of Object.entries(PLANET_SHINE)) {
    assert.ok(row.albedo > 0 && row.albedo < 1 && /^#[0-9A-F]{6}$/i.test(row.colour), `${id}: an albedo between 0 and 1 and a colour`);
  }
  assert.equal(PLANET_SHINE.sun, undefined, 'the Sun is the key light, not a world that shines back');
  const R = 6371;
  const iss = { albedo: earth, radiusOverDistance: R / (R + 420), dayDot: 1, facingDot: 1 };
  const full = planetShineStrength(iss);
  // Face-on to the ground at noon, the ISS gets albedo x gain x (R/d)^2 and nothing else.
  assert.ok(Math.abs(full - earth * SHINE_GAIN * (R / (R + 420)) ** 2) < 1e-12, `the ISS at noon, facing down: ${full}`);
  assert.ok(full > 0.25 && full < 0.45, `which is a fill, not a second sun: ${full.toFixed(3)}`);
  assert.equal(planetShineStrength({ ...iss, dayDot: -1 }), 0, 'over the night side the planet throws nothing back');
  assert.equal(planetShineStrength({ ...iss, facingDot: -1 }), 0, 'a face turned away from the planet gets none');
  const side = planetShineStrength({ ...iss, facingDot: 0 });
  assert.ok(side > 0 && side < full / 2, 'and it fades round the hull instead of cutting at the limb');
  const geo = planetShineStrength({ ...iss, radiusOverDistance: R / 42164 });
  assert.ok(geo < full / 30, `at geostationary height it is all but gone (${geo.toFixed(4)})`);
  assert.ok(Math.abs(planetShineStrength({ ...iss, radiusOverDistance: 1.4 }) - earth * SHINE_GAIN) < 1e-12, 'a rover is lit by its own ground, and no more than fully');
  assert.equal(setPlanetShine('earth', { x: 0, y: 0, z: 0 }, 1), true);
  assert.equal(setPlanetShine('sun', { x: 0, y: 0, z: 0 }, 1), false, 'no row, no shine');
  assert.equal(setPlanetShine('earth', { x: 0, y: 0, z: 0 }, 0), false, 'a world with no radius on this stage turns it off');
  assert.equal(setPlanetShine(null), false);
  // The shader and the function are the same sum: if one is edited the other must be.
  const src = (await import('node:fs')).readFileSync(join(ROOT, 'site/js/scene/models.js'), 'utf8');
  assert.ok(src.includes("smoothstep( -0.15, 0.55, dot( -D, L ) )") && src.includes('smooth(-0.15, 0.55, dayDot)'), 'the day term is the same in the shader and in planetShineStrength');
  assert.ok(src.includes('cover * cover * day * facing * facing'), 'and so is the product');
  console.log('  planet-shine: 0 over the night side, 0 on a face turned away, (R/d)^2 with distance, albedos from the NSSDC fact sheets');
}

// A WORLD'S SHADOW ON A MODEL (internal #388): the function the shader repeats, held to the one
// the dots and the pass predictions already use, so a dot and its model go dark together.
{
  const M = await import(join(ROOT, 'site/js/scene/models.js'));
  const { earthShadowLit } = await import(join(ROOT, 'site/js/scene/shadow.js'));
  const R = 6371;
  const O = { x: 0, y: 0, z: 0 };
  const sunDir = { x: 1, y: 0, z: 0 };
  const sunFar = { x: 1.496e8, y: 0, z: 0 };
  const lit = (x, y, z) => M.worldShadowLit({ x, y, z }, O, sunDir, R);
  assert.equal(lit(R + 420, 0, 0), 1, 'the ISS at noon is in sunlight');
  assert.equal(lit(-(R + 420), 0, 0), 0, 'the ISS at midnight is in the umbra');
  assert.equal(lit(0, R + 420, 0), 1, 'over the terminator it is still lit');
  assert.equal(lit(-R * 0.8, R * 0.6, 0), 0, 'a lander on the night side stands in the same shadow');
  assert.equal(lit(R * 0.8, R * 0.6, 0), 1, 'and one on the day side does not');
  assert.equal(lit(-42164, 0, 0), 0, 'a geostationary satellite behind the Earth at an equinox midnight is eclipsed');
  assert.equal(lit(-42164, 7000, 0), 1, 'and one 7 000 km off the axis is not');
  assert.equal(M.worldShadowLit({ x: -1, y: 0, z: 0 }, O, sunDir, 0), 1, 'no world, no shadow');
  let edge = 0;
  for (let i = 0; i < 400; i += 1) {
    const along = -(500 + i * 211.7);
    const perp = R - 300 + (i % 40) * 15;
    const a = M.worldShadowLit({ x: along, y: perp, z: 0 }, O, sunDir, R);
    const b = earthShadowLit({ x: along, y: perp, z: 0 }, O, sunFar, R);
    assert.ok(Math.abs(a - b) < 1e-6, `the model's shadow and the dot's agree at (${along}, ${perp}): ${a} vs ${b}`);
    if (a > 0.01 && a < 0.99) edge += 1;
  }
  assert.ok(edge > 0, 'and the comparison crossed the soft edge, not only the two flat ends');
  // The uniforms: a world with no albedo row still casts a shadow, and nothing near means none.
  const fake = { uniforms: {}, fragmentShader: 'void main() {\n#include <opaque_fragment>\n}' };
  M.toonMaterial('#FFFFFF', 'body', new Map()).onBeforeCompile(fake);
  assert.equal(M.setPlanetShine('pluto', O, 2), false, 'Pluto has no albedo row, so no planet-shine');
  assert.equal(fake.uniforms.uShadeRadius.value, 2, 'but it is still in the way of the Sun');
  M.setPlanetShine('earth', O, 3);
  assert.equal(fake.uniforms.uShadeRadius.value, 3);
  assert.ok(fake.uniforms.uNightCol.value.r > 0 && fake.uniforms.uNightCol.value.r < 0.2, "the Earth's night side glows faintly, in the city-light colour");
  M.setPlanetShine('mars', O, 3);
  assert.equal(fake.uniforms.uNightCol.value.r, 0, "and Mars's does not");
  M.setPlanetShine(null);
  assert.equal(fake.uniforms.uShadeRadius.value, 0, 'far from every world a model is lit by the Sun alone');
  const fs = fake.fragmentShader;
  assert.ok(fs.includes('mix( night, outgoingLight, sunlit )') && fs.includes(`-along * ${M.SUN_ANGULAR_RADIUS}`), 'the shader takes the sunlight away by the same edge');
  assert.ok(fs.indexOf('uShadeRadius > 0.0') > fs.indexOf('uShineCol * cover'), 'and does it after the planet-shine, which is sunlight too');
  assert.ok(M.NIGHT_FLOOR > 0 && M.NIGHT_FLOOR <= 0.05, 'what is left in the dark is a silhouette, not a second light');
  console.log('  a world\'s shadow: the ISS dark at midnight, a night-side lander dark, the same soft edge as the dots, a faint city glow over the Earth only');
}

// THE FLOOD LIGHT (internal #272): a lamp for looking at a model in shadow, off by default, that
// only ever lifts a pixel. The shader and floodLit() are the same sum.
{
  const M = await import(join(ROOT, 'site/js/scene/models.js'));
  assert.equal(M.floodLightOn(), false, 'the real light is the default');
  const dark = 0.8 * M.NIGHT_FLOOR; // a white hull in the Earth's shadow
  assert.equal(M.floodLit(dark, 0.8, 1), dark, 'off, it changes nothing');
  assert.equal(M.setFloodLight(true), true);
  assert.ok(M.floodLightOn());
  const lit = M.floodLit(dark, 0.8, 1);
  assert.ok(lit > 0.5 && lit <= 0.8, `on, a hull in shadow that faces the camera can be seen (${lit.toFixed(2)})`);
  assert.ok(M.floodLit(dark, 0.8, 0) >= 0.8 * 0.45 && M.floodLit(dark, 0.8, 0) < lit, 'and a face edge-on is dimmer, so the shape still reads');
  assert.equal(M.floodLit(0.95, 0.8, 1), 0.95, 'it never darkens what the Sun lights more brightly');
  assert.ok(M.FLOOD_LEVEL < 1, 'the lamp stays under full sunlight');
  const fake = { uniforms: {}, fragmentShader: 'void main() {\n#include <opaque_fragment>\n}' };
  M.toonMaterial('#FFFFFF', 'body', new Map()).onBeforeCompile(fake);
  const fs = fake.fragmentShader;
  assert.ok(fake.uniforms.uFlood && fake.uniforms.uFlood.value === M.FLOOD_LEVEL, 'every toon material reads the one shared lamp');
  assert.ok(fs.includes('uniform float uFlood;') && fs.includes('max( outgoingLight, diffuseColor.rgb * head * uFlood )'), 'the shader lifts, with max()');
  assert.ok(fs.indexOf('uFlood > 0.0') > fs.indexOf('mix( night, outgoingLight, sunlit )'), 'and after the world\'s shadow, which would otherwise take it away');
  assert.equal(M.setFloodLight(false), false);
  assert.equal(fake.uniforms.uFlood.value, 0, 'off again, the same uniform is 0');
  console.log('  the flood light: off by default, lifts a shadowed hull to where it can be seen, never darkens, never brighter than day');
}

// A MODEL NOBODY CAN REACH, AND A ROUTE TO A FILE THAT IS NOT THERE (public #472). A real_models
// row whose file no route in scene/realmodels.js names is drawn as the generic shape while its
// model ships; a route naming a file that does not ship is drawn as nothing. Both directions,
// from the registry and the directory. The one allowed exception says why in its own row.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const { REAL_MODELS } = await import(join(ROOT, 'site/js/scene/realmodels.js'));
  const routed = new Set();
  const walk = (o) => { if (!o || typeof o !== 'object') return; if (typeof o.file === 'string') routed.add(o.file); for (const v of Object.values(o)) walk(v); };
  walk(REAL_MODELS);
  // realmodels.js also routes by orbit and by a resolve() function; read the source for those.
  const src = readFileSync(join(ROOT, 'site/js/scene/realmodels.js'), 'utf8');
  for (const m of src.matchAll(/file: '([A-Za-z0-9_.-]+\.glb)'/g)) routed.add(m[1]);
  const shipped = readdirSync(join(ROOT, 'site/models')).filter((n) => n.endsWith('.glb'));
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const UNROUTED_ON_PURPOSE = {}; // MAVEN was the one, until 2026-10-08: it has a record now (data/sample.js LOST_ORBITERS)
  const unreachable = shipped.filter((f) => !routed.has(f) && !UNROUTED_ON_PURPOSE[f]);
  assert.deepEqual(unreachable, [], 'models that ship and that no record can be drawn with');
  for (const [f, why] of Object.entries(UNROUTED_ON_PURPOSE)) {
    const row = yaml.split('\n').find((l) => l.includes(`file: site/models/${f}`)) || '';
    assert.ok(shipped.includes(f) && !routed.has(f) && why.test(row), `${f} is the stated exception: shipped, not routed, and its row says why`);
  }
  assert.deepEqual([...routed].filter((f) => !shipped.includes(f)), [], 'routes to a model file that does not ship');
  console.log(`  ${shipped.length} model files: every one reachable by a record; no route to a missing file`);
}

console.log('model colour: ok');

// A PALETTE NEEDS COORDINATES TO BE READ WITH. Three shipped files (gpm, icon, tselina2) had a
// palette strip on every material and no TEXCOORD_0 on any primitive: colourRoute said 'palette',
// every vertex sampled the texel at (0, 0), and the whole satellite was drawn in the strip's first
// colour -- found 2026-10-05 by reading each file's JSON, not by looking, because one flat colour
// is exactly what a class-coloured model looked like. They were rebuilt; this keeps it found.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const DIR = join(ROOT, 'site/models');
  const blind = [];
  for (const f of readdirSync(DIR).filter((n) => n.endsWith('.glb'))) {
    const buf = readFileSync(join(DIR, f));
    const gltf = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));
    const mats = gltf.materials || [];
    for (const mesh of gltf.meshes || []) for (const p of mesh.primitives || []) {
      const m = p.material === undefined ? null : mats[p.material];
      const textured = m && m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture;
      if (textured && (p.attributes || {}).TEXCOORD_0 === undefined) { blind.push(f); break; }
    }
  }
  assert.deepEqual([...new Set(blind)], [], 'models whose materials read a texture their primitives have no coordinates for');
  console.log('  no shipped model reads a palette without the coordinates to read it with');
}
