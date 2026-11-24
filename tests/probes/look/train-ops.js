// train-ops: the research train "ops" (forge #558, #561, #562, #563), one walk with a picture of each new place: the Live rows on
// the Earth tab; State of Space with its numbers, owners and sparklines; re-entries and close calls; the Deep Space Network's
// contacts and its lines on the map (the Earth's stage, then the Sun's); Earth events, a row flown to. Run after the prelude:
// `cat _prelude.js train-ops.js > /tmp/p.js; node tools/cdp.mjs <url> /tmp/p.js --shot-dir=<dir> --block=celestrak.org
// [--mobile --width=390 --height=844]`. The page needs our saved copies (data/v1/) to show the summaries.
look.probe = 'train-ops';
const out = { took: [], seen: {} };
const settle = (ms = 1500) => sleep(ms);
const visible = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && e.getClientRects().length > 0; };
const snap = async (name) => { await shot(name); out.took.push(name); };
const into = (sel) => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'start' }); return !!e; };
const tab = async (which) => { const b = document.getElementById(`sr-ops-tab-${which}`); if (b) b.click(); await settle(1200); };

const away = document.querySelector('[data-entrance="explore"]') || document.querySelector('.sr-welcome .ui-btn, .sr-welcome button');
if (away) away.click();
await settle(1500);

// 1. the Live rows on the Earth tab
out.seen.rows = await until(() => visible('button[data-ops="state"]'), 90000);
into('.sr-opsentry');
await settle(800);
await snap('live-rows');

// 2. State of Space
document.querySelector('button[data-ops="state"]').click();
out.seen.state = await until(() => visible('.sr-ops__hero .sr-hero__num'), 60000);
await settle(2500);
out.stateHero = [...document.querySelectorAll('.sr-ops__hero .sr-hero__num')].map((n) => n.textContent);
out.stateStatus = (document.querySelector('.sr-ops__state .sr-ops__status') || {}).textContent || '';
await snap('state');
into('.sr-ops__sparks');
await settle(800);
await snap('state-sparks');

// 3. re-entries and close calls
await tab('reentry');
out.seen.close = await until(() => visible('.sr-ops__close .sr-list__row'), 60000);
await settle(1000);
await snap('reentry');
into('.sr-ops__lowest');
await settle(800);
await snap('reentry-lowest');

// 4. the Deep Space Network, then its lines on the Earth's stage and on the Sun's
await tab('dsn');
out.seen.dsn = await until(() => visible('.sr-ops__contacts .sr-list__row'), 60000);
await settle(1000);
out.dsnRows = [...document.querySelectorAll('.sr-ops__contacts .sr-list__name')].map((n) => n.textContent);
await snap('dsn');
const lines = document.querySelector('.sr-ops__dsn .ui-btn[aria-pressed]');
if (lines) lines.click();
await until(() => sr.dsnLines && sr.dsnLines.visible(), 30000);
await until(() => (sr.recordsFor('deep-space') || []).length > 0, 60000);
await settle(6000);
out.dsnDrawn = sr.scene.getObjectByName('dsn-lines') ? sr.scene.getObjectByName('dsn-lines').geometry.drawRange.count / 2 : 0;
await snap('dsn-lines-earth');
if (typeof sr.setStage === 'function') { sr.setStage('sun'); await settle(1500); if (typeof sr.frameSolarSystem === 'function') sr.frameSolarSystem(); }
await settle(8000);
await snap('dsn-lines-sun');
if (typeof sr.setStage === 'function') { sr.setStage('earth'); await settle(3000); }

// 5. Earth events: the list, then a row flown to
await tab('events');
out.seen.events = await until(() => visible('.sr-ops__eventlist .sr-list__row'), 60000);
await settle(1000);
await snap('events');
const row = document.querySelector('.sr-ops__eventlist .ui-row');
if (row) { out.flewTo = row.textContent.slice(0, 80); row.click(); }
await settle(12000);
out.selected = sr.selected() ? sr.selected().id : null;
await snap('events-flown');

// 6. State of Space again: on a slow first visit our copy's index can come after the pane's first read; the pane reads it again
// within a minute, and this is the picture with the live numbers.
await tab('state');
out.seen.stateLive = await until(() => /Live|live/.test((document.querySelector('.sr-ops__state .ui-chip') || {}).textContent || ''), 90000);
await settle(2500);
await snap('state-live');

return finish(out);
