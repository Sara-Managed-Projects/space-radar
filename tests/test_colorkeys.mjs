// tests/test_colorkeys.mjs -- spec 0026 req 11: colour keys bucket records by fields they already hold.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { COLOR_KEYS } = await import(join(JS, 'data/colorkeys.js'));
const { keyById, bucketOf, legendCounts, fieldOf, UNKNOWN_ID } = await import(join(JS, 'data/colorkeyrules.js'));
const { CLASS_COLOURS } = await import(join(JS, 'scene/glyphatlas.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(COLOR_KEYS[0].id === 'class' && COLOR_KEYS.length >= 4, `class first, several keys (${COLOR_KEYS.map((k) => k.id)})`);
const sat = (meta, klass = 'satellite') => ({ id: 'x', name: 'X', klass, meta });
const alt = keyById('altitude');
check(bucketOf(alt, sat({ perigeeKm: 410 })).id === 'low', 'ISS height is "low"');
check(bucketOf(alt, sat({ perigeeKm: 35786 })).id === 'geo', 'a geostationary height is "geo"');
check(bucketOf(alt, sat({ perigeeKm: 399.9 })).id === 'very-low' && bucketOf(alt, sat({ perigeeKm: 400 })).id === 'low', 'bounds are [min, max)');
check(bucketOf(alt, sat({})).id === UNKNOWN_ID, 'no perigee -> unknown, not a guess');
const inc = keyById('inclination');
check(bucketOf(inc, sat({ inclinationDeg: 51.6 })).id === 'mid' && bucketOf(inc, sat({ inclinationDeg: 97.5 })).id === 'retrograde', 'inclination buckets');
const age = keyById('launch-age');
check(fieldOf(sat({ intlDesignator: '1998-067A' }), 'launch_year') === 1998 && bucketOf(age, sat({ intlDesignator: '1998-067A' })).id === 'old', 'the launch year comes from the designator');
check(bucketOf(age, sat({ netMs: Date.UTC(2026, 8, 8) })).id === 'this-year', 'a launch with a net time uses its year');
const cls = keyById('class');
check(bucketOf(cls, sat({}, 'station')).colour === CLASS_COLOURS.station, 'the class key is the class colour');
const legend = legendCounts(alt, [sat({ perigeeKm: 410 }), sat({ perigeeKm: 420 }), sat({ perigeeKm: 35786 }), sat({})]);
check(legend.find((r) => r.id === 'low').n === 2 && legend.find((r) => r.id === 'geo').n === 1 && legend.find((r) => r.id === UNKNOWN_ID).n === 1, `the legend counts, unknown included (${legend.map((r) => r.id + ':' + r.n).join(' ')})`);
check(legend[legend.length - 1].id === UNKNOWN_ID && legend.find((r) => r.id === 'medium').n === 0, 'bucket order is the registry\'s, zeroes kept, unknown last');
check(legendCounts(alt, null).every((r) => r.n === 0), 'no records, all zero, no throw');

// THE SHAPES (issue #394): one per class, plus the two a class cannot make.
{
  const A = await import(join(JS, 'scene/glyphatlas.js'));
  const G = await import(join(JS, 'scene/glyphs.js'));
  const shape = (name, klass, layer = {}) => A.glyphFor({ name, klass }, layer);
  check(new Set(Object.values(A.CELL_OF)).size === 16 && Math.max(...Object.values(A.CELL_OF)) === 15, 'the atlas is full: sixteen shapes in sixteen cells, and none shared');
  for (const k of ['station', 'satellite', 'debris', 'rocket', 'probe']) check(shape('X', k) === k && A.glyphCell(k) === A.CELL_OF[k], `${k} is drawn as its own shape`);
  for (const n of ['SOYUZ-MS 28', 'CREW DRAGON 12', 'SHENZHOU-21 (SZ-21)']) {
    check(shape(n, 'satellite') === 'crewed' && shape(n, 'station') === 'crewed', `${n} is drawn as a crew vehicle whichever class the catalogue files it under`);
  }
  for (const n of ['PROGRESS-MS 31', 'CYGNUS NG-24', 'DRAGON CRS-33', 'TIANZHOU-9', 'ISS (ZARYA)']) check(shape(n, 'station') !== 'crewed', `${n} is not a crew vehicle`);
  check(shape('SOYUZ-MS DEB', 'debris') === 'debris' && shape('SOYUZ-2.1B R/B', 'rocket') === 'rocket', 'Soyuz debris and a Soyuz rocket stage are not crew vehicles');
  for (const n of ['STARLINK-1007', 'ONEWEB-0012', 'KUIPER-00012']) check(shape(n, 'satellite') === 'dot' && A.glyphCell('dot') === A.CELL_OF.world, `${n} stays a plain dot`);
  check(shape('STARLINK-1007 DEB', 'debris') === 'debris', 'a constellation\'s debris is debris');
  check(shape('HUBBLE', undefined, { glyph: 'train' }) === 'train' && A.glyphCell('train') === A.CELL_OF.satellite, 'a record with no class still takes its layer\'s glyph');
  check(A.glyphCell(A.glyphFor(null, null)) === A.CELL_OF.satellite, 'nothing at all is a satellite, not a throw');
  check(G.GLYPH_SIZE_PX.crewed > G.GLYPH_SIZE_PX.satellite && G.GLYPH_SIZE_PX.crewed < G.GLYPH_SIZE_PX.station && G.GLYPH_SIZE_PX.dot < G.GLYPH_SIZE_PX.satellite, 'a crew vehicle is drawn between a satellite and a station; a constellation dot under both');
  for (const k of ['satellite', 'crewed', 'rocket', 'debris', 'dot', 'probe', 'station']) {
    const px = G.GLYPH_SIZE_PX[k] * (k === 'debris' ? 0.6 : 1);
    check(px >= 4 && px <= 14, `${k} is drawn at ${px} px, inside the 4 to 14 px clamp`);
  }
  check(G.SHADOW_OPACITY > 0.3 && G.SHADOW_OPACITY < 1, 'a dot in the Earth\'s shadow fades and is still there to tap');
  // The shapes themselves, on a recording canvas: each one draws, and the four redrawn ones are
  // told apart by what they are made of, since nothing here can look at pixels.
  const calls = (name) => {
    const log = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { log.push([k, ...a]); }), set: () => true });
    globalThis.Path2D = class { constructor() { this.ops = []; } moveTo(...a) { this.ops.push(['m', ...a]); } lineTo(...a) { this.ops.push(['l', ...a]); } arc(...a) { this.ops.push(['a', ...a]); } rect(...a) { this.ops.push(['r', ...a]); } quadraticCurveTo(...a) { this.ops.push(['q', ...a]); } bezierCurveTo(...a) { this.ops.push(['b', ...a]); } closePath() {} };
    A.drawGlyphIcon({ width: 48, getContext: () => ctx }, name, '#fff');
    return log;
  };
  const fills = (name) => calls(name).filter((c) => c[0] === 'fill').map((c) => c[1].ops);
  const sat = fills('satellite');
  check(sat.length === 2 && sat[0][0][0] === 'r' && sat[0][0][3] > sat[0][0][4] * 4, 'a satellite is a bus on a wing bar at least four times as wide as it is thick');
  check(fills('dot').length === 1 && fills('dot')[0][0][0] === 'a', 'a constellation dot is one disc');
  check(calls('rocket').some((c) => c[0] === 'rotate') && fills('rocket').length === 2, 'a spent stage is a tube and a bell, on a slant');
  check(fills('crewed').length === 1 && fills('crewed')[0].some((o) => o[0] === 'q'), 'a crew vehicle is one capsule with a round top');
  check(fills('debris')[0].length === 5, 'debris is a five-cornered shard');
  delete globalThis.Path2D;
}

if (problems.length) { console.error('colour keys FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`colour keys ok: ${COLOR_KEYS.length} keys from the registry; altitude, tilt and launch year bucket from fields the records hold; unknown is counted`);
