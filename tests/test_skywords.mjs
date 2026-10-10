// A card's compass direction and height in fists: examples, wrapping and every threshold.
//   node tests/test_skywords.mjs
import { azimuthInWords, altitudeInWords, COMPASS_16, COMPASS_16_SHORT } from '../site/js/sky/skywords.js';

const problems = [];
const check = (actual, expected, label) => {
  if (actual !== expected) problems.push(`${label}: expected ${expected}, got ${actual}`);
};
const directions = [
  ['north', 'N'], ['north-north-east', 'NNE'], ['north-east', 'NE'], ['east-north-east', 'ENE'],
  ['east', 'E'], ['east-south-east', 'ESE'], ['south-east', 'SE'], ['south-south-east', 'SSE'],
  ['south', 'S'], ['south-south-west', 'SSW'], ['south-west', 'SW'], ['west-south-west', 'WSW'],
  ['west', 'W'], ['west-north-west', 'WNW'], ['north-west', 'NW'], ['north-north-west', 'NNW'],
];
check(COMPASS_16.length, 16, 'sixteen full names');
check(COMPASS_16_SHORT.length, 16, 'sixteen short names');
for (const [i, [long, short]] of directions.entries()) {
  check(COMPASS_16[i], long, `full name ${i}`);
  check(COMPASS_16_SHORT[i], short, `short name ${i}`);
  check(azimuthInWords(i * 22.5), long, `direction ${i}`);
  check(azimuthInWords(i * 22.5, { short: true }), short, `short direction ${i}`);
  // At a sector boundary the clockwise name wins, including the boundary back to north.
  const boundary = i * 22.5 + 11.25;
  const next = directions[(i + 1) % 16];
  for (const [angle, names] of [[boundary - 0.001, [long, short]], [boundary, next], [boundary + 0.001, next]]) {
    check(azimuthInWords(angle), names[0], `compass boundary ${angle}`);
    check(azimuthInWords(angle, { short: true }), names[1], `short compass boundary ${angle}`);
  }
}
for (const angle of [-720, -360, -0, 0, 360, 720]) {
  check(azimuthInWords(angle), 'north', `north wrap ${angle}`);
  check(azimuthInWords(angle, { short: true }), 'N', `short north wrap ${angle}`);
}
for (const angle of [-67.5, 292.5, 652.5]) {
  check(azimuthInWords(angle), 'west-north-west', `documented direction and wrap ${angle}`);
  check(azimuthInWords(angle, { short: true }), 'WNW', `documented short direction and wrap ${angle}`);
}
check(azimuthInWords(292.5, { short: false }), 'west-north-west', 'explicit full form');
check(altitudeInWords(23), 'about two and a half fists above the horizon', 'documented altitude 23');
check(altitudeInWords(85), 'almost straight overhead', 'documented altitude 85');

const height = words => `about ${words} above the horizon`;
// Independently named expected phrases on each side, including half- and whole-fist rounding.
const thresholds = [
  [-0.5, 'below the horizon', 'right down on the horizon'],
  [2.5, 'right down on the horizon', 'just above the horizon'],
  [5, 'just above the horizon', height('half a fist')],
  [7.5, height('half a fist'), height('one fist')],
  [12.5, height('one fist'), height('one and a half fists')],
  [17.5, height('one and a half fists'), height('two fists')],
  [22.5, height('two fists'), height('two and a half fists')],
  [27.5, height('two and a half fists'), height('three fists')],
  [32.5, height('three fists'), height('three and a half fists')],
  [37.5, height('three and a half fists'), height('four fists')],
  [40, height('four fists'), height('four fists')],
  [45, height('four fists'), height('five fists')],
  [55, height('five fists'), height('six fists')],
  [65, height('six fists'), height('seven fists')],
  [75, height('seven fists'), height('eight fists')],
  [78, height('eight fists'), 'almost straight overhead'],
  [87, 'almost straight overhead', 'straight overhead'],
];
for (const [angle, below, atAndAbove] of thresholds) {
  check(altitudeInWords(angle - 0.001), below, `below altitude threshold ${angle}`);
  check(altitudeInWords(angle), atAndAbove, `at altitude threshold ${angle}`);
  check(altitudeInWords(angle + 0.001), atAndAbove, `above altitude threshold ${angle}`);
}
for (const value of [NaN, Infinity, -Infinity, '23', '', null, undefined, true, {}, [], 23n]) {
  check(azimuthInWords(value), null, `invalid azimuth ${String(value)}`);
  check(azimuthInWords(value, { short: true }), null, `invalid short azimuth ${String(value)}`);
  check(altitudeInWords(value), null, `invalid altitude ${String(value)}`);
}
if (problems.length) { console.error('skywords FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('skywords ok: documented examples, all sixteen full and short compass names, every sector boundary, wrapping, invalid inputs, and every altitude threshold below, at and above');
