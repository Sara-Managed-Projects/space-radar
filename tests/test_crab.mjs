// tests/test_crab.mjs -- the Crab Nebula's own model (the 2026-11-16 deep-space review, fault 2): a cage of filaments
// on the measured outline round a glow, the pulsar's wind as Ng & Romani's two fitted rings with their Doppler-bright
// near side, the growth on the clock from 1054. What is held here: every number is the registry's and the registry's
// is the paper's; the cage is a honeycomb of the measured scale between the measured void and the measured reach; the
// glow's closed form is the integral it stands for, from outside and from inside; the rings are the fit; nothing is a
// filled egg; three additive draws, no pass; shipped, labelled a model, out of the boot graph.
//
//   node tests/test_crab.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const C = await import(join(JS, 'scene/deep/crab.js'));
const R = await import(join(JS, 'scene/deep/remnant.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const P = (await import(join(JS, 'data/hero-crab.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D2R = Math.PI / 180, PC = 3.261563777;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const part = (k) => R.part(P, k);

// --- 1. the profile: shipped, a model, every part with its source ---------------------------------------------------
{
  const def = HEROES.find((h) => h.id === 'crab');
  check(P.shipped === true && def && def.stub.shipped === true, 'the Crab ships, and its line\'s stub says so');
  check(def && /crab\.js/.test(String(def.build)) && /hero-crab\.js/.test(String(def.build)) && !/hero-/.test(String(def.profile)), 'drawn by scene/deep/crab.js, its profile read with the module');
  check(JSON.stringify(P.drawn) === '["model"]' && JSON.stringify(def.stub.drawn) === '["model"]', 'drawn as a model (each filament\'s place is not measured)');
  for (const k of ['envelope', 'filaments', 'synchrotron', 'wind', 'expansion', 'light', 'shell']) check(part(k).source && part(k).source.length > 30, `its ${k} has a source`);
  check(/Martin, Milisavljevic & Drissen 2021, MNRAS 502, 1864/.test(part('envelope').source) && /2101\.02709/.test(part('envelope').source), 'the outline is Martin, Milisavljevic & Drissen 2021\'s');
  check(/Ng, C\.-Y\. & Romani, R\. W\. 2004, ApJ 601, 479/.test(part('wind').source) && /0710\.4168/.test(part('wind').source), 'the wind is Ng & Romani\'s fit, both papers named');
  check(/ILLUSTRATIVE/.test(P.colours.note) && /false-colour/.test(P.colours.note) && /X-ray/.test(P.colours.note), 'the colours are declared illustrative: the mosaic\'s false colour and X-rays drawn violet-blue');
  check(P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || '') && /Modelled: each filament's place/.test(P.review.data_vs_model), 'signed under the lead\'s policy; the review says what is modelled; no astronomer\'s review claimed');
  check(P.credits.length >= 2 && /CC BY 4\.0/.test(P.credits.join(' ')), 'its credit lines, the photograph\'s licence quoted');
}

// --- 2. the outline: the paper's numbers --------------------------------------------------------------------------
const E = C.envelopeOf(P);
{
  const pa = Math.atan2(-E.axis[0], E.axis[1]) / D2R, incl = Math.acos(E.axis[2]) / D2R;
  check(near((pa + 360) % 360, 126.3, 0.05) && near(incl, 63.0, 0.05), `the long axis is the pulsar's: PA ${pa.toFixed(2)}, ${incl.toFixed(2)} degrees from our line (Ng & Romani: 126.3, 63.0)`);
  check(E.axis[2] > 0, 'its south-east end is the one toward us (the fit\'s own Doppler factor needs that; below)');
  check(near(E.voidLy, 0.5 * PC, 1e-6), 'the empty middle is half a parsec (Martin et al. 2021)');
  // the waist: in the torus's plane the outline is pinched; along the axis it is the ellipsoid's
  const inPlane = R.shellOf(P).axes[1];
  const plain = C.radiusAt({ ...E, pinchDepth: 0, lobeGain: 0 }, inPlane);
  check(C.radiusAt({ ...E, lobeGain: 0 }, inPlane) < plain * 0.9 && near(C.radiusAt({ ...E, lobeGain: 0 }, E.axis), E.semi[0], 1e-6), 'a pinched valley runs round the plane of the pulsar\'s torus; the reach along the axis is untouched');
  // the lobes: the north-west one along the axis, the south-east one 120 degrees from it seen from the north
  const top = (v) => Math.atan2(v[0], v[2]) / D2R;
  const nw = E.axis.map((v) => -v);
  let apart = Math.abs(top(nw) - top(E.lobe)); if (apart > 180) apart = 360 - apart;
  check(near(apart, 120, 0.5), `seen from the north the two fast lobes are ${apart.toFixed(1)} degrees apart (the paper: 120)`);
  check(E.lobe[0] < 0 && E.lobe[1] < 0, 'the south-east lobe is south-east on the sky (east is -x, south is -y)');
  check(near(Math.acos(dot(E.lobe, E.axis)) / D2R, 52, 9), 'and it is not along the axis (the paper: "the SE lobe is not")');
  const ell = C.radiusAt({ ...E, pinchDepth: 0, lobeGain: 0 }, E.lobe);
  check(near(C.radiusAt({ ...E, pinchDepth: 0 }, E.lobe) / ell, 1.3, 1e-6), 'the south-east lobe stands 1.3 times out of the fitted ellipsoid (the paper\'s dilatation)');
}

// --- 3. the honeycomb: the measured scale ---------------------------------------------------------------------------
{
  const h1 = C.honeycomb(1, 7, 0.4), h2 = C.honeycomb(2, 7, 0.4);
  check(h1.cells === 42 && h1.edges.length === 120 && h1.nodes.length === 80, `the coarse net: 42 cells, 120 walls (${h1.cells}, ${h1.edges.length})`);
  check(h2.cells === 162 && h2.edges.length === 480 && h2.nodes.length === 320, `the fine net: 162 cells, 480 walls (${h2.cells}, ${h2.edges.length})`);
  check(near(h2.cellRad, Math.PI / 10, Math.PI / 10 * 0.05), `the fine net's cells are pi/10 across (${(h2.cellRad / D2R).toFixed(1)} degrees; the paper's scale in the fast lobes)`);
  check(h1.cellRad > Math.PI / 10 * 1.8 && h1.cellRad < Math.PI / 3.5, `the coarse net's are larger, up to the paper's pi/3.5 (${(h1.cellRad / D2R).toFixed(1)} degrees)`);
  const deg = new Array(h2.nodes.length).fill(0);
  for (const [i, j] of h2.edges) { deg[i] += 1; deg[j] += 1; }
  check(deg.every((d) => d === 3), 'three walls meet at every corner: a honeycomb');
  check(h2.nodes.every((n) => near(Math.hypot(...n), 1, 1e-9)), 'its corners are on the unit sphere');
  const again = C.honeycomb(2, 7, 0.4), other = C.honeycomb(2, 8, 0.4);
  check(JSON.stringify(again.nodes[5]) === JSON.stringify(h2.nodes[5]) && JSON.stringify(other.nodes[5]) !== JSON.stringify(h2.nodes[5]), 'the same seed gives the same cage on every visit');
}

// --- 4. the cage: between the void and the reach, coarse and thick deep in, fine and thin outside -------------------
const F = C.filamentsOf(P);
{
  let rmin = Infinity, rmax = 0;
  const rOf = (arr, i) => Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
  const byNet = [[], [], []], wByNet = [[], [], []];
  for (let i = 0; i < F.count; i++) {
    const ra = rOf(F.a, i), rb = rOf(F.b, i);
    rmin = Math.min(rmin, ra, rb); rmax = Math.max(rmax, ra, rb);
    byNet[F.net[i]].push((ra + rb) / 2); wByNet[F.net[i]].push(F.width[i]);
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  check(rmin >= 0.5 * PC, `no filament within half a parsec of the centre (${(rmin / PC).toFixed(2)} pc)`);
  check(rmax <= 2.05 * PC && rmax > 1.8 * PC, `none beyond 2 parsecs (${(rmax / PC).toFixed(2)} pc), and the long axis is reached`);
  check(F.nets.length === 2 && F.nets[0].cells === 42 && F.nets[1].cells === 162, 'two nets: 42 cells deep in, 162 on the outline');
  check(mean(byNet[0]) < mean(byNet[1]) * 0.8 && mean(wByNet[0]) > mean(wByNet[1]) * 1.8, `the larger cells are at the smaller radii and have the thicker walls (${(mean(byNet[0]) / PC).toFixed(2)} pc, ${mean(wByNet[0]).toFixed(2)} ly wide, against ${(mean(byNet[1]) / PC).toFixed(2)} pc, ${mean(wByNet[1]).toFixed(2)} ly)`);
  // the deep cells' size in parsecs: the paper's 0.5 to 1 pc
  const deepCell = F.nets[0].cellRad * mean(byNet[0]) / PC;
  check(deepCell > 0.5 && deepCell < 1.0, `the deep cells are ${deepCell.toFixed(2)} pc across (the paper: 0.5 to 1 pc)`);
  check(byNet[2].length > 200, `spikes and struts tie the two nets (${byNet[2].length} pieces): a foam, not two skins`);
  check(F.count > 3500 && F.count < 9000, `${F.count} pieces: a cage, and one draw call can hold it`);
  // NOT A FILLED EGG: from our side the pieces cover a small share of the outline's area
  const arc = (ly) => ly / 6500 / D2R * 60;
  let covered = 0;
  for (let i = 0; i < F.count; i++) covered += Math.hypot(F.b[i * 3] - F.a[i * 3], F.b[i * 3 + 1] - F.a[i * 3 + 1]) * F.width[i];
  const area = Math.PI * E.semi[0] * Math.sin(63 * D2R) * E.semi[1];
  check(covered / area < 0.75, `the filaments' own area is ${(100 * covered / area).toFixed(0)} % of the outline's, counting every overlap: a cage`);
  // the outline on the sky, along the projected axis and across it
  const pa = 126.3 * D2R, ux = [-Math.sin(pa), Math.cos(pa)], uy = [Math.cos(pa), Math.sin(pa)];
  let a0 = 0, a1 = 0, b0 = 0, b1 = 0;
  for (let i = 0; i < F.count; i++) {
    const u = F.a[i * 3] * ux[0] + F.a[i * 3 + 1] * ux[1], v = F.a[i * 3] * uy[0] + F.a[i * 3 + 1] * uy[1];
    a0 = Math.min(a0, u); a1 = Math.max(a1, u); b0 = Math.min(b0, v); b1 = Math.max(b1, v);
  }
  check(near(arc(a1 - a0), 6.5, 0.7) && near(arc(b1 - b0), 4.3, 0.7), `on the sky ${arc(a1 - a0).toFixed(1)}' by ${arc(b1 - b0).toFixed(1)}' (SIMBAD lists M 1 as 7' by 5', the mosaic shows 6' by 4')`);
  const half = C.filamentsOf(P, { detail: 0.5 });
  check(half.count < F.count * 0.9 && half.count > 1500, `a slow device gets a thinner chain (${half.count} pieces), the same cage`);
}

// --- 5. the wind: Ng & Romani's rings ---------------------------------------------------------------------------------
const W = C.windOf(P);
{
  const [inner, outer] = W.rings;
  check(near(inner.rLy, 15.6 / 3600 * D2R * 2000 * PC, 1e-6) && near(2 * inner.rLy, 0.99, 0.01), `the inner ring is 15.6 arcsec at 2 kpc: ${(2 * inner.rLy).toFixed(2)} ly across (Chandra's page: "about one light year across")`);
  check(near(outer.rLy, 41.33 / 3600 * D2R * 2000 * PC, 1e-6) && near(outer.rLy, 1.307, 0.002), `the outer ring's radius is 41.33 arcsec: ${outer.rLy.toFixed(3)} ly`);
  check(inner.beta === 0.49 && outer.beta === 0.55 && W.gamma === 1.5, 'the flow is 0.49 and 0.55 of light\'s speed, the photon index 1.5 (the fit\'s)');
  const paOf = (a) => ((Math.atan2(-a[0], a[1]) / D2R) + 360) % 360, inclOf = (a) => Math.acos(a[2]) / D2R;
  check(near(paOf(outer.axis), 126.31, 0.01) && near(inclOf(outer.axis), 63.03, 0.01) && near(paOf(inner.axis), 124.0, 0.01) && near(inclOf(inner.axis), 61.3, 0.01), 'each ring\'s axis is at its own fitted position angle and tilt');
  // the points: on the circle to the blur; the flow radial, in the ring's plane
  let sum2 = 0, n = 0, radial = true, nw = 0, se = 0, nwN = 0, seN = 0, jets = 0, onAxis = true;
  const eye = [0, 0, 1];   // from the Sun's side the eye is along +z
  for (let i = 0; i < W.count; i++) {
    const p = [W.pos[i * 3], W.pos[i * 3 + 1], W.pos[i * 3 + 2]], v = [W.vel[i * 3], W.vel[i * 3 + 1], W.vel[i * 3 + 2]];
    if (W.kind[i] === 0 && Math.abs(W.beta[i] - 0.55) < 1e-6) {
      const z = dot(p, outer.axis), rho = Math.hypot(p[0] - outer.axis[0] * z, p[1] - outer.axis[1] * z, p[2] - outer.axis[2] * z);
      sum2 += (rho - outer.rLy) ** 2 + z * z; n += 1;
      if (Math.abs(dot(v, outer.axis)) > 1e-9 || !near(Math.hypot(...v), 1, 1e-9)) radial = false;
      const b = C.boost(W.beta[i], dot(eye, v), W.gamma);
      // which half of the ring on the sky: the projected axis points south-east, so the north-west half is against it
      const along = p[0] * outer.axis[0] + p[1] * outer.axis[1];
      if (along < 0) { nw += b; nwN += 1; } else { se += b; seN += 1; }
    }
    if (W.kind[i] === 1) { jets += 1; const z = dot(p, outer.axis); if (Math.hypot(p[0] - outer.axis[0] * z, p[1] - outer.axis[1] * z, p[2] - outer.axis[2] * z) > 0.6) onAxis = false; }
  }
  check(n === 1800 && near(Math.sqrt(sum2 / n / 2), outer.blurLy, outer.blurLy * 0.1), `the outer ring's points lie round its circle with the fit's blur (${Math.sqrt(sum2 / n / 2).toFixed(3)} of ${outer.blurLy.toFixed(3)} ly)`);
  check(radial, 'the flow is radial, in the ring\'s plane');
  check(nw / nwN > 3 * (se / seN), `from the Sun's side the north-west half of the ring is the bright one, ${(nw / nwN / (se / seN)).toFixed(1)} times the south-east half (Chandra's picture; the fit's Doppler factor)`);
  check(near(C.boost(0.55, 1), 0.45 ** -2.5, 1e-9) && near(C.boost(0.55, -1), 1.55 ** -2.5, 1e-9) && C.boost(0, 0.3) === 1, 'the factor is (1 - n.beta)^-(1 + Gamma)');
  check(jets > 300 && onAxis, 'the jets run along the rings\' axis');
  const last = W.count - 1;
  check(W.kind[last] === 2 && W.pos[last * 3] === 0 && W.pos[last * 3 + 1] === 0 && W.pos[last * 3 + 2] === 0, 'the pulsar is at the centre');
  check(/NOT FITTED/.test(readFileSync(join(ROOT, 'registry/deepsky-heroes/crab.yaml'), 'utf8')), 'the registry says the jets\' length and speed are not fitted');
}

// --- 6. the clock ---------------------------------------------------------------------------------------------------------
{
  const s = (y) => C.expansionAt(P, y);
  check(s(1000) === 0 && s(1054) === 0 && s(1055) > 0, 'nothing before the supernova of 1054');
  check(near(s(2016.9), 1, 1e-12), 'its size is the spectra\'s, of November 2016');
  const rate = (s(2017.9) - s(2015.9)) / 2;
  check(near(rate, 1 / (2016.9 - 1130), 2e-6), `today it grows ${(rate * 1000).toFixed(3)} thousandths a year: the motions run back in straight lines meet in 1130`);
  check(near(rate, part('expansion').rate_per_year, 0.05 * part('expansion').rate_per_year), 'within 5 % of the measured 1.160 thousandths a year (Nugent 1998)');
  let mono = true; for (let y = 1054; y < 4000; y += 7) if (s(y + 7) < s(y)) mono = false;
  check(mono && s(1500) > 0.4 && s(1500) < 0.5, `it only grows; in 1500 it was ${(100 * s(1500)).toFixed(0)} % of today's size`);
  check(near(C.yearOf(0), 1970, 1e-9) && near(C.yearOf(Date.UTC(2016, 10, 24)), 2016.9, 0.01), 'the app clock as a year');
}

// --- 7. the glow: the closed form is the integral, from outside and from inside ------------------------------------
{
  const G = C.glowOf(P);
  const eps = (p) => { const q = [p[0] - G.centre[0], p[1] - G.centre[1], p[2] - G.centre[2]]; const o = G.axes.map((a, i) => dot(q, a) / G.sigma[i]); return Math.exp(-dot(o, o)); };
  const numeric = (ro, rd) => { let s = 0; const N = 6000, T = 120, dt = T / N; for (let i = 0; i < N; i++) { const t = (i + 0.5) * dt; s += eps([ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t]); } return s * dt / G.ref; };
  let worst = 0, bad = 0;
  const views = [];
  for (let i = 0; i < 300; i++) {
    const a = i * 2.399963, z = 1 - 2 * (i + 0.5) / 300, r = Math.sqrt(1 - z * z);
    const dir = [r * Math.cos(a), r * Math.sin(a), z];
    const d = i % 3 === 0 ? 0 : i % 3 === 1 ? 2.5 : 40;   // from the middle, from inside the cage, from outside
    const ro = [G.centre[0] + dir[0] * d, G.centre[1] + dir[1] * d, G.centre[2] + dir[2] * d];
    const aim = [Math.cos(i * 1.7) * 0.6, Math.sin(i * 1.3) * 0.6, Math.sin(i) * 0.6];
    const to = [G.centre[0] + aim[0] - ro[0], G.centre[1] + aim[1] - ro[1], G.centre[2] + aim[2] - ro[2]];
    const l = Math.hypot(...to) || 1;
    views.push([ro, d === 0 ? dir : to.map((v) => v / l)]);
  }
  for (const [ro, rd] of views) {
    const got = C.glowColumn(G, ro, rd).column;
    if (!Number.isFinite(got) || got < 0) bad += 1;
    worst = Math.max(worst, Math.abs(got - numeric(ro, rd)));
  }
  check(bad === 0 && worst < 2e-3, `the closed form is the integral from 300 views outside, inside and at the middle (worst ${worst.toExponential(1)}; ${bad} not finite)`);
  const through = C.glowColumn(G, [G.centre[0], G.centre[1], 80], [0, 0, -1]).column, fromMiddle = C.glowColumn(G, G.centre, [0, 0, -1]).column;
  check(near(fromMiddle, through / 2, 1e-6), 'from the middle the glow is half of what it is seen through: a haze toward the centre, not a wash');
  check(C.glowColumn(G, [G.centre[0], G.centre[1], 80], [0, 0, 1]).column < 1e-9, 'looking away from it there is none');
  for (const x of [0, 0.3, 1, 2.5]) check(near(C.erfc(x), 1 - erf(x), 3e-7) && near(C.erfc(-x), 1 + erf(x), 3e-7), `erfc(${x})`);
  check(Math.max(...G.sigma) < E.semi[0] * 0.5, 'the glow is inside the cage (its dispersion under half the outline)');
}
function erf(x) { // a series good to 1e-12 for |x| <= 3
  let s = x, t = x; for (let n = 1; n < 80; n++) { t *= -x * x / n; s += t / (2 * n + 1); } return 2 / Math.sqrt(Math.PI) * s;
}

// --- 8. the hero: three additive draws, the looks, the clock -----------------------------------------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const hero = C.createHero(THREE, { profile: P, record: null, quality: () => ({ tier: 2 }) });
  const meshes = [];
  hero.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  check(meshes.length === 3, `three meshes, three draw calls: the cage, the glow, the wind (got ${meshes.length})`);
  check(meshes.every((m) => m.material.blending === THREE.AdditiveBlending && m.material.transparent === false && m.material.depthWrite === false && m.material.toneMapped === false), 'each additive (it adds light, never darkens), in the opaque list, no depth write, display values (gasmat.js COLOUR_POLICY)');
  check(meshes.every((m) => /-shells$/.test(m.name)), 'the contract\'s draw-order check knows its meshes by "-shells"');
  check(hero.latchSafe === true && hero.card.copy === 'r12Dust' && hero.card.drawn['dso-m1'][0] === 'model' && JSON.stringify(hero.levels) === '[2,3]', 'latch-safe; the card reads the r12Dust words with "model"');
  hero.setLevel(2, 1);
  stage.tMs = Date.UTC(2026, 10, 16);
  hero.frame({ rPx: 200, tier: 2, look: 'film', gain: 1 });
  const cage = hero.group.getObjectByName('deep-hero-crab-cage-shells').material.uniforms;
  const glow = hero.group.getObjectByName('deep-hero-crab-glow-shells').material.uniforms;
  const wind = hero.group.getObjectByName('deep-hero-crab-wind-shells').material.uniforms;
  check(cage.uShare.value === 1 && glow.uShare.value === 1 && wind.uShare.value === 1 && cage.uKnots.value === 1, 'Film: the cage with its knots, the glow, the wind');
  check(near(hero.stats().scale, C.expansionAt(P, C.yearOf(stage.tMs)), 1e-4) && hero.stats().scale > 1.01 && hero.stats().scale < 1.012, `on 16 November 2026 it is ${hero.stats().scale} of its 2016 size`);
  hero.frame({ rPx: 200, tier: 2, look: 'measured', gain: 1 });
  check(cage.uShare.value === 1 && cage.uKnots.value === 0 && glow.uShare.value === 1, 'Measured: the same model, the generated knots along the filaments gone');
  check(X.drawnUnder('measured', C.UNDER_MEASURED.cage) && !X.drawnUnder('measured', C.UNDER_MEASURED.knots) && C.UNDER_MEASURED.growth === 'same', 'its Measured rules: the knots go, the growth is the clock\'s');
  hero.frame({ rPx: 200, tier: 2, look: 'film', gain: 1, photo: 1 });
  check(cage.uShare.value === 0, 'where the card\'s slider shows the photograph the model gives way to it');
  stage.tMs = Date.UTC(1500, 0, 1);
  hero.frame({ rPx: 200, tier: 2, look: 'film', gain: 1 });
  check(hero.stats().scale > 0.4 && hero.stats().scale < 0.5 && cage.uShare.value === 1, `with the clock in 1500 it is drawn at ${hero.stats().scale} of its size`);
  stage.tMs = Date.UTC(1000, 0, 1);
  hero.frame({ rPx: 200, tier: 2, look: 'film', gain: 1 });
  check(cage.uShare.value === 0 && glow.uShare.value === 0 && wind.uShare.value === 0, 'with the clock before 1054 nothing is drawn: the star had not exploded');
  stage.tMs = Date.UTC(2026, 10, 16);
  check(hero.stats().meshes === 3 && hero.stats().filaments === C.filamentsOf(P).count && hero.stats().bytes < 3e6, `its geometry is ${hero.stats().bytes} B`);
  hero.dispose();
  const slow = C.createHero(THREE, { profile: P, record: null, quality: () => ({ tier: 0 }) });
  check(slow.stats().filaments < hero.stats().filaments, 'T0 draws the thinner chain');
  slow.dispose();
}

// --- 9. the shaders; no pass; out of the boot graph; the words -------------------------------------------------------
{
  for (const [name, src] of Object.entries(C.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget|lensflare/i.test(src), `${name}: no bloom, no pass, no render target`);
  check(/erfcx/.test(C.SHADERS.glowFrag) && /uKnots/.test(C.SHADERS.cageFrag) && /uIndex/.test(C.SHADERS.windVert), 'the glow\'s closed form, the knots\' switch and the Doppler factor are in the shaders');
  const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
  check(/'js\/scene\/deep\/crab\.js'/.test(diet) && /'js\/data\/hero-crab\.js'/.test(diet), 'the boot diet holds its module and its profile out of the first visit');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const rows = COPY.r12Dust.rows['dso-m1'], card = COPY.r12Dust.card.crab;
  const all = rows.map((r) => r.join(' ')).join(' ');
  check(/honeycomb|cage/.test(card) && /Martin/.test(card) && /Not yet reviewed by an astronomer/.test(card), `the card's line names the cage and its source: ${card}`);
  check(/[Mm]easured/.test(all) && /[Mm]odelled/.test(all) && /[Ii]llustrative|false colour/.test(all) && /Ng and Romani/.test(all) && /1054/.test(all), 'the card\'s rows say what is measured, what is modelled and what is illustrative, with the wind\'s source and the clock');
  for (const code of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
    const L = (await import(join(JS, `copy/${code}.js`))).COPY;
    const t = L.r12Dust && L.r12Dust.card && L.r12Dust.card.crab, r = L.r12Dust && L.r12Dust.rows && L.r12Dust.rows['dso-m1'];
    check(typeof t === 'string' && t.length > 40 && t !== card && Array.isArray(r) && r.length === rows.length && r.every((x, i) => x[1] !== rows[i][1]), `${code}: the Crab's card line and its ${rows.length} rows are translated`);
  }
}

if (problems.length) {
  console.error(`test_crab: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`test_crab: ok (a cage of ${F.count} filament pieces on Martin et al.'s outline, 42 cells deep and 162 outside; the glow in closed form; Ng & Romani's two rings, the north-west half bright from our side; growing from 1054 at the measured rate; three additive draws)`);
