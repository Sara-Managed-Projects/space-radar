// Run C (390 x 844, --mobile, --gl=gpu): "Point your phone" (internal #450) with synthetic
// orientation events. Headless Chrome has no sensor, so the probe dispatches
// `deviceorientationabsolute` events itself and checks the view follows: this proves the wiring
// from the event to the camera, NOT that a real phone's angles are what the maths expects.
// Pasted after tests/probes/sky3-common.js (see sky5-README.txt).
const flagstaff = place('Flagstaff', 35.2, -111.65);
// Where the probe has got to, in the server's log: a hung page returns nothing else.
const mark = (m) => { try { fetch('/__mark/' + encodeURIComponent(m)).catch(() => {}); } catch { /* no server */ } };
window.addEventListener('unhandledrejection', (e) => out.errors.push('rejection: ' + String(e.reason && e.reason.message || e.reason).slice(0, 160)));
await stand(flagstaff);
ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); // 03:30 at Flagstaff: Orion is up
await wait(1500);
out.before = { look: ctx.skyView.look, pointing: ctx.skyView.pointing, booted: performance.getEntriesByType('resource').filter((r) => /pointing\.js|wmm2025\.js/.test(r.name)).length };
const tab = document.querySelector('[data-tab="tonight"][role="tab"]');
if (tab) tab.click();
const w2 = Date.now(); while (!document.querySelector('.sr-skybar') && Date.now() - w2 < 15000) await wait(300);
const handle = document.querySelector('.sr-sheet__handle');
const raise = (key) => { if (handle) handle.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); };
raise('ArrowUp'); await wait(500); raise('ArrowUp'); await wait(900);
const btn = [...document.querySelectorAll('.sr-skybar button')].find((n) => /Point your phone/.test(n.textContent));
out.switch = btn ? { hidden: btn.parentNode.hidden, disabled: btn.disabled, pressed: btn.getAttribute('aria-pressed'), w: Math.round(btn.getBoundingClientRect().width), h: Math.round(btn.getBoundingClientRect().height) } : null;
let feeding = null;
const feed = (alpha, beta, gamma) => { feeding = { alpha, beta, gamma }; };
const pump = setInterval(() => { if (feeding) window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { ...feeding, absolute: true })); }, 16);
if (btn) { btn.scrollIntoView({ block: 'start' }); btn.click(); }
feed(0, 135, 0); // facing magnetic north, tipped back 45 degrees
const w3 = Date.now(); while (!(ctx.skyView.pointing && ctx.skyView.pointing.on) && Date.now() - w3 < 8000) await wait(100);
await wait(1200);
const st = ctx.skyView.pointing;
const decl = st.declinationDeg;
const step = async (name, a, b, g, wantAz, wantAlt) => {
  mark(name);
  feed(a, b, g); await wait(1200);
  const l = ctx.skyView.look;
  const dAz = Math.abs(((l.azimuthDeg - wantAz + 540) % 360) - 180);
  out[name] = { az: +l.azimuthDeg.toFixed(2), alt: +l.altitudeDeg.toFixed(2), wantAz: +(((wantAz % 360) + 360) % 360).toFixed(2), wantAlt, ok: dAz < 0.5 && Math.abs(l.altitudeDeg - wantAlt) < 0.5 };
};
out.pointing = st;
await step('north45', 0, 135, 0, decl, 45);
await step('east30', 270, 120, 0, 90 + decl, 30);
await step('south60', 180, 150, 0, 180 + decl, 60);
await step('zenithish', 180, 175, 0, 180 + decl, 85);
await step('down20', 90, 70, 0, 270 + decl, -20);
// The controls with the switch on.
mark('p1');
out.notes = [...document.querySelectorAll('.sr-skybar .sr-density__note, .sr-skybar .sr-tonight-view__caveat')].slice(0, 2).map((n) => n.textContent);
out.overflow = document.documentElement.scrollWidth > innerWidth;
await shot('p1-phone-switch-on');
// Point at Orion's belt: the reticle, and the tag naming what the phone is on.
mark('lowering');
raise('ArrowDown'); await wait(400); raise('ArrowDown'); await wait(900);
mark('lowered');
const o = new A.Observer(35.2, -111.65, 0); const d = new Date(ctx.clock.now());
// Alnilam, of date: J2000's 5.6036 h, -1.2019 carried 26.8 years by precession.
const h = A.Horizon(d, o, 5.6263, -1.1857, 'normal');
out.alnilam = { az: +h.azimuth.toFixed(2), alt: +h.altitude.toFixed(2) };
await step('alnilam', decl - h.azimuth, 90 + h.altitude, 0, h.azimuth, h.altitude);
await wait(1500);
out.tag = (() => { const tg = document.querySelector('.sr-skytag:not([hidden])'); return tg ? tg.innerText.replace(/\s+/g, ' ') : null; })();
out.reticle = (() => { const r = document.querySelector('.sr-skyreticle'); if (!r) return null; const b = r.getBoundingClientRect(); return { hidden: r.hidden, x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), vw: innerWidth, vh: innerHeight }; })();
mark('p2');
await shot('p2-phone-pointing-orion');
mark('p2 done');
// A drag while it is on is the offset: 60 px to the right turns the sky under the finger.
const canvas = ctx.renderer.domElement;
const ev = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true }));
await step('beforeDrag', 0, 120, 0, decl, 30);
ev('pointerdown', 195, 200); for (let i = 1; i <= 6; i += 1) { ev('pointermove', 195 + i * 10, 200); await wait(20); } ev('pointerup', 255, 200);
await wait(1000);
out.afterDrag = { look: ctx.skyView.look, offsetAzDeg: ctx.skyView.pointing.offsetAzDeg, moved: +(((ctx.skyView.look.azimuthDeg - decl + 540) % 360) - 180).toFixed(2) };
out.noteLined = [...document.querySelectorAll('.sr-skybar .sr-density__note')].map((n) => n.textContent).filter(Boolean)[0];
ctx.skyView.resetPointing();
mark('drag done');
// Rolled 25 degrees: the horizon tilts, as it does behind a tilted phone.
feed(decl - 250, 95, 25); await wait(1200);
out.rolled = ctx.skyView.look;
mark('p3');
await shot('p3-phone-rolled-horizon');
// Off: the sensor is let go and the drag view carries on from where the phone pointed.
clearInterval(pump); feeding = null;
await ctx.skyView.pointPhone(false);
await wait(600);
out.after = { pointing: ctx.skyView.pointing, look: ctx.skyView.look, reticleHidden: (document.querySelector('.sr-skyreticle') || {}).hidden };
return out;
