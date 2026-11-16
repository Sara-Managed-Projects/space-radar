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

// ---- THE ICON AS DRAWN IS THE TARGET (internal #342), with the sizes the shader draws (glyphs.js GLYPH_SIZE_PX, clamped 4..14).
const { GLYPH_SIZE_PX } = await import(join(JS, 'scene/glyphs.js'));
const { hullDistance, CROWD_ON_DISC } = await import(join(JS, 'scene/pickrank.js'));
const halfOf = (klass) => Math.min(14, Math.max(4, GLYPH_SIZE_PX[klass])) / 2;
// The home view: the camera 28 000 km from the Earth's centre, the disc 300 px in radius; distances in km.
const D = 28000, RE = 6371, LIMB = Math.sqrt(D * D - RE * RE);
const earthHome = disc(earth, 300, { cx: 500, cy: 400, depth: D, horizon: LIMB });
const iconAt = (record, klass, sx, sy, px, extra = {}) => ({ record, px, score: px, tier: 'local', sx, sy, depth: D - RE - 500, r: halfOf(klass), ...extra });
for (const klass of ['station', 'satellite', 'crewed', 'rocket', 'probe', 'site']) {
  const r = halfOf(klass);
  const rec = { id: 'one-' + klass, klass };
  // a mouse anywhere on the icon, to its very edge, gets the icon; the old 4 px reach gave the Earth for every icon wider than 8 px
  check(rankPick([iconAt(rec, klass, 500, 400, r - 0.1)], [earthHome], mouse) === rec, `a mouse on the edge of a ${klass} icon (${r} px from its middle) over the Earth gets the icon`);
  check(rankPick([iconAt(rec, klass, 500, 400, Math.max(mouse.onDisc, r + mouse.pad) + 0.5)], [earthHome], mouse) === earth, `a mouse past a ${klass} icon's edge and margin gets the Earth`);
  // a finger has a margin round the icon, and never less reach than before
  check(rankPick([iconAt(rec, klass, 500, 400, r + touch.pad - 0.1)], [earthHome], touch) === rec, `a finger ${touch.pad} px off the edge of a ${klass} icon gets the icon`);
  check(rankPick([iconAt(rec, klass, 500, 400, Math.max(touch.onDisc, r + touch.pad) + 0.5)], [earthHome], touch) === earth, `a finger past a ${klass} icon's margin gets the Earth`);
  check(Math.max(mouse.onDisc, r + mouse.pad) >= r && Math.max(touch.onDisc, r + touch.pad) >= r + 5, `the reach over a disc is never smaller than a ${klass} icon`);
}
check(halfOf('station') > mouse.onDisc && rankPick([iconAt(iss, 'station', 500, 400, 6)], [earthHome], mouse) === iss, 'the station icon is 13 px across: a click 6 px from its middle is on it (it was the Earth\'s at a reach of 4)');
// the first click on the icon's edge flies as a click on its middle does: the list says the pointer is ON it
check(decide([iconAt(iss, 'station', 500, 400, 6)], [earthHome], mouse).list[0].on === true && decide([mark(sat, 9)], [], mouse).list[0].on === false, 'the list says whether the pointer is on the icon itself or only near it');

// A CROWDED LOW ORBIT: icons every 9 px over the Earth, so any pointer has three or more within a mouse's 10 px.
const crowdOf = (pitch, klass, tapX, tapY) => {
  const list = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    const sx = 500 + i * pitch, sy = 400 + j * pitch;
    const px = Math.hypot(sx - tapX, sy - tapY);
    list.push(iconAt({ id: `c${i}:${j}`, klass }, klass, sx, sy, px));
  }
  return list;
};
const within = (list, reach) => list.filter((m) => m.px <= reach).length;
{
  const onOne = crowdOf(9, 'satellite', 500 + 9 + 2, 400 - 1); // 2.2 px from the icon one to the right of the middle
  check(within(onOne, mouse.local) >= CROWD_ON_DISC, 'the crowded case is a crowd for a mouse');
  const got = decide(onOne, [earthHome], mouse);
  check(got.winner && got.winner.id === 'c1:0' && !got.ambiguous, `in a crowd the icon under the mouse wins, not the Earth (${got.winner && got.winner.id})`);
  const between = crowdOf(9, 'satellite', 500 + 4.5, 400 + 4.5); // the gap between four icons: 6.4 px from each, their edge is at 4
  check(within(between, mouse.local) >= CROWD_ON_DISC && rankPick(between, [earthHome], mouse) === earth, 'in a crowd a click between the icons is the Earth');
  // the nearest of two icons under the pointer
  const two = [iconAt(sat, 'satellite', 500, 400, 3.5), iconAt(iss, 'station', 506, 400, 2.5), iconAt(deb, 'satellite', 500, 409, 9)];
  check(rankPick(two, [earthHome], mouse) === iss, 'in a crowd, of two icons under the pointer the nearer wins');
  // a phone: icons every 20 px are a crowd for a finger's 24 px
  const finger = crowdOf(20, 'satellite', 500 + 20 + 4, 400 + 3); // 5 px from one icon's middle, 1 px past its edge
  check(within(finger, touch.local) >= CROWD_ON_DISC && decide(finger, [earthHome], touch).winner.id === 'c1:0', 'a finger on an icon in a crowd over the Earth gets the icon (it got the Earth: every phone tap is in a crowd)');
  const fingerGap = crowdOf(20, 'satellite', 510, 410); // 14 px from the four nearest
  check(rankPick(fingerGap, [earthHome], touch) === earth, 'a finger between the icons of a crowd gets the Earth');
  check(rankPick([], [earthHome], touch) === earth && rankPick([], [earthHome], mouse) === earth, 'empty Earth is the Earth');
}

// ONE DEPTH MEASURE: the straight-line distance from the camera, against the distance to the disc's limb.
{
  const nearLimb = { sx: 500 + 290, sy: 400 };
  // 400 km up, just this side of the limb: nearer than the limb, drawn in front of the globe
  check(rankPick([iconAt(sat, 'satellite', nearLimb.sx, nearLimb.sy, 1, { depth: LIMB - 300 })], [{ ...earthHome }], mouse) === sat, 'a satellite just in front of the limb is taken');
  // just past the limb: farther than the limb although nearer than the Earth's centre (the old test compared with the centre and showed it)
  check(LIMB + 300 < D && rankPick([iconAt(sat, 'satellite', nearLimb.sx, nearLimb.sy, 1, { depth: LIMB + 300 })], [{ ...earthHome }], mouse) === earth, 'a satellite just behind the limb is hidden, though it is nearer than the Earth\'s centre');
}

// A MODEL IS ONE TARGET AS BIG AS IT LOOKS (internal #341): the station at its selected size, 260 px.
{
  // The station's box as projected: 300 px of truss and panels by 120 px, turned 20 degrees, about (700, 300).
  const c = Math.cos(0.35), s2 = Math.sin(0.35);
  const corner = (u, v) => [700 + u * c - v * s2, 300 + u * s2 + v * c];
  const box = [corner(-150, -60), corner(150, -60), corner(150, 60), corner(-150, 60), corner(-140, -50), corner(140, 50), corner(0, 0), corner(-150, 0)];
  check(hullDistance(box, 700, 300) === 0, 'the middle of the model is on it');
  const tip = corner(140, 50);
  check(hullDistance(box, tip[0], tip[1]) === 0 && Math.hypot(tip[0] - 700, tip[1] - 300) > 140, 'the tip of a panel, 149 px from the centre, is on it');
  const off = corner(0, 75);
  check(Math.abs(hullDistance(box, off[0], off[1]) - 15) < 1e-6, 'a point 15 px off the long side is 15 px from the outline');
  const past = corner(153, 64);
  check(Math.abs(hullDistance(box, past[0], past[1]) - 5) < 1e-6, 'past a corner, the distance to the corner');
  check(hullDistance([[0, 0], [10, 0], [10, 10], [0, 10]], 5, 5) === 0 && hullDistance([[0, 0], [10, 0], [10, 10], [0, 10]], 15, 5) === 5, 'a square: inside, and 5 px beside it');
  check(hullDistance([[0, 0], [10, 0]], 5, 3) === 3 && hullDistance([[4, 4]], 4, 9) === 5 && hullDistance([], 1, 1) === Infinity && hullDistance([[0, 0], [10, 0], [5, 0]], 5, 0) === 0, 'a line, a point and nothing do not throw');

  const model = (px, extra = {}) => ({ record: iss, kind: 'model', px, score: px, tier: 'local', sx: 700, sy: 300, r: 150, depth: 800, ...extra });
  const earthBehind = disc(earth, 900, { cx: 900, cy: 1100, depth: D, horizon: LIMB });
  // anywhere on the body, in front of the planet: the model, for a mouse and a finger, and it flies (kind 'model', on)
  const onBody = decide([model(0)], [earthBehind], mouse);
  check(onBody.winner === iss && onBody.list[0].kind === 'model' && onBody.list[0].on === true && onBody.list[1].record === earth, 'a click on a panel of the model in front of the Earth gets the model, then the Earth');
  check(rankPick([model(0)], [earthBehind], touch) === iss, 'a tap on the model in front of the Earth gets the model');
  // the model's own dot is the model, and the dots of what is docked inside it do not make a list
  const dragon = { id: 'sat-dragon', klass: 'satellite' }, progress = { id: 'sat-progress', klass: 'satellite' };
  const centre = [model(0), iconAt(iss, 'station', 700, 300, 0.4, { depth: 800 }),
    iconAt(dragon, 'crewed', 700.5, 300, 0.6, { depth: 800, inside: iss.id }), iconAt(progress, 'satellite', 699.6, 300.2, 0.7, { depth: 800, inside: iss.id })];
  const mid = decide(centre, [earthBehind], mouse);
  check(mid.winner === iss && !mid.ambiguous && mid.list[0].kind === 'model', 'a click on the middle of a station with docked vehicles is the station, not a list');
  check(mid.list.map((x) => x.record.id).join(',') === 'sat-25544,sat-dragon,sat-progress,earth', `the docked vehicles are listed after the model for a long press (${mid.list.map((x) => x.record.id).join(',')})`);
  // without the model drawn (far away) the same dots are still a list, as before
  check(decide(centre.slice(1).map((m) => ({ ...m, inside: undefined })), [], mouse).ambiguous, 'the same dots with no model drawn are too close to call');
  // near the model but off it: a mouse has 1 px of margin, a finger 6
  check(rankPick([model(3)], [earthBehind], mouse) === earth && rankPick([model(3)], [earthBehind], touch) === iss, '3 px off the model: the Earth for a mouse, the model for a finger');
  check(rankPick([model(3)], [], mouse) === null, 'off the model over empty sky: nothing');
  // a model behind the planet, the pointer on the planet: the planet
  check(rankPick([model(0, { depth: LIMB + 4000 })], [earthBehind], mouse) === earth, 'a model behind the Earth, under a pointer on the Earth, is hidden');
  check(rankPick([model(0, { depth: LIMB + 4000 })], [{ ...earthBehind, edge: 30 }], mouse) === iss, 'the part of it past the limb is still the model');
  // another craft's icon under the pointer: taken when it is in front of the model, not when it is behind
  const other = (depth, px = 1) => iconAt(sat, 'satellite', 760, 320, px, { depth });
  check(rankPick([model(0), other(500)], [earthBehind], mouse) === sat, 'an icon under the pointer in front of the model is taken');
  check(rankPick([model(0), other(1500)], [earthBehind], mouse) === iss, 'an icon behind the model is not');
  check(rankPick([model(0), other(500, 8)], [], mouse) === iss, 'an icon only near the pointer does not take a click on the model');
  // two models: the nearer
  const hubble = { id: 'sat-20580', klass: 'telescope' };
  check(rankPick([model(0, { depth: 900 }), { ...model(0, { depth: 400 }), record: hubble }], [], mouse) === hubble, 'of two models under the pointer the nearer wins');
}
if (problems.length) { console.error('pickrank FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('pickrank ok: tier, occlusion, reach by pointer, ambiguity, mark over disc, nearer disc, the icon as drawn, a crowd, one depth measure, a model as one target');
