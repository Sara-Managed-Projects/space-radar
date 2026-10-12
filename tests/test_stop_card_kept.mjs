// A trip's stop card is not repainted as the object's own card (found in the walk of 2026-10-09).
//
//   node tests/test_stop_card_kept.mjs
//
// THE BUG. ui/missions.js calls ctx.refreshCard() when a mission's rows land, and main.js answered
// by showing the selection's card with no `lead`: at a trip's stop that replaced the stop's title
// and words with the whole object card. Both Voyager 1 stops ("A gold record, further away than
// anything" in the strangest things, the last stop of the outer Solar System) were read aloud under
// a card that said PROBE and offered "Fly to it".
//
// Held: tripOwnsCard() is true exactly while a stop is flown to or shown, and main.js asks it.
// Reads main.js as text, so it is NOT in scripts/check_built_tree.mjs TESTS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { tripOwnsCard, idleTripState } = await import(join(ROOT, 'site/js/ui/tripstate.js'));

check(tripOwnsCard(idleTripState()) === false, 'no trip: the card is the selection\'s');
check(tripOwnsCard(null) === false && tripOwnsCard(undefined) === false, 'no state at all is no trip');
for (const phase of ['veil', 'flight', 'settle', 'dwell', 'held', 'paused']) {
  check(tripOwnsCard({ phase, index: 3 }) === true, `at a stop (${phase}) the card is the trip's`);
}
for (const phase of ['idle', 'intro', 'outro']) {
  check(tripOwnsCard({ phase, index: 3 }) === false, `in ${phase} the card is not a stop's`);
}
check(tripOwnsCard({ phase: 'flight', index: -1 }) === false, 'before the first stop there is no stop card');

const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
const m = /ctx\.refreshCard = \(\) => \{([^\n]*)\};/.exec(main);
check(m && /!tripOwnsCard\(ctx\.trip && ctx\.trip\.state\)/.test(m[1]) && /showCard\(selected, ctx\)/.test(m[1]), 'main.js refreshCard leaves a stop card alone');
const trip = readFileSync(join(ROOT, 'site/js/ui/trip.js'), 'utf8');
const phases = /const STOP_PHASES = \[([^\]]*)\]/.exec(trip);
check(phases && phases[1].replace(/['\s]/g, '') === 'veil,flight,settle,dwell,held,paused', 'the phases are ui/trip.js STOP_PHASES, word for word');

if (problems.length) {
  console.error(`stop card kept FAILED (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('stop card kept ok: a mission landing late repaints the selection\'s card only when no trip is at a stop');
