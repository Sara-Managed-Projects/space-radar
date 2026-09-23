#!/usr/bin/env node
// Check every module in site/js against tests/test_contract.mjs.
//
// Six agents wrote these modules concurrently against one written contract. The failure mode that
// costs the most is not a bad algorithm -- it is two modules that disagree about a name, which is
// invisible until the browser loads and something is undefined. This finds that on the command
// line instead.
//
// Modules that touch `document`, `window` or `localStorage` at import time cannot be imported in
// node; they are checked structurally by parsing their export statements instead. A module that
// touches the DOM at MODULE SCOPE (rather than inside a function) is itself a defect and is
// reported as one.
//
// Run: node tests/test_contract.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// module path -> exports the contract requires
const CONTRACT = {
  'clock.js': ['clock'],
  'propagate/frames.js': ['gmst', 'eciToEcef', 'ecefToEci', 'geodeticToEcef', 'ecefToGeodetic', 'lookAngles', 'toStage'],
  'propagate/index.js': ['propagate', 'PROPAGATORS'],
  'data/sources.js': ['SOURCES', 'load', 'status'],
  'data/parsers.js': ['parseCelestrakGP', 'parseLaunches', 'parseComets', 'parseDsn', 'horizonsSamples', 'parseHorizonsVectors', 'parseNeoApproaches'],
  'data/sample.js': ['sampleAsteroids', 'sampleDeepSpace', 'sampleOddities'],
  'data/oddities.js': ['ODDITIES', 'ODDITIES_OBSERVED_ON'],
  'data/tours.js': ['TOURS', 'TOUR_DEFAULTS', 'TOUR_GROUPS'],
  'data/layers.js': ['LAYERS', 'loadLayer'],
  'data/events.registry.js': ['EVENT_TYPES'],
  'data/events.js': ['buildEvents', 'nextEvent', 'localCircumstances'],
  'scene/renderer.js': ['createRenderer'],
  'scene/stage.js': ['stage'],
  'scene/worlds.js': ['createWorlds'],
  'scene/earth.js': ['createEarth', 'updateEarthEclipse'],
  // Spec 0037: one formula for the shadow, in JS for the test and as GLSL for both shaders.
  'scene/eclipse.js': ['obscuration', 'surfaceObscuration', 'discOverlap', 'eclipseLikely', 'ECLIPSE_GLSL', 'SUN_RADIUS_KM', 'MOON_RADIUS_KM'],
  'scene/starfield.js': ['createStarfield'],
  'scene/glyphs.js': ['createGlyphLayer'],
  'scene/models.js': ['modelFor'],
  'scene/camera.js': ['createCameraRig'],
  'sky/passes.js': ['predictPasses'],
  'sky/skyview.js': ['createSkyView'],
  'ui/cards.js': ['showCard', 'hideCard'],
  'ui/controls.js': ['createControls'],
  'ui/trippicker.js': ['createTripPicker', 'groupTrips', 'nextTripId', 'nextTripOrder', 'tripOrder'],
  'ui/trip.js': ['createTrip'],
  'ui/tripframe.js': ['createTripFrame', 'shapeLine', 'eclipseLine', 'stopTimeLine'],
  // Spec 0034: the one black over the canvas, and the star-stretch both star draws share.
  'ui/veil.js': ['createVeil', 'VEIL_MS', 'REDUCED_VEIL_MS'],
  // Spec 0035: sound, silent until a gesture. The engine makes no AudioContext at import or at
  // construction; beds and stings fetch on first use only.
  'audio/engine.js': ['createAudio', 'readFlag', 'writeFlag', 'STORE_KEY', 'VOLUME'],
  'audio/load.js': ['createLoader'],
  'audio/beds.js': ['createBeds', 'XFADE_S'],
  'audio/stings.js': ['createStings', 'DUCK', 'DUCK_IN_S', 'DUCK_BACK_S', 'STING_LEVEL'],
  'audio/pick.js': ['pickFormat', 'rungOf', 'RUNGS', 'OPUS_TYPE', 'AAC_TYPE'],
  'data/audio.js': ['AUDIO'],
  'ui/sound.js': ['soundButton', 'soundPanel', 'creditsText'],
  'scene/stretch.js': ['STRETCH_PX', 'stretchUniforms', 'writeStretch'],
  'scene/stars3d.js': ['createStars3d', 'STRETCH_PX'],
  // The one owner of the URL hash (spec 0032): main.js, ui/controls.js and ui/trip.js all write
  // through it, and a second dialect is the bug it was written to end.
  'ui/urlstate.js': ['KEYS', 'VERSION', 'read', 'write', 'clear', 'stopIndex', 'readMoment', 'writeMoment'],
  // Share (spec 0033): one control in two hosts, and the postcard it imports on first use.
  'ui/share.js': ['shareUrl', 'shareState', 'shareLink', 'savePicture', 'shareButton', 'pictureButton', 'toast'],
  'ui/postcard.js': ['composePostcard', 'composeCard', 'postcardCaption', 'savePostcard', 'ogPicture', 'PC_W', 'PC_H', 'BAND_H'],
  'ui/status.js': ['createStatus'],
  'ui/github.js': ['createGitHubMark'],
  'copy/en.js': ['COPY', 'compare'],
};

const problems = [];
const notes = [];

function exportsOf(src) {
  const names = new Set();
  // export function foo / export async function foo / export const foo / export class foo
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export { a, b as c }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const as = bit.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      names.add(as ? as[1] : bit.split(/\s+/)[0]);
    }
  }
  if (/export\s+default/.test(src)) names.add('default');
  return names;
}

// 1. every contract file exists, parses, and exports what it must
for (const [rel, required] of Object.entries(CONTRACT)) {
  const path = join(JS, rel);
  if (!existsSync(path)) { problems.push(`MISSING  ${rel}`); continue; }
  try {
    // `node --check <file>` parses a .js file as CommonJS, which ACCEPTS things a browser's
    // module parser rejects -- a stray backtick inside a template literal among them. Feeding the
    // source in on stdin with --input-type=module is the parse the browser actually performs.
    // The first version of this harness used the weaker check and passed a file the browser
    // refused to load, which is a guard reporting wrongly: worse than no guard.
    execFileSync('node', ['--input-type=module', '--check'], { input: readFileSync(path), stdio: 'pipe' });
  } catch (e) {
    problems.push(`SYNTAX   ${rel}: ${String(e.stderr).split('\n').slice(0, 3).join(' ').trim()}`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  const have = exportsOf(src);
  const missing = required.filter((n) => !have.has(n));
  if (missing.length) problems.push(`EXPORTS  ${rel}: contract requires ${missing.join(', ')}`);
}

// 2. every relative import resolves to a file that exports that name
const allFiles = [];
(function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.js')) allFiles.push(p);
  }
})(JS);

for (const file of allFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(JS.length + 1);

  for (const m of src.matchAll(/import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const [, clause, spec] = m;
    if (!spec.startsWith('.')) {
      problems.push(`IMPORT   ${rel}: bare specifier '${spec}' -- there is no bundler and no import map`);
      continue;
    }
    const target = join(dirname(file), spec);
    if (!existsSync(target)) { problems.push(`IMPORT   ${rel}: '${spec}' does not exist`); continue; }
    if (spec.includes('/vendor/')) continue;  // vendored bundles are minified; trust them
    const targetExports = exportsOf(readFileSync(target, 'utf8'));
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const bit = part.trim();
        if (!bit) continue;
        const name = bit.split(/\s+as\s+/)[0].trim();
        if (name && !targetExports.has(name)) {
          problems.push(`IMPORT   ${rel}: imports { ${name} } from '${spec}', which does not export it`);
        }
      }
    }
  }

  // 3. hard rules from the contract
  if (/\bDate\.now\(\)/.test(src) && !/clock\.js$/.test(rel)) {
    notes.push(`Date.now() in ${rel} -- allowed only for real elapsed time, never for drawn state`);
  }
  if (/#(?:[Ff]{2}0000|[Ee]f4444|[Dd]c2626|[Rr]ed\b)/.test(src) || /\bcolor:\s*red\b/.test(src)) {
    problems.push(`PALETTE  ${rel}: red is not in the palette`);
  }
  // DOM at module scope: a top-level document/window reference outside a function body
  const moduleScope = src.replace(/(?:function[^{]*|=>\s*)\{[\s\S]*?\n\}/g, '');
  if (/^\s*(?:const|let|var)\s+\w+\s*=\s*(?:document|window)\./m.test(moduleScope)) {
    notes.push(`DOM at module scope in ${rel} -- it will throw if imported before the DOM exists`);
  }
}

// 3b. every rocket shape the registry offers actually builds, and fits its triangle budget.
//
// registry/models.yaml has a `budget_tris` for rocket-upper-stage and NOTHING has ever checked
// it -- that row and the BUILDERS table were related by discipline alone. A rocket went from 5
// meshes to about 25 in this change, and Vulcan VC6L (six boosters), Soyuz (four cones and its
// own bells) and Super Heavy's engine ring are the three that could blow it. So this builds
// EVERY row and measures. A budget nobody measures is a comment.
{
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const line = yaml.split('\n').find((l) => l.includes('id: rocket-upper-stage')) || '';
  const budget = Number((line.match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
  if (!budget) {
    problems.push('BUDGET   registry/models.yaml has no budget_tris for rocket-upper-stage');
  } else {
    try {
      const { modelFor, modelVariants, disposeModels } = await import(
        join(JS, 'scene/models.js')
      );
      const variants = modelVariants().rocket;
      if (variants.length < 2) {
        problems.push(
          `BUDGET   BUILDERS.rocket has ${variants.length} variant(s); the registry rows are not wired in`
        );
      }
      let worst = { id: null, tris: 0 };
      for (const id of variants) {
        const obj = modelFor('rocket', id);
        let tris = 0;
        let meshes = 0;
        obj.traverse((n) => {
          if (!n.geometry) return;
          meshes += 1;
          const g = n.geometry;
          tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
        });
        if (tris > budget) {
          problems.push(`BUDGET   rocket:${id} is ${Math.round(tris)} tris, over budget_tris ${budget}`);
        }
        if (meshes > 40) problems.push(`BUDGET   rocket:${id} is ${meshes} meshes; the pool budget is ~30`);
        if (tris > worst.tris) worst = { id, tris };
        disposeModels(obj);
      }
      notes.push(
        `${variants.length} rocket shapes build; worst is ${worst.id} at ` +
          `${Math.round(worst.tris)} of ${budget} tris`
      );
    } catch (e) {
      problems.push(`BUDGET   could not build the rocket shapes: ${String(e && e.message)}`);
    }
  }
}

// 3bb. every SHIPPED MODEL FILE fits the triangle budget its registry row claims.
//
// 3b measures the procedural shapes, which are a few hundred triangles each. Nothing has ever
// measured the .glb files, which are the other 99 % -- and on 2026-09-12 that turned out to be
// 783 099 triangles across 38 files, with poes.glb alone at 116 517 and 1 324 kB for three NOAA
// satellites. The `kb:` field was the only number in those rows, and a kilobyte count says
// nothing about what the GPU is asked to do: meshopt compresses a CAD model to a tenth of its
// size and then hands the card every one of its triangles.
//
// READ STRAIGHT OUT OF THE FILE, WITH NO DEPENDENCIES. A GLB is a 12-byte header and then chunks;
// chunk 0 is the glTF JSON, and the JSON alone carries every accessor's `count`. So the triangle
// count is arithmetic on the JSON -- no decoder, no three.js, no npm install in CI. Only the
// BUFFER is meshopt-compressed, and this never touches it.
{
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const rows = yaml.split('\n').filter((l) => /file: site\/models\/[A-Za-z0-9_.-]+\.glb/.test(l));
  const MODE_TRIS = { 4: (n) => n / 3, 5: (n) => Math.max(n - 2, 0), 6: (n) => Math.max(n - 2, 0) };

  /** The triangle count of one .glb, from its JSON chunk. Null when the file cannot be read. */
  const trianglesIn = (path) => {
    const buf = readFileSync(path);
    if (buf.length < 20 || buf.toString('utf8', 0, 4) !== 'glTF') return null;
    const jsonLen = buf.readUInt32LE(12);
    if (buf.toString('utf8', 16, 20) !== 'JSON') return null;
    const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
    const accessors = gltf.accessors || [];
    let tris = 0;
    for (const mesh of gltf.meshes || []) {
      for (const prim of mesh.primitives || []) {
        // `mode` defaults to 4 (TRIANGLES) when absent -- glTF 2.0 section 3.7.2.1. Anything that
        // is not a triangle topology (points, lines, fans) contributes what its mode says, and
        // an unknown mode contributes nothing rather than a wrong number.
        const mode = prim.mode === undefined ? 4 : prim.mode;
        const fn = MODE_TRIS[mode];
        if (!fn) continue;
        const acc = prim.indices !== undefined ? accessors[prim.indices] : accessors[(prim.attributes || {}).POSITION];
        if (!acc || typeof acc.count !== 'number') continue;
        tris += fn(acc.count);
      }
    }
    return Math.round(tris);
  };

  // One cap over all of them, so a NEW model cannot be added at 116 517 triangles by writing
  // itself a 116 517 budget. Raising this is a deliberate edit with a reason, which is the point.
  const CAP = 20000;
  let total = 0;
  let worst = { id: null, tris: 0 };
  let counted = 0;
  for (const row of rows) {
    const id = (row.match(/id: ([A-Za-z0-9_-]+)/) || [])[1] || '?';
    const rel = (row.match(/file: (site\/models\/[A-Za-z0-9_.-]+\.glb)/) || [])[1];
    const budget = Number((row.match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
    const path = join(ROOT, rel);
    if (!existsSync(path)) { problems.push(`MODEL    ${rel} has a registry row and does not ship`); continue; }
    if (!budget) { problems.push(`MODEL    ${id} has no budget_tris; a model nobody measures is a guess`); continue; }
    if (budget > CAP) { problems.push(`MODEL    ${id} claims budget_tris ${budget}, over the ${CAP} cap for one file`); }
    const tris = trianglesIn(path);
    if (tris === null) { problems.push(`MODEL    ${rel} is not a readable GLB`); continue; }
    counted += 1;
    total += tris;
    if (tris > budget) {
      problems.push(`MODEL    ${id} is ${tris} tris, over budget_tris ${budget} -- run scripts/decimate-model.mjs`);
    }
    // A `kb:` that drifts from the file is a claim CREDITS.md then repeats. Two kB of slack,
    // because the row is written by a human reading a rounded number.
    const kb = Number((row.match(/kb: (\d+)/) || [])[1] || 0);
    const realKb = Math.round(statSync(path).size / 1024);
    if (kb && Math.abs(kb - realKb) > 2) {
      problems.push(`MODEL    ${id} says kb: ${kb} and the file is ${realKb} kB`);
    }
    if (tris > worst.tris) worst = { id, tris };
  }
  notes.push(
    `${counted} model files ship ${total} triangles; heaviest is ${worst.id} at ${worst.tris} of a ${CAP} cap`
  );
}

// 3bbn. A SHIPPED MODEL WITH NO NORMALS IS A FLAT CUT-OUT, and one of them was.
//
// site/models/terra.glb ships two primitives carrying POSITION and TEXCOORD_0 and nothing else.
// A MeshToonMaterial with no normals has nothing to sample its ramp against, so Terra was drawn
// as a single flat tone while the other forty-three models were shaded -- silently, for as long as
// the file has shipped. Nothing here would have noticed: it is inside the triangle budget, the kB
// matches, it loads without a warning and `realModelFor` maps it correctly. It was found by
// rendering all forty-four at hero size and looking.
//
// realmodels.js now computes flat normals at load time for any mesh missing them, which fixes
// Terra and every file added later at no cost in bytes. This is the guard for the guard, in both
// directions: the function must do what it claims, and the shipped set must not quietly grow more
// files that need it -- regenerating one through scripts/decimate-model.mjs is three times smaller
// than the same geometry split at load time, so a NEW offender is a pipeline step somebody skipped
// rather than something to leave to the runtime.
{
  const KNOWN_WITHOUT_NORMALS = new Set(['terra.glb']);
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const files = [...new Set(yaml.match(/site\/models\/[A-Za-z0-9_.-]+\.glb/g) || [])];
  const missing = [];
  for (const rel of files) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    const buf = readFileSync(path);
    if (buf.length < 20 || buf.toString('utf8', 0, 4) !== 'glTF') continue;
    const jsonLen = buf.readUInt32LE(12);
    if (buf.toString('utf8', 16, 20) !== 'JSON') continue;
    const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
    // `!pr.attributes.NORMAL` is wrong and was written that way first: an accessor INDEX of 0 is
    // falsy, so eighteen files that carry normals in accessor 0 reported as carrying none.
    const bare = (gltf.meshes || []).some((m) =>
      (m.primitives || []).some((pr) => (pr.attributes || {}).NORMAL === undefined));
    if (bare) missing.push(rel.split('/').pop());
  }
  for (const name of missing) {
    if (KNOWN_WITHOUT_NORMALS.has(name)) continue;
    problems.push(
      `MODEL    ${name} ships a primitive with no NORMAL. The loader will compute flat normals ` +
        `for it, which costs three vertices per triangle in memory -- regenerate it with ` +
        `scripts/decimate-model.mjs instead, which does the same thing offline and smaller.`
    );
  }
  for (const name of KNOWN_WITHOUT_NORMALS) {
    if (!missing.includes(name)) {
      problems.push(`MODEL    ${name} no longer needs the normals guard; take it off the known list`);
    }
  }

  // And the guard itself, broken on purpose: strip the normals off a box and require them back,
  // FLAT -- the three corners of one triangle sharing one normal. computeVertexNormals() on an
  // indexed geometry averages instead, which rounds off every hard edge on what is usually a box,
  // so "it has normals again" is not enough to check.
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { ensureNormals } = await import(join(JS, 'scene/realmodels.js'));
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.deleteAttribute('normal');
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    const root = new THREE.Group();
    root.add(mesh);
    const fixed = ensureNormals(root);
    const n = mesh.geometry.attributes.normal;
    if (fixed !== 1 || !n) {
      problems.push(`NORMALS  ensureNormals() left a geometry without normals (fixed ${fixed})`);
    } else {
      const same = (i, j) =>
        Math.abs(n.getX(i) - n.getX(j)) < 1e-6 &&
        Math.abs(n.getY(i) - n.getY(j)) < 1e-6 &&
        Math.abs(n.getZ(i) - n.getZ(j)) < 1e-6;
      if (mesh.geometry.index) problems.push('NORMALS  ensureNormals() left the geometry indexed, so the normals are averaged, not flat');
      else if (!same(0, 1) || !same(1, 2)) problems.push('NORMALS  ensureNormals() produced smoothed normals; a box came back with rounded edges');
      else if (same(0, 3) && same(0, 6)) problems.push('NORMALS  every face of the box came back with the SAME normal, which is not normals');
      else notes.push(`the normals guard covers ${missing.length} shipped file(s) and gives a box flat faces`);
    }
  } catch (e) {
    problems.push(`NORMALS  could not check the normals guard: ${String(e && e.message)}`);
  }
}

// 3bbo. A SHIPPED MODEL WHOSE NORMALS FACE INTO ITS OWN SURFACE IS LIT FROM BEHIND, and four were.
//
// The toon material draws front faces only and shades by the stored normal. Measured 2026-09-18
// across every shipped file: in asteroid-bennu, soho, hinode and seastar, 96-100 % of vertex
// normals faced against the winding of the very triangle they belong to. The faces were drawn and
// every one was lit from the wrong side, so each rendered as a flat silhouette in the ambient fill
// colour -- a blue-grey shape with no sun on it -- for as long as it had shipped. A dull model looks
// like a dull model, not like a bug, which is why nothing had noticed: 3bbn above checks that
// normals EXIST, and these had them.
//
// Every file that went through scripts/decimate-model.mjs is at 0 %, because that script recomputes
// normals from the winding. These four were only re-encoded and kept their authors' normals.
// scripts/fix-model-normals.mjs turned them round, per connected piece.
//
// MEASURED ON WHAT THE APP LOADS: three's own GLTFLoader with the vendored meshopt decoder, in world
// space, so quantization's node transform is applied exactly as it is on screen. The test is the
// normal against its own triangle's winding, which works on open CAD meshes where "points away from
// the centre" means nothing. A few per cent is ordinary smoothing at a hard edge and thin panels
// whose two sides share vertices -- aura is the worst at 12.6 % and renders sunlit -- so the line
// is drawn at a third, far above that and far below the 96 % of the files that were wrong.
{
  globalThis.self = globalThis; // GLTFLoader reads self.URL for images these files do not carry
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { GLTFLoader } = await import(join(ROOT, 'site/vendor/GLTFLoader.js'));
  const { MeshoptDecoder } = await import(join(ROOT, 'site/vendor/meshopt_decoder.module.js'));
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  // Node has no image decoder, so every texture in a shipped file fails to load here -- the palette
  // strips realmodels.js DOES sample in a browser included. That is fine for what this section
  // measures (geometry), but the failures arrive asynchronously, AFTER parse() resolves, so
  // silencing console.warn around the parse let all of them through: eighteen lines of noise in
  // every CI log. It was the wrong channel as well -- GLTFLoader reports this with console.ERROR.
  // Only that one message is dropped, for the rest of the run; every other error still prints.
  const error = console.error;
  console.error = (...a) => { if (!/Couldn't load texture/.test(String(a[0]))) error(...a); };
  const parse = async (buf) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new Promise((res, rej) => loader.parse(ab, '', res, rej));
  };
  // Fraction of vertex normals that face against the triangle they belong to, world space.
  const against = (scene) => {
    scene.updateMatrixWorld(true);
    let ok = 0, bad = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const f = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.normal) return;
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index;
      nm.getNormalMatrix(o.matrixWorld);
      // A mirrored transform turns the winding round, and three culls accordingly.
      const mirror = o.matrixWorld.determinant() < 0 ? -1 : 1;
      const T = (I ? I.count : P.count) / 3;
      for (let t = 0; t < T; t += 1) {
        const i = [0, 1, 2].map((k) => (I ? I.getX(t * 3 + k) : t * 3 + k));
        a.fromBufferAttribute(P, i[0]).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(P, i[1]).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(P, i[2]).applyMatrix4(o.matrixWorld);
        f.subVectors(b, a).cross(c.sub(a));
        if (f.lengthSq() === 0) continue;
        for (const v of i) {
          n.fromBufferAttribute(N, v).applyMatrix3(nm);
          if (mirror * n.dot(f) >= 0) ok += 1; else bad += 1;
        }
      }
    });
    return ok + bad ? bad / (ok + bad) : 0;
  };
  const LIMIT = 1 / 3;
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const files = [...new Set(yaml.match(/site\/models\/[A-Za-z0-9_.-]+\.glb/g) || [])];
  let measured = 0, worst = { name: '-', frac: 0 };
  for (const rel of files) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    const gltf = await parse(readFileSync(path));
    const frac = against(gltf.scene);
    measured += 1;
    const name = rel.split('/').pop();
    if (frac > worst.frac) worst = { name, frac };
    if (frac > LIMIT) {
      problems.push(
        `MODEL    ${name}: ${(frac * 100).toFixed(1)} % of its normals face INTO their own triangles, so the ` +
          `front-face-only toon material lights it from behind and it renders as a flat blue-grey silhouette. ` +
          `Turn them round with scripts/fix-model-normals.mjs.`
      );
    }
  }
  // A SMALL BODY IS ONE PIECE. NASA's 3D Printing Eros and Itokawa are each cut in half and laid
  // out as two pieces for a print bed; drawn, that is two half-asteroids side by side in space.
  // Welded on position, every shipped asteroid must be a single connected surface.
  const pieces = (scene) => {
    const key = new Map();
    const parent = [];
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const v = new THREE.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const P = o.geometry.attributes.position, I = o.geometry.index;
      const id = [];
      for (let k = 0; k < P.count; k += 1) {
        v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld);
        const s = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
        if (!key.has(s)) { key.set(s, parent.length); parent.push(parent.length); }
        id.push(key.get(s));
      }
      const T = (I ? I.count : P.count) / 3;
      for (let t = 0; t < T; t += 1) {
        const [a, b, c] = [0, 1, 2].map((k) => id[I ? I.getX(t * 3 + k) : t * 3 + k]);
        parent[find(b)] = find(a);
        parent[find(c)] = find(a);
      }
    });
    return new Set(parent.map((_, i) => find(i))).size;
  };
  const rockRows = yaml.split('\n').filter((l) => /file: site\/models\/[^,]+\.glb/.test(l) && /class: asteroid\b/.test(l));
  for (const line of rockRows) {
    const rel = line.match(/file: (site\/models\/[^,]+\.glb)/)[1];
    if (!existsSync(join(ROOT, rel))) continue;
    const n = pieces((await parse(readFileSync(join(ROOT, rel)))).scene);
    if (n !== 1) {
      problems.push(`MODEL    ${rel.split('/').pop()} is ${n} separate pieces, not one body -- a model cut up for 3D printing draws as fragments in space`);
    }
  }

  // Broken on purpose: the same measurement on a box whose normals are negated must fail, or the
  // measurement is not measuring anything.
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const good = against(box);
  const nArr = box.geometry.attributes.normal.array;
  for (let k = 0; k < nArr.length; k += 1) nArr[k] = -nArr[k];
  const flipped = against(box);
  if (!(good === 0 && flipped === 1)) {
    problems.push(`NORMALS  the inside-out test cannot tell a box from an inside-out box (${good} vs ${flipped})`);
  }
  if (!problems.some((p) => p.includes('face INTO') || p.startsWith('NORMALS'))) {
    notes.push(`${measured} shipped models face outward; the loosest is ${worst.name} at ${(worst.frac * 100).toFixed(1)} % (limit ${Math.round(LIMIT * 100)} %)`);
  }
}

// 3bc. every procedural variant can actually be ASKED FOR by something.
//
// registry/models.yaml has a row per procedural shape and each row's `for:` says who it is meant
// for. Nothing checked that anyone could reach it, and two could not: `satellite-flat` claimed
// `for: {family: flat-packed}` and `satellite-weather` claimed `for: {family: weather}`, and there
// is no `family` routing anywhere in the app -- no record carries one and no code reads one. They
// were shapes nobody could request, described by a field describing a mechanism that does not
// exist.
//
// THE ROUTES THAT CAN ASK FOR A VARIANT, and they are the whole list:
//   * `build:` in scene/realmodels.js -- what heroes.js passes for a matched record
//   * `meta.modelVariant` -- set by data/parsers.js from registry/rockets.yaml, by data/sample.js
//     and data/attached.js from registry/oddities.yaml, and by data/layers.js for surface sites
//   * the class DEFAULT, which is reached by every record of that class with no variant at all
//
// This checks the two classes whose variants come only from realmodels.js. Rockets, oddities and
// sites are covered by 3b and 3d, which build every registry row.
{
  const REALMODELS = readFileSync(join(JS, 'scene/realmodels.js'), 'utf8');
  const asked = new Set([...REALMODELS.matchAll(/build:\s*'([^']+)'/g)].map((m) => m[1]));
  // ...and an ALIAS OF THE DEFAULT is reachable whatever its key says, because every record of
  // that class with no variant lands on it. `satellite.comms` and `station.iss` are both just
  // second names for their class's default builder, and reporting those would be noise. Read from
  // the BUILDERS table's own text, so the comparison is the function each key actually names.
  const src = readFileSync(join(JS, 'scene/models.js'), 'utf8');
  const table = src.slice(src.indexOf('const BUILDERS = {'));
  /** The builder FUNCTION NAME a class's variant maps to, read from the BUILDERS table's own text. */
  const builderOf = (klass, variant) => {
    const row = new RegExp(klass + ': \\{([^}]*)\\}').exec(table);
    if (!row) return null;
    const key = variant.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // A leading space so a key sitting at position 0 still has a boundary in front of it.
    const m = new RegExp("[\\s,{]'?" + key + "'?\\s*:\\s*([A-Za-z0-9_]+)").exec(' ' + row[1]);
    return m ? m[1] : null;
  };
  try {
    const { modelVariants } = await import(join(JS, 'scene/models.js'));
    const variants = modelVariants();
    const orphans = [];
    for (const klass of ['satellite', 'station']) {
      const dflt = builderOf(klass, 'default');
      for (const v of variants[klass] || []) {
        if (v === 'default' || asked.has(v)) continue;
        if (dflt && builderOf(klass, v) === dflt) continue; // a second name for the default
        orphans.push(`${klass}:${v}`);
      }
    }
    if (orphans.length) {
      problems.push(
        `VARIANT  nothing can ask for ${orphans.join(', ')} -- no build: in realmodels.js names ` +
          `${orphans.length > 1 ? 'them' : 'it'}, and there is no other route to a satellite or station variant`
      );
    }
    notes.push(
      `${asked.size} variants are asked for by name in realmodels.js; every satellite and station ` +
        `builder is reachable`
    );
  } catch (e) {
    problems.push(`VARIANT  could not check builder reachability: ${e.message}`);
  }
}

// 3c. a launch may never claim a shape it did not match. `stands_for: variant` on a row is a
// claim about ONE vehicle; nine such rows also list a family string, so a launch whose full_name
// nobody has listed yet lands on one of them and the card would say "drawn from published
// dimensions for Angara 1.2" about an Angara A5. The cap lives in data/parsers.js, and this is
// the assertion that it is still there -- the feed produces new spellings under old families
// every few weeks ("Ariane 62 Block 2", "Starship V3"), so this fires the day it matters.
{
  try {
    const { parseLaunches } = await import(join(JS, 'data/parsers.js'));
    const launch = (full_name, families, provider) => ({
      id: `t-${full_name}`,
      net: '2026-10-01T00:00:00Z',
      rocket: { configuration: { full_name, families: families.map((name) => ({ name })) } },
      launch_service_provider: { name: provider },
      pad: { latitude: '28.5', longitude: '-80.5', name: 'p', location: { name: 'l' } },
    });
    const metaOf = (r) => parseLaunches({ results: [r] }).launches[0].meta;

    const exact = metaOf(launch('Falcon 9 Block 5', ['Falcon', 'Falcon 9'], 'SpaceX'));
    if (exact.drawsAs !== 'variant' || exact.drawnVia !== 'full_name') {
      problems.push(`HONESTY  a full_name match should still say variant; got ${exact.drawsAs}/${exact.drawnVia}`);
    }
    const byFamily = metaOf(launch('Falcon 9 Block 6', ['Falcon', 'Falcon 9'], 'SpaceX'));
    if (byFamily.drawnVia !== 'family') {
      problems.push(`HONESTY  'Falcon 9 Block 6' should match by family; got ${byFamily.drawnVia}`);
    } else if (byFamily.drawsAs === 'variant') {
      problems.push(
        `HONESTY  a family match claims "drawn from published dimensions for ${byFamily.drawnName}"`
      );
    }
    const byProvider = metaOf(launch('Orbex Prime', [], 'Orbex'));
    if (byProvider.drawnVia !== 'provider') {
      problems.push(`HONESTY  'Orbex Prime' should match by provider; got ${byProvider.drawnVia}`);
    } else {
      if (byProvider.drawsAs === 'variant') problems.push('HONESTY  a provider match claims an exact vehicle');
      // Its row's own source reads "NOT this vehicle: no source was read for Prime...".
      if (byProvider.sizeM !== null) {
        problems.push(`HONESTY  the provider stand-in states a height (${byProvider.sizeM} m) for a vehicle it says it cannot size`);
      }
    }
    const generic = metaOf(launch('Nova', ['Nova'], 'Firefly Aerospace'));
    if (generic.drawsAs !== 'generic' || generic.sizeM !== null) {
      problems.push(`HONESTY  an unmatched launch should be generic with no height; got ${generic.drawsAs}/${generic.sizeM}`);
    }
    notes.push('drawsAs is capped by the match level: full_name -> variant, family/provider -> family');
  } catch (e) {
    problems.push(`HONESTY  could not check the drawn claim: ${String(e && e.message)}`);
  }
}

// 3d. the golden master for propagate/fixed.js.
//
// `fixed` positions every dish, every pad, every landing site and every historic reentry, and
// most of them were correct only because the propagator hard-coded 'earth-fixed'. So the fix for
// the ones that were wrong is exactly the change that can move the ones that were right. This is
// the whole safety net: tests/fixtures/fixed-golden.json is the before picture.
{
  try {
    const golden = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/fixed-golden.json'), 'utf8'));
    const { dumpRows } = await import(join(ROOT, 'tests/dump_fixed_golden.mjs'));
    const now = new Map((await dumpRows()).map((r) => [r.id, r]));

    // A `fixed` record ADDED since the picture was taken is not a regression, and the fixture
    // must not be regenerated to accommodate one: regenerating writes today's corrected numbers
    // into the "before" column and turns the whole check into a tautology, which is exactly what
    // it caught its own author doing. So the fixture stays the authority for the rows it holds,
    // and a new row is held to the REQUIREMENT instead of to a stored vector -- it must answer in
    // the frame it declares, and a body-fixed one must be on that body's surface.
    // Hoisted above the loop: the off-Earth branch needs it too now, and it used to be imported
    // only for the new-row branch below.
    const { WORLD_RADIUS_KM: RADII } = await import(join(JS, 'propagate/frames.js'));
    const knownIds = new Set(golden.rows.map((r) => r.id));
    let earthRows = 0;
    let movedRows = 0;
    let newRows = 0;
    for (const was of golden.rows) {
      const is = now.get(was.id);
      if (!is) { problems.push(`GOLDEN   ${was.id} is gone from the fixed records`); continue; }
      const onEarth = was.declaredFrame === 'earth-fixed' || was.declaredFrame === 'earth-inertial';
      if (onEarth) {
        earthRows += 1;
        // Byte-identical. Not "close": a metre of drift here is a bug in the ellipsoid maths.
        if (JSON.stringify(is.pos) !== JSON.stringify(was.pos)) {
          problems.push(
            `GOLDEN   ${was.id} (${was.declaredFrame}) MOVED: ` +
              `${JSON.stringify(was.pos)} -> ${JSON.stringify(is.pos)}`
          );
        }
      } else {
        // These were being drawn on Earth's surface. They must not still be.
        if (!is.pos) { problems.push(`GOLDEN   ${was.id} now has no position at all`); continue; }
        if (is.pos.frame !== was.declaredFrame) {
          problems.push(
            `GOLDEN   ${was.id} declares ${was.declaredFrame} but propagate() answers in ` +
              `${is.pos.frame}`
          );
        }
        if (JSON.stringify(is.pos) === JSON.stringify(was.pos)) {
          problems.push(`GOLDEN   ${was.id} is still where the bug put it: ${JSON.stringify(was.pos)}`);
        }
        // ...AND IT IS ON ITS OWN WORLD. The two checks above are "the frame is right" and "it
        // moved", and spec 0023's tasks.md called out what they leave open in as many words: five
        // of these seven rows "would not notice a radius regression that kept the frame". They
        // would not. `moon-fixed` at 6371 km satisfies both of them -- it answers in the declared
        // frame, and it is certainly not where the bug put it -- and it is the Moon's surface
        // drawn at Earth's radius, which is the ORIGINAL BUG with its sign flipped.
        //
        // The band is the same 25 km the new-row branch below uses and for the same reason: these
        // are spheres standing in for bodies with topography, and Olympus Mons is 21 km of it.
        const world = String(was.declaredFrame || '').split('-')[0];
        const wantKm = RADII[world];
        const gotKm = Math.hypot(is.pos.x, is.pos.y, is.pos.z);
        if (!Number.isFinite(wantKm)) {
          problems.push(`GOLDEN   ${was.id} declares ${was.declaredFrame}, whose world has no radius in frames.js`);
        } else if (Math.abs(gotKm - wantKm) > 25) {
          problems.push(
            `GOLDEN   ${was.id} answers in ${is.pos.frame} but is ${gotKm.toFixed(1)} km from the ` +
              `centre of ${world}, whose radius is ${wantKm}`
          );
        }
        movedRows += 1;
      }
    }
    for (const [id, row] of now) {
      if (knownIds.has(id)) continue;
      newRows += 1;
      if (!row.pos) { problems.push(`GOLDEN   new fixed record ${id} has no position at all`); continue; }
      if (row.pos.frame !== row.declaredFrame) {
        problems.push(
          `GOLDEN   new fixed record ${id} declares ${row.declaredFrame} and answers in ${row.pos.frame}`
        );
        continue;
      }
      const world = String(row.declaredFrame || '').split('-')[0];
      const wantKm = world === 'earth' ? 6371 : RADII[world];
      const gotKm = Math.hypot(row.pos.x, row.pos.y, row.pos.z);
      // Earth is an ellipsoid and a dish can be a kilometre up, so this is a sanity band, not the
      // metre-level assertion the Moon and Mars cases below make.
      if (!Number.isFinite(wantKm) || Math.abs(gotKm - wantKm) > 25) {
        problems.push(
          `GOLDEN   new fixed record ${id} is ${gotKm.toFixed(1)} km from the centre of ${world}, ` +
            `whose radius is ${wantKm}`
        );
      }
    }
    notes.push(
      `golden master: ${earthRows} Earth rows unchanged, ${movedRows} off-Earth rows corrected and ` +
        `on their own world's surface, ${newRows} fixed record(s) added since and held to the requirement`
    );
  } catch (e) {
    problems.push(`GOLDEN   could not check the golden master: ${String(e && e.message)}`);
  }
}

// 3d2. AND THE BEFORE PICTURE CANNOT BE OVERWRITTEN BY ACCIDENT.
//
// The check above is only worth anything while the fixture still holds the BEFORE numbers, and
// the generator that writes it lives in tests/ and matches `tests/*.mjs`. Running the suite with
// a glob -- the obvious thing to do -- therefore used to replace the before picture with the
// after picture, silently, and the damage then surfaced as a failure in 3d, which reads as "the
// propagator broke" rather than "your fixture is gone". It cost a debugging session here.
//
// So the generator refuses to write without --write, and this breaks that on purpose: run it the
// accidental way and require the bytes to be untouched. If someone drops the flag check, this
// fails -- and puts the bytes back first, because a guard for the golden master must not be the
// thing that destroys it.
{
  const path = join(ROOT, 'tests/fixtures/fixed-golden.json');
  const before = readFileSync(path);
  let out = '';
  try {
    out = execFileSync(process.execPath, [join(ROOT, 'tests/dump_fixed_golden.mjs')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    problems.push(`GENERATOR run without --write exited non-zero: ${String(e && e.message)}`);
  }
  const after = readFileSync(path);
  if (!before.equals(after)) {
    writeFileSync(path, before);
    problems.push(
      'GENERATOR tests/dump_fixed_golden.mjs rewrote the golden master without being asked. ' +
        'The bytes have been restored; put the --write guard back.'
    );
  } else if (!/nothing written/i.test(out)) {
    problems.push(
      `GENERATOR run without --write wrote nothing but did not say so, so a person running it ` +
        `cannot tell: ${JSON.stringify(out.trim().slice(0, 120))}`
    );
  } else {
    notes.push('the golden-master generator will not write unless asked, and says so');
  }
}

// 3e. a body-fixed record is ON THAT BODY. The requirement, not the implementation: whatever
// `fixed()` does internally, Apollo 11 is 1737 km from the centre of the Moon and Jezero is 3390
// km from the centre of Mars, and the near side is the side facing Earth.
{
  const near = (got, want, tol, what) => {
    if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
      problems.push(`FRAME    ${what}: expected ${want} +/- ${tol}, got ${got}`);
      return false;
    }
    return true;
  };
  try {
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { toStage } = await import(join(JS, 'propagate/frames.js'));
    const { worldPositionKm, WORLD_RADIUS_KM } = await import(join(JS, 'propagate/body.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const sites = new Map(handKeptSites().map((r) => [r.id, r]));
    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const mag = (p) => (p ? Math.hypot(p.x, p.y, p.z) : NaN);

    const a11 = propagate(sites.get('apollo-11'), tMs);
    near(mag(a11), WORLD_RADIUS_KM.moon, 0.5, 'Apollo 11 is on the surface of the Moon');
    if (a11 && a11.frame !== 'moon-fixed') {
      problems.push(`FRAME    Apollo 11 answers in ${a11.frame}, not moon-fixed`);
    }
    const jez = propagate(sites.get('jezero'), tMs);
    near(mag(jez), WORLD_RADIUS_KM.mars, 0.5, 'Jezero is on the surface of Mars');
    if (jez && jez.frame !== 'mars-fixed') {
      problems.push(`FRAME    Jezero answers in ${jez.frame}, not mars-fixed`);
    }

    // The near side / far side check. A rotation that is transposed, or off by the sign of the
    // spin angle, still gives the right |r| -- this is the test that notices. Apollo 11 sits at
    // 23 deg E and is visible from Earth every clear night; Chang'e 4 is the far side, and its
    // whole point is that Earth cannot see it.
    const moonKm = worldPositionKm('moon', tMs, 'earth-inertial');
    const toEarthInertial = (rec) => {
      const p = propagate(rec, tMs);
      if (!p) return null;
      return toStage(rec, p, { worldId: 'earth', frame: 'earth-inertial', tMs }, tMs);
    };
    const facing = (id) => {
      const g = toEarthInertial(sites.get(id));
      if (!g || !moonKm) return NaN;
      // The site, seen from the Moon's centre, dotted with the direction to Earth.
      const s = { x: g.x - moonKm.x, y: g.y - moonKm.y, z: g.z - moonKm.z };
      const rs = Math.hypot(s.x, s.y, s.z);
      const rm = Math.hypot(moonKm.x, moonKm.y, moonKm.z);
      if (!(rs > 0) || !(rm > 0)) return NaN;
      return -(s.x * moonKm.x + s.y * moonKm.y + s.z * moonKm.z) / (rs * rm);
    };
    const a11Facing = facing('apollo-11');
    const ce4Facing = facing('change-4');
    if (!(a11Facing > 0.5)) {
      problems.push(
        `FRAME    Apollo 11 should be on the near side of the Moon (cos to Earth > 0.5); got ${a11Facing}`
      );
    }
    if (!(ce4Facing < -0.5)) {
      problems.push(
        `FRAME    Chang'e 4 should be on the FAR side (cos to Earth < -0.5); got ${ce4Facing}`
      );
    }
    // And the distance from the Moon's centre survives the trip to Earth's frame.
    const g11 = toEarthInertial(sites.get('apollo-11'));
    if (g11 && moonKm) {
      near(
        Math.hypot(g11.x - moonKm.x, g11.y - moonKm.y, g11.z - moonKm.z),
        WORLD_RADIUS_KM.moon,
        1.0,
        'Apollo 11 converted into Earth’s frame is still on the Moon',
      );
    } else {
      problems.push('FRAME    moon-fixed -> earth-inertial is not convertible at all');
    }
    notes.push(
      `Apollo 11 faces Earth (cos ${a11Facing.toFixed(2)}), Chang'e 4 faces away (cos ${ce4Facing.toFixed(2)})`
    );
  } catch (e) {
    problems.push(`FRAME    could not check the body-fixed frames: ${String(e && e.message)}`);
  }
}

// 3e2. THE MESH AND THE MARKER MUST USE THE SAME ROTATION.
//
// A landing site is placed by propagate/frames.js and the globe under it is oriented by
// scene/worlds.js, and until this test existed those were two formulas written to match. They did
// not: worlds.js built an EQJ orientation and applied it in TEME scene axes, so every lunar row
// was drawn 0.373 degrees of longitude -- 11.3 km of lunar surface -- east of where the Moon's own
// texture put it. The old assertions could not see it: a 0.5 km radial band and a hemisphere sign
// are both blind to a tangential slide.
//
// So this recovers a site's latitude and longitude BACK through the mesh's own quaternion and
// requires the registry row within a kilometre. It is the check that would have caught it.
{
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { stage } = await import(join(JS, 'scene/stage.js'));
    const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const { WORLD_RADIUS_KM } = await import(join(JS, 'propagate/frames.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    stage.setWorld('earth');
    stage.setTime(tMs);
    const scene = new THREE.Scene();
    const worlds = createWorlds(scene, { textureBase: null });
    worlds.update(tMs);

    const byId = new Map(handKeptSites().map((r) => [r.id, r]));
    const local = new THREE.Vector3();
    let checked = 0;
    let worst = 0;
    // EVERY row on each world, not a list of five: twenty-one landing sites arrived on 2026-09-22
    // and a hand-kept list of which ones to check is a list that stops growing. Mars is in it
    // since then too -- its rows were never held to its own globe's texture before.
    const onWorld = (w) => [...byId.values()].filter((r) => r.meta && r.meta.world === w).map((r) => r.id);
    for (const [world, ids] of [['moon', onWorld('moon')], ['mars', onWorld('mars')]]) {
      const mesh = worlds.meshFor(world);
      if (!mesh) { problems.push(`MESH     no ${world} mesh to check`); continue; }
      mesh.updateMatrixWorld(true);
      const radiusKm = WORLD_RADIUS_KM[world];
      for (const id of ids) {
        const rec = byId.get(id);
        if (!rec) { problems.push(`MESH     ${id} is not a hand-kept site any more`); continue; }
        const p = propagate(rec, tMs);
        const scenePos = p && stage.toScene(p, p.frame, tMs);
        if (!scenePos) { problems.push(`MESH     ${id} has no scene position`); continue; }
        // Into the mesh's own local space, then undo the scene axis remap (x, y, z) -> (x, z, -y).
        local.copy(scenePos);
        mesh.worldToLocal(local);
        const bf = { x: local.x, y: -local.z, z: local.y };
        const n = Math.hypot(bf.x, bf.y, bf.z);
        if (!(n > 0)) { problems.push(`MESH     ${id} recovered a zero vector`); continue; }
        const lat = (Math.asin(bf.z / n) * 180) / Math.PI;
        let lon = (Math.atan2(bf.y, bf.x) * 180) / Math.PI;
        if (lon < 0) lon += 360;
        let wantLon = rec.fixed.lonDeg;
        if (wantLon < 0) wantLon += 360;
        let dLon = Math.abs(lon - wantLon);
        if (dLon > 180) dLon = 360 - dLon;
        // Great-circle metres, not degrees: a degree of longitude is worth less near the poles and
        // the number that matters is how far across the ground the marker slid.
        const kmLat = ((lat - rec.fixed.latDeg) * Math.PI / 180) * radiusKm;
        const kmLon = ((dLon * Math.PI) / 180) * radiusKm * Math.cos((rec.fixed.latDeg * Math.PI) / 180);
        const slideKm = Math.hypot(kmLat, kmLon);
        worst = Math.max(worst, slideKm);
        checked += 1;
        if (!(slideKm < 1.0)) {
          problems.push(
            `MESH     ${id} lands ${slideKm.toFixed(2)} km from where the ${world}'s own texture ` +
              `puts it (recovered ${lat.toFixed(4)} / ${lon.toFixed(4)}, ` +
              `registry ${rec.fixed.latDeg} / ${wantLon.toFixed(4)})`
          );
        }
      }
    }
    if (!checked) problems.push('MESH     nothing was checked, so this test proves nothing');
    else notes.push(`the drawn globe and the marker agree: ${checked} lunar and Martian rows, worst ${(worst * 1000).toFixed(0)} m`);
    worlds.dispose();
  } catch (e) {
    problems.push(`MESH     could not check the mesh orientation: ${String(e && e.message)}`);
  }
}

// 3e3. LEAVING A TRIP ENDS THE FLIGHT.
//
// `stop()` and `finish()` restored the layers, the clock and the world and never touched the
// camera, so the rig flew on with the frame gone: measured in Chrome, Leave pressed 0.8 s into a
// flight left `flying` true and the distance ran from 25.7 to 70 995 scene units over the next
// 2.5 s -- 71 million kilometres of camera travel after the trip was over -- while the end card
// said "the camera stays where it is". `jump()` and `pause()` both collapsed the flight already;
// the two EXITS did not, which is why only the exits are asserted here.
{
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
    const { createTrip } = await import(join(JS, 'ui/trip.js'));
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const { sampleOddities } = await import(join(JS, 'data/sample.js'));

    // rAF as a queue we drain by hand: the whole machine is built on schedule(), and a test that
    // waits on a real frame is a test that waits.
    const frames = [];
    const prevRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    const pump = (n = 12) => {
      for (let i = 0; i < n; i += 1) {
        const due = frames.splice(0, frames.length);
        for (const fn of due) { try { fn(Date.now()); } catch { /* not what is under test */ } }
      }
    };

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const records = sampleOddities();
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
    camera.position.set(0, 0, 10);
    const rig = createCameraRig(camera, null, { worldRadius: 0 });
    const ctx = {
      camera,
      cameraRig: rig,
      clock: { mode: 'live', rate: 1, paused: false, now: () => tMs, goTo() {}, setRate() {}, setPaused() {}, live() {} },
      layers: [{ id: 'oddities', nearKm: 2000 }],
      recordsFor: (id) => (id === 'oddities' ? records : []),
      recordById: (id) => records.find((r) => r.id === id) || null,
      isLayerOn: () => true,
      setLayerOn() {},
      select() {},
      deselect() {},
      selected: () => null,
    };
    const trip = createTrip(ctx);
    // The trip that needs no network. TOURS[0] is `people-in-space`, which resolves to one stop
    // with no CelesTrak and therefore never begins -- and a `stop()` with nothing running returns
    // before it reaches the camera, so picking it would have made this whole block a tautology.
    let tourId = null;
    for (const tour of TOURS) {
      const p = await trip.plan(tour.id);
      if (p && p.offerable) { tourId = tour.id; break; }
    }

    const exercise = async (label, exit) => {
      await trip.start(tourId);
      pump();
      if (trip.state.phase === 'idle') {
        problems.push(`TRIPEND  ${label}: the trip never started, so nothing below is a test`);
        return;
      }
      trip.play();
      pump(2);
      // A flight of our own, so the assertion is about the exit and not about the trip's timing.
      rig.flyTo({ distance: 4000, ms: 8000 });
      rig.update(0.1);
      if (!rig.state.flying) { problems.push(`TRIPEND  ${label}: nothing was flying to begin with`); return; }
      exit();
      pump(2);
      if (rig.state.flying) {
        problems.push(`TRIPEND  ${label} left the camera flying; it must end where it is`);
        return;
      }
      const was = rig.state.distance;
      for (let i = 0; i < 25; i += 1) rig.update(0.1);
      if (Math.abs(rig.state.distance - was) > 1e-6) {
        problems.push(
          `TRIPEND  ${label}: the camera moved ${(rig.state.distance - was).toFixed(3)} units ` +
            'in the 2.5 s after the trip ended'
        );
      }
    };

    if (!tourId) {
      problems.push('TRIPEND  no trip resolves without a network, so this proves nothing');
    } else {
      const before = problems.length;
      await exercise('trip.stop()', () => trip.stop('left'));
      // The last stop's Next runs finish(), which is the other exit and the one the end card
      // makes a promise about.
      await exercise('finish()', () => { for (let i = 0; i < 20; i += 1) { trip.next(); pump(1); } });
      if (problems.length === before) {
        notes.push('leaving a trip and finishing one both end the flight where it is');
      }
    }
    trip.dispose();
    rig.dispose();
    if (prevRaf) globalThis.requestAnimationFrame = prevRaf;
    else delete globalThis.requestAnimationFrame;
  } catch (e) {
    problems.push(`TRIPEND  could not check the trip exits: ${String(e && e.message)}`);
  }
}

// 3e3b. A TRIP STANDING NEXT TO ONE MACHINE HIDES THE CROWD, AND ONLY THEN.
//
// 3e3b. A HERO MAY NOT BE DRAWN INSIDE THE WORLD IT ORBITS.
//
// Ivan, on the stations tour: "dont like in the tour with stations stations inside the earth."
// He was right, and the first fix was aimed at the wrong thing -- it hid the other LAYERS while a
// trip stood still (public #125), which did not fire at the stop he was describing and did fire at
// two stops that were fine, so the next report was "i dont see many objects now at all".
//
// The cause is scene/heroes.js sizing: a hero is drawn at a constant number of PIXELS, so its
// world radius is `px * d / (h * f)` and grows without limit as the camera backs away. The trip
// selects its subject at every stop, a selection is drawn at 260 px AND skips the nearKm gate, and
// the tour's opening stop parks 32 000 km back. The ISS came out 4 308 km in radius while orbiting
// 6 791 km from the centre of a 6 371 km planet: 3 888 km of station below the surface.
//
// The ceiling is the object's own altitude -- drawn no larger than its height above the ground, it
// cannot reach the ground. heroes.js caps the SCALE at `altitude * CLEARANCE / reach`, where reach
// is how far that particular model sticks out at scale 1, so the drawn reach is `altitude *
// CLEARANCE` whatever shape it is and the model's own size cancels. That is what is checked here,
// stated independently because heroes.js cannot be constructed without a WebGL context and the
// number is the whole point.
//
// MEASURED IN A REAL BROWSER on 2026-09-17 (headless Chrome, 1280x800, the live code): at the
// 32 000 km stop the ISS reaches 362 km and its lowest point is 6 624 km from the Earth's centre --
// 253 km clear of the surface -- and it reads as 22 px. At the 3 000 km stop it still reads 233 px,
// so the close-up this budget exists for is untouched.
{
  const F = 1 / Math.tan((45 * Math.PI / 180) / 2); // CAMERA_FOV_DEG in scene/renderer.js
  const CLEARANCE = 0.9;
  const R_EARTH = 6371;      // registry/worlds.yaml
  const UNIT_KM = 1000;      // the earth stage, scene/stage.js
  // The same expression heroes.js evaluates, in kilometres.
  const radiusKm = (px, distKm, h, orbitKm) => {
    const want = (px * (distKm / UNIT_KM)) / (h * F) * UNIT_KM;
    const altitude = orbitKm - R_EARTH;
    return altitude > 0 ? Math.min(want, altitude * CLEARANCE) : want;
  };
  const ISS = R_EARTH + 420;
  // The stop that was reported, at the two viewport heights either side of a laptop.
  for (const h of [800, 1200]) {
    const r = radiusKm(260, 32000, h, ISS);
    if (ISS - r <= R_EARTH) {
      problems.push(`HEROCLEAR at ${h}px the selected ISS is drawn ${r.toFixed(0)} km in radius at the 32 000 km stop, which reaches ${(R_EARTH - (ISS - r)).toFixed(0)} km inside a ${R_EARTH} km planet`);
    }
  }
  // Uncapped is the bug, and the test has to be able to fail: the same stop without the clamp.
  const uncapped = (260 * (32000 / UNIT_KM)) / (800 * F) * UNIT_KM;
  if (!(ISS - uncapped < R_EARTH)) problems.push('HEROCLEAR the uncapped size no longer reproduces the bug, so this test proves nothing');
  // Close up, the cap must not bite: this is where the 260 px exists to be spent.
  const near = radiusKm(260, 3, 800, ISS);
  if (Math.abs(near - (260 * (3 / UNIT_KM)) / (800 * F) * UNIT_KM) > 1e-9) {
    problems.push('HEROCLEAR the clamp is biting 3 km from the station, where the model is meant to be big');
  }
  // On the surface there is no altitude to spend and a marker is MEANT to touch the ground.
  const pad = radiusKm(84, 900, 800, R_EARTH);
  if (!(pad > 0)) problems.push('HEROCLEAR a ground site at altitude zero must not be clamped to nothing');
  if (!problems.some((p) => p.startsWith('HEROCLEAR'))) {
    notes.push(`a hero is drawn no larger than its own altitude: the ISS at the 32 000 km stop is ${radiusKm(260, 32000, 800, ISS).toFixed(0)} km, not ${uncapped.toFixed(0)}`);
  }
}

// 3e4. NOTHING WITH depthTest OFF MAY BE IN THE TRANSPARENT LIST.
//
// three draws its render lists opaque -> transmissive -> transparent, and renderOrder only sorts
// WITHIN a list. A transparent material therefore draws after every opaque object whatever its
// renderOrder, and with depthTest off it paints over them. The sky is built exactly that way on
// purpose -- depthTest off, a negative renderOrder, "painted first and can never occlude
// anything" -- which is only true while it is in the opaque list.
//
// The Milky Way panorama was flagged `transparent: true` on 2026-09-08 so the scale ladder could
// fade it, and from then until 2026-09-16 it painted over the Earth, the Moon, the Sun and every
// planet: a camera 22 units from a lit Earth read (0,0,0) at the centre pixel, and the live site
// showed a ring of satellites around an empty sky. The stars and the constellation lines beside
// it had each been fixed for this, one at a time, with a comment saying why. A rule written per
// material is a rule the next material does not know about, so this checks every material the
// scene's builders make.
{
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { stage } = await import(join(JS, 'scene/stage.js'));
    const { createStarfield } = await import(join(JS, 'scene/starfield.js'));
    const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
    stage.setWorld('earth');
    const scene = new THREE.Scene();
    const stars = readFileSync(join(ROOT, 'site/data/stars.bin'));
    const sky = createStarfield(scene, {
      starsBin: stars,
      linesJson: JSON.parse(readFileSync(join(ROOT, 'site/data/constellations.lines.json'), 'utf8')),
      namesJson: JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8')),
      milkyWayTexture: new THREE.Texture(),
    });
    await sky.ready;
    // A texture loader that hands back an empty texture at once, so every lazy map is applied and
    // the materials are checked in the state they are drawn in, not just the one they start in.
    const worlds = createWorlds(scene, { textureBase: '', loadTexture: (url, onLoad) => { const t = new THREE.Texture(); if (onLoad) onLoad(t); return t; } });
    for (const w of worlds.waitingMaps()) worlds.preload(w);
    let checked = 0;
    const named = new Set();
    scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        checked += 1;
        named.add(o.name);
        if (m.depthTest === false && m.transparent === true) {
          problems.push(
            `DRAWORDER ${o.name || o.type} is transparent with depthTest off, so it draws after every ` +
              `opaque object and paints over the planets. Keep it in the opaque list: ` +
              `transparent:false with CustomBlending (see the Milky Way in scene/starfield.js).`
          );
        }
      }
    });
    const want = ['milkyway', 'stars', 'earth', 'mars', 'sun'];
    const missing = want.filter((n) => ![...named].some((x) => x === n || x.startsWith(n)));
    if (missing.length) problems.push(`DRAWORDER the check never saw ${missing.join(', ')}, so it proves nothing about them`);
    else notes.push(`${checked} materials across the sky and the worlds; none draws after the planets with depthTest off`);
    sky.dispose && sky.dispose();
    worlds.dispose();
  } catch (e) {
    problems.push(`DRAWORDER could not build the sky and the worlds to check them: ${String(e && e.stack || e).slice(0, 300)}`);
  }
}

// 3e4b. THE SCENE HAS A NAME, A HEADING AND A LANDMARK.
//
// Measured 2026-09-20 with a headless browser: the app's contrast and control names are clean --
// zero low-contrast strings and zero nameless controls out of 52 focusable elements -- but the
// canvas itself was an unlabelled <canvas>. A screen reader reached the panels and found nothing
// where the map is; the page had no <h1> at all, and no landmark around the scene.
//
// `role="img"` with a name is the honest description of a canvas that draws a scene, and it is a
// NAME rather than a live region on purpose: everything drawn is also reachable as text -- the
// layer list, the search, a card per object -- and a sentence that changed sixty times a second
// would be unusable. The heading is visually hidden rather than display:none, which would hide it
// from assistive technology too, which is the whole point of it.
{
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/css/site.css'), 'utf8');
  const canvas = (html.match(/<canvas[^>]*id="stage"[^>]*>/s) || [''])[0];
  if (!/role="img"/.test(canvas)) problems.push('A11Y     the canvas has no role: a screen reader finds nothing where the map is');
  const name = (canvas.match(/aria-label="([^"]+)"/s) || [])[1] || '';
  if (name.trim().length < 40) problems.push(`A11Y     the canvas needs a name that says what it draws (got ${name.length} characters)`);
  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) problems.push(`A11Y     the page should have exactly one h1; it has ${h1s.length}`);
  const h1 = (html.match(/<h1[^>]*class="([^"]*)"/) || [])[1] || '';
  if (!h1.includes('sr-hidden-text')) problems.push('A11Y     the h1 should be the visually hidden heading');
  // The class has to exist and has to hide by clipping, not by display:none.
  const rule = (css.match(/\.sr-hidden-text\s*\{[^}]*\}/s) || [''])[0];
  if (!rule) problems.push('A11Y     .sr-hidden-text is used by index.html and not defined in site.css');
  else if (/display:\s*none/.test(rule) || /visibility:\s*hidden/.test(rule)) {
    problems.push('A11Y     .sr-hidden-text hides itself from assistive technology too; clip it instead');
  }
  if (!/<main\b/.test(html)) problems.push('A11Y     the scene is not inside a main landmark');
  if (!problems.some((p) => p.startsWith('A11Y'))) {
    notes.push('the scene is a named image inside a main landmark, under one visually hidden h1');
  }
}

// 3e4c. THE DOT YIELDS TO ITS MODEL. THE SAMPLE HALO DOES NOT.
//
// One mark per object (#142) fades a record's dot out while its 3D model is on screen, by
// multiplying the instance's iOpacity by (1 - modelOpacity). That is the obvious way to do it and
// it took something else with it: the dashed halo that marks bundled sample data is drawn by the
// SAME instance, from the SAME opacity, so the ring went out with the dot.
//
// That matters more than it sounds. Every deep-space spacecraft is a `sample` record while the
// harvester is unprovisioned, and a hero model is exactly what those records get -- so the objects
// whose positions are least certain were the ones quietly losing the one mark on screen that says
// "this is not a live position". That is the module contract's rule 5, and losing it silently is
// worse than never having drawn it.
//
// So the ring carries its own opacity. This asserts the split at the source: the arithmetic is
// GLSL and there is no GL in CI to run it in.
{
  const src = readFileSync(join(JS, 'scene/glyphs.js'), 'utf8');
  const frag = (src.match(/const FRAG = \/\* glsl \*\/ `([\s\S]*?)`;/) || [])[1] || '';
  if (!frag) problems.push('HALO     could not find the fragment shader in scene/glyphs.js');
  else {
    const dotAlpha = (frag.match(/^\s*float a = .*$/m) || [''])[0];
    const ringAlpha = (frag.match(/^\s*float h = .*$/m) || [''])[0];
    if (!/vOpacity/.test(dotAlpha)) {
      problems.push(`HALO     the dot no longer reads the opacity that yields to its model: "${dotAlpha.trim()}"`);
    }
    if (!/vRing/.test(ringAlpha) || /vOpacity/.test(ringAlpha)) {
      problems.push(
        'HALO     the sample halo is drawn at the dot\'s opacity, so a bundled position drawn as a ' +
          `model loses the ring that says it is bundled: "${ringAlpha.trim()}"`
      );
    }
  }
  // ... and the two must be written from different numbers on the CPU side too.
  const dotLine = (src.match(/^\s*attrOpacity\.array\[k\] = .*$/m) || [''])[0];
  const ringLine = (src.match(/^\s*attrRing\.array\[k\] = .*$/m) || [''])[0];
  if (!/dotOpacity\(/.test(dotLine)) problems.push(`HALO     the dot is not written through onemark's dotOpacity(): "${dotLine.trim()}"`);
  if (!ringLine) problems.push('HALO     nothing writes iRing, so the halo has no opacity of its own');
  else if (/dotOpacity\(|yieldTo|modelOpacity/.test(ringLine)) {
    problems.push(`HALO     the halo's opacity yields to the model as well: "${ringLine.trim()}"`);
  }
  if (!problems.some((p) => p.startsWith('HALO'))) {
    notes.push('a dot yields to its model; the sample halo keeps its own opacity and stays');
  }
}

// 3e4d. A DATE FAR ENOUGH AWAY CARRIES ITS YEAR.
//
// `timeText.localDate` is "Mon 19 Mar": right for tonight's pass, wrong for anything a season or more
// away. It has now been caught four times in four places -- the Roadster's last sighting (2018), a
// comet's perihelion (Hale-Bopp, 1997), a debris reentry and a probe's milestone -- each read by a
// visitor as a date in the next few months. The card and the Next list no longer call it at all:
// dateNear() chooses by distance from now, and passes use dayAndTime, which is always within hours.
{
  for (const f of ['ui/cards.js', 'ui/next.js']) {
    const src = readFileSync(join(JS, f), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    if (/timeText\.localDate\(/.test(src)) problems.push(`DATE     ${f} calls timeText.localDate; use timeText.dateNear(ms, now) so a far date keeps its year`);
  }
  const { timeText } = await import(join(JS, 'copy/en.js'));
  const now = Date.UTC(2026, 8, 22);
  if (!/2029/.test(timeText.dateNear(Date.UTC(2029, 3, 13), now))) problems.push('DATE     Apophis in April 2029 must print 2029');
  if (/2026/.test(timeText.dateNear(Date.UTC(2026, 9, 30), now))) problems.push('DATE     a date five weeks out keeps the short form');
  if (!problems.some((p) => p.startsWith('DATE'))) notes.push('every date more than half a year away prints its year');
}

// 3e4e. THE CARD IS A NAMED DIALOG THAT TAKES FOCUS FROM A CONTROL, AND GIVES IT BACK.
//
// Measured in a browser, 2026-09-22: open a card from search with Enter and focus stayed on <body>,
// and the card was role="dialog" with no name. Checked there too: a tap in the scene and a running
// trip must NOT move focus. There is no DOM here, so the rules are asserted where they are written.
{
  const src = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
  const take = (src.match(/function takeFocus\(\) \{([\s\S]*?)\n\}/) || [])[1] || '';
  if (!/aria-labelledby/.test(take)) problems.push('A11Y     the card dialog is not named by its title (aria-labelledby)');
  if (!/sr-trip-mode/.test(take)) problems.push('A11Y     takeFocus() must not move focus while a trip is running');
  if (!/document\.body/.test(take) || !/CANVAS/.test(take)) problems.push('A11Y     takeFocus() must leave focus alone after a tap in the scene (body or canvas)');
  if (!/if \(!wasOpen\) takeFocus\(\)/.test(src)) problems.push('A11Y     focus must move only when the card OPENS, not on every re-render');
  const hide = (src.match(/export function hideCard\(\) \{([\s\S]*?)\n\}/) || [])[1] || '';
  if (!/returnFocus/.test(hide)) problems.push('A11Y     closing the card must give focus back to where it came from');
  if (!problems.some((p) => p.startsWith('A11Y'))) notes.push('the card is a named dialog; it takes focus from a control, never from a tap or a trip, and gives it back');
}

// 3e4g. THE FRAME LOOP'S STEP IS NEVER NEGATIVE (2026-09-22): a negative first step held the glyph
// and label updates back for over a minute in headless Chrome. Asserted where it is written.
{
  const src = readFileSync(join(JS, 'main.js'), 'utf8');
  if (!/const frameMs = Math\.max\(0, nowReal - last\)/.test(src)) problems.push('FRAME    the frame step can go negative again (rAF stamps a frame with when it began)');
  else notes.push('the frame step is never negative, so the 10 Hz glyph and label tick starts on the first frames');
}

// 3e4f. A TRIP'S SUBJECT IS NAMED WHERE IT IS DRAWN.
//
// Measured on "To the edge", 2026-09-22: the labels skipped the selection whenever a trip ran,
// on the grounds that the card names it. The card cannot point: Proxima was one unlabelled point
// among hundreds, and the nearest name to the Sun was Voyager 1's. Only the ground under the camera
// goes unnamed now. No DOM here, so the rule is asserted where it is written.
{
  const src = readFileSync(join(JS, 'ui/labels.js'), 'utf8');
  if (/if \(selected && !inTrip\)/.test(src)) problems.push('LABELS   the selection is hidden during a trip again -- the card names its subject but cannot point at it');
  if (!/isOwnPlaceOnLadder/.test(src)) problems.push('LABELS   on a ladder stage a planet or probe can take the Sun\'s pixel\'s name again');
  else notes.push('a trip names its subject where it is drawn; on the ladder the Sun speaks for the Solar System');
}

// 3e5. THE GITHUB MARK STEPS ASIDE FOR THE CARD, AND ONLY FOR THE CARD.
//
// The mark asks for the top right corner. On desktop it used to sit at `var(--sr-card-w) + 24px`
// at every width, open card or not, so the corner it was asked for was a hole the width of the
// card rail whenever nothing was selected -- which is most of the time. It cannot read the card
// with a sibling selector: ui/github.js appends the mark at boot and ui/cards.js builds the card
// host lazily on the first showCard(), so the card is always after it in the document. The signal
// is a class on <html>, like ui/mobile.js's `sr-phone`.
//
// Two halves in two files, and neither is any use alone. There is no DOM in these tests, so this
// is the source-level version of that pair: the class is set where the card opens, cleared where
// it closes, and some rule keyed on it moves the mark.
{
  const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  const opens = (cards.match(/markCardOpen\(true\)/g) || []).length;
  const closes = (cards.match(/markCardOpen\(false\)/g) || []).length;
  const addsIsOpen = (cards.match(/classList\.add\('is-open'\)/g) || []).length;
  if (!/classList\.toggle\('sr-card-open'/.test(cards)) {
    problems.push("MARK     ui/cards.js does not set the `sr-card-open` class, so the mark cannot know a card is open");
  }
  if (opens !== addsIsOpen) {
    problems.push(`MARK     ui/cards.js opens the card ${addsIsOpen} way(s) but says so ${opens} time(s); a path that opens without markCardOpen(true) leaves the mark over the card`);
  }
  if (closes < 1) problems.push('MARK     nothing calls markCardOpen(false), so the mark never returns to the corner');
  if (!/html\.sr-card-open[^{]*\.sr-mark\s*\{/.test(css)) {
    problems.push('MARK     css/ui.css has no rule keyed on html.sr-card-open for .sr-mark, so setting the class does nothing');
  }
  // And the resting place is the corner, not the rail: the plain desktop rule must not be the
  // one that steps aside.
  const desktop = (css.match(/@media \(min-width: 900px\) \{[\s\S]*?\n\}/g) || []).find((b) => b.includes('.sr-mark'));
  // The BARE selector only -- `html.sr-card-open .sr-mark` ends in `.sr-mark` too, and matching
  // that was this check's own first bug.
  if (desktop && /(^|\n)\s*\.sr-mark\s*\{[^}]*right:\s*calc\(var\(--sr-card-w\)/.test(desktop)) {
    problems.push('MARK     the mark sits at the card rail width with no card open; that is the hole this check exists for');
  }
  if (!problems.some((x) => x.startsWith('MARK'))) notes.push('the GitHub mark rests in the corner and steps aside only while a card is open');
}

// 3f. stage.js must REFUSE a vector it cannot convert, not pass it through unchanged. Passing it
// through is how a lunar landing site was drawn in Africa for months without a single warning
// anybody read.
{
  try {
    const { stage } = await import(join(JS, 'scene/stage.js'));
    stage.setWorld('earth');
    const out = stage.toStageFrame({ x: 1000, y: 0, z: 0 }, 'europa-fixed', Date.parse('2026-03-15T12:00:00Z'));
    if (out && Number.isFinite(out.x)) {
      problems.push(
        `STAGE    an unconvertible frame came back as ${JSON.stringify(out)} instead of null`
      );
    }
    const ok = stage.toStageFrame({ x: 1000, y: 0, z: 0 }, 'earth-fixed', Date.parse('2026-03-15T12:00:00Z'));
    if (!ok || !Number.isFinite(ok.x)) {
      problems.push('STAGE    a convertible frame (earth-fixed) now returns null; the refusal is too wide');
    }
  } catch (e) {
    problems.push(`STAGE    could not check the refusal: ${String(e && e.message)}`);
  }
}

// 3g. THE CARD, not just the vector. `cards.js` runs ecefToGeodetic on anything it thinks is an
// Earth frame, so a fixed propagator with an unfixed card still prints a latitude in Africa for a
// lunar site. This asserts the rows the card actually renders.
{
  try {
    const { rightNowFor, drawingLine } = await import(join(JS, 'ui/cards.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const sites = new Map(handKeptSites().map((r) => [r.id, r]));
    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const ctx = { clock: { now: () => tMs } };
    const rowsFor = (id) => rightNowFor(sites.get(id), ctx).map(([k, v]) => `${k}: ${v}`);

    const lunar = rowsFor('apollo-11').join(' | ');
    // 0.67 N / 23.5 E is the Moon. The same numbers on Earth are the Central African Republic,
    // and that is exactly what the card used to print.
    if (/Height above the ground/.test(lunar)) {
      problems.push(`CARD     a lunar site claims a height above THE ground: ${lunar}`);
    }
    if (/Passing over/.test(lunar)) {
      problems.push(`CARD     a lunar site claims to be passing over somewhere on Earth: ${lunar}`);
    }
    if (!/Moon/.test(lunar)) {
      problems.push(`CARD     a lunar site's card never says which world it is on: ${lunar}`);
    }
    const dish = rowsFor('dss-14').join(' | ');
    if (!/35\.4. N/.test(dish) || !/116\.9. W/.test(dish)) {
      problems.push(`CARD     Goldstone lost its Earth latitude and longitude: ${dish}`);
    }
    notes.push('the card names the world a surface site is on, and only Earth sites get an Earth lat/lon');
  } catch (e) {
    problems.push(`CARD     could not check the card rows: ${String(e && e.message)}`);
  }
}

// 3h. registry/oddities.yaml -> records -> the card. Five claims, and each of them is one this
// feature could get wrong quietly:
//
//   * THE TWO EPOCHS. record.epoch is when anybody last LOOKED, not the osculating epoch the
//     propagator integrates from. Get this wrong and the card says "elements 0 days old" about a
//     trajectory nobody has observed since March 2018 -- true of the arithmetic, a lie about the
//     knowledge. The next reader will want to "fix" it, so this is the assertion that stops them.
//   * A ROW NOBODY CAN PLACE DRAWS NOTHING. Not a dot somewhere vague: propagate() must return
//     null, because the glyph layer, heroes.js and the camera all key off that.
//   * A SURFACE ODDITY IS ON THAT SURFACE, in that world's frame, at that world's radius.
//   * THE CARD SAYS BOTH PRECISIONS. One number would have to choose between 0.4 m and 40 m.
//   * NO RECORD IS `sample`. These are hand-kept, which is provenance and not uncertainty; a
//     `sample` record draws a dashed halo meaning "not a live position", which would be false.
{
  try {
    const { sampleOddities, attachedOddityCount } = await import(join(JS, 'data/sample.js'));
    const { ODDITIES } = await import(join(JS, 'data/oddities.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { WORLD_RADIUS_KM } = await import(join(JS, 'propagate/frames.js'));
    const { rightNowFor, drawingLine } = await import(join(JS, 'ui/cards.js'));
    const { LAYERS } = await import(join(JS, 'data/layers.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const records = sampleOddities();
    const byId = new Map(records.map((r) => [r.id, r]));
    const ctx = { clock: { now: () => tMs } };

    // The mirror and the emitter agree about which rows become records. `attached` rows are
    // deliberately not records -- they are drawn on their carrier -- and the layer's count line
    // is the only thing that says so, so the arithmetic behind it is checked here.
    const attached = ODDITIES.filter((r) => r.where && r.where.kind === 'attached');
    if (attachedOddityCount() !== attached.length) {
      problems.push(`ODDITY   attachedOddityCount() says ${attachedOddityCount()} and the registry has ${attached.length}`);
    }
    if (records.length + attached.length !== ODDITIES.length) {
      problems.push(
        `ODDITY   ${ODDITIES.length} rows became ${records.length} records plus ${attached.length} ` +
          `attached; some row is neither drawn nor accounted for`
      );
    }
    for (const r of records) {
      if (r.cls === 'sample') {
        problems.push(`ODDITY   ${r.id} is classed 'sample'; these rows stand in for nothing`);
      }
      if (r.layer !== 'oddities' || r.klass !== 'oddity') {
        problems.push(`ODDITY   ${r.id} is layer ${r.layer} / klass ${r.klass}`);
      }
    }

    // The two epochs.
    const roadster = byId.get('tesla-roadster');
    if (!roadster) {
      problems.push('ODDITY   the Roadster is not among the emitted records');
    } else {
      const evidence = Date.parse('2018-03-19');
      if (roadster.epoch !== evidence) {
        problems.push(
          `ODDITY   record.epoch is ${new Date(roadster.epoch).toISOString()}; it must be the ` +
            `evidence epoch 2018-03-19, because the card prints its AGE and 374 observations ` +
            `stopped that day`
        );
      }
      if (!(roadster.elements.epochMs > evidence)) {
        problems.push('ODDITY   the osculating epoch is not later than the evidence epoch; the two-epoch rule has collapsed into one');
      }
      // The published phase reaches the propagator. Horizons gives true anomaly 209.5408787708 deg
      // at the osculating epoch; if tp_jd were dropped or misread, this lands somewhere else.
      const at = propagate(roadster, roadster.elements.epochMs);
      const rAu = at ? Math.hypot(at.x, at.y, at.z) / 149597870.7 : NaN;
      if (!(Math.abs(rAu - 1.593237) < 0.0005)) {
        problems.push(
          `ODDITY   at its own osculating epoch the Roadster is ${rAu} au from the Sun; Horizons' ` +
            `own elements put it at 1.593237 au. The published phase is not reaching the propagator`
        );
      }
      if (at && at.cls !== 'inferred') {
        problems.push(`ODDITY   the Roadster's position is classed ${at.cls}; nobody has observed it since 2018`);
      }
    }

    // A row nobody can place draws nothing at all.
    const pin = byId.get('bean-astronaut-pin');
    if (!pin) {
      problems.push('ODDITY   the unplaceable row is not a record, so search cannot find it');
    } else {
      if (propagate(pin, tMs) !== null) {
        problems.push('ODDITY   an object nobody can place has a position. A dot on this map is a claim');
      }
      const rows = rightNowFor(pin, ctx).map(([k, v]) => `${k}: ${v}`).join(' | ');
      if (/Could not work this out/.test(rows)) {
        problems.push(`ODDITY   the card says the arithmetic failed for something never known: ${rows}`);
      }
      if (!/Nobody knows/.test(rows)) {
        problems.push(`ODDITY   the card does not say nobody knows where it is: ${rows}`);
      }
      if (/Height above the ground/.test(rows)) {
        problems.push(`ODDITY   a card with no position still offers a height row: ${rows}`);
      }
    }

    // A surface oddity is on that surface, in that world's frame.
    for (const id of ['shepard-golf-balls', 'duke-family-photo', 'beresheet-lunar-library']) {
      const rec = byId.get(id);
      const p = rec ? propagate(rec, tMs) : null;
      if (!p) { problems.push(`ODDITY   ${id} has no position`); continue; }
      if (p.frame !== 'moon-fixed') {
        problems.push(`ODDITY   ${id} answers in ${p.frame}, not moon-fixed`);
      }
      const km = Math.hypot(p.x, p.y, p.z);
      if (Math.abs(km - WORLD_RADIUS_KM.moon) > 0.5) {
        problems.push(`ODDITY   ${id} is ${km.toFixed(1)} km from the centre of the Moon, not ${WORLD_RADIUS_KM.moon}`);
      }
      const rows = rightNowFor(rec, ctx).map(([k, v]) => `${k}: ${v}`).join(' | ');
      if (!/Moon/.test(rows) || /Height above the ground/.test(rows)) {
        problems.push(`ODDITY   ${id}'s card does not read as a place on the Moon: ${rows}`);
      }
    }

    // THE GEOMETRY, MEASURED. registry/oddities.yaml names a builder per row and
    // scene/models.js ODDITY_BUILDERS has one -- two files that were related by discipline
    // alone until this block. Everything below is measured rather than asserted: every shape is
    // built, its triangles counted against BOTH budgets it has to satisfy, and the two sets of
    // names compared in both directions, because a builder nobody names is as much a defect as
    // a name nobody builds.
    const layer = LAYERS.find((l) => l.id === 'oddities');
    if (!layer) {
      problems.push('ODDITY   data/layers.js has no oddities layer, so registry/layers.yaml has drifted again');
    } else {
      if (layer.noModel) {
        problems.push('ODDITY   the oddities layer still declares `noModel`, so the builders are never reached');
      }
      if (!(layer.nearKm > 0)) {
        problems.push(`ODDITY   the oddities layer's nearKm is ${layer.nearKm}; no unselected oddity would ever be drawn`);
      }
      // The checkbox shows ONE number, like every other layer's does. It used to break the
      // total into "on the map / riding on something else / nobody can place", which was
      // accurate and was also the only row in the panel that did not read like the others.
      //
      // The three states still have to add up -- that is a fact about the data, not about the
      // label -- so the invariant is asserted here directly instead of through the removed
      // counts() function. An oddity is drawn when it has a propagator; the one nobody can
      // place has none, by construction, and the attached rows are not records at all.
      const drawn = records.filter((r) => r && r.propagator).length;
      const unplaceable = records.length - drawn;
      if (unplaceable < 1) {
        problems.push(
          'ODDITY   every oddity has a propagator, so the "nobody can place" case is untested. ' +
            'That case is the point of the honesty design; a layer without it has drifted.'
        );
      }
      if (typeof layer.counts === 'function') {
        problems.push('ODDITY   the oddities layer declares counts() again; the checkbox shows one number');
      }
      notes.push(
        `oddities: ${records.length} in the layer (${drawn} drawn, ${unplaceable} nobody can ` +
          `place), plus ${attached.length} riding on something the app already draws`
      );
    }

    const { modelFor, modelVariants, disposeModels } = await import(join(JS, 'scene/models.js'));
    const builders = modelVariants().oddity || [];
    const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
    const layerCapLine = yaml.split('\n').find((l) => l.includes('id: oddity-generic')) || '';
    const layerCap = Number((layerCapLine.match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
    if (!layerCap) {
      problems.push('ODDITY   registry/models.yaml has no budget_tris for oddity-generic');
    }
    const named = new Set(ODDITIES.map((r) => (r.shape || {}).build).filter(Boolean));
    for (const build of named) {
      if (!builders.includes(build)) {
        problems.push(`ODDITY   registry/oddities.yaml names shape.build \`${build}\` and scene/models.js has no builder for it`);
      }
    }
    // The other direction: a builder nobody names is geometry nobody sees, and the two lists
    // drifting apart is exactly how registry/models.yaml and BUILDERS drifted before.
    for (const build of builders) {
      if (build === 'default' || build === 'generic') continue;
      if (!named.has(build)) {
        problems.push(`ODDITY   scene/models.js builds \`${build}\` and no registry/oddities.yaml row names it`);
      }
    }

    let worstOddity = { id: null, frac: 0, tris: 0, budget: 0 };
    for (const row of ODDITIES) {
      const build = (row.shape || {}).build;
      const budget = (row.shape || {}).budget_tris;
      if (!build || !builders.includes(build)) continue;
      const obj = modelFor('oddity', build);
      let tris = 0;
      let meshes = 0;
      obj.traverse((n) => {
        if (!n.geometry) return;
        meshes += 1;
        const g = n.geometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      });
      if (tris > budget) {
        problems.push(`ODDITY   ${row.id} draws ${build} at ${Math.round(tris)} tris, over its row's budget_tris ${budget}`);
      }
      if (layerCap && tris > layerCap) {
        problems.push(`ODDITY   ${row.id} draws ${build} at ${Math.round(tris)} tris, over the layer cap ${layerCap}`);
      }
      if (meshes > 40) {
        problems.push(`ODDITY   ${row.id} draws ${build} as ${meshes} meshes; the hero pool budget is ~30`);
      }
      // A builder that answered with nothing would pass every budget above.
      if (tris < 4) {
        problems.push(`ODDITY   ${row.id} draws ${build} as ${Math.round(tris)} triangles, which is not a shape`);
      }
      // modelFor() flags a fallback. A named build must never be one, or the card would name a
      // shape while a comms satellite was on the screen.
      if (obj.userData.generic) {
        problems.push(`ODDITY   modelFor('oddity', '${build}') fell back to a generic model`);
      }
      if (budget && tris / budget > worstOddity.frac) {
        worstOddity = { id: row.id, frac: tris / budget, tris, budget };
      }
      disposeModels(obj);
    }
    notes.push(
      `${builders.length - 1} oddity shapes build; tightest is ${worstOddity.id} at ` +
        `${Math.round(worstOddity.tris)} of ${worstOddity.budget} tris`
    );

    // The wiring, end to end: the record heroes.js will hand to modelFor() must name a builder,
    // and the record nobody can place must name none -- there is no geometry for a row that has
    // no position, and `meta.modelVariant` is what heroes.js reads.
    for (const r of records) {
      const v = r.meta && r.meta.modelVariant;
      if (r.meta && r.meta.unplaceable) {
        if (v) problems.push(`ODDITY   ${r.id} cannot be placed and still asks for the \`${v}\` model`);
        continue;
      }
      if (!v || !builders.includes(v)) {
        problems.push(`ODDITY   ${r.id} asks heroes.js for modelVariant ${JSON.stringify(v)}, which is not a builder`);
      }
      // Which way the shape points. A thing on a surface stands on it -- that one is measured
      // and the emitter, not the row, decides it; anything else takes the row's own choice, and
      // absent means scene/models.js's seeded constant, which is what an unaimable object gets.
      const row = ODDITIES.find((o) => o.id === r.id) || {};
      const grounded = ['on_surface', 'came_home'].includes((row.where || {}).kind);
      const want = grounded ? 'up' : (row.shape || {}).attitude || null;
      if ((r.meta.attitude || null) !== want) {
        problems.push(`ODDITY   ${r.id} is drawn with attitude ${JSON.stringify(r.meta.attitude || null)}; the registry says ${JSON.stringify(want)}`);
      }
    }

    // THE CARD'S CLAIM ABOUT ITS OWN DRAWING. The three original strings say "rocket" out loud;
    // an oddity must take the class-neutral triple, and a row that told the registry its drawing
    // departs from the object must print that departure rather than stopping at "drawn as".
    for (const r of records) {
      const line = drawingLine(r);
      if (r.meta && r.meta.unplaceable) {
        if (line !== null) {
          problems.push(`ODDITY   nothing is drawn for ${r.id} and its card still says "${line}"`);
        }
        continue;
      }
      if (!line) {
        problems.push(`ODDITY   ${r.id} is drawn as a ${r.meta.modelVariant} and the card says nothing about it`);
        continue;
      }
      if (/rocket/i.test(line)) {
        problems.push(`ODDITY   ${r.id}'s drawing line calls it a rocket: ${line}`);
      }
      if (!line.includes(r.meta.drawnName)) {
        problems.push(`ODDITY   ${r.id}'s drawing line does not name the shape drawn: ${line}`);
      }
      const row = ODDITIES.find((o) => o.id === r.id);
      const departure = (row.shape || {}).departure;
      if (departure && !line.includes(departure)) {
        problems.push(`ODDITY   ${r.id} tells the registry how its drawing differs and the card does not print it: ${line}`);
      }
    }
  } catch (e) {
    problems.push(`ODDITY   could not check the oddities layer: ${String(e && e.message)}`);
  }
}

// 3i. the two rows that are not objects in space, but parts of objects in space.
//
// The Voyager Golden Record and Juno's three LEGO figures are `where.kind: attached`. That word
// is a claim with four consequences, and each one below is a way this feature fails QUIETLY --
// with the card still confidently printing a position -- rather than loudly.
//
//   * THE CARRIER IS REAL. `attachable:` in the registry is the checked-in evidence of what
//     data/sample.js emits, and CI cannot run a browser. This checks it against the emitter.
//   * THERE IS NO SECOND DOT. An attached row must not become a record: two dots at one point
//     are ambiguous to tap, and main.js takes the first hit in layer order.
//   * THE POSITION IS THE CARRIER'S, VERBATIM. Not close to it -- the same vector, the same
//     frame, the same class, at the same instant. If it drifted by a kilometre the card would be
//     making a claim about a place nobody has measured.
//   * THERE IS NO SECOND SPACECRAFT. scene/realmodels.js matches a NASA glTF on meta.horizonsId,
//     so a derived record carrying the carrier's id would draw a second Voyager beside the first.
{
  try {
    const { sampleOddities, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
    const { ATTACHED_ODDITIES, attachedOdditiesFor, attachedOddityRecord, attachedOddityCount } =
      await import(join(JS, 'data/attached.js'));
    const { ODDITIES: ROWS } = await import(join(JS, 'data/oddities.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { realModelFor } = await import(join(JS, 'scene/realmodels.js'));
    const { modelFor, attachOddityModels, disposeModels } = await import(join(JS, 'scene/models.js'));
    const { drawingLine, rightNowFor } = await import(join(JS, 'ui/cards.js'));
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const ctx = { clock: { now: () => tMs } };
    const deep = new Map(sampleDeepSpace().map((r) => [r.id, r]));
    const oddityIds = new Set(sampleOddities().map((r) => r.id));

    if (!ATTACHED_ODDITIES.length) {
      problems.push('ATTACH   no attached rows at all, so everything below is a tautology');
    }
    if (attachedOddityCount() !== ATTACHED_ODDITIES.length) {
      problems.push('ATTACH   the layer count line and the attached list disagree');
    }

    let attachedChildren = 0;
    for (const entry of ATTACHED_ODDITIES) {
      // No dot. This is the whole reason the kind exists.
      if (oddityIds.has(entry.id)) {
        problems.push(`ATTACH   ${entry.id} is emitted as a record, so it has a dot of its own`);
      }
      if (!entry.carriers.length) {
        problems.push(`ATTACH   ${entry.id} names no carrier, so nothing would ever draw it`);
      }
      for (const carrierId of entry.carriers) {
        const carrier = deep.get(carrierId);
        if (!carrier) {
          problems.push(`ATTACH   ${entry.id} rides on \`${carrierId}\`, which data/sample.js does not emit`);
          continue;
        }
        if (!attachedOdditiesFor(carrierId).some((a) => a.id === entry.id)) {
          problems.push(`ATTACH   ${carrierId} carries ${entry.id} and does not answer for it`);
        }

        // THE POSITION IS THE CARRIER'S. Same vector, same frame, same class.
        const derived = attachedOddityRecord(entry, carrier);
        const a = propagate(derived, tMs);
        const b = propagate(carrier, tMs);
        if (!a || !b) {
          problems.push(`ATTACH   ${entry.id} on ${carrierId} has no position at ${new Date(tMs).toISOString()}`);
        } else {
          const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (d !== 0 || a.frame !== b.frame || a.cls !== b.cls) {
            problems.push(
              `ATTACH   ${entry.id} is drawn ${d} km from ${carrierId} in ${a.frame}/${a.cls} against ` +
                `${b.frame}/${b.cls}; an attached row inherits its carrier's position, it does not approximate it`
            );
          }
        }
        // ... and the card says the same numbers, which is the claim a visitor actually reads.
        const same = JSON.stringify(rightNowFor(derived, ctx)) === JSON.stringify(rightNowFor(carrier, ctx));
        if (!same) {
          problems.push(`ATTACH   ${entry.id}'s card gives different numbers from ${carrierId}'s`);
        }
        // No second spacecraft: the carrier's identifiers are not copied.
        if (derived.meta.horizonsId != null) {
          problems.push(`ATTACH   ${entry.id} carries a horizons id, so scene/realmodels.js would draw a second ${carrierId}`);
        }
        if (realModelFor(derived)) {
          problems.push(`ATTACH   ${entry.id} matches a real spacecraft model, which would draw a second ${carrierId}`);
        }
        if (derived.cls !== carrier.cls) {
          problems.push(`ATTACH   ${entry.id} is classed ${derived.cls} and ${carrierId} is ${carrier.cls}`);
        }

        // THE CARD ADMITS THE MOUNT. Where we hang it and how big we draw it are both ours.
        const line = drawingLine(derived);
        if (!line || !line.includes('our own arrangement')) {
          problems.push(`ATTACH   ${entry.id}'s card does not say the mount is our arrangement: ${line}`);
        }

        // THE DRAWING. A child of the carrier's model, at the registry's offset and size, and
        // INSIDE the carrier's own unit box -- a mount that missed would hang the Golden Record
        // in space beside Voyager, which looks exactly like a rendering bug and is one.
        const parent = modelFor('probe');
        const made = attachOddityModels(parent, carrierId);
        const child = made.find((c) => c.userData.attachedOddity === entry.id);
        if (!child) {
          problems.push(`ATTACH   nothing was hung on ${carrierId}'s model for ${entry.id}`);
        } else {
          attachedChildren += 1;
          if (child.parent !== parent) {
            problems.push(`ATTACH   ${entry.id} is not a child of ${carrierId}'s model`);
          }
          // Against the REGISTRY ROW, not against `entry.mount`. Comparing the drawing to the
          // list it was built from is a comparison of a value with itself: it passed while
          // data/attached.js was mutated to ignore the registry and draw everything at 0.9.
          const want = ((ROWS.find((r) => r.id === entry.id) || {}).where || {}).mount || {};
          if (child.position.x !== want.x || child.position.y !== want.y || child.position.z !== want.z) {
            problems.push(`ATTACH   ${entry.id} is drawn at ${child.position.toArray()} and the registry says ${[want.x, want.y, want.z]}`);
          }
          if (child.scale.x !== want.scale) {
            problems.push(`ATTACH   ${entry.id} is drawn at scale ${child.scale.x} and the registry says ${want.scale}`);
          }
          const sphere = new THREE.Box3().setFromObject(child).getBoundingSphere(new THREE.Sphere());
          if (!(sphere.center.length() + sphere.radius <= 1)) {
            problems.push(
              `ATTACH   ${entry.id} reaches ${(sphere.center.length() + sphere.radius).toFixed(2)} units from ` +
                `${carrierId}'s centre; every model here is a unit box, so this hangs it in space beside the spacecraft`
            );
          }
        }
        disposeModels(parent);
      }
    }
    if (attachedChildren < 3) {
      problems.push(`ATTACH   only ${attachedChildren} attached model(s) were drawn; two Voyagers and Juno carry three`);
    }

    // And the ordinary case: everything else in the app carries nothing and pays nothing.
    const plain = modelFor('probe');
    if (attachOddityModels(plain, 'deep-parker').length || plain.children.length !== modelFor('probe').children.length) {
      problems.push('ATTACH   a spacecraft that carries nothing was given children anyway');
    }

    notes.push(`${ATTACHED_ODDITIES.length} attached row(s) drawn as ${attachedChildren} children of their carriers`);
  } catch (e) {
    problems.push(`ATTACH   could not check the attached oddities: ${String(e && e.stack || e)}`);
  }
}

// 3j. the camera contract a guided trip needs. Six additions and one live bug, and every one of
// them is a promise about a CALLBACK or about the shape of a move -- which is to say, exactly the
// class of thing that looks right in the source and is wrong in the browser.
//
// The three that matter most, and why each is here rather than in a comment:
//
//   * A FLIGHT ENDS EXACTLY ONCE AND SAYS HOW. flyTo used to drop a superseded flight's onArrive,
//     and a pointer drag used to drop the live one's, both silently. Anything driven by arrivals
//     therefore hangs forever the first time somebody touches the canvas -- and there is no input
//     lockout to stop them touching it.
//   * ms: 0 MEANS INSTANT. It did not: `opts.ms > 0` sent zero to the 750 ms default, and
//     main.js:80 has been asking for an instant set at boot and silently getting a flight.
//   * A COMPLETION CALLBACK NEVER RUNS INSIDE ANOTHER ONE. Under prefers-reduced-motion a flight
//     arrives synchronously, so the obvious `onArrive: () => flyTo(next)` is a recursive chain
//     that runs a whole itinerary in one tick and overflows the stack if it loops. It fails only
//     for the people the flag protects, which is why it needs a test and not a warning.
{
  const failed = (msg) => problems.push(`CAMERA   ${msg}`);
  const near = (got, want, tol, what) => {
    if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
      failed(`${what}: expected ${want} +/- ${tol}, got ${got}`);
      return false;
    }
    return true;
  };
  /** A canvas that records its listeners, so a synthetic drag can reach the rig. */
  const stubElement = () => {
    const on = new Map();
    return {
      style: {},
      clientWidth: 800,
      clientHeight: 600,
      addEventListener(kind, fn) {
        if (!on.has(kind)) on.set(kind, []);
        on.get(kind).push(fn);
      },
      removeEventListener() {},
      dispatchEvent() { return true; },
      setPointerCapture() {},
      releasePointerCapture() {},
      fire(kind, event) { for (const fn of on.get(kind) || []) fn(event); },
    };
  };

  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { createCameraRig, CAMERA_EASES } = await import(join(JS, 'scene/camera.js'));
    const DEG = Math.PI / 180;
    const rigOf = (dom = null) => {
      const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
      camera.position.set(0, 0, 10);
      // worldRadius 0: no clearance sphere, so every distance below is the one that was asked for.
      return createCameraRig(camera, dom, { worldRadius: 0 });
    };
    // Every step is 0.1 s because update() clamps a single step to 0.25 s.
    const run = (rig, seconds) => { for (let i = 0; i < Math.round(seconds / 0.1); i += 1) rig.update(0.1); };

    // --- the named curves ------------------------------------------------------------------
    for (const [name, fn] of Object.entries(CAMERA_EASES)) {
      if (fn(0) !== 0 || Math.abs(fn(1) - 1) > 1e-9) failed(`ease '${name}' does not run 0 -> 1`);
      let last = -1;
      for (let i = 0; i <= 20; i += 1) {
        const v = fn(i / 20);
        if (v < last - 1e-9) { failed(`ease '${name}' is not monotonic at ${i / 20}`); break; }
        last = v;
      }
    }
    near(CAMERA_EASES.linear(0.5), 0.5, 1e-9, "ease 'linear' is linear");
    // Trapezoidal 15/70/15: by the end of the acceleration ramp it has covered v*a/2 of the move.
    near(CAMERA_EASES.cruise(0.15), 0.0882, 0.001, "ease 'cruise' covers 8.8% during its ramp-in");
    if (!(CAMERA_EASES.cruise(0.15) > CAMERA_EASES.inout(0.15))) {
      failed("ease 'cruise' is not moving sooner than 'inout'; that is the whole reason it exists");
    }

    // --- the default flight is unchanged --------------------------------------------------
    {
      const rig = rigOf();
      let reasons = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => reasons.push(r) });
      if (!rig.state.flying) failed('a normal flyTo did not start a flight');
      run(rig, 0.4);
      if (!(rig.state.distance > 10 && rig.state.distance < 40)) {
        failed(`half way through an 800 ms flight the distance is ${rig.state.distance}`);
      }
      if (reasons.length) failed(`onArrive fired ${reasons[0]} half way through the flight`);
      run(rig, 0.5);
      if (rig.state.flying) failed('an 800 ms flight was still flying after 900 ms');
      if (reasons.join() !== 'done') failed(`arrival reported [${reasons}], expected [done]`);
      near(rig.state.distance, 40, 1e-6, 'a completed flight is at the distance it was given');
    }

    // --- ms: 0 is instant, and it is the bug at main.js:80 --------------------------------
    {
      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 22, ms: 0, onArrive: (r) => seen.push(r) });
      if (rig.state.flying) failed('ms: 0 started a flight; it means instant');
      near(rig.state.distance, 22, 1e-9, 'ms: 0 sets the distance before it returns');
      if (seen.join() !== 'done') failed(`ms: 0 reported [${seen}] before returning, expected [done]`);
      run(rig, 1.0);
      if (seen.length !== 1) failed(`ms: 0 fired its arrival ${seen.length} times`);
    }

    // --- a superseded flight is told, never dropped ---------------------------------------
    {
      const rig = rigOf();
      const first = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => first.push(r) });
      run(rig, 0.2);
      rig.flyTo({ distance: 60, ms: 800 });
      if (first.join() !== 'replaced') failed(`a superseded flight reported [${first}], expected [replaced]`);

      const rig2 = rigOf();
      const arrive = [];
      const cancel = [];
      rig2.flyTo({ distance: 40, ms: 800, onArrive: (r) => arrive.push(r), onCancel: (r) => cancel.push(r) });
      run(rig2, 0.2);
      rig2.flyTo({ distance: 60, ms: 800 });
      if (cancel.join() !== 'replaced') failed(`onCancel got [${cancel}], expected [replaced]`);
      if (arrive.length) failed(`onArrive also fired [${arrive}] for a cancelled flight; exactly one callback runs`);
    }

    // --- a drag cancels the flight AND says so --------------------------------------------
    // The bug this replaces is the one that hangs a tour permanently the first time a user
    // touches the canvas, with no lockout to stop them.
    {
      const dom = stubElement();
      const rig = rigOf(dom);
      const seen = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => seen.push(r) });
      run(rig, 0.2);
      dom.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
      dom.fire('pointermove', { pointerId: 1, clientX: 140, clientY: 120, buttons: 1 });
      if (rig.state.flying) failed('a drag did not end the flight');
      if (seen.join() !== 'cancelled') failed(`a drag reported [${seen}], expected [cancelled]`);
      run(rig, 1.0);
      if (seen.length !== 1) failed(`a cancelled flight reported ${seen.length} times`);
    }

    // --- finishFlight(): a seek, not a fifth half-finished sweep ---------------------------
    {
      const want = rigOf();
      want.flyTo({ distance: 40, azimuth: 1.1, polar: 1.3, ms: 800 });
      run(want, 1.0);

      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 40, azimuth: 1.1, polar: 1.3, ms: 800, onArrive: (r) => seen.push(r) });
      run(rig, 0.3);
      if (rig.finishFlight() !== true) failed('finishFlight() during a flight returned false');
      if (rig.state.flying) failed('finishFlight() left the rig flying');
      if (seen.join() !== 'skipped') failed(`finishFlight() reported [${seen}], expected [skipped]`);
      near(rig.state.distance, want.state.distance, 1e-6, 'finishFlight() lands at the flight distance');
      near(rig.state.azimuth, want.state.azimuth, 1e-6, 'finishFlight() lands at the flight azimuth');
      near(rig.state.target.distanceTo(want.state.target), 0, 1e-6, 'finishFlight() lands at the flight look-at');
      if (rig.finishFlight() !== false) failed('finishFlight() with no flight returned true');
      if (seen.length !== 1) failed(`finishFlight() reported ${seen.length} times`);
    }

    // --- opts.targetDelay ------------------------------------------------------------------
    // The lag is not a bug to remove -- it is what keeps the world you are leaving in shot -- but
    // at close framing the subject walks off screen and back, so it has to be a parameter.
    {
      const held = rigOf();
      held.flyTo({ targetScene: { x: 100, y: 0, z: 0 }, distance: 10, ms: 1000 });
      run(held, 0.3); // inside the default 0.34 delay
      near(held.state.target.length(), 0, 1e-9, 'the default targetDelay holds the look-at for the first third');

      const eager = rigOf();
      eager.flyTo({ targetScene: { x: 100, y: 0, z: 0 }, distance: 10, ms: 1000, targetDelay: 0 });
      run(eager, 0.3);
      if (!(eager.state.target.length() > 1)) {
        failed(`targetDelay: 0 still froze the look-at (${eager.state.target.length()})`);
      }
    }

    // --- opts.ease -------------------------------------------------------------------------
    {
      const lin = rigOf();
      lin.flyTo({ distance: 1000, ms: 1000, ease: 'linear' });
      run(lin, 0.5);
      // Distance is interpolated in LOG space, so half way is the geometric mean, not the mean.
      near(lin.state.distance, Math.sqrt(10 * 1000), 0.5, "ease 'linear' is linear in log distance");
      const ui = rigOf();
      ui.flyTo({ distance: 1000, ms: 1000 });
      run(ui, 0.5);
      if (Math.abs(ui.state.distance - lin.state.distance) < 1) {
        failed('the default ease and linear agree half way through; opts.ease is not reaching the flight');
      }
    }

    // --- opts.apex -------------------------------------------------------------------------
    // Two stops far apart laterally otherwise sweep across at close range. This is the pull-back.
    {
      const rig = rigOf();
      rig.flyTo({
        targetScene: { x: 500, y: 0, z: 0 },
        distance: 10,
        ms: 1000,
        ease: 'linear',
        apex: { distance: 1000, at: 0.5 },
      });
      run(rig, 0.5);
      near(rig.state.distance, 1000, 1, 'the apex distance is reached at its own fraction');
      run(rig, 0.5);
      near(rig.state.distance, 10, 1e-6, 'a flight with an apex still arrives at its own distance');

      const flat = rigOf();
      flat.flyTo({ targetScene: { x: 500, y: 0, z: 0 }, distance: 10, ms: 1000, ease: 'linear' });
      run(flat, 0.5);
      if (flat.state.distance > 11) failed('a flight with no apex pulled back anyway');
    }

    // --- orbit(): the constant turn flyTo cannot do -----------------------------------------
    {
      const rig = rigOf();
      const az0 = rig.state.azimuth;
      const seen = [];
      if (rig.orbit({ deg: 540, degPerSec: 90, onDone: (r) => seen.push(r) }) !== true) {
        failed('orbit() refused a plain drift');
      }
      if (!rig.state.orbiting) failed('orbit() did not set state.orbiting');
      run(rig, 1.0);
      near((rig.state.azimuth - az0) / DEG, 90, 0.5, 'orbit() turns at the rate it was given');
      run(rig, 5.1);
      // Unwrapped: a flight runs its azimuth through shortestAngle and can never turn more than
      // half a circle, which is why chaining flights was never going to be the orbit.
      near((rig.state.azimuth - az0) / DEG, 540, 0.01, 'orbit() turns a signed, unwrapped 540 degrees');
      if (seen.join() !== 'done') failed(`orbit() reported [${seen}], expected [done]`);
      if (rig.state.orbiting) failed('orbit() left state.orbiting set after it finished');

      const back = rigOf();
      const bz = back.state.azimuth;
      back.orbit({ deg: -34, degPerSec: 6 });
      run(back, 6.0);
      near((back.state.azimuth - bz) / DEG, -34, 0.01, 'orbit() takes a signed delta');

      // And the half-circle limit it exists to route around, measured rather than asserted.
      const flight = rigOf();
      const fz = flight.state.azimuth;
      flight.flyTo({ azimuth: fz + 3 * Math.PI, polar: flight.state.polar, ms: 200 });
      run(flight, 0.4);
      if (Math.abs(flight.state.azimuth - fz) > Math.PI + 1e-6) {
        failed('flyTo turned more than half a circle; shortestAngle is gone and orbit()’s reason with it');
      }
    }

    // --- orbit() never fights a flight, and never calls back synchronously ------------------
    {
      const rig = rigOf();
      rig.flyTo({ distance: 40, ms: 800 });
      const seen = [];
      if (rig.orbit({ deg: 34, onDone: (r) => seen.push(r) }) !== false) {
        failed('orbit() started while a flight was running');
      }
      if (seen.length) failed(`orbit() called back synchronously: [${seen}]`);
      rig.update(0.1);
      if (seen.join() !== 'refused') failed(`a refused orbit reported [${seen}] on the next frame`);

      const rig2 = rigOf();
      const done2 = [];
      rig2.orbit({ deg: 0, onDone: (r) => done2.push(r) });
      if (done2.length) failed('orbit({deg: 0}) called back before it returned');
      rig2.update(0.1);
      if (done2.join() !== 'done') failed(`orbit({deg: 0}) reported [${done2}]`);

      const rig3 = rigOf();
      const done3 = [];
      rig3.orbit({ deg: 34, degPerSec: 6, onDone: (r) => done3.push(r) });
      rig3.update(0.1);
      rig3.flyTo({ distance: 40, ms: 800 });
      if (rig3.state.orbiting) failed('a flight did not stop the drift');
      rig3.update(0.1);
      if (done3.join() !== 'replaced') failed(`a drift ended by a flight reported [${done3}]`);

      const dom = stubElement();
      const rig4 = rigOf(dom);
      const done4 = [];
      rig4.orbit({ deg: 34, degPerSec: 6, onDone: (r) => done4.push(r) });
      rig4.update(0.1);
      dom.fire('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
      dom.fire('pointermove', { pointerId: 1, clientX: 30, clientY: 10, buttons: 1 });
      rig4.update(0.1);
      if (done4.join() !== 'cancelled') failed(`a drift a user interrupted reported [${done4}]`);
    }

    // --- prefers-reduced-motion: the cut, and the recursion that is not possible -------------
    const hadMatchMedia = Object.prototype.hasOwnProperty.call(globalThis, 'matchMedia');
    const savedMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      const rig = rigOf();
      const fades = [];
      rig.onFade((ms) => fades.push(ms));
      let sync = false;
      rig.flyTo({ distance: 40, ms: 800, onArrive: () => { sync = true; } });
      if (rig.state.flying) failed('reduced motion started a flight instead of cutting');
      near(rig.state.distance, 40, 1e-9, 'a reduced-motion flight sets the distance');
      if (!sync) failed('reduced motion did not arrive before flyTo returned; the trap has moved, and every caller was written for it');
      if (fades.join() !== '220') failed(`reduced motion emitted fades [${fades}], expected [220]`);

      // THE ONE THAT MATTERS. The naive itinerary -- advance from inside onArrive -- against the
      // synchronous arrival above. If a completion callback could run inside another, this is a
      // recursive chain: no frame drawn, and a stack overflow the moment a trip loops. Here it
      // must advance at most one stop per update() and never re-enter itself.
      const chain = rigOf();
      const STOPS = 200;
      let depth = 0;
      let maxDepth = 0;
      let arrived = 0;
      const step = () => {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
        arrived += 1;
        if (arrived < STOPS) chain.flyTo({ distance: 10 + arrived, ms: 800, onArrive: step });
        depth -= 1;
      };
      chain.flyTo({ distance: 10, ms: 800, onArrive: step });
      for (let i = 0; i < STOPS + 20 && arrived < STOPS; i += 1) chain.update(0.016);
      if (maxDepth !== 1) failed(`a chained itinerary re-entered its own callback ${maxDepth} deep under reduced motion`);
      if (arrived !== STOPS) failed(`a chained itinerary reached ${arrived} of ${STOPS} stops`);

      // A cut is not a fast move: the drift does not run at all, and it says which happened.
      const still = rigOf();
      const az0 = still.state.azimuth;
      const seen = [];
      if (still.orbit({ deg: 34, onDone: (r) => seen.push(r) }) !== false) {
        failed('orbit() drifted under reduced motion');
      }
      if (seen.length) failed(`a drift refused for reduced motion called back before returning: [${seen}]`);
      still.update(0.5);
      near(still.state.azimuth, az0, 1e-9, 'reduced motion leaves the camera still');
      if (seen.join() !== 'reduced-motion') failed(`a refused drift reported [${seen}]`);
      // --- THE ARROW KEYS FLY IT ----------------------------------------------------------
      //
      // Ivan asked for "controle with arrows (like in space video games so user will be able to
      // travel with arrows)". Held, not tapped -- so what is tested is that holding moves the
      // camera for as long as it is held, at a rate per second, and that letting go stops it.
      //
      // The rest of these cases are the ways a key is NOT ours: somebody typing, a trip that owns
      // the arrows for its stops, a browser shortcut, and a window that lost focus while a key was
      // down -- which sends no keyup, and would otherwise leave the camera turning for ever.
      {
        const keys = { handlers: {},
          addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
          removeEventListener(type, fn) { this.handlers[type] = (this.handlers[type] || []).filter((f) => f !== fn); },
          send(type, e) { for (const fn of this.handlers[type] || []) fn(e); } };
        const key = (k, over = {}) => ({ key: k, preventDefault() { this.defaultPrevented = true; }, defaultPrevented: false, target: {}, ...over });
        let tripRunning = false;
        const cam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
        cam.position.set(0, 0, 10);
        const rig = createCameraRig(cam, null, { worldRadius: 0, keyTarget: keys, keysEnabled: () => !tripRunning });
        rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 10, ms: 0 });
        rig.update(0.1);

        const az0 = rig.state.azimuth;
        keys.send('keydown', key('ArrowLeft'));
        run(rig, 0.5);
        const azHeld = rig.state.azimuth;
        if (!(Math.abs(azHeld - az0) > 0.2)) failed(`holding ArrowLeft for half a second moved the camera ${(azHeld - az0).toFixed(3)} rad`);
        keys.send('keyup', key('ArrowLeft'));
        run(rig, 2);
        const azRest = rig.state.azimuth;
        run(rig, 2);
        if (Math.abs(rig.state.azimuth - azRest) > 1e-6) failed('the camera keeps turning after the key is released');

        // Distance: held W (or PageUp) comes closer, S goes out.
        const d0 = rig.state.distance;
        keys.send('keydown', key('w'));
        run(rig, 0.5);
        keys.send('keyup', key('w'));
        run(rig, 1.5);
        if (!(rig.state.distance < d0 * 0.95)) failed(`holding W did not come closer (${d0} -> ${rig.state.distance})`);

        // Not ours: typing, a running trip, a browser shortcut, and an already-handled key.
        const refuse = (label, k) => {
          const before = rig.state.azimuth;
          keys.send('keydown', k);
          run(rig, 0.5);
          keys.send('keyup', k);
          run(rig, 1);
          if (Math.abs(rig.state.azimuth - before) > 1e-6) failed(`${label} moved the camera and must not`);
        };
        refuse('typing in an input', key('ArrowLeft', { target: { tagName: 'INPUT' } }));
        refuse('typing in a contenteditable', key('ArrowLeft', { target: { isContentEditable: true } }));
        refuse('a browser shortcut', key('ArrowLeft', { metaKey: true }));
        refuse('a key another handler already took', key('ArrowLeft', { defaultPrevented: true }));
        tripRunning = true;
        refuse('an arrow during a trip, which belongs to the stops', key('ArrowLeft'));
        tripRunning = false;

        // A window that loses focus never sends the keyup.
        keys.send('keydown', key('ArrowRight'));
        run(rig, 0.2);
        keys.send('blur', {});
        run(rig, 2);
        const azAfterBlur = rig.state.azimuth;
        run(rig, 2);
        if (Math.abs(rig.state.azimuth - azAfterBlur) > 1e-6) failed('a key held when the window lost focus leaves the camera turning');
        rig.dispose();
      }

      notes.push(
        `camera: reduced motion cuts and fades 220 ms; ${STOPS} chained stops ran at callback ` +
          `depth ${maxDepth}`
      );
    } finally {
      if (hadMatchMedia) globalThis.matchMedia = savedMatchMedia;
      else delete globalThis.matchMedia;
    }

    // --- disposing a rig does not leave a caller waiting ------------------------------------
    {
      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => seen.push(r) });
      rig.dispose();
      if (seen.join() !== 'cancelled') failed(`dispose() reported [${seen}], expected [cancelled]`);
    }
  } catch (e) {
    failed(`could not check the camera contract: ${String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)}`);
  }
}

// --- every stop in registry/tours.yaml names something that exists ------------------------
//
// THE VALIDATOR CANNOT ANSWER THIS AND THIS CAN. scripts/check_registry.py knows what is in the
// registries; it does not know what site/js/data/sample.js actually EMITS, and a stop is resolved
// in the browser through ctx.recordById(). A trip stop naming `deep-voyager-1` is right or wrong
// depending on a hand-written emitter in another file, and the failure is silent: the stop is
// dropped and the count is printed afterwards, so a six-stop trip quietly becomes a five-stop one
// and nothing anywhere says which stop went or why.
//
// Also checked: the `ease:` a registry row asks for is one the camera rig actually has. That is
// two registries and one module having to agree about a name, which is the failure this whole
// harness was written for.
{
  try {
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const { sampleOddities, sampleDeepSpace, handKeptSites } = await import(join(JS, 'data/sample.js'));
    const { LAYERS } = await import(join(JS, 'data/layers.js'));
    const { WORLDS } = await import(join(JS, 'scene/worlds.js'));
    const { CAMERA_EASES } = await import(join(JS, 'scene/camera.js'));

    // Every producer of records that ship IN THIS REPOSITORY (spec 0028 added four): the worlds,
    // the named stars, the placed deep-sky objects, and the layers whose `sample()` is the data.
    const { worldRecords } = await import(join(JS, 'scene/worlds.js'));
    const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
    const { parseDso } = await import(join(JS, 'data/parsers.js'));
    const starNames = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows;
    const dsoDoc = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
    const bundled = new Set([
      ...sampleOddities().map((r) => r.id),
      ...sampleDeepSpace().map((r) => r.id),
      ...handKeptSites().map((r) => r.id),
      ...worldRecords().map((r) => r.id),
      ...recordsFromNames(starNames).map((r) => r.id),
      ...parseDso(dsoDoc).map((r) => r.id),
      ...LAYERS.filter((l) => l.source === 'bundled' && typeof l.sample === 'function' && !l.parse).flatMap((l) => l.sample()).map((r) => r.id),
    ]);
    const layerIds = new Set(LAYERS.map((l) => l.id));
    const worldIds = new Set(WORLDS.map((w) => w.id));
    const eases = new Set([...Object.keys(CAMERA_EASES), 'auto']);

    let stops = 0;
    let resolvable = 0;
    for (const tour of TOURS) {
      // Two registries, one word, two meanings: the layer is `oddities` and the trip that visits
      // it is `strangest-things`. check_registry.py refuses the collision; this is the browser's
      // half of the same claim, because LAYERS is the list the app actually reads.
      if (layerIds.has(tour.id)) {
        problems.push(`TOUR     trip '${tour.id}' has the same id as a layer the app loads`);
      }
      for (const stop of tour.stops) {
        stops += 1;
        if (!eases.has(stop.ease)) {
          problems.push(`TOUR     ${tour.id}/${stop.id}: ease '${stop.ease}' is not one the rig has`);
        }
        if (!(stop.dwell_ms >= 8000)) {
          problems.push(`TOUR     ${tour.id}/${stop.id}: dwell ${stop.dwell_ms} ms is under the 8 s floor`);
        }
        const target = stop.target || {};
        if (target.world !== undefined) {
          if (worldIds.has(target.world)) resolvable += 1;
          else problems.push(`TOUR     ${tour.id}/${stop.id}: world '${target.world}' is not in WORLDS`);
        } else if (target.layer !== undefined) {
          // A live-feed member: which record it picks depends on a network the runner does not
          // have, so the checkable half is that the LAYER exists and is one the app loads.
          if (layerIds.has(target.layer)) resolvable += 1;
          else problems.push(`TOUR     ${tour.id}/${stop.id}: layer '${target.layer}' is not in LAYERS`);
        } else if (target.observer !== undefined) {
          // The visitor's own place (spec 0038): no record to find, and it needs no network, only a
          // place set or guessed. It is only legal on a trip that says it needs one.
          if (target.observer === true && tour.requires_observer === true) resolvable += 1;
          else problems.push(`TOUR     ${tour.id}/${stop.id}: an observer stop on a trip without requires_observer`);
        } else {
          const id = target.record ?? target.site;
          if (bundled.has(id)) resolvable += 1;
          else {
            problems.push(
              `TOUR     ${tour.id}/${stop.id}: '${id}' is not emitted by data/sample.js or any other bundled producer, so ` +
                `recordById() returns null and this stop is silently dropped`
            );
          }
        }
      }
    }
    notes.push(`tours: ${TOURS.length} trips, ${stops} stops, ${resolvable} resolvable without a network`);

    // A TRIP CARD ADDS TO THE OBJECT'S CARD; IT DOES NOT REPEAT IT. The object's card opens under
    // the trip's in the same panel, first line first. On 2026-09-22 four of the six "strangest
    // things" stops said the same sentence twice, a few words apart. Six words in a row shared with
    // the record's own `fact` or `note` is a repeat -- or, for a landing site, with the row's
    // `doing:` sentence, which is the first line of a site card (the Moon trip, 2026-09-22).
    const words = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
    const sharedRun = (a, b) => {
      const A = words(a), B = words(b);
      let best = 0;
      for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
        let k = 0;
        while (i + k < A.length && j + k < B.length && A[i + k] === B[j + k]) k++;
        if (k > best) best = k;
      }
      return best;
    };
    const byId = new Map([...sampleOddities(), ...sampleDeepSpace(), ...handKeptSites()].map((r) => [r.id, r]));
    let compared = 0;
    for (const tour of TOURS) for (const stop of tour.stops) {
      const rec = stop.target && byId.get(stop.target.record ?? stop.target.site);
      if (!rec || !stop.card) continue;
      for (const own of [rec.meta && rec.meta.fact, rec.meta && rec.meta.note, rec.meta && rec.meta.doing]) {
        if (!own) continue;
        compared += 1;
        const run = sharedRun(stop.card.body, own);
        if (run >= 6) problems.push(`TOUR     ${tour.id}/${stop.id}: the trip card repeats ${run} words of the record's own card, which opens right under it`);
      }
    }
    notes.push(`trip cards: ${compared} compared with the record card under them, none repeats it`);

    // SPEC 0034: A CHAPTER NAMES THE PART OF THE STORY, NOT THE STOP. The chapter line sits in the
    // top bar while the card title is in the card; six words in a row shared is the same line
    // twice on one screen. scripts/check_registry.py refuses it where it is written; this is the
    // same rule over the mirror the browser actually reads.
    let chapters = 0;
    for (const tour of TOURS) for (const stop of tour.stops) {
      if (!stop.chapter) continue;
      chapters += 1;
      const title = stop.card && stop.card.title;
      if (String(stop.chapter).length > 40) problems.push(`TOUR     ${tour.id}/${stop.id}: chapter is ${String(stop.chapter).length} characters, over 40`);
      if (String(stop.chapter).includes('--')) problems.push(`TOUR     ${tour.id}/${stop.id}: the chapter prints two hyphens`);
      const run = sharedRun(stop.chapter, title);
      if (run >= 6 || String(stop.chapter).toLowerCase() === String(title || '').toLowerCase()) {
        problems.push(`TOUR     ${tour.id}/${stop.id}: the chapter repeats ${run} words of the card title`);
      }
    }
    notes.push(`chapters: ${chapters} written, none repeats its card title`);
  } catch (e) {
    problems.push(`TOUR     could not check registry/tours.yaml against the app: ${String(e)}`);
  }
}

// --- the length a trip promises is the length two files computed ---------------------------
//
// The intro card and the panel row both say "5 stops, about two minutes". That sentence is built
// from `estimate_ms`, which scripts/gen_tours_js.py writes into the mirror -- and from the same
// arithmetic done again in site/js/ui/trip.js over the stops that actually RESOLVED, because the
// trip on offer is not always the trip the file describes.
//
// Two files computing one promise is exactly the kind of agreement that rots silently: change the
// per-flight allowance in one and the number a visitor is shown quietly stops being the number
// anybody computed. Nothing in the browser would notice, which is why this is here.
{
  try {
    const gen = readFileSync(join(ROOT, 'scripts/gen_tours_js.py'), 'utf8');
    const trip = readFileSync(join(JS, 'ui/trip.js'), 'utf8');
    const num = (src, name, re) => {
      const m = src.match(re);
      if (!m) {
        problems.push(`TRIP     could not find ${name}; the two halves of the promise cannot be compared`);
        return null;
      }
      return Number(m[1]);
    };
    const genFlight = num(gen, 'FLIGHT_ESTIMATE_MS in the generator', /FLIGHT_ESTIMATE_MS\s*=\s*(\d+)/);
    const genSettle = num(gen, 'SETTLE_MS in the generator', /SETTLE_MS\s*=\s*(\d+)/);
    const tripFlight = num(trip, 'FLIGHT_ESTIMATE_MS in ui/trip.js', /FLIGHT_ESTIMATE_MS\s*=\s*(\d+)/);
    const tripSettle = num(trip, 'SETTLE_MS in ui/trip.js', /const SETTLE_MS\s*=\s*(\d+)/);
    if (genFlight !== null && tripFlight !== null && genFlight !== tripFlight) {
      problems.push(
        `TRIP     the per-flight allowance is ${genFlight} ms in the generator and ${tripFlight} ms ` +
          `in ui/trip.js, so the length on the row and the length in the mirror are two numbers`
      );
    }
    if (genSettle !== null && tripSettle !== null && genSettle !== tripSettle) {
      problems.push(`TRIP     SETTLE_MS is ${genSettle} in the generator and ${tripSettle} in ui/trip.js`);
    }

    // And the sentence itself never promises LESS time than it was given. Understating is the
    // direction that breaks a promise; overstating only ends the trip early.
    const { shapeLine } = await import(join(JS, 'ui/tripframe.js'));
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    for (const tour of TOURS) {
      const line = shapeLine(tour.stops.length, tour.estimate_ms);
      const mins = Number((line.match(/about (\d+) minutes/) || [])[1]);
      if (Number.isFinite(mins) && mins * 60000 < tour.estimate_ms) {
        problems.push(`TRIP     '${tour.id}' is offered as ${line} but runs ${tour.estimate_ms} ms`);
      }
      if (!Number.isFinite(mins) && tour.estimate_ms > 90000) {
        problems.push(`TRIP     '${tour.id}' runs ${tour.estimate_ms} ms and is offered as "${line}"`);
      }
      if (!line.includes(String(tour.stops.length))) {
        problems.push(`TRIP     '${tour.id}' is offered as "${line}", which does not state its stop count`);
      }
    }
    notes.push(
      `trips: the flight allowance is ${tripFlight} ms in both halves; ` +
        `${TOURS.map((x) => shapeLine(x.stops.length, x.estimate_ms)).join('; ')}`
    );
  } catch (e) {
    problems.push(`TRIP     could not check the promised length: ${String(e)}`);
  }
}

// --- the reader of the harvester's snapshots (spec 0003 amendment 1, §3 and §4) ---------------
//
// Three routes, and one assertion that matters more than the others. With a manifest and a file,
// a source is read from our snapshot and the upstream is never asked. Without a manifest, a
// `browser: true` row falls back to the direct fetch it has always made. Without a manifest, a
// `browser: false` row says "could not look" -- and the fake fetch below must NEVER have seen the
// upstream URL, because a request a browser cannot read still costs the host its rate limit and
// would be a request made in the hope of an answer we already know we cannot use.
{
  const savedFetch = globalThis.fetch;
  try {
    const { SOURCES, load, status, harvestStatus, forget, forgetIndex } = await import(
      join(JS, 'data/sources.js')
    );
    const seen = [];
    let routes = new Map();
    globalThis.fetch = async (url) => {
      const u = String(url);
      seen.push(u);
      const route = routes.get(u);
      return route ? route() : new Response('', { status: 404 });
    };
    const json = (body, code = 200) => () =>
      new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
    const reset = (...ids) => {
      seen.length = 0;
      forgetIndex();
      for (const id of ids) forget(id);
    };
    const upstreamSeen = () => seen.filter((u) => !u.startsWith('/data/v1/'));

    // A body shaped like CelesTrak's, a harvester read ten minutes ago, a fresher copy promised
    // in three hours. Real wall-clock times, because `stale` and `overdue` are measured against it.
    const gp = [{ OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544, EPOCH: '2026-09-08T00:00:00' }];
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const inThreeHours = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const anHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const manifest = (snapshots, schema = 1) => ({
      schema,
      generated_at: tenMinutesAgo,
      run: { started_at: tenMinutesAgo, duration_ms: 1, runner: 'local' },
      snapshots,
    });
    const snapRow = (state, extra = {}) => ({
      fetched_at: tenMinutesAgo, valid_until: inThreeHours, items: 1, bytes: 1, duration_ms: 1,
      status: state, last_error: null, etag: null, ...extra,
    });
    const snapFile = (source, body, extra = {}) => ({
      schema: 1, source, fetched_at: tenMinutesAgo, valid_until: inThreeHours,
      upstream_url: SOURCES[source] ? SOURCES[source].url : 'x', content_type: 'application/json',
      items: 1, body, ...extra,
    });
    const stations = SOURCES['celestrak-stations'];
    const jpl = SOURCES['jpl-sbdb-neo'];
    const tip = SOURCES['space-track-tip'];
    if (stations.browser !== true || jpl.browser !== false || tip.browser !== false) {
      problems.push('SNAPSHOT the three rows this section leans on no longer have the browser flags it assumes');
    }

    // (a) manifest + file -> via snapshot; the upstream is not asked; the age is the harvester's
    reset('celestrak-stations');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('ok') }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp))],
    ]);
    let r = await load('celestrak-stations', { await: true });
    if (r.via !== 'snapshot' || !r.ok) {
      problems.push(`SNAPSHOT manifest + file should read via snapshot; got via=${r.via} ok=${r.ok} error=${r.error} reason=${r.reason} snapshot=${r.snapshot}`);
    }
    if (JSON.stringify(r.data) !== JSON.stringify(gp)) problems.push('SNAPSHOT the body must reach the caller verbatim');
    if (r.fetchedAt !== Date.parse(tenMinutesAgo)) problems.push(`SNAPSHOT fetchedAt must be the harvester's fetched_at, got ${r.fetchedAt}`);
    if (r.validUntil !== Date.parse(inThreeHours)) problems.push(`SNAPSHOT validUntil must be the harvester's valid_until, got ${r.validUntil}`);
    if (r.stale) problems.push('SNAPSHOT a copy fetched ten minutes ago is inside every freshness window');
    if (r.overdue) problems.push('SNAPSHOT a copy valid for three more hours is not overdue');
    if (upstreamSeen().length) problems.push(`SNAPSHOT the upstream was asked while a snapshot existed: ${upstreamSeen().join(', ')}`);
    const row = status().find((x) => x.id === 'celestrak-stations');
    if (!row || row.via !== 'snapshot' || row.state !== 'ok') {
      problems.push(`SNAPSHOT status() should say via snapshot / ok; got ${row && row.via} / ${row && row.state}`);
    }
    const h = harvestStatus();
    if (!h.available || h.counts.ok !== 1 || h.counts.good !== 1 || h.generatedAt !== Date.parse(tenMinutesAgo)) {
      problems.push(`SNAPSHOT harvestStatus() should report the manifest it read; got ${JSON.stringify(h)}`);
    }

    // (a2) past valid_until: said as overdue, and the stale ladder is still the source's own
    reset('celestrak-stations');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('not-due', { valid_until: anHourAgo }) }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp, { valid_until: anHourAgo }))],
    ]);
    r = await load('celestrak-stations', { await: true });
    if (r.via !== 'snapshot') problems.push(`SNAPSHOT a not-due row still has its file from the earlier run; got via=${r.via} snapshot=${r.snapshot}`);
    if (!r.overdue) problems.push('SNAPSHOT a snapshot past its valid_until must say so');
    if (r.stale) problems.push('SNAPSHOT overdue is not stale: the ladder is freshnessMaxMs, and ten minutes is inside it');

    // (a3) a cached live FAILURE must not hide a snapshot that appears afterwards. MEASURED
    // 2026-09-08: a page whose live fetch timed out kept saying "could not look" for the source's
    // whole cadence although the manifest had a fresh snapshot minutes later. The gate now asks
    // the index, on its own cadence, for a snapshot NEWER than the failed attempt -- and never
    // touches upstream for it.
    reset('celestrak-stations');
    const t0 = Date.now();
    routes = new Map([[stations.url, () => new Response('', { status: 500 })]]); // no manifest at all
    r = await load('celestrak-stations', { await: true, now: t0 });
    if (r.ok || r.via) problems.push(`SNAPSHOT (a3) the first attempt should fail live; got ok=${r.ok} via=${r.via}`);
    const afterFailure = upstreamSeen().length;
    // an OLDER snapshot than the attempt: still inside the gate, still no upstream call
    const older = new Date(t0 - 60 * 1000).toISOString();
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('ok', { fetched_at: older }) }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp, { fetched_at: older }))],
    ]);
    r = await load('celestrak-stations', { await: true, now: t0 + 6 * 60 * 1000 });
    if (r.via === 'snapshot') problems.push('SNAPSHOT (a3) a snapshot OLDER than the failed attempt must not reopen the gate');
    if (upstreamSeen().length !== afterFailure) problems.push('SNAPSHOT (a3) checking our own manifest must not touch upstream');
    // a NEWER snapshot: taken, within the cadence, with no upstream call
    const newer = new Date(t0 + 3 * 60 * 1000).toISOString();
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('ok', { fetched_at: newer }) }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp, { fetched_at: newer }))],
    ]);
    forgetIndex();
    r = await load('celestrak-stations', { await: true, now: t0 + 7 * 60 * 1000 });
    if (r.via !== 'snapshot' || !r.ok) problems.push(`SNAPSHOT (a3) a snapshot newer than the failed attempt must be read within the cadence; got via=${r.via} ok=${r.ok} reason=${r.reason}`);
    if (upstreamSeen().length !== afterFailure) problems.push(`SNAPSHOT (a3) taking the snapshot must not touch upstream: ${upstreamSeen().join(', ')}`);

    // (b) the manifest is keyed by REGISTRY id, which is not always this module's id
    reset('celestrak-starlink');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-supplemental-starlink': snapRow('ok') }))],
      ['/data/v1/celestrak-supplemental-starlink.json', json(snapFile('celestrak-supplemental-starlink', gp))],
    ]);
    r = await load('celestrak-starlink', { await: true });
    if (r.via !== 'snapshot') {
      problems.push(`SNAPSHOT celestrak-starlink must read /data/v1/${SOURCES['celestrak-starlink'].registryId}.json; got via=${r.via} snapshot=${r.snapshot}`);
    }

    // (c) no manifest, browser: true -> live, and it says why the snapshot was not the source
    reset('celestrak-stations');
    routes = new Map([[stations.url, json(gp)]]);
    r = await load('celestrak-stations', { await: true });
    if (r.via !== 'live' || r.data == null) problems.push(`SNAPSHOT no manifest + browser:true should fall back to live; got via=${r.via} error=${r.error}`);
    if (!seen.includes(stations.url)) problems.push('SNAPSHOT the live fallback did not ask the upstream');
    if (r.snapshot !== 'no-index') problems.push(`SNAPSHOT the live fallback should say why the snapshot was not used; got ${r.snapshot}`);

    // (d) no manifest, browser: false -> could not look, and the upstream URL was NEVER requested.
    //     The route for it is a trap: it would answer if asked.
    reset('jpl-sbdb-neo');
    routes = new Map([[jpl.url, json({ data: [['2000433', 'Eros']] })]]);
    r = await load('jpl-sbdb-neo', { await: true });
    if (r.ok || r.data != null) problems.push('SNAPSHOT a browser:false row with no snapshot must not produce data');
    if (r.reason !== 'no-route' || r.snapshot !== 'no-index') problems.push(`SNAPSHOT no manifest + browser:false should be reason no-route / no-index; got ${r.reason} / ${r.snapshot}`);
    if (upstreamSeen().length) problems.push(`SNAPSHOT a browser:false row asked the upstream: ${upstreamSeen().join(', ')}`);
    const jplRow = status().find((x) => x.id === 'jpl-sbdb-neo');
    if (!jplRow || jplRow.state !== 'could-not-look' || jplRow.reason !== 'no-route' || jplRow.browser !== false) {
      problems.push(`SNAPSHOT status() should say could-not-look / no-route for jpl-sbdb-neo; got ${jplRow && jplRow.state} / ${jplRow && jplRow.reason}`);
    }

    // (e) a manifest that says skipped (no credentials), browser: false -> could not look, untouched
    reset('space-track-tip');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'space-track-tip': snapRow('skipped', { fetched_at: null, valid_until: null }) }))],
      [tip.url, json([{ NORAD_CAT_ID: '1' }])],
    ]);
    r = await load('space-track-tip', { await: true });
    if (r.data != null || r.reason !== 'no-route' || r.snapshot !== 'skipped') {
      problems.push(`SNAPSHOT a skipped snapshot on a browser:false row should be no-route / skipped; got ${r.reason} / ${r.snapshot}`);
    }
    if (upstreamSeen().length) problems.push(`SNAPSHOT a browser:false row asked the upstream after a skipped harvest: ${upstreamSeen().join(', ')}`);

    // (f) a snapshot file of unknown schema is a snapshot we do not have: browser:true -> live
    reset('celestrak-stations');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('ok') }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp, { schema: 2 }))],
      [stations.url, json(gp)],
    ]);
    r = await load('celestrak-stations', { await: true });
    if (r.via !== 'live' || r.snapshot !== 'unreadable') problems.push(`SNAPSHOT schema 2 file should fall back to live as unreadable; got via=${r.via} snapshot=${r.snapshot}`);

    // (g) a manifest of unknown schema is no manifest
    reset('celestrak-stations');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('ok') }, 2))],
      [stations.url, json(gp)],
    ]);
    r = await load('celestrak-stations', { await: true });
    if (r.via !== 'live' || r.snapshot !== 'no-index') problems.push(`SNAPSHOT schema 2 manifest should read as no index; got via=${r.via} snapshot=${r.snapshot}`);
    if (harvestStatus().available) problems.push('SNAPSHOT harvestStatus() must not call a schema-2 manifest available');

    // (h) a refused harvest on a browser:true row -> live; the file the guard kept is not read
    reset('celestrak-stations');
    routes = new Map([
      ['/data/v1/index.json', json(manifest({ 'celestrak-stations': snapRow('refused', { last_error: 'never-worse: 3 of 22' }) }))],
      ['/data/v1/celestrak-stations.json', json(snapFile('celestrak-stations', gp))],
      [stations.url, json(gp)],
    ]);
    r = await load('celestrak-stations', { await: true });
    if (r.via !== 'live' || r.snapshot !== 'refused') problems.push(`SNAPSHOT a refused harvest should fall back to live as refused; got via=${r.via} snapshot=${r.snapshot}`);
    if (seen.includes('/data/v1/celestrak-stations.json')) problems.push('SNAPSHOT a refused snapshot file must not be read');

    reset('celestrak-stations', 'celestrak-starlink', 'jpl-sbdb-neo', 'space-track-tip');
    notes.push(
      'snapshots: manifest + file -> via snapshot with the harvester\'s age; no manifest -> live for ' +
        'browser:true, "could not look" with zero upstream requests for browser:false'
    );
  } catch (e) {
    problems.push(`SNAPSHOT could not check the reader: ${String((e && e.stack) || e)}`);
  } finally {
    if (savedFetch) globalThis.fetch = savedFetch;
    else delete globalThis.fetch;
  }
}

// --- one page per trip, for the share preview (spec 0032 req 7) --------------------------
//
// A fragment never reaches CloudFront, so `#trip=<id>` unfurls as the root page. Each trip gets a
// generated `site/t/<id>.html` with its own og:url and a refresh to its own hash; the generator's
// --check holds the bytes to the registry, and this holds the shape to what a crawler and a
// browser each need from it. The description rule is the blurb rule: no ` -- ` reaches a screen.
{
  try {
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const dir = join(ROOT, 'site/t');
    const pages = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.html')) : [];
    if (pages.length !== TOURS.length) problems.push(`TRIPPAGE ${pages.length} pages under site/t/ for ${TOURS.length} trips`);
    const attr = (html, re) => (html.match(re) || [])[1] || '';
    for (const tour of TOURS) {
      const file = join(dir, `${tour.id}.html`);
      if (!existsSync(file)) { problems.push(`TRIPPAGE no page for ${tour.id}`); continue; }
      const html = readFileSync(file, 'utf8');
      const ogUrl = attr(html, /property="og:url" content="([^"]+)"/);
      if (!/^https:\/\//.test(ogUrl) || !ogUrl.endsWith(`/t/${tour.id}.html`)) problems.push(`TRIPPAGE ${tour.id}: og:url is '${ogUrl}', not its own short URL`);
      if (attr(html, /rel="canonical" href="([^"]+)"/) !== ogUrl) problems.push(`TRIPPAGE ${tour.id}: canonical and og:url disagree`);
      const refresh = attr(html, /http-equiv="refresh" content="0; url=([^"]+)"/);
      if (!refresh.endsWith(`#trip=${tour.id}`)) problems.push(`TRIPPAGE ${tour.id}: the refresh goes to '${refresh}', not #trip=${tour.id}`);
      if (!html.includes(`location.replace('../#trip=${tour.id}')`)) problems.push(`TRIPPAGE ${tour.id}: no script redirect to its hash`);
      if (!html.includes(`<a href="../#trip=${tour.id}">`)) problems.push(`TRIPPAGE ${tour.id}: no plain link for no-script`);
      const description = attr(html, /name="description" content="([^"]*)"/);
      if (!description) problems.push(`TRIPPAGE ${tour.id}: no description`);
      if (description.includes(' -- ')) problems.push(`TRIPPAGE ${tour.id}: the description prints two hyphens as a dash`);
      if (attr(html, /property="og:description" content="([^"]*)"/) !== description) problems.push(`TRIPPAGE ${tour.id}: og:description and description disagree`);
      if (attr(html, /name="twitter:card" content="([^"]*)"/) !== 'summary_large_image') problems.push(`TRIPPAGE ${tour.id}: twitter:card is not summary_large_image`);
      // The picture the unfurl shows must be a file this tree ships, at the size the tags claim.
      const image = attr(html, /property="og:image" content="([^"]+)"/);
      const imageFile = join(ROOT, 'site', image.replace(/^https?:\/\/[^/]+\//, ''));
      if (!existsSync(imageFile)) problems.push(`TRIPPAGE ${tour.id}: og:image ${image} is not in site/`);
      else {
        const png = readFileSync(imageFile);
        const w = png.readUInt32BE(16);
        const h = png.readUInt32BE(20);
        if (png.slice(1, 4).toString() !== 'PNG' || w !== 1200 || h !== 630) problems.push(`TRIPPAGE ${tour.id}: og:image is ${w} x ${h}, not a 1200 x 630 PNG`);
      }
    }
    notes.push(`trip pages: ${pages.length}, one per trip, each with its own og:url, a refresh to its own hash and a 1200 x 630 picture`);
  } catch (e) {
    problems.push(`TRIPPAGE could not check the trip pages: ${String(e)}`);
  }
}

// --- the trip pictures (spec 0033 req 6) -------------------------------------------------------
//
// Every PNG under site/og/ is what a chat or a feed shows for a shared link, so each is held to the
// size its page's tags claim (1200 x 630, read from the PNG header) and to more than 50 000 bytes:
// a 1200 x 630 frame of black sky with one world in it is 60-200 kB, and less means an empty frame
// (the failure #157 taught). A trip with no picture of its own is NOTED, not failed: its page falls
// back to default.png (scripts/gen_trip_pages.py), and a trip added by another change should not
// turn this red until the readme-shots workflow has rendered it (2026-09-23).
{
  try {
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const dir = join(ROOT, 'site/og');
    const pngs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')) : [];
    if (!pngs.includes('default.png')) problems.push('OGIMAGE  site/og/default.png is missing: the root and every trip without its own picture use it');
    const known = new Set(['default', ...TOURS.map((t) => t.id)]);
    for (const f of pngs) {
      const png = readFileSync(join(dir, f));
      const w = png.readUInt32BE(16);
      const h = png.readUInt32BE(20);
      if (png.slice(1, 4).toString() !== 'PNG' || w !== 1200 || h !== 630) problems.push(`OGIMAGE  site/og/${f} is ${w} x ${h}, not a 1200 x 630 PNG`);
      if (png.length <= 50000) problems.push(`OGIMAGE  site/og/${f} is ${png.length} bytes: an empty frame, not a picture`);
      if (!known.has(f.replace(/\.png$/, ''))) problems.push(`OGIMAGE  site/og/${f} names no trip in the registry`);
    }
    const without = TOURS.filter((t) => !pngs.includes(`${t.id}.png`)).map((t) => t.id);
    notes.push(`trip pictures: ${pngs.length} under site/og/, each 1200 x 630 and over 50 kB${without.length ? `; still on default.png: ${without.join(', ')}` : '; every trip has its own'}`);
  } catch (e) {
    problems.push(`OGIMAGE  could not check the trip pictures: ${String(e)}`);
  }
}

// --- spec 0034: what stays forbidden, and the cinematic numbers ------------------------------
// No lens flare, no bloom, no post-processing, ever (docs/design-language.md, "Cinematic language
// (0034)"). The star-stretch is geometry in two vertex shaders; a pass over the whole frame is the
// thing a future "just add a little bloom" PR would bring, and this is where it is refused.
{
  const FORBIDDEN = ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'BloomPass', 'LensflareElement'];
  const sceneDir = join(JS, 'scene');
  for (const f of readdirSync(sceneDir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(sceneDir, f), 'utf8');
    for (const word of FORBIDDEN) {
      if (src.includes(word)) problems.push(`CINEMA   scene/${f} names ${word}: no post-processing pass, no bloom, no lens flare (spec 0034 req 7)`);
    }
  }
  try {
    const { VEIL_MS } = await import(join(JS, 'ui/veil.js'));
    const { STRETCH_PX } = await import(join(JS, 'scene/stretch.js'));
    if (VEIL_MS !== 350) problems.push(`CINEMA   VEIL_MS is ${VEIL_MS}, not the 350 ms docs/design-language.md states`);
    if (STRETCH_PX !== 12) problems.push(`CINEMA   STRETCH_PX is ${STRETCH_PX}, not the 12 px docs/design-language.md states`);
    notes.push(`cinema: no post-processing under scene/, VEIL_MS ${VEIL_MS}, STRETCH_PX ${STRETCH_PX}`);
  } catch (e) {
    problems.push(`CINEMA   could not read the cinematic constants: ${String(e)}`);
  }
}

// 4. report
if (notes.length) {
  console.log('notes:');
  for (const n of notes) console.log(`  - ${n}`);
  console.log('');
}
if (problems.length) {
  console.log(`contract: ${problems.length} problem(s)\n`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`contract ok: ${Object.keys(CONTRACT).length} modules, ${allFiles.length} files, every import resolves`);
