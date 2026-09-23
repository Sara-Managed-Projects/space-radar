#!/usr/bin/env node
// Spec 0035 (2026-09-23): the sound engine with a stub AudioContext, no browser, no files.
//
// The one promise the whole spec rests on is that the first sound is a choice: no context and no
// fetch before a gesture. A browser check (scripts/check-drawn.mjs) holds the app to that at boot;
// this holds the modules to it, and to the six cases the spec's acceptance names: no context
// before enable(); enable() reads and writes the stored flag; a stage change is a 2 s ramp down on
// the old bed and up on the new; a sting ducks the bed to 0.4 and back; disable() ramps the master
// to 0 and suspends; a fetch that fails leaves no bed and one warning.
//
// Run: node tests/test_audio.mjs

import { createAudio, readFlag, writeFlag, STORE_KEY, VOLUME } from '../site/js/audio/engine.js';
import { createLoader } from '../site/js/audio/load.js';
import { createBeds, XFADE_S } from '../site/js/audio/beds.js';
import { createStings, DUCK, DUCK_IN_S, DUCK_BACK_S } from '../site/js/audio/stings.js';
import { pickFormat, rungOf, RUNGS, OPUS_TYPE } from '../site/js/audio/pick.js';
import { AUDIO } from '../site/js/data/audio.js';

let failures = 0;
let checks = 0;
function check(ok, msg) {
  checks += 1;
  if (ok) console.log(`  ok  ${msg}`);
  else { failures += 1; console.log(`  **  ${msg}`); }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- the stubs ------------------------------------------------------------------------------

class Param {
  constructor(v) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); }
}
let contextsMade = 0;
class StubContext {
  constructor() {
    contextsMade += 1;
    this.state = 'running';
    this.currentTime = 10;
    this.destination = { name: 'destination' };
    this.gains = [];
    this.sources = [];
    this.decoded = 0;
  }
  createGain() {
    const g = { gain: new Param(1), to: null, connect(n) { this.to = n; }, disconnect() { this.to = null; } };
    this.gains.push(g);
    return g;
  }
  createBufferSource() {
    const s = { buffer: null, loop: false, to: null, started: null, stopped: false,
      connect(n) { this.to = n; }, start(t) { this.started = t; }, stop() { this.stopped = true; } };
    this.sources.push(s);
    return s;
  }
  decodeAudioData(bytes) { this.decoded += 1; return Promise.resolve({ duration: 70, from: bytes.from }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
function fakeDocument() {
  const handlers = new Map();
  return {
    hidden: false,
    addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); },
    removeEventListener(type, fn) { if (handlers.has(type)) handlers.get(type).delete(fn); },
    fire(type) { for (const fn of [...(handlers.get(type) || [])]) fn({ type }); },
    count(type) { return handlers.has(type) ? handlers.get(type).size : 0; },
  };
}
function fetchLog(fail = new Set()) {
  const log = [];
  const f = async (url) => {
    log.push(url);
    if (fail.has(url) || fail.has('*')) throw new Error('offline');
    return { ok: true, status: 200, arrayBuffer: async () => ({ from: url }) };
  };
  f.log = log;
  return f;
}
const ROWS = [
  { id: 'bed-earth', kind: 'bed', stage: 'earth', file: 'audio/bed-earth.opus', twin: 'audio/bed-earth.m4a', seconds: 70, kb: 500, loop: true, credit: 'A' },
  { id: 'bed-ladder', kind: 'bed', stage: 'ladder', file: 'audio/bed-ladder.opus', twin: 'audio/bed-ladder.m4a', seconds: 70, kb: 500, loop: true, credit: 'B' },
  { id: 'sting-arrive', kind: 'sting', file: 'audio/sting-arrive.opus', twin: 'audio/sting-arrive.m4a', seconds: 1.5, kb: 12, loop: false, credit: 'C' },
];
const opusYes = (type) => (type === OPUS_TYPE ? 'probably' : '');
const flush = () => new Promise((r) => setTimeout(r, 0));

function rig({ stored, fail, rows = ROWS } = {}) {
  const storage = memoryStorage(stored ? { [STORE_KEY]: JSON.stringify(stored) } : {});
  const doc = fakeDocument();
  const timers = [];
  const engine = createAudio({ AudioContext: StubContext, storage, document: doc, setTimeout: (fn) => timers.push(fn) });
  const warnings = [];
  const fetch = fetchLog(fail);
  const loader = createLoader(engine, { fetch, canPlay: opusYes, warn: (...a) => warnings.push(a) });
  const beds = createBeds(engine, rows, { loader, setTimeout: (fn) => timers.push(fn) });
  const stings = createStings(engine, beds, rows, { loader });
  return { storage, doc, timers, engine, warnings, fetch, beds, stings };
}

// --- 1. nothing before a gesture --------------------------------------------------------------
console.log('1. no AudioContext and no fetch before enable()');
{
  contextsMade = 0;
  const r = rig();
  check(r.engine.context === null, 'context is null after createAudio()');
  check(contextsMade === 0, `no AudioContext constructed (${contextsMade})`);
  check(r.engine.isOn() === false, 'a first visit is off');
  await r.beds.enter('earth');
  await r.stings.play('arrive');
  check(r.fetch.log.length === 0, `entering a rung and playing a sting while off fetch nothing (${r.fetch.log.length})`);
  check(r.doc.count('pointerup') === 0, 'no gesture listener for a visitor who never asked for sound');
}

// --- 2. enable() and the stored flag ------------------------------------------------------------
console.log('2. enable() creates one context and the choice is remembered');
{
  contextsMade = 0;
  const r = rig();
  r.engine.enable();
  check(contextsMade === 1 && r.engine.context instanceof StubContext, 'enable() makes exactly one AudioContext');
  check(r.storage.getItem(STORE_KEY) === '{"on":true}', `localStorage['${STORE_KEY}'] reads {"on":true}`);
  r.engine.enable();
  check(contextsMade === 1, 'a second enable() reuses it');
  const last = r.engine.master.gain.calls.at(-1);
  check(last[0] === 'ramp' && near(last[1], VOLUME), `master ramps up to ${VOLUME}`);

  // A returning visitor: the flag is read, and still no context until a gesture.
  contextsMade = 0;
  const back = rig({ stored: { on: true } });
  check(back.engine.isOn() === true, 'the stored {on:true} is read back on the next visit');
  check(back.engine.context === null && contextsMade === 0, '...and it still makes no context at load');
  check(back.doc.count('pointerup') === 1 && back.doc.count('keydown') === 1, '...it waits for the first tap or key instead');
  back.doc.fire('pointerup');
  check(contextsMade === 1 && back.engine.context.state === 'running', 'the first gesture starts it');
  check(back.doc.count('pointerup') === 0, 'and the one-shot listener is gone');

  // Mute persists.
  const m = rig({ stored: { on: true } });
  m.engine.enable();
  m.engine.disable();
  check(m.storage.getItem(STORE_KEY) === '{"on":false}', 'disable() writes {"on":false}');
  check(readFlag(m.storage) === false, 'and a reload reads it as off');
  // Private mode: storage that throws reads as off and never throws out.
  const hostile = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceeded'); } };
  check(readFlag(hostile) === false && writeFlag(hostile, true) === false, 'a storage that throws reads as off and a write is swallowed');
  check(readFlag(memoryStorage({ [STORE_KEY]: 'not json' })) === false, 'a corrupt flag reads as off');
}

// --- 3. beds cross-fade on a stage change ---------------------------------------------------------
console.log('3. beds.enter() cross-fades over 2 s');
{
  const r = rig();
  r.engine.enable();
  const ctx = r.engine.context;
  const first = await r.beds.enter('earth');
  check(first && first.row.id === 'bed-earth', 'the earth bed plays');
  check(r.fetch.log.join() === 'audio/bed-earth.opus', `one fetch, the Opus file (${r.fetch.log.join()})`);
  check(first.source.loop === true, 'a bed loops');
  const t0 = ctx.currentTime;
  ctx.currentTime = 30;
  const second = await r.beds.enter('ladder');
  const up = second.gain.gain.calls;
  const down = first.gain.gain.calls;
  check(up[0][0] === 'set' && up[0][1] === 0 && up[1][0] === 'ramp' && up[1][1] === 1 && near(up[1][2], 30 + XFADE_S),
    `the new bed ramps 0 -> 1 from t=30 to t=${30 + XFADE_S} (${JSON.stringify(up)})`);
  const ramp = down.filter((c) => c[0] === 'ramp').at(-1);
  check(ramp && ramp[1] === 0 && near(ramp[2], 30 + XFADE_S), `the old bed ramps to 0 by t=${30 + XFADE_S} (${JSON.stringify(down.slice(-3))})`);
  check(r.timers.length === 1, 'the old source is stopped after the fade');
  r.timers.shift()();
  check(first.source.stopped === true, '...and it is');
  check(r.beds.current === second && r.beds.state.bed.row.id === 'bed-ladder', 'beds.current is the ladder bed');
  const again = await r.beds.enter('ladder');
  check(again === second && r.fetch.log.length === 2, 'entering the same rung again changes nothing and fetches nothing');
  await r.beds.enter('earth');
  check(r.fetch.log.length === 2 && ctx.decoded === 2, 'coming back to a rung plays the decoded bed again, no second fetch');
  // A rung with no bed of its own fades to quiet.
  await r.beds.enter('sun');
  check(r.beds.current === null, 'a rung with no bed is quiet, not the last rung carried on');
  check(t0 === 10, 'stub clock sane');
}

// --- 4. a sting ducks the bed ------------------------------------------------------------------------
console.log('4. stings.play() ducks the bed to 0.4 and back');
{
  const r = rig();
  r.engine.enable();
  const ctx = r.engine.context;
  await r.beds.enter('earth');
  ctx.currentTime = 50;
  const played = await r.stings.play('arrive');
  check(played === true, "play('arrive') finds `sting-arrive`");
  const g = r.beds.bus.gain.calls;
  const ramps = g.filter((c) => c[0] === 'ramp');
  check(ramps.length === 2 && near(ramps[0][1], DUCK) && near(ramps[0][2], 50 + DUCK_IN_S),
    `the bed bus ramps to ${DUCK} in ${DUCK_IN_S} s`);
  const hold = g.find((c) => c[0] === 'set' && near(c[1], DUCK));
  check(hold && near(hold[2], 50 + DUCK_IN_S + 1.5), 'holds there for the sting\'s 1.5 s');
  check(near(ramps[1][1], 1) && near(ramps[1][2], 50 + DUCK_IN_S + 1.5 + DUCK_BACK_S), `and returns to 1 over ${DUCK_BACK_S} s`);
  const src = ctx.sources.at(-1);
  check(src.started === 50 && src.to && src.to.to === r.engine.master, 'the sting plays straight into the master, not under the duck');
  check(r.beds.current.gain.gain.calls.every((c) => c[0] !== 'cancel'), 'the duck never touches the cross-fade gain');
  check((await r.stings.play('nonexistent')) === false, 'an unknown sting is nothing, not an error');
}

// --- 5. disable() ---------------------------------------------------------------------------------------
console.log('5. disable() ramps the master to 0 and suspends');
{
  const r = rig();
  r.engine.enable();
  const ctx = r.engine.context;
  ctx.currentTime = 70;
  r.engine.disable();
  const last = r.engine.master.gain.calls.at(-1);
  check(last[0] === 'ramp' && last[1] === 0 && near(last[2], 70.3), `master ramps to 0 by t=70.3 (${JSON.stringify(last)})`);
  check(ctx.state === 'running' && r.timers.length === 1, 'the suspend waits for the fade');
  r.timers.shift()();
  check(ctx.state === 'suspended', 'then the context is suspended');
  check(r.engine.isOn() === false && r.engine.live() === false, 'and it is off');
  await r.beds.enter('ladder');
  check(r.fetch.log.length === 0, 'a stage change while muted fetches nothing');
  r.engine.enable();
  check(ctx.state === 'running' && r.engine.context === ctx, 'turning it back on resumes the same context');
  // Hidden tab.
  r.doc.hidden = true; r.doc.fire('visibilitychange');
  check(ctx.state === 'suspended', 'a hidden tab suspends');
  r.doc.hidden = false; r.doc.fire('visibilitychange');
  check(ctx.state === 'running', 'and a visible one resumes, because sound is on');
}

// --- 6. a missing asset is silent -------------------------------------------------------------------------
console.log('6. a fetch that fails leaves no bed and one warning');
{
  const r = rig({ fail: new Set(['*']) });
  r.engine.enable();
  const got = await r.beds.enter('earth');
  check(got === null && r.beds.state.bed === null, 'state.bed === null');
  check(r.fetch.log.join() === 'audio/bed-earth.opus,audio/bed-earth.m4a', `it tried the Opus file, then the AAC twin (${r.fetch.log.join()})`);
  await r.beds.enter('ladder');
  await r.stings.play('arrive');
  check(r.warnings.length === 1, `one warning for the session, not one per file (${r.warnings.length})`);
  check(r.engine.live() === true, 'and the engine is still running');
  // A twin that works when the first choice does not.
  const t = rig({ fail: new Set(['audio/bed-earth.opus']) });
  t.engine.enable();
  const bed = await t.beds.enter('earth');
  check(bed && bed.row.id === 'bed-earth' && t.warnings.length === 0, 'an Opus file that fails falls back to its twin with no warning');
}

// --- 7. the pure helpers ------------------------------------------------------------------------------------
console.log('7. rungOf and pickFormat');
{
  const ladder = (id) => ['stellar', 'galaxy', 'local-group'].includes(id);
  const cases = { earth: 'earth', moon: 'earth', sun: 'sun', stellar: 'ladder', galaxy: 'ladder', 'local-group': 'ladder', jupiter: 'world', europa: 'world', '': 'world' };
  const bad = Object.entries(cases).filter(([id, want]) => rungOf(id, ladder) !== want);
  check(bad.length === 0, `every stage maps to its rung (${bad.map((b) => b[0]).join(', ') || 'all'})`);
  check(RUNGS.join() === 'earth,world,sun,ladder', 'four rungs');
  const row = ROWS[0];
  check(pickFormat(row, opusYes).join() === 'audio/bed-earth.opus,audio/bed-earth.m4a', 'a browser that plays Opus gets Opus first');
  check(pickFormat(row, () => '').join() === 'audio/bed-earth.m4a,audio/bed-earth.opus', 'Safari without Opus gets the AAC twin first');
  check(pickFormat(row, () => { throw new Error('no'); })[0] === 'audio/bed-earth.m4a', 'a canPlayType that throws means the twin');
}

// --- 8. the shipped registry mirror --------------------------------------------------------------------------
console.log('8. the shipped rows');
{
  const beds = AUDIO.filter((r) => r.kind === 'bed');
  const stages = beds.map((r) => r.stage);
  check(new Set(stages).size === stages.length, `one bed per rung (${stages.join(', ') || 'none yet'})`);
  check(beds.every((r) => RUNGS.includes(r.stage)), 'every bed names a rung rungOf() can answer');
  check(AUDIO.every((r) => /^audio\/[\w.-]+\.opus$/.test(r.file) && /^audio\/[\w.-]+\.m4a$/.test(r.twin)), 'every file is an Opus file with an AAC twin under audio/');
  check(AUDIO.every((r) => typeof r.credit === 'string' && r.credit.length > 0), 'every row carries its credit to the Sources panel');
  const stingIds = AUDIO.filter((r) => r.kind === 'sting').map((r) => r.id.replace(/^sting-/, ''));
  check(stingIds.every((id) => ['arrive', 'stage', 'end'].includes(id)), `every sting is one main.js plays (${stingIds.join(', ') || 'none yet'})`);
}

if (failures) {
  console.log(`\n${failures} of ${checks} audio checks failed`);
  process.exit(1);
}
console.log(`\naudio ok: ${checks} checks -- nothing before a gesture, one context, 2 s cross-fades, a 0.4 duck, a quiet failure`);
