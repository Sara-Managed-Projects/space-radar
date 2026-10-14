// tests/test_hero_spiral.mjs -- internal spec 0075 stage d (#789; DS-C03 #814, DS-C04 #815): galaxies
// from their own measured structure (scene/deep/spiral.js), Andromeda and the Triangulum Galaxy as heroes.
//   1. the orientation: M31 at 77 degrees, its north-west edge near, its arms trailing its rotation
//   2. the ellipse changes as the camera circles: the projected axis ratio follows |cos| of the view
//   3. the size, the points by tier, the same bytes for the same seed
//   4. each morphology its own shape (no galaxy a copy of another); no Milky Way copy left
//   5. the photograph and the model sum to one; the dust takes light, the light adds it (colour policy)
//   6. landmarks: the ring splits toward M32, NGC 604 lies in M33's disc, M32 and M110 drawn in place
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/deep/spiral.js'));
const { ANDROMEDA_LINK } = await import(join(JS, 'scene/galaxy.js'));
const M31 = (await import(join(JS, 'data/hero-m31.js'))).HERO;
const M33 = (await import(join(JS, 'data/hero-m33.js'))).HERO;
const LY_KM = 9460730472580.8;
const D2R = Math.PI / 180;
const rows = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const recordOf = (id) => {
  const o = rows.find((r) => r.id === id);
  return { id: `dso-${id}`, pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM }, meta: { sizeLy: o.distLy * (o.majAxArcmin / 60) * D2R, posAngDeg: o.posAngDeg, majAxArcmin: o.majAxArcmin, minAxArcmin: o.minAxArcmin, morphology: o.morphology }, row: o };
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const prep = (profile, rec, count = 30000) => {
  const p0 = S.paramsFor(profile, rec);
  const axes = S.discAxes(rec.pos, p0.frame);
  const params = S.resolveSky(p0, rec.pos, axes);
  return { axes, params, g: S.generateGalaxy(params, { count, dust: 0.3, seed: 5 }) };
};
// the light-weighted second moments of points projected on a plane (u, v): the axis ratio and angle
const moments = (g, u, v) => {
  let suu = 0, svv = 0, suv = 0, w = 0;
  const L = g.light;
  for (let i = 0; i < L.count; i++) {
    const p = [L.pos[i * 3], L.pos[i * 3 + 1], L.pos[i * 3 + 2]];
    const a = dot(p, u), b = dot(p, v), k = L.lum[i];
    suu += k * a * a; svv += k * b * b; suv += k * a * b; w += k;
  }
  suu /= w; svv /= w; suv /= w;
  const tr = suu + svv, det = suu * svv - suv * suv, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  return { ratio: Math.sqrt(Math.max(0, l2) / l1), angle: 0.5 * Math.atan2(2 * suv, suu - svv) };
};

// ---------------------------------------------------------------------------- 1. the orientation
const m31 = recordOf('m31');
const A = prep(M31, m31, 30000);
{
  const u = unit([m31.pos.x, m31.pos.y, m31.pos.z]);
  const tilt = Math.acos(Math.abs(dot(A.axes.normal, u))) / D2R;
  check(Math.abs(tilt - 77) < 1e-6, `M31's disc is inclined 77 degrees to our line of sight (${tilt.toFixed(3)})`);
  // the north-west half of the disc is the near one
  const POLE = [0, Math.sin(23.4392911 * D2R), Math.cos(23.4392911 * D2R)];
  const east = unit(cross(POLE, u)), north = cross(u, east);
  const nw = [north[0] - east[0], north[1] - east[1], north[2] - east[2]];
  const inDisc = nw.map((x, i) => x - A.axes.normal[i] * dot(nw, A.axes.normal));
  check(dot(inDisc, u) < 0, 'its north-west half is nearer the Sun than its centre');
  // the line of nodes at position angle 38 degrees east of north
  const pa = Math.atan2(dot(A.axes.major, east), dot(A.axes.major, north)) / D2R;
  check(Math.abs(((pa + 360) % 180) - 38) < 1e-6, `the line of nodes lies at 38 degrees east of north (${pa.toFixed(2)})`);
  check(A.axes.sense !== 0, 'its rotation sense is known (the south-west half approaches)');
  // the arms trail: going outward along an arm, the angle moves against the rotation
  const arms = A.g.light.kinds.indexOf('arms');
  const L = A.g.light;
  let num = 0, den = 0;
  for (let i = 0; i < L.count; i++) {
    if (L.meta[i * 4 + 3] !== arms) continue;
    const x = L.pos[i * 3], y = L.pos[i * 3 + 1], R = Math.hypot(x, y);
    if (R < 6 || R > 18) continue;
    const arm = M31.layers.find((l) => l.kind === 'arms');
    const phi0 = -A.axes.sense * Math.log(R / arm.r_from_kpc) / Math.tan(arm.pitch_deg * D2R);
    const d = Math.cos(2 * (Math.atan2(y, x) - phi0));
    num += d; den += 1;
  }
  check(den > 500 && num / den > 0.5, `the arm points follow trailing logarithmic spirals (alignment ${(num / den).toFixed(2)} over ${den})`);
}

// ------------------------------------------------- 2. the ellipse changes correctly as the camera circles
{
  // From our line of sight the projected disc is long at position angle 38 and about cos 77 wide.
  const u = unit([m31.pos.x, m31.pos.y, m31.pos.z]);
  const sky1 = unit(cross(A.axes.normal, u).every((x) => x === 0) ? [1, 0, 0] : A.axes.major);
  // In the disc's own frame the line of sight from the Sun is (los . x, los . y, los . z):
  const los = [dot(u, A.axes.major), dot(u, A.axes.across), dot(u, A.axes.normal)];
  const basis = (view) => { const a = unit(cross([0, 0, 1], view).every((x) => Math.abs(x) < 1e-9) ? [1, 0, 0] : cross([0, 0, 1], view)); return [a, cross(view, a)]; };
  const seen = [];
  for (const incl of [0, 30, 56, 77, 89]) {
    for (const az of [0, 90, 200]) {
      const view = [Math.sin(incl * D2R) * Math.cos(az * D2R), Math.sin(incl * D2R) * Math.sin(az * D2R), Math.cos(incl * D2R)];
      const [a, b] = basis(view);
      const m = moments(A.g, a, b);
      seen.push({ incl, az, ratio: m.ratio });
    }
  }
  for (const s of seen) {
    const want = Math.max(Math.cos(s.incl * D2R), 0.06);
    check(Math.abs(s.ratio - want) < 0.12 + 0.15 * (s.incl < 10 ? 1 : 0), `seen ${s.incl} degrees from face on (azimuth ${s.az}) the disc is ${s.ratio.toFixed(2)} as wide as long, as a disc is (${want.toFixed(2)})`);
  }
  const byIncl = [0, 30, 56, 77, 89].map((i) => seen.filter((s) => s.incl === i).reduce((t, s) => t + s.ratio, 0) / 3);
  check(byIncl.every((r, i) => i === 0 || r < byIncl[i - 1]), `and narrows steadily as the camera circles toward edge on (${byIncl.map((r) => r.toFixed(2)).join(', ')})`);
  // From the Sun: the long axis at the line of nodes
  const [a] = basis(los);
  const b = cross(los, a);
  const m = moments(A.g, a, b);
  const major = [Math.cos(m.angle), Math.sin(m.angle)];
  const nodes = [dot([1, 0, 0], a), dot([1, 0, 0], b)];
  const off = Math.acos(Math.min(1, Math.abs(major[0] * nodes[0] + major[1] * nodes[1]) / Math.hypot(...nodes))) / D2R;
  check(off < 3, `from the Sun the long axis lies along the line of nodes, as in her photograph (${off.toFixed(2)} degrees off)`);
  void sky1;
}

// --------------------------------------------- 3. size, points by tier, the same bytes for one seed
{
  const L = A.g.light;
  const r = [];
  for (let i = 0; i < L.count; i++) r.push(Math.hypot(L.pos[i * 3], L.pos[i * 3 + 1]));
  r.sort((x, y) => x - y);
  const R25 = m31.meta.sizeLy / 2 / S.KPC_LY;
  const r99 = r[Math.floor(0.99 * r.length)];
  check(r99 > 0.9 * R25 && r99 < 1.4 * R25, `its light reaches the catalogue's radius and not far past it (99% inside ${r99.toFixed(1)} kpc; R25 ${R25.toFixed(1)} kpc)`);
  check(S.pointsFor(A.params, 0) === 12000 && S.pointsFor(A.params, 1) === 60000 && S.pointsFor(A.params, 2) === 90000, 'M31: 12 000 / 60 000 / 90 000 points on T0 / T1 / T2 (phones fewer, over the smooth layer)');
  const B = prep(M33, recordOf('m33'), 2000);
  check(S.pointsFor(B.params, 0) === 8000 && S.pointsFor(B.params, 1) === 25000, 'M33: 8 000 / 25 000 points on T0 / T1');
  const g1 = S.generateGalaxy(A.params, { count: 4000, seed: 9 }), g2 = S.generateGalaxy(A.params, { count: 4000, seed: 9 }), g3 = S.generateGalaxy(A.params, { count: 4000, seed: 10 });
  check(g1.light.pos.every((v, i) => v === g2.light.pos[i]) && g1.light.col.every((v, i) => v === g2.light.col[i]), 'the same params and seed give the same bytes');
  check(g1.light.pos.some((v, i) => v !== g3.light.pos[i]), 'another seed, other points');
  check(A.g.dust.count > 0.2 * L.count, `a dust point set beside the light (${A.g.dust.count})`);
}

// ------------------------------- 4. each morphology its own shape; the Milky Way's copy is gone
{
  const shape = (morph) => {
    const rec = { id: 'x', pos: { x: 1e19, y: 0, z: 0 }, meta: { sizeLy: 60000, morphology: morph, posAngDeg: 0 } };
    const p = S.paramsFor({}, rec);
    const g = S.generateGalaxy({ ...p, sense: 1 }, { count: 6000, seed: 3 });
    const L = g.light;
    let disc = 0, m2c = 0, m2s = 0, cx = 0, cy = 0, w = 0, thick = 0, rr = 0;
    for (let i = 0; i < L.count; i++) {
      const x = L.pos[i * 3], y = L.pos[i * 3 + 1], z = L.pos[i * 3 + 2];
      if (L.meta[i * 4 + 1]) disc++;
      const R = Math.hypot(x, y), ph = Math.atan2(y, x);
      if (R > 3 && R < 8) { m2c += Math.cos(2 * ph - 2 * Math.log(R) / Math.tan(15 * D2R)); m2s += Math.sin(2 * ph - 2 * Math.log(R) / Math.tan(15 * D2R)); }
      cx += x; cy += y; w++; thick += z * z; rr += x * x + y * y;
    }
    return { disc: disc / L.count, arms: Math.hypot(m2c, m2s) / w, offset: Math.hypot(cx / w, cy / w), flat: Math.sqrt(thick / rr), dust: g.dust.count, kinds: L.kinds };
  };
  const sp = shape('spiral'), el = shape('elliptical'), le = shape('lenticular'), ir = shape('irregular'), bs = shape('barred-spiral');
  check(el.disc === 0 && el.dust === 0 && !el.kinds.includes('arms'), 'an elliptical is a spheroid alone: no disc, no arms, no dust');
  check(!le.kinds.includes('arms') && le.disc > 0.3, 'a lenticular has a disc and no arms');
  check(sp.arms > 3 * ir.arms && sp.kinds.includes('arms'), `a spiral has arms (m = 2 amplitude ${sp.arms.toFixed(3)} against an irregular's ${ir.arms.toFixed(3)})`);
  check(ir.kinds.includes('clumps') && !ir.kinds.includes('arms') && ir.flat > sp.flat, 'an irregular is clumpy and thicker, with no symmetric arms');
  check(bs.kinds.includes('bar'), 'a barred spiral has its bar');
  check(el.flat > 3 * sp.flat, `an elliptical is round where a spiral is flat (${el.flat.toFixed(2)} against ${sp.flat.toFixed(2)})`);
  const galaxy = readFileSync(join(JS, 'scene/galaxy.js'), 'utf8');
  const spiral = readFileSync(join(JS, 'scene/deep/spiral.js'), 'utf8');
  check(!/buildTwin|andromedaFromModel/.test(galaxy) && !/['"][^'"]*galaxy\.bin['"]/.test(spiral), 'no Milky Way copy left: galaxy.js has no twin, and the galaxies never read galaxy.bin');
  check(/import\('\.\/deep\/spiral\.js'\)/.test(galaxy), 'Andromeda\'s far copy is the same generator, fetched with the cloud (a dynamic import)');
}

// --------------------------------- 5. the photograph and the model sum to one; the colour policy
{
  const hero = S.createHero(THREE, { profile: M31, record: m31 });
  const st = hero.stats();
  check(st.points === 60000 && st.meshes === 5, `with no tier to read, T1's 60 000 points; five draws: two halves, dust, the light layer, the bulge (${st.points}, ${st.meshes})`);
  ANDROMEDA_LINK.photo = 0.6;
  hero.setLevel(2, 1);
  check(Math.abs(hero.stats().share - 0.4) < 0.011 && ANDROMEDA_LINK.heroShare === 1, `with her photograph at 0.6 the model draws the 0.4 left (${hero.stats().share})`);
  ANDROMEDA_LINK.photo = 0;
  hero.setLevel(1, 0);
  check(!hero.group.visible && hero.stats().share === 0 && ANDROMEDA_LINK.heroShare === 0, 'below level 2 the hero hands Andromeda back to the far copy');
  hero.setLevel(2, 0.5);
  const cam = new THREE.PerspectiveCamera(50, 1.6, 1, 1e9);
  cam.position.set(0, 0, 1000); cam.updateMatrixWorld();
  hero.frame({ camera: cam });
  const mats = [];
  hero.group.traverse((o) => { if (o.material) mats.push(o); });
  check(mats.length === 5, 'far half, layer, bulge, dust, near half');
  for (const o of mats) {
    const m = o.material;
    const add = m.blending === THREE.AdditiveBlending;
    const over = m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.OneMinusSrcAlphaFactor;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false && (add || over), `${o.name}: opaque list, no tone mapping, additive light or (One, 1 - alpha) dust`);
  }
  const order = mats.map((o) => [o.name, o.renderOrder]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  check(order[0].endsWith(':light-') || order[0].endsWith(':light+'), 'a half of the points first');
  check(order.indexOf(order.find((n) => n.endsWith(':dust'))) === 3 && order[1].endsWith(':layer') && /:light[+-]$/.test(order[4]), `far half, the light layer, the bulge, the dust, then the near half (${order.join(' < ')})`);
  check(!/colorspace_fragment|tonemapping_fragment/.test(S.SHADERS.light + S.SHADERS.dust), 'display values: no colour-space or tone-mapping chunk');
  check(/min\( 1\.0, \( ideal \* ideal \) \/ \( s \* s \) \)/.test(S.SHADERS.light), 'a patch held small gives up its light (exposed by projected density)');
  check(S.UNDER_MEASURED === 'same', 'under Measured the model is drawn as it is');
  hero.dispose();
  check(ANDROMEDA_LINK.heroShare === 0, 'and gives her back when it is disposed');
  // the stretch: from our side no patch of her disc draws past white, while the bulge is the brightest
  const L = A.g.light;
  let bulge = 0, nb = 0, disc = 0, nd = 0;
  const f0 = (i) => { const k = L.kinds[L.meta[i * 4 + 3]]; const l = M31.layers.find((x) => x.kind === k); return l.light; };
  const share = { bulge: 0, disc: 0 }, raw = { bulge: 0, disc: 0 };
  for (let i = 0; i < L.count; i++) { const k = L.meta[i * 4 + 1] ? 'disc' : 'bulge'; share[k] += L.lum[i]; raw[k] += 1; }
  const bulgeLayer = M31.layers.find((x) => x.kind === 'bulge');
  check(share.bulge / (share.bulge + share.disc) < 0.8 * bulgeLayer.light, `the stretch takes light from the crowded bulge, so it is not a white disc (${(share.bulge / (share.bulge + share.disc)).toFixed(2)} of the light against ${bulgeLayer.light} before)`);
  void f0;
  // patches sized by crowding: small in the bulge, large in the outskirts
  let pIn = 0, nIn = 0, pOut = 0, nOut = 0;
  for (let i = 0; i < L.count; i++) { const R = Math.hypot(L.pos[i * 3], L.pos[i * 3 + 1]); const p = L.meta[i * 4]; if (R < 1.5) { pIn += p; nIn++; } else if (R > 15) { pOut += p; nOut++; } }
  check(pIn / nIn < 0.5 * pOut / nOut, `each point's patch follows its crowding (${(pIn / nIn).toFixed(0)} inside 1.5 kpc, ${(pOut / nOut).toFixed(0)} past 15 kpc, of 255)`);
}

// ------------------------- 5b. close up: a smooth layer carries the light, the points only sparkle
{
  const prof = S.layerProfile(A.params);
  const Rd = prof.rd;
  const at = (x, y, k) => S.layerAt(prof, x, y, k);
  const shown = (x, y) => prof.gain * Math.pow(at(x, y, 1).light, S.LAYER_POWER) * (1 - at(x, y, 1).dust);
  check(Math.abs(prof.gain * Math.pow(prof.i0 * Math.exp(-1), S.LAYER_POWER) - S.LAYER_DISC_AT_RD) < 1e-9, `the layer draws its disc at ${S.LAYER_DISC_AT_RD} one scale length out, face on`);
  const ring = shown(10.4, 0), gap = shown(7.6, 0);
  check(ring > gap, `the 10 kpc ring is brighter than the disc inside it (${ring.toFixed(3)} against ${gap.toFixed(3)})`);
  let maxDust = 0, armMax = 0;
  for (let i = 0; i < 400; i++) { const R = 3 + 17 * (i / 400), ph = i * 0.7; const v = at(R * Math.cos(ph), R * Math.sin(ph), 1); maxDust = Math.max(maxDust, v.dust); armMax = Math.max(armMax, v.armShape); }
  check(maxDust > 0.3 && maxDust <= 0.75, `its dust lanes and rings darken it visibly, never to black (${maxDust.toFixed(2)})`);
  check(armMax > 0.5, 'the arms modulate it');
  const d15 = at(15.1, 0, 1).dust, d15m = at(15.1, 0, 0.6).dust;
  check(d15 > d15m, 'the dust is stronger in Film than under Measured');
  check(S.SPARKLE <= 0.25, `close up the points carry only ${S.SPARKLE} of the light`);
  check(/min\( a, uAlphaCap \)/.test(S.SHADERS.light) && !/colorspace_fragment/.test(S.SHADERS_LAYER.layer + S.SHADERS_LAYER.bulge), 'each point is capped; the layer in display values');
  const hero = S.createHero(THREE, { profile: M31, record: m31 });
  hero.setLevel(2, 1);
  const cam = new THREE.PerspectiveCamera(50, 1.6, 1, 1e9);
  const n = new THREE.Vector3().setFromMatrixColumn(hero.group.children[0].matrix, 2).normalize();
  cam.position.copy(n.multiplyScalar(300)); cam.updateMatrixWorld();
  hero.frame({ camera: cam });
  const lightMat = hero.group.children[0].children.find((o) => o.name.endsWith(':light+')).material;
  check(lightMat.uniforms.uMaxPx.value <= 2.6 * 1.0001, `face on and close, a point is at most 2.6 px (${lightMat.uniforms.uMaxPx.value})`);
  hero.dispose();
}

// --------------------------------------------------------------------------------- 6. landmarks
{
  const m32 = rows.find((r) => r.id === 'm32');
  const p = S.inDisc(m31.pos, A.axes, m32.raDeg, m32.decDeg);
  check(Math.abs(Math.atan2(p[1], p[0]) - A.params.ringSplitPhi) < 1e-9, 'the ring splits on the side toward M32 (Gordon et al. 2006)');
  const B = prep(M33, recordOf('m33'), 3000);
  const ngc604 = B.params.landmarks.find((l) => l.name === 'NGC 604');
  const R = ngc604 ? Math.hypot(...ngc604.xy) : 0;
  check(R > 2 && R < 6, `NGC 604 lies in M33's disc where its line of sight meets it (${R.toFixed(2)} kpc out)`);
  const m33tilt = Math.acos(Math.abs(dot(B.axes.normal, unit([recordOf('m33').pos.x, recordOf('m33').pos.y, recordOf('m33').pos.z])))) / D2R;
  check(Math.abs(m33tilt - 56) < 1e-6, `M33 is more face on: 56 degrees (${m33tilt.toFixed(2)})`);
  // M32 and M110 stay drawn by scene/dsoglow.js at their catalogue places, beside her
  const { SHAPED } = await import(join(JS, 'scene/dsoglow.js'));
  check(SHAPED['dso-m32'] && SHAPED['dso-m32'].of === 'dso-m31' && SHAPED['dso-m110'] && SHAPED['dso-m110'].of === 'dso-m31', 'M32 and M110 are drawn as her companions');
  check([M31, M33].every((h) => h.review.by === 'Space Radar maintainers' && !!h.review.date), 'both are signed by "Space Radar maintainers" with a date, not a person or an independent review (internal #785 open)');
  check(M31.children.includes('dso-m32') && M31.children.includes('dso-m110'), 'and her profile names them as her children');
  const sep = (o) => Math.acos(Math.sin(o.decDeg * D2R) * Math.sin(m31.row.decDeg * D2R) + Math.cos(o.decDeg * D2R) * Math.cos(m31.row.decDeg * D2R) * Math.cos((o.raDeg - m31.row.raDeg) * D2R)) / D2R * 60;
  check(Math.abs(sep(m32) - 24.4) < 1.5 && Math.abs(sep(rows.find((r) => r.id === 'm110')) - 36.6) < 1.5, `at their measured separations on the sky: M32 ${sep(m32).toFixed(1)} arcmin, M110 ${sep(rows.find((r) => r.id === 'm110')).toFixed(1)} arcmin`);
}

if (problems.length) { console.error('hero spiral FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('hero spiral ok: M31 at 77 degrees NW near with trailing arms, a disc that foreshortens as the camera circles, its own size and points by tier, five morphologies, the photograph and the model summing to one, the dust between the halves, the ring split toward M32, NGC 604 in M33');
