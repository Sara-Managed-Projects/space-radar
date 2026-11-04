// scene/lookrandom.js -- the fixed seed that ?look=1 gives the modules that would roll dice (internal spec 0076
// W1-e, internal #779). It was in scene/wind.js; it is here so that a module that is not the wind's (the drift's
// walk, the meteors) can take it without fetching the wind's data.
//
// Contract: lookRandom(salt?, search?) -> a function returning [0, 1): Mulberry32 on the release's seed (76, the
// same as scene/perf.js LOOK_SEED) mixed with a salt per module, under ?look=1; Math.random otherwise, and beside
// embed=1 (scene/quality.js lookHeld). Salts in use: 1 the wind, 2 the currents, 3 the weather's flashes (its own
// copy, scene/weather/worldweather.js), 4 the drift's choices, 5 the drift plan's defaults, 6 the meteors.

import { lookHeld } from './quality.js';

/**
 * A fixed seed under ?look=1: a tool's two looks at one moment draw the same streaks, the same walk and the same
 * meteors; a visitor's are Math.random's as before. Never beside embed=1.
 */
export function lookRandom(salt = 0, search = typeof location !== 'undefined' ? location.search : '') {
  if (!lookHeld({ search })) return Math.random;
  let a = (76 * 0x9e3779b1 + salt * 0x85ebca6b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
