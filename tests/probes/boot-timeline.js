// tests/probes/boot-timeline.js -- the boot as a timeline (internal #528, 2026-10-10).
//
// The body of an async function run INSIDE the page after it has started loading: tools/cdp.mjs runs
// it as is (`node tools/cdp.mjs http://127.0.0.1:8190/ tests/probes/boot-timeline.js`), and
// scripts/boot-timeline.mjs runs the same text through Playwright for CI (screens.yml). It returns
// JSON: when the page parsed, first painted, had its main module, and had its layers; every task over
// 50 ms the browser reported (long tasks are buffered from the start of the page, so a late observer
// still sees the boot's); and the totals a gate reads.
//
// All times are milliseconds from the navigation start. `layersReady` is the first moment this probe
// saw window.__srLayersReady (polled every 25 ms), so it is that late at most.
const until = (fn, ms) => new Promise((resolve) => {
  const t0 = performance.now();
  const tick = () => { if (fn() || performance.now() - t0 > ms) resolve(!!fn()); else setTimeout(tick, 25); };
  tick();
});
const tasks = [];
let obs = null;
try {
  obs = new PerformanceObserver((list) => { for (const e of list.getEntries()) tasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }); });
  obs.observe({ type: 'longtask', buffered: true });
} catch { /* no long-task API: the list stays empty and says so below */ }
const supported = !!(PerformanceObserver.supportedEntryTypes || []).includes('longtask');

let layersReadyAt = null;
const ok = await until(() => { if (window.__srLayersReady && layersReadyAt === null) layersReadyAt = Math.round(performance.now()); return layersReadyAt !== null; }, 120000);
// Two more seconds: what the first visit does just after its layers (the budget's own window).
await new Promise((r) => setTimeout(r, 2000));
const nav = performance.getEntriesByType('navigation')[0] || {};
const paint = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
const main = performance.getEntriesByType('resource').find((r) => /\/js\/main\.js(\?|$)/.test(r.name));
const endOfWindow = performance.now();
const list = tasks.filter((t) => t.start <= endOfWindow).sort((a, b) => a.start - b.start);
const blocking = list.reduce((s, t) => s + Math.max(0, t.dur - 50), 0);
const before = list.filter((t) => layersReadyAt === null || t.start <= layersReadyAt);
const out = {
  layersReadyFound: ok,
  longTaskApi: supported,
  parse: { domInteractive: Math.round(nav.domInteractive || 0), domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0) },
  firstPaint: paint['first-paint'] ?? null,
  firstContentfulPaint: paint['first-contentful-paint'] ?? null,
  mainModuleLoaded: main ? Math.round(main.responseEnd) : null,
  layersReady: layersReadyAt,
  longTasks: list,
  longTaskCount: list.length,
  longestTaskMs: list.reduce((m, t) => Math.max(m, t.dur), 0),
  tasksOver100Ms: list.filter((t) => t.dur > 100).length,
  totalBlockingMs: Math.round(blocking),
  blockingBeforeLayersReady: Math.round(before.reduce((s, t) => s + Math.max(0, t.dur - 50), 0)),
  windowEndsAt: Math.round(endOfWindow),
};
if (obs) obs.disconnect();
return out;
