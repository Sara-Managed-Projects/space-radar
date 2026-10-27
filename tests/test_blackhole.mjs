// tests/test_blackhole.mjs -- release 1.4.0 (r14-mw-bh): a black hole in 3D, from its mass.
//
//  1. SIZES. The shadow drawn for Sagittarius A* and M87* is the one the Event Horizon Telescope measured, to within
//     its own error: from the registry's mass and distance, never a number typed for the look.
//  2. THE LIGHT. trace() (the shader's own steps): a ray inside sqrt(27) M of the hole is lost, one outside escapes;
//     the approaching side of the disc is shifted blue and the receding red; seen nearly edge-on, a ray that passes
//     ABOVE the hole meets the disc behind it (the far side lensed over the top) where a straight line would miss.
//  3. M87* FROM EARTH. Its ring is brightest in the south, as in the 2019 picture (the flow turning clockwise).
//  4. THE ROSTER. Every black hole in registry/exotics.yaml has a model (the quasars stay the far layer's); M87* its jet, Cygnus X-1 its
//     supergiant on an orbit of Kepler's size; a hole far off is drawn larger, a near one at its true size.
//  5. THE CONTRACT. No render target, no photograph in the scene; the cards keep the two photographs.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const B = await import(join(JS, 'scene/blackhole.js'));
const { exoticRecords } = await import(join(JS, 'data/layers.js'));
const { isBlackHole, createPortraits, PORTRAIT_SHARE } = await import(join(JS, 'scene/portraits.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const LY = 9460730472580.8;
const records = exoticRecords();
const rec = (id) => records.find((r) => r.id === `exotic-${id}`);
const UAS = 180 / Math.PI * 3600e6;

// ------------------------------------------------------------------ 1. sizes
{
  for (const [id, eht, err] of [['sgr-a-star', 51.8, 2.3], ['m87-star', 42, 3]]) {
    const r = rec(id);
    const p = B.profileFor(r);
    const uas = (2 * B.SHADOW_M * p.mKm) / (r.meta.distLy * LY) * UAS;
    check(Math.abs(uas - eht) <= err + 0.06 * eht, `${id}: the shadow drawn is ${uas.toFixed(1)} µas across from Earth; the EHT measured ${eht} ± ${err}`);
    check(p.cls.size === 'measured' && p.cls.mass === 'measured' && p.cls.disc === 'modelled', `${id}: size and mass measured, the disc modelled`);
  }
  check(Math.abs(B.massKm(1) - 1.4766) < 1e-3, 'GM/c² of the Sun is 1.4766 km');
}

// ------------------------------------------------------------------ 2. the light
{
  const far = 1e5;
  const ray = (b) => B.trace([b, 0, far], [0, 0, -1], { quiet: true });
  check(ray(5.0).hit === 'hole' && ray(5.15).hit === 'hole', 'a ray inside sqrt(27) M is lost');
  check(ray(5.3).hit === 'sky' && ray(9).hit === 'sky', 'a ray outside escapes');
  // edge-on (the camera in the disc's plane, on +x), the disc turning anticlockwise from +z: +y side recedes... or approaches
  const dd = [-1, 0, -3e-5].map((v, k, a) => v / Math.hypot(...a));
  const side = (y) => B.trace([far, y, 3], dd, { rOut: 22, turn: 1 }); // grazing the plane, meeting it beside the hole
  const a = side(12), b = side(-12);
  check(a.hit === 'disc' && b.hit === 'disc' && Math.abs(Math.log(a.g / b.g)) > 0.4, `one side of the disc is shifted blue, the other red (g ${a.g && a.g.toFixed(2)}, ${b.g && b.g.toFixed(2)})`);
  check((a.g > 1) !== (b.g > 1), 'one above 1, one below');
  check(B.redshift(10, 0) < 1 && Math.abs(B.redshift(10, 0) - Math.sqrt(0.7)) < 1e-12, 'a patch moving across the line of sight is still redshifted by gravity and time dilation');
  // nearly edge-on (5 degrees above the plane): a ray passing 8 M above the hole
  const i = 85 * Math.PI / 180;
  const dir = [-Math.sin(i), 0, -Math.cos(i)];
  const up = [-Math.cos(i), 0, Math.sin(i)];
  const q = [far * Math.sin(i) + 8 * up[0], 0, far * Math.cos(i) + 8 * up[2]];
  const straight = (() => { const t = -q[2] / dir[2]; const x = q[0] + t * dir[0], y = q[1] + t * dir[1]; return Math.hypot(x, y); })();
  const over = B.trace(q, dir, { rOut: 22, turn: 1 });
  check(straight > 22 && over.hit === 'disc' && over.r < 22, `the far side is lensed over the top: a straight line meets the plane ${straight.toFixed(0)} M out, the bent ray the disc at ${over.r && over.r.toFixed(1)} M`);
  check(B.discFlux(6) === 0 && Math.abs(B.discFlux((49 / 36) * 6) - 1) < 1e-12 && B.discFlux(20) < 0.3, 'the disc starts at the innermost stable orbit and peaks just outside it');
}

// ------------------------------------------------------------------ 3. M87* from Earth
{
  const r = rec('m87-star');
  const p = B.profileFor(r);
  const ra = 187.70593 * Math.PI / 180, dec = 12.39112 * Math.PI / 180, e = 23.4392911 * Math.PI / 180;
  const toEcl = (v) => [v[0], v[1] * Math.cos(e) + v[2] * Math.sin(e), -v[1] * Math.sin(e) + v[2] * Math.cos(e)];
  const S = B.spinAxis(187.70593, 12.39112, p.incl, p.pa);
  const there = toEcl([Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]);
  const U = there.map((v) => -v);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };
  const X = norm(U.map((v, k) => v - dot(U, S) * S[k]));
  const Y = cross(S, X);
  const local = (v) => [dot(v, X), dot(v, Y), dot(v, S)];
  const north = toEcl([-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)]);
  const east = toEcl([-Math.sin(ra), Math.cos(ra), 0]);
  check(Math.abs(Math.acos(dot(S, U)) * 180 / Math.PI - 17) < 0.01, 'the spin axis is 17 degrees from our line');
  const sky = S.map((v, k) => v - dot(S, U) * U[k]);
  const pa = (Math.atan2(dot(sky, east), dot(sky, north)) * 180 / Math.PI + 360) % 360;
  check(Math.abs(pa - 288) < 0.01, `and points to position angle 288 on the sky (${pa.toFixed(2)})`);
  let best = { I: -1, pa: 0 };
  const d = local(U.map((v) => -v));
  for (let deg = 0; deg < 360; deg += 10) {
    const t = deg * Math.PI / 180;
    let I = 0;
    for (const rho of [6.5, 8, 10]) {
      const off = north.map((v, k) => rho * (Math.cos(t) * v + Math.sin(t) * east[k]));
      const ql = local(off.map((v, k) => v + 1e5 * U[k]));
      const h = B.trace(ql, d, { rOut: p.rOut, turn: p.turn });
      if (h.hit === 'disc') I += B.discFlux(h.r) * h.g ** 4;
    }
    if (I > best.I) best = { I, pa: deg };
  }
  const off = Math.abs(((best.pa - 180 + 540) % 360) - 180);
  check(off <= 60, `M87*'s ring is brightest at position angle ${best.pa}, in the south as in the EHT's picture`);
}

// ------------------------------------------------------------------ 4. the roster
{
  const holes = records.filter(isBlackHole);
  check(holes.length === records.filter((r) => r.meta.kind === 'blackhole').length && holes.length >= 9 && !holes.some((r) => r.meta.kind === 'quasar'), `${holes.length} black holes are drawn in 3D; the quasars keep the far layer's point and host`);
  for (const r of holes) {
    const p = B.profileFor(r);
    check(p.msun > 0 && p.mKm > 0 && (p.quiet || p.rOut > B.ISCO_M), `${r.id}: a mass (${p.msun}) and a disc or a quiet hole`);
    if (r.meta.massMsun > 0) check(p.msun === r.meta.massMsun, `${r.id}: the registry's mass`);
  }
  check(B.profileFor(rec('m87-star')).jet && B.profileFor(rec('m87-star')).jet.lengthLy > 10000, 'M87*\'s jet, kiloparsecs long');
  const cyg = B.profileFor(rec('cygnus-x-1'));
  check(cyg.companion && cyg.companion.rsun > 20 && cyg.companion.msun > 20, 'Cygnus X-1 with its supergiant');
  check(B.profileFor(rec('gaia-bh1')).quiet === true, 'Gaia BH1 is quiet: no disc');

  // built and placed without a GPU, on the stellar stage
  stage.setWorld('stellar');
  const portraits = createPortraits(new THREE.Scene(), { tier: 1 });
  check(portraits.show(rec('cygnus-x-1')) === true && portraits.shown() === 'exotic-cygnus-x-1', 'a black hole\'s card draws it');
  check(portraits.show({ id: 'x', klass: 'exotic', meta: { kind: 'pulsar' } }) === false, 'a pulsar draws no black hole');
  portraits.show(rec('cygnus-x-1'));
  const cam = new THREE.PerspectiveCamera(45, 1.6, 1e-5, 1e9);
  const at = stage.toScene(rec('cygnus-x-1').pos, 'sun-inertial');
  cam.position.copy(at).add(new THREE.Vector3(0, 0, 1000)); // 1 000 ly off
  cam.lookAt(at); cam.updateMatrixWorld(true);
  for (let i = 0; i < 60; i++) portraits.update(cam, Date.UTC(2026, 9, 27), 16);
  const st = portraits.state();
  check(st.opacity === 1 && st.drawn && st.drawn.magnification > 1e6, `from 1 000 ly the system is drawn far larger (${st.drawn && st.drawn.magnification})`);
  const sep = st.drawn.sepM * st.drawn.mKm / 149597870.7;
  check(sep > 0.18 && sep < 0.26, `Cygnus X-1's orbit is ${sep.toFixed(3)} au across, from Kepler's law (P = 5.6 d)`);
  cam.position.copy(at).add(new THREE.Vector3(0, 0, 3e-6)); // 28 million km
  cam.updateMatrixWorld(true);
  portraits.update(cam, Date.UTC(2026, 9, 27), 16);
  check(portraits.magnification() === 1, `from close it is drawn at its true size (${portraits.magnification()})`);
  portraits.dispose();
  stage.setWorld('earth');
  check(PORTRAIT_SHARE > 0.2 && PORTRAIT_SHARE <= 0.5, 'a share of the view, never all of it');
}

// ------------------------------------------------------------------ 5. the contract
{
  for (const f of ['site/js/scene/blackhole.js', 'site/js/scene/portraits.js']) {
    const src = read(f);
    check(!/RenderTarget|EffectComposer|setRenderTarget|ImageLoader|TextureLoader|eht-/.test(src), `${f}: no render target and no photograph`);
  }
  const ex = read('registry/exotics.yaml');
  check(/file: site\/images\/eht-sgr-a\.jpg/.test(ex) && /file: site\/images\/eht-m87\.jpg/.test(ex), 'the two cards keep the EHT\'s photographs');
}

if (problems.length) { console.error(`black hole: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log('black hole ok: the EHT\'s shadows from the registry\'s masses, light bent and beamed, the far side over the top, M87* bright in the south, every hole in 3D, no photograph in the scene');
