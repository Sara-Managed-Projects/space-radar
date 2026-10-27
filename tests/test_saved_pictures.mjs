// The three feeds that live outside data/sources.js read our saved copy first too: the live clouds, the lightning
// map and the aurora forecast (internal spec 0078, stage r14-data; data/readorder.js is the order).
//   node tests/test_saved_pictures.mjs
//
// For each: a fresh copy is drawn and the publisher is not asked; a copy past its valid_until is drawn at once and
// the publisher is asked BEHIND it; no copy (or an unreadable one) means the publisher; the publisher failing
// leaves what is drawn alone. The files are the harvester's own shape (tests/fixtures/harvest/gibs_clouds.json and
// nowcoast_lightning.json are what harvest/parsers/*.py save).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const fixture = (n) => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest', n), 'utf8'));
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const N = Date.now();
const H = 3600e3;
const wrap = (id, body, fetchedAt, validUntil) => JSON.stringify({ schema: 1, source: id, fetched_at: iso(fetchedAt), valid_until: iso(validUntil), upstream_url: 'x', content_type: 'application/json', items: 1, body });

// A bucket and a publisher that answer from tables and remember the order they were asked in.
function net({ saved = {}, publisher = {} }) {
  const calls = [];
  const fetchImpl = async (url) => {
    url = String(url);
    const k = url.includes('data/v1/') ? 'saved' : 'publisher';
    calls.push(k + ':' + (url.includes('data/v1/') ? decodeURIComponent(url.split('/').pop()) : url.split('?')[0].split('/').pop() + (url.includes('GetCapabilities') ? '#caps' : '')));
    const table = k === 'saved' ? saved : publisher;
    const key = Object.keys(table).find((x) => url.includes(x));
    if (!key) return { ok: false, status: 404, text: async () => 'no', blob: async () => new Blob([]) };
    const v = table[key];
    if (v instanceof Error) throw v;
    return { ok: true, status: 200, text: async () => v.text ?? v, blob: async () => v.blob ?? new Blob([]) };
  };
  return { fetchImpl, calls };
}

// ---- lightning -----------------------------------------------------------------------------------------------
{
  const { createLightning } = await import(join(ROOT, 'site/js/scene/weather/lightning.js'));
  const { GRID_W, GRID_H } = await import(join(ROOT, 'site/js/data/lightning.js'));
  const body = fixture('nowcoast_lightning.json');
  const slot = Date.parse(body.slot);
  const png = Buffer.from(body.base64, 'base64');
  const decodeImage = async (blob) => { decodeImage.size = blob.size; return { data: new Uint8ClampedArray(GRID_W * GRID_H * 4), width: GRID_W, height: GRID_H }; };
  const caps = (ms) => `<Dimension name="time" default="${new Date(ms).toISOString()}" units="ISO8601">x</Dimension>`;
  const make = (n) => createLightning({ earth: null, now: () => N, fetchImpl: n.fetchImpl, decodeImage });

  let n = net({ saved: { 'noaa-lightning': wrap('noaa-lightning', body, N - 5 * 60e3, N + 10 * 60e3) } });
  let w = make(n);
  await w.lookNow();
  let st = w.state();
  check(st.via === 'snapshot' && st.slotMs === slot && st.phase === 'live' && decodeImage.size === png.length, `a fresh saved map is read and decoded (${st.via}, ${st.phase}, ${decodeImage.size})`);
  check(n.calls.join() === 'saved:noaa-lightning.json', `and NOAA is not asked (${n.calls})`);

  n = net({ saved: { 'noaa-lightning': wrap('noaa-lightning', body, N - 50 * 60e3, N - 35 * 60e3) }, publisher: { GetCapabilities: caps(slot + 45 * 60e3), 'TIME=': { blob: new Blob([png]) } } });
  w = make(n);
  await w.lookNow();
  st = w.state();
  check(n.calls[0] === 'saved:noaa-lightning.json' && n.calls[1].endsWith('#caps'), `a saved map past its valid_until: read first, then NOAA behind it (${n.calls})`);
  check(st.via === 'live' && st.slotMs === slot + 45 * 60e3, `and the newer slot replaces it (${st.via}, ${st.slotMs - slot})`);

  n = net({ saved: { 'noaa-lightning': wrap('noaa-lightning', body, N - 50 * 60e3, N - 35 * 60e3) }, publisher: { GetCapabilities: new Error('offline') } });
  w = make(n);
  await w.lookNow();
  st = w.state();
  check(st.slotMs === slot && st.via === 'snapshot' && st.phase === 'live', `NOAA failing behind a stale copy leaves it drawn (${st.via}, ${st.phase}, ${st.lastError})`);

  n = net({ saved: {}, publisher: { GetCapabilities: caps(slot), 'TIME=': { blob: new Blob([png]) } } });
  w = make(n);
  await w.lookNow();
  st = w.state();
  check(n.calls[0] === 'saved:noaa-lightning.json' && st.via === 'live' && st.slotMs === slot, `no saved map: NOAA (${n.calls}, ${st.via})`);

  n = net({ saved: {}, publisher: { GetCapabilities: new Error('offline') } });
  w = make(n);
  await w.lookNow();
  check(w.state().phase === 'failed' && w.state().slotMs !== slot, 'neither: nothing drawn, nothing invented');
}

// ---- the live clouds -----------------------------------------------------------------------------------------
{
  const { createLiveClouds } = await import(join(ROOT, 'site/js/scene/liveclouds.js'));
  const body = fixture('gibs_clouds.json');
  const slotMs = Date.parse(body.satellites['goes-east'].slot);
  const composer = () => { const c = { pictures: [], kind: 'fake', async picture(id, lon, blob) { c.pictures.push([id, blob.size]); return { ok: true }; }, async compose() { c.composed = (c.composed || 0) + 1; return { data: null }; } }; return c; };
  const make = (n, c) => createLiveClouds({ earth: null, now: () => N, fetchImpl: n.fetchImpl, composerImpl: c });
  const dom = (ms) => `<Domains><DimensionDomain><Domain>${iso(ms - 3 * H)}/${iso(ms)}/PT10M</Domain></DimensionDomain></Domains>`;
  const wms = new Blob([new Uint8Array(60000)]);

  let c = composer();
  let n = net({ saved: { 'gibs-clouds': wrap('gibs-clouds', body, N - 20 * 60e3, N + 40 * 60e3) } });
  let w = make(n, c);
  await w.lookNow();
  let s = w.state();
  check(c.pictures.length === 1 && c.pictures[0][0] === 'goes-east' && c.pictures[0][1] === body.satellites['goes-east'].bytes, `a fresh saved picture is composed (${JSON.stringify(c.pictures)})`);
  check(s.satellites.length === 1 && s.satellites[0].via === 'snapshot' && s.capturedMs === slotMs && s.phase === 'live', `and held as the saved copy's (${JSON.stringify(s.satellites)}, ${s.phase})`);
  check(n.calls.every((x) => x.startsWith('saved:')), `NASA is not asked (${n.calls})`);
  check(c.composed === 1, 'and the Earth is composed once, at once');

  c = composer();
  n = net({ saved: { 'gibs-clouds': wrap('gibs-clouds', body, N - 3 * H, N - 2 * H) }, publisher: { wmts: { text: dom(slotMs + 90 * 60e3) }, 'wms.cgi': { blob: wms } } });
  w = make(n, c);
  await w.lookNow();
  s = w.state();
  check(n.calls[0] === 'saved:gibs-clouds.json' && n.calls.some((x) => x.startsWith('publisher:')), `a saved picture past its valid_until: read first, NASA asked behind it (${n.calls.slice(0, 3)})`);
  check(c.composed === 2, `drawn twice: the saved copy at once, then what NASA added (${c.composed})`);
  check(s.satellites.find((x) => x.id === 'goes-east').via === 'live' && s.newestMs > slotMs, `the newer slot replaced it (${JSON.stringify(s.satellites.find((x) => x.id === 'goes-east'))})`);

  c = composer();
  n = net({ saved: { 'gibs-clouds': wrap('gibs-clouds', body, N - 3 * H, N - 2 * H) }, publisher: { wmts: new Error('offline'), 'wms.cgi': new Error('offline') } });
  w = make(n, c);
  await w.lookNow();
  s = w.state();
  check(s.satellites.length === 1 && s.satellites[0].via === 'snapshot' && s.phase === 'live', `NASA failing behind a stale copy leaves it drawn (${s.phase})`);

  c = composer();
  n = net({ saved: {}, publisher: { wmts: { text: dom(N) }, 'wms.cgi': { blob: wms } } });
  w = make(n, c);
  await w.lookNow();
  s = w.state();
  check(n.calls[0] === 'saved:gibs-clouds.json' && s.satellites.length === 3 && s.satellites.every((x) => x.via === 'live'), `no saved copy: NASA, as before (${s.satellites.length} satellites)`);
}

// ---- the aurora ----------------------------------------------------------------------------------------------
{
  const { createAurora } = await import(join(ROOT, 'site/js/scene/aurora.js'));
  const ovation = brotliDecompressSync(readFileSync(join(ROOT, 'tests/fixtures/ovation/quiet-2026-09-30T1938Z.json.br'))).toString('utf8');
  const parsed = JSON.parse(ovation);
  const make = (n) => createAurora({ earth: null, now: () => N, fetchImpl: n.fetchImpl });

  let n = net({ saved: { 'swpc-ovation': wrap('swpc-ovation', parsed, N - 5 * 60e3, N + 10 * 60e3) }, publisher: { ovation: ovation } });
  let a = make(n);
  let ok = await a.lookNow();
  check(ok === true && a.state().via === 'snapshot' && n.calls.join() === 'saved:swpc-ovation.json', `a fresh saved forecast is read and NOAA is not asked (${ok}, ${a.state().via}, ${n.calls})`);

  n = net({ saved: { 'swpc-ovation': wrap('swpc-ovation', parsed, N - 2 * H, N - 105 * 60e3) }, publisher: { ovation } });
  a = make(n);
  ok = await a.lookNow();
  check(n.calls[0] === 'saved:swpc-ovation.json' && n.calls[1] === 'publisher:ovation_aurora_latest.json', `a stale saved forecast: read first, NOAA behind it (${n.calls})`);
  check(ok === true && a.state().via === 'live', `and NOAA's answer is the one held (${a.state().via})`);

  n = net({ saved: { 'swpc-ovation': wrap('swpc-ovation', parsed, N - 2 * H, N - 105 * 60e3) }, publisher: { ovation: new Error('offline') } });
  a = make(n);
  ok = await a.lookNow();
  check(ok === true && a.state().via === 'snapshot' && a.state().lastError === null, `NOAA failing behind a stale copy: the copy stays and no error is shown (${ok}, ${a.state().via}, ${a.state().lastError})`);

  n = net({ saved: {}, publisher: { ovation } });
  a = make(n);
  ok = await a.lookNow();
  check(ok === true && a.state().via === 'live' && n.calls.join() === 'saved:swpc-ovation.json,publisher:ovation_aurora_latest.json', `no saved forecast: NOAA (${n.calls})`);

  n = net({ saved: {}, publisher: { ovation: new Error('offline') } });
  a = make(n);
  ok = await a.lookNow();
  check(ok === false && a.state().lastError, `neither: failed, and said (${ok})`);
}

// ---- the worker speaks the same order ------------------------------------------------------------------------
{
  const w = readFileSync(join(ROOT, 'site/js/scene/auroraworker.js'), 'utf8');
  check(/m\.saved/.test(w) && /fetchSaved\(m\.url\)/.test(w) && /file\.schema !== 1/.test(w), 'the aurora worker reads a saved copy when asked to, and checks it is a snapshot file');
  const a = readFileSync(join(ROOT, 'site/js/scene/aurora.js'), 'utf8');
  check(a.indexOf("ask(savedOvationUrl(), { saved: true })") > 0 && a.indexOf("ask(savedOvationUrl(), { saved: true })") < a.indexOf('await ask(OVATION_URL)'), 'scene/aurora.js asks for the saved copy before NOAA');
  check(/document\.baseURI/.test(a), 'and gives the worker an address from the page, not one relative to the worker');
}

if (problems.length) { console.error('SAVED PICTURES FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('saved pictures ok: clouds, lightning and aurora read our copy first, ask the publisher behind a stale one or in place of a missing one, and keep what is drawn when it fails');
