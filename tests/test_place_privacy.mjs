// "Use my location" is rounded to 0.1 degree before it is kept, shown or used (spec 0051 req 3;
// internal #137: ui/place.js used to pass the browser's coordinates on at full precision).
//   node tests/test_place_privacy.mjs
//
// Three things are held: (1) the rounding itself, at awkward values; (2) the click path, driven
// with a fake document and a fake navigator.geolocation, hands the app only rounded numbers and
// none of the other fields a position carries; (3) statically, `position.coords` is read in one
// function only, the app's one door rounds again, and no file keeps a place in storage, in the
// address or in a request.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const tenth = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;

// --- 1. the rounding ----------------------------------------------------------------------------
const { roundPlace } = await import(join(ROOT, 'site/js/sky/guessplace.js'));
for (const [lat, lon, wantLat, wantLon] of [
  [52.520008, 13.404954, 52.5, 13.4],
  [-33.868820, 151.209296, -33.9, 151.2],
  [0.04, -0.04, 0, 0],
  [89.96, 179.97, 90, 180],
  [40.7127753, -74.0059728, 40.7, -74],
]) {
  const o = roundPlace({ latDeg: lat, lonDeg: lon, latRad: 1, lonRad: 1, source: 'geolocation' });
  check(Math.abs(o.latDeg - wantLat) < 1e-9 && Math.abs(o.lonDeg - wantLon) < 1e-9, `${lat}, ${lon} rounds to ${wantLat}, ${wantLon}: got ${o.latDeg}, ${o.lonDeg}`);
  check(Math.abs(o.latRad - o.latDeg * Math.PI / 180) < 1e-12 && Math.abs(o.lonRad - o.lonDeg * Math.PI / 180) < 1e-12, 'the radians are derived from the ROUNDED degrees, not carried over');
}

// --- 2. the click path --------------------------------------------------------------------------
function fakeNode(tag) {
  const node = {
    tagName: tag, children: [], listeners: {}, attrs: {}, hidden: false, textContent: '', className: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {},
    appendChild(c) { node.children.push(c); return c; },
    append(...cs) { node.children.push(...cs); },
    removeChild(c) { node.children = node.children.filter((x) => x !== c); },
    get firstChild() { return node.children[0] || null; },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k] ?? null; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    removeEventListener() {},
  };
  return node;
}
const all = [];
globalThis.document = { createElement: (tag) => { const n = fakeNode(tag); all.push(n); return n; } };
globalThis.window = { isSecureContext: true, addEventListener() {}, removeEventListener() {} };
const PRECISE = { latitude: 48.858370, longitude: 2.294481, accuracy: 12, altitude: 35.4, altitudeAccuracy: 3, heading: 77, speed: 1.2 };
let asked = 0;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { geolocation: { getCurrentPosition(ok) { asked += 1; ok({ coords: PRECISE, timestamp: 1 }); } } },
});
const { createPlace, placeFromPosition } = await import(join(ROOT, 'site/js/ui/place.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const handed = [];
const ctx = { observer: null, setObserver(o) { handed.push(o); ctx.observer = o; }, clock: { now: () => Date.UTC(2026, 9, 7) }, recordsFor: () => [] };
createPlace(ctx);
check(asked === 0, 'the browser is not asked until the button is pressed');
const useMine = all.find((n) => n.tagName === 'button' && n.textContent === COPY.controls.locationUseMine);
check(!!useMine, 'the Use my location button is built');
if (useMine) for (const fn of useMine.listeners.click || []) fn({});
check(asked === 1 && handed.length === 1, `one press asks once and sets one place (asked ${asked}, set ${handed.length})`);
const got = handed[0] || {};
check(got.source === 'geolocation', 'the place says it came from the browser');
check(tenth(got.latDeg) && tenth(got.lonDeg) && Math.abs(got.latDeg - 48.9) < 1e-9 && Math.abs(got.lonDeg - 2.3) < 1e-9, `the app is handed 48.9, 2.3: got ${got.latDeg}, ${got.lonDeg}`);
check(Math.abs(got.latRad * 180 / Math.PI - 48.9) < 1e-9 && Math.abs(got.lonRad * 180 / Math.PI - 2.3) < 1e-9, 'the radians handed on are the rounded place too');
const blob = JSON.stringify(got);
for (const secret of ['48.858', '2.2944', '35.4', '"accuracy"', '"altitude"', '"heading"', '"speed"']) {
  check(!blob.includes(secret), `nothing precise is handed on (${secret} in ${blob})`);
}
check(!all.some((n) => /48\.85|2\.29/.test(String(n.textContent)) || Object.values(n.attrs).some((v) => /48\.85|2\.29/.test(v))), 'nothing on the page shows the precise numbers');
check(typeof placeFromPosition === 'function' && placeFromPosition({ coords: {} }, 'x') === null && placeFromPosition(null, 'x') === null, 'a position with no numbers is no place, not NaN');

// --- 3. statically: one reader, one door, nowhere to keep it --------------------------------------
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
function jsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'vendor') jsFiles(p, out); } else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = jsFiles(join(ROOT, 'site/js'));
const askers = files.filter((f) => /getCurrentPosition|watchPosition/.test(strip(readFileSync(f, 'utf8')))).map((f) => f.slice(ROOT.length + 1));
check(askers.length === 1 && askers[0] === 'site/js/ui/place.js', `only ui/place.js asks the browser where it is: ${askers.join(', ')}`);
check(!files.some((f) => /watchPosition/.test(strip(readFileSync(f, 'utf8')))), 'the place is asked for once, never watched');
const place = strip(read('site/js/ui/place.js'));
const fn = place.slice(place.indexOf('export function placeFromPosition'), place.indexOf('export function observerFor'));
check(/roundPlace\(/.test(fn), 'placeFromPosition rounds');
check(!/\.coords|\.latitude|\.longitude/.test(place.replace(fn, '')), 'ui/place.js reads position.coords in placeFromPosition and nowhere else');
check(/enableHighAccuracy:\s*false/.test(place), 'the browser is not asked for a high-accuracy fix');
check(!/localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|location\.(hash|search|href)\s*=|history\.(push|replace)State/.test(place), 'ui/place.js touches no storage, request or address itself: keeping and sharing go through sky/placelink.js');
const main = strip(read('site/js/main.js'));
check(/setObserver:\s*\(o\)\s*=>\s*\{\s*observer = o && o\.source === 'geolocation' \? roundPlace\(o\) : o;/.test(main), "main.js setObserver, the one door, rounds a 'geolocation' place again");
check(/detail:\s*observer\b/.test(main.slice(main.indexOf('setObserver: (o)'), main.indexOf('setObserver: (o)') + 300)), 'the sr:observer event carries the rounded place, not the argument');
// Nothing writes an observer's coordinates to storage or into the address (a `p=` key is spec 0051's
// share path, not built; when it is, it must be for a SET place only and this line changes with it).
for (const f of files) {
  const src = strip(readFileSync(f, 'utf8'));
  const rel = f.slice(ROOT.length + 1);
  for (const m of src.matchAll(/(?:localStorage|sessionStorage)\.setItem\(([^;]{0,200})/g)) {
    check(!/observer|latDeg|lonDeg|latRad|lonRad|PLACE_KEY/.test(m[1]) || rel === 'site/js/sky/placelink.js', `${rel} stores a place: ${m[0].slice(0, 80)}`);
  }
}
// --- 4. Remember this place, and share a place (internal #137) -----------------------------------
// The one file that keeps a place or writes one into a link, and it only ever handles 0.1 degree.
const pl = await import(join(ROOT, 'site/js/sky/placelink.js'));
const keepers = files.filter((f) => /PLACE_KEY|sr\.place/.test(strip(readFileSync(f, 'utf8')))).map((f) => f.slice(ROOT.length + 1));
check(keepers.length === 1 && keepers[0] === 'site/js/sky/placelink.js', `only sky/placelink.js knows the key a place is kept under: ${keepers.join(', ')}`);
const preciseO = { latDeg: 48.858370, lonDeg: 2.294481, latRad: 0.8527, lonRad: 0.04, altKm: 0.035, name: 'Use my location', source: 'geolocation', accuracy: 12 };
check(pl.placeValue(preciseO) === '48.9,2.3', `a link's place is rounded to 0.1 degree (${pl.placeValue(preciseO)})`);
check(pl.placeValue({ latDeg: -33.86882, lonDeg: 151.209296, source: 'city' }) === '-33.9,151.2', 'south and east too');
check(pl.placeValue({ latDeg: 0.04, lonDeg: -0.04, source: 'city' }) === '0,0', `no "-0" (${pl.placeValue({ latDeg: 0.04, lonDeg: -0.04, source: 'city' })})`);
check(pl.placeValue({ ...preciseO, source: 'guess' }) === '' && pl.placeValue(null) === '' && pl.placeValue({ latDeg: 91, lonDeg: 0 }) === '', 'a guessed place, no place and an impossible place make no link');
const back = pl.parsePlaceValue('48.9,2.3');
check(back && back.latDeg === 48.9 && back.lonDeg === 2.3 && back.source === 'shared' && Math.abs(back.latRad - 48.9 * Math.PI / 180) < 1e-12 && !('name' in back), 'and it reads back as a shared place with no name');
for (const bad of ['48.85837,2.294481', '48.9', '48.9,2.3,5', 'x,y', '91,0', '0,181', '', null, '48.9, 2.3;drop', '1e1,2']) check(pl.parsePlaceValue(bad) === null, `a value this app never writes is refused: ${JSON.stringify(bad)}`);
const mem = new Map();
const store = { setItem: (k, v) => mem.set(k, String(v)), getItem: (k) => (mem.has(k) ? mem.get(k) : null), removeItem: (k) => mem.delete(k) };
check(pl.keptPlace(store) === null, 'nothing is kept until asked');
check(pl.keepPlace(store, preciseO) === true, 'Remember this place keeps it');
const stored = mem.get(pl.PLACE_KEY);
check(stored === '{"p":"48.9,2.3","name":""}', `what is kept is the rounded place and nothing else: no accuracy, height, radians or label (${stored})`);
check(!/48\.85|2\.29|accuracy|altKm|0\.035/.test(stored), 'no precise digit reaches storage');
const kept = pl.keptPlace(store);
check(kept && kept.latDeg === 48.9 && kept.lonDeg === 2.3 && kept.source === 'kept', 'and it comes back as a kept place');
pl.keepPlace(store, { latDeg: 51.5074, lonDeg: -0.1278, name: 'London', source: 'city' });
check(mem.get(pl.PLACE_KEY) === '{"p":"51.5,-0.1","name":"London"}', `a city from the bundled list keeps its name (${mem.get(pl.PLACE_KEY)})`);
check(pl.keepPlace(store, { ...preciseO, source: 'guess' }) === false, 'a guessed place is not kept');
pl.forgetPlace(store);
check(pl.keptPlace(store) === null && mem.size === 0, 'Forget this place removes it');
mem.set(pl.PLACE_KEY, '{"p":"48.85837,2.294481"}');
check(pl.keptPlace(store) === null, 'a kept value finer than 0.1 degree (not ours) is not used');
const { shareUrl } = await import(join(ROOT, 'site/js/ui/share.js'));
const placeShareUrl = (await import(join(ROOT, 'site/js/ui/place.js'))).placeLink;
check(placeShareUrl(pl.placeValue(preciseO), 'https://example.org/') === 'https://example.org/#p=48.9%2C2.3', `the place link carries the rounded place only (${placeShareUrl(pl.placeValue(preciseO), 'https://example.org/')})`);
check(placeShareUrl('', 'https://example.org/') === '', 'no place, no link');
check(!/[#&]p=/.test(shareUrl({ at: 'sat-25544', t: '2026-10-08T00:00:00Z' }, 'https://example.org/')), 'an ordinary share has no p');
check(!/[#&]p=/.test(shareUrl({ at: 'sat-25544', p: '48.9,2.3' }, 'https://example.org/')), 'and cannot: ui/share.js shareUrl has no place key, so a tab opened on a place link does not pass the place on');
const mainSrc = strip(read('site/js/main.js'));
check(/parsePlaceValue\(readUrlKeys\(\)\.p\) \|\| keptPlace\(browserStorage\(\)\)/.test(mainSrc), 'at boot a place comes from the link, else from what this browser kept');
check(!/fetch\(|sendBeacon|XMLHttpRequest/.test(strip(read('site/js/sky/placelink.js'))), 'sky/placelink.js makes no request');

const url = strip(read('site/js/ui/urlstate.js'));
check(!/observer|latDeg|lonDeg/.test(url), 'ui/urlstate.js writes no place into the address');
// The words: a rounded place is "near", in both lines that speak of the browser's answer.
const laterSrc = read('site/js/copy/en.later.js');
check(/placeMine:\s*'[^']*\bnear\b[^']*'/.test(laterSrc), 'the Tonight line for the browser\'s place says "near"');
check(/\bnear\b/.test(COPY.trip.observerDevice), 'the trip line for the browser\'s place says "near"');

if (problems.length) { console.error('place privacy FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('place privacy ok: Use my location is rounded to 0.1 degree where it is read and again at the one door; the click path hands on 48.9, 2.3 and nothing else; Remember this place keeps "48.9,2.3" and nothing else, in this browser; Share this place makes #p=48.9,2.3; an ordinary share carries no place; no request');
