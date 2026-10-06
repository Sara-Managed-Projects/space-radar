// scene/shells.js -- two spheres with a real radius: how far radio from the Earth has got, and the
// surface the microwave background reaches us from (internal #306, from the planetarium films).
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
//   - THE MICROWAVE BACKGROUND. The light released when the universe became transparent, some
//     380 000 years after the Big Bang (https://en.wikipedia.org/wiki/Cosmic_microwave_background,
//     read 2026-10-07). Where that light came from is now about 46.5 billion light-years away, the
//     radius of the observable universe (https://en.wikipedia.org/wiki/Observable_universe, read
//     2026-10-07: "about 14.26 gigaparsecs (46.5 billion light-years)"). It is a sphere around
//     whoever looks, so it is drawn around us. The Planck map of it is not drawn: this is the
//     distance, not the picture.
//
// Contract: createShells(scene) -> { update(camera, tMs), radioRadiusLy(tMs), state(), dispose() }
// Pure, for tests/test_shells.mjs: radioRadiusLy(tMs), shellOpacity(distance / radius).

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t as fill } from '../copy/en.js';
import '../copy/en.later.js';
import { stage, isLadderStage } from './stage.js';

const LY_KM = 9460730472580.8;
const YEAR_MS = 365.25 * 86400000; // the Julian year a light-year is defined by
/** Marconi's transatlantic signal, UTC noon of the day: the hour is not on the page and a day is 0.003 ly. */
export const RADIO_SINCE_MS = Date.UTC(1901, 11, 12, 12);
/** The radius of the observable universe, light-years (the microwave background's surface, to three figures). */
export const CMB_RADIUS_LY = 46.5e9;

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

function textSprite(text, colour) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  const px = 28;
  const c2 = canvas.getContext && canvas.getContext('2d');
  if (!c2) return null;
  const font = `${px}px Inter, system-ui, -apple-system, sans-serif`;
  c2.font = font;
  canvas.width = Math.ceil(c2.measureText(text).width) + 16;
  canvas.height = px + 16;
  const c = canvas.getContext('2d');
  c.font = font;
  c.fillStyle = colour;
  c.textBaseline = 'middle';
  c.fillText(text, 8, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false }));
  sprite.userData.aspect = canvas.width / canvas.height;
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

  function make(id) {
    const mesh = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false }));
    mesh.name = `shells:${id}`;
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    return { id, mesh, label: null, labelText: '', radiusLy: 0, opacity: 0 };
  }
  const shells = [make('radio'), make('cmb')];

  function setLabel(sh, text) {
    if (sh.labelText === text) return;
    if (sh.label) { group.remove(sh.label); sh.label.material.map.dispose(); sh.label.material.dispose(); }
    sh.label = textSprite(text, textColour);
    sh.labelText = text;
    if (sh.label) { sh.label.name = `shells:${sh.id}-label`; sh.label.renderOrder = 5; group.add(sh.label); }
  }

  function update(camera, tMs) {
    const on = isLadderStage(stage.worldId);
    group.visible = on;
    if (!on || !camera) { for (const sh of shells) sh.opacity = 0; return; }
    const radio = radioRadiusLy(tMs);
    shells[0].radiusLy = radio;
    shells[1].radiusLy = CMB_RADIUS_LY;
    // The words are made when the number they print changes: once a year for the first, never for the second.
    setLabel(shells[0], fill(COPY.shells.radio, { n: Math.floor(radio) }));
    setLabel(shells[1], COPY.shells.cmb);
    const d = camera.position.length(); // both are centred on the Sun, which is the rung's origin
    const h = 0.03 * Math.min(1, (camera.aspect || 1) * 1.5);
    _up.copy(camera.up).normalize();
    for (const sh of shells) {
      const r = (sh.radiusLy * LY_KM) / stage.unitKm;
      const k = r > 0 ? shellOpacity(d / r) : 0;
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
          sh.label.position.copy(_up).multiplyScalar(r * 1.02);
          sh.label.scale.set(h * sh.label.userData.aspect, h, 1);
          sh.label.material.opacity = Math.min(1, (k - 0.25) / 0.4);
        }
      }
    }
  }

  function state() {
    return shells.map((sh) => ({ id: sh.id, radiusLy: sh.radiusLy, opacity: sh.opacity, label: sh.labelText, drawn: sh.mesh.visible && group.visible }));
  }

  function dispose() {
    for (const sh of shells) {
      sh.mesh.material.dispose();
      if (sh.label) { sh.label.material.map.dispose(); sh.label.material.dispose(); }
    }
    geom.dispose();
    scene.remove(group);
  }

  return { update, radioRadiusLy, state, dispose };
}
