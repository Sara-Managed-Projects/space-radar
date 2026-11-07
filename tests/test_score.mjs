#!/usr/bin/env node
// The score of the climb and the real recordings (forge #163; site/js/audio/score.js), with a stub AudioContext.
//
// Held: the six rooms of the climb and the registry bed each plays; the galaxies and the edge are the ladder's
// bed slowed and darkened, never a new file; a star system is a star's room; the score wraps the beds so the
// listeners main.js already has reach the right bed and voice it (a bed that has just started takes its rate at
// once, the same bed glides); the filter sits between the beds' bus and `under` only; the recordings' panel
// shows only with sound on, at a stage with a recording, outside a trip, and says how each was made; a recording
// is fetched only when its button is pressed and ducks the bed; every real recording in the registry mirror is
// heard somewhere the app has; main.js loads score.js by import() only, so it is not a first visit's byte.
//
// Run: node tests/test_score.mjs

import { readFileSync } from 'node:fs';
import { createAudio } from '../site/js/audio/engine.js';
import { createLoader } from '../site/js/audio/load.js';
import { createBeds } from '../site/js/audio/beds.js';
import { OPUS_TYPE } from '../site/js/audio/pick.js';
import { stageClass, bedOf, voiceOf, heardAt, installScore, DUCK_REAL } from '../site/js/audio/score.js';
import { REAL_SOUNDS } from '../site/js/data/realsounds.js';
import { COPY } from '../site/js/copy/en.js';

let failures = 0;
let checks = 0;
function check(ok, msg) {
  checks += 1;
  if (!ok) { failures += 1; console.log(`  **  ${msg}`); }
}
const ladder = (id) => ['stellar', 'galaxy', 'local-group'].includes(id);

// --- the rooms --------------------------------------------------------------------------------
const rooms = { earth: 'near', moon: 'near', mars: 'planets', sun: 'sun', stellar: 'stars', 'system-trappist-1': 'stars', galaxy: 'galaxies', 'local-group': 'edge', '': 'planets' };
for (const [id, want] of Object.entries(rooms)) check(stageClass(id, ladder) === want, `stage ${id || '(none)'} is ${want}: got ${stageClass(id, ladder)}`);
check(['near', 'planets', 'sun', 'stars', 'galaxies', 'edge'].map(bedOf).join() === 'earth,world,sun,ladder,ladder,ladder', 'each room plays a bed the registry has');
check(voiceOf('stars').rate === 1 && voiceOf('galaxies').rate < 1 && voiceOf('edge').rate < voiceOf('galaxies').rate, 'the climb past the stars slows the bed');
check(voiceOf('edge').hz < voiceOf('galaxies').hz && voiceOf('galaxies').hz < voiceOf('stars').hz, 'and darkens it');

// --- the recordings in the mirror -------------------------------------------------------------------
const stages = new Set(['sun', 'stellar', 'jupiter', 'ganymede', 'saturn', 'mars']);
check(REAL_SOUNDS.length === 5, `five real recordings: ${REAL_SOUNDS.length}`);
for (const r of REAL_SOUNDS) {
  check(r.heard.every((s) => stages.has(s)), `${r.id}: heard at a stage the app has`);
  check(r.how === 'sonified' || r.how === 'microphone', `${r.id}: says how it was made`);
  check(/public domain$/.test(r.credit) && /^audio\/real-.*\.m4a$/.test(r.file), `${r.id}: credit and file`);
  check(typeof COPY.realSound === 'object' && COPY.realSound.names[r.id], `${r.id}: has a name in copy/en.sound.js`);
}
check(heardAt('mars').length === 2 && heardAt('saturn').length === 1 && heardAt('earth').length === 0, 'what is heard where');

// --- the stubs ---------------------------------------------------------------------------------
class Param {
  constructor(v) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; }
  setTargetAtTime(v, t, k) { this.calls.push(['target', v, t, k]); this.value = v; }
  linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); }
}
class Node {
  constructor() { this.to = []; }
  connect(n) { this.to.push(n); return n; }
  disconnect(n) { this.to = n ? this.to.filter((x) => x !== n) : []; }
}
class StubContext {
  constructor() { this.state = 'running'; this.currentTime = 10; this.destination = new Node(); this.sources = []; this.filters = []; }
  createGain() { const g = new Node(); g.gain = new Param(1); return g; }
  createBiquadFilter() { const f = new Node(); f.frequency = new Param(350); f.Q = new Param(1); this.filters.push(f); return f; }
  createBufferSource() {
    const s = new Node();
    Object.assign(s, { buffer: null, loop: false, started: null, playbackRate: new Param(1), start(t) { this.started = t; }, stop() { this.stopped = true; } });
    this.sources.push(s);
    return s;
  }
  decodeAudioData(bytes) { return Promise.resolve({ duration: 20, from: bytes.from }); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
}
function el(tag) {
  const e = new Node();
  Object.assign(e, {
    tag, children: [], attrs: {}, hidden: false, className: '', title: '', type: '', listeners: {}, _text: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    append(...c) { this.children.push(...c); },
    appendChild(c) { this.children.push(c); return c; },
    remove() { this.removed = true; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    click() { this.listeners.click && this.listeners.click(); },
  });
  // An accessor, not a value: Object.assign would copy what the getter returns once.
  Object.defineProperty(e, 'textContent', {
    get() { return this._text + this.children.map((c) => c.textContent).join(' '); },
    set(v) { this._text = String(v); this.children = []; },
  });
  return e;
}
const links = [];
const doc = {
  body: el('body'),
  head: { appendChild(l) { links.push(l); } },
  createElement: el,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
};
const find = (node, cls) => (node.className === cls ? [node] : []).concat(...node.children.map((c) => find(c, cls)));
const tick = () => new Promise((r) => setTimeout(r, 0));

// --- the score on the beds ---------------------------------------------------------------------------
const fetched = [];
const engine = createAudio({ AudioContext: StubContext, storage: { getItem: () => null, setItem() {} }, document: doc, setTimeout: () => {} });
const fetch = async (url) => { fetched.push(url); return { ok: true, status: 200, arrayBuffer: async () => ({ from: url }) }; };
const loader = createLoader(engine, { fetch, canPlay: (t) => (t === OPUS_TYPE ? 'probably' : ''), warn: () => {} });
const ROWS = ['earth', 'world', 'sun', 'ladder'].map((s) => ({ id: `bed-${s}`, kind: 'bed', stage: s, file: `audio/bed-${s}.opus`, twin: `audio/bed-${s}.m4a`, loop: true }));
engine.beds = createBeds(engine, ROWS, { loader, setTimeout: () => {} });
const trip = { state: { phase: 'idle' }, onChange() { return () => {}; } };
const ctx = { stage: { worldId: 'stellar' }, trip };
engine.enable();
const score = installScore(engine, ctx, { isLadder: ladder, document: doc, loader });
check(engine.score === score && installScore(engine, ctx, { document: doc }) === score, 'installed once per engine');
await tick(); await tick();
const c = engine.context;
let bed = engine.beds.current;
check(bed && bed.row.id === 'bed-ladder', `the stars play the ladder bed: ${bed && bed.row.id}`);
const f = c.filters[0];
check(f && engine.beds.bus.to.includes(f) && f.to.includes(engine.beds.under) && !engine.beds.bus.to.includes(engine.beds.under), 'the filter sits between the bus and under');
check(bed.source.playbackRate.calls.some((x) => x[0] === 'set' && x[1] === 1), 'a fresh bed takes its rate at once');
ctx.stage.worldId = 'galaxy';
await engine.beds.enter('ladder');
check(engine.beds.current === bed && c.sources.length === 1, 'the galaxies keep the same bed: no new file, no restart');
const glide = bed.source.playbackRate.calls.filter((x) => x[0] === 'target').pop();
check(glide && Math.abs(glide[1] - voiceOf('galaxies').rate) < 1e-9, 'and glide it down');
check(f.frequency.calls.filter((x) => x[0] === 'target').pop()[1] === voiceOf('galaxies').hz, 'and the filter closes');
ctx.stage.worldId = 'system-trappist-1';
await engine.beds.enter('world');
check(engine.beds.current.row.id === 'bed-ladder', 'a star system is a star\'s room, whatever rung main.js passed');

// --- the recordings' panel ------------------------------------------------------------------------
const panel = () => find(doc.body, 'sr-realsound')[0];
check(!panel() || panel().hidden, 'no panel where nothing was recorded (a star system)');
ctx.stage.worldId = 'saturn';
await engine.beds.enter('world');
check(panel() && panel().hidden === false && links.length === 1, 'at Saturn, with sound on, the panel shows and its sheet is linked');
const how = find(panel(), 'sr-realsound__how')[0];
check(how && how.textContent === COPY.realSound.sonified, 'it says the radio is data turned into sound');
check(!fetched.some((u) => u.includes('real-')), 'nothing is fetched before the button is pressed');
const play = find(panel(), 'sr-realsound__play')[0];
play.click();
await tick(); await tick(); await tick();
check(fetched.some((u) => u === 'audio/real-cassini-saturn.m4a'), 'pressing it fetches that one file');
check(engine.beds.bus.gain.calls.some((x) => x[0] === 'ramp' && x[1] === DUCK_REAL), 'and ducks the bed under it');
check(find(panel(), 'sr-realsound__credit')[0].textContent.includes('NASA/JPL/University of Iowa'), 'the credit shows while it plays');
trip.state.phase = 'dwell';
score.paint();
check(panel().hidden === true, 'hidden during a trip');
trip.state.phase = 'idle';
engine.disable();
score.paint();
check(panel().hidden === true, 'hidden with sound off');
score.destroy();
check(!engine.score, 'destroy hands the beds back');

// --- not a first visit's byte ------------------------------------------------------------------------
const main = readFileSync(new URL('../site/js/main.js', import.meta.url), 'utf8');
check(!/^import[^;]*audio\/score\.js/m.test(main) && /import\('\.\/audio\/score\.js'\)/.test(main), 'main.js loads score.js by import() only');
const scoreSrc = readFileSync(new URL('../site/js/audio/score.js', import.meta.url), 'utf8');
check(scoreSrc.includes("import '../copy/en.sound.js'") && !main.includes('en.sound.js') && !main.includes('realsounds.js'), 'its words and its table come with it');

if (failures) { console.log(`test_score: ${failures} of ${checks} failed`); process.exit(1); }
console.log(`test_score: ok (${checks} checks)`);
