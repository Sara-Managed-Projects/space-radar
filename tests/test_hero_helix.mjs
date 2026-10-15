// tests/test_hero_helix.mjs -- the Helix Nebula as a hero (internal spec 0075 stage b, #787; DS-B02,
// B03, B04, B07): its layers come from the registry with their sources; the two rings at the published
// tilts and position angles (O'Dell, McCullough & Meixner 2004), seen from our side as the photograph's
// ellipse; the gas sampled only inside each layer, with finite columns from every side and from inside;
// the white dwarf at the centre of the frame across a 60 degree arc; T0's few samples and no noise; the
// photograph and the point glow handed over by their own shares; the enhanced palette only under Deep;
// nothing moving under Measured, reduced motion or ?look=1; the knots at their measured radii.
//
//   node tests/test_hero_helix.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const H = await import(join(JS, 'scene/deep/helix.js'));
const { HERO } = await import(join(JS, 'data/hero-helix.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

// --- 1. the profile: every part, with its source; the review filled but for the person's sign-off ---
{
  const parts = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));
  for (const k of ['star', 'disc', 'ring', 'outer', 'knots']) check(parts[k] && String(parts[k].source || '').length > 20, `the profile has its ${k}, with a source`);
  check(/O'Dell, McCullough & Meixner 2004, AJ 128, 2339/.test(parts.disc.source) && /O'Dell, McCullough & Meixner 2004/.test(parts.ring.source), 'the rings are the 2004 paper\'s');
  check(parts.disc.diameter_arcsec === 499 && parts.disc.thickness_arcsec === 100 && parts.disc.tilt_deg === 23 && parts.disc.near_pa_deg === 288, 'the inner disc: 499″, 100″ thick, 23°, near side PA 288° (OMM04)');
  check(parts.ring.diameter_arcsec === 742 && parts.ring.tilt_deg === 53 && parts.ring.near_pa_deg === 168, 'the outer ring: 742″, 53°, near side PA 168° (OMM04)');
  check(parts.outer.diameter_arcsec === 1500 && parts.outer.drawn === 'photograph', 'the outermost ring: 1 500″, not reconstructed (the photograph shows it)');
  check(parts.knots.from_arcmin === 2.2 && parts.knots.to_arcmin === 6.4 && parts.knots.count_estimated === 23000, 'the knots: 2.2′ to 6.4′ (Matsuura et al. 2009), about 23 000 (Meixner et al. 2005)');
  check(HERO.colours.mode === true && HERO.colours.enhanced && HERO.colours.enhanced.mode === 'enhanced' && HERO.colours.enhanced.under === 'deep', 'the colours: the photograph\'s under Eye and Camera, ENHANCED (declared) under Deep (DS-B07)');
  check(/not yet/.test(HERO.review.astronomer || ''), 'the review says no astronomer has reviewed it yet');
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `review.${k} is written`);
  check(HERO.shipped === false || (HERO.review.by && HERO.review.date), 'shipped only with a person\'s sign-off (requirement 20)');
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'reconstruction' && HERO.credits.length >= 3, 'it draws a reconstruction, with its credit lines');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const sect = credits.slice(credits.indexOf('### The Helix (stage b)'), credits.indexOf('### The Large Magellanic Cloud'));
  for (const s of ['AJ 128, 2339', 'AJ 130, 1784', 'ApJ 700, 1067', 'eso0907a', 'ENHANCED']) check(sect.includes(s), `CREDITS.md's Helix section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  check(/deepHelix: \{[\s\S]*card: \{\s*helix: 'Its light is taken from ESO’s photograph, its shape from O’Dell, McCullough and Meixner \(2004\)[^']*Not yet reviewed by an astronomer\.'/.test(words), 'the card says its light is the photograph\'s, its shape the paper\'s, and that no astronomer has reviewed it yet');
}

// --- 2. the geometry: the published tilts; the light map's place on the sky ----------------------------
const g = H.geometryOf();
{
  const asLy = (arcsec) => arcsec * 655 * Math.PI / 648000;
  check(near(g.R1, asLy(249.5), 1e-9) && near(g.R2, asLy(371), 1e-9), `the paper's arcseconds at the Gaia distance (R1 ${g.R1.toFixed(3)} ly, R2 ${g.R2.toFixed(3)} ly)`);
  check(near(Math.acos(-g.a1[2]) / D2R, 23, 1e-9) && near(Math.acos(-g.a2[2]) / D2R, 53, 1e-9), 'each axis is its tilt from our line of sight');
  check(g.axesDeg > 60 && g.axesDeg < 75, `the two rings "almost perpendicular": ${g.axesDeg.toFixed(1)}° between their axes`);
  const pa = (a) => ((Math.atan2(-a[0], a[1]) / D2R) + 360) % 360;
  check(near(pa(g.a1), 288, 1e-6) && near(pa(g.a2), 168, 1e-6), `the axes point to PA 288° and 168° on the sky (${pa(g.a1).toFixed(1)}, ${pa(g.a2).toFixed(1)})`);
  // The light map: the picture's measured centre is 0.64′ north of the star, so the star sits below the middle.
  check(near(g.uv.u0, 0.5, 0.002) && g.uv.v0 < 0.5 && near((0.5 - g.uv.v0) * 25.94, 0.644, 0.01), `the star on the light map at (${g.uv.u0.toFixed(4)}, ${g.uv.v0.toFixed(4)}): the picture's measured centre, not the star's`);
  check(near(g.uv.W, asLy(28.02 * 60), 1e-9), 'the light map is as wide as the photograph on the sky');
  // The disc's share: all of it inside its outline as seen from here, none well outside.
  check(H.discShare(g, 0, 0) === 1 && H.discShare(g, 1.3 * g.R1, 0) === 0 && H.discShare(g, 0, 1.3 * g.R1) === 0, 'the inner disc takes the light inside its outline, the outer ring the rest');
}

// --- 3. FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH; from anywhere it is finite and never white ---------
{
  // A light like the picture's: blue-green inside, orange outside, as dim as the picture (no knee).
  const light = (x, y) => { const r = Math.hypot(x, y) / g.R1; const k = Math.exp(-(((r - 1.1) / 0.35) ** 2)); return [0.15 + 0.4 * k, 0.35 + 0.15 * k - 0.25 * k * k, 0.45 - 0.35 * k].map((v) => Math.max(0, v) * 0.9); };
  let worst = 0, worst4 = 0;
  for (let k = 0; k < 60; k++) {
    const r = 0.8 * Math.sqrt((k + 0.5) / 60), th = k * 2.399963;
    const x = r * Math.cos(th), y = r * Math.sin(th);
    const want = light(x, y);
    const err = (n, j) => { const c = H.columnJs(g, [x, y, 40], [0, 0, -1], n, j, light).rgb; return Math.max(...c.map((v, i) => Math.abs(v - want[i]) / Math.max(0.05, want[i]))); };
    worst = Math.max(worst, err(24, 0.37));
    worst4 = Math.max(worst4, err(4, 0.37), err(4, 0.81));
  }
  check(worst < 0.03, `on our line the column IS the photograph's light: ${((worst) * 100).toFixed(1)} % at worst over 60 points (24 samples)`);
  check(worst4 < 0.12, `and with T0's 4 samples, whatever the pixel's offset: ${((worst4) * 100).toFixed(1)} % (a grain that varies by pixel, never a band)`);
  // Edge on to the inner disc: its near side's colour, not a white bar.
  const e1 = g.d1;
  const edge = H.columnJs(g, e1.map((v) => v * 6), e1.map((v) => -v), 8, 0.5, light).rgb;
  check(Math.max(...edge) < 1 && Math.max(...edge) - Math.min(...edge) > 0.1, `edge on, the disc keeps a colour (${edge.map((v) => v.toFixed(2)).join(', ')}) and does not go white`);
  // Many rays from outside and from inside: finite and non-negative.
  let bad = 0;
  let r = 12345;
  const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
  for (let i = 0; i < 3000; i++) {
    const inside = i % 2 === 0;
    const ro = inside ? [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map((v) => v * 1.6) : unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]).map((v) => v * 8);
    const rd = inside ? unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]) : unit([-ro[0] + (rnd() - 0.5) * 4, -ro[1] + (rnd() - 0.5) * 4, -ro[2] + (rnd() - 0.5) * 4]);
    const c = H.columnJs(g, ro, rd, 8, rnd(), light);
    if (!c.rgb.every((v) => Number.isFinite(v) && v >= 0 && v < 1) || !(Number.isFinite(c.dust) && c.dust >= 0)) bad++;
  }
  check(bad === 0, `3 000 rays from outside and inside: every colour finite, non-negative and under white (${bad} bad)`);
  // The stretch: Eye greys and darkens, Deep lifts, as on the photograph.
  const eye = H.lightStretch([0.2, 0.5, 0.6], X.exposureLook('eye').nebulaGamma, X.exposureLook('eye').nebulaSaturation);
  const deep = H.lightStretch([0.2, 0.5, 0.6], X.exposureLook('deep').nebulaGamma, X.exposureLook('deep').nebulaSaturation);
  check(eye.lum < 0.2 && Math.max(...eye.rgb) - Math.min(...eye.rgb) < 0.05 && deep.lum > 0.5, 'the light takes each exposure\'s stretch, as the photograph does');
}

// --- 4. the GLSL is written from the same numbers -----------------------------------------------------
{
  const f = H.SHADERS.gas;
  for (const k of ['slab', 'discIn', 'discEdge', 'ringFade', 'ringOut', 'kappa', 'knee', 'rimQ', 'rimW', 'sigma', 'streakCells']) check(f.includes(Number(H.SHAPE[k]).toFixed(3)), `GAS_FRAG carries SHAPE.${k} (${H.SHAPE[k]})`);
  check(/vec4 layerSpan\( vec3 ro, vec3 rd, vec3 a, float h, float rIn, float rOut, float t0, float t1 \)/.test(f) && /float discShare\( vec2 xy \)/.test(f) && /vec3 lightAt\( vec2 xy \)/.test(f), 'the fragment has the same spans, share and light');
  check(/pixelHash\( gl_FragCoord\.xy \)/.test(f) && !/sampler3D/.test(f), 'a hash of the pixel for the offset, and no noise volume at all');
  check(/if \( uStreak <= 0\.0 \) return 1\.0;/.test(f), 'no streaks when they are off (Measured)');
  check(/vAlpha = aKnot\.z \* min\( 1\.0, 1\.0 \/ sqrt\( grow \) \);/.test(H.SHADERS.knotVertex), 'a knot drawn bigger keeps exaggerated darkness, and the registry says so');
  for (const [k, v] of Object.entries(H.SHADERS)) {
    const bad = [...v.matchAll(/smoothstep\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,/g)].filter((m) => Number(m[1]) >= Number(m[2]));
    check(!bad.length, `${k}: smoothstep's edges in order (GLSL leaves edge0 >= edge1 undefined): ${bad.map((m) => m[0]).join(' ')}`);
  }
  check(H.pixelHash(10, 20) >= 0 && H.pixelHash(10, 20) < 1 && H.pixelHash(10, 20) !== H.pixelHash(11, 20), 'the offset is a hash in [0, 1)');
  check(statSync(join(ROOT, 'site/images/deep/helix/helix-light.webp')).size < 40000, 'the light map is small (the photograph, its stars removed)');
}

// --- 5. the hero: the star at the centre across a 60° arc; tiers; shares; looks; dispose -------------
{
  stage.setWorld('stellar');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-helix-nebula');
  const hero = H.createHero(THREE, { profile: HERO, record: rec, gas: G });
  const scene = new THREE.Scene();
  scene.add(hero.group);
  // As the coordinator places it: object units of 1 ly about the record's centre.
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  const sunward = centre.clone().negate().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(sunward, up).normalize();
  hero.setLevel(2, 1);
  let off = 0;
  const sky = hero.group.children[0];
  for (let deg = 0; deg <= 60; deg += 10) {
    const dir = sunward.clone().multiplyScalar(Math.cos(deg * D2R)).add(side.clone().multiplyScalar(Math.sin(deg * D2R)));
    camera.position.copy(centre).addScaledVector(dir, 6 * s);
    camera.lookAt(centre); camera.updateMatrixWorld();
    hero.frame({ camera, rPx: 250, steps: 16, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 1, gain: 1 });
    scene.updateMatrixWorld(true);
    const star = new THREE.Vector3(0, 0, 0).applyMatrix4(sky.matrixWorld).project(camera);
    off = Math.max(off, Math.hypot(star.x, star.y));
    const u = hero.group.getObjectByName(`${hero.group.name}-shells`).material.uniforms;
    check(near(u.uCam.value.length(), 6, 1e-6), `at ${deg}° the camera is 6 ly from the white dwarf in the sky frame (${u.uCam.value.length().toFixed(6)})`);
    if (deg === 0) check(u.uCam.value.z > 5.99, 'on our line of sight the camera is on the sky frame\'s +z (toward the Sun)');
  }
  check(off < 1e-6, `the white dwarf stays at the centre of the frame across a 60° arc (largest offset ${off.toExponential(1)}, DS-B02)`);
  // The sky frame: x west, y north, z toward the Sun, right-handed.
  const f = H.skyFrame(rec.pos);
  check(near(dot(f.west, f.north), 0, 1e-12) && near(dot(f.west, f.toward), 0, 1e-12) && near(dot(f.north, f.toward), 0, 1e-12), 'the sky frame is orthonormal');
  const cr = [f.west[1] * f.north[2] - f.west[2] * f.north[1], f.west[2] * f.north[0] - f.west[0] * f.north[2], f.west[0] * f.north[1] - f.west[1] * f.north[0]];
  check(near(dot(cr, f.toward), 1, 1e-9), 'and right-handed: west × north = toward the Sun');
  // Tiers (DS-B04): T0 takes 4 samples a ring and draws 500 knots; T2 at level 3 takes half the steps.
  const uGas = hero.group.getObjectByName(`${hero.group.name}-shells`).material.uniforms;
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  check(hero.stats().samples === 4 && hero.stats().knots === 500, `T0: 4 samples a ring, 500 knots (${JSON.stringify(hero.stats())})`);
  check(uGas.uShare.value === 0 && hero.ready(), 'no gas is drawn until its light (the photograph) has landed; with nothing to fetch here it is ready');
  hero.frame({ camera, rPx: 400, steps: 32, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().samples === 16 && hero.stats().knots === 1600, 'T2 at level 3: 16 samples a ring (32 steps), 1 600 knots');
  check(H.samplesFor({ tier: 2, steps: 48 }) === 24 && H.samplesFor({ tier: 1, steps: 0 }) === 8, 'Ultra 24 a layer; level 2 8');
  // Shares: the photograph's own, the glow's own fade.
  const sh = H.sharesFor({ level: 1, rPx: 300, photo: 1 });
  check(sh.gas === 0 && sh.knots === 0 && sh.star === 0.5, 'on our line, with its photograph drawn, the gas gives way and the star is half');
  check(H.sharesFor({ level: 1, rPx: 150, photo: 0 }).gas === 1 && H.sharesFor({ level: 1, rPx: Infinity, photo: 0 }).gas === 1, 'off it the gas is whole from level 2 (the point glow steps back for it: main.js), and holds inside');
  const lt = (r) => H.sharesFor({ level: 1, rPx: r, photo: 0, viewH: 900 }).light;
  check(lt(150) === 1 && lt(300) === 1 && near(lt(Infinity), H.SHAPE.adapt, 1e-12) && lt(700) < 1 && lt(700) > H.SHAPE.adapt, `its light adapts only once it grows past the view: 1 at 150 and 300 px, ${lt(700).toFixed(2)} at 700, ${H.SHAPE.adapt} inside`);
  check(/heroShares: \(\) =>/.test(readFileSync(join(JS, 'scene/deep/deepsky.js'), 'utf8')) && /ctx\.deep\.heroShares\(\)/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'the point glow steps back for a drawn hero as for a photograph (deepsky.js heroShares, main.js)');
  check(H.sharesFor({ level: 0, rPx: 300, photo: 0 }).gas === 0, 'below level 2 nothing of it draws');
  // Looks: the noise only under Film; time only under Film, at most 1 % a minute; still under reduced motion and ?look=1.
  check(Object.values(H.UNDER_MEASURED).every((r) => X.MEASURED_RULES.includes(r)) && H.UNDER_MEASURED.streaks === 'hidden' && H.UNDER_MEASURED.drift === 'still', 'UNDER_MEASURED: the streaks hidden, the drift still');
  const run = (o) => { hero.frame({ camera, rPx: 300, steps: 16, photo: 0, tier: 1, gain: 1, dtMs: 60000, ...o }); return uGas.uTime.value; };
  const t0 = run({ look: 'film', frozen: true });
  check(run({ look: 'film', reduced: true }) === t0 && run({ look: 'measured' }) === t0, 'nothing moves under ?look=1, reduced motion or Measured');
  check(uGas.uStreak.value === 0, 'and Measured draws no generated streaks');
  const t1 = run({ look: 'film' });
  check(t1 > t0 && t1 - t0 <= 0.0100001, `under Film the grain drifts at most 1 % of its size a minute (${(t1 - t0).toFixed(4)})`);
  // Palettes (DS-B07): Deep is the enhanced one; Eye desaturated.
  const deep = H.paletteFor(X.exposureLook('deep').milkyWay), cam = H.paletteFor(X.exposureLook('camera').milkyWay), eye = H.paletteFor(X.exposureLook('eye').milkyWay);
  check(deep.mode === 'deep' && deep.enhanced && cam.mode === 'camera' && !cam.enhanced, 'Deep is the enhanced stretch, Camera the photograph as taken');
  check(eye.saturation < 0.1 && eye.gamma > 2 && deep.gamma < 1 && cam.gamma === 1, 'each exposure\'s stretch is the photographs\' own (scene/exposure.js)');
  // Every material in the colour and alpha policy (tests/test_gasmat.mjs holds it for all deep materials too).
  hero.group.traverse((o) => {
    if (!o.material) return;
    const m = o.material;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${o.name}: opaque list, not tone mapped, no depth write`);
    const over = m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.OneMinusSrcAlphaFactor;
    check(m.blending === THREE.AdditiveBlending || over, `${o.name}: additive or premultiplied over`);
    check(over === ('GAS_ABSORB' in (m.defines || {})), `${o.name}: its alpha matches its blend`);
  });
  const meshes = []; hero.group.traverse((o) => { if (o.isMesh) meshes.push(o.name); });
  check(meshes.length === 3, `three draw calls: gas, knots, star (${meshes.join(', ')})`);
  hero.dispose();
  check(!hero.group.parent, 'disposed: out of the scene');
}

// --- 5b. the card: a shipped hero names its source after "What is drawn" -----------------------------
{
  await import(join(JS, 'copy/en.later.js'));
  const C = await import(join(JS, 'ui/cardfacts.js'));
  const line = C.honestyClause({ id: 'dso-helix-nebula', klass: 'dso', meta: { kind: 'nebula', drawn: ['photograph'], heroDrawn: ['reconstruction'], heroId: 'helix' } }, {});
  check(/a 3D reconstruction from a published study/.test(line) && /O’Dell, McCullough and Meixner \(2004\)/.test(line) && /Not yet reviewed by an astronomer\./.test(line), `the card names the reconstruction, its light, its paper and that it is not yet reviewed (${line})`);
  const plain = C.honestyClause({ id: 'dso-helix-nebula', klass: 'dso', meta: { kind: 'nebula', drawn: ['photograph'] } }, {});
  check(!/O’Dell/.test(plain), 'and an unshipped hero adds nothing to it');
}

// --- 6. the knots: at their measured radii, seeded --------------------------------------------------
{
  const n = 2400;
  const a = H.knotsOf(g, n), b = H.knotsOf(g, n);
  check(a.pos.every((v, i) => v === b.pos[i]), 'the same knots every visit (seeded)');
  let out = 0, inRim = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(a.pos[3 * i], a.pos[3 * i + 1], a.pos[3 * i + 2]);
    if (r < g.knots.from - 1e-6 || r > g.knots.to + 1e-6) out++;
    if (r > 0.85 * g.R1 && r < 1.2 * g.R1) inRim++;
  }
  check(out <= n * 0.005, `the knots lie 2.2′ to 6.4′ from the star (${out} of ${n} outside)`);
  check(inRim > n * 0.4, `most on the inner edge of the ring (${inRim} of ${n})`);
  check(a.knot.every((v, i) => (i % 4 !== 0) || (v > 0.5 * g.knots.head && v < 1.5 * g.knots.head)), 'heads of the measured size');
}

if (problems.length) {
  console.error('hero helix FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('hero helix ok: the profile and its sources, the two rings at 23° and 53° (PA 288° and 168°), from our side the model IS the photograph (24 and 4 samples), never white edge on, finite from every side, the star centred across 60°, T0, the photograph and the glow handed over, the exposures\' stretch, nothing moving under Measured, the knots at their radii, the card');
