// audio/engine.js -- one AudioContext, one master gain, and the visitor's choice (spec 0035).
//
// Contract export: createAudio(opts) -> { enable(), disable(), toggle(), suspend(), resume(),
//                                         setVolume(v), isOn(), live(), onChange(fn),
//                                         context, master }
//                  STORE_KEY, readFlag(storage), writeFlag(storage, on), VOLUME
//
// THE FIRST SOUND A VISITOR HEARS IS A CHOICE, NEVER AN AMBUSH (Ivan asked for "music" on
// 2026-09-22; the spec's whole contract is requirement 1). So:
//
//   * Nothing here runs at boot but reading one localStorage key. No AudioContext exists until
//     enable() is called from a click, and this file fetches nothing: beds.js and stings.js ask
//     for their files, and only once there is a context to play them in.
//   * The stored flag says the visitor WANTS sound; it is not permission to play. Every browser
//     refuses to start a context before a user gesture, and a page load is not one. So a visitor
//     who turned sound on last time gets it on their first tap or key this time -- through the
//     one-shot listeners armGesture() sets -- and not a moment before.
//   * `sr.audio` is outside the snapshot cache's `sr.v1.` namespace on purpose (data/sources.js
//     keys that by source id): a flag in there could one day be a source called `audio`.
//
// Reduced motion is not reduced sound (spec 0035 req 10): nothing here reads that preference.

export const STORE_KEY = 'sr.audio';
// The master level when on. Below 1 so a bed and a sting summed cannot clip; the files are
// already levelled to one loudness (registry/audio.yaml says how), so this is the only knob.
export const VOLUME = 0.8;
const FADE_OUT_S = 0.3;
const FADE_IN_S = 0.5;
const GESTURES = ['pointerup', 'keydown', 'touchend', 'click'];

/** The stored choice. Safari's private mode throws on localStorage access; that reads as off. */
export function readFlag(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return false;
    const raw = s.getItem(STORE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw);
    return !!(v && v.on === true);
  } catch {
    return false;
  }
}

export function writeFlag(storage, on) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (s) s.setItem(STORE_KEY, JSON.stringify({ on: !!on }));
    return true;
  } catch {
    // A private window forgets, which is right (spec 0035 req 2); the choice holds for this page.
    return false;
  }
}

export function createAudio(opts = {}) {
  const storage = opts.storage;
  const doc = opts.document !== undefined ? opts.document : (typeof document !== 'undefined' ? document : null);
  const Ctor = opts.AudioContext !== undefined
    ? opts.AudioContext
    : (typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null);
  const later = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms));

  let context = null;
  let master = null;
  let on = readFlag(storage);
  let volume = Number.isFinite(opts.volume) ? opts.volume : VOLUME;
  let armed = false;
  const listeners = new Set();

  function emit() {
    for (const fn of [...listeners]) {
      try { fn(on); } catch { /* one listener's bug is not the engine's */ }
    }
  }

  function create() {
    if (context || !Ctor) return context;
    // 48 kHz, the rate every file is encoded at. Measured 2026-09-23 in Chrome: a context at the
    // device's 44.1 kHz resamples each bed as ONE buffer at decode, the resampler rings at the
    // buffer's two edges, and the ladder bed's loop seam jumped 1.5 times the largest step inside
    // the music (a click every 72 s). At 48 kHz the decode is untouched, every seam is below the
    // file's own largest step, decode took 0.2 to 0.6 s instead of 1.6 to 2, and the one resample
    // left is the output's, which streams and has no edges. 'playback' latency: nothing here is
    // interactive, and a bigger buffer is less battery.
    try {
      context = new Ctor({ sampleRate: 48000, latencyHint: 'playback' });
    } catch {
      try {
        context = new Ctor();   // Safari's old webkitAudioContext takes no options
      } catch {
        context = null;
        return null;
      }
    }
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    return context;
  }

  function rampMaster(to, seconds) {
    if (!context || !master) return;
    const t = context.currentTime;
    const g = master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + seconds);
  }

  /** Turn sound on. Call it from a click or a key, never from boot: that is what makes it work. */
  function enable() {
    create();
    if (context && context.state === 'suspended' && !(doc && doc.hidden)) {
      try { context.resume(); } catch { /* a refused resume leaves it for the next gesture */ }
    }
    rampMaster(volume, FADE_IN_S);
    on = true;
    writeFlag(storage, true);
    if (!context || context.state !== 'running') armGesture();
    // Every listener is idempotent (beds.enter of the bed already playing does nothing), so a
    // second enable() from the gesture listener costs a comparison, not a second bed.
    emit();
    return !!context;
  }

  function disable() {
    rampMaster(0, FADE_OUT_S);
    on = false;
    writeFlag(storage, false);
    disarm();
    // Suspended, not closed: the decoded beds stay in memory, so turning it back on is instant.
    if (context) {
      later(() => {
        if (!on && context && context.state === 'running') {
          try { context.suspend(); } catch { /* already gone */ }
        }
      }, FADE_OUT_S * 1000 + 50);
    }
    emit();
  }

  function toggle() {
    if (on) disable();
    else enable();
    return on;
  }

  function suspend() {
    if (context && context.state === 'running') {
      try { context.suspend(); } catch { /* nothing to do */ }
    }
  }

  function resume() {
    if (on && context && context.state === 'suspended') {
      try { context.resume(); } catch { /* the next gesture will */ }
    }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (on) rampMaster(volume, 0.1);
  }

  // The first gesture after a page load, for a visitor whose stored choice is "on". Capture phase
  // so a control that stops propagation cannot swallow it; removed as soon as the context runs.
  function onGesture() {
    if (!on) { disarm(); return; }
    enable();
    if (context && context.state === 'running') disarm();
  }

  function armGesture() {
    if (armed || !doc || typeof doc.addEventListener !== 'function') return;
    armed = true;
    for (const type of GESTURES) doc.addEventListener(type, onGesture, true);
  }

  function disarm() {
    if (!armed || !doc) return;
    armed = false;
    for (const type of GESTURES) doc.removeEventListener(type, onGesture, true);
  }

  // A hidden tab plays nothing: the bed would otherwise hum on behind somebody's mail.
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', () => {
      if (!context) return;
      if (doc.hidden) suspend();
      else resume();
    });
  }
  if (on) armGesture();

  return {
    enable,
    disable,
    toggle,
    suspend,
    resume,
    setVolume,
    /** The visitor's choice: what every control paints. */
    isOn: () => on,
    /** On AND a context to play in: what beds and stings ask before they fetch anything. */
    live: () => !!(on && context && context.state !== 'closed'),
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get context() { return context; },
    get master() { return master; },
    get armed() { return armed; },
  };
}
