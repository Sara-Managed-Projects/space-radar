// tools/render-trip.lib.mjs -- the parts of tools/render-trip.mjs that are sums and strings, so
// tests/test_render_trip.mjs can read them with no Chrome and no ffmpeg (spec 0070).
//
//   timeline(sheet)                     the page's cue sheet (frames) -> seconds
//   chapters(tl) / chaptersText(list)   YouTube's chapter lines, under YouTube's own rules
//   captions(tl, cuesByStop)            every clip's WebVTT cues, moved to the film's clock
//   srtText(cues) / vttText(cues)
//   bedSegments(tl)                     which music bed plays from when to when
//   duckExpr(spans)                     the bed's gain as an ffmpeg expression: -10 dB under the voice
//   audioGraph(plan)                    { inputs, filter } for ffmpeg -filter_complex
//   descriptionText(info)               the video's description
//   frameName(n, ext), resumeFrom(names, ext), thumbFrame(tl, stopId)
//
// The voice's numbers are the live trip's (site/js/audio/narration.js): the bed goes 10 dB down
// over 0.3 s when a clip starts and comes back over 1.2 s after its last word.

import { DUCK_DB, DUCK_IN_S, DUCK_BACK_S, VOICE_DUCK } from '../site/js/audio/narration.js';

/** YouTube reads chapters only when the first is 00:00, there are three or more, and each is 10 s. */
export const CHAPTER_MIN_S = 10;
export const CHAPTER_MIN_COUNT = 3;
/** The music's fade at the head and the tail of the film, and across a change of bed. */
export const BED_FADE_S = 1.5;
/** YouTube normalises to -14 LUFS; a film mixed there is played as it was mixed. */
export const TARGET_LUFS = -14;
export const TARGET_TP = -1.5;

const round3 = (v) => Math.round(v * 1000) / 1000;

/**
 * The cue sheet window.__srRender.describe() hands back, in seconds.
 * @param {{fps, totalFrames, titleFrames, endFrames, stops: {id,title,startFrame,arriveFrame,leaveFrame,clipSeconds}[], beds: {frame,rung}[]}} sheet
 */
export function timeline(sheet) {
  const fps = sheet.fps;
  const sec = (f) => round3(f / fps);
  const total = sheet.totalFrames;
  const stops = (sheet.stops || []).map((s) => {
    const leave = s.leaveFrame === null || s.leaveFrame === undefined ? total : s.leaveFrame;
    const arrive = s.arriveFrame === null || s.arriveFrame === undefined ? null : s.arriveFrame;
    // A clip is never laid past the frame the camera leaves on (a `stops=N` cut): it would talk
    // over the next thing.
    const clip = arrive !== null && s.clipSeconds > 0 ? { start: sec(arrive), end: round3(Math.min(sec(arrive) + s.clipSeconds, total / fps)) } : null;
    return { id: s.id, title: s.title, start: sec(s.startFrame), arrive: arrive === null ? null : sec(arrive), end: sec(leave), clip };
  });
  return {
    fps,
    frames: total,
    duration: sec(total),
    titleEnd: sec(sheet.titleFrames || 0),
    endStart: sec(total - (sheet.endFrames || 0)),
    stops,
    beds: (sheet.beds || []).map((b) => ({ at: sec(b.frame), rung: b.rung })),
  };
}

/** `0:07`, `12:05`, `1:02:03`: YouTube's own stamp. Whole seconds, rounded down. */
export function stamp(seconds, { pad = true } = {}) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n) => String(n).padStart(2, '0');
  if (h) return `${h}:${two(m)}:${two(s % 60)}`;
  return `${pad ? two(m) : m}:${two(s % 60)}`;
}

/**
 * One chapter per stop, from the second the camera sets off for it; the first is moved to 0:00
 * (the title card belongs to it). A chapter shorter than YouTube's ten seconds is folded into the
 * one before. Fewer than three and YouTube shows none: the list is still returned, with `valid`.
 */
export function chapters(tl) {
  const list = [];
  tl.stops.forEach((s, i) => {
    const at = i === 0 ? 0 : Math.floor(s.start);
    list.push({ at, title: s.title });
  });
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const next = i + 1 < list.length ? list[i + 1].at : tl.duration;
    if (out.length && next - list[i].at < CHAPTER_MIN_S) continue;
    if (out.length && list[i].at - out[out.length - 1].at < CHAPTER_MIN_S) continue;
    out.push(list[i]);
  }
  return { list: out, valid: out.length >= CHAPTER_MIN_COUNT && out[0].at === 0 };
}

export function chaptersText(ch) {
  return ch.list.map((c) => `${stamp(c.at)} ${c.title}`).join('\n') + '\n';
}

/** Every stop's cues on the film's clock. `cuesByStop` is stop id -> [{start, end, text}] in clip seconds. */
export function captions(tl, cuesByStop) {
  const out = [];
  for (const s of tl.stops) {
    if (!s.clip) continue;
    for (const c of cuesByStop[s.id] || []) {
      const start = round3(s.clip.start + c.start);
      const end = round3(Math.min(s.clip.start + c.end, s.clip.end, tl.duration));
      if (end > start) out.push({ start, end, text: c.text });
    }
  }
  return out;
}

function clock(seconds, sep) {
  const ms = Math.round(seconds * 1000);
  const two = (n) => String(n).padStart(2, '0');
  return `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)}${sep}${String(ms % 1000).padStart(3, '0')}`;
}

export function srtText(cues) {
  return cues.map((c, i) => `${i + 1}\n${clock(c.start, ',')} --> ${clock(c.end, ',')}\n${c.text}\n`).join('\n');
}

export function vttText(cues) {
  return 'WEBVTT\n\n' + cues.map((c) => `${clock(c.start, '.')} --> ${clock(c.end, '.')}\n${c.text}\n`).join('\n');
}

/** The beds end to end: [{rung, start, end}], a change of stage being a change of bed. */
export function bedSegments(tl) {
  const out = [];
  const beds = tl.beds.length ? tl.beds : [{ at: 0, rung: 'earth' }];
  beds.forEach((b, i) => {
    const end = i + 1 < beds.length ? beds[i + 1].at : tl.duration;
    if (out.length && out[out.length - 1].rung === b.rung) { out[out.length - 1].end = end; return; }
    if (end > b.at) out.push({ rung: b.rung, start: b.at, end });
  });
  return out;
}

/** When the voice is speaking: [{start, end}] in seconds, in order. */
export function voiceSpans(tl) {
  return tl.stops.filter((s) => s.clip).map((s) => ({ start: s.clip.start, end: s.clip.end }));
}

/**
 * The bed's gain over time as an ffmpeg `volume` expression (eval=frame, `t` in seconds): 1, down
 * to VOICE_DUCK over DUCK_IN_S from each clip's first sample, back over DUCK_BACK_S after its last.
 * The deepest duck wins where two overlap, as one gain node would have it.
 */
export function duckExpr(spans) {
  if (!spans.length) return '1';
  const f = (v) => String(round3(v));
  const one = (s) => `clip((t-${f(s.start)})/${DUCK_IN_S},0,1)*clip((${f(s.end + DUCK_BACK_S)}-t)/${DUCK_BACK_S},0,1)`;
  const deepest = spans.map(one).reduce((a, b) => `max(${a},${b})`);
  return `1-${f(1 - VOICE_DUCK)}*${deepest}`;
}

/** The same sum in JavaScript, for the test and for anyone reading a number off it. */
export function duckGain(spans, t) {
  const clip = (v) => Math.min(1, Math.max(0, v));
  let k = 0;
  for (const s of spans) k = Math.max(k, clip((t - s.start) / DUCK_IN_S) * clip((s.end + DUCK_BACK_S - t) / DUCK_BACK_S));
  return 1 - (1 - VOICE_DUCK) * k;
}

/**
 * The sound track as ffmpeg sees it. `clips` are [{file, at}] (seconds), `beds` [{file, start, end}].
 * Returns the input arguments and the filter graph, ending in `[mix]`: the voice, and the music
 * under it, exactly as long as the film. Loudness is the caller's (two passes of loudnorm).
 */
export function audioGraph({ clips, beds, spans, duration }) {
  const inputs = [];
  const parts = [];
  const voices = [];
  const fmt = 'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo';
  clips.forEach((c, i) => {
    inputs.push('-i', c.file);
    const ms = Math.round(c.at * 1000);
    parts.push(`[${inputs.length / 2 - 1}:a]${fmt},adelay=${ms}:all=1[v${i}]`);
    voices.push(`[v${i}]`);
  });
  const music = [];
  let n = clips.length;
  beds.forEach((b, i) => {
    // A bed is 72 s cut to loop (registry/audio.yaml): looped at the input, trimmed to its span.
    // THE LOOP IS BOUNDED AT THE INPUT (-t). An input that loops for ever is only ended by the
    // graph's last atrim, and with several beds mixed that never came: a six-minute film's mix
    // ran for two hours at full CPU and was killed (2026-10-10).
    const len = round3(b.end - b.start);
    inputs.push('-stream_loop', '-1', '-t', String(round3(len + 1)), '-i', b.file);
    const fade = Math.min(BED_FADE_S, len / 2);
    parts.push(`[${n}:a]${fmt},atrim=0:${len},afade=t=in:st=0:d=${fade},afade=t=out:st=${round3(len - fade)}:d=${fade},adelay=${Math.round(b.start * 1000)}:all=1[b${i}]`);
    music.push(`[b${i}]`);
    n += 1;
  });
  const sum = (labels, out) => (labels.length === 1 ? `${labels[0]}anull[${out}]` : `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest[${out}]`);
  const tracks = [];
  if (voices.length) { parts.push(sum(voices, 'voice')); tracks.push('[voice]'); }
  if (music.length) {
    parts.push(sum(music, 'beds'));
    parts.push(`[beds]volume='${duckExpr(spans)}':eval=frame[music]`);
    tracks.push('[music]');
  }
  if (!tracks.length) {
    parts.push(`anullsrc=r=48000:cl=stereo,atrim=0:${duration}[mix]`);
  } else {
    parts.push(`${sum(tracks, 'sum')}`);
    parts.push(`[sum]apad,atrim=0:${duration}[mix]`);
  }
  return { inputs, filter: parts.join(';') };
}

export function frameName(n, ext = 'jpg') {
  return `f${String(n).padStart(6, '0')}.${ext}`;
}

/** How many frames are already on disc, counted from 0 with no gap: where a stopped render goes on from. */
export function resumeFrom(names, ext = 'jpg') {
  const have = new Set(names);
  let n = 0;
  while (have.has(frameName(n, ext))) n += 1;
  return n;
}

/** The frame the thumbnail is taken on: 40 % into the stop's stay, or null until the stop has been reached. */
export function thumbFrame(stop, fps, holdMs) {
  if (!stop || stop.arriveFrame === null || stop.arriveFrame === undefined) return null;
  return stop.arriveFrame + Math.round((0.4 * holdMs / 1000) * fps);
}

/**
 * The description: what it is, where to fly it, the chapters, and who is owed what. YouTube reads
 * chapters from the description, so they are in it; the synthetic voice is said in words here and
 * is ALSO a box to tick at upload ("altered or synthetic content").
 */
export function descriptionText({ tour, tl, truth, voiceCredit, bedCredits, url }) {
  const ch = chapters(tl);
  const lines = [
    tour.title,
    '',
    tour.blurb || '',
    '',
    `Fly it yourself, live in your browser: ${url}`,
    '',
    truth,
    'Space Radar is a live 3D map of what is in space: every position is computed, nothing is an animation of a guess.',
    '',
  ];
  if (ch.valid) lines.push('Chapters', chaptersText(ch).trimEnd(), '');
  lines.push('Sources and credits');
  const req = tour.requires || [];
  if (req.some((id) => ['stations', 'active', 'visual', 'starlink'].includes(id))) lines.push('Orbital data: CelesTrak (T. S. Kelso), https://celestrak.org');
  lines.push('Positions of the Sun, the Moon and the planets: astronomy-engine (MIT)');
  lines.push('Earth: NASA Blue Marble Next Generation and Black Marble; planet maps: Solar System Scope (CC BY 4.0)');
  lines.push('The Milky Way: NASA/Goddard Space Flight Center Scientific Visualization Studio');
  lines.push('3D models: NASA 3D Resources');
  if (voiceCredit) lines.push(`${voiceCredit}. The voice in this video is computer-generated; the words are ours.`);
  if (bedCredits && bedCredits.length) lines.push(`Music: ${bedCredits.join('; ')}`);
  lines.push('Every source and licence: https://www.spaceradar.ai/#sources');
  lines.push('');
  lines.push('#space #astronomy #spaceradar');
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n') + '\n';
}

export { DUCK_DB };
