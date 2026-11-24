// tests/test_yourstar.mjs -- the star of your year and the sky on your birthday (ui/yourstar.js, forge internal #545).
//
//   node tests/test_yourstar.mjs
//
// What it holds:
//   1. THE DATE: the field's and the link's value read and written back, years outside 1900..now and days that do not
//      exist refused, a year alone taken at its middle.
//   2. THE MATHS IS HONEST: a light-year is a Julian year of light, so a star N light-years away shows light that left N
//      years ago; the star chosen for an age is within half a light-year of it wherever the named stars allow, and under
//      the nearest star's distance there is none (its light is still on its way).
//   3. THE ERROR: the catalogue's own range or Gaia's parallax error where the record has them, else Hipparcos's 0.5 mas,
//      and the band always holds the distance.
//   4. THE SKY ON THE DAY: the Moon's phase and the evening planets from astronomy-engine, for a place and for a clock.
//   5. THE CARD: three shapes, every block inside the card and the map clear of the words; drawn with no NaN; the sky
//      map centred on the star.
//   6. PRIVACY, THE WORDS AND THE BOOT: the date is only in the hash (`born`, before `cam`), the one event names no date,
//      nothing is stored; every string in eleven languages; the module is fetched on demand, never at boot.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const Y = await import(join(JS, 'ui/yourstar.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.yourstar.js'));
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const JY = 365.25 * 86400e3;

// ---------------------------------------------------------------- 1. the date
const NOW = Date.UTC(2026, 10, 24, 12);
check(JSON.stringify(Y.parseBorn('1990-06-12', 2026)) === JSON.stringify({ y: 1990, m: 6, d: 12 }), 'a whole date is read');
check(JSON.stringify(Y.parseBorn('1990', 2026)) === JSON.stringify({ y: 1990, m: null, d: null }), 'a year alone is read');
for (const bad of ['1899-12-31', '2027-01-01', '1990-02-30', '1990-13-01', 'abc', '', null, '19900612', '1990-6']) check(Y.parseBorn(bad, 2026) === null, `${JSON.stringify(bad)} is refused`);
check(Y.bornValue(Y.parseBorn('1990-6-2', 2026)) === '1990-06-02', 'the value is written back with two-digit month and day');
check(Y.bornLink({ y: 1990, m: 6, d: 12 }, 'https://www.spaceradar.ai/') === 'https://www.spaceradar.ai/#born=1990-06-12', 'the link is the hash and nothing else');
check(Y.bornLink({ y: 1990, m: null, d: null }, 'http://localhost:8190/site') === 'http://localhost:8190/site/#born=1990', 'a year alone, and a base without its slash');
check(Y.bornMs({ y: 2000, m: null, d: null }) === Date.UTC(2000, 6, 2, 12), 'a year alone is taken at its middle');

// ---------------------------------------------------------------- 2. the maths
const b = { y: 1993, m: 6, d: 12 };
const age = Y.ageYears(b, NOW);
check(Math.abs(age - (NOW - Date.UTC(1993, 5, 12, 12)) / JY) < 1e-9, 'age is in Julian years, the light-year\'s own year');
check(Math.abs(Y.departureMs(age, NOW) - Date.UTC(1993, 5, 12, 12)) < 1, 'light from a star `age` light-years away left on the birthday');
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8'));
const stars = recordsFromNames(names.rows);
check(stars.length > 3000, `the named stars load as records (${stars.length})`);
const near = Y.nearestStar(stars);
check(near && /Proxima/i.test(near.name) && near.meta.distLy > 4 && near.meta.distLy < 4.4, `the nearest star is Proxima Centauri (${near && near.name}, ${near && near.meta.distLy})`);
check(Y.pickStar(stars, 2) === null && Y.pickStar(stars, 3.5) === null, 'under the nearest star\'s distance there is no star of the year');
let worst = 0;
let worstAge = 0;
for (let a = 4.3; a <= 100; a += 0.25) {
  const s = Y.pickStar(stars, a);
  const off = s ? Math.abs(s.meta.distLy - a) : Infinity;
  if (off > worst) { worst = off; worstAge = a; }
}
// The named stars thin out in places (none between 5.0 and 7.5 ly but Wolf 359's neighbours): the gap is the sky's.
check(worst <= 1.8, `every age from 4.3 to 100 gets a star within 1.8 light-years (worst ${worst.toFixed(2)} at ${worstAge.toFixed(2)})`);
let inBand = 0;
for (let a = 10; a <= 100; a += 1) { const s = Y.pickStar(stars, a); if (s && Math.abs(s.meta.distLy - a) <= 0.5) inBand += 1; }
check(inBand >= 80, `from 10 to 100 most ages get a star within half a light-year (${inBand} of 91)`);
const s33 = Y.pickStar(stars, 33.2);
check(s33 && Math.abs(s33.meta.distLy - 33.2) <= 0.5, `age 33.2 gets a star 33.2 ± 0.5 ly away (${s33 && s33.name} ${s33 && s33.meta.distLy})`);
// A named star beats a catalogue number in the band.
const fake = [
  { name: 'HIP 1', meta: { distLy: 30.1, mag: 2 } },
  { name: 'Tau Fakei', meta: { distLy: 30.3, mag: 5 } },
  { name: 'Proxima', meta: { distLy: 4.2, mag: 11 } },
];
check(Y.pickStar(fake, 30.2)?.name === 'Tau Fakei', 'where both bands hold the age, a star with a name a person says wins over a catalogue number');
check(Y.pickStar(fake, 30)?.name === 'HIP 1', 'a star whose own error band holds the age comes first');
check(Y.pickStar(fake, 50)?.name === 'Tau Fakei', 'with no star in the band, the nearest in distance');

// ---------------------------------------------------------------- 3. the error
const mod = Y.distanceBand({ meta: { distLy: 32.6156 } });
check(mod && mod.from === 'modelled' && mod.low < 32.6156 && mod.high > 32.6156, 'with no error given, it is modelled');
// 10 pc: 100 mas; 0.5 mas either way is 0.5 %.
check(Math.abs((mod.high - mod.low) / 32.6156 - 0.01) < 1e-3, `Hipparcos's 0.5 mas at 10 pc is about ±0.5 % (${((mod.high - mod.low) / 32.6156 * 100).toFixed(3)} %)`);
const gaia = Y.distanceBand({ meta: { distLy: 11.9, distSource: 'Gaia DR3 123, parallax 274.8 ± 0.1 mas' } });
check(gaia && gaia.from === 'gaia' && gaia.high - gaia.low < 0.05, 'Gaia\'s parallax and error are used when the record carries them');
const range = Y.distanceBand({ meta: { distLy: 640, distLyLow: 500, distLyHigh: 700 } });
check(range && range.from === 'range' && range.low === 500 && range.high === 700, 'a catalogue range is used as it stands');
for (const r of stars.slice(0, 400)) { const band = Y.distanceBand(r); if (band) check(band.low <= r.meta.distLy && band.high >= r.meta.distLy, `${r.name}: the band holds the distance`); }

// ---------------------------------------------------------------- 4. the sky on the day
const full = Y.skyOn({ y: 2024, m: 1, d: 25 }, null, Astronomy, 0);
check(full && full.moon.phase === 'full' && full.moon.percent >= 95, `25 January 2024 had a full Moon (${full && full.moon.phase} ${full && full.moon.percent} %)`);
const newMoon = Y.skyOn({ y: 2024, m: 4, d: 8 }, null, Astronomy, 0);
check(newMoon && newMoon.moon.phase === 'new' && newMoon.moon.percent <= 3, `8 April 2024, the day of the eclipse, had a new Moon (${newMoon && newMoon.moon.phase})`);
const london = Y.skyOn({ y: 2020, m: 12, d: 21 }, { latDeg: 51.5, lonDeg: -0.13 }, Astronomy);
check(london && london.from === 'place' && london.planets.includes('jupiter') && london.planets.includes('saturn'), `21 December 2020 from London: Jupiter and Saturn, the great conjunction, after dusk (${london && london.planets})`);
check(london && new Date(london.ms).getUTCHours() >= 16 && new Date(london.ms).getUTCHours() <= 18, 'from a place, the moment is the end of dusk there');
check(Y.skyOn({ y: 2020, m: null, d: null }, null, Astronomy) === null, 'a year alone has no sky of a day');
check(Y.phaseKey(0) === 'new' && Y.phaseKey(90) === 'firstQuarter' && Y.phaseKey(180) === 'full' && Y.phaseKey(271) === 'lastQuarter' && Y.phaseKey(-10) === 'new', 'the eight phase names');
for (const k of ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent']) check(typeof COPY.tonight.best.phases[k] === 'string', `the phase ${k} has its words`);

// ---------------------------------------------------------------- 5. the card
for (const [fmt, size] of Object.entries(Y.CARD_FORMATS)) {
  const B = Y.cardBlocks(fmt);
  check(B.w === size.w && B.h === size.h, `${fmt}: ${size.w} x ${size.h}`);
  check(B.map.x - B.map.r >= 0 && B.map.x + B.map.r <= B.w && B.map.y - B.map.r >= 0 && B.map.y + B.map.r <= B.h, `${fmt}: the map is inside the card`);
  check(B.text.x >= B.pad && B.text.x + B.text.w <= B.w - B.pad + 1 && B.text.w > 300, `${fmt}: the words have a column inside the margins`);
  if (fmt === 'landscape') check(B.text.x + B.text.w <= B.map.x - B.map.r, 'landscape: the words stop before the map');
  else check(B.text.y >= B.map.y + B.map.r, `${fmt}: the words start under the map`);
}
check(Math.abs(1200 / 630 - 1.905) < 0.01, 'the wide card is a link preview\'s shape (1200 x 630)');
const centre = [1, 0, 0];
const pts = Y.projectSky(centre, [[centre, 1, true], [[Math.cos(0.1), Math.sin(0.1), 0], 3, false], [[-1, 0, 0], 2, false]], 200);
check(pts.length === 2 && pts[0].self && Math.abs(pts[0].x) < 1e-9 && Math.abs(pts[0].y) < 1e-9, 'the chosen star is the map\'s centre; a star behind is left out');
check(pts[1].x < 0, 'east is to the left, as on the sky');
let bad = 0;
const rec = new Proxy({}, { get: (_, k) => {
  if (k === 'measureText') return (s) => ({ width: String(s).length * 12 });
  if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
  return (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) bad += 1; };
}, set: () => true });
for (const f of Object.keys(Y.CARD_FORMATS)) {
  Y.drawCard(rec, { eyebrow: 'THE STAR OF YOUR YEAR', name: 'Altair', place: 'In Aquila, 16.7 light-years away', lines: ['The light you see from it tonight left it in March 2010.'], sky: ['The sky on 12 March 2010', 'The Moon: waning crescent, 12 % lit'], footer: 'SPACERADAR.AI', map: { stars: pts, lines: [[[0, 0], [10, 10]]] } }, f, { bg: '#000', bg2: '#000', tx: '#fff', dim: '#999', atm: '#6ec3ff', ember: '#ff9f43', line: '#333' });
}
check(bad === 0, `the card draws with no NaN or Infinity (${bad})`);

// ---------------------------------------------------------------- 6. privacy, words, boot
const src = readFileSync(join(JS, 'ui/yourstar.js'), 'utf8');
check(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\([^)]*born/.test(src), 'nothing is stored and the date is fetched nowhere');
const events = [...src.matchAll(/sr\('track',\s*'([a-z_]+)',\s*\{([^}]*)\}/g)];
check(events.length >= 1 && events.every((m) => m[1] === 'share' && !/born|date|bornValue|y\b/.test(m[2])), `the one event is \`share\` and carries no date (${events.map((m) => m[2]).join(' | ')})`);
check(/content_type: 'birthday_card'/.test(src), 'its content_type says what was shared, a birthday card');
check(!/place|city/.test(src.slice(src.indexOf('export function bornLink'), src.indexOf('export function bornMs'))), 'the link never carries the town');
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
check(KEYS.includes('born') && KEYS.indexOf('born') < KEYS.indexOf('cam'), '`born` is a key of the link, before `cam`');
const W = COPY.yourStar;
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : flat(v, `${p}${k}.`)));
for (const [k, v] of flat(W)) check(v.length > 0 && !/!/.test(v), `yourStar.${k} is a sentence with no exclamation mark`);
for (const k of ['go', 'share', 'download', 'copyLink', 'fly', 'sky', 'dateLabel', 'formatLabel']) check(W[k].length <= 60, `yourStar.${k} is a short line of chrome`);
check(/light-year/.test(W.lede) && /when you were born/.test(W.lede), 'the lede says the rule: a light-year of light is a year');
check(/modelled/.test(W.errFrom.modelled) && /Gaia/.test(W.errFrom.gaia), 'the error says where it comes from');
check(/still/.test(W.onItsWay), 'under 4.2 years the card says the light is still on its way');
check(/held \? C\.left : C\.leftNear/.test(src) && /nearest/.test(W.leftNear), '"when you were born" is said only where the star\'s error band holds the age; else the card says it is the nearest');
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const m = await import(join(JS, `copy/${lang}.js`));
  const sec = m.COPY.yourStar;
  const mine = sec ? flat(sec) : [];
  const have = new Map(mine);
  const all = flat(W).every(([k]) => typeof have.get(k) === 'string' && have.get(k));
  const own = flat(W).filter(([k, v]) => have.get(k) && have.get(k) !== v).length;
  check(all && own >= 40, `copy/${lang}.js has every string of yourStar, in its own words (${own} differ)`);
  const rows = m.COPY.searchRows || {};
  check(rows.yourStar && rows.yourStarSub && rows.yourStarWords && rows.yourStarWords !== COPY.searchRows.yourStarWords, `copy/${lang}.js has the search row and its own words`);
}
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/ui\/yourstar\.js'\)/.test(main) && !/^import[^\n]*yourstar/m.test(main), 'main.js fetches ui/yourstar.js when it is asked for, never at boot');
check(/'sr:your-star', 'sr:layers-ready', 'hashchange'/.test(main) && /readUrlKeys\(\)\.born/.test(main), 'main.js opens it for the search row and for a link');
const R = await import(join(JS, 'ui/searchrows.js'));
const hits = R.findExtras('birthday');
check(hits.some((h) => h.extra === 'yourstar'), `"birthday" finds the star of your year (${hits.map((h) => h.extra).join(', ')})`);
check(R.findExtras('my star').some((h) => h.extra === 'yourstar'), '"my star" finds it too');
check(R.rowIconName({ extra: 'yourstar' }) === 'star', 'its row wears the star');

if (problems.length) {
  console.error(`test_yourstar: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('test_yourstar: the date, the honest maths and its error, the sky that day, the card in three shapes, privacy, eleven languages and the boot all hold');
