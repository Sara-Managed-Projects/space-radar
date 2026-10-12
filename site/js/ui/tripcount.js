// ui/tripcount.js -- one anonymous count when a person starts a trip (2026-10-12).
//
// WHY. "How many visitors start a trip" is the number this project steers by, and nothing could
// read it: a trip is `#trip=<id>`, a fragment the browser never sends, and the narration clips
// load only after a sound gesture. So when a trip really begins the page asks for one 43-byte
// file, `c/t.gif?trip=<id>`, and the web host's access log counts the lines.
//
// WHAT IS SENT, and it is all of it: the trip's id. No cookie (`credentials: 'omit'`), no
// referrer, no identifier, nothing kept in the browser, no third party.
//
// WHEN. Once per page load per trip, on the first change that shows the trip running (past
// `resolving`: a refused trip is not a start). Never for a reel -- autopilot or the ambient
// screen, where no person chose the trip -- and never under `present=auto`, a screen left to
// advance by itself.
//
// IT CAN NEVER CHANGE A TRIP. The request is not awaited, a failure is swallowed, and a throw
// from anything here is caught: offline, blocked or 404, the trip flies exactly the same.
const NOT_RUNNING = ['idle', 'resolving'];

/**
 * @param {object} o
 * @param {(url: string, init: object) => Promise<unknown>} [o.fetch]  the page's fetch
 * @param {() => boolean} [o.automatic]  true while no person is driving (a reel, present=auto)
 * @param {string} [o.path]  the file asked for, relative to the page
 * @returns {{ seen(state: {phase?: string, tourId?: string|null}): boolean, counted(): string[] }}
 */
export function createTripCount({ fetch: ask = globalThis.fetch, automatic = () => false, path = 'c/t.gif' } = {}) {
  const done = new Set();

  /** Called with the trip's state on every change. True when this call sent the count. */
  function seen(state) {
    try {
      const id = state && state.tourId;
      if (!id || NOT_RUNNING.includes(state.phase) || done.has(id)) return false;
      if (automatic()) return false;
      done.add(id);
      if (typeof ask !== 'function') return false;
      Promise.resolve(ask(`${path}?trip=${encodeURIComponent(id)}`, {
        credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
      })).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  return { seen, counted: () => [...done] };
}
