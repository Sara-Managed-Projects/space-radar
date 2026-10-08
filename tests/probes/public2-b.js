// public2-b.js -- the interface half of the "remaining public issues" package (public #287, #271,
// #395, #450). After look-common.js; the same probe at 1440x900 and at 390x844 --mobile.
const dist = () => Math.round(ctx.cameraRig.state.distance * 10) / 10;
const q = (sel) => document.querySelector(sel);
const text = (sel) => { const n = q(sel); return n ? n.textContent.trim() : null; };
out.before = { webdriver: navigator.webdriver === true, played: localStorage.getItem('sr:opening'), live: ctx.opening.live, home: dist() };
// --- the opening shot, played on request (an automated browser never gets it by itself) ---------
const lines = [];
const sample = (tag) => lines.push({ tag, at: Date.now() - s0, dist: dist(), line: text('.sr-opening__line'), on: document.documentElement.classList.contains('sr-opening-on'), buttons: document.querySelectorAll('.sr-opening button').length });
let s0 = Date.now();
ctx.opening.play();
await wait(350); sample('start'); await window.cdpShot('opening-1-start'); out.shots.push('opening-1-start');
await wait(1800); sample('early'); await window.cdpShot('opening-2-early'); out.shots.push('opening-2-early');
await wait(1800); sample('mid'); await window.cdpShot('opening-3-mid'); out.shots.push('opening-3-mid');
await wait(1500); sample('late'); await window.cdpShot('opening-4-late'); out.shots.push('opening-4-late');
out.ended = await until(() => !ctx.opening.live, 15000, 100);
sample('end'); out.shotMs = Date.now() - s0;
await window.cdpShot('opening-5-end'); out.shots.push('opening-5-end');
// Skipped by a key: the home view at once, and nothing of it left.
ctx.opening.play(); await wait(1200);
const far = dist();
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
out.skipKey = { far, after: dist(), live: ctx.opening.live, overlay: !!q('.sr-opening'), on: document.documentElement.classList.contains('sr-opening-on') };
// Skipped by the wheel.
ctx.opening.play(); await wait(900);
window.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true }));
out.skipWheel = { after: dist(), live: ctx.opening.live, overlay: !!q('.sr-opening') };
// A press on "Look around": the camera lands, the words go, the welcome is counted as seen.
localStorage.removeItem('sr:welcome');
ctx.opening.play();
out.buttonsCame = await until(() => q('.sr-opening:not([hidden]) .sr-welcome__look'), 6000, 100);
const look = q('.sr-opening .sr-welcome__look');
if (look) {
  const r = look.getBoundingClientRect(); const go = q('.sr-opening .sr-welcome__go').getBoundingClientRect();
  out.buttonBox = { look: [Math.round(r.width), Math.round(r.height)], go: [Math.round(go.width), Math.round(go.height)], lineSize: getComputedStyle(q('.sr-opening__line')).fontSize };
  look.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  out.afterDown = { dist: dist(), live: ctx.opening.live, overlay: !!q('.sr-opening') };
  look.click();
  out.afterLook = { live: ctx.opening.live, overlay: !!q('.sr-opening'), welcomeSeen: localStorage.getItem('sr:welcome') };
}
out.opening = lines;
await wait(800);
// --- the Stars tab's switch, and the green marks it brings (public #271) -----------------------
ctx.explore.setTab('stars');
await until(() => ctx.stage.worldId === 'stellar' || ctx.stage.worldId !== 'earth', 15000);
await until(() => ctx.stars3d && ctx.stars3d.count() > 100000, 40000);
await until(() => ctx.laterLayersLoaded && ctx.laterLayersLoaded(), 30000);
const sw = q('[data-layer="exoplanets"]');
if (sw) sw.scrollIntoView({ block: 'center' });
out.exoSwitch = sw ? { text: sw.textContent.trim(), pressed: sw.getAttribute('aria-pressed'), h: Math.round(sw.getBoundingClientRect().height) } : null;
await shot('stars-tab-calm', 3500);
if (sw) { sw.click(); await wait(600); out.exoOn = { layer: ctx.isLayerOn('exoplanets'), text: sw.textContent.trim(), pressed: sw.getAttribute('aria-pressed') }; await shot('stars-tab-marks-on', 3500); sw.click(); await wait(300); out.exoOff = ctx.isLayerOn('exoplanets'); }
// --- What to show: the row's sentence ----------------------------------------------------------
const showBtn = q('.sr-rail__btn--show');
if (showBtn) {
  showBtn.click();
  await until(() => q('#sr-show-hint-exoplanets'), 8000);
  const hint = q('#sr-show-hint-exoplanets');
  if (hint) {
    const head = hint.closest('.sr-show__group').querySelector('.sr-show__head');
    if (head.getAttribute('aria-expanded') !== 'true') head.click();
    await wait(300);
    hint.scrollIntoView({ block: 'center' });
    const r = hint.getBoundingClientRect();
    out.hint = { text: hint.textContent, hidden: hint.hidden, lines: Math.round(r.height / parseFloat(getComputedStyle(hint).lineHeight)), w: Math.round(r.width) };
    await shot('show-hint', 1200);
  } else out.errors.push('no hint row');
  showBtn.click();
}
// --- home: this week's story (public #450) ------------------------------------------------------
ctx.explore.setTab('earth');
await until(() => ctx.stage.worldId === 'earth', 15000);
out.storyCame = await until(() => q('.sr-story') && !q('.sr-story').hidden, 45000, 300);
const story = q('.sr-story');
if (story && !story.hidden) {
  try { const sheet = ctx.shell.sheet && ctx.shell.sheet(); if (sheet && sheet.set) sheet.set('full'); } catch { /* a desktop */ }
  await wait(500);
  story.scrollIntoView({ block: 'center' });
  out.story = { rule: story.dataset.rule, parts: [...story.children].map((c) => c.textContent), title: story.title };
  await shot('story-card', 1500);
}
// --- a card: Remind me, Seen it; then the passport (public #395) --------------------------------
try {
  const place = { name: 'Cairo', latDeg: 30.04, lonDeg: 31.24, latRad: 30.04 * DEG, lonRad: 31.24 * DEG, altKm: 0, source: 'manual' };
  ctx.setObserver(place);
  await until(() => ctx.explore.next.items().some((it) => it.kind === 'pass' && it.record && it.record.id === 'sat-25544'), 30000, 500);
  out.issPass = ctx.explore.next.items().filter((it) => it.kind === 'pass' && it.record && it.record.id === 'sat-25544').length;
  await goTo('sat-25544', 25000);
  await until(() => q('.sr-card__sky [data-action="seen"]'), 15000);
  const row = q('.sr-card__sky');
  if (row) {
    row.scrollIntoView({ block: 'center' });
    await wait(600);
    const seen = q('.sr-card__sky [data-action="seen"]');
    const remind = q('.sr-card__sky [data-action="remind"]');
    out.cardButtons = { seen: seen && seen.textContent, remind: remind && remind.textContent, remindTitle: remind && remind.title, seenH: seen && Math.round(seen.getBoundingClientRect().height) };
    await shot('card-buttons', 1200);
    if (seen) { seen.click(); await wait(400); out.seenAfter = { text: seen.textContent, pressed: seen.getAttribute('aria-pressed'), stored: Object.keys(JSON.parse(localStorage.getItem('sr:passport') || '{}').seen || {}) }; await shot('card-seen', 800); }
  } else out.errors.push('no sky row on the card');
  // "Remind me": the card of the first dated thing in Coming up (a launch, a close approach).
  const dated = ctx.explore.next.items().find((it) => it.record && Number.isFinite(it.tMs) && it.tMs > Date.now() && it.record.id !== 'sat-25544');
  out.dated = dated ? { kind: dated.kind, id: dated.record.id } : null;
  if (dated) {
    ctx.select(dated.record, { fly: false });
    await until(() => q('.sr-card__sky [data-action="remind"]'), 12000);
    const r = q('.sr-card__sky [data-action="remind"]');
    if (r) { r.scrollIntoView({ block: 'center' }); await wait(700); out.remind = { text: r.textContent, title: r.title, h: Math.round(r.getBoundingClientRect().height) }; await shot('card-remind', 1200); } else out.remind = null;
  }
  if (ctx.passport) { ctx.passport.open(); await wait(900); const s = [...document.querySelectorAll('.sr-passport__sect')].find((n) => /seen/i.test(n.textContent)); if (s) s.scrollIntoView({ block: 'center' }); await shot('passport-seen', 1200); out.passport = s ? s.textContent.slice(0, 120) : null; }
} catch (err) { out.errors.push('card: ' + String(err && err.message)); }
out.msB = Date.now() - t0;
if (typeof sceneChecks === 'function') await sceneChecks();
out.ms = Date.now() - t0;
return out;
