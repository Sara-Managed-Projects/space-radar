// The renderer, the scene and the camera. One canvas, one WebGL2 context, nothing else.
//
// Contract: createRenderer(canvas) -> { renderer, scene, camera, resize(), render() }
//
// Three.js r185 API notes, because several of these were renamed and the old names fail silently:
//   - `outputEncoding` is GONE. It is `renderer.outputColorSpace = THREE.SRGBColorSpace`.
//   - `useLegacyLights` / `physicallyCorrectLights` are GONE. Lights are always physical.
//   - The log-depth define is `USE_LOGARITHMIC_DEPTH_BUFFER` (it was `USE_LOGDEPTHBUF`), which
//     matters to every custom ShaderMaterial in this app: they must include the logdepthbuf
//     chunks or they will z-fight against the built-in materials.
//   - WebGL1 no longer exists in three. A WebGL2 context is the only thing it will make, so the
//     "WebGL2" requirement is satisfied by construction; we only check so the failure is a
//     sentence rather than a stack trace.

import * as THREE from '../../vendor/three.module.min.js';

/** Background. docs/design-language.md: near-black with blue in it, never #000. */
export const SPACE = 0x0b0e14;

/** Device pixel ratio ceiling. Above 2 the phone burns fill rate for nothing anyone can see. */
export const MAX_DPR = 2;

/**
 * Near and far in scene units. The Earth stage draws at unit_km 1000, so 1e-5 units is one
 * centimetre and 1e9 units is far past the Sun (which sits at ~149 600 units, true distance).
 * The logarithmic depth buffer is what makes that range usable; without it the Sun and a
 * satellite panel cannot share a depth buffer.
 */
export const CAMERA_NEAR = 1e-5;
export const CAMERA_FAR = 1e9;
export const CAMERA_FOV_DEG = 45;

/**
 * The context attributes, in ONE place, because the probe below and three's own getContext call
 * must agree. A canvas hands back the SAME context object on every getContext('webgl2', ...) and
 * IGNORES the attributes on every call after the first, so probing with different attributes than
 * three asks for silently throws three's away -- powerPreference: 'high-performance' included,
 * which is the difference between the discrete and the integrated GPU on a laptop. These are
 * exactly the attributes three r185 builds from the constructor options below (it always requests
 * alpha:true and derives its own alpha handling from the `alpha` option).
 */
const GL_ATTRIBUTES = {
  alpha: true,
  depth: true,
  stencil: false,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
};

export function createRenderer(canvas) {
  if (!canvas) throw new Error('createRenderer: no canvas');

  if (typeof canvas.getContext === 'function') {
    // Probe first so a machine without WebGL2 gets a sentence instead of a stack trace.
    let probe = null;
    try {
      probe = canvas.getContext('webgl2', GL_ATTRIBUTES);
    } catch (err) {
      probe = null;
    }
    if (!probe) {
      const err = new Error('This browser cannot draw WebGL2, which the map needs.');
      err.code = 'no-webgl2';
      throw err;
    }
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: GL_ATTRIBUTES.antialias,
    alpha: false,
    stencil: GL_ATTRIBUTES.stencil,
    depth: GL_ATTRIBUTES.depth,
    premultipliedAlpha: GL_ATTRIBUTES.premultipliedAlpha,
    powerPreference: GL_ATTRIBUTES.powerPreference,
    failIfMajorPerformanceCaveat: GL_ATTRIBUTES.failIfMajorPerformanceCaveat,
    logarithmicDepthBuffer: true,
    preserveDrawingBuffer: GL_ATTRIBUTES.preserveDrawingBuffer,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.autoClear = true;
  renderer.setClearColor(SPACE, 1);
  renderer.shadowMap.enabled = false; // spec 0006: shadowing is analytic, not shadow maps.

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SPACE);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV_DEG,
    1,
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  camera.position.set(0, 6, 22); // a first frame that is not inside Earth; camera.js takes over.
  camera.lookAt(0, 0, 0);
  scene.add(camera); // so anything parented to the camera (labels, sky dome) comes along.

  // --- sizing -----------------------------------------------------------------
  // resize() is called every frame by main.js, so it has to be cheap: three integer compares
  // and nothing else in the common case.

  let lastW = -1;
  let lastH = -1;
  let lastDpr = -1;

  // The frame-rate latch (scene/quality.js) may cap this at 1: one device pixel per CSS pixel.
  let dprCap = MAX_DPR;

  function currentDpr() {
    const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    return Math.min(dpr, MAX_DPR, dprCap);
  }

  /** 'low' caps the pixel ratio at 1 and re-sizes at once; 'full' lifts the cap. */
  function setQuality(level) {
    dprCap = level === 'low' ? 1 : MAX_DPR;
    resize(true);
  }

  function resize(force) {
    // clientWidth is CSS pixels of the element itself -- the canvas's own box, not the window,
    // so a canvas in a split pane or a phone with a keyboard open still gets it right.
    let w = canvas.clientWidth | 0;
    let h = canvas.clientHeight | 0;
    if (!w || !h) {
      // Detached, display:none, or a headless test. Keep the last good size rather than
      // collapsing the projection matrix to NaN.
      w = lastW > 0 ? lastW : 1;
      h = lastH > 0 ? lastH : 1;
    }
    const dpr = currentDpr();
    if (!force && w === lastW && h === lastH && dpr === lastDpr) return false;
    lastW = w;
    lastH = h;
    lastDpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false); // false: never write style on the canvas, CSS owns the box.
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }

  resize(true);

  // --- context loss -----------------------------------------------------------
  // Degrade, never go dark (spec 0121's rule, and the reason for the flag rather than a throw):
  // a lost context stops draw calls but leaves the app's state, clock and data intact, and the
  // browser usually hands the context back within a second.

  let contextLost = false;
  if (typeof canvas.addEventListener === 'function') {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      contextLost = true;
      emit('lost');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      contextLost = false;
      resize(true);
      emit('restored');
    });
  }

  function emit(what) {
    if (typeof window === 'undefined' || !window.dispatchEvent) return;
    window.dispatchEvent(new CustomEvent('sr:webgl', { detail: { state: what } }));
  }

  function render() {
    if (contextLost) return;
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
  }

  return {
    renderer,
    scene,
    camera,
    resize,
    render,
    dispose,
    setQuality,
    get contextLost() { return contextLost; },
    get pixelRatio() { return lastDpr; },
    get size() { return { width: lastW, height: lastH }; },
  };
}
