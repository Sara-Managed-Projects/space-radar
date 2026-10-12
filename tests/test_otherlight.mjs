// tests/test_otherlight.mjs -- the sky in other light (public #456): the registry, the baked skies,
// the layer, the chooser's words, and that none of it is on a first visit.
//
//   node tests/test_otherlight.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { OTHER_LIGHT, HIPS_LICENCE } = await import(join(JS, 'data/otherlight.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js')); // the sections outside the first visit (internal #405)
const { createOtherLight, bandOf, skyUv, stretch } = await import(join(JS, 'scene/otherlight.js'));
const H = await import(join(JS, 'sky/hips.js'));
const yaml = readFileSync(join(ROOT, 'registry/otherlight.yaml'), 'utf8');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');

// ------------------------------------------------------------------ 1. the registry and its files
check(OTHER_LIGHT.length >= 2 && OTHER_LIGHT.length <= 6, `${OTHER_LIGHT.length} bands: a chooser, not a catalogue`);
for (const b of OTHER_LIGHT) {
  const where = `otherlight.yaml ${b.id}`;
  check(/^https:\/\/alasky\.cds\.unistra\.fr\//.test(b.base), `${where}: tiles come from CDS over https`);
  check(['equatorial', 'galactic'].includes(b.frame), `${where}: frame ${b.frame}`);
  check(b.max_order >= 3 && (!b.stream || b.max_order > 3), `${where}: a streamed survey goes deeper than the baked picture`);
  check(/^NASA/.test(b.credit) && /^https:\/\//.test(b.terms), `${where}: a NASA mission's data, with the page that says so`);
  check(!/DSS|Mellinger|Digitized Sky/i.test(`${b.hips_id} ${b.credit}`), `${where}: not the Digitized Sky Survey and not Mellinger's panorama`);
  const file = join(ROOT, b.file);
  check(existsSync(file), `${where}: ${b.file} is in the tree (scripts/build_otherlight.py)`);
  if (existsSync(file)) check(statSync(file).size <= BUDGETS.otherlight_sky_bytes, `${where}: ${statSync(file).size} B is over otherlight_sky_bytes (${BUDGETS.otherlight_sky_bytes})`);
  // The words: a button, an honest line that says which light and that it is not an eye's colour.
  check(typeof COPY.otherLight.bands[b.id] === 'string', `${where}: copy/en.js otherLight.bands has no name for it`);
  const note = COPY.otherLight.notes[b.id] || '';
  check(/false colour|as brightness/.test(note), `${where}: its line says the colours are not an eye's ("${note}")`);
  check(note.length <= 60, `${where}: its line is ${note.length} characters; a line of chrome is at most 60`);
  check(typeof COPY.otherLight.colours[b.id] === 'string', `${where}: no line saying which wavelength is which colour`);
  // The evidence a reviewer reads is in the YAML, dated; and the credit is in CREDITS.md.
  const block = yaml.slice(yaml.indexOf(`- id: ${b.id}`));
  check(/checked: 2\d{3}-\d\d-\d\d/.test(block.slice(0, 1400)) && /evidence: "/.test(block.slice(0, 1400)) && /cors: "200, Access-Control-Allow-Origin: \*/.test(block.slice(0, 1400)), `${where}: licence evidence, the CORS answer and the day they were read`);
  check(credits.includes(b.hips_id) && credits.includes(b.credit), `${where}: CREDITS.md names ${b.hips_id} and "${b.credit}"`);
}
check(HIPS_LICENCE.name === 'ODbL-1.0' && credits.includes('ODbL'), 'the tiles\' own licence (CDS, ODbL 1.0) is in the mirror and in CREDITS.md');
check(bandOf('infrared') && bandOf('nope') === null, 'bandOf');

// ------------------------------------------------------------------ 2. the picture's projection
{
  const D = Math.PI / 180;
  const at = (ra, dec) => skyUv([Math.cos(dec * D) * Math.cos(ra * D), Math.cos(dec * D) * Math.sin(ra * D), Math.sin(dec * D)]);
  check(Math.abs(at(0, 0).u) < 1e-9 && Math.abs(at(0, 0).v - 0.5) < 1e-9, 'RA 0, Dec 0 is the middle of the left edge');
  check(Math.abs(at(90, 45).u - 0.25) < 1e-9 && Math.abs(at(90, 45).v - 0.75) < 1e-9, 'RA grows to the right, north is up');
  check(Math.abs(at(-90, -90).v) < 1e-9 && at(350, 0).u > 0.97, 'the south pole is the bottom row; RA wraps');
  check(stretch(0, 2) === 0 && Math.abs(stretch(1, 2) - 1) < 1e-12 && stretch(0.2, 2) > 0.3, 'the stretch keeps black black and white white, and lifts the faint');
  // scripts/build_otherlight.py bakes with the same HEALPix code as sky/hips.js: the script's
  // orientation is the one hips.js draws tiles with.
  const py = readFileSync(join(ROOT, 'scripts/build_otherlight.py'), 'utf8');
  check(/ORIENTATION = 4/.test(py) && /lambda a, b: \(b, a\)/.test(py), 'the baker\'s orientation is "columns along y, rows along x", as sky/hips.js tileGrid');
}

// ------------------------------------------------------------------ 3. the layer
{
  const parent = new THREE.Group();
  const asked = [];
  const tex = () => ({ dispose() { this.gone = true; } });
  const layer = createOtherLight({ parent, load: (url) => { asked.push(url); return Promise.resolve(tex()); } });
  check(asked.length === 0 && layer.state().drawn === false, 'a built layer has fetched nothing and draws nothing');
  layer.set('gamma');
  await new Promise((r) => setTimeout(r, 0));
  layer.update({ dirEq: [1, 0, 0], fovDeg: 60, heightPx: 900, aspect: 1.6 });
  check(asked.length === 1 && /images\/otherlight\/gamma\.webp$/.test(asked[0]), `one picture, ours: ${asked.join(', ')}`);
  check(layer.state().drawn && layer.band() === 'gamma', 'the band is drawn once its picture has landed');
  layer.setMix(0);
  layer.update({ dirEq: [1, 0, 0], fovDeg: 60, heightPx: 900, aspect: 1.6 });
  check(!layer.state().drawn, 'at the visible end of the slider nothing of it is drawn');
  layer.setMix(1);
  // Gamma is not streamed: closing the field asks for nothing more.
  layer.update({ dirEq: [1, 0, 0], fovDeg: 5, heightPx: 900, aspect: 1.6 });
  check(asked.length === 1, 'a survey that goes no deeper than the baked picture is never streamed');
  // Infrared is: a narrow field asks CDS for the tiles under the camera, a few at a time.
  layer.set('infrared');
  await new Promise((r) => setTimeout(r, 0));
  const d = [Math.cos(-0.1) * Math.cos(1.46), Math.cos(-0.1) * Math.sin(1.46), Math.sin(-0.1)];
  layer.update({ dirEq: d, fovDeg: 60, heightPx: 900, aspect: 1.6 });
  check(asked.length === 2, 'a wide field is the baked picture alone');
  layer.update({ dirEq: d, fovDeg: 8, heightPx: 900, aspect: 1.6 });
  const tiles = asked.slice(2);
  check(tiles.length > 0 && tiles.length <= 4, `a narrow field asks for tiles, at most four at a time (${tiles.length})`);
  const want = H.tileUrl(bandOf('infrared').base, 4, H.nestOf(4, d), 'jpg');
  check(tiles[0] === want, `the first tile asked for is the one the camera looks at: ${tiles[0]} (${want})`);
  await new Promise((r) => setTimeout(r, 0));
  check(layer.state().tiles === tiles.length, 'each tile that arrives is held');
  // Data saver: the picture, never the tiles.
  const frugal = [];
  const saver = createOtherLight({ parent, saveData: true, load: (url) => { frugal.push(url); return Promise.resolve(tex()); } });
  saver.set('infrared');
  await new Promise((r) => setTimeout(r, 0));
  saver.update({ dirEq: d, fovDeg: 8, heightPx: 900, aspect: 1.6 });
  check(frugal.length === 1, 'on a data-saving connection the tiles are never asked for');
  layer.set(null);
  check(layer.state().tiles === 0 && !layer.state().drawn && parent.children.length === 2, 'back to the visible sky: the tiles are let go');
  layer.dispose(); saver.dispose();
  check(parent.children.length === 0, 'dispose takes the layer out of the scene');
}

// ------------------------------------------------------------------ 4. nothing at boot
{
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    const re = /^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(text))) { const spec = m[1] || m[2]; if (spec.startsWith('.')) walk(resolve(dirname(file), spec)); }
  };
  walk(join(JS, 'main.js'));
  check(seen.size > 60, `the walk saw the app (${seen.size} modules)`);
  for (const lazy of ['scene/otherlight.js', 'data/otherlight.js', 'sky/hips.js', 'ui/otherlight.js', 'sky/groundpictures.js', 'sky/groundsky.js']) {
    check(!seen.has(join(JS, lazy)), `${lazy} is not on the first visit's static import path`);
  }
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(!/otherlight|alasky|hips/.test(html), 'index.html preloads neither the module, a picture nor CDS');
}

if (problems.length) { console.error('other light FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`other light ok: ${OTHER_LIGHT.length} bands (${OTHER_LIGHT.map((b) => b.id).join(', ')}), each NASA's with dated evidence, a baked sky inside ${BUDGETS.otherlight_sky_bytes} B and an honest line; the layer fetches one picture per band and streams only a deeper survey's tiles, never on a data-saving connection; none of it on the first visit`);
