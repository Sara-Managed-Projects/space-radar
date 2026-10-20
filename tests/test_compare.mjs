// tests/test_compare.mjs -- Compare and the comparison lab (internal i#885 and i#909, release 1.3.0).
//
//   node tests/test_compare.mjs
//
// WHAT IS HELD. (1) the registry: eleven bodies, each radius the one registry/worlds.yaml draws the world
// with, every gas and every name has its words, a ring's bands are ordered and a body has bands only if it
// has rings; (2) the numbers as the table prints them (a golden table for four pairs), grouped with the
// narrow no-break space, no "NaN", no "undefined"; (3) the picture's geometry for every ordered pair, in both
// modes and at three widths: nothing leaves the box, the discs do not overlap, a true scale is true, a body
// under a pixel is flagged and drawn as a dot, "same width" is the same width; (4) the lab: sorted, stable,
// bars in 0.03 to 1, a body with no value for a measure is left out, the open world is marked; (5) the panel,
// built and pressed in a stand-in document: modes, the other-body field, the scale choice, the lab's rows,
// and that state survives a repaint; (6) the module's place: cards.js reaches it only by dynamic import.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const eq = (got, want, what) => check(Object.is(got, want), `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const { install, walk, byText, click, fire } = await import('./helpers/fakedom.mjs');
const document = install();
const M = await import(join(JS, 'ui/compare.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { BODY, ORDER, cell, rowsFor, widerSentence, layout, labRows, defaultWith, canCompare, extentKm, MIN_R, PROPS, TABLE_PROPS, mountCompare, VIEW_W, VIEW_H } = M;

// --- 1. the registry ---------------------------------------------------------------------------
eq(ORDER.join(), 'sun,mercury,venus,earth,moon,mars,jupiter,saturn,uranus,neptune,pluto', 'the bodies, in the order they are listed');
const worlds = readFileSync(join(ROOT, 'registry/worlds.yaml'), 'utf8');
for (const id of ORDER) {
  const b = BODY.get(id);
  const m = new RegExp(`- id: ${id}\\n[\\s\\S]*?radius_km: ([0-9.]+)`).exec(worlds);
  check(!!m && Math.abs(Number(m[1]) - b.radius_km) <= 0.5, `${id}: radius ${b.radius_km} km is the one worlds.yaml draws (${m && m[1]})`);
  check(/^https:\/\/nssdc\.gsfc\.nasa\.gov\/planetary\/factsheet\/\w+\.html$/.test(b.page), `${id}: names the NASA page it was read from (${b.page})`);
  check(/^\d{4}-\d\d-\d\d$/.test(b.updated), `${id}: says when that page was last updated`);
  check(COPY.compare.names[id], `${id}: has a name`);
  for (const [gas, share] of b.air) check(COPY.compare.gas[gas] && share > 0 && share <= 100, `${id}: the gas "${gas}" has words and a share in 0..100`);
  check(!!b.rings === (Array.isArray(b.ring_bands) && b.ring_bands.length > 0), `${id}: ring bands exactly where there are rings`);
  for (const [i, o, w] of b.ring_bands || []) check(i <= o && i > b.radius_km && w > 0 && w <= 1, `${id}: ring band ${i}-${o} is outside the body and ordered, weight in 0..1`);
  if (b.ring_bands) check(b.ring_bands.every((r, k) => k === 0 || r[0] >= b.ring_bands[k - 1][0]), `${id}: ring bands run outwards`);
  check(b.rings_page === undefined || /^https:\/\/nssdc\.gsfc\.nasa\.gov\/planetary\/factsheet\/\w+ringfact\.html$/.test(b.rings_page), `${id}: the ring page is NASA's ring fact sheet`);
  eq(b.rings === true, ['jupiter', 'saturn', 'uranus', 'neptune'].includes(id), `${id}: rings are the four giants'`);
}
eq(canCompare('jupiter'), true, 'a planet can be compared');
eq(canCompare('io'), false, 'a moon that is not in the table cannot, and its card has no Compare row');
eq(defaultWith('earth'), 'moon', 'the Earth is first set beside the Moon');
eq(defaultWith('mars'), 'earth', 'every other world is first set beside the Earth');

// --- 2. the numbers as printed -------------------------------------------------------------------
const NNBSP = ' ';
const row = (a, b) => Object.fromEntries(rowsFor(BODY.get(a), BODY.get(b)).map((r) => [r.prop, [r.a.text + (r.a.note ? ` (${r.a.note})` : ''), r.b.text + (r.b.note ? ` (${r.b.note})` : '')]]));
const j = row('jupiter', 'earth');
eq(j.across[0], `139${NNBSP}822 km (on average; it is flattened)`, 'Jupiter across');
eq(j.across[1], `12${NNBSP}742 km`, 'Earth across');
eq(j.mass[0], '318 Earths', 'Jupiter mass');
eq(j.mass[1], '1 Earth', 'Earth mass');
eq(j.gravity[0], '25.9 m/s² (at the 1 bar level)', 'Jupiter gravity says where it is');
eq(j.temp[0], '−108 °C (at the 1 bar level)', 'Jupiter temperature says where it is, with a true minus');
eq(j.temp[1], '15 °C (average)', 'Earth temperature');
eq(j.spin[0], '9.93 hours', 'Jupiter turn');
eq(j.year[0], '11.9 years', 'Jupiter year');
eq(j.year[1], '365 days', 'Earth year');
eq(j.dist[0], '5.2 AU', 'Jupiter from the Sun');
eq(j.air[0], '89.8% hydrogen, 10.2% helium', 'Jupiter air');
eq(j.pressure[0], 'No surface', 'a giant has no surface pressure');
eq(j.pressure[1], '1.01 bar', 'Earth air pressure');
eq(j.moons[0], '95', 'Jupiter moons');
eq(j.rings[0], 'Yes', 'Jupiter rings');
const v = row('venus', 'pluto');
eq(v.spin[0], '243 days (turning backwards)', 'Venus turns backwards');
eq(v.temp[1], '−249 to −235 °C (its range)', 'Pluto has a range, not a mean');
eq(v.pressure[0], '92 bar', 'Venus pressure');
eq(v.pressure[1], '13 µbar', 'Pluto pressure');
eq(v.moons[0], 'None', 'Venus has no moons');
const s = row('sun', 'earth');
eq(s.year[0], '—', 'the Sun has no year to compare');
eq(s.moons[0], '—', 'the Sun is not counted for moons');
eq(s.temp[0], `5${NNBSP}499 °C (the visible surface)`, 'the Sun is a visible surface and says so');
const m = row('earth', 'moon');
eq(m.air[1], 'Almost none (a thin exosphere)', 'the Moon has almost no air');
eq(m.dist[1], '1 AU (with the Earth)', 'the Moon is as far from the Sun as the Earth is');
eq(m.year[1], '—', 'the Moon has no year of its own');
for (const a of ORDER) for (const b of ORDER) {
  if (a === b) continue;
  const text = rowsFor(BODY.get(a), BODY.get(b)).flatMap((r) => [r.a, r.b]).map((c) => `${c.text} ${c.note}`).join(' | ');
  check(!/NaN|undefined|null|\[object|\d \d{3}\b/.test(text), `${a} beside ${b}: no NaN, no undefined, no plain-space digit group (${text.slice(0, 80)})`);
  check(rowsFor(BODY.get(a), BODY.get(b)).length === TABLE_PROPS.length, `${a} beside ${b}: one row each for ${TABLE_PROPS.length} measures`);
}
// the sentence: from the wider one's side, the same either way round
eq(widerSentence(BODY.get('jupiter'), BODY.get('earth')), 'Jupiter is 11 times as wide as Earth.', 'sentence');
eq(widerSentence(BODY.get('earth'), BODY.get('jupiter')), 'Jupiter is 11 times as wide as Earth.', 'sentence, the other way round');
eq(widerSentence(BODY.get('sun'), BODY.get('earth')), 'The Sun is 109 times as wide as Earth.', 'a sentence starts with a capital');
eq(widerSentence(BODY.get('venus'), BODY.get('earth')), 'Earth is 1.1 times as wide as Venus.', 'two sig figs under 10');
eq(widerSentence(BODY.get('earth'), BODY.get('venus')), 'Earth is 1.1 times as wide as Venus.', 'Earth over Venus');
{
  const near = { ...BODY.get('earth'), world: 'x', radius_km: 6400 };
  check(/about the same width/.test(widerSentence(BODY.get('earth'), near)), 'within 5 % is "about the same width"');
}

// --- 3. the picture's geometry ----------------------------------------------------------------------
let pairs = 0;
for (const mode of ['true', 'same']) for (const w of [240, 320, 360]) for (const a of ORDER) for (const b of ORDER) {
  if (a === b) continue;
  const A = BODY.get(a); const B = BODY.get(b);
  const lay = layout(A, B, mode, w, 148);
  pairs += 1;
  const [x, y] = lay.bodies;
  const tag = `${a}/${b} ${mode} ${w}`;
  for (const [body, src] of [[x, A], [y, B]]) {
    const reach = Math.max(body.r, ...body.bands.map((band) => band.outer));
    check(body.cx - reach >= -0.01 && body.cx + reach <= w + 0.01, `${tag}: ${body.id} stays inside the width (${(body.cx - reach).toFixed(1)}..${(body.cx + reach).toFixed(1)})`);
    check(body.r <= 148 / 2 + 0.01, `${tag}: ${body.id} fits the height`);
    check(body.cy + reach * M.TILT <= 148 + 0.01 || body.bands.length === 0, `${tag}: ${body.id}'s rings fit the height`);
    check(body.tiny === (body.r <= MIN_R + 1e-9 && src.radius_km * (body.r / src.radius_km) <= MIN_R + 1e-9) || body.tiny === true || body.r > MIN_R, `${tag}: tiny is only said of a dot`);
    check(!body.tiny || Math.abs(body.r - MIN_R) < 1e-9, `${tag}: a body under a pixel is drawn as a dot of ${MIN_R} px`);
  }
  check(Math.hypot(x.cx - y.cx, 0) >= x.r + y.r - 0.01, `${tag}: the discs do not overlap`);
  check(Math.abs(x.cx - w / 2 + (y.cx - w / 2)) < w / 2, `${tag}: the pair is centred`);
  if (mode === 'true' && !x.tiny && !y.tiny) check(Math.abs(x.r / y.r - A.radius_km / B.radius_km) < 1e-9, `${tag}: a true scale keeps the radii's ratio`);
  if (mode === 'same') check(Math.abs(x.r - y.r) < 1e-9, `${tag}: the same width is the same width`);
}
check(pairs === 2 * 3 * ORDER.length * (ORDER.length - 1), `all ${pairs} pairs checked`);
{
  const sunEarth = layout(BODY.get('sun'), BODY.get('earth'), 'true', 320, 148);
  check(sunEarth.bodies[1].tiny, 'the Earth beside the Sun is under a pixel and says so');
  const satEarth = layout(BODY.get('saturn'), BODY.get('earth'), 'true', 320, 148);
  check(satEarth.bodies[0].bands.length === 4 && satEarth.bodies[0].bands[0].outer > satEarth.bodies[0].r, 'Saturn draws its four ring bands outside its disc');
  eq(extentKm(BODY.get('saturn')), 139826, 'Saturn reaches the F ring');
}

// --- 4. the lab ----------------------------------------------------------------------------------------
for (const p of PROPS) {
  const rows = labRows(p.id, 'jupiter');
  const again = labRows(p.id, 'jupiter');
  check(JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(again.map((r) => r.id)), `${p.id}: the same order every time`);
  check(rows.every((r, i) => i === 0 || rows[i - 1].value >= r.value), `${p.id}: largest first`);
  check(rows.every((r) => r.frac >= 0.03 && r.frac <= 1), `${p.id}: every bar is a mark, none past the box`);
  check(rows[0].frac === 1, `${p.id}: the longest bar is the box`);
  check(rows.filter((r) => r.open).length === 1, `${p.id}: the open world is marked once`);
  check(!rows.some((r) => /NaN|undefined/.test(r.cell.text)), `${p.id}: no NaN in a row`);
}
check(!labRows('year').some((r) => r.id === 'sun' || r.id === 'moon'), 'the Sun and the Moon have no year, so they are left out of that lab');
check(labRows('across').length === 11 && labRows('moons').length === 10, 'eleven bodies are widths, ten have a moon count');
eq(labRows('across')[0].id, 'sun', 'the Sun is the widest');
eq(labRows('moons')[0].id, 'saturn', 'Saturn has the most moons');
eq(labRows('temp')[0].id, 'sun', 'the Sun is the hottest');
eq(labRows('temp').at(-1).id, 'pluto', 'Pluto is the coldest');
eq(labRows('gravity')[0].id, 'sun', 'the Sun has the most gravity');
eq(labRows('year')[0].id, 'pluto', 'Pluto has the longest year');
eq(labRows('spin')[0].id, 'venus', 'Venus is the slowest to turn');

// --- 5. the panel -----------------------------------------------------------------------------------------
const mk = () => { const b = document.createElement('div'); b.clientWidth = 330; return b; };
const box = mk();
mountCompare(box, { id: 'jupiter', name: 'Jupiter' }, {});
const pressed = (root) => root.querySelectorAll('[aria-pressed="true"]').map((n) => n.textContent);
check(box.classList.contains('sr-vs'), 'the panel wears its class');
eq(pressed(box).join('|'), 'Side by side|To scale', 'it opens side by side, to scale');
const select = box.querySelector('select');
eq(select.querySelectorAll('option').length, 10, 'the other-body field lists every other world');
eq(select.querySelectorAll('option').some((o) => o.value === 'jupiter'), false, 'a world is not offered itself');
check(box.querySelector('svg') && box.querySelectorAll('circle').length === 2, 'two discs are drawn');
eq(box.querySelector('svg').attrs.viewBox, `0 0 ${VIEW_W} ${VIEW_H}`, 'the picture has its own fixed box and the card scales it');
check(box.querySelectorAll('path').length >= 1, 'the rings of the giant are drawn');
check(/Jupiter is 11 times as wide as Earth\./.test(box.textContent), 'the sentence is there');
check(box.querySelectorAll('.sr-vs__row').length === TABLE_PROPS.length, 'one row for each measure');
check(/NASA’s Planetary Fact Sheets, read 20 October 2026\./.test(box.textContent), `the source and the day it was read are said (${box.querySelector('.sr-vs__source') && box.querySelector('.sr-vs__source').textContent})`);
check(box.textContent.includes(COPY.compare.giantNote), 'a giant says its numbers are at the 1 bar level');
check(box.textContent.includes(COPY.compare.ringsDrawn), 'a ring planet says its rings are tilted for the picture');
// same width
click(byText(box, 'Same width'));
eq(pressed(box).join('|'), 'Side by side|Same width', 'Same width is pressed');
check(box.textContent.includes(COPY.compare.drawnSame) && !box.textContent.includes(COPY.compare.drawnTrue), 'and says it is not to scale');
// another body
select.value = 'sun';
fire(select, 'change');
check(/The Sun is 10 times as wide as Jupiter\./.test(box.textContent) || /The Sun is 9\.9 times/.test(box.textContent), `the sentence follows the other body (${box.querySelector('.sr-vs__sentence').textContent})`);
click(byText(box, 'To scale'));
// the lab
click(byText(box, 'All worlds'));
eq(pressed(box)[0], 'All worlds', 'the lab is pressed');
let rows = box.querySelectorAll('.sr-vs__labbtn');
eq(rows.length, 11, 'the lab lists eleven worlds');
eq(rows[0].querySelector('.sr-vs__labname').textContent, 'The Sun', 'widest first');
const own = rows.find((r) => r.dataset.world === 'jupiter');
eq(own.attrs['aria-disabled'], 'true', "the card's own world is marked and is not a button to press");
const bars = box.querySelectorAll('.sr-vs__fill');
check(bars.every((b) => /^\d+(\.\d)?%$/.test(b.style.width)), 'every bar has a percentage width');
// pick Saturn from the lab: back to the pair, with Saturn
click(rows.find((r) => r.dataset.world === 'saturn'));
eq(pressed(box)[0], 'Side by side', 'pressing a row goes back to the pair');
eq(box.querySelector('select').value, 'saturn', 'with that world as the other body');
// order by temperature
click(byText(box, 'All worlds'));
{
  const sel = box.querySelector('select');
  sel.value = 'temp';
  fire(sel, 'change');
  const names = box.querySelectorAll('.sr-vs__labname').map((n) => n.textContent);
  eq(names[0], 'The Sun', 'ordered by temperature the Sun is first');
  eq(names.at(-1), 'Pluto', 'and Pluto last');
  check(box.textContent.includes(COPY.compare.giantNote), 'the temperature lab says what a giant temperature is');
}
// a repaint of the card does not lose the choice
const again = mk();
mountCompare(again, { id: 'jupiter', name: 'Jupiter' }, {});
eq(pressed(again)[0], 'All worlds', 'a remounted panel keeps the view the visitor chose');
// the Earth begins with the Moon; an unknown id builds nothing
const earth = mk();
mountCompare(earth, { id: 'earth', name: 'Earth' }, {});
eq(earth.querySelector('select').value, 'moon', 'the Earth card begins with the Moon');
const none = mk();
mountCompare(none, { id: 'io', name: 'Io' }, {});
eq(none.children.length, 0, 'a world that is not in the table builds nothing');
// every control has a name
walk(box, (n) => {
  if (n.localName === 'button') check(n.textContent.trim().length > 0, 'a button with no words');
  if (n.localName === 'select') check(!!n.parentNode && n.parentNode.localName === 'label', 'a select is inside its label');
  if (n.localName === 'svg') check(!!n.attrs['aria-label'] && n.attrs.role === 'img', 'the picture has a name and a role');
});

// --- 6. where the module sits ------------------------------------------------------------------------------
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(!/from '\.\/compare\.js'/.test(cards) && /import\('\.\/compare\.js'\)/.test(cards), 'cards.js fetches ui/compare.js by dynamic import only');
const src = readFileSync(join(JS, 'ui/compare.js'), 'utf8');
check(!/from 'three'|THREE/.test(src) && !/fetch\(|XMLHttpRequest|localStorage|sessionStorage|location\./.test(src), 'it draws with SVG, fetches nothing, keeps nothing and writes no URL');
const imports = [...src.matchAll(/^import .*? from '([^']+)'/gm)].map((x) => x[1]);
check(imports.every((p) => ['../copy/en.js', '../data/compare.js', './latercss.js'].includes(p)), `it imports only copy, its data and the later-css loader (${imports})`);
const cardRows = /const COMPARABLE = new Set\(\[([^\]]+)\]\)/.exec(cards);
check(!!cardRows && cardRows[1].match(/'(\w+)'/g).map((q) => q.slice(1, -1)).join() === ORDER.join(), 'the ids cards.js offers Compare for are the registry\'s bodies');

if (problems.length) { console.error('compare FAILED:\n  ' + problems.slice(0, 60).join('\n  ')); process.exit(1); }
console.log(`compare ok: ${ORDER.length} bodies from NASA's fact sheets, ${pairs} pairs laid out inside the box in both modes at three widths, ${PROPS.length} measures in the lab, the panel built and pressed`);
