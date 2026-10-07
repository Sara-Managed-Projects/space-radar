// ui/icons.js -- the icons, as one small module (2026-10-07, internal #415 item 5).
//
// They lived in ui/cards.js, and ui/keyhint.js and ui/tripframe.js imported `icon` from there: one
// function that dragged the whole card (188 kB as written) behind the keys hint, five seconds after
// boot, even on a connection that saves data -- where the warm-up deliberately does not run. Here
// they import nothing, and the card imports them like everyone else.
//
//   icon(name, size = 20) -> SVGElement
//
// Lucide (https://lucide.dev, ISC; the Feather-derived ones MIT, Cole Bemis: CREDITS.md),
// drawn the guide's way (docs/ui-guide.md §3.16): the 24 box, stroke 1.75, round caps and joins,
// hidden from a screen reader because the button carries the name. Copied from the icons' own
// files, element for element.

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
  crosshair: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 22, x2: 18, y1: 12, y2: 12 }],
    ['line', { x1: 6, x2: 2, y1: 12, y2: 12 }],
    ['line', { x1: 12, x2: 12, y1: 6, y2: 2 }],
    ['line', { x1: 12, x2: 12, y1: 22, y2: 18 }],
  ],
  orbit: [
    ['path', { d: 'M20.341 6.484A10 10 0 0 1 10.266 21.85' }],
    ['path', { d: 'M3.659 17.516A10 10 0 0 1 13.74 2.152' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
    ['circle', { cx: 19, cy: 5, r: 2 }],
    ['circle', { cx: 5, cy: 19, r: 2 }],
  ],
  camera: [
    ['path', { d: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z' }],
    ['circle', { cx: 12, cy: 13, r: 3 }],
  ],
  // Lucide `share`, the rail's Share too: one action, one mark (spec 0061 task 8).
  share: [
    ['path', { d: 'M12 2v13' }],
    ['path', { d: 'm16 6-4-4-4 4' }],
    ['path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }],
  ],
  chevron: [['path', { d: 'm9 18 6-6-6-6' }]],
  navigation: [['polygon', { points: '3 11 22 2 13 21 11 13 3 11' }]],
  telescope: [
    ['path', { d: 'm10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44' }],
    ['path', { d: 'm13.56 11.747 4.332-.924' }],
    ['path', { d: 'm16 21-3.105-6.21' }],
    ['path', { d: 'M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z' }],
    ['path', { d: 'm6.158 8.633 1.114 4.456' }],
    ['path', { d: 'm8 21 3.105-6.21' }],
    ['circle', { cx: 12, cy: 13, r: 2 }],
  ],
  // The trip's toolbar, intro and end card (spec 0061 task 7, ui/tripframe.js): the same family,
  // so a trip's controls and the card's actions read as one set.
  play: [['polygon', { points: '6 3 20 12 6 21 6 3' }]],
  pause: [
    ['rect', { x: 14, y: 4, width: 4, height: 16, rx: 1 }],
    ['rect', { x: 6, y: 4, width: 4, height: 16, rx: 1 }],
  ],
  'chevron-left': [['path', { d: 'm15 18-6-6 6-6' }]],
  'rotate-ccw': [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  'volume-2': [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }],
    ['path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' }],
  ],
  'volume-x': [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['line', { x1: 22, x2: 16, y1: 9, y2: 15 }],
    ['line', { x1: 16, x2: 22, y1: 9, y2: 15 }],
  ],
  // Lucide `speech`: the trip's Voice toggle (spec 0069). A head speaking, not a microphone: the
  // app talks, it does not listen.
  speech: [
    ['path', { d: 'M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20' }],
    ['path', { d: 'M19.8 17.8a7.5 7.5 0 0 0 .003-10.603' }],
    ['path', { d: 'M17 15a3.5 3.5 0 0 0-.025-4.975' }],
  ],
  'panel-left-close': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M9 3v18' }],
    ['path', { d: 'm16 15-3-3 3-3' }],
  ],
  'panel-left-open': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M9 3v18' }],
    ['path', { d: 'm14 9 3 3-3 3' }],
  ],
  'panel-bottom-close': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 15h18' }],
    ['path', { d: 'm15 8-3 3-3-3' }],
  ],
  'panel-bottom-open': [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 15h18' }],
    ['path', { d: 'm9 10 3-3 3 3' }],
  ],
  compass: [
    ['path', { d: 'm16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z' }],
    ['circle', { cx: 12, cy: 12, r: 10 }],
  ],
  // Present mode (ui/tripframe.js, 2026-10-06): a screen on a stand, the corners of a full
  // screen and of leaving it, a stopwatch for "advance by itself", and a house for the way home.
  presentation: [
    ['path', { d: 'M2 3h20' }],
    ['path', { d: 'M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3' }],
    ['path', { d: 'm7 21 5-5 5 5' }],
  ],
  maximize: [
    ['path', { d: 'M8 3H5a2 2 0 0 0-2 2v3' }],
    ['path', { d: 'M21 8V5a2 2 0 0 0-2-2h-3' }],
    ['path', { d: 'M3 16v3a2 2 0 0 0 2 2h3' }],
    ['path', { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }],
  ],
  minimize: [
    ['path', { d: 'M8 3v3a2 2 0 0 1-2 2H3' }],
    ['path', { d: 'M21 8h-3a2 2 0 0 1-2-2V3' }],
    ['path', { d: 'M3 16h3a2 2 0 0 1 2 2v3' }],
    ['path', { d: 'M16 21v-3a2 2 0 0 1 2-2h3' }],
  ],
  timer: [
    ['line', { x1: 10, x2: 14, y1: 2, y2: 2 }],
    ['line', { x1: 12, x2: 15, y1: 14, y2: 11 }],
    ['circle', { cx: 12, cy: 14, r: 8 }],
  ],
  house: [
    ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }],
    ['path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }],
  ],
};

/** An icon from ICONS at `size` px. Exported for the test, which holds the guide's drawing rules. */
export function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `sr-icon sr-icon--${name}`);
  for (const [tag, attrs] of ICONS[name] || []) {
    const part = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, String(v));
    svg.appendChild(part);
  }
  return svg;
}
