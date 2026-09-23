// tests/test_veil.mjs -- spec 0034 requirement 1: a stage change inside a trip goes through black.
//
// ui/veil.js with fake timers and a fake node, so every millisecond below is the veil's own
// arithmetic and not a guess about a browser: through() covers for VEIL_MS, runs the switch in the
// black, uncovers for VEIL_MS, and resolves; a second call before the black joins it; one after the
// switch waits for its own black; reduced motion is the one 220 ms fade, never the 350 ms halves.
// Then the trip machine itself, with the veil stubbed, to hold the order `veil -> flight` and that
// the stage changes only inside the black.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { createVeil, VEIL_MS, REDUCED_VEIL_MS } = await import(join(JS, 'ui/veil.js'));

check(VEIL_MS === 350, `VEIL_MS is 350 (${VEIL_MS})`);
check(REDUCED_VEIL_MS === 220, `REDUCED_VEIL_MS is 220 (${REDUCED_VEIL_MS})`);
{
  const cam = readFileSync(join(JS, 'scene/camera.js'), 'utf8');
  const m = cam.match(/const REDUCED_FADE_MS = (\d+);/);
  check(m && Number(m[1]) === REDUCED_VEIL_MS, `the veil's reduced-motion fade is the rig's REDUCED_FADE_MS (${m && m[1]})`);
}

// --- a fake clock and a fake node ---------------------------------------------------------------
function fakeTimers() {
  let t = 0;
  let seq = 0;
  const pending = new Map();
  return {
    now: () => t,
    // A 60 Hz frame loop on the same clock.
    raf(fn) { const id = ++seq; pending.set(id, { at: Math.floor(t / 16 + 1) * 16, fn }); return id; },
    setTimeout(fn, ms) { const id = ++seq; pending.set(id, { at: t + ms, fn }); return id; },
    clearTimeout(id) { pending.delete(id); },
    // Advance to `ms` from now, firing timers in order and letting the promise jobs they queue run.
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const [id, p] of pending) if (p.at <= end && (!next || p.at < next[1].at)) next = [id, p];
        if (!next) break;
        pending.delete(next[0]);
        t = next[1].at;
        next[1].fn();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      }
      t = end;
      for (let i = 0; i < 20; i++) await Promise.resolve();
    },
  };
}

// A node with Web Animations on the fake clock: `finished` resolves when the clock has run the
// animation's duration -- the stand-in for animation time, which in a browser advances with frames.
function fakeDoc(clock) {
  const events = [];
  const make = () => {
    const classes = new Set();
    return {
      anims: [],
      animate(keyframes, opts) {
        let resolve;
        const finished = new Promise((r) => { resolve = r; });
        const a = { keyframes, duration: opts.duration, cancelled: false, finished, cancel() { this.cancelled = true; resolve(); } };
        this.anims.push(a);
        if (clock) clock.setTimeout(() => resolve(), opts.duration);
        return a;
      },
      style: {},
      className: '',
      offsetWidth: 1,
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener() {},
      removeEventListener() {},
      remove() { this.removed = true; },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle: (c, on) => { if (on === undefined ? !classes.has(c) : on) classes.add(c); else classes.delete(c); },
        contains: (c) => classes.has(c),
      },
    };
  };
  return {
    events,
    defaultView: { getComputedStyle: (n) => ({ opacity: n.classList.contains('is-on') ? '1' : '0' }) },
    createElement: make,
    dispatchEvent(e) { events.push(e.detail && e.detail.phase); return true; },
  };
}

// --- 1. through(): 350 to black, the switch, 350 back ------------------------------------------
{
  const clock = fakeTimers();
  const doc = fakeDoc(clock);
  const host = { children: [], appendChild(n) { this.children.push(n); } };
  const veil = createVeil(host, { document: doc, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, requestAnimationFrame: clock.raf });
  const node = host.children[0];
  check(!!node && node.className === 'sr-veil' && node.attrs['aria-hidden'] === 'true', 'the veil is one aria-hidden node on the host');

  let ranAt = null;
  let resolvedAt = null;
  veil.through(() => { ranAt = clock.now(); }).then(() => { resolvedAt = clock.now(); });
  const a0 = node.anims[0];
  check(node.classList.contains('is-on') && a0 && a0.duration === VEIL_MS && a0.keyframes[1].opacity === 1, `the cover starts at once as a ${VEIL_MS} ms animation to black (${a0 && a0.duration})`);
  await clock.advance(VEIL_MS - 1);
  check(ranAt === null, 'the switch has not run before the canvas is black');
  await clock.advance(2);
  check(ranAt === VEIL_MS, `the switch runs in the black, when the cover's animation ends: at ${ranAt} ms`);
  check(veil.covered() === false || ranAt !== null, 'covered() is readable');
  check(node.classList.contains('is-on'), 'the canvas stays black while the new stage draws its first frames');
  await clock.advance(40);
  check(!node.classList.contains('is-on'), 'and the uncover begins two frames after the switch');
  const a1 = node.anims[1];
  check(a1 && a1.duration === VEIL_MS && a1.keyframes[0].opacity === 1 && a1.keyframes[1].opacity === 0, 'the uncover is a 350 ms animation from black');
  check(resolvedAt === null, 'through() has not resolved while the black is still coming off');
  await clock.advance(VEIL_MS + 60);
  check(resolvedAt !== null && resolvedAt - ranAt >= VEIL_MS && resolvedAt - ranAt <= VEIL_MS + 32, `through() resolves ${resolvedAt - ranAt} ms after the switch (two frames, then VEIL_MS back)`);
  check(doc.events.join(',') === 'covered,clear', `sr:veil fires at the two edges (${doc.events.join(',')})`);
  check(!veil.busy(), 'nothing is pending afterwards');
}

// --- 2. a second request during a veil joins it, it does not stack ------------------------------
{
  const clock = fakeTimers();
  const doc = fakeDoc(clock);
  const host = { appendChild() {} };
  const veil = createVeil(host, { document: doc, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, requestAnimationFrame: clock.raf });
  const ran = [];
  const a = veil.through(() => ran.push(['a', clock.now()]));
  await clock.advance(100);
  const b = veil.through(() => ran.push(['b', clock.now()]));
  check(a === b, 'a request before the black joins the veil in progress (the same promise)');
  let both = false;
  Promise.all([a, b]).then(() => { both = true; });
  await clock.advance(VEIL_MS * 2 + 200);
  check(ran.length === 2 && ran[0][1] === ran[1][1], `both switches ran in the one black (${JSON.stringify(ran)})`);
  check(both, 'both callers are released together');
  check(doc.events.join(',') === 'covered,clear', `one cover, one clear, not two (${doc.events.join(',')})`);

  // After the switch has run the black is coming off; a newcomer waits for a black of its own.
  const ran2 = [];
  veil.through(() => ran2.push(clock.now()));
  await clock.advance(VEIL_MS + 100); // covered, switched, two frames, uncovering
  const late = veil.through(() => ran2.push(clock.now()));
  await clock.advance(VEIL_MS + 60);
  check(ran2.length === 1, 'a request during the uncover does not run on a canvas that is coming clear');
  await clock.advance(VEIL_MS * 2 + 200);
  check(ran2.length === 2 && ran2[1] - ran2[0] >= VEIL_MS * 2, `it runs in the next black, ${ran2[1] - ran2[0]} ms later`);
  let lateDone = false;
  late.then(() => { lateDone = true; });
  await clock.advance(10);
  check(lateDone, 'and its promise resolves once that black has cleared');
}

// --- 3. reduced motion: the 220 ms fade path, once, never the 350 ms halves ----------------------
{
  const clock = fakeTimers();
  const doc = fakeDoc(clock);
  const host = { children: [], appendChild(n) { this.children.push(n); } };
  const veil = createVeil(host, { document: doc, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, requestAnimationFrame: clock.raf, reducedMotion: () => true });
  const node = host.children[0];
  let ranAt = null;
  let animsAtSwitch = null;
  const p = veil.through(() => { ranAt = clock.now(); animsAtSwitch = node.anims.length; });
  check(ranAt === 0, 'under reduced motion the switch runs at once');
  check(animsAtSwitch === 0, 'the callback runs before the fade covers');
  const durations = node.anims.map((a) => a.duration);
  check(durations.length === 1 && durations[0] === REDUCED_VEIL_MS && node.anims[0].keyframes[0].opacity === 1, `one fade, from black, over ${REDUCED_VEIL_MS} ms (${durations.join(', ')})`);
  check(!durations.includes(VEIL_MS), 'and never the 350 ms veil');
  let done = false;
  p.then(() => { done = true; });
  await clock.advance(0);
  check(done, 'through() resolves at once: there is nothing to wait for');
  check(doc.events.length === 0, 'no covered/clear edges under reduced motion: there was no black to sting in');
}

// --- 4. no DOM at all: the veil still sequences, and nothing throws -----------------------------
{
  const clock = fakeTimers();
  const veil = createVeil(null, { document: null, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, requestAnimationFrame: clock.raf });
  let ran = false;
  let done = false;
  veil.through(() => { ran = true; }).then(() => { done = true; });
  await clock.advance(VEIL_MS * 2 + 200);
  check(ran && done, 'without a document the switch still runs and the promise still resolves');
  veil.fade(220);
  veil.dispose();
  // A switch that throws must not leave the black on.
  const v2 = createVeil(null, { document: null, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, requestAnimationFrame: clock.raf });
  let cleared = false;
  const warn = console.warn;
  console.warn = () => {};
  v2.through(() => { throw new Error('boom'); }).then(() => { cleared = true; });
  await clock.advance(VEIL_MS * 2 + 200);
  console.warn = warn;
  check(cleared, 'a switch that throws still uncovers and resolves');
}

// --- 5. the trip machine: veil -> flight, and the stage moves only in the black -----------------
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { TOURS } = await import(join(JS, 'data/tours.js'));
  const { LAYERS } = await import(join(JS, 'data/layers.js'));
  const { farBodies, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
  const { worldRecords, WORLDS, createWorlds } = await import(join(JS, 'scene/worlds.js'));
  const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
  const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
  const { createTrip, stretchEnvelope } = await import(join(JS, 'ui/trip.js'));

  check(stretchEnvelope(0) === 0 && stretchEnvelope(1) === 0, 'the stretch is 0 at both ends of a flight');
  check(Math.abs(stretchEnvelope(1 / 6) - 0.5) < 1e-9 && stretchEnvelope(0.5) === 1 && Math.abs(stretchEnvelope(5 / 6) - 0.5) < 1e-9, 'up over the first third, held, down over the last');
  check(stretchEnvelope(NaN) === 0 && stretchEnvelope(-1) === 0 && stretchEnvelope(2) === 0, 'and 0 for anything that is not a progress');

  const frames = [];
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  const pump = (n = 6) => {
    for (let i = 0; i < n; i += 1) {
      for (const fn of frames.splice(0, frames.length)) {
        try { fn(Date.now()); } catch { /* paintCard wants a document; not under test */ }
      }
    }
  };
  const tMs = Date.parse('2026-09-22T12:00:00Z');
  const records = [...worldRecords(), ...farBodies(), ...sampleDeepSpace()];
  const byId = new Map(records.map((r) => [r.id, r]));
  const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setTime(tMs);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: null, camera });
  worlds.update(tMs);
  // The veil, stubbed: it records each request and lets the test say when the black has come.
  const veils = [];
  const stretches = [];
  const emphasis = [];
  const ctx = {
    camera, cameraRig: rig, worlds,
    clock: { mode: 'live', rate: 1, paused: false, now: () => tMs, goTo() {}, setRate() {}, setPaused() {}, live() {} },
    layers: LAYERS,
    recordsFor: (id) => records.filter((r) => r.layer === id),
    recordById: (id) => byId.get(id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    selected: () => null,
    select() {},
    deselect() {},
    veil: {
      through(fn) {
        let resolve;
        const p = new Promise((r) => { resolve = r; });
        veils.push({ fn, resolve, stageAtAsk: stage.worldId });
        return p;
      },
      fade() {},
    },
    stars3d: { setStretch: (k) => stretches.push(k) },
    labels: { emphasise: (id) => emphasis.push(['on', id]), clearEmphasis: () => emphasis.push(['off']) },
    setStage(id) {
      if (!STAGES[id] || stage.worldId === id) return false;
      stage.setWorld(id);
      worlds.update(tMs);
      const w = WORLDS.find((x) => x.id === id);
      const r = w ? w.radiusKm / stage.unitKm : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, 45, 1.6) : 5, ms: 0 });
      return true;
    },
  };
  const machine = createTrip(ctx);
  const phases = [];
  machine.onChange((st) => { if (phases[phases.length - 1] !== st.phase) phases.push(st.phase); });
  await machine.start('outer-solar-system');
  pump();
  check(veils.length === 0, `the trip's own first stage is set on begin, before the intro, with no veil (${veils.length})`);
  machine.play();
  pump(2);
  check(machine.state.stopId === 'io' && machine.state.phase === 'flight', `Io is flown to directly: it is on the trip's stage (${machine.state.stopId} ${machine.state.phase})`);
  machine.next(); pump(3);
  check(machine.state.stopId === 'europa' && veils.length === 0, 'Io to Europa is one stage: a flight, no veil');
  machine.next(); pump(3);
  check(machine.state.stopId === 'saturn' && machine.state.phase === 'veil', `Europa to Saturn changes stage and goes into the veil (${machine.state.phase})`);
  check(veils.length === 1 && veils[0].stageAtAsk === 'jupiter', 'one veil, asked for on Jupiter\'s stage');
  check(stage.worldId === 'jupiter', `the stage has not changed before the black (${stage.worldId})`);
  veils[0].fn();
  check(stage.worldId === 'saturn', `the switch inside the black moves the map to Saturn (${stage.worldId})`);
  check(machine.state.phase === 'veil', 'and the phase is still the veil until the canvas is clear');
  veils[0].resolve();
  await Promise.resolve(); await Promise.resolve();
  pump(2);
  check(machine.state.phase === 'flight' && machine.state.stopId === 'saturn', `once clear, the flight to Saturn begins (${machine.state.phase})`);
  const seq = phases.slice(phases.indexOf('veil'));
  check(seq[0] === 'veil' && seq[1] === 'flight', `phase order ${seq.slice(0, 4).join(' -> ')}`);
  rig.finishFlight(); pump(4);
  check(machine.state.phase === 'settle', `and it arrives (${machine.state.phase})`);

  // Chapters: Saturn's lands with the stop; Titan, the same chapter, keeps it up.
  const saturnChapter = TOURS.find((t) => t.id === 'outer-solar-system').stops.find((s) => s.id === 'saturn').chapter;
  check(machine.state.chapter === saturnChapter, `Saturn's chapter is up after arrival (${machine.state.chapter})`);
  machine.next(); pump(3);
  check(machine.state.stopId === 'titan' && machine.state.chapter === saturnChapter, 'Titan is in the same chapter, so the line stays up through the flight');
  // A Next pressed in the black: the veil in progress is superseded, the switch it carried does
  // nothing, and the stop pressed for is the one flown to.
  machine.next(); pump(2); // enceladus, same stage
  machine.next(); pump(2); // triton: a veil
  check(machine.state.stopId === 'triton' && machine.state.phase === 'veil' && veils.length === 2, `Triton is behind a veil (${machine.state.phase})`);
  machine.next(); pump(2); // pluto, pressed in the black
  check(machine.state.stopId === 'pluto' && veils.length === 3, 'Next in the black asks for the next stop\'s veil');
  veils[1].fn();
  check(stage.worldId === 'saturn', `the superseded switch to Neptune does nothing (${stage.worldId})`);
  veils[2].fn();
  check(stage.worldId === 'pluto', `the live one moves the map to Pluto (${stage.worldId})`);
  veils[1].resolve(); veils[2].resolve();
  await Promise.resolve(); await Promise.resolve();
  pump(2);
  check(machine.state.stopId === 'pluto' && machine.state.phase === 'flight', `and Pluto is flown to, once (${machine.state.phase})`);
  // The labels: every move on clears the emphasis before anything flies. (The emphasis itself is
  // set at the dwell, which this harness never reaches: paintCard wants a document. The browser
  // check reads it at the Io stop instead.)
  check(emphasis.filter((e) => e[0] === 'off').length === 7, `each of the seven stops reached cleared the emphasis on the way in (${emphasis.length} calls)`);
  // No stretch on a world stage, ever.
  check(!stretches.some((k) => k > 0), `no star-stretch on a world stage (${stretches.filter((k) => k > 0).length} writes above 0)`);
  machine.stop('left');
  check(machine.state.chapter === null, 'leaving clears the chapter');
  delete globalThis.requestAnimationFrame;
}

if (problems.length) {
  console.log(`veil: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('veil ok: 350 ms to black, the switch in it, 350 ms back; a second request joins; reduced motion is one 220 ms fade');
