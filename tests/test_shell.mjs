// tests/test_shell.mjs -- the layout's rules, without a browser (spec 0061 task 1).
//
// One sidebar holding one view at a time, a collapse that is remembered, four tabs that are places,
// Right-now lines that are left out rather than filled, and the clock as a pill. What is held here:
//
//   1. the view stack: push, pop, a view pushed twice is one entry, home is never popped
//   2. collapse is remembered in localStorage['sr:side'], and a storage that throws is not fatal
//   3. tab <-> stage: each tab's place, and the tab the scene is showing read back from the stage
//   4. Right now: at most three lines, each only when its data is there
//   5. the status line: counts, the oldest reading, and the dot's state
//   6. the time pill: the rate cycle, the step, the scrub window, the readout
//   7. the rail's keys, and main.js building the shell before what it hosts
//   8. the way back says where it goes (the breadcrumb, in every language), Back keeps the selection, the search and
//      tabs are pinned over the views, and the panel hides with its own icon and `[` to a strip
//
//   node tests/test_shell.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { createViewStack, readCollapsed, writeCollapsed, SIDE_KEY, VIEWS, crumbFor, panelKey, CRUMB_QUERY_MAX } = await import(join(JS, 'ui/shell.js'));
const { TABS, tabTarget, tabFor, rightNowLines, statusSummary, tripMeta, wantsSearch, isTypingIn, homeTripOrder, offNote, CREWED, HEADCOUNT_STALE_MS, headcountFrom } = await import(join(JS, 'ui/explore.js'));
const { nextRate, stepMs, clampToWindow, pillText, PILL_RATES } = await import(join(JS, 'ui/timepill.js'));
const { railKey } = await import(join(JS, 'ui/rail.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

// --- 1. the view stack ---------------------------------------------------------------------------
{
  const s = createViewStack('home');
  check(s.current() === 'home' && s.depth() === 1, 'the sidebar starts at home');
  check(s.push('card') && s.current() === 'card', 'a card pushes');
  check(!s.push('card') && s.depth() === 2, 'the same card again is not a second entry');
  check(s.push('sources') && s.list().join('>') === 'home>card>sources', 'the sources sheet pushes over the card');
  check(s.pop() === 'card', 'Back from the sources goes to the card it was opened over');
  check(s.pop() === 'home' && s.pop() === 'home', 'Back from the card goes home, and home is never popped');
  s.push('card'); s.push('sources');
  check(s.push('card') && s.list().join('>') === 'home>sources>card', 'a view already in the stack comes to the top, once');
  check(s.remove('card') && s.current() === 'sources', 'the card closing under the sheet takes only the card out');
  check(!s.remove('home') && s.list()[0] === 'home', 'home cannot be removed');
  check(!s.push('nowhere') && !s.push('home'), 'an unknown view, or home, is not pushed');
  check(['home', 'card', 'sources', 'trip'].every((v) => VIEWS.includes(v)), 'the four views of design §1 exist');
  check(VIEWS.includes('passport') && s.push('passport') && s.current() === 'passport', 'the passport is a pushed view too (spec 0041)');
  s.pop();
}

// --- 2. collapse, remembered ------------------------------------------------------------------------
{
  const mem = new Map();
  const stub = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  check(readCollapsed(stub) === false, 'nothing stored is open');
  check(writeCollapsed(stub, true) && mem.get(SIDE_KEY) === 'collapsed' && readCollapsed(stub) === true, `collapsing writes localStorage['${SIDE_KEY}'] and reads back`);
  check(writeCollapsed(stub, false) && !mem.has(SIDE_KEY) && readCollapsed(stub) === false, 'opening removes the key rather than storing a second word');
  mem.set(SIDE_KEY, 'sideways');
  check(readCollapsed(stub) === false, 'an unknown stored word is open');
  const throwing = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('private mode'); }, removeItem() { throw new Error('private mode'); } };
  check(readCollapsed(throwing) === false && writeCollapsed(throwing, true) === false, 'a storage that throws (Safari private mode) is open and the write says it failed, without throwing');
  check(readCollapsed(null) === false, 'no storage at all is open');
}

// --- 3. tabs are places ------------------------------------------------------------------------------
{
  check(TABS.join(',') === 'earth,planets,stars,tonight', 'four tabs, in row D\'s order: Earth, Planets, Stars, Tonight');
  check(TABS.every((id) => COPY.tabs[id]), 'every tab has its word in copy/en.js');
  const want = { earth: ['earth', 'wonder'], planets: ['sun', 'wonder'], stars: ['stellar', 'wonder'], tonight: ['earth', 'now'] };
  for (const [tab, [stage, moment]] of Object.entries(want)) {
    const t = tabTarget(tab);
    check(t.stage === stage && t.moment === moment, `${tab} goes to the ${stage} stage in the ${moment} moment (${t.stage}, ${t.moment})`);
    check(tabFor(t.stage, t.moment) === tab, `and the scene there reads back as ${tab} (${tabFor(t.stage, t.moment)})`);
  }
  check(tabFor('moon', 'wonder') === 'earth', 'the Moon\'s stage is Earth\'s tab: it is our neighbourhood');
  check(tabFor('mars', 'wonder') === 'planets' && tabFor('saturn', 'next') === 'planets', 'another world\'s stage is Planets');
  check(tabFor('galaxy', 'wonder') === 'stars' && tabFor('system-trappist-1', 'wonder') === 'stars', 'a rung of the ladder or a star system is Stars');
  check(tabFor('mars', 'now') === 'tonight', 'the Now moment is Tonight wherever the camera is');
  check(tabFor('earth', 'next') === 'earth', 'the old Next door lands on Earth, where Coming up is');
  check(tabFor(undefined, undefined) === 'earth' && tabFor('nowhere', 'wonder') === 'earth', 'an unknown stage is Earth');
  check(tabTarget('nonsense').stage === 'earth', 'an unknown tab goes to Earth');
}

// --- 4. Right now: live lines, or none -------------------------------------------------------------
{
  const wallMs = Date.UTC(2026, 8, 29, 21, 14);
  check(rightNowLines({}).length === 0 && rightNowLines().length === 0, 'no data, no lines: nothing is replaced by filler');
  const storms = [
    { name: 'Polo', meta: { status: 'hurricane', trackMaxWindKmh: 180 } },
    { name: 'Fay', meta: { status: 'storm', trackMaxWindKmh: 90 } },
    { name: 'Nolo', meta: { status: 'hurricane', trackMaxWindKmh: 210 } },
  ];
  const clouds = { mode: 'live', capturedMs: wallMs - 42 * 60e3 };
  const iss = { id: 'sat-25544' };
  const crewed = [{ key: 'iss', record: iss }, { key: 'tiangong', record: { id: 'sat-48274' } }];
  const all = rightNowLines({ storms, clouds, crewed, wallMs });
  check(all.length === 3, `three lines when all three are there (${all.length})`);
  check(all[0].id === 'storms' && all[0].lead === true && !all[1].lead, 'the storms lead, set large');
  check(all[0].text === 'Three storms are turning, Nolo the strongest.', `the count in words and the strongest by status, then wind (${all[0].text})`);
  check(all[0].record && all[0].record.name === 'Nolo', 'and the line selects the strongest');
  check(all[1].id === 'clouds' && all[1].value === '42 minutes ago', `the clouds line says how old the pictures are (${all[1].value})`);
  check(all[2].id === 'crew' && all[2].value === 'ISS · Tiangong' && all[2].record === iss, 'people in space names the crewed stations present and selects the first');
  const noStorms = rightNowLines({ storms: [], clouds, crewed, wallMs });
  check(noStorms.length === 2 && noStorms[0].id === 'clouds' && noStorms[0].lead, 'no storm layer: the storm line is left out and the next line leads');
  check(rightNowLines({ clouds: { mode: 'static', capturedMs: wallMs }, wallMs }).length === 0, 'clouds that are not today\'s (scrubbed, saving data) are no line');
  check(rightNowLines({ clouds: { mode: 'live', capturedMs: NaN }, wallMs }).length === 0, 'clouds with no capture time are no line');
  check(rightNowLines({ crewed: [{ key: 'iss', record: null }] }).length === 0, 'a crewed station not loaded is no line');
  const one = rightNowLines({ storms: [storms[1]] });
  check(one.length === 1 && one[0].text === 'One storm is turning: Fay.', `one storm says so (${one[0] && one[0].text})`);
  check(rightNowLines({ storms: [{ meta: {} }] }).length === 0, 'a storm with no name is no line');
  // Internal #192 item 4: the aurora at a geomagnetic storm, after the storms and before the clouds.
  const aurora = { text: 'Aurora likely as far as 50° latitude', value: 'Kp 7' };
  const withAurora = rightNowLines({ storms, aurora, clouds, crewed, wallMs });
  check(withAurora.length === 3 && withAurora.map((l) => l.id).join() === 'storms,aurora,clouds', `the aurora line comes second and the crew make way (${withAurora.map((l) => l.id)})`);
  check(withAurora[1].value === 'Kp 7' && !withAurora[1].lead, 'it carries Kp in the value column');
  const auroraLead = rightNowLines({ aurora, crewed, wallMs });
  check(auroraLead[0].id === 'aurora' && auroraLead[0].lead, 'with no storms it leads');
  check(rightNowLines({ aurora: null, crewed }).every((l) => l.id !== 'aurora') && rightNowLines({ aurora: { text: '' } }).length === 0, 'no storm in space, no aurora line');
  // Launch Library 2's headcount (explore.js pollCrew), once it has loaded.
  const counted = [{ key: 'iss', record: iss, count: 7 }, { key: 'tiangong', record: { id: 'sat-48274' }, count: 3 }];
  const withCount = rightNowLines({ crewed: counted, wallMs });
  check(withCount[0].id === 'crew' && withCount[0].value === '7 on ISS · 3 on Tiangong', `the headcount names how many once it has loaded (${withCount[0] && withCount[0].value})`);
  const partialCount = [{ key: 'iss', record: iss, count: 7 }, { key: 'tiangong', record: { id: 'sat-48274' } }];
  check(rightNowLines({ crewed: partialCount, wallMs })[0].value === '7 on ISS · Tiangong', 'a station with no count yet falls back to its bare name');
  check(rightNowLines({ crewed: [{ key: 'iss', record: iss, count: 0 }], wallMs })[0].value === 'ISS', 'a zero count (the list answered but counted nobody) is treated as no count, not "0 on ISS"');
  // The count is Launch Library 2's own `onboard_crew` from the stations answer the station card reads
  // (review 2026-11-16: Open Notify's list was frozen on the crews of mid-2024 and said 9 on the ISS).
  const stationsBody = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/ll2_stations.json'), 'utf8'));
  const { parseStationHeadcount } = await import(join(JS, 'data/parsers.js'));
  const { STATION_RECORD } = await import(join(JS, 'data/crew.js'));
  const head = parseStationHeadcount(stationsBody);
  check(head && head['4'] === 7 && head['18'] === 3, `the stations answer gives 7 on the ISS and 3 on Tiangong (${JSON.stringify(head)})`);
  check(parseStationHeadcount({ people: [{ name: 'x', craft: 'ISS' }], message: 'success' }) === null && parseStationHeadcount('nonsense') === null && parseStationHeadcount({ results: [{ id: 4 }] }) === null,
    'a body that is not the stations answer, or carries no count, is no headcount');
  check(CREWED.every((c) => STATION_RECORD[c.ll2] === c.id) && CREWED.length === Object.keys(STATION_RECORD).length, 'the Right now stations are data/crew.js STATION_RECORD, id for id');
  const t0 = Date.parse('2026-11-16T12:00:00Z');
  check(headcountFrom({ ok: true, data: stationsBody, fetchedAt: t0 - 3600e3 }, t0)['4'] === 7, 'a fresh copy is counted');
  check(headcountFrom({ ok: true, data: stationsBody, fetchedAt: t0 - HEADCOUNT_STALE_MS - 1 }, t0) === null, 'a copy more than two days old is no headcount: the stations are named bare');
  check(headcountFrom({ ok: false, data: stationsBody }, t0) === null && headcountFrom(null, t0) === null, 'a failed read is no headcount');
  const explSrc = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/load\('ll2-stations'\)/.test(explSrc) && !/open-notify/.test(explSrc), 'the poll reads ll2-stations and nothing reads Open Notify');
}

// --- 5. the status line ----------------------------------------------------------------------------
{
  const day = 86400e3;
  check(statusSummary([]).state === 'wait' && statusSummary([]).text === COPY.statusLine.reading, 'before any source is asked, it says it is reading');
  const fresh = [{ fetchedAt: 1, ageMs: 60e3 }, { fetchedAt: 1, ageMs: 2 * day }, { attempted: false }];
  const a = statusSummary(fresh);
  check(a.state === 'ok' && a.text === '2 read this visit · oldest 2 days ago', `all fresh: count and the oldest (${a.text})`);
  // No network (ui/offline.js): the line says so, with the age of the oldest copy on screen.
  const off = statusSummary([{ fetchedAt: 1, ageMs: 3 * 86400e3 }, { fetchedAt: 1, ageMs: 60e3 }, { attempted: true, fetchedAt: null }], { offline: true });
  check(off.state === 'stale' && off.text === 'Offline: showing saved copies from 3 days ago' && off.text.length <= 60,
    `offline, the status line names the oldest saved copy; got ${JSON.stringify(off)}`);
  const offNone = statusSummary([{ attempted: true, fetchedAt: null }], { offline: true });
  check(offNone.state === 'failed' && offNone.text === COPY.statusLine.offlineNone, 'offline with nothing kept, it says there are no saved copies');
  const b = statusSummary([{ fetchedAt: 1, ageMs: 60e3 }, { fetchedAt: 1, ageMs: 7 * day, stale: true }]);
  check(b.state === 'stale' && b.text === '2 read this visit · 1 stale · oldest 7 days ago', `something stale: amber and says how many (${b.text})`);
  const c = statusSummary([{ fetchedAt: 1, ageMs: 60e3 }, { attempted: true, fetchedAt: null }]);
  check(c.state === 'failed' && c.text === 'One read this visit · 1 could not be read', `something failed: says so first (${c.text})`);
}

// --- trip cards ----------------------------------------------------------------------------------
{
  check(tripMeta({ planned: true, off: false, count: 4, estimateMs: 125e3 }) === '4 stops · 2 min', 'a trip card says its stops and minutes');
  check(tripMeta({ planned: false }) === COPY.tripCard.planning, 'before the plan lands it says it is working it out');
  check(tripMeta({ planned: true, off: true, reason: 'Needs a place' }) === 'Needs a place', 'a trip that cannot run says why, never hidden');
  // THE HOME'S ORDER AND ITS FOLD (public #241): a trip left yesterday is the first card; the ones
  // that cannot run come last; and while they are folded away one line says how many and why.
  {
    const rows = [{ id: 'a' }, { id: 'b', off: true, reason: 'Needs a place. Set where you are first.' }, { id: 'c' }, { id: 'd' }, { id: 'e', off: true, reason: 'Needs a place. Set where you are first.' }];
    check(homeTripOrder(rows, (r) => (r.id === 'd' ? { index: 3 } : null)).map((r) => r.id).join('') === 'dacbe', 'the trip left in the last day leads, then the ones that can run, then the rest');
    check(homeTripOrder(rows, null).map((r) => r.id).join('') === 'acdbe' && homeTripOrder(null).length === 0, 'with no passport: the ones that can run, then the rest');
    check(homeTripOrder([{ id: 'x', off: true }], () => ({ index: 1 }))[0].id === 'x' && homeTripOrder([{ id: 'x', off: true }, { id: 'y' }], () => ({ index: 1 }))[0].id === 'y', 'a trip that cannot run is not moved up by having been left');
    const hidden = homeTripOrder(rows, null).slice(3);
    check(offNote(hidden) === '2 trips cannot run now: Needs a place. Set where you are first.', `the fold says how many cannot run, and why when they agree: "${offNote(hidden)}"`);
    check(offNote([{ off: true, reason: 'A' }, { off: true, reason: 'B' }]) === '2 trips cannot run now', 'two reasons: the count alone, the cards say the rest');
    check(offNote([{ off: true, reason: '' }]) === COPY.tripCard.offOne, 'one, with no reason given');
    check(offNote([{ id: 'a' }]) === '' && offNote([]) === '' && offNote(null) === '', 'none folded away, nothing said');
  }
  check(tripMeta({ planned: true, off: false, count: 3, estimateMs: 60e3 }, 'Next: 12 August 2026') === 'Next: 12 August 2026', 'an event trip says when its event is');
}

// --- 6. the time pill --------------------------------------------------------------------------------
{
  check(PILL_RATES.join(',') === '1,60,600,3600', 'the rate cycles 1×, 60×, 600×, 3600× (design §7)');
  check(nextRate(1) === 60 && nextRate(3600) === 1 && nextRate(10) === 1 && nextRate(0) === 1, 'the cycle wraps, and a rate off it (an old link\'s 10×) goes to 1×');
  check(stepMs(1) === 600e3 && stepMs(3600) === 86400e3 && stepMs(36000) === 86400e3 && stepMs(10) === 600e3, 'a step is ten minutes at 1× and a day at 3600×; a rate between takes the step below');
  const anchor = Date.UTC(2026, 8, 29);
  check(clampToWindow(anchor - 90 * 86400e3, anchor) === anchor - 30 * 86400e3, 'a scrub stops a month back (spec 0005 had a week; ui/timepill.js says why it is wider)');
  check(clampToWindow(anchor + 900 * 86400e3, anchor) === anchor + 365 * 86400e3, 'and a year on');
  check(clampToWindow(Date.parse('1979-03-05T13:00:00Z'), anchor, Date.parse('1979-03-05T12:00:00Z')) === Date.parse('1979-03-05T13:00:00Z'), 'a clock already outside the window (a mission\'s event) steps freely');
  check(clampToWindow(anchor + 3600e3, anchor) === anchor + 3600e3, 'inside the window it is left alone');
  const t = Date.UTC(2026, 8, 29, 21, 14, 30);
  check(pillText({ tMs: t, live: true }) === 'LIVE · 29 SEP 21:14 UTC', `live reads as row D draws it (${pillText({ tMs: t, live: true })})`);
  check(pillText({ tMs: t + 6 * 3600e3, live: false, rate: 60, anchorMs: t }) === '30 SEP 03:14 UTC · in 6 hours', `not live: the shown time and how far it is from now (${pillText({ tMs: t + 6 * 3600e3, live: false, rate: 60, anchorMs: t })})`);
  check(pillText({ tMs: t, live: false, rate: 0, anchorMs: t }) === '29 SEP 21:14 UTC · held', 'held time says it is held');
  check(pillText({ tMs: NaN }) === COPY.timePill.unknown, 'no clock, no invented time');
}

// --- 7. the rail's keys and the wiring ---------------------------------------------------------------
{
  const body = { tagName: 'BODY' };
  check(railKey({ key: 'l' }, body) === 'show' && railKey({ key: 'L' }, body) === 'show', 'L opens What to show');
  check(railKey({ key: 'p' }, body) === 'share' && railKey({ key: 'P' }, body) === 'share', 'P opens the share sheet (S moves the camera)');
  check(railKey({ key: 's' }, body) === null, 'S stays the camera\'s');
  check(railKey({ key: 'l' }, { tagName: 'INPUT' }) === null, 'typing an l in search is typing');
  // Spec 0061 task 5: `/` focuses the search, and every key is named where its control is.
  check(wantsSearch({ key: '/' }, body) === true, '/ asks for the search field');
  check(wantsSearch({ key: '/' }, { tagName: 'INPUT' }) === false && wantsSearch({ key: '/' }, { tagName: 'TEXTAREA' }) === false, 'a / typed into a field is a /');
  // Public #459: every way of typing, by the focused element or by where the key was sent.
  const attrs = (o) => ({ tagName: 'DIV', getAttribute: (n) => (n in o ? o[n] : null) });
  check(wantsSearch({ key: '/' }, { tagName: 'SELECT' }) === false && wantsSearch({ key: '/' }, { tagName: 'DIV', isContentEditable: true }) === false, 'nor in a select or an editable region');
  check(wantsSearch({ key: '/' }, attrs({ contenteditable: '' })) === false && wantsSearch({ key: '/' }, attrs({ contenteditable: 'plaintext-only' })) === false && wantsSearch({ key: '/' }, attrs({ contenteditable: 'false' })) === true, 'contenteditable as an attribute counts, and "false" does not');
  for (const role of ['textbox', 'searchbox', 'combobox', 'spinbutton']) check(wantsSearch({ key: '/' }, attrs({ role })) === false, `a role=${role} is a text field`);
  check(wantsSearch({ key: '/' }, attrs({ role: 'button' })) === true, 'a focused button is not');
  check(wantsSearch({ key: '/', target: { tagName: 'INPUT' } }, body) === false, 'a / sent to a field the document does not report as focused (a frame, a shadow root) is a /');
  check(wantsSearch({ key: '/', composedPath: () => [{ tagName: 'TEXTAREA' }, { tagName: 'X-HOST' }] }, { tagName: 'X-HOST' }) === false, 'the composed path\'s first element is asked, inside a shadow root');
  check(wantsSearch({ key: '/', isComposing: true }, body) === false && wantsSearch({ key: '/', keyCode: 229 }, body) === false, 'never mid-composition (an input method)');
  check(wantsSearch({ key: '/', shiftKey: true }, body) === true, 'Shift stays allowed: on a German keyboard / is Shift+7');
  check(wantsSearch({ key: '/', ctrlKey: true }, body) === false && wantsSearch({ key: '/', metaKey: true }, body) === false, 'Ctrl+/ and Cmd+/ stay the browser\'s');
  check(wantsSearch({ key: '/', defaultPrevented: true }, body) === false && wantsSearch({ key: '?' }, body) === false, 'a key somebody else took, or another key, is not it');
  const exploreKeys = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/const toSearch = \(e\) => \{[\s\S]{0,900}search\.focus\(\);\s*\};\s*document\.addEventListener\('keydown', \(e\) => \{ if \(wantsSearch\(e, document\.activeElement\)\) toSearch\(e\); \}\);/.test(exploreKeys), 'the explore view listens for it and focuses the field');
  check(/cls\.contains\('sr-clean'\) \|\| cls\.contains\('sr-trip-mode'\)/.test(exploreKeys), 'never over a clear screen or in a trip');
  check(/\(L\)/.test(COPY.rail.show) && /\(P\)/.test(COPY.rail.share) && /\(H\)/.test(COPY.clean.hide) && /H or Escape/.test(COPY.clean.show) && /\(\/\)/.test(COPY.search.inputTitle),
    'the tooltips name their keys: L, P, H, / and Escape');
  check(/\(Escape\)/.test(COPY.card.closeTitle), 'and the card\'s close names Escape');
  check(railKey({ key: 'p', metaKey: true }, body) === null && railKey({ key: 'l', ctrlKey: true }, body) === null, 'browser shortcuts are the browser\'s');
  check(railKey({ key: 'h' }, body) === null, 'H is the clear screen\'s own (ui/cleanview.js)');

  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const at = (s) => main.indexOf(s);
  const order = ['createShell(ctx', 'createExplore(ctx, shell.host(\'home\'))', 'createRail(ctx, shell.railHost)', 'createTimePill(ctx, shell.timeHost)', 'createTripFrame(ctx)'];
  check(order.every((s) => at(s) > 0), `main.js builds the shell and everything it hosts (${order.filter((s) => at(s) < 0).join(', ') || 'all found'})`);
  check(order.every((s, i) => i === 0 || at(order[i - 1]) < at(s)), 'in order: the boxes, then their contents, then the trip frame that hides them');
  // Spec 0061 task 3: the phone's bar of two buttons and its drawers are gone; the sheet replaced them.
  check(!/createMobileUI|ui\/mobile\.js/.test(main) && !existsSync(join(JS, 'ui/mobile.js')), 'the old phone bar is not built, and its module is gone');
  // What the first view does not show is not downloaded for it (0061 req 14): the sources sheet, the
  // What-to-show popover and the Tonight tab are dynamic imports, which scripts/gen_modulepreload.py
  // leaves out of the boot list by design.
  check(/loadSources: \(host\) => import\('\.\/ui\/status\.js'\)/.test(main) && !/^import[^\n]*ui\/status\.js/m.test(main), 'the sources sheet loads when first opened');
  const railSrc = readFileSync(join(JS, 'ui/rail.js'), 'utf8');
  const exploreSrc = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/import\('\.\/whattoshow\.js'\)/.test(railSrc) && !/^import[^\n]*whattoshow/m.test(railSrc), 'What to show loads when first opened');
  // The Tonight view is fetched by main.js inside the tab's mount (so the first time the tab is shown)
  // and brings the place controls with it (ui/tonight.js imports ui/place.js; internal #455): the
  // explore view names neither, and neither is a first visit's module.
  const tonightSrc = readFileSync(join(JS, 'ui/tonight.js'), 'utf8');
  check(/mountTab\('tonight', \(host\) => \{\s*import\('\.\/ui\/tonight\.js'\)/.test(main) && !/^import[^\n]*ui\/(tonight|place)\.js/m.test(main)
    && !/place\.js|tonight\.js'/.test(exploreSrc) && /^import \{ createPlace \} from '\.\/place\.js';/m.test(tonightSrc), 'the Tonight tab, and the place controls in it, load when the tab is first shown');
  // The Tonight tab's mount point (spec 0051's ui/tonight.js plugs in here without editing explore.js).
  check(/function mountTab\(id, render, opts = \{\}\)/.test(exploreSrc) && /mountTab \}/.test(exploreSrc), 'the explore view offers mountTab(id, render) for a tab\'s content');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(!/ui\/(status|whattoshow|place|colorkey)\.js/.test(html), 'and none of them is preloaded at boot');
  check(!/createControls|createGitHubMark|createPrintButton\(ctx\)|createCleanView\(ctx\)/.test(main), 'the old left panel, the corner mark and the loose corner buttons are not built');
  const frame = readFileSync(join(JS, 'ui/tripframe.js'), 'utf8');
  // Spec 0061 task 7: a trip hides the rail and the pill; the sidebar stays and is the trip's own
  // view. Task 3: on a phone too, where the sidebar is the sheet, and the top bar goes with the rail.
  check(/const CHROME = \['sr-rail', 'sr-time', 'sr-top'\]/.test(frame), 'a trip hides the rail, the pill and the phone\'s top bar');
  // (Except in present mode, public #441, where the sidebar is gone and the sheet is the room's caption.)
  check(/const sideHost = (!present && )?shell && typeof shell\.host === 'function' \? shell\.host\('trip'\)/.test(frame) && /seatTrip\(parts\.cardSlot\)/.test(frame) && !/side\.inert = phone/.test(frame), 'and seats its sheet in the sidebar\'s trip view at every width (one sheet on a phone), the card in its slot');
  check(/#sr-side \[data-trip=/.test(frame), 'and Leave gives focus back to the trip card it was started from');
}


// --- 8. the way back, the pinned search, the panel's own control (2026-11-23) -------------------------
// A visitor's review: once something was clicked it was hard to get back to the search, and the arrow that hid the
// panel was the arrow that went back. ui/shell.js THE WAY BACK SAYS WHERE IT GOES.
{
  check(crumbFor('home', { home: { q: 'mars' } }) === 'Results for “mars”', `a card opened from the results goes back to them by name (${crumbFor('home', { home: { q: 'mars' } })})`);
  check(crumbFor('home', { home: { tab: 'planets' } }) === 'Planets' && crumbFor('home', { home: { tab: 'stars' } }) === 'Stars', 'from a tab\'s list, to that tab');
  check(crumbFor('home', {}) === 'Search' && crumbFor('home', { home: { tab: null } }) === 'Search' && crumbFor('home', { home: { q: 'm' } }) === 'Search', 'from the map or a link (or a one-letter query, which lists nothing), to the search');
  check(crumbFor('home', { home: { q: 'mars', tab: 'planets' } }).startsWith('Results'), 'a query beats the tab: the results are what was on screen');
  const long = crumbFor('home', { home: { q: 'x'.repeat(80) } });
  check(long.includes('…') && long.length <= 60, `a long query is cut to one line of chrome (${long.length} characters)`);
  check(crumbFor('card', { card: 'Mars' }) === 'Mars' && crumbFor('card', {}) === COPY.shell.card, 'a sheet over a card goes back to the card by its name');
  check(crumbFor('sources') === 'Sources' && crumbFor('passport') === 'Passport' && crumbFor('find') === 'Find', 'and to a sheet by its name');
  check(/\{where\}/.test(COPY.shell.backTo) && /\{q\}/.test(COPY.shell.results), 'the button\'s name says Back to where');
  // Every language has the words, keeps the slots, and stays on one line.
  for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'ar', 'he']) {
    const L = (await import(join(JS, `copy/${lang}.js`))).COPY;
    const S = L.shell || {};
    const missing = ['backTo', 'results', 'search', 'sources', 'passport', 'find', 'card', 'reopen', 'close', 'expand', 'collapse', 'panelKey', 'keyed'].filter((k) => typeof S[k] !== 'string' || !S[k]);
    check(!missing.length, `${lang}: the shell's words are there (${missing.join(', ') || 'all'})`);
    if (missing.length) continue;
    check(/\{q\}/.test(S.results) && /\{where\}/.test(S.backTo) && /\{name\}/.test(S.reopen) && /\{label\}/.test(S.keyed) && /\{key\}/.test(S.keyed), `${lang}: every slot kept`);
    const crumbs = [crumbFor('home', { home: { q: 'y'.repeat(CRUMB_QUERY_MAX + 10) } }, L), crumbFor('home', { home: { tab: 'planets' } }, L), crumbFor('home', {}, L)];
    check(crumbs.every((c) => c && c.length <= 60) && crumbs[1] === L.tabs.planets && crumbs[2] === S.search, `${lang}: the three breadcrumbs, each one line (${crumbs.map((c) => c.length).join(', ')})`);
    check(S.panelKey === '[', `${lang}: the key is [ on every keyboard layout's own label`);
  }
  // `[` hides and shows the panel, as `/` finds: never while typing, never with a modifier.
  const body = { tagName: 'BODY' };
  check(panelKey({ key: '[' }, body, isTypingIn) === true, '[ asks for the panel');
  check(panelKey({ key: '[' }, { tagName: 'INPUT' }, isTypingIn) === false && panelKey({ key: '[', target: { tagName: 'TEXTAREA' } }, body, isTypingIn) === false, 'a [ typed into a field is a [');
  check(panelKey({ key: '[', metaKey: true }, body, isTypingIn) === false && panelKey({ key: '[', ctrlKey: true }, body, isTypingIn) === false, 'Cmd+[ and Ctrl+[ stay the browser\'s (Back)');
  check(panelKey({ key: '[', isComposing: true }, body, isTypingIn) === false && panelKey({ key: '[', defaultPrevented: true }, body, isTypingIn) === false && panelKey({ key: ']' }, body, isTypingIn) === false, 'not mid-composition, not a key somebody took, not ]');
  check(/\(\[\)/.test(`${COPY.shell.collapse} (${COPY.shell.panelKey})`) && COPY.shell.collapse === 'Hide panel' && COPY.shell.expand === 'Show panel', 'the control is "Hide panel", and its tooltip names [');

  const shellSrc = readFileSync(join(JS, 'ui/shell.js'), 'utf8');
  const exploreSrc = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  const cardsSrc = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  const body8 = (src, name) => { const i = src.indexOf(`function ${name}(`); return i < 0 ? '' : src.slice(i, src.indexOf('\n  }\n', i)); };
  // Pinned: the head lives in the shell's head box, above the views, so a card opens under the search and the tabs.
  check(/const headHost = el\('div', 'sr-side__head'\);\s*side\.appendChild\(headHost\);/.test(shellSrc) && shellSrc.indexOf("side.appendChild(headHost)") < shellSrc.indexOf('for (const v of views.values()) side.appendChild(v);'), 'the shell makes the head box first, above every view');
  check(/if \(shell0 && shell0\.headHost\) shell0\.headHost\.appendChild\(head\);/.test(exploreSrc), 'the explore view puts its wordmark, search and tabs there');
  check(/html:not\(\.sr-phone\) \.sr-side\.is-results > :is\(\.sr-side__view, \.sr-side__open\)/.test(css), 'open results take the column over whatever view is under them, a card included');
  check(!/deselect/.test(exploreSrc.slice(exploreSrc.indexOf('const toSearch'), exploreSrc.indexOf('document.addEventListener(\'keydown\', (e) => { if (wantsSearch'))), '/ goes to the field without putting the selection down');
  // Back is a step, not a deselect; only the card's close (and the open row's) puts the selection down.
  const step = body8(shellSrc, 'stepBack');
  check(step && !/deselect/.test(step) && /back\(\);/.test(step) && /homeSays\.restore\(crumb\)/.test(step), 'Back steps one view and keeps the selection, and puts the home back as it was (the results reopen)');
  check(/escapeCard\(\) \{[\s\S]{0,300}if \(view === 'card'\) \{ stepBack\(\); return true; \}/.test(shellSrc)
    && /shell\.escapeCard\(\)\) return;\s*hideCard\(\);/.test(cardsSrc) && /event\.defaultPrevented\) return;/.test(cardsSrc), 'Escape on a card steps back the same way; with the card not on top it closes it, and an Escape the search took is the search\'s');
  check((shellSrc.match(/show\('card', \{ again: true \}\)/g) || []).length === 2 && /!how\.again\) noteHome\(\);/.test(shellSrc), 'going back to the open card (its row, the strip) keeps the breadcrumb it had');
  check(/window\.addEventListener\('sr:select'/.test(shellSrc) && /if \(stack\.current\(\) !== 'card'\) \{ show\('card'\); return; \}/.test(shellSrc), 'a new selection under an open card brings the card back to the top');
  check(/crumb\.button\.setAttribute\('aria-label', t\(COPY\.shell\.backTo, \{ where: words \}\)\)/.test(shellSrc), 'the back row\'s name is "Back to …" with the same words');
  // The panel's own control: Lucide's icon, never the back row's chevron, and the strip in place of the "S ›" handle.
  check(/collapse\.dataset\.icon = 'panel-left-close';/.test(exploreSrc) && !/button\('[^']*', COPY\.shell\.backChevron\)/.test(exploreSrc) && /aria-keyshortcuts', COPY\.shell\.panelKey/.test(exploreSrc), 'Hide panel is panel-left-close with [ named, not the ‹ of Back');
  check(/stripOpen\.dataset\.icon = 'panel-left-open';/.test(shellSrc) && !/handleMark|sr-side__handle/.test(shellSrc + css) && !('handleMark' in COPY.shell), 'the hidden panel is a strip that opens with panel-left-open; the "S ›" handle is gone');
  check(/stripButton\('search', COPY\.shell\.search, toSearch\)/.test(exploreSrc) && /stripButton\(TAB_ICONS\[id\], COPY\.tabs\[id\]/.test(exploreSrc) && /stripCardName/.test(shellSrc), 'the strip has the search, the four tabs and the open card\'s name');
  check(/\.sr-side\.is-collapsed > :is\(\.sr-side__view, \.sr-side__head, \.sr-side__open\) \{\s*display: none;/.test(css) && /\.sr-side\.is-collapsed > \.sr-strip \{\s*display: flex;/.test(css), 'hidden, only the strip shows');
  check(/strip\.inert = !folded;/.test(shellSrc) && /headHost\.inert = folded;/.test(shellSrc), 'and only what shows is in the tab order');
  check(/import\('\.\/icons\.js'\)/.test(shellSrc) && !/^import[^\n]*icons\.js/m.test(shellSrc + exploreSrc), 'the icons arrive with ui/icons.js on a desktop, outside the boot graph');
}

// Live check 2026-11-25 (390): the phone's More menu was the glass, and the hints and the time bar read through it. It wears
// the kit's solid surface. And on a card the heart tile takes its own width, so "Look inside" keeps one line beside it.
{
  const css = readFileSync(join(JS, '../css/ui.css'), 'utf8');
  const more = css.slice(css.indexOf('html.sr-phone .sr-pop.sr-more {'));
  check(/^html\.sr-phone \.sr-pop\.sr-more \{[^}]*background: var\(--panel\);[^}]*backdrop-filter: none;/.test(more), 'the phone\'s More menu is the kit\'s solid surface, not glass');
  check(/\.sr-card__sky:not\(\.is-many\):has\(> :nth-child\(2\)\):has\(> \.sr-heart\) \{\s*display: flex;/.test(css) && /\.sr-card__sky:not\(\.is-many\):has\(> :nth-child\(2\)\) > \.sr-heart \{\s*flex: 0 0 auto;/.test(css),
    'beside other tiles the heart takes its own width and the words share the rest');
}

if (problems.length) { console.error('shell FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('shell ok: views push and pop, collapse is remembered (and survives a storage that throws), the four tabs are places and read back from the stage, Right-now lines appear only with their data, the status line counts, the pill cycles, steps and stays in the scrub window, main.js builds the shell before what it hosts, and the way back names where it goes in eleven languages, keeps the selection, and the panel hides with its own icon and [ to a strip');
