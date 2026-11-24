// tests/test_ask.mjs -- network chips with live counts, and a question in plain words (ui/networks.js, ui/ask.js,
// forge internal #555).
//
//   node tests/test_ask.mjs
//
// What it holds:
//   1. THE GRAMMAR, AND WHAT WAS UNDERSTOOD: "starlink over Spain", "satellites launched this week" and their kind are
//      read into their pieces, in any order, in English and in the page's language; one word alone is the ordinary
//      search's; nothing outside the lists is guessed.
//   2. WHAT THE MAP DOES WITH IT: each question is a Find link the Find panel already reads (ui/findcore.js parseFind),
//      with the new `d` token (days since launch) matching as it says.
//   3. THE COUNTS ARE LIVE: counted from the records the map holds, a network absent before its catalogue is loaded.
//   4. THE WORDS, THE ROW AND THE BOOT: the search row says what was understood in eleven languages; the chips load
//      after the first view, never at boot; no question leaves the page.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const A = await import(join(JS, 'ui/ask.js'));
const N = await import(join(JS, 'ui/networks.js'));
const F = await import(join(JS, 'ui/findcore.js'));
const { COPY, CITIES } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const W = COPY.searchRows.askWords;
const NOW = Date.UTC(2026, 10, 24, 12);
const ask = (q, words = W) => A.parseAsk(q, words, CITIES, NOW);
const act = (q, words = W) => A.askAction(ask(q, words));

// ---------------------------------------------------------------- 1. the grammar
const sp = ask('starlink over Spain');
check(sp && sp.group.id === 'starlink' && sp.place && sp.place.name === 'Spain' && sp.place.kind === 'country', `"starlink over Spain": Starlink, over the country Spain (${JSON.stringify(sp)})`);
check(JSON.stringify(ask('over Spain, Starlink')?.parts) === JSON.stringify(sp.parts), 'the pieces in any order');
check(ask('Starlink over London tonight')?.place?.name === 'London', 'a town of the bundled list, and a word it does not know ("tonight") ignored');
const wk = ask('satellites launched this week');
check(wk && wk.group.kind === 'sats' && wk.launched && wk.launched.days === 7, '"satellites launched this week": satellites, launched in the last 7 days');
check(ask('satellites launched today')?.launched?.days === 1 && ask('satellites launched this month')?.launched?.days === 31, 'today and this month');
check(ask('satellites launched this year')?.launched?.year === 2026 && ask('satellites launched in 2020')?.launched?.year === 2020, 'this year, and a year');
check(ask('chinese satellites')?.owner?.code === 'PRC' && ask('satellites from India')?.owner?.code === 'IND', 'an owner by its adjective or after "from"');
check(ask('debris over Japan')?.group?.kind === 'debris' && ask('space stations above Lagos')?.group?.kind === 'stations', 'debris and the stations, over a place');
check(ask('starlink satellites')?.group?.id === 'starlink' || ask('starlink satellites') === null, '"starlink satellites" is the constellation, not satellites in general');
for (const one of ['starlink', 'mars', 'iss', 'over', 'hubble space telescope', 'the moon tonight']) check(ask(one) === null, `"${one}" is the ordinary search's (no question understood)`);
check(ask('satellites over Atlantis') === null, 'a place not in the list is not guessed');
// The page's language, on top of English.
const es = await import(join(JS, 'copy/es.js'));
const ew = es.COPY.searchRows.askWords;
check(ew && ew.over !== W.over, 'Spanish has its own words for "over"');
const esq = ask('satélites lanzados esta semana', ew);
check(esq && esq.group.kind === 'sats' && esq.launched && esq.launched.days === 7, `"satélites lanzados esta semana" is the same question in Spanish (${JSON.stringify(esq && esq.parts)})`);
check(ask('starlink over Spain', ew)?.place?.name === 'Spain', 'English is still read on a Spanish page');

// ---------------------------------------------------------------- 2. what the map does
check(act('starlink over Spain').constellation === 'starlink' && act('starlink over Spain').place.latDeg > 35, 'Starlink is lit and the globe turns to Spain');
check(act('satellites launched this week').find === 'sats_d-7', `launched this week is Find's sats_d-7 (${act('satellites launched this week').find})`);
check(act('satellites from India launched in 2020').find === 'sats_y2020-2020_ownIND', 'a year and an owner together');
check(act('oneweb launched this month').find === 'sats_d-31_oponeweb', 'a constellation launched recently is asked as its operator\'s launches');
check(act('debris over Japan').clouds === true && act('space stations above Lagos').stations === true, 'debris opens the clouds, the stations are lit');
check(act('chinese satellites').find === 'sats_ownPRC', 'an owner\'s satellites');
for (const q of ['satellites launched this week', 'satellites from India launched in 2020', 'oneweb launched this month', 'chinese satellites', 'geostationary satellites from France']) {
  const f = act(q).find;
  const parsed = F.parseFind(f);
  check(parsed && F.findText(parsed) === F.findText(F.parseFind(F.findText(parsed))), `${q}: ${f} is a link Find reads back`);
}
const d7 = F.parseFind('sats_d-7');
check(d7 && Array.isArray(d7.launchedDays) && d7.launchedDays[1] === 7 && F.findText(d7) === 'sats_d-7', 'the `d` token reads and writes back');
const row = (daysAgo) => F.satRow({ id: 1, name: 'X', owner: 'US', type: 'PAY', ops: '+', decayMs: null, launchMs: NOW - daysAgo * 86400e3, apogeeKm: 500, perigeeKm: 500, incDeg: 50 }, null, NOW);
check(F.matches(d7, row(3)) && !F.matches(d7, row(9)), 'launched 3 days ago matches the week, 9 days ago does not');
check(row(3).launchedDays === 3, 'a row carries its days since launch');

// ---------------------------------------------------------------- 3. the counts
const rec = (name, id) => ({ id: `sat-${id}`, name, meta: { noradId: id } });
const active = [rec('STARLINK-1007', 1), rec('STARLINK-1008', 2), rec('STARLINK-1008', 2), rec('ONEWEB-0012', 3), rec('NAVSTAR 81 (USA 319)', 4), rec('COSMOS 2545 (GLONASS)', 5), rec('NOAA 19', 6)];
const counts = N.networkCounts((id) => (id === 'active' ? active : id === 'stations' ? [rec('ISS (ZARYA)', 25544), rec('CSS (TIANHE)', 48274)] : []));
check(counts.starlink === 2 && counts.oneweb === 1 && counts.gps === 1 && counts.glonass === 1 && counts.galileo === 0, `counted once each, by the operators' names (${JSON.stringify(counts)})`);
check(counts.stations === 2, 'the stations from their own layer');
const early = N.networkCounts((id) => (id === 'stations' ? [rec('ISS (ZARYA)', 25544)] : []));
check(!('starlink' in early) && early.stations === 1, 'before the catalogue is loaded a network has no number, never a 0');
check(N.NETWORKS.map((n) => n.id).join() === 'starlink,oneweb,gps,glonass,galileo,beidou,iridium,kuiper,qianfan,stations,debris,geo', 'the chips, in order');
await import(join(JS, 'copy/en.networks.js'));
check(N.chipWords('starlink', 6780).label === 'Starlink: 6,780 on the map now. Light them' || /Starlink: 6.780 on the map now/.test(N.chipWords('starlink', 6780).label), `a chip's label says the count (${N.chipWords('starlink', 6780).label})`);
check(!/\d/.test(N.chipWords('starlink').label), 'with no count the label has no number');

// ---------------------------------------------------------------- 4. words, row, boot
const R = await import(join(JS, 'ui/searchrows.js'));
const hits = R.findExtras('starlink over Spain');
check(hits[0] && hits[0].extra === 'ask' && hits[0].name === 'Understood: Starlink · over Spain', `the first row says what was understood (${hits[0] && hits[0].name})`);
check(R.findExtras('satellites launched this week')[0]?.name === 'Understood: satellites · launched in the last 7 days', 'and for a launch question');
check(R.findExtras('starlink').every((h) => h.extra !== 'ask'), 'one word alone has no question row');
check(R.rowIconName({ extra: 'ask' }) === 'satellite', 'the question row wears the satellite');
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : flat(v, `${p}${k}.`)));
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const m = await import(join(JS, `copy/${lang}.js`));
  const nets = m.COPY.networks;
  const all = nets && flat(COPY.networks).every(([k]) => { const v = k.split('.').reduce((o, x) => (o ? o[x] : undefined), nets); return typeof v === 'string' && v; });
  check(all, `copy/${lang}.js has every string of the network chips`);
  const r = m.COPY.searchRows || {};
  check(r.ask && /\{what\}/.test(r.ask) && r.askWords && r.askWords.over && r.askWords.over !== W.over, `copy/${lang}.js has the question row and its own words`);
}
const askSrc = readFileSync(join(JS, 'ui/ask.js'), 'utf8');
check(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|srq|sr\(/.test(askSrc), 'a question is read in the page: nothing is fetched or sent');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/afterFirstVisit\(LATER_LAYERS_MS, \(\) => import\('\.\/ui\/networks\.js'\)/.test(main) && !/^import[^\n]*networks\.js/m.test(main), 'main.js fetches the chips after the first view, never at boot');
const netSrc = readFileSync(join(JS, 'ui/networks.js'), 'utf8');
check(/ui-chip/.test(netSrc) && /aria-pressed/.test(netSrc) && !/style\.(color|background)/.test(netSrc), 'the chips are the set\'s own, lit by aria-pressed');

if (problems.length) {
  console.error(`test_ask: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('test_ask: the questions and what was understood, their Find links and the `d` token, live counts never guessed, eleven languages and the boot all hold');
