// scene/liveclouds.js -- today's clouds on the Earth, from NASA GIBS, fetched by the browser.
//
// Contract:
//   createLiveClouds({ earth, now?, fetchImpl?, saveData?, onChange? })
//     .start()                 schedules the first look START_DELAY_MS after it is called
//     .tick(clockMs)           once a frame: live or static, by data/gibs.js cloudMode
//     .state()                 what is held: capture times, satellites, bytes, why not live
//     .line(clockMs)           the Earth card's sentence about its clouds (copy/en.js)
//     .credit()                the Sources panel's credit lines
//
// Built 2026-09-28 (realism study phase 2, option (c): browser-only, no new infrastructure).
//
// WHAT IT COSTS AND WHEN. Nothing on the boot path: the first request leaves START_DELAY_MS after
// the first frame and then waits for an idle moment, so the first visit's 2.5 MB budget (spec
// 0044) is untouched. A look is three ~380-byte DescribeDomains answers, then one 2048 x 1024 JPEG
// (186-246 KB, 2-3 s) per satellite that has a newer picture than the one held -- about 670 KB the
// first time and about the same every REFRESH_MS while the tab is visible, because each satellite
// takes a picture every ten minutes. NASA sends `no-store`, so nothing is cached; that is why it
// asks for a picture only when the slot is new. A hidden tab asks for nothing, and `saveData` (a
// metered or 2G/3G connection, scene/quality.js) switches the live clouds off entirely.
//
// WHAT IS LIVE AND WHAT IS NOT. GOES-East, GOES-West and Himawari see about 60 % of the globe
// between them; the Europe, Africa and Indian Ocean sector (6.5 E to 60.6 E) and the poles are not
// in any GIBS geostationary layer, and there the static map shows through a soft seam
// (scene/cloudcompose.js). The card says both halves. Motion is one picture replacing the last,
// cross-faded; clouds do not slide between pictures (scene/earth.js). Advecting them along a
// measured flow is the scheduled-job phase and is not built here.

import * as THREE from '../../vendor/three.module.min.js';
import {
  GEO_SATELLITES, IMAGE_W, IMAGE_H, REFRESH_MS, START_DELAY_MS, BLANK_MAX_BYTES, RETRY_MISSING_MS, MISSING_RETRIES,
  domainsUrl, mapUrl, parseDomains, candidateSlots, cloudMode,
} from '../data/gibs.js';
import { satelliteOpacity, composeClouds, isBlank } from './cloudcompose.js';
import { setLiveClouds, setLiveCloudsShown } from './earth.js';
import { COPY, t, ageInWords, timeText } from '../copy/en.js';

const FETCH_TIMEOUT_MS = 30000;

/** Main-thread stand-in for scene/cloudworker.js, for a browser without module workers or OffscreenCanvas. */
function mainThreadComposer() {
  const held = new Map();
  return {
    async picture(id, subLonDeg, blob) {
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const canvas = document.createElement('canvas');
      canvas.width = IMAGE_W;
      canvas.height = IMAGE_H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, IMAGE_W, IMAGE_H);
      if (bitmap.close) bitmap.close();
      const rgba = ctx.getImageData(0, 0, IMAGE_W, IMAGE_H).data;
      if (isBlank(rgba)) return { ok: false, blank: true };
      held.set(id, { opacity: satelliteOpacity(rgba, IMAGE_W, IMAGE_H, subLonDeg), subLonDeg });
      return { ok: true, blank: false };
    },
    async compose() {
      return { data: composeClouds([...held.values()], IMAGE_W, IMAGE_H) };
    },
    kind: 'main-thread',
  };
}

function workerComposer() {
  const worker = new Worker(new URL('./cloudworker.js', import.meta.url), { type: 'module' });
  let seq = 0;
  const waiting = new Map();
  worker.onmessage = (e) => {
    const m = e.data || {};
    const w = waiting.get(m.seq);
    if (!w) return;
    waiting.delete(m.seq);
    if (m.type === 'error') w.reject(new Error(m.message));
    else w.resolve(m);
  };
  worker.onerror = (e) => {
    for (const w of waiting.values()) w.reject(new Error((e && e.message) || 'cloud worker failed'));
    waiting.clear();
  };
  const ask = (msg) => new Promise((resolve, reject) => {
    const s = ++seq;
    waiting.set(s, { resolve, reject });
    worker.postMessage({ ...msg, seq: s });
  });
  return {
    picture: (id, subLonDeg, blob) => ask({ type: 'picture', id, subLonDeg, blob, width: IMAGE_W, height: IMAGE_H }),
    compose: () => ask({ type: 'compose', width: IMAGE_W, height: IMAGE_H }),
    kind: 'worker',
  };
}

function makeComposer() {
  try {
    if (typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function') return workerComposer();
  } catch { /* the main thread, below */ }
  return mainThreadComposer();
}

async function fetchWithTimeout(fetchImpl, url) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : 0;
  try {
    // No credentials and no referrer beyond the origin: NASA needs neither, and nothing about the
    // visitor goes with the request.
    return await fetchImpl(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'origin', signal: ctrl ? ctrl.signal : undefined });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createLiveClouds({ earth, now = () => Date.now(), fetchImpl = (u, o) => fetch(u, o), saveData = false, onChange = () => {} } = {}) {
  /** Per satellite: the slot held, when it was read, what it cost. */
  const held = new Map();
  const st = {
    phase: saveData ? 'off' : 'waiting',   // waiting | looking | live | failed | off
    reason: saveData ? 'saveData' : null,
    lookedAt: null,
    bytes: 0,
    requests: 0,
    lastLookMs: null,
    composeMs: null,
    composer: null,
    mode: 'illustrative',
    // Why the last scheduled look did not run, for the Sources panel's probes: 'hidden' | 'busy'.
    skipped: null,
    scheduledAt: null,
  };
  let composer = null;
  let timer = 0;
  let busy = false;
  let started = false;
  let retries = 0;

  const earthMesh = () => (typeof earth === 'function' ? earth() : earth);

  /** The OLDEST picture held: the card never claims the clouds are newer than their oldest part. */
  function capturedMs() {
    let oldest = null;
    for (const h of held.values()) if (oldest === null || h.slotMs < oldest) oldest = h.slotMs;
    return oldest;
  }
  function newestMs() {
    let newest = null;
    for (const h of held.values()) if (newest === null || h.slotMs > newest) newest = h.slotMs;
    return newest;
  }

  async function lookAtOne(sat) {
    const prev = held.get(sat.id);
    const dres = await fetchWithTimeout(fetchImpl, domainsUrl(sat.layer, now()));
    st.requests++;
    if (!dres.ok) return false;
    const xml = await dres.text();
    st.bytes += xml.length;
    const slots = candidateSlots(parseDomains(xml), now(), { afterMs: prev ? prev.slotMs : -Infinity });
    for (const slotMs of slots) {
      const res = await fetchWithTimeout(fetchImpl, mapUrl(sat.layer, slotMs));
      st.requests++;
      if (!res.ok) continue;
      const blob = await res.blob();
      st.bytes += blob.size;
      // The blank GIBS returns for a slot it lists but has not drawn yet (data/gibs.js). Its size
      // says so before any decoding; the worker's pixel check is the second opinion.
      if (blob.size < BLANK_MAX_BYTES) continue;
      let r;
      try {
        r = await composer.picture(sat.id, sat.subLonDeg, blob);
      } catch (err) {
        // A module worker a browser cannot start fails here, not at construction (Firefox before
        // 114 has OffscreenCanvas and no module workers). Once, fall back to the main thread; the
        // pictures it already holds are lost with it, so a composite waits for all of them again.
        if (composer.kind !== 'worker') throw err;
        composer = mainThreadComposer();
        st.composer = composer.kind;
        held.clear();
        r = await composer.picture(sat.id, sat.subLonDeg, blob);
      }
      if (!r || !r.ok) continue;
      held.set(sat.id, { slotMs, readAt: now(), bytes: blob.size, name: sat.name });
      return true;
    }
    return false;
  }

  async function look() {
    if (busy) { st.skipped = 'busy'; return; }
    if (typeof document !== 'undefined' && document.hidden) { st.skipped = 'hidden'; return; }
    st.skipped = null;
    busy = true;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!composer) { composer = makeComposer(); st.composer = composer.kind; }
    if (st.phase !== 'live') st.phase = 'looking';
    let changed = false;
    // One satellite after another, not all three at once: the pictures come from one NASA host
    // with no cache in front of it, and three parallel 2-3 s downloads would all arrive late.
    for (const sat of GEO_SATELLITES) {
      try {
        if (await lookAtOne(sat)) changed = true;
      } catch {
        // A satellite that failed keeps its last picture; one that never had one covers nothing,
        // and the static map shows there.
      }
    }
    try {
      if (changed) {
        const c = await composer.compose();
        st.composeMs = c.ms ?? null;
        const mesh = earthMesh();
        if (mesh && c.data) {
          const tex = new THREE.DataTexture(c.data, IMAGE_W, IMAGE_H, THREE.RGFormat, THREE.UnsignedByteType);
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.anisotropy = 8;
          tex.needsUpdate = true;
          setLiveClouds(mesh, tex);
        }
      }
    } catch {
      /* keep what is on screen */
    }
    st.lookedAt = now();
    st.lastLookMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    st.phase = held.size ? 'live' : 'failed';
    st.reason = held.size ? null : 'unreachable';
    busy = false;
    onChange(api.state());
  }

  function schedule(ms) {
    if (timer) clearTimeout(timer);
    st.scheduledAt = now() + ms;
    timer = setTimeout(() => {
      timer = 0;
      const go = () => look().finally(() => {
        const missing = GEO_SATELLITES.some((s) => !held.has(s.id));
        retries = missing ? retries + 1 : 0;
        schedule(missing && retries <= MISSING_RETRIES ? RETRY_MISSING_MS : REFRESH_MS);
      });
      // An idle moment, so the fetch and the texture upload do not land in a busy frame.
      if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 5000 });
      else go();
    }, ms);
  }

  const api = {
    start() {
      if (started || saveData) return;
      started = true;
      schedule(START_DELAY_MS);
      if (typeof document !== 'undefined') {
        // Back to a tab that has been hidden past a refresh: look now rather than at the next tick.
        document.addEventListener('visibilitychange', () => {
          if (document.hidden || busy) return;
          if (st.lookedAt === null || now() - st.lookedAt >= REFRESH_MS) schedule(0);
        });
      }
    },
    /** Force a look now; for probes. */
    lookNow: () => look(),
    tick(clockMs) {
      const mode = cloudMode({ capturedMs: capturedMs(), clockMs });
      if (mode !== st.mode) { st.mode = mode; onChange(api.state()); }
      const mesh = earthMesh();
      if (mesh) setLiveCloudsShown(mesh, mode === 'live');
    },
    state() {
      return {
        phase: st.phase,
        reason: st.reason,
        mode: st.mode,
        capturedMs: capturedMs(),
        newestMs: newestMs(),
        satellites: GEO_SATELLITES.filter((s) => held.has(s.id)).map((s) => ({ id: s.id, name: s.name, slotMs: held.get(s.id).slotMs, bytes: held.get(s.id).bytes })),
        bytes: st.bytes,
        requests: st.requests,
        lastLookMs: st.lastLookMs,
        composeMs: st.composeMs,
        composer: st.composer,
        skipped: st.skipped,
        scheduledAt: st.scheduledAt,
      };
    },
    /** The Earth card's line about its clouds: which, from where, how old. */
    line(clockMs) {
      return cloudsLine(api.state(), clockMs, now());
    },
    credit() {
      // NASA's words verbatim (copy/en.js), then the operators whose satellites took the pictures.
      return [COPY.clouds.gibsAcknowledgement, COPY.clouds.satelliteCredit];
    },
  };
  return api;
}

/** The clock is "elsewhere" once it is this far from the wall clock: a paused tab is not a scrub. */
export const CLOCK_ELSEWHERE_MS = 15 * 60000;
const hhmm = (ms) => new Date(ms).toISOString().slice(11, 16);

/** Pure, for the test: the sentence the Earth card prints about its clouds. */
export function cloudsLine(s, clockMs, wallMs) {
  const C = COPY.clouds;
  if (!s || s.mode !== 'live' || !Number.isFinite(s.capturedMs)) {
    if (s && s.phase === 'off') return C.illustrativeSaveData;
    // A picture is held and the clock is too far from it: say WHICH picture (public #330).
    if (s && Number.isFinite(s.capturedMs)) return t(C.illustrativeScrubbed, { date: timeText.utcDate(s.capturedMs), time: hhmm(s.capturedMs) });
    return C.illustrative;
  }
  const names = s.satellites.map((x) => x.name);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + C.and + names[names.length - 1] : names[0] || '';
  // THE PICTURE'S OWN DATE WHEN THE CLOCK IS ELSEWHERE (public #330). The clouds are an observation
  // and do not follow the clock: within twelve hours of the picture they are still drawn, so a clock
  // on the next UTC day used to read "seen at 21:20 UTC" under tomorrow's date. The date is said
  // whenever the clock's day or today's is not the picture's, and a clock that is not now is told
  // that the clouds stayed behind.
  const day = (ms) => Math.floor(ms / 86400000);
  const otherDay = (Number.isFinite(clockMs) && day(clockMs) !== day(s.capturedMs)) || (Number.isFinite(wallMs) && day(wallMs) !== day(s.capturedMs));
  const date = timeText.utcDate(s.capturedMs);
  const when = Number.isFinite(s.newestMs) && s.newestMs - s.capturedMs >= 10 * 60000
    ? t(otherDay ? C.betweenDated : C.between, { date, from: hhmm(s.capturedMs), to: hhmm(s.newestMs) })
    : t(otherDay ? C.atDated : C.at, { date, time: hhmm(s.capturedMs) });
  const ago = Number.isFinite(wallMs) ? ageInWords(Math.max(0, wallMs - s.capturedMs)) : '';
  const elsewhere = Number.isFinite(clockMs) && Number.isFinite(wallMs) && Math.abs(clockMs - wallMs) > CLOCK_ELSEWHERE_MS;
  return t(C.live, { when, ago, satellites: list }) + (elsewhere ? t(C.clockElsewhere, { time: hhmm(clockMs), date: timeText.utcDate(clockMs) }) : '');
}
