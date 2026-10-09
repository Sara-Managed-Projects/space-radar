#!/usr/bin/env node
// Spec 0070 (2026-10-03): trips as videos, with no Chrome and no ffmpeg.
//
// What a browser and an encoder do is measured by rendering a film (tools/README.md says how, and
// what the first one measured). What is held here is everything that is a sum or a string, in the
// order a wrong video would be noticed:
//   1. THE CLOCK IS OURS. site/js/ui/rendermode.js's time moves only when it is stepped, by exactly
//      the step; timers run in the order they fall due; two runs of the same steps are the same.
//   2. NOT ON A VISITOR. The module is not in the boot graph: main.js imports it for `render=1` only.
//   3. THE CUE SHEET. Frames to seconds, a clip laid where its camera arrives, never past the cut.
//   4. THE MIX. The bed is 10 dB down under each clip, 0.3 s in and 1.2 s back, as in the live trip.
//   5. WHAT YOUTUBE READS. Chapters from 00:00, ten seconds each, three or more; SRT and VTT on the
//      film's clock; a description that says the voice is synthetic and credits the music.
//
// Run: node tests/test_render_trip.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

import {
  renderOptions, createVirtualTime, truthLine, tripUrl, cardOpacity, lowerThird, TITLE_S, END_S,
} from '../site/js/ui/rendermode.js';
import { VOICE_DUCK, DUCK_IN_S, DUCK_BACK_S, holdFor } from '../site/js/audio/narration.js';
import { NARRATION } from '../site/js/data/narration.js';
import { TOURS } from '../site/js/data/tours.js';
import {
  timeline, stamp, chapters, chaptersText, captions, srtText, vttText, bedSegments, voiceSpans,
  duckExpr, duckGain, audioGraph, descriptionText, frameName, resumeFrom, thumbFrame,
  CHAPTER_MIN_S, TARGET_LUFS,
} from '../tools/render-trip.lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
let checks = 0;
function check(ok, what) {
  checks += 1;
  if (!ok) { failures += 1; console.error('FAIL ' + what); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// A window with nothing in it but what createVirtualTime replaces.
function fakeWindow() {
  const g = {
    Date,
    performance: { now: () => 123456 },
    setTimeout: () => { throw new Error('the real setTimeout was called'); },
    clearTimeout: () => {},
    setInterval: () => { throw new Error('the real setInterval was called'); },
    clearInterval: () => {},
    console: { error() {} },
  };
  return g;
}

// --- 1. the clock ------------------------------------------------------------------------------
{
  check(renderOptions('') === null && renderOptions('?tier=2') === null && renderOptions('?render=0') === null, 'no render=1, no render mode');
  const o = renderOptions('?render=1&fps=60&at=1791051444000&captions=1&stops=2');
  check(o && o.fps === 60 && o.epochMs === 1791051444000 && o.captions === true && o.maxStops === 2, 'the query is read: fps, the instant, captions, a cut');
  const d = renderOptions('?render=1&fps=17');
  check(d && d.fps === 30 && d.epochMs === null && d.captions === false && d.maxStops === 0, 'defaults: 30 fps, now, no captions, the whole trip');

  const run = () => {
    const g = fakeWindow();
    const t = createVirtualTime(g, { epochMs: 1791051444000, startMs: 500 });
    const seen = [];
    g.setTimeout(() => seen.push('b@' + g.performance.now()), 50);
    g.setTimeout(() => seen.push('a@' + g.performance.now()), 20);
    g.setTimeout(() => { seen.push('c'); g.setTimeout(() => seen.push('c-child'), 0); }, 20);
    const gone = g.setTimeout(() => seen.push('cleared'), 10);
    g.clearTimeout(gone);
    let ticks = 0;
    g.setInterval(() => { ticks += 1; }, 5);
    let frames = 0;
    const loop = (now) => { frames += 1; seen.push('frame@' + Math.round(now)); g.requestAnimationFrame(loop); };
    g.requestAnimationFrame(loop);
    const before = [g.performance.now(), g.Date.now(), new g.Date().getTime()];
    for (let i = 0; i < 3; i += 1) t.step(1000 / 30);
    return { seen, ticks, frames, before, perf: g.performance.now(), date: g.Date.now(), g, t };
  };
  const a = run();
  const b = run();
  check(a.before[0] === 500 && a.before[1] === 1791051444000 && a.before[2] === 1791051444000, 'before a step: performance.now() is the start, Date.now() and new Date() the instant asked for');
  check(near(a.perf, 600) && a.date === 1791051444100, 'three steps of 1/30 s are 100 ms on both clocks, whatever the machine did meanwhile');
  check(a.frames === 3 && a.ticks === 3, 'one animation frame per step, and an interval shorter than the step runs once a step');
  check(a.seen.indexOf('a@' + (500 + 1000 / 30)) !== -1 && a.seen.indexOf('a@' + (500 + 1000 / 30)) < a.seen.indexOf('c'), 'timers run in the order they fall due, then the order they were set');
  check(a.seen.indexOf('c-child') > a.seen.indexOf('c') && a.seen.indexOf('c-child') < a.seen.indexOf('frame@533'), 'a timer set by a timer and already due runs in the same step, before the frame');
  check(a.seen.some((s) => s.startsWith('b@')) && !a.seen.includes('cleared'), 'a 50 ms timer runs in the second step; a cleared one never');
  check(JSON.stringify(a.seen) === JSON.stringify(b.seen), 'two runs of the same steps see the same things in the same order');
  check(new a.g.Date(0).getTime() === 0 && a.g.Date.parse('2026-10-03T00:00:00Z') === Date.parse('2026-10-03T00:00:00Z') && new a.g.Date() instanceof Date, 'the film\'s Date is still a Date');
  a.t.jumpTo(3600000, 1800000000000);
  check(a.g.performance.now() === 3600000 && a.g.Date.now() === 1800000000000, 'frame 0: both clocks are set, forward, to known numbers');
  a.t.jumpTo(0, 1800000000000 - 5);
  check(a.g.performance.now() === 3600000 && a.g.Date.now() === 1800000000000 - 5, 'performance.now() never goes back');
  let late = 0;
  a.g.setInterval(() => { late += 1; }, 10);
  a.t.step(100000);
  check(late === 1, 'an interval runs once in a long step, not ten thousand times');
  let idle = null;
  a.g.requestIdleCallback((d) => { idle = d.timeRemaining(); });
  a.t.step(33);
  check(idle === 50, '"when idle" is the next frame');
}

// --- 2. not on a visitor -----------------------------------------------------------------------
{
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/await import\('\.\/ui\/rendermode\.js'\)/.test(main) && !/^import .*rendermode/m.test(main), 'main.js imports ui/rendermode.js dynamically, never statically');
  check(/\[\?&\]render=1/.test(main), 'and only when the address says render=1');
  const index = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(!index.includes('rendermode'), 'index.html does not preload it');
  check(/!ctx\.renderMode && !capped && latch\.push/.test(main), 'the frame latch is not fed while filming (nor by a frame the idle cap spaced out: tests/test_idle.mjs)');
  const mod = readFileSync(join(ROOT, 'site/js/ui/rendermode.js'), 'utf8');
  check(!/from '\.\/tripframe\.js'/.test(mod), 'render mode does not pull the trip frame in');
}

// --- 3. the cue sheet --------------------------------------------------------------------------
const SHEET = {
  fps: 30, totalFrames: 2400, titleFrames: 90, endFrames: 90,
  stops: [
    { id: 'far', title: 'Two places, and only two', index: 0, startFrame: 90, arriveFrame: 140, leaveFrame: 514, clipSeconds: 11.29 },
    { id: 'iss', title: 'The International Space Station', index: 1, startFrame: 514, arriveFrame: 700, leaveFrame: 1250, clipSeconds: 16.96 },
    { id: 'tiangong', title: 'Tiangong', index: 2, startFrame: 1250, arriveFrame: 1400, leaveFrame: 1820, clipSeconds: 12.51 },
    { id: 'both', title: 'Two specks, one planet', index: 3, startFrame: 1820, arriveFrame: 1870, leaveFrame: 2310, clipSeconds: 13.53 },
  ],
  beds: [{ frame: 0, rung: 'earth' }],
};
const tl = timeline(SHEET);
{
  check(tl.duration === 80 && tl.frames === 2400 && tl.titleEnd === 3 && tl.endStart === 77, 'frames to seconds: 2400 at 30 is 80 s, the title 3 s, the end card from 77 s');
  check(tl.stops[0].start === 3 && near(tl.stops[0].arrive, 4.667) && near(tl.stops[0].end, 17.133), 'a stop: sets off, arrives, leaves');
  check(near(tl.stops[1].clip.start, 23.333) && near(tl.stops[1].clip.end, 40.293), 'its clip is laid where the camera arrives and runs its length');
  check(tl.stops.every((s) => s.clip.end + 1 <= s.end + 1e-3), 'every stop is held a second past its last word (the page asks holdDwell for the clip and a breath)');
  check(holdFor(11.29) === 12290, 'the hold is the live trip\'s own sum');
  const cut = timeline({ ...SHEET, totalFrames: 500, stops: [SHEET.stops[0], { ...SHEET.stops[1], arriveFrame: null, leaveFrame: null }] });
  check(cut.stops[1].clip === null && cut.stops[1].end === cut.duration, 'a stop the film ends before reaching has no clip');
  const short = timeline({ ...SHEET, totalFrames: 300, stops: [{ ...SHEET.stops[0], leaveFrame: null }] });
  check(short.stops[0].clip.end === 10, 'a clip never runs past the end of the film');
  check(JSON.stringify(timeline(SHEET)) === JSON.stringify(tl), 'the same sheet is the same timeline');
  check(TITLE_S === 3 && END_S === 3, 'the cards are three seconds each');
}

// --- the cards and the lower third, by frame ----------------------------------------------------
{
  check(cardOpacity(0, 0, 108, 18, { fadeIn: false }) === 1 && cardOpacity(89, 0, 108, 18, { fadeIn: false }) === 1, 'the title card is fully up from frame 0, with no fade in');
  check(cardOpacity(99, 0, 108, 18, { fadeIn: false }) === 0.5 && cardOpacity(108, 0, 108, 18, { fadeIn: false }) === 0, 'and fades over 0.6 s after the trip starts');
  check(cardOpacity(2310, 2310, Infinity, 18, { fadeOut: false }) > 0 && cardOpacity(2400, 2310, Infinity, 18, { fadeOut: false }) === 1, 'the end card comes up and stays');
  const stops = SHEET.stops;
  check(lowerThird(stops, 100, 18).opacity === 0, 'no name while the camera is still on its way to the first stop');
  const up = lowerThird(stops, 200, 18);
  check(up.index === 0 && up.title === 'Two places, and only two' && up.opacity === 1, 'the stop\'s name is up once the camera has arrived');
  check(lowerThird(stops, 522, 18).opacity === 0.5 && lowerThird(stops, 540, 18).opacity === 0, 'and goes as the camera leaves');
  check(lowerThird(stops, 700, 18).index === 1 && lowerThird(stops, 700, 18).opacity > 0, 'the next name comes up at the next arrival');
}

// --- the line of truth -------------------------------------------------------------------------
{
  const people = TOURS.find((t) => t.id === 'people-in-space');
  const line = truthLine(people, Date.UTC(2026, 9, 3, 18, 8, 51));
  check(line === 'Positions computed for 3 October 2026, 18:08 UTC from CelesTrak orbital elements and the planets’ own orbits (astronomy-engine).', 'a live trip says the minute and the sources: ' + line);
  for (const t of TOURS) {
    const l = truthLine(t, Date.UTC(2026, 9, 3));
    check(l.length > 30 && l.length < 170 && l.endsWith('.') && !/undefined|NaN/.test(l), `${t.id}: a line of truth of one or two lines`);
    if (t.clock !== 'as-found') check(!/computed for/.test(l), `${t.id} moves the clock itself, so its line does not claim a minute`);
  }
  check(tripUrl('people-in-space') === 'spaceradar.ai/#trip=people-in-space', 'the end card\'s address opens the trip');
}

// --- 4. the mix --------------------------------------------------------------------------------
{
  const spans = voiceSpans(tl);
  check(spans.length === 4 && near(spans[0].start, 4.667) && near(spans[0].end, 15.957), 'the voice speaks where the clips are');
  check(duckGain(spans, 0) === 1 && duckGain(spans, 4.6) === 1, 'the bed is at full level before the first word');
  check(near(duckGain(spans, 4.667 + DUCK_IN_S), VOICE_DUCK) && near(duckGain(spans, 10), VOICE_DUCK), '10 dB down 0.3 s after a clip starts, and held under it');
  check(near(duckGain(spans, 4.667 + DUCK_IN_S / 2), 1 - (1 - VOICE_DUCK) / 2), 'half way down half way through the ramp');
  check(near(duckGain(spans, 15.957 + DUCK_BACK_S / 2), 1 - (1 - VOICE_DUCK) / 2) && duckGain(spans, 15.957 + DUCK_BACK_S) === 1, 'back over 1.2 s after the last word');
  check(near(20 * Math.log10(VOICE_DUCK), -10), 'which is the live trip\'s -10 dB');
  const expr = duckExpr(spans);
  check(expr.startsWith('1-0.684*max(') && expr.includes('clip((t-4.667)/0.3,0,1)*clip((17.157-t)/1.2,0,1)'), 'the same ramp, as ffmpeg reads it: ' + expr.slice(0, 80));
  check((expr.match(/clip\(\(t-/g) || []).length === 4, 'one ramp per clip');
  check(duckExpr([]) === '1', 'no voice, no duck');

  const beds = bedSegments(tl);
  check(beds.length === 1 && beds[0].rung === 'earth' && beds[0].start === 0 && beds[0].end === 80, 'one bed from the first frame to the last');
  const two = bedSegments({ ...tl, beds: [{ at: 0, rung: 'earth' }, { at: 30, rung: 'sun' }, { at: 50, rung: 'sun' }] });
  check(two.length === 2 && two[1].rung === 'sun' && two[1].start === 30 && two[1].end === 80, 'a change of stage is a change of bed; the same bed twice is one span');

  const plan = audioGraph({
    clips: tl.stops.map((s) => ({ file: `/n/${s.id}.opus`, at: s.clip.start })),
    beds: beds.map((b) => ({ file: '/a/bed-earth.opus', start: b.start, end: b.end })),
    spans, duration: tl.duration,
  });
  check(plan.inputs.filter((a) => a === '-i').length === 5 && plan.inputs.indexOf('-stream_loop') === 8, 'four clips, then the bed, looped at its input');
  check(plan.filter.includes('[0:a]') && plan.filter.includes('adelay=4667:all=1[v0]') && plan.filter.includes('adelay=23333:all=1[v1]'), 'each clip is delayed to its arrival, in ms');
  check(plan.filter.includes('[4:a]') && plan.filter.includes('atrim=0:80,afade=t=in:st=0:d=1.5,afade=t=out:st=78.5:d=1.5'), 'the bed is trimmed to the film and fades in and out');
  check(plan.filter.includes(`[beds]volume='${expr}':eval=frame[music]`), 'the duck is on the music only');
  check(plan.filter.includes('amix=inputs=4:normalize=0') && plan.filter.includes('[voice][music]amix=inputs=2:normalize=0'), 'nothing is turned down by being mixed');
  check(plan.filter.endsWith('[sum]apad,atrim=0:80[mix]'), 'the sound is exactly as long as the picture');
  const silent = audioGraph({ clips: [], beds: [], spans: [], duration: 5 });
  check(silent.inputs.length === 0 && silent.filter === 'anullsrc=r=48000:cl=stereo,atrim=0:5[mix]', 'no clips and no bed is silence of the right length, not an error');
  check(TARGET_LUFS === -14, 'levelled to YouTube\'s -14 LUFS');
}

// --- 5. what YouTube reads ---------------------------------------------------------------------
{
  check(stamp(0) === '00:00' && stamp(59.9) === '00:59' && stamp(75) === '01:15' && stamp(3723) === '1:02:03', 'stamps as YouTube writes them');
  const ch = chapters(tl);
  check(ch.valid && ch.list.length === 4 && ch.list[0].at === 0, 'four stops, four chapters, the first at 00:00');
  check(chaptersText(ch) === '00:00 Two places, and only two\n00:17 The International Space Station\n00:41 Tiangong\n01:00 Two specks, one planet\n', 'the chapter lines: ' + JSON.stringify(chaptersText(ch)));
  const gaps = ch.list.map((c, i) => (i + 1 < ch.list.length ? ch.list[i + 1].at : tl.duration) - c.at);
  check(gaps.every((g) => g >= CHAPTER_MIN_S), 'every chapter is ten seconds or more');
  const tight = chapters({ duration: 40, stops: [{ start: 3, title: 'a' }, { start: 9, title: 'b' }, { start: 20, title: 'c' }, { start: 36, title: 'd' }] });
  check(tight.list.map((c) => c.title).join() === 'a,c' && !tight.valid, 'a chapter under ten seconds is folded into the one before, and two chapters are not enough for YouTube');

  const cuesByStop = { far: [{ start: 0.15, end: 2.3, text: 'Two places, and only two.' }, { start: 3.0, end: 11.2, text: 'Right now there are exactly two homes.' }], iss: [{ start: 0.15, end: 2.574, text: 'The International Space Station.' }] };
  const cues = captions(tl, cuesByStop);
  check(cues.length === 3 && near(cues[0].start, 4.817) && near(cues[2].start, 23.483), 'cues move to the film\'s clock');
  check(cues.every((c, i) => i === 0 || c.start >= cues[i - 1].end), 'and never overlap');
  const srt = srtText(cues);
  check(srt.startsWith('1\n00:00:04,817 --> 00:00:06,967\nTwo places, and only two.\n\n2\n'), 'SRT: numbered, comma milliseconds');
  const vtt = vttText(cues);
  check(vtt.startsWith('WEBVTT\n\n00:00:04.817 --> 00:00:06.967\nTwo places, and only two.\n'), 'WebVTT: the header, dot milliseconds');
  check(captions(tl, {}).length === 0 && srtText([]) === '', 'no cues is an empty file, not an error');

  const people = TOURS.find((t) => t.id === 'people-in-space');
  const text = descriptionText({
    tour: people, tl, truth: truthLine(people, Date.UTC(2026, 9, 3, 18, 8)), voiceCredit: NARRATION.credit,
    bedCredits: ['Above the Clouds by John Bartmann, CC0'], url: 'https://www.spaceradar.ai/#trip=people-in-space',
  });
  const lines = text.split('\n');
  check(lines[0] === people.title, 'the description opens on the trip\'s name');
  check(text.includes('https://www.spaceradar.ai/#trip=people-in-space'), 'links to the trip');
  check(text.includes('Positions computed for 3 October 2026, 18:08 UTC'), 'carries the line of truth');
  check(text.includes('\nChapters\n00:00 Two places, and only two\n'), 'carries the chapters, which is where YouTube reads them');
  check(text.includes(NARRATION.credit) && /computer-generated/.test(text), 'says the voice is synthetic');
  check(text.includes('Music: Above the Clouds by John Bartmann, CC0'), 'credits the music');
  check(text.includes('CelesTrak') && text.includes('https://www.spaceradar.ai/#sources'), 'credits the data and points at every licence');
  check(!/\n\n\n/.test(text) && text.length < 5000, 'no double blank lines, and inside YouTube\'s 5000 characters');
  check(!/[—–]/.test(text), 'no dashes');
  const stars = descriptionText({ tour: TOURS.find((t) => t.id === 'to-the-edge'), tl, truth: 'x', voiceCredit: '', bedCredits: [], url: 'u' });
  check(!stars.includes('CelesTrak') && !stars.includes('Narration') && !stars.includes('Music:'), 'a trip with no satellites, voice or music credits none');
}

// --- the frames on disc ------------------------------------------------------------------------
{
  check(frameName(0) === 'f000000.jpg' && frameName(1234, 'png') === 'f001234.png', 'frames are numbered files');
  check(resumeFrom([]) === 0 && resumeFrom(['cache.json', 'f000000.jpg', 'f000001.jpg', 'f000003.jpg']) === 2, 'a stopped render goes on from the first gap');
  check(resumeFrom(['f000000.png'], 'jpg') === 0, 'frames of another format are not these frames');
  check(thumbFrame({ arriveFrame: 140 }, 30, 12290) === 140 + 147 && thumbFrame({ arriveFrame: null }, 30, 12290) === null, 'the thumbnail is taken 40 % into its stop, once the stop is reached');
}

console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `test_render_trip: ${checks} checks passed`);
process.exit(failures ? 1 : 0);
