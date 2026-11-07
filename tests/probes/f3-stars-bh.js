// f3-stars-bh.js -- release 2.0.0 batch f3-stars (forge #149, #142): M87* and Sagittarius A* drawn turning, with their
// cards (the spin line) beside them; then Algol's and Mira's cards with their light curves. Pasted after tests/probes/look-common.js.
//   cat tests/probes/look-common.js tests/probes/f3-stars-bh.js > /tmp/bh.js
//   render.sh 'http://localhost:8465/?sw=0' /tmp/bh.js --width=1440 --height=900 --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>
for (const id of ['exotic-m87-star', 'exotic-sgr-a-star']) {
  if (await goTo(id, 25000)) {
    await until(() => ctx.portraits && ctx.portraits.state && ctx.portraits.state(), 15000);
    await until(() => document.querySelector('.sr-card__varcurve:not([hidden])'), 8000);
    out[id] = { portrait: ctx.portraits ? ctx.portraits.state() : null, spin: (document.querySelector('.sr-card__varcurve:not([hidden])') || {}).textContent || null };
    await shot(id.replace('exotic-', 'bh-'), 5000);
  }
}
// forge #142: a variable star's card with its light curve (Algol, Mira).
ctx.clock.goTo(Date.parse('2026-11-09T19:00:00Z'));
for (const id of ['hip-14576', 'hip-10826']) {
  await until(() => ctx.recordById(id), 20000);
  if (await goTo(id, 20000)) {
    await until(() => document.querySelector('.sr-varcurve'), 8000);
    const box = document.querySelector('.sr-varcurve');
    if (box) box.scrollIntoView({ block: 'center' });
    out[id] = box ? box.innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
    await shot('card-' + id, 2000);
  }
}
return out;
