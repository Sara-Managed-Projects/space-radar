// scene/exposure.js -- how long the shutter stays open: Eye, Camera, Deep (spec 0067 task 3).
//
// Contract: EXPOSURES, EXPOSURE_KEY, DEFAULT_EXPOSURE
//           exposureLook(mode) -> { nebulaGain, nebulaGamma, nebulaSaturation, milkyWay }   pure
//           readExposure(storage), writeExposure(storage, mode)
//           createExposure({ storage }) -> { mode(), look(), set(mode), onChange(f) }
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
  eye: { nebulaGain: 0.3, nebulaGamma: 2.2, nebulaSaturation: 0.06, milkyWay: 0.55 },
  camera: { nebulaGain: 1.0, nebulaGamma: 1.0, nebulaSaturation: 1.0, milkyWay: 1.0 },
  deep: { nebulaGain: 1.15, nebulaGamma: 0.7, nebulaSaturation: 1.25, milkyWay: 1.7 },
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
  const listeners = new Set();
  return {
    mode: () => mode,
    look: () => exposureLook(mode),
    /** `byVisitor` is true from the control: main.js loads the pictures then, and not at boot. */
    set(next, byVisitor = true) {
      if (!EXPOSURES.includes(next) || next === mode) return false;
      mode = next;
      writeExposure(storage, next);
      for (const f of listeners) f(mode, exposureLook(mode), byVisitor);
      return true;
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}
