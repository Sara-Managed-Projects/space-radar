// scene/nebulae.js -- real photographs of the famous nebulae and galaxies, pinned where they are
// (spec 0067 tasks 1-3).
//
// Contract: createNebulae(scene, opts) -> { setExposure(look), setSkyOpacity(k), drawn(id),
//   setRecords(records), setSkyVisible(on), rebuild(), update(camera, renderer, skyOn, placeOn), want(id),
//   prefetch(ids), has(id), loaded(), state(), dispose(), group, skyGroup }
// Pure, for tests/test_nebulae.mjs: pictureBasis(row), pictureCorners(row), skyToPicture(row, ra, dec),
//   pictureHalfExtent(row), eqToEcl(v), viewFade(cos), nearFade(distOverWidth), PICTURE_FOR
//
// WHY. Ivan, 2026-10-02: "usually on pictures we see this nice clouds of gases when space is shown,
// is it real or not? If real - lets add this". They are real, and until this file the Orion Nebula
// was a pink round glow (scene/dsoglow.js): the right place and the right size, and nothing of what
// it looks like. registry/nebulae.yaml now holds one licensed photograph per object, with where on
// the sky its centre is, how wide it is and which way is north in it, and this file lays each one
// on the sky as a flat picture: a GNOMONIC projection, which is what a camera makes and what a
// plane seen from the centre of a sphere is, so no reprojection of the pixels is needed.
//
// TWO PLACES, ONE PICTURE.
//   the sky   On a world's stage the sky is scene/starfield.js's sphere around the camera. The
//             picture is a child of that group, on the unit sphere, so it turns, recentres and
//             precesses with the stars it was photographed among, and fades with them
//             (`sky-panorama` in registry/lod.yaml).
//   the place On a rung of the ladder the picture stands at the object's measured distance, as
//             wide as its angle makes it there, facing the Sun. From anywhere near the line from
//             the Sun it is the same picture at the same place among scene/stars3d.js's stars; fly
//             toward it and it grows, as it should.
//
// WHAT IT IS NOT. It is a photograph taken from here. Seen from the side it would be a lie -- a
// nebula is a volume and a galaxy a disc -- so the picture fades out as the camera leaves the line
// of sight (viewFade) and the object's mark is what is left. The volumes of spec 0067 task 2 are
// not built. Andromeda has a model (scene/galaxy.js): on the line of sight her photograph is drawn
// and the model waits (drawn('dso-m31') tells main.js how much), off it the model comes back.
//
// NOTHING AT BOOT. main.js imports this file only on a rung of the ladder, when a deep-sky object
// is selected or when the visitor touches the exposure control; and a picture's file is fetched
// only once it would be 32 px wide in view, or its object is selected. A first
// visit downloads none of it (tests/test_first_visit_bytes.mjs).
//
// THE BLEND. Additive, in the opaque list, depth test off -- the same three choices as the stars,
// for the reason scene/starfield.js spells out at the Milky Way: a `transparent: true` sky draws
// after the Earth and paints over it. The files are baked with their sky background taken to
// black (scripts/build_nebulae.py), so adding one to the sky adds the nebula and not a rectangle;
// the edge is feathered here, after the exposure's stretch, so "Deep" cannot bring the frame back.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { NEBULAE } from '../data/nebulae.js';

const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const OBLIQUITY = 23.4392911 * D2R; // J2000 mean obliquity, as scene/galaxy.js
const SUN_INERTIAL = 'sun-inertial';
const RENDER_ORDER_SKY = -2.5;   // after the Milky Way (-3), before the stars (-2)
const RENDER_ORDER_PLACE = -1;   // with the deep-sky glows
// A picture narrower than this on screen is not fetched for it. At 10 px a sweep of the camera
// across Orion fetched three pictures nobody could see (measured 2026-10-03); 32 px is the size at
// which a nebula stops being a dot. A selected object's picture is fetched whatever its size.
const WANT_PX = 32;

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
varying vec2 vUv;
void main() {
  if ( uAlpha <= 0.0 ) discard;
  // The picture's own display values, stretched: no colour-space round trip, because the stretch
  // is a darkroom's and is defined on what the photograph looks like.
  vec3 c = pow( texture2D( map, vUv ).rgb, vec3( uGamma ) ) * uGain;
  // The night eye sees no colour: a cool grey, as the rods report it.
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), c, uSaturation );
  // The feather: a superellipse between a circle and the frame, faded over the outer half, so no
  // edge and no corner is ever a line. (Exponent 4 read as a rounded square at 100 px.)
  vec2 q = abs( vUv * 2.0 - 1.0 );
  float e = pow( pow( q.x, 3.0 ) + pow( q.y, 3.0 ), 1.0 / 3.0 );
  float f = 1.0 - smoothstep( 0.5, 0.98, e );
  gl_FragColor = vec4( c * ( f * f * uAlpha ), 1.0 );
}
`;

// ------------------------------------------------------------------------------------ the layer

/**
 * @param {THREE.Scene} scene
 * @param {{ skyGroup?: THREE.Object3D, rows?: object[], base?: string|URL,
 *           load?: (url: string) => Promise<THREE.Texture>, onPicture?: (id: string) => void,
 *           look?: object, saveData?: boolean }} [opts]
 *   `skyGroup` is scene/starfield.js's group (equatorial J2000 on a unit sphere, already scaled,
 *   turned and centred on the camera); without it the pictures are drawn only on the ladder.
 */
export function createNebulae(scene, opts = {}) {
  const rows = opts.rows || NEBULAE;
  const base = opts.base || new URL('../../', import.meta.url);
  const loader = opts.load || ((url) => new THREE.TextureLoader().loadAsync(url));
  const group = new THREE.Group();
  group.name = 'nebulae';
  group.renderOrder = RENDER_ORDER_PLACE;
  if (scene) scene.add(group);
  const skyGroup = new THREE.Group();
  skyGroup.name = 'nebulae-sky';
  if (opts.skyGroup) opts.skyGroup.add(skyGroup);

  // One set of exposure uniforms for every picture: a mode change is three writes.
  const shared = { uGain: { value: 1 }, uGamma: { value: 1 }, uSaturation: { value: 1 } };
  const geometry = new THREE.PlaneGeometry(2, 2);
  let skyOpacity = 1;
  let skyVisible = true;
  let selected = null;
  const sunScene = new THREE.Vector3();
  const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _n = new THREE.Vector3();
  const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sphere = new THREE.Sphere();

  function material() {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { map: { value: null }, uAlpha: { value: 0 }, ...shared },
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      toneMapped: false, side: THREE.DoubleSide,
    });
  }

  const pictures = rows.map((row) => {
    const basis = pictureBasis(row);
    const half = pictureHalfExtent(row);
    // the sky: on the unit sphere, in the starfield's own (equatorial) axes
    const sky = new THREE.Mesh(geometry, material());
    sky.name = `nebula-sky-${row.id}`;
    sky.matrixAutoUpdate = false;
    sky.frustumCulled = false; // update() does the looking, with the camera it is given
    sky.renderOrder = RENDER_ORDER_SKY;
    sky.visible = false;
    const c = new THREE.Vector3(...basis.centre);
    sky.matrix.makeBasis(
      new THREE.Vector3(...basis.right).multiplyScalar(half.x),
      new THREE.Vector3(...basis.up).multiplyScalar(half.y),
      c.clone().negate(),
    ).setPosition(c);
    skyGroup.add(sky);
    // the place: built by rebuild(), once the stage and the object's distance are known
    const place = new THREE.Mesh(geometry, material());
    place.name = `nebula-${row.id}`;
    place.matrixAutoUpdate = false;
    place.frustumCulled = false;
    place.renderOrder = RENDER_ORDER_PLACE;
    place.visible = false;
    group.add(place);
    // The angles the picture spans: its diagonal (is it in view?) and its width (is it worth fetching?).
    const angle = 2 * Math.atan(Math.hypot(half.x, half.y));
    const widthAngle = 2 * Math.atan(half.x);
    return { row, basis, half, sky, place, angle, widthAngle, distKm: null, placed: false, centre: new THREE.Vector3(), widthUnits: 0, tex: null, state: 'idle' };
  });
  const byId = new Map(pictures.map((p) => [p.row.id, p]));

  function fetchPicture(p) {
    if (p.state !== 'idle') return;
    p.state = 'loading';
    const url = String(new URL(String(p.row.file).replace(/^site\//, ''), base));
    // The loader is called NOW (a test counts the calls), and may throw (TextureLoader touches
    // `document`): either way the answer is a promise.
    let asked;
    try { asked = Promise.resolve(loader(url)); } catch (err) { asked = Promise.reject(err); }
    asked.then((tex) => {
      // Display values in, display values out (FRAG): no sRGB decode on the way.
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      p.tex = tex;
      p.sky.material.uniforms.map.value = tex;
      p.place.material.uniforms.map.value = tex;
      p.state = 'ready';
      if (typeof opts.onPicture === 'function') opts.onPicture(`dso-${p.row.id}`);
    }).catch((err) => {
      // A picture that will not load leaves the glow and the mark: degrade, never go dark.
      p.state = 'failed';
      console.warn('nebulae:', p.row.id, err && err.message ? err.message : err);
    });
  }

  /** The deep-sky records, for the distances: |pos| of `dso-<id>` (km, sun-inertial). */
  function setRecords(records) {
    for (const r of records || []) {
      const p = r && typeof r.id === 'string' && r.id.startsWith('dso-') ? byId.get(r.id.slice(4)) : null;
      if (!p || !r.pos) continue;
      const d = Math.hypot(r.pos.x, r.pos.y, r.pos.z);
      p.distKm = d > 0 ? d : null;
    }
    rebuild();
  }

  /** Stand each picture at its object's distance, on the stage as it is now. */
  function rebuild() {
    const ladder = isLadderStage(stage.worldId);
    group.visible = ladder;
    if (!ladder) { for (const p of pictures) { p.placed = false; p.place.visible = false; } return; }
    stage.toSceneInto({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, sunScene, stage.tMs);
    for (const p of pictures) {
      p.placed = false;
      if (!(p.distKm > 0)) continue;
      // Three points, converted like everything else on the stage, and the picture's axes are
      // their differences: the stage's own rotation and axis remap, measured and not assumed.
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
      p.place.matrix.makeBasis(_r, _u, _n).setPosition(_v);
      p.place.matrixWorldNeedsUpdate = true;
      p.placed = true;
    }
  }

  function setExposure(look) {
    if (!look) return;
    shared.uGain.value = Number(look.nebulaGain);
    shared.uGamma.value = Number(look.nebulaGamma);
    shared.uSaturation.value = Number(look.nebulaSaturation);
  }

  /**
   * Per frame. The deep-sky layer's switch hides the pictures too: `layerSky` is whether the layer
   * is on at all (on a world's stage its marks are not drawn, and the sky's pictures still are),
   * `layerPlace` whether it draws on this stage (main.js isLayerDrawable).
   */
  function update(camera, renderer, layerSky = true, layerPlace = layerSky) {
    if (!camera || !camera.isCamera) return;
    const viewH = renderer && renderer.domElement ? (renderer.domElement.clientHeight || 800) : 800;
    const pxPerRad = camera.projectionMatrix.elements[5] * 0.5 * viewH;
    _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pv);
    const ladder = isLadderStage(stage.worldId);
    const sg = opts.skyGroup;
    const skyOn = layerSky !== false && skyVisible && skyOpacity > 0.003 && !!sg && sg.visible !== false;
    for (const p of pictures) {
      const isSelected = selected === p.row.id;
      // --- the sky
      let skyAlpha = 0;
      if (skyOn) {
        _sphere.center.set(...p.basis.centre).applyMatrix4(sg.matrixWorld);
        _sphere.radius = Math.tan(p.angle / 2) * sg.scale.x;
        if (_frustum.intersectsSphere(_sphere)) {
          skyAlpha = skyOpacity;
          if (p.state === 'idle' && !opts.saveData && p.widthAngle * pxPerRad >= WANT_PX) fetchPicture(p);
        }
      }
      p.sky.material.uniforms.uAlpha.value = skyAlpha;
      p.sky.visible = skyAlpha > 0 && p.state === 'ready';
      // --- the place
      let alpha = 0;
      p.px = 0; p.inView = false; p.fade = 0;
      if (layerPlace !== false && ladder && p.placed) {
        _v.copy(p.centre).sub(camera.position);
        const d = _v.length();
        _sphere.center.copy(p.centre);
        _sphere.radius = p.widthUnits;
        p.px = d > 0 ? (p.widthUnits / d) * pxPerRad : 0;
        p.inView = _frustum.intersectsSphere(_sphere);
        if (d > 0 && p.inView) {
          _n.copy(p.centre).sub(sunScene).normalize();
          p.fade = viewFade(_v.dot(_n) / d);
          alpha = (1 - skyOpacity) * viewFade(_v.dot(_n) / d) * nearFade(d / p.widthUnits);
          if (alpha > 0 && p.state === 'idle' && !opts.saveData && (p.widthUnits / d) * pxPerRad >= WANT_PX) fetchPicture(p);
        }
      }
      p.place.material.uniforms.uAlpha.value = alpha;
      p.place.visible = alpha > 0.003 && p.state === 'ready';
      // A selected object's picture is fetched whatever its size and whatever the connection.
      if (isSelected && p.state === 'idle') fetchPicture(p);
    }
  }

  function dispose() {
    for (const p of pictures) {
      if (p.tex) p.tex.dispose();
      p.sky.material.dispose();
      p.place.material.dispose();
    }
    geometry.dispose();
    if (scene) scene.remove(group);
    if (opts.skyGroup) opts.skyGroup.remove(skyGroup);
  }

  if (opts.look) setExposure(opts.look);
  rebuild();

  return {
    setExposure, setRecords, rebuild, update, dispose, group, skyGroup,
    /** The sky panorama's strength (registry/lod.yaml `sky-panorama`): the sky pictures follow it, the placed ones take over as it goes. */
    setSkyOpacity(k) { skyOpacity = Math.min(1, Math.max(0, Number(k) || 0)); },
    /** How strongly a record's photograph is being drawn at its place, 0..1: 0 until it has landed. */
    drawn(recordId) {
      const p = typeof recordId === 'string' ? byId.get(recordId.slice(4)) : null;
      return p && p.state === 'ready' && p.place.visible ? p.place.material.uniforms.uAlpha.value : 0;
    },
    /** The frame-rate latch hides the Milky Way picture; the sky pictures go with it. */
    setSkyVisible(on) { skyVisible = on !== false; },
    /** A record was selected (or null): its picture is fetched now. */
    want(recordId) {
      selected = typeof recordId === 'string' && recordId.startsWith('dso-') && byId.has(recordId.slice(4)) ? recordId.slice(4) : null;
      if (selected) fetchPicture(byId.get(selected));
    },
    /**
     * A trip that will stop at these objects asks for their pictures at its intro (ui/trip.js
     * `wants.pictures`), so a stop does not arrive at a mark and wait for its photograph: measured
     * 2026-10-06, the Crab's file landed after the card had been up six seconds.
     */
    prefetch(recordIds) {
      for (const id of Array.isArray(recordIds) ? recordIds : []) {
        const p = typeof id === 'string' && id.startsWith('dso-') ? byId.get(id.slice(4)) : null;
        if (p) fetchPicture(p);
      }
    },
    has: (recordId) => PICTURE_FOR.has(recordId),
    /** The record ids whose pictures are on the GPU's doorstep: scene/dsoglow.js drops their glow. */
    loaded: () => pictures.filter((p) => p.state === 'ready').map((p) => `dso-${p.row.id}`),
    state: () => pictures.map((p) => ({ id: p.row.id, state: p.state, sky: p.sky.visible, place: p.place.visible, alpha: p.place.material.uniforms.uAlpha.value, placed: p.placed, px: Math.round(p.px || 0), inView: !!p.inView, fade: p.fade || 0 })),
  };
}
