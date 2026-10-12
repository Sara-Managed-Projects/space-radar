// ui/exposure.js -- the shutter's control: Eye, Camera, Deep (spec 0067 task 3).
//
// Contract: exposurePanel(exposure) -> HTMLElement    a settings row; `exposure` is scene/exposure.js
//           pictureNote(row) -> HTMLElement            what a nebula's picture is, with its credit
//           pictureFigure(row, name) -> HTMLElement    the photograph itself, with its caption (internal #167)
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
import { COPY, fmt } from '../copy/en.js';
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
  // A picture of part of its object says which part (registry/nebulae.yaml `part:`, 2026-10-06).
  why.textContent = [C.real, fill(C.colours[row.colours] || C.colours.unstated, { filters: row.filters || '' }), row.part ? fill(C.part, { part: row.part }) : ''].filter(Boolean).join(' ');
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

/**
 * THE PHOTOGRAPH ON ITS OWN CARD (internal #167, spec 0058 task 3). The same licensed file the sky
 * wears (registry/nebulae.yaml, one row per object), as a figure in "About it": the picture, and a
 * caption that says whose sky it is and how much of it, from the row's own measured width and
 * height. The credit and the licence follow in pictureNote(), which is the archives' wording with
 * its link. `loading="lazy"`: the row sits in a section that opens in place, and a browser asks for
 * the file when that section is opened, never at boot (tests/test_first_visit_bytes.mjs refuses a
 * nebula picture on a first visit). The size is written on the element so the card does not jump
 * when the picture lands.
 */
export function pictureFigure(row, name) {
  const C = COPY.exposure;
  const arc = (n) => (Number.isFinite(n) ? fmt.num(n, n >= 10 ? 0 : 1) : '');
  const figure = document.createElement('figure');
  figure.className = 'sr-card__figure';
  const img = document.createElement('img');
  img.className = 'sr-card__photo';
  img.src = String(row.file || '').replace(/^site\//, '');
  img.alt = fill(C.figureAlt, { name });
  img.loading = 'lazy';
  img.decoding = 'async';
  const w = Number(row.width_arcmin);
  const h = Number(row.height_arcmin);
  if (w > 0 && h > 0) {
    // The baked file's longer side is `px` (512 unless the row says); the other follows the sky.
    const long = 640;
    img.width = w >= h ? long : Math.round((long * w) / h);
    img.height = w >= h ? Math.round((long * h) / w) : long;
  }
  figure.appendChild(img);
  const cap = document.createElement('figcaption');
  cap.className = 'sr-card__photo-credit';
  cap.textContent = fill(C.figureCaption, { name, w: arc(w), h: arc(h) });
  figure.appendChild(cap);
  return figure;
}
