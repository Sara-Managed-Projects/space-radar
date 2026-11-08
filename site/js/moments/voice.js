// moments/voice.js -- a Moment's narration: the trips' voice, kept in step with the story's clock (forge #153, release 2.0.0).
//
// Contract:
//   voiceAt(entries, p, table)          -> {entry, offset} | null: the clip that is being said at play second `p`, and how far in
//   createMomentVoice(audio, opts)      -> { sync(entries, p, table, playing), stop() }
//
// WHAT A VOICE ENTRY IS. A row of the moment's `tracks.audio` with `voice: true`: `{t, src, twin, s, voice: true}`, a clip
// scripts/narrate-moments.py rendered (the trips' pipeline) that starts at mission second `t` and lasts `s` seconds of play.
// The player's own cue() plays the other rows (a beep, a radio call) once as the playhead crosses them; a voice is longer
// than a beep and is a sentence someone may want to hear from the middle, so it is kept in step instead:
//   * playing inside a clip's play window, the clip sounds at the offset the clock says (Play pressed in the middle picks it up);
//   * paused, scrubbed out of it, closed, or the clock run away from the sound by more than DRIFT_S: it stops, or starts again
//     at the right place;
//   * ONLY IN ENGLISH. The clips are English (registry/narration.yaml has one voice); in another language the captions are
//     that language's and no voice is played rather than an English one over them (copy/lang.js LANG);
//   * ONLY WITH SOUND ON AND THE VOICE ON: the app's sound toggle (audio.isOn) and the trips' own Voice choice (sr.voice,
//     audio/narration.js readVoice), so a visitor who turned the trips' voice off is not read to here either.
// Nothing is fetched before then: a clip is asked for the first time it should sound (audio/load.js, Opus or the AAC twin).

import { LANG } from '../copy/lang.js';
import { readVoice } from '../audio/narration.js';
import { playOf } from './format.js';

/** How far the sound may be from the clock before it is started again at the right place, in seconds. */
export const DRIFT_S = 0.6;

/** The voice entry being said at play second `p`, and the offset into it; null between clips. Pure. */
export function voiceAt(entries, p, table) {
  let best = null;
  for (const e of entries || []) {
    if (!e || !e.voice || !(e.s > 0)) continue;
    const p0 = playOf(table, e.t);
    if (p >= p0 && p < p0 + e.s && (!best || p0 >= best.p0)) best = { entry: e, offset: p - p0, p0 };
  }
  return best ? { entry: best.entry, offset: best.offset } : null;
}

export function createMomentVoice(audio, { lang = LANG, voiceOn = () => readVoice() } = {}) {
  let loader = null;
  let current = null;      // { entry, src, startedAt (audio clock), offset }
  let wanted = null;       // the entry being loaded, so a late buffer for a stale entry is dropped
  const can = () => lang === 'en' && audio && typeof audio.isOn === 'function' && audio.isOn() && audio.context && audio.master && voiceOn();

  function stop() {
    wanted = null;
    if (!current) return;
    try { current.src.stop(); } catch { /* already ended */ }
    try { current.src.disconnect(); } catch { /* gone */ }
    current = null;
  }

  function start(entry, offset) {
    stop();
    wanted = entry;
    const go = (l) => l.load({ id: entry.src, file: entry.src, twin: entry.twin }).then((buf) => {
      if (!buf || wanted !== entry || !can()) return;
      const src = audio.context.createBufferSource();
      const gain = audio.context.createGain();
      gain.gain.value = Number.isFinite(entry.gain) ? entry.gain : 1;
      src.buffer = buf;
      src.connect(gain).connect(audio.master);
      // If the clock moved on while the clip loaded, the next sync() sees the drift and starts it again where the clock is.
      src.start(0, Math.max(0, Math.min(buf.duration - 0.05, offset)));
      current = { entry, src, startedAt: audio.context.currentTime, offset };
      src.onended = () => { if (current && current.src === src) current = null; };
    }).catch(() => {});
    if (loader) { go(loader); return; }
    import('../audio/load.js').then((mod) => { loader = loader || mod.createLoader(audio); go(loader); }).catch(() => {});
  }

  /** Called every frame by the player: make the sound match the clock. */
  function sync(entries, p, table, playing) {
    if (!playing || !table || !can()) { stop(); return; }
    const want = voiceAt(entries, p, table);
    if (!want) { stop(); return; }
    if (wanted === want.entry && !current) return;          // still loading it
    if (current && current.entry === want.entry) {
      const heard = current.offset + (audio.context.currentTime - current.startedAt);
      if (Math.abs(heard - want.offset) <= DRIFT_S) return;
    }
    start(want.entry, want.offset);
  }

  return { sync, stop };
}
