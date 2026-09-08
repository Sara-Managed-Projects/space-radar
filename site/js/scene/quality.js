// scene/quality.js -- data-saver and a frame-rate latch (spec 0026 req 18).
//
// Pure. Exported:
//   createFrameLatch(opts) -> { push(frameMs, nowMs) -> boolean, latched, median() }
//   shouldSaveData(connection) -> boolean
//
// satellitemap.space's eighth take. Two decisions the app used to leave to hope:
//   - On a slow or metered connection the two heavy catalogue files (6.9 MB active, 5.1 MB Starlink)
//     are DEFERRED: the layer stays in the panel, off, with a line saying why, and loads when the
//     visitor switches it on. `navigator.connection.saveData`, or an effective type of 2g/3g, is the
//     signal; a browser without the API (Safari, Firefox) is treated as fast, which is what it says.
//   - When the median of the last twenty frame times stays over 33 ms for three seconds, the scene
//     drops to one device pixel per CSS pixel and hides the Milky Way picture and the constellation
//     lines -- once, latched, and said in the panel. It never climbs back by itself: a latch that
//     flaps is worse than either state.

export function createFrameLatch(opts = {}) {
  const windowFrames = opts.windowFrames || 20;
  const thresholdMs = opts.thresholdMs || 33;
  const holdMs = opts.holdMs || 3000;
  const frames = [];
  let overSince = null;
  let latched = false;

  function median() {
    if (!frames.length) return 0;
    const a = frames.slice().sort((p, q) => p - q);
    const h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  /** Feed one frame's duration. Returns true exactly once, on the frame that trips the latch. */
  function push(frameMs, nowMs) {
    if (latched) return false;
    if (!Number.isFinite(frameMs) || frameMs <= 0) return false;
    frames.push(Math.min(frameMs, 1000));
    if (frames.length > windowFrames) frames.shift();
    if (frames.length < windowFrames) return false;
    if (median() > thresholdMs) {
      if (overSince === null) overSince = nowMs;
      if (nowMs - overSince >= holdMs) { latched = true; return true; }
    } else {
      overSince = null;
    }
    return false;
  }

  return { push, median, get latched() { return latched; } };
}

const SLOW = new Set(['slow-2g', '2g', '3g']);

export function shouldSaveData(connection) {
  if (!connection) return false;
  if (connection.saveData === true) return true;
  return SLOW.has(String(connection.effectiveType || '').toLowerCase());
}
