// r15-a3: every moon (release 1.5.0 stage A3, internal spec 0079, internal i#1061).
//
// ONE WALK, both widths. What a visitor meets, in order:
//   1. Jupiter's own stage with the moons layer OFF (the before: the four moons the map drew), then the layer switched on by its box
//      (sr.setLayerOn), waiting for data/moons.js to build its records, and the same frame again: the hundred and fifteen dots.
//   2. Moons, each selected and flown to as a search row does: Himalia (a Jovian irregular with a good place), Phoebe (Saturn's, the
//      famous one), Hyperion (a regular moon whose place is illustrative), S/2011 J 4 (one of the unnamed), Nereid, Nix (Pluto's).
//      Each picture has the card open: the first sentence, the rows, the honesty line, the "drawn as" line, the source.
//   3. The companions layer: Dysnomia and Vanth (a lap measured, a place illustrative), Linus (an asteroid's moon drawn at its parent),
//      and Salacia, Ixion and 2017 OF201 (the dwarf-planet candidates, "may be a dwarf planet").
//   4. A phone or a desktop: the card is read back as text (out.json `cards`), so a hole in a sentence shows without reading a picture.
// Beside every picture: how many records each layer holds, the draw calls, and the bytes the two data files cost.
look.probe = 'r15-a3';
const out = { counts: {}, cards: {}, files: [], problems: [] };
const fileBytes = () => {
  try {
    return performance.getEntriesByType('resource')
      .filter((e) => /\/data\/(moons|companions)\.json/.test(e.name))
      .map((e) => ({ file: e.name.split('/').pop(), transfer: e.transferSize, body: e.encodedBodySize, decoded: e.decodedBodySize }));
  } catch { return []; }
};
const cardText = () => {
  const card = document.querySelector('.sr-card');
  return card ? card.innerText.replace(/\s+\n/g, '\n').slice(0, 1400) : null;
};

// 1. Jupiter, the layer off and then on
await stage('jupiter', 7000);
out.counts.moonsBefore = (sr.recordsFor('moons') || []).length;
await shot('01-jupiter-moons-off', 'Jupiter on its own stage, the moons layer off: ' + out.counts.moonsBefore + ' records');
sr.setLayerOn('moons', true);
const loaded = await until(() => (sr.recordsFor('moons') || []).length > 100, 90000, 500);
out.counts.moons = (sr.recordsFor('moons') || []).length;
if (!loaded) out.problems.push('the moons layer built no records in 90 s');
await sleep(2500);
await shot('02-jupiter-moons-on', 'the same frame with the layer on: ' + out.counts.moons + ' records, three seconds after');
sr.setLayerOn('companions', true);
await until(() => (sr.recordsFor('companions') || []).length > 100, 90000, 500);
out.counts.companions = (sr.recordsFor('companions') || []).length;

// 2 and 3. The moons and the companions, each with its card
const WALK = [
  ['himalia', '03-himalia', 'Himalia: a Jovian irregular, its orbit drawn whole, a place within 30 degrees of JPL'],
  ['phoebe', '04-phoebe', 'Phoebe: Saturn, retrograde, 13 million km out'],
  ['hyperion', '05-hyperion', 'Hyperion: a regular moon of Saturn'],
  ['s2011-j-4', '06-unnamed', 'S/2011 J 4: an unnamed Jovian moon, size not measured'],
  ['nereid', '07-nereid', 'Nereid: Neptune, the long ellipse'],
  ['nix', '08-nix', 'Nix: one of Pluto\'s small moons'],
  ['dysnomia', '09-dysnomia', 'Dysnomia: Eris\'s moon, a lap measured, a place illustrative'],
  ['vanth', '10-vanth', 'Vanth: Orcus\'s moon'],
  ['linus', '11-linus', 'Linus: Kalliope\'s moon, drawn at its parent'],
  ['salacia', '12-salacia', 'Salacia: a dwarf-planet candidate, with Actaea'],
  ['2017-of201', '13-of201', '2017 OF201: a dwarf-planet candidate on a 24 000-year orbit'],
];
for (const [id, name, note] of WALK) {
  const ok = await go(id, name, 7000, note);
  if (!ok) { out.problems.push(id + ' is not a record'); continue; }
  const text = cardText();
  out.cards[id] = text;
  if (!text) out.problems.push(id + ': no card');
  else if (/undefined|NaN|\{[a-z]+\}/.test(text)) out.problems.push(id + ': a hole in the card');
}
out.files = fileBytes();
out.firstSentences = Object.fromEntries(Object.entries(out.cards).map(([k, v]) => [k, (v || '').split('\n').slice(0, 6).join(' / ')]));
return finish(out.problems.length ? { fail: out.problems.join('; '), out } : { out });
