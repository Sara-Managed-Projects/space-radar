// audio/beds.js -- one ambient bed per rung of the map, cross-faded (spec 0035 req 4).
//
// Contract export: createBeds(engine, AUDIO, opts) -> { enter(rung), stop(), bus, current, state }
//                  XFADE_S
//
// A PLANETARIUM IS SCORED, NOT SOUND-EFFECTED. Four beds, keyed by where the camera is: the Earth
// and the Moon (`earth`), any other world (`world`), the Sun's own stage (`sun`), a rung of the
// ladder (`ladder`). main.js hears `sr:stage` and calls enter(rungOf(worldId)); the bed that was
// playing fades out over two seconds while the next fades in, so a stage change is a change of
// room, not a change of track.
//
// FETCHED THE FIRST TIME ITS RUNG IS ENTERED WITH SOUND ON, NEVER BEFORE. A visitor who stays on
// Earth downloads one bed; one who never turns sound on downloads none (spec 0035 req 1).
//
// TWO GAINS PER BED, ON PURPOSE: the bed's own (the cross-fade) feeds a shared `bus` (the duck a
// sting asks for, stings.js), which feeds the engine's master. One gain doing both jobs meant a
// sting landing in the middle of a cross-fade cancelled the fade (cancelScheduledValues is per
// parameter), and the old bed was left playing at 40 % under the new one.

import { createLoader } from './load.js';

export const XFADE_S = 2;

export function createBeds(engine, AUDIO, opts = {}) {
  const rows = (Array.isArray(AUDIO) ? AUDIO : []).filter((r) => r && r.kind === 'bed' && r.stage);
  const byStage = new Map(rows.map((r) => [r.stage, r]));
  const loader = opts.loader || createLoader(engine, opts);
  const later = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms));

  let current = null; // { row, source, gain }
  let want = null;
  let token = 0;
  let loading = null;
  let bus = null;

  function ensureBus() {
    const c = engine.context;
    if (!bus && c && engine.master) {
      bus = c.createGain();
      bus.gain.value = 1;
      bus.connect(engine.master);
    }
    return bus;
  }

  function fadeOut(t) {
    if (!current) return;
    const old = current;
    current = null;
    const g = old.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + XFADE_S);
    later(() => {
      try { old.source.stop(); } catch { /* already stopped */ }
      try { old.gain.disconnect(); } catch { /* already gone */ }
    }, XFADE_S * 1000 + 100);
  }

  function play(row, buffer) {
    const c = engine.context;
    const t = c.currentTime;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + XFADE_S);
    gain.connect(ensureBus());
    const source = c.createBufferSource();
    source.buffer = buffer;
    // The files are cut to loop (registry/audio.yaml `loop:`): the tail cross-faded into the head
    // before encoding, so the seam is inside the music and not a click at the buffer's edge.
    source.loop = row.loop !== false;
    source.connect(gain);
    source.start(t);
    fadeOut(t);
    current = { row, source, gain };
    return current;
  }

  /** Enter a rung. Resolves to the bed now playing (or null). Safe to call as often as you like. */
  async function enter(rung) {
    want = rung || null;
    if (!engine.live()) return current;
    const row = byStage.get(want) || null;
    if (current && row && current.row.id === row.id) return current;
    const mine = ++token;
    if (!row) {
      // A rung with no bed of its own is quiet, not the last rung's music carried on somewhere
      // it does not belong.
      fadeOut(engine.context.currentTime);
      return null;
    }
    loading = row.id;
    const buffer = await loader.load(row);
    if (mine !== token) return current;   // the visitor moved on while this was loading
    loading = null;
    if (!engine.live()) return current;
    if (!buffer) {
      fadeOut(engine.context.currentTime);
      return null;
    }
    return play(row, buffer);
  }

  function stop() {
    token += 1;
    loading = null;
    if (engine.context) fadeOut(engine.context.currentTime);
  }

  return {
    enter,
    stop,
    get bus() { return ensureBus(); },
    get current() { return current; },
    get state() { return { bed: current, rung: want, loading }; },
    rows: () => rows.slice(),
  };
}
