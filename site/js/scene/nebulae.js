// scene/nebulae.js -- THE PHOTOGRAPH, ONLY WHEN ASKED FOR: "Compare with the photograph" (internal i#776) and the
// sky maths every deep-sky hero shares (spec 0067 tasks 1-3; release 1.4.0 stage r14-neb-b).
//
// Contract: createNebulae(scene, opts) -> { setExposure(look), setRecords(records), rebuild(), update(camera, renderer,
//   layerOn), want(id), setCompare(id, k), clearCompare(), compareK(id), compareShare(id), lineShare(id), lineFor(id),
//   drawn(id), holes(), has(id), busy(), loaded(), state(), dispose(), group }
// Pure, for the tests and the heroes: pictureBasis(row), pictureCorners(row), skyToPicture(row, ra, dec),
//   pictureHalfExtent(row), eqToEcl(v), eclToEq(v), viewFade(cos), nearFade(distOverWidth), PICTURE_FOR,
//   ellipseInPicture(row, raDeg, decDeg, majArcmin, minArcmin, paDeg)
//
// NO PHOTOGRAPHS IN THE SCENE (Ivan, 2026-10-26, for release 1.4.0: "remove all photos of clouds and galaxies and
// replace them with realistic 3ds ... no photos only realistic 3ds"). Until 1.4.0 this file laid 30 licensed
// photographs (registry/nebulae.yaml) on the sky of every world and stood them at their objects' places on the
// ladder, drawn whole along our line of sight. That layer is gone: a deep-sky object is drawn by its 3D hero
// (scene/deep/heroes.js) or, until it has one, by its soft glow (scene/dsoglow.js) and its holder. Nothing here is
// drawn, and no picture is fetched, unless a visitor drags the card's slider (ui/photocompare.js) toward
// "Photograph": then THAT ONE photograph is fetched and drawn at its place, flat and facing the Sun, by the share
// the slider gives it, and the hero gives way by the same share. Choosing anything else puts the slider back to the
// model, and the picture's memory is given back.
//
// The registry stays: it is the slider's photograph, with its credit and how its colours were made, and its rows'
// measured centres and north angles are what the heroes built from those photographs place their light maps by
// (scene/deep/helix.js, ring.js, lmc.js, smc.js, orion.js).
//
// THE BLEND. Additive, in the opaque list, depth test off -- the same three choices as the stars, for the reason
// scene/starfield.js spells out at the Milky Way. The edge is feathered after the exposure's stretch.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { NEBULAE } from '../data/nebulae.js';

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R; // J2000 mean obliquity, as scene/galaxy.js
const SUN_INERTIAL = 'sun-inertial';
const RENDER_ORDER_PLACE = -1;   // with the deep-sky glows


/** record id -> registry row: `dso-m42` -> the M42 picture. */
export const PICTURE_FOR = new Map(NEBULAE.map((row) => [`dso-${row.id}`, row]));

// ------------------------------------------------------------------------------------ the maths

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const comb = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Equatorial J2000 -> ecliptic J2000 (the axes of `sun-inertial`). Pure. */
export function eqToEcl(v) {
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  return [v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c];
}

/** Ecliptic J2000 -> equatorial J2000, eqToEcl's inverse. Pure. */
export function eclToEq(v) {
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/**
 * Where a picture points and which way it is turned, as three unit vectors in equatorial J2000:
 * `centre` toward the middle of the picture, `right` and `up` along the picture's own axes as a
 * viewer sees it.
 *
 * `north_deg` is the archives' own number (AVM Spatial.Rotation): how far celestial north is turned
 * to the LEFT of the picture's up. The sky is seen from inside, so with north up east is to the
 * LEFT, and north turned left is north turned toward east:
 *     up    =  cos(r) north - sin(r) east
 *     right = -sin(r) north - cos(r) east
 * At r = 0 that is up = north, right = west. The sign was not taken on trust: every picture was
 * laid over a 2MASS cut-out of the same field with this convention, its mirror image and the
 * opposite sign, and only this one correlates (scripts/build_nebulae.py --solve prints the three).
 */
export function pictureBasis(row) {
  const a = row.ra_deg * D2R, d = row.dec_deg * D2R, r = (row.north_deg || 0) * D2R;
  const centre = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  return {
    centre,
    up: comb(north, Math.cos(r), east, -Math.sin(r)),
    right: comb(north, -Math.sin(r), east, -Math.cos(r)),
  };
}

/** Half the picture's width and height on the tangent plane at unit distance: tan(angle / 2). */
export function pictureHalfExtent(row) {
  return {
    x: Math.tan((row.width_arcmin / 60) * D2R / 2),
    y: Math.tan((row.height_arcmin / 60) * D2R / 2),
  };
}

/** The four corners as unit directions, in the order (-,-) (+,-) (+,+) (-,+) of (right, up). */
export function pictureCorners(row) {
  const { centre, right, up } = pictureBasis(row);
  const h = pictureHalfExtent(row);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
    unit(comb(comb(centre, 1, right, sx * h.x), 1, up, sy * h.y)));
}

/**
 * A sky position in the picture's own coordinates: u from 0 (left) to 1 (right), v from 0 (bottom)
 * to 1 (top). Outside 0..1 the position is off the picture; null when it is behind the plane.
 */
export function skyToPicture(row, raDeg, decDeg) {
  const { centre, right, up } = pictureBasis(row);
  const a = raDeg * D2R, d = decDeg * D2R;
  const p = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const along = dot(p, centre);
  if (!(along > 1e-6)) return null;
  const h = pictureHalfExtent(row);
  return { u: 0.5 + dot(p, right) / along / h.x / 2, v: 0.5 + dot(p, up) / along / h.y / 2 };
}

/**
 * A galaxy's own ellipse in the picture's coordinates (internal spec 0075 task 36): the catalogue's
 * centre, major and minor axes and position angle (east of north), as a centre {u, v} and two rows
 * {x, y} that take a picture offset (du, dv) to (along / semi-major, across / semi-minor), so the
 * shader's length() of that is 1 on the ellipse. Null for a record without the three numbers. Pure.
 */
export function ellipseInPicture(row, raDeg, decDeg, majArcmin, minArcmin, paDeg) {
  if (!(majArcmin > 0) || !(minArcmin > 0) || !Number.isFinite(paDeg) || !Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return null;
  const c = skyToPicture(row, raDeg, decDeg);
  if (!c) return null;
  const { right, up } = pictureBasis(row);
  const a = raDeg * D2R, d = decDeg * D2R, pa = paDeg * D2R;
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const maj = comb(north, Math.cos(pa), east, Math.sin(pa));
  const min = comb(north, -Math.sin(pa), east, Math.cos(pa));
  // uv per arcminute along each axis: [[maj.right/W, min.right/W], [maj.up/H, min.up/H]] times arcmin
  const W = row.width_arcmin, H = row.height_arcmin;
  const m00 = dot(maj, right) / W, m01 = dot(min, right) / W, m10 = dot(maj, up) / H, m11 = dot(min, up) / H;
  const det = m00 * m11 - m01 * m10;
  if (!(Math.abs(det) > 1e-12)) return null;
  const sa = majArcmin / 2, sb = minArcmin / 2;
  // inverse: arcmin = inv * duv; then divided by the semi-axes
  return { u: c.u, v: c.v, x: [m11 / det / sa, -m01 / det / sa], y: [-m10 / det / sb, m00 / det / sb] };
}

const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * How much of a picture is drawn from where the camera is: `cos` is the cosine of the angle, at
 * the object, between the line to the camera and the line to the Sun. Whole inside 25 degrees of
 * the line of sight it was taken along, gone by 50.
 */
export function viewFade(cos) {
  return smooth(cos, Math.cos(50 * D2R), Math.cos(25 * D2R));
}

/** Gone before the camera is inside it: the camera's distance over the picture's width. */
export function nearFade(distOverWidth) {
  return smooth(distOverWidth, 0.2, 0.5);
}

// ---------------------------------------------------------------------------------- the shaders

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  // Andromeda is 2.5 million units away on the stellar rung and the far plane is not: the depth
  // test is off, so the depth is free to be anything inside the clip volume. Zero is.
  gl_Position.z = 0.0;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAlpha;
uniform float uGain;
uniform float uGamma;
uniform float uSaturation;
uniform float uFloor;     // the sky level the bake left (registry/nebulae.yaml sky_floor)
uniform float uEll;       // 1: fade along the galaxy's own ellipse (spec 0075 task 36)
uniform vec2 uEllC;
uniform vec2 uEllX;
uniform vec2 uEllY;
varying vec2 vUv;
void main() {
  if ( uAlpha <= 0.0 ) discard;
  // The picture's own display values, stretched: no colour-space round trip, because the stretch
  // is a darkroom's and is defined on what the photograph looks like.
  vec3 t = texture2D( map, vUv ).rgb;
  t = max( t - uFloor, 0.0 ) / ( 1.0 - uFloor );
  vec3 c = pow( t, vec3( uGamma ) ) * uGain;
  // The night eye sees no colour: a cool grey, as the rods report it.
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uSaturation );
  // The feather: a superellipse between a circle and the frame, faded over the outer half, so no
  // edge and no corner is ever a line. (Exponent 4 read as a rounded square at 100 px.)
  vec2 q = abs( vUv * 2.0 - 1.0 );
  float f;
  if ( uEll > 0.5 ) {
    // A galaxy fades along its own ellipse as well as at the frame: where the ellipse is inside the
    // frame the shape left is the galaxy's, not a rounded square (the LMC, scene 06 of the deepspace probe).
    vec2 d = vUv - uEllC;
    float r = length( vec2( dot( uEllX, d ), dot( uEllY, d ) ) );
    // The frame is still feathered over its outer half (the LMC's picture is centred 1.94 degrees off
    // the galaxy and cuts its bar: a narrow feather there read as a hard edge, deepspace look 2026-10-14).
    float frame = pow( pow( q.x, 4.0 ) + pow( q.y, 4.0 ), 1.0 / 4.0 );
    f = ( 1.0 - smoothstep( 0.5, 1.0, r ) ) * ( 1.0 - smoothstep( 0.55, 0.98, frame ) );
  } else {
    float e = pow( pow( q.x, 3.0 ) + pow( q.y, 3.0 ), 1.0 / 3.0 );
    f = 1.0 - smoothstep( 0.5, 0.98, e );
  }
  gl_FragColor = vec4( c * ( f * f * uAlpha ), 1.0 );
}
`;

// ------------------------------------------------------------------------------------ the layer

/**
 * @param {THREE.Scene} scene
 * @param {{ rows?: object[], base?: string|URL, load?: (url: string) => Promise<THREE.Texture>,
 *           onPicture?: (id: string) => void, look?: object }} [opts]
 */
export function createNebulae(scene, opts = {}) {
  const rows = opts.rows || NEBULAE;
  const base = opts.base || new URL('../../', import.meta.url);
  const loader = opts.load || ((url) => new THREE.TextureLoader().loadAsync(url));
  const group = new THREE.Group();
  group.name = 'nebulae-compare';
  group.renderOrder = RENDER_ORDER_PLACE;
  if (scene) scene.add(group);

  // One set of exposure uniforms: a mode change is three writes.
  const shared = { uGain: { value: 1 }, uGamma: { value: 1 }, uSaturation: { value: 1 } };
  const geometry = new THREE.PlaneGeometry(2, 2);
  // The slider (0077 W2-d, internal i#776): one picture at a time, k = 0 the reconstruction alone, 1 the photograph alone.
  let cmp = { id: null, k: 0 };
  const sunScene = new THREE.Vector3();
  const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _n = new THREE.Vector3();
  const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sphere = new THREE.Sphere();

  const pictures = rows.map((row) => ({
    row, basis: pictureBasis(row), half: pictureHalfExtent(row), mesh: null, distKm: null, ellipse: null,
    placed: false, centre: new THREE.Vector3(), matrix: new THREE.Matrix4(), widthUnits: 0, tex: null, state: 'idle',
    px: 0, inView: false, fade: 0, cmpAlpha: 0,
  }));
  const byId = new Map(pictures.map((p) => [p.row.id, p]));
  const ofRecord = (recordId) => (typeof recordId === 'string' && recordId.startsWith('dso-') ? byId.get(recordId.slice(4)) || null : null);

  function meshFor(p) {
    if (p.mesh) return p.mesh;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        map: { value: null }, uAlpha: { value: 0 }, ...shared,
        uFloor: { value: Math.min(0.5, Math.max(0, Number(p.row.sky_floor) || 0)) },
        uEll: { value: 0 }, uEllC: { value: new THREE.Vector2() }, uEllX: { value: new THREE.Vector2() }, uEllY: { value: new THREE.Vector2() },
      },
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      toneMapped: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geometry, mat);
    m.name = `nebula-compare-${p.row.id}`;
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    m.renderOrder = RENDER_ORDER_PLACE;
    m.visible = false;
    group.add(m);
    p.mesh = m;
    applyEllipse(p);
    if (p.placed) { m.matrix.copy(p.matrix); m.matrixWorldNeedsUpdate = true; }
    return m;
  }

  function applyEllipse(p) {
    if (!p.mesh) return;
    const u = p.mesh.material.uniforms, ell = p.ellipse;
    u.uEll.value = ell ? 1 : 0;
    if (ell) { u.uEllC.value.set(ell.u, ell.v); u.uEllX.value.set(ell.x[0], ell.x[1]); u.uEllY.value.set(ell.y[0], ell.y[1]); }
  }

  /** Fetch the one picture the slider asks for. Called from setCompare only: nothing else fetches a photograph. */
  function fetchPicture(p) {
    if (p.state !== 'idle') return;
    p.state = 'loading';
    const url = String(new URL(String(p.row.file).replace(/^site\//, ''), base));
    // The loader is called NOW (a test counts the calls), and may throw (TextureLoader touches `document`).
    let asked;
    try { asked = Promise.resolve(loader(url)); } catch (err) { asked = Promise.reject(err); }
    asked.then((tex) => {
      if (p.state !== 'loading') { tex.dispose(); return; } // let go of while it was on its way
      // Display values in, display values out (FRAG): no sRGB decode on the way.
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      p.tex = tex;
      meshFor(p).material.uniforms.map.value = tex;
      p.state = 'ready';
      if (typeof opts.onPicture === 'function') opts.onPicture(`dso-${p.row.id}`);
    }).catch((err) => {
      // A picture that will not load leaves the model: the slider then moves nothing.
      p.state = 'failed';
      console.warn('nebulae:', p.row.id, err && err.message ? err.message : err);
    });
  }

  /** Give a picture's memory back (the slider was put back, or moved to another object). */
  function release(p) {
    if (!p) return;
    if (p.tex) p.tex.dispose();
    p.tex = null;
    if (p.mesh) { p.mesh.material.uniforms.map.value = null; p.mesh.material.uniforms.uAlpha.value = 0; p.mesh.visible = false; }
    if (p.state === 'ready' || p.state === 'loading') p.state = 'idle';
    p.cmpAlpha = 0;
  }

  /** The deep-sky records, for the distances: |pos| of `dso-<id>` (km, sun-inertial). */
  function setRecords(records) {
    for (const r of records || []) {
      const p = r && ofRecord(r.id);
      if (!p || !r.pos) continue;
      const d = Math.hypot(r.pos.x, r.pos.y, r.pos.z);
      p.distKm = d > 0 ? d : null;
      // The galaxy's own ellipse, for the feather (spec 0075 task 36): its direction from its position.
      const md = r.meta || {};
      if (md.kind === 'galaxy' && d > 0) {
        const e = eclToEq([r.pos.x / d, r.pos.y / d, r.pos.z / d]);
        p.ellipse = ellipseInPicture(p.row, (Math.atan2(e[1], e[0]) / D2R + 360) % 360, Math.asin(Math.max(-1, Math.min(1, e[2]))) / D2R, md.majAxArcmin, md.minAxArcmin, md.posAngDeg);
        applyEllipse(p);
      }
    }
    rebuild();
  }

  /** Stand each picture at its object's distance, on the stage as it is now (the slider's place and its line). */
  function rebuild() {
    const ladder = isLadderStage(stage.worldId);
    group.visible = ladder;
    if (!ladder) { for (const p of pictures) { p.placed = false; if (p.mesh) p.mesh.visible = false; } return; }
    stage.toSceneInto({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, sunScene, stage.tMs);
    for (const p of pictures) {
      p.placed = false;
      if (!(p.distKm > 0)) continue;
      // Three points, converted like everything else on the stage, and the picture's axes are their differences.
      const at = (dir, k) => { const e = eqToEcl(dir); return { x: e[0] * k, y: e[1] * k, z: e[2] * k }; };
      const c = p.basis.centre, d = p.distKm;
      const pr = comb(c, 1, p.basis.right, p.half.x), pu = comb(c, 1, p.basis.up, p.half.y);
      if (!stage.toSceneInto(at(c, d), SUN_INERTIAL, _v, stage.tMs)) continue;
      if (!stage.toSceneInto(at(pr, d), SUN_INERTIAL, _r, stage.tMs)) continue;
      if (!stage.toSceneInto(at(pu, d), SUN_INERTIAL, _u, stage.tMs)) continue;
      p.centre.copy(_v);
      _r.sub(_v); _u.sub(_v);
      p.widthUnits = 2 * _r.length();
      _n.crossVectors(_r, _u).normalize();
      p.matrix.makeBasis(_r, _u, _n).setPosition(_v);
      if (p.mesh) { p.mesh.matrix.copy(p.matrix); p.mesh.matrixWorldNeedsUpdate = true; }
      p.placed = true;
    }
  }

  function setExposure(look) {
    if (!look) return;
    shared.uGain.value = Number(look.nebulaGain);
    shared.uGamma.value = Number(look.nebulaGamma);
    shared.uSaturation.value = Number(look.nebulaSaturation);
  }

  // The photograph on screen this frame, as a hole our stars step aside for (scene/starholes.js): the view-space
  // direction of its centre, the radius of the circle inside its rectangle, how strongly it is drawn.
  const holeList = [];
  let camLast = null; // the camera's position at the last update(), for lineShare()

  /** Per frame. `layerOn` is whether the deep-sky layer draws on this stage (main.js isLayerDrawable). */
  function update(camera, renderer, layerOn = true) {
    if (!camera || !camera.isCamera) return;
    camLast = camera.position;
    holeList.length = 0;
    const p = cmp.id ? byId.get(cmp.id) : null;
    for (const q of pictures) { q.px = 0; q.inView = false; q.fade = 0; q.cmpAlpha = 0; if (q.mesh && q !== p) { q.mesh.visible = false; q.mesh.material.uniforms.uAlpha.value = 0; } }
    if (!p || layerOn === false || !isLadderStage(stage.worldId) || !p.placed) { if (p && p.mesh) { p.mesh.visible = false; p.mesh.material.uniforms.uAlpha.value = 0; } return; }
    const viewH = renderer && renderer.domElement ? (renderer.domElement.clientHeight || 800) : 800;
    const pxPerRad = camera.projectionMatrix.elements[5] * 0.5 * viewH;
    _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pv);
    _v.copy(p.centre).sub(camera.position);
    const d = _v.length();
    _sphere.center.copy(p.centre);
    _sphere.radius = p.widthUnits;
    p.px = d > 0 ? (p.widthUnits / d) * pxPerRad : 0;
    p.inView = _frustum.intersectsSphere(_sphere);
    let alpha = 0;
    if (d > 0 && p.inView) {
      _n.copy(p.centre).sub(sunScene).normalize();
      // Flat and facing the Sun: whole on the line it was taken along, gone 50 degrees off it. The slider draws it even
      // closer than nearFade would have let the old layer (a visitor who asks for it gets it).
      p.fade = viewFade(_v.dot(_n) / d);
      p.cmpAlpha = cmp.k * p.fade;
      alpha = p.cmpAlpha;
    }
    const m = p.state === 'ready' ? meshFor(p) : p.mesh;
    if (m) {
      m.material.uniforms.uAlpha.value = alpha;
      m.visible = alpha > 0.003 && p.state === 'ready';
      if (m.visible) {
        _r.copy(p.centre).applyMatrix4(camera.matrixWorldInverse);
        const l = _r.length();
        if (l > 0) holeList.push({ dir: [_r.x / l, _r.y / l, _r.z / l], radius: Math.atan((p.widthUnits / 2) * (Math.min(p.half.x, p.half.y) / p.half.x) / d), k: alpha, id: p.row.id });
      }
    }
  }

  function dispose() {
    for (const p of pictures) { if (p.tex) p.tex.dispose(); if (p.mesh) p.mesh.material.dispose(); }
    geometry.dispose();
    if (scene) scene.remove(group);
  }

  if (opts.look) setExposure(opts.look);
  rebuild();

  return {
    setExposure, setRecords, rebuild, update, dispose, group,
    /** The photograph on screen after the last update(), for scene/starholes.js: [] unless the slider draws one. */
    holes: () => holeList.slice(),
    /** How strongly a record's photograph is drawn at its place, 0..1: the slider's share, 0 whenever it is not set. */
    drawn(recordId) {
      const p = ofRecord(recordId);
      return p && cmp.id === p.row.id && p.state === 'ready' && p.mesh && p.mesh.visible ? p.mesh.material.uniforms.uAlpha.value : 0;
    },
    /** The slider: compare `recordId`'s reconstruction (k = 0) with its photograph (k = 1). Not remembered. */
    setCompare(recordId, k) {
      const p = ofRecord(recordId);
      const v = Math.min(1, Math.max(0, Number(k) || 0));
      if (cmp.id && (!p || cmp.id !== p.row.id)) release(byId.get(cmp.id));
      cmp = p ? { id: p.row.id, k: v } : { id: null, k: 0 };
      if (p && v > 0) fetchPicture(p);
    },
    /** Take the slider off: the model alone again, and the picture's memory given back. */
    clearCompare() { if (cmp.id) release(byId.get(cmp.id)); cmp = { id: null, k: 0 }; },
    /** Where the slider stands for this record, 0..1, or null while it is not set. */
    compareK: (recordId) => (cmp.id && recordId === `dso-${cmp.id}` ? cmp.k : null),
    /** How much of the picture the slider is drawing now (the hero gives way by this much), or null while it is not set. */
    compareShare: (recordId) => { const p = ofRecord(recordId); return p && cmp.id === p.row.id ? p.cmpAlpha || 0 : null; },
    /** How whole the picture would be from where the camera stands (1 on the line it was taken along); 0 unless compared. */
    lineShare: (recordId) => {
      const p = ofRecord(recordId);
      if (!p || !p.placed || !camLast) return 0;
      _v.copy(p.centre).sub(camLast);
      const d = _v.length();
      _n.copy(p.centre).sub(sunScene).normalize();
      return d > 0 ? viewFade(_v.dot(_n) / d) : 0;
    },
    /** The line the picture was taken along: where to stand to see it whole. { target, offset (toward the Sun, unit) } in scene units, or null. */
    lineFor(recordId) {
      const p = ofRecord(recordId);
      if (!p || !p.placed) return null;
      const d = _v.copy(sunScene).sub(p.centre).normalize();
      return { target: { x: p.centre.x, y: p.centre.y, z: p.centre.z }, offset: { x: d.x, y: d.y, z: d.z } };
    },
    /** A record was selected (or null): the slider goes back to the model when it is another one's. Fetches nothing. */
    want(recordId) {
      const p = ofRecord(recordId);
      if (cmp.id && (!p || cmp.id !== p.row.id)) { release(byId.get(cmp.id)); cmp = { id: null, k: 0 }; }
    },
    has: (recordId) => PICTURE_FOR.has(recordId),
    /** Is the slider's picture being fetched now (sr.deep.ready(), spec 0075 task 10)? */
    busy: () => pictures.some((p) => p.state === 'loading'),
    /** The record ids whose picture is on the GPU: at most the one the slider compares. */
    loaded: () => pictures.filter((p) => p.state === 'ready').map((p) => `dso-${p.row.id}`),
    state: () => pictures.map((p) => ({ id: p.row.id, state: p.state, place: !!(p.mesh && p.mesh.visible), alpha: p.mesh ? p.mesh.material.uniforms.uAlpha.value : 0, placed: p.placed, widthUnits: p.widthUnits, px: Math.round(p.px || 0), inView: !!p.inView, fade: p.fade || 0 })),
  };
}
