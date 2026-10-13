// ui/qualitypanel.js -- the quality setting's row in What to show (spec 0073 requirement 6).
//
// Contract: qualityPanel(ctx) -> HTMLElement (with .destroy())      `ctx.quality` is main.js createQuality
//
// One segmented row: Auto, Low, Medium, High, Ultra. A choice this device cannot be given is ABSENT,
// not greyed (scene/quality.js offeredQualities: a phone is offered Auto and Low; Ultra needs a device
// whose own pick allows the top tier), and after the frame latch only Auto and Low are left. While
// Auto is on, a short mono note beside the title says what Auto is wearing now ("Auto: High"), so the
// state of the system is on screen (docs/ui-guide.md principle 6). No sentence in the row: each
// word's tooltip says what it spends.
//
// The row is ui/density.js's, class for class, as the Exposure row is, so it brings no new look; the
// state is main.js's, and the row repaints on `sr:tier`, which every change of tier or choice sends.
// Loaded with What to show, never at boot.
import { COPY } from '../copy/en.js';
import { qualityNote } from '../scene/quality.js';

export function qualityPanel(ctx) {
  const C = COPY.quality;
  const q = ctx.quality;
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-density sr-exposure sr-quality';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = C.panelTitle;
  wrap.appendChild(title);
  const note = document.createElement('p');
  note.className = 'sr-quality__note';
  wrap.appendChild(note);
  const row = document.createElement('div');
  row.className = 'sr-density__choices';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', C.panelTitle);
  wrap.appendChild(row);
  let buttons = new Map();
  let offeredKey = '';
  const paint = () => {
    const offered = q.offered();
    if (offered.join() !== offeredKey) {
      // The latch tripped (or this is the first paint): the row is what the device is offered now.
      const hadFocus = row.contains(document.activeElement);
      offeredKey = offered.join();
      buttons = new Map();
      row.textContent = '';
      for (const choice of offered) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sr-density__btn';
        b.textContent = C.choices[choice];
        b.title = C.titles[choice];
        b.dataset.quality = choice;
        b.addEventListener('click', () => { q.setChoice(choice); paint(); });
        buttons.set(choice, b);
        row.appendChild(b);
      }
      if (hadFocus && buttons.get(q.choice)) buttons.get(q.choice).focus();
    }
    for (const [choice, b] of buttons) {
      b.setAttribute('aria-pressed', choice === q.choice ? 'true' : 'false');
      b.classList.toggle('sr-bracketed', choice === q.choice);
    }
    const words = qualityNote(q.plan(), C);
    note.textContent = words;
    note.hidden = !words;
  };
  window.addEventListener('sr:tier', paint);
  paint();
  wrap.destroy = () => window.removeEventListener('sr:tier', paint);
  return wrap;
}
