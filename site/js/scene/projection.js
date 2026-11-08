// scene/projection.js -- the picture as a planetarium's dome master, a 360-degree video frame, or a skybox
// (forge #157). One cube-camera pass of the scene, then one full-screen shader that reprojects it.
//
// Contract: createProjection({ renderer, scene, camera }) -> { set(proj, opts), get(), active, faceSize, render(),
//             snapshot(proj, width, height) -> HTMLCanvasElement | null, skybox(size) -> HTMLCanvasElement | null, dispose() }
// Pure, for tests/test_projection.mjs (the shader's own maths, in JavaScript, line for line):
//   KINDS, FACE_ORDER, parseProj(text), projValue(proj), domeDir(u, v, tiltDeg), equirectDir(u, v), faceDir(face, u, v),
//   faceSizeFor({ tier, phone, maxCube }), letterbox(w, h, aspect), snapshotFace(proj, width, maxCube)
//
// WHAT EACH IS. SpaceEngine renders fisheye dome masters, equirectangular 360-degree frames and cube-map skyboxes,
// and sells uncapped resolution and commercial use in its PRO edition (spec 0081). Here they are free, at any
// size the GPU takes, with the map's own credit:
//   dome   a 180-degree azimuthal-equidistant fisheye (the "domemaster" every planetarium player takes): the
//          middle of the disc is straight ahead of the camera, the rim is 90 degrees from it, the angle from the
//          middle is proportional to the distance from it. `dome,30` tilts it: the camera's view direction is
//          drawn 30 degrees below the middle, toward the bottom of the frame, which is the front of a tilted dome.
//   360    equirectangular, 2:1: longitude across (the camera's heading in the middle, its right to the right),
//          latitude up, the horizon level with the camera's own up (scene/camera.js keeps that the ecliptic's
//          north on most maps), whatever the camera's tilt. YouTube and every 360 player read this.
//   skybox the six faces of the cube, +X -X +Y -Y +Z -Z in the scene's own axes, in the OpenGL cube-map
//          convention (the face images as glTexImage2D takes them), side by side in one 6:1 PNG.
//
// HOW. A THREE.CubeCamera at the camera's position draws the scene six times into a cube render target, 90
// degrees a face, with the map's own near and far planes (the log depth buffer, scene/renderer.js, works for any
// perspective camera). The scene is then hidden for the loop's own render() (which then only clears) and one
// quad samples the cube in each pixel's direction. The tone mapping and the sRGB encoding three would have
// applied on the screen are applied by the quad's shader, so a dome frame and the ordinary frame have the same
// colours. Names over the scene, the reticle and the tag are HTML laid out for the ordinary camera; with a
// projection on they are hidden (`sr-proj-on` on <html>, css/make.css).
//
// THE COST, AND WHO GETS IT LIVE. Six renders of the whole scene a frame, plus the quad. A desktop GPU (tier 1
// and 2, scene/quality.js) runs it live with 1024 px and 2048 px faces. A phone gets 512 px faces and says so:
// a dome frame from a phone is a preview, not a master. A device that cannot hold a cube map of 512 px
// (maxCubemapSize) gets no projection and a sentence saying why. Snapshots (a frame, a skybox) are drawn once
// at the size asked for, up to the GPU's own cube-map and render-buffer limits, on any device.
//
// NEVER AT BOOT: ui/projectpanel.js imports this on the share sheet's Dome and 360, or a `#proj=` link.

import * as THREE from '../../vendor/three.module.min.js';

export const KINDS = ['dome', '360'];
/** The skybox's faces, in the strip's order (the OpenGL cube map's own order). */
export const FACE_ORDER = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
/** Live face sizes by device tier (scene/quality.js chooseTier); a phone is held to the first. */
export const LIVE_FACE = [512, 1024, 2048];
export const MIN_FACE = 512;
const HALF_PI = Math.PI / 2;

/** `dome`, `dome,30`, `360` -> { kind, tiltDeg }; anything else (`0`, '', `fish`) -> null. Pure. */
export function parseProj(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase();
  if (s === '360') return { kind: '360', tiltDeg: 0 };
  const m = /^dome(?:,(\d{1,2}(?:\.\d)?))?$/.exec(s);
  if (!m) return null;
  const tilt = m[1] ? Number(m[1]) : 0;
  return tilt >= 0 && tilt <= 90 ? { kind: 'dome', tiltDeg: tilt } : null;
}

/** And back to the link's value; '' for none. Pure. */
export function projValue(p) {
  if (!p || !KINDS.includes(p.kind)) return '';
  if (p.kind === '360') return '360';
  return p.tiltDeg > 0 ? `dome,${Math.round(p.tiltDeg * 10) / 10}` : 'dome';
}

/**
 * The direction a dome master's pixel looks in, in the camera's own axes (x right, y up, z back: three's), for
 * u, v in -1..1 across the square (v up). Null outside the disc. The shader's DOME branch, line for line. Pure.
 */
export function domeDir(u, v, tiltDeg = 0) {
  const r = Math.hypot(u, v);
  if (r > 1) return null;
  const theta = r * HALF_PI;
  const phi = Math.atan2(v, u);
  const d = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), -Math.cos(theta)];
  const t = (tiltDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [d[0], c * d[1] - s * d[2], s * d[1] + c * d[2]];
}

/** An equirectangular pixel's direction, u and v in 0..1 (v up), in the level frame (x right, y up, z back). Pure. */
export function equirectDir(u, v) {
  const lon = (u - 0.5) * 2 * Math.PI;
  const lat = (v - 0.5) * Math.PI;
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon)];
}

/** A cube face's pixel direction, in world axes: the OpenGL cube map's table, s and t across and down the image. Pure. */
export function faceDir(face, u, v) {
  const s = u * 2 - 1;
  const t = (1 - v) * 2 - 1; // v up in the quad, t down the image
  switch (face) {
    case 0: return [1, -t, -s];
    case 1: return [-1, -t, s];
    case 2: return [s, 1, t];
    case 3: return [s, -1, -t];
    case 4: return [s, -t, 1];
    default: return [-s, -t, -1];
  }
}

/** The live face size for a device, or 0 with a reason. Pure. */
export function faceSizeFor({ tier = 0, phone = false, maxCube = 0 } = {}) {
  const cap = Number(maxCube) || 0;
  if (cap && cap < MIN_FACE) return { size: 0, reason: 'gpu' };
  const want = phone ? LIVE_FACE[0] : LIVE_FACE[Math.max(0, Math.min(2, Number(tier) || 0))];
  return { size: cap ? Math.min(want, cap) : want, reason: phone ? 'phone' : '' };
}

/** The largest rectangle of `aspect` centred in w x h, in whole pixels: where the picture goes on the screen. Pure. */
export function letterbox(w, h, aspect) {
  const a = aspect > 0 ? aspect : 1;
  let pw = w;
  let ph = Math.round(w / a);
  if (ph > h) { ph = h; pw = Math.round(h * a); }
  return { x: Math.floor((w - pw) / 2), y: Math.floor((h - ph) / 2), w: pw, h: ph };
}

/**
 * The face size a snapshot needs to be sharp at `width` pixels across: a dome's disc spans 180 degrees, so a
 * 90-degree face is half of it at its middle; an equirectangular frame spans 360, a face is a quarter. A power
 * of two, at most the GPU's. Pure.
 */
export function snapshotFace(proj, width, maxCube = 4096) {
  const share = proj && proj.kind === '360' ? 0.25 : 0.5;
  const want = Math.max(MIN_FACE, Number(width) * share);
  let size = MIN_FACE;
  while (size < want && size * 2 <= maxCube) size *= 2;
  return Math.min(size, maxCube);
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// The three branches are domeDir, equirectDir and faceDir above. `basis` turns the camera's (or the level frame's)
// axes into the world's, where the cube was drawn.
const FRAGMENT = /* glsl */ `
uniform samplerCube cube;
uniform int mode;
uniform int face;
uniform float tilt;
uniform mat3 basis;
varying vec2 vUv;
void main() {
  vec3 d;
  if (mode == 0) {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float theta = r * 1.5707963267948966;
    float phi = atan(p.y, p.x);
    d = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), -cos(theta));
    float c = cos(tilt), s = sin(tilt);
    d = basis * vec3(d.x, c * d.y - s * d.z, s * d.y + c * d.z);
  } else if (mode == 1) {
    float lon = (vUv.x - 0.5) * 6.283185307179586;
    float lat = (vUv.y - 0.5) * 3.141592653589793;
    d = basis * vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon));
  } else {
    float s = vUv.x * 2.0 - 1.0;
    float t = (1.0 - vUv.y) * 2.0 - 1.0;
    if (face == 0) d = vec3(1.0, -t, -s);
    else if (face == 1) d = vec3(-1.0, -t, s);
    else if (face == 2) d = vec3(s, 1.0, t);
    else if (face == 3) d = vec3(s, -1.0, -t);
    else if (face == 4) d = vec3(s, -t, 1.0);
    else d = vec3(-s, -t, -1.0);
  }
  gl_FragColor = vec4(textureCube(cube, d).rgb, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createProjection({ renderer, scene, camera }) {
  const caps = renderer.capabilities || {};
  const gl = renderer.getContext();
  const maxCube = caps.maxCubemapSize || (gl && gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)) || 0;
  const maxBuffer = gl ? Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]) : 4096;
  let proj = null;
  let faceSize = 0;
  let target = null;
  let cubeCam = null;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { cube: { value: null }, mode: { value: 0 }, face: { value: 0 }, tilt: { value: 0 }, basis: { value: new THREE.Matrix3() } },
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function cubeOf(size) {
    if (target && target.width === size) return target;
    if (target) target.dispose();
    // Half floats where the GPU can draw into them: space is dark, and eight bits of linear light band in it.
    const ext = renderer.extensions;
    const half = !!(ext && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')));
    target = new THREE.WebGLCubeRenderTarget(size, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, generateMipmaps: false });
    cubeCam = new THREE.CubeCamera(camera.near, camera.far, target);
    return target;
  }

  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();
  /** The camera's axes (dome), or a level frame round the camera's own up (360), as world-space columns. */
  function basisFor(p) {
    camera.updateMatrixWorld();
    camera.matrixWorld.extractBasis(_x, _y, _z);
    if (p.kind === '360') {
      const up = _y.copy(camera.up).normalize();
      const back = _z.sub(_tmp.copy(up).multiplyScalar(_z.dot(up)));
      // Looking straight up or down there is no heading: any direction square to the up will do.
      if (back.lengthSq() < 1e-10) {
        back.set(Math.abs(up.x) < 0.9 ? 1 : 0, Math.abs(up.x) < 0.9 ? 0 : 1, 0);
        back.sub(_tmp.copy(up).multiplyScalar(back.dot(up)));
      }
      back.normalize();
      _x.crossVectors(up, back).normalize();
    }
    return material.uniforms.basis.value.set(_x.x, _y.x, _z.x, _x.y, _y.y, _z.y, _x.z, _y.z, _z.z);
  }
  const _tmp = new THREE.Vector3();

  /** Draw the cube from where the camera stands. The scene is shown for it and hidden again after. */
  function drawCube(size) {
    const rt = cubeOf(size);
    camera.getWorldPosition(cubeCam.position);
    cubeCam.updateMatrixWorld(true);
    const was = scene.visible;
    scene.visible = true;
    cubeCam.update(renderer, scene);
    scene.visible = was;
    material.uniforms.cube.value = rt.texture;
    return rt;
  }

  function setMode(p, face = 0) {
    material.uniforms.mode.value = p ? (p.kind === '360' ? 1 : 0) : 2;
    material.uniforms.face.value = face;
    material.uniforms.tilt.value = p ? (p.tiltDeg * Math.PI) / 180 : 0;
    if (p) basisFor(p);
  }

  /** The frame, live: the cube, then the quad letterboxed on the canvas (a square dome, a 2:1 world). */
  function render() {
    if (!proj || !faceSize) return;
    drawCube(faceSize);
    setMode(proj);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const box = letterbox(size.x, size.y, proj.kind === '360' ? 2 : 1);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.setViewport(box.x / pr, box.y / pr, box.w / pr, box.h / pr);
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(quadScene, quadCam);
    renderer.autoClear = auto;
    renderer.setViewport(0, 0, size.x / pr, size.y / pr);
    scene.visible = false; // the loop's own render() then only clears (main.js draws this after it)
  }

  /**
   * Draw ONE picture at width x height into a new 2D canvas and hand it back, the live frame put back after,
   * all in one task (the drawing buffer is not kept: scene/renderer.js renderTo says why).
   */
  function drawOnce(width, height, draw) {
    const w = Math.max(1, Math.min(maxBuffer, Math.round(width)));
    const h = Math.max(1, Math.min(maxBuffer, Math.round(height)));
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const live = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      draw(out.getContext('2d'), w, h);
    } finally {
      renderer.setPixelRatio(pr);
      renderer.setSize(live.x, live.y, false);
    }
    return out;
  }

  function quadOnce() {
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  /** A dome master (square) or an equirectangular frame (2:1) at the size asked for, on any device. */
  function snapshot(p, width, height) {
    const pp = typeof p === 'string' ? parseProj(p) : p;
    if (!pp) return null;
    const w = Math.round(width);
    const h = Math.round(height || (pp.kind === '360' ? w / 2 : w));
    drawCube(snapshotFace(pp, w, maxCube || 4096));
    const wasVisible = scene.visible;
    const out = drawOnce(w, h, (g) => {
      setMode(pp);
      quadOnce();
      g.drawImage(renderer.domElement, 0, 0, w, h);
    });
    scene.visible = wasVisible;
    if (faceSize && proj) cubeOf(faceSize);
    return out;
  }

  /** The six faces side by side, `size` px each: +X -X +Y -Y +Z -Z. */
  function skybox(size) {
    const s = Math.max(16, Math.min(maxCube || 2048, maxBuffer, Math.round(size)));
    drawCube(s);
    const strip = document.createElement('canvas');
    strip.width = s * 6;
    strip.height = s;
    const sg = strip.getContext('2d');
    drawOnce(s, s, () => {
      for (let f = 0; f < 6; f += 1) {
        setMode(null, f);
        quadOnce();
        sg.drawImage(renderer.domElement, f * s, 0, s, s);
      }
    });
    if (faceSize && proj) cubeOf(faceSize);
    return strip;
  }

  /** Turn a projection on (`proj` from parseProj) or off (null). `opts`: { tier, phone }. Returns { ok, size, reason }. */
  function set(p, opts = {}) {
    const next = p && KINDS.includes(p.kind) ? p : null;
    if (!next) {
      proj = null;
      faceSize = 0;
      scene.visible = true;
      if (target) { target.dispose(); target = null; cubeCam = null; }
      document.documentElement.classList.remove('sr-proj-on');
      return { ok: true, size: 0, reason: '' };
    }
    const fit = faceSizeFor({ tier: opts.tier, phone: opts.phone, maxCube });
    if (!fit.size) return { ok: false, size: 0, reason: fit.reason };
    proj = { kind: next.kind, tiltDeg: next.tiltDeg || 0 };
    faceSize = fit.size;
    cubeOf(faceSize);
    document.documentElement.classList.add('sr-proj-on');
    return { ok: true, size: faceSize, reason: fit.reason };
  }

  function dispose() {
    set(null);
    material.dispose();
    quad.geometry.dispose();
  }

  return {
    set, render, snapshot, skybox, dispose,
    get: () => (proj ? { ...proj } : null),
    get active() { return !!proj; },
    get faceSize() { return faceSize; },
    limits: { maxCube, maxBuffer },
  };
}
