// tests/test_sky_calendar.mjs -- the map's sky calendar (ui/skycalendar.js, forge #553): months in UTC, a chip per kind and
// the calendar file each chip subscribes to, the rows' words in every language, a calendar file a calendar app accepts, and
// every add or subscribe counted as `calendar_add {feed}` with nothing else.
//
//   node tests/test_sky_calendar.mjs
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const C = await import(join(JS, 'ui/skycalendar.js'));
const { SKY_EVENTS, SKY_FEEDS, CHECKED_ON } = await import(join(JS, 'data/skycalendar.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

// --- months, in UTC -------------------------------------------------------------------------------------------------------
check(C.monthKey(Date.parse('2026-11-30T23:59:59Z')) === '2026-11' && C.monthKey(Date.parse('2026-12-01T00:00:00Z')) === '2026-12', 'a month turns at midnight UTC, not at the visitor\'s');
check(C.shiftMonth('2026-12', 1) === '2027-01' && C.shiftMonth('2027-01', -1) === '2026-12' && C.shiftMonth('2027-08', 0) === '2027-08', 'months step across a year');
const [a, b] = C.monthBounds('2027-02');
check(b - a === 28 * 86400e3, 'February 2027 has 28 days');
check(C.startMs({ allDay: true, start: '2026-11-21' }) === Date.parse('2026-11-21T00:00:00Z'), 'an all-day row starts at the start of its day');

// --- the rows and the chips -----------------------------------------------------------------------------------------------
check(SKY_EVENTS.length >= 50 && /^\d{4}-\d{2}-\d{2}$/.test(CHECKED_ON), `the mirror holds the registry's dated events (${SKY_EVENTS.length})`);
const aug = C.eventsInMonth(SKY_EVENTS, '2027-08');
check(aug.some((e) => e.id === 'total-eclipse-2027') && aug.some((e) => e.kind === 'meteor-shower'), 'August 2027 has the total eclipse and a shower');
check(aug.every((e, i) => i === 0 || C.startMs(aug[i - 1]) <= C.startMs(e)), 'a month is in time order');
check(C.eventsInMonth(SKY_EVENTS, '2027-08', 'eclipses').every((e) => ['eclipse', 'lunar-eclipse'].includes(e.kind)), 'the eclipses chip shows eclipses only');
for (const ev of SKY_EVENTS) {
  check(C.CATEGORIES.includes(C.categoryOf(ev.kind)), `${ev.id}: its kind ${ev.kind} is under a chip`);
  check(C.titleOf(ev) && !/[{}]/.test(C.titleOf(ev)) && !/[{}]/.test(C.detailOf(ev)), `${ev.id}: a title and a line with every slot filled ("${C.titleOf(ev)}")`);
  check(ev.link && /^\d{4}-\d{2}-\d{2}T/.test(ev.link.t) && ev.link.at, `${ev.id}: the map's moment and body to open`);
}
const total = SKY_EVENTS.find((e) => e.id === 'total-eclipse-2027');
check(C.titleOf(total) === 'Total solar eclipse' && /2 August 2027, 10:0\d UTC/.test(C.whenOf(total)), `the 2027 eclipse reads as one: ${C.titleOf(total)}, ${C.whenOf(total)}`);

// --- the feeds: one per chip, built by scripts/seo_calendar.py ------------------------------------------------------------
const files = new Set(SKY_FEEDS.map((f) => f.file));
for (const cat of C.CATEGORIES) {
  const f = C.feedFor(cat);
  if (cat === 'launches') { check(f === null, 'launches have no feed: the build has no network, they are added one at a time'); continue; }
  check(files.has(f), `the ${cat} chip subscribes to ${f}, a file scripts/seo_calendar.py writes`);
}
check(C.feedUrl('showers.ics', 'http://127.0.0.1:8190') === 'https://www.spaceradar.ai/events/showers.ics', 'a page on a laptop subscribes to the live site\'s file');
check(C.feedUrl('showers.ics', 'https://www.spaceradar.ai', true) === 'webcal://www.spaceradar.ai/events/showers.ics', 'and as webcal, the scheme a calendar app opens');
const out = mkdtempSync(join(tmpdir(), 'skycal-'));
const py = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, 'scripts'); import seo_pages as P, seo_calendar as C
from pathlib import Path
ev = P.sky_events(); C.write(Path(sys.argv[1]), P.calendar_entries(ev, 'https://www.spaceradar.ai'), str(ev[0]['checked_on']) + 'T00:00:00Z')`, out], { cwd: ROOT, encoding: 'utf8' });
check(py.status === 0, `scripts/seo_calendar.py builds the feeds (${(py.stderr || '').slice(-300)})`);
if (py.status === 0) {
  const built = new Set(readdirSync(join(out, 'events')));
  for (const cat of C.CATEGORIES) { const f = C.feedFor(cat); if (f) check(built.has(f), `${f} is built`); }
  const planets = readFileSync(join(out, 'events', 'planets.ics'), 'utf8');
  check(/X-WR-CALNAME:Space Radar: planets close together/.test(planets) && (planets.match(/BEGIN:VEVENT/g) || []).length === SKY_EVENTS.filter((e) => e.kind === 'conjunction').length,
    'planets.ics holds the conjunctions and nothing else');
}
rmSync(out, { recursive: true, force: true });

// --- one event as a calendar file -----------------------------------------------------------------------------------------
const ics = C.eventIcs(total, { title: 'Total solar eclipse, a long title with commas, semicolons; and ünïcödé to fold past seventy-five octets', description: 'x', url: 'https://www.spaceradar.ai/events/total-eclipse-2027.html', nowMs: Date.parse('2026-11-24T00:00:00Z') });
const lines = ics.split('\r\n');
check(ics.endsWith('\r\n') && !/[^\r]\n/.test(ics), 'CRLF line ends');
check(lines.every((l) => new TextEncoder().encode(l).length <= 75), 'no line longer than 75 octets (RFC 5545 3.1)');
check(/UID:total-eclipse-2027@spaceradar\.ai/.test(ics), 'the UID of the page\'s own file: added from both, it is one entry');
check(/DTSTART:20270802T100\d\d\dZ/.test(ics) && /TRIGGER:-P1D/.test(ics) && /SUMMARY:Total solar eclipse\\, a long/.test(ics), 'the instant in UTC, a reminder the day before, the text escaped');
check(['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'BEGIN:VALARM'].every((x) => ics.split(x).length === ics.split(x.replace('BEGIN', 'END')).length), 'every BEGIN has its END');
const mission = SKY_EVENTS.find((e) => e.kind === 'mission');
check(/DTSTART;VALUE=DATE:\d{8}/.test(C.eventIcs(mission, { title: 'm' })), 'a mission\'s day is an all-day entry, never a made-up minute');

// --- the launches the map holds -------------------------------------------------------------------------------------------
const L = C.launchEvents([{ id: 'l1', name: 'Artemis III', meta: { netMs: Date.parse('2027-08-10T12:00:00Z') } }, { id: 'l2', name: 'X', meta: { netMs: Date.parse('2027-09-01T00:00:00Z'), netPrecision: 'Month' } }, { id: 'l3', meta: {} }]);
check(L.length === 2 && L[0].kind === 'launch' && !L[0].allDay && L[1].allDay && C.detailOf(L[1]) === COPY.skyCalendar.details.launchRough, 'a launch keeps its time; one known only to the month says so');
check(C.eventsInMonth(SKY_EVENTS.concat(L), '2027-08', 'launches').length === 1, 'the launches chip shows the launches of that month');

// --- counted, and nothing more ---------------------------------------------------------------------------------------------
const src = readFileSync(join(JS, 'ui/skycalendar.js'), 'utf8');
const calls = [...src.matchAll(/track\('calendar_add', \{ feed: ([^}]+) \}\)/g)].map((m) => m[1].trim());
check(calls.length >= 2 && calls.every((c) => /^(file|main\.dataset\.feed|ev\.kind === 'launch' \? 'launch\.ics' : file)$/.test(c)), `every add and subscribe is calendar_add with the file's name only (${calls.join(' | ')})`);
check(!/fetch\(/.test(src), 'the calendar fetches nothing: its rows are the mirror and the layer the map already holds');

// --- the words, in every language ------------------------------------------------------------------------------------------
await import(join(JS, 'copy/en.skycalendar.js'));
const leaves = (o) => Object.values(o).flatMap((v) => (v && typeof v === 'object' ? leaves(v) : [v]));
const keyLeaves = (o, p = []) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keyLeaves(v, [...p, k]) : [JSON.stringify([...p, k])]));
const at = (o, k) => JSON.parse(k).reduce((x, y) => (x == null ? x : x[y]), o);
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const text = readFileSync(join(JS, `copy/${lang}.js`), 'utf8');
  for (const [marker, sect] of [['sky calendar', 'skyCalendar'], ['eclipse checker', 'eclipseCheck']]) {
    const s = text.indexOf(`// research train (catalogues): ${marker}: begin`);
    const e = text.indexOf(`// research train (catalogues): ${marker}: end`);
    const block = s >= 0 && e > s ? text.slice(s, e) : '';
    const m = block.match(new RegExp(`COPY\\.${sect} = (\\{[\\s\\S]*\\});`));
    let obj = null;
    try { obj = m ? JSON.parse(m[1]) : null; } catch { obj = null; }
    check(obj, `copy/${lang}.js has COPY.${sect} between its markers, as JSON`);
    if (!obj) continue;
    const want = keyLeaves(COPY[sect]);
    const have = new Set(keyLeaves(obj));
    for (const k of want) check(have.has(k) && String(at(obj, k)).trim() !== '', `copy/${lang}.js: ${sect}.${JSON.parse(k).join('.')}`);
    const enSlots = (k) => (at(COPY[sect], k).match(/\{\w+\}/g) || []).sort().join();
    for (const k of want) if (have.has(k)) check((String(at(obj, k)).match(/\{\w+\}/g) || []).sort().join() === enSlots(k), `copy/${lang}.js: ${sect}.${k} keeps its slots`);
  }
}
void leaves;

// --- the two views, built and pressed in a document just big enough (tests/helpers/fakedom.mjs) ------------------------------
{
  const { install, click, walk } = await import(join(ROOT, 'tests/helpers/fakedom.mjs'));
  const document = install();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(readFileSync(join(ROOT, 'site/data/eclipse-2027-places.json'), 'utf8')) });
  const { mountEclipseCheck } = await import(join(JS, 'ui/eclipsecheck.js'));
  const ctx = { clock: { now: () => Date.parse('2027-08-15T00:00:00Z'), goTo(ms) { this.went = ms; } }, recordsFor: () => [], recordById: (id) => ({ id }), select(r) { ctx.sel = r; } };
  const find = (root, test) => { const out = []; walk(root, (n) => { if (n.classList && test(n)) out.push(n); }); return out; };
  const links = [];
  const pane = document.createElement('div');
  C.mountSkyCalendar(pane, ctx, { writeLink: (a) => links.push(a) });
  const rowsNow = () => find(pane, (n) => n.classList.contains('sr-cal__row'));
  check(rowsNow().length === C.eventsInMonth(SKY_EVENTS, '2027-08').length && rowsNow().length >= 3, `the clock's month opens: August 2027, ${rowsNow().length} rows`);
  const next = find(pane, (n) => n.attrs && n.attrs['aria-label'] === COPY.skyCalendar.next)[0];
  click(next);
  check(links.at(-1) === '2027-09', 'Next month steps on and says so in the address (cat=calendar:2027-09)');
  const chip = find(pane, (n) => n.classList.contains('ui-chip') && n.dataset.id === 'eclipses')[0];
  click(chip);
  check(chip.attrs['aria-pressed'] === 'true' && rowsNow().every((r) => /eclipse/.test(r.dataset.kind)), 'a chip is pressed with aria-pressed and leaves its kind only');
  const sub = find(pane, (n) => n.classList.contains('sr-cal__subscribe'))[0];
  check(sub && sub.dataset.feed === 'eclipses.ics' && /^webcal:/.test(sub.attrs.href || sub.href || ''), 'the ember action subscribes to the chip\'s own feed');
  click(find(pane, (n) => n.classList.contains('ui-chip') && n.dataset.id === 'all')[0]);
  const go = find(pane, (n) => n.classList.contains('sr-cal__go'))[0];
  click(go);
  check(Number.isFinite(ctx.clock.went) && ctx.sel && ctx.sel.id, 'a row\'s name moves the clock to that moment and selects its body');
  const pane2 = document.createElement('div');
  mountEclipseCheck(pane2, ctx, { writeLink: (a) => links.push(a) }).show('Luxor');
  await new Promise((r) => setTimeout(r, 30));
  const head = find(pane2, (n) => n.classList.contains('sr-ecl__head'))[0];
  check(head && head.dataset.kind === 'total' && /6 min 2\d s/.test(head.textContent) && links.at(-1) === 'Luxor', `#cat=eclipse:Luxor answers "${head && head.textContent}", and only the name is in the address`);
  globalThis.fetch = realFetch;
}

// --- the budget ------------------------------------------------------------------------------------------------------------
{
  const yaml = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
  const m = yaml.match(/id: sky_calendar_mirror_bytes, value: (\d+)/);
  const size = readFileSync(join(ROOT, 'site/js/data/skycalendar.js')).length;
  check(m && size <= Number(m[1]), `site/js/data/skycalendar.js is ${size} B, inside sky_calendar_mirror_bytes (${m && m[1]})`);
}

if (problems.length) { console.error(`sky calendar FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`sky calendar ok: ${SKY_EVENTS.length} dated events by UTC month, ${C.CATEGORIES.length} chips each with its feed (launches none), a calendar file with the page's UID, every add and subscribe counted by file name only, and the words in eleven languages`);
