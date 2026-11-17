// scene/sstars.js -- the S-stars on their measured orbits round Sagittarius A* (internal #419, the deep-space review of
// 2026-11-16, idea 1). Fetched by scene/portraits.js the first time the black hole's picture is drawn for Sagittarius A*;
// never at boot (tests/test_boot_diet.mjs). The orbits are registry/sstars.yaml, mirrored to data/sstars.js.
//
//   createSStars(THREE, { data, record, toScene(km, out), dirToScene(vec3Array, out), unitKm() })
//     -> { group, update({ camera, tMs, viewH, opacity }) -> share, stats(), dispose() }
// Pure, for tests/test_sstars.mjs: AU_KM, FRAME_ARCSEC, yearOf, orbitAt, orbitRing, auOf, skyFrame, toGroup, shareFor, LABEL_PX.
//
// WHAT IS MEASURED. Every orbit: its size on the sky (a, arcseconds), shape (e), tilt (i), the two turns (Omega, omega),
// the date of its closest pass (t_peri) and its period: Gillessen et al. 2017 (ApJ 837, 30, Table 3, 39 stars with a bound
// orbit), S2 from GRAVITY Collaboration 2021 (arXiv:2101.12098, Table 2). Their size in AU is a times the distance, R0 =
// 8 274.9 pc (the same paper): an arcsecond is one AU at one parsec. WHERE EACH STAR IS comes from the Kepler solver of
// propagate/kepler.js, in the clock's date, from the paper's period and pericentre date.
// WHAT IS ILLUSTRATIVE. The stars' sizes and colours (a star is a soft point), the lines' brightness, and the mark at the
// centre, which stands for a hole 0.08 AU across (its shadow is 5 millionths of an arcsecond).
// TRUE SIZE, NEVER MAGNIFIED. S2's orbit is 0.24 arcseconds across, 2 000 AU: it is seen only from within a light-year of the
// hole. The hole's own picture (scene/blackhole.js) is drawn far larger than life, so as the orbits come into view it gives
// way (`share` below, which scene/portraits.js takes off the picture's share): the hole shrinks to its mark, the stars stay.
// HOW IT IS DRAWN. Three draw calls, additive: every orbit's line (one call), every star and the mark (one call, a soft
// disc each), and the labels S2, S55 and S175 (one call, one quad each from one small canvas atlas).
import { solveKeplerElliptic } from '../propagate/kepler.js';

export const AU_KM = 149597870.7;
export const FRAME_ARCSEC = 0.6;      // the field the fade-in measures: the orbits of the table's inner stars
export const RING_SEGMENTS = 96;
export const FADE_PX = [24, 90];      // the field's radius in CSS px where the orbits begin to show, and where they are whole
export const LABEL_PX = { w: 44, h: 22, dx: 10, dy: 8 }; // a label's quad in CSS px, and how far from its star
const D2R = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const UNIT_AU = 1000;                 // the group's unit: a thousand AU, so that its numbers stay small
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The calendar year of a clock time, with its fraction (a year of 365.2425 days from 2000-01-01). Pure. */
export const yearOf = (tMs) => 2000 + (tMs - Date.UTC(2000, 0, 1)) / (365.2425 * 86400e3);

/** An orbit's size in AU: its angle (arcseconds) times the distance (parsecs). Pure. */
export const auOf = (arcsec, r0Pc) => arcsec * r0Pc;

/**
 * Where a star is on the sky plane at a calendar year, in AU: { north, east, away, r, nu }, `away` positive on the side of the
 * hole moving from us (the sense the radial velocity is positive). The standard visual-orbit rotation of Omega (the position
 * angle of the ascending node, from north through east), i and omega; M from the period and pericentre date, E from
 * propagate/kepler.js's solver. Pure.
 */
export function orbitAt(s, year, r0Pc) {
  const e = Number(s.e);
  const M = TWO_PI * ((year - s.tp) / s.p);
  const E = solveKeplerElliptic(M, e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const a = auOf(s.a, r0Pc);
  const r = a * (1 - e * Math.cos(E));
  const O = s.om * D2R, w = s.w * D2R, ci = Math.cos(s.i * D2R), si = Math.sin(s.i * D2R);
  const u = w + nu;
  const north = r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * ci * Math.sin(u));
  const east = r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * ci * Math.sin(u));
  const away = r * si * Math.sin(u);
  return { north, east, away, r, nu };
}

/** The whole ellipse as a ring of points (AU, the same axes as orbitAt), by equal steps of the eccentric anomaly. Pure. */
export function orbitRing(s, r0Pc, n = RING_SEGMENTS) {
  const out = [];
  const a = auOf(s.a, r0Pc), e = Number(s.e);
  const O = s.om * D2R, w = s.w * D2R, ci = Math.cos(s.i * D2R), si = Math.sin(s.i * D2R);
  for (let k = 0; k < n; k++) {
    const E = (k / n) * TWO_PI;
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E)), u = w + nu;
    out.push([
      r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * ci * Math.sin(u)),
      r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * ci * Math.sin(u)),
      r * si * Math.sin(u),
    ]);
  }
  return out;
}

/** The group's axes in the sky frame (x west, y north, z toward the Sun): a point of the orbit, from (north, east, away). Pure. */
export const toGroup = (p) => [-p.east, p.north, -p.away];

/** The sky frame at a place, in sun-inertial (ecliptic J2000): west, north and toward the Sun, each a unit vector. Pure. */
export function skyFrame(posKm) {
  const OBL = 23.4392911 * D2R;
  const pole = [0, Math.sin(OBL), Math.cos(OBL)];
  const l = Math.hypot(posKm.x, posKm.y, posKm.z) || 1;
  const u = [posKm.x / l, posKm.y / l, posKm.z / l];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nm = (v) => { const k = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / k, v[1] / k, v[2] / k]; };
  const east = nm(cr(pole, u));
  const north = cr(u, east);
  return { west: [-east[0], -east[1], -east[2]], north, toward: [-u[0], -u[1], -u[2]] };
}

/** How much of the orbits shows: from the field's true radius on the screen (CSS px). 0 below 24 px, 1 from 90 px. Pure. */
export const shareFor = (fieldPx) => smooth(FADE_PX[0], FADE_PX[1], fieldPx);

const LINE_VERT = /* glsl */`
attribute vec2 aLook;      // x: the line's light, y: unused
uniform float uShare;
varying float vA;
void main() {
  vA = aLook.x * uShare;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
const LINE_FRAG = /* glsl */`
uniform vec3 uColour;
varying float vA;
void main() { gl_FragColor = vec4( uColour * vA, 1.0 ); }`;
const POINT_VERT = /* glsl */`
attribute vec3 aColour;
attribute float aSize;     // CSS px
uniform float uShare;
uniform float uPixelRatio;
varying vec3 vC;
void main() {
  vC = aColour * uShare;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = aSize * uPixelRatio;
}`;
const POINT_FRAG = /* glsl */`
varying vec3 vC;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( q, q );
  if ( r2 > 1.0 ) discard;
  gl_FragColor = vec4( vC * exp( -3.0 * r2 ) * ( 1.0 - r2 ) * 1.6, 1.0 );
}`;
const LABEL_VERT = /* glsl */`
attribute vec2 aCorner;    // 0..1 across the quad
attribute vec4 aCell;      // the label's rectangle in the atlas: u0, v0, du, dv
uniform vec2 uViewport;    // CSS px
uniform vec2 uBox;         // the quad's size, CSS px
uniform vec2 uOffset;      // from the star, CSS px
uniform float uShare;
varying vec2 vUv;
varying float vS;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vec2 px = uOffset + aCorner * uBox;
  clip.xy += px / uViewport * 2.0 * clip.w;
  gl_Position = clip;
  vUv = aCell.xy + vec2( aCorner.x, 1.0 - aCorner.y ) * aCell.zw; // the canvas's first row is its top
  vS = uShare;
}`;
const LABEL_FRAG = /* glsl */`
uniform sampler2D uMap;
varying vec2 vUv;
varying float vS;
void main() {
  vec4 t = texture2D( uMap, vUv );
  gl_FragColor = vec4( t.rgb * t.a * vS, 1.0 );
}`;
/** The shader sources, for tests/test_sstars.mjs. */
export const SHADERS = { lineVert: LINE_VERT, lineFrag: LINE_FRAG, pointVert: POINT_VERT, pointFrag: POINT_FRAG, labelVert: LABEL_VERT, labelFrag: LABEL_FRAG };
export const DRAW_CALLS = 3;

// the stars' look: illustrative. S2, and the labelled stars, are the brighter
const STAR = { colour: [0.72, 0.84, 1.0], hot: [1.0, 0.88, 0.62], px: 3.2, hotPx: 6.0, mark: [1.0, 0.97, 0.9], markPx: 5.0 };
const LINE = { colour: [0.42, 0.58, 0.95], light: 0.34, hotLight: 0.85 };

export function createSStars(THREE, env = {}) {
  const data = env.data || { r0Pc: 8274.9, stars: [], labelled: [] };
  const r0 = Number(data.r0Pc) || 8274.9;
  const stars = data.stars || [];
  const hot = new Set(data.labelled || []);
  const group = new THREE.Group();
  group.name = 'sstars';
  group.visible = false;
  group.frustumCulled = false;

  // every orbit as one line list
  const nSeg = RING_SEGMENTS;
  const lp = new Float32Array(stars.length * nSeg * 2 * 3), ll = new Float32Array(stars.length * nSeg * 2 * 2);
  stars.forEach((s, k) => {
    const ring = orbitRing(s, r0, nSeg).map((p) => toGroup({ north: p[0], east: p[1], away: p[2] }).map((x) => x / UNIT_AU));
    const light = hot.has(s.id) ? LINE.hotLight : LINE.light;
    for (let j = 0; j < nSeg; j++) {
      const a = ring[j], b = ring[(j + 1) % nSeg], at = (k * nSeg + j) * 2;
      lp.set(a, at * 3); lp.set(b, at * 3 + 3);
      ll[at * 2] = light; ll[at * 2 + 2] = light;
    }
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aLook', new THREE.BufferAttribute(ll, 2));
  const addLike = { transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending };
  const lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, uniforms: { uShare: { value: 0 }, uColour: { value: new THREE.Vector3(...LINE.colour) } }, ...addLike });
  lineMat.name = 'sstars-orbits';
  const lines = new THREE.LineSegments(lg, lineMat);
  lines.name = 'sstars-orbits';
  lines.frustumCulled = false;
  lines.renderOrder = -1;
  group.add(lines);

  // the stars: point 0 is the centre's mark, then one a star
  const n = stars.length + 1;
  const pp = new Float32Array(n * 3), pc = new Float32Array(n * 3), ps = new Float32Array(n);
  pc.set(STAR.mark, 0); ps[0] = STAR.markPx;
  stars.forEach((s, k) => { pc.set(hot.has(s.id) ? STAR.hot : STAR.colour, (k + 1) * 3); ps[k + 1] = hot.has(s.id) ? STAR.hotPx : STAR.px; });
  const pg = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pp, 3);
  posAttr.setUsage && posAttr.setUsage(THREE.DynamicDrawUsage);
  pg.setAttribute('position', posAttr);
  pg.setAttribute('aColour', new THREE.BufferAttribute(pc, 3));
  pg.setAttribute('aSize', new THREE.BufferAttribute(ps, 1));
  const pointMat = new THREE.ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uShare: { value: 0 }, uPixelRatio: { value: 1 } }, ...addLike });
  pointMat.name = 'sstars-stars';
  const points = new THREE.Points(pg, pointMat);
  points.name = 'sstars-stars';
  points.frustumCulled = false;
  points.renderOrder = -1;
  group.add(points);

  // the labels: a canvas atlas, one row a label; none where there is no canvas (a test)
  const names = stars.filter((s) => hot.has(s.id)).map((s) => s.id);
  let labels = null, labelMat = null, labelPos = null, labelTex = null;
  if (typeof document !== 'undefined' && names.length) {
    const cv = document.createElement('canvas');
    const rowPx = 32;
    cv.width = 128; cv.height = rowPx * names.length;
    const cx = cv.getContext('2d');
    if (cx) {
      let ink = '';
      try { ink = getComputedStyle(document.documentElement).getPropertyValue('--sr-text').trim(); } catch (e) { ink = ''; }
      cx.fillStyle = ink || 'white';
      cx.font = '600 22px system-ui, sans-serif';
      cx.textBaseline = 'middle';
      names.forEach((nm, k) => cx.fillText(nm, 4, rowPx * (k + 0.5)));
      labelTex = new THREE.CanvasTexture(cv);
      labelTex.flipY = false;
      const lgeo = new THREE.BufferGeometry();
      labelPos = new Float32Array(names.length * 4 * 3);
      const corner = new Float32Array(names.length * 4 * 2), cell = new Float32Array(names.length * 4 * 4), idx = [];
      const cs = [[0, 0], [1, 0], [1, 1], [0, 1]];
      names.forEach((nm, k) => {
        cs.forEach((c, j) => {
          corner.set([c[0], 1 - c[1]], (k * 4 + j) * 2); // y up
          cell.set([0, k / names.length, 1, 1 / names.length], (k * 4 + j) * 4);
        });
        idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
      });
      const lpos = new THREE.BufferAttribute(labelPos, 3);
      lpos.setUsage && lpos.setUsage(THREE.DynamicDrawUsage);
      lgeo.setAttribute('position', lpos);
      lgeo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
      lgeo.setAttribute('aCell', new THREE.BufferAttribute(cell, 4));
      lgeo.setIndex(idx);
      labelMat = new THREE.ShaderMaterial({
        vertexShader: LABEL_VERT, fragmentShader: LABEL_FRAG,
        uniforms: { uMap: { value: labelTex }, uViewport: { value: new THREE.Vector2(1000, 1000) }, uBox: { value: new THREE.Vector2(LABEL_PX.w, LABEL_PX.h) }, uOffset: { value: new THREE.Vector2(LABEL_PX.dx, LABEL_PX.dy) }, uShare: { value: 0 } },
        ...addLike, side: THREE.DoubleSide,
      });
      labelMat.name = 'sstars-labels';
      labels = new THREE.Mesh(lgeo, labelMat);
      labels.name = 'sstars-labels';
      labels.frustumCulled = false;
      labels.renderOrder = -1;
      group.add(labels);
    }
  }

  const _c = new THREE.Vector3(), _cam = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  let last = { share: 0, fieldPx: 0, year: NaN };

  function orient() {
    const rec = env.record;
    if (!rec || !rec.pos) return false;
    const f = skyFrame(rec.pos);
    if (!env.dirToScene) return false;
    env.dirToScene(f.west, _x); env.dirToScene(f.north, _y);
    _x.normalize(); _y.normalize();
    _z.crossVectors(_x, _y).normalize();
    _y.crossVectors(_z, _x).normalize();
    _m.makeBasis(_x, _y, _z);
    group.quaternion.setFromRotationMatrix(_m);
    return true;
  }

  return {
    group,
    /** One frame: place the field, turn it to the sky, set each star at the clock's date. Returns its share (0 to 1). */
    update({ camera, tMs, viewH = 1000, viewW = 1000, opacity = 1 } = {}) {
      const rec = env.record;
      if (!camera || !rec || !rec.pos || !env.toScene || !env.toScene(rec.pos, _c)) { group.visible = false; last.share = 0; return 0; }
      const unitKm = env.unitKm();
      _cam.setFromMatrixPosition(camera.matrixWorld);
      const dist = _cam.distanceTo(_c);
      const fov = (camera.fov || 45) * D2R / (camera.zoom || 1);
      const fieldUnits = (auOf(FRAME_ARCSEC, r0) * AU_KM) / unitKm;
      const fieldPx = (Math.atan(fieldUnits / Math.max(dist, 1e-30)) / (fov / 2)) * (viewH / 2);
      const share = shareFor(fieldPx) * Math.min(1, Math.max(0, opacity));
      last = { share, fieldPx, year: yearOf(tMs) };
      group.visible = share > 0.002;
      if (!group.visible) return share;
      group.position.copy(_c);
      group.scale.setScalar((UNIT_AU * AU_KM) / unitKm);
      orient();
      group.updateMatrixWorld(true);
      const year = last.year;
      stars.forEach((s, k) => {
        const p = toGroup(orbitAt(s, year, r0));
        pp[(k + 1) * 3] = p[0] / UNIT_AU; pp[(k + 1) * 3 + 1] = p[1] / UNIT_AU; pp[(k + 1) * 3 + 2] = p[2] / UNIT_AU;
        const at = names.indexOf(s.id);
        if (at >= 0 && labelPos) for (let j = 0; j < 4; j++) { labelPos[(at * 4 + j) * 3] = pp[(k + 1) * 3]; labelPos[(at * 4 + j) * 3 + 1] = pp[(k + 1) * 3 + 1]; labelPos[(at * 4 + j) * 3 + 2] = pp[(k + 1) * 3 + 2]; }
      });
      posAttr.needsUpdate = true;
      if (labels) labels.geometry.attributes.position.needsUpdate = true;
      lineMat.uniforms.uShare.value = share;
      pointMat.uniforms.uShare.value = share;
      pointMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      if (labelMat) { labelMat.uniforms.uShare.value = share; labelMat.uniforms.uViewport.value.set(viewW, viewH); }
      return share;
    },
    /** The orbits' share by the field's size alone (without the picture's fade): what the hole's picture gives way by. */
    fieldShare: () => shareFor(last.fieldPx),
    stats: () => ({ stars: stars.length, orbits: stars.length, labels: names.length, drawCalls: DRAW_CALLS, share: Math.round(last.share * 1000) / 1000, fieldPx: Math.round(last.fieldPx * 10) / 10, year: Math.round(last.year * 100) / 100 }),
    dispose() {
      lg.dispose(); lineMat.dispose(); pg.dispose(); pointMat.dispose();
      if (labels) { labels.geometry.dispose(); labelMat.dispose(); if (labelTex) labelTex.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
