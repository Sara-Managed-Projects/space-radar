// ui/platform-bridge.js -- the one door between the open-source map and the Space Radar platform (accounts, favourites
// kept across sites, the stamp passport, analytics after consent). The platform's code is not in this repository: it is
// one script, https://account.spaceradar.ai/v1/platform.js, built from the private repository. The names below are
// the platform contract's (window.srq, the sr() commands, the `sr:platform` event); change them only with it.
//
// Contract: sr(cmd, ...args)            push [cmd, ...args] onto window.srq; never throws, never fetches
//           platformAllowed(loc)        true only on spaceradar.ai or *.spaceradar.ai, and not with ?sr-noplatform
//           loadPlatform(win)           adds the one async script tag where allowed; answers whether it did
//           onPlatform(cb, doc)         cb(detail) on each `sr:platform` event (and at once with the last one, if
//                                       one came before cb was there); returns the function that stops it
//           queue(win)                  window.srq, made if missing
//           PLATFORM_SRC, QUEUE_CAP
//
// WHAT THE QUEUE IS. A plain array. The page pushes commands as things happen; platform.js, once it has loaded, reads
// what is there and replaces `srq.push` with a direct call. Where it never loads (localhost, a fork, a school's copy, an
// embed, offline, a blocker) nothing reads the array and nothing leaves the page: the map is exactly the map it was.
// The array is held to QUEUE_CAP entries (the oldest dropped), so a screen left playing for a week holds a few kB.
//
// WHAT GOES IN IT. Ids, class names, layer and tab names, counts: never a name, a place or a word somebody typed,
// except a search's words cut to 60 characters (`search_term`), as the contract allows. track() refuses a nested value.

export const PLATFORM_SRC = 'https://account.spaceradar.ai/v1/platform.js';
export const QUEUE_CAP = 500;
const HOST = 'spaceradar.ai';
// The platform's last word, kept from the moment its script is added: the module that paints the rail may arrive after it.
let last = null;

/** window.srq, made if it is not there yet. */
export function queue(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return [];
  if (!Array.isArray(win.srq) && !(win.srq && typeof win.srq.push === 'function')) win.srq = [];
  return win.srq;
}

const flat = (v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

/** A command for the platform. Pushed, not sent: nothing here builds a request. */
export function sr(cmd, ...args) {
  try {
    if (typeof cmd !== 'string' || !cmd) return;
    if (cmd === 'track') {
      const [name, params] = args;
      if (typeof name !== 'string' || !name) return;
      const clean = {};
      for (const [k, v] of Object.entries(params && typeof params === 'object' ? params : {})) {
        if (!flat(v)) continue;
        clean[k] = k === 'search_term' && typeof v === 'string' ? v.slice(0, 60) : v;
      }
      args = [name, clean];
    }
    const q = queue();
    q.push([cmd, ...args]);
    // Only while it is our plain array: once platform.js has taken over `push`, it holds nothing.
    if (Array.isArray(q) && q.length > QUEUE_CAP && q.push === Array.prototype.push) q.splice(0, q.length - QUEUE_CAP);
  } catch { /* a command that could not be queued is a command not given */ }
}

/** Is this page one of ours, where the platform may run? Pure: `loc` is a Location or {hostname, search}. */
export function platformAllowed(loc) {
  if (!loc) return false;
  const host = String(loc.hostname || '').toLowerCase().replace(/\.$/, '');
  if (host !== HOST && !host.endsWith(`.${HOST}`)) return false;
  return !/[?&]sr-noplatform(?:[=&]|$)/.test(String(loc.search || ''));
}

/** Add the platform's script once, where the host check passes. Answers whether a tag is (or was already) there. */
export function loadPlatform(win = typeof window !== 'undefined' ? window : null) {
  try {
    if (!win || !win.document || !platformAllowed(win.location)) return false;
    queue(win);
    const doc = win.document;
    if (doc.querySelector(`script[src="${PLATFORM_SRC}"]`)) return true;
    doc.addEventListener('sr:platform', (e) => { last = (e && e.detail) || {}; });
    const s = doc.createElement('script');
    s.src = PLATFORM_SRC;
    s.async = true;
    (doc.head || doc.documentElement).appendChild(s);
    return true;
  } catch { return false; }
}

/** The platform's word about who is here: {signedIn, nickname, plan, ent, ...}. Never fired where it did not load. */
export function onPlatform(cb, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || typeof cb !== 'function') return () => {};
  const on = (e) => { try { cb((e && e.detail) || {}); } catch { /* the page goes on */ } };
  doc.addEventListener('sr:platform', on);
  if (last) { try { cb(last); } catch { /* the page goes on */ } }
  return () => doc.removeEventListener('sr:platform', on);
}
