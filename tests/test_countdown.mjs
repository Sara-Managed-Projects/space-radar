// tests/test_countdown.mjs -- public #289: a launch within a day counts down, in Launch Library's
// own words for its state and with the age of that state (ui/countdown.js).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { tMinus, countdownState, launchAgeMs, COUNT_WITHIN_MS, AFTER_MS } = await import(join(JS, 'ui/countdown.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const C = COPY.countdown;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const NET = Date.UTC(2026, 9, 8, 12, 0, 0);
const H = 3600e3;
check(tMinus(2 * H + 14 * 60e3 + 7e3) === 'T−02:14:07', `two hours fourteen minutes seven seconds before (${tMinus(2 * H + 14 * 60e3 + 7e3)})`);
check(tMinus(999) === 'T−00:00:01' && tMinus(1) === 'T−00:00:01', 'the last second before is still T−1: never T−0 while it has not happened');
check(tMinus(0) === 'T+00:00:00' && tMinus(-70e3) === 'T+00:01:10', 'and after the moment it counts up');
check(tMinus(23 * H + 59 * 60e3 + 59.5e3) === 'T−24:00:00' || tMinus(23 * H + 59 * 60e3 + 59.5e3) === 'T−23:59:60' ? tMinus(23 * H + 59 * 60e3 + 59.5e3) === 'T−24:00:00' : false, `seconds carry into minutes and hours (${tMinus(23 * H + 59 * 60e3 + 59.5e3)})`);

const at = (left, extra = {}) => countdownState({ netMs: NET, nowMs: NET - left, status: 'Go', precision: 'Second', ...extra });
check(at(COUNT_WITHIN_MS + 1000) === null, 'more than a day off: nothing, the row already says when');
check(at(3 * H).phase === 'go' && at(3 * H).clock === 'T−03:00:00' && at(3 * H).words === C.go, 'within a day and Go: the count and "Go for launch"');
check(at(3 * H, { status: 'TBC' }).phase === 'unconfirmed' && at(3 * H, { status: 'TBC' }).words === C.tbc && at(3 * H, { status: 'TBD' }).words === C.tbd, 'TBC and TBD count to the plan and say it is not confirmed');
check(at(3 * H, { status: null }).phase === 'unconfirmed', 'no status at all is not a "go"');
{
  const hold = at(40 * 60e3, { status: 'Hold' });
  check(hold.phase === 'hold' && hold.clock === '' && hold.words === C.hold, 'On Hold: the words, and NO ticking number (a clock running through a hold would be a lie)');
}
check(at(-60e3, { status: 'In Flight' }).phase === 'flight' && at(-60e3, { status: 'In Flight' }).clock === 'T+00:01:00', 'In Flight counts up');
check(at(-60e3, { durationS: 540 }).phase === 'planned-past' && at(-60e3, { durationS: 540 }).words === C.byPlanClimbing, 'past T-0 and still "Go" on our copy: "by the plan", not "lift-off"');
check(at(-20 * 60e3, { durationS: 540 }).words === C.byPlan && at(-AFTER_MS - 1000) === null, 'and half an hour on it stops speaking');
for (const [abbrev, words] of [['Success', C.success], ['Deployed', C.deployed], ['Failure', C.failure], ['Partial Failure', C.partial]]) {
  const st = at(-5 * 60e3, { status: abbrev });
  check(st.phase === 'ended' && st.words === words && st.clock === '', `${abbrev}: said, with no clock`);
}
check(at(3 * H, { precision: 'Month' }) === null && at(3 * H, { precision: 'Day' }) === null, 'a launch dated to the day or the month has no second to count to');
check(at(3 * H, { ageMs: 42 * 60e3 }).age === 'read 42 minutes ago' || /read .*42/.test(at(3 * H, { ageMs: 42 * 60e3 }).age), `the status carries its age (${at(3 * H, { ageMs: 42 * 60e3 }).age})`);
check(at(3 * H).age === '' && at(3 * H, { ageMs: NaN }).age === '', 'and no age is claimed when none is known');
check(countdownState({}) === null && countdownState({ netMs: NaN, nowMs: 1 }) === null, 'no time, nothing');
check(launchAgeMs({ sources: { status: () => [{ id: 'll2-upcoming', ageMs: 5 }] } }) === 5 && launchAgeMs({}) === null && launchAgeMs({ sources: { status: () => { throw new Error('x'); } } }) === null, 'the age is the launch list\'s own, or nothing');
// Launch Library has no "scrubbed" status, and neither do the words.
check(!Object.values(C).some((v) => /scrub/i.test(v)), 'nothing here says "scrubbed": the source has no such state');
{
  const src = readFileSync(join(JS, 'ui/countdown.js'), 'utf8');
  check(/READ 2026-10-07/.test(src) && /config\/launch_statuses/.test(src), 'the status vocabulary is cited, with the day it was read');
}

if (problems.length) { console.error('countdown FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('countdown ok: T-minus within a day, Launch Library\'s own states, no number through a hold, "by the plan" past T-0 without newer word, the status\'s age beside it');
