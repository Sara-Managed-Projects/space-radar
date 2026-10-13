// scene/exposure.js -- how long the shutter stays open: Eye, Camera, Deep (spec 0067 task 3).
//
// Contract: EXPOSURES, EXPOSURE_KEY, DEFAULT_EXPOSURE
//           exposureLook(mode) -> { nebulaGain, nebulaGamma, nebulaSaturation, milkyWay }   pure
//           readExposure(storage), writeExposure(storage, mode)
//           createExposure({ storage }) -> { mode(), look(), set(mode), hold(mode), release(), onChange(f) }
//           DRAWN, DEFAULT_DRAWN, DRAWN_KEY, MEASURED_RULES, drawnUnder(look, rule), stillUnder(look, rule)
//           createDrawn({ storage, initial }) -> { mode(), set(mode), onChange(f) }     Measured or Film (below)
//
// WHY. Ivan, 2026-10-02: "usually on pictures we see this nice clouds of gases when space is shown,
// is it real or not?" It is real and it is faint. A nebula's colour in a photograph is minutes or
// hours of collected light; to an eye at a telescope most of them are grey smudges, because the
// retina's night cells see no colour. Drawing the photographs at full strength with no way back
// would be the lie the site exists not to tell, and hiding them would throw away the answer. So
// the sky has a shutter:
//
//   eye     what a person would see from a dark place: the brightest cores only, grey, and a dim
//           Milky Way. Nearly nothing, which is the honest picture.
//   camera  a long exposure in the colours the picture was taken in. The default: it is what
//           "space looks like" means to most people, and the card says how it was made.
//   deep    the stretch an observatory gives a press picture: faint outer gas lifted, colour pushed.
//
// The numbers are a LOOK, not photometry: nothing here knows a surface brightness. They are in one
// table so the test can hold their order (eye < camera < deep on every brightness) and so the two
// readers -- the nebula pictures (scene/nebulae.js) and the Milky Way (scene/starfield.js) -- can
// never disagree about what a mode means.
//
// No three.js and no DOM: main.js imports this at boot (the Milky Way needs its number on the first
// frame), so it is as small as it can be. The control is ui/exposure.js.

export const EXPOSURES = ['eye', 'camera', 'deep'];
export const DEFAULT_EXPOSURE = 'camera';
export const EXPOSURE_KEY = 'sr.exposure';

// nebulaGamma is applied to the picture's own (display) values: above 1 crushes the faint parts so
// only the core survives, below 1 lifts them. milkyWay multiplies the panorama's "whisper" tint,
// so camera = 1 is the sky exactly as it was drawn before this file existed.
const LOOKS = {
  // starLimit is the faintest apparent magnitude the 3D stars are drawn to (scene/stars3d.js): the Eye's is
  // the naked-eye limit (copy/en.js NAKED_EYE_LIMIT, held equal by tests/test_nebulae.mjs); the file holds
  // nothing past 7.5, so Deep cannot go further than Camera.
  eye: { nebulaGain: 0.3, nebulaGamma: 2.2, nebulaSaturation: 0.06, milkyWay: 0.55, starLimit: 6.5 },
  camera: { nebulaGain: 1.0, nebulaGamma: 1.0, nebulaSaturation: 1.0, milkyWay: 1.0, starLimit: 7.5 },
  deep: { nebulaGain: 1.15, nebulaGamma: 0.7, nebulaSaturation: 1.25, milkyWay: 1.7, starLimit: 7.5 },
};

/** The numbers a mode means; an unknown mode is the default's, never a throw. Pure. */
export function exposureLook(mode) {
  return { ...(LOOKS[mode] || LOOKS[DEFAULT_EXPOSURE]) };
}

/** The stored choice, or the default: nothing stored, something unknown, or a storage that throws. */
export function readExposure(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return DEFAULT_EXPOSURE;
    const v = s.getItem(EXPOSURE_KEY);
    return EXPOSURES.includes(v) ? v : DEFAULT_EXPOSURE;
  } catch {
    return DEFAULT_EXPOSURE;
  }
}

export function writeExposure(storage, mode) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return false;
    if (mode === DEFAULT_EXPOSURE) s.removeItem(EXPOSURE_KEY);
    else s.setItem(EXPOSURE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

/**
 * The one shutter the page has. A browser that throws on localStorage (Safari's private mode) gets
 * the default, and the choice still holds for the page.
 *
 * `opts.initial` is a mode a shared link asked for (ui/urlstate.js `exp`, public #460): it is worn
 * from the first frame and NOT stored, so somebody else's link never rewrites this visitor's own
 * choice. An unknown value is ignored.
 */
export function createExposure(opts = {}) {
  const storage = opts.storage;
  let mode = EXPOSURES.includes(opts.initial) ? opts.initial : readExposure(storage);
  // A trip stop's own shutter (registry/tours.yaml `exposure:`), for as long as the stop is up.
  // Never stored: it is the trip's, and the visitor's choice is what comes back when it lets go.
  let held = null;
  const listeners = new Set();
  const now = () => held || mode;
  const tell = (byVisitor) => { for (const f of listeners) f(now(), exposureLook(now()), byVisitor); };
  return {
    mode: now,
    look: () => exposureLook(now()),
    hold(next) {
      if (!EXPOSURES.includes(next) || held === next) return false;
      const was = now();
      held = next;
      if (was !== now()) tell(false);
      return true;
    },
    release() {
      if (!held) return false;
      const was = now();
      held = null;
      if (was !== now()) tell(false);
      return true;
    },
    /** `byVisitor` is true from the control: main.js loads the pictures then, and not at boot. */
    set(next, byVisitor = true) {
      if (!EXPOSURES.includes(next) || next === mode) return false;
      const was = now();
      mode = next;
      writeExposure(storage, next);
      if (was !== now()) tell(byVisitor);
      return true;
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}

// --- Measured or Film (spec 0073 requirement 8, 2026-10-12) -----------------------------------------
//
// The second thing this control decides: how much of what is drawn was made up to make it look alive.
//   film      as the map always was: generated fine detail, illustrative weather. The default.
//   measured  nothing generated below the data's resolution and nothing illustrative laid over a
//             world: what is measured, and what is modelled from published numbers, at the clock's
//             own rate. The exposure and every measured thing are untouched.
// ONE QUESTION, ASKED BY THE EFFECT. main.js puts `ctx.look()` on the context and hands its answer to
// the three places that draw such detail (scene/weather/, scene/sun.js, scene/aurora.js); each asks
// drawnUnder() or stillUnder() with ITS OWN declared rule. A weather effect's rule is its registry row's
// `measured:` (registry/weather.yaml); a module that draws generated detail in a shader exports
// `UNDER_MEASURED`, one rule per thing it draws. tests/test_look_setting.mjs refuses a weather row or
// such a module without one, so a new effect cannot forget to answer.
//   same   drawn as in Film: it is measured, or modelled and already at the clock's true rate
//   still  drawn, and held still: its shape stands for something real, its motion is ours
//   hidden not drawn: it is generated, or illustrative
// Here because this file is already on the first frame and the two choices are one control.

export const DRAWN = ['measured', 'film'];
export const DEFAULT_DRAWN = 'film';
export const DRAWN_KEY = 'sr.look';
export const MEASURED_RULES = ['same', 'still', 'hidden'];

/** Is a thing with this rule drawn under this look? An unknown rule is drawn: only `hidden` removes. Pure. */
export function drawnUnder(look, rule) {
  return look !== 'measured' || rule !== 'hidden';
}

/** Is it held still under this look? Pure. */
export function stillUnder(look, rule) {
  return look === 'measured' && rule === 'still';
}

function readDrawn(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    const v = s ? s.getItem(DRAWN_KEY) : null;
    return DRAWN.includes(v) ? v : DEFAULT_DRAWN;
  } catch {
    return DEFAULT_DRAWN;
  }
}

/**
 * The one look the page has, remembered like the shutter. `opts.initial` is a shared link's
 * (ui/urlstate.js `drawn`): worn from the first frame and not stored, as `exp` is.
 */
export function createDrawn(opts = {}) {
  const storage = opts.storage;
  let mode = DRAWN.includes(opts.initial) ? opts.initial : readDrawn(storage);
  const listeners = new Set();
  return {
    mode: () => mode,
    set(next) {
      if (!DRAWN.includes(next) || next === mode) return false;
      mode = next;
      try {
        const s = storage === undefined ? globalThis.localStorage : storage;
        if (s) { if (next === DEFAULT_DRAWN) s.removeItem(DRAWN_KEY); else s.setItem(DRAWN_KEY, next); }
      } catch { /* the choice still holds for the page */ }
      for (const f of listeners) f(mode);
      return true;
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}
