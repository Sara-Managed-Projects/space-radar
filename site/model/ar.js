// The viewer's AR session (forge #559): fetched with import() only when the reader presses "View in your room".
//
// The browser's own WebXR `immersive-ar` session with `hit-test`, drawn by the three.js the viewer already loaded.
// Nothing else is fetched and nothing is kept: no anchor, no storage, no camera picture (the page never sees the
// camera; the browser composes it under the drawing). The `dom-overlay` feature, where the browser has it, shows
// the viewer's own words and buttons over the camera: what to do, the size line, the size switch and Done. Without
// it the reader leaves with the phone's back gesture, as in any AR page.
//
// A ring follows the floor the phone sees; a tap sets the model down there, base on the floor, centred; another
// tap moves it. A tap on the overlay's buttons is not a tap on the floor (beforexrselect).
import * as THREE from '../vendor/three.module.min.js';
import { arScale, offersRoom, sizeLine, widest } from './arplan.js';
import { fill, metres } from './words.js';

/**
 * Start AR. Resolves when the session has ended (or never started: then `ok` is false).
 * opts: { renderer, scene, model, W (the words), lang, sizeM (the catalog's published size or null), overlay (an
 * element the page owns, hidden outside AR) }
 */
export async function startAR({ renderer, scene, model, W, lang, sizeM, overlay }) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const wide = widest(size);
  const centre = box.getCenter(new THREE.Vector3());

  // The model stands in a group whose origin is the middle of its base: the point the ring marks.
  const holder = new THREE.Group();
  const stand = new THREE.Group();
  stand.position.set(-centre.x, -box.min.y, -centre.z);
  const parent = model.parent;
  const kept = { position: model.position.clone(), quaternion: model.quaternion.clone(), scale: model.scale.clone() };
  stand.add(model);
  holder.add(stand);
  holder.visible = false;
  scene.add(holder);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.15, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.9 }));
  ring.matrixAutoUpdate = false;
  ring.visible = false;
  scene.add(ring);

  let mode = 'real';
  const els = overlayParts(overlay);
  const sayStep = (placed) => { els.step.textContent = placed ? W.arMove : W.arFind; };
  const saySize = () => {
    const l = sizeLine(mode, wide, sizeM);
    els.size.textContent = fill(W[l.key], { m: metres(l.m, lang), k: l.k });
    holder.scale.setScalar(arScale(mode, wide));
    for (const b of els.seg.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  };
  els.seg.hidden = !offersRoom(wide);
  els.seg.onclick = (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) { mode = b.dataset.mode; saySize(); }
  };
  sayStep(false);
  saySize();

  const background = scene.background;
  scene.background = null;
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlay },
    });
  } catch {
    restore();
    return { ok: false };
  }
  overlay.hidden = false;
  // A press on the overlay is the overlay's, not a tap on the floor (one listener, however many sessions).
  if (!overlay.dataset.armed) {
    overlay.addEventListener('beforexrselect', (e) => e.preventDefault());
    overlay.dataset.armed = '1';
  }
  els.done.onclick = () => session.end();

  let source;
  try {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);
    const viewer = await session.requestReferenceSpace('viewer');
    source = await session.requestHitTestSource({ space: viewer });
  } catch {
    // The session opened but the floor cannot be found: close it and put the page back as it was.
    try { await session.end(); } catch { /* already ended */ }
    renderer.xr.enabled = false;
    restore();
    return { ok: false };
  }

  session.addEventListener('select', () => {
    if (!ring.visible) return;
    holder.position.setFromMatrixPosition(ring.matrix);
    // Face the reader: turn the model about the vertical so its +z looks at where the phone is.
    const cam = renderer.xr.getCamera();
    const at = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    holder.rotation.set(0, Math.atan2(at.x - holder.position.x, at.z - holder.position.z), 0);
    holder.visible = true;
    sayStep(true);
  });

  renderer.setAnimationLoop((t, frame) => {
    if (frame) {
      const hits = frame.getHitTestResults(source);
      const pose = hits.length ? hits[0].getPose(renderer.xr.getReferenceSpace()) : null;
      ring.visible = !!pose;
      if (pose) ring.matrix.fromArray(pose.transform.matrix);
    }
    renderer.render(scene, renderer.xr.getCamera());
  });

  await new Promise((done) => session.addEventListener('end', done, { once: true }));
  source.cancel?.();
  renderer.setAnimationLoop(null);
  renderer.xr.enabled = false;
  restore();
  return { ok: true };

  function restore() {
    overlay.hidden = true;
    scene.remove(ring);
    ring.geometry.dispose(); ring.material.dispose();
    scene.remove(holder);
    model.position.copy(kept.position); model.quaternion.copy(kept.quaternion); model.scale.copy(kept.scale);
    (parent || scene).add(model);
    scene.background = background;
  }
}

function overlayParts(overlay) {
  return {
    step: overlay.querySelector('[data-ar="step"]'),
    size: overlay.querySelector('[data-ar="size"]'),
    seg: overlay.querySelector('[data-ar="seg"]'),
    done: overlay.querySelector('[data-ar="done"]'),
  };
}
