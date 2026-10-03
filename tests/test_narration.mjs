#!/usr/bin/env node
// Spec 0069 (2026-10-03): the trips' narration, with a stub AudioContext, no browser and no TTS.
//
// Four promises, in the order a visitor would notice them broken:
//   1. NOTHING BEFORE A CHOICE. The voice is not in the boot graph, and with sound off, or sound on
//      and the voice off (internal #309: music only), not one clip is fetched.
//   2. THE FILES ARE THE CARDS. Every stop of every trip has a clip, its AAC twin and captions; the
//      captions are the card's own title and sentences (scripts/narrate.py --check holds the hash
//      of what was actually synthesised; this holds the words a visitor can compare by eye); a
//      trip and the whole set are inside registry/budgets.yaml.
//   3. THE MIX AND THE WAIT. The bed goes 10 dB down under a clip and comes back when it ends; the
//      stop is held for the clip plus a second; pause, resume, replay and leave do what they say.
//   4. A FAILURE IS QUIET. A clip that 404s is a stop without a voice. Storage that throws is a
//      choice that is not remembered, not an exception.
//
// Run: node tests/test_narration.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

import { createAudio } from '../site/js/audio/engine.js';
import { createBeds } from '../site/js/audio/beds.js';
import { createLoader } from '../site/js/audio/load.js';
import { createStings, DUCK } from '../site/js/audio/stings.js';
import {
  createNarration, readVoice, writeVoice, VOICE_KEY, DUCK_DB, VOICE_DUCK, DUCK_IN_S, DUCK_BACK_S,
  TAIL_MS, KEEP, clipKey, clipRow, holdFor, parseVtt, cueAt,
} from '../site/js/audio/narration.js';
import { cueRange } from '../site/js/ui/voicecue.js';
import { NARRATION } from '../site/js/data/narration.js';
import { TOURS } from '../site/js/data/tours.js';
import { AUDIO } from '../site/js/data/audio.js';
import { BUDGETS } from '../site/js/data/budgets.js';
import { COPY } from '../site/js/copy/en.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');

let failures = 0;
let checks = 0;
function check(ok, msg) {
  checks += 1;
  if (!ok) { failures += 1; console.log(`  **  ${msg}`); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const tick = () => new Promise((r) => setTimeout(r, 0));

// --- the stubs (tests/test_audio.mjs's, with a clip's own length and an `ended` to fire) ---------

class Param {
  constructor(v) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); }
}
class StubContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 10;
    this.destination = { name: 'destination' };
    this.sources = [];
  }
  createGain() {
    return { gain: new Param(1), to: null, connect(n) { this.to = n; }, disconnect() { this.to = null; } };
  }
  createBufferSource() {
    const s = { buffer: null, to: null, started: null, offset: null, stopped: false, onended: null,
      connect(n) { this.to = n; }, start(t, o) { this.started = t; this.offset = o; }, stop() { this.stopped = true; } };
    this.sources.push(s);
    return s;
  }
  decodeAudioData(bytes) { return Promise.resolve({ duration: 12, from: bytes.from }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}
const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
function fakeDocument() {
  return { hidden: false, addEventListener() {}, removeEventListener() {} };
}
function fetchLog(fail = () => false) {
  const log = [];
  const f = async (url) => {
    log.push(url);
    if (fail(url)) return { ok: false, status: 404 };
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => ({ from: url }),
      text: async () => 'WEBVTT\n\n00:00.150 --> 00:02.000\nTitle.\n\n00:02.700 --> 00:06.000\nFirst sentence.\n\n00:06.450 --> 00:11.700\nSecond sentence.\n',
    };
  };
  return { f, log };
}

const FIX = { base: 'audio/narration', clips: { 't/a': 12, 't/b': 9.5, 't/c': 20, 't/d': 8, 't/e': 8 } };

function rig({ sound = true, voice = undefined, fail, lean = false } = {}) {
  const storage = memoryStorage(voice === undefined ? {} : { [VOICE_KEY]: JSON.stringify({ on: voice }) });
  const engine = createAudio({ storage, document: fakeDocument(), AudioContext: StubContext, setTimeout: () => {} });
  if (sound) engine.enable();
  const net = fetchLog(fail);
  const warns = [];
  const loader = createLoader(engine, { fetch: net.f, canPlay: () => 'probably', warn: (...a) => warns.push(a) });
  const beds = createBeds(engine, AUDIO, { loader, setTimeout: () => {} });
  const holds = [];
  const narration = createNarration(engine, beds, FIX, {
    storage, loader, fetch: net.f, lean: () => lean, hold: (ms) => holds.push(ms),
  });
  return { engine, beds, narration, net, warns, holds, storage };
}
const at = (phase, index, generation = 1, stopId = 'abcde'[index]) => ({ phase, index, generation, tourId: 't', stopId });

// ---------------------------------------------------------------------- 1. nothing before a choice
{
  const index = readFileSync(join(SITE, 'index.html'), 'utf8');
  check(!/modulepreload[^>]*narration/.test(index), 'the boot graph (index.html modulepreload) has no narration module');
  const main = readFileSync(join(SITE, 'js/main.js'), 'utf8');
  check(!/from '\.\/(audio|data)\/narration\.js'/.test(main), 'main.js does not import the narration statically');
  const frame = readFileSync(join(SITE, 'js/ui/tripframe.js'), 'utf8');
  check(/from '\.\.\/audio\/narration\.js'/.test(frame) && /import\('\.\/ui\/tripframe\.js'\)/.test(main),
    'the voice comes with ui/tripframe.js, which main.js imports when the first trip starts');

  const r = rig({ sound: false });
  r.narration.follow(at('settle', 0));
  r.narration.follow(at('dwell', 0));
  await r.narration.preload('t/b');
  await tick();
  check(r.net.log.length === 0, `sound off: nothing is fetched (${r.net.log.join(', ')})`);
  check(r.engine.context === null, 'sound off: the voice makes no AudioContext');
  check(r.narration.willSpeak('t/a') === false, 'sound off: no stop will be read');

  const m = rig({ sound: true, voice: false });
  m.narration.follow(at('settle', 0));
  await tick();
  check(m.net.log.every((u) => !u.includes('narration')), `music only (voice off): no clip is fetched (${m.net.log.join(', ')})`);
  check(m.holds.length === 0, 'music only: the stop keeps its own dwell');
}

// ---------------------------------------------------------------------- 2. the files are the cards
{
  const sentences = (text) => String(text).trim().split(/(?<=[.!?])\s+(?=[A-Z"'(\d])/).filter(Boolean);
  const perTrip = new Map();
  let total = 0;
  let seconds = 0;
  let stops = 0;
  const live = new Set();
  for (const tour of TOURS) {
    for (const stop of tour.stops) {
      stops += 1;
      const key = clipKey(tour.id, stop.id);
      live.add(key);
      const secs = NARRATION.clips[key];
      check(secs > 0, `${key}: the manifest has its clip`);
      const row = clipRow(NARRATION.base, key);
      const files = [row.file, row.twin, row.vtt].map((f) => join(SITE, f));
      const there = files.every((f) => existsSync(f));
      check(there, `${key}: the Opus clip, its AAC twin and its captions are in the tree`);
      if (!there) continue;
      const [opus, m4a, vtt] = files.map((f) => statSync(f).size);
      check(opus > 4000 && m4a > 4000, `${key}: neither encoding is an empty file (${opus} B, ${m4a} B)`);
      perTrip.set(tour.id, (perTrip.get(tour.id) || 0) + opus);
      total += opus + m4a + vtt;
      seconds += secs;
      // 32 kbps mono is 4 kB a second; a clip far off that is the wrong file or the wrong bitrate.
      check(opus / secs > 2500 && opus / secs < 5500, `${key}: ${Math.round(opus / secs)} B/s is 32 kbps Opus`);
      const cues = parseVtt(readFileSync(files[2], 'utf8'));
      const body = sentences(stop.card.body);
      const said = cues.map((c) => c.text);
      // A stop with its own script for the ear (registry/narration.yaml `say:`) is held by
      // narrate.py --check alone; every other stop's captions are its card, word for word.
      const scripted = (NARRATION.scripted || []).includes(key);
      const tail = said.slice(-body.length);
      check(scripted || JSON.stringify(tail) === JSON.stringify(body), `${key}: the captions end with the card's own sentences`);
      const lead = said.slice(0, said.length - body.length);
      check(scripted || (lead.length <= 1 && (lead.length === 0 || lead[0].replace(/[.!?]$/, '') === stop.card.title.replace(/[.!?]$/, ''))),
        `${key}: what is said before the body is the card's title and nothing else (${lead.join(' | ')})`);
      check(cues.every((c, i) => c.end > c.start && (i === 0 || c.start >= cues[i - 1].end)), `${key}: the cues are in order and do not overlap`);
      check(cues.length > 0 && cues[cues.length - 1].end <= secs + 0.01, `${key}: the last cue ends inside the clip`);
      // Every sentence the voice lights is findable in the paragraph the card draws.
      check(body.every((s) => cueRange(stop.card.body, s) !== null), `${key}: each body cue is found in the card's paragraph`);
      // The stop is held for its clip: never shorter than the words take to say.
      check(holdFor(secs) >= secs * 1000 + TAIL_MS - 1, `${key}: held for the clip and ${TAIL_MS} ms`);
    }
  }
  check((NARRATION.scripted || []).length <= 3, `the cards are read as written, bar a few (${(NARRATION.scripted || []).join(', ')})`);
  check(stops === Object.keys(NARRATION.clips).length, `a clip per stop and no orphans (${stops} stops, ${Object.keys(NARRATION.clips).length} clips)`);
  for (const key of Object.keys(NARRATION.clips)) check(live.has(key), `${key}: a clip for a stop the trips still have`);
  const dir = join(SITE, NARRATION.base);
  if (existsSync(dir)) {
    for (const trip of readdirSync(dir)) {
      for (const f of readdirSync(join(dir, trip))) {
        check(live.has(`${trip}/${f.replace(/\.(opus|m4a|vtt)$/, '')}`), `${trip}/${f}: a file for a stop the trips still have`);
      }
    }
  }
  for (const [trip, bytes] of perTrip) {
    check(bytes / 1000 <= BUDGETS.narration_trip_kb, `${trip}: ${Math.round(bytes / 1000)} kB of Opus is inside narration_trip_kb (${BUDGETS.narration_trip_kb})`);
  }
  check(total / 1000 <= BUDGETS.narration_total_kb, `narration is ${Math.round(total / 1000)} kB in all, inside narration_total_kb (${BUDGETS.narration_total_kb})`);
  console.log(`  ${stops} stops, ${(seconds / 60).toFixed(1)} min, ${Math.round(total / 1000)} kB (Opus + AAC + captions), largest trip ${Math.round(Math.max(...perTrip.values()) / 1000)} kB of Opus`);

  // The credit, word for word in the three places it is printed.
  const yaml = readFileSync(join(ROOT, 'registry/narration.yaml'), 'utf8');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(NARRATION.credit === COPY.audio.narrationCredit, 'the Sources panel prints the registry\'s credit line');
  check(yaml.includes(`credit: "${NARRATION.credit}"`) && credits.includes(NARRATION.credit), 'CREDITS.md carries the same line');
  check(/synthetic/i.test(NARRATION.credit) && /synthetic/i.test(COPY.trip.voiceOnTitle) && /synthetic/i.test(COPY.trip.voiceOffTitle),
    'the credit and the Voice control both say the voice is synthetic');
  check(/Apache-2\.0/.test(NARRATION.credit), 'the credit names the licence');
}

// ---------------------------------------------------------------------- 3. the mix and the wait
check(DUCK_DB === -10 && near(VOICE_DUCK, 0.31622776, 1e-6), `the bed ducks ${DUCK_DB} dB: a gain of ${VOICE_DUCK.toFixed(3)}`);
check(holdFor(12) === 12000 + TAIL_MS && holdFor(12, 5) === 7000 + TAIL_MS, 'a stop is held for what is left of the clip, and a second');
check(holdFor(0) === 0 && holdFor(12, 12) === 0 && holdFor(undefined) === 0, 'no clip, or a finished one, holds nothing');
{
  const cues = parseVtt('WEBVTT\n\n00:00.150 --> 00:02.000\nTitle.\n\n01:02.700 --> 01:06.000\nLater.\n');
  check(cues.length === 2 && near(cues[0].start, 0.15) && near(cues[1].start, 62.7) && cues[1].text === 'Later.', 'WebVTT is read into seconds and text');
  check(cueAt(cues, 0.1) === '' && cueAt(cues, 1) === 'Title.' && cueAt(cues, 30) === 'Title.' && cueAt(cues, 63) === 'Later.',
    'the lit sentence is the one being said, held through the pause after it');
  check(cueRange('One. Two is here. Three.', 'Two is here.').join() === '5,17' && cueRange('One.', 'Title.') === null, 'a cue is found in the paragraph, and a title is not');
}
{
  const r = rig();
  const c = r.engine.context;
  await r.beds.enter('earth');
  const under = r.beds.under;
  check(under && r.beds.bus.to === under && under.to === r.engine.master, 'bed -> bus (the sting\'s duck) -> under (the voice\'s) -> master');

  r.narration.follow(at('flight', 0), 't/b');
  check(r.net.log.every((u) => !u.includes('narration')), 'nothing is asked for while the camera is still flying');
  r.narration.follow(at('settle', 0), 't/b');
  check(r.holds[0] === 13000, `asked to hold the stop at once, from the manifest: ${r.holds[0]} ms`);
  await tick(); await tick();
  r.narration.follow(at('dwell', 0), 't/b');
  await tick();
  const voiceFetches = r.net.log.filter((u) => u.includes('narration/t/a'));
  check(voiceFetches.includes('audio/narration/t/a.opus') && voiceFetches.includes('audio/narration/t/a.vtt'), `the stop's clip and captions are fetched after it arrives (${voiceFetches.join(', ')})`);
  check(voiceFetches.filter((u) => u.endsWith('.opus')).length === 1, 'settle then dwell is one arrival: the clip is fetched and started once');
  const src = c.sources.filter((s) => s.buffer && s.buffer.from && s.buffer.from.includes('narration'))[0];
  check(src && src.started === c.currentTime && src.offset === 0, 'the clip starts from its first word');
  check(src && src.to && src.to.to === r.engine.master, 'the voice goes to the master, not through the bed\'s duck');
  const ramp = under.gain.calls.filter((x) => x[0] === 'ramp').pop();
  check(ramp && near(ramp[1], VOICE_DUCK) && near(ramp[2], c.currentTime + DUCK_IN_S), `the bed ducks to ${VOICE_DUCK.toFixed(3)} in ${DUCK_IN_S} s`);
  check(r.holds[r.holds.length - 1] === 12000 + TAIL_MS, `held again from the decoded length once it starts (${r.holds.join(', ')})`);
  check(r.net.log.includes('audio/narration/t/b.opus'), 'the next stop\'s clip is fetched while this one is read');
  check(r.narration.state.playing && r.narration.state.key === 't/a', 'the state says what is being read');

  // A sting at the same moment ducks the bus, not `under`: neither cancels the other.
  const stings = createStings(r.engine, r.beds, AUDIO, { loader: createLoader(r.engine, { fetch: fetchLog().f, canPlay: () => 'probably', warn() {} }) });
  await stings.play('arrive');
  check(r.beds.bus.gain.calls.some((x) => x[0] === 'ramp' && x[1] === DUCK) && near(under.gain.value, VOICE_DUCK), 'a sting ducks the bus and leaves the voice\'s duck alone');

  // Captions: the sentence at the playhead.
  c.currentTime += 3;
  check(r.narration.cue() === 'First sentence.', `3 s in, the second cue is lit (${r.narration.cue()})`);

  // Pause keeps the place; resume carries on from it and holds what is left.
  r.narration.follow(at('paused', 0));
  check(src.stopped && !r.narration.state.playing && near(r.narration.state.at, 3), 'pause stops the voice and keeps its place');
  check(near(under.gain.value, 1), 'paused, the music comes back up');
  c.currentTime += 30;
  r.narration.follow(at('dwell', 0), 't/b');
  const again = c.sources[c.sources.length - 1];
  check(again !== src && near(again.offset, 3) && r.narration.state.playing, 'resume carries on from the same word');
  check(r.holds[r.holds.length - 1] === 9000 + TAIL_MS, `and holds the stop for what is left (${r.holds[r.holds.length - 1]})`);
  check(near(under.gain.value, VOICE_DUCK), 'and the bed ducks again');

  // A repaint of the same stop is not a second reading.
  const n = c.sources.length;
  r.narration.follow(at('dwell', 0), 't/b');
  check(c.sources.length === n, 'a repeated state does not start the clip again');

  // The clip runs out: the music comes back, over DUCK_BACK_S.
  again.onended();
  const back = under.gain.calls.filter((x) => x[0] === 'ramp').pop();
  check(near(back[1], 1) && near(back[2], c.currentTime + DUCK_BACK_S) && !r.narration.state.playing, `the bed comes back over ${DUCK_BACK_S} s when the clip ends`);

  // Next: the flight stops whatever is being said; the next stop reads its own clip.
  r.narration.follow(at('settle', 1, 2), 't/c');
  await tick(); await tick();
  const second = c.sources[c.sources.length - 1];
  check(second.buffer.from.includes('t/b') && r.narration.state.key === 't/b', 'the next stop reads its own clip');
  r.narration.follow(at('flight', 2, 3));
  check(second.stopped && !r.narration.state.playing && near(under.gain.value, 1), 'leaving a stop stops its voice and brings the music back');

  // Replay: the same stop, a new generation, read again from the top.
  r.narration.follow(at('settle', 1, 4), 't/c');
  await tick(); await tick();
  const replayed = c.sources[c.sources.length - 1];
  check(replayed !== second && replayed.offset === 0 && replayed.buffer.from.includes('t/b'), 'Replay reads the stop again from its first word');

  // Leave.
  r.narration.follow({ phase: 'idle', index: -1, generation: 5, tourId: null, stopId: null });
  check(replayed.stopped && r.narration.state.key === null, 'leaving the trip stops the voice');

  // Voice off mid-stop: the clip stops, the music stays, and the choice is remembered.
  r.narration.follow(at('settle', 2, 6));
  await tick(); await tick();
  const third = c.sources[c.sources.length - 1];
  r.narration.setOn(false);
  r.narration.refresh(at('dwell', 2, 6));
  check(third.stopped && !r.narration.state.playing && r.engine.isOn(), 'Voice off stops the voice and leaves sound on');
  check(readVoice(r.storage) === false, 'and is remembered');
  // ... and back on at the same stop reads it from the top.
  const before = c.sources.length;
  r.narration.setOn(true);
  r.narration.refresh(at('dwell', 2, 6));
  await tick(); await tick();
  check(c.sources.length === before + 1 && c.sources[before].offset === 0, 'Voice back on reads the stop that is up');
  // The engine says "on" again at every gesture until its context runs: that is not a restart.
  r.narration.refresh(at('dwell', 2, 6));
  await tick();
  check(c.sources.length === before + 1, 'a refresh that changes nothing leaves the clip playing');

  // Only KEEP decoded clips are held.
  for (const [i, id] of ['d', 'e'].entries()) {
    r.narration.follow(at('settle', 3 + i, 10 + i, id));
    await tick(); await tick();
  }
  check(r.narration.state.kept.length === KEEP, `${KEEP} decoded clips are kept (${r.narration.state.kept.join(', ')})`);
  const fetchesOfA = () => r.net.log.filter((u) => u === 'audio/narration/t/a.opus').length;
  const had = fetchesOfA();
  r.narration.follow(at('settle', 0, 20, 'a'));
  await tick(); await tick();
  check(fetchesOfA() === had + 1, 'a clip that was let go is fetched again when its stop comes back');
}
{
  // Paused before the clip has landed: it is kept at its first word, not played into the pause.
  const r = rig();
  r.narration.follow(at('settle', 0));
  r.narration.follow(at('paused', 0));
  await tick(); await tick();
  check(!r.narration.state.playing && r.engine.context.sources.length === 0, 'a clip that lands during a pause waits');
  r.narration.follow(at('dwell', 0));
  check(r.narration.state.playing && r.engine.context.sources[0].offset === 0, 'and starts on resume');
}
{
  // A lean connection (save-data, or the low tier): nothing ahead of its stop.
  const r = rig({ lean: true });
  check((await r.narration.preload('t/a')) === false && r.net.log.length === 0, 'lean: preload fetches nothing');
  r.narration.follow(at('settle', 0), 't/b');
  await tick(); await tick(); await tick();
  check(r.net.log.includes('audio/narration/t/a.opus') && !r.net.log.includes('audio/narration/t/b.opus'), 'lean: the clip is fetched when its stop arrives, and the next one is not');
}
{
  // The intro's promise: how much longer a trip that is read aloud runs.
  const r = rig();
  const stops = [{ id: 'a', dwellMs: 10000 }, { id: 'b', dwellMs: 20000 }, { id: 'zz', dwellMs: 9000 }];
  check(r.narration.extraMs('t', stops) === 3000, `a read trip is longer by the clips that outlast their cards (${r.narration.extraMs('t', stops)} ms)`);
  r.narration.setOn(false);
  check(r.narration.extraMs('t', stops) === 0, 'and no longer when the voice is off');
}

// ---------------------------------------------------------------------- 4. a failure is quiet
{
  const r = rig({ fail: (u) => u.includes('narration') });
  let threw = false;
  try {
    r.narration.follow(at('settle', 0));
    await tick(); await tick(); await tick();
    r.narration.follow(at('dwell', 0));
  } catch { threw = true; }
  check(!threw && !r.narration.state.playing, 'a clip that 404s is a stop without a voice, and nothing throws');
  check(r.net.log.includes('audio/narration/t/a.opus') && r.net.log.includes('audio/narration/t/a.m4a'), 'the AAC twin is tried before giving up');
  check(r.warns.length === 1, `the console says so once (${r.warns.length})`);
  check(r.narration.cue() === '', 'and no sentence is lit');
  const under = r.beds.under;
  check(!under || near(under.gain.value, 1), 'the music is not ducked for a voice that never came');
}
{
  check(readVoice(memoryStorage()) === true, 'the voice is on until it is turned off');
  check(readVoice(memoryStorage({ [VOICE_KEY]: '{"on":false}' })) === false, 'off is remembered');
  check(readVoice(memoryStorage({ [VOICE_KEY]: 'not json' })) === true, 'a damaged value reads as the default');
  check(readVoice(throwing) === true && writeVoice(throwing, false) === false, 'storage that throws: the default is read, and the write reports false');
  const engine = createAudio({ storage: throwing, document: fakeDocument(), AudioContext: StubContext, setTimeout: () => {} });
  engine.enable();
  let threw = false;
  let n = null;
  try {
    n = createNarration(engine, null, FIX, { storage: throwing, fetch: fetchLog().f, canPlay: () => 'probably', warn() {} });
    n.toggle();
    n.toggle();
  } catch { threw = true; }
  check(!threw && n && n.isOn() === true, 'a browser that refuses storage still toggles, for this page');
  const s = memoryStorage();
  const heard = [];
  const m = createNarration(engine, null, FIX, { storage: s, fetch: fetchLog().f, canPlay: () => 'probably', warn() {} });
  m.onChange((on) => heard.push(on));
  m.toggle();
  check(s.m.get(VOICE_KEY) === '{"on":false}' && heard.join() === 'false', 'the toggle writes sr.voice and tells its listeners');
  check(createNarration(engine, null, FIX, { storage: s }).isOn() === false, 'and the next page reads it');
}

console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `test_narration: ${checks} checks passed`);
process.exit(failures ? 1 : 0);
