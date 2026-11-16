// tests/test_ux1_planets_cards.mjs -- the Planets tab and the cards (internal #441, #443, #444, #447, #451, #452, #454).
//   node tests/test_ux1_planets_cards.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// #441: marks in the crowd at the Sun give way to the planets, and come back as the view widens.
const O = await import(join(ROOT, 'site/js/scene/onemark.js'));
const focal = 900;
assert.equal(O.crowdShare(0, 1, focal), 0, 'at the Sun itself: all crowd');
assert.equal(O.crowdShare(10, 1, focal), 1, 'far out: whole');
assert.ok(O.crowdShare(0.2, 1, focal) < O.crowdShare(0.4, 1, focal), 'spreading out brings a mark back');
assert.equal(O.crowdShare(NaN, 1, focal), 1, 'garbage is drawn whole');
assert.equal(O.crowdShare(1, 0, focal), 1);
assert.equal(O.crowdFactor(0, O.CROWD_FLOOR.size), O.CROWD_FLOOR.size);
assert.equal(O.crowdFactor(1, O.CROWD_FLOOR.size), 1);
assert.ok(O.crowdShare(0.1, 1, focal) < O.CROWD_NAMED_FROM, 'a speck at the Sun is not named');
assert.ok(O.crowdShare(10, 1, focal) >= O.CROWD_NAMED_FROM, 'a mark clear of it is');
for (const id of ['comets', 'asteroids', 'pha', 'deep-space']) assert.ok(O.CROWD_LAYERS.has(id));
assert.ok(!O.CROWD_LAYERS.has('planets'), 'planets are never faded');

// #443: the caption of a hero number is not cut.
const ui = read('site/css/ui.css');
const unit = /\.sr-hero__unit \{([^}]*)\}/.exec(ui);
assert.ok(unit && !/line-clamp|overflow: hidden/.test(unit[1]), '.sr-hero__unit has no clamp and no overflow:hidden');
assert.ok(/overflow-wrap: anywhere/.test(unit[1]));
// #454: the action tiles' labels wrap
const tile = /\.sr-card__actions \.ui-btn__label \{([^}]*)\}/.exec(ui);
assert.ok(tile && /white-space: normal/.test(tile[1]), 'action tile labels wrap');

// #444: the Moon's row takes its height above the Earth
const { worldDistance } = await import(join(ROOT, 'site/js/ui/explore.js'));
assert.equal(worldDistance([{ key: 'earth', num: '1' }, { key: 'altitude', num: '2' }]).num, '1');
assert.equal(worldDistance([{ key: 'sun', num: '0' }, { key: 'altitude', num: '384 400' }]).num, '384 400');
assert.equal(worldDistance([{ key: 'sun', num: '0' }]), null);
assert.equal(worldDistance(null), null);

// #451: the ember line is not drawn through an hour label
const { underCursor } = await import(join(ROOT, 'site/js/ui/scrubber.js'));
assert.equal(underCursor(100, 44, 112), true);
assert.equal(underCursor(100, 44, 200), false);
assert.equal(underCursor(100, 44, 100), true);
assert.equal(underCursor(100, 44, 146), false, 'a line past the label clears it');

// #452: Jupiter's ring is one faint hairline, not two bands
const { COMPARE_BODIES } = await import(join(ROOT, 'site/js/data/compare.js'));
const jup = COMPARE_BODIES.find((b) => b.world === 'jupiter');
assert.deepEqual(jup.ring_bands, [[128940, 128940, 0.1]]);

// #453: an open card's view-scale note is read again
const { refreshViewNotes } = await import(join(ROOT, 'site/js/ui/cards.js'));
assert.equal(refreshViewNotes(null), 0);
assert.equal(refreshViewNotes({}), 0);

console.log('ux1 planets and cards ok: crowd share, uncut caption, Moon distance, hour label clear of the line, Jupiter hairline');
