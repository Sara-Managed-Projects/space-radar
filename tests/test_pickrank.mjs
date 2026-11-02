// tests/test_pickrank.mjs -- spec 0028 req 4: the smaller thing under the finger wins.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { rankPick, rankAll } = await import(join(JS, 'scene/pickrank.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const iss = { id: 'sat-25544', name: 'ISS', klass: 'station', layer: 'stations' };
const deb = { id: 'sat-1', name: 'FENGYUN 1C DEB', klass: 'debris', layer: 'active' };
const sat = { id: 'sat-2', name: 'NOAA 19', klass: 'satellite', layer: 'visual' };
const earth = { id: 'earth', name: 'Earth', klass: 'world', layer: 'worlds' };
const moon = { id: 'moon', name: 'The Moon', klass: 'world', layer: 'worlds' };

const { decide, reachFor, REACH, AMBIGUITY_PX, LONG_PRESS_MS, TAP_SLOP_PX } = await import(join(JS, 'scene/pickrank.js'));
const star = { id: 'hyg-1', name: 'A star', klass: 'star', layer: 'stars' };
const star2 = { id: 'hyg-2', name: 'Another star', klass: 'star', layer: 'stars' };
const saturn = { id: 'saturn', name: 'Saturn', klass: 'world', layer: 'worlds' };
const mark = (record, px, extra = {}) => ({ record, px, score: px, tier: 'local', ...extra });
const disc = (record, r, extra = {}) => ({ record, edge: 0, r, tier: 'local', ...extra });
const touch = REACH.touch, mouse = REACH.mouse;

// a mark under the finger beats a disc the pointer is ON (a satellite drawn over Earth is what is meant); one 20 px off it does not
check(rankPick([mark(iss, 8)], [disc(earth, 300)]) === iss, 'a satellite 8 px from a finger beats the Earth disc under it');
check(rankPick([mark(iss, 20)], [disc(earth, 300)]) === earth, 'a satellite 20 px from a finger on the Earth loses to the Earth');
// among marks the nearest wins, whatever layer drew first
check(rankPick([mark(iss, 18), mark(sat, 4)], []) === sat, 'the nearer glyph wins over draw order');
// debris is penalised: a satellite 10 px away beats debris 8 px away (8 * 1.6 = 12.8)
check(rankPick([{ record: deb, px: 8, score: 12.8, tier: 'local' }, mark(sat, 10)], []) === sat, 'a satellite beats a speck at nearly the same distance');
// no mark: the disc nearer the camera wins; the Moon in front of Earth wins, one behind it is hidden
check(rankPick([], [disc(earth, 300, { depth: 100 }), { ...disc(moon, 6, { depth: 40 }), edge: 3 }]) === moon, 'the Moon drawn in front of Earth wins');
check(rankPick([], [disc(earth, 300, { depth: 100 }), { ...disc(moon, 6, { depth: 400 }), edge: 3 }]) === earth, 'a world behind the disc under the pointer is not taken');
check(rankPick([], [disc(earth, 300)]) === earth, 'Earth alone is picked');
check(rankPick([], []) === null, 'nothing within reach picks nothing');
check(rankPick(null, undefined) === null, 'bad input picks nothing rather than throwing');
// the long-press list: marks first by score, then discs; duplicates collapse; capped
const all = decide([mark(iss, 9), mark(sat, 4)], [disc(earth, 300, { depth: 100 }), { ...disc(moon, 6, { depth: 40 }), edge: 3 }], touch).list;
check(all.map((c) => c.record.id).join(',') === 'sat-2,sat-25544,moon,earth', `list order is marks by score then discs by depth (${all.map((c) => c.record.id).join(',')})`);
check(rankAll([{ record: iss, score: 1 }, { record: sat, score: 2 }], [], 1).length === 1 && rankAll([{ record: iss, score: 3 }, { record: sat, score: 2 }], [])[0].record === sat, 'labels\' plain order by score, and its cap');

// RULE 2, tier: a tap on Saturn gets Saturn, not the star behind it, even with the star nearer the pointer
const behind = { record: star, px: 1, score: 1, tier: 'backdrop', sx: 100, sy: 100, depth: 1e9 };
check(rankPick([behind], [disc(saturn, 80, { cx: 300, cy: 300 })], touch) === saturn, 'a disc under the pointer beats a star 1 px away');
check(rankPick([behind], [{ ...disc(saturn, 80, { cx: 300, cy: 300 }), edge: 9 }], touch) === saturn, 'a local disc near the pointer still beats a backdrop mark');
check(rankPick([behind], [], touch) === star, 'with nothing local the backdrop mark is taken');
// RULE 1, occlusion: a mark of the backdrop under a disc's outline is covered, and so is a local mark behind the disc
const hiddenStar = { ...behind, sx: 310, sy: 300 };
check(rankPick([hiddenStar], [{ ...disc(saturn, 80, { cx: 300, cy: 300 }), edge: 0 }], touch) === saturn, 'a star behind the disc is no candidate');
const hiddenSat = mark(sat, 3, { sx: 310, sy: 300, depth: 900 });
const frontSat = mark(iss, 3, { sx: 310, sy: 300, depth: 50 });
const earthAt = disc(earth, 80, { cx: 300, cy: 300, depth: 500 });
check(decide([hiddenSat], [earthAt], touch).list.every((c) => c.record !== sat), 'a satellite behind the Earth is hidden');
check(rankPick([hiddenSat, frontSat], [earthAt], touch) === iss, 'a satellite in front of the Earth is taken');
check(rankPick([hiddenSat], [earthAt], touch) === earth, 'with the satellite hidden, the pointer on the Earth gets the Earth');
// the star beside a disc, not covered: still loses to the disc by tier
const besideStar = { ...behind, sx: 500, sy: 300, px: 4 };
check(rankPick([besideStar], [{ ...disc(saturn, 80, { cx: 300, cy: 300 }), edge: 2 }], touch) === saturn, 'a star outside the outline loses to the disc by tier');
// RULE 4, reach by pointer: 10 px local and 5 px backdrop for a mouse, 24 and 12 for a finger
check(reachFor('mouse') === REACH.mouse && reachFor('touch') === REACH.touch && reachFor('pen') === REACH.mouse && reachFor(undefined) === REACH.touch, 'reach is by pointer type');
check(rankPick([mark(sat, 15)], [], mouse) === null && rankPick([mark(sat, 15)], [], touch) === sat, 'a satellite 15 px away: not for a mouse, yes for a finger');
check(rankPick([{ ...behind, px: 8 }], [], mouse) === null && rankPick([{ ...behind, px: 8 }], [], touch) === star, 'a star 8 px away: not for a mouse, yes for a finger');
check(rankPick([{ ...behind, px: 13 }], [], touch) === null, 'a star 13 px away is out of a finger\'s backdrop reach');
check(rankPick([], [{ ...disc(saturn, 80), edge: 12 }], mouse) === null && rankPick([], [{ ...disc(saturn, 80), edge: 12 }], touch) === saturn, 'a rim 12 px away: not for a mouse, yes for a finger');
// RULE 3, ambiguity: two best marks of one tier within 3 px of each other are a list, not a guess
const twinA = { record: star, px: 4, score: 4, tier: 'local', sx: 100, sy: 100 };
const twinB = { record: star2, px: 5, score: 5, tier: 'local', sx: 102, sy: 101 };
const d2 = decide([twinA, twinB], [], touch);
check(d2.ambiguous && d2.list.length === 2 && d2.winner === star, 'two stars 2.2 px apart are ambiguous');
check(!decide([twinA, { ...twinB, sx: 130, sy: 100 }], [], touch).ambiguous, 'two stars 30 px apart are not');
check(!decide([twinA], [], touch).ambiguous, 'one mark is not');
check(!decide([{ ...twinA, px: 0.5, score: 0.5 }, { ...twinB, px: 2.4, score: 2.4 }], [], touch).ambiguous, 'two stars 2.2 px apart with the pointer plainly on the first: the first');
check(!decide([twinA, { ...twinB, tier: 'backdrop', px: 3 }], [], touch).ambiguous, 'marks of different tiers are not weighed against each other');
const planet = { id: 'exo-tau-ceti-e', name: 'tau Cet e', klass: 'exoplanet', layer: 'exoplanets' };
const onStar = decide([{ record: planet, px: 0.4, score: 0.4, tier: 'local', sx: 100, sy: 100 }, { record: star, px: 0.5, score: 0.5, tier: 'local', sx: 100.2, sy: 100 }], [], touch);
check(onStar.winner === star && !onStar.ambiguous, 'a planet\'s mark drawn on its star does not make that star a list: the star is taken');
check(AMBIGUITY_PX === 3 && LONG_PRESS_MS === 450 && TAP_SLOP_PX.mouse === 5 && TAP_SLOP_PX.touch === 10, 'the thresholds are the ones the interaction says');
// the winner of the list is the winner
check(decide([mark(sat, 4), mark(iss, 9)], [disc(earth, 200)], touch).list[0].record === sat && decide([mark(sat, 4)], [disc(earth, 200)], touch).list[1].record === earth, 'the list is the order of choice');

// On a disc a dot wins only under the pointer: a click on the Earth 6 px from a satellite is the Earth (live site, 2026-11-02).
const mouseOn = { ...mouse, onDisc: 4 };
check(rankPick([mark(sat, 6)], [disc(earth, 300, { depth: 100 })], mouseOn) === earth, 'a click on the Earth 6 px from a satellite opens the Earth');
check(rankPick([mark(sat, 3)], [disc(earth, 300, { depth: 100 })], mouseOn) === sat, 'a click on the satellite\'s own dot over the Earth opens the satellite');
check(rankPick([mark(sat, 8)], [], mouseOn) === sat, 'off any disc the mouse keeps its 10 px reach');
check(rankPick([mark(sat, 1), mark(iss, 5), { ...mark(iss, 7), record: { id: 'sat-3', klass: 'satellite' } }], [disc(earth, 300, { depth: 100 })], mouseOn) === earth, 'three dots within reach on the Earth are a crowd: the Earth');
check(rankPick([mark(sat, 1), mark(iss, 5), { ...mark(iss, 7), record: { id: 'sat-3', klass: 'satellite' } }], [], mouseOn) === sat, 'the same three dots off any disc: the nearest');
check(decide([mark(sat, 8)], [], mouseOn).list[0].px === 8, 'the list carries how far each mark was, so a near miss can open the card without a flight');
if (problems.length) { console.error('pickrank FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('pickrank ok: tier, occlusion, reach by pointer, ambiguity, mark over disc, nearer disc');
