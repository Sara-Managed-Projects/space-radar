// scene/shells.js -- two spheres with a real radius: how far radio from the Earth has got, and the
// edge of the observable universe (internal #306, from the planetarium films; internal spec 0075
// task 17, DS-D08, DS-D09: the horizon explains itself, and past it the map's last few billion
// light-years say they are an illustration).
//
// Never at boot: main.js imports this the first time the map is on a rung of the ladder
// (tests/test_boot_diet.mjs). No picture, no file: a few hundred line segments.
//
// WHAT IS MEASURED AND WHAT IS DRAWN. Both are shells in the plain sense: a distance from here,
// drawn as a wire sphere, with nothing on it. Neither is a thing out there.
//   - RADIO. Radio waves travel at the speed of light, so the first signal strong enough to be
//     heard across an ocean is now as many light-years out as there have been years since. The
//     start is Marconi's transatlantic signal of 12 December 1901 (received at Signal Hill,
//     Newfoundland, from Poldhu: https://en.wikipedia.org/wiki/Guglielmo_Marconi, read 2026-10-07).
//     The radius is worked out from the map's clock, so it grows by one light-year a year. It is the
//     furthest ANY radio from the Earth can have reached, not how far it could be detected: the
//     label says radio, not "heard".
//   - THE HORIZON. The edge of the observable universe: the farthest place whose light has had time
//     to reach us. Its radius is computed, not typed: data/cosmology.js horizonLy() integrates
//     Planck 2018's universe (about 46 billion light-years now, comoving). The light from there has
//     travelled for the universe's whole age, 13.8 billion years, and the place is three times
//     farther than that because space stretched while the light was on its way; NASA (2025, "How
//     big is space?", https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/):
//     "the observable universe is about 92 billion light-years across". The microwave background,
//     released about 380 000 years after the Big Bang, left from just inside it (cosmology.js cmbLy,
//     about 45 billion). It is a sphere around whoever looks, so it is drawn around us. Its label says
//     both numbers, the distance now and the time the light took, so the two are never confused.
//   - THE MAP OF THAT LIGHT (internal spec 0076 W1-b, internal #781): scene/deep/cmb.js, fetched when
//     the camera is a fifth of the way out, paints our sky's measured microwave map on the sphere the
//     light left from, from about 30 billion light-years and from outside. That placing is an
//     illustration and the words under it say so, with the colour scale in microkelvin.
//   - PAST THE HORIZON, to the map's edge at 50 billion light-years (scene/camera.js EDGE_LY), nothing
//     measured can be: no light from there has reached us. The map lets the camera stand there to
//     look back at the horizon, and says, on the scene, that this band is an illustration.
//
// READ ALOUD (spec 0075 task 67). The words on the scene are canvas sprites, which a screen reader
// cannot read, so the same words, the colour scale as a sentence, are kept in one visually hidden
// polite live region (#sr-shells-words), changed only when what is shown changes.
//
// Contract: createShells(scene, opts) -> { update(camera, tMs), radioRadiusLy(tMs), state(), spoken(), debug(o), dispose() }
// (`opts.loadMap` reads the map's picture, for a test; scene/deep/cmb.js createCmb's own by default)
// Pure, for tests: radioRadiusLy(tMs), shellOpacity(distance / radius), horizonOpacity(distance /
// radius), HORIZON_LY, CMB_LY, CMB_LOAD_RATIO, cmbWords(inside), cmbYears().

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t as fill } from '../copy/en.js';
import '../copy/en.later.js';
import { stage, isLadderStage } from './stage.js';
import { horizonLy, ageGyr, cmbLy, PLANCK18 } from '../data/cosmology.js';
import { EDGE_LY } from './camera.js';

const LY_KM = 9460730472580.8;
const YEAR_MS = 365.25 * 86400000; // the Julian year a light-year is defined by
/** Marconi's transatlantic signal, UTC noon of the day: the hour is not on the page and a day is 0.003 ly. */
export const RADIO_SINCE_MS = Date.UTC(1901, 11, 12, 12);
/** The radius of the observable universe now, light-years: the particle horizon of data/cosmology.js. */
export const HORIZON_LY = horizonLy();
/** Where the microwave background we see left from, now: data/cosmology.js, just inside the horizon. */
export const CMB_LY = cmbLy();
/** The map's module and picture are fetched from this share of the way out (scene/deep/cmb.js LOAD_RATIO). */
export const CMB_LOAD_RATIO = 0.2;

/** How long after the Big Bang the background's light left, in years, to the nearest 10 000 (about 370 000). */
export function cmbYears() {
  return Math.round((ageGyr(PLANCK18.zCmb) * 1e9) / 1e4) * 1e4;
}
const groups = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * The map's words, in the order the scene prints them; `bar` stands for the colour scale (drawn in
 * the label, said as `say`). From inside, one more line: an observer out there sees another map.
 */
export function cmbWords(inside) {
  const W = COPY.deepCosmos;
  const n = 200; // scene/deep/cmb.js SCALE_UK
  const lines = [W.cmbTitle, fill(W.cmbWhen, { k: groups(cmbYears()) }), W.cmbPainted];
  if (inside) lines.push(W.cmbElsewhere);
  lines.push({ bar: true, left: fill(W.cmbCold, { n }), mid: fill(W.cmbMid, { t: PLANCK18.Tcmb0.toFixed(4) }), right: fill(W.cmbWarm, { n }), say: fill(W.cmbScaleSay, { n, t: PLANCK18.Tcmb0.toFixed(4) }) });
  lines.push(W.cmbSource);
  return lines;
}

/** How many light-years radio from the Earth can have travelled by `tMs`. Never negative. */
export function radioRadiusLy(tMs) {
  return Math.max(0, (Number(tMs) - RADIO_SINCE_MS) / YEAR_MS);
}

/**
 * How strongly a shell is drawn from a camera `ratio` radii from its centre: nothing from inside
 * it or just outside (a cage round the camera says nothing), all of it from two to forty radii,
 * gone by a hundred and fifty, where it is a dot.
 */
export function shellOpacity(ratio) {
  if (!(ratio > 0)) return 0;
  const up = Math.min(1, Math.max(0, (ratio - 1.3) / 0.7));
  const down = Math.min(1, Math.max(0, (150 - ratio) / 110));
  return up * up * (3 - 2 * up) * down;
}

function cssColour(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/**
 * The horizon's own rule: the camera never sees it from inside (it is the whole sky there), but it
 * is drawn from just outside, because the map's edge (50 billion light-years) is only a little past
 * it (46): from there it is the near wall of the sphere, filling the view.
 */
export function horizonOpacity(ratio) {
  if (!(ratio > 0)) return 0;
  const up = Math.min(1, Math.max(0, (ratio - 1.0) / 0.03));
  const down = Math.min(1, Math.max(0, (150 - ratio) / 110));
  return up * up * (3 - 2 * up) * down;
}

/** A unit wire sphere: the equator, parallels every 30 degrees and meridians every 30. */
function wireSphere() {
  const pts = [];
  const SEG = 96;
  const ring = (fn) => {
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const b = ((i + 1) / SEG) * Math.PI * 2;
      pts.push(...fn(a), ...fn(b));
    }
  };
  for (const latDeg of [-60, -30, 0, 30, 60]) {
    const lat = (latDeg * Math.PI) / 180;
    ring((a) => [Math.cos(lat) * Math.cos(a), Math.sin(lat), Math.cos(lat) * Math.sin(a)]);
  }
  for (let m = 0; m < 6; m++) {
    const lon = (m * Math.PI) / 6;
    ring((a) => [Math.cos(a) * Math.cos(lon), Math.sin(a), Math.cos(a) * Math.sin(lon)]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  return g;
}

/** A line's words as said: a string as it is, the colour scale's own sentence. */
const said = (line) => (typeof line === 'string' ? line : line && line.say) || '';

/**
 * One line, or several (an array; the second and later in a smaller hand), as a sprite. A line may be
 * the colour scale ({bar, left, mid, right, stops}): the map's colours, end to end, with its numbers
 * under them. `plate` puts a dark ground under the words, for when the map is behind them.
 */
function textSprite(text, colour, plate = false) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  const px = 28;
  const lines = (Array.isArray(text) ? text : [text]).filter((l) => l !== '');
  const c2 = canvas.getContext && canvas.getContext('2d');
  if (!c2) return null;
  const fontOf = (i, k = 1) => `${Math.round((i ? px * 0.8 : px) * k)}px Inter, system-ui, -apple-system, sans-serif`;
  const LH = px * 1.3;
  const rowH = (line) => (typeof line === 'string' ? LH : LH * 1.7);
  let w = 0;
  lines.forEach((line, i) => {
    if (typeof line === 'string') { c2.font = fontOf(i); w = Math.max(w, c2.measureText(line).width); }
    else { c2.font = fontOf(1, 0.85); w = Math.max(w, 420, c2.measureText(`${line.left}   ${line.mid}   ${line.right}`).width); }
  });
  const pad = plate ? 20 : 8;
  canvas.width = Math.ceil(w) + 2 * pad;
  const inner = lines.reduce((a, l) => a + rowH(l), 0);
  canvas.height = Math.round(inner) + 2 * pad;
  const c = canvas.getContext('2d');
  if (plate) {
    c.fillStyle = 'rgba(11, 14, 20, 0.66)'; // scene/renderer.js SPACE, two thirds: the words stay readable over the map
    const r = 14;
    c.beginPath();
    c.moveTo(r, 0); c.lineTo(canvas.width - r, 0); c.quadraticCurveTo(canvas.width, 0, canvas.width, r);
    c.lineTo(canvas.width, canvas.height - r); c.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
    c.lineTo(r, canvas.height); c.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
    c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0);
    c.fill();
  }
  c.textBaseline = 'middle';
  let y = pad;
  lines.forEach((line, i) => {
    const h = rowH(line);
    if (typeof line === 'string') {
      c.fillStyle = colour;
      c.textAlign = 'center';
      c.font = fontOf(i);
      c.fillText(line, canvas.width / 2, y + LH / 2);
    } else {
      // The bar: the map's own seven colours at equal steps, as scene/deep/cmb.js mixes them.
      const bw = Math.min(w, Math.max(420, w * 0.8));
      const x0 = (canvas.width - bw) / 2;
      const g = c.createLinearGradient(x0, 0, x0 + bw, 0);
      (line.stops || []).forEach((s, k, all) => g.addColorStop(k / (all.length - 1), s));
      c.fillStyle = g;
      c.fillRect(x0, y + LH * 0.15, bw, LH * 0.5);
      c.fillStyle = colour;
      c.font = fontOf(1, 0.85);
      const ty = y + LH * 0.65 + LH * 0.5;
      c.textAlign = 'left'; c.fillText(line.left, x0, ty);
      c.textAlign = 'center'; c.fillText(line.mid, x0 + bw / 2, ty);
      c.textAlign = 'right'; c.fillText(line.right, x0 + bw, ty);
    }
    y += h;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false }));
  sprite.userData.aspect = canvas.width / canvas.height;
  // In lines of the first line's height, so the label's size on screen follows what it holds.
  sprite.userData.lines = (canvas.height - 16) / LH;
  sprite.center.set(0.5, 0);
  return sprite;
}

/** The live region that reads the scene's words to a screen reader (none outside a page). */
function liveRegion() {
  if (typeof document === 'undefined' || !document.createElement || !document.body) return null;
  const el = document.createElement('div');
  el.className = 'sr-hidden-text';
  el.id = 'sr-shells-words';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

export function createShells(scene, opts = {}) {
  const group = new THREE.Group();
  group.name = 'shells';
  scene.add(group);
  const geom = wireSphere();
  const colour = new THREE.Color(cssColour('--sr-text-dim', '#9aa4b2'));
  const textColour = cssColour('--sr-text-soft', '#c5ccd6');
  const _up = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _ray = new THREE.Vector3();
  const _axis = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _dir = new THREE.Vector3();
  /** A label's height on the screen, made smaller where its widest line would not fit the view (a phone). */
  const fitScale = (sprite, lh, camera) => {
    const px = camera.projectionMatrix.elements[0] || 1; // NDC per unit of a sizeAttenuation:false sprite
    const maxW = 1.84 / px;
    const k = lh * sprite.userData.aspect > maxW ? maxW / (lh * sprite.userData.aspect) : 1;
    sprite.scale.set(lh * k * sprite.userData.aspect, lh * k, 1);
  };

  function make(id) {
    const mesh = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false }));
    mesh.name = `shells:${id}`;
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    return { id, mesh, label: null, labelText: '', say: '', wordsOn: false, radiusLy: 0, opacity: 0 };
  }
  const shells = [make('radio'), make('horizon')];
  // The words at the foot of the view, with no sphere of their own: past the horizon, that the map's
  // last band is an illustration; inside, on the way out, the microwave map's words and its scale.
  const edge = { id: 'edge', label: null, labelText: '', shown: false, say: '' };
  // The microwave background's map (scene/deep/cmb.js), fetched on the way out.
  let cmb = null;
  let cmbLoad = null;
  let cmbStops = null;
  let cmbK = 0;
  const live = liveRegion();
  let spokenNow = '';
  let wordsKey = '';
  let labelVersion = 0;
  // Tools only (tests/probes/look/r12-edge.js photographs the before): the map held off, under ?look=1.
  let cmbOff = false;
  const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const horizonWords = [
    COPY.deepCosmos.horizon,
    fill(COPY.deepCosmos.horizonNow, { n: Math.round(HORIZON_LY / 1e9) }),
    fill(COPY.deepCosmos.horizonWhy, { age: fmt1(ageGyr(0)) }),
  ];

  function setLabel(sh, text, plate = false) {
    const lines = Array.isArray(text) ? text : [text];
    const key = lines.map(said).join('\n') + (plate ? '\n[plate]' : '');
    if (sh.labelText === key) return;
    if (sh.label) { group.remove(sh.label); sh.label.material.map.dispose(); sh.label.material.dispose(); }
    sh.label = textSprite(lines.map((l) => (typeof l === 'string' ? l : { ...l, stops: cmbStops || [] })), textColour, plate);
    sh.labelText = key;
    labelVersion += 1;
    sh.say = lines.map(said).filter(Boolean).join('. ').replace(/\.\./g, '.');
    if (sh.label) { sh.label.name = `shells:${sh.id}-label`; sh.label.renderOrder = 5; group.add(sh.label); }
  }

  /** The words a screen reader is given: those on the scene now, the scale as a sentence. */
  function speak(shownIds) {
    const key = shownIds.join('|') + '#' + labelVersion;
    if (key === wordsKey) return;
    wordsKey = key;
    const parts = [];
    for (const sh of [...shells, edge]) if (shownIds.includes(sh.id) && sh.say) parts.push(sh.say);
    spokenNow = parts.join('. ');
    if (live && live.textContent !== spokenNow) live.textContent = spokenNow;
  }

  function wantCmb() {
    if (cmb || cmbLoad) return;
    cmbLoad = import('./deep/cmb.js')
      .then((m) => { cmbStops = m.STOPS.slice(); cmb = m.createCmb(group, { loadMap: opts.loadMap }); })
      .catch((err) => { console.warn('the microwave background did not load', err); cmbLoad = null; });
  }

  function update(camera, tMs) {
    const on = isLadderStage(stage.worldId);
    group.visible = on;
    if (!on || !camera) { for (const sh of shells) { sh.opacity = 0; sh.wordsOn = false; } edge.shown = false; cmbK = 0; speak([]); return; }
    const radio = radioRadiusLy(tMs);
    shells[0].radiusLy = radio;
    shells[1].radiusLy = HORIZON_LY;
    const d = camera.position.length(); // both are centred on the Sun, which is the rung's origin
    // The microwave map: fetched a fifth of the way out, drawn from about 30 billion light-years.
    const rC = (CMB_LY * LY_KM) / stage.unitKm;
    if (d > CMB_LOAD_RATIO * rC) wantCmb();
    cmbK = cmb ? cmb.update(camera, cmbOff ? 0 : rC) : 0;
    const mapShown = cmbK > 0.2;
    const inside = d < rC;
    // The words are made when the number they print changes: once a year for the first, never for the
    // second; the horizon's carry the map's words and scale while the map is on its wall.
    setLabel(shells[0], fill(COPY.shells.radio, { n: Math.floor(radio) }));
    setLabel(shells[1], mapShown && !inside ? [...horizonWords, ...cmbWords(false)] : horizonWords, mapShown && !inside);
    const h = 0.03 * Math.min(1, (camera.aspect || 1) * 1.5);
    _up.copy(camera.up).normalize();
    camera.getWorldDirection(_fwd);
    const halfFov = ((camera.fov || 50) * Math.PI) / 360;
    for (const sh of shells) {
      const r = (sh.radiusLy * LY_KM) / stage.unitKm;
      const k = r > 0 ? (sh.id === 'horizon' ? horizonOpacity(d / r) : shellOpacity(d / r)) : 0;
      sh.opacity = k;
      sh.mesh.visible = k > 0.01;
      if (sh.mesh.visible) {
        sh.mesh.scale.setScalar(r);
        sh.mesh.material.opacity = 0.42 * k;
      }
      // The words only while the sphere is big enough to be what they point at (a twentieth of the view).
      sh.wordsOn = k > 0.25 && d / r < 25;
      if (sh.label) {
        sh.label.visible = sh.wordsOn;
        if (sh.label.visible) {
          fitScale(sh.label, h * (1 + 0.8 * (sh.label.userData.lines - 1)), camera);
          // On the near wall, as high as the label's height (on screen: scale.y times the projection's
          // y scale) lets it stay inside the view.
          const tanH = Math.tan(halfFov);
          const tall = sh.label.scale.y * (camera.projectionMatrix.elements[5] || 1 / tanH);
          const alpha = Math.min(halfFov * 0.42, Math.atan(Math.max(-0.5, 0.94 - tall) * tanH));
          if (d / r < 2.5 && wallPoint(camera, r, alpha, _ray)) sh.label.position.copy(_ray);
          else sh.label.position.copy(_up).multiplyScalar(r * 1.02);
          sh.label.material.opacity = Math.min(1, (k - 0.25) / 0.4);
        }
      }
    }
    // Past the horizon, the band to the map's edge says what it is, in the lower part of the view; on
    // the way out, inside, the same place carries the microwave map's words and scale.
    const rH = (HORIZON_LY * LY_KM) / stage.unitKm;
    const past = d > rH;
    const mapInside = mapShown && inside;
    edge.shown = past || mapInside;
    if (edge.shown) {
      const gly = Math.min(EDGE_LY, (d * stage.unitKm) / LY_KM) / 1e9;
      if (past) setLabel(edge, [fill(COPY.deepCosmos.edge, { n: Math.round(gly) }), fill(COPY.deepCosmos.edgeWhy, { h: Math.round(HORIZON_LY / 1e9) }), COPY.deepCosmos.edgeNothing], mapShown);
      else setLabel(edge, cmbWords(true), true);
      if (edge.label) {
        _axis.crossVectors(_fwd, _up).normalize();
        _q.setFromAxisAngle(_axis, -halfFov * 0.62);
        _ray.copy(_fwd).applyQuaternion(_q);
        // Nearer than anything it could stand behind: a twentieth of the horizon, or of the camera's distance inside.
        edge.label.position.copy(camera.position).addScaledVector(_ray, Math.min(rH, d) * 0.05);
        fitScale(edge.label, h * (1 + 0.8 * (edge.label.userData.lines - 1)), camera);
        edge.label.material.opacity = past ? Math.min(1, (d / rH - 1) / 0.02) : Math.min(1, (cmbK - 0.2) / 0.3);
      }
    }
    if (edge.label) edge.label.visible = edge.shown;
    const shown = shells.filter((sh) => sh.wordsOn).map((sh) => sh.id);
    if (edge.shown) shown.push('edge');
    speak(shown);
  }

  /**
   * Where the ray `alpha` radians above the view's centre meets a sphere of radius r round the Sun,
   * nearest the camera: the horizon's words stand on its near wall when it fills the view.
   */
  function wallPoint(cam, r, alpha, out) {
    _axis.crossVectors(_fwd, _up).normalize();
    if (!(_axis.lengthSq() > 0)) return false;
    _q.setFromAxisAngle(_axis, alpha);
    const dir = _dir.copy(_fwd).applyQuaternion(_q).normalize();
    const o = cam.position;
    const b = o.dot(dir);
    const c = o.lengthSq() - r * r;
    const disc = b * b - c;
    if (disc < 0) return false;
    const t = -b - Math.sqrt(disc);
    if (!(t > 0)) return false;
    out.copy(o).addScaledVector(dir, t);
    return true;
  }

  function state() {
    return [
      ...shells.map((sh) => ({ id: sh.id, radiusLy: sh.radiusLy, opacity: sh.opacity, label: sh.labelText, drawn: sh.mesh.visible && group.visible })),
      { id: 'edge', label: edge.labelText, drawn: edge.shown && group.visible },
      { id: 'cmb', radiusLy: CMB_LY, loading: !!cmbLoad && !cmb, ...(cmb ? cmb.state() : { status: 'not fetched', opacity: 0, drawn: false }), drawn: !!cmb && cmb.state().drawn && group.visible },
    ];
  }

  /** What the live region holds now (#sr-shells-words). */
  function spoken() { return spokenNow; }

  /** `{ cmb: false }` holds the map off, for a look probe's before; only on a page opened with ?look=1. */
  function debug(opts = {}) {
    const looking = typeof location !== 'undefined' && /[?&]look=1\b/.test(location.search || '');
    if (looking && 'cmb' in opts) cmbOff = opts.cmb === false;
    return { cmbOff };
  }

  function dispose() {
    if (cmb) cmb.dispose();
    if (live && live.parentNode) live.parentNode.removeChild(live);
    if (edge.label) { edge.label.material.map.dispose(); edge.label.material.dispose(); }
    for (const sh of shells) {
      sh.mesh.material.dispose();
      if (sh.label) { sh.label.material.map.dispose(); sh.label.material.dispose(); }
    }
    geom.dispose();
    scene.remove(group);
  }

  return { update, radioRadiusLy, state, spoken, debug, dispose };
}
