// tools/exoface.probe.js -- frames of scene/exoface.js on its plain star stage (internal #466 phase B).
//
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0&tier=2#imagine=3' tools/exoface.probe.js \
//     --width=1440 --height=900 --gl=gpu --shot-dir=<dir> --block=celestrak.org,ll.thespacedevs.com
//
// Each world is shown close (the disc 70 % of the frame's shorter side, lit three-quarters), held
// still at one time so two runs are the same picture, and saved as <dir>/<name>.png. The rows are
// site/data/exoplanets.csv's own (copy as of 2026-09-08). `?probe=` in the address picks a set:
// (none) the full sheet, `portrait` four worlds, `phone` two at tier 0.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
for (let i = 0; i < 300 && !(window.spaceRadar && window.spaceRadar.imagine && window.spaceRadar.imagine.active); i++) await wait(200);
const st = window.spaceRadar && window.spaceRadar.imagine;
if (!st) return { error: 'the stage did not open', hash: location.hash };
const R = (name, radiusEarths, massEarths, periodDays, starTeffK, starRadiusSuns, aAu) => ({ name, radiusEarths, massEarths, periodDays, starTeffK, starRadiusSuns, aAu });
const ROWS = {
  'kepler-452-b': R('Kepler-452 b', 1.63, 3.29, 384.843, 5757, 1.11),
  'lhs-1140-b': R('LHS 1140 b', 1.73, 5.6, 24.7372, 3096, 0.216),
  'trappist-1-e': R('TRAPPIST-1 e', 0.92, 0.692, 6.101013, 2566, 0.1192, 0.02925),
  '55-cnc-e': R('55 Cnc e', 1.875, 7.99, 0.73655, 5172, 0.943),
  'trappist-1-h': R('TRAPPIST-1 h', 0.755, 0.326, 18.772866, 2566, 0.1192, 0.06189),
  'gj-1214-b': R('GJ 1214 b', 2.733, 8.41, 1.5804, 3101, 0.216),
  'hd-189733-b': R('HD 189733 b', 12.666, 359.148, 2.21858, 5052, 0.75),
  'gj-1132-b': R('GJ 1132 b', 1.192, 1.837, 1.62893, 3229, 0.221),
  'kepler-62-f': R('Kepler-62 f', 1.41, 35, 267.291, 4925, 0.64),
  'k2-18-b': R('K2-18 b', 2.37, 8.92, 32.9396, 3457, 0.411),
};
const set = new URLSearchParams(location.search).get('probe') || 'sheet';
const SETS = {
  sheet: ['kepler-452-b', 'lhs-1140-b', 'trappist-1-e', '55-cnc-e', 'trappist-1-h', 'gj-1214-b', 'hd-189733-b', 'gj-1132-b', 'kepler-62-f', 'k2-18-b', 'imagine-3', 'imagine-9', 'imagine-8', 'imagine-13', 'imagine-5', 'imagine-33', 'imagine-12', 'imagine-24'],
  portrait: ['imagine-3', 'lhs-1140-b', 'kepler-452-b', 'hd-189733-b'],
  phone: ['imagine-3', 'trappist-1-e'],
};
const out = { set, shots: [], states: {} };
st.freeze(40);
for (const id of SETS[set] || SETS.sheet) {
  const s = id.startsWith('imagine-') ? st.start(Number(id.slice(8))) : st.show({ row: ROWS[id] });
  st.setView({ phaseDeg: 52, elevationDeg: 14, fill: 0.7 });
  await frame(); await frame();
  await window.cdpShot(id);
  out.shots.push(id);
  const now = st.state();
  out.states[id] = { cls: now.cls, climate: now.climate, eyeball: now.eyeball, teqK: now.teqK, tier: now.tier, calls: now.drawCalls, label: now.label.measured + ' ' + now.label.imagined };
}
// One with the page's own label on it, as a visitor sees it, and the costs.
if (set === 'sheet') {
  st.start(3);
  out.timing = {};
  for (const tier of [2, 1, 0]) {
    st.setTier(tier);
    st.setView({ fill: 0.7 });
    await frame();
    const part = st.measure(40);
    st.setView({ fill: 2.2 }); // the face fills the screen
    await frame();
    out.timing['tier' + tier] = { disc70: part, full: st.measure(40) };
    if (tier === 0) { st.setView({ fill: 0.7 }); await frame(); await frame(); await window.cdpShot('imagine-3-tier0'); }
    if (tier === 1) { st.setView({ fill: 0.7 }); await frame(); await frame(); await window.cdpShot('imagine-3-tier1'); }
  }
  st.setTier(2);
  st.setView({ fill: 2.2, phaseDeg: 70 });
  await frame(); await frame();
  await window.cdpShot('imagine-3-close');
  st.freeze(null);
  st.setView({ fill: 2.2 });
  await wait(2500);
  out.live = st.state();
}
if (set !== 'sheet') {
  // Close, to look at the ground itself, and what the frames cost on this device.
  st.start(3);
  st.setView({ fill: 2.2, phaseDeg: 70 });
  await frame(); await frame();
  await window.cdpShot('imagine-3-close');
  out.timing = { full: st.measure(30) };
  st.setView({ fill: 0.7, phaseDeg: 52 });
  await frame();
  out.timing.disc70 = st.measure(30);
  st.freeze(null);
  await wait(2500);
  out.live = st.state();
}
out.gl = (() => { try { const gl = window.spaceRadar.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; } catch { return 'unknown'; } })();
out.errors = window.__exofaceErrors || [];
return out;
