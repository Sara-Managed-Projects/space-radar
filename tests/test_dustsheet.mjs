// tests/test_dustsheet.mjs -- dark and reflection nebulae as sheets (internal spec 0076 stage W3-c, internal #784,
// #806): the Horsehead, the Coalsack, M78 and the Iris from their registry profiles with their sources; A STAR BEHIND A
// DARK SHEET IS DIMMED AND REDDENED (Cardelli, Clayton & Mathis 1989), a star in front of it is not, and a catalogue
// star in front is kept clear on the screen from either side; THE DUST ABSORBS AND NEVER GLOWS (its mesh is a multiply
// blend whose output is at most 1); THE DRAW ORDER: the stars and the photographs, then the dust, then its own light,
// then its own star; from our line the light through the dust is the picture; a reflection sheet's light is only where
// the picture has it and its phase function is 1 on our line; the closed form (T0, the latch) agrees with the march
// on our line; finite from every side and from inside; one module and no fork per object; Measured; tiers; the
// budgets; no pass.
//
//   node tests/test_dustsheet.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const D = await import(join(JS, 'scene/deep/dustsheet.js'));
const R = await import(join(JS, 'scene/deep/remnant.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const P = {};
for (const id of ['horsehead', 'coalsack', 'm78', 'iris']) P[id] = (await import(join(JS, `data/hero-${id}.js`))).HERO;
const STARS = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/sheets/stars.json'), 'utf8'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 1. the profiles ---------------------------------------------------------------------------------------------------
for (const H of Object.values(P)) {
  const du = R.part(H, 'dust');
  check(du.source && /Cardelli, Clayton & Mathis 1989, ApJ 345, 245/.test(du.source), `${H.id}: its dust has a source and the extinction law's`);
  check(du.reddening && du.reddening.rv === 3.1, `${H.id}: R_V = 3.1`);
  check(du.rule && du.rule.dark_below > 0 && du.rule.dark_below < 1 && du.tau_max > 0, `${H.id}: the rule that reads an optical depth from darkness is in its profile`);
  check(H.shipped === true && H.review.by === 'Space Radar maintainers' && /not yet/.test(H.review.astronomer || ''), `${H.id}: shipped under the lead's policy`);
  check(H.credits.length >= 2 && H.sources.length >= 3, `${H.id}: credits and sources`);
}
check(/in silhouette against IC 434/.test(P.horsehead.sources[0]) && /Abergel, A\. et al\. 2024/.test(P.horsehead.sources[0]), 'the Horsehead in silhouette against IC 434 (Abergel et al. 2024)');
check(R.part(P.horsehead, 'light').z_ly < R.part(P.horsehead, 'dust').front.z_ly, 'IC 434\'s glow is BEHIND the Horsehead\'s dust');
for (const id of ['m78', 'iris']) {
  const st = R.part(P[id], 'stars').stars[0], li = R.part(P[id], 'light');
  check(st && st.z_ly > li.z_ly && /SIMBAD/.test(R.part(P[id], 'stars').source), `${id}: its star (SIMBAD) in front of the lit dust`);
  check(li.solved && li.solved.correlation > 2 * li.solved.mirror, `${id}: the picture placed by the 2MASS solve (correlation ${li.solved && li.solved.correlation} against its mirror ${li.solved && li.solved.mirror})`);
  check(/CC BY 4\.0/.test(li.source) && /NOIRLab/.test(li.source), `${id}: the picture's licence quoted`);
}
{
  const rows = HEROES.filter((h) => ['horsehead', 'coalsack', 'm78', 'iris'].includes(h.id));
  check(rows.length === 4 && rows.every((h) => /dustsheet\.js/.test(String(h.build))), 'all four are drawn by scene/deep/dustsheet.js');
  const src = readFileSync(join(JS, 'scene/deep/dustsheet.js'), 'utf8').replace(/\/\/.*$/gm, '');
  check(!/\b(horsehead|coalsack|m78|iris|ic 434)\b/i.test(src), 'no object is named in dustsheet.js\'s code: no per-object fork');
}

// --- 2. the reddening law ----------------------------------------------------------------------------------------------
{
  check(near(D.ccm(0.55), 1.0, 0.01), `A(V)/A(V) = 1 at 0.55 um (${D.ccm(0.55).toFixed(3)})`);
  check(near(D.ccm(0.44), 1.32, 0.03), `A(B)/A(V) about 1.32 at 0.44 um (${D.ccm(0.44).toFixed(3)}; CCM89 at R_V 3.1)`);
  check(near(D.ccm(0.66), 0.80, 0.04), `A(R)/A(V) about 0.8 at 0.66 um (${D.ccm(0.66).toFixed(3)})`);
  const k = D.reddening({ rv: 3.1, lambda_um: [0.61, 0.55, 0.45] });
  check(k[0] < k[1] && k[1] < k[2], `blue is absorbed most (r ${k[0].toFixed(3)}, g ${k[1].toFixed(3)}, b ${k[2].toFixed(3)}): what is behind is reddened`);
}

// --- 3. a star behind a dark sheet is dimmed and reddened; one in front is not ------------------------------------------
const tauFlat = (tf, tb = 0) => () => [tf, tb];
{
  const g = D.sheetOf(P.coalsack);
  const front = g.layers.find((L) => L.kind === 'front');
  const cam = [0, 0, 580];                                  // from near the Sun's side
  for (const closed of [false, true]) {
    const behind = D.transmissionTo(g, [3, -2, -400], cam, { tau: tauFlat(1.2), n: 12, closed });
    const before = D.transmissionTo(g, [3, -2, front.z + front.half + 50], cam, { tau: tauFlat(1.2), n: 12, closed });
    check(behind.every((t) => t < 1) && behind[2] < behind[1] && behind[1] < behind[0], `${closed ? 'closed form' : 'march'}: a star behind the Coalsack is dimmed and reddened (T r ${behind[0].toFixed(3)}, g ${behind[1].toFixed(3)}, b ${behind[2].toFixed(3)})`);
    check(near(-Math.log(behind[1]), 1.2 * D.ccm(0.55), 0.06), `${closed ? 'closed form' : 'march'}: in green its optical depth is the map's (${(-Math.log(behind[1])).toFixed(3)} for 1.2)`);
    check(before.every((t) => t === 1), `${closed ? 'closed form' : 'march'}: a star in front of it is not dimmed`);
  }
  // the kept stars: a catalogue star in front of the dust is kept clear from our side, and from behind the dust it is not
  const list = [[1, 1, front.z + 40, 0.5], [2, 2, front.z - 40, 0.5]];
  const ours = D.keepActive(g, list, cam), theirs = D.keepActive(g, list, [0, 0, -580]);
  check(ours.length === 1 && ours[0].pos[2] > front.z && theirs.length === 1 && theirs[0].pos[2] < front.z, 'a catalogue star on the camera\'s side of the dust is kept clear, from either side');
  check(D.keepRadiusPx(0.77) > 6 && D.keepRadiusPx(6) < 3, `the kept disc is the star's drawn size (Acrux ${D.keepRadiusPx(0.77).toFixed(1)} px, a 6th-magnitude star ${D.keepRadiusPx(6).toFixed(1)} px)`);
  const cs = STARS.coalsack;
  check(cs && Array.isArray(cs.keep) && cs.keep.length >= 10 && cs.keep.some((s) => s[2] > 0), `the bake lists the catalogue's stars in the Coalsack's footprint (${cs && cs.keep.length}), those in front among them`);
  check(STARS.iris && STARS.iris.twins && Array.isArray(STARS.iris.twins['HD 200775']), 'the catalogue\'s copy of HD 200775 is found, so it steps aside while the hero draws its own');
}

// --- 4. the dust absorbs and never glows: the multiply blend, the draw order ------------------------------------------
{
  const hero = D.createHero(THREE, { profile: P.horsehead, record: null, fetchJson: () => Promise.resolve(STARS) });
  const meshes = [];
  hero.group.traverse((o) => { if (o.isMesh || o.isPoints) meshes.push(o); });
  const absorb = meshes.find((m) => m.material.name === 'deep-dust-absorb'), light = meshes.find((m) => m.material.name === 'deep-dust-light');
  check(absorb && absorb.material.blending === THREE.CustomBlending && absorb.material.blendSrc === THREE.ZeroFactor && absorb.material.blendDst === THREE.SrcColorFactor,
    'the dust is a multiply blend (Zero, SrcColor): what is behind is multiplied by its transmission, and nothing is added');
  check(absorb && absorb.material.blendSrcAlpha === THREE.ZeroFactor && absorb.material.blendDstAlpha === THREE.OneFactor, 'and the framebuffer\'s alpha is left as it was');
  check(/vec4\( mix\( vec3\( 1\.0 \), pow\( T, vec3\( 1\.0 \/ 2\.2 \) \), uShare \), 1\.0 \)/.test(D.SHADERS.absorb) && /vec3 T = exp\( -tau \* uK \)/.test(D.SHADERS.absorb),
    'its output is exp(-tau k)^(1/2.2) mixed with 1: never above 1, so it can only darken (and on display values)');
  check(light && light.material.blending === THREE.AdditiveBlending, 'the light behind the dust is its own additive mesh');
  for (const m of meshes) check(m.material.transparent === false && m.material.depthWrite === false && m.material.depthTest === false, `${m.name}: in the opaque list, no depth (gasmat.js COLOUR_POLICY)`);
  // three's sort: group order (the nearest Group's renderOrder), then renderOrder. A stand-in for the scene.
  const scene = new THREE.Scene();
  const starsG = new THREE.Group(); starsG.renderOrder = -1; const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()); stars.renderOrder = -1; stars.name = 'stars3d'; starsG.add(stars);
  const neb = new THREE.Group(); neb.renderOrder = -1; const photo = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial()); photo.renderOrder = -1; photo.name = 'nebula-photo'; neb.add(photo);
  const deep = new THREE.Group(); deep.renderOrder = -1; deep.add(hero.group);
  scene.add(starsG, neb, deep);
  const order = [];
  const walk = (o, groupOrder) => { if (o.isGroup) groupOrder = o.renderOrder; if (o.isMesh || o.isPoints) order.push({ name: o.material.name || o.name, g: groupOrder, r: o.renderOrder, id: o.id }); for (const c of o.children) walk(c, groupOrder); };
  walk(scene, 0);
  order.sort((a, b) => a.g - b.g || a.r - b.r || a.id - b.id);
  const at = (n) => order.findIndex((o) => o.name === n);
  check(at('stars3d') < at('deep-dust-absorb') && at('nebula-photo') < at('deep-dust-absorb') && at('deep-dust-absorb') < at('deep-dust-light'),
    `the draw order: the catalogue's stars and the photographs, then the dust, then its own light (${order.map((o) => o.name).join(' < ')})`);
  hero.dispose();
  const iris = D.createHero(THREE, { profile: P.iris, record: null, fetchJson: () => Promise.resolve(STARS) });
  const pts = [];
  iris.group.traverse((o) => { if (o.isPoints) pts.push(o); });
  const ab = []; iris.group.traverse((o) => { if (o.isMesh) ab.push(o); });
  check(pts.length === 1 && pts[0].renderOrder > Math.max(...ab.map((m) => m.renderOrder)), 'a reflection nebula\'s own star is drawn after its dust and its light: it stands in front');
  check(iris.latchSafe === true && iris.card.copy === 'r12Dust', 'latch-safe; the card reads the r12Dust words');
  iris.dispose();
}

// --- 5. from our line the light through the dust is the picture; the light only where the picture has it ----------------
{
  const g = D.sheetOf(P.horsehead);
  const lightL = R.part(P.horsehead, 'light');
  const cam = [0.4, -0.3, 300];
  const L = [0.6, 0.3, 0.45];
  for (const tau of [0, 0.4, 1.5]) {
    const m = D.columnJs(g, cam, [0, 0, -1], { n: 8, j: 0.31, tau: tauFlat(tau), light: () => L });
    const c = D.closedJs(g, cam, [0, 0, -1], { tau: tauFlat(tau), light: () => L });
    const [u, v] = g.uvL.at(cam[0], cam[1]);
    const [ud, vd] = g.uvD.at(cam[0], cam[1]);
    const cov = R.coverAt(u, v, g.edgeL), covD = R.coverAt(ud, vd, g.edgeD);
    const want = L.map((x, i) => x * cov * Math.exp(-tau * covD * g.k[i]));
    check(want.every((w, i) => near(c.C[i], w, 1e-9 + 1e-6)), `closed form, tau ${tau}: from our line light x exp(-tau k) exactly (the bake's rule: the picture again)`);
    check(want.every((w, i) => near(m.C[i], w, 0.04 * w + 1e-6)), `march, tau ${tau}: the same within 4 % (${m.C.map((x) => x.toFixed(3)).join(', ')} against ${want.map((x) => x.toFixed(3)).join(', ')})`);
  }
  check(lightL.z_ly < 0, 'the glow is behind the dust');
  const none = D.columnJs(g, cam, [0, 0, -1], { tau: tauFlat(0), light: () => [0, 0, 0] });
  check(none.C.every((c) => c === 0), 'where the picture has no light, the sheet adds none: nothing glows that the picture does not show');
  // a reflection sheet: the phase function is 1 on our line, brighter looking toward the star (forward), dimmer from the side
  const gr = D.sheetOf(P.iris);
  const ph = gr.phase, s = ph.star.pos;
  const p = [s[0] + 0.3, s[1] - 0.2, R.part(P.iris, 'light').z_ly];
  check(near(D.phaseFactor(ph, p, [p[0], p[1], 500]), 1, 1e-6), 'the phase function is exactly 1 on our line: there the light is the photograph\'s');
  const back = [p[0] + (p[0] - s[0]) * 50, p[1] + (p[1] - s[1]) * 50, p[2] + (p[2] - s[2]) * 50];
  check(D.phaseFactor(ph, p, back) > 1.5, 'seen from beyond the dust, looking back toward the star, forward scattering brightens it');
  check(D.phaseFactor(ph, p, [p[0] + 500, p[1], p[2]]) > 1, 'from the side it is brighter than from here: the star is in front, so from here the dust is seen scattering light back, the weakest way');
  check(D.phaseFactor(ph, p, back) <= ph.hi && D.phaseFactor(ph, p, [p[0], p[1], -500]) >= ph.lo, 'clamped to the profile\'s range');
}

// --- 6. finite from every side and from inside; tiers; Measured; no pass; budgets -------------------------------------
{
  let bad = 0;
  for (const H of Object.values(P)) {
    const g = D.sheetOf(H);
    const span = Math.max(...g.box.max.map((v, i) => v - g.box.min[i]));
    for (let i = 0; i < 200; i++) {
      const th = Math.acos(1 - 2 * ((i + 0.5) / 200)), phi = i * 2.39996;
      const dir = [Math.sin(th) * Math.cos(phi), Math.sin(th) * Math.sin(phi), Math.cos(th)];
      const dist = i % 4 === 0 ? 0.05 * span : 1.5 * span;
      const ro = dir.map((d, k) => (g.box.min[k] + g.box.max[k]) / 2 + d * dist);
      const rd = [Math.sin(phi * 1.3), Math.cos(th * 1.9), Math.sin(th - phi)];
      const l = Math.hypot(...rd); rd.forEach((_, k) => { rd[k] /= l; });
      for (const fn of [D.columnJs, D.closedJs]) {
        const o = fn(g, ro, rd, { n: 8, j: 0.5, tau: tauFlat(2, 1), light: () => [0.5, 0.5, 0.5] });
        if (!o.T.every((t) => Number.isFinite(t) && t >= 0 && t <= 1) || !o.C.every((c) => Number.isFinite(c) && c >= 0)) bad += 1;
      }
    }
  }
  check(bad === 0, `finite, transmissions in [0, 1] and light never negative from 1 600 views of the four (${bad} bad)`);
  check(D.samplesFor({ tier: 0 }) === 0 && D.samplesFor({ tier: 2, cheap: true }) === 0, 'T0 and the latch: the closed form (0 samples)');
  check(D.samplesFor({ tier: 1 }) === 8 && D.samplesFor({ tier: 2, steps: 48 }) === 16, 'level 2: 8 samples a layer; Ultra at level 3: 16');
  check(X.drawnUnder('measured', D.UNDER_MEASURED.dust) && X.drawnUnder('measured', D.UNDER_MEASURED.light) && X.stillUnder('measured', D.UNDER_MEASURED.motion), 'under Measured the dust and the light are the same and nothing moves');
  for (const [name, src] of Object.entries(D.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget|lensflare/i.test(src), `${name}: no bloom, no pass, no render target`);
  check((D.SHADERS.absorb.match(/uniform vec4 uKeep\[ (\d+) \]/) || [])[1] <= 64, 'the kept stars fit a fragment shader\'s uniforms');
  const dir = join(ROOT, 'site/images/deep/sheets');
  const total = ['crab-light.webp', 'veil-light.webp', 'horsehead-light.webp', 'horsehead-dust.webp', 'coalsack-dust.webp', 'm78-light.webp', 'm78-dust.webp', 'iris-light.webp', 'iris-dust.webp', 'stars.json', 'manifest.json']
    .reduce((a, n) => a + statSync(join(dir, n)).size, 0);
  check(total <= BUDGETS.deep_sheets_bytes && total <= 1500000, `the six heroes' files are ${total} B, within the budget (${BUDGETS.deep_sheets_bytes}; the design's 1.5 MB)`);
  check(BUDGETS.deep_sheets_draw_calls <= 5, 'at most +5 draw calls for a hero (design section 4)');
  const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
  check(/'js\/scene\/deep\/dustsheet\.js'/.test(diet) && ['horsehead', 'coalsack', 'm78', 'iris'].every((id) => diet.includes(`'js/data/hero-${id}.js'`)), 'the boot diet holds its module and its profiles out of the first visit');
}

if (problems.length) {
  console.error(`test_dustsheet: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_dustsheet: ok (the profiles and their sources, the reddening law, a star behind dimmed and reddened and one in front not, kept stars, a multiply blend that only darkens, the draw order, the picture on our line, light only where the picture has it, the phase function, finite everywhere, tiers, Measured, no pass, the budgets)');
