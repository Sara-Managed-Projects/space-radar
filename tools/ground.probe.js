// tools/ground.probe.js -- pictures of scene/groundstage.js: standing at a landing site and the sky from another world
// (release 2.0.0 batch f7-ground, forge #146 and #147).
//
//   ~/space-radar-handoff/release-1.9/render.sh \
//     'http://127.0.0.1:<port>/?sw=0&tier=2&shots=noon,,0,-4;dusk,2026-11-08T16:55:00Z,earth,,75,sky#ground=gale&t=2026-11-08T10:30:00Z' \
//     tools/ground.probe.js --width=1440 --height=900 --gl=gpu --shot-dir=<dir> --block=celestrak.org,ll.thespacedevs.com
//
// `shots` is a list of pictures separated by `;`, each `name,time,yaw,pitch,fov,panel,mode`: `time` an ISO instant the
// clock is moved to (through the address's `t`, as a visitor's link would), or empty; `yaw` a bearing in degrees or
// `earth` / `sun` to face that body (and `pitch` empty to put it a third of the way up the frame); `panel` `sky` to open
// the sky's list and wait for its events; `mode` `drive` to drive the rover. Files are <prefix>-<name>.png, the prefix
// `&name=` or the place in the link. Returns the stage's state at each picture.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e)));
for (let i = 0; i < 300 && !(window.spaceRadar && window.spaceRadar.ground && window.spaceRadar.ground.active); i++) await wait(200);
const g = window.spaceRadar && window.spaceRadar.ground;
if (!g) return { error: 'the stage did not open', hash: location.hash };
const q = new URLSearchParams(location.search);
const prefix = q.get('name') || (location.hash.match(/(?:ground|sky)=([^&]+)/) || [])[1].replace(/[^a-z0-9-]/gi, '-');
for (let i = 0; i < 150; i++) { const s = g.state(); if (s.model || !s.ground) break; await wait(200); }
await wait(2500);
const out = { shots: [] };
const steps = (q.get('shots') || 'open').split(';').map((x) => x.split(','));
for (const [name, time, yaw, pitch, fov, panel, mode] of steps) {
  if (time) {
    location.hash = location.hash.replace(/([#&])t=[^&]*/, `$1t=${time}`).replace(/^#(?!.*[#&]t=)/, `#t=${time}&`);
    await wait(1500);
  }
  if (mode) g.look({ mode });
  if (panel === 'sky') g.look({ panel: true });
  await frame();
  const st = g.state();
  const body = (id) => (id === 'sun' ? st.sun : st.bodies.find((b) => b.id === id));
  const aim = yaw === 'earth' || yaw === 'sun' ? body(yaw) : null;
  const v = {};
  if (fov) v.fovDeg = Number(fov);
  if (aim) { v.yawDeg = aim.azDeg; v.pitchDeg = pitch ? Number(pitch) : Math.max(-4, aim.altDeg - (v.fovDeg || 62) / 6); } else {
    if (yaw) v.yawDeg = Number(yaw);
    if (pitch) v.pitchDeg = Number(pitch);
  }
  g.look(v);
  if (panel === 'sky') for (let i = 0; i < 80; i++) { const s = g.state(); if (s.events && s.events.riseSet && s.events.riseSet.length && (s.world !== 'mars' || s.events.transitsSearched >= 10)) break; await wait(500); }
  await frame(); await frame(); await wait(500);
  await window.cdpShot(`${prefix}-${name || 'open'}`);
  out.shots.push({ name, state: g.state() });
}
out.errors = errors;
out.gl = (() => { try { const gl = window.spaceRadar.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; } catch { return 'unknown'; } })();
return out;
