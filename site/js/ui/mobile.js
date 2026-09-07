// Mobile drawers.
//
// The UI modules were built desktop-first: `#sr-controls` and `#sr-status` are always-open panels,
// which on a 375 px phone leaves about 160 px of sky between them. The sky IS the product, so on a
// phone both panels become drawers that slide up from a bottom bar and are closed by default.
//
// This lives in its own file, and adds rather than edits, so `ui/controls.js` and `ui/status.js`
// stay the single description of what those panels contain. It attaches nothing above 600 px.

const PHONE = '(max-width: 600px)';

export function createMobileUI() {
  const mq = window.matchMedia(PHONE);
  let bar = null;
  let openId = null;

  const PANELS = [
    { id: 'sr-controls', label: 'Layers' },
    { id: 'sr-status', label: 'Sources' },
  ];

  function panel(id) {
    return document.getElementById(id);
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
    bar.setAttribute('aria-label', 'Panels');
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
    setOpen(null);
  }

  function detach() {
    if (bar) { bar.remove(); bar = null; }
    document.documentElement.classList.remove('sr-phone');
    for (const p of PANELS) {
      const el = panel(p.id);
      if (el) el.classList.remove('sr-drawer-open');
    }
    openId = null;
  }

  const apply = () => (mq.matches ? attach() : detach());
  apply();
  mq.addEventListener('change', apply);

  // Opening a card on a phone should get the drawers out of the way -- two overlapping sheets is
  // the thing that makes a phone UI feel broken.
  window.addEventListener('sr:select', (e) => {
    if (mq.matches && e.detail) setOpen(null);
  });

  return { setOpen, close: () => setOpen(null), get isPhone() { return mq.matches; } };
}
