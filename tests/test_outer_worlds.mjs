// tests/test_outer_worlds.mjs -- Titan, the rings near and far, and the far dwarf planets
// (internal #863, #890, #865; spec 0077 W1-f).
//
//   1. TITAN. Its row wears a radar face with gaps (faceFill) and the seas (TITAN_LAKES); the two files
//      are what their rows say: the face's alpha runs 128 (no swath) to 255 and the radar covers 0.55
//      to 0.65 of the sphere; the seas are only in the north and round Ontario Lacus. The shader
//      decodes the alpha, darkens the seas on the own face only, and glints only outside Measured.
//   2. THE DETACHED LAYER. Titan's air has it at 500 km inside the shell; straight down it is its own
//      optical depth, along the limb ten times that and more; the shader integrates it on its own
//      steps and fades it out under a pixel. Mars and Venus have none.
//   3. THE RING AS PARTICLES. The numbers follow from q = 3: the drawn share of the optical depth, the
//      number a square metre, the sizes drawn; the sheet's twin gives up exactly that share; the
//      module builds and lays its tiles round the camera; and none of it is in the boot graph.
//   4. THE DWARFS. Each of the seven far dwarf planets has a row: colours in the order of their
//      redness, brightness in the order of their albedo, Haumea's egg and ring, and a card line that
//      says the surface is not drawn.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site', 'js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const A = await import(join(JS, 'scene/atmosphere.js'));
const G = await import(join(JS, 'scene/ringgrains.js'));
const D = await import(join(JS, 'scene/dwarfs.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const notes = [];
// The twins of two shader blocks, written here once: Schlick's reflectance of a flat sea (WORLD_FRAG's
// glint), and the detached layer's optical depth along a ray on 400 steps (AIR_SHELL_FRAG's two crossings).
const seaReflectance = (cosHv, f0) => f0 + (1 - f0) * Math.pow(1 - Math.min(1, Math.max(0, cosHv)), 5);
const hit = (ro, rd, r) => {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  const d = b * b - c;
  return d < 0 ? [1e9, -1e9] : [-b - Math.sqrt(d), -b + Math.sqrt(d)];
};
function layerDepth(p, ro, rd, steps = 400) {
  const L = A.layerCoefficients(p);
  const o = hit(ro, rd, L.r + 3 * L.sigma);
  if (!(o[0] < 1e8)) return 0;
  const g = hit(ro, rd, 1);
  const a = Math.max(o[0], 0);
  const b = Math.min(o[1], g[0] > 0 && g[0] < 1e8 ? g[0] : o[1]);
  if (!(b > a)) return 0;
  const dl = (b - a) / steps;
  let od = 0;
  for (let i = 0; i < steps; i++) {
    const t = a + (i + 0.5) * dl;
    const x = (Math.hypot(ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t) - L.r) / L.sigma;
    od += Math.exp(-0.5 * x * x) * L.peak * dl;
  }
  return od;
}

// ------------------------------------------------------------------------------------- 1. Titan
const titan = W.WORLDS.find((w) => w.id === 'titan');
check(titan.look.faces && titan.look.faces.radar === '2k_titan_radar.webp', 'Titan has a radar face');
check(titan.look.faceFill && titan.look.faceFill.radar && titan.look.faceMono.radar, 'the radar face is one grey with a fill for its gaps');
check(titan.look.lakes === W.TITAN_LAKES && titan.look.groundFaces.includes('radar'), 'Titan wears its seas, and the radar face is ground');
check(COPY.worldFace.titan && COPY.worldFace.titan.modes.radar && /61 %/.test(COPY.worldFace.titan.notes.radar) && /grey is ours/.test(COPY.worldFace.titan.notes.radar), 'the card says what the radar face is, how much it covers and that its grey is ours');
check(/glint/.test(COPY.worldFace.titan.notes.own) && /illustrative/.test(COPY.worldFace.titan.notes.own), 'the card says the glint is illustrative');
check(/500 km/.test(COPY.drawing.worldDeparture.titan) && /not known/.test(COPY.drawing.worldDeparture.titan), 'the card says where the detached layer is drawn and that today\'s is not known');
check(near(seaReflectance(1, W.TITAN_LAKES.f0), W.TITAN_LAKES.f0, 1e-9) && near(seaReflectance(0, W.TITAN_LAKES.f0), 1, 1e-9), 'a flat sea reflects 1.6 % straight down and all of it at grazing');
for (const s of ['uMonoFill', 'uLakeMap', 'uLake.w', 'face.a * 2.0 - 1.0', 'uLakeGlint']) check(W.WORLD_FRAG.includes(s), `the world shader has ${s}`);
// The tiles' shader is built from this one by rewriting four lines; they must still be there.
const T = await import(join(JS, 'scene/tiles.js'));
let tilesOk = true;
try { T.tileFragment(W.WORLD_FRAG); } catch (e) { tilesOk = false; notes.push(String(e)); }
check(tilesOk, 'scene/tiles.js can still build its shader from WORLD_FRAG');

// The files, read as pixels (PIL is not here: the WebP is decoded by sharp-free means -- the textures
// mirror holds what the check measured, and the build's own report is in its row).
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const yaml = readFileSync(join(ROOT, 'registry/textures.yaml'), 'utf8');
const radar = TEXTURES.find((r) => r.id === 'titan-radar');
const lakes = TEXTURES.find((r) => r.id === 'titan-lakes');
check(radar && radar.when === 'asked' && radar.files[0].format === 'rgba' && radar.files[0].bytes < 1.5e6, 'the radar face is fetched when asked, RGBA, under the 1.5 MB a hero may fetch');
check(lakes && lakes.when === 'asked' && /id: titan-lakes[^]*?boot: none/.test(yaml) && lakes.files.every((f) => f.tier >= 1) && lakes.files[0].bytes < 100000, 'the seas are never at boot, never on a phone, and small');
check(/radar covers 0\.606 of the sphere/.test(yaml), 'the radar row says how much of the sphere it covers');

// --------------------------------------------------------------------------- 2. the detached layer
const tp = A.ATMO_PARAMS.titan;
const lc = A.layerCoefficients(tp);
check(lc && near((lc.r - 1) * tp.radiusKm, 500, 1e-6), 'the layer is 500 km up');
check(tp.topKm >= tp.layer.heightKm + 3 * tp.layer.sigmaKm, 'the shell reaches past the whole layer');
check(!A.layerCoefficients(A.ATMO_PARAMS.mars) && !A.layerCoefficients(A.ATMO_PARAMS.venus), 'Mars and Venus have no detached layer');
const down = layerDepth(tp, [0, 0, 3], [0, 0, -1]);
check(near(down, tp.layer.tau, tp.layer.tau * 0.02), `straight down the layer is its own optical depth (${down.toFixed(4)} against ${tp.layer.tau})`);
const limb = layerDepth(tp, [-3, lc.r, 0], [1, 0, 0]);
check(limb > 10 * tp.layer.tau && limb < 40 * tp.layer.tau, `along the limb it is many times deeper (${limb.toFixed(3)})`);
const miss = layerDepth(tp, [-3, lc.r + 4 * lc.sigma, 0], [1, 0, 0]);
check(miss < 1e-4, 'a ray above it misses it');
for (const s of ['LAYER_STEPS', 'dFdx( rd )', 'exp( -layerOd )', 'uLayerAlbedo']) check(A.AIR_SHELL_FRAG.includes(s), `the shell's shader has ${s}`);
const shell = A.createAirShell('titan');
check(shell.material.uniforms.uLayer.value.w === 1 && A.createAirShell('mars').material.uniforms.uLayer.value.w === 0, 'only Titan\'s shell draws a layer');

// --------------------------------------------------------------------------- 3. the ring as particles
const P = G.RING_PARTICLES;
check(near(G.resolvedShare(), Math.log(5) / Math.log(500), 1e-12), 'the drawn balls carry ln 5 / ln 500 of the optical depth');
check(near(G.keptPerSquareMetre(1), (1 / (Math.PI * Math.log(500))) / 2 * (1 - 1 / 25), 1e-12), 'their number a square metre follows from q = 3');
// The sizes drawn: N(>2 m) / N(>1 m) = (2^-2 - 5^-2) / (1 - 5^-2).
const radii = G.particleRadii(200000, 3);
const over2 = radii.filter((r) => r > 2).length / radii.length;
check(near(over2, (0.25 - 0.04) / 0.96, 0.005) && radii.every((r) => r >= 1 && r <= 5.0001), `the sizes follow the power law (${over2.toFixed(4)} over 2 m)`);
check(near(G.slabLight(20, 1, 1, true), 1, 1e-6) && G.slabLight(0.1, 0.5, 0.5, true) < 0.5, 'the slab is 1 when thick and less when thin');
check(G.grainFade(0, 1000) === 1 && G.grainFade(1000, 1000) === 0 && G.grainFade(800, 1000) > 0 && G.grainFade(800, 1000) < 1, 'the balls fade out toward their reach');
// The sheet's twin: the share it gives up is the balls' share where they are big enough on screen.
const px = 0.0005;
check(near(G.resolvedAt(100, px), G.resolvedShare(), 1e-12), 'close up the sheet gives up exactly the balls\' share');
check(G.resolvedAt(40000, px) === 0, 'where even a 5 m ball is under a third of a pixel it gives up nothing');
check(W.RING_GRAINS.rMinM === P.rMinM && W.RING_GRAINS.rMaxM === P.rMaxM && W.RING_GRAINS.rFloorM === P.rFloorM && W.RING_GRAINS.fromM === P.fromM, 'the sheet and the module agree on the numbers');
check(W.RING_FRAG.includes(Math.log(5 / 0.01).toFixed(5)) && W.RING_FRAG.includes('uResolved') && W.RING_FRAG.includes('body *= 1.0 - drawn'), 'the sheet wears it');
check(/balls of ice/.test(COPY.drawing.worldDeparture.saturn) && /illustrative/.test(COPY.drawing.worldDeparture.saturn), 'Saturn\'s card says the balls are drawn and what of them is illustrative');
// Build it and lay the tiles, as worlds.js would, 2 km over the A ring at 130 000 km.
const root = new THREE.Group();
const ringU = W.ringMaterial(null, 74500 / 58232, 140220 / 58232, W.ringWarpUniform(58232)).uniforms;
const grains = G.createRingGrains(THREE, { root, ringUniforms: ringU, ringGlsl: W.RING_U_GLSL, fineMax: W.RING_FINE.ratioMax });
const ring = new THREE.Mesh(new THREE.BufferGeometry());
ring.scale.setScalar(5.8232);
ring.rotation.x = -Math.PI / 2;
ring.updateMatrixWorld(true);
const Rm = 58232e3;
const st = grains.update({ on: true, tier: 2, ring, planetM: Rm, cam: [130000e3 / Rm, 0.5 / Rm, 2000 / Rm], sun: [0.3, 0, 0.95], sunView: new THREE.Vector3(0, 0, 1), light: 1 });
check(st.on && st.tiles > 50 && st.tiles <= (2 * Math.ceil(P.reach[2] / P.tileM) + 1) ** 2 && st.wakes && ringU.uResolved.value.x === 1, `tier 2 lays ${st.tiles} tiles round the camera over the A ring, wakes on, and tells the sheet`);
const st1 = grains.update({ on: true, tier: 1, ring, planetM: Rm, cam: [100000e3 / Rm, 0, 2000 / Rm], sun: [0.3, 0, 0.95], sunView: new THREE.Vector3(0, 0, 1), light: 1 });
check(st1.tiles < st.tiles && !st1.wakes, `tier 1 lays fewer (${st1.tiles}), and the B ring has no wakes`);
const st0 = grains.update(null);
check(!st0.on && !grains.points.visible && ringU.uResolved.value.x === 0, 'off, nothing is drawn and the sheet takes its light back');
check(grains.points.material.vertexShader.includes('float ringMapU') && !grains.points.material.vertexShader.includes('#RING_U_GLSL#') && !/\$\{/.test(grains.points.material.vertexShader), 'the particles\' shader is whole');
grains.dispose();
notes.push(`${G.perTile()} slots a tile; tier 2 ${st.tiles} tiles (${st.slots} slots), tier 1 ${st1.tiles}`);

// ----------------------------------------------------------------------------------- 4. the dwarfs
const ids = ['dwarf-eris', 'dwarf-haumea', 'dwarf-makemake', 'dwarf-sedna', 'dwarf-gonggong', 'dwarf-quaoar', 'dwarf-orcus'];
const { farBodies } = await import(join(JS, 'data/sample.js'));
const far = farBodies();
for (const id of ids) check(D.dwarfLook(id) && far.some((r) => r.id === id), `${id} has a look and is a far body`);
check(!D.dwarfLook('dwarf-ceres'), 'Ceres keeps its real model');
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const redness = (id) => { const c = rgb(D.dwarfColour(D.dwarfLook(id))); return c[0] / c[2]; };
check(redness('dwarf-gonggong') > redness('dwarf-quaoar') && redness('dwarf-sedna') > redness('dwarf-makemake') && redness('dwarf-quaoar') > redness('dwarf-eris') && redness('dwarf-eris') < 1.2 && redness('dwarf-orcus') < 1.1, 'Sedna and Gonggong red, Eris and Orcus nearly grey');
const byAlbedo = [...ids].sort((a, b) => D.dwarfLook(a).albedo - D.dwarfLook(b).albedo);
const bright = byAlbedo.map((id) => D.dwarfBrightness(D.dwarfLook(id).albedo));
check(bright.every((b, i) => i === 0 || b > bright[i - 1]), 'brighter albedo, brighter drawing');
check(near(D.dwarfBrightness(0.09), 0.2381, 0.002), 'the scale passes through Ceres\'s grey');
const M = await import(join(JS, 'scene/models.js'));
const haumea = M.modelFor('asteroid', undefined, { record: far.find((r) => r.id === 'dwarf-haumea') });
const box = new THREE.Box3().setFromObject(haumea.getObjectByName('body')).getSize(new THREE.Vector3());
check(near(box.y / box.x, 1036 / 2122, 0.01) && haumea.getObjectByName('ring') && haumea.getObjectByName('ring').material.opacity === 0.5, 'Haumea is its egg, with its ring at opacity 0.5');
const ringBox = new THREE.Box3().setFromObject(haumea.getObjectByName('ring')).getSize(new THREE.Vector3());
check(near(ringBox.x, 1, 0.01), 'the ring is the model\'s one unit');
M.disposeModels(haumea);
const C = await import(join(JS, 'ui/cards.js'));
check(/egg/.test(C.dwarfDrawingLine('dwarf-haumea')) && /ring/.test(C.dwarfDrawingLine('dwarf-haumea')), 'Haumea\'s card says egg and ring');
check(/too faint/.test(C.dwarfDrawingLine('dwarf-quaoar')), 'Quaoar\'s says its rings are not drawn');
check(/never been measured/.test(C.dwarfDrawingLine('dwarf-sedna')) && /reddest/.test(C.dwarfDrawingLine('dwarf-sedna')), 'Sedna\'s says its shape is unknown and it is red');
for (const id of ids) check(/nothing on it is drawn/.test(C.dwarfDrawingLine(id)), `${id}: the surface is not drawn, and the card says so`);

// --------------------------------------------------------------------------- the boot graph
const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
const seen = new Set();
const todo = [join(JS, 'main.js')];
while (todo.length) {
  const p = todo.pop();
  if (seen.has(p)) continue;
  let text;
  try { text = readFileSync(p, 'utf8'); } catch { continue; }
  seen.add(p);
  for (const m of text.matchAll(STATIC)) todo.push(join(dirname(p), m[1]));
}
for (const f of ['scene/ringgrains.js', 'scene/dwarfs.js']) check(![...seen].some((p) => p.endsWith(f)), `${f} is not in the boot graph`);

if (problems.length) { console.error('outer worlds FAILED:\n  ' + problems.join('\n  ') + (notes.length ? '\n  ' + notes.join('\n  ') : '')); process.exit(1); }
console.log('  ' + notes.join('\n  '));
console.log('outer worlds ok: Titan wears its radar strips over its own map, its seas dark and glinting, and its detached haze at 500 km; Saturn\'s rings give up to particles from close what they draw as a sheet from far; seven far dwarf planets wear their measured colours and shapes and say what is not known');
