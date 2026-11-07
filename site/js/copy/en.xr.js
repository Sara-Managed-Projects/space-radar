// The words of release 2.0.0 batch f8-xr: free flight with a gamepad (ui/gamepad.js, forge #164) and the headset mode
// (ui/headset.js, forge #158). ADDED TO THE SAME `COPY` OBJECT as copy/en.later.js's sections, and imported by those two
// modules only: nothing reads them before a pad's first press or a browser that can open a headset session, so a first
// visit does not fetch them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  // ui/gamepad.js: the hint, the reticle's choices and what is said aloud.
  pad: {
    title: 'Gamepad',
    label: 'Gamepad controls',
    close: 'Close the gamepad controls',
    capStickL: 'Left stick',
    capStickR: 'Right stick',
    capTriggers: 'RT · LT',
    capA: 'A · Cross',
    capX: 'X · Square',
    capB: 'B · Circle',
    capY: 'Y · Triangle',
    capDpad: 'D-pad ↑ ↓',
    capView: 'View · Share',
    turn: 'Turn around',
    fly: 'Fly in and out, slide sideways',
    speed: 'Faster, slower',
    choose: 'Choose what is in the ring',
    go: 'Go there',
    back: 'Back',
    ship: 'Ship physics on or off',
    ladder: 'Out and in along the distance ladder',
    controls: 'These controls (Menu too)',
    shipToggle: 'Ship physics',
    shipHow: 'You keep drifting after you let go. Press a stick in to stop.',
    notStandard: 'This pad does not say where its buttons are: its left stick turns the view, its buttons are not used.',
    connected: 'Gamepad connected. Press Y for its controls.',
    disconnected: 'Gamepad disconnected.',
    shipOn: 'Ship physics on: you keep drifting after you let go.',
    shipOff: 'Ship physics off.',
    nothing: 'Nothing in the ring to choose.',
    chooseFirst: 'Choose something first: A takes what is in the ring.',
    rung: '{label}, {distance}',
    home: 'The Earth',
    trip: 'A trip has the camera. Its own buttons are on screen.',
  },

  // ui/headset.js: the button, the note before entering, and the panel inside the headset.
  headset: {
    enter: 'Enter headset',
    enterTitle: 'Stand under the sky or ride the distance ladder in a VR headset',
    noteTitle: 'Before you put it on',
    comfort: 'Moves are jumps, not glides, and turns are steps of 30 degrees, so the horizon stays level. Sit down, or clear the space around you.',
    seizure: 'A small number of people have seizures from flashing lights or patterns. If you feel dizzy or sick, or see anything strange, stop and take the headset off.',
    how: 'Look at something and press A or the right trigger to choose it. X goes there, B goes back, Y shows the controls, as on a gamepad. Inside a Moment, A plays and pauses and B goes back to the map. Hold B for a second to leave.',
    untried: 'New, and not yet tried on a real headset: tell us what you see.',
    go: 'Enter',
    cancel: 'Not now',
    busy: 'Close the imagined world, Dome and 360 or the recording first: each draws its own picture.',
    failed: 'The headset did not start.',
    left: 'Back on the screen.',
    panelHelp: 'A choose   X go   B back   Y controls',
    panelMove: 'Left stick: around, and along the ladder   Right stick: turn, step in and out',
    panelLeave: 'Hold B to leave',
    chosen: 'Chosen: {name}',
    nothing: 'Nothing straight ahead',
    momentHelp: 'A play or pause   B back to the map   Y controls',
    frame: 'Frame {ms} ms, {fps} a second (the aim is 72)',
    lighter: 'Frames ran long: drawing less to keep up.',
  },
});

// The sections this file added, in the visitor's language when a translation has them (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
