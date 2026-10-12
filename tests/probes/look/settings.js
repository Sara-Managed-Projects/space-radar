// settings: the two rows spec 0073 added to What to show, Quality and Look (ui/qualitypanel.js,
// ui/exposure.js lookPanel). The popover is opened as a visitor opens it (the key L), the rows are
// photographed and MEASURED (every button on one line, no label cut, the popover not scrolling
// sideways), each quality is chosen through the row's own buttons and what ctx.quality then reports
// is returned, then Measured is chosen and Jupiter looked at close, with what the weather module
// says is drawn; then Film again, the same view. Run it twice: as it is (1440 x 900) and with
// `-f mobile=true` (390 x 844: a phone is offered Auto and Low, and wears no weather).
look.probe = 'settings';
const out = { rows: {}, quality: [], measured: null, film: null };
const pop = () => document.getElementById('sr-show');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
await sleep(400);
if (!pop() || pop().hidden) { out.openedBy = 'rail.openShow()'; sr.rail.openShow(); } else out.openedBy = 'the key L';
const built = await until(() => document.querySelector('.sr-quality') && document.querySelector('.sr-look'), 30000);
if (!built) return finish({ ...out, fail: 'What to show opened without its Quality and Look rows' });
// A label's own width against its button's (not scrollWidth: the pressed button's corner brackets
// stand outside its box and count there; the first run called every pressed label cut).
const textWidth = (b) => { const r = document.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect().width; };
const rowOf = (sel) => {
  const wrap = document.querySelector(sel);
  const buttons = [...wrap.querySelectorAll('button')];
  const rects = buttons.map((b) => b.getBoundingClientRect());
  const box = wrap.getBoundingClientRect();
  return {
    title: wrap.querySelector('h2').textContent,
    buttons: buttons.map((b, i) => ({ text: b.textContent, pressed: b.getAttribute('aria-pressed'), tip: b.title, w: Math.round(rects[i].width), h: Math.round(rects[i].height), cut: textWidth(b) > rects[i].width - 2 })),
    oneLine: new Set(rects.map((r) => Math.round(r.top))).size === 1,
    inside: rects.every((r) => r.left >= box.left - 1 && r.right <= box.right + 1),
    note: (wrap.querySelector('.sr-quality__note') || {}).textContent || '',
    height: Math.round(box.height),
  };
};
const scroller = () => { let n = document.querySelector('.sr-quality'); while (n && n !== document.body) { if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n; n = n.parentElement; } return null; };
document.querySelector('.sr-look').scrollIntoView({ block: 'center' });
await shot('1-look-row', 'What to show, scrolled to Exposure and Look', 1500);
document.querySelector('.sr-quality').scrollIntoView({ block: 'center' });
await shot('2-quality-row', 'What to show, scrolled to Quality (Auto, and what Auto wears now)', 1500);
out.rows.look = rowOf('.sr-look');
out.rows.quality = rowOf('.sr-quality');
{
  const s = scroller();
  out.rows.sideways = s ? s.scrollWidth - s.clientWidth : 0;
  out.rows.pageSideways = document.documentElement.scrollWidth - innerWidth;
}
// Each quality in turn, by the row's own buttons. What the page then reports, not what was asked.
const report = () => {
  let weather = null;
  try { const a = sr.weather.state().air; weather = a ? { latched: a.latched, worlds: a.worlds.length } : sr.weather.state(); } catch { weather = null; }
  return {
    choice: sr.quality.choice, tier: sr.quality.tier, plan: sr.quality.plan(), offered: sr.quality.offered(),
    note: (document.querySelector('.sr-quality__note') || {}).textContent || '',
    pressed: [...document.querySelectorAll('.sr-quality button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.quality),
    stripped: sr.latch.latched, tripped: sr.latch.tripped, pixelRatio: sr.renderer.getPixelRatio(), scale: sr.scaler.scale, scaleHeld: sr.scaler.held,
    stored: localStorage.getItem('sr.quality'), weather, sun: !!sr.sunDetail, hash: location.hash,
  };
};
out.quality.push({ asked: '(as booted)', ...report() });
for (const choice of sr.quality.offered().filter((c) => c !== 'auto').concat(['auto'])) {
  const b = document.querySelector(`.sr-quality button[data-quality="${choice}"]`);
  if (!b) { out.quality.push({ asked: choice, missing: true }); continue; }
  b.click();
  await sleep(2500);
  out.quality.push({ asked: choice, ...report() });
  if (choice === 'low' || choice === 'ultra') await shot(`3-quality-${choice}`, `${choice} chosen: the row, and the scene behind it`, 2500);
}
const wrong = out.quality.filter((q) => q.asked !== '(as booted)' && (q.missing || q.choice !== q.asked || q.pressed.join() !== q.asked));
// The look: Measured, then Jupiter close from the Sun's side; then Film, the same view.
document.querySelector('.sr-look').scrollIntoView({ block: 'center' });
document.querySelector('.sr-look button[data-look="measured"]').click();
await sleep(600);
out.lookRowMeasured = rowOf('.sr-look').buttons.map((b) => `${b.text}:${b.pressed}`).join(' ');
out.hashMeasured = location.hash;
await shot('4-measured-chosen', 'Measured chosen in the row', 800);
sr.rail.closeShow();
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.setLook === 'function', 30000);
const J = 'jupiter';
await stage(J, 12000);
const d0 = rig.state.distance;
const jupiterNow = () => {
  try {
    const air = sr.weather.state().air;
    const w = air.worlds.find((x) => x.id === J);
    return { look: air.look, latched: air.latched, near: w && w.storms ? w.storms.near : null, flashes: w ? w.flashes : null, line: sr.weather.line(J, sr.clock.now()) };
  } catch (e) { return { none: String(e).slice(0, 120), line: (() => { try { return sr.weather.line(J, sr.clock.now()); } catch { return null; } })() }; }
};
rig.flyTo({ offset: mix(sunward(J), 1, north(J), -0.27), distance: d0 * 0.45, ms: 0 });
await shot('5-jupiter-measured', 'Jupiter close, Measured: no eddies, no under-deck, no flashes', 7000);
out.measured = { look: sr.look(), ...jupiterNow() };
sr.drawn.set('film');
await shot('6-jupiter-film', 'the same view, Film', 7000);
out.film = { look: sr.look(), hash: location.hash, ...jupiterNow() };
const fails = [];
for (const [name, r] of [['Look', out.rows.look], ['Quality', out.rows.quality]]) {
  if (!r.oneLine) fails.push(`${name}: its buttons are on more than one line`);
  if (!r.inside) fails.push(`${name}: a button is outside its row`);
  if (r.buttons.some((b) => b.cut)) fails.push(`${name}: a label is cut (${r.buttons.filter((b) => b.cut).map((b) => b.text).join(', ')})`);
  if (r.buttons.some((b) => !b.tip)) fails.push(`${name}: a button has no tooltip`);
}
if (out.rows.sideways > 1 || out.rows.pageSideways > 1) fails.push(`the popover or the page scrolls sideways (${out.rows.sideways}, ${out.rows.pageSideways} px)`);
if (wrong.length) fails.push('a quality button did not give its choice: ' + wrong.map((q) => `${q.asked} -> ${q.choice}`).join(', '));
if (!/drawn=measured/.test(out.hashMeasured)) fails.push('Measured is not in the address (' + out.hashMeasured + ')');
if (/drawn=/.test(out.film.hash)) fails.push('Film left `drawn` in the address');
if (out.weatherLoaded && out.measured.near && (out.measured.near.x !== 0 || out.measured.near.w !== 0)) fails.push('Measured: Jupiter\'s eddies or under-deck are still drawn ' + JSON.stringify(out.measured.near));
if (out.weatherLoaded && out.film.near && !(out.film.near.x > 0)) fails.push('Film: Jupiter\'s eddies did not come back ' + JSON.stringify(out.film.near));
if (fails.length) out.fail = fails.join('; ');
return finish(out);
