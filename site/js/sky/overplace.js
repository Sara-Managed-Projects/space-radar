// sky/overplace.js -- which country or sea is under a point on the Earth, offline (spec 0048 req 2).
//
// Contract: loadPlaces(opts) -> Promise<places|null>; placesNow() -> places|null
//           placeAt(places, latDeg, lonDeg, borderKm) -> {kind, names}
// Pure and exported for tests/test_overplace.mjs: pngParts(bytes), decodePng16(bytes, inflate), placeAt
//
// WHY. The card said "Passing over 19.6 N, 110.9 E", which is true and tells nobody anything, and
// orbitalradar's follow mode says "Now passing over <country>". Nothing in site/ mapped a latitude
// and longitude to a name, and a reverse-geocoding service would send every followed station's
// ground point, and so the visitor's interest, to a third party.
//
// WHAT. site/data/places.png, a 2048 x 1024 equirectangular raster (about 20 km a pixel at the
// equator) with one 16-bit index per pixel, and site/data/places.json, the index -> name table,
// both built by scripts/build-places.py from Natural Earth 1:50m (public domain). 63 KB and 18 KB.
// Fetched on the first card for an Earth orbiter (ui/cards.js), never at boot; decoded here once,
// then every answer is an array read.
//
// THE PNG is decoded by hand rather than drawn into a canvas, because getImageData hands back
// colour, and a browser is free to colour-manage an image on the way there: an index that arrives
// as index +- 1 names the wrong country. Inflate is the platform's (DecompressionStream in the
// browser, zlib in node), the five PNG row filters are undone here, and nothing else is needed.
//
// THE BORDER RULE. A country pixel with another country's pixel within 50 km (an ellipse in pixels,
// wider in longitude towards the poles) reads "near the border of A and B" rather than guessing one:
// at 20 km a pixel the raster cannot place a ground point on the right side of a line to better
// than that. Plain land (Natural Earth's disputed and indeterminate areas) never names a flag.

const EARTH_KM_PER_DEG = 111.195;
export const BORDER_KM = 50;
const DATA = 'data/';

/** A PNG's header and its IDAT stream, still compressed. Greyscale, 8 or 16 bits, not interlaced. */
export function pngParts(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) throw new Error('not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  const idat = [];
  while (at < u8.length) {
    const len = dv.getUint32(at);
    const type = String.fromCharCode(u8[at + 4], u8[at + 5], u8[at + 6], u8[at + 7]);
    if (type === 'IHDR') {
      width = dv.getUint32(at + 8);
      height = dv.getUint32(at + 12);
      depth = u8[at + 16];
      if (u8[at + 17] !== 0 || u8[at + 20] !== 0 || (depth !== 8 && depth !== 16)) throw new Error('places.png must be plain greyscale');
    } else if (type === 'IDAT') {
      idat.push(u8.subarray(at + 8, at + 8 + len));
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + len;
  }
  const z = new Uint8Array(idat.reduce((n, b) => n + b.length, 0));
  let o = 0;
  for (const b of idat) { z.set(b, o); o += b.length; }
  return { width, height, depth, z };
}

/** PNG bytes -> {width, height, data: Uint16Array}, with a synchronous zlib `inflate` (node's). */
export function decodePng16(bytes, inflate) {
  const p = pngParts(bytes);
  return unfilter(inflate(p.z), p.width, p.height, p.depth);
}

function unfilter(raw, width, height, depth) {
  const bpp = depth / 8;
  const stride = width * bpp;
  const out = new Uint16Array(width * height);
  let prev = new Uint8Array(stride);
  let cur = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = raw[p++];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
    const row = y * width;
    if (bpp === 2) for (let x = 0; x < width; x++) out[row + x] = (cur[2 * x] << 8) | cur[2 * x + 1];
    else for (let x = 0; x < width; x++) out[row + x] = cur[x];
    const t = prev; prev = cur; cur = t;
  }
  return { width, height, data: out };
}

/**
 * What is under (lat, lon). `places` is {width, height, data, entries}.
 * @returns {{kind: 'country'|'sea'|'ocean'|'land'|'border'|'water', names: string[], the: boolean[]}}
 */
export function placeAt(places, latDeg, lonDeg, borderKm = BORDER_KM) {
  if (!places || !Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  const { width: W, height: H, data, entries } = places;
  const lon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  const lat = Math.max(-90, Math.min(90, latDeg));
  const x = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W));
  const y = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
  const idx = data[y * W + x];
  const e = entries[idx];
  if (!e) return { kind: 'water', names: [], the: [] };
  if (e.kind !== 'country') return { kind: e.kind, names: e.name ? [e.name] : [], the: [!!e.the] };
  // Another country within borderKm: an ellipse of pixels, wider in longitude towards the poles.
  const kmPerPxY = (180 / H) * EARTH_KM_PER_DEG;
  const kmPerPxX = (360 / W) * EARTH_KM_PER_DEG * Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const ry = Math.ceil(borderKm / kmPerPxY);
  const rx = Math.min(Math.ceil(borderKm / kmPerPxX), Math.floor(W / 4));
  let best = null;
  let bestD = Infinity;
  for (let dy = -ry; dy <= ry; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -rx; dx <= rx; dx++) {
      const d = Math.hypot(dx * kmPerPxX, dy * kmPerPxY);
      if (d > borderKm || d >= bestD) continue;
      const xx = (((x + dx) % W) + W) % W;
      const j = data[yy * W + xx];
      if (j === idx) continue;
      const o = entries[j];
      if (!o || o.kind !== 'country') continue;
      best = o;
      bestD = d;
    }
  }
  if (best) return { kind: 'border', names: [e.name, best.name], the: [!!e.the, !!best.the] };
  return { kind: 'country', names: [e.name], the: [!!e.the] };
}

// --- loading, once, on demand ----------------------------------------------------------------------

let loaded = null;
let loading = null;

/** The places, if they have loaded; null otherwise (never waits). */
export function placesNow() {
  return loaded;
}

async function inflateBrowser(z) {
  const ds = new DecompressionStream('deflate');
  const stream = new Blob([z]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Fetch and decode the raster and its table, once. Resolves to the places, or null when either file
 * cannot be read (the card then keeps its latitude and longitude, which are true without them).
 */
export function loadPlaces({ base = DATA, fetchFn = typeof fetch === 'function' ? fetch : null, inflate = null } = {}) {
  if (loaded) return Promise.resolve(loaded);
  if (loading) return loading;
  if (!fetchFn) return Promise.resolve(null);
  loading = (async () => {
    try {
      const [png, json] = await Promise.all([
        fetchFn(`${base}places.png`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))),
        fetchFn(`${base}places.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
      ]);
      const u8 = new Uint8Array(png);
      const decoded = inflate ? decodePng16(u8, inflate) : await decodeAsync(u8);
      loaded = { ...decoded, entries: json.entries };
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sr:places'));
      return loaded;
    } catch {
      loading = null; // a later card may try again
      return null;
    }
  })();
  return loading;
}

/** decodePng16 with the browser's asynchronous inflate. */
async function decodeAsync(u8) {
  const p = pngParts(u8);
  return unfilter(await inflateBrowser(p.z), p.width, p.height, p.depth);
}

/** For tests: forget what was loaded. */
export function resetPlaces() {
  loaded = null;
  loading = null;
}
