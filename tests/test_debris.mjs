// tests/test_debris.mjs -- debris as a problem (public #449, #450; data/satcat.js, ui/debris.js,
// the `debris-field` layer).
//
// The catalogue's own lines in, the count out: what is in orbit and what is not, each kind, each
// height. The drawn population: every piece on its real orbit, at a place that is the same on
// every load and is SAID to be illustrative. The sentences: generated, and silent with nothing to say.
//
//   node tests/test_debris.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const C = await import(join(JS, 'data/satcat.js'));
const V = await import(join(JS, 'ui/debris.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { SOURCES } = await import(join(JS, 'data/sources.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// CelesTrak's own header and row shapes (satcat.csv, read 2026-09-28); the rows are real objects
// with their real numbers, a few of each kind.
const CSV = `OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE
SPUTNIK 1,1957-001B,2,PAY,D,CIS,1957-10-04,TYMSC,1958-01-03,96.10,65.00,1080,64,,,EA,IMP
VANGUARD 1,1958-002B,5,PAY,,US,1958-03-17,AFETR,,132.63,34.25,3822,650,0.1220,,EA,ORB
VANGUARD R/B,1958-002A,16,R/B,,US,1958-03-17,AFETR,,137.25,34.27,4222,651,0.2300,,EA,ORB
ISS (ZARYA),1998-067A,25544,PAY,+,ISS,1998-11-20,TYMSC,,92.90,51.63,421,413,399.0520,,EA,ORB
FENGYUN 1C,1999-025A,25730,PAY,-,PRC,1999-05-10,TSC,,101.80,98.60,860,840,3.2000,,EA,ORB
FENGYUN 1C DEB,1999-025E,29716,DEB,,PRC,1999-05-10,TSC,,101.10,98.90,880,750,0.0100,,EA,ORB
FENGYUN 1C DEB,1999-025F,29717,DEB,,PRC,1999-05-10,TSC,,103.20,99.10,1010,800,0.0080,,EA,ORB
CZ-4B DEB,1999-025G,29718,DEB,,PRC,1999-05-10,TSC,,99.00,98.70,790,700,0.0200,,EA,ORB
COSMOS 2251 DEB,1993-036E,33757,DEB,,CIS,1993-06-16,PKMTR,,98.10,74.00,790,650,0.0300,,EA,ORB
COSMOS 2251 DEB,1993-036F,33758,DEB,,CIS,1993-06-16,PKMTR,2026-09-25,88.10,74.00,190,160,0.0300,,EA,IMP
GOES 16,2016-071A,41866,PAY,+,US,2016-11-19,AFETR,,1436.10,0.03,35795,35778,,,EA,ORB
ARIANE 5 R/B,2016-014C,41384,R/B,,FR,2016-03-09,FRGUI,,631.00,5.90,35510,250,18.0000,,EA,ORB
SL-8 R/B,1975-034B,7769,R/B,,CIS,1975-04-30,PKMTR,2026-09-24,87.90,74.00,170,150,6.2000,,EA,IMP
STARLINK-36001,2026-210A,66001,PAY,+,US,2026-09-26,AFETR,,95.60,53.16,560,550,,,EA,ORB
STARLINK-36002,2026-210B,66002,PAY,+,US,2026-09-26,AFETR,,95.60,53.16,560,550,,,EA,ORB
FALCON 9 DEB,2026-210C,66003,DEB,,US,2026-09-26,AFETR,,95.00,53.10,540,500,,,EA,ORB
LUNAR ORBITER,2009-031A,35315,PAY,+,US,2009-06-18,AFETR,,,,,,,,MO,ORB
MYSTERY,2020-001Z,99001,UNK,,US,2020-01-01,AFETR,,100.00,97.00,700,690,,,EA,ORB
`;
const asOf = Date.parse('2026-09-28T23:41:28Z');
const rows = C.parseSatcat(CSV);
check(rows.length === 14, `fourteen things in Earth orbit: the decayed, and what orbits the Moon, are not counted (${rows.length})`);
check(!rows.some((r) => r.name === 'SPUTNIK 1' || r.name === 'LUNAR ORBITER' || r.id === 33758), 'Sputnik came down in 1958; the lunar orbiter is not round the Earth');
const by = (name) => rows.find((r) => r.name === name);
check(by('ISS (ZARYA)').kind === 'working' && by('FENGYUN 1C').kind === 'dead' && by('VANGUARD 1').kind === 'dead' && by('VANGUARD R/B').kind === 'rocket' && by('CZ-4B DEB').kind === 'debris' && by('MYSTERY').kind === 'other', 'a kind from the catalogue\'s type and status: working, dead, rocket body, debris, unknown');
check(by('VANGUARD 1').launchMs === Date.parse('1958-03-17T00:00:00Z') && by('VANGUARD 1').apogeeKm === 3822 && by('VANGUARD 1').incDeg === 34.25, 'with its launch day and its orbit\'s shape');

// --- the count ---------------------------------------------------------------------------------------
const c = C.census(rows);
check(c.total === 14 && c.kinds.debris === 5 && c.kinds.rocket === 2 && c.kinds.dead === 2 && c.kinds.working === 4 && c.kinds.other === 1, `the census by kind (${JSON.stringify(c.kinds)})`);
check(C.KINDS.reduce((n, k) => n + c.kinds[k], 0) === c.total && c.bands.reduce((n, b) => n + b.total, 0) === c.total, 'every object is in exactly one kind and one height');
check(C.bandOf(by('ISS (ZARYA)')) === 'low' && C.bandOf(by('FENGYUN 1C DEB')) === 'crowded' && C.bandOf(by('GOES 16')) === 'geo' && C.bandOf(by('ARIANE 5 R/B')) === 'stretched' && C.bandOf(by('VANGUARD 1')) === 'medium', 'heights: the station is low, Fengyun\'s fragments in the crowd, GOES on the ring, a transfer stage stretched');
check(C.BANDS.every((b) => COPY.debris.bands[b.id]), 'every height has its words');
check(V.leadWords(c) === '9 of the 14 things tracked in orbit no longer work.', `the lead counts what no longer works (${V.leadWords(c)})`);
check(V.leadWords({ total: 0, kinds: {} }) === COPY.debris.empty, 'and says so when the catalogue is empty');
const bars = V.bandRows(c);
check(bars.every((b) => b.total > 0) && bars.find((b) => b.id === 'crowded').parts.find((p) => p.kind === 'debris').n === 4, 'the bars: a row a height that has anything, four fragments in the crowd');
check(Math.max(...bars.map((b) => b.parts.reduce((s, p) => s + p.share, 0))) <= 1 + 1e-9, 'the widest bar is the full width and no bar is wider');
check(/4 debris/.test(bars.find((b) => b.id === 'crowded').aria) && /in all/.test(bars[0].aria), 'a bar reads out its numbers: the colours are not the only way to them');

// --- the stories -------------------------------------------------------------------------------------
const s = C.stories(rows, C.decayedRows(CSV, asOf - 7 * 86400e3), asOf);
check(s.launched.objects === 3 && s.launched.launches === 1, `three objects from one launch in the week (${JSON.stringify(s.launched)})`);
check(s.oldest.name === 'Vanguard 1' && s.oldest.years === 68, `the oldest thing up is the satellite, not its rocket of the same day (${JSON.stringify(s.oldest)})`);
check(s.clouds[0].name === 'Fengyun 1C' && s.clouds[0].pieces === 3 && s.clouds[1].name === 'Cosmos 2251', `the biggest cloud is named for most of its pieces, not for the rocket that came with it (${JSON.stringify(s.clouds)})`);
check(s.cameDown.objects === 2 && s.cameDown.biggest === 'SL-8', `two came down, and the one named is the whole thing, not the fragment (${JSON.stringify(s.cameDown)})`);
const lines = V.storyLines(s, asOf);
check(lines.length === 4 && lines[0] === '3 objects from one launch joined the catalogue in the week to 28 September 2026.', `the week's launches as a sentence (${lines[0]})`);
check(/^2 things came down in that week, the largest of them SL-8\.$/.test(lines[1]) && /Vanguard 1, launched in 1958: 68 years of laps\.$/.test(lines[3]), `what came down, and the oldest (${lines[1]} / ${lines[3]})`);
check(V.storyLines({ launched: { objects: 0, launches: 0 }, cameDown: { objects: 0 }, clouds: [], oldest: null }, asOf).length === 0 && V.storyLines(null, asOf).length === 0, 'a sentence with nothing to say is left out');
check(C.parentName('FENGYUN 1C DEB') === 'Fengyun 1C' && C.parentName('SL-8 R/B') === 'SL-8' && C.parentName('CZ-4B DEB') === 'CZ-4B' && C.parentName('ISS (ZARYA)') === 'ISS (Zarya)' && C.parentName('GOES 16') === 'GOES 16' && C.parentName('ARIANE 5 R/B') === 'Ariane 5', 'a catalogue name as a person writes it');

// --- the population the map draws ----------------------------------------------------------------------
const recs = C.fieldRecords(rows);
check(recs.length === 7 && recs.every((r) => r.klass === 'debris' || r.klass === 'rocket'), `debris and spent rockets only: the working and the dead satellites are other layers' (${recs.length})`);
check(recs.every((r) => r.cls === 'illustrative' && r.meta.placeIllustrative === true && r.layer === 'debris-field' && r.propagator === 'kepler' && r.frame === 'earth-inertial'), 'every record says its place is illustrative');
for (const r of recs) {
  const row = rows.find((x) => `cat-${x.id}` === r.id);
  let lo = Infinity; let hi = 0;
  for (let k = 0; k < 400; k += 1) {
    const p = propagate(r, asOf + k * (row.periodMin * 60e3) / 400);
    if (!p) { problems.push(`${r.name}: not propagated`); break; }
    const alt = Math.hypot(p.x, p.y, p.z) - 6378.137;
    lo = Math.min(lo, alt); hi = Math.max(hi, alt);
    if (k === 0) check(p.cls === 'illustrative', `${r.name}: drawn as illustrative whatever the maths says (${p.cls})`);
  }
  check(Math.abs(lo - row.perigeeKm) < 5 + 0.01 * row.apogeeKm && Math.abs(hi - row.apogeeKm) < 5 + 0.01 * row.apogeeKm, `${r.name}: its drawn orbit runs from its real lowest point to its real highest (${lo.toFixed(0)}..${hi.toFixed(0)} for ${row.perigeeKm}..${row.apogeeKm})`);
}
check(JSON.stringify(C.fieldRecords(rows).map((r) => r.elements)) === JSON.stringify(recs.map((r) => r.elements)), 'the made-up places are the same on every load');
{
  // A real fragment's tilt survives: the plane it is drawn in is inclined as the catalogue says.
  const f = recs.find((r) => r.name === 'COSMOS 2251 DEB');
  let maxZ = 0;
  for (let k = 0; k < 200; k += 1) { const p = propagate(f, asOf + k * 30e3); maxZ = Math.max(maxZ, Math.abs(p.z) / Math.hypot(p.x, p.y, p.z)); }
  check(Math.abs(Math.asin(maxZ) * 180 / Math.PI - 74) < 1.5, `a 74 degree orbit reaches 74 degrees of latitude (${(Math.asin(maxZ) * 180 / Math.PI).toFixed(1)})`);
}

// --- the layer and its source ----------------------------------------------------------------------------
const layer = LAYERS.find((l) => l.id === 'debris-field');
check(layer && layer.load === 'on-demand' && layer.defaultOn === false && Object.values(layer.moments).every((v) => v === false), 'the layer loads only when asked and is on in no moment');
check(layer && /illustrative/.test(layer.sentence) && typeof layer.parseLazy === 'function', 'its sentence says the places are illustrative, and its parser comes with its data');
check(SOURCES['celestrak-satcat'] && SOURCES['celestrak-satcat'].kind === 'text' && /Kelso/.test(SOURCES['celestrak-satcat'].attribution), 'the catalogue is a source with its credit');
const layersSrc = readFileSync(join(JS, 'data/layers.js'), 'utf8');
check(!/^import .*satcat/m.test(layersSrc) && !/^import .*(debris|satcat)/m.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'neither the catalogue\'s parser nor the view is in the first visit');
check(/10 cm/.test(COPY.debris.honesty) && /illustrative/.test(COPY.debris.honesty) && /no catalogue/.test(COPY.debris.honesty), 'the panel says what the count is, what it leaves out, and that the places are illustrative');

if (problems.length) { console.error('debris FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`debris ok: ${rows.length} of 18 catalogue lines in Earth orbit, "${V.leadWords(c)}", ${recs.length} drawn on their real orbits at illustrative places, ${lines.length} sentences from the catalogue`);
