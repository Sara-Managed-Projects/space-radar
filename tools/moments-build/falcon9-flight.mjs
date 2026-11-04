// tools/moments-build/falcon9-flight.mjs -- a Falcon 9 launch and landing replayed on its own event clock (release 1.7.7, internal #1058 and #867).
//
// THE REUSABLE PART. A flight is a record (see falcon9-og2-2.mjs: the pad, the landing place, the epoch, the published event times, what the sources say of
// the ascent's end); `buildFalcon9Moment(flight, outDir)` turns it into site/data/moments/<id>.json and the paths beside it, and a second flight is a second
// record and its words (site/js/copy/en.moments.<id>.js, the keys below), nothing else. What the builder does:
//   * the ASCENT is a profile (the engine's own: heights and downranges at the event times, a monotone cubic between, laid along the azimuth over the round
//     Earth) whose last point is chosen so that main engine cut-off has the published height and speed;
//   * from MECO the first stage is FLOWN as a point mass in the inertial frame (central gravity, an exponential atmosphere and a ballistic coefficient for
//     the drag): a coast, the boostback burn (3 engines, pushed toward where the landing place will be), a coast with grid fins, the entry burn at its
//     published times, the fall through the air, and a landing burn that is a polynomial guidance to rest on the landing place at the published second;
//     the boostback's size is found by search so that the stage arrives over the landing place at the landing burn's start;
//   * the second stage is pushed on from separation along the path it was on, turned toward the horizon: drawn until it is out of the picture, not to orbit;
//   * every vehicle, part event, camera, caption and chapter of the Moment, with the engines the events index;
//   * the file says what is published (the event times, MECO's height and speed, the pad, the landing place) and what is ours (every number between), and
//     `floodlit: true` because it flew in the dark.
// Run by hand: `node tools/moments-build/falcon9-og2-2.mjs`; the output is committed, CI does not run it.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { quatAxis } from '../../site/js/moments/pose.js';
import { siderealAt, OMEGA, placeFrame, fixedToInertial } from '../../site/js/moments/trajectory.js';
const { add, sub, scale, dot, cross, len, norm, MU, DEG } = L;
const MODELS = new URL('../../site/models/', import.meta.url).pathname;
const g0 = 9.80665;
const r4 = (x) => Math.round(x * 10000) / 10000;
const v4 = (v) => v.map(r4);

export function buildFalcon9Moment(f, OUT) {
  const epochMs = Date.parse(f.epoch);
  const place = { name: f.pad.name, lat: f.pad.lat, lon: f.pad.lon, alt: 0, azimuth: f.pad.azimuth, ground: { kind: 'coast', shoreBearing: f.pad.shoreBearing, shoreM: f.pad.shoreM, pad: true } };
  const frame = L.placeFrame(place);
  const E = f.events;
  const TL = E.touch;                                                                  // touchdown
  const landPlace = { name: f.landing.name, lat: f.landing.lat, lon: f.landing.lon, alt: f.landing.altM, azimuth: f.landing.azimuth, ground: { kind: 'coast', shoreBearing: f.landing.shoreBearing, shoreM: f.landing.shoreM, pad: 'landing' } };
  const lframe = L.placeFrame(landPlace);

  // ---- the ascent: a profile, its last point (MECO) tuned to the published height and speed
  const baseAsc = [[-10, 0, 0], [0.5, 0, 0], [E.towerClear, 0.12, 0], [30, 3.2, 0.3], [E.mach1, 9.2, 3.2], [E.maxq, 12, 5.2], [100, 30, 15], [120, 49, 26]];
  const ascent = (X120, X143, H120) => {
    const pts = baseAsc.slice(0, -1).concat([[120, H120, X120], [E.meco, f.meco.altKm, X143]]);
    return { pts, tr: L.profileTrack({ points: pts, azimuth: f.pad.azimuth }, place) };
  };
  let best = null;
  for (let X143 = 30; X143 <= 60; X143 += 1) for (let X120 = 18; X120 <= 30; X120 += 1) for (let H120 = 42; H120 <= 55; H120 += 1) {
    const { tr } = ascent(X120, X143, H120);
    const s = tr.stateAt(E.meco), sp = len(s.v), ang = Math.atan2(s.v[2], Math.hypot(s.v[0], s.v[1])) / DEG;
    const c = Math.abs(sp - f.meco.speedKmS * 1000) / 15 + Math.abs(ang - f.meco.pathDeg) / 1.2 + Math.abs(tr.stateAt(E.meco - 4).v[2] - s.v[2]) / 12;
    if (!best || c < best.c) best = { c, X143, X120, H120, sp, ang };
  }
  const asc = ascent(best.X120, best.X143, best.H120);
  const ASCENT = asc.pts.map((p) => [p[0], p[1], r4(p[2])]);
  console.log('ascent: MECO at', E.meco, 's,', f.meco.altKm, 'km, speed', best.sp.toFixed(0), 'm/s (published', f.meco.speedKmS * 1000, '), path angle', best.ang.toFixed(1), 'degrees, downrange', best.X143, 'km');

  // ---- the state at MECO / separation, inertial
  const sMeco = L.profileInertial(epochMs, asc.tr, frame, E.sep);
  const inertialTarget = (t) => { const g = siderealAt(epochMs, t); const r = fixedToInertial(lframe.ecef, g); return { r, v: [-OMEGA * r[1], OMEGA * r[0], 0] }; };
  const rel = (r, v) => [v[0] + OMEGA * r[1], v[1] - OMEGA * r[0], v[2]];
  const frameAt = (r) => { const up = norm(r); const east = norm(cross([0, 0, 1], up)); const north = cross(up, east); return { up, east, north }; };
  const rho = (h) => (h > 90e3 ? 0 : 1.225 * Math.exp(-h / 7200));
  const BETA = f.ballistic;
  const accelOf = (r, v, thrust) => {
    const rn = len(r), vr = rel(r, v), h = rn - RLOC;
    const drag = scale(vr, -0.5 * rho(h) * len(vr) / BETA);
    return add(add(scale(r, -MU / rn ** 3), drag), thrust);
  };
  const step = (st, dt, thrustAt) => {                                      // RK4 on (r, v) with a thrust acceleration given as a function of the state
    const f1 = (r, v) => ({ dr: v, dv: accelOf(r, v, thrustAt(r, v)) });
    const a = f1(st.r, st.v);
    const b = f1(add(st.r, scale(a.dr, dt / 2)), add(st.v, scale(a.dv, dt / 2)));
    const c = f1(add(st.r, scale(b.dr, dt / 2)), add(st.v, scale(b.dv, dt / 2)));
    const d = f1(add(st.r, scale(c.dr, dt)), add(st.v, scale(c.dv, dt)));
    return { r: add(st.r, scale(add(add(a.dr, scale(b.dr, 2)), add(scale(c.dr, 2), d.dr)), dt / 6)), v: add(st.v, scale(add(add(a.dv, scale(b.dv, 2)), add(scale(c.dv, 2), d.dv)), dt / 6)) };
  };
  const DT = 0.05;
  const RLOC = len(frame.ecef);                                              // the geocentric radius of the pad: heights are above it (the app's Earth is an ellipsoid; the point masses fly over the pad's own sphere)

  // ---- the first stage's flight after separation: a function of the boostback's strength `kb`, returning the history
  function fly(kb, detail = false) {
    let st = { r: sMeco.r, v: sMeco.v }, t = E.sep;
    const hist = [{ t, r: st.r, v: st.v, thr: 0 }];
    const push = (thr) => hist.push({ t, r: st.r, v: st.v, thr });
    let bbEnd = null, vdes = null;
    const bb0 = E.boostback;
    let log = { maxLandingAccel: 0, boostbackS: 0, entryMin: 1e9 };
    while (t < E.landingBurn[0] - 1e-9) {
      let thrust = () => [0, 0, 0], thr = 0;
      if (t >= bb0 - 1e-9 && bbEnd === null) {
        const tg = inertialTarget(t), fr = frameAt(st.r);                          // where the landing place is NOW, in the frame turning with the Earth
        const dP = sub(tg.r, st.r), dh = [dot(dP, fr.east), dot(dP, fr.north)];
        const tgo = Math.max(30, TL - t - f.boostbackLead);
        vdes = [dh[0] / tgo * kb, dh[1] / tgo * kb];
        const vr = rel(st.r, st.v), vh = [dot(vr, fr.east), dot(vr, fr.north)];
        const dv = [vdes[0] - vh[0], vdes[1] - vh[1]], m = Math.hypot(dv[0], dv[1]);
        if (m < 12) { bbEnd = t; log.boostbackS = t - bb0; }
        else { const dir = add(scale(fr.east, dv[0] / m), scale(fr.north, dv[1] / m)); thrust = () => scale(dir, f.boostbackAccel); thr = 3; }
      } else if (t >= E.entry[0] && t < E.entry[1]) {
        thrust = (r, v) => scale(norm(rel(r, v)), -f.entryAccel); thr = 3;
      }
      st = step(st, DT, thrust); t += DT;
      if (detail && Math.abs(t * 20 - Math.round(t * 20)) < 1e-6 && Math.round(t * 20) % 20 === 0) push(thr);
    }
    return { st, t, hist, bbEnd, log, vdes };
  }
  const targetUp = (t, h) => { const tg = inertialTarget(t); return { r: add(tg.r, scale(norm(tg.r), h)), v: tg.v }; };
  const missAt = (kb) => { const o = fly(kb); const w = targetUp(o.t, f.landingBurnH); const fr = frameAt(o.st.r); const d = sub(o.st.r, w.r); return { miss: Math.hypot(dot(d, fr.east), dot(d, fr.north)), up: dot(d, fr.up), o }; };
  let lo = 0.3, hi = 2.2, bestK = null;
  for (let k = lo; k <= hi; k += 0.05) { const m = missAt(k); if (!bestK || m.miss < bestK.miss) bestK = { k, miss: m.miss }; }
  for (let it = 0; it < 4; it += 1) { const k0 = bestK.k; for (let d = -0.05; d <= 0.05; d += 0.0125) { const m = missAt(k0 + d); if (m.miss < bestK.miss) bestK = { k: k0 + d, miss: m.miss }; } }
  const run = fly(bestK.k, true);
  const wL = targetUp(run.t, 0);
  console.log('boostback strength', bestK.k.toFixed(3), 'lasted', run.log.boostbackS.toFixed(1), 's; the stage is', (bestK.miss / 1000).toFixed(2), 'km off the landing place at the landing burn start,', ((len(sub(run.st.r, wL.r))) / 1000).toFixed(2), 'km from the touchdown point');

  // ---- the landing burn: a thrust acceleration that is linear in time, a(tau) = c0 + c1 tau, found by Newton iteration on the flown arc so that the stage is at rest on the landing place at TL
  const tb = run.t, Tb = TL - tb;
  const tgF = inertialTarget(TL);
  const fly2 = (c0, c1, store) => {
    let st = { r: run.st.r, v: run.st.v }, t = tb;
    while (t < TL - 1e-9) {
      const tau = t - tb, a = add(c0, scale(c1, tau));
      if (store) { store.maxA = Math.max(store.maxA, len(a)); }
      st = step(st, DT, () => a); t += DT;
      if (store && Math.round(t * 20) % 10 === 0) store.hist.push({ t, r: st.r, v: st.v, thr: 1 });
    }
    return st;
  };
  let c0 = [0, 0, 0], c1 = [0, 0, 0];
  for (let it = 0; it < 8; it += 1) {
    const e = fly2(c0, c1);
    const dv = sub(tgF.v, e.v), dr = sub(tgF.r, e.r);
    // [T, T^2/2; T^2/2, T^3/6] [d0; d1] = [dv; dr], solved per component
    const det = Tb * Tb ** 3 / 6 - (Tb * Tb / 2) ** 2;
    const d0 = [0, 1, 2].map((k) => (dv[k] * Tb ** 3 / 6 - dr[k] * Tb * Tb / 2) / det), d1 = [0, 1, 2].map((k) => (dr[k] * Tb - dv[k] * Tb * Tb / 2) / det);
    c0 = add(c0, d0); c1 = add(c1, d1);
    if (it === 7) console.log('landing burn guidance converged to', len(dr).toFixed(2), 'm and', len(dv).toFixed(2), 'm/s');
  }
  const store = { maxA: 0, hist: run.hist.slice() };
  const stEnd = fly2(c0, c1, store);
  let st = stEnd, t = TL, maxA = store.maxA;
  const hist = store.hist;
  hist.push({ t: TL, r: st.r, v: st.v, thr: 0 });
  const endMiss = len(sub(st.r, tgF.r));
  const vEnd = len(rel(st.r, st.v));
  console.log('landing burn: the thrust acceleration is at most', (maxA / g0).toFixed(2), 'g; the stage ends', endMiss.toFixed(2), 'm from the point and', vEnd.toFixed(2), 'm/s');
  const hl = run.hist[run.hist.length - 1], vl = rel(hl.r, hl.v), sl = len(vl);
  console.log('at the landing burn start: height', ((len(hl.r) - RLOC) / 1000).toFixed(2), 'km, speed', sl.toFixed(0), 'm/s; apogee', (Math.max(...run.hist.map((x) => len(x.r))) - RLOC).toFixed(0).slice(0, 3), 'm scale');
  let apogee = 0, tApo = 0; for (const x of hist) { const h = len(x.r) - RLOC; if (h > apogee) { apogee = h; tApo = x.t; } }
  const hAt = (tt) => { const x = hist.reduce((b, y) => (Math.abs(y.t - tt) < Math.abs(b.t - tt) ? y : b)); return ((len(x.r) - RLOC) / 1000); };
  const spdAt = (tt) => { const x = hist.reduce((b, y) => (Math.abs(y.t - tt) < Math.abs(b.t - tt) ? y : b)); return len(rel(x.r, x.v)).toFixed(0) + ' m/s at ' + ((len(x.r) - RLOC) / 1000).toFixed(1) + ' km'; };
  console.log('after the entry burn (T+' + E.entry[1] + '):', spdAt(E.entry[1]), '; at T+' + (E.landingBurn[0] - 25) + ':', spdAt(E.landingBurn[0] - 25), '; at the landing burn start:', spdAt(E.landingBurn[0]));
  console.log('apogee', (apogee / 1000).toFixed(0), 'km at', tApo.toFixed(0), 's; height at boostback start', hAt(E.boostback).toFixed(0), 'km, at the entry burn start', hAt(E.entry[0]).toFixed(0), 'km, at its end', hAt(E.entry[1]).toFixed(0), 'km; speed there', len(rel(...(() => { const x = hist.reduce((b, y) => (Math.abs(y.t - E.entry[0]) < Math.abs(b.t - E.entry[0]) ? y : b)); return [x.r, x.v]; })())).toFixed(0), 'm/s');

  // ---- the paths
  const rowsAfter = [];
  const rowOf = (x) => [Math.round(x.t * 100) / 100, ...x.r.map((q) => Math.round(q) / 1000), ...x.v.map((q) => Math.round(q * 1000) / 1e6)];
  for (const x of hist) rowsAfter.push(rowOf(x));
  // the rows are every 1 s in the coast and every 0.5 s in the landing burn; first row is the separation second
  const dedup = []; for (const r of rowsAfter) if (!dedup.length || r[0] > dedup[dedup.length - 1][0] + 1e-6) dedup.push(r);
  L.save(OUT + `paths/${f.id}-booster.json`, dedup, `${f.name}: the first stage from separation to the touchdown on ${f.landing.name}: flown as a point mass by tools/moments-build/falcon9-flight.mjs (the published event times, the published height and speed at MECO and the published landing place; every number between is ours). Earth-inertial (TEME) km and km/s.`);
  // the second stage: pushed on from separation, nose along the path turned toward the horizon, to the end of the picture
  const T2 = E.stage2End;
  // the second stage's origin is 41.65 m up the stack from the booster's, along the stack's axis (the nose is along the velocity relative to the ground)
  const AXIS = norm(rel(sMeco.r, sMeco.v));
  let s2 = { r: add(sMeco.r, scale(AXIS, 41.65)), v: sMeco.v }, t2 = E.sep; const rows2 = [rowOf({ t: t2, r: s2.r, v: s2.v })];
  const a2 = (tt) => 9.5 + (tt - E.sep) * 0.09;
  while (t2 < T2 - 1e-9) {
    const k = Math.min(1, Math.max(0, (t2 - E.s2ignite) / 110));
    const thrust = (r, v) => { const vr = rel(r, v), fr = frameAt(r); const vh = norm(add(scale(fr.east, dot(vr, fr.east)), scale(fr.north, dot(vr, fr.north)))); const dir = norm(add(scale(norm(vr), 1 - k), scale(vh, k))); return t2 >= E.s2ignite ? scale(dir, a2(t2)) : [0, 0, 0]; };
    s2 = step(s2, DT, thrust); t2 += DT;
    if (Math.abs(t2 - Math.round(t2)) < 1e-6) rows2.push(rowOf({ t: t2, r: s2.r, v: s2.v }));
  }
  L.save(OUT + `paths/${f.id}-stage2.json`, rows2, `${f.name}: the second stage from separation, pushed on along the path it was on and turned toward the horizon, to the end of the picture (not to orbit); tools/moments-build/falcon9-flight.mjs. Earth-inertial (TEME) km and km/s.`);
  console.log('second stage at the end of the picture: height', ((len(s2.r) - RLOC) / 1000).toFixed(0), 'km, speed', len(rel(s2.r, s2.v)).toFixed(0), 'm/s');

  // ---- the models
  const bS = L.glbBox(MODELS + 'falcon9-stage1.glb'), bU = L.glbBox(MODELS + 'falcon9-upper.glb');
  const H1 = bS.max[1] - bS.min[1], H2 = bU.max[1] - bU.min[1];
  if (Math.abs(bS.min[1]) > 0.01) throw new Error('the booster file no longer stands on y = 0');
  const AT2 = [0, 41.65, 0];                                                 // the second stage's origin on the booster's axis: its thrust skirt meets the top of the interstage
  const ENG = [[0, 0, 0]]; for (let k = 0; k < 8; k += 1) { const a = (45 * k + 22.5) * DEG; ENG.push([1.05 * Math.cos(a), 0, 1.05 * Math.sin(a)]); }
  const LEGS = 'abcd';
  const legPose = (k) => { const a = (45 + 90 * k) * DEG, rh = [Math.cos(a), 0, Math.sin(a)], w = norm(cross([0, 1, 0], rh)); return { about: v4([(1.83 + 0.12) * rh[0], 2.2, (1.83 + 0.12) * rh[2]]), w }; };
  const finPose = (k) => { const a = 90 * k * DEG, rh = [Math.cos(a), 0, Math.sin(a)], th = [-Math.sin(a), 0, Math.cos(a)]; const c = [rh[0] * 2.03, 44.0, rh[2] * 2.03]; return { about: v4([c[0] - th[0] * 0.75, 44.0, c[2] - th[2] * 0.75]) }; };
  const parts = [];
  const ev = (t, part, action, vehicle, extra = {}) => ({ t, part, action, vehicle, ...extra });
  // the stack on the pad and up: the upper stage rides the booster, the legs and fins stowed (the part file's own pose)
  parts.push(ev(-6.0, 'booster', 'ignite', 'booster-up', { rampS: 3 }));
  parts.push(ev(0, 'booster', 'throttle', 'booster-up', { level: 1 }));
  parts.push(ev(E.maxq - 6, 'booster', 'throttle', 'booster-up', { level: 0.72 }), ev(E.maxq + 10, 'booster', 'throttle', 'booster-up', { level: 1 }));
  parts.push(ev(E.meco - 8, 'booster', 'throttle', 'booster-up', { level: 0.62 }));
  parts.push(ev(E.meco, 'booster', 'cutoff', 'booster-up'));
  parts.push(ev(E.s2ignite, 'stage2', 'ignite', 'stage2'));
  parts.push(ev(E.fairing, 'fairing-a', 'separate', 'stage2', { dv: [3, 0.6, 0], spin: [0, 0, -0.25] }), ev(E.fairing, 'fairing-b', 'separate', 'stage2', { dv: [-3, 0.6, 0], spin: [0, 0, 0.25] }));
  // the booster on its way down: three engines (the centre and two of the ring) for the boostback and the entry burn, the centre one for the landing
  const bb1 = run.bbEnd;
  parts.push(ev(E.boostback - 1.5, 'booster', 'ignite', 'booster', { rampS: 1.2, engines: [0, 1, 5] }), ev(bb1, 'booster', 'cutoff', 'booster', { engines: [0, 1, 5] }));
  parts.push(ev(E.entry[0], 'booster', 'ignite', 'booster', { rampS: 1.0, engines: [0, 1, 5] }), ev(E.entry[1], 'booster', 'cutoff', 'booster', { engines: [0, 1, 5] }));
  parts.push(ev(E.landingBurn[0], 'booster', 'ignite', 'booster', { rampS: 1.0, engines: [0] }), ev(TL - 0.6, 'booster', 'cutoff', 'booster', { engines: [0] }));
  // grid fins out after the boostback, legs down in the landing burn: a pose, as the arrays of the Hubble unroll
  for (let k = 0; k < 4; k += 1) {
    const about = finPose(k).about;
    parts.push(ev(E.finsOut - 1, `fin-${LEGS[k]}`, 'pose', 'booster', { about, quat: [0, 0, 0, 1], pos: [0, 0, 0] }));
    parts.push(ev(E.finsOut + 2.5, `fin-${LEGS[k]}`, 'pose', 'booster', { about, quat: quatAxis([0, 1, 0], 90).map(r4), pos: [0, 0, 0], ease: 'smooth' }));
    const lp = legPose(k);
    parts.push(ev(E.legsDown, `leg-${LEGS[k]}`, 'pose', 'booster', { about: lp.about, quat: [0, 0, 0, 1], pos: [0, 0, 0] }));
    parts.push(ev(E.legsDown + 4.5, `leg-${LEGS[k]}`, 'pose', 'booster', { about: lp.about, quat: quatAxis(lp.w, 110).map(r4), pos: [0, 0, 0], ease: 'smooth' }));
  }
  // cold gas thrusters flip the stage after separation: puffs on the booster's top
  parts.sort((a, b) => a.t - b.t);
  // the pitch of the booster after separation: it flips tail-first (nose against the path) over 40 s and keeps that to the landing; the up stack is the ascent's
  const flip0 = E.sep + 3, flip1 = E.sep + 40;
  const pace = f.pace.map(([from, to, rate]) => ({ from, to, rate }));
  let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
  pace.forEach((q, i) => { if (i && q.from !== pace[i - 1].to) console.log('PACE GAP', pace[i - 1].to, q.from); });
  console.log('play time s', play.toFixed(0));
  const moment = {
    format: 1, id: f.id, words: f.id, wordsFile: `en.moments.${f.wordsFile}.js`,
    epoch: f.epoch, span: [-10, f.end], pace, place, floodlit: true,
    places: [{ from: E.placeAt, place: landPlace }],
    trajectories: {
      ascent: { kind: 'profile', truth: 'illustrative', say: 'pathAscent', pitchStart: 9, turnS: 120, azimuth: f.pad.azimuth, points: ASCENT, source: f.sources.ascent },
      booster: { kind: 'vectors', truth: 'illustrative', say: 'pathBooster', frame: 'earth-teme', file: `paths/${f.id}-booster.json`, source: f.sources.booster },
      stage2: { kind: 'vectors', truth: 'illustrative', say: 'pathStage2', frame: 'earth-teme', file: `paths/${f.id}-stage2.json`, source: f.sources.stage2 },
    },
    vehicles: [
      { id: 'booster-up', model: 'falcon9-stage1', lengthM: +H1.toFixed(4), keepXZ: true, path: 'ascent', attitude: 'ascent', window: [-10, E.sep], colour: 'rocket', parts: ['booster', 'leg-a', 'leg-b', 'leg-c', 'leg-d', 'fin-a', 'fin-b', 'fin-c', 'fin-d'],
        engines: { booster: ENG }, flames: { booster: { kind: 'kerolox', exitM: 0.92 } } },
      { id: 'stage2-up', model: 'falcon9-upper', lengthM: +H2.toFixed(4), keepXZ: true, rideOn: { vehicle: 'booster-up', at: AT2 }, window: [-10, E.sep], colour: 'rocket', parts: ['stage2', 'fairing-a', 'fairing-b'], marker: false },
      { id: 'booster', model: 'falcon9-stage1', lengthM: +H1.toFixed(4), keepXZ: true, path: 'booster', attitude: 'prograde', window: [E.sep, f.end], colour: 'rocket', parts: ['booster', 'leg-a', 'leg-b', 'leg-c', 'leg-d', 'fin-a', 'fin-b', 'fin-c', 'fin-d'],
        // the flip: nose along the path, then turned over 180 degrees to nose against it (retrograde, the same pose); in the last seconds, standing still, upright
        phases: [{ t: E.sep, pitchDeg: 0 }, { t: flip0, pitchDeg: 0 }, { t: flip1, pitchDeg: 180 }, { t: flip1, attitude: 'retrograde', pitchDeg: 0 }, { t: TL - 7, attitude: 'vertical', pitchDeg: 0 }],
        engines: { booster: ENG }, flames: { booster: { kind: 'kerolox', exitM: 0.92 } } },
      { id: 'stage2', model: 'falcon9-upper', lengthM: +H2.toFixed(4), keepXZ: true, path: 'stage2', attitude: 'prograde', window: [E.sep, E.stage2End], colour: 'rocket', parts: ['stage2', 'fairing-a', 'fairing-b'],
        engines: { stage2: [[0, 0.05, 0]] }, flames: { stage2: { kind: 'kerolox', exitM: 2.5 } } },
    ],
    tracks: { parts, camera: f.camera(E, TL), captions: f.captions(E, TL, run), audio: [], effects: [{ t: -5.5, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 600, fire: 'booster', vehicle: 'booster-up' }] },
    chapters: f.chapters(E, TL),
    sources: f.sourceList,
    audio_note: f.audioNote,
  };
  // the up stack's `ascent` phases: nothing; the return stage's phases above flip it; the legs and fins' poses start at their stowed pose in the part files
  writeFileSync(OUT + `${f.id}.json`, JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
  console.log(`${f.id}.json written; boostback`, E.boostback, '-', bb1.toFixed(1), 's, landing', TL);
  return { moment, run };
}
