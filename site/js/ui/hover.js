// ui/hover.js -- what is under the mouse, said before the click (mouse only).
//
// Contract: createHover({ canvas, decideAt(x, y), nameOf(record), busy() }) -> { move(event), clear(), lastMs }.
//
// It asks the SAME question a click asks (main.js decisionAt, scene/pickrank.js), so what is named is
// what a click opens: the cursor turns to a pointer and a small name follows it, in the scene labels'
// own style. It runs at most once a frame and at most every 50 ms, and not while the mouse is down
// (dragging the camera) or the camera is flying (`busy`), because both are about something else.
// Loaded the first time a mouse moves over the map; a phone never loads it.

const EVERY_MS = 50;

export function createHover({ canvas, decideAt, nameOf, busy }) {
  const host = document.getElementById('labels') || document.body;
  const tag = document.createElement('div');
  tag.className = 'label sr-hover-tag';
  tag.hidden = true;
  const text = document.createElement('span');
  text.className = 'label__text';
  tag.appendChild(text);
  host.appendChild(tag);

  let last = null; // the latest mouse event, kept for the next scan
  let ranAt = -Infinity;
  let queued = false;
  let shownFor = null;
  const api = { move, clear, lastMs: 0 };

  function clear() {
    last = null;
    shownFor = null;
    tag.hidden = true;
    canvas.style.cursor = '';
  }

  function move(e) {
    if (e.buttons || busy()) { clear(); return; }
    last = { x: e.clientX, y: e.clientY };
    // The tag follows the pointer every move; the scan behind it only every EVERY_MS.
    if (!tag.hidden) tag.style.transform = `translate(${last.x + 14}px, ${last.y + 12}px)`;
    if (!queued) { queued = true; requestAnimationFrame(scan); }
  }

  function scan() {
    queued = false;
    if (!last) return;
    const now = performance.now();
    if (now - ranAt < EVERY_MS) { queued = true; requestAnimationFrame(scan); return; }
    ranAt = now;
    if (busy()) { clear(); return; }
    const d = decideAt(last.x, last.y);
    api.lastMs = performance.now() - now;
    const rec = d && d.winner;
    if (!rec) { shownFor = null; tag.hidden = true; canvas.style.cursor = ''; return; }
    canvas.style.cursor = 'pointer';
    if (shownFor !== rec) {
      shownFor = rec;
      text.textContent = nameOf(rec) || '';
    }
    tag.hidden = !text.textContent;
    tag.style.transform = `translate(${last.x + 14}px, ${last.y + 12}px)`;
  }

  return api;
}
