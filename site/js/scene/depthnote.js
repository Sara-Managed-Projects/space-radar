// scene/depthnote.js -- "Depth modelled", the caption on the picture of a deep-sky hero whose depth is a reconstruction,
// while the camera looks at it from more than 20 degrees off the Sun's line (internal #431, idea 15 of the 16 Nov review).
//
// Contract: attachDepthNote(ctx, deps?) -> { state(), dispose() }   main.js, once, after the first visit; fetched with import()
//   Pure, for tests/test_depthnote.mjs:
//   offLineDeg(camera, object, sun) -> degrees   the angle AT THE OBJECT between the line to the camera and the line to the Sun
//   isModelledDepth(hero) -> boolean             a hero whose whole drawing is a reconstruction (stub.drawn is ['reconstruction'])
//   noteFor(record, hero, deg) -> string         the caption's key in COPY.depthNote: 'modelled' or ''
//   THRESHOLD_DEG                                20
//
// WHAT IT SAYS AND WHY. The emission heroes (Orion's neighbours, the Lagoon, the Eagle, the Rosette, the Veil, the Horsehead ...)
// are walls of glowing gas built from ONE photograph, which was taken from here: a photograph carries no distance for any pixel
// of gas. What is measured is the distance of the stars (Gaia). So when the camera has left the Sun's line, where the photograph
// is whole, by more than 20 degrees, the picture that turns is a model, and a line says so: "Depth modelled: only the stars'
// distances are measured." On the line (and inside 20 degrees of it) nothing is said: there the picture is the photograph's own,
// and the card's honesty line already tells what it is. This is the app's own vocabulary (Measured / Modelled), not a new one.
//
// WHICH HEROES. Only those whose drawing is a reconstruction and nothing else (registry heroes with `drawn: ['reconstruction']`).
// Not Cassiopeia A, the Vela nebula, the Crab, SN 1987A, the Homunculus or the Cat's Eye, whose depth comes from measured speeds or a
// published model: saying "modelled" of those would be as wrong as saying "measured" of the others. Not galaxies drawn as a model.
//
// COST. Nothing per frame in the render loop: a 400 ms timer, only while such a record is selected, three vectors.
// The line is the stars' deep-time line's sibling (css/deep.css, .sr-stardeep): the same glass and place, one line, no motion.

import { COPY } from '../copy/en.js';
import '../copy/en.deep.js';
import { loadCss } from '../ui/latercss.js';

export const THRESHOLD_DEG = 20;
const POLL_MS = 400;
const SUN_INERTIAL = 'sun-inertial';

/** The angle at `object` between the line to `camera` and the line to `sun`, in degrees. Points are {x, y, z}. Pure. */
export function offLineDeg(camera, object, sun) {
  const a = [camera.x - object.x, camera.y - object.y, camera.z - object.z];
  const b = [sun.x - object.x, sun.y - object.y, sun.z - object.z];
  const la = Math.hypot(a[0], a[1], a[2]), lb = Math.hypot(b[0], b[1], b[2]);
  if (!(la > 0) || !(lb > 0)) return 0;
  const c = Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

/** A hero whose whole drawing is a reconstruction: its depth is modelled. Pure. */
export function isModelledDepth(hero) {
  const d = hero && hero.stub && hero.stub.drawn;
  return Array.isArray(d) && d.length === 1 && d[0] === 'reconstruction';
}

/** The key of the caption in COPY.depthNote for this record seen this far off the Sun's line, or ''. Pure. */
export function noteFor(record, hero, deg) {
  if (!record || record.klass !== 'dso' || !isModelledDepth(hero)) return '';
  return deg > THRESHOLD_DEG ? 'modelled' : '';
}

export function attachDepthNote(ctx, deps = {}) {
  const st = { record: null, hero: null, key: '', line: null, deg: 0, timer: 0 };
  const heroOf = deps.heroForRecord || ((id) => import('./deep/heroes.js').then((m) => m.heroForRecord(id)));
  const sceneOf = (p, frame, out) => ctx.stage.toSceneInto(p, frame || SUN_INERTIAL, out, ctx.stage.tMs);
  const obj = { x: 0, y: 0, z: 0 }, sun = { x: 0, y: 0, z: 0 };
  let seq = 0;

  function paint(key) {
    if (key === st.key) return;
    st.key = key;
    if (!st.line && key) {
      Promise.resolve(loadCss('deep')).catch(() => {});
      st.line = document.createElement('p');
      st.line.className = 'sr-depthnote sr-float';
      st.line.setAttribute('role', 'status');
      document.body.appendChild(st.line);
    }
    if (st.line) { st.line.textContent = key ? COPY.depthNote[key] : ''; st.line.hidden = !key; }
  }

  function look() {
    if (!st.record || !st.hero || !ctx.camera || !ctx.stage || typeof ctx.stage.toSceneInto !== 'function') return paint('');
    sceneOf(st.record.pos, st.record.frame, obj);
    sceneOf({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, sun);
    st.deg = offLineDeg(ctx.camera.position, obj, sun);
    paint(noteFor(st.record, st.hero, st.deg));
  }

  function stop() { if (st.timer) { clearInterval(st.timer); st.timer = 0; } }

  const onSelect = (e) => {
    const record = e && e.detail && e.detail.klass === 'dso' ? e.detail : null;
    const mine = ++seq;
    stop(); st.record = null; st.hero = null; paint('');
    if (!record) return;
    Promise.resolve(heroOf(record.id)).then((hero) => {
      if (mine !== seq || !isModelledDepth(hero)) return;
      st.record = record; st.hero = hero;
      look();
      st.timer = setInterval(look, POLL_MS);
    }).catch(() => {});
  };
  window.addEventListener('sr:select', onSelect);

  return {
    state: () => ({ record: st.record ? st.record.id : null, deg: st.deg, shown: !!st.key }),
    dispose() { stop(); window.removeEventListener('sr:select', onSelect); if (st.line) st.line.remove(); },
  };
}
