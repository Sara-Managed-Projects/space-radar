// audio/score.js -- the ambient score while exploring, and the real recordings heard where they were made (forge #163).
//
// Contract export: installScore(audio, ctx, opts) -> { voice(), paint(), stop(), destroy() }   once per engine (audio.score)
//                  stageClass(stageId, isLadder) -> 'near' | 'planets' | 'sun' | 'stars' | 'galaxies' | 'edge'
//                  bedOf(cls) -> 'earth' | 'world' | 'sun' | 'ladder'      the registry bed a class plays
//                  voiceOf(cls) -> { rate, hz }                            how that bed is played there
//                  heardAt(stageId, rows) -> rows                         the recordings made at a stage
//                  GLIDE_S, DUCK_REAL
//
// SIX ROOMS FROM FOUR BEDS, AND NO NEW BYTE. The issue asks for a bed per stage of the climb -- near the Earth, the
// planets, the stars, the galaxies, the edge -- crossfading as you go up. The four CC0 beds of registry/audio.yaml
// already cover the first rungs (spec 0035), and the licensed tracks come first. So the climb past the stars is
// the ladder's own bed, played slower and darker: three semitones down and a low-pass at 4 kHz among the galaxies,
// six down and 1.6 kHz at the edge. A drone slowed is still the same drone, so the rooms stay one building; the
// rate and the filter glide over GLIDE_S, so a rung is a change of light, not a cut. A star system's stage (spec
// 0040) is a star's room, not "another world" as audio/pick.js rungOf has it for the trips.
//
// HOW IT HOOKS IN, WITHOUT TOUCHING A MODULE OF THE FIRST VISIT. main.js imports this file the first time sound is
// turned on (it is not in the boot graph; tests/test_score.mjs holds that). It wraps audio.beds.enter, so the two
// listeners main.js already has (`sr:stage`, sound on) reach the right bed and then voice it, and it puts one
// BiquadFilter between the beds' bus and their `under` gain: the stings and the narration go to the master and are
// never filtered.
//
// THE REAL RECORDINGS (data/realsounds.js). At a stage where a spacecraft recorded something, with sound on and no
// trip running, a small panel offers it: "Hear Saturn's radio", and under it, always, what it is -- "Real data,
// turned into sound" (radio, plasma or seismic data) or "Real sound, from a microphone" (Perseverance). A file is
// fetched only when its button is pressed. The bed ducks to DUCK_REAL under it and comes back after. The panel is
// a labelled region, every control a button with a name, and it never plays by itself.

import { COPY, t } from '../copy/en.js';
import '../copy/en.sound.js';
import { createLoader } from './load.js';
import { XFADE_S } from './beds.js';
import { REAL_SOUNDS } from '../data/realsounds.js';
import { loadCss } from '../ui/latercss.js';

export const GLIDE_S = XFADE_S;
export const DUCK_REAL = 0.25;

const VOICES = {
  near: { rate: 1, hz: 20000 },
  planets: { rate: 1, hz: 20000 },
  sun: { rate: 1, hz: 20000 },
  stars: { rate: 1, hz: 20000 },
  galaxies: { rate: 2 ** (-3 / 12), hz: 4000 },
  edge: { rate: 2 ** (-6 / 12), hz: 1600 },
};
const BEDS = { near: 'earth', planets: 'world', sun: 'sun', stars: 'ladder', galaxies: 'ladder', edge: 'ladder' };

/** Which room of the climb a stage is. A stage this does not know is a planet's, as rungOf has it. */
export function stageClass(stageId, isLadder) {
  const id = String(stageId || '');
  if (id === 'earth' || id === 'moon') return 'near';
  if (id === 'sun') return 'sun';
  if (id === 'galaxy') return 'galaxies';
  if (id === 'local-group') return 'edge';
  if (id === 'stellar' || id.startsWith('system-')) return 'stars';
  if (typeof isLadder === 'function' && isLadder(id)) return 'stars';
  return 'planets';
}

export function bedOf(cls) {
  return BEDS[cls] || 'world';
}

export function voiceOf(cls) {
  return VOICES[cls] || VOICES.planets;
}

export function heardAt(stageId, rows = REAL_SOUNDS) {
  const id = String(stageId || '');
  return (Array.isArray(rows) ? rows : []).filter((r) => r && Array.isArray(r.heard) && r.heard.includes(id));
}

export function installScore(audio, ctx, opts = {}) {
  if (audio.score) return audio.score;
  const beds = audio.beds;
  const doc = opts.document || document;
  const isLadder = opts.isLadder;
  const rows = opts.rows || REAL_SOUNDS;
  const loader = opts.loader || createLoader(audio);
  const here = () => String((ctx && ctx.stage && ctx.stage.worldId) || '');
  const cls = () => stageClass(here(), isLadder);
  const enter0 = beds.enter;
  let filter = null;
  let voiced = null;
  let playing = null; // { row, source, gain }
  const hidden = new Set(); // stages whose panel the visitor closed, for this visit

  function ensureFilter() {
    const c = audio.context;
    if (filter || !c || typeof c.createBiquadFilter !== 'function') return filter;
    const bus = beds.bus;
    const under = beds.under;
    if (!bus || !under) return null;
    filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20000;
    filter.Q.value = 0.5;
    try { bus.disconnect(under); } catch { /* not connected yet */ }
    bus.connect(filter);
    filter.connect(under);
    return filter;
  }

  /** Glide the playing bed and the filter to this room's voice; a bed that has just started takes it at once. */
  function voice(bed = beds.current) {
    const c = audio.context;
    if (!c) return;
    const v = voiceOf(cls());
    const now = c.currentTime;
    const f = ensureFilter();
    if (f) {
      f.frequency.cancelScheduledValues(now);
      f.frequency.setTargetAtTime(v.hz, now, GLIDE_S / 3);
    }
    const rate = bed && bed.source && bed.source.playbackRate;
    if (!rate) return;
    rate.cancelScheduledValues(now);
    if (bed !== voiced) rate.setValueAtTime(v.rate, now);
    else rate.setTargetAtTime(v.rate, now, GLIDE_S / 3);
    voiced = bed;
  }

  beds.enter = async () => {
    const bed = await enter0(bedOf(cls()));
    voice(bed);
    paint();
    return bed;
  };

  // --- the recordings' panel --------------------------------------------------------------------------------
  const C = COPY.realSound;
  const root = doc.createElement('section');
  root.className = 'sr-realsound';
  root.setAttribute('aria-label', C.region);
  root.hidden = true;
  const list = doc.createElement('div');
  list.className = 'sr-realsound__list';
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'sr-realsound__close';
  close.textContent = '×';
  close.setAttribute('aria-label', C.hide);
  close.title = C.hide;
  close.addEventListener('click', () => { hidden.add(here()); stop(); paint(); });
  const live = doc.createElement('p');
  live.className = 'sr-realsound__live';
  live.setAttribute('aria-live', 'polite');
  root.append(close, list, live);
  let mounted = false;

  const nameOf = (r) => (C.names && C.names[r.id]) || r.id;
  const howOf = (r) => (r.how === 'microphone' ? C.microphone : C.sonified);

  function tripRunning() {
    const st = ctx && ctx.trip && ctx.trip.state;
    return !!(st && st.phase && st.phase !== 'idle');
  }

  function paint() {
    const found = heardAt(here(), rows);
    const show = audio.isOn() && found.length > 0 && !hidden.has(here()) && !tripRunning();
    if (show && !mounted) {
      loadCss('realsound', doc);
      (doc.body || doc.documentElement).appendChild(root);
      mounted = true;
    }
    root.hidden = !show;
    if (!show) return;
    list.textContent = '';
    for (const r of found) {
      const item = doc.createElement('div');
      item.className = 'sr-realsound__item';
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'sr-realsound__play';
      const on = playing && playing.row.id === r.id;
      b.textContent = on ? `■ ${C.stop}` : `▶ ${t(C.play, { name: nameOf(r) })}`;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = r.credit;
      b.addEventListener('click', () => (playing && playing.row.id === r.id ? stop() : play(r)));
      const how = doc.createElement('p');
      how.className = 'sr-realsound__how';
      how.textContent = howOf(r);
      item.append(b, how);
      if (on) {
        const credit = doc.createElement('p');
        credit.className = 'sr-realsound__credit';
        credit.textContent = r.credit;
        item.appendChild(credit);
      }
      list.appendChild(item);
    }
  }

  function duck(to, s) {
    const bus = beds.bus;
    const c = audio.context;
    if (!bus || !c) return;
    const g = bus.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(to, c.currentTime + s);
  }

  function stop() {
    const p = playing;
    playing = null;
    if (p) {
      const c = audio.context;
      try {
        p.gain.gain.setTargetAtTime(0, c.currentTime, 0.15);
        p.source.stop(c.currentTime + 0.6);
      } catch { /* already ended */ }
      duck(1, 1.5);
    }
    live.textContent = '';
    paint();
  }

  async function play(r) {
    stop();
    if (!audio.live()) return;
    const mine = { row: r, source: null, gain: null };
    playing = mine;
    paint();
    const buffer = await loader.load(r);
    if (playing !== mine) return; // pressed again, or the stage changed, while it loaded
    if (!buffer) {
      playing = null;
      live.textContent = C.failed;
      paint();
      return;
    }
    const c = audio.context;
    const gain = c.createGain();
    gain.gain.value = 1;
    gain.connect(audio.master);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.onended = () => {
      try { gain.disconnect(); } catch { /* already gone */ }
      if (playing === mine) { playing = null; duck(1, 1.5); live.textContent = ''; paint(); }
    };
    mine.source = source;
    mine.gain = gain;
    duck(DUCK_REAL, 0.4);
    source.start();
    live.textContent = t(C.playing, { name: nameOf(r), how: howOf(r) });
  }

  const onStage = () => { stop(); };
  if (typeof window !== 'undefined') window.addEventListener('sr:stage', onStage);
  const offChange = audio.onChange((on) => { if (!on) stop(); paint(); });
  const offTrip = ctx && ctx.trip && typeof ctx.trip.onChange === 'function' ? ctx.trip.onChange(() => paint()) : null;

  const api = {
    voice,
    paint,
    stop,
    destroy() {
      stop();
      beds.enter = enter0;
      if (typeof window !== 'undefined') window.removeEventListener('sr:stage', onStage);
      if (typeof offChange === 'function') offChange();
      if (typeof offTrip === 'function') offTrip();
      root.remove();
      delete audio.score;
    },
  };
  audio.score = api;
  // The bed that is already playing (sound was on before this file arrived) is voiced now, and the panel drawn.
  beds.enter();
  return api;
}
