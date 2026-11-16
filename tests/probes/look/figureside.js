// figureside: a constellation seen from the side (ui/figureside.js, registry/sideviews.yaml; the 2026-11-16 deep-space
// review, idea 6).
//
// 1. BY A LINK: `#figure=orion` pasted over the running page. The figure from the Sun's place (the lines on the stars as
//    we see them), then 35, 70 and 90 degrees round to the side by the panel's slider, each corner star's distance
//    beside it.
// 2. THE OTHER FIGURES, by the panel's list: the Big Dipper (an asterism of Ursa Major), Cassiopeia, the Southern
//    Cross, Scorpius, Leo, each from the Sun and from 70 degrees.
// 3. CLOSED: the stage, the lens and the up the visitor had are back.
// 4. THE WAYS IN: a western figure's story card with its button (pressed: the side view opens), and the search row
//    for "big dipper".
// Fails when a figure never opened, drew no stroke, did not come apart (the camera did not leave the Sun), or the
// close did not put the lens back. Run at 1440 x 900 and again with `-f mobile=true`.
look.probe = 'figureside';
const out = { figures: {}, problems: [] };
const LY_KM = 9.4607304725808e12;
const panel = () => document.querySelector('#sr-figside');
const slider = () => document.querySelector('#sr-figside-angle');
const side = () => (sr.figureSide ? sr.figureSide.state() : null);
const sunLy = () => { const p = sr.camera.position; return Math.hypot(p.x, p.y, p.z) * sr.stage.unitKm / LY_KM; };
const setAngle = async (deg, waitMs = 3500) => { const s = slider(); s.value = String(deg); s.dispatchEvent(new Event('input', { bubbles: true })); await sleep(waitMs); };
const before = { stage: sr.stage.worldId, fov: sr.camera.fov, up: sr.camera.up.toArray() };
const IDS = ['orion', 'big-dipper', 'cassiopeia', 'southern-cross', 'scorpius', 'leo'];
let first = true;
for (const id of IDS) {
  const o = {}; out.figures[id] = o;
  if (first) { location.hash = '#figure=' + id; first = false; }
  else { const p = document.querySelector('#sr-figside-pick'); p.value = id; p.dispatchEvent(new Event('change', { bubbles: true })); }
  o.opened = await until(() => sr.figureSide && sr.figureSide.openId() === id && slider() && !slider().disabled, 120000);
  if (!o.opened) { out.problems.push(`${id}: the side view never opened`); continue; }
  await until(() => !sr.cameraRig.state.flying, 30000);
  o.drawn = await until(() => sr.figures && sr.figures.state().figures.some((f) => !f.leaving && f.progress >= 1), 60000);
  if (!o.drawn) out.problems.push(`${id}: the figure's stroke never finished`);
  await sleep(3000);
  o.home = { ...side(), sunLy: +sunLy().toFixed(2), labels: sr.figures.state().labels, title: panel().querySelector('h2').textContent, stage: sr.stage.worldId };
  if (!(o.home.sunLy < 0.01 * o.home.farLy + 5)) out.problems.push(`${id}: at 0 degrees the camera is ${o.home.sunLy} light-years from the Sun`);
  await shot(`${id}-0-from-the-sun`, `${o.home.title}: from the Sun's place, ${o.home.where} | lens ${o.home.fov.toFixed(0)} deg | ${o.home.labels.length} names`);
  if (id === 'orion') { await setAngle(35); await shot('orion-35', `35 degrees round: ${side().where}`); }
  await setAngle(70);
  o.side = { ...side(), sunLy: +sunLy().toFixed(1), labels: sr.figures.state().labels };
  if (!(o.side.sunLy > 20)) out.problems.push(`${id}: at 70 degrees the camera has not left the Sun (${o.side.sunLy} light-years)`);
  await shot(`${id}-70-from-the-side`, `70 degrees round: ${o.side.where} | ${o.side.labels.join('; ').slice(0, 200)}`);
  if (id === 'orion') { await setAngle(90); await shot('orion-90', `a quarter turn: ${side().where}`); }
}
// 3. Closed.
try {
  out.buttons = [...panel().querySelectorAll('button')].map((b) => b.textContent || b.getAttribute('aria-label'));
  panel().querySelector('.ui-close').click();
  await sleep(4000);
  out.closed = { open: sr.figureSide.isOpen(), stage: sr.stage.worldId, hash: location.hash, fov: sr.camera.fov, up: sr.camera.up.toArray(), panel: !!panel() };
  if (out.closed.open || out.closed.panel || Math.abs(out.closed.fov - before.fov) > 1e-6 || out.closed.stage !== before.stage || /figure=/.test(out.closed.hash)) out.problems.push(`closing did not put things back: ${JSON.stringify(out.closed)} against ${JSON.stringify(before)}`);
  await shot('closed', `closed: back on ${out.closed.stage}, lens ${out.closed.fov}`);
} catch (e) { out.problems.push('close: ' + String(e).slice(0, 200)); }
// 4. The ways in: the story card's button, then the search row.
try {
  const m = await import('/js/ui/skystory.js');
  await m.openSkyStory({ culture: 'western', key: 'Ori', name: 'Orion', cultureName: 'western' });
  await sleep(3000);
  const card = document.querySelector('#sr-skystory');
  out.card = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 300) : null;
  await shot('story-card', 'a western figure\'s story card with its button');
  const b = card ? [...card.querySelectorAll('button.ui-btn')].find((x) => x.textContent === 'See it from the side' || x.classList.contains('ui-btn--secondary')) : null;
  if (!b) out.problems.push('the story card has no "See it from the side" button');
  else {
    b.click();
    out.fromCard = await until(() => sr.figureSide && sr.figureSide.openId() === 'orion', 60000);
    if (!out.fromCard) out.problems.push('the story card\'s button did not open the side view');
    await sleep(2000);
    if (panel()) panel().querySelector('.ui-close').click();
    await sleep(2500);
  }
} catch (e) { out.problems.push('story card: ' + String(e).slice(0, 200)); }
try {
  const input = document.querySelector('.sr-search__input');
  input.focus(); input.value = 'big dipper'; input.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => document.querySelector('[data-extra="figureside"]'), 30000);
  await sleep(1500);
  out.rows = [...document.querySelectorAll('[data-extra]')].map((n) => n.dataset.extra + ': ' + n.innerText.replace(/\s+/g, ' ').slice(0, 80));
  if (!out.rows.some((r) => /^figureside/.test(r))) out.problems.push(`"big dipper" found no side-view row (${out.rows.join(' | ')})`);
  await shot('search-row', '"big dipper" in the search field');
} catch (e) { out.problems.push('search: ' + String(e).slice(0, 200)); }
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
