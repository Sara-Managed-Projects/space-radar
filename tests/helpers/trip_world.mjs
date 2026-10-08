// tests/helpers/trip_world.mjs -- the real trip machine and the real camera rig under node.
//
// The small DOM is the one tests/test_autopilot_trip.mjs grew (kept there too: that file is older and
// stands alone). Here it is shared, with two things that file did not need: window events that are
// really delivered (ui/trip.js listens to `sr:stage`), and a frame loop that feeds the rig the way
// main.js does, a step clamped to 100 ms and the frame's real length beside it.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = join(ROOT, 'site/js');

export const time = { wall: 1000, real: Date.parse('2026-10-07T12:00:00Z') };
Date.now = () => time.real;
Object.defineProperty(globalThis, 'performance', { value: { now: () => time.wall }, configurable: true });

// ------------------------------------------------------------------------------- a small DOM
class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this._kids = [];
    this.parentNode = null;
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.hidden = false;
    this.className = '';
    this.id = '';
    this._text = '';
    this.offsetWidth = 1;
    const self = this;
    this.classList = {
      add: (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; },
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
    this.listeners = {};
  }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === document.body || n === document.documentElement; }
  get firstChild() { return this._kids[0] || null; }
  get childElementCount() { return this._kids.length; }
  get children() { return this._kids; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this._kids.push(c); return c; }
  removeChild(c) { this._kids = this._kids.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(v) { this._kids = []; this._text = String(v ?? ''); }
  get textContent() { return this._text + this._kids.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  focus() { document.activeElement = this; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
  querySelector(sel) {
    if (sel.startsWith('#')) return this.all().find((n) => n.id === sel.slice(1)) || null;
    if (sel.startsWith('.')) return this.all().find((n) => n.classList.contains(sel.slice(1))) || null;
    return null;
  }
  querySelectorAll(sel) { return sel.startsWith('.') ? this.all().filter((n) => n.classList.contains(sel.slice(1))) : []; }
}
globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  title: 'Space Radar',
  activeElement: null,
  hidden: false,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
  querySelector: (sel) => document.body.querySelector(sel) || document.documentElement.querySelector(sel),
  addEventListener() {},
  removeEventListener() {},
};
document.activeElement = document.body;
globalThis.window = globalThis;
const written = [];
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
globalThis.history = { replaceState(_s, _t, target) { written.push(String(target)); location.hash = String(target).startsWith('#') ? String(target) : ''; } };
const heard = new Map();
globalThis.addEventListener = (type, fn) => { if (!heard.has(type)) heard.set(type, new Set()); heard.get(type).add(fn); };
globalThis.removeEventListener = (type, fn) => { if (heard.has(type)) heard.get(type).delete(fn); };
globalThis.dispatchEvent = (e) => { for (const fn of [...(heard.get(e.type) || [])]) fn(e); return true; };
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
globalThis.cancelAnimationFrame = () => { frames.length = 0; };
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

export const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
export const { TOURS } = await import(join(JS, 'data/tours.js'));
export const { clock } = await import(join(JS, 'clock.js'));
export const { createCameraRig, FLIGHT_STEP_CAP_MS } = await import(join(JS, 'scene/camera.js'));
export const tripModule = await import(join(JS, 'ui/trip.js'));
export const { stage } = await import(join(JS, 'scene/stage.js'));

const card = (title) => ({ title, body: 'A fixture stop, with enough words for a dwell to be worth its eight seconds.' });
export const stopRow = (id, target, extra = {}) => ({
  id, target, frame_radii: 5, drift_deg: 0, drift_rate_deg_s: 6, drift: 'none', key_light_deg: 125,
  ease: 'auto', on_unresolved: 'drop', card: card(id), dwell_ms: 8000, ...extra,
});
export const fixture = (id, extra = {}) => ({
  id, title: `Fixture ${id}`, blurb: 'fixture', pacing: 'auto', requires: [], min_stops: 3, stage: 'earth',
  clock: 'as-found', estimate_ms: 3 * 11350,
  stops: [stopRow('one', { world: 'earth' }), stopRow('two', { world: 'moon' }), stopRow('three', { world: 'earth' })],
  ...extra,
});

export const settle = () => new Promise((resolve) => setImmediate(resolve));

/**
 * One machine on one rig. `step(frameMs)` is one frame of main.js: the wall moves on, the rig is
 * updated (unless `rigFrames` is false: frames the rig never sees), then the page's animation
 * frames run. `feed: 'clamped'` is what main.js did before internal #322 (the clamped step only).
 */
export function tripWorld({ feed = 'wall', rigFrames = true, select = null } = {}) {
  clock.live();
  stage.setWorld('earth');
  stage.setOrigin(null);
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const ctx = {
    camera, cameraRig: rig, clock,
    layers: [{ id: 'worlds', propagator: 'body' }],
    recordsFor: () => [], recordById: () => null, isLayerOn: () => true, setLayerOn() {},
    select(...a) { if (select) select(...a); }, deselect() {}, selected: () => null, observer: null,
  };
  const machine = tripModule.createTrip(ctx);
  ctx.trip = machine;
  const phases = [];
  machine.onChange((st) => {
    const key = `${st.tourId || '-'}:${st.phase}:${st.index}`;
    if (!phases.length || phases[phases.length - 1].key !== key) phases.push({ key, phase: st.phase, index: st.index, trip: st.tourId, at: time.wall });
  });
  const w = {
    ctx, rig, machine, phases, rigOn: rigFrames,
    async step(frameMs = 100) {
      time.wall += frameMs;
      time.real += frameMs;
      await settle();
      if (w.rigOn) { if (feed === 'wall') rig.update(Math.min(100, frameMs), frameMs); else rig.update(Math.min(100, frameMs)); }
      for (const fn of frames.splice(0, frames.length)) fn(time.wall);
      await settle();
    },
    async pass(ms, frameMs = 100, each = null) {
      for (let spent = 0; spent < ms; spent += frameMs) { await w.step(frameMs); if (each && each(w) === false) return; }
    },
    /** How long each stop of `trip` spent in `flight`, wall ms, by index (a stop still flying: until now). */
    flights(trip) {
      const out = {};
      phases.forEach((p, i) => {
        if (p.trip !== trip || p.phase !== 'flight') return;
        const end = phases[i + 1] ? phases[i + 1].at : time.wall;
        out[p.index] = (out[p.index] || 0) + (end - p.at);
      });
      return out;
    },
    done() { machine.dispose(); },
  };
  return w;
}
