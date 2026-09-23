// tests/test_events.mjs -- spec 0031: one event stream, and eclipses computed in the browser.
//
// The eclipse times below are what the vendored astronomy-engine 2.1.19 (site/vendor/astronomy.js)
// computed on the first run, 2026-09-23, pinned to the minute. CHECKED AGAINST NASA GSFC's tables
// the same day (https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html and
// https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html, Fred Espenak), whose greatest-eclipse
// times are in TD. Converted with the library's own TD - UT (76 s for 2027, Espenak-Meeus), all six
// agree within 6 s; the PR that added this file quotes the rows. In UT the library's peaks may sit
// a few seconds early of what the Earth really does, because the measured TD - UT is nearer 69 s:
// seconds, inside the minute the rows print.

// "Local" is the visitor's own clock, and the local-circumstances line prints it. Pin the zone to
// the fixture place before anything formats a time, or the row reads in this machine's zone.
process.env.TZ = 'Europe/Madrid';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deepStrictEqual } from 'node:assert';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { buildEvents, nextEvent, localCircumstances, nearestCity, whereWords, BUILT_TYPES } = await import(join(JS, 'data/events.js'));
const { EVENT_TYPES } = await import(join(JS, 'data/events.registry.js'));
const { buildNextItems, rowText, classText } = await import(join(JS, 'ui/next.js'));
const { CITIES } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];

const H = 3600e3, D = 24 * H;
const now = Date.UTC(2026, 8, 22);
const iso = (ms) => new Date(ms).toISOString().slice(0, 16) + 'Z';
const near = (ms, want, tolS = 60) => Math.abs(ms - Date.parse(want)) <= tolS * 1000;

// 1. The mirror is the registry, and only what has a builder is built -----------------------------
{
  const ids = EVENT_TYPES.map((x) => x.id);
  check(ids.length === 12, `twelve event types in the mirror (${ids.length})`);
  const off = EVENT_TYPES.filter((x) => !x.enabled).map((x) => x.id).sort().join(',');
  check(off === 'conjunction,decay,mission-milestone,reentry', `the four types with no builder or no secret are switched off (${off})`);
  check(BUILT_TYPES.join(',') === 'launch,meteor-shower,close-approach,solar-eclipse,lunar-eclipse,station-pass,starlink-train,aurora', `built types, in registry order: ${BUILT_TYPES}`);
}

// 2. The eclipses of the next 400 days from 2026-09-22 ------------------------------------------
const events = buildEvents([], now, {});
const solar = events.filter((e) => e.type === 'solar-eclipse');
const lunar = events.filter((e) => e.type === 'lunar-eclipse');
{
  // NASA GSFC SEdecade2021: "2027 Feb 06 16:00:47 Annular" and "2027 Aug 02 10:07:49 Total" (TD).
  // The library: 15:59:33 and 10:06:35 UT, which is 16:00:48 and 10:07:50 TD.
  check(solar.length === 2, `two solar eclipses in 400 days (${solar.map((e) => iso(e.t))})`);
  const feb = solar.find((e) => e.id === 'solar-eclipse:2027-02-06');
  const aug = solar.find((e) => e.id === 'solar-eclipse:2027-08-02');
  check(feb && feb.kind === 'annular' && near(feb.t, '2027-02-06T15:59:33Z'), `2027-02-06 is annular, peak 15:59:33 UT (${feb && feb.kind} ${feb && iso(feb.t)})`);
  check(aug && aug.kind === 'total' && near(aug.t, '2027-08-02T10:06:35Z'), `2027-08-02 is total, peak 10:06:35 UT (${aug && aug.kind} ${aug && iso(aug.t)})`);
  check(aug && aug.obscuration === 1 && feb && feb.obscuration > 0.8 && feb.obscuration < 1, 'total covers the whole Sun at the centre line, annular leaves a ring');
  // The centre of the shadow at peak: Egypt, near Luxor, for August; the South Atlantic for February.
  check(aug && aug.where && Math.abs(aug.where.lat - 25.5) < 0.5 && Math.abs(aug.where.lon - 33.2) < 0.5, `August's shadow is deepest over Egypt (${aug && aug.where && [aug.where.lat.toFixed(1), aug.where.lon.toFixed(1)]})`);
  check(aug && aug.where.words === 'about 500 km from Cairo', `and the row says how far from the nearest city, not that it crosses it: "${aug && aug.where.words}"`);
  check(feb && /km from Sao Paulo$/.test(feb.where.words), `February's point is at sea, so the row gives a distance: "${feb && feb.where.words}"`);

  // NASA GSFC LEdecade2021: "2027 Feb 20 23:14:06 Penumbral", "2027 Jul 18 16:04:09 Penumbral",
  // "2027 Aug 17 07:14:59 Penumbral" (TD). Pinned from the library's own answers on the first run:
  // 23:12:44, 16:02:55, 07:13:45 UT, which is 23:13:59, 16:04:10, 07:15:00 TD.
  check(lunar.length === 3 && lunar.every((e) => e.kind === 'penumbral'), `three penumbral lunar eclipses (${lunar.map((e) => `${e.kind} ${iso(e.t)}`)})`);
  check(lunar[0] && lunar[0].id === 'lunar-eclipse:2027-02-20' && near(lunar[0].t, '2027-02-20T23:12:44Z'), `the first is 2027-02-20 23:12 UT (${lunar[0] && iso(lunar[0].t)})`);
  check(lunar[1] && near(lunar[1].t, '2027-07-18T16:02:55Z') && lunar[2] && near(lunar[2].t, '2027-08-17T07:13:45Z'), 'then 2027-07-18 and 2027-08-17');
  check(lunar[0] && lunar[0].t_window[0] < lunar[0].t && lunar[0].t < lunar[0].t_window[1] && (lunar[0].t_window[1] - lunar[0].t_window[0]) > 3 * H, 'a lunar eclipse carries its penumbral window, hours long');

  for (const e of [...solar, ...lunar]) {
    check(e.class === 'measured' && e.source === 'computed' && e.t_precision === 'minute' && e.prominence === 1 && e.location_dependent === true, `${e.id} is computed, to the minute, prominence 1`);
    check(typeof e.say === 'string' && e.say.includes(e.kind === 'total' ? 'Total' : e.kind === 'annular' ? 'Annular' : 'Penumbral') && !/expected/i.test(e.say), `${e.id} says its kind and never "expected": "${e.say}"`);
  }
  check(events.every((e, i) => i === 0 || events[i - 1].prominence < e.prominence || (events[i - 1].prominence === e.prominence && events[i - 1].t <= e.t)), 'the stream is ordered by prominence, then time');
  check(events.every((e) => e.t > now), 'nothing already over');
}

// 3. nextEvent(), the one call spec 0030 makes ------------------------------------------------------
{
  const n = nextEvent('solar-eclipse', now);
  check(n && n.id === 'solar-eclipse:2027-02-06' && n.kind === 'annular', `nextEvent('solar-eclipse') from 2026-09-22 is the February annular (${n && n.id})`);
  const after = nextEvent('solar-eclipse', n.t);
  check(after && after.id === 'solar-eclipse:2027-08-02', `and from that one's peak, the August total (${after && after.id})`);
  check(nextEvent('lunar-eclipse', now)?.id === 'lunar-eclipse:2027-02-20', 'the next lunar eclipse');
  check(nextEvent('nonsense', now) === null, 'an unknown type is null');
  check(nextEvent('reentry', now) === null && nextEvent('conjunction', now) === null, 'a disabled type is null');
  check(nextEvent('station-pass', now) === null, 'a pass with no place and no records is null, not a throw');
  check(nextEvent('solar-eclipse', NaN) === null, 'a bad time is null');
  const far = nextEvent('solar-eclipse', Date.UTC(2027, 7, 3));
  check(far && far.id === 'solar-eclipse:2028-01-26', `a later start finds a later eclipse (${far && far.id})`);
}

// 4. A solar eclipse from one place ---------------------------------------------------------------
const place = (latDeg, lonDeg) => ({ latDeg, lonDeg, latRad: latDeg * Math.PI / 180, lonRad: lonDeg * Math.PI / 180, altKm: 0 });
const madrid = place(40.4168, -3.7038);
const auckland = place(-36.8485, 174.7633);
{
  const aug = solar.find((e) => e.id === 'solar-eclipse:2027-08-02');
  const m = localCircumstances(aug, madrid);
  // THE SPEC SAID "over 90 %". The library says 86 % of the Sun's area: Madrid is north of the path
  // of totality, which NASA's table runs through the south of Spain. The test pins the library's
  // number and the spec's figure is corrected in the PR (2026-09-23).
  check(m && m.visible === true && m.obscuration > 0.85 && m.obscuration < 0.9, `Madrid sees 86 % of the Sun covered (${m && m.obscuration && (m.obscuration * 100).toFixed(1)} %)`);
  check(m && m.beginMs < m.peakMs && m.peakMs < m.endMs && near(m.peakMs, '2027-08-02T08:51:08Z'), `begins, deepest, ends in order, deepest 08:51 UT (${m && iso(m.peakMs)})`);
  const a = localCircumstances(aug, auckland);
  check(a && a.visible === false, `Auckland does not see it (${JSON.stringify(a)})`);
  check(localCircumstances(aug, null) === null, 'no place, no local line');
  check(localCircumstances(lunar[0], madrid) === null, 'a lunar eclipse has no solar local circumstances');
  const withPlace = buildEvents([], now, { observer: madrid }).find((e) => e.id === aug.id);
  check(withPlace && withPlace.local && withPlace.local.visible === true, 'with an observer, the stream carries the local circumstances');

  // The row text at the two fixture places, as the PR quotes it (times in Madrid's own clock).
  const rowAt = (obs) => {
    const it = buildNextItems([], now, { observer: obs, eclipses: true }).find((x) => x.kind === 'solar-eclipse');
    return it ? rowText(it, now) : null;
  };
  // buildNextItems shows the NEXT solar eclipse, February's, so the August row is told directly.
  const augItem = (obs) => ({ kind: 'solar-eclipse', record: null, tMs: aug.t, eclipseKind: aug.kind, where: aug.where, local: localCircumstances(aug, obs), event: aug });
  const madridRow = rowText(augItem(madrid), now);
  const aucklandRow = rowText(augItem(auckland), now);
  check(/From where you are: begins 09:45, deepest 10:51 with 86% of the Sun covered, ends 12:02$/.test(madridRow), `Madrid's row: "${madridRow}"`);
  check(/Not visible from where you are$/.test(aucklandRow), `Auckland's row: "${aucklandRow}"`);
  notes.push(`Madrid, 2027-08-02: "${madridRow}"`);
  notes.push(`Auckland, 2027-08-02: "${aucklandRow}"`);
  notes.push(`Madrid, next solar eclipse: "${rowAt(madrid)}"`);
}

// 5. The move changed no row: a twelve-row launch and approach fixture ----------------------------
// Expected is what buildNextItems() returned for this fixture on origin/main (f1064a2), before the
// builders moved to data/events.js, dumped 2026-09-23 and pasted here.
{
  const launch = (id, dt, extra = {}) => ({ id, name: id, layer: 'launches', klass: 'rocket', meta: { netMs: now + dt, ...extra } });
  const neo = (id, dt, meta = {}) => ({ id, name: id, layer: 'asteroids', klass: 'asteroid', meta: { closeApproachMs: now + dt, ...meta } });
  const fixture = [
    launch('Falcon 9 Block 5 | Starlink 10-12', 5 * H, { netPrecision: 'Hour', statusAbbrev: 'Go' }),
    launch('Electron | Owl For One', 2 * D, { netPrecision: 'Minute', statusAbbrev: 'Go' }),
    launch('Long March 8A', 26 * H, { statusAbbrev: 'TBC' }),
    launch('Ariane 6 | VA266', 20 * D, { netPrecision: 'Month', statusAbbrev: 'TBD' }),
    launch('Already gone', -2 * H, { statusAbbrev: 'Success' }),
    launch('Next quarter', 45 * D, { netPrecision: 'Quarter' }),
    neo('2026 RX1', 3 * H, { missDistanceLd: 0.42 }),
    neo('(99942) Apophis', 12 * D, { missDistanceKm: 5.9e6 }),
    neo('2026 SB', 7 * D, {}),
    neo('2026 QQ3', -1 * D, { missDistanceLd: 3.1 }),
    neo('2026 RF7', 29 * D, { missDistanceLd: 12.5 }),
    neo('2026 SA', 31 * D, { missDistanceLd: 8 }),
  ];
  const before = [
    { kind: 'approach', record: '2026 RX1', tMs: 1790046000000, ld: 0.42 },
    { kind: 'launch', record: 'Falcon 9 Block 5 | Starlink 10-12', tMs: 1790053200000, precision: 'Hour', status: 'Go' },
    { kind: 'launch', record: 'Long March 8A', tMs: 1790128800000, precision: null, status: 'TBC' },
    { kind: 'launch', record: 'Electron | Owl For One', tMs: 1790208000000, precision: 'Minute', status: 'Go' },
    { kind: 'approach', record: '2026 SB', tMs: 1790640000000, ld: null },
    { kind: 'approach', record: '(99942) Apophis', tMs: 1791072000000, ld: 15.34859521331946 },
    { kind: 'launch', record: 'Ariane 6 | VA266', tMs: 1791763200000, precision: 'Month', status: 'TBD' },
    { kind: 'approach', record: '2026 RF7', tMs: 1792540800000, ld: 12.5 },
  ];
  const after = buildNextItems(fixture, now).map((it) => ({ ...it, record: it.record && it.record.id }));
  try { deepStrictEqual(after, before); } catch (e) { problems.push(`the twelve-row fixture's items changed in the move:\n${e.message}`); }
  // And as records: a launch is a plan, an approach JPL's number.
  const stream = buildEvents(fixture, now, { showers: null, eclipses: false });
  check(stream.length === 8 && stream.filter((e) => e.type === 'launch').every((e) => e.class === 'inferred'), `8 records (four of each inside 30 days), every launch 'inferred' (${stream.length})`);
  check(stream.filter((e) => e.type === 'close-approach').every((e) => e.class === 'measured' && e.record && e.id === `close-approach:${e.record.id}`), 'every approach measured, with its record');
}

// 6. Every row says what its time is ------------------------------------------------------------
{
  const items = buildNextItems([{ id: 'F9', name: 'F9', layer: 'launches', meta: { netMs: now + 5 * H } }], now, { eclipses: true });
  const launchRow = items.find((i) => i.kind === 'launch');
  const ecl = items.find((i) => i.kind === 'solar-eclipse');
  check(/plan/.test(classText(launchRow)) && /to the minute/.test(classText(ecl)), `a launch says plan, an eclipse says computed to the minute ("${classText(launchRow)}" / "${classText(ecl)}")`);
  check(classText({ kind: 'pass', record: { epoch: now - 3 * H } }, now) === 'Worked out here from orbital elements measured 3 hours ago', `a pass gives its elements' age: "${classText({ kind: 'pass', record: { epoch: now - 3 * H } }, now)}"`);
}

// 7. What it costs -----------------------------------------------------------------------------------
{
  // Cold: a different UTC day each run, so the once-a-day search really runs. Warm: the same day.
  const cold = [], warm = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    buildEvents([], now + (i + 2) * D, {});
    cold.push(performance.now() - t0);
  }
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    buildEvents([], now + 200 * D + i * 60e3, {});
    warm.push(performance.now() - t0);
  }
  const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];
  notes.push(`buildEvents([], now) over 100 runs: median ${median(cold).toFixed(1)} ms searching (a new day each run), ${median(warm).toFixed(2)} ms within a day`);
  check(median(cold) < 50, `a cold search stays under the spec's 50 ms memo line (${median(cold).toFixed(1)} ms)`);
}

// 8. The nearest-city helper -------------------------------------------------------------------------
{
  const n = nearestCity(40.4, -3.7, CITIES);
  check(n && n.city.name === 'Madrid' && n.km < 5, 'Madrid is nearest to Madrid');
  check(whereWords(30.1, 31.3) === 'near Cairo', `within 250 km it says near: "${whereWords(30.1, 31.3)}"`);
  check(nearestCity(0, 0, []) === null && whereWords(NaN, 0) === null, 'no cities or no point, no words');
}

if (problems.length) { console.error('events FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
for (const n of notes) console.log('  ' + n);
console.log('events ok: eclipses computed here and pinned against NASA GSFC, one stream feeding the Next list, nextEvent for spec 0030, local circumstances by place');
