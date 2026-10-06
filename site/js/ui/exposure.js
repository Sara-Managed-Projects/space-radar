// ui/exposure.js -- the shutter's control: Eye, Camera, Deep (spec 0067 task 3).
//
// Contract: exposurePanel(exposure) -> HTMLElement    a settings row; `exposure` is scene/exposure.js
//           pictureNote(row) -> HTMLElement            what a nebula's picture is, with its credit
//
// One small row of three, in two places that already exist (docs/ui-guide.md principle 2, "one
// place for everything"): the foot of What to show, beside Density, and the "About it" of a
// deep-sky object that has a photograph. The row is ui/density.js's row, class for class -- three
// buttons, the chosen one pressed and bracketed, one line under them -- so it brings no new CSS and
// no new look. The line under it says what the chosen exposure is: that sentence is spec 0067
// req 4's "cameras collect light for minutes", said where the choice is made and every time.
//
// The state is scene/exposure.js's; every panel built from it repaints when any of them is
// pressed, because both listen to the same object.
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { EXPOSURES } from '../scene/exposure.js';

/** The settings row: Eye, Camera, Deep; the chosen one wears the brackets. */
export function exposurePanel(exposure) {
  const C = COPY.exposure;
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-density sr-exposure';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = C.panelTitle;
  wrap.appendChild(title);
  const row = document.createElement('div');
  row.className = 'sr-density__choices';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', C.panelTitle);
  const buttons = new Map();
  for (const mode of EXPOSURES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sr-density__btn';
    b.textContent = C.modes[mode];
    b.title = C.notes[mode];
    b.dataset.exposure = mode;
    b.addEventListener('click', () => exposure.set(mode));
    buttons.set(mode, b);
    row.appendChild(b);
  }
  wrap.appendChild(row);
  const note = document.createElement('p');
  note.className = 'sr-density__note';
  wrap.appendChild(note);
  const paint = (mode) => {
    for (const [m, b] of buttons) {
      b.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
      b.classList.toggle('sr-bracketed', m === mode);
    }
    note.textContent = C.notes[mode] || '';
  };
  const off = exposure.onChange(paint);
  paint(exposure.mode());
  wrap.destroy = off;
  return wrap;
}

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));

/**
 * What the picture of this object is (registry/nebulae.yaml through data/nebulae.js): how its
 * colours were made, in one or two sentences, and whose picture it is. The credit is visible and
 * links to the archive's page, which is what CC BY 4.0 and the three archives' terms ask for
 * ("clear and visible", "links should be active if the credit is online").
 */
export function pictureNote(row) {
  const C = COPY.exposure;
  const wrap = document.createElement('div');
  wrap.className = 'sr-card__picture';
  const why = document.createElement('p');
  why.className = 'sr-card__note';
  why.textContent = [C.real, fill(C.colours[row.colours] || C.colours.unstated, { filters: row.filters || '' })].join(' ');
  wrap.appendChild(why);
  const credit = document.createElement('p');
  credit.className = 'sr-card__photo-credit';
  credit.appendChild(document.createTextNode(C.creditLead));
  const a = document.createElement('a');
  a.href = row.page;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = row.credit;
  credit.appendChild(a);
  credit.appendChild(document.createTextNode(fill(C.creditTail, { licence: row.licence })));
  wrap.appendChild(credit);
  return wrap;
}
