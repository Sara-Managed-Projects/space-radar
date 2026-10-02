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
//
//   node tests/test_shell.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { createViewStack, readCollapsed, writeCollapsed, SIDE_KEY, VIEWS } = await import(join(JS, 'ui/shell.js'));
const { TABS, tabTarget, tabFor, rightNowLines, statusSummary, tripMeta } = await import(join(JS, 'ui/explore.js'));
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
  // Open Notify's headcount (explore.js pollAstros), once it has loaded.
  const counted = [{ key: 'iss', record: iss, count: 9 }, { key: 'tiangong', record: { id: 'sat-48274' }, count: 3 }];
  const withCount = rightNowLines({ crewed: counted, wallMs });
  check(withCount[0].id === 'crew' && withCount[0].value === '9 on ISS · 3 on Tiangong', `the headcount names how many once it has loaded (${withCount[0] && withCount[0].value})`);
  const partialCount = [{ key: 'iss', record: iss, count: 9 }, { key: 'tiangong', record: { id: 'sat-48274' } }];
  check(rightNowLines({ crewed: partialCount, wallMs })[0].value === '9 on ISS · Tiangong', 'a station with no count yet falls back to its bare name');
  check(rightNowLines({ crewed: [{ key: 'iss', record: iss, count: 0 }], wallMs })[0].value === 'ISS', 'a zero count (Open Notify answered but named nobody) is treated as no count, not "0 on ISS"');
}

// --- 5. the status line ----------------------------------------------------------------------------
{
  const day = 86400e3;
  check(statusSummary([]).state === 'wait' && statusSummary([]).text === COPY.statusLine.reading, 'before any source is asked, it says it is reading');
  const fresh = [{ fetchedAt: 1, ageMs: 60e3 }, { fetchedAt: 1, ageMs: 2 * day }, { attempted: false }];
  const a = statusSummary(fresh);
  check(a.state === 'ok' && a.text === '2 sources read · oldest 2 days ago', `all fresh: count and the oldest (${a.text})`);
  const b = statusSummary([{ fetchedAt: 1, ageMs: 60e3 }, { fetchedAt: 1, ageMs: 7 * day, stale: true }]);
  check(b.state === 'stale' && b.text === '2 sources read · 1 stale · oldest 7 days ago', `something stale: amber and says how many (${b.text})`);
  const c = statusSummary([{ fetchedAt: 1, ageMs: 60e3 }, { attempted: true, fetchedAt: null }]);
  check(c.state === 'failed' && c.text === 'One source read · 1 could not be read', `something failed: says so first (${c.text})`);
}

// --- trip cards ----------------------------------------------------------------------------------
{
  check(tripMeta({ planned: true, off: false, count: 4, estimateMs: 125e3 }) === '4 stops · 2 min', 'a trip card says its stops and minutes');
  check(tripMeta({ planned: false }) === COPY.tripCard.planning, 'before the plan lands it says it is working it out');
  check(tripMeta({ planned: true, off: true, reason: 'Needs a place' }) === 'Needs a place', 'a trip that cannot run says why, never hidden');
  check(tripMeta({ planned: true, off: false, count: 3, estimateMs: 60e3 }, 'Next: 12 August 2026') === 'Next: 12 August 2026', 'an event trip says when its event is');
}

// --- 6. the time pill --------------------------------------------------------------------------------
{
  check(PILL_RATES.join(',') === '1,60,600,3600', 'the rate cycles 1×, 60×, 600×, 3600× (design §7)');
  check(nextRate(1) === 60 && nextRate(3600) === 1 && nextRate(10) === 1 && nextRate(0) === 1, 'the cycle wraps, and a rate off it (an old link\'s 10×) goes to 1×');
  check(stepMs(1) === 600e3 && stepMs(3600) === 86400e3 && stepMs(36000) === 86400e3 && stepMs(10) === 600e3, 'a step is ten minutes at 1× and a day at 3600×; a rate between takes the step below');
  const anchor = Date.UTC(2026, 8, 29);
  check(clampToWindow(anchor - 30 * 86400e3, anchor) === anchor - 7 * 86400e3, 'a scrub stops a week back (spec 0005)');
  check(clampToWindow(anchor + 90 * 86400e3, anchor) === anchor + 30 * 86400e3, 'and thirty days on');
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
  check(/import\('\.\/place\.js'\)/.test(exploreSrc) && !/^import[^\n]*place\.js/m.test(exploreSrc), 'the Tonight tab loads when first shown');
  // The Tonight tab's mount point (spec 0051's ui/tonight.js plugs in here without editing explore.js).
  check(/function mountTab\(id, render, opts = \{\}\)/.test(exploreSrc) && /mountTab \}/.test(exploreSrc), 'the explore view offers mountTab(id, render) for a tab\'s content');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(!/ui\/(status|whattoshow|place|colorkey)\.js/.test(html), 'and none of them is preloaded at boot');
  check(!/createControls|createGitHubMark|createPrintButton\(ctx\)|createCleanView\(ctx\)/.test(main), 'the old left panel, the corner mark and the loose corner buttons are not built');
  const frame = readFileSync(join(JS, 'ui/tripframe.js'), 'utf8');
  // Spec 0061 task 7: a trip hides the rail and the pill; the sidebar stays and is the trip's own
  // view. Task 3: on a phone too, where the sidebar is the sheet, and the top bar goes with the rail.
  check(/const CHROME = \['sr-rail', 'sr-time', 'sr-top'\]/.test(frame), 'a trip hides the rail, the pill and the phone\'s top bar');
  check(/const sideHost = shell && typeof shell\.host === 'function' \? shell\.host\('trip'\)/.test(frame) && /seatTrip\(parts\.cardSlot\)/.test(frame) && !/side\.inert = phone/.test(frame), 'and seats its sheet in the sidebar\'s trip view at every width (one sheet on a phone), the card in its slot');
  check(/#sr-side \[data-trip=/.test(frame), 'and Leave gives focus back to the trip card it was started from');
}

if (problems.length) { console.error('shell FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('shell ok: views push and pop, collapse is remembered (and survives a storage that throws), the four tabs are places and read back from the stage, Right-now lines appear only with their data, the status line counts, the pill cycles, steps and stays in the scrub window, and main.js builds the shell before what it hosts');
