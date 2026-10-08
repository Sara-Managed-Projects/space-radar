// ui/opening.js -- the words and the two ways in over a first visit's opening shot (public #287).
//
// Contract: createOpening(ctx, { done, hold, win }) -> { root, remove(), lines() }
// Also exported, pure, for tests/test_opening.mjs:
//   ROTATE_MS, TRIP_WAIT_MS, lineAt(lines, tick), uniqueLines(made, max)
//
// WHY. A first visit's camera comes in from past the Moon's path to the home view in eight seconds
// (scene/framing.js openingPlan; main.js flies it and owns every way out of it). Over that shot,
// and only for as long as it lasts: one true sentence at a time, and the two buttons the home's
// first-visit section also has (ui/welcome.js): Guided trip, Look around.
//
// THE SENTENCE IS THE HOME'S (ui/sentence.js): the same candidates from the same loaded data,
// one clause at a time, changed every ROTATE_MS and worked out again at each change, so a headcount
// that lands half way through joins the turn. The Moon's is astronomy and is there from the first
// frame; with one line there is nothing to rotate, and with none the line is absent. Nothing here
// is typed.
//
// NOT A PANEL: a lead line and two buttons on the scene, no glass. It never takes the focus, and
// it is not a modal: any key, press, wheel or touch that is not on one of its buttons ends the
// shot and removes it (main.js), after which the home's own first-visit section offers the same
// two buttons. A press on either button here counts as that section seen.
//
// Fetched by main.js only when the opening plays: never for a returning visitor, a link to
// somewhere, an embed, reduced motion or an automated browser.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { icon } from './icons.js';

/** How long one sentence stays. Three of them fit the shot. */
export const ROTATE_MS = 2600;
/** How long "Guided trip" waits for the home's first trip to be ready before giving up. */
export const TRIP_WAIT_MS = 8000;
const WELCOME_KEY = 'sr:welcome';

/** The line on screen at a tick of the rotation, or null. Pure. */
export function lineAt(lines, tick) {
  const list = Array.isArray(lines) ? lines.filter((l) => l && l.text) : [];
  if (!list.length) return null;
  return list[((Math.floor(tick) % list.length) + list.length) % list.length];
}

/** Composed sentences -> the lines to turn through: no text twice, `max` at most. Pure. */
export function uniqueLines(made, max = 4) {
  const out = [];
  for (const m of Array.isArray(made) ? made : []) {
    if (!m || !m.text || out.some((o) => o.text === m.text)) continue;
    out.push({ text: m.text, source: (m.sources && m.sources[0]) || '' });
    if (out.length >= max) break;
  }
  return out;
}

export function createOpening(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.opening;
  const W = COPY.welcome;
  const root = doc.createElement('div');
  root.className = 'sr-opening';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', C.label);
  root.hidden = true; // until its rules have come: never unstyled over the shot
  const line = doc.createElement('p');
  line.className = 'sr-opening__line';
  line.setAttribute('aria-live', 'polite');
  const row = doc.createElement('div');
  row.className = 'sr-opening__actions';
  const mk = (cls, name, label, title) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `sr-welcome__btn ${cls}`;
    b.title = title;
    b.appendChild(icon(name, 16));
    b.appendChild(doc.createTextNode(label));
    return b;
  };
  const go = mk('sr-welcome__go sr-opening__go', 'play', W.trip, W.tripTitle);
  const look = mk('sr-welcome__look', 'compass', W.look, W.lookTitle);
  row.append(go, look);
  const skip = doc.createElement('p');
  skip.className = 'sr-opening__skip';
  skip.textContent = C.skip;
  root.append(line, row, skip);
  doc.body.appendChild(root);

  let gone = false;
  let tick = 0;
  let lines = [];
  let sentence = null;
  let timer = 0;
  let waiting = 0;

  function paint() {
    if (gone || waiting) return;
    if (sentence) {
      try { lines = uniqueLines(sentence.linesNow(ctx)); } catch { lines = []; }
    }
    const now = lineAt(lines, tick);
    line.hidden = !now;
    if (now && line.textContent !== now.text) {
      line.textContent = now.text;
      line.title = now.source ? `${C.from} ${now.source}` : '';
    }
  }
  loadCss('finishers', doc).then(() => { if (!gone) root.hidden = false; });
  import('./sentence.js').then((m) => { sentence = m; paint(); }).catch(() => { /* no sentence: the buttons alone */ });
  timer = win.setInterval(() => { tick += 1; paint(); }, ROTATE_MS);

  const seen = () => { try { win.localStorage.setItem(WELCOME_KEY, '1'); } catch { /* no memory */ } };
  const done = (why) => { if (typeof opts.done === 'function') opts.done(why); };

  const firstCard = () => {
    const pane = doc.getElementById('sr-pane-earth');
    return pane ? [...pane.querySelectorAll('.sr-tripcard')].find((c) => c.dataset.trip && !c.classList.contains('is-off')) || null : null;
  };
  go.addEventListener('click', () => {
    if (waiting) return;
    seen();
    const start = (card) => { win.clearInterval(waiting); waiting = 0; done('trip'); if (card) card.click(); };
    const card = firstCard();
    if (card) { start(card); return; }
    // The trips are still being planned (a slow first load): say so, and start it when one can run.
    if (typeof opts.hold === 'function') opts.hold(TRIP_WAIT_MS + 500);
    const since = Date.now();
    line.hidden = false;
    line.textContent = C.wait;
    go.disabled = true;
    waiting = win.setInterval(() => {
      const c = firstCard();
      if (c || Date.now() - since > TRIP_WAIT_MS) start(c);
    }, 250);
  });
  look.addEventListener('click', () => { seen(); done('look'); });

  return {
    root,
    lines: () => lines.slice(),
    remove() {
      if (gone) return;
      gone = true;
      win.clearInterval(timer);
      if (waiting) win.clearInterval(waiting);
      root.remove();
    },
  };
}
