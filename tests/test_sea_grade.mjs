// tests/test_sea_grade.mjs -- the open sea from close reads as water (scene/tiles.js THE SEA, 2026-10-13).
//
//   node tests/test_sea_grade.mjs
//
// The Earth's close-up tiles were Blue Marble WITH shaded bathymetry, multiplied 5 to 8 times on
// water: fracture zones and survey edges were streaks and rectangles on open ocean. The layer is now
// the one without the sea floor and the water is lifted, not multiplied. This holds the grade's
// arithmetic on the colours measured off both layers (registry/tilesets.yaml says where from), that
// only water is lifted, and that no row can bring the sea floor or a gain on water back.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const T = await import(join(ROOT, 'site/js/scene/tiles.js'));
const { TILESETS } = await import(join(ROOT, 'site/js/data/tilesets.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const rgb = (r, g, b) => [lin(r), lin(g), lin(b)];
const EARTH = TILESETS.find((s) => s.world === 'earth');
const G = EARTH.grade;
const L = EARTH.seaLift;

// --- 1. the row -------------------------------------------------------------------------------------------
check(/\/best\/BlueMarble_ShadedRelief\/default\/500m\/\{z\}\/\{y\}\/\{x\}\.jpeg$/.test(EARTH.url), 'the Earth\'s tiles are Blue Marble with shaded relief and no sea floor');
check(!/Bathymetry/i.test(EARTH.url) && !/bathymetry|sea floor/i.test(EARTH.title + EARTH.credit), 'and neither the address, the title nor the credit says bathymetry');
check(EARTH.gradeSea === undefined && Array.isArray(L) && L.length === 3 && L.every((v) => v >= 0 && v < 0.5), 'the water has a lift and no gain of its own');
check(/NASA Earth Observatory/.test(EARTH.credit) && /Global Imagery Browse Services \(GIBS\)/.test(EARTH.credit), 'the credit still carries NASA\'s names and GIBS\'s acknowledgement');

// --- 2. the deep sea sits at the day map's blue -----------------------------------------------------------
// Measured 2026-10-13: the new layer's open ocean is sRGB 2, 5, 20 on every tile read; our day map's is 30, 59, 117.
{
  const deep = T.earthTileColour(rgb(2, 5, 20), G, L);
  const map = rgb(30, 59, 117);
  check(deep.sea === 1, 'the flat deep sea is water, in full');
  check(deep.rgb.every((v, i) => Math.abs(v - map[i]) <= map[i] * 0.02), `and is drawn at the day map's blue within 2 % (${deep.rgb.map((v) => v.toFixed(4))} against ${map.map((v) => v.toFixed(4))})`);
  check(deep.rgb[2] > 2.5 * deep.rgb[1] && deep.rgb[1] > 2.5 * deep.rgb[0], 'which is blue');
  // One level of JPEG noise on that flat colour moves the picture by little: the lift is not a gain.
  const up = T.earthTileColour(rgb(3, 6, 21), G, L).rgb;
  check(up.every((v, i) => Math.abs(v - deep.rgb[i]) < 0.004), 'a level of noise in the tile is under 0.004 on screen (linear light)');
  // The same step under the old grade (8.3, 5.7, 4.7 on water) on the old layer's ocean, for the record of what changed.
  const oldGain = [8.3, 5.7, 4.7];
  const oldStep = Math.abs(lin(44) - lin(32)) * oldGain[2];
  const newStep = Math.abs(lin(44) - lin(32)) * G[2];
  check(oldStep > 0.04 && newStep < oldStep * 0.6, `a ridge 12 levels of blue brighter than its floor was ${oldStep.toFixed(3)} on screen under the old gain`);
}

// --- 3. shallows are bright and not burnt; land is not lifted ---------------------------------------------
{
  // The Bahama banks in the new layer, linear light (registry/tilesets.yaml).
  const bank = T.earthTileColour([0.0058, 0.0931, 0.1103], G, L);
  const deep = T.earthTileColour(rgb(2, 5, 20), G, L);
  check(bank.sea === 1 && bank.rgb.every((v) => v < 0.6) && bank.rgb[1] > 2 * deep.rgb[1], `shallows are brighter than the deep sea and under 0.6 in every channel (${bank.rgb.map((v) => v.toFixed(3))})`);
  // The old way on the old layer's shallows (0.0134, 0.0901, 0.2119) reached 1.0 in blue.
  check(0.2119 * 4.7 > 0.99, 'where the old gain took them to white in blue');
  // Land means measured off the layer: Sahara and Iberia, West African forest, Australia, North America.
  for (const [name, c] of [['the Sahara', [0.3461, 0.2303, 0.1202]], ['West Africa', [0.136, 0.1134, 0.0435]], ['Australia', [0.1767, 0.087, 0.0346]], ['North America', [0.0484, 0.0502, 0.0169]], ['ice', rgb(235, 238, 242)], ['dark forest', rgb(12, 22, 10)], ['black', [0, 0, 0]]]) {
    const d = T.earthTileColour(c, G, L);
    check(d.sea === 0 && d.rgb.every((v, i) => v === c[i] * G[i]), `${name} is land: the tile times the grade and nothing added`);
  }
  check(JSON.stringify(G) === '[2,2.3,2.5]', 'the land\'s grade is what it was');
  // Between: a coast texel is part water, and the lift comes in smoothly.
  let last = -1;
  let mono = true;
  for (let b = 0; b <= 0.01; b += 0.0005) { const s = T.earthTileColour([0.001, 0.002, b], G, L).sea; if (s < last) mono = false; last = s; }
  check(mono && last === 1, 'from land to water the lift grows and reaches all of itself');
  // Coastal water a level or two darker than the deep sea's flat colour is still all water: no patchwork along a shore.
  // ...and so is the murky green water of a shore (read off the tile at Dakar), while a black shadow is land.
  for (const c of [rgb(0, 6, 4), rgb(2, 8, 4), rgb(0, 6, 0), rgb(0, 4, 0), rgb(0, 0, 4), rgb(2, 12, 4)]) check(T.earthTileColour(c, G, L).sea > 0.99, `murky coastal water (${c.map((v) => v.toFixed(4))}) takes the whole lift`);
  for (const c of [rgb(0, 0, 0), rgb(1, 1, 1), rgb(8, 9, 8), rgb(14, 26, 12), rgb(10, 40, 12)]) check(T.earthTileColour(c, G, L).sea === 0, `a shadow or a dark forest (${c.map((v) => v.toFixed(4))}) is land`);
  for (const c of [rgb(1, 4, 14), rgb(0, 3, 10), rgb(0, 2, 8)]) check(T.earthTileColour(c, G, L).sea === 1, `dark coastal water (${c.map((v) => v.toFixed(4))}) takes the whole lift`);
  const dark = T.earthTileColour(rgb(0, 2, 8), G, L).rgb;
  const deepSea = T.earthTileColour(rgb(2, 5, 20), G, L).rgb;
  check(Math.abs(dark[2] - deepSea[2]) < deepSea[2] * 0.08, 'and is drawn within 8 % of the deep sea\'s blue');
}

// --- 4. the shader is the twin ----------------------------------------------------------------------------
{
  const f = T.earthTileFragment();
  check(f.includes(`float tileSea = max( smoothstep( 0.0, ${T.TILE_SEA.full.toFixed(3)}, tile.b - ${T.TILE_SEA.blueOverRed.toFixed(1)} * tile.r ),`) && f.includes(`* smoothstep( ${T.TILE_SEA.murkSome[0].toFixed(4)}, ${T.TILE_SEA.murkSome[1].toFixed(4)}, max( tile.g, tile.b ) ) );`), 'the shader finds water as earthTileColour does, by its blue or by its murk');
  check(f.includes('vec3 ground = mix( dayTex, tile * uTileGrade + uTileSeaLift * tileSea, uFade ) * ('), 'and lifts it after the grade');
  check(!/uTileGradeSea/.test(f) && !/uTileGradeSea|gradeSea/.test(read('site/js/scene/tiles.js')), 'no gain on water is left');
  check(f.includes('uniform vec3 uTileSeaLift;'), 'the lift is a uniform of the patch');
}

// --- 5. it cannot come back ---------------------------------------------------------------------------------
{
  const reg = read('scripts/check_registry.py');
  check(/grade_sea is gone/.test(reg) && /"Bathymetry" in str\(r\.get\("url", ""\)\)/.test(reg), 'check_registry.py refuses a gain on water and a layer with the sea floor in it');
  const yaml = read('registry/tilesets.yaml');
  check(!/^\s+grade_sea:/m.test(yaml) && /^\s+sea_lift: \[0\.0118, 0\.0402, 0\.1604\]$/m.test(yaml), 'the registry row has the lift');
  const credits = read('CREDITS.md');
  check(/`BlueMarble_ShadedRelief` from NASA GIBS/.test(credits) && /- The Earth close up: Blue Marble with shaded relief, NASA Earth Observatory\./.test(credits), 'CREDITS.md names the layer that is fetched');
}

if (problems.length) { console.error('test_sea_grade: FAIL\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('test_sea_grade: ok');
