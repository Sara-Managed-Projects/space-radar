// audio/stings.js -- the three short cues, with the bed ducked under them (spec 0035 req 5).
//
// Contract export: createStings(engine, beds, AUDIO, opts) -> { play(id) }
//                  DUCK, DUCK_IN_S, DUCK_BACK_S, STING_LEVEL
//
// `arrive` when the camera lands on a stop (the trip's settle), `stage` in the black of a stage
// change (ui/veil.js `sr:veil` covered, spec 0034), `end` on the end card. main.js wires all three
// from events the trip already emits, so ui/trip.js has no idea sound exists and runs in node
// without it. Each is one small file, fetched the first time it is played and never before.
//
// THE BED DUCKS TO 40 % FOR THE STING'S LENGTH AND COMES BACK OVER A SECOND. A cue on top of a
// full bed is two things at once; ducking is what a film mixer does so the cue is the one thing.

import { createLoader } from './load.js';

export const DUCK = 0.4;
export const DUCK_IN_S = 0.1;
export const DUCK_BACK_S = 1;
// Stings are levelled with the beds; this keeps a chime from standing out over music it is meant
// to sit inside.
export const STING_LEVEL = 0.7;

export function createStings(engine, beds, AUDIO, opts = {}) {
  const rows = (Array.isArray(AUDIO) ? AUDIO : []).filter((r) => r && r.kind === 'sting');
  // A sting row is found by its id with or without the `sting-` prefix, so the wiring can say
  // play('arrive') and the registry can say `id: sting-arrive`.
  const byId = new Map();
  for (const r of rows) {
    byId.set(r.id, r);
    byId.set(String(r.id).replace(/^sting-/, ''), r);
  }
  const loader = opts.loader || createLoader(engine, opts);

  function duck(seconds) {
    const bus = beds && beds.bus;
    if (!bus) return;
    const t = engine.context.currentTime;
    const g = bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(DUCK, t + DUCK_IN_S);
    g.setValueAtTime(DUCK, t + DUCK_IN_S + Math.max(0, seconds));
    g.linearRampToValueAtTime(1, t + DUCK_IN_S + Math.max(0, seconds) + DUCK_BACK_S);
  }

  /** Play a cue. Resolves true when it started, false when there was nothing to play. */
  async function play(id) {
    const row = byId.get(id);
    if (!row || !engine.live()) return false;
    const buffer = await loader.load(row);
    if (!buffer || !engine.live()) return false;
    const c = engine.context;
    const seconds = Number(row.seconds) || buffer.duration || 0;
    duck(seconds);
    const gain = c.createGain();
    gain.gain.value = STING_LEVEL;
    gain.connect(engine.master);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.onended = () => { try { gain.disconnect(); } catch { /* already gone */ } };
    src.start(c.currentTime);
    return true;
  }

  return { play };
}
