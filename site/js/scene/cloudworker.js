// scene/cloudworker.js -- the live clouds' pixel work, off the main thread.
//
// A module worker (scene/liveclouds.js starts it). Reading one 2048 x 1024 picture back to
// opacity took 124-638 ms and composing the three 1.3 s, MEASURED 2026-09-28 in headless Chrome
// on a laptop running at a load average near 300 (tests/probes/clouds-probe.js) -- a quiet machine
// is several times faster, but on the main thread any of it is dropped frames, so it happens here.
// The arithmetic is scene/cloudcompose.js, the same module the main-thread fallback and the Node
// test use.
//
// Messages in:  {type:'picture', seq, id, subLonDeg, blob, width, height}
//               {type:'compose', seq, width, height}
// Messages out: {type:'picture', seq, id, ok, blank, ms}
//               {type:'compose', seq, data (transferred), ms}
//               {type:'error', seq, message}

import { satelliteClouds, composeClouds, isBlank } from './cloudcompose.js';

/** The latest accepted picture of each satellite, as opacity: a refresh re-reads only the new ones. */
const held = new Map();

async function decode(blob, width, height) {
  // colorSpaceConversion 'none': the palette colours ARE the data, and a colour-managed decode
  // would move them off the palette.
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (bitmap.close) bitmap.close();
  return ctx.getImageData(0, 0, width, height).data;
}

self.onmessage = async (e) => {
  const m = e.data || {};
  const t0 = performance.now();
  try {
    if (m.type === 'picture') {
      const rgba = await decode(m.blob, m.width, m.height);
      if (isBlank(rgba)) {
        self.postMessage({ type: 'picture', seq: m.seq, id: m.id, ok: false, blank: true, ms: performance.now() - t0 });
        return;
      }
      held.set(m.id, { ...satelliteClouds(rgba, m.width, m.height, m.subLonDeg), subLonDeg: m.subLonDeg });
      self.postMessage({ type: 'picture', seq: m.seq, id: m.id, ok: true, blank: false, ms: performance.now() - t0 });
    } else if (m.type === 'compose') {
      const data = composeClouds([...held.values()], m.width, m.height, 4);
      self.postMessage({ type: 'compose', seq: m.seq, data, ms: performance.now() - t0 }, [data.buffer]);
    }
  } catch (err) {
    self.postMessage({ type: 'error', seq: m.seq, message: String((err && err.message) || err) });
  }
};
