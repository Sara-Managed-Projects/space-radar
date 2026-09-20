// One mark per object: a dot yields to its 3D model, by the model's own fade.
import assert from 'node:assert/strict';
import { modelOpacity, dotOpacity } from '../site/js/scene/onemark.js';

const FADE = 400;
const on = (fadeStart) => ({ obj: { visible: true }, fadeStart });

// No model, a hidden model, or the hero layer off: nothing to yield to.
assert.equal(modelOpacity(undefined, true, 1000, FADE), 0);
assert.equal(modelOpacity({ obj: { visible: false }, fadeStart: null }, true, 1000, FADE), 0);
assert.equal(modelOpacity(on(null), false, 1000, FADE), 0);
// A model that finished fading in is fully there; mid-fade it is partly there.
assert.equal(modelOpacity(on(null), true, 1000, FADE), 1);
assert.equal(modelOpacity(on(1000), true, 1000, FADE), 0);
assert.equal(modelOpacity(on(1000), true, 1100, FADE), 0.25);
assert.equal(modelOpacity(on(1000), true, 5000, FADE), 1);

// The dot is the rest: it and its model never add up to more than one mark.
assert.equal(dotOpacity(0.8, 0), 0.8);
assert.equal(dotOpacity(0.8, 1), 0);
assert.ok(Math.abs(dotOpacity(1, 0.25) - 0.75) < 1e-9);
// A selected dot is forced to 1 upstream -- and still yields.
assert.equal(dotOpacity(1, 1), 0);
// Garbage is "no model": the dot stays rather than the object vanishing.
assert.equal(dotOpacity(0.8, NaN), 0.8);
assert.equal(dotOpacity(0.8, undefined), 0.8);
assert.equal(dotOpacity(0.8, 7), 0);

console.log('onemark: ok');
