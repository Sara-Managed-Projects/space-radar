// objectnow.js -- the one line on a static object page that answers "where is it now" (internal #294).
//
// The pages under /o/ are built at deploy time and carry no live number (scripts/build_seo.py), so a
// search engine quotes the lead sentence and the line under "See it live" says only that the map has
// the answer. For a planet, the Moon and the Sun this module works the answer out in the visitor's
// browser from their own clock with the same vendored Astronomy Engine the map uses, and rewrites
// that one line. Where it cannot (no module support, a failed import, a body it does not know) the
// static sentence stays, which is the fallback. Nothing is fetched but the library, and nothing is sent.
//
// No DOM at import: tests/test_objectnow.mjs runs the sentence in Node.

/** The bodies Astronomy Engine places by itself, by the name the page puts in `data-body`. */
export const BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Moon', 'Sun'];

const KM_PER_AU = 149597870.7;

function groups(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "2.31 au (346 million km)" for a planet or the Sun, "384 000 km" for the Moon: two to three figures, as the data allows. */
export function distanceWords(body, au) {
  const km = au * KM_PER_AU;
  if (body === 'Moon') return `${groups(Math.round(km / 1000) * 1000)} km`;
  const million = km / 1e6;
  return `${au >= 10 ? au.toFixed(1) : au.toFixed(2)} au (${million >= 100 ? Math.round(million) : million.toFixed(1)} million km)`;
}

/**
 * The sentence for `body` at `date`, or null when the library cannot place it. `A` is the astronomy
 * module (passed in so Node tests and the page share one function).
 */
export function nowSentence(A, body, date, name = body) {
  if (!BODIES.includes(body) || !A || !A.GeoVector) return null;
  const v = A.GeoVector(A.Body[body], date, true);        // geocentric, J2000 equator, light-time corrected
  const au = Math.hypot(v.x, v.y, v.z);
  const eq = A.EquatorFromVector(v);
  const con = A.Constellation(eq.ra, eq.dec).name;
  if (!(au > 0) || !con) return null;
  return `${name} is ${distanceWords(body, au)} from the Earth right now, in the constellation ${con}. `
    + 'Worked out in your browser from your clock; the live map shows it moving.';
}

/** On a page: rewrite `#now` when it names a body. Fails quietly to the static sentence. */
export async function start(doc = globalThis.document) {
  const el = doc && doc.getElementById('now');
  if (!el || !el.dataset.body) return;
  try {
    const A = await import('../vendor/astronomy.js');
    const text = nowSentence(A, el.dataset.body, new Date(), el.dataset.name || el.dataset.body);
    if (text) el.textContent = text;
  } catch { /* the static sentence stays */ }
}

if (typeof document !== 'undefined') start();
