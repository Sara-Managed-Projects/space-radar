// drift: the drift's "only space" option (ui/drift.js), off and on at the same moment.
//
// The drift is started as a link starts it, through craft; at its first stay it is PAUSED, so the
// camera and the choice of place hold still, and three pictures are taken: as it is (names, dots,
// the orbit), with only space on, and with it off again. Then the bar is woken, its options opened
// and photographed, and "Only space" is pressed AS A VISITOR PRESSES IT, at a world this time.
// Beside each picture the probe writes down what the scene says is drawn (which layers' dots, the
// orbit line, the ground track, the planets' orbits, the screen, the bar's opacity), and it fails
// when only space leaves any of it on, or when switching it off, or ending the drift, does not put
// back exactly what was there. It also writes down how long each flight was planned to take
// (ui/driftplan.js planFlight): the real app's own numbers for the hops it happened to make.
// Run it at 1440 x 900 and again with `-f mobile=true`.
look.probe = 'drift';
const out = { stops: [], hops: [], problems: [] };
const drawn = () => {
  const glyphs = [];
  for (const [id, gl] of sr.glyphLayers) { try { if (gl.mesh && gl.mesh.visible) glyphs.push(id); } catch { /* not built */ } }
  const host = document.querySelector('.sr-drift__host');
  const eye = document.querySelector('#sr-rail .sr-rail__btn--clean');
  return {
    glyphs: glyphs.sort(),
    orbit: !!(sr.orbitLine && sr.orbitLine.line.visible),
    track: !!(sr.groundTrack && sr.groundTrack.group.visible),
    rings: !!(sr.orbitRings && sr.orbitRings.group.visible),
    screen: sr.cleanView.state(),
    labels: getComputedStyle(document.getElementById('labels') || document.body).visibility,
    hud: getComputedStyle(document.getElementById('sr-hud') || document.body).visibility,
    bar: host ? Number(getComputedStyle(host).opacity) : null,
    eye: eye ? Number(getComputedStyle(eye).opacity) : null,
    cursor: getComputedStyle(document.documentElement).cursor,
    bare: document.documentElement.classList.contains('sr-drift--bare'),
  };
};
const scene = (d) => JSON.stringify({ glyphs: d.glyphs, orbit: d.orbit, track: d.track, rings: d.rings, screen: d.screen, labels: d.labels, hud: d.hud });
const layersNow = () => JSON.stringify(sr.layers.map((l) => [l.id, sr.isLayerOn(l.id)]));
const layersBefore = layersNow();
const screenBefore = sr.cleanView.state();

const d = await sr.wantDrift({ drift: 'craft,brisk' }, 'link');
let lastFlight = null;
const noteFlight = () => { const st = d.state(); if (st.phase === 'flight' && st.place !== lastFlight) { lastFlight = st.place; out.hops.push({ to: st.place, hood: st.hood, plannedMs: st.flightMs }); } };
/** Wait for a stay that the drift keeps (it leaves a dot in black four seconds in), then pause it. */
const stay = async (want, capS) => {
  let last = null;
  for (let i = 0; i < capS * 2; i++) {
    await sleep(500);
    noteFlight();
    const st = d.state();
    if (st.phase !== 'dwell' || st.place === last) continue;
    last = st.place;
    await sleep(5500);
    noteFlight();
    const now = d.state();
    if (now.place !== st.place || now.phase !== 'dwell') continue;
    if (want && !want(now)) { d.skip(); continue; }
    d.pause();
    return now;
  }
  return null;
};
const hopsNote = () => { const st = d.state(); const last = out.hops[out.hops.length - 1]; if (last && last.to === st.place) last.plannedMs = st.flightMs; };

// 1. A craft near the Earth: names, dots, an orbit, a ground track to hide.
const first = await stay(null, 120);
if (!first) return finish({ ...out, fail: 'the drift kept no stay in 120 s' });
hopsNote();
await sleep(4000); // the bar and the pointer go three seconds after the pointer stops
const a = drawn();
await shot('1-off-' + first.place, 'the drift paused at ' + first.place + ', names on: ' + scene(a));
d.setOptions({ bare: true });
await sleep(3000);
const b = drawn();
await shot('2-only-space-' + first.place, 'the same moment, only space: ' + scene(b) + ', bar opacity ' + b.bar);
d.setOptions({ bare: false, tags: true });
await sleep(3000);
const c = drawn();
await shot('3-off-again-' + first.place, 'only space switched off again: ' + scene(c));
out.stops.push({ place: first.place, hood: first.hood, off: a, on: b, again: c });
if (b.glyphs.length || b.orbit || b.track || b.rings || b.screen !== 'clear' || b.labels !== 'hidden' || b.hud !== 'hidden') out.problems.push('only space left something on at ' + first.place + ': ' + scene(b));
if (b.bar !== 0) out.problems.push('the bar did not go in only space (opacity ' + b.bar + ')');
if (scene(a) !== scene(c)) out.problems.push('switching only space off did not put back what was there: ' + scene(a) + ' then ' + scene(c));
if (!a.glyphs.length) look.missing.push('no dots were drawn at ' + first.place + ' before only space: the first pair proves less than it should');

// 2. The bar, woken as a pointer wakes it, with its options open.
window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 200 }));
const optionsButton = document.querySelector('.sr-drift__btn[aria-controls]');
optionsButton.click();
await sleep(600);
const panel = document.getElementById('sr-drift-options');
const box = panel.getBoundingClientRect();
const buttons = [...panel.querySelectorAll('button')].map((x) => { const r = x.getBoundingClientRect(); return { text: x.textContent, pressed: x.getAttribute('aria-pressed'), w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= -0.5 && r.right <= innerWidth + 0.5 }; });
out.bar = { width: Math.round(box.width), viewport: innerWidth, buttons };
if (buttons.some((x) => !x.inside || x.h < 44)) out.problems.push('a button of the options is off the screen or under 44 px: ' + JSON.stringify(buttons.filter((x) => !x.inside || x.h < 44)));
await shot('4-bar-options', 'the drift bar with its options open: ' + buttons.map((x) => x.text + (x.pressed === 'true' ? ' (on)' : '')).join(', '));

// 3. A world, with "Only space" pressed on the bar itself.
d.setOptions({ through: ['worlds'] });
optionsButton.click();
d.resume();
d.skip();
const second = await stay((st) => st.place !== first.place, 150);
if (!second) return finish({ ...out, fail: 'the drift kept no stay at a world in 150 s' });
hopsNote();
await sleep(4000);
const e = drawn();
await shot('5-off-' + second.place, 'the drift paused at ' + second.place + ', names on: ' + scene(e));
window.dispatchEvent(new PointerEvent('pointermove', { clientX: 220, clientY: 220 }));
optionsButton.click();
await sleep(300);
const bareButton = [...panel.querySelectorAll('button')].find((x) => x.title && x.textContent === 'Only space');
if (!bareButton) return finish({ ...out, fail: 'the options have no "Only space" button' });
bareButton.focus();
bareButton.click();
// The options fold away, and three seconds later the bar, the eye and the pointer go. A fade is
// counted in frames, and a software frame is slow: wait for it to end, not for a time.
await sleep(3500);
await until(() => { const x = drawn(); return x.bar === 0 && x.eye === 0; }, 30000);
const f = drawn();
await shot('6-only-space-' + second.place, 'the same moment after pressing Only space on the bar: ' + scene(f) + ', bar opacity ' + f.bar + ', eye opacity ' + f.eye + ', pointer ' + f.cursor);
out.stops.push({ place: second.place, hood: second.hood, off: e, on: f, pressed: bareButton.getAttribute('aria-pressed'), address: location.hash });
if (f.glyphs.length || f.orbit || f.track || f.rings || f.screen !== 'clear') out.problems.push('only space left something on at ' + second.place + ': ' + scene(f));
if (f.bar !== 0 || f.eye !== 0 || f.cursor !== 'none') out.problems.push('pressed on the bar, something stayed over the picture: bar ' + f.bar + ', eye ' + f.eye + ', pointer ' + f.cursor);
if (!/drift=[^&]*bare/.test(location.hash)) out.problems.push('the address does not say bare: ' + location.hash);
// A key brings the bar back.
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
await until(() => drawn().bar > 0.9, 20000);
out.barAfterKey = drawn().bar;
if (!(out.barAfterKey > 0.9)) out.problems.push('a key did not bring the bar back (opacity ' + out.barAfterKey + ')');

// 4. Still in only space, it goes on by itself through the worlds: how long each flight was planned
// to take, and how long it took on this machine's clock.
d.resume();
d.skip();
{
  const t0 = Date.now();
  let flying = null;
  while (Date.now() - t0 < 110000 && out.hops.filter((h) => h.tookMs).length < 3) {
    await sleep(250);
    const st = d.state();
    if (st.phase === 'flight' && (!flying || flying.to !== st.place)) flying = { to: st.place, hood: st.hood, from: Date.now() };
    if (flying && st.place === flying.to) flying.plannedMs = st.flightMs;
    if (flying && st.phase === 'dwell' && st.place === flying.to) { out.hops.push({ to: flying.to, hood: flying.hood, plannedMs: flying.plannedMs, tookMs: Date.now() - flying.from, bare: true }); flying = null; }
  }
  out.bareWalk = drawn();
  if (out.bareWalk.glyphs.length || out.bareWalk.orbit || out.bareWalk.track || out.bareWalk.rings) out.problems.push('after flying on in only space something is drawn again: ' + scene(out.bareWalk));
}

// 5. The drift ends in only space: everything is as it was before it started.
d.stop('button');
await sleep(2500);
const g = drawn();
out.after = { drawn: g, layersSame: layersNow() === layersBefore, screen: sr.cleanView.state(), hook: typeof sr.bareFrame };
if (!out.after.layersSame) out.problems.push('the layers are not what they were before the drift');
if (out.after.screen !== screenBefore || g.bare || out.after.hook !== 'undefined') out.problems.push('ending the drift left only space on: ' + JSON.stringify(out.after));
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
