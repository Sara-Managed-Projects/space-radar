// ui/gamepad.js -- free flight with a gamepad (forge #164): the sticks fly, the triggers set the speed, the buttons choose,
// go and come back, and an optional "ship" keeps its motion after the sticks are let go.
//
// Contract: wantPad(ctx, gamepad?) -> pad (once per ctx; later calls hand back the same object; ctx.pad is it)
//             pad = { showHint(), hideHint(), toggleHint(), get ship(), setShip(on), get connected(), dispose() }
//   Pure, for tests/test_gamepad.mjs: shouldHint(storage), readShip(storage), writeShip(storage, on), pickPad(list),
//   padName(id), hintRows(C)
//   Shared with the headset (ui/headset.js), which reads its controllers through ui/padmap.js readXR and then does the
//   same things: chooseAt(ctx, x, y), goChosen(ctx), goBack(ctx), goRung(ctx, index).
//
// WHEN. NOT AT BOOT. main.js keeps one listener, `gamepadconnected`, and imports this module the first time it fires; a
// browser fires it only once a pad's button has been pressed on this page (the Gamepad spec's fingerprinting rule), so a
// visitor with no pad never fetches a byte of it. From then on this module listens for pads coming and going itself.
//
// THE MAPPING is ui/padmap.js's, the W3C standard layout, so an Xbox and a PlayStation pad behave the same:
//   left stick       turn around what the view is on (ArrowLeft, ArrowUp...: the drag's directions)
//   right stick      up and down fly in and out (W and S), left and right slide (Shift+arrows)
//   RT / LT          the speed: 4x with the right trigger held down, a quarter with the left (padmap.js speedOf)
//   A                choose what is in the ring (the reticle, drawn where the camera is looking)
//   X                go to what is chosen
//   B                back along the visitor's own path (ui/camundo.js), else the card closes, else home to the Earth
//   Y (or Menu)      this module's hint: the controls. Y, not Menu, because the headset (ui/headset.js) has no Menu
//                    button the page may use (a Quest's left one is the system's), so Y means the controls on both
//   View             ship physics on or off, remembered (View on Xbox, Share or Create on PlayStation)
//   D-pad up / down  one rung out or in along the distance ladder (data/ladder.js, the Stars tab's rungs)
// From the ground (the sky view) the left stick looks around and the right stick's up and down close or open the field.
// During a trip the trip has the camera, as it has the keys (main.js keysEnabled): the sticks rest and one line says so.
//
// THE CAMERA is moved through scene/camera.js nudge(), the held keys' own path into the rig's damping, so a pad, the
// keys and a drag are one camera. The first frame of a push is the hand on the controls ('dolly' when it flies in or out,
// 'pad' otherwise): a flight in progress ends where it is, and main.js's listener arms the ladder's continuous flight
// (scene/climb.js) for a dolly just as it does for the wheel.
//
// THE HINT, ONCE. The first time a pad connects on this browser the panel opens, and localStorage['sr:padhint'] says it
// has (in a try/catch: Safari with site data blocked throws). A browser that refuses storage gets no panel by itself,
// as ui/keyhint.js rules ("once" is a promise this page cannot keep there), but every connection says one line, which
// names the Y button that opens it. The panel is keyhint.css's glass and type, plus css/xr.css for its rows.
//
// THE SHIP. Off by default: the default stays easy. On, the sticks are thrust (padmap.js shipStep), the motion carries
// on after they are let go and bleeds away over seconds; a stick pressed in stops it. The choice is
// localStorage['sr:padship']. It is no easier on anyone with reduced motion set, so it is never on unless asked for.

import { COPY, t } from '../copy/en.js';
import '../copy/en.xr.js';
import { loadCss } from './latercss.js';
import { icon } from './icons.js';
import { toast } from './share.js';
import { LADDER_RUNGS } from '../data/ladder.js';
import { readStandard, rates, shipStep, pressed, moving, restIntent, nextRung } from './padmap.js';

export const STORE_KEY = 'sr:padhint';
export const SHIP_KEY = 'sr:padship';
/** The ring goes this long after the sticks were last moved. */
export const RING_IDLE_MS = 3000;
/** Untouched, the hint goes by itself (ui/keyhint.js AUTO_HIDE_MS is 12 s for half as many rows). */
export const HINT_AUTO_MS = 20000;

const ZERO = Object.freeze({ az: 0, pol: 0, dolly: 0, pan: 0 });
const isZero = (v) => Math.abs(v.az) + Math.abs(v.pol) + Math.abs(v.dolly) + Math.abs(v.pan) < 1e-5;

/** Whether the hint should open by itself now; writes that it has. False where storage throws or is absent. */
export function shouldHint(storage) {
  try {
    if (!storage || storage.getItem(STORE_KEY)) return false;
    storage.setItem(STORE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/** The ship choice: off unless this browser kept '1'. */
export function readShip(storage) {
  try { return !!storage && storage.getItem(SHIP_KEY) === '1'; } catch { return false; }
}

export function writeShip(storage, on) {
  try { if (storage) { if (on) storage.setItem(SHIP_KEY, '1'); else storage.removeItem(SHIP_KEY); } } catch { /* the choice lasts the visit */ }
}

/** The pad to read: the connected one on the standard layout used most recently, else any connected one. */
export function pickPad(list) {
  let best = null;
  for (const gp of list || []) {
    if (!gp || gp.connected === false) continue;
    const rank = (gp.mapping === 'standard' ? 2 : 1) * 1e15 + (Number(gp.timestamp) || 0);
    if (!best || rank > best.rank) best = { gp, rank };
  }
  return best ? best.gp : null;
}

/** A pad's id without the browser's vendor and product codes: "Xbox Wireless Controller (STANDARD GAMEPAD ...)". */
export function padName(id) {
  return String(id || '').replace(/\s*\(.*$/, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim();
}

/** The hint's rows, in the order of the mapping above: [id, the control's name, what it does]. */
export function hintRows(C = COPY.pad) {
  return [
    ['stickL', C.capStickL, C.turn],
    ['stickR', C.capStickR, C.fly],
    ['triggers', C.capTriggers, C.speed],
    ['a', C.capA, C.choose],
    ['x', C.capX, C.go],
    ['b', C.capB, C.back],
    ['y', C.capY, C.controls],
    ['view', C.capView, C.ship],
    ['dpad', C.capDpad, C.ladder],
  ];
}

const storage = () => { try { return window.localStorage; } catch { return null; } };
const tripOn = (ctx) => !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle');

/** Choose what is at this point of the screen, as a tap would, without flying: the record, or null. */
export function chooseAt(ctx, x, y) {
  const d = typeof ctx.decisionAt === 'function' ? ctx.decisionAt(x, y, 'mouse') : null;
  const rec = d ? d.winner || (d.list && d.list[0] && d.list[0].record) || null : null;
  if (rec && typeof ctx.select === 'function') ctx.select(rec, { fly: false, from: 'pick' });
  return rec;
}

/** Go to what is chosen; false with nothing chosen. */
export function goChosen(ctx) {
  const rec = typeof ctx.selected === 'function' ? ctx.selected() : null;
  if (!rec || typeof ctx.flyToRecord !== 'function') return false;
  ctx.flyToRecord(rec);
  return true;
}

/** Back along the visitor's own path; with none, the card closes; with no card, home to the Earth. */
export function goBack(ctx) {
  return import('./camundo.js').then((m) => {
    if (m.goBack(ctx)) return 'back';
    if (typeof ctx.selected === 'function' && ctx.selected() && typeof ctx.deselect === 'function') { ctx.deselect(); return 'closed'; }
    if (typeof ctx.frameEarth === 'function') ctx.frameEarth();
    return 'home';
  }).catch(() => null);
}

/** Go to rung `index` of the distance ladder (-1 is the Earth) and return the words that name it. */
export function goRung(ctx, index) {
  const C = COPY.pad;
  const climb = (method) => {
    if (typeof ctx.selected === 'function' && ctx.selected() && typeof ctx.deselect === 'function') ctx.deselect();
    if (typeof ctx.wantClimb === 'function') ctx.wantClimb().then((c) => { if (c) c[method](); else if (method === 'toHome' && ctx.frameEarth) ctx.frameEarth(); });
  };
  if (index < 0) { climb('toHome'); return C.home; }
  const rung = LADDER_RUNGS[index];
  if (!rung) return '';
  const tg = rung.target || {};
  if (tg.place === 'horizon') climb('toEdge');
  else if (tg.place === 'heliosphere') import('./heliorung.js').then((m) => m.goHeliosphere(ctx)).catch(() => {}); // b200-c1-culture-helio (forge #148)
  else {
    const rec = typeof ctx.recordById === 'function' ? ctx.recordById(tg.world || tg.record) : null;
    if (rec) {
      if (rec.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(rec.layer) && typeof ctx.setLayerOn === 'function') ctx.setLayerOn(rec.layer, true);
      // From the ground nothing flies on a selection (main.js select): the rung is a journey, so it leaves the ground.
      if (ctx.skyView && ctx.skyView.active) { ctx.select(rec, { fly: false }); ctx.flyToRecord(rec); } else ctx.select(rec);
    }
  }
  return t(C.rung, { label: rung.label, distance: rung.distance });
}

let made = null;

export function wantPad(ctx, first = null) {
  if (made && made.ctx === ctx) return made.api;
  const C = COPY.pad;
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const rig = ctx.cameraRig;
  let ship = readShip(storage());
  let v = { ...ZERO };
  let prev = restIntent();
  let raf = 0;
  let last = 0;
  let lastMove = 0;
  let wasMoving = false;
  let wasDolly = false;
  let tripSaid = false;
  let rung = -1;
  let hint = null;
  let ring = null;
  let standard = true;

  const pads = () => {
    try { return nav && typeof nav.getGamepads === 'function' ? [...nav.getGamepads()] : []; } catch { return []; }
  };

  // --- the ring: where A chooses ------------------------------------------------------------------------------------
  function ringPoint() {
    const canvas = ctx.renderer && ctx.renderer.domElement;
    const r = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const target = rig && rig.state && rig.state.target;
    if (!(ctx.skyView && ctx.skyView.active) && target && typeof target.clone === 'function' && ctx.camera) {
      const p = target.clone().project(ctx.camera);
      if (Number.isFinite(p.x) && Number.isFinite(p.y) && p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1) {
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
      }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function showRing(now) {
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'sr-padring';
      ring.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ring);
    }
    const p = ringPoint();
    ring.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    ring.hidden = now - lastMove > RING_IDLE_MS;
  }

  // --- the hint -------------------------------------------------------------------------------------------------------
  let hintTimer = 0;
  let hintHeld = 0;
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function buildHint() {
    const root = el('section', 'sr-keyhint sr-float sr-padhint');
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', C.label);
    const head = el('header', 'sr-keyhint__head');
    head.appendChild(el('p', 'sr-keyhint__micro', C.title));
    const close = el('button', 'ui-close');
    close.type = 'button';
    close.setAttribute('aria-label', C.close);
    close.title = C.close;
    close.appendChild(icon('x'));
    close.addEventListener('click', () => api.hideHint());
    head.appendChild(close);
    root.appendChild(head);
    const list = el('dl', 'sr-padhint__list');
    for (const [id, cap, does] of hintRows(C)) {
      const row = el('div', `sr-padhint__row sr-padhint__row--${id}`);
      const dt = el('dt', 'sr-padhint__key');
      dt.appendChild(el('span', 'sr-keyhint__cap sr-padhint__cap', cap));
      row.appendChild(dt);
      row.appendChild(el('dd', 'sr-padhint__does', does));
      list.appendChild(row);
    }
    root.appendChild(list);
    const odd = el('p', 'sr-padhint__note', C.notStandard);
    odd.hidden = true;
    root.appendChild(odd);
    const label = el('label', 'sr-padhint__ship');
    const box = el('input', 'ui-check');
    box.type = 'checkbox';
    box.checked = ship;
    box.addEventListener('change', () => api.setShip(box.checked));
    label.appendChild(box);
    const words = el('span', 'sr-padhint__shipwords');
    words.appendChild(el('span', 'sr-padhint__shipname', C.shipToggle));
    words.appendChild(el('span', 'sr-padhint__shiphow', C.shipHow));
    label.appendChild(words);
    root.appendChild(label);
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); api.hideHint(); } });
    const hold = () => { hintHeld += 1; clearTimeout(hintTimer); };
    const release = () => { hintHeld = Math.max(0, hintHeld - 1); if (!hintHeld) arm(); };
    root.addEventListener('pointerenter', hold);
    root.addEventListener('pointerleave', release);
    root.addEventListener('focusin', hold);
    root.addEventListener('focusout', release);
    document.body.appendChild(root);
    return { root, box, odd };
  }
  function arm() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { if (!hintHeld) api.hideHint(); }, HINT_AUTO_MS);
  }

  // --- the buttons ----------------------------------------------------------------------------------------------------
  function act(name) {
    if (name === 'menu' || name === 'y') { api.toggleHint(); return; }
    if (tripOn(ctx)) { if (!tripSaid) { tripSaid = true; toast(C.trip, 3000); } return; }
    if (name === 'a') {
      const p = ringPoint();
      if (!chooseAt(ctx, p.x, p.y)) toast(C.nothing);
    } else if (name === 'x') {
      if (!goChosen(ctx)) toast(C.chooseFirst, 3000);
    } else if (name === 'b') {
      goBack(ctx);
    } else if (name === 'view') {
      api.setShip(!ship);
      toast(ship ? C.shipOn : C.shipOff, 3000);
    } else if (name === 'up' || name === 'down') {
      rung = nextRung(rung, name === 'up' ? 1 : -1, LADDER_RUNGS.length);
      const words = goRung(ctx, rung);
      if (words) toast(words, 3000);
    }
  }

  // --- the loop: one reading a frame while a pad is connected ----------------------------------------------------------
  function tick(now) {
    raf = 0;
    const gp = pickPad(pads());
    if (!gp) { if (ring) ring.hidden = true; return; }
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    // The headset reads its own controllers through the same mapping (ui/headset.js); the 2D flight rests meanwhile.
    if (ctx.headset && ctx.headset.active) { prev = restIntent(); v = { ...ZERO }; return; }
    const intent = readStandard(gp);
    if (intent.standard !== standard) { standard = intent.standard; if (hint) hint.odd.hidden = standard; }
    for (const name of pressed(prev, intent)) act(name);
    prev = intent;
    const blocked = tripOn(ctx);
    if (blocked && moving(intent) && !tripSaid) { tripSaid = true; toast(C.trip, 3000); }
    if (!blocked) tripSaid = false;
    v = shipStep(v, blocked ? ZERO : rates(intent), dt, ship, intent.stop);
    if (moving(intent)) lastMove = now;
    const go = !isZero(v);
    if (go && dt > 0) {
      const ground = ctx.skyView && ctx.skyView.active;
      if (ground) {
        // Standing in a field the stick looks, as a head turns: right is to the right and up is up.
        if (typeof ctx.skyView.lookBy === 'function') ctx.skyView.lookBy(-v.az * dt, v.pol * dt);
        if (v.dolly && typeof ctx.skyView.zoomBy === 'function') ctx.skyView.zoomBy(Math.exp(v.dolly * dt));
      } else if (rig && typeof rig.nudge === 'function') {
        const dolly = Math.abs(v.dolly) > 1e-5;
        const kind = dolly && !wasDolly ? 'dolly' : !wasMoving ? 'pad' : '';
        const canvas = ctx.renderer && ctx.renderer.domElement;
        const h = (canvas && canvas.clientHeight) || innerHeight || 1;
        rig.nudge(v.az * dt, v.pol * dt, v.dolly * dt, v.pan * h * dt, kind);
        // The continuous flight listens for a dolly for a moment after each one (scene/climb.js noteDolly).
        if (dolly && ctx.climb && typeof ctx.climb.noteDolly === 'function') ctx.climb.noteDolly();
        wasDolly = dolly;
      }
    } else wasDolly = false;
    wasMoving = go;
    showRing(now);
  }
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };

  const onConnect = (e) => {
    toast(C.connected, 4000);
    const gp = (e && e.gamepad) || null;
    standard = !gp || gp.mapping === 'standard';
    if (shouldHint(storage())) api.showHint();
    else if (hint) hint.odd.hidden = standard;
    start();
  };
  const onDisconnect = () => {
    if (!pickPad(pads())) { toast(C.disconnected); v = { ...ZERO }; prev = restIntent(); }
  };
  window.addEventListener('gamepadconnected', onConnect);
  window.addEventListener('gamepaddisconnected', onDisconnect);
  loadCss('xr'); // the ring's rule, before the first push draws it

  const api = {
    showHint() {
      loadCss('keyhint');
      loadCss('xr').then(() => {
        if (!hint) hint = buildHint();
        hint.odd.hidden = standard;
        hint.box.checked = ship;
        if (ctx.keyhint && typeof ctx.keyhint.hide === 'function') ctx.keyhint.hide('popover');
        hint.root.hidden = false;
        arm();
      });
    },
    hideHint() {
      clearTimeout(hintTimer);
      if (hint) hint.root.hidden = true;
    },
    toggleHint() {
      if (hint && !hint.root.hidden) api.hideHint();
      else api.showHint();
    },
    get ship() { return ship; },
    setShip(on) {
      ship = !!on;
      writeShip(storage(), ship);
      if (!ship) v = { ...ZERO };
      if (hint) hint.box.checked = ship;
    },
    get connected() { return !!pickPad(pads()); },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      if (hint) hint.root.remove();
      if (ring) ring.remove();
      hint = null;
      ring = null;
      made = null;
      if (ctx.pad === api) ctx.pad = null;
    },
  };
  ctx.pad = api;
  made = { ctx, api };
  // The event that brought this module is the first connection.
  onConnect(first ? { gamepad: first } : null);
  return api;
}
