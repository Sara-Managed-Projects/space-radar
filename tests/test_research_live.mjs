// tests/test_research_live.mjs -- the research train "live" (forge #547, #548, #544, #546; the awesome-space research
// of 2026-11-23): a catalogue's day (ui/releaseday.js and its row of Coming up), the space weather row against a frozen
// NOAA feed (ui/spacepanel.js), the station's live camera (ui/isscam.js: nothing of YouTube's before the press) and the
// home's day card (ui/daycard.js: every part has a source). Node only, no network, no browser.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// --- 1. Gaia DR4's day (forge #547) ------------------------------------------------------------------------------
const R = await import(join(JS, 'ui/releaseday.js'));
const { EVENT_TYPES } = await import(join(JS, 'data/events.registry.js'));
const { buildEvents, releaseDayMs } = await import(join(JS, 'data/events.js'));
const N = await import(join(JS, 'ui/next.js'));
const { icsEvent } = await import(join(JS, 'data/ics.js'));
const at = (iso) => Date.parse(iso);
const rows = R.releaseDates(EVENT_TYPES);
const gaia = rows.find((r) => r.id === 'gaia-dr4');
check(!!gaia, 'registry/events.yaml data-release carries gaia-dr4');
if (gaia) {
  check(gaia.date === '2026-12-02' && gaia.object === 'deep-gaia', `DR4 is ESA's 2 December 2026, on Gaia's card (${gaia.date}, ${gaia.object})`);
  check(/^https:\/\/www\.cosmos\.esa\.int\//.test(gaia.source || '') && /^\d{4}-\d{2}-\d{2}$/.test(gaia.read || ''), 'the date names ESA\'s page and the day it was read');
  check(releaseDayMs(gaia.date) === at('2026-12-02T12:00:00Z'), 'a day with no hour stands at noon UTC');
  const chip = (iso) => { const h = R.chipRelease(at(iso), rows); return h ? R.chipWords(h.row, h.state, 'Gaia').text : null; };
  check(chip('2026-11-23T23:00:00Z') === null, 'no chip before chip_from');
  check(chip('2026-11-24T08:00:00Z') === 'Gaia DR4 · in 8 days', `eight days out on 24 November (${chip('2026-11-24T08:00:00Z')})`);
  check(chip('2026-12-01T23:59:00Z') === 'Gaia DR4 · tomorrow', 'tomorrow, by the UTC day');
  check(chip('2026-12-02T00:01:00Z') === 'Gaia DR4 · today' && chip('2026-12-02T23:00:00Z') === 'Gaia DR4 · today', 'today all day long: no hour is claimed');
  check(chip('2026-12-03T10:00:00Z') === 'Gaia DR4 is out', 'out after the day');
  check(chip('2026-12-05T00:00:00Z') === null, 'no chip after chip_until');
  for (const iso of ['2026-11-24T08:00:00Z', '2026-12-01T20:00:00Z', '2026-12-02T09:00:00Z']) {
    const h = R.chipRelease(at(iso), rows);
    check(h && !/\d{1,2}:\d{2}|hour/i.test(R.chipWords(h.row, h.state).text), `the chip never counts hours (${iso})`);
  }
  check(R.releaseFor({ id: 'deep-gaia' }, at('2026-11-24T08:00:00Z'), rows) === gaia, 'Gaia\'s card tells it from the chip\'s first day');
  check(R.releaseFor({ id: 'deep-gaia' }, at('2027-01-15T08:00:00Z'), rows) === null, 'and leaves it a month after');
  check(R.releaseFor({ id: 'earth' }, at('2026-11-24T08:00:00Z'), rows) === null, 'another card does not');
  const w = R.releaseWords(gaia, at('2026-11-24T08:00:00Z'));
  check(w && w.lines.length === 5, `the section: when, what DR4 is, our stars, what follows, where Gaia is (${w && w.lines.length})`);
  check(w && /Nothing changes on this map on the day/.test(w.lines.join(' ')), 'it says nothing on the map changes on the day');
  check(w && !/will (be )?refresh(ed)? on/i.test(w.lines.join(' ')), 'it never promises a refresh on the day');
  check(w && w.journal === null && R.releaseWords(gaia, at('2026-11-30T09:00:00Z')).journal === gaia.journal, 'the Journal post is linked from its own day, not before');
  check(w && /ESA/.test(w.sources) && /24 November 2026/.test(w.sources), `its source line (${w && w.sources})`);
  // Coming up: one row, the date and never a countdown.
  const dr = EVENT_TYPES.find((x) => x.id === 'data-release');
  const evs = buildEvents([{ id: 'deep-gaia', name: 'Gaia' }], at('2026-11-24T08:00:00Z'), { horizonMs: 30 * 86400e3 }).filter((e) => e.type === 'data-release');
  check(dr && evs.length === 1 && evs[0].record && evs[0].record.id === 'deep-gaia' && evs[0].t_precision === 'day', 'one event, about Gaia\'s record, to the day');
  const items = N.buildNextItems([], at('2026-11-24T08:00:00Z'), {}).filter((it) => it.kind === 'release');
  check(items.length === 1, 'Coming up has a row for it');
  if (items[0]) {
    const p = N.rowParts(items[0], at('2026-11-24T08:00:00Z'));
    check(p.title === 'Gaia DR4 goes public' && /2 December 2026/.test(p.detail) && !/\bin \d/.test(p.detail), `the row says the date (${p.title} / ${p.detail})`);
    check(/no hour/.test(N.classText(items[0])), 'its class line says the agency gives no hour');
    const ics = icsEvent(items[0]);
    check(ics && ics.allDay === true, 'the calendar file is that whole day');
  }
  check(N.buildNextItems([], at('2026-12-03T08:00:00Z'), {}).every((it) => it.kind !== 'release'), 'gone from Coming up the day after');
}
check(/- id: data-release[\s\S]*dates:[\s\S]*- id: gaia-dr4/.test(read('registry/events.yaml')), 'the event is a row of registry/events.yaml');

// --- 2. The space weather row (forge #548), a frozen NOAA feed ---------------------------------------------------
const S = await import(join(JS, 'ui/spacepanel.js'));
const { parseSpaceWeather } = await import(join(JS, 'data/parsers.js'));
const fx = JSON.parse(read('tests/fixtures/swpc-kp-forecast-2026-11-24.json'));
const parsed = parseSpaceWeather(fx);
const frozenNow = at('2026-11-24T07:00:00Z');
const days = S.outlookDays(parsed, frozenNow);
check(days.length === 3, `three days of forecast (${days.length})`);
const predicted = fx.filter((r) => r.observed === 'predicted');
for (const d of days) {
  const inDay = predicted.filter((r) => Math.floor(Date.parse(`${r.time_tag}Z`) / 86400e3) * 86400e3 === d.dayMs).map((r) => r.kp);
  check(inDay.length && d.kp === Math.max(...inDay), `a day's value is its highest PREDICTED bin (${new Date(d.dayMs).toISOString().slice(0, 10)}: ${d.kp})`);
}
check(days.every((d, i) => i === 0 || d.dayMs > days[i - 1].dayMs), 'the days in order');
const pw = S.panelWords(parsed, { fetchedAt: frozenNow - 60e3, via: 'snapshot', stale: false }, frozenNow);
check(/measured/.test(pw.measured) && /NOAA SWPC/.test(pw.measured), `the measured line is measured and sourced (${pw.measured})`);
check(/from our copy/.test(pw.measured), 'and says it came from our copy');
check(/Measured is NOAA’s reading/.test(pw.note) && /forecast/.test(pw.note), 'measured and forecast are said apart');
check(pw.storm.length === 4 && pw.storm.every((s) => /G\d/.test(s)), 'what a storm does, by NOAA\'s G scale');
check(/NOAA/.test(pw.sources), 'its source line');
const none = S.panelWords(null, null, frozenNow);
check(none.measured === 'Could not read NOAA’s space weather just now.' && none.days.length === 0, 'no feed: it says so and invents nothing');
const storm = parseSpaceWeather([
  { time_tag: '2026-11-25T00:00:00', kp: 6.33, observed: 'predicted', noaa_scale: 'G2' },
  { time_tag: '2026-11-25T03:00:00', kp: 4.0, observed: 'predicted', noaa_scale: null },
]);
const sd = S.outlookDays(storm, at('2026-11-24T12:00:00Z'));
check(sd.length === 1 && sd[0].scale === 'G2', 'a G2 forecast is tagged G2');
check(/'swpc-kp'/.test(read('site/js/ui/spaceweather.js')) && /readSpaceWeather/.test(read('site/js/ui/spacepanel.js')), 'one reader of the one source: ui/spaceweather.js, our copy first');
check(/id: swpc-kp[\s\S]{0,300}outputs: \[space-weather\.json\]/.test(read('registry/sources.yaml')), 'swpc-kp has its saved copy (data/v1/space-weather.json)');

// --- 3. The station's live camera (forge #544) --------------------------------------------------------------------
const C = await import(join(JS, 'ui/isscam.js'));
const cam = C.cameraFor({ id: 'sat-25544' });
check(cam && /^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(cam.url), `the station's player is YouTube's privacy-enhanced one (${cam && cam.url})`);
check(cam && /^\d{4}-\d{2}-\d{2}$/.test(cam.checked) && /^https:\/\//.test(cam.watch) && /nasa\.gov/.test(cam.page), 'with its check date, its YouTube page and NASA Live');
check(C.cameraFor({ id: 'earth' }) === null, 'no player on another card');
check(/autoplay=1&mute=1/.test(C.frameSrc(cam)), 'it starts muted, as browsers require for a player that starts itself');
check(C.lightLine('shadow').includes('Earth’s shadow') && C.lightLine('sunlit').includes('sunlight') && C.lightLine(null) === '', 'the light line follows the map\'s own sunlit state');
const camSrc = read('site/js/ui/isscam.js');
// The row is built without a frame: the only iframe is made inside openCamera, which only the button's click calls.
const rowFn = camSrc.slice(camSrc.indexOf('export function mountCameraRow'));
check(!/iframe|youtube|\.src\s*=/.test(rowFn.replace(/\/\/.*$/gm, '')), 'the card\'s row asks nothing of YouTube: no frame, no address');
check(/addEventListener\('click', \(\) => openCamera\(/.test(rowFn), 'the player opens on the press');
check((camSrc.match(/createElement|el\('iframe'\)/g) || []).length >= 1 && (camSrc.match(/el\('iframe'\)/g) || []).length === 1, 'one frame, in one place');
check(!/<link[^>]+(preconnect|dns-prefetch)[^>]+youtube/i.test(read('site/index.html')), 'no preconnect to YouTube in the page');
check(/often black, blue or a test card/.test(read('site/js/copy/en.live.js')), 'the row says the feed is often dark or a test card');

// --- 4. The day card (forge #546): every part has a source -------------------------------------------------------
const Dc = await import(join(JS, 'ui/daycard.js'));
// The card reads this month's file (scripts/gen_thisday.py), not the whole missions mirror: the first minute's bytes.
const monthOf = (iso) => Dc.missionsFromMonth(JSON.parse(read(`site/data/thisday/${iso.slice(5, 7)}.json`)));
check(!/data\/missions\.js/.test(read('site/js/ui/daycard.js').replace(/\/\/.*$/gm, '')), 'the day card does not import the 30 kB missions mirror');
const { MISSIONS } = await import(join(JS, 'data/missions.js'));
for (const iso of ['2026-11-24T10:00:00Z', '2026-07-16T13:00:00Z', '2027-01-03T00:00:00Z', '2026-12-25T18:00:00Z', '2026-05-10T00:00:00Z']) {
  const full = Dc.thisDay(at(iso), MISSIONS);
  const small = Dc.thisDay(at(iso), monthOf(iso));
  check((full && full.id) === (small && small.id), `${iso}: the month's file picks what the whole registry would (${full && full.id} / ${small && small.id})`);
}
for (const iso of ['2026-11-24T10:00:00Z', '2026-07-16T13:00:00Z', '2027-03-01T00:00:00Z', '2026-12-25T18:00:00Z']) {
  const parts = Dc.dayParts(at(iso), monthOf(iso));
  check(parts.length === 3, `three parts on ${iso} (${parts.map((p) => p.id)})`);
  for (const p of parts) {
    check(typeof p.source === 'string' && p.source.length > 3, `${iso} ${p.id}: has a source line`);
    check(['event', 'earth', 'tonight'].includes(p.act), `${iso} ${p.id}: goes into the map (${p.act})`);
    check(p.title && p.kicker, `${iso} ${p.id}: a kicker and a title`);
  }
}
const july = Dc.thisDay(at('2026-07-16T13:00:00Z'), monthOf('2026-07-16'));
check(!!(july && july.exact), `16 July has an event on the day (${july && july.id})`);
const nov = Dc.thisDay(at('2026-11-24T10:00:00Z'), monthOf('2026-11-24'));
check(nov && !nov.exact && nov.tMs < at('2026-11-24T10:00:00Z'), `with none on the day, the nearest within a fortnight, and never a future event (${nov && nov.id})`);
const earth = Dc.earthToday(at('2026-11-24T10:00:00Z'));
check(earth && earth.latDeg < -20 && earth.latDeg > -21 && earth.season === 'december' && earth.days === 27, `the Sun overhead at about 20.6 S, 27 days to the December solstice (${earth && earth.latDeg}, ${earth && earth.days})`);
const sky = Dc.skyToday(at('2026-11-24T10:00:00Z'));
check(sky && sky.pct >= 99, `the Moon full on 24 November 2026 (${sky && sky.pct} %)`);
const sw = Dc.shareWords(Dc.dayParts(at('2026-11-24T10:00:00Z'), monthOf('2026-11-24')), at('2026-11-24T10:00:00Z'));
check(/24 November 2026/.test(sw.name) && sw.line.length > 20, 'the share sheet gets a name and a line');
check(/opts\.words && opts\.words\.name/.test(read('site/js/ui/sharesheet.js')), 'the share flow is the share sheet\'s own (opts.words)');
check(!/transition|animation/.test(read('site/css/live.css')), 'nothing in the new sheet moves, so reduced motion has nothing to stop');

// --- 5. Words: the four sections, not in the boot graph ----------------------------------------------------------
const boot = read('site/js/main.js');
check(!/en\.live\.js/.test(boot), 'main.js does not import the new words');
const langs = ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar'];
for (const l of langs) {
  const f = read(`site/js/copy/${l}.js`);
  for (const k of ['releaseDay', 'spacePanel', 'issCam', 'dayCard']) check(new RegExp(`COPY\\.${k} = `).test(f), `${l}.js translates COPY.${k}`);
  check(/COPY\.nextList\.row\.dataReleaseTitle = /.test(f), `${l}.js translates the Coming up row`);
}

if (problems.length) {
  console.error(`research train (live): ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('research train (live) ok: Gaia DR4 counted in days and never hours, a frozen NOAA feed read as measured and forecast apart, the camera asks nothing of YouTube before the press, and every part of the day card names its source');
