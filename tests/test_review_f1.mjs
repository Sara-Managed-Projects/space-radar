// tests/test_review_f1.mjs -- the feature faults of the review of 16 Nov 2026, first batch: search aliases, satellite
// cards when the clock moves, and the small ones (a link's date and rate, the link's note, a Moment left while it
// loads, the model viewer, the daily challenge, Tonight's headline pass). Deep links have tests/test_resolveid.mjs.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ---------------------------------------------------------------- 1. search: other ways of naming famous things
const { buildIndex, findMatches, designationForms } = await import(join(JS, 'ui/search.js'));
const { ALIASES } = await import(join(JS, 'data/aliases.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
{
  const sat = (n, name, layer, meta = {}) => ({ id: `sat-${n}`, name, klass: 'satellite', layer, meta: { noradId: n, ...meta } });
  const recs = [
    ...parseDso(JSON.parse(read('site/data/dso.json'))),
    sat(20580, 'HST', 'visual', { why: 'hubble' }), sat(20580, 'HST', 'notable', { why: 'hubble' }), sat(60001, 'HUBBLE 6', 'active'),
    { id: 'exo-tic-434398831-b', name: 'TIC 434398831 b', klass: 'exoplanet', layer: 'exoplanets', meta: {} },
  ];
  const index = buildIndex(recs, LAYERS);
  const first = (q) => { const f = findMatches(index, q, 8); return f.hits[0] && !f.fallback ? f.hits[0].record.id : null; };
  check(ALIASES['hubble space telescope'] === 'hst' && first('hubble space telescope') === 'sat-20580', `"hubble space telescope" finds the telescope the catalogue calls HST (${first('hubble space telescope')})`);
  check(first('Hubble Space Telescope') === 'sat-20580', 'in any case');
  const hub = findMatches(index, 'hubble', 8).hits.map((h) => h.record.id);
  check(hub[0] === 'sat-20580' && hub.filter((id) => id === 'sat-20580').length === 1, `"hubble" lists the telescope first and once, though two layers hold it (${hub})`);
  check(first('M 31') === 'dso-m31' && first('m31') === 'dso-m31' && first('M31') === 'dso-m31', `"M 31" with a space finds what "M31" finds (${first('M 31')})`);
  check(first('ngc 224') === 'dso-m31' && first('NGC224') === 'dso-m31', 'an NGC number with or without the space');
  check(first('m1') === 'dso-m1' && first('M 1') === 'dso-m1', `"M1" is the Crab Nebula, above M10 and the rest that start with it (${first('m1')})`);
  const m1 = findMatches(index, 'm1', 8).hits.map((h) => h.record.id);
  check(m1.includes('dso-m10') && m1.indexOf('dso-m1') === 0, `the others that start with "m1" are still listed under it (${m1})`);
  check(first('ic 434') === 'dso-horsehead-nebula' && first('IC434') === 'dso-horsehead-nebula', `"IC 434" finds the Horsehead Nebula, not planets of TIC 434... (${first('ic 434')})`);
  check(JSON.stringify(designationForms('m 31')) === '["m 31","m31"]' && JSON.stringify(designationForms('ngc224')) === '["ngc 224","ngc224"]' && designationForms('andromeda') === null && designationForms('31') === null, 'a designation is read with or without its space');
}
{
  // The fleets of satellites and the asterisms are rows of the search (ui/searchrows.js), which opens Find or turns the sky.
  const R = await import(join(JS, 'ui/searchrows.js'));
  await import(join(JS, 'copy/en.find.js'));
  const { COPY } = await import(join(JS, 'copy/en.js'));
  check(R.setFleets(COPY.breakups.fleets) === 9, 'nine constellations of satellites are rows');
  const k = R.findExtras('Kuiper');
  check(k.length >= 1 && k[0].extra === 'fleet' && k[0].id === 'kuiper' && k[0].name === 'Kuiper' && k[0].sure === true, `"Kuiper" finds the constellation Find lights (${JSON.stringify(k[0])})`);
  check(R.findExtras('iridium').some((x) => x.extra === 'fleet' && x.id === 'iridium') && R.findExtras('gps').some((x) => x.extra === 'fleet' && x.id === 'gps'), 'and the others by name');
  let opened = null;
  const ok = R.runExtra({ wantFind: () => Promise.resolve({ openLink: (keys) => { opened = keys; } }) }, k[0]);
  await Promise.resolve(); await Promise.resolve();
  check(ok === true && opened && opened.constellation === 'kuiper', 'pressing it opens Find on that fleet, as #constellation=kuiper does');
  const n = R.setConstellations(JSON.parse(read('site/data/constellation-names.json')), JSON.parse(read('site/data/constellations.lines.json')));
  check(n >= 88, `the star patterns and the asterisms are rows (${n})`);
  const dip = R.findExtras('big dipper');
  check(dip.length >= 1 && dip[0].extra === 'constellation' && dip[0].id === 'UMa' && dip[0].name === 'Big Dipper' && /Ursa Major/.test(dip[0].sub) && Number.isFinite(dip[0].raDeg), `"big dipper" finds the pattern in Ursa Major (${JSON.stringify(dip[0])})`);
  check(R.findExtras('southern cross').some((x) => x.id === 'Cru') && R.findExtras('orion').some((x) => x.extra === 'constellation' && x.name === 'Orion'), '"southern cross" is Crux, and "orion" still lists the constellation');
  const search = read('site/js/ui/search.js');
  check(/x\.extra === 'fleet' && rows\.some\(\(h\) => h\.extra === 'group' && h\.id === x\.id\)/.test(search), 'a fleet already listed by its own satellites is not listed twice');
  check(/const onInput = \(\) => \{[\s\S]{0,220}wantMore\(\);/.test(search), 'text typed without a focus still fetches the rows that lead with the name people use');
}

// ---------------------------------------------------------------- 2. a satellite's card when the clock moves
const F = await import(join(JS, 'ui/cardfacts.js'));
const { COPY, t } = await import(join(JS, 'copy/en.js'));
const { MAX_AGE_MS } = await import(join(JS, 'propagate/sgp4.js'));
{
  const DAY = 864e5;
  const epoch = Date.UTC(2026, 10, 15, 12);
  const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', propagator: 'sgp4', frame: 'earth-inertial', cls: 'measured', epoch, satrec: {}, meta: { noradId: 25544, intlDesignator: '1998-067A' } };
  const at = (ms, ok = true) => ({ ok, cls: ok ? 'inferred' : null, tMs: ms });
  const fwd = F.classLine(iss, at(epoch + 6 * DAY));
  const back5 = F.classLine(iss, at(epoch - 5 * DAY));
  const back29 = F.classLine(iss, at(epoch - 29 * DAY));
  check(/elements 6 days old/.test(fwd), `forward it counts as before: "${fwd}"`);
  check(/worked back 5 days from its elements/.test(back5) && !/0 minutes/.test(back5), `five days before the elements' date the line says so, not "0 minutes old": "${back5}"`);
  check(/worked back 29 days/.test(back29), `and 29 days before: "${back29}"`);
  check(!/Math\.max\(0, m\.tMs - epoch\)/.test(read('site/js/ui/cardfacts.js')), 'the age is no longer clamped at zero');
  // outside what the elements can support
  check(F.elementsOutWords(iss, at(epoch + 5 * DAY)) === null && F.elementsOutWords(iss, at(epoch + 40 * DAY, true)) === null, 'a placed satellite has nothing to admit');
  const far = F.elementsOutWords(iss, at(epoch + 60 * DAY, false));
  check(far && far.key === 'outside' && /2026/.test(far.date), `sixty days on, with no dot: outside the elements (${JSON.stringify(far)})`);
  const y1990 = F.elementsOutWords(iss, at(Date.UTC(1990, 0, 1), false));
  check(y1990 && y1990.key === 'notLaunched' && y1990.year === '1998', `on 1 Jan 1990 it had not been launched (${JSON.stringify(y1990)})`);
  const line60 = F.elementsOutLine(iss, at(epoch + 60 * DAY, false));
  const line1990 = F.elementsOutLine(iss, at(Date.UTC(1990, 0, 1), false));
  check(/^No position for this date: its orbit is only known within about a month of /.test(line60) && !/\{/.test(line60), `the card's line: "${line60}"`);
  check(line1990 === 'No position for this date: it was launched in 1998.', `and before its launch: "${line1990}"`);
  check(F.elementsOutWords(iss, at(epoch + MAX_AGE_MS - 1000, false)) === null, 'inside the window a missing position is some other fault, and is not explained away');
  check(F.elementsOutWords({ ...iss, propagator: 'body' }, at(Date.UTC(1990, 0, 1), false)) === null, 'only for what is drawn from elements');
  check(F.positionKey(iss, at(Date.UTC(1990, 0, 1), false)) === 'unplaced' && F.positionKey(iss, at(epoch + DAY)) === 'inferred', 'the badge is "Not placed" for a position that is not shown, never "Measured"');
  const hint = F.truthHint(iss, {}, at(Date.UTC(1990, 0, 1), false));
  check(/Not placed/.test(hint) && !/Measured/.test(hint), `the row's hint: "${hint}"`);
  check(F.classLine(iss, at(Date.UTC(1990, 0, 1), false)) === COPY.cls.noPositionForDate, 'and the honesty line says no position is drawn for the date');
  const cards = read('site/js/ui/cards.js');
  check(/const outOfElements = ended \|\| pathEnds \|\| pathBegins \? null : elementsOutLine\(record, m\);/.test(cards) && /ended \|\| pathEnds \|\| outOfElements \? \[\] : heroNumbers/.test(cards), 'the card shows that line in place of three dashes');
  check(/\}, m\.tMs\);/.test(cards), 'the card hands the crew block the shown instant');
  // the crew
  const X = await import(join(JS, 'ui/cardextras.js'));
  const now = Date.UTC(2026, 10, 16, 8);
  check(X.crewCovers(now, now) && X.crewCovers(now - 3600e3, now) && !X.crewCovers(Date.UTC(1990, 0, 1), now) && !X.crewCovers(now + 60 * DAY, now) && X.crewCovers(NaN, now), 'the crew list answers for today only');
  check(/if \(!crewCovers\(tMs, Date\.now\(\)\)\) \{\s*wrap\.appendChild\(el\('p', 'sr-card__aboardnote', C\.otherDate\)\);\s*return \{ node: wrap, hint: null \};/.test(read('site/js/ui/cardextras.js')), 'on another date the row says so and carries no "7 aboard"');
  check(typeof COPY.crew.otherDate === 'string' && COPY.crew.otherDate.length > 20, 'with words for it');
}

// ---------------------------------------------------------------- 3. the small ones
const U = await import(join(JS, 'ui/urlstate.js'));
const W = await import(join(JS, 'ui/whenparse.js'));
{
  // a link's date is held to the years the date field offers
  check(U.T_MIN_MS === Date.UTC(W.MIN_YEAR, 0, 1) && U.T_MAX_MS === Date.UTC(W.MAX_YEAR, 11, 31, 23, 59, 59) && W.inRange(U.T_MIN_MS) && W.inRange(U.T_MAX_MS), 'the link and the date field share one range');
  const huge = U.linkInstant('+275760-09-13T00:00:00Z');
  check(huge && huge.clamped && huge.ms === U.T_MAX_MS, `a date at the end of time is held to the last the map shows (${JSON.stringify(huge)})`);
  const early = U.linkInstant('-200000-01-01T00:00:00Z');
  const year1 = U.linkInstant('0001-01-01T00:00:00Z');
  check(early && early.clamped && early.ms === U.T_MIN_MS && year1 && year1.clamped && year1.ms === U.T_MIN_MS, 'and one before 1700 to the first');
  const fine = U.linkInstant('2027-08-02T10:00:00Z');
  check(fine && !fine.clamped && fine.ms === Date.UTC(2027, 7, 2, 10) && U.linkInstant('now') === null && U.linkInstant('abc') === null && U.linkInstant('') === null, 'a date inside the range is itself; "now" and nonsense are no date');
  for (const s of ['+275760-09-13T00:00:00Z', '-200000-01-01T00:00:00Z']) {
    let threw = false;
    try { new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(U.linkInstant(s).ms + 864e5 * 2)); } catch { threw = true; }
    check(!threw, `the time pill can format ${s} once it is held (even two days on)`);
  }
  // bootLink applies the held date and says so; linkChange too
  const went = [];
  const clock = { goTo: (ms) => went.push(ms), setRate: (r) => went.push(`rate ${r}`), rates: () => [1, 60, 3600, 36000] };
  globalThis.location = { hash: '#t=+275760-09-13T00:00:00Z&at=moon', pathname: '/', search: '' };
  const rest = U.bootLink(clock);
  check(went[0] === U.T_MAX_MS && rest.tOutOfRange === true && rest.at === 'moon' && rest.t === undefined, `at boot the clock goes to the held date and the link remembers to say so (${JSON.stringify(rest)})`);
  globalThis.location = { hash: '#t=2027-08-02T10:00:00Z', pathname: '/', search: '' };
  check(U.bootLink(clock).tOutOfRange === undefined, 'a date inside the range says nothing');
  delete globalThis.location;
  const plan = U.linkChange({ t: '-200000-01-01T00:00:00Z' }, { at: null, trip: null, live: true, stage: 'earth' });
  check(plan.clock.goTo === U.T_MIN_MS && plan.clock.clamped === true, 'a running tab holds it the same way');
  // a rate alone
  const rate = U.linkChange({ rate: '36000' }, { at: null, trip: null, live: true, stage: 'earth' });
  check(rate && rate.clock && rate.clock.rate === 36000 && rate.clock.goTo === undefined && !rate.clock.live, `#rate=36000 alone, pasted into a running tab, is a plan for the clock (${JSON.stringify(rate && rate.clock)})`);
  const bad = U.linkChange({ rate: 'abc' }, { at: null, trip: null, live: true, stage: 'earth' });
  check(bad && bad.clock === null, 'a rate that is no number plans nothing');
  const dated = U.linkChange({ t: '2027-08-02T10:00:00Z', rate: '3600' }, { at: null, trip: null, live: true, stage: 'earth' });
  check(dated.clock.goTo === Date.UTC(2027, 7, 2, 10) && dated.clock.rate === 3600 && dated.clock.clamped === undefined, 'a date with a rate is as before');
  const main = read('site/js/main.js');
  check(/if \(Number\.isFinite\(plan\.clock\.goTo\)\) clock\.goTo\(plan\.clock\.goTo\); else if \(clock\.mode !== 'live'\) clock\.live\(\);\s*if \(clock\.rates\(\)\.includes\(plan\.clock\.rate\)\) clock\.setRate\(plan\.clock\.rate\);/.test(main), 'main.js applies the rate with or without a date');
  check(/if \(keys\.rate !== undefined && !clock\.rates\(\)\.includes\(Number\(keys\.rate\)\)\) clearUrlState\(\['rate'\]\);/.test(main), 'a rate the clock does not offer leaves the address');
  check(/if \(plan\.clock\.clamped\) linkNote\(ctx, COPY\.link\.tOutOfRange\);/.test(main) && /if \(st\.tOutOfRange\) linkNote\(ctx, COPY\.link\.tOutOfRange\);/.test(main) && /1700 to 2200/.test(COPY.link.tOutOfRange), 'and the scene says the date was outside 1700 to 2200');
  // the link's note
  const note = read('site/js/ui/scenenote.js');
  check(/export const LINK_NOTE_MS = \d+;/.test(note) && /if \(saidByLink\) linkTimer = setTimeout\(clearLink, LINK_NOTE_MS\);/.test(note) && /function clearLink\(\)/.test(note), 'a link\'s note goes by itself after a few seconds');
  check(/window\.addEventListener\('hashchange', \(\) => \{\s*setMoment\([^\n]*\n\s*\/\/[^\n]*\n\s*if \(ctx\.sceneNote && ctx\.sceneNote\.clearLink\) ctx\.sceneNote\.clearLink\(\);/.test(main) && /ctx\.sceneNote\.say\(line, \{ link: true \}\)/.test(main), 'and at once when the next link is applied');
  check(/if \(!readUrlKeys\(\)\.play && ctx\.play && ctx\.play\.isOpen && ctx\.play\.isOpen\(\)\) ctx\.play\.close\(\); else playLink\(\);/.test(main) && /isOpen: \(\) => card\.isConnected/.test(read('site/js/ui/play.js')), 'the daily challenge closes when a later link has no play=');
}
{
  // The note itself, with a document and a clock of our own.
  const made = [];
  const node = () => { const n = { hidden: false, children: [], listeners: {}, style: {}, setAttribute() {}, append(...k) { this.children.push(...k); }, appendChild(k) { this.children.push(k); return k; }, addEventListener(type, fn) { this.listeners[type] = fn; }, remove() {} }; made.push(n); return n; };
  const timers = [];
  const saved = { document: globalThis.document, window: globalThis.window, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  globalThis.document = { createElement: node, createElementNS: node, body: node() };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; };
  globalThis.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1].live = false; };
  try {
    const { createSceneNote, LINK_NOTE_MS } = await import(join(JS, 'ui/scenenote.js'));
    const sn = createSceneNote({ recordsFor: () => [], sources: { status: () => [] } });
    const root = made.find((n) => n.className === 'sr-scenenote sr-float');
    const text = made.find((n) => n.className === 'sr-scenenote__text');
    sn.say('That object is not on this map; showing the default view.', { link: true });
    check(root.hidden === false && /not on this map/.test(text.textContent), 'a link\'s line is shown');
    const timer = timers.find((x) => x.live && x.ms === LINK_NOTE_MS);
    check(!!timer, 'with a time to go by');
    sn.clearLink();
    check(root.hidden === true, 'the next link takes it down');
    sn.say('That trip is gone from this map.', { link: true });
    timers.filter((x) => x.live).forEach((x) => x.fn());
    check(root.hidden === true, 'and so does its time running out');
    sn.say('Orion is below your horizon now.');
    sn.clearLink();
    check(root.hidden === false, 'a line that is not a link\'s stays until it is closed');
  } finally {
    Object.assign(globalThis, saved);
    if (saved.document === undefined) delete globalThis.document;
    if (saved.window === undefined) delete globalThis.window;
  }
}
{
  // a Moment left while it loads
  const player = read('site/js/moments/player.js');
  check(/try \{ await import\(`\.\.\/copy\/\$\{file\.wordsFile\}`\); \} catch[^\n]*\n\s*\/\/[^\n]*\n\s*if \(opened !== id\) return false;\s*\}\s*m = file;/.test(player), 'a load overtaken by close() returns quietly after its words arrive, before it reads the moment');
  // the model viewer
  const viewer = read('site/model/viewer.js');
  check(/let renderer;\s*try \{\s*renderer = new THREE\.WebGLRenderer\(/.test(viewer) && /say\('No 3D here'/.test(viewer), 'the model viewer says when the browser cannot draw 3D');
  check(/if \(!r\.ok\) throw new Error\(`HTTP \$\{r\.status\}`\);\s*entry = \(await r\.json\(\)\)\.models\[id\];\s*\} catch \{\s*say\('Could not load the catalog'/.test(viewer), 'a catalog that did not arrive is not "Not one of ours"');
  check(/addEventListener\('webglcontextrestored', wake\)/.test(viewer) && /addEventListener\('webglcontextlost', \(e\) => e\.preventDefault\(\)\)/.test(viewer), 'and it draws again when a lost context returns');
  // the daily challenge
  const play = read('site/js/ui/play.js');
  await import(join(JS, 'copy/en.play.js'));
  check(/say\.textContent = COPY\.play\.failed;/.test(play) && /go\.textContent = COPY\.play\.retry;/.test(play) && !/catch\(\(e\) => \{ console\.warn\('the distances did not load', e\); say\.textContent = COPY\.play\.loading; \}\)/.test(play), 'a challenge whose data did not load says so and offers to try again, not "loading" for ever');
  check(COPY.play.failed && COPY.play.retry === 'Try again', 'with words for both');
}
{
  // Tonight's headline pass
  const G = await import(join(JS, 'sky/gloss.js'));
  const isis = { id: 'sat-3669', name: 'ISIS 1', klass: 'satellite', meta: { noradId: 3669, intlDesignator: '1969-009A' } };
  check(G.whatIs(isis) === 'a 1969 Canadian ionosphere satellite', 'ISIS 1 has its few words');
  check(G.launchYear(isis) === 1969 && G.launchYear({ meta: {} }) === null && G.launchYear({ meta: { intlDesignator: 'x' } }) === null, 'the launch year is read from the designator');
  check(G.isFamiliar({ name: 'ISS (ZARYA)', klass: 'station' }) && G.isFamiliar({ name: 'HST', klass: 'satellite' }) && G.isFamiliar({ name: 'STARLINK-1008', klass: 'satellite' }) && !G.isFamiliar(isis), 'the station, Hubble and a Starlink need no words');
  const { tonightWords } = await import(join(JS, 'sky/tonight.js'));
  const pass = (record) => ({ record, startMs: Date.UTC(2026, 10, 16, 17, 3), endMs: Date.UTC(2026, 10, 16, 17, 36), startAz: 0, endAz: 3.5, peakEl: 1.1 });
  const words = (record) => tonightWords({ observer: { name: 'Cairo', latDeg: 30, lonDeg: 31, source: 'guess' }, nowMs: Date.UTC(2026, 10, 16, 8), ready: true, pass: pass(record), later: null, dark: null });
  const a = words(isis);
  check(a.parts && a.parts.what === 'a 1969 Canadian ionosphere satellite' && /ISIS 1 · a 1969 Canadian ionosphere satellite/.test(a.line), `the headline pass says what ISIS 1 is: "${a.line}"`);
  const b = words({ id: 'sat-22285', name: 'COSMOS 2227', klass: 'satellite', meta: { noradId: 22285, intlDesignator: '1992-093A' } });
  check(b.parts.what === 'a satellite launched in 1992', `a name with no words of its own says what it is and when it went up: "${b.parts.what}"`);
  const c = words({ id: 'sat-22566', name: 'SL-16 R/B', klass: 'rocket', meta: { noradId: 22566, intlDesignator: '1993-016B' } });
  check(c.parts.what === 'a spent rocket stage launched in 1993', `a rocket body too: "${c.parts.what}"`);
  const d = words({ id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', meta: { noradId: 25544, intlDesignator: '1998-067A' } });
  check(!d.parts.what, 'the station says nothing more');
}

if (problems.length) {
  console.error(`review f1 FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('review f1 ok: search knows the full and spaced names; a satellite card states its element age either side of the epoch, says when a date is outside its elements and shows no crew for another date; a link\'s date is held to 1700-2200, a rate alone applies, the link\'s note goes; a Moment, the model viewer, the daily challenge and Tonight\'s headline pass say what happened');
