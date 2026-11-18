// scene/deep/v838.js -- V838 Monocerotis' light echo: the flash of the star's outburst in early 2002, running outward through the
// dust round it, drawn as the surface the light-echo papers describe cutting a modelled dust, at the app clock's date (the
// deep-space review of 2026-11-16, idea 12; internal #428). Fetched by scene/deep/deepsky.js when the star is near
// (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_v838.mjs: echoTime, litWeight, paraboloidZ, depthOf, dustOf, lookFor, UNDER_MEASURED, COPY_BLOCK, DRAWN.
//
// THE PHYSICS (exact). Light from the outburst reaches a bit of dust at distance r from the star, is scattered, and reaches us
// a time (r - z)/c after the light that came straight, where z is the bit's distance toward us along the line of sight. So at a
// time t after the outburst reached us the lit dust is the dust with r - z = c t: x^2 + z^2 = (c t + z)^2, i.e. the paraboloid
// z = x^2 / (2 c t) - c t / 2, x the distance from the star in the plane of the sky (Sparks et al. 2008, AJ 135, 605, section 1).
// Its rim in the sky plane (z = 0) is at x = c t and grows by c in a unit of time on the star; seen from here a ring on dust at
// a distance r grows by (r c - c^2 t) / sqrt(2 r c t - c^2 t^2) per unit time, which is more than c: the apparent faster-than-
// light growth is the surface moving, not matter (Bond et al. 2003, Nature 422, 405).
// THE TIME. t is the app clock's date less the outburst's intensity-weighted mean date, HJD 2 452 343 (2002 March 9), as Sparks et
// al. take it. The outburst lasted: they model its light between HJD 2 452 307 and 2 452 404 (97 days), so a bit of dust lit at
// outburst-time s (days from the mean date; -36 to +61) is seen when t = s + (r - z)/c.
// WHAT IS MODELLED. The dust. The papers say it is clumpy and give no depth for any of it. Seven spherical shells round a cavity
// of 0.15 pc (Bond et al.'s "simplest geometry", Sparks et al.'s cavity) out to 1.95 pc (the dust Bond et al. saw lies within
// 2 pc), each a seeded scatter of clumps. WHAT IS ILLUSTRATIVE. Brightness and colour (blue for the early light, red for the late).
// HELD. The modelled dust ends at 2 pc, whose widest lit ring is passed 6.4 years after the outburst: later dates draw the echo as
// of mid-2008 (the card says so). Before the outburst there is no echo, only the star.
//
// HOW IT IS DRAWN. One call (scene/deep/softpoints.js): soft additive points; each point's brightness is rewritten when the date
// moves by a quarter of a day. The sky frame (x west, y north, z toward the Sun) is placed at the record; lengths are light-years
// and c is one light-year a year.
import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { placeSky } from './skyplace.js';
import { pointsMesh, packPoints, seeded, cameraIn } from './softpoints.js';
import '../../copy/en.deepdata.js'; // the card's words (deepV838), fetched with the hero

export const COPY_BLOCK = 'deepV838';
export const DRAWN = { 'dso-v838-monocerotis': ['reconstruction', 'model'] };
/** Under the Measured look the dust and its lit rings (modelled) go; the star, a measured place, stays. */
export const UNDER_MEASURED = { echo: 'hidden', star: 'same' };
const PC_LY = 3.261563777;
const DAY_MS = 86400e3;
const YEAR_DAYS = 365.25;
const JD_UNIX_EPOCH = 2440587.5; // the Julian date of 1970-01-01 00:00 UT
const part = (P, k) => ((P && P.layers) || []).find((l) => l && l.part === k) || {};
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

/** The unix time of the outburst's mean date (Sparks et al. 2008: HJD 2 452 343; the heliocentric correction, minutes, is dropped). Pure. */
export const outburstMs = (hjd = 2452343) => (hjd - JD_UNIX_EPOCH) * DAY_MS;

/** Years since the outburst's mean date at the app clock's time. Pure. */
export const echoTime = (tMs, hjd) => (tMs - outburstMs(hjd)) / (YEAR_DAYS * DAY_MS);

/** The paraboloid's z (toward us) at a distance x from the star on the sky, for a time t after the outburst, c = 1; x, z in ly, t in years. Pure. */
export const paraboloidZ = (x, t) => (x * x) / (2 * t) - t / 2;

/** The delay of a bit of dust at (x, y, z) from the star, light-years (= years, c = 1): r - z. Pure. */
export const depthOf = (x, y, z) => Math.hypot(x, y, z) - z;

/**
 * How brightly the outburst shone at outburst-time s, days from the mean date: a window from `from` to `to` (-36 to +61) with
 * edges of `edge` days (illustrative; the real light curve had two peaks, on 2002 February 6.4 and March 10.0). Pure.
 */
export function windowOf(s, { from = -36, to = 61, edge = 6 } = {}) {
  return smooth((s - from) / edge) * smooth((to - s) / edge);
}

/** The share of a bit of dust lit now: the outburst seen through delay `d` ly at echo time `t` years. Pure. */
export function litWeight(d, t, w) {
  return windowOf((t - d) * YEAR_DAYS, w);
}

/**
 * The dust as points about the star, light-years: `points` spread over the shells in proportion to their area, each a clump-
 * weighted scatter (a few seeded directions on the sphere that gather the points), a little thick. Returns { pos[3n], delay[n],
 * early[n] (0..1: how early in the outburst the light that reaches it is, for the colour: filled at frame time), r[n], n }. Pure.
 */
export function dustOf(profile) {
  const dp = part(profile, 'dust');
  const rnd = seeded(num(dp.seed, 838));
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const shells = (Array.isArray(dp.shells_pc) && dp.shells_pc.length ? dp.shells_pc : [0.2, 0.5, 1, 1.95]).map(Number);
  const cavity = num(dp.cavity_pc, 0.15), thick = num(dp.thickness_pc, 0.02), outer = num(dp.outer_pc, 2);
  const nClump = Math.max(1, Math.round(num(dp.clumps, 7))), total = Math.max(100, Math.round(num(dp.points, 16000)));
  const area = shells.reduce((a, r) => a + r * r, 0);
  const pos = [], r = [];
  shells.forEach((R0) => {
    const dirs = [];
    for (let k = 0; k < nClump; k++) {
      const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), s = Math.sqrt(1 - z * z);
      dirs.push({ d: [s * Math.cos(ph), s * Math.sin(ph), z], kappa: 2 + 10 * rnd() });
    }
    const n = Math.round((total * R0 * R0) / area);
    let made = 0, tries = 0;
    while (made < n && tries < n * 40) {
      tries += 1;
      const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), s = Math.sqrt(1 - z * z);
      const u = [s * Math.cos(ph), s * Math.sin(ph), z];
      // the clumps gather points: acceptance is a floor plus von Mises lobes about the directions
      let a = 0.12;
      for (const c of dirs) a += Math.exp(c.kappa * (u[0] * c.d[0] + u[1] * c.d[1] + u[2] * c.d[2] - 1));
      if (rnd() * 1.6 > a) continue;
      const rr = clamp(R0 + gauss() * thick, cavity, outer) * PC_LY; // never inside the cavity or past the dust Bond et al. saw
      pos.push(u[0] * rr, u[1] * rr, u[2] * rr); r.push(rr);
      made += 1;
    }
  });
  const n = r.length;
  const delay = new Float32Array(n);
  for (let i = 0; i < n; i++) delay[i] = depthOf(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  return { pos: new Float32Array(pos), delay, r: new Float32Array(r), n, outerLy: Math.max(...shells) * PC_LY };
}

/** The date the lit surface stops crossing new modelled dust, in years after the outburst: the outer shell's radius over c. Pure. */
export const holdYears = (profile) => {
  const dp = part(profile, 'dust'), e = part(profile, 'echo');
  const shells = Array.isArray(dp.shells_pc) && dp.shells_pc.length ? dp.shells_pc.map(Number) : [1.95];
  return num(e.hold_years, Math.max(...shells) * PC_LY);
};

/** The look's switches: the dust is modelled, so the Measured look takes it off. Pure. */
export function lookFor(chosen) {
  const look = chosen || 'film';
  return { echo: drawnUnder(look, UNDER_MEASURED.echo) ? 1 : 0, star: drawnUnder(look, UNDER_MEASURED.star) ? 1 : 0 };
}

/** The date shown for the clock's: none before the outburst's start, held at `hold` years after it. { t, held, before } Pure. */
export function shownTime(tYears, w, hold) {
  const before = tYears * YEAR_DAYS < (w && Number.isFinite(w.from) ? w.from : -36) - 0.0001;
  return { t: Math.min(tYears, hold), held: tYears > hold, before };
}

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const group = new THREE.Group();
  group.name = 'deep-hero-v838';
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  const ep = part(profile, 'echo'), sp = part(profile, 'star'), lk = part(profile, 'look'), dp = part(profile, 'dust');
  const win = { from: num(ep.from_days, -36), to: num(ep.to_days, 61), edge: num(ep.edge_days, 6) };
  const hold = holdYears(profile);
  const q0 = typeof env.quality === 'function' ? env.quality() || {} : {};
  const detail = q0.tier >= 1 && !q0.latched ? 1 : 0.5;
  const dust = dustOf({ layers: [{ ...dp, points: Math.round(num(dp.points, 16000) * (0.5 + 0.5 * detail)) }] });
  const early = (Array.isArray(lk.colour_early) ? lk.colour_early : [0.62, 0.74, 1]).map(Number);
  const late = (Array.isArray(lk.colour_late) ? lk.colour_late : [1, 0.62, 0.45]).map(Number);
  const sizeLy = num(dp.size_ly, 0.12);
  const list = [];
  for (let i = 0; i < dust.n; i++) list.push({ p: [dust.pos[i * 3], dust.pos[i * 3 + 1], dust.pos[i * 3 + 2]], v: [0, 0, 1], size: sizeLy, beta: 0, amp: 0, col: early, kind: 'dust' });
  const set = packPoints(list);
  const echo = pointsMesh(THREE, set, { name: 'v838-echo', minPx: num(lk.min_px, 1.6) });
  echo.material.uniforms.uIndex.value = 1;
  sky.add(echo.mesh);
  const starSet = packPoints([{ p: [0, 0, 0], v: [0, 0, 1], size: num(sp.size_ly, 0.4), beta: 0, amp: num(sp.amp, 3), col: [1, 0.95, 0.85] }]);
  const star = pointsMesh(THREE, starSet, { name: 'v838-star', minPx: 2.4 });
  star.material.uniforms.uIndex.value = 1;
  sky.add(star.mesh);
  const look4 = echo.geometry.getAttribute('iLook'), col3 = echo.geometry.getAttribute('iCol');
  const fall = num(dp.fall_pc, 0.6) * PC_LY;
  const amp0 = num(ep.amp, 1);
  let level = 0, levelShare = 0, shownT = NaN, lastInfo = { held: false, before: false, lit: 0, t: 0 };
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3();
  const viewH = () => ((typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800) * Math.min(2, (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1);

  /** Rewrite every point's brightness and colour for the echo time `t` (years): a quarter of a day is the least change worth an upload. */
  function relight(t, before) {
    let lit = 0;
    for (let i = 0; i < dust.n; i++) {
      const s = (t - dust.delay[i]) * YEAR_DAYS; // outburst-time, days from the mean date, of the light seen at this point now
      const w = before ? 0 : windowOf(s, win);
      const a = w > 0 ? amp0 * w * (1 / (1 + (dust.r[i] / fall) ** 2)) : 0;
      look4.array[i * 4 + 2] = a;
      if (w > 0) {
        lit += 1;
        const k = clamp((s - win.from) / (win.to - win.from), 0, 1); // 0: the first light (blue); 1: the last (red)
        col3.array[i * 3] = early[0] + (late[0] - early[0]) * k;
        col3.array[i * 3 + 1] = early[1] + (late[1] - early[1]) * k;
        col3.array[i * 3 + 2] = early[2] + (late[2] - early[2]) * k;
      }
    }
    look4.needsUpdate = true; col3.needsUpdate = true;
    return lit;
  }
  return {
    group,
    levels: [2, 3],
    latchSafe: true, // two instanced draws of about sixteen thousand points
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSky(THREE, sky, env.record, stage); }
      const l = lookFor(info.look);
      const gain = clamp(Number.isFinite(info.gain) ? info.gain : 1, 0.6, 1.6) * num(lk.gain, 1);
      const vh = viewH();
      const shown = shownTime(echoTime(stage.tMs, ep.t0_hjd), win, hold);
      if (!Number.isFinite(shownT) || Math.abs(shown.t - shownT) * YEAR_DAYS >= 0.25 || shown.before !== lastInfo.before) {
        shownT = shown.t;
        lastInfo = { held: shown.held, before: shown.before, lit: relight(shown.t, shown.before), t: shown.t };
      } else { lastInfo.held = shown.held; }
      for (const [p, on] of [[echo, l.echo], [star, l.star]]) {
        p.material.uniforms.uShare.value = levelShare * on;
        p.material.uniforms.uGain.value = gain;
        p.material.uniforms.uViewH.value = vh;
        p.mesh.visible = levelShare * on > 0.002;
      }
      if (info.camera) {
        cameraIn(group, sky, info.camera, _cam, _inv, _id);
        echo.material.uniforms.uCam.value.copy(_cam);
        star.material.uniforms.uCam.value.copy(_cam);
      }
    },
    ready: () => true,
    stats: () => ({ level, share: Math.round(levelShare * 100) / 100, meshes: 2, textures: 0, points: dust.n + 1, lit: lastInfo.lit, years: Math.round(lastInfo.t * 1000) / 1000, held: lastInfo.held, before: lastInfo.before, bytes: echo.bytes + star.bytes }),
    dispose() {
      echo.geometry.dispose(); echo.material.dispose(); star.geometry.dispose(); star.material.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
