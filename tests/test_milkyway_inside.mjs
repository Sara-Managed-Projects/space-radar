// tests/test_milkyway_inside.mjs -- release 1.4.0 (r14-mw-bh): the Milky Way from inside is the galaxy's own model.
//
//  1. THE SAME GALAXY. scene/milkyway.js's MODEL is scripts/build-galaxy.py's numbers (site/data/galaxy.bin), and its
//     colours are scene/galaxy.js's KIND_RGB.
//  2. THE FRAMES. The Sun at (-R0, 0, z_sun); a kiloparsec towards Sagittarius A* is a kiloparsec towards the centre.
//  3. THE SKY FROM HERE, from the model: Sagittarius's star clouds far above the band in Cygnus, the poles dark, the centre
//     warmer than the anticentre, the Great Rift and the Coalsack dark where they are, nothing past them.
//  4. PARALLAX. A camera 2 000 light-years off sees the near clouds move and the far band stay; from 30 kpc above the
//     plane the light comes from below.
//  5. THE LAYER. It builds without a GPU: the tiers' steps and grids, T0 on the baked picture, the camera's place in uCam.
//  6. THE CONTRACT. No render target or post-processing; the opaque list (scene/starfield.js says why); a dynamic import
//     in main.js; no photograph of the sky left in the tree or the registry; the hand-over rule mirrors the outside's.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const M = await import(join(JS, 'scene/milkyway.js'));
const { LOD_RULES } = await import(join(JS, 'data/lod.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));

// ------------------------------------------------------------------ 1. the same galaxy
{
  const py = read('scripts/build-galaxy.py');
  const num = (name) => Number((py.match(new RegExp(`^${name}\\s*=\\s*([0-9.]+)`, 'm')) || [])[1]);
  for (const [k, n] of [['R0', 'R0_KPC'], ['DISC_RADIUS', 'DISC_RADIUS_KPC'], ['DISC_SCALE', 'DISC_SCALE_KPC'], ['DISC_HEIGHT', 'DISC_HEIGHT_KPC'], ['BULGE_RADIUS', 'BULGE_RADIUS_KPC'], ['BAR_HALF', 'BAR_HALF_KPC'], ['BAR_ANGLE', 'BAR_ANGLE_DEG'], ['CONTINUE', 'CONTINUE_DEG']]) {
    check(M.MODEL[k] === num(n), `MODEL.${k} ${M.MODEL[k]} is build-galaxy.py's ${n} ${num(n)}`);
  }
  const rows = [...py.matchAll(/\("([^"]+)", (-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+)\)/g)].map((m) => [m[1], ...m.slice(2).map(Number)]);
  check(rows.length === 7 && JSON.stringify(rows) === JSON.stringify(M.MODEL.ARMS), 'the seven arms are build-galaxy.py\'s, number for number (Reid et al. 2019, Table 2)');
  for (const [k, re] of [['disc', /for _ in range\((\d+)\):\s*\n\s*r = rnd\.expovariate/], ['bulge', /for _ in range\((\d+)\):\s*\n\s*r = abs\(rnd\.gauss/], ['bar', /for _ in range\((\d+)\):\s*\n\s*t = rnd\.gauss/]]) {
    check(Number((py.match(re) || [])[1]) === M.MODEL.COUNT[k], `the ${k}'s count is build-galaxy.py's`);
  }
  const gal = read('site/js/scene/galaxy.js');
  const kr = gal.match(/const KIND_RGB = \[([\s\S]*?)\];/);
  const parsed = kr ? JSON.parse(`[${kr[1].replace(/\s/g, '').replace(/,$/, '')}]`) : null;
  check(JSON.stringify(parsed) === JSON.stringify(M.KIND_RGB), 'the populations wear scene/galaxy.js\'s colours');
}

// ------------------------------------------------------------------ 2. the frames
{
  const sun = M.galFromEclKm({ x: 0, y: 0, z: 0 });
  check(Math.abs(sun[0] + M.MODEL.R0) < 1e-12 && sun[1] === 0 && Math.abs(sun[2] - M.MODEL.Z_SUN) < 1e-12, 'the Sun is at (-R0, 0, z_sun)');
  // Sagittarius A*'s direction (J2000), a kiloparsec out, in the app's sun-inertial (ecliptic) km
  const a = 266.405 * Math.PI / 180, d = -28.936 * Math.PI / 180, e = 23.4392911 * Math.PI / 180;
  const eq = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const ecl = { x: eq[0] * M.KPC_KM, y: (eq[1] * Math.cos(e) + eq[2] * Math.sin(e)) * M.KPC_KM, z: (-eq[1] * Math.sin(e) + eq[2] * Math.cos(e)) * M.KPC_KM };
  const g = M.galFromEclKm(ecl);
  check(Math.abs(g[0] - (1 - M.MODEL.R0)) < 1e-3 && Math.abs(g[1]) < 1e-3 && Math.abs(g[2] - M.MODEL.Z_SUN) < 1e-3, `a kiloparsec towards Sagittarius A* is a kiloparsec towards the centre (${g.map((v) => v.toFixed(4))})`);
  const u = M.equirectDir(0.5, 0.5);
  check(Math.abs(u[0] - 1) < 1e-12, 'the baked picture has the centre in its middle');
  const left = M.equirectDir(0.25, 0.5);
  check(left[1] > 0.99, 'and longitude 90 to the left of it, as sky maps have it');
}

// ------------------------------------------------------------------ 3. the sky from here
const cpu = M.cpuModel(32);
const SUN = [-M.MODEL.R0, 0, M.MODEL.Z_SUN];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const patch = (cam, l, b, opts = {}) => { let s = [0, 0, 0]; for (const dl of [-1.5, 0, 1.5]) for (const db of [-0.6, 0.6]) { const c = M.skyColour(cam, M.galDir(l + dl, b + db), { ...cpu, steps: 24, samples: 0, ...opts }); s = s.map((v, k) => v + c[k] / 6); } return s; };
{
  const sgr = patch(SUN, 2, -5), cyg = patch(SUN, 90, 0), pole = patch(SUN, 0, 88), anti = patch(SUN, 180, 0);
  check(lum(sgr) > 4 * lum(cyg), `the Sagittarius star cloud outshines the band in Cygnus (${(lum(sgr) / lum(cyg)).toFixed(1)} times)`);
  check(lum(pole) < 0.1 * lum(cyg), `the galactic pole is dark beside the band (${(lum(pole) / lum(cyg)).toFixed(3)})`);
  check(sgr[0] / sgr[2] > 1.3 * (anti[0] / anti[2]), `the centre is warmer than the anticentre (R/B ${(sgr[0] / sgr[2]).toFixed(2)} against ${(anti[0] / anti[2]).toFixed(2)})`);
  check(lum(sgr) < 0.6 && lum(cyg) > 0.001, `the band is a whisper, not a wallpaper: Cygnus ${lum(cyg).toFixed(4)}, Sagittarius ${lum(sgr).toFixed(3)} (linear)`);
  const D = (l, b) => M.skyDetail(SUN, M.galDir(l, b), { ...cpu, samples: 0 }).tau;
  check(D(301.5, -1) > 0.4 && D(301.5, -12) < 0.1, `the Coalsack is dark where it is (tau ${D(301.5, -1).toFixed(2)}) and nowhere near (${D(301.5, -12).toFixed(3)})`);
  check(D(30, 1.3) > 0.8 && D(30, 8) < 0.1 && D(30, -20) < 0.05, `the Great Rift crosses Aquila as a lane along the band (tau ${D(30, 1.3).toFixed(2)} on it, ${D(30, 8).toFixed(2)} 7 degrees off)`);
  check(D(240, 30) === 0, 'no cloud where none is named');
  check(M.CLOUDS.length >= 8 && M.CLOUDS.every((c) => c.length === 8 && c[3] > 100 && c[3] < 1000 && c[7] > 0 && Math.abs(c[2]) < 8), `${M.CLOUDS.length} named clouds, each with its distance (pc) and extinction, all in the band (|b| < 8)`);
  check(M.SMUDGES.length === 3 && lum(M.skyColour(SUN, M.galDir(280.5, -32.9), { ...cpu, steps: 24, samples: 0 })) > lum(M.skyColour(SUN, M.galDir(280.5, -50), { ...cpu, steps: 24, samples: 0 })) * 3, 'the Large Magellanic Cloud is a smudge where it is');
}

// ------------------------------------------------------------------ 4. parallax
{
  // 2 000 light-years towards l = 90: the Coalsack (180 pc) has moved off its old place; the far band has not
  const LY = 9460730472580.8;
  const kmToward = (l, ly) => { const g = M.galDir(l, 0); const e = 23.4392911 * Math.PI / 180; const G = M.G2E; const eq = [0, 1, 2].map((r) => G[r][0] * g[0] + G[r][1] * g[1] + G[r][2] * g[2]); return { x: eq[0] * ly * LY, y: (eq[1] * Math.cos(e) + eq[2] * Math.sin(e)) * ly * LY, z: (-eq[1] * Math.sin(e) + eq[2] * Math.cos(e)) * ly * LY }; };
  const away = M.galFromEclKm(kmToward(90, 2000));
  check(Math.abs(Math.hypot(away[0] - SUN[0], away[1] - SUN[1], away[2] - SUN[2]) - 2000 / 3261.56) < 1e-3, 'the camera\'s place moves with it');
  const tauHere = M.skyDetail(SUN, M.galDir(301.5, -1), { ...cpu, samples: 0 }).tau;
  const tauThere = M.skyDetail(away, M.galDir(301.5, -1), { ...cpu, samples: 0 }).tau;
  check(tauHere > 0.4 && tauThere < 0.3 * tauHere, `from 2 000 ly away the Coalsack is no longer where it was from the Sun (tau ${tauHere.toFixed(2)} -> ${tauThere.toFixed(2)})`);
  // the star cloud under the centre, looked at from each place (0.7 kpc below the middle: about 5 degrees)
  const toward = (c) => { const v = [-c[0], -c[1], -0.7 - c[2]]; const n = Math.hypot(...v); return v.map((x) => x / n); };
  const at = (c) => lum(M.skyColour(c, toward(c), { ...cpu, steps: 24, samples: 0 }));
  const far = at(away) / at(SUN);
  check(far > 0.2 && far < 5, `while the galaxy's centre, 8 kpc off, stays as bright within its near dust's clumping (${far.toFixed(2)})`);
  const above = [-M.MODEL.R0, 0, 30];
  const down = lum(M.skyColour(above, [0.27, 0, -0.96], { ...cpu, steps: 24, samples: 0 })), up = lum(M.skyColour(above, [0, 0, 1], { ...cpu, steps: 24, samples: 0 }));
  check(down > 20 * Math.max(up, 1e-9) && up === 0, `30 kpc above the disc, the galaxy is below and nothing above (${down.toExponential(2)} / ${up})`);
}

// ------------------------------------------------------------------ 5. the layer
{
  const t2 = M.createMilkyWay({ tier: 2 });
  const s2 = t2.stats();
  check(s2.steps === M.TIER_STEPS[2] && s2.detail === 4 && s2.vertices === (M.TIER_GRID[2][0] + 1) * (2 * M.TIER_GRID[2][1] + 1), `T2: ${s2.steps} steps, detail ${s2.detail}, ${s2.vertices} vertices`);
  check(s2.march === 1 && s2.gpuBytes < 4 * 1024 * 1024, `T2 marches, inside 4 MB of GPU memory (${s2.gpuBytes} B)`);
  t2.setCameraKm({ x: 3e16, y: 0, z: 0 });
  check(t2.stats().cam[0] !== -M.MODEL.R0, 'setCameraKm moves uCam');
  t2.setDetail('low');
  check(t2.stats().steps === M.TIER_STEPS[0] && t2.stats().detail === 0, 'under the latch: the fewest steps and no fragment detail');
  t2.setOpacity(0);
  check(t2.mesh.visible === false, 'at opacity 0 nothing is drawn');
  t2.dispose();
  const t0 = M.createMilkyWay({ tier: 0, baked: 'textures/2k_milky_way_model.webp' });
  check(t0.stats().steps === M.TIER_STEPS[0] && t0.mesh.material.defines.MW_BAKED === 1, 'T0 wears the baked picture (its march only as the camera leaves)');
  t0.dispose();
  const m = M.createMilkyWay({ tier: 1 });
  check(m.mesh.material.transparent === false && m.mesh.material.depthTest === false && m.mesh.material.blending === THREE.CustomBlending, 'the opaque list with additive factors spelled out, depth test off');
  m.dispose();
}

// ------------------------------------------------------------------ 6. the contract
{
  const src = read('site/js/scene/milkyway.js');
  check(!/WebGLRenderTarget|RenderTarget|EffectComposer|setRenderTarget/.test(src), 'no render target, no composer');
  const main = read('site/js/main.js');
  check(/import\('\.\/scene\/milkyway\.js'\)/.test(main) && !/^import .*milkyway\.js/m.test(main), 'main.js imports the band dynamically');
  const sf = read('site/js/scene/starfield.js');
  check(!/TextureLoader|2k_stars_milky_way|milkyWayTexture/.test(sf), 'the starfield loads no picture of the Milky Way');
  check(!existsSync(join(ROOT, 'site/textures/2k_stars_milky_way.webp')) && !existsSync(join(ROOT, 'site/textures/4k/milky_way.webp')), 'neither panorama is in the tree');
  const row = TEXTURES.find((r) => r.id === 'starfield');
  check(row && row.files.length === 1 && /2k_milky_way_model\.webp$/.test(row.files[0].file) && /own model/.test(row.files[0].credit) && /MIT \(this project\)/.test(read('registry/textures.yaml')), 'the one sky file is ours, baked from the model');
  const baked = readFileSync(join(ROOT, 'site/textures/2k_milky_way_model.webp'));
  check(baked.slice(0, 4).toString() === 'RIFF' && baked.slice(8, 12).toString() === 'WEBP' && baked.length === row.files[0].bytes && baked.length < 120000, `the baked picture is a WebP of ${baked.length} B, as its row says`);
  const inside = LOD_RULES.find((r) => r.what === 'milky-way-inside'), outside = LOD_RULES.find((r) => r.what === 'galaxy-model');
  check(inside && outside && inside.fade === 'out' && outside.fade === 'in' && inside.from_km === outside.from_km && inside.to_km === outside.to_km, 'the band hands its light to the outside view over the same distances');
}

if (problems.length) { console.error(`milky way inside: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log('milky way inside ok: build-galaxy.py\'s galaxy seen from the camera\'s place, Sagittarius bright, the poles dark, the Rift and the Coalsack where they are, parallax, the tiers, no photograph');
