// tour: the onboarding tour (ui/onboarding.js, internal spec 0074), walked by the real actions.
// The first visit's arrow at the rail's button; then each of the eight steps as it comes up; the
// three steps that wait, with what their press opened (the timeline, What to show, the share
// sheet); and the page after the tour, with nothing of it left. Run it at 1440 x 900 and again
// with `-f mobile=true`. Fails when a step never came up, when a caption is off the screen or
// over its own target, or when something of the tour is still on the page at the end.
look.probe = 'tour';
const out = { steps: [], problems: [] };
const tour = sr.onboardingReady ? await sr.onboardingReady() : null;
if (!tour) return finish({ fail: 'the tour did not load (ctx.onboardingReady)' });
const boxOf = (hook) => { const e = [...document.querySelectorAll(`[data-tour~="${hook}"]`)].find((x) => x.getBoundingClientRect().width > 0); return e || null; };
const over = (a, b) => a && b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const judge = (name) => {
  const m = tour.measure();
  if (!m) { out.problems.push(name + ': nothing was built'); return null; }
  const box = m.card || m.chip;
  if (!box) out.problems.push(name + ': no caption on the page');
  else {
    if (box[0] < 8 || box[1] < 8 || box[0] + box[2] > innerWidth - 8 || box[1] + box[3] > innerHeight - 8) out.problems.push(name + ': the caption is off the screen ' + JSON.stringify(box));
    if (m.hole && over(box, m.hole)) out.problems.push(name + ': the caption is over its target ' + JSON.stringify([box, m.hole]));
  }
  return m;
};
/**
 * The ink is drawn on by a transition, and a software renderer at a phone's three pixels a pixel
 * starts it late (the first phone run photographed an arrow a quarter drawn): wait until the
 * arrow's head, the last stroke, is whole. A head that never is, is a problem.
 */
const inkDrawn = async (name) => {
  const whole = await until(() => { const h = document.querySelector('.sr-tour__line.sr-tour__head'); return h && parseFloat(getComputedStyle(h).strokeDashoffset) < 0.02; }, 10000, 200);
  if (!whole) out.problems.push(name + ': the ink was not drawn on in ten seconds');
};
/** Wait for a step to be up (its caption on the page), give the ink its time, photograph it. */
const stepShot = async (n, id, note) => {
  const up = await until(() => tour.step() && tour.step().id === id && tour.measure() && tour.measure().card, 12000, 150);
  if (!up) { out.problems.push(id + ': the step never came up (now: ' + (tour.step() ? tour.step().id : 'none') + ')'); return false; }
  await sleep(1500);
  await inkDrawn(id);
  await sleep(600);
  const m = judge(id);
  out.steps.push({ id, ...m });
  await shot(n + '-' + id, note);
  return true;
};

// --- the first visit's arrow -------------------------------------------------------------------
await tour.invite();
await sleep(1500);
await inkDrawn('invite');
await sleep(600);
out.invite = judge('invite');
out.inviting = tour.isInviting();
await shot('0-invite', 'a first visit: the arrow at the tour\'s button and its one line; no scrim, nothing started');
tour.dismissInvite();
await sleep(400);

// --- the walk ----------------------------------------------------------------------------------
await tour.start('probe');
await stepShot(1, 'move', 'step 1, the scene: no ring and no scrim, an arrow at the globe');
// A hand on the camera: a real wheel event on the canvas, as a visitor's scroll is.
document.getElementById('stage').dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true, clientX: innerWidth * 0.6, clientY: innerHeight * 0.45 }));
await sleep(300);
out.wheelWasTheAction = tour.state().phase === 'done' || (tour.step() && tour.step().id !== 'move');
if (!out.wheelWasTheAction) tour.next();
await stepShot(2, 'find', 'step 2: the search field ringed');
// A thing chosen, as a press on a dot or a search result is.
const station = sr.recordById('sat-25544');
if (station) sr.select(station, { fly: true, undo: false }); else { look.missing.push('sat-25544'); tour.next(); }
await stepShot(3, 'card', 'step 3: the card\'s actions ringed, after the selection led here by itself');
const pressOn = (hook) => { const e = boxOf(hook); if (!e) return false; const r = e.getBoundingClientRect(); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); return true; };
if (!pressOn('card-actions')) tour.next();
await stepShot(4, 'time', 'step 4: the time pill ringed, after a press on the card\'s actions');
pressOn('time');
await sleep(1200);
out.timeWaits = tour.state().phase;
judge('time, waiting');
await shot('4b-time-waiting', 'step 4 after a press on the pill: the ring and the scrim are gone, the caption waits');
tour.next();
await stepShot(5, 'places', 'step 5: the four tabs ringed; the home is back');
tour.next();
await stepShot(6, 'layers', 'step 6: What to show ringed');
{ const b = boxOf('layers'); if (b) b.click(); }
await sleep(3500);
judge('layers, open');
await shot('6b-layers-open', 'step 6 after the press: What to show is open and not dimmed, the caption beside it');
tour.next();
await stepShot(7, 'share', 'step 7: Share ringed (the More menu on a phone)');
{ const b = boxOf('share') || boxOf('more'); if (b) b.click(); }
await sleep(4000);
judge('share, open');
await shot('7b-share-open', 'step 7 after the press: the share sheet (the menu on a phone) is open, the caption beside or above it');
tour.next();
await stepShot(8, 'trips', 'step 8, the last: the Trips section ringed at its head, Next says Done');
tour.stop('escape');
await sleep(1200);
const left = [...document.querySelectorAll('.sr-tour')].filter((e) => !e.hidden).length;
out.leftOnPage = left;
out.railPressed = (boxOf('tour') || document.querySelector('[data-tour~="tour"]')).getAttribute('aria-pressed');
await shot('9-after', 'after the tour: nothing of it left on the page');
const seen = out.steps.map((s) => s.id);
if (seen.length !== 8) out.problems.push('only ' + seen.length + ' of 8 steps came up: ' + seen.join(', '));
if (left) out.problems.push('the tour\'s layer is still on the page after it ended');
if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
