// scene/heliosphere.js -- the bubble the solar wind blows in the interstellar gas: the termination shock,
// the heliopause and the bow wave, where the two Voyagers crossed, the IBEX ribbon and the Sun's way
// through the local interstellar cloud (forge #148).
//
// Contract: createHeliosphere(ctx, { scene }) -> { update(camera, tMs), group, shown(), dispose() }
// Pure, for tests/test_heliosphere.mjs: HELIO, KM_PER_AU, FADE_AU, eclDir(lonDeg, latDeg), angle(a, b),
//   tsShape(psi), hpShape(psi), bowShape(psi), fits(kind), surfaceAu(kind, dir), fadeFor(camAu),
//   toScene(dir) (ecliptic axes -> the scene's), travelAu(kmS, years)
//
// MODELLED, AND SAID SO. Nothing has measured the bubble's shape. Two craft have measured two places
// on each of two of its surfaces, and IBEX has measured the direction and speed of the gas the Sun
// moves through and a band on the sky. So:
//   * THE SHAPES are published model shapes, each axisymmetric about the upwind direction (the "nose"):
//       termination shock  r = a (1 + e) / (1 + e cos psi), the Sun at one focus of a prolate ellipse
//                          with e = 0.3, so its tail is 1.9 times as far as its nose -- roughly the
//                          proportion of the global models (Izmodenov & Alexashov 2015, ApJS 220, 32;
//                          Opher et al. 2015, ApJL 800, L28);
//       heliopause         r = b / cos(psi / 2), the hydrodynamic heliopause of Parker 1961 (ApJ 134,
//                          20), drawn to psi = 120 degrees (twice the nose's distance) and faded from 85: whether the tail is long
//                          (Izmodenov) or splits into two short lobes (Opher et al. 2015, 2020) is the
//                          open question, and a long drawn tail would answer it;
//       bow wave           Wilkin 1996 (ApJL 459, L31), r = R0 csc(psi) sqrt(3 (1 - psi cot psi)), with
//                          R0 twice the heliopause's nose: IBEX's slow inflow means a bow WAVE, not a
//                          shock (McComas et al. 2012, Science 336, 1291), and its distance is not
//                          measured; this one is illustrative.
//   * THROUGH THE MEASURED POINTS. Each of the first two surfaces is then scaled so that it passes
//     exactly through the two places a Voyager crossed it (fits(), surfaceAu()): the scale at each
//     crossing is measured over model, and between them it is the inverse-square-angle mean of the
//     two (Shepard), so far from both it is their average. Voyager 2 crossed both surfaces nearer the
//     Sun than Voyager 1 did, in the south (the asymmetry the interstellar magnetic field is thought to
//     press in); the drawn bubble keeps that.
//   * THE CROSSINGS are where JPL Horizons has each craft at noon UTC on the day its instruments saw the
//     crossing (site/data/eph/deep-voyager-1.bin and -2.bin, the files the map draws them from), dates
//     from NASA (registry/missions.yaml): Voyager 1 94.0 AU (2004-12-16) and 121.6 AU (2012-08-25),
//     Voyager 2 83.7 AU (2007-08-30) and 119.0 AU (2018-11-05). Measured.
//   * THE NOSE AND THE SUN'S MOTION: the interstellar wind comes from ecliptic longitude 255.7 degrees,
//     latitude 5.1, at 25.4 km/s (IBEX, McComas et al. 2015, ApJS 220, 22) -- which is the Sun moving
//     through the local gas towards there at that speed. The arrow is 20 years of it, 107 AU. The Sun is
//     at or near the edge of the Local Interstellar Cloud itself (Redfield & Linsky 2008, ApJ 673, 283).
//   * THE IBEX RIBBON is a measured band on the SKY: centred on longitude 219.2, latitude 39.9, 74.5
//     degrees in radius (Funsten et al. 2013, ApJ 776, 30), about 20 wide (McComas et al. 2009, Science
//     326, 959). Its distance is not measured; it is drawn on a sphere RIBBON_AU from the Sun, just past
//     the heliopause's nose, where the secondary-neutral explanation puts its source.
// The legend (ui chip, below) says each of these in words.
//
// WHEN. On the Sun's stage, with the Deep space layer on (the Voyagers' own), once the camera is TRULY farther
// than about 50 AU from the Sun (FADE_AU: in from 40, whole by 60) -- with the Distance slider off the truth the
// camera's drawn distance is turned back into a true one (scene/orrery.js trueRadialKm), so a camera 46 AU out in
// a logarithmic picture is 32 AU out and the bubble stays away. The Sun's arrow is held at ARROW_PX wide on the
// screen, so it is a thin arrow on a phone and never a beam -- from nearer the bubble is all
// round the camera and says nothing. Never at boot: main.js fetches this module the first time the
// camera passes 40 AU on the Sun's stage. Additive, translucent, depth-tested and writing no depth, so
// it never hides a planet or a craft.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from '../ui/latercss.js';
import { keepClearOf } from '../ui/labels.js'; // b200-c1-culture-helio: the app's label rule
import { stage, SUN_INERTIAL } from './stage.js';

export const KM_PER_AU = 1.495978707e8;
const DEG = Math.PI / 180;
const YEAR_S = 365.25 * 86400;

export const HELIO = {
  nose: { lonDeg: 255.7, latDeg: 5.1, speedKmS: 25.4 },
  crossings: [
    { craft: 'deep-voyager-1', surface: 'ts', date: '2004-12-16', lonDeg: 253.00, latDeg: 34.71, au: 94.03 },
    { craft: 'deep-voyager-1', surface: 'hp', date: '2012-08-25', lonDeg: 254.88, latDeg: 34.95, au: 121.61 },
    { craft: 'deep-voyager-2', surface: 'ts', date: '2007-08-30', lonDeg: 288.65, latDeg: -31.61, au: 83.66 },
    { craft: 'deep-voyager-2', surface: 'hp', date: '2018-11-05', lonDeg: 290.08, latDeg: -36.50, au: 119.02 },
  ],
  ribbon: { lonDeg: 219.2, latDeg: 39.9, halfDeg: 74.5, widthDeg: 20 },
  ts: { e: 0.3 },
  hp: { tailDeg: 120, fadeFromDeg: 85 },
  bow: { noseShare: 2.0, tailDeg: 100, fadeFromDeg: 60 },
};
export const RIBBON_AU = 160;
export const ARROW_YEARS = 20;
/** The camera's distance from the Sun at which the bubble starts to show, and is whole, AU. */
export const FADE_AU = [40, 60];
/** The arrow's shaft and head, CSS pixels across on the screen, whatever the camera's distance. */
export const ARROW_PX = { shaft: 2, head: 9 };

/** A unit vector from ecliptic longitude and latitude, in ecliptic axes (x to the equinox, z north). Pure. */
export function eclDir(lonDeg, latDeg) {
  const l = lonDeg * DEG; const b = latDeg * DEG;
  return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
}
/** The angle between two unit vectors, radians. Pure. */
export function angle(a, b) {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, d)));
}
/** Ecliptic axes to the scene's (stage.js: x, z, -y), for a direction or a point. Pure. */
export function toScene(v) { return [v[0], v[2], -v[1]]; }
/** How far something at `kmS` goes in `years`, AU. Pure. */
export function travelAu(kmS, years) { return (kmS * years * YEAR_S) / KM_PER_AU; }

/** The model shapes at unit scale, psi from the nose, radians. Pure. */
export function tsShape(psi) { const e = HELIO.ts.e; return (1 + e) / (1 + e * Math.cos(psi)); }
export function hpShape(psi) { return 1 / Math.cos(psi / 2); }
export function bowShape(psi) {
  if (psi < 1e-4) return 1;
  return Math.sqrt(3 * (1 - psi / Math.tan(psi))) / Math.sin(psi);
}
const SHAPE = { ts: tsShape, hp: hpShape };
const NOSE = eclDir(HELIO.nose.lonDeg, HELIO.nose.latDeg);
// b200-c1-culture-helio: where each shell's name goes, degrees round the screen from its right, anticlockwise.
// Seen side on with the nose to the left (the rung, the trip stop): the heliopause over the top, the termination
// shock low on the tail side, the bow wave just under the nose: away from the Voyagers' four crossings, which
// all sit 35 degrees either side of the nose. A name whose direction falls where its shell is not drawn
// (SHELL_PSI_MAX) is not shown, and one that would print over another name or a panel waits (keepClearOf).
const SHELL_ANGLES = { ts: 300, hp: 90, bow: 200 };
const SHELL_PSI_MAX = { ts: 180, hp: 115, bow: 80 };
const _cam = new THREE.Vector3();
const _view = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up2 = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** For a fitted surface: each crossing's direction and its scale, measured distance over unit model. Pure. */
export function fits(kind) {
  return HELIO.crossings.filter((c) => c.surface === kind).map((c) => {
    const dir = eclDir(c.lonDeg, c.latDeg);
    return { dir, scale: c.au / SHAPE[kind](angle(dir, NOSE)), crossing: c };
  });
}
const FITS = { ts: fits('ts'), hp: fits('hp') };

/** The scale of a fitted surface in a direction: the crossings' scales, weighted by 1 / angle^2. Pure. */
function scaleAt(kind, dir) {
  let wsum = 0; let s = 0;
  for (const f of FITS[kind]) {
    const a = angle(dir, f.dir);
    if (a < 1e-6) return f.scale;
    const w = 1 / (a * a);
    wsum += w; s += w * f.scale;
  }
  return s / wsum;
}

/** A surface's distance from the Sun in a direction (ecliptic unit vector), AU. Pure. */
export function surfaceAu(kind, dir) {
  const psi = angle(dir, NOSE);
  if (kind === 'bow') {
    const hpNose = scaleAt('hp', NOSE) * hpShape(0);
    return HELIO.bow.noseShare * hpNose * bowShape(psi);
  }
  return scaleAt(kind, dir) * SHAPE[kind](psi);
}

/** How much of the bubble shows with the camera this far from the Sun, 0..1. Pure. */
export function fadeFor(camAu) {
  const [a, b] = FADE_AU;
  const u = Math.min(1, Math.max(0, (camAu - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

// --- drawing ------------------------------------------------------------------------------------------

const SHELL_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aFade;
varying float vFade;
varying vec3 vN;
varying vec3 vV;
void main() {
  vFade = aFade;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vN = normalize( normalMatrix * normal );
  vV = normalize( -mv.xyz );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;
const SHELL_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uAlpha;
uniform float uRim;
varying float vFade;
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <logdepthbuf_fragment>
  // A bubble seen through: faint face-on, bright at its edge, as a soap film is.
  float mu = abs( dot( normalize( vN ), normalize( vV ) ) );
  float a = uAlpha * vFade * ( 0.012 + uRim * pow( 1.0 - mu, 3.0 ) );
  gl_FragColor = vec4( uColour, a );
  #include <colorspace_fragment>
}
`;
const BAND_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uAlpha;
varying float vFade;
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <logdepthbuf_fragment>
  // aFade carries the place across the band, -1..1: a Gaussian profile, FWHM the band's width.
  float a = uAlpha * 0.3 * exp( -2.77 * vFade * vFade );
  gl_FragColor = vec4( uColour, a );
  #include <colorspace_fragment>
}
`;

/** A basis round a unit vector n: two unit vectors at right angles to it and to each other. */
function basis(n) {
  const up = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const e1 = [n[1] * up[2] - n[2] * up[1], n[2] * up[0] - n[0] * up[2], n[0] * up[1] - n[1] * up[0]];
  const l1 = Math.hypot(...e1); e1[0] /= l1; e1[1] /= l1; e1[2] /= l1;
  const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  return [e1, e2];
}

/** A surface round the nose, out to `tailDeg`, its vertices in scene axes and AU, aFade for its tail. */
function shellGeometry(kind, tailDeg, fadeFromDeg) {
  const rows = 56; const cols = 72;
  const [e1, e2] = basis(NOSE);
  const pos = []; const fade = []; const idx = [];
  for (let i = 0; i <= rows; i++) {
    const psi = (tailDeg * DEG * i) / rows;
    for (let j = 0; j <= cols; j++) {
      const phi = (2 * Math.PI * j) / cols;
      const s = Math.sin(psi); const c = Math.cos(psi);
      const d = [0, 1, 2].map((k) => c * NOSE[k] + s * (Math.cos(phi) * e1[k] + Math.sin(phi) * e2[k]));
      const r = surfaceAu(kind, d);
      const p = toScene([d[0] * r, d[1] * r, d[2] * r]);
      pos.push(p[0], p[1], p[2]);
      const deg = psi / DEG;
      fade.push(deg <= fadeFromDeg ? 1 : Math.max(0, 1 - (deg - fadeFromDeg) / (tailDeg - fadeFromDeg)));
      if (i > 0 && j > 0) {
        const a = (i - 1) * (cols + 1) + (j - 1); const b = a + 1; const cc = i * (cols + 1) + (j - 1); const dd = cc + 1;
        idx.push(a, cc, b, b, cc, dd);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The ribbon: a band round its centre on a sphere RIBBON_AU out, aFade the place across it. */
function ribbonGeometry() {
  const R = HELIO.ribbon;
  const c = eclDir(R.lonDeg, R.latDeg);
  const [e1, e2] = basis(c);
  const across = 9; const along = 180;
  const pos = []; const fade = []; const idx = [];
  for (let i = 0; i <= across; i++) {
    const u = -1 + (2 * i) / across; // -1..1 across the band, the full width being twice the FWHM
    const half = (R.halfDeg + u * R.widthDeg) * DEG;
    for (let j = 0; j <= along; j++) {
      const phi = (2 * Math.PI * j) / along;
      const d = [0, 1, 2].map((k) => Math.cos(half) * c[k] + Math.sin(half) * (Math.cos(phi) * e1[k] + Math.sin(phi) * e2[k]));
      const p = toScene(d.map((x) => x * RIBBON_AU));
      pos.push(p[0], p[1], p[2]);
      fade.push(u);
      if (i > 0 && j > 0) {
        const a = (i - 1) * (along + 1) + (j - 1); const b = a + 1; const cc = i * (along + 1) + (j - 1); const dd = cc + 1;
        idx.push(a, cc, b, b, cc, dd);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function shellMaterial(colour, rim, frag = SHELL_FRAG) {
  return new THREE.ShaderMaterial({
    name: 'heliosphere',
    vertexShader: SHELL_VERT,
    fragmentShader: frag,
    uniforms: { uColour: { value: new THREE.Color(colour) }, uAlpha: { value: 0 }, uRim: { value: rim } },
    transparent: true,
    depthTest: true, // scripts/check-drawn.mjs: a transparent object never paints over the worlds
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function el(doc, tag, className, text) {
  const n = doc.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

export function createHeliosphere(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const H = COPY.helio;
  loadCss('worlds', doc);
  const group = new THREE.Group();
  group.name = 'heliosphere';
  group.visible = false;
  group.renderOrder = 2;
  if (opts.scene) opts.scene.add(group);

  // Colours are a choice: the shock warm, the heliopause the blue of the interstellar side, the wave violet.
  const parts = [
    { mesh: new THREE.Mesh(shellGeometry('ts', 180, 180), shellMaterial(0xffb36b, 0.32)), name: 'termination-shock' },
    { mesh: new THREE.Mesh(shellGeometry('hp', HELIO.hp.tailDeg, HELIO.hp.fadeFromDeg), shellMaterial(0x6fb7ff, 0.45)), name: 'heliopause' },
    { mesh: new THREE.Mesh(shellGeometry('bow', HELIO.bow.tailDeg, HELIO.bow.fadeFromDeg), shellMaterial(0xb08cff, 0.2)), name: 'bow-wave' },
    { mesh: new THREE.Mesh(ribbonGeometry(), shellMaterial(0xffe2a8, 1, BAND_FRAG)), name: 'ibex-ribbon' },
  ];
  for (const p of parts) { p.mesh.name = `heliosphere-${p.name}`; p.mesh.frustumCulled = false; group.add(p.mesh); }

  // The crossings: four points, in scene axes and AU.
  const crossPts = HELIO.crossings.map((c) => toScene(eclDir(c.lonDeg, c.latDeg).map((x) => x * c.au)));
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.Float32BufferAttribute(crossPts.flat(), 3));
  const ptsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 7, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: true, depthWrite: false });
  const pts = new THREE.Points(ptsGeo, ptsMat);
  pts.name = 'heliosphere-crossings';
  pts.frustumCulled = false;
  group.add(pts);

  // The Sun's way through the local gas: 20 years of it, from the Sun towards the nose.
  const arrowAu = travelAu(HELIO.nose.speedKmS, ARROW_YEARS);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, depthTest: true, depthWrite: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, arrowAu * 0.9, 8, 1), arrowMat);
  shaft.position.y = arrowAu * 0.45;
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.4, arrowAu * 0.1, 12, 1), arrowMat);
  head.position.y = arrowAu * 0.95;
  const arrow = new THREE.Group();
  arrow.name = 'heliosphere-sun-motion';
  arrow.add(shaft, head);
  const noseScene = toScene(NOSE);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...noseScene));
  group.add(arrow);

  // --- the words: a label at each crossing and at the arrow, and one chip that opens the legend -----------
  const labels = el(doc, 'div', 'sr-helio-labels');
  labels.setAttribute('aria-hidden', 'true'); // the legend says all of it to a screen reader
  doc.body.appendChild(labels);
  const dateWords = (iso) => { const [y, m, d] = iso.split('-').map(Number); return t(H.date, { d: String(d), m: H.months[m - 1], y: String(y) }); };
  const marks = HELIO.crossings.map((c, i) => ({
    at: new THREE.Vector3(...crossPts[i]),
    node: el(doc, 'span', 'sr-helio-label', t(H.crossing, { craft: H.craft[c.craft], surface: H.surface[c.surface], au: fmt.num(c.au, 1), date: dateWords(c.date) })),
  }));
  marks.push({ at: new THREE.Vector3(...noseScene).multiplyScalar(arrowAu), node: el(doc, 'span', 'sr-helio-label is-motion', t(H.motion, { v: fmt.num(HELIO.nose.speedKmS, 1) })) });
  // Each surface named on its own shell, at its own angle ACROSS THE SCREEN (b200-c1-culture-helio, forge #148).
  // WHY ACROSS THE SCREEN. All three were named a quarter turn round the nose in the ecliptic, on one line out
  // from the Sun: seen side on (the rung, the trip stop) that line points nearly at the camera, and the three
  // names printed on top of one another. Fixed points elsewhere on the shells fall off the screen from 300 AU,
  // where the bubble overfills it. So each name is put, every frame, where its shell meets a direction in the
  // plane through the Sun square to the view, at its own angle (update(), SHELL_ANGLES): near its own edge as
  // seen, apart from the other two whichever side the camera is on.
  const shellMarks = [];
  for (const kind of ['ts', 'hp', 'bow']) {
    const m = { at: new THREE.Vector3(), kind, node: el(doc, 'span', 'sr-helio-label is-surface', H.surfaceLabel[kind]) };
    marks.push(m);
    shellMarks.push(m);
  }
  {
    const R = HELIO.ribbon;
    const c = eclDir(R.lonDeg, R.latDeg);
    const [r1] = basis(c);
    const rd = [0, 1, 2].map((k) => Math.cos(R.halfDeg * DEG) * c[k] + Math.sin(R.halfDeg * DEG) * r1[k]);
    marks.push({ at: new THREE.Vector3(...toScene(rd.map((x) => x * RIBBON_AU))), node: el(doc, 'span', 'sr-helio-label is-surface', H.surfaceLabel.ribbon) });
  }
  for (const m of marks) labels.appendChild(m.node);

  const chip = el(doc, 'button', 'sr-helio-chip sr-float', H.chip);
  chip.type = 'button';
  chip.setAttribute('aria-expanded', 'false');
  chip.title = H.chipTitle;
  const legend = el(doc, 'section', 'sr-helio-legend sr-float');
  legend.id = 'sr-helio-legend';
  legend.hidden = true;
  legend.setAttribute('aria-label', H.legendTitle);
  chip.setAttribute('aria-controls', legend.id);
  legend.appendChild(el(doc, 'h2', 'sr-micro', H.legendTitle));
  const rows = el(doc, 'ul', 'sr-helio-legend__rows');
  const v1 = HELIO.crossings;
  const words = {
    ts: t(H.rowTs, { a: fmt.num(v1[0].au, 1), b: fmt.num(v1[2].au, 1) }),
    hp: t(H.rowHp, { a: fmt.num(v1[1].au, 1), b: fmt.num(v1[3].au, 1) }),
    bow: H.rowBow,
    ribbon: t(H.rowRibbon, { au: fmt.int(RIBBON_AU) }),
    motion: t(H.rowMotion, { v: fmt.num(HELIO.nose.speedKmS, 1), au: fmt.int(Math.round(arrowAu)), years: fmt.int(ARROW_YEARS) }),
  };
  const swatch = { ts: '#ffb36b', hp: '#6fb7ff', bow: '#b08cff', ribbon: '#ffe2a8', motion: '#9fd8ff' };
  for (const key of ['ts', 'hp', 'bow', 'ribbon', 'motion']) {
    const li = el(doc, 'li', 'sr-helio-legend__row');
    const sw = el(doc, 'span', 'sr-cutaway__swatch');
    sw.style.background = swatch[key];
    sw.setAttribute('aria-hidden', 'true');
    li.append(sw, el(doc, 'span', '', words[key]));
    rows.appendChild(li);
  }
  legend.appendChild(rows);
  legend.appendChild(el(doc, 'p', 'sr-sect__note', H.sources));
  doc.body.append(chip, legend);
  chip.addEventListener('click', () => {
    legend.hidden = !legend.hidden;
    chip.setAttribute('aria-expanded', legend.hidden ? 'false' : 'true');
  });
  legend.addEventListener('keydown', (e) => { if (e.key === 'Escape') { legend.hidden = true; chip.setAttribute('aria-expanded', 'false'); chip.focus(); } });

  const _sun = new THREE.Vector3();
  const _p = new THREE.Vector3();
  let shown = false;
  let camUnits = 0;
  let blocked = [];   // the scene's own labels' boxes, read four times a second
  let blockedAt = -Infinity;

  function update(camera, tMs) {
    const layerOn = typeof ctx.isLayerOn === 'function' ? ctx.isLayerOn('deep-space') : true;
    const cls = doc.documentElement.classList;
    const quiet = cls.contains('sr-clean') || cls.contains('sr-sharing');
    let fade = 0;
    if (stage.worldId === 'sun' && layerOn && camera && stage.toSceneInto({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, _sun, tMs)) {
      const drawnKm = camera.position.distanceTo(_sun) * stage.unitKm;
      const view = ctx.orrery && typeof ctx.orrery.view === 'function' ? ctx.orrery.view() : null;
      const camKm = view && typeof view.trueKm === 'function' ? view.trueKm(drawnKm) : drawnKm;
      fade = fadeFor(camKm / KM_PER_AU);
      camUnits = camera.position.distanceTo(_sun);
    }
    shown = fade > 0.001;
    group.visible = shown;
    chip.hidden = !shown || quiet;
    if (!shown) legend.hidden = true;
    labels.hidden = !shown || quiet;
    if (!shown) return;
    group.position.copy(_sun);
    group.scale.setScalar(KM_PER_AU / stage.unitKm);
    for (const p of parts) p.mesh.material.uniforms.uAlpha.value = fade;
    ptsMat.opacity = fade;
    arrowMat.opacity = 0.85 * fade;
    // ARROW_PX on the screen: AU per CSS pixel at the camera's distance from the Sun, through the lens.
    const auPerPx = (camUnits * stage.unitKm / KM_PER_AU) * 2 * Math.tan(((camera.fov || 45) * Math.PI) / 360) / Math.max(1, win.innerHeight);
    const shaftK = (ARROW_PX.shaft * auPerPx) / 2 / 0.25; // the geometry's shaft is 0.25 AU in radius
    const headK = (ARROW_PX.head * auPerPx) / 2 / 1.4;
    shaft.scale.set(shaftK, 1, shaftK);
    head.scale.set(headK, 1, headK);
    group.updateMatrixWorld();
    // The labels. The fixed points first (the crossings, the arrow, the ribbon): each projected, hidden behind
    // the camera or off the screen, and kept by the app's own rule (ui/labels.js keepClearOf) only where it
    // prints over no other name, no planet's or body's label and no panel. The scene's labels and the panels
    // are read four times a second, not every frame, so the layout is not asked for sixty times a second.
    const w = win.innerWidth; const h = win.innerHeight;
    const now = win.performance ? win.performance.now() : Date.now();
    if (!(now - blockedAt < 250)) {
      blockedAt = now;
      blocked = [...doc.querySelectorAll('#labels .label, #sr-side, #sr-rail, #sr-time, #sr-top, .sr-card, .sr-tripsheet, .sr-trip__top, .sr-trip__toolbar')].filter((n) => !n.hidden && n.getClientRects().length > 0).map((n) => n.getBoundingClientRect()); // a fixed panel has no offsetParent
    }
    const kept = blocked.slice();
    const boxAt = (m, at) => {
      _p.copy(at).applyMatrix4(group.matrixWorld).project(camera);
      if (!(_p.z < 1 && Math.abs(_p.x) < 0.98 && Math.abs(_p.y) < 0.98)) return null;
      if (!m.w) { m.node.hidden = false; m.w = m.node.offsetWidth || 120; m.h = m.node.offsetHeight || 18; }
      const x = Math.round((_p.x * 0.5 + 0.5) * w + 8);
      const y = Math.round((-_p.y * 0.5 + 0.5) * h - 9);
      const b = { left: x, top: y, right: x + m.w, bottom: y + m.h };
      return b.right <= w && b.bottom <= h && keepClearOf([b], 4, kept)[0] ? b : null;
    };
    const place = (m, b) => {
      m.node.hidden = !b;
      if (!b) return;
      kept.push(b);
      m.node.style.transform = `translate(${b.left}px, ${b.top}px)`;
      m.node.style.opacity = String(fade);
    };
    for (const m of marks) if (!shellMarks.includes(m)) place(m, boxAt(m, m.at));
    // Then the shells' names (above): each where its shell meets a direction across the screen in the plane
    // through the Sun square to the view, its own angle first (SHELL_ANGLES) and then, 15 degrees at a time
    // either way, the first angle where its shell is drawn, the point is on the screen and the name is clear.
    _cam.copy(camera.position);
    group.worldToLocal(_cam);
    _view.copy(_cam).negate().normalize();
    _right.crossVectors(_view, camera.up).normalize();
    _up2.crossVectors(_right, _view);
    // A shell whose edge is off the screen all round (the bow wave, with the camera inside it) is tried again on
    // its far side, 50 degrees back from that plane, which the eye sees through it nearer the middle.
    for (const m of shellMarks) {
      let b = null;
      for (let k = 0; k < 48 && !b; k += 1) {
        const a = (SHELL_ANGLES[m.kind] + ((k % 24) % 2 ? 1 : -1) * Math.ceil((k % 24) / 2) * 15) * DEG;
        const back = k < 24 ? 0 : 50 * DEG;
        _dir.copy(_right).multiplyScalar(Math.cos(a) * Math.cos(back)).addScaledVector(_up2, Math.sin(a) * Math.cos(back)).addScaledVector(_view, Math.sin(back));
        const ecl = [_dir.x, -_dir.z, _dir.y]; // scene axes back to the ecliptic's (toScene inverted)
        if (angle(ecl, NOSE) / DEG > SHELL_PSI_MAX[m.kind]) continue;
        const r = surfaceAu(m.kind, ecl);
        if (!(Number.isFinite(r) && r > 0)) continue;
        m.at.copy(_dir).multiplyScalar(r);
        b = boxAt(m, m.at);
      }
      place(m, b);
    }
  }

  return {
    group,
    update,
    shown: () => shown,
    dispose() {
      for (const p of parts) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
      ptsGeo.dispose(); ptsMat.dispose(); arrowMat.dispose(); shaft.geometry.dispose(); head.geometry.dispose();
      if (group.parent) group.parent.remove(group);
      labels.remove(); chip.remove(); legend.remove();
    },
  };
}
