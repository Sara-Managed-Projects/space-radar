// scene/stars3dworker.js -- the 3D star map's AT-HYG nodes, fetched and decoded off the main thread (forge #140).
//
// Contract (messages):
//   in  { type: 'open', url }                    set.json's address; the worker reads it once
//   in  { type: 'view', cam: [x, y, z], limit, nodes }   the camera in light-years (ecliptic J2000, the Sun at 0)
//   in  { type: 'reset' }                        the page made its buffers again: everything is to be sent afresh
//   out { type: 'set', count, tiles, bytes, bright }   once, when set.json has been read
//   out { type: 'want', keys }                   the nodes this view holds (scene/stars3dtree.js selectNodes), most needed first
//   out { type: 'node', key, posLy, absMag, bv, ref, src }   one node's stars, the arrays transferred
//   out { type: 'error', what }                  set.json did not load: the map keeps HYG
//
// A node is fetched at most two at a time, the most needed first; a node a newer view no longer wants is not fetched,
// and one that arrives after it stopped being wanted is not sent. The page keeps what it was sent (scene/stars3dtiles.js),
// so the worker remembers nothing but what it has sent and not been told to forget: a 'want' the page drops a node for
// is the page's to act on. The bytes come through the browser's cache (the files keep their names within a build: the
// build stamp in every tile, checked by decodeTile, catches a tile of another, which is fetched once more past the caches).

import { parseSet, decodeTile, TileError } from '../data/tilecloud.js';
import { indexSet, selectNodes, decodeNode } from './stars3dtree.js';

const AT_ONCE = 2;
let base = '';
let index = null;
let opening = null;
let wanted = [];
const sent = new Set();
const inFlight = new Set();

async function open(url) {
  base = url.slice(0, url.lastIndexOf('/') + 1);
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const doc = parseSet(await r.json());
  index = doc ? indexSet(doc) : null;
  if (!index) throw new Error('set.json is not an octree set this page can read');
  postMessage({ type: 'set', count: doc.count, tiles: doc.tiles.length, bytes: doc.tiles.reduce((n, t) => n + t.bytes, 0), bright: doc.bright_from_sun });
}

async function fetchNode(i) {
  const t = index.tiles[i];
  inFlight.add(t.key);
  try {
    const bytes = async (reload) => {
      const r = await fetch(base + t.path, reload ? { cache: 'reload' } : undefined);
      if (!r.ok) throw new Error(`${t.path}: HTTP ${r.status}`);
      return r.arrayBuffer();
    };
    let got;
    try { got = decodeTile(index.doc, await bytes(false)); } catch (e) {
      // a cache (the browser's, the service worker's, a CDN edge) still holds the last build's tile: once more past it
      if (!(e instanceof TileError) || !/another build/.test(e.message)) throw e;
      got = decodeTile(index.doc, await bytes(true));
    }
    if (!wanted.includes(i)) return; // the camera moved on while it was on its way
    const s = decodeNode(index.doc, t, got.cols);
    const ref = new Uint32Array(s.ref);
    const src = new Uint8Array(s.src);
    sent.add(t.key);
    postMessage({ type: 'node', key: t.key, posLy: s.posLy, absMag: s.absMag, bv: s.bv, ref, src }, [s.posLy.buffer, s.absMag.buffer, s.bv.buffer, ref.buffer, src.buffer]);
  } catch (e) {
    postMessage({ type: 'error', what: String((e && e.message) || e).slice(0, 200), key: t.key });
  } finally {
    inFlight.delete(t.key);
    pump();
  }
}

function pump() {
  for (const i of wanted) {
    if (inFlight.size >= AT_ONCE) return;
    const key = index.tiles[i].key;
    if (!sent.has(key) && !inFlight.has(key)) fetchNode(i);
  }
}

function view(msg) {
  wanted = selectNodes(index, msg.cam, { limit: msg.limit, nodes: msg.nodes });
  const keep = new Set(wanted.map((i) => index.tiles[i].key));
  for (const k of [...sent]) if (!keep.has(k)) sent.delete(k); // the page drops these on 'want'
  postMessage({ type: 'want', keys: [...keep] });
  pump();
}

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === 'open' && !opening) {
    opening = open(msg.url).catch((err) => postMessage({ type: 'error', what: String((err && err.message) || err).slice(0, 200) }));
  } else if (msg.type === 'reset') {
    sent.clear(); // the page made its buffers again and holds nothing
  } else if (msg.type === 'view' && opening) {
    opening.then(() => { if (index) view(msg); });
  }
};
