// f8-xr-looks.js -- release 2.0.0 batch f8-xr (forge #164, #158): the gamepad's hint and ring, and the headset's button and
// note. No pad and no headset are attached: a fake standard pad stands in for navigator.getGamepads and a fake navigator.xr
// says immersive-vr is supported (and refuses the session, which this probe never asks for).
//   render.sh 'http://localhost:8462/?sw=0' tests/probes/f8-xr-looks.js --width=1440 --height=900 --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//   (and --width=390 --height=844 --mobile for the phone)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar;
const out = { tReady: Date.now() - t0, errors: [] };
window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
ctx.clock.goTo(Date.UTC(2026, 10, 7, 12, 0, 0));
ctx.clock.setPaused(true);
await wait(3000);
const phone = innerWidth < 600;
// The panels fade in through .sr-float's opacity transition, which advances only with drawn frames, and this software-GL
// page draws one every few seconds: the picture is taken with transitions off, at the panels' end state.
const still = document.createElement('style');
still.textContent = '.sr-padhint, .sr-padring, .sr-xrnote, #sr-more { transition: none !important; }';
document.head.appendChild(still);
const until = async (ok, ms = 40000) => { const s0 = Date.now(); while (!ok() && Date.now() - s0 < ms) await wait(500); return ok(); };
const btn = () => ({ pressed: false, value: 0 });
const fake = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
Object.defineProperty(navigator, 'getGamepads', { value: () => [fake], configurable: true });
try { localStorage.removeItem('sr:padhint'); localStorage.removeItem('sr:padship'); } catch { /* none */ }
const G = await import('/js/ui/gamepad.js');
const pad = G.wantPad(ctx, fake);
// The left stick to the left: the view turns and the ring shows. Headless Chrome draws a frame every two seconds or so
// here (software GL), and the pad is read once a frame, so every press is held for several seconds.
const hold = (ms) => wait(ms);
const az0 = ctx.cameraRig.state.azimuth;
fake.axes = [-0.7, 0, 0, 0];
await hold(9000);
fake.axes = [-0.2, 0, 0, 0]; // just past the dead zone: the ring stays up for the picture
await hold(5000);
out.turned = +(ctx.cameraRig.state.azimuth - az0).toFixed(3);
out.hintAuto = !!document.querySelector('.sr-padhint'); // it opened by itself on the first connection
pad.showHint(); // and again for the picture: the software-GL page stalls past the hint's 20 s auto-hide,
await wait(1500);
// and a pointer over it holds it, as a reader's would, while the slow screenshot is taken.
const hintNode = document.querySelector('.sr-padhint');
if (hintNode) hintNode.dispatchEvent(new PointerEvent('pointerenter'));
out.hint = !!document.querySelector('.sr-padhint:not([hidden])');
out.ring = !!document.querySelector('.sr-padring:not([hidden])');
await window.cdpShot('pad-hint');
if (hintNode) hintNode.dispatchEvent(new PointerEvent('pointerleave'));
pad.hideHint();
// A: choose what is in the ring (the Earth, which the view is on).
fake.axes = [0, 0, 0, 0];
fake.buttons[0] = { pressed: true, value: 1 };
await until(() => !!ctx.selected());
fake.buttons[0] = btn();
await hold(4000);
out.chosen = ctx.selected() ? ctx.selected().name : null;
await window.cdpShot('pad-chosen');
// B: back (closes the card here: no path walked yet).
fake.buttons[1] = { pressed: true, value: 1 };
await until(() => !ctx.selected());
fake.buttons[1] = btn();
await hold(3000);
out.afterBack = ctx.selected() ? ctx.selected().name : null;
// The headset's button and note, with a fake navigator.xr.
const fakeXr = { isSessionSupported: async (m) => m === 'immersive-vr', requestSession: async () => { throw new Error('no headset in this probe'); } };
const Hs = await import('/js/ui/headset.js');
Hs.mountHeadset(ctx, { xr: fakeXr });
await wait(1500);
out.headsetButton = !!document.querySelector('.sr-rail__btn--headset');
out.headsetRow = !!document.querySelector('.sr-more__item--headset');
if (phone) {
  document.querySelector('.sr-rail__btn--more').click();
  await wait(700);
  await window.cdpShot('headset-more');
  document.querySelector('.sr-more__item--headset').click();
} else {
  await window.cdpShot('headset-button');
  document.querySelector('.sr-rail__btn--headset').click();
}
await wait(900);
out.note = document.querySelector('.sr-xrnote') ? document.querySelector('.sr-xrnote').innerText.split('\n').filter(Boolean).slice(0, 3) : null;
out.focus = document.activeElement ? document.activeElement.textContent : null;
await window.cdpShot('headset-note');
out.overflow = document.documentElement.scrollWidth > innerWidth;
return out;
