// tests/test_hero_helix.mjs -- the Helix Nebula as a hero (internal spec 0075 stage b, #787; DS-B02,
// B03, B04, B07): its layers come from the registry with their sources; the two rings at the published
// tilts and position angles (O'Dell, McCullough & Meixner 2004), seen from our side as the photograph's
// ellipse; the gas sampled only inside each layer, with finite columns from every side and from inside;
// the white dwarf at the centre of the frame across a 60 degree arc; T0's few samples and no noise; the
// photograph and the point glow handed over by their own shares; the enhanced palette only under Deep;
// nothing moving under Measured, reduced motion or ?look=1; the knots at their measured radii.
//
//   node tests/test_hero_helix.mjs
import { readFileSync } from 'node:fs';
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
  check(parts.outer.diameter_arcsec === 1500 && parts.outer.drawn === 'illustration', 'the outermost ring: 1 500″, an illustration of its shape');
  check(parts.knots.from_arcmin === 2.2 && parts.knots.to_arcmin === 6.4 && parts.knots.count_estimated === 23000, 'the knots: 2.2′ to 6.4′ (Matsuura et al. 2009), about 23 000 (Meixner et al. 2005)');
  check(HERO.colours.mode === true && HERO.colours.enhanced && HERO.colours.enhanced.mode === 'enhanced' && HERO.colours.enhanced.under === 'deep', 'the colours: true under Eye and Camera, ENHANCED (declared) under Deep (DS-B07)');
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `review.${k} is written`);
  check(HERO.shipped === false || (HERO.review.by && HERO.review.date), 'shipped only with a person\'s sign-off (requirement 20)');
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'reconstruction' && HERO.credits.length >= 3, 'it draws a reconstruction, with its credit lines');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const sect = credits.slice(credits.indexOf('### The Helix (stage b)'), credits.indexOf('### The Large Magellanic Cloud'));
  for (const s of ['AJ 128, 2339', 'AJ 130, 1784', 'ApJ 700, 1067', 'eso0907a', 'ENHANCED']) check(sect.includes(s), `CREDITS.md's Helix section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  check(/deepHelix: \{[\s\S]*card: \{\s*helix: 'Its 3D shape follows O’Dell, McCullough and Meixner \(2004\)/.test(words), 'the card\'s source line names the paper (copy/en.later.js deepHelix.card.helix)');
}

// --- 2. the geometry: the published tilts, seen from our side as the photograph shows them -----------
const g = H.geometryOf();
{
  const asLy = (arcsec) => arcsec * 655 * Math.PI / 648000;
  check(near(g.R1, asLy(249.5), 1e-9) && near(g.R2, asLy(371), 1e-9) && near(g.Ro, asLy(750), 1e-9), `the paper's arcseconds at the Gaia distance (R1 ${g.R1.toFixed(3)} ly, R2 ${g.R2.toFixed(3)} ly)`);
  check(near(Math.acos(-g.a1[2]) / D2R, 23, 1e-9) && near(Math.acos(-g.a2[2]) / D2R, 53, 1e-9), 'each axis is its tilt from our line of sight');
  check(g.axesDeg > 60 && g.axesDeg < 75, `the two rings "almost perpendicular": ${g.axesDeg.toFixed(1)}° between their axes`);
  // The near side of a ring is where the far end of its axis points on the sky: x west, y north.
  const pa = (a) => ((Math.atan2(-a[0], a[1]) / D2R) + 360) % 360;
  check(near(pa(g.a1), 288, 1e-6) && near(pa(g.a2), 168, 1e-6), `the axes point to PA 288° and 168° on the sky (${pa(g.a1).toFixed(1)}, ${pa(g.a2).toFixed(1)})`);
  // A ring point toward that PA is nearer us (+z), so that side is the near side.
  const nearPt = (a) => { const s = unit([a[0], a[1], 0]); return dot(unit([s[0] * Math.abs(a[2]), s[1] * Math.abs(a[2]), Math.hypot(a[0], a[1])]), a); };
  check(Math.abs(nearPt(g.a1)) < 1e-9 && Math.abs(nearPt(g.a2)) < 1e-9, 'the near side lies in each ring\'s plane');
  // From our side, the [O III] column's second moments: an ellipse with its long axis at PA 18° and an
  // axis ratio cos 23°, as measured on the photograph (major axis PA 20°, ratio 0.88; helix.yaml).
  let see = 0, snn = 0, sen = 0, s = 0;
  const N = 64, half = 1.3 * g.R1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const w = -half + (2 * half * (x + 0.5)) / N, n = -half + (2 * half * (y + 0.5)) / N;
    const c = H.columnJs(g, [w, n, 50], [0, 0, -1], 24, 0.5).o3;
    const e = -w; see += c * e * e; snn += c * n * n; sen += c * e * n; s += c;
  }
  const m = [[see / s, sen / s], [sen / s, snn / s]];
  const tr = m[0][0] + m[1][1], det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
  const majPa = ((Math.atan2(l1 - m[1][1], m[0][1]) / D2R) + 360) % 180;
  check(near(majPa, 18, 4), `seen from our side the inner disc's long axis is at PA ${majPa.toFixed(1)}° (the photograph's 20°, the paper's 18°)`);
  check(near(Math.sqrt(l2 / l1), Math.cos(23 * D2R), 0.06), `and its axis ratio ${Math.sqrt(l2 / l1).toFixed(2)} is about cos 23° (the photograph's 0.88)`);
}

// --- 3. the layers along a ray: inside each layer's own box, finite from every side and from inside ---
{
  const S = (s) => (s ? Math.max(0, s[1] - s[0]) + Math.max(0, s[3] - s[2]) : 0);
  // a ray in the disc's plane, outside its slab, and a ray along its axis, outside its annulus
  const a = g.a1;
  const e1 = unit([a[1], -a[0], 0]);
  check(H.layerSpan([e1[0] * 5 + a[0] * g.H1 * 3, e1[1] * 5 + a[1] * g.H1 * 3, e1[2] * 5 + a[2] * g.H1 * 3], e1.map((x) => -x), a, 2.6 * g.H1, 0, 1.6 * g.R1, 0, 20) === null, 'a ray parallel to the disc, outside its slab, misses it');
  check(H.layerSpan([a[0] * 5 + e1[0] * 3, a[1] * 5 + e1[1] * 3, a[2] * 5 + e1[2] * 3], a.map((x) => -x), a, 2.6 * g.H1, 0, 1.6 * g.R1, 0, 20) === null, 'a ray along the axis, outside the annulus, misses it');
  const thru = H.layerSpan(a.map((x) => x * 5), a.map((x) => -x), a, 2.6 * g.H1, 0, 1.6 * g.R1, 0, 20);
  check(thru && near(S(thru), 2 * 2.6 * g.H1, 1e-9), 'face on, the disc is sampled through its slab only, not the bounding sphere');
  const hole = H.layerSpan(g.a2.map((x) => x * 5), g.a2.map((x) => -x), g.a2, 2.6 * g.W2, g.R2 - 2.6 * g.W2, g.R2 + 2.6 * g.W2, 0, 20);
  check(hole === null, 'through the outer ring\'s hole along its axis: nothing');
  // The face-on column against its integral: ∫ exp(-(z/H1)²) dz = H1 √π, times the profile at q.
  const q = 0.55, p0 = unit([a[1], -a[0], 0]).map((x) => x * q * g.R1);
  const col = H.columnJs(g, [p0[0] + a[0] * 6, p0[1] + a[1] * 6, p0[2] + a[2] * 6], a.map((x) => -x), 24, 0.5);
  const want = g.H1 * Math.sqrt(Math.PI) * H.discAt(g, p0).o3;
  check(near(col.o3, want, 0.03 * want), `face on, 24 samples in the slab give the analytic column (${col.o3.toFixed(4)} against ${want.toFixed(4)})`);
  const col4 = [0.125, 0.375, 0.625, 0.875].map((j) => H.columnJs(g, [p0[0] + a[0] * 6, p0[1] + a[1] * 6, p0[2] + a[2] * 6], a.map((x) => -x), 4, j).o3);
  check(col4.every((c) => near(c, want, 0.06 * want)), `and so do T0's 4, whatever the pixel's offset (${col4.map((c) => c.toFixed(4)).join(', ')}): no bands`);
  // Many rays from outside and from inside: finite, non-negative, and bounded edge on.
  let bad = 0, maxO3 = 0;
  let r = 12345;
  const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
  for (let i = 0; i < 4000; i++) {
    const inside = i % 2 === 0;
    const ro = inside ? [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map((x) => x * 1.6) : unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]).map((x) => x * 8);
    const rd = inside ? unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]) : unit([-ro[0] + (rnd() - 0.5) * 4, -ro[1] + (rnd() - 0.5) * 4, -ro[2] + (rnd() - 0.5) * 4]);
    const c = H.columnJs(g, ro, rd, 8, rnd());
    for (const k of ['o3', 'he', 'ha', 'dust', 'ring']) if (!(Number.isFinite(c[k]) && c[k] >= 0)) bad++;
    maxO3 = Math.max(maxO3, c.o3);
  }
  check(bad === 0, `4 000 rays from outside and inside: every column finite and non-negative (${bad} bad)`);
  check(maxO3 < 3 * g.R1, `the brightest column (edge on) stays bounded: ${maxO3.toFixed(2)} ly`);
  const colour = H.colourOf({ o3: maxO3, he: 1, ha: 1, ring: 1 }, H.paletteFor(1));
  check(colour.every((c) => c < 1), `and its colour under its soft knee stays below white (${colour.map((c) => c.toFixed(2)).join(', ')})`);
}

// --- 4. the GLSL is written from the same numbers -----------------------------------------------------
{
  const f = H.SHADERS.gas;
  for (const [k, v] of Object.entries(H.SHAPE)) if (!['sigma', 'exposure', 'adapt'].includes(k)) check(f.includes(Number(v).toFixed(3)), `GAS_FRAG carries SHAPE.${k} (${v})`);
  check(/vec4 layerSpan\( vec3 ro, vec3 rd, vec3 a, float h, float rIn, float rOut, float t0, float t1 \)/.test(f) && /vec4 shellSpan\(/.test(f), 'the fragment has the same two span functions');
  check(/pixelHash\( gl_FragCoord\.xy \)/.test(f) && !/52\.9829189/.test(f), 'a hash of the pixel for the offset (no diagonal pattern of interleaved gradient noise)');
  check(/if \( uNoiseAmp <= 0\.0 \) return 1\.0;/.test(f), 'no noise volume is read when the noise is off (T0, Measured)');
  check(/vAlpha = aKnot\.z \/ \( grow \* grow \);/.test(H.SHADERS.knotVertex), 'a knot drawn bigger than it is spreads its absorption: the sum of its darkness is the true one');
  for (const [k, v] of Object.entries(H.SHADERS)) {
    const bad = [...v.matchAll(/smoothstep\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,/g)].filter((m) => Number(m[1]) >= Number(m[2]));
    check(!bad.length, `${k}: smoothstep's edges in order (GLSL leaves edge0 >= edge1 undefined): ${bad.map((m) => m[0]).join(' ')}`);
  }
  check(H.pixelHash(10, 20) >= 0 && H.pixelHash(10, 20) < 1 && H.pixelHash(10, 20) !== H.pixelHash(11, 20), 'the offset is a hash in [0, 1)');
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
  // Tiers (DS-B04): T0 takes 4 samples a layer, reads no noise, draws 600 knots; T2 at level 3 takes half the steps.
  const uGas = hero.group.getObjectByName(`${hero.group.name}-shells`).material.uniforms;
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  check(hero.stats().samples === 4 && uGas.uNoiseAmp.value === 0 && hero.stats().knots === 600, `T0: 4 samples a layer, no noise volume, 600 knots (${JSON.stringify(hero.stats())})`);
  hero.frame({ camera, rPx: 400, steps: 32, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().samples === 16 && hero.stats().knots === 2400, 'T2 at level 3: 16 samples a layer (32 steps), 2 400 knots');
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
  check(Object.values(H.UNDER_MEASURED).every((r) => X.MEASURED_RULES.includes(r)) && H.UNDER_MEASURED.noise === 'hidden' && H.UNDER_MEASURED.drift === 'still', 'UNDER_MEASURED: the noise hidden, the drift still');
  const run = (o) => { hero.frame({ camera, rPx: 300, steps: 16, photo: 0, tier: 1, gain: 1, dtMs: 60000, ...o }); return uGas.uTime.value; };
  const t0 = run({ look: 'film', frozen: true });
  check(run({ look: 'film', reduced: true }) === t0 && run({ look: 'measured' }) === t0, 'nothing moves under ?look=1, reduced motion or Measured');
  check(uGas.uNoiseAmp.value === 0, 'and Measured draws no generated grain');
  const t1 = run({ look: 'film' });
  check(t1 > t0 && t1 - t0 <= 0.0100001, `under Film the grain drifts at most 1 % of its size a minute (${(t1 - t0).toFixed(4)})`);
  // Palettes (DS-B07): Deep is the enhanced one; Eye desaturated.
  const deep = H.paletteFor(X.exposureLook('deep').milkyWay), cam = H.paletteFor(X.exposureLook('camera').milkyWay), eye = H.paletteFor(X.exposureLook('eye').milkyWay);
  check(deep.mode === 'deep' && deep.enhanced && cam.mode === 'camera' && !cam.enhanced, 'Deep draws the enhanced palette, Camera the photograph\'s');
  const spread = (c) => Math.max(...c) - Math.min(...c);
  check(spread(eye.o3) < 0.1 * spread(cam.o3), 'Eye desaturates as on the photographs');
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
console.log('hero helix ok: the profile and its sources, the two rings at 23° and 53° (PA 288° and 168°) seen from our side as the photograph\'s ellipse, the gas only inside each layer and finite from every side, the star centred across 60°, T0\'s 4 samples, the photograph and the glow handed over, Deep\'s enhanced palette, nothing moving under Measured, the knots at their radii');
