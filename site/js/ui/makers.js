// ui/makers.js -- the wiring of the three makers: the flight editor (ui/flighteditor.js, forge #155), Record
// (ui/recorder.js, forge #156) and Dome and 360 (ui/projectpanel.js, forge #157).
//
// Contract: installMakers(ctx, { renderer, scene, camera, embed, film }) -> makers (once per ctx; later calls hand
//           back the same object) = { wantFlight(), wantRecorder(), wantProjection(), link() }
//   Sets ctx.frameHooksChanged(), which keeps ctx.makeFrame null unless a projection or a recording is on (main.js's
//   loop calls ctx.makeFrame straight after the render, in the render's own task, where the drawing buffer is still
//   there: scene/renderer.js renderTo says why).
//
// WHY A MODULE OF ITS OWN. The boot graph is held to a budget (registry/budgets.yaml deployed_boot_js_bytes) with a
// couple of kB of room left; every line of wiring in main.js is a first visit's bytes. So main.js keeps a stub of a few
// lines (import this on the share sheet's buttons, a `#path=` or `#proj=` in the address, or a film address with
// `record=`) and everything else is here, fetched only then. Each maker is itself a dynamic import on its first use.

import { read as readLink } from './urlstate.js';

let made = null;

export function installMakers(ctx, env = {}) {
  if (made && made.ctx === ctx) return made.api;
  const cache = {};
  const want = (key, load) => () => cache[key] || (cache[key] = load().catch((e) => { cache[key] = null; console.warn(`the ${key} did not load`, e); return null; }));
  const api = {
    wantFlight: want('flight editor', () => import('./flighteditor.js').then((m) => (ctx.flight = m.createFlightEditor(ctx)))),
    wantRecorder: want('recorder', () => import('./recorder.js').then((m) => (ctx.recorder = m.createRecorder(ctx)))),
    wantProjection: want('projection', () => import('./projectpanel.js').then((m) => (ctx.projection = m.createProjectPanel(ctx, { renderer: env.renderer, scene: env.scene, camera: env.camera })))),
  };
  // The flight editor and Record reach each other through these.
  ctx.wantFlight = api.wantFlight;
  ctx.wantRecorder = api.wantRecorder;
  ctx.wantProjection = api.wantProjection;
  ctx.frameHooksChanged = () => {
    const on = (ctx.projection && ctx.projection.active) || (ctx.recorder && ctx.recorder.active) || ctx.filmCapture;
    ctx.makeFrame = on ? (t) => {
      if (ctx.projection && ctx.projection.active) ctx.projection.render(t);
      if (ctx.recorder && ctx.recorder.active) ctx.recorder.frame(t);
      if (ctx.filmCapture) ctx.filmCapture(t);
    } : null;
  };

  // A link that names a flight opens and plays it once; `proj` is applied as it is, and taken off when it goes.
  // A film address with `record=` is a frame-by-frame recording, on the film clock render mode has just installed.
  let lastPath = null;
  let filming = false;
  api.link = () => {
    if (env.embed) return;
    if (env.film && /[?&]record=/.test(location.search)) {
      if (!filming) {
        filming = true;
        import('./recorder.js').then((m) => m.filmRecord(ctx, env.film.film || env.film, location.search)).catch((e) => console.warn('the recording did not load', e));
      }
      return;
    }
    const st = readLink();
    if (st.unknownVersion) return;
    if (st.path && st.path !== lastPath) { lastPath = st.path; api.wantFlight().then((f) => f && f.openLink(st.path)); }
    if (st.proj !== undefined || ctx.projection) api.wantProjection().then((p) => p && p.fromLink(st.proj || ''));
  };
  made = { ctx, api };
  return api;
}
