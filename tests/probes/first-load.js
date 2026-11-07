// tests/probes/first-load.js -- the first load as a phone sees it (forge #170).
//
// The body of an async function run INSIDE the page by tools/cdp.mjs, through render.sh, as docs/FIRST_LOAD.md says:
//   render.sh "<url>" tests/probes/first-load.js --mobile --width=390 --height=844 --net=slow4g --cpu=4 \
//             --block=celestrak.org,thespacedevs.com --bytes=bytes.json > probe.json
// then `node scripts/first-load.mjs --bytes=bytes.json --probe=probe.json` sums and checks them.
//
// It returns JSON, every time in milliseconds from the navigation start:
//   firstFrame   the first animation frame on which the scene's renderer had drawn (window.spaceRadar.renderer.info.render.frame
//                above 0), seen by a requestAnimationFrame loop, so it is at most one frame late. If the probe began after
//                that frame it cannot know when it was: `firstFrameLate` is then true and firstFrame is when the probe began,
//                an upper bound, and the script says so instead of using it.
//   firstContentfulPaint   the browser's own mark (text or picture first painted; the scene's canvas counts when it draws)
//   layersReady  the first moment window.__srLayersReady was seen (polled every 25 ms)
//   webgl        which WebGL the scene got: 2 or 1 (never WebGPU: the app has no WebGPU path)
const began = Math.round(performance.now());
const frameOf = () => {
  const r = window.spaceRadar && window.spaceRadar.renderer;
  return r && r.info && r.info.render ? Number(r.info.render.frame) || 0 : 0;
};
const lateAtStart = frameOf() > 0;
let firstFrame = lateAtStart ? began : null;
await new Promise((resolve) => {
  const t0 = performance.now();
  const tick = () => {
    if (firstFrame === null && frameOf() > 0) firstFrame = Math.round(performance.now());
    if (firstFrame !== null || performance.now() - t0 > 120000) resolve();
    else requestAnimationFrame(tick);
  };
  tick();
});
let layersReady = null;
await new Promise((resolve) => {
  const t0 = performance.now();
  const poll = () => {
    if (window.__srLayersReady) { layersReady = Math.round(performance.now()); resolve(); } else if (performance.now() - t0 > 180000) resolve();
    else setTimeout(poll, 25);
  };
  poll();
});
// The first-visit window of tests/test_first_visit_bytes.mjs: two seconds after the layers.
await new Promise((r) => setTimeout(r, 2000));
const paint = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
const gl = window.spaceRadar && window.spaceRadar.renderer && window.spaceRadar.renderer.getContext ? window.spaceRadar.renderer.getContext() : null;
return {
  probeBegan: began,
  firstFrame,
  firstFrameLate: lateAtStart,
  firstContentfulPaint: paint['first-contentful-paint'] ?? null,
  layersReady,
  webgl: gl ? (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1) : null,
  viewport: [innerWidth, innerHeight, devicePixelRatio],
  userAgentMobile: /Mobile/.test(navigator.userAgent),
};
