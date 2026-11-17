// data/ended.js -- craft the hand-kept lists named as working that are no longer in orbit.
//
// WHY A LIST OF ITS OWN (review of 2026-11-16). data/layers.js NOTABLE is the satellites worth knowing
// that the map DRAWS: the harvester cuts its `celestrak-notable` file by those catalogue numbers
// (harvest/notable.json) and every row's `why` is in the present tense. Swift was a row of it until it
// re-entered the atmosphere on 4 November 2026; twelve days later its page still said "Swift is a space
// telescope going round the Earth" and "It turns to point at a gamma-ray burst", with a button to see it
// live. A craft that ends moves HERE, with its dates and their sources: it is in no list the map draws
// from, its page (scripts/object_pages.mjs) says what it was, in the past tense, with the day it ended,
// and offers no live view. Nothing in the app imports this file: it is read when the pages are built.
//
// HOW THE NEXT ONE IS FOUND. scripts/check_notable_decay.py holds every row of NOTABLE to CelesTrak's
// satellite catalogue (the site's own saved copy, data/v1/celestrak-satcat.json): a decay date or the
// status "D" for a row still in NOTABLE fails. tests/test_ended.mjs holds the two lists apart.
//
// Row: noradId, name; launched, ended (YYYY-MM-DD, UTC) and, where the agency gives one, scienceEnded;
// how (re-entered | switched-off | lost); lead (the page's first sentence) and why (what it did and how
// it ended), both in the past tense; sources (one line, with the pages read and the day).

/** @type {Array<{noradId:number, name:string, launched:string, scienceEnded?:string, ended:string, how:string, lead:string, why:string, sources:string}>} */
export const NOTABLE_ENDED = [
  {
    noradId: 28485,
    name: 'Swift',
    launched: '2004-11-20',
    scienceEnded: '2026-10-23',
    ended: '2026-11-04',
    how: 're-entered',
    // NASA, swift.gsfc.nasa.gov, news of 23 October 2026 ("has ended its science mission now that the
    // spacecraft is orbiting less than 171 miles", 275 km) and of 4 November 2026 ("re-entered Earth's
    // atmosphere Wednesday, almost 22 years after launch"). CelesTrak SATCAT, NORAD 28485: launched
    // 2004-11-20, DECAY_DATE 2026-11-04, OPS_STATUS_CODE D. All read 2026-11-16.
    lead: 'Swift was a space telescope that went round the Earth from November 2004 until it re-entered the atmosphere on 4 November 2026.',
    why: 'It turned to point at a gamma-ray burst within a minute of one going off anywhere in the universe. NASA ended its science on 23 October 2026, when it had sunk below 275 km and the air there no longer let it hold steady on a target.',
    sources: 'Source: NASA, Swift mission news (https://swift.gsfc.nasa.gov/), read 16 November 2026 · Decay date: CelesTrak satellite catalogue (https://celestrak.org/satcat/records.php?CATNR=28485), read 16 November 2026',
  },
];
