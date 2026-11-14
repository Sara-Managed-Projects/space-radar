// tests/test_card_honesty_words.mjs -- the owner's quality review of 13 November 2026, the card and Tonight words
// (internal #268, #269, #274, #296, #298, #299, #301, #304, #305, #314).
//
// Asserted, with no browser:
//   STAR CLASS: "A0Vvar" is the code A0V and "white mid-life star"; M2Ib a red supergiant; catalogue suffixes dropped;
//     brown and white dwarfs named; a type that cannot be read comes back as written.
//   THE BADGE: Place and Picture are said apart; an exoplanet's picture is a stand-in, a world's is not.
//   THE YEAR: a long year in days gets Earth years in its caption; a short one does not.
//   TONIGHT: a pass with no magnitude is not "best"; an unfamiliar name gets a few words, a familiar one none.
//   THE OLD SENTENCES ARE GONE: "not in this version yet", "the kind of thing" for a star.
//
//   node tests/test_card_honesty_words.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const { COPY, fmt } = await mod('copy/en.js');
await mod('copy/en.later.js');
const F = await mod('ui/cardfacts.js');
const G = await mod('sky/gloss.js');
const B = await mod('sky/tonightbest.js');
const Cards = await mod('ui/cards.js');

const sc = (s) => F.starClassParts(s);
check(sc('A0Vvar').code === 'A0V' && sc('A0Vvar').words === 'white mid-life star', `A0Vvar: ${JSON.stringify(sc('A0Vvar'))}`);
check(sc('M2Ib').code === 'M2Ib' && sc('M2Ib').words === 'red supergiant', `M2Ib: ${JSON.stringify(sc('M2Ib'))}`);
check(sc('A0m').code === 'A0' && sc('A0m').words === 'white star', `A0m: ${JSON.stringify(sc('A0m'))}`);
check(sc('K0III').words === 'orange giant' && sc('G2V').words === 'yellow mid-life star', 'K0III and G2V');
check(sc('L8±1').words === 'brown dwarf' && sc('DA2').words === 'white dwarf', 'brown and white dwarfs');
check(sc('weird').code === 'weird' && sc('weird').words === '' && sc('').code === '', 'a type it cannot read is kept, with no words');
check(F.starClassLine('A0Vvar') === 'A0V · white mid-life star', `the row: ${F.starClassLine('A0Vvar')}`);

check(F.pictureIsIllustrative({ id: 'trappist-1e', klass: 'exoplanet' }) === true, 'an exoplanet picture is a stand-in');
check(F.pictureIsIllustrative({ id: 'jupiter', klass: 'world' }) === false, 'a world is not');

const rows = [['Length of a year', '10 759 days']];
const hero = Cards.heroNumbers({ id: 'saturn', klass: 'world', name: 'Saturn', meta: { parent: 'sun' } }, { frame: 'sun-ecliptic' }, [[COPY.card.rows.yearLength, COPY.card.values.days.replace('{n}', fmt.int(10759))]]);
const year = hero.find((h) => h.key === 'yearLength');
check(year && /29 Earth years/.test(year.caption) && year.num === fmt.int(10759), `a long year gets Earth years: ${JSON.stringify(year)}`);
const short = Cards.heroNumbers({ id: 'mars', klass: 'world', name: 'Mars', meta: { parent: 'sun' } }, { frame: 'sun-ecliptic' }, [[COPY.card.rows.yearLength, COPY.card.values.days.replace('{n}', '687')]]).find((h) => h.key === 'yearLength');
check(short && !/Earth years/.test(short.caption), `a short year does not: ${JSON.stringify(short)}`);

const R = Math.PI / 180;
const pass = (magnitude, record) => ({ recordId: record.id, record, visible: true, startMs: 1, peakMs: 2, endMs: 3, startAz: 0, peakAz: 1, endAz: 2, peakEl: 40 * R, magnitude });
check(!B.worthARow(pass(null, { id: '1', name: 'SPACEMOBILE-002' })) && B.worthARow(pass(2.5, { id: '1', name: 'SPACEMOBILE-002' })), 'no magnitude, not best');
check(G.whatIs({ id: '63772' }) === 'a European forest-mapping satellite' && G.whatIs({ id: '25544' }) === '' && G.whatIs(null) === '', 'Biomass is explained, the ISS is not');

const all = [COPY.sky.worldNoRise, COPY.explore.worldsTitle, COPY.orrery.size, COPY.orrery.sizeTrue, COPY.tonight.guessCaveat, COPY.tonight.settings, COPY.launchChip.rocket].join(' | ');
check(!/not in this version yet/.test(all), 'the Venus card no longer says rise times are not in this version');
check(/distance from Earth/.test(COPY.explore.worldsTitle), 'the list says its distances are from Earth');
check(/set your town/.test(COPY.tonight.guessCaveat), 'the pass times say to set a town');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/klass === 'star' && T\.objectOwn/.test(cards), 'a star is "drawn as", not "the kind of thing"');
check(COPY.truth.placeWord.includes('{word}') && COPY.truth.pictureWord.includes('{word}'), 'the badge has Place and Picture');
check(COPY.truth.hints.inferred === 'Modelled' && COPY.truth.hints.illustration === 'Illustrative' && COPY.truth.hints.model !== 'Model', 'one ladder: Measured, Modelled, Illustrative');
check(/dark as charcoal, and a ring that dark can look absent/.test(COPY.drawing.worldRings), 'faint rings are explained');

if (problems.length) {
  console.error('card honesty words FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('card honesty words ok: star class in words, Place and Picture apart, Earth years for a long year, no unranked "best", a few words for an unfamiliar name');
