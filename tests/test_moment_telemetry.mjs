#!/usr/bin/env node
// tests/test_moment_telemetry.mjs -- a Moment's flight data (forge #571): the published heights and speeds of a launch.
//
//   node tests/test_moment_telemetry.mjs
//
//   1. EVERY FILE under site/data/moments/telemetry/ holds moments/telemetry.js validateTelemetry: its time goes forward from the
//      lift-off, it keeps the table's own units, every row names a source with a page and a licence, max Q is inside the rows and
//      agrees with the max-Q row. A broken file of each kind is refused.
//   2. THE PUBLISHED NUMBERS are the book's (NASA SP-2000-4029): a few are pinned here, read off the tables on 2026-11-24, so a
//      later edit that "smooths" a row is caught. The conversions are the exact ones.
//   3. THE MOMENTS that name flight data name files that exist, of the same rocket, whose zero is the moment's own epoch.
//   4. THE READOUT is the last row passed, never a value between rows; the cursor is the clock; the comparison is drawn; a press
//      goes to a row's second. Built on a small stand-in document, no browser.
//   5. NOT AT BOOT: the chart module is fetched by the player with import() only; main.js does not name it; every word it shows is
//      in COPY.momentTelemetry, in every language file.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const mod = (p) => import(pathToFileURL(join(JS, p)).href);

const TM = await mod('moments/telemetry.js');
const F = await mod('moments/format.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.telemetry.js');

// --- 1. every file -------------------------------------------------------------------------------------------------------
const dir = join(ROOT, 'site/data/moments/telemetry');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
check(files.length >= 2, `at least two flights of flight data (${files.length})`);
const docs = {};
for (const f of files) {
  let d = null;
  try { d = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { problems.push(`${f}: not JSON (${e.message})`); continue; }
  docs[d.id] = d;
  check(`${d.id}.json` === f, `${f}: its id is ${d.id}`);
  for (const p of TM.validateTelemetry(d)) problems.push(`${f}: ${p}`);
  check(COPY.momentTelemetry.flights[d.flight], `${f}: no words for the flight ${d.flight}`);
  check(COPY.momentTelemetry.rocket[d.rocket], `${f}: no words for the rocket ${d.rocket}`);
  for (const p of d.points) check(COPY.momentTelemetry.events[p.event], `${f}: no words for the event ${p.event}`);
  for (const s of Object.values(d.sources)) check(/^NASA SP-2000-4029$/.test(s.number || ''), `${f}: a source that is not the book (${s.title}): pin its numbers here too`);
}
const good = docs['as-506'];
const broken = (edit) => { const d = JSON.parse(JSON.stringify(good)); edit(d); return TM.validateTelemetry(d); };
check(broken((d) => { d.points[3].t = 10; }).some((s) => /is not after/.test(s)), 'a row out of time order is refused');
check(broken((d) => { d.units.alt = 'km'; }).some((s) => /units.alt/.test(s)), 'a file in converted units is refused');
check(broken((d) => { d.points[2].src = 'nowhere'; }).some((s) => /not in sources/.test(s)), 'a row with no source is refused');
check(broken((d) => { delete d.sources.ascent.page; }).some((s) => /page/.test(s)), 'a source with no page is refused');
check(broken((d) => { d.truth = 'illustrative'; }).some((s) => /truth/.test(s)), 'flight data that call themselves illustrative are refused');
check(broken((d) => { d.maxQ.t = 90; }).some((s) => /disagree/.test(s)), 'a max Q that disagrees with the max-Q row is refused');
check(broken((d) => { d.points[1].event = 'wobble'; }).some((s) => /event/.test(s)), 'an unknown event is refused');
check(broken((d) => { d.points[1].note = 'about'; }).some((s) => /note/.test(s)), 'a note other than "commanded" is refused');

// --- 2. the published numbers -------------------------------------------------------------------------------------------
const row = (d, ev) => d.points.find((p) => p.event === ev);
const a11 = docs['as-506'], a13 = docs['as-508'];
check(a11 && a13, 'Apollo 11 (as-506) and Apollo 13 (as-508) are both there');
if (a11 && a13) {
  // "Apollo 11 Ascent Phase", PDF page 113; "Apollo 13 Ascent Phase", page 160; "Launch Weather", page 289.
  check(row(a11, 'liftoff').t === 0.63 && row(a13, 'liftoff').t === 0.61, 'lift-off at 0.63 s (Apollo 11) and 0.61 s (Apollo 13) of range time');
  check(row(a11, 'maxQ').t === 83.0 && row(a11, 'maxQ').alt === 7.326 && row(a11, 'maxQ').vEarth === 1653.4, 'Apollo 11 max Q: 000:01:23.00, 7.326 nmi, 1 653.4 ft/s');
  check(a11.maxQ.q === 735.17 && a11.maxQ.altFt === 44512 && a13.maxQ.q === 651.63, 'max Q 735.17 lb/ft2 (Apollo 11) and 651.63 (Apollo 13)');
  check(row(a11, 'sicSep').t === 162.3 && row(a11, 'sicSep').note === 'commanded', 'Apollo 11 S-IC/S-II separation at 000:02:42.30, a commanded time');
  check(row(a11, 'orbit').t === 709.33 && row(a11, 'orbit').alt === 103.176 && row(a11, 'orbit').vSpace === 25567.8, 'Apollo 11 in orbit at 000:11:49.33, 103.176 nmi, 25 567.8 ft/s');
  check(row(a13, 'siiCeco').t === 330.64 && row(a13, 'siiPlannedCeco').t - row(a13, 'siiCeco').t > 131.9, "Apollo 13's S-II centre engine off at 330.64 s, 132 s before it was due");
  check(row(a13, 'orbit').t === 759.83, 'Apollo 13 in orbit at 000:12:39.83');
  const s = TM.toSeries(a11);
  const q = s.points.find((p) => p.event === 'maxQ');
  check(near(q.altKm, 13.568, 0.001) && near(q.speedKms, 0.50396, 0.0001), `conversions: 7.326 nmi = 13.568 km, 1 653.4 ft/s = 0.504 km/s (${q.altKm}, ${q.speedKms})`);
  check(near(s.maxQ.kPa, 35.2, 0.01), `735.17 lb/ft2 = 35.20 kPa (${s.maxQ.kPa})`);
  check(TM.NMI_KM === 1.852 && TM.FT_M === 0.3048, 'the exact nautical mile and foot');
  // The speeds go up and the heights do not fall during the ascent, as a table of one ascent must.
  for (const d of [a11, a13]) for (let i = 1; i < d.points.length; i += 1) check(d.points[i].vSpace >= d.points[i - 1].vSpace, `${d.id}: speed falls at row ${i}`);
}

// --- 3. the moments that name them ---------------------------------------------------------------------------------------
const mdir = join(ROOT, 'site/data/moments');
const named = [];
for (const f of readdirSync(mdir).filter((x) => x.endsWith('.json'))) {
  const m = JSON.parse(readFileSync(join(mdir, f), 'utf8'));
  if (!m.telemetry) continue;
  named.push(m.id);
  const tm = TM.telemetryOf(m);
  check(tm, `${f}: telemetry names its files`);
  if (!tm) continue;
  const own = docs[tm.flight];
  check(own, `${f}: telemetry ${tm.flight} is a file of telemetry/`);
  if (own) {
    check(own.epoch === m.epoch, `${f}: the table's zero ${own.epoch} is the moment's epoch ${m.epoch}`);
    check(own.moment === m.id, `${f}: ${tm.flight} belongs to ${own.moment}`);
    const end = own.points[own.points.length - 1].t;
    check(m.span[0] <= own.points[0].t && m.span[1] >= end, `${f}: its span holds the whole table`);
  }
  for (const c of tm.compare) check(docs[c] && own && docs[c].rocket === own.rocket, `${f}: ${c} is a flight of the same rocket`);
}
check(named.includes('apollo-11') && named.includes('apollo-13'), `the Apollo 11 and Apollo 13 moments carry flight data (${named})`);
const bad = (tm) => F.validateMoment({ ...JSON.parse(readFileSync(join(mdir, 'apollo-11.json'), 'utf8')), telemetry: tm }).filter((s) => /telemetry/.test(s));
check(bad({ flight: 'AS 506' }).length === 1, 'validateMoment refuses a telemetry id that is not a file name');
check(bad({ flight: 'as-506', compare: ['as-506'] }).length === 1, 'validateMoment refuses a comparison with itself');
check(bad({ flight: 'as-506', compare: ['as-508'] }).length === 0, 'validateMoment takes a good telemetry');

// --- 4. the panel on a stand-in document -----------------------------------------------------------------------------------
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this._text = ''; this.className = ''; this.hidden = false; this.parentNode = null; }
  append(...ns) { for (const n of ns) { n.parentNode = this; this.children.push(n); } }
  appendChild(n) { this.append(n); return n; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(k, f) { (this.listeners[k] = this.listeners[k] || []).push(f); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); this.parentNode = null; }
  getBoundingClientRect() { return { left: 0, width: 400 }; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  all(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) c.all(pred, out); return out; }
}
const doc = { createElement: (t) => new Node(t), createElementNS: (_, t) => new Node(t) };
const { createTelemetryPanel } = await mod('moments/telemetrychart.js');
const seeks = [];
const met = (s) => `T+${s.toFixed(2)}`;
const panel = createTelemetryPanel({ doc, main: TM.toSeries(a11), compare: [TM.toSeries(a13)], seek: (s) => seeks.push(s), time: met });
const read = () => panel.root.all((n) => /sr-moment__telread/.test(n.className))[0].textContent;
const cursors = () => panel.root.all((n) => n.attrs.class === 'sr-moment__telcursor');
panel.update(-5);
check(read() === COPY.momentTelemetry.before, `before lift-off the readout waits (${read()})`);
panel.update(83);
check(read().startsWith('Max Q, T+83.00: 13.6 km up, 0.5 km/s'), `at T+83 s the readout is the max-Q row (${read()})`);
panel.update(120);
check(read().startsWith('Max Q, T+83.00'), `at T+120 s it is still the last row passed, not a value between rows (${read()})`);
const x120 = cursors()[0].attrs.x1;
panel.update(400);
check(cursors().length === 2 && cursors()[0].attrs.x1 !== x120 && cursors()[0].attrs.x1 === cursors()[1].attrs.x1, 'the cursor follows the clock on both charts');
panel.update(162.3);
check(/\(commanded time\)$/.test(read()), `a commanded time says so (${read()})`);
panel.update(5000);
check(read() === 'The table ends at orbit, T+709.33', `past the table the readout says where it ends (${read()})`);
const dots = panel.root.all((n) => n.tag === 'circle');
check(dots.length === 2 * (a11.points.length + a13.points.length), `a dot per row per chart for both flights (${dots.length})`);
check(panel.root.all((n) => /telline--compare/.test(n.attrs.class || '')).length === 2, 'the other flight is drawn, dashed, on both charts');
check(panel.root.all((n) => n.tag === 'tr').length === a11.points.length + 1, 'a table of the rows for a screen reader');
const svg = panel.root.all((n) => n.tag === 'svg')[0];
svg.listeners.click[0]({ clientX: ((32 + (304 * 83) / 840) * 400) / 340 });
check(seeks.length === 1 && seeks[0] === 83, `a press on the chart goes to the nearest row's second (${seeks})`);
check(panel.toggle.getAttribute('aria-expanded') === 'false' && panel.root.hidden, 'shut until it is opened');
panel.toggle.listeners.click[0]();
check(panel.toggle.getAttribute('aria-expanded') === 'true' && !panel.root.hidden, 'the strip button opens it and says so');
check(TM.rowAt([{ t: 1 }, { t: 5 }], 3) === 0 && TM.rowAt([{ t: 1 }], 0) === -1, 'rowAt is the last row at or before the second');
check(TM.niceTop(187) === 200 && TM.niceTop(7.39) === 10 && TM.niceTop(3.2) === 4, 'round axis tops');

// --- 5. not at boot, and in every language --------------------------------------------------------------------------------
const player = readFileSync(join(JS, 'moments/player.js'), 'utf8');
check(/import\('\.\/telemetrychart\.js'\)/.test(player) && !/^import[^\n]*telemetrychart/m.test(player), 'the player fetches the chart module with import() only');
check(!/telemetry/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'main.js does not name the flight data');
const chart = readFileSync(join(JS, 'moments/telemetrychart.js'), 'utf8');
check(!/['"`]#[0-9a-f]{3,8}['"`]|rgba?\(/i.test(chart), 'the chart module writes no colour of its own (css/moments.css, tokens)');
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const want = keys(COPY.momentTelemetry);
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const L = await import(pathToFileURL(join(JS, `copy/${lang}.js`)).href);
  const tr = L.COPY && L.COPY.momentTelemetry;
  check(tr, `${lang}: has momentTelemetry`);
  if (!tr) continue;
  const have = new Set(keys(tr));
  const miss = want.filter((k) => !have.has(k));
  check(!miss.length, `${lang}: momentTelemetry lacks ${miss.join(', ')}`);
}
check(existsSync(join(ROOT, 'docs/MOMENTS.md')) && /## Flight data/.test(readFileSync(join(ROOT, 'docs/MOMENTS.md'), 'utf8')), 'docs/MOMENTS.md documents the flight data');

if (problems.length) {
  console.error(`FAIL test_moment_telemetry: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`PASS test_moment_telemetry: ${files.length} flights, ${named.length} moments, the panel, ${10} languages`);
