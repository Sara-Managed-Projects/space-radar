// scene/glyphs.js — one instanced quad layer per data layer.
//
// One draw call per layer: a unit quad in an InstancedBufferGeometry, billboarded in the vertex
// shader, tinted per instance, sampling the runtime glyph atlas in the fragment shader. Sizes are
// in CSS pixels and clamped to 4..14 so a glyph is the same size at any zoom; the size encodes the
// class, never the true size (docs/design-language.md).
//
// Picking projects the live instance positions to NDC on the CPU and takes the nearest within
// 24 px. Raycasting tens of thousands of instances is the thing this exists to avoid.
//
// A record whose cls is 'sample' also draws a dashed halo ring, so bundled demonstration data can
// never be mistaken for a live position (the module contract rule 5).

import * as THREE from '../../vendor/three.module.min.js';
import * as propagateMod from '../propagate/index.js';
import * as stageMod from './stage.js';
import {
  getGlyphAtlas,
  glyphCell,
  cellUV,
  ATLAS_GRID,
  CELL_PX,
  HALO_BIAS,
  CLASS_COLOURS,
  PALETTE,
} from './glyphatlas.js';

// Size in CSS px by class, before the 4..14 clamp. Class, not true size.
export const GLYPH_SIZE_PX = {
  station: 13,
  satellite: 8,
  debris: 8,
  rocket: 9,
  probe: 9,
  telescope: 9,
  asteroid: 10,
  comet: 10,
  site: 9,
  world: 12,
};

const DEBRIS_SIZE = 0.6; // 60 % size
const DEBRIS_OPACITY = 0.5; // half opacity
const RENDER_ORDER_DEBRIS = 5; // under everything else that is drawn
const RENDER_ORDER_GLYPH = 10;
const PAD = 1.7; // the quad is 1.7x the glyph, leaving room for the sample halo
const PICK_PX = 24; // the contract's forgiveness rule
const DEBRIS_PICK_PENALTY = 1.6; // a satellite beats a speck at the same distance

const VERT = /* glsl */ `
attribute vec3 iOffset;
attribute vec3 iColour;
attribute float iSize;
attribute float iOpacity;
attribute float iCell;

uniform float uPxScale;   // world units per CSS pixel, per unit of view depth
uniform float uGrid;
uniform float uPad;

varying vec2 vUv;
varying vec3 vColour;
varying float vOpacity;
varying float vHalo;
varying vec2 vCell0;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vUv = uv;
  vColour = iColour;
  vOpacity = iOpacity;

  float cells = uGrid * uGrid;
  float cell = iCell;
  vHalo = step( cells - 0.5, cell );      // cell + 16 means "sample: draw the halo"
  cell -= vHalo * cells;
  float col = mod( cell, uGrid );
  float row = floor( cell / uGrid );
  vCell0 = vec2( col / uGrid, 1.0 - ( row + 1.0 ) / uGrid );

  vec4 mv = modelViewMatrix * vec4( iOffset, 1.0 );
  float px = clamp( iSize, 4.0, 14.0 ) * uPad;
  float s = px * uPxScale * max( -mv.z, 1e-6 );
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;

  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uOutline;
uniform float uGrid;
uniform float uInset;

varying vec2 vUv;
varying vec3 vColour;
varying float vOpacity;
varying float vHalo;
varying vec2 vCell0;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec2 q = clamp( vUv, vec2( uInset ), vec2( 1.0 - uInset ) );
  vec4 t = texture2D( uAtlas, vCell0 + q / uGrid );

  // red channel 0 = the 1.5 px dark keyline, 1 = the class colour
  vec3 rgb = mix( uOutline, vColour, t.r );
  float a = t.a * vOpacity;

  if ( vHalo > 0.5 ) {
    vec2 d = vUv - 0.5;
    float r = length( d );
    float ring = smoothstep( 0.395, 0.415, r ) * ( 1.0 - smoothstep( 0.450, 0.470, r ) );
    float ang = atan( d.y, d.x ) * 0.15915494 + 0.5;
    float dash = step( 0.5, fract( ang * 12.0 ) );
    float h = ring * dash * 0.85 * vOpacity;
    rgb = mix( rgb, vColour, step( a, h ) );
    a = max( a, h );
  }

  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( rgb, a );

  #include <colorspace_fragment>
}
`;

function viewportCss() {
  if (typeof window === 'undefined') return { w: 1280, h: 720 };
  return { w: window.innerWidth || 1280, h: window.innerHeight || 720 };
}

function colourOf(record, layer) {
  return (
    (record.meta && record.meta.colour) ||
    record.colour ||
    layer.colour ||
    CLASS_COLOURS[record.klass] ||
    PALETTE.text
  );
}

function sizeOf(record, layer) {
  const base = record.sizePx || layer.sizePx || GLYPH_SIZE_PX[record.klass] || GLYPH_SIZE_PX.satellite;
  return record.klass === 'debris' ? base * DEBRIS_SIZE : base;
}

/**
 * @param {THREE.Scene} scene
 * @param {{id?:string, klass?:string, colour?:string, glyph?:string, budget?:number}} layer
 * @returns {{setRecords, update, pick, dispose, setVisible, setSelected, setViewport,
 *            setPositionSource, mesh, count():number}}
 */
export function createGlyphLayer(scene, layer = {}) {
  const propagate = typeof propagateMod.propagate === 'function' ? propagateMod.propagate : null;
  const stage = stageMod.stage || null;
  // stage.toSceneInto() is toScene() with an out vector; this loop is the reason it exists.
  // tMs is passed through rather than left to stage.tMs, so a frame conversion is done at the
  // instant the position was propagated for even if the caller has not called stage.setTime()
  // first. heroes.js already does this; the two now agree.
  const toSceneInto =
    stage && typeof stage.toSceneInto === 'function'
      ? (p, frame, out, tMs) => stage.toSceneInto(p, frame, out, tMs)
      : stage && typeof stage.toScene === 'function'
        ? (p, frame, out, tMs) => stage.toScene(p, frame, tMs)
        : null;
  let warnedNoPropagator = false;

  const atlas = getGlyphAtlas();
  const outline = new THREE.Color(PALETTE.space);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uAtlas: { value: atlas },
      uOutline: { value: outline },
      uGrid: { value: ATLAS_GRID },
      uPad: { value: PAD },
      uInset: { value: 0.5 / CELL_PX },
      uPxScale: { value: 2 / (1.5 * 720) },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false, // the class colours are palette tokens, not lit surfaces
  });

  // A unit quad, centred. uv (0,0) is the lower left, matching cellUV()'s flipY = true origin.
  const QUAD_POS = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
  const QUAD_UV = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const QUAD_IDX = [0, 1, 2, 0, 2, 3];

  let geometry = null;
  let mesh = null;
  let capacity = 0;

  // per-record, in record order
  let records = [];
  let recColour = new Float32Array(0);
  let recSize = new Float32Array(0);
  let recOpacity = new Float32Array(0);
  let recCell = new Float32Array(0);

  // per-live-instance, rewritten every update
  let live = []; // live index -> record
  let livePos = new Float32Array(0); // scene units, xyz per live instance
  let attrOffset = null;
  let attrColour = null;
  let attrSize = null;
  let attrOpacity = null;
  let attrCell = null;

  let selectedId = null;
  let lastCamera = null;
  let viewport = viewportCss();
  let viewportLocked = false; // true once setViewport() is called by hand
  let positionSource = null;
  const emberColour = new THREE.Color(PALETTE.ember);
  const scratch = { x: 0, y: 0, z: 0 };
  const _scene = new THREE.Vector3();

  const isDebrisLayer = layer.klass === 'debris' || layer.glyph === 'debris';

  function allocate(n) {
    if (geometry) geometry.dispose();
    capacity = Math.max(16, n);
    geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(QUAD_IDX);
    geometry.setAttribute('position', new THREE.BufferAttribute(QUAD_POS.slice(), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(QUAD_UV.slice(), 2));

    attrOffset = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    attrColour = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    attrSize = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    attrOpacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    attrCell = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    for (const a of [attrOffset, attrColour, attrSize, attrOpacity, attrCell]) {
      a.setUsage(THREE.DynamicDrawUsage);
    }
    geometry.setAttribute('iOffset', attrOffset);
    geometry.setAttribute('iColour', attrColour);
    geometry.setAttribute('iSize', attrSize);
    geometry.setAttribute('iOpacity', attrOpacity);
    geometry.setAttribute('iCell', attrCell);
    geometry.instanceCount = 0;
    // The quad is expanded in view space, so three's bounds are meaningless here.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

    livePos = attrOffset.array;

    if (mesh) {
      mesh.geometry = geometry;
    } else {
      mesh = new THREE.Mesh(geometry, material);
      // three hands onBeforeRender the renderer and the camera actually being drawn with, which
      // is the only reliable source for the canvas's CSS size and the live projection. Without it
      // the pixel sizes would be guesses about the window rather than measurements of the canvas.
      mesh.onBeforeRender = (r, _scene2, cam) => {
        const el = r && r.domElement;
        if (!viewportLocked && el && el.clientHeight > 0) {
          viewport.w = el.clientWidth;
          viewport.h = el.clientHeight;
        }
        if (cam && cam.isCamera) {
          lastCamera = cam;
          material.uniforms.uPxScale.value =
            2 / (cam.projectionMatrix.elements[5] * Math.max(1, viewport.h));
        }
      };
      mesh.frustumCulled = false;
      mesh.renderOrder = isDebrisLayer ? RENDER_ORDER_DEBRIS : RENDER_ORDER_GLYPH;
      mesh.name = `glyphs:${layer.id || layer.klass || 'layer'}`;
      mesh.userData.layer = layer;
      scene.add(mesh);
    }
  }

  function setRecords(next) {
    records = Array.isArray(next) ? next : [];
    // data/layers.js writes `budget: {maxItems, rank}`; the module contract's LAYERS shape says a plain
    // number. Accept both -- comparing a length against the object silently produced NaN, so this
    // guard never fired at all. (loadLayer applies the same cap, so this is the second line of
    // defence for a caller that hands over an unfiltered array.)
    const maxItems =
      typeof layer.budget === 'number'
        ? layer.budget
        : layer.budget && Number.isFinite(layer.budget.maxItems)
          ? layer.budget.maxItems
          : Infinity;
    if (records.length > maxItems) records = records.slice(0, maxItems);
    const n = records.length;
    if (n > capacity) allocate(Math.ceil(n * 1.25));
    else if (!geometry) allocate(n);

    recColour = new Float32Array(n * 3);
    recSize = new Float32Array(n);
    recOpacity = new Float32Array(n);
    recCell = new Float32Array(n);

    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = records[i];
      c.set(colourOf(r, layer));
      recColour[i * 3] = c.r;
      recColour[i * 3 + 1] = c.g;
      recColour[i * 3 + 2] = c.b;
      recSize[i] = sizeOf(r, layer);
      recOpacity[i] = r.klass === 'debris' ? DEBRIS_OPACITY : 1;
      recCell[i] = glyphCell(r.klass || layer.klass || layer.glyph) + (r.cls === 'sample' ? HALO_BIAS : 0);
    }
    live = [];
    if (geometry) geometry.instanceCount = 0;
  }

  function positionOf(record, tMs) {
    if (positionSource) return positionSource(record, tMs);
    if (!propagate) {
      if (!warnedNoPropagator) {
        warnedNoPropagator = true;
        // Degrade, never go dark: draw nothing rather than throw, and say so once.
        console.warn('glyphs: no propagate() available; layer', layer.id, 'draws nothing');
      }
      return null;
    }
    return propagate(record, tMs);
  }

  function update(tMs, camera) {
    if (!geometry) return;
    if (camera) {
      lastCamera = camera;
      const f = camera.projectionMatrix.elements[5]; // 1 / tan(fovY / 2)
      // ndc.y = f * y_view / -z_view, and ndc spans the viewport height, so one CSS pixel is
      // 2 * -z_view / ( f * heightCss ) world units.
      material.uniforms.uPxScale.value = 2 / (f * Math.max(1, viewport.h));
    }
    if (!mesh.visible) return;

    let k = 0;
    const emberR = emberColour.r;
    const emberG = emberColour.g;
    const emberB = emberColour.b;
    live.length = 0;
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      let p = null;
      try {
        p = positionOf(rec, tMs);
      } catch {
        p = null;
      }
      if (!p) continue;
      let v = p;
      if (toSceneInto) {
        scratch.x = p.x;
        scratch.y = p.y;
        scratch.z = p.z;
        v = toSceneInto(scratch, p.frame || rec.frame, _scene, tMs);
        if (!v) continue;
      }
      const o = k * 3;
      livePos[o] = v.x;
      livePos[o + 1] = v.y;
      livePos[o + 2] = v.z;
      const selected = selectedId !== null && rec.id === selectedId;
      if (selected) {
        attrColour.array[o] = emberR;
        attrColour.array[o + 1] = emberG;
        attrColour.array[o + 2] = emberB;
      } else {
        attrColour.array[o] = recColour[i * 3];
        attrColour.array[o + 1] = recColour[i * 3 + 1];
        attrColour.array[o + 2] = recColour[i * 3 + 2];
      }
      attrSize.array[k] = selected ? recSize[i] * 1.35 : recSize[i];
      attrOpacity.array[k] = selected ? 1 : recOpacity[i];
      attrCell.array[k] = recCell[i];
      live.push(rec);
      k++;
      if (k >= capacity) break;
    }

    geometry.instanceCount = k;
    attrOffset.needsUpdate = true;
    attrColour.needsUpdate = true;
    attrSize.needsUpdate = true;
    attrOpacity.needsUpdate = true;
    attrCell.needsUpdate = true;
    if (!material.uniforms.uAtlas.value) {
      const a = getGlyphAtlas();
      if (a) material.uniforms.uAtlas.value = a;
    }
  }

  const _m = new THREE.Matrix4();

  /**
   * Every record within the forgiveness rule, nearest first, each with its pixel distance and its
   * penalised score -- for scene/pickrank.js to weigh against other layers and for a long press to
   * list. pick() is the one-winner form of the same scan.
   */
  function pickAll(ndcX, ndcY, limit = 6) {
    if (!lastCamera || !geometry || !mesh.visible || geometry.instanceCount === 0) return [];
    lastCamera.updateMatrixWorld();
    mesh.updateMatrixWorld();
    _m.multiplyMatrices(lastCamera.projectionMatrix, lastCamera.matrixWorldInverse);
    _m.multiply(mesh.matrixWorld);
    const e = _m.elements;
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    const out = [];
    for (let i = 0; i < geometry.instanceCount; i++) {
      const x = livePos[i * 3];
      const y = livePos[i * 3 + 1];
      const z = livePos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue;
      const cx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w;
      const cy = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w;
      const dx = (cx - ndcX) * halfW;
      const dy = (cy - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px > PICK_PX) continue;
      const rec = live[i];
      if (!rec) continue;
      out.push({ record: rec, px, score: rec.klass === 'debris' ? px * DEBRIS_PICK_PENALTY : px });
    }
    out.sort((p, q) => p.score - q.score);
    return out.slice(0, Math.max(1, limit));
  }

  function pick(ndcX, ndcY) {
    if (!lastCamera || !geometry || !mesh.visible || geometry.instanceCount === 0) return null;
    lastCamera.updateMatrixWorld();
    mesh.updateMatrixWorld();
    _m.multiplyMatrices(lastCamera.projectionMatrix, lastCamera.matrixWorldInverse);
    _m.multiply(mesh.matrixWorld);
    const e = _m.elements;
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    let best = null;
    let bestScore = PICK_PX * DEBRIS_PICK_PENALTY;
    for (let i = 0; i < geometry.instanceCount; i++) {
      const x = livePos[i * 3];
      const y = livePos[i * 3 + 1];
      const z = livePos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue; // behind the camera
      const cx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w;
      const cy = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w;
      const dx = (cx - ndcX) * halfW;
      const dy = (cy - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px > PICK_PX) continue;
      const rec = live[i];
      const score = rec && rec.klass === 'debris' ? px * DEBRIS_PICK_PENALTY : px;
      if (score < bestScore) {
        bestScore = score;
        best = rec;
      }
    }
    return best;
  }

  allocate(16);

  return {
    setRecords,
    update,
    pick,
    pickAll,
    setVisible(b) {
      if (mesh) mesh.visible = !!b;
    },
    dispose() {
      if (mesh) scene.remove(mesh);
      if (geometry) geometry.dispose();
      material.dispose();
      records = [];
      live = [];
      mesh = null;
      geometry = null;
    },
    // --- beyond the contract, all optional; the layer works without any of them ---
    /** Highlight one record in ember (the selection colour, and the only interactive colour). */
    setSelected(id) {
      selectedId = id === undefined ? null : id;
    },
    /**
     * Override the CSS pixel size of the canvas. Not normally needed: the layer measures the
     * canvas itself at draw time. Calling this pins the value until the layer is disposed.
     */
    setViewport(w, h) {
      viewport = { w: w || viewport.w, h: h || viewport.h };
      viewportLocked = true;
    },
    /** Replace propagate() as the position source, e.g. a table filled by a worker. */
    setPositionSource(fn) {
      positionSource = typeof fn === 'function' ? fn : null;
    },
    get mesh() {
      return mesh;
    },
    count() {
      return geometry ? geometry.instanceCount : 0;
    },
  };
}

export { cellUV };
