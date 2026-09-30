// Mobile drawers.
//
// Contract: createMobileUI(ctx) -> { setOpen(view), close(), isPhone }
//
// On a phone the sidebar (ui/shell.js #sr-side) is a drawer that slides up from a bottom bar and is
// closed by default: the sky IS the product, and a 360 px column on a 390 px screen would leave none
// of it. The bar has two buttons, Explore and Sources; each opens the one drawer on its view. Spec
// 0061 task 3 replaces this with a bottom sheet of three heights; until then this is today's phone
// layout, re-pointed from the two old panels (#sr-controls, #sr-status) at the sidebar's views.
//
// This lives in its own file, and adds rather than edits, so ui/shell.js stays the single
// description of the layout's boxes. It attaches nothing at 900 px and wider, where the sidebar is
// always open (the same line as the shell's DESKTOP_QUERY).

import { COPY, t } from '../copy/en.js';
import { soundButton } from './sound.js';

const PHONE = '(max-width: 899.98px)';
const SIDE_ID = 'sr-side';

export function createMobileUI(ctx) {
  const mq = window.matchMedia(PHONE);
  let bar = null;
  let head = null;
  let openId = null;
  let mute = null;

  const PANELS = [
    { id: 'home', label: COPY.mobile.controls },
    { id: 'sources', label: COPY.mobile.sources },
  ];
  // The old panel ids, from a caller written before spec 0061 (ui/scenenote.js's "why" link).
  const ALIAS = { 'sr-controls': 'home', 'sr-status': 'sources' };

  const side = () => document.getElementById(SIDE_ID);

  /**
   * The sticky Close row.
   *
   * THE BUG THIS EXISTS FOR: an open drawer is 503 of 812 px and sits at z-index 45, over the bar at
   * 40 that opened it, so the bar is not hit-testable (measured: a tap at the centre of the bar's
   * button landed on a layer checkbox and turned it off while the drawer stayed open). STICKY, not
   * merely first: a Close that scrolls away is a Close you cannot reach from the bottom of the list.
   * Focus goes back to the bar button that opened the drawer -- the disclosure pattern.
   */
  function buildHead() {
    const el = side();
    if (!el || head) return;
    head = document.createElement('div');
    head.className = 'sr-drawer__head';
    const title = document.createElement('span');
    title.className = 'sr-drawer__title';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sr-drawer__close';
    close.textContent = COPY.mobile.close;
    close.addEventListener('click', () => {
      const was = openId;
      setOpen(null);
      const btn = bar && bar.querySelector('button[data-panel="' + was + '"]');
      if (btn) btn.focus();
    });
    head.appendChild(title);
    head.appendChild(close);
    el.prepend(head);
  }

  function paintHead() {
    if (!head) return;
    const p = PANELS.find((x) => x.id === openId);
    head.querySelector('.sr-drawer__title').textContent = p ? p.label : '';
    const close = head.querySelector('.sr-drawer__close');
    close.title = t(COPY.mobile.closeTitle, { panel: p ? p.label : '' });
  }

  function setOpen(id) {
    const want = ALIAS[id] || id;
    openId = openId === want ? null : want;
    const el = side();
    if (el) el.classList.toggle('sr-drawer-open', !!openId);
    if (openId && ctx && ctx.shell) ctx.shell.show(openId);
    paintHead();
    if (bar) {
      for (const btn of bar.querySelectorAll('button[data-panel]')) {
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
    buildHead();
    setOpen(null);
    placeMute();
  }

  /**
   * A THIRD BUTTON, ONLY FOR A VISITOR WHO ASKED FOR SOUND (spec 0035 design §5). The bar is two
   * buttons across a 375 px phone; a speaker nobody asked for would take a third of it from
   * everybody. It appears once the stored choice is "on" and stays for the visit.
   */
  function placeMute() {
    const audio = ctx && ctx.audio;
    if (!bar || mute || !audio || !(audio.isOn() || audio.context)) return;
    mute = soundButton(ctx, 'sr-mobilebar__sound', 'mute');
    bar.appendChild(mute);
  }
  if (ctx && ctx.audio) ctx.audio.onChange(placeMute);

  function detach() {
    if (bar) { bar.remove(); bar = null; mute = null; }
    document.documentElement.classList.remove('sr-phone');
    const el = side();
    if (el) el.classList.remove('sr-drawer-open');
    // The head goes with the bar: at 900 px and wider the sidebar is always open, and a Close with
    // nothing left to reopen it is a trap, not a control.
    if (head) { head.remove(); head = null; }
    openId = null;
  }

  const apply = () => (mq.matches ? attach() : detach());
  apply();
  mq.addEventListener('change', apply);

  // Opening a card on a phone gets the drawer out of the way, and so does tapping empty sky
  // (main.js deselect() fires this with a null detail): one sheet obeying a verb the other ignores
  // was itself the bug. main.js already tells a camera drag from a tap.
  window.addEventListener('sr:select', () => {
    if (mq.matches) { openId = null; setOpen(null); }
  });

  // Escape is this app's "dismiss the top layer"; guarded on openId so it never swallows one it did
  // not need.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mq.matches && openId) { openId = null; setOpen(null); }
  });

  return { setOpen, close: () => { openId = null; setOpen(null); }, get isPhone() { return mq.matches; } };
}
