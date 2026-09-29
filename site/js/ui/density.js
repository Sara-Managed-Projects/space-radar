// ui/density.js -- two densities, Regular and Compact (spec 0045 req 10).
//
// Contract: createDensity({ storage, root, matchMedia }) -> { choice(), compact(), set(choice), onChange(f), destroy() }
//           densityPanel(density) -> HTMLElement      the settings row at the foot of the controls
//           readDensity(storage), writeDensity(storage, choice), isCompact(choice, short)
//
// Compact is `html.sr-compact`: less padding, shorter panel heads, 13 px rows (ui.css). It is on
// when the visitor chose it, or when they chose nothing (Automatic) and the window is 800 px tall
// or less, where Regular leaves a laptop's controls panel scrolling. Type never shrinks below the
// 13 px floor in either. The choice is `localStorage['sr.density']`; a browser that throws on it
// (Safari's private mode) gets Regular, and the choice still holds for the page.
import { COPY } from '../copy/en.js';

export const DENSITY_KEY = 'sr.density';
export const CHOICES = ['auto', 'regular', 'compact'];
export const SHORT_QUERY = '(max-height: 800px)';
const ROOT_CLASS = 'sr-compact';

/** The stored choice: 'auto' when nothing (or nothing known) is stored, 'regular' when storage throws. */
export function readDensity(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return 'regular';
    const v = s.getItem(DENSITY_KEY);
    return CHOICES.includes(v) ? v : 'auto';
  } catch {
    return 'regular';
  }
}

export function writeDensity(storage, choice) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return false;
    if (choice === 'auto') s.removeItem(DENSITY_KEY);
    else s.setItem(DENSITY_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

export function isCompact(choice, short) {
  return choice === 'compact' || (choice === 'auto' && !!short);
}

export function createDensity(opts = {}) {
  const storage = opts.storage;
  const root = opts.root !== undefined ? opts.root : (typeof document !== 'undefined' ? document.documentElement : null);
  const mm = opts.matchMedia !== undefined ? opts.matchMedia : (typeof matchMedia === 'function' ? matchMedia : null);
  const mq = mm ? mm(SHORT_QUERY) : null;
  let choice = readDensity(storage);
  const listeners = new Set();
  const apply = () => {
    const on = isCompact(choice, mq && mq.matches);
    if (root && root.classList) root.classList.toggle(ROOT_CLASS, on);
    for (const f of listeners) f(choice, on);
  };
  const onChange = () => apply();
  if (mq && mq.addEventListener) mq.addEventListener('change', onChange);
  apply();
  return {
    choice: () => choice,
    compact: () => isCompact(choice, mq && mq.matches),
    set(next) {
      if (!CHOICES.includes(next)) return;
      choice = next;
      writeDensity(storage, next);
      apply();
    },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    destroy() { if (mq && mq.removeEventListener) mq.removeEventListener('change', onChange); listeners.clear(); },
  };
}

/** The settings row: Regular, Compact, Automatic; the chosen one wears the brackets. */
export function densityPanel(density) {
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-density';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = COPY.density.panelTitle;
  wrap.appendChild(title);
  const row = document.createElement('div');
  row.className = 'sr-density__choices';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', COPY.density.panelTitle);
  const buttons = new Map();
  for (const c of ['regular', 'compact', 'auto']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sr-density__btn';
    b.textContent = COPY.density[c];
    b.addEventListener('click', () => density.set(c));
    buttons.set(c, b);
    row.appendChild(b);
  }
  wrap.appendChild(row);
  const note = document.createElement('p');
  note.className = 'sr-density__note';
  wrap.appendChild(note);
  const paint = (choice, on) => {
    for (const [c, b] of buttons) {
      b.setAttribute('aria-pressed', c === choice ? 'true' : 'false');
      b.classList.toggle('sr-bracketed', c === choice);
    }
    note.textContent = choice === 'auto' ? (on ? COPY.density.autoCompact : COPY.density.autoRegular) : '';
    note.hidden = choice !== 'auto';
  };
  density.onChange(paint);
  paint(density.choice(), density.compact());
  return wrap;
}
