// tests/test_launchchip.mjs -- launch day in the top bar (public #289, ui/launchchip.js).
//
// Asserted, with no browser:
//   WHICH LAUNCH: the nearest one ahead inside a day; failing that the one just past its planned
//     time; none when nothing is inside the day or the time is only a date.
//   WHAT IT SAYS: the clock, or the status word when no number may tick (Hold); the tooltip
//     carries the name, Launch Library's status and how old the reading is.
//   THE TRAIN LINE: only a Starlink launch gets one; it is the Coming up list's own next train
//     pass; with no pass ahead there is no line.
//   LAZY: main.js imports it dynamically; nothing at boot; its words are in copy/en.later.js.
//
//   node tests/test_launchchip.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const chip = await mod('ui/launchchip.js');
const { COPY } = await mod('copy/en.js');
const { COUNT_WITHIN_MS, AFTER_MS, tMinus } = await mod('ui/countdown.js');

const now = Date.UTC(2026, 9, 8, 12, 0, 0);
const H = 3600e3;
const launch = (id, name, inMs, status = 'Go', precision = 'Second') => ({
  id, name, layer: 'launches', meta: { netMs: now + inMs, statusAbbrev: status, netPrecision: precision },
});

// --- which launch -------------------------------------------------------------------------------
const soon = launch('a', 'Falcon 9 Block 5 | Starlink Group 10-52', 2 * H);
const later = launch('b', 'Electron | A Sky Full of SARs', 9 * H);
const tomorrow = launch('c', 'Ariane 64 | Kuiper', COUNT_WITHIN_MS + H);
const justWent = launch('d', 'Long March 2D | Yaogan', -10 * 60e3);
const roughDay = launch('e', 'Vulcan | NET October', 3 * H, 'TBD', 'Day');
check(chip.nextCountable([later, tomorrow, soon], now).record === soon, 'the nearest launch ahead is the one counted to');
check(chip.nextCountable([tomorrow], now) === null, 'a launch more than a day off has no chip');
check(chip.nextCountable([roughDay], now) === null, 'a time that is only a date does not count down');
check(chip.nextCountable([justWent], now).record === justWent, 'a launch just past its planned time still speaks');
check(chip.nextCountable([justWent, later], now).record === later, 'but one ahead comes first');
check(chip.nextCountable([launch('f', 'x', -AFTER_MS - 1000)], now) === null, 'and long past it is gone');
check(chip.nextCountable([], now) === null && chip.nextCountable(null, now) === null, 'no launches, no chip');
check(chip.nextCountable([{ id: 'g', meta: {} }], now) === null, 'a row with no time is passed over');

// --- what it says -------------------------------------------------------------------------------
const hit = chip.nextCountable([soon], now, 2 * H);
const words = chip.chipWords(hit.record, hit.state);
check(words.text === tMinus(2 * H), `the chip is the clock (got "${words.text}")`);
check(words.title.includes(soon.name) && words.title.includes(COPY.countdown.go), 'the tooltip names the launch and Launch Library\'s status');
check(/2 hours|2 h/.test(words.title), `and how old that status is (got "${words.title}")`);
const held = chip.nextCountable([launch('h', 'Soyuz 2.1b | Glonass', H, 'Hold')], now);
check(chip.chipWords(held.record, held.state).text === COPY.countdown.hold, 'on Hold no number ticks: the chip says the word');
check(chip.chipWords(null, null).text === '', 'nothing to say, nothing said');

// --- the train line -----------------------------------------------------------------------------
check(chip.isStarlinkLaunch(soon) && !chip.isStarlinkLaunch(later), 'a Starlink launch is known by Launch Library\'s name for it');
check(!chip.isStarlinkLaunch({ name: 'STARLINK-1234', layer: 'active' }), 'a Starlink satellite is not a launch');
const items = [
  { kind: 'pass', tMs: now + H, record: {} },
  { kind: 'train', tMs: now + 5 * H, count: 24, record: {} },
  { kind: 'train', tMs: now + 3 * H, count: 21, record: {} },
  { kind: 'train', tMs: now - H, count: 9, record: {} },
];
const line = chip.trainPassLine(items, now);
check(line.includes('21') && !line.includes('24'), `the next train's pass, not a later one (got "${line}")`);
check(line.length <= 60, `one chrome line: ${line.length} characters`);
check(chip.trainPassLine([{ kind: 'pass', tMs: now + H }], now) === '' && chip.trainPassLine(null, now) === '', 'no train pass ahead, no line');
// The words of time are the Coming up list's own, so the card and the list cannot disagree.
const { whenText } = await mod('ui/next.js');
check(line.includes(whenText(now + 3 * H, now)), 'said in the Coming up list\'s words of time');

// --- lazy, and honest about the ascent -----------------------------------------------------------
const main = read('site/js/main.js');
check(/import\('\.\/ui\/launchchip\.js'\)/.test(main) && !/^import[^\n]*launchchip/m.test(main), 'main.js imports the chip dynamically, never statically');
const cards = read('site/js/ui/cards.js');
check(/trainPassLine/.test(cards) && /isStarlinkLaunch/.test(cards), 'a Starlink launch\'s card asks for the train line');
const src = read('site/js/ui/launchchip.js');
check(/NO ASCENT TO FOLLOW/.test(src) && !/chase/i.test(src.replace(/\/\/.*$/gm, '')), 'no chase camera along a drawn climb: the header says why');
check(typeof COPY.launchChip.train === 'string' && typeof COPY.launchChip.opens === 'string', 'its words are in copy/en.later.js');

if (problems.length) {
  console.error('launchchip FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`launchchip ok: "${words.text}" for the nearest launch inside a day, "${COPY.countdown.hold}" on hold, none past a day; train line "${line}"`);
