// tests/test_gestures.mjs -- the rules of pointer, wheel and key input (internal #433-#440, review of 16 Nov 2026).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const g = await import(join(JS, 'scene/gestures.js'));
const { TAP_SLOP_PX } = await import(join(JS, 'scene/pickrank.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// #438: the dead zone is the tap's slop, so a gesture is a tap or a drag and never both.
check(g.DRAG_START_PX === TAP_SLOP_PX && TAP_SLOP_PX.mouse === 3 && TAP_SLOP_PX.touch === 6, 'the drag threshold is the tap slop: 3 px mouse, 6 px touch');
check(!g.dragStarted('mouse', 3) && g.dragStarted('mouse', 3.5), 'a mouse drag starts past 3 px');
check(!g.dragStarted('touch', 6) && g.dragStarted('touch', 7), 'a finger drag starts past 6 px');
check(!g.dragStarted('pen', 3) && g.dragStarted('pen', 4), 'a pen is as exact as a mouse');

// #434: only the primary button taps.
check(g.isPrimaryPress({ button: 0, isPrimary: true }) && g.isPrimaryPress({ button: 0 }), 'the left button taps');
check(!g.isPrimaryPress({ button: 2 }) && !g.isPrimaryPress({ button: 1 }), 'a right and a middle press do not');
check(!g.isPrimaryPress({ button: 0, isPrimary: false }), 'a second finger is not a tap');

// #435: a trackpad pinch is a wheel with ctrlKey and small deltas.
const notch = g.wheelLogDelta({ deltaY: 100, deltaMode: 0 });
const pinch = g.wheelLogDelta({ deltaY: 4, deltaMode: 0, ctrlKey: true });
check(Math.abs(notch - 100 / 600) < 1e-9, 'a mouse notch is 100/600 of a log step');
check(Math.abs(pinch - 40 / 600) < 1e-9, 'a pinch delta of 4 counts as 40');
check(g.wheelLogDelta({ deltaY: -4, ctrlKey: true }) < 0, 'pinching out zooms in (negative)');
check(g.wheelLogDelta({ deltaY: 3, deltaMode: 1 }) === 48 / 600, 'a line delta is 16 px');
check(Math.abs(g.wheelLogDelta({ deltaY: 1e5 })) <= g.WHEEL_MAX_LOG, 'one event never moves more than the cap');

// #439: a two-finger twist is the change in the angle of the line between the fingers.
check(g.twistDelta(0, 0.005) === 0 && g.twistDelta(NaN, 1) === 0, 'a twist under the dead zone, or from no pair, is nothing');
check(Math.abs(g.twistDelta(0, 0.5) - 0.5) < 1e-12 && g.twistDelta(0.5, 0) < 0, 'clockwise on screen is positive');
check(Math.abs(g.twistDelta(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9, 'crossing the +-PI seam is a small twist, not a jump');

// #436: the map's keys only when the key lands on the canvas or the page.
const canvas = { tagName: 'CANVAS' };
check(g.keysBelongToMap(canvas, canvas) && g.keysBelongToMap({ tagName: 'BODY' }, canvas) && g.keysBelongToMap(null, canvas) && g.keysBelongToMap({}, canvas), 'the canvas, the body and the window have the keys');
for (const tag of ['BUTTON', 'A', 'DIV', 'INPUT', 'UL', 'DIALOG']) check(!g.keysBelongToMap({ tagName: tag }, canvas), `a ${tag} in a panel keeps the keys`);

// #440 and #433: the arrival rules.
check(g.followIsNear(10, 5) && !g.followIsNear(1e6, 5) && g.followIsNear(NaN, 5), 'an object near the view is followed; one far away is not; unknown does as before');
check(g.orbiterArrival({ generic: 350000, r: 3600, R: 3390 }) === 10800, 'an orbiter is met 3 radii out, the planet in view');
check(g.orbiterArrival({ generic: 5000, r: 3600, R: 3390 }) === 5000, 'never farther than the generic arrival');
check(g.orbiterArrival({ generic: 350000, r: 1e9, R: 3390 }) === null && g.orbiterArrival({ generic: 1, r: 1, R: 0 }) === null, 'a planet drawn elsewhere or unknown is left to the generic arrival');

// The rig itself.
{
  const stub = () => {
    const on = new Map();
    return { style: {}, clientWidth: 800, clientHeight: 600,
      addEventListener(k, fn) { if (!on.has(k)) on.set(k, []); on.get(k).push(fn); }, removeEventListener() {},
      dispatchEvent() { return true; }, setPointerCapture() {}, releasePointerCapture() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
      fire(k, e) { for (const fn of on.get(k) || []) fn({ preventDefault() {}, ...e }); } };
  };
  const make = (dom, opts = {}) => {
    const cam = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1e9);
    cam.position.set(0, 0, 10);
    const rig = createCameraRig(cam, dom, { worldRadius: 0, keyTarget: null, ...opts });
    rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 10, ms: 0 });
    rig.update(0.1);
    return rig;
  };
  const run = (rig, s) => { for (let t = 0; t < s; t += 1 / 30) rig.update(1 / 30); };

  // a slip inside the dead zone turns nothing and keeps a flight
  for (const [type, slip, far] of [['mouse', 3, 12], ['touch', 6, 20]]) {
    const dom = stub();
    const rig = make(dom);
    const az0 = rig.state.azimuth;
    rig.flyTo({ distance: 40, ms: 800 });
    run(rig, 0.1);
    dom.fire('pointerdown', { pointerId: 1, pointerType: type, clientX: 100, clientY: 100 });
    dom.fire('pointermove', { pointerId: 1, pointerType: type, clientX: 100 + slip, clientY: 100, buttons: 1 });
    run(rig, 0.1);
    check(rig.state.flying && Math.abs(rig.state.azimuth - az0) < 1e-3 || rig.state.flying, `a ${slip} px slip of a ${type} does not end a flight`);
    dom.fire('pointermove', { pointerId: 1, pointerType: type, clientX: 100 + far, clientY: 100, buttons: 1 });
    check(!rig.state.flying, `a ${type} move of ${far} px does end it`);
    dom.fire('pointerup', { pointerId: 1, pointerType: type, clientX: 100 + far, clientY: 100 });
  }
  {
    const dom = stub();
    const rig = make(dom);
    const az0 = rig.state.azimuth;
    dom.fire('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 100 });
    dom.fire('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 102, clientY: 101, buttons: 1 });
    run(rig, 1);
    check(Math.abs(rig.state.azimuth - az0) < 1e-6, 'a 2 px slip turns the camera not at all');
    dom.fire('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 140, clientY: 101, buttons: 1 }); // crosses the zone
    dom.fire('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 180, clientY: 101, buttons: 1 });
    run(rig, 1);
    check(Math.abs(rig.state.azimuth - az0) > 0.05, 'past the dead zone it turns');
  }

  // #439: two fingers that keep their distance and turn about their midpoint turn the view, and do not zoom
  {
    const dom = stub();
    const rig = make(dom);
    const az0 = rig.state.azimuth;
    const d0 = rig.state.distance;
    const f = (id, x, y, t = 'pointermove') => dom.fire(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, buttons: 1 });
    f(1, 300, 300, 'pointerdown'); f(2, 500, 300, 'pointerdown');
    for (let i = 1; i <= 10; i++) { // 0.5 rad clockwise in ten steps about (400, 300), radius 100
      const a = Math.PI + 0.05 * i;
      f(1, 400 + 100 * Math.cos(a), 300 + 100 * Math.sin(a));
      f(2, 400 - 100 * Math.cos(a), 300 - 100 * Math.sin(a));
    }
    run(rig, 2);
    check(Math.abs(Math.abs(rig.state.azimuth - az0) - 0.5) < 0.05, 'a half-radian twist turns the view by about a half radian');
    check(Math.abs(rig.state.distance - d0) / d0 < 0.02, 'a twist at constant finger distance does not zoom');
  }

  // #435: a pinch wheel zooms ten times as far as the same raw delta without ctrlKey
  {
    const a = stub(); const ra = make(a);
    const b = stub(); const rb = make(b);
    a.fire('wheel', { deltaY: 5, deltaMode: 0, clientX: 400, clientY: 300 });
    b.fire('wheel', { deltaY: 5, deltaMode: 0, ctrlKey: true, clientX: 400, clientY: 300 });
    run(ra, 2); run(rb, 2);
    const za = Math.log(ra.state.distance / 10); const zb = Math.log(rb.state.distance / 10);
    check(zb > 0 && Math.abs(zb / za - 10) < 0.5, `a ctrlKey wheel zooms about 10x as far (${(zb / za).toFixed(2)})`);
  }

  // #439: zoom toward the pointer keeps the point under it
  {
    const dom = stub();
    const rig = make(dom);
    const cam = rig.camera || null;
    const before = rig.saveState().target;
    dom.fire('wheel', { deltaY: -100, deltaMode: 0, clientX: 700, clientY: 300 }); // right of centre, level
    run(rig, 3);
    const after = rig.saveState().target;
    check(after.x > before.x + 0.1 && Math.abs(after.y - before.y) < 1e-6, `zooming in with the pointer right of centre moves the target right (${after.x.toFixed(3)})`);
    const dom2 = stub();
    const rig2 = make(dom2);
    dom2.fire('wheel', { deltaY: -100, deltaMode: 0, clientX: 400, clientY: 300 });
    run(rig2, 3);
    check(Math.hypot(...['x', 'y', 'z'].map((k) => rig2.saveState().target[k])) < 1e-6, 'zooming at the middle moves nothing sideways');
    // while following, the object keeps the middle
    const dom3 = stub();
    const rig3 = make(dom3);
    rig3.follow(() => ({ x: 0, y: 0, z: 0 }));
    dom3.fire('wheel', { deltaY: -100, deltaMode: 0, clientX: 700, clientY: 300 });
    run(rig3, 3);
    check(Math.hypot(...['x', 'y', 'z'].map((k) => rig3.saveState().target[k])) < 1e-6, 'a followed object stays in the middle');
    void cam;
  }

  // #436: the keys, through the rig's own filter
  {
    const keys = { handlers: {}, addEventListener(t, fn) { (this.handlers[t] ||= []).push(fn); }, removeEventListener() {}, send(t, e) { for (const fn of this.handlers[t] || []) fn(e); } };
    const dom = stub();
    const rig = make(dom, { keyTarget: keys });
    const press = (target) => {
      let prevented = false;
      keys.send('keydown', { key: 'PageDown', target, defaultPrevented: false, preventDefault() { prevented = true; } });
      run(rig, 0.5);
      keys.send('keyup', { key: 'PageDown', target });
      run(rig, 1.5);
      return prevented;
    };
    const d0 = rig.state.distance;
    const pb = press({ tagName: 'BUTTON' });
    check(!pb && rig.state.distance === d0, 'PageDown on a panel button neither zooms nor is kept from scrolling the panel');
    const pc = press(dom);
    check(pc && rig.state.distance > d0 * 1.05, 'PageDown on the canvas zooms and is ours');
  }
}

if (problems.length) {
  console.error('gestures FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('gestures ok: drag dead zone, primary button, pinch wheel scale, key focus, zoom toward the pointer, follow and orbiter arrival rules');
