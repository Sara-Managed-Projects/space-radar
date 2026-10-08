// scene/weather/index.js -- weather on every world, behind one door (spec 0066).
//
// Contract: createWeather({ worlds, camera, onChange, ... }) -> what main.js keeps as ctx.weather:
//   start(), tick(tMs, opts), latch(), line(worldId, clockMs), credit(), perMinute(), state()
//
// main.js imports THIS file, dynamically, and nothing else of scene/weather/: the first visit does
// not pay for weather, tier 0 and a connection that saves data never do (main.js weatherStandIn
// answers the card for them). Two halves, which share nothing but the door:
//   worldweather.js  the other worlds' air in motion, in the world shader (modelled, illustrative)
//   lightning.js     the Earth's lightning from NOAA's map (measured)

import { createWorldWeather } from './worldweather.js';
import { createLightning } from './lightning.js';
import { COPY, t } from '../../copy/en.js';

/** Mars's season in words: Ls 0-90 is northern spring, and so on round the year. */
export function seasonName(ls) {
  return COPY.weather.seasons[Math.floor((((ls % 360) + 360) % 360) / 90)];
}

export function createWeather({ worlds, camera = null, reducedMotion = false, onChange = () => {}, fetchImpl, decodeImage, now } = {}) {
  const air = createWorldWeather({ worlds, reducedMotion });
  const lightning = createLightning({
    earth: () => (worlds && worlds.meshFor ? worlds.meshFor('earth') : null),
    camera, reducedMotion, onChange,
    ...(fetchImpl ? { fetchImpl } : {}), ...(decodeImage ? { decodeImage } : {}), ...(now ? { now } : {}),
  });
  return {
    failed: false,
    start: (o) => lightning.start(o),
    /** Every frame, after worlds.update() and the Earth's. */
    tick(tMs, opts = {}) {
      if (opts.latched) air.latch();
      air.update(tMs);
      lightning.tick(tMs, opts);
    },
    /** The frame latch: the worlds back in their own shader; the lightning stops in tick(). */
    latch: () => air.latch(),
    /**
     * A world's one line for its card, or null when nothing is drawn for it. The Earth's is the
     * lightning's; the rest are the registry's worlds, while they wear the weather.
     */
    line(worldId, clockMs) {
      if (worldId === 'earth') return lightning.line(clockMs);
      const text = COPY.weather.worlds[worldId];
      if (!text || !air.worn().includes(worldId)) return null;
      const w = air.state().worlds.find((x) => x.id === worldId);
      const line = t(text, { season: w && w.season ? seasonName(w.season.ls) : '', tau: w && w.season ? w.season.tau.toFixed(1) : '' });
      // Lightning is said only where it is drawn: not where less motion was asked for.
      const flash = COPY.weather.flashes[worldId];
      const also = COPY.weather.also[worldId];
      return [line, also, flash && air.flashing(worldId) ? flash : null].filter(Boolean).join(' ');
    },
    credit: () => lightning.credit(),
    perMinute: () => lightning.perMinute(),
    lookNow: () => lightning.lookNow(),
    state: () => ({ air: air.state(), lightning: lightning.state() }),
  };
}
