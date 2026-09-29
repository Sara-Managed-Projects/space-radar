// ui/printcard.js -- the postcard camera: the button beside the eye and its JPEG / PDF menu.
//
// Contract: createPrintButton(ctx) -> { open(), close(), save(format, opts) }
//
// WHY. Ivan, 2026-09-28: "postcards of space on click, where current screen will be as postcard
// which is possible to print then (could be downloaded in PDF or JPEG)". The picture itself (size,
// caption, tag, JPEG and PDF) is ui/printcompose.js, imported on the first save: 20 kB a visitor
// who never prints does not download (2026-09-29, when the four tracking features took a first
// visit 6 861 B over registry/budgets.yaml first_visit_bytes).

import { COPY } from '../copy/en.js';
import { toast } from './share.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createPrintButton(ctx) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sr-print-toggle sr-over-clean';
  button.setAttribute('aria-label', COPY.print.button);
  button.title = COPY.print.button;
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  // A camera, ours: body, lens and the viewfinder bump. 24-unit box, stroked.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3 8h4l2-3h6l2 3h4v11H3Z M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  button.appendChild(svg);

  const menu = document.createElement('div');
  // `sr-float`: the instrument's panel chrome (spec 0045), as every other floating panel.
  menu.className = 'sr-print-menu sr-float sr-over-clean';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const item = (label, format) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.textContent = label;
    b.addEventListener('click', () => { close(); save(format, { withTag: tagBox.checked }); });
    menu.appendChild(b);
    return b;
  };
  const note = document.createElement('p');
  note.className = 'sr-print-menu__note';
  note.textContent = COPY.print.note;
  menu.appendChild(note);
  // Spec 0047 req 11: the selection's brackets and tag on the picture, off by default.
  const tagRow = document.createElement('label');
  tagRow.className = 'sr-print-menu__tag';
  const tagBox = document.createElement('input');
  tagBox.type = 'checkbox';
  tagBox.checked = false;
  tagRow.appendChild(tagBox);
  const tagWords = document.createElement('span');
  tagWords.textContent = COPY.print.withTag;
  tagRow.appendChild(tagWords);
  menu.appendChild(tagRow);
  const first = item(COPY.print.jpeg, 'jpeg');
  item(COPY.print.pdf, 'pdf');

  function open() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    first.focus();
  }
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => (menu.hidden ? open() : close()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); close(); button.focus(); } }, true);
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(); });

  let busy = false;
  async function save(format, opts = {}) {
    if (busy) return null;
    busy = true;
    toast(COPY.print.making, 0);
    try {
      const { makePostcard } = await import('./printcompose.js');
      const { out } = await makePostcard(ctx, format, opts);
      toast(COPY.print.saved);
      if (ctx) ctx.lastPrint = out;
      return out;
    } catch (e) {
      toast(COPY.print.failed);
      if (ctx) ctx.lastPrint = { error: String((e && e.message) || e) };
      return null;
    } finally {
      busy = false;
    }
  }

  document.body.appendChild(button);
  document.body.appendChild(menu);
  const api = { open, close, save };
  if (ctx) ctx.printCard = api;
  return api;
}
