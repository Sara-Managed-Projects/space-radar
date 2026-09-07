// The one clock. Every position in the app is a function of clock.now().
//
// Spec 0005 requirement 1, and the rule that makes the whole scene deterministic: no object owns
// a timer, nothing tweens its own state, and a screenshot at a given clock value is reproducible.
// `tick` is fed the REAL elapsed milliseconds by the render loop and decides what that means for
// app time, which is the only place the two ideas of time are allowed to meet.

const RATES = [1, 10, 60, 600, 3600, 36000];

function realNow() {
  // The one legitimate call to wall-clock time in the app. Everything else asks the clock.
  return Date.now();
}

export const clock = {
  mode: 'live',
  rate: 1,
  paused: false,
  _t: realNow(),
  _listeners: [],

  now() {
    return this.mode === 'live' ? realNow() : this._t;
  },

  date() {
    return new Date(this.now());
  },

  /** Real elapsed milliseconds since the last frame. */
  tick(realDeltaMs) {
    if (this.mode === 'live') {
      this._t = realNow();
      return;
    }
    if (!this.paused) this._t += realDeltaMs * this.rate;
  },

  setRate(r) {
    this.rate = r;
    if (r !== 1 && this.mode === 'live') {
      // Leaving 1x means leaving now: hold the instant we were at so nothing jumps.
      this._t = realNow();
      this.mode = 'scrub';
    }
    this._emit();
  },

  rates() {
    return RATES.slice();
  },

  setPaused(p) {
    this.paused = !!p;
    if (this.paused && this.mode === 'live') {
      this._t = realNow();
      this.mode = 'scrub';
    }
    this._emit();
  },

  /** Jump to an instant. Always leaves live mode -- a jump is by definition not now. */
  goTo(ms) {
    this._t = ms;
    this.mode = 'scrub';
    this._emit();
  },

  /** Nudge by a number of milliseconds of app time. */
  nudge(ms) {
    this.goTo(this.now() + ms);
  },

  live() {
    this.mode = 'live';
    this.rate = 1;
    this.paused = false;
    this._t = realNow();
    this._emit();
  },

  /** How far from real time we are, in ms. Zero in live mode. */
  offsetMs() {
    return this.mode === 'live' ? 0 : this._t - realNow();
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _emit() {
    for (const fn of this._listeners) {
      try { fn(this); } catch (err) { console.warn('clock listener failed', err); }
    }
  },
};
