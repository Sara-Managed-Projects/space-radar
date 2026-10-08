/**
 * The sky in words: a compass direction and a height in fists. Pure, with no imports, so a card
 * (and the light embed, which must never fetch the sky view) can say where to look.
 */
export const COMPASS_16 = [
  'north',
  'north-north-east',
  'north-east',
  'east-north-east',
  'east',
  'east-south-east',
  'south-east',
  'south-south-east',
  'south',
  'south-south-west',
  'south-west',
  'west-south-west',
  'west',
  'west-north-west',
  'north-west',
  'north-north-west',
];

export const COMPASS_16_SHORT = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

// ---------------------------------------------------------------------------- words

/**
 * Azimuth in degrees (0 = north, clockwise) to a 16-point compass name in words.
 * `azimuthInWords(292.5) === 'west-north-west'`.
 * @param {number} azDeg
 * @param {{short?: boolean}} [opts] short:true gives 'WNW'
 */
export function azimuthInWords(azDeg, opts = {}) {
  if (!Number.isFinite(azDeg)) return null;
  const a = ((azDeg % 360) + 360) % 360;
  const i = Math.round(a / 22.5) % 16;
  return opts.short ? COMPASS_16_SHORT[i] : COMPASS_16[i];
}

const FIST_WORDS = new Map([
  [0.5, 'half a fist'],
  [1, 'one fist'],
  [1.5, 'one and a half fists'],
  [2, 'two fists'],
  [2.5, 'two and a half fists'],
  [3, 'three fists'],
  [3.5, 'three and a half fists'],
  [4, 'four fists'],
  [5, 'five fists'],
  [6, 'six fists'],
  [7, 'seven fists'],
  [8, 'eight fists'],
]);

/**
 * Altitude in degrees to the one sentence that makes a sky chart usable by someone who has never
 * used one. A closed fist at arm's length covers about ten degrees; that is the whole trick.
 * `altitudeInWords(23)  === 'about two and a half fists above the horizon'`
 * `altitudeInWords(85)  === 'almost straight overhead'`
 * @param {number} altDeg
 * @returns {string|null}
 */
export function altitudeInWords(altDeg) {
  if (!Number.isFinite(altDeg)) return null;
  if (altDeg < -0.5) return 'below the horizon';
  if (altDeg < 2.5) return 'right down on the horizon';
  // Under half a fist there is nothing useful to count: "a third of a fist" helps nobody.
  if (altDeg < 5) return 'just above the horizon';
  if (altDeg >= 87) return 'straight overhead';
  if (altDeg >= 78) return 'almost straight overhead';
  const fists = altDeg / 10;
  // Half-fist precision while a fist is still a big share of the answer; whole fists above that.
  const rounded = fists < 4 ? Math.round(fists * 2) / 2 : Math.round(fists);
  const words = FIST_WORDS.get(rounded);
  if (!words) return `about ${Math.round(fists)} fists above the horizon`;
  return `about ${words} above the horizon`;
}
