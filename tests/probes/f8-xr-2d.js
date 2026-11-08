// f8-xr-2d.js -- release 2.0.0 batch f8-xr (forge #158, #164): the 2D view with no gamepad and no headset, at one fixed
// instant, to hold it unchanged against the same probe run on the base branch.
//   render.sh 'http://localhost:8462/?sw=0' tests/probes/f8-xr-2d.js --width=1440 --height=900 --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
//   (and --width=390 --height=844 --mobile for the phone)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar;
ctx.clock.goTo(Date.UTC(2026, 10, 7, 12, 0, 0));
ctx.clock.setPaused(true);
await wait(6000);
const out = { tReady: Date.now() - t0, rail: [...document.querySelectorAll('#sr-rail > *')].map((b) => b.className), headset: !!document.querySelector('.sr-rail__btn--headset'), pad: !!document.querySelector('.sr-padhint') };
await window.cdpShot('2d');
return out;
