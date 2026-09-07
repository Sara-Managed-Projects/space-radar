// Mobile drawers.
//
// The UI modules were built desktop-first: `#sr-controls` and `#sr-status` are always-open panels,
// which on a 375 px phone leaves about 160 px of sky between them. The sky IS the product, so on a
// phone both panels become drawers that slide up from a bottom bar and are closed by default.
//
// This lives in its own file, and adds rather than edits, so `ui/controls.js` and `ui/status.js`
// stay the single description of what those panels contain. It attaches nothing above 600 px.

import { COPY, t } from '../copy/en.js';

const PHONE = '(max-width: 600px)';

export function createMobileUI() {
  const mq = window.matchMedia(PHONE);
  let bar = null;
  let openId = null;

  const PANELS = [
    { id: 'sr-controls', label: COPY.mobile.layers },
    { id: 'sr-status', label: COPY.mobile.sources },
  ];

  function panel(id) {
    return document.getElementById(id);
  }

  /**
   * The sticky Close row.
   *
   * THE BUG THIS EXISTS FOR: an open drawer is 503 of 812 px and sits at z-index 45, over the
   * bar at 40 that opened it. The bar is not merely hard to see behind an 88%-opaque panel -- it
   * is not hit-testable. Measured, a tap at the centre of the "Layers" bar button landed on
   * `SPAN.sr-layer__name` and turned a layer OFF while the drawer stayed open. Scrolling does not
   * rescue it: both are `position: fixed`, so the bar never moves out from under the drawer.
   *
   * STICKY, not merely first. The drawer scrolls 1639 px against a 502 px window; a Close that
   * scrolls away is a Close you cannot reach from the bottom of the sources list.
   *
   * The click calls `setOpen(null)` and NOT `setOpen(p.id)`. The latter happens to work today
   * because setOpen toggles, but it reads as "open this" and would break the moment the toggle
   * goes away. Focus goes back to the bar button that opened the drawer -- the disclosure
   * pattern, and the only visible thing left once the sheet has gone.
   */
  function buildHead(p) {
    const el = panel(p.id);
    if (!el || el.querySelector('.sr-drawer__head')) return;

    const head = document.createElement('div');
    head.className = 'sr-drawer__head';

    const title = document.createElement('span');
    title.className = 'sr-drawer__title';
    title.textContent = p.label;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sr-drawer__close';
    close.textContent = COPY.mobile.close;
    close.title = t(COPY.mobile.closeTitle, { panel: p.label });
    close.addEventListener('click', () => {
      setOpen(null);
      const btn = bar && bar.querySelector('button[data-panel="' + p.id + '"]');
      if (btn) btn.focus();
    });

    head.appendChild(title);
    head.appendChild(close);
    el.prepend(head);
  }

  function setOpen(id) {
    openId = openId === id ? null : id;
    for (const p of PANELS) {
      const el = panel(p.id);
      if (el) el.classList.toggle('sr-drawer-open', openId === p.id);
    }
    if (bar) {
      for (const btn of bar.querySelectorAll('button')) {
        const on = btn.dataset.panel === openId;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-expanded', String(on));
      }
    }
  }

  function attach() {
    if (bar) return;
    bar = document.createElement('nav');
    bar.className = 'sr-mobilebar';
    bar.setAttribute('aria-label', COPY.mobile.barLabel);
    for (const p of PANELS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = p.label;
      btn.dataset.panel = p.id;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => setOpen(p.id));
      bar.appendChild(btn);
    }
    document.body.appendChild(bar);
    document.documentElement.classList.add('sr-phone');
    for (const p of PANELS) buildHead(p);
    setOpen(null);
  }

  function detach() {
    if (bar) { bar.remove(); bar = null; }
    document.documentElement.classList.remove('sr-phone');
    for (const p of PANELS) {
      const el = panel(p.id);
      if (!el) continue;
      el.classList.remove('sr-drawer-open');
      // The head goes with the bar. Above 600 px these panels are always open, and a Close
      // button with nothing left to reopen the panel is a trap, not a control.
      const head = el.querySelector('.sr-drawer__head');
      if (head) head.remove();
    }
    openId = null;
  }

  const apply = () => (mq.matches ? attach() : detach());
  apply();
  mq.addEventListener('change', apply);

  // Opening a card on a phone should get the drawers out of the way -- two overlapping sheets is
  // the thing that makes a phone UI feel broken.
  //
  // AND SO SHOULD TAPPING EMPTY SKY. main.js's deselect() fires this same event with a null
  // detail, and the old `&& e.detail` guard threw exactly that case away -- which is why the
  // drawer ignored a backdrop tap while the card, on the same event, honoured it. One sheet
  // obeying a verb the other ignores is itself the bug. main.js already tells a camera drag from
  // a tap (6 px / 400 ms), so rotating the globe over the sky does not close the drawer.
  window.addEventListener('sr:select', () => {
    if (mq.matches) setOpen(null);
  });

  // Escape is already this app's "dismiss the top layer": ui/cards.js closes the card with it and
  // ui/tripframe.js leaves a trip. A drawer that ignored it was the odd one out. Guarded on
  // `openId` so it never swallows an Escape it did not need, and a card and a drawer are never
  // open together because selecting closes the drawer above.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mq.matches && openId) setOpen(null);
  });

  return { setOpen, close: () => setOpen(null), get isPhone() { return mq.matches; } };
}
