// audio/narration.js -- the voice that reads a trip's stops, and the music ducked under it (spec 0069).
//
// Contract export: createNarration(engine, beds, NARRATION, opts) ->
//                    { isOn(), setOn(on), toggle(), onChange(fn), has(key), secondsOf(key),
//                      willSpeak(key), preload(key), play(key), pause(), resume(), stop(),
//                      follow(st, nextKey), refresh(st, nextKey), cue(), extraMs(tourId, stops), state }
//                  VOICE_KEY, readVoice(storage), writeVoice(storage, on)
//                  DUCK_DB, VOICE_DUCK, DUCK_IN_S, DUCK_BACK_S, TAIL_MS, KEEP
//                  clipKey(tourId, stopId), clipRow(base, key), holdFor(seconds, at),
//                  parseVtt(text), cueAt(cues, t)
//
// Ivan, 2026-10-02: "Speech for trips (like in planetarium ...)". The files are made offline by
// scripts/narrate.py -- a synthetic voice, and the app says so -- and this plays them:
//
//   * AFTER THE CAMERA ARRIVES. follow() hears the trip's own phases (ui/tripframe.js hands it
//     every state change): a stop's clip starts when its flight lands, pauses with the trip,
//     starts again on Replay, and stops the moment the camera leaves. ui/trip.js still has no idea
//     sound exists; the one thing it is asked is to hold the stop until the voice has finished
//     (`opts.hold`, its holdDwell), by TAIL_MS more than the clip.
//   * THE MUSIC DUCKS 10 dB UNDER THE VOICE and comes back after: a third gain in beds.js
//     (`under`), so a sting's own duck of the bus and this one never cancel each other.
//   * VOICE IS ITS OWN CHOICE, INSIDE SOUND (internal #309: a music-and-captions-only mode). Sound
//     off is everything off. Sound on plays the music, and the voice too unless it was turned off;
//     `sr.voice` remembers that, and a browser that refuses storage just forgets.
//   * NOTHING BEFORE A GESTURE, AND NOTHING THAT CAN STOP A TRIP. A clip is asked for only once
//     engine.live() (spec 0035 req 1: tests/test_first_visit_bytes.mjs holds /audio/ at zero for a
//     first visit). A clip that is missing or will not decode is a stop without a voice: the
//     card is the words, the dwell is the card's own, and the console says so once.
//   * ON A CONNECTION THAT SAVES DATA, OR THE LOW TIER, the next stop's clip is not fetched ahead
//     (`opts.lean`): each is asked for when its stop arrives, and a trip left early costs nothing.

import { createLoader } from './load.js';

export const VOICE_KEY = 'sr.voice';
export const DUCK_DB = -10;
/** The bed's gain under the voice: 10 dB down, 0.316. */
export const VOICE_DUCK = 10 ** (DUCK_DB / 20);
export const DUCK_IN_S = 0.3;
export const DUCK_BACK_S = 1.2;
// The breath a stop is held for after its last word, before the camera moves on.
export const TAIL_MS = 1000;
// Decoded clips kept: the one playing, the next one, and the one just left (Back is one press).
// A decoded clip is about 3 MB of samples; a ten-stop trip kept whole would be thirty.
export const KEEP = 3;
const FADE_S = 0.15;

/** The stored choice. Unset means ON: the voice is what turning sound on in a trip is for. */
export function readVoice(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return true;
    const raw = s.getItem(VOICE_KEY);
    if (!raw) return true;
    const v = JSON.parse(raw);
    return !(v && v.on === false);
  } catch {
    return true;
  }
}

export function writeVoice(storage, on) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (s) s.setItem(VOICE_KEY, JSON.stringify({ on: !!on }));
    return true;
  } catch {
    // A private window forgets; the choice still holds for this page.
    return false;
  }
}

export function clipKey(tourId, stopId) {
  return tourId && stopId ? `${tourId}/${stopId}` : '';
}

/** A clip as audio/load.js wants it: an id for its cache, the Opus file and its AAC twin. */
export function clipRow(base, key) {
  return { id: `voice:${key}`, file: `${base}/${key}.opus`, twin: `${base}/${key}.m4a`, vtt: `${base}/${key}.vtt` };
}

/** How long a stop must still be held, in ms: what is left of the clip, and the breath after it. */
export function holdFor(seconds, at = 0) {
  const left = Math.max(0, (Number(seconds) || 0) - (Number(at) || 0));
  return left > 0 ? Math.round(left * 1000) + TAIL_MS : 0;
}

/** WebVTT as narrate.py writes it -> [{start, end, text}] in seconds. Anything else is skipped. */
export function parseVtt(text) {
  const out = [];
  const lines = String(text || '').split(/\r?\n/);
  const stamp = (m, s, ms) => Number(m) * 60 + Number(s) + Number(ms) / 1000;
  for (let i = 0; i < lines.length - 1; i += 1) {
    const m = /^(\d+):(\d+)\.(\d+) --> (\d+):(\d+)\.(\d+)/.exec(lines[i]);
    if (m && lines[i + 1]) out.push({ start: stamp(m[1], m[2], m[3]), end: stamp(m[4], m[5], m[6]), text: lines[i + 1] });
  }
  return out;
}

/** The sentence being said at `t` seconds, held through the pause after it; '' before the first. */
export function cueAt(cues, t) {
  let text = '';
  for (const c of Array.isArray(cues) ? cues : []) {
    if (c.start <= t) text = c.text;
    else break;
  }
  return text;
}

export function createNarration(engine, beds, NARRATION, opts = {}) {
  const data = NARRATION || {};
  const clips = data.clips || {};
  const base = data.base || 'audio/narration';
  const storage = opts.storage;
  const loader = opts.loader || createLoader(engine, opts);
  const doFetch = opts.fetch || ((url) => fetch(url));
  const lean = typeof opts.lean === 'function' ? opts.lean : () => false;
  const hold = typeof opts.hold === 'function' ? opts.hold : () => {};

  let on = readVoice(storage);
  const listeners = new Set();
  const kept = [];             // keys with a decoded clip, oldest first
  const cueCache = new Map();  // key -> cues
  let now = null;              // { key, buffer, source, gain, startedAt, offset, playing }
  let token = 0;
  let saidAt = null;           // "generation:index" of the stop whose clip was last started
  let loading = false;         // a clip has been asked for and has not started yet
  let waiting = false;         // the trip is paused: a clip that lands now is kept, not played

  function emit() {
    for (const fn of [...listeners]) {
      try { fn(on); } catch { /* one listener's bug is not the voice's */ }
    }
  }

  // A context to play in, as well as the choice: what beds.js and stings.js ask before a fetch.
  const live = () => !!(engine && typeof engine.live === 'function' && engine.live());
  const has = (key) => Number(clips[key]) > 0;
  const secondsOf = (key) => Number(clips[key]) || 0;
  /** Whether this stop will be read aloud: sound on, voice on, and a clip to read. */
  const willSpeak = (key) => !!(engine && typeof engine.isOn === 'function' && engine.isOn() && on && has(key));

  function duck(to, seconds) {
    const under = beds && beds.under;
    if (!under || !engine.context) return;
    const t = engine.context.currentTime;
    const g = under.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + seconds);
  }

  function remember(key) {
    const i = kept.indexOf(key);
    if (i !== -1) kept.splice(i, 1);
    kept.push(key);
    while (kept.length > KEEP) {
      const old = kept.shift();
      if (typeof loader.forget === 'function') loader.forget(clipRow(base, old).id);
    }
  }

  function load(key) {
    if (!has(key) || !live()) return Promise.resolve(null);
    remember(key);
    if (!cueCache.has(key)) {
      cueCache.set(key, []);
      // The captions are a nicety: a failure here is a clip with no sentence lit, never a refusal.
      Promise.resolve()
        .then(() => doFetch(clipRow(base, key).vtt))
        .then((res) => (res && res.ok !== false ? res.text() : ''))
        .then((text) => cueCache.set(key, parseVtt(text)))
        .catch(() => {});
    }
    return loader.load(clipRow(base, key));
  }

  /** Fetch a clip ahead of its stop. Not on a lean connection, and never before sound is live. */
  function preload(key) {
    if (!willSpeak(key) || lean()) return Promise.resolve(false);
    return load(key).then((b) => !!b);
  }

  function position() {
    if (!now) return 0;
    if (!now.playing) return now.offset;
    return Math.min(now.buffer.duration, now.offset + (engine.context.currentTime - now.startedAt));
  }

  function startSource(offset) {
    const c = engine.context;
    const gain = c.createGain();
    gain.gain.value = 1;
    gain.connect(engine.master);
    const source = c.createBufferSource();
    source.buffer = now.buffer;
    source.connect(gain);
    const mine = now;
    source.onended = () => {
      try { gain.disconnect(); } catch { /* already gone */ }
      // Only a clip that ran out: one we stopped has already been replaced or put down.
      if (now === mine && mine.source === source && mine.playing) {
        now = null;
        duck(1, DUCK_BACK_S);
      }
    };
    source.start(c.currentTime, offset);
    Object.assign(now, { source, gain, startedAt: c.currentTime, offset, playing: true });
    duck(VOICE_DUCK, DUCK_IN_S);
  }

  function silence(fade) {
    if (!now || !now.source) return;
    const { source, gain } = now;
    const c = engine.context;
    now.playing = false;
    now.source = null;
    try {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + fade);
      source.stop(t + fade + 0.02);
    } catch {
      try { source.stop(); } catch { /* already stopped */ }
    }
  }

  /** Read a stop. Resolves true once the clip has started, false when there is nothing to say. */
  async function play(key) {
    stop();
    waiting = false;
    if (!willSpeak(key) || !live()) return false;
    const mine = ++token;
    // Asked for at once, from the manifest's length, so the stop is already held while the clip
    // loads; asked again below with what is really left once it starts.
    hold(holdFor(secondsOf(key)));
    loading = true;
    const buffer = await load(key);
    if (mine !== token) return false;
    loading = false;
    if (!buffer || !willSpeak(key) || !live()) return false;
    now = { key, buffer, source: null, gain: null, startedAt: 0, offset: 0, playing: false };
    // Paused while it loaded: kept at its first word, for resume().
    if (waiting) return true;
    startSource(0);
    hold(holdFor(buffer.duration));
    return true;
  }

  function pause() {
    waiting = true;
    if (!now || !now.playing) return;
    now.offset = position();
    silence(FADE_S);
    duck(1, DUCK_BACK_S);
  }

  function resume() {
    waiting = false;
    if (!now || now.playing || !live()) return;
    if (now.offset >= now.buffer.duration - 0.05) { now = null; return; }
    startSource(now.offset);
    hold(holdFor(now.buffer.duration, now.offset));
  }

  function stop() {
    token += 1;
    loading = false;
    if (!now) return;
    silence(FADE_S);
    now = null;
    duck(1, DUCK_BACK_S);
  }

  /**
   * Follow the trip. `st` is ui/trip.js's state; `nextKey` the clip of the stop after this one.
   * At a stop (settle, dwell) its clip plays once per arrival: `generation:index` changes on every
   * flight a visitor asks for, so Replay reads the stop again and a repaint does not.
   */
  function follow(st, nextKey) {
    const phase = st && st.phase;
    if (phase === 'settle' || phase === 'dwell') {
      const at = `${st.generation}:${st.index}`;
      if (saidAt !== at) {
        saidAt = at;
        play(clipKey(st.tourId, st.stopId)).then((started) => { if (started && nextKey) preload(nextKey); });
      } else {
        resume();
      }
      return;
    }
    if (phase === 'paused') {
      pause();
      return;
    }
    // A flight, the black of a stage change, a held stop, the intro, the end, or no trip at all.
    stop();
    if (phase !== 'flight' && phase !== 'veil') saidAt = null;
  }

  function setOn(next) {
    const want = !!next;
    if (want === on) return on;
    on = want;
    writeVoice(storage, on);
    if (!on) stop();
    emit();
    return on;
  }

  /**
   * The visitor changed what they want to hear (the Sound or the Voice control): off puts the clip
   * down, on reads the stop that is up from its first word. A change that changes nothing -- the
   * engine says "on" again at every gesture until its context runs -- leaves a clip that is
   * playing, or on its way, alone.
   */
  function refresh(st, nextKey) {
    if (!engine.isOn() || !on) stop();
    if (!now && !loading) saidAt = null;
    follow(st, nextKey);
  }

  return {
    isOn: () => on,
    setOn,
    toggle: () => setOn(!on),
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    has,
    secondsOf,
    willSpeak,
    preload,
    play,
    pause,
    resume,
    stop,
    follow,
    refresh,
    /** The sentence being said now, for the card to light; '' when nothing is. */
    cue() {
      if (!now) return '';
      return cueAt(cueCache.get(now.key), position());
    },
    /**
     * How much longer than the cards' own dwells a trip runs when it is read aloud, in ms, over
     * the stops that resolved: the intro's "4 stops · 2 min" is a promise (ui/tripframe.js).
     */
    extraMs(tourId, stops) {
      let extra = 0;
      for (const s of Array.isArray(stops) ? stops : []) {
        const key = clipKey(tourId, s && s.id);
        if (willSpeak(key)) extra += Math.max(0, holdFor(secondsOf(key)) - (Number(s.dwellMs) || 0));
      }
      return extra;
    },
    get state() {
      return { on, key: now ? now.key : null, playing: !!(now && now.playing), at: position(), kept: kept.slice() };
    },
  };
}
