// tests/test_pbr.mjs -- real models in their own materials (release 1.3.0, internal #967; scene/pbr.js).
//
// Held here, with no GPU:
//   1. WHICH LOOK: a row's `look:` wins; without one a file with its own colours on parts named for
//      their surfaces is physically based and every other file stays on the toon ramp; a mapped world
//      never leaves it.
//   2. WHICH FINISH: the colours the shipped files actually use read as the surfaces they are (gold
//      blanket, white cloth, black blanket, cells, bare metal, white paint), read from the files.
//   3. THE SHADER: every hook pbr.js patches is in three.js's own standard shader (a `replace` that
//      matches nothing is silent, and the look would quietly be three.js's plain one); the patched text
//      declares what it uses.
//   4. THE TIERS: tier 0 and the latch wear the toon look, tier 1 and up the physically based one, and a
//      part changes between them on the frame after the switch moves, carrying the hero layer's fade.
//   5. THE CONTRACT: no render target, no environment map made on the GPU, no pass: the environment is
//      the material's own sum, and its JS twin agrees with the shader's text.
//   6. THE FOLDS: the height field tiles, and is the same every time (no Math.random).
//   7. THE WIRING: realmodels.js fetches pbr.js and the looks table only with the loader, and the
//      table is the registry's.
//
//   node tests/test_pbr.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
const P = await import(pathToFileURL(join(JS, 'scene/pbr.js')).href);
const M = await import(pathToFileURL(join(JS, 'scene/models.js')).href);
const SRC = readFileSync(join(JS, 'scene/pbr.js'), 'utf8');

// --- 1. which look --------------------------------------------------------------------------------
check(P.lookOf({ route: 'own', roles: true }) === 'pbr', 'a file with its own colours on named parts is physically based');
check(P.lookOf({ route: 'own', roles: false }) === 'toon', 'a file whose parts have no surface names stays on the toon ramp');
check(P.lookOf({ route: 'palette', roles: true }) === 'toon', 'a palette file stays on the toon ramp unless its row says otherwise');
check(P.lookOf({ route: 'class', roles: true }) === 'toon', 'a file with no colours of its own stays on the toon ramp');
check(P.lookOf({ stated: 'toon', route: 'own', roles: true }) === 'toon', 'look: toon keeps a file on the ramp');
check(P.lookOf({ stated: 'pbr', route: 'class', roles: false }) === 'pbr', 'look: pbr is obeyed');
check(P.lookOf({ stated: 'pbr', route: 'own', roles: true, surface: true }) === 'toon', 'a world with a map of its surface is never physically based');
check(P.lookOf({ stated: 'shiny', route: 'own', roles: true }) === 'pbr', 'a look that is neither word is ignored (the generator refuses it)');
for (const [name, role] of [['foil', 'foil'], ['foil_3', 'foil'], ['solar-panel', 'panel'], ['solar-panel_1', 'panel'], ['body_12', 'body'], ['Mesh.016', null], ['Default.008', null]]) {
  check(P.roleOf(name) === role, `the part ${name} has the role ${role} (got ${P.roleOf(name)})`);
}

// --- 2. which finish, on the colours the shipped files use ----------------------------------------
// Read from the files themselves (each material is named `own #<colour>...` by the bake): a colour that
// moves in a rebuilt file moves here too, and the expectations below are about kinds of colour.
function partsOf(file) {
  const b = readFileSync(join(ROOT, 'site/models', file));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  const out = [];
  for (const m of j.meshes || []) {
    for (const p of m.primitives) {
      const mat = (j.materials || [])[p.material];
      if (!mat) continue;
      const hex = (/#([0-9a-f]{6})/i.exec(mat.name || '') || [])[0];
      if (hex) out.push({ role: P.roleOf(m.name), hex: hex.toLowerCase() });
    }
  }
  return out;
}
const finishes = (file) => {
  const seen = new Map();
  for (const { role, hex } of partsOf(file)) seen.set(`${role} ${hex}`, P.finishOf(role, hex));
  return seen;
};
const has = (file, finish) => [...finishes(file).values()].includes(finish);
check(has('iss.glb', 'white-cloth'), 'the ISS has white blanket (its modules\' beta cloth)');
check(has('iss.glb', 'white-paint') && has('iss.glb', 'bare-metal'), 'the ISS has white paint and bare metal');
check(has('jwst.glb', 'gold-foil') || has('jwst.glb', 'gold-body'), 'Webb has gold');
check(has('gaia.glb', 'silver-foil') && has('gaia.glb', 'black-blanket') && has('gaia.glb', 'cells'), 'Gaia has its silver shield, its black blanket and its cells');
check(has('lunar-module.glb', 'gold-foil'), 'the lunar module has its gold blanket');
check(has('vikram.glb', 'gold-foil') && has('vikram.glb', 'cells'), 'Vikram has its gold blanket and its cells');
check(has('tiangong.glb', 'cells') || has('tiangong.glb', 'array-back'), 'Tiangong has its arrays');
for (const [role, hex, want] of [
  ['foil', '#c9a24a', 'gold-foil'], ['foil', '#e7e7e7', 'white-cloth'], ['foil', '#191b1f', 'black-blanket'],
  ['foil', '#bbbfd6', 'silver-foil'], ['panel', '#2e4e8c', 'cells'], ['panel', '#1c2738', 'cells'],
  ['body', '#e4e4e2', 'white-paint'], ['body', '#8f97a3', 'bare-metal'], ['body', '#24272e', 'dark'], ['body', '#c8372d', 'paint'],
]) check(P.finishOf(role, hex) === want, `${role} ${hex} is ${want} (got ${P.finishOf(role, hex)})`);
for (const [k, f] of Object.entries(P.FINISHES)) {
  check(f.metalness >= 0 && f.metalness <= 1 && f.roughness > 0.05 && f.roughness <= 1, `the finish ${k} has a metalness and a roughness three.js can use`);
}
let files = 0, pbrParts = 0;
for (const f of readdirSync(join(ROOT, 'site/models')).filter((n) => n.endsWith('.glb'))) {
  const parts = partsOf(f);
  if (!parts.length) continue;
  files += 1;
  for (const { role, hex } of parts) { check(P.FINISHES[P.finishOf(role, hex)], `${f}: ${role} ${hex} has no finish`); pbrParts += 1; }
}
check(files >= 60, `the shipped files were read (${files} with their own colours)`);

// --- 3. the shader --------------------------------------------------------------------------------
for (const finish of Object.keys(P.FINISHES)) {
  const out = P.patchShaders(THREE.ShaderLib.standard.vertexShader, THREE.ShaderLib.standard.fragmentShader, finish);
  check(out.missing.length === 0, `the ${finish} shader found every hook (missing: ${out.missing.join(', ')})`);
  for (const u of ['uSrFold', 'uSrFoldScale', 'uSunDir', 'uShineCentre', 'uShadeRadius', 'uFlood', 'uSrFill']) {
    check(new RegExp(`uniform \\w+ ${u};`).test(out.fragment), `the ${finish} shader declares ${u}`);
  }
  check(out.vertex.includes('vSrPos = transformed;') && out.vertex.indexOf('vSrPos = transformed;') > out.vertex.indexOf('#include <begin_vertex>'), `the ${finish} vertex shader writes the part's own position after begin_vertex`);
  check(out.fragment.indexOf('#include <opaque_fragment>') > out.fragment.indexOf('outgoingLight = mix( night'), `the ${finish} shader takes the world's shadow before the frame is written`);
  check(/#include <lights_fragment_maps>[\s\S]*radiance \+= srFill/.test(out.fragment), `the ${finish} shader adds the environment after three.js's own`);
  check(P.FINISHES[finish].grid === out.fragment.includes('uSrGridScale ;') || P.FINISHES[finish].grid === out.fragment.includes('* uSrGridScale;'), `the ${finish} shader has the cell grid exactly when its finish does`);
}
// Every uniform the material hands the shader is one models.js keeps (the same Sun, world and lamp).
const shared = M.lightUniforms();
for (const k of ['uSunDir', 'uRimSun', 'uRimShade', 'uShineCentre', 'uShineRadius', 'uShineCol', 'uShadeRadius', 'uNightCol', 'uFlood', 'uSunRim', 'uAirH']) {
  check(shared[k] && 'value' in shared[k], `models.js shares ${k}`);
}
{
  const m = P.pbrMaterial('#c9a24a', 'gold-foil', { foldScale: 3, gridScale: 9 });
  check(m.isMeshStandardMaterial && m.metalness === P.FINISHES['gold-foil'].metalness, 'a gold blanket is a MeshStandardMaterial with its finish\'s metalness');
  check(m.defines && 'SR_FOLDS' in m.defines, 'a blanket has folds');
  check(!m.envMap, 'no environment map');
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  m.onBeforeCompile(shader);
  check(shader.uniforms.uSunDir === shared.uSunDir, 'the material reads the very uniform models.js writes the Sun into');
  check(shader.uniforms.uSrFoldScale.value === 3, 'the fold period reaches the shader');
  check(m.customProgramCacheKey() !== P.pbrMaterial('#2e4e8c', 'cells', {}).customProgramCacheKey(), 'folds and cells compile to different programs');
  check(m.customProgramCacheKey() === P.pbrMaterial('#e3c045', 'gold-foil', {}).customProgramCacheKey(), 'two gold blankets share one program');
}

// --- 4. the tiers and the swap ----------------------------------------------------------------------
{
  P.setModelLook('auto');
  M.setSurfaceTerms(false);
  check(P.wantPbr() === false, 'tier 0 (or the latch) wears the toon look');
  M.setSurfaceTerms(true);
  check(P.wantPbr() === true, 'tier 1 and up wear the physically based look');
  const toon = new THREE.MeshToonMaterial();
  const pbr = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), toon);
  let made = 0;
  P.pairLooks(mesh, toon, () => { made += 1; return pbr; });
  check(mesh.material === pbr, 'a part put on while tier 1 is in force wears the physically based look at once');
  const mesh2 = new THREE.Mesh(new THREE.BufferGeometry(), toon);
  P.pairLooks(mesh2, toon, () => { made += 1; return new THREE.MeshStandardMaterial(); });
  check(made === 1 && mesh2.material === pbr, 'a second part of the same colour and surface shares the twin');
  M.setSurfaceTerms(false);
  pbr.opacity = 0.4; pbr.transparent = true;
  mesh.material.onBeforeRender(null, null, null, null, mesh, null);
  check(mesh.material === toon && toon.opacity === 0.4 && toon.transparent === true, 'the latch puts the toon look back, carrying the fade');
  P.setModelLook('pbr');
  mesh.material.onBeforeRender(null, null, null, null, mesh, null);
  check(mesh.material === pbr, 'a tool can hold the physically based look');
  check(P.twinOf(pbr) === toon && P.twinOf(toon) === pbr, 'each knows its twin');
  P.setModelLook('auto');
  M.setSurfaceTerms(false);
}

// --- 5. the contract -------------------------------------------------------------------------------
const code = SRC.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
for (const word of ['WebGLRenderTarget', 'PMREMGenerator', 'CubeCamera', 'EffectComposer', 'RenderPass', 'envMap', 'scene.environment']) {
  check(!code.includes(word), `scene/pbr.js uses ${word}: the environment is the material's own sum (internal #967; tests/test_contract.mjs)`);
}
{
  // The JS twin of the shader's mirror: full inside the disc, none far outside it, wider when rougher.
  const alpha = Math.asin(0.88);
  check(P.worldMirrorWeight(1, alpha, 0.2) > 0.99, 'a mirror looking at the middle of the world sees it');
  check(P.worldMirrorWeight(-1, alpha, 0.2) < 0.01, 'a mirror looking away from the world sees black space');
  const edge = Math.cos(alpha + 0.25);
  check(P.worldMirrorWeight(edge, alpha, 0.8) > P.worldMirrorWeight(edge, alpha, 0.1), 'a rough surface blurs the world\'s edge outward');
  check(SRC.includes("'    float spread = 0.12 + 1.1 * material.roughness;',") && /const spread = 0\.12 \+ 1\.1 \*/.test(SRC), 'the shader and its twin blur by the same spread');
  check(P.FILL > 0 && P.FILL < 0.2, `the fill is a small light, not a second Sun (${P.FILL})`);
}

// --- 6. the folds ----------------------------------------------------------------------------------
{
  const n = 64;
  const a = P.crinkleField(n, 30);
  const b = P.crinkleField(n, 30);
  check(a.length === n * n * 2 && a.every((v, i) => v === b[i]), 'the height field is the same every time');
  const at = (x, y, c) => a[((y % n) * n + (x % n)) * 2 + c];
  let seam = 0, inner = 0;
  for (let y = 0; y < n; y++) { seam += Math.abs(at(0, y, 1) - at(n - 1, y, 1)); inner += Math.abs(at(n / 2, y, 1) - at(n / 2 - 1, y, 1)); }
  check(seam <= inner * 2 + n, `the patchiness wraps round without a seam (${seam} against ${inner} inside)`);
  let rs = 0, ri = 0;
  for (let y = 0; y < n; y++) { rs += Math.abs(at(0, y, 0) - at(n - 1, y, 0)); ri += Math.abs(at(n / 2, y, 0) - at(n / 2 - 1, y, 0)); }
  check(rs <= ri * 2.5 + n * 2, `the folds wrap round without a seam (${rs} against ${ri} inside)`);
  check(!/Math\.random/.test(code), 'no Math.random');
}

// --- 7. the wiring ---------------------------------------------------------------------------------
{
  const RM = readFileSync(join(JS, 'scene/realmodels.js'), 'utf8');
  check(/import\('\.\/pbr\.js'\)/.test(RM) && /import\('\.\.\/data\/modellooks\.js'\)/.test(RM), 'realmodels.js fetches pbr.js and the looks table with the loader');
  check(!/^import [^(]*from '\.\/pbr\.js'/m.test(RM), 'realmodels.js imports pbr.js only when a file is loaded');
  check(/applyToon\(scene, entry\.colour, null, entry\.file\)/.test(RM), 'a file is restyled knowing which file it is, for its stated look');
  const { MODEL_LOOKS } = await import(pathToFileURL(join(JS, 'data/modellooks.js')).href);
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const stated = [...yaml.matchAll(/^ {2}- \{id: [\w-]+, file: site\/models\/([\w.-]+\.glb),.*?\blook: (\w+)/gm)];
  check(stated.length === Object.keys(MODEL_LOOKS).length, `the looks table has every row that states a look (${Object.keys(MODEL_LOOKS).length} of ${stated.length})`);
  for (const [, file, look] of stated) check(MODEL_LOOKS[file] === look, `${file}: the table says ${MODEL_LOOKS[file]}, the row ${look}`);
}

if (problems.length) {
  console.error(`pbr FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`pbr ok: the look per file, ${Object.keys(P.FINISHES).length} finishes over ${pbrParts} coloured parts of ${files} files, the shader's hooks, the tiers and the swap, no render target, the folds tile`);
