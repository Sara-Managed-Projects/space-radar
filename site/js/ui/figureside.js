// ui/figureside.js -- a constellation seen from the side (the 2026-11-16 deep-space review, idea 6).
//
// Contract: createFigureSide(ctx) -> { open(value, opts?), close(opts?), isOpen(), openId(), fromLink(value),
//                                     state(), destroy() }
//           sideLink(ctx, value)  -> main.js's one call: makes it once (ctx.figureSide) and hands it the figure
// Pure, for tests/test_figureside.mjs: resolveFigure(value, rows, known), asterismFeature(row),
//   frameOf(placed), sideBasis(dir), rigAngles(offset, up), fovFor(radiusRad, aspect, baseDeg, fill),
//   sweepAt(elapsedMs, fromDeg, toDeg, totalMs), angleOf(cam, target, home), homeOffsetLy(distanceLy, nearLy),
//   MAX_DEG, SIDE_DEG, FLY_MS
//
// WHAT IT DOES. From the Sun a constellation is a figure; its stars are tens to thousands of light-years apart
// in depth. This puts the camera at the Sun's place looking at the figure (so the lines fall exactly on it as it
// is seen from home), and lets the visitor swing round it, to a quarter turn, on a circle about the figure's
// middle: the lines stay tied to the stars, and the figure comes apart. A slider is the swing (0 to 90 degrees);
// "Fly out" plays it from the Sun to SIDE_DEG in FLY_MS; "Back to the Sun" returns. Under reduced motion
// nothing flies: the button goes to the side at once and the slider still answers the hand.
//
// WHAT IS MEASURED. Each corner is a star of the 3D catalogue at its measured place (scene/figures3d.js, HYG:
// Hipparcos and Gaia parallaxes); the label beside it says how far it is. The lines are a tradition. The
// catalogue has no error for a distance, so the panel says in words that the farthest are the least certain.
//
// THE VIEW FROM HOME IS EXACT. The camera stands on the line from the figure's middle to the Sun, a little short
// of the Sun itself (homeOffsetLy: where the Sun's own mark would sit on the lens), and the lens
// is widened when the figure would not fit the screen (fovFor), never the camera moved back: a step back along
// that line bends a figure whose nearest star is a third as far as its farthest.
//
// NOTHING AT BOOT. main.js imports this file when a figure's story card or a search row asks (ui/skystory.js,
// ui/searchrows.js: the event `sr:figure-side`) or when the link carries `figure=`, and calls fromLink().

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.side.js';
import { icon } from './icons.js';
import { loadCss } from './latercss.js';
import { write as writeUrl } from './urlstate.js';
import { SIDE_FIGURES } from '../data/sideviews.js';
import { stage, SUN_INERTIAL } from '../scene/stage.js';
import { LY_KM } from '../scene/stars3d.js';
import { eqToEcl, dirOf } from '../sky/figures.js';

/** The slider's far end, and where "Fly out" stops: past 70 degrees every figure here is streaks. */
export const MAX_DEG = 90;
export const SIDE_DEG = 70;
/** The flight from the Sun to the side: "about twenty seconds" (the review's sentence). */
export const FLY_MS = 20000;
/**
 * How far short of the Sun the camera stands at 0 degrees, in light-years: a two-hundredth of the way to the
 * figure's middle, and never more than a hundredth of the way to its NEAREST corner (Orion's shield has a star 26
 * light-years away: from 3 light-years nearer it would sit two degrees off its place in our sky). Pure.
 */
export function homeOffsetLy(distanceLy, nearLy) {
  return Math.min(0.005 * distanceLy, 0.01 * (nearLy > 0 ? nearLy : distanceLy));
}
/** The layers whose marks would be litter across a figure (as registry/tours.yaml's constellations trip hides). */
export const HIDES = ['exoplanets', 'systems', 'exotics', 'deep-sky', 'galaxy'];
const STAGE = 'stellar';
const ARRIVE_MS = 1400;
const D2R = Math.PI / 180;

/**
 * Which figure a link's word, a card's key or a search row means. `rows` is SIDE_FIGURES, `known(id)` says whether
 * the line file draws an IAU code. Returns { id, figure, row } (`figure` is the id scene/figures3d.js draws) or null.
 */
export function resolveFigure(value, rows, known) {
  const want = String(value == null ? '' : value).trim();
  if (!want) return null;
  const low = want.toLowerCase();
  const row = (rows || []).find((r) => r.id === low) || (rows || []).find((r) => r.figure && r.figure.toLowerCase() === low);
  if (row) return { id: row.id, figure: row.figure || `side:${row.id}`, row };
  if (typeof known === 'function') {
    const code = known(want) ? want : known(want[0].toUpperCase() + want.slice(1).toLowerCase()) ? want[0].toUpperCase() + want.slice(1).toLowerCase() : null;
    if (code) return { id: code, figure: code, row: null };
  }
  return null;
}

/** An asterism's row as the feature scene/figures3d.js `define` takes, with its name; null for an IAU figure's row. */
export function asterismFeature(row, name) {
  if (!row || !Array.isArray(row.path)) return null;
  const id = `side:${row.id}`;
  return {
    feature: { type: 'Feature', id, geometry: { type: 'LineString', coordinates: row.path.map((p) => [p[0], p[1]]) } },
    name: { id, name: String(name || row.id), ra: row.path[0][0], dec: row.path[0][1] },
  };
}

/**
 * Where to look and from how far, from a placed figure (sky/figures.js placeFigure): the mean direction of its
 * corner stars, the middle of the figure at its median distance along that direction, how wide it is on the sky
 * (the largest angle from that direction to a corner) and its nearest and farthest corner. Light-years, the Sun
 * at the origin, ecliptic axes. Null when no corner is a measured star.
 */
export function frameOf(placed) {
  const stars = placed && Array.isArray(placed.stars) ? placed.stars.filter((s) => s && s.ly > 0) : [];
  if (!stars.length) return null;
  const sum = [0, 0, 0];
  for (const s of stars) for (let k = 0; k < 3; k++) sum[k] += s.posLy[k] / s.ly;
  const n = Math.hypot(sum[0], sum[1], sum[2]);
  if (!(n > 1e-9)) return null;
  const dir = sum.map((v) => v / n);
  let radius = 0; let near = Infinity; let far = 0;
  for (const s of stars) {
    const c = (s.posLy[0] * dir[0] + s.posLy[1] * dir[1] + s.posLy[2] * dir[2]) / s.ly;
    radius = Math.max(radius, Math.acos(Math.min(1, Math.max(-1, c))));
    near = Math.min(near, s.ly); far = Math.max(far, s.ly);
  }
  const d = placed.medianLy > 0 ? placed.medianLy : (near + far) / 2;
  return { dir, distanceLy: d, targetLy: dir.map((v) => v * d), radiusRad: radius, nearLy: near, farLy: far };
}

/**
 * The up of the view and the way the camera leaves, for a line of sight `dir` (a unit vector from the Sun to the
 * figure, ecliptic axes): `up` is celestial north laid on the plane of the sky, so north is up at the figure's
 * middle as on a chart and a turn about it is a turn SIDEWAYS on a great circle (a turn about the pole itself is
 * a small circle for a figure near the pole: Cassiopeia would hardly move). `side` completes the frame.
 */
export function sideBasis(dir) {
  const north = eqToEcl(dirOf(0, 90));
  const k = north[0] * dir[0] + north[1] * dir[1] + north[2] * dir[2];
  let up = [north[0] - k * dir[0], north[1] - k * dir[1], north[2] - k * dir[2]];
  let n = Math.hypot(up[0], up[1], up[2]);
  if (!(n > 1e-6)) { // a figure at the pole itself: any direction square to it
    up = Math.abs(dir[0]) < 0.9 ? [1 - dir[0] * dir[0], -dir[0] * dir[1], -dir[0] * dir[2]] : [-dir[1] * dir[0], 1 - dir[1] * dir[1], -dir[1] * dir[2]];
    n = Math.hypot(up[0], up[1], up[2]);
  }
  up = up.map((v) => v / n);
  const side = [up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]];
  return { up, side };
}

/**
 * The camera rig's own angles for a camera on the `offset` side of its target with `up` as the up (scene/camera.js
 * flyTo's `offset` branch: the offset turned by the rotation that carries `up` onto +Y). Scene axes, THREE vectors.
 */
export function rigAngles(offset, up) {
  const q = new THREE.Quaternion().setFromUnitVectors(up.clone().normalize(), new THREE.Vector3(0, 1, 0));
  const v = offset.clone().normalize().applyQuaternion(q);
  return { azimuth: Math.atan2(v.x, v.z), polar: Math.acos(Math.min(1, Math.max(-1, v.y))) };
}

/**
 * The lens for a figure `radiusRad` wide (centre to farthest corner) to take `fill` of the smaller half of a
 * screen of `aspect` (width over height): the app's own lens when it fits, a wider one when it does not, never
 * wider than 100 degrees. Vertical field of view, degrees.
 */
export function fovFor(radiusRad, aspect, baseDeg, fill = 0.8) {
  const a = aspect > 0 ? aspect : 1;
  const need = Math.tan(Math.min(1.3, radiusRad / fill)); // the half-extent the figure needs, as a tangent
  const half = Math.atan(need / Math.min(1, a));          // the vertical half-angle that gives it on the narrow side
  return Math.min(100, Math.max(baseDeg, (2 * half) / D2R));
}

/** The swing `elapsedMs` into a flight from `fromDeg` to `toDeg` lasting `totalMs`: eased at both ends. */
export function sweepAt(elapsedMs, fromDeg, toDeg, totalMs) {
  const k = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 1;
  const e = k * k * (3 - 2 * k);
  return fromDeg + (toDeg - fromDeg) * e;
}

/** The angle at `target` between the camera and `home`, degrees: how far round to the side the camera is. */
export function angleOf(cam, target, home) {
  const a = [cam[0] - target[0], cam[1] - target[1], cam[2] - target[2]];
  const b = [home[0] - target[0], home[1] - target[1], home[2] - target[2]];
  const na = Math.hypot(a[0], a[1], a[2]); const nb = Math.hypot(b[0], b[1], b[2]);
  if (!(na > 0) || !(nb > 0)) return 0;
  return Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb)))) / D2R;
}

/**
 * What main.js calls, and all it calls: the side view made once and kept on `ctx.figureSide`, then given the figure
 * asked for (fromLink: nothing closes it). Kept this short on main.js's side because its bytes are a first visit's.
 */
export function sideLink(ctx, value) {
  return (ctx.figureSide = ctx.figureSide || createFigureSide(ctx)).fromLink(value);
}

const el = (doc, tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

export function createFigureSide(ctx, opts = {}) {
  const win = opts.window || window;
  const doc = opts.document || document;
  const C = COPY.figureSide;
  const rig = ctx.cameraRig;
  const camera = ctx.camera;
  const reduced = () => !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tripOn = () => !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase && ctx.trip.state.phase !== 'idle');

  let open_ = null;      // { id, figure, row, name }
  let saved = null;      // what to put back: stage, the rig's pose, layers, whether the sky from the ground was up
  let frame = null;      // frameOf() and the scene's vectors
  let panel = null; let slider = null; let where = null; let playBtn = null; let backBtn = null; let lede = null; let rangeLine = null; let noteLine = null; let unplacedLine = null; let picker = null; let titleEl = null;
  let flying = null;     // { t0, from, to, ms }
  let raf = 0;
  let gen = 0;
  let stopInput = null;
  let lastWhere = '';

  const names = new Map(); // figure id -> its name, once the files have landed
  const nameOf = (r) => (r.row && r.row.name ? C.names[r.row.name] || r.row.id : names.get(r.figure) || r.id);

  function toScene(ly, out) {
    return stage.toSceneInto({ x: ly[0] * LY_KM, y: ly[1] * LY_KM, z: ly[2] * LY_KM }, SUN_INERTIAL, out, stage.tMs) ? out : null;
  }
  const _sun = new THREE.Vector3();

  function setLayer(id, on) {
    try {
      if (ctx.isLayerOn(id) === on) return false;
      ctx.setLayerOn(id, on);
      // As ui/trip.js does: the controls repaint a checkbox from this, and ignore an event with no `from` as their own echo.
      doc.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on, handled: true, from: 'figureside' } }));
      return true;
    } catch { return false; }
  }

  // ---- the camera ---------------------------------------------------------------------------------------
  /** Put the camera `deg` round to the side, on the circle about the figure's middle through the Sun's place. */
  function setAngle(deg) {
    if (!frame) return;
    const a = Math.min(MAX_DEG, Math.max(0, deg)) * D2R;
    rig.setAngles(frame.az0 + a, frame.polar0);
    frame.deg = deg;
  }

  function pose(ms) {
    camera.up.copy(frame.up);
    const fov = fovFor(frame.radiusRad, camera.aspect, saved.fov, doc.documentElement.classList.contains('sr-phone') ? 0.6 : 0.8);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    frame.deg = 0;
    rig.flyTo({
      targetScene: frame.target, distance: frame.distance, azimuth: frame.az0, polar: frame.polar0,
      ms: reduced() ? 0 : ms, ease: 'inout', targetDelay: 0,
    });
  }

  function tick() {
    raf = 0;
    if (!open_ || !frame) return;
    if (tripOn() || stage.worldId !== STAGE) { close({ restore: false }); return; }
    if (flying && !rig.state.flying) {
      const now = win.performance.now();
      const deg = sweepAt(now - flying.t0, flying.from, flying.to, flying.ms);
      setAngle(deg);
      if (now - flying.t0 >= flying.ms) stopFlying();
    }
    paint();
    raf = win.requestAnimationFrame(tick);
  }

  function stopFlying() {
    flying = null;
    paintButtons();
  }

  function paintButtons() {
    if (!playBtn) return;
    const still = reduced();
    const label = flying ? C.pause : still ? C.jump : C.play;
    if (playBtn.textContent !== label) playBtn.textContent = label;
    playBtn.title = still ? C.jump : C.playTitle;
    playBtn.setAttribute('aria-pressed', flying ? 'true' : 'false');
  }

  /** The line under the slider, from where the camera really is (the visitor may have dragged it anywhere). */
  function paint() {
    if (!where || !frame) return;
    _sun.set(0, 0, 0); toScene([0, 0, 0], _sun);
    const cam = camera.position;
    const deg = angleOf([cam.x, cam.y, cam.z], [frame.target.x, frame.target.y, frame.target.z], [frame.home.x, frame.home.y, frame.home.z]);
    const ly = cam.distanceTo(_sun) * stage.unitKm / LY_KM;
    const atHome = deg < 0.75;
    const text = atHome ? C.home : t(C.where, { deg: String(Math.round(deg)), ly: fmt.int(Math.round(ly / 10) * 10) });
    if (text !== lastWhere) {
      lastWhere = text;
      where.textContent = text;
      slider.setAttribute('aria-valuetext', text);
    }
    // The slider follows the camera while it is flown, and stays under the hand while it is held.
    if (flying && doc.activeElement !== slider) slider.value = String(Math.round(Math.min(MAX_DEG, deg)));
    if (backBtn) backBtn.disabled = atHome && !flying;
  }

  // ---- the panel ----------------------------------------------------------------------------------------
  function buildPanel() {
    panel = el(doc, 'section', 'sr-figside sr-float ui-pop');
    panel.id = 'sr-figside';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'sr-figside-title');
    panel.tabIndex = -1;
    const head = el(doc, 'div', 'ui-pop__head');
    titleEl = el(doc, 'h2', 'ui-pop__title', '');
    titleEl.id = 'sr-figside-title';
    const x = el(doc, 'button', 'ui-close');
    x.type = 'button';
    x.setAttribute('aria-label', C.close);
    x.title = C.close;
    try { x.appendChild(icon('x')); } catch { /* a test's document */ }
    x.addEventListener('click', () => close());
    head.append(titleEl, x);
    const body = el(doc, 'div', 'ui-pop__body');
    const top = el(doc, 'div', 'ui-pop__sect');
    lede = el(doc, 'p', 'sr-figside__lede', C.loading);
    const lab = el(doc, 'label', 'ui-pop__eyebrow', C.angle);
    lab.htmlFor = 'sr-figside-angle';
    slider = doc.createElement('input');
    slider.type = 'range';
    slider.id = 'sr-figside-angle';
    slider.className = 'ui-range';
    slider.min = '0'; slider.max = String(MAX_DEG); slider.step = '1'; slider.value = '0';
    slider.disabled = true;
    slider.addEventListener('input', () => {
      if (flying) stopFlying();
      if (rig.state.flying && typeof rig.finishFlight === 'function') rig.finishFlight();
      setAngle(Number(slider.value));
      paint();
    });
    where = el(doc, 'p', 'sr-figside__where', '');
    where.setAttribute('aria-live', 'off');
    top.append(lede, lab, slider, where);
    const acts = el(doc, 'div', 'sr-figside__acts');
    playBtn = el(doc, 'button', 'ui-btn ui-btn--primary', C.play);
    playBtn.type = 'button';
    playBtn.disabled = true;
    playBtn.addEventListener('click', play);
    backBtn = el(doc, 'button', 'ui-btn ui-btn--ghost', C.back);
    backBtn.type = 'button';
    backBtn.disabled = true;
    backBtn.addEventListener('click', goHome);
    acts.append(playBtn, backBtn);
    top.append(acts);
    const more = el(doc, 'div', 'ui-pop__sect');
    rangeLine = el(doc, 'p', 'sr-figside__range', '');
    noteLine = el(doc, 'p', 'ui-pop__note', '');
    noteLine.hidden = true;
    unplacedLine = el(doc, 'p', 'ui-pop__note', '');
    unplacedLine.hidden = true;
    const pickLab = el(doc, 'label', 'ui-pop__eyebrow', C.another);
    pickLab.htmlFor = 'sr-figside-pick';
    picker = doc.createElement('select');
    picker.id = 'sr-figside-pick';
    picker.className = 'ui-select ui-select--block';
    picker.addEventListener('change', () => { if (picker.value) open(picker.value); });
    more.append(rangeLine, noteLine, unplacedLine, pickLab, picker, el(doc, 'p', 'ui-pop__note', C.honest));
    body.append(top, more);
    panel.append(head, body);
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    doc.body.appendChild(panel);
    doc.documentElement.classList.add('sr-figside-open');
    paintButtons();
  }

  function fillPicker() {
    if (!picker) return;
    picker.textContent = '';
    const rows = SIDE_FIGURES.map((r) => resolveFigure(r.id, SIDE_FIGURES, null));
    if (open_ && !rows.some((r) => r.id === open_.id)) rows.unshift(open_);
    for (const r of rows) {
      const o = doc.createElement('option');
      o.value = r.id;
      o.textContent = nameOf(r);
      picker.appendChild(o);
    }
    if (open_) picker.value = open_.id;
  }

  function play() {
    if (!frame) return;
    if (flying) { stopFlying(); return; }
    if (rig.state.flying && typeof rig.finishFlight === 'function') rig.finishFlight();
    const from = Number.isFinite(frame.deg) && frame.deg < SIDE_DEG - 1 ? frame.deg : 0;
    // From wherever the visitor left the camera: first back onto the circle, at once (the pose is the figure's own).
    camera.up.copy(frame.up);
    rig.flyTo({ targetScene: frame.target, distance: frame.distance, azimuth: frame.az0 + from * D2R, polar: frame.polar0, ms: 0 });
    if (reduced()) { setAngle(SIDE_DEG); slider.value = String(SIDE_DEG); paint(); paintButtons(); return; }
    flying = { t0: win.performance.now(), from, to: SIDE_DEG, ms: FLY_MS * ((SIDE_DEG - from) / SIDE_DEG) };
    paintButtons();
  }

  function goHome() {
    if (!frame) return;
    if (flying) stopFlying();
    slider.value = '0';
    pose(ARRIVE_MS);
  }

  // ---- open and close -----------------------------------------------------------------------------------
  function say(line) { if (ctx.sceneNote && typeof ctx.sceneNote.say === 'function') ctx.sceneNote.say(line); }

  /**
   * Open the side view of a figure: a registry/sideviews.yaml id ("orion", "big-dipper") or an IAU code ("Cyg").
   * Returns a promise of whether it opened.
   */
  async function open(value, { write = true } = {}) {
    if (tripOn()) { say(C.inTrip); return false; }
    const mine = ++gen;
    const figures = typeof ctx.wantFigures === 'function' ? await ctx.wantFigures() : null;
    if (mine !== gen) return false;
    if (!figures) { say(C.failed); return false; }
    // The asterisms of the registry, as figures of their own, before anything is looked up.
    const extra = SIDE_FIGURES.map((r) => asterismFeature(r, r.name ? C.names[r.name] : r.id)).filter(Boolean);
    const ok = await figures.define(extra.map((e) => e.feature), extra.map((e) => e.name));
    if (mine !== gen) return false;
    if (!ok) { say(C.failed); return false; }
    const found = resolveFigure(value, SIDE_FIGURES, (id) => !!figures.placedOf(id));
    const placed = found ? figures.placedOf(found.figure) : null;
    const fr = placed ? frameOf(placed) : null;
    if (!found || !fr) {
      say(C.unknown);
      if (write) writeUrl({ figure: '' });
      return false;
    }
    for (const r of SIDE_FIGURES) if (r.figure) { const p = figures.placedOf(r.figure); if (p) names.set(r.figure, p.name); }
    names.set(found.figure, placed.name);

    // The first figure: leave where the visitor was, and remember it. A second one keeps what the first saved.
    if (!open_) {
      const wasGround = !!(ctx.skyView && ctx.skyView.active);
      if (wasGround && typeof ctx.setMoment === 'function') ctx.setMoment('wonder');
      saved = { ground: wasGround, stage: stage.worldId, rig: rig.saveState(), fov: camera.fov, layersOn: [], layersOff: [], focus: doc.activeElement };
      if (stage.worldId !== STAGE) ctx.setStage(STAGE);
      if (setLayer('stars', true)) saved.layersOn.push('stars');
      for (const id of HIDES) { const was = ctx.isLayerOn(id); setLayer(id, false); if (was && !ctx.isLayerOn(id)) saved.layersOff.push(id); }
      await loadCss('figureside', doc);
      if (mine !== gen) return false;
      buildPanel();
      stopInput = rig.onUserInput(() => { if (flying) stopFlying(); });
      doc.addEventListener('keydown', onKey, true);
      win.addEventListener('sr:select', onSelect);
    }
    if (flying) stopFlying();
    open_ = { ...found, name: nameOf(found) };

    // The frame, in the scene's own axes (the stellar rung: one unit is one light-year, the Sun at the origin).
    const basis = sideBasis(fr.dir);
    toScene([0, 0, 0], _sun);
    const target = toScene(fr.targetLy, new THREE.Vector3());
    const up = toScene(basis.up, new THREE.Vector3()).sub(_sun).normalize();
    const toHome = _sun.clone().sub(target).normalize();
    const distance = target.distanceTo(_sun) - homeOffsetLy(fr.distanceLy, fr.nearLy) * LY_KM / stage.unitKm;
    const a = rigAngles(toHome, up);
    frame = {
      ...fr, target, up, distance, az0: a.azimuth, polar0: a.polar, deg: 0,
      home: target.clone().addScaledVector(toHome, distance),
    };
    figures.show({ figures: [found.figure], names: true, stars: 8 });
    pose(ARRIVE_MS);

    titleEl.textContent = t(C.title, { name: open_.name });
    lede.textContent = C.lede;
    rangeLine.textContent = t(C.range, { near: fmt.int(Math.round(fr.nearLy)), far: fmt.int(Math.round(fr.farLy)) });
    const note = found.row && found.row.note ? C.notes[found.row.note] : '';
    noteLine.textContent = note || '';
    noteLine.hidden = !note;
    unplacedLine.textContent = placed.unplaced > 0 ? t(C.unplaced, { n: String(placed.unplaced) }) : '';
    unplacedLine.hidden = !(placed.unplaced > 0);
    slider.disabled = false; slider.value = '0';
    playBtn.disabled = false;
    lastWhere = '';
    fillPicker();
    paintButtons();
    if (write) writeUrl({ figure: open_.id });
    if (!raf) raf = win.requestAnimationFrame(tick);
    win.dispatchEvent(new CustomEvent('sr:figureside', { detail: { id: open_.id } }));
    try { panel.focus({ preventScroll: true }); } catch { /* a test's document */ }
    return true;
  }

  function onKey(e) {
    if (e.key !== 'Escape' || !open_) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' && e.target !== slider) return; // an Escape typed into the search is the search's
    if (tag === 'TEXTAREA') return;
    e.stopPropagation();
    close();
  }

  // Something else was picked: the view is that thing's now. The side view stands down and leaves the camera to it.
  function onSelect(e) { if (open_ && e && e.detail) close({ restore: false }); }

  /** Close it. `restore: false` leaves the camera and the stage where they are (something else took the view). */
  function close({ write = true, restore = true } = {}) {
    gen++;
    if (!open_ && !panel) return;
    const was = open_;
    open_ = null;
    flying = null;
    if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
    if (stopInput) { stopInput(); stopInput = null; }
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('sr:select', onSelect);
    if (panel) panel.remove();
    doc.documentElement.classList.remove('sr-figside-open');
    panel = slider = where = playBtn = backBtn = lede = rangeLine = noteLine = unplacedLine = picker = titleEl = null;
    if (ctx.figures && !tripOn()) ctx.figures.clear();
    const s = saved; saved = null; frame = null;
    if (s) {
      for (const id of s.layersOff) setLayer(id, true);
      for (const id of s.layersOn) setLayer(id, false);
      if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
      if (restore && !tripOn()) {
        if (s.ground && typeof ctx.setMoment === 'function') ctx.setMoment('now');
        else {
          if (s.stage !== stage.worldId && typeof ctx.setStage === 'function') ctx.setStage(s.stage);
          rig.restoreState(s.rig, reduced() ? 0 : 900);
        }
      } else if (s.rig && s.rig.up) {
        // The view is somebody else's: only the up goes back, which every other flight expects to be its own.
        camera.up.copy(s.rig.up);
        if (typeof rig.sync === 'function') rig.sync();
      }
    }
    if (write && was) writeUrl({ figure: '' });
    // The focus goes back to what had it (the search field, the page), as a closed card's does.
    if (s && s.focus && s.focus.isConnected && typeof s.focus.focus === 'function' && s.focus !== doc.body) { try { s.focus.focus({ preventScroll: true }); } catch { /* gone */ } }
    win.dispatchEvent(new CustomEvent('sr:figureside', { detail: { id: null } }));
  }

  /**
   * The one door main.js knows: a figure asked for by a card, a search row or the link's `figure=`, or nothing, when
   * the key has left the address (the view closes). A figure that is already the one open is left as it is: the
   * address changing for another reason must not send the camera back to the Sun.
   */
  function fromLink(value) {
    const want = String(value == null ? '' : value).trim();
    if (!want || want === '0') { close(); return Promise.resolve(false); }
    const low = want.toLowerCase();
    if (open_ && (open_.id.toLowerCase() === low || String(open_.figure).toLowerCase() === low)) return Promise.resolve(true);
    return open(want);
  }

  return {
    open, close, fromLink,
    isOpen: () => !!open_,
    openId: () => (open_ ? open_.id : null),
    /** For a browser check: what is open, how far round the camera is and what the panel says. */
    state: () => ({
      id: open_ ? open_.id : null, figure: open_ ? open_.figure : null, name: open_ ? open_.name : null,
      deg: frame ? frame.deg : null, flying: !!flying, fov: camera.fov,
      where: where ? where.textContent : '', nearLy: frame ? frame.nearLy : null, farLy: frame ? frame.farLy : null,
    }),
    destroy() { close({ write: false, restore: false }); },
  };
}
