// ui/urlstate.js -- the one place the URL hash is read and written.
//
// MEASURED 2026-09-08: there were two writers in two dialects. main.js wrote `#wonder` and read a
// bare word; ui/controls.js wrote `#m=wonder` and read a key=value pair. A shared `#m=now` link
// therefore booted main.js into Wonder while the panel said Now, and a moment change from the
// panel could bounce the app back through the hashchange listener. Spec 0017 (share a view) wants
// the hash to carry more keys later; that only works if exactly one module owns the format.
//
// Format: `#k=v&k2=v2`. Other keys are left alone when one is written. On READ the old bare form
// (`#now`) is still accepted, so links people already shared keep working; on WRITE only the
// keyed form is produced.

export const HASH_KEY = 'm';

export function hashParts() {
  const raw = (typeof location !== 'undefined' ? location.hash : '') || '';
  return raw.replace(/^#/, '').split('&').filter(Boolean);
}

/** The moment the hash names, or null. `valid` is the list of moment ids the app knows. */
export function readMoment(valid) {
  const ids = Array.isArray(valid) ? valid : [];
  for (const part of hashParts()) {
    const eq = part.indexOf('=');
    if (eq < 0) {
      // Legacy: `#now`, and `#now/anything` from the very first build.
      const bare = part.split('/')[0];
      if (ids.includes(bare)) return bare;
      continue;
    }
    if (part.slice(0, eq) === HASH_KEY) {
      const value = part.slice(eq + 1);
      if (ids.includes(value)) return value;
    }
  }
  return null;
}

/** Write the moment, keeping every other key. replaceState, so it does not pile up history. */
export function writeMoment(moment) {
  const parts = hashParts().filter((p) => p.indexOf('=') > 0); // drop any legacy bare word
  let found = false;
  const next = parts.map((part) => {
    const eq = part.indexOf('=');
    if (part.slice(0, eq) === HASH_KEY) {
      found = true;
      return `${HASH_KEY}=${moment}`;
    }
    return part;
  });
  if (!found) next.unshift(`${HASH_KEY}=${moment}`);
  const target = `#${next.join('&')}`;
  if (typeof location === 'undefined' || location.hash === target) return;
  try {
    history.replaceState(null, '', target);
  } catch {
    location.hash = target;
  }
}
