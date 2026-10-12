// ctx.trip before a trip is wanted (2026-10-06, internal #405).
//
// WHY. ui/trip.js is 142 kB, the trips it flies (data/tours.js: 25 trips, 196 stops) are 128 kB,
// and with ui/cards.js and sky/lookfor.js they were 480 kB of a first visit that takes no trip.
// The boot graph imports this instead: the same object, with the same members, for as long as the
// page lives. It answers what the page asks while no trip runs -- an idle state, a small index of
// the trips for their cards (data/tours-index.js) -- and fetches ui/trip.js when a trip is opened,
// deep-linked or planned, or when main.js warms it in an idle moment after the layers settle.
//
// WHAT CHANGES FOR A CALLER, and it is one thing: start() and plan() answer after an import the
// first time. Both already returned promises. Everything else is the trip's own, forwarded.
//
//   state        the trip's own state object once it is here; one idle state (ui/tripstate.js, the
//                same literal ui/trip.js starts from) until then. Read it each time, as every
//                caller already does: the object changes identity once, when the module lands.
//   onChange     listeners registered before the module is here are handed to it when it lands
//   tours()      data/tours.js TOURS once loaded; TOURS_INDEX (id, title, blurb, group, next, count,
//                estimate_ms, event) until then. A caller that needs a trip's STOPS asks after
//                start() or plan() has resolved.
//   loaded       false until ui/trip.js is here; `sr:trips-loaded` on window says when it is
//   warm()       fetch it now -> Promise<the trip | null>
import { TOURS_INDEX } from '../data/tours-index.js';
import { idleTripState } from './tripstate.js';

export function createTripGate(ctx, load = () => import('./trip.js')) {
  const idle = idleTripState();
  const listeners = new Map(); // fn -> the real unsubscribe, or null while waiting
  let real = null;
  let asked = null;
  let pacing; // setPacing() before the module is here: applied when it lands

  function warm() {
    if (real) return Promise.resolve(real);
    if (!asked) {
      asked = Promise.resolve().then(load).then((m) => {
        real = m.createTrip(ctx);
        for (const fn of [...listeners.keys()]) listeners.set(fn, real.onChange(fn));
        if (pacing !== undefined) real.setPacing(pacing);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sr:trips-loaded'));
        return real;
      }).catch((e) => {
        asked = null;
        console.warn('the trips did not load', e && e.message);
        return null;
      });
    }
    return asked;
  }

  // What does nothing while no trip runs, and is the trip's own call once it is here.
  const forward = (name, before) => (...args) => (real ? real[name](...args) : before);

  return {
    start: (id) => warm().then((trip) => (trip ? trip.start(id) : null)),
    plan: (id) => warm().then((trip) => (trip ? trip.plan(id) : null)),
    play: forward('play'),
    stop: forward('stop'),
    next: forward('next'),
    back: forward('back'),
    replay: forward('replay'),
    jumpTo: forward('jumpTo'),
    pause: forward('pause'),
    resume: forward('resume'),
    holdDwell: forward('holdDwell'),
    dwellFraction: forward('dwellFraction', 0),
    currentRecordId: forward('currentRecordId', null),
    setPacing(mode) {
      if (real) return real.setPacing(mode);
      pacing = mode;
      return undefined;
    },
    onChange(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.set(fn, real ? real.onChange(fn) : null);
      return () => {
        const off = listeners.get(fn);
        listeners.delete(fn);
        if (off) off();
      };
    },
    tours: () => (real ? real.tours() : TOURS_INDEX),
    get state() { return real ? real.state : idle; },
    get loaded() { return !!real; },
    warm,
    dispose() { if (real) real.dispose(); listeners.clear(); },
  };
}
