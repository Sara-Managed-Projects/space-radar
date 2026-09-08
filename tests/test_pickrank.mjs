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

// a glyph anywhere within reach beats a disc the finger is ON
check(rankPick([{ record: iss, px: 20, score: 20 }], [{ record: earth, edge: 0, r: 300 }]) === iss, 'a satellite 20 px away beats the Earth disc under the finger');
// among glyphs the nearest wins, whatever layer drew first
check(rankPick([{ record: iss, px: 18, score: 18 }, { record: sat, px: 4, score: 4 }], []) === sat, 'the nearer glyph wins over draw order');
// debris is penalised: a satellite 10 px away beats debris 8 px away (8 * 1.6 = 12.8)
check(rankPick([{ record: deb, px: 8, score: 12.8 }, { record: sat, px: 10, score: 10 }], []) === sat, 'a satellite beats a speck at nearly the same distance');
// no glyph: the smaller disc wins, then the nearer rim
check(rankPick([], [{ record: earth, edge: 0, r: 300 }, { record: moon, edge: 3, r: 6 }]) === moon, 'the Moon drawn over Earth wins');
check(rankPick([], [{ record: earth, edge: 0, r: 300 }]) === earth, 'Earth alone is picked');
check(rankPick([], []) === null, 'nothing within reach picks nothing');
check(rankPick(null, undefined) === null, 'bad input picks nothing rather than throwing');
// the long-press list: glyphs first by score, then discs by size; duplicates collapse; capped
const all = rankAll(
  [{ record: iss, px: 18, score: 18 }, { record: sat, px: 4, score: 4 }, { record: sat, px: 5, score: 5 }],
  [{ record: earth, edge: 0, r: 300 }, { record: moon, edge: 3, r: 6 }],
);
check(all.map((c) => c.record.id).join(',') === 'sat-2,sat-25544,moon,earth', `list order is glyphs by score then discs by size (${all.map((c) => c.record.id).join(',')})`);
check(rankAll([{ record: iss, px: 1, score: 1 }, { record: sat, px: 2, score: 2 }], [], 1).length === 1, 'the list respects its cap');

if (problems.length) { console.error('pickrank FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('pickrank ok: a glyph beats a disc, the nearer glyph beats draw order, a speck is penalised, the smaller disc wins');
