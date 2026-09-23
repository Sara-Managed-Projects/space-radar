// ui/veil.js -- the one owner of the black over the canvas (spec 0034 requirement 1).
//
// Contract export: createVeil(host, opts) -> { through(fn), fade(ms), covered(), dispose() }
//                  VEIL_MS, REDUCED_VEIL_MS
//
// A STAGE CHANGE INSIDE A TRIP WAS A BARE CUT until 2026-09-23. ui/trip.js enterStage() moves the
// map's centre, and main.js ctx.setStage frames the new stage's world at once: between two planets
// that cut is the honest move (the stop being left is drawn squeezed from the new stage), and it
// was also unannounced -- four of the ten stops out past Jupiter arrived on one. A film cuts
// between places through black. So: 350 ms to `space` (#0B0E14), the switch and the instant camera
// placement inside the black, 350 ms back.
//
// CANVAS ONLY. The node sits over the canvas and the labels and under every panel, the card and
// the letterbox (ui.css `--sr-z-veil`): the words a visitor is reading never blink, which is the
// nit spec 0025 left open. The reduced-motion cross-fade (`fade(ms)`) is the same node, so there is
// one black in the app and one place its colour and its layer are decided.
//
// REDUCED MOTION is not two 350 ms halves (spec 0034 requirement 5): it is the cut the rig already
// makes with the one 220 ms cross-fade over it, once. through() takes that path itself when asked
// under reduced motion, so no caller can stack a veil on top of the rig's own fade.
//
// EACH HALF ENDS WHEN THE PICTURE HAS, NOT WHEN A TIMER SAYS. The two halves are Web Animations and
// the switch waits on the cover's `finished`, which is animation time: it advances with rendered
// frames. The first version ended each half on `transitionend` or a wall-clock `ms + 50`, and on a
// slow frame loop the timer won: measured 2026-09-23 in headless Chrome at under one frame a
// second, the cover's transition still read currentTime 0 when the timer fired, the switch ran on
// a canvas nobody had covered, and not one black frame was ever drawn. A hidden tab renders no
// frames, so there the halves end at once; and a last-resort cap (FRAME_STALL_MS) keeps a page
// that has stopped rendering altogether from holding a trip forever.
//
// THE NEW STAGE'S FIRST FRAMES ARE DRAWN IN THE BLACK. A stage switch is cheap in JavaScript and
// expensive in the frame after it: the new world's textures upload and its shaders compile on the
// first render that shows them. The uncover waits for two animation frames after the switch, so
// that hitch lands under the black rather than in the middle of the fade back (measured
// 2026-09-23 in headless Chrome: the first frame on Saturn's stage came 13 s after the switch at
// 0.8 fps, where every other frame took 1.2 s). A hidden tab gets no frames, so the wait is capped.
//
// `sr:veil` is dispatched on document at the two edges, `{phase: 'covered' | 'clear'}`, so spec
// 0035's stings can land in the black without this file knowing sound exists.

export const VEIL_MS = 350;
// The same number as scene/camera.js REDUCED_FADE_MS; not imported because camera.js pulls three.js
// and this file is loaded by a test with no scene. tests/test_veil.mjs holds the two equal.
export const REDUCED_VEIL_MS = 220;
const SLACK_MS = 50;
const FRAME_STALL_MS = 5000;
// The frames the new stage is drawn in before the black comes off, and the cap on waiting for them.
const SETTLE_FRAMES = 2;
const SETTLE_CAP_MS = 1000;

export function createVeil(host, opts = {}) {
  const reducedMotion = typeof opts.reducedMotion === 'function' ? opts.reducedMotion : () => false;
  const fadeMs = Number.isFinite(opts.fadeMs) ? opts.fadeMs : REDUCED_VEIL_MS;
  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  const setT = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const clearT = opts.clearTimeout || ((id) => clearTimeout(id));
  const raf = opts.requestAnimationFrame !== undefined
    ? opts.requestAnimationFrame
    : typeof requestAnimationFrame === 'function' ? (fn) => requestAnimationFrame(fn) : null;

  let node = null;
  if (doc && host && typeof host.appendChild === 'function') {
    node = doc.createElement('div');
    node.className = 'sr-veil';
    node.setAttribute('aria-hidden', 'true');
    host.appendChild(node);
  }

  // The veil in progress: its promise, and the switches waiting for its black. A second through()
  // before the black has come JOINS it -- its switch runs in the same black -- and one after the
  // switch has run waits for the canvas to clear and goes through a black of its own. Never two
  // covers at once, and never a switch run on a canvas somebody can see.
  let pending = null;
  let queue = null;
  let isCovered = false;

  function emit(phase) {
    if (!doc || typeof doc.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
    try {
      doc.dispatchEvent(new CustomEvent('sr:veil', { detail: { phase } }));
    } catch {
      /* a listener must never stop the veil */
    }
  }

  let current = null; // the running half, so the next can start from where it has got to

  /**
   * Take the opacity to `on` over `ms`. The class is the resting state (ui.css `.sr-veil.is-on`);
   * the animation draws the way there and ends when animation time does. Without Web Animations
   * (tests under node) a timer stands in for it.
   */
  function transitionTo(on, ms) {
    return new Promise((resolve) => {
      let done = false;
      let cap = null;
      const onVis = () => { if (doc && doc.hidden) finish(); };
      const finish = () => {
        if (done) return;
        done = true;
        if (cap !== null) clearT(cap);
        if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('visibilitychange', onVis);
        resolve();
      };
      if (!node || typeof node.animate !== 'function') {
        if (node) node.classList.toggle('is-on', on);
        cap = setT(finish, ms + SLACK_MS);
        return;
      }
      const view = doc && doc.defaultView;
      const from = view && typeof view.getComputedStyle === 'function' ? Number(view.getComputedStyle(node).opacity) : on ? 0 : 1;
      if (current) current.cancel();
      node.classList.toggle('is-on', on);
      if (doc && doc.hidden) { current = null; finish(); return; }
      const anim = node.animate([{ opacity: Number.isFinite(from) ? from : on ? 0 : 1 }, { opacity: on ? 1 : 0 }], { duration: ms, easing: 'linear' });
      current = anim;
      anim.finished.then(finish, finish);
      if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', onVis);
      cap = setT(finish, ms + FRAME_STALL_MS);
    });
  }

  /** Two rendered frames, or the cap, whichever first; at once without a frame loop or when hidden. */
  function settleFrames() {
    if (!raf || (doc && doc.hidden)) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearT(cap);
        resolve();
      };
      const cap = setT(finish, SETTLE_CAP_MS);
      let n = 0;
      const step = () => {
        n += 1;
        if (n >= SETTLE_FRAMES) finish();
        else raf(step);
      };
      raf(step);
    });
  }

  function cover(ms) {
    return transitionTo(true, ms).then(() => {
      isCovered = true;
      emit('covered');
    });
  }

  function uncover(ms) {
    return transitionTo(false, ms).then(() => {
      isCovered = false;
      emit('clear');
    });
  }

  /**
   * Run `fn` in the black: VEIL_MS to cover, fn(), VEIL_MS back. Resolves once the canvas is clear
   * again. Under reduced motion fn runs at once and the one short cross-fade covers it.
   */
  function through(fn) {
    const run = typeof fn === 'function' ? fn : () => {};
    if (reducedMotion()) {
      try {
        run();
      } finally {
        fade(fadeMs);
      }
      return Promise.resolve();
    }
    if (pending && queue) {
      queue.push(run);
      return pending;
    }
    if (pending) return pending.then(() => through(run));
    const mine = [run];
    queue = mine;
    const p = cover(VEIL_MS)
      .then(() => {
        queue = null; // from here a newcomer waits for the next black
        for (const f of mine) {
          try {
            f();
          } catch (e) {
            // The black must come off whatever the switch did; a veil stuck on is a blank app.
            console.warn('veil: a switch inside the black threw', e);
          }
        }
        return settleFrames().then(() => uncover(VEIL_MS));
      })
      .finally(() => {
        if (pending === p) pending = null;
      });
    pending = p;
    return p;
  }

  /**
   * The reduced-motion cross-fade: cover the canvas instantly, then fade off over `ms`. A cut with a
   * fade over it is the whole of "reduced motion" here; the card underneath never moves or fades.
   */
  function fade(ms) {
    const dur = Math.max(0, Number(ms) || 0);
    if (!node) return;
    node.classList.remove('is-on');
    if (typeof node.animate === 'function') {
      if (current) current.cancel();
      current = node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'linear' });
      return;
    }
    // No Web Animations: the same fade as a CSS transition.
    node.style.transition = 'none';
    node.classList.add('is-on');
    void node.offsetWidth; // commit the cover before the fade is armed
    node.style.transition = `opacity ${dur}ms linear`;
    node.classList.remove('is-on');
  }

  function dispose() {
    if (node && typeof node.remove === 'function') node.remove();
    if (current) current.cancel();
    current = null;
    node = null;
    pending = null;
    queue = null;
  }

  return {
    through,
    fade,
    covered: () => isCovered,
    busy: () => !!pending,
    dispose,
    node: () => node,
  };
}
