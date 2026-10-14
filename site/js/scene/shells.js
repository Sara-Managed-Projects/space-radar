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
//     about 45 billion). It is a sphere around whoever looks, so it is drawn around us. The Planck map
//     of it is not drawn (a later task): this is the distance, not the picture. Its label says both
//     numbers, the distance now and the time the light took, so the two are never confused.
//   - PAST THE HORIZON, to the map's edge at 50 billion light-years (scene/camera.js EDGE_LY), nothing
//     measured can be: no light from there has reached us. The map lets the camera stand there to
//     look back at the horizon, and says, on the scene, that this band is an illustration.
//
// Contract: createShells(scene) -> { update(camera, tMs), radioRadiusLy(tMs), state(), dispose() }
// Pure, for tests: radioRadiusLy(tMs), shellOpacity(distance / radius), horizonOpacity(distance /
// radius), HORIZON_LY.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t as fill } from '../copy/en.js';
import '../copy/en.later.js';
import { stage, isLadderStage } from './stage.js';
import { horizonLy, ageGyr } from '../data/cosmology.js';
import { EDGE_LY } from './camera.js';

const LY_KM = 9460730472580.8;
const YEAR_MS = 365.25 * 86400000; // the Julian year a light-year is defined by
/** Marconi's transatlantic signal, UTC noon of the day: the hour is not on the page and a day is 0.003 ly. */
export const RADIO_SINCE_MS = Date.UTC(1901, 11, 12, 12);
/** The radius of the observable universe now, light-years: the particle horizon of data/cosmology.js. */
export const HORIZON_LY = horizonLy();

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

/** One line, or several (an array; the second and later in a smaller hand), as a sprite. */
function textSprite(text, colour) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  const px = 28;
  const lines = Array.isArray(text) ? text : [text];
  const c2 = canvas.getContext && canvas.getContext('2d');
  if (!c2) return null;
  const fontOf = (i) => `${i ? Math.round(px * 0.8) : px}px Inter, system-ui, -apple-system, sans-serif`;
  let w = 0;
  lines.forEach((line, i) => { c2.font = fontOf(i); w = Math.max(w, c2.measureText(line).width); });
  canvas.width = Math.ceil(w) + 16;
  canvas.height = Math.round(px * 1.3 * lines.length) + 16;
  const c = canvas.getContext('2d');
  c.fillStyle = colour;
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  lines.forEach((line, i) => { c.font = fontOf(i); c.fillText(line, canvas.width / 2, 8 + px * 1.3 * (i + 0.5)); });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false }));
  sprite.userData.aspect = canvas.width / canvas.height;
  sprite.userData.lines = lines.length;
  sprite.center.set(0.5, 0);
  return sprite;
}

export function createShells(scene) {
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
    return { id, mesh, label: null, labelText: '', radiusLy: 0, opacity: 0 };
  }
  const shells = [make('radio'), make('horizon')];
  // Past the horizon: the words that say the map's last band is an illustration (no sphere of its own).
  const edge = { id: 'edge', label: null, labelText: '', shown: false };
  const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const horizonWords = [
    COPY.deepCosmos.horizon,
    fill(COPY.deepCosmos.horizonNow, { n: Math.round(HORIZON_LY / 1e9) }),
    fill(COPY.deepCosmos.horizonWhy, { age: fmt1(ageGyr(0)) }),
  ];

  function setLabel(sh, text) {
    const key = Array.isArray(text) ? text.join('\n') : text;
    if (sh.labelText === key) return;
    if (sh.label) { group.remove(sh.label); sh.label.material.map.dispose(); sh.label.material.dispose(); }
    sh.label = textSprite(text, textColour);
    sh.labelText = key;
    if (sh.label) { sh.label.name = `shells:${sh.id}-label`; sh.label.renderOrder = 5; group.add(sh.label); }
  }

  function update(camera, tMs) {
    const on = isLadderStage(stage.worldId);
    group.visible = on;
    if (!on || !camera) { for (const sh of shells) sh.opacity = 0; edge.shown = false; return; }
    const radio = radioRadiusLy(tMs);
    shells[0].radiusLy = radio;
    shells[1].radiusLy = HORIZON_LY;
    // The words are made when the number they print changes: once a year for the first, never for the second.
    setLabel(shells[0], fill(COPY.shells.radio, { n: Math.floor(radio) }));
    setLabel(shells[1], horizonWords);
    const d = camera.position.length(); // both are centred on the Sun, which is the rung's origin
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
      if (sh.label) {
        // The words only while the sphere is big enough to be what they point at (a twentieth of the view).
        sh.label.visible = k > 0.25 && d / r < 25;
        if (sh.label.visible) {
          if (d / r < 2.5 && wallPoint(camera, r, halfFov * 0.42, _ray)) sh.label.position.copy(_ray);
          else sh.label.position.copy(_up).multiplyScalar(r * 1.02);
          fitScale(sh.label, h * (1 + 0.8 * (sh.label.userData.lines - 1)), camera);
          sh.label.material.opacity = Math.min(1, (k - 0.25) / 0.4);
        }
      }
    }
    // Past the horizon, the band to the map's edge says what it is, in the lower part of the view.
    const rH = (HORIZON_LY * LY_KM) / stage.unitKm;
    edge.shown = d > rH;
    if (edge.shown) {
      const gly = Math.min(EDGE_LY, (d * stage.unitKm) / LY_KM) / 1e9;
      setLabel(edge, [fill(COPY.deepCosmos.edge, { n: Math.round(gly) }), fill(COPY.deepCosmos.edgeWhy, { h: Math.round(HORIZON_LY / 1e9) }), COPY.deepCosmos.edgeNothing]);
      _axis.crossVectors(_fwd, _up).normalize();
      _q.setFromAxisAngle(_axis, -halfFov * 0.62);
      _ray.copy(_fwd).applyQuaternion(_q);
      edge.label.position.copy(camera.position).addScaledVector(_ray, rH * 0.05);
      fitScale(edge.label, h * (1 + 0.8 * (edge.label.userData.lines - 1)), camera);
      edge.label.material.opacity = Math.min(1, (d / rH - 1) / 0.02);
    }
    if (edge.label) edge.label.visible = edge.shown;
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
    ];
  }

  function dispose() {
    if (edge.label) { edge.label.material.map.dispose(); edge.label.material.dispose(); }
    for (const sh of shells) {
      sh.mesh.material.dispose();
      if (sh.label) { sh.label.material.map.dispose(); sh.label.material.dispose(); }
    }
    geom.dispose();
    scene.remove(group);
  }

  return { update, radioRadiusLy, state, dispose };
}
