// tests/test_cutaway.mjs -- Look inside: the worlds opened to their layers (forge #144).
//
// Asserted, with no browser:
//   THE REGISTRY: registry/interiors.yaml's mirror is current and sound (scripts/gen_interiors_js.py
//     --check); it has the eight planets, the Moon, Pluto, Io, Europa, Ganymede, Enceladus, Titan and the
//     Sun; each layer has a source and one of measured, modelled, inferred; the measured models the issue
//     names are the ones cited (PREM, InSight, GRAIL, Juno, Cassini, helioseismology).
//   THE PROBE (ui/cutaway.js probeAt): the layer at a depth; values read between a layer's top and bottom,
//     geometrically across orders of magnitude; PREM's own numbers at Earth's boundaries; the Sun's
//     centre at 15.7 million K; the printed units.
//   ONE SHADER (scene/cutaway.js): the wedge test, the layer tops and the lookup the fragment shader does;
//     createCut on a world's mesh makes two materials from one vertex and one fragment source.
//   THE WAY IN: the card's Look inside button, the `cut` URL key, every kind named in words, lazy.
//
//   node tests/test_cutaway.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const gen = spawnSync('python3', [join(ROOT, 'scripts/gen_interiors_js.py'), '--check'], { encoding: 'utf8' });
check(gen.status === 0, `the interiors mirror is current and its rules hold:\n${gen.stdout}${gen.stderr}`);

const { INTERIORS } = await mod('data/interiors.js');
const { INTERIOR_IDS } = await mod('data/interiorids.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.later.js');
const C = await mod('ui/cutaway.js');
const S = await mod('scene/cutaway.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);

// --- the registry ---------------------------------------------------------------------------------
const want = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'pluto', 'io', 'europa', 'ganymede', 'enceladus', 'titan', 'sun'];
for (const id of want) check(INTERIORS.some((w) => w.id === id), `${id} has a cutaway`);
check(INTERIOR_IDS.join() === INTERIORS.map((w) => w.id).join(), 'the card\'s id list is the registry\'s');
const cite = (id) => { const w = C.interiorOf(id); return w ? `${w.model} ${w.source.name}` : ''; };
check(/PREM/.test(cite('earth')), 'Earth is PREM');
check(/InSight/.test(cite('mars')), 'Mars is InSight');
check(/GRAIL/.test(cite('moon')), 'the Moon is GRAIL');
check(/Juno/.test(cite('jupiter')) && /dilute/.test(cite('jupiter')), 'Jupiter is Juno\'s dilute core');
check(/Cassini/.test(cite('saturn')), 'Saturn is Cassini\'s gravity');
check(/helioseismology/.test(cite('sun')), 'the Sun is helioseismology');
for (const w of INTERIORS) {
  for (const l of w.layers) {
    check(['measured', 'modelled', 'inferred'].includes(l.cls), `${w.id}/${l.id} says how its depth is known`);
    check(String(l.source).length > 10, `${w.id}/${l.id} has a source`);
    check(!!COPY.cutaway.kinds[l.kind], `${w.id}/${l.id}: its kind (${l.kind}) has a name in words`);
    check(C.KIND_COLOUR[l.kind] !== undefined, `${w.id}/${l.id}: its kind has a colour`);
  }
  check(w.layers.length <= S.MAX_LAYERS, `${w.id} fits the shader's ${S.MAX_LAYERS} layers`);
}

// --- the probe --------------------------------------------------------------------------------------
const earth = C.interiorOf('earth');
check(C.layerAt(earth, 0) === 0 && C.layerAt(earth, 100) === 1 && C.layerAt(earth, 3000) === 3 && C.layerAt(earth, 6371) === 4, 'the layer at a depth, the centre in the last');
check(C.layerAt(earth, -1) === -1 && C.layerAt(earth, 7000) === -1, 'above the surface or below the centre there is none');
const cmb = C.probeAt(earth, 2891);
check(cmb.layer.id === 'outer-core' && Math.abs(cmb.pressure - 135.8) < 1e-9 && Math.abs(cmb.density - 9.90) < 1e-9, 'PREM\'s core-mantle boundary: 135.8 GPa, 9.90 g/cm3 on the core side');
const centre = C.probeAt(earth, 6371);
check(Math.abs(centre.pressure - 363.9) < 1e-9 && Math.abs(centre.density - 13.09) < 1e-9 && centre.share === 0, 'and its centre: 363.9 GPa, 13.09 g/cm3');
check(Math.abs(C.between(2, 4, 0.5) - 3) < 1e-12 && Math.abs(C.between(1, 100, 0.5) - 10) < 1e-9, 'straight between close values, geometric across orders of magnitude');
const sun = C.probeAt(C.interiorOf('sun'), 695700);
check(Math.abs(sun.temperature - 15.7e6) < 1, 'the Sun\'s centre: 15.7 million K (Model S)');
const mid = C.probeAt(C.interiorOf('sun'), 199700 / 2);
check(mid.density > 2e-7 && mid.density < 0.01, `halfway down the convection zone the density is read geometrically (${mid.density.toExponential(1)} g/cm3)`);
check(C.pressureText(135.8) === '140 GPa' && C.pressureText(0.0092) === '9.2 MPa' && C.pressureText(1e-5) === '10 kPa', `pressures print as a person reads them (${C.pressureText(135.8)}, ${C.pressureText(0.0092)}, ${C.pressureText(1e-5)})`);
check(C.pressureText(2.5e7) === '25 million GPa' && C.temperatureText(15.7e6) === '16 million K', `the Sun's numbers in millions (${C.pressureText(2.5e7)}, ${C.temperatureText(15.7e6)})`);
check(C.densityText(13.09) === '13 g/cm³' && C.densityText(2e-7) === '2 × 10⁻⁷ g/cm³', `densities (${C.densityText(13.09)}, ${C.densityText(2e-7)})`);

// --- one shader -------------------------------------------------------------------------------------
check(S.inWedge(0.1, 0) && S.inWedge(-0.7, 0) && !S.inWedge(0.9, 0) && S.inWedge(Math.PI - 0.1, -Math.PI + 0.2), 'the wedge is a quarter round the camera\'s azimuth, across the seam too');
check(Math.abs(S.wedgeAzimuth(0, 1) - Math.PI / 2) < 1e-12, 'azimuth is measured round +Y from +X');
const tops = S.layerTops(earth.layers, earth.radius_km);
check(tops[0] === 1 && Math.abs(tops[4] - (1 - 5150 / 6371)) < 1e-6 && tops[5] === -1, 'the layer tops are radius shares, top down, the rest unused');
check(S.layerIndexAt(tops, 0.99) === 1 && S.layerIndexAt(tops, 0.1) === 4 && S.layerIndexAt(tops, 1) === 0, 'the lookup the fragment shader makes');
{
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial());
  const cut = S.createCut(THREE, mesh, { layers: earth.layers, radiusKm: earth.radius_km, colours: earth.layers.map((l) => C.KIND_COLOUR[l.kind]) });
  const mats = [];
  cut.group.traverse((o) => { if (o.material) mats.push(o.material); });
  check(mats.length >= 3 && new Set(mats.map((m) => m.fragmentShader)).size === 1 && new Set(mats.map((m) => m.vertexShader)).size === 1, 'shell and faces are one program: one vertex and one fragment source');
  cut.setOpen(1);
  cut.update(new THREE.Vector3(0, 0, 5), new THREE.Vector3(5, 0, 0));
  const shell = mats.find((m) => m.uniforms.uMode.value === 0);
  check(Math.abs(shell.uniforms.uCutAz.value - (Math.PI / 2 + S.CUT_TURN)) < 1e-9 && Math.abs(shell.uniforms.uHalf.value - S.CUT_HALF) < 1e-12, 'the wedge turns to face the camera');
  cut.dispose();
  check(mesh.children.length === 0, 'and closing leaves the world as it was');
}
for (const w of INTERIORS) check(S.CUT_FRAG.includes('uTop') && w.layers.length > 0, 'every world goes through the same fragment shader');

// --- the way in -------------------------------------------------------------------------------------
const cards = read('site/js/ui/cards.js');
check(/COPY\.cutaway/.test(cards) && /wantCutaway\(\)/.test(cards) && /INTERIOR_IDS\.includes\(record\.id\)/.test(cards), 'a world\'s card offers Look inside, for the worlds that have one');
check(COPY.cutaway.button === 'Look inside', 'the button says Look inside');
const { KEYS } = await mod('ui/urlstate.js');
check(KEYS.includes('cut'), '#cut= is a URL key');
const main = read('site/js/main.js');
check(/import\('\.\/ui\/cutaway\.js'\)/.test(main) && /st\.cut/.test(main), 'main.js fetches the cutaway lazily and opens a cut= link');

// 2.0.0 look finding 6: on a phone the panel's title and close sat under the line below the bar (the live line and the
// launch chip), which is up whenever a card is open, so whenever the panel is. The panel drops below that line too.
{
  const css = read('site/css/worlds.css');
  const rule = /html\.sr-phone:is\(([^)]+)\):not\(\[data-sheet='full'\]\) \.sr-cutaway \{\s*top: calc\(([^;]+)\);/.exec(css);
  const when = rule ? rule[1].split(',').map((s) => s.trim()) : [];
  for (const c of ['.sr-card-open', '.sr-launchday', '.sr-overlay-keyed']) check(when.includes(c), `on a phone the cutaway drops under the bar's line when ${c} puts it up`);
  check(rule && /var\(--sr-top-bar\)/.test(rule[2]) && /44px/.test(rule[2]), 'by the bar and the 44 px of the launch chip, the tallest thing on the line');
  for (const [file, cls] of [['site/css/ui.css', 'sr-card-open'], ['site/css/finishers.css', 'sr-launchday'], ['site/css/finishers.css', 'sr-overlay-keyed']]) {
    check(new RegExp(`html\\.sr-phone[.:\\w()-]*\\.${cls}:not\\(\\[data-sheet='full'\\]\\) \\.sr-top__line`).test(read(file)), `${file} still shows the line for .${cls} (this test's list follows it)`);
  }
}

if (problems.length) {
  console.error('cutaway FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`cutaway ok: ${INTERIORS.length} worlds, ${INTERIORS.reduce((n, w) => n + w.layers.length, 0)} layers, each sourced; Earth's centre ${C.pressureText(363.9)}; one shader`);
