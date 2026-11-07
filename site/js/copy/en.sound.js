// The words of release 2.0.0 batch f9-reach: the real recordings the score offers where they were made
// (audio/score.js, forge #163). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by
// audio/score.js only, which is loaded the first time a visitor turns sound on: a first visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  realSound: {
    region: 'Real recordings from here',
    play: 'Hear {name}',
    stop: 'Stop',
    hide: 'Hide the recordings here',
    // `how` (registry/audio.yaml): what the visitor is told every time, beside the button.
    sonified: 'Real data, turned into sound',
    microphone: 'Real sound, from a microphone',
    playing: 'Playing: {name}. {how}.',
    failed: 'That recording did not load.',
    names: {
      'real-voyager-plasma': 'Voyager 1 in interstellar space',
      'real-juno-ganymede': 'Juno passing Ganymede',
      'real-cassini-saturn': 'Saturn’s radio',
      'real-insight-impact': 'a meteoroid striking Mars',
      'real-perseverance-dust-devil': 'a dust devil on Mars',
    },
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
