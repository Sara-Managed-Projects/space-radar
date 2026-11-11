// ui-system: the control set in the app (2026-11-11, the journal's design in the map), one walk with a picture of each
// place the brief names: the rail (twice, 1.8 s apart: the Games glow breathes), the left panel's head, What to show (its
// top and its foot, where the segmented choices are), Share, Record, Dome and 360, Find, a card with its actions and the
// email updates popover; on a phone the More menu too. On a ref from before the control set each state is photographed as
// it is, the BEFORE. Run after the prelude: `cat _prelude.js ui-system.js > /tmp/p.js; node tools/cdp.mjs <url> /tmp/p.js
// --shot-dir=<dir> --block=celestrak.org [--mobile --width=390 --height=844]`.
look.probe = 'ui-system';
const out = { took: [] };
const phone = document.documentElement.classList.contains('sr-phone');
const settle = (ms = 1500) => sleep(ms);
const visible = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && e.getClientRects().length > 0; };
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const snap = async (name) => { await shot(name); out.took.push(name); };
const scrollAll = (root, to) => { for (const e of root ? root.querySelectorAll('*') : []) if (e.scrollHeight > e.clientHeight + 4) e.scrollTop = to; };

// a first visit's welcome is a place too; then out of the way
if (document.querySelector('.sr-welcome')) { await settle(800); await snap('welcome'); }
const away = document.querySelector('[data-entrance="explore"]') || document.querySelector('.sr-welcome .ui-btn, .sr-welcome button');
if (away) away.click();
await settle(1500);

// the rail and the head, twice
// the breath's two ends, held still for the picture (a screenshot in software takes longer than the breath)
const breath = () => document.getAnimations().find((a) => a.animationName === 'sr-games-breathe');
const hold = (ms) => { const a = breath(); if (a) { a.pause(); a.currentTime = ms; } return !!a; };
out.breath = hold(0);
await snap('rail-a');
hold(3600);
await snap('rail-b');
const b0 = breath(); if (b0) b0.play();

// What to show, top and foot
if (sr.rail && sr.rail.openShow) sr.rail.openShow();
await until(() => visible('.sr-show'), 20000);
await settle(2000);
await snap('whattoshow-top');
scrollAll(document.querySelector('#sr-pop') || document.querySelector('.sr-pop') || document.body, 1e6);
await settle(800);
await snap('whattoshow-foot');
scrollAll(document.querySelector('#sr-pop') || document.querySelector('.sr-pop'), 0);
if (sr.rail && sr.rail.closeShow) sr.rail.closeShow();
await settle(600);

// Share, then Record and Dome from it
if (sr.share && sr.share.open) sr.share.open({});
await until(() => visible('#sr-share'), 20000);
await settle(3500);
await snap('share');
const maker = async (id, sel, name) => {
  if (!visible('#sr-share')) { sr.share.open({}); await until(() => visible('#sr-share'), 20000); await settle(1500); }
  const b = document.querySelector(`#sr-share [data-make="${id}"]`);
  if (!b) { out[name] = 'no button'; return; }
  b.click();
  await until(() => visible(sel), 30000);
  await settle(2000);
  await snap(name);
  const x = document.querySelector(`${sel} .ui-close, ${sel} .sr-make__close`);
  if (x) x.click(); else esc();
  await settle(800);
};
await maker('record', '#sr-record', 'record');
await maker('dome', '#sr-dome', 'dome');
if (sr.share && sr.share.close) sr.share.close();

// Find
if (typeof sr.wantFind === 'function') {
  const f = await sr.wantFind().catch(() => null);
  if (f && f.open) f.open('property');
  await settle(4000);
  await snap('find');
  esc();
  await settle(800);
}

// a card with its actions
location.hash = '#at=moon';
await until(() => visible('.sr-card'), 30000);
await settle(5000);
await snap('card');

// the email updates popover
const sub = document.querySelector('.sr-rail__btn--sub');
if (sub) {
  sub.click();
  await until(() => visible('.sr-subpop') || visible('#sr-sub'), 20000);
  await settle(2000);
  await snap('subscribe');
  esc();
  await settle(600);
}

// the phone's More menu (the rail's folded tools, Games among them)
if (phone) {
  const more = document.querySelector('.sr-rail__btn--more');
  if (more) { more.click(); await settle(1200); await snap('more'); esc(); }
}
return finish(out);
